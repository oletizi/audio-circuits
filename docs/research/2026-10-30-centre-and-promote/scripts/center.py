"""Centre a sheet's content on the horizontal axis, as a rigid translation.

Shifts every absolute x in the sheet BODY by one offset. `lib_symbols` holds
symbol-LOCAL geometry and is never touched. Prints the measurement it used, and
refuses rather than writing a sheet it cannot prove it translated rigidly.

    usage: center.py <in.kicad_sch> <out.kicad_sch> <frame_x0> <frame_x1>

THE FRAME IS AN ARGUMENT AND NOT A CONSTANT, deliberately: it is a property of
the installed KiCad's drawing sheet, not of this script. Measure it with
`./frame_svg.py <paper>` and pass what that prints. For US Letter landscape on
the KiCad in this tree it is `12.0 267.4`.

WHAT "CENTRED" MEANS HERE, stated because it is a choice and not the only one.
The extent is the min and max of the sheet body's ANCHOR COORDINATES - wire
ends, symbol origins, label and text positions, rectangle corners. It is NOT
the extent of the rendered ink: a symbol's body and its field text reach beyond
the origin the sheet records for it, by an amount that lives in `lib_symbols`
and in the font metrics. So this centres the drawing's coordinate extent, which
is the rule the page the reviewer approved was centred by, and the five pages
are produced by this one rule so that no page is centred by a different
definition from its neighbours. The ink extent is measured separately, off the
render, by `./ink_extent.py`.

PROVENANCE. This file was written for the hi-cut run of 2026-10-30 and lived
only in that session's scratchpad, which is destroyed between sessions; it is
committed here because it is the rule all five drafted Pultec pages were
centred by, and a rule that cannot be re-run is a figure in prose. Four things
changed in the move, each because reading it for a second use showed a way it
could report success over a sheet it had not translated:

  1. IT USED A `\\x01` SENTINEL WITHOUT CHECKING THE SOURCE FOR ONE. The byte
     stands in for the `lib_symbols` block during substitution and is swapped
     back afterwards; a source that already contained it would have had that
     byte replaced by the whole symbol library. Now refused by name.
  2. THE `(start x y)(end x y)` PAIR REGEX WAS NOT CHECKED FOR TOTALITY. It
     matches the two only when they are ADJACENT, which is true of a
     `rectangle` and false of an `arc`, whose `(mid ...)` sits between them. On
     an arc the pattern matches nothing, all three points stay where they were,
     and the old script printed its margins and exited 0. It now counts the
     literal `(start ` and `(end ` tokens in the body and refuses unless the
     pattern consumed every one. (`../scripts/coord_heads.py` establishes
     separately that these five sheets carry `arc`, `circle`, `center` and
     `mid` ONLY inside `lib_symbols`, so on these files the check passes - it
     is there for the next sheet, which may not.)
  3. RIGIDITY WAS CHECKED BY COUNTING COORDINATES, which a shifter that moved
     one coordinate by the wrong amount would pass. It now requires that the
     sorted coordinate list, re-read out of the WRITTEN file, differs from the
     sorted input list by exactly `dx` at every position - so the output
     formatter's rounding is inside the proof rather than outside it.
  4. A ZERO OFFSET IS A RESULT, NOT A SKIP. When `dx` is zero the file is still
     written and the output is asserted BYTE-IDENTICAL to the input. That is
     what lets an already-centred page - the approved hi-cut sheet - be run
     through the same rule as the other four and shown to be unchanged by it,
     instead of being exempted from the rule by hand.
"""
import re
import sys

SENTINEL = chr(1)


def split_lib_symbols(s):
    """(head, lib_symbols_block, tail) - the block is returned untouched."""
    i = s.find("(lib_symbols")
    if i < 0:
        return s, "", ""
    d = 0
    j = i
    while True:
        if s[j] == "(":
            d += 1
        elif s[j] == ")":
            d -= 1
            if d == 0:
                break
        j += 1
    return s[:i], s[i:j + 1], s[j + 1:]


XY = re.compile(r"\(xy (-?[\d.]+) (-?[\d.]+)\)")
AT = re.compile(r"\(at (-?[\d.]+) (-?[\d.]+)((?: -?[\d.]+)?)\)")
RECT = re.compile(r"\(start (-?[\d.]+) (-?[\d.]+)\)(\s*)\(end (-?[\d.]+) (-?[\d.]+)\)")


def xs_of(body):
    """Every absolute x the three patterns can see, in document order."""
    out = []
    for m in XY.finditer(body):
        out.append(float(m.group(1)))
    for m in AT.finditer(body):
        out.append(float(m.group(1)))
    for m in RECT.finditer(body):
        out.append(float(m.group(1)))
        out.append(float(m.group(4)))
    return out


def check_totality(body):
    """Refuse when a `(start`/`(end` token exists that the pair regex cannot see.

    See point 2 of the module docstring: an `arc` defeats the adjacency the
    pattern relies on, and the failure is silent.
    """
    pairs = len(RECT.findall(body))
    starts = len(re.findall(r"\(start ", body))
    ends = len(re.findall(r"\(end ", body))
    if starts != pairs or ends != pairs:
        raise SystemExit(
            "REFUSING: the body holds %d `(start ` and %d `(end ` tokens but the "
            "adjacent-pair pattern matched %d pairs. Something writes those two "
            "non-adjacently - an `(arc ...)` puts `(mid ...)` between them - and this "
            "script would leave every such coordinate exactly where it was while "
            "reporting a successful translation. Extend the pattern before translating "
            "this sheet." % (starts, ends, pairs))
    return pairs


def shift(body, dx):
    body = XY.sub(lambda m: "(xy %s %s)" % (fmt(float(m.group(1)) + dx), m.group(2)), body)
    body = AT.sub(lambda m: "(at %s %s%s)" % (fmt(float(m.group(1)) + dx), m.group(2), m.group(3)), body)
    body = RECT.sub(
        lambda m: "(start %s %s)%s(end %s %s)"
        % (fmt(float(m.group(1)) + dx), m.group(2), m.group(3), fmt(float(m.group(4)) + dx), m.group(5)),
        body,
    )
    return body


def fmt(v):
    r = round(v, 4)
    text = ("%.4f" % r).rstrip("0").rstrip(".")
    return text if text not in ("", "-0") else "0"


def main():
    if len(sys.argv) != 5:
        raise SystemExit(__doc__.strip().splitlines()[5].strip())
    src, dst, fx0, fx1 = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    s = open(src).read()

    if SENTINEL in s:
        raise SystemExit(
            "REFUSING: %s already contains the byte this script uses as its internal "
            "sentinel for the lib_symbols block (chr(1)). Substituting over it would "
            "replace that byte with the whole symbol library." % src)

    head, lib, tail = split_lib_symbols(s)
    if not lib:
        raise SystemExit(
            "REFUSING: no `(lib_symbols` block in %s. The block is what must be held out "
            "of the substitution - without finding it this script cannot tell "
            "symbol-local geometry from absolute page coordinates, and would move both."
            % src)
    body = head + SENTINEL + tail
    rects = check_totality(body)

    xs = xs_of(body)
    if not xs:
        raise SystemExit("no coordinates found in the sheet body - refusing rather than writing a copy")
    lo, hi = min(xs), max(xs)
    if hi - lo > fx1 - fx0:
        raise SystemExit(
            "content is %.3f mm wide and the frame is %.3f mm - centring cannot make it fit, "
            "so this is an arrangement question, not a translation" % (hi - lo, fx1 - fx0))
    target_lo = fx0 + (fx1 - fx0 - (hi - lo)) / 2
    dx = target_lo - lo

    moved = shift(body, dx)
    out = moved.replace(SENTINEL, lib)
    open(dst, "w").write(out)

    # Re-READ what was written, so the formatter's rounding is inside the proof.
    written = open(dst).read()
    whead, wlib, wtail = split_lib_symbols(written)
    wbody = whead + SENTINEL + wtail
    xs2 = xs_of(wbody)

    print("content x      %.3f .. %.3f   (%.3f wide)" % (lo, hi, hi - lo))
    print("frame  x       %.3f .. %.3f   (%.3f wide)" % (fx0, fx1, fx1 - fx0))
    print("offset applied %+.4f mm" % dx)
    print("content now    %.3f .. %.3f" % (min(xs2), max(xs2)))
    print("margins        west %.3f   east %.3f" % (min(xs2) - fx0, fx1 - max(xs2)))
    print("rectangles     %d, every `(start`/`(end` token consumed by the pair pattern" % rects)
    print("coordinate count unchanged:", len(xs) == len(xs2), "(%d)" % len(xs))
    print("lib_symbols bytes unchanged:", lib == wlib)

    if len(xs) != len(xs2):
        raise SystemExit(
            "REFUSING: %d coordinates went in and %d came out, so this is not a translation."
            % (len(xs), len(xs2)))
    if lib != wlib:
        raise SystemExit("REFUSING: the lib_symbols block changed; symbol-local geometry must not move.")

    # THE RIGIDITY PROOF. Sorted, so it does not depend on document order, and
    # read back off disk, so rounding in `fmt` cannot hide in it.
    worst = max(abs((b - a) - dx) for a, b in zip(sorted(xs), sorted(xs2)))
    print("every coordinate moved by exactly the offset: %s (worst deviation %.2e mm)"
          % (worst <= 5e-5, worst))
    if worst > 5e-5:
        raise SystemExit(
            "REFUSING: at least one coordinate moved by %.6f mm more or less than the "
            "offset, so this is not a rigid translation." % worst)

    # A ZERO OFFSET MUST BE A NO-OP ON THE BYTES, not merely on the geometry.
    #
    # THE TEST IS `abs(dx) <= 5e-5` AND NOT `dx == 0`, AND THE DIFFERENCE IS THE
    # WHOLE VALUE OF THE CHECK. An already-centred sheet does not give exactly
    # zero: `dx` is computed through a subtraction and a halving, so the
    # approved hi-cut page gives -3.6e-14 and prints as `-0.0000`. Under
    # `dx == 0` this assertion was DEAD on precisely the two sheets it exists to
    # protect - the approved page, whose bytes must not move, and the mid page -
    # and it passed them silently without comparing anything. 5e-5 is the same
    # tolerance the rigidity proof above uses, which is the point below which
    # `fmt` cannot render a difference anyway.
    if abs(dx) <= 5e-5:
        same = written == s
        print("offset is zero to within the formatter's resolution (%+.2e mm), so the output "
              "must be byte-identical to the input: %s" % (dx, same))
        if not same:
            raise SystemExit(
                "REFUSING: the offset is zero but the bytes changed. The formatter has "
                "rewritten a coordinate it was not asked to move - on an already-approved "
                "page that would silently break its binding to its recorded digest.")
    # The symmetry the whole script is for, reported rather than asserted exactly:
    # it is exact only when the offset lands on the coordinate grid.
    print("margin asymmetry %.2e mm" % abs((min(xs2) - fx0) - (fx1 - max(xs2))))


if __name__ == "__main__":
    main()
