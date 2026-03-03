export function EarningsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-7 w-28 rounded bg-slate-100" />
                <div className="h-2.5 w-20 rounded bg-slate-100" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
      {/* Breakdown bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="h-3 w-32 rounded bg-slate-100" />
        <div className="h-3 rounded-full bg-slate-100" />
        <div className="flex gap-4">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-3 w-24 rounded bg-slate-100" />
        </div>
      </div>
      {/* Transaction table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-4 w-36 rounded bg-slate-100" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-50 flex items-center gap-4">
            <div className="h-3.5 w-48 rounded bg-slate-100 flex-1" />
            <div className="h-3.5 w-16 rounded bg-slate-100" />
            <div className="h-3.5 w-16 rounded bg-slate-100" />
            <div className="h-3.5 w-16 rounded bg-slate-100" />
            <div className="h-5 w-20 rounded-full bg-slate-100" />
            <div className="h-3.5 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
