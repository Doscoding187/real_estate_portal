#!/usr/bin/env bash
# Local parity preview: real server code + national place data from the local
# Database Authority MySQL (127.0.0.1:3307). Place data only, no user data.
# Usage: scripts/preview/local-parity.sh start|stop|status
# Prerequisite: the documented DB sequence in docs/local-development-setup.md
# ("Local parity preview: place search and place pages") has been run.
# Local-only: binds 127.0.0.1, reads no env files itself, stores only PIDs/logs.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_PORT="${PARITY_API_PORT:-5070}"
WEB_PORT="${PARITY_WEB_PORT:-3020}"
STATE_DIR="/var/tmp/property-listify-$(id -u)/local-parity"
API_PID_FILE="$STATE_DIR/api.pid"
WEB_PID_FILE="$STATE_DIR/web.pid"
API_URL="http://127.0.0.1:${API_PORT}"
WEB_URL="http://127.0.0.1:${WEB_PORT}"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

alive() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

listening() { ss -ltn 2>/dev/null | grep -q "127.0.0.1:$1 \|0.0.0.0:$1 \|\*:$1 \|\[::\]:$1 "; }

start_one() {
  local name="$1" pidfile="$2" port="$3"
  shift 3
  if alive "$pidfile"; then
    echo "$name already running (pid $(cat "$pidfile"))"
    return 0
  fi
  if listening "$port"; then
    echo "$name: port $port is in use by another process; not touching it" >&2
    return 1
  fi
  (cd "$ROOT" && setsid "$@" >"$STATE_DIR/$name.log" 2>&1 </dev/null &
    echo $! >"$pidfile")
  echo "$name started (pid $(cat "$pidfile")), log $STATE_DIR/$name.log"
}

wait_for() {
  local port="$1" i
  for i in $(seq 1 90); do
    listening "$port" && return 0
    sleep 1
  done
  return 1
}

case "${1:-status}" in
  start)
    start_one api "$API_PID_FILE" "$API_PORT" \
      env NODE_ENV=development APP_ENV=development SKIP_FRONTEND=true PORT="$API_PORT" \
      APP_URL="$WEB_URL" FRONTEND_URL="$WEB_URL" \
      pnpm exec tsx server/_core/start.ts || exit 1
    start_one web "$WEB_PID_FILE" "$WEB_PORT" \
      env VITE_API_URL="$API_URL" VITE_API_BASE_URL="$API_URL" VITE_DEPLOY_ENV=development \
      pnpm exec vite --host 127.0.0.1 --port "$WEB_PORT" --strictPort || exit 1
    wait_for "$API_PORT" || echo "api not listening yet; see $STATE_DIR/api.log" >&2
    wait_for "$WEB_PORT" || echo "web not listening yet; see $STATE_DIR/web.log" >&2
    echo "API: $API_URL   WEB: $WEB_URL"
    ;;
  stop)
    for f in "$API_PID_FILE" "$WEB_PID_FILE"; do
      if alive "$f"; then
        pid="$(cat "$f")"
        kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null
        echo "stopped $pid"
      fi
      rm -f "$f"
    done
    ;;
  status)
    for n in api web; do
      f="$STATE_DIR/$n.pid"
      if alive "$f"; then echo "$n running (pid $(cat "$f"))"; else echo "$n stopped"; fi
    done
    echo "API: $API_URL   WEB: $WEB_URL"
    ;;
  *)
    echo "usage: $0 start|stop|status" >&2
    exit 2
    ;;
esac
