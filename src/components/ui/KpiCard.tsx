import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-card p-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                trend.value >= 0 ? "text-green-600" : "text-red-500"
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              <span className="text-slate-400 font-normal">{trend.label}</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 p-3 bg-primary/10 rounded-xl text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}
