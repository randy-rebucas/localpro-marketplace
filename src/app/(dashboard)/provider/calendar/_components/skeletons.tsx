export function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Calendar header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-100" />
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-8 w-8 rounded-lg bg-slate-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-lg bg-slate-100" />
            <div className="h-8 w-20 rounded-lg bg-slate-100" />
          </div>
        </div>
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-slate-100" />
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-50 border border-slate-100" />
          ))}
        </div>
      </div>
      {/* Job list below */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="h-4 w-32 rounded bg-slate-200" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-48 rounded bg-slate-100" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
            <div className="h-5 w-16 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
