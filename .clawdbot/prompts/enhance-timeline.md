The Timeline page (app/live/timeline/page.tsx) currently shows events but could be more useful.

## Task 1: Add filtering by event type
Add filter buttons above the timeline to filter by event type:
- "All" (default) - shows everything
- "Agent" - only agent events 
- "System" - only system events
- "Git" - only git events
Use cyan highlight for active filter.

## Task 2: Add grouping by time
Group events by time period:
- "Just now" (last minute)
- "Recent" (last 5 minutes)  
- "Earlier" (older)
Show a subtle divider between groups.

## Task 3: Add expand/collapse for event details
Some events may have details (like full commit messages). Add a chevron to expand event details when available.

## Task 4: Add auto-scroll toggle
Add a toggle to enable/disable auto-scrolling to latest events. When enabled, new events should scroll into view. Show a "jump to latest" button when scrolled up.

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- Use existing LiveContext (useLive hook) for data
- Run npm run build to verify
