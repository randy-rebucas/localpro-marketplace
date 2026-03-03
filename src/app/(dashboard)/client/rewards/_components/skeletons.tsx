export function RewardsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded bg-slate-100" />
          <div className="h-4 w-64 rounded bg-slate-100" />
        </div>
        <div className="h-8 w-24 rounded-full bg-slate-100" />
      </div>

      {/* Tier progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-40 rounded bg-slate-100" />
          <div className="h-4 w-28 rounded bg-slate-100" />
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100" />
        <div className="h-4 w-48 rounded bg-slate-100" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-7 w-16 rounded bg-slate-100" />
                <div className="h-3 w-32 rounded bg-slate-100" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      {/* Referral card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="h-5 w-44 rounded bg-slate-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="flex gap-2">
          <div className="flex-1 h-10 rounded-lg bg-slate-100" />
          <div className="h-10 w-24 rounded-lg bg-slate-100" />
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="h-5 w-32 rounded bg-slate-100" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-slate-100" />
                <div className="h-3 w-48 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-16 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
