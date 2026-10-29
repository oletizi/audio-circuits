"""Build the akcli op-list for the pultec-hi-boost repair pass.

EVERY COORDINATE BELOW IS A LITERAL. Nothing here searches for a placement or
optimises one: the tables are the arrangement, worked out by hand against the
rendered draft and the pin geometry `akcli pins` reports, and this script only
transcribes them into akcli's mil-based op vocabulary.

The one thing it reads from the sheet is the set of wire/junction uuids to
delete, because akcli deletes by uuid and copperhead assigns them. The KEEP list
below names the fourteen Q-chain wires that survive; everything else inside the
Hi boost rectangle goes.

usage: make_repairs.py <sheet.kicad_sch> <out.json>
"""
import json
import re
import sys

MIL = 1.0 / 0.0254


def mil(v):
    """mm -> mil, as an integer. Every coordinate here is a multiple of 1.27 mm
    (= 50 mil exactly), so a non-integral result is a typo and must fail."""
    x = v * MIL
    if abs(x - round(x)) > 1e-6:
        raise SystemExit(f"{v} mm is not a whole number of mils ({x})")
    return int(round(x))


# ---------------------------------------------------------------------------
# 1. What survives inside the Hi boost rectangle: copperhead's own Q chain.
#    RV1, RV2 and R1 are not moved at all, so their field offsets stay valid.
# ---------------------------------------------------------------------------

HI_BOOST_BOX = (16.51, 88.90, 280.67, 153.67)

KEEP_WIRES = {
    "893c6912-8458-552f-a5fe-129612b4dcec",  # in label -> RV1.1 corner
    "fc86af5b-a34a-5aa7-9e4b-cf255599b60a",  # qmax_out
    "dba4959b-50b9-5799-b06b-1b107fb85742",
    "2922ca6f-c747-5c51-aa8f-733983d8406f",
    "0ab06920-ec5a-5822-8a08-15e609206b47",
    "12776cdd-033e-5648-b9ea-e5143b71b9ff",  # boost_wiper
    "a71200a9-0ac0-5661-8419-4fa19d6272bf",
    "0f9c28bc-55c9-5dff-bfc3-57a3dcf9c994",
    "ff478349-6420-5db5-a273-fb38c58cc4c6",
    "9c862064-a33a-5769-9dea-1ca9129577aa",
    "2c06e42a-e0f6-54ce-ace9-4a0dd318fa2d",  # R1.1 stub, the rail's west end
    "90c16e47-f889-50ab-92f7-2edffd46e7f0",  # RV1.3 -> hi_boost_out label
    "35b03c61-e337-5ed1-aab3-41917bfcd107",
    "0ccd732f-05f6-5ce1-8b6b-7a673b04427f",
}

KEEP_JUNCTIONS = {"8466b272-9684-5743-98ce-b9362a583f68"}  # (66.04, 106.68)

# Hi cut: one wire deleted with the duplicate label it served.
DELETE_WIRES_EXTRA = {"25cbd143-1c99-5400-85a6-1b8e18e1f94f"}  # SI1.1 label stub

DELETE_LABELS = [
    # The two duplicate on-page pairs inside Hi cut, each replaced by a wire.
    ("43a8de6b-caa8-519d-bdbf-120e1e5ce2ac", "hcut_t2 dup at (130.81,50.80)"),
    ("fcf6a791-9804-5d53-b600-8f1307dd27ce", "lo_boost_in dup at (91.44,57.15)"),
    ("8909b973-3785-5520-9a86-e881b776b74c", "coil_top dup at (252.73,120.65)"),
    ("b1909e1e-0d6e-50fd-b8b2-0e3f0e5c9fc9", "sel1"),
    ("056cc7a4-2e07-5d5b-9f35-0f854c2e62f5", "sel2"),
    ("f732b46c-7161-5966-9902-f9868c89aa53", "sel3"),
    ("2939f7d6-eb66-550e-8864-790c5dddffee", "sel4"),
    ("98d0f05c-ec75-57ac-b698-50b6a7836bbf", "sel5"),
    ("d9e98304-135c-5326-9136-bb1d1065d49b", "sel6"),
    ("5ef24bfa-1d51-5054-9792-c2227942e435", "tap_100mh 1 of 3"),
    ("e6950061-a860-575e-8515-124b7b73a4fd", "tap_100mh 2 of 3"),
    ("e60555ee-736b-594d-9e5c-4d18514e318d", "tap_100mh 3 of 3"),
    ("24aeb3ce-2932-5527-be9a-6cd09dc434f1", "tap_200mh 1 of 3"),
    ("75d8e60c-cafa-5d9a-b5ba-ec16418eb863", "tap_200mh 2 of 3"),
    ("dcaea76b-0335-513d-b9a7-73783ce06c8b", "tap_200mh 3 of 3"),
    ("c132d1e5-f1d2-577c-8b02-745b784bdcdd", "tap_300mh 1 of 2"),
    ("d2dd3fbd-62ad-59cc-b73d-f3a2b55cbf0c", "tap_300mh 2 of 2"),
    ("95dfa74d-79e8-5676-a760-cbd7b850297f", "tap_600mh"),
]

# The no-connect marker at SW1.MP, which does not move with the component.
DELETE_OTHER = [("219740dd-4941-5af2-bd0d-6d697a8cc4de", "no_connect at SW1.MP")]

# Four of J2's five stacked ground symbols. #PWR06 at (33.02, 76.20) stays as
# the single terminator: a GND symbol's pin is at its top and its triangle hangs
# below, so a terminator at the top of a downward trunk draws over the trunk.
DELETE_COMPONENTS = ["#PWR02", "#PWR03", "#PWR04", "#PWR05"]

# ---------------------------------------------------------------------------
# 2. Placement. (designator, x_mm, y_mm, rotation)
# ---------------------------------------------------------------------------

PLACE = [
    # The selector, dropped 5.08 mm so its six contacts clear the tap buses.
    ("SW1", 66.04, 137.16, 0),

    # Nine capacitors, VERTICAL (rot 0: pin 1 up to the tap, pin 2 down to the
    # contact), x strictly ascending in contact number at a 15.24 mm pitch, each
    # at the y of its own contact. That ordering is what makes the bank
    # crossing-free: a riser only ever climbs above the runs that could cross
    # it. Contact -> capacitors: 1:C1  2:C2,C5  3:C3  4:C4,C8  5:C6,C9  6:C7.
    ("C1", 93.98, 125.73, 0),
    ("C2", 109.22, 128.27, 0),
    ("C5", 124.46, 128.27, 0),
    ("C3", 139.70, 130.81, 0),
    ("C4", 154.94, 133.35, 0),
    ("C8", 170.18, 133.35, 0),
    ("C6", 185.42, 135.89, 0),
    ("C9", 200.66, 135.89, 0),
    ("C7", 215.90, 138.43, 0),

    # Four tapped-coil sections, rot 180 so pin 2 (the coil top) is up on the
    # rail and pin 1 (the tap) is down on its own bus. Each sits above the
    # x-span of the capacitors that land on its tap, and the four spans are
    # disjoint, which is why the four buses can sit at four heights without any
    # riser crossing a bus that is not its own.
    ("L4", 93.98, 110.49, 180),    # tap_600mh: C1
    ("L3", 124.46, 110.49, 180),   # tap_300mh: C2, C5, C3
    ("L2", 162.56, 110.49, 180),   # tap_200mh: C4, C8
    ("L1", 200.66, 110.49, 180),   # tap_100mh: C6, C9, C7
]

# ---------------------------------------------------------------------------
# 3. Wires. (x1, y1, x2, y2, what)
# ---------------------------------------------------------------------------

ADD_WIRES = [
    # in: one label at (25.40, 99.06), one column down the west edge to the
    # selector common, one spur east to the level pot. Replaces the two wires
    # copperhead drew to the selector's old position.
    (25.40, 99.06, 25.40, 137.16, "in column, 38.10 mm"),
    (25.40, 137.16, 58.42, 137.16, "in -> SW1.7, 33.02 mm"),

    # coil_top: the common top of all four coil sections, drawn once as a rail
    # instead of as four labels. 113.03 mm, the longest wire on the page.
    (87.63, 106.68, 200.66, 106.68, "coil_top rail, 113.03 mm"),

    # tap_600mh is one capacitor and one coil, so it is a single vertical with
    # no bus at all.
    (93.98, 114.30, 93.98, 121.92, "tap_600mh L4.1 -> C1.1"),

    # tap_300mh, bus at y=119.38
    (124.46, 114.30, 124.46, 119.38, "tap_300mh L3.1 drop"),
    (109.22, 119.38, 139.70, 119.38, "tap_300mh bus, 30.48 mm"),
    (109.22, 124.46, 109.22, 119.38, "C2.1 riser"),
    (124.46, 124.46, 124.46, 119.38, "C5.1 riser"),
    (139.70, 127.00, 139.70, 119.38, "C3.1 riser"),

    # tap_200mh, bus at y=121.92
    (162.56, 114.30, 162.56, 121.92, "tap_200mh L2.1 drop"),
    (154.94, 121.92, 170.18, 121.92, "tap_200mh bus, 15.24 mm"),
    (154.94, 129.54, 154.94, 121.92, "C4.1 riser"),
    (170.18, 129.54, 170.18, 121.92, "C8.1 riser"),

    # tap_100mh, bus at y=124.46
    (200.66, 114.30, 200.66, 124.46, "tap_100mh L1.1 drop"),
    (185.42, 124.46, 215.90, 124.46, "tap_100mh bus, 30.48 mm"),
    (185.42, 132.08, 185.42, 124.46, "C6.1 riser"),
    (200.66, 132.08, 200.66, 124.46, "C9.1 riser"),
    (215.90, 134.62, 215.90, 124.46, "C7.1 riser"),

    # Six selector runs, one per contact, each a single straight horizontal
    # with no corner, from the switch pin to the last capacitor tail on it.
    (73.66, 129.54, 93.98, 129.54, "sel1 run, 20.32 mm"),
    (73.66, 132.08, 124.46, 132.08, "sel2 run, 50.80 mm"),
    (73.66, 134.62, 139.70, 134.62, "sel3 run, 66.04 mm"),
    (73.66, 137.16, 170.18, 137.16, "sel4 run, 96.52 mm"),
    (73.66, 139.70, 200.66, 139.70, "sel5 run, 127.00 mm"),
    (73.66, 142.24, 215.90, 142.24, "sel6 run, 142.24 mm"),

    # Junction group: J2's five pin stubs now meet one trunk instead of five
    # symbols, and the PWR_FLAG hangs off it on a stub of its own.
    (33.02, 66.04, 33.02, 76.20, "J2 ground trunk, 10.16 mm"),
    (33.02, 71.12, 27.94, 71.12, "#FLG01 stub"),

    # Hi cut: the hcut_t2 duplicate pair collapsed to a wire. SI2.1 reaches the
    # SI3/SI4 pair along y=44.45, above SI2's own body.
    (78.74, 44.45, 130.81, 44.45, "hcut_t2 rail, 52.07 mm"),
    (130.81, 50.80, 130.81, 44.45, "hcut_t2 riser to SI3/SI4"),

    # Hi cut: the lo_boost_in duplicate pair collapsed to a wire, routed below
    # SI3's body because a straight run at y=57.15 would pass through it.
    (88.90, 57.15, 88.90, 66.04, "lo_boost_in drop off SI1.1"),
    (88.90, 66.04, 148.59, 66.04, "lo_boost_in rail, 59.69 mm"),
    (148.59, 66.04, 148.59, 63.50, "lo_boost_in up to SI4.2 stub"),
]

ADD_JUNCTIONS = [
    (93.98, 106.68, "rail through L4.2"),
    (124.46, 106.68, "rail through L3.2"),
    (162.56, 106.68, "rail through L2.2"),
    (124.46, 119.38, "tap_300mh bus / L3 drop / C5 riser"),
    (162.56, 121.92, "tap_200mh bus / L2 drop"),
    (200.66, 124.46, "tap_100mh bus / L1 drop / C9 riser"),
    (109.22, 132.08, "sel2 run through C2.2"),
    (154.94, 137.16, "sel4 run through C4.2"),
    (185.42, 139.70, "sel5 run through C6.2"),
    (33.02, 68.58, "J2 trunk / pin 3 stub"),
    (33.02, 71.12, "J2 trunk / pin 4 stub / flag stub"),
    (33.02, 73.66, "J2 trunk / pin 5 stub"),
    (33.02, 76.20, "J2 trunk foot / pin stub / #PWR06"),
    (78.74, 44.45, "hcut_t2 at SI2.1"),
    (130.81, 50.80, "hcut_t2 tee to SI3 and SI4"),
]

# Local labels, one per net: enough to keep the net's name, never a second one.
# Each sel label is anchored past the right-hand end of the run above it, so no
# label's text sits in the 2.54 mm gap between two runs.
ADD_LABELS = [
    ("sel1", 80.01, 129.54),
    ("sel2", 96.52, 132.08),
    ("sel3", 127.00, 134.62),
    ("sel4", 142.24, 137.16),
    ("sel5", 172.72, 139.70),
    ("sel6", 203.20, 142.24),
    ("tap_600mh", 93.98, 118.11),
    ("tap_300mh", 124.46, 116.84),
    ("tap_200mh", 162.56, 118.11),
    ("tap_100mh", 200.66, 118.11),
]

MOVE_POWER = [("#FLG01", 27.94, 71.12)]

ADD_NO_CONNECT = [("SW1.MP", "selector mounting lug, on no net in the model")]


def main():
    src = open(sys.argv[1]).read()

    wire_pat = re.compile(
        r'\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)'
        r'.*?\(uuid "([0-9a-f-]+)"\)', re.S)
    x1b, y1b, x2b, y2b = HI_BOOST_BOX
    delete_wires = []
    for m in wire_pat.finditer(src):
        ax, ay, bx, by = (float(g) for g in m.groups()[:4])
        uid = m.group(5)
        inside = (x1b <= min(ax, bx) and max(ax, bx) <= x2b
                  and y1b <= min(ay, by) and max(ay, by) <= y2b)
        if (inside and uid not in KEEP_WIRES) or uid in DELETE_WIRES_EXTRA:
            delete_wires.append((uid, f"({ax},{ay})-({bx},{by})"))

    junc_pat = re.compile(
        r'\(junction \(at ([-\d.]+) ([-\d.]+)\)\s*'
        r'\(diameter [^)]*\)\s*\(color [^)]*\)\s*\(uuid "([0-9a-f-]+)"\)', re.S)
    delete_junctions = []
    for m in junc_pat.finditer(src):
        ax, ay, uid = float(m.group(1)), float(m.group(2)), m.group(3)
        if uid in KEEP_JUNCTIONS:
            continue
        if x1b <= ax <= x2b and y1b <= ay <= y2b:
            delete_junctions.append((uid, f"junction ({ax},{ay})"))

    # akcli 0.22.0 rejects ANY key it does not know, op by op, so an op cannot
    # carry the reason it exists. The reasons are written to a sidecar instead.
    ops, notes = [], []

    def add(op, what):
        ops.append(op)
        notes.append(f"[{len(ops) - 1:3}] {op['op']:24} {what}")

    for uid, what in delete_wires + delete_junctions:
        add({"op": "delete_object", "uuid": uid}, what)
    for uid, what in DELETE_LABELS + DELETE_OTHER:
        add({"op": "delete_object", "uuid": uid}, what)
    for ref in DELETE_COMPONENTS:
        add({"op": "delete_component", "designator": ref},
            "one of J2's five stacked ground symbols")

    for ref, x, y, rot in PLACE:
        add({"op": "set_component_transform", "designator": ref,
             "rotation": rot, "mirror": "none"}, f"{ref} rotation {rot}")
        add({"op": "move_component", "designator": ref,
             "x_mil": mil(x), "y_mil": mil(y),
             "carry_labels": False, "carry_wires": False},
            f"{ref} to ({x}, {y}) mm")
    for ref, x, y in MOVE_POWER:
        add({"op": "move_component", "designator": ref,
             "x_mil": mil(x), "y_mil": mil(y),
             "carry_labels": False, "carry_wires": False},
            f"{ref} to ({x}, {y}) mm, off the J2 ground trunk")

    for ax, ay, bx, by, what in ADD_WIRES:
        add({"op": "add_wire",
             "vertices": [[mil(ax), mil(ay)], [mil(bx), mil(by)]]}, what)
    for ax, ay, what in ADD_JUNCTIONS:
        add({"op": "add_junction", "at": [mil(ax), mil(ay)]}, what)
    for name, ax, ay in ADD_LABELS:
        add({"op": "add_net_label", "name": name,
             "at": [mil(ax), mil(ay)], "scope": "local", "rotation": 0},
            f"the one {name} label")
    for pin, what in ADD_NO_CONNECT:
        add({"op": "add_no_connect", "pin": pin}, what)

    out = {"protocol_version": 2, "target_format": "kicad",
           "target_file": "pultec-hi-boost.kicad_sch", "ops": ops}
    json.dump(out, open(sys.argv[2], "w"), indent=2)
    with open(sys.argv[2].replace(".json", ".notes.txt"), "w") as fh:
        fh.write("\n".join(notes) + "\n")
    print(f"{len(ops)} ops  "
          f"(delete {len(delete_wires)} wires, {len(delete_junctions)} junctions, "
          f"{len(DELETE_LABELS)} labels, {len(DELETE_COMPONENTS)} GND symbols; "
          f"place {len(PLACE)}; add {len(ADD_WIRES)} wires, "
          f"{len(ADD_JUNCTIONS)} junctions, {len(ADD_LABELS)} labels)")
    print("written:", sys.argv[2])


main()
