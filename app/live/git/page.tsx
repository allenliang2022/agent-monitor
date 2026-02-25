"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLive } from "../LiveContext";
import type { GitCommit } from "../LiveContext";

// ─── Commit Timeline Item ───────────────────────────────────────────────────

function CommitNode({
  commit,
  index,
  isLast,
}: {
  commit: GitCommit;
  index: number;
  isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="relative flex gap-4"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 border-2 border-cyan-400/30 mt-1 z-10" />
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-cyan-400/20 to-slate-800/20 min-h-[32px]" />
        )}
      </div>

      {/* Commit content */}
      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs text-cyan-400/70 mr-2">
              {commit.hash.slice(0, 7)}
            </span>
            <span className="font-mono text-xs text-slate-300 break-words">
              {commit.message}
            </span>
          </div>
          {commit.time && (
            <span className="text-[10px] font-mono text-slate-600 shrink-0 whitespace-nowrap">
              {commit.time}
            </span>
          )}
        </div>
        {commit.author && (
          <div className="text-[10px] font-mono text-slate-600 mt-0.5">
            by {commit.author}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function GitPage() {
  const {
    gitDirs,
    gitInput,
    setGitInput,
    gitData,
    handleAddGitDir,
    removeGitDir,
  } = useLive();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Live Git Activity
          <span className="text-[10px] font-mono text-slate-600 ml-auto">
            auto-refresh 5s
          </span>
        </h2>

        {/* Add directory input */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={gitInput}
            onChange={(e) => setGitInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddGitDir()}
            placeholder="/path/to/watched/directory"
            className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
          />
          <button
            onClick={handleAddGitDir}
            className="px-5 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs font-mono text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/40 transition-all"
          >
            Watch
          </button>
        </div>

        {gitDirs.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8 text-center text-slate-500 text-sm font-mono">
            No watched directories. Add a path above to monitor git activity.
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {gitDirs.map((dir) => {
                const info = gitData[dir];
                return (
                  <motion.div
                    key={dir}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm"
                  >
                    {/* Directory header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/30 bg-slate-900/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-slate-400 truncate max-w-[400px]">
                          {dir}
                        </span>
                        {info && !info.error && (
                          <>
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
                              <span className="text-purple-400/50 mr-1">~</span>
                              {info.branch}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border shrink-0 ${
                                info.clean
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {info.clean
                                ? "CLEAN"
                                : `${info.changedFiles} dirty`}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => removeGitDir(dir)}
                        className="text-slate-600 hover:text-red-400 text-xs font-mono transition-colors ml-3 shrink-0 px-2 py-1 rounded hover:bg-red-500/10"
                        aria-label="Remove directory"
                      >
                        remove
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {info && !info.error && (
                        <div className="grid md:grid-cols-5 gap-6">
                          {/* Commit timeline (3/5 width) */}
                          <div className="md:col-span-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                                Recent Commits
                              </span>
                              <span className="text-[10px] text-slate-600 font-mono">
                                {info.recentCommits.length} shown
                              </span>
                            </div>
                            <div className="pl-1">
                              {info.recentCommits.length === 0 ? (
                                <p className="text-xs font-mono text-slate-600">
                                  No commits found.
                                </p>
                              ) : (
                                info.recentCommits.map((c, i) => (
                                  <CommitNode
                                    key={c.hash}
                                    commit={c}
                                    index={i}
                                    isLast={
                                      i === info.recentCommits.length - 1
                                    }
                                  />
                                ))
                              )}
                            </div>
                          </div>

                          {/* Diff stat + status (2/5 width) */}
                          <div className="md:col-span-2 space-y-4">
                            {/* Branch & Status Summary */}
                            <div>
                              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-2">
                                Status
                              </span>
                              <div className="bg-slate-950/40 rounded-lg p-3 space-y-2 text-xs font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Branch</span>
                                  <span className="text-purple-400">
                                    {info.branch}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">
                                    Working tree
                                  </span>
                                  <span
                                    className={
                                      info.clean
                                        ? "text-green-400"
                                        : "text-amber-400"
                                    }
                                  >
                                    {info.clean ? "clean" : "dirty"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">
                                    Changed files
                                  </span>
                                  <span
                                    className={
                                      info.changedFiles > 0
                                        ? "text-amber-400"
                                        : "text-slate-400"
                                    }
                                  >
                                    {info.changedFiles}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Diff stat */}
                            <div>
                              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-2">
                                Diff Stat
                              </span>
                              <pre className="bg-slate-950/40 rounded-lg p-3 text-[11px] font-mono text-slate-500 whitespace-pre-wrap break-all overflow-x-auto max-h-48 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                                {info.diffStat}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {info?.error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                          <span className="text-red-400 text-xs">!</span>
                          <p className="text-xs font-mono text-red-400">
                            {info.error}
                          </p>
                        </div>
                      )}

                      {!info && (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                            <motion.span
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                              }}
                            >
                              Loading git status...
                            </motion.span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.section>
    </div>
  );
}
