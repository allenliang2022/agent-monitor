# Round 5: Git Page Data Flow + Agent Log + Polish

## Context
- Project: /Users/liang/work/agent-monitor
- The Git page API works fine (curl returns data), but the frontend never calls it
- Agent page log panel says "No log output available" but .clawdbot/logs/ has log files

## Task 1: Fix Git page - auto-populate watched directories
In `app/live/LiveContext.tsx`:
- `gitDirs` starts as empty array
- Dirs are only added when user clicks "Watch" manually
- Need to AUTO-ADD directories when tasks are loaded
- After tasks are fetched, extract worktree paths and the main project dir
- Add them to gitDirs automatically so fetchGit runs for them
- The main project dir is `process.cwd()` on server, but on client use the tasks API response
- Add an effect: when `tasks` changes, compute dirs = [PROJECT_DIR, ...task worktree paths] and merge into gitDirs
- The project dir is already shown in the API response as the base of worktreePaths

Specifically, after the tasks API returns data, extract:
1. The project directory (from task worktreePath - strip the task name part, or use a dedicated field)
2. Each task's worktree directory
And call setGitDirs to include them.

IMPORTANT: The `/api/agent-tasks` response has `worktreePath` for each task. The main project is at `/Users/liang/work/agent-monitor`. Add this as the FIRST gitDir, then add each worktree path.

Simple approach: In LiveContext, add a useEffect that watches `tasks` and auto-adds dirs:
```
useEffect(() => {
  const dirs = new Set(gitDirs);
  // Add main project dir (derive from first task's worktreePath by going up one level, or hardcode from tasks API)
  tasks.forEach(t => {
    if (t.worktreePath) dirs.add(t.worktreePath);
  });
  // Also add main project dir - it's the cwd
  // We can get it from the API or derive it
  setGitDirs(Array.from(dirs));
}, [tasks]);
```

Actually better: make the `/api/agent-tasks` also return `projectDir` in its response. Then use that.

## Task 2: Fix Agent page log display
In `app/live/agent/page.tsx`:
- Currently shows "Task completed. No log output available."
- But log files exist at `.clawdbot/logs/<task-id>.log`
- Need to fetch log content from `/api/agent-log?taskId=<id>` endpoint
- If that endpoint doesn't exist, CREATE it: read the log file and return its content
- The log API should be at `app/api/agent-log/route.ts`
- Read from `.clawdbot/logs/<taskId>.log` relative to process.cwd()
- Return { content: string, lines: number }
- In the agent page, fetch this when a task is selected and display in the Live Output panel

## Task 3: General polish
- On the Overview page, the "N" button (bottom left corner) seems orphaned - if it's a Navbar toggle or debug element, either make it functional or remove it
- Ensure all pages have consistent spacing with the navbar (pt-16 or similar)

## Rules
- Do NOT change visual design/colors
- Run `npm run build`
- Commit message: "fix: auto-populate git dirs, agent log API, polish"
