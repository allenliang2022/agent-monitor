import { execSync } from "child_process";
import { existsSync } from "fs";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
}

export interface FileChangesResult {
  directory: string;
  files: FileChange[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

// ─── Git helpers ────────────────────────────────────────────────────────────

export function execGit(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
      stdio: "pipe",
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Parse `git diff --numstat` output into a file map.
 * Binary files show as "-\t-\tfilename" — we count those as 0 additions/deletions
 * but still track the file.
 */
function parseNumstat(
  output: string,
  fileMap: Map<string, FileChange>
): void {
  if (!output) return;
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const additions = parts[0] === "-" ? 0 : parseInt(parts[0], 10) || 0;
    const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10) || 0;
    const filePath = parts.slice(2).join("\t"); // handle renames with =>
    if (!filePath) continue;

    const existing = fileMap.get(filePath);
    if (existing) {
      existing.additions += additions;
      existing.deletions += deletions;
    } else {
      fileMap.set(filePath, { path: filePath, additions, deletions });
    }
  }
}

/**
 * Detect ALL file changes in a git worktree directory.
 *
 * Strategy (handles every branch state):
 *  1. Committed changes: diff merge-base(main, HEAD)..HEAD
 *     - If merge-base fails (detached HEAD, no main), try origin/main
 *     - If that also fails, diff the full branch log vs the initial commit
 *  2. Staged but uncommitted: git diff --cached --numstat
 *  3. Unstaged working-tree changes: git diff --numstat
 *
 * The three layers are merged (per-file max, not additive for staged+unstitted
 * since staged is a subset of the diff against merge-base once committed).
 * Committed and working-copy changes ARE additive since they represent
 * different change sets.
 */
export function getFileChanges(dir: string): FileChangesResult | null {
  if (!existsSync(dir)) return null;

  try {
    const fileMap = new Map<string, FileChange>();

    // ── 1. Committed changes vs main ──────────────────────────────────────
    // Try multiple strategies to find the right base ref
    let committedNumstat = "";

    // Strategy A: merge-base with main
    const mergeBase = execGit("git merge-base main HEAD", dir);
    if (mergeBase) {
      committedNumstat = execGit(
        `git diff --numstat ${mergeBase}..HEAD`,
        dir
      );
    }

    // Strategy B: merge-base with origin/main (for worktrees where local main
    // may not exist)
    if (!committedNumstat) {
      const originMergeBase = execGit(
        "git merge-base origin/main HEAD",
        dir
      );
      if (originMergeBase) {
        committedNumstat = execGit(
          `git diff --numstat ${originMergeBase}..HEAD`,
          dir
        );
      }
    }

    // Strategy C: use git log to find the fork point — diff against first
    // commit on the branch that isn't on main
    if (!committedNumstat) {
      // Find the first commit reachable from HEAD but not from main or origin/main
      const firstBranchCommit = execGit(
        "git log --oneline --reverse HEAD --not main --not origin/main 2>/dev/null | head -1",
        dir
      );
      if (firstBranchCommit) {
        const hash = firstBranchCommit.split(" ")[0];
        if (hash) {
          committedNumstat = execGit(
            `git diff --numstat ${hash}^..HEAD`,
            dir
          );
        }
      }
    }

    // Strategy D: last resort — diff HEAD against the repo root commit
    // This catches the case where the branch has commits but we can't find main
    if (!committedNumstat) {
      const rootCommit = execGit(
        "git rev-list --max-parents=0 HEAD",
        dir
      );
      if (rootCommit) {
        // Use the first root commit (there could be multiple in merge histories)
        const root = rootCommit.split("\n")[0];
        committedNumstat = execGit(
          `git diff --numstat ${root}..HEAD`,
          dir
        );
      }
    }

    parseNumstat(committedNumstat, fileMap);

    // ── 2. Staged changes (not yet committed) ────────────────────────────
    const stagedNumstat = execGit("git diff --cached --numstat", dir);
    parseNumstat(stagedNumstat, fileMap);

    // ── 3. Unstaged working tree changes ─────────────────────────────────
    const unstagedNumstat = execGit("git diff --numstat", dir);
    parseNumstat(unstagedNumstat, fileMap);

    // ── 4. Untracked files (new files not yet added) ─────────────────────
    // These won't show in any diff, but they are real changes
    const untrackedRaw = execGit(
      "git ls-files --others --exclude-standard",
      dir
    );
    if (untrackedRaw) {
      for (const filePath of untrackedRaw.split("\n")) {
        if (!filePath.trim()) continue;
        if (!fileMap.has(filePath)) {
          // We can't get line counts without reading the file, so just mark it
          fileMap.set(filePath, { path: filePath, additions: 0, deletions: 0 });
        }
      }
    }

    // ── Build result ─────────────────────────────────────────────────────
    const files = Array.from(fileMap.values()).sort(
      (a, b) => b.additions + b.deletions - (a.additions + a.deletions)
    );

    let totalAdditions = 0;
    let totalDeletions = 0;
    for (const f of files) {
      totalAdditions += f.additions;
      totalDeletions += f.deletions;
    }

    return {
      directory: dir,
      files,
      totalFiles: files.length,
      totalAdditions,
      totalDeletions,
    };
  } catch {
    return null;
  }
}
