"""Write the Reference and Value field positions chosen by the draughtsman.

akcli has no op for a symbol field's position, and KiCad's library defaults put
both fields hard against the symbol body: measured on v1, C6's value was drawn
across the capacitor's lower plate and RV1's reference and value were drawn
inside the potentiometer body.

Every coordinate below is a literal chosen by eye against the surrounding
geometry.  Nothing here computes a position; the table IS the decision, and this
file only transcribes it into the sheet.  Units are mils, as in the op-list.

THE THIRD NUMBER IS THE FIELD'S TEXT ANGLE, AND IT IS NOT ABSOLUTE.  Measured on
v2: a field written with angle 0 on a symbol placed at rotation 90 renders
VERTICAL, so KiCad adds the symbol's rotation to the field's.  The four symbols
placed at rotation 90 (SI1, SI2, SI7 on the spine, and J2) therefore carry 270,
which renders horizontal; everything else carries 0.
"""
import sys

FIELDS = {
    # vertical two-terminal parts: both fields set off to the RIGHT of the body,
    # reference above the centre line, value below it
    "SI8": ((1750, 8100, 0), (1750, 8300, 0)),
    "SI5": ((4250, 3300, 0), (4250, 3500, 0)),
    "SI4": ((4250, 4400, 0), (4250, 4600, 0)),
    "SI3": ((4250, 5300, 0), (4250, 5500, 0)),
    "SI6": ((5250, 4700, 0), (5250, 4900, 0)),
    "R1": ((14850, 4000, 0), (14850, 4200, 0)),
    # the cap bank: pushed a little further right than the resistors, because a
    # capacitor's plates are wider than a resistor's body
    "C6": ((8320, 8700, 0), (8320, 8900, 0)),
    "C5": ((9220, 8700, 0), (9220, 8900, 0)),
    "C4": ((10120, 8700, 0), (10120, 8900, 0)),
    "C3": ((11020, 8700, 0), (11020, 8900, 0)),
    "C2": ((11920, 8700, 0), (11920, 8900, 0)),
    "C1": ((12820, 8700, 0), (12820, 8900, 0)),
    # the pot: set off to the right, past the pin numbers and the wiper arrow
    "RV1": ((13950, 7600, 0), (13950, 7800, 0)),
    # horizontal parts sitting ON the signal spine: reference above the wire,
    # value below it, in the Thompson-Bell manner
    "SI1": ((2300, 1950, 270), (2300, 2450, 270)),
    "SI2": ((3300, 1950, 270), (3300, 2450, 270)),
    "SI7": ((12600, 1950, 270), (12600, 2450, 270)),
    # the rotary: BELOW the body, because the fan of six selector wires owns
    # every row to its right
    "SW1": ((6750, 7500, 0), (6750, 7700, 0)),
    # the connectors: above J1, left of J2, away from their own pin stubs
    "J1": ((2050, 6550, 0), (2050, 6700, 0)),
    "J2": ((1850, 8750, 270), (1850, 8900, 270)),
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
