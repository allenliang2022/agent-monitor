The file-changes API (app/api/file-changes/route.ts) only detects changes for some worktrees. Many worktrees show Files:0 Lines:+0 -0 on the Agents page because the API cannot find their changes.

## Root cause
The API uses git diff to detect changes but the git diff command may not capture committed changes on feature branches. 

## Fix needed in app/api/file-changes/route.ts
For each worktree, detect file changes by:
1. First try `git diff --stat main..HEAD` (committed changes vs main)
2. Then add any uncommitted changes `git diff --stat HEAD`  
3. Combine both to get the full picture

The API should also include per-file details (not just totals): filename, additions, deletions, task that modified it.

## Also update app/api/agent-tasks/route.ts  
Make sure the file counts from agent-tasks match what file-changes returns. Both APIs should use the same detection method.

## Technical constraints
- Next.js 16, Tailwind v4
- Run npm run build to verify
