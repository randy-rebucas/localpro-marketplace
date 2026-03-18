"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { getMaintenanceLabel } from "@/lib/recommendations";

interface MaintenanceItem {
  category: string;
  lastJobDate: string;
  nextDueDate: string;
  overdue: boolean;
  daysUntilDue: number;
}

export default function MaintenanceReminder() {
  const t = useTranslations("maintenanceReminder");
  const [items, setItems] = useState<MaintenanceItem[]>([]);

  useEffect(() => {
    fetch("/api/recommendations/maintenance")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const visible = items.slice(0, 3);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">{t("heading")}</span>
      </div>
      <ul className="space-y-2">
        {visible.map((item) => (
          <li key={item.category} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.category}</p>
              <p className="text-xs text-slate-500">
                {t("recommended", { period: getMaintenanceLabel(item.category) ?? t("periodically") })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.overdue ? (
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  {t("overdue")}
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                  {t("dueIn", { n: item.daysUntilDue })}
                </span>
              )}
              <Link
                href={`/client/post-job?category=${encodeURIComponent(item.category)}`}
                className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
              >
                {t("book")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
