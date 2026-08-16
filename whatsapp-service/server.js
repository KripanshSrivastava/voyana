/**
 * Internal-only WhatsApp sender, backed by Baileys — an UNOFFICIAL client
 * that speaks WhatsApp's multi-device protocol directly over a WebSocket.
 * No browser involved (unlike open-wa/whatsapp-web.js), so no Chromium, no
 * crashpad, no browser-in-Docker fragility.
 *
 * Owns the one long-lived, logged-in session; the main app talks to this
 * over the private Docker network via lib/whatsapp/client.ts. See
 * docs/WHATSAPP.md.
 *
 * This process must never be reachable from outside the Docker network —
 * the shared-secret check below is a second line of defence, not the
 * primary one (docker-compose.yml deliberately omits any Traefik label or
 * host port for this service).
 */

const express = require("express");
const pino = require("pino");
const qrcodeTerminal = require("qrcode-terminal");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

const PORT = process.env.PORT || 4000;
const SECRET = process.env.WHATSAPP_SERVICE_SECRET;
const SESSION_DATA_PATH = process.env.WHATSAPP_SESSION_PATH || "/app/session/auth";

if (!SECRET) {
  console.error("[whatsapp-service] WHATSAPP_SERVICE_SECRET is not set — refusing to start.");
  process.exit(1);
}

let sock = null;
let connected = false;

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DATA_PATH);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("[whatsapp-service] scan this QR from WhatsApp -> Linked Devices:");
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === "open") {
      connected = true;
      console.log("[whatsapp-service] connected — session linked.");
    }

    if (connection === "close") {
      connected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.error("[whatsapp-service] connection closed", { statusCode, loggedOut });
      if (!loggedOut) {
        start().catch((e) => console.error("[whatsapp-service] restart failed:", e));
      } else {
        console.error("[whatsapp-service] logged out — clear the session volume and re-scan.");
      }
    }
  });
}

start().catch((e) => console.error("[whatsapp-service] failed to start:", e));

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== SECRET) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true, connected });
});

app.post("/send", async (req, res) => {
  const { to, text } = req.body || {};
  if (typeof to !== "string" || !to || typeof text !== "string" || !text) {
    return res.status(422).json({ ok: false, error: "to and text are required" });
  }
  if (!sock || !connected) {
    return res.status(503).json({ ok: false, error: "whatsapp session not ready" });
  }
  try {
    const result = await sock.sendMessage(`${to}@s.whatsapp.net`, { text });
    res.json({ ok: true, id: result?.key?.id });
  } catch (err) {
    console.error("[whatsapp-service] send failed:", err);
    res.status(502).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[whatsapp-service] listening on :${PORT}`);
});
