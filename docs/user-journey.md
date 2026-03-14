# LocalPro Marketplace — User Journey

**Version:** 1.1  
**Last Updated:** March 14, 2026  
**Stack:** Next.js · MongoDB (Mongoose) · PayMongo · Cloudinary · SSE · Twilio · Resend

**Core flow:** Client posts job → Admin approves → Provider quotes → Client accepts & funds escrow → Provider works and marks complete → Client releases escrow → Provider requests payout

---

## Overview

```
Client                   Admin                  Provider
  │                        │                       │
  │  POST /api/jobs         │                       │
  │─────────────────────────>                       │
  │  status: pending_       │  PATCH …/approve      │
  │  validation             │──────────────────────>│
  │  ← job_approved         │  status: open         │
  │                         │                       │  POST /api/quotes
  │                         │                       │─────────────────
  │  ← quote_received       │                       │  status: pending
  │                         │                       │
  │  PATCH /api/quotes/[id]/accept                  │
  │──────────────────────────────────────────────── │
  │  status: assigned       │        ← quote_accepted
  │                         │                       │
  │  PATCH /api/jobs/[id]/fund  (PayMongo path)     │
  │─────────────────────────>                       │
  │           ← PayMongo webhook (payment.paid)     │
  │  escrowStatus: funded   │    ← escrow_funded    │
  │                         │                       │
  │  PATCH /api/jobs/[id]/fund-wallet  (wallet path)│
  │─────────────────────────────────────────────────│
  │  escrowStatus: funded (immediate)               │
  │                         │                       │
  │                         │                       │  PATCH /api/jobs/[id]/start
  │                         │                       │─────────────────
  │                         │                       │  status: in_progress
  │                         │                       │
  │                         │                       │  PATCH /api/jobs/[id]/mark-complete
  │                         │                       │─────────────────
  │  ← job_completed        │                       │  status: completed
  │                         │                       │
  │  PATCH /api/jobs/[id]/complete                  │
  │──────────────────────────────────────────────── │
  │  escrowStatus: released │  ← escrow_released    │
  │  ← loyalty points       │                       │
  │                         │                       │  POST /api/payouts
  │                         │  ← payout_requested   │─────────────────
  │                         │                       │  payout: pending
  │                         │  PATCH …/approve      │
  │                         │──────────────────────>│
  │                         │                       │  payout: completed
```

---

## Step 1 — Client Posts a Job

**Page:** `/client/post-job`  
**Endpoint:** `POST /api/jobs`

### Input Fields

| Field | Type | Rules |
|---|---|---|
| `title` | string | 5–200 chars |
| `category` | string | required |
| `description` | string | 20+ chars |
| `budget` | number | ≥ platform minimum (default ₱500) |
| `location` | string | required |
| `scheduleDate` | ISO datetime | optional, must be a future date |
| `specialInstructions` | string | optional, max 500 chars |
| `beforePhoto` | string[] | optional, up to 5 Cloudinary URLs |
| `invitedProviderId` | string | optional — direct invite, skips marketplace |
| `isRecurring` | boolean | optional — marks job as recurring |
| `recurringSchedule` | object | required when `isRecurring = true` (frequency, endDate) |

### Server Validations
- Client (or business manager/staff) role required
- KYC approved (if platform setting `platform.kycRequired = true`)
- Max **10 active jobs** per client at a time
- Max **10 jobs posted** per calendar day
- Platform must not be in maintenance mode
- Budget must meet `payments.minJobBudget` app setting

### Result
- Job created with `status: "pending_validation"`, `escrowStatus: "not_funded"`
- Risk score assigned (0–100) based on fraud signals
- Activity log: `job_created`
- Admin and staff notified of new job pending review

---

## Step 2 — Admin Verifies / Approves Job

**Page:** `/admin/jobs`  
**Endpoints:**
- Approve: `PATCH /api/admin/jobs/[id]/approve`
- Reject: `PATCH /api/admin/jobs/[id]/reject`

### Approval Logic

| Condition | Result |
|---|---|
| Job has `invitedProviderId` | `status → "assigned"`, provider notified directly |
| No invited provider | `status → "open"`, visible on marketplace |
| Rejected | `status → "rejected"`, client notified with reason |

### Notifications
- **Client** → `job_approved`: "Your job is live and accepting quotes."
- **Invited provider** (if direct invite) → `job_direct_invite`: "A client has posted a job directly to you."

---

## Step 3 — Provider Views Marketplace & Submits Quote

**Page:** `/provider/marketplace`  
**Endpoint:** `POST /api/quotes`

### Quote Fields

| Field | Type | Rules |
|---|---|---|
| `jobId` | string | required |
| `proposedAmount` | number | > 0 |
| `timeline` | string | required (e.g., "3 days") |
| `message` | string | 20–1,000 chars |
| `milestones` | array | optional `{ description, amount }` |
| `laborCost` / `materialsCost` | number | optional breakdown |
| `proposalDocUrl` | string URL | optional |
| `sitePhotos` | string[] | optional Cloudinary URLs |

### Validations
- Job must be `"open"`
- Provider must be approved (`approvalStatus: "approved"`)
- Provider cannot quote on their own job
- One quote per `(jobId, providerId)` — enforced by unique index
- Max quotes per job governed by `quotes.maxPerJob` platform setting
- Quote auto-expires after `quotes.expiryDays` platform setting (default 7 days)
- Submitting a quote costs **bid credits** (deducted from `BidCreditAccount`)

### Result
- Quote created with `status: "pending"`
- Bid credit deducted from provider account
- **Client notified** → `quote_received`: "A provider submitted a quote of ₱[amount]."

---

## Step 4 — Client Accepts Quote

**Page:** `/client/jobs/[id]`  
**Endpoint:** `PATCH /api/quotes/[id]/accept`

### Logic
1. Selected quote → `status: "accepted"`
2. All other quotes for this job → `status: "rejected"` (automatic)
3. Job → `status: "assigned"`, `providerId` set to winning provider

### Validations
- Client must own the job
- Quote must still be `"pending"` (not expired)
- Provider must be `approvalStatus: "approved"`

### Notifications
- **Accepted provider** → `quote_accepted`: "Your quote was accepted! Fund escrow to get started."
- **Rejected providers** → `quote_rejected`: notification for each

---

## Step 5 — Client Funds Escrow

**Page:** `/client/jobs/[id]`  
**Endpoints:**
- PayMongo path: `PATCH /api/jobs/[id]/fund`
- Wallet path: `PATCH /api/jobs/[id]/fund-wallet`

### Commission Calculation

| Category | Rate | Example (₱5,000 budget) |
|---|---|---|
| Standard | 15% (configurable) | Commission ₱750 → Provider gets ₱4,250 |
| High-value (HVAC, Roofing, etc.) | 20% (configurable) | Commission ₱1,000 → Provider gets ₱4,000 |

Rates are driven by `payments.baseCommissionRate` and `payments.highCommissionRate` app settings.  
An optional `overrideAmount` can be passed by admin to fund at a custom figure.

### Payment Paths

**PayMongo (live payment key present):**
1. `PATCH /api/jobs/[id]/fund` → POST to PayMongo → checkout URL returned
2. Client redirected to PayMongo-hosted payment page
3. Client pays (card / GCash / Maya / etc.)
4. PayMongo fires webhook `POST /api/webhooks/paymongo` (event: `payment.paid`)
5. Webhook marks escrow funded, creates ledger entries
6. On-page polling: client browser polls `GET /api/payments/[sessionId]` to confirm

**Wallet path (sufficient balance):**
1. `PATCH /api/jobs/[id]/fund-wallet` — balance checks and atomically debits wallet
2. Escrow funded immediately, no external redirect required

**Development (no PayMongo key):**
- Escrow funded immediately (simulation fallback)

### Result
- `job.escrowStatus → "funded"`
- `Payment` record created (`status: "paid"`)
- `Transaction` created (`status: "pending"`, stores `amount`, `commission`, `netAmount`)
- Ledger journal posted: `escrow_funded_gateway` (PayMongo) or `escrow_funded_wallet`
- **Provider notified** → `escrow_funded`: "The client has funded escrow. You may begin work."

---

## Step 6 — Provider Starts Job (Before Photos)

**Page:** `/provider/jobs`  
**Endpoint:** `PATCH /api/jobs/[id]/start`

### Required
- At least **1 before photo** uploaded to Cloudinary first via `POST /api/upload`
- `escrowStatus` must be `"funded"` — lifecycle guard blocks start otherwise

### Upload Rules

| Rule | Value |
|---|---|
| Accepted types | JPEG, PNG, WEBP, PDF |
| Max file size | 10 MB |
| Cloudinary folder | `jobs/before` |

### Result
- `job.status → "in_progress"`
- `job.beforePhoto` set to uploaded URLs
- Activity log: `job_started`
- Real-time SSE status push to client and provider

---

## Step 7 — Provider Completes Job (After Photos)

**Page:** `/provider/jobs/[id]`  
**Endpoint:** `PATCH /api/jobs/[id]/mark-complete`

### Required
- At least **1 after photo** uploaded via `POST /api/upload` (Cloudinary folder: `jobs/after`)

### Result
- `job.status → "completed"`  
- `job.afterPhoto` stored (max 3 photos)
- Provider profile stats recomputed: `completedJobCount`, `completionRate`, `avgResponseTimeHours`
- Activity log: `job_completed`
- Real-time SSE status push to both parties
- **Client notified** → `job_completed`: "The provider has marked the job as done. Please review and release payment."

---

## Step 8 — Client Reviews & Releases Escrow

**Page:** `/client/jobs/[id]`  
**Endpoint:** `PATCH /api/jobs/[id]/complete`

Client reviews before/after photos and releases the held funds to the provider.

### Validations
- Client must own the job
- `job.status` must be `"completed"` (provider must have marked done first)
- `job.escrowStatus` must be `"funded"`

### Result
- `job.escrowStatus → "released"`
- `Transaction.status → "completed"`
- Provider profile completion stats updated
- Ledger journal posted: `escrow_released`
  - Dr 2000 Escrow Liability (−commission) → Cr 4000 Platform Revenue
  - Dr 2000 Escrow Liability (−netAmount) → Cr 2100 Earnings Payable
- Client loyalty points awarded (based on loyalty program tier)
- **Provider notified** → `escrow_released`: "Payment released! Your earnings are available."

---

## Step 9 — Provider Requests Payout

**Page:** `/provider/payouts` or `/provider/earnings`  
**Endpoint:** `POST /api/payouts`

### Available Balance Formula

```
availableBalance = Σ completed transactions (netAmount)
                 − Σ payouts (status: pending | processing | completed)
```

### Request Fields

| Field | Required | Notes |
|---|---|---|
| `amount` | Yes | Must be ≤ available balance; ≥ `payments.minPayoutAmount` |
| `bankName` | Yes | e.g., "BDO", "BPI", "GCash", "Maya" |
| `accountNumber` | Yes | |
| `accountName` | Yes | Must match the bank account holder |

### Result
- `Payout` record created (`status: "pending"`)
- **Provider notified** → `payout_requested`: "Your payout of ₱[amount] is pending review."
- Admin and staff notified to process the transfer

---

## Step 10 — Admin Processes Payout

**Page:** `/admin/payouts`  
**Endpoint:** `PATCH /api/admin/payouts/[id]`

### Status Progression

```
pending → processing → completed
                  └──→ rejected
```

| Status | Meaning |
|---|---|
| `pending` | Submitted; awaiting admin action |
| `processing` | Admin initiated the bank transfer |
| `completed` | Transfer confirmed; funds sent |
| `rejected` | Transfer failed or cancelled with reason |

### Result (on `completed`)
- Ledger journal posted: `payout_sent`
  - Dr 2100 Earnings Payable → Cr 1000 Cash / Bank
- **Provider notified** → `payout_status_update`: "Your payout of ₱[amount] has been completed."

---

## Additional Flows

### A — Milestone Payments

A provider can propose splitting a job into milestones on their quote. Each milestone has a `description` and an `amount`.

**Release a milestone:**
- **Endpoint:** `PATCH /api/jobs/[id]/milestones/[mId]/release`
- Client triggers; each milestone must be `status: "pending"`
- Commission deducted per milestone release
- Ledger entry: `milestone_release`
- When all milestones are released, full escrow closes: `escrowStatus → "released"`

**Admin partial release:**
- **Endpoint:** `POST /api/jobs/[id]/partial-release`
- Admin can release a specified partial amount from funded escrow (e.g., for dispute resolutions)

---

### B — Provider Withdrawal from Assigned Job

A provider can withdraw from a job they were assigned to but have not yet started.

**Endpoint:** `PATCH /api/jobs/[id]/withdraw`

| Condition | Outcome |
|---|---|
| `status: "assigned"`, escrow not funded | Job reverts to `"open"` |
| `status: "assigned"`, escrow funded | Job reverts to `"open"`, escrow refunded to client wallet |
| Job is `"in_progress"` | Self-withdrawal blocked; admin intervention required |

**Result:**
- All existing quotes for the job are rejected
- Activity log: `provider_withdrew`
- Admin notified of withdrawal
- Job reappears in marketplace for new quotes

---

### C — Consultations

A client can request a private consultation with a provider before committing to a job post.

| Action | Endpoint |
|---|---|
| Request consultation | `POST /api/consultations` |
| Provider respond (accept/decline) | `PATCH /api/consultations/[id]/respond` |
| Send message in thread | `POST /api/consultations/[id]/messages` |
| Convert to a job quote | `POST /api/consultations/[id]/convert-to-job` |

**Flow:**
1. Client requests consultation → provider notified (`consultation_request`)
2. Provider accepts → client notified (`consultation_accepted`); messaging thread opens
3. Either party can message freely
4. Provider can convert the consultation into a formal quote on a job

---

### D — Recurring Jobs

Clients can mark a job as recurring (weekly, monthly, etc.) at posting time.

**Endpoints:**
- List/manage recurring schedules: `GET|POST|DELETE /api/recurring`
- Past providers for a recurring job: `GET /api/recurring/past-providers`
- Save payment method for auto-pay: `POST /api/recurring/saved-method`

**Flow:**
1. Client posts job with `isRecurring: true` and `recurringSchedule` fields
2. On completion of each job occurrence, the cron job auto-creates the next
3. If a saved payment method is set, escrow is auto-funded via wallet on renewal
4. Client can cancel the recurring schedule at any time; current job is unaffected

---

### E — Featured Listings (Provider Boost)

Providers can pay to boost their profile visibility in search results.

**Endpoints:**
- Purchase listing: `POST /api/provider/featured-listings` (or via provider dashboard)
- Admin route for manual override available

**Tiers:** Basic / Standard / Premium — each with different display duration and prominence.

**Payment Paths:**
- **Wallet:** Balance deducted immediately; `FeaturedListing` created and activated
- **PayMongo:** Checkout URL generated; webhook activates listing on `payment.paid`
- **Dev fallback:** Listing activated immediately if amount = 0

**Lifecycle:**
- `status: "active"` on purchase
- Cron job (`/api/cron/expire-listings`) sets `status: "expired"` when `expiresAt < now`
- Provider can cancel: `status: "cancelled"`; notification sent with `listingId` in data

---

### F — Disputes

Either party can open a dispute while a job is `"in_progress"`.

| Action | Endpoint | Actor |
|---|---|---|
| Open dispute | `POST /api/disputes` | Client or Provider |
| Admin marks investigating | `PATCH /api/admin/disputes/[id]` | Admin |
| Resolve: release to provider | `PATCH /api/admin/disputes/[id]` (action: `release`) | Admin |
| Resolve: refund to client | `PATCH /api/admin/disputes/[id]` (action: `refund`) | Admin |
| Admin escrow override | `POST /api/admin/jobs/[id]/escrow-override` | Admin |

**On dispute opened:**
- `job.status → "disputed"`
- Escrow remains locked
- Both parties and admin notified

**On resolution:**
- *Provider wins:* `escrowStatus → "released"`, job → `"completed"`; ledger: `escrow_released`
- *Client wins:* `escrowStatus → "refunded"`, job → `"refunded"`; ledger: `dispute_refund`

---

### G — Reviews

After escrow is released the client can leave a star rating.

**Endpoint:** `POST /api/reviews`

| Field | Notes |
|---|---|
| `jobId` | Must be a completed job owned by the client |
| `qualityRating` | 1–5 |
| `professionalismRating` | 1–5 |
| `punctualityRating` | 1–5 |
| `communicationRating` | 1–5 |
| `comment` | Optional free text |

- Provider's average rating recalculated after each review
- Provider notified of new review

---

### H — Wallet Top-Up (Client)

**Endpoint (PayMongo):** `POST /api/payments` with `type: "wallet_topup"`  
**Webhook:** `POST /api/webhooks/paymongo` (event: `payment.paid`) → credits wallet

Client wallet balance is available for:
- Funding escrow directly (avoids PayMongo redirect)
- Provider: funding Featured Listings

---

## State Machine Reference

### Job Status Transitions

```
pending_validation
  ├─→ open              (admin approves, no direct invite)
  ├─→ assigned          (admin approves with direct invite)
  └─→ rejected          (admin rejects)

open
  ├─→ assigned          (client accepts a quote)
  ├─→ rejected          (admin rejects after initial approval)
  ├─→ expired           (no quotes within validity window)
  └─→ cancelled         (client or admin cancels)

assigned
  ├─→ in_progress       (provider starts; escrow must be funded)
  ├─→ completed         (admin override in special cases)
  ├─→ disputed          (dispute opened)
  ├─→ open              (provider withdraws)
  └─→ cancelled         (client or admin cancels)

in_progress
  ├─→ completed         (provider marks done; escrow must be funded)
  └─→ disputed          (dispute opened)

completed
  └─→ (terminal — escrowStatus set to "released" by client action)

disputed
  ├─→ completed         (resolved in provider's favour — escrow released)
  └─→ refunded          (resolved in client's favour — escrow refunded)
```

### Escrow Status Transitions

```
not_funded
  └─→ funded            (job.status must be "assigned")

funded
  ├─→ released          (job.status must be "completed"; client confirms)
  └─→ refunded          (dispute resolved for client; or admin override)
```

### Payout Status Transitions

```
pending
  ├─→ processing        (admin initiates transfer)
  └─→ rejected          (admin rejects)

processing
  ├─→ completed         (transfer confirmed)
  └─→ rejected          (transfer failed)
```

---

## Key API Reference

### Core Job Lifecycle

| Step | Method | Endpoint | Actor |
|---|---|---|---|
| Post job | `POST` | `/api/jobs` | Client |
| Upload photo | `POST` | `/api/upload` | Any |
| Approve job | `PATCH` | `/api/admin/jobs/[id]/approve` | Admin/Staff |
| Reject job | `PATCH` | `/api/admin/jobs/[id]/reject` | Admin/Staff |
| Submit quote | `POST` | `/api/quotes` | Provider |
| Accept quote | `PATCH` | `/api/quotes/[id]/accept` | Client |
| Fund escrow (PayMongo) | `PATCH` | `/api/jobs/[id]/fund` | Client |
| Fund escrow (wallet) | `PATCH` | `/api/jobs/[id]/fund-wallet` | Client |
| Poll payment status | `GET` | `/api/payments/[sessionId]` | Client |
| PayMongo webhook | `POST` | `/api/webhooks/paymongo` | PayMongo |
| Start job | `PATCH` | `/api/jobs/[id]/start` | Provider |
| Mark complete | `PATCH` | `/api/jobs/[id]/mark-complete` | Provider |
| Release escrow | `PATCH` | `/api/jobs/[id]/complete` | Client |
| Request payout | `POST` | `/api/payouts` | Provider |
| Process payout | `PATCH` | `/api/admin/payouts/[id]` | Admin |

### Milestones & Partials

| Action | Method | Endpoint | Actor |
|---|---|---|---|
| Release a milestone | `PATCH` | `/api/jobs/[id]/milestones/[mId]/release` | Client |
| Partial admin release | `POST` | `/api/jobs/[id]/partial-release` | Admin |

### Provider Actions

| Action | Method | Endpoint | Actor |
|---|---|---|---|
| Withdraw from job | `PATCH` | `/api/jobs/[id]/withdraw` | Provider |
| Cancel job | `PATCH` | `/api/jobs/[id]/cancel` | Client/Admin |
| Admin escrow override | `POST` | `/api/admin/jobs/[id]/escrow-override` | Admin |

### Consultations

| Action | Method | Endpoint | Actor |
|---|---|---|---|
| Request consultation | `POST` | `/api/consultations` | Client |
| Respond to consultation | `PATCH` | `/api/consultations/[id]/respond` | Provider |
| Send message | `POST` | `/api/consultations/[id]/messages` | Either |
| Convert to job | `POST` | `/api/consultations/[id]/convert-to-job` | Provider |

### Recurring Jobs

| Action | Method | Endpoint | Actor |
|---|---|---|---|
| List schedules | `GET` | `/api/recurring` | Client |
| Create schedule | `POST` | `/api/recurring` | Client |
| Update/cancel | `DELETE` | `/api/recurring/[id]` | Client |
| Save payment method | `POST` | `/api/recurring/saved-method` | Client |

### Disputes & Reviews

| Action | Method | Endpoint | Actor |
|---|---|---|---|
| Open dispute | `POST` | `/api/disputes` | Client/Provider |
| Manage dispute | `PATCH` | `/api/admin/disputes/[id]` | Admin |
| Submit review | `POST` | `/api/reviews` | Client |

### Wallet & Payments

| Action | Method | Endpoint | Actor |
|---|---|---|---|
| Top-up wallet | `POST` | `/api/payments` (`type: wallet_topup`) | Client |
| Wallet withdrawal | `POST` | `/api/wallet/withdraw` | Client/Provider |
| Admin approve withdrawal | `PATCH` | `/api/admin/wallet/[id]` | Admin |
