"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLive } from "../LiveContext";
import type { FileChange } from "../LiveContext";

// Color palette per task index
const TASK_COLORS = [
  { bg: "bg-cyan-400/10", border: "border-cyan-400/20", text: "text-cyan-400", fill: "#22d3ee" },
  { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-500", fill: "#a855f7" },
  { bg: "bg-emerald-400/10", border: "border-emerald-400/20", text: "text-emerald-400", fill: "#34d399" },
  { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400", fill: "#fbbf24" },
  { bg: "bg-red-400/10", border: "border-red-400/20", text: "text-red-400", fill: "#f87171" },
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

function calculateTreemap(files: TreemapFile[], width: number, height: number): TreemapRect[] {
  if (files.length === 0) return [];

  const totalSize = files.reduce((sum, f) => sum + f.total, 0);
  if (totalSize === 0) return [];

  const sorted = [...files].sort((a, b) => b.total - a.total);
  const rects: TreemapRect[] = [];

  let x = 0;
  let y = 0;
  let remainingWidth = width;
  let remainingHeight = height;
  let remainingTotal = totalSize;
  let i = 0;
  let horizontal = true;

  while (i < sorted.length) {
    const rowItems: TreemapFile[] = [];
    let rowTotal = 0;
    const maxRowItems = Math.min(
      Math.ceil(Math.sqrt(sorted.length - i)),
      sorted.length - i
    );

    for (let j = 0; j < maxRowItems && i + j < sorted.length; j++) {
      rowItems.push(sorted[i + j]);
      rowTotal += sorted[i + j].total;
    }

    const rowFraction = remainingTotal > 0 ? rowTotal / remainingTotal : 0;

    if (horizontal) {
      const rowHeight = remainingHeight * rowFraction;
      let rx = x;
      for (const item of rowItems) {
        const itemFraction = rowTotal > 0 ? item.total / rowTotal : 1 / rowItems.length;
        const itemWidth = remainingWidth * itemFraction;
        rects.push({ x: rx, y, w: itemWidth, h: rowHeight, file: item });
        rx += itemWidth;
      }
      y += rowHeight;
      remainingHeight -= rowHeight;
    } else {
      const rowWidth = remainingWidth * rowFraction;
      let ry = y;
      for (const item of rowItems) {
        const itemFraction = rowTotal > 0 ? item.total / rowTotal : 1 / rowItems.length;
        const itemHeight = remainingHeight * itemFraction;
        rects.push({ x, y: ry, w: rowWidth, h: itemHeight, file: item });
        ry += itemHeight;
      }
      x += rowWidth;
      remainingWidth -= rowWidth;
    }

    remainingTotal -= rowTotal;
    i += rowItems.length;
    horizontal = !horizontal;
  }

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

export default function LiveFilesPage() {
  const { fileChanges, tasks } = useLive();
  const [hoveredFile, setHoveredFile] = useState<TreemapFile | null>(null);
  const [sortField, setSortField] = useState<"total" | "additions" | "deletions" | "path">("total");
  const [sortAsc, setSortAsc] = useState(false);

  // Build task key -> color index mapping
  const taskColorMap = useMemo(() => {
    const map = new Map<string, number>();
    const keys = Object.keys(fileChanges);
    keys.forEach((key, i) => map.set(key, i % TASK_COLORS.length));
    return map;
  }, [fileChanges]);

  // Flatten all file changes into a single list with task info
  const allFiles: TreemapFile[] = useMemo(() => {
    const result: TreemapFile[] = [];
    for (const [taskKey, fcResult] of Object.entries(fileChanges)) {
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
  }, [fileChanges, taskColorMap]);

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

  const WIDTH = 900;
  const HEIGHT = 500;
  const rects = useMemo(() => calculateTreemap(allFiles, WIDTH, HEIGHT), [allFiles]);

  // Task legend
  const taskKeys = Object.keys(fileChanges);

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

      {/* Treemap */}
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
            const showLabel = rect.w > 60 && rect.h > 30;

            return (
              <g
                key={`${rect.file.taskKey}-${rect.file.path}-${i}`}
                onMouseEnter={() => setHoveredFile(rect.file)}
                onMouseLeave={() => setHoveredFile(null)}
                className="cursor-pointer"
              >
                <rect
                  x={rect.x + 1}
                  y={rect.y + 1}
                  width={Math.max(rect.w - 2, 0)}
                  height={Math.max(rect.h - 2, 0)}
                  rx={4}
                  fill={c.fill}
                  fillOpacity={isHovered ? 0.4 : 0.15}
                  stroke={c.fill}
                  strokeOpacity={isHovered ? 0.8 : 0.3}
                  strokeWidth={isHovered ? 2 : 1}
                />
                {showLabel && (
                  <>
                    <text
                      x={rect.x + rect.w / 2}
                      y={rect.y + rect.h / 2 - (rect.h > 50 ? 6 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={c.fill}
                      fontSize={Math.min(12, (rect.w / filename.length) * 1.4)}
                      fontFamily="monospace"
                      opacity={0.9}
                    >
                      {filename}
                    </text>
                    {rect.h > 50 && (
                      <text
                        x={rect.x + rect.w / 2}
                        y={rect.y + rect.h / 2 + 12}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={c.fill}
                        fontSize={10}
                        fontFamily="monospace"
                        opacity={0.6}
                      >
                        +{rect.file.additions} -{rect.file.deletions}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredFile && (
          <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-3 pointer-events-none z-10">
            <div className="font-mono text-sm text-white">{hoveredFile.path}</div>
            <div className="font-mono text-xs text-slate-400 mt-1">
              <span className="text-emerald-400">+{hoveredFile.additions}</span>{" "}
              <span className="text-red-400">-{hoveredFile.deletions}</span>
            </div>
            <div className={`font-mono text-xs mt-1 ${TASK_COLORS[hoveredFile.colorIndex].text}`}>
              {taskNameForKey(hoveredFile.taskKey)}
            </div>
          </div>
        )}
      </motion.div>

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
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file, i) => {
                const c = TASK_COLORS[file.colorIndex];
                return (
                  <tr
                    key={`${file.taskKey}-${file.path}-${i}`}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-2 text-slate-300 truncate max-w-xs">
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
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
