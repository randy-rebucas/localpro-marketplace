# LocalPro Marketplace — API Reference

> **Base URL:** `https://<your-domain>` (or `http://localhost:3000` for local dev)
>
> All authenticated requests require a valid JWT stored in HttpOnly cookies. Include `credentials: 'include'` in every `fetch()` call to send cookies automatically.

---

## Authentication

All protected endpoints return `401 Unauthorized` if no valid session cookie is present. Most endpoints also enforce role-based access — callers will receive `403 Forbidden` if their role lacks permission.

### Cookies

| Cookie | Description |
|---|---|
| `access_token` | Short-lived JWT (15 min) |
| `refresh_token` | Long-lived JWT (7 days) |

---

## Quick-start: API Helper

```js
const API = 'https://<your-domain>';

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

---

## Table of Contents

1. [Auth](#1-auth)
2. [Current User & Preferences](#2-current-user--preferences)
3. [Jobs](#3-jobs)
4. [Quotes](#4-quotes)
5. [Quote Templates](#5-quote-templates)
6. [Messages & Chat](#6-messages--chat)
7. [Notifications](#7-notifications)
8. [Payments & Wallet](#8-payments--wallet)
9. [Transactions](#9-transactions)
10. [Favorites](#10-favorites)
11. [Reviews](#11-reviews)
12. [Disputes](#12-disputes)
13. [KYC](#13-kyc)
14. [Search & Skills](#14-search--skills)
15. [Categories](#15-categories)
16. [Announcements](#16-announcements)
17. [Loyalty & Referrals](#17-loyalty--referrals)
18. [Recurring Schedules](#18-recurring-schedules)
19. [Consultations](#19-consultations)
20. [Provider Profile](#20-provider-profile)
21. [Provider Boost](#21-provider-boost)
22. [Provider Training](#22-provider-training)
23. [Provider Agency](#23-provider-agency)
24. [Agency Invites](#24-agency-invites)
25. [Support Chat](#25-support-chat)
26. [Knowledge Base](#26-knowledge-base)
27. [Job Applications (PESO)](#27-job-applications-peso)
28. [File Upload](#28-file-upload)
29. [Payouts](#29-payouts)
30. [Recommendations](#30-recommendations)
31. [Business / Organization](#31-business--organization)
32. [AI Endpoints](#32-ai-endpoints)
33. [PESO Employment Office](#33-peso-employment-office)
34. [Admin](#34-admin)
35. [Public (No Auth)](#35-public-no-auth)
36. [Utility Endpoints](#36-utility-endpoints)

---

## 1. Auth

### POST `/api/auth/register`
Register a new account.

**Body**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "client | provider"
}
```

**Response** `201`
```json
{ "message": "Registered successfully" }
```

---

### POST `/api/auth/login`
Log in with email and password. Sets `access_token` + `refresh_token` cookies.

**Body**
```json
{ "email": "string", "password": "string" }
```

**Response** `200`
```json
{ "message": "Logged in", "user": { "id": "...", "name": "...", "role": "..." } }
```

---

### POST `/api/auth/logout`
Clears session cookies.

**Response** `200`
```json
{ "message": "Logged out" }
```

---

### POST `/api/auth/refresh`
Exchanges refresh token for a new access token. Call this on `401` responses and retry.

**Response** `200`
```json
{ "message": "Token refreshed" }
```

---

### POST `/api/auth/phone/send`
Send OTP to a phone number via Twilio.

**Body**
```json
{ "phone": "+639XXXXXXXXX" }
```

**Response** `200`
```json
{ "message": "OTP sent" }
```

---

### POST `/api/auth/phone/verify`
Verify OTP and issue session cookies.

**Body**
```json
{ "phone": "+639XXXXXXXXX", "code": "123456" }
```

**Response** `200`
```json
{ "message": "Verified", "user": { "id": "...", "name": "...", "role": "..." } }
```

---

### GET `/api/auth/facebook`
Redirects to Facebook OAuth dialog.

---

### GET `/api/auth/facebook/callback`
OAuth callback — handled server-side, sets session cookies, redirects to dashboard.

---

### POST `/api/auth/verify-email`
Submit email verification token (received via email link).

**Body**
```json
{ "token": "string" }
```

**Response** `200`
```json
{ "message": "Email verified" }
```

---

### POST `/api/auth/forgot-password`
Send password-reset email.

**Body**
```json
{ "email": "string" }
```

**Response** `200`
```json
{ "message": "Reset email sent" }
```

---

### POST `/api/auth/reset-password`
Reset password with token from email link.

**Body**
```json
{ "token": "string", "password": "string" }
```

**Response** `200`
```json
{ "message": "Password reset" }
```

---

## 2. Current User & Preferences

### GET `/api/auth/me`
Returns the authenticated user's profile.

**Response** `200`
```json
{
  "_id": "...",
  "name": "string",
  "email": "string",
  "role": "client | provider | admin | peso",
  "isEmailVerified": true,
  "avatar": "url | null",
  "accountType": "personal | business",
  "kycStatus": "none | pending | approved | rejected"
}
```

---

### POST `/api/auth/me/addresses`
Add a saved address (max 10).

**Body**
```json
{
  "label": "Home",
  "address": "123 Main St",
  "coordinates": { "lat": 14.5, "lng": 121.0 }
}
```

**Response** `200`
```json
{ "addresses": [ ... ] }
```

---

### PATCH `/api/auth/me/addresses/[id]`
Update a saved address or set it as default.

**Body** (all fields optional)
```json
{
  "label": "Office",
  "address": "456 Ayala Ave",
  "isDefault": true,
  "coordinates": { "lat": 14.5, "lng": 121.0 }
}
```

**Response** `200`
```json
{ "addresses": [ ... ] }
```

---

### DELETE `/api/auth/me/addresses/[id]`
Delete a saved address.

**Response** `200`
```json
{ "addresses": [ ... ] }
```

---

### GET `/api/auth/me/preferences`
Get the user's full notification and display preferences.

**Response** `200`
```json
{
  "preferences": {
    "emailNotifications": true,
    "pushNotifications": true,
    "smsNotifications": false,
    "marketingEmails": true,
    "profileVisible": true,
    "emailCategories": {
      "jobUpdates": true,
      "quoteAlerts": true,
      "paymentAlerts": true,
      "messages": true
    }
  }
}
```

---

### PUT `/api/auth/me/preferences`
Update notification and display preferences (partial update accepted).

**Body** — any subset of preference fields (see GET response above, plus provider-only fields `newJobAlerts`, `quoteExpiryReminders`, `jobInviteAlerts`, `reviewAlerts`, `instantBooking`, `autoReadReceipt`).

**Response** `200`
```json
{ "preferences": { ... } }
```

---

### GET `/api/user/settings`
Get user notification and visibility preferences (simplified legacy endpoint).

**Response** `200`
```json
{
  "preferences": {
    "emailNotifications": true,
    "pushNotifications": true,
    "profileVisibility": "public"
  }
}
```

---

### PUT `/api/user/settings`
Update preferences (partial update accepted).

**Body** — any subset of the preferences object above.

**Response** `200`
```json
{ "preferences": { ... } }
```

---

### POST `/api/user/delete-request`
Submit a GDPR / Data Privacy Act data-deletion request. Rate-limited to 1 per 7 days.

**Body** (optional)
```json
{ "reason": "string" }
```

**Response** `200`
```json
{ "message": "Deletion request submitted. Processing takes up to 30 days." }
```

---

### GET `/api/user/export`
Download a JSON bundle of all personal data (GDPR / Data Privacy Act). Rate-limited to 1 per 24 hours.

**Response** `200` — `application/json` file download containing user profile, jobs, and messages.

---

## 3. Jobs

### GET `/api/jobs`
List jobs. Behavior differs by role — clients see their own jobs, providers see open jobs.

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status |
| `category` | string | Filter by category ID |
| `page` | number | Default `1` |
| `limit` | number | Default `10` |
| `aiRank` | boolean | Provider only — GPT-4o-mini ranked results |

**Response** `200`
```json
{
  "data": [ { "_id": "...", "title": "...", "status": "...", ... } ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### POST `/api/jobs`
Create a new job (client only).

**Body**
```json
{
  "title": "string",
  "description": "string",
  "category": "categoryId",
  "budget": 1500,
  "location": "string",
  "coordinates": { "lat": 14.5, "lng": 121.0 },
  "tags": ["plumbing", "repair"]
}
```

**Response** `201`
```json
{ "_id": "...", "title": "...", "status": "open", ... }
```

---

### GET `/api/jobs/[id]`
Get a single job by ID.

**Response** `200` — full job document.

---

### PUT `/api/jobs/[id]`
Update a job (client only, must own it, job must be `open`).

**Body** — partial job fields.

**Response** `200` — updated job.

---

### DELETE `/api/jobs/[id]`
Delete / cancel a job (client only).

**Response** `200`
```json
{ "message": "Job deleted" }
```

---

### POST `/api/jobs/[id]/cancel`
Client cancels a job. Allowed when status is `open` or `assigned`. Automatically refunds escrow if already funded.

**Body**
```json
{ "reason": "string (min 5 chars)" }
```

**Response** `200`
```json
{ "message": "Job cancelled", "job": { ... } }
```

---

### PATCH `/api/jobs/[id]/fund`
Initiate PayMongo Checkout Session for escrow funding (client only). Escrow amount is driven by `job.budget` server-side.

**Response** `200`

Live (with `PAYMONGO_SECRET_KEY`):
```json
{
  "simulated": false,
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "checkoutSessionId": "cs_...",
  "referenceNumber": "string",
  "amountPHP": 1500
}
```

Dev (no key):
```json
{ "simulated": true, "message": "Escrow funded immediately (dev mode)" }
```

---

### POST `/api/jobs/[id]/fund-wallet`
Fund escrow using the client's platform wallet balance (client only).

**Body** (optional)
```json
{ "amount": 1500 }
```

**Response** `200`
```json
{ "message": "Escrow funded from wallet", "job": { ... } }
```

---

### PATCH `/api/jobs/[id]/start`
Provider starts the job. Requires at least one before photo (max 3). Transitions job to `in_progress`.

**Body**
```json
{ "beforePhotos": ["url1", "url2"] }
```

**Response** `200`
```json
{ "message": "Job started", "job": { ... } }
```

---

### PATCH `/api/jobs/[id]/mark-complete`
Provider marks job as completed. Requires at least one after photo (max 3). Transitions job to `completed`.

**Body**
```json
{ "afterPhotos": ["url1", "url2"] }
```

**Response** `200`
```json
{ "message": "Job marked as completed", "job": { ... } }
```

---

### PATCH `/api/jobs/[id]/complete`
Client releases escrow to provider (client only). Use after provider marks complete.

**Response** `200`
```json
{ "message": "Escrow released to provider", ... }
```

---

### POST `/api/jobs/[id]/partial-release`
Client releases a partial amount from escrow (client only). Job must be `completed` with funded escrow.

**Body**
```json
{ "amount": 800.00 }
```

**Response** `200`
```json
{ "message": "Partial escrow released", "released": 800, "remaining": 700 }
```

---

### GET `/api/jobs/[id]/quotes`
Get all quotes submitted for a job (job owner only).

**Response** `200` — array of quote objects.

---

### POST `/api/jobs/[id]/withdraw`
Provider withdraws from a funded job (reverts job to `open`).

**Body**
```json
{ "reason": "string" }
```

**Response** `200`
```json
{ "message": "Withdrawn" }
```

---

### GET `/api/jobs/[id]/milestones`
Get milestone list for a job (client, provider, or admin).

**Response** `200`
```json
{ "milestones": [ { "_id": "...", "title": "...", "amount": 500, "status": "pending | released" } ] }
```

---

### POST `/api/jobs/[id]/milestones`
Add a milestone to a funded job (client only, max amount must not exceed escrow balance).

**Body**
```json
{
  "title": "string (3–100 chars)",
  "amount": 500,
  "description": "optional (max 500 chars)"
}
```

**Response** `201`
```json
{ "milestones": [ ... ] }
```

---

### POST `/api/jobs/[id]/milestones/[mId]/release`
Release a single pending milestone, crediting the provider's wallet minus 10% commission. Job must be `completed` with funded escrow.

**Response** `200`
```json
{ "message": "Milestone released", "milestone": { ... } }
```

---

## 4. Quotes

### GET `/api/quotes`
Provider — returns the list of job IDs the provider has already quoted.

**Response** `200`
```json
{ "quotedJobIds": ["jobId1", "jobId2"] }
```

---

### POST `/api/quotes`
Provider submits a quote for a job.

**Body**
```json
{
  "jobId": "string",
  "proposedAmount": 2000,
  "laborCost": 1500,
  "materialsCost": 500,
  "timeline": "3 days",
  "milestones": [ { "title": "...", "amount": 500 } ],
  "notes": "string",
  "proposalDocUrl": "url",
  "sitePhotos": ["url1"],
  "message": "string"
}
```

**Response** `201` — quote object.

---

### GET `/api/quotes/[id]`
Get a single quote by ID.

**Response** `200` — quote object.

---

### PUT `/api/quotes/[id]`
Update a quote (provider only, before client accepts).

**Body** — partial quote fields.

**Response** `200` — updated quote.

---

### DELETE `/api/quotes/[id]`
Retract a quote (provider only).

**Response** `200`
```json
{ "message": "Quote retracted" }
```

---

### POST `/api/quotes/[id]/accept`
Client accepts a quote. Transitions job status to `quoted` → `accepted`.

**Response** `200` — updated job + quote.

---

### PATCH `/api/quotes/[id]/reject`
Client explicitly rejects a quote.

**Response** `200`
```json
{ "quote": { ... }, "message": "Quote rejected" }
```

---

## 5. Quote Templates

### GET `/api/quote-templates`
List provider's saved templates.

**Response** `200` — array of template objects.

---

### POST `/api/quote-templates`
Create a template (max 20 per provider).

**Body**
```json
{
  "name": "Standard Plumbing Quote",
  "laborCost": 1500,
  "materialsCost": 500,
  "timeline": "2 days",
  "milestones": [],
  "notes": "string"
}
```

**Response** `201` — template object.

---

### PATCH `/api/quote-templates/[id]`
Update a template.

**Body** — partial template fields.

**Response** `200` — updated template.

---

### DELETE `/api/quote-templates/[id]`
Delete a template.

**Response** `200`
```json
{ "success": true }
```

---

## 6. Messages & Chat

All thread IDs follow the convention:
- **Job thread:** `threadId = jobId`
- **Support thread:** `threadId = "support:<userId>"`

### GET `/api/messages`
Get total unread message count.

**Response** `200`
```json
{ "unreadCount": 3 }
```

---

### GET `/api/messages/threads`
List all message threads for the current user.

**Response** `200`
```json
{
  "threads": [
    {
      "threadId": "jobId",
      "jobTitle": "Fix leaking pipe",
      "lastMessage": { "body": "...", "createdAt": "..." },
      "unreadCount": 2,
      "otherParty": { "_id": "...", "name": "...", "avatar": "..." }
    }
  ]
}
```

---

### GET `/api/messages/[threadId]`
Get all messages in a thread.

**Response** `200` — array of message objects.

---

### POST `/api/messages/[threadId]`
Send a message.

**Body**
```json
{ "body": "Hi, when can you start?" }
```

**Response** `201` — message object.

---

### POST `/api/messages/[threadId]/attachment`
Upload a file attachment (max 10 MB). Send as `multipart/form-data`.

**Form field:** `file`

**Response** `201` — message object with file info.

---

### GET `/api/messages/stream/[threadId]` *(SSE)*
Server-Sent Events stream for real-time messages.

```js
const es = new EventSource(`${API}/api/messages/stream/${threadId}`, {
  withCredentials: true,
});
es.onmessage = (e) => {
  const message = JSON.parse(e.data);
};
```

---

## 7. Notifications

### GET `/api/notifications`
List current user's notifications.

**Response** `200`
```json
{
  "notifications": [
    { "_id": "...", "type": "...", "message": "...", "read": false, "createdAt": "..." }
  ],
  "unreadCount": 5
}
```

---

### PATCH `/api/notifications`
Mark **all** notifications as read.

**Response** `200`
```json
{ "success": true }
```

---

### PATCH `/api/notifications/[id]`
Mark a single notification as read (legacy route).

**Response** `200`
```json
{ "success": true }
```

---

### PATCH `/api/notifications/[id]/read`
Mark a single notification as read (preferred route).

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/notifications/stream` *(SSE)*
Real-time notification stream.

```js
const es = new EventSource(`${API}/api/notifications/stream`, {
  withCredentials: true,
});
es.onmessage = (e) => {
  const notification = JSON.parse(e.data);
};
```

---

### GET `/api/notifications/preferences`
Get granular notification preferences per channel and category.

**Response** `200`
```json
{
  "preferences": [
    { "channel": "email | push | in_app", "category": "job_updates | messages | payments | reviews | marketing | system", "enabled": true }
  ]
}
```

---

### PUT `/api/notifications/preferences`
Update a specific channel+category preference.

**Body**
```json
{ "channel": "email", "category": "marketing", "enabled": false }
```

**Response** `200`
```json
{ "preference": { ... } }
```

---

## 8. Payments & Wallet

### POST `/api/payments`
Initiate PayMongo Checkout Session for escrow funding.

**Body**
```json
{ "jobId": "string" }
```

**Response** `201`
```json
{
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "sessionId": "cs_..."
}
```
> In dev (no `PAYMONGO_SECRET_KEY`), escrow is funded immediately and `{ "simulated": true }` is returned.

---

### GET `/api/payments/[sessionId]`
Poll payment status.

**Query:** `jobId` (optional) — triggers escrow confirmation if provided.

**Response** `200`
```json
{
  "payment": { ... },
  "liveStatus": "paid | unpaid | expired"
}
```

---

### GET `/api/wallet`
Get wallet balance and recent activity.

**Response** `200`
```json
{
  "balance": 5000,
  "reservedAmount": 200,
  "transactions": [ ... ],
  "withdrawals": [ ... ]
}
```

---

### GET `/api/wallet/transactions`
Paginated wallet-specific transaction history.

**Query:** `page` (default `1`), `limit` (default `20`, max `100`)

**Response** `200`
```json
{
  "transactions": [ ... ],
  "page": 1,
  "limit": 20
}
```

---

### POST `/api/wallet/topup`
Create a PayMongo checkout session to top up the wallet balance. Min ₱100, max ₱100,000.

**Body**
```json
{ "amount": 500 }
```

**Response** `201`
```json
{
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "sessionId": "cs_..."
}
```

---

### GET `/api/wallet/topup/verify`
Verify and confirm a wallet top-up session.

**Query:** `sessionId` (required)

**Response** `200`
```json
{ "credited": true, "amount": 500, "balance": 5500 }
```

---

### POST `/api/wallet/withdraw`
Request a withdrawal to a bank account.

**Body**
```json
{
  "amount": 2000,
  "bankName": "BDO",
  "accountNumber": "1234567890",
  "accountName": "Juan dela Cruz"
}
```

**Response** `201`
```json
{ "message": "Withdrawal request submitted", "withdrawal": { ... } }
```

---

## 9. Transactions

### GET `/api/transactions`
Paginated transaction history (filtered by role).

**Query**

| Param | Type | Default |
|---|---|---|
| `page` | number | `1` |
| `limit` | number | `10` |

**Response** `200`
```json
{
  "data": [ ... ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### GET `/api/transactions/export`
Download transaction history as CSV.

**Response** `200` — `text/csv` file download.

---

## 10. Favorites

### GET `/api/favorites`
List favorite providers.

**Response** `200` — array of enriched provider profiles.

---

### POST `/api/favorites`
Add a provider to favorites.

**Body**
```json
{ "providerId": "string" }
```

**Response** `200`
```json
{ "favorited": true }
```

---

### DELETE `/api/favorites/[providerId]`
Remove provider from favorites.

**Response** `200`
```json
{ "favorited": false }
```

---

## 11. Reviews

### GET `/api/reviews`
List reviews. Optionally filter by provider.

**Query:** `providerId` (optional)

**Response** `200` — array of review objects.

---

### POST `/api/reviews`
Submit a review (client only, after job completion).

**Body**
```json
{
  "jobId": "string",
  "rating": 5,
  "feedback": "Great work!",
  "breakdown": {
    "quality": 5,
    "professionalism": 5,
    "punctuality": 4,
    "communication": 5
  }
}
```

**Response** `201` — review object.

---

### POST `/api/reviews/[id]/respond`
Provider adds a public response to a review they received.

**Body**
```json
{ "response": "Thank you for the kind words!" }
```

**Response** `200` — updated review object.

---

### PUT `/api/reviews/[id]/moderate`
Admin/staff hides or restores a review.

**Body**
```json
{ "hide": true, "reason": "Violates community guidelines" }
```

**Response** `200` — updated review object.

---

### GET `/api/providers/[id]/reviews`
Paginated reviews for a specific provider.

**Query:** `page`, `limit`

**Response** `200`
```json
{ "reviews": [ ... ], "total": 20, "page": 1, "limit": 10 }
```

---

## 12. Disputes

### GET `/api/disputes`
List the current user's disputes (client sees disputes they raised, provider sees disputes on their jobs).

**Response** `200` — array of dispute objects.

---

### POST `/api/disputes`
Open a dispute on a job.

**Body**
```json
{
  "jobId": "string",
  "reason": "string (min 20 chars)",
  "evidence": ["url1", "url2"]
}
```

**Response** `201` — dispute object.

---

## 13. KYC

### POST `/api/kyc`
Submit KYC documents for identity verification. Documents must be Cloudinary URLs.

**Body**
```json
{
  "documents": [
    {
      "type": "government_id | tesda_certificate | business_permit | selfie_with_id | other",
      "url": "https://res.cloudinary.com/..."
    }
  ]
}
```

**Response** `200`
```json
{ "kycStatus": "pending", "message": "KYC documents submitted. Under review." }
```

---

## 14. Search & Skills

### GET `/api/search`
Role-aware search across jobs, users, and providers.

**Query:** `q` (min 2 characters, required)

**Response** `200`
```json
{ "results": [ { "type": "job | user | provider", ... } ] }
```

---

### GET `/api/skills`
Search available skills.

**Query:** `q`, `limit` (max 20)

**Response** `200`
```json
{ "skills": ["Plumbing", "Electrical", ...] }
```

---

## 15. Categories

### GET `/api/categories`
List all active service categories (cached 24 h, no auth required).

**Response** `200`
```json
[
  { "_id": "...", "name": "Plumbing", "icon": "🔧", "description": "..." }
]
```

---

## 16. Announcements

### GET `/api/announcements`
List active announcements for the current user's role.

**Response** `200`
```json
{
  "announcements": [
    { "_id": "...", "title": "...", "message": "...", "type": "info | warning | success | danger" }
  ]
}
```

---

## 17. Loyalty & Referrals

### GET `/api/loyalty`
Get loyalty points and last 20 transactions.

**Response** `200`
```json
{
  "account": { "points": 120, "tier": "bronze | silver | gold" },
  "ledger": [ { "points": 10, "reason": "...", "createdAt": "..." } ]
}
```

---

### GET `/api/loyalty/referral`
Get referral code and stats.

**Response** `200`
```json
{
  "referralCode": "ABC123",
  "referralLink": "https://...",
  "referredCount": 3
}
```

---

### POST `/api/loyalty/redeem`
Redeem loyalty points for wallet credit.

**Body**
```json
{ "points": 100 }
```

**Response** `200`
```json
{ "account": { "points": 20, "tier": "bronze" } }
```

---

## 18. Recurring Schedules

### GET `/api/recurring`
List all recurring schedules for the current user.

**Response** `200`
```json
{ "data": [ ... ] }
```

---

### POST `/api/recurring`
Create a new recurring schedule (client only).

**Body**
```json
{
  "title": "Monthly AC cleaning",
  "category": "categoryId",
  "description": "string (min 20 chars)",
  "budget": 500,
  "location": "string",
  "frequency": "weekly | monthly",
  "scheduleDate": "2026-05-01",
  "autoPayEnabled": true,
  "specialInstructions": "string",
  "maxRuns": 12,
  "providerId": "optional — lock to specific provider"
}
```

**Response** `201` — recurring schedule object.

---

### GET `/api/recurring/past-providers`
List providers from completed jobs (for auto-booking suggestions).

**Response** `200`
```json
{ "providers": [ ... ] }
```

---

### GET `/api/recurring/[id]`
Get a single recurring schedule.

**Response** `200` — recurring schedule object.

---

### PUT `/api/recurring/[id]`
Update a schedule.

**Body**
```json
{
  "title": "string",
  "description": "string",
  "budget": 500,
  "location": "string",
  "maxRuns": 12,
  "autoPayEnabled": true,
  "providerId": "string"
}
```

**Response** `200` — updated schedule.

---

### PATCH `/api/recurring/[id]`
Control a schedule.

**Body**
```json
{ "action": "pause | resume | cancel" }
```

**Response** `200` — updated schedule.

---

### GET `/api/recurring/saved-method`
Get saved payment method info.

**Response** `200`
```json
{ "savedMethod": { "last4": "1234", "brand": "Visa" } }
```

---

### DELETE `/api/recurring/saved-method`
Remove saved payment method.

**Response** `200`
```json
{ "ok": true }
```

---

## 19. Consultations

### GET `/api/consultations`
List consultations.

**Query:** `status` (optional), `page`, `limit`

**Response** `200`
```json
{ "data": [ ... ], "total": 10, "page": 1, "limit": 10 }
```

---

### POST `/api/consultations`
Create a consultation request (client or provider).

**Body**
```json
{
  "targetUserId": "string",
  "type": "site_inspection | chat",
  "title": "string",
  "description": "string",
  "location": "string",
  "coordinates": { "type": "Point", "coordinates": [121.0, 14.5] },
  "photos": ["url1", "url2"]
}
```

**Response** `201` — consultation object.

---

### GET `/api/consultations/[id]`
Get a single consultation.

**Response** `200` — consultation object.

---

### PUT `/api/consultations/[id]/respond`
Provider responds to a consultation.

**Body**
```json
{
  "action": "accept | decline",
  "estimateAmount": 1500,
  "estimateNote": "Includes materials"
}
```

**Response** `200` — updated consultation.

---

### POST `/api/consultations/[id]/messages`
Send message in a consultation thread.

**Body**
```json
{ "body": "string" }
```

**Response** `201` — message object.

---

### POST `/api/consultations/[id]/convert-to-job`
Convert an accepted consultation into a job (client only).

**Body**
```json
{
  "title": "optional override title",
  "description": "optional override description",
  "budget": 2000,
  "scheduleDate": "2026-05-01T09:00:00Z",
  "specialInstructions": "optional"
}
```

**Response** `201`
```json
{ "job": { "_id": "...", "title": "...", "status": "open", ... } }
```

---

## 20. Provider Profile

### GET `/api/providers`
List all approved, non-suspended providers.

**Query:** `search` (string), `availability` (`available | busy | unavailable`)

**Response** `200` — array of provider objects with `isFavorite` flag for clients.

---

### GET `/api/providers/[id]/profile`
Public provider profile with review breakdown and 5-star streak.

**Response** `200`
```json
{
  "userId": "...",
  "bio": "...",
  "skills": [...],
  "avgRating": 4.8,
  "completedJobCount": 43,
  "breakdown": { "quality": 4.9, "professionalism": 4.8, "punctuality": 4.7, "communication": 4.8 },
  "streak": 7
}
```

---

### GET `/api/providers/profile`
Own provider profile (provider only).

**Response** `200` — full provider profile document.

---

### PUT `/api/providers/profile`
Update own profile (provider only).

**Body** (all fields optional)
```json
{
  "bio": "string (max 1000)",
  "skills": [ { "skill": "Plumbing", "yearsExperience": 3, "hourlyRate": "500" } ],
  "yearsExperience": 5,
  "hourlyRate": 500,
  "availabilityStatus": "available | busy | unavailable",
  "schedule": {
    "mon": { "enabled": true, "from": "08:00", "to": "17:00" },
    "tue": { "enabled": true, "from": "08:00", "to": "17:00" }
  },
  "portfolioItems": [ { "title": "...", "description": "...", "imageUrl": "url" } ],
  "maxConcurrentJobs": 5
}
```

**Response** `200` — updated profile.

---

### POST `/api/providers/profile/generate-bio`
AI-generated bio from skills, service areas, and experience *(Gold tier or above only)*.

**Response** `200`
```json
{ "bio": "Experienced plumber with 5 years serving Metro Manila..." }
```

**Response** `403` (if not Gold+)
```json
{ "error": "...", "upgradeRequired": true, "currentTier": "silver", "requiredTier": "gold" }
```

---

### POST `/api/providers/profile/service-areas`
Add a service area (max 10).

**Body**
```json
{
  "label": "Quezon City",
  "address": "string",
  "coordinates": { "lat": 14.6, "lng": 121.1 }
}
```

**Response** `201` — updated service areas array.

---

### DELETE `/api/providers/profile/service-areas/[id]`
Remove a service area.

**Response** `200` — updated service areas array.

---

## 21. Provider Boost

> Provider only. Boosts are charged from the provider's wallet.

### GET `/api/provider/boost`
Returns active boosts, purchase history, prices, and current wallet balance.

**Response** `200`
```json
{
  "activeBoosts": [ { "_id": "...", "type": "...", "expiresAt": "..." } ],
  "history": [ ... ],
  "balance": 5000,
  "prices": {
    "featured_provider": 299,
    "top_search": 199,
    "homepage_highlight": 499
  }
}
```

---

### POST `/api/provider/boost`
Purchase a boost (deducted from wallet).

**Body**
```json
{ "type": "featured_provider | top_search | homepage_highlight" }
```

**Response** `201`
```json
{ "boost": { "_id": "...", "type": "...", "expiresAt": "..." } }
```

---

### DELETE `/api/provider/boost/[id]`
Cancel an active boost. No refund is issued.

**Response** `200`
```json
{ "message": "Boost cancelled" }
```

---

## 22. Provider Training

> Provider only. Training improves tier and unlocks platform features.

### GET `/api/provider/training`
List all published courses with enrollment status for the requesting provider.

**Query:** `category` (optional filter)

**Response** `200`
```json
{ "courses": [ { "_id": "...", "title": "...", "category": "...", "price": 0, "enrolled": false } ] }
```

---

### GET `/api/provider/training/[id]`
Get a single course with lessons and enrollment details.

**Response** `200` — full course object.

---

### POST `/api/provider/training/[id]/enroll`
Enroll in a free course.

**Response** `201`
```json
{ "enrollment": { "_id": "...", "courseId": "...", "progress": 0 } }
```

---

### POST `/api/provider/training/[id]/checkout`
Create a PayMongo checkout session for a paid course.

**Response** `201`
```json
{ "checkoutUrl": "https://checkout.paymongo.com/...", "sessionId": "cs_..." }
```

---

### POST `/api/provider/training/[id]/activate`
Activate a course after payment confirmation.

**Response** `200`
```json
{ "enrollment": { ... } }
```

---

### GET `/api/provider/training/[id]/certificate`
Download certificate of completion (course must be 100% complete).

**Response** `200` — PDF file download.

---

### GET `/api/provider/training/enrollments`
List all courses the provider is enrolled in.

**Response** `200`
```json
{ "enrollments": [ { "_id": "...", "courseId": "...", "progress": 75, "completedAt": null } ] }
```

---

### POST `/api/provider/training/enrollments/[enrollmentId]/complete`
Mark an enrollment as fully completed.

**Response** `200` — updated enrollment.

---

### POST `/api/provider/training/enrollments/[enrollmentId]/lessons/[lessonId]/complete`
Mark an individual lesson as completed.

**Response** `200` — updated enrollment with new progress %.

---

## 23. Provider Agency

> Agency owners only (providers who have upgraded via `POST /api/provider/upgrade-agency`).

### POST `/api/provider/upgrade-agency`
Activate a free Agency account for the authenticated provider. Sets `accountType` to `business`.

**Response** `200`
```json
{ "message": "Agency account activated", "accountType": "business" }
```

---

### GET `/api/provider/agency/dashboard`
Agency dashboard: active jobs, in-progress count, completions this month, earnings summary, staff list.

**Response** `200` — dashboard stats object.

---

### GET `/api/provider/agency/profile`
Get the agency profile.

**Response** `200` — agency profile object.

---

### PUT `/api/provider/agency/profile`
Update agency profile (name, type, logo, defaultWorkerSharePct, etc.).

**Response** `200` — updated profile.

---

### GET `/api/provider/agency/staff`
List agency staff members.

**Query:** `searchEmail` (optional)

**Response** `200` — array of staff objects with user info.

---

### DELETE `/api/provider/agency/staff`
Remove a staff member from the agency.

**Query:** `staffId` (required)

**Response** `200`
```json
{ "message": "Staff member removed" }
```

---

### POST `/api/provider/agency/invites`
Send an email invite to a new staff member.

**Body**
```json
{ "email": "staff@example.com", "role": "worker | dispatcher | supervisor | finance" }
```

**Response** `201`
```json
{ "invite": { "_id": "...", "invitedEmail": "...", "expiresAt": "..." } }
```

---

### GET `/api/provider/agency/jobs`
List jobs assigned to any agency staff member.

**Response** `200` — paginated job list.

---

### POST `/api/provider/agency/jobs/[id]/assign`
Assign a job to a specific staff member.

**Body**
```json
{ "staffUserId": "string" }
```

**Response** `200` — updated job.

---

### PATCH `/api/provider/agency/jobs/[id]/status`
Update job status on behalf of the agency.

**Body**
```json
{ "status": "in_progress | completed", "photos": ["url1"] }
```

**Response** `200` — updated job.

---

### GET `/api/provider/agency/earnings`
Agency earnings summary and payout history.

**Response** `200` — earnings object.

---

### GET `/api/provider/agency/payouts`
List payout requests for the agency.

**Response** `200` — payout list.

---

### GET `/api/provider/agency/analytics`
Agency performance analytics.

**Response** `200` — analytics data.

---

### GET `/api/provider/agency/reviews`
All reviews for agency jobs.

**Response** `200` — reviews array.

---

### GET `/api/provider/agency/quotations`
All quotes submitted by agency staff.

**Response** `200` — quotes array.

---

### GET `/api/provider/agency/clients`
Unique clients the agency has worked with.

**Response** `200` — client list.

---

### GET `/api/provider/agency/services`
Services the agency offers.

**Response** `200` — services list.

---

### PUT `/api/provider/agency/services`
Update the agency's offered services.

**Response** `200` — updated services.

---

### GET `/api/provider/agency/schedule`
Agency team schedule / calendar.

**Response** `200` — schedule data.

---

### GET `/api/provider/agency/equipment`
Agency equipment inventory.

**Response** `200` — equipment list.

---

### GET `/api/provider/agency/compliance`
Agency compliance status and document checklist.

**Response** `200` — compliance object.

---

### GET `/api/provider/agency/billing`
Agency billing plan and status.

**Response** `200` — billing object.

---

### POST `/api/provider/agency/billing/checkout`
Create a PayPal order to upgrade the agency plan.

**Body**
```json
{ "plan": "starter | growth | pro | enterprise" }
```

**Response** `201`
```json
{ "orderId": "PAYPAL-ORDER-ID", "approveUrl": "https://www.paypal.com/..." }
```

---

### POST `/api/provider/agency/billing/confirm`
Confirm PayPal order and activate the agency plan.

**Body**
```json
{ "orderId": "PAYPAL-ORDER-ID" }
```

**Response** `200`
```json
{ "activated": true, "plan": "growth" }
```

---

### GET `/api/provider/agency/settings`
Agency settings.

**Response** `200` — settings object.

---

### PUT `/api/provider/agency/settings`
Update agency settings.

**Response** `200` — updated settings.

---

### GET `/api/provider/agency/staff/performance`
Staff performance stats (jobs completed, ratings, on-time rate).

**Response** `200` — performance data per staff member.

---

## 24. Agency Invites

### GET `/api/agency/invite/[token]`
Public endpoint — fetch invite details for the acceptance page. Returns invite info and whether the invited email already has an account.

**Response** `200`
```json
{
  "invite": { "invitedEmail": "...", "role": "worker", "agencyName": "...", "expiresAt": "..." },
  "existingUser": { "_id": "...", "name": "...", "role": "provider" } // or null
}
```

**Response** `404` — invite not found or already used.
**Response** `400` — invite expired.

---

### POST `/api/agency/invite/[token]/accept`
Accept a staff invite. Creates a provider account if one doesn't exist, then links to the agency.

**Body** (only if no existing account)
```json
{ "name": "string", "password": "string" }
```

**Response** `200`
```json
{ "message": "Invite accepted", "user": { ... } }
```

---

## 25. Support Chat

### GET `/api/support`
Fetch the user's support thread history.

**Response** `200` — array of messages.

---

### POST `/api/support`
Send a message to support.

**Body**
```json
{ "body": "string" }
```

**Response** `201` — message object.

---

### POST `/api/support/attachment`
Upload a file attachment in the support thread (multipart/form-data).

**Form field:** `file`

**Response** `201` — message object with attachment info.

---

### GET `/api/support/stream` *(SSE)*
Real-time support replies from admin.

```js
const es = new EventSource(`${API}/api/support/stream`, { withCredentials: true });
es.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

### GET `/api/support/tickets`
List all support tickets for the current user.

**Response** `200`
```json
{ "tickets": [ { "_id": "...", "subject": "...", "status": "open | in_progress | resolved | closed", "category": "...", "createdAt": "..." } ] }
```

---

### POST `/api/support/tickets`
Create a new support ticket.

**Body**
```json
{
  "subject": "string (5–255 chars)",
  "body": "string (10–5000 chars)",
  "category": "billing | account | dispute | technical | kyc | payout | other",
  "relatedDisputeId": "optional",
  "relatedJobId": "optional"
}
```

**Response** `201` — ticket object.

---

### GET `/api/support/tickets/[id]`
Get a single support ticket.

**Response** `200` — ticket object.

---

### PATCH `/api/support/tickets/[id]`
Update ticket status or add a reply.

**Response** `200` — updated ticket.

---

## 26. Knowledge Base

### GET `/api/knowledge`
List published help articles for the current user's role.

**Response** `200`
```json
{
  "articles": [
    { "_id": "...", "title": "...", "excerpt": "...", "group": "...", "audience": "provider", "order": 1 }
  ]
}
```

---

### GET `/api/knowledge/[id]`
Get a single knowledge base article with full content.

**Response** `200` — article object with `content` (Markdown).

---

## 27. Job Applications (PESO)

Used by providers to apply for PESO/LGU open job postings.

### GET `/api/apply`
Provider — get list of job IDs they have applied to.

**Response** `200`
```json
{ "appliedJobIds": ["jobId1", "jobId2"] }
```

---

### POST `/api/apply`
Provider submits a job application (PESO / LGU jobs only). Agency staff members cannot apply independently.

**Body**
```json
{
  "jobId": "string",
  "coverLetter": "string (20–2000 chars)",
  "availability": "string",
  "resumeUrl": "https://... (optional)"
}
```

**Response** `201` — application object.

---

### GET `/api/apply/[jobId]`
PESO officer — fetch all applicants for a job.

**Response** `200`
```json
{ "applicants": [ { "_id": "...", "userId": "...", "coverLetter": "...", "status": "pending | shortlisted | rejected | hired" } ], "count": 5 }
```

---

### PATCH `/api/apply/[jobId]`
PESO officer — update an application status.

**Body**
```json
{ "id": "applicationId", "status": "pending | shortlisted | rejected | hired" }
```

**Response** `200` — updated application.

---

## 28. File Upload

### POST `/api/upload`
Upload a file to Cloudinary. Supports JPEG, PNG, WEBP, PDF (max 10 MB). Magic byte verification is performed server-side.

**Request:** `multipart/form-data`

| Field | Description |
|---|---|
| `file` | The file to upload |
| `folder` | `jobs/before \| jobs/after \| avatars \| kyc \| misc \| resumes` |

**Response** `200`
```json
{
  "url": "https://res.cloudinary.com/...",
  "publicId": "string",
  "format": "jpg | png | webp | pdf",
  "bytes": 204800
}
```

---

## 29. Payouts

> Provider only. Separate from wallet withdrawals — payouts represent earnings from completed jobs.

### GET `/api/payouts`
List provider's payout requests + available balance.

**Response** `200`
```json
{
  "payouts": [ { "_id": "...", "amount": 2000, "status": "pending | processing | completed | rejected", "createdAt": "..." } ],
  "availableBalance": 5000
}
```

---

### POST `/api/payouts`
Request a payout. Rate-limited to 3 requests per hour.

**Body**
```json
{
  "amount": 2000,
  "bankName": "BDO",
  "accountNumber": "1234567890",
  "accountName": "Juan dela Cruz"
}
```

**Response** `201` — payout object.

---

## 30. Recommendations

### GET `/api/recommendations/maintenance`
Get maintenance service recommendations based on the client's completed job history. Returns overdue or upcoming maintenance items.

**Response** `200`
```json
{
  "items": [
    {
      "category": "Aircon Cleaning",
      "lastCompleted": "2025-10-01",
      "nextDueDate": "2026-04-01",
      "overdue": true,
      "daysUntilDue": -7
    }
  ]
}
```

---

## 31. Business / Organization

> Requires `accountType: "business"`. Activate via `POST /api/client/upgrade-business`.

### POST `/api/client/upgrade-business`
Activate a free Business account for the authenticated client. Flips `accountType` from `personal` → `business`.

**Response** `200`
```json
{ "message": "Business account activated.", "accountType": "business" }
```

---

### GET `/api/business/org`
Get (or auto-create) the user's business organization.

**Response** `200`
```json
{ "org": { "_id": "...", "name": "...", "type": "hotel | company | other", ... } }
```

---

### POST `/api/business/org`
Create an organization.

**Body**
```json
{ "name": "Acme Corp", "type": "company", "defaultMonthlyBudget": 50000 }
```

**Response** `201`
```json
{ "org": { ... } }
```

---

### PATCH `/api/business/org`
Update an organization.

**Body**
```json
{ "orgId": "string", "name": "string", "logo": "url", "defaultMonthlyBudget": 60000 }
```

**Response** `200`
```json
{ "org": { ... } }
```

---

### GET `/api/business/dashboard`
Get business dashboard snapshot.

**Query:** `orgId` (required)

**Response** `200` — dashboard stats object.

---

### GET `/api/business/jobs`
List org's jobs with filters.

**Query:** `orgId` (required), `locationId`, `status`, `category`, `providerId`, `dateFrom`, `dateTo`, `page`, `limit`

**Response** `200` — paginated job list.

---

### POST `/api/business/jobs/bulk`
Post multiple jobs at once (Gold+ plan required).

**Body**
```json
{
  "orgId": "string",
  "jobs": [ { "title": "...", "description": "...", "category": "...", "budget": 1500, "location": "..." } ]
}
```

**Response** `201`
```json
{ "created": 3, "jobs": [ ... ] }
```

---

### GET `/api/business/jobs/recurring`
List recurring job schedules for the org.

**Response** `200` — recurring schedule list.

---

### POST `/api/business/jobs/recurring`
Create a recurring job schedule for the org.

**Response** `201` — recurring schedule object.

---

### GET `/api/business/members`
List org members or search by email.

**Query:** `orgId` (required), `searchEmail` (optional)

**Response** `200`
```json
{ "members": [ ... ] }
```

---

### POST `/api/business/members`
Add a member.

**Body**
```json
{
  "orgId": "string",
  "userId": "string",
  "role": "manager | supervisor | finance",
  "locationAccess": ["locationId1"]
}
```

**Response** `201`
```json
{ "member": { ... } }
```

---

### PATCH `/api/business/members`
Update a member's role or access.

**Body**
```json
{ "orgId": "string", "memberId": "string", "role": "finance", "locationAccess": [] }
```

**Response** `200`
```json
{ "member": { ... } }
```

---

### DELETE `/api/business/members`
Remove a member.

**Query:** `orgId`, `memberId` (required)

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/business/members/activity`
Member activity log for an org.

**Query:** `orgId` (required)

**Response** `200` — activity entries array.

---

### POST `/api/business/locations`
Add a location to an org.

**Body**
```json
{
  "orgId": "string",
  "label": "Makati Branch",
  "address": "string",
  "coordinates": { "lat": 14.5, "lng": 121.0 },
  "monthlyBudget": 20000,
  "alertThreshold": 15000,
  "managerId": "userId",
  "allowedCategories": ["catId1"]
}
```

**Response** `201`
```json
{ "org": { ... } }
```

---

### PATCH `/api/business/locations`
Update a location.

**Body** — include `orgId` + `locationId` + fields to change.

**Response** `200`
```json
{ "org": { ... } }
```

---

### DELETE `/api/business/locations`
Remove a location.

**Query:** `orgId`, `locationId` (required)

**Response** `200`
```json
{ "org": { ... } }
```

---

### GET `/api/business/locations/detail`
Get detailed info for a single location.

**Query:** `orgId`, `locationId` (required)

**Response** `200` — location detail object.

---

### GET `/api/business/preferred-providers`
List preferred / trusted providers for the org.

**Response** `200` — provider list.

---

### POST `/api/business/preferred-providers`
Add a provider to preferred list.

**Body**
```json
{ "orgId": "string", "providerId": "string" }
```

**Response** `200`
```json
{ "preferredProviders": [ ... ] }
```

---

### GET `/api/business/disputes`
List disputes for the org.

**Response** `200` — disputes array.

---

### GET `/api/business/escrow`
Escrow summary for the org.

**Response** `200` — escrow status object.

---

### GET `/api/business/billing`
Get billing and plan information.

**Query:** `orgId` (required)

**Response** `200` — billing object.

---

### POST `/api/business/billing/checkout`
Create a PayPal order for a business plan upgrade.

**Body**
```json
{ "orgId": "string", "plan": "starter | gold | platinum" }
```

**Response** `201`
```json
{ "orderId": "PAYPAL-ORDER-ID", "approveUrl": "https://www.paypal.com/..." }
```

---

### POST `/api/business/billing/confirm`
Confirm PayPal order and activate plan.

**Body**
```json
{ "orgId": "string", "orderId": "PAYPAL-ORDER-ID" }
```

**Response** `200`
```json
{ "activated": true, "plan": "gold", "planStatus": "active", "planExpiresAt": "..." }
```

---

### GET `/api/business/analytics/expenses`
Expense analytics for the org.

**Query:** `orgId`, `months` (default `12`)

**Response** `200` — monthly expense breakdown.

---

### GET `/api/business/analytics/providers`
Provider performance analytics for the org.

**Query:** `orgId`

**Response** `200` — provider stats array.

---

### GET `/api/business/analytics/budget-alerts`
Budget alerts for locations nearing their monthly budget threshold.

**Query:** `orgId`

**Response** `200` — alerts array.

---

### GET `/api/business/analytics/report`
Full business analytics report.

**Query:** `orgId`, `dateFrom`, `dateTo`

**Response** `200` — comprehensive report object.

---

## 32. AI Endpoints

All AI endpoints require authentication. Some require Gold tier or above.

### POST `/api/ai/classify-category`
Classify a job title into a category.

**Body**
```json
{
  "title": "Fix leaking bathroom sink",
  "description": "optional",
  "availableCategories": ["Plumbing", "Electrical", "Carpentry"]
}
```

**Response** `200`
```json
{ "category": "Plumbing" }
```

---

### POST `/api/ai/estimate-budget`
Get an AI-estimated budget range.

**Body**
```json
{ "title": "Paint interior walls", "category": "Painting", "description": "3-bedroom house" }
```

**Response** `200`
```json
{ "min": 5000, "max": 12000, "midpoint": 8500, "note": "Estimate includes labor only" }
```

---

### POST `/api/ai/generate-description`
Generate a job description from a title.

**Body**
```json
{ "title": "Install CCTV camera", "category": "Security" }
```

**Response** `200`
```json
{ "description": "..." }
```

---

### POST `/api/ai/suggest-skills`
Suggest skills based on bio and category *(Gold+ providers only)*.

**Body**
```json
{ "bio": "string", "category": "Plumbing", "existingSkills": ["pipe fitting"] }
```

**Response** `200`
```json
{ "skills": ["water heater installation", "drain cleaning"] }
```

---

### POST `/api/ai/suggest-replies`
Get 3 smart reply suggestions for a conversation *(Gold+ providers only)*.

**Body**
```json
{
  "lastMessages": [{ "sender": "client", "body": "Can you start tomorrow?" }],
  "role": "provider",
  "jobTitle": "Fix sink"
}
```

**Response** `200`
```json
{ "replies": ["Yes, I can be there by 9 AM.", "...", "..."] }
```

---

### POST `/api/ai/generate-quote-message`
Generate a professional quote cover message *(Gold+ providers only)*.

**Body**
```json
{
  "jobTitle": "Tile installation",
  "jobDescription": "string",
  "jobBudget": 5000,
  "category": "Carpentry"
}
```

**Response** `200`
```json
{ "message": "...", "timeline": "2–3 days" }
```

---

### POST `/api/ai/summarize-chat`
Summarize a conversation thread.

**Body**
```json
{
  "messages": [{ "sender": "client", "body": "..." }],
  "jobTitle": "Repair roof"
}
```

**Response** `200`
```json
{
  "summary": "...",
  "agreements": ["Provider will start Monday"],
  "nextSteps": ["Client to confirm escrow"]
}
```

---

### POST `/api/ai/generate-consultation-description`
Generate a consultation description *(Gold/Platinum clients only)*.

**Body**
```json
{ "title": "string", "type": "site_inspection | chat" }
```

**Response** `200`
```json
{ "description": "..." }
```

---

### POST `/api/ai/summarize-dispute`
Summarize a dispute *(admin only)*.

**Body**
```json
{
  "reason": "string",
  "jobTitle": "string",
  "raisedByRole": "client | provider",
  "messages": [ ... ]
}
```

**Response** `200`
```json
{ "summary": "..." }
```

---

### GET `/api/ai/recommend-providers`
AI-recommended providers for a client based on category, budget, and job history.

**Query:** `category` (string), `budget` (number)

**Response** `200`
```json
{
  "providers": [
    { "userId": "...", "name": "...", "bio": "...", "avgRating": 4.8, "relevanceScore": 0.92 }
  ]
}
```

---

## 33. PESO Employment Office

> Requires `role: "peso"` unless noted.

### GET `/api/peso/dashboard`
PESO dashboard stats (employment, job postings, workforce data).

**Response** `200` — employment stats object.

---

### GET `/api/peso/workforce`
Provider workforce registry with skills, certifications, and barangay data.

**Response** `200` — registry object.

---

### GET `/api/peso/workforce/export`
Download workforce registry as CSV.

**Response** `200` — `text/csv` file download.

---

### GET `/api/peso/jobs`
List jobs posted by the PESO office.

**Response** `200` — paginated job list.

---

### POST `/api/peso/jobs`
Post a job on behalf of the PESO office.

**Body** — same as `POST /api/jobs` with optional `isPriority: true`.

**Response** `201` — job object.

---

### PATCH `/api/peso/jobs/[id]/close`
Close a PESO job posting.

**Response** `200`
```json
{ "message": "Job closed" }
```

---

### POST `/api/peso/referrals`
Refer a provider to the marketplace.

**Body**
```json
{ "providerId": "string", "notes": "string" }
```

**Response** `201` — referral object.

---

### POST `/api/peso/bulk-onboard`
Bulk create provider accounts from a list.

**Body**
```json
[
  { "name": "Juan", "email": "juan@example.com", "phone": "+639...", "skills": ["Plumbing"], "barangay": "Sta. Cruz" }
]
```

**Response** `200`
```json
{ "results": [ { "email": "...", "status": "created | skipped" } ] }
```

---

### PUT `/api/peso/providers/[id]/verify`
Tag a provider as PESO-verified.

**Body**
```json
{ "tags": ["peso_registered", "lgu_resident", "peso_recommended"] }
```

**Response** `200` — updated provider profile.

---

### POST `/api/peso/providers/[id]/certifications`
Add a certification to a provider.

**Body**
```json
{
  "title": "TESDA NCII Plumbing",
  "issuer": "TESDA",
  "issuedAt": "2024-01-15",
  "expiresAt": "2027-01-15"
}
```

**Response** `201` — certification object.

---

### DELETE `/api/peso/providers/[id]/certifications`
Remove a certification.

**Body**
```json
{ "certId": "string" }
```

**Response** `200` — result object.

---

### GET `/api/peso/groups`
List livelihood groups.

**Response** `200`
```json
{ "data": [ ... ], "total": 5 }
```

---

### POST `/api/peso/groups`
Create a livelihood group.

**Body**
```json
{
  "name": "Barangay 1 Builders",
  "type": "construction",
  "barangay": "Sta. Cruz",
  "description": "string",
  "contactPerson": "string",
  "contactPhone": "+639...",
  "memberCount": 12
}
```

**Response** `201` — group object.

---

### PATCH `/api/peso/groups/[id]`
Update a group.

**Body** — partial group fields.

**Response** `200` — updated group.

---

### DELETE `/api/peso/groups/[id]`
Delete a group.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/peso/officers`
List PESO officers.

**Response** `200` — officers array.

---

### POST `/api/peso/officers`
Add a PESO officer.

**Response** `201` — officer object.

---

### PATCH `/api/peso/officers/[id]`
Update officer info.

**Response** `200` — updated officer.

---

### DELETE `/api/peso/officers/[id]`
Remove an officer.

**Response** `200`
```json
{ "success": true }
```

---

### POST `/api/peso/emergency`
Broadcast an emergency job.

**Body**
```json
{
  "jobType": "Debris Clearing",
  "location": "Barangay 5",
  "urgency": "high",
  "workersNeeded": 20,
  "duration": "3 days",
  "notes": "Typhoon aftermath cleanup"
}
```

**Response** `201` — job object.

---

### GET `/api/peso/reports`
Employment reports (summary stats, placement rates, skill demand).

**Response** `200` — report data object.

---

### GET `/api/peso/export`
Export PESO-verified workforce data as CSV.

**Response** `200` — `text/csv` file download.

---

### GET `/api/peso/settings`
Get PESO office settings (office name, municipality, branding).

**Response** `200` — settings object.

---

### PUT `/api/peso/settings`
Update PESO office settings.

**Response** `200` — updated settings.

---

### POST `/api/peso/settings/logo`
Upload PESO office logo (multipart/form-data).

**Form field:** `file`

**Response** `200`
```json
{ "logoUrl": "https://res.cloudinary.com/..." }
```

---

## 34. Admin

> Requires `role: "admin"` or a specific `capability` as noted.

### GET `/api/admin/stats`
Platform statistics overview. Requires `view_revenue` capability.

**Response** `200`
```json
{
  "totalUsers": 1200,
  "activeJobs": 88,
  "completedJobs": 540,
  "totalRevenue": 120000,
  "openDisputes": 3
}
```

---

### GET `/api/admin/jobs`
Paginated job list.

**Query:** `status`, `category`, `page`, `limit`

**Response** `200` — paginated jobs.

---

### GET `/api/admin/jobs/[id]`
Get a single job (admin view).

**Response** `200` — full job document.

---

### POST `/api/admin/jobs/[id]/approve`
Approve a job posting.

**Response** `200`
```json
{ "message": "Job approved" }
```

---

### POST `/api/admin/jobs/[id]/reject`
Reject a job posting.

**Body**
```json
{ "reason": "string" }
```

**Response** `200`
```json
{ "message": "Job rejected" }
```

---

### POST `/api/admin/jobs/[id]/cancel`
Admin force-cancels a job.

**Body**
```json
{ "reason": "string" }
```

**Response** `200`
```json
{ "message": "Job cancelled" }
```

---

### POST `/api/admin/jobs/[id]/force-withdraw`
Remove provider from a job and reopen it.

**Body**
```json
{ "reason": "Policy violation" }
```

**Response** `200`
```json
{ "message": "Provider removed" }
```

---

### POST `/api/admin/jobs/[id]/escrow-override`
Admin escrow override (force release or refund).

**Body**
```json
{ "action": "release | refund", "reason": "string" }
```

**Response** `200` — updated job.

---

### GET `/api/admin/disputes`
List all disputes. Requires `manage_disputes` capability.

**Response** `200` — array of dispute objects.

---

### GET `/api/admin/disputes/[id]`
Get a single dispute. Requires `manage_disputes` capability.

**Response** `200` — dispute object.

---

### PATCH `/api/admin/disputes/[id]`
Resolve or update a dispute. Requires `manage_disputes` capability.

**Body**
```json
{
  "status": "investigating | resolved",
  "resolutionNotes": "string (min 10 chars)",
  "escrowAction": "release | refund",
  "chargeHandlingFee": false,
  "handlingFeeChargedTo": "client | provider | both"
}
```

**Response** `200` — updated dispute.

---

### GET `/api/admin/users`
List all users (paginated). Requires `manage_users` capability.

**Query:** `role`, `page`, `limit`

**Response** `200` — paginated user list.

---

### POST `/api/admin/users`
Create a user account (including staff and PESO officers). Requires `manage_users` capability.

**Body**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "client | provider | admin | staff | peso",
  "isVerified": false,
  "phone": "optional",
  "skills": [],
  "pesoOffice": {
    "officeName": "string",
    "municipality": "string",
    "region": "string",
    "contactEmail": "string"
  }
}
```

**Response** `201` — user object.

---

### GET `/api/admin/users/[id]`
Get a single user. Requires `manage_users` capability.

**Response** `200` — user object.

---

### PATCH `/api/admin/users/[id]`
Update user account (suspend, verify, change approval status, role, capabilities). Requires `manage_users` capability.

**Body**
```json
{
  "isVerified": true,
  "isSuspended": false,
  "approvalStatus": "pending_approval | approved | rejected",
  "role": "client | provider | admin | staff",
  "capabilities": ["manage_jobs", "manage_disputes"]
}
```

**Response** `200` — updated user.

---

### POST `/api/admin/users/[id]/impersonate`
Issue a short-lived access token as the target user (admin only). Sets `impersonation_return_token` cookie.

**Response** `200`
```json
{ "message": "Impersonation started", "redirectTo": "/provider/dashboard" }
```

---

### POST `/api/admin/impersonate/exit`
Exit impersonation and restore the original admin session.

**Response** `200`
```json
{ "message": "Impersonation ended", "redirectTo": "/admin/dashboard" }
```

---

### POST `/api/admin/users/[id]/unlock`
Unlock a rate-limited or locked user account.

**Response** `200`
```json
{ "message": "Account unlocked" }
```

---

### GET `/api/admin/users/[id]/activity`
User activity log.

**Response** `200` — activity entries array.

---

### POST `/api/admin/users/[id]/message`
Send a direct message to a user from admin.

**Body**
```json
{ "subject": "string", "body": "string" }
```

**Response** `200`
```json
{ "message": "Message sent" }
```

---

### POST `/api/admin/users/[id]/reset-password`
Force a password reset for a user.

**Body**
```json
{ "newPassword": "string" }
```

**Response** `200`
```json
{ "message": "Password reset" }
```

---

### GET `/api/admin/users/[id]/wallet-transactions`
View a user's wallet transactions.

**Response** `200` — transaction list.

---

### GET `/api/admin/users/[id]/duplicates`
Find potential duplicate accounts for a user.

**Response** `200` — list of suspected duplicates.

---

### GET `/api/admin/users/[id]/gdpr-export`
Export a user's personal data bundle (GDPR).

**Response** `200` — JSON data export.

---

### POST `/api/admin/users/[id]/delete`
Hard-delete a user account (GDPR compliance). Requires `manage_users` capability.

**Response** `200`
```json
{ "message": "User deleted" }
```

---

### POST `/api/admin/users/bulk`
Bulk action on multiple users (suspend, verify, delete).

**Body**
```json
{ "userIds": ["id1", "id2"], "action": "suspend | unsuspend | verify | delete" }
```

**Response** `200`
```json
{ "affected": 2 }
```

---

### POST `/api/admin/users/bulk/message`
Send a bulk message to multiple users.

**Body**
```json
{ "userIds": ["id1", "id2"], "subject": "string", "body": "string" }
```

**Response** `200`
```json
{ "sent": 2 }
```

---

### GET `/api/admin/users/export`
Export all users as CSV.

**Response** `200` — `text/csv` file download.

---

### POST `/api/admin/users/import`
Import users from a CSV file (multipart/form-data).

**Form field:** `file` (CSV)

**Response** `200`
```json
{ "imported": 15, "skipped": 2, "errors": [ ... ] }
```

---

### GET `/api/admin/kyc`
List users with KYC submissions. Requires `manage_kyc` capability.

**Response** `200` — array of users with KYC data.

---

### PATCH `/api/admin/kyc/[userId]`
Approve or reject a KYC submission. Requires `manage_kyc` capability.

**Body**
```json
{ "action": "approve | reject", "reason": "optional rejection reason" }
```

**Response** `200`
```json
{ "message": "KYC approved | rejected", "user": { ... } }
```

---

### GET `/api/admin/fraud`
List flagged jobs and suspicious users.

**Response** `200`
```json
{ "jobs": [ ... ], "users": [ ... ] }
```

---

### GET `/api/admin/payouts`
List all payout requests (paginated). Requires `manage_payouts` capability.

**Query:** `page`, `limit`

**Response** `200`
```json
{ "payouts": [ ... ], "total": 50, "page": 1 }
```

---

### PATCH `/api/admin/payouts/[id]`
Process a payout request. Requires `manage_payouts` capability.

**Body**
```json
{ "status": "processing | completed | rejected", "notes": "optional" }
```

**Response** `200`
```json
{ "payout": { ... }, "message": "Payout status updated" }
```

---

### GET `/api/admin/wallet/withdrawals`
List all wallet withdrawal requests (paginated).

**Query:** `page`, `limit`

**Response** `200` — paginated withdrawal list.

---

### GET `/api/admin/wallet/withdrawals/[id]`
Get withdrawal request details.

**Response** `200`
```json
{ "withdrawal": { ... } }
```

---

### PATCH `/api/admin/wallet/withdrawals/[id]`
Process a withdrawal.

**Body**
```json
{ "status": "processing | completed | rejected", "notes": "string" }
```

**Response** `200`
```json
{ "message": "Updated", "withdrawal": { ... } }
```

---

### GET `/api/admin/staff`
List staff members.

**Response** `200`
```json
{ "staff": [ ... ] }
```

---

### POST `/api/admin/staff`
Create a staff member.

**Body**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "capabilities": ["manage_jobs", "manage_disputes", "manage_kyc", "manage_users"]
}
```

**Response** `201`
```json
{ "staff": { ... } }
```

---

### PUT `/api/admin/staff/[id]`
Update staff capabilities or suspend.

**Body**
```json
{ "capabilities": ["manage_jobs"], "isSuspended": false }
```

**Response** `200`
```json
{ "staff": { ... } }
```

---

### DELETE `/api/admin/staff/[id]`
Suspend staff member.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/admin/categories`
List all categories including inactive.

**Response** `200` — array of category objects.

---

### POST `/api/admin/categories`
Create a category.

**Body**
```json
{ "name": "Welding", "icon": "🔥", "description": "string", "order": 5 }
```

**Response** `201` — category object.

---

### PATCH `/api/admin/categories/[id]`
Update a category.

**Body** — partial category fields.

**Response** `200` — updated category.

---

### DELETE `/api/admin/categories/[id]`
Delete or deactivate a category.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/admin/announcements`
List all announcements.

**Response** `200`
```json
{ "announcements": [ ... ] }
```

---

### POST `/api/admin/announcements`
Create an announcement.

**Body**
```json
{
  "title": "Maintenance tonight",
  "message": "The platform will be down from 2–4 AM.",
  "type": "info | warning | success | danger",
  "targetRoles": ["client", "provider"],
  "isActive": true,
  "expiresAt": "2026-04-07T04:00:00Z"
}
```

**Response** `201` — announcement object.

---

### PATCH `/api/admin/announcements/[id]`
Update an announcement.

**Response** `200` — updated announcement.

---

### DELETE `/api/admin/announcements/[id]`
Delete an announcement.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/admin/partners`
List all partners.

**Response** `200` — array of partner objects.

---

### POST `/api/admin/partners`
Create a partner.

**Response** `201` — partner object.

---

### PATCH `/api/admin/partners/[id]`
Update a partner.

**Response** `200` — updated partner.

---

### DELETE `/api/admin/partners/[id]`
Delete a partner.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/admin/businesses`
List all business organizations with search and filter. Requires `manage_businesses` capability.

**Query:** `page`, `limit`, `search`, `plan`, `planStatus`

**Response** `200`
```json
{ "orgs": [ ... ], "total": 20, "page": 1, "limit": 50 }
```

---

### GET `/api/admin/businesses/[id]`
Get a single business organization.

**Response** `200` — business object.

---

### PATCH `/api/admin/businesses/[id]`
Update a business organization (admin override).

**Response** `200` — updated business.

---

### GET `/api/admin/agencies`
List all agency profiles with search and filter. Requires `manage_agencies` capability.

**Query:** `page`, `limit`, `search`, `plan`, `planStatus`

**Response** `200`
```json
{ "agencies": [ ... ], "total": 10, "page": 1, "limit": 50 }
```

---

### GET `/api/admin/agencies/[id]`
Get a single agency profile.

**Response** `200` — agency object.

---

### PATCH `/api/admin/agencies/[id]`
Update an agency profile (admin override).

**Response** `200` — updated agency.

---

### POST `/api/admin/providers/[userId]/certify`
Admin certifies a provider.

**Body**
```json
{ "certificationLevel": "verified | premium" }
```

**Response** `200` — updated provider profile.

---

### GET `/api/admin/settings`
List all app settings (merged with defaults). Admin only.

**Response** `200` — flat key-value settings object.

---

### PATCH `/api/admin/settings`
Upsert one or many settings. Admin only.

**Body**
```json
{
  "payments.baseCommissionRate": 15,
  "platform.maintenanceMode": false,
  "board.activityFeed": true
}
```

**Response** `200` — updated settings.

---

### GET `/api/admin/feature-flags`
List all feature flags (keys starting with `ff_`). Admin only.

**Response** `200`
```json
{ "ff_agency_module": true, "ff_peso_module": false }
```

---

### PUT `/api/admin/feature-flags`
Toggle a feature flag. Admin only.

**Body**
```json
{ "key": "ff_peso_module", "value": true }
```

**Response** `200`
```json
{ "key": "ff_peso_module", "value": true }
```

---

### GET `/api/admin/knowledge`
List all knowledge base articles (all audiences). Admin only.

**Response** `200` — articles array.

---

### POST `/api/admin/knowledge`
Create a knowledge base article.

**Body**
```json
{
  "folder": "client | provider | business | agency | peso",
  "slug": "optional-custom-slug",
  "title": "string",
  "excerpt": "string",
  "content": "Markdown content",
  "group": "Getting Started",
  "order": 1
}
```

**Response** `201` — article object.

---

### GET `/api/admin/knowledge/[id]`
Get a single article (admin view).

**Response** `200` — article object.

---

### PUT `/api/admin/knowledge/[id]`
Update a knowledge base article.

**Response** `200` — updated article.

---

### DELETE `/api/admin/knowledge/[id]`
Delete a knowledge base article.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/admin/courses`
List all training courses (admin view).

**Response** `200` — courses array.

---

### POST `/api/admin/courses`
Create a training course.

**Response** `201` — course object.

---

### PATCH `/api/admin/courses/[id]`
Update a training course.

**Response** `200` — updated course.

---

### DELETE `/api/admin/courses/[id]`
Delete a training course.

**Response** `200`
```json
{ "success": true }
```

---

### GET `/api/admin/support`
List all support threads.

**Response** `200` — array of thread summaries.

---

### GET `/api/admin/support/[userId]`
Get a user's support thread.

**Response** `200` — array of messages.

---

### POST `/api/admin/support/[userId]`
Reply to a user's support thread.

**Body**
```json
{ "body": "string" }
```

**Response** `201` — message object.

---

### POST `/api/admin/support/[userId]/attachment`
Upload an attachment in a user's support thread (multipart/form-data).

**Form field:** `file`

**Response** `201` — message object with attachment.

---

### GET `/api/admin/support/stream` *(SSE)*
Admin support inbox stream. Events contain `{ userId, message }`.

---

### GET `/api/admin/support/tickets`
List all support tickets (admin view).

**Query:** `status`, `category`, `page`, `limit`

**Response** `200` — paginated ticket list.

---

### GET `/api/admin/accounting/entries`
Paginated ledger journal entries, grouped by `journalId`.

**Query:** `page`, `limit`, `type` (entryType filter), `entity` (entityType filter)

**Response** `200`
```json
{
  "journals": [ { "journalId": "...", "entries": [ { "account": "...", "debit": 0, "credit": 1500 } ] } ],
  "total": 100,
  "page": 1
}
```

---

### GET `/api/admin/accounting/trial-balance`
Double-entry trial balance.

**Query:** `currency` (default `PHP`)

**Response** `200` — trial balance data.

---

### GET `/api/admin/accounting/balance-sheet`
Balance sheet snapshot.

**Response** `200` — balance sheet data.

---

### GET `/api/admin/accounting/income-statement`
Income statement (P&L).

**Response** `200` — income statement data.

---

### GET `/api/admin/accounting/escrow-holdings`
Total escrow funds currently held in trust.

**Response** `200`
```json
{ "totalEscrow": 250000, "count": 88 }
```

---

### GET `/api/admin/accounting/provider-payable`
Total amount owed to providers (released but not yet paid out).

**Response** `200`
```json
{ "totalPayable": 85000, "count": 45 }
```

---

### POST `/api/admin/accounting/manual-entry`
Create a manual journal entry (admin only, requires reason).

**Body**
```json
{
  "entries": [ { "account": "string", "debit": 0, "credit": 500 } ],
  "reason": "string"
}
```

**Response** `201`
```json
{ "journalId": "...", "entries": [ ... ] }
```

---

### POST `/api/admin/accounting/reconcile`
Trigger an accounting reconciliation run.

**Response** `200`
```json
{ "message": "Reconciliation complete", "discrepancies": 0 }
```

---

### GET `/api/admin/ledger/reconcile`
Get ledger reconciliation status and any discrepancies found.

**Response** `200` — reconciliation report.

---

### GET `/api/admin/database/stats`
MongoDB collection stats (document counts, storage sizes).

**Response** `200` — per-collection stats object.

---

### POST `/api/admin/database/backup`
Trigger a manual database backup.

**Response** `200`
```json
{ "message": "Backup initiated", "snapshotId": "..." }
```

---

### GET `/api/admin/backup/snapshots`
List available database snapshots.

**Response** `200` — snapshots array.

---

### POST `/api/admin/database/restore`
Restore database from a snapshot.

**Body**
```json
{ "snapshotId": "string" }
```

**Response** `200`
```json
{ "message": "Restore initiated" }
```

---

### POST `/api/admin/database/reset`
Reset the database to a clean state *(dev/staging only)*.

**Response** `200`
```json
{ "message": "Database reset" }
```

---

### POST `/api/admin/migrate-skills`
Run a skills data migration.

**Response** `200`
```json
{ "migrated": 120 }
```

---

## 35. Public (No Auth)

### GET `/api/public/activity-feed`
10 most recent platform activity items for a live feed widget.

**Response** `200`
```json
[
  { "icon": "🔧", "message": "A Plumbing job was posted in Quezon City", "createdAt": "..." }
]
```

---

### GET `/api/public/category-demand`
Top 6 categories by open job count.

**Response** `200`
```json
[ { "category": "Plumbing", "count": 42 } ]
```

---

### GET `/api/public/board`
Public job display board data — open jobs, leaderboard, announcements, and platform stats. Powers kiosk/TV displays.

**Response** `200`
```json
{
  "jobs": [ ... ],
  "leaderboard": [ { "name": "...", "completedJobCount": 43 } ],
  "announcements": [ ... ],
  "stats": { "totalJobs": 540, "activeProviders": 120 },
  "generatedAt": "2026-04-07T00:00:00Z"
}
```

---

### GET `/api/public/board-settings`
Feature flags for the public board (which widgets are enabled).

**Response** `200`
```json
{
  "activityFeed": true,
  "earningsWidget": false,
  "urgentJobs": true
}
```

---

### GET `/api/public/jobs/[id]`
Get a single job for public display (limited fields, no auth required).

**Response** `200` — public job object (title, category, location, budget, status only).

---

### GET `/api/public/recent-completions`
Up to 10 jobs completed in the last 24 hours. Used for completion toast notifications on the public board.

**Response** `200`
```json
[
  { "_id": "...", "title": "...", "category": "...", "location": "...", "budget": 1500 }
]
```

---

## 36. Utility Endpoints

### GET `/api/health`
Multi-service health check for uptime monitors and load balancers.

- `200` — all services operational
- `207` — partial degradation
- `503` — critical failure (MongoDB unreachable)

**Response** `200`
```json
{
  "status": "ok | degraded | down",
  "services": {
    "mongodb": { "status": "ok", "latencyMs": 4 },
    "cloudinary": { "status": "ok", "latencyMs": 120 },
    "redis": { "status": "degraded", "latencyMs": 0, "error": "Connection refused" }
  }
}
```

---

### GET `/api/unsubscribe`
One-click email unsubscribe. Verifies an HMAC token from email links and disables marketing emails for the user. No authentication required — must work directly from email.

**Query:** `token` (HMAC token from email link)

**Response** `302` — redirects to `/unsubscribe?success=true`.

---

### GET `/api/payment-return`
Same-site bounce redirect for external payment gateways (PayMongo, PayPal). Prevents cookie stripping on cross-site redirects from checkout pages.

**Query:** `to` (relative path to redirect to, e.g. `/client/escrow?jobId=xxx&payment=success`)

**Response** `200` — HTML page with an immediate JS redirect to the `to` path.

---

### POST `/api/csp-report`
Receives Content Security Policy violation reports from browsers. No authentication required.

**Body** — standard CSP violation report object (sent automatically by browsers).

**Response** `204` — no content.

---

## Error Responses

All endpoints return consistent error shapes:

```json
{
  "error": "Human-readable message",
  "code": "NOT_FOUND | FORBIDDEN | UNAUTHORIZED | VALIDATION_ERROR | CONFLICT"
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Validation error / bad request |
| `401` | Not authenticated — refresh token or re-login |
| `403` | Authenticated but not authorized (wrong role/capability) |
| `404` | Resource not found |
| `409` | Conflict (duplicate, already exists) |
| `422` | Unprocessable entity |
| `429` | Rate limited |
| `500` | Internal server error |

---

## SSE (Server-Sent Events) Notes

Use `withCredentials: true` to send cookies with SSE connections.

```js
const es = new EventSource('https://<your-domain>/api/notifications/stream', {
  withCredentials: true,
});

es.onmessage = (event) => {
  const data = JSON.parse(event.data);
};

es.onerror = () => {
  es.close();
  setTimeout(connectSSE, 5000); // reconnect after delay
};
```

**Active SSE streams:**

| Endpoint | Purpose |
|---|---|
| `GET /api/notifications/stream` | Real-time notifications for any user |
| `GET /api/messages/stream/[threadId]` | Real-time job chat messages |
| `GET /api/support/stream` | Real-time support replies (user) |
| `GET /api/admin/support/stream` | All user support messages (admin inbox) |

---

*Updated 2026-04-07 — LocalPro Marketplace v1*
