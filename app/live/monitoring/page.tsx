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

// Format duration from milliseconds
function formatDuration(ms: number): string {
  if (ms < 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Format a timestamp to a short time string
function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

// Compute timing info for tasks at a stage
interface StageTiming {
  duration: string;        // how long the longest task has been in this stage
  lastEntered: string;     // when the most recent task entered this stage
  lastEnteredTime: string; // formatted time
}

function computeStageTiming(tasks: AgentTask[], now: number): StageTiming {
  if (tasks.length === 0) {
    return { duration: "", lastEntered: "", lastEnteredTime: "" };
  }

  let longestDuration = 0;
  let latestEntry = "";

  for (const task of tasks) {
    const startTime = task.startedAt ? new Date(task.startedAt).getTime() : 0;
    const endTime = task.completedAt ? new Date(task.completedAt).getTime() : now;

    if (startTime > 0) {
      const dur = endTime - startTime;
      if (dur > longestDuration) longestDuration = dur;
    }

    // Track the most recent task to enter this stage
    const entryTime = task.startedAt || "";
    if (!latestEntry || (entryTime && entryTime > latestEntry)) {
      latestEntry = entryTime;
    }
  }

  return {
    duration: longestDuration > 0 ? formatDuration(longestDuration) : "",
    lastEntered: latestEntry,
    lastEnteredTime: latestEntry ? formatTime(latestEntry) : "",
  };
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

  // Timing info per stage
  const timingByStage = useMemo(() => {
    const now = Date.now();
    const map: Record<string, StageTiming> = {};
    for (const stage of STAGES) {
      map[stage.id] = computeStageTiming(tasksByStage[stage.id] || [], now);
    }
    return map;
  }, [tasksByStage]);

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
  const hoveredTiming = hoveredStage ? timingByStage[hoveredStage] : null;

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

  // Render task name labels near a node
  function renderTaskLabels(stage: FlowStage, stageTasks: AgentTask[], c: ReturnType<typeof stageColors>) {
    if (stageTasks.length === 0) return null;
    const timing = timingByStage[stage.id];

    // Position labels to the right of the node (or left for right-side nodes)
    const isRightSide = stage.x > 500;
    const labelX = isRightSide ? stage.x - nodeW / 2 - 10 : stage.x + nodeW / 2 + 10;
    const textAnchor = isRightSide ? "end" : "start";
    const baseY = stage.type === "decision" ? stage.y + nodeH / 2 - 12 : stage.y + 4;

    return (
      <g>
        {/* Duration label */}
        {timing.duration && (
          <text
            x={labelX}
            y={baseY}
            textAnchor={textAnchor}
            fill={c.text}
            fontSize={10}
            fontFamily="monospace"
            fontWeight="700"
            opacity={0.9}
          >
            {timing.duration}
          </text>
        )}

        {/* Task names */}
        {stageTasks.slice(0, 3).map((task, i) => (
          <text
            key={task.id}
            x={labelX}
            y={baseY + 14 + i * 13}
            textAnchor={textAnchor}
            fill={c.text}
            fontSize={9}
            fontFamily="monospace"
            opacity={0.6}
          >
            {(task.name || task.id).slice(0, 18)}{(task.name || task.id).length > 18 ? "..." : ""}
          </text>
        ))}
        {stageTasks.length > 3 && (
          <text
            x={labelX}
            y={baseY + 14 + 3 * 13}
            textAnchor={textAnchor}
            fill={c.text}
            fontSize={9}
            fontFamily="monospace"
            opacity={0.4}
          >
            +{stageTasks.length - 3} more
          </text>
        )}

        {/* Timestamp */}
        {timing.lastEnteredTime && (
          <text
            x={labelX}
            y={baseY + 14 + Math.min(stageTasks.length, 3) * 13 + (stageTasks.length > 3 ? 13 : 0)}
            textAnchor={textAnchor}
            fill="#64748b"
            fontSize={8}
            fontFamily="monospace"
            opacity={0.7}
          >
            @ {timing.lastEnteredTime}
          </text>
        )}
      </g>
    );
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
                  {/* Task labels for decision nodes */}
                  {renderTaskLabels(stage, tasksByStage[stage.id] || [], c)}
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
                {/* Task labels next to nodes */}
                {renderTaskLabels(stage, tasksByStage[stage.id] || [], c)}
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
              {hoveredTiming?.duration && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700/50 text-amber-400">
                  {hoveredTiming.duration}
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
                    {task.startedAt && (
                      <span className="text-slate-600 ml-auto">
                        {formatDuration(Date.now() - new Date(task.startedAt).getTime())} ago
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Summary stats — cumulative counts from all tasks */}
      {(() => {
        // Compute cumulative stats from all tasks (not just current stage positions)
        const totalTasks = tasks.length;
        const runningCount = tasks.filter((t) => t.status === "running").length;
        const completedCount = tasks.filter((t) => t.status === "completed" || t.status === "done").length;
        const failedCount = tasks.filter((t) => t.status === "failed" || t.status === "dead").length;
        const pendingCount = tasks.filter((t) => t.status === "pending").length;
        const ciCount = tasks.filter((t) => t.status === "ci_pending" || t.status === "ci_failed").length;
        const reviewCount = tasks.filter((t) => t.status === "ready_for_review").length;

        const finishedCount = completedCount + failedCount;
        const successRate = finishedCount > 0 ? Math.round((completedCount / finishedCount) * 100) : null;

        const allZero = totalTasks === 0;

        if (allZero) {
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-8 text-center"
            >
              <div className="text-slate-600 text-sm font-mono mb-2">No tasks yet</div>
              <p className="text-[10px] font-mono text-slate-700">
                Spawn an agent from the Tasks page to see monitoring data here
              </p>
            </motion.div>
          );
        }

        const cards = [
          {
            label: "Total",
            count: totalTasks,
            sub: pendingCount > 0 ? `${pendingCount} pending` : null,
            color: "text-slate-300",
            bgColor: "bg-slate-500/10",
            borderColor: "border-slate-500/20",
          },
          {
            label: "Running",
            count: runningCount,
            sub: ciCount > 0 ? `${ciCount} in CI` : reviewCount > 0 ? `${reviewCount} in review` : null,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
          },
          {
            label: "Completed",
            count: completedCount,
            sub: failedCount > 0 ? `${failedCount} failed` : null,
            color: "text-emerald-400",
            bgColor: "bg-emerald-400/10",
            borderColor: "border-emerald-400/20",
          },
          {
            label: "Success Rate",
            count: successRate !== null ? `${successRate}%` : "--",
            sub: finishedCount > 0 ? `${finishedCount} finished` : "no finished tasks",
            color: successRate !== null && successRate >= 80 ? "text-emerald-400" : successRate !== null && successRate >= 50 ? "text-amber-400" : successRate !== null ? "text-red-400" : "text-slate-500",
            bgColor: successRate !== null && successRate >= 80 ? "bg-emerald-400/10" : successRate !== null && successRate >= 50 ? "bg-amber-400/10" : successRate !== null ? "bg-red-400/10" : "bg-slate-500/10",
            borderColor: successRate !== null && successRate >= 80 ? "border-emerald-400/20" : successRate !== null && successRate >= 50 ? "border-amber-400/20" : successRate !== null ? "border-red-400/20" : "border-slate-500/20",
          },
        ];

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map((card) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`rounded-xl border ${card.borderColor} ${card.bgColor} p-4`}
              >
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                  {card.label}
                </div>
                <div className={`text-2xl font-mono font-bold ${card.color}`}>
                  {card.count}
                </div>
                {card.sub && (
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {card.sub}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
