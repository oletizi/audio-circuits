pultec-mid - drafted page record
================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-mid.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `d4b0b8cc6e3be35298cf1a240dcf8705bce655822224493670089df272138e2b` |
| Render | `pultec-mid.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `a2a2445ab370958cc365a7a93a6afdf5964ad487671de54bbbe1e3697376bbcf` |
| Approved page came from | `docs/research/2026-10-29-mid-full-run/mid-hybrid.kicad_sch` - **but the sheet here is no longer that page; see below** |
| This sheet came from | `docs/research/2026-10-30-mid-letter-redraw/pultec-mid-letter.kicad_sch`, copied byte-for-byte |
| Produced by | copperhead draft `v1-blocks-own-last`, then akcli repairs and a restyle pass; then **re-drawn for US Letter** on 2026-10-30 |
| Shown | 2026-10-29, as the A3 page plus the Mid group before and after, the capacitor bank, the coil row, and the `no_connect` marker |
| Paper | `USLetter`, **re-drawn from `A3`** on 2026-10-30 - **see below, this page is AWAITING RE-APPROVAL** |

Re-drawn from A3 to US Letter, centred, and AWAITING RE-APPROVAL
----------------------------------------------------------------

**THE VERDICT BELOW IS BOUND TO BYTES THAT NO LONGER EXIST, AND IT DOES NOT
TRANSFER.** This sheet was `A3` when it was approved and hashed to
`1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8`. It is now
`USLetter` and hashes to
`d4b0b8cc6e3be35298cf1a240dcf8705bce655822224493670089df272138e2b`. The sheet IS
the approved artifact only while its bytes still hash to the digest the verdict
was recorded against, so **this page is awaiting re-approval and must not be
described as approved anywhere.**
`../../../docs/schematic/verdicts.md` is deliberately NOT edited: the
re-approval is the reviewer's to record, and until he has looked there is no
verdict to record.

**AND THIS IS THE ONE PAGE OF THE FIVE WHERE THE BYTES CHANGED BY MORE THAN A
PAPER LINE AND A TRANSLATION.** A3 is 420 x 297 mm and US Letter landscape is
279.4 x 215.9; the drawing did not fit, so it was **re-drawn** rather than
re-papered. That work and its measurements are
`../../../docs/research/2026-10-30-mid-letter-redraw/`. The re-paper that the
other four pages got moves only the frame; this one could not be done that way,
which is why this page's provenance row names a different source file from its
approval row.

**THE RE-DRAW PRESERVED THE CIRCUIT, verified here rather than taken from the
run that did it.** The netlist exported from the approved A3 sheet and from this
one, both imported through `lib/kicad/netlist.ts`, give identical **39
components and 29 nets**, identical net names, an identical pin-set partition and
an identical name-to-pin-set mapping. The comparator's control moves one symbol
until a pin leaves its net and reports the difference, so the agreement is not
blind.

Centred on the horizontal axis, 2026-10-30
------------------------------------------

**AT THE OWNER'S DIRECTIVE, GIVEN LOOKING AT `pultec-hi-cut` AND EXTENDED TO
THIS PAGE IN THE SAME BREATH.** He said, of the uncentred Letter hi-cut page:

> *"It's goofy but serviceable. You need to center the content in the horizontal
> (long) axis."*

and, asked whether to centre the other four, answered:

> *"yes. approved. So are the build guides you've shown me"*

**THE WORD "APPROVED" THERE IS ABOUT THE CENTRED hi-cut PAGE AND THE BUILD
GUIDES, NOT ABOUT THIS PAGE.** He has not seen this page at all in its Letter
form. It is recorded here as a directive carried out, not as a verdict obtained.

**THE OFFSET CAME OUT ZERO, AND THE RULE WAS APPLIED ANYWAY.** The re-draw had
already placed this drawing symmetrically: its content spans x 15.240 .. 264.160,
whose midpoint is 139.700 mm, and the inner frame's midpoint is
`(12.0 + 267.4) / 2` = **139.700 mm** exactly. So the centring script computes an
offset of **zero** - `-1.95e-14 mm`, the float noise of a subtraction and a
halving - and the file it writes is **byte-identical** to the file it read. It
was still run, because all five pages are centred by one rule rather than four by
a rule and one by hand, and because a rule that is only applied where it changes
something cannot be shown to have been applied at all.

| | |
| --- | --- |
| offset applied | **0.000 mm** (the re-draw had already centred it) |
| content extent, from the sheet's own coordinates | x 15.240 .. 264.160 mm, 248.920 wide |
| margin to the inner frame | **west 3.240, east 3.240 mm** |

**3.240 mm IS THE SMALLEST MARGIN OF THE FIVE PAGES, AND IT IS A PROPERTY OF THE
DRAWING RATHER THAN OF ITS POSITION.** At 248.920 mm this is the widest of the
five drawings and the inner frame is 255.400 mm, so 6.480 mm is all the slack
that exists on this page in total; centring splits it evenly and cannot create
any. Narrowing it would be an arrangement change, which is not what a centring
pass may do.

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

**THE ZERO-OFFSET PASS IS STILL PROVED A RIGID TRANSLATION**, by
`../../../docs/research/2026-10-30-centre-and-promote/scripts/translation_proof.py`,
every check with its own positive control: **472 placed points** including all
**176 symbol fields** moved by 0 in x and 0 in y; counts identical at 84 wires,
44 symbols, 102 pin points, 37 labels, 29 junctions, 6 group rectangles, 6
texts; **total wire length identical at 1678.940 mm**; every field angle
unchanged. Deleting a wire, shortening a wire 5 mm, moving a symbol 1.27 mm and
rotating a field 90 degrees each make the corresponding check fail, so none of
them is blind.

Where the drawing sits, from `extent.py` against the rasterised frame: slack
**W +3.260, E +3.217**, N +3.260, S +34.967 mm, nothing outside the frame. The
0.043 mm west-east difference is the gap between the two frame measurements
above, not an error in the centring - the sheet's own coordinates are symmetric
to 4.8e-14 mm.

**THE RENDER'S RECIPE CHANGED ON THIS BOARD ALONE, and it is worth stating
because it accounts for most of this page's render diff.** The committed `.svg`
under `drafted/` is exported `kicad-cli sch export svg --black-and-white`, which
is how the other four were made - verified on this run by reproducing all four
of their committed digests from their unchanged sheets before anything was
overwritten. **`pultec-mid`'s previous committed render was the one exception:**
it was exported with no flag and carried **18 distinct colours**, including an
`#F5F4EF` background rectangle and `#840000` device outlines. Proved rather than
guessed - a no-flag export of the old sheet reproduces the old committed digest
`ccf3bbca81f169e2da8351fa4f382684b8f9a2680660ca791006c1bc12f5fa8b` exactly,
while a `--black-and-white` export does not. This board's render is now on the
same recipe as the other four, at one colour.

Verdict for the A3 page, verbatim - NOT a verdict on the page as it now stands
-----------------------------------------------------------------------------

> *"looks good. approved"*

and, scoping what that counts as - the ruling he gave on the low-cut page and
which every record under this directory repeats:

> *"If I have seen them and said they are acceptable, then that counts as
> approval (in THIS case - **do not generalize this into a dumb rule**)"*

**THE PARENTHESIS BINDS.** Nothing here says a reviewer's approval can be
inferred from warm words in general. `EVALUATING-DRAWINGS.md` §5 still reads:
approval is state the reviewer writes, never derived.

**THIS IS THE FIFTH AND LAST PULTEC SECTION BOARD**, and the one that produced no
drawing at all until the same day it was approved. The Mid group is
agent-authored - 28 of the board's 39 parts: seventeen capacitors in contact
order at 15.24 mm staircased to their own contacts, five tap buses at one y,
five winding sections above them, one 200.66 mm `coil_return` rail, eleven
selector runs each a single straight horizontal with no corner.

Stated to him as not done, and not objected to
----------------------------------------------

- the 90.5 x 28.5 mm unoccupied region in the Mid box's upper-left is not
  closed; closing it means moving the return block west or re-laying the group
- `#PWR01` unchanged - **the symbol all five accepted pages have now put up for
  overruling, still unruled**
- `#FLG01` moved rather than deleted; it earns nothing
- the `out` label still against J1's pin-4 number
- the Lo cut stand-in's output sits below its input; `S1` is followed, never
  enforced
- contacts named `sel1`..`sel11` rather than by frequency; `3300pF` left
  0.900 mm from its own plate; values centred rather than left-justified; seven
  nets gained a leading `/` from label scope; the five pre-existing ERC warnings
  not suppressed

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in `docs/research/2026-10-29-mid-full-run.md`, and
the two fixes that stood between no drawing and this one are in
`docs/research/2026-10-29-mid-pin12-nc.md` and
`docs/research/2026-10-29-mid-missing-junction.md`.

**AND `akcli check --layout` WAS WRONG HERE IN BOTH DIRECTIONS** on this page -
claiming an overlap where the render measures 1.896 mm of clear space, and twice
calling a label-over-wire collision on the label's own net - where the written
process knew only that it reports too few findings. Four committed checks were
wrong besides: a sheet holds library pins in two textual forms, and
`junction_audit.py` and `verify.py` dropped one of them, resolving 0 of 5 power
pins and reporting a false orphan junction at the shared ground symbol.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-mid.test.ts`, which re-runs it rather than
trusting this paragraph. Component identity, net membership **and pin identity**
all agree exactly. Two classes of disagreement remain, both a property of the
sheet having been drawn by copperhead and akcli rather than by `lib/schgen/`:

- `SW1`'s `Value` field holds `SW_Rotary_1x12` and `SW2`'s holds `SW_SPDT`,
  where the model holds `11-way selector` and `boost/off/cut`
- no part on the sheet carries a `Footprint` field at all

**AND ONE CLASS THE OTHER FOUR PAGES CARRY THAT THIS ONE DOES NOT.** They are
drawn with `Switch:SW_Rotary_1x6_MP`, whose mechanical mount lug `MP` is on no
net in the model (`circuits/pultec/schematic/section-board.ts:162`, and
`docs/known-gaps.md` **G282**), so each reports one `pinIdentity` disagreement.
`Switch:SW_Rotary_1x12` has **no `_MP` variant and so no lug**, and this board's
unused twelfth contact is declared not-connected in the model through
`ComponentOverride.ncPins` rather than left to disagree - it appears in the
export as the one-member net `unconnected-(SW1-Pad12)`. So this page's
`pinIdentity` list is **empty**, and the test asserts that emptiness as a claim
rather than omitting it.
