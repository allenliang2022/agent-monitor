import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const output = execSync(
      "openclaw sessions --json --active 60 --all-agents 2>/dev/null",
      { encoding: "utf-8", timeout: 10000 }
    );
    const data = JSON.parse(output);
    return Response.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch sessions";
    return Response.json(
      { error: message, sessions: [] },
      { status: 500 }
    );
  }
}
