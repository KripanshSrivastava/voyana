# syntax=docker/dockerfile:1.7-labs
# ----------------------------------------------------------------------------
#  Voyana / Moksh Booking — production Docker image
#
#  Multi-stage build so the final image contains ONLY:
#   - node:20-alpine runtime
#   - Next.js standalone server (~40 MB) + static assets + public/
#   - Prisma runtime engine
#  Everything else (dev dependencies, source code, .next/cache, etc.) stays
#  in the builder stage and gets discarded.
#
#  End-image size: ~150 MB (vs 1+ GB for a naive `npm install` copy).
# ----------------------------------------------------------------------------

# 1. Dependency stage — install prod + dev deps for the build only.
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
# Copy manifests + Prisma schema so `postinstall`'s `prisma generate` succeeds.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Reproducible install; skip audit noise; keep dev deps because Next needs them at build.
RUN npm ci --no-audit --no-fund

# 2. Build stage — compile the app.
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
# Regenerate Prisma client against the copied source (postinstall may have used
# a stale schema in the deps layer).
RUN npx prisma generate
RUN npm run build

# 3. Runtime stage — copy only what the standalone server needs.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

# Run as a non-root user so a container escape doesn't hand out root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 --ingroup nodejs voyana

# The standalone bundle Next writes for us.
COPY --from=builder --chown=voyana:nodejs /app/.next/standalone ./
COPY --from=builder --chown=voyana:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=voyana:nodejs /app/public ./public
# Prisma engine + generated client — required at runtime.
COPY --from=builder --chown=voyana:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=voyana:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER voyana
EXPOSE 3100

# Standalone bundle drops its entry point at ./server.js.
CMD ["node", "server.js"]
