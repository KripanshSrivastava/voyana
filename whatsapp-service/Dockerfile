# ----------------------------------------------------------------------------
#  Voyana — WhatsApp sender service (Baileys)
#
#  Separate from the main app image so a WhatsApp session outage/relink
#  never takes down the app itself. Baileys talks to WhatsApp directly over
#  a WebSocket — no browser, no Chromium — so this image stays small and
#  avoids the whole class of "Puppeteer in a non-root Docker container"
#  fragility (crashpad, cache-path mismatches, Chromium version drift).
# ----------------------------------------------------------------------------

FROM node:20-bookworm-slim

# One of Baileys' dependencies resolves from a git URL rather than the npm
# registry, so npm needs a real `git` binary on PATH to install it.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

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
