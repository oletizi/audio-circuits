pultec-hi-boost - drafted page record
====================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-hi-boost.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `9aa390a420edc4d845b5b0281b00e41efbae5e98dab90cdd847a2f55f38a2278` |
| Render | `pultec-hi-boost.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `f694f0e43d5edd82a3bbc8422cbf8072b0bdb8eb1265a8c262eb021175f2ee4c` |
| Paper | `USLetter`, re-papered from `A4` on 2026-10-30 - **see below, this page is AWAITING RE-APPROVAL** |
| Approved page came from | `docs/research/2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch`, copied byte-for-byte |
| Produced by | the accepted hi-boost page with the Lo boost stand-in group redrawn to the `S1` convention. **No copperhead** - the first run of this loop with no drafting step at all |
| Shown | 2026-10-29, as before/after crops of the group, a close crop of `SI7` and its ground, and the whole page |

Re-papered A4 to US Letter, and AWAITING RE-APPROVAL
----------------------------------------------------

**THE VERDICT BELOW IS BOUND TO BYTES THAT NO LONGER EXIST, AND IT DOES NOT
TRANSFER.** This sheet was `A4` when it was approved and hashed to
`240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a`. It is now
`USLetter` and hashes to
`9aa390a420edc4d845b5b0281b00e41efbae5e98dab90cdd847a2f55f38a2278`. The sheet
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
  identical components (27), nets (21) and net membership; moving one pin
  between two nets changes the fingerprint
- the sheet-body geometry read through `docs/research/lib/kicad_sheet.py` is
  identical: 72 wires totalling 1181.100 mm, 32 symbols, 73 pin points, 28
  labels, 17 junctions, 6 group rectangles, 6 texts

Where the drawing sits on the new paper, measured off the rendered page and not
computed from the paper's nominal size. US Letter landscape's inner frame, as
this KiCad draws it, is x 11.980 .. 267.377 and y 11.980 .. 203.877 mm, and its
title block occupies the corner from x 159.300, y 171.831:

| | |
| --- | --- |
| drawing reach, from the render | x 16.341 .. 243.967, y 31.581 .. 153.797 mm |
| clearance to the inner frame | W +4.360, **E +23.410**, N +19.600, S +50.080 mm |
| drawing pixels outside the inner frame | 0 |
| clearance to the title block's top edge | 18.034 mm |

Reproduce it by differencing a render of this sheet against a render of an empty
sheet on the same paper, in **colour**: the group boxes are drawn in colour and
orange `(220 110 20)` greyscales to 132.6, so a "dark pixel" threshold of 128
silently cannot see an orange box. That fault produced a wrong answer on this
run before it was caught by a control.

Verdict for the A4 page, verbatim - NOT a verdict on the page as it now stands
-----------------------------------------------------------------------------

> *"approved."*

**THIS IS THE FIRST DRAWING IN THE RECORD HE HAS USED THAT WORD FOR**, and it is
recorded as his word rather than normalised into a status - the vocabulary is
still his to name and neither this file nor the register has a status field.

The Hi boost group's arrangement is agent-authored, not copperhead's: nine
capacitors in contact order at 15.24 mm pitch, four tapped-coil sections each
above the x-span of the capacitors on its tap, four tap buses, one 113.03 mm
`coil_top` rail.

Electrically a no-op against the page before it, verified three ways - net
partition as `REF.PIN` sets, net names, and the name-to-pin-set mapping all
identical; ERC 0 errors both sides, 5 pre-existing `lib_symbol_issues` warnings
both sides.

Stated to him as not done, and not objected to
----------------------------------------------

- **`Lo boost` was the only inverted group on the page.** The other five were
  checked and deliberately left alone - `S1` is followed, never enforced, and he
  scoped the repair to one group
- the other three ground symbols' carried Reference offsets, and the four
  different `GND`-text offsets on the page
- the scoped/unscoped net-name mix
- `#PWR01`, J1's ground, still unchanged and still the symbol put up for
  overruling on the low-boost page

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in
`docs/research/2026-10-29-hi-boost-hairpin-fix.md` and
`docs/research/2026-10-29-hi-boost-full-run.md`.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-hi-boost.test.ts`, which re-runs it rather
than trusting this paragraph. Component identity and net membership agree
exactly. Two classes of disagreement remain, both a property of the sheet having
been drawn outside `lib/schgen/`:

- `SW1` carries the `SW_Rotary_1x6_MP` symbol's mechanical mount pin `MP`, which
  is on no net in the model (`circuits/pultec/schematic/section-board.ts:162`),
  and its `Value` field holds the symbol name rather than the model's
  `6-way selector`
- no part on the sheet carries a `Footprint` field at all. Seven of this board's
  parts - the four tapped coil sections, both pots and the selector - declare no
  footprint in the model either, so for those there is nothing to compare in
  EITHER direction and the comparison says nothing about them
