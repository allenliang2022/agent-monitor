"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLive } from "../LiveContext";
import type { AgentTask } from "../LiveContext";

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; border: string; dot?: string }> = {
    running: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/20",
      dot: "bg-cyan-400",
    },
    completed: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "border-green-500/20",
    },
    done: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      border: "border-green-500/20",
    },
    failed: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20",
    },
    dead: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/20",
    },
    pending: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20",
    },
  };
  const c = map[status] ?? {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${c.bg} ${c.text} ${c.border}`}
    >
      {c.dot && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dot} opacity-75`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${c.dot}`} />
        </span>
      )}
      {status.toUpperCase()}
    </span>
  );
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

function cardBorderColor(status: string): string {
  switch (status) {
    case "running":
      return "border-cyan-500/20 shadow-[0_0_20px_rgba(0,212,255,0.06)]";
    case "completed":
    case "done":
      return "border-green-500/15";
    case "failed":
      return "border-red-500/20";
    case "dead":
      return "border-orange-500/20";
    case "pending":
      return "border-amber-500/15";
    default:
      return "border-slate-800/50";
  }
}

// ─── Task Card ──────────────────────────────────────────────────────────────

function TaskCard({ task, index }: { task: AgentTask; index: number }) {
  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.005, y: -1 }}
      className={`bg-slate-900/50 border ${cardBorderColor(task.status)} rounded-xl p-5 backdrop-blur-sm transition-shadow`}
    >
      {/* Header: Name + Status Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-mono font-semibold text-sm text-slate-200 truncate">
            {task.name}
          </h3>
          {(task.description || task.summary) && (
            <p className="text-xs font-mono text-slate-500 mt-0.5 line-clamp-2">
              {task.description ?? task.summary}
            </p>
          )}
        </div>
        <div className="ml-3 shrink-0">{statusBadge(task.status)}</div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs font-mono">
        <div>
          <span className="text-slate-600 text-[10px] block">ID</span>
          <span className="text-slate-400">{task.id}</span>
        </div>
        <div>
          <span className="text-slate-600 text-[10px] block">AGENT</span>
          <span className="text-cyan-400">{task.agent}</span>
        </div>
        <div>
          <span className="text-slate-600 text-[10px] block">DURATION</span>
          <span className="text-slate-400">{formatDuration(task)}</span>
        </div>
        <div>
          <span className="text-slate-600 text-[10px] block">STARTED</span>
          <span className="text-slate-400">{formatTime(task.startedAt)}</span>
        </div>
      </div>

      {/* Bottom row: branch, commit, files */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-800/30">
        {task.branch && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <span className="text-purple-400/50">~</span> {task.branch}
          </span>
        )}
        {task.commit && (
          <span className="text-[10px] font-mono text-amber-400">
            @ {task.commit}
          </span>
        )}
        {task.filesChanged !== undefined && task.filesChanged > 0 && (
          <span className="text-[10px] font-mono text-slate-500">
            {task.filesChanged} files changed
          </span>
        )}
        {task.model && (
          <span className="text-[10px] font-mono text-slate-600">
            {task.model}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { tasks } = useLive();

  const running = tasks.filter((t) => t.status === "running");
  const pending = tasks.filter((t) => t.status === "pending");
  const history = tasks.filter(
    (t) => t.status === "completed" || t.status === "failed" || t.status === "done" || t.status === "dead" || t.status === "unknown"
  );

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* ── Summary Bar ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4 text-xs font-mono"
      >
        <span className="text-slate-500">
          Total: <span className="text-slate-300">{tasks.length}</span>
        </span>
        <span className="text-slate-500">
          Running:{" "}
          <span className="text-cyan-400">{running.length}</span>
        </span>
        <span className="text-slate-500">
          Pending:{" "}
          <span className="text-amber-400">{pending.length}</span>
        </span>
        <span className="text-slate-500">
          Completed:{" "}
          <span className="text-green-400">
            {history.filter((t) => t.status === "completed").length}
          </span>
        </span>
        <span className="text-slate-500">
          Failed:{" "}
          <span className="text-red-400">
            {history.filter((t) => t.status === "failed").length}
          </span>
        </span>
        <span className="ml-auto text-slate-600">auto-refresh 5s</span>
      </motion.div>

      {/* ── Running Tasks ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> Running
          {running.length > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              {running.length}
            </span>
          )}
        </h2>

        {running.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No active tasks. Agent idle.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {running.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>

      {/* ── Pending Tasks ────────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-sm font-mono text-amber-400 mb-3 flex items-center gap-2">
            <span className="text-amber-400/50">&gt;</span> Pending
            <span className="text-[10px] font-mono text-slate-600">
              ({pending.length})
            </span>
          </h2>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pending.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </motion.section>
      )}

      {/* ── Task History ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2">
          <span className="text-green-400/50">&gt;</span> Completed
          <span className="text-[10px] font-mono text-slate-600">
            ({history.length})
          </span>
        </h2>

        {history.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No completed tasks yet.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {history.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>
    </div>
  );
}
