import { NextRequest } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

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
    // Try to get the merge-base with main for a clean diff
    // Fall back to HEAD~10 if that fails
    let diffRef = "HEAD~10";
    const mergeBase = execGit("git merge-base main HEAD", dir);
    if (mergeBase) {
      diffRef = mergeBase;
    }

    // Get numstat for precise additions/deletions per file
    const numstat = execGit(`git diff --numstat ${diffRef}..HEAD`, dir);

    // Also get uncommitted changes
    const uncommittedNumstat = execGit("git diff --numstat", dir);
    const stagedNumstat = execGit("git diff --cached --numstat", dir);

    const fileMap = new Map<string, FileChange>();

    const parseNumstat = (output: string) => {
      if (!output) return;
      for (const line of output.split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        if (parts.length < 3) continue;
        const additions = parts[0] === "-" ? 0 : parseInt(parts[0], 10) || 0;
        const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10) || 0;
        const filePath = parts[2];
        if (!filePath) continue;

        const existing = fileMap.get(filePath);
        if (existing) {
          existing.additions += additions;
          existing.deletions += deletions;
        } else {
          fileMap.set(filePath, { path: filePath, additions, deletions });
        }
      }
    };

    parseNumstat(numstat);
    parseNumstat(uncommittedNumstat);
    parseNumstat(stagedNumstat);

    const files = Array.from(fileMap.values()).sort(
      (a, b) => b.additions + b.deletions - (a.additions + a.deletions)
    );

    let totalAdditions = 0;
    let totalDeletions = 0;
    for (const f of files) {
      totalAdditions += f.additions;
      totalDeletions += f.deletions;
    }

    return Response.json({
      directory: dir,
      files,
      totalAdditions,
      totalDeletions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Git command failed",
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      },
      { status: 500 }
    );
  }
}
