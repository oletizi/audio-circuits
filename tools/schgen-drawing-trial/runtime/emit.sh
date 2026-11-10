#!/usr/bin/env bash
# Run one SchGen generated-program inside schgen-runtime, under enforced limits.
#
#   emit.sh PROGRAM.py OUT_DIR
#
# Writes OUT_DIR/emitter.log always, and OUT_DIR/page.kicad_sch on success.
# Exit 0 means success. Any other exit leaves the original traceback in the
# log and, for a limit, a final line `LIMIT: <name>`:
#   wall-time     this script's own clock ran out (SCHGEN_EMIT_WALL_SECONDS,
#                 300 unless set); the container is killed and removed
#   output-bytes  a tmpfs (/out 50m, /tmp 64m) filled, which run_emitter.py
#                 reports; or the container's stdout/stderr reached the 8 MiB
#                 log cap, which this script reports
#   memory        the kernel OOM-killed the container (4g, no swap)
#   pids          the 256-process limit refused a fork; run_emitter.py reports it
#
# The container is created WITHOUT --rm, deliberately: an OOM kill can only be
# read from `docker inspect .State.OOMKilled` while the exited container still
# exists, and --rm has the daemon remove it on exit. Removal is instead this
# script's job, done by the EXIT trap on every path, including success.
#
# On success the sheet is copied out while run_emitter.py holds the container
# open, with `docker exec ... cat` rather than `docker cp`, which cannot read
# a tmpfs mount; then SIGUSR1 releases the container.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
IMAGE="schgen-runtime:0707520c"
WALL_SECONDS="${SCHGEN_EMIT_WALL_SECONDS:-300}"
LOG_CAP_BYTES=$((8 * 1024 * 1024))
KICAD_SYMBOL_DIR="${KICAD_SYMBOL_DIR:-/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols}"
READY_MARKER="SCHGEN-EMIT: sheet written, holding for copy"

if [ "$#" -ne 2 ]; then
  echo "usage: emit.sh PROGRAM.py OUT_DIR" >&2
  exit 2
fi
if [ ! -f "$1" ]; then
  echo "emit.sh: program $1 does not exist" >&2
  exit 2
fi
if [ ! -d "$KICAD_SYMBOL_DIR" ]; then
  echo "emit.sh: KiCad symbol directory $KICAD_SYMBOL_DIR does not exist; SchGen reads" \
    "every symbol it places from KiCad 10.0.5's libraries, so there is nothing to run" \
    "against without it (set KICAD_SYMBOL_DIR)" >&2
  exit 2
fi
case "$WALL_SECONDS" in
  ''|*[!0-9]*)
    echo "emit.sh: SCHGEN_EMIT_WALL_SECONDS must be a whole number of seconds, got '$WALL_SECONDS'" >&2
    exit 2
    ;;
esac

PROGRAM="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUT_DIR="$2"
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"
LOG="$OUT_DIR/emitter.log"
SHEET="$OUT_DIR/page.kicad_sch"
rm -f "$SHEET"
: > "$LOG"

NAME="schgen-emit-$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/schgen-emit.XXXXXX")"
STATUS_FILE="$WORK_DIR/status"
GROUP_PID_FILE="$WORK_DIR/group.pid"

# Every line this script writes into the log goes through log_line, which
# first ends the program's last line if it left one unterminated; otherwise
# `LIMIT: <name>` would be glued onto it and the final-line contract broken.
log_line() {
  if [ -s "$LOG" ] && [ -n "$(tail -c 1 "$LOG")" ]; then
    printf '\n' >> "$LOG"
  fi
  printf '%s\n' "$1" >> "$LOG"
}

limit_line() {
  log_line "LIMIT: $1"
}

# Kills the container, then the background `docker run` subshell, and waits
# for both, so nothing is left to write the status file after it is removed.
remove_container() {
  docker kill "$NAME" > /dev/null 2>&1 || true
  if [ -s "$GROUP_PID_FILE" ]; then
    kill "$(cat "$GROUP_PID_FILE")" 2> /dev/null || true
  fi
  wait 2> /dev/null || true
  docker rm -f "$NAME" > /dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap remove_container EXIT

# The container's output is the one stream that reaches a host file, so it is
# cut at LOG_CAP_BYTES by cap_stream.py on its way into the log (not `head
# -c`, which buffers and so withholds the ready marker); the loop below
# sees a log at the cap and stops the container as output-bytes. A polled size
# check alone is not enough: a print loop wrote 54 GB in about two minutes.
{
  sh -c 'echo "$PPID"' > "$GROUP_PID_FILE"
  run_status=0
  docker run --name "$NAME" \
    --network none --read-only \
    --cpus 2 --memory 4g --memory-swap 4g --pids-limit 256 \
    --tmpfs /out:size=50m --tmpfs /tmp:size=64m \
    --mount "type=bind,source=$KICAD_SYMBOL_DIR,target=/usr/share/kicad/symbols,readonly" \
    --mount "type=bind,source=$PROGRAM,target=/in/program.py,readonly" \
    "$IMAGE" python /trial/fixes/run_emitter.py /in/program.py /out/page.kicad_sch \
    2>&1 || run_status=$?
  echo "$run_status" > "$STATUS_FILE"
} | python3 "$HERE/cap_stream.py" "$LOG_CAP_BYTES" > "$LOG" &
STREAM_PID=$!

log_capped() {
  [ "$(wc -c < "$LOG")" -ge "$LOG_CAP_BYTES" ]
}

stop_for_output_bytes() {
  docker kill "$NAME" > /dev/null 2>&1 || true
  wait "$STREAM_PID" 2> /dev/null || true
  rm -f "$SHEET"
  limit_line output-bytes
  exit 1
}

deadline=$((SECONDS + WALL_SECONDS))
copied=0
while kill -0 "$STREAM_PID" 2> /dev/null; do
  if log_capped; then
    stop_for_output_bytes
  fi
  if [ "$copied" -eq 0 ] && grep -qxF "$READY_MARKER" "$LOG"; then
    # Not `docker cp`: it reads the container's filesystem layers and cannot
    # see a tmpfs mount ("Could not find the file /out/page.kicad_sch"), so
    # the sheet is read from inside the running container instead.
    if ! docker exec "$NAME" cat /out/page.kicad_sch > "$SHEET" 2>> "$LOG"; then
      rm -f "$SHEET"
      log_line "emit.sh: run_emitter.py reported the sheet written but it could not be read out of $NAME"
      exit 1
    fi
    copied=1
    if ! docker kill --signal USR1 "$NAME" > /dev/null 2>> "$LOG"; then
      rm -f "$SHEET"
      log_line "emit.sh: the sheet was read out of $NAME but SIGUSR1 could not be sent to release it, so the run's exit status is unknown and the sheet is not kept"
      exit 1
    fi
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    docker kill "$NAME" > /dev/null 2>&1 || true
    docker rm -f "$NAME" > /dev/null 2>&1 || true
    wait "$STREAM_PID" 2> /dev/null || true
    rm -f "$SHEET"
    limit_line wall-time
    exit 124
  fi
  sleep 0.2
done
wait "$STREAM_PID" 2> /dev/null || true

if log_capped; then
  stop_for_output_bytes
fi
status="$(cat "$STATUS_FILE" 2> /dev/null || true)"
if [ -z "$status" ]; then
  log_line "emit.sh: the log stream ended without the container's exit status"
  rm -f "$SHEET"
  exit 1
fi

oom="$(docker inspect --format '{{.State.OOMKilled}}' "$NAME" 2> /dev/null || echo unknown)"
if [ "$oom" = "true" ]; then
  rm -f "$SHEET"
  limit_line memory
  exit 137
fi
if [ "$oom" = "unknown" ]; then
  log_line "emit.sh: could not inspect container $NAME after it exited, so an OOM kill cannot be ruled out"
  rm -f "$SHEET"
  exit 125
fi

if [ "$status" -ne 0 ]; then
  rm -f "$SHEET"
  exit "$status"
fi
if [ "$copied" -ne 1 ] || [ ! -f "$SHEET" ]; then
  log_line "emit.sh: the container exited 0 but the sheet was never copied out of it"
  rm -f "$SHEET"
  exit 1
fi
exit 0
