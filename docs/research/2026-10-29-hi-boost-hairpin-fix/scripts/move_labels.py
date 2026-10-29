"""Move the Lo boost group's two global labels. A PRE-pass, before the akcli ops.

akcli 0.22.0 has no operation that moves a label: the vocabulary is
`add_net_label` and `rename_net`, and nothing else touches one. Deleting and
re-adding would lose copperhead's `(thickness 0.2)` styling and the
`Intersheetrefs` property, so the two anchors are edited as literals instead.

IT RUNS BEFORE THE OPS, not after, and that ordering is the point. `akcli plan`
checks the connectivity of the state its ops produce, and with the labels still
at their old anchors it reports two `DANGLING_ENDPOINT` errors against the new
wires - correctly, because at that moment nothing meets them. Moving the labels
first is what makes akcli's own connectivity check and net diff mean something
rather than be worked around.

Each label block is matched whole, including its `Intersheetrefs` property,
because that property carries its own copy of the anchor and a moved label that
leaves it behind puts a hidden field somewhere else on the sheet.

WHERE THEY GO, and why:
  `lo_boost_in` is the INPUT. It keeps rotation 180, so its tag extends LEFT
  from the anchor and the wire leaves the anchor heading RIGHT into the circuit.
  It moves from y 59.69 - the BOTTOM of the group, below the output - up to the
  signal line at 43.18.

  `out` is the OUTPUT. It keeps rotation 0, so its tag extends RIGHT from the
  anchor, which is what "pointing right" means for a `passive` global label on
  this sheet. It moves from (189.23, 41.91), where the wire reached it from
  BELOW and it pointed up, to (207.01, 43.18) at the right-hand end of the
  signal line.

Both substitutions must match exactly once.

usage: move_labels.py <sheet.kicad_sch>
"""
import sys

IN_OLD = '''	(global_label "lo_boost_in" (shape passive) (at 189.23 59.69 180) (fields_autoplaced yes)
		(effects (font (size 1.27 1.27) (thickness 0.2)) (justify right))
		(uuid "c6d09b95-eb49-5b37-8e4a-6e081e9dbe5c")
		(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 189.23 59.69 0)
'''
IN_NEW = '''	(global_label "lo_boost_in" (shape passive) (at 189.23 43.18 180) (fields_autoplaced yes)
		(effects (font (size 1.27 1.27) (thickness 0.2)) (justify right))
		(uuid "c6d09b95-eb49-5b37-8e4a-6e081e9dbe5c")
		(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 189.23 43.18 0)
'''

OUT_OLD = '''	(global_label "out" (shape passive) (at 189.23 41.91 0) (fields_autoplaced yes)
		(effects (font (size 1.27 1.27) (thickness 0.2)) (justify left))
		(uuid "d6d38d9a-e39b-52ca-afe7-24e54e04cfac")
		(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 189.23 41.91 0)
'''
OUT_NEW = '''	(global_label "out" (shape passive) (at 207.01 43.18 0) (fields_autoplaced yes)
		(effects (font (size 1.27 1.27) (thickness 0.2)) (justify left))
		(uuid "d6d38d9a-e39b-52ca-afe7-24e54e04cfac")
		(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 207.01 43.18 0)
'''

EDITS = [
    (IN_OLD, IN_NEW, "lo_boost_in: (189.23, 59.69) -> (189.23, 43.18), rot 180 "
                     "kept - the input enters at the left of the signal line"),
    (OUT_OLD, OUT_NEW, "out: (189.23, 41.91) -> (207.01, 43.18), rot 0 kept - "
                       "the output leaves at the right, tag pointing right"),
]


def main():
    path = sys.argv[1]
    src = open(path).read()
    for old, new, why in EDITS:
        got = src.count(old)
        if got != 1:
            sys.exit(f"LABEL EDIT FAILED: block appears {got} times, expected 1\n"
                     f"{old}")
        src = src.replace(old, new, 1)
        print(f"  label     {why}")
    open(path, "w").write(src)
    print(f"{len(EDITS)} label blocks moved in {path}")


main()
