# Provider Skills Type Migration Audit Report

**Date:** 2026-03-20
**Migration:** `skills: string[]` → `skills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>`

---

## Part 1: Migration Completeness Checklist

### 1. Schema & Type Definitions

| Location | Status | Notes |
|----------|--------|-------|
| Mongoose schema (`src/models/ProviderProfile.ts`) | ✅ Correct | `SkillSchema` with `skill`, `yearsExperience`, `hourlyRate` |
| TypeScript interface (`src/types/index.ts:607`) | ✅ Fixed | Changed from `string[]` to object array |

### 2. Repository Layer (Database Queries)

| Location | Status | Notes |
|----------|--------|-------|
| `providerProfile.repository.ts` — `findDistinctSkills` | ✅ Correct | Queries `skills.skill` |
| `providerProfile.repository.ts` — `findUserIdsByFilters` | ✅ Correct | Queries `skills.skill` |
| `providerProfile.repository.ts` — `findForExport` | ✅ Correct | Return type uses object array |
| `peso.repository.ts` — `getTopSkills` | ✅ Fixed | `$group._id` → `$skills.skill` |
| `peso.repository.ts` — `getOfficeReportStats` | ✅ Fixed | `$group._id` → `$skills.skill` |
| `peso.repository.ts` — `getProviderRegistry` filter | ✅ Fixed | `$elemMatch` → `skills.skill` regex |
| `peso.repository.ts` — `WorkforceRegistryEntry` | ✅ Fixed | `string[]` → object array |

### 3. Service Layer

| Location | Status | Notes |
|----------|--------|-------|
| `providerProfile.service.ts` — `getProfile` fallback | ✅ Fixed | Empty array typed as object array |
| `providerProfile.service.ts` — `upsertProfile` | ✅ Fixed | Was stripping to `.map(s => s.skill)` — now saves full objects |
| `peso.service.ts` — `ReferProviderDto` | ✅ Fixed | `string[]` → object array |
| `peso.service.ts` — `bulkOnboard` | ✅ Fixed | CSV strings → objects |

### 4. API Routes — Validation Schemas

| Location | Status | Notes |
|----------|--------|-------|
| `api/providers/profile/route.ts` — `SkillSchema` | ✅ Correct | Validates `{ skill, yearsExperience, hourlyRate }` |
| `api/admin/users/route.ts` — `CreateUserSchema` | ✅ Fixed | `z.array(z.string())` → object schema |
| `api/admin/users/import/route.ts` | ✅ Fixed | Pipe-delimited strings → objects |
| `api/admin/users/export/route.ts` | ✅ Fixed | Type annotation corrected |
| `api/peso/referrals/route.ts` — `ReferSchema` | ✅ Fixed | `z.array(z.string())` → object schema |
| `api/peso/bulk-onboard/route.ts` | ✅ OK | Conversion happens in service |

### 5. API Routes — Data Transformation

| Location | Status | Notes |
|----------|--------|-------|
| `api/providers/route.ts:90` — in-memory search | ✅ Fixed | `s.toLowerCase()` → `s.skill.toLowerCase()` |
| `api/ai/recommend-providers/route.ts` — query | ✅ Fixed | `$elemMatch` → `skills.skill` |
| `api/ai/recommend-providers/route.ts` — mapping | ✅ Fixed | Extracts `.skill` for AI |
| `api/providers/profile/generate-bio/route.ts` | ✅ Fixed | Extracts `.skill` from objects |
| `api/cron/drip-emails/route.ts` | ✅ Fixed | Cast → `unknown[]` |

### 6. AI/OpenAI Integration

| Location | Status | Notes |
|----------|--------|-------|
| `lib/openai.ts` — `rankJobsForProvider` | ✅ Fixed | `.skills.map(s => s.skill).join()` |
| `lib/openai.ts` — `ProviderCandidate` | ✅ Intentional | Uses `string[]` for extracted names |
| `api/ai/suggest-skills/route.ts` | ✅ Intentional | Returns `string[]` suggestions |

### 7. UI Components — Type Definitions

| Location | Status | Notes |
|----------|--------|-------|
| `provider/profile/ProfileClient.tsx` | ✅ Correct | Full `Skill` interface |
| `providers/page.tsx` — `ProviderCard` | ✅ Correct | Object array |
| `client/providers/[id]/ProfileClient.tsx` | ✅ Fixed | `string[]` → object array |
| `client/favorites/FavoritesClient.tsx` | ✅ Fixed | `string[]` → object array |
| `client/consultations/RequestConsultationForm.tsx` | ✅ Fixed | `string[]` → object array |
| `shared/ProviderInfoButton.tsx` | ✅ Fixed | `string[]` → object array |
| `peso/workforce/page.tsx` | ✅ Fixed | `string[]` → object array |
| `peso/verification/page.tsx` | ✅ Fixed | `string[]` → object array |
| `admin/users/[id]/UserDetailView.tsx` | ✅ Fixed | Render → `s.skill` |
| `api/providers/route.ts` — `ProviderRow` | ✅ Fixed | `string[]` → object array |
| `shared/SkillsInput.tsx` | ✅ Intentional | Skill-name picker uses `string[]` |

### 8. UI Components — Rendering

| Location | Status | Notes |
|----------|--------|-------|
| `providers/page.tsx` — skill tags | ✅ Correct | Renders `sk.skill` |
| `provider/profile/ProfileClient.tsx` | ✅ Correct | Full object editing UI |
| `client/providers/[id]/ProfileClient.tsx` | ✅ Fixed | `{s}` → `{s.skill}` |
| `client/favorites/FavoritesClient.tsx` | ✅ Correct | Renders `s.skill` |
| `client/consultations/RequestConsultationForm.tsx` | ✅ Fixed | `{skill}` → `{skill.skill}` |
| `shared/ProviderInfoButton.tsx` | ✅ Fixed | `{s}` → `{s.skill}` |
| `peso/workforce/page.tsx` | ✅ Fixed | `{s}` → `{s.skill}` |
| `admin/users/[id]/UserDetailView.tsx` | ✅ Fixed | `{s}` → `{s.skill}` |

### 9. Data Flow — Props Between Components

| From → To | Status | Notes |
|-----------|--------|-------|
| `FavoritesClient` → `ProviderInfoButton` | ✅ Fixed | Removed stale string→object conversion |
| `provider/onboarding/page.tsx` → API | ✅ Fixed | Converts `string[]` → objects before POST |
| `provider/profile/ProfileClient.tsx` → API | ✅ Correct | Sends formatted objects |

---

## Part 2: Production Gaps — Missing Features

### CRITICAL — Must fix before production

#### 1. No Database Migration Script for Legacy Data
- **Risk:** Existing MongoDB documents with `skills: ["Plumbing", "Electrical"]` will crash when read as objects
- **Impact:** Runtime errors for any provider who registered before the migration
- **Location:** No migration script exists anywhere in the codebase
- **Fix:** Create `scripts/migrate-skills.ts` that converts `string[]` → `[{ skill: s, yearsExperience: 0, hourlyRate: "" }]`
- **Verification:** `db.providerprofiles.find({ "skills.0": { $type: "string" } }).count()` should return 0

#### 2. No MongoDB Index on `skills.skill`
- **Risk:** Full collection scan on every skill filter, search, aggregation
- **Impact:** Slow queries at scale; every provider browse/search/recommendation hits all documents
- **Locations needing index:**
  - `providerProfile.repository.ts:135` — `findUserIdsByFilters` exact match
  - `ai/recommend-providers/route.ts:26` — `$regex` search
  - `providers/page.tsx:46` — public browse filter
  - `peso.repository.ts:237` — workforce registry filter
  - All `$unwind` + `$group` aggregations
- **Fix:** Add to `ProviderProfile.ts`:
  ```
  ProviderProfileSchema.index({ "skills.skill": 1 });
  ```

#### 3. No Server-Side Backward Compatibility
- **Risk:** API returns 400 validation error if any client sends old `string[]` format
- **Impact:** Mobile apps, cached pages, third-party integrations sending old format will break
- **Current state:** Only `ProfileClient.tsx` has client-side conversion (`initializeSkills`)
- **Fix:** Add normalization middleware in `providerProfile.service.ts` `upsertProfile` that auto-converts strings to objects before validation

### HIGH — Should fix for production quality

#### 4. Skill Normalization / Deduplication Missing
- **Problem:** Provider can add "Web Design", "web design", "WEB DESIGN" as 3 separate skills
- **Impact:** Search for "web design" (exact match in `findUserIdsByFilters`) misses "Web Design" providers
- **Current state:**
  - Skill catalog normalizes to lowercase (`skill.repository.ts:38`)
  - Provider profile does NOT normalize — stores user input as-is
  - `findUserIdsByFilters` uses exact match, not case-insensitive
- **Fix:** Normalize skill names on save (trim + title case or lowercase) and use case-insensitive queries

#### 5. `hourlyRate` Format Unvalidated
- **Problem:** `hourlyRate` is `String` with no format constraint — accepts "500", "expensive", "🚀"
- **Impact:** Data quality issues, cannot use rates for calculations
- **Current validation:** Zod only checks `z.string().max(20)` — no numeric or currency format
- **Mismatch:** Profile-level `hourlyRate` is `Number`, per-skill is `String` — inconsistent types
- **Fix:** Either validate as numeric string with regex `^\d+(\.\d{1,2})?$` or change to `Number` type

#### 6. CSV Export Drops Per-Skill Metadata
- **Problem:** Export fetches full skill objects but strips to names only
- **Location:** `admin/users/export/route.ts:56` — `p.skills.map(s => s.skill)`
- **Impact:** Admin exports lose `yearsExperience` and `hourlyRate` data
- **Fix:** Add CSV columns for per-skill data or export as JSON column

#### 7. Skill Catalog `usageCount` Never Decremented
- **Problem:** `skillRepository.upsertMany` increments count when skills added, but removing skills from profile never decrements
- **Location:** `providerProfile.service.ts:97-99` — only upserts on save, no decrement on removal
- **Impact:** `usageCount` inflates over time, becomes unreliable for "trending skills" features
- **Fix:** Track removed skills on profile update and call `skillRepository.decrementMany`

### MEDIUM — Important for feature completeness

#### 8. Per-Skill Data Not Used in Job Matching/Ranking
- **Problem:** `yearsExperience` and `hourlyRate` per skill are collected but never used
- **Unused in:**
  - `ai/recommend-providers/route.ts` — extracts only skill names for AI
  - `lib/openai.ts` — `ProviderCandidate` only has `skills: string[]`
  - `providerProfile.repository.ts` — filter by skill name only, no experience filter
- **Impact:** A 1-year plumber ranks same as 15-year specialist (if same rating)
- **Fix:**
  - Add `minYearsExperience` filter to `findUserIdsByFilters`
  - Include per-skill experience in AI context for better ranking
  - Add `maxHourlyRate` filter for budget-aware search

#### 9. No Rate-Based Pricing Logic
- **Problem:** No service uses per-skill hourlyRate to suggest or validate pricing
- **Unused in:**
  - `quote.service.ts` — accepts any `proposedAmount` with no rate reference
  - `consultation.service.ts` — freeform `estimateAmount` with no guidance
- **Impact:** No smart pricing, no estimate generation, no budget-fit validation
- **Fix:** Add `calculateEstimate(skillName, hours, providerSkills)` utility

#### 10. Public Profile Doesn't Display Per-Skill Data
- **Problem:** Public profile (`providers/[id]`) receives full skill objects but likely only renders skill names
- **Impact:** Clients can't see per-skill experience or rates to make hiring decisions
- **Fix:** Show experience years and rates per skill on public profile cards

#### 11. Email Templates Don't Include Skill Context
- **Problem:** Quote/notification emails say "A provider submitted a quote" — no mention of specialization
- **Impact:** Clients can't quickly assess provider relevance from email alone
- **Fix:** Include top relevant skills in email templates

### LOW — Nice-to-have for scalability

#### 12. No Per-Skill Verification/Endorsement
- **Problem:** All skills are self-reported with no verification mechanism
- **Current state:** Profile-level `isLocalProCertified` exists, but no per-skill `isVerified` flag
- **Fix:** Add `isVerified?: boolean` to skill schema, admin endpoint to verify skills

#### 13. No Experience-Level Analytics
- **Problem:** PESO reports aggregate skill counts but not experience distribution
- **Impact:** Can't answer "How many providers have 5+ years in Plumbing?"
- **Fix:** Add `$bucket` aggregation by `skills.yearsExperience` ranges

#### 14. Inconsistent Zod Validation Across Routes
- **Problem:** Skills Zod schema defined separately in 3 routes — can drift
- **Locations:**
  - `api/providers/profile/route.ts:18-22`
  - `api/admin/users/route.ts:32-36`
  - `api/peso/referrals/route.ts:13-17`
- **Fix:** Extract shared `SkillEntrySchema` to `src/lib/validation.ts`

---

## Part 3: Production Readiness Scorecard

| Area | Score | Blocker? | Notes |
|------|-------|----------|-------|
| Type migration completeness | 100% | — | All 21 files updated |
| Legacy data migration | 0% | **YES** | No migration script |
| Database indexing | 0% | **YES** | No index on `skills.skill` |
| API backward compat | 30% | **YES** | Client-side only; server rejects old format |
| Validation consistency | 60% | No | Works but Zod scattered, rate unvalidated |
| Skill normalization | 40% | No | Catalog normalizes; profile doesn't |
| Search/filter by skills | 70% | No | Works but unindexed + name-only |
| Per-skill data utilization | 10% | No | Collected but unused in matching/pricing |
| Export completeness | 40% | No | Names exported; metadata dropped |
| Skill catalog sync | 70% | No | Upsert works; no decrement on removal |

---

## Part 4: Reusable Audit Process

When migrating a field type, audit in this order:

1. **Schema/Model** — Mongoose schema + TypeScript interface
2. **Repository layer** — DB queries (`$group`, `$unwind`, `$elemMatch`, `distinct`, dot-notation)
3. **Service layer** — Data transformations, ensure objects aren't stripped
4. **API validation** — All Zod schemas matching new structure
5. **API data mapping** — `.join()`, `.toLowerCase()`, `.includes()` on items
6. **AI/external integrations** — Extract relevant fields before prompts
7. **UI type definitions** — All local interfaces in components
8. **UI rendering** — `key={}` and `{}` in JSX access correct property
9. **Data flow** — Props between components, stale conversions removed
10. **Final sweep** — Grep for old type pattern, verify all intentional
11. **Production gaps** — Migration script, indexes, backward compat, normalization

### Grep patterns for verification

```bash
# Find remaining old type references
grep -rn "skills.*string\[\]" --include="*.ts" --include="*.tsx"

# Find rendering that treats skills as strings
grep -rn "\.skills.*\.map.*=> s\b" --include="*.tsx"
grep -rn "\.skills.*\.join" --include="*.ts" --include="*.tsx"
grep -rn "\.skills.*\.some.*toLowerCase" --include="*.ts"

# Find DB queries that don't use dot notation
grep -rn '"\$skills"' --include="*.ts"
grep -rn "skills.*elemMatch" --include="*.ts"
```

---

## Part 5: Files Changed in This Migration

| # | File | Change Type |
|---|------|-------------|
| 1 | `src/types/index.ts` | Type definition |
| 2 | `src/services/providerProfile.service.ts` | Data loss fix + type |
| 3 | `src/services/peso.service.ts` | DTO type + data conversion |
| 4 | `src/repositories/peso.repository.ts` | Aggregation queries + interface |
| 5 | `src/lib/openai.ts` | String extraction for AI |
| 6 | `src/app/api/providers/route.ts` | Type + search fix |
| 7 | `src/app/api/providers/profile/generate-bio/route.ts` | String extraction |
| 8 | `src/app/api/ai/recommend-providers/route.ts` | Query + type + extraction |
| 9 | `src/app/api/admin/users/route.ts` | Zod schema |
| 10 | `src/app/api/admin/users/import/route.ts` | Data conversion |
| 11 | `src/app/api/admin/users/export/route.ts` | Type annotation |
| 12 | `src/app/api/peso/referrals/route.ts` | Zod schema |
| 13 | `src/app/api/cron/drip-emails/route.ts` | Cast fix |
| 14 | `src/components/shared/ProviderInfoButton.tsx` | Type + render |
| 15 | `src/app/(dashboard)/provider/onboarding/page.tsx` | API payload conversion |
| 16 | `src/app/(dashboard)/client/providers/[id]/_components/ProfileClient.tsx` | Type + render |
| 17 | `src/app/(dashboard)/client/favorites/_components/FavoritesClient.tsx` | Type + removed stale conversion |
| 18 | `src/app/(dashboard)/client/consultations/_components/RequestConsultationForm.tsx` | Type + render |
| 19 | `src/app/(dashboard)/peso/workforce/page.tsx` | Type + render |
| 20 | `src/app/(dashboard)/peso/verification/page.tsx` | Type |
| 21 | `src/app/(dashboard)/admin/users/[id]/UserDetailView.tsx` | Render |
