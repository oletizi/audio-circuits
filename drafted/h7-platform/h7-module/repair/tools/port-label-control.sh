#!/bin/sh
# Controls for ruling CR-MODULE-PORT-LABEL-CHECK: each port's hierarchical label must sit on the net
# the model puts that port on (draughting/pages/port-labels.ts, run by block-netcompare.ts inside
# draughting/pages/verify.sh; and draughting/pages/page.py's Wiring.op_list at generation). The tools
# moved to draughting/pages/ by the H7 pedal plan's Task 4; these controls stay with the module,
# since each names its pages, ports and pins. Called by erc-control.sh; each control must come out as
# stated, or this script exits non-zero naming it. Every tampered page is a scratch copy.
#
#  P1. positive: every committed module page verifies, each with 0 ports on the wrong net.
#  P2. negative: a copy of the interface page with the texts of two one-pin labels, LED1 (J1.5) and
#      LED2 (J1.4), swapped fails verify.sh, naming both ports and the pins expected and found.
#  P3. negative: a copy of the qspi page with the FLASH_IO1 label (U4.2) deleted fails verify.sh,
#      naming the port.
#  P4. negative, generation: Wiring.op_list refuses a label placed on a wire drawn for another net.
#
# usage: sh port-label-control.sh
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
board="$(cd "$here/../.." && pwd)"
pages="$(cd "$here/../../../../../draughting/pages" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

bad() {
  echo "port-label-control.sh: CONTROL FAILED - $1" >&2
  exit 1
}

echo "== P1. every committed module page verifies, no port on the wrong net"
for block in power interface clock reset_boot swd usb_dfu id_strap qspi vdda sdram decoupling; do
  sh "$pages/verify.sh" "$board" "$block" "$board/$block.kicad_sch" >"$work/$block.log" 2>&1 \
    || { cat "$work/$block.log" >&2; bad "the committed $block page did not verify"; }
  line="$(grep '^port labels: ' "$work/$block.log")" || { cat "$work/$block.log" >&2; bad "$block: verify.sh printed no port-label count"; }
  case "$line" in
    "port labels: 0 of "*) echo "   $block: $line" ;;
    *) bad "$block: $line" ;;
  esac
done

echo "== P2. interface copy with LED1 and LED2 swapped fails, naming both"
python3 "$pages/label_tamper.py" swap "$board/interface.kicad_sch" "$work/interface.kicad_sch" LED1 LED2 >/dev/null
if sh "$pages/verify.sh" "$board" interface "$work/interface.kicad_sch" >"$work/swap.log" 2>&1; then
  cat "$work/swap.log" >&2; bad "verify.sh passed the interface page with LED1 and LED2 swapped"
fi
grep -q 'port LED1: expected pins J1.5 on net "/LED1"; found J1.4' "$work/swap.log" \
  || { cat "$work/swap.log" >&2; bad "verify.sh failed, but did not name LED1 with J1.5 expected and J1.4 found"; }
grep -q 'port LED2: expected pins J1.4 on net "/LED2"; found J1.5' "$work/swap.log" \
  || { cat "$work/swap.log" >&2; bad "verify.sh failed, but did not name LED2 with J1.4 expected and J1.5 found"; }
echo "   fails as expected:"
grep '   port LED' "$work/swap.log"

echo "== P3. qspi copy with the FLASH_IO1 label deleted fails, naming it"
python3 "$pages/label_tamper.py" delete "$board/qspi.kicad_sch" "$work/qspi.kicad_sch" FLASH_IO1 >/dev/null
if sh "$pages/verify.sh" "$board" qspi "$work/qspi.kicad_sch" >"$work/del.log" 2>&1; then
  cat "$work/del.log" >&2; bad "verify.sh passed the qspi page with the FLASH_IO1 label deleted"
fi
grep -q 'port FLASH_IO1: expected pins U4.2 on net "/FLASH_IO1"; found no net named "/FLASH_IO1"' "$work/del.log" \
  || { cat "$work/del.log" >&2; bad "verify.sh failed, but did not name FLASH_IO1 as missing its net"; }
echo "   fails as expected:"
grep '   port FLASH_IO1' "$work/del.log"

echo "== P4. Wiring.op_list refuses a label on another net's wire"
printf '%s\n' '{"R1": {"1": [0, 0]}, "R2": {"1": [0, 1000]}}' >"$work/pins.json"
printf '%s\n' '{"nets": [], "noConnect": []}' >"$work/intent.json"
printf '%s\n' '[{"name": "A", "pins": ["R1.1"], "drafted": false}, {"name": "B", "pins": ["R2.1"], "drafted": false}]' >"$work/ports.json"
if python3 - "$pages" "$work" >"$work/wiring.log" 2>&1 <<'PY'
import sys
sys.path.insert(0, sys.argv[1])
import page
w = page.Wiring(f"{sys.argv[2]}/pins.json", f"{sys.argv[2]}/intent.json", f"{sys.argv[2]}/ports.json")
w.path("A", "R1.1", (500, 0))
w.path("B", "R2.1", (500, 1000))
w.label("B", (500, 0), 0)
w.label("A", (500, 1000), 0)
w.op_list("x.kicad_sch", "x", "2026-11-12", f"{sys.argv[2]}/nets.json")
PY
then
  cat "$work/wiring.log" >&2; bad "Wiring.op_list accepted labels A and B swapped"
fi
grep -q "wire: label B at (500, 0) sits on the end of a wire drawn for \['A'\]" "$work/wiring.log" \
  || { cat "$work/wiring.log" >&2; bad "Wiring.op_list refused, but not naming label B on A's wire"; }
echo "   refused as expected: $(grep 'wire: label B' "$work/wiring.log")"

echo "port-label-control.sh: every control came out as stated"
