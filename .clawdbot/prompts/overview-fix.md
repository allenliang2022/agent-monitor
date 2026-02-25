Fix two issues on the Overview page (app/live/page.tsx) and global styles.

## Issue 1: Header overlapped by navbar
The top hero section (CONNECTED badge, MISSION CONTROL text, main title "Agent Swarm Monitor") is partially hidden behind the sticky navbar. The page already has pt-6 but needs more padding.

Fix: Add pt-16 or pt-20 to the main container to push content below the navbar. The navbar is h-12 (48px) so at least pt-14 is needed.

## Issue 2: Event Log empty on first load
The Event Log only shows "Connected to event stream". It needs to seed initial events from existing data on first load. In app/live/LiveContext.tsx, after the SSE connection first receives task data, generate seed events like:
- For each task: "Task {id}: status is {status}" 
- This way the event log immediately has content

But be careful NOT to spam events on every SSE update - only seed on the FIRST update (use a ref to track if seeded).

## Issue 3: Dark scrollbar CSS
Add custom scrollbar styling to app/globals.css:
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgb(51 65 85 / 0.5); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgb(71 85 105 / 0.7); }
```

## Technical constraints
- Next.js 16, Tailwind CSS v4
- Run npm run build to verify
