"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLive } from "../LiveContext";
import type { AgentTask } from "../LiveContext";

// Flowchart stage definitions
interface FlowStage {
  id: string;
  label: string;
  type: "action" | "decision" | "start" | "end";
  x: number;
  y: number;
  description: string;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  branch?: "yes" | "no" | "normal";
}

const STAGES: FlowStage[] = [
  { id: "spawn", label: "Spawn", type: "start", x: 450, y: 40, description: "Agent spawned via spawn-agent.sh — tmux session created, worktree registered" },
  { id: "tmux", label: "tmux alive?", type: "decision", x: 450, y: 150, description: "Check if tmux session is still running (tmux has-session)" },
  { id: "coding", label: "Coding", type: "action", x: 220, y: 270, description: "Agent is actively writing code in its worktree" },
  { id: "commit", label: "Commit", type: "action", x: 220, y: 380, description: "Agent has committed changes and pushed to branch" },
  { id: "pr", label: "PR Created", type: "action", x: 450, y: 380, description: "Pull request created from agent's branch" },
  { id: "ci", label: "CI Passed?", type: "decision", x: 450, y: 490, description: "CI/CD pipeline running — checking build, tests, lint" },
  { id: "review", label: "Review", type: "action", x: 300, y: 600, description: "PR ready for human review" },
  { id: "merge", label: "Merged", type: "end", x: 300, y: 710, description: "PR merged into main branch — task complete" },
  { id: "dead", label: "Dead", type: "end", x: 680, y: 150, description: "Agent tmux session died unexpectedly" },
  { id: "ci_failed", label: "CI Failed", type: "end", x: 620, y: 600, description: "CI pipeline failed — needs investigation" },
];

const EDGES: FlowEdge[] = [
  { from: "spawn", to: "tmux", branch: "normal" },
  { from: "tmux", to: "coding", label: "YES", branch: "yes" },
  { from: "tmux", to: "dead", label: "NO", branch: "no" },
  { from: "coding", to: "commit", branch: "normal" },
  { from: "commit", to: "pr", branch: "normal" },
  { from: "pr", to: "ci", branch: "normal" },
  { from: "ci", to: "review", label: "PASS", branch: "yes" },
  { from: "ci", to: "ci_failed", label: "FAIL", branch: "no" },
  { from: "review", to: "merge", branch: "normal" },
];

// Map task status to stage ID
function statusToStage(task: AgentTask): string {
  const s = task.status;
  if (s === "running") return task.tmuxAlive ? "coding" : "dead";
  if (s === "pending") return "spawn";
  if (s === "ci_pending") return "ci";
  if (s === "ci_failed") return "ci_failed";
  if (s === "ready_for_review") return "review";
  if (s === "done" || s === "completed") return "merge";
  if (s === "failed") return "dead";
  return "coding";
}

function getStage(id: string): FlowStage {
  return STAGES.find((s) => s.id === id)!;
}

export default function LiveMonitoringPage() {
  const { tasks } = useLive();
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // Group tasks by stage
  const tasksByStage = useMemo(() => {
    const map: Record<string, AgentTask[]> = {};
    for (const stage of STAGES) map[stage.id] = [];
    for (const task of tasks) {
      const stageId = statusToStage(task);
      if (map[stageId]) map[stageId].push(task);
    }
    return map;
  }, [tasks]);

  // Active stages (have at least 1 task)
  const activeStages = useMemo(() => {
    const set = new Set<string>();
    for (const [stageId, stageTasks] of Object.entries(tasksByStage)) {
      if (stageTasks.length > 0) set.add(stageId);
    }
    return set;
  }, [tasksByStage]);

  // Active edges: edges where 'from' has tasks
  const activeEdges = useMemo(() => {
    const set = new Set<string>();
    for (const edge of EDGES) {
      if (activeStages.has(edge.from) || activeStages.has(edge.to)) {
        set.add(`${edge.from}-${edge.to}`);
      }
    }
    return set;
  }, [activeStages]);

  const hoveredStageData = hoveredStage ? getStage(hoveredStage) : null;
  const hoveredTasks = hoveredStage ? tasksByStage[hoveredStage] || [] : [];

  const nodeW = 140;
  const nodeH = 46;

  function stageColors(stage: FlowStage): { fill: string; stroke: string; text: string; glow: string } {
    switch (stage.type) {
      case "start": return { fill: "rgba(34,211,238,0.12)", stroke: "#22d3ee", text: "#22d3ee", glow: "rgba(34,211,238,0.3)" };
      case "end":
        if (stage.id === "dead" || stage.id === "ci_failed")
          return { fill: "rgba(248,113,113,0.12)", stroke: "#f87171", text: "#f87171", glow: "rgba(248,113,113,0.3)" };
        return { fill: "rgba(52,211,153,0.12)", stroke: "#34d399", text: "#34d399", glow: "rgba(52,211,153,0.3)" };
      case "decision": return { fill: "rgba(251,191,36,0.12)", stroke: "#fbbf24", text: "#fbbf24", glow: "rgba(251,191,36,0.3)" };
      default: return { fill: "rgba(168,85,247,0.08)", stroke: "#a855f7", text: "#c084fc", glow: "rgba(168,85,247,0.3)" };
    }
  }

  function edgePath(edge: FlowEdge): string {
    const from = getStage(edge.from);
    const to = getStage(edge.to);

    // tmux -> coding (left branch from decision)
    if (edge.from === "tmux" && edge.to === "coding") {
      const fy = from.y + nodeH / 2 + 28;
      return `M ${from.x - 30} ${fy} L ${to.x} ${to.y}`;
    }
    // tmux -> dead (right branch from decision)
    if (edge.from === "tmux" && edge.to === "dead") {
      const fy = from.y + nodeH / 2 + 28;
      return `M ${from.x + 30} ${fy} L ${to.x - nodeW / 2 - 8} ${to.y + nodeH / 2}`;
    }
    // ci -> review (left branch from decision)
    if (edge.from === "ci" && edge.to === "review") {
      const fy = from.y + nodeH / 2 + 28;
      return `M ${from.x - 30} ${fy} L ${to.x} ${to.y}`;
    }
    // ci -> ci_failed (right branch from decision)
    if (edge.from === "ci" && edge.to === "ci_failed") {
      const fy = from.y + nodeH / 2 + 28;
      return `M ${from.x + 30} ${fy} L ${to.x} ${to.y}`;
    }
    // Default: straight down
    const fx = from.x;
    const fy = from.y + (from.type === "decision" ? nodeH / 2 + 28 : nodeH);
    const tx = to.x;
    const ty = to.y;
    return `M ${fx} ${fy + 4} L ${tx} ${ty - 4}`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-mono font-bold text-emerald-400 mb-1 flex items-center gap-2">
          <span className="text-emerald-400/50">&gt;</span> Monitoring Flowchart
        </h1>
        <p className="text-xs font-mono text-slate-500">
          Agent swarm lifecycle — live task positions shown at each stage
        </p>
      </motion.div>

      {/* Flowchart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden"
      >
        <svg viewBox="0 0 900 780" className="w-full h-auto" style={{ minHeight: 500 }}>
          <defs>
            <marker id="mon-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569" />
            </marker>
            <marker id="mon-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#34d399" />
            </marker>
            <marker id="mon-arr-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#f87171" />
            </marker>
            <pattern id="mon-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,116,139,0.06)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="900" height="780" fill="url(#mon-grid)" />

          {/* Edges */}
          {EDGES.map((edge, i) => {
            const marker = edge.branch === "yes" ? "url(#mon-arr-g)" : edge.branch === "no" ? "url(#mon-arr-r)" : "url(#mon-arr)";
            const stroke = edge.branch === "yes" ? "#34d399" : edge.branch === "no" ? "#f87171" : "#475569";
            const isActive = activeEdges.has(`${edge.from}-${edge.to}`);
            const d = edgePath(edge);

            const from = getStage(edge.from);
            const to = getStage(edge.to);
            const lx = (from.x + to.x) / 2;
            const ly = (from.y + to.y) / 2 + nodeH / 2;

            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isActive ? 2 : 1.5}
                  strokeOpacity={isActive ? 0.8 : 0.3}
                  strokeDasharray={isActive ? "8 4" : "none"}
                  markerEnd={marker}
                >
                  {isActive && (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="24;0"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </path>
                {edge.label && (
                  <text
                    x={lx + (edge.from === "tmux" && edge.branch === "yes" ? -60 : edge.from === "tmux" && edge.branch === "no" ? 60 : edge.from === "ci" && edge.branch === "yes" ? -50 : edge.from === "ci" && edge.branch === "no" ? 50 : 0)}
                    y={ly}
                    fill={edge.branch === "yes" ? "#34d399" : edge.branch === "no" ? "#f87171" : "#64748b"}
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

          {/* Nodes */}
          {STAGES.map((stage) => {
            const isHovered = hoveredStage === stage.id;
            const c = stageColors(stage);
            const count = tasksByStage[stage.id]?.length || 0;
            const isActive = activeStages.has(stage.id);
            const x = stage.x - nodeW / 2;
            const y = stage.y;

            if (stage.type === "decision") {
              const cx = stage.x;
              const cy = stage.y + nodeH / 2;
              const hw = nodeW / 2 + 10;
              const hh = nodeH / 2 + 8;
              const pts = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;

              return (
                <g
                  key={stage.id}
                  onMouseEnter={() => setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                  style={{ cursor: "pointer" }}
                >
                  {isHovered && (
                    <polygon points={pts} fill="none" stroke={c.glow} strokeWidth={6} opacity={0.4} />
                  )}
                  <polygon
                    points={pts}
                    fill={c.fill}
                    stroke={c.stroke}
                    strokeWidth={isHovered ? 2 : 1.5}
                  />
                  <text
                    x={cx}
                    y={cy + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={c.text}
                    fontSize={11}
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {stage.label}
                  </text>
                  {count > 0 && (
                    <g>
                      <circle cx={cx + hw - 8} cy={cy - hh + 8} r={10} fill={c.stroke} fillOpacity={0.9} />
                      <text
                        x={cx + hw - 8}
                        y={cy - hh + 12}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize={10}
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        {count}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            // Rectangle / pill node
            const rx = stage.type === "start" || stage.type === "end" ? 23 : 8;
            return (
              <g
                key={stage.id}
                onMouseEnter={() => setHoveredStage(stage.id)}
                onMouseLeave={() => setHoveredStage(null)}
                style={{ cursor: "pointer" }}
              >
                {isHovered && (
                  <rect x={x - 3} y={y - 3} width={nodeW + 6} height={nodeH + 6} rx={rx + 2} fill="none" stroke={c.glow} strokeWidth={4} opacity={0.4} />
                )}
                {isActive && (
                  <rect x={x - 2} y={y - 2} width={nodeW + 4} height={nodeH + 4} rx={rx + 1} fill="none" stroke={c.stroke} strokeWidth={1} opacity={0.2}>
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                  </rect>
                )}
                <rect
                  x={x}
                  y={y}
                  width={nodeW}
                  height={nodeH}
                  rx={rx}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={isHovered ? 2 : 1.5}
                />
                <text
                  x={stage.x}
                  y={y + nodeH / 2 + 5}
                  textAnchor="middle"
                  fill={c.text}
                  fontSize={12}
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {stage.label}
                </text>
                {count > 0 && (
                  <g>
                    <circle cx={x + nodeW - 4} cy={y + 4} r={10} fill={c.stroke} fillOpacity={0.9} />
                    <text
                      x={x + nodeW - 4}
                      y={y + 8}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize={10}
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      {count}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredStageData && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-4 py-3 shadow-xl z-10"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-white">{hoveredStageData.label}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                hoveredStageData.type === "decision" ? "bg-amber-400/10 text-amber-400" :
                hoveredStageData.type === "start" ? "bg-cyan-400/10 text-cyan-400" :
                (hoveredStageData.id === "dead" || hoveredStageData.id === "ci_failed") ? "bg-red-400/10 text-red-400" :
                hoveredStageData.type === "end" ? "bg-emerald-400/10 text-emerald-400" :
                "bg-purple-500/10 text-purple-500"
              }`}>
                {hoveredStageData.type}
              </span>
              {hoveredTasks.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {hoveredTasks.length} task{hoveredTasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{hoveredStageData.description}</p>
            {hoveredTasks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                {hoveredTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-300">{task.name || task.id}</span>
                    <span className="text-slate-500">({task.agent})</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Stage summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Running", stages: ["coding"], color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20" },
          { label: "In CI", stages: ["ci"], color: "text-amber-400", bgColor: "bg-amber-400/10", borderColor: "border-amber-400/20" },
          { label: "In Review", stages: ["review"], color: "text-cyan-400", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-400/20" },
          { label: "Merged", stages: ["merge"], color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-400/20" },
        ].map((card) => {
          const count = card.stages.reduce((s, st) => s + (tasksByStage[st]?.length || 0), 0);
          return (
            <div
              key={card.label}
              className={`rounded-xl border ${card.borderColor} ${card.bgColor} p-4 text-center`}
            >
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                {card.label}
              </div>
              <div className={`text-2xl font-mono font-bold ${card.color}`}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
