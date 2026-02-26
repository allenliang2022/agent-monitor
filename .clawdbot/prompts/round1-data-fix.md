# Round 1: Data Accuracy & Status Fixes

Fix data accuracy issues across the dashboard. The task status system is broken - tasks that completed successfully show as "DEAD", "CANCELLED", or "FAILED".

## Context
- Project: /Users/liang/work/agent-monitor (Next.js + TypeScript + Tailwind)
- The dashboard monitors coding agents (opencode) working in git worktrees
- Agent tasks complete when: tmux session exits + commit exists on branch
- Two tasks exist: settings-page and performance-opt (both completed with commits)

## Task 1: Fix task status inference in API
In `app/api/agent-tasks/route.ts` and `app/api/events/route.ts`:
- When a task's tmux session is dead BUT the branch has commits ahead of main → status should be "completed", not "dead"
- When computing stats, count these as "completed" not "failed"
- The `active-tasks.json` has `status: "running"` for tasks whose tmux died; the API should infer the real status

## Task 2: Fix Overview page stats
In `app/live/page.tsx`:
- "ACTIVE AGENTS: 0" is correct
- "TOTAL TASKS: 2" is correct  
- Make sure stats cards reflect accurate completed/failed counts

## Task 3: Fix Tasks page status display
In `app/live/tasks/page.tsx`:
- Tasks show "DEAD" badge → should show "COMPLETED" (green) when branch has commits
- The summary stats bar shows "Completed: 0" but lists 2 tasks under "Completed" section
- Fix the counting logic

## Task 4: Fix Agents page status
In `app/live/agents/page.tsx`:
- Cards show "CANCELLED" badge → should show "COMPLETED" 
- The pipeline progress (Spawned → Coding → PR → CI → Review → Merged) should show progress up to "Coding" completed

## Task 5: Fix Agent page
In `app/live/agent/page.tsx`:
- "Recent Completed (0)" should show the 2 completed tasks
- The dropdown shows "performance-opt (dead)" → should say "(completed)"

## Task 6: Fix Monitoring page stats
In `app/live/monitoring/page.tsx`:
- "SUCCESS RATE: 0%" and "2 failed" is wrong
- Should be "SUCCESS RATE: 100%" and "2 completed"
- The flowchart should show tasks at the "Commit" stage (they committed but no PR)

## Task 7: Fix Architecture page
In `app/live/architecture/page.tsx`:
- "performance-op" name is truncated → show full "performance-opt"
- Agent status badges should show "COMPLETED" not "DEAD"

## Task 8: Fix Prompt page
In `app/live/prompt/page.tsx`:
- All prompts show "UNKNOWN" status → should match task status from agent-tasks.json
- Agent Log panel is blank → should load from .clawdbot/logs/<task-id>.log

## Task 9: Fix Settings page
In `app/live/settings/page.tsx`:
- GitHub Repository link shows "anomalyco/agent-monitor" → change to "allenliang2022/agent-monitor"

## Rules
- Do NOT delete or restructure existing components
- Do NOT change the visual design/colors/layout
- Only fix data logic and status inference
- Run `npm run build` and fix any errors before finishing
- Commit all changes with message: "fix: accurate task status inference and data display"
