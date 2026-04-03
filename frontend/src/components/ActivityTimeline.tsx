"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Activity {
  action: string;
  agent_name?: string;
  skill?: string;
  reasoning?: string;
  timestamp?: string;
  cycle?: number;
}

export default function ActivityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <div className="glass-card p-5 max-h-[400px] overflow-y-auto">
      <h3 className="text-lg font-semibold text-white mb-4">Agent Activity</h3>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            activities.slice(-15).reverse().map((a, i) => (
              <motion.div
                key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                    a.action === "error" ? "bg-red-400" :
                    a.action === "tool_call" ? "bg-primary-400" :
                    a.action === "cycle_complete" ? "bg-emerald-400" :
                    "bg-slate-500"
                  }`} />
                  {i < activities.length - 1 && (
                    <div className="w-px flex-1 bg-white/5 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {a.action === "tool_call" ? `Called ${a.skill}` :
                       a.action === "cycle_complete" ? `Cycle ${a.cycle} complete` :
                       a.action === "error" ? "Error" : a.action}
                    </span>
                    {a.agent_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400">
                        {a.agent_name}
                      </span>
                    )}
                  </div>
                  {a.reasoning && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.reasoning}</p>
                  )}
                  {a.timestamp && (
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
