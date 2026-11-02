"""Every placed symbol on a sheet, with its reference, rotation and field anchors.

**THIS EXISTS BECAUSE A NON-GREEDY REGEX OVER A NESTED S-EXPRESSION SILENTLY
HALVES THE LIST.** The pattern `\\n\\t\\(symbol\\n(?:.*?)\\n\\t\\)\\n` used on the
other runs' ad-hoc dumps stops at the first `\\n\\t)` it can reach, which for a
symbol block containing `(instances (project ... ))` is the END OF THE NEXT
BLOCK - so alternate symbols vanish. On `pultec-mid` it printed 25 of 50 and
said nothing. This splits by parenthesis depth instead, counts `\\n\\t(symbol`
tokens first, and refuses when the two disagree.

usage: symbols.py <sheet.kicad_sch> [--json]
"""
import json
import re
import sys


def top_blocks(src, head):
    """Every top-level `(head ...)` block, split by parenthesis depth."""
    tok = f"\n\t({head}\n"
    starts = [m.start() + 1 for m in re.finditer(re.escape(tok), src)]
    out = []
    for i in starts:
        depth, j, in_str, esc = 0, i, False, False
        while True:
            ch = src[j]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif ch == '"':
                    in_str = False
            elif ch == '"':
                in_str = True
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        out.append(src[i:j + 1])
    if len(out) != len(starts):
        raise SystemExit("block split lost a symbol")
    return out


def parse(path):
    src = open(path).read()
    blocks = top_blocks(src, "symbol")
    rows = []
    for b in blocks:
        lib = re.search(r'\(lib_id "([^"]+)"\)', b).group(1)
        at = re.search(r'\(at ([-\d.]+) ([-\d.]+) (\d+)\)', b)
        row = {"lib_id": lib, "x": float(at.group(1)), "y": float(at.group(2)),
               "rot": int(at.group(3)), "fields": {}}
        for m in re.finditer(
                r'\(property "([^"]+)" "([^"]*)"\s*\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)', b):
            row["fields"][m.group(1)] = {
                "text": m.group(2), "x": float(m.group(3)),
                "y": float(m.group(4)), "angle": float(m.group(5))}
        row["ref"] = row["fields"].get("Reference", {}).get("text", "?")
        row["value"] = row["fields"].get("Value", {}).get("text", "?")
        rows.append(row)
    return rows, len(blocks)


def main():
    rows, n = parse(sys.argv[1])
    if "--json" in sys.argv:
        print(json.dumps(rows, indent=1))
        return
    print(f"=== {n} placed symbols")
    for r in sorted(rows, key=lambda r: (r["lib_id"], r["ref"])):
        f = r["fields"]
        ref, val = f.get("Reference", {}), f.get("Value", {})
        print(f"  {r['ref']:8} {r['lib_id']:34} at ({r['x']:>7}, {r['y']:>7}) rot {r['rot']:>3}"
              f"   Ref@({ref.get('x')}, {ref.get('y')}, {ref.get('angle')})"
              f"   Val '{r['value']}'@({val.get('x')}, {val.get('y')}, {val.get('angle')})")
    # A field renders horizontally when (symbol rotation + field angle) % 180 == 0.
    bad = [(r["ref"], k, v["angle"], r["rot"])
           for r in rows for k, v in r["fields"].items()
           if k in ("Reference", "Value") and (r["rot"] + v["angle"]) % 180 != 0]
    print(f"=== fields that render VERTICAL ((rot + angle) mod 180 != 0): {len(bad)}")
    for ref, k, a, rot in bad:
        print(f"  {ref:8} {k:10} angle {a}  symbol rotation {rot}")


main()
