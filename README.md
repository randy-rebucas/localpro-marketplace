# LocalPro Marketplace

A full-stack service marketplace platform built with **Next.js 16**, **MongoDB**, and **PayMongo** (Philippines). Clients post jobs, providers submit quotes, and payments are held in escrow until work is complete.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT (httpOnly cookies) — access + refresh tokens |
| Payments | PayMongo (GCash, Maya, credit card via Checkout Sessions) |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |
| Charts | Recharts |
| State | Zustand |
| AI | OpenAI (job risk scoring) |
| Email | Nodemailer (SMTP) |
| Real-time | Server-Sent Events (SSE) for notifications |

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
