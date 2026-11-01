"""Draft copperhead variants of pultec-hi-boost and render each one.

Every group assignment and every group order below is written out as a literal.
Nothing here computes a coordinate: copperhead places, kicad-cli renders.

Adapted from docs/research/2026-10-29-low-cut-full-run/draft.py. The only
structural change is the variant set: this board's own section carries 18 of its
27 parts, so the splits below cut the OWN group rather than the stand-ins.

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
WORK = os.path.join(SP, "hi-boost-run")
RENDERS = os.path.join(WORK, "renders")
SCH = "pultec-hi-boost.kicad_sch"

BASE = json.load(open(os.path.join(W, "base.intent.json")))

# --- group assignments, each a literal map ref -> group -----------------------

OWN = ["SW1", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9",
       "L1", "L2", "L3", "L4", "R1", "RV1", "RV2"]

BLOCKS = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Hi cut", "SI2": "Hi cut", "SI3": "Hi cut", "SI4": "Hi cut",
    "SI5": "Lo cut",
    "SI6": "Lo boost", "SI7": "Lo boost",
    "SI8": "Mid",
}
for r in OWN:
    BLOCKS[r] = "Hi boost"

MERGED = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Stand-ins", "SI2": "Stand-ins", "SI3": "Stand-ins",
    "SI4": "Stand-ins", "SI5": "Stand-ins", "SI6": "Stand-ins",
    "SI7": "Stand-ins", "SI8": "Stand-ins",
}
for r in OWN:
    MERGED[r] = "Hi boost"

# The own section split three ways along its own topology: the selected
# capacitor bank, the tapped-coil tank with Qmax and the Q pot, and the level
# pot that straddles input and output.
SPLIT_OWN = {
    "SW1": "Cap bank",
    "C1": "Cap bank", "C2": "Cap bank", "C3": "Cap bank", "C4": "Cap bank",
    "C5": "Cap bank", "C6": "Cap bank", "C7": "Cap bank", "C8": "Cap bank",
    "C9": "Cap bank",
    "L1": "Tank", "L2": "Tank", "L3": "Tank", "L4": "Tank",
    "R1": "Tank", "RV2": "Tank",
    "RV1": "Level",
}

BLOCKS_SPLIT = dict(BLOCKS)
BLOCKS_SPLIT.update(SPLIT_OWN)

MERGED_SPLIT = dict(MERGED)
MERGED_SPLIT.update(SPLIT_OWN)

# Two-way split: the bank and everything that is not the bank.
SPLIT2 = {
    "SW1": "Cap bank",
    "C1": "Cap bank", "C2": "Cap bank", "C3": "Cap bank", "C4": "Cap bank",
    "C5": "Cap bank", "C6": "Cap bank", "C7": "Cap bank", "C8": "Cap bank",
    "C9": "Cap bank",
    "L1": "Tank", "L2": "Tank", "L3": "Tank", "L4": "Tank",
    "R1": "Tank", "RV2": "Tank", "RV1": "Tank",
}
MERGED_SPLIT2 = dict(MERGED)
MERGED_SPLIT2.update(SPLIT2)

# --- the variants -------------------------------------------------------------

VARIANTS = {
    "v1-blocks-flow": (BLOCKS, [
        "Junction", "Hi boost", "Mid", "Hi cut", "Lo boost", "Lo cut"]),
    "v2-blocks-own-last": (BLOCKS, [
        "Junction", "Mid", "Hi cut", "Lo boost", "Lo cut", "Hi boost"]),
    "v3-blocks-own-first": (BLOCKS, [
        "Hi boost", "Junction", "Mid", "Hi cut", "Lo boost", "Lo cut"]),
    "v4-merged": (MERGED, ["Junction", "Hi boost", "Stand-ins"]),
    "v5-merged-own-last": (MERGED, ["Junction", "Stand-ins", "Hi boost"]),
    "v6-merged-split3": (MERGED_SPLIT, [
        "Junction", "Stand-ins", "Level", "Cap bank", "Tank"]),
    "v7-blocks-split3": (BLOCKS_SPLIT, [
        "Junction", "Mid", "Hi cut", "Lo boost", "Lo cut",
        "Level", "Cap bank", "Tank"]),
    "v8-merged-split2": (MERGED_SPLIT2, [
        "Junction", "Stand-ins", "Cap bank", "Tank"]),
    "v9-merged-split2-bank-first": (MERGED_SPLIT2, [
        "Cap bank", "Tank", "Junction", "Stand-ins"]),
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
