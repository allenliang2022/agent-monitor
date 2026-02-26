Create a Settings page at /live/settings accessible from navbar.

## Task 1: Settings page (app/live/settings/page.tsx)
Create a settings/config page with sections:

### General Settings
- Dashboard title (editable text field, saves to localStorage)
- Theme selection (dark only for now, but show disabled light/auto options)
- Polling interval slider (1-30 seconds, default 3)
- Max events in timeline (10-200, default 50)

### Agent Configuration
- Default agent type dropdown (opencode)
- Default branch prefix (feat/)
- Worktree base path (read-only display from API)
- Auto-cleanup completed worktrees toggle

### Notifications
- Enable/disable browser notifications toggle
- Sound on task completion toggle
- Enable/disable toast notifications toggle

### About
- Version display (read from package.json)
- GitHub repo link
- Total stats: tasks spawned, commits made, files changed (historical)

Save settings to localStorage. Use a SettingsContext (app/live/SettingsContext.tsx) that other components can read from.

## Task 2: Add Settings to Navbar
Add a gear icon + "Settings" link at the end of the Navbar nav items.

## Task 3: Apply polling interval setting
In LiveContext.tsx, read the polling interval from SettingsContext and use it for SSE reconnection / fallback polling interval.

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- "use client" for all
- Run npm run build to verify
