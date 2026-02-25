# LIVE DASHBOARD - Implementation Spec

## Overview
Add real-time monitoring capability to the Agent Swarm Monitor dashboard.
New route: `/live` - Real-time agent monitoring dashboard.

## Tech Stack
- Next.js API Routes (already have Next.js 16)
- SSE (Server-Sent Events) for real-time push
- No new dependencies needed (use native fetch + EventSource)

## Backend API Routes

### GET /api/sessions
Returns active OpenClaw sessions. Implementation:
```typescript
import { execSync } from 'child_process';
export async function GET() {
  const output = execSync('openclaw sessions --json --active 60 --all-agents 2>/dev/null', { encoding: 'utf-8' });
  const data = JSON.parse(output);
  return Response.json(data);
}
```

### GET /api/health  
Returns gateway health status:
```typescript
import { execSync } from 'child_process';
export async function GET() {
  const output = execSync('openclaw health 2>&1', { encoding: 'utf-8' });
  // Parse the text output into structured data
  return Response.json(parsed);
}
```

### GET /api/git?dir=/path/to/workdir
Returns git status for a working directory:
```typescript
// git status --short, git log --oneline -5, git diff --stat
```

### GET /api/events (SSE endpoint)
Server-Sent Events stream. Backend polls every 5 seconds:
- Sessions list
- Git status for watched directories
- Pushes diffs to client

```typescript
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        // Poll openclaw sessions + git status
        // Send as SSE event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
      }, 5000);
      // Cleanup on close
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
  });
}
```

## Frontend: /live page

### Layout
Dark theme (matches existing). Single page with these panels:

#### 1. System Status Bar (top)
- Gateway status (green/red dot)
- Active agents count
- Active sessions count  
- Uptime

#### 2. Active Sessions Table
- Session key, agent, model, age, tokens used
- Color-coded by agent (main=cyan, girlfriend=pink, xiaolongnv=purple)
- Auto-refreshes via SSE
- Click to expand and see recent messages

#### 3. Live Git Activity
- Configurable watched directories input
- For each: branch, status (clean/dirty), recent commits, changed files count
- Real-time diff preview

#### 4. Event Log (bottom)
- Scrolling log of all events (session updates, git changes, etc.)
- Timestamp + event type + details
- Auto-scroll to bottom

### Real-time Updates
- Use EventSource to connect to /api/events
- Update React state on each event
- Show connection status indicator (green dot = connected, red = disconnected)
- Auto-reconnect on disconnect

## Files to Create
1. `app/api/sessions/route.ts`
2. `app/api/health/route.ts`  
3. `app/api/git/route.ts`
4. `app/api/events/route.ts`
5. `app/live/page.tsx` - Main live dashboard page
6. `app/components/LiveDashboard.tsx` - Client component with SSE
7. Update `app/components/Navbar.tsx` - Add "Live" link with green pulse dot

## Important Notes
- Do NOT run npm install or create-next-app. Project is already set up.
- Use existing Tailwind classes and dark theme (bg-slate-900, text-slate-200, etc.)
- Use framer-motion for animations (already installed)
- `openclaw` CLI is in PATH
- After completing, run `npm run build` and commit as "feat: live real-time monitoring dashboard"
