"""Compare two sheets' netlists as sets of REF.PIN, and as sets of net names.

The binding check on this repair: it is electrically a no-op, so both sets must
come out identical. A difference is a finding, not a tolerance.

THREE THINGS IT REFUSES TO TREAT AS A RESULT, each of which has produced a
false green in this repository:

  - `kicad-cli sch export netlist` exits 0 on a structurally broken sheet and
    writes `<components/>` and `<nets/>` EMPTY. An empty netlist is a failure
    here, not a reading.
  - comparing a file to itself. If the two paths hash the same, the comparison
    cannot fail, so it is reported as VACUOUS rather than as IDENTICAL.
  - a comparison with no positive control. The control is the per-pin partition
    of the BEFORE netlist compared against a deliberately corrupted copy of
    itself: if that does not come out DIFFERS, the comparator is broken and the
    real result means nothing.

usage: netcmp.py <before.kicad_sch> <after.kicad_sch>
"""
import hashlib
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"


def netsets(sch):
    out = Path(tempfile.mkdtemp()) / "net.xml"
    r = subprocess.run(
        [KC, "sch", "export", "netlist", "--format", "kicadxml", "-o", str(out), sch],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"netlist export failed for {sch}: {r.stderr}")
    root = ET.parse(out).getroot()
    comps = root.find("components")
    nets = {net.get("name"): sorted(
        f"{n.get('ref')}.{n.get('pin')}" for n in net.findall("node"))
        for net in root.find("nets")}
    if not nets or comps is None or len(comps) == 0:
        raise SystemExit(
            f"{sch}: export wrote {len(nets)} nets and "
            f"{0 if comps is None else len(comps)} components. The exporter "
            f"exits 0 on a structurally broken sheet, so this is a failure.")
    return nets


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def partition(nets):
    return {frozenset(v) for v in nets.values()}


def main():
    a_path, b_path = sys.argv[1], sys.argv[2]
    a, b = netsets(a_path), netsets(b_path)

    print(f"BEFORE {a_path}\n       sha256 {sha(a_path)}  {len(a)} nets")
    print(f"AFTER  {b_path}\n       sha256 {sha(b_path)}  {len(b)} nets")
    if sha(a_path) == sha(b_path):
        print("\nVACUOUS: the two files are byte-identical, so this comparison "
              "could not have failed. Nothing was written.")
        raise SystemExit(1)

    # Positive control: the comparator must call a corrupted partition DIFFERT.
    # Move one pin from the largest net to the smallest and re-compare.
    big = max(a, key=lambda n: len(a[n]))
    small = min(a, key=lambda n: len(a[n]))
    ctl = {n: list(v) for n, v in a.items()}
    moved = ctl[big].pop()
    ctl[small].append(moved)
    control_differs = partition(ctl) != partition(a)
    print(f"\npositive control: moved {moved} from {big} to {small} in a copy "
          f"of BEFORE -> partition differs: {control_differs}")
    if not control_differs:
        raise SystemExit("the comparator cannot detect a difference it was "
                         "just handed - it is broken, and no result below "
                         "means anything")

    pa, pb = partition(a), partition(b)
    print(f"\nNET PARTITION (pin sets, ignoring net names): "
          f"{'IDENTICAL' if pa == pb else 'DIFFERS'}")
    for s in sorted(pa - pb, key=sorted):
        print("  only BEFORE:", sorted(s))
    for s in sorted(pb - pa, key=sorted):
        print("  only AFTER :", sorted(s))

    print(f"NET NAMES: {'IDENTICAL' if set(a) == set(b) else 'DIFFER'}")
    if set(a) != set(b):
        print("  only BEFORE:", sorted(set(a) - set(b)))
        print("  only AFTER :", sorted(set(b) - set(a)))

    print(f"NAME -> PIN SET MAPPING: "
          f"{'IDENTICAL' if a == b else 'DIFFERS'}")
    for n in sorted(set(a) | set(b)):
        if a.get(n) != b.get(n):
            print(f"  {n}:\n    before {a.get(n)}\n    after  {b.get(n)}")


main()
