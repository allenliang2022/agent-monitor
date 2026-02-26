"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLive } from "../LiveContext";
import type { FileChange, FileChangesResult } from "../LiveContext";
import { FilesSkeleton, useMinimumLoading } from "../components/LoadingSkeleton";

// Color palette per task index
const TASK_COLORS = [
  { bg: "bg-cyan-400/10", border: "border-cyan-400/20", text: "text-cyan-400", fill: "#22d3ee", hoverBg: "hover:bg-cyan-400/15" },
  { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-500", fill: "#a855f7", hoverBg: "hover:bg-purple-500/15" },
  { bg: "bg-emerald-400/10", border: "border-emerald-400/20", text: "text-emerald-400", fill: "#34d399", hoverBg: "hover:bg-emerald-400/15" },
  { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400", fill: "#fbbf24", hoverBg: "hover:bg-amber-400/15" },
  { bg: "bg-red-400/10", border: "border-red-400/20", text: "text-red-400", fill: "#f87171", hoverBg: "hover:bg-red-400/15" },
];

interface TreemapFile {
  path: string;
  additions: number;
  deletions: number;
  total: number;
  taskKey: string;
  colorIndex: number;
}

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  file: TreemapFile;
}

// Squarified treemap algorithm for better proportional layout
function calculateTreemap(files: TreemapFile[], width: number, height: number): TreemapRect[] {
  if (files.length === 0) return [];

  const totalSize = files.reduce((sum, f) => sum + f.total, 0);
  if (totalSize === 0) return [];

  const sorted = [...files].sort((a, b) => b.total - a.total);

  // Normalize values so they sum to total area
  const area = width * height;
  const normalized = sorted.map((f) => ({
    ...f,
    normalizedSize: (f.total / totalSize) * area,
  }));

  const rects: TreemapRect[] = [];

  function squarify(
    items: (TreemapFile & { normalizedSize: number })[],
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    if (items.length === 0) return;
    if (items.length === 1) {
      rects.push({ x, y, w, h, file: items[0] });
      return;
    }

    const totalArea = items.reduce((s, item) => s + item.normalizedSize, 0);
    const horizontal = w >= h;

    let rowItems: (TreemapFile & { normalizedSize: number })[] = [];
    let rowArea = 0;
    let bestAspect = Infinity;

    for (let i = 0; i < items.length; i++) {
      const testRow = [...rowItems, items[i]];
      const testArea = rowArea + items[i].normalizedSize;

      // Calculate worst aspect ratio for this row
      const side = horizontal ? (testArea / h) : (testArea / w);
      let worstAspect = 0;
      for (const item of testRow) {
        const other = horizontal ? (item.normalizedSize / side) : (item.normalizedSize / side);
        const aspect = Math.max(side / other, other / side);
        worstAspect = Math.max(worstAspect, aspect);
      }

      if (worstAspect <= bestAspect || rowItems.length === 0) {
        rowItems = testRow;
        rowArea = testArea;
        bestAspect = worstAspect;
      } else {
        // Layout the row and recurse on remainder
        layoutRow(rowItems, rowArea, x, y, w, h, horizontal);
        const usedSize = horizontal ? (rowArea / h) : (rowArea / w);
        const nx = horizontal ? x + usedSize : x;
        const ny = horizontal ? y : y + usedSize;
        const nw = horizontal ? w - usedSize : w;
        const nh = horizontal ? h : h - usedSize;
        squarify(items.slice(i), nx, ny, nw, nh);
        return;
      }
    }

    // Layout remaining items
    if (rowItems.length > 0) {
      layoutRow(rowItems, rowArea, x, y, w, h, horizontal);
    }
  }

  function layoutRow(
    items: (TreemapFile & { normalizedSize: number })[],
    rowArea: number,
    x: number,
    y: number,
    w: number,
    h: number,
    horizontal: boolean
  ) {
    const side = horizontal ? rowArea / h : rowArea / w;
    let offset = 0;

    for (const item of items) {
      const itemSize = item.normalizedSize / side;
      if (horizontal) {
        rects.push({ x, y: y + offset, w: side, h: itemSize, file: item });
      } else {
        rects.push({ x: x + offset, y, w: itemSize, h: side, file: item });
      }
      offset += itemSize;
    }
  }

  squarify(normalized, 0, 0, width, height);
  return rects;
}

function shortPath(path: string): string {
  const parts = path.split("/");
  return parts.length > 2 ? parts.slice(-2).join("/") : parts[parts.length - 1] || path;
}

function shortTaskKey(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

// ─── Card Grid for few files ────────────────────────────────────────────────

function FileCard({
  file,
  maxTotal,
  taskName,
  delay,
}: {
  file: TreemapFile;
  maxTotal: number;
  taskName: string;
  delay: number;
}) {
  const c = TASK_COLORS[file.colorIndex];
  const barWidth = maxTotal > 0 ? (file.total / maxTotal) * 100 : 0;
  const addPct = file.total > 0 ? (file.additions / file.total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`rounded-xl border ${c.border} ${c.bg} p-5 overflow-hidden group cursor-default transition-colors ${c.hoverBg}`}
    >
      {/* Filename */}
      <div className={`font-mono text-sm font-semibold ${c.text} mb-1 truncate`}>
        {shortPath(file.path)}
      </div>

      {/* Full path */}
      <div className="font-mono text-[10px] text-slate-500 truncate mb-3" title={file.path}>
        {file.path}
      </div>

      {/* Task */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className={`w-2 h-2 rounded-full ${c.bg} ${c.border} border`} style={{ backgroundColor: c.fill }} />
        <span className="font-mono text-[10px] text-slate-400 truncate">
          {taskName}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-sm text-emerald-400 font-semibold">+{file.additions}</span>
        <span className="font-mono text-sm text-red-400 font-semibold">-{file.deletions}</span>
        <span className="font-mono text-xs text-slate-500">({file.total} total)</span>
      </div>

      {/* Size bar */}
      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ delay: delay + 0.2, duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full relative overflow-hidden"
        >
          {/* Additions portion */}
          <div
            className="absolute inset-y-0 left-0 bg-emerald-400/80"
            style={{ width: `${addPct}%` }}
          />
          {/* Deletions portion */}
          <div
            className="absolute inset-y-0 right-0 bg-red-400/80"
            style={{ width: `${100 - addPct}%` }}
          />
        </motion.div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="font-mono text-[9px] text-emerald-400/60">add</span>
        <span className="font-mono text-[9px] text-red-400/60">del</span>
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function LiveFilesPage() {
  const { fileChanges, tasks, initialLoading } = useLive();
  const dataReady = useMinimumLoading(!initialLoading);
  const [hoveredFile, setHoveredFile] = useState<TreemapFile | null>(null);
  const [sortField, setSortField] = useState<"total" | "additions" | "deletions" | "path">("total");
  const [sortAsc, setSortAsc] = useState(false);

  // Build task key -> color index mapping
  // Use fileChanges from context (SSE), falling back to task-level liveFiles
  const effectiveFileChanges = useMemo(() => {
    // If SSE-provided fileChanges has actual file data, use it
    const hasSSEData = Object.values(fileChanges).some(
      (fc) => fc.files && fc.files.length > 0
    );
    if (hasSSEData) return fileChanges;

    // Fallback: build fileChanges from task-level liveFiles
    const fallback: Record<string, FileChangesResult> = {};
    for (const task of tasks) {
      const key = task.worktreePath || task.id;
      if (task.liveFiles && task.liveFiles.length > 0) {
        fallback[key] = {
          directory: key,
          files: task.liveFiles,
          totalFiles: task.liveFileCount ?? task.liveFiles.length,
          totalAdditions: task.liveAdditions ?? task.liveFiles.reduce((s, f) => s + f.additions, 0),
          totalDeletions: task.liveDeletions ?? task.liveFiles.reduce((s, f) => s + f.deletions, 0),
        };
      }
    }
    return Object.keys(fallback).length > 0 ? fallback : fileChanges;
  }, [fileChanges, tasks]);

  const taskColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const keys = Object.keys(effectiveFileChanges);
    keys.forEach((key, i) => map.set(key, i % TASK_COLORS.length));
    return map;
  }, [effectiveFileChanges]);

  // Flatten all file changes into a single list with task info
  const allFiles: TreemapFile[] = useMemo(() => {
    const result: TreemapFile[] = [];
    for (const [taskKey, fcResult] of Object.entries(effectiveFileChanges)) {
      const colorIndex = taskColorMap.get(taskKey) ?? 0;
      for (const file of fcResult.files) {
        result.push({
          path: file.path,
          additions: file.additions,
          deletions: file.deletions,
          total: file.additions + file.deletions,
          taskKey,
          colorIndex,
        });
      }
    }
    return result;
  }, [effectiveFileChanges, taskColorMap]);

  // Sorted file list for table
  const sortedFiles = useMemo(() => {
    const sorted = [...allFiles].sort((a, b) => {
      let cmp = 0;
      if (sortField === "path") cmp = a.path.localeCompare(b.path);
      else cmp = a[sortField] - b[sortField];
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [allFiles, sortField, sortAsc]);

  const totalAdditions = allFiles.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = allFiles.reduce((s, f) => s + f.deletions, 0);
  const maxFileTotal = allFiles.reduce((max, f) => Math.max(max, f.total), 0);

  const WIDTH = 900;
  const HEIGHT = 500;
  const rects = useMemo(() => calculateTreemap(allFiles, WIDTH, HEIGHT), [allFiles]);

  // Task legend
  const taskKeys = Object.keys(effectiveFileChanges);

  // Find task name by worktree key
  function taskNameForKey(key: string): string {
    const task = tasks.find((t) => t.worktreePath === key || t.id === key);
    return task ? task.name || task.id : shortTaskKey(key);
  }

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  const sortIndicator = (field: string) =>
    sortField === field ? (sortAsc ? " ▲" : " ▼") : "";

  const useFewFilesLayout = allFiles.length > 0 && allFiles.length <= 5;

  if (!dataReady) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded bg-slate-800/60 animate-pulse" />
          <div className="h-3 w-64 rounded bg-slate-800/60 animate-pulse" />
        </div>
        <FilesSkeleton />
      </div>
    );
  }

  if (allFiles.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-mono font-bold text-cyan-400 mb-1 flex items-center gap-2">
            <span className="text-cyan-400/50">&gt;</span> File Changes
          </h1>
          <p className="text-xs font-mono text-slate-500 mb-8">
            Treemap of changed files across all agent worktrees
          </p>
        </motion.div>
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-slate-700 bg-slate-900/50">
          <div className="text-4xl mb-4 text-slate-600">~</div>
          <p className="text-sm font-mono text-slate-500">No file changes detected yet</p>
          <p className="text-xs font-mono text-slate-600 mt-1">
            File changes appear as agents modify code in their worktrees
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-mono font-bold text-cyan-400 mb-1 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> File Changes
        </h1>
        <p className="text-xs font-mono text-slate-500">
          {allFiles.length} files | +{totalAdditions} -{totalDeletions} lines | {taskKeys.length} worktree{taskKeys.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {taskKeys.map((key) => {
          const colorIdx = taskColorMap.get(key) ?? 0;
          const c = TASK_COLORS[colorIdx];
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${c.bg} ${c.border} border`} />
              <span className={`text-xs font-mono ${c.text}`}>
                {taskNameForKey(key)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Few files: Card Grid layout */}
      {useFewFilesLayout && (
        <div className={`grid gap-4 ${
          allFiles.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
          allFiles.length <= 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }`}>
          {sortedFiles.map((file, i) => (
            <FileCard
              key={`${file.taskKey}-${file.path}-${i}`}
              file={file}
              maxTotal={maxFileTotal}
              taskName={taskNameForKey(file.taskKey)}
              delay={0.1 + i * 0.08}
            />
          ))}
        </div>
      )}

      {/* Many files: Proportional Treemap */}
      {!useFewFilesLayout && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden"
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {rects.map((rect, i) => {
              const c = TASK_COLORS[rect.file.colorIndex];
              const isHovered = hoveredFile?.path === rect.file.path && hoveredFile?.taskKey === rect.file.taskKey;
              const filename = shortPath(rect.file.path);
              // Ensure minimum readable size for labels
              const showFilename = rect.w > 50 && rect.h > 24;
              const showStats = rect.w > 60 && rect.h > 42;

              return (
                <g
                  key={`${rect.file.taskKey}-${rect.file.path}-${i}`}
                  onMouseEnter={() => setHoveredFile(rect.file)}
                  onMouseLeave={() => setHoveredFile(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={rect.x + 1.5}
                    y={rect.y + 1.5}
                    width={Math.max(rect.w - 3, 0)}
                    height={Math.max(rect.h - 3, 0)}
                    rx={4}
                    fill={c.fill}
                    fillOpacity={isHovered ? 0.35 : 0.12}
                    stroke={c.fill}
                    strokeOpacity={isHovered ? 0.9 : 0.25}
                    strokeWidth={isHovered ? 2 : 1}
                  />
                  {showFilename && (
                    <text
                      x={rect.x + rect.w / 2}
                      y={rect.y + rect.h / 2 - (showStats ? 7 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={c.fill}
                      fontSize={Math.max(9, Math.min(12, (rect.w / filename.length) * 1.3))}
                      fontFamily="monospace"
                      fontWeight="600"
                      opacity={isHovered ? 1 : 0.85}
                    >
                      {filename}
                    </text>
                  )}
                  {showStats && (
                    <text
                      x={rect.x + rect.w / 2}
                      y={rect.y + rect.h / 2 + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={c.fill}
                      fontSize={9}
                      fontFamily="monospace"
                      opacity={0.5}
                    >
                      +{rect.file.additions} -{rect.file.deletions}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredFile && (
            <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-4 py-3 pointer-events-none z-10 shadow-xl">
              <div className="font-mono text-sm text-white font-semibold">{hoveredFile.path}</div>
              <div className="font-mono text-xs text-slate-400 mt-1.5 flex items-center gap-3">
                <span className="text-emerald-400">+{hoveredFile.additions}</span>
                <span className="text-red-400">-{hoveredFile.deletions}</span>
                <span className="text-slate-500">({hoveredFile.total} total)</span>
              </div>
              <div className={`font-mono text-xs mt-1.5 ${TASK_COLORS[hoveredFile.colorIndex].text}`}>
                {taskNameForKey(hoveredFile.taskKey)}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* File table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs">
                <th
                  className="text-left px-4 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("path")}
                >
                  File{sortIndicator("path")}
                </th>
                <th className="text-left px-4 py-3">Task</th>
                <th
                  className="text-right px-4 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("additions")}
                >
                  +Added{sortIndicator("additions")}
                </th>
                <th
                  className="text-right px-4 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("deletions")}
                >
                  -Deleted{sortIndicator("deletions")}
                </th>
                <th
                  className="text-right px-4 py-3 cursor-pointer hover:text-slate-200 transition-colors"
                  onClick={() => handleSort("total")}
                >
                  Total{sortIndicator("total")}
                </th>
                <th className="px-4 py-3 w-32">Size</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file, i) => {
                const c = TASK_COLORS[file.colorIndex];
                const barPct = maxFileTotal > 0 ? (file.total / maxFileTotal) * 100 : 0;
                const addPct = file.total > 0 ? (file.additions / file.total) * 100 : 0;
                return (
                  <tr
                    key={`${file.taskKey}-${file.path}-${i}`}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-2 text-slate-300 truncate max-w-xs" title={file.path}>
                      {file.path}
                    </td>
                    <td className={`px-4 py-2 text-xs ${c.text}`}>
                      {taskNameForKey(file.taskKey)}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-400">
                      +{file.additions}
                    </td>
                    <td className="px-4 py-2 text-right text-red-400">
                      -{file.deletions}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-300">
                      {file.total}
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full flex"
                          style={{ width: `${barPct}%` }}
                        >
                          <div className="bg-emerald-400/70" style={{ width: `${addPct}%` }} />
                          <div className="bg-red-400/70 flex-1" />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 text-slate-300 font-bold">
                <td className="px-4 py-3">Total ({allFiles.length} files)</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right text-emerald-400">+{totalAdditions}</td>
                <td className="px-4 py-3 text-right text-red-400">-{totalDeletions}</td>
                <td className="px-4 py-3 text-right">{totalAdditions + totalDeletions}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
