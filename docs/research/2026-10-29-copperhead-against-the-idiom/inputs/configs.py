"""Configurations probing how close copperhead's author controls get to the
Thompson-Bell layout idiom."""
from base import intent, NETS

CAPS = ["C1", "C2", "C3", "C4", "C5", "C6"]
SIGNAL_NETS = [n for n in NETS if n != "GND"]


def g(**kw):
    """g(GroupName=[refs]) -> ref->group map, preserving declaration order."""
    m = {}
    for name, refs in kw.items():
        for r in refs:
            m[r] = name
    return m


def gm(pairs):
    m = {}
    for name, refs in pairs:
        for r in refs:
            m[r] = name
    return m


CONFIGS = {}


def add(tag, note, groups, order, kinds=None, paper=None):
    CONFIGS[tag] = {"note": note,
                    "intent": intent(groups, order, kinds=kinds, paper=paper)}


# --- 1. control: the prior trial's four groups -----------------------------
P = [("Interface", ["J1", "J2"]),
     ("Hi boost", ["SI1", "SI2", "SI5", "SI7", "SI8"]),
     ("Lo boost", ["SI3", "SI4", "SI6", "R1", "RV1"]),
     ("Cap bank", ["SW1"] + CAPS)]
add("c1-base4", "prior trial's four groups, iface-last order (control)",
    gm(P), ["Hi boost", "Lo boost", "Cap bank", "Interface"])

# --- 2. one group holds the whole circuit ----------------------------------
ALL = ["J1", "J2", "SI1", "SI2", "SI3", "SI4", "SI5", "SI6", "SI7", "SI8",
       "R1", "RV1", "SW1"] + CAPS
add("c2-one-group", "every part in a single group",
    gm([("Low boost section", ALL)]), ["Low boost section"])

# --- 3. spine in its own group, blocks as separate hanging groups ----------
SPINE = [("Interface", ["J1", "J2"]),
         ("Mid shunt", ["SI8"]),
         ("Signal spine", ["SI1", "SI2", "SI7"]),
         ("Hi cut", ["SI3", "SI4", "SI5", "SI6"]),
         ("Cap bank", ["SW1"] + CAPS),
         ("Lo boost", ["RV1", "R1"])]
add("c3-spine-group", "the three series spine parts alone in one group",
    gm(SPINE), ["Interface", "Mid shunt", "Signal spine", "Hi cut", "Cap bank", "Lo boost"])

add("c3b-spine-first", "same groups, spine declared first",
    gm(SPINE), ["Signal spine", "Interface", "Mid shunt", "Hi cut", "Cap bank", "Lo boost"])

# --- 4. one group per station on the spine, in ITB left-to-right order -----
STATION = [("In", ["J1", "J2"]),
           ("Mid shunt", ["SI8"]),
           ("Hi boost", ["SI1", "SI2"]),
           ("Hi cut", ["SI3", "SI4", "SI5", "SI6"]),
           ("Lo boost", ["RV1", "SW1"] + CAPS),
           ("Lo cut", ["SI7", "R1"])]
STATION_ORDER = ["In", "Mid shunt", "Hi boost", "Hi cut", "Lo boost", "Lo cut"]
add("c4-station", "one group per station on the spine, ITB left-to-right order",
    gm(STATION), STATION_ORDER)

add("c4b-station-rev", "station groups, order reversed",
    gm(STATION), list(reversed(STATION_ORDER)))

# --- 5. net kind declared explicitly ---------------------------------------
KINDS_ALL = {"GND": "ground", **{n: "signal" for n in SIGNAL_NETS}}
add("c5-station-kinds", "station groups + every signal net declared kind=signal",
    gm(STATION), STATION_ORDER, kinds=KINDS_ALL)

# --- 6. ground declared as a signal ----------------------------------------
add("c6-gnd-signal", "station groups, 0V net declared kind=signal (no GND symbols?)",
    gm(STATION), STATION_ORDER, kinds={"GND": "signal"})

# --- 7. ground declared as a power rail ------------------------------------
add("c7-gnd-power", "station groups, 0V net declared kind=power",
    gm(STATION), STATION_ORDER, kinds={"GND": "power"})

# --- 8. two groups: spine side and network side ----------------------------
TWO = [("Signal path", ["J1", "J2", "SI1", "SI2", "SI7", "SI8", "R1"]),
       ("Lo boost network", ["SI3", "SI4", "SI5", "SI6", "RV1", "SW1"] + CAPS)]
add("c8-two-group", "signal path vs lo-boost network",
    gm(TWO), ["Signal path", "Lo boost network"])

# --- 9. station groups pinned to A3 (the hand-placed page's sheet) ---------
add("c9-station-A3", "station groups pinned to A3",
    gm(STATION), STATION_ORDER, paper="A3")

# --- 10. ITB's own free-text vocabulary as group captions ------------------
ITB = [("IN / 0V", ["J1", "J2"]),
       ("MID (flat)", ["SI8"]),
       ("HI BOOST (flat)", ["SI1", "SI2"]),
       ("HI CUT (flat)", ["SI3", "SI4", "SI5", "SI6"]),
       ("LO BOOST", ["RV1", "SW1"] + CAPS),
       ("LO CUT (flat)", ["SI7", "R1"])]
ITB_ORDER = ["IN / 0V", "MID (flat)", "HI BOOST (flat)", "HI CUT (flat)",
             "LO BOOST", "LO CUT (flat)"]
add("c10-itb-captions", "station groups captioned in ITB's own vocabulary",
    gm(ITB), ITB_ORDER)

# --- 11. caps split off from the pot ---------------------------------------
STATION_SPLIT = [("In", ["J1", "J2"]),
                 ("Mid shunt", ["SI8"]),
                 ("Hi boost", ["SI1", "SI2"]),
                 ("Hi cut", ["SI3", "SI4", "SI5", "SI6"]),
                 ("Cap bank", ["SW1"] + CAPS),
                 ("Lo boost", ["RV1"]),
                 ("Lo cut", ["SI7", "R1"])]
add("c11-station-split", "station groups with the cap bank split from the pot",
    gm(STATION_SPLIT),
    ["In", "Mid shunt", "Hi boost", "Hi cut", "Cap bank", "Lo boost", "Lo cut"])

# --- 12. every part in its own group ---------------------------------------
add("c12-per-part", "one group per part",
    {r: r for r in ALL}, ALL)

# --- 13. ground renamed 0V, no kind: does the name alone class it? ---------
import base  # noqa: E402


def with_gnd_name(name):
    old = base.NETS
    base.NETS = {(name if k == "GND" else k): v for k, v in old.items()}
    try:
        return intent(gm(STATION), STATION_ORDER)
    finally:
        base.NETS = old


CONFIGS["c13-0v-name"] = {
    "note": "station groups, ground net named 0V with no kind declaration",
    "intent": with_gnd_name("0V")}
