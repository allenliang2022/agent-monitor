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

// Status color mapping
function statusColor(status: string): string {
  switch (status) {
    case "running": return "#22d3ee";
    case "completed": case "done": case "ready_for_review": return "#22c55e";
    case "failed": case "ci_failed": case "dead": return "#ef4444";
    case "pending": case "ci_pending": return "#f59e0b";
    default: return "#64748b";
  }
}

function statusLabel(status: string): string {
  return status === "unknown" ? "unknown" : status;
}

// Rough token estimation: ~4 chars per token for English text, ~3.5 for code-heavy
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export default function LivePromptPage() {
  const { tasks } = useLive();
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Agent log viewer state
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-select first task (prefer running, fallback to any)
  useEffect(() => {
    if (!selectedTask) {
      const running = tasks.find((t) => t.status === "running");
      if (running) {
        setSelectedTask(running.id);
      } else if (tasks.length > 0) {
        setSelectedTask(tasks[0].id);
      }
    }
  }, [tasks, selectedTask]);

  // Fetch prompts
  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data) => {
        const promptList: PromptFile[] = data.prompts || [];
        setPrompts(promptList);
        if (promptList.length > 0) {
          setExpandedPrompt(promptList[0].filename);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Match prompt status to live task status from LiveContext
  const enrichedPrompts = prompts.map((prompt) => {
    const liveTask = tasks.find((t) => t.id === prompt.taskId);
    if (liveTask) {
      return { ...prompt, status: liveTask.status };
    }
    return prompt;
  });

  // Fetch agent log every 3 seconds
  const fetchLog = useCallback(async () => {
    if (!selectedTask) return;
    setLogLoading(true);
    try {
      const res = await fetch(`/api/agent-log?task=${encodeURIComponent(selectedTask)}`);
      const data = await res.json();
      if (data.error && (!data.lines || data.lines.length === 0)) {
        // API returned an error with no lines (e.g., log file not found)
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

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logLines]);

  // Selected task info for display
  const selectedTaskInfo = tasks.find((t) => t.id === selectedTask);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-mono font-bold text-purple-500 mb-1 flex items-center gap-2">
          <span className="text-purple-500/50">&gt;</span> Prompts & Agent Logs
        </h1>
        <p className="text-xs font-mono text-slate-500">
          Task prompts on the left, live agent output on the right
        </p>
      </motion.div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Prompt accordion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Prompts
            </h2>
            <span className="text-[10px] font-mono text-slate-600">
              {enrichedPrompts.length} prompt{enrichedPrompts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="text-center text-slate-600 text-xs font-mono py-12 animate-pulse">
              Loading prompts...
            </div>
          ) : enrichedPrompts.length === 0 ? (
            <div className="text-center text-slate-600 text-xs font-mono py-12 rounded-xl border border-slate-700 bg-slate-900/50">
              No prompt files found.
            </div>
          ) : (
            <div className="space-y-2">
              {enrichedPrompts.map((prompt, i) => {
                const isExpanded = expandedPrompt === prompt.filename;
                const lines = prompt.content.split("\n");
                const lineCount = lines.length;
                const words = wordCount(prompt.content);
                const tokens = estimateTokens(prompt.content);
                const sColor = statusColor(prompt.status);

                return (
                  <motion.div
                    key={prompt.filename}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden"
                    style={{ borderLeftWidth: 3, borderLeftColor: sColor }}
                  >
                    <button
                      onClick={() => setExpandedPrompt(isExpanded ? null : prompt.filename)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm text-purple-500">$</span>
                          <div className="min-w-0">
                            <div className="font-mono font-semibold text-sm text-white truncate">
                              {prompt.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                                {prompt.agent}
                              </span>
                              <span
                                className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold"
                                style={{
                                  color: sColor,
                                  borderColor: `${sColor}44`,
                                  backgroundColor: `${sColor}18`,
                                }}
                              >
                                {statusLabel(prompt.status).toUpperCase()}
                              </span>
                              <span className="text-[10px] font-mono text-slate-600">
                                {words} words
                              </span>
                              <span className="text-[10px] font-mono text-slate-600" title="Estimated GPT tokens">
                                ~{tokens.toLocaleString()} tokens
                              </span>
                              <span className="text-[10px] font-mono text-slate-600">
                                {lineCount} lines
                              </span>
                            </div>
                          </div>
                        </div>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="text-slate-500 text-xs shrink-0 ml-2"
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
                            <div className="mt-3 rounded-lg bg-black/50 border border-slate-700 p-4 max-h-[500px] overflow-y-auto">
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
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Agent log viewer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Agent Log
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

          {/* Task selector — shows ALL tasks, grouped by status */}
          {tasks.length > 0 && (
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400/50"
            >
              {/* Running tasks first */}
              {tasks.filter((t) => t.status === "running").length > 0 && (
                <optgroup label="Running">
                  {tasks.filter((t) => t.status === "running").map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name || task.id} — {task.agent}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Pending */}
              {tasks.filter((t) => t.status === "pending" || t.status === "ci_pending").length > 0 && (
                <optgroup label="Pending">
                  {tasks.filter((t) => t.status === "pending" || t.status === "ci_pending").map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name || task.id} — {task.agent}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Completed */}
              {tasks.filter((t) => ["completed", "done", "ready_for_review"].includes(t.status)).length > 0 && (
                <optgroup label="Completed">
                  {tasks.filter((t) => ["completed", "done", "ready_for_review"].includes(t.status)).map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name || task.id} — {task.agent}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Failed / Dead */}
              {tasks.filter((t) => ["failed", "ci_failed", "dead"].includes(t.status)).length > 0 && (
                <optgroup label="Failed / Dead">
                  {tasks.filter((t) => ["failed", "ci_failed", "dead"].includes(t.status)).map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name || task.id} — {task.agent}
                    </option>
                  ))}
                </optgroup>
              )}
              {/* Other statuses */}
              {tasks.filter((t) => !["running", "pending", "ci_pending", "completed", "done", "ready_for_review", "failed", "ci_failed", "dead"].includes(t.status)).length > 0 && (
                <optgroup label="Other">
                  {tasks.filter((t) => !["running", "pending", "ci_pending", "completed", "done", "ready_for_review", "failed", "ci_failed", "dead"].includes(t.status)).map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name || task.id} — {task.agent} ({task.status})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}

          {/* Terminal log display */}
          <div
            ref={logContainerRef}
            className="rounded-xl border border-slate-700 bg-black overflow-y-auto font-mono text-xs"
            style={{ height: "calc(100vh - 280px)", minHeight: 400 }}
          >
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-2xl mb-3 text-slate-700">~</div>
                <p className="text-slate-600 text-xs">No active agent logs</p>
                <p className="text-slate-700 text-[10px] mt-1">
                  Logs appear when agents are running
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-0">
                {/* Header line showing selected task */}
                {selectedTaskInfo && (
                  <div className="text-slate-600 mb-2 pb-2 border-b border-slate-800/50">
                    # Log: {selectedTaskInfo.name || selectedTaskInfo.id} ({selectedTaskInfo.agent})
                  </div>
                )}
                {logLines.map((line, i) => {
                  // Color code based on content
                  let textClass = "text-emerald-400/80";
                  if (line.startsWith("#") || line.startsWith("Error") || line.startsWith("error")) {
                    textClass = "text-red-400";
                  } else if (line.startsWith("Warning") || line.startsWith("warn")) {
                    textClass = "text-amber-400";
                  } else if (line.includes("success") || line.includes("passed") || line.includes("done")) {
                    textClass = "text-emerald-400";
                  } else if (line.startsWith("$") || line.startsWith(">")) {
                    textClass = "text-cyan-400";
                  }

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
      </div>
    </div>
  );
}
