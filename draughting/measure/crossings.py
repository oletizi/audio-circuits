"""Count wire crossings on a .kicad_sch.

A crossing is a horizontal segment and a vertical segment that intersect at a
point that is an interior point of at least one of them and is not a shared
endpoint of both. T-meetings (endpoint of one landing on the interior of the
other) are reported separately from true X crossings.

**THE PARSE IS SHARED, AND THAT MATTERS HERE MORE THAN ANYWHERE.** A crossing
count is what the draft choice turns on - the hi-boost run traded 2 crossings
against 8 and said so was the largest undocumented decision in the run - so a
parser that silently returns a short list makes that trade on the wrong number.
The low-boost run's copy of this script used a pattern with a LITERAL SPACE
after `(wire`, which matches only the one-line form: on `pultec-mid` it finds
64 of 82 wires. It happened to be complete on that run's own sheets, which is
luck and not a property of the check. `kicad_sheet.py` parses by balanced
parentheses and refuses when its parse does not account for every `(wire`
token in the source.

PROMOTED to `draughting/measure/` from
`docs/research/2026-10-29-mid-full-run/scripts/crossings.py`. This script had
six byte-identical copies at promotion time
(`hybrid-pass-1`, `low-cut-full-run`, `hi-boost-full-run`, `hi-cut-full-run`,
`mid-full-run`) and one outlier,
`2026-10-29-low-boost-in-thompson-bell-idiom/scripts/crossings.py`.

**CORRECTION, fix round 1 of this task's own review.** This paragraph
originally claimed the outlier had "no shared-reader import" - that is
FALSE, and the review that caught it read the file rather than relaying a
claim about it: the outlier already reads through `kicad_sheet.py` (fixed by
commit `cedd922`, which landed before this task's own starting commit
`06d6776` - before the promotion work began at all). The LITERAL-SPACE bug
the paragraph above describes is real but historical; it does not describe
this file as it stood at promotion time. `dfa964e`'s own commit message
says the outlier was excluded for "the older literal-space wire pattern"
without qualifying that the pattern was historical rather than current,
which reads the same way and overstates the case the same way; that commit
is not amended here (new commits, not rewritten ones, is this project's own
rule), so this docstring is the correction of record for both.

The outlier is still genuinely weaker, for reasons that are true of the file
as it actually stands: it has no X-crossing/T-meeting split (one undivided
"interior crossings without a junction" count), it takes one sheet per
invocation rather than several, and it rounds coordinates to whole mils with
its own `MM = 1 / 0.0254` rather than using `kicad_sheet.TOL`, the shared
reader's own tolerance. Promoting the five-way-identical copy instead was
still the right call - it was simply right for the wrong stated reason. All
seven copies are left in their run directories unchanged; this is a
promotion of the identical majority, not a fix made in the move.

NOT CONSIDERED AS AN EIGHTH COPY, and the reason is recorded here so the
next person diffing copies does not have to re-establish it:
`docs/research/2026-10-29-trial-microsoft-schgen/scripts/count_crossings.py`.
It counts the same kind of thing (wire-segment crossings) but is a different
tool - a standalone regex-only script with no `kicad_sheet` import at all,
written for the abandoned Microsoft-schgen trial rather than for any Pultec
run, and it lives in the one directory `docs/research/2026-10-30-lying-checks.md`
names as dead (`2026-10-29-trial-microsoft-schgen/`). It is a different
script that happens to share a subject, not a copy of this one.

usage: crossings.py <sheet.kicad_sch> [<sheet.kicad_sch> ...]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import kicad_sheet  # noqa: E402

TOL = kicad_sheet.TOL


def classify(path):
    sheet = kicad_sheet.read(path)
    segs = sheet.wires()
    horiz = [s for s in segs if s.horizontal]
    vert = [s for s in segs if s.vertical]
    crossings = []
    tees = []
    for h in horiz:
        hy = h.y1
        hx0, hx1 = sorted((h.x1, h.x2))
        for v in vert:
            vx = v.x1
            vy0, vy1 = sorted((v.y1, v.y2))
            if not (hx0 - TOL <= vx <= hx1 + TOL and vy0 - TOL <= hy <= vy1 + TOL):
                continue
            h_end = abs(vx - hx0) < TOL or abs(vx - hx1) < TOL
            v_end = abs(hy - vy0) < TOL or abs(hy - vy1) < TOL
            if h_end and v_end:
                continue  # corner: shared endpoint
            if h_end or v_end:
                tees.append((vx, hy))
            else:
                crossings.append((vx, hy))
    return segs, horiz, vert, crossings, tees


for p in sys.argv[1:]:
    segs, horiz, vert, crossings, tees = classify(p)
    print(p)
    print(f"  wires {len(segs)}  (horizontal {len(horiz)}, vertical {len(vert)})"
          f"  - every '(wire' token accounted for, or this would have refused")
    print(f"  TRUE CROSSINGS (X): {len(crossings)}  {sorted(set(crossings))}")
    print(f"  T-meetings:         {len(tees)}  {sorted(set(tees))}")
    print()
