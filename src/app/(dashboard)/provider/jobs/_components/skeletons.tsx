export function JobsListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="flex gap-2">
                <div className="h-3 w-16 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-3 w-20 rounded bg-slate-100" />
              </div>
              <div className="h-3 w-full rounded bg-slate-100" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-7 w-20 rounded bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <div className="h-5 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <div className="h-8 w-28 rounded-lg bg-slate-100" />
            <div className="h-8 w-24 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
