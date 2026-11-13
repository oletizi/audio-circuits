"""Tamper with a COPY of a block sheet's hierarchical labels, for a board's port-label controls
(first written for the h7-module's, under its ruling CR-MODULE-PORT-LABEL-CHECK). Never run on a committed page.

Parses by parenthesis depth (quoted strings honoured), finds the top-level `(hierarchical_label "NAME"
...)` nodes, and either swaps the texts of two of them or deletes one. Refuses a name the sheet does
not carry exactly once, so a control cannot pass for want of the label it meant to move.

usage: python3 label_tamper.py swap   <in.kicad_sch> <out.kicad_sch> <NAME_A> <NAME_B>
       python3 label_tamper.py delete <in.kicad_sch> <out.kicad_sch> <NAME>
"""
import pathlib
import sys


def top_level_nodes(src):
    """(start, end) of every node one level inside the file's outer (kicad_sch ...)."""
    nodes, depth, start, in_str, i = [], 0, None, False, 0
    while i < len(src):
        ch = src[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch == "(":
            depth += 1
            if depth == 2:
                start = i
        elif ch == ")":
            if depth == 2:
                nodes.append((start, i + 1))
            depth -= 1
            if depth < 0:
                raise SystemExit("label_tamper: unbalanced parentheses")
        i += 1
    if depth != 0:
        raise SystemExit(f"label_tamper: parenthesis depth ends at {depth}, not 0")
    return nodes


def labels(src):
    """name -> list of (start, end, name_start, name_end) for each top-level hierarchical label."""
    head = '(hierarchical_label "'
    found = {}
    for start, end in top_level_nodes(src):
        if not src.startswith(head, start):
            continue
        name_start = start + len(head)
        name_end = src.index('"', name_start)
        found.setdefault(src[name_start:name_end], []).append((start, end, name_start, name_end))
    return found


def one(found, name, path):
    hits = found.get(name, [])
    if len(hits) != 1:
        raise SystemExit(f"label_tamper: {path} carries {len(hits)} hierarchical labels named {name}, not 1")
    return hits[0]


def main(argv):
    if len(argv) < 4 or argv[1] not in ("swap", "delete"):
        raise SystemExit(__doc__)
    mode, src_path, out_path = argv[1], argv[2], argv[3]
    src = pathlib.Path(src_path).read_text()
    found = labels(src)
    if mode == "swap":
        if len(argv) != 6:
            raise SystemExit(__doc__)
        a, b = one(found, argv[4], src_path), one(found, argv[5], src_path)
        edits = sorted([(a[2], a[3], argv[5]), (b[2], b[3], argv[4])], reverse=True)
    else:
        if len(argv) != 5:
            raise SystemExit(__doc__)
        node = one(found, argv[4], src_path)
        line_start = src.rindex("\n", 0, node[0]) + 1
        cut_start = line_start if src[line_start:node[0]].strip() == "" else node[0]
        cut_end = node[1] + 1 if src[node[1]:node[1] + 1] == "\n" else node[1]
        edits = [(cut_start, cut_end, "")]
    for s, e, text in edits:
        src = src[:s] + text + src[e:]
    top_level_nodes(src)
    pathlib.Path(out_path).write_text(src)
    print(f"label_tamper: {mode} {' '.join(argv[4:])} -> {out_path}")


if __name__ == "__main__":
    main(sys.argv)
