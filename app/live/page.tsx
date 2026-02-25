"use client";

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLive } from "./LiveContext";
import type { AgentTask } from "./LiveContext";

// ─── Animated Counter ──────────────────────────────────────────────────────

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
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
      if (ref.current) ref.current.textContent = String(v);
    });
    return unsubscribe;
  }, [rounded]);

  return <span ref={ref} className={className}>0</span>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case "running":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "completed":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "failed":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

function formatDuration(task: AgentTask): string {
  const start = new Date(task.startedAt).getTime();
  const end = task.completedAt
    ? new Date(task.completedAt).getTime()
    : Date.now();
  const mins = Math.floor((end - start) / 60000);
  if (mins < 1) return "<1m";
  return `${mins}m`;
}

const navCards = [
  {
    href: "/live/tasks",
    title: "Task Queue",
    desc: "Active and completed agent tasks",
    borderClass: "border-cyan-500/20 hover:border-cyan-500/40",
    textClass: "text-cyan-400",
    icon: ">>",
  },
  {
    href: "/live/agent",
    title: "Agent Process",
    desc: "Live coding agent output and todos",
    borderClass: "border-purple-500/20 hover:border-purple-500/40",
    textClass: "text-purple-400",
    icon: "#_",
  },
  {
    href: "/live/git",
    title: "Git Activity",
    desc: "Watch directories and track commits",
    borderClass: "border-pink-500/20 hover:border-pink-500/40",
    textClass: "text-pink-400",
    icon: "~>",
  },
  {
    href: "/live/prompt",
    title: "Prompt Architecture",
    desc: "Prompts sent to coding agents",
    borderClass: "border-green-500/20 hover:border-green-500/40",
    textClass: "text-green-400",
    icon: "$:",
  },
];

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: "cyan" | "green" | "purple" | "amber";
  delay: number;
}) {
  const colorMap = {
    cyan: {
      border: "border-cyan-500/20",
      text: "text-cyan-400",
      glow: "shadow-[0_0_20px_rgba(0,212,255,0.08)]",
    },
    green: {
      border: "border-green-500/20",
      text: "text-green-400",
      glow: "shadow-[0_0_20px_rgba(34,197,94,0.08)]",
    },
    purple: {
      border: "border-purple-500/20",
      text: "text-purple-400",
      glow: "shadow-[0_0_20px_rgba(147,51,234,0.08)]",
    },
    amber: {
      border: "border-amber-500/20",
      text: "text-amber-400",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.08)]",
    },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={`bg-slate-900/50 border ${c.border} ${c.glow} rounded-xl p-5 text-center backdrop-blur-sm`}
    >
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`text-3xl font-mono font-bold ${c.text}`}>
        <AnimatedCounter value={value} />
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LiveOverviewPage() {
  const { connected, tasks, sseEventsCount, uptime, eventLog, logEndRef } =
    useLive();

  const running = tasks.filter((t) => t.status === "running");
  const activeAgents = new Set(running.map((t) => t.agent)).size;
  const currentTask = running[0] ?? null;

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* ── MISSION CONTROL Hero ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-900/80 backdrop-blur-sm p-8 md:p-12"
      >
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />

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
            <div className="flex items-center gap-3 mb-3">
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
                      ? "bg-green-400 animate-ping"
                      : "bg-red-400 animate-ping"
                  }`}
                  style={{ animationDuration: "1.5s" }}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    connected ? "bg-green-400" : "bg-red-400"
                  }`}
                />
              </motion.span>

              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                  connected
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {connected ? "CONNECTED" : "OFFLINE"}
              </motion.span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-mono font-bold tracking-tight"
            >
              <span className="text-slate-200">MISSION </span>
              <span className="text-cyan-400">CONTROL</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm font-mono text-slate-500 mt-2"
            >
              Agent Swarm Orchestration Dashboard
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-right font-mono text-xs text-slate-500 space-y-1"
          >
            <div>
              Uptime: <span className="text-green-400">{uptime}</span>
            </div>
            <div>
              Events: <span className="text-amber-400">{sseEventsCount}</span>
            </div>
            <div>
              Agents: <span className="text-purple-400">{activeAgents || "idle"}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Tasks"
          value={running.length}
          color="cyan"
          delay={0.15}
        />
        <StatCard
          label="Active Agents"
          value={activeAgents}
          color="purple"
          delay={0.25}
        />
        <StatCard
          label="Total Tasks"
          value={tasks.length}
          color="green"
          delay={0.35}
        />
        <StatCard
          label="Events Received"
          value={sseEventsCount}
          color="amber"
          delay={0.45}
        />
      </div>

      {/* ── Current Task ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Current Task
        </h2>
        {currentTask ? (
          <motion.div
            className="bg-slate-900/40 border border-purple-500/20 rounded-lg p-4 shadow-[0_0_20px_rgba(147,51,234,0.06)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-semibold text-sm text-purple-400">
                {currentTask.name}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                </span>
                RUNNING
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <span className="text-slate-500">Agent: </span>
                <span className="text-slate-300">{currentTask.agent}</span>
              </div>
              <div>
                <span className="text-slate-500">Duration: </span>
                <span className="text-slate-300">{formatDuration(currentTask)}</span>
              </div>
              <div>
                <span className="text-slate-500">Prompt: </span>
                <span className="text-slate-300">{currentTask.promptFile ?? "\u2014"}</span>
              </div>
              <div>
                <span className="text-slate-500">ID: </span>
                <span className="text-slate-300">{currentTask.id}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-xs font-mono">
            No active task. Agent idle.
          </div>
        )}
      </motion.section>

      {/* ── Event Log ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <h2 className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2">
          <span className="text-green-400/50">&gt;</span> Event Log
        </h2>
        <div className="bg-slate-950/60 border border-slate-800/50 rounded-lg p-3 h-64 overflow-y-auto font-mono text-[11px] scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {eventLog.length === 0 && (
            <p className="text-slate-600">Waiting for events...</p>
          )}
          <AnimatePresence>
            {eventLog.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 py-0.5"
              >
                <span className="text-slate-600 shrink-0">
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
                      ? "text-purple-400"
                      : "text-slate-500"
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
      </motion.section>

      {/* ── Navigation Cards ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-sm font-mono text-slate-400 mb-3 flex items-center gap-2">
          <span className="text-slate-500">&gt;</span> Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {navCards.map((card, i) => (
            <Link key={card.href} href={card.href}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 + i * 0.08 }}
                className={`bg-slate-900/40 border ${card.borderClass} rounded-lg p-4 transition-all cursor-pointer group`}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-mono ${card.textClass} opacity-50 group-hover:opacity-100 transition-opacity`}>
                    {card.icon}
                  </span>
                  <h3 className={`text-sm font-mono font-semibold ${card.textClass}`}>
                    {card.title}
                  </h3>
                </div>
                <p className="text-xs font-mono text-slate-500">{card.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
