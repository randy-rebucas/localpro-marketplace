# LocalPro — QA Testing Checklist

**Version:** 1.0  
**Last Updated:** March 14, 2026  
**Environment URLs:** `http://localhost:3000` (dev) · `https://www.localpro.asia` (prod)  
**DB Reset:** `node --env-file=.env.local scripts/db-reset.mjs`  
**Seed Settings:** `node --env-file=.env.local scripts/seed-settings.mjs`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not yet tested |
| `[x]` | Passed |
| `[!]` | Failed / bug found |
| `[-]` | Skipped / N/A |

---

## 1. Public Pages

### 1.1 Homepage
- [ ] Homepage loads with featured providers carousel
- [ ] Hero CTA "Post a Job" redirects to `/login` if unauthenticated
- [ ] Hero CTA "Find a Provider" links to `/providers`
- [ ] Provider cards display name, skills, and rating correctly
- [ ] Null `userId` on ProviderProfile does not crash the page
- [ ] Homepage fully renders as a static page (no prerender crash)
- [ ] Structured data (JSON-LD) present in `<head>`
- [ ] OG image route `/api/og` returns a valid image

### 1.2 Public Job Board (`/board`)
- [ ] Job board loads open jobs
- [ ] AdFlash carousel rotates correctly
- [ ] Unauthenticated users can browse but not apply
- [ ] Pagination or infinite scroll works

### 1.3 Provider Directory (`/providers`)
- [ ] Provider list loads with filters
- [ ] Filtering by category narrows results
- [ ] Filtering by location narrows results
- [ ] Provider profile page (`/providers/[slug]`) loads correctly
- [ ] KYC-verified badge visible on approved providers

### 1.4 Auth Pages
- [ ] `/login` renders and accepts credentials
- [ ] `/register` renders with both Client and Provider options
- [ ] Google OAuth login flow completes
- [ ] Facebook OAuth login flow completes
- [ ] Incorrect password shows error toast
- [ ] "Forgot password" sends reset email
- [ ] Password reset link opens form and updates password
- [ ] Email verification link confirms account
- [ ] Expired email verification token shows error

### 1.5 Static Pages
- [ ] `/terms` renders Terms of Service
- [ ] `/privacy` renders Privacy Policy
- [ ] `/offline` renders offline fallback page
- [ ] `404` not-found page renders correctly

---

## 2. Authentication & Session

- [ ] Authenticated client redirects to `/client/dashboard`
- [ ] Authenticated provider redirects to `/provider/dashboard`
- [ ] Authenticated admin redirects to `/admin/dashboard`
- [ ] Unauthenticated access to any dashboard redirects to `/login`
- [ ] Session persists across page refresh
- [ ] Logout clears session and redirects to homepage
- [ ] Suspended account is blocked from logging in with clear error message
- [ ] Unverified email shows verification prompt instead of dashboard

---

## 3. Provider Onboarding

- [ ] Provider registers successfully with valid data
- [ ] Duplicate email shows "already in use" error
- [ ] Weak password is rejected with validation message
- [ ] Onboarding wizard launches after first login
- [ ] **Step 1 — Skills:** at least 1 skill required to advance
- [ ] **Step 2 — Profile:** bio, profile photo, and service areas save correctly
- [ ] **Step 3 — KYC:** document upload (ID, selfie) succeeds via Cloudinary
- [ ] Provider can access dashboard in limited mode before approval
- [ ] Provider cannot appear in marketplace until `approvalStatus = approved`
- [ ] Admin receives notification of new pending provider

---

## 4. Client Onboarding

- [ ] Client registers successfully
- [ ] Client is redirected to dashboard immediately (no wizard)
- [ ] Profile edit: name, avatar, phone number save correctly
- [ ] Address field with Google Places autocomplete works
- [ ] Client cannot post a job if `kycRequired = true` and KYC not approved

---

## 5. Job Lifecycle

### 5.1 Job Posting (Client)
- [ ] "Post a Job" form loads all categories
- [ ] Budget below minimum (₱500) is rejected
- [ ] Title, description, and category are required
- [ ] Google Places autocomplete selects address and saves lat/lng
- [ ] Job submitted as `status: pending_approval`
- [ ] Upload of job photos via Cloudinary works
- [ ] Client receives confirmation notification/email
- [ ] Admin and staff receive notification of new job to review

### 5.2 Job Approval (Admin/Staff)
- [ ] Pending jobs appear in admin job queue
- [ ] Admin can approve job → status changes to `open`
- [ ] Admin can reject job with reason → client is notified
- [ ] Approved job appears in provider marketplace

### 5.3 Browsing & Quoting (Provider)
- [ ] Provider marketplace shows only `open` jobs
- [ ] Job cards display title, budget, category, and distance
- [ ] Provider can filter by category and location
- [ ] Provider can open job detail modal
- [ ] Provider can submit a quote with price and message
- [ ] AI "Draft Quote" button generates a suggested message
- [ ] Provider cannot quote on their own jobs
- [ ] Provider cannot submit duplicate quotes
- [ ] Provider can use saved quote templates
- [ ] Client receives notification of new quote

### 5.4 Quote Acceptance (Client)
- [ ] Client views all received quotes on job page
- [ ] Client can accept a quote → job status changes to `assigned`
- [ ] All other quotes are automatically rejected
- [ ] Accepted provider receives notification
- [ ] Rejected providers receive notifications
- [ ] Job disappears from marketplace after assignment

### 5.5 Escrow Funding (Client)
- [ ] Client is prompted to fund escrow after accepting a quote
- [ ] **PayMongo path:** checkout link opens, payment completes, job → `funded`
- [ ] **PayMongo webhook** (`payment.paid`) triggers correctly
- [ ] **Wallet path:** wallet balance is sufficient, one-click fund works
- [ ] **Wallet path:** insufficient balance shows error
- [ ] **Override amount:** admin can fund with custom amount
- [ ] Provider receives "escrow funded" notification after payment
- [ ] Escrow funding ledger entries created (Dr 1100 Receivables / Cr 2000 Escrow Liability)

### 5.6 Job Execution (Provider)
- [ ] Provider can start job → status changes to `in_progress`
- [ ] Provider can upload before-photos via Cloudinary
- [ ] Provider can send messages to client on job
- [ ] Client can send messages to provider on job
- [ ] Provider can mark job complete → status changes to `pending_completion`
- [ ] Provider can upload after-photos when marking complete
- [ ] Client receives "job completed" notification

### 5.7 Milestones
- [ ] Provider can request a milestone split from the job page
- [ ] Client can approve or reject the milestone proposal
- [ ] Partial fund release works for an approved milestone
- [ ] Remaining balance is held until final completion
- [ ] Ledger entries recorded for each milestone release

### 5.8 Job Completion & Escrow Release (Client)
- [ ] Client reviews after-photos and confirms completion
- [ ] Escrow releases → provider earnings credited
- [ ] Platform commission deducted correctly (15% default)
- [ ] Job status changes to `completed`
- [ ] Provider receives "escrow released" notification
- [ ] Ledger entries: Dr 2000 Escrow Liability / Cr 2100 Earnings Payable + 4000 Platform Revenue

---

## 6. Provider Withdrawal from Active Job

- [ ] Provider can withdraw from an assigned/funded job
- [ ] Job status reverts to `open` and reappears in marketplace
- [ ] All existing quotes are rejected
- [ ] If escrow is funded, escrow is refunded to client wallet
- [ ] `provider_withdrew` activity event is logged
- [ ] Admin is notified of the withdrawal
- [ ] Provider cannot withdraw from jobs already `in_progress` without admin intervention

---

## 7. Repeat Booking

- [ ] Client can rebook a completed job with the same provider
- [ ] Repeat booking creates a new job with cloned fields
- [ ] Provider receives a notification for the repeat booking

---

## 8. Recurring Jobs (Subscription)

- [ ] Client can set a repeat schedule when posting a job (weekly/monthly/etc.)
- [ ] Cron job auto-creates the next occurrence when the current job completes
- [ ] Auto-pay from client wallet triggers correctly on renewal
- [ ] Client receives notification of auto-renewal
- [ ] Client can cancel a recurring schedule
- [ ] Cancelled recurring jobs do not spawn new occurrences

---

## 9. Consultations

- [ ] Client can request a consultation with a provider
- [ ] Provider receives notification of consultation request
- [ ] Provider can accept or decline the request
- [ ] Consultation thread opens for messaging
- [ ] Provider can convert a consultation into a job quote
- [ ] Client receives notification when consultation is accepted/declined

---

## 10. Reviews & Ratings

- [ ] Review form appears for client after escrow is released
- [ ] Client can rate on 4 dimensions (Quality, Professionalism, Punctuality, Communication)
- [ ] Comment is optional but review requires all 4 star ratings
- [ ] Provider receives notification of new review
- [ ] Provider's average rating updates on their profile
- [ ] Provider cannot review themselves
- [ ] Providers can leave a review of the client (optional)
- [ ] Reviews are visible on the provider's public profile

---

## 11. Provider Payout

- [ ] Provider can see available balance on Earnings page
- [ ] Provider can request a payout (min ₱500)
- [ ] Payout request saved with `status: pending`
- [ ] Admin receives notification of new payout request
- [ ] **Admin approves:** `status → paid`, provider notified, ledger entries created
- [ ] **Admin rejects:** provider notified with reason
- [ ] Provider can add/update bank account or e-wallet details
- [ ] Payout history shows all past requests and statuses

---

## 12. Wallet

### 12.1 Client Wallet
- [ ] Client can top up wallet via PayMongo
- [ ] Top-up webhook credits wallet correctly
- [ ] Wallet balance is shown on dashboard and fund-escrow flow
- [ ] Client can request wallet withdrawal (min ₱100 / app setting)
- [ ] Admin can approve or reject wallet withdrawal request
- [ ] Wallet transaction history is accurate

### 12.2 Provider Wallet
- [ ] Earned balance is credited after escrow release
- [ ] Provider can use wallet balance for Featured Listing purchase
- [ ] Provider can request payout from wallet (see §11)

---

## 13. Featured Listings (Provider Boost)

- [ ] Provider can view available boost tiers (Basic / Standard / Premium)
- [ ] **Wallet payment path:** deducts from wallet, creates `FeaturedListing` record, notifies provider
- [ ] **PayMongo payment path:** checkout link opens, on webhook → listing activated
- [ ] **Dev fallback (free tier):** listing activates without payment if budget = 0
- [ ] Boosted providers appear at the top of relevant search results
- [ ] `FeaturedListing` status is `active` after purchase
- [ ] Provider can cancel an active listing
- [ ] `status → cancelled` on cancellation; remaining credit refunded (if applicable)
- [ ] Cron job expires listings where `expiresAt < now` → `status: expired`
- [ ] `listingId` is included in the provider's notification data

---

## 14. Disputes

- [ ] Client can open a dispute on an active job
- [ ] Dispute reason and evidence (photos) can be submitted
- [ ] Job status changes to `disputed`
- [ ] Admin and staff notified of new dispute
- [ ] Admin can mark dispute as `investigating`
- [ ] **Resolve: release to provider** → escrow released, job `completed`
- [ ] **Resolve: refund to client** → escrow refunded, job `cancelled`
- [ ] Both parties notified of dispute resolution
- [ ] Ledger entries correct for each resolution path

---

## 15. Messaging / Chat

- [ ] Client and provider can exchange messages on a job
- [ ] Messages delivered in real-time via SSE
- [ ] Unread message count badge appears in sidebar
- [ ] Notification sent on new message (in-app + email)
- [ ] Chat history persists on page reload
- [ ] File/image attachments upload and display correctly

---

## 16. Notifications

- [ ] In-app notification bell shows unread count
- [ ] Notifications list renders all types (job updates, quotes, payments, system)
- [ ] Clicking a notification marks it as read and navigates correctly
- [ ] "Mark all as read" works
- [ ] **Push notifications (PWA):** user prompted to allow notifications
- [ ] Push notification received for new quote, job update, and payout
- [ ] `system_notice` notification type renders correctly
- [ ] Email notifications sent for all critical events (escrow funded, payout, dispute)
- [ ] SMS notification (Twilio) sent for OTP and critical alerts

---

## 17. Loyalty & Referrals

- [ ] Loyalty points credited after escrow release (on eligible tier)
- [ ] Loyalty balance visible on client/provider dashboard
- [ ] Points redeemable for discount on next job
- [ ] Referral link generated on dashboard
- [ ] Referred user registers via referral link
- [ ] Referrer credited after referred user's first job is completed
- [ ] Loyalty tier upgrade triggered at correct thresholds

---

## 18. Bid Credits

- [ ] Provider bid credit balance shown on marketplace page
- [ ] Submitting a quote deducts the correct number of bid credits
- [ ] Insufficient bid credits blocks quote submission with clear error
- [ ] Admin can grant or deduct bid credits from user management page
- [ ] Bid credit transaction history is visible to provider

---

## 19. Business Accounts

- [ ] Business owner can create an organisation
- [ ] Business owner can invite Manager and Staff members
- [ ] Staff invitation email received, account linked on accept
- [ ] Manager can post jobs on behalf of organisation
- [ ] Staff job submission enters `pending_approval` if spend approval enabled
- [ ] Manager approves staff job → job goes live
- [ ] Organisation spending limit enforced for managers
- [ ] Jobs tagged to correct branch/location
- [ ] Business analytics page loads with correct spend breakdown
- [ ] Owner can remove a team member (loses access immediately)
- [ ] Business plan subscription billing works (Growth/Enterprise)

---

## 20. Agency Accounts

- [ ] Agency owner registers and submits agency profile for approval
- [ ] Admin approves agency account
- [ ] Agency profile appears in marketplace with logo and name
- [ ] Agency owner can invite staff members
- [ ] Staff invite email received, account linked
- [ ] Agency wins a job quote → job assigned to agency
- [ ] Agency owner assigns job to available staff member
- [ ] Assigned staff member receives job details notification
- [ ] Staff can mark job complete, upload photos
- [ ] Earnings flow to agency wallet (not staff directly)
- [ ] Agency owner can initiate staff payout from agency wallet
- [ ] Agency profile rating updates after job completion

---

## 21. PESO Portal

- [ ] PESO Head Officer account created correctly by admin
- [ ] Head Officer can add staff officers to the office
- [ ] **Single referral:** officer refers a worker, worker receives SMS invite
- [ ] Worker activates LocalPro account via invite link
- [ ] Newly enrolled worker appears in registry with "Pending Verification"
- [ ] **Bulk onboarding:** CSV template downloads correctly
- [ ] Valid CSV upload creates invitation SMS for each row
- [ ] Invalid rows listed in Failed Records report
- [ ] Officer can verify a worker → LGU badge appears on public profile
- [ ] Officer can issue a trade certification → badge visible on profile
- [ ] Officer can revoke a certification with a reason
- [ ] Officer can create and manage livelihood groups
- [ ] Worker assigned to group appears in group analytics
- [ ] PESO job posted and visible in marketplace
- [ ] Officer can directly assign a job to a worker (no bidding)
- [ ] Emergency broadcast sends SMS + push to all providers in coverage area
- [ ] DOLE Placement Report generates and downloads as Excel
- [ ] Activity log records all officer actions (tamper-proof)

---

## 22. Admin Panel

### 22.1 User Management
- [ ] Admin can list all users with search and filters
- [ ] Admin can view individual user profile, jobs, and activity
- [ ] Admin can approve a pending provider
- [ ] Admin can reject a provider with reason
- [ ] Admin can approve / reject KYC documents
- [ ] Admin can suspend a user account
- [ ] Admin can unsuspend an account
- [ ] Admin can manually adjust wallet balance (credit/debit)
- [ ] Admin can grant / deduct bid credits

### 22.2 Job Management
- [ ] Admin can list all jobs with filters by status and category
- [ ] Admin can approve or reject pending jobs
- [ ] Admin can cancel an in-progress job with optional escrow refund
- [ ] Admin can view all quotes for a job

### 22.3 Payouts
- [ ] Pending payout requests visible in admin queue
- [ ] Admin can approve payout → status `paid`, ledger entry created
- [ ] Admin can reject payout with reason → provider notified

### 22.4 Disputes
- [ ] All disputes listed with status filter
- [ ] Admin can mark as `investigating`
- [ ] Admin can resolve in favour of client (refund)
- [ ] Admin can resolve in favour of provider (release)
- [ ] Notes/evidence are visible in the dispute thread

### 22.5 Announcements
- [ ] Admin can create a platform-wide announcement
- [ ] Announcement visible to targeted audience (client/provider/all)
- [ ] Announcement expires correctly after set date

### 22.6 Activity Logs
- [ ] Activity log page loads with all event types
- [ ] `provider_withdrew` event displays with correct orange chip
- [ ] Logs are filterable by user, event type, and date range

### 22.7 Knowledge Base (Admin)
- [ ] All 5 audience folders visible: client, provider, business, agency, peso
- [ ] Filter buttons for each folder work correctly
- [ ] Admin can create a new article (auto-generates slug)
- [ ] New article saved as `.md` file in correct `content/knowledge/{folder}/` directory
- [ ] Admin can edit an existing article (slug locked)
- [ ] Admin can delete an article
- [ ] Moving article to a different folder works (old file deleted, new file created)
- [ ] Article count badges in header are accurate per folder

### 22.8 App Settings
- [ ] Admin can view and update all settings keys
- [ ] `platform.registrationEnabled` = false blocks new registrations
- [ ] `platform.kycRequired` = true requires client KYC before job posting
- [ ] Commission rate changes reflect immediately on new jobs
- [ ] Min payout amount enforced at payout request

### 22.9 Accounting Page
- [ ] Trial balance loads and groups by account type (assets, liabilities, revenue, expense)
- [ ] Reconciliation banner shows balanced/unbalanced state
- [ ] Income statement figures match completed job totals for the period

---

## 23. Knowledge Base (User-Facing)

| Audience | Path | Articles |
|----------|------|---------|
| Client | `/client/knowledge` | 10 |
| Provider | `/provider/knowledge` | 10 |
| Business | `/business/knowledge` _(TBD)_ | 5 |
| Agency | `/agency/knowledge` _(TBD)_ | 5 |
| PESO | `/peso/knowledge` | 5 |

- [ ] Client knowledge index loads 10 articles grouped correctly
- [ ] Provider knowledge index loads 10 articles grouped correctly
- [ ] PESO knowledge index loads 5 articles grouped correctly
- [ ] Individual article page renders markdown as HTML correctly
- [ ] Search filters articles in real time
- [ ] "Back to Knowledge Base" link works on article detail
- [ ] `/api/knowledge` returns only articles matching user's role
- [ ] Non-client/provider `role` no longer blocked by ForbiddenError

---

## 24. AI Features

- [ ] "AI Draft" on quote form generates a relevant message
- [ ] AI generation shows loading state while waiting
- [ ] Fallback/error handled gracefully if OpenAI is unavailable
- [ ] AI draft can be edited before submitting

---

## 25. Fraud Detection

- [ ] High-risk job (suspicious description) flagged and held for review
- [ ] Repeated failed payments on an account trigger a review flag
- [ ] Admin fraud queue shows flagged items
- [ ] Admin can clear a fraud flag with a note

---

## 26. PWA & Offline

- [ ] App installable as PWA on Android Chrome
- [ ] App installable on iOS via Add to Home Screen
- [ ] App manifest returns correct name, icons, and theme colour
- [ ] Service worker registered successfully
- [ ] `/offline` page served when network is unavailable
- [ ] Push notification permission prompt appears for logged-in users
- [ ] Push notification received with correct title and body
- [ ] Clicking push notification opens the correct deep link

---

## 27. Webhooks & Cron Jobs

### 27.1 PayMongo Webhooks (`/api/webhooks/paymongo`)
- [ ] `payment.paid` event → escrow marked funded, ledger entries created
- [ ] `payment.paid` event → wallet top-up credited if source is wallet
- [ ] Invalid signature rejected with 401
- [ ] Duplicate event idempotent (no double credit)

### 27.2 Cron Jobs (`/api/cron/*`)
- [ ] Cron auth header required and validated
- [ ] Featured listing expiry cron sets expired listings to `status: expired`
- [ ] Recurring job cron creates next occurrence on due date
- [ ] CronLock prevents concurrent runs of the same job

---

## 28. API Security

- [ ] All protected routes return 401 without a valid session
- [ ] Role-scoped routes return 403 for wrong roles (client cannot hit admin routes)
- [ ] Zod validation rejects malformed request bodies with 422
- [ ] Rate limiting triggers on rapid repeat requests to auth/payment endpoints
- [ ] SQL/NoSQL injection attempts return 400 or 422, not 500
- [ ] CORS headers correct on public API routes

---

## 29. Emails (Resend)

| Template | Trigger |
|----------|---------|
| Welcome / verify email | New registration |
| Password reset | "Forgot password" |
| New quote received | Quote submitted |
| Quote accepted | Provider quote accepted |
| Escrow funded | Payment completed |
| Escrow released | Client confirms completion |
| Payout approved | Admin approves payout |
| Dispute opened | Dispute created |
| Dispute resolved | Admin resolves dispute |
| New message | Chat message received |
| Consultation request | Consultation created |
| System notice | `system_notice` notification |

- [ ] All email templates render correctly in Resend dashboard
- [ ] No broken links or missing variables in email bodies
- [ ] Emails sent to correct recipient (not admin by mistake)

---

## 30. Responsive & Cross-browser

- [ ] Homepage renders correctly on mobile (375px)
- [ ] Dashboard sidebar collapses to drawer on mobile
- [ ] Job post form fully usable on mobile
- [ ] Quote modal usable on mobile
- [ ] Chat interface scrolls correctly on mobile
- [ ] Tested on Chrome (latest), Firefox (latest), Safari 17+
- [ ] Tested on Android Chrome and iOS Safari

---

## 31. Performance & SEO

- [ ] Homepage Lighthouse performance score ≥ 80 (mobile)
- [ ] No console errors on initial load
- [ ] All images have `alt` text
- [ ] `<title>` and `<meta name="description">` present on all pages
- [ ] `sitemap.ts` returns valid XML with correct URLs
- [ ] `robots.ts` returns correct allow/disallow rules
- [ ] OG image (`/api/og`) loads correctly when shared on social

---

## Regression Smoke (Quick 15-min pass)

Run this sequence end-to-end after every major deploy:

1. [ ] Register provider → complete wizard → submit KYC
2. [ ] Admin approves provider
3. [ ] Register client → post job at ₱1,000
4. [ ] Admin approves job
5. [ ] Provider submits quote at ₱1,000
6. [ ] Client accepts quote
7. [ ] Client funds escrow via wallet (pre-load wallet with ₱1,000 via admin manual credit)
8. [ ] Provider marks job complete
9. [ ] Client confirms → escrow released
10. [ ] Check provider earnings balance = ₱850 (15% commission)
11. [ ] Client leaves a 5-star review
12. [ ] Provider requests payout → admin approves
13. [ ] Check accounting trial balance is reconciled (no unbalanced flag)

---

*Last updated by: automated generation — March 14, 2026*
