export default function JobsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-slate-200 rounded-lg" />
          <div className="h-4 w-20 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[60, 48, 72, 80, 80].map((w, i) => (
          <div key={i} className="h-7 rounded-lg bg-slate-200" style={{ width: w }} />
        ))}
      </div>

      {/* Card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-5 w-2/3 bg-slate-200 rounded" />
                <div className="flex gap-2">
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="h-6 w-20 bg-slate-200 rounded" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                <div className="h-5 w-14 bg-slate-100 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
