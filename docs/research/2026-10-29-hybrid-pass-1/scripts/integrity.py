"""Compare two .kicad_sch files: sha256, token-family census, global_label count.

Reporting only. Takes two paths, prints a diff.
"""
import collections
import hashlib
import re
import sys


def sha(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def census(path):
    src = open(path).read()
    return collections.Counter(re.findall(r"\(([A-Za-z_][A-Za-z0-9_]*)[\s)]", src))


a, b = sys.argv[1], sys.argv[2]
print("sha256 BEFORE", sha(a))
print("sha256 AFTER ", sha(b))
print("sha256", "SAME" if sha(a) == sha(b) else "DIFFERS")
print()

ca, cb = census(a), census(b)
keys = sorted(set(ca) | set(cb))
print(f"token families: {len(ca)} before, {len(cb)} after")
changed = [(k, ca.get(k, 0), cb.get(k, 0)) for k in keys if ca.get(k, 0) != cb.get(k, 0)]
if not changed:
    print("TOKEN CENSUS: every family identical")
else:
    print(f"{len(changed)} families changed:")
    for k, x, y in changed:
        print(f"   {k:28s} {x:5d} -> {y:5d}   {y - x:+d}")
print()
for k in ("global_label", "label", "symbol", "wire", "junction", "property", "pin", "text", "rectangle"):
    x, y = ca.get(k, 0), cb.get(k, 0)
    print(f"   {k:14s} {x:5d} -> {y:5d}  {'SAME' if x == y else 'CHANGED'}")
