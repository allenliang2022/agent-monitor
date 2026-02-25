# Live Dashboard Redesign Spec

## Goal
Redesign /live to be a real-time Mission Control for agent swarm monitoring, with the same visual quality and functionality as the static pages but powered by live data.

## Data Sources
All live pages share SSE connection via LiveContext (app/live/LiveContext.tsx).
Backend APIs:
- `/api/events` (SSE) - real-time push every 5s
- `/api/agent-tasks` - reads .clawdbot/active-tasks.json
- `/api/git?dir=<path>` - git status + recent commits
- `/api/sessions` - OpenClaw sessions
- `/api/prompts` - task prompt files

New APIs needed:
- `/api/agent-log?task=<id>` - tail last 100 lines of .clawdbot/logs/<id>.log
- `/api/file-changes?dir=<path>` - git diff --stat for a worktree (files changed + lines)

## Color System
IMPORTANT: Use standard Tailwind v4 classes ONLY:
- text-cyan-400, bg-cyan-400/10, border-cyan-400/20
- text-purple-500, bg-purple-500/10, border-purple-500/20
- text-emerald-400, bg-emerald-400/10, border-emerald-400/20
- text-amber-400, bg-amber-400/10, border-amber-400/20
- text-red-400, bg-red-400/10, border-red-400/20
- Backgrounds: bg-slate-800/50, bg-slate-900/50, border-slate-700
- Text: text-slate-200, text-slate-300, text-slate-400
NEVER use shorthand like text-cyan, bg-purple, etc.

## Shared Layout
app/live/layout.tsx - dark theme, sidebar nav with links to all sub-pages.
Show a small status indicator (green dot = SSE connected, red = disconnected).

## Pages

### /live (Overview)
Reference: app/components/HeaderStats.tsx
- "MISSION CONTROL" header with animated pulse dot
- 4 stat cards (animated counters via framer-motion):
  - Active Agents (from agent-tasks running count)
  - Total Tasks (from agent-tasks total)
  - Files Changed (sum of git diff across worktrees)
  - Total Commits (sum of commits across agent branches)
- Below: grid of page links (like static home page)
- All data from SSE + agent-tasks API

### /live/timeline
Reference: app/components/Timeline.tsx (263 lines)
- Vertical timeline showing REAL events as they happen
- Event types: agent_spawned, commit_pushed, pr_created, ci_passed, ci_failed, agent_died, review_ready
- Each event: colored dot, timestamp, title, expandable detail
- Auto-play: new events slide in at top with framer-motion
- Keep last 50 events max
- Color by type: spawn=cyan, commit=purple, pr=emerald, failure=red, alert=amber
- Click to expand: show raw data (shell output, git diff, etc.)
- Events generated from SSE diffs (detect new commits, status changes, new/removed tasks)

### /live/agents
Reference: app/components/AgentStatusMonitor.tsx (328 lines)
- Grid of agent cards, one per active task in .clawdbot/active-tasks.json
- Each card shows:
  - Task ID + description
  - Agent type badge (opencode/claude/codex)
  - tmux session status (ALIVE green / DEAD red) - check via API
  - Branch name
  - Status badge (running/ci_pending/ci_failed/ready_for_review/done)
  - Files changed count + lines added/removed
  - Time elapsed since startedAt
  - Mini progress bar (spawned > coding > PR created > CI > review > merged)
- Cards pulse when agent is actively committing
- Auto-refresh every 5 seconds
- Click card to expand: show last 20 lines of tmux log

### /live/files
Reference: app/components/FileChangesTreemap.tsx (263 lines)
- Treemap visualization where each rectangle = one changed file
- Size = lines added + removed
- Color by worktree/agent (each agent gets a distinct color)
- Hover shows: filename, lines +/-, which agent/task
- Data from `/api/file-changes?dir=<worktree-path>` for each active task
- Auto-refresh every 10 seconds
- Below treemap: sortable table of all changed files

### /live/monitoring
Reference: app/components/MonitoringPattern.tsx (311 lines)
- Visual flowchart of the agent swarm monitoring loop:
  spawn-agent.sh -> tmux session -> coding -> commit -> PR -> CI -> review -> merge
- Each node shows REAL current state:
  - How many agents at each stage
  - Which specific tasks are where
- Decision diamonds: tmux alive? CI passed? Review approved?
- Animated flow lines showing active paths
- Interactive: hover on node shows tasks at that stage

### /live/architecture
Reference: app/components/ArchitectureOverview.tsx (324 lines)
- System topology diagram:
  - You (Allen) at top
  - Nova (orchestrator) in middle
  - Active coding agents below (one node per running task)
  - Git worktrees at bottom
- Connection lines: Feishu <-> Nova <-> tmux <-> worktree <-> GitHub
- Nodes are LIVE: show actual running agents, real branch names
- Animated connection lines pulse when data flows
- Dead agents shown grayed out

### /live/prompt
Already exists (app/live/prompt/page.tsx, 143 lines)
- Enhance: add real-time tmux log viewer below the prompt
- Split view: prompt on left, live agent output on right
- Agent output auto-scrolls, monospace terminal font
- Read from `/api/agent-log?task=<id>`

## Implementation Notes
- All pages use `useLive()` hook from LiveContext for SSE data
- Additional polling for agent-tasks (every 5s) and file-changes (every 10s)
- Framer Motion for all animations, respect prefers-reduced-motion
- Mobile responsive (stack to single column)
- No new npm dependencies needed (framer-motion + recharts already installed)
