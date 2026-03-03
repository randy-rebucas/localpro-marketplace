export function EscrowSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stats strip skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="h-3 w-14 rounded bg-slate-100 mb-2" />
            <div className="h-6 w-10 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 w-24 rounded-lg bg-slate-200" />
        ))}
      </div>
      {/* Cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-3 w-32 rounded bg-slate-100" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-6 w-20 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="h-10 w-full rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
