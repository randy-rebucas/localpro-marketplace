# LocalPro Marketplace — Full Codebase Audit Report

> **Date:** 2026-03-09
> **Scope:** Security · Architecture · API · Data Models · Frontend
> **Audited by:** 5 parallel automated agents + manual review
> **Build status at time of audit:** ✅ `pnpm build` passes (0 errors)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues — Fix Before Production](#critical-issues--fix-before-production)
3. [Security Audit](#security-audit)
4. [Architecture Audit](#architecture-audit)
5. [API Audit](#api-audit)
6. [Data Model Audit](#data-model-audit)
7. [Frontend Audit](#frontend-audit)
8. [Remediation Roadmap](#remediation-roadmap)

---

## Executive Summary

The application is **well-structured and feature-complete** — clean service/repository pattern, SSE real-time, AI integration, payments, and a robust PESO government module are all in place. The build passes cleanly. However, 5 parallel audits surfaced **138 distinct issues** across 5 domains.

### Issue Count by Severity

| Severity | Security | Architecture | API | Data Models | Frontend | **Total** |
|---|---|---|---|---|---|---|
| 🔴 Critical | 5 | 2 | 3 | 4 | 1 | **15** |
| 🟠 High | 12 | 5 | 7 | 8 | 2 | **34** |
| 🟡 Medium | 11 | 18 | 25 | 12 | 8 | **74** |
| 🟢 Low | 5 | 4 | 5 | 5 | 3 | **22** |
| | | | | | **Grand total** | **145** |

### Health Score by Domain

| Domain | Score | Verdict |
|---|---|---|
| Frontend UX & Structure | 8/10 | Good — minor a11y and component gaps |
| Architecture / Pattern | 6/10 | Good foundation, 31 routes bypass repositories |
| API Design | 6/10 | Functional, missing pagination and consistency |
| Data Models | 5/10 | Race conditions, missing indexes, float amounts |
| Security | 4/10 | Multiple critical token and audit trail gaps |

---

## Critical Issues — Fix Before Production

These 15 issues must be resolved before any public launch.

| # | Domain | Issue | File |
|---|---|---|---|
| C-01 | Security | No audit log for admin impersonation — admin can act as any user with zero trace | `src/app/api/admin/users/[id]/impersonate/route.ts` |
| C-02 | Security | `dangerouslySetInnerHTML` in ArticleView without HTML sanitization — stored XSS | `src/components/shared/ArticleView.tsx:56` |
| C-03 | Security | PayMongo webhook processes unsigned requests if `PAYMONGO_WEBHOOK_SECRET` not set in production | `src/app/api/webhooks/paymongo/route.ts:33` |
| C-04 | Security | Password reset tokens stored **plain text** in DB — full compromise on DB leak | `src/services/auth.service.ts:228` |
| C-05 | Security | Email verification tokens stored **plain text** in DB | `src/services/auth.service.ts:67` |
| C-06 | Architecture | `QuoteTemplate` model has **no repository or service** — API routes query model directly | `src/app/api/quote-templates/` |
| C-07 | Architecture | `LivelihoodGroup` model has **no repository or service** — orphaned | `src/app/api/peso/groups/` |
| C-08 | API | `GET /api/admin/payouts` returns **all records with no pagination** — unbounded DB scan | `src/app/api/admin/payouts/route.ts` |
| C-09 | API | `GET /api/admin/disputes` returns **all records with no pagination** — unbounded DB scan | `src/app/api/admin/disputes/route.ts` |
| C-10 | API | Webhook **no idempotency** — duplicate delivery from PayMongo double-funds escrow | `src/app/api/webhooks/paymongo/route.ts` |
| C-11 | Data | **Wallet race condition** — balance update + transaction log insert are not atomic | `src/repositories/wallet.repository.ts` |
| C-12 | Data | **Payment ↔ Transaction sync gap** — payment marked paid before transaction created; webhook failure leaves inconsistent state | `src/services/payment.service.ts` |
| C-13 | Data | **Monetary amounts stored as floats** — floating-point rounding errors on financial calculations | All financial models |
| C-14 | Data | **No currency field** on Job / Quote / Transaction — blocks multi-currency support entirely | `src/models/Job.ts`, `Transaction.ts`, `Quote.ts` |
| C-15 | Frontend | Admin impersonation `ImpersonationBanner` not consistently mounted in all dashboard layouts | Impersonation banner coverage |

---

## Security Audit

### 1. Authentication & JWT

| Severity | Finding | File | Line |
|---|---|---|---|
| 🔴 Critical | No audit log for admin impersonation | `impersonate/route.ts` | — |
| 🟠 High | `CRON_SECRET` not validated at startup — cron endpoints unprotected if env var missing | `src/lib/cronAuth.ts` | 9–12 |
| 🟠 High | Impersonation token lifetime is 1 hour — should match access token TTL (15 min) | `impersonate/route.ts` | 53 |
| 🟠 High | Staff role remapped to "admin" in proxy — boundary confusion risk | `src/proxy.ts` | 67, 70 |
| 🟠 High | Impersonation session not invalidated when admin logs out | `impersonate/route.ts` | — |
| 🟡 Medium | Cookie `secure` flag only set in production — staging/preview deployments use HTTP cookies | `src/lib/auth.ts` | 59 |
| 🟡 Medium | JWT secrets not validated for minimum length (could be set to `abc`) | `src/lib/auth.ts` | 6–11 |

**Fixes:**
```typescript
// C-01: Add to impersonate/route.ts
await activityRepository.create({
  userId: admin.userId,
  action: "admin_impersonated_user",
  targetUserId: targetId,
  details: { impersonatedUserName: target.name },
});

// CRON_SECRET validation in src/lib/cronAuth.ts
if (!process.env.CRON_SECRET) {
  throw new Error("CRON_SECRET environment variable is required");
}

// JWT min length in src/lib/auth.ts
if (ACCESS_SECRET.length < 32) throw new Error("JWT_SECRET must be ≥ 32 chars");
```

---

### 2. Token & Secret Storage

| Severity | Finding | File | Line |
|---|---|---|---|
| 🔴 Critical | Password reset tokens stored plain text — hash with sha256 before storage | `auth.service.ts` | 228 |
| 🔴 Critical | Email verification tokens stored plain text | `auth.service.ts` | 67 |
| 🟠 High | OTP codes stored plain text in `User.otpCode` field | `src/models/User.ts` | ~108 |
| 🟡 Medium | Password reset token not cleared after successful use | `auth.service.ts` | 238–256 |
| 🟡 Medium | Password regex allows weak patterns (`Aaaaaa1`) — 8 chars minimum is too low | `register/route.ts` | 16–18 |

**Fix pattern for all tokens:**
```typescript
// Store hash, never raw
const token = crypto.randomBytes(32).toString("hex");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
await userRepository.setResetPasswordToken(userId, tokenHash, expiry);

// Verify: hash submitted token and compare
const submittedHash = crypto.createHash("sha256").update(submittedToken).digest("hex");
const user = await userRepository.findByResetToken(submittedHash);
```

---

### 3. Rate Limiting

| Severity | Finding | File |
|---|---|---|
| 🟠 High | In-memory rate limiter not safe for multi-instance (Vercel/load-balanced) deployments | `src/lib/rateLimit.ts` |
| 🟠 High | No rate limiting on impersonation route | `impersonate/route.ts` |
| 🟠 High | No rate limiting on `POST /api/payments` (payment intent creation) | `payments/route.ts` |
| 🟠 High | No rate limiting on `POST /api/ai/*` endpoints (expensive OpenAI calls) | `src/app/api/ai/` |
| 🟡 Medium | No rate limiting on file upload endpoint | `upload/route.ts` |
| 🟡 Medium | No rate limiting on `POST /api/admin/staff` (staff account creation) | `admin/staff/route.ts` |

**For production:** Replace in-memory Map with Redis-backed rate limiter (e.g., `@upstash/ratelimit`).

---

### 4. Input Validation & XSS

| Severity | Finding | File | Line |
|---|---|---|---|
| 🔴 Critical | `dangerouslySetInnerHTML` on admin-created knowledge article content — stored XSS | `ArticleView.tsx` | 56 |
| 🟡 Medium | File MIME type not validated by magic bytes — client can spoof MIME header | `upload/route.ts` | 8 |
| 🟡 Medium | No per-user upload quota — storage abuse possible | `upload/route.ts` | — |

**Fix for XSS:**
```bash
pnpm add sanitize-html
```
```typescript
import sanitizeHtml from "sanitize-html";
// In knowledge article API before saving:
article.contentHtml = sanitizeHtml(contentHtml, {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
});
```

---

### 5. Security Headers

| Severity | Finding | File | Line |
|---|---|---|---|
| 🟡 Medium | CSP contains `'unsafe-inline'` and `'unsafe-eval'` — weakens XSS protection | `next.config.ts` | 20–29 |
| 🟡 Medium | CSRF protection relies solely on `sameSite: "lax"` — no explicit CSRF tokens | `src/lib/auth.ts` | 60 |
| 🟢 Low | Vercel dev tool domains (`*.vercel.live`) present in production CSP | `next.config.ts` | — |
| 🟢 Low | Missing `X-Permitted-Cross-Origin-Policies` header | `next.config.ts` | — |

**Correctly configured:** ✅ `X-Frame-Options: DENY`, ✅ `X-Content-Type-Options: nosniff`, ✅ `HSTS`

---

### 6. Webhook Security

| Severity | Finding | File |
|---|---|---|
| 🔴 Critical | `PAYMONGO_WEBHOOK_SECRET` absence not enforced at startup in production | `webhooks/paymongo/route.ts:33` |
| 🟡 Medium | No webhook idempotency — duplicate delivery double-funds escrow | `webhooks/paymongo/route.ts` |

**Fix:**
```typescript
// Add idempotency check at top of webhook handler
const webhookEventId = event.data.id;
const existing = await paymentRepository.findByWebhookEventId(webhookEventId);
if (existing) return NextResponse.json({ received: true }); // Idempotent
// ... proceed with processing
// After processing: store webhookEventId
```

---

### 7. Password Security

| Severity | Finding | File |
|---|---|---|
| 🟡 Medium | bcrypt rounds inconsistent — model uses `genSalt(12)` + `hash()`, service uses `hash(pw, 12)` | `User.ts:176` vs `auth.service.ts:255` |
| 🟡 Medium | No account lockout after repeated login failures (rate limit per email only) | `login/route.ts` |

---

## Architecture Audit

### 1. Service/Repository Pattern Violations

**31 API route files import Mongoose models directly**, bypassing the repository layer. This breaks the architectural contract, makes testing impossible, and means DB logic is scattered.

**High-impact violations:**

| File | Direct Model Used | Impact |
|---|---|---|
| `src/app/api/auth/me/addresses/route.ts` | `User.findById().save()` | Auth data exposed directly |
| `src/app/api/auth/phone/send/route.ts` | `User.findOneAndUpdate()` | Auth critical path |
| `src/app/api/public/board/route.ts` | `Job.find()`, `ProviderProfile.aggregate()` | Public-facing, high traffic |
| `src/app/api/messages/threads/route.ts` | `Job.find()` with populate | Chat feature |
| `src/app/api/webhooks/paymongo/route.ts` | `User.findByIdAndUpdate()` | Payment-critical path |
| `src/app/api/quote-templates/route.ts` | `QuoteTemplate.find()/.create()` | No repo exists at all |
| `src/app/api/peso/groups/route.ts` | `LivelihoodGroup.find()/.create()` | No repo exists at all |

**4 service files import models directly:**
- `src/services/payment.service.ts:15` — imports `User`
- `src/services/job.service.ts:8` — imports `User`
- `src/services/recurringSchedule.service.ts:5` — imports `User`

---

### 2. Missing Repository/Service Coverage

| Model | Repository | Service | Status |
|---|---|---|---|
| `QuoteTemplate` | ❌ Missing | ❌ Missing | 🔴 Critical — routes query model directly |
| `LivelihoodGroup` | ❌ Missing | ❌ Missing | 🔴 Critical — routes query model directly |
| `AppSetting` | ⚠️ Partial | ✅ via appSettings lib | Needs explicit repo |

---

### 3. Barrel Export Gaps

These services exist but are **not exported** from `src/services/index.ts`:

```
consultation.service.ts
support.service.ts
business.service.ts
wallet.service.ts
recurringSchedule.service.ts
```

This means routes import them via direct paths, bypassing the barrel — inconsistent and harder to maintain.

**Fix:** Add all 5 to `src/services/index.ts`.

---

### 4. `console.log` in Production Code

| File | Line | Content |
|---|---|---|
| `src/app/api/business/billing/confirm/route.ts` | 116–119 | Billing plan activation |
| `src/app/api/cron/dispute-overdue/route.ts` | 23 | Cron statistics |
| `src/app/api/webhooks/paymongo/route.ts` | 98, 125 | PayMongo event details |
| `src/lib/twilio.ts` | Multiple | SMS delivery |

**Fix:** Replace with a structured logger (`pino`, `winston`) or at minimum `console.error` for errors only.

---

### 5. Type Safety Issues

| Severity | File | Issue |
|---|---|---|
| 🟡 Medium | `src/app/api/messages/threads/route.ts:46–50` | `_id: any`, `clientId: { _id: any }` — untyped thread interfaces |
| 🟡 Medium | 38+ locations | `as unknown as X` casts — verbose and hides type errors |
| ✅ Good | Entire codebase | Zero `@ts-ignore` or `@ts-nocheck` found |

---

### 6. Code Duplication

| Pattern | Occurrences | Suggested Abstraction |
|---|---|---|
| Address/ServiceArea CRUD | 4+ files | Generic CRUD factory |
| Zod schema → parse → throw | 50+ routes | `parseBody<T>(req, schema)` util |
| Ownership check: `if (resource.ownerId !== user.userId) throw ForbiddenError()` | Throughout | `assertOwner(resource, user)` util |
| Role check pattern | Every route | Already using `requireRole()` — good |

---

## API Audit

### 1. Missing Pagination — Performance Risks

| Severity | Endpoint | Issue |
|---|---|---|
| 🔴 Critical | `GET /api/admin/payouts` | Returns ALL records, no limit |
| 🔴 Critical | `GET /api/admin/disputes` | Returns ALL records, no limit |
| 🟠 High | `GET /api/admin/staff` | Returns all staff, no limit |
| 🟡 Medium | `GET /api/admin/knowledge` | Returns all articles |
| 🟡 Medium | `GET /api/notifications` | No pagination, assumes small count |

**Correctly paginated:** ✅ `/api/jobs`, `/api/transactions`, `/api/admin/users`, `/api/peso/workforce`, `/api/peso/jobs`

**Fix pattern:**
```typescript
const page = Number(url.searchParams.get("page") ?? 1);
const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
const skip = (page - 1) * limit;
const [data, total] = await Promise.all([
  repository.findAll({ skip, limit }),
  repository.count(),
]);
return { data, meta: { page, limit, total } };
```

---

### 2. Missing CRUD Operations

| Resource | Missing Operation | Severity |
|---|---|---|
| Quotes | `GET /api/quotes/[id]` (individual) | 🟠 High |
| Quotes | `DELETE /api/quotes/[id]` | 🟠 High |
| PESO Groups | `PUT /api/peso/groups/[id]` | 🟡 Medium |
| PESO Groups | `DELETE /api/peso/groups/[id]` | 🟡 Medium |
| Messages | `DELETE /api/messages/[threadId]/[messageId]` | 🟡 Medium |
| Recurring | `PUT /api/recurring/[id]` individual update | 🟡 Medium |

---

### 3. Response Shape Inconsistency

There is **no standardized API response envelope**. Different endpoints return:
- `{ data }`
- `{ notifications, unreadCount }`
- `{ articles }`
- `{ staff: [...] }`
- Raw arrays
- `{ message: "..." }`

**Recommended standard:**
```typescript
// Success
{ data: T, meta?: { page, limit, total } }

// Error (already consistent via apiError())
{ error: string }
```

---

### 4. Missing Rate Limiting on Critical Endpoints

| Endpoint | Risk |
|---|---|
| `POST /api/payments` | Payment intent creation — financial abuse |
| `POST /api/jobs/[id]/fund` | Escrow funding — double-charge risk |
| `POST /api/ai/*` (10 endpoints) | OpenAI API costs — expensive abuse |
| `GET /api/providers` | Scraping all providers |
| `GET /api/admin/payouts` | Admin data dump |

---

### 5. Webhook Idempotency

PayMongo retries webhooks on timeout. Without idempotency, a retry can:
- Double-fund an escrow
- Double-activate a subscription
- Double-complete a transaction

**Fix:** Add a `webhookEventId` unique index to `Payment` model and check before processing.

---

### 6. AI Endpoint Issues

| Severity | Issue | File |
|---|---|---|
| 🟡 Medium | Inconsistent error response on missing API key — some return 503, others throw | Multiple `src/app/api/ai/*.ts` |
| 🟡 Medium | No OpenAI request timeout configured — calls can hang 30+ seconds | All AI routes |
| 🟡 Medium | `estimate-budget` returns 500 on invalid JSON from GPT — should be 422 | `ai/estimate-budget/route.ts` |

---

### 7. Cron Jobs — Minor Issues

All 11 cron endpoints are correctly protected via `verifyCronSecret()`. However:

| Severity | Issue |
|---|---|
| 🟠 High | No idempotency mechanism — duplicate cron triggers run operations twice |
| 🟡 Medium | Cron endpoints use GET method — side-effecting operations should use POST |

---

### 8. Public API Endpoints

`src/app/api/public/jobs/[id]/route.ts` does not use `withHandler()` — manual error handling is inconsistent with the rest of the codebase and returns `{ error: ... }` without `apiError()`.

---

## Data Model Audit

### 1. Missing Critical Indexes

| Severity | Model | Missing Index | Query Affected |
|---|---|---|---|
| 🟠 High | `Message` | `{ receiverId: 1, readAt: 1 }` | Unread count queries |
| 🟠 High | `Message` | `{ senderId: 1, readAt: 1 }` | Sent message history |
| 🟠 High | `Consultation` | `{ expiresAt: 1, status: 1 }` | Expiry cron job |
| 🟠 High | `Transaction` | `{ jobId: 1 }` | `findOneByJobId()` |
| 🟡 Medium | `ProviderProfile` | `{ pesoVerificationTags: 1 }` | PESO registry filter |
| 🟡 Medium | `ProviderProfile` | `{ barangay: 1 }` | PESO location filter |
| 🟡 Medium | `RecurringSchedule` | `{ status: 1, nextRunAt: -1 }` | Spawn cron |
| 🟡 Medium | `Quote` | `{ status: 1, expiresAt: -1 }` | Expiry cron |
| 🟡 Medium | `Job` | `{ jobSource: 1, status: 1 }` | PESO job listing |
| 🟡 Medium | `Job` | `{ isPriority: -1, createdAt: -1 }` | Priority job pinning |
| 🟡 Medium | `PesoOffice` | `{ region: 1, municipality: 1 }` | Office lookups |

---

### 2. Race Conditions & Atomicity

| Severity | Issue | Location |
|---|---|---|
| 🔴 Critical | Wallet balance update and `WalletTransaction` insert are **not atomic** — concurrent requests can leave `balanceAfter` stale | `src/repositories/wallet.repository.ts` |
| 🔴 Critical | Payment marked "paid" before `Transaction` created — webhook failure leaves orphaned payment | `src/services/payment.service.ts` |
| 🟠 High | No `reservedAmount` on Wallet — two simultaneous payout requests against same balance both succeed | `src/models/Wallet.ts` |

**Fix for wallet atomicity:**
```typescript
// Use MongoDB session transactions
const session = await mongoose.startSession();
session.startTransaction();
try {
  await Wallet.findOneAndUpdate({ userId }, { $inc: { balance: delta } }, { session });
  await WalletTransaction.create([{ ...txData }], { session });
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction();
  throw e;
} finally {
  session.endSession();
}
```

**Fix for wallet double-payout:**
```typescript
// Add reservedAmount field to Wallet model
reservedAmount: { type: Number, default: 0 }
// Virtual: availableBalance = balance - reservedAmount
// On payout initiation: $inc reservedAmount
// On payout completion: $inc balance -amount, $inc reservedAmount -amount
```

---

### 3. Monetary Amount Inconsistency

All financial models store amounts as JavaScript `Number` (floating point):
- `Job.budget: Number`
- `Transaction.amount: Number`
- `Payment.amount: Number` AND `Payment.amountInCentavos: Number` (redundant)
- `Wallet.balance: Number`

**Risks:**
- `0.1 + 0.2 === 0.30000000000000004` — rounding errors accumulate on commission calculations
- No currency field anywhere — blocks multi-currency

**Fix:**
```typescript
// Standardize all amounts as integers (centavos / minor units)
budget: { type: Number, min: 0, validate: { validator: Number.isInteger } }
currency: { type: String, default: "PHP" }  // Add to Job, Quote, Transaction, Payment
```

---

### 4. Missing Soft-Delete / Audit Fields

| Model | Missing Field | Impact |
|---|---|---|
| `Job`, `Quote`, `Review` | `deletedAt`, `isDeleted` | Cannot soft-delete without data loss |
| `Transaction`, `Payment` | `updatedBy` | No audit trail for admin modifications |
| `Review` | `updatedAt` disabled | Cannot track moderation changes |
| `Message` | `updatedAt` disabled | Cannot track edits (future feature) |

---

### 5. Payment Model Design Issues

| Severity | Issue |
|---|---|
| 🔴 Critical | No unique constraint on `{ jobId, clientId, status: "awaiting" }` — duplicate payment attempts |
| 🟠 High | `clientKey` stored but never validated — stale keys remain in DB |
| 🟠 High | Missing `confirmedAt` timestamp — no record of when webhook confirmed payment |
| 🟠 High | Missing `refundedAt` timestamp |
| 🟠 High | `providerId` optional even for completed payments — ambiguous payout target |

---

### 6. RecurringSchedule Tracking Gaps

| Missing Field | Impact |
|---|---|
| `spawnedJobIds[]` | No audit trail of which jobs were auto-created |
| `lastFailedAt` | Cannot detect broken schedules |
| `failureCount` | Cannot auto-disable after N failures |

---

### 7. Model Coverage Gaps

| Model | Repository | Service | Status |
|---|---|---|---|
| `QuoteTemplate` | ❌ | ❌ | Orphaned — direct model access in API routes |
| `LivelihoodGroup` | ❌ | ❌ | Orphaned — direct model access in API routes |
| `AppSetting` | ⚠️ Partial | ⚠️ via lib | Needs explicit repo |

---

## Frontend Audit

### 1. Loading & Error States

**Well implemented overall.** All major pages have `loading.tsx` files and Suspense boundaries.

| Minor Gap | Severity | Location |
|---|---|---|
| PESO pages use `useEffect` for data that should be in server component | 🟢 Low | `peso/dashboard/page.tsx:84` |
| Some modal forms don't check for null data before rendering | 🟡 Medium | Various modals |

---

### 2. Form Handling

| Severity | Issue | Location |
|---|---|---|
| 🟠 High | `CreateUserModal.tsx` — submit button lacks `disabled` state during submission (double-submit possible) | `admin/users/CreateUserModal.tsx` |
| 🟡 Medium | Some PESO forms need more robust double-submission checks | Various PESO pages |

---

### 3. Accessibility (a11y)

| Severity | Issue | Location |
|---|---|---|
| 🔴 Critical | Urgency level toggle buttons have no `aria-label` | `peso/emergency/page.tsx:210–224` |
| 🟡 Medium | Logo drop zone uses `role="button"` without keyboard accessibility | `peso/settings/page.tsx:404` |
| 🟡 Medium | Expander buttons missing `aria-label` (have `aria-expanded` but no label) | `peso/groups/page.tsx:216` |
| 🟢 Low | Icon-only delete buttons missing `aria-label` in tables | `peso/groups/page.tsx:406` |
| 🟢 Low | Some modal inputs missing label association | `peso/training/page.tsx:314` |

**Well-implemented:** ✅ Header buttons have `aria-label`, ✅ User menu has `role="menu"` + `aria-haspopup`, ✅ Main form fields properly labeled

---

### 4. Performance

| Severity | Issue | Location |
|---|---|---|
| 🟠 High | Large provider/worker lists not virtualized — `limit=100` fetched with no UI pagination | `peso/training/page.tsx`, `peso/groups/page.tsx` |
| 🟡 Medium | Chart data recalculated on every render without `useMemo` | `peso/dashboard/page.tsx` |
| 🟢 Low | 3 occurrences of `<img>` instead of `next/image` | `peso/settings/page.tsx:330, 425`, `post-job` photos step |

---

### 5. Component Reuse

| Severity | Issue |
|---|---|
| 🟡 Medium | `StatCard` component reimplemented in multiple PESO pages instead of reusing shared `KpiCard` |
| 🟡 Medium | `INPUT_CLS`, `LABEL_CLS`, `SELECT_CLS` constants copy-pasted across many pages — should be in `src/lib/styles.ts` |
| 🟡 Medium | Filter/search UI bar repeated across list pages — extract to `FilterBar` component |

---

### 6. Role Guard & Route Protection

✅ All dashboard routes protected at edge via `src/proxy.ts`
✅ All page server components check user role via `getCurrentUser()` + `redirect()`
✅ `RoleGuard` component used for conditional UI rendering
✅ Cannot navigate to `/admin/*` without admin role

---

### 7. Dashboard Page Completeness

| Status | Pages |
|---|---|
| ✅ Fully implemented | `/client/*`, `/provider/*`, `/admin/*`, `/peso/dashboard`, `/peso/settings`, `/peso/training`, `/peso/emergency`, `/peso/groups`, `/peso/reports` |
| ⚠️ Needs verification | `/peso/officers`, `/peso/verification`, `/peso/referrals`, `/peso/onboarding`, `/peso/jobs`, `/peso/jobs/new` |
| 🔴 Stub | `/peso/page.tsx` — only redirects to `/peso/dashboard` |

---

## Remediation Roadmap

### Sprint 1 — Security Critical (Week 1)

| Task | Files to Change |
|---|---|
| Hash password reset tokens with sha256 before storage | `src/services/auth.service.ts` |
| Hash email verification tokens | `src/services/auth.service.ts` |
| Hash OTP codes | `src/models/User.ts`, OTP service |
| Add audit log to impersonation | `src/app/api/admin/users/[id]/impersonate/route.ts` |
| Sanitize HTML in ArticleView (`sanitize-html`) | `src/components/shared/ArticleView.tsx` |
| Enforce `PAYMONGO_WEBHOOK_SECRET` at startup | `src/app/api/webhooks/paymongo/route.ts` |
| Add webhook idempotency (`webhookEventId` unique index) | `src/models/Payment.ts`, webhook handler |
| Validate `CRON_SECRET` at startup | `src/lib/cronAuth.ts` |

---

### Sprint 2 — Data Integrity (Week 2)

| Task | Files to Change |
|---|---|
| Wallet atomic transactions (MongoDB sessions) | `src/repositories/wallet.repository.ts` |
| Add `reservedAmount` to Wallet model | `src/models/Wallet.ts` |
| Payment ↔ Transaction atomic sync | `src/services/payment.service.ts` |
| Add unique index: `{ jobId, clientId, status }` on Payment | `src/models/Payment.ts` |
| Add `confirmedAt`, `refundedAt` to Payment | `src/models/Payment.ts` |
| Add `currency` field to Job, Quote, Transaction, Payment | All financial models |
| Standardize amounts to integers (centavos) | All financial models |
| Add missing indexes (Message, Consultation, Transaction, ProviderProfile) | Model files |

---

### Sprint 3 — Architecture (Week 3)

| Task | Files to Change |
|---|---|
| Create `src/repositories/quoteTemplate.repository.ts` | New file |
| Create `src/services/quoteTemplate.service.ts` | New file |
| Refactor `src/app/api/quote-templates/*` to use repo | Route files |
| Create `src/repositories/livelihoodGroup.repository.ts` | New file |
| Create `src/services/livelihoodGroup.service.ts` | New file |
| Refactor `src/app/api/peso/groups/*` to use repo | Route files |
| Export missing 5 services in `src/services/index.ts` | `src/services/index.ts` |
| Remove direct model imports from 4 services | `payment.service.ts`, `job.service.ts`, etc. |
| Remove `console.log` from production code | 4 files |

---

### Sprint 4 — API Quality (Week 4)

| Task | Files to Change |
|---|---|
| Add pagination to `GET /api/admin/payouts` | `admin/payouts/route.ts` |
| Add pagination to `GET /api/admin/disputes` | `admin/disputes/route.ts` |
| Add pagination to `GET /api/admin/staff` | `admin/staff/route.ts` |
| Add `GET /api/quotes/[id]` and `DELETE /api/quotes/[id]` | New route files |
| Add `PUT/DELETE /api/peso/groups/[id]` | New route handlers |
| Add rate limiting to `POST /api/payments`, `POST /api/ai/*` | Route files |
| Standardize response envelope across all routes | All API routes |
| Add cron idempotency (track last execution time) | Cron routes + model |
| Configure OpenAI request timeout | `src/lib/openai.ts` |

---

### Sprint 5 — Frontend Polish (Week 5)

| Task | Files to Change |
|---|---|
| Fix `aria-label` on urgency buttons | `peso/emergency/page.tsx` |
| Fix keyboard accessibility on logo dropzone | `peso/settings/page.tsx` |
| Fix double-submit on `CreateUserModal` | `admin/users/CreateUserModal.tsx` |
| Replace 3 `<img>` with `next/image` | PESO settings, post-job photos |
| Add UI pagination to large PESO lists | `peso/training/page.tsx`, `peso/groups/page.tsx` |
| Extract `StatCard` duplication to `KpiCard` | PESO dashboard pages |
| Centralize form style constants | `src/lib/styles.ts` (new) |
| Add `useMemo` to chart data computation | `peso/dashboard/page.tsx` |
| Verify/implement remaining PESO stub pages | `peso/officers`, `peso/referrals`, etc. |

---

### Ongoing

- Replace in-memory rate limiter with Redis-backed solution before multi-instance deployment
- Add API versioning (`/api/v1/`) before exposing to B2B partners
- Add virus scanning on file uploads (ClamAV or Cloudinary add-on)
- Add API response envelope standardization across all routes

---

*Generated 2026-03-09 — 5 audit agents × parallel execution — 145 total findings*
