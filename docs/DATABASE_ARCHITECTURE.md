# MokshBooking — Database Architecture

**Provider:** PostgreSQL (Supabase-hosted) via `DATABASE_URL` (pooled) + `DIRECT_URL` (migrations).
**ORM:** Prisma 6.19.3.
**Schema file:** [prisma/schema.prisma](../prisma/schema.prisma).

Note: the schema comment says "SQLite has no native enums" — this is a historical artifact. Runtime is Postgres; enums are still modelled as strings governed by [lib/constants.ts](../lib/constants.ts).

---

## Model index

| Domain | Models |
|---|---|
| Auth / people | `User`, `VerificationToken`, `Agent`, `AgentPreference` |
| Lead engine | `Lead`, `LeadAssignment`, `LeadStatusHistory`, `LeadAssignmentStatusHistory`, `LeadNote`, `LeadPayment`, `SpamReport` |
| Wallet + credits | `AgentWallet`, `WalletTransaction`, `WalletTopup`, `AgentCreditBalance`, `LeadCreditPackage`, `LeadCreditPurchase`, `LeadCreditLedger` |
| Vendor marketplace | `VendorAd`, `SupportTicket`, `SupportMessage`, `Notification` |
| CMS | `Destination`, `TourPackage`, `PackageImage`, `PackageItinerary`, `PackageInclusion`, `PackageExclusion`, `PackageFAQ` |
| Platform | `SiteSetting`, `Campaign`, `Media`, `IntegrationLog`, `AuditLog` |

Total: **32 models**.

---

## Detailed model reference

### `User`
- Primary identity table. Linked to Supabase Auth via `authId` (`auth.users.id UUID`).
- `email` unique. `passwordHash` retained for rollback but Supabase Auth owns credentials now.
- `role`: `ADMIN | AGENT | CUSTOMER` (see `ROLES` in constants).
- `adminRole`: `SUPER_ADMIN | LEAD_MANAGER | SALES_MANAGER | FINANCE_ADMIN | SUPPORT_ADMIN | MARKETING_ADMIN | CONTENT_ADMIN` (nullable for AGENT/CUSTOMER; null-on-ADMIN treated as SUPER_ADMIN for backward compatibility).
- `emailVerified`, `emailVerifiedAt`, `twoFactorEnabled` — app-level gates layered on top of Supabase Auth.
- **Relations:** `agent`, `notifications`, `verificationTokens`.

### `VerificationToken`
- Reused for `EMAIL_VERIFY | TWO_FA | PASSWORD_RESET`.
- Stores `codeHash` (sha256 of OTP or 32-byte token) — never plaintext.
- `expiresAt`, `consumedAt`, `attempts`.
- **Index:** `[userId, type, consumedAt]`.

### `Agent`
- `userId` unique — 1:1 with User.
- `status`: `PENDING | APPROVED | SUSPENDED | REJECTED`.
- `verificationStatus`: `PENDING | UNDER_REVIEW | VERIFIED | REJECTED | SUSPENDED` (business/vendor approval — distinct from email verification above).
- `verifiedAt`, `verifiedBy`, `verificationNotes` — admin-controlled.
- Business profile fields: `companyName`, `phone`, `city`, `state`, `companyAddress`, `companyEmail`, `contactPerson`, `contactNo`, `website`, `socials` (JSON).
- Personal profile: `firstName`, `lastName`, `profileImage`, `personalEmail`.
- Preferences: `lowWalletThreshold`.
- **Relations:** `user`, `wallet`, `creditBalance`, `preference`, `assignments`, `transactions`, `payments`, `topups`, `creditPurchases`, `creditLedger`, `spamReports`, `tickets`, `ads`, `submittedDestinations`, `submittedPackages`.

### `AgentPreference`
- One-to-one with Agent. Governs email + in-app alerts and auto-buy.
- Alert filters: `alertCategories`, `alertDestinations`, `alertClientLocations`, `alertMinQuality`, `alertMinBudget/MaxBudget`, `alertMinLeadPrice/MaxLeadPrice`, `alertTravelDateFrom/To`, `alertTripTypes`.
- Auto-buy filters + limits: `autoBuyEnabled`, category/destination/quality/budget filters, `autoBuyDailyLimit`, `autoBuyMonthlyBudget`. Only SHARED purchases fire — see [lib/leads/autobuy.ts](../lib/leads/autobuy.ts) (line 27 short-circuits INTERNATIONAL).

### `Lead`
- `code` unique (`LD-YYYY-######` from [lib/leads/code.ts](../lib/leads/code.ts)).
- Customer: `customerName`, `phone`, `email?`.
- Trip: `destinationText`, `departureCity?`, `travelDate?`, `travelDateText?`, `travelers?`, `adults?`, `children?`, `nights?`, `budget?`, `tripType?`, `requirements?` (JSON array), `message?`.
- Classification: `status` (LEAD_STATUSES), `quality`, `qualityScore`, `qualityOverride`, `price`, `assignmentCount`, `maxAgents (default 2)`, `isDuplicate`, `expiresAt`, `tripCategory` (`DOMESTIC|INTERNATIONAL|INBOUND`), `clientLocation`.
- Source: `source`, `sourceType`, `externalId?` — **`@@unique([source, externalId])` provides idempotency for webhook replays.**
- Attribution: `utmSource/Medium/Campaign/Term/Content`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `campaignId`, `adGroupId`, `keyword`, `creativeId`, `device`, `browser`, `referrer`, `landingPage`, `firstPage`, `lastPage`.
- Duplicate linking: `duplicateOfId` self-reference (never destructive).
- CMS: `destinationId?`, `packageId?`, `packageSnapshotName`, `packageSnapshotPrice`.
- **Indexes:** `[status]`, `[createdAt]`, `[phone]`, `[source]`.
- **Constraints:** `maxAgents` default 2 — admin-configurable per lead OR site-wide via `SiteSetting.leadMaxAgents`.

### `LeadAssignment`
- `[leadId, agentId]` unique — same lead cannot be sold twice to same agent.
- `price` (INR at time of purchase; snapshot, not linked to current pricing).
- `status`: PURCHASED → CONTACTED / INTERESTED / QUOTE_SENT / NEGOTIATING → BOOKED → WON / LOST / NO_RESPONSE / SPAM. Transitions enforced in code (`ASSIGNMENT_STATUS_TRANSITIONS`), not at DB level.
- `bookedValue?`, `bookedAt?`, `bookingNotes?` — set when the agent marks a lead BOOKED.
- **Index (Phase 3 addition):** `[agentId, purchasedAt]` — covers dashboard, my-leads list, admin agent detail. Requires migration to apply.

### `LeadStatusHistory` / `LeadAssignmentStatusHistory`
- Append-only audit trails on Lead.status and LeadAssignment.status respectively.
- `actorType`: `ADMIN | AGENT | SYSTEM`.

### `LeadNote`
- Admin-only notes attached to a lead.

### `LeadPayment`
- Historic table for lead-purchase revenue. One row per assignment. Used by [lib/admin/analytics.ts](../lib/admin/analytics.ts) for revenue windows.

### `SpamReport`
- `[leadId, agentId]` unique — agent can only report the same lead once.
- `reason`: `wrong_number|fake|duplicate|not_interested|invalid|already_booked|other`.
- `status`: PENDING → APPROVED / REJECTED.
- On APPROVED, admin picks `resolution` = refund / credit / none. When refund/credit, writes `refundedAt`, `refundAmount`, and links `refundWalletTransactionId`.
- Foreign key back to `LeadAssignment` (nullable — set null on assignment delete).

### `AgentWallet` / `WalletTransaction`
- Legacy INR wallet for the pre-credits era. Still written to by admin wallet-adjust flow (`/api/admin/agents/[id]/wallet`) and by the Razorpay top-up path.
- `balance` in whole rupees.
- Every mutation goes through [lib/wallet.ts](../lib/wallet.ts) `creditWalletInTx` — never a bare balance write.

### `AgentCreditBalance` / `LeadCreditLedger`
- **Primary economic system.** Every purchase and top-up is in Lead Credits, not rupees.
- `AgentCreditBalance` is one row per agent; upserted lazily by `ensureCreditBalanceInTx` in [lib/credits.ts](../lib/credits.ts).
- Debits use guarded `updateMany` with `balance >= credits` — atomic insufficient-credits detection (returns count=0).
- `LeadCreditLedger` types:
  - `CREDIT_PURCHASE` — package purchase approved
  - `LEAD_PURCHASE` — signed negative (`creditAmount = -N`)
  - `CREDIT_REFUND` — from spam-report resolution
  - `ADMIN_ADJUSTMENT` — admin manual credit
- **Indexes:** `[agentId, createdAt]`, `[type]`, `[referenceId]`.

### `LeadCreditPackage`
- Admin-configurable purchase packages. `code` unique (stable code like `LEAD_100`).
- Fields: `name`, `credits`, `priceInr`, `isActive`, `displayOrder`, `paymentQrUrl`.
- Historical note: an old "only 2 active" cap was removed (see git history).

### `LeadCreditPurchase`
- One row per manual QR purchase attempt.
- `orderId` unique — `MKB-YYYYMMDD-######`.
- `provider`: `manual` (default) or legacy `razorpay`.
- `status`: `PENDING_REVIEW → APPROVED / REJECTED / CANCELLED` (manual) OR `CREATED → PAID / FAILED` (legacy Razorpay).
- Admin fields: `paymentScreenshotUrl`, `transactionReference`, `reviewedById`, `reviewedAt`, `rejectionReason`.
- Linked 1:1 to `WalletTopup` (legacy compat).

### `WalletTopup`
- Legacy Razorpay top-up record. `orderId` unique.
- On PAID webhook, credits are added via the credits ledger.

### `Notification`
- Per-user in-app notification. `type`: `verification | wallet | lead | purchase | support | system`.
- **Index:** `[userId, read]` (compound — perfect for both list and count).

### `VendorAd`
- Vendor-submitted display ads. Target either a `Destination` or a `TourPackage` submission of theirs.
- `status`: DRAFT → PENDING → APPROVED / REJECTED / PAUSED / EXPIRED.
- Impressions/clicks tracked in schema; `adCostPerClickCredits` in SiteSetting.
- **Indexes:** `[status]`, `[agentId]`, `[targetType, targetSubmissionId]`.

### `SupportTicket` / `SupportMessage`
- Agent-only tickets. `status`: OPEN → IN_PROGRESS → WAITING_VENDOR → RESOLVED → CLOSED.
- Messages have `authorType (AGENT|ADMIN)` + `internal` flag for admin-only notes.

### `Destination`
- Public CMS content. `slug` unique. `published`, `featured`, `sortOrder` drive listing.
- `category`: `DOMESTIC|INTERNATIONAL|INBOUND` — auto-classifies leads created against this destination.
- Moderation: `submittedByAgentId?`, `moderationStatus (DRAFT | PENDING_REVIEW | APPROVED | REJECTED)` — admin content is default APPROVED.

### `TourPackage`
- Same shape as Destination for CMS + moderation. `kind`: `PACKAGE | TOUR`.
- Rich content children: `PackageImage`, `PackageItinerary` (day-numbered), `PackageInclusion`, `PackageExclusion`, `PackageFAQ`.

### `Media`
- Media library. `filename` unique. Actual bytes live in Supabase Storage.

### `SiteSetting`
- Singleton row (`id = "default"`). Every setting the admin panel touches.
- Business numbers: `leadMaxAgents (default 2)`, `defaultLeadPrice`, `leadValidityDays (default 365)`, `leadExpiryHours (legacy)`, per-category credit prices (`priceSharedDomestic`, `priceSharedInternational`, `priceExclusiveDomestic`, `priceExclusiveInternational`), `adCostPerClickCredits`.
- Brand: `brandName`, `tagline`, `logoUrl`, `heroImage`, `faviconUrl`, `footerText`.
- Contact: `phone`, `whatsapp`, `email`, `address`, `socials` (JSON: facebook/instagram/twitter/youtube/pinterest/linkedin).
- SEO/tracking: `defaultSeoTitle`, `defaultSeoDescription`, `gaId`, `metaPixelId`, `googleAdsId`.
- Feature flags: `vendorAdsEnabled`, `autoBuyEnabled`, `supportEnabled`, `packageMarketplaceEnabled`.

### `IntegrationLog`
- Every external integration event: `google`, `meta`, `api`, `email`, `payment`.
- `status`: `SUCCESS | FAILED | DUPLICATE`.

### `AuditLog`
- Every sensitive admin/agent action.
- `actorType`: `ADMIN | AGENT | SYSTEM`.
- `action` examples: `lead.create`, `lead.price`, `lead.purchase`, `lead.autobuy`, `wallet.adjust`, `agent.status`, `admin.invite`, `credits.package.create/update`.
- `entityType`: `lead | agent | wallet | integration | cms`. ⚠️ Note: `admin.invite` uses `entityType: "agent"` as the closest existing bucket — no dedicated `user` entity type yet.

---

## Relationship map

```
User
├── Agent  (1:1)
│   ├── AgentWallet         (1:1) → WalletTransaction[]
│   ├── AgentCreditBalance  (1:1) → LeadCreditLedger[]
│   ├── AgentPreference     (1:1)
│   ├── LeadAssignment[]    → Lead, LeadAssignmentStatusHistory[], SpamReport[], LeadCreditLedger[]
│   ├── LeadPayment[]
│   ├── WalletTopup[]       ← LeadCreditPurchase (optional 1:1)
│   ├── LeadCreditPurchase[]
│   ├── SpamReport[]        ↔ Lead, LeadAssignment
│   ├── SupportTicket[]     → SupportMessage[]
│   ├── VendorAd[]          → Destination / TourPackage (application-side FK)
│   ├── Destination[]       (submittedBy)
│   └── TourPackage[]       (submittedBy)
├── Notification[]
└── VerificationToken[]

Lead
├── LeadAssignment[]
├── LeadStatusHistory[]
├── LeadNote[]
├── LeadPayment[]
├── SpamReport[]
├── Destination? (via destinationId)
├── TourPackage? (via packageId + snapshot fields)
└── Lead? (duplicateOfId — self relation)

Destination
├── TourPackage[]
└── Lead[]

TourPackage
├── Destination?
├── PackageImage[], PackageItinerary[], PackageInclusion[], PackageExclusion[], PackageFAQ[]
└── Lead[]

LeadCreditPackage → LeadCreditPurchase[], LeadCreditLedger[]
```

---

## Critical constraints

| Constraint | Where enforced |
|---|---|
| Lead max 2 agents (`maxAgents` default 2) | `Lead.maxAgents` column; enforced atomically by `updateMany` in [purchase.ts:83-87](../lib/leads/purchase.ts#L83) |
| Agent can only buy same lead once | `LeadAssignment @@unique([leadId, agentId])` + explicit tx check |
| INTERNATIONAL leads exclusive-only | `requiresExclusive()` in [pricing.ts](../lib/leads/pricing.ts) + purchase.ts:71 |
| Exclusive only on 0-assignment leads | `exclusiveEligible()` — enforced in tx |
| Insufficient credits atomic detection | `AgentCreditBalance.updateMany({ balance: {gte: credits} })` — count=0 ⇒ throw |
| Webhook idempotency (google/meta/api) | `Lead @@unique([source, externalId])` |
| Duplicate email on agent signup | `User.email @unique` |
| Duplicate agent invite | `Agent.userId @unique` |
| Package purchase order dedup | `LeadCreditPurchase.orderId @unique`, `WalletTopup.orderId @unique` |
| Same-agent spam report dedup | `SpamReport @@unique([leadId, agentId])` |

---

## Query performance highlights

- Marketplace list: uses `AVAILABLE_STATUSES` filter + `[status]` index + `select` DTO (see Phase 1 changes to [lib/agent/leads.ts](../lib/agent/leads.ts)).
- Agent-scoped lists: now covered by `LeadAssignment @@index([agentId, purchasedAt])` (requires migration).
- Notification unread poll: served by cheap [/api/account/notifications/unread](../app/api/account/notifications/unread/route.ts).
- Public CMS reads: wrapped in `unstable_cache` + Upstash Redis 2-tier cache — see [lib/cms/queries.ts](../lib/cms/queries.ts) and [lib/cache/publicCache.ts](../lib/cache/publicCache.ts).

---

## Migrations

- 6+ migrations in `prisma/migrations/`. Latest is `20260802193000_lead_credit_postgres_drift_fix`.
- The Phase-3 `LeadAssignment @@index([agentId, purchasedAt])` declaration IS in schema but requires `prisma migrate dev --name add_lead_assignment_agent_index` to actually create the DB index. ⚠️ Verify before relying on that query plan improvement.
