#!/usr/bin/env bash
# Mechanical Done-when checks for the h7-platform port.
# Usage: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash verify.sh [check ...]
# With no arguments, every check in ALL_CHECKS runs. An unknown check name is a FAIL.
# To add a check: write a function check_<name> that echoes a reason and returns
# non-zero on failure, add <name> to ALL_CHECKS, and add a case in run_check.

set -u

PIN=5b926d0
PREFIX="https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/"
EXPECTED_PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
DOCS="$ROOT/docs/h7-platform"
CIRC="$ROOT/circuits/h7-platform"
STANDARDS="$ROOT/docs/standards"
README="$DOCS/README.md"
SUPERSEDED_HEADING="## Superseded statements in the records"

# Values that are no longer in force. en dash and hyphen, matched bytewise.
STALE_RE='9(–|-)12 V|179 Hz'

# source (in pedals at the pin) -> destination (in this repo)
BYTE_PAIRS=(
  "h7-platform/module-interface.json|circuits/h7-platform/module-interface.json"
  "h7-platform/interface-analysis/results.json|circuits/h7-platform/interface-analysis-results.json"
  "h7-platform/LICENSE-OSCAR|circuits/h7-platform/LICENSE-OSCAR"
  "h7-platform/LICENSE-APACHE-2.0|circuits/h7-platform/LICENSE-APACHE-2.0"
  "h7-platform/interface-analysis/layouts/layout-B.svg|docs/h7-platform/layout-B.svg"
)

ALL_CHECKS=(bytes nocode provenance effective stale-json decisions architecture power analog openitems bypass)

if [ -z "${PEDALS_REPO:-}" ]; then
  echo "verify.sh refuses to run: PEDALS_REPO is not set. Set it to the local pedals checkout, expected value: $EXPECTED_PEDALS_REPO" >&2
  exit 2
fi

check_bytes() {
  local pair src dst want got tmp bad=""
  for pair in "${BYTE_PAIRS[@]}"; do
    src="${pair%%|*}"; dst="${pair##*|}"
    tmp=$(mktemp) || { echo " [mktemp failed]"; return 1; }
    if ! git -C "$PEDALS_REPO" show "$PIN:$src" > "$tmp" 2>/dev/null; then
      rm -f "$tmp"
      bad="$bad [cannot read $src at $PIN from $PEDALS_REPO]"; continue
    fi
    want=$(shasum -a 256 < "$tmp" | cut -d' ' -f1)
    rm -f "$tmp"
    if [ ! -f "$ROOT/$dst" ]; then bad="$bad [missing $dst]"; continue; fi
    got=$(shasum -a 256 < "$ROOT/$dst" | cut -d' ' -f1)
    [ "$want" = "$got" ] || bad="$bad [differs $dst]"
  done
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

# Files under the two trees, minus the five byte-identical records.
tree_files() {
  local d f rec skip
  for d in "$DOCS" "$CIRC"; do
    [ -d "$d" ] || continue
    find "$d" -type f | while read -r f; do
      skip=0
      for pair in "${BYTE_PAIRS[@]}"; do
        [ "$f" = "$ROOT/${pair##*|}" ] && skip=1
      done
      [ $skip -eq 1 ] || echo "$f"
    done
  done
}

require_trees() {
  local d missing=""
  for d in "$DOCS" "$CIRC"; do
    [ -d "$d" ] || missing="$missing [missing directory ${d#"$ROOT"/}]"
  done
  [ -z "$missing" ] || { echo "$missing"; return 1; }
}

check_nocode() {
  local bad="" f base hits
  bad=$(require_trees) || { echo "$bad"; return 1; }
  # file-type rule applies to every file, records included
  while read -r f; do
    base=$(basename "$f")
    case "$base" in
      *.md|*.json|*.svg|LICENSE-*) ;;
      *) bad="$bad [disallowed file type: ${f#"$ROOT"/}]" ;;
    esac
  done < <(find "$DOCS" "$CIRC" -type f 2>/dev/null)
  # vocabulary rule excludes the records
  while read -r f; do
    hits=$(grep -nE 'pnpm |PartSpec|BlockSpec|sheetKit|blocksOn' "$f" | head -3)
    [ -z "$hits" ] || bad="$bad [code vocabulary in ${f#"$ROOT"/}: $(echo "$hits" | tr '\n' ' ')]"
  done < <(tree_files)
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

check_provenance() {
  local bad="" f n=0
  bad=$(require_trees) || { echo "$bad"; return 1; }
  while read -r f; do
    n=$((n+1))
    grep -qF "$PREFIX" "$f" || bad="$bad [no pinned link prefix: ${f#"$ROOT"/}]"
  done < <(find "$DOCS" -type f -name '*.md')
  [ $n -gt 0 ] || { echo " [no .md files found under docs/h7-platform to scan]"; return 1; }
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

check_effective() {
  local bad="" f out n=0
  bad=$(require_trees) || { echo "$bad"; return 1; }
  while read -r f; do
    n=$((n+1))
    out=$(awk -v re="$STALE_RE" -v heading="$SUPERSEDED_HEADING" -v rel="${f#"$ROOT"/}" -v isreadme="$([ "$f" = "$README" ] && echo 1 || echo 0)" '
      /^## / { insec = (isreadme == 1 && $0 == heading) }
      $0 ~ re {
        if ($0 ~ /^\*Not in force:\*/) next
        if ($0 ~ /^\*Superseded in the records:\*/) next
        if (insec) next
        print rel ":" FNR ": " $0
      }' "$f")
    [ -z "$out" ] || bad="$bad [stale value in force: $(echo "$out" | head -3 | tr '\n' ' ')]"
  done < <(find "$DOCS" "$STANDARDS" -type f -name '*.md' 2>/dev/null)
  [ $n -gt 0 ] || { echo " [no .md files found to scan]"; return 1; }
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

check_stale_json() {
  local f
  for f in "$CIRC/module-interface.json" "$CIRC/interface-analysis-results.json"; do
    [ -f "$f" ] || { echo "missing ${f#"$ROOT"/}"; return 1; }
    echo "  records ${f#"$ROOT"/}:" >&2
    grep -nE "$STALE_RE" "$f" | sed 's/^/    /' >&2
  done
  if [ ! -f "$README" ] || ! grep -qxF "$SUPERSEDED_HEADING" "$README"; then
    echo "docs/h7-platform/README.md lacks a '$SUPERSEDED_HEADING' section (written in Task 12)"
    return 1
  fi
}

DECISIONS="$DOCS/decisions.md"
SEC_OWNER="## Owner decisions"
SEC_FACTS="## Owner-supplied facts"
SEC_RULINGS="## Controller rulings (the owner may override)"

# Print the lines of one "## " section of decisions.md (heading excluded).
decisions_section() {
  awk -v want="$1" '
    /^## / { insec = ($0 == want); next }
    insec { print }' "$DECISIONS"
}

# Print each entry (a heading line through the line before the next heading)
# whose heading matches the extended regex $1, entries separated by a line "@@".
decisions_entries() {
  awk -v re="$1" '
    /^#+ / { if (inent) print "@@"; inent = ($0 ~ re) }
    inent { print }
    END { if (inent) print "@@" }' "$DECISIONS"
}

check_decisions() {
  local bad="" sec n id ent owner rulings
  [ -f "$DECISIONS" ] || { echo " [missing docs/h7-platform/decisions.md]"; return 1; }
  for sec in "$SEC_OWNER" "$SEC_FACTS" "$SEC_RULINGS"; do
    grep -qxF "$sec" "$DECISIONS" || bad="$bad [missing section '$sec']"
  done
  for n in $(seq 1 18); do
    grep -qE "^#+ (.*[^0-9A-Za-z-])?O-$n([^0-9]|\$)" "$DECISIONS" || bad="$bad [O-$n in no heading]"
  done
  owner=$(decisions_section "$SEC_OWNER")
  for id in R-34 R-43 R-56; do
    echo "$owner" | grep -qE "^#+ (.*[^0-9A-Za-z-])?$id([^0-9]|\$)" || bad="$bad [no $id heading under '$SEC_OWNER']"
  done
  rulings=$(decisions_section "$SEC_RULINGS")
  echo "$rulings" | grep -qE "^#+ (.*[^0-9A-Za-z-])?O-15([^0-9]|\$)" || bad="$bad [no O-15 heading under '$SEC_RULINGS']"
  for n in 20 21 22 23 24; do
    ent=$(decisions_entries "(^|[^0-9A-Za-z-])D$n([^0-9]|\$)")
    if [ -z "$ent" ]; then bad="$bad [D$n in no heading]"; continue; fi
    echo "$ent" | grep -qF "§9.4" || bad="$bad [D$n entry does not cite §9.4]"
  done
  for n in 4 13; do
    ent=$(decisions_entries "(^|[^0-9A-Za-z-])D$n([^0-9]|\$)")
    if [ -z "$ent" ]; then bad="$bad [D$n in no heading]"; continue; fi
    echo "$ent" | grep -qi "withdrawn" || bad="$bad [D$n entry lacks the word 'withdrawn']"
  done
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

ARCHITECTURE="$DOCS/architecture.md"
ARCHITECTURE_TERMS=(h7-module h7-pedal "bring-up carrier" J_MOD_A J_MOD_B SAI2 VREF_A reservedCompatibility IF-PD-1)

check_architecture() {
  local bad="" term
  [ -f "$ARCHITECTURE" ] || { echo " [missing docs/h7-platform/architecture.md]"; return 1; }
  for term in "${ARCHITECTURE_TERMS[@]}"; do
    grep -qF -- "$term" "$ARCHITECTURE" || bad="$bad [architecture.md lacks '$term']"
  done
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

POWER="$DOCS/power.md"

check_power() {
  local bad=""
  [ -f "$POWER" ] || { echo " [missing docs/h7-platform/power.md]"; return 1; }
  grep -qF -- "Q_PEN" "$POWER" || bad="$bad [power.md lacks 'Q_PEN']"
  grep -F -- "9 V" "$POWER" | grep -qF -- "Seed" || bad="$bad [power.md has no line containing both '9 V' and 'Seed']"
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

ANALOG="$DOCS/analog.md"
ANALOG_TERMS=("421 Hz" "806" "PCM3060")

check_analog() {
  local bad="" term
  [ -f "$ANALOG" ] || { echo " [missing docs/h7-platform/analog.md]"; return 1; }
  for term in "${ANALOG_TERMS[@]}"; do
    grep -qF -- "$term" "$ANALOG" || bad="$bad [analog.md lacks '$term']"
  done
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

OPEN_ITEMS="$DOCS/open-items.md"
OPEN_ITEMS_REQUIRED_IDS=(FB-AN2606 VDDA-WIDEBAND VBUS-HOTPLUG)

# A table row is a line starting with "|", other than the header row (first
# cell "Id") and the separator row. Escaped pipes (\|) inside a cell are not
# cell boundaries. The phase is the sixth cell.
check_openitems() {
  local bad="" id out
  [ -f "$OPEN_ITEMS" ] || { echo " [missing docs/h7-platform/open-items.md]"; return 1; }
  for id in "${OPEN_ITEMS_REQUIRED_IDS[@]}"; do
    grep -qE "^\| $id \|" "$OPEN_ITEMS" || bad="$bad [no table row with Id $id]"
  done
  out=$(awk '
    /^\|/ {
      line = $0
      gsub(/\\\|/, "", line)
      n = split(line, cell, "|")
      id = cell[2]; gsub(/^ +| +$/, "", id)
      if (id == "Id" || id ~ /^-+$/) next
      phase = (n >= 8) ? cell[7] : ""
      gsub(/^ +| +$/, "", phase)
      if (phase == "") print "line " FNR " (" id "): empty"
      else if (phase != "phase 2" && phase != "phase 3" && phase != "phase 4" && phase != "bring-up") print "line " FNR " (" id "): \"" phase "\""
    }' "$OPEN_ITEMS")
  [ -z "$out" ] || bad="$bad [phase cell empty or not one of phase 2, phase 3, phase 4, bring-up: $(echo "$out" | head -5 | tr '\n' ' ')]"
  grep -qF -- "paper analysis" "$OPEN_ITEMS" || bad="$bad [open-items.md lacks the phrase 'paper analysis']"
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

BYPASS="$DOCS/bypass-relay.md"
BYPASS_TERMS=("unpowered" "power-fail")

check_bypass() {
  local bad="" term
  [ -f "$BYPASS" ] || { echo " [missing docs/h7-platform/bypass-relay.md]"; return 1; }
  for term in "${BYPASS_TERMS[@]}"; do
    grep -qF -- "$term" "$BYPASS" || bad="$bad [bypass-relay.md lacks '$term']"
  done
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

run_check() {
  local name="$1" reason rc
  case "$name" in
    bytes) reason=$(check_bytes) ;;
    nocode) reason=$(check_nocode) ;;
    provenance) reason=$(check_provenance) ;;
    effective) reason=$(check_effective) ;;
    stale-json) reason=$(check_stale_json) ;;
    decisions) reason=$(check_decisions) ;;
    architecture) reason=$(check_architecture) ;;
    power) reason=$(check_power) ;;
    analog) reason=$(check_analog) ;;
    openitems) reason=$(check_openitems) ;;
    bypass) reason=$(check_bypass) ;;
    *) echo "FAIL $name: unknown check"; return 1 ;;
  esac
  rc=$?
  if [ $rc -eq 0 ]; then echo "PASS $name"; else echo "FAIL $name:$reason"; fi
  return $rc
}

if [ $# -eq 0 ]; then set -- "${ALL_CHECKS[@]}"; fi
status=0
for c in "$@"; do run_check "$c" || status=1; done
exit $status
