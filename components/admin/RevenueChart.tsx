"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14a6a3" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#14a6a3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f2" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6a80a8" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#6a80a8" }} tickLine={false} axisLine={false} width={50}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
          <Tooltip
            formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f2", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#0d8585" strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarBreakdown({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-navy-600">{d.label}</span>
            <span className="font-medium text-navy-900">₹{d.value.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-navy-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
