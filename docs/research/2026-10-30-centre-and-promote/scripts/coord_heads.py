"""Every list head in a sheet BODY, so a translation can be proved total.

WHY THIS EXISTS BEFORE THE TRANSLATION RUNS. `center.py` shifts absolute x by
matching three textual forms - `(xy x y)`, `(at x y [angle])` and an adjacent
`(start x y)(end x y)` pair. A regex shifter is only a rigid translation if
those three forms are ALL the absolute x in the file. Anything it does not
match stays where it was, and a sheet with one unshifted coordinate is not a
translated drawing - it is a drawing with one thing moved, which is the exact
failure the translation proofs are for. Two forms this repository's KiCad could
plausibly write are NOT matched by those three patterns:

  - `(arc (start ..) (mid ..) (end ..))` - the `mid` sits BETWEEN start and end,
    so the adjacent-pair regex does not match the arc at all and none of its
    three points move;
  - `(circle (center ..) (radius ..))` - `center` is matched by nothing.

So this script lists what is actually there rather than reasoning about what
might be. It parses with `../../lib/kicad_sheet.py`, whose own selftest covers
the two textual forms six hand-rolled parsers were dropping, and prints every
head reachable in the body with a count - `lib_symbols` excluded, because that
block holds symbol-LOCAL geometry and must not move.

POSITIVE CONTROL: the walk is also run over the `lib_symbols` block, which must
report heads the body does not (`pin`, `polyline`, `circle` ...). A walker that
silently traversed nothing would print an empty body list, and an empty list
would read as "no unhandled heads" - a clean bill of health from a broken tool.
"""
import argparse
import collections
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

# The heads `center.py` moves, by the textual form it matches them with.
HANDLED = {
    "xy": "(xy x y)",
    "at": "(at x y [angle])",
    "start": "(start x y) adjacent to (end x y)",
    "end": "(start x y) adjacent to (end x y)",
}

# Heads that carry no absolute page x and so must NOT move. Every one is either
# a dimension, an identifier, or a value.
NO_ABSOLUTE_X = {
    "kicad_sch", "version", "generator", "generator_version", "uuid", "paper",
    "title_block", "title", "date", "rev", "company", "comment",
    "lib_symbols", "symbol", "property", "pin", "number", "name", "effects",
    "font", "size", "thickness", "justify", "hide", "stroke", "width", "type",
    "color", "fill", "wire", "bus", "junction", "no_connect", "label",
    "global_label", "hierarchical_label", "text", "text_box", "rectangle",
    "polyline", "pts", "sheet_instances", "path", "page", "instances",
    "project", "reference", "unit", "exclude_from_sim", "in_bom", "on_board",
    "dnp", "fields_autoplaced", "lib_id", "lib_name", "bold", "italic",
    "diameter", "shape", "length", "pin_names", "pin_numbers", "offset",
    "autoplace_fields", "embedded_fonts", "fill_color", "members", "group",
    "symbol_instances", "bus_alias", "netclass_flag", "pinfunction", "pintype",
    "unlocked", "href", "alternate", "number_box", "default_instance",
    # `(mirror x)` - low-boost's potentiometer carries one. The `x` is an AXIS
    # TOKEN, not a coordinate: it names the symbol's own axis to flip about, so
    # it holds no absolute page x and a translation must leave it alone. The
    # symbol still moves rigidly, because its position is the `(at ...)` beside
    # it. It is listed here by name rather than left unclassified so that the
    # next unclassified head is a real finding and not this one again.
    "mirror",
}


def heads(node):
    out = collections.Counter()
    stack = [node]
    while stack:
        n = stack.pop()
        out[n.head] += 1
        for k in n.lists:
            stack.append(k)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheets", nargs="+")
    a = ap.parse_args()

    unhandled_any = False
    for path in a.sheets:
        src = pathlib.Path(path).read_text()
        root = kicad_sheet.parse(src)
        libs = [k for k in root.lists if k.head == "lib_symbols"]
        body_kids = [k for k in root.lists if k.head != "lib_symbols"]

        body = collections.Counter({root.head: 1})
        for k in body_kids:
            body.update(heads(k))
        lib = collections.Counter()
        for k in libs:
            lib.update(heads(k))

        print("=" * 78)
        print(path)
        print("  body heads (%d distinct):" % len(body))
        for h, n in sorted(body.items()):
            mark = "  MOVED by %s" % HANDLED[h] if h in HANDLED else ""
            flag = "" if h in HANDLED or h in NO_ABSOLUTE_X else "   <-- UNCLASSIFIED"
            if flag:
                unhandled_any = True
            print("    %-24s %5d%s%s" % (h, n, mark, flag))
        print("  lib_symbols heads (%d distinct, NEVER moved): %s"
              % (len(lib), ", ".join(sorted(lib))[:200]))

        only_lib = sorted(set(lib) - set(body))
        print("  CONTROL  heads present in lib_symbols and absent from the body: %d (%s)"
              % (len(only_lib), ", ".join(only_lib) or "NONE"))
        if not only_lib:
            raise SystemExit(
                "REFUSING: the walker found no head unique to lib_symbols. On a real sheet "
                "the symbol library carries graphics the body does not, so an empty "
                "difference means the walk is not traversing - and an empty body list would "
                "read as 'nothing unhandled', which is a broken tool's clean bill of health.")

        # The two forms a regex shifter would silently miss.
        for risky in ("arc", "bezier", "circle", "center", "mid"):
            if body.get(risky):
                unhandled_any = True
                print("    REFUSING-WORTHY: body carries %d `%s` - `center.py`'s three textual "
                      "forms do not move it" % (body[risky], risky))

    print()
    if unhandled_any:
        raise SystemExit(
            "REFUSING: at least one body head is not classified as moved-or-dimensionless. "
            "Extend center.py to cover it, or say why it carries no absolute page x - do not "
            "translate a sheet with a coordinate the shifter cannot see.")
    print("Every body head on every sheet is either moved by one of center.py's three "
          "textual forms or carries no absolute page x.")


if __name__ == "__main__":
    main()
