# Round 3: Status Inference & Layout Fixes

## Context
- Project: /Users/liang/work/agent-monitor (Next.js + TypeScript + Tailwind)
- The dashboard runs from the main project dir via `npx next dev --port 3847`
- process.cwd() = /Users/liang/work/agent-monitor
- Worktrees are at /Users/liang/work/agent-monitor-worktrees/<task-id>/
- active-tasks.json is at .clawdbot/active-tasks.json

## Task 1: Fix PROJECT_DIR / WORKTREE_BASE in all API routes
The API routes use `process.cwd()` which is correct when running from the main project. But `WORKTREE_BASE` should always be `${process.cwd()}-worktrees` (already fixed in agent-tasks and events routes).

Check ALL API routes under `app/api/` and ensure:
- `PROJECT_DIR = process.cwd()` (this is /Users/liang/work/agent-monitor)
- `WORKTREE_BASE = \`${PROJECT_DIR}-worktrees\`` (not `join(PROJECT_DIR, "..")`)
- Any path that references worktrees uses WORKTREE_BASE

Also check `app/live/LiveContext.tsx` for any hardcoded paths.

## Task 2: Fix Overview page layout - Navbar overlapping Mission Control header
In `app/live/page.tsx` and `app/live/layout.tsx`:
- The top Navbar and the "MISSION CONTROL" header area overlap
- The Navbar sits at `top: 0` with `fixed` or `sticky` positioning
- The content below needs proper `pt-` (padding-top) to not be hidden behind the navbar
- Check the layout.tsx `pt-14` value - it may need to be larger since Mission Control has its own header

Also check `app/components/Navbar.tsx`:
- The navbar has a z-index issue where some page content shows through it

## Task 3: Fix Prompt page - most prompts show UNKNOWN status
In `app/api/prompts/route.ts` and `app/live/prompt/page.tsx`:
- Only the first 3 prompts (round1-data-accuracy, performance-opt, settings-page) show as COMPLETED with opencode badge
- All other prompts (agent-cards, arch-prompt-fix, dark-mode-scroll, etc.) show UNKNOWN status
- These older prompts were used before the active-tasks.json system was created
- Solution: If a prompt file name matches a git branch name (feat/<prompt-name>), and that branch is merged into main, mark it as COMPLETED
- Use `git branch --merged main` to get list of merged branches

## Task 4: Enrich Timeline with more event types
In `app/api/events/route.ts` and `app/live/timeline/page.tsx`:
- Currently only shows "AGENT SPAWNED" events
- Should also generate events for:
  - Task COMPLETED (when status is completed)
  - Git COMMIT (parse recent commits from git log)
  - Task MERGED (when branch is merged into main)
- Parse git log for recent commits: `git log --all --oneline --since="24 hours ago"` 
- Map commits to tasks by matching branch names

## Rules
- Do NOT delete or restructure existing components
- Do NOT change the color scheme or visual design
- Run `npm run build` and fix any errors before finishing
- Commit with message: "fix: status inference, layout overlap, prompt status, timeline events"
