"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface MonthlyPoint {
  month: string;
  gmv: number;
  commission: number;
  jobs: number;
}

export function RevenueLineChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
          tickFormatter={(v: number) => `₱${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
          formatter={(v: number) => `₱${v.toLocaleString()}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="gmv" stroke="#1d4ed8" strokeWidth={2} dot={false} name="GMV" />
        <Line type="monotone" dataKey="commission" stroke="#22c55e" strokeWidth={2} dot={false} name="Commission" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function JobsBarChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
          cursor={{ fill: "#f1f5f9" }}
        />
        <Bar dataKey="jobs" fill="#6366f1" radius={[4, 4, 0, 0]} name="Completed Jobs" />
      </BarChart>
    </ResponsiveContainer>
  );
}
