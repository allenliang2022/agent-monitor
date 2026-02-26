Optimize dashboard performance and code quality.

## Task 1: Memoize expensive computations
In app/live/LiveContext.tsx and page components:
- Wrap computed values in useMemo (task counts, filtered lists, etc.)
- Wrap callbacks in useCallback
- Ensure SSE event handler does not cause unnecessary re-renders
- Use React.memo on pure display components (stat cards, badges)

## Task 2: Reduce bundle size
- Check for large imports that could be lazy loaded
- Use next/dynamic for heavy components (CommandPalette, KeyboardShortcuts) with ssr: false
- Move chart/graph components to dynamic imports
- Check if framer-motion can be tree-shaken better (import specific modules)

## Task 3: Error boundaries
Create an error boundary component at app/components/ErrorBoundary.tsx:
- Catches rendering errors in child components
- Shows a styled error card with retry button
- Logs error details to console
- Wrap each live page section in an error boundary
- Add to app/live/layout.tsx to catch page-level errors

## Task 4: Code cleanup
- Remove any unused imports across all files
- Consolidate duplicate type definitions
- Ensure consistent naming (camelCase for functions, PascalCase for components)
- Add JSDoc comments to exported functions and components

## Technical constraints
- Next.js 16, Tailwind v4
- Run npm run build to verify
- Build should show no warnings
