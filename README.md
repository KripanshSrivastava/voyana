# Voyana — Travel Lead Generation, Distribution & CMS

> **Your trip. Your way.**

A complete, locally-runnable MVP for a travel **lead-generation + lead-distribution** platform with an admin-managed **content/catalog CMS**.

**Business model:** Traffic → Lead → Admin qualifies & prices → Sold to a **maximum of 2 agents** → Agent contacts customer → Conversion → Revenue.
The public travel catalog (destinations / tours / packages) is a **content & conversion layer** — it is fully DB-driven and controlled from the admin CMS.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Prisma · SQLite · Zod · React Hook Form · Recharts · Lucide.

## Getting started

```bash
npm install
npx prisma migrate dev
npm run dev
```

App runs at **http://localhost:3100**.

### Load demo data (development only)

```bash
npm run seed:test
```

The app stays **empty** (honest empty states, no fake stats) until you run the seed.

#### Test accounts (after seeding)

| Role   | Email                  | Password  | Notes                          |
| ------ | ---------------------- | --------- | ------------------------------ |
| Admin  | `admin@voyana.test`    | `admin123`| Full operations + CMS          |
| Agent  | `agent@voyana.test`    | `agent123`| Approved · ₹5,000 wallet       |
| Agent  | `agent2@voyana.test`   | `agent123`| Approved · ₹5,000 wallet       |
| Agent  | `agent3@voyana.test`   | `agent123`| **Pending** (approval demo)    |

## Key routes

- **Public:** `/`, `/destinations`, `/packages`, `/tours`, `/request-quote`, `/how-it-works`, `/about`, `/contact`
- **Admin:** `/admin/login` → `/admin/dashboard`, `/admin/leads`, `/admin/agents`, `/admin/revenue`, `/admin/campaigns`, `/admin/wallets`, `/admin/destinations`, `/admin/packages`, `/admin/tours`, `/admin/media`, `/admin/settings`
- **Agent:** `/agent/login`, `/agent/signup` → `/agent/dashboard`, `/agent/leads`, `/agent/purchases`, `/agent/wallet`, `/agent/profile`

## Business rules (enforced server-side)

- **Max 2 agents per lead** — enforced with a conditional atomic increment; a 3rd purchase is rejected.
- **Wallet never goes negative** — conditional balance decrement inside the purchase transaction.
- **Atomic purchase** — wallet debit + assignment + payment + wallet transaction in one Prisma transaction; any failure rolls back.
- **Customer contact is hidden** from agents until purchase; revealed only to assigned agents (and admin).
- Expired / unapproved-agent / already-purchased / insufficient-balance purchases are all blocked.
- **Attribution** (UTMs, gclid, fbclid, referrer, landing/first/last page) is captured per session and stored on the lead.
- **Historical integrity** — leads store a package snapshot (name + price) so records survive content edits/unpublish.

## Architecture

The CMS, lead engine, and agent marketplace are separate but connected:

- `lib/cms/*` — published-content queries + CMS writes
- `lib/leads/*` — scoring, code generation, **atomic purchase transaction**
- `lib/agent/*` — marketplace + purchase-history queries
- `lib/media/storage.ts` — storage abstraction (local `/public/uploads` now; swap for S3/Cloudinary/R2 later without touching the CMS)
- `lib/admin/analytics.ts` — revenue windows & series

## Lead ingestion & integrations (growth layer)

Every channel funnels into one `ingestLead()` pipeline (`lib/leads/ingest.ts`):
**normalize → score → dedup → idempotent create → integration log → audit → non-blocking notifications.**
A failure in any secondary step (email, logging) never blocks or rolls back the lead.

| Channel | Endpoint | Auth |
| ------- | -------- | ---- |
| Website form | `POST /api/leads` | public; source auto-detected (google/meta/organic/referral/direct) |
| Google Lead Forms | `POST /api/leads/google` | `google_key` must match `GOOGLE_LEADS_WEBHOOK_KEY` |
| Meta Lead Ads | `GET/POST /api/leads/meta` | verify token + `X-Hub-Signature-256` (`META_APP_SECRET`) |
| Partner / landing / app | `POST /api/v1/leads` | `x-api-key: $VOYANA_API_KEY` |

- **Idempotency:** provider `lead_id` is stored as `externalId` with a unique `(source, externalId)` index — replays return the original lead and log `DUPLICATE`.
- **Attribution preserved end-to-end:** `gclid`, `gbraid`, `wbraid`, `fbclid`, `campaignId`, `adGroupId`, `keyword`, `creativeId`, `device` captured client-side (session-persistent) and stored on the lead.
- **Admin → Integrations** shows connected/not-connected per service (from server env only — no secrets rendered) + **Logs**; **Admin → Audit log** records price/status/purchase/wallet/agent changes.
- **Google/GA4 tags** inject only when an ID is set in Settings; conversions fire via `trackLeadConversion()` (`generate_lead`, enhanced conversions ready).
- **Email** is provider-agnostic (Resend HTTP API) and no-ops safely when unconfigured.

See `.env.example` for every credential and the exact dashboard settings (all server-side).

## Notes

- Images upload to `public/uploads/<folder>/`; only the path is stored in the DB. Validates type (JPG/PNG/WEBP) and size (≤5 MB), sanitizes filenames, generates unique stored names. **Admin only.**
- SEO metadata + dynamic `sitemap.xml` (published content only) + `robots.txt`.
- Conversion tracking (`trackLeadConversion`) is abstracted and ready for GA4 / Google Ads / Meta Pixel; tracking IDs are configured in **Settings** and are optional.
