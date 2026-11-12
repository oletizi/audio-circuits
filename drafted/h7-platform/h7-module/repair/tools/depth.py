"""Parenthesis depth at end of file, string-aware; also the minimum depth reached.
A sheet must end at 0 and never go below 0. Exits 1 otherwise.

usage: python3 depth.py <sheet.kicad_sch>
"""
import sys

src = open(sys.argv[1]).read()
depth = lowest = 0
in_str = esc = False
for c in src:
    if in_str:
        if esc:
            esc = False
        elif c == "\\":
            esc = True
        elif c == '"':
            in_str = False
    elif c == '"':
        in_str = True
    elif c == "(":
        depth += 1
    elif c == ")":
        depth -= 1
        lowest = min(lowest, depth)
print(f"depth at end {depth}; lowest {lowest}")
sys.exit(0 if depth == 0 and lowest == 0 else 1)
