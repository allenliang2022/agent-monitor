import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = join(process.env.HOME || "/Users/liang", ".openclaw");
const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");
const ACTIVE_TASKS_FILE = join(CLAWDBOT_DIR, "active-tasks.json");

// Derive worktree base path from project directory
const PROJECT_DIR = process.cwd();
const WORKTREE_BASE = join(
  PROJECT_DIR,
  "..",
  `${PROJECT_DIR.split("/").pop()}-worktrees`
);

interface RawSession {
  sessionId?: string;
  updatedAt?: number;
  chatType?: string;
  lastChannel?: string;
  [k: string]: unknown;
}

interface RawTask {
  id: string;
  name?: string;
  agent?: string;
  model?: string;
  promptFile?: string;
  branch?: string;
  description?: string;
  startedAt?: string;
  completedAt?: string;
  status?: string;
  commit?: string;
  filesChanged?: number;
  summary?: string;
  worktree?: string;
  tmuxSession?: string;
  [key: string]: unknown;
}

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

interface FileChangesResult {
  directory: string;
  files: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
}

function readSessionStore(agentId: string) {
  const storePath = join(OPENCLAW_DIR, "agents", agentId, "sessions", "sessions.json");
  if (!existsSync(storePath)) return [];
  try {
    const data: Record<string, RawSession> = JSON.parse(readFileSync(storePath, "utf-8"));
    return Object.entries(data).map(([key, val]) => {
      const ageMs = val.updatedAt ? Date.now() - val.updatedAt : 0;
      const ageSec = Math.floor(ageMs / 1000);
      let age: string;
      if (ageSec < 60) age = `${ageSec}s`;
      else if (ageSec < 3600) age = `${Math.floor(ageSec / 60)}m`;
      else if (ageSec < 86400) age = `${Math.floor(ageSec / 3600)}h`;
      else age = `${Math.floor(ageSec / 86400)}d`;

      return {
        key,
        sessionId: val.sessionId,
        agentId,
        updatedAt: val.updatedAt,
        age,
        ageMs,
        chatType: val.chatType || "unknown",
        channel: val.lastChannel || "unknown",
      };
    });
  } catch {
    return [];
  }
}

function getGitStatus(dir: string): Record<string, unknown> | null {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: dir, encoding: "utf-8", timeout: 3000 }).trim();
    const statusOut = execSync("git status --short", { cwd: dir, encoding: "utf-8", timeout: 3000 }).trim();
    const logOut = execSync("git log --oneline -5", { cwd: dir, encoding: "utf-8", timeout: 3000 }).trim();
    return {
      branch,
      dirty: statusOut.split("\n").filter(Boolean).length,
      recentCommits: logOut.split("\n").filter(Boolean),
      statusFiles: statusOut.split("\n").filter(Boolean).slice(0, 20),
    };
  } catch {
    return null;
  }
}

function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 10000, stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

function checkTmuxSession(sessionName: string): boolean {
  try {
    execSync(`tmux has-session -t ${sessionName}`, {
      encoding: "utf-8",
      timeout: 3000,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function readActiveTasks() {
  if (!existsSync(ACTIVE_TASKS_FILE)) return [];
  try {
    const raw = readFileSync(ACTIVE_TASKS_FILE, "utf-8");
    const data = JSON.parse(raw);
    const rawTasks: RawTask[] = Array.isArray(data) ? data : data.tasks || [];

    return rawTasks.map((task) => {
            const tmuxSession = task.tmuxSession || task.id || "";
      const tmuxAlive = tmuxSession ? checkTmuxSession(tmuxSession) : false;
      const worktreeDir = task.worktree || task.id;
      const worktreePath = worktreeDir ? join(WORKTREE_BASE, worktreeDir) : undefined;

      // Smart status inference
      let inferredStatus = task.status || "unknown";
      if (inferredStatus === "running" && !tmuxAlive) {
        try {
          const wtPath = typeof worktreePath === 'string' ? worktreePath : '';
          if (wtPath && existsSync(wtPath)) {
            const branchCommits = execGit(
              "git log --oneline HEAD --not $(git merge-base HEAD main 2>/dev/null || echo HEAD~0) 2>/dev/null | wc -l",
              wtPath
            ).trim();
            inferredStatus = parseInt(branchCommits) > 0 ? "completed" : "dead";
          } else {
            inferredStatus = "dead";
          }
        } catch {
          inferredStatus = "dead";
        }
      }

      // Get file stats
      let liveFileCount = 0, liveAdditions = 0, liveDeletions = 0;
      try {
        const wtPath = typeof worktreePath === 'string' ? worktreePath : '';
        if (wtPath && existsSync(wtPath)) {
          const diffStat = execGit("git diff --stat HEAD~1..HEAD", wtPath);
          const matchF = diffStat.match(/(\d+) files? changed/);
          const matchA = diffStat.match(/(\d+) insertions?\(\+\)/);
          const matchD = diffStat.match(/(\d+) deletions?\(-\)/);
          if (matchF) liveFileCount = parseInt(matchF[1]);
          if (matchA) liveAdditions = parseInt(matchA[1]);
          if (matchD) liveDeletions = parseInt(matchD[1]);
        }
      } catch { /* ignore */ }

      return {
        ...task,
        tmuxAlive,
        worktreePath,
        status: inferredStatus,
        liveFileCount,
        liveAdditions,
        liveDeletions,
      };
    });
  } catch {
    return [];
  }
}

function getFileChanges(dir: string): FileChangesResult | null {
  if (!existsSync(dir)) return null;
  try {
    let diffRef = "HEAD~10";
    const mergeBase = execGit("git merge-base main HEAD", dir);
    if (mergeBase) diffRef = mergeBase;

    const numstat = execGit(`git diff --numstat ${diffRef}..HEAD`, dir);
    const uncommittedNumstat = execGit("git diff --numstat", dir);

    const fileMap = new Map<string, FileChange>();

    const parseNumstat = (output: string) => {
      if (!output) return;
      for (const line of output.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        if (parts.length < 3) continue;
        const additions = parts[0] === "-" ? 0 : parseInt(parts[0], 10) || 0;
        const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10) || 0;
        const filePath = parts[2];
        if (!filePath) continue;

        const existing = fileMap.get(filePath);
        if (existing) {
          existing.additions += additions;
          existing.deletions += deletions;
        } else {
          fileMap.set(filePath, { path: filePath, additions, deletions });
        }
      }
    };

    parseNumstat(numstat);
    parseNumstat(uncommittedNumstat);

    const files = Array.from(fileMap.values()).sort(
      (a, b) => b.additions + b.deletions - (a.additions + a.deletions)
    );

    let totalAdditions = 0;
    let totalDeletions = 0;
    for (const f of files) {
      totalAdditions += f.additions;
      totalDeletions += f.deletions;
    }

    return { directory: dir, files, totalAdditions, totalDeletions };
  } catch {
    return null;
  }
}

function collectData() {
  const agents = ["main", "girlfriend", "xiaolongnv"];
  const cutoff = Date.now() - 60 * 60 * 1000;
  const allSessions = [];
  for (const agentId of agents) {
    const sessions = readSessionStore(agentId);
    for (const s of sessions) {
      if (s.updatedAt && s.updatedAt > cutoff) {
        allSessions.push(s);
      }
    }
  }
  allSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const watchDirs = ["/Users/liang/work/agent-monitor"];
  const gitStatuses: Record<string, unknown> = {};
  for (const dir of watchDirs) {
    gitStatuses[dir] = getGitStatus(dir);
  }

  // Read active tasks with tmux status
  const tasks = readActiveTasks();

  // Collect file changes for each task's worktree
  const fileChanges: Record<string, FileChangesResult> = {};
  for (const task of tasks) {
    if (task.worktreePath && existsSync(task.worktreePath)) {
      const changes = getFileChanges(task.worktreePath);
      if (changes) {
        fileChanges[task.worktreePath] = changes;
      }
    }
  }

  return {
    type: "update",
    timestamp: new Date().toISOString(),
    sessions: { count: allSessions.length, sessions: allSessions },
    git: gitStatuses,
    tasks,
    fileChanges,
  };
}

export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const update = collectData();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
        } catch (e) {
          const errorEvent = {
            type: "error",
            timestamp: new Date().toISOString(),
            message: e instanceof Error ? e.message : "Failed to collect data",
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        }
      };

      send();
      intervalId = setInterval(send, 5000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
