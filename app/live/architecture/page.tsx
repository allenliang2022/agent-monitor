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

// Status color mapping
function statusColor(status: AgentTask["status"]): string {
  switch (status) {
    case "running": return "#22d3ee";
    case "completed": case "done": case "ready_for_review": return "#22c55e";
    case "failed": case "ci_failed": case "dead": return "#ef4444";
    case "pending": case "ci_pending": return "#f59e0b";
    default: return "#64748b";
  }
}

function statusBg(status: AgentTask["status"]): string {
  switch (status) {
    case "running": return "rgba(34,211,238,0.15)";
    case "completed": case "done": case "ready_for_review": return "rgba(34,197,94,0.15)";
    case "failed": case "ci_failed": case "dead": return "rgba(239,68,68,0.15)";
    case "pending": case "ci_pending": return "rgba(245,158,11,0.15)";
    default: return "rgba(100,116,139,0.15)";
  }
}

function isActive(task: AgentTask): boolean {
  return task.tmuxAlive || task.status === "running";
}

function isCompleted(task: AgentTask): boolean {
  return ["completed", "done", "ready_for_review"].includes(task.status);
}

function isDead(task: AgentTask): boolean {
  return task.status === "dead" || task.status === "failed" || task.status === "ci_failed" || (!task.tmuxAlive && task.status !== "completed" && task.status !== "done" && task.status !== "ready_for_review" && task.status !== "pending" && task.status !== "ci_pending");
}

interface DiagramNode {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  color: string;
  type: "human" | "orchestrator" | "agent" | "worktree";
  task?: AgentTask;
}

interface DiagramEdge {
  from: string;
  to: string;
  label: string;
  color: string;
  animated?: boolean;
  dimmed?: boolean;
}

export default function LiveArchitecturePage() {
  const { tasks } = useLive();

  const activeTasks = useMemo(() => tasks.filter((t) => isActive(t)), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => isCompleted(t)), [tasks]);
  const deadTasks = useMemo(() => tasks.filter((t) => isDead(t) && !isActive(t) && !isCompleted(t)), [tasks]);

  // Build dynamic nodes
  const { nodes, edges } = useMemo(() => {
    const nodeList: DiagramNode[] = [];
    const edgeList: DiagramEdge[] = [];

    const centerX = 450;

    // Fixed top nodes — Allen on the left, Nova in the center
    nodeList.push({
      id: "allen", label: "Allen", sublabel: "Human Director",
      x: 180, y: 50, color: "#fbbf24", type: "human",
    });
    nodeList.push({
      id: "nova", label: "Nova", sublabel: "Orchestrator",
      x: centerX, y: 50, color: "#a855f7", type: "orchestrator",
    });

    edgeList.push({ from: "allen", to: "nova", label: "Feishu", color: "#fbbf24", animated: true });

    // All tasks to display as agent nodes
    const allAgentTasks = tasks;
    const agentY = 220;
    const worktreeY = 380;

    if (allAgentTasks.length > 0) {
      const spacing = Math.min(180, 800 / Math.max(allAgentTasks.length, 1));
      const startX = centerX - ((allAgentTasks.length - 1) * spacing) / 2;

      allAgentTasks.forEach((task, i) => {
        const ax = startX + i * spacing;
        const agentId = `agent-${task.id}`;
        const wtId = `wt-${task.id}`;
        const active = isActive(task);
        const completed = isCompleted(task);
        const dead = isDead(task) && !active && !completed;

        // Agent node
        nodeList.push({
          id: agentId,
          label: task.name || task.id.slice(0, 14),
          sublabel: task.agent || "opencode",
          x: ax, y: agentY,
          color: active ? "#22d3ee" : completed ? "#22c55e" : dead ? "#ef4444" : "#64748b",
          type: "agent",
          task,
        });

        // Worktree node
        nodeList.push({
          id: wtId,
          label: task.branch || "branch",
          sublabel: "worktree",
          x: ax, y: worktreeY,
          color: active ? "#34d399" : completed ? "#22c55e" : "#64748b",
          type: "worktree",
          task,
        });

        // Nova -> Agent edge
        edgeList.push({
          from: "nova", to: agentId,
          label: "tmux",
          color: active ? "#a855f7" : completed ? "#22c55e" : "#64748b",
          animated: active,
          dimmed: !active,
        });

        // Agent -> Worktree edge
        edgeList.push({
          from: agentId, to: wtId,
          label: "git",
          color: active ? "#22d3ee" : completed ? "#22c55e" : "#64748b",
          animated: active,
          dimmed: !active,
        });
      });
    }

    return { nodes: nodeList, edges: edgeList };
  }, [tasks]);

  const hasAgents = tasks.length > 0;
  const viewH = hasAgents ? 480 : 250;

  function nodeIcon(node: DiagramNode) {
    switch (node.type) {
      case "human": return <UserIcon color={node.color} />;
      case "orchestrator": return <BrainIcon color={node.color} />;
      case "agent": return <TerminalIcon color={node.color} />;
      case "worktree": return <GitIcon color={node.color} />;
    }
  }

  // Determine node visual state
  function getNodeOpacity(node: DiagramNode): number {
    if (!node.task) return 1;
    if (isActive(node.task)) return 1;
    if (isCompleted(node.task)) return 0.6;
    return 0.35;
  }

  function getNodeStrokeDash(node: DiagramNode): string {
    if (!node.task) return "none";
    if (isActive(node.task)) return "none";
    if (isCompleted(node.task)) return "none";
    return "4 3";
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

      {/* Legend */}
      <div className="flex items-center gap-6 text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" /> Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-60" /> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 opacity-40" /> Dead / Failed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Pending
        </span>
      </div>

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
                <path d="M 0 0 L 10 5 L 0 10 z" fill={edge.color} opacity={edge.dimmed ? 0.3 : 0.6} />
              </marker>
            ))}
            {/* Pulse animation filter for active agents */}
            <filter id="glow-pulse">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodes.find((n) => n.id === edge.from)!;
            const to = nodes.find((n) => n.id === edge.to)!;

            let x1: number, y1: number, x2: number, y2: number;

            if (from.y === to.y) {
              // Horizontal
              x1 = from.x + 65;
              y1 = from.y + 40;
              x2 = to.x - 65;
              y2 = to.y + 40;
            } else {
              // Vertical
              x1 = from.x;
              y1 = from.y + 80;
              x2 = to.x;
              y2 = to.y;
            }

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const lineOpacity = edge.dimmed ? 0.15 : 0.4;

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={edge.color}
                  strokeWidth={edge.animated ? 2 : 1.5}
                  strokeOpacity={lineOpacity}
                  strokeDasharray={edge.dimmed ? "6 4" : "none"}
                  markerEnd={`url(#live-arch-arrow-${i})`}
                />
                {/* Animated particle along the edge for active connections */}
                {edge.animated && (
                  <>
                    <circle r={3} fill={edge.color} opacity={0.9}>
                      <animate attributeName="cx" values={`${x1};${x2}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="cy" values={`${y1};${y2}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    {/* Second particle offset */}
                    <circle r={2} fill={edge.color} opacity={0.6}>
                      <animate attributeName="cx" values={`${x1};${x2}`} dur="2s" begin="1s" repeatCount="indefinite" />
                      <animate attributeName="cy" values={`${y1};${y2}`} dur="2s" begin="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0;0.6;0.6;0" dur="2s" begin="1s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
                {/* Edge label */}
                <rect
                  x={midX - 24}
                  y={midY - 8}
                  width={48}
                  height={16}
                  rx={4}
                  fill="#0f172a"
                  fillOpacity={0.85}
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fill={edge.color}
                  fontSize={8}
                  fontFamily="monospace"
                  opacity={edge.dimmed ? 0.4 : 0.8}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const opacity = getNodeOpacity(node);
            const strokeDash = getNodeStrokeDash(node);
            const active = node.task && isActive(node.task);
            const completed = node.task && isCompleted(node.task);
            const dead = node.task && isDead(node.task) && !active && !completed;

            // Wider box for agent nodes to fit task name + status badge
            const isAgentNode = node.type === "agent";
            const boxW = isAgentNode ? 140 : 110;
            const boxH = isAgentNode ? 88 : 70;

            return (
              <g key={node.id} opacity={opacity}>
                {/* Pulsing glow for active agents */}
                {active && (
                  <circle cx={node.x} cy={node.y + boxH / 2} r={55} fill={node.color} fillOpacity={0.08}>
                    <animate attributeName="r" values="45;55;45" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="fillOpacity" values="0.04;0.12;0.04" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Static glow for non-active */}
                {!active && (
                  <circle cx={node.x} cy={node.y + boxH / 2} r={45} fill={node.color} fillOpacity={0.03} />
                )}

                {/* Box */}
                <rect
                  x={node.x - boxW / 2}
                  y={node.y}
                  width={boxW}
                  height={boxH}
                  rx={12}
                  fill="#0f172a"
                  fillOpacity={0.85}
                  stroke={node.color}
                  strokeWidth={active ? 2 : 1.5}
                  strokeOpacity={active ? 0.6 : completed ? 0.3 : 0.2}
                  strokeDasharray={strokeDash}
                />

                {/* Icon */}
                <foreignObject x={node.x - 12} y={node.y + 6} width={24} height={24}>
                  {nodeIcon(node)}
                </foreignObject>

                {/* Label — task name for agents */}
                <text
                  x={node.x}
                  y={node.y + (isAgentNode ? 44 : 44)}
                  textAnchor="middle"
                  fill="white"
                  fontSize={isAgentNode ? 10 : 11}
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  {node.label.length > 18 ? node.label.slice(0, 17) + "..." : node.label}
                </text>

                {/* Sublabel */}
                <text
                  x={node.x}
                  y={node.y + (isAgentNode ? 56 : 58)}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {node.sublabel}
                </text>

                {/* Status badge for agent nodes */}
                {isAgentNode && node.task && (
                  <g>
                    <rect
                      x={node.x - 28}
                      y={node.y + 64}
                      width={56}
                      height={16}
                      rx={4}
                      fill={statusBg(node.task.status)}
                    />
                    <text
                      x={node.x}
                      y={node.y + 75}
                      textAnchor="middle"
                      fill={statusColor(node.task.status)}
                      fontSize={8}
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {node.task.status.toUpperCase()}
                    </text>
                  </g>
                )}

                {/* Branch name for agent nodes */}
                {isAgentNode && node.task?.branch && (
                  <text
                    x={node.x}
                    y={node.y - 6}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={7}
                    fontFamily="monospace"
                    opacity={0.6}
                  >
                    {node.task.branch.length > 22 ? node.task.branch.slice(0, 21) + "..." : node.task.branch}
                  </text>
                )}

                {/* DEAD badge overlay */}
                {dead && (
                  <g>
                    <rect x={node.x + boxW / 2 - 36} y={node.y - 2} width={32} height={14} rx={3} fill="#f87171" fillOpacity={0.2} />
                    <text x={node.x + boxW / 2 - 20} y={node.y + 9} textAnchor="middle" fill="#f87171" fontSize={8} fontWeight="700" fontFamily="monospace">
                      DEAD
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Empty state — always show the core topology text */}
          {!hasAgents && (
            <text
              x={450}
              y={200}
              textAnchor="middle"
              fill="#64748b"
              fontSize={12}
              fontFamily="monospace"
            >
              No agents spawned yet — waiting for tasks
            </text>
          )}
        </svg>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active", value: activeTasks.length, color: "text-cyan-400", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-400/20" },
          { label: "Completed", value: completedTasks.length, color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-400/20" },
          { label: "Dead / Failed", value: deadTasks.length, color: "text-red-400", bgColor: "bg-red-400/10", borderColor: "border-red-400/20" },
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
      {tasks.length > 0 && (
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
            {tasks.map((task) => {
              const active = isActive(task);
              const completed = isCompleted(task);
              const sColor = statusColor(task.status);

              return (
                <div key={task.id} className="px-4 py-3 flex items-center gap-4 text-xs font-mono">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: sColor,
                      opacity: active ? 1 : completed ? 0.6 : 0.4,
                    }}
                  />
                  <span className="text-slate-300 min-w-[120px] truncate">{task.name || task.id}</span>
                  <span className="text-cyan-400/70">{task.agent}</span>
                  <span className="text-emerald-400/70 truncate max-w-[140px]">{task.branch || "—"}</span>
                  <span
                    className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0"
                    style={{
                      color: sColor,
                      borderColor: `${sColor}33`,
                      backgroundColor: statusBg(task.status),
                    }}
                  >
                    {task.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
