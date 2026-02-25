"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Session {
  key?: string;
  sessionId?: string;
  agentId?: string;
  age?: string;
  ageMs?: number;
  chatType?: string;
  channel?: string;
  updatedAt?: number;
}

export interface HealthData {
  status: string;
  gateway?: string;
  uptime?: string;
  version?: string;
  raw?: string;
}

export interface GitInfo {
  directory: string;
  branch: string;
  clean: boolean;
  changedFiles: number;
  status: string;
  recentCommits: { hash: string; message: string }[];
  diffStat: string;
  error?: string;
}

export interface EventLogEntry {
  id: number;
  timestamp: string;
  type: string;
  message: string;
}

export interface SSEUpdate {
  type: string;
  timestamp: string;
  sessions?: { sessions?: Session[] } | Session[];
  health?: HealthData;
  message?: string;
}

export interface TimelineEvent {
  id: number;
  timestamp: string;
  type: "session_start" | "session_update" | "session_end" | "git_change";
  actor: string;
  detail: string;
}

export interface ConfigData {
  agents: { name: string; hasCron: boolean; sessionCount: number }[];
  cron: { count: number; jobs: { name: string; schedule: string }[] };
  skills: { count: number; skills: string[] };
  channels: string[];
}

// ─── Agent color map ────────────────────────────────────────────────────────

const agentColorMap: Record<string, string> = {
  main: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
  girlfriend: "text-pink-400 border-pink-400/30 bg-pink-400/5",
  xiaolongnv: "text-purple-400 border-purple-400/30 bg-purple-400/5",
};

export function getAgentColor(agent: string): string {
  const lower = (agent ?? "").toLowerCase();
  for (const key of Object.keys(agentColorMap)) {
    if (lower.includes(key)) return agentColorMap[key];
  }
  return "text-slate-300 border-slate-600/30 bg-slate-600/5";
}

// ─── Context shape ──────────────────────────────────────────────────────────

interface LiveContextValue {
  connected: boolean;
  sessions: Session[];
  health: HealthData;
  eventLog: EventLogEntry[];
  sseEventsCount: number;
  uptime: string;
  timelineEvents: TimelineEvent[];
  configData: ConfigData | null;
  expandedConfigSection: string | null;
  setExpandedConfigSection: (s: string | null) => void;
  // Git-related
  gitDirs: string[];
  gitInput: string;
  setGitInput: (v: string) => void;
  gitData: Record<string, GitInfo>;
  handleAddGitDir: () => void;
  removeGitDir: (dir: string) => void;
  // Session expansion
  expandedSession: string | null;
  setExpandedSession: (s: string | null) => void;
  // Log ref
  logEndRef: React.RefObject<HTMLDivElement | null>;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function useLive(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within <LiveProvider>");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function LiveProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [health, setHealth] = useState<HealthData>({
    status: "unknown",
    gateway: "unknown",
  });
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [gitDirs, setGitDirs] = useState<string[]>([
    "/Users/liang/work/agent-monitor",
  ]);
  const [gitInput, setGitInput] = useState("");
  const [gitData, setGitData] = useState<Record<string, GitInfo>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const eventIdRef = useRef(0);

  const [sseEventsCount, setSseEventsCount] = useState(0);
  const [connectionTime] = useState(() => Date.now());
  const [uptime, setUptime] = useState("0s");
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const timelineIdRef = useRef(0);
  const prevSessionKeysRef = useRef<Set<string>>(new Set());
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [expandedConfigSection, setExpandedConfigSection] = useState<
    string | null
  >("agents");

  // ── Add event to log ────────────────────────────────────────────────────

  const addLog = useCallback((type: string, message: string) => {
    const entry: EventLogEntry = {
      id: eventIdRef.current++,
      timestamp: new Date().toISOString(),
      type,
      message,
    };
    setEventLog((prev) => [...prev.slice(-200), entry]);
  }, []);

  // ── Fetch git info ──────────────────────────────────────────────────────

  const fetchGit = useCallback(
    async (dir: string) => {
      try {
        const res = await fetch(`/api/git?dir=${encodeURIComponent(dir)}`);
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

  // ── Poll git dirs ─────────────────────────────────────────────────────

  useEffect(() => {
    if (gitDirs.length === 0) return;
    gitDirs.forEach((d) => fetchGit(d));
    const interval = setInterval(() => {
      gitDirs.forEach((d) => fetchGit(d));
    }, 5000);
    return () => clearInterval(interval);
  }, [gitDirs, fetchGit]);

  // ── SSE connection ────────────────────────────────────────────────────

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
            setSseEventsCount((prev) => prev + 1);

            const rawSessions = data.sessions;
            let sessionsList: Session[] = [];
            if (Array.isArray(rawSessions)) {
              sessionsList = rawSessions;
            } else if (rawSessions && Array.isArray(rawSessions.sessions)) {
              sessionsList = rawSessions.sessions;
            }
            setSessions(sessionsList);

            // Track timeline events from session changes
            const currentKeys = new Set(
              sessionsList.map((s) => s.key ?? s.sessionId ?? "unknown")
            );
            const prevKeys = prevSessionKeysRef.current;

            // Detect new sessions
            currentKeys.forEach((key) => {
              if (!prevKeys.has(key)) {
                const session = sessionsList.find(
                  (s) => (s.key ?? s.sessionId) === key
                );
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

            // Periodic update events
            if (currentKeys.size > 0 && currentKeys.size === prevKeys.size) {
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

            if (data.health) {
              setHealth(data.health);
            }

            if (sessionsList.length > 0) {
              addLog("sessions", `${sessionsList.length} active session(s)`);
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

  // ── Auto-scroll log ─────────────────────────────────────────────────────

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLog]);

  // ── Uptime ticker ───────────────────────────────────────────────────────

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - connectionTime) / 1000);
      if (elapsed < 60) setUptime(`${elapsed}s`);
      else if (elapsed < 3600)
        setUptime(`${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
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

  // ── Fetch config ────────────────────────────────────────────────────────

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

  // ── Add / remove git dir ────────────────────────────────────────────────

  const handleAddGitDir = useCallback(() => {
    const dir = gitInput.trim();
    if (dir && !gitDirs.includes(dir)) {
      setGitDirs((prev) => [...prev, dir]);
      addLog("git", `Watching directory: ${dir}`);
    }
    setGitInput("");
  }, [gitInput, gitDirs, addLog]);

  const removeGitDir = useCallback(
    (dir: string) => {
      setGitDirs((prev) => prev.filter((d) => d !== dir));
      setGitData((prev) => {
        const copy = { ...prev };
        delete copy[dir];
        return copy;
      });
      addLog("git", `Stopped watching: ${dir}`);
    },
    [addLog]
  );

  // ── Value ───────────────────────────────────────────────────────────────

  const value: LiveContextValue = {
    connected,
    sessions,
    health,
    eventLog,
    sseEventsCount,
    uptime,
    timelineEvents,
    configData,
    expandedConfigSection,
    setExpandedConfigSection,
    gitDirs,
    gitInput,
    setGitInput,
    gitData,
    handleAddGitDir,
    removeGitDir,
    expandedSession,
    setExpandedSession,
    logEndRef,
  };

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
