"""The `pcbnew` half of the headless "Update PCB from Schematic".

WHAT THIS IS. KiCad's GUI menu item Tools > Update PCB from Schematic is driven
by `BOARD_NETLIST_UPDATER`, a class the SWIG bindings do not expose - the
expression `[n for n in dir(pcbnew) if 'NETLIST' in n.upper()]` is empty - and
`kicad-cli` has no equivalent verb (its `pcb` surface is only
`{drc,export,import,render,upgrade}`). The bindings DO expose every primitive
the updater needs, so this script does the updater's job with those primitives
and lets KiCad itself write the board file. That is deliberate: nothing here
hand-authors footprint s-expressions.

WHY PYTHON AT ALL. Only because `pcbnew` lives inside KiCad's bundled
interpreter. This file is therefore as thin as it can be: it reads an
instruction file, makes the calls, saves the board, and prints a one-line JSON
summary. It VALIDATES NOTHING and contains no fallbacks - every refusal lives in
`tools/pcb/update-from-schematic.ts`, which is where this repository's tests
run, and that TypeScript half re-reads the written file rather than believing
the summary printed below.

Usage: python3 update-from-schematic.py <instructions.json>
"""
import json
import sys

import pcbnew


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: update-from-schematic.py <instructions.json>")
    with open(sys.argv[1]) as handle:
        spec = json.load(handle)

    board = pcbnew.LoadBoard(spec["boardIn"])

    for item in spec["footprints"]:
        footprint = pcbnew.FootprintLoad(item["libraryDir"], item["footprintName"])
        if footprint is None:
            raise SystemExit(
                "pcbnew.FootprintLoad returned nothing for %s in %s, although the TypeScript half "
                "found that file on disk" % (item["footprintName"], item["libraryDir"])
            )
        # FootprintLoad returns a footprint whose FPID has an EMPTY library
        # nickname, which schematic parity reports as "<Name> doesn't match
        # footprint given by symbol (<Lib>:<Name>)" - a real mismatch that is
        # NOT a "Missing footprint", so a weak check sails past it. Setting the
        # netlist's full Library:Name string is the cure.
        footprint.SetFPIDAsString(item["fpid"])
        footprint.SetReference(item["reference"])
        footprint.SetValue(item["value"])
        # The schematic's own fields, already filtered by the TypeScript half
        # (Reference, Value and Footprint are set by their own calls above).
        # Without them parity reports "Field 'Description' differs" and
        # "Field 'Datasheet' differs" - again not a "Missing footprint".
        for name, value in item["fields"].items():
            footprint.SetField(name, value)
        footprint.SetPath(pcbnew.KIID_PATH(item["path"]))
        footprint.SetPosition(pcbnew.VECTOR2I(pcbnew.FromMM(item["xMm"]), pcbnew.FromMM(item["yMm"])))
        board.Add(footprint)

    for net in spec["nets"]:
        info = pcbnew.NETINFO_ITEM(board, net["name"], net["code"])
        board.Add(info)
        for member in net["members"]:
            footprint = board.FindFootprintByReference(member["ref"])
            if footprint is None:
                raise SystemExit("no footprint on the board for reference %s" % member["ref"])
            pad = footprint.FindPadByNumber(member["pin"])
            if pad is None:
                raise SystemExit("footprint %s has no pad %s" % (member["ref"], member["pin"]))
            pad.SetNet(info)

    pcbnew.SaveBoard(spec["boardOut"], board)

    netted = sum(1 for fp in board.Footprints() for pad in fp.Pads() if pad.GetNetCode() > 0)
    print(json.dumps({"footprints": len(board.Footprints()), "nettedPads": netted}))


main()
