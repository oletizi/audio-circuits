#!/usr/bin/env bash
# Sourced by verify.sh: check_nocode. Uses verify.sh's ROOT, DOCS, CIRC, STANDARDS, require_trees
# and tree_files, which are defined there and read when the check runs.
#
# Amendment to check_nocode (phase 2, G1): phase 1's rule was "port the records,
# write no model", so only .md, .json, .svg and LICENSE-* files were allowed
# under docs/h7-platform/ and circuits/h7-platform/. Phase 2's G1 exists to
# write that model, so a .ts file under circuits/h7-platform/ is now allowed
# (held by bun run typecheck and bun test, not by this script) and the
# code-vocabulary scan no longer reads .ts files. Every other rule is kept: a
# .ts under docs/h7-platform/ and any other file type in either tree still
# fail. A passing nocode with .ts files present says so on its PASS line.

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
