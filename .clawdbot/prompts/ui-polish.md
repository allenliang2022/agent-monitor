Polish UI across multiple pages for a better visual experience.

## Task 1: Files page - Fix treemap layout (app/live/files/page.tsx)
The treemap visualization has only 2 file blocks with massive empty space. Improve the layout:
- When there are few files (<5), use a card grid layout instead of treemap
- Each card shows: filename, task that changed it, +additions -deletions, a small bar chart showing relative size
- When there are many files (>5), use a proper proportional treemap based on total lines changed
- The treemap blocks should have minimum size to be readable
- Add hover tooltips showing full path and stats

## Task 2: Overview Explore section (app/live/page.tsx)
The "Explore" cards at the bottom of the Overview page are plain text. Enhance them:
- Add relevant emoji or icon to each card (e.g. timeline clock, agent robot, git branch)
- Add a subtle hover glow effect matching the card color theme
- Show live count badges (e.g. "3 events", "2 agents") from the SSE data
- Cards should link to corresponding /live/ sub-pages

## Task 3: Monitoring page - Add timing info (app/live/monitoring/page.tsx)
The flowchart is nice but lacks timing data. For each stage:
- Show how long tasks have been in that stage (e.g. "Coding: 19m 30s")
- Show which specific tasks are at each stage (task names next to the count badges)
- Add a small timestamp showing when the last task entered each stage

## Technical constraints
- Next.js 16, Tailwind CSS v4, framer-motion
- Use standard color classes (text-cyan-400 not text-cyan)
- Run npm run build to verify when done
