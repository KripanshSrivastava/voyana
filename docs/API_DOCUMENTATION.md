# MokshBooking — API Documentation

All routes live under `app/api/`. Handler shape: [lib/api.ts](../lib/api.ts) — `handler()` wraps every route, converts `AuthError`/`ZodError`/`{status}` errors into JSON responses, and forces every response through `ok()` (`{ok:true, data}`) or `fail()` (`{ok:false, error}`). Session guard: [lib/auth.ts](../lib/auth.ts) `requireRole()`. Admin sub-role guard: [lib/rbac.ts](../lib/rbac.ts) `requireArea()`.

Legend: ✅ / 🟡 / 🚧 / ⏸️ / ⚠️

---

## Endpoint tree

```
/api
├── auth/
│   ├── login                  POST   ✅ Password sign-in via Supabase Auth (+ email/2FA gate)
│   ├── logout                 POST   ✅ Ends Supabase session
│   ├── agent-signup           POST   ✅ Creates Supabase auth user + User + Agent row
│   ├── forgot-password        POST   ✅ Silently issues reset token, sends email
│   ├── reset-password         POST   ✅ Consumes token, updates Supabase password
│   ├── verify-email           POST   ✅ Consumes OTP, clears email-verify gate
│   ├── verify-2fa             POST   ✅ Consumes 2FA OTP for signed-in session
│   ├── resend-verification    POST   ✅ Reissues email-verify OTP
│   └── resend-2fa             POST   ✅ Reissues 2FA OTP
│
├── leads/
│   ├── route                  POST   ✅ Public website enquiry → ingestLead()
│   ├── google                 POST   ✅ Google Lead Form webhook (key in querystring)
│   └── meta                   POST   ✅ Meta Lead Ads webhook (X-Hub-Signature-256 HMAC)
│
├── v1/leads                   POST   ✅ Partner/API-key ingest (VOYANA_API_KEY header)
│
├── account/
│   ├── notifications          GET    ✅ Full list + unread count (agent/admin session)
│   ├── notifications/unread   GET    ✅ Count-only endpoint (poll target)
│   ├── notifications/read     POST   ✅ Mark bulk-list ids read
│   ├── notifications/read-all POST   ✅ Mark all read for current user
│   ├── notifications/[id]/read POST  ✅ Mark single notification read
│   └── password               POST   ✅ Change own password (Supabase updateUser)
│
├── agent/
│   ├── leads                  GET    ✅ Marketplace list w/ filters + pagination
│   ├── leads/[id]/purchase    POST   ✅ Atomic purchase (Shared/Exclusive)
│   ├── leads/[id]/status      POST   ✅ Update LeadAssignment.status
│   ├── leads/[id]/spam        POST   ✅ Create SpamReport
│   ├── my-leads               GET    ✅ Purchased-leads list
│   ├── wallet                 GET    ✅ Wallet + recent transactions
│   ├── wallet/topup           POST   ✅ Razorpay top-up order (legacy path)
│   ├── credits/order          POST   ✅ Create manual LeadCreditPurchase (QR flow)
│   ├── profile                GET/PATCH ✅ Personal + company profile
│   ├── security               GET/PATCH ✅ 2FA toggle
│   ├── preferences            GET/PATCH ✅ Alerts + auto-buy config
│   ├── ads                    GET/POST ✅ Vendor ads CRUD (⏸ vendorAdsEnabled)
│   ├── destinations           GET/POST ✅ Vendor-submitted destinations (⏸ packageMarketplaceEnabled)
│   ├── destinations/[id]      GET/PATCH/DELETE ✅
│   ├── packages               GET/POST ✅ Vendor-submitted packages
│   ├── packages/[id]          GET/PATCH/DELETE ✅
│   ├── media                  POST   ✅ Upload to Supabase Storage
│   └── support                GET/POST ✅ Ticket create/list (⏸ supportEnabled)
│
├── admin/
│   ├── leads                  POST   ✅ Admin manually creates a lead
│   ├── leads/[id]             GET/PATCH ✅ Lead edit
│   ├── leads/[id]/assign      POST   ✅ Admin assigns lead to a specific agent
│   ├── leads/export           GET    ✅ CSV export
│   ├── agents/[id]            GET/PATCH ✅ Agent status + verification
│   ├── agents/[id]/wallet     POST   ✅ Adjust wallet balance (admin credit)
│   ├── credit-orders/[id]/approve  POST ✅ Approve manual purchase → add credits
│   ├── credit-orders/[id]/reject   POST ✅ Reject with reason
│   ├── destinations           POST   ✅ Create
│   ├── destinations/[id]      PATCH/DELETE ✅
│   ├── packages               POST   ✅ Create
│   ├── packages/[id]          PATCH/DELETE ✅
│   ├── flags                  PATCH  ✅ Feature-flag toggles (SUPER_ADMIN)
│   ├── lead-credit-packages   GET/POST/PATCH ✅ Package CRUD (SUPER_ADMIN)
│   ├── media                  GET/POST ✅ Media library
│   ├── media/[id]             DELETE ✅
│   ├── moderation/[type]/[id] POST   ✅ Approve/reject submitted content
│   ├── settings               PATCH  ✅ Site-wide settings
│   ├── spam-reports           GET    ✅ Pending list
│   ├── spam-reports/[id]      PATCH  ✅ Approve → refund/credit; reject
│   ├── support/[id]           PATCH  ✅ Ticket status + admin reply
│   ├── vendor-ads/[id]        PATCH  ✅ Ad moderation
│   └── admins                 GET/POST ✅ Invite admins (SUPER_ADMIN) — Supabase generateLink + Resend
│
├── payments/
│   └── razorpay/webhook       POST   ✅ Signature verify + top-up completion
│
└── support/
    └── [id]/reply             POST   ✅ Agent reply to their own ticket
```

---

## Endpoint reference (canonical shape for every route)

### Auth

#### `POST /api/auth/login`
- **Auth:** public
- **Body:** `{ email, password, role: "ADMIN" | "AGENT" }`
- **Response:** `{ok:true, data:{ requiresEmailVerification?, requiresTwoFactor? }}` — client redirects accordingly
- **DB reads/writes:** Supabase auth.users (via SDK), reads `User`, may create `VerificationToken(type=TWO_FA)` if 2FA enabled
- **Side effects:** issues Supabase session cookie; sends 2FA email if applicable
- **Errors:** 401 invalid creds, 403 role mismatch

#### `POST /api/auth/logout`
- **Auth:** any session
- **Effect:** `supabase.auth.signOut()` — clears session cookie
- **Response:** `{ok:true}`

#### `POST /api/auth/agent-signup`
- **Auth:** public
- **Body:** email, password, name, phone, companyName, city (see [lib/validation.ts](../lib/validation.ts))
- **Effect:** service-role `admin.createUser` + `prisma.user.create({ role: AGENT })` + `prisma.agent.create({ status: PENDING })` + `VerificationToken(EMAIL_VERIFY)` + sends OTP email
- **Errors:** 409 duplicate email, 422 validation

#### `POST /api/auth/forgot-password`
- **Auth:** public
- **Body:** `{ email }`
- **Effect:** silently issues `VerificationToken(PASSWORD_RESET)` (32-byte hex) if email exists, sends email. Returns 200 either way — no enumeration.

#### `POST /api/auth/reset-password`
- **Body:** `{ token, password }`
- **Effect:** consumes token, calls `supabase.auth.admin.updateUserById({ password })` for the linked authId

#### `POST /api/auth/verify-email`, `POST /api/auth/verify-2fa`
- **Auth:** signed-in user with pending gate
- **Body:** `{ code }`
- **Effect:** consumes hashed OTP (see [lib/auth/otp.ts](../lib/auth/otp.ts)), flips `User.emailVerified` (verify-email path)

---

### Public lead ingestion

#### `POST /api/leads`
- **Auth:** public
- **Body:** validated by `leadSchema` — customerName, phone, email?, destinationText, dates, travelers, adults, children, nights, budget, tripType, requirements[], message, `attribution`, optional `destinationId`, `packageId`, `leadFormType`
- **Effect:** delegates to `ingestLead()` in [lib/leads/ingest.ts](../lib/leads/ingest.ts)
- **Response:** `{ok:true, data:{ id, code }}`
- **Side effects (via ingest):**
  - `Lead.create` inside 4-attempt code-uniqueness retry
  - `LeadStatusHistory.create` (status=NEW, actor=SYSTEM)
  - Duplicate detection: same phone+destinationText inside `leadExpiryHours` window → `isDuplicate=true`, `duplicateOfId` set
  - Score/quality via `scoreLead()`
  - Parallel `Promise.allSettled`: `logAudit`, `logIntegration`, `runLeadAlerts`, customer receipt email, admin new-lead email
  - Sequential (after settlement): `runAutoBuyForLead()`

#### `POST /api/leads/google`
- **Auth:** shared key in `?key=` query (`GOOGLE_LEADS_WEBHOOK_KEY`)
- **Body:** Google Lead Form JSON — parses `user_column_data`
- **Effect:** `ingestLead({ source: "google", sourceType: "google_lead_form", externalId: lead_id })` — idempotent on `(source, externalId)`

#### `POST /api/leads/meta`
- **Auth:** X-Hub-Signature-256 HMAC verified against `META_APP_SECRET`
- **GET path:** Facebook challenge verification via `META_VERIFY_TOKEN`
- **Body:** Meta Lead Ads webhook `{ entry: [{ changes: [...] }] }`
- **Effect:** ingest per leadgen_id, idempotent

#### `POST /api/v1/leads`
- **Auth:** header `x-api-key: <VOYANA_API_KEY>`
- **Body:** validated `partnerLeadSchema` — for third-party integrations
- **Effect:** `ingestLead({ source: "api"|"partner", externalId })`

---

### Agent — marketplace + purchase

#### `GET /api/agent/leads`
- **Auth:** AGENT
- **Query:** `destination, clientLocation, category, tripType, minTravelers, maxTravelers, travelDateFrom, travelDateTo, search, sort, page, limit`
- **Response:** `{items, page, limit, total, totalPages}` — trimmed DTO (no PII pre-purchase — see [lib/agent/leads.ts](../lib/agent/leads.ts))

#### `POST /api/agent/leads/[id]/purchase`
- **Auth:** AGENT (approved status enforced inside transaction)
- **Body:** `{ purchaseType: "SHARED" | "EXCLUSIVE" }`
- **Effect:** `purchaseLead()` in [lib/leads/purchase.ts](../lib/leads/purchase.ts):
  1. Read `SiteSettings` (outside tx)
  2. `prisma.$transaction`:
     - Verify agent APPROVED
     - Verify lead exists, not expired, priced
     - Compute charge via `computeLeadCharge` (never from client)
     - Check credit balance ≥ credits
     - Verify EXCLUSIVE eligibility (assignmentCount === 0) OR forbid SHARED on INTERNATIONAL
     - Verify no existing `LeadAssignment(leadId, agentId)`
     - **Atomic slot claim:** `updateMany` on `Lead` with `assignmentCount { lt: maxAgents }` — count=0 ⇒ race lost
     - Create `LeadAssignment`, `LeadPayment`
     - Debit `AgentCreditBalance` atomically (`decrement` guarded by `balance ≥ credits`) + write `LeadCreditLedger`
     - Refetch, update `Lead.status` (SHARED / IN_PROGRESS) + `LeadStatusHistory`
- **Post-tx (best-effort, never fails the purchase):** `logAudit`, in-app `notify`, `sendEmail` receipt
- **Errors:** 400 bad price / SHARED-on-international, 402 insufficient credits, 403 not approved, 404 lead/agent, 409 already-yours / fully-distributed / not-exclusively-available, 410 expired

#### `POST /api/agent/leads/[id]/status`
- **Auth:** AGENT (must own an assignment on this lead)
- **Body:** `{ status: ASSIGNMENT_STATUS }` — validated against `ASSIGNMENT_STATUS_TRANSITIONS` in [lib/constants.ts](../lib/constants.ts)
- **Effect:** updates `LeadAssignment.status`, writes `LeadAssignmentStatusHistory`; on `BOOKED` also captures `bookedValue`, `bookedAt`

#### `POST /api/agent/leads/[id]/spam`
- **Auth:** AGENT (must own the lead)
- **Body:** `{ reason, notes? }`
- **Effect:** creates `SpamReport(status=PENDING)` — unique (leadId, agentId); admin reviews later

#### `GET /api/agent/my-leads`
- **Auth:** AGENT
- **Same query shape as marketplace; returns LeadAssignment rows w/ lead subset**

---

### Agent — wallet + credits

#### `GET /api/agent/wallet`
- Returns `AgentCreditBalance.balance` + recent `LeadCreditLedger` rows + package list

#### `POST /api/agent/credits/order`
- **Body:** `{ packageId }`
- **Effect:** creates `LeadCreditPurchase(status=PENDING_REVIEW, provider=manual, orderId=MKB-YYYYMMDD-######)`; agent uploads QR screenshot separately; admin approves via `/api/admin/credit-orders/[id]/approve`

#### `POST /api/agent/wallet/topup` 🟡
- Legacy Razorpay flow — returns Razorpay order id/amount. Kept for backward compatibility; the manual QR flow is the active path.

---

### Admin

#### `POST /api/admin/leads`
- **Auth:** ADMIN, `requireArea(session, "leads")`
- **Effect:** `prisma.lead.create` with retry on code collision; `runAutoBuyForLead` fired after

#### `PATCH /api/admin/leads/[id]`
- Edit price, status, quality (SUPER_ADMIN or LEAD_MANAGER), qualityOverride flag, expiresAt

#### `POST /api/admin/leads/[id]/assign`
- **Body:** `{ agentId }` — reuses `purchaseLead` with `actor: "ADMIN"` — same wallet/credit rules apply

#### `GET /api/admin/leads/export`
- Streams a CSV of filtered leads

#### `POST /api/admin/agents/[id]/wallet`
- **Auth:** ADMIN, `requireArea("finance")`
- **Body:** `{ credits, description }` — positive=CREDIT_ADJUSTMENT, negative=refund
- **Effect:** `addCreditsInTx` in [lib/credits.ts](../lib/credits.ts) → updates `AgentCreditBalance` + writes `LeadCreditLedger(type=ADMIN_ADJUSTMENT)`

#### `POST /api/admin/credit-orders/[id]/approve`
- **Effect:** in a transaction, marks `LeadCreditPurchase(status=APPROVED)`, adds credits (`addCreditsInTx(type=CREDIT_PURCHASE)`), writes `WalletTopup(status=PAID, leadCreditPurchaseId)`, sends receipt email

#### `POST /api/admin/credit-orders/[id]/reject`
- **Body:** `{ reason }` — marks REJECTED, notifies agent

#### `PATCH /api/admin/flags`
- **Auth:** ADMIN, `requireArea("flags")` (effectively SUPER_ADMIN)
- **Body:** any subset of `{ vendorAdsEnabled, autoBuyEnabled, supportEnabled, packageMarketplaceEnabled }` (booleans)
- **Effect:** `SiteSetting.update` + `revalidateSiteSettings()` (invalidates Next data cache, Redis, layout paths)

#### Admin invite — see also [admin invite doc](API_DOCUMENTATION.md#admin-invite)

#### `GET /api/admin/admins`, `POST /api/admin/admins`
- **Auth:** ADMIN (SUPER_ADMIN gate inline)
- **POST body:** `{ email, name, adminRole }`
- **Effect:**
  1. Reject duplicate email
  2. `prisma.user.create({ role: ADMIN, adminRole, emailVerified: true })`
  3. `supabase.auth.admin.generateLink({ type: "invite", redirectTo: "/admin/set-password" })` — returns action_link, no email sent by Supabase
  4. `sendEmail(adminInviteEmail)` via Resend
  5. On any failure, rolls back Prisma User row + Supabase auth user
  6. `logAudit(admin.invite)`

---

### Payments

#### `POST /api/payments/razorpay/webhook`
- **Auth:** X-Razorpay-Signature HMAC verified against `RAZORPAY_WEBHOOK_SECRET`
- **Events handled:** `payment.captured` → look up `WalletTopup.orderId`, mark PAID, credit wallet/credits atomically
- **Idempotency:** `WalletTopup.orderId` unique — replay is a no-op

---

### Notifications

#### `GET /api/account/notifications`
- Returns latest 100 + unread count. Trimmed DTO (no userId echo).

#### `GET /api/account/notifications/unread`
- Cheap poll endpoint — `{ unread: N }` only. Used by the sidebar badge every 30s.

---

## Common response shapes

**Success:** `{ ok: true, data: T }`
**Failure:** `{ ok: false, error: string, issues?: ZodFlatten }`
**HTTP status codes actually observed:**
- 200 — success
- 400 — bad request / validation logic
- 401 — no session / expired
- 402 — insufficient credits (agent purchase)
- 403 — role/area denied
- 404 — resource missing
- 409 — conflict (already-yours, duplicate email, fully-distributed, race lost)
- 410 — resource expired (lead)
- 422 — Zod validation
- 502 — external provider failure (Supabase, Resend)

---

## Middleware

- **`proxy.ts`** ([proxy.ts](../proxy.ts)) — runs Supabase session refresh on every non-static path via `updateSession()`. Does **not** enforce authorization — that's the responsibility of page guards (`requireAgent`, `requireAdmin`) and route handlers (`requireRole`).
- **Note:** authorization is done at the endpoint level, not the middleware level. This means every route handler MUST call `requireRole` (currently they all do — verified against 62 route files).
