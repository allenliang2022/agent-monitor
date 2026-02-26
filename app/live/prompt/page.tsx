"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLive } from "../LiveContext";

interface PromptFile {
  name: string;
  filename: string;
  content: string;
  agent: string;
  taskId: string;
  status: string;
  startedAt: number | null;
}

function statusColor(status: string): string {
  switch (status) {
    case "running": return "#22d3ee";
    case "completed": case "done": case "ready_for_review": return "#22c55e";
    case "failed": case "ci_failed": case "dead": return "#ef4444";
    case "pending": case "ci_pending": return "#f59e0b";
    default: return "#64748b";
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function PromptContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
      {lines.map((line, li) => {
        let className = "text-slate-300";
        if (line.startsWith("# ")) className = "text-purple-500 font-bold text-sm";
        else if (line.startsWith("## ")) className = "text-cyan-400 font-bold";
        else if (line.startsWith("### ")) className = "text-amber-400 font-semibold";
        else if (line.startsWith("- **")) className = "text-emerald-400";
        else if (line.startsWith("- ")) className = "text-slate-400";
        else if (line.startsWith("```")) className = "text-red-400";
        else if (line.match(/^\d+\./)) className = "text-amber-400";
        return (
          <div key={li} className={className}>
            {line || "\u00A0"}
          </div>
        );
      })}
    </pre>
  );
}

export default function LivePromptPage() {
  const { tasks } = useLive();
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryPrompt, setExpandedHistoryPrompt] = useState<string | null>(null);

  // Agent log viewer state
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-select first running task
  useEffect(() => {
    if (!selectedTask) {
      const running = tasks.find((t) => t.status === "running");
      if (running) setSelectedTask(running.id);
      else if (tasks.length > 0) setSelectedTask(tasks[0].id);
    }
  }, [tasks, selectedTask]);

  // Fetch prompts
  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data) => {
        setPrompts(data.prompts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Enrich with live status
  const enrichedPrompts = prompts.map((prompt) => {
    const liveTask = tasks.find((t) => t.id === prompt.taskId);
    return liveTask ? { ...prompt, status: liveTask.status } : prompt;
  });

  // Split: active (running/pending) vs history
  const activePrompts = enrichedPrompts.filter(
    (p) => p.status === "running" || p.status === "pending" || p.status === "ci_pending"
  );
  const historyPrompts = enrichedPrompts.filter(
    (p) => !["running", "pending", "ci_pending"].includes(p.status)
  );

  // If no active prompts, show the most recent one as "latest"
  const latestPrompt = activePrompts.length > 0 ? null : enrichedPrompts[0] || null;

  // Fetch agent log
  const fetchLog = useCallback(async () => {
    if (!selectedTask) return;
    setLogLoading(true);
    try {
      const res = await fetch(`/api/agent-log?task=${encodeURIComponent(selectedTask)}`);
      const data = await res.json();
      if (data.error && (!data.lines || data.lines.length === 0)) {
        setLogLines([`# ${data.error}`]);
      } else if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
        setLogLines(data.lines);
      } else {
        setLogLines(["# No log data available"]);
      }
    } catch {
      setLogLines(["# Failed to fetch agent log"]);
    }
    setLogLoading(false);
  }, [selectedTask]);

  useEffect(() => {
    fetchLog();
    const interval = setInterval(fetchLog, 3000);
    return () => clearInterval(interval);
  }, [fetchLog]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logLines]);

  const selectedTaskInfo = tasks.find((t) => t.id === selectedTask);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-mono font-bold text-purple-500 mb-1 flex items-center gap-2">
          <span className="text-purple-500/50">&gt;</span> Live Prompt
        </h1>
        <p className="text-xs font-mono text-slate-500">
          Active prompt being sent to the coding agent
        </p>
      </motion.div>

      {/* Active Prompt Section */}
      {loading ? (
        <div className="text-center text-slate-600 text-xs font-mono py-12 animate-pulse">
          Loading...
        </div>
      ) : activePrompts.length > 0 ? (
        /* Show all running/pending prompts */
        <div className="space-y-4">
          {activePrompts.map((prompt) => (
            <motion.div
              key={prompt.filename}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-cyan-400/30 rounded-xl overflow-hidden"
              style={{ borderLeftWidth: 3, borderLeftColor: statusColor(prompt.status) }}
            >
              <div className="px-5 py-3 border-b border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                  </span>
                  <span className="font-mono font-semibold text-sm text-white">{prompt.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    {prompt.agent}
                  </span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold uppercase"
                    style={{
                      color: statusColor(prompt.status),
                      borderColor: `${statusColor(prompt.status)}44`,
                      backgroundColor: `${statusColor(prompt.status)}18`,
                    }}
                  >
                    {prompt.status}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-600 flex gap-3">
                  <span>{wordCount(prompt.content)} words</span>
                  <span>~{estimateTokens(prompt.content).toLocaleString()} tokens</span>
                  <span>{prompt.content.split("\n").length} lines</span>
                </div>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto bg-black/30">
                <PromptContent content={prompt.content} />
              </div>
            </motion.div>
          ))}
        </div>
      ) : latestPrompt ? (
        /* No running - show most recent prompt with muted styling */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden"
          style={{ borderLeftWidth: 3, borderLeftColor: statusColor(latestPrompt.status) }}
        >
          <div className="px-5 py-3 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-slate-600 text-xs">Latest:</span>
              <span className="font-mono font-semibold text-sm text-slate-300">{latestPrompt.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                {latestPrompt.agent}
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold uppercase"
                style={{
                  color: statusColor(latestPrompt.status),
                  borderColor: `${statusColor(latestPrompt.status)}44`,
                  backgroundColor: `${statusColor(latestPrompt.status)}18`,
                }}
              >
                {latestPrompt.status}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 flex gap-3">
              <span>{wordCount(latestPrompt.content)} words</span>
              <span>~{estimateTokens(latestPrompt.content).toLocaleString()} tokens</span>
            </div>
          </div>
          <div className="p-5 max-h-[40vh] overflow-y-auto bg-black/30">
            <PromptContent content={latestPrompt.content} />
          </div>
        </motion.div>
      ) : (
        <div className="text-center text-slate-600 text-xs font-mono py-8 rounded-xl border border-slate-700 bg-slate-900/50">
          No prompts found. Prompts appear when agents are spawned.
        </div>
      )}

      {/* Agent Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span className="text-slate-600">&gt;</span> Agent Log
          </h2>
          <div className="flex items-center gap-3">
            {selectedTaskInfo && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold"
                style={{
                  color: statusColor(selectedTaskInfo.status),
                  borderColor: `${statusColor(selectedTaskInfo.status)}44`,
                  backgroundColor: `${statusColor(selectedTaskInfo.status)}18`,
                }}
              >
                {selectedTaskInfo.status.toUpperCase()}
              </span>
            )}
            {logLoading && (
              <span className="text-[10px] font-mono text-slate-600 animate-pulse">refreshing...</span>
            )}
          </div>
        </div>

        {tasks.length > 0 && (
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400/50"
          >
            {tasks.filter((t) => t.status === "running").length > 0 && (
              <optgroup label="Running">
                {tasks.filter((t) => t.status === "running").map((task) => (
                  <option key={task.id} value={task.id}>{task.name || task.id} - {task.agent}</option>
                ))}
              </optgroup>
            )}
            {tasks.filter((t) => ["completed", "done", "ready_for_review"].includes(t.status)).length > 0 && (
              <optgroup label="Completed">
                {tasks.filter((t) => ["completed", "done", "ready_for_review"].includes(t.status)).map((task) => (
                  <option key={task.id} value={task.id}>{task.name || task.id} - {task.agent}</option>
                ))}
              </optgroup>
            )}
          </select>
        )}

        <div
          ref={logContainerRef}
          className="rounded-xl border border-slate-700 bg-black overflow-y-auto font-mono text-xs"
          style={{ height: 300 }}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-2xl mb-3 text-slate-700">~</div>
              <p className="text-slate-600 text-xs">No active agent logs</p>
            </div>
          ) : (
            <div className="p-4 space-y-0">
              {selectedTaskInfo && (
                <div className="text-slate-600 mb-2 pb-2 border-b border-slate-800/50">
                  # Log: {selectedTaskInfo.name || selectedTaskInfo.id} ({selectedTaskInfo.agent})
                </div>
              )}
              {logLines.map((line, i) => {
                let textClass = "text-emerald-400/80";
                if (line.startsWith("#") || line.startsWith("Error") || line.startsWith("error")) textClass = "text-red-400";
                else if (line.startsWith("Warning") || line.startsWith("warn")) textClass = "text-amber-400";
                else if (line.includes("success") || line.includes("passed") || line.includes("done")) textClass = "text-emerald-400";
                else if (line.startsWith("$") || line.startsWith(">")) textClass = "text-cyan-400";
                return (
                  <div key={i} className={`${textClass} leading-5 break-all`}>
                    {line || "\u00A0"}
                  </div>
                );
              })}
              {logLines.length === 0 && !logLoading && (
                <div className="text-slate-600">No log file found for this task.</div>
              )}
              {logLines.length === 0 && logLoading && (
                <div className="text-slate-600 animate-pulse">Loading log...</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History Section - collapsed by default */}
      {historyPrompts.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-mono text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <motion.span animate={{ rotate: showHistory ? 180 : 0 }} className="text-xs">
              ▼
            </motion.span>
            <span>History</span>
            <span className="text-[10px] text-slate-600">({historyPrompts.length} prompts)</span>
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden space-y-2"
              >
                {historyPrompts.map((prompt, i) => {
                  const isExpanded = expandedHistoryPrompt === prompt.filename;
                  const sColor = statusColor(prompt.status);
                  return (
                    <motion.div
                      key={prompt.filename}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden"
                      style={{ borderLeftWidth: 3, borderLeftColor: sColor }}
                    >
                      <button
                        onClick={() => setExpandedHistoryPrompt(isExpanded ? null : prompt.filename)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs text-slate-400 truncate">
                              {prompt.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400/60 border border-cyan-400/10">
                              {prompt.agent}
                            </span>
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase"
                              style={{
                                color: `${sColor}aa`,
                                borderColor: `${sColor}33`,
                                backgroundColor: `${sColor}10`,
                              }}
                            >
                              {prompt.status}
                            </span>
                            <span className="text-[10px] font-mono text-slate-700">
                              {wordCount(prompt.content)}w / ~{estimateTokens(prompt.content).toLocaleString()}t
                            </span>
                          </div>
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="text-slate-600 text-xs shrink-0 ml-2"
                          >
                            ▼
                          </motion.span>
                        </div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-slate-800/30">
                              <div className="mt-3 rounded-lg bg-black/50 border border-slate-700 p-4 max-h-[400px] overflow-y-auto">
                                <PromptContent content={prompt.content} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
