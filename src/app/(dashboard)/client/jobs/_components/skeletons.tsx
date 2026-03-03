export function JobsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stats strip skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="h-3 w-12 rounded bg-slate-100 mb-2" />
            <div className="h-6 w-8 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 w-16 rounded-lg bg-slate-200" />
        ))}
      </div>
      {/* Card skeletons */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3 w-28 rounded bg-slate-100" />
              </div>
              <div className="h-3 w-36 rounded bg-slate-100" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-6 w-20 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <div className="h-5 w-14 rounded-full bg-slate-100" />
            </div>
          </div>
          {/* Progress dots skeleton */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-2 flex-1 rounded-full bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
