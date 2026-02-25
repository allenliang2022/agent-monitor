import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const PROJECT_DIR = "/Users/liang/work/agent-monitor";

interface PromptFile {
  name: string;
  filename: string;
  content: string;
  agent: string;
  timestamp?: string;
}

export async function GET() {
  const taskFiles = [
    { filename: "LIVE_TASK.md", agent: "opencode", name: "Live Dashboard Enhancement" },
    { filename: "LIVE_SPLIT_TASK.md", agent: "opencode", name: "Live Multi-Page Split" },
  ];

  const prompts: PromptFile[] = [];

  for (const tf of taskFiles) {
    const filePath = join(PROJECT_DIR, tf.filename);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        prompts.push({
          name: tf.name,
          filename: tf.filename,
          content,
          agent: tf.agent,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  return Response.json({ prompts });
}
