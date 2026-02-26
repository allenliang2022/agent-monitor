import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { execGit } from "../../lib/git-changes";

export const dynamic = "force-dynamic";

const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");
const PROJECT_DIR = process.cwd();
const WORKTREE_BASE = join(PROJECT_DIR, "..");

interface PromptFile {
  name: string;
  filename: string;
  content: string;
  agent: string;
  taskId: string;
  status: string;
  startedAt: number | null;
}

interface RawTask {
  id: string;
  agent: string;
  description: string;
  status: string;
  startedAt: number;
  branch?: string;
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

function inferStatusFromGit(task: RawTask, worktreePath: string | undefined): string {
  try {
    const wtPath = typeof worktreePath === "string" ? worktreePath : "";

    if (wtPath && existsSync(wtPath)) {
      const branchCommits = execGit(
        "git log --oneline HEAD --not main 2>/dev/null | wc -l",
        wtPath
      ).trim();
      if (parseInt(branchCommits) > 0) {
        return "completed";
      }

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

    const branchRef = task.branch || "";
    if (branchRef) {
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

export async function GET() {
  const prompts: PromptFile[] = [];
  const promptsDir = join(CLAWDBOT_DIR, "prompts");
  const tasksFile = join(CLAWDBOT_DIR, "active-tasks.json");

  // Load tasks for metadata
  let tasks: RawTask[] = [];
  if (existsSync(tasksFile)) {
    try {
      tasks = JSON.parse(readFileSync(tasksFile, "utf-8"));
    } catch { /* ignore */ }
  }

  // Read all prompt files from .clawdbot/prompts/
  if (existsSync(promptsDir)) {
    try {
      const files = readdirSync(promptsDir).filter(f => f.endsWith(".md"));
      for (const file of files) {
        const taskId = file.replace(/\.md$/, "");
        const content = readFileSync(join(promptsDir, file), "utf-8");
        const task = tasks.find(t => t.id === taskId);

        // Infer status using tmux + git, just like the other API routes
        let status = task?.status || "unknown";
        if (task && status === "running") {
          const tmuxSession = task.tmuxSession || task.id || "";
          const tmuxAlive = tmuxSession ? checkTmuxSession(tmuxSession) : false;
          if (!tmuxAlive) {
            const worktreeDir = task.worktree || task.id;
            const worktreePath = worktreeDir ? join(WORKTREE_BASE, worktreeDir) : undefined;
            status = inferStatusFromGit(task, worktreePath);
          }
        }

        prompts.push({
          name: task?.description || taskId,
          filename: file,
          content,
          agent: task?.agent || "unknown",
          taskId,
          status,
          startedAt: task?.startedAt || null,
        });
      }
    } catch { /* ignore */ }
  }

  // Sort: running first, then completed, then by startedAt desc
  prompts.sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1;
    if (b.status === "running" && a.status !== "running") return 1;
    return (b.startedAt || 0) - (a.startedAt || 0);
  });

  return Response.json({ prompts });
}
