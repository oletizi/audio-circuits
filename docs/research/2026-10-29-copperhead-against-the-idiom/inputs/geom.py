"""Measure idiom-relevant geometry on every drafted sheet.

For each board:
  spineRun      longest connected horizontal run, mm, of any single net
  spineNet      which net that run belongs to
  spineYs       how many distinct y values the four signal-path nets occupy
  gndSymbols    count of copperhead_power:GND instances
  gndYs         distinct y values those GND symbols sit at
  gndLowest     lowest (largest-y) GND symbol, mm
  bandRows      distinct y bands the placed symbols fall into (50 mm buckets)
  localLabels / globalLabels
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPINE_NETS = {"in", "hi_in", "hi_boost_out", "out"}

WIRE_RE = re.compile(
    r"\(wire\s*\(pts\s*\(xy\s+([-\d.]+)\s+([-\d.]+)\)\s*\(xy\s+([-\d.]+)\s+([-\d.]+)\)\)",
    re.S)


def wires_with_nets(path):
    """Segments, each tagged with the net the engine coloured it for.

    The emitted file carries no net on a wire, so segments are grouped by
    connectivity instead: a connected component of segments is one net's run.
    """
    txt = open(path).read()
    segs = [tuple(float(g) for g in m.groups()) for m in WIRE_RE.finditer(txt)]
    return segs


def components(segs):
    """Union-find over shared endpoints."""
    key = lambda x, y: (round(x, 3), round(y, 3))  # noqa: E731
    parent = {}

    def find(a):
        parent.setdefault(a, a)
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for (x1, y1, x2, y2) in segs:
        union(key(x1, y1), key(x2, y2))
    groups = {}
    for s in segs:
        r = find(key(s[0], s[1]))
        groups.setdefault(r, []).append(s)
    return list(groups.values())


def longest_horizontal_run(segs):
    """Longest connected set of horizontal segments at one y within one
    connected component, measured end to end."""
    best = 0.0
    for comp in components(segs):
        byy = {}
        for (x1, y1, x2, y2) in comp:
            if abs(y1 - y2) < 1e-6:
                byy.setdefault(round(y1, 3), []).append((min(x1, x2), max(x1, x2)))
        for y, runs in byy.items():
            runs.sort()
            cx1, cx2 = runs[0]
            for a, b in runs[1:]:
                if a <= cx2 + 1e-6:
                    cx2 = max(cx2, b)
                else:
                    best = max(best, cx2 - cx1)
                    cx1, cx2 = a, b
            best = max(best, cx2 - cx1)
    return round(best, 2)


def labels_of(path):
    txt = open(path).read()
    loc = len(re.findall(r"\(label\s", txt))
    glo = len(re.findall(r"\(global_label\s", txt))
    return loc, glo


def gnd_symbols(path):
    txt = open(path).read()
    out = []
    for m in re.finditer(r'\(symbol\s*\(lib_id\s+"copperhead_power:(\w+)"\)\s*\(at\s+([-\d.]+)\s+([-\d.]+)', txt):
        out.append((m.group(1), float(m.group(2)), float(m.group(3))))
    return out


def symbol_ys(path):
    txt = open(path).read()
    return [float(m.group(2)) for m in
            re.finditer(r'\(symbol\s*\(lib_id\s+"([^"]+)"\)\s*\(at\s+([-\d.]+)\s+([-\d.]+)', txt)]


def main():
    rows = []
    for board in sorted(glob.glob(os.path.join(HERE, "boards", "*"))):
        sch = os.path.join(board, "pultec-low-boost.kicad_sch")
        if not os.path.exists(sch):
            continue
        tag = os.path.basename(board)
        segs = wires_with_nets(sch)
        gnds = [g for g in gnd_symbols(sch) if g[0] != "PWR_FLAG"]
        ys = symbol_ys(sch)
        loc, glo = labels_of(sch)
        bands = sorted({round(y / 40) for y in ys})
        rows.append({
            "tag": tag,
            "spineRun_mm": longest_horizontal_run(segs),
            "gndSymbols": len(gnds),
            "gndDistinctY": len({round(g[2], 1) for g in gnds}),
            "gndLowestY": round(max((g[2] for g in gnds), default=0), 1),
            "symbolYspan_mm": round(max(ys) - min(ys), 1) if ys else 0,
            "yBands": len(bands),
            "localLabels": loc,
            "globalLabels": glo,
        })
    print(json.dumps(rows, indent=2))
    hdr = ("tag", "spineRun_mm", "gndSymbols", "gndDistinctY", "yBands",
           "localLabels", "globalLabels", "symbolYspan_mm")
    print()
    print(" | ".join(h.ljust(14) for h in hdr))
    for r in rows:
        print(" | ".join(str(r[h]).ljust(14) for h in hdr))
    json.dump(rows, open(os.path.join(HERE, "geom.json"), "w"), indent=2)


if __name__ == "__main__":
    main()
