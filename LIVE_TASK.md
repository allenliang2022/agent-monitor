# Live Dashboard Enhancement Task

## Goal
Enhance the `/live` page to include 4 additional real-time sections (Overview, Timeline, Status Monitor, Prompt) below the existing Active Sessions / Git Activity / Event Log sections.

## Current Architecture
- `/app/live/page.tsx` renders `<LiveDashboard />` 
- `LiveDashboard.tsx` connects to `/api/events` via SSE, receives updates every 5 seconds
- SSE data shape: `{ type: "update", timestamp, sessions: { count, sessions[] }, git: { "/path": { branch, dirty, recentCommits[], statusFiles[] } } }`
- Each session has: `key, sessionId, agentId, age, ageMs, chatType, channel, updatedAt`

## What to Add

### 1. Live Overview Section (top of page, replaces/enhances current status bar)
Like `HeaderStats.tsx` but with LIVE data:
- **Active Sessions** count (from SSE sessions.count)
- **Active Agents** count (unique agentId values)  
- **Uptime** (time since first SSE connection)
- **Events Received** (counter of SSE messages)
Use animated counters with framer-motion. Show "MISSION CONTROL" badge with live pulse dot.

### 2. Live Session Timeline
Like `Timeline.tsx` but showing REAL events as they happen:
- Each SSE update that has new/changed sessions = a timeline event
- Show: timestamp, event type (session_start, session_update, session_end, git_change), actor (agentId), detail
- Auto-play: new events appear at the top with slide-in animation
- Keep last 50 events max
- Color-code by agent (main=cyan, girlfriend=pink, xiaolongnv=purple)

### 3. Live Agent Status Monitor  
Like `AgentStatusMonitor.tsx` but real-time:
- Show each agent (main, girlfriend, xiaolongnv) as a card
- Card shows: agent name, active sessions count, last activity time, channel, status (active/idle)
- Pulse animation on the active agent's card
- Grid layout: 3 cards in a row

### 4. Live Prompt/Config Display
Show the current system configuration:
- Read from a new API endpoint `/api/config` that returns: agents list, cron jobs count, skills count, channels
- Display as an accordion similar to `PromptDisplay.tsx`
- Sections: Agents Config, Active Cron Jobs, Installed Skills, Channel Bindings

## Implementation Plan

### New API Route: `/app/api/config/route.ts`
Read from filesystem:
- Agents: list dirs in `~/.openclaw/agents/`
- Cron: read `~/.openclaw/agents/main/cron/jobs.json` (count jobs)
- Skills: count skill dirs in `/opt/homebrew/lib/node_modules/openclaw/skills/` + `~/.openclaw/workspace/skills/`

### Modify `LiveDashboard.tsx`
Add 4 new sections after the existing ones. All sections use the same SSE connection (no new EventSource).

### Key Design Rules
- **Dark theme**: bg-slate-900/40, border-slate-800/50, text colors use Tailwind standard (cyan-400, purple-500, etc.)
- **Font**: font-mono for data, default for labels
- **Animations**: framer-motion for enter/exit, but keep it subtle
- **Responsive**: grid layout, mobile-friendly
- **NO changes to existing sections** (Active Sessions, Git Activity, Event Log must stay as-is)
- **DO NOT import from `@/data/swarm-session.json`** - all data comes from SSE or API calls

## Files to Create/Modify
1. MODIFY: `app/components/LiveDashboard.tsx` - add 4 sections
2. CREATE: `app/api/config/route.ts` - system config endpoint

## Build Verification
Run `npm run build` after changes to verify no errors.
