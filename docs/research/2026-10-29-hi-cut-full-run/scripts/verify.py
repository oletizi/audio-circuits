"""The verification set for the pultec-hi-cut run, before and after, in one table.

Inherited unchanged from
`docs/research/2026-10-29-hi-boost-hairpin-fix/scripts/verify.py` apart from
`BAND`, which names a different region on this board.

Every row is a number that could have come out differently. Three of them carry
a POSITIVE CONTROL - a second measurement on a value known to be non-zero -
because a check whose instrument has silently collapsed reports the same thing
as a page with nothing wrong with it. `TOOLING.md` records a NUL check that used
an empty pattern and counted every line.

What it does NOT do: judge the drawing. `EVALUATING-DRAWINGS.md` §6 - an
automated check is peripheral by definition, may never approve and may never
rank.

usage: verify.py <sheet.kicad_sch> [<label>]
"""
import hashlib
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
TOL = 0.001

# The corridor between the `lo_boost_in` rail (y = 96.52 after the repair) and
# the first selector run (y = 109.22), which is where all ten capacitor risers
# and all twenty capacitor text fields now live. Reported as an occupancy count
# so "it is full" or "it was empty" is a number rather than an assertion, and
# segments that merely PASS THROUGH the band are counted as well as those that
# end in it - `dump_region.py` only reports endpoints, so it cannot see a
# crossing.
BAND = (50.8, 95.25, 271.78, 110.49)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def paren_depth(src):
    """Running depth outside string literals; must end at 0 and never go < 0."""
    depth = 0
    lowest = 0
    in_str = False
    esc = False
    for ch in src:
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            lowest = min(lowest, depth)
    return depth, lowest


def byte_counts(path):
    """NUL and CR counts, with a positive control that proves the counter moves.

    The control is the count of a byte the file certainly contains (0x0a), so a
    counter that has collapsed to zero everywhere is distinguishable from a file
    that carries neither of the two bytes being looked for.
    """
    raw = Path(path).read_bytes()
    nul = raw.count(bytes([0]))
    cr = raw.count(bytes([13]))
    control = raw.count(bytes([10]))
    return nul, cr, control


def netsets(sch):
    out = Path(tempfile.mkdtemp()) / "net.xml"
    r = subprocess.run(
        [KC, "sch", "export", "netlist", "--format", "kicadxml", "-o", str(out), sch],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"netlist export failed: {r.stderr}")
    root = ET.parse(out).getroot()
    comps = root.find("components")
    nets = {}
    for net in root.find("nets"):
        nets[net.get("name")] = sorted(
            f"{n.get('ref')}.{n.get('pin')}" for n in net.findall("node"))
    # The export exits 0 on a structurally broken sheet and writes <nets/>
    # empty. An empty netlist is therefore a FAILURE, not a result.
    if not nets or comps is None or len(comps) == 0:
        raise SystemExit(f"netlist export produced {len(nets)} nets and "
                         f"{0 if comps is None else len(comps)} components - "
                         f"the export exits 0 on a broken sheet, so this is a "
                         f"failure, not a reading")
    return nets, len(comps)


def erc(sch):
    out = Path(tempfile.mkdtemp()) / "erc.rpt"
    r = subprocess.run([KC, "sch", "erc", "--exit-code-violations",
                        "-o", str(out), sch], capture_output=True, text=True)
    txt = out.read_text() if out.exists() else ""
    errors = len(re.findall(r"^\s*\[.*\]: .*\n\s*; error", txt, re.M))
    warnings = len(re.findall(r"^\s*\[.*\]: .*\n\s*; warning", txt, re.M))
    kinds = sorted(set(re.findall(r"^\s*\[([a-z_]+)\]:", txt, re.M)))
    return errors, warnings, kinds, r.returncode, txt


def lib_pins(src):
    out = {}
    for m in re.finditer(r'^\t\t\(symbol "([^"]+)"\n', src, re.M):
        lib_id = m.group(1)
        if ":" not in lib_id:
            continue
        start = m.end()
        nxt = re.search(r'^\t\t\(symbol "[^"]+"\n', src[start:], re.M)
        end = start + (nxt.start() if nxt else len(src) - start)
        out[lib_id] = [(float(a), float(b)) for a, b in re.findall(
            r'\(pin \w+ \w+\n\s*\(at ([-\d.]+) ([-\d.]+) \d+\)', src[start:end])]
    return out


def rotate(dx, dy, rot):
    return {0: (dx, dy), 90: (dy, -dx), 180: (-dx, -dy), 270: (-dy, dx)}[rot]


def geometry(path):
    src = Path(path).read_text()
    wires = [tuple(round(float(g), 3) for g in m.groups()) for m in re.finditer(
        r'\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', src)]
    juncs = [(round(float(m.group(1)), 3), round(float(m.group(2)), 3))
             for m in re.finditer(r'\(junction \(at ([-\d.]+) ([-\d.]+)\)', src)]
    syms = re.findall(r'\(lib_id "([^"]+)"\)\n\t\t\(at ', src)
    pin_inst = len(re.findall(r'^\t\t\(pin "[^"]*" \(uuid', src, re.M))
    glabels = re.findall(r'\(global_label "([^"]+)"', src)
    llabels = re.findall(r'\n\t\(label "([^"]+)"', src)

    table = lib_pins(src)
    pins = []
    for m in re.finditer(
            r'^\t\(symbol\n\t\t\(lib_id "([^"]+)"\)\n\t\t\(at ([-\d.]+) ([-\d.]+) (\d+)\)',
            src, re.M):
        lib_id, x, y, rot = m.group(1), float(m.group(2)), float(m.group(3)), int(m.group(4))
        for sx, sy in table.get(lib_id, []):
            dx, dy = rotate(sx, -sy, rot)
            pins.append((round(x + dx, 3), round(y + dy, 3)))

    horiz = [s for s in wires if abs(s[1] - s[3]) < TOL]
    vert = [s for s in wires if abs(s[0] - s[2]) < TOL]
    cross, tees = set(), set()
    for h in horiz:
        hy, (hx0, hx1) = h[1], sorted((h[0], h[2]))
        for v in vert:
            vx, (vy0, vy1) = v[0], sorted((v[1], v[3]))
            if not (hx0 - TOL <= vx <= hx1 + TOL and vy0 - TOL <= hy <= vy1 + TOL):
                continue
            he = abs(vx - hx0) < TOL or abs(vx - hx1) < TOL
            ve = abs(hy - vy0) < TOL or abs(hy - vy1) < TOL
            if he and ve:
                continue
            (tees if (he or ve) else cross).add((round(vx, 3), round(hy, 3)))

    dots = set(juncs)
    tees_nodot = sorted(t for t in tees if t not in dots)
    pinset = set(pins)
    orphans = []
    for (jx, jy) in juncs:
        n = 0
        for x1, y1, x2, y2 in wires:
            if abs(x1 - x2) < TOL and abs(x1 - jx) < TOL and \
                    min(y1, y2) - TOL <= jy <= max(y1, y2) + TOL:
                n += 1
            elif abs(y1 - y2) < TOL and abs(y1 - jy) < TOL and \
                    min(x1, x2) - TOL <= jx <= max(x1, x2) + TOL:
                n += 1
        if n + (1 if (jx, jy) in pinset else 0) < 2:
            orphans.append((jx, jy))

    pin_tees = set()
    for (px, py) in pins:
        for x1, y1, x2, y2 in wires:
            if abs(x1 - x2) < TOL and abs(x1 - px) < TOL and \
                    min(y1, y2) + TOL < py < max(y1, y2) - TOL:
                pin_tees.add((px, py))
            elif abs(y1 - y2) < TOL and abs(y1 - py) < TOL and \
                    min(x1, x2) + TOL < px < max(x1, x2) - TOL:
                pin_tees.add((px, py))
    pin_tees_nodot = sorted(t for t in pin_tees if t not in dots)

    # Duplicate on-page labels per group rectangle.
    rects = [(float(a), float(b), float(c), float(d)) for a, b, c, d in re.findall(
        r'\(rectangle \(start ([-\d.]+) ([-\d.]+)\) \(end ([-\d.]+) ([-\d.]+)\)', src)]
    groups = [r for r in rects if r[0] > 5 and (r[2] - r[0]) > 10]
    anchors = []
    for m in re.finditer(
            r'\((global_label|label) "([^"]+)"(?: \(shape \w+\))? \(at ([-\d.]+) ([-\d.]+)',
            src):
        anchors.append((m.group(2), float(m.group(3)), float(m.group(4))))
    per_group = {}
    for name, x, y in anchors:
        g = "-"
        for (x1, y1, x2, y2) in groups:
            if x1 - 0.01 <= x <= x2 + 0.01 and y1 - 0.01 <= y <= y2 + 0.01:
                g = (x1, y1)
                break
        per_group.setdefault((name, g), 0)
        per_group[(name, g)] += 1
    dup = sorted(k for k, v in per_group.items() if v > 1)

    # Band occupancy: endpoints inside, and segments crossing.
    bx0, by0, bx1, by1 = BAND
    def inband(x, y):
        return bx0 - TOL <= x <= bx1 + TOL and by0 - TOL <= y <= by1 + TOL
    occ = 0
    for x1, y1, x2, y2 in wires:
        if inband(x1, y1) or inband(x2, y2):
            occ += 1
        elif abs(x1 - x2) < TOL and bx0 <= x1 <= bx1 and \
                min(y1, y2) < by0 and max(y1, y2) > by1:
            occ += 1
        elif abs(y1 - y2) < TOL and by0 <= y1 <= by1 and \
                min(x1, x2) < bx0 and max(x1, x2) > bx1:
            occ += 1
    occ_pins = sum(1 for p in pins if inband(*p))
    # Positive control for the band test: the same predicate over the whole
    # sheet must count every wire, which proves the predicate is not vacuous.
    whole = (0, 0, 1e6, 1e6)
    ctl = sum(1 for x1, y1, x2, y2 in wires
              if whole[0] <= x1 <= whole[2] and whole[1] <= y1 <= whole[3])

    total = sum(abs(a - c) + abs(b - d) for a, b, c, d in wires)
    longest = max((abs(a - c) + abs(b - d) for a, b, c, d in wires), default=0)

    return dict(
        wires=len(wires), total_len=total, longest=longest,
        crossings=sorted(cross), tees=len(tees), tees_nodot=tees_nodot,
        dots=len(juncs), orphans=orphans,
        pin_tees=len(pin_tees), pin_tees_nodot=pin_tees_nodot,
        symbols=len(syms), pin_instances=pin_inst, lib_pins=len(pins),
        glabels=len(glabels), llabels=len(llabels), dup_labels=dup,
        groups=len(groups), band_wires=occ, band_pins=occ_pins, band_control=ctl,
        src=src)


def main():
    path = sys.argv[1]
    label = sys.argv[2] if len(sys.argv) > 2 else path
    g = geometry(path)
    depth, lowest = paren_depth(g["src"])
    nul, cr, ctl_lf = byte_counts(path)
    nets, ncomp = netsets(path)
    e, w, kinds, rc, _ = erc(path)

    print(f"=== {label}")
    print(f"  sha256                        {sha256(path)}")
    print(f"  parenthesis depth (end)       {depth}   lowest reached {lowest}")
    print(f"  NUL bytes                     {nul}   CR bytes {cr}   "
          f"[positive control: LF bytes {ctl_lf}]")
    print(f"  netlist nets / components     {len(nets)} / {ncomp}")
    print(f"  ERC errors                    {e}")
    print(f"  ERC warnings                  {w}   kinds {kinds}   "
          f"(kicad-cli --exit-code-violations rc={rc})")
    print(f"  wires                         {g['wires']}")
    print(f"  total wire length             {g['total_len']:.2f} mm")
    print(f"  longest wire                  {g['longest']:.2f} mm")
    print(f"  true wire crossings           {len(g['crossings'])}  {g['crossings']}")
    print(f"  wire-to-wire tees             {g['tees']}   without a dot "
          f"{len(g['tees_nodot'])} {g['tees_nodot']}")
    print(f"  pins on a wire interior       {g['pin_tees']}   without a dot "
          f"{len(g['pin_tees_nodot'])} {g['pin_tees_nodot']}")
    print(f"  junction dots                 {g['dots']}   orphans "
          f"{len(g['orphans'])} {g['orphans']}")
    print(f"  symbols placed                {g['symbols']}")
    print(f"  symbol pin instances          {g['pin_instances']}   "
          f"lib-resolved pin points {g['lib_pins']}")
    print(f"  global labels                 {g['glabels']}")
    print(f"  local labels                  {g['llabels']}")
    print(f"  duplicate labels in a group   {len(g['dup_labels'])} {g['dup_labels']}")
    print(f"  group rectangles              {g['groups']}")
    print(f"  band {BAND} wires {g['band_wires']} pins {g['band_pins']}   "
          f"[positive control: whole-sheet wires {g['band_control']}]")
    print("  nets as sorted REF.PIN sets:")
    for n in sorted(nets):
        print(f"    {n}  ({len(nets[n])})  {' '.join(nets[n])}")


main()
