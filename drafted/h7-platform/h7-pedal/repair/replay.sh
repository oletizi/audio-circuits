#!/usr/bin/env bash
# Replay the h7-pedal drawing (design change C3) from a fresh `make draw` to every committed sheet,
# in a work directory, checking every sha256 and every generated op-list on the way. Exits non-zero
# on any mismatch.
#
# It grows one block at a time, as each page is repaired (h7 pedal pages plan, Task 7). Today it
# drafts every page the model holds, checks each draft and its intent against the committed record
# (the drafts of the blocks not yet repaired are checked too, so a model change shows here first),
# and repairs the Task 7a pages, interface and entry, the Task 7b pages, pf and modsw, the Task 7c pages, prail and
# ldo_vmid, the Task 9a pages and the Task 9b pages, by repair_block. Since Task 9a it checks all fifteen drafts (Task 8 built the
# digital and controls group's nine blocks). Each later part adds its blocks' sha256s and repair_block calls; the root and its
# .kicad_pro come when every page is drawn.
#
# Copied from drafted/h7-platform/h7-module/repair/replay.sh, its repair_block unchanged; the
# module's power page (its own op-list scripts) and root steps have no counterpart here yet.
#
# Fails loudly: the work directory must be new or empty, every command's status is checked through
# pipes (pipefail), each generated op-list must be byte-identical to the committed one, each
# `akcli draw` must report APPLIED (its dry run also exits 0 having written nothing - TOOLING.md
# step 4), and each repaired block sheet must pass hierarchical-labels.ts's post-condition.
#
# usage: bash replay.sh <new-or-empty-work-dir>
set -eu
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
drafted="$(cd "$here/.." && pwd)"
root="$(cd "$here/../../../.." && pwd)"
akcli="$root/draughting/venv-akcli/bin/akcli"
pages="$root/draughting/pages"
module="$root/circuits/h7-platform/pedal-board.ts"
board=h7-pedal

fail() {
  echo "replay.sh: FAILED - $1" >&2
  exit 1
}

# The drafts make draw writes, one per block, in Network.blocks order.
BLOCKS="entry pf modsw prail ldo_vmid codec_sup codec sai_iso expr_ref controls_a controls_b fsw_led usb midi_i2c interface"
draft_sha() {
  case "$1" in
    entry) echo 561fc836dbaf7178ab2742b2f7d24edcd8d63647040c78678bd2518b46ddec56 ;;
    pf) echo b7e7c33e37f2650bd183ca26622f52af351459b648ffaf87587cd5d0ebc12abb ;;
    modsw) echo b7d0331996774d07ec11b3d761bdedec98c665bf2a1b12da2aba75dee62f4fa6 ;;
    prail) echo ef60fc61776a0806efbc1d389534dec23494317f53ab8c1c0fddabb18fbd5cb9 ;;
    ldo_vmid) echo 4ab75dd0e2aad78af64d3e949bce37bf81401380570ae5844ef1b8576017d096 ;;
    codec_sup) echo 9390a014569c83cd32908125a65d021e58f18488b79d0f4b4ed6d1f9c4fa723c ;;
    codec) echo 06a886b93ffa8ff1a3bb52a04de5d018f765dbd83031ffc6fb8695f547af1a60 ;;
    sai_iso) echo 8686ecd5ebd920c4e74f9f5d90efe3c8bf074b519669507341d439a73690bb6e ;;
    expr_ref) echo c850a8f2602995833845c1261997bc721ee4b5a7994e3cd76f1892fa8494694d ;;
    controls_a) echo 74224c99b06a91fb19df787204fd1b7ac2965f8711ba172f9d5d77148920da68 ;;
    controls_b) echo 645388b8dfb1b473cc68711b52898714208841062be5523cc8fdef59bb8b751e ;;
    fsw_led) echo 88f1ad86fec322ef31f5263a60a4be09dcc5570aeaf18840b50da4b9ffc9daa7 ;;
    usb) echo 9413b7ab36e0947f4b25542a752f1ab5c03a28def027e82afd0074a2490bff2b ;;
    midi_i2c) echo bb11ba3014f260df8f60200c9e968a62e22c9248cc4cc91c6e6cece0f74a2eb2 ;;
    interface) echo 11fc06bf395a95e524a2406fe24b24a3890dcfa2ea60b95ae4ad498d8d95c6df ;;
    *) fail "no draft sha256 recorded for block $1" ;;
  esac
}
# The intents committed so far: a block's intent is committed with its page.
REPAIRED="interface entry pf modsw prail ldo_vmid usb midi_i2c fsw_led controls_a controls_b expr_ref"
PAGE_INTERFACE=963777f3bf9df9c3b5d966ce48c71bf76071f902c716f88a65b07c621b88822a
PAGE_ENTRY=5352fd5b917c96520681efa8421b8b63d9a0f92345156c776044f48708af0736
PAGE_PF=7096a9befaf2e62b42218a2153a34fa317fc9cad0a1ad5e1ae9c0d198a4b2385
PAGE_MODSW=89ed82bcbc60b4e2f075257768f68a4a66370348dc5db4e7c4b9632ca3099dc2
PAGE_PRAIL=f440c0c355718e6e280f955abe1ef8df8f2075cf89d5866f3ef854f90ae15780
PAGE_LDO_VMID=584cdc4ce97d96875c2c2b76a9504e99997eb1a21623668b7feb7202e6f96ecd
PAGE_USB=efe062770501a63ad44dfe33558fcb54f7bd6676b5bab682b25278317aecb653
PAGE_MIDI_I2C=fb12cf76ea6924f8cc1a983c9eaed4f85a004e15e399836941852d0e818afc4f
PAGE_FSW_LED=de6b3e173b854daef218356aa2ade4c1b66cdd5277eed411b969780865fb2021
PAGE_CONTROLS_A=0e01516c5059915c4bc1b9b22d711689c7f5311af0c78d22bbc7cda3fbdd5888
PAGE_CONTROLS_B=cd3f1a0869064b31cd5d9302e188614e4fb6f58e74481c8c2ae342644f0da9db
PAGE_EXPR_REF=f85af0345995f4a4b162ecbe287849ebbcbbdaa6eea9b06f229dab14b011539c

[ "$#" -eq 1 ] || fail "expected one argument, a new or empty work directory; got $#"
mkdir -p "$1"
work="$(cd "$1" && pwd)"
[ -z "$(ls -A "$work")" ] || fail "$work is not empty; replay into a new or empty directory so nothing from an earlier run is read"
[ -x "$akcli" ] || fail "akcli not found at $akcli"

sha() {
  shasum -a 256 "$1" | cut -d' ' -f1
}

check() {
  got="$(sha "$work/$1")" || fail "could not hash $work/$1"
  [ "$got" = "$3" ] || fail "after $2, $1 is $got, expected $3"
  echo "after $2, $1: $got"
}

same() {
  cmp -s "$work/repair/$1" "$here/$1" || fail "repair/$1 generated by this replay differs from the committed $here/$1"
  echo "generated repair/$1 matches the committed copy"
}

# akcli's stderr goes to a file in the work directory, named in the failure, so a refusal keeps its reason.
apply() {
  err="$work/akcli-$(echo "$2" | tr '/' '-').err"
  "$akcli" plan "$work/$1" --ops "$work/repair/$2" 2>"$err.plan" | tail -1 || fail "akcli plan $2 failed; its stderr is in $err.plan"
  log="$("$akcli" draw "$work/$1" --ops "$work/repair/$2" --apply 2>"$err.draw")" || fail "akcli draw $2 --apply failed; its stderr is in $err.draw"
  echo "$log" | tail -1
  echo "$log" | grep -q 'status: APPLIED' || fail "akcli draw $2 did not report APPLIED - nothing was written; its stderr is in $err.draw"
}

# 1. make draw: one draft per block, each draft checked against the record and each repaired block's
#    intent against its committed copy. The board declares no "netlist" yet (there is no root sheet to
#    export one from), so make draw prints its NO INDEPENDENT NETLIST block (design change C2); the
#    binding check is each page's own export against the model (draughting/pages/verify.sh).
make -C "$root/boards/$board" draw > "$work/make-draw.log" 2>&1 \
  || fail "make -C boards/$board draw failed; see $work/make-draw.log"
grep -q '^NO INDEPENDENT NETLIST:' "$work/make-draw.log" \
  || fail "make draw printed no NO INDEPENDENT NETLIST block: the board now declares a netlist, and this record predates it"
mkdir -p "$work/repair"
for b in $BLOCKS; do
  cp "$root/build/draw/$board/$b/$b.kicad_sch" "$work/$b.kicad_sch" || fail "make draw wrote no sheet for block $b"
  # Assigned first, so an unrecorded block stops the replay with draft_sha's own message.
  want="$(draft_sha "$b")" || exit 1
  check "$b.kicad_sch" "make draw" "$want"
done
for b in $REPAIRED; do
  cmp -s "$root/build/draw/$board/$b.intent.json" "$here/$b/intent.json" \
    || fail "the intent make draw generated for block $b differs from the committed $b/intent.json - the model has changed since this record"
done
echo "every draft matches its recorded sha256, and every repaired block's intent its committed copy"

# 2. Each repaired block, by the shared tools (draughting/pages/page.py) and its own layout.py and
#    02-wire.py: ports, strokes, place, pins, wire, any private PWR_FLAGs, hierarchical labels, text
#    edits. The ports file is generated first because layout.py may read it.
repair_block() {
  b="$1"
  want="$2"
  mkdir -p "$work/repair/$b"
  (cd "$root" && bun "$pages/ports.ts" "$drafted" "$b") > "$work/repair/$b/ports.json" || fail "ports.ts $b failed"
  same "$b/ports.json"
  python3 "$pages/net_strokes.py" "$work/$b.kicad_sch" > "$work/repair/$b/net_strokes.json" || fail "net_strokes.py $b failed"
  same "$b/net_strokes.json"
  python3 "$pages/place.py" "$here/$b" "$work/$b.kicad_sch" > "$work/repair/$b/01-place.json" || fail "place.py $b failed"
  same "$b/01-place.json"
  apply "$b.kicad_sch" "$b/01-place.json"
  python3 "$pages/pins.py" "$work/$b.kicad_sch" > "$work/repair/$b/pins.json" || fail "pins.py $b failed"
  same "$b/pins.json"
  python3 "$here/$b/02-wire.py" "$work/repair/$b/pins.json" "$work/repair/$b/ports.json" "$b.kicad_sch" \
    "$work/repair/$b/02-wire.nets.json" > "$work/repair/$b/02-wire.json" || fail "02-wire.py $b failed"
  same "$b/02-wire.json"
  same "$b/02-wire.nets.json"
  apply "$b.kicad_sch" "$b/02-wire.json"
  if [ -f "$here/$b/03-pwr-flags.py" ]; then
    python3 "$here/$b/03-pwr-flags.py" "$work/repair/$b/pins.json" "$b.kicad_sch" > "$work/repair/$b/03-pwr-flags.json" \
      || fail "03-pwr-flags.py $b failed"
    same "$b/03-pwr-flags.json"
    apply "$b.kicad_sch" "$b/03-pwr-flags.json"
  fi
  (cd "$root" && bun tools/draught/hierarchical-labels.ts ops "$module" "$b" "$work/$b.kicad_sch") \
    > "$work/repair/$b/04-hierarchical-labels.json" || fail "hierarchical-labels.ts ops $b failed"
  same "$b/04-hierarchical-labels.json"
  apply "$b.kicad_sch" "$b/04-hierarchical-labels.json"
  (cd "$root" && bun tools/draught/hierarchical-labels.ts check "$module" "$b" "$work/$b.kicad_sch") \
    || fail "block $b fails the hierarchical-label post-condition after its op-list"
  python3 "$pages/text_edits.py" "$here/$b" "$work/$b.kicad_sch" "$work/repair/$b/02-wire.nets.json" \
    "$work/repair/$b/net_strokes.json" || fail "text_edits.py $b failed"
  check "$b.kicad_sch" "01 to 05" "$want"
  cmp -s "$work/$b.kicad_sch" "$drafted/$b.kicad_sch" || fail "the replayed $b.kicad_sch differs from the committed $drafted/$b.kicad_sch"
  echo "the replayed $b.kicad_sch is byte-identical to the committed sheet"
}
# Task 7a.
repair_block interface "$PAGE_INTERFACE"
repair_block entry "$PAGE_ENTRY"
# Task 7b.
repair_block pf "$PAGE_PF"
repair_block modsw "$PAGE_MODSW"
# Task 7c.
repair_block prail "$PAGE_PRAIL"
repair_block ldo_vmid "$PAGE_LDO_VMID"
# Task 9a.
repair_block usb "$PAGE_USB"
repair_block midi_i2c "$PAGE_MIDI_I2C"
repair_block fsw_led "$PAGE_FSW_LED"
# Task 9b.
repair_block controls_a "$PAGE_CONTROLS_A"
repair_block controls_b "$PAGE_CONTROLS_B"
repair_block expr_ref "$PAGE_EXPR_REF"

# 3. The committed sym-lib-table names the project symbol library IN PLACE in the repository (one
#    copy of each symbol), where a draft's names a copy in its own directory (TOOLING.md C4). Make
#    it here and require it byte-identical to the committed one, and the library it names to exist.
lib_rel="../../../circuits/h7-platform/h7-platform.kicad_sym"
[ -f "$drafted/$lib_rel" ] || fail "the committed sym-lib-table names $lib_rel, which does not exist from the page's directory"
printf '(sym_lib_table\n%s(version 7)\n%s(lib (name "h7-platform")(type "KiCad")(uri "${KIPRJMOD}/%s")(options "")(descr "project library, circuits/h7-platform/h7-platform.kicad_sym"))\n)\n' \
  "$(printf '\t')" "$(printf '\t')" "$lib_rel" > "$work/sym-lib-table" || fail "could not write the sym-lib-table"
cmp -s "$work/sym-lib-table" "$drafted/sym-lib-table" || fail "the sym-lib-table this replay makes differs from the committed one"
echo "the committed sym-lib-table matches the one this replay makes"
echo "replay.sh: every sha256 reached"
