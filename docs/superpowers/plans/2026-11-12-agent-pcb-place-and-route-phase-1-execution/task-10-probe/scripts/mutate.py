"""Mutation sweep: change one predicate at a time and see whether the suite notices.

    python3 -I mutate.py <repo> <source> <test-file>

A mutation the suite still passes is a SURVIVOR, and a survivor is a result that
has to be named with the reason it is equivalent - a count is not a result.
Restores the file whatever happens.
"""
import pathlib
import subprocess
import sys

MUTATIONS = [
    ("rotation: drop the double modulo, leaving a negative angle negative",
     "return ((degrees % 360) + 360) % 360", "return degrees % 360"),
    ("rotation: shift the window, so 0 and 360 differ",
     "return ((degrees % 360) + 360) % 360", "return ((degrees % 360) + 361) % 360"),
    ("belowFloor: report copper exactly AT the floor as below it",
     "if (actual < limit) out.push", "if (actual <= limit) out.push"),
    ("belowFloor: drop the no-figure guard, so an absent figure coerces to 0",
     "if (limit === undefined || actual === null) return", "if (limit === undefined) return"),
    ("belowFloor: drop the no-floor guard",
     "if (limit === undefined || actual === null) return", "if (actual === null) return"),
    ("movedParts: compare only x, not y",
     "if (after.x !== before.x || after.y !== before.y) {", "if (after.x !== before.x) {"),
    ("movedParts: compare rotation raw, not normalised",
     "if (normalisedRotation(after.rotation) !== normalisedRotation(before.rotation)) {",
     "if (after.rotation !== before.rotation) {"),
    ("movedParts: stop reporting a part the candidate does not have",
     'out.push({ ref: before.ref, what: "present on the reference board and absent from the candidate" })',
     "void 0"),
    ("movedParts: stop consuming the matched ref, so every match also reads as an extra part",
     "byRef.delete(before.ref)", "void 0"),
    ("movedParts: stop comparing the layer",
     'if (after.layer !== before.layer) out.push({ ref: before.ref, what: `moved from ${before.layer} to ${after.layer}` })',
     "void 0"),
    ("copperGeometry: count segments only, not arcs",
     'n.name === "segment" || n.name === "arc"', 'n.name === "segment"'),
    ("copperGeometry: take the WIDEST width per layer as the narrowest",
     "const narrowest = widths[0] ?? null", "const narrowest = widths[widths.length - 1] ?? null"),
    ("copperGeometry: take the first layer's narrowest as the board's, not the minimum",
     "if (narrowest !== null && (narrowestTrackMm === null || narrowest < narrowestTrackMm)) narrowestTrackMm = narrowest",
     "if (narrowest !== null && narrowestTrackMm === null) narrowestTrackMm = narrowest"),
    ("copperGeometry: key vias by drill/diameter instead of diameter/drill",
     "bump(bySizeMm, `${size}/${drill}`)", "bump(bySizeMm, `${drill}/${size}`)"),
    ("copperGeometry: track the widest via rather than the narrowest",
     "if (narrowestDiameterMm === null || size < narrowestDiameterMm) narrowestDiameterMm = size",
     "if (narrowestDiameterMm === null || size > narrowestDiameterMm) narrowestDiameterMm = size"),
    ("partPoses: default an absent rotation to 90 rather than 0",
     "const rotation = atNode.atoms[2] === undefined ? 0 : Number(atNode.atoms[2])",
     "const rotation = atNode.atoms[2] === undefined ? 90 : Number(atNode.atoms[2])"),
    ("readFabFloor: stop stripping trailing comments",
     'const line = raw.replace(/#.*$/, "").trim()', "const line = raw.trim()"),
    ("readFabFloor: accept a line that is not a key-value pair",
     "if (match === null) {", "if (false) {"),
    ("readFabFloor: accept a floor file that declares nothing",
     "if (out.size === 0) throw new Error", "if (false) throw new Error"),
]


def main(argv):
    repo = pathlib.Path(argv[0]).resolve()
    source = pathlib.Path(argv[1])
    tests = argv[2]
    original = source.read_text()
    rows = []
    try:
        for name, old, new in MUTATIONS:
            if original.count(old) != 1:
                rows.append((name, "NOT APPLIED", "the text to mutate occurs %d times" % original.count(old)))
                continue
            source.write_text(original.replace(old, new, 1))
            done = subprocess.run(["bun", "test", tests], cwd=str(repo),
                                  capture_output=True, text=True)
            source.write_text(original)
            tail = [line for line in (done.stdout + done.stderr).splitlines() if " fail" in line or " pass" in line]
            rows.append((name, "killed" if done.returncode != 0 else "SURVIVED", " / ".join(tail[-2:])))
    finally:
        source.write_text(original)
    width = max(len(r[0]) for r in rows)
    for name, verdict, detail in rows:
        print("%-*s  %-10s  %s" % (width, name, verdict, detail))
    survivors = [r for r in rows if r[1] != "killed"]
    print("\n%d mutation(s), %d killed, %d not killed" % (len(rows), len(rows) - len(survivors), len(survivors)))
    for name, verdict, _ in survivors:
        print("  %s: %s" % (verdict, name))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
