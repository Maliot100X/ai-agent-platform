"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData {
  time: string;
  pnl: number;
  signals: number;
}

// Demo data for display
const demoData: ChartData[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  pnl: Math.sin(i / 4) * 500 + Math.random() * 200 + 1000,
  signals: Math.floor(Math.random() * 5),
}));

export default function PerformanceChart({ data }: { data?: ChartData[] }) {
  const chartData = data || demoData;

  return (
    <div className="glass-card p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Strategy Performance</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#f1f5f9",
              }}
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="#0ea5e9"
              fill="url(#pnlGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
