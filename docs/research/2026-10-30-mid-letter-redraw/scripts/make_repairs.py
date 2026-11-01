"""Build the akcli op-list that re-lays the Mid group on the translated sheet.

The arrangement is `arrangement.py`; this file only turns it into ops.

INPUT is the TRANSLATED sheet - `translate.py` has already moved the whole page
by one offset so the Junction group and the four stand-ins sit where they will
stay. Nothing in those five groups is touched here: they are selected against,
not for, and the op list is printed with its selection so a stray hit is visible.

IT READS THE SHEET THROUGH `docs/research/lib/kicad_sheet.py` rather than
through its own patterns. The mid run's version of this script hand-rolled a
regex per object kind and guarded only the wires with a token count; three of
the four unguarded patterns are the shape that has silently dropped objects on
four boards. The shared reader refuses when its parse does not account for every
`(<head>` token in the span.

akcli 0.22.0 rejects ANY key it does not know, op by op, so an op cannot carry
the reason it exists. The reasons go to a sidecar keyed by op index.

usage: make_repairs.py <translated-sheet.kicad_sch> <out.json>
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import arrangement as A              # noqa: E402
import kicad_sheet                   # noqa: E402

# Everything the Mid group holds, after the translation, lies south of the band.
# The band's lowest ink is the Junction rectangle's bottom edge at y = 67.31 and
# its lowest object anchor is J2's Value at 63.50; the translated Mid rectangle
# spans y 72.39 .. 152.40. The box is generous in x because the translated Mid
# content reaches x = -17.78 at its rectangle's west edge.
DELETE_BOX = (-45.0, 68.0, 370.0, 165.0)

# How many of each the box is EXPECTED to select. A selection that changes
# silently is how a repair reaches into a group nobody asked about.
# Measured on the translated approved page: of its 82 wires, 29 junctions, 37
# labels and 1 no_connect, the Mid group holds 54 / 24 / 22 / 1. The five
# junctions and fifteen labels left out are the J2 ground trunk's dots and the
# five groups' own labels, which this run does not touch.
EXPECT = {"wire": 54, "junction": 24, "label": 22, "no_connect": 1}


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    A.check()
    x1, y1, x2, y2 = DELETE_BOX

    def inside(ax, ay, bx=None, by=None):
        bx = ax if bx is None else bx
        by = ay if by is None else by
        return (x1 <= min(ax, bx) and max(ax, bx) <= x2
                and y1 <= min(ay, by) and max(ay, by) <= y2)

    picked = {"wire": [], "junction": [], "label": [], "no_connect": []}
    for w in sheet.wires():
        if inside(w.x1, w.y1, w.x2, w.y2):
            picked["wire"].append(
                (w.uuid, f"wire ({w.x1},{w.y1})-({w.x2},{w.y2})"))
    for jx, jy, juid in sheet.junctions():
        if inside(jx, jy):
            picked["junction"].append((juid, f"junction ({jx},{jy})"))
    for kind, text, lx, ly, _ang, _shape, node in sheet.labels():
        if not inside(lx, ly):
            continue
        un = node.kid("uuid")
        if un is None or not un.atoms:
            raise SystemExit(f"a {kind} {text!r} at ({lx},{ly}) has no uuid, so "
                             f"akcli cannot be asked to delete it")
        picked["label"].append((un.atoms[0], f"{kind} {text} at ({lx},{ly})"))
    for nx, ny, nuid in sheet.no_connects():
        if inside(nx, ny):
            picked["no_connect"].append((nuid, f"no_connect at ({nx},{ny})"))

    for kind, want in EXPECT.items():
        got = len(picked[kind])
        if got != want:
            raise SystemExit(
                f"REFUSING: the delete box selected {got} {kind}(s) where "
                f"{want} were expected. Either the input sheet is not the "
                f"translated approved page, or the box now reaches a group this "
                f"run has no business in.")

    ops, notes = [], []

    def add(op, what):
        ops.append(op)
        notes.append(f"[{len(ops) - 1:3}] {op['op']:26} {what}")

    for kind in ("wire", "junction", "label", "no_connect"):
        for uid, what in picked[kind]:
            add({"op": "delete_object", "uuid": uid}, f"Mid: {what}")

    for ref, x, y, rot in A.PLACE:
        add({"op": "set_component_transform", "designator": ref,
             "rotation": rot, "mirror": "none"}, f"{ref} rotation {rot}")
        add({"op": "move_component", "designator": ref,
             "x_mil": A.mil(x), "y_mil": A.mil(y),
             "carry_labels": False, "carry_wires": False},
            f"{ref} to ({x}, {y}) mm")
    for ref, x, y in A.MOVE_POWER:
        add({"op": "move_component", "designator": ref,
             "x_mil": A.mil(x), "y_mil": A.mil(y),
             "carry_labels": False, "carry_wires": False},
            f"{ref} to ({x}, {y}) mm")

    for ax, ay, bx, by, net, what in A.ADD_WIRES:
        add({"op": "add_wire",
             "vertices": [[A.mil(ax), A.mil(ay)], [A.mil(bx), A.mil(by)]]},
            f"[{net}] {what}")
    for ax, ay, what in A.ADD_JUNCTIONS:
        add({"op": "add_junction", "at": [A.mil(ax), A.mil(ay)]}, what)
    for name, ax, ay, scope, rot, _just, why in A.ADD_LABELS:
        add({"op": "add_net_label", "name": name,
             "at": [A.mil(ax), A.mil(ay)], "scope": scope, "rotation": rot},
            f"{scope} label {name}: {why}")
    for pin, what in A.ADD_NO_CONNECT:
        add({"op": "add_no_connect", "pin": pin}, what)

    out = {"protocol_version": 2, "target_format": "kicad",
           "target_file": "pultec-mid.kicad_sch", "ops": ops}
    json.dump(out, open(sys.argv[2], "w"), indent=2)
    with open(sys.argv[2].replace(".json", ".notes.txt"), "w") as fh:
        fh.write("\n".join(notes) + "\n")
    print(f"{len(ops)} ops  (delete {len(picked['wire'])} wires, "
          f"{len(picked['junction'])} junctions, {len(picked['label'])} labels, "
          f"{len(picked['no_connect'])} no-connect; "
          f"place {len(A.PLACE)}, move {len(A.MOVE_POWER)} power; "
          f"add {len(A.ADD_WIRES)} wires, {len(A.ADD_JUNCTIONS)} junctions, "
          f"{len(A.ADD_LABELS)} labels, {len(A.ADD_NO_CONNECT)} no-connect)")
    print("written:", sys.argv[2])


if __name__ == "__main__":
    main()
