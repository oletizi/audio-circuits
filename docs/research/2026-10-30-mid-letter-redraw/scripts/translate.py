"""Translate every coordinate in a sheet's BODY by a constant, and set the paper.

WHY THIS EXISTS, AND WHY IT IS A SEPARATE STEP. Five of the six groups on the
approved `pultec-mid` page - the Junction and the four stand-ins - are at
placements the reviewer has already looked at. Moving the page onto a smaller
sheet moves them, and the honest way to move a region a reviewer has accepted
is to move it RIGIDLY: one offset, applied to everything, so the only thing that
changed about those groups is where the page's origin is.

akcli has no translate operation, and `move_component` moves one part at a time
and carries its field offsets and angles with it (repair class 5). So this is a
literal transform, and it is written to be checkable rather than trusted:

  - it rewrites coordinates through the PARSE, by byte offset, never by pattern.
    `docs/research/lib/kicad_sheet.py` exists because six committed scripts
    reported confident wrong numbers from patterns that understood one of the
    two textual forms a sheet uses.
  - it REFUSES when the number of nodes the parse found for a head does not
    equal the number of `(<head> ` tokens the file holds. A transform that
    silently skips a coordinate produces a drawing with one wire in the wrong
    place, which is a connectivity defect.
  - it REFUSES to touch anything inside `lib_symbols`. Those coordinates are
    symbol-local; translating them would move every pin relative to its own
    body, which is how a page ends up looking right and being wrong.
  - it REFUSES a node that carries child lists where it expects only numbers.

VERIFICATION IS THE CALLER'S JOB AND IT IS CHEAP: `extent.py` on both sides must
differ by exactly the offset, and the netlist must be identical. Both are in
`run.sh`.

usage: translate.py <in.kicad_sch> <out.kicad_sch> <dx_mm> <dy_mm> [paper]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

# Heads whose first two atoms are an (x, y) in SHEET space.
HEADS = ("at", "xy", "start", "end", "center", "mid")


def num(v):
    """KiCad writes 139.7 rather than 139.7000, and 254 rather than 254.0."""
    return f"{v:.4f}".rstrip("0").rstrip(".")


def main():
    src_path, out_path = sys.argv[1], sys.argv[2]
    dx, dy = float(sys.argv[3]), float(sys.argv[4])
    paper = sys.argv[5] if len(sys.argv) > 5 else None

    sheet = kicad_sheet.read(src_path)
    src = sheet.src
    lib = sheet.root.kid("lib_symbols")
    if lib is None:
        raise SystemExit("REFUSING: no lib_symbols block - this is not a sheet "
                         "this transform understands")

    edits = []
    counts = {}
    for head in HEADS:
        nodes = list(sheet.root.walk(head))
        tokens = kicad_sheet.token_count(src, head)
        if len(nodes) != tokens:
            raise SystemExit(
                "REFUSING: the parse found %d (%s ...) nodes but the file holds "
                "%d '(%s ' tokens. A transform that drops one coordinate "
                "produces a drawing with a wire in the wrong place."
                % (len(nodes), head, tokens, head))
        inside = outside = 0
        for n in nodes:
            if n.start >= lib.start and n.end <= lib.end:
                inside += 1
                continue
            if n.lists:
                raise SystemExit(
                    "REFUSING: a (%s ...) at offset %d carries child lists; "
                    "this transform expects numbers only" % (head, n.start))
            vals = kicad_sheet.nums(n, "a (%s" % head)
            if len(vals) < 2:
                raise SystemExit(
                    "REFUSING: a (%s ...) at offset %d has %d numbers, not 2+"
                    % (head, n.start, len(vals)))
            rest = n.atoms[2:]
            body = " ".join([num(vals[0] + dx), num(vals[1] + dy)] + list(rest))
            edits.append((n.start, n.end, "(%s %s)" % (head, body)))
            outside += 1
        counts[head] = (outside, inside)

    # Apply back-to-front so earlier offsets stay valid.
    edits.sort(key=lambda e: e[0], reverse=True)
    for s, e, text in edits:
        src = src[:s] + text + src[e:]

    if paper:
        old = sheet.root.kid("paper")
        if old is None:
            raise SystemExit("REFUSING: the sheet has no (paper ...) line")
        want = '(paper "%s")' % paper
        got = src[old.start:old.end]
        if src.count(got) != 1:
            raise SystemExit("REFUSING: %d matches for %r"
                             % (src.count(got), got))
        src = src.replace(got, want, 1)

    with open(out_path, "w") as fh:
        fh.write(src)

    print("translated %s -> %s by (%+.2f, %+.2f) mm" % (src_path, out_path, dx, dy))
    for head in HEADS:
        out, ins = counts[head]
        print("  (%-7s %4d translated in the body, %4d left alone in lib_symbols"
              % (head, out, ins))
    print("  %d coordinate nodes rewritten in total"
          % sum(c[0] for c in counts.values()))
    if paper:
        print("  paper set to %r" % paper)


if __name__ == "__main__":
    main()
