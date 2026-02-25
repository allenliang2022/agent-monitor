"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import sessionData from "@/data/swarm-session.json";

const categoryColors: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  component: { bg: "bg-cyan/20", border: "border-cyan/30", text: "text-cyan", fill: "#00d4ff" },
  page: { bg: "bg-purple/20", border: "border-purple/30", text: "text-purple", fill: "#9333ea" },
  lib: { bg: "bg-green/20", border: "border-green/30", text: "text-green", fill: "#22c55e" },
  style: { bg: "bg-amber/20", border: "border-amber/30", text: "text-amber", fill: "#f59e0b" },
  data: { bg: "bg-green/20", border: "border-green/30", text: "text-green", fill: "#22c55e" },
  deps: { bg: "bg-slate-600/20", border: "border-slate-500/30", text: "text-slate-400", fill: "#64748b" },
};

function getCategoryStyle(category: string) {
  return categoryColors[category] || categoryColors.deps;
}

// Simple treemap layout algorithm
function calculateTreemap(
  data: typeof sessionData.fileChanges,
  width: number,
  height: number
) {
  const totalAdded = data.reduce((sum, f) => sum + f.added, 0);
  const sorted = [...data].sort((a, b) => b.added - a.added);

  const rects: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    file: string;
    added: number;
    category: string;
  }> = [];

  // Squarified treemap: simple row-based approach
  let x = 0;
  let y = 0;
  let remainingWidth = width;
  let remainingHeight = height;
  let remainingTotal = totalAdded;
  let i = 0;
  let horizontal = true;

  while (i < sorted.length) {
    // Fill rows/columns alternating
    const rowItems: typeof sorted = [];
    let rowTotal = 0;
    const targetArea = horizontal
      ? remainingWidth * remainingHeight
      : remainingWidth * remainingHeight;

    // Take items until we fill a reasonable row
    const maxRowItems = Math.min(
      Math.ceil(Math.sqrt(sorted.length - i)),
      sorted.length - i
    );

    for (let j = 0; j < maxRowItems && i + j < sorted.length; j++) {
      rowItems.push(sorted[i + j]);
      rowTotal += sorted[i + j].added;
    }

    const rowFraction = rowTotal / remainingTotal;

    if (horizontal) {
      const rowHeight = remainingHeight * rowFraction;
      let rx = x;

      for (const item of rowItems) {
        const itemFraction = item.added / rowTotal;
        const itemWidth = remainingWidth * itemFraction;

        rects.push({
          x: rx,
          y,
          w: itemWidth,
          h: rowHeight,
          file: item.file,
          added: item.added,
          category: item.category,
        });

        rx += itemWidth;
      }

      y += rowHeight;
      remainingHeight -= rowHeight;
    } else {
      const rowWidth = remainingWidth * rowFraction;
      let ry = y;

      for (const item of rowItems) {
        const itemFraction = item.added / rowTotal;
        const itemHeight = remainingHeight * itemFraction;

        rects.push({
          x,
          y: ry,
          w: rowWidth,
          h: itemHeight,
          file: item.file,
          added: item.added,
          category: item.category,
        });

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

export default function FileChangesTreemap() {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);
  const files = sessionData.fileChanges;

  const WIDTH = 900;
  const HEIGHT = 500;
  const rects = calculateTreemap(files, WIDTH, HEIGHT);

  const categories = [...new Set(files.map((f) => f.category))];

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
          <h2 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-cyan to-amber bg-clip-text text-transparent">
              File Changes Heatmap
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {files.length} files, {files.reduce((s, f) => s + f.added, 0)} lines added - size = lines added
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4">
            {categories.map((cat) => {
              const style = getCategoryStyle(cat);
              return (
                <div key={cat} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${style.bg} ${style.border} border`} />
                  <span className={`text-xs font-mono ${style.text}`}>{cat}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Treemap */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden"
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {rects.map((rect, i) => {
              const style = getCategoryStyle(rect.category);
              const isHovered = hoveredFile === rect.file;
              const filename = rect.file.split("/").pop() || rect.file;
              const showLabel = rect.w > 60 && rect.h > 30;

              return (
                <motion.g
                  key={rect.file}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03, duration: 0.4 }}
                  onMouseEnter={() => setHoveredFile(rect.file)}
                  onMouseLeave={() => setHoveredFile(null)}
                  className="cursor-pointer"
                >
                  <motion.rect
                    x={rect.x + 1}
                    y={rect.y + 1}
                    width={Math.max(rect.w - 2, 0)}
                    height={Math.max(rect.h - 2, 0)}
                    rx={4}
                    fill={style.fill}
                    fillOpacity={isHovered ? 0.4 : 0.15}
                    stroke={style.fill}
                    strokeOpacity={isHovered ? 0.8 : 0.3}
                    strokeWidth={isHovered ? 2 : 1}
                    animate={{
                      fillOpacity: isHovered ? 0.4 : 0.15,
                      strokeOpacity: isHovered ? 0.8 : 0.3,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                  {showLabel && (
                    <>
                      <text
                        x={rect.x + rect.w / 2}
                        y={rect.y + rect.h / 2 - (rect.h > 50 ? 6 : 0)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={style.fill}
                        fontSize={Math.min(12, rect.w / filename.length * 1.4)}
                        fontFamily="var(--font-geist-mono), monospace"
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
                          fill={style.fill}
                          fontSize={10}
                          fontFamily="var(--font-geist-mono), monospace"
                          opacity={0.6}
                        >
                          +{rect.added}
                        </text>
                      )}
                    </>
                  )}
                </motion.g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredFile && (
            <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-3 pointer-events-none">
              <div className="font-mono text-sm text-white">{hoveredFile}</div>
              <div className="font-mono text-xs text-slate-400 mt-1">
                +{files.find((f) => f.file === hoveredFile)?.added} lines |{" "}
                {files.find((f) => f.file === hoveredFile)?.category}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
