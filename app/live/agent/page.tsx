"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLive } from "../LiveContext";

// ─── Real agent log hook ────────────────────────────────────────────────────

function useAgentLog(taskId: string | null, isCompleted: boolean) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLog = useCallback(async () => {
    if (!taskId) {
      setLines([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/agent-log?task=${encodeURIComponent(taskId)}`);
      const data = await res.json();
      if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
        setLines(data.lines);
      } else if (data.error) {
        // Log file not found or other error — show contextual message
        if (isCompleted) {
          setLines([`# Task ${taskId} completed`, `# Log file not available (may have been cleaned up)`]);
        } else {
          setLines([`# ${data.error}`]);
        }
      } else {
        // Empty lines, no error — agent may not have produced output yet
        // Don't clear lines if we already have content (prevents flicker)
        setLines((prev) => prev.length > 0 ? prev : []);
      }
    } catch {
      setLines(["# Failed to fetch agent log"]);
    } finally {
      setLoading(false);
    }
  }, [taskId, isCompleted]);

  // Reset loading state when taskId changes
  useEffect(() => {
    setLoading(true);
    setLines([]);
  }, [taskId]);

  useEffect(() => {
    fetchLog();
    const interval = setInterval(fetchLog, 3000);
    return () => clearInterval(interval);
  }, [fetchLog]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return { lines, loading, scrollRef };
}

// ─── Terminal line renderer ─────────────────────────────────────────────────

function TerminalLine({ text }: { text: string }) {
  // Strip ANSI codes
  const clean = text.replace(/\x1b\[\d+m/g, "").replace(/\x1b\[[\d;]*[A-Za-z]/g, "");

  let colorClass = "text-slate-400";
  if (clean.startsWith("#") || clean.toLowerCase().includes("error")) colorClass = "text-red-400";
  else if (clean.toLowerCase().includes("warn")) colorClass = "text-amber-400";
  else if (clean.includes("success") || clean.includes("passed") || clean.includes("done") || clean.includes("✅")) colorClass = "text-green-400";
  else if (clean.startsWith("$") || clean.startsWith(">") || clean.includes("[agent]")) colorClass = "text-cyan-400";
  else if (clean.includes("Todo") || clean.includes("[ ]")) colorClass = "text-purple-400";

  return <div className={`${colorClass} leading-relaxed`}>{clean || "\u00A0"}</div>;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { tasks, eventLog } = useLive();

  // Find current or most recent task
  const runningTask = tasks.find((t) => t.status === "running");
  const latestTask = runningTask ?? [...tasks].sort((a, b) => {
    const aTime = new Date(a.startedAt).getTime();
    const bTime = new Date(b.startedAt).getTime();
    return bTime - aTime;
  })[0] ?? null;

  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // Auto-select running task, or latest
  useEffect(() => {
    if (runningTask) {
      setSelectedTaskId(runningTask.id);
    } else if (!selectedTaskId && latestTask) {
      setSelectedTaskId(latestTask.id);
    }
  }, [runningTask, latestTask, selectedTaskId]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? latestTask;
  const isActive = selectedTask?.tmuxAlive || selectedTask?.status === "running";
  const isCompleted = selectedTask?.status === "completed" || selectedTask?.status === "done";
  const hasNoRunning = !runningTask;
  const showTaskSelector = tasks.length > 0 && (tasks.length > 1 || hasNoRunning);

  const { lines, loading: logLoading, scrollRef } = useAgentLog(selectedTask?.id ?? null, isCompleted || false);

  // Only show running/pending tasks
  const activeTasks = tasks.filter((t) => t.status === "running" || t.status === "pending");

  // ── No tasks at all: empty state ──────────────────────────────────────
  if (tasks.length === 0) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
            <span className="text-purple-400/50">&gt;</span> Agent Process
          </h2>

          <div className="relative bg-slate-900/50 border border-slate-800/50 rounded-xl p-16 flex flex-col items-center justify-center text-center overflow-hidden">
            <motion.div
              animate={{ opacity: [0.02, 0.06, 0.02] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-purple-500/10 pointer-events-none"
            />

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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/15 to-purple-500/15 border border-cyan-400/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl border border-cyan-400/20"
              />
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-semibold text-slate-200 mb-2"
            >
              No agent process
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm font-mono text-slate-400 max-w-xs"
            >
              Spawn a task to see live agent output here
            </motion.p>
          </div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ── Agent Status Header ──────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Agent Process
        </h2>

        <motion.div
          className={`bg-slate-900/50 border rounded-xl p-5 backdrop-blur-sm ${
            isActive
              ? "border-cyan-500/20 shadow-[0_0_20px_rgba(0,212,255,0.06)]"
              : "border-slate-800/50"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isActive && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
                </span>
              )}
              <span className="font-mono font-semibold text-sm text-cyan-400">
                {selectedTask?.agent ?? "opencode"}
              </span>
              <span className="text-[10px] font-mono text-slate-600">
                (coding agent)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Task selector — shown when multiple tasks or no running task */}
              {showTaskSelector && (
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-cyan-400/50"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.id} ({t.status})
                    </option>
                  ))}
                </select>
              )}

              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                  isActive
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : selectedTask?.status === "completed" || selectedTask?.status === "done"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : selectedTask?.status === "failed" || selectedTask?.status === "ci_failed"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                }`}
              >
                {isActive ? "ACTIVE" : selectedTask?.status === "completed" || selectedTask?.status === "done" ? "COMPLETED" : selectedTask?.status === "failed" || selectedTask?.status === "ci_failed" ? "FAILED" : selectedTask?.status === "dead" ? "DEAD" : (selectedTask?.status?.toUpperCase() ?? "IDLE")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-600 text-[10px] block">TASK</span>
              <span className="text-slate-300">
                {selectedTask?.name || selectedTask?.description || selectedTask?.id || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 text-[10px] block">MODEL</span>
              <span className="text-slate-300">
                {selectedTask?.model ?? "claude-opus-4.6"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 text-[10px] block">BRANCH</span>
              <span className="text-amber-400">
                {selectedTask?.branch || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 text-[10px] block">FILES</span>
              <span className="text-green-400">
                {selectedTask?.filesChanged !== undefined ? selectedTask.filesChanged : "\u2014"}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Terminal Output (real agent logs) ─────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono text-cyan-400 flex items-center gap-2">
            <span className="text-cyan-400/50">&gt;</span> Live Output
            <span className="text-[10px] text-slate-600">
              ({lines.length} lines)
            </span>
          </h2>
          {selectedTask && (
            <span className="text-[10px] font-mono text-slate-600">
              tmux: {selectedTask.tmuxSession || `agent-${selectedTask.id}`} | log: .clawdbot/logs/{selectedTask.id}.log
            </span>
          )}
        </div>

        <div className="relative rounded-xl overflow-hidden border border-slate-800/50">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 bg-slate-900/80 border-b border-slate-800/50 px-4 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-[10px] font-mono text-slate-600">
              {selectedTask
                ? `agent@swarm ~ task:${selectedTask.id} (${isActive ? "live" : "finished"})`
                : "agent@swarm ~ (no task selected)"}
            </span>
          </div>

          {/* Terminal body */}
          <div className="bg-[#0c0c1a] p-4 h-96 overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
            {lines.length > 0 ? (
              <>
                <AnimatePresence>
                  {lines.map((line, i) => (
                    <motion.div
                      key={`${selectedTaskId}-${i}`}
                      initial={i > lines.length - 5 ? { opacity: 0, x: -5 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <TerminalLine text={line} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Blinking cursor for active tasks */}
                {isActive && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-green-400">$</span>
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      className="inline-block w-2 h-4 bg-green-400/80"
                    />
                  </div>
                )}
                <div ref={scrollRef} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <span className="text-2xl opacity-30">$_</span>
                <span className="text-xs">
                  {!selectedTask
                    ? "No active agent process. Spawn a task to see live output."
                    : logLoading
                    ? "Loading log..."
                    : isActive
                    ? "Waiting for agent output..."
                    : isCompleted
                    ? "Task completed. No log output available."
                    : "No log output for this task."}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── Event Feed ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-sm font-mono text-amber-400 mb-3 flex items-center gap-2">
          <span className="text-amber-400/50">&gt;</span> Agent Events
        </h2>
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-[11px] scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {eventLog.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-4">
              No events yet. Events from SSE stream will appear here.
            </div>
          ) : (
            <div className="space-y-0.5">
              {eventLog
                .filter((e) => e.type === "agent" || e.type === "system")
                .slice(-20)
                .map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <span className="text-slate-600 shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={
                        entry.type === "agent"
                          ? "text-cyan-400"
                          : "text-amber-400"
                      }
                    >
                      [{entry.type}]
                    </span>
                    <span className="text-slate-400">{entry.message}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </motion.section>

    </div>
  );
}
