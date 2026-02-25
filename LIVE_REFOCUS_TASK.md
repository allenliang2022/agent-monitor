# Live Dashboard Refocus: Coding Agent Monitor

## Goal
Refocus the /live dashboard to ONLY monitor coding agent (opencode/codex) work. Remove unrelated system monitoring.

## Pages to Keep & Refocus

### /live (Overview)
- **Task Queue**: Running / Completed / Failed agent tasks
- **Current Task**: What the active agent is doing right now (task name, duration, status)
- **Quick Stats**: Total tasks today, total commits, total files changed
- **Event Log**: Only agent-related events (task start, task complete, build pass/fail, commit)

### /live/sessions → rename to /live/tasks
- **Active Tasks**: Running coding agent processes (session ID, task name, duration, PID)
- **Task History**: Recently completed tasks with status (success/fail), duration, what changed
- NOT: Feishu chat sessions, main/girlfriend/xiaolongnv sessions

### /live/agents → rename to /live/agent
- **Agent Process**: Single view of the active opencode/codex process
- **Live Output**: Last N lines of agent stdout (from process log)
- **Todos Tracker**: Parse agent's "# Todos" output to show checkboxes
- NOT: main/girlfriend/xiaolongnv status cards

### /live/git (keep as-is, already relevant)
- Git activity from agent's commits
- Watch the project directory

### /live/prompt (keep as-is, already relevant)
- Actual prompts sent to coding agents

### /live/config → DELETE (not relevant to coding agent monitoring)

## New API Routes

### /api/agent-tasks/route.ts
Read from a task log file that Nova writes when spawning agents:
`/Users/liang/work/agent-monitor/data/agent-tasks.json`

Structure:
```json
{
  "tasks": [
    {
      "id": "tidal-basil",
      "name": "Live Dashboard Enhancement",
      "agent": "opencode",
      "promptFile": "LIVE_TASK.md",
      "startedAt": "2026-02-25T19:47:00+08:00",
      "completedAt": "2026-02-25T19:55:00+08:00",
      "status": "completed",
      "commit": "4a30047",
      "filesChanged": 4
    }
  ]
}
```

## Sub-navbar Links (5 pages, not 6)
Overview | Tasks | Agent | Git | Prompt

## Design Rules (same as before)
- Dark theme, font-mono, Tailwind standard colors
- framer-motion animations
- SSE for real-time updates
