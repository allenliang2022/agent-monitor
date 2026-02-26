Add ability to spawn new tasks from the dashboard and fix monitoring page.

## Task 1: Add spawn button to Tasks page (app/live/tasks/page.tsx)
Add a "New Task" button in the top section that opens a modal/form with:
- Task ID (text input, kebab-case)
- Description (text input)
- Detailed prompt (textarea, markdown)
- Agent type (dropdown: opencode)
Button POSTs to /api/spawn-task endpoint.

## Task 2: Create /api/spawn-task endpoint (app/api/spawn-task/route.ts)
POST endpoint that:
1. Validates the inputs (id required, description required, prompt required)
2. Saves the prompt to .clawdbot/prompts/{id}.md
3. Executes spawn-agent.sh via child_process.execSync
4. Returns success/error response
Note: spawn-agent.sh is at .clawdbot/spawn-agent.sh and takes args: task-id "description" "prompt" agent branch

## Task 3: Fix Monitoring page stats (app/live/monitoring/page.tsx)
The bottom summary cards show all zeros when no tasks are active. Fix:
- Show cumulative/historical counts from all tasks (not just running)
- Show "Completed: X" alongside running counts
- If all counts are zero, show a friendly "No tasks yet" message
- Add total task count and success rate percentage

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- Run npm run build to verify
