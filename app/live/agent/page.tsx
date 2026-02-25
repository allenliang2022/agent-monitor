"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLive } from "../LiveContext";

// ─── Simulated terminal lines for when agent is active ─────────────────────

function useTerminalOutput(taskId: string | null) {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!taskId) {
      setLines([]);
      return;
    }

    // Initial boot lines
    const bootLines = [
      `\x1b[36m[agent]\x1b[0m Initializing session for task ${taskId}...`,
      `\x1b[36m[agent]\x1b[0m Reading prompt file...`,
      `\x1b[36m[agent]\x1b[0m Analyzing codebase structure...`,
      `\x1b[36m[agent]\x1b[0m Agent process active in tmux session`,
      `\x1b[32m[ready]\x1b[0m Waiting for live output stream...`,
    ];
    setLines(bootLines);

    // Simulate periodic output
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      setLines((prev) => [
        ...prev.slice(-200),
        `\x1b[90m[${now}]\x1b[0m heartbeat: agent process alive`,
      ]);
    }, 8000);

    return () => clearInterval(interval);
  }, [taskId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return { lines, scrollRef };
}

// ─── Terminal line renderer (basic ANSI to classes) ─────────────────────────

function TerminalLine({ text }: { text: string }) {
  // Strip ANSI and apply simple coloring based on prefix
  const clean = text.replace(/\x1b\[\d+m/g, "");

  let colorClass = "text-slate-400";
  if (clean.includes("[agent]")) colorClass = "text-cyan-400";
  else if (clean.includes("[ready]")) colorClass = "text-green-400";
  else if (clean.includes("[error]")) colorClass = "text-red-400";
  else if (clean.includes("[warn]")) colorClass = "text-amber-400";
  else if (clean.includes("heartbeat")) colorClass = "text-slate-600";

  return <div className={`${colorClass} leading-relaxed`}>{clean}</div>;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { tasks, eventLog } = useLive();

  const currentTask = tasks.find((t) => t.status === "running") ?? null;
  const recentCompleted = tasks
    .filter((t) => t.status === "completed")
    .slice(-5)
    .reverse();

  const { lines, scrollRef } = useTerminalOutput(currentTask?.id ?? null);

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
            currentTask
              ? "border-cyan-500/20 shadow-[0_0_20px_rgba(0,212,255,0.06)]"
              : "border-slate-800/50"
          }`}
          whileHover={{ scale: 1.002 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {currentTask && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
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
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                currentTask
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-slate-500/10 text-slate-500 border-slate-500/20"
              }`}
            >
              {currentTask ? "ACTIVE" : "IDLE"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-600 text-[10px] block">TASK</span>
              <span className="text-slate-300">
                {currentTask?.name ?? "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 text-[10px] block">MODEL</span>
              <span className="text-slate-300">
                {currentTask?.model ?? "claude-opus-4.6"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 text-[10px] block">PROMPT</span>
              <span className="text-slate-300">
                {currentTask?.promptFile ?? "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 text-[10px] block">COMPLETED</span>
              <span className="text-green-400">
                {tasks.filter((t) => t.status === "completed").length}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Terminal Output ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono text-cyan-400 flex items-center gap-2">
            <span className="text-cyan-400/50">&gt;</span> Live Output
          </h2>
          {currentTask && (
            <span className="text-[10px] font-mono text-slate-600">
              tmux: agent-{currentTask.id}
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
              {currentTask
                ? `agent@swarm ~ task:${currentTask.id}`
                : "agent@swarm ~ (idle)"}
            </span>
          </div>

          {/* Terminal body */}
          <div className="bg-[#0c0c1a] p-4 h-80 overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
            {currentTask ? (
              <>
                <div className="text-slate-600 mb-2">
                  $ opencode --task {currentTask.id} --prompt{" "}
                  {currentTask.promptFile ?? "default"}
                </div>
                <AnimatePresence>
                  {lines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TerminalLine text={line} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Blinking cursor */}
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
                <div ref={scrollRef} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <span className="text-2xl opacity-30">$_</span>
                <span className="text-xs">
                  No active agent process. Output will appear here when a task
                  is running.
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── Event Feed (from SSE, agent-related) ─────────────────────────── */}
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
                .filter(
                  (e) => e.type === "agent" || e.type === "system"
                )
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

      {/* ── Recent Completed ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2">
          <span className="text-green-400/50">&gt;</span> Recent Completed
          <span className="text-[10px] font-mono text-slate-600">
            ({recentCompleted.length})
          </span>
        </h2>
        {recentCompleted.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 text-center text-slate-600 text-xs font-mono">
            No completed tasks yet.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {recentCompleted.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/40 border border-green-500/10 rounded-lg p-3"
                  whileHover={{ scale: 1.003 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-green-400">
                      {task.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                      DONE
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] font-mono text-slate-500">
                    {task.commit && (
                      <span>
                        commit:{" "}
                        <span className="text-amber-400">{task.commit}</span>
                      </span>
                    )}
                    {task.filesChanged !== undefined && (
                      <span>{task.filesChanged} files</span>
                    )}
                    {task.summary && (
                      <span className="truncate max-w-[350px]">
                        {task.summary}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>
    </div>
  );
}
