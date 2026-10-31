"""Round 3: what lengthens, shortens or moves the spine inside one group."""
import base
from base import intent

CAPS = ["C1", "C2", "C3", "C4", "C5", "C6"]
ALL = ["J1", "J2", "SI1", "SI2", "SI3", "SI4", "SI5", "SI6", "SI7", "SI8",
       "R1", "RV1", "SW1"] + CAPS

SHORT = {"GND": "0V", "hi_boost_out": "hbo", "lo_boost_in": "lbi",
         "hi_in": "hi", "lo_t1": "t1", "lo_t2": "t2",
         "c1_sel": "k1", "c2_sel": "k2", "c3_sel": "k3",
         "c4_sel": "k4", "c5_sel": "k5", "c6_sel": "k6"}
LONG = {"GND": "GND", "in": "eq_section_input", "out": "eq_section_output",
        "hi_boost_out": "hi_boost_pot_output", "lo_boost_in": "lo_boost_node",
        "hi_in": "hi_boost_pot_input", "lo_t1": "hi_cut_tap_one",
        "lo_t2": "hi_cut_tap_two",
        **{f"c{i}_sel": f"cap_selector_contact_{i}" for i in range(1, 7)}}

SIGNALS = [n for n in base.NETS if n != "GND"]
CONFIGS = {}


def mk(tag, note, netnames=None, kinds=None, paper=None,
       group="Low boost section"):
    old = base.NETS
    try:
        if netnames:
            base.NETS = {netnames.get(k, k): v for k, v in old.items()}
        gmap = {r: group for r in base.PARTS}
        d = intent(gmap, [group], kinds=kinds, paper=paper)
    finally:
        base.NETS = old
    CONFIGS[tag] = {"note": note, "intent": d}


mk("e1-one-short", "single group, short net names", netnames=SHORT,
   kinds={"0V": "ground"})
mk("e2-one-A2", "single group, pinned to A2", paper="A2")
mk("e3-one-kinds", "single group, every net's kind declared explicitly",
   kinds={"GND": "ground", **{n: "signal" for n in SIGNALS}})
mk("e4-one-long", "single group, long descriptive net names", netnames=LONG)
mk("e5-one-nokind", "single group, no kind declared anywhere (inference only)")
mk("e6-one-A1", "single group, pinned to A1", paper="A1")
mk("e7-short-A3", "single group, short net names, A3", netnames=SHORT,
   kinds={"0V": "ground"}, paper="A3")
mk("e8-one-usletter", "single group, pinned to USLetter", paper="USLetter")
