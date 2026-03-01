# Performance Optimization Execution Plan
## LocalPro Marketplace — Next.js 16 App Router

---

## 1. Advanced Code Splitting Strategies

### Goal
Reduce initial JS bundle size so the marketplace shell loads instantly, deferring heavy feature code until needed.

### Targets in this codebase
| Area | Current Issue | Action |
|---|---|---|
| Admin dashboard | All admin charts/tables ship in main bundle | Dynamic import per admin page |
| PayMongoButton | PayMongo SDK loads on every page | Lazy load only on escrow pages |
| ChatWindow / SSE | Real-time chat code ships on non-chat routes | Dynamic import with `ssr: false` |
| OpenAI ranking UI | Ranking result renderer always bundled | Dynamic import only when `aiRank=true` |
| Rich text editors / file pickers | Load immediately | Import on first user interaction |

### Execution Steps

#### Step 1 — Audit current bundle (Day 1)
```bash
pnpm build
# Open .next/analyze/ (add @next/bundle-analyzer to next.config)
```
Add bundle analyzer:
```ts
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' })
module.exports = withBundleAnalyzer({ ...existingConfig })
```
Run `ANALYZE=true pnpm build` and identify the top 5 largest chunks.

#### Step 2 — Route-level splitting (already handled by App Router)
Verify each `/admin/*`, `/client/*`, `/provider/*` page does **not** import from sibling routes. Remove any cross-role barrel imports.

#### Step 3 — Component dynamic imports
```ts
// src/app/admin/disputes/page.tsx
const DisputeTable = dynamic(() => import('@/components/admin/DisputeTable'), {
  loading: () => <TableSkeleton />,
})

// src/components/payment/PayMongoButton.tsx (already exists — verify ssr:false)
const PayMongoButton = dynamic(() => import('@/components/payment/PayMongoButton'), {
  ssr: false,
  loading: () => <ButtonSkeleton />,
})

// src/app/client/messages/[jobId]/page.tsx
const ChatWindow = dynamic(() => import('@/components/chat/ChatWindow'), {
  ssr: false, // SSE requires browser
  loading: () => <ChatSkeleton />,
})
```

#### Step 4 — Interaction-driven imports
For the rich review form (star picker, textarea):
```ts
// Only import the heavy DatePicker / StarRating when user clicks "Leave Review"
const handleReviewClick = async () => {
  const { ReviewModal } = await import('@/components/reviews/ReviewModal')
  // mount it
}
```

#### Step 5 — Validate
After each dynamic import, run `ANALYZE=true pnpm build` and confirm the chunk is removed from the main bundle. Check Lighthouse score delta.

---

## 2. Strategic Component-Level Memoization

### Goal
Eliminate unnecessary re-renders in high-frequency update components (notification bell, chat list, job cards).

### Targets
| Component | Re-render Trigger | Fix |
|---|---|---|
| `NotificationBell` | Any Zustand auth store update | Wrap in `memo`, subscribe to notification slice only |
| `JobCard` (provider marketplace) | Parent list re-render on filter change | `memo` + stable `onApply` callback ref |
| `MessageBubble` | New message arrives, re-renders all bubbles | `memo` keyed by `message._id` |
| `Sidebar` | Route change or header state | `memo` — only re-renders on role change |
| `DashboardShell` | Any parent update | `memo` on shell wrapper |

### Execution Steps

#### Step 1 — Profile before touching anything (Day 2)
Open React DevTools Profiler on:
- `/provider/marketplace` — click a filter
- `/client/messages/[jobId]` — send a message

Record which components flash (highlight updates). **Only memoize components that actually re-render unnecessarily.**

#### Step 2 — Memoize JobCard
```ts
// src/components/provider/JobCard.tsx
const JobCard = memo(function JobCard({ job, onApply }: JobCardProps) {
  // existing render
}, (prev, next) => prev.job._id === next.job._id && prev.job.status === next.job.status)
```
Stabilize the callback in the parent:
```ts
const handleApply = useCallback((jobId: string) => {
  router.push(`/provider/marketplace/${jobId}`)
}, [router])
```

#### Step 3 — Memoize MessageBubble
```ts
// src/components/chat/MessageBubble.tsx
export const MessageBubble = memo(function MessageBubble({ message, isOwn }: Props) {
  // existing render
})
```
Since SSE appends new messages to the array, old `MessageBubble` instances never need to re-render.

#### Step 4 — Isolate Zustand subscriptions in NotificationBell
```ts
// Instead of: const { notifications } = useNotificationStore()
// Use a selector so unrelated store changes don't re-render:
const unreadCount = useNotificationStore(s => s.notifications.filter(n => !n.read).length)
const connectSSE = useNotificationStore(s => s.connectSSE)
```

#### Step 5 — Memoize expensive derived values
```ts
// src/app/provider/marketplace/page.tsx
const rankedJobs = useMemo(
  () => jobs.filter(j => matchesFilters(j, filters)).sort(byRelevance),
  [jobs, filters]
)
```

#### Step 6 — Validate
Re-run React DevTools Profiler. Confirm targeted components no longer highlight on irrelevant state changes. Check that memo'd components **do** re-render when their own props change (regression check).

---

## 3. Partial Prerendering for Dynamic Content

### Goal
Serve a static shell (header, sidebar, layout chrome) from CDN instantly, while streaming dynamic content (job lists, user data) from the server — without a full SSR waterfall.

### How PPR works in Next.js 15+
Next.js wraps `<Suspense>` boundaries in a static outer shell. The static part ships as HTML immediately; the dynamic parts stream in as they resolve. The `<Suspense>` fallback is the placeholder shown during that stream.

### Targets
| Page | Static Shell | Dynamic Content |
|---|---|---|
| `/client/dashboard` | Header, sidebar, stat card skeletons | Real stat numbers (DB query) |
| `/provider/marketplace` | Header, sidebar, filter bar | Job listings (DB + optional AI rank) |
| `/` (homepage) | Hero, nav | Top providers list, category counts |
| `/admin/dashboard` | Layout | KPI metrics (aggregation queries) |

### Execution Steps

#### Step 1 — Enable PPR in next.config (experimental, Next.js 15+)
```ts
// next.config.ts
experimental: {
  ppr: true, // or 'incremental' to opt-in per route
}
```

#### Step 2 — Refactor client dashboard page
```tsx
// src/app/client/dashboard/page.tsx

// Static shell renders immediately:
export default function ClientDashboard() {
  return (
    <DashboardShell>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatCardsSkeleton />}>
        <ClientStats />          {/* async server component — DB query */}
      </Suspense>
      <Suspense fallback={<JobListSkeleton />}>
        <RecentJobs />           {/* async server component — DB query */}
      </Suspense>
    </DashboardShell>
  )
}
```

```tsx
// src/components/client/ClientStats.tsx  (async server component)
export default async function ClientStats() {
  const user = await requireUser()              // reads cookie
  const stats = await jobService.getClientStats(user.id)
  return <StatCards data={stats} />
}
```

#### Step 3 — Apply same pattern to provider marketplace
```tsx
// src/app/provider/marketplace/page.tsx
export default function MarketplacePage() {
  return (
    <DashboardShell>
      <FilterBar />   {/* client component — static */}
      <Suspense fallback={<JobGridSkeleton />}>
        <JobGrid />   {/* async server component */}
      </Suspense>
    </DashboardShell>
  )
}
```

#### Step 4 — Mark truly dynamic segments
Any component that reads cookies, headers, or per-request data must use `import { cookies } from 'next/headers'` (already async in Next.js 15). Ensure these are only called inside async server components inside `<Suspense>`.

#### Step 5 — Validate
Use `curl -N https://localhost:3000/client/dashboard` and observe chunked transfer encoding. The shell HTML arrives in the first chunk; stat data arrives in subsequent chunks. Lighthouse TBT should drop.

---

## 4. Streaming Server Rendering for Improved User Experience

### Goal
Replace page-level loading spinners with fine-grained streaming: users see meaningful content progressively rather than a blank screen.

### Current state
Most dashboard pages use client-side data fetching (`useEffect` + loading state). This means: blank shell → spinner → content. Streaming inverts this: shell → skeleton → streamed content.

### Execution Steps

#### Step 1 — Convert data-fetch pages to async server components (Day 3–4)

Pattern to apply across dashboards:

**Before (client component):**
```tsx
'use client'
export default function MyJobs() {
  const [jobs, setJobs] = useState([])
  useEffect(() => { fetch('/api/jobs').then(...).then(setJobs) }, [])
  if (!jobs.length) return <Spinner />
  return <JobList jobs={jobs} />
}
```

**After (async server component + streaming):**
```tsx
// page.tsx (server component — no 'use client')
import { Suspense } from 'react'
export default function MyJobsPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<JobListSkeleton />}>
        <JobListServer />
      </Suspense>
    </DashboardShell>
  )
}

// JobListServer.tsx (async server component)
async function JobListServer() {
  const user = await requireUser()
  const jobs = await jobService.getClientJobs(user.id)
  return <JobList jobs={jobs} />  // JobList is a pure client component
}
```

#### Step 2 — Priority order for conversion
1. `/client/my-jobs` — high traffic, currently client-fetched
2. `/provider/active-jobs` — same pattern
3. `/admin/dashboard` — aggregation queries are slow; streaming hides latency
4. `/provider/earnings` — financial data; users sensitive to loading time

#### Step 3 — Nested Suspense for progressive reveal
For pages with multiple independent data sections:
```tsx
export default function ProviderDashboard() {
  return (
    <DashboardShell>
      <div className="grid grid-cols-3 gap-4">
        <Suspense fallback={<EarningsSkeleton />}>
          <EarningsSummary />       {/* resolves in ~50ms */}
        </Suspense>
        <Suspense fallback={<ActiveJobsSkeleton />}>
          <ActiveJobsCount />       {/* resolves in ~80ms */}
        </Suspense>
        <Suspense fallback={<RatingSkeleton />}>
          <AverageRating />         {/* resolves in ~120ms */}
        </Suspense>
      </div>
      <Suspense fallback={<JobTableSkeleton />}>
        <RecentJobsTable />         {/* slowest — resolves last */}
      </Suspense>
    </DashboardShell>
  )
}
```
The three summary cards stream in as each resolves; the table streams last without blocking the cards.

#### Step 4 — Loading UI hierarchy
Create skeleton components for each streamed section:
```
src/components/skeletons/
  StatCardsSkeleton.tsx
  JobListSkeleton.tsx
  JobTableSkeleton.tsx
  ChatSkeleton.tsx
  EarningsSkeleton.tsx
```
Each skeleton matches the exact dimensions of the real component to prevent layout shift (CLS).

#### Step 5 — Error boundaries for streamed sections
```tsx
// src/components/ErrorBoundary.tsx (already exists or create)
<ErrorBoundary fallback={<SectionError message="Failed to load jobs" />}>
  <Suspense fallback={<JobListSkeleton />}>
    <JobListServer />
  </Suspense>
</ErrorBoundary>
```
This ensures one failed DB query doesn't crash the whole page.

#### Step 6 — Keep interactive components as client components
Only the data-fetching shell becomes a server component. Interactive parts (filters, forms, SSE chat) stay as `'use client'` components passed as props or rendered as children.

#### Step 7 — Validate streaming
```bash
# Check transfer-encoding: chunked header
curl -sI http://localhost:3000/client/my-jobs | grep transfer-encoding

# Measure streaming waterfall in Chrome DevTools > Network > Timing
# "Waiting for server response" should be short; "Content download" spans the stream
```
Use WebPageTest to confirm TTFB < 200ms and FCP < 1s on the converted pages.

---

## Implementation Order

| Week | Tasks |
|---|---|
| Week 1, Day 1 | Bundle analysis + dynamic imports for admin + chat |
| Week 1, Day 2 | Memoization audit + ProfilerDevTools run |
| Week 1, Day 3–4 | Convert client/my-jobs + provider/active-jobs to streaming SSR |
| Week 1, Day 5 | PPR config + client/dashboard + provider/dashboard PPR conversion |
| Week 2 | Skeleton components, error boundaries, Lighthouse validation |
| Week 2 end | Re-run bundle analyzer, Lighthouse, React Profiler — document deltas |

## Success Metrics
- Bundle size: main JS chunk < 150 kB gzipped
- Lighthouse Performance score: ≥ 85 on dashboard pages
- LCP < 2.5s, CLS < 0.1, TBT < 200ms
- Zero unnecessary re-renders on marketplace filter interaction (Profiler)
- TTFB on dashboard pages < 200ms (streaming shell arrives fast)
