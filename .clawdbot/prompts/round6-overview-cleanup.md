# Round 6: Overview Stats, N Button, Agent Log

## Context
- Project: /Users/liang/work/agent-monitor
- Git page, Timeline, Monitoring all working great
- Need to fix Overview stats and cleanup stray UI element

## Task 1: Fix Overview page stats
In `app/live/page.tsx`:
- FILES CHANGED shows 0, but there ARE changed files in the repo
- TOTAL COMMITS shows 0, but there are 20+ commits
- These stats should come from the SSE events or gitData
- Check useLive() for gitData and use it to populate:
  - FILES CHANGED: sum of changedFiles across all watched git dirs
  - TOTAL COMMITS: count of recentCommits across all dirs
- Alternatively, call the git API directly on mount

## Task 2: Remove or fix the mysterious "N" button
There is a black circular button with letter "N" in the bottom-left corner of every page:
- It appears on Overview, Timeline, Agent pages at fixed position bottom-left
- This could be a Navbar toggle, dev tool, or debugging element
- Find where it comes from and REMOVE it if not functional
- Search for: className containing "fixed bottom" or "left-0" combined with "rounded-full"
- Also search for text "N" in JSX that's not part of words
- Check `app/components/` and `app/live/layout.tsx`

## Task 3: Fix Agent page log loading
In `app/live/agent/page.tsx`:
- Shows "Task completed. No log output available."
- But the header shows: `log: .clawdbot/logs/round2-ui-fix.log` (file exists!)
- The useAgentLog hook or API call is failing silently
- Debug: check if `/api/agent-log?taskId=round2-ui-fix` returns content
- If API works, the issue is in the frontend rendering
- Make sure logContent is actually displayed in the terminal UI

## Rules
- Do NOT change visual design/colors  
- Run `npm run build`
- Commit message: "fix: overview stats, remove N button, agent log display"
