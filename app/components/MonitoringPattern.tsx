"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface FlowNode {
  id: string;
  label: string;
  type: "action" | "decision" | "start" | "end";
  description: string;
  x: number;
  y: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  type?: "yes" | "no" | "normal";
}

const nodes: FlowNode[] = [
  { id: "spawn", label: "Spawn Agent", type: "start", description: "spawn-agent.sh creates worktree, registers task in active-tasks.json, launches tmux session with opencode", x: 450, y: 40 },
  { id: "sleep", label: "Sleep 90-120s", type: "action", description: "exec(background) runs 'sleep 90 && check commands'. Nova uses process(poll) to wait for results.", x: 450, y: 140 },
  { id: "poll", label: "Poll Status", type: "action", description: "Check tmux session + git status + ls components in one shell command batch", x: 450, y: 240 },
  { id: "tmux", label: "tmux alive?", type: "decision", description: "tmux has-session -t agent-xxx returns 0 = ALIVE, non-zero = DEAD", x: 450, y: 350 },
  { id: "check-git", label: "Check Progress", type: "action", description: "git status --short | wc -l, ls app/components/, count files vs target (13)", x: 220, y: 460 },
  { id: "report", label: "Report to Feishu", type: "action", description: "message tool sends progress update to Allen with component count and status", x: 220, y: 560 },
  { id: "check-commit", label: "Has commit?", type: "decision", description: "git log --oneline shows new commit? + git status clean (0 dirty files)?", x: 680, y: 460 },
  { id: "verify", label: "npm run build", type: "action", description: "Nova independently runs build to verify TypeScript, compilation, static page generation", x: 680, y: 560 },
  { id: "success", label: "Done!", type: "end", description: "Task complete! Notify Allen with summary: files changed, lines added, build status", x: 680, y: 650 },
];

const edges: FlowEdge[] = [
  { from: "spawn", to: "sleep", type: "normal" },
  { from: "sleep", to: "poll", type: "normal" },
  { from: "poll", to: "tmux", type: "normal" },
  { from: "tmux", to: "check-git", label: "YES (alive)", type: "yes" },
  { from: "tmux", to: "check-commit", label: "NO (dead)", type: "no" },
  { from: "check-git", to: "report", type: "normal" },
  { from: "report", to: "sleep", label: "LOOP", type: "normal" },
  { from: "check-commit", to: "verify", label: "YES", type: "yes" },
  { from: "verify", to: "success", type: "normal" },
];

function getNode(id: string): FlowNode {
  return nodes.find((n) => n.id === id)!;
}

export default function MonitoringPattern() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeData = hoveredNode ? nodes.find((n) => n.id === hoveredNode) : null;

  const nodeW = 150;
  const nodeH = 46;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Monitoring Pattern
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            sleep + poll + tmux/git monitoring loop
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-xl border border-slate-700/50 bg-slate-900/30 overflow-hidden"
        >
          <svg viewBox="0 0 900 720" className="w-full h-auto" style={{ minHeight: 500 }}>
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569" />
              </marker>
              <marker id="arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#22c55e" />
              </marker>
              <marker id="arr-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
              </marker>
              {/* Grid pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,116,139,0.06)" strokeWidth="1"/>
              </pattern>
            </defs>

            {/* Background grid */}
            <rect width="900" height="720" fill="url(#grid)" />

            {/* Draw edges */}
            {edges.map((edge, i) => {
              const from = getNode(edge.from);
              const to = getNode(edge.to);
              const marker = edge.type === "yes" ? "url(#arr-g)" : edge.type === "no" ? "url(#arr-r)" : "url(#arr)";
              const stroke = edge.type === "yes" ? "#22c55e" : edge.type === "no" ? "#ef4444" : "#475569";
              const strokeOp = edge.type === "normal" ? 0.5 : 0.7;

              let d: string;
              // Special: loop back from report to sleep
              if (edge.from === "report" && edge.to === "sleep") {
                const fx = from.x;
                const fy = from.y + nodeH / 2;
                const tx = to.x - nodeW / 2 - 8;
                const ty = to.y + nodeH / 2;
                d = `M ${fx - nodeW/2} ${fy} C ${fx - 220} ${fy} ${tx - 120} ${ty} ${tx} ${ty}`;
              }
              // Decision left branch
              else if (edge.from === "tmux" && edge.to === "check-git") {
                const fy = from.y + nodeH / 2 + 28;
                const tx = to.x;
                const ty = to.y;
                d = `M ${from.x - 30} ${fy} L ${tx} ${ty}`;
              }
              // Decision right branch
              else if (edge.from === "tmux" && edge.to === "check-commit") {
                const fy = from.y + nodeH / 2 + 28;
                const tx = to.x;
                const ty = to.y;
                d = `M ${from.x + 30} ${fy} L ${tx} ${ty}`;
              }
              // Straight down
              else {
                const fx = from.x;
                const fy = from.y + (from.type === "decision" ? nodeH / 2 + 28 : nodeH);
                const tx = to.x;
                const ty = to.y;
                d = `M ${fx} ${fy + 4} L ${tx} ${ty - 4}`;
              }

              // Label position
              const lx = (getNode(edge.from).x + getNode(edge.to).x) / 2;
              const ly = (getNode(edge.from).y + getNode(edge.to).y) / 2 + nodeH / 2;

              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeOpacity={strokeOp}
                    strokeDasharray={edge.from === "report" ? "6 4" : "none"}
                    markerEnd={marker}
                  />
                  {edge.label && (
                    <text
                      x={lx + (edge.from === "tmux" && edge.type === "yes" ? -60 : edge.from === "tmux" && edge.type === "no" ? 60 : -40)}
                      y={ly}
                      fill={edge.type === "yes" ? "#22c55e" : edge.type === "no" ? "#ef4444" : "#64748b"}
                      fontSize={10}
                      fontWeight="600"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Draw nodes */}
            {nodes.map((node) => {
              const isHovered = hoveredNode === node.id;
              const x = node.x - nodeW / 2;
              const y = node.y;

              let fill: string, strokeColor: string, textColor: string, glowColor: string;
              switch (node.type) {
                case "start":
                  fill = "rgba(0,212,255,0.12)";
                  strokeColor = "#00d4ff";
                  textColor = "#00d4ff";
                  glowColor = "rgba(0,212,255,0.3)";
                  break;
                case "end":
                  fill = "rgba(34,197,94,0.12)";
                  strokeColor = "#22c55e";
                  textColor = "#22c55e";
                  glowColor = "rgba(34,197,94,0.3)";
                  break;
                case "decision":
                  fill = "rgba(245,158,11,0.12)";
                  strokeColor = "#f59e0b";
                  textColor = "#f59e0b";
                  glowColor = "rgba(245,158,11,0.3)";
                  break;
                default:
                  fill = "rgba(147,51,234,0.08)";
                  strokeColor = "#7c3aed";
                  textColor = "#c084fc";
                  glowColor = "rgba(147,51,234,0.3)";
              }

              if (node.type === "decision") {
                // Diamond shape
                const cx = node.x;
                const cy = node.y + nodeH / 2;
                const hw = nodeW / 2 + 10;
                const hh = nodeH / 2 + 8;
                const pts = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {isHovered && (
                      <polygon points={pts} fill="none" stroke={glowColor} strokeWidth={6} opacity={0.4} />
                    )}
                    <polygon
                      points={pts}
                      fill={fill}
                      stroke={strokeColor}
                      strokeWidth={isHovered ? 2 : 1.5}
                    />
                    <text
                      x={cx}
                      y={cy + 5}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize={12}
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              }

              // Rectangle / pill
              const rx = node.type === "start" || node.type === "end" ? 23 : 8;
              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  {isHovered && (
                    <rect x={x - 3} y={y - 3} width={nodeW + 6} height={nodeH + 6} rx={rx + 2} fill="none" stroke={glowColor} strokeWidth={4} opacity={0.4} />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={nodeW}
                    height={nodeH}
                    rx={rx}
                    fill={fill}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? 2 : 1.5}
                  />
                  <text
                    x={node.x}
                    y={y + nodeH / 2 + 5}
                    textAnchor="middle"
                    fill={textColor}
                    fontSize={12}
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredNodeData && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-white">{hoveredNodeData.label}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  hoveredNodeData.type === "decision" ? "bg-amber-500/15 text-amber-400" :
                  hoveredNodeData.type === "start" ? "bg-cyan-500/15 text-cyan-400" :
                  hoveredNodeData.type === "end" ? "bg-emerald-500/15 text-emerald-400" :
                  "bg-purple-500/15 text-purple-400"
                }`}>
                  {hoveredNodeData.type}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{hoveredNodeData.description}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
