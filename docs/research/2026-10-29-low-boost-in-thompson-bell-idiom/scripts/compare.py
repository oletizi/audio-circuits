import sys, re
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

tree = ET.parse(sys.argv[1])
got = {}
for net in tree.getroot().iter("net"):
    name = net.get("name").lstrip("/")
    members = sorted(n.get("ref") + "." + n.get("pin") for n in net.findall("node"))
    got[name] = members

spec_sets = {k: sorted(v.split()) for k, v in SPEC.items()}
# match by member set, so a renamed net (e.g. GND for 0) still reports as a match
by_members = {tuple(v): k for k, v in got.items()}

print("SPEC NET".ljust(16), "N".rjust(3), " RESULT")
unmatched_spec = []
for k, v in spec_sets.items():
    t = tuple(v)
    if t in by_members:
        drawn = by_members[t]
        tag = "MATCH" if drawn == k else "MATCH (drawn as '%s')" % drawn
        print(k.ljust(16), str(len(v)).rjust(3), " " + tag)
    else:
        print(k.ljust(16), str(len(v)).rjust(3), " ** NO EXACT MEMBER MATCH **")
        unmatched_spec.append(k)
        for gk, gv in got.items():
            inter = set(gv) & set(v)
            if inter:
                print("      closest:", gk, "->", gv)

spec_member_sets = {tuple(v) for v in spec_sets.values()}
extra = [(k, v) for k, v in got.items() if tuple(v) not in spec_member_sets]
print()
print("NETS IN THE DRAWING NOT IN THE SPEC:", len(extra))
for k, v in extra:
    print("   ", k, "->", v)
print()
print("spec nets:", len(spec_sets), " drawn nets:", len(got), " spec nets unmatched:", len(unmatched_spec))
