import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const CLAWDBOT_DIR = "/Users/liang/work/agent-monitor/.clawdbot";

interface PromptFile {
  name: string;
  filename: string;
  content: string;
  agent: string;
  taskId: string;
  status: string;
  startedAt: number | null;
}

export async function GET() {
  const prompts: PromptFile[] = [];
  const promptsDir = join(CLAWDBOT_DIR, "prompts");
  const tasksFile = join(CLAWDBOT_DIR, "active-tasks.json");

  // Load tasks for metadata
  let tasks: Array<{ id: string; agent: string; description: string; status: string; startedAt: number }> = [];
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

        prompts.push({
          name: task?.description || taskId,
          filename: file,
          content,
          agent: task?.agent || "unknown",
          taskId,
          status: task?.status || "unknown",
          startedAt: task?.startedAt || null,
        });
      }
    } catch { /* ignore */ }
  }

  // Sort: running first, then by startedAt desc
  prompts.sort((a, b) => {
    if (a.status === "running" && b.status !== "running") return -1;
    if (b.status === "running" && a.status !== "running") return 1;
    return (b.startedAt || 0) - (a.startedAt || 0);
  });

  return Response.json({ prompts });
}
