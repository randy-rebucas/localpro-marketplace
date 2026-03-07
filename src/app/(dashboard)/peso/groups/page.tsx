"use client";

import { UsersRound, Plus, Hammer, Brush, Wrench, Leaf, Info } from "lucide-react";

const SAMPLE_GROUPS = [
  { name: "Poblacion Cleaning Cooperative", type: "Cleaning", members: 12, barangay: "Poblacion", status: "active" },
  { name: "San Jose Construction Team", type: "Construction", members: 8, barangay: "San Jose", status: "active" },
  { name: "Bagong Silang Landscaping Crew", type: "Landscaping", members: 6, barangay: "Bagong Silang", status: "active" },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Cleaning:     <Brush className="h-4 w-4" />,
  Construction: <Hammer className="h-4 w-4" />,
  Landscaping:  <Leaf className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  Cleaning:     "bg-sky-100 text-sky-700",
  Construction: "bg-orange-100 text-orange-700",
  Landscaping:  "bg-emerald-100 text-emerald-700",
};

export default function GroupsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-blue-600" />
            Livelihood Groups
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage community cooperatives, construction teams, and livelihood groups.
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg opacity-50 cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          New Group
        </button>
      </div>

      {/* Coming soon notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Full group management (create, assign members, track income) is coming soon.
          Below is a preview of how registered livelihood groups will appear.
        </p>
      </div>

      {/* Preview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SAMPLE_GROUPS.map((group) => (
          <div key={group.name} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 opacity-70">
            <div className="flex items-start justify-between gap-2">
              <div className={`p-2 rounded-lg ${TYPE_COLORS[group.type] ?? "bg-slate-100 text-slate-600"}`}>
                {TYPE_ICONS[group.type] ?? <Wrench className="h-4 w-4" />}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                {group.status}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{group.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{group.barangay}</p>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <UsersRound className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-600">{group.members} members</span>
              <span className="ml-auto text-xs font-semibold text-slate-400">{group.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
