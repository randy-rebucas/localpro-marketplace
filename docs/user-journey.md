# LocalPro Marketplace — User Journey

**Flow:** Client posts job → Admin verifies → Provider quotes → Client accepts & funds → Provider completes with photo proof → Client releases escrow → Provider requests payout

---

## Overview

```
Client                Admin               Provider
  │                     │                    │
  │  POST /api/jobs      │                    │
  │─────────────────────>│                    │
  │  status: pending_    │                    │
  │  validation          │  PATCH approve     │
  │                      │─────────────────── │
  │  ← job_approved      │  status: open      │
  │                      │                    │  POST /api/quotes
  │                      │                    │──────────────────
  │  ← quote_received    │                    │  status: pending
  │                      │                    │
  │  PATCH /api/quotes/[id]/accept            │
  │────────────────────────────────────────── │
  │  status: assigned    │  ← quote_accepted  │
  │                      │                    │
  │  POST /api/payments  │                    │
  │──────────────────────│                    │
  │  escrowStatus: funded│                    │
  │                      │                    │  PATCH /api/jobs/[id]/start
  │                      │                    │──────────────────
  │                      │                    │  status: in_progress
  │                      │                    │
  │                      │                    │  PATCH /api/jobs/[id]/mark-complete
  │                      │                    │──────────────────
  │  ← job_completed     │                    │  status: completed
  │                      │                    │
  │  PATCH /api/jobs/[id]/complete            │
  │────────────────────────────────────────── │
  │  escrowStatus:       │  ← escrow_released │
  │  released            │                    │
  │                      │                    │  POST /api/payouts
  │                      │  ← payout_req      │──────────────────
  │                      │                    │  payout: pending
  │                      │  PATCH approve     │
  │                      │─────────────────── │
  │                      │                    │  payout: completed
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
| `scheduleDate` | ISO datetime | must be a future date |
| `specialInstructions` | string | optional, max 500 chars |
| `beforePhoto` | string[] | optional, up to 5 Cloudinary URLs |
| `invitedProviderId` | string | optional — direct invite, skips marketplace |

### Server Validations
- Client role required
- KYC approved (if platform setting `kycRequired = true`)
- Max **10 active jobs** per client at a time
- Max **10 jobs posted** per calendar day
- Platform must not be in maintenance mode

### Result
- Job created with `status: "pending_validation"`, `escrowStatus: "not_funded"`
- Risk score assigned (0–100) based on fraud signals
- Activity log: `job_created`

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
| Rejected | `status → "rejected"`, client notified |

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
| `sitePhotos` | string[] | optional |

### Validations
- Job must be `"open"`
- Provider cannot quote on their own job
- One quote per `(jobId, providerId)` — enforced by unique index
- Max **5 quotes per job** (platform setting)
- Quote auto-expires after **7 days** (platform setting)

### Result
- Quote created with `status: "pending"`
- **Client notified** → `quote_received`: "A provider submitted a quote of ₱[amount]."

---

## Step 4 — Client Accepts Quote

**Page:** `/client/jobs/[id]`
**Endpoint:** `PATCH /api/quotes/[id]/accept`

### Logic
1. Selected quote → `status: "accepted"`
2. All other quotes for this job → `status: "rejected"` (auto)
3. Job → `status: "assigned"`, `providerId` set to winning provider

### Validations
- Client must own the job
- Quote must still be `"pending"`
- Provider must be approved (`approvalStatus: "approved"`)

### Notifications
- **Provider** → `quote_accepted`: "Your quote was accepted! Fund escrow to get started."

---

## Step 5 — Client Funds Escrow

**Page:** `/client/jobs/[id]` or `/client/escrow`
**Endpoint:** `POST /api/payments`

### Commission Calculation

| Category | Rate | Example (₱5,000 budget) |
|---|---|---|
| Standard | 15% | Commission ₱750 → Provider gets ₱4,250 |
| High-value (HVAC, Roofing, etc.) | 20% | Commission ₱1,000 → Provider gets ₱4,000 |

### Payment Paths

**Production (PayMongo key configured):**
1. Checkout session created → client redirected to PayMongo-hosted payment page
2. Client completes payment (card / GCash / etc.)
3. PayMongo fires webhook → `POST /api/webhooks/paymongo`
4. On success redirect: `GET /api/payments/[sessionId]` polls and confirms

**Development (no PayMongo key):**
- Escrow funded immediately (simulation)

### Result
- `job.escrowStatus → "funded"`
- Payment record created (`status: "paid"`)
- Transaction created (`status: "pending"`, stores `amount`, `commission`, `netAmount`)
- Ledger journal posted: `escrow_funded_gateway`
- **Provider notified** → `escrow_funded`: "The client has funded escrow. You may begin work."

---

## Step 6 — Provider Starts Job (Before Photos)

**Page:** `/provider/jobs`
**Endpoint:** `PATCH /api/jobs/[id]/start`

### Required
- At least **1 before photo** uploaded to Cloudinary first via `POST /api/upload`

### Upload Rules

| Rule | Value |
|---|---|
| Accepted types | JPEG, PNG, WEBP, PDF |
| Max file size | 10 MB |
| Folder | `jobs/before` |

### Result
- `job.status → "in_progress"`
- `job.beforePhoto` set to uploaded URLs
- Escrow must be funded — enforced by lifecycle rules

---

## Step 7 — Provider Completes Job (After Photos)

**Page:** `/provider/jobs/[id]`
**Endpoint:** `PATCH /api/jobs/[id]/mark-complete`

### Required
- At least **1 after photo** uploaded via `POST /api/upload` (folder: `jobs/after`)

### Result
- `job.status → "completed"`
- `job.afterPhoto` set to uploaded URLs
- Provider profile stats recomputed (completion rate, job count)
- **Client notified** → `job_completed`: "The provider has marked the job as done. Please review and release payment."

---

## Step 8 — Client Reviews & Releases Escrow

**Page:** `/client/jobs/[id]`
**Endpoint:** `PATCH /api/jobs/[id]/complete`

Client reviews the before/after photos and releases the held funds.

### Validations
- Client must own the job
- Job must be `status: "completed"` (provider marked it done first)
- `escrowStatus` must be `"funded"`

### Result
- `job.escrowStatus → "released"`
- Transaction `status → "completed"`
- Provider profile completion stats updated
- Ledger journal posted: `escrow_released`
- Client loyalty points awarded
- **Provider notified** → `escrow_released`: "Payment released! Your earnings are available."

---

## Step 9 — Provider Requests Payout

**Page:** `/provider/payouts` or `/provider/earnings`
**Endpoint:** `POST /api/payouts`

### Available Balance Formula

```
availableBalance = Σ completed transactions (netAmount) − Σ payouts (pending + processing + completed)
```

### Request Fields

| Field | Required | Notes |
|---|---|---|
| `amount` | Yes | Must be ≤ available balance |
| `bankName` | Yes | e.g., "BDO", "BPI", "GCash" |
| `accountNumber` | Yes | |
| `accountName` | Yes | Must match bank account |

### Result
- Payout record created (`status: "pending"`)
- **Provider notified** → `payout_requested`: "Your payout of ₱[amount] is pending review."
- Admin notified to process the transfer

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
| `pending` | Submitted, awaiting admin action |
| `processing` | Admin initiated bank transfer |
| `completed` | Transfer confirmed |
| `rejected` | Transfer failed or cancelled |

### Result (on `completed`)
- Ledger journal posted: `payout_sent`
- **Provider notified** → `payout_status_update`: "Your payout of ₱[amount] has been completed."

---

## State Machine Reference

### Job Status Transitions

```
pending_validation
  ├─→ open              (admin approves, no direct invite)
  ├─→ assigned          (admin approves, direct invite)
  └─→ rejected          (admin rejects)

open
  ├─→ assigned          (client accepts a quote)
  ├─→ cancelled         (client cancels)
  └─→ expired           (no quotes within validity window)

assigned
  ├─→ in_progress       (provider starts, escrow funded)
  ├─→ open              (provider withdraws)
  └─→ cancelled

in_progress
  ├─→ completed         (provider marks complete)
  └─→ disputed

completed
  └─→ (terminal — escrow released by client)

disputed
  ├─→ completed         (resolved in provider's favour)
  └─→ refunded          (resolved in client's favour)
```

### Escrow Status Transitions

```
not_funded → funded     (requires job.status = "assigned")
funded     → released   (requires job.status = "completed")
funded     → refunded   (dispute resolved for client)
```

---

## Key API Reference

| Step | Method | Endpoint | Actor |
|---|---|---|---|
| Post job | `POST` | `/api/jobs` | Client |
| Upload photo | `POST` | `/api/upload` | Any |
| Approve job | `PATCH` | `/api/admin/jobs/[id]/approve` | Admin |
| Reject job | `PATCH` | `/api/admin/jobs/[id]/reject` | Admin |
| Submit quote | `POST` | `/api/quotes` | Provider |
| Accept quote | `PATCH` | `/api/quotes/[id]/accept` | Client |
| Fund escrow | `POST` | `/api/payments` | Client |
| Poll payment | `GET` | `/api/payments/[sessionId]` | Client |
| PayMongo webhook | `POST` | `/api/webhooks/paymongo` | PayMongo |
| Start job | `PATCH` | `/api/jobs/[id]/start` | Provider |
| Mark complete | `PATCH` | `/api/jobs/[id]/mark-complete` | Provider |
| Release escrow | `PATCH` | `/api/jobs/[id]/complete` | Client |
| Request payout | `POST` | `/api/payouts` | Provider |
| Process payout | `PATCH` | `/api/admin/payouts/[id]` | Admin |
