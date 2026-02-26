"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLive } from "../LiveContext";
import type { GitCommit, GitBranch } from "../LiveContext";
import { GitSkeleton, useMinimumLoading } from "../components/LoadingSkeleton";

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

type BranchFilter = "all" | "main" | "feature";

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANCH_COLORS = [
  "#00d4ff", // cyan (main)
  "#9333ea", // purple
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // teal
  "#8b5cf6", // violet
];

// ─── Diff Parser ──────────────────────────────────────────────────────────────

function parseDiffToFiles(raw: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const fileSections = raw.split(/^diff --git /m).filter((s) => s.trim());

  for (const section of fileSections) {
    const lines = section.split("\n");
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
      }
    }

    if (hunks.length > 0) {
      files.push({ path, hunks });
    }
  }
  return files;
}

// ─── Branch Graph (SVG) ──────────────────────────────────────────────────────

function BranchGraph({
  branches,
  mainBranch,
  currentBranch,
}: {
  branches: GitBranch[];
  mainBranch: string;
  currentBranch: string;
}) {
  const featureBranches = branches.filter(
    (b) => b.name !== mainBranch && !b.name.startsWith("origin/")
  );

  if (featureBranches.length === 0 && branches.length <= 1) {
    return null;
  }

  const graphWidth = Math.max(600, featureBranches.length * 160 + 200);
  const graphHeight = 160;
  const mainY = graphHeight / 2;
  const startX = 40;
  const endX = graphWidth - 40;
  const mainLineLen = endX - startX;

  // Position branches evenly along the main line
  const branchSpacing = featureBranches.length > 0
    ? mainLineLen / (featureBranches.length + 1)
    : mainLineLen;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          Branch Graph
        </span>
        <span className="text-[10px] font-mono text-slate-600">
          {branches.length} branch{branches.length !== 1 && "es"}
        </span>
      </div>
      <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 overflow-x-auto scrollbar-hide">
        <svg
          width={graphWidth}
          height={graphHeight}
          viewBox={`0 0 ${graphWidth} ${graphHeight}`}
          className="w-full min-w-[500px]"
        >
          <defs>
            {/* Pulse animation for active branches */}
            <filter id="glow-cyan">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {BRANCH_COLORS.map((color, i) => (
              <filter key={i} id={`glow-${i}`}>
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feFlood floodColor={color} floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="coloredBlur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Main branch line */}
          <line
            x1={startX}
            y1={mainY}
            x2={endX}
            y2={mainY}
            stroke={BRANCH_COLORS[0]}
            strokeWidth="2.5"
            strokeOpacity="0.7"
          />

          {/* Main branch start dot */}
          <circle
            cx={startX}
            cy={mainY}
            r="5"
            fill={BRANCH_COLORS[0]}
            fillOpacity="0.9"
            filter="url(#glow-cyan)"
          />

          {/* Main branch end dot (HEAD) */}
          <circle
            cx={endX}
            cy={mainY}
            r="6"
            fill={BRANCH_COLORS[0]}
            fillOpacity="0.9"
            filter="url(#glow-cyan)"
          >
            <animate
              attributeName="r"
              values="5;7;5"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Main branch label */}
          <text
            x={startX}
            y={mainY + 22}
            fill={BRANCH_COLORS[0]}
            fontSize="11"
            fontFamily="monospace"
            textAnchor="start"
          >
            {mainBranch}
          </text>

          {/* Feature branches */}
          {featureBranches.map((branch, i) => {
            const colorIdx = (i + 1) % BRANCH_COLORS.length;
            const color = BRANCH_COLORS[colorIdx];
            const branchX = startX + branchSpacing * (i + 1);
            const branchY = i % 2 === 0 ? mainY - 45 : mainY + 45;
            const isCurrent = branch.name === currentBranch;
            const isMerged = branch.merged;

            // Fork point and merge point
            const forkX = branchX - 30;
            const mergeX = branchX + 30;

            // Build path: fork from main -> up/down -> across -> merge back
            const forkPath = `M ${forkX} ${mainY} C ${forkX + 10} ${mainY}, ${branchX - 20} ${branchY}, ${branchX} ${branchY}`;
            const mergePath = isMerged
              ? `M ${branchX} ${branchY} C ${branchX + 20} ${branchY}, ${mergeX - 10} ${mainY}, ${mergeX} ${mainY}`
              : "";

            // Status-based styling
            const strokeDasharray = !isMerged && !isCurrent ? "6,4" : "none";
            const strokeOpacity = isMerged ? 0.5 : 0.8;

            return (
              <g key={branch.name}>
                {/* Fork path */}
                <path
                  d={forkPath}
                  stroke={color}
                  strokeWidth="2"
                  strokeOpacity={strokeOpacity}
                  strokeDasharray={strokeDasharray}
                  fill="none"
                />

                {/* Merge path (if merged) */}
                {isMerged && mergePath && (
                  <path
                    d={mergePath}
                    stroke={color}
                    strokeWidth="2"
                    strokeOpacity={0.4}
                    fill="none"
                  />
                )}

                {/* Dangling end for unmerged */}
                {!isMerged && (
                  <line
                    x1={branchX}
                    y1={branchY}
                    x2={branchX + 25}
                    y2={branchY}
                    stroke={color}
                    strokeWidth="2"
                    strokeOpacity={strokeOpacity}
                    strokeDasharray={strokeDasharray}
                  />
                )}

                {/* Branch dot */}
                <circle
                  cx={branchX}
                  cy={branchY}
                  r={isCurrent ? 5 : 4}
                  fill={color}
                  fillOpacity={isMerged ? 0.5 : 0.9}
                  filter={isCurrent ? `url(#glow-${colorIdx})` : undefined}
                >
                  {isCurrent && (
                    <animate
                      attributeName="r"
                      values="4;6;4"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>

                {/* Fork point on main */}
                <circle
                  cx={forkX}
                  cy={mainY}
                  r="3"
                  fill={color}
                  fillOpacity={0.6}
                />

                {/* Merge point on main */}
                {isMerged && (
                  <circle
                    cx={mergeX}
                    cy={mainY}
                    r="3"
                    fill={color}
                    fillOpacity={0.4}
                  />
                )}

                {/* Branch label */}
                <text
                  x={branchX}
                  y={branchY + (i % 2 === 0 ? -12 : 18)}
                  fill={color}
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  opacity={isMerged ? 0.5 : 0.9}
                >
                  {branch.name.length > 18
                    ? branch.name.slice(0, 16) + ".."
                    : branch.name}
                </text>

                {/* Status badge */}
                <text
                  x={branchX}
                  y={branchY + (i % 2 === 0 ? -24 : 30)}
                  fill={isMerged ? "#22c55e" : isCurrent ? color : "#94a3b8"}
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                  opacity={0.7}
                >
                  {isMerged ? "merged" : isCurrent ? "active" : "open"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </motion.div>
  );
}

// ─── Inline Diff Viewer ──────────────────────────────────────────────────────

function DiffViewer({
  data,
  isLoading,
  error,
  maxLinesPerFile = 20,
}: {
  data: DiffData | null;
  isLoading: boolean;
  error: string | null;
  maxLinesPerFile?: number;
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

  // Limit lines shown per file for the preview
  const truncatedHunks = currentParsed?.hunks.map((hunk) => {
    let lineCount = 0;
    const truncatedLines = hunk.lines.filter(() => {
      if (lineCount >= maxLinesPerFile) return false;
      lineCount++;
      return true;
    });
    const wasTruncated = hunk.lines.length > truncatedLines.length;
    return { ...hunk, lines: truncatedLines, wasTruncated };
  });

  return (
    <div className="mt-3 space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-[10px] font-mono">
        <span className="text-slate-500">
          {data.stats.filesChanged} file{data.stats.filesChanged !== 1 && "s"}
        </span>
        <span className="text-green-400">+{data.stats.additions}</span>
        <span className="text-red-400">-{data.stats.deletions}</span>
      </div>

      {/* File list with stats */}
      <div className="space-y-1">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          Files Changed
        </span>
        <div className="grid gap-1">
          {data.files.map((file, idx) => {
            const total = file.additions + file.deletions;
            const addPct = total > 0 ? (file.additions / total) * 100 : 0;
            return (
              <button
                key={file.path}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFile(idx);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-mono rounded-md border transition-all text-left ${
                  idx === activeFile
                    ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-300"
                    : "bg-slate-900/30 border-slate-800/30 text-slate-400 hover:text-slate-200 hover:border-slate-700/40"
                }`}
              >
                <span className="truncate flex-1">{file.path}</span>
                <span className="text-green-400/70 shrink-0">+{file.additions}</span>
                <span className="text-red-400/70 shrink-0">-{file.deletions}</span>
                {/* Mini change bar */}
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(5, (total / 50) * 100))}%`,
                      background: `linear-gradient(to right, #22c55e ${addPct}%, #ef4444 ${addPct}%)`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Diff preview (first N lines per file) */}
      {currentStat && (
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mb-1">
            <span className="text-slate-400 truncate">{currentStat.path}</span>
            <span className="text-slate-700">|</span>
            <span className="text-green-400">+{currentStat.additions}</span>
            <span className="text-red-400">-{currentStat.deletions}</span>
            <span className="text-slate-600 ml-auto">preview ({maxLinesPerFile} lines max)</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/40 rounded-lg overflow-hidden max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
            {truncatedHunks && truncatedHunks.length > 0 ? (
              <pre className="text-[11px] font-mono leading-[1.6]">
                {truncatedHunks.map((hunk, hi) => (
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
                    {hunk.wasTruncated && (
                      <div className="px-3 py-1 bg-slate-800/30 text-slate-600 text-[10px] font-mono italic">
                        ... truncated (showing first {maxLinesPerFile} lines)
                      </div>
                    )}
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
      )}
    </div>
  );
}

// ─── Branch Badge ────────────────────────────────────────────────────────────

function BranchBadge({ name, isMain }: { name: string; isMain: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded-md border ${
        isMain
          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
      }`}
    >
      {name}
    </span>
  );
}

// ─── Commit Node (with expandable details) ──────────────────────────────────

function CommitNode({
  commit,
  index,
  isLast,
  dir,
  mainBranch,
}: {
  commit: GitCommit;
  index: number;
  isLast: boolean;
  dir: string;
  mainBranch: string;
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

  // Extract branch names from refs
  const commitBranches = (commit.refs || [])
    .map((r) => r.replace("HEAD -> ", "").replace("origin/", "").trim())
    .filter((r) => r && !r.startsWith("tag:"));
  const uniqueBranches = [...new Set(commitBranches)];

  const isMergeCommit = (commit.parents?.length || 0) > 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="relative flex gap-4"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1 z-10 transition-colors ${
            isMergeCommit
              ? "bg-green-400/80 border-2 border-green-400/30"
              : expanded
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
              {isMergeCommit && (
                <span className="text-[9px] font-mono text-green-400/60 bg-green-500/10 border border-green-500/15 px-1 py-0.5 rounded mr-1.5">
                  merge
                </span>
              )}
              {uniqueBranches.map((b) => (
                <BranchBadge key={b} name={b} isMain={b === mainBranch} />
              ))}
              {uniqueBranches.length > 0 && <span className="mr-1.5" />}
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
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2 pl-0">
                {/* Full commit message */}
                <div className="bg-slate-950/40 border border-slate-800/30 rounded-lg p-3 mb-3">
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1">
                    Commit Message
                  </span>
                  <p className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {commit.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-600">
                    <span>
                      SHA: <span className="text-cyan-400/60">{commit.hash}</span>
                    </span>
                    {commit.author && (
                      <span>
                        Author: <span className="text-slate-400">{commit.author}</span>
                      </span>
                    )}
                    {commit.parents && commit.parents.length > 0 && (
                      <span>
                        Parent{commit.parents.length > 1 ? "s" : ""}:{" "}
                        {commit.parents.map((p) => (
                          <span key={p} className="text-cyan-400/50 mr-1">
                            {p.slice(0, 7)}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Diff viewer with file list and preview */}
                <DiffViewer
                  data={diffData}
                  isLoading={isLoading}
                  error={error}
                  maxLinesPerFile={20}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Search Bar ─────────────────────────────────────────────────────────────

function CommitSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search commits by message, author, or file..."
        className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Branch Filter ──────────────────────────────────────────────────────────

function BranchFilterBar({
  active,
  onChange,
  branchCount,
}: {
  active: BranchFilter;
  onChange: (f: BranchFilter) => void;
  branchCount: { all: number; main: number; feature: number };
}) {
  const filters: { key: BranchFilter; label: string; count: number }[] = [
    { key: "all", label: "All branches", count: branchCount.all },
    { key: "main", label: "Main only", count: branchCount.main },
    { key: "feature", label: "Feature branches", count: branchCount.feature },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-lg border transition-all ${
            active === f.key
              ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
              : "bg-slate-900/40 border-slate-800/40 text-slate-500 hover:text-slate-300 hover:border-slate-700/40"
          }`}
        >
          {f.label}
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] ${
              active === f.key
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-slate-800/60 text-slate-600"
            }`}
          >
            {f.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Helper: extract directory basename ────────────────────────────────────

function dirBasename(dir: string): string {
  return dir.replace(/\/+$/, "").split("/").pop() || dir;
}

// ─── Tab Content: renders a single directory's git info ────────────────────

function TabContent({
  dir,
  info,
}: {
  dir: string;
  info: ReturnType<typeof useLive>["gitData"][string] | undefined;
}) {
  const [branchFilter, setBranchFilter] = useState<BranchFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDiffCache, setSearchDiffCache] = useState<Record<string, string[]>>({});
  const searchCacheFetchedRef = useRef(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // If info is undefined for more than 10s, show an error instead of loading forever
  useEffect(() => {
    if (info) {
      setLoadingTimeout(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimeout(true), 10000);
    return () => clearTimeout(timer);
  }, [info]);

  // Fetch file names for commits to enable file-name search
  // Only fetch once per tab to avoid excessive API calls
  useEffect(() => {
    if (!info || searchCacheFetchedRef.current) return;
    searchCacheFetchedRef.current = true;

    const fetchFileNames = async () => {
      const cache: Record<string, string[]> = {};
      for (const commit of info.recentCommits.slice(0, 20)) {
        try {
          const res = await fetch(
            `/api/git-diff?dir=${encodeURIComponent(dir)}&hash=${encodeURIComponent(commit.hash)}`
          );
          const data = await res.json();
          if (data.files) {
            cache[commit.hash] = data.files.map((f: DiffFileStat) => f.path);
          }
        } catch {
          // silently skip
        }
      }
      setSearchDiffCache(cache);
    };

    fetchFileNames();
  }, [info, dir]);

  // Reset cache ref when dir changes
  useEffect(() => {
    searchCacheFetchedRef.current = false;
    setSearchDiffCache({});
  }, [dir]);

  const mainBranch = info?.mainBranch || info?.branch || "main";
  const branches = info?.branches || [];

  // Filter commits based on branch filter and search
  const filteredCommits = useMemo(() => {
    if (!info) return [];

    let commits = info.recentCommits;

    // Branch filter
    if (branchFilter === "main") {
      commits = commits.filter((c) => {
        const refs = (c.refs || []).map((r) =>
          r.replace("HEAD -> ", "").replace("origin/", "").trim()
        );
        // Include if commit has the main branch ref or has no branch-specific ref
        // (commits on main without explicit decoration)
        return (
          refs.includes(mainBranch) ||
          refs.length === 0 ||
          refs.every(
            (r) =>
              r === mainBranch ||
              r.startsWith("tag:") ||
              r === "HEAD"
          )
        );
      });
    } else if (branchFilter === "feature") {
      commits = commits.filter((c) => {
        const refs = (c.refs || []).map((r) =>
          r.replace("HEAD -> ", "").replace("origin/", "").trim()
        );
        return refs.some(
          (r) => r !== mainBranch && !r.startsWith("tag:") && r !== "HEAD" && r !== ""
        );
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      commits = commits.filter((c) => {
        // Match commit message
        if (c.message.toLowerCase().includes(q)) return true;
        // Match author
        if (c.author?.toLowerCase().includes(q)) return true;
        // Match hash
        if (c.hash.toLowerCase().startsWith(q)) return true;
        // Match file names from cache
        const files = searchDiffCache[c.hash] || [];
        if (files.some((f) => f.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    return commits;
  }, [info, branchFilter, searchQuery, mainBranch, searchDiffCache]);

  // Count commits per filter
  const branchCount = useMemo(() => {
    if (!info) return { all: 0, main: 0, feature: 0 };
    const all = info.recentCommits.length;
    const mainCommits = info.recentCommits.filter((c) => {
      const refs = (c.refs || []).map((r) =>
        r.replace("HEAD -> ", "").replace("origin/", "").trim()
      );
      return (
        refs.includes(mainBranch) ||
        refs.length === 0 ||
        refs.every(
          (r) =>
            r === mainBranch ||
            r.startsWith("tag:") ||
            r === "HEAD"
        )
      );
    }).length;
    return { all, main: mainCommits, feature: all - mainCommits };
  }, [info, mainBranch]);

  if (!info) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2 text-xs font-mono text-slate-600">
          {loadingTimeout ? (
            <>
              <span className="text-amber-400/80">Could not load git status for this directory.</span>
              <span className="text-slate-600 text-[10px]">{dir}</span>
            </>
          ) : (
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading git status...
            </motion.span>
          )}
        </div>
      </div>
    );
  }

  if (info.error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
        <span className="text-red-400 text-xs">!</span>
        <p className="text-xs font-mono text-red-400">{info.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Branch Graph */}
      <BranchGraph
        branches={branches}
        mainBranch={mainBranch}
        currentBranch={info.branch}
      />

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <CommitSearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <BranchFilterBar
          active={branchFilter}
          onChange={setBranchFilter}
          branchCount={branchCount}
        />
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Commit timeline (3/5 width) */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              {searchQuery
                ? `Search Results`
                : branchFilter === "all"
                  ? "Recent Commits"
                  : branchFilter === "main"
                    ? "Main Branch Commits"
                    : "Feature Branch Commits"}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">
              {filteredCommits.length}
              {searchQuery || branchFilter !== "all"
                ? ` of ${info.recentCommits.length}`
                : ""}{" "}
              shown &middot; click to expand
            </span>
          </div>
          <div className="pl-1">
            <AnimatePresence mode="popLayout">
              {filteredCommits.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-mono text-slate-600 py-4"
                >
                  {searchQuery
                    ? `No commits matching "${searchQuery}"`
                    : "No commits found for this filter."}
                </motion.p>
              ) : (
                filteredCommits.map((c, i) => (
                  <CommitNode
                    key={c.hash}
                    commit={c}
                    index={i}
                    isLast={i === filteredCommits.length - 1}
                    dir={dir}
                    mainBranch={mainBranch}
                  />
                ))
              )}
            </AnimatePresence>
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
                <span className="text-purple-400">{info.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Working tree</span>
                <span
                  className={
                    info.clean ? "text-green-400" : "text-amber-400"
                  }
                >
                  {info.clean ? "clean" : "dirty"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Changed files</span>
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

          {/* Branches list */}
          {branches.length > 0 && (
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-2">
                Branches
              </span>
              <div className="bg-slate-950/40 rounded-lg p-3 space-y-1.5">
                {branches.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          b.isHead
                            ? "bg-cyan-400"
                            : b.merged
                              ? "bg-green-400/50"
                              : "bg-slate-500"
                        }`}
                      />
                      <span
                        className={`truncate ${
                          b.isHead ? "text-cyan-300" : "text-slate-400"
                        }`}
                      >
                        {b.name}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                        b.isHead
                          ? "bg-cyan-500/15 text-cyan-400"
                          : b.merged
                            ? "bg-green-500/10 text-green-400/60"
                            : "bg-slate-800/40 text-slate-600"
                      }`}
                    >
                      {b.isHead ? "HEAD" : b.merged ? "merged" : "open"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
    </div>
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
    initialLoading,
  } = useLive();
  const dataReady = useMinimumLoading(!initialLoading);

  const [activeDir, setActiveDir] = useState<string | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const resolvedActiveDir =
    activeDir && gitDirs.includes(activeDir) ? activeDir : gitDirs[0] ?? null;

  useEffect(() => {
    if (resolvedActiveDir && resolvedActiveDir !== activeDir) {
      setActiveDir(resolvedActiveDir);
    }
  }, [resolvedActiveDir, activeDir]);

  const activeInfo = resolvedActiveDir ? gitData[resolvedActiveDir] : undefined;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {!dataReady ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-slate-800/60 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-10 rounded-lg bg-slate-800/60 animate-pulse" />
            <div className="h-10 w-20 rounded-lg bg-slate-800/60 animate-pulse" />
          </div>
          <GitSkeleton />
        </div>
      ) : (
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
            <div className="space-y-0">
              {/* Summary bar */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-mono text-slate-500">
                  {gitDirs.length} project{gitDirs.length !== 1 && "s"}
                </span>
                <span className="text-[10px] font-mono text-slate-700">
                  |
                </span>
                {resolvedActiveDir && (
                  <span className="text-[10px] font-mono text-slate-600 truncate">
                    {resolvedActiveDir}
                  </span>
                )}
              </div>

              {/* Tab bar */}
              <div className="relative">
                <div
                  ref={tabsContainerRef}
                  className="flex gap-1 overflow-x-auto scrollbar-none pb-px border-b border-slate-800/40"
                >
                  {gitDirs.map((dir) => {
                    const isActive = dir === resolvedActiveDir;
                    const info = gitData[dir];
                    return (
                      <button
                        key={dir}
                        onClick={() => setActiveDir(dir)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-mono whitespace-nowrap shrink-0 transition-colors rounded-t-lg ${
                          isActive
                            ? "text-cyan-300 bg-slate-900/50"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                        }`}
                      >
                        <span>{dirBasename(dir)}</span>
                        {info && !info.error && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              info.clean
                                ? "bg-green-400/70"
                                : "bg-amber-400/70"
                            }`}
                          />
                        )}
                        {info?.error && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-400/70" />
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="git-tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400"
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active tab content */}
              {resolvedActiveDir && (
                <div className="bg-slate-900/50 border border-slate-800/50 border-t-0 rounded-b-xl overflow-hidden backdrop-blur-sm">
                  {/* Directory header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/30 bg-slate-900/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-400 truncate max-w-[400px]">
                        {resolvedActiveDir}
                      </span>
                      {activeInfo && !activeInfo.error && (
                        <>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
                            <span className="text-purple-400/50 mr-1">~</span>
                            {activeInfo.branch}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border shrink-0 ${
                              activeInfo.clean
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {activeInfo.clean
                              ? "CLEAN"
                              : `${activeInfo.changedFiles} dirty`}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => removeGitDir(resolvedActiveDir)}
                      className="text-slate-600 hover:text-red-400 text-xs font-mono transition-colors ml-3 shrink-0 px-2 py-1 rounded hover:bg-red-500/10"
                      aria-label="Remove directory"
                    >
                      remove
                    </button>
                  </div>

                  {/* Tab panel */}
                  <div className="p-5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={resolvedActiveDir}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <TabContent dir={resolvedActiveDir} info={activeInfo} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.section>
      )}
    </div>
  );
}
