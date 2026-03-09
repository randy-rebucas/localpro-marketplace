# PESO Portal — Full Documentation

> **PESO** = Public Employment Service Office
> A Philippine government employment body embedded in LocalPro that bridges LGU workers and livelihood program beneficiaries to the service marketplace.

---

## Table of Contents

1. [What is PESO?](#1-what-is-peso)
2. [Roles & Permissions](#2-roles--permissions)
3. [Data Model](#3-data-model)
4. [Use Cases](#4-use-cases)
5. [Workflows](#5-workflows)
   - 5.1 Office Setup
   - 5.2 Officer Management
   - 5.3 Provider Referral (Single)
   - 5.4 Provider Bulk Onboarding
   - 5.5 Provider Verification
   - 5.6 Certification Management
   - 5.7 Job Posting
   - 5.8 Emergency Broadcast
   - 5.9 Workforce Registry
   - 5.10 Reports & Analytics
   - 5.11 Office Settings
6. [API Reference](#6-api-reference)
7. [Dashboard Pages](#7-dashboard-pages)
8. [Tags & Labels](#8-tags--labels)

---

## 1. What is PESO?

The **PESO Portal** is a dedicated section of LocalPro for accredited Public Employment Service Offices — typically city, municipal, or provincial government employment units. PESO officers use it to:

- Register and refer local workers to the LocalPro marketplace.
- Post government-sponsored or LGU-funded job listings.
- Verify and certify providers under official livelihood programs.
- Broadcast emergency employment opportunities to the community.
- Track employment outcomes and generate mandated reports.

Each PESO office maintains **one `PesoOffice` document** in the database that ties together:

- A **Head Officer** (the primary account).
- One or more **Staff Officers** (additional accounts under the same office).
- Scoped jobs, referrals, and verification activities.

---

## 2. Roles & Permissions

| Capability | Head Officer | Staff Officer |
|---|---|---|
| Add / remove staff officers | ✅ | ❌ |
| Update office profile & logo | ✅ | ❌ |
| Update office contact settings | ✅ | ❌ |
| Deactivate / delete the office | Admin only | Admin only |
| Post PESO jobs | ✅ | ✅ |
| Refer providers (single) | ✅ | ✅ |
| Bulk onboard providers (CSV) | ✅ | ✅ |
| Verify provider tags | ✅ | ✅ |
| Issue / revoke certifications | ✅ | ✅ |
| Send emergency broadcast | ✅ | ✅ |
| View workforce registry | ✅ | ✅ |
| View reports | ✅ | ✅ |
| Manage livelihood groups | ✅ | ✅ |
| Manage training programs | ✅ | ✅ |

> The system resolves which office a user belongs to by checking both `headOfficerId` and `officerIds` on the `PesoOffice` document.

---

## 3. Data Model

### 3.1 PesoOffice

| Field | Type | Description |
|---|---|---|
| `officeName` | String | Official name of the PESO office |
| `officeType` | `city \| municipal \| provincial` | Classification |
| `municipality` | String | LGU name |
| `province` | String | Province |
| `region` | String | Region (required) |
| `zipCode` | String | Postal code |
| `contactEmail` | String | Official contact email |
| `contactPhone` | String | Landline |
| `contactMobile` | String | Mobile / Viber |
| `address` | String | Street address |
| `website` | String | Optional official website |
| `logoUrl` | String | Cloudinary-hosted logo |
| `headOfficerId` | `ObjectId → User` | The Head Officer account |
| `officerIds` | `ObjectId[] → User` | Staff Officer accounts |
| `isActive` | Boolean | Enabled by admin; defaults `true` |

**Indexes:** `municipality` (for office search), `headOfficerId` (unique lookup).

### 3.2 ProviderProfile (PESO-related fields)

| Field | Type | Description |
|---|---|---|
| `pesoReferredBy` | `ObjectId → User` | Officer who referred this provider |
| `pesoVerificationTags` | `PesoVerificationTag[]` | Official verification labels |
| `livelihoodProgram` | String | Program name (e.g., TUPAD, SPES) |
| `barangay` | String | Provider's home barangay |

### 3.3 Job (PESO-related fields)

| Field | Type | Description |
|---|---|---|
| `jobSource` | `"peso"` | Marks the job as PESO-originated |
| `jobTags` | `JobTag[]` | Programme tags (see §8) |
| `pesoPostedBy` | `ObjectId → User` | Officer who posted the job |
| `isPriority` | Boolean | Set to `true` for emergency jobs |

### 3.4 Tag Enumerations

**PesoVerificationTag**

| Value | Meaning |
|---|---|
| `peso_registered` | Provider has formally registered with the PESO office |
| `lgu_resident` | Provider is a verified LGU resident |
| `peso_recommended` | Officer actively recommends this provider |

**JobTag (PESO subset)**

| Value | Meaning |
|---|---|
| `peso` | Standard PESO-posted job |
| `lgu_project` | LGU-funded community project |
| `gov_program` | National government programme |
| `emergency` | Emergency employment (DOLE/EEAP) |
| `internship` | Internship / on-the-job training |

---

## 4. Use Cases

### UC-01 — Onboard a New Worker
A PESO officer receives a referral form from a job seeker. They enter the worker's name, email, contact, and livelihood programme in the Referrals page. The system creates a `provider` account, marks `pesoReferredBy`, sends an activation email, and the worker appears immediately in the Workforce Registry.

### UC-02 — Bulk Onboard from CSV
After a SPES or TUPAD enrolment drive, an officer uploads a CSV file (columns: `name, email, mobile, barangay, livelihoodProgram`) on the Onboarding page. The system validates each row and sends activation emails to all new accounts in one operation.

### UC-03 — Post an LGU Job
A municipality is hiring 20 labourers for a road clearing project. The officer fills in the job form, selects the `lgu_project` tag, sets headcount, budget, and deadline. The job appears on the public marketplace tagged as a government opportunity.

### UC-04 — Emergency Broadcast
A typhoon response requires immediate manpower. The officer opens Emergency Broadcast, types the job description, and submits. The system creates an `[EMERGENCY]`-prefixed job with `budget: 0`, `isPriority: true`, and the `emergency` tag — pushing it to the top of the marketplace.

### UC-05 — Verify a Provider
During a community verification drive, an officer searches for a provider in the Verification page and assigns one or more PESO verification tags. Tags appear as badges on the provider's public profile and filter results in the Workforce Registry.

### UC-06 — Issue a Certification
After a training programme, the officer issues a `IPesoCertification` record to a provider (title, description, issued date). The certification appears on the provider's profile as a trust signal to potential clients.

### UC-07 — Generate Monthly Report
At end of month, the officer opens Reports. The dashboard shows: total providers referred, new this month, active jobs, completed jobs, total income generated by the cohort, average provider income, top skills, and top job categories — all scoped to this office's officers and tags.

### UC-08 — Track Workforce Registry
The Workforce Registry gives a searchable, filterable list of all providers referred or tagged by this office. Filters include barangay, skill, verification tag, and minimum rating.

---

## 5. Workflows

### 5.1 Office Setup (Admin → PESO)

```
Admin Panel
  └─ Create PesoOffice record
       └─ Set officeName, municipality, region, contactEmail
       └─ Create a User with role:"peso" → set as headOfficerId
  └─ Office is isActive: true
  └─ Head officer receives activation email → sets password
  └─ Head officer logs in → sees PESO portal at /peso/dashboard
```

### 5.2 Officer Management

```
Head Officer → /peso/officers
  ├─ Add Officer
  │    POST /api/peso/officers
  │    └─ Service: createUser(role:"peso") + sends activation email
  │    └─ PesoOffice.officerIds.push(newUserId)
  └─ Remove Officer
       DELETE /api/peso/officers/:id
       └─ Service: PesoOffice.officerIds.pull(officerId)
       └─ User account remains (not deleted)
```

### 5.3 Provider Referral (Single)

```
Officer → /peso/referrals → "Refer a Provider"
  └─ Fill form: name, email, mobile, barangay, livelihoodProgram
  └─ POST /api/peso/referrals
       └─ Service: referProvider(dto)
            ├─ createUser({ role:"provider", ... })
            ├─ ProviderProfile.pesoReferredBy = officerId
            ├─ ProviderProfile.livelihoodProgram = dto.livelihoodProgram
            └─ sendActivationEmail(newUser)
  └─ Provider appears in Workforce Registry immediately
  └─ Provider completes their own profile after activation
```

### 5.4 Provider Bulk Onboarding (CSV)

```
Officer → /peso/onboarding → Upload CSV
  └─ POST /api/peso/bulk-onboard  (multipart/form-data)
       └─ Service: bulkOnboard(rows[])
            ├─ For each row: createUser + set pesoReferredBy
            ├─ sendActivationEmail for each new account
            └─ Return: { success: n, errors: [{row, reason}] }
  └─ Results summary shown inline (success count + any row errors)
```

**Expected CSV columns:**

| Column | Required | Notes |
|--------|----------|-------|
| `name` | ✅ | Full name |
| `email` | ✅ | Must be unique |
| `mobile` | ❌ | Used for SMS alerts |
| `barangay` | ❌ | Stored on ProviderProfile |
| `livelihoodProgram` | ❌ | e.g. TUPAD, SPES, DOLE-AKAP |

### 5.5 Provider Verification

```
Officer → /peso/verification → Search provider
  └─ Select provider → Assign tags
       PATCH /api/peso/providers/:id/verify
       └─ Service: verifyProvider(providerId, tags[])
            └─ ProviderProfile.pesoVerificationTags = tags
  └─ Tags shown as badges on provider's public profile
  └─ Registry filters by verificationTag
```

### 5.6 Certification Management

```
Officer → /peso/verification → Provider card → "Add Certification"
  └─ Fill: title, description, issuedAt
       POST /api/peso/providers/:id/certifications
       └─ Service: addCertification(providerId, cert)
            └─ ProviderProfile.certifications.push(cert)

Officer → Remove Certification
  └─ DELETE /api/peso/providers/:id/certifications
       └─ Service: removeCertification(providerId, certId)
            └─ ProviderProfile.certifications.pull({ _id: certId })
```

### 5.7 Job Posting

```
Officer → /peso/jobs → "Post a New Job"  (/peso/jobs/new)
  └─ Fill: title, description, category, tags[], budget, headcount, deadline
       POST /api/peso/jobs
       └─ Service: postJob(officerId, dto)
            ├─ Job.jobSource = "peso"
            ├─ Job.jobTags = dto.tags   (peso | lgu_project | gov_program | internship)
            ├─ Job.pesoPostedBy = officerId
            └─ Job saved → appears on public marketplace
  └─ Officer can view all PESO jobs at /peso/jobs
       GET /api/peso/jobs
       └─ Service: listPesoJobs(officerId) — filters by pesoPostedBy
```

### 5.8 Emergency Broadcast

```
Officer → /peso/emergency
  └─ Fill: description, requiredSkill, location, contactPerson
       POST /api/peso/emergency
       └─ Service: sendEmergencyBroadcast(officerId, dto)
            ├─ Job.title = "[EMERGENCY] " + dto.description
            ├─ Job.budget = 0
            ├─ Job.isPriority = true
            ├─ Job.jobTags = ["emergency", "peso"]
            └─ Job saved → surfaced at top of marketplace
```

### 5.9 Workforce Registry

```
Officer → /peso/workforce
  └─ GET /api/peso/workforce?page=&barangay=&skill=&verificationTag=&minRating=
       └─ Repository: getProviderRegistry(filters)
            ├─ Aggregates ProviderProfile + User
            ├─ Filters: barangay, skill regex, verificationTag, minRating
            └─ Sorted by completedJobCount DESC
  └─ Results: paginated table with avatar, name, skills, tags, rating, job count
```

### 5.10 Reports & Analytics

```
Officer → /peso/reports
  └─ GET /api/peso/reports
       └─ Service: getReports(officerId)
            └─ Repository: getOfficeReportStats(officerIds[])
                 ├─ totalProviders referred by this office
                 ├─ newProvidersThisMonth
                 ├─ activeJobs (open + assigned + in_progress)
                 ├─ completedJobs
                 ├─ totalIncomeGenerated  (sum of tx.netAmount on completed jobs)
                 ├─ avgProviderIncome
                 ├─ tagBreakdown  [{tag, count}]
                 ├─ topSkills     [{skill, count}]
                 └─ topCategories [{category, count}]
  └─ All figures scoped to jobs where pesoPostedBy ∈ office.officerIds
     and providers where pesoReferredBy ∈ office.officerIds
```

### 5.11 Office Settings

```
Head Officer → /peso/settings
  ├─ View/edit office details
  │    GET  /api/peso/settings  → Service: getOfficeSettings(officerId)
  │    POST /api/peso/settings  → Service: updateOfficeSettings(officerId, dto)
  │         Updates: officeName, contactEmail, contactPhone, contactMobile,
  │                  address, website, zipCode
  └─ Upload office logo
       POST /api/peso/settings/logo  (multipart/form-data)
       └─ Service: updateOfficeLogo(officerId, file)
            └─ Uploads to Cloudinary → saves logoUrl on PesoOffice
```

---

## 6. API Reference

All routes require an authenticated session with `role: "peso"`. The service layer resolves the caller's `PesoOffice` via `findOfficeByOfficerId(userId)`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/peso/dashboard` | Key KPI stats for the office |
| `GET` | `/api/peso/workforce` | Paginated, filtered workforce registry |
| `GET` | `/api/peso/jobs` | List jobs posted by this office |
| `POST` | `/api/peso/jobs` | Post a new PESO job |
| `POST` | `/api/peso/referrals` | Refer a single provider |
| `POST` | `/api/peso/bulk-onboard` | CSV bulk provider onboarding |
| `PATCH` | `/api/peso/providers/:id/verify` | Set verification tags on a provider |
| `POST` | `/api/peso/providers/:id/certifications` | Add certification to a provider |
| `DELETE` | `/api/peso/providers/:id/certifications` | Remove certification |
| `POST` | `/api/peso/emergency` | Send emergency job broadcast |
| `GET` | `/api/peso/officers` | List officers in this office |
| `POST` | `/api/peso/officers` | Add a new staff officer |
| `DELETE` | `/api/peso/officers/:id` | Remove a staff officer |
| `GET` | `/api/peso/reports` | Office-scoped employment report |
| `GET` | `/api/peso/settings` | Fetch office settings |
| `POST` | `/api/peso/settings` | Update office settings |
| `POST` | `/api/peso/settings/logo` | Upload office logo |
| `GET` | `/api/peso/groups` | List livelihood groups |
| `POST` | `/api/peso/groups` | Create a livelihood group |
| `GET/PUT` | `/api/peso/groups/:id` | Get / update a group |

---

## 7. Dashboard Pages

The PESO portal lives at `/peso` inside the `DashboardShell` (role: `"peso"`).

| Route | Purpose |
|-------|---------|
| `/peso` | Redirect / landing — forwards to `/peso/dashboard` |
| `/peso/dashboard` | KPI cards: provider counts, jobs, income; top skills/categories bar charts; quick-nav links |
| `/peso/workforce` | Searchable, paginated workforce registry with barangay / tag / rating filters |
| `/peso/jobs` | List all PESO-posted jobs with status; link to post new job |
| `/peso/jobs/new` | Job posting form (title, description, tags, budget, headcount, deadline) |
| `/peso/referrals` | Single provider referral form; history of past referrals |
| `/peso/onboarding` | CSV bulk onboarding; upload UI with row-level error feedback |
| `/peso/verification` | Search providers → assign verification tags → issue/revoke certifications |
| `/peso/emergency` | Emergency broadcast form with one-click high-priority job creation |
| `/peso/officers` | Manage staff officers — invite new, remove existing |
| `/peso/reports` | Full analytics report: stats, tag breakdown, income chart, skills/category breakdowns |
| `/peso/groups` | Manage livelihood groups (TUPAD, SPES, etc.) and their members |
| `/peso/training` | Training programme management |
| `/peso/settings` | Office profile, contact information, logo upload |

---

## 8. Tags & Labels

### Job Tags

Tags applied to PESO-posted jobs to classify the programme type.

| Tag | Display | Colour (UI suggestion) |
|-----|---------|----------------------|
| `peso` | PESO | Blue |
| `lgu_project` | LGU Project | Green |
| `gov_program` | Gov't Program | Purple |
| `emergency` | ⚡ Emergency | Red |
| `internship` | Internship | Amber |

### Provider Verification Tags

Assigned by PESO officers to providers; appear as profile badges.

| Tag | Display | Meaning |
|-----|---------|---------|
| `peso_registered` | PESO Registered | Formally registered at a PESO office |
| `lgu_resident` | LGU Resident | Verified LGU community member |
| `peso_recommended` | PESO Recommended | Officer-endorsed provider |

---

## 9. Relationships Diagram

```
Admin
 └─── creates ──────────────► PesoOffice
                                  │  headOfficerId ──► User (role: peso)  ◄── manages
                                  │  officerIds[]  ──► User (role: peso)  ◄── manages
                                  │
 PESO Officer (any)               │
  ├─ postJob ──────────────────── │ ──► Job { jobSource:"peso", jobTags, pesoPostedBy }
  ├─ referProvider ────────────── │ ──► User (role: provider) + ProviderProfile { pesoReferredBy }
  ├─ bulkOnboard ──────────────── │ ──► User[] + ProviderProfile[] (batch referral)
  ├─ verifyProvider ───────────── │ ──► ProviderProfile { pesoVerificationTags[] }
  ├─ addCertification ──────────── │ ──► ProviderProfile { certifications[] }
  └─ sendEmergencyBroadcast ────── │ ──► Job { isPriority:true, budget:0, tags:["emergency"] }

Reports scope:
  Jobs    where pesoPostedBy ∈ office.officerIds  AND  jobTags ∩ PESO_JOB_TAGS ≠ ∅
  Providers where pesoReferredBy ∈ office.officerIds
```

---

## 10. Environment Variables

No PESO-specific env vars are needed. The feature relies on existing platform variables.

| Variable | Used for |
|----------|---------|
| `MONGODB_URI` | Database connection |
| `NEXTAUTH_SECRET` | Session authentication |
| `CLOUDINARY_*` | Logo upload via `updateOfficeLogo` |
| `EMAIL_*` / `RESEND_API_KEY` | Activation emails sent on referral / officer invite |
| `TWILIO_*` | Optional SMS alerts on emergency broadcast |

---

> **Last updated:** Auto-generated from source — `models/PesoOffice.ts`, `services/peso.service.ts`, `repositories/peso.repository.ts`
