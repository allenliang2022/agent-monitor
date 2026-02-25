"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLive } from "../LiveContext";
import type { AgentTask } from "../LiveContext";

// SVG icons as path data
function UserIcon({ color }: { color: string }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function BrainIcon({ color }: { color: string }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function TerminalIcon({ color }: { color: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function GitIcon({ color }: { color: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

interface DiagramNode {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
  type: "human" | "orchestrator" | "agent" | "worktree";
  alive?: boolean;
}

interface DiagramEdge {
  from: string;
  to: string;
  label: string;
  color: string;
  animated?: boolean;
}

export default function LiveArchitecturePage() {
  const { tasks } = useLive();

  const activeTasks = useMemo(() => tasks.filter((t) => t.tmuxAlive), [tasks]);
  const allAgentTasks = useMemo(() => tasks, [tasks]);
  const hasAgents = allAgentTasks.length > 0;

  // Build dynamic nodes
  const { nodes, edges } = useMemo(() => {
    const nodeList: DiagramNode[] = [];
    const edgeList: DiagramEdge[] = [];

    // Fixed top nodes
    const novaX = 450;
    const allenX = 150;
    nodeList.push({
      id: "allen", label: "Allen", sublabel: "Human Director",
      x: allenX, y: 60, color: "#fbbf24", type: "human",
    });
    nodeList.push({
      id: "nova", label: "Nova", sublabel: "Orchestrator",
      x: novaX, y: 60, color: "#a855f7", type: "orchestrator",
    });

    edgeList.push({ from: "allen", to: "nova", label: "Feishu", color: "#fbbf24", animated: true });

    if (allAgentTasks.length > 0) {
      // Distribute agent nodes evenly
      const agentY = 220;
      const worktreeY = 380;
      const spacing = Math.min(180, 700 / Math.max(allAgentTasks.length, 1));
      const startX = novaX - ((allAgentTasks.length - 1) * spacing) / 2;

      allAgentTasks.forEach((task, i) => {
        const ax = startX + i * spacing;
        const agentId = `agent-${task.id}`;
        const wtId = `wt-${task.id}`;

        nodeList.push({
          id: agentId,
          label: task.id.slice(0, 12),
          sublabel: task.agent || "opencode",
          x: ax, y: agentY,
          color: "#22d3ee",
          type: "agent",
          alive: task.tmuxAlive,
        });

        nodeList.push({
          id: wtId,
          label: task.branch || "branch",
          sublabel: "worktree",
          x: ax, y: worktreeY,
          color: "#34d399",
          type: "worktree",
        });

        edgeList.push({
          from: "nova", to: agentId,
          label: "tmux",
          color: "#a855f7",
          animated: task.tmuxAlive,
        });

        edgeList.push({
          from: agentId, to: wtId,
          label: "git",
          color: "#22d3ee",
          animated: task.tmuxAlive,
        });
      });
    }

    return { nodes: nodeList, edges: edgeList };
  }, [allAgentTasks, hasAgents]);

  // Compute viewbox height based on content
  const viewH = hasAgents ? 460 : 200;

  function nodeIcon(node: DiagramNode) {
    switch (node.type) {
      case "human": return <UserIcon color={node.color} />;
      case "orchestrator": return <BrainIcon color={node.color} />;
      case "agent": return <TerminalIcon color={node.color} />;
      case "worktree": return <GitIcon color={node.color} />;
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-mono font-bold text-amber-400 mb-1 flex items-center gap-2">
          <span className="text-amber-400/50">&gt;</span> Architecture
        </h1>
        <p className="text-xs font-mono text-slate-500">
          System topology — live agent connections and data flow
        </p>
      </motion.div>

      {/* Diagram */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden"
      >
        <svg viewBox={`0 0 900 ${viewH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            {edges.map((edge, i) => (
              <marker
                key={`arch-arrow-${i}`}
                id={`live-arch-arrow-${i}`}
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
          {edges.map((edge, i) => {
            const from = nodes.find((n) => n.id === edge.from)!;
            const to = nodes.find((n) => n.id === edge.to)!;

            // Compute connection points
            let x1: number, y1: number, x2: number, y2: number;

            if (from.y === to.y) {
              // Horizontal
              x1 = from.x + 60;
              y1 = from.y + 35;
              x2 = to.x - 60;
              y2 = to.y + 35;
            } else {
              // Vertical
              x1 = from.x;
              y1 = from.y + 70;
              x2 = to.x;
              y2 = to.y;
            }

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={edge.color}
                  strokeWidth={2}
                  strokeOpacity={0.3}
                  markerEnd={`url(#live-arch-arrow-${i})`}
                />
                {edge.animated && (
                  <circle r={3} fill={edge.color}>
                    <animate attributeName="cx" values={`${x1};${x2}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="cy" values={`${y1};${y2}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Edge label */}
                <rect
                  x={midX - 30}
                  y={midY - 9}
                  width={60}
                  height={18}
                  rx={4}
                  fill="#0f172a"
                  fillOpacity={0.8}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fill={edge.color}
                  fontSize={9}
                  fontFamily="monospace"
                  opacity={0.8}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isDead = node.type === "agent" && node.alive === false;
            const opacity = isDead ? 0.4 : 1;
            const strokeDash = isDead ? "4 3" : "none";

            return (
              <g key={node.id} opacity={opacity}>
                {/* Glow */}
                <circle cx={node.x} cy={node.y + 35} r={45} fill={node.color} fillOpacity={0.05} />

                {/* Box */}
                <rect
                  x={node.x - 55}
                  y={node.y}
                  width={110}
                  height={70}
                  rx={12}
                  fill="#0f172a"
                  fillOpacity={0.8}
                  stroke={node.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                  strokeDasharray={strokeDash}
                />

                {/* Icon */}
                <foreignObject x={node.x - 12} y={node.y + 6} width={24} height={24}>
                  {nodeIcon(node)}
                </foreignObject>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 44}
                  textAnchor="middle"
                  fill="white"
                  fontSize={11}
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 58}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {node.sublabel}
                </text>

                {/* DEAD badge */}
                {isDead && (
                  <g>
                    <rect x={node.x + 30} y={node.y - 4} width={32} height={14} rx={3} fill="#f87171" fillOpacity={0.2} />
                    <text x={node.x + 46} y={node.y + 7} textAnchor="middle" fill="#f87171" fontSize={8} fontWeight="700" fontFamily="monospace">
                      DEAD
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* No active agents message */}
          {!hasAgents && (
            <text
              x={450}
              y={160}
              textAnchor="middle"
              fill="#64748b"
              fontSize={13}
              fontFamily="monospace"
            >
              No active agents — waiting for tasks to spawn
            </text>
          )}
        </svg>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Agents", value: activeTasks.length, color: "text-cyan-400", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-400/20" },
          { label: "Dead Agents", value: allAgentTasks.filter((t) => !t.tmuxAlive).length, color: "text-red-400", bgColor: "bg-red-400/10", borderColor: "border-red-400/20" },
          { label: "Worktrees", value: allAgentTasks.length, color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-400/20" },
          { label: "Total Tasks", value: tasks.length, color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20" },
        ].map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border ${card.borderColor} ${card.bgColor} p-4 text-center`}
          >
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div className={`text-2xl font-mono font-bold ${card.color}`}>
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Agent details list */}
      {allAgentTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-mono font-bold text-slate-300">Agent Details</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {allAgentTasks.map((task) => (
              <div key={task.id} className="px-4 py-3 flex items-center gap-4 text-xs font-mono">
                <span className={`w-2 h-2 rounded-full ${task.tmuxAlive ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="text-slate-300 min-w-[100px]">{task.name || task.id}</span>
                <span className="text-cyan-400/70">{task.agent}</span>
                <span className="text-emerald-400/70">{task.branch || "—"}</span>
                <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-semibold ${
                  task.tmuxAlive
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                    : "bg-red-400/10 text-red-400 border border-red-400/20"
                }`}>
                  {task.tmuxAlive ? "ALIVE" : "DEAD"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
