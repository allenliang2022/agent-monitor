import { execSync } from "child_process";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 10000 }).trim();
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const dir = request.nextUrl.searchParams.get("dir");

  if (!dir) {
    return Response.json(
      { error: "Missing 'dir' query parameter" },
      { status: 400 }
    );
  }

  try {
    const branch = execGit("git rev-parse --abbrev-ref HEAD", dir);
    const status = execGit("git status --short", dir);
    const log = execGit(
      'git log --format="%H|%s|%an|%ar" -10',
      dir
    );
    const diffStat = execGit("git diff --stat", dir);

    const changedFiles = status
      .split("\n")
      .filter((line) => line.trim().length > 0);

    return Response.json({
      directory: dir,
      branch,
      clean: changedFiles.length === 0,
      changedFiles: changedFiles.length,
      status: status || "(clean)",
      recentCommits: log
        .split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const parts = line.split("|");
          return {
            hash: parts[0] || "",
            message: parts[1] || "",
            author: parts[2] || "",
            time: parts[3] || "",
          };
        }),
      diffStat: diffStat || "(no changes)",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Git command failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
