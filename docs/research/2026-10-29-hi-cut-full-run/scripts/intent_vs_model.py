"""Compare a copperhead intent file's net partition against the generated sheet's
netlist export. Prints the two partitions and whether they are identical as sets
of REF.PIN sets. No placement is computed anywhere here.

usage: intent_vs_model.py <intent.json> <generated.kicad_sch>
"""
import json
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"


def model_partition(sch):
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "net.xml"
        subprocess.run(
            [KC, "sch", "export", "netlist", "--format", "kicadxml",
             "-o", str(out), sch],
            check=True, capture_output=True)
        root = ET.parse(out).getroot()
    nets = {}
    for net in root.find("nets"):
        name = net.get("name")
        pins = frozenset(f"{n.get('ref')}.{n.get('pin')}" for n in net.findall("node"))
        nets[name] = pins
    return nets


def intent_partition(path):
    d = json.load(open(path))
    return {n["name"]: frozenset(n["pins"]) for n in d["nets"]}


def show(tag, nets):
    print(f"=== {tag}: {len(nets)} nets ===")
    for name in sorted(nets, key=lambda k: (-len(nets[k]), k)):
        print(f"  {name:26} ({len(nets[name]):2})  " + " ".join(sorted(nets[name])))


def main():
    intent = intent_partition(sys.argv[1])
    model = model_partition(sys.argv[2])
    show("INTENT", intent)
    show("MODEL (generated sheet)", model)

    # The model carries unconnected-(SW1-PadMP); the intent carries it as a
    # noConnect rather than a net, so it is excluded from the comparison and
    # reported separately.
    nc = json.load(open(sys.argv[1])).get("noConnect", [])
    model_cmp = {k: v for k, v in model.items() if not k.startswith("unconnected-")}
    singles = {p for k, v in model.items() if k.startswith("unconnected-") for p in v}

    pi = {frozenset(v) for v in intent.values()}
    pm = {frozenset(v) for v in model_cmp.values()}
    print()
    print(f"noConnect in intent: {sorted(nc)}")
    print(f"unconnected pins in model: {sorted(singles)}")
    print(f"noConnect == unconnected: {set(nc) == singles}")
    print(f"PARTITION (pin sets, names ignored): "
          f"{'IDENTICAL' if pi == pm else 'DIFFERS'}")
    if pi != pm:
        for s in sorted(pi - pm, key=lambda s: sorted(s)):
            print("  only in INTENT:", sorted(s))
        for s in sorted(pm - pi, key=lambda s: sorted(s)):
            print("  only in MODEL: ", sorted(s))
        sys.exit(1)


main()
