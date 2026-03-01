# Changelog — LocalPro Marketplace
> Session date: March 1, 2026  
> Total: **14 files modified · 2 new files · +274 / −22 lines**

---

## Overview

Six features were implemented based on the Design Audit Report:

| # | Feature | Status |
|---|---------|--------|
| 1 | Sub-category ratings in reviews | ✅ Complete |
| 2 | Response-time display on provider dashboard | ✅ Complete |
| 3 | 5-Star streak badge | ✅ Complete |
| 4 | Smart tags on provider cards | ✅ Complete |
| 5 | Liquidity signals on homepage | ✅ Complete |
| 6 | Sticky CTA on job detail page | ✅ Complete |

---

## New Files

### `src/app/(dashboard)/client/jobs/[id]/StickyJobCTA.tsx` *(new)*
Client component that renders a `fixed bottom-0` action bar on the job detail page.

- Renders **"Fund Escrow"** button when `status === "assigned"` and `escrowStatus === "not_funded"`
- Renders **"Approve & Release Payment"** button when `status === "completed"` and `escrowStatus === "funded"`
- Shows a contextual message beside the button explaining the action and amount
- Returns `null` for all other states (no visual noise)
- Lazy-loaded with `dynamic(..., { ssr: false })` to avoid hydration issues

---

## Modified Files

### 1. `src/types/index.ts`
**Purpose:** Add TypeScript types for review breakdown ratings.

- Added `IReviewBreakdown` interface:
  ```ts
  { quality, professionalism, punctuality, communication }  // each: 1 | 2 | 3 | 4 | 5
  ```
- Added optional `breakdown?: IReviewBreakdown` field to `IReview`

---

### 2. `src/models/Review.ts`
**Purpose:** Persist sub-category ratings in MongoDB.

- Added `breakdown` sub-document field using `new Schema({ ... }, { _id: false })`:
  - Fields: `quality`, `professionalism`, `punctuality`, `communication` — all `Number`, `min: 1`, `max: 5`
  - Defaults to `null` when not provided (backwards-compatible)

---

### 3. `src/repositories/review.repository.ts`
**Purpose:** Add two new data-access methods.

- **`getProviderBreakdownSummary(providerId)`** — MongoDB aggregation that:
  - Matches reviews that have `breakdown.quality` set
  - Averages all 4 sub-category scores
  - Returns `{ quality, professionalism, punctuality, communication, count }` or `null`

- **`getFiveStarStreak(providerId)`** — Fetches last 50 reviews sorted by `createdAt` descending, counts consecutive 5-star reviews from the top. Returns a `number` (0 if no streak).

---

### 4. `src/services/review.service.ts`
**Purpose:** Accept breakdown data through the service layer.

- Extended `CreateReviewInput` with optional `breakdown?: { quality, professionalism, punctuality, communication }` (each typed as `1|2|3|4|5`)

---

### 5. `src/app/api/reviews/route.ts`
**Purpose:** Validate and accept breakdown in the review creation API.

- Added `BreakdownSchema` (Zod) with 4 integer fields, each `min(1).max(5)`
- Extended `CreateReviewSchema` with `breakdown: BreakdownSchema.optional()`

---

### 6. `src/app/api/providers/[id]/profile/route.ts`
**Purpose:** Enrich the single-provider profile endpoint with breakdown and streak data.

- Replaced single `providerProfileService.getProfile(id)` call with `Promise.all([...])` running 3 queries in parallel:
  1. `providerProfileService.getProfile(id)` — existing profile
  2. `reviewRepository.getProviderBreakdownSummary(id)` — sub-category averages
  3. `reviewRepository.getFiveStarStreak(id)` — consecutive 5-star count
- Returns `{ ...profile, breakdown, streak }` in one response

---

### 7. `src/app/api/providers/route.ts`
**Purpose:** Expose performance fields in the provider listing API.

- Added two fields to the MongoDB `$project` stage:
  - `completionRate: { $ifNull: ["$profileDoc.completionRate", 100] }`
  - `avgResponseTimeHours: { $ifNull: ["$profileDoc.avgResponseTimeHours", 0] }`

---

### 8. `src/app/api/favorites/route.ts`
**Purpose:** Return performance fields when listing a client's favorites.

- Extended `.select(...)` on `ProviderProfile.find(...)` to include `avgResponseTimeHours` and `completionRate`

---

### 9. `src/components/shared/ProviderInfoButton.tsx`
**Purpose:** Display breakdown ratings and performance badges in the provider info drawer.

- Updated `ProviderProfile` interface to include:
  - `avgResponseTimeHours?: number`
  - `breakdown?: { quality, professionalism, punctuality, communication, count } | null`
  - `streak?: number`
- Added **streak badge** (🔥 N-Star Streak) — shown when `streak >= 3`
- Added **response-time badge** (⚡ Responds in ~Xh/m) — shown when `avgResponseTimeHours > 0`
- Added **"Detailed Ratings" section** with 4 horizontal score bars (amber fill, percentage-based width) + numeric label for each category

---

### 10. `src/app/(dashboard)/provider/dashboard/page.tsx`
**Purpose:** Show streak, response-time badge, and Avg Response KPI card.

- Added `Zap` to lucide imports
- Extended `getProviderStats()` to:
  - Include `reviewRepository.getFiveStarStreak(providerId)` in the `Promise.all`
  - Cast `avgResponseTimeHours` from `profileDoc`
  - Return `streak` and `avgResponseTimeHours`
- Dashboard header now shows:
  - 🔥 **N-Star Streak** badge (when `streak >= 3`)
  - ⚡ **Fast Responder** badge (when `avgResponseTimeHours <= 2`)
- KPI grid expanded from 4 → 5 columns; added **"Avg Response"** KPI card with smart subtitle ("⚡ Fast Responder" vs "Time to first update")

---

### 11. `src/app/(dashboard)/client/reviews/page.tsx`
**Purpose:** Add sub-category star pickers to the review submission modal.

- Added `breakdown` state: `{ quality: 5, professionalism: 5, punctuality: 5, communication: 5 }`
- Modal now renders a "Detailed Ratings" section with 4 per-category star-picker rows
- `submitReview()` includes `breakdown` in the POST body
- `breakdown` state resets to all-5s on modal close or after submission
- "Rating" label updated to "Overall Rating" for clarity

---

### 12. `src/app/(dashboard)/client/favorites/page.tsx`
**Purpose:** Show smart tags on provider cards in the favorites list.

- Added `avgResponseTimeHours?: number` and `completionRate?: number` to `FavoriteEntry["profile"]` type
- `ProviderCard` now renders smart tag badges after the star rating:
  - **⭐ Top Rated** — amber pill when `avgRating >= 4.5` and `completedJobCount >= 10`
  - **⚡ Fast Responder** — blue pill when `avgResponseTimeHours > 0 && <= 2`

---

### 13. `src/app/(dashboard)/client/jobs/[id]/page.tsx`
**Purpose:** Add a persistent sticky CTA bar to the client job detail page.

- Added `const StickyJobCTA = dynamic(() => import("./StickyJobCTA"), { ssr: false })`
- Added `pb-24` to the page wrapper to prevent content from being hidden behind the sticky bar
- Mounted `<StickyJobCTA>` at the bottom of the page tree, passing `jobId`, `status`, `escrowStatus`, `budget`, `acceptedAmount`, `fundedAmount`

---

### 14. `src/app/page.tsx`
**Purpose:** Add liquidity signals and smart tags to the public homepage.

**Liquidity signals:**
- Imported `Job` model and `formatRelativeTime`
- `TopProvidersSection` now runs 3 parallel queries: top providers, available count, most recent active job
- Renders a green signal bar above the provider cards:
  - `● N providers available now` (live count with pulse dot)
  - `⚡ Last booking X ago` (relative time, only shown if data exists)

**Smart tags on homepage provider cards:**
- Added `completionRate` and `avgResponseTimeHours` to the profile type cast
- Computed `isTopRated` (`avgRating >= 4.5 && completedJobCount >= 10`) and `isFastResponder` (`avgResponseTimeHours > 0 && <= 2`)
- Provider cards render **⭐ Top Rated** and/or **⚡ Fast Responder** badge pills

---

## Smart Tag Logic (used consistently across all provider surfaces)

| Badge | Condition |
|-------|-----------|
| ⭐ Top Rated | `avgRating >= 4.5` AND `completedJobCount >= 10` |
| ⚡ Fast Responder | `avgResponseTimeHours > 0` AND `avgResponseTimeHours <= 2` |
| 🔥 N-Star Streak | `streak >= 3` (N consecutive 5-star reviews) |

These badges appear on:
- Public homepage provider cards (`src/app/page.tsx`)
- Client favorites page (`client/favorites/page.tsx`)
- Provider info drawer (`ProviderInfoButton.tsx`)
- Provider dashboard header (`provider/dashboard/page.tsx`)
