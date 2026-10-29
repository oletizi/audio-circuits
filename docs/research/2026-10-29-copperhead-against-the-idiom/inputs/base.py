"""Shared base IR for pultec-low-boost, plus the spec netlist for comparison."""

PARTS = {
    "J1": ("Connector_Generic:Conn_01x05", "1x05"),
    "J2": ("Connector_Generic:Conn_01x05", "1x05"),
    "SI1": ("Device:R", "0R"),
    "SI2": ("Device:R", "47K"),
    "SI3": ("Device:C", "0.047uF"),
    "SI4": ("Device:R", "430R"),
    "SI5": ("Device:R", "0R"),
    "SI6": ("Device:R", "4.7K"),
    "SI7": ("Device:R", "0R"),
    "SI8": ("Device:R", "100K"),
    "R1": ("Device:R", "56K"),
    "RV1": ("Device:R_Potentiometer", "47K"),
    "SW1": ("Switch:SW_Rotary_1x6_MP", "1x6 rotary"),
    "C1": ("Device:C", "0.33uF"),
    "C2": ("Device:C", "0.22uF"),
    "C3": ("Device:C", "0.12uF"),
    "C4": ("Device:C", "0.068uF"),
    "C5": ("Device:C", "0.047uF"),
    "C6": ("Device:C", "0.033uF"),
}

# net name -> pins.  Names are the short meaningful set the prior trial measured
# as geometry-identical to KiCad's Net-(Cn-Pad2) autonames.
NETS = {
    "GND": ["C1.1", "C2.1", "C3.1", "C4.1", "C5.1", "C6.1", "J1.5",
            "J2.1", "J2.2", "J2.3", "J2.4", "J2.5", "RV1.1", "SI8.2"],
    "c1_sel": ["C1.2", "SW1.1"],
    "c2_sel": ["C2.2", "SW1.2"],
    "c3_sel": ["C3.2", "SW1.3"],
    "c4_sel": ["C4.2", "SW1.4"],
    "c5_sel": ["C5.2", "SW1.5"],
    "c6_sel": ["C6.2", "SW1.6"],
    "hi_in": ["SI1.2", "SI2.1"],
    "lo_t1": ["SI3.2", "SI4.2"],
    "lo_t2": ["SI4.1", "SI5.2", "SI6.1"],
    "hi_boost_out": ["J1.2", "SI2.2", "SI5.1", "SI7.1"],
    "in": ["J1.1", "SI1.1", "SI8.1"],
    "lo_boost_in": ["J1.3", "R1.1", "RV1.2", "RV1.3", "SI3.1", "SI6.2", "SW1.7"],
    "out": ["J1.4", "R1.2", "SI7.2"],
}

NOCONNECT = ["SW1.MP"]

# The spec netlist as the brief states it, as frozensets of pins, for the
# pin-set comparison (net NAMES are ours; the partition is the circuit).
SPEC_PARTITION = frozenset(frozenset(p) for p in NETS.values())


def intent(groups, group_order, kinds=None, paper=None, date="2026-10-28"):
    """Build a schematic.intent.json dict.

    groups: ref -> group name
    group_order: list of group names, left to right
    kinds: net name -> 'power'|'ground'|'signal' (omitted keys carry no kind)
    """
    kinds = kinds or {}
    parts = []
    for ref, (lib, val) in PARTS.items():
        parts.append({"ref": ref, "libId": lib, "value": val, "group": groups[ref]})
    nets = []
    for name, pins in NETS.items():
        n = {"name": name, "pins": list(pins)}
        if name in kinds:
            n["kind"] = kinds[name]
        nets.append(n)
    hints = {"groupOrder": list(group_order), "date": date}
    if paper:
        hints["paper"] = paper
    return {"version": 1, "parts": parts, "nets": nets,
            "noConnect": list(NOCONNECT), "hints": hints}
