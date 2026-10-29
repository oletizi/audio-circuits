"""Print the uuid of each wire, keyed by its endpoints."""
import re
import sys

src = open(sys.argv[1]).read()
want = sys.argv[2:]

for m in re.finditer(
    r"\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)"
    r"(?:\s*\(stroke[^)]*\)[^)]*\))?.*?\(uuid \"([0-9a-f-]+)\"\)",
    src,
    re.S,
):
    ax, ay, bx, by, uid = m.groups()
    key = f"({ax}, {ay})-({bx}, {by})"
    if not want or any(w in key for w in want):
        print(f"{key:44s} {uid}")
