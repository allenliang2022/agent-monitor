# Round 2: UI Display Fixes

Fix remaining UI display issues across the dashboard.

## Context
- Project: /Users/liang/work/agent-monitor (Next.js + TypeScript + Tailwind)
- Build passes, status inference is now working
- Need to fix display truncation and loading issues

## Task 1: Fix Architecture page name truncation
In `app/live/architecture/page.tsx`:
- Agent names are truncated: "performance-op" should be "performance-opt", "round1-data-fi" should be "round1-data-fix"
- The agent cards in the diagram and the worktree labels below are too narrow
- Widen the cards or use text-overflow with tooltip, but prefer showing full name
- Also check the Agent Details table at the bottom - branch names are truncated too

## Task 2: Fix Git page loading issue
In `app/live/git/page.tsx`:
- Page shows "Loading git status..." and never loads actual content
- The Git page should show recent commits, branch info, etc. for watched directories
- Check the API call and make sure it resolves
- The tabs show 4 projects (agent-monitor, settings-page, performance-opt, round1-data-fix) which is correct
- Debug why the content never loads after initial render

## Task 3: Fix Prompt page Agent Log display
In `app/live/prompt/page.tsx`:
- Left panel shows prompts correctly
- Right panel "Agent Log" shows header "# Log: settings-page (opencode)" but content area is blank
- The log files exist at `.clawdbot/logs/<task-id>.log`
- Check the API that fetches log content
- May need to poll or use SSE for live updates
- If log file doesn't exist, show "No log file found" instead of blank

## Rules
- Do NOT change the visual design/colors/layout
- Only fix functional issues
- Run `npm run build` and fix any errors before finishing
- Commit all changes with message: "fix: architecture names, git loading, prompt logs"
