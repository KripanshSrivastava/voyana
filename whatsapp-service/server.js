/**
 * Internal-only WhatsApp sender, backed by open-wa (unofficial WhatsApp Web
 * automation — NOT Meta's Cloud API). Owns the one long-lived, logged-in
 * browser session; the main app talks to this over the private Docker
 * network via lib/whatsapp/client.ts. See docs/WHATSAPP.md.
 *
 * This process must never be reachable from outside the Docker network —
 * the shared-secret check below is a second line of defence, not the
 * primary one (docker-compose.yml deliberately omits any Traefik label or
 * host port for this service).
 */

const express = require("express");
const { create } = require("@open-wa/wa-automate");

const PORT = process.env.PORT || 4000;
const SECRET = process.env.WHATSAPP_SERVICE_SECRET;
const SESSION_DATA_PATH = process.env.WHATSAPP_SESSION_PATH || "/app/session";

if (!SECRET) {
  console.error("[whatsapp-service] WHATSAPP_SERVICE_SECRET is not set — refusing to start.");
  process.exit(1);
}

let client = null;
let starting = true;

create({
  sessionId: "voyana",
  multiDevice: true,
  sessionDataPath: SESSION_DATA_PATH,
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  qrTimeout: 0, // never give up waiting for the first scan
  authTimeout: 0,
  disableSpins: true,
  logConsole: false,
  popup: false,
})
  .then((c) => {
    client = c;
    starting = false;
    console.log("[whatsapp-service] client ready — session linked.");
  })
  .catch((err) => {
    starting = false;
    console.error("[whatsapp-service] failed to start client:", err);
  });

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== SECRET) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true, starting, connected: Boolean(client) });
});

app.post("/send", async (req, res) => {
  const { to, text } = req.body || {};
  if (typeof to !== "string" || !to || typeof text !== "string" || !text) {
    return res.status(422).json({ ok: false, error: "to and text are required" });
  }
  if (!client) {
    return res.status(503).json({ ok: false, error: "whatsapp session not ready" });
  }
  try {
    const id = await client.sendText(`${to}@c.us`, text);
    res.json({ ok: true, id });
  } catch (err) {
    console.error("[whatsapp-service] send failed:", err);
    res.status(502).json({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[whatsapp-service] listening on :${PORT}`);
});
