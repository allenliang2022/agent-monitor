"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLive } from "../LiveContext";
import type { AgentTask, GitCommit } from "../LiveContext";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  timestamp: string;
  type:
    | "agent_spawned"
    | "commit_pushed"
    | "status_change"
    | "pr_created"
    | "ci_passed"
    | "ci_failed"
    | "agent_died";
  title: string;
  detail: string;
  rawData?: Record<string, unknown>;
}

// ─── Color mapping ──────────────────────────────────────────────────────────

const eventStyles: Record<
  string,
  { dot: string; bg: string; border: string; text: string }
> = {
  agent_spawned: {
    dot: "bg-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    text: "text-cyan-400",
  },
  commit_pushed: {
    dot: "bg-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-500",
  },
  status_change: {
    dot: "bg-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    text: "text-amber-400",
  },
  pr_created: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    text: "text-emerald-400",
  },
  ci_passed: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    text: "text-emerald-400",
  },
  ci_failed: {
    dot: "bg-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    text: "text-red-400",
  },
  agent_died: {
    dot: "bg-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    text: "text-red-400",
  },
};

function getStyle(type: string) {
  return (
    eventStyles[type] || {
      dot: "bg-slate-400",
      bg: "bg-slate-800/50",
      border: "border-slate-700",
      text: "text-slate-400",
    }
  );
}

function formatLabel(type: string): string {
  return type.replace(/_/g, " ").toUpperCase();
}

// ─── Diff engine: generate events from SSE data changes ─────────────────────

function diffTasks(
  prevTasks: AgentTask[],
  newTasks: AgentTask[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const prevMap = new Map(prevTasks.map((t) => [t.id, t]));
  const now = new Date().toISOString();

  for (const task of newTasks) {
    const prev = prevMap.get(task.id);

    if (!prev) {
      // New task = agent spawned
      events.push({
        id: `spawn-${task.id}-${Date.now()}`,
        timestamp: now,
        type: "agent_spawned",
        title: `Agent spawned: ${task.name || task.id}`,
        detail: `${task.agent} started task "${task.description || task.name}" on branch ${task.branch || "unknown"}`,
        rawData: { ...task } as unknown as Record<string, unknown>,
      });
    } else {
      // Status change
      if (prev.status !== task.status) {
        let type: TimelineEvent["type"] = "status_change";
        if (task.status === "ready_for_review") type = "pr_created";
        if (task.status === "ci_failed") type = "ci_failed";
        if (task.status === "done" || task.status === "completed")
          type = "ci_passed";

        events.push({
          id: `status-${task.id}-${task.status}-${Date.now()}`,
          timestamp: now,
          type,
          title: `${task.name || task.id}: ${prev.status} → ${task.status}`,
          detail: `Task status changed from ${prev.status} to ${task.status}`,
          rawData: {
            taskId: task.id,
            from: prev.status,
            to: task.status,
          },
        });
      }

      // tmux died
      if (prev.tmuxAlive && !task.tmuxAlive) {
        events.push({
          id: `died-${task.id}-${Date.now()}`,
          timestamp: now,
          type: "agent_died",
          title: `Agent tmux session died: ${task.name || task.id}`,
          detail: `tmux session for ${task.agent} is no longer alive`,
          rawData: { taskId: task.id, agent: task.agent },
        });
      }
    }
  }

  return events;
}

function diffCommits(
  prevCommits: Map<string, Set<string>>,
  newGitData: Record<string, { recentCommits?: GitCommit[] }>
): { events: TimelineEvent[]; newMap: Map<string, Set<string>> } {
  const events: TimelineEvent[] = [];
  const newMap = new Map<string, Set<string>>();
  const now = new Date().toISOString();

  for (const [dir, info] of Object.entries(newGitData)) {
    const commits = info.recentCommits || [];
    const hashes = new Set(commits.map((c) => c.hash));
    newMap.set(dir, hashes);

    const prevHashes = prevCommits.get(dir) || new Set<string>();
    for (const commit of commits) {
      if (!prevHashes.has(commit.hash)) {
        events.push({
          id: `commit-${commit.hash}-${Date.now()}`,
          timestamp: now,
          type: "commit_pushed",
          title: `Commit: ${commit.message?.slice(0, 80) || commit.hash.slice(0, 8)}`,
          detail: `${commit.author || "unknown"} committed ${commit.hash.slice(0, 8)} in ${dir.split("/").pop()}`,
          rawData: { ...commit, directory: dir },
        });
      }
    }
  }

  return { events, newMap };
}

// ─── Page ───────────────────────────────────────────────────────────────────

const MAX_EVENTS = 50;

export default function LiveTimelinePage() {
  const { tasks, gitData } = useLive();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);

  // Refs for previous data to compute diffs
  const prevTasksRef = useRef<AgentTask[]>([]);
  const prevCommitsRef = useRef<Map<string, Set<string>>>(new Map());
  const initializedRef = useRef(false);

  // Diff tasks on each SSE update
  useEffect(() => {
    if (!initializedRef.current) {
      // First load: snapshot the current state, don't generate events
      prevTasksRef.current = tasks;
      const commitMap = new Map<string, Set<string>>();
      for (const [dir, info] of Object.entries(gitData)) {
        commitMap.set(
          dir,
          new Set((info.recentCommits || []).map((c) => c.hash))
        );
      }
      prevCommitsRef.current = commitMap;
      initializedRef.current = true;
      return;
    }

    const taskEvents = diffTasks(prevTasksRef.current, tasks);
    const { events: commitEvents, newMap } = diffCommits(
      prevCommitsRef.current,
      gitData
    );

    const newEvents = [...taskEvents, ...commitEvents];

    if (newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev].slice(0, MAX_EVENTS));
    }

    prevTasksRef.current = tasks;
    prevCommitsRef.current = newMap;
  }, [tasks, gitData]);

  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    []
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Live Timeline
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {events.length} events captured (max {MAX_EVENTS})
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAutoPlay((p) => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${
            autoPlay
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20"
              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-700"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${autoPlay ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`}
          />
          {autoPlay ? "AUTO" : "PAUSED"}
        </motion.button>
      </motion.div>

      {/* ── Timeline ─────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/30 via-purple-500/30 to-emerald-400/30" />

        {events.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pl-12 py-12 text-center"
          >
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8">
              <div className="text-slate-400 font-mono text-sm mb-2">
                Waiting for events...
              </div>
              <div className="text-slate-400 font-mono text-xs">
                Events will appear here as agents spawn, commit, and change
                status via SSE.
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {events.map((event) => {
            const style = getStyle(event.type);
            const isExpanded = expandedId === event.id;

            return (
              <motion.div
                key={event.id}
                initial={autoPlay ? { opacity: 0, x: -20, height: 0 } : false}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.4 }}
                className="relative pl-12 pb-6 last:pb-0"
              >
                {/* Timeline dot */}
                <motion.div
                  className={`absolute left-2.5 top-1.5 w-5 h-5 rounded-full ${style.dot} flex items-center justify-center`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="w-2 h-2 rounded-full bg-white/80" />
                </motion.div>

                {/* Event card */}
                <motion.div
                  onClick={() => toggleExpand(event.id)}
                  whileHover={{ x: 4 }}
                  className={`rounded-xl border ${style.border} ${style.bg} p-4 cursor-pointer transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-slate-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${style.bg} ${style.text} uppercase tracking-wider`}
                        >
                          {formatLabel(event.type)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-200 text-sm">
                        {event.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {event.detail}
                      </p>
                    </div>

                    <motion.svg
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-5 h-5 text-slate-400 shrink-0 mt-1"
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
                  </div>

                  <AnimatePresence>
                    {isExpanded && event.rawData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t border-slate-700/30">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                            Raw Data
                          </span>
                          <div className="mt-2 rounded-lg bg-slate-900/50 border border-slate-700 p-3 font-mono text-xs overflow-x-auto">
                            {Object.entries(event.rawData).map(
                              ([key, value]) => (
                                <div key={key} className="flex gap-2 mb-1 last:mb-0">
                                  <span className="text-purple-500 shrink-0">
                                    {key}:
                                  </span>
                                  <span className="text-slate-300">
                                    {typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
