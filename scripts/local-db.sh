#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.local-db.yml"

PORT="${LISTIFY_LOCAL_DB_PORT:-3307}"
HOST="${LISTIFY_LOCAL_DB_HOST:-127.0.0.1}"
LOCAL_DIR="${LISTIFY_LOCAL_DB_DIR:-/tmp/listify-mysql-3307}"
DATA_DIR="$LOCAL_DIR/data"
SOCKET="$LOCAL_DIR/mysql.sock"
PID_FILE="$LOCAL_DIR/mysqld.pid"
LOG_FILE="$LOCAL_DIR/mysqld.log"

ROOT_PASSWORD="${LISTIFY_LOCAL_DB_ROOT_PASSWORD:-listify_root_password}"
APP_PASSWORD="${LISTIFY_LOCAL_DB_APP_PASSWORD:-listify_app_password}"
TEST_PASSWORD="${LISTIFY_LOCAL_DB_TEST_PASSWORD:-listify_test_password}"

has_docker_compose() {
  command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1
}

use_docker() {
  case "${LISTIFY_LOCAL_DB_MODE:-auto}" in
    docker) return 0 ;;
    native) return 1 ;;
    auto) has_docker_compose ;;
    *)
      echo "Unknown LISTIFY_LOCAL_DB_MODE=${LISTIFY_LOCAL_DB_MODE}. Use auto, docker, or native." >&2
      exit 1
      ;;
  esac
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

tcp_ping() {
  mysqladmin \
    --protocol=TCP \
    -h"$HOST" \
    -P"$PORT" \
    -ulistify_app \
    -p"$APP_PASSWORD" \
    --silent \
    ping >/dev/null 2>&1
}

native_root_args() {
  if mysql --protocol=SOCKET --socket="$SOCKET" -uroot -e "SELECT 1" >/dev/null 2>&1; then
    printf '%s\n' "--protocol=SOCKET" "--socket=$SOCKET" "-uroot"
    return
  fi

  printf '%s\n' "--protocol=SOCKET" "--socket=$SOCKET" "-uroot" "-p$ROOT_PASSWORD"
}

native_wait_for_root() {
  for _ in $(seq 1 90); do
    if mysql --protocol=SOCKET --socket="$SOCKET" -uroot -e "SELECT 1" >/dev/null 2>&1; then
      return 0
    fi
    if mysql --protocol=SOCKET --socket="$SOCKET" -uroot -p"$ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for native MySQL root socket. Last log lines:" >&2
  tail -80 "$LOG_FILE" >&2 || true
  return 1
}

native_ensure_schema() {
  mapfile -t root_args < <(native_root_args)

  mysql "${root_args[@]}" <<SQL
CREATE DATABASE IF NOT EXISTS listify_local;
CREATE DATABASE IF NOT EXISTS listify_test;

CREATE USER IF NOT EXISTS 'listify_app'@'127.0.0.1' IDENTIFIED BY '$APP_PASSWORD';
CREATE USER IF NOT EXISTS 'listify_app'@'localhost' IDENTIFIED BY '$APP_PASSWORD';
CREATE USER IF NOT EXISTS 'listify_test'@'127.0.0.1' IDENTIFIED BY '$TEST_PASSWORD';
CREATE USER IF NOT EXISTS 'listify_test'@'localhost' IDENTIFIED BY '$TEST_PASSWORD';

ALTER USER 'listify_app'@'127.0.0.1' IDENTIFIED BY '$APP_PASSWORD';
ALTER USER 'listify_app'@'localhost' IDENTIFIED BY '$APP_PASSWORD';
ALTER USER 'listify_test'@'127.0.0.1' IDENTIFIED BY '$TEST_PASSWORD';
ALTER USER 'listify_test'@'localhost' IDENTIFIED BY '$TEST_PASSWORD';

GRANT ALL PRIVILEGES ON listify_local.* TO 'listify_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON listify_local.* TO 'listify_app'@'localhost';
GRANT ALL PRIVILEGES ON listify_test.* TO 'listify_test'@'127.0.0.1';
GRANT ALL PRIVILEGES ON listify_test.* TO 'listify_test'@'localhost';

ALTER USER 'root'@'localhost' IDENTIFIED BY '$ROOT_PASSWORD';
FLUSH PRIVILEGES;
SQL
}

native_initialize_if_needed() {
  mkdir -p "$LOCAL_DIR"

  if [ -d "$DATA_DIR/mysql" ]; then
    return 0
  fi

  if [ -d "$DATA_DIR" ]; then
    if [ -n "$(find "$DATA_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
      echo "Native MySQL data directory exists but is not initialized: $DATA_DIR" >&2
      echo "Run 'pnpm db:local:destroy' if this disposable database can be removed." >&2
      exit 1
    fi
    rmdir "$DATA_DIR"
  fi

  mysqld --no-defaults --initialize-insecure --datadir="$DATA_DIR" --log-error="$LOG_FILE"
}

native_start() {
  if tcp_ping; then
    echo "Local MySQL is already healthy on $HOST:$PORT."
    return 0
  fi

  native_initialize_if_needed

  mysqld \
    --no-defaults \
    --daemonize \
    --datadir="$DATA_DIR" \
    --socket="$SOCKET" \
    --pid-file="$PID_FILE" \
    --log-error="$LOG_FILE" \
    --bind-address="$HOST" \
    --port="$PORT" \
    --mysqlx=0

  native_wait_for_root
  native_ensure_schema
}

native_stop() {
  if [ -f "$PID_FILE" ]; then
    pid="$(cat "$PID_FILE")"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill -TERM "$pid" >/dev/null 2>&1 || true
      for _ in $(seq 1 30); do
        kill -0 "$pid" >/dev/null 2>&1 || break
        sleep 1
      done
    fi
  fi

  if tcp_ping; then
    mapfile -t root_args < <(native_root_args)
    mysqladmin "${root_args[@]}" shutdown >/dev/null 2>&1 || true
  fi
}

wait_for_tcp() {
  for _ in $(seq 1 90); do
    if tcp_ping; then
      echo "Local MySQL is healthy on $HOST:$PORT."
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for local MySQL on $HOST:$PORT." >&2
  return 1
}

start() {
  if use_docker; then
    compose up -d mysql-local
  else
    native_start
  fi
  wait_for_tcp
}

stop() {
  if use_docker; then
    compose down
  else
    native_stop
  fi
}

destroy() {
  if use_docker; then
    compose down -v
  else
    native_stop
    rm -rf "$LOCAL_DIR"
  fi
}

case "${1:-help}" in
  start) start ;;
  wait) wait_for_tcp ;;
  status) wait_for_tcp ;;
  stop) stop ;;
  destroy) destroy ;;
  *)
    cat <<EOF
Usage: bash scripts/local-db.sh <start|wait|status|stop|destroy>

Environment overrides:
  LISTIFY_LOCAL_DB_MODE=auto|docker|native
  LISTIFY_LOCAL_DB_PORT=3307
  LISTIFY_LOCAL_DB_DIR=/tmp/listify-mysql-3307
EOF
    ;;
esac
