# Round 7: Overview Commits + Agent Log Loading

## Context
- Project: /Users/liang/work/agent-monitor
- Round 6 fixed FILES CHANGED (now shows 91) and removed N button
- Two remaining issues need fixing

## Task 1: Fix Overview TOTAL COMMITS showing 0
In `app/live/page.tsx`:
- FILES CHANGED now correctly reads from gitData (shows 91)
- But TOTAL COMMITS still shows 0
- The gitData object has `recentCommits` array for each watched dir
- Fix: compute total commits by summing `recentCommits.length` across all gitData entries
- Look at how FILES CHANGED is computed and do the same pattern for commits

## Task 2: Fix Agent page "Loading log..." never completing
In `app/live/agent/page.tsx`:
- Currently shows "Loading log..." forever instead of actual log content
- The API endpoint is `/api/agent-log?taskId=<id>`
- Check what the API returns: `curl http://localhost:3847/api/agent-log?taskId=round2-ui-fix`
- The log files are at `.clawdbot/logs/<taskId>.log` relative to project root
- Possible issues:
  1. The API might return data in wrong format (check if frontend expects `content` vs `log` vs `lines`)
  2. The useAgentLog hook might have a state bug (loading never set to false)
  3. The log content might be there but not rendered (check conditional rendering)
- Fix the data flow so completed task logs actually display

## Task 3: Overview Event Log shows "Waiting for events..."
- The Event Log section on Overview page always shows "Waiting for events..."
- This should show recent events from the events API or SSE stream
- Check if the events data is being consumed on the overview page
- Wire it up to show the last few events

## Rules
- Do NOT change visual design/colors
- Run `npx next build` (not `npm run build` - PATH issues in worktree)
- Commit message: "fix: overview commits count, agent log display, event log"
