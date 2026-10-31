pultec-hi-boost - drafted page record
====================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-hi-boost.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `a1fa415966ad026c2448c25e65a7e267e51554853cb563399f62befc47bf668e` |
| Render | `pultec-hi-boost.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `6e16e5cb9a55cd87b7ece10775812c8185aae30f3aa200df7ea86e765bb88ead` |
| Paper | `USLetter`, re-papered from `A4` on 2026-10-30, then **centred** on the horizontal axis the same day - **see below, this page is AWAITING RE-APPROVAL** |
| Approved page came from | `docs/research/2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch`, copied byte-for-byte |
| Produced by | the accepted hi-boost page with the Lo boost stand-in group redrawn to the `S1` convention. **No copperhead** - the first run of this loop with no drafting step at all |
| Shown | 2026-10-29, as before/after crops of the group, a close crop of `SI7` and its ground, and the whole page |

Re-papered A4 to US Letter, and AWAITING RE-APPROVAL
----------------------------------------------------

**THE VERDICT BELOW IS BOUND TO BYTES THAT NO LONGER EXIST, AND IT DOES NOT
TRANSFER.** This sheet was `A4` when it was approved and hashed to
`240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a`. The re-paper
made it `9aa390a420edc4d845b5b0281b00e41efbae5e98dab90cdd847a2f55f38a2278`, and
the centring below made it
`a1fa415966ad026c2448c25e65a7e267e51554853cb563399f62befc47bf668e`. The sheet
IS the approved artifact only while its bytes still hash to the digest the
verdict was recorded against, so **this page is awaiting re-approval and must
not be described as approved anywhere.**
`../../../docs/schematic/verdicts.md` is deliberately NOT edited: the
re-approval is the reviewer's to record, and until he has looked there is no
verdict to record.

Centred on the horizontal axis, 2026-10-30
------------------------------------------

**AT THE OWNER'S DIRECTIVE, GIVEN LOOKING AT `pultec-hi-cut` AND EXTENDED TO
THIS PAGE IN THE SAME BREATH.** He said, of the uncentred Letter hi-cut page:

> *"It's goofy but serviceable. You need to center the content in the horizontal
> (long) axis."*

and, asked whether to centre the other four, answered:

> *"yes. approved. So are the build guides you've shown me"*

**THE WORD "APPROVED" THERE IS ABOUT THE CENTRED hi-cut PAGE AND THE BUILD
GUIDES, NOT ABOUT THIS PAGE.** He has not seen this page centred. It is
recorded here as a directive carried out, not as a verdict obtained.

| | |
| --- | --- |
| offset applied | **+9.5250 mm east** |
| content extent before | x 16.510 .. 243.840 mm, 227.330 wide |
| content extent after | x 26.035 .. 253.365 mm |
| margin to the inner frame | **west 14.035, east 14.035 mm** |

**THE FRAME, MEASURED TWO WAYS ON THIS KiCad AND NOT READ FROM A TABLE.** US
Letter landscape renders 279.400 x 215.900 mm, outer border 10.0, **inner border
12.0**, so the inner frame runs **x 12.0 .. 267.4** - 255.4 mm wide - and the
title block takes a **corner** from x 159.4, y 171.9.
`../../../docs/research/2026-10-30-centre-and-promote/scripts/frame_svg.py`
reads those as closed rectangles out of the exported SVG's own vectors;
`../../../docs/research/2026-10-30-mid-letter-redraw/scripts/framegeom.py`
rasterises a PDF at 600 dpi and gives `11.980 .. 267.377`, the same lines to
within half a stroke width. Each has a control that must find nothing on blank
input.

**IT IS A RIGID TRANSLATION, PROVED AND NOT ASSERTED** - by
`../../../docs/research/2026-10-30-centre-and-promote/scripts/translation_proof.py`
and `.../scripts/netcmp.ts`, each check with its own positive control:

- **367 placed points** - every wire end, symbol origin, junction, label,
  rectangle corner, text and **every one of the 128 symbol fields** - moved by
  the same +9.5250 mm in x and 0 in y, worst deviation 2.5e-14 mm. Moving one
  symbol 1.27 mm in the after-sheet makes that test fail, so it is not blind.
- counts identical: 72 wires, 32 symbols, 73 pin points, 28 labels, 17
  junctions, 6 group rectangles, 6 texts. Deleting one wire makes them differ.
- **total wire length identical at 1181.100 mm** - a stretched wire would change
  it. Shortening one wire 5 mm makes it differ.
- every field's angle unchanged. Rotating one field 90 degrees makes them differ.
- the netlist exported from each and imported through `lib/kicad/netlist.ts`:
  **27 components, 21 nets**, net names, the pin-set partition and the
  name-to-pin-set mapping all identical. The control moves one symbol until a
  pin leaves its net and the comparator reports it; `#FLG01` is already floating
  so moving it changes nothing, and `#PWR01` is the symbol that discriminates.
- the sheet's parenthesis depth is counted before each export, because
  `kicad-cli sch export netlist` **exits 0 on a paren-broken sheet** and writes
  an empty components and nets section, and two empty netlists compare identical.
  A zero-component or zero-net import is refused rather than compared.

Where the drawing sits, from `extent.py` against the rasterised frame: slack
**W +14.055, E +14.012**, N +19.770, S +50.207 mm, nothing outside the frame.
The 0.043 mm west-east difference is the gap between the two frame measurements
above, not an error in the centring - the sheet's own coordinates are symmetric
to 3.2e-14 mm.

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

Where the drawing sat on the new paper **before the centring pass above moved
it** - kept because it is what the re-paper on its own produced, and the
asymmetry in it is what the centring was directed to fix. Measured off the
rendered page and not computed from the paper's nominal size. US Letter
landscape's inner frame, as this KiCad draws it, is x 11.980 .. 267.377 and
y 11.980 .. 203.877 mm, and its title block occupies the corner from x 159.300,
y 171.831:

| | **superseded by the centring above** |
| --- | --- |
| drawing reach, from the render | x 16.341 .. 243.967, y 31.581 .. 153.797 mm |
| clearance to the inner frame | W +4.360, **E +23.410**, N +19.600, S +50.080 mm |
| drawing pixels outside the inner frame | 0 |
| clearance to the title block's top edge | 18.034 mm |

The **W +4.360 against E +23.410** in that table is the 19.05 mm of asymmetry the
centring removed; the current figures are in the centring section above.

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
