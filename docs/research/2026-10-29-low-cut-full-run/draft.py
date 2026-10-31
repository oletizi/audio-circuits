"""Draft copperhead variants of pultec-low-cut and render each one.

Every group assignment and every group order below is written out as a literal.
Nothing here computes a coordinate: copperhead places, kicad-cli renders.

usage: draft.py <variant-tag> [...]   (no args = all)
"""
import json
import os
import shutil
import subprocess
import sys

W = os.path.dirname(os.path.abspath(__file__))
SP = os.path.dirname(W)
CLI = os.path.join(SP, "copperhead-src", "src", "cli.ts")
SRC = os.path.join(SP, "trial-lcapy-copperhead", "copperhead-src")
CLI = os.path.join(SRC, "src", "cli.ts")
KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
RENDERS = os.path.join(W, "renders")
SCH = "pultec-low-cut.kicad_sch"

BASE = json.load(open(os.path.join(W, "base.intent.json")))

# --- group assignments, each a literal map ref -> group -----------------------

BLOCKS = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Hi boost", "SI2": "Hi boost",
    "SI9": "Mid",
    "SI3": "Hi cut", "SI4": "Hi cut", "SI5": "Hi cut", "SI6": "Hi cut",
    "SI7": "Lo boost", "SI8": "Lo boost",
    "RV1": "Lo cut", "SW1": "Lo cut",
    "C1": "Lo cut", "C2": "Lo cut", "C3": "Lo cut", "C7": "Lo cut",
    "C4": "Lo cut", "C5": "Lo cut", "C6": "Lo cut",
}

BLOCKS_SPLIT = dict(BLOCKS)
BLOCKS_SPLIT.update({
    "SW1": "Cap bank", "C1": "Cap bank", "C2": "Cap bank", "C3": "Cap bank",
    "C7": "Cap bank", "C4": "Cap bank", "C5": "Cap bank", "C6": "Cap bank",
    "RV1": "Lo cut level",
})

MERGED = {
    "J1": "Junction", "J2": "Junction",
    "SI1": "Stand-ins", "SI2": "Stand-ins", "SI3": "Stand-ins",
    "SI4": "Stand-ins", "SI5": "Stand-ins", "SI6": "Stand-ins",
    "SI7": "Stand-ins", "SI8": "Stand-ins", "SI9": "Stand-ins",
    "RV1": "Lo cut", "SW1": "Lo cut",
    "C1": "Lo cut", "C2": "Lo cut", "C3": "Lo cut", "C7": "Lo cut",
    "C4": "Lo cut", "C5": "Lo cut", "C6": "Lo cut",
}

MERGED_SPLIT = dict(MERGED)
MERGED_SPLIT.update({
    "SW1": "Cap bank", "C1": "Cap bank", "C2": "Cap bank", "C3": "Cap bank",
    "C7": "Cap bank", "C4": "Cap bank", "C5": "Cap bank", "C6": "Cap bank",
    "RV1": "Lo cut level",
})

# --- the variants -------------------------------------------------------------

VARIANTS = {
    "v1-blocks-flow": (BLOCKS, [
        "Junction", "Hi boost", "Mid", "Hi cut", "Lo boost", "Lo cut"]),
    "v2-blocks-mid-late": (BLOCKS, [
        "Junction", "Hi boost", "Hi cut", "Mid", "Lo boost", "Lo cut"]),
    "v3-blocks-locut-first": (BLOCKS, [
        "Lo cut", "Junction", "Hi boost", "Mid", "Hi cut", "Lo boost"]),
    "v4-blocks-locut-mid": (BLOCKS, [
        "Junction", "Hi boost", "Lo cut", "Mid", "Hi cut", "Lo boost"]),
    "v5-merged": (MERGED, ["Junction", "Stand-ins", "Lo cut"]),
    "v6-merged-locut-first": (MERGED, ["Lo cut", "Junction", "Stand-ins"]),
    "v7-blocks-split": (BLOCKS_SPLIT, [
        "Junction", "Hi boost", "Mid", "Hi cut", "Lo boost",
        "Lo cut level", "Cap bank"]),
    "v8-merged-split": (MERGED_SPLIT, [
        "Junction", "Stand-ins", "Lo cut level", "Cap bank"]),
    "v9-merged-split-bank-mid": (MERGED_SPLIT, [
        "Junction", "Cap bank", "Lo cut level", "Stand-ins"]),
}


def draft(tag):
    groups, order = VARIANTS[tag]
    d = json.loads(json.dumps(BASE))
    for p in d["parts"]:
        p["group"] = groups[p["ref"]]
    d["hints"]["groupOrder"] = order

    board = os.path.join(W, "boards", tag)
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
    for fmt, ext in (("pdf", ".pdf"), ("svg", ".svg")):
        subprocess.run([KC, "sch", "export", fmt, "-o",
                        stem + ext if fmt == "pdf" else RENDERS, schp],
                       capture_output=True)
    subprocess.run(["magick", "-density", "200", stem + ".pdf",
                    "-background", "white", "-alpha", "remove",
                    stem + ".png"], capture_output=True)
    print("    rendered:", stem + ".png")


tags = sys.argv[1:] or list(VARIANTS)
for t in tags:
    draft(t)
