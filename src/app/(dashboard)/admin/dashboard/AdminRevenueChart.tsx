"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  label: string;
  gmv: number;
  commission: number;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(v: number) {
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `₱${(v / 1_000).toFixed(0)}k`;
  return `₱${v}`;
}

export default function AdminRevenueChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
        No revenue data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="comGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={46} />
        <Tooltip
          formatter={(v: number, name: string) => [formatCurrency(v), name === "gmv" ? "GMV" : "Commission"]}
          contentStyle={{ background: "#1e293b", border: "none", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
          cursor={{ stroke: "#e2e8f0" }}
        />
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span className="text-xs text-slate-500">{v === "gmv" ? "GMV" : "Commission"}</span>}
        />
        <Area type="monotone" dataKey="gmv"        stroke="#1d4ed8" strokeWidth={2} fill="url(#gmvGrad)" dot={false} />
        <Area type="monotone" dataKey="commission"  stroke="#16a34a" strokeWidth={2} fill="url(#comGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
