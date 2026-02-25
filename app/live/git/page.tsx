"use client";

import { motion } from "framer-motion";
import { useLive } from "../LiveContext";

export default function GitPage() {
  const { gitDirs, gitInput, setGitInput, gitData, handleAddGitDir, removeGitDir } =
    useLive();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Live Git Activity
        </h2>

        {/* Add dir input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={gitInput}
            onChange={(e) => setGitInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddGitDir()}
            placeholder="/path/to/watched/directory"
            className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-md px-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={handleAddGitDir}
            className="px-4 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-xs font-mono text-purple-300 hover:bg-purple-500/30 transition-colors"
          >
            Watch
          </button>
        </div>

        {gitDirs.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No watched directories. Add a path above to monitor git activity.
          </div>
        ) : (
          <div className="grid gap-3">
            {gitDirs.map((dir) => {
              const info = gitData[dir];
              return (
                <motion.div
                  key={dir}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 truncate max-w-[400px]">
                        {dir}
                      </span>
                      {info && (
                        <>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {info.branch}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              info.clean
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {info.clean
                              ? "CLEAN"
                              : `${info.changedFiles} changed`}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => removeGitDir(dir)}
                      className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                    >
                      x
                    </button>
                  </div>

                  {info && !info.error && (
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono mb-1 block">
                          Recent Commits
                        </span>
                        <div className="space-y-1">
                          {info.recentCommits.map((c) => (
                            <div
                              key={c.hash}
                              className="text-[11px] font-mono text-slate-400 flex gap-2"
                            >
                              <span className="text-cyan-400/60 shrink-0">
                                {c.hash.slice(0, 7)}
                              </span>
                              <span className="truncate">{c.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 font-mono mb-1 block">
                          Diff Stat
                        </span>
                        <pre className="text-[11px] font-mono text-slate-500 whitespace-pre-wrap break-all">
                          {info.diffStat}
                        </pre>
                      </div>
                    </div>
                  )}

                  {info?.error && (
                    <p className="text-xs font-mono text-red-400">
                      {info.error}
                    </p>
                  )}

                  {!info && (
                    <p className="text-xs font-mono text-slate-600 animate-pulse">
                      Loading...
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
