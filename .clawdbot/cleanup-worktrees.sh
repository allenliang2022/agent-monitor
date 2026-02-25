#!/usr/bin/env bash
# cleanup-worktrees.sh — Remove completed/merged worktrees and update task registry
set -euo pipefail

REPO_ROOT="/Users/liang/work/agent-monitor"
WORKTREE_BASE="/Users/liang/work/agent-monitor-worktrees"
CLAWDBOT="$REPO_ROOT/.clawdbot"
TASKS_FILE="$CLAWDBOT/active-tasks.json"

if [ ! -f "$TASKS_FILE" ]; then
  echo "No tasks file found."
  exit 0
fi

python3 -c "
import json, subprocess, os

tasks = json.load(open('$TASKS_FILE'))
kept = []
removed = []

for t in tasks:
    if t['status'] in ('merged', 'closed', 'abandoned'):
        wt = '$WORKTREE_BASE/' + t['worktree']
        branch = t['branch']

        if os.path.isdir(wt):
            subprocess.run(['git', '-C', '$REPO_ROOT', 'worktree', 'remove', '--force', wt],
                          capture_output=True)

        subprocess.run(['tmux', 'kill-session', '-t', t['tmuxSession']],
                      capture_output=True)

        subprocess.run(['git', '-C', '$REPO_ROOT', 'branch', '-D', branch],
                      capture_output=True)

        removed.append(t['id'])
    else:
        kept.append(t)

json.dump(kept, open('$TASKS_FILE', 'w'), indent=2)
print(f'Cleaned up {len(removed)} tasks: {removed}')
print(f'Remaining: {len(kept)} tasks')
"
