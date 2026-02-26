Improve the Git page with better visualization.

## Task 1: Branch graph visualization
In app/live/git/page.tsx, add a visual branch graph above the commit list:
- Show branches as colored lines diverging from main
- Each branch shows its task name and status
- Merged branches converge back to main
- Use SVG for the graph rendering
- Active branches pulse, merged branches are solid, dead branches are dashed

## Task 2: Commit details expansion
When clicking a commit in the list:
- Expand to show full commit message
- Show file list with +/- stats
- Show the diff preview (first 20 lines of each file)
- Collapsible with smooth animation

## Task 3: Branch filter
Add filter buttons at top:
- "All branches" (default)
- "Main only" - only commits on main
- "Feature branches" - only commits on feature branches
- Show branch name badges next to each commit

## Task 4: Commit search
Add a search bar that filters commits by:
- Commit message text
- Author name
- File name in the commit
- Real-time filtering as you type

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- Use existing /api/git-log and /api/git-diff endpoints
- Run npm run build to verify
