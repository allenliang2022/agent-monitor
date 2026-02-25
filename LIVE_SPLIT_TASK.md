# Live Dashboard Multi-Page Split

## Goal
Split the monolithic `/live` page (LiveDashboard.tsx, ~1400 lines) into separate sub-pages under `/live/*`, connected by a shared SSE context.

## Current State
- `app/live/page.tsx` renders `<LiveDashboard />` which has 9 sections all in one page
- SSE connection in LiveDashboard connects to `/api/events`
- Existing API routes: `/api/events`, `/api/sessions`, `/api/git`, `/api/health`, `/api/config`

## Target Structure

### Shared SSE Context: `app/live/LiveContext.tsx`
- Create a React Context that manages the SSE connection
- Provides: sessions, health, connected, eventLog, sseEventsCount, uptime, timelineEvents, configData
- All child pages consume this context instead of managing their own SSE

### Layout: `app/live/layout.tsx`
- Wrap children with `<LiveProvider>`
- Add a sub-navbar specific to /live pages with links:
  - Overview (/live)
  - Sessions (/live/sessions)
  - Agents (/live/agents)
  - Git (/live/git)
  - Config (/live/config)
  - Prompt (/live/prompt)
- Sub-navbar should be styled like the existing Navbar but smaller, positioned below main Navbar
- Active link highlight with underline animation

### Pages

1. **`/live` (page.tsx)** - Overview dashboard
   - Status Bar (connection indicator, gateway, sessions count, agents count)
   - Live Overview cards (Active Sessions, Active Agents, Uptime, Events Received)
   - Event Log
   - Navigation cards to other /live sub-pages

2. **`/live/sessions/page.tsx`** - Sessions & Timeline
   - Active Sessions table
   - Live Timeline (session start/end/update events)

3. **`/live/agents/page.tsx`** - Agent Status
   - 3 agent cards (main, girlfriend, xiaolongnv) with live status

4. **`/live/git/page.tsx`** - Git Activity
   - Git watch directory management
   - Git status display with recent commits

5. **`/live/config/page.tsx`** - System Config
   - Agents Config accordion
   - Cron Jobs accordion
   - Installed Skills accordion
   - Channel Bindings accordion

6. **`/live/prompt/page.tsx`** - Prompt Architecture
   - Prompt sections accordion (Identity, Memory, Orchestration, Skills, Safety, Proactive)
   - Operating Rules sidebar
   - Constraints sidebar

## Implementation Steps
1. Create `app/live/LiveContext.tsx` - extract ALL state and SSE logic from LiveDashboard.tsx
2. Create `app/live/layout.tsx` - LiveProvider wrapper + sub-navbar
3. Rewrite `app/live/page.tsx` - Overview only (status bar + overview cards + event log + nav cards)
4. Create `app/live/sessions/page.tsx`
5. Create `app/live/agents/page.tsx`
6. Create `app/live/git/page.tsx`
7. Create `app/live/config/page.tsx`
8. Create `app/live/prompt/page.tsx`
9. Delete or empty out the old `app/components/LiveDashboard.tsx` (or keep as re-export if needed)
10. Run `npm run build` to verify

## Design Rules
- Dark theme: bg from [#0a0a1a] to [#111128], cards bg-slate-900/40
- Use Tailwind standard color classes (cyan-400, purple-500, etc. NOT bare cyan/purple)
- Font: font-mono for data
- framer-motion for animations
- Each page should have its own section header
- "use client" on all pages that use hooks
- Sub-navbar: sticky, glass-morphism style, shows current active page

## Critical
- DO NOT break existing static pages (/timeline, /status, etc.)
- The main Navbar.tsx should NOT be modified
- All /live sub-pages must be client components ("use client")
- SSE connection should only be established once in the context, not per-page
- Run `npm run build` at the end to verify zero errors
