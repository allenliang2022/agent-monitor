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

export interface AgentTask {
  id: string;
  name: string;
  agent: string;
  model?: string;
  promptFile?: string;
  branch?: string;
  description?: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed" | "pending" | "ci_pending" | "ci_failed" | "ready_for_review" | "done" | "dead" | "unknown";
  commit?: string;
  filesChanged?: number;
  liveFileCount?: number;
  liveAdditions?: number;
  liveDeletions?: number;
  summary?: string;
  tmuxAlive: boolean;
  worktreePath?: string;
  tmuxSession?: string;
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface FileChangesResult {
  directory: string;
  files: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author?: string;
  time?: string;
}

export interface GitInfo {
  directory: string;
  branch: string;
  clean: boolean;
  changedFiles: number;
  status: string;
  recentCommits: GitCommit[];
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
  tasks?: AgentTask[];
  fileChanges?: Record<string, FileChangesResult>;
}

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

// ─── Context shape ──────────────────────────────────────────────────────────

interface LiveContextValue {
  connected: boolean;
  tasks: AgentTask[];
  fileChanges: Record<string, FileChangesResult>;
  eventLog: EventLogEntry[];
  sseEventsCount: number;
  uptime: string;
  // Git-related
  gitDirs: string[];
  gitInput: string;
  setGitInput: (v: string) => void;
  gitData: Record<string, GitInfo>;
  handleAddGitDir: () => void;
  removeGitDir: (dir: string) => void;
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
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [fileChanges, setFileChanges] = useState<Record<string, FileChangesResult>>({});
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [gitDirs, setGitDirs] = useState<string[]>([]);
  const [gitInput, setGitInput] = useState("");
  const [gitData, setGitData] = useState<Record<string, GitInfo>>({});
  const logEndRef = useRef<HTMLDivElement>(null);
  const eventIdRef = useRef(0);
  const seededRef = useRef(false);

  const [sseEventsCount, setSseEventsCount] = useState(0);
  const [connectionTime] = useState(() => Date.now());
  const [uptime, setUptime] = useState("0s");

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

  // ── Fetch agent tasks (fallback polling, SSE is primary) ──────────────

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/agent-tasks");
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch {
      // silently retry next interval
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // ── Auto-populate git dirs from active tasks ───────────────────────────

  useEffect(() => {
    setGitDirs((prev) => {
      const newDirs = new Set(prev);
      // Always include main repo
      newDirs.add("/Users/liang/work/agent-monitor");
      // Add worktree paths from tasks
      for (const task of tasks) {
        if (task.worktreePath) {
          newDirs.add(task.worktreePath);
        }
      }
      return Array.from(newDirs);
    });
  }, [tasks]);

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

            // Update tasks from SSE if present — diff to generate events
            if (data.tasks && Array.isArray(data.tasks)) {
              const newTasks = data.tasks as AgentTask[];

              // Seed initial events from existing task data on first SSE update
              if (!seededRef.current && newTasks.length > 0) {
                seededRef.current = true;
                for (const task of newTasks) {
                  addLog("agent", `Task ${task.id}: status is ${task.status}`);
                }
              }

              setTasks((prevTasks) => {
                const prevMap = new Map(prevTasks.map(t => [t.id, t]));
                for (const task of newTasks) {
                  const prev = prevMap.get(task.id);
                  if (!prev) {
                    addLog("agent", `Task spawned: ${task.id} (${task.agent})`);
                  } else if (prev.status !== task.status) {
                    addLog("agent", `${task.id}: ${prev.status} → ${task.status}`);
                  } else if (prev.tmuxAlive && !task.tmuxAlive) {
                    addLog("agent", `${task.id}: agent process exited`);
                  }
                }
                return newTasks;
              });
            }

            // Update file changes from SSE if present
            if (data.fileChanges) {
              setFileChanges(data.fileChanges);
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
    tasks,
    fileChanges,
    eventLog,
    sseEventsCount,
    uptime,
    gitDirs,
    gitInput,
    setGitInput,
    gitData,
    handleAddGitDir,
    removeGitDir,
    logEndRef,
  };

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
