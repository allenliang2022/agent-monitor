import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const CLAWDBOT_DIR = join(process.cwd(), ".clawdbot");
const PROMPTS_DIR = join(CLAWDBOT_DIR, "prompts");
const SPAWN_SCRIPT = join(CLAWDBOT_DIR, "spawn-agent.sh");

interface SpawnRequest {
  id: string;
  description: string;
  prompt: string;
  agent?: string;
  branch?: string;
}

function isKebabCase(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}

export async function POST(request: Request) {
  try {
    const body: SpawnRequest = await request.json();

    // ── Validate inputs ──────────────────────────────────────────────────
    const errors: string[] = [];

    if (!body.id || typeof body.id !== "string" || !body.id.trim()) {
      errors.push("id is required");
    } else if (!isKebabCase(body.id.trim())) {
      errors.push("id must be kebab-case (e.g. fix-header-bug)");
    }

    if (
      !body.description ||
      typeof body.description !== "string" ||
      !body.description.trim()
    ) {
      errors.push("description is required");
    }

    if (!body.prompt || typeof body.prompt !== "string" || !body.prompt.trim()) {
      errors.push("prompt is required");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    const taskId = body.id.trim();
    const description = body.description.trim();
    const prompt = body.prompt.trim();
    const agent = body.agent?.trim() || "opencode";
    const branch = body.branch?.trim() || `feat/${taskId}`;

    // ── Validate agent type ──────────────────────────────────────────────
    const validAgents = ["opencode", "claude", "codex"];
    if (!validAgents.includes(agent)) {
      return NextResponse.json(
        { success: false, errors: [`Invalid agent type: ${agent}`] },
        { status: 400 }
      );
    }

    // ── Check spawn script exists ────────────────────────────────────────
    if (!existsSync(SPAWN_SCRIPT)) {
      return NextResponse.json(
        { success: false, errors: ["spawn-agent.sh not found"] },
        { status: 500 }
      );
    }

    // ── Save prompt to .clawdbot/prompts/{id}.md ─────────────────────────
    mkdirSync(PROMPTS_DIR, { recursive: true });
    writeFileSync(join(PROMPTS_DIR, `${taskId}.md`), prompt, "utf-8");

    // ── Execute spawn-agent.sh ───────────────────────────────────────────
    // The script expects: task-id description prompt agent branch
    const output = execSync(
      `bash "${SPAWN_SCRIPT}" ${JSON.stringify(taskId)} ${JSON.stringify(description)} ${JSON.stringify(prompt)} ${JSON.stringify(agent)} ${JSON.stringify(branch)}`,
      {
        encoding: "utf-8",
        timeout: 30000,
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    return NextResponse.json({
      success: true,
      taskId,
      branch,
      agent,
      output: output.trim(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    // Include stderr if available (from execSync)
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr: unknown }).stderr).trim()
        : undefined;

    return NextResponse.json(
      {
        success: false,
        errors: [message],
        stderr,
      },
      { status: 500 }
    );
  }
}
