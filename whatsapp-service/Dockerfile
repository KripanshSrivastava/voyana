# ----------------------------------------------------------------------------
#  Voyana — WhatsApp sender service (open-wa)
#
#  Separate from the main app image on purpose: this needs a full Chromium
#  browser and a persistent, logged-in WhatsApp Web session, neither of which
#  belong in the lean Next.js standalone container. Alpine is avoided here
#  because Chromium/puppeteer compatibility on musl libc is a frequent source
#  of breakage — bookworm-slim (glibc, Debian) is the path of least resistance.
# ----------------------------------------------------------------------------

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 whatsapp \
  && adduser  --system --uid 1001 --ingroup whatsapp whatsapp

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

RUN mkdir -p /app/session && chown -R whatsapp:whatsapp /app
USER whatsapp

EXPOSE 4000
CMD ["node", "server.js"]
