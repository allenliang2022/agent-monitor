import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { execSync } from "child_process";

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

      // Determine worktree path: explicit worktree field, or derive from task id/branch
      const worktreePath =
        task.worktree ||
        (task.id ? join(WORKTREE_BASE, task.id) : undefined);

      return {
        ...task,
        tmuxAlive,
        worktreePath,
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
