# Provider Skills Type Migration Audit Report

**Date:** 2026-03-20
**Migration:** `skills: string[]` → `skills: Array<{ skill: string; yearsExperience: number; hourlyRate: string }>`

---

## Audit Checklist

Use this checklist every time you run a full audit after a type/schema change. Replace "skills" and the type names with whatever field is being migrated.

### 1. Schema & Type Definitions

| Location | Status | Notes |
|----------|--------|-------|
| Mongoose schema (`src/models/ProviderProfile.ts`) | ✅ Already correct | `SkillSchema` with `skill`, `yearsExperience`, `hourlyRate` |
| TypeScript interface (`src/types/index.ts:607`) | ✅ Fixed | Changed from `string[]` to object array |

### 2. Repository Layer (Database Queries)

| Location | Status | Notes |
|----------|--------|-------|
| `providerProfile.repository.ts` — `findDistinctSkills` | ✅ Already correct | Queries `skills.skill` |
| `providerProfile.repository.ts` — `findUserIdsByFilters` | ✅ Already correct | Queries `skills.skill` |
| `providerProfile.repository.ts` — `findForExport` | ✅ Already correct | Return type uses object array |
| `peso.repository.ts` — `getTopSkills` | ✅ Fixed | `$group._id` changed from `$skills` to `$skills.skill` |
| `peso.repository.ts` — `getOfficeReportStats` | ✅ Fixed | `$group._id` changed from `$skills` to `$skills.skill` |
| `peso.repository.ts` — `getProviderRegistry` (filter) | ✅ Fixed | Changed from `$elemMatch` on string to `skills.skill` regex |
| `peso.repository.ts` — `WorkforceRegistryEntry` interface | ✅ Fixed | Changed from `string[]` to object array |

### 3. Service Layer

| Location | Status | Notes |
|----------|--------|-------|
| `providerProfile.service.ts` — `getProfile` fallback | ✅ Fixed | Empty array typed as object array |
| `providerProfile.service.ts` — `upsertProfile` | ✅ Fixed | **Critical data loss bug** — was stripping to `.map(s => s.skill)`, now saves full objects |
| `peso.service.ts` — `ReferProviderDto` | ✅ Fixed | Changed from `string[]` to object array |
| `peso.service.ts` — `bulkOnboard` | ✅ Fixed | CSV strings now converted to objects |

### 4. API Routes — Validation Schemas

| Location | Status | Notes |
|----------|--------|-------|
| `api/providers/profile/route.ts` — `SkillSchema` | ✅ Already correct | Validates `{ skill, yearsExperience, hourlyRate }` |
| `api/admin/users/route.ts` — `CreateUserSchema` | ✅ Fixed | Changed from `z.array(z.string())` to object schema |
| `api/admin/users/import/route.ts` | ✅ Fixed | Pipe-delimited strings now converted to objects |
| `api/admin/users/export/route.ts` | ✅ Fixed | Type annotation corrected |
| `api/peso/referrals/route.ts` — `ReferSchema` | ✅ Fixed | Changed from `z.array(z.string())` to object schema |
| `api/peso/bulk-onboard/route.ts` | ✅ OK | Passes comma-separated string, conversion happens in service |

### 5. API Routes — Data Transformation

| Location | Status | Notes |
|----------|--------|-------|
| `api/providers/route.ts:90` — in-memory search | ✅ Fixed | Changed `s.toLowerCase()` to `s.skill.toLowerCase()` |
| `api/ai/recommend-providers/route.ts` — query | ✅ Fixed | Changed `$elemMatch` to `skills.skill` |
| `api/ai/recommend-providers/route.ts` — candidate mapping | ✅ Fixed | Extracts `.skill` for AI context |
| `api/providers/profile/generate-bio/route.ts` | ✅ Fixed | Extracts `.skill` from objects for prompt |
| `api/cron/drip-emails/route.ts` | ✅ Fixed | Cast changed to `unknown[]` |

### 6. AI/OpenAI Integration

| Location | Status | Notes |
|----------|--------|-------|
| `lib/openai.ts` — `rankJobsForProvider` | ✅ Fixed | `.skills.join()` → `.skills.map(s => s.skill).join()` |
| `lib/openai.ts` — `ProviderCandidate` | ✅ OK (intentional) | Uses `string[]` for extracted skill names passed to AI |
| `api/ai/suggest-skills/route.ts` | ✅ OK (intentional) | Returns `string[]` of AI-suggested skill names |

### 7. UI Components — Type Definitions

| Location | Status | Notes |
|----------|--------|-------|
| `provider/profile/ProfileClient.tsx` — `Skill` interface | ✅ Already correct | Uses `{ skill, yearsExperience, hourlyRate }` |
| `providers/page.tsx` — `ProviderCard` interface | ✅ Already correct | Uses object array |
| `client/providers/[id]/ProfileClient.tsx` | ✅ Fixed | Changed `string[]` to object array |
| `client/favorites/FavoritesClient.tsx` — `ProviderResult` | ✅ Fixed | Changed `string[]` to object array |
| `client/consultations/RequestConsultationForm.tsx` — `Provider` | ✅ Fixed | Changed `string[]` to object array |
| `shared/ProviderInfoButton.tsx` — `ProviderProfile` | ✅ Fixed | Changed `string[]` to object array |
| `peso/workforce/page.tsx` — `WorkerEntry` | ✅ Fixed | Changed `string[]` to object array |
| `peso/verification/page.tsx` — `Provider` | ✅ Fixed | Changed `string[]` to object array |
| `admin/users/[id]/UserDetailView.tsx` | ✅ Fixed | Render changed to `s.skill` |
| `api/providers/route.ts` — `ProviderRow` | ✅ Fixed | Changed `string[]` to object array |
| `shared/SkillsInput.tsx` | ✅ OK (intentional) | Generic skill-name picker, works with `string[]` |

### 8. UI Components — Rendering

| Location | Status | Notes |
|----------|--------|-------|
| `providers/page.tsx` — skill tags | ✅ Already correct | Renders `sk.skill` |
| `provider/profile/ProfileClient.tsx` — skill list | ✅ Already correct | Full object editing UI |
| `client/providers/[id]/ProfileClient.tsx` — skill badges | ✅ Fixed | Changed `{s}` / `key={s}` to `{s.skill}` / `key={s.skill}` |
| `client/favorites/FavoritesClient.tsx` — skill badges | ✅ Already correct | Renders `s.skill` |
| `client/consultations/RequestConsultationForm.tsx` — badges | ✅ Fixed | Changed `{skill}` to `{skill.skill}` |
| `shared/ProviderInfoButton.tsx` — modal skills | ✅ Fixed | Changed `{s}` to `{s.skill}` |
| `peso/workforce/page.tsx` — table cells | ✅ Fixed | Changed `{s}` to `{s.skill}` |
| `admin/users/[id]/UserDetailView.tsx` — badges | ✅ Fixed | Changed `{s}` to `{s.skill}` |

### 9. Data Flow — Skills Passed Between Components

| From → To | Status | Notes |
|-----------|--------|-------|
| `FavoritesClient` → `ProviderInfoButton` | ✅ Fixed | Removed unnecessary string→object conversion |
| `provider/onboarding/page.tsx` → API | ✅ Fixed | Converts `string[]` to objects before POST |
| `provider/profile/ProfileClient.tsx` → API | ✅ Already correct | Sends formatted objects |

---

## Reusable Audit Process

When migrating a field type across the codebase, audit in this order:

1. **Schema/Model** — Update Mongoose schema and TypeScript interface
2. **Repository layer** — Fix all DB queries (`$group`, `$unwind`, `$elemMatch`, `distinct`, dot-notation filters)
3. **Service layer** — Fix data transformations, ensure objects aren't stripped to scalars
4. **API validation** — Update Zod schemas to match new structure
5. **API data mapping** — Fix any `.join()`, `.toLowerCase()`, `.includes()` on items that are now objects
6. **AI/external integrations** — Extract relevant fields before passing to prompts
7. **UI type definitions** — Update all local interfaces in components
8. **UI rendering** — Fix `key={}` and `{}` in JSX to access correct property
9. **Data flow** — Trace props between components, remove stale conversions
10. **Final sweep** — Grep for old type pattern (e.g., `skills.*string\[\]`) and verify all matches are intentional

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

## Files Changed in This Migration

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
