import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = join(process.env.HOME || "/Users/liang", ".openclaw");

interface SessionEntry {
  key: string;
  updatedAt: number;
  sessionId?: string;
  model?: string;
  modelProvider?: string;
  totalTokens?: number;
  agentId?: string;
  kind?: string;
  [k: string]: unknown;
}

function readSessionStore(agentId: string): SessionEntry[] {
  const storePath = join(OPENCLAW_DIR, "agents", agentId, "sessions", "sessions.json");
  if (!existsSync(storePath)) return [];
  try {
    const data = JSON.parse(readFileSync(storePath, "utf-8"));
    // sessions.json is an object with session keys as keys
    return Object.entries(data).map(([key, val]) => ({
      key,
      ...(val as Record<string, unknown>),
      agentId,
    })) as SessionEntry[];
  } catch {
    return [];
  }
}

export async function GET() {
  const agents = ["main", "girlfriend", "xiaolongnv"];
  const activeMinutes = 60;
  const cutoff = Date.now() - activeMinutes * 60 * 1000;

  const allSessions: SessionEntry[] = [];
  for (const agentId of agents) {
    const sessions = readSessionStore(agentId);
    for (const s of sessions) {
      if (s.updatedAt && s.updatedAt > cutoff) {
        allSessions.push(s);
      }
    }
  }

  // Sort by most recently updated
  allSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return Response.json({
    count: allSessions.length,
    activeMinutes,
    sessions: allSessions,
  });
}
