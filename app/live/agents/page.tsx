"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useLive } from "../LiveContext";
import type { AgentTask, FileChangesResult } from "../LiveContext";
import { AgentGridSkeleton, useMinimumLoading } from "../components/LoadingSkeleton";

// ─── Progress steps ─────────────────────────────────────────────────────────

const STEPS = ["Spawned", "Coding", "PR", "CI", "Review", "Merged"] as const;

function stepIndex(status: AgentTask["status"]): number {
  switch (status) {
    case "pending":
      return 0;
    case "running":
      return 1;
    case "ready_for_review":
      return 4; // Review stage
    case "ci_pending":
      return 3;
    case "ci_failed":
      return 3;
    case "done":
    case "completed":
      return 5; // All stages complete
    case "failed":
      return 1; // Failed during coding
    case "dead":
      return 0; // Cancelled — only spawned
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

/**
 * Derive a display status from the raw task data.
 * The API already maps dead+commits → "completed" and dead+no commits → "dead".
 * Here we translate that to user-friendly labels:
 *  - running                → RUNNING (cyan)
 *  - done / completed       → COMPLETED (green)
 *  - dead (no commits)      → CANCELLED (gray)
 *  - failed                 → FAILED (red)
 */
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
        label: "COMPLETED",
      };
    case "dead":
      // dead = tmux session gone with no commits → agent was cancelled/crashed
      return {
        bg: "bg-slate-600/10",
        text: "text-slate-400",
        border: "border-slate-600/20",
        label: "CANCELLED",
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
  const isCancelled = status === "dead";
  const isComplete = status === "done" || status === "completed";

  return (
    <div className="flex items-center gap-1 w-full mt-3">
      {STEPS.map((step, i) => {
        const isDone = i <= current;
        const isActive = i === current;

        let dotColor = "bg-slate-700";
        if (isComplete && isDone) dotColor = "bg-emerald-400";
        else if (isCancelled && i === 0) dotColor = "bg-slate-500";
        else if (isCancelled) dotColor = "bg-slate-700";
        else if (isDone && !isFailed) dotColor = "bg-emerald-400";
        else if (isActive && isFailed) dotColor = "bg-red-400";
        else if (isActive && !isFailed) dotColor = "bg-cyan-400";

        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${dotColor}`}
                animate={
                  isActive && !isFailed && !isCancelled && !isComplete
                    ? { scale: [1, 1.3, 1] }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: isActive && !isFailed && !isCancelled && !isComplete ? Infinity : 0,
                }}
              />
              <span className="text-[8px] font-mono text-slate-400 whitespace-nowrap">
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  isComplete && i < current
                    ? "bg-emerald-400/40"
                    : isDone && i < current && !isCancelled
                      ? "bg-emerald-400/40"
                      : "bg-slate-700"
                }`}
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

// ─── Icon Button with Tooltip ───────────────────────────────────────────────

function IconButton({
  label,
  onClick,
  href,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const className = `relative group flex items-center justify-center w-7 h-7 rounded-md border text-[11px] font-mono transition-all ${
    disabled
      ? "border-slate-700/50 text-slate-600 cursor-not-allowed opacity-50"
      : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
  }`;

  const tooltip = (
    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      {label}
    </span>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {tooltip}
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={className} aria-label={label}>
      {tooltip}
      {children}
    </button>
  );
}

// ─── SVG Icons (inline, small) ──────────────────────────────────────────────

function LogsIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h12" />
    </svg>
  );
}

function DiffIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
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

  const filesChanged = fileData?.files?.length ?? task.liveFileCount ?? task.filesChanged ?? 0;
  const linesAdded = fileData?.totalAdditions ?? task.liveAdditions ?? 0;
  const linesRemoved = fileData?.totalDeletions ?? task.liveDeletions ?? 0;

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
        {/* tmux status — contextualize based on task outcome */}
        <div className="flex items-center gap-1.5">
          {task.tmuxAlive ? (
            <>
              <span className="relative flex h-2.5 w-2.5 rounded-full bg-emerald-400">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                ALIVE
              </span>
            </>
          ) : task.status === "done" || task.status === "completed" ? (
            <>
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
              <span className="text-[10px] font-mono font-bold text-emerald-400/60">
                EXITED
              </span>
            </>
          ) : (
            <>
              <span className="flex h-2.5 w-2.5 rounded-full bg-slate-500" />
              <span className="text-[10px] font-mono font-bold text-slate-500">
                EXITED
              </span>
            </>
          )}
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

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/30">
        <IconButton label="View Logs" onClick={() => setExpanded((p) => !p)}>
          <LogsIcon />
        </IconButton>
        <IconButton
          label="View Diff"
          href={task.branch ? `/live/git?branch=${encodeURIComponent(task.branch)}` : "/live/git"}
        >
          <DiffIcon />
        </IconButton>
        <IconButton
          label="Retry Task"
          disabled={task.status !== "failed" && task.status !== "dead" && task.status !== "ci_failed"}
          onClick={() => {
            // POST to retry endpoint — fire and forget
            fetch("/api/agent-tasks/retry", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskId: task.id }),
            }).catch(() => {});
          }}
        >
          <RetryIcon />
        </IconButton>

        {/* Spacer + expand hint */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="ml-auto text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
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
          {expanded ? "Hide" : "Logs"}
        </button>
      </div>

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
  const { tasks, fileChanges, initialLoading } = useLive();
  const dataReady = useMinimumLoading(!initialLoading);

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

  if (!dataReady) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded-lg bg-slate-800/60 animate-pulse" />
            <div className="h-4 w-40 rounded bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-7 w-16 rounded-lg bg-slate-800/60 animate-pulse" />
        </div>
        <AgentGridSkeleton count={3} />
      </div>
    );
  }

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
            {tasks.filter((t) => t.status === "running" || t.status === "pending").length} active agent{tasks.filter((t) => t.status === "running" || t.status === "pending").length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>
      </motion.div>

      {/* ── Agent Cards Grid ─────────────────────────────────────────────── */}
      {tasks.filter((t) => t.status === "running" || t.status === "pending").length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative bg-slate-900/50 border border-slate-700 rounded-xl p-16 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          {/* Subtle animated background */}
          <motion.div
            animate={{ opacity: [0.02, 0.06, 0.02] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-400/10 pointer-events-none"
          />

          {/* Animated robot icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="relative mb-6"
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/15 to-cyan-400/15 border border-purple-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m3.75-1.5v1.5m-7.5 15V21M12 19.5V21m3.75-1.5V21m-9-16.5h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25v-7.5A2.25 2.25 0 0 1 6.75 4.5ZM9 10.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </div>
            </motion.div>
            {/* Pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-2xl border border-purple-500/20"
            />
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-semibold text-slate-200 mb-2"
          >
            No agents running
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm font-mono text-slate-400 max-w-xs"
          >
            Start a task to see agents appear here
          </motion.p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {tasks.filter((t) => t.status === "running" || t.status === "pending").map((task) => (
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
