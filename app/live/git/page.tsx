"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLive } from "../LiveContext";
import type { GitCommit } from "../LiveContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiffFileStat {
  path: string;
  additions: number;
  deletions: number;
}

interface DiffData {
  diff: string;
  files: DiffFileStat[];
  stats: { filesChanged: number; additions: number; deletions: number };
}

interface ParsedHunk {
  header: string;
  lines: { type: "add" | "del" | "ctx" | "hunk"; text: string }[];
}

interface ParsedFile {
  path: string;
  hunks: ParsedHunk[];
}

// ─── Diff Parser ──────────────────────────────────────────────────────────────

function parseDiffToFiles(raw: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  // Split on "diff --git" boundaries
  const fileSections = raw.split(/^diff --git /m).filter((s) => s.trim());

  for (const section of fileSections) {
    const lines = section.split("\n");
    // Extract file path from the first line: "a/path b/path"
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    const path = headerMatch ? headerMatch[2] : "unknown";

    const hunks: ParsedHunk[] = [];
    let currentHunk: ParsedHunk | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("@@")) {
        currentHunk = { header: line, lines: [] };
        hunks.push(currentHunk);
        currentHunk.lines.push({ type: "hunk", text: line });
      } else if (currentHunk) {
        if (line.startsWith("+")) {
          currentHunk.lines.push({ type: "add", text: line.slice(1) });
        } else if (line.startsWith("-")) {
          currentHunk.lines.push({ type: "del", text: line.slice(1) });
        } else if (line.startsWith(" ") || line === "") {
          currentHunk.lines.push({
            type: "ctx",
            text: line.startsWith(" ") ? line.slice(1) : line,
          });
        }
        // Skip other lines (index, ---, +++ headers)
      }
    }

    if (hunks.length > 0) {
      files.push({ path, hunks });
    }
  }
  return files;
}

// ─── Inline Diff Viewer ──────────────────────────────────────────────────────

function DiffViewer({
  data,
  isLoading,
  error,
}: {
  data: DiffData | null;
  isLoading: boolean;
  error: string | null;
}) {
  const [activeFile, setActiveFile] = useState(0);
  const parsedFiles = data ? parseDiffToFiles(data.diff) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-2 text-xs font-mono text-slate-500"
        >
          <svg
            className="animate-spin h-3 w-3 text-cyan-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading diff...
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg mt-2">
        <span className="text-red-400 text-xs font-mono">{error}</span>
      </div>
    );
  }

  if (!data || data.files.length === 0) {
    return (
      <div className="text-xs font-mono text-slate-600 py-3">
        No file changes in this commit.
      </div>
    );
  }

  const currentParsed = parsedFiles[activeFile];
  const currentStat = data.files[activeFile];

  return (
    <div className="mt-2 space-y-2">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-[10px] font-mono">
        <span className="text-slate-500">
          {data.stats.filesChanged} file{data.stats.filesChanged !== 1 && "s"}
        </span>
        <span className="text-green-400">+{data.stats.additions}</span>
        <span className="text-red-400">-{data.stats.deletions}</span>
      </div>

      {/* File tabs */}
      <div className="flex flex-wrap gap-1">
        {data.files.map((file, idx) => (
          <button
            key={file.path}
            onClick={(e) => {
              e.stopPropagation();
              setActiveFile(idx);
            }}
            className={`px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              idx === activeFile
                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                : "bg-slate-900/40 border-slate-700/30 text-slate-500 hover:text-slate-300 hover:border-slate-600/40"
            }`}
          >
            {file.path.split("/").pop()}
            <span className="ml-1.5 text-green-400/70">+{file.additions}</span>
            <span className="ml-1 text-red-400/70">-{file.deletions}</span>
          </button>
        ))}
      </div>

      {/* File path + per-file stats */}
      {currentStat && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
          <span className="text-slate-400 truncate">{currentStat.path}</span>
          <span className="text-green-400">+{currentStat.additions}</span>
          <span className="text-red-400">-{currentStat.deletions}</span>
        </div>
      )}

      {/* Diff content */}
      <div className="bg-slate-950/60 border border-slate-800/40 rounded-lg overflow-hidden max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
        {currentParsed && currentParsed.hunks.length > 0 ? (
          <pre className="text-[11px] font-mono leading-[1.6]">
            {currentParsed.hunks.map((hunk, hi) => (
              <div key={hi}>
                {hunk.lines.map((line, li) => {
                  let bgClass = "";
                  let textClass = "text-slate-400";
                  let prefix = " ";

                  if (line.type === "add") {
                    bgClass = "bg-green-500/10";
                    textClass = "text-green-400";
                    prefix = "+";
                  } else if (line.type === "del") {
                    bgClass = "bg-red-500/10";
                    textClass = "text-red-400";
                    prefix = "-";
                  } else if (line.type === "hunk") {
                    bgClass = "bg-blue-500/8";
                    textClass = "text-blue-400/60";
                    prefix = "";
                  }

                  return (
                    <div
                      key={`${hi}-${li}`}
                      className={`px-3 ${bgClass} border-l-2 ${
                        line.type === "add"
                          ? "border-green-500/40"
                          : line.type === "del"
                            ? "border-red-500/40"
                            : "border-transparent"
                      }`}
                    >
                      <span className={textClass}>
                        {line.type === "hunk" ? line.text : `${prefix} ${line.text}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </pre>
        ) : (
          <div className="p-4 text-xs font-mono text-slate-600">
            Binary file or no displayable diff for this file.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Commit Timeline Item ───────────────────────────────────────────────────

function CommitNode({
  commit,
  index,
  isLast,
  dir,
}: {
  commit: GitCommit;
  index: number;
  isLast: boolean;
  dir: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDiff = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);

    // Only fetch if we don't have data yet
    if (diffData) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/git-diff?dir=${encodeURIComponent(dir)}&hash=${encodeURIComponent(commit.hash)}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDiffData(data);
      }
    } catch {
      setError("Failed to fetch diff");
    } finally {
      setIsLoading(false);
    }
  }, [expanded, diffData, dir, commit.hash]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="relative flex gap-4"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1 z-10 transition-colors ${
            expanded
              ? "bg-purple-400/80 border-2 border-purple-400/30"
              : "bg-cyan-400/80 border-2 border-cyan-400/30"
          }`}
        />
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-cyan-400/20 to-slate-800/20 min-h-[32px]" />
        )}
      </div>

      {/* Commit content */}
      <div className="pb-4 min-w-0 flex-1">
        <button
          onClick={toggleDiff}
          className="w-full text-left group cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="font-mono text-xs text-cyan-400/70 mr-2 group-hover:text-cyan-300 transition-colors">
                {commit.hash.slice(0, 7)}
              </span>
              <span className="font-mono text-xs text-slate-300 break-words group-hover:text-slate-100 transition-colors">
                {commit.message}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {commit.time && (
                <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap">
                  {commit.time}
                </span>
              )}
              <motion.span
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-600 text-xs font-mono"
              >
                ▸
              </motion.span>
            </div>
          </div>
          {commit.author && (
            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
              by {commit.author}
            </div>
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <DiffViewer
                data={diffData}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
                                {info.recentCommits.length} shown &middot; click
                                to expand
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
                                    dir={dir}
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
