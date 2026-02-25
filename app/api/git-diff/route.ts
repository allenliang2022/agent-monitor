import { execSync } from "child_process";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 15000 }).trim();
  } catch {
    return "";
  }
}

interface FileStat {
  path: string;
  additions: number;
  deletions: number;
}

export async function GET(request: NextRequest) {
  const dir = request.nextUrl.searchParams.get("dir");
  const hash = request.nextUrl.searchParams.get("hash");

  if (!dir || !hash) {
    return Response.json(
      { error: "Missing 'dir' or 'hash' query parameter" },
      { status: 400 }
    );
  }

  // Validate hash format (hex string, 7-40 chars)
  if (!/^[0-9a-f]{7,40}$/i.test(hash)) {
    return Response.json(
      { error: "Invalid commit hash format" },
      { status: 400 }
    );
  }

  try {
    // Check if this is the first commit (root commit with no parent)
    const parentCheck = execGit(`git rev-parse --verify ${hash}^ 2>/dev/null`, dir);
    const isRootCommit = parentCheck === "";

    // Get the diff
    let diff: string;
    if (isRootCommit) {
      // For root commit, diff against empty tree
      diff = execGit(
        `git diff 4b825dc642cb6eb9a060e54bf899d69f82cf7137..${hash}`,
        dir
      );
    } else {
      diff = execGit(`git diff ${hash}^..${hash}`, dir);
    }

    // Get the numstat for structured file info
    let numstat: string;
    if (isRootCommit) {
      numstat = execGit(
        `git diff --numstat 4b825dc642cb6eb9a060e54bf899d69f82cf7137..${hash}`,
        dir
      );
    } else {
      numstat = execGit(`git diff --numstat ${hash}^..${hash}`, dir);
    }

    // Parse numstat output into structured file data
    const files: FileStat[] = numstat
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const parts = line.split("\t");
        return {
          path: parts[2] || "",
          additions: parts[0] === "-" ? 0 : parseInt(parts[0] || "0", 10),
          deletions: parts[1] === "-" ? 0 : parseInt(parts[1] || "0", 10),
        };
      })
      .filter((f) => f.path.length > 0);

    // Aggregate stats
    const stats = {
      filesChanged: files.length,
      additions: files.reduce((sum, f) => sum + f.additions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    };

    return Response.json({ diff, files, stats });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Git diff command failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
