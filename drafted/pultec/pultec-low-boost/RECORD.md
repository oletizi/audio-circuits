pultec-low-boost - drafted page record
=====================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-low-boost.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `2849126909cb7bda048f17dbc92acdae7cb7eaf6409c414db6ab05e2ba5ce67a` |
| Render | `pultec-low-boost.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `b29fd05cd6cf1b983cebfbd0d550f2e664e385566e9bad1a99a4c608a375a0c7` |
| Paper | `USLetter`, re-papered from `A4` on 2026-10-30 - **see below, this page is AWAITING RE-APPROVAL** |
| Approved page came from | `docs/research/2026-10-29-hybrid-pass-1/hybrid-pass-1.kicad_sch`, copied byte-for-byte |
| Produced by | copperhead draft, then akcli-kicad repairs |
| Shown | 2026-10-29 |

Re-papered A4 to US Letter, and AWAITING RE-APPROVAL
----------------------------------------------------

**THE VERDICT BELOW IS BOUND TO BYTES THAT NO LONGER EXIST, AND IT DOES NOT
TRANSFER.** This sheet was `A4` when it was approved and hashed to
`42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7`. It is now
`USLetter` and hashes to
`2849126909cb7bda048f17dbc92acdae7cb7eaf6409c414db6ab05e2ba5ce67a`. The sheet
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
  identical components (19), nets (15) and net membership; moving one pin
  between two nets changes the fingerprint
- the sheet-body geometry read through `docs/research/lib/kicad_sheet.py` is
  identical: 78 wires totalling 605.790 mm, 25 symbols, 57 pin points, 20
  labels, 14 junctions, 4 group rectangles, 4 texts

Where the drawing sits on the new paper, measured off the rendered page and not
computed from the paper's nominal size. US Letter landscape's inner frame, as
this KiCad draws it, is x 11.980 .. 267.377 and y 11.980 .. 203.877 mm, and its
title block occupies the corner from x 159.300, y 171.831:

| | |
| --- | --- |
| drawing reach, from the render | x 50.631 .. 246.507, y 34.121 .. 152.527 mm |
| clearance to the inner frame | W +38.650, **E +20.870**, N +22.140, S +51.350 mm |
| drawing pixels outside the inner frame | 0 |
| clearance to the title block's top edge | 19.304 mm |

Reproduce it by differencing a render of this sheet against a render of an empty
sheet on the same paper, in **colour**: the group boxes are drawn in colour and
orange `(220 110 20)` greyscales to 132.6, so a "dark pixel" threshold of 128
silently cannot see an orange box. That fault produced a wrong answer on this
run before it was caught by a control.

Verdict for the A4 page, verbatim - NOT a verdict on the page as it now stands
-----------------------------------------------------------------------------

> *"the repairs to the drawing make it MUUUUCH better."*

and, scoping what that counts as:

> *"If I have seen them and said they are acceptable, then that counts as
> approval (in THIS case - **do not generalize this into a dumb rule**)"*

**THE PARENTHESIS BINDS.** Nothing here says a reviewer's approval can be
inferred from warm words in general. `EVALUATING-DRAWINGS.md` §5 still reads:
approval is state the reviewer writes, never derived.

Carried, not closed
-------------------

Four items this page still holds, none of which he named as a defect. The
register has them in full; they are named here so a reader of the drawing knows
they were seen:

- `#PWR02`, J1's ground
- the `RV1`/`47K` text graze
- eight single-instance local labels
- the Hi boost group rectangle larger than its contents

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in
`docs/research/2026-10-29-hybrid-pass-1.md`.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-low-boost.test.ts`, which re-runs it rather
than trusting this paragraph. Component identity and net membership agree
exactly. Three classes of disagreement remain, every one a property of the sheet
having been drawn by copperhead and akcli rather than by `lib/schgen/`:

- `SW1` carries the `SW_Rotary_1x6_MP` symbol's mechanical mount pin `MP`, which
  is on no net in the model (`circuits/pultec/schematic/section-board.ts:162`)
- `SW1`'s `Value` field holds the symbol name rather than the model's
  `6-way selector`
- six capacitor values and `SI3`'s are written with a leading zero
  (`0.33uF`) where the model writes none (`.33uF`)
- no part on the sheet carries a `Footprint` field at all
