"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLive } from "../LiveContext";
import type { AgentTask } from "../LiveContext";

function statusColor(status: string) {
  switch (status) {
    case "running":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "completed":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "failed":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

function formatDuration(task: AgentTask): string {
  const start = new Date(task.startedAt).getTime();
  const end = task.completedAt
    ? new Date(task.completedAt).getTime()
    : Date.now();
  const mins = Math.floor((end - start) / 60000);
  if (mins < 1) return "<1m";
  return `${mins}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

export default function TasksPage() {
  const { tasks } = useLive();

  const running = tasks.filter((t) => t.status === "running");
  const history = tasks.filter((t) => t.status !== "running");

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ── Active Tasks ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> Active Tasks
          {running.length > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              {running.length} RUNNING
            </span>
          )}
        </h2>

        {running.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No active tasks. Agent idle.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {running.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-slate-900/40 border border-cyan-500/20 rounded-lg p-4 shadow-[0_0_15px_rgba(34,211,238,0.08)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-semibold text-sm text-cyan-400">
                      {task.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusColor(task.status)}`}
                    >
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-500">ID: </span>
                      <span className="text-slate-300">{task.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Agent: </span>
                      <span className="text-slate-300">{task.agent}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Duration: </span>
                      <span className="text-slate-300">{formatDuration(task)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Prompt: </span>
                      <span className="text-slate-300">{task.promptFile ?? "\u2014"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Started: </span>
                      <span className="text-slate-300">{formatTime(task.startedAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>

      {/* ── Task History ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2">
          <span className="text-green-400/50">&gt;</span> Task History
        </h2>

        {history.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No completed tasks yet.
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800/50 text-slate-500">
                    <th className="text-left px-4 py-2">Task</th>
                    <th className="text-left px-4 py-2">Agent</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Duration</th>
                    <th className="text-left px-4 py-2">Commit</th>
                    <th className="text-left px-4 py-2">Files</th>
                    <th className="text-left px-4 py-2">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {history.map((task, i) => (
                      <motion.tr
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="px-4 py-2">
                          <div className="text-slate-300">{task.name}</div>
                          <div className="text-[10px] text-slate-600">{task.id}</div>
                        </td>
                        <td className="px-4 py-2 text-cyan-400">{task.agent}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] border ${statusColor(task.status)}`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-400">
                          {formatDuration(task)}
                        </td>
                        <td className="px-4 py-2">
                          {task.commit ? (
                            <span className="text-amber-400">{task.commit}</span>
                          ) : (
                            <span className="text-slate-600">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-400">
                          {task.filesChanged ?? "\u2014"}
                        </td>
                        <td className="px-4 py-2 text-slate-500 truncate max-w-[250px]">
                          {task.summary ?? "\u2014"}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}
