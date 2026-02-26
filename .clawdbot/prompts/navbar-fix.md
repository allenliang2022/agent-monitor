Fix the persistent navbar overlap issue and improve responsive design.

## Task 1: Fix navbar overlap on Overview (app/live/page.tsx)
The sticky navbar at top overlaps the hero section content. The CONNECTED badge and MISSION CONTROL text are partially hidden.
Current: the page has pt-20 but the hero card starts at the very top of the padding area.

The real fix: look at app/layout.tsx (the root layout). The Navbar component uses `sticky top-0`. The content below needs enough margin. But the issue is the live layout (app/live/layout.tsx) wraps children without accounting for navbar height.

Fix approach: In app/live/layout.tsx, add `pt-14` (56px, slightly more than navbar h-12) to the wrapper div. This way ALL live pages get proper navbar clearance, not just Overview.

Then REMOVE the extra `pt-20` from app/live/page.tsx (change to pt-4 or pt-6, since layout already has pt-14).

Also check other live pages (agents, tasks, timeline, etc) - if any have excessive top padding, normalize them.

## Task 2: Responsive improvements
Check all live pages on smaller widths (768px):
- Navbar should scroll horizontally if too many items
- Stats cards on Overview should stack on mobile (already grid, just verify)
- Agent cards should be single column on mobile
- Timeline events should be full width
- Add a hamburger menu for mobile that shows nav items

## Technical constraints
- Next.js 16, Tailwind v4
- Run npm run build to verify
