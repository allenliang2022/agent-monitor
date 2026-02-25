Add an inline commit diff viewer to the Git page (/live/git).

## Requirements

### 1. New API: /api/git-diff
Create app/api/git-diff/route.ts:
- Query params: dir (git directory path), hash (commit hash)
- Run `git diff <hash>^..<hash>` in the given directory
- Return JSON: { diff: string, files: [{path, additions, deletions}], stats: {filesChanged, additions, deletions} }
- Handle edge cases: first commit (no parent), invalid hash

### 2. Update Git page UI: app/live/git/page.tsx
- Make each commit row clickable/expandable
- On click, fetch /api/git-diff with the commit hash and directory
- Show an inline diff viewer below the commit:
  - File tabs (click to switch between changed files)
  - Syntax-highlighted diff with green (+) and red (-) lines
  - Stats bar showing +additions -deletions per file
  - Loading spinner while fetching
  - Collapse on second click
- Style: dark theme, monospace font, consistent with existing design
- Use framer-motion for expand/collapse animation

### Technical constraints
- This is Next.js 16 with Tailwind CSS v4, use standard color classes (e.g. text-green-400 not text-green)
- All components are client-side ('use client')
- Import types from ../LiveContext if needed
- No external diff parser libraries - parse git diff output directly

### Files to create/modify
- CREATE: app/api/git-diff/route.ts
- MODIFY: app/live/git/page.tsx (add expandable diff viewer)

When done, run 'npm run build' to verify no type errors.
