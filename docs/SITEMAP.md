# MokshBooking — Sitemap

_Generated from source: Next.js 16 App Router. Every entry below maps to a real file under `app/`._

Legend: ✅ implemented · 🟡 partial · 🚧 planned · ⏸️ feature-flag-gated · ⚠️ needs verification

---

## 1. Public Website (`app/(home)` + `app/(site)`)

| Route | File | Auth | Purpose | Key props / params | Status |
|---|---|---|---|---|---|
| `/` | [app/(home)/page.tsx](../app/(home)/page.tsx) | Public | Landing — hero, editable enquiry search bar, destinations, packages, tours grid, promo carousel, footer | `revalidate=300` (ISR) | ✅ |
| `/destinations` | [app/(site)/destinations/page.tsx](../app/(site)/destinations/page.tsx) | Public | Published destinations grid | `revalidate=300` | ✅ |
| `/destinations/[slug]` | [app/(site)/destinations/[slug]/page.tsx](../app/(site)/destinations/[slug]/page.tsx) | Public | Destination detail + packages/tours by destination | dynamic `slug` | ✅ |
| `/packages` | [app/(site)/packages/page.tsx](../app/(site)/packages/page.tsx) | Public | Published packages grid (`kind=PACKAGE`) | `revalidate=300` | ✅ |
| `/packages/[slug]` | [app/(site)/packages/[slug]/page.tsx](../app/(site)/packages/[slug]/page.tsx) | Public | Package detail | dynamic `slug` | ✅ |
| `/tours` | [app/(site)/tours/page.tsx](../app/(site)/tours/page.tsx) | Public | Published tours grid (`kind=TOUR`) | `revalidate=300` | ✅ |
| `/tours/[slug]` | [app/(site)/tours/[slug]/page.tsx](../app/(site)/tours/[slug]/page.tsx) | Public | Tour detail | dynamic `slug` | ✅ |
| `/how-it-works` | [app/(site)/how-it-works/page.tsx](../app/(site)/how-it-works/page.tsx) | Public | Marketing content | `revalidate=3600` | ✅ |
| `/about` | [app/(site)/about/page.tsx](../app/(site)/about/page.tsx) | Public | About page (brand-driven from SiteSetting) | `revalidate=3600` | ✅ |
| `/contact` | [app/(site)/contact/page.tsx](../app/(site)/contact/page.tsx) | Public | Contact info | `revalidate=3600` | ✅ |
| `/privacy-policy` | [app/(site)/privacy-policy/page.tsx](../app/(site)/privacy-policy/page.tsx) | Public | Legal | `revalidate=3600` | ✅ |
| `/terms` | [app/(site)/terms/page.tsx](../app/(site)/terms/page.tsx) | Public | Legal | `revalidate=3600` | ✅ |
| `/request-quote` | [app/(site)/request-quote/page.tsx](../app/(site)/request-quote/page.tsx) | Public | Full quote form (leads to `/api/leads` POST) | query `destination`, `destinationId` | ✅ |
| `/request-quote/success` | [app/(site)/request-quote/success/page.tsx](../app/(site)/request-quote/success/page.tsx) | Public | Post-submit thank-you | — | ✅ |
| `/login` | [app/(site)/login/page.tsx](../app/(site)/login/page.tsx) | Public | Agent-only sign-in. Admin session redirects to `/admin/dashboard`, agent session to `/agent/dashboard`. | — | ✅ |
| `/robots.txt` | [app/robots.ts](../app/robots.ts) | Public | SEO | — | ✅ |
| `/sitemap.xml` | [app/sitemap.ts](../app/sitemap.ts) | Public | SEO | — | ✅ |

---

## 2. Authentication Routes

| Route | File | Auth | Purpose | Params | Status |
|---|---|---|---|---|---|
| `/agent/login` | [app/agent/login/page.tsx](../app/agent/login/page.tsx) | Public | Agent sign-in (redirects `/agent/dashboard`) | — | ✅ |
| `/agent/signup` | [app/agent/signup/page.tsx](../app/agent/signup/page.tsx) | Public | Two-column agent signup (email + password + company info) | — | ✅ |
| `/agent/forgot-password` | [app/agent/forgot-password/page.tsx](../app/agent/forgot-password/page.tsx) | Public | Request reset link | — | ✅ |
| `/agent/reset-password` | [app/agent/reset-password/page.tsx](../app/agent/reset-password/page.tsx) | Public | Reset link redemption | `?token=` | ✅ |
| `/agent/verify-email` | [app/agent/verify-email/page.tsx](../app/agent/verify-email/page.tsx) | Agent (pre-verify) | Enter 6-digit OTP | — | ✅ |
| `/agent/verify-2fa` | [app/agent/verify-2fa/page.tsx](../app/agent/verify-2fa/page.tsx) | Agent (pre-2FA) | Enter 6-digit 2FA code | — | ✅ |
| `/agent/page.tsx` | [app/agent/page.tsx](../app/agent/page.tsx) | Redirect | Redirects to `/agent/dashboard` or `/agent/login` | — | ✅ |
| `/admin/login` | [app/admin/login/page.tsx](../app/admin/login/page.tsx) | Public | Admin sign-in | — | ✅ |
| `/admin/set-password` | [app/admin/set-password/page.tsx](../app/admin/set-password/page.tsx) | Public + invite session | Landing for invited admins (Supabase invite → set password) | — | ✅ |

---

## 3. Admin Portal (`app/admin/(panel)`)

Layout: [app/admin/(panel)/layout.tsx](../app/admin/(panel)/layout.tsx) — enforces `requireAdmin()` before any child renders. Sub-role gating done per-page via `requireArea(session, area)` (see [lib/rbac.ts](../lib/rbac.ts)).

```
/admin
├── dashboard           (all admins)        Ops KPIs + revenue + recent leads
├── leads
│   ├── /               (LEAD_MANAGER+)     Lead list, filters, quality/status badges
│   ├── /new            (LEAD_MANAGER+)     Admin manually creates a lead
│   ├── /[id]           (LEAD_MANAGER+)     Lead detail, assignments, notes, history
│   └── /[id]/edit      (LEAD_MANAGER+)     Edit lead
├── agents
│   ├── /               (SALES_MANAGER+)    Agent list, status filters
│   └── /[id]           (SALES_MANAGER+)    Agent detail + wallet credit UI + assignments
├── wallets             (FINANCE_ADMIN+)    Cross-agent wallet balances + top-ups
├── pricing             (SUPER_ADMIN only)  Lead Credit package manager + stat cards
├── credit-orders       (FINANCE_ADMIN+)    Approve/reject manual QR credit purchases
├── revenue             (FINANCE_ADMIN+)    Revenue by window + daily chart
├── campaigns           (MARKETING_ADMIN+)  Marketing campaign list (utm-based)
├── spam-reports
│   ├── /               (LEAD_MANAGER+)     Pending spam reports
│   └── /[id]           (LEAD_MANAGER+)     Review + refund/credit decision
├── vendor-ads
│   ├── /               (MARKETING_ADMIN+)  Ad moderation list
│   └── /[id]           (MARKETING_ADMIN+)  Approve/reject an ad
├── support
│   ├── /               (SUPPORT_ADMIN+)    Ticket list
│   └── /[id]           (SUPPORT_ADMIN+)    Ticket thread + reply
├── destinations
│   ├── /               (CONTENT_ADMIN+)    Destination list
│   ├── /new            (CONTENT_ADMIN+)    Create destination
│   └── /[id]/edit      (CONTENT_ADMIN+)    Edit destination
├── packages
│   ├── /               (CONTENT_ADMIN+)    Package list
│   ├── /new            (CONTENT_ADMIN+)    Create package
│   └── /[id]/edit      (CONTENT_ADMIN+)    Edit package
├── tours
│   ├── /               (CONTENT_ADMIN+)    Tour list (packages with kind=TOUR)
│   ├── /new            (CONTENT_ADMIN+)    Create tour
│   └── /[id]/edit      (CONTENT_ADMIN+)    Edit tour
├── media               (CONTENT_ADMIN+)    Media library
├── moderation          (CONTENT_ADMIN+)    Vendor-submitted content queue
├── integrations
│   ├── /               (SUPER_ADMIN)       Integration status
│   └── /logs           (SUPER_ADMIN)       IntegrationLog records
├── audit               (SUPER_ADMIN)       AuditLog viewer
├── admins              (SUPER_ADMIN only)  Invite new admins (Supabase invite via Resend)
├── settings            (SUPER_ADMIN only)  Brand, contact, socials, pricing, SEO, tracking, flags
└── preview
    ├── /destination/[id]   Content preview during editing
    └── /package/[id]       Content preview during editing
```

All admin panel pages are `ƒ Dynamic` (auth required per-request).

---

## 4. Agent Portal (`app/agent/(portal)`)

Layout: [app/agent/(portal)/layout.tsx](../app/agent/(portal)/layout.tsx) — enforces `requireAgent()` (approved + email-verified + 2FA cleared per [lib/guards.ts](../lib/guards.ts)).

```
/agent
├── dashboard           Overview: credits, purchased/won counts, marketplace preview, recent purchases
├── leads               Available-leads marketplace (filters, pagination, buy Shared/Exclusive)
├── leads/[id]          Lead detail (preview pre-purchase, full details post-purchase, status control)
├── purchases           "My Leads" table (assignments filter/sort/paginate)
├── ads                 Vendor ads (⏸️ gated by vendorAdsEnabled feature flag)
├── submissions         Submit destinations/packages for moderation (⏸️ gated by packageMarketplaceEnabled)
├── preferences         Alert + auto-buy preferences (categories, budget, destinations, quality)
├── profile             Personal + company profile
├── security            2FA toggle + change password
├── settings            Account settings
├── wallet              Lead Credits balance + package purchase (manual QR flow) + top-up history
├── notifications       Notification list (mark read individually or all)
├── support             Ticket list (⏸️ gated by supportEnabled)
└── support/[id]        Ticket thread + reply
```

All agent portal pages are `ƒ Dynamic`.

---

## 5. Route inventory summary

- **Public site pages:** 16 (including SEO endpoints)
- **Auth pages:** 9
- **Admin panel pages:** ~30
- **Agent portal pages:** 13
- **API routes:** ~62 (see [API_DOCUMENTATION.md](API_DOCUMENTATION.md))

---

## 6. Dynamic route parameter reference

| Segment | Uses |
|---|---|
| `[slug]` | Destinations / packages / tours (public content) |
| `[id]` | Everything else — CUID string ids from Prisma (leads, agents, ads, tickets, etc.) |
| `[type]/[id]` | Only `/api/admin/moderation/[type]/[id]` — `type ∈ {destination, package}` |
