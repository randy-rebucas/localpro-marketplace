export function PayoutsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Balance banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-200 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-56 rounded bg-slate-200" />
            <div className="h-3 w-40 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-9 w-32 rounded-lg bg-slate-200 flex-shrink-0" />
      </div>
      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-4 w-36 rounded bg-slate-100" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-50 flex items-center gap-4">
            <div className="h-3.5 w-24 rounded bg-slate-100" />
            <div className="h-3.5 w-16 rounded bg-slate-100 ml-auto" />
            <div className="h-3.5 w-24 rounded bg-slate-100" />
            <div className="h-3.5 w-28 rounded bg-slate-100" />
            <div className="h-5 w-20 rounded-full bg-slate-100" />
            <div className="h-3.5 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
