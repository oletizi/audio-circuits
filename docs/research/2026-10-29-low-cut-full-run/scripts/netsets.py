"""Export a kicadxml netlist and print each net as a sorted set of REF.PIN.

With two arguments it compares the two as sets and reports a verdict.
"""
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"


def netsets(sch):
    out = Path(tempfile.mkdtemp()) / "net.xml"
    subprocess.run(
        [KC, "sch", "export", "netlist", "--format", "kicadxml", "-o", str(out), sch],
        check=True,
        capture_output=True,
    )
    root = ET.parse(out).getroot()
    nets = {}
    for net in root.find("nets"):
        name = net.get("name")
        pins = sorted(f"{n.get('ref')}.{n.get('pin')}" for n in net.findall("node"))
        nets[name] = pins
    return nets


def show(tag, nets):
    print(f"=== {tag}: {len(nets)} nets ===")
    for name in sorted(nets):
        print(f"  {name}  ({len(nets[name])})  {' '.join(nets[name])}")


if len(sys.argv) == 2:
    show(sys.argv[1], netsets(sys.argv[1]))
else:
    a, b = netsets(sys.argv[1]), netsets(sys.argv[2])
    show("BEFORE", a)
    print()
    show("AFTER", b)
    print()
    sa = {frozenset(v) for v in a.values()}
    sb = {frozenset(v) for v in b.values()}
    print("NET PARTITION (pin sets, ignoring net names):",
          "IDENTICAL" if sa == sb else "DIFFERS")
    if sa != sb:
        for s in sorted(sa - sb, key=sorted):
            print("  only BEFORE:", sorted(s))
        for s in sorted(sb - sa, key=sorted):
            print("  only AFTER :", sorted(s))
    print("NET NAMES:", "IDENTICAL" if set(a) == set(b) else "DIFFER")
    if set(a) != set(b):
        print("  only BEFORE:", sorted(set(a) - set(b)))
        print("  only AFTER :", sorted(set(b) - set(a)))
