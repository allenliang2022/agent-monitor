#!/usr/bin/env bash
# steer-agent.sh — Send a message to a running agent via tmux
# Usage: steer-agent.sh <task-id> <message>
set -euo pipefail

TASK_ID="${1:?Usage: steer-agent.sh <task-id> <message>}"
MESSAGE="${2:?Missing message}"
TMUX_SESSION="agent-$TASK_ID"

if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
  echo "❌ No tmux session: $TMUX_SESSION"
  exit 1
fi

tmux send-keys -t "$TMUX_SESSION" "$MESSAGE" Enter
echo "✅ Sent to $TMUX_SESSION: $MESSAGE"
