"use client";

import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: string;
  color?: "blue" | "purple" | "green" | "red" | "yellow";
}

const colorMap = {
  blue: "from-primary-500/20 to-primary-600/5 border-primary-500/20",
  purple: "from-accent-500/20 to-accent-600/5 border-accent-500/20",
  green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  red: "from-red-500/20 to-red-600/5 border-red-500/20",
  yellow: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/20",
};

export default function StatCard({ title, value, subtitle, trend, color = "blue" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5`}
    >
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        {trend && (
          <span className={`text-sm mb-1 ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400"}`}>
            {trend === "up" ? "+" : trend === "down" ? "-" : "~"}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}
