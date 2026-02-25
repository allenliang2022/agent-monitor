# CRITICAL FIX NEEDED

The dashboard has a major rendering issue: most sections below the Timeline render with WHITE/LIGHT backgrounds instead of the dark theme.

## Root Cause
Tailwind v4 with `@theme inline` defines custom colors (cyan, purple, green, amber, red), but the color classes like `bg-cyan/10`, `text-cyan`, `bg-purple/10` etc. are NOT rendering correctly in many components.

## Fix Strategy
Replace ALL custom color references with standard Tailwind v4 color classes:
- `bg-cyan` → `bg-cyan-400` or use inline style `style={{ backgroundColor: '#00d4ff' }}`
- `bg-cyan/10` → `bg-cyan-400/10`
- `text-cyan` → `text-cyan-400`
- `text-purple` → `text-purple-500`
- `text-green` → `text-emerald-400`
- `text-amber` → `text-amber-400`
- `text-red` → `text-red-400`
- `bg-purple/10` → `bg-purple-500/10`
- `bg-green/10` → `bg-emerald-400/10`
- `bg-amber/10` → `bg-amber-400/10`
- `border-cyan/20` → `border-cyan-400/20`
- `border-purple/20` → `border-purple-500/20`
- etc.

## Apply to ALL component files in app/components/:
1. AgentStatusMonitor.tsx - WHITE background issue, needs dark bg
2. FileChangesTreemap.tsx - invisible on white
3. AnimationDistribution.tsx - invisible on white
4. MonitoringPattern.tsx - already fixed separately but check colors
5. PromptDisplay.tsx - invisible on white
6. ArchitectureOverview.tsx - invisible on white
7. HeaderStats.tsx - check colors
8. Timeline.tsx - looks OK but verify

## Also check:
- Every section should have a dark background (bg-transparent is fine since body has gradient)
- All text should be light colored (slate-200/300/400)
- Cards/panels should use bg-slate-800/50 or bg-slate-900/50 with border-slate-700
- Remove any light-theme defaults

## Verify:
- `npm run build` must pass
- Commit: "fix: dark theme colors for all dashboard components"
