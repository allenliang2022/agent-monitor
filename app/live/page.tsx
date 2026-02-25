"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLive } from "./LiveContext";

function StatusPill({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="text-slate-500">{label}:</span>
      <span className={ok ? "text-green-400" : "text-red-400"}>{value}</span>
    </div>
  );
}

const navCards = [
  {
    href: "/live/sessions",
    title: "Sessions & Timeline",
    desc: "Active sessions table and live timeline",
    color: "cyan",
    borderClass: "border-cyan-500/20 hover:border-cyan-500/40",
    textClass: "text-cyan-400",
  },
  {
    href: "/live/agents",
    title: "Agent Status",
    desc: "Real-time status of all 3 agents",
    color: "purple",
    borderClass: "border-purple-500/20 hover:border-purple-500/40",
    textClass: "text-purple-400",
  },
  {
    href: "/live/git",
    title: "Git Activity",
    desc: "Watch directories and track commits",
    color: "pink",
    borderClass: "border-pink-500/20 hover:border-pink-500/40",
    textClass: "text-pink-400",
  },
  {
    href: "/live/config",
    title: "System Config",
    desc: "Agents, cron, skills, and channels",
    color: "amber",
    borderClass: "border-amber-500/20 hover:border-amber-500/40",
    textClass: "text-amber-400",
  },
  {
    href: "/live/prompt",
    title: "Prompt Architecture",
    desc: "Prompt design, rules, and constraints",
    color: "green",
    borderClass: "border-green-500/20 hover:border-green-500/40",
    textClass: "text-green-400",
  },
];

export default function LiveOverviewPage() {
  const {
    connected,
    sessions,
    sseEventsCount,
    uptime,
    eventLog,
    logEndRef,
  } = useLive();

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4 bg-slate-900/60 border border-slate-800/50 rounded-lg px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              connected
                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            }`}
          />
          <span className="text-xs font-mono text-slate-400">
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <StatusPill
          label="Gateway"
          value={connected ? "connected" : "disconnected"}
          ok={connected}
        />
        <StatusPill
          label="Sessions"
          value={String(sessions.length)}
          ok={sessions.length > 0}
        />
        <StatusPill
          label="Agents"
          value={String(
            new Set(sessions.map((s) => s.agentId).filter(Boolean)).size
          )}
          ok={true}
        />
        <StatusPill
          label="Active"
          value={String(
            sessions.filter((s) => (s.ageMs ?? 999999) < 300000).length
          )}
          ok={sessions.filter((s) => (s.ageMs ?? 999999) < 300000).length > 0}
        />
      </motion.div>

      {/* ── Live Overview (Mission Control) ─────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-mono text-cyan-400 flex items-center gap-2">
            <span className="text-cyan-400/50">&gt;</span> Live Overview
          </h2>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            MISSION CONTROL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            className="bg-slate-900/40 border border-cyan-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              ACTIVE SESSIONS
            </div>
            <motion.div
              key={sessions.length}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-cyan-400"
            >
              {sessions.length}
            </motion.div>
          </motion.div>

          <motion.div
            className="bg-slate-900/40 border border-purple-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              ACTIVE AGENTS
            </div>
            <motion.div
              key={
                new Set(sessions.map((s) => s.agentId).filter(Boolean)).size
              }
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-purple-400"
            >
              {new Set(sessions.map((s) => s.agentId).filter(Boolean)).size}
            </motion.div>
          </motion.div>

          <motion.div
            className="bg-slate-900/40 border border-green-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              UPTIME
            </div>
            <div className="text-2xl font-mono font-bold text-green-400">
              {uptime}
            </div>
          </motion.div>

          <motion.div
            className="bg-slate-900/40 border border-amber-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">
              EVENTS RECEIVED
            </div>
            <motion.div
              key={sseEventsCount}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-amber-400"
            >
              {sseEventsCount}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Event Log ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
                      : entry.type === "sessions"
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
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-mono text-slate-400 mb-3 flex items-center gap-2">
          <span className="text-slate-500">&gt;</span> Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {navCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <motion.div
                className={`bg-slate-900/40 border ${card.borderClass} rounded-lg p-4 transition-all cursor-pointer`}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <h3 className={`text-sm font-mono font-semibold ${card.textClass} mb-1`}>
                  {card.title}
                </h3>
                <p className="text-xs font-mono text-slate-500">{card.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
