#!/usr/bin/env bash
# Negative controls for the phase-2 amendment to check_nocode in verify.sh.
# Each case creates one probe file, runs `verify.sh nocode`, and deletes the probe.
# Exits non-zero if any case does not behave as stated.
# Usage: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash nocode-amendment-controls.sh

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
VERIFY="$SCRIPT_DIR/verify.sh"

if [ -z "${PEDALS_REPO:-}" ]; then
  echo "nocode-amendment-controls.sh refuses to run: PEDALS_REPO is not set (verify.sh needs it)." >&2
  exit 2
fi

CURRENT_PROBE=""
trap '[ -z "$CURRENT_PROBE" ] || rm -f "$CURRENT_PROBE"' EXIT

failures=0

# run_case <probe path relative to repo root> <expected: PASS|FAIL> <required substring or empty>
run_case() {
  local rel="$1" expect="$2" needle="$3" out rc
  CURRENT_PROBE="$ROOT/$rel"
  if [ -e "$CURRENT_PROBE" ]; then
    echo "REFUSE: $rel already exists; not overwriting it" >&2
    CURRENT_PROBE=""
    failures=$((failures+1))
    return
  fi
  echo "probe" > "$CURRENT_PROBE"
  out=$(bash "$VERIFY" nocode)
  rc=$?
  rm -f "$CURRENT_PROBE"
  CURRENT_PROBE=""
  echo "case $rel (expect $expect): $out"
  case "$expect" in
    PASS) [ $rc -eq 0 ] && [[ "$out" == "PASS nocode"* ]] || { echo "  WRONG: expected PASS"; failures=$((failures+1)); return; } ;;
    FAIL) [ $rc -ne 0 ] && [[ "$out" == "FAIL nocode"* ]] || { echo "  WRONG: expected FAIL"; failures=$((failures+1)); return; } ;;
  esac
  if [ -n "$needle" ] && [[ "$out" != *"$needle"* ]]; then
    echo "  WRONG: output lacks '$needle'"
    failures=$((failures+1))
  fi
}

run_case circuits/h7-platform/probe.ts PASS "phase-2 amendment"
run_case circuits/h7-platform/probe.py FAIL "probe.py"
run_case docs/h7-platform/probe.ts FAIL "probe.ts"
run_case docs/h7-platform/probe.kicad_sym FAIL "probe.kicad_sym"
run_case circuits/h7-platform/vendor/st-pin-data/probe-ok.xml PASS "vendored ST pin-data"
run_case circuits/h7-platform/probe.xml FAIL "probe.xml"

if [ $failures -ne 0 ]; then
  echo "nocode-amendment-controls: $failures case(s) did not behave as stated"
  exit 1
fi
echo "nocode-amendment-controls: all 6 cases behave as stated"
