import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { getFileChanges, execGit } from "../../lib/git-changes";

export const dynamic = "force-dynamic";

const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");
const ACTIVE_TASKS_FILE = join(CLAWDBOT_DIR, "active-tasks.json");

// Derive worktree base path: parent directory + '-worktrees/'
// e.g., /Users/liang/work/agent-monitor -> /Users/liang/work/agent-monitor-worktrees/
const PROJECT_DIR = process.cwd();
const WORKTREE_BASE = join(
  PROJECT_DIR,
  "..",
  `${PROJECT_DIR.split("/").pop()}-worktrees`
);

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

export async function GET() {
  try {
    if (!existsSync(ACTIVE_TASKS_FILE)) {
      return NextResponse.json({
        tasks: [],
        source: ACTIVE_TASKS_FILE,
        error: "active-tasks.json not found",
      });
    }

    const raw = await readFile(ACTIVE_TASKS_FILE, "utf-8");
    let data: RawTask[] | { tasks: RawTask[] };

    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { tasks: [], error: "Invalid JSON in active-tasks.json" },
        { status: 500 }
      );
    }

    // Handle both array format and { tasks: [] } format
    const rawTasks: RawTask[] = Array.isArray(data)
      ? data
      : data.tasks || [];

    // Enrich each task with tmux status and worktree path
    const tasks = rawTasks.map((task) => {
      // Determine tmux session name: explicit tmuxSession field, or derive from task id
      const tmuxSession = task.tmuxSession || task.id || "";
      const tmuxAlive = tmuxSession ? checkTmuxSession(tmuxSession) : false;

      // Determine worktree path: always build full path from WORKTREE_BASE
      const worktreeDir = task.worktree || task.id;
      const worktreePath = worktreeDir ? join(WORKTREE_BASE, worktreeDir) : undefined;

      // Smart status inference based on tmux + git state
      let inferredStatus = task.status || "unknown";
      if (inferredStatus === "running" && !tmuxAlive) {
        // Agent died - check if it committed (success) or just crashed
        try {
          const wtPath = typeof worktreePath === 'string' ? worktreePath : '';
          if (wtPath && existsSync(wtPath)) {
            const branchCommits = execGit(
              "git log --oneline HEAD --not main 2>/dev/null | wc -l",
              wtPath
            ).trim();
            if (parseInt(branchCommits) > 0) {
              inferredStatus = "completed";
            } else {
              inferredStatus = "dead";
            }
          } else {
            inferredStatus = "dead";
          }
        } catch {
          inferredStatus = "dead";
        }
      }

      // Get file changes using the shared detection logic
      let liveFileCount = 0;
      let liveAdditions = 0;
      let liveDeletions = 0;
      let liveFiles: { path: string; additions: number; deletions: number }[] = [];

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

    return NextResponse.json({
      tasks,
      source: ACTIVE_TASKS_FILE,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        tasks: [],
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
