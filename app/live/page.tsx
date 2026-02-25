"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLive } from "./LiveContext";
import type { AgentTask } from "./LiveContext";

function StatusPill({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="text-slate-500">{label}:</span>
      <span className={ok ? "text-green-400" : "text-red-400"}>{value}</span>
    </div>
  );
}

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

const navCards = [
  {
    href: "/live/tasks",
    title: "Task Queue",
    desc: "Active and completed agent tasks",
    borderClass: "border-cyan-500/20 hover:border-cyan-500/40",
    textClass: "text-cyan-400",
  },
  {
    href: "/live/agent",
    title: "Agent Process",
    desc: "Live coding agent output and todos",
    borderClass: "border-purple-500/20 hover:border-purple-500/40",
    textClass: "text-purple-400",
  },
  {
    href: "/live/git",
    title: "Git Activity",
    desc: "Watch directories and track commits",
    borderClass: "border-pink-500/20 hover:border-pink-500/40",
    textClass: "text-pink-400",
  },
  {
    href: "/live/prompt",
    title: "Prompt Architecture",
    desc: "Prompts sent to coding agents",
    borderClass: "border-green-500/20 hover:border-green-500/40",
    textClass: "text-green-400",
  },
];

export default function LiveOverviewPage() {
  const { connected, tasks, sseEventsCount, uptime, eventLog, logEndRef } =
    useLive();

  const running = tasks.filter((t) => t.status === "running");
  const completed = tasks.filter((t) => t.status === "completed");
  const failed = tasks.filter((t) => t.status === "failed");
  const totalFiles = tasks.reduce((sum, t) => sum + (t.filesChanged ?? 0), 0);
  const totalCommits = tasks.filter((t) => t.commit).length;
  const currentTask = running[0] ?? null;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4 bg-slate-900/60 border border-slate-800/50 rounded-lg px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              connected
                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            }`}
          />
          <span className="text-xs font-mono text-slate-400">
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <StatusPill
          label="Running"
          value={String(running.length)}
          ok={running.length > 0}
        />
        <StatusPill
          label="Completed"
          value={String(completed.length)}
          ok={completed.length > 0}
        />
        <StatusPill
          label="Failed"
          value={String(failed.length)}
          ok={failed.length === 0}
        />
        <StatusPill
          label="Uptime"
          value={uptime}
          ok={true}
        />
      </motion.div>

      {/* ── Task Stats ──────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-mono text-cyan-400 flex items-center gap-2">
            <span className="text-cyan-400/50">&gt;</span> Agent Monitor
          </h2>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            TASK CONTROL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            className="bg-slate-900/40 border border-cyan-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              TOTAL TASKS
            </div>
            <motion.div
              key={tasks.length}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-cyan-400"
            >
              {tasks.length}
            </motion.div>
          </motion.div>

          <motion.div
            className="bg-slate-900/40 border border-green-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              COMMITS
            </div>
            <motion.div
              key={totalCommits}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-green-400"
            >
              {totalCommits}
            </motion.div>
          </motion.div>

          <motion.div
            className="bg-slate-900/40 border border-purple-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              FILES CHANGED
            </div>
            <motion.div
              key={totalFiles}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-purple-400"
            >
              {totalFiles}
            </motion.div>
          </motion.div>

          <motion.div
            className="bg-slate-900/40 border border-amber-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              SSE EVENTS
            </div>
            <motion.div
              key={sseEventsCount}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-amber-400"
            >
              {sseEventsCount}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Current Task ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Current Task
        </h2>
        {currentTask ? (
          <motion.div
            className="bg-slate-900/40 border border-purple-500/20 rounded-lg p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-semibold text-sm text-purple-400">
                {currentTask.name}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                </span>
                RUNNING
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <span className="text-slate-500">Agent: </span>
                <span className="text-slate-300">{currentTask.agent}</span>
              </div>
              <div>
                <span className="text-slate-500">Duration: </span>
                <span className="text-slate-300">{formatDuration(currentTask)}</span>
              </div>
              <div>
                <span className="text-slate-500">Prompt: </span>
                <span className="text-slate-300">{currentTask.promptFile ?? "\u2014"}</span>
              </div>
              <div>
                <span className="text-slate-500">ID: </span>
                <span className="text-slate-300">{currentTask.id}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 text-center text-slate-500 text-xs font-mono">
            No active task. Agent idle.
          </div>
        )}
      </motion.section>

      {/* ── Event Log ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2">
          <span className="text-green-400/50">&gt;</span> Event Log
        </h2>
        <div className="bg-slate-950/60 border border-slate-800/50 rounded-lg p-3 h-64 overflow-y-auto font-mono text-[11px] scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {eventLog.length === 0 && (
            <p className="text-slate-600">Waiting for events...</p>
          )}
          <AnimatePresence>
            {eventLog.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 py-0.5"
              >
                <span className="text-slate-600 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`shrink-0 w-16 ${
                    entry.type === "error" || entry.type === "git-error"
                      ? "text-red-400"
                      : entry.type === "system"
                      ? "text-amber-400"
                      : entry.type === "agent"
                      ? "text-cyan-400"
                      : entry.type === "git"
                      ? "text-purple-400"
                      : "text-slate-500"
                  }`}
                >
                  [{entry.type}]
                </span>
                <span className="text-slate-300">{entry.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logEndRef} />
        </div>
      </motion.section>

      {/* ── Navigation Cards ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-mono text-slate-400 mb-3 flex items-center gap-2">
          <span className="text-slate-500">&gt;</span> Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {navCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <motion.div
                className={`bg-slate-900/40 border ${card.borderClass} rounded-lg p-4 transition-all cursor-pointer`}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <h3
                  className={`text-sm font-mono font-semibold ${card.textClass} mb-1`}
                >
                  {card.title}
                </h3>
                <p className="text-xs font-mono text-slate-500">{card.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
