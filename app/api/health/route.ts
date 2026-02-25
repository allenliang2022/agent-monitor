import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface HealthData {
  status: string;
  gateway: string;
  uptime: string;
  version: string;
  raw: string;
}

export async function GET() {
  try {
    const output = execSync("openclaw health 2>&1", {
      encoding: "utf-8",
      timeout: 10000,
    });

    const parsed: HealthData = {
      status: "healthy",
      gateway: "connected",
      uptime: "",
      version: "",
      raw: output.trim(),
    };

    // Parse common health output patterns
    const lines = output.split("\n");
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("uptime")) {
        parsed.uptime = line.split(/:\s*/)[1]?.trim() ?? "";
      }
      if (lower.includes("version")) {
        parsed.version = line.split(/:\s*/)[1]?.trim() ?? "";
      }
      if (lower.includes("error") || lower.includes("unhealthy")) {
        parsed.status = "unhealthy";
        parsed.gateway = "disconnected";
      }
    }

    return Response.json(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Health check failed";
    return Response.json(
      {
        status: "unhealthy",
        gateway: "disconnected",
        uptime: "",
        version: "",
        raw: message,
      },
      { status: 500 }
    );
  }
}
