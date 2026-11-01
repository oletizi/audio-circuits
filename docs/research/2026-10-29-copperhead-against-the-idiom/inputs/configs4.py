"""Round 4: combinations of the levers that moved the spine."""
import base
from base import intent
from configs2 import REVFLOW
from configs3 import SHORT

CONFIGS = {}


def mk(tag, note, order_refs=None, netnames=None, kinds=None, paper=None,
       group="Low boost section"):
    oldp, oldn = base.PARTS, base.NETS
    try:
        if order_refs:
            base.PARTS = {r: oldp[r] for r in order_refs}
        if netnames:
            base.NETS = {netnames.get(k, k): v for k, v in oldn.items()}
        gmap = {r: group for r in base.PARTS}
        d = intent(gmap, [group], kinds=kinds, paper=paper)
    finally:
        base.PARTS, base.NETS = oldp, oldn
    CONFIGS[tag] = {"note": note, "intent": d}


mk("f1-rev-A3", "reverse order, single group, A3", order_refs=REVFLOW, paper="A3")
mk("f2-rev-gndsig", "reverse order, single group, 0V declared signal",
   order_refs=REVFLOW, kinds={"GND": "signal"})
mk("f3-rev-short", "reverse order, single group, short net names",
   order_refs=REVFLOW, netnames=SHORT, kinds={"0V": "ground"})
mk("f4-rev-itb", "reverse order, single group, ITB caption",
   order_refs=REVFLOW, group="3 BAND PULTEC STYLE EQ - LOW BOOST SECTION")
