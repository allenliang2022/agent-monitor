# Round 4: Git/Agent/Files Display Fixes

## Context
- Project: /Users/liang/work/agent-monitor
- Round 3 fixed status inference, prompt status, and timeline events
- Now Git page is stuck on "Loading git status..."
- Agent page Live Output shows "Waiting for agent..." even for completed tasks
- Files page only shows summary; treemap not rendering

## Task 1: Fix Git page loading regression
In `app/live/git/page.tsx` and `app/live/LiveContext.tsx`:
- Git tab shows projects list but content area stuck at "Loading git status..."
- The API `/api/git?dir=...` returns data but `gitData[dir]` isn't populated or not used
- Ensure `fetchGit` is called after tasks load and on tab change
- Ensure `resolvedActiveDir` matches the key in `gitData`
- If API fails, show a friendly error instead of infinite loading

## Task 2: Fix Agent page Live Output
In `app/live/agent/page.tsx`:
- Live Output panel shows: "No log output yet. Waiting for agent to produce output..."
- But log files exist in `.clawdbot/logs/<task-id>.log`
- Use `/api/agent-log?taskId=...` to fetch and display logs
- If task is completed, show last N lines even if no live session
- Ensure the log panel updates when dropdown changes

## Task 3: Render Files page treemap
In `app/live/files/page.tsx`:
- Top shows summary (91 files etc.) but treemap area is empty
- Data is available from `/api/files`
- Ensure data is passed into the treemap component and rendered
- If no file changes, show placeholder. But here there ARE changes so it should render

## Rules
- Do NOT change visual design
- Only fix data flow / rendering
- Run `npm run build`
- Commit message: "fix: git loading, agent logs, files treemap"