"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  data: { status: string; count: number }[];
}

// Colour per job-status bucket
const STATUS_COLORS: Record<string, string> = {
  open:               "#3b82f6",
  assigned:           "#8b5cf6",
  "in progress":      "#f59e0b",
  completed:          "#22c55e",
  disputed:           "#ef4444",
  "pending validation": "#f97316",
  refunded:           "#64748b",
  rejected:           "#94a3b8",
  expired:            "#cbd5e1",
  cancelled:          "#cbd5e1",
};

const DEFAULT_COLOR = "#1d4ed8";

export default function AdminJobsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
          cursor={{ fill: "#f1f5f9" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? DEFAULT_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
