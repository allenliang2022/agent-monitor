Fix two pages that need improvement.

## Task 1: Architecture page (app/live/architecture/page.tsx)
When no agents are active, the page is empty with just Allen→Nova. Improve:
- Always show the Allen→Nova→Agent topology
- Show historical completed agents as grayed-out nodes branching off Nova
- Use the tasks data from LiveContext (useLive hook) to populate agent nodes
- Each agent node shows: task name, status badge, branch name
- Active agents pulse, completed agents are static, dead agents are dimmed
- Add animated connection lines between nodes

## Task 2: Prompt page (app/live/prompt/page.tsx)
- Status shows "unknown" for all prompts. Match prompt task-id to task status from LiveContext
- Improve the prompt card styling: add color-coded left border based on status
- Add word count and estimated token count to each prompt card
- The Agent Log panel on the right should let you select which agent log to view

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- Use existing LiveContext useLive() hook for task data
- Run npm run build to verify
