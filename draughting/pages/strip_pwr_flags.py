"""Write a copy of a sheet with every PLACED power:PWR_FLAG instance removed, for the ERC negative
control (erc-control.sh). The lib_symbols definition stays; only top-level (symbol (lib_id ...))
blocks go. Parsed by parenthesis depth, not by a line pattern, because a sheet holds symbols in two
textual forms (TOOLING.md's trap index). Refuses unless it removes exactly the expected count.

usage: python3 strip_pwr_flags.py <in.kicad_sch> <out.kicad_sch> <expected-count>
"""
import sys

src, dst, expected = sys.argv[1], sys.argv[2], int(sys.argv[3])
text = open(src, encoding="utf-8", newline="").read()

out = []
removed = 0
depth = 0
i = 0
n = len(text)
in_string = False
while i < n:
    c = text[i]
    if in_string:
        out.append(c)
        if c == "\\":
            out.append(text[i + 1])
            i += 2
            continue
        if c == '"':
            in_string = False
        i += 1
        continue
    if c == '"':
        in_string = True
        out.append(c)
        i += 1
        continue
    if c == "(" and depth == 1 and text.startswith("(symbol", i):
        # find the end of this block
        j = i
        d = 0
        s = False
        while True:
            ch = text[j]
            if s:
                if ch == "\\":
                    j += 2
                    continue
                if ch == '"':
                    s = False
            elif ch == '"':
                s = True
            elif ch == "(":
                d += 1
            elif ch == ")":
                d -= 1
                if d == 0:
                    break
            j += 1
        block = text[i:j + 1]
        if '(lib_id "power:PWR_FLAG")' in block:
            removed += 1
            i = j + 1
            continue
        out.append(block)
        i = j + 1
        continue
    if c == "(":
        depth += 1
    elif c == ")":
        depth -= 1
    out.append(c)
    i += 1

if removed != expected:
    sys.exit(f"strip_pwr_flags.py: removed {removed} placed PWR_FLAG instance(s), expected {expected}")
open(dst, "w", encoding="utf-8", newline="").write("".join(out))
print(f"strip_pwr_flags.py: removed {removed} placed PWR_FLAG instance(s)")
