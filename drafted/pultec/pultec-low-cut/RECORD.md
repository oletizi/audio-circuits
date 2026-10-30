pultec-low-cut - drafted page record
===================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-low-cut.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `189c8d3098931e406cc7533bace242e29e27d780966f65f36e3a9c1157e50fee` |
| Render | `pultec-low-cut.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `d03aa08d1dc95415f8a82859bade984c358a47fb32782fdd36ce217fb47639a4` |
| Paper | `USLetter`, re-papered from `A4` on 2026-10-30 - **see below, this page is AWAITING RE-APPROVAL** |
| Approved page came from | `docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch`, copied byte-for-byte |
| Produced by | the accepted full-run page with both duplicate on-page label pairs collapsed to wires; SI5 and SI6 redrawn as a series column |
| Shown | 2026-10-29, as the full page plus before/after crops of the Hi cut group |

Re-papered A4 to US Letter, and AWAITING RE-APPROVAL
----------------------------------------------------

**THE VERDICT BELOW IS BOUND TO BYTES THAT NO LONGER EXIST, AND IT DOES NOT
TRANSFER.** This sheet was `A4` when it was approved and hashed to
`65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d`. It is now
`USLetter` and hashes to
`189c8d3098931e406cc7533bace242e29e27d780966f65f36e3a9c1157e50fee`. The sheet
IS the approved artifact only while its bytes still hash to the digest the
verdict was recorded against, so **this page is awaiting re-approval and must
not be described as approved anywhere.**
`../../../docs/schematic/verdicts.md` is deliberately NOT edited: the
re-approval is the reviewer's to record, and until he has looked there is no
verdict to record.

Changed at the owner's instruction, 2026-10-30:

> *"yes, switch the other four boards to us letter"*

following:

> *"I don't have an A3-capable printer. I live in california and have a printer
> capable of printing US letter 8.5x11"."*

**WHAT CHANGED IS ONE LINE AND NOTHING ELSE.** `(paper "A4")` became
`(paper "USLetter")`; the sheet's diff is one insertion and one deletion.
`USLetter` is the token KiCad itself writes - `kicad-cli sch upgrade` round-trips
it unchanged and the exported page measures 279.4 x 215.9 mm, while a token
KiCad does not recognise makes both `upgrade` and `export` exit 3 rather than
falling back to a size nobody chose.

The drawing is the same drawing, measured four ways rather than asserted:

- the sheet body's bytes are untouched, so the one-line diff is itself the proof
- `kicad-cli sch export svg -e` (no frame, no title block) of the before and
  after sheets differ on **exactly one line** - the `<svg>` page box - and on no
  drawing path; moving one wire 1 mm makes that comparison report differences,
  so it is not blind
- the netlist exported from each, imported through `lib/kicad/netlist.ts`, gives
  identical components (20), nets (15) and net membership; moving one pin
  between two nets changes the fingerprint
- the sheet-body geometry read through `docs/research/lib/kicad_sheet.py` is
  identical: 63 wires totalling 873.760 mm, 25 symbols, 58 pin points, 22
  labels, 17 junctions, 6 group rectangles, 6 texts

**THIS IS THE TIGHTEST OF THE THREE RE-PAPERED PAGES ON THE EAST SIDE, AND THE
FIGURE IS WORTH KNOWING BEFORE ANYTHING ELSE MOVES.** Where the drawing sits on
the new paper, measured off the rendered page and not computed from the paper's
nominal size. US Letter landscape's inner frame, as this KiCad draws it, is
x 11.980 .. 267.377 and y 11.980 .. 203.877 mm, and its title block occupies the
corner from x 159.300, y 171.831:

| | |
| --- | --- |
| drawing reach, from the render | x 30.311 .. 265.557, y 44.281 .. 142.367 mm |
| clearance to the inner frame | W +18.330, **E +1.820**, N +32.300, S +61.510 mm |
| drawing pixels outside the inner frame | 0 |
| clearance to the title block's top edge | 29.464 mm |

The item that sets that east reach is the **Lo boost group box**, whose east
edge the sheet declares at x 265.430; the render puts its ink at 265.557,
0.127 mm further, which is half of its 0.3 mm stroke. On A4 the same box had
19.410 mm of clearance. **1.820 mm is the whole margin on this page**, so any
future widening of that box, or of anything east of x 250, comes out of it.

Reproduce it by differencing a render of this sheet against a render of an empty
sheet on the same paper, in **colour**. That is not a detail: this box is drawn
orange `(220 110 20)`, which greyscales to 132.6, so a "dark pixel" threshold of
128 **cannot see it at all**. A greyscale pass on this run reported this page's
easternmost ink at 252.772 mm - 12.7 mm west of where it is - and read the box
as absent from a render it is plainly in.

Verdict for the A4 page, verbatim - NOT a verdict on the page as it now stands
-----------------------------------------------------------------------------

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
