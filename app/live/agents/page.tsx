"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLive } from "../LiveContext";
import type { AgentTask, FileChangesResult } from "../LiveContext";

// ─── Progress steps ─────────────────────────────────────────────────────────

const STEPS = ["Spawned", "Coding", "PR", "CI", "Review", "Merged"] as const;

function stepIndex(status: AgentTask["status"]): number {
  switch (status) {
    case "pending":
      return 0;
    case "running":
      return 1;
    case "ready_for_review":
      return 2;
    case "ci_pending":
      return 3;
    case "ci_failed":
      return 3;
    case "done":
    case "completed":
      return 5;
    case "failed":
      return 1;
    default:
      return 0;
  }
}

// ─── Agent type color ───────────────────────────────────────────────────────

function agentBadge(agent: string): {
  bg: string;
  text: string;
  border: string;
} {
  const lower = agent.toLowerCase();
  if (lower.includes("opencode") || lower.includes("openclaw"))
    return {
      bg: "bg-cyan-400/10",
      text: "text-cyan-400",
      border: "border-cyan-400/20",
    };
  if (lower.includes("claude"))
    return {
      bg: "bg-purple-500/10",
      text: "text-purple-500",
      border: "border-purple-500/20",
    };
  if (lower.includes("codex"))
    return {
      bg: "bg-emerald-400/10",
      text: "text-emerald-400",
      border: "border-emerald-400/20",
    };
  return {
    bg: "bg-slate-800/50",
    text: "text-slate-400",
    border: "border-slate-700",
  };
}

// ─── Status badge ───────────────────────────────────────────────────────────

function statusBadge(status: AgentTask["status"]): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case "running":
      return {
        bg: "bg-cyan-400/10",
        text: "text-cyan-400",
        border: "border-cyan-400/20",
        label: "RUNNING",
      };
    case "ci_pending":
      return {
        bg: "bg-amber-400/10",
        text: "text-amber-400",
        border: "border-amber-400/20",
        label: "CI PENDING",
      };
    case "ci_failed":
      return {
        bg: "bg-red-400/10",
        text: "text-red-400",
        border: "border-red-400/20",
        label: "CI FAILED",
      };
    case "ready_for_review":
      return {
        bg: "bg-emerald-400/10",
        text: "text-emerald-400",
        border: "border-emerald-400/20",
        label: "REVIEW",
      };
    case "done":
    case "completed":
      return {
        bg: "bg-emerald-400/10",
        text: "text-emerald-400",
        border: "border-emerald-400/20",
        label: "DONE",
      };
    case "failed":
      return {
        bg: "bg-red-400/10",
        text: "text-red-400",
        border: "border-red-400/20",
        label: "FAILED",
      };
    case "pending":
      return {
        bg: "bg-amber-400/10",
        text: "text-amber-400",
        border: "border-amber-400/20",
        label: "PENDING",
      };
    default:
      return {
        bg: "bg-slate-800/50",
        text: "text-slate-400",
        border: "border-slate-700",
        label: String(status).toUpperCase(),
      };
  }
}

// ─── Elapsed time ───────────────────────────────────────────────────────────

function useElapsedTime(startedAt: string): string {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const tick = () => {
      const start = new Date(startedAt).getTime();
      const diff = Math.floor((Date.now() - start) / 1000);
      if (diff < 0) {
        setElapsed("--");
        return;
      }
      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600)
        setElapsed(`${Math.floor(diff / 60)}m ${diff % 60}s`);
      else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        setElapsed(`${h}h ${m}m`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return elapsed;
}

// ─── Mini Progress Stepper ──────────────────────────────────────────────────

function ProgressStepper({ status }: { status: AgentTask["status"] }) {
  const current = stepIndex(status);
  const isFailed = status === "failed" || status === "ci_failed";

  return (
    <div className="flex items-center gap-1 w-full mt-3">
      {STEPS.map((step, i) => {
        const isDone = i <= current;
        const isActive = i === current;

        let dotColor = "bg-slate-700";
        if (isDone && !isFailed) dotColor = "bg-emerald-400";
        if (isActive && isFailed) dotColor = "bg-red-400";
        if (isActive && !isFailed) dotColor = "bg-cyan-400";

        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${dotColor}`}
                animate={
                  isActive && !isFailed
                    ? { scale: [1, 1.3, 1] }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: isActive && !isFailed ? Infinity : 0,
                }}
              />
              <span className="text-[8px] font-mono text-slate-400 whitespace-nowrap">
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${isDone && i < current ? "bg-emerald-400/40" : "bg-slate-700"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Agent Log Viewer ───────────────────────────────────────────────────────

function AgentLogViewer({ taskId }: { taskId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchLog = async () => {
      try {
        const res = await fetch(
          `/api/agent-log?task=${encodeURIComponent(taskId)}`
        );
        const data = await res.json();
        if (mounted) {
          if (data.error) setError(data.error);
          setLines((data.lines || []).slice(-20));
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("Failed to fetch log");
          setLoading(false);
        }
      }
    };

    fetchLog();
    const interval = setInterval(fetchLog, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [taskId]);

  if (loading) {
    return (
      <div className="text-slate-400 text-xs font-mono py-2">
        Loading logs...
      </div>
    );
  }

  if (error && lines.length === 0) {
    return (
      <div className="text-slate-400 text-xs font-mono py-2">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed">
      {lines.length === 0 ? (
        <span className="text-slate-400">No log output yet.</span>
      ) : (
        lines.map((line, i) => (
          <div key={i} className="text-slate-300 whitespace-pre-wrap break-all">
            {line}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Agent Card ─────────────────────────────────────────────────────────────

function AgentCard({
  task,
  fileData,
}: {
  task: AgentTask;
  fileData: FileChangesResult | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const elapsed = useElapsedTime(task.startedAt);
  const agent = agentBadge(task.agent);
  const status = statusBadge(task.status);
  const isRunning = task.status === "running";

  const filesChanged = fileData?.files?.length ?? task.filesChanged ?? 0;
  const linesAdded = fileData?.totalAdditions ?? 0;
  const linesRemoved = fileData?.totalDeletions ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border bg-slate-900/50 p-5 transition-all ${
        isRunning
          ? "border-cyan-400/20"
          : task.status === "failed" || task.status === "ci_failed"
            ? "border-red-400/20"
            : "border-slate-700"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-mono font-semibold text-sm text-slate-200 truncate">
              {task.name || task.id}
            </h3>
            {/* Agent type badge */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${agent.bg} ${agent.text} ${agent.border}`}
            >
              {task.agent}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-slate-400 font-mono line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Status badge */}
        <span
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border shrink-0 ${status.bg} ${status.text} ${status.border}`}
        >
          {isRunning && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
          )}
          {status.label}
        </span>
      </div>

      {/* tmux status + branch row */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {/* tmux status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`relative flex h-2.5 w-2.5 rounded-full ${
              task.tmuxAlive ? "bg-emerald-400" : "bg-red-400"
            }`}
          >
            {task.tmuxAlive && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            )}
          </span>
          <span
            className={`text-[10px] font-mono font-bold ${
              task.tmuxAlive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {task.tmuxAlive ? "ALIVE" : "DEAD"}
          </span>
        </div>

        {/* Branch */}
        {task.branch && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700 text-slate-300">
            {task.branch}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-2">
        <div>
          <span className="text-slate-400">Files: </span>
          <span className="text-slate-200">{filesChanged}</span>
        </div>
        <div>
          <span className="text-slate-400">Lines: </span>
          <span className="text-emerald-400">+{linesAdded}</span>
          <span className="text-red-400"> -{linesRemoved}</span>
        </div>
        <div>
          <span className="text-slate-400">Time: </span>
          <span className="text-slate-200">{elapsed}</span>
        </div>
      </div>

      {/* Mini progress stepper */}
      <ProgressStepper status={task.status} />

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full mt-3 pt-2 border-t border-slate-700/30 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1"
      >
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </motion.svg>
        {expanded ? "Hide Logs" : "Show Logs"}
      </button>

      {/* Expanded log view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Agent Log (last 20 lines)
              </span>
              <div className="mt-2">
                <AgentLogViewer taskId={task.id} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LiveAgentsPage() {
  const { tasks, fileChanges } = useLive();

  // Map file changes by worktree path for each task
  const taskFileData = useMemo(() => {
    const map = new Map<string, FileChangesResult>();
    for (const task of tasks) {
      if (task.worktreePath && fileChanges[task.worktreePath]) {
        map.set(task.id, fileChanges[task.worktreePath]);
      }
    }
    return map;
  }, [tasks, fileChanges]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Agent Status Monitor
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} tracked
            {" | "}
            {tasks.filter((t) => t.status === "running").length} running
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>
      </motion.div>

      {/* ── Agent Cards Grid ─────────────────────────────────────────────── */}
      {tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900/50 border border-slate-700 rounded-xl p-12 text-center"
        >
          <div className="text-slate-300 font-mono text-sm mb-2">
            No active agents.
          </div>
          <div className="text-slate-400 font-mono text-xs">
            Spawn one to get started.
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {tasks.map((task) => (
              <AgentCard
                key={task.id}
                task={task}
                fileData={taskFileData.get(task.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
