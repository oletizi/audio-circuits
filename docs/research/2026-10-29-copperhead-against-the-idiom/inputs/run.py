"""Draft, render, ERC and measure one copperhead configuration.

Usage: python3 run.py <tag>   (configs live in configs.py)
       python3 run.py all
"""
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SP = os.path.dirname(HERE)
CLI = os.path.join(SP, "trial-lcapy-copperhead", "copperhead-src", "src", "cli.ts")
SRCDIR = os.path.join(SP, "trial-lcapy-copperhead", "copperhead-src")
KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
BOARDS = os.path.join(HERE, "boards")
RENDERS = os.path.join(HERE, "renders")
SCH = "pultec-low-boost.kicad_sch"

sys.path.insert(0, HERE)
from base import SPEC_PARTITION  # noqa: E402
import configs  # noqa: E402
import configs2  # noqa: E402
import configs3  # noqa: E402
configs.CONFIGS.update(configs2.CONFIGS)
configs.CONFIGS.update(configs3.CONFIGS)
import configs4  # noqa: E402
configs.CONFIGS.update(configs4.CONFIGS)


# ---------- geometry measurement on the emitted sheet ----------

WIRE_RE = re.compile(
    r"\(wire\s*\(pts\s*\(xy\s+([-\d.]+)\s+([-\d.]+)\)\s*\(xy\s+([-\d.]+)\s+([-\d.]+)\)\)",
    re.S)


def wires_of(path):
    txt = open(path).read()
    return [tuple(float(g) for g in m.groups()) for m in WIRE_RE.finditer(txt)]


def _on(p, q, r):
    return (min(p[0], r[0]) - 1e-6 <= q[0] <= max(p[0], r[0]) + 1e-6
            and min(p[1], r[1]) - 1e-6 <= q[1] <= max(p[1], r[1]) + 1e-6)


def crossings(segs):
    """Proper crossings: two segments that intersect at a point interior to
    both.  Shared endpoints (junctions, corners) are not crossings."""
    n = 0
    pairs = []
    for i in range(len(segs)):
        ax1, ay1, ax2, ay2 = segs[i]
        for j in range(i + 1, len(segs)):
            bx1, by1, bx2, by2 = segs[j]
            d1 = (ax2 - ax1, ay2 - ay1)
            d2 = (bx2 - bx1, by2 - by1)
            den = d1[0] * d2[1] - d1[1] * d2[0]
            if abs(den) < 1e-9:
                continue
            t = ((bx1 - ax1) * d2[1] - (by1 - ay1) * d2[0]) / den
            u = ((bx1 - ax1) * d1[1] - (by1 - ay1) * d1[0]) / den
            if 1e-6 < t < 1 - 1e-6 and 1e-6 < u < 1 - 1e-6:
                n += 1
                pairs.append((round(ax1 + t * d1[0], 2), round(ay1 + t * d1[1], 2)))
    return n, pairs


def symbol_rows(path):
    """(ref, libId, x, y, rot) for every placed symbol instance."""
    txt = open(path).read()
    out = []
    for m in re.finditer(r'\(symbol\s*\(lib_id\s+"([^"]+)"\)\s*\(at\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)', txt):
        lib, x, y, rot = m.group(1), float(m.group(2)), float(m.group(3)), float(m.group(4))
        tail = txt[m.end():m.end() + 2500]
        rm = re.search(r'\(property\s+"Reference"\s+"([^"]+)"', tail)
        out.append((rm.group(1) if rm else "?", lib, x, y, rot))
    return out


# ---------- netlist comparison ----------

def netlist_partition(netxml):
    txt = open(netxml).read()
    parts = []
    for m in re.finditer(r'<net\b[^>]*>(.*?)</net>', txt, re.S):
        body = m.group(1)
        pins = set()
        for n in re.finditer(r'<node ref="([^"]+)"[^>]*pin="([^"]+)"', body):
            pins.add(f"{n.group(1)}.{n.group(2)}")
        if pins:
            parts.append(frozenset(pins))
    return frozenset(parts)


def compare_netlist(netxml):
    got = netlist_partition(netxml)
    # the MP mounting lug lands alone on unconnected-(SW1-PadMP); the spec
    # declares it on no net, so a singleton of SW1.MP is expected and removed
    got2 = frozenset(s for s in got if s != frozenset({"SW1.MP"}))
    missing = SPEC_PARTITION - got2
    extra = got2 - SPEC_PARTITION
    mp = frozenset({"SW1.MP"}) in got
    return {"match": not missing and not extra, "missing": [sorted(s) for s in missing],
            "extra": [sorted(s) for s in extra], "mp_alone": mp,
            "spec_nets": len(SPEC_PARTITION), "got_nets": len(got2)}


# ---------- driver ----------

def build(tag, intent_dict):
    board = os.path.join(BOARDS, tag)
    shutil.rmtree(board, ignore_errors=True)
    os.makedirs(os.path.join(board, ".copperhead"))
    json.dump({"schematic": SCH, "docs": "docs/"},
              open(os.path.join(board, ".copperhead", "config.json"), "w"))
    json.dump(intent_dict, open(os.path.join(board, "schematic.intent.json"), "w"), indent=2)
    subprocess.run(["git", "init", "-q", board], capture_output=True)
    return board


def run(tag):
    cfg = configs.CONFIGS[tag]
    board = build(tag, cfg["intent"])
    r = subprocess.run(["npx", "tsx", CLI, "--repo", board, "draft", "schematic", "--json"],
                       cwd=SRCDIR, capture_output=True, text=True)
    res = {"tag": tag, "note": cfg.get("note", "")}
    try:
        payload = json.loads(r.stdout)
    except Exception:
        res["error"] = (r.stdout + r.stderr)[-3000:]
        return res
    rep = payload.get("report") or payload.get("result", {}).get("report") or {}
    if not rep and isinstance(payload, dict):
        # find a nested "report"
        def find(o):
            if isinstance(o, dict):
                if "sheetFit" in o:
                    return o
                for v in o.values():
                    f = find(v)
                    if f:
                        return f
            return None
        rep = find(payload) or {}
    res["ok"] = payload.get("ok")
    res["sheetFit"] = rep.get("sheetFit")
    res["wireCount"] = rep.get("wireCount")
    res["labelCount"] = rep.get("labelCount")
    res["paper"] = rep.get("paper")
    res["notes"] = rep.get("notes", [])
    res["mergedNets"] = rep.get("mergedNets", [])
    res["labelOverlaps"] = len(rep.get("labelOverlaps", []) or [])
    res["netClasses"] = rep.get("netClasses")
    res["groups"] = rep.get("groups")

    schp = os.path.join(board, SCH)
    if not os.path.exists(schp):
        res["error"] = "no schematic produced"
        return res

    os.makedirs(RENDERS, exist_ok=True)
    stem = os.path.join(RENDERS, tag)
    subprocess.run([KC, "sch", "export", "pdf", "-o", stem + ".pdf", schp], capture_output=True)
    subprocess.run(["pdftoppm", "-r", "150", "-png", "-singlefile", stem + ".pdf", stem],
                   capture_output=True)
    e = subprocess.run([KC, "sch", "erc", "--severity-all", "--exit-code-violations",
                        "-o", stem + ".erc", schp], capture_output=True, text=True)
    res["erc"] = next((l.strip() for l in (e.stdout + e.stderr).splitlines()
                       if "violation" in l.lower()), "(no violation line)")
    nx = stem + ".net.xml"
    subprocess.run([KC, "sch", "export", "netlist", "--format", "kicadxml",
                    "-o", nx, schp], capture_output=True)
    if os.path.exists(nx):
        res["netlist"] = compare_netlist(nx)

    segs = wires_of(schp)
    nxing, pts = crossings(segs)
    res["wireSegments"] = len(segs)
    res["crossings"] = nxing
    res["crossingPoints"] = pts[:20]
    syms = symbol_rows(schp)
    res["symbols"] = len(syms)
    res["rotations"] = sorted({s[4] for s in syms})
    res["render"] = stem + ".png"
    return res


def main():
    tags = sys.argv[1:]
    if not tags or tags == ["all"]:
        tags = list(configs.CONFIGS)
    out = {}
    for t in tags:
        print("=== " + t, flush=True)
        out[t] = run(t)
        r = out[t]
        if "error" in r:
            print("   ERROR:", r["error"][:600])
            continue
        sf = r.get("sheetFit") or {}
        print("   paper=%s ink=%.0f%% compaction=%s wires=%d labels=%d crossings=%d erc=%s nl=%s"
              % (sf.get("paper"), 100 * (sf.get("inkUtilization") or 0), sf.get("compaction"),
                 r.get("wireCount") or 0, r.get("labelCount") or 0, r.get("crossings", -1),
                 r.get("erc"), (r.get("netlist") or {}).get("match")))
        for n in r.get("notes", []):
            print("   note:", n)
    path = os.path.join(HERE, "results.json")
    old = {}
    if os.path.exists(path):
        old = json.load(open(path))
    old.update(out)
    json.dump(old, open(path, "w"), indent=2)
    print("\nwrote", path)


if __name__ == "__main__":
    main()
