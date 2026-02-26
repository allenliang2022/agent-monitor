Add keyboard navigation and accessibility improvements.

## Task 1: Global keyboard shortcuts
Add a keyboard shortcut system with the following shortcuts:
- `g o` - Go to Overview
- `g t` - Go to Timeline
- `g a` - Go to Agents
- `g k` - Go to Tasks
- `g i` - Go to Git
- `g f` - Go to Files
- `g m` - Go to Monitoring
- `g r` - Go to Architecture
- `g p` - Go to Prompt
- `?` or `k` - Show keyboard shortcut help modal
- `n` - Open new task modal (on Tasks page)
- `Escape` - Close any open modal

Create a KeyboardShortcuts component at app/components/KeyboardShortcuts.tsx that:
- Uses useEffect to add/remove keydown listeners
- Tracks key sequence for two-key combos (g + letter)
- Uses next/navigation useRouter for navigation
- Shows a help modal with all shortcuts

## Task 2: Help modal
Create a styled modal showing all keyboard shortcuts:
- Dark themed matching the dashboard
- Two columns: shortcut key + description
- Close on Escape or click outside
- Animate in/out with framer-motion

## Task 3: Focus management
- Add visible focus rings on interactive elements (outline-cyan-500)
- Make sure tab order is logical on each page
- Add aria-labels to icon-only buttons

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- "use client" for all components
- Run npm run build to verify
