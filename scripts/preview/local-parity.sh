#!/usr/bin/env bash
# Local parity preview: real server code + national place data from the local
# Database Authority MySQL (127.0.0.1:3307). Place data only, no user data.
# Usage: scripts/preview/local-parity.sh start|stop|status|outbox [email]
# PARITY_LAUNCH_MODE=pilot (default) | reactivation. pilot = after pilot start:
# agent/agency/developer launch access honoured (dev-only opt-in, local DB only);
# reactivation = paid access off (preparation_only). Production is unaffected.
# Prerequisite: the documented DB sequence in docs/local-development-setup.md
# ("Local parity preview: place search and place pages") has been run.
# Local-only: binds 127.0.0.1, reads no env files itself (JWT_SECRET comes from
# the central local environment via scripts/preview/parityLoginSecret.ts),
# stores only PIDs/logs.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_PORT="${PARITY_API_PORT:-5070}"
WEB_PORT="${PARITY_WEB_PORT:-3020}"
# Never inside /var/tmp/property-listify-<uid>/: that directory is owned by the
# Database Authority service, which refuses to start on unexpected entries.
STATE_DIR="/var/tmp/property-listify-parity-$(id -u)"
API_PID_FILE="$STATE_DIR/api.pid"
WEB_PID_FILE="$STATE_DIR/web.pid"
API_URL="http://127.0.0.1:${API_PORT}"
WEB_URL="http://127.0.0.1:${WEB_PORT}"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

LAUNCH_MODE="${PARITY_LAUNCH_MODE:-pilot}"
case "$LAUNCH_MODE" in
  pilot | reactivation) ;;
  *) echo "PARITY_LAUNCH_MODE must be pilot or reactivation" >&2; exit 2 ;;
esac
# Land is on in the local preview only (explicit opt-in for the API process).
LAND_MODE="${PARITY_LAND:-on}"
case "$LAND_MODE" in
  on | off) ;;
  *) echo "PARITY_LAND must be on or off" >&2; exit 2 ;;
esac
OUTBOX_FILE="$STATE_DIR/outbox.jsonl"

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
    # JWT_SECRET comes from the central local environment through the authority
    # helper (same validation as db:authority:status). Exported only into this
    # script's environment so the API inherits it; never printed or in argv.
    if ! alive "$API_PID_FILE"; then
      JWT_SECRET="$(cd "$ROOT" && pnpm exec tsx scripts/preview/parityLoginSecret.ts)" || {
        echo "api: login secret unavailable; see pnpm db:authority:status" >&2
        exit 1
      }
      export JWT_SECRET
    fi
    # Dev-only opt-ins, honoured by the server only for NODE_ENV=APP_ENV=development
    # against the local 127.0.0.1:3307 database. Names only; placeholder values.
    MODE_ENV=(PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW=1)
    if [ "$LAUNCH_MODE" = "pilot" ]; then
      MODE_ENV+=(PROPERTY_LISTIFY_LOCAL_PARITY_PILOT=1
        PAID_MVP_ENABLED_PRODUCT_KEYS=agent_launch_access,agency_launch_access,developer_launch_access
        PAID_MVP_RELEASE_ID=local-parity-pilot PAID_MVP_APPROVAL_REF=local-parity-only)
    fi
    if [ "$LAND_MODE" = "on" ]; then MODE_ENV+=(PROPERTY_LISTIFY_LOCAL_PARITY_LAND=1); fi
    start_one api "$API_PID_FILE" "$API_PORT" \
      env NODE_ENV=development APP_ENV=development SKIP_FRONTEND=true PORT="$API_PORT" \
      APP_URL="$WEB_URL" FRONTEND_URL="$WEB_URL" "${MODE_ENV[@]}" \
      pnpm exec tsx server/_core/start.ts || exit 1
    start_one web "$WEB_PID_FILE" "$WEB_PORT" \
      env VITE_API_URL="$API_URL" VITE_API_BASE_URL="$API_URL" VITE_DEPLOY_ENV=development \
      DEV_API_PROXY_TARGET="http://127.0.0.1:${API_PORT}" \
      pnpm exec vite --host 127.0.0.1 --port "$WEB_PORT" --strictPort || exit 1
    wait_for "$API_PORT" || echo "api not listening yet; see $STATE_DIR/api.log" >&2
    wait_for "$WEB_PORT" || echo "web not listening yet; see $STATE_DIR/web.log" >&2
    echo "API: $API_URL   WEB: $WEB_URL"
    ;;
  stop)
    # Only act when our own pid file says we started it. The pid file holds the
    # launcher; the listener is its child, found by port.
    for pair in "$API_PID_FILE:$API_PORT" "$WEB_PID_FILE:$WEB_PORT"; do
      f="${pair%%:*}"
      port="${pair##*:}"
      if alive "$f"; then
        pid="$(cat "$f")"
        lpid="$(ss -ltnp 2>/dev/null | grep ":$port " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -n 1)"
        [ -n "$lpid" ] && kill "$lpid" 2>/dev/null
        kill "$pid" 2>/dev/null
        echo "stopped launcher $pid listener ${lpid:-none}"
      fi
      rm -f "$f"
    done
    ;;
  status)
    for n in api web; do
      f="$STATE_DIR/$n.pid"
      if alive "$f"; then echo "$n running (pid $(cat "$f"))"; else echo "$n stopped"; fi
    done
    (cd "$ROOT" && pnpm exec tsx scripts/preview/parityLoginSecret.ts --status)
    echo "launch mode (for next start): $LAUNCH_MODE"
    echo "land (for next start): $LAND_MODE"
    echo "API: $API_URL   WEB: $WEB_URL"
    ;;
  outbox)
    # Local-only: newest captured auth link(s) for an address (this file only).
    if [ ! -f "$OUTBOX_FILE" ]; then echo "outbox is empty"; exit 0; fi
    python3 -I - "$OUTBOX_FILE" "${2:-}" <<'PY'
import json, sys
path, who = sys.argv[1], sys.argv[2].strip().lower()
rows = []
for line in open(path, encoding="utf8"):
    try:
        r = json.loads(line)
    except ValueError:
        continue
    if not who or str(r.get("to", "")).lower() == who:
        rows.append(r)
if not rows:
    print("no captured message" + (" for " + who if who else ""))
for r in rows[-3:]:
    print(r.get("capturedAt"), r.get("kind"), r.get("to"))
    print("  " + str(r.get("url")))
PY
    ;;
  *)
    echo "usage: $0 start|stop|status|outbox [email]" >&2
    exit 2
    ;;
esac
