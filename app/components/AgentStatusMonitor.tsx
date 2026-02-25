"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import sessionData from "@/data/swarm-session.json";

interface CheckResult {
  tmux?: string;
  changedFiles?: string[];
  newDirs?: string[];
  framerMotion?: string;
  components?: string[];
  libFiles?: string[];
  totalChanged?: number;
  commitExists?: boolean;
  commitHash?: string;
  commitMessage?: string;
  dirtyFiles?: number;
  compiled?: boolean;
  typescript?: string;
  staticPages?: string;
  buildTime?: string;
}

const checks = sessionData.timeline.filter(
  (e) => e.event === "check" || e.event === "verify"
);

export default function AgentStatusMonitor() {
  const [activeCheck, setActiveCheck] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setActiveCheck((prev) => (prev + 1) % checks.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Agent Status Monitor
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-1 font-mono">
                {checks.length} monitoring checks during session
              </p>
            </div>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                isAnimating
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                  : "border-slate-600 bg-slate-800 text-slate-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAnimating ? "bg-emerald-400 animate-pulse-dot" : "bg-slate-500"}`} />
              {isAnimating ? "LIVE" : "PAUSED"}
            </button>
          </div>
        </motion.div>

        {/* Check selector tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {checks.map((check, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveCheck(i);
                setIsAnimating(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs whitespace-nowrap border transition-all ${
                activeCheck === i
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-400"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeCheck === i ? "bg-cyan-400" : "bg-slate-600"}`} />
              {check.title}
            </button>
          ))}
        </div>

        {/* Active check display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCheck}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <CheckDisplay check={checks[activeCheck]} index={activeCheck} total={checks.length} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function CheckDisplay({
  check,
  index,
  total,
}: {
  check: (typeof checks)[number];
  index: number;
  total: number;
}) {
  const results = (check.results || {}) as CheckResult;
  const tmuxStatus = results.tmux || (results.compiled ? "BUILD" : "N/A");
  const isAlive = tmuxStatus === "ALIVE";
  const isDead = tmuxStatus === "DEAD";
  const isBuild = tmuxStatus === "BUILD";
  const components = results.components || [];
  const totalComponents = 13;
  const progress = Math.round((components.length / totalComponents) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Tmux Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`rounded-xl border p-5 ${
          isAlive
            ? "border-emerald-400/20 bg-emerald-400/5 glow-green"
            : isDead
            ? "border-red-400/20 bg-red-400/5"
            : isBuild
            ? "border-emerald-400/20 bg-emerald-400/5 glow-green"
            : "border-slate-700 bg-slate-800/50"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            tmux session
          </span>
          <span className="text-xs font-mono text-slate-500">{check.time}</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={isAlive ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1.5, repeat: isAlive ? Infinity : 0 }}
            className={`px-3 py-1 rounded-full font-mono text-sm font-bold ${
              isAlive
                ? "bg-emerald-400/20 text-emerald-400"
                : isDead
                ? "bg-red-400/20 text-red-400"
                : isBuild
                ? "bg-emerald-400/20 text-emerald-400"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {tmuxStatus}
          </motion.div>
          <span className="font-mono text-sm text-slate-400">agent-animations</span>
        </div>

        <div className="text-sm text-slate-400">
          Check #{index + 1} of {total}
        </div>
      </motion.div>

      {/* Components Progress Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            Components Progress
          </span>
          <span className="text-cyan-400 font-mono text-sm font-bold">
            {components.length}/{totalComponents}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
          />
        </div>

        {components.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {components.map((comp, i) => (
              <motion.span
                key={comp}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
              >
                {comp}
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Files Detected Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5"
      >
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
          Files Detected
        </span>
        <div className="mt-3">
          {results.changedFiles ? (
            <div className="space-y-1">
              {results.changedFiles.map((file) => (
                <div key={file} className="flex items-center gap-2 text-sm font-mono">
                  <span className="text-purple-500">+</span>
                  <span className="text-slate-300">{file}</span>
                </div>
              ))}
            </div>
          ) : results.totalChanged ? (
            <div className="text-2xl font-bold font-mono text-purple-500">
              {results.totalChanged} files
            </div>
          ) : results.dirtyFiles !== undefined ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">{results.dirtyFiles}</span>
              <span className="text-sm text-slate-400">dirty files (clean worktree)</span>
            </div>
          ) : results.staticPages ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Static pages</span>
                <span className="font-mono text-emerald-400">{results.staticPages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Build time</span>
                <span className="font-mono text-emerald-400">{results.buildTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">TypeScript</span>
                <span className="font-mono text-emerald-400">{results.typescript}</span>
              </div>
            </div>
          ) : (
            <span className="text-slate-500 text-sm">No file data for this check</span>
          )}
        </div>
      </motion.div>

      {/* Git Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-5"
      >
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
          Git Status
        </span>
        <div className="mt-3 space-y-2">
          {results.commitExists !== undefined && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${results.commitExists ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-sm text-slate-300">
                Commit: {results.commitExists ? "exists" : "pending"}
              </span>
            </div>
          )}
          {results.commitHash && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                {results.commitHash}
              </span>
              <span className="text-xs text-slate-400 truncate">{results.commitMessage}</span>
            </div>
          )}
          {results.framerMotion && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-slate-300">{results.framerMotion}</span>
            </div>
          )}
          {results.newDirs && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-sm text-slate-300">New: {results.newDirs.join(", ")}</span>
            </div>
          )}
          {results.libFiles && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-sm text-slate-300">Lib: {results.libFiles.join(", ")}</span>
            </div>
          )}
          {"assessment" in check && check.assessment && (
            <div className="mt-3 pt-3 border-t border-slate-700/30">
              <span className="text-xs font-mono text-slate-500 block mb-1">ASSESSMENT</span>
              <span className="text-sm text-emerald-400">{check.assessment as string}</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
