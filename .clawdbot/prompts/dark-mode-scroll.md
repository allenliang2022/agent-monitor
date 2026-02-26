Enhance the dashboard with professional features.

## Task 1: Command Palette (app/components/CommandPalette.tsx)
Create a command palette (like VS Code Cmd+K) that:
- Opens with Cmd+K or Ctrl+K
- Shows a search input at top
- Lists all pages with icons, filterable by typing
- Lists recent tasks, also searchable
- Keyboard navigable (up/down arrows, Enter to select)
- Navigate to selected page/task on Enter
- Framer motion animated modal with backdrop blur
- Uses data from LiveContext for task list

## Task 2: Page transitions (app/live/layout.tsx)
Add smooth page transitions between live sub-pages:
- Wrap {children} in AnimatePresence + motion.div
- Fade + slight slide on page change
- Use usePathname() to trigger transitions
- Keep transitions fast (200-300ms)

## Task 3: Toast notifications (app/components/Toast.tsx)
Create a toast notification system:
- Toast appears bottom-right
- Auto-dismiss after 3 seconds
- Types: success (green), error (red), info (cyan)
- Animated slide-in/out with framer-motion
- Create a ToastProvider context + useToast hook
- Use it in spawn-task flow to show "Task spawned!" success toast

## Technical constraints
- Next.js 16, Tailwind v4, framer-motion
- "use client" for all components
- Run npm run build to verify
