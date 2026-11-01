"""One table of the page's measurable costs, so a before/after can be compared.

Reports: wire count and total length, the longest wire, true crossings,
wire-to-wire tees, junction dots, symbol and pin counts, label counts, and
**duplicate on-page labels per group** - the last being the one with a hard
threshold, because `EVALUATING-DRAWINGS.md` says to collapse a duplicate pair
without reasoning about it, so the number has to be zero.

A label's group is the group rectangle that contains its anchor. A label
outside every rectangle is reported as `-`, which would itself be a finding.

usage: metrics.py <sheet.kicad_sch> [<sheet.kicad_sch> ...]
"""
import collections
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

TOL = kicad_sheet.TOL


def parse(path):
    """Read everything this table counts, through the shared sheet reader.

    **THREE OF THESE SIX PATTERNS ONLY UNDERSTOOD ONE OF THE TWO TEXTUAL FORMS A
    SHEET USES.** The symbol-instance pattern required a newline and two tabs
    between `(lib_id ...)` and `(at ...)`, so it missed `#PWR010` on the accepted
    `pultec-low-boost` page, which akcli wrote on one line, and this table
    reported 24 symbols and 56 pin instances for a page with 25 and 57. The
    rectangle pattern matched only the one-line form, which here is harmless -
    it wants the sheet-level group boxes and those are one-line - and was NOT
    harmless in `boxgeom.py`, where the same pattern removed every symbol body
    from every margin. The label pattern required a single space before `(at`.
    `docs/research/lib/kicad_sheet.py` parses by balanced parentheses and refuses
    when its parse does not account for every token in the source.
    """
    sheet = kicad_sheet.read(path)
    wires = [w.pts for w in sheet.wires()]
    rects = sheet.rectangles()
    texts = {t: (x, y) for t, x, y, _ in sheet.texts()}
    labels = [(t, x, y, k == "global_label")
              for k, t, x, y, _a, _s, _n in sheet.labels()
              if k in ("global_label", "label")]
    syms = [s.lib_id for s in sheet.symbols()]
    pins = sum(len(s.node.kids("pin")) for s in sheet.symbols())
    juncs = sheet.junctions()
    return sheet.src, wires, rects, texts, labels, syms, pins, juncs


def group_of(x, y, rects, names):
    for (x1, y1, x2, y2) in rects:
        if x1 - 0.01 <= x <= x2 + 0.01 and y1 - 0.01 <= y <= y2 + 0.01:
            # The group's title text sits just inside the rectangle's
            # top-left corner. BOTH coordinates are needed: on this page the
            # Junction and Hi boost rectangles share x1 = 16.51, and matching
            # on x alone named one of them after the other.
            for t, (tx, ty) in names.items():
                if abs(tx - (x1 + 2.0)) < 0.1 and abs(ty - (y1 + 2.0)) < 0.1:
                    return t
            return f"({x1},{y1})"
    return "-"


def report(path):
    src, wires, rects, texts, labels, syms, pins, juncs = parse(path)
    # `sheet.rectangles()` already excludes everything inside `lib_symbols` by
    # extent, so this filter now only drops a small sheet-level rectangle.
    groups = [r for r in rects if r[0] > 5 and (r[2] - r[0]) > 10]
    total = sum(abs(a - c) + abs(b - d) for a, b, c, d in wires)
    longest = max(((abs(a - c) + abs(b - d), (a, b, c, d)) for a, b, c, d in wires),
                  default=(0, None))

    horiz = [s for s in wires if abs(s[1] - s[3]) < TOL]
    vert = [s for s in wires if abs(s[0] - s[2]) < TOL]
    cross, tees = set(), set()
    for h in horiz:
        hy = h[1]
        hx0, hx1 = sorted((h[0], h[2]))
        for v in vert:
            vx = v[0]
            vy0, vy1 = sorted((v[1], v[3]))
            if not (hx0 - TOL <= vx <= hx1 + TOL and vy0 - TOL <= hy <= vy1 + TOL):
                continue
            he = abs(vx - hx0) < TOL or abs(vx - hx1) < TOL
            ve = abs(hy - vy0) < TOL or abs(hy - vy1) < TOL
            if he and ve:
                continue
            (tees if (he or ve) else cross).add((round(vx, 3), round(hy, 3)))

    by_net = collections.defaultdict(list)
    for name, x, y, is_global in labels:
        by_net[name].append((group_of(x, y, groups, texts), x, y, is_global))

    dup = []
    for name, rows in sorted(by_net.items()):
        seen = collections.Counter(r[0] for r in rows)
        for g, n in seen.items():
            if n > 1:
                dup.append((name, g, n))

    print(f"=== {path}")
    print(f"  wires                        {len(wires)}")
    print(f"  total wire length            {total:.2f} mm")
    print(f"  longest wire                 {longest[0]:.2f} mm  {longest[1]}")
    print(f"  true crossings               {len(cross)}  {sorted(cross)}")
    print(f"  wire-to-wire tees            {len(tees)}")
    print(f"  junction dots                {len(juncs)}")
    print(f"  symbols placed               {len(syms)}")
    print(f"  symbol pin instances         {pins}")
    print(f"  global labels                {sum(1 for l in labels if l[3])}")
    print(f"  local labels                 {sum(1 for l in labels if not l[3])}")
    print(f"  nets carrying >1 label       "
          f"{sum(1 for v in by_net.values() if len(v) > 1)}")
    print(f"  DUPLICATE LABELS IN ONE GROUP {len(dup)}  {dup}")
    print(f"  group rectangles             {len(groups)}")
    print()


for p in sys.argv[1:]:
    report(p)
