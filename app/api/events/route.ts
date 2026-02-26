import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import {
  getFileChanges,
  execGit,
  type FileChange,
  type FileChangesResult,
} from "../../lib/git-changes";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = join(process.env.HOME || "/Users/liang", ".openclaw");
const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");
const ACTIVE_TASKS_FILE = join(CLAWDBOT_DIR, "active-tasks.json");

// Derive worktree base path: <project>-worktrees/
const PROJECT_DIR = process.cwd();
const WORKTREE_BASE = `${PROJECT_DIR}-worktrees`;

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

/**
 * Infer the true status of a task whose tmux session is no longer alive.
 * Checks multiple git signals to determine if the agent completed its work.
 */
function inferStatusFromGit(task: RawTask, worktreePath: string | undefined): string {
  try {
    const wtPath = typeof worktreePath === "string" ? worktreePath : "";

    if (wtPath && existsSync(wtPath)) {
      // Worktree exists — check for commits on the branch
      const branchCommits = execGit(
        "git log --oneline HEAD --not main 2>/dev/null | wc -l",
        wtPath
      ).trim();
      if (parseInt(branchCommits) > 0) {
        return "completed";
      }

      // No exclusive commits — check if branch was already merged into main
      const headSha = execGit("git rev-parse HEAD", wtPath).trim();
      const mainSha = execGit("git rev-parse main", wtPath).trim();
      if (headSha && mainSha && headSha !== mainSha) {
        const isAncestor = execGit(
          `git merge-base --is-ancestor HEAD main && echo "yes" || echo "no"`,
          wtPath
        ).trim();
        if (isAncestor === "yes") {
          return "completed";
        }
      } else if (headSha && headSha === mainSha) {
        return "dead";
      }

      return "dead";
    }

    // Worktree doesn't exist — check from repo root
    const branchRef = task.branch || "";
    if (branchRef) {
      const merged = execGit(
        `git branch --merged main 2>/dev/null`,
        PROJECT_DIR
      ).trim();
      if (merged && merged.split("\n").some(b => b.trim() === branchRef || b.trim() === `remotes/origin/${branchRef}`)) {
        return "completed";
      }

      const branchExists = execGit(
        `git rev-parse --verify "${branchRef}" 2>/dev/null && echo "yes" || echo "no"`,
        PROJECT_DIR
      ).trim();
      if (branchExists === "yes") {
        return "completed";
      }
    }

    return "dead";
  } catch {
    return "dead";
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
        // Agent's tmux session is gone — determine outcome from git state
        inferredStatus = inferStatusFromGit(task, worktreePath);
      }

      // Get file stats using the shared detection logic
      let liveFileCount = 0, liveAdditions = 0, liveDeletions = 0;
      let liveFiles: FileChange[] = [];
      const wtPath = typeof worktreePath === 'string' ? worktreePath : '';
      if (wtPath && existsSync(wtPath)) {
        const changes = getFileChanges(wtPath);
        if (changes) {
          liveFileCount = changes.totalFiles;
          liveAdditions = changes.totalAdditions;
          liveDeletions = changes.totalDeletions;
          liveFiles = changes.files;
        }
      }

      return {
        ...task,
        tmuxAlive,
        worktreePath,
        status: inferredStatus,
        liveFileCount,
        liveAdditions,
        liveDeletions,
        liveFiles,
      };
    });
  } catch {
    return [];
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

  const watchDirs = [PROJECT_DIR];
  const gitStatuses: Record<string, unknown> = {};
  for (const dir of watchDirs) {
    gitStatuses[dir] = getGitStatus(dir);
  }

  // Read active tasks with tmux status
  const tasks = readActiveTasks();

  // Collect file changes for each task's worktree using the shared logic
  const fileChanges: Record<string, FileChangesResult> = {};
  for (const task of tasks) {
    if (task.worktreePath && existsSync(task.worktreePath)) {
      const changes = getFileChanges(task.worktreePath);
      if (changes) {
        fileChanges[task.worktreePath] = changes;
      }
    }
  }

  // Collect recent git commits from all branches (last 24 hours)
  const recentCommitsRaw = execGit(
    'git log --all --oneline --format="%H|%s|%an|%aI|%D" --since="24 hours ago"',
    PROJECT_DIR
  );
  const recentCommits = recentCommitsRaw
    .split("\n")
    .filter(l => l.trim())
    .map(line => {
      const parts = line.split("|");
      const refs = (parts[4] || "").split(",").map(r => r.trim()).filter(Boolean);
      // Try to map commit to a task by matching branch refs
      let taskId: string | undefined;
      for (const ref of refs) {
        const branchMatch = ref.match(/feat\/(.+)/);
        if (branchMatch) {
          taskId = branchMatch[1];
          break;
        }
      }
      return {
        hash: parts[0] || "",
        message: parts[1] || "",
        author: parts[2] || "",
        date: parts[3] || "",
        refs,
        taskId,
      };
    });

  // Get branches merged into main (for detecting task merges)
  const mergedBranchesRaw = execGit("git branch --merged main", PROJECT_DIR);
  const mergedBranches = mergedBranchesRaw
    .split("\n")
    .map(b => b.trim().replace(/^\*\s*/, ""))
    .filter(b => b.length > 0 && b.startsWith("feat/"));

  return {
    type: "update",
    timestamp: new Date().toISOString(),
    sessions: { count: allSessions.length, sessions: allSessions },
    git: gitStatuses,
    tasks,
    fileChanges,
    recentCommits,
    mergedBranches,
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
