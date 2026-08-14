# WhatsApp Integration

Three features, two of which need a WhatsApp Business API provider.

| Feature | What it does | Needs API? | Status |
|---|---|---|---|
| **A** | Agent gets a WhatsApp alert when a matching lead arrives | Yes | ✅ Implemented |
| **B** | Customer gets an auto-acknowledgement after submitting an enquiry | Yes | ✅ Implemented |
| **C** | Agent taps a button to open WhatsApp with a pre-written intro to the customer | **No** | ✅ Implemented |

**Feature C works right now with zero setup.** It's a `wa.me` click-to-chat link — the agent's own WhatsApp sends the message, so no API, no cost, no template approval. If you do nothing else in this document, C is already live.

A and B require the steps below.

---

## Architecture

```
lib/whatsapp/
├── phone.ts       Number normalisation (+91 handling) and wa.me link builder
├── client.ts      Meta Cloud API sender — the ONLY provider-specific file
└── templates.ts   Template names + parameter ordering
```

Design mirrors `lib/email/mailer.ts`:

- **Never throws.** A WhatsApp failure cannot break lead ingestion or a purchase.
- **Fails visibly.** When unconfigured in production, it writes a `FAILED` row to `IntegrationLog` so the gap shows at `/admin/integrations/logs` — rather than silently doing nothing, which is what made the 2FA email bug so hard to find.
- **Provider-swappable.** To move to AiSensy / Interakt / Twilio, rewrite `postToProvider()` in `client.ts`. Nothing else changes.

---

## Setup — Meta WhatsApp Cloud API

### 1. Prerequisites

- A Meta Business account
- A phone number **not** currently registered to a personal WhatsApp account
- Business verification (Meta requires this before you can message the general public — allow a few days)

### 2. Create the app

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App**
2. Type: **Business**
3. Add the **WhatsApp** product
4. Under WhatsApp → **API Setup**, note:
   - **Phone number ID** → this is `WHATSAPP_PHONE_NUMBER_ID`
   - **Temporary access token** (24 h, for testing only)

### 3. Get a permanent token

The temporary token expires daily — useless in production.

1. Business Settings → **System Users** → Add
2. Name it e.g. `voyana-whatsapp`, role **Admin**
3. **Generate New Token** → select your app → grant `whatsapp_business_messaging` and `whatsapp_business_management`
4. Copy it → this is `WHATSAPP_ACCESS_TOKEN`

Store it like every other secret — never commit it.

### 4. Register the templates

Business Manager → WhatsApp Manager → **Message Templates** → Create.

Meta must approve these before anything can send. Approval usually takes a few hours, sometimes 1–2 days.

**Template 1 — `lead_alert`** (category: Utility, language: English)

```
Hi {{1}}, a new {{2}} lead just arrived on Moksh Booking: {{3}}. Quality: {{4}}. Open your dashboard to view and purchase it.
```

Sample values for Meta's review form: `Rajesh Travels`, `Domestic`, `Goa`, `Good`

**Template 2 — `enquiry_received`** (category: Utility, language: English)

```
Hi {{1}}, thanks for your enquiry about {{2}} with Moksh Booking. Your reference is {{3}}. Our verified travel partners will contact you shortly with personalised options.
```

Sample values: `Priya Sharma`, `Kerala`, `LD-2026-000123`

> ⚠️ **The `{{n}}` order must match `lib/whatsapp/templates.ts`.** If you reword a template in Meta, keep the placeholder order identical or parameters land in the wrong slots.

If you register the templates under different names, override with `WHATSAPP_TEMPLATE_LEAD_ALERT` / `WHATSAPP_TEMPLATE_CUSTOMER_ACK` instead of editing code.

### 5. Configure the app

In `.env.production` on the VPS:

```
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

Then recreate the container — editing the file alone does nothing to a running container:

```bash
docker compose up -d --force-recreate app
```

### 6. Verify

```bash
curl -s -X POST "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919876543210",
    "type": "template",
    "template": {
      "name": "lead_alert",
      "language": { "code": "en" },
      "components": [{
        "type": "body",
        "parameters": [
          {"type":"text","text":"Test Agent"},
          {"type":"text","text":"Domestic"},
          {"type":"text","text":"Goa"},
          {"type":"text","text":"Good"}
        ]
      }]
    }
  }'
```

| Response | Meaning |
|---|---|
| `{"messages":[{"id":"wamid..."}]}` | Working |
| `190` / `OAuthException` | Token invalid or expired — you're probably still using the 24 h temporary one |
| `132001` | Template doesn't exist or isn't approved yet |
| `132000` | Parameter count doesn't match the registered template |
| `131030` | Recipient not in your allow-list — during development you must add test numbers in API Setup |

---

## How each feature behaves

### A — Agent lead alerts

Opt-in per agent at **`/agent/preferences` → Lead alerts → WhatsApp**. Defaults to **off** — messaging someone without consent is intrusive and each conversation is billable.

Sends to `Agent.contactNo`, falling back to `Agent.phone`. Fires from `runLeadAlerts()` alongside the existing email and in-app channels, all in parallel via `Promise.allSettled`.

### B — Customer acknowledgement

Fires on **every** ingestion channel — website form, Google Lead Ads, Meta Lead Ads, partner API — because a customer who filled in a form anywhere expects a reply. No opt-in toggle; it's a transactional response to their own action.

Skips silently if the phone number can't be normalised.

### C — Agent → customer intro

On `/agent/leads/[id]` after purchase. Builds a `wa.me` link with a pre-composed message including the customer's name, destination, travel date and traveller count. The agent reviews and presses send themselves.

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

## Costs

Meta bills per 24-hour *conversation*, not per message.

- **1,000 free service conversations/month**
- Utility conversations in India: roughly ₹0.12–0.35 each beyond the free tier
- Feature C costs **nothing** — it's not an API message

At 500 leads/month with alerts to 2 agents each, you're looking at roughly ₹200–400/month. Check Meta's current pricing page; rates change.

---

## Switching providers

If Meta's onboarding proves too slow, Indian resellers (AiSensy, Interakt, Wati) wrap the same API with easier setup and handle template submission for you — typically ₹999–2,500/month.

To switch, rewrite `postToProvider()` in `lib/whatsapp/client.ts`. It's about 40 lines and the only place the Meta request shape appears. Every call site — alerts, ingest — stays untouched.

---

## Troubleshooting

**Nothing sends, no errors anywhere**
Check `/admin/integrations/logs` filtered to `whatsapp`. A `SKIPPED — WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set` row means the env vars aren't reaching the container:

```bash
docker compose exec app printenv | grep WHATSAPP
```

If they're missing after you edited `.env.production`, you didn't recreate the container:

```bash
docker compose up -d --force-recreate app
```

**`132001 template not found`**
The template isn't approved yet, or the name/language doesn't match. Check WhatsApp Manager, then confirm `WHATSAPP_TEMPLATE_LANG` matches the language you registered (`en` vs `en_US` are different templates to Meta).

**Agent isn't receiving alerts**
1. Is `alertWhatsapp` enabled on their preferences page?
2. Does their profile have a valid `contactNo` or `phone`?
3. Do their alert filters (category / destination / quality / budget) actually match the lead?
4. Is their account `APPROVED` — suspended and rejected agents are skipped.
