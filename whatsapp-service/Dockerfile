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

# `chromium` here is installed only for its shared libraries (libnss3,
# libgbm1, fonts, etc.) — every Chromium build needs the same runtime libs
# regardless of version. The actual browser binary wa-automate launches is
# the one its own `puppeteer` dependency downloads below (npm install, no
# PUPPETEER_SKIP_DOWNLOAD): that version is the one its injection scripts
# are tested against. Pointing it at Debian's much newer system Chromium
# instead loads WhatsApp Web fine but the internal Store never initializes,
# so the QR is never generated — a 30s timeout with no clear error.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Chromium resolves its home directory from the passwd entry, not $HOME —
# our system user (below) has no real home dir, so crashpad (crash-report
# handler) fails to find a writable location and refuses to launch
# ("chrome_crashpad_handler: --database is required"). Point it at a
# writable path directly instead of relying on a home dir that doesn't exist.
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

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
