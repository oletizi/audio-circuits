"""Draft copperhead variants of pultec-hi-cut and render each one.

Every group assignment and every group order below is written out as a literal.
Nothing here computes a coordinate: copperhead places, kicad-cli renders.

Adapted from docs/research/2026-10-29-hi-boost-full-run/draft.py, which was
itself adapted from the low-cut run. The variant set is this board's: the own
section carries 13 of the 21 parts, and its one internal seam is the pot plus
R1 (the level leg) against the selector plus the ten capacitors (the bank), so
the splits below cut there.

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
    raise SystemExit("set SCRATCHPAD to the session scratchpad holding copperhead-src")
SRC = os.path.join(SP, "trial-lcapy-copperhead", "copperhead-src")
CLI = os.path.join(SRC, "src", "cli.ts")
KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
WORK = os.path.join(SP, "hi-cut-run")
RENDERS = os.path.join(WORK, "renders")
SCH = "pultec-hi-cut.kicad_sch"

BASE = json.load(open(os.path.join(W, "base.intent.json")))

# --- group assignments, each a literal map ref -> group -----------------------

OWN = ["SW1", "R1", "RV1",
       "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"]

BLOCKS = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Hi boost", "SI2": "Hi boost",
    "SI3": "Lo cut",
    "SI4": "Lo boost", "SI5": "Lo boost",
    "SI6": "Mid",
}
for r in OWN:
    BLOCKS[r] = "Hi cut"

MERGED = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Stand-ins", "SI2": "Stand-ins", "SI3": "Stand-ins",
    "SI4": "Stand-ins", "SI5": "Stand-ins", "SI6": "Stand-ins",
}
for r in OWN:
    MERGED[r] = "Hi cut"

# The own section split along its only internal seam: the level leg (the pot
# across the two rails, and the 430R that feeds its wiper from the selector
# pole) against the selected capacitor bank.
SPLIT_OWN = {
    "RV1": "Cut level", "R1": "Cut level",
    "SW1": "Cap bank",
}
for r in OWN:
    if r.startswith("C"):
        SPLIT_OWN[r] = "Cap bank"

BLOCKS_SPLIT = dict(BLOCKS)
BLOCKS_SPLIT.update(SPLIT_OWN)

MERGED_SPLIT = dict(MERGED)
MERGED_SPLIT.update(SPLIT_OWN)

# --- the variants -------------------------------------------------------------

VARIANTS = {
    # Ladder order, own section in its ladder position.
    "v1-blocks-ladder": (BLOCKS, [
        "Junction", "Hi boost", "Hi cut", "Lo cut", "Lo boost", "Mid"]),
    # Own section last: the arrangement both accepted pages use - stand-ins in
    # a band across the top, the own circuit in a full-width band below.
    "v2-blocks-own-last": (BLOCKS, [
        "Junction", "Hi boost", "Mid", "Lo cut", "Lo boost", "Hi cut"]),
    "v3-blocks-own-first": (BLOCKS, [
        "Hi cut", "Junction", "Hi boost", "Mid", "Lo cut", "Lo boost"]),
    "v4-blocks-mid-late": (BLOCKS, [
        "Junction", "Hi boost", "Lo cut", "Lo boost", "Mid", "Hi cut"]),
    "v5-merged": (MERGED, ["Junction", "Stand-ins", "Hi cut"]),
    "v6-merged-own-first": (MERGED, ["Hi cut", "Junction", "Stand-ins"]),
    "v7-blocks-split": (BLOCKS_SPLIT, [
        "Junction", "Hi boost", "Mid", "Lo cut", "Lo boost",
        "Cut level", "Cap bank"]),
    "v8-merged-split": (MERGED_SPLIT, [
        "Junction", "Stand-ins", "Cut level", "Cap bank"]),
    "v9-merged-split-bank-first": (MERGED_SPLIT, [
        "Cap bank", "Cut level", "Junction", "Stand-ins"]),
}


def draft(tag):
    groups, order = VARIANTS[tag]
    d = json.loads(json.dumps(BASE))
    for p in d["parts"]:
        p["group"] = groups[p["ref"]]
    d["hints"]["groupOrder"] = order

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
    print("VARIANT:", tag, "   groups:", len(order))
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
    subprocess.run(["magick", "-density", "200", stem + ".pdf",
                    "-background", "white", "-alpha", "remove",
                    stem + ".png"], capture_output=True)
    print("    rendered:", stem + ".png")


tags = sys.argv[1:] or list(VARIANTS)
for t in tags:
    draft(t)
