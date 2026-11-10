#!/usr/bin/env bash
# Every board and attempt of the SchGen drawing trial, in the fixed order.
#
#   bash tools/schgen-drawing-trial/run_all.sh [--requests-only]
#
# Order: the boards as board-info.ts --list prints TRIAL_BOARDS, and within
# each board attempts 1, 2, 3 (seeds 42, 43, 44).
#
# --requests-only makes each board's request directory (request, fidelity,
# prompt) and stops; it needs no GPU and no endpoint.
#
# Safe under nohup and safe to relaunch at any point:
#   - an attempt with manifest.json is complete and is skipped;
#   - any other attempt is handed to run_attempt.py, which never regenerates
#     a complete saved response and moves an incomplete one aside to
#     interrupted/ before generating it once more with the same seed;
#   - nothing here truncates or deletes a file; output goes to stdout, which
#     the caller redirects (nohup bash run_all.sh > run.log 2>&1 &).
# It stops at the first attempt that exits non-zero (3 is a token-identity
# disagreement, 4 a further regeneration that needs the operator); the next
# launch resumes there. It never passes --allow-regeneration: a resend beyond
# the one automatic regeneration is run by hand with run_attempt.py
# --allow-regeneration REASON, which is recorded.
#
# Generation reads TRIAL_ENDPOINT, TRIAL_MERGED_MANIFEST_SHA256,
# TRIAL_VLLM_VERSION and TRIAL_VLLM_IMAGE_DIGEST (run_attempt.py refuses when
# one is unset and a generation is needed). kicad-cli 10.0.5, magick, docker
# with schgen-runtime:0707520c at runtime/IMAGE_DIGEST, bun, and the host
# venv are required; each absence stops the run before any attempt.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
EXEC_DIR="$REPO/docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution"
PYTHON="$HERE/.venv/bin/python"

requests_only=0
case "${1:-}" in
  "") ;;
  --requests-only) requests_only=1 ;;
  *) echo "usage: run_all.sh [--requests-only]" >&2; exit 2 ;;
esac

stamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }

for tool in bun docker; do
  if ! command -v "$tool" > /dev/null 2>&1; then
    echo "run_all.sh: $tool is not on PATH; the run needs it and has no substitute" >&2
    exit 2
  fi
done
if [ ! -x "$PYTHON" ]; then
  echo "run_all.sh: $PYTHON is missing; create it with python3 -m venv $HERE/.venv and" \
    "install $HERE/host-requirements.txt into it" >&2
  exit 2
fi
cd "$REPO"
# On its own line so set -e stops the run when kicad.ts refuses: a failing
# substitution inside an echo argument does not.
kicad_version="$(bun "$HERE/kicad.ts" version)"
echo "$(stamp) host tools: kicad-cli $kicad_version, magick present"

boards="$(bun "$HERE/board-info.ts" --list)"
for board in $boards; do
  echo "$(stamp) $board: request directory"
  "$PYTHON" "$HERE/board_request.py" --exec-dir "$EXEC_DIR" "$board"
done
if [ "$requests_only" -eq 1 ]; then
  echo "$(stamp) requests only: done"
  exit 0
fi

for board in $boards; do
  for attempt in 1 2 3; do
    dir="$EXEC_DIR/$board/attempt-$attempt"
    if [ -f "$dir/manifest.json" ]; then
      echo "$(stamp) $board attempt $attempt: complete, skipped"
      continue
    fi
    echo "$(stamp) $board attempt $attempt: running"
    status=0
    "$PYTHON" "$HERE/run_attempt.py" --exec-dir "$EXEC_DIR" "$board" "$attempt" || status=$?
    if [ "$status" -ne 0 ]; then
      echo "$(stamp) $board attempt $attempt: run_attempt.py exited $status; stopping. Relaunch resumes here." >&2
      exit "$status"
    fi
  done
done
echo "$(stamp) all attempts complete"
