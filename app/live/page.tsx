"use client";

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useMemo } from "react";
import { useLive } from "./LiveContext";

// ─── Animated Counter ──────────────────────────────────────────────────────

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v}${suffix}`;
    });
    return unsubscribe;
  }, [rounded, prefix, suffix]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

const colorMap = {
  cyan: {
    border: "border-cyan-400/20",
    text: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  emerald: {
    border: "border-emerald-400/20",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  purple: {
    border: "border-purple-500/20",
    text: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  amber: {
    border: "border-amber-400/20",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
  },
};

function StatCard({
  label,
  value,
  prefix,
  suffix,
  color,
  delay,
  icon,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color: keyof typeof colorMap;
  delay: number;
  icon: React.ReactNode;
}) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={`relative rounded-xl border ${c.border} ${c.bg} p-5 overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none" />
      <div className="relative">
        <div className={`flex items-center gap-2 ${c.text} mb-3`}>
          {icon}
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            {label}
          </span>
        </div>
        <div className={`text-3xl sm:text-4xl font-bold font-mono ${c.text}`}>
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Nav Cards ──────────────────────────────────────────────────────────────

// SVG icon components for nav cards
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function RobotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m3.75-1.5v1.5m-7.5 15V21M12 19.5V21m3.75-1.5V21m-9-16.5h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25v-7.5A2.25 2.25 0 0 1 6.75 4.5ZM9 10.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}
function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}
function BranchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}
function PromptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

interface NavCard {
  href: string;
  title: string;
  desc: string;
  borderClass: string;
  textClass: string;
  glowColor: string;
  icon: React.ReactNode;
  badgeKey: "events" | "agents" | "tasks" | "commits" | "prompts";
}

const navCards: NavCard[] = [
  {
    href: "/live/timeline",
    title: "Live Timeline",
    desc: "Real-time events as agents work",
    borderClass: "border-cyan-400/20 hover:border-cyan-400/50",
    textClass: "text-cyan-400",
    glowColor: "rgba(34,211,238,0.08)",
    icon: <ClockIcon className="w-5 h-5" />,
    badgeKey: "events",
  },
  {
    href: "/live/agents",
    title: "Agent Monitor",
    desc: "Active agent cards with status & logs",
    borderClass: "border-purple-500/20 hover:border-purple-500/50",
    textClass: "text-purple-500",
    glowColor: "rgba(168,85,247,0.08)",
    icon: <RobotIcon className="w-5 h-5" />,
    badgeKey: "agents",
  },
  {
    href: "/live/tasks",
    title: "Task Queue",
    desc: "Active and completed agent tasks",
    borderClass: "border-amber-400/20 hover:border-amber-400/50",
    textClass: "text-amber-400",
    glowColor: "rgba(251,191,36,0.08)",
    icon: <TaskIcon className="w-5 h-5" />,
    badgeKey: "tasks",
  },
  {
    href: "/live/git",
    title: "Git Activity",
    desc: "Watch directories and track commits",
    borderClass: "border-emerald-400/20 hover:border-emerald-400/50",
    textClass: "text-emerald-400",
    glowColor: "rgba(52,211,153,0.08)",
    icon: <BranchIcon className="w-5 h-5" />,
    badgeKey: "commits",
  },
  {
    href: "/live/prompt",
    title: "Prompt Architecture",
    desc: "Prompts sent to coding agents",
    borderClass: "border-purple-500/20 hover:border-purple-500/50",
    textClass: "text-purple-500",
    glowColor: "rgba(168,85,247,0.08)",
    icon: <PromptIcon className="w-5 h-5" />,
    badgeKey: "prompts",
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LiveOverviewPage() {
  const {
    connected,
    tasks,
    fileChanges,
    gitData,
    sseEventsCount,
    uptime,
    eventLog,
    logEndRef,
  } = useLive();

  const activeAgents = tasks.filter((t) => t.status === "running").length;
  const totalTasks = tasks.length;

  const totalFilesChanged = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(fileChanges)) {
      count += fileChanges[key].files.length;
    }
    return count;
  }, [fileChanges]);

  const totalCommits = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(gitData)) {
      const info = gitData[key];
      if (info.recentCommits) count += info.recentCommits.length;
    }
    return count;
  }, [gitData]);

  // Badge counts for nav cards
  const badgeCounts = useMemo(
    () => ({
      events: sseEventsCount,
      agents: activeAgents,
      tasks: totalTasks,
      commits: totalCommits,
      prompts: 0, // prompts are loaded on-demand
    }),
    [sseEventsCount, activeAgents, totalTasks, totalCommits]
  );

  return (
    <div className="p-4 md:p-8 pt-6 space-y-8 max-w-7xl mx-auto">
      {/* ── MISSION CONTROL Hero ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-900/80 backdrop-blur-sm p-8 md:p-12"
      >
        {/* Scan line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: "200%" }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
            style={{ willChange: "transform" }}
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3 mt-4">
              {/* Animated pulse dot */}
              <motion.span
                className="relative flex h-3 w-3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    connected
                      ? "bg-emerald-400 animate-ping"
                      : "bg-red-400 animate-ping"
                  }`}
                  style={{ animationDuration: "1.5s" }}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    connected ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </motion.span>

              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                  connected
                    ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
                    : "bg-red-400/10 text-red-400 border-red-400/20"
                }`}
              >
                {connected ? "CONNECTED" : "OFFLINE"}
              </motion.span>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-400 text-sm font-mono mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              MISSION CONTROL
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold tracking-tight"
            >
              <span className="text-slate-200">Agent Swarm </span>
              <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Monitor
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm font-mono text-slate-400 mt-2"
            >
              Real-time orchestration dashboard
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-right font-mono text-xs text-slate-400 space-y-1"
          >
            <div>
              Uptime: <span className="text-emerald-400">{uptime}</span>
            </div>
            <div>
              SSE Events:{" "}
              <span className="text-amber-400">{sseEventsCount}</span>
            </div>
            <div>
              Active:{" "}
              <span className="text-purple-500">
                {activeAgents || "idle"}
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Agents"
          value={activeAgents}
          color="cyan"
          delay={0.15}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          }
        />
        <StatCard
          label="Total Tasks"
          value={totalTasks}
          color="purple"
          delay={0.25}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
              />
            </svg>
          }
        />
        <StatCard
          label="Files Changed"
          value={totalFilesChanged}
          color="emerald"
          delay={0.35}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          }
        />
        <StatCard
          label="Total Commits"
          value={totalCommits}
          color="amber"
          delay={0.45}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
              />
            </svg>
          }
        />
      </div>

      {/* ── Event Log ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <h2 className="text-sm font-mono text-emerald-400 mb-3 flex items-center gap-2">
          <span className="text-emerald-400/50">&gt;</span> Event Log
        </h2>

        {totalTasks === 0 && eventLog.length === 0 ? (
          /* ── Empty State ─────────────────────────────────────────────── */
          <div className="relative bg-slate-900/50 border border-slate-700 rounded-xl p-10 flex flex-col items-center justify-center text-center overflow-hidden">
            {/* Subtle pulsing background glow */}
            <motion.div
              animate={{ opacity: [0.03, 0.08, 0.03] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-purple-500/10 pointer-events-none"
            />

            {/* Animated terminal icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mb-6"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/15 to-purple-500/15 border border-cyan-400/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
              </motion.div>
              {/* Pulse ring */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl border border-cyan-400/20"
              />
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-lg font-semibold text-slate-200 mb-2"
            >
              Ready to orchestrate
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-sm font-mono text-slate-400 mb-6 max-w-sm"
            >
              Spawn your first agent task to see the dashboard come alive
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <Link
                href="/live/tasks"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-500/50 transition-all font-mono text-sm font-semibold group"
              >
                <span className="text-base leading-none group-hover:scale-110 transition-transform">+</span>
                New Task
              </Link>
            </motion.div>
          </div>
        ) : (
          /* ── Normal Event Log ────────────────────────────────────────── */
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 h-64 overflow-y-auto font-mono text-[11px]">
            {eventLog.length === 0 && (
              <p className="text-slate-400">Waiting for events...</p>
            )}
            <AnimatePresence>
              {eventLog.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 py-0.5"
                >
                  <span className="text-slate-400 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`shrink-0 w-16 ${
                      entry.type === "error" || entry.type === "git-error"
                        ? "text-red-400"
                        : entry.type === "system"
                          ? "text-amber-400"
                          : entry.type === "agent"
                            ? "text-cyan-400"
                            : entry.type === "git"
                              ? "text-purple-500"
                              : "text-slate-400"
                    }`}
                  >
                    [{entry.type}]
                  </span>
                  <span className="text-slate-300">{entry.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        )}
      </motion.section>

      {/* ── Navigation Cards ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-sm font-mono text-slate-300 mb-3 flex items-center gap-2">
          <span className="text-slate-400">&gt;</span> Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {navCards.map((card, i) => {
            const count = badgeCounts[card.badgeKey];
            return (
              <Link key={card.href} href={card.href}>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 + i * 0.08 }}
                  className={`relative bg-slate-900/50 border ${card.borderClass} rounded-lg p-4 transition-all cursor-pointer group overflow-hidden`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  style={{
                    boxShadow: "none",
                  }}
                  onHoverStart={(e) => {
                    const el = e.target as HTMLElement;
                    const container = el.closest("[style]") as HTMLElement;
                    if (container) container.style.boxShadow = `0 0 24px 2px ${card.glowColor}, 0 0 48px 4px ${card.glowColor}`;
                  }}
                  onHoverEnd={(e) => {
                    const el = e.target as HTMLElement;
                    const container = el.closest("[style]") as HTMLElement;
                    if (container) container.style.boxShadow = "none";
                  }}
                >
                  {/* Subtle background glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at center, ${card.glowColor} 0%, transparent 70%)`,
                    }}
                  />

                  <div className="relative">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span
                        className={`${card.textClass} opacity-60 group-hover:opacity-100 transition-opacity`}
                      >
                        {card.icon}
                      </span>
                      <h3
                        className={`text-sm font-mono font-semibold ${card.textClass}`}
                      >
                        {card.title}
                      </h3>
                      {count > 0 && (
                        <span
                          className={`ml-auto text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${card.textClass} bg-slate-800/80 border border-slate-700/50`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      {card.desc}
                    </p>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
