# Performance Optimization Checklist
## LocalPro Marketplace — Review Against Execution Plan

> Last updated: 2026-03-01
> Legend: ✅ Done · ⚠️ Partial · ❌ Not started · 🔍 Needs investigation · 🚫 Blocked

---

## Section 1 — Advanced Code Splitting

### Setup
- [x] ✅ Install `@next/bundle-analyzer` (`pnpm add -D @next/bundle-analyzer`)
- [x] ✅ Add analyzer config to `next.config.ts` — wraps config with `withBundleAnalyzer`
- [ ] ❌ Run `ANALYZE=true pnpm build` and capture baseline chunk sizes ← **do this next**

### Route-level isolation
- [ ] 🔍 Audit `/admin/*` pages for cross-role barrel imports
- [ ] 🔍 Audit `/client/*` pages for cross-role barrel imports
- [ ] 🔍 Audit `/provider/*` pages for cross-role barrel imports

### Component dynamic imports
- [x] ✅ `ChatWindow` — dynamic with `ssr: false` in `client/messages/[jobId]/page.tsx`
- [x] ✅ `ChatWindow` — dynamic with `ssr: false` in `provider/messages/[jobId]/page.tsx`
- [ ] ❌ `PayMongoButton` — no consumers yet; wire to escrow page with `dynamic(() => ..., { ssr: false })`
- [ ] 🔍 `admin/disputes/page.tsx` — confirm DisputeTable is dynamic imported

### Interaction-driven imports
- [ ] ❌ `ReviewModal` — lazy import on button click instead of at module level
- [ ] 🔍 `client/reviews/page.tsx` — confirm dynamic import is interaction-gated

### Validate
- [ ] ❌ Re-run `ANALYZE=true pnpm build` after changes and confirm chunks removed from main bundle
- [ ] ❌ Check Lighthouse score before/after delta

---

## Section 2 — Strategic Component-Level Memoization

### Profiling (must do first)
- [ ] ❌ Open React DevTools Profiler on `/provider/marketplace` — click a filter, record render highlights
- [ ] ❌ Open React DevTools Profiler on `/client/messages/[jobId]` — send a message, record highlights

### JobCard
- [ ] ⚠️ No `JobCard.tsx` exists — identify the actual job card component in `MarketplaceClient.tsx` and apply `memo` after Profiler confirms it re-renders

### MessageBubble
- [x] ✅ `src/components/chat/MessageBubble.tsx` — wrapped with `React.memo`

### NotificationBell
- [x] ✅ `src/components/shared/NotificationBell.tsx` — replaced full destructure with individual Zustand selectors

### Sidebar / DashboardShell
- [ ] 🔍 Confirm via Profiler before adding `memo`

### Derived values
- [x] ✅ `MarketplaceClient.tsx` — filtered+sorted job list already uses `useMemo`

### Validate
- [ ] ❌ Re-run React DevTools Profiler — confirm targeted components no longer highlight on irrelevant updates

---

## Section 3 — Partial Prerendering (PPR)

### Config
- [x] 🚫 `cacheComponents` tried and **removed** from `next.config.ts` — incompatible with `export const dynamic = "force-dynamic"` on 4 SSE routes:
  - `api/notifications/stream`
  - `api/messages/stream/[threadId]`
  - `api/support/stream`
  - `api/admin/support/stream`
  - `api/categories` (`revalidate = 86400`)
  > `next.config.ts` is clean — experimental block has only `optimizePackageImports`.
  > To unblock: migrate SSE routes from `force-dynamic` to Next.js 16 `connection()` API, then re-add `cacheComponents: true`.

### Per-route opt-in
- [x] 🚫 `experimental_ppr = true` exports removed from all routes — blocked by above

### Add Suspense boundaries (prerequisite for PPR — all done ✅)
- [x] ✅ `client/dashboard` — `<Suspense>` around `DashboardKpis` + `RecentJobs` (pre-existing)
- [x] ✅ `admin/dashboard` — `<Suspense fallback={<AdminDashboardSkeleton />}><AdminDashboardContent /></Suspense>`
- [x] ✅ `provider/dashboard` — `<Suspense fallback={<ProviderDashboardSkeleton />}><ProviderDashboardContent /></Suspense>`
- [x] ✅ `provider/earnings` — `<Suspense fallback={<EarningsSkeleton />}><EarningsContent /></Suspense>`
- [x] ✅ `provider/jobs` — `<Suspense fallback={<JobsListSkeleton />}><ProviderJobsContent /></Suspense>`
- [x] ✅ `provider/marketplace` — `<Suspense fallback={<MarketplaceSkeleton />}><MarketplaceContent /></Suspense>`

### Validate
- [ ] ❌ Run `curl -N http://localhost:3000/client/dashboard` and confirm chunked transfer-encoding
- [ ] ❌ Confirm static shell arrives in first chunk; dynamic content in subsequent chunks

---

## Section 4 — Streaming Server Rendering

### Convert client-fetched pages to async server components

| Page | Current State | Status |
|---|---|---|
| `client/dashboard` | Server + Suspense | ✅ Done (pre-existing) |
| `client/jobs` (my-jobs) | Server + Suspense | ✅ Done (pre-existing) |
| `provider/marketplace` | ~~Client + useEffect~~ → Server + Suspense | ✅ Converted |
| `provider/jobs` (active-jobs) | ~~Server, no Suspense~~ → Server + Suspense | ✅ Done |
| `provider/dashboard` | ~~Server, no Suspense~~ → Server + Suspense | ✅ Done |
| `provider/earnings` | ~~Server, no Suspense~~ → Server + Suspense | ✅ Done |
| `admin/dashboard` | ~~Server, no Suspense~~ → Server + Suspense | ✅ Done |

### Provider marketplace conversion detail
- [x] ✅ Created `MarketplaceClient.tsx` — client component with all interactive logic + inline `useDebounce`
- [x] ✅ `page.tsx` now seeds initial jobs, categories, quotedJobIds server-side via `Promise.all`
- [x] ✅ Eliminated 3 `useEffect` data-fetch calls (jobs, categories, quotedIds); initial load shows no spinner
- [x] ✅ Refresh button still works via `apiFetch` for manual re-fetch
- [x] ✅ `useMemo` on `filtered` list (search + sort) preserved from original

### Skeleton components (inline in page files — extraction pending)
- [x] ✅ `AdminDashboardSkeleton` — inline in `admin/dashboard/page.tsx`
- [x] ✅ `ProviderDashboardSkeleton` — inline in `provider/dashboard/page.tsx`
- [x] ✅ `EarningsSkeleton` — inline in `provider/earnings/page.tsx`
- [x] ✅ `JobsListSkeleton` — inline in `provider/jobs/page.tsx`
- [x] ✅ `MarketplaceSkeleton` — inline in `provider/marketplace/page.tsx`
- [ ] ❌ Extract all skeletons to `src/components/skeletons/` directory (deferred — low priority)

### Error boundaries
- [x] ✅ `src/components/ErrorBoundary.tsx` — created (class component with `getDerivedStateFromError`)
- [ ] ❌ Wrap each `<Suspense>` block in `<ErrorBoundary>` on the converted pages

### Validate streaming
- [ ] ❌ `curl -sI http://localhost:3000/provider/marketplace | grep transfer-encoding` → expect `chunked`
- [ ] ❌ Chrome DevTools → Network → Timing — confirm short "Waiting" phase
- [ ] ❌ WebPageTest: TTFB < 200ms, FCP < 1s on converted pages

---

## Build Status
- [x] ✅ `pnpm build` — **0 errors, 88 pages generated** (verified 2026-03-01 after all changes)
- [x] ✅ `next.config.ts` — clean; `withBundleAnalyzer` wrapper active, no conflicting experimental flags

---

## Final Validation (remaining)

- [ ] ❌ Run `ANALYZE=true pnpm build` — confirm main JS chunk < 150 kB gzipped
- [ ] ❌ Lighthouse on `client/dashboard` — Performance score ≥ 85
- [ ] ❌ Lighthouse on `provider/marketplace` — Performance score ≥ 85
- [ ] ❌ LCP < 2.5s on dashboard pages
- [ ] ❌ CLS < 0.1 (skeletons match real component dimensions)
- [ ] ❌ TBT < 200ms
- [ ] ❌ React Profiler — zero unnecessary re-renders on marketplace filter interaction
- [ ] ❌ TTFB < 200ms on all converted streaming pages

---

## Remaining Work (priority order)

| # | Task | Effort | Impact |
|---|---|---|---|
| 1 | Run `ANALYZE=true pnpm build` — inspect chunk sizes | 5 min | Data for all next decisions |
| 2 | Wrap each `<Suspense>` in `<ErrorBoundary>` on 5 converted pages | 30 min | Resilience — one bad DB query won't crash page |
| 3 | Wire `PayMongoButton` into escrow page with `dynamic(() => ..., { ssr: false })` | 15 min | Removes PayMongo JS from non-payment pages |
| 4 | React DevTools Profiler session — marketplace filter click + chat message send | 1 hr | Data for any remaining memoization work |
| 5 | Migrate SSE routes from `force-dynamic` → `connection()` API, then re-enable `cacheComponents` | 2 hrs | Unlocks true PPR / static shell from CDN |
| 6 | Lighthouse audit on `/client/dashboard` and `/provider/marketplace` | 30 min | Baseline performance scores |
| 7 | Extract inline skeletons to `src/components/skeletons/` | 1 hr | Low priority — only worthwhile if 2+ pages share a skeleton |
