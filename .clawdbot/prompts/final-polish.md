Final polish pass for the dashboard.

## Task 1: Fix navbar overlap once and for all
The hero section on Overview STILL shows "MISSION CONTROL" text being cut off behind the navbar.

Investigation: The navbar is sticky top-0 with h-12. The live layout has pt-14. But the Overview page hero card has internal content that starts too high.

Real fix needed: In app/live/page.tsx, the hero section has a relative container. The issue is the "CONNECTED" badge and "MISSION CONTROL" badge are inside the card, but visually they appear above the "Agent Swarm Monitor" title. The card itself starts fine but the internal badges need more margin-top.

Look at the hero section motion.div around line 272-280. The badges inside use className="flex items-center gap-3 mb-3" - they need mt-4 or similar to push content down WITHIN the card.

## Task 2: Polish micro-interactions
- Add subtle hover scale effect on stat cards (1.02 transform)
- Add gradient border animation on focused/active nav items
- Add cursor-pointer on clickable elements that are missing it
- Smooth scroll behavior on page navigation

## Task 3: Favicon and page title
- Add a proper favicon (create an SVG at public/favicon.svg - terminal or robot icon in cyan)
- Update the page title in app/layout.tsx to "Agent Swarm Monitor | ASM"

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- Run npm run build to verify
