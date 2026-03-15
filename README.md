# LocalPro Marketplace

A full-stack service marketplace platform built with **Next.js 16**, **MongoDB**, and **PayMongo** (Philippines). Clients post jobs, providers submit quotes, and payments are held in escrow until work is complete.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT (httpOnly cookies) — access + refresh tokens + Facebook OAuth |
| Payments | PayMongo (GCash, Maya, credit card via Checkout Sessions) |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Charts | Recharts |
| State | Zustand |
| AI | OpenAI (job risk scoring, bio generation, quote suggestions, chat summaries) |
| Email | Nodemailer (SMTP) + Resend |
| Real-time | Server-Sent Events (SSE) for notifications and chat |
| SMS / OTP | Twilio |
| File Uploads | Cloudinary |
| Push Notifications | Web Push API (VAPID) via service worker |
| Validation | Zod |
| Error Monitoring | Sentry |

---

## Features

### Client
- Post jobs with budget, category, schedule date, location and optional before-photos
- Fraud & risk assessment runs automatically on every job submission
- Browse and accept/reject provider quotes; request revisions via chat
- Fund escrow via PayMongo Checkout Session (GCash / Maya / card) or platform wallet
- Release escrow (full, partial, or milestone-based) once work is confirmed
- Auto-release timer: escrow released automatically after inactivity timeout
- Raise disputes on active or completed jobs
- Leave reviews after escrow is released
- Consultation/site-inspection requests before committing to a job
- Recurring service scheduling (daily / weekly / fortnightly / monthly) with auto-pay
- Real-time notification bell + full notifications page
- Upgrade to Business account for multi-branch and team features

### Provider
- Browse open job marketplace with category filters and AI-powered ranking
- Submit quotes with proposed amount, timeline, milestone breakdowns, and proposal docs
- Start and mark-complete jobs (requires funded escrow)
- Upload before/after photos at job start and completion
- Withdraw from an assigned job before work starts (`provider_withdrew` event)
- Track earnings, wallet balance, and payout history
- Request payouts to bank / GCash / Maya
- Manage public profile, skill tags, service areas, and portfolio
- Consultation responses with structured estimates
- Purchase visibility boosts (Featured Listings) via wallet or PayMongo
- Training courses with completion badges
- Bid credit system for pay-per-lead quoting
- Lead subscription plans (monthly flat-fee leads)
- Loyalty points and tier rewards
- Agency accounts: manage staff, assign jobs, track team earnings

### Admin
- Review and approve/reject newly posted jobs (with AI risk score and fraud flags)
- KYC document review (approve / reject per document type)
- Manage all users: suspend, activate, impersonate, delete, GDPR export
- Resolve disputes with escrow action (release / refund)
- Full double-entry accounting suite: ledger, trial balance, income statement, balance sheet
- Payout management with approve / reject and manual disbursement
- Platform settings management (`AppSetting` model — all fees and thresholds configurable)
- Announcement broadcast to roles
- Knowledge base management (client and provider articles)
- Staff account management with role-based access
- Database tools: backup, restore, reset, stats
- Admin support chat with users
- Bulk user actions and CSV import/export
- Fraud investigation panel with activity logs
- Category management with custom icons and ordering
- Training course management

### PESO (Public Employment Service Office)
- PESO officer onboarding and municipal assignment
- Livelihood group management
- Bulk workforce onboarding
- Provider verification and certification
- Job board for public listings
- Emergency job posting
- Reports and referrals

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register, forgot/reset password pages
│   ├── (dashboard)/
│   │   ├── admin/           # Admin dashboard: jobs, users, KYC, disputes, payouts,
│   │   │                    #   accounting, settings, staff, knowledge, training, courses
│   │   ├── client/          # Client dashboard: jobs, escrow, reviews, post-job,
│   │   │                    #   consultations, recurring, business upgrade
│   │   └── provider/        # Provider dashboard: marketplace, jobs, earnings, profile,
│   │                        #   training, boost, lead credits, loyalty, agency
│   ├── agency/              # Agency sub-portal (staff + owner views)
│   ├── board/               # Public job board
│   ├── jobs/                # Public job detail pages
│   └── api/                 # Route handlers (200+ endpoints — see API Overview)
│       ├── auth/            # login, register, logout, me, refresh, verify-email,
│       │                    #   forgot/reset-password, phone OTP, Facebook OAuth
│       ├── jobs/            # CRUD + lifecycle transitions + milestones
│       ├── quotes/          # Submit, accept, reject; quote templates
│       ├── payments/        # PayMongo checkout session + polling
│       ├── webhooks/        # PayMongo webhook handler
│       ├── disputes/        # Open & list disputes
│       ├── reviews/         # Submit reviews
│       ├── transactions/    # Escrow transaction history + CSV export
│       ├── notifications/   # SSE stream + mark-read
│       ├── messages/        # Job-scoped messaging + SSE stream + attachments
│       ├── consultations/   # Consultation requests, responses, estimates, conversion
│       ├── wallet/          # Balance, top-up, withdraw, transactions
│       ├── providers/       # Provider profiles, reviews, service areas, bio generation
│       ├── provider/        # Provider-private: boost, training, agency sub-routes
│       ├── skills/          # Skills list
│       ├── search/          # Unified search
│       ├── recurring/       # Recurring schedules + saved payment method
│       ├── ai/              # AI tools: classify, estimate, generate description/bio/quote,
│       │                    #   suggest replies, summarize chat/dispute, recommend providers
│       ├── business/        # Business org: members, locations, jobs, billing, analytics
│       ├── agency/          # Agency invite flow
│       ├── peso/            # PESO portal endpoints
│       ├── public/          # Unauthenticated feed, board, recent completions
│       ├── admin/           # Admin-only endpoints (jobs, users, disputes, payouts,
│       │                    #   accounting, settings, staff, KYC, knowledge, fraud, etc.)
│       └── cron/            # Scheduled jobs: expire-jobs, expire-quotes, expire-boosts,
│                            #   release-escrow, spawn-recurring, reminders, reconcile-ledger
├── components/
│   ├── analytics/           # Analytics charts and KPI widgets
│   ├── chat/                # Real-time messaging UI
│   ├── client/              # Client-specific components
│   ├── layout/              # Header, Sidebar, DashboardShell
│   ├── notifications/       # NotificationsPage, NotificationBell
│   ├── payment/             # Checkout and wallet components
│   ├── pwa/                 # PWA install prompt, offline page
│   ├── shared/              # RoleGuard, RaiseDisputeButton, ErrorBoundary
│   └── ui/                  # Button, Card, Badge, Modal, KpiCard, Spinner, etc.
├── lib/                     # auth, db, utils, jobLifecycle, riskScore, commission,
│                            #   paymongo, paypal, cloudinary, twilio, openai, email,
│                            #   loyalty, tier, ledger, fraudDetection, rateLimit, events
├── models/                  # Mongoose models (30+): User, Job, Quote, Transaction,
│                            #   Dispute, Review, ActivityLog, Notification, Message,
│                            #   ProviderProfile, Payment, Payout, Wallet, LedgerEntry,
│                            #   FeaturedListing, TrainingCourse, TrainingEnrollment,
│                            #   AgencyProfile, BusinessOrganization, RecurringSchedule,
│                            #   Consultation, LoyaltyAccount, BidCreditAccount, etc.
├── repositories/            # Data-access layer (one per model)
├── services/                # Business logic: auth, job, escrow, payment, quote, review,
│                            #   dispute, admin, notification, wallet, featured-listing,
│                            #   lead, loyalty, training, agency, recurring, consultation
├── stores/                  # Zustand: authStore, notificationStore
├── proxy.ts                 # Next.js middleware (route protection + token refresh)
└── types/                   # Shared TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- MongoDB Atlas cluster (or local MongoDB)
- PayMongo account (test keys)
- SMTP credentials (Gmail app password or Mailtrap for dev)

### Installation

```bash
git clone https://github.com/your-org/localpro-marketplace.git
cd localpro-marketplace
pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/localpro

# JWT — generate with: openssl rand -base64 64
JWT_SECRET=
JWT_REFRESH_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_INTERNAL_URL=http://localhost:3000

# PayMongo
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsk_...

# OpenAI (job risk scoring, AI tools)
OPENAI_API_KEY=sk-...

# Cloudinary (photo uploads — before/after job photos, KYC docs)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google Maps (Places Autocomplete on location fields)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# SMTP (email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="LocalPro <no-reply@localpro.ph>"

# Twilio (OTP / SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1...

# Web Push (PWA push notifications — generate with web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@localpro.ph

# Facebook OAuth (optional)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Sentry (optional — error monitoring)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Cron job protection
CRON_SECRET=some-random-secret
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### PayMongo Webhooks (local dev)

Use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http http://localhost:3000
```

Register `https://<your-ngrok-id>.ngrok-free.app/api/webhooks/paymongo` as a webhook endpoint in the PayMongo dashboard. Enable the `checkout_session.payment.paid` event.

---

## Job Lifecycle

```
pending_validation → open → assigned → in_progress → completed → closed
                   ↘ rejected          ↘ open (provider withdrew)
                                       ↘ disputed → completed | refunded
open / assigned → expired | cancelled
```

| Transition | Triggered by | Guard |
|---|---|---|
| `pending_validation` | Client posts job | Fraud/risk assessment runs |
| `open` | Admin approves | — |
| `rejected` | Admin rejects | — |
| `assigned` | Client accepts a quote | Provider must be `approvalStatus: approved` |
| `in_progress` | Provider starts job | Escrow must be `funded` |
| `completed` | Provider marks complete | Escrow must be `funded` |
| `closed` | Client releases escrow | — |
| `disputed` | Either party raises dispute | Job must be `assigned`, `in_progress`, or `completed` |
| `open` (revert) | Provider withdraws | Job must be `assigned`; clears `providerId` |
| `cancelled` | Client or admin cancels | — |
| `expired` | Cron: no provider assigned within window | — |

---

## Escrow Flow

1. Client accepts a provider quote → job moves to `assigned`
2. Client funds escrow via PayMongo Checkout Session **or** platform wallet → `escrowStatus: funded`
3. Provider starts job (`in_progress`) — blocked until step 2
4. Provider marks job complete → client reviews
5. Client releases escrow (full, partial, or milestone-based) → payment transferred to provider → `escrowStatus: released`
6. Auto-release fires after configurable inactivity timeout if client does not respond

---

## API Overview

All authenticated routes require a valid `access_token` cookie. The middleware (`src/proxy.ts`) transparently refreshes it using the `refresh_token` cookie.

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, set cookies |
| POST | `/api/auth/logout` | Clear cookies |
| GET | `/api/auth/me` | Current user info |
| PATCH | `/api/auth/me/addresses` | Manage saved addresses |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Set new password |
| POST | `/api/auth/phone/send` | Send phone OTP |
| POST | `/api/auth/phone/verify` | Verify phone OTP |
| GET | `/api/auth/facebook` | Initiate Facebook OAuth |
| GET | `/api/auth/facebook/callback` | Facebook OAuth callback |

### Jobs

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/jobs` | List / create jobs |
| GET/PATCH | `/api/jobs/[id]` | Get / update job |
| PATCH | `/api/jobs/[id]/start` | Provider starts job |
| PATCH | `/api/jobs/[id]/mark-complete` | Provider marks complete |
| PATCH | `/api/jobs/[id]/fund` | Client funds escrow (PayMongo path) |
| PATCH | `/api/jobs/[id]/fund-wallet` | Client funds escrow (wallet path) |
| POST | `/api/jobs/[id]/complete` | Client confirms completion |
| PATCH | `/api/jobs/[id]/partial-release` | Client releases partial escrow |
| POST | `/api/jobs/[id]/cancel` | Cancel a job |
| POST | `/api/jobs/[id]/withdraw` | Provider withdraws from assignment |
| GET/POST | `/api/jobs/[id]/milestones` | Manage milestones |
| POST | `/api/jobs/[id]/milestones/[mId]/release` | Release a milestone payment |
| GET | `/api/jobs/[id]/quotes` | List quotes on a job |

### Quotes & Templates

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/quotes` | List / submit quotes |
| POST | `/api/quotes/[id]/accept` | Accept a quote |
| POST | `/api/quotes/[id]/reject` | Reject a quote |
| GET/POST | `/api/quote-templates` | Manage quote templates |
| GET/PATCH/DELETE | `/api/quote-templates/[id]` | CRUD on a template |

### Payments & Wallet

| Method | Route | Description |
|---|---|---|
| POST | `/api/payments` | Create PayMongo checkout session |
| GET | `/api/payments/[id]` | Poll payment / checkout status |
| POST | `/api/webhooks/paymongo` | PayMongo webhook handler |
| GET | `/api/wallet` | Get wallet balance |
| POST | `/api/wallet/topup` | Initiate wallet top-up |
| POST | `/api/wallet/topup/verify` | Confirm top-up after payment |
| POST | `/api/wallet/withdraw` | Request wallet withdrawal |
| GET | `/api/wallet/transactions` | Wallet transaction history |
| GET | `/api/payouts` | Provider payout history |

### Disputes, Reviews & Transactions

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/disputes` | List / open dispute |
| POST | `/api/reviews` | Submit review |
| GET | `/api/transactions` | Escrow transaction history |
| GET | `/api/transactions/export` | Export transactions as CSV |

### Notifications & Messages

| Method | Route | Description |
|---|---|---|
| GET | `/api/notifications/stream` | SSE notification stream |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/[id]/read` | Mark notification read |
| GET/POST | `/api/messages` | List threads / send message |
| GET/POST | `/api/messages/[threadId]` | Thread messages |
| POST | `/api/messages/[threadId]/attachment` | Upload attachment |
| GET | `/api/messages/stream/[threadId]` | SSE message stream |
| GET | `/api/messages/threads` | All message threads |

### Provider

| Method | Route | Description |
|---|---|---|
| GET/PATCH | `/api/providers/profile` | Own profile CRUD |
| POST | `/api/providers/profile/generate-bio` | AI-generate provider bio |
| GET/POST | `/api/providers/profile/service-areas` | Manage service areas |
| GET | `/api/providers/[id]/profile` | Public provider profile |
| GET | `/api/providers/[id]/reviews` | Provider reviews |
| POST/GET | `/api/provider/boost` | Purchase / list featured listing boosts |
| DELETE | `/api/provider/boost/[id]` | Cancel a boost |
| GET | `/api/provider/training` | Available training courses |
| POST | `/api/provider/training/[id]/enroll` | Enroll in course |
| POST | `/api/provider/training/[id]/checkout` | PayMongo checkout for paid course |
| GET | `/api/provider/training/enrollments` | Provider's enrollments |
| POST | `/api/provider/training/enrollments/[id]/complete` | Complete a course |

### Consultations & Recurring

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/consultations` | List / create consultation requests |
| GET/PATCH | `/api/consultations/[id]` | Get / update consultation |
| POST | `/api/consultations/[id]/respond` | Provider accepts/declines/estimates |
| POST | `/api/consultations/[id]/convert-to-job` | Convert consultation to a job |
| GET | `/api/consultations/[id]/messages` | Consultation message thread |
| GET/POST | `/api/recurring` | Manage recurring schedules |
| PATCH/DELETE | `/api/recurring/[id]` | Update / cancel recurring schedule |
| GET | `/api/recurring/saved-method` | Client's saved payment method |

### AI Tools

| Method | Route | Description |
|---|---|---|
| POST | `/api/ai/classify-category` | AI-classify a job category |
| POST | `/api/ai/estimate-budget` | AI-estimate a job budget |
| POST | `/api/ai/generate-description` | AI-generate a job description |
| POST | `/api/ai/generate-consultation-description` | AI-generate consultation details |
| POST | `/api/ai/generate-quote-message` | AI-generate a quote cover note |
| POST | `/api/ai/suggest-replies` | AI-suggest chat replies |
| POST | `/api/ai/summarize-chat` | AI-summarize a message thread |
| POST | `/api/ai/summarize-dispute` | AI-summarize dispute evidence |
| POST | `/api/ai/recommend-providers` | AI-recommend providers for a job |
| POST | `/api/ai/suggest-skills` | AI-suggest skills for a profile |

### Admin

| Method | Route | Description |
|---|---|---|
| PATCH | `/api/admin/jobs/[id]/approve` | Approve a job |
| PATCH | `/api/admin/jobs/[id]/reject` | Reject a job |
| PATCH | `/api/admin/jobs/[id]/escrow-override` | Override escrow amount |
| PATCH | `/api/admin/jobs/[id]/force-withdraw` | Force-withdraw a provider |
| GET/PATCH | `/api/admin/users` | List / bulk update users |
| PATCH | `/api/admin/users/[id]` | Suspend / activate user |
| POST | `/api/admin/users/[id]/impersonate` | Impersonate user session |
| GET | `/api/admin/users/[id]/activity` | User activity log |
| GET | `/api/admin/users/export` | Export users as CSV |
| PATCH | `/api/admin/disputes/[id]` | Resolve a dispute |
| PATCH | `/api/admin/payouts/[id]` | Approve / reject payout |
| GET/PATCH | `/api/admin/kyc/[userId]` | Review KYC documents |
| GET/PATCH | `/api/admin/settings` | Platform-wide settings |
| GET | `/api/admin/stats` | Dashboard KPIs |
| GET | `/api/admin/accounting/*` | Accounting suite (ledger, trial balance, etc.) |
| GET/POST | `/api/admin/staff` | Manage staff accounts |

### Cron Jobs

| Route | Schedule | Description |
|---|---|---|
| `/api/cron/expire-jobs` | Daily | Expire unfunded/unassigned jobs |
| `/api/cron/expire-quotes` | Daily | Expire stale pending quotes |
| `/api/cron/expire-boosts` | Daily | Expire provider feature listings |
| `/api/cron/expire-consultations` | Daily | Expire stale consultation requests |
| `/api/cron/release-escrow` | Daily | Auto-release overdue escrows |
| `/api/cron/spawn-recurring` | Daily | Auto-generate recurring job instances |
| `/api/cron/reminders` | Daily | Send reminder notifications |
| `/api/cron/reconcile-ledger` | Daily | Reconcile double-entry ledger |
| `/api/cron/profile-completion` | Weekly | Prompt incomplete provider profiles |
| `/api/cron/maintenance` | Weekly | General DB housekeeping |

---

## Scripts

```bash
pnpm dev                      # Start dev server (Turbopack)
pnpm build                    # Production build (seeds AppSettings after)
pnpm start                    # Start production server
pnpm lint                     # ESLint

# Database
pnpm db:reset                 # Drop and re-seed entire database
pnpm db:seed                  # Seed without dropping
pnpm db:seed:no-admin         # Seed without admin user
pnpm db:seed-categories       # Seed service categories
pnpm db:seed-categories:wipe  # Wipe and re-seed categories
pnpm db:seed-settings         # Seed AppSettings defaults
pnpm db:seed-settings:force   # Force-overwrite all settings
pnpm db:seed-skills           # Seed skills library
pnpm db:seed-skills:force     # Force-overwrite skills
pnpm db:seed-skills:wipe      # Wipe and re-seed skills

# Assets
pnpm icons:generate           # Generate PWA icon set
```

---

## Currency

All monetary values are stored and computed in **PHP (Philippine Peso)** and displayed with the `₱` symbol via the `formatCurrency` / `formatPHP` utility.


---

## Features

### Client
- Post jobs with budget, category, schedule date, and location
- Browse and accept/reject provider quotes
- Fund escrow via PayMongo Checkout Session (GCash / Maya / card)
- Release escrow to provider once work is confirmed
- Raise disputes on active or completed jobs
- Leave reviews after escrow is released
- Real-time notification bell + full notifications page

### Provider
- Browse open job marketplace with category filters
- Submit quotes with proposed amount, timeline, and message
- Start and mark-complete jobs (requires funded escrow)
- Track earnings and view payout history
- Manage public profile and skill tags
- Receive real-time notifications for quote decisions

### Admin
- Review and approve/reject newly posted jobs (with AI risk score)
- Manage all users (suspend/activate accounts)
- Resolve disputes
- Dashboard KPIs: GMV, commission, active escrow, open disputes
- Jobs and user action logs

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login & register pages
│   ├── (dashboard)/
│   │   ├── admin/           # Admin dashboard, jobs, users, disputes
│   │   ├── client/          # Client dashboard, jobs, escrow, reviews, post-job
│   │   └── provider/        # Provider dashboard, marketplace, jobs, earnings, profile
│   └── api/                 # Route handlers
│       ├── auth/            # login, register, logout, me, refresh
│       ├── jobs/            # CRUD + lifecycle transitions
│       ├── quotes/          # Submit, accept, reject quotes
│       ├── payments/        # PayMongo checkout session creation & polling
│       ├── webhooks/        # PayMongo webhook handler
│       ├── disputes/        # Open & list disputes
│       ├── reviews/         # Submit reviews
│       ├── transactions/    # Escrow transaction history
│       ├── notifications/   # SSE stream + mark-read
│       ├── messages/        # Job-scoped messaging
│       ├── providers/       # Provider profile
│       ├── skills/          # Skills list
│       ├── admin/           # Admin-only job/user/dispute/stats actions
│       └── cron/            # Scheduled cleanup jobs
├── components/
│   ├── layout/              # Header, Sidebar, DashboardShell
│   ├── notifications/       # NotificationsPage
│   ├── shared/              # NotificationBell, RoleGuard, RaiseDisputeButton
│   └── ui/                  # Button, Card, Badge, Modal, KpiCard, Spinner
├── lib/                     # auth, db, utils, jobLifecycle, riskScore, commission
├── models/                  # Mongoose models: User, Job, Quote, Transaction, Dispute, Review, ActivityLog
├── repositories/            # Data-access layer (one per model)
├── services/                # Business logic: auth, job, escrow, payment, quote, review, dispute, admin
├── stores/                  # Zustand: authStore, notificationStore
├── proxy.ts                 # Next.js middleware (route protection + token refresh)
└── types/                   # Shared TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- MongoDB Atlas cluster (or local MongoDB)
- PayMongo account (test keys)
- SMTP credentials (Gmail app password or Mailtrap for dev)

### Installation

```bash
git clone https://github.com/your-org/localpro-marketplace.git
cd localpro-marketplace
pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/localpro

# JWT — generate with: openssl rand -base64 64
JWT_SECRET=
JWT_REFRESH_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_INTERNAL_URL=http://localhost:3000

# PayMongo
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsk_...

# OpenAI (job risk scoring)
OPENAI_API_KEY=sk-...

# Cloudinary (photo uploads — before/after job photos)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google Maps (Places Autocomplete on location fields)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# SMTP (email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="LocalPro <no-reply@localpro.ph>"

# Cron job protection
CRON_SECRET=some-random-secret
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### PayMongo Webhooks (local dev)

Use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http http://localhost:3000
```

Register `https://<your-ngrok-id>.ngrok-free.app/api/webhooks/paymongo` as a webhook endpoint in the PayMongo dashboard. Enable the `payment.paid` event.

---

## Job Lifecycle

```
draft → pending_approval → open → assigned → in_progress → completed → closed
                        ↘ rejected
```

| Transition | Triggered by | Guard |
|---|---|---|
| `pending_approval` | Client posts job | — |
| `open` | Admin approves | — |
| `rejected` | Admin rejects | — |
| `assigned` | Client accepts a quote | — |
| `in_progress` | Provider starts job | Escrow must be `funded` |
| `completed` | Provider marks complete | — |
| `closed` | Client releases escrow | — |

---

## Escrow Flow

1. Client accepts a provider quote → job moves to `assigned`
2. Client funds escrow via PayMongo Checkout Session → webhook confirms → `escrowStatus: funded`
3. Provider starts job (`in_progress`) — blocked until step 2
4. Provider marks job complete
5. Client releases escrow → payment transferred to provider → `escrowStatus: released`

---

## API Overview

All authenticated routes require valid `access_token` cookie. The middleware (`src/proxy.ts`) transparently refreshes it using the `refresh_token` cookie.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, set cookies |
| POST | `/api/auth/logout` | Clear cookies |
| GET | `/api/auth/me` | Current user info |
| GET/POST | `/api/jobs` | List / create jobs |
| GET/PATCH | `/api/jobs/[id]` | Get / update job |
| POST | `/api/jobs/[id]/start` | Provider starts job |
| POST | `/api/jobs/[id]/mark-complete` | Provider marks complete |
| POST | `/api/jobs/[id]/release` | Client releases escrow |
| GET/POST | `/api/quotes` | List / submit quotes |
| PATCH | `/api/quotes/[id]` | Accept or reject quote |
| POST | `/api/payments` | Create PayMongo checkout session |
| GET | `/api/payments/[id]` | Poll payment status |
| POST | `/api/webhooks/paymongo` | PayMongo webhook handler |
| GET/POST | `/api/disputes` | List / open dispute |
| POST | `/api/reviews` | Submit review |
| GET | `/api/notifications` | SSE stream |
| PATCH | `/api/notifications/[id]` | Mark notification read |
| PATCH | `/api/admin/jobs/[id]/approve` | Admin approves job |
| PATCH | `/api/admin/jobs/[id]/reject` | Admin rejects job |
| PATCH | `/api/admin/users/[id]` | Admin suspend/activate user |
| PATCH | `/api/admin/disputes/[id]` | Admin resolves dispute |

---

## Scripts

```bash
pnpm dev      # Start dev server (Turbopack)
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # ESLint
```

---

## Currency

All monetary values are stored in **PHP (Philippine Peso)** and displayed with the `₱` symbol via the `formatCurrency` utility.
