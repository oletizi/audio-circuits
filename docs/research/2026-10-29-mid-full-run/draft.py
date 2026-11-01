"""Draft copperhead variants of pultec-mid and render each one.

Every group assignment, every group order and every paper hint below is written
out as a literal. Nothing here computes a coordinate: copperhead places,
kicad-cli renders.

Adapted from docs/research/2026-10-29-hi-cut-full-run/draft.py, which came from
the hi-boost run, which came from the low-cut run. The variant set is THIS
board's: mid's own section carries 28 of the 39 parts - an eleven-throw rotary,
seventeen capacitors over five tap buses, five winding sections, an SPDT mode
switch, three resistors and the level rheostat - so it has three internal seams
rather than hi-cut's one, and the splits below cut at them.

usage: draft.py <variant-tag> [...]   (no args = all)
"""
import json
import os
import shutil
import subprocess
import sys

W = os.path.dirname(os.path.abspath(__file__))
SP = os.environ.get("SCRATCHPAD")
if not SP:
    raise SystemExit("set SCRATCHPAD to the session scratchpad holding copperhead")
SRC = os.environ.get("COPPERHEAD_SRC") or os.path.join(SP, "copperhead")
if not os.path.exists(os.path.join(SRC, "src", "cli.ts")):
    raise SystemExit(
        f"no copperhead checkout at {SRC}; set COPPERHEAD_SRC to one at commit "
        "476cc15965f0d1eeda70afb9e806936f6bb15c5c")
CLI = os.path.join(SRC, "src", "cli.ts")
KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
WORK = os.path.join(SP, "mid-run")
RENDERS = os.path.join(WORK, "renders")
SCH = "pultec-mid.kicad_sch"

BASE = json.load(open(os.path.join(W, "base.intent.json")))

# --- group assignments, each a literal map ref -> group -----------------------

CAPS = ["C%d" % i for i in range(1, 18)]
COILS = ["L1", "L2", "L3", "L4", "L5"]
RETURNS = ["SW2", "R1", "R2", "R3"]
LEVEL = ["RV1", "SW1"]
OWN = LEVEL + CAPS + COILS + RETURNS

BLOCKS = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Hi boost", "SI2": "Hi boost",
    "SI3": "Hi cut", "SI4": "Hi cut", "SI5": "Hi cut", "SI6": "Hi cut",
    "SI7": "Lo cut",
    "SI8": "Lo boost", "SI9": "Lo boost",
}
for r in OWN:
    BLOCKS[r] = "Mid"

MERGED = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Stand-ins", "SI2": "Stand-ins", "SI3": "Stand-ins",
    "SI4": "Stand-ins", "SI5": "Stand-ins", "SI6": "Stand-ins",
    "SI7": "Stand-ins", "SI8": "Stand-ins", "SI9": "Stand-ins",
}
for r in OWN:
    MERGED[r] = "Mid"

# SPLIT2: the signal half (level rheostat, selector, capacitor bank) against the
# return half (the five winding sections, the mode switch and its two return
# resistors plus the input shunt). The seam is `coil_return`.
SPLIT2 = {}
for r in LEVEL + CAPS:
    SPLIT2[r] = "Mid bank"
for r in COILS + RETURNS:
    SPLIT2[r] = "Mid return"

# SPLIT3: bank / coils / returns, cutting at `tap_*` as well as `coil_return`.
SPLIT3 = {}
for r in LEVEL + CAPS:
    SPLIT3[r] = "Mid bank"
for r in COILS:
    SPLIT3[r] = "Mid coil"
for r in RETURNS:
    SPLIT3[r] = "Mid return"

BLOCKS_SPLIT2 = dict(BLOCKS); BLOCKS_SPLIT2.update(SPLIT2)
BLOCKS_SPLIT3 = dict(BLOCKS); BLOCKS_SPLIT3.update(SPLIT3)
MERGED_SPLIT2 = dict(MERGED); MERGED_SPLIT2.update(SPLIT2)
MERGED_SPLIT3 = dict(MERGED); MERGED_SPLIT3.update(SPLIT3)

STANDIN_LADDER = ["Hi boost", "Hi cut", "Lo cut", "Lo boost"]

# --- the variants -------------------------------------------------------------
# (groups, groupOrder, paper-or-None)

VARIANTS = {
    # Own section last: stand-ins in a band across the top, the own circuit in a
    # full-width band below. The arrangement of all four accepted pages.
    "v1-blocks-own-last": (BLOCKS, ["Junction"] + STANDIN_LADDER + ["Mid"], None),
    # Ladder order, own section in its ladder position (mid is third of five).
    "v2-blocks-ladder": (BLOCKS, [
        "Junction", "Hi boost", "Hi cut", "Mid", "Lo cut", "Lo boost"], None),
    "v3-blocks-own-first": (BLOCKS, ["Mid", "Junction"] + STANDIN_LADDER, None),
    "v4-merged-own-last": (MERGED, ["Junction", "Stand-ins", "Mid"], None),
    "v5-merged-own-first": (MERGED, ["Mid", "Junction", "Stand-ins"], None),
    "v6-blocks-split2": (BLOCKS_SPLIT2, [
        "Junction"] + STANDIN_LADDER + ["Mid bank", "Mid return"], None),
    "v7-blocks-split3": (BLOCKS_SPLIT3, [
        "Junction"] + STANDIN_LADDER + ["Mid bank", "Mid coil", "Mid return"], None),
    "v8-merged-split2": (MERGED_SPLIT2, [
        "Junction", "Stand-ins", "Mid bank", "Mid return"], None),
    "v9-merged-split3-bank-first": (MERGED_SPLIT3, [
        "Mid bank", "Mid coil", "Mid return", "Junction", "Stand-ins"], None),
    # The same arrangement as v1 with the paper pinned, to see what the paper
    # pass is deciding rather than inferring it.
    "v10-blocks-own-last-a3": (BLOCKS, ["Junction"] + STANDIN_LADDER + ["Mid"], "A3"),
    "v11-blocks-own-last-a2": (BLOCKS, ["Junction"] + STANDIN_LADDER + ["Mid"], "A2"),
}


def draft(tag):
    groups, order, paper = VARIANTS[tag]
    d = json.loads(json.dumps(BASE))
    for p in d["parts"]:
        p["group"] = groups[p["ref"]]
    d["hints"]["groupOrder"] = order
    if paper is not None:
        d["hints"]["paper"] = paper

    board = os.path.join(WORK, "boards", tag)
    shutil.rmtree(board, ignore_errors=True)
    os.makedirs(os.path.join(board, ".copperhead"))
    json.dump({"schematic": SCH, "docs": "docs/"},
              open(os.path.join(board, ".copperhead", "config.json"), "w"))
    json.dump(d, open(os.path.join(board, "schematic.intent.json"), "w"), indent=2)
    # copperhead REFUSES to draft outside a git repository.
    subprocess.run(["git", "init", "-q", board], capture_output=True)

    r = subprocess.run(["npx", "tsx", CLI, "--repo", board, "draft", "schematic"],
                       cwd=SRC, capture_output=True, text=True)
    print("=" * 76)
    print("VARIANT:", tag, "   groups:", len(order), "  paper hint:", paper)
    for line in (r.stdout + r.stderr).splitlines():
        if line.strip():
            print("   ", line)
    schp = os.path.join(board, SCH)
    if not os.path.exists(schp):
        print("    NO SCHEMATIC PRODUCED")
        return
    os.makedirs(RENDERS, exist_ok=True)
    stem = os.path.join(RENDERS, tag)
    subprocess.run([KC, "sch", "export", "pdf", "-o", stem + ".pdf", schp],
                   capture_output=True)
    subprocess.run(["magick", "-density", "150", stem + ".pdf",
                    "-background", "white", "-alpha", "remove",
                    stem + ".png"], capture_output=True)
    print("    rendered:", stem + ".png")


tags = sys.argv[1:] or list(VARIANTS)
for t in tags:
    draft(t)
