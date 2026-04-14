# LocalPro Marketplace — Codebase Analysis

## Executive Summary

LocalPro is a **skilled trades marketplace platform** (similar to TaskRabbit, Handy, or Upwork for local services) built with **Next.js (TypeScript), React, MongoDB, and PayMongo**. It connects **clients seeking local services** with **skilled providers** through escrow-protected transactions, featuring a sophisticated matching, payment, and dispute resolution system. The platform includes specialized programs for government employment (PESO), business bulk ordering, and agency management.

---

## 1. Job Categories & Service Types

### 1.1 Core Job Categories (24 Total)

The platform organizes services into **24 primary categories**:

#### Home & Building Services (11)
- **Plumbing** — Pipe installation, leak repairs, drain cleaning, water system maintenance
- **Electrical** — Wiring, panel upgrades, outlet installation, electrical troubleshooting
- **Cleaning** — Residential and commercial cleaning, deep cleaning, housekeeping
- **Landscaping** — Lawn care, garden design, tree trimming, outdoor maintenance
- **Carpentry** — Custom furniture, cabinetry, framing, wood repairs
- **Painting** — Interior and exterior painting, finishing, surface preparation
- **Roofing** — Roof installation, repair, inspection, waterproofing
- **HVAC** — Heating, ventilation, air conditioning, installation, repair, maintenance
- **Moving** — Residential and commercial moving, packing, transport
- **Handyman** — General home repairs, assembly, minor fixes, maintenance
- **Masonry & Tiling** — Brickwork, concrete, tile setting, stone masonry, rebar work

#### Mechanical & Automotive (2)
- **Automotive & Mechanics** — Car repair, diagnostics, diesel mechanics, vehicle maintenance
- **Mechanical & Industrial** — CNC operation, millwright work, industrial equipment maintenance

#### Technology (2)
- **IT & Technology** — Computer repair, network setup, IT support, software troubleshooting
- **Electronics & Telecom** — Electronics repair, telecoms installation, line maintenance

#### Food & Service (2)
- **Food & Culinary** — Cooking, catering, baking, pastry, food prep
- **Tailoring & Fashion** — Clothing alterations, custom tailoring, dressmaking, fabric work

#### Transportation (1)
- **Transportation & Logistics** — Freight driving, delivery, crane/forklift operation

#### Health & Safety (2)
- **Health & Medical** — Paramedic, medical lab, dental, pharmacy technician services
- **Safety & Security** — Firefighting, security system installation, safety compliance

#### Beauty & Personal Care (1)
- **Beauty & Personal Care** — Hair styling, makeup, nail care, massage therapy, esthetics

#### Pet Care (1)
- **Pet Care & Grooming** — Pet grooming, bathing, trimming, animal care

#### Catch-all (1)
- **Other** — Services that don't fit other categories

### 1.2 Granular Skills

Beyond categories, the system supports **200+ specific skills** (stored in `Skill` collection):
- Each skill has a `name` (normalized lowercase), `label` (display form), and `usageCount` (tracking)
- Examples: "Pipe Installation", "Leak Repair", "Drain Cleaning", "Wiring Installation", "Circuit Breaker Repair", etc.
- Providers maintain a list of skills with years of experience and hourly rates

---

## 2. User Roles & Account Types

The platform supports **5 core user roles**:

| Role | Function |
|------|----------|
| **client** | Posts jobs, receives quotes, pays for services via escrow |
| **provider** | Submits quotes, completes work, withdraws earnings |
| **admin** | Platform moderation, dispute resolution, user verification, analytics |
| **staff** | PESO-specific: Secondary officers at employment service offices |
| **peso** | PESO office head or representative with governance permissions |

### Special Account Types:

1. **Business Client** (`BusinessOrganization`)
   - Multiple locations with individual budgets and manager assignments
   - Pricing tiers: **Starter** (2 locations), **Growth** (5), **Pro** (15), **Enterprise** (unlimited)
   - Job limits per month: Starter (10), Growth (50), Pro/Enterprise (unlimited)

2. **Agency Provider** (`AgencyProfile`)
   - Providers organizing multiple staff or subcontractors
   - Staff payouts tracked separately via `AgencyStaffPayout`

3. **PESO Office** (`PesoOffice`)
   - Government employment service offices
   - Head officer + staff officers
   - Capabilities: refer workers, post jobs, verify certifications, manage livelihood groups

---

## 3. Core Platform Features

### 3.1 Job Lifecycle

```
Job Status Flow:
pending_validation → open → assigned → in_progress → completed
                  ↓        ↓           ↓
              rejected  disputed  refunded → completed
```

**Job States:**
- `pending_validation` — Admin review after posting (fraud detection applied)
- `open` — Listed to providers, accepting quotes
- `assigned` — Provider quote accepted, awaiting escrow funding
- `in_progress` — Escrow funded, work underway
- `completed` — Work finished, client accepts, escrow released
- `disputed` — Conflict raised by client or provider
- `rejected` — Admin rejected during validation
- `refunded` — Escrow funding returned to client
- `expired` — No quotes received within window
- `cancelled` — Cancelled by client or admin

**Escrow Status (Parallel):**
- `not_funded` — Payment not yet made
- `funded` — PayMongo checkout completed, funds held
- `released` — Funds released to provider (after job completion)
- `refunded` — Funds returned to client

### 3.2 Bidding & Quotes System

**Quote/Bidding Process:**
1. Multiple providers submit quotes on open jobs
2. Each quote includes:
   - `proposedAmount` (total price in PHP)
   - `laborCost` + `materialsCost` (breakdown, optional)
   - `timeline` (estimated duration)
   - `milestones` (project phases with individual amounts)
   - `notes` and `sitePhotos` (optional proposal documentation)
   - `message` (cover letter, min 20 chars)

3. Quotes can be:
   - `pending` — Awaiting client review
   - `accepted` — Client chose this provider
   - `rejected` — Client passed
   - Revised up to N times with expiration tracking

**Milestone Payments:**
- Jobs can define payment milestones (e.g., 50% on start, 50% on completion)
- Milestone status tracked: `pending` or `released`
- Partial escrow release supported for complex projects

### 3.3 Messaging & Communication

- **Thread-based messaging** between client and provider
- Message types: `text`, `file`, `system`
- File uploads support (mime type, size tracking)
- Read receipts (`readAt` timestamp)
- File attachment support: `fileUrl`, `fileName`, `fileMime`, `fileSize`

### 3.4 Consultations

Precursor to formal job posting for initial estimates:

**Types:**
- `site_inspection` — In-person consultation with photos
- `chat` — Remote discussion

**States:**
- `pending` → `accepted/declined` → `converted` (to job) / `expired`
- Provider can submit estimate with `estimateAmount` and `estimateNote`
- Photos required (1-5 images)
- Automatic expiration after set date

### 3.5 Reviews & Reputation

- **5-star rating system** with detailed breakdown:
  - Quality
  - Professionalism
  - Punctuality
  - Communication
- 10–500 character feedback required
- Provider can respond to reviews (up to 500 chars)
- Reviews can be hidden by admin with reason
- Unique constraint: One review per client per job

**Provider Metrics:**
- `avgRating` (0–5 stars)
- `completedJobCount`
- `completionRate` (0–100%)
- `avgResponseTimeHours`

### 3.6 Payments & Transaction System

**Payment Flow:**

1. **Client initiates checkout** → PayMongo intent created
2. **Payment statuses:** `awaiting_payment` → `processing` → `paid` / `failed`
3. **Refund support:** `refunded` status with `refundedAt` timestamp

**Fee Breakdown (Client Pays):**
- `escrowFee` — Non-refundable escrow service fee (default 2% of job amount)
- `processingFee` — Payment processor fee (default 2%)
- `urgencyFee` — Same-day or rush booking fee (₱50 / ₱100)
- `platformServiceFee` — Platform fee (configurable)
- **Total charged** = job amount + all fees

**Payment Tracking:**
- `paymentIntentId` (PayMongo reference)
- `ledgerJournalId` (double-entry accounting)
- `webhookEventId` (idempotency)
- Unique constraint: One pending payment per job/client combo

### 3.7 Wallet & Balance System

**Provider Wallet:**
- `balance` — Available funds for withdrawal
- `reservedAmount` — Locked during in-flight withdrawals (prevents double-spend)
- Currency: PHP

**Wallet Transactions:**
- Log of all credits/debits
- Types: earnings (job completion), withdrawals, refunds, adjustments

### 3.8 Payouts & Withdrawals

**Payout Model:**
- Providers request withdrawal → Admin reviews → Bank transfer
- **Status:** `pending` → `processing` → `completed` / `rejected`
- Bank details required: `bankName`, `accountNumber`, `accountName`

**Withdrawal Fees:**
- Bank transfer: ₱20 (default)
- GCash/Maya: ₱15 (default)
- Flat fees deducted at payout request

**Features:**
- `autoApproved` flag for qualified providers (auto-process payouts)
- `ledgerJournalId` for accounting
- `rejectionJournalId` (separate journal for reversals)

### 3.9 Disputes & Conflict Resolution

**Dispute Lifecycle:**

```
open → investigating → resolved
```

**Trigger:**
- Either client or provider can raise a dispute
- Requires reason (min 20 chars) + evidence (up to 5 images)

**Resolution:**
- Admin investigates and marks `resolved`
- `wasEscalated` — True if escalated to investigating (triggers handling fee)
- **Escalation Levels:** provider → admin → peso (government)

**Handling Fee:**
- ₱100 (default) flat fee charged to losing party when escalated
- Only charged if dispute was escalated
- Deducted from wallet
- Tracked: `losingParty` (client | provider | both), `handlingFeePaid`

---

## 4. Business Model & Pricing

### 4.1 Commission Structure

**Platform Commission:** 15% (BASE_COMMISSION_RATE)
- Applied to provider earnings from service completion
- Higher services: 20% commission (HIGH_COMMISSION_RATE)

**Example:**
```
Job amount: ₱1,000
Commission (15%): ₱150
Provider earns: ₱850
```

### 4.2 Fee Schedule

| Fee Type | Amount | Notes |
|----------|--------|-------|
| **Escrow Service Fee** | 2% (default) | Charged to client, non-refundable |
| **Payment Processing Fee** | 2% (default) | Charged to client, non-refundable |
| **Same-Day Urgency Fee** | ₱50 | Rush booking surcharge |
| **Rush (2-hour) Fee** | ₱100 | Emergency service premium |
| **Withdrawal Fee (Bank)** | ₱20 | Flat rate on provider payouts |
| **Withdrawal Fee (GCash/Maya)** | ₱15 | Digital wallet withdrawal |
| **Dispute Handling Fee** | ₱100 | Charged to losing party when escalated |
| **Cancellation Fee** | Tiered | 0–24h free, ₱100 flat 12–24h, 20% of job 1–12h |

### 4.3 Business Plans (for Business Clients)

| Plan | Locations | Members | Monthly Jobs | Price |
|------|-----------|---------|--------------|-------|
| **Starter** | 2 | 5 | 10 | Free |
| **Growth** | 5 | 15 | 50 | (TBD) |
| **Pro** | 15 | 50 | Unlimited | (TBD) |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom |

**Features by Plan:**
- Location budgets tracked separately with alerts
- Category restrictions per location
- Preferred provider lists
- Location-specific managers

### 4.4 Key Financial Models

**Double-Entry Ledger System:**
- All transactions recorded in `LedgerEntry` for accounting
- Journal IDs track:
  - Escrow funding (`escrow_funded_gateway`)
  - Dispute fee deductions
  - Payout reversals

**Loyalty & Referral Rewards:**
- Loyalty tier system: Standard → Silver → Gold → Platinum
- Points earned on completed jobs, redeemable as credits
- Referral code generation with bonus tracking

---

## 5. Typical User Workflows

### 5.1 Client Workflow

```
1. Post Job
   ├─ Select category
   ├─ Add title, description, location, budget
   ├─ Schedule date
   └─ Submit (fraud detection applied)
   
2. Review Quotes
   ├─ Receive quotes from multiple providers
   ├─ Compare rate, timeline, milestones
   └─ Accept best quote (or negotiate)

3. Fund Escrow
   ├─ Complete PayMongo checkout
   ├─ Funds held in escrow
   └─ Notification sent to provider

4. Approve Work
   ├─ Provider completes job
   ├─ Client approves or disputes
   └─ If approved → escrow released to provider

5. Leave Review
   ├─ Rate quality, professionalism, punctuality, communication
   ├─ Write feedback
   └─ Earn loyalty points
```

### 5.2 Provider Workflow

```
1. Create Profile
   ├─ Add bio, skills (with years experience + hourly rates)
   ├─ Set availability schedule (daily)
   ├─ Add service areas with GeoPairs (lat/lng)
   ├─ Upload portfolio items
   └─ Optional: Upload certifications (PESO verification)

2. Browse Jobs
   ├─ Filter by category, location, budget
   ├─ Apply location-based search
   └─ View job details, client history

3. Submit Quotes
   ├─ Proposed amount, labor/material breakdown
   ├─ Timeline and milestones
   ├─ Attach proposal docs and site photos
   ├─ Write message (cover letter, min 20 chars)
   └─ Track expiration and revisions

4. Get Selected
   ├─ Accept client's quote acceptance
   ├─ Job moves to "assigned" state
   └─ Wait for escrow funding

5. Complete Work
   ├─ Upload before/after photos
   ├─ Mark job complete
   └─ Escrow funds release to provider wallet

6. Withdraw Earnings
   ├─ Request payout with bank details
   ├─ Admin reviews (or auto-approves if qualified)
   ├─ Funds transferred (minus ₱20 bank fee)
   └─ Withdrawal fee deducted from wallet
```

### 5.3 Business Client Workflow

```
1. Create Organization
   ├─ Select plan (Starter, Growth, Pro, Enterprise)
   ├─ Add company name, logo, locations
   ├─ Set default monthly budget
   └─ Subscribe to plan

2. Manage Locations
   ├─ Add multiple service areas (limit per plan)
   ├─ Set per-location budget and alert thresholds
   ├─ Assign location manager
   ├─ Restrict job categories per location
   └─ Maintain preferred provider list

3. Post Jobs (Team)
   ├─ Post within monthly job limit
   ├─ Track usage per location
   ├─ Team members can post if assigned
   └─ Monitor spend vs. budget

4. Process Team Payouts
   ├─ If agency: Manage staff payouts
   ├─ Track earnings per team member
   └─ Auto-process payouts for qualified staff
```

### 5.4 PESO Officer Workflow

```
1. Setup Office
   ├─ Register office details (city, municipal, provincial)
   ├─ Add head officer + staff officers
   └─ Set logo and contact info

2. Refer Providers
   ├─ Single referral: Search worker, add to platform
   ├─ Bulk onboarding: CSV upload of workers
   └─ Track referral source

3. Post Jobs
   ├─ Post government-sponsored jobs
   ├─ Set as PESO program participant list
   └─ Broadcast to network

4. Verify & Certify
   ├─ Verify provider tags/skills
   ├─ Issue certifications with expiration dates
   ├─ Mark certifications as "verifiedByPeso"
   └─ Manage livelihood group memberships

5. Generate Reports
   ├─ Workforce registry (who's trained, employed)
   ├─ Job completion analytics
   ├─ Employment outcomes reporting
   └─ Scheduled mandate reports for government

6. Emergency Broadcasting
   ├─ Send urgent opportunity notifications
   ├─ Target specific skills or locations
   └─ Track response rates
```

---

## 6. Advanced Features

### 6.1 Fraud Detection

- **Risk scoring** on job submission (0–100 scale)
- **Fraud flags** tracked: spam patterns, budget outliers, location anomalies, etc.
- AI-powered content validation before job goes live

### 6.2 Geolocation & Search

- Jobs and providers stored with **GeoPoint** coordinates (MongoDB geo-spatial indexing)
- Service areas: Providers define multiple service locations
- Location-based filtering in provider search
- Distance calculations for matching

### 6.3 Notifications

- **In-app push notifications** with sound preferences
- **Types:** Quote received, job approved, payment completed, dispute alert, etc.
- **User preferences:** Mute certain channels, manage frequency
- Push subscriptions: Service worker integration (PWA)

### 6.4 Knowledge Base & Support

- **Knowledge articles** organized by audience:
  - Client (posting jobs, reviews, refunds, loyalty)
  - Provider (browsing, quotes, payouts, training)
  - Agency (team management)
- **SupportTicket** model for escalations
- In-app help chat with support team

### 6.5 Loyalty & Referrals

- **Loyalty account** per user:
  - Points (earned per completed job)
  - Credits (currency redeemable for fees)
  - Tier system: Standard → Silver → Gold → Platinum
  - Referral code generation
  - Referral bonus tracking

### 6.6 Training & Skill Development

- **TrainingCourse** model for PESO programs
- **TrainingEnrollment** tracking
- Courses linked to skills and job categories
- Completion certificates

### 6.7 Lead Subscriptions

- Providers can subscribe to **lead alerts** for specific categories/locations
- Jobs matching criteria immediately push-notified to subscribers
- Lead priority (VIP providers get priority matching)

### 6.8 Recurring Services

- **RecurringSchedule** for repeat jobs
- Frequency patterns (weekly, bi-weekly, monthly)
- Automatic quote and job generation
- Provider auto-assignment for returning clients

---

## 7. Data Model Architecture

### Core Collections (47 Models)

**Auth & Users:**
- `User` — Core account with role, verification status
- `UserProfile` — Extended user details (addr esses, preferences)

**Jobs & Matching:**
- `Job` — Main job posting entity
- `Quote` — Provider bids on jobs
- `JobApplication` — Legacy job applications (PESO)
- `Consultation` — Pre-job estimate requests

**Transactions & Payments:**
- `Payment` — PayMongo checkout records
- `Payout` — Provider withdrawal requests
- `Wallet`, `WalletTransaction` — Provider earnings
- `Transaction` — Legacy transaction log
- `LedgerEntry` — Double-entry accounting

**Reviews & Reputation:**
- `Review` — Job reviews (5-star, breakdown, feedback)
- `FavoriteProvider` — Client bookmarks

**Communication:**
- `Message` — Chat threads (text, files, system messages)
- `Notification` — In-app notifications
- `NotificationPreference` — User notification settings

**Business & Organization:**
- `BusinessOrganization` — Enterprise client accounts
- `BusinessMember` — Multi-location team members
- `AgencyProfile` — Provider agencies
- `AgencyInvite` — Staff onboarding invitations
- `AgencyStaffPayout` — Staff earnings tracking

**Government Integration:**
- `PesoOffice` — Employment service offices
- `LivelihoodGroup` — Government work programs

**Specialized:**
- `Dispute` — Conflict resolution
- `Consultation` — Pre-quote estimates
- `RecurringSchedule` — Repeat jobs
- `TrainingCourse`, `TrainingEnrollment` — Skill development
- `LeadSubscription` — Lead alerts
- `FeaturedListing` — Promotional listings
- `LoyaltyAccount`, `LoyaltyTransaction` — Rewards
- `BidCreditAccount` — Bid cost tracking
- `SupportTicket` — Help requests
- `Category` — Service categories
- `Skill` — Granular skills taxonomy

**System:**
- `AppSetting` — Platform configuration
- `Announcement` — Admin broadcasts
- `CronRun`, `CronLock` — Job scheduling
- `BackupLog`, `ActivityLog` — Auditing

---

## 8. API Architecture

**Authentication:**
- JWT-based (HttpOnly cookies)
- Refresh token rotation (15 min access, 7 day refresh)
- OTP support via Twilio

**Main API Sections (35+):**
1. Auth (register, login, refresh, OTP)
2. Current User & Preferences
3. Jobs (CRUD, status transitions)
4. Quotes (submit, accept, revise)
5. Messages & Chat (threaded)
6. Notifications (push, preferences)
7. Payments & Wallet (balance, transactions)
8. Favorites
9. Reviews (leave, respond)
10. Disputes (raise, resolve)
11. KYC Verification
12. Skill Search
13. Categories
14. Loyalty & Referrals
15. Recurring Schedules
16. Consultations
17. Provider Profiles (skills, portfolio, scheduling)
18. Provider Boost (promotion)
19. Training Courses
20. Provider Agencies
21. Support Chat
22. Knowledge Base
23. PESO Integration
24. File Upload (Cloudinary)
25. Payouts
26. Recommendations (AI-powered)
27. Business Organizations
28. Admin (moderation, analytics)
29. Public endpoints (no auth)
30. Utility endpoints

---

## 9. Key Technology Stack

- **Frontend:** React with TypeScript, Next.js 14+
- **Styling:** Tailwind CSS, PostCSS
- **Backend:** Next.js API Routes (serverless on Vercel)
- **Database:** MongoDB with Mongoose ODM
- **Payment:** PayMongo (Philippines payment processor)
- **Email:** SendGrid or similar
- **SMS/OTP:** Twilio
- **File Storage:** Cloudinary (images, documents)
- **Analytics:** Sentry (error tracking), Custom events
- **PWA:** Service Worker for push notifications
- **Testing:** Vitest
- **Build/Deploy:** Vercel, pnpm workspace

---

## 10. Summary: Platform Value Proposition

**LocalPro is a B2B/C2C marketplace that:**

1. **Connects demand and supply** — Clients find skilled providers for local services
2. **Reduces transaction risk** — Escrow system protects both parties
3. **Quality assurance** — Reviews, ratings, and reputation metrics
4. **Government-backed** — PESO integration for employment and livelihood programs
5. **Enterprise-ready** — Business plans for bulk services and team management
6. **Fully localized** — Built for Philippines market (PHP currency, Barangay tracking, PESO partnership)
7. **Fair economics** — Transparent fee structure, auto-approval for trusted providers
8. **Frictionless** — Mobile-optimized, PWA support, in-app messaging, push notifications

**Core Differentiators:**
- **PESO integration** — Unique government employment partnership
- **Escrow + Dispute escalation** — Three-tier resolution (provider → admin → peso)
- **Flexible payment models** — Milestones, partial release, urgency fees
- **Business client plans** — Multi-location budgeting for enterprises
- **Provider loyalty** — Referrals, credits, tiered rewards

---

## 11. Admin & Moderation Tools

- **User verification** — KYC/identity verification, approval workflows
- **Job validation** — Fraud detection, manual review, rejection/approval
- **Dispute resolution** — Escalation review, evidence analysis, fund reallocation
- **Analytics dashboard** — Job completion rates, revenue, fraud metrics
- **Settings configuration** — Fees, commission rates, limits per plan
- **Announcements** — Platform-wide broadcasts to users

