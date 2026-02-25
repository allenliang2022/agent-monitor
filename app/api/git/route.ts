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
    // Include decoration (branch/tag refs) and parent hashes for graph rendering
    const log = execGit(
      'git log --all --format="%H|%P|%s|%an|%ar|%D" -20',
      dir
    );
    const diffStat = execGit("git diff --stat", dir);

    // List all branches with their latest commit and merge status
    const branchList = execGit(
      'git branch -a --format="%(refname:short)|%(objectname:short)|%(upstream:track)"',
      dir
    );

    const changedFiles = status
      .split("\n")
      .filter((line) => line.trim().length > 0);

    // Parse branches
    const branches = branchList
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const parts = line.split("|");
        const name = parts[0] || "";
        return {
          name,
          commit: parts[1] || "",
          tracking: parts[2] || "",
          isHead: name === branch,
        };
      })
      .filter((b) => !b.name.startsWith("origin/"));

    // Check which branches are merged into main/master
    const mainBranch = branches.find((b) => b.name === "main" || b.name === "master")?.name || branch;
    const mergedBranches = execGit(`git branch --merged ${mainBranch}`, dir)
      .split("\n")
      .map((l) => l.trim().replace(/^\*\s*/, ""))
      .filter((l) => l.length > 0);

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
          const refs = (parts[5] || "").split(",").map((r) => r.trim()).filter(Boolean);
          return {
            hash: parts[0] || "",
            parents: (parts[1] || "").split(" ").filter(Boolean),
            message: parts[2] || "",
            author: parts[3] || "",
            time: parts[4] || "",
            refs,
          };
        }),
      branches: branches.map((b) => ({
        ...b,
        merged: mergedBranches.includes(b.name),
      })),
      mainBranch,
      diffStat: diffStat || "(no changes)",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Git command failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
