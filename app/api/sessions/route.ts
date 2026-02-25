import { readFileSync, existsSync } from "fs";
import { join } from "path";

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

export async function GET() {
  const agents = ["main", "girlfriend", "xiaolongnv"];
  const activeMinutes = 60;
  const cutoff = Date.now() - activeMinutes * 60 * 1000;

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

  return Response.json({
    count: allSessions.length,
    activeMinutes,
    sessions: allSessions,
  });
}
