import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { execSync } from "child_process";
import { getFileChanges, execGit } from "../../lib/git-changes";

export const dynamic = "force-dynamic";

const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");
const ACTIVE_TASKS_FILE = join(CLAWDBOT_DIR, "active-tasks.json");

// Derive worktree base path: the parent directory of the current working directory.
// When running from a worktree (e.g., .../agent-monitor-worktrees/round2-ui-fix),
// sibling worktrees are at the same level (e.g., .../agent-monitor-worktrees/settings-page).
const PROJECT_DIR = process.cwd();
const REPO_ROOT = PROJECT_DIR;
const WORKTREE_BASE = dirname(PROJECT_DIR);

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

/**
 * Infer the true status of a task whose tmux session is no longer alive.
 * Checks multiple git signals to determine if the agent completed its work:
 *  1. Worktree exists & has commits not on main → completed
 *  2. Worktree exists & HEAD is ancestor of main (branch merged) → completed
 *  3. Worktree doesn't exist but branch was merged into main → completed
 *  4. Worktree doesn't exist but branch ref exists with commits → completed
 *  5. Otherwise → dead
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

      // No exclusive commits — but maybe the branch was already merged into main.
      // Check if HEAD is an ancestor of main (meaning main contains all of HEAD's work).
      const headSha = execGit("git rev-parse HEAD", wtPath).trim();
      const mainSha = execGit("git rev-parse main", wtPath).trim();
      if (headSha && mainSha && headSha !== mainSha) {
        // HEAD differs from main; check if main contains HEAD
        const isAncestor = execGit(
          `git merge-base --is-ancestor HEAD main && echo "yes" || echo "no"`,
          wtPath
        ).trim();
        if (isAncestor === "yes") {
          return "completed";
        }
      } else if (headSha && headSha === mainSha) {
        // HEAD is exactly main — check if the branch name ref points elsewhere
        // or if there's evidence of work (any diff from the initial main)
        // This case means no divergence at all, likely dead
        return "dead";
      }

      return "dead";
    }

    // Worktree doesn't exist — check from the repo root
    const branchRef = task.branch || "";
    if (branchRef) {
      // Check if branch was merged into main
      const merged = execGit(
        `git branch --merged main 2>/dev/null`,
        REPO_ROOT
      ).trim();
      if (merged && merged.split("\n").some(b => b.trim() === branchRef || b.trim() === `remotes/origin/${branchRef}`)) {
        return "completed";
      }

      // Check if branch ref exists (has commits)
      const branchExists = execGit(
        `git rev-parse --verify "${branchRef}" 2>/dev/null && echo "yes" || echo "no"`,
        REPO_ROOT
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
        // Agent's tmux session is gone - check git state to determine outcome
        inferredStatus = inferStatusFromGit(task, worktreePath);
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
