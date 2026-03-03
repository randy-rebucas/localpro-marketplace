export function ProviderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-slate-100" />
            <div className="h-3 w-36 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-5 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="h-3 w-24 rounded bg-slate-100" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
      </div>
      <div className="flex gap-1.5">
        {[40, 56, 48].map((w, i) => (
          <div key={i} className={`h-5 rounded-full bg-slate-100 w-${w === 40 ? "10" : w === 56 ? "14" : "12"}`} />
        ))}
      </div>
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <div className="h-8 flex-1 rounded-lg bg-slate-100" />
        <div className="h-8 flex-1 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

export function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <ProviderCardSkeleton key={i} />
      ))}
    </div>
  );
}
