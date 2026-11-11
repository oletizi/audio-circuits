#!/usr/bin/env bash
# Mechanical Done-when checks for the h7-platform port.
# Usage: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash verify.sh [check ...]
# With no arguments, every check in ALL_CHECKS runs. An unknown check name is a FAIL.
# To add a check: write a function check_<name> that echoes a reason and returns
# non-zero on failure, add <name> to ALL_CHECKS, and add a case in run_check.
#
# Amendment to check_nocode (phase 2, G1): phase 1's rule was "port the records,
# write no model", so only .md, .json, .svg and LICENSE-* files were allowed
# under docs/h7-platform/ and circuits/h7-platform/. Phase 2's G1 exists to
# write that model, so a .ts file under circuits/h7-platform/ is now allowed
# (held by bun run typecheck and bun test, not by this script) and the
# code-vocabulary scan no longer reads .ts files. Every other rule is kept: a
# .ts under docs/h7-platform/ and any other file type in either tree still
# fail. A passing nocode with .ts files present says so on its PASS line.

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

ALL_CHECKS=(bytes nocode provenance standards effective stale-json decisions architecture power analog openitems bypass firmware mechanical parts bringup readme)

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
    find "$d" -type f ! -name '*.ts' | while read -r f; do
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
  local bad="" f base hits ts=0 sym=0
  bad=$(require_trees) || { echo "$bad"; return 1; }
  # file-type rule applies to every file, records included
  while read -r f; do
    base=$(basename "$f")
    case "$base" in
      *.md|*.json|*.svg|LICENSE-*) ;;
      *.ts)
        case "$f" in
          "$CIRC"/*) ts=$((ts+1)) ;;
          *) bad="$bad [disallowed file type: ${f#"$ROOT"/}]" ;;
        esac ;;
      *.kicad_sym)
        case "$f" in
          "$CIRC"/*) sym=$((sym+1)) ;;
          *) bad="$bad [disallowed file type: ${f#"$ROOT"/}]" ;;
        esac ;;
      *) bad="$bad [disallowed file type: ${f#"$ROOT"/}]" ;;
    esac
  done < <(find "$DOCS" "$CIRC" -type f 2>/dev/null)
  # vocabulary rule excludes the records and .ts source (tree_files drops .ts)
  while read -r f; do
    hits=$(grep -nE 'pnpm |make -C |PartSpec|BlockSpec|sheetKit|blocksOn' "$f" | head -3)
    [ -z "$hits" ] || bad="$bad [code vocabulary in ${f#"$ROOT"/}: $(echo "$hits" | tr '\n' ' ')]"
  done < <(tree_files; [ -d "$STANDARDS" ] && find "$STANDARDS" -type f -name '*.md')
  [ -z "$bad" ] || { echo "$bad"; return 1; }
  [ $ts -eq 0 ] && [ $sym -eq 0 ] || echo "(phase-2 amendment: $ts .ts files and $sym .kicad_sym files under circuits/h7-platform/ held by typecheck and tests)"
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

STANDARDS_FILES=(
  "docs/h7-platform/research/proven-reference-designs.md"
  "docs/h7-platform/research/processor-module-form-factors.md"
  "docs/standards/pcbway-fab-rules.md"
)

check_standards() {
  local bad="" rel
  for rel in "${STANDARDS_FILES[@]}"; do
    if [ ! -f "$ROOT/$rel" ]; then bad="$bad [missing $rel]"; continue; fi
    grep -qF "$PREFIX" "$ROOT/$rel" || bad="$bad [no pinned link prefix: $rel]"
  done
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

check_effective() {
  local bad="" f out n=0
  bad=$(require_trees) || { echo "$bad"; return 1; }
  [ -d "$STANDARDS" ] || { echo " [missing directory docs/standards: the standards documents must be scanned for superseded values]"; return 1; }
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

FIRMWARE="$DOCS/firmware-facing-requirements.md"
PROCESSOR="$DOCS/processor-and-memory.md"
FIRMWARE_TERMS=("H750" "H743" "QSPI" "32 MB" "bootloader" "SAI2" "watchdog" "USB")
FIRMWARE_SENTENCE="This repository does not own firmware."

check_firmware() {
  local bad="" term
  [ -f "$PROCESSOR" ] || bad="$bad [missing docs/h7-platform/processor-and-memory.md]"
  [ -f "$FIRMWARE" ] || { echo "$bad [missing docs/h7-platform/firmware-facing-requirements.md]"; return 1; }
  for term in "${FIRMWARE_TERMS[@]}"; do
    grep -qF -- "$term" "$FIRMWARE" || bad="$bad [firmware-facing-requirements.md lacks '$term']"
  done
  grep -qF -- "$FIRMWARE_SENTENCE" "$FIRMWARE" || bad="$bad [firmware-facing-requirements.md lacks the sentence '$FIRMWARE_SENTENCE']"
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

MECHANICAL="$DOCS/mechanical-and-controls.md"
MECHANICAL_TERMS=("1590BB" "stack height" "layout-B.svg")

# "six" is matched as a whole word, so "sixty" or "sixth" does not satisfy it.
check_mechanical() {
  local bad="" term
  [ -f "$MECHANICAL" ] || { echo " [missing docs/h7-platform/mechanical-and-controls.md]"; return 1; }
  for term in "${MECHANICAL_TERMS[@]}"; do
    grep -qF -- "$term" "$MECHANICAL" || bad="$bad [mechanical-and-controls.md lacks '$term']"
  done
  grep -qw -- "six" "$MECHANICAL" || bad="$bad [mechanical-and-controls.md lacks the word 'six']"
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

PARTS="$DOCS/parts.md"
PARTS_HEADER="Role|MPN|Manufacturer|LCSC|Board|Chosen by|Source"

# Every table whose header row is exactly PARTS_HEADER is a parts table. Each of
# its rows must have seven cells, and its "Chosen by" and "Source" cells must not
# be empty. Escaped pipes (\|) inside a cell are not cell boundaries. A file with
# no such table, a parts table with no rows, or any other header row whose first
# cell is "Role" (a misspelt or reordered parts header) fails.
check_parts() {
  local out
  [ -f "$PARTS" ] || { echo " [missing docs/h7-platform/parts.md]"; return 1; }
  out=$(awk -v want="$PARTS_HEADER" '
    function cells(s,    line, n, i, c, joined) {
      line = s
      gsub(/\\\|/, "", line)
      n = split(line, cell, "|")
      ncell = n - 2
      joined = ""
      for (i = 2; i < n; i++) {
        c = cell[i]; gsub(/^[ \t]+|[ \t]+$/, "", c); cell[i] = c
        joined = joined (i > 2 ? "|" : "") c
      }
      return joined
    }
    /^\|/ {
      if (!intable) {
        hdr = cells($0)
        if (hdr == want) { intable = 1; tables++; seenSep = 0 }
        else if (cell[2] == "Role") print "line " FNR ": header starting | Role | is not | Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |"
        next
      }
      cells($0)
      if (!seenSep && cell[2] ~ /^:?-+:?$/) { seenSep = 1; next }
      rows++
      if (ncell != 7) { print "line " FNR ": " ncell " cells, expected 7"; next }
      if (cell[7] == "") print "line " FNR " (" cell[2] "): empty Chosen by"
      if (cell[8] == "") print "line " FNR " (" cell[2] "): empty Source"
      next
    }
    { intable = 0 }
    END {
      if (tables == 0) print "no table with header | Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |"
      else if (rows == 0) print "parts tables have no rows"
    }' "$PARTS")
  [ -z "$out" ] || { echo " [$(echo "$out" | head -5 | tr '\n' ';')]"; return 1; }
}

BRINGUP="$DOCS/bring-up.md"
BRINGUP_MARKINGS='original requirement|deferred measurement|passed paper analysis'

# A BU line is a line that begins "- **BU-NN**". Each of BU-01 to BU-29 must have
# exactly one such line, and that line must carry exactly one occurrence of one
# of the three markings. Each of BL-1 to BL-4 must have a line beginning
# "- **BL-n**".
check_bringup() {
  local bad="" n id lines count marks
  [ -f "$BRINGUP" ] || { echo " [missing docs/h7-platform/bring-up.md]"; return 1; }
  for n in $(seq 1 29); do
    id=$(printf 'BU-%02d' "$n")
    lines=$(grep -E "^- \*\*$id\*\*" "$BRINGUP")
    count=$(printf '%s' "$lines" | grep -c '^')
    if [ "$count" -ne 1 ]; then bad="$bad [$id: $count lines beginning '- **$id**', expected 1]"; continue; fi
    marks=$(printf '%s\n' "$lines" | grep -oE "$BRINGUP_MARKINGS" | wc -l | tr -d ' ')
    [ "$marks" = "1" ] || bad="$bad [$id line carries $marks markings, expected exactly 1]"
  done
  for n in 1 2 3 4; do
    grep -qE "^- \*\*BL-$n\*\*" "$BRINGUP" || bad="$bad [no line beginning '- **BL-$n**']"
  done
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

# The platform source paths of spec Goal 4. The h7-platform/ part is read from
# git at the pin on every run, so a file the pin holds cannot be missed; the
# directories below collapse to one path each. The paths outside h7-platform/
# are named by the spec rather than found by a rule, so they are listed here,
# and each is checked to exist at the pin so a misspelling fails loudly.
README_COLLAPSE_DIRS=(boards/v1/ circuit/ mechanical/ vendor/ symbols/ footprints/ pintables/ generated/ interface-analysis/sources/)
README_EXTRA_PATHS=(
  "docs/superpowers/specs/2026-09-30-h7-pedal-platform-design.md"
  "docs/superpowers/specs/2026-10-05-h7-modular-split-design.md"
  "docs/research/2026-09-30-proven-reference-designs.md"
  "docs/research/2026-10-05-processor-module-form-factors.md"
  "docs/standards/pcbway-fab-rules.md"
  "docs/superpowers/plans/2026-10-03-h7-schgen-a1-rulings.md"
  "docs/superpowers/plans/2026-10-03-h7-schgen-a2-rulings.md"
  "docs/superpowers/plans/2026-10-05-h7-split-rulings.md"
)
README_SOURCE_MAP="## Source map"
README_PROVENANCE="## Provenance index"

# Print the platform source paths, one per line. Fails if git cannot list the
# tree, or a collapse directory or an extra path is not at the pin.
readme_source_paths() {
  local listing d p missing=""
  listing=$(git -C "$PEDALS_REPO" ls-tree -r --name-only "$PIN" h7-platform 2>/dev/null)
  [ -n "$listing" ] || { echo "cannot list h7-platform at $PIN in $PEDALS_REPO" >&2; return 1; }
  for d in "${README_COLLAPSE_DIRS[@]}"; do
    printf '%s\n' "$listing" | grep -q "^h7-platform/$d" || missing="$missing [collapse directory h7-platform/$d has no files at $PIN]"
  done
  for p in "${README_EXTRA_PATHS[@]}"; do
    git -C "$PEDALS_REPO" cat-file -e "$PIN:$p" 2>/dev/null || missing="$missing [$p is not at $PIN]"
  done
  [ -z "$missing" ] || { echo "$missing" >&2; return 1; }
  printf '%s\n' "$listing" | awk -v dirs="${README_COLLAPSE_DIRS[*]}" '
    BEGIN { n = split(dirs, d, " ") }
    {
      p = $0
      for (i = 1; i <= n; i++) {
        pre = "h7-platform/" d[i]
        if (substr(p, 1, length(pre)) == pre) { p = pre; break }
      }
      if (!(p in seen)) { seen[p] = 1; print p }
    }'
  printf '%s\n' "${README_EXTRA_PATHS[@]}"
}

# Print the lines of one "## " section of the README (heading excluded).
readme_section() {
  awk -v want="$1" '
    /^## / { insec = ($0 == want); next }
    insec { print }' "$README"
}

# Each source path must appear as a code span (`path`) in the Source map section,
# on a line that either links a document in this repository (a relative link) or
# says "stayed behind". The Provenance index must hold at least three "Trace:"
# headings, and a line naming OSCAR_AUDIO_01 must say "unresolved".
check_readme() {
  local bad="" paths p map prov lines traces errfile
  [ -f "$README" ] || { echo " [missing docs/h7-platform/README.md]"; return 1; }
  errfile=$(mktemp) || { echo " [mktemp failed]"; return 1; }
  paths=$(readme_source_paths 2>"$errfile")
  if [ $? -ne 0 ] || [ -z "$paths" ]; then
    bad=" [cannot build the source-path list:$(cat "$errfile")]"
    rm -f "$errfile"
    echo "$bad"; return 1
  fi
  rm -f "$errfile"
  grep -qxF "$README_SOURCE_MAP" "$README" || bad="$bad [no '$README_SOURCE_MAP' section]"
  map=$(readme_section "$README_SOURCE_MAP")
  while read -r p; do
    lines=$(printf '%s\n' "$map" | grep -F -- "\`$p\`")
    if [ -z "$lines" ]; then bad="$bad [source map lacks \`$p\`]"; continue; fi
    printf '%s\n' "$lines" | grep -qiE 'stayed behind|\]\([^h)#][^)]*\)' || bad="$bad [source map line for \`$p\` neither links a document here nor says 'stayed behind']"
  done <<< "$paths"
  grep -qxF "$README_PROVENANCE" "$README" || bad="$bad [no '$README_PROVENANCE' section]"
  prov=$(readme_section "$README_PROVENANCE")
  traces=$(printf '%s\n' "$prov" | grep -cE '^#+ Trace:')
  [ "$traces" -ge 3 ] || bad="$bad [provenance index has $traces 'Trace:' headings, expected at least 3]"
  grep -F -- "OSCAR_AUDIO_01" "$README" | grep -qF -- "unresolved" || bad="$bad [no line naming OSCAR_AUDIO_01 says 'unresolved']"
  [ -z "$bad" ] || { echo "$bad"; return 1; }
}

run_check() {
  local name="$1" reason rc
  case "$name" in
    bytes) reason=$(check_bytes) ;;
    nocode) reason=$(check_nocode) ;;
    provenance) reason=$(check_provenance) ;;
    standards) reason=$(check_standards) ;;
    effective) reason=$(check_effective) ;;
    stale-json) reason=$(check_stale_json) ;;
    decisions) reason=$(check_decisions) ;;
    architecture) reason=$(check_architecture) ;;
    power) reason=$(check_power) ;;
    analog) reason=$(check_analog) ;;
    openitems) reason=$(check_openitems) ;;
    bypass) reason=$(check_bypass) ;;
    firmware) reason=$(check_firmware) ;;
    mechanical) reason=$(check_mechanical) ;;
    parts) reason=$(check_parts) ;;
    bringup) reason=$(check_bringup) ;;
    readme) reason=$(check_readme) ;;
    *) echo "FAIL $name: unknown check"; return 1 ;;
  esac
  rc=$?
  if [ $rc -eq 0 ]; then echo "PASS $name${reason:+ $reason}"; else echo "FAIL $name:$reason"; fi
  return $rc
}

if [ $# -eq 0 ]; then set -- "${ALL_CHECKS[@]}"; fi
status=0
for c in "$@"; do run_check "$c" || status=1; done
exit $status
