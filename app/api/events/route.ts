import { execSync } from "child_process";

export const dynamic = "force-dynamic";

function safeExec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 10000 }).trim();
  } catch {
    return "";
  }
}

function getSessions(): unknown {
  const output = safeExec(
    "openclaw sessions --json --active 60 --all-agents 2>/dev/null"
  );
  if (!output) return { sessions: [], error: "Could not fetch sessions" };
  try {
    return JSON.parse(output);
  } catch {
    return { sessions: [], error: "Invalid JSON from openclaw" };
  }
}

function getHealth(): Record<string, string> {
  const output = safeExec("openclaw health 2>&1");
  const result: Record<string, string> = {
    status: output ? "healthy" : "unhealthy",
    raw: output,
  };
  if (output.toLowerCase().includes("error")) {
    result.status = "unhealthy";
  }
  return result;
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial data immediately
      const sendUpdate = () => {
        try {
          const sessions = getSessions();
          const health = getHealth();

          const update = {
            type: "update",
            timestamp: new Date().toISOString(),
            sessions,
            health,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
          );
        } catch {
          const errorEvent = {
            type: "error",
            timestamp: new Date().toISOString(),
            message: "Failed to collect data",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
        }
      };

      // Send immediately, then every 5 seconds
      sendUpdate();
      const interval = setInterval(sendUpdate, 5000);

      // Cleanup when the client disconnects
      // The controller.close() is handled by the client disconnect
      // We store interval ref for cleanup
      const cleanup = () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      // AbortSignal isn't directly available here, so we rely on
      // the stream erroring out when client disconnects
      // Store cleanup for the cancel handler
      (stream as unknown as { _cleanup: () => void })._cleanup = cleanup;
    },
    cancel() {
      // Client disconnected - interval cleanup
      const s = stream as unknown as { _cleanup?: () => void };
      if (s._cleanup) s._cleanup();
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
