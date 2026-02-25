"use client";

import { motion } from "framer-motion";
import { useLive } from "../LiveContext";

export default function AgentsPage() {
  const { sessions } = useLive();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Live Agent Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["main", "girlfriend", "xiaolongnv"] as const).map((agentName) => {
            const agentSessions = sessions.filter(
              (s) => s.agentId?.toLowerCase() === agentName
            );
            const isActive = agentSessions.some(
              (s) => (s.ageMs ?? 999999) < 300000
            );
            const lastActivity =
              agentSessions.length > 0
                ? agentSessions.reduce((latest, s) =>
                    (s.updatedAt ?? 0) > (latest.updatedAt ?? 0) ? s : latest
                  )
                : null;

            const borderColor =
              agentName === "main"
                ? "border-cyan-500/30"
                : agentName === "girlfriend"
                ? "border-pink-500/30"
                : "border-purple-500/30";

            const nameColor =
              agentName === "main"
                ? "text-cyan-400"
                : agentName === "girlfriend"
                ? "text-pink-400"
                : "text-purple-400";

            const glowColor =
              agentName === "main"
                ? "shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                : agentName === "girlfriend"
                ? "shadow-[0_0_15px_rgba(244,114,182,0.15)]"
                : "shadow-[0_0_15px_rgba(192,132,252,0.15)]";

            const dotColor =
              agentName === "main"
                ? "bg-cyan-400"
                : agentName === "girlfriend"
                ? "bg-pink-400"
                : "bg-purple-400";

            return (
              <motion.div
                key={agentName}
                className={`bg-slate-900/40 border ${borderColor} rounded-lg p-4 ${
                  isActive ? glowColor : ""
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="relative flex h-2 w-2">
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
                        />
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}
                        />
                      </span>
                    )}
                    <span
                      className={`font-mono font-semibold text-sm ${nameColor}`}
                    >
                      {agentName}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isActive
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                    }`}
                  >
                    {isActive ? "ACTIVE" : "IDLE"}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sessions</span>
                    <span className="text-slate-300">
                      {agentSessions.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Channel</span>
                    <span className="text-slate-400 truncate max-w-[120px]">
                      {agentSessions[0]?.channel ?? "\u2014"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Activity</span>
                    <span className="text-slate-400">
                      {lastActivity?.updatedAt
                        ? new Date(lastActivity.updatedAt).toLocaleTimeString()
                        : "\u2014"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Age</span>
                    <span className="text-slate-400">
                      {agentSessions[0]?.age ?? "\u2014"}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
