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
  { id: "spawn", label: "Spawn Agent", type: "start", description: "spawn-agent.sh creates worktree, registers task, launches tmux session with opencode", x: 450, y: 40 },
  { id: "sleep", label: "Sleep 90-120s", type: "action", description: "Wait a reasonable interval before polling. Avoids excessive resource usage while still catching progress.", x: 450, y: 130 },
  { id: "poll", label: "Poll Status", type: "action", description: "Begin a monitoring cycle: check tmux, check git, assess progress", x: 450, y: 220 },
  { id: "tmux", label: "tmux alive?", type: "decision", description: "Run 'tmux has-session -t agent-animations'. Return code 0 = alive, non-zero = dead.", x: 450, y: 320 },
  { id: "check-git", label: "Check Git", type: "action", description: "Run 'git status --short', 'ls app/components/', 'git log --oneline' to measure progress", x: 250, y: 420 },
  { id: "assess", label: "Assess Progress", type: "action", description: "Count components created vs target (13), check for new commits, evaluate overall progress", x: 250, y: 510 },
  { id: "report", label: "Log Report", type: "action", description: "Record check results: timestamp, files changed, components count, assessment summary", x: 250, y: 600 },
  { id: "check-commit", label: "Check Commit", type: "decision", description: "tmux is dead. Check if a new commit exists and worktree is clean - determines success vs failure.", x: 650, y: 420 },
  { id: "verify", label: "Verify Build", type: "action", description: "Run 'npm run build' independently to confirm the code compiles, TypeScript passes, pages generate.", x: 650, y: 530 },
  { id: "success", label: "Success", type: "end", description: "Task completed! Agent committed clean code that builds successfully. Report back to Allen.", x: 650, y: 630 },
];

const edges: FlowEdge[] = [
  { from: "spawn", to: "sleep", type: "normal" },
  { from: "sleep", to: "poll", type: "normal" },
  { from: "poll", to: "tmux", type: "normal" },
  { from: "tmux", to: "check-git", label: "YES", type: "yes" },
  { from: "tmux", to: "check-commit", label: "NO", type: "no" },
  { from: "check-git", to: "assess", type: "normal" },
  { from: "assess", to: "report", type: "normal" },
  { from: "report", to: "sleep", label: "Loop", type: "normal" },
  { from: "check-commit", to: "verify", label: "YES", type: "yes" },
  { from: "verify", to: "success", type: "normal" },
];

function getNodePosition(id: string): FlowNode {
  return nodes.find((n) => n.id === id)!;
}

export default function MonitoringPattern() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeData = hoveredNode ? nodes.find((n) => n.id === hoveredNode) : null;

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
            <span className="bg-gradient-to-r from-green to-cyan bg-clip-text text-transparent">
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
          <svg viewBox="0 0 900 680" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map((edge, i) => {
              const from = getNodePosition(edge.from);
              const to = getNodePosition(edge.to);

              let path: string;
              const fromCenterY = from.y + 25;
              const toCenterY = to.y + 25;
              const fromCenterX = from.x;
              const toCenterX = to.x;

              // Special path for loop back
              if (edge.from === "report" && edge.to === "sleep") {
                path = `M ${fromCenterX - 80} ${from.y + 10} C ${fromCenterX - 200} ${from.y} ${toCenterX - 200} ${to.y + 25} ${toCenterX - 80} ${to.y + 25}`;
              } else if (edge.from === "tmux" && edge.to === "check-git") {
                path = `M ${fromCenterX - 60} ${fromCenterY + 20} L ${toCenterX} ${toCenterY - 20}`;
              } else if (edge.from === "tmux" && edge.to === "check-commit") {
                path = `M ${fromCenterX + 60} ${fromCenterY + 20} L ${toCenterX} ${toCenterY - 20}`;
              } else {
                path = `M ${fromCenterX} ${fromCenterY + 25} L ${toCenterX} ${toCenterY - 25}`;
              }

              const marker = edge.type === "yes" ? "url(#arrow-green)" : edge.type === "no" ? "url(#arrow-red)" : "url(#arrow)";
              const stroke = edge.type === "yes" ? "#22c55e" : edge.type === "no" ? "#ef4444" : "#475569";

              return (
                <g key={i}>
                  <motion.path
                    d={path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray={edge.from === "report" ? "6 4" : "none"}
                    markerEnd={marker}
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.6 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                  />
                  {edge.label && (
                    <text
                      x={(getNodePosition(edge.from).x + getNodePosition(edge.to).x) / 2 + (edge.type === "yes" && edge.from === "tmux" ? -50 : edge.type === "no" ? 50 : -30)}
                      y={(getNodePosition(edge.from).y + getNodePosition(edge.to).y) / 2 + 25}
                      fill={edge.type === "yes" ? "#22c55e" : edge.type === "no" ? "#ef4444" : "#64748b"}
                      fontSize={11}
                      fontFamily="var(--font-geist-mono), monospace"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
              const isHovered = hoveredNode === node.id;
              const w = 140;
              const h = 44;
              const x = node.x - w / 2;
              const y = node.y;

              let fill = "rgba(15,23,42,0.8)";
              let stroke = "#334155";
              let textColor = "#e2e8f0";

              if (node.type === "start") {
                fill = "rgba(0,212,255,0.1)";
                stroke = "#00d4ff";
                textColor = "#00d4ff";
              } else if (node.type === "end") {
                fill = "rgba(34,197,94,0.1)";
                stroke = "#22c55e";
                textColor = "#22c55e";
              } else if (node.type === "decision") {
                fill = "rgba(245,158,11,0.1)";
                stroke = "#f59e0b";
                textColor = "#f59e0b";
              } else if (node.type === "action") {
                fill = "rgba(147,51,234,0.05)";
                stroke = "#6b21a8";
                textColor = "#c084fc";
              }

              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  {node.type === "decision" ? (
                    <g transform={`translate(${node.x}, ${node.y + h / 2})`}>
                      <motion.polygon
                        points={`0,-${h / 2 + 6} ${w / 2 + 10},0 0,${h / 2 + 6} -${w / 2 + 10},0`}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isHovered ? 2 : 1}
                        animate={{ strokeWidth: isHovered ? 2 : 1 }}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fill={textColor}
                        fontSize={12}
                        fontFamily="var(--font-geist-mono), monospace"
                        fontWeight="600"
                      >
                        {node.label}
                      </text>
                    </g>
                  ) : (
                    <>
                      <motion.rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx={node.type === "start" || node.type === "end" ? 22 : 8}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isHovered ? 2 : 1}
                        animate={{ strokeWidth: isHovered ? 2 : 1 }}
                      />
                      <text
                        x={node.x}
                        y={y + h / 2 + 4}
                        textAnchor="middle"
                        fill={textColor}
                        fontSize={12}
                        fontFamily="var(--font-geist-mono), monospace"
                        fontWeight="600"
                      >
                        {node.label}
                      </text>
                    </>
                  )}
                </motion.g>
              );
            })}
          </svg>

          {/* Hover description */}
          {hoveredNodeData && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-white">{hoveredNodeData.label}</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                  hoveredNodeData.type === "decision" ? "bg-amber/10 text-amber" :
                  hoveredNodeData.type === "start" ? "bg-cyan/10 text-cyan" :
                  hoveredNodeData.type === "end" ? "bg-green/10 text-green" :
                  "bg-purple/10 text-purple"
                }`}>
                  {hoveredNodeData.type}
                </span>
              </div>
              <p className="text-sm text-slate-400">{hoveredNodeData.description}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
