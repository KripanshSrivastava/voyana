# WhatsApp Integration

Three features. A and B send through a self-hosted **open-wa** service; C needs nothing.

| Feature | What it does | Needs the service? | Status |
|---|---|---|---|
| **A** | Agent gets a WhatsApp alert when a matching lead arrives | Yes | ✅ Implemented |
| **B** | Customer gets an auto-acknowledgement after submitting an enquiry | Yes | ✅ Implemented |
| **C** | Agent taps a button to open WhatsApp with a pre-written intro to the customer | **No** | ✅ Implemented |

**Feature C works right now with zero setup.** It's a `wa.me` click-to-chat link — the agent's own WhatsApp sends the message, so no service, no cost, no linking. If you do nothing else in this document, C is already live.

A and B require the steps below.

---

## ⚠️ Read this before you set anything up

A and B send through **open-wa**, an unofficial library that automates a real, logged-in WhatsApp Web session — it is **not** Meta's Cloud API. That trade buys you instant setup and freeform messages with no template approval, at a real cost:

- **The connected number can be banned by WhatsApp with no appeal guaranteed.** Automated/bulk sending from an unofficial client is against WhatsApp's Terms of Service, and their abuse detection does act on it.
- **Use a dedicated number**, never someone's personal WhatsApp — a ban takes down whatever else that number was used for.
- **Keep volume modest and only message people with a reason to expect it** (an agent who opted in, a customer who just submitted their own enquiry). Don't repurpose this pipe for anything bulk.
- **The connected phone must stay powered on and online.** WhatsApp's multi-device linking requires the phone to check in periodically — if it's off for too long, the session drops and needs re-linking.
- If the number does get banned, or this approach stops being viable, **Meta's Cloud API is the documented fallback** — see [Switching back to an official provider](#switching-back-to-an-official-provider) below.

---

## Architecture

```
whatsapp-service/          Separate container — owns the open-wa client and
├── server.js               the logged-in WhatsApp Web session. Exposes:
├── package.json              GET  /health
└── Dockerfile                 POST /send { to, text }
                             Internal only: no Traefik label, no host port —
                             only `app` reaches it, over the compose network.

lib/whatsapp/
├── phone.ts       Number normalisation (+91 handling) and wa.me link builder
├── client.ts      Calls whatsapp-service — the ONLY provider-specific file
└── templates.ts   Renders the admin-edited message body per event
```

Design mirrors `lib/email/mailer.ts`:

- **Never throws.** A WhatsApp failure cannot break lead ingestion or a purchase.
- **Fails visibly.** When unconfigured in production, it writes a `FAILED` row to `IntegrationLog` so the gap shows at `/admin/integrations/logs` — rather than silently doing nothing, which is what made the 2FA email bug so hard to find.
- **Provider-swappable.** To move to Meta Cloud API / AiSensy / Interakt / Twilio, rewrite `postToProvider()` in `lib/whatsapp/client.ts`. Nothing else changes.

Unlike Meta's Cloud API, open-wa sends **plain text** — there's no provider-side template registration or approval. Whatever an admin saves at `/admin/messaging` is exactly what sends, immediately.

---

## Setup — self-hosted open-wa service

### 1. Pick a number

Get a WhatsApp-capable number that:
- is **not** your personal number,
- has **WhatsApp Business** installed and active,
- you're comfortable losing if it gets banned.

### 2. Set the shared secret

In `.env.production` on the VPS:

```
WHATSAPP_SERVICE_URL=http://whatsapp:4000
WHATSAPP_SERVICE_SECRET=<generate a long random string>
```

The same file feeds both the `app` and `whatsapp` containers (`docker-compose.yml`'s `env_file:`), so one secret value covers both sides — nothing else to configure.

### 3. Bring the service up and scan the QR

```bash
docker compose up -d --build whatsapp
docker compose logs -f whatsapp
```

An ASCII QR code prints to the log. On the number from step 1: **WhatsApp → Linked Devices → Link a Device**, and scan it.

Once linked, the log shows `client ready — session linked.` and the session is written to the `whatsapp-session` Docker volume — it survives container restarts, so this is normally a **one-time step**. You'll need to re-scan if:
- the phone is logged out of Linked Devices (manually, or by WhatsApp after ~14 days offline),
- the `whatsapp-session` volume is deleted,
- WhatsApp forces a re-auth after flagging the session.

### 4. Recreate the app container

```bash
docker compose up -d --force-recreate app
```

### 5. Verify

```bash
curl -s -X POST http://<vps-host>:4000/send \
  -H "Authorization: Bearer YOUR_WHATSAPP_SERVICE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"919876543210","text":"Test message from Voyana"}'
```

(Run this `curl` **on the VPS**, inside the compose network — port 4000 is deliberately not published to the host, so it won't resolve from your laptop.)

| Response | Meaning |
|---|---|
| `{"ok":true,"id":"..."}` | Working — check the recipient's WhatsApp |
| `{"ok":false,"error":"unauthorized"}` | Secret mismatch between `app` and `whatsapp` env |
| `{"ok":false,"error":"whatsapp session not ready"}` | Not linked yet — check `docker compose logs whatsapp` for a QR or an error |
| Connection refused | `whatsapp` container isn't running — `docker compose ps` |

---

## How each feature behaves

### A — Agent lead alerts

Opt-in per agent at **`/agent/preferences` → Lead alerts → WhatsApp**. Defaults to **off** — messaging someone without consent is intrusive.

Sends to `Agent.contactNo`, falling back to `Agent.phone`. Fires from `runLeadAlerts()` alongside the existing email and in-app channels, all in parallel via `Promise.allSettled`.

### B — Customer acknowledgement

Fires on **every** ingestion channel — website form, Google Lead Ads, Meta Lead Ads, partner API — because a customer who filled in a form anywhere expects a reply. No opt-in toggle; it's a transactional response to their own action.

Skips silently if the phone number can't be normalised.

### C — Agent → customer intro

On `/agent/leads/[id]` after purchase. Builds a `wa.me` link with a pre-composed message including the customer's name, destination, travel date and traveller count. The agent reviews and presses send themselves — via their own WhatsApp, not the service.

Button is **hidden entirely** if the stored phone can't be normalised — better than a link that opens WhatsApp on a broken number.

---

## Phone number handling

`toWhatsAppNumber()` in `lib/whatsapp/phone.ts`:

| Input | Output | Rule |
|---|---|---|
| `+91 98765 43210` | `919876543210` | strip non-digits |
| `09876543210` | `919876543210` | strip trunk `0`, add `91` |
| `9876543210` | `919876543210` | bare 10-digit → Indian mobile |
| `0044 20 7946 0958` | `442079460958` | strip `00`, keep existing country code |
| `442079460958` | `442079460958` | already qualified, left alone |
| `12345` | `null` | too short — do not send |

The 10-digit rule is the only place a country code is *assumed*. Longer numbers are never prefixed, because gluing `91` onto a foreign number would message a completely different person. `null` always means "don't send" — callers never substitute a fallback.

Covered by 15 unit tests in `tests/whatsapp-phone.test.ts`. Run with `npm run test:unit`.

---

## Switching back to an official provider

If the number gets banned, or you'd rather have Meta's official support and compliance guarantees, move to Meta's WhatsApp Cloud API (or a reseller like AiSensy/Interakt/Wati that wraps it):

1. Rewrite `postToProvider()` in `lib/whatsapp/client.ts` — it's the one function that knows how to reach open-wa; swap it for the provider's HTTP call.
2. Meta requires pre-approved templates for business-initiated messages — you'll need to re-register wording for `whatsapp.lead_alert` and `whatsapp.customer_ack` (the current bodies at `/admin/messaging` are a reasonable starting point) and flip `sendsVerbatim: false` for those two keys back on in `lib/messaging/defaults.ts` so the admin UI shows the approval warning again.
3. Retire the `whatsapp` container and the `whatsapp-session` volume.

Every call site — alerts, ingest — stays untouched either way.

---

## Troubleshooting

**Nothing sends, no errors anywhere**
Check `/admin/integrations/logs` filtered to `whatsapp`. A `SKIPPED — WHATSAPP_SERVICE_URL / WHATSAPP_SERVICE_SECRET not set` row means the env vars aren't reaching the `app` container:

```bash
docker compose exec app printenv | grep WHATSAPP
```

If they're missing after you edited `.env.production`, you didn't recreate the container:

```bash
docker compose up -d --force-recreate app
```

**`whatsapp session not ready`**
The service hasn't linked yet, or the session dropped. Check the log for a QR code or an error:

```bash
docker compose logs -f whatsapp
```

**`unauthorized` from the service**
`WHATSAPP_SERVICE_SECRET` doesn't match between the `app` and `whatsapp` containers — both read it from the same `.env.production`, so this usually means one container is stale. Recreate both:

```bash
docker compose up -d --force-recreate app whatsapp
```

**Agent isn't receiving alerts**
1. Is `alertWhatsapp` enabled on their preferences page?
2. Does their profile have a valid `contactNo` or `phone`?
3. Do their alert filters (category / destination / quality / budget) actually match the lead?
4. Is their account `APPROVED` — suspended and rejected agents are skipped.

**The connected phone got logged out / number banned**
Re-link with a fresh (or different) number: `docker compose logs -f whatsapp` for the new QR after restarting the service. If the number is genuinely banned, see [Switching back to an official provider](#switching-back-to-an-official-provider).
