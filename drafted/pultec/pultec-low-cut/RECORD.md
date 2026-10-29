pultec-low-cut - drafted page record
===================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-low-cut.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d` |
| Render | `pultec-low-cut.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `47835f505e2f2c7cc9b7a667ac132a83050491cca8e652e9ece170fec50a2a70` |
| Approved page came from | `docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch`, copied byte-for-byte |
| Produced by | the accepted full-run page with both duplicate on-page label pairs collapsed to wires; SI5 and SI6 redrawn as a series column |
| Shown | 2026-10-29, as the full page plus before/after crops of the Hi cut group |

Verdict, verbatim
-----------------

> *"the low-cut page is fine. It's serviceable."*

and, scoping what that counts as:

> *"If I have seen them and said they are acceptable, then that counts as
> approval (in THIS case - **do not generalize this into a dumb rule**)"*

**THE PARENTHESIS BINDS.** Nothing here says a reviewer's approval can be
inferred from warm words in general. `EVALUATING-DRAWINGS.md` §5 still reads:
approval is state the reviewer writes, never derived.

On the earlier revision of this page he also said, unprompted:

> *"the long rail is the right choice. It's much more clear than a pair of labels
> would have been. On-page labels in place of wires should be used very
> sparingly. I've almost never seen it used"*

Stated to him as not done, and not objected to
----------------------------------------------

- the ~40 mm void in the middle of the Hi cut box is not closed
- the `hi_boost_out` label above SI5 sits 1.27 mm below the group box's top edge,
  the smallest gap on the page, nothing overlapping
- `#FLG01` and the four ground symbols are unchanged, including the `#PWR01` put
  up for overruling on the low-boost page

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in
`docs/research/2026-10-29-low-cut-collapse-pass.md` and
`docs/research/2026-10-29-low-cut-full-run.md`.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-low-cut.test.ts`, which re-runs it rather
than trusting this paragraph. Component identity and net membership agree
exactly. Two classes of disagreement remain, both a property of the sheet having
been drawn by copperhead and akcli rather than by `lib/schgen/`:

- `SW1` carries the `SW_Rotary_1x6_MP` symbol's mechanical mount pin `MP`, which
  is on no net in the model (`circuits/pultec/schematic/section-board.ts:162`),
  and its `Value` field holds the symbol name rather than the model's
  `6-way selector`
- no part on the sheet carries a `Footprint` field at all
