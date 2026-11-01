"""Round 2: the single-group result produced a horizontal spine, so this round
varies everything else around a single group."""
import base
from base import intent, NETS, PARTS

CAPS = ["C1", "C2", "C3", "C4", "C5", "C6"]
ALL = ["J1", "J2", "SI1", "SI2", "SI3", "SI4", "SI5", "SI6", "SI7", "SI8",
       "R1", "RV1", "SW1"] + CAPS

# declaration order following the signal from in to out, then the hangers
FLOW = ["J1", "SI1", "SI2", "SI7", "SI8", "SI5", "SI4", "SI3", "SI6",
        "R1", "RV1", "SW1"] + CAPS + ["J2"]
REVFLOW = list(reversed(FLOW))

CONFIGS = {}


def mk(tag, note, order_refs=None, group="Low boost section", kinds=None,
       paper=None, netnames=None, groups=None, grouporder=None):
    old_parts, old_nets = base.PARTS, base.NETS
    try:
        if order_refs:
            base.PARTS = {r: old_parts[r] for r in order_refs}
        if netnames:
            base.NETS = {netnames.get(k, k): v for k, v in old_nets.items()}
        gmap = groups or {r: group for r in base.PARTS}
        gorder = grouporder or list(dict.fromkeys(gmap.values()))
        d = intent(gmap, gorder, kinds=kinds, paper=paper)
    finally:
        base.PARTS, base.NETS = old_parts, old_nets
    CONFIGS[tag] = {"note": note, "intent": d}


mk("d1-one-A3", "single group, pinned to A3", paper="A3")
mk("d2-one-flow", "single group, parts declared in signal-flow order",
   order_refs=FLOW)
mk("d3-one-flow-A3", "single group, signal-flow declaration order, A3",
   order_refs=FLOW, paper="A3")
mk("d4-one-revflow", "single group, reverse declaration order",
   order_refs=REVFLOW)
mk("d5-one-gnd-signal", "single group, 0V net declared kind=signal",
   kinds={"GND": "signal"})
mk("d6-one-itb-caption",
   "single group captioned '3 BAND PULTEC STYLE EQ - LOW BOOST SECTION'",
   group="3 BAND PULTEC STYLE EQ - LOW BOOST SECTION")
mk("d7-one-flow-gnd0v",
   "single group, signal-flow order, ground net renamed 0V (kind=ground)",
   order_refs=FLOW, netnames={"GND": "0V"}, kinds={"0V": "ground"})

# spine group declared first, every hanger in a second group
SPINE2 = {r: ("Signal spine" if r in ("SI1", "SI2", "SI7") else "Blocks")
          for r in ALL}
mk("d8-spine-then-blocks", "spine group first, all hanging parts in one group",
   groups=SPINE2, grouporder=["Signal spine", "Blocks"])

# interface split out of the single group, so J1/J2 do not sit on the spine
IFACE = {r: ("Interface" if r in ("J1", "J2") else "Low boost section")
         for r in FLOW}
mk("d9-flow-iface-split",
   "signal-flow order, J1/J2 in their own group declared last",
   order_refs=FLOW, groups=IFACE,
   grouporder=["Low boost section", "Interface"])

mk("d10-flow-iface-A3",
   "signal-flow order, interface split, A3",
   order_refs=FLOW, groups=IFACE,
   grouporder=["Low boost section", "Interface"], paper="A3")
