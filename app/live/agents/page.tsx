"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLive } from "../LiveContext";
import type { AgentTask, FileChangesResult } from "../LiveContext";
import { AgentGridSkeleton, useMinimumLoading } from "../components/LoadingSkeleton";

// ─── Elapsed time hook ──────────────────────────────────────────────────────

function useElapsedTime(startedAt: string): string {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const tick = () => {
      const start = new Date(startedAt).getTime();
      const diff = Math.floor((Date.now() - start) / 1000);
      if (diff < 0) { setElapsed("--"); return; }
      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}m ${diff % 60}s`);
      else { const h = Math.floor(diff / 3600); const m = Math.floor((diff % 3600) / 60); setElapsed(`${h}h ${m}m`); }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return elapsed;
}

// ─── Agent log hook ─────────────────────────────────────────────────────────

function useAgentLog(taskId: string | null) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLog = useCallback(async () => {
    if (!taskId) { setLines([]); setLoading(false); return; }
    try {
      const res = await fetch(`/api/agent-log?task=${encodeURIComponent(taskId)}`);
      const data = await res.json();
      if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
        setLines(data.lines);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [taskId]);

  useEffect(() => { setLoading(true); setLines([]); }, [taskId]);
  useEffect(() => {
    fetchLog();
    const interval = setInterval(fetchLog, 3000);
    return () => clearInterval(interval);
  }, [fetchLog]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  return { lines, loading, scrollRef };
}

// ─── Terminal line ──────────────────────────────────────────────────────────

function TerminalLine({ text }: { text: string }) {
  const clean = text.replace(/\x1b\[[\d;]*[A-Za-z]/g, "");
  let c = "text-slate-400";
  if (clean.startsWith("#") || clean.toLowerCase().includes("error")) c = "text-red-400";
  else if (clean.toLowerCase().includes("warn")) c = "text-amber-400";
  else if (clean.includes("success") || clean.includes("passed") || clean.includes("done") || clean.includes("✅")) c = "text-green-400";
  else if (clean.startsWith("$") || clean.startsWith(">")) c = "text-cyan-400";
  return <div className={`${c} leading-relaxed`}>{clean || "\u00A0"}</div>;
}

// ─── Progress steps ─────────────────────────────────────────────────────────

const STEPS = ["Spawned", "Coding", "PR", "CI", "Review", "Merged"] as const;

function stepIndex(status: AgentTask["status"]): number {
  switch (status) {
    case "pending": return 0;
    case "running": return 1;
    case "ready_for_review": return 4;
    case "ci_pending": case "ci_failed": return 3;
    case "done": case "completed": return 5;
    case "failed": return 1;
    default: return 0;
  }
}

function ProgressStepper({ status }: { status: AgentTask["status"] }) {
  const current = stepIndex(status);
  const isRunning = status === "running";
  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((step, i) => {
        const isDone = i <= current;
        const isActive = i === current;
        let dotColor = "bg-slate-700";
        if (isDone && !isActive) dotColor = "bg-emerald-400";
        else if (isActive && isRunning) dotColor = "bg-cyan-400";
        else if (isActive) dotColor = "bg-emerald-400";
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <motion.div
                className={`w-2 h-2 rounded-full ${dotColor}`}
                animate={isActive && isRunning ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1.5, repeat: isActive && isRunning ? Infinity : 0 }}
              />
              <span className="text-[7px] font-mono text-slate-500 whitespace-nowrap">{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${isDone && i < current ? "bg-emerald-400/40" : "bg-slate-700/50"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Agent badge colors ─────────────────────────────────────────────────────

function agentColor(agent: string) {
  const l = agent.toLowerCase();
  if (l.includes("opencode")) return { text: "text-cyan-400", border: "border-cyan-400/20", bg: "bg-cyan-400/10" };
  if (l.includes("claude")) return { text: "text-purple-400", border: "border-purple-400/20", bg: "bg-purple-400/10" };
  if (l.includes("codex")) return { text: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/10" };
  return { text: "text-slate-400", border: "border-slate-700", bg: "bg-slate-800/50" };
}

// ─── Single Agent Card (full: status + stats + terminal) ────────────────────

function AgentPanel({ task, fileData }: { task: AgentTask; fileData?: FileChangesResult }) {
  const elapsed = useElapsedTime(task.startedAt);
  const { lines, loading, scrollRef } = useAgentLog(task.id);
  const ac = agentColor(task.agent);
  const isRunning = task.status === "running";
  const filesChanged = fileData?.files?.length ?? task.liveFileCount ?? task.filesChanged ?? 0;
  const linesAdded = fileData?.totalAdditions ?? task.liveAdditions ?? 0;
  const linesRemoved = fileData?.totalDeletions ?? task.liveDeletions ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`rounded-xl border bg-slate-900/50 overflow-hidden ${
        isRunning ? "border-cyan-400/20 shadow-[0_0_30px_rgba(0,212,255,0.04)]" : "border-slate-700/50"
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {isRunning && (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
              </span>
            )}
            <h3 className="font-mono font-semibold text-sm text-white truncate">
              {task.name || task.id}
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${ac.bg} ${ac.text} ${ac.border}`}>
              {task.agent}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isRunning ? "bg-cyan-400/10 text-cyan-400 border-cyan-400/20" : "bg-amber-400/10 text-amber-400 border-amber-400/20"
            }`}>
              {task.status.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono text-slate-500">{elapsed}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 text-[11px] font-mono mb-3">
          {task.branch && (
            <div>
              <span className="text-slate-600">branch: </span>
              <span className="text-amber-400">{task.branch}</span>
            </div>
          )}
          <div>
            <span className="text-slate-600">files: </span>
            <span className="text-slate-300">{filesChanged}</span>
          </div>
          <div>
            <span className="text-emerald-400">+{linesAdded}</span>
            <span className="text-slate-600"> / </span>
            <span className="text-red-400">-{linesRemoved}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">tmux: </span>
            {task.tmuxAlive ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400">alive</span>
              </span>
            ) : (
              <span className="text-slate-500">exited</span>
            )}
          </div>
        </div>

        {/* Progress stepper */}
        <ProgressStepper status={task.status} />
      </div>

      {/* Terminal output */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 border-b border-slate-800/30">
          <span className="w-2 h-2 rounded-full bg-red-500/50" />
          <span className="w-2 h-2 rounded-full bg-amber-500/50" />
          <span className="w-2 h-2 rounded-full bg-green-500/50" />
          <span className="ml-2 text-[10px] font-mono text-slate-600">
            agent@{task.id} ~ {isRunning ? "live" : "finished"}
          </span>
        </div>
        <div className="bg-[#0a0a18] p-4 h-64 overflow-y-auto font-mono text-[11px] scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {lines.length > 0 ? (
            <>
              {lines.map((line, i) => (
                <TerminalLine key={i} text={line} />
              ))}
              {isRunning && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-green-400">$</span>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                    className="inline-block w-2 h-4 bg-green-400/80"
                  />
                </div>
              )}
              <div ref={scrollRef} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600 text-xs">
              {loading ? "Loading..." : isRunning ? "Waiting for output..." : "No output"}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LiveAgentsPage() {
  const { tasks, fileChanges, initialLoading } = useLive();
  const dataReady = useMinimumLoading(!initialLoading);

  const activeTasks = tasks.filter((t) => t.status === "running" || t.status === "pending");

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
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-slate-800/60 animate-pulse" />
            <div className="h-4 w-32 rounded bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-7 w-16 rounded-lg bg-slate-800/60 animate-pulse" />
        </div>
        <AgentGridSkeleton count={2} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-mono font-bold text-purple-500 flex items-center gap-2">
            <span className="text-purple-500/50">&gt;</span> Agents
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            {activeTasks.length} active agent{activeTasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>
      </motion.div>

      {/* Agent panels */}
      {activeTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-slate-900/50 border border-slate-700 rounded-xl p-16 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          <motion.div
            animate={{ opacity: [0.02, 0.06, 0.02] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-400/10 pointer-events-none"
          />
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/15 to-cyan-400/15 border border-purple-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          </motion.div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">No active agents</h3>
          <p className="text-xs font-mono text-slate-500">Agents appear here when tasks are running</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {activeTasks.map((task) => (
              <AgentPanel key={task.id} task={task} fileData={taskFileData.get(task.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
