"""Positive controls for `kicad_sheet.py` and for the six checks it repairs.

**A CHECK THAT CANNOT FAIL IS THE FAILURE MODE THIS REPOSITORY EXISTS TO
PREVENT**, and on 2026-10-29 the mid run found one of its own controls placed in
the wrong part of the file, reporting nothing while looking like a pass: it set
the sheet's first `(width 0.254)` to zero, which belongs to a symbol graphic in
`lib_symbols` rather than to a wire, and the counter read 0 both ways.

So every control here does three things, and the third is the one that run
missed:

  1. measures a real committed sheet and records the number;
  2. perturbs the sheet and measures again, **asserting the number MOVES**;
  3. asserts the perturbation landed on the kind of object the check counts -
     by naming the object and checking it is of that kind before editing it,
     never by editing the first textual match.

Several controls also run the SUPERSEDED instrument beside the repaired one and
assert that the old one's number moves where the new one's does not. That is the
form of control that proves a parser was form-dependent rather than merely
asserting it.

usage: python3 docs/research/lib/selftest.py
exit 0 if every control moved; exit 1, loudly, otherwise.
"""
import math
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import kicad_sheet  # noqa: E402

REPO = HERE.parents[2]
RESEARCH = REPO / "docs/research"

MID = RESEARCH / "2026-10-29-mid-full-run/mid-hybrid.kicad_sch"
HICUT = RESEARCH / "2026-10-29-hi-cut-full-run/hi-cut-hybrid.kicad_sch"

SHEETS = [
    RESEARCH / "2026-10-29-hybrid-pass-1/hybrid-pass-1.kicad_sch",
    RESEARCH / "2026-10-29-low-cut-full-run/low-cut-hybrid.kicad_sch",
    RESEARCH / "2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch",
    RESEARCH / "2026-10-29-hi-boost-full-run/hi-boost-hybrid.kicad_sch",
    RESEARCH / "2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch",
    HICUT,
    MID,
]

FAILURES = []
LINES = []


def report(name, detail):
    LINES.append(f"  PASS  {name}")
    for d in detail:
        LINES.append(f"          {d}")


def fail(name, why):
    FAILURES.append(f"{name}: {why}")
    LINES.append(f"  FAIL  {name}")
    LINES.append(f"          {why}")


def moved(name, baseline, perturbed, detail):
    if baseline == perturbed:
        fail(name, f"the control did not move the number: {baseline} both ways - "
                   f"this control proves nothing and must be rewritten")
        return
    report(name, detail + [f"baseline {baseline}  perturbed {perturbed}  MOVED"])


def src_of(path):
    with open(path) as fh:
        return fh.read()


def anchor(src, needle, what):
    """Locate a needle exactly once, or refuse.

    A control that edits the FIRST textual match is how the mid run perturbed a
    symbol graphic while believing it had perturbed a wire. Requiring a unique
    anchor is the cheapest guard against that.
    """
    n = src.count(needle)
    if n != 1:
        raise SystemExit(
            f"control anchor for {what} occurs {n} times, not once: {needle!r} - "
            f"the control cannot prove which object it perturbed")
    return src.index(needle)


# --------------------------------------------------------------------------
# DEFECT 1 - library pins come in two textual forms
# --------------------------------------------------------------------------

OLD_PIN_RE = r"\(pin \w+ \w+\n\s*\(at ([-\d.]+) ([-\d.]+) \d+\)"


def control_two_pin_forms():
    name = "D1 two pin forms: the one-line power pins resolve"
    sheet = kicad_sheet.read(MID)
    table = sheet.lib_pins()

    oneline = {k: v for k, v in table.items() if k.startswith("copperhead_power:")}
    if not oneline:
        return fail(name, "no copperhead_power entry on this sheet to control on")

    # The number the broken instrument reported, measured rather than quoted.
    old_total = 0
    new_total = 0
    for lib_id, entry in sheet.lib_entries().items():
        if not lib_id.startswith("copperhead_power:"):
            continue
        blk = sheet.src[entry.start:entry.end]
        if "\n" in blk[blk.index("(pin "):blk.index("(pin ") + 24]:
            return fail(name, f"{lib_id}'s pin is not written on one line, so this "
                              f"sheet cannot control the one-line form")
        old_total += len(re.findall(OLD_PIN_RE, blk))
        new_total += len(table[lib_id])

    placed = [s for s in sheet.symbols() if s.lib_id.startswith("copperhead_power:")]
    moved(name, old_total, new_total, [
        f"{len(placed)} placed power symbols on {MID.name}, "
        f"{len(oneline)} one-line library entries",
        "the superseded newline-only pattern resolves the first number, "
        "the parenthesis reader the second",
    ])

    # And the converse half: the repaired reader must be INDIFFERENT to the form.
    # Rewrite the one-line pins into the two-line form and assert the count holds.
    rewritten = re.sub(r"\(pin (\w+) (\w+) \(at ",
                       lambda m: f"(pin {m.group(1)} {m.group(2)}\n\t\t\t\t(at ",
                       sheet.src)
    if rewritten == sheet.src:
        return fail(name + " (form indifference)",
                    "the rewrite changed nothing, so it controls nothing")
    after = kicad_sheet.Sheet(rewritten, "rewritten-to-two-line-form")
    a = sum(len(v) for v in after.lib_pins().values())
    b = sum(len(v) for v in table.values())
    nm = name + " (form indifference)"
    if a != b:
        fail(nm, f"reformatting every pin to the two-line form changed the pin "
                 f"count from {b} to {a} - the reader is still form-dependent")
    else:
        report(nm, [f"{b} library pins before and after reformatting every pin "
                    f"to the other textual form - form-independent",
                    f"the superseded pattern on the same reformatted source: "
                    f"{len(re.findall(OLD_PIN_RE, rewritten))}"])


def control_pin_guard_fires():
    name = "D1 pin guard fires on an unaccounted pin"
    sheet = kicad_sheet.read(MID)
    entry = sheet.lib_entries()["Device:R"]
    blk = sheet.src[entry.start:entry.end]
    if "(pin " not in blk:
        return fail(name, "Device:R has no pin to perturb")
    # Add a `(pin` TOKEN the parse cannot account for, inside a quoted atom, so
    # the token count rises while the tree does not. The guard must refuse.
    needle = '(property "ki_keywords" "R res'
    if needle not in sheet.src:
        return fail(name, f"no unique anchor {needle!r} to inject into")
    poisoned = sheet.src.replace(needle, needle + " (pin x", 1)
    try:
        kicad_sheet.Sheet(poisoned, "poisoned").lib_pins()
    except kicad_sheet.SheetParseError as exc:
        return report(name, [
            "a '(pin' token the tree cannot account for makes the reader refuse "
            "instead of returning a short list",
            f"refusal: {str(exc)[:120]}"])
    fail(name, "the reader accepted a source whose '(pin' tokens it did not "
               "account for - the guard does not fire")


# --------------------------------------------------------------------------
# DEFECT 2 and 5 - endpoint-only tests
# --------------------------------------------------------------------------

def control_interior_vs_endpoint():
    name = "D2/D5 a pin on a wire INTERIOR is seen"
    sheet = kicad_sheet.read(MID)
    target = None
    for s in sheet.symbols():
        for p in sheet.lib_pins().get(s.lib_id, []):
            dx, dy = kicad_sheet.rotate(p.sx, -p.sy, s.rot)
            px, py = round(s.x + dx, 3), round(s.y + dy, 3)
            h = kicad_sheet.wire_hits(px, py, sheet.wires())
            if h.interiors and not h.endpoints:
                target = (s.ref, px, py, h)
    if target is None:
        return fail(name, "no pin on this sheet sits on a wire interior, so the "
                          "sheet cannot control this blind spot")
    ref, px, py, h = target
    w = h.wires[0]

    # Perturb the WIRE this pin sits on - the object the check counts - by
    # shortening it so the pin is no longer on it.
    old = f"(xy {_n(w.x1)} {_n(w.y1)}) (xy {_n(w.x2)} {_n(w.y2)})"
    if old not in sheet.src:
        return fail(name, f"cannot locate the wire's own (pts text {old!r}")
    anchor(sheet.src, old, f"the wire under {ref}")
    shorter_x = w.x1 + (w.x2 - w.x1) * 0.25
    new = f"(xy {_n(w.x1)} {_n(w.y1)}) (xy {_n(round(shorter_x, 3))} {_n(w.y2)})"
    perturbed = kicad_sheet.Sheet(sheet.src.replace(old, new, 1), "shortened")
    h2 = kicad_sheet.wire_hits(px, py, perturbed.wires())
    moved(name, h.through, h2.through, [
        f"{ref}'s pin at ({px}, {py}) lies on the interior of a "
        f"{w.length:.2f} mm wire: through {h.through}, endpoints {h.endpoints}",
        "the superseded endpoint-only test reports "
        f"{h.endpoints} and says NO WIRE touches this anchor",
        f"shortening that wire to {abs(shorter_x - w.x1):.2f} mm drops the count",
    ])


def _n(v):
    """Render a coordinate the way KiCad writes it."""
    return f"{v:g}"


# --------------------------------------------------------------------------
# DEFECT 2 - orphan junctions
# --------------------------------------------------------------------------

def orphan_count(sheet):
    """A junction is an orphan when fewer than two things meet at it, counting
    WIRES THROUGH IT (interior or endpoint) and SYMBOL PINS."""
    wires = sheet.wires()
    pins = sheet.pin_points()
    n = 0
    for x, y, _ in sheet.junctions():
        w = kicad_sheet.wire_hits(x, y, wires).through
        p = 1 if (x, y) in pins else 0
        if w + p < 2:
            n += 1
    return n


def control_orphan_count():
    name = "D2 orphan-junction count moves when a real orphan is added"
    sheet = kicad_sheet.read(MID)
    base = orphan_count(sheet)
    # A point far from every wire and every pin: an unambiguous orphan.
    x, y = 10.0, 10.0
    if any(w.contains(x, y) for w in sheet.wires()) or (x, y) in sheet.pin_points():
        return fail(name, f"({x}, {y}) is not empty on this sheet")
    marker = '\t(junction (at 10 10) (diameter 0) (color 0 0 0 0)\n\t\t(uuid "00000000-0000-0000-0000-000000000001")\n\t)\n'
    idx = sheet.src.index("\n\t(junction ") + 1
    perturbed = kicad_sheet.Sheet(
        sheet.src[:idx] + marker + sheet.src[idx:], "with-one-orphan")
    moved(name, base, orphan_count(perturbed),
          [f"{len(sheet.junctions())} junctions on {MID.name}, {base} orphan",
           "one junction dot added at (10, 10), where no wire passes and no pin sits"])


# --------------------------------------------------------------------------
# DEFECT 3 - wires come in two textual forms
# --------------------------------------------------------------------------

OLD_WIRE_RE_SPACE = r"\(wire \(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)"


def control_two_wire_forms():
    name = "D3 every wire is parsed in both textual forms"
    sheet = kicad_sheet.read(MID)
    new = len(sheet.wires())
    old = len(re.findall(OLD_WIRE_RE_SPACE, sheet.src))
    if old == new:
        return fail(name, f"the superseded literal-space pattern already finds all "
                          f"{new} wires on {MID.name}, so this sheet controls nothing")
    # Reformat every block-form wire onto one line: the repaired reader must not
    # move, the superseded pattern must.
    flat = re.sub(r"\(wire\n\s*\(pts ", "(wire (pts ", sheet.src)
    if flat == sheet.src:
        return fail(name, "no block-form wire to reformat")
    after = kicad_sheet.Sheet(flat, "flattened")
    old_after = len(re.findall(OLD_WIRE_RE_SPACE, flat))
    if len(after.wires()) != new:
        return fail(name, f"the reader moved from {new} to {len(after.wires())} "
                          f"when the FORM changed and the content did not")
    if {w.pts for w in after.wires()} != {w.pts for w in sheet.wires()}:
        return fail(name, "the reader returned a different wire SET for the same "
                          "content in another form")
    moved(name + " (superseded pattern is form-dependent)", old, old_after, [
        f"{new} wires on {MID.name}; the repaired reader reports {new} in either form",
        f"the superseded literal-space pattern reports {old} of {new} as committed "
        f"and {old_after} of {new} once the form is flattened",
    ])


def control_wire_guard_fires():
    name = "D3 wire guard fires on an unaccounted wire token"
    sheet = kicad_sheet.read(MID)
    needle = '(property "ki_keywords" "R res'
    if needle not in sheet.src:
        return fail(name, f"no anchor {needle!r} to inject into")
    poisoned = sheet.src.replace(needle, needle + " (wire x", 1)
    try:
        kicad_sheet.Sheet(poisoned, "poisoned").wires()
    except kicad_sheet.SheetParseError as exc:
        return report(name, [
            "a '(wire' token the tree cannot account for makes the reader refuse "
            "instead of printing a short count",
            f"refusal: {str(exc)[:140]}"])
    fail(name, "the reader accepted a source whose '(wire' tokens it did not "
               "account for - the guard does not fire")


# --------------------------------------------------------------------------
# DEFECT 4 - a lib_symbols entry's extent
# --------------------------------------------------------------------------

def old_lib_entry_span(src, lib_id):
    """The superseded span: find the next entry by indentation, else run to EOF.

    This is the bug reproduced on purpose, so the control can show that the
    repaired reader does not have it.
    """
    m = re.search(r'^\t\t\(symbol "' + re.escape(lib_id) + r'"\n', src, re.M)
    if m is None:
        raise SystemExit(f"{lib_id} is not a lib_symbols entry of this sheet")
    start = m.end()
    nxt = re.search(r'^\t\t\(symbol "[^"]+"\n', src[start:], re.M)
    end = start + (nxt.start() if nxt else len(src) - start)
    return start, end


def control_lib_entry_span():
    name = "D4 the last lib_symbols entry does not absorb the sheet"
    sheet = kicad_sheet.read(HICUT)
    entries = list(sheet.lib_entries())
    last = entries[-1]
    if last != "Switch:SW_Rotary_1x6_MP":
        return fail(name, f"the last entry on {HICUT.name} is {last}, not the "
                          f"rotary switch this control was measured against")

    sw1 = [s for s in sheet.symbols() if s.ref == "SW1"]
    if len(sw1) != 1:
        return fail(name, f"{len(sw1)} symbols named SW1, expected 1")
    sw1 = sw1[0]
    if sw1.lib_id != last:
        return fail(name, f"SW1 is a {sw1.lib_id}, not the last entry")

    loboost = (158.75, 31.75, 198.12, 67.31)

    def sw1_points_in(rect, pts):
        x1, y1, x2, y2 = rect
        out = []
        for sx, sy in pts:
            dx, dy = kicad_sheet.rotate(sx, -sy, sw1.rot)
            x, y = round(sw1.x + dx, 3), round(sw1.y + dy, 3)
            if x1 - 0.01 <= x <= x2 + 0.01 and y1 - 0.01 <= y <= y2 + 0.01:
                out.append((x, y))
        return out

    new_pts = sheet.lib_graphics()[last]
    s, e = old_lib_entry_span(sheet.src, last)
    old_pts = [(float(a), float(b)) for a, b in
               re.findall(r"\(xy ([-\d.]+) ([-\d.]+)\)", sheet.src[s:e])]

    new_in = sw1_points_in(loboost, new_pts)
    old_in = sw1_points_in(loboost, old_pts)
    moved(name, len(old_in), len(new_in), [
        f"the entry's own span is {e - s} characters by the superseded search "
        f"and {sheet.lib_entries()[last].end - sheet.lib_entries()[last].start} "
        f"by the parse - the search runs to the end of the file because no "
        f"further entry follows it",
        f"SW1 sits at ({sw1.x}, {sw1.y}); its library extent is "
        f"sx {min(p[0] for p in new_pts)}..{max(p[0] for p in new_pts)}, "
        f"sy {min(p[1] for p in new_pts)}..{max(p[1] for p in new_pts)} mm",
        f"points attributed to SW1 inside the Lo boost rectangle {loboost}: "
        f"{len(old_in)} by the superseded span, {len(new_in)} by the parse",
    ])


# --------------------------------------------------------------------------
# DEFECT 4 - a margin responds to a move
# --------------------------------------------------------------------------

def group_margins(sheet, rect):
    """(left, right, top, bottom) of the graphics inside one rectangle, and the
    instance that owns each extreme."""
    x1, y1, x2, y2 = rect
    pts = []
    for w in sheet.wires():
        pts += [(w.x1, w.y1, "wire"), (w.x2, w.y2, "wire")]
    table = sheet.lib_graphics()
    for s in sheet.symbols():
        for sx, sy in table.get(s.lib_id, []):
            dx, dy = kicad_sheet.rotate(sx, -sy, s.rot)
            pts.append((round(s.x + dx, 3), round(s.y + dy, 3), s.ref))
    inside = [p for p in pts
              if x1 - 0.01 <= p[0] <= x2 + 0.01 and y1 - 0.01 <= p[1] <= y2 + 0.01]
    if not inside:
        return None
    gx0 = min(p[0] for p in inside)
    gx1 = max(p[0] for p in inside)
    gy0 = min(p[1] for p in inside)
    gy1 = max(p[1] for p in inside)
    return (round(gx0 - x1, 3), round(x2 - gx1, 3),
            round(gy0 - y1, 3), round(y2 - gy1, 3))


def control_margin_responds():
    name = "D4 a group margin responds to moving the part that sets it"
    sheet = kicad_sheet.read(HICUT)
    rect = (50.8, 88.9, 271.78, 132.08)   # Hi cut, the group SW1 is in
    base = group_margins(sheet, rect)
    if base is None:
        return fail(name, "nothing inside the Hi cut rectangle")
    sw1 = [s for s in sheet.symbols() if s.ref == "SW1"][0]
    old = f'(lib_id "{sw1.lib_id}")'
    at_old = f"(at {_n(sw1.x)} {_n(sw1.y)} {sw1.rot})"
    # Confirm the object perturbed is the SYMBOL INSTANCE, not a library graphic.
    idx = anchor(sheet.src, old, "SW1's instance")
    tail = sheet.src[idx:idx + 400]
    if at_old not in tail:
        return fail(name, f"SW1's own (at is not within 400 characters of its "
                          f"(lib_id, so the control cannot prove what it moved")
    at_new = f"(at {_n(sw1.x)} {_n(round(sw1.y - 5.0, 3))} {sw1.rot})"
    perturbed = kicad_sheet.Sheet(
        sheet.src[:idx] + tail.replace(at_old, at_new, 1)
        + sheet.src[idx + 400:], "sw1-moved-5mm")
    after = group_margins(perturbed, rect)
    moved(name, base, after, [
        f"Hi cut rectangle {rect}",
        f"margins (left, right, top, bottom) with SW1 at y {sw1.y}",
        f"SW1 moved 5.00 mm north; the bottom margin moves "
        f"{abs(after[3] - base[3]):.2f} mm",
    ])


# --------------------------------------------------------------------------
# every sheet parses completely
# --------------------------------------------------------------------------

def control_all_sheets_complete():
    name = "every committed sheet parses completely"
    detail = []
    ok = True
    for p in SHEETS:
        try:
            sh = kicad_sheet.read(p)
            w = len(sh.wires())
            j = len(sh.junctions())
            pins = sum(len(v) for v in sh.lib_pins().values())
            sh.labels()
            sh.no_connects()
            sh.symbols()
            sh.pin_points()
            detail.append(f"{p.name:34s} wires {w:3d}  junctions {j:3d}  "
                          f"library pins {pins:3d}  placed pins {len(sh.pin_points()):3d}")
        except kicad_sheet.SheetParseError as exc:
            ok = False
            detail.append(f"{p.name:34s} REFUSED: {exc}")
    if ok:
        report(name, detail)
    else:
        fail(name, "a committed sheet did not parse completely:\n          "
                   + "\n          ".join(detail))


CONTROLS = [
    control_all_sheets_complete,
    control_two_pin_forms,
    control_pin_guard_fires,
    control_two_wire_forms,
    control_wire_guard_fires,
    control_interior_vs_endpoint,
    control_orphan_count,
    control_lib_entry_span,
    control_margin_responds,
]


def main():
    print("positive controls for docs/research/lib/kicad_sheet.py")
    print("=" * 72)
    for c in CONTROLS:
        c()
    print("\n".join(LINES))
    print("=" * 72)
    if FAILURES:
        print(f"{len(FAILURES)} CONTROL(S) FAILED")
        for f in FAILURES:
            print(f"  - {f}")
        raise SystemExit(1)
    print(f"{len(CONTROLS)} controls, every one moved or fired")


main()
