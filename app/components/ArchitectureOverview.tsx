"use client";

import { motion } from "framer-motion";
import sessionData from "@/data/swarm-session.json";

interface ArchNode {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
  icon: string;
}

interface ArchEdge {
  from: string;
  to: string;
  label: string;
  color: string;
}

const archNodes: ArchNode[] = [
  { id: "allen", label: "Allen", sublabel: "Human Director", x: 150, y: 100, color: "#f59e0b", icon: "user" },
  { id: "nova", label: "Nova", sublabel: "AI Orchestrator", x: 450, y: 100, color: "#9333ea", icon: "brain" },
  { id: "opencode", label: "opencode", sublabel: "Worker Agent", x: 450, y: 280, color: "#00d4ff", icon: "terminal" },
  { id: "worktree", label: "git worktree", sublabel: "feat/animations", x: 750, y: 280, color: "#22c55e", icon: "git" },
];

const archEdges: ArchEdge[] = [
  { from: "allen", to: "nova", label: "Feishu message", color: "#f59e0b" },
  { from: "nova", to: "opencode", label: "tmux + prompt", color: "#9333ea" },
  { from: "opencode", to: "worktree", label: "git commit", color: "#00d4ff" },
  { from: "nova", to: "worktree", label: "git status poll", color: "#22c55e" },
];

function getPos(id: string): ArchNode {
  return archNodes.find((n) => n.id === id)!;
}

function NodeIcon({ icon, color }: { icon: string; color: string }) {
  switch (icon) {
    case "user":
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      );
    case "brain":
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      );
    case "terminal":
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      );
    case "git":
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ArchitectureOverview() {
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
            <span className="bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
              Architecture Overview
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            Communication flow: Human &rarr; Orchestrator &rarr; Worker &rarr; Repository
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-xl border border-slate-700/50 bg-slate-900/30 overflow-hidden"
        >
          <svg viewBox="0 0 900 400" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <defs>
              {archEdges.map((edge, i) => (
                <marker
                  key={i}
                  id={`arch-arrow-${i}`}
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={edge.color} opacity={0.6} />
                </marker>
              ))}
            </defs>

            {/* Edges */}
            {archEdges.map((edge, i) => {
              const from = getPos(edge.from);
              const to = getPos(edge.to);

              let x1 = from.x + 60;
              let y1 = from.y + 35;
              let x2 = to.x - 60;
              let y2 = to.y + 35;

              // Special case for nova -> worktree (diagonal)
              if (edge.from === "nova" && edge.to === "worktree") {
                x1 = from.x + 60;
                y1 = from.y + 60;
                x2 = to.x - 60;
                y2 = to.y + 10;
              }
              // nova -> opencode (vertical)
              if (edge.from === "nova" && edge.to === "opencode") {
                x1 = from.x;
                y1 = from.y + 70;
                x2 = to.x;
                y2 = to.y;
              }

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={i}>
                  <motion.line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={edge.color}
                    strokeWidth={2}
                    strokeOpacity={0.3}
                    markerEnd={`url(#arch-arrow-${i})`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.2, duration: 0.8 }}
                  />
                  {/* Animated dot along the edge */}
                  <motion.circle
                    r={3}
                    fill={edge.color}
                    initial={{ cx: x1, cy: y1, opacity: 0 }}
                    whileInView={{
                      cx: [x1, x2],
                      cy: [y1, y2],
                      opacity: [0, 1, 1, 0],
                    }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 1 + i * 0.3,
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: "easeInOut",
                    }}
                  />
                  {/* Edge label */}
                  <motion.g
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 + i * 0.2 }}
                  >
                    <rect
                      x={midX - 50}
                      y={midY - 10}
                      width={100}
                      height={20}
                      rx={4}
                      fill="#0f172a"
                      fillOpacity={0.8}
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fill={edge.color}
                      fontSize={10}
                      fontFamily="var(--font-geist-mono), monospace"
                      opacity={0.8}
                    >
                      {edge.label}
                    </text>
                  </motion.g>
                </g>
              );
            })}

            {/* Nodes */}
            {archNodes.map((node, i) => (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.5, type: "spring" }}
              >
                {/* Glow effect */}
                <circle
                  cx={node.x}
                  cy={node.y + 35}
                  r={50}
                  fill={node.color}
                  fillOpacity={0.05}
                />

                {/* Node box */}
                <rect
                  x={node.x - 60}
                  y={node.y}
                  width={120}
                  height={70}
                  rx={12}
                  fill="#0f172a"
                  fillOpacity={0.8}
                  stroke={node.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                />

                {/* Icon */}
                <foreignObject x={node.x - 12} y={node.y + 8} width={24} height={24}>
                  <NodeIcon icon={node.icon} color={node.color} />
                </foreignObject>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 45}
                  textAnchor="middle"
                  fill="white"
                  fontSize={13}
                  fontFamily="var(--font-geist-mono), monospace"
                  fontWeight="700"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 60}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={9}
                  fontFamily="var(--font-geist-mono), monospace"
                >
                  {node.sublabel}
                </text>
              </motion.g>
            ))}
          </svg>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: "Task", value: sessionData.task.name, color: "text-cyan-400" },
            { label: "Branch", value: sessionData.task.branch, color: "text-emerald-400" },
            { label: "Commit", value: sessionData.result.commitHash, color: "text-amber-400" },
            { label: "Build", value: sessionData.result.buildStatus, color: "text-emerald-400" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-4 text-center"
            >
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                {item.label}
              </div>
              <div className={`text-sm font-mono font-bold ${item.color} truncate`}>
                {item.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-400/20 bg-emerald-400/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-mono text-emerald-400">
              Session Complete - All systems nominal
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-4 font-mono">
            {sessionData.result.commitMessage} | {sessionData.result.commitHash}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
