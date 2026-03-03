export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex-shrink-0" />
          <div className="flex-1 space-y-3 min-w-0">
            <div className="h-6 w-48 rounded bg-slate-100" />
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-full bg-slate-100" />
              <div className="h-6 w-24 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-slate-100" />
            <div className="h-9 w-28 rounded-lg bg-slate-100" />
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-slate-100 mx-auto" />
              <div className="h-5 w-20 rounded bg-slate-100 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="h-10 w-80 rounded-xl bg-slate-100" />

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
            <div className="h-3 w-3/5 rounded bg-slate-100" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 w-16 rounded bg-slate-100" />
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-6 w-16 rounded-full bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 w-28 rounded bg-slate-100" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-3 w-16 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
