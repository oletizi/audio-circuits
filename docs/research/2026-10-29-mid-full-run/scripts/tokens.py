"""Token-family census of a .kicad_sch, and a diff of two of them.

A "token family" is an s-expression head, e.g. `wire`, `global_label`, `uuid`.
The census counts occurrences of each. Two sheets that differ only by added
elements show up as a handful of families each moving by the same amount.

usage: tokens.py <a.kicad_sch> [b.kicad_sch]
"""
import collections
import re
import sys


def census(path):
    src = open(path).read()
    return collections.Counter(re.findall(r'\(([a-z_][a-z0-9_]*)[\s)]', src))


a = census(sys.argv[1])
if len(sys.argv) < 3:
    print(f"{len(a)} token families in {sys.argv[1]}")
    for k, v in sorted(a.items()):
        print(f"  {k:28} {v}")
    sys.exit(0)

b = census(sys.argv[2])
keys = sorted(set(a) | set(b))
print(f"families: A {len(a)}  B {len(b)}")
print(f"{'family':28} {'A':>6} {'B':>6}  delta")
for k in keys:
    d = b[k] - a[k]
    flag = "" if d == 0 else ("  <-- " + ("+" if d > 0 else "") + str(d))
    if d or k in ("wire", "global_label", "label", "symbol", "junction",
                  "rectangle", "text", "property", "pin", "no_connect"):
        print(f"  {k:26} {a[k]:>6} {b[k]:>6} {flag}")
