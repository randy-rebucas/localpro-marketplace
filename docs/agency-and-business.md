# Agency & Business Organization — Full Documentation

**Version:** 1.1  
**Last Updated:** 2026-03-14

This document covers the two organization account types on LocalPro Marketplace: **Agencies** (provider-side) and **Business Organizations** (client-side). Although they share some billing concepts, they are completely separate systems serving opposite ends of the marketplace.

---

## Table of Contents

1. [Overview & Key Differences](#1-overview--key-differences)
2. [Agencies](#2-agencies)
   - [Activation](#21-activation)
   - [Data Model](#22-data-model)
   - [Subscription Plans](#23-subscription-plans)
   - [Compliance](#24-compliance)
   - [Services & Equipment Catalog](#25-services--equipment-catalog)
   - [Availability](#26-availability)
3. [Agency Staff Management](#3-agency-staff-management)
   - [Staff Roles](#31-staff-roles)
   - [Adding Staff Directly](#32-adding-staff-directly)
   - [Inviting Staff by Email](#33-inviting-staff-by-email)
   - [Accepting an Invite](#34-accepting-an-invite)
   - [Updating a Staff Role](#35-updating-a-staff-role)
   - [Removing Staff](#36-removing-staff)
   - [Staff Restrictions](#37-staff-restrictions)
4. [Agency Earnings & Payout Splitting](#4-agency-earnings--payout-splitting)
5. [Business Organizations](#5-business-organizations)
   - [Activation](#51-activation)
   - [Data Model](#52-data-model)
   - [Locations](#53-locations)
   - [Subscription Plans](#54-subscription-plans)
6. [Business Member Management](#6-business-member-management)
   - [Member Roles](#61-member-roles)
   - [Adding Members](#62-adding-members)
   - [Updating a Member](#63-updating-a-member)
   - [Removing a Member](#64-removing-a-member)
   - [Location Access Control](#65-location-access-control)
7. [Admin Management](#7-admin-management)
8. [API Reference](#8-api-reference)

---

## 1. Overview & Key Differences

| Feature | Agency | Business Organization |
|---|---|---|
| **Account role** | Provider (`role: "provider"`) | Client (`role: "client"`) |
| **Purpose** | Operate as a team of service providers | Manage multi-location hiring as a client |
| **`accountType` flag** | `"business"` on the `User` doc | `"business"` on the `User` doc |
| **Primary model** | `AgencyProfile` | `BusinessOrganization` |
| **Staff/members model** | Embedded array in `AgencyProfile.staff[]` | Separate `BusinessMember` collection |
| **Invite system** | Email-based invite with 48-hour token | Direct add by user ID (search by email) |
| **Earning split** | Agency margin vs. worker payout via `AgencyStaffPayout` | N/A — clients pay, not earn |
| **Locations** | Service areas (string tags) | Structured location sub-documents with budgets |
| **Max concurrent jobs** | Configurable cap per agency | Budget-based per location |
| **Platform link field** | `User.agencyId → AgencyProfile._id` | `BusinessOrganization.ownerId → User._id` |

---

## 2. Agencies

Agencies are provider accounts that operate as a group. One provider (the **agency owner**) creates the agency and manages a roster of staff (workers, dispatchers, supervisors, finance personnel). All jobs are received at the agency level; job assignment to individual workers happens internally.

### 2.1 Activation

Activating an Agency account is **free** — no subscription required to get started.

```
POST /api/provider/upgrade-agency
```

**Requirements:**
- Authenticated user must have `role: "provider"`.
- The provider must not already be a staff member of another agency (`User.agencyId` must be null).
- `accountType` must not already be `"business"`.

**Effect:**
- Sets `User.accountType = "business"` on the calling user's record.
- Does **not** create an `AgencyProfile` document — the owner creates the profile separately via the onboarding flow (`POST /api/provider/agency/profile`).

**Guard: staff cannot upgrade**

If the calling user already has `User.agencyId` set (meaning they belong to another agency as a staff member), the request is rejected with `403 Forbidden`:

> "Agency staff members cannot create their own agency. Leave your current agency first."

### 2.2 Data Model

**Collection:** `agencyprofiles`  
**Mongoose model:** `AgencyProfile`

```
AgencyProfile {
  _id               ObjectId        (unique)
  providerId        ObjectId → User (unique; the agency owner)
  name              String          max 200 chars
  type              "agency" | "company" | "other"
  logo              String (URL) | null
  banner            String (URL) | null
  description       String          max 2000 chars
  businessRegNo     String
  operatingHours    String
  website           String
  serviceAreas      String[]        (geographic tags)
  serviceCategories String[]        (skill category slugs)
  staff             IAgencyStaff[]  (EMBEDDED — see §3)
  services          IAgencyService[] (catalog entries — see §2.5)
  equipment         IAgencyEquipment[] (asset registry — see §2.5)
  availability      IAvailabilitySlot[] (weekly schedule — see §2.6)
  maxConcurrentJobs Number          default 10
  autoAcceptQuotes  Boolean         default false
  defaultWorkerSharePct Number      0-100, default 60
  compliance        Object          (see §2.4)
  plan              "starter" | "growth" | "pro" | "enterprise"
  planStatus        "active" | "past_due" | "cancelled"
  planActivatedAt   Date | null
  planExpiresAt     Date | null
  pendingPlan       String | null
  pendingPlanSessionId String | null
  createdAt / updatedAt
}
```

**Key field notes:**

- `defaultWorkerSharePct` — the baseline percentage of each net payout given to the assigned worker (e.g., `60` means the worker receives 60 %, the agency keeps 40 %). Can be overridden per staff member via `IAgencyStaff.workerSharePct`. A value of `0` at the staff level means "use the agency default."
- `maxConcurrentJobs` — caps how many active jobs the agency can hold simultaneously.
- `autoAcceptQuotes` — when `true`, incoming quote requests are auto-approved without manual review.

### 2.3 Subscription Plans

Agencies can optionally upgrade to a paid plan for higher limits, analytics, and features.

| Plan | Slug |
|---|---|
| Starter (free) | `starter` |
| Growth | `growth` |
| Pro | `pro` |
| Enterprise | `enterprise` |

**Plan statuses:** `active` · `past_due` · `cancelled`

Plan upgrades are initiated via the billing UI which creates a checkout session (`pendingPlanSessionId`). On successful payment, a webhook confirms and activates the plan.

### 2.4 Compliance

The `compliance` sub-document tracks regulatory information required for operating as a formal service provider.

```
compliance {
  permits[]      { title, url, status: "pending"|"verified"|"expired" }
  insuranceUrl   String | null
  insuranceStatus "pending" | "verified" | "expired" | "none"
  tin            String    (Tax Identification Number)
  vat            String    (VAT registration number)
  taxStatus      "compliant" | "pending" | "not_provided"
}
```

Permits are stored as subdocuments (no `_id`). Admin staff with the `manage_agencies` capability can verify or flag permit and insurance statuses.

### 2.5 Services & Equipment Catalog

**Services** (`AgencyProfile.services[]`) represent the agency's public offering. Each entry has:

```
IAgencyService {
  _id         ObjectId
  title       String  max 200 chars
  description String  max 1000 chars
  category    String  (category slug)
  minPrice    Number  (₱)
  maxPrice    Number  (₱)
  duration    String  (e.g., "2 hours", "1 day")
  isActive    Boolean
}
```

**Equipment** (`AgencyProfile.equipment[]`) is an internal asset registry:

```
IAgencyEquipment {
  _id          ObjectId
  name         String  max 200 chars
  type         String
  serialNo     String
  status       "available" | "in_use" | "maintenance" | "retired"
  assignedToId ObjectId → User | null   (staff member using it)
  notes        String  max 500 chars
}
```

Both sub-arrays are managed via the agency settings dashboard (providers only; no public API route exposes them to clients).

### 2.6 Availability

`AgencyProfile.availability[]` stores the weekly schedule:

```
IAvailabilitySlot {
  day       Number    (0 = Sunday, 6 = Saturday)
  open      Boolean
  startTime String    ("08:00")
  endTime   String    ("17:00")
}
```

Up to 7 slots (one per day). Used to inform job scheduling and quote availability.

---

## 3. Agency Staff Management

Staff are stored as an **embedded subdocument array** inside `AgencyProfile.staff[]`. This means all staff reads are atomic with the profile document — no extra join required.

### 3.1 Staff Roles

| Role | Description |
|---|---|
| `worker` | Assigned to and executes jobs on behalf of the agency |
| `dispatcher` | Coordinates job assignments and scheduling |
| `supervisor` | Oversees workers; reviews and approves work |
| `finance` | Reads payout records, earnings reports, and billing |

The role controls what the staff member can see in the provider dashboard. The agency owner retains full control regardless of their own record.

### 3.2 Adding Staff Directly

The agency owner can add an existing provider by searching their email and then submitting:

```
POST /api/provider/agency/staff
Authorization: Bearer <agency owner JWT>

Body:
{
  "agencyId": "<agencyProfileId>",
  "userId": "<targetUserId>",
  "role": "worker"           // optional; defaults to "worker"
}
```

**What happens:**
1. Validates the calling user owns the agency.
2. Checks the target user is not already a staff member.
3. Pushes a new `IAgencyStaff` entry into `agency.staff[]` with `workerSharePct: 0` (inherits agency default at payout time).
4. Sets `User.agencyId = agency._id` on the target user.

**Search helper:**

```
GET /api/provider/agency/staff?agencyId=<id>&searchEmail=<email>
```

Returns `{ user: { _id, name, email, avatar, role } | null }` — use this to look up the user before adding.

### 3.3 Inviting Staff by Email

For providers who don't yet have an account, or for a cleaner UX, the owner can send an email invite:

```
POST /api/provider/agency/invites
Authorization: Bearer <agency owner JWT>

Body:
{
  "email": "worker@example.com",
  "role": "dispatcher"
}
```

**What happens:**
1. Validates the agency exists and belongs to the caller.
2. Confirms no pending (non-expired, non-accepted) invite already exists for that email.
3. Generates a 32-byte hex `token` and sets `expiresAt = now + 48 hours`.
4. Creates an `AgencyInvite` document.
5. Fires an invite email (non-blocking, `fire-and-forget`) via `sendAgencyInviteEmail`.

**`AgencyInvite` document:**

```
AgencyInvite {
  _id            ObjectId
  agencyId       ObjectId → AgencyProfile
  agencyOwnerId  ObjectId → User
  agencyName     String
  invitedEmail   String   (lowercase)
  invitedUserId  ObjectId → User | null   (set on accept)
  role           "worker" | "dispatcher" | "supervisor" | "finance"
  token          String   (unique 64-char hex)
  expiresAt      Date     (48 hours from creation)
  acceptedAt     Date | null
  createdAt / updatedAt
}
```

**Unique constraint:** Only one pending invite per `{agencyId, invitedEmail}` pair can exist at a time.

**List pending invites:**

```
GET /api/provider/agency/invites
```

Returns all invites for the caller's agency sorted by `createdAt` descending.

**Revoke an invite:**

```
DELETE /api/provider/agency/invites?id=<inviteId>
```

Deletes the pending invite document. Only un-accepted invites can be revoked.

### 3.4 Accepting an Invite

The invited person (must be an authenticated provider) opens the link from the email and confirms:

```
POST /api/agency/invite/[token]/accept
Authorization: Bearer <invitee JWT>
```

**Validation chain:**
1. Caller must have `role: "provider"`.
2. Token must exist and not be accepted (`acceptedAt: null`).
3. Token must not be expired (`expiresAt > now`).
4. Caller's email must exactly match `AgencyInvite.invitedEmail` (case-insensitive).
5. Caller must not already belong to another agency (`User.agencyId` must be null).
6. The referenced `AgencyProfile` must still exist.
7. Guard against double-entry: the caller must not already be in `agency.staff[]`.

**On success (atomic via `Promise.all`):**
- Pushes the new staff entry into `agency.staff[]`.
- Sets `User.agencyId = agency._id` on the accepting user.
- Sets `AgencyInvite.acceptedAt = now` and `invitedUserId = userId`.

**Response:**

```json
{
  "message": "You have successfully joined Acme Agency as dispatcher.",
  "agencyId": "...",
  "agencyName": "Acme Agency",
  "role": "dispatcher"
}
```

### 3.5 Updating a Staff Role

The owner changes a staff member's role (e.g., promoting a `worker` to `supervisor`):

```
PATCH /api/provider/agency/staff
Authorization: Bearer <agency owner JWT>

Body:
{
  "agencyId": "<agencyProfileId>",
  "staffId":  "<staffSubdocId>",
  "role":     "supervisor"
}
```

Only the `role` field can be changed via this endpoint. To change `workerSharePct`, use the staff-payout settings page.

### 3.6 Removing Staff

```
DELETE /api/provider/agency/staff?agencyId=<id>&staffId=<staffSubdocId>
Authorization: Bearer <agency owner JWT>
```

**What happens:**
1. Filters the staff entry out of `agency.staff[]`.
2. Calls `User.updateOne({ agencyId: null })` on the removed user — they become a standalone provider again.

### 3.7 Staff Restrictions

Staff members (any user with `User.agencyId` set) are blocked from the following platform actions:

| Action | Reason |
|---|---|
| `POST /api/provider/upgrade-agency` | Cannot create their own agency while a member of another. Must leave first. |
| Applying to PESO / LGU job posts | PESO and LGU jobs require direct individual service providers; agency staff cannot apply on behalf of themselves. |
| Creating consultations as the provider | Consultations flow from an individual provider; agency staff cannot initiate them as their own. |
| Accessing provider upgrade page | Server-side redirect: if `user.agencyId` is set, redirected to `/provider/dashboard`. |
| PESO staff role access | Users with an `agencyId` cannot hold a PESO officer role simultaneously. |

---

## 4. Agency Earnings & Payout Splitting

When a job assigned to an agency worker is completed and the escrow is released, the platform automatically splits the payout between the **worker** and the **agency owner**.

### Calculation

```
platformFee  = escrowAmount × commissionRate
grossAmount  = escrowAmount − platformFee

share        = worker.workerSharePct > 0
               ? worker.workerSharePct
               : agency.defaultWorkerSharePct

workerAmount = grossAmount × share / 100
agencyAmount = grossAmount − workerAmount
```

**Commission rates** (configurable in Admin → App Settings):
- Base rate: **15%** (most categories)
- High-value categories: **20%**

**Default worker share:** `60` (agency keeps 40 %, worker receives 60 %)

### `AgencyStaffPayout` Record

One document is created per completed agency job:

```
AgencyStaffPayout {
  _id            ObjectId
  agencyId       ObjectId → AgencyProfile
  agencyOwnerId  ObjectId → User
  workerId       ObjectId → User
  jobId          ObjectId → Job  (unique — one record per job)
  grossAmount    Number   (after platform commission)
  workerAmount   Number   (worker's cut)
  agencyAmount   Number   (agency's margin)
  workerSharePct Number   (percentage applied; snapshot at time of payout)
  status         "pending" | "paid"
  paidAt         Date | null
  createdAt / updatedAt
}
```

### Reading Payout Data

**Agency owner view** (full ledger, filterable by worker):

```
GET /api/provider/agency/payouts?status=pending&workerId=<uid>&page=1
```

Returns all payout records for the agency with a totals aggregate.

**Worker's own view** (scoped to self — only returns their own records):

```
GET /api/provider/agency/payouts?status=paid&page=1
```

If the caller is not an agency owner, the endpoint automatically scopes results to `workerId = callerId`.

---

## 5. Business Organizations

Business Organizations are created by **client** accounts that need to manage service procurement across multiple locations, departments, or branches. Common examples: hotel chains, restaurant franchises, facilities management companies.

### 5.1 Activation

Unlike agencies, there is no separate "upgrade" step. Any client can call `POST /api/business/org` directly. The system creates both the `BusinessOrganization` document and the caller's `BusinessMember` record (role: `"owner"`) in one transaction.

> **Note:** A client cannot have more than one `BusinessOrganization`. Calling `createOrg` when one already exists returns a `409 Conflict`.

### 5.2 Data Model

**Collection:** `businessorganizations`  
**Mongoose model:** `BusinessOrganization`

```
BusinessOrganization {
  _id                  ObjectId
  ownerId              ObjectId → User   (indexed)
  name                 String      max 200 chars
  type                 "hotel" | "company" | "other"
  logo                 String (URL) | null
  locations            ILocation[] (EMBEDDED — see §5.3)
  defaultMonthlyBudget Number      (₱; used when a location has no individual budget)
  plan                 "starter" | "growth" | "pro" | "enterprise"
  planStatus           "active" | "past_due" | "cancelled"
  planActivatedAt      Date | null
  planExpiresAt        Date | null
  pendingPlan          String | null
  pendingPlanSessionId String | null
  createdAt / updatedAt
}
```

**Create:**

```
POST /api/business/org
Authorization: Bearer <client JWT>

Body:
{
  "name": "Acme Hotels",
  "type": "hotel",
  "defaultMonthlyBudget": 50000
}
```

**Update:**

```
PATCH /api/business/org
Body: { "orgId": "<id>", "name"?, "type"?, "logo"?, "defaultMonthlyBudget"? }
```

Requires `manager` or `owner` access.

### 5.3 Locations

Locations represent physical sites that post jobs and track spending independently.

```
ILocation {
  _id                  ObjectId
  label                String    max 100 chars  (e.g., "Main Branch", "Cebu Office")
  address              String    max 500 chars
  coordinates          { lat: Number, lng: Number }  (optional)
  monthlyBudget        Number    (₱; 0 = falls back to org defaultMonthlyBudget)
  alertThreshold       Number    0–100, default 80  (% spent before alert fires)
  isActive             Boolean   default true
  preferredProviderIds ObjectId[] → User  (blocklist/allowlist of trusted providers)
  managerId            ObjectId → User | null   (the member responsible for this location)
  allowedCategories    String[]  (restrict what job categories can be posted here)
}
```

**Location management routes:**

```
POST   /api/business/locations                              — add a location
PATCH  /api/business/locations  body:{orgId,locationId,...} — update location details or budget
DELETE /api/business/locations?orgId=x&locationId=y        — remove a location
GET    /api/business/locations/detail?orgId=x&locationId=y — get full location detail (client only)
```

All routes require `manager` or `owner` membership.

**Budget alerts:** When spending at a location reaches `alertThreshold`% of its monthly budget, the platform triggers a budget alert notification to the location manager and org owner.

### 5.4 Subscription Plans

Same plan tiers as agencies: `starter` · `growth` · `pro` · `enterprise`, tracked on `BusinessOrganization.plan` and `planStatus`.

---

## 6. Business Member Management

Unlike agency staff (embedded array), business members are stored in a **separate collection** (`businessmembers`). This allows richer querying (e.g., "which orgs does this user belong to?") and per-member attributes like `locationAccess`.

### 6.1 Member Roles

| Role | Capabilities |
|---|---|
| `owner` | Full control; assigned automatically at org creation; cannot be assigned manually |
| `manager` | Can add/update/remove members, manage locations, post jobs, view all reports |
| `supervisor` | Can manage assigned locations, review and approve job completions |
| `finance` | Read-only access to spending reports, invoices, and payout history |

**Access tiers used in code:**

- `requireManagerAccess(orgId, userId)` — passes for `owner` or `manager`
- `requireMemberAccess(orgId, userId)` — passes for any active member

### 6.2 Adding Members

Members are added by searching for the target client user's email, then submitting their `userId`:

**Step 1 — search by email:**

```
GET /api/business/members?orgId=<id>&searchEmail=worker@example.com
```

Returns `{ user: { _id, name, email, avatar } | null }`. Only returns clients (`role: "client"`).

**Step 2 — add:**

```
POST /api/business/members
Authorization: Bearer <owner or manager JWT>

Body:
{
  "orgId": "<orgId>",
  "userId": "<targetUserId>",
  "role": "manager",
  "locationAccess": ["<locationId1>", "<locationId2>"]   // optional
}
```

**Rules:**
- `role: "owner"` cannot be assigned via this endpoint — returns `400 Validation Error`.
- Duplicate membership returns `409 Conflict`.
- `locationAccess` is optional; an empty array (or omitted) means the member can access **all** locations.

**`BusinessMember` document schema:**

```
BusinessMember {
  _id            ObjectId
  orgId          ObjectId → BusinessOrganization  (indexed)
  userId         ObjectId → User
  role           "owner" | "manager" | "supervisor" | "finance"
  locationAccess ObjectId[]  (subset of location IDs; empty = all)
  invitedBy      ObjectId → User
  isActive       Boolean  default true  (indexed)
  createdAt / updatedAt
}

Index: { orgId, userId } unique
```

### 6.3 Updating a Member

The manager can change a member's role or adjust which locations they can access:

```
PATCH /api/business/members
Authorization: Bearer <owner or manager JWT>

Body:
{
  "orgId":         "<orgId>",
  "memberId":      "<businessMemberId>",
  "role":          "supervisor",      // optional
  "locationAccess": ["<locId>"]       // optional; replaces existing list
}
```

`role: "owner"` returns `400 Validation Error`.

### 6.4 Removing a Member

```
DELETE /api/business/members?orgId=<id>&memberId=<memberId>
Authorization: Bearer <owner or manager JWT>
```

Sets `BusinessMember.isActive = false` (soft-delete). The record is retained for audit purposes.

> **Note:** Removing a member does **not** affect their `User` document — business membership does not set any field on `User` (unlike agency staff which sets `User.agencyId`).

### 6.5 Location Access Control

`locationAccess` is a field on each `BusinessMember` that limits which of the org's locations this member can see and act on.

**Behavior:**
- `locationAccess: []` (empty) → member has access to **all** locations (full scope).
- `locationAccess: [<locId1>, <locId2>]` → member is restricted to those specific locations only.

This is especially useful for multi-branch setups where a supervisor manages only one city, or a finance person needs visibility only into a specific department's spending.

The `managerId` field on each `ILocation` is tracked separately — it marks the primary responsible member for that location. This is independent of `locationAccess` and is used primarily for notifications (budget alerts, job updates).

---

## 7. Admin Management

Admins with the appropriate staff capabilities can manage agencies and businesses from the admin panel.

### Capabilities

| Capability | Access to |
|---|---|
| `manage_agencies` | `/admin/agencies` and `/api/admin/agencies` / `[id]` |
| `manage_businesses` | `/admin/businesses` and `/api/admin/businesses` / `[id]` |

### Admin Agency Actions (`/api/admin/agencies/[id]`)

```
PATCH /api/admin/agencies/[id]

Body:
{
  "plan"?:                  "starter" | "growth" | "pro" | "enterprise",
  "planStatus"?:            "active" | "past_due" | "cancelled",
  "defaultWorkerSharePct"?: Number  (0-100),
  "suspendOwner"?:          Boolean
}
```

`suspendOwner: true` sets `User.isSuspended = true` on the agency's `providerId` user, blocking their login.

### Admin Business Actions (`/api/admin/businesses/[id]`)

```
PATCH /api/admin/businesses/[id]

Body:
{
  "plan"?:                 "starter" | "growth" | "pro" | "enterprise",
  "planStatus"?:           "active" | "past_due" | "cancelled",
  "defaultMonthlyBudget"?: Number,
  "suspendOwner"?:         Boolean
}
```

### Admin List Endpoints

```
GET /api/admin/agencies?page=1&limit=20&search=<name>&plan=<plan>&planStatus=<status>
GET /api/admin/businesses?page=1&limit=20&search=<name>&plan=<plan>&planStatus=<status>
```

Both return paginated results with owner details populated (`name`, `email`, `isSuspended`, `isVerified`).

---

## 8. API Reference

### Agency Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/provider/upgrade-agency` | Provider | Activate agency account (free) |
| `GET` | `/api/provider/agency/profile` | Provider | Get own agency profile |
| `POST` | `/api/provider/agency/profile` | Provider | Create agency profile |
| `PATCH` | `/api/provider/agency/profile` | Provider | Update agency profile |
| `GET` | `/api/provider/agency/staff` | Provider | List all staff (with populated user data) |
| `GET` | `/api/provider/agency/staff?searchEmail=x` | Provider | Look up a provider by email |
| `POST` | `/api/provider/agency/staff` | Provider (owner) | Add staff directly by userId |
| `PATCH` | `/api/provider/agency/staff` | Provider (owner) | Update a staff member's role |
| `DELETE` | `/api/provider/agency/staff?staffId=x` | Provider (owner) | Remove a staff member |
| `GET` | `/api/provider/agency/invites` | Provider (owner) | List pending email invites |
| `POST` | `/api/provider/agency/invites` | Provider (owner) | Send an email invite |
| `DELETE` | `/api/provider/agency/invites?id=x` | Provider (owner) | Revoke a pending invite |
| `POST /api/agency/invite/[token]/accept` | Provider | Accept an invite via token |
| `GET` | `/api/provider/agency/payouts` | Provider | View payout split records |
| `GET` | `/api/provider/agency/earnings` | Provider | Earnings summary and analytics |
| `GET` | `/api/provider/agency/dashboard` | Provider | Agency dashboard metrics |
| `GET` | `/api/provider/agency/analytics` | Provider | Performance analytics |
| `GET` | `/api/provider/agency/compliance` | Provider | Compliance status |
| `PATCH` | `/api/provider/agency/compliance` | Provider | Update compliance docs |
| `GET` | `/api/provider/agency/billing` | Provider | Subscription billing info |
| `GET` | `/api/provider/agency/jobs` | Provider | Jobs assigned to the agency |
| `GET` | `/api/provider/agency/clients` | Provider | Client relationship list |
| `GET` | `/api/provider/agency/schedule` | Provider | Agency calendar / schedule |
| `GET` | `/api/provider/agency/staff/performance` | Provider | Per-staff performance metrics |

### Business Organization Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/business/org` | Client | Get own business org |
| `POST` | `/api/business/org` | Client | Create business org |
| `PATCH` | `/api/business/org` | Client (manager+) | Update org details |
| `GET` | `/api/business/members?orgId=x` | Client (member) | List all org members |
| `GET` | `/api/business/members?orgId=x&searchEmail=y` | Client (manager+) | Search client by email |
| `POST` | `/api/business/members` | Client (manager+) | Add a member |
| `PATCH` | `/api/business/members` | Client (manager+) | Update member role / location access |
| `DELETE` | `/api/business/members?orgId=x&memberId=y` | Client (manager+) | Remove a member |
| `GET` | `/api/business/members/activity` | Client (member) | Member activity logs |
| `GET` | `/api/business/locations` | Client (member) | List locations |
| `POST` | `/api/business/locations` | Client (manager+) | Add a location |
| `PATCH` | `/api/business/locations` (body: `{orgId,locationId,...}`) | Client (manager+) | Update a location |
| `DELETE` | `/api/business/locations?orgId=x&locationId=y` | Client (manager+) | Remove a location |
| `GET` | `/api/business/locations/detail?orgId=x&locationId=y` | Client | Get full location detail |
| `GET` | `/api/business/jobs` | Client (member) | Jobs posted by the org |
| `GET` | `/api/business/dashboard` | Client (member) | Dashboard metrics |
| `GET` | `/api/business/analytics` | Client (member) | Spending / provider analytics |
| `GET` | `/api/business/escrow` | Client (member) | Escrow balance and history |
| `GET` | `/api/business/disputes` | Client (member) | Disputes under this org |
| `GET` | `/api/business/billing` | Client (owner) | Subscription billing info |
| `GET` | `/api/business/preferred-providers` | Client (member) | Preferred provider list |

### Admin Routes

| Method | Path | Capability | Description |
|---|---|---|---|
| `GET` | `/api/admin/agencies` | `manage_agencies` | List all agencies (paginated) |
| `GET` | `/api/admin/agencies/[id]` | `manage_agencies` | Get single agency details |
| `PATCH` | `/api/admin/agencies/[id]` | `manage_agencies` | Update plan / suspend owner |
| `GET` | `/api/admin/businesses` | `manage_businesses` | List all business orgs (paginated) |
| `GET` | `/api/admin/businesses/[id]` | `manage_businesses` | Get single org details |
| `PATCH` | `/api/admin/businesses/[id]` | `manage_businesses` | Update plan / suspend owner |
