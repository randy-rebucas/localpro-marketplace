export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 h-[104px]" />
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded-full bg-slate-100" />
        <div className="h-7 w-56 rounded-full bg-slate-100" />
        <div className="h-4 w-44 rounded-full bg-slate-100" />
      </div>
      <div className="h-9 w-28 rounded-lg bg-slate-100" />
    </div>
  );
}

export function RecentJobsSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100 h-[53px]" />
      <div className="divide-y divide-slate-100">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 h-[66px]" />
        ))}
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-xl border border-slate-200 h-20" />
      <div className="rounded-xl border border-slate-200 h-48" />
    </div>
  );
}
