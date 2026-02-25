Redesign the Git page (/live/git) to show one project per tab instead of stacking all projects vertically.

## Current problem
All git directories (main repo + worktrees) are listed vertically on one page. As more projects/worktrees are added, the page becomes too long and hard to navigate.

## Requirements

### Tab navigation
- Add a horizontal tab bar at the top of the Git page
- Each watched git directory gets its own tab
- Tab label: directory basename (e.g. "agent-monitor", "test-readme", "git-commit-diff")
- Active tab has visual indicator (underline or highlight, cyan color)
- Tabs should be scrollable horizontally if too many
- Default: select the first tab (main repo)
- Remember selected tab when data refreshes

### Tab content
- Each tab shows ONLY that directory git info (the existing commit list, status, diff stat)
- Keep all existing functionality: commit history, click-to-expand diff viewer, status panel
- The "Watch" input and button should remain global (above the tabs)

### Summary bar
- Add a small summary bar above or below the tabs showing: "N projects | M total commits | K dirty"
- This gives quick overview without switching tabs

### Technical
- Modify ONLY app/live/git/page.tsx
- Use framer-motion for tab transitions (layoutId for active indicator)
- Tailwind v4 standard classes (text-cyan-400 not text-cyan)
- Keep existing GitDirCard / CommitNode / DiffViewer components, just restructure the layout
- The gitData from useLive() is a Record<string, GitDirInfo> - each key is a directory path

When done run npm run build to verify.
