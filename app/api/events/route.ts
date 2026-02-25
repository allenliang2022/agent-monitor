import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = join(process.env.HOME || "/Users/liang", ".openclaw");

interface RawSession {
  sessionId?: string;
  updatedAt?: number;
  chatType?: string;
  lastChannel?: string;
  [k: string]: unknown;
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

  const watchDirs = ["/Users/liang/work/agent-monitor"];
  const gitStatuses: Record<string, unknown> = {};
  for (const dir of watchDirs) {
    gitStatuses[dir] = getGitStatus(dir);
  }

  return {
    type: "update",
    timestamp: new Date().toISOString(),
    sessions: { count: allSessions.length, sessions: allSessions },
    git: gitStatuses,
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
