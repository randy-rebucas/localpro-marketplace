export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card animate-pulse">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="h-4 w-28 rounded bg-slate-100" />
      </div>
      <div className="divide-y divide-slate-100">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-6 py-4 flex gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 rounded bg-slate-100" />
              <div className="h-3 w-24 rounded bg-slate-100" />
              <div className="h-3 w-56 rounded bg-slate-100" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-5 w-20 rounded bg-slate-100" />
              <div className="h-4 w-14 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 animate-pulse space-y-4">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-slate-100" />
        <div className="h-3.5 w-full rounded bg-slate-100" />
        <div className="h-3.5 w-4/5 rounded bg-slate-100" />
        <div className="h-3.5 w-2/3 rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
