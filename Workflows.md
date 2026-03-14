# LocalPro Marketplace — System Workflow Documentation

**Version:** 1.1  
**Last Updated:** March 14, 2026  
**Stack:** Next.js 14 · MongoDB (Mongoose) · PayMongo · Cloudinary · SSE Push Notifications

---

This document describes all system workflows as implemented in the current production codebase.  
Each section covers actors, system behavior, status states, and production-grade notes grounded in actual service and model code.

---

## Workflow 1 — Provider Onboarding

**Scenario:** A new service provider joins LocalPro

---

### Actors
| Actor | Role |
|---|---|
| Provider | Self-registers and completes onboarding wizard |
| System | Auto-assigns status, sends emails, notifies admins |
| Admin / Staff | Reviews KYC documents and approves or rejects account |

---

### Step 1 — Account Registration

Provider submits:
- Name, email, password
- Role selection: *Service Provider*
- Password complexity enforced: uppercase + lowercase + number + min 8 chars

System actions (automatic):
- Sets `approvalStatus: pending_approval` on the user record
- Sends email verification link (24-hour expiry token)
- Notifies **all admins and staff** of the new pending provider
- Blocks provider dashboard until `approvalStatus` is `approved`

---

### Step 2 — Onboarding Wizard (3 steps)

After registration, provider completes the in-app wizard:

**Step 1 — Skills**
- Provider enters free-form service skills (e.g., "Plumbing", "AC Repair", "Electrical")
- Minimum 1 skill required to advance

**Step 2 — Service Area**
- Provider enters a label (e.g., "Makati City") and full street address
- GPS coordinates (lat/lng) are optional at this stage

**Step 3 — KYC Documents**
- Provider uploads identity and certification documents

| Document Type | Field Value |
|---|---|
| Government-issued ID (UMID, Passport, Driver's License) | `government_id` |
| TESDA / NC Certificate | `tesda_certificate` |
| Business Permit / DTI Registration | `business_permit` |
| Selfie with ID | `selfie_with_id` |
| Other | `other` |

System actions:
- Stores documents via **Cloudinary** (CDN-backed, secure)
- Sets `kycStatus: pending` once documents are submitted
- Wizard is **skipped** if skills and service area already exist on the profile

---

### Step 3 — Admin Review

Admin / Staff actions (via `/admin/kyc` and `/admin/users`):
- Reviews KYC documents with direct document viewer links
- Approves or rejects KYC (`kycStatus`)
- Approves or rejects provider account (`approvalStatus`) — these are **independent decisions**
- Awards **LocalPro Certified** badge (`isLocalProCertified`) optionally
- Can **re-approve** previously rejected providers without requiring re-registration
- Can flag for fraud / risk investigation

Provider notifications:
- Receives email on `approved` → dashboard unlocks, profile visible in marketplace
- Receives email on `rejected` → reason shown; directed to contact support

---

### Status Reference

| Status | Field | Description |
|---|---|---|
| `pending_approval` | `approvalStatus` | New registration awaiting admin review |
| `approved` | `approvalStatus` | Active; visible in marketplace |
| `rejected` | `approvalStatus` | Denied; re-approvable by admin |
| `isSuspended: true` | `isSuspended` | Temporarily restricted (separate from approvalStatus) |
| `pending` | `kycStatus` | Documents submitted, under review |
| `approved` | `kycStatus` | Identity / documents verified |
| `rejected` | `kycStatus` | Documents rejected; reason recorded |

---

### Admin Tools
- `/admin/users` — Provider list with approve / reject / suspend / re-approve actions
- `/admin/kyc` — Document review panel with approve / reject + reason input
- `/admin/users/[id]` — Full account audit view
- Risk score panel — automated fraud signals surfaced per provider

---

> **Production Notes**
> - Integrate automated KYC SaaS (Sumsub, Veriff, Smile Identity) for face-match and liveness detection at scale
> - Add self-service document re-submission so rejected providers don't need support intervention
> - Write every `approvalStatus` and `kycStatus` change to the `ActivityLog` with admin user ID and reason
> - Add geo-validation: confirm service area coordinates fall within supported Philippine LGUs

---

## Workflow 2 — Client Onboarding

**Scenario:** A business client signs up on LocalPro

---

### Actors
| Actor | Role |
|---|---|
| Client | Self-registers; sets up account and optional business organization |
| System | Auto-approves account; handles referral loyalty; enables job posting |
| Admin | Reviews flagged accounts; manages enterprise orgs |

---

### Step 1 — Account Registration

Client submits:
- Name, email, password (same complexity rules as providers)
- Role selection: *Client*
- Optional referral code (links to referrer loyalty account)

System actions (automatic):
- Sets `approvalStatus: approved` immediately — clients are **auto-approved**
- Sends email verification link (24-hour expiry)
- Creates a **LoyaltyAccount** for the client automatically
- If a valid referral code is provided, links `referredBy` on the loyalty record

---

### Step 2 — Account Configuration

Individual client:
- Adds saved addresses (label, full address, optional GPS coordinates)
- Adds payment method (via PayMongo-hosted checkout or saved card)
- Wallet balance is initialized at ₱0 (credits accumulate from refunds)

Business client (via Business Organization):
- Creates or joins a `BusinessOrganization`
- Selects a subscription plan: `starter | growth | enterprise`
- Plan is activated via PayMongo checkout; expiry is set to 30 days from activation
- Can configure:
  - Multiple branch locations
  - Role-based access (managers per branch)
  - Monthly service budgets

---

### Step 3 — Enabling Job Posting

- Client can post jobs immediately after email verification
- Business clients may require plan activation before accessing enterprise features
- A daily job posting limit of **10 jobs per day** is enforced per client account

---

### Status Reference

| Status | Field | Description |
|---|---|---|
| `approved` | `approvalStatus` | Auto-set on registration; job posting enabled |
| `active` | `planStatus` (org) | Business plan active |
| `expired` | `planStatus` (org) | Plan expired; enterprise features locked |
| `isSuspended: true` | `isSuspended` | Account temporarily restricted by admin |

---

> **Production Notes**
> - Add phone number OTP verification as an additional trust signal for first-time job posters
> - Track profile completeness (payment method, verified email) and gate job posting behind email verification
> - Implement business plan renewal reminders (7-day, 1-day before expiry)
> - Consider per-branch monthly budget alerts to finance managers via notification

---

## Workflow 3 — Job Posting

**Scenario:** A client needs a service and submits a job request

---

### Actors
| Actor | Role |
|---|---|
| Client | Creates and submits the job request |
| System | Validates job, runs fraud/risk assessment, notifies admins and providers |
| Admin / Staff | Reviews flagged or suspicious jobs before they go live |

---

### Step 1 — Client Submits Job

Client provides:
- Title, service category, description
- Budget amount (in PHP)
- Location (text) + optional GPS coordinates
- Scheduled date
- Optional: before-state photos, special instructions
- Optional: direct invite to a specific provider (`invitedProviderId`)

System enforces:
- **Daily limit:** max 10 job postings per client per day

---

### Step 2 — Fraud & Risk Assessment (Automatic)

For every job submission, the system runs a risk assessment before saving:

**Inputs evaluated:**
- Jobs posted in the last 24 hours and 7 days
- Number of previously rejected jobs by this client
- Number of previously flagged jobs
- Email verification status and KYC status
- Account age in days

**Content analysis:**
- Off-platform payment phrases (e.g., "pay outside", "bypass escrow", "send to GCash")
- Get-rich / scam phrases (e.g., "earn big", "passive income", "guaranteed income")
- Pressure phrases (e.g., "urgent urgent", "limited slots", "first come first")
- Phishing / data-harvest phrases (e.g., "send your ID", "send your bank")

**Outcomes:**
- `riskScore` stored on the job record
- `fraudFlags[]` array populated with detected signal codes
- Client's `flaggedJobCount` incremented if fraud signals are detected
- High-risk jobs surfaced to admins via `⚠️ Fraud flags detected` notification

---

### Step 3 — Job Saved & Notifications Sent

Job created with status `pending_validation`.

System fires:
- Push notification to all admins: *"New job pending review"*
- If fraud flags present: admin notification includes `⚠️ Fraud flags detected`
- Activity log entry: `job_created`
- If direct invite: `invitedProviderId` stored; provider is notified separately

---

### Job Status After This Workflow

```
pending_validation → open (after admin validates)
pending_validation → rejected (if admin rejects the job)
```

---

### Status Reference

| Status | Description |
|---|---|
| `pending_validation` | Job submitted; awaiting admin review |
| `open` | Validated; visible to providers for quoting |
| `rejected` | Admin rejected the job request |

---

> **Production Notes**
> - Add a re-submission flow for rejected jobs so clients can correct and repost
> - Track admin validation SLA; flag jobs that have been in `pending_validation` > 2 hours
> - Consider auto-approving low-risk jobs (riskScore = 0, verified client, account > 30 days) to reduce admin load
> - Store GPS coordinates as a GeoJSON `Point` for future proximity-based provider matching

---

## Workflow 4 — Provider Job Discovery

**Scenario:** Providers discover and evaluate job listings

---

### Actors
| Actor | Role |
|---|---|
| Provider | Browses open jobs; filters by category; optionally uses AI ranking |
| System | Filters open jobs by provider eligibility; ranks via AI if requested |

---

### How Providers See Jobs

- Providers see all jobs with `status: open` (not their own client jobs)
- Jobs can be filtered by:
  - Service category
  - Status (defaults to `open`)
  - Pagination (page + limit, max 50 per page)

---

### AI-Powered Job Ranking (Optional)

When the provider enables AI ranking (`aiRank: true`):
- System loads the provider's profile (skills, service areas, experience)
- Passes all open jobs + provider profile to **OpenAI**
- Returns jobs ranked by relevance to the provider's skill set and location
- Response is marked `ranked: true` so the UI can surface the badge

---

### Direct Job Invitations

- Clients can directly invite a specific provider when posting a job
- The invited provider receives a push notification with the job details
- The job is still accessible to other providers unless the client selects a quote

---

### Provider Actions on a Job

| Action | Description |
|---|---|
| Submit quote | Opens the quotation workflow (Workflow 5) |
| Ask a question | Sends a message to the client via the job thread |
| Ignore | Provider takes no action; job remains visible |

---

### System Restrictions

- A provider cannot quote on their own jobs (if they ever had a client account)
- A provider cannot submit more than one pending quote on the same job
- Only providers with `approvalStatus: approved` see the open marketplace

---

> **Production Notes**
> - Cache the open jobs list (e.g., Redis with 30-second TTL) to reduce DB load during peak hours
> - Add geospatial filtering: show jobs within X km of the provider's service area using MongoDB `$near`
> - Surface AI-ranked jobs as a separate "Recommended" tab to preserve organic listings
> - Track which jobs a provider viewed to improve future AI ranking signals

---

## Workflow 5 — Quotation and Proposal

**Scenario:** A provider submits a bid; the client reviews and selects a provider

---

### Actors
| Actor | Role |
|---|---|
| Provider | Submits a quote with price, timeline, and message |
| Client | Reviews all quotes and accepts one |
| System | Validates eligibility, notifies parties, transitions job status |

---

### Provider Submits a Quote

Provider provides:
- `proposedAmount` (in PHP)
- `timeline` (free text, e.g., "2 days")
- `message` (cover note / proposal details)

System validates:
- Job must be `status: open` — only open jobs accept quotes
- Provider cannot quote on their own job
- Provider cannot submit more than one pending quote per job
- Provider must have `approvalStatus: approved` at time of quote acceptance

System actions:
- Quote saved with `status: pending`
- Activity log entry: `quote_submitted`
- Push notification to client: *"New quote received — ₱{amount} for '{job title}'"*
- SSE signal sent to client's job detail page to reload quotes in real time

---

### Client Reviews and Accepts a Quote

Client dashboard shows per quote:
- Provider name, rating, completed job count
- Proposed amount, timeline, message

Client actions:
- **Accept quote** → triggers provider selection
- **Request revision** → sends message to provider (via chat)
- **Reject proposal** → quote marked `rejected`; provider notified

---

### Quote Acceptance — System Actions

1. Quote status set to `accepted`
2. All other pending quotes on the same job set to `rejected`
3. Job status transitions: `open → assigned`
4. `job.providerId` is set to the selected provider
5. Activity log entry: `quote_accepted`
6. Push notification to provider: *"Your quote was accepted"*
7. Push notification to client: confirmation of provider selection
8. SSE real-time status update sent to both parties

**Eligibility gate:** If the selected provider's `approvalStatus` is not `approved` at the time of acceptance, the system blocks the action with an error.

---

### Status Reference

| Status | Field | Description |
|---|---|---|
| `pending` | `quote.status` | Quote awaiting client decision |
| `accepted` | `quote.status` | Client accepted this quote |
| `rejected` | `quote.status` | Client rejected or a competing quote was accepted |
| `open` | `job.status` | Job accepting quotes |
| `assigned` | `job.status` | Provider selected; awaiting escrow |

---

> **Production Notes**
> - Enforce a maximum number of quotes per job (e.g., 5–10) to prevent spam quoting and improve client UX
> - Add quote expiry: auto-reject quotes if not reviewed within 72 hours
> - Allow providers to include milestone breakdowns in their quote before escrow setup
> - Send the client a nudge notification if a job has been `open` for > 48 hours with at least one quote unreviewed

---

## Workflow 6 — Escrow Payment

**Scenario:** Client funds escrow after accepting a provider

---

### Actors
| Actor | Role |
|---|---|
| Client | Initiates escrow payment (card, e-wallet, or wallet balance) |
| PayMongo | Processes the payment and webhooks the result |
| System | Locks funds, activates the job, notifies provider |
| Admin | Monitors transactions; can flag suspicious payments |

---

### Precondition

Escrow can only be funded when:
- Job `status` is `assigned` (provider has been selected)
- Job `escrowStatus` is `not_funded`

---

### Payment Method A — PayMongo Checkout

The client may optionally pass a JSON body `{ amount: number }` to override the job budget when funding escrow (e.g. for partial funding or admin-adjusted amounts). If omitted, the full job `budget` is used.

1. System creates a **PayMongo Checkout Session** with:
   - Amount in PHP (uses `overrideAmount` if provided, otherwise `job.budget`), job title as line item
   - `successUrl` → `/client/escrow?jobId=...&payment=success`
   - `cancelUrl` → `/client/jobs/[id]?payment=cancelled`
   - Metadata: `jobId`, `clientId`, `providerId`
2. Client is redirected to the PayMongo-hosted checkout page
3. Client pays via card, GCash, Maya, or bank transfer
4. PayMongo fires a `checkout_session.payment.paid` webhook
5. System confirms funding:
   - `job.escrowStatus` → `funded`
   - `Transaction` record created with `amount`, `commission`, `netAmount`, `status: pending`
   - Activity log entry: `escrow_funded`
   - If card was used, saves card token for future recurring auto-pay
6. Push notification to provider: *"Escrow funded. You may begin work."*
7. Push notification to client: payment confirmation
8. SSE real-time status update to both parties

---

### Payment Method B — Platform Wallet

1. Client initiates escrow from their **platform wallet** balance
2. System checks: `walletBalance − pendingWithdrawals ≥ jobBudget`
3. If sufficient: wallet debited, `escrowStatus` → `funded`, notifications sent
4. If insufficient: error returned — `"Requested amount exceeds available balance"`

---

### Commission Structure

A platform commission is calculated on every escrow transaction:
- `commission` = calculated via `calculateCommission(amount, commissionRate)`
- Commission rate is determined by service `category`
- `netAmount` = `amount − commission` (what the provider ultimately receives)

---

### Status Reference

| Status | Field | Description |
|---|---|---|
| `not_funded` | `escrowStatus` | Awaiting client payment |
| `funded` | `escrowStatus` | Payment received; funds locked |
| `released` | `escrowStatus` | Payment released to provider |
| `refunded` | `escrowStatus` | Funds returned to client |
| `pending` | `transaction.status` | Transaction awaiting job completion |
| `completed` | `transaction.status` | Transaction finalized |

---

> **Production Notes**
> - Implement idempotency keys on PayMongo webhook processing to prevent double-funding from duplicate webhook deliveries
> - Store PayMongo `paymentIntentId` and `checkoutSessionId` on the `Payment` record for reconciliation
> - Add automated daily reconciliation job: compare `Transaction` records against PayMongo ledger
> - Consider escrow timeout: if client does not fund within 48 hours of accepting a quote, auto-cancel the assignment and re-open the job

---

## Workflow 7 — Job Execution

**Scenario:** Provider starts work and updates progress

---

### Actors
| Actor | Role |
|---|---|
| Provider | Checks in, starts job, updates milestones, uploads progress photos |
| Client | Monitors progress, views milestone updates and messages |
| System | Validates transitions, logs events, sends real-time updates |

---

### Precondition

Job must have `escrowStatus: funded` before work can begin.  
Starting a job without funded escrow is **blocked** by the lifecycle guard.

---

### Step 1 — Provider Starts the Job

Provider supplies:
- `beforePhoto[]` — photos documenting the starting state of the work site

System actions:
- Validates transition: `assigned → in_progress`
- Saves `beforePhoto` array on job record (replaces any client-uploaded pre-photos)
- Sets `job.status = in_progress`
- Activity log entry: `job_started`
- SSE real-time status update to client and provider

---

### Step 2 — Milestone Management (Client-Controlled)

The **client** defines milestones on the job while escrow is funded:
- Each milestone has: `title`, `amount`, `description`
- Sum of all milestone amounts must not exceed job `budget`
- Milestones can be added or removed while job is `assigned` or `in_progress`

Milestone release:
- Client releases individual milestones after reviewing the corresponding work
- System checks: `escrowStatus: funded` and `job.status: completed`
- On release: `milestone.status → released`, `milestone.releasedAt` set
- If all milestones are released → `onReleased()` callback fires (triggers final payment flow)
- **Partial release** also available: client can release a custom amount less than full budget

---

### Step 3 — Progress Updates

Provider actions during execution:
- Adds milestone completion notes
- Uploads progress photos
- Communicates with client via job message thread

Client can monitor in real time:
- Progress timeline
- Milestone status updates
- Communication thread

System logging:
- All status transitions timestamped
- Activity log entries for each key event
- SSE push updates on all status changes

---

### Job State Machine (Relevant Transitions)

```
assigned  →  in_progress  (provider starts; escrow must be funded)
in_progress  →  completed  (provider marks done; escrow must be funded)
in_progress  →  disputed   (either party opens a dispute)
```

---

> **Production Notes**
> - Add GPS check-in validation: record provider's location at job-start and compare to job address
> - Implement a job-start timeout: if provider doesn't start within 24 hours of escrow funding, auto-notify client
> - Add photo compression on upload (Cloudinary transform) to reduce storage costs
> - Notify client if no milestone or message activity is detected for > 48 hours during `in_progress`

---

## Workflow 8 — Client Approval and Milestone Release

**Scenario:** Provider marks work complete; client reviews and releases payment

---

### Actors
| Actor | Role |
|---|---|
| Provider | Marks job as completed; uploads after-state photos |
| Client | Reviews work; releases milestone payments or raises issue |
| System | Validates transition, releases escrow funds, updates ledger |

---

### Step 1 — Provider Marks Job Complete

Provider supplies:
- `afterPhoto[]` — up to 3 photos documenting the completed state (merged with any existing)

System actions:
- Validates transition: `in_progress → completed`
- Saves `afterPhoto` on job record
- Sets `job.status = completed`
- Activity log entry: `job_completed`
- Push notification to client: *"The provider has marked the job as done. Please review and release payment."*
- SSE real-time update to both parties

---

### Step 2 — Client Reviews Completed Work

Client options:

| Action | Outcome |
|---|---|
| **Approve and release full payment** | Escrow released to provider; job closed |
| **Release milestone** | Partial payment released for a specific milestone |
| **Partial release** | Client manually enters a custom release amount (< full budget) |
| **Request revision** | Sends a message; job can remain in `completed` state |
| **Open dispute** | Triggers Workflow 12; escrow held until resolution |

---

### Step 3 — Escrow Release (Full)

When client confirms completion:
- `job.escrowStatus` → `released`
- `job.status` → `closed`
- `Transaction.status` → `completed`
- Commission deducted; `netAmount` credited to provider's payout balance
- Wallet credit (if refund scenario): provider wallet receives `netAmount`
- Activity log entry: `payment_released`
- Push notification to provider: *"Payment has been released"*

---

### Step 4 — Partial Release

When client releases a partial amount:
- Custom `amount` validated against total `budget`
- Commission calculated on the partial amount (15%)
- Provider receives: `amount − commission`
- Job and escrow status updated to reflect partial resolution

---

### Ledger Entries (Internal)

| Event | Entry |
|---|---|
| Escrow funded | Client wallet debited OR PayMongo payment recorded |
| Milestone released | Provider payout balance credited |
| Full release | Transaction status → `completed`; escrow → `released` |
| Partial release | Transaction archived with partial amount; escrow → `released` |

---

> **Production Notes**
> - Implement auto-release: if client does not respond within 5 business days of job marked complete, auto-release escrow to provider (industry-standard protection against client ghosting)
> - Send progressive reminder notifications: 24h, 48h, and 72h after provider marks complete
> - Log every partial release decision with client-provided reason for dispute reference

---

## Workflow 9 — Job Completion

**Scenario:** Job is fully completed and closed

---

### Actors
| Actor | Role |
|---|---|
| Provider | Marks job complete; submits after-state photos |
| Client | Reviews and confirms; triggers final payment release |
| System | Closes job, records history, updates provider metrics |

---

### Completion Sequence

```
in_progress
   ↓  provider marks complete + uploads afterPhoto
completed  (client notified)
   ↓  client confirms / releases payment
closed  (escrow released; transaction finalized)
```

---

### System Actions on Final Close

When escrow is released and job closes:

**Provider profile metrics updated:**
- `completedJobCount` incremented by 1
- `completionRate` recalculated as `completed / total assigned`
- `avgResponseTimeHours` updated

**Transaction finalized:**
- `Transaction.status` → `completed`
- `Transaction.netAmount` confirmed (amount minus commission)

**Job record:**
- `job.status` → `closed` (or `completed` per the transition map)
- `job.escrowStatus` → `released`
- `job.afterPhoto` stored for audit

**Activity log:**
- `job_completed`, `payment_released` entries written

---

### Post-Completion State

Once a job reaches `completed` or `closed`:
- No further status transitions are permitted by the lifecycle guard
- The job becomes part of the client's and provider's job history
- The review workflow (Workflow 10) becomes available

---

### Edge Cases Handled

| Scenario | System Behavior |
|---|---|
| Client disappears after job starts | Auto-release after configurable timeout (production note) |
| Provider marks complete prematurely | Client opens revision request or dispute |
| Scope changes mid-project | Client and provider negotiate via job message thread; budget change requires admin support |
| Job extensions | Admin or both parties can reopen / extend — requires admin action currently |

---

> **Production Notes**
> - Add a formal "job extension" feature: allow both parties to agree to extend deadlines without admin involvement
> - Implement post-job summary email to both client and provider with: job title, amount paid, commission, provider payout, completion date
> - Archive closed jobs after 12 months to a cold collection (MongoDB TTL or archival service) to keep the active collection performant

---

## Workflow 10 — Rating and Reputation

**Scenario:** Job is closed; both parties leave reviews

---

### Actors
| Actor | Role |
|---|---|
| Client | Rates the provider across multiple dimensions |
| Provider | Can also rate the client |
| System | Aggregates ratings; updates provider marketplace scores |

---

### Client Rates Provider

Available after job reaches `completed` / `closed` status.

Client rates on dimensions:
- **Quality** — standard of work delivered
- **Professionalism** — conduct and communication
- **Timeliness** — on-schedule delivery
- **Communication** — responsiveness and clarity

Each dimension scored 1–5 stars. An average is computed and stored.

---

### Provider Rates Client

Providers may rate clients on:
- Communication responsiveness
- Clarity of instructions
- Fairness and professionalism

---

### System — Rating Aggregation

After each new review is submitted:

**Provider profile updates:**
- `avgRating` recalculated as a rolling average across all reviews
- `completedJobCount` already updated at job close (Workflow 9)

**Marketplace impact:**
- `avgRating` is surfaced on provider cards in search results
- High-rated providers rank higher in non-AI listing views
- Providers with `avgRating < 3.0` over a threshold of jobs may be flagged for review

---

### Review Model Fields

| Field | Description |
|---|---|
| `jobId` | Reference to the completed job |
| `reviewerId` | User who submitted the review |
| `revieweeId` | User being reviewed |
| `rating` | Numeric score (1–5) |
| `comment` | Optional written review |
| `createdAt` | Auto-timestamped |

---

### Dispute Gate

- Reviews cannot be submitted while a job is in `disputed` status
- Review window opens only after dispute is resolved and job moves to `completed` or `closed`

---

> **Production Notes**
> - Add review verification gate: only allow reviews from users who participated in the specific job (already enforced via `jobId` + `reviewerId` check — confirm this is implemented in the Review model)
> - Implement review response: allow providers to publicly reply to a client review (builds trust)
> - Detect review manipulation: flag accounts that receive an unusual spike in 5-star reviews shortly after account creation
> - Send a review reminder push notification 24 hours after job close if no review has been submitted

---

## Workflow 11 — Provider Payout

**Scenario:** Provider requests withdrawal of earned balance

---

### Actors
| Actor | Role |
|---|---|
| Provider | Views available balance; submits payout request |
| Admin | Reviews and approves or rejects the payout |
| System | Calculates available balance; logs requests; sends notifications |

---

### Balance Calculation

Provider's available payout balance is computed as:

```
availableBalance = Σ(netAmount of completed transactions) − Σ(all paid-out amounts)
```

- `completedTransactions` → filtered by `payeeId = providerId` and `status: completed`
- `paidOut` → sum of all `Payout` records with `status: paid`
- Pending withdrawals are excluded from available balance to prevent over-withdrawal

---

### Provider Requests a Payout

Provider supplies:
- `amount` (must be ≤ available balance)
- `bankName`
- `accountNumber`
- `accountName`

Supported withdrawal channels:
- Philippine bank accounts (BPI, BDO, UnionBank, etc.)
- GCash (enter GCash-linked mobile as account number)
- Maya / PayMaya

System validations:
- Amount must be > 0
- Amount must not exceed available balance
- All bank fields are required

System actions:
- `Payout` record created with `status: pending`
- Activity log entry: `payout_requested`
- Push notification to provider: *"Payout of ₱{amount} submitted and pending review"*

---

### Admin Reviews and Processes Payout

Admin actions (via `/admin/payouts`):
- Views all pending payout requests with provider details
- **Approve** — marks payout as `processing` → manually transfers funds → marks `paid`
- **Reject** — marks payout as `rejected`; provider notified with reason

---

### Payout Status Reference

| Status | Description |
|---|---|
| `pending` | Request submitted; awaiting admin review |
| `processing` | Admin approved; transfer in progress |
| `paid` | Funds disbursed to provider |
| `rejected` | Admin rejected the request |

---

> **Production Notes**
> - Integrate direct bank transfer APIs (e.g., PayMongo Disbursement, Xendit, or GCash Business API) to automate payout processing and eliminate manual admin steps
> - Set minimum payout threshold (e.g., ₱500) to reduce transfer fee overhead
> - Implement payout scheduling: batch payouts on set days (e.g., every Monday and Thursday) for predictable cash flow
> - Add fraud check before processing: flag payouts to bank accounts that haven't been used before or accounts changed within 7 days

---

## Workflow 12 — Dispute Resolution

**Scenario:** Client or provider raises a dispute on an active job

---

### Actors
| Actor | Role |
|---|---|
| Client or Provider | Opens dispute; submits evidence |
| Admin | Investigates, mediates, and resolves the dispute |
| System | Locks escrow, notifies parties, transitions job state |

---

### Who Can Raise a Dispute

Either the **client** or the **provider** on a job can open a dispute, provided:
- The job is in status: `assigned`, `in_progress`, or `completed`
- Disputes on `pending_validation`, `open`, `cancelled`, or already `disputed` jobs are blocked

---

### Step 1 — Opening a Dispute

Submitter provides:
- `reason` — text description of the issue
- `evidence[]` — optional array of Cloudinary image URLs

System actions:
- `Dispute` record created with `status: open`
- `job.status` → `disputed` (escrow funds remain **locked**)
- Activity log entry: `dispute_opened`
- Push notification to the **other party**: *"A dispute was raised on one of your jobs. An admin will review it."*
- SSE real-time status update to both parties

---

### Step 2 — Evidence Submission

- Both parties can submit additional evidence via the dispute thread / job message system
- Evidence is reviewed by admin via the dispute management panel

---

### Step 3 — Admin Resolution

Admin review actions:
1. Sets `dispute.status → investigating`
2. Reviews all submitted evidence and message history
3. Mediates between parties
4. Resolves with `escrowAction`:

| escrowAction | Outcome |
|---|---|
| `release` | Escrow paid to provider; `job.status → completed` |
| `refund` | Escrow returned to client wallet; `job.status → refunded` |
| Neither (notes only) | Status updated to `resolved`; no fund movement |

---

### Dispute Outcomes

| Outcome | Description |
|---|---|
| Full refund to client | Escrow `refunded`; funds credited to client wallet |
| Full payment to provider | Escrow `released`; provider receives net amount |
| Partial payment | Admin uses partial release tool; remainder refunded |
| Job reopened | Admin transitions job back to `open` or `assigned` for re-execution |

---

### Dispute Status Reference

| Status | Description |
|---|---|
| `open` | Dispute filed; under admin triage |
| `investigating` | Admin is actively reviewing |
| `resolved` | Decision made; escrow action executed |

---

### Job Status During Dispute

```
disputed  →  completed   (admin resolves in favor of provider)
disputed  →  refunded    (admin resolves in favor of client)
```

Escrow funds remain fully locked throughout the entire dispute lifecycle.

---

> **Production Notes**
> - Define and publish a dispute SLA: e.g., initial admin response within 24 hours, resolution within 5 business days
> - Implement a structured evidence submission form (category tags: "photo", "message screenshot", "receipt") to streamline admin review
> - Add a disputeCount tracker on both provider and client profiles; flag users with high dispute rates
> - Consider adding a negotiation window (24–48h) before admin involvement, where both parties can settle directly

---

## Workflow 13 — Repeat Booking

**Scenario:** A client rehires a provider they have worked with before

---

### Actors
| Actor | Role |
|---|---|
| Client | Initiates a new job directly targeting a previous provider |
| Provider | Receives a direct job invitation |
| System | Creates the job with `invitedProviderId`; follows standard job lifecycle |

---

### How It Works

When a client re-hires a previous provider:
1. Client selects the provider from their job history or the provider's public profile
2. Client creates a new job with `invitedProviderId` set to that provider's user ID
3. The job enters the standard creation flow (Workflow 3), including fraud/risk assessment
4. The job is created with `status: pending_validation` and routed through admin review
5. Once validated and opened, the targeted provider receives a **direct invitation notification**

---

### Benefits to Both Parties

| Benefit | Description |
|---|---|
| Skip the discovery phase | Client goes directly to a known provider |
| Faster quote acceptance | Trusted relationship reduces negotiation time |
| Provider priority | Direct invite surfaced before general open marketplace listings |

---

### System Notes

- The direct invite does **not** block other providers from applying to the same job
- The job becomes fully `open` after admin validation — the invited provider simply has visibility first
- The invitation metadata is preserved in the activity log for audit

---

> **Production Notes**
> - Add a "Re-hire" shortcut button on completed job cards in the client dashboard
> - Build a "Favorite Providers" list (model already exists: `FavoriteProvider`) — surface these prominently in the booking UI
> - Consider a "Preferred Provider" flag that auto-invites the favorite provider for new jobs in the same category

---

## Workflow 14 — Subscription and Recurring Service

**Scenario:** A client sets up a recurring service contract

---

### Actors
| Actor | Role |
|---|---|
| Client | Configures recurring schedule; funds escrow per cycle |
| System | Auto-generates jobs on schedule; charges via saved card |
| Provider | Executes recurring jobs on agreed schedule |
| Admin | Monitors recurring contracts; handles failures |

---

### Use Cases
- Hotel room cleaning (daily / weekly)
- AC unit maintenance (monthly)
- Landscaping and gardening (weekly / fortnightly)
- Office cleaning (daily)

---

### Recurring Schedule Model (`RecurringSchedule`)

Client configures:
- Linked `jobId` (template job)
- `frequency`: `daily | weekly | fortnightly | monthly`
- `nextRunAt`: next scheduled execution date
- `isActive`: whether the schedule is currently running
- `providerId`: assigned provider for ongoing jobs
- `budget`: per-cycle budget

---

### Payment Handling — Auto-Pay via Saved Card

When a recurring job is auto-generated:
1. System checks for a **saved PayMongo card token** on the client's account (stored from a previous checkout session)
2. System charges the saved card via `chargeWithSavedMethod()` for the cycle budget
3. Escrow is funded automatically — no client action required
4. Job is activated and provider is notified
5. If card charge fails: client is notified to update payment method; job is held

---

### Business Client Subscription Plans

Separate from recurring jobs, business clients purchase **platform subscription plans**:

| Plan | Features |
|---|---|
| `starter` | Basic marketplace access; limited job posts |
| `growth` | Higher job limits; analytics |
| `enterprise` | Multi-branch; manager roles; reporting; priority support |

Plan payment flow:
- Client initiates via PayMongo Checkout (metadata: `type: subscription`, `orgId`, `plan`)
- On webhook confirmation: plan activated for **30 days**
- On expiry: enterprise features locked until renewal

---

> **Production Notes**
> - Implement failed auto-pay retry logic: retry after 24h and 48h before cancelling the recurring schedule
> - Add in-app recurring schedule management UI (currently only the model and cron scaffolding exist)
> - Send renewal reminder emails 7 days and 1 day before recurring schedule end or plan expiry
> - Allow clients to pause a recurring schedule without cancelling it (e.g., during holidays)

---

## Workflow 15 — Provider Suspension

**Scenario:** A provider violates platform rules or triggers risk thresholds

---

### Actors
| Actor | Role |
|---|---|
| Admin / Staff | Reviews violations and takes action |
| System | Enforces suspension state across all provider touchpoints |
| Provider | Receives notification; account access restricted |

---

### Suspension Triggers

**Manual triggers (admin-initiated):**
- Verified fraud or rule violation reported
- Repeated or severe client complaints
- Identity or document forgery detected
- Off-platform payment attempts confirmed

**Automated risk triggers (system-flagged for admin review):**
- High dispute frequency (`disputeCount` exceeds threshold)
- Low average rating across multiple completed jobs
- Risk score on submitted jobs consistently high
- Unusual activity patterns (e.g., rapid shifts in pricing, location inconsistencies)

---

### Admin Action Levels

| Action | Field | Description |
|---|---|---|
| **Issue Warning** | Activity log entry | Formal warning recorded; no access change |
| **Suspend Account** | `isSuspended: true` | Provider blocked from dashboard and marketplace visibility |
| **Reject Application** | `approvalStatus: rejected` | For pre-approval violations; application denied |
| **Terminate Account** | `isDeleted: true` + `deletedAt` | Permanent removal; account soft-deleted |

---

### Enforcement at System Level

When `isSuspended: true`:
- Provider layout shows a suspension notice and blocks all dashboard routes
- Provider's listings are hidden from client search results
- Any pending quotes from this provider are blocked from acceptance
- Active jobs: admin reviews and determines next steps (reassign or dispute)

---

### Reinstatement

- Admin can toggle `isSuspended: false` to reinstate the account
- Reinstatement is logged in the Activity Log with admin user ID and reason
- Provider receives a push/email notification upon reinstatement

---

> **Production Notes**
> - Implement a structured warning system with escalation tiers (warning → 7-day suspension → permanent ban)
> - Add a self-appeal mechanism: suspended providers can submit an appeal form with explanation
> - Automate `isSuspended: true` when a provider accumulates X disputes within Y days (configurable threshold via `AppSetting` model)
> - Ensure all suspension actions write to the `ActivityLog` with admin ID, timestamp, and reason for full auditability

---

## Workflow 16 — Fraud Detection

**Scenario:** Suspicious activity is detected on the platform

---

### Actors
| Actor | Role |
|---|---|
| System | Automatically detects and flags suspicious jobs and accounts |
| Admin / Staff | Investigates flagged activity; takes enforcement action |
| Client / Provider | May be required to complete additional verification |

---

### Automated Detection — Job Level

Every job submission triggers `assessJobRisk()`, which evaluates:

**Behavioral signals:**
- Jobs posted in last 24 hours (high velocity = risk)
- Jobs posted in last 7 days
- Previously rejected job count for this client
- Previously flagged job count (`flaggedJobCount`)

**Account signals:**
- Email not verified
- KYC not approved
- Account age < 7 days

**Content signals (keyword scanning):**
- Off-platform payment phrases: `"pay outside"`, `"bypass escrow"`, `"send to GCash"`, `"transfer directly"`
- Scam / get-rich phrases: `"earn big"`, `"passive income"`, `"guaranteed income"`, `"double your"`
- Pressure phrases: `"limited slots"`, `"first come first"`, `"last chance"`
- Phishing / data-harvesting phrases: `"send your ID"`, `"send your bank"`, `"click here"`, `"t.me/"`, `"bit.ly"`

**Outcomes:**
- `riskScore` (numeric) stored on the job record
- `fraudFlags[]` array of detected signal codes stored on the job
- Client's `flaggedJobCount` incremented
- Client's `fraudFlags[]` updated with up to 3 signal codes
- Admin notification includes `⚠️ Fraud flags detected` if any signals are present

---

### Automated Detection — Account Level

System detects:
- Duplicate account registration (same email or device fingerprint)
- Abnormal pricing patterns across submitted quotes (provider side)
- Multiple failed payment attempts in short succession
- Accounts created in bulk from the same IP range

---

### Admin Investigation Flow

Admin actions after fraud flag notification:
1. Review job content and fraud flags in `/admin/users/[id]`
2. Access activity log for the client or provider
3. Review KYC documents if applicable
4. Take action:

| Action | Method |
|---|---|
| Hold escrow | Admin can block escrow release on any job |
| Freeze account | `isSuspended: true` |
| Require identity re-verification | Reset `kycStatus → pending`; prompt re-upload |
| Terminate account | Soft-delete via `isDeleted: true` |

---

> **Production Notes**
> - Make fraud detection thresholds configurable via the `AppSetting` model (avoid hardcoding)
> - Add a machine-learning risk scoring layer: train on historical flagged/confirmed-fraud jobs over time
> - Implement IP-rate limiting at the Next.js middleware layer for registration and job-posting endpoints
> - Build an in-app fraud dashboard for admins: daily flagged job counts, top offenders, risk score distribution chart

---

## Workflow 17 — Enterprise Client

**Scenario:** A hotel chain or large business uses LocalPro at scale

---

### Actors
| Actor | Role |
|---|---|
| Business Owner | Creates the `BusinessOrganization`; selects enterprise plan |
| Branch Managers | Post jobs for their assigned branches |
| Finance Team | Approves escrow payments for high-value jobs |
| Admin | Provides enterprise reporting; manages account issues |

---

### Business Organization Setup

An enterprise client creates a `BusinessOrganization` record with:
- Organization name and description
- Subscription plan: `starter | growth | enterprise`
- Branch locations (multiple `BusinessMember` records per branch)
- Role assignments: owner, manager, member

---

### Plan Activation

1. Owner selects enterprise plan in settings
2. PayMongo Checkout Session created with `metadata.type = "subscription"` and `metadata.orgId`
3. On webhook confirmation: plan activated for 30 days; `planStatus: active`
4. Auto-renewal is handled via saved card charge on expiry (if card token exists)

---

### Multi-Branch Job Posting

Branch managers post jobs on behalf of their assigned branch:
- Job is associated with the client user who is a member of the org
- Branch location is selected at job creation
- Jobs follow the standard posting and validation flow (Workflow 3)

---

### Budget Controls

Enterprise clients can configure per-branch monthly budgets.  
Finance team members can:
- View monthly escrow spend per branch
- Approve or hold large jobs before escrow is funded
- Access aggregate spend reports via the enterprise reporting dashboard

---

### Enterprise Features

| Feature | Description |
|---|---|
| Multiple branches | Each branch tracks its own jobs and spend |
| Manager access | Branch managers can post jobs within their scope |
| Budget tracking | Monthly spend tracked per org and per branch |
| Priority support | Admin-assisted onboarding and issue resolution |
| Enterprise reporting | Aggregate job history, provider performance, spend analytics |

---

### Admin Responsibilities

- Provision enterprise accounts on request
- Provide account success support for large clients
- Monitor enterprise spending patterns for anomalies
- Generate and deliver custom reports on request

---

> **Production Notes**
> - Build a dedicated enterprise analytics dashboard with charts: jobs over time, top providers, spend by category, branch comparison
> - Implement approval workflows within the org: e.g., manager posts job → finance approves before escrow is created
> - Add SSO (Single Sign-On) support for enterprise clients using their own identity providers (Google Workspace, Okta, etc.)
> - Allow finance admins to set escrow pre-funding from a corporate wallet credited via bank transfer (not individual card)

---

## Workflow 18 — Provider Boost / Featured Listings

**Scenario:** A provider purchases a visibility boost to appear prominently in search results

---

### Actors
| Actor | Role |
|---|---|
| Provider | Selects boost tier and pays via wallet or PayMongo |
| System | Creates `FeaturedListing`, debits wallet / initiates checkout, posts ledger entry |
| PayMongo | Processes payment and webhooks confirmation (checkout path) |
| Cron Job | Expires stale listings daily; notifies affected providers |

---

### Boost Tiers

| Type | Default Price | Visibility Placement |
|---|---|---|
| `featured_provider` | ₱199/week | Top of marketplace search with badge |
| `top_search` | ₱299/week | Pinned at top of category-filtered searches |
| `homepage_highlight` | ₱499/week | Premium panel on the find-a-provider page |

- All three tiers can be active **simultaneously** (stacking allowed)
- Each boost lasts exactly **7 days** (`startsAt = now`, `expiresAt = startsAt + 7 days`)
- Prices are configurable via `AppSetting` keys (`payments.featuredListingFeaturedProvider`, etc.)
- Fees are **non-refundable** once a boost is activated

---

### Payment Path A — Platform Wallet

1. Provider calls `POST /api/provider/boost` with `{ type, payWith: "wallet" }`
2. System checks wallet balance ≥ boost price
3. If sufficient:
   - Wallet debited atomically via `WalletTransaction` (`type: featured_listing_payment`)
   - `FeaturedListing` record created with `status: active`
   - Double-entry ledger journal posted (`postFeaturedListingPayment`)
   - `ledgerJournalId` stamped back on the listing
4. Push notification to provider: *"Boost activated! ₱{price} was deducted from your wallet."* (notification `data.listingId` included)
5. Returns `{ activated: true, listing }`

---

### Payment Path B — PayMongo Checkout

1. Provider calls `POST /api/provider/boost` with `{ type, payWith: "paymongo" }`
2. System creates a **PayMongo Checkout Session** with:
   - `metadata.type = "featured_listing"`, `metadata.listingType`, `metadata.providerId`, `metadata.amountPHP`
   - `successUrl` → `/provider/boost?payment=success&type={type}`
   - `cancelUrl` → `/provider/boost?payment=cancelled`
3. Returns `{ activated: false, checkoutUrl, checkoutSessionId }`
4. Provider completes payment on PayMongo-hosted page
5. PayMongo fires webhook → `activateFromWebhook()` called:
   - Idempotency check: skip if listing for this `paymongoSessionId` already exists
   - `FeaturedListing` created (`status: active`) with `paymongoSessionId` stored
   - Ledger journal posted
   - Push notification to provider: *"Boost activated!"*

> **Dev fallback:** If `PAYMONGO_SECRET_KEY` is not set, the checkout path silently falls back to the wallet path and activates immediately.

---

### Cancellation

- Provider (or admin/staff) can cancel an active boost via `DELETE /api/provider/boost/[id]`
- `FeaturedListing.status` → `cancelled`
- No refund is issued
- Only `active` listings can be cancelled

---

### Cron — Expiry Job

- Runs daily; sets `status → expired` on all listings where `expiresAt < now` and `status: active`
- Bulk push notification to all affected providers: *"Your {type} boost has expired. Renew to stay featured."*

---

### FeaturedListing Status Reference

| Status | Description |
|---|---|
| `active` | Boost live; provider is promoted in the configured placement |
| `expired` | 7-day period ended; no longer shown |
| `cancelled` | Manually cancelled by provider or admin before expiry |

---

> **Production Notes**
> - Surface boost analytics to providers: impression count, profile view count, quote conversion rate attributed to each boost period
> - Add a "Renew" shortcut on expired listings so providers can re-purchase with one tap
> - Implement a boost purchase limit per provider type to prevent artificial search flooding
> - Consider tiered pricing by category demand (e.g., Cleaning boosts cost more than niche categories)

---

## Workflow 19 — Provider Job Withdrawal

**Scenario:** An assigned provider withdraws from a job before work has started

---

### Actors
| Actor | Role |
|---|---|
| Provider | Requests to withdraw from an assigned job before starting |
| System | Reverts job to `open`, rejects provider's quote, notifies client |
| Client | Notified of withdrawal; job re-enters open marketplace |

---

### Preconditions

- Job must be in `status: assigned` (escrow may or may not be funded)
- Only the **assigned provider** (`job.providerId`) can trigger withdrawal
- Withdrawal is **blocked** once the job transitions to `in_progress`

---

### Withdrawal Flow

1. Provider calls `POST /api/jobs/[id]/withdraw` with an optional `{ reason }` body
2. System validates lifecycle transition: `assigned → open` is allowed
3. System actions:
   - `job.status` → `open`
   - `job.providerId` → `null` (assignment cleared)
   - Provider's accepted/pending quote → `rejected` via `quoteRepository.rejectByProvider()`
4. Activity log entry: `provider_withdrew` (metadata includes `action`, `reason`)
5. Push notification to client: *"Your provider could not proceed. The job has been re-opened."*
6. SSE real-time status update to both parties
7. Returns `{ job }` with reverted state

---

### Impact on Escrow

- If escrow was **not yet funded**: job simply re-opens; no fund movement
- If escrow was **funded**: escrow remains locked on the job; client must choose a new provider and the funded escrow applies to the new assignment
- Admin may need to manually refund escrow if the client wishes to cancel instead

---

### Activity Log Event

| Event | Description |
|---|---|
| `provider_withdrew` | Logged when an assigned provider withdraws before job start |

---

> **Production Notes**
> - Add a withdrawal penalty system: providers who withdraw frequently may have their `completionRate` penalised or receive a warning
> - Track `withdrawalCount` on `ProviderProfile` for admin visibility
> - If escrow is funded at withdrawal time, auto-notify the client with options: "Find a new provider" or "Cancel and get a refund"
> - Consider a cooldown window: block further quote submissions for the withdrawn provider on the same job

---

## Global Status Reference

---

### Job Status States

| Status | Description |
|---|---|
| `pending_validation` | Job submitted; awaiting admin review |
| `open` | Validated; visible in marketplace; accepting quotes |
| `assigned` | Provider selected; awaiting escrow funding |
| `in_progress` | Work started; escrow funded |
| `completed` | Provider marked done; awaiting client confirmation and payment release |
| `disputed` | Dispute opened; escrow locked pending resolution |
| `refunded` | Dispute resolved in client's favor; escrow refunded |
| `rejected` | Admin rejected the job post |
| `expired` | Job expired without a provider being assigned |
| `cancelled` | Job cancelled by client or admin |

---

### Valid Job Status Transitions

```
pending_validation  →  open, rejected
open                →  assigned, rejected, expired, cancelled
assigned            →  in_progress, completed, disputed, open, cancelled
in_progress         →  completed, disputed
completed           →  (terminal — requires escrow release action)
disputed            →  completed, refunded
```

---

### Escrow Status States

| Status | Description |
|---|---|
| `not_funded` | No payment received yet |
| `funded` | Payment locked in escrow |
| `released` | Payment disbursed to provider |
| `refunded` | Payment returned to client |

---

### Provider Account States

| Status | Field | Description |
|---|---|---|
| Pending | `approvalStatus: pending_approval` | New registration under review |
| Approved | `approvalStatus: approved` | Active; visible in marketplace |
| Rejected | `approvalStatus: rejected` | Application denied |
| Suspended | `isSuspended: true` | Temporarily restricted |
| Terminated | `isDeleted: true` | Soft-deleted; cannot log in |
| KYC Pending | `kycStatus: pending` | Documents under review |
| KYC Approved | `kycStatus: approved` | Identity verified |
| KYC Rejected | `kycStatus: rejected` | Documents rejected |
| Certified | `isLocalProCertified: true` | Platform-certified provider badge |

---

### Payment / Transaction States

| Status | Description |
|---|---|
| `pending` | Transaction created; escrow active |
| `completed` | Escrow released; provider paid |
| `refunded` | Funds returned to client |

---

### Payout States

| Status | Description |
|---|---|
| `pending` | Provider request submitted; awaiting admin review |
| `processing` | Admin approved; transfer initiated |
| `paid` | Funds disbursed |
| `rejected` | Admin denied the payout request |

---

### Dispute States

| Status | Description |
|---|---|
| `open` | Dispute filed; under admin triage |
| `investigating` | Admin actively reviewing |
| `resolved` | Final decision made; escrow action executed |

---

### Quote States

| Status | Description |
|---|---|
| `pending` | Quote submitted; awaiting client decision |
| `accepted` | Client accepted; provider assigned to job |
| `rejected` | Declined by client or superseded by competing quote |

---

### Business Plan States

| Status | Description |
|---|---|
| `active` | Plan payment confirmed; features enabled |
| `expired` | Plan term ended; enterprise features locked |
| `none` | No plan purchased |

---

### Featured Listing States

| Status | Description |
|---|---|
| `active` | Boost live; provider appears in configured placement |
| `expired` | 7-day period ended; boost no longer shown |
| `cancelled` | Manually cancelled by provider or admin before expiry |

---

### Activity Event Types

| Event | Trigger |
|---|---|
| `job_created` | Client creates a job |
| `job_approved` | Admin approves a job |
| `job_rejected` | Admin rejects a job |
| `job_started` | Provider begins work |
| `job_completed` | Provider marks job done |
| `job_expired` | Job expires without a provider |
| `job_cancelled` | Job cancelled by client or admin |
| `quote_submitted` | Provider submits a quote |
| `quote_accepted` | Client accepts a quote |
| `quote_expired` | Quote expires without client action |
| `escrow_funded` | Client funds escrow |
| `escrow_released` | Escrow released to provider |
| `provider_withdrew` | Assigned provider withdraws before job start |
| `dispute_opened` | Either party raises a dispute |
| `dispute_resolved` | Admin resolves a dispute |
| `review_submitted` | Client or provider submits a review |
| `payout_requested` | Provider requests a payout |
| `payout_updated` | Admin updates payout status |
| `consultation_requested` | Client requests a site consultation |
| `consultation_accepted` | Provider accepts a consultation |
| `consultation_declined` | Provider declines a consultation |
| `consultation_converted_to_job` | Consultation converted into a job |
| `consultation_stale_accepted` | Consultation accepted after stale timeout |
| `recurring_created` | Recurring schedule created |
| `recurring_cancelled` | Recurring schedule cancelled |
| `recurring_job_spawned` | Cron auto-generates a recurring job |
| `admin_ledger_entry` | Admin manually posts a ledger adjustment |

---

## Critical Edge Cases

The following scenarios require explicit system or admin handling. Many of these are partially addressed in the current codebase but benefit from further hardening.

---

| # | Scenario | Current Handling | Recommended Enhancement |
|---|---|---|---|
| 1 | **Client disappears after job starts** | No auto-release implemented | Add auto-release timer: 5 business days after job marked complete with no client action |
| 2 | **Provider does not show up** | Client opens dispute | Add provider no-show self-reporting: client taps "Provider didn't arrive" to fast-track dispute |
| 3 | **Client refuses to confirm but work is done** | Provider opens dispute | Auto-release escrow after timeout (see #1); admin can also force-release on investigation |
| 4 | **Job scope changes mid-project** | No in-system mechanism | Build a "Change Order" feature: provider proposes scope/budget amendment; client approves; escrow topped up |
| 5 | **Emergency cancellations** | Admin/client cancels job | Add self-service cancellation with defined penalty rules (e.g., no penalty if before start, partial forfeiture after start) |
| 6 | **Partial refunds** | Partial release tool exists | Clearly define policy: percentage thresholds for dispute outcomes; automate calculation in admin panel |
| 7 | **Provider no-show on recurring jobs** | Not handled | Send provider reminder 2h before scheduled start; if no check-in, notify client and trigger auto-reassign flow |
| 8 | **Job extensions** | Admin manual action only | Build self-service extension requests: both parties agree, new `scheduleDate` saved, provider notified |
| 9 | **Multiple providers on one project** | Single `providerId` per job | Consider a future "team job" model with multiple assigned providers and split payout |
| 10 | **Agency providers assigning sub-workers** | Not supported | Build a `BusinessOrganization` equivalent for provider teams: agency owner manages worker assignments |
| 11 | **Provider withdraws after escrow is funded** | Job reverts to `open`; escrow remains on job | Auto-notify client with options: find a new provider or cancel + refund; add penalty logic for serial withdrawals |
| 12 | **Provider boost purchased but checkout abandoned** | No listing created until webhook fires | Add a listing status `pending_payment` for initiated but unpaid sessions; clean up via cron after 24h |

---

## Notification Delivery Architecture

All notifications use a **dual delivery** model:

| Channel | Implementation | Use Case |
|---|---|---|
| **SSE (Server-Sent Events)** | `/api/notifications/stream` using `EventEmitter` (`notificationBus`) | Real-time in-app delivery for active users |
| **Push Notifications** | Web Push API via `sw.js` service worker + VAPID keys | Background delivery when app is inactive |
| **Email** | Nodemailer via SMTP (Zoho or configured provider) | Critical events: verification, approval, payment, dispute |
| **SMS** | Twilio (`lib/twilio.ts`) | Reserved for OTP and high-urgency alerts |

Keepalive heartbeats sent every **25 seconds** via SSE to prevent proxy timeouts.

---

### Notification Types

| Type | Description |
|---|---|
| `job_submitted` | New job posted (admin) |
| `job_approved` / `job_rejected` | Admin decision on a job |
| `quote_received` | Provider submitted a quote |
| `quote_accepted` / `quote_rejected` / `quote_expired` | Quote lifecycle events |
| `escrow_funded` / `escrow_released` / `escrow_auto_released` | Escrow lifecycle events |
| `payment_confirmed` / `payment_failed` | Payment outcome |
| `payment_reminder` | Reminder to fund escrow |
| `job_completed` / `job_expired` | Job outcome events |
| `dispute_opened` / `dispute_resolved` | Dispute lifecycle events |
| `review_received` | New review submitted |
| `new_message` | New chat message |
| `payout_requested` / `payout_status_update` | Payout lifecycle events |
| `job_direct_invite` | Provider received a direct job invitation |
| `consultation_request` / `consultation_accepted` / `consultation_expired` / `consultation_stale` | Consultation lifecycle events |
| `estimate_provided` | Provider submitted an estimate on a consultation |
| `recurring_job_spawned` | Cron spawned a new recurring job |
| `wallet_credited` / `wallet_withdrawal_update` | Wallet events |
| `agency_job_assigned` / `agency_staff_invited` | Agency/team events |
| `admin_message` | Admin sends a broadcast message |
| `reminder_*` | Scheduled reminder nudges (fund escrow, no quotes, start job, complete job, leave review, stale dispute, pending validation, profile incomplete) |
| `system_notice` | System-generated advisory alert (e.g., low bid credit balance) |

---

*Documentation generated from live codebase — March 14, 2026*
