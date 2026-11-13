"""The `pcbnew` half of the net-class survey.

WHAT THIS IS. It reads, from KiCad's own resolver, which net class each net on a
board ends up in and what that class's widths are. The point is that it does NOT
read the `netclass_patterns` block out of the `.kicad_pro`: a JSON file
containing a pattern is not evidence that KiCad honours the pattern, and the two
can disagree in both directions (a pattern KiCad does not match, or a class a
net reaches some other way).

WHY PYTHON AT ALL, and why these particular calls. Only because `pcbnew` lives
inside KiCad's bundled interpreter, as `tools/pcb/update-from-schematic.py`
explains for the same reason. Two of the three obvious routes to a resolved class
do not work in KiCad 10 and are written down here so nobody re-finds them:

  - `board.GetAllNetClasses()` returns a plain dict of name -> typed `NETCLASS`.
    This is the route that works, and it is what the class widths come from.
  - `pad.GetEffectiveNetClass()` returns an UNTYPED `SwigPyObject` with no
    methods at all; `.GetTrackWidth()` on it raises `AttributeError`.
  - That dict's keys are `wxString`, not `str`, so comparing or sorting them
    against a `str` raises `TypeError`. Every key and name below is wrapped in
    `str()` for that reason.

`pad.GetNetClassName()` gives a COMPOSITE name: a net matching a pattern resolves
to `"Power,Default"` - the matched class first, then the base class - not to
`"Power"`. This script reports the raw composite and leaves the splitting to
`./netclass-survey.ts`, so the TypeScript half is the only place that knows the
membership rule.

It VALIDATES NOTHING and has no fallbacks; every check lives in
`./netclass-survey.ts`, which is where this repository's tests run.

Usage: python3 netclass-survey.py <board.kicad_pcb>
"""
import json
import sys

import pcbnew


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: netclass-survey.py <board.kicad_pcb>")

    board = pcbnew.LoadBoard(sys.argv[1])

    classes = {}
    for key, netclass in board.GetAllNetClasses().items():
        classes[str(key)] = {
            "trackWidthMm": pcbnew.ToMM(netclass.GetTrackWidth()),
            "clearanceMm": pcbnew.ToMM(netclass.GetClearance()),
            "viaDiameterMm": pcbnew.ToMM(netclass.GetViaDiameter()),
        }

    # Keyed by net name: every pad on one net resolves to the same class, so a
    # repeat is the same answer rather than a conflict.
    nets = {}
    for footprint in board.Footprints():
        for pad in footprint.Pads():
            name = str(pad.GetNetname())
            if name == "":
                continue
            nets[name] = str(pad.GetNetClassName())

    # One line, compact: the TypeScript half takes the last non-empty stdout
    # line, because KiCad's bundled interpreter writes a wxApp assertion and
    # Fontconfig warnings around it.
    print(json.dumps({"classes": classes, "nets": nets}, sort_keys=True))


main()
