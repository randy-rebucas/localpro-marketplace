export function ConsultationsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Tabs skeleton */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-200">
        {[80, 72, 84, 76, 88, 72].map((w, i) => (
          <div key={i} className="h-8 flex-shrink-0 bg-slate-200 rounded-t" style={{ width: w }} />
        ))}
      </div>

      {/* Card skeletons */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl flex overflow-hidden">
            <div className="w-1 flex-shrink-0 bg-slate-200" />
            <div className="flex-1 p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-4 w-16 bg-slate-200 rounded-full flex-shrink-0" />
              </div>
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="flex gap-3">
                <div className="h-3 bg-slate-200 rounded w-20" />
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-3 bg-slate-200 rounded w-16 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
