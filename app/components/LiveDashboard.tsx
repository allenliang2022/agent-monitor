"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Session {
  key?: string;
  session_key?: string;
  agent?: string;
  model?: string;
  age?: string;
  tokens_used?: number;
  status?: string;
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
  const [gitDirs, setGitDirs] = useState<string[]>([]);
  const [gitInput, setGitInput] = useState("");
  const [gitData, setGitData] = useState<Record<string, GitInfo>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const eventIdRef = useRef(0);

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
            // Update sessions
            const rawSessions = data.sessions;
            let sessionsList: Session[] = [];
            if (Array.isArray(rawSessions)) {
              sessionsList = rawSessions;
            } else if (rawSessions && Array.isArray(rawSessions.sessions)) {
              sessionsList = rawSessions.sessions;
            }
            setSessions(sessionsList);

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
          value={health.gateway ?? health.status}
          ok={health.status === "healthy"}
        />
        <StatusPill
          label="Sessions"
          value={String(sessions.length)}
          ok={sessions.length > 0}
        />
        <StatusPill
          label="Agents"
          value={String(
            new Set(sessions.map((s) => s.agent).filter(Boolean)).size
          )}
          ok={true}
        />
        {health.uptime && (
          <StatusPill label="Uptime" value={health.uptime} ok={true} />
        )}
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
                    <th className="text-left px-4 py-2">Model</th>
                    <th className="text-left px-4 py-2">Age</th>
                    <th className="text-right px-4 py-2">Tokens</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sessions.map((s, i) => {
                      const key = s.key ?? s.session_key ?? `s-${i}`;
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
                            getAgentColor(s.agent ?? "")
                          }`}
                        >
                          <td className="px-4 py-2 truncate max-w-[200px]">
                            {key}
                          </td>
                          <td className="px-4 py-2">{s.agent ?? "—"}</td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.model ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-slate-400">
                            {s.age ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-400">
                            {s.tokens_used?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                              {s.status ?? "active"}
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
