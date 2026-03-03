export function PublicProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      {/* Hero */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="h-5 w-24 bg-slate-100 rounded-full" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1 text-center">
              <div className="h-3 w-16 bg-slate-100 rounded mx-auto" />
              <div className="h-5 w-10 bg-slate-200 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Tabs */}
      <div className="h-11 w-80 bg-slate-100 rounded-xl" />
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-5/6 bg-slate-100 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 rounded" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 w-20 bg-slate-100 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-2 w-full bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
