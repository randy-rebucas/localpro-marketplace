# LocalPro Marketplace — Full Application Audit

**Date:** 2026-03-20
**Stack:** Next.js 16 / React 19 / MongoDB (Mongoose) / Vercel / PayMongo
**Models:** 45 Mongoose models | **API Routes:** 67+ endpoints | **Cron Jobs:** 16

---

## Executive Summary

LocalPro is a **production-grade Philippine local services marketplace** with strong fundamentals: double-entry ledger accounting, comprehensive RBAC, distributed rate limiting, SSE real-time notifications, and a well-architected escrow system. The app has **zero automated tests**, which is the single biggest risk. Below is a prioritized breakdown of every gap and recommendation across 8 audit domains.

---

## Scorecard

| Domain | Score | Critical Gaps |
|--------|-------|---------------|
| Security & Auth | **8/10** | Secrets in .env.local, no account lockout |
| Database & Performance | **6/10** | 8 missing indexes, 8 unbounded queries, no Redis caching |
| Payment & Escrow | **9/10** | Strong; minor gaps in auto-release and refund tracking |
| Job Lifecycle & Matching | **7/10** | No geo matching, no capacity mgmt, no schedule conflicts |
| Frontend & UX | **8/10** | No dark mode, no i18n, form validation not centralized |
| Testing & CI/CD | **2/10** | Zero tests, no GitHub Actions, no lint in CI |
| PESO / Admin / Notifications | **8/10** | SSE single-instance limit, no push notifications, no unsubscribe links |
| Operational Readiness | **7/10** | No feature flags, no structured logging, no API docs |

---

## 1. SECURITY & AUTHENTICATION (8/10)

### What's Strong
- JWT with 15-min access / 7-day refresh tokens, jti-based revocation
- Redis-backed token deny-list for instant revocation
- bcrypt-12 password hashing
- Distributed rate limiting (Upstash Redis) with hard-fail on sensitive endpoints
- 11-capability RBAC system (admin bypasses, staff gets granular permissions)
- Strong CSP headers, HSTS, X-Frame-Options: DENY
- File upload: magic byte verification, MIME validation, Cloudinary storage
- Webhook signature verification + idempotency (PayMongo, PayPal)
- OAuth state token CSRF protection (Facebook login)
- No `dangerouslySetInnerHTML` anywhere

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **Secrets exposed in `.env.local`** — MongoDB URI, JWT secrets, PayMongo keys, OpenAI key, Cloudinary creds all in plaintext | **CRITICAL** | Rotate ALL secrets immediately; verify `.gitignore` excludes `.env.local`; use Vercel env vars for prod |
| 2 | No account lockout after failed attempts | MEDIUM | Implement permanent lockout after 5 failures; require admin unlock |
| 3 | No rate limit on password reset endpoint | MEDIUM | Add 3 attempts/15 min per email |
| 4 | KYC documents may be publicly accessible on Cloudinary | MEDIUM | Verify Cloudinary access policies; implement signed URLs |
| 5 | No logout propagation across browser tabs | LOW | Use BroadcastChannel API for cross-tab logout |

---

## 2. DATABASE & PERFORMANCE (6/10)

### What's Strong
- 45 well-structured Mongoose models with timestamps
- Connection pooling: maxPoolSize 10, heartbeat 5s, maxIdle 270s
- Vercel Fluid Compute pool attachment for serverless
- Comprehensive `.lean()` usage on read-only queries
- Atomic transactions for wallet, ledger, and escrow operations
- Centavo-based integer storage for financial precision
- Soft delete pattern on User model

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **8 missing indexes** | **HIGH** | Add indexes on: `Job.escrowStatus`, `Job.invitedProviderId`, `Job.scheduleDate`, `Job.(status+escrowStatus)`, `Quote.status`, `Message.(senderId+receiverId)`, `Message.readAt`, `ProviderProfile.skills.skill` |
| 2 | **8 unbounded queries** — `findAllWithProvider()`, `findAll()` (Users), `listAllWithdrawals()`, `findAwaitingPaymentRelease()`, `findAllForClient()`, Categories, TrainingCourse, KnowledgeArticle | **HIGH** | Add pagination (limit + skip) to all; enforce max 100 per page |
| 3 | No Redis caching for hot paths | **HIGH** | Cache user profiles (1h TTL), provider schedules (15m), job counts (5m) |
| 4 | No cascade delete/soft-delete logic | MEDIUM | Soft-delete cascade: user deletion should mark related jobs/quotes/disputes |
| 5 | Deep population without field selection — `dispute.findByIdPopulated()` loads entire Job doc | MEDIUM | Add `.populate("jobId", "title status budget escrowStatus")` |
| 6 | No formal migration system | MEDIUM | Add `src/migrations/` with timestamped scripts and migration log collection |
| 7 | No data migration for legacy `string[]` skills | **HIGH** | Create script to convert `skills: ["Plumbing"]` → `[{ skill: "Plumbing", yearsExperience: 0, hourlyRate: "" }]` |
| 8 | `findActiveProviderIds()` uses in-memory `Set` dedup | LOW | Replace with `$group` aggregation |

---

## 3. PAYMENT & ESCROW (9/10)

### What's Strong
- **Double-entry ledger** with 20+ chart of accounts, immutable journal entries
- 3 escrow funding paths: PayMongo checkout, saved card auto-charge, wallet debit
- 3 release paths: full, partial, milestone-based
- Idempotent webhook processing (event ID dedup, atomic `atomicMarkPaid`)
- Atomic escrow release (CAS on `escrowStatus: "funded"`)
- Race condition prevention on concurrent payout requests
- PayMongo signature verification with replay protection (5-min window)
- Nightly reconciliation cron with 5 cross-validation checks
- Deferred revenue recognition (commission at release, not funding)
- Cancellation fee tiers by schedule proximity (0% / flat ₱100 / 20%)
- Comprehensive fee breakdown: escrow fee, processing fee, urgency fee, platform service fee, withdrawal fee
- PCI-compliant: no card data stored, all delegated to PayMongo

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | No auto-release after X days post-completion | MEDIUM | Add cron job: if `status=completed` + `escrowStatus=funded` for >7 days, auto-release with notification |
| 2 | Payout approval is manual only | MEDIUM | Add auto-approval for providers with 10+ completed jobs and Gold+ tier |
| 3 | No dedicated RefundRecord model | LOW | Track PayMongo refunds separately from wallet refunds for audit clarity |
| 4 | No rate limiting on payout request endpoint | MEDIUM | Add 3 requests/hour per provider |
| 5 | Bank account details in Payout model not encrypted at rest | LOW | Encrypt bank fields; use envelope encryption |

---

## 4. JOB LIFECYCLE & MATCHING (7/10)

### What's Strong
- 10-state machine with `canTransition()` guard utility
- Atomic quote acceptance with concurrent protection (CAS)
- Competitive bidding + direct hire flows
- Milestone-based payment plans
- Cancellation fee tiers with provider compensation
- Dispute resolution with ledger-backed escrow actions
- Fraud risk scoring at job creation
- Recurring job scheduling with provider lock-in
- AI-powered job ranking and category classification

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **No geographic proximity matching** — coordinates indexed but never queried | **HIGH** | Add `$geoNear` aggregation stage; expose radius filter in `/api/jobs` and `/api/providers` |
| 2 | **No provider capacity management** — unlimited concurrent jobs | **HIGH** | Add `maxConcurrentJobs` field to ProviderProfile; enforce in quote submission |
| 3 | **No schedule conflict detection** — providers can double-book | **HIGH** | Check existing `assigned`/`in_progress` jobs for overlapping `scheduleDate` |
| 4 | No deliverable acceptance workflow — client can only dispute, not reject and request revision | MEDIUM | Add `revision_requested` job status; allow provider to resubmit |
| 5 | No quote counter-offer or amendment | MEDIUM | Add `quote_revision` status; allow provider to update pending quotes |
| 6 | No auto-release timeout post-completion | MEDIUM | Cron: auto-release escrow after 7 days of `completed` status |
| 7 | Completion photos optional — provider can mark complete with no evidence | MEDIUM | Make at least 1 photo required for jobs above ₱500 |
| 8 | No admin cancellation override | LOW | Allow admins to cancel on behalf of clients in emergency situations |
| 9 | No review editing/deletion/moderation | MEDIUM | Add admin moderation, provider response to reviews |
| 10 | No weighted ratings — all reviews count equally regardless of job size | LOW | Weight by job value or recency |
| 11 | AI ranking requires client opt-in — not default | LOW | Enable AI ranking by default for categories with 5+ providers |

---

## 5. FRONTEND & UX (8/10)

### What's Strong
- Zustand stores with clear separation (auth, notifications, status)
- SSE real-time notifications with exponential backoff reconnection
- Auto token refresh with concurrent dedup
- Mobile-first responsive design with 50+ breakpoint instances
- PWA: service worker, offline page, web app manifest with shortcuts
- Sentry integration with session replay (5% prod)
- Web Push API infrastructure (VAPID keys)
- Comprehensive SEO: sitemap, robots.txt, OG tags, JSON-LD, meta tags
- Image optimization: AVIF + WebP, Cloudinary CDN
- Analytics: GTM, Meta Pixel, Vercel Analytics, custom conversion events
- Error boundaries at root and dashboard level

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **No dark mode** — partial `dark:` classes exist but no toggle or provider | MEDIUM | Complete dark mode with `next-themes`; respect `prefers-color-scheme` |
| 2 | **No i18n framework** — all text hardcoded in English | MEDIUM | Add `next-intl` or `i18next` if planning expansion beyond Philippines |
| 3 | Form validation is manual per-component — Zod installed but unused on frontend | MEDIUM | Create shared Zod schemas for client+server validation; integrate with React Hook Form |
| 4 | No optimistic updates beyond notification store | LOW | Expand optimistic patterns to job creation, quote acceptance |
| 5 | No centralized API client class | LOW | Create `ApiClient` with middleware, retry logic, timeout, AbortController |
| 6 | Accessibility gaps — no skip-to-content link, limited semantic HTML, no color contrast validation | MEDIUM | Add skip link, audit heading hierarchy, validate WCAG 2.1 AA contrast |
| 7 | No background sync for offline form submissions | LOW | Implement via service worker background sync API |
| 8 | No search history or saved searches | LOW | Store recent searches in localStorage or user preferences |

---

## 6. TESTING & CI/CD (2/10)

### What's Strong
- TypeScript strict mode enabled
- ESLint via `next lint`
- 24KB manual QA checklist (QA-CHECKLIST.md)
- Bundle analyzer available (`ANALYZE=true`)
- Vercel auto-deploy on push to main

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **Zero automated tests** — no unit, integration, or E2E tests | **CRITICAL** | Add Jest/Vitest for services (auth, payment, ledger, escrow); Playwright for critical flows (login, job post, escrow release) |
| 2 | **No GitHub Actions CI** — no lint, type-check, or test on PR | **CRITICAL** | Create `.github/workflows/ci.yml`: lint → type-check → test → bundle size |
| 3 | No branch protection rules | **HIGH** | Require CI pass + 1 approval before merge to main |
| 4 | No bundle size tracking in PRs | MEDIUM | Add `@vercel/ncc` or `size-limit` to CI with PR comments |
| 5 | No dependency security audit in CI | MEDIUM | Add `pnpm audit` step in CI; enable Dependabot/Renovate |
| 6 | No API documentation (OpenAPI/Swagger) | MEDIUM | Generate OpenAPI spec from route handlers or add Postman collection |
| 7 | No feature flag system | MEDIUM | Use `AppSetting` collection as simple flags, or adopt LaunchDarkly |
| 8 | No structured logging — ad-hoc `console.log` with `[CRON]`/`[SMS]` prefixes | MEDIUM | Replace with Pino structured JSON logging; integrate with Vercel Logs or Datadog |

---

## 7. PESO / ADMIN / NOTIFICATIONS (8/10)

### What's Strong
- Full PESO office management with head officer + staff hierarchy
- Workforce registry with 5 filter dimensions
- Emergency broadcast with priority tagging
- 11 granular staff capabilities
- 26 activity log event types for audit trail
- 32+ notification types with 23 auto-email triggers
- SSE real-time with exponential backoff reconnection
- Drip email campaigns (Day 3 + Day 7) with opt-out
- 3-tier featured listings (₱199/₱299/₱499 per week)
- 4-tier loyalty system with referral bonuses
- Training courses with lesson tracking and badge system
- Agency/business accounts with multi-staff, compliance, subscription plans

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | **SSE is single-instance only** — EventEmitter doesn't scale to multiple Vercel Functions | **HIGH** | Add Redis pub/sub adapter for `notificationBus`, `messageBus`, `supportBus` |
| 2 | **No push notifications** — VAPID keys configured, `pushSubscriptions` field exists, but not wired | **HIGH** | Implement `web-push` send on critical notifications (new quote, escrow funded, dispute) |
| 3 | **No unsubscribe links in emails** — CAN-SPAM/GDPR compliance risk | **HIGH** | Add one-click unsubscribe URL to all marketing/drip emails |
| 4 | No granular notification preferences — only binary `marketingEmails` toggle | MEDIUM | Add per-type toggles: job updates, payment alerts, marketing, reminders |
| 5 | No notification batching — client gets separate email per quote | MEDIUM | Aggregate: "You received 3 new quotes" digest email |
| 6 | No auto-escalation timer for disputes | MEDIUM | Auto-escalate to `investigating` after 48h of `open` status |
| 7 | No appeal mechanism for dispute resolution | LOW | Add `appeal` status with re-review workflow |
| 8 | Workforce registry lacks export-to-CSV | LOW | Add `GET /api/peso/workforce/export` with CSV response |
| 9 | No SMS notifications — only email + in-app | LOW | Integrate Twilio (credentials already in env) for critical alerts |

---

## 8. OPERATIONAL READINESS (7/10)

### What's Strong
- Vercel auto-deploy with security headers
- 16 cron jobs with auth, distributed locking, and execution tracking
- Daily MongoDB Atlas backups with comprehensive incident response runbook
- Multi-service health check endpoint (MongoDB, Cloudinary, Redis)
- Sentry APM with 10% trace sampling, session replay, CSP violation forwarding
- pnpm with locked dependencies (v9.0 format)
- Comprehensive `.env.example` (112 lines)

### What's Missing

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | No structured logging | MEDIUM | Replace `console.log/warn/error` with Pino JSON logger |
| 2 | No feature flag system | MEDIUM | Simple: use AppSetting collection; Advanced: LaunchDarkly |
| 3 | No API documentation | MEDIUM | Generate OpenAPI spec or maintain Postman collection |
| 4 | No cron failure alerting (Slack/email) | MEDIUM | Add webhook to Slack on `failCronRun()` |
| 5 | No automated backup verification | LOW | Quarterly automated restore-to-test-cluster |
| 6 | No secrets rotation schedule | LOW | Implement quarterly rotation; document rotation windows |
| 7 | No canary deployments | LOW | Use Vercel's preview deployments + traffic splitting |

---

## Priority Implementation Roadmap

### Phase 1 — Critical (Week 1-2)
1. **Rotate all exposed secrets** in `.env.local`
2. **Add 8 missing database indexes** (1-2 hours)
3. **Create data migration script** for legacy `string[]` skills
4. **Set up GitHub Actions CI** with lint + type-check
5. **Add pagination** to 8 unbounded queries

### Phase 2 — High Priority (Week 3-4)
6. **Write first tests** — auth service, escrow service, ledger service (unit)
7. **Add Redis pub/sub** for SSE scaling across Vercel Functions
8. **Implement push notifications** (web-push infrastructure already exists)
9. **Add unsubscribe links** to all email templates
10. **Add geographic proximity matching** using existing `coordinates` + `$geoNear`

### Phase 3 — Medium Priority (Month 2)
11. **Provider capacity management** — max concurrent jobs
12. **Schedule conflict detection** — prevent double-booking
13. **Shared Zod schemas** — client + server form validation
14. **Structured logging** — replace console.log with Pino
15. **Dark mode** — complete existing partial implementation
16. **Notification preferences** — per-type toggles
17. **Auto-release escrow** after 7 days post-completion
18. **Account lockout** after 5 failed login attempts

### Phase 4 — Polish (Month 3+)
19. E2E tests with Playwright (critical flows)
20. API documentation (OpenAPI)
21. Feature flag system
22. Review moderation + provider responses
23. Quote counter-offers
24. i18n framework (if expanding beyond Philippines)
25. Notification batching (digest emails)
26. SMS notifications via Twilio
27. Automated backup verification

---

## Files Referenced

**Security:** `src/lib/auth.ts`, `src/lib/rateLimit.ts`, `src/lib/cronAuth.ts`, `next.config.ts`
**Database:** `src/models/` (45 files), `src/repositories/` (all), `src/lib/db.ts`
**Payment:** `src/lib/paymongo.ts`, `src/lib/commission.ts`, `src/services/ledger.service.ts`, `src/services/payment.service.ts`, `src/services/escrow.service.ts`, `src/services/payout.service.ts`
**Jobs:** `src/lib/jobLifecycle.ts`, `src/services/job.service.ts`, `src/services/quote.service.ts`, `src/services/dispute.service.ts`
**Frontend:** `src/stores/`, `src/lib/fetchClient.ts`, `src/components/`, `src/app/layout.tsx`, `public/sw.js`
**Ops:** `vercel.json`, `src/lib/cronRun.ts`, `src/services/backup.service.ts`, `docs/incident-response.md`
**PESO/Admin:** `src/services/peso.service.ts`, `src/services/notification.service.ts`, `src/lib/email.ts`, `src/lib/events.ts`
