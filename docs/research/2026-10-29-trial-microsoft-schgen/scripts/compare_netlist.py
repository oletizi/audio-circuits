"""Compare the netlist KiCad exports from the SchGen-emitted page against the
pultec-low-boost netlist the project's own model exports.

Nets are compared by their pin SETS, not by their names, because the two sides
name internal nets differently; name differences are reported separately.
"""

import sys
import xml.etree.ElementTree as ET

SPEC = {
    "0": "C1.1 C2.1 C3.1 C4.1 C5.1 C6.1 J1.5 J2.1 J2.2 J2.3 J2.4 J2.5 RV1.1 SI8.2",
    "Net-(C1-Pad2)": "C1.2 SW1.1",
    "Net-(C2-Pad2)": "C2.2 SW1.2",
    "Net-(C3-Pad2)": "C3.2 SW1.3",
    "Net-(C4-Pad2)": "C4.2 SW1.4",
    "Net-(C5-Pad2)": "C5.2 SW1.5",
    "Net-(C6-Pad2)": "C6.2 SW1.6",
    "Net-(SI1-Pad2)": "SI1.2 SI2.1",
    "Net-(SI3-Pad2)": "SI3.2 SI4.2",
    "Net-(SI4-Pad1)": "SI4.1 SI5.2 SI6.1",
    "hi_boost_out": "J1.2 SI2.2 SI5.1 SI7.1",
    "in": "J1.1 SI1.1 SI8.1",
    "lo_boost_in": "J1.3 R1.1 RV1.2 RV1.3 SI3.1 SI6.2 SW1.7",
    "out": "J1.4 R1.2 SI7.2",
}
UNCONNECTED = {"SW1.MP"}

spec = {name: frozenset(p.split()) for name, p in SPEC.items()}

root = ET.parse(sys.argv[1]).getroot()
got = {}
for net in root.find("nets"):
    name = net.get("name")
    pins = frozenset(f"{n.get('ref')}.{n.get('pin')}" for n in net.findall("node"))
    got[name] = pins

comps = sorted(c.get("ref") for c in root.find("components"))
values = {c.get("ref"): (c.findtext("value") or "") for c in root.find("components")}

print(f"components in drawing: {len(comps)}")
print("  " + " ".join(comps))
print()

spec_by_pins = {v: k for k, v in spec.items()}
got_by_pins = {v: k for k, v in got.items()}

print("NET-BY-NET (matched on pin set):")
matched = set()
for sname, spins in spec.items():
    if spins in got_by_pins:
        gname = got_by_pins[spins]
        matched.add(spins)
        same = "same name" if gname == sname else f"drawn as '{gname}'"
        print(f"  MATCH  {sname:16} {len(spins)} pins, {same}")
    else:
        cands = [(g, p) for g, p in got.items() if p & spins]
        print(f"  DIFFER {sname:16} expected {sorted(spins)}")
        for g, p in cands:
            print(f"           drawing net '{g}' has {sorted(p)}")
        if not cands:
            print("           no net in the drawing touches any of those pins")

print()
extra = [(g, p) for g, p in got.items() if p not in spec_by_pins]
print("NETS IN THE DRAWING WITH NO SPEC COUNTERPART:")
if not extra:
    print("  none")
for g, p in extra:
    note = ""
    if set(p) <= UNCONNECTED:
        note = "  (spec says this pin is on no net)"
    print(f"  {g}: {sorted(p)}{note}")

print()
print("VALUES:")
for r in comps:
    print(f"  {r:6} {values[r]}")
