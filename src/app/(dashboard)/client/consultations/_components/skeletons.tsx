export function ConsultationsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b pb-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-20 bg-slate-200 rounded-t" />
        ))}
      </div>

      {/* List skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 bg-slate-200 rounded w-2/3" />
                  <div className="h-5 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="flex gap-4 pt-1">
                  <div className="h-3 bg-slate-200 rounded w-28" />
                  <div className="h-3 bg-slate-200 rounded w-20" />
                </div>
              </div>
              <div className="h-6 w-24 bg-slate-200 rounded flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
