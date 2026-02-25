"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Session {
  key?: string;
  sessionId?: string;
  agentId?: string;
  age?: string;
  ageMs?: number;
  chatType?: string;
  channel?: string;
  updatedAt?: number;
}

interface HealthData {
  status: string;
  gateway?: string;
  uptime?: string;
  version?: string;
  raw?: string;
}

interface GitInfo {
  directory: string;
  branch: string;
  clean: boolean;
  changedFiles: number;
  status: string;
  recentCommits: { hash: string; message: string }[];
  diffStat: string;
  error?: string;
}

interface EventLogEntry {
  id: number;
  timestamp: string;
  type: string;
  message: string;
}

interface SSEUpdate {
  type: string;
  timestamp: string;
  sessions?: { sessions?: Session[] } | Session[];
  health?: HealthData;
  message?: string;
}

interface TimelineEvent {
  id: number;
  timestamp: string;
  type: "session_start" | "session_update" | "session_end" | "git_change";
  actor: string;
  detail: string;
}

interface ConfigData {
  agents: { name: string; hasCron: boolean; sessionCount: number }[];
  cron: { count: number; jobs: { name: string; schedule: string }[] };
  skills: { count: number; skills: string[] };
  channels: string[];
}

// ─── Agent color map ────────────────────────────────────────────────────────

const agentColor: Record<string, string> = {
  main: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
  girlfriend: "text-pink-400 border-pink-400/30 bg-pink-400/5",
  xiaolongnv: "text-purple-400 border-purple-400/30 bg-purple-400/5",
};

function getAgentColor(agent: string): string {
  const lower = (agent ?? "").toLowerCase();
  for (const key of Object.keys(agentColor)) {
    if (lower.includes(key)) return agentColor[key];
  }
  return "text-slate-300 border-slate-600/30 bg-slate-600/5";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LiveDashboard() {
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [health, setHealth] = useState<HealthData>({
    status: "unknown",
    gateway: "unknown",
  });
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [gitDirs, setGitDirs] = useState<string[]>(["/Users/liang/work/agent-monitor"]);
  const [gitInput, setGitInput] = useState("");
  const [gitData, setGitData] = useState<Record<string, GitInfo>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const eventIdRef = useRef(0);

  // ── New state for 4 additional sections ───────────────────────────────
  const [sseEventsCount, setSseEventsCount] = useState(0);
  const [connectionTime] = useState(() => Date.now());
  const [uptime, setUptime] = useState("0s");
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const timelineIdRef = useRef(0);
  const prevSessionKeysRef = useRef<Set<string>>(new Set());
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [expandedConfigSection, setExpandedConfigSection] = useState<string | null>("agents");

  // ── Add event to log ─────────────────────────────────────────────────────

  const addLog = useCallback((type: string, message: string) => {
    const entry: EventLogEntry = {
      id: eventIdRef.current++,
      timestamp: new Date().toISOString(),
      type,
      message,
    };
    setEventLog((prev) => [...prev.slice(-200), entry]);
  }, []);

  // ── Fetch git info ────────────────────────────────────────────────────────

  const fetchGit = useCallback(
    async (dir: string) => {
      try {
        const res = await fetch(
          `/api/git?dir=${encodeURIComponent(dir)}`
        );
        const data: GitInfo = await res.json();
        setGitData((prev) => ({ ...prev, [dir]: data }));
        if (data.error) {
          addLog("git-error", `${dir}: ${data.error}`);
        }
      } catch {
        addLog("git-error", `Failed to fetch git status for ${dir}`);
      }
    },
    [addLog]
  );

  // ── Poll git dirs ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (gitDirs.length === 0) return;
    // Fetch immediately
    gitDirs.forEach((d) => fetchGit(d));
    const interval = setInterval(() => {
      gitDirs.forEach((d) => fetchGit(d));
    }, 5000);
    return () => clearInterval(interval);
  }, [gitDirs, fetchGit]);

  // ── SSE connection ────────────────────────────────────────────────────────

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource("/api/events");

      es.onopen = () => {
        setConnected(true);
        addLog("system", "Connected to event stream");
      };

      es.onmessage = (event) => {
        try {
          const data: SSEUpdate = JSON.parse(event.data);

          if (data.type === "update") {
            // Increment SSE events counter
            setSseEventsCount((prev) => prev + 1);

            // Update sessions
            const rawSessions = data.sessions;
            let sessionsList: Session[] = [];
            if (Array.isArray(rawSessions)) {
              sessionsList = rawSessions;
            } else if (rawSessions && Array.isArray(rawSessions.sessions)) {
              sessionsList = rawSessions.sessions;
            }
            setSessions(sessionsList);

            // Track timeline events from session changes
            const currentKeys = new Set(sessionsList.map((s) => s.key ?? s.sessionId ?? "unknown"));
            const prevKeys = prevSessionKeysRef.current;

            // Detect new sessions
            currentKeys.forEach((key) => {
              if (!prevKeys.has(key)) {
                const session = sessionsList.find((s) => (s.key ?? s.sessionId) === key);
                setTimelineEvents((prev) =>
                  [
                    {
                      id: timelineIdRef.current++,
                      timestamp: new Date().toISOString(),
                      type: "session_start" as const,
                      actor: session?.agentId ?? "unknown",
                      detail: `Session started: ${key.replace(/^agent:\w+:/, "")}`,
                    },
                    ...prev,
                  ].slice(0, 50)
                );
              }
            });

            // Detect ended sessions
            prevKeys.forEach((key) => {
              if (!currentKeys.has(key)) {
                setTimelineEvents((prev) =>
                  [
                    {
                      id: timelineIdRef.current++,
                      timestamp: new Date().toISOString(),
                      type: "session_end" as const,
                      actor: "system",
                      detail: `Session ended: ${key.replace(/^agent:\w+:/, "")}`,
                    },
                    ...prev,
                  ].slice(0, 50)
                );
              }
            });

            // If sessions exist but no new/ended, log an update periodically
            if (currentKeys.size > 0 && currentKeys.size === prevKeys.size) {
              // Only add an update event every 6th SSE message to avoid flooding
              setSseEventsCount((cnt) => {
                if (cnt % 6 === 0) {
                  setTimelineEvents((prev) =>
                    [
                      {
                        id: timelineIdRef.current++,
                        timestamp: new Date().toISOString(),
                        type: "session_update" as const,
                        actor: sessionsList[0]?.agentId ?? "system",
                        detail: `${sessionsList.length} session(s) active`,
                      },
                      ...prev,
                    ].slice(0, 50)
                  );
                }
                return cnt;
              });
            }

            prevSessionKeysRef.current = currentKeys;

            // Update health
            if (data.health) {
              setHealth(data.health);
            }

            if (sessionsList.length > 0) {
              addLog(
                "sessions",
                `${sessionsList.length} active session(s)`
              );
            }
          } else if (data.type === "error") {
            addLog("error", data.message ?? "Unknown error");
          }
        } catch {
          addLog("parse-error", "Failed to parse SSE event");
        }
      };

      es.onerror = () => {
        setConnected(false);
        addLog("system", "Disconnected — reconnecting...");
        es?.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [addLog]);

  // ── Auto-scroll log ──────────────────────────────────────────────────────

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLog]);

  // ── Uptime ticker ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - connectionTime) / 1000);
      if (elapsed < 60) setUptime(`${elapsed}s`);
      else if (elapsed < 3600) setUptime(`${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
      else {
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        setUptime(`${h}h ${m}m`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [connectionTime]);

  // ── Fetch config ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config");
        const data: ConfigData = await res.json();
        setConfigData(data);
      } catch {
        // silently retry next interval
      }
    };
    fetchConfig();
    const interval = setInterval(fetchConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Add git dir ──────────────────────────────────────────────────────────

  const handleAddGitDir = () => {
    const dir = gitInput.trim();
    if (dir && !gitDirs.includes(dir)) {
      setGitDirs((prev) => [...prev, dir]);
      addLog("git", `Watching directory: ${dir}`);
    }
    setGitInput("");
  };

  const removeGitDir = (dir: string) => {
    setGitDirs((prev) => prev.filter((d) => d !== dir));
    setGitData((prev) => {
      const copy = { ...prev };
      delete copy[dir];
      return copy;
    });
    addLog("git", `Stopped watching: ${dir}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#111128] text-slate-200 p-4 md:p-8 space-y-6">
      {/* ── 1. System Status Bar ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4 bg-slate-900/60 border border-slate-800/50 rounded-lg px-5 py-3"
      >
        {/* Connection indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              connected
                ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            }`}
          />
          <span className="text-xs font-mono text-slate-400">
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        {/* Gateway */}
        <StatusPill
          label="Gateway"
          value={connected ? "connected" : "disconnected"}
          ok={connected}
        />
        <StatusPill
          label="Sessions"
          value={String(sessions.length)}
          ok={sessions.length > 0}
        />
        <StatusPill
          label="Agents"
          value={String(
            new Set(sessions.map((s) => s.agentId).filter(Boolean)).size
          )}
          ok={true}
        />
        <StatusPill
          label="Active"
          value={String(sessions.filter(s => (s.ageMs ?? 999999) < 300000).length)}
          ok={sessions.filter(s => (s.ageMs ?? 999999) < 300000).length > 0}
        />
      </motion.div>

      {/* ── 2. Active Sessions ──────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> Active Sessions
        </h2>

        {sessions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No active sessions detected. Waiting for data...
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800/50 text-slate-500">
                    <th className="text-left px-4 py-2">Session</th>
                    <th className="text-left px-4 py-2">Agent</th>
                    <th className="text-left px-4 py-2">Channel</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Age</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sessions.map((s, i) => {
                      const key = s.key ?? `s-${i}`;
                      const isExpanded = expandedSession === key;
                      return (
                        <motion.tr
                          key={key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() =>
                            setExpandedSession(isExpanded ? null : key)
                          }
                          className={`border-b border-slate-800/30 cursor-pointer hover:bg-slate-800/30 transition-colors ${
                            getAgentColor(s.agentId ?? "")
                          }`}
                        >
                          <td className="px-4 py-2 truncate max-w-[250px]">
                            {key.replace(/^agent:\w+:/, '')}
                          </td>
                          <td className="px-4 py-2 font-semibold">{s.agentId ?? "?"}</td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.channel ?? "?"}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.chatType ?? "?"}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.age ?? "?"}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${
                              (s.ageMs ?? 999999) < 300000
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                            }`}>
                              {(s.ageMs ?? 999999) < 300000 ? "active" : "idle"}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.section>

      {/* ── 3. Live Git Activity ────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Live Git Activity
        </h2>

        {/* Add dir input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={gitInput}
            onChange={(e) => setGitInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddGitDir()}
            placeholder="/path/to/watched/directory"
            className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-md px-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={handleAddGitDir}
            className="px-4 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-md text-xs font-mono text-purple-300 hover:bg-purple-500/30 transition-colors"
          >
            Watch
          </button>
        </div>

        {gitDirs.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-500 text-sm font-mono">
            No watched directories. Add a path above to monitor git activity.
          </div>
        ) : (
          <div className="grid gap-3">
            {gitDirs.map((dir) => {
              const info = gitData[dir];
              return (
                <motion.div
                  key={dir}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 truncate max-w-[400px]">
                        {dir}
                      </span>
                      {info && (
                        <>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {info.branch}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              info.clean
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {info.clean ? "CLEAN" : `${info.changedFiles} changed`}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => removeGitDir(dir)}
                      className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                    >
                      x
                    </button>
                  </div>

                  {info && !info.error && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {/* Recent commits */}
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono mb-1 block">
                          Recent Commits
                        </span>
                        <div className="space-y-1">
                          {info.recentCommits.map((c) => (
                            <div
                              key={c.hash}
                              className="text-[11px] font-mono text-slate-400 flex gap-2"
                            >
                              <span className="text-cyan-400/60 shrink-0">
                                {c.hash.slice(0, 7)}
                              </span>
                              <span className="truncate">{c.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Diff stat */}
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono mb-1 block">
                          Diff Stat
                        </span>
                        <pre className="text-[11px] font-mono text-slate-500 whitespace-pre-wrap break-all">
                          {info.diffStat}
                        </pre>
                      </div>
                    </div>
                  )}

                  {info?.error && (
                    <p className="text-xs font-mono text-red-400">
                      {info.error}
                    </p>
                  )}

                  {!info && (
                    <p className="text-xs font-mono text-slate-600 animate-pulse">
                      Loading...
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* ── 4. Event Log ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2">
          <span className="text-green-400/50">&gt;</span> Event Log
        </h2>
        <div className="bg-slate-950/60 border border-slate-800/50 rounded-lg p-3 h-64 overflow-y-auto font-mono text-[11px] scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
          {eventLog.length === 0 && (
            <p className="text-slate-600">Waiting for events...</p>
          )}
          <AnimatePresence>
            {eventLog.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 py-0.5"
              >
                <span className="text-slate-600 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`shrink-0 w-16 ${
                    entry.type === "error" || entry.type === "git-error"
                      ? "text-red-400"
                      : entry.type === "system"
                      ? "text-amber-400"
                      : entry.type === "sessions"
                      ? "text-cyan-400"
                      : entry.type === "git"
                      ? "text-purple-400"
                      : "text-slate-500"
                  }`}
                >
                  [{entry.type}]
                </span>
                <span className="text-slate-300">{entry.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logEndRef} />
        </div>
      </motion.section>

      {/* ════════════════════════════════════════════════════════════════════
          NEW SECTIONS BELOW — Live Overview, Timeline, Agent Status, Config
          ════════════════════════════════════════════════════════════════════ */}

      {/* ── 5. Live Overview (Mission Control) ─────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-mono text-cyan-400 flex items-center gap-2">
            <span className="text-cyan-400/50">&gt;</span> Live Overview
          </h2>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            MISSION CONTROL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Active Sessions */}
          <motion.div
            className="bg-slate-900/40 border border-cyan-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">ACTIVE SESSIONS</div>
            <motion.div
              key={sessions.length}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-cyan-400"
            >
              {sessions.length}
            </motion.div>
          </motion.div>

          {/* Active Agents */}
          <motion.div
            className="bg-slate-900/40 border border-purple-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">ACTIVE AGENTS</div>
            <motion.div
              key={new Set(sessions.map((s) => s.agentId).filter(Boolean)).size}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-purple-400"
            >
              {new Set(sessions.map((s) => s.agentId).filter(Boolean)).size}
            </motion.div>
          </motion.div>

          {/* Uptime */}
          <motion.div
            className="bg-slate-900/40 border border-green-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">UPTIME</div>
            <div className="text-2xl font-mono font-bold text-green-400">
              {uptime}
            </div>
          </motion.div>

          {/* Events Received */}
          <motion.div
            className="bg-slate-900/40 border border-amber-500/20 rounded-lg p-4 text-center"
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] font-mono text-slate-500 mb-1">EVENTS RECEIVED</div>
            <motion.div
              key={sseEventsCount}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-mono font-bold text-amber-400"
            >
              {sseEventsCount}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── 6. Live Session Timeline ───────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-sm font-mono text-cyan-400 mb-3 flex items-center gap-2">
          <span className="text-cyan-400/50">&gt;</span> Live Timeline
        </h2>
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 max-h-80 overflow-y-auto">
          {timelineEvents.length === 0 ? (
            <p className="text-slate-600 text-xs font-mono text-center py-4">
              No timeline events yet. Waiting for session changes...
            </p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700/50" />
              <AnimatePresence>
                {timelineEvents.map((evt) => {
                  const dotColor =
                    evt.type === "session_start"
                      ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                      : evt.type === "session_end"
                      ? "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
                      : evt.type === "git_change"
                      ? "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]"
                      : "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]";

                  const actorColor =
                    evt.actor === "main"
                      ? "text-cyan-400"
                      : evt.actor === "girlfriend"
                      ? "text-pink-400"
                      : evt.actor === "xiaolongnv"
                      ? "text-purple-400"
                      : "text-slate-400";

                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="relative flex items-start gap-3 pl-7 pb-3"
                    >
                      <div
                        className={`absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full ${dotColor}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-600">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              evt.type === "session_start"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : evt.type === "session_end"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : evt.type === "git_change"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                            }`}
                          >
                            {evt.type.replace("_", " ")}
                          </span>
                          <span className={`text-[10px] font-mono font-semibold ${actorColor}`}>
                            {evt.actor}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                          {evt.detail}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── 7. Live Agent Status Monitor ───────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-sm font-mono text-purple-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400/50">&gt;</span> Live Agent Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["main", "girlfriend", "xiaolongnv"] as const).map((agentName) => {
            const agentSessions = sessions.filter(
              (s) => s.agentId?.toLowerCase() === agentName
            );
            const isActive = agentSessions.some(
              (s) => (s.ageMs ?? 999999) < 300000
            );
            const lastActivity = agentSessions.length > 0
              ? agentSessions.reduce((latest, s) =>
                  (s.updatedAt ?? 0) > (latest.updatedAt ?? 0) ? s : latest
                )
              : null;

            const borderColor =
              agentName === "main"
                ? "border-cyan-500/30"
                : agentName === "girlfriend"
                ? "border-pink-500/30"
                : "border-purple-500/30";

            const nameColor =
              agentName === "main"
                ? "text-cyan-400"
                : agentName === "girlfriend"
                ? "text-pink-400"
                : "text-purple-400";

            const glowColor =
              agentName === "main"
                ? "shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                : agentName === "girlfriend"
                ? "shadow-[0_0_15px_rgba(244,114,182,0.15)]"
                : "shadow-[0_0_15px_rgba(192,132,252,0.15)]";

            return (
              <motion.div
                key={agentName}
                className={`bg-slate-900/40 border ${borderColor} rounded-lg p-4 ${
                  isActive ? glowColor : ""
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <span className="relative flex h-2 w-2">
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            agentName === "main"
                              ? "bg-cyan-400"
                              : agentName === "girlfriend"
                              ? "bg-pink-400"
                              : "bg-purple-400"
                          }`}
                        />
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            agentName === "main"
                              ? "bg-cyan-400"
                              : agentName === "girlfriend"
                              ? "bg-pink-400"
                              : "bg-purple-400"
                          }`}
                        />
                      </span>
                    )}
                    <span className={`font-mono font-semibold text-sm ${nameColor}`}>
                      {agentName}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isActive
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                    }`}
                  >
                    {isActive ? "ACTIVE" : "IDLE"}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sessions</span>
                    <span className="text-slate-300">{agentSessions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Channel</span>
                    <span className="text-slate-400 truncate max-w-[120px]">
                      {agentSessions[0]?.channel ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Activity</span>
                    <span className="text-slate-400">
                      {lastActivity?.updatedAt
                        ? new Date(lastActivity.updatedAt).toLocaleTimeString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Age</span>
                    <span className="text-slate-400">
                      {agentSessions[0]?.age ?? "—"}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* ── 8. Live Config Display ─────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h2 className="text-sm font-mono text-amber-400 mb-3 flex items-center gap-2">
          <span className="text-amber-400/50">&gt;</span> System Config
        </h2>

        {!configData ? (
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg p-6 text-center text-slate-600 text-xs font-mono animate-pulse">
            Loading configuration...
          </div>
        ) : (
          <div className="space-y-2">
            {/* Agents Config */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "agents" ? null : "agents"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">&#9654;</span>
                  <span>Agents Config</span>
                  <span className="text-slate-600">({configData.agents.length})</span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "agents" ? "▲" : "▼"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "agents" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-2">
                      {configData.agents.map((agent) => (
                        <div
                          key={agent.name}
                          className="flex items-center justify-between text-[11px] font-mono py-1 border-t border-slate-800/30"
                        >
                          <span
                            className={
                              agent.name === "main"
                                ? "text-cyan-400"
                                : agent.name === "girlfriend"
                                ? "text-pink-400"
                                : agent.name === "xiaolongnv"
                                ? "text-purple-400"
                                : "text-slate-300"
                            }
                          >
                            {agent.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500">
                              {agent.sessionCount} sessions
                            </span>
                            {agent.hasCron && (
                              <span className="text-amber-400/60 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                cron
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Cron Jobs */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "cron" ? null : "cron"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">&#9654;</span>
                  <span>Active Cron Jobs</span>
                  <span className="text-slate-600">({configData.cron.count})</span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "cron" ? "▲" : "▼"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "cron" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-1">
                      {configData.cron.jobs.length === 0 ? (
                        <p className="text-slate-600 text-[11px] font-mono py-1">
                          No cron jobs configured.
                        </p>
                      ) : (
                        configData.cron.jobs.map((job, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-[11px] font-mono py-1 border-t border-slate-800/30"
                          >
                            <span className="text-slate-300">{job.name}</span>
                            <span className="text-amber-400/70">{job.schedule}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Installed Skills */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "skills" ? null : "skills"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#9654;</span>
                  <span>Installed Skills</span>
                  <span className="text-slate-600">({configData.skills.count})</span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "skills" ? "▲" : "▼"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "skills" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3">
                      {configData.skills.skills.length === 0 ? (
                        <p className="text-slate-600 text-[11px] font-mono py-1">
                          No skills installed.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {configData.skills.skills.map((skill) => (
                            <span
                              key={skill}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Channel Bindings */}
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedConfigSection(
                    expandedConfigSection === "channels" ? null : "channels"
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-slate-300 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">&#9654;</span>
                  <span>Channel Bindings</span>
                  <span className="text-slate-600">({configData.channels.length})</span>
                </div>
                <span className="text-slate-600">
                  {expandedConfigSection === "channels" ? "▲" : "▼"}
                </span>
              </button>
              <AnimatePresence>
                {expandedConfigSection === "channels" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3">
                      {configData.channels.length === 0 ? (
                        <p className="text-slate-600 text-[11px] font-mono py-1">
                          No channels detected.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {configData.channels.map((ch) => (
                            <span
                              key={ch}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusPill({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="text-slate-500">{label}:</span>
      <span className={ok ? "text-green-400" : "text-red-400"}>{value}</span>
    </div>
  );
}
