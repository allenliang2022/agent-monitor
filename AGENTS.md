# Agent Monitor - Project Context

## What is this?
A Next.js web app that visualizes an Agent Swarm coding session. It shows how Nova (the orchestrator AI) spawned, monitored, and verified a coding agent that added Framer Motion animations to a travel website.

## Data
All session data is in `data/swarm-session.json`. This is the ONLY data source. Read it carefully.

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (for the dashboard's own animations)
- Recharts (for charts)
- No database needed - the JSON file is the data source

## Design
Dark theme, premium feel. Think: a mission control dashboard for AI agents.
Color palette:
- Background: #0a0a1a to #111128
- Cyan accent: #00d4ff (tmux/agent status)
- Purple accent: #9333ea (Nova/orchestrator)
- Green accent: #22c55e (success/completed)
- Amber accent: #f59e0b (warnings)
- Red accent: #ef4444 (failures)

## App Structure
Single page app with multiple sections (scrollable dashboard):

### Section 1: Header + Key Stats
- Session title, time range, orchestrator name
- 4 stat cards: Files Changed (21), Lines Added (+2143), Duration (~9min), Animation Calls (229)
- Animated counters on mount

### Section 2: Interactive Timeline
- Vertical timeline with all 10 events
- Each node: colored dot (cyan=spawn, purple=check, green=done, amber=alert), timestamp, title, detail
- Click to expand: shows actual shell commands run, raw results, assessment
- Auto-play mode: replays the timeline in real-time proportional speed (compressed to ~30 seconds)

### Section 3: Agent Status Monitor
- Real-time style display showing what each check detected
- 4 check cards arranged in a grid
- Each card shows: check number, tmux status (ALIVE/DEAD badge), files detected, components count progress bar, git status
- Animated transitions between checks (like a live monitoring dashboard)

### Section 4: File Changes Treemap/Heatmap
- Visual treemap where each rectangle = one file, size = lines added
- Color by category (component=cyan, page=purple, lib=green, style=amber, deps=gray)
- Hover shows exact line count
- Sort by size descending

### Section 5: Animation Distribution
- Horizontal bar chart: each component's animation call count
- Sorted descending
- Bars animated on scroll-into-view

### Section 6: Monitoring Pattern Diagram
- Visual flowchart: spawn -> sleep -> poll -> check tmux -> check git -> assess -> report -> loop
- Decision nodes: tmux alive? -> continue loop / tmux dead? -> check commit -> success or retry
- Interactive: hover on each node shows explanation

### Section 7: Prompt Display
- Collapsible accordion showing the full prompt text
- Syntax highlighted (steps in blue, component names in cyan, rules in amber)
- Side panel: prompt design insights (why each section exists)

### Section 8: Architecture Overview
- Simple diagram: Allen -> Nova (orchestrator) -> opencode (worker) -> git worktree
- Shows the communication flow: Feishu messages, tmux sessions, git operations
- Animated connection lines

## Performance
- Use dynamic imports for Recharts (heavy)
- Framer Motion animations respect prefers-reduced-motion
- Mobile responsive (stack columns on small screens)
