"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
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

type FilterCategory = "all" | "agent" | "system" | "git";

// ─── Filter mapping ─────────────────────────────────────────────────────────

const EVENT_TYPE_TO_CATEGORY: Record<TimelineEvent["type"], FilterCategory> = {
  agent_spawned: "agent",
  agent_died: "agent",
  status_change: "agent",
  commit_pushed: "git",
  pr_created: "system",
  ci_passed: "system",
  ci_failed: "system",
};

const FILTER_OPTIONS: { key: FilterCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "agent", label: "Agent" },
  { key: "system", label: "System" },
  { key: "git", label: "Git" },
];

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

// ─── Time grouping helpers ──────────────────────────────────────────────────

type TimeGroup = "just_now" | "recent" | "earlier";

function getTimeGroup(timestamp: string): TimeGroup {
  const age = Date.now() - new Date(timestamp).getTime();
  if (age < 60_000) return "just_now";
  if (age < 300_000) return "recent";
  return "earlier";
}

const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  just_now: "Just now",
  recent: "Recent",
  earlier: "Earlier",
};

const TIME_GROUP_ORDER: TimeGroup[] = ["just_now", "recent", "earlier"];

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
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  // Refs for previous data to compute diffs
  const prevTasksRef = useRef<AgentTask[]>([]);
  const prevCommitsRef = useRef<Map<string, Set<string>>>(new Map());
  const initializedRef = useRef(false);

  // Auto-scroll refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Diff tasks on each SSE update
  useEffect(() => {
    if (!initializedRef.current) {
      // First load: seed timeline with existing data
      const seedEvents: TimelineEvent[] = [];

      // Seed from existing tasks
      for (const task of tasks) {
        seedEvents.push({
          id: `spawn-${task.id}-seed`,
          timestamp: task.startedAt || new Date().toISOString(),
          type: "agent_spawned",
          title: `Agent spawned: ${task.name || task.id}`,
          detail: `${task.agent} started task "${task.description || task.name}" on branch ${task.branch || "unknown"}`,
          rawData: { ...task } as unknown as Record<string, unknown>,
        });
      }

      // Seed from existing git commits
      for (const [dir, info] of Object.entries(gitData)) {
        const commits = info.recentCommits || [];
        for (const commit of commits) {
          seedEvents.push({
            id: `commit-${commit.hash}-seed`,
            timestamp: commit.time || new Date().toISOString(),
            type: "commit_pushed",
            title: `Commit: ${commit.message?.slice(0, 80) || commit.hash.slice(0, 8)}`,
            detail: `${commit.author || "unknown"} committed ${commit.hash.slice(0, 8)} in ${dir.split("/").pop()}`,
            rawData: { ...commit, directory: dir },
          });
        }
      }

      // Sort by timestamp descending
      seedEvents.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEvents(seedEvents.slice(0, MAX_EVENTS));

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

  // ── Auto-scroll logic ──────────────────────────────────────────────────

  // Scroll to top when new events arrive (newest-first ordering)
  useEffect(() => {
    if (autoScroll && events.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [events, autoScroll]);

  // Track scroll position to show/hide "jump to latest" button
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    // Show "jump to latest" when scrolled down (since newest are at top)
    const isScrolledAway = scrollTop > 100;
    setShowJumpToLatest(isScrolledAway && !autoScroll);

    // If user scrolls manually, detect it
    if (isScrolledAway && autoScroll) {
      isUserScrollingRef.current = true;
    }
  }, [autoScroll]);

  const jumpToLatest = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShowJumpToLatest(false);
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    return events.filter(
      (e) => EVENT_TYPE_TO_CATEGORY[e.type] === activeFilter
    );
  }, [events, activeFilter]);

  // ── Grouping by time ───────────────────────────────────────────────────

  const groupedEvents = useMemo(() => {
    const groups: Record<TimeGroup, TimelineEvent[]> = {
      just_now: [],
      recent: [],
      earlier: [],
    };

    for (const event of filteredEvents) {
      const group = getTimeGroup(event.timestamp);
      groups[group].push(event);
    }

    return groups;
  }, [filteredEvents]);

  // Re-compute groups periodically so events shift between groups
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderEvent = (event: TimelineEvent) => {
    const style = getStyle(event.type);
    const isExpanded = expandedId === event.id;
    const hasDetails = !!event.rawData && Object.keys(event.rawData).length > 0;

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, x: -20, height: 0 }}
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
          onClick={() => hasDetails && toggleExpand(event.id)}
          whileHover={{ x: 4 }}
          className={`rounded-xl border ${style.border} ${style.bg} p-4 ${hasDetails ? "cursor-pointer" : ""} transition-all`}
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
              <p
                className={`text-xs text-slate-400 mt-1 ${isExpanded ? "" : "line-clamp-2"}`}
              >
                {event.detail}
              </p>
            </div>

            {/* Chevron - only shown when details are available */}
            {hasDetails && (
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
            )}
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
                    {Object.entries(event.rawData).map(([key, value]) => (
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
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  };

  const renderGroupDivider = (group: TimeGroup) => (
    <div className="relative pl-12 py-3" key={`divider-${group}`}>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent" />
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          {TIME_GROUP_LABELS[group]}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-slate-700/50 to-transparent" />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between shrink-0"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Live Timeline
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {filteredEvents.length} events
            {activeFilter !== "all" ? ` (${activeFilter})` : ""} captured (max{" "}
            {MAX_EVENTS})
          </p>
        </div>

        {/* Auto-scroll toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAutoScroll((p) => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${
            autoScroll
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20"
              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${autoScroll ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`}
          />
          {autoScroll ? "AUTO-SCROLL" : "SCROLL PAUSED"}
        </motion.button>
      </motion.div>

      {/* ── Filter Buttons ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-2 shrink-0"
      >
        <span className="text-xs font-mono text-slate-500 mr-1">&gt; FILTER</span>
        {FILTER_OPTIONS.map(({ key, label }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveFilter(key)}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
              activeFilter === key
                ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.15)]"
                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            {label}
            {key !== "all" && (
              <span className="ml-1.5 text-[10px] opacity-60">
                {events.filter((e) => EVENT_TYPE_TO_CATEGORY[e.type] === key).length}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* ── Timeline (scrollable) ────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto pr-2"
        >
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/30 via-purple-500/30 to-emerald-400/30" />

            {filteredEvents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pl-12 py-12 text-center"
              >
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8">
                  <div className="text-slate-400 font-mono text-sm mb-2">
                    {events.length === 0
                      ? "Waiting for events..."
                      : `No ${activeFilter} events found`}
                  </div>
                  <div className="text-slate-400 font-mono text-xs">
                    {events.length === 0
                      ? "Events will appear here as agents spawn, commit, and change status via SSE."
                      : "Try a different filter or wait for new events."}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Render grouped events */}
            {filteredEvents.length > 0 && (
              <AnimatePresence initial={false}>
                {TIME_GROUP_ORDER.map((group) => {
                  const groupEvents = groupedEvents[group];
                  if (groupEvents.length === 0) return null;

                  return (
                    <div key={group}>
                      {renderGroupDivider(group)}
                      {groupEvents.map((event) => renderEvent(event))}
                    </div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Jump to latest button */}
        <AnimatePresence>
          {showJumpToLatest && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={jumpToLatest}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 font-mono text-xs backdrop-blur-sm shadow-[0_0_20px_rgba(0,212,255,0.1)] hover:bg-cyan-400/25 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                />
              </svg>
              Jump to latest
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
