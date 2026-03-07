# Provider Job Withdrawal & Job Re-Opening

## Overview

When a provider is assigned to a job but cannot proceed, the system supports three resolution paths depending on who initiates the action:

1. **Provider self-withdrawal** — the provider proactively withdraws before starting work.
2. **Admin force-withdraw** — admin unassigns a provider who is unresponsive or refuses to withdraw. Works on both `assigned` and `in_progress` states, regardless of escrow.
3. **Admin escrow-override reopen** — used specifically when escrow is already funded and admin wants to re-open via the escrow panel.

In all cases the job returns to **open** status and is visible on the job board again. The client's escrow payment is **not refunded and not charged again** — it remains held and is applied to whichever new provider eventually completes the job.

---

## Conditions & Restrictions

| Scenario | Who can act | Allowed when | Not allowed when |
|---|---|---|---|
| Provider self-withdrawal | Provider (assigned only) | `status = assigned`, `escrowStatus = funded` | Job has already been started (`in_progress`) |
| Emergency (provider cannot act) | Admin, on provider's behalf | `status = assigned`, any escrow state | — |
| **Admin force-withdraw** | **Admin** | **`status = assigned` or `in_progress`**, any escrow state | Terminal statuses (`completed`, `refunded`, `expired`, `rejected`) |
| Admin escrow reopen | Admin | `escrowStatus = funded`, any non-terminal status | Escrow already `released` or `refunded` |
| Admin full refund | Admin | `escrowStatus = funded` | Escrow already `released` or `refunded` |

> Once a job reaches `in_progress`, the provider can no longer self-withdraw. Use **Admin Force Withdraw** instead.

> **Emergency before starting:** If the provider has an emergency and cannot use the app themselves (e.g. hospitalization, family crisis), an admin should use **Force Withdraw** (Path 2 below).

---

## Job Status Flow

```
pending_validation
       │
       ▼
     open  ◄──────────────────────────────────────┐
       │                                           │
       ▼                                           │ provider self-withdraw
    assigned ──────────────────────────────────────┤ (assigned only)
    (escrow funded)                                │
       │                                           │ admin force-withdraw
       ▼                                           │ (assigned OR in_progress)
   in_progress ─────────────────────────────────── ┘
       │
       ▼
    completed
       │
       ▼
  escrow released  (payment goes to provider)
```

---

## Path 1 — Provider Self-Withdrawal (Including Emergencies)

### When to use
The provider cannot do the job **before** they have started work. This covers:
- Schedule conflicts or capacity issues
- Personal or family emergency where the provider can still access the app
- Any reason the provider chooses to step back before pressing "Start Job"

If the provider **cannot access the app** due to the emergency (hospitalization, etc.), use **Path 2** (admin forced re-open) instead.

### API

```
POST /api/jobs/:id/withdraw
Authorization: Bearer <provider token>

{
  "reason": "I am unavailable on the scheduled date"
}
```

### What happens
1. The system validates that the caller is the currently assigned provider and the job is still in `assigned` state.
2. `job.providerId` is cleared (`null`).
3. `job.status` changes from `assigned` → `open`.
4. `job.escrowStatus` remains `funded` — no payment change.
5. The **client receives a notification**: *"Your provider could not proceed. The job has been re-opened."*
6. The former provider also receives a real-time status update.
7. The job re-appears on the public job board and new providers can submit quotes.

### Response

```json
{
  "job": { "...": "updated job object" },
  "message": "You have withdrawn from the job. It has been re-opened for other providers."
}
```

### Errors

| HTTP | Reason |
|------|--------|
| `403 Forbidden` | Caller is not the assigned provider |
| `422 Unprocessable` | Job is not in `assigned` state (already started) |
| `400 Bad Request` | `reason` field missing or fewer than 5 characters |

---

## Path 2 — Admin Force Withdraw

### When to use
- Provider is unresponsive and has not voluntarily withdrawn.
- Provider verbally refused or informally cancelled but did not use the withdrawal flow.
- Provider had an **emergency and cannot access the app** (hospitalization, etc.).
- Job is already `in_progress` (provider started but then stopped or disappeared).
- Admin wants to re-assign regardless of whether escrow is funded or not.

> **Key difference from escrow-override reopen:** Force Withdraw works on **any** escrow state and also covers `in_progress` jobs. The escrow-override `"reopen"` only works when `escrowStatus = funded`.

### UI
In the admin job detail page, the **"Force Withdraw Provider"** button (orange) appears in the status row whenever the job is in `assigned` or `in_progress` state. Clicking it opens a confirmation modal requiring a reason.

### API

```
POST /api/admin/jobs/:id/force-withdraw
Authorization: Bearer <admin token>

{
  "reason": "Provider unresponsive for 72 hours, confirmed cannot proceed"
}
```

### What happens
1. Validates `status` is `assigned` or `in_progress`.
2. Clears `job.providerId` → `null`.
3. Sets `job.status` → `open`.
4. `job.escrowStatus` is **unchanged** — if funded, it stays funded.
5. The **client receives a notification**: *"The provider has been removed from your job by an admin. Your job is now re-opened."*
6. The **removed provider receives a notification**: *"An admin has removed you from a job."*
7. Real-time push updates sent to both parties.
8. Action is logged with `adminForceWithdraw: true` and the removed provider ID.

### Response

```json
{ "message": "Provider removed. Job has been re-opened." }
```

### Errors

| HTTP | Reason |
|------|--------|
| `403 Forbidden` | Caller is not an admin |
| `404 Not Found` | Job does not exist |
| `422 Unprocessable` | Job is not in `assigned` or `in_progress` state |
| `422 Unprocessable` | Job has no assigned provider |
| `400 Bad Request` | `reason` missing or fewer than 5 characters |

---

## Path 3 — Admin Escrow-Override Reopen (Funded Jobs Only)

### When to use
- Job escrow is already `funded` and admin wants to re-open via the Escrow Override panel.
- A dispute was resolved in the client's favour but the client wants a new provider rather than a refund.
- Provider was assigned and funded, but for any reason the admin chooses to cycle the assignment.

> For all other cases (unfunded escrow, in-progress jobs, unresponsive providers) use **Path 2 (Force Withdraw)** instead.

### API

```
POST /api/admin/jobs/:id/escrow-override
Authorization: Bearer <admin token>

{
  "action": "reopen",
  "reason": "Provider unresponsive for 48 hours"
}
```

### What happens
1. Validates `escrowStatus = funded`.
2. Clears `job.providerId`.
3. Sets `job.status` → `open`.
4. `job.escrowStatus` remains `funded`.
5. The **client receives a notification**: *"Your job has been re-opened by an admin."*
6. The **former provider receives a notification**: *"You have been unassigned from a job by an admin."*
7. Real-time push updates are sent to both parties.
8. The action is recorded in the activity log with `adminOverride: true`.

### Response

```json
{ "message": "Job re-opened successfully" }
```

### Other admin escrow actions (unchanged)

| `action` | Effect |
|---|---|
| `"reopen"` | Clears provider, job goes back to `open`, escrow stays `funded` |
| `"release"` | Forces escrow `released`, job set to `completed` — use when provider did the work but client won't confirm |
| `"refund"` | Forces escrow `refunded`, job set to `refunded` — use when the job should be fully cancelled and client repaid |

---

## Path 4 — Client-Initiated (via Dispute)

If neither the provider nor an admin has acted, the **client** can open a dispute:

```
POST /api/disputes
{ "jobId": "...", "reason": "Provider is unresponsive" }
```

The job moves to `disputed`. An admin then resolves it with one of:
- `escrowAction: "refund"` — full cancel and refund.
- `escrowAction: "release"` — release payment if work was done.

The admin can also use `action: "reopen"` on the escrow-override endpoint to skip the dispute and directly re-open the job.

---

## What Happens to Quotes After Re-Opening

When a job returns to `open` status:
- All **previous quotes** for that job remain in the database but their status is unchanged (still `pending` or `rejected`).
- New providers can submit fresh quotes.
- The client can accept any new quote normally — accepting triggers the `open → assigned` transition again and a new funding prompt is **not** shown because `escrowStatus` is already `funded`.

---

## Edge Cases

### Milestones
If the job was originally created with a milestone payment plan, the milestones are preserved when the job is re-opened. The new provider will work under the same milestone structure.

### Recurring Jobs
If the job was auto-spawned from a **recurring schedule**, the preferred provider lock (set on first successful completion) is **not** cleared by a withdrawal. The schedule's `preferredProviderId` field is only set on `escrow released`, so a withdrawal before completion leaves the schedule unchanged.

### Loyalty Points
Loyalty points are only awarded to the client when the escrow is **released** (job completed). A withdrawal has no effect on loyalty points.
