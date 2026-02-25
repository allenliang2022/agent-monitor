"use client";

import { motion } from "framer-motion";
import { useLive } from "../LiveContext";

export default function AgentPage() {
  const { tasks } = useLive();

  const currentTask = tasks.find((t) => t.status === "running") ?? null;
  const recentCompleted = tasks
    .filter((t) => t.status === "completed")
    .slice(-3)
    .reverse();

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ── Agent Process ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Agent Process
        </h2>

        <motion.div
          className={`bg-slate-900/40 border rounded-lg p-4 ${
            currentTask
              ? "border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.08)]"
              : "border-slate-800/50"
          }`}
          whileHover={{ scale: 1.005 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {currentTask && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                </span>
              )}
              <span className="font-mono font-semibold text-sm text-cyan-400">
                opencode
              </span>
              <span className="text-[10px] font-mono text-slate-600">
                (coding agent)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                currentTask
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-slate-500/10 text-slate-500 border-slate-500/20"
              }`}
            >
              {currentTask ? "ACTIVE" : "IDLE"}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Task</span>
              <span className="text-slate-300">
                {currentTask?.name ?? "\u2014"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Model</span>
              <span className="text-slate-300">
                {currentTask?.model ?? "claude-opus-4.6"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Prompt File</span>
              <span className="text-slate-300">
                {currentTask?.promptFile ?? "\u2014"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tasks Completed</span>
              <span className="text-green-400">
                {tasks.filter((t) => t.status === "completed").length}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Live Output (placeholder) ────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> Live Output
        </h2>
        <div className="bg-slate-950/60 border border-slate-800/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-[11px]">
          {currentTask ? (
            <div className="space-y-1">
              <div className="text-slate-600">
                $ opencode --task {currentTask.id} --prompt {currentTask.promptFile}
              </div>
              <div className="text-cyan-400/60">
                [agent] Starting task: {currentTask.name}
              </div>
              <div className="text-slate-500">
                [agent] Reading prompt file...
              </div>
              <div className="text-slate-500">
                [agent] Analyzing codebase...
              </div>
              <div className="text-green-400/60 mt-2">
                {"\u2588"} <span className="animate-pulse">waiting for live output stream...</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600">
              No active agent process. Output will appear here when a task is running.
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Todo Tracker ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-sm font-mono text-amber-400 mb-3 flex items-center gap-2">
          <span className="text-amber-400/50">&gt;</span> Todo Tracker
        </h2>
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4">
          {currentTask ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="text-slate-500 text-[10px] mb-2">
                Parsed from agent output (auto-updates when available)
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-slate-600">{"\u25A1"}</span>
                Waiting for agent todo output...
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-600 text-xs font-mono py-4">
              No active task. Todos will appear when agent reports progress.
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Recent Completed ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2">
          <span className="text-green-400/50">&gt;</span> Recent Completed
        </h2>
        {recentCompleted.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 text-center text-slate-600 text-xs font-mono">
            No completed tasks yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentCompleted.map((task) => (
              <motion.div
                key={task.id}
                className="bg-slate-900/40 border border-green-500/10 rounded-lg p-3"
                whileHover={{ scale: 1.005 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-green-400">
                    {task.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-green-500/10 text-green-400 border-green-500/20">
                    {task.status}
                  </span>
                </div>
                <div className="flex gap-4 text-[10px] font-mono text-slate-500">
                  {task.commit && (
                    <span>
                      commit: <span className="text-amber-400">{task.commit}</span>
                    </span>
                  )}
                  {task.filesChanged !== undefined && (
                    <span>files: {task.filesChanged}</span>
                  )}
                  {task.summary && (
                    <span className="truncate max-w-[300px]">{task.summary}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
