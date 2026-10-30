pultec-hi-cut - drafted page record
==================================

**`../../../docs/schematic/verdicts.md` IS THE AUTHORITY FOR THE VERDICT.** This
file is the copy that sits next to the drawing; where the two ever disagree, the
register is right and this one is stale.

| | |
| --- | --- |
| Sheet | `pultec-hi-cut.generated-do-not-edit.kicad_sch` |
| **sha256 of the sheet - THE BINDING** | `e9843e6dbd3f765822e34bf51cd0d3d2659f0a6969c4c9a866e7691727bdf332` |
| Render | `pultec-hi-cut.generated-do-not-edit.svg` |
| sha256 of the render, volatile title line dropped - **evidence, not a binding** | `102468842317d357d26569168c8a4665ca29fe99302b3bd636e2e60c9a99e65a` |
| Approved page came from | the centred Letter page shown to him on 2026-10-30, copied byte-for-byte; that page came from `docs/research/2026-10-29-hi-cut-full-run/hi-cut-hybrid.kicad_sch` by a re-paper and one rigid translation |
| Produced by | copperhead draft `v4-blocks-mid-late`, then akcli repairs and a field-restating pass; then re-papered to `USLetter` and translated 21.59 mm west to centre it |
| Shown | 2026-10-29 as the A4 page; 2026-10-30 as the Letter page untouched, the A4 page beside it, and the centred Letter page |
| Paper | `USLetter`, centred on the horizontal axis - **and APPROVED in that state; see below** |

Re-papered, centred, and APPROVED in this state
-----------------------------------------------

**THIS IS THE ONE PULTEC PAGE WHOSE VERDICT IS BOUND TO THE BYTES THAT ARE
HERE.** The sheet in this directory hashes to
`e9843e6dbd3f765822e34bf51cd0d3d2659f0a6969c4c9a866e7691727bdf332`, and that is
the digest `../../../docs/schematic/verdicts.md` records his approval against.
The other four pages in `drafted/pultec/` are **awaiting re-approval**; this one
is not.

The owner, 2026-10-30, looking at this page on US Letter with nothing moved:

> *"It's goofy but serviceable. You need to center the content in the horizontal
> (long) axis."*

and then, on the centred page:

> *"yes. approved. So are the build guides you've shown me"*

**THE SECOND SENTENCE ALSO APPROVES THE BUILD GUIDE DOCUMENTS**, which are a
separate artifact from any page.

**WHAT THAT APPROVAL DOES NOT COVER, stated here because the register states it
too.** He ruled on this page and on the guides. He did **not** rule on the Letter
pages for `pultec-mid`, `pultec-hi-boost`, `pultec-low-boost` or
`pultec-low-cut`, and the centring he directed has since changed three of their
sheets' bytes. Nothing in this file may be read as a verdict on them.

**THE CENTRING WAS ALREADY IN THESE BYTES, AND THE RE-RUN PROVES IT RATHER THAN
ASSERTING IT.** The centring rule was applied to all five pages on 2026-10-30 by
one script, `docs/research/2026-10-30-centre-and-promote/scripts/center.py`, so
that no page is centred by a different definition from its neighbours. Run
against this sheet it computes an offset of **zero** - `-7.11e-15 mm`, which is
the float noise of a subtraction and a halving - and the file it writes is
**byte-identical** to the file it read. That byte-identity is asserted by the
script and refuses if it fails; the assertion is exercised by
`docs/research/2026-10-30-centre-and-promote/scripts/zero_offset_control.py`,
which hands it a sheet whose bytes must change and confirms it refuses. So the
approved artifact passed through the same rule as the other four and came out
untouched.

| | |
| --- | --- |
| offset applied by the 2026-10-30 centring pass | **0.000 mm** (already centred) |
| content extent, from the sheet's own coordinates | x 29.210 .. 250.190 mm, 220.980 wide |
| margin to the inner frame | **west 17.210, east 17.210 mm** |

**THE FRAME, MEASURED TWO WAYS ON THIS KiCad AND NOT READ FROM A TABLE.** US
Letter landscape renders 279.400 x 215.900 mm, outer border 10.0, **inner border
12.0**, so the inner frame runs **x 12.0 .. 267.4** - 255.4 mm wide - and the
title block takes a **corner** from x 159.4, y 171.9. Two measurements agree:
`frame_svg.py` reads the closed rectangles out of the exported SVG's own vectors
and gives exactly `12.0 .. 267.4`;
`../../../docs/research/2026-10-30-mid-letter-redraw/scripts/framegeom.py`
rasterises a PDF at 600 dpi and finds the full-span dark rows and columns, giving
`11.980 .. 267.377` - the same lines to within half a stroke width. **Re-derived
rather than taken, because two earlier runs reported two different figures for
it.** Both have a positive control: the line detector must find nothing on an
all-white image, and the vector reader nothing in emptied path data.

Where the drawing sits, from `extent.py` against the rasterised frame
`11.980 .. 267.377`: slack **W +17.230, E +17.187**, N +19.770, S +71.797 mm,
nothing outside the frame. The 0.043 mm west-east difference is the gap between
the two frame measurements above, not an error in the centring - the sheet's own
coordinates are symmetric to 2.1e-14 mm.

Verdict, verbatim
-----------------

For the A4 page, 2026-10-29:

> *"looks good. approved"*

And for the centred US Letter page that is in this directory now, 2026-10-30:

> *"yes. approved. So are the build guides you've shown me"*

The Hi cut group is agent-authored: `lo_boost_in`'s fourteen pins drawn once as
a 193.04 mm rail along the top, ten capacitors vertical beneath it in contact
order at 15.24 mm, six straight selector runs, ten risers.

**THE PITCH WAS MEASURED FOR THIS PART SET, NOT COPIED.** 15.24 mm lands on the
same number as the hi-boost page, and the run established that as a coincidence
of both boards carrying six-character values. **And character count is not a
proxy for text width**, measured off the render at 600 dpi: `2200pF` draws
6.858 mm and `.047uF` 6.223 mm at the same six characters, because the leading
`.` is narrow.

Stated to him as not done, and not objected to
----------------------------------------------

- the Hi cut arrangement is agent-authored and unreviewed as an arrangement
- three unoccupied regions inside the Hi cut rectangle not closed
- `#PWR01` unchanged - the same symbol all four accepted pages have put up for
  overruling, still unruled
- `#FLG01` moved rather than deleted
- the `out` label still against J1's pin-4 number
- `2200pF` left 0.63 mm from its own plate
- one net renamed by label scope; the five pre-existing ERC warnings not
  suppressed

Legibility findings
-------------------

**A POINTER LIST, NOT A GRADE.** §3 of the practice design: *"A finding does not
make a drawing bad; no finding does not make it good."* Reproduce with
`bun run tools/schgen/board-geometry.ts` and with `akcli check --layout`; the
run's own measurements are in `docs/research/2026-10-29-hi-cut-full-run.md`.

Where the sheet disagrees with the circuit model
------------------------------------------------

Measured by `tests/circuits/pultec-hi-cut.test.ts`, which re-runs it rather than
trusting this paragraph. Component identity and net membership agree exactly.
Two classes of disagreement remain, both a property of the sheet having been
drawn by copperhead and akcli rather than by `lib/schgen/`:

- `SW1` carries the `SW_Rotary_1x6_MP` symbol's mechanical mount pin `MP`, which
  is on no net in the model (`circuits/pultec/schematic/section-board.ts:162`),
  and its `Value` field holds the symbol name rather than the model's
  `6-way selector`
- no part on the sheet carries a `Footprint` field at all
