"""Survey every power symbol on the sheet and the wires its pin touches.

Reporting only.

WHAT WAS WRONG WITH IT, MEASURED
================================
**IT TESTED WIRE ENDPOINTS ONLY, AND SAID "NO WIRE TOUCHES THIS ANCHOR" FOR A
PIN SITTING ON A WIRE'S INTERIOR.** On `pultec-mid` it said exactly that for
`#PWR07`, the shared ground symbol, whose pin at (384.81, 130.81) sits in the
middle of the 15.24 mm link it terminates. Connectivity was proved three other
ways - akcli's connectivity check clean, the junction audit showing the pin on a
wire interior WITH a dot, and the netlist partition identical - so the line was a
false negative, and it is the same endpoint-only blind spot that made the deleted
`orphan_junctions.py` call six legitimate tees orphans.

It also tested the symbol's ANCHOR rather than its PIN. For copperhead's power
symbols those coincide, because the pin is at `(at 0 0 …)` with `(length 0)`, so
the two bugs were indistinguishable on the only symbols this script looks at. It
now resolves the pin through the library and reports both, so a symbol whose pin
is offset from its anchor cannot be surveyed wrongly and silently.

Every line now says whether a wire ENDS at the pin or passes THROUGH it, and
"nothing touches this pin" is reported only when the point is on no wire at all.

usage: pwr_survey.py <sheet.kicad_sch>
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    wires = sheet.wires()
    table = sheet.lib_pins()
    juncs = {(x, y) for x, y, _ in sheet.junctions()}

    print(f"total wires on sheet: {len(wires)}   "
          f"(every '(wire' token accounted for, or this script would have refused)")
    print()

    power = [s for s in sheet.symbols() if s.lib_id.startswith("copperhead_power:")
             or s.lib_id.startswith("power:")]
    if not power:
        print("no power symbols on this sheet")
        return

    for s in power:
        print(f"{s.ref:10s} {s.lib_id:26s} anchor ({s.x}, {s.y}) rot {s.rot}")
        for f in s.fields:
            if f.name == "Value" and not f.hidden and f.x is not None:
                print(f"    Value text {f.text!r} at ({f.x}, {f.y}) "
                      f"angle {f.angle} size {f.size}")
        pins = table.get(s.lib_id, [])
        if not pins:
            raise SystemExit(
                f"{s.ref}: {s.lib_id} has no library pin, so this survey cannot "
                f"say what its pin touches - add the entry rather than guessing")
        for p in pins:
            dx, dy = kicad_sheet.rotate(p.sx, -p.sy, s.rot)
            px, py = round(s.x + dx, 3), round(s.y + dy, 3)
            offset = "" if (px, py) == (s.x, s.y) else "  (OFFSET from the anchor)"
            hits = kicad_sheet.wire_hits(px, py, wires)
            dot = "with a dot" if (px, py) in juncs else "NO DOT"
            print(f"    pin ({px}, {py}) {p.kind or '?'}{offset}: "
                  f"{hits.through} wire(s) touch it - "
                  f"{hits.endpoints} end here, {hits.interiors} pass through "
                  f"({dot})")
            for w in hits.wires:
                how = "ENDS at the pin" if w.ends_at(px, py) else "PASSES THROUGH the pin"
                print(f"        ({w.x1}, {w.y1}) -> ({w.x2}, {w.y2})  "
                      f"len {w.length:6.2f}  {how}  {w.uuid}")
            if hits.through == 0:
                print("        NOTHING TOUCHES THIS PIN - it is on no wire, "
                      "interior or endpoint")
        print()


main()
