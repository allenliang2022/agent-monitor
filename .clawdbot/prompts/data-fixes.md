Fix multiple data accuracy issues across the dashboard.

## Issue 1: Tasks page only shows 1 of 3 tasks
The Tasks page (app/live/tasks/page.tsx) only shows "test-readme" as completed. But active-tasks.json has 3 tasks: test-readme, git-commit-diff, git-tabs. The other 2 are not appearing.

Check the /api/agent-tasks/route.ts to understand why. The API reads from .clawdbot/active-tasks.json. Make sure all tasks are returned regardless of status. Also check if the Tasks page is filtering them out incorrectly.

## Issue 2: Agent cards show Files:0 Lines:+0 -0 for git-commit-diff and git-tabs
The Agents page (app/live/agents/page.tsx) shows correct stats for test-readme but zeros for the other two agents. 

The issue is likely that file-changes API only counts changes in worktrees that have uncommitted changes or use a different detection method. Check /api/file-changes/route.ts and /api/agent-tasks/route.ts to see how filesChanged/additions/deletions are computed.

The agent-tasks API should detect the actual changes made by looking at the branch diff against the base commit (git diff main..feat/branch --stat).

## Issue 3: Overview Event Log is empty
The Overview page (app/live/page.tsx) Event Log section only shows "Connected to event stream". It should show real events from the SSE stream (task spawned, status changes, commits). Check if the eventLog from useLive() is being populated correctly. The SSE /api/events should emit task and commit events.

## Technical constraints
- Next.js 16, Tailwind CSS v4
- Test with npm run build after changes
- Do not break existing functionality
