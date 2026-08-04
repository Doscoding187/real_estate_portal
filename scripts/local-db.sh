#!/usr/bin/env bash
set -euo pipefail

# Database Authority service-only lifecycle.
#
# This file deliberately does not know an application database, application
# account, migration, seed, Docker project, or destruction operation. It owns
# only one native MySQL process and one private service directory.

readonly HOST=127.0.0.1
readonly PORT=3307
readonly SERVICE_USER_ID="$(id -u)"
readonly TMP_PARENT=/var/tmp
readonly SERVICE_UID_ROOT="$TMP_PARENT/property-listify-$SERVICE_USER_ID"
readonly SERVICE_USER_HOME="$(getent passwd "$SERVICE_USER_ID" | cut -d: -f6 || true)"
readonly LEGACY_SERVICE_ROOT="${SERVICE_USER_HOME:+$SERVICE_USER_HOME/.config/property-listify/mysql-3307}"
readonly SERVICE_ROOT="$SERVICE_UID_ROOT/mysql-3307"
readonly DATA_DIR="$SERVICE_ROOT/data"
readonly SOCKET_PATH="$SERVICE_ROOT/mysql.sock"
readonly LOCK_FILE="$SERVICE_ROOT/mysql.sock.lock"
readonly PID_FILE="$SERVICE_ROOT/mysqld.pid"
readonly LOG_FILE="$SERVICE_ROOT/mysqld.log"
readonly IDENTITY_FILE="$SERVICE_ROOT/service.identity"
readonly SERVICE_FINGERPRINT_INPUT="$HOST:$PORT:$SERVICE_ROOT:$DATA_DIR"

umask 077

die() {
  echo "Database Authority service refused: $*" >&2
  exit 1
}

assert_native_mode() {
  case "${LISTIFY_LOCAL_DB_MODE:-native}" in
    native) ;;
    *) die "only the pinned native service mode is supported; Docker and automatic mode are not part of this workflow" ;;
  esac
}

assert_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command is unavailable: $1"
}

assert_not_symlink() {
  [ ! -L "$1" ] || die "refusing symlinked service state: $1"
}

assert_owned_directory() {
  local path="$1"
  [ -d "$path" ] || die "service state directory is not a directory: $path"
  assert_not_symlink "$path"
  [ "$(stat -c '%u' "$path")" = "$SERVICE_USER_ID" ] || die "service state is not owned by the current user: $path"
  [ "$(stat -c '%a' "$path")" = "700" ] || die "service state directory must have mode 0700: $path"
}

assert_non_root_user() {
  [ "$SERVICE_USER_ID" != "0" ] || die "root execution is prohibited; run the isolated service as the current unprivileged user"
}

assert_shared_tmp_parent() {
  [ -d "$TMP_PARENT" ] || die "shared temporary parent is not a directory: $TMP_PARENT"
  assert_not_symlink "$TMP_PARENT"
  [ "$(stat -c '%u' "$TMP_PARENT")" = "0" ] || die "shared temporary parent is not root-owned: $TMP_PARENT"
  [ "$(stat -c '%a' "$TMP_PARENT")" = "1777" ] || die "shared temporary parent must have mode 1777: $TMP_PARENT"
}

assert_expected_direct_children() {
  local directory="$1"
  shift
  local child name expected allowed
  while IFS= read -r -d '' child; do
    name="${child##*/}"
    allowed=false
    for expected in "$@"; do
      if [ "$name" = "$expected" ]; then
        allowed=true
        break
      fi
    done
    [ "$allowed" = true ] || die "unexpected service state entry: $child"
  done < <(find -P "$directory" -mindepth 1 -maxdepth 1 -print0)
}

assert_service_artifacts_are_not_symlinked() {
  local path
  for path in "$DATA_DIR" "$SOCKET_PATH" "$LOCK_FILE" "$PID_FILE" "$LOG_FILE" "$IDENTITY_FILE"; do
    if [ -e "$path" ] || [ -L "$path" ]; then
      assert_not_symlink "$path"
    fi
  done
}

ensure_service_root() {
  assert_non_root_user
  assert_shared_tmp_parent
  if [ -e "$SERVICE_UID_ROOT" ] || [ -L "$SERVICE_UID_ROOT" ]; then
    assert_owned_directory "$SERVICE_UID_ROOT"
  else
    mkdir -- "$SERVICE_UID_ROOT"
    chmod 700 "$SERVICE_UID_ROOT"
  fi
  assert_owned_directory "$SERVICE_UID_ROOT"
  assert_expected_direct_children "$SERVICE_UID_ROOT" "mysql-3307"
  if [ -e "$SERVICE_ROOT" ] || [ -L "$SERVICE_ROOT" ]; then
    assert_owned_directory "$SERVICE_ROOT"
  else
    mkdir -- "$SERVICE_ROOT"
    chmod 700 "$SERVICE_ROOT"
  fi
  assert_owned_directory "$SERVICE_ROOT"
  assert_expected_direct_children "$SERVICE_ROOT" "data" "mysql.sock" "mysql.sock.lock" "mysqld.pid" "mysqld.log" "service.identity"
  assert_service_artifacts_are_not_symlinked
}

report_legacy_residue() {
  if [ -n "$LEGACY_SERVICE_ROOT" ] && { [ -e "$LEGACY_SERVICE_ROOT" ] || [ -L "$LEGACY_SERVICE_ROOT" ]; }; then
    echo "Legacy home service residue is inactive and never adopted: $LEGACY_SERVICE_ROOT" >&2
  fi
}

assert_data_state() {
  if [ -e "$DATA_DIR" ] || [ -L "$DATA_DIR" ]; then
    assert_owned_directory "$DATA_DIR"
    [ -d "$DATA_DIR/mysql" ] || die "existing data directory is not an initialized MySQL service; the exact pre-initialization path must be removed by an approved cleanup packet before retry: $DATA_DIR"
    assert_not_symlink "$DATA_DIR/mysql"
    [ -f "$IDENTITY_FILE" ] || die "initialized data state has no exact service identity marker; state is ambiguous: $DATA_DIR"
    assert_not_symlink "$IDENTITY_FILE"
    [ "$(stat -c '%u' "$IDENTITY_FILE")" = "$SERVICE_USER_ID" ] || die "service identity is not owned by the current user: $IDENTITY_FILE"
    [ "$(stat -c '%a' "$IDENTITY_FILE")" = "600" ] || die "service identity must have mode 0600: $IDENTITY_FILE"
    [ "$(tr -d '[:space:]' < "$IDENTITY_FILE")" = "$(service_fingerprint)" ] || die "service identity does not match the approved service fingerprint: $IDENTITY_FILE"
  fi
}

service_fingerprint() {
  printf '%s' "$SERVICE_FINGERPRINT_INPUT" | sha256sum | awk '{print $1}'
}

read_service_pid() {
  [ -f "$PID_FILE" ] || return 1
  assert_not_symlink "$PID_FILE"
  local pid
  pid="$(tr -d '[:space:]' < "$PID_FILE")"
  [[ "$pid" =~ ^[0-9]+$ ]] || die "service PID file is malformed: $PID_FILE"
  printf '%s\n' "$pid"
}

read_socket_lock_pid() {
  awk '
    NR == 1 { value = $0; next }
    { invalid = 1 }
    END {
      if (invalid || value !~ /^[0-9]+$/) exit 1
      print value
    }
  ' "$LOCK_FILE"
}

pid_matches_service() {
  local pid="$1"
  [ -d "/proc/$pid" ] || return 1
  [ "$(stat -c '%u' "/proc/$pid")" = "$SERVICE_USER_ID" ] || return 1
  [ "$(readlink -f "/proc/$pid/exe")" = /usr/sbin/mysqld ] || return 1
  local args
  args="$(ps -p "$pid" -o args=)"
  [[ "$args" == *"--datadir=$DATA_DIR"* ]] || return 1
  [[ "$args" == *"--socket=$SOCKET_PATH"* ]] || return 1
  [[ "$args" == *"--port=$PORT"* ]] || return 1
  [[ "$args" == *"--bind-address=$HOST"* ]] || return 1
  [[ "$args" == *"--pid-file=$PID_FILE"* ]] || return 1
}

service_processes_using_datadir() {
  local pid args
  while read -r pid args; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    [ -d "/proc/$pid" ] || continue
    [ "$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)" = /usr/sbin/mysqld ] || continue
    [[ "$args" == *"--datadir=$DATA_DIR"* ]] || continue
    printf '%s\n' "$pid"
  done < <(ps -eo pid=,args=)
}

assert_socket_lock_state() {
  local expected_pid="${1:-}"
  if [ ! -e "$LOCK_FILE" ] && [ ! -L "$LOCK_FILE" ]; then
    [ -z "$expected_pid" ] || die "running service has no exact MySQL socket lock: $LOCK_FILE"
    return 0
  fi
  [ -n "$expected_pid" ] || die "socket lock exists without an exact running service PID: $LOCK_FILE"
  [ -f "$LOCK_FILE" ] || die "socket lock is not a regular file: $LOCK_FILE"
  assert_not_symlink "$LOCK_FILE"
  [ "$(stat -c '%u' "$LOCK_FILE")" = "$SERVICE_USER_ID" ] || die "socket lock is not owned by the current user: $LOCK_FILE"
  [ "$(stat -c '%a' "$LOCK_FILE")" = "600" ] || die "socket lock must have mode 0600: $LOCK_FILE"
  [ -S "$SOCKET_PATH" ] || die "socket lock has no exact canonical Unix socket: $SOCKET_PATH"
  assert_not_symlink "$SOCKET_PATH"
  local lock_pid
  lock_pid="$(read_socket_lock_pid 2>/dev/null || true)"
  [[ "$lock_pid" =~ ^[0-9]+$ ]] || die "socket lock contains a malformed PID: $LOCK_FILE"
  [ "$lock_pid" = "$expected_pid" ] || die "socket lock PID does not match the exact service PID: $LOCK_FILE"
  pid_matches_service "$lock_pid" || die "socket lock PID does not match the exact running service: $LOCK_FILE"
}

assert_known_process_or_stopped() {
  assert_command ps
  local pid
  if pid="$(read_service_pid)"; then
    [ -d "/proc/$pid" ] || die "service PID file is stale; preserved evidence requires review: $PID_FILE"
    pid_matches_service "$pid" || die "service PID belongs to an unexpected process; no process was terminated"
    [ -S "$SOCKET_PATH" ] || die "running service has no exact canonical Unix socket: $SOCKET_PATH"
    assert_data_state
    [ -d "$DATA_DIR/mysql" ] || die "running service has no initialized exact data directory: $DATA_DIR"
    assert_socket_lock_state "$pid"
    return 0
  fi
  if [ -e "$SOCKET_PATH" ] || [ -L "$SOCKET_PATH" ]; then
    die "canonical Unix socket exists without an exact running service PID: $SOCKET_PATH"
  fi
  if [ -e "$LOCK_FILE" ] || [ -L "$LOCK_FILE" ]; then
    die "socket lock exists without an exact service PID file: $LOCK_FILE"
  fi
  local service_pids
  service_pids="$(service_processes_using_datadir)"
  if [ -n "$service_pids" ]; then
    die "approved mysqld process exists without an exact PID file: $service_pids"
  fi
  if port_has_listener; then
    die "port $PORT is occupied without an exact running service identity"
  fi
  return 0
}

port_has_listener() {
  [ -n "$(ss -H -ltn "sport = :$PORT" 2>/dev/null || true)" ]
}

assert_port_free() {
  if port_has_listener; then
    die "port $PORT remains occupied after graceful shutdown; no process was terminated"
  fi
}

tcp_ping() {
  mysqladmin \
    --no-defaults \
    --protocol=TCP \
    --host="$HOST" \
    --port="$PORT" \
    --user=root \
    --skip-password \
    --silent \
    ping >/dev/null 2>&1
}

assert_tcp_owner() {
  assert_known_process_or_stopped
  if tcp_ping; then
    local pid
    pid="$(read_service_pid 2>/dev/null || true)"
    [ -n "$pid" ] && pid_matches_service "$pid" || die "port $PORT is occupied by an unowned service; no process was terminated"
  fi
}

native_initialize_if_needed() {
  assert_command mysqld
  ensure_service_root
  assert_data_state
  if [ -d "$DATA_DIR/mysql" ]; then
    return 0
  fi
  if [ -e "$IDENTITY_FILE" ] || [ -L "$IDENTITY_FILE" ]; then
    die "service identity exists without an initialized data directory; state is ambiguous: $IDENTITY_FILE"
  fi
  mysqld \
    --no-defaults \
    --initialize-insecure \
    --datadir="$DATA_DIR" \
    --log-error="$LOG_FILE"
  [ -d "$DATA_DIR" ] || die "MySQL initialization completed without creating the exact data directory: $DATA_DIR"
  chmod 700 "$DATA_DIR"
  assert_owned_directory "$DATA_DIR"
  printf '%s\n' "$(service_fingerprint)" > "$IDENTITY_FILE"
  chmod 600 "$IDENTITY_FILE"
  assert_data_state
}

wait_for_tcp() {
  assert_command mysqladmin
  report_legacy_residue
  ensure_service_root
  assert_data_state
  assert_known_process_or_stopped
  for _ in $(seq 1 90); do
    if tcp_ping; then
      assert_tcp_owner
      echo "Database Authority MySQL service is available on $HOST:$PORT."
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for the Database Authority MySQL service on $HOST:$PORT." >&2
  tail -80 "$LOG_FILE" >&2 2>/dev/null || true
  return 1
}

start() {
  assert_native_mode
  assert_command mysqld
  assert_command mysqladmin
  report_legacy_residue
  ensure_service_root
  assert_data_state
  assert_known_process_or_stopped
  if tcp_ping; then
    assert_tcp_owner
    echo "Database Authority MySQL service is already available on $HOST:$PORT."
    return 0
  fi
  native_initialize_if_needed
  mysqld \
    --no-defaults \
    --daemonize \
    --datadir="$DATA_DIR" \
    --socket="$SOCKET_PATH" \
    --pid-file="$PID_FILE" \
    --log-error="$LOG_FILE" \
    --bind-address="$HOST" \
    --port="$PORT" \
    --mysqlx=0
  wait_for_tcp
}

status() {
  assert_native_mode
  report_legacy_residue
  ensure_service_root
  assert_known_process_or_stopped
  echo "Service host: $HOST"
  echo "Service port: $PORT"
  echo "Service UID directory: $SERVICE_UID_ROOT"
  echo "Service directory: $SERVICE_ROOT"
  echo "Service fingerprint: $(service_fingerprint)"
  if tcp_ping; then
    assert_tcp_owner
    echo "Service state: available"
  elif [ -d "$DATA_DIR/mysql" ]; then
    echo "Service state: stopped"
  else
    echo "Service state: uninitialized"
  fi
}

stop() {
  assert_native_mode
  assert_command mysqladmin
  assert_command ss
  report_legacy_residue
  ensure_service_root
  assert_known_process_or_stopped
  local pid
  pid="$(read_service_pid 2>/dev/null || true)"
  if [ -z "$pid" ]; then
    if port_has_listener; then
      die "port $PORT is occupied without an owned PID; no process was terminated"
    fi
    echo "Database Authority MySQL service is already stopped."
    return 0
  fi
  [ -d "/proc/$pid" ] || die "service PID file became stale; preserved evidence requires review: $PID_FILE"
  pid_matches_service "$pid" || die "refusing to stop a process that does not match the pinned service"
  assert_socket_lock_state "$pid"
  local mysqladmin
  mysqladmin="$(command -v mysqladmin)"
  [ -x "$mysqladmin" ] || die "resolved mysqladmin is not executable: $mysqladmin"
  if ! "$mysqladmin" \
    --no-defaults \
    --protocol=socket \
    --socket="$SOCKET_PATH" \
    --user=root \
    --connect-timeout=5 \
    --shutdown-timeout=30 \
    shutdown; then
    die "graceful MySQL shutdown failed; no signal fallback was attempted"
  fi
  for _ in $(seq 1 30); do
    if [ ! -d "/proc/$pid" ]; then
      [ ! -e "$PID_FILE" ] && [ ! -L "$PID_FILE" ] || die "service PID file remained after graceful shutdown: $PID_FILE"
      assert_port_free
      echo "Database Authority MySQL service stopped via the exact Unix socket within the 30-second bound."
      return 0
    fi
    sleep 1
  done
  die "service did not stop within the 30-second bound; no force-kill or broad termination was attempted"
}

retired() {
  die "direct database mutation is retired; use the exact Database Authority worktree lifecycle and adapter commands"
}

case "${1:-help}" in
  start) start ;;
  wait) wait_for_tcp ;;
  status) status ;;
  stop) stop ;;
  destroy|test:rebuild|listing-performance-e2e:reset|listing-performance-e2e:drop|prospect-journey-e2e:reset|prospect-journey-e2e:drop) retired ;;
  *)
    cat <<EOF
Usage: bash scripts/local-db.sh <start|wait|status|stop>

This is the Database Authority service-only workflow. It binds only to
$HOST:$PORT and stores native MySQL state only under the authority-derived
$SERVICE_ROOT beneath $TMP_PARENT. A previous home-directory path is reported
as inactive residue and is never adopted or deleted by this command.
It never creates an application database, account, migration, or seed.
Set LISTIFY_LOCAL_DB_MODE=native explicitly if a mode is required.
Database creation, migration, reference data, scenario data, and disposal
must use the exact owned worktree commands.
EOF
    ;;
esac
