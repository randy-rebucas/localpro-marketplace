/** @deprecated Use the individual skeleton exports below */
export function ProviderDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <KpiSkeleton />
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-slate-100 rounded" />
          <div className="h-7 w-56 bg-slate-200 rounded-lg" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
      ))}
    </div>
  );
}

export function RecentActivitySkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between">
        <div className="h-4 w-32 bg-slate-100 rounded" />
        <div className="h-4 w-16 bg-slate-100 rounded" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-slate-50 last:border-0 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-48 rounded bg-slate-100" />
            <div className="h-3 w-32 rounded bg-slate-100" />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-8 w-16 rounded bg-slate-100" />
            <div className="h-5 w-20 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-16 bg-white rounded-xl border border-slate-200" />
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 bg-slate-100 rounded" />
              <div className="h-2.5 w-32 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
