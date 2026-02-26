"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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
        return <div key={li} className={className}>{line || "\u00A0"}</div>;
      })}
    </pre>
  );
}

export default function LivePromptPage() {
  const { tasks } = useLive();
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Agent log state - only for running tasks
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

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

  // Only show running/pending prompts
  const activePrompts = prompts
    .map((prompt) => {
      const liveTask = tasks.find((t) => t.id === prompt.taskId);
      return liveTask ? { ...prompt, status: liveTask.status } : prompt;
    })
    .filter((p) => p.status === "running" || p.status === "pending" || p.status === "ci_pending");

  // Only running tasks for log
  const runningTasks = tasks.filter((t) => t.status === "running");
  const activeTask = runningTasks[0] || null;

  // Fetch agent log for running task
  const fetchLog = useCallback(async () => {
    if (!activeTask) { setLogLines([]); return; }
    setLogLoading(true);
    try {
      const res = await fetch(`/api/agent-log?task=${encodeURIComponent(activeTask.id)}`);
      const data = await res.json();
      if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
        setLogLines(data.lines);
      } else {
        setLogLines([]);
      }
    } catch {
      setLogLines([]);
    }
    setLogLoading(false);
  }, [activeTask]);

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

  const idle = !loading && activePrompts.length === 0 && !activeTask;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-mono font-bold text-purple-500 mb-1 flex items-center gap-2">
          <span className="text-purple-500/50">&gt;</span> Live Prompt
        </h1>
        <p className="text-xs font-mono text-slate-500">
          Real-time prompt being sent to the coding agent
        </p>
      </motion.div>

      {loading ? (
        <div className="text-center text-slate-600 text-xs font-mono py-12 animate-pulse">Loading...</div>
      ) : idle ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-4 text-slate-700">~</div>
          <p className="text-slate-500 text-sm font-mono">No active agents</p>
          <p className="text-slate-700 text-xs font-mono mt-1">Prompts appear here when an agent is running</p>
        </div>
      ) : (
        <>
          {/* Active Prompts */}
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold uppercase"
                    style={{ color: statusColor(prompt.status), borderColor: `${statusColor(prompt.status)}44`, backgroundColor: `${statusColor(prompt.status)}18` }}>
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

          {/* Agent Log - only for running task */}
          {activeTask && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-slate-600">&gt;</span> Agent Log
                  <span className="text-[10px] font-mono text-cyan-400 normal-case">{activeTask.name || activeTask.id}</span>
                </h2>
                {logLoading && <span className="text-[10px] font-mono text-slate-600 animate-pulse">refreshing...</span>}
              </div>
              <div
                ref={logContainerRef}
                className="rounded-xl border border-slate-700 bg-black overflow-y-auto font-mono text-xs"
                style={{ height: 300 }}
              >
                <div className="p-4 space-y-0">
                  {logLines.length > 0 ? logLines.map((line, i) => {
                    let textClass = "text-emerald-400/80";
                    if (line.startsWith("#") || line.startsWith("Error") || line.startsWith("error")) textClass = "text-red-400";
                    else if (line.startsWith("Warning") || line.startsWith("warn")) textClass = "text-amber-400";
                    else if (line.includes("success") || line.includes("passed") || line.includes("done")) textClass = "text-emerald-400";
                    else if (line.startsWith("$") || line.startsWith(">")) textClass = "text-cyan-400";
                    return <div key={i} className={`${textClass} leading-5 break-all`}>{line || "\u00A0"}</div>;
                  }) : (
                    <div className="text-slate-600 animate-pulse">Waiting for output...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
