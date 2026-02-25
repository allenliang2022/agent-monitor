#!/usr/bin/env bash
# spawn-agent.sh — Spawn a coding agent in an isolated worktree + tmux session
# Usage: spawn-agent.sh <task-id> <description> <prompt> [agent=opencode] [branch=feat/<task-id>]
set -euo pipefail

REPO_ROOT="/Users/liang/work/agent-monitor"
WORKTREE_BASE="/Users/liang/work/agent-monitor-worktrees"
CLAWDBOT="$REPO_ROOT/.clawdbot"
TASKS_FILE="$CLAWDBOT/active-tasks.json"

TASK_ID="${1:?Usage: spawn-agent.sh <task-id> <description> <prompt> [agent] [branch]}"
DESCRIPTION="${2:?Missing description}"
PROMPT="${3:?Missing prompt}"
AGENT="${4:-opencode}"
BRANCH="${5:-feat/$TASK_ID}"
TMUX_SESSION="agent-$TASK_ID"

mkdir -p "$WORKTREE_BASE"

# Ensure repo is up to date
cd "$REPO_ROOT"
git fetch origin 2>/dev/null || true

# Create worktree
WORKTREE_DIR="$WORKTREE_BASE/$TASK_ID"
if [ -d "$WORKTREE_DIR" ]; then
  echo "⚠️  Worktree $WORKTREE_DIR already exists. Reusing."
else
  git worktree add "$WORKTREE_DIR" -b "$BRANCH" HEAD
  echo "✅ Created worktree: $WORKTREE_DIR on branch $BRANCH"
fi

# Install deps in worktree
cd "$WORKTREE_DIR"
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  if [ -f "pnpm-lock.yaml" ]; then
    pnpm install --silent 2>/dev/null &
  elif [ -f "bun.lockb" ]; then
    bun install 2>/dev/null &
  elif [ -f "yarn.lock" ]; then
    yarn install --silent 2>/dev/null &
  else
    npm install --silent 2>/dev/null &
  fi
  INSTALL_PID=$!
fi

# Register task
TIMESTAMP=$(date +%s)000
python3 -c "
import json, sys, os
tf = '$TASKS_FILE'
tasks = json.load(open(tf)) if os.path.exists(tf) else []
task = {
    'id': '$TASK_ID',
    'tmuxSession': '$TMUX_SESSION',
    'agent': '$AGENT',
    'description': $(python3 -c "import json; print(json.dumps('$DESCRIPTION'))"),
    'repo': '$(basename "$REPO_ROOT")',
    'worktree': '$TASK_ID',
    'branch': '$BRANCH',
    'startedAt': $TIMESTAMP,
    'status': 'running',
    'retries': 0,
    'maxRetries': 3,
    'notifyOnComplete': True
}
tasks = [t for t in tasks if t['id'] != '$TASK_ID']
tasks.append(task)
json.dump(tasks, open(tf, 'w'), indent=2)
print('✅ Task registered: $TASK_ID')
"

# Wait for install
if [ -n "${INSTALL_PID:-}" ]; then
  wait $INSTALL_PID 2>/dev/null || true
fi

# Save prompt to prompts directory
mkdir -p "$CLAWDBOT/prompts"
echo "$PROMPT" > "$CLAWDBOT/prompts/$TASK_ID.md"

# Kill existing tmux session
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

# Build agent command
case "$AGENT" in
  opencode)
    AGENT_CMD="opencode run \"$PROMPT\""
    ;;
  claude)
    AGENT_CMD="claude --dangerously-skip-permissions -p \"$PROMPT\""
    ;;
  codex)
    AGENT_CMD="codex --model gpt-5.3-codex -c model_reasoning_effort=high --dangerously-bypass-approvals-and-sandbox \"$PROMPT\""
    ;;
  *)
    echo "❌ Unknown agent: $AGENT"
    exit 1
    ;;
esac

# Start tmux session
tmux new-session -d -s "$TMUX_SESSION" -c "$WORKTREE_DIR" "$AGENT_CMD"

# Enable logging
LOGFILE="$CLAWDBOT/logs/$TASK_ID.log"
mkdir -p "$CLAWDBOT/logs"
tmux pipe-pane -t "$TMUX_SESSION" "cat >> $LOGFILE"

echo "🚀 Agent '$AGENT' spawned in tmux session '$TMUX_SESSION'"
echo "   Worktree: $WORKTREE_DIR"
echo "   Branch: $BRANCH"
echo "   Monitor: tmux attach -t $TMUX_SESSION"
echo "   Log: $LOGFILE"
