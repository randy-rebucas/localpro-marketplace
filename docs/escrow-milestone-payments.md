# Secure Escrow + Milestone Payments

## Overview

LocalPro uses a secure escrow system to hold client funds until work is completed and approved. The system supports full-amount release, partial release, structured milestone-based payments, digital completion confirmation, and automatic dispute triggering for overdue jobs.

---

## Architecture

```
Client funds escrow
       │
       ▼
escrowStatus: "funded"
       │
       ├─── Milestone-based ──► Client adds milestones (title, amount)
       │                        Provider completes work
       │                        Client releases each milestone individually
       │                        All released? → escrowStatus: "released"
       │
       ├─── Full release ──────► Provider marks complete
       │                        Client confirms via 3-item checklist
       │                        PATCH /api/jobs/:id/complete
       │                        → escrowStatus: "released"
       │
       ├─── Partial release ───► PATCH /api/jobs/:id/partial-release
       │                        { amount: number }
       │                        → escrowStatus: "released", partialReleaseAmount saved
       │
       └─── Auto-dispute ──────► Cron runs daily at 01:00 UTC
                                Jobs in_progress + funded + scheduleDate < (now − 2 days)
                                → status: "disputed", Dispute record created
                                → Notifications to client, provider, admins
```

---

## Data Model

### Job — relevant fields

| Field | Type | Description |
|---|---|---|
| `escrowStatus` | `"not_funded" \| "funded" \| "released" \| "refunded"` | Escrow lifecycle state |
| `partialReleaseAmount` | `number \| null` | Amount released in a partial release |
| `milestones` | `IMilestone[]` | Optional milestone payment plan |

### IMilestone

```typescript
interface IMilestone {
  _id: ObjectId | string;
  title: string;            // max 100 chars
  amount: number;           // must be positive; total across milestones ≤ job.budget
  description?: string;
  status: "pending" | "released";
  releasedAt?: Date;
}
```

Milestones are stored as a subdocument array on the `Job` document.

---

## API Reference

### Milestones

#### `GET /api/jobs/:id/milestones`
Returns the milestone list for a job.

**Auth:** Client, Provider, or Admin  
**Response:**
```json
{ "milestones": [ { "_id": "...", "title": "Foundation laid", "amount": 5000, "status": "pending" } ] }
```

---

#### `POST /api/jobs/:id/milestones`
Adds a new pending milestone to a funded job.

**Auth:** Client (owner only)  
**Conditions:** `escrowStatus === "funded"` and `status` is `"assigned"` or `"in_progress"`  
**Body:**
```json
{
  "title": "Foundation laid",
  "amount": 5000,
  "description": "Includes excavation and concrete pour"
}
```
**Validation:** `title` 3–100 chars, `amount` positive, total milestones must not exceed `job.budget`  
**Response:** `201` with `{ milestone: IMilestone }`

---

#### `POST /api/jobs/:id/milestones/:mId/release`
Releases a single pending milestone, transferring its amount (minus commission) to the provider.

**Auth:** Client (owner only)  
**Conditions:** `escrowStatus === "funded"`, `status === "completed"`  
**Response:**
```json
{
  "message": "Milestone \"Foundation laid\" released — ₱4,750 sent to provider.",
  "milestoneId": "...",
  "amount": 5000,
  "commission": 250,
  "netAmount": 4750,
  "allReleased": false
}
```
When `allReleased: true`, the job's `escrowStatus` is automatically set to `"released"` and provider metrics are updated.

---

## Cron Jobs

### `GET /api/cron/dispute-overdue`
**Schedule:** `0 1 * * *` (daily at 01:00 UTC)  
**Auth:** Cron secret via `verifyCronSecret`

Finds all `in_progress` + `funded` jobs whose `scheduleDate` has passed by more than 2 days without the provider marking them complete. For each:

1. Creates a `Dispute` record with `raisedBy: "system"`
2. Transitions job `status → "disputed"`
3. Logs to `ActivityLog` with `automated: true`
4. Pushes notifications to client, provider, and all admins
5. Emits real-time status update via SSE

**Grace period:** 2 days (configurable via `cronService.autoDisputeOverdueJobs(graceDays)`)

---

## UI Components

### `MilestonePanel`
**Location:** `src/components/payment/MilestonePanel.tsx`  
**Rendered in:** `src/app/(dashboard)/client/jobs/[id]/page.tsx` (when `escrowStatus === "funded"`)

Features:
- Collapsible panel with milestone count badge
- Progress bar showing percentage of budget committed to milestones
- Add milestone form (client only, when job is `assigned` or `in_progress`)
- Per-milestone release button (client only, when job is `completed`)
- `Pending` / `Released` status badges
- Budget guard — prevents adding a milestone that would exceed `job.budget`

### Release Payment Modal (JobActionButtons)
- Shown when `status === "completed"` and `escrowStatus === "funded"`
- Requires all 3 checklist items to be ticked before "Confirm Release" is enabled:
  1. Work was completed as described in the job post
  2. All issues or concerns have been addressed
  3. I am satisfied and ready to release payment

---

## Service Methods

### `CronService.autoDisputeOverdueJobs(graceDays = 2)`
**Location:** `src/services/cron.service.ts`

```typescript
const result = await cronService.autoDisputeOverdueJobs(2);
// → { disputed: number }
```

### `JobRepository.findOverdueInProgress(cutoff: Date)`
**Location:** `src/repositories/job.repository.ts`

Finds jobs matching:
```
{ status: "in_progress", escrowStatus: "funded", scheduleDate: { $lt: cutoff } }
```

---

## Transaction Flow

Every milestone release (and full/partial release) creates a `Transaction` record:

```
Transaction {
  jobId, payerId (client), payeeId (provider),
  amount (gross), commission, netAmount,
  status: "completed"
}
```

Commission is calculated via `calculateCommission(amount)` from `src/lib/commission.ts`.

---

## Related Files

| File | Role |
|---|---|
| `src/models/Job.ts` | Schema — milestones subdocument |
| `src/types/index.ts` | `IMilestone`, `IJob.milestones` |
| `src/repositories/job.repository.ts` | `findOverdueInProgress` |
| `src/services/cron.service.ts` | `autoDisputeOverdueJobs` |
| `src/services/escrow.service.ts` | Core fund / release / refund logic |
| `src/services/dispute.service.ts` | `openDispute` — used by auto-dispute cron |
| `src/app/api/jobs/[id]/milestones/route.ts` | GET + POST milestones |
| `src/app/api/jobs/[id]/milestones/[mId]/release/route.ts` | Release one milestone |
| `src/app/api/jobs/[id]/partial-release/route.ts` | Partial release (free-form amount) |
| `src/app/api/cron/dispute-overdue/route.ts` | Auto-dispute cron handler |
| `src/components/payment/MilestonePanel.tsx` | UI panel |
| `src/components/payment/PartialReleaseButton.tsx` | Partial release UI |
| `src/app/(dashboard)/client/jobs/[id]/JobActionButtons.tsx` | Release modal with checklist |
| `vercel.json` | Cron schedules |
