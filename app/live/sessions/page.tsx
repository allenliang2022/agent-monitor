"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLive, getAgentColor } from "../LiveContext";

export default function SessionsPage() {
  const {
    sessions,
    expandedSession,
    setExpandedSession,
    timelineEvents,
  } = useLive();

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ── Active Sessions ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> Active Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No active sessions detected. Waiting for data...
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800/50 text-slate-500">
                    <th className="text-left px-4 py-2">Session</th>
                    <th className="text-left px-4 py-2">Agent</th>
                    <th className="text-left px-4 py-2">Channel</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Age</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sessions.map((s, i) => {
                      const key = s.key ?? `s-${i}`;
                      const isExpanded = expandedSession === key;
                      return (
                        <motion.tr
                          key={key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() =>
                            setExpandedSession(isExpanded ? null : key)
                          }
                          className={`border-b border-slate-800/30 cursor-pointer hover:bg-slate-800/30 transition-colors ${getAgentColor(
                            s.agentId ?? ""
                          )}`}
                        >
                          <td className="px-4 py-2 truncate max-w-[250px]">
                            {key.replace(/^agent:\w+:/, "")}
                          </td>
                          <td className="px-4 py-2 font-semibold">
                            {s.agentId ?? "?"}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.channel ?? "?"}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.chatType ?? "?"}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.age ?? "?"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] border ${
                                (s.ageMs ?? 999999) < 300000
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}
                            >
                              {(s.ageMs ?? 999999) < 300000 ? "active" : "idle"}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.section>

      {/* ── Live Timeline ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> Live Timeline
        </h2>
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 max-h-80 overflow-y-auto">
          {timelineEvents.length === 0 ? (
            <p className="text-slate-600 text-xs font-mono text-center py-4">
              No timeline events yet. Waiting for session changes...
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700/50" />
              <AnimatePresence>
                {timelineEvents.map((evt) => {
                  const dotColor =
                    evt.type === "session_start"
                      ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                      : evt.type === "session_end"
                      ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
                      : evt.type === "git_change"
                      ? "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]"
                      : "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]";

                  const actorColor =
                    evt.actor === "main"
                      ? "text-cyan-400"
                      : evt.actor === "girlfriend"
                      ? "text-pink-400"
                      : evt.actor === "xiaolongnv"
                      ? "text-purple-400"
                      : "text-slate-400";

                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="relative flex items-start gap-3 pl-7 pb-3"
                    >
                      <div
                        className={`absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full ${dotColor}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-600">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              evt.type === "session_start"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : evt.type === "session_end"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : evt.type === "git_change"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                            }`}
                          >
                            {evt.type.replace("_", " ")}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-semibold ${actorColor}`}
                          >
                            {evt.actor}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                          {evt.detail}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
