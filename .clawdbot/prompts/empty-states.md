Add polished empty states and loading states across all dashboard pages.

## Task 1: Overview empty state (app/live/page.tsx)
When total tasks = 0, show a welcoming empty state inside the Event Log area:
- Animated terminal/code icon
- "Ready to orchestrate" heading
- "Spawn your first agent task to see the dashboard come alive" subtext
- A prominent "New Task" button linking to /live/tasks (where the spawn button is)
- Subtle pulsing animation

## Task 2: Agents page empty state (app/live/agents/page.tsx)
When tasks array is empty:
- Show a centered empty state with robot icon
- "No agents running" heading
- "Start a task to see agents appear here" subtext

## Task 3: Loading states for all pages
Add a consistent loading skeleton pattern:
- Create a shared component at app/live/components/LoadingSkeleton.tsx
- Animated shimmer effect (pulse animation on slate-800 bg)
- Use it in pages that fetch data (agents, tasks, git, files)
- Show skeleton for ~500ms or until data arrives (whichever is longer, to prevent flash)

## Task 4: Agent page task selector (app/live/agent/page.tsx)
When multiple tasks exist but none are active, show a dropdown to select a completed task and view its logs.

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- "use client" for all components
- Run npm run build to verify
