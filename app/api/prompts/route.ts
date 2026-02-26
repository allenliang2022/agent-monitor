import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { execGit } from "../../lib/git-changes";

export const dynamic = "force-dynamic";

const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");
const PROJECT_DIR = process.cwd();
const WORKTREE_BASE = `${PROJECT_DIR}-worktrees`;

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

  // Get list of branches merged into main (for inferring status of older prompts)
  const mergedBranchesRaw = execGit("git branch --merged main", PROJECT_DIR);
  const mergedBranches = mergedBranchesRaw
    .split("\n")
    .map(b => b.trim().replace(/^\*\s*/, ""))
    .filter(b => b.length > 0);

  // Also get all local branch names (for prompts that have a branch but aren't merged)
  const allBranchesRaw = execGit("git branch", PROJECT_DIR);
  const allBranches = allBranchesRaw
    .split("\n")
    .map(b => b.trim().replace(/^\*\s*/, ""))
    .filter(b => b.length > 0);

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
        let agent = task?.agent || "unknown";

        if (task && status === "running") {
          const tmuxSession = task.tmuxSession || task.id || "";
          const tmuxAlive = tmuxSession ? checkTmuxSession(tmuxSession) : false;
          if (!tmuxAlive) {
            const worktreeDir = task.worktree || task.id;
            const worktreePath = worktreeDir ? join(WORKTREE_BASE, worktreeDir) : undefined;
            status = inferStatusFromGit(task, worktreePath);
          }
        }

        // Fallback for prompts without active-tasks.json entries:
        // Check if feat/<taskId> branch exists and is merged into main
        if (status === "unknown") {
          const branchName = `feat/${taskId}`;
          if (mergedBranches.includes(branchName)) {
            status = "completed";
            if (agent === "unknown") agent = "opencode";
          } else if (allBranches.includes(branchName)) {
            // Branch exists but not merged — it's in progress or dead
            // Check if the worktree exists to determine if it's still active
            const worktreePath = join(WORKTREE_BASE, taskId);
            if (existsSync(worktreePath)) {
              const tmuxAlive = checkTmuxSession(taskId);
              if (tmuxAlive) {
                status = "running";
              } else {
                status = inferStatusFromGit(
                  { id: taskId, agent: "opencode", description: taskId, status: "running", startedAt: 0, branch: branchName },
                  worktreePath
                );
              }
            } else {
              // Branch exists, no worktree — likely completed
              status = "completed";
            }
            if (agent === "unknown") agent = "opencode";
          }
        }

        prompts.push({
          name: task?.description || taskId,
          filename: file,
          content,
          agent,
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
