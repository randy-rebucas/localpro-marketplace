# LocalPro Marketplace — Global Expansion Feature Roadmap

> **Version:** 1.1
> **Date:** 2026-03-14
> **Status:** Proposal
> **Scope:** Features required to make LocalPro viable for businesses across different countries

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Feature Proposals](#feature-proposals)
   - [1. Internationalization & Localization](#1-internationalization--localization)
   - [2. Multi-Payment Gateway Architecture](#2-multi-payment-gateway-architecture)
   - [3. Multi-Tenant / White-Label Support](#3-multi-tenant--white-label-support)
   - [4. Government / Workforce Partner Module](#4-government--workforce-partner-module)
   - [5. Service Category Localization](#5-service-category-localization)
   - [6. KYC / Identity Verification Per Country](#6-kyc--identity-verification-per-country)
   - [7. Tax & Compliance Engine](#7-tax--compliance-engine)
   - [8. Insurance & Liability Coverage](#8-insurance--liability-coverage)
   - [9. Franchise / Agency Model](#9-franchise--agency-model)
   - [10. Service Contracts & SLAs](#10-service-contracts--slas)
   - [11. Geo-Based Provider Discovery](#11-geo-based-provider-discovery)
   - [12. Dynamic / Surge Pricing](#12-dynamic--surge-pricing)
   - [13. Provider Subscription Tiers](#13-provider-subscription-tiers)
   - [14. Background Check Integration](#14-background-check-integration)
   - [15. Multi-Language Job Posts & AI Translation](#15-multi-language-job-posts--ai-translation)
   - [16. Instant Book / Gig Labor Mode](#16-instant-book--gig-labor-mode)
   - [17. Community & Forum](#17-community--forum)
   - [18. Provider Verification Tiers](#18-provider-verification-tiers)
   - [19. Embedded B2B Marketplace API](#19-embedded-b2b-marketplace-api)
   - [20. Offline-First / Low-Bandwidth Mode](#20-offline-first--low-bandwidth-mode)
4. [Priority Roadmap](#priority-roadmap)
5. [Architecture Impact Summary](#architecture-impact-summary)

---

## Executive Summary

LocalPro Marketplace is a mature, feature-rich 3-sided service marketplace (Clients, Providers, Admin) built on Next.js 16.1.6, MongoDB, and PayMongo. The platform is well-engineered — with a clean service/repository architecture, escrow payments (PayMongo + wallet), milestone & partial payments, double-entry accounting ledger, AI job matching, real-time chat (SSE), provider-side agency accounts (with staff and payout splitting), client-side business organizations (multi-location), a PESO government workforce module, recurring jobs, consultations, and featured listing boosts — but it is currently scoped exclusively to the **Philippines**.

This document outlines 20 feature areas required to expand the platform for use by businesses in **any country**. Proposals are ordered by strategic importance and grouped into: foundational (must-do first), market-unlocking (per-region revenue), and value-adding (retention and differentiation).

---

## Current State

### What exists today

| Area | Status |
|---|---|
| Core marketplace (3-sided) | ✅ Complete |
| Escrow & payments | ✅ PayMongo + wallet path (Philippines) |
| Milestone & partial payments | ✅ Complete |
| Provider withdrawal from assigned job | ✅ Complete |
| Real-time chat & notifications | ✅ SSE-based |
| AI job matching & classification | ✅ OpenAI GPT-4o-mini |
| Loyalty & rewards program | ✅ Tiered points |
| Wallet & payout system | ✅ Manual approvals |
| Agency accounts (provider-side orgs) | ✅ Staff, payout splitting, plan tiers |
| Business accounts (client-side orgs) | ✅ Multi-location, budget alerts, member roles |
| Provider featured listings / boost | ✅ Wallet + PayMongo paths, expiry cron |
| Recurring jobs & auto-pay | ✅ Cron-based |
| Consultations & site inspections | ✅ Converts to jobs |
| KYC document verification | ✅ Manual admin review |
| Dispute resolution | ✅ Admin-moderated escrow hold |
| PESO government workforce module | ✅ Philippines-specific |
| Knowledge base (5 audiences) | ✅ client, provider, business, agency, peso |
| Double-entry accounting / ledger | ✅ Sprints A–D complete; Sprint E (centavos standardisation) pending |
| Additional job charges / fee support | ✅ Complete |
| Internationalization (i18n) | ❌ All text hardcoded in English |
| Multi-currency | ❌ PHP only |
| Multi-payment gateway | ❌ PayMongo only |
| Map-based discovery | ❌ Text-only search |
| Tax engine | ❌ No tax calculations |

### Known constraints for global use

- **Currency:** PHP (₱) hardcoded throughout UI and DB
- **Payment:** PayMongo only accepts PHP and operates in the Philippines
- **Phone validation:** Philippine format (+63) assumed
- **Address structure:** Barangay-based (Philippine administrative hierarchy)
- **Government integration:** PESO-specific, not generalized
- **Language:** English only, no locale switching

---

## Feature Proposals

---

### 1. Internationalization & Localization

**Priority:** 🔴 Critical — Foundation for everything else
**Effort:** High
**Markets unlocked:** All

#### Problem
Every UI string is hardcoded in English. Currency, phone formats, date formats, and address structures are Philippines-specific.

#### Solution

**Multi-language support**
- Integrate `next-intl` for Next.js App Router
- Move all UI strings to locale JSON files under `src/locales/[locale].json`
- Supported locales (initial): `en`, `es`, `fr`, `ar`, `pt-BR`, `id`, `th`, `zh`
- Language auto-detected from browser `Accept-Language` header
- User can override in profile settings
- RTL layout support for Arabic (`dir="rtl"` on `<html>`)

**Multi-currency**
- Replace hardcoded `PHP/₱` with a `currency` field in `AppSetting` (per tenant)
- Store all monetary amounts as integers (cents/minor units)
- Display using `Intl.NumberFormat(locale, { style: 'currency', currency })`
- Exchange rates for analytics (informational only — payments stay in local currency)

**Regional phone formats**
- Replace current Philippine phone validation with `libphonenumber-js`
- `PhoneInput` component already exists — update to pass `defaultCountry` from user's country

**Regional address formats**
- Replace `barangay`-specific fields with a flexible schema:
  ```
  address: {
    line1: string
    line2?: string
    city: string
    stateProvince: string
    district?: string       // barangay, borough, arrondissement
    postalCode: string
    country: string         // ISO 3166-1 alpha-2
    coordinates: [lng, lat]
  }
  ```

**Timezone management**
- All timestamps stored in UTC (already done via MongoDB)
- `User.timezone` field (IANA tz string, e.g., `Asia/Manila`, `America/New_York`)
- All date/time UI rendering uses `Intl.DateTimeFormat` with user's timezone
- Job schedule picker shows local time

#### Files to change
- `src/types/index.ts` — Update address interfaces
- `src/models/User.ts` — Add `timezone`, `preferredLocale` fields
- `src/lib/utils.ts` — Add `formatCurrency(amount, currency, locale)` helper
- `src/components/shared/PhoneInput.tsx` — Update to use libphonenumber-js
- All page/component files — Replace hardcoded strings with `t('key')` calls

---

### 2. Multi-Payment Gateway Architecture

**Priority:** 🔴 Critical — Required for revenue in any non-PH market
**Effort:** Medium
**Markets unlocked:** Global

#### Problem
`src/lib/paymongo.ts` is tightly coupled to PayMongo's API. PayMongo only operates in the Philippines and only accepts PHP.

#### Solution

**Define a `PaymentGateway` interface**

```typescript
// src/lib/gateways/interface.ts
interface PaymentGateway {
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>
  getCheckoutSession(sessionId: string): Promise<SessionStatus>
  createRefund(paymentId: string, amount: number): Promise<RefundResult>
  verifyWebhookSignature(payload: string, sig: string): boolean
}
```

**Implement per gateway**

| File | Gateway | Regions |
|---|---|---|
| `src/lib/gateways/paymongo.ts` | PayMongo | Philippines |
| `src/lib/gateways/stripe.ts` | Stripe | US, EU, CA, AU, UK, SG, JP |
| `src/lib/gateways/xendit.ts` | Xendit | Indonesia, Philippines, Vietnam, Malaysia |
| `src/lib/gateways/flutterwave.ts` | Flutterwave | Nigeria, Kenya, Ghana, South Africa |
| `src/lib/gateways/razorpay.ts` | Razorpay | India |
| `src/lib/gateways/mercadopago.ts` | MercadoPago | Brazil, Mexico, Argentina, Colombia |
| `src/lib/gateways/midtrans.ts` | Midtrans | Indonesia |

**Gateway factory**

```typescript
// src/lib/gateways/factory.ts
export function getGateway(countryCode: string): PaymentGateway {
  const map: Record<string, PaymentGateway> = {
    PH: paymongo,
    US: stripe, CA: stripe, GB: stripe,
    NG: flutterwave, KE: flutterwave,
    IN: razorpay,
    ID: xendit,
    BR: mercadopago, MX: mercadopago,
  }
  return map[countryCode] ?? stripe // Stripe as default fallback
}
```

**`AppSetting` changes**
- Add `activeGateway: string` and `countryCode: string` fields
- Payment service reads these to pick the correct gateway at runtime

#### Payment methods per region

| Region | Methods |
|---|---|
| Philippines | GCash, PayMaya, Credit Card |
| Indonesia | GoPay, OVO, DANA, Bank Transfer |
| Nigeria | Bank Transfer, USSD, Card |
| India | UPI, Net Banking, Wallets, Card |
| US/EU | Credit Card, Apple Pay, Google Pay |
| Brazil | PIX, Boleto Bancário, Credit Card |
| MENA | Mada, KNET, Fawry |

---

### 3. Multi-Tenant / White-Label Support

**Priority:** 🟠 High — Enables partner-led global rollout
**Effort:** High
**Markets unlocked:** All — via local partner operators

#### Problem
The platform is a single instance for one operator. There is no way for a government agency in Kenya, a staffing company in Brazil, or an enterprise in Germany to run their own branded version.

#### Solution

**`Tenant` model**
```typescript
{
  _id: ObjectId
  name: string               // "LocalPro Kenya"
  slug: string               // "ke" → ke.localpro.app
  customDomain?: string      // "marketplace.mycompany.com"
  country: string            // ISO "KE"
  currency: string           // "KES"
  locale: string             // "en-KE"
  timezone: string           // "Africa/Nairobi"
  activeGateway: string      // "flutterwave"
  commissionRate: number     // 0.10
  logo: string               // URL
  primaryColor: string       // "#1a56db"
  features: FeatureFlags     // per-tenant feature toggles
  plan: 'starter' | 'growth' | 'enterprise'
  status: 'active' | 'suspended'
}
```

**All core models get `tenantId: ObjectId`**
- User, Job, Quote, Transaction, Review, Dispute, etc.
- All repository queries scope by `tenantId`

**Routing**
- Middleware (`proxy.ts`) reads subdomain → resolves `tenantId` → injects into request context
- `src/lib/tenant.ts` — `getTenant(req): Tenant`

**Feature flags per tenant**
```typescript
type FeatureFlags = {
  loyaltyProgram: boolean
  recurringJobs: boolean
  consultations: boolean
  businessAccounts: boolean
  pesoIntegration: boolean
  aiMatching: boolean
  backgroundChecks: boolean
}
```

**White-label customization**
- Tenant logo + primary color applied via CSS variables
- Custom email sender name and domain
- Custom terms of service / privacy policy URLs

---

### 4. Government / Workforce Partner Module

**Priority:** 🟠 High — Reuse existing PESO investment globally
**Effort:** Medium
**Markets unlocked:** All countries with public employment agencies

#### Problem
The PESO module is hard-coded with Philippines-specific terminology (`barangay`, `PESO`, `LGU`). The same concept exists in every country.

#### Solution

**Rename and generalize `PesoOffice` → `GovernmentPartner`**

```typescript
{
  _id: ObjectId
  tenantId: ObjectId
  agencyName: string          // "PESO", "DOLE", "TESDA", "SENA", "ANPE", "JobCentre"
  agencyType: 'employment' | 'skills' | 'welfare' | 'emergency' | 'youth'
  country: string
  region: string
  municipality: string
  contactEmail: string
  headOfficerId: ObjectId
  logoUrl: string
}
```

**Job tags generalized**
- `jobSource`: `'private' | 'government' | 'ngo' | 'lgu'`
- `jobTags`: configurable per tenant (not hardcoded)
- `isPriority`: kept as-is

**Provider fields generalized**
- `district` (was `barangay`) — smallest admin unit, label configurable per country
- `governmentReferredBy` (was `pesoReferredBy`)
- `certifications` — unchanged, already generic
- `governmentVerificationTags` (was `pesoVerificationTags`)

**Employment reporting — country-configurable KPIs**

| Country | Required metric |
|---|---|
| Philippines | PESO placement rate, OFW referrals |
| Colombia | SENA certification completions |
| France | Pôle emploi job seeker registrations |
| Kenya | Youth employment rate (15–35 yr) |
| India | PMKVY skill certification count |

Report templates configurable per `GovernmentPartner.agencyType`.

---

### 5. Service Category Localization

**Priority:** 🟡 Medium
**Effort:** Low
**Markets unlocked:** All — prevents irrelevant categories per region

#### Problem
A category like "Snow Removal" is irrelevant in the Philippines. "Aircon Cleaning" is critical in Southeast Asia but rarely searched in Scandinavia.

#### Solution

**`Category` model update**
```typescript
{
  // existing fields...
  availableIn: string[]    // ISO country codes, empty = available everywhere
  unavailableIn: string[]  // Exclude specific countries
  localizedNames: {        // Optional translated names
    [locale: string]: string
  }
}
```

**API filtering**
- `GET /api/categories` — accepts `country` query param
- Returns only categories where `availableIn` includes the country (or is empty)
- Admin UI: checkboxes for countries when creating/editing a category

**AI classifier update**
- Pass `country` context to `POST /api/ai/classify-category`
- System prompt: `"Classify for a service marketplace in {country}. Available categories: {filteredList}"`

---

### 6. KYC / Identity Verification Per Country

**Priority:** 🟠 High — Legal requirement in most regulated markets
**Effort:** Medium
**Markets unlocked:** US, UK, EU, AU, NG, KE

#### Problem
KYC is manual (admin uploads + human review). Each country has different accepted documents and legal requirements. Manual review does not scale.

#### Solution

**Pluggable KYC provider interface**

```typescript
interface KycProvider {
  createApplicant(user: User): Promise<string>       // applicantId
  generateSdkToken(applicantId: string): Promise<string>
  getCheckResult(applicantId: string): Promise<KycResult>
  handleWebhook(payload: unknown): KycWebhookEvent
}
```

**Provider implementations**

| Provider | Regions | Strength |
|---|---|---|
| Onfido | Global | Best OCR + liveness |
| Veriff | Europe, US | GDPR-first |
| Smile Identity | Africa | African ID database |
| Jumio | Global | Enterprise |
| Digilocker | India | Government-issued ID API |

**Accepted documents per country**

| Country | Documents |
|---|---|
| Philippines | PhilSys ID, Passport, Driver's License, SSS, UMID |
| Nigeria | NIN, BVN, Voter's Card, Driver's License |
| India | Aadhar, PAN Card, Passport, Voter ID |
| Kenya | National ID, Passport, KRA PIN |
| US | SSN, Driver's License, State ID, Passport |
| EU | National ID, Passport (plus GDPR consent) |

**`AppSetting.kycConfig`**
```typescript
{
  provider: 'onfido' | 'veriff' | 'smile' | 'manual'
  requiredDocuments: string[]    // per country
  autoApprove: boolean           // skip manual review if KYC passes
  requireForCategory?: string[]  // only mandatory for certain job types
}
```

---

### 7. Tax & Compliance Engine

**Priority:** 🟠 High — Required for legal operation in most markets
**Effort:** Medium
**Markets unlocked:** All formal markets

#### Problem
No tax calculations exist. The platform collects a commission but does not issue proper tax invoices, does not withhold taxes where required, and does not generate compliance documents.

#### Solution

**`TaxConfig` model**
```typescript
{
  country: string
  vatRate: number              // e.g., 0.12 for PH, 0.20 for UK
  serviceChargeRate: number
  withholdingTaxRate: number   // e.g., 0.05 for PH professionals
  taxName: string              // "VAT", "GST", "TVA", "IVA", "PPN"
  taxNumber: string            // Platform's tax registration number
  invoicePrefix: string        // "INV-PH-", "INV-NG-"
  fiscalYearStart: number      // Month (1 = January, 4 = April for IN)
}
```

**Invoice generation**
- Auto-generate PDF invoice on job completion
- Line items: service fee, platform commission, tax
- Stored in `Transaction.invoiceUrl`
- Provider-facing: "Official Receipt" / "Invoice" per country norm

**Tax document automation**
| Country | Document | Trigger |
|---|---|---|
| Philippines | BIR Form 2307 (EWT certificate) | Quarterly |
| US | 1099-NEC | Annual (if earnings > $600) |
| UK | VAT invoice | Per transaction |
| EU | VAT invoice with VAT ID | Per transaction |
| India | GST invoice | Per transaction |

**Integration options**
- **TaxJar** — US state-level sales tax automation
- **Avalara** — Global tax compliance
- **Taxually** — EU VAT filing

---

### 8. Insurance & Liability Coverage

**Priority:** 🟡 Medium — Mandatory in US, UK, AU; trust signal elsewhere
**Effort:** Low
**Markets unlocked:** US, UK, AU, CA, DE

#### Problem
No insurance verification or coverage offering. In many markets (UK, US, Australia), operating as a home service provider without public liability insurance is illegal or considered high-risk by clients.

#### Solution

**Provider insurance verification**
- Upload field: `ProviderProfile.insurancePolicyUrl`
- Fields: `insuranceProvider`, `policyNumber`, `coverageAmount`, `expiryDate`
- Admin reviews and marks `insuranceVerified: true`
- Cron job (`/api/cron/expire-insurance`) removes badge when `expiryDate` passes
- Profile badge: "Insured ✓" with coverage amount displayed

**On-demand job insurance (optional add-on)**
- Partner API: **Slice** (on-demand coverage), **Hiscox API**, **Simply Business**
- Client or provider opts in at job creation for +X% of job value
- Coverage: accidental damage, liability, tools
- Certificate auto-generated and emailed

**`AppSetting.insuranceConfig`**
```typescript
{
  requiredForCategories: string[]   // e.g., electricians, plumbers always require it
  partnerProvider: 'slice' | 'hiscox' | 'manual'
  addonEnabled: boolean
  addonRatePercent: number
}
```

---

### 9. Franchise / Agency Model

**Priority:** 🟡 Medium — Common go-to-market in developing markets
**Effort:** Low (core already exists — needs generalisation)
**Markets unlocked:** Latin America, Africa, Southeast Asia, Middle East

#### Current State
A complete agency model already exists on the platform (`AgencyProfile`, `AgencyInvite`, `AgencyStaffPayout`). Provider-side agencies can manage staff rosters, assign workers to jobs, configure payout splits, and manage compliance documents. See `docs/agency-and-business.md` for the full spec.

#### What's Missing for Global Scale

**`Agency` model**
```typescript
{
  _id: ObjectId
  tenantId: ObjectId
  name: string
  ownerId: ObjectId          // Agency owner user
  logoUrl: string
  description: string
  categories: string[]       // Categories the agency covers
  commissionSplit: number    // e.g., 0.20 = agency takes 20% of provider earnings
  providerIds: ObjectId[]    // Managed providers
  status: 'active' | 'suspended'
  verificationStatus: 'pending' | 'verified'
}
```

**Provider relationship**
- `ProviderProfile.agencyId?: ObjectId` — null = independent
- `ProviderProfile.agencyCommissionRate: number` — override per provider
- Earnings split: `providerEarnings = jobAmount * (1 - platformCommission) * (1 - agencyRate)`

**Agency dashboard** (`/agency/*`)
- View all managed providers
- Aggregate earnings and analytics
- Assign/remove providers
- Dispute management for agency providers

**New user role:** `agency` (alongside `client`, `provider`, `admin`, `peso`)

---

### 10. Service Contracts & SLAs

**Priority:** 🟡 Medium — Key for B2B recurring revenue
**Effort:** Medium
**Markets unlocked:** All B2B markets (hospitality, property management, corporate)

#### Problem
One-off jobs dominate the current flow. Enterprises and property managers need ongoing contracts with defined scope, SLA terms, and automatic job generation — not individual job posts.

#### Solution

**`Contract` model**
```typescript
{
  _id: ObjectId
  clientId: ObjectId
  providerId: ObjectId
  title: string
  scope: string                    // Description of ongoing work
  startDate: Date
  endDate?: Date
  monthlyValue: number
  slaResponseHours: number         // e.g., 4 hours for emergency jobs
  slaCompletionHours: number       // e.g., 24 hours for standard
  autoGenerateJobs: boolean
  jobFrequency: 'daily' | 'weekly' | 'monthly'
  jobTemplate: Partial<Job>        // Template for auto-spawned jobs
  status: 'draft' | 'active' | 'expired' | 'terminated'
  signedByClient: boolean
  signedByProvider: boolean
  signedAt?: Date
  documentUrl?: string             // Signed PDF
}
```

**SLA monitoring**
- Cron: `GET /api/cron/check-sla-breach` — flag jobs where provider hasn't started within SLA
- Alert: push notification + email to provider + client
- Admin dashboard: SLA breach rate metric
- Penalty clause (configurable): auto-deduct from provider earnings on breach

**E-signature integration**
- **DocuSign SDK** or **HelloSign API**
- Contract PDF generated from template → sent to both parties → signed in-app or via email link
- Webhook updates `Contract.signedByClient/Provider`

---

### 11. Geo-Based Provider Discovery

**Priority:** 🟡 Medium — UX improvement with global relevance
**Effort:** Low
**Markets unlocked:** All — improves conversion globally

#### Problem
Provider and job search is text-only. Users cannot visually browse "what's available near me." MongoDB already stores coordinates (2dsphere index) but there is no map UI.

#### Solution

**Map view for job browsing**
- Provider marketplace: toggle between list view and map view
- Jobs plotted as pins on map, clustered by area
- Click pin → job card preview → quote button
- Radius slider: 5 km / 10 km / 25 km / 50 km

**Map view for provider search**
- Client sees provider pins on map when searching
- Heatmap for admin: provider density per area
- Coverage gap detection: categories with low provider density highlighted

**Technology**
- **Leaflet.js** (open source, no API key cost) or **Mapbox GL JS**
- Tile layer: OpenStreetMap (free) or Mapbox Satellite
- Geocoding: **Nominatim** (free) or **Mapbox Geocoding API**

**API changes**
- `GET /api/jobs?lat=&lng=&radius=` — geospatial query using existing 2dsphere index
- `GET /api/providers?lat=&lng=&radius=` — same for providers

**No new models needed** — coordinates already stored.

---

### 12. Dynamic / Surge Pricing

**Priority:** 🟡 Medium — Revenue optimization
**Effort:** Medium
**Markets unlocked:** All — especially urban on-demand markets

#### Problem
All pricing is set by providers bidding. There is no platform-level pricing intelligence. During peak times (holidays, emergencies), supply is short and clients are willing to pay more.

#### Solution

**`PricingRule` model**
```typescript
{
  _id: ObjectId
  tenantId: ObjectId
  category: string
  name: string                     // "Weekend Premium", "Holiday Surge"
  multiplier: number               // e.g., 1.25 = 25% increase
  conditions: {
    daysOfWeek?: number[]          // 0=Sun, 6=Sat
    timeRangeStart?: string        // "18:00"
    timeRangeEnd?: string          // "23:00"
    isHoliday?: boolean
    demandThreshold?: number       // active jobs / available providers ratio
    urgencyHours?: number          // job needed within X hours
  }
  appliesTo: 'client_price' | 'provider_earnings' | 'both'
  displayLabel: string             // "Peak hour surcharge"
  status: 'active' | 'disabled'
}
```

**Client-facing transparency**
- Job post form shows: "Peak hour surcharge: +20% applied to this booking"
- Budget estimate AI (`/api/ai/estimate-budget`) factors in active pricing rules

**Admin controls**
- Pricing Rules CRUD in `/admin/settings`
- Set multiplier min/max bounds (e.g., never exceed 2.0×)
- Surge active/inactive toggle with manual override

---

### 13. Provider Subscription Tiers

**Priority:** 🟢 Nice to have — Additional revenue stream
**Effort:** Medium
**Markets unlocked:** All — used by Thumbtack, Bark.com, TaskRabbit

#### Problem
Currently the only platform revenue is per-job commission. There is no recurring revenue from providers. High-quality providers have no way to signal premium status.

#### Solution

**`ProviderPlan` model**
```typescript
{
  tier: 'free' | 'starter' | 'pro' | 'elite'
  price: {                       // per country
    [currency: string]: number   // monthly, in minor units
  }
  benefits: {
    monthlyQuoteCredits: number  // 0 = unlimited
    commissionRate: number       // e.g., 0.08 vs default 0.10
    priorityListing: boolean
    aiReplyAssist: boolean
    profileHighlight: boolean    // yellow border / "Pro" badge
    analyticsAccess: boolean
    directInviteEligible: boolean
  }
}
```

**Quote credits system**
- Free tier: 5 quotes/month
- Starter: 20 quotes/month
- Pro/Elite: unlimited
- Prevents low-quality mass bidding

**Billing**
- Stripe for global card billing (Checkout Sessions or Customer Portal)
- Local gateway fallback per country (same gateway factory as escrow payments)
- Dunning: email reminders at 3 days, 1 day before expiry; downgrade on non-payment

**Admin analytics**
- MRR (Monthly Recurring Revenue) chart in `/admin/revenue`
- Plan distribution pie chart
- Churn rate per tier

---

### 14. Background Check Integration

**Priority:** 🟢 Nice to have — Required in specific markets
**Effort:** Low
**Markets unlocked:** US, UK, CA, AU — mandatory for home service providers

#### Problem
No automated background check. Clients cannot verify whether a provider has a criminal record. In the US and UK, this is expected for any provider entering a home.

#### Solution

**API integration**

| Provider | Coverage | Cost |
|---|---|---|
| Checkr | US, Canada | Per-check fee |
| Sterling | Global | Per-check fee |
| Certn | Canada, UK, AU | Per-check fee |
| Smile Identity | Africa | Per-check fee |

**Flow**
1. Provider submits background check consent in onboarding
2. Platform calls partner API → creates check
3. Webhook returns result: `clear` / `consider` / `suspended`
4. Admin reviews `consider` results manually
5. Badge applied to profile: "Background Checked ✓ — [Date]"

**`ProviderProfile` fields**
```typescript
backgroundCheck: {
  provider: string
  checkId: string
  status: 'pending' | 'clear' | 'consider' | 'suspended'
  completedAt: Date
  expiresAt: Date          // typically 1 year
}
```

**`AppSetting.backgroundCheckConfig`**
```typescript
{
  provider: 'checkr' | 'sterling' | 'certn' | 'none'
  requiredForCategories: string[]
  requiredForAllProviders: boolean
  autoRejectSuspended: boolean
}
```

---

### 15. Multi-Language Job Posts & AI Translation

**Priority:** 🟡 Medium — Critical for multilingual markets
**Effort:** Low (GPT-4o already integrated)
**Markets unlocked:** SG, MY, CA, BE, CH, ZA, EU

#### Problem
In multilingual countries (Singapore: EN/ZH/MS/TA; Canada: EN/FR; Belgium: FR/NL/DE), clients and providers may not share a language. All job posts are currently English-only.

#### Solution

**`Job.translations` field**
```typescript
translations: {
  [locale: string]: {
    title: string
    description: string
    translatedAt: Date
    translatedBy: 'ai' | 'human'
  }
}
```

**Auto-translation flow**
- On job creation, if `tenantLocales.length > 1`, trigger background translation
- `POST /api/ai/translate-job` — GPT-4o translates title + description to all tenant locales
- Stored in `job.translations`

**UI**
- Job detail page: language toggle tabs (only shows locales with translations)
- Provider marketplace: jobs displayed in provider's preferred language
- No manual translation work required

**Cost**
- GPT-4o pricing: ~$0.001 per job translation (negligible)
- Already using OpenAI — no new vendor needed

---

### 16. Instant Book / Gig Labor Mode

**Priority:** 🟡 Medium — New marketplace model
**Effort:** Medium
**Markets unlocked:** US, UK, AU, SG — TaskRabbit / Airtasker model

#### Problem
The current flow requires: post job → wait for quotes → accept quote → fund escrow. This is 3–24 hours minimum. For urgent, small tasks (IKEA assembly, dog walking, grocery run), clients want same-hour booking.

#### Solution

**`ProviderProfile.instantBookEnabled: boolean`**
- Provider sets availability slots + a fixed price per category
- Profile shows "Instant Book Available" badge

**`InstantBookRate` model**
```typescript
{
  providerId: ObjectId
  categoryId: ObjectId
  pricePerHour: number
  minHours: number
  availabilitySlots: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}
```

**Booking flow**
1. Client browses provider → sees "Book Now" button (if instant book enabled)
2. Client picks date/time slot from provider's availability
3. Client pays immediately (no quote step)
4. Provider gets push notification → must accept within 15 minutes or slot releases
5. Job auto-created with `status: assigned`

**Fixed pricing by category (admin-configurable)**
- Admin sets suggested price range per category
- Provider sets their rate within that range
- No negotiation — removes friction

---

### 17. Community & Forum

**Priority:** 🟢 Nice to have — SEO + retention
**Effort:** Medium
**Markets unlocked:** All — improves organic acquisition

#### Problem
No community features. Users have no reason to return between jobs. The platform loses to competitors that have established community presences (Houzz, Angi, Reddit communities).

#### Solution

**`CommunityPost` model**
```typescript
{
  _id: ObjectId
  tenantId: ObjectId
  authorId: ObjectId
  type: 'question' | 'tip' | 'project_showcase' | 'review_request'
  title: string
  body: string
  category?: string
  tags: string[]
  photos: string[]
  upvotes: number
  replyCount: number
  locale: string           // Posts are locale-scoped
  status: 'published' | 'hidden' | 'removed'
  createdAt: Date
}
```

**Features**
- Providers answer questions → builds authority, increases profile visibility
- Clients post project photos → social proof and inspiration
- Category-based boards (e.g., "Home Renovation", "Electrical", "Cleaning Tips")
- Upvote system — best answers surface
- Provider answers link back to their profile

**SEO benefit**
- Public community pages indexed by Google
- Long-tail keyword capture: "how to fix leaking tap in Manila" → localpro.app/community/plumbing

**Moderation**
- Admin can hide/remove posts
- Report button (client/provider)
- AI pre-moderation: flag spam/inappropriate content

---

### 18. Provider Verification Tiers

**Priority:** 🟡 Medium — Universal trust signal
**Effort:** Low
**Markets unlocked:** All — trust is the #1 concern in gig marketplaces

#### Problem
Currently, "verified" status is binary (email confirmed or not). There is no graduated trust signal that tells clients exactly how thoroughly a provider has been checked.

#### Solution

**Five-tier trust ladder**

| Tier | Badge | Requirements |
|---|---|---|
| `basic` | Email ✓ | Email verified |
| `verified` | Phone ✓ | Phone OTP + government ID uploaded |
| `pro` | Background ✓ | Background check passed |
| `insured` | Insured ✓ | Active liability insurance policy on file |
| `elite` | Elite ✓ | Background + Insurance + 50+ reviews + 4.8+ rating + 12 months active |

**`ProviderProfile.verificationTier`**
- Computed automatically based on met conditions
- Cron job recalculates nightly
- Displayed prominently on profile and in search results

**Search filtering**
- Client can filter marketplace: "Show only Verified and above"
- Default sort: Elite → Pro → Verified → Basic

---

### 19. Embedded B2B Marketplace API

**Priority:** 🟢 Nice to have — Partnership revenue channel
**Effort:** Medium
**Markets unlocked:** All — via property portals, hotel chains, corporate portals

#### Problem
Enterprises want to embed service marketplace functionality into their own apps (hotel property management systems, real estate portals, corporate intranet) without building it from scratch.

#### Solution

**API key management**
- Admin creates API keys for B2B partners
- Keys scoped to: read-only, post-jobs, full-access
- Rate limited per key

**Partner API endpoints**
```
POST /api/partner/jobs           — Create job on behalf of client
GET  /api/partner/providers      — Search providers
GET  /api/partner/quotes/[jobId] — Get quotes for a job
POST /api/partner/quotes/[id]/accept — Accept a quote
GET  /api/partner/status/[jobId] — Job status polling
```

**Embeddable widget**
- `<script src="https://localpro.app/widget.js" data-api-key="..."></script>`
- Renders a "Request Service" button → opens modal
- Fully themed via CSS variables
- Webhook callbacks for job events: `job.created`, `job.completed`, `payment.captured`

**Revenue model**
- B2B partner pays per-job fee or monthly flat fee
- Partner earns revenue share for jobs originated via their integration

---

### 20. Offline-First / Low-Bandwidth Mode

**Priority:** 🟡 Medium — Critical for Africa, rural Southeast Asia
**Effort:** High
**Markets unlocked:** NG, KE, TZ, PK, BD, rural PH, rural ID, rural IN

#### Problem
In markets like Nigeria, Kenya, rural Indonesia, and rural Philippines, internet connectivity is intermittent and often limited to 2G/3G. The current app assumes stable broadband. Users on slow connections will abandon.

#### Solution

**PWA enhancements** (scaffold already exists via `PwaSetup.tsx`)
- Full offline job drafts — compose job without network, sync when online
- Service worker caches: categories, recent providers, own jobs
- Background sync API: queue actions (send message, submit quote) when offline, retry when connected
- `navigator.onLine` detection → "You're offline — changes will sync when reconnected" banner

**Image handling**
- Compress images client-side before upload: `browser-image-compression` library
- Progressive JPEG for job photos
- Lazy loading (already supported by Next.js `<Image>`)
- Low-res placeholder while full image loads

**SMS fallback notifications**
- `AppSetting.smsProvider`: `twilio` | `africas_talking` | `termii` (Nigeria) | `vonage`
- Critical notifications sent via SMS if user has no push subscription
- Job assigned, quote received, payment confirmed — all SMS-capable
- **Africa's Talking** is essential for East/West Africa (cheaper than Twilio, local routing)

**USSD interface** (Africa only)
- USSD = Unstructured Supplementary Service Data — works on any feature phone, no internet
- `*384*1#` → check job status
- `*384*2#` → confirm job completion
- Integrate via **Africa's Talking USSD API**
- Critical for Nigeria and Kenya where smartphone penetration is still growing

---

## Priority Roadmap

### Phase 1 — Foundation (Months 1–3)
*Must ship before entering any new market*

| # | Feature | Reason |
|---|---|---|
| 1 | Internationalization & Localization | All new markets require this |
| 2 | Multi-Payment Gateway Architecture | Can't collect money without this |
| 7 | Tax & Compliance Engine | Legal requirement in most markets |

### Phase 2 — Market Entry (Months 4–6)
*Ship per target market as you enter each one*

| # | Feature | Target Markets |
|---|---|---|
| 3 | Multi-Tenant / White-Label | All — enables partner operators |
| 4 | Government / Workforce Partner (Generalized) | Any country with public employment agency |
| 6 | KYC / Identity Verification Per Country | US, UK, EU, NG, KE |
| 8 | Insurance & Liability Coverage | US, UK, AU, CA |
| 14 | Background Check Integration | US, UK, AU, CA |

### Phase 3 — Growth & Retention (Months 7–9)
*Revenue optimization and user retention*

| # | Feature | Impact |
|---|---|---|
| 5 | Service Category Localization | Reduces irrelevant noise per market |
| 11 | Geo-Based Provider Discovery | Improves conversion (map UI) |
| 13 | Provider Subscription Tiers | New MRR revenue stream |
| 16 | Instant Book / Gig Labor Mode | Captures urgent job market |
| 18 | Provider Verification Tiers | Universal trust signal |

### Phase 4 — Scale & Enterprise (Months 10–12)
*B2B and enterprise revenue expansion*

| # | Feature | Impact |
|---|---|---|
| 9 | Franchise / Agency Model | Structured staffing companies |
| 10 | Service Contracts & SLAs | Enterprise recurring revenue |
| 12 | Dynamic / Surge Pricing | Revenue optimization |
| 15 | Multi-Language Job Posts & AI Translation | Multilingual markets |
| 19 | Embedded B2B Marketplace API | Partner channel revenue |

### Phase 5 — Specialized Markets (Ongoing)
*High-impact in specific regions*

| # | Feature | Target |
|---|---|---|
| 17 | Community & Forum | SEO acquisition, all markets |
| 20 | Offline-First / Low-Bandwidth Mode | Africa, rural SEA |

---

## Architecture Impact Summary

### Models requiring changes
| Model | Change |
|---|---|
| `User` | Add `timezone`, `preferredLocale`, `countryCode` |
| `Job` | Add `translations`, `pricingMultiplier`, `contractId` |
| `ProviderProfile` | Generalize PESO fields, add `verificationTier`, `instantBookEnabled`, `backgroundCheck`, `insurancePolicyUrl`, `agencyId`, `planTier` |
| `AppSetting` | Add `activeGateway`, `kycConfig`, `backgroundCheckConfig`, `smsProvider`, `insuranceConfig` |
| `Category` | Add `availableIn`, `localizedNames` |

### New models required
| Model | Feature |
|---|---|
| `Tenant` | Multi-tenant (#3) |
| `GovernmentPartner` | Generalized PESO (#4) |
| `TaxConfig` | Tax engine (#7) |
| `PricingRule` | Surge pricing (#12) |
| `ProviderPlan` | Subscription tiers (#13) |
| `Contract` | SLA contracts (#10) |
| `Agency` | Franchise model (#9) — core implemented; needs `tenantId` and multi-currency earnings |
| `InstantBookRate` | Instant book (#16) |
| `CommunityPost` | Forum (#17) |

### New services required
| Service | Feature |
|---|---|
| `gatewayService` | Payment gateway factory (#2) |
| `taxService` | Tax calculations and invoice generation (#7) |
| `contractService` | SLA contract management (#10) |
| `backgroundCheckService` | Background check orchestration (#14) |
| `translationService` | AI translation for job posts (#15) |
| `instantBookService` | Instant book flow (#16) |

### New third-party dependencies
| Package | Purpose |
|---|---|
| `next-intl` | i18n framework |
| `libphonenumber-js` | Phone validation |
| `@stripe/stripe-js` | Stripe payments |
| `leaflet` | Map UI |
| `africa-talking` | SMS + USSD (Africa) |
| `twilio` | Global SMS fallback |
| `browser-image-compression` | Client-side image compression |

---

*Document maintained by the LocalPro engineering team. Update this document when features move from proposal to implementation.*
