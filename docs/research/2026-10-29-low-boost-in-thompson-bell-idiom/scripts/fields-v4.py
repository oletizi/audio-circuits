"""v4's Reference and Value field positions, chosen by the draughtsman.

Same mechanism and same reasoning as `place_fields.py` (v3): akcli has no op for
a symbol field's position, KiCad's library default puts both fields hard against
the symbol, and a field's stored text angle is RELATIVE to its symbol's rotation
(so a symbol placed at 90 needs 270 to render its text horizontal).

MEASURED ON v4: KiCad MIRRORS a field's justification when its symbol is placed
at rotation 180 (and when it is mirrored).  A field written `justify left` on
such a symbol renders RIGHT-justified, so the anchor is the text's RIGHT edge,
not its left.  The capacitors, SI3, R1 and RV1 are all at 180, and the first v4
render had each capacitor's value drawn straight through its own drop wire
because the anchor had been chosen as if the text ran rightwards from it.  Their
anchors are therefore placed a full text-width away from the wire, and the
reference's anchor is set per part so that the two lines start on the same left
edge rather than ending on the same right one.  The anchors sit nearer their own
capacitor than the next one, so that no value can be read against the wrong
part.

v4 is laid out tighter than v3, so several fields are placed on the side AWAY
from the nearest neighbour rather than always to the right: SI5 and SI6 sit on a
shared vertical with SI4 and SI3 to their right, so their text goes left; SI8 is
the left-most thing on the sheet, so its text goes left into the margin; SW1's
text goes above the body because the fan of six selector wires owns every row to
its right and the bank name sits below.

Units are mils.  Every number is a literal chosen by eye against the geometry
around it; nothing here computes a position.
"""
import sys

FIELDS = {
    "SI8": ((600, 4800, 0), (600, 5000, 0)),
    "SI1": ((1600, 1150, 270), (1600, 1650, 270)),
    "SI2": ((2200, 1150, 270), (2200, 1650, 270)),
    "SI7": ((6850, 1150, 270), (6850, 1650, 270)),
    "SI5": ((2230, 1900, 0), (2230, 2100, 0)),
    "SI6": ((2230, 3000, 0), (2230, 3200, 0)),
    "SI4": ((3100, 2300, 270), (3100, 2800, 270)),
    "SI3": ((3800, 3000, 0), (3930, 3200, 0)),
    "R1": ((10850, 2400, 0), (10850, 2600, 0)),
    "RV1": ((10250, 4800, 0), (10250, 5000, 0)),
    "SW1": ((4400, 3850, 0), (4400, 4050, 0)),
    "C6": ((6050, 5600, 0), (6230, 5800, 0)),
    "C5": ((6750, 5600, 0), (6930, 5800, 0)),
    "C4": ((7450, 5600, 0), (7630, 5800, 0)),
    "C3": ((8150, 5600, 0), (8280, 5800, 0)),
    "C2": ((8850, 5600, 0), (8980, 5800, 0)),
    "C1": ((9550, 5600, 0), (9680, 5800, 0)),
    "J1": ((1900, 4600, 0), (1900, 4750, 0)),
    "J2": ((2100, 5250, 270), (2100, 5400, 270)),
}

MIL = 0.0254


def mm(v):
    return round(v * MIL, 4)


def main(path):
    text = open(path).read()
    changed = 0
    for des, (ref, val) in FIELDS.items():
        anchor = '(property "Reference" "%s" (at ' % des
        i = text.find(anchor)
        if i < 0:
            raise SystemExit("no Reference property for %s in %s" % (des, path))
        j = text.index(")", i + len(anchor))
        text = text[: i + len(anchor)] + "%s %s %d" % (mm(ref[0]), mm(ref[1]), ref[2]) + text[j:]
        changed += 1

        k = text.index('(property "Value" "', i)
        k = text.index("(at ", k)
        m = text.index(")", k + 4)
        text = text[: k + 4] + "%s %s %d" % (mm(val[0]), mm(val[1]), val[2]) + text[m:]
        changed += 1
    open(path, "w").write(text)
    print("rewrote %d field positions in %s" % (changed, path))


if __name__ == "__main__":
    main(sys.argv[1])
