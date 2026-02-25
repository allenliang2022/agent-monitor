#!/usr/bin/env bash
# check-agents.sh — Monitor all active agents (deterministic, zero LLM tokens)
# Outputs JSON status. Run via cron every 10 minutes.
set -euo pipefail

REPO_ROOT="/Users/liang/work/agent-monitor"
CLAWDBOT="$REPO_ROOT/.clawdbot"
TASKS_FILE="$CLAWDBOT/active-tasks.json"

if [ ! -f "$TASKS_FILE" ]; then
  echo '{"status":"ok","tasks":[],"alerts":[]}'
  exit 0
fi

TASKS=$(python3 -c "
import json
tasks = json.load(open('$TASKS_FILE'))
running = [t for t in tasks if t['status'] == 'running']
for t in running:
    print(f\"{t['id']}|{t['tmuxSession']}|{t['branch']}|{t.get('retries',0)}|{t.get('maxRetries',3)}\")
")

if [ -z "$TASKS" ]; then
  echo '{"status":"ok","message":"No running tasks","alerts":[]}'
  exit 0
fi

RESULT='{"tasks":['
FIRST=true

while IFS='|' read -r TASK_ID TMUX_SESSION BRANCH RETRIES MAX_RETRIES; do
  [ "$FIRST" = true ] && FIRST=false || RESULT+=','

  # 1. tmux alive?
  TMUX_ALIVE="false"
  if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    TMUX_ALIVE="true"
  fi

  # 2. PR on this branch?
  PR_NUMBER=""
  CI_STATUS=""

  PR_JSON=$(gh pr list --head "$BRANCH" --json number,state,statusCheckRollup --limit 1 2>/dev/null || echo "[]")

  if [ "$PR_JSON" != "[]" ] && [ -n "$PR_JSON" ]; then
    PR_NUMBER=$(echo "$PR_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['number'] if d else '')" 2>/dev/null || echo "")

    CI_STATUS=$(echo "$PR_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d: print('unknown'); sys.exit()
checks = d[0].get('statusCheckRollup', []) or []
states = [c.get('conclusion','') or c.get('status','') for c in checks]
if not states: print('pending')
elif all(s in ('SUCCESS','success') for s in states): print('passed')
elif any(s in ('FAILURE','failure','ERROR','error') for s in states): print('failed')
else: print('pending')
" 2>/dev/null || echo "unknown")
  fi

  # 3. Determine status + alerts
  STATUS="running"
  ALERT=""

  if [ "$TMUX_ALIVE" = "false" ] && [ -z "$PR_NUMBER" ]; then
    STATUS="dead"
    ALERT="Agent died without creating PR"
  elif [ -n "$PR_NUMBER" ]; then
    if [ "$CI_STATUS" = "passed" ]; then
      STATUS="ready_for_review"
      ALERT="PR #$PR_NUMBER ready for review"
    elif [ "$CI_STATUS" = "failed" ]; then
      if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
        STATUS="ci_failed_retrying"
        ALERT="PR #$PR_NUMBER CI failed, retry $((RETRIES+1))/$MAX_RETRIES"
      else
        STATUS="ci_failed_max_retries"
        ALERT="PR #$PR_NUMBER CI failed, max retries reached - needs human"
      fi
    else
      STATUS="pr_created_ci_pending"
    fi
  fi

  RESULT+="{\"id\":\"$TASK_ID\",\"tmux_alive\":$TMUX_ALIVE,\"pr\":\"$PR_NUMBER\",\"ci\":\"$CI_STATUS\",\"status\":\"$STATUS\""
  if [ -n "$ALERT" ]; then
    RESULT+=",\"alert\":\"$ALERT\""
  fi
  RESULT+="}"

done <<< "$TASKS"

RESULT+=']'

# Summary
ALERT_COUNT=$(echo "$RESULT" | grep -o '"alert"' | wc -l | tr -d ' ')
if [ "$ALERT_COUNT" -gt 0 ]; then
  RESULT+=',"has_alerts":true'
else
  RESULT+=',"has_alerts":false'
fi
RESULT+='}'

echo "$RESULT"
