"""One reader for a KiCad schematic sheet, shared by every research script.

WHY THIS EXISTS, AND IT IS A MEASUREMENT RATHER THAN A PREFERENCE
=================================================================
Six committed measurement scripts reported confident wrong numbers across four
runs on 2026-10-29, and **four of the six were the same bug**: a parser that
understood one of the two textual forms a KiCad sheet uses, or that tested wire
ENDPOINTS and not wire INTERIORS. The per-script patch was tried first and it
is what settles the question:

  the mid run fixed the two-textual-forms bug in its OWN copies of
  `junction_audit.py` and `verify.py`, and left the hi-boost and hi-cut copies
  of `junction_audit.py` broken - 2 of the 3 copies on disk - where the next
  run would copy one forward. `TOOLING.md` then named one of the two broken
  copies as the script to trust.

A patch that did not propagate inside the session that wrote it will not
propagate across sessions. So the parse lives here, once.

`lib/kicad/sexpr.ts` already stated the principle, before any of these scripts
were written:

    Structure is determined by balanced parentheses with string awareness,
    never by indentation: KiCad reformats files freely and has changed its
    serialization between releases, so anything pattern-matching text layout
    eventually becomes silently wrong.

Every one of the four is that sentence coming true. This module is the Python
side of it; it is a transcription of that principle and not of that file's code,
and the two are separate implementations that can drift. The TypeScript reader
is the one the generator uses; this one is for the research scripts, which are
Python and are run by hand from a `run.sh`.

WHAT IT REFUSES, AND WHY NOT A SHORT LIST
=========================================
A parser that drops input must refuse, not return a short list. Every accessor
below counts the `(<head>` tokens in the source span it is reading and refuses
when the parse does not account for all of them. The refusal direction is
deliberately the safe one: a sheet that holds the literal text `(wire` inside a
quoted string will raise `SheetParseError` rather than quietly report one wire
too few. No sheet in this repository does, and a loud false refusal is what this
module is for.

USAGE
=====
    import sys, pathlib
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
    import kicad_sheet

    sheet = kicad_sheet.read(path)
    for w in sheet.wires():          ...
    for s in sheet.symbols():        ...
    sheet.pin_points()               set of (x, y) in sheet space
    kicad_sheet.wire_hits(x, y, sheet.wires())   -> Hits(through, endpoints)

Run `python3 docs/research/lib/selftest.py` for the positive controls. Each one
perturbs a sheet and asserts the number MOVES; a check that cannot fail is the
failure mode this whole repository exists to prevent.
"""
import math
import re

TOL = 0.001


class SheetParseError(Exception):
    """The parse did not account for everything the source holds."""


# --------------------------------------------------------------------------
# s-expression reader: balanced parentheses, string aware, never indentation
# --------------------------------------------------------------------------

_WS = " \t\r\n"


class Node:
    """One s-expression list.

    `head` is the first bare atom (`wire`, `at`, `symbol`); `atoms` are the
    remaining atoms in order, quoted or bare, unescaped; `lists` are the child
    lists in order. `start`/`end` are source offsets of the whole list, which is
    what makes an exact per-entry token count possible - see `lib_entry`.
    """

    __slots__ = ("head", "atoms", "lists", "start", "end")

    def __init__(self, head, atoms, lists, start, end):
        self.head = head
        self.atoms = atoms
        self.lists = lists
        self.start = start
        self.end = end

    def kids(self, head):
        return [n for n in self.lists if n.head == head]

    def kid(self, head):
        for n in self.lists:
            if n.head == head:
                return n
        return None

    def walk(self, head=None):
        """Every descendant list, depth first, optionally filtered by head."""
        for n in self.lists:
            if head is None or n.head == head:
                yield n
            yield from n.walk(head)

    def __repr__(self):
        return f"Node({self.head!r}, atoms={self.atoms!r}, {len(self.lists)} lists)"


def parse(src):
    """Read a document and return its single top-level list."""
    pos = 0
    n = len(src)

    def skip_ws():
        nonlocal pos
        while pos < n and src[pos] in _WS:
            pos += 1

    def read_quoted():
        nonlocal pos
        pos += 1  # the opening quote
        out = []
        while pos < n:
            c = src[pos]
            if c == "\\":
                if pos + 1 >= n:
                    raise SheetParseError("escape at end of file")
                out.append(src[pos + 1])
                pos += 2
                continue
            if c == '"':
                pos += 1
                return "".join(out)
            out.append(c)
            pos += 1
        raise SheetParseError("unterminated quoted atom")

    def read_bare():
        nonlocal pos
        start = pos
        while pos < n and src[pos] not in _WS and src[pos] not in "()\"":
            pos += 1
        if pos == start:
            raise SheetParseError(f"empty atom at offset {start}")
        return src[start:pos]

    def read_list():
        nonlocal pos
        start = pos
        pos += 1  # the opening paren
        head = None
        atoms = []
        lists = []
        while True:
            skip_ws()
            if pos >= n:
                raise SheetParseError("unbalanced parentheses")
            c = src[pos]
            if c == ")":
                pos += 1
                return Node(head, atoms, lists, start, pos)
            if c == "(":
                lists.append(read_list())
                continue
            if c == '"':
                atoms.append(read_quoted())
                continue
            bare = read_bare()
            if head is None and not atoms and not lists:
                head = bare
            else:
                atoms.append(bare)

    skip_ws()
    if pos >= n or src[pos] != "(":
        raise SheetParseError("the file does not open with a list")
    root = read_list()
    skip_ws()
    if pos != n:
        raise SheetParseError(
            f"trailing text after the top-level list at offset {pos}")
    return root


# --------------------------------------------------------------------------
# the token-count guard
# --------------------------------------------------------------------------

def token_count(src, head):
    """How many times `(<head>` opens a list in this source span.

    A list head is followed by whitespace, by a nested `(`, or by the closing
    `)` of an empty list. Requiring one of those is what keeps `(wire` from
    counting `(wire_note` - and it is a substring count, so it also counts an
    occurrence inside a quoted string. That is the safe direction: it makes the
    guard refuse rather than under-report. See the module docstring.
    """
    return len(re.findall(r"\(" + re.escape(head) + r"(?=[\s()])", src))


def nums(node, where="a list"):
    """The numeric atoms of a list.

    `(at 0 3.81 270)` parses to head `at` with atoms `["0", "3.81", "270"]`, and
    `(xy 72.39 88.9)` to head `xy` with atoms `["72.39", "88.9"]` - the head is
    the list's NAME and never the first number. The first draft of this module
    read `node.head` as the x coordinate and every accessor raised on the first
    sheet it was given, which is the behaviour to want from a reader that is
    wrong: a loud failure on the first run rather than a plausible number.
    """
    if node is None:
        raise SheetParseError(f"{where}: the list is missing")
    try:
        return [float(a) for a in node.atoms]
    except ValueError as exc:
        raise SheetParseError(
            f"{where}: ({node.head} {' '.join(node.atoms)}) is not numeric") from exc


def require_complete(parsed, src, head, where):
    if parsed != token_count(src, head):
        raise SheetParseError(
            f"{where}: parsed {parsed} '{head}' lists but the source span holds "
            f"{token_count(src, head)} '({head}' tokens - the parse is "
            f"incomplete, and a short list is what this guard exists to stop")


# --------------------------------------------------------------------------
# sheet accessors
# --------------------------------------------------------------------------

class Wire:
    __slots__ = ("x1", "y1", "x2", "y2", "width", "colour", "uuid")

    def __init__(self, x1, y1, x2, y2, width, colour, uuid):
        self.x1, self.y1, self.x2, self.y2 = x1, y1, x2, y2
        self.width, self.colour, self.uuid = width, colour, uuid

    @property
    def pts(self):
        return (self.x1, self.y1, self.x2, self.y2)

    @property
    def horizontal(self):
        return abs(self.y1 - self.y2) < TOL

    @property
    def vertical(self):
        return abs(self.x1 - self.x2) < TOL

    @property
    def length(self):
        return math.hypot(self.x2 - self.x1, self.y2 - self.y1)

    def contains(self, x, y, tol=TOL):
        """Does the point lie ON this segment, interior or endpoint?

        Orthogonal segments only, which is every wire on every sheet here; a
        diagonal raises rather than being silently mis-tested.
        """
        if self.vertical:
            return (abs(self.x1 - x) < tol
                    and min(self.y1, self.y2) - tol <= y <= max(self.y1, self.y2) + tol)
        if self.horizontal:
            return (abs(self.y1 - y) < tol
                    and min(self.x1, self.x2) - tol <= x <= max(self.x1, self.x2) + tol)
        raise SheetParseError(
            f"wire {self.uuid} is diagonal ({self.pts}) and `contains` only "
            f"handles orthogonal segments - add the case rather than guessing")

    def ends_at(self, x, y, tol=TOL):
        return ((abs(self.x1 - x) < tol and abs(self.y1 - y) < tol)
                or (abs(self.x2 - x) < tol and abs(self.y2 - y) < tol))

    def interior(self, x, y, tol=TOL):
        return self.contains(x, y, tol) and not self.ends_at(x, y, tol)

    def __repr__(self):
        return f"Wire({self.x1}, {self.y1}) -> ({self.x2}, {self.y2}) {self.uuid}"


class Pin:
    """A library pin's connection point in SYMBOL space, y up."""

    __slots__ = ("sx", "sy", "angle", "length", "kind", "shape", "hidden")

    def __init__(self, sx, sy, angle, length, kind, shape, hidden):
        self.sx, self.sy, self.angle, self.length = sx, sy, angle, length
        self.kind, self.shape, self.hidden = kind, shape, hidden

    def __repr__(self):
        return f"Pin({self.sx}, {self.sy}, {self.angle}deg, len {self.length})"


class Field:
    __slots__ = ("name", "text", "x", "y", "angle", "size", "hidden")

    def __init__(self, name, text, x, y, angle, size, hidden):
        self.name, self.text = name, text
        self.x, self.y, self.angle, self.size, self.hidden = x, y, angle, size, hidden


class Symbol:
    __slots__ = ("lib_id", "x", "y", "rot", "ref", "value", "fields", "node")

    def __init__(self, lib_id, x, y, rot, ref, value, fields, node):
        self.lib_id, self.x, self.y, self.rot = lib_id, x, y, rot
        self.ref, self.value, self.fields, self.node = ref, value, fields, node

    def __repr__(self):
        return f"Symbol({self.ref} {self.lib_id} at ({self.x}, {self.y}) rot {self.rot})"


class Hits:
    """How a point meets the wires: `through` counts containment, `endpoints`
    counts only the wires that END there.

    BOTH ARE RETURNED ON PURPOSE. `orphan_junctions.py` and `pwr_survey.py`
    each reported a false negative because they tested endpoints only, and the
    mid run found `pwr_survey.py` saying "NO WIRE touches this anchor" for a pin
    sitting in the middle of the 15.24 mm link it terminates. A caller that
    wants endpoints has to say so.
    """

    __slots__ = ("through", "endpoints", "interiors", "wires")

    def __init__(self, wires_through, wires_ending, wires_interior):
        self.wires = wires_through
        self.through = len(wires_through)
        self.endpoints = len(wires_ending)
        self.interiors = len(wires_interior)

    def __repr__(self):
        return (f"Hits(through={self.through}, endpoints={self.endpoints}, "
                f"interiors={self.interiors})")


def wire_hits(x, y, wires, tol=TOL):
    through = [w for w in wires if w.contains(x, y, tol)]
    ending = [w for w in through if w.ends_at(x, y, tol)]
    interior = [w for w in through if not w.ends_at(x, y, tol)]
    return Hits(through, ending, interior)


def rotate(dx, dy, rot):
    """Symbol-space offset to sheet-space offset.

    Verified against `akcli pins <lib_id> --rotation R` for Device:C, Device:L,
    Device:R, Device:R_Potentiometer and Switch:SW_Rotary_1x6_MP by the hi-boost
    hairpin-fix run; carried here unchanged.
    """
    if rot == 0:
        return dx, dy
    if rot == 90:
        return dy, -dx
    if rot == 180:
        return -dx, -dy
    if rot == 270:
        return -dy, dx
    raise SheetParseError(f"unhandled rotation {rot}")


class Sheet:
    def __init__(self, src, path=None):
        self.src = src
        self.path = path
        self.root = parse(src)
        if self.root.head != "kicad_sch":
            raise SheetParseError(
                f"top-level list is '{self.root.head}', not 'kicad_sch'")
        self._wires = None
        self._lib_pins = None
        self._lib_graphics = None
        self._symbols = None

    # -- wires ------------------------------------------------------------
    def wires(self):
        if self._wires is None:
            out = []
            for w in self.root.walk("wire"):
                pts = w.kid("pts")
                if pts is None:
                    raise SheetParseError(f"a wire at offset {w.start} has no (pts")
                xy = pts.kids("xy")
                if len(xy) != 2:
                    raise SheetParseError(
                        f"the wire at offset {w.start} has {len(xy)} (xy points, "
                        f"not 2 - a polyline wire needs its own handling")
                (x1, y1), (x2, y2) = (nums(p, "a wire (xy")[:2] for p in xy)
                stroke = w.kid("stroke")
                width = colour = None
                if stroke is not None:
                    wn = stroke.kid("width")
                    width = nums(wn)[0] if wn else None
                    cn = stroke.kid("color")
                    if cn is not None:
                        colour = " ".join(cn.atoms)
                un = w.kid("uuid")
                out.append(Wire(round(x1, 3), round(y1, 3), round(x2, 3),
                                round(y2, 3), width, colour,
                                un.atoms[0] if un and un.atoms else None))
            require_complete(len(out), self.src, "wire", self.path or "sheet")
            self._wires = out
        return self._wires

    # -- junctions, labels, no-connects -----------------------------------
    def junctions(self):
        out = []
        for j in self.root.walk("junction"):
            at = j.kid("at")
            un = j.kid("uuid")
            jx, jy = nums(at, "a junction (at")[:2]
            out.append((round(jx, 3), round(jy, 3),
                        un.atoms[0] if un and un.atoms else None))
        require_complete(len(out), self.src, "junction", self.path or "sheet")
        return out

    def labels(self):
        """[(kind, text, x, y, angle, shape, node)] for every label kind."""
        out = []
        for kind in ("label", "global_label", "hierarchical_label"):
            for n in self.root.walk(kind):
                at = n.kid("at")
                shape = n.kid("shape")
                a = nums(at, f"a {kind} (at")
                out.append((kind, n.atoms[0] if n.atoms else "",
                            a[0], a[1], int(a[2]) if len(a) > 2 else 0,
                            shape.atoms[0] if shape and shape.atoms else None, n))
            require_complete(len([o for o in out if o[0] == kind]),
                             self.src, kind, self.path or "sheet")
        return out

    def no_connects(self):
        out = []
        for n in self.root.walk("no_connect"):
            at = n.kid("at")
            un = n.kid("uuid")
            nx, ny = nums(at, "a no_connect (at")[:2]
            out.append((nx, ny, un.atoms[0] if un and un.atoms else None))
        require_complete(len(out), self.src, "no_connect", self.path or "sheet")
        return out

    # -- lib_symbols ------------------------------------------------------
    def lib_entries(self):
        """lib_id -> the entry's Node.

        **THE ENTRY'S EXTENT COMES FROM THE PARSE, NOT FROM A SEARCH FOR THE
        NEXT ONE.** `boxgeom.py` found an entry's end by searching for the next
        `^\\t\\t(symbol "` and fell back to the end of the FILE when there was
        none, so the LAST entry in `lib_symbols` absorbed every coordinate on
        the sheet. On `hi-cut-hybrid.kicad_sch` that entry is
        `Switch:SW_Rotary_1x6_MP`, which is why `boxgeom.py` named `SW1` as the
        extreme item inside three rectangles SW1 is not in, and reported a
        0.00 mm bottom margin where the render shows 2.5 mm.
        """
        lib = self.root.kid("lib_symbols")
        if lib is None:
            raise SheetParseError("the sheet has no (lib_symbols block")
        out = {}
        for e in lib.kids("symbol"):
            if not e.atoms:
                raise SheetParseError(f"a lib_symbols entry at {e.start} has no name")
            lib_id = e.atoms[0]
            if ":" not in lib_id:
                continue
            out[lib_id] = e
        return out

    def lib_pins(self):
        """lib_id -> [Pin] in symbol space.

        Pins live in the entry's unit sub-symbols, so the walk is recursive and
        the token count is taken over the entry's own source span - which the
        parse gives exactly.

        A SHEET HOLDS LIBRARY PINS IN TWO TEXTUAL FORMS. KiCad writes a pin from
        the standard libraries over two lines; copperhead writes its own two
        embedded power symbols on ONE: `(pin power_in line (at 0 0 270) ...`.
        A pattern demanding the newline resolved 0 of `pultec-mid`'s 5 power
        pins, which turned a legitimate tee at the shared ground symbol into a
        reported ORPHAN JUNCTION. Parsing by parentheses cannot tell the two
        forms apart, which is the point.
        """
        if self._lib_pins is None:
            out = {}
            for lib_id, entry in self.lib_entries().items():
                pins = []
                for p in entry.walk("pin"):
                    at = p.kid("at")
                    if at is None:
                        raise SheetParseError(
                            f"{lib_id}: a pin at offset {p.start} has no (at")
                    ln = p.kid("length")
                    a = nums(at, f"{lib_id}: a pin (at")
                    pins.append(Pin(
                        a[0], a[1], int(a[2]) if len(a) > 2 else 0,
                        nums(ln)[0] if ln else 0.0,
                        p.atoms[0] if p.atoms else None,
                        p.atoms[1] if len(p.atoms) > 1 else None,
                        "hide" in p.atoms))
                require_complete(len(pins), self.src[entry.start:entry.end],
                                 "pin", f"lib_symbols entry {lib_id}")
                out[lib_id] = pins
            self._lib_pins = out
        return self._lib_pins

    def lib_graphics(self):
        """lib_id -> [(sx, sy)] extreme points of its drawn graphics and pins."""
        if self._lib_graphics is None:
            out = {}
            for lib_id, entry in self.lib_entries().items():
                pts = []
                for pl in entry.walk("polyline"):
                    ptsn = pl.kid("pts")
                    if ptsn is None:
                        continue
                    for xy in ptsn.kids("xy"):
                        pts.append(tuple(nums(xy, f"{lib_id}: a polyline (xy")[:2]))
                for r in entry.walk("rectangle"):
                    s, e = r.kid("start"), r.kid("end")
                    if s and e:
                        pts += [tuple(nums(s)[:2]), tuple(nums(e)[:2])]
                for c in entry.walk("circle"):
                    cen, rad = c.kid("center"), c.kid("radius")
                    if cen and rad:
                        cx, cy = nums(cen)[:2]
                        rr = nums(rad)[0]
                        pts += [(cx - rr, cy - rr), (cx + rr, cy + rr)]
                for a in entry.walk("arc"):
                    for which in ("start", "mid", "end"):
                        n = a.kid(which)
                        if n:
                            pts.append(tuple(nums(n)[:2]))
                for p in self.lib_pins()[lib_id]:
                    pts.append((p.sx, p.sy))
                    pts.append((p.sx + p.length * math.cos(math.radians(p.angle)),
                                p.sy + p.length * math.sin(math.radians(p.angle))))
                out[lib_id] = pts
            self._lib_graphics = out
        return self._lib_graphics

    # -- placed symbols ---------------------------------------------------
    def symbols(self):
        """Every symbol INSTANCE: the `(symbol` lists that are children of the
        sheet's top level, never the ones inside `lib_symbols`."""
        if self._symbols is None:
            lib = self.root.kid("lib_symbols")
            out = []
            for s in self.root.kids("symbol"):
                if lib is not None and s.start >= lib.start and s.end <= lib.end:
                    continue
                lid = s.kid("lib_id")
                if lid is None:
                    raise SheetParseError(
                        f"a top-level symbol at offset {s.start} has no (lib_id")
                at = s.kid("at")
                fields = []
                ref = value = None
                for pr in s.kids("property"):
                    if len(pr.atoms) < 2:
                        continue
                    name, text = pr.atoms[0], pr.atoms[1]
                    pat = pr.kid("at")
                    eff = pr.kid("effects")
                    size = None
                    if eff is not None:
                        fnt = eff.kid("font")
                        if fnt is not None:
                            sz = fnt.kid("size")
                            if sz is not None:
                                size = nums(sz)[0]
                    hidden = eff is not None and "hide" in eff.atoms
                    pa = nums(pat, f"property {name} (at") if pat else None
                    f = Field(name, text,
                              pa[0] if pa else None,
                              pa[1] if pa else None,
                              int(pa[2]) if pa and len(pa) > 2 else 0,
                              size, hidden)
                    fields.append(f)
                    if name == "Reference":
                        ref = text
                    elif name == "Value":
                        value = text
                sa = nums(at, "a symbol instance (at")
                out.append(Symbol(lid.atoms[0], sa[0], sa[1],
                                  int(sa[2]) if len(sa) > 2 else 0,
                                  ref or "?", value, fields, s))
            self._symbols = out
        return self._symbols

    def pin_points(self):
        """{(x, y)} every placed symbol pin's connection point in sheet space."""
        table = self.lib_pins()
        out = set()
        for s in self.symbols():
            for p in table.get(s.lib_id, []):
                dx, dy = rotate(p.sx, -p.sy, s.rot)
                out.add((round(s.x + dx, 3), round(s.y + dy, 3)))
        return out

    def pin_points_by_ref(self):
        """[(x, y, ref)] - the same points, each with the instance it belongs to."""
        table = self.lib_pins()
        out = []
        for s in self.symbols():
            for p in table.get(s.lib_id, []):
                dx, dy = rotate(p.sx, -p.sy, s.rot)
                out.append((round(s.x + dx, 3), round(s.y + dy, 3), s.ref))
        return out

    def rectangles(self):
        """[(x1, y1, x2, y2)] sheet-level rectangles - the group boxes.

        Only the ones drawn on the sheet; the ones inside `lib_symbols` are part
        of a symbol's graphics and are excluded by extent, which the parse gives.
        """
        lib = self.root.kid("lib_symbols")
        out = []
        for r in self.root.walk("rectangle"):
            if lib is not None and r.start >= lib.start and r.end <= lib.end:
                continue
            s, e = r.kid("start"), r.kid("end")
            sx, sy = nums(s, "a sheet rectangle (start")[:2]
            ex, ey = nums(e, "a sheet rectangle (end")[:2]
            out.append((sx, sy, ex, ey))
        return out

    def texts(self):
        """[(text, x, y, angle)] sheet-level free text - the group titles."""
        out = []
        for t in self.root.walk("text"):
            at = t.kid("at")
            if at is None or not t.atoms:
                continue
            ta = nums(at, "a sheet (text (at")
            out.append((t.atoms[0], ta[0], ta[1],
                        int(ta[2]) if len(ta) > 2 else 0))
        return out


def read(path):
    with open(path) as fh:
        return Sheet(fh.read(), str(path))
