# MokshBooking — Architecture Diagrams

Mermaid diagrams for the overall system, lead lifecycle, purchase transaction, authentication, email pipeline, and database relationships. All derived from real code — no invented flows.

---

## 1. Overall system

```mermaid
flowchart TB
  subgraph Traffic
    Visitor[Public visitor]
    GoogleAds[Google Lead Forms]
    MetaAds[Meta Lead Ads]
    Partner[Partner via API key]
  end

  subgraph Vercel["Next.js on Vercel"]
    Site[/(home) + /(site) pages/]
    AgentPortal[/agent/(portal)/]
    AdminPanel[/admin/(panel)/]
    APILayer[/api/*  Route handlers/]
    Middleware[proxy.ts — Supabase session refresh]
  end

  subgraph Data
    Postgres[(Supabase Postgres)]
    Redis[(Upstash Redis)]
    Storage[(Supabase Storage — media)]
  end

  subgraph External
    SupaAuth[Supabase Auth]
    Resend[Resend Email]
    Razorpay[Razorpay legacy]
  end

  Visitor --> Site
  Site --> APILayer
  GoogleAds -->|POST /api/leads/google| APILayer
  MetaAds -->|POST /api/leads/meta| APILayer
  Partner -->|POST /api/v1/leads| APILayer

  AgentPortal --> APILayer
  AdminPanel --> APILayer
  Middleware --> APILayer

  APILayer -->|Prisma| Postgres
  APILayer -->|Prisma read via unstable_cache| Redis
  APILayer -->|Supabase JS SDK| SupaAuth
  APILayer -->|HTTP send| Resend
  APILayer -->|Webhook + admin.inviteUserByEmail replaced by generateLink| SupaAuth
  APILayer -->|Media library| Storage
  Razorpay -->|webhook| APILayer
```

---

## 2. Lead lifecycle

```mermaid
flowchart TD
  Start[Enquiry origin] --> S1[/POST /api/leads or /api/leads/google or /api/leads/meta or /api/v1/leads/]
  S1 --> V[Zod validation]
  V --> Src[detectWebsiteSource / source classification]
  Src --> Score[scoreLead → quality + qualityScore]
  Score --> Dedup[Duplicate detection: same phone + destinationText inside leadExpiryHours]
  Dedup -->|match| Flag[isDuplicate=true, duplicateOfId set — never destructive]
  Dedup -->|no match| Insert
  Flag --> Insert[Lead.create + LeadStatusHistory NEW SYSTEM — retried up to 4x on code collision]
  Insert --> Idem{externalId present?}
  Idem -->|yes AND duplicate hit| ReturnExisting[Return existing lead — @@unique source, externalId]
  Insert --> Parallel[Promise.allSettled — best-effort side effects]

  Parallel --> Audit[logAudit lead.create]
  Parallel --> IntLog[logIntegration lead_ingest]
  Parallel --> CEmail[Customer receipt email — Resend account@]
  Parallel --> AEmail[Admin new-lead email — Resend leads@]
  Parallel --> Alerts[runLeadAlerts → notifyMany + Promise.allSettled emails]

  Parallel --> Auto[runAutoBuyForLead — sequential to respect capacity]
  Auto --> Purchase[purchaseLead SHARED for each matching autoBuyEnabled prefs]

  Purchase --> Status[SHARED / IN_PROGRESS via updated Lead.status]
  Status --> Contact[Agent contacts customer]
  Contact --> Trans[LeadAssignment.status transitions: CONTACTED → NEGOTIATING → BOOKED → WON/LOST/NO_RESPONSE/SPAM]
  Trans --> Spam{Marked SPAM?}
  Spam -->|yes| SpamReport[SpamReport.create PENDING]
  SpamReport --> AdminReview[Admin approves/rejects → optional refund via LeadCreditLedger CREDIT_REFUND]
```

---

## 3. Lead purchase transaction (Shared / Exclusive)

```mermaid
sequenceDiagram
  autonumber
  actor Agent
  participant UI as AvailableLeadCard
  participant Route as POST /api/agent/leads/[id]/purchase
  participant Purchase as purchaseLead()
  participant DB as prisma.$transaction
  participant Credits as consumeCreditsInTx
  participant Mail as Resend

  Agent->>UI: Click Buy Shared / Buy Exclusive
  UI->>Route: { purchaseType }
  Route->>Route: requireRole("AGENT") + session.agentId check
  Route->>Purchase: opts

  Purchase->>Purchase: getSiteSettings() [outside tx]
  Purchase->>DB: BEGIN transaction

  DB->>DB: Load agent (with creditBalance) — check APPROVED
  DB->>DB: Load lead — check exists, not expired
  DB->>DB: computeLeadCharge(tripCategory, purchaseType, settings)
  DB->>DB: Check credit balance ≥ credits (initial guard)
  DB->>DB: Verify EXCLUSIVE eligibility (assignmentCount === 0) OR reject SHARED on INTERNATIONAL
  DB->>DB: Verify no existing LeadAssignment(leadId, agentId)

  DB->>DB: Atomic slot claim: updateMany Lead SET assignmentCount += increment WHERE assignmentCount < maxAgents
  alt count === 0
    DB-->>Route: throw "Lead fully distributed" (409)
  end

  DB->>DB: create LeadAssignment(status=PURCHASED)
  DB->>DB: create LeadPayment
  DB->>Credits: consumeCreditsInTx — updateMany with balance≥credits guard
  alt guard fails
    Credits-->>Purchase: throw INSUFFICIENT_CREDITS → PurchaseError 402
  end
  Credits->>DB: LeadCreditLedger.create(type=LEAD_PURCHASE, amount=-credits)

  DB->>DB: refresh lead, update Lead.status → SHARED or IN_PROGRESS
  DB->>DB: LeadStatusHistory + purchase note
  DB-->>Purchase: COMMIT

  Purchase-->>Route: { assignmentCount, price, creditsUsed, creditBalance, purchaseType }

  Route->>Route: logAudit lead.purchase [best-effort]
  Route->>Route: notify() in-app [best-effort]
  Route->>Mail: agentLeadPurchased receipt [best-effort]
  Route-->>UI: 200 { ok: true, data }
```

---

## 4. Authentication + admin invite

```mermaid
flowchart TD
  Signup[Agent signup /agent/signup] --> SVal[Zod validate]
  SVal --> SCreate[Supabase admin.createUser + prisma.user.create + prisma.agent.create PENDING]
  SCreate --> SOTP[VerificationToken EMAIL_VERIFY + email OTP]

  Login[/api/auth/login] --> LSup[supabase.auth.signInWithPassword]
  LSup --> LGate{User.emailVerified?}
  LGate -->|no| LEV[Redirect /agent/verify-email]
  LGate -->|yes| L2FA{User.twoFactorEnabled?}
  L2FA -->|yes| L2FASend[Issue TWO_FA VerificationToken + email → /agent/verify-2fa]
  L2FA -->|no| Dashboard[Redirect to role dashboard]

  Forgot[Forgot password] --> FTok[VerificationToken PASSWORD_RESET 32-byte hex]
  FTok --> FMail[passwordResetEmail via Resend account@]
  FMail --> FReset[User clicks link → /agent/reset-password]
  FReset --> FConsume[Consume token + supabase.auth.admin.updateUserById]

  AdminInvite[Super Admin at /admin/admins] --> AIVal[Zod validate email + adminRole]
  AIVal --> AIDup{Email exists in User?}
  AIDup -->|yes| AIReject[409 duplicate]
  AIDup -->|no| AICreate[prisma.user.create role=ADMIN emailVerified=true]
  AICreate --> AILink[supabase.auth.admin.generateLink type=invite → action_link]
  AILink --> AIMail[sendEmail adminInviteEmail via Resend account@]
  AIMail -->|fail| AIRollback[Delete Supabase auth user + delete User row → 502]
  AIMail -->|ok| AIAudit[logAudit admin.invite]
  AIAudit --> AIClick[Invitee clicks link → Supabase authenticates → redirect /admin/set-password]
  AIClick --> AISet[Client supabase.auth.updateUser password → redirect /admin/dashboard]
```

---

## 5. Email pipeline

```mermaid
flowchart LR
  Trigger[Any server-side trigger] --> Mailer[sendEmail lib/email/mailer.ts]
  Mailer --> Env{RESEND_API_KEY set?}
  Env -->|no| DevLog[console.info dev-only, returns skipped:true]
  Env -->|yes| Resend[POST https://api.resend.com/emails]

  subgraph Templates
    T1[customerLeadReceived]
    T2[adminNewLead]
    T3[agentLeadPurchased]
    T4[agentAutoLeadPurchased]
    T5[agentLeadAlert]
    T6[agentApproved]
    T7[walletCredited]
    T8[verifyEmailCode]
    T9[twoFactorCode]
    T10[securitySettingsChanged]
    T11[supportTicketCreated]
    T12[supportTicketReply]
    T13[passwordResetEmail]
    T14[adminInviteEmail]
  end

  Templates --> Mailer

  subgraph Categories
    Verify[verify@ — OTP + verify email]
    Leads[leads@ — receipts + alerts]
    Bookings[bookings@ — booking confirmations]
    Support[support@ — tickets]
    Account[account@ — password reset + admin invite + security]
  end

  Mailer -->|per category| Categories
  Resend -->|failure| IntLog[logIntegration email FAILED]
```

Sender identity: `${BRAND_NAME} <${category}@${EMAIL_SEND_DOMAIN}>` — one verified domain, per-category local-part for filtering.

---

## 6. Database relationships (simplified)

```mermaid
erDiagram
  User ||--o| Agent : "1:1 via userId"
  User ||--o{ Notification : ""
  User ||--o{ VerificationToken : ""

  Agent ||--o| AgentWallet : ""
  Agent ||--o| AgentCreditBalance : ""
  Agent ||--o| AgentPreference : ""
  Agent ||--o{ LeadAssignment : ""
  Agent ||--o{ WalletTopup : ""
  Agent ||--o{ LeadCreditPurchase : ""
  Agent ||--o{ LeadCreditLedger : ""
  Agent ||--o{ SpamReport : ""
  Agent ||--o{ SupportTicket : ""
  Agent ||--o{ VendorAd : ""

  Lead ||--o{ LeadAssignment : ""
  Lead ||--o{ LeadStatusHistory : ""
  Lead ||--o{ LeadNote : ""
  Lead ||--o{ LeadPayment : ""
  Lead ||--o{ SpamReport : ""
  Lead |o--o| Lead : "duplicateOfId"
  Lead }|--o| Destination : ""
  Lead }|--o| TourPackage : ""

  Destination ||--o{ TourPackage : ""

  TourPackage ||--o{ PackageImage : ""
  TourPackage ||--o{ PackageItinerary : ""
  TourPackage ||--o{ PackageInclusion : ""
  TourPackage ||--o{ PackageExclusion : ""
  TourPackage ||--o{ PackageFAQ : ""

  AgentWallet ||--o{ WalletTransaction : ""
  AgentCreditBalance ||--|| Agent : ""
  LeadCreditPackage ||--o{ LeadCreditPurchase : ""
  LeadCreditPackage ||--o{ LeadCreditLedger : ""
  LeadCreditPurchase |o--o| WalletTopup : ""

  SupportTicket ||--o{ SupportMessage : ""
  LeadAssignment ||--o{ LeadAssignmentStatusHistory : ""
  LeadAssignment ||--o{ SpamReport : ""
  LeadAssignment ||--o{ LeadCreditLedger : ""
```

---

## 7. Public page rendering + caching

```mermaid
flowchart LR
  Req[Request /] --> Next{Cached HTML < 5min?}
  Next -->|yes| ServeStatic[Serve from CDN/edge]
  Next -->|no| Render[Server Component render]

  Render --> Layout[app/layout.tsx generateMetadata]
  Layout --> S1[getPublicSettings — unstable_cache tag site-settings]
  S1 --> S1Cache{Next data cache hit?}
  S1Cache -->|yes| S1Hit[Return cached]
  S1Cache -->|no| Redis1[Upstash cached voyana:public:site-settings]
  Redis1 -->|hit| S1Hit
  Redis1 -->|miss| PGSet[Prisma.siteSetting.findUnique]
  PGSet --> Redis1Write[Write both caches]

  Render --> Home[app/home/page.tsx]
  Home --> P1[getFeaturedDestinations 8]
  Home --> P2[getFeaturedPackages PACKAGE 6]
  Home --> P3[getFeaturedPackages TOUR 3]
  Home --> P4[getPublicVendors 6]
  Home --> P5[getFlags]
  Home --> P6[if vendorAdsEnabled: getPublicVendorAds]
  P1 & P2 & P3 & P4 & P6 -.->|same 2-tier| Redis1

  Render --> Body[Prerender RSC → HTML]
  Body --> ServeStatic
```

Admin mutation → `revalidatePath("/") + revalidateTag(..., "max") + invalidateCache(...)` in [lib/cache/revalidate.ts](../lib/cache/revalidate.ts) → flushes both cache tiers.

---

## 8. RBAC decision map

```mermaid
flowchart TD
  Req[Request to /admin/**] --> Session[getSession]
  Session --> R{session?.role === "ADMIN"?}
  R -->|no| Redirect401[Redirect to /admin/login]
  R -->|yes| Area{route needs area?}
  Area -->|no| Allow[Render page]
  Area -->|yes| Check[canAccess session, area]

  Check --> Sub{session.adminRole}
  Sub -->|null| Allow[Treat as SUPER_ADMIN — legacy]
  Sub -->|SUPER_ADMIN| Allow
  Sub -->|LEAD_MANAGER| A1{area in [leads, vendors]?}
  Sub -->|SALES_MANAGER| A2{area in [leads, vendors]?}
  Sub -->|FINANCE_ADMIN| A3{area in [finance, vendors]?}
  Sub -->|SUPPORT_ADMIN| A4{area in [support, vendors]?}
  Sub -->|MARKETING_ADMIN| A5{area in [marketing, leads]?}
  Sub -->|CONTENT_ADMIN| A6{area in [content]?}

  A1 & A2 & A3 & A4 & A5 & A6 -->|no| Restricted[AccessRestricted card in-page]
  A1 & A2 & A3 & A4 & A5 & A6 -->|yes| Allow
```

Reference table from [lib/rbac.ts](../lib/rbac.ts):

| Role | Areas |
|---|---|
| `SUPER_ADMIN` | leads, finance, support, marketing, content, vendors, settings, flags |
| `LEAD_MANAGER` | leads, vendors |
| `SALES_MANAGER` | leads, vendors |
| `FINANCE_ADMIN` | finance, vendors |
| `SUPPORT_ADMIN` | support, vendors |
| `MARKETING_ADMIN` | marketing, leads |
| `CONTENT_ADMIN` | content |
