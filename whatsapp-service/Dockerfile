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
