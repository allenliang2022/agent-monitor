import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");

// Strip ANSI escape codes from terminal output
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\]/g, "");
}

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("task");

  if (!taskId) {
    return Response.json(
      { error: "Missing 'task' query parameter" },
      { status: 400 }
    );
  }

  // Sanitize task ID to prevent path traversal
  const sanitized = taskId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (sanitized !== taskId) {
    return Response.json(
      { error: "Invalid task ID" },
      { status: 400 }
    );
  }

  const logPath = join(CLAWDBOT_DIR, "logs", `${sanitized}.log`);

  if (!existsSync(logPath)) {
    return Response.json({
      taskId: sanitized,
      lines: [],
      timestamp: new Date().toISOString(),
      error: "Log file not found",
    });
  }

  try {
    const content = await readFile(logPath, "utf-8");
    const allLines = content.split("\n");
    // Return last 200 lines, strip ANSI codes, filter empty
    const lines = allLines
      .slice(-200)
      .map(stripAnsi)
      .filter((line) => line.trim().length > 0);

    return Response.json({
      taskId: sanitized,
      lines,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        taskId: sanitized,
        lines: [],
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Failed to read log file",
      },
      { status: 500 }
    );
  }
}
