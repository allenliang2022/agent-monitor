import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "/Users/liang";
const OPENCLAW_DIR = join(HOME, ".openclaw");
const GLOBAL_SKILLS_DIR = "/opt/homebrew/lib/node_modules/openclaw/skills";
const WORKSPACE_SKILLS_DIR = join(OPENCLAW_DIR, "workspace", "skills");

function listAgents(): { name: string; hasCron: boolean; sessionCount: number }[] {
  const agentsDir = join(OPENCLAW_DIR, "agents");
  if (!existsSync(agentsDir)) return [];
  try {
    const dirs = readdirSync(agentsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    return dirs.map((name) => {
      const cronPath = join(agentsDir, name, "cron", "jobs.json");
      const hasCron = existsSync(cronPath);

      let sessionCount = 0;
      const sessionsPath = join(agentsDir, name, "sessions", "sessions.json");
      if (existsSync(sessionsPath)) {
        try {
          const data = JSON.parse(readFileSync(sessionsPath, "utf-8"));
          sessionCount = Object.keys(data).length;
        } catch {
          // ignore parse errors
        }
      }

      return { name, hasCron, sessionCount };
    });
  } catch {
    return [];
  }
}

function countCronJobs(): { count: number; jobs: { name: string; schedule: string }[] } {
  const cronPath = join(OPENCLAW_DIR, "agents", "main", "cron", "jobs.json");
  if (!existsSync(cronPath)) return { count: 0, jobs: [] };
  try {
    const raw = JSON.parse(readFileSync(cronPath, "utf-8"));
    if (Array.isArray(raw)) {
      return {
        count: raw.length,
        jobs: raw.map((j: Record<string, unknown>) => ({
          name: String(j.name || j.id || "unnamed"),
          schedule: String(j.schedule || j.cron || "?"),
        })),
      };
    }
    // It could be an object keyed by job name
    const entries = Object.entries(raw);
    return {
      count: entries.length,
      jobs: entries.map(([key, val]) => ({
        name: key,
        schedule: String((val as Record<string, unknown>).schedule || (val as Record<string, unknown>).cron || "?"),
      })),
    };
  } catch {
    return { count: 0, jobs: [] };
  }
}

function countSkills(): { count: number; skills: string[] } {
  const skills: string[] = [];
  for (const dir of [GLOBAL_SKILLS_DIR, WORKSPACE_SKILLS_DIR]) {
    if (!existsSync(dir)) continue;
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      skills.push(...entries);
    } catch {
      // ignore
    }
  }
  return { count: skills.length, skills };
}

function getChannels(agents: { name: string }[]): string[] {
  const channels = new Set<string>();
  for (const agent of agents) {
    const sessionsPath = join(OPENCLAW_DIR, "agents", agent.name, "sessions", "sessions.json");
    if (!existsSync(sessionsPath)) continue;
    try {
      const data: Record<string, { lastChannel?: string }> = JSON.parse(
        readFileSync(sessionsPath, "utf-8")
      );
      for (const val of Object.values(data)) {
        if (val.lastChannel) channels.add(val.lastChannel);
      }
    } catch {
      // ignore
    }
  }
  return Array.from(channels);
}

export async function GET() {
  const agents = listAgents();
  const cron = countCronJobs();
  const skills = countSkills();
  const channels = getChannels(agents);

  return Response.json({
    agents,
    cron,
    skills,
    channels,
    timestamp: new Date().toISOString(),
  });
}
