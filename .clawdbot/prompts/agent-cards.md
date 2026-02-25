The Agents page (app/live/agents/page.tsx) shows agent cards but could have better status handling.

## Task 1: Fix status display
Currently showing "DEAD" for completed agents and inconsistent badges:
- Map "dead" + has commits → "COMPLETED" badge (green)
- Map "dead" + no commits → "CANCELLED" badge (gray)
- Keep "running" as "RUNNING" (cyan)
- Keep "done" as "COMPLETED"
- The status should reflect whether the agent actually completed its work, not just whether the tmux session is alive.

## Task 2: Fix progress bar stages
The progress bar shows stages (Spawned, Coding, PR, CI, Review, Merged) but the logic may be wrong.
Look at app/api/agent-tasks/route.ts to see how status is determined.
For completed/merged tasks, all stages should be green.
For in-progress tasks, highlight up to the current stage.

## Task 3: Add action buttons
Add a row of quick action buttons at the bottom of each card:
- "View Logs" - opens log viewer modal or expands log section
- "View Diff" - links to /live/git with the task branch selected
- "Retry" - (only for failed tasks) button to retry the task
Use small icon buttons with tooltips.

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- Run npm run build to verify
