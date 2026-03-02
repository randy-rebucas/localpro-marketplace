"use client";

import { useState } from "react";
import { CheckSquare, Square, ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";

const CHECKLIST_ITEMS = [
  { id: "scope",    label: "Scope of work is clearly agreed upon" },
  { id: "timeline", label: "Timeline & completion date confirmed" },
  { id: "price",    label: "Total price and payment terms agreed" },
  { id: "access",   label: "Site/access requirements discussed" },
  { id: "materials",label: "Materials & tools responsibility clarified" },
  { id: "contact",  label: "Emergency contact info exchanged" },
];

interface Props {
  /** The current user's role — determines copy */
  role: "client" | "provider";
  /** Called when all items are checked and user clicks "Start Work" */
  onComplete?: () => void;
}

export default function ChatChecklist({ role, onComplete }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allDone = checked.size === CHECKLIST_ITEMS.length;
  const donePct = Math.round((checked.size / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden text-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-100/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="font-semibold text-amber-800 text-sm">
            Pre-Job Checklist
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            allDone
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-200 text-amber-700"
          }`}>
            {checked.size}/{CHECKLIST_ITEMS.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-amber-600">
          <div className="hidden sm:block w-20 h-1.5 rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${donePct}%` }}
            />
          </div>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </button>

      {/* Checklist items */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <p className="text-xs text-amber-700 mb-3">
            {role === "client"
              ? "Confirm these items with your provider before work begins."
              : "Review these items with your client before starting work."}
          </p>
          <ul className="space-y-2">
            {CHECKLIST_ITEMS.map((item) => {
              const isChecked = checked.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`w-full flex items-center gap-2.5 text-left rounded-lg px-3 py-2 transition-colors ${
                      isChecked
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-white border border-amber-200 hover:border-amber-400"
                    }`}
                  >
                    {isChecked
                      ? <CheckSquare className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      : <Square className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                    <span className={`text-xs ${isChecked ? "text-emerald-800 line-through" : "text-slate-700"}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {allDone && onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="mt-3 w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              ✓ All confirmed — ready to start work
            </button>
          )}
        </div>
      )}
    </div>
  );
}
