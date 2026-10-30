2026-10-30 - re-papering the Pultec section sheets from A4 to US Letter
=======================================================================

**THREE OF THE FOUR WERE RE-PAPERED. `pultec-hi-cut` WAS NOT, BECAUSE IT DOES
NOT FIT, AND THAT IS THE HEADLINE OF THIS RUN.** The owner asked for four:

> *"yes, switch the other four boards to us letter"*

following:

> *"I don't have an A3-capable printer. I live in california and have a printer
> capable of printing US letter 8.5x11"."*

`pultec-hi-boost`, `pultec-low-boost` and `pultec-low-cut` are now `USLetter`
and are **awaiting re-approval**. `pultec-hi-cut`'s Hi cut group box reaches
4.530 mm past US Letter's inner frame line, so re-papering it would put ink
outside the border; it is left on A4 pending the owner's instruction, because
narrowing that box is an arrangement change to a drawing he has already
approved. `pultec-mid` was out of scope for this run.

**NO PAGE HERE MAY BE DESCRIBED AS APPROVED.** `docs/schematic/verdicts.md` was
deliberately not edited: the four verdicts recorded there are bound to the A4
bytes and do not transfer to bytes with a different paper token. Each
re-papered board's `RECORD.md` says so in those words.

1. What changed
---------------

| board | before | after | paper |
| --- | --- | --- | --- |
| `pultec-hi-boost` | `240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a` | `9aa390a420edc4d845b5b0281b00e41efbae5e98dab90cdd847a2f55f38a2278` | A4 to USLetter |
| `pultec-low-boost` | `42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7` | `2849126909cb7bda048f17dbc92acdae7cb7eaf6409c414db6ab05e2ba5ce67a` | A4 to USLetter |
| `pultec-low-cut` | `65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d` | `189c8d3098931e406cc7533bace242e29e27d780966f65f36e3a9c1157e50fee` | A4 to USLetter |
| `pultec-hi-cut` | `7ccf557c5474222f6850b78f8c3c53ac45b89389f782f4b8c317d483900a76f1` | **unchanged** | stays A4 - does not fit |
| `pultec-mid` | `1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8` | **unchanged** | out of scope |

Render digests, with the one volatile `<title>SVG Image created as ... date ...</title>`
line dropped - evidence, not a binding:

| board | before | after |
| --- | --- | --- |
| `pultec-hi-boost` | `23d8dc4843ef4808c85174cd47a94a85b78f8ae0e144a9775cbb6a5492d9a9f7` | `f694f0e43d5edd82a3bbc8422cbf8072b0bdb8eb1265a8c262eb021175f2ee4c` |
| `pultec-low-boost` | `0cf07216db2731a002c40f96346b99c2f06dbab284976f2d6496a271bc43edd5` | `b29fd05cd6cf1b983cebfbd0d550f2e664e385566e9bad1a99a4c608a375a0c7` |
| `pultec-low-cut` | `47835f505e2f2c7cc9b7a667ac132a83050491cca8e652e9ece170fec50a2a70` | `d03aa08d1dc95415f8a82859bade984c358a47fb32782fdd36ce217fb47639a4` |

2. `USLetter` is the token KiCad writes, verified by making KiCad write one
---------------------------------------------------------------------------

Not read from a format document. KiCad 10.0.5:

| probe | result |
| --- | --- |
| `(paper "USLetter")` then `kicad-cli sch upgrade` | exit 0, and KiCad rewrites the file - `(version 20260306)`, `(generator "eeschema")` - keeping `(paper "USLetter")` verbatim |
| `kicad-cli sch export pdf` of it | `/MediaBox` 792.000 x 612.000 pt = 279.4 x 215.9 mm |
| `(paper "A4")`, the control | 841.896 x 595.296 pt = 297.0 x 210.0 mm |
| `(paper "NotAPaperSize")`, the negative control | `upgrade` **exit 3** and `export pdf` **exit 3**; no PDF written |

**The negative control is the part that matters**: an unrecognised token does
not silently fall back to a default size, so the 279.4 x 215.9 mm page above is
KiCad honouring the token and not KiCad ignoring it. The string is also present
in `_eeschema.kiface` alongside `USLegal`.

3. Where this KiCad draws the US Letter frame, measured off a render
-------------------------------------------------------------------

With `docs/research/2026-10-30-mid-letter-redraw/scripts/framegeom.py`, which
renders a sheet carrying nothing but a `(paper ...)` line and finds the frame as
the rows and columns that are almost entirely dark. Its control - the same
detector on an all-white image of the same size - finds nothing.

| | A4 landscape | US Letter landscape |
| --- | --- | --- |
| page | 297.011 x 210.016 mm | 279.400 x 215.900 mm |
| inner frame, x | 11.980 .. 284.988 | 11.980 .. **267.377** |
| inner frame, y | 11.980 .. 197.993 | 11.980 .. 203.877 |
| title block | x 176.911 .. 284.861, y 165.947 .. 197.866 | x 159.300 .. 267.250, y 171.831 .. 203.750 |

**The west and north inner corners are identical at (11.980, 11.980) on both
papers**, which is why re-papering moves nothing in the drawing: the sheet body
places everything in absolute millimetres from the page origin, and only the
east and south edges move - 17.611 mm west and 5.884 mm south. The title block's
corner moves the same way, so the newly-at-risk region is x 159.300 .. 176.911
at y > 171.831. **No sheet has any content south of y 153.8**, so none of them
is near it.

4. The fit, per board
---------------------

Measured off the rendered page, by differencing a render of the sheet against a
render of an empty sheet on the same paper so that the frame, the rulers and the
title block cancel. The title block's own text is excluded by masking its
corner; the mask is asserted to be covering something.

| board | drawing reach (x) | E clearance | drawing px outside the frame | fits |
| --- | --- | --- | --- | --- |
| `pultec-hi-boost` | 16.341 .. 243.967 | **+23.410 mm** | 0 | yes |
| `pultec-low-boost` | 50.631 .. 246.507 | **+20.870 mm** | 0 | yes |
| `pultec-low-cut` | 30.311 .. 265.557 | **+1.820 mm** | 0 | yes |
| `pultec-hi-cut` | 50.631 .. 271.907 | **-4.530 mm** | **15202** | **NO** |

South is not close on any of them: the drawing's maximum y is 153.797,
152.527, 142.367 and 132.207 respectively, against a title block whose top edge
is at 171.831 - so the smallest clearance to the title block is 18.034 mm, on
`pultec-hi-boost`. A separate vector-side check over every point in each sheet
body found **zero** points in the title-block corner on all four.

The vector reader and the render agree to within half a stroke width: the sheet
declares `pultec-low-cut`'s easternmost group box edge at x 265.430 and the
render puts its ink at 265.557, a difference of 0.127 mm against a 0.3 mm
stroke.

### 4.1 `pultec-low-cut` has 1.820 mm and that is the whole margin

The item that sets it is the **Lo boost group box**, east edge x 265.430. On A4
the same box had 19.410 mm of clearance. Anything that widens that box, or
anything placed east of x 250, comes out of 1.820 mm.

### 4.2 `pultec-hi-cut`: the stop

The **Hi cut group box** spans x 50.800 .. 271.780 mm. US Letter's inner frame
line is at 267.377.

| | A4 (as it stands) | US Letter (refused) |
| --- | --- | --- |
| inner frame, east edge | 284.988 mm | 267.377 mm |
| drawing's east reach, from the render | 271.907 mm | 271.907 mm |
| clearance | **+13.060 mm** | **-4.530 mm** |
| drawing px outside the inner frame | 0 | **15202** |

So the page fits the paper it is on and does not fit US Letter, and the paper
change is precisely what pushes it out. **Making it fit means narrowing or
re-arranging an approved group by at least 4.53 mm**, which is an arrangement
change no agent may make on its own initiative. Recorded in
`drafted/pultec/pultec-hi-cut/RECORD.md` beside the drawing, and left for the
owner: re-draw it as `pultec-mid` is being re-drawn, or leave it on A4 and print
that page separately.

5. The drawing is unchanged - four independent checks
-----------------------------------------------------

| check | result | its control |
| --- | --- | --- |
| `git diff` of each sheet | **1 insertion, 1 deletion** - the `(paper ...)` line and nothing else | the diff names the line |
| `kicad-cli sch export svg -e` (no frame, no title block), before vs after | differs on **exactly one line**, the `<svg>` page box; **zero** drawing-path lines; path count identical (5048 / 4121 / 3756) | moving one wire 1 mm makes it report differences |
| netlist exported from each and imported through `lib/kicad/netlist.ts` | components, nets and net membership identical on all three; net-name lists identical | moving one pin between two nets changes the fingerprint |
| sheet-body geometry through `docs/research/lib/kicad_sheet.py` | identical sha on all three | displacing one wire endpoint by 0.01 mm changes the sha |

Per board, from the geometry pass:

| board | wires | total wire length | symbols | pins | labels | junctions | rects | texts | components | nets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pultec-hi-boost` | 72 | 1181.100 mm | 32 | 73 | 28 | 17 | 6 | 6 | 27 | 21 |
| `pultec-low-boost` | 78 | 605.790 mm | 25 | 57 | 20 | 14 | 4 | 4 | 19 | 15 |
| `pultec-low-cut` | 63 | 873.760 mm | 25 | 58 | 22 | 17 | 6 | 6 | 20 | 15 |

Every figure above is before **and** after; they are equal, which is the claim.

The netlist pass also checks what the task named as a trap: `kicad-cli sch
export netlist` exits 0 on a paren-broken sheet, writing an empty
`<components/>` and `<nets/>`. Parenthesis depth was counted string-aware over
each edited sheet (returns to 0, never negative), and an import yielding zero
components or zero nets is refused rather than compared - otherwise two empty
exports would compare equal and the check would pass having looked at nothing.

6. End to end: the paper notice
-------------------------------

`tools/guide/schematic-notice.ts` prints *"Page 2 is not on this document's
paper"* only while the schematic page is on paper other than the packet's US
Letter. After re-papering and `make -C boards/<board> guide`:

| board | schematic page size in `guide.pdf` | notice |
| --- | --- | --- |
| `pultec-hi-boost` | 279.4 x 215.9 mm, US Letter landscape | **gone** |
| `pultec-low-boost` | 279.4 x 215.9 mm, US Letter landscape | **gone** |
| `pultec-low-cut` | 279.4 x 215.9 mm, US Letter landscape | **gone** |
| `pultec-hi-cut` | 297.0 x 210.0 mm, A4 landscape | still printed |
| `pultec-mid` | 420.0 x 297.0 mm, A3 landscape | still printed |

All twelve pages of each of the three rebuilt guides are now US Letter, pages 1
and 3-12 portrait and page 2 landscape, measured off the PDF `/MediaBox`. The
two boards that still print the notice are its own control: the same check over
the same artifact reports present for A4 and A3 and absent for US Letter.

7. Two instrument faults found, both by controls, both worth keeping
--------------------------------------------------------------------

Neither was a fault in a drawing. Both were in measuring scripts written for
this run, and in both cases the wrong answer looked like a clean answer.

### 7.1 A greyscale ink threshold cannot see an orange group box

**A "dark pixel" test at grey < 128 silently drops every orange group box.**
The boxes are drawn in colour - `(stroke (color 220 110 20 1))` and five others
- and orange greyscales to

    0.299*220 + 0.587*110 + 0.114*20 = 132.6

which is **above** the threshold. Teal `(0 120 130)`, green `(20 130 60)`,
purple `(140 50 160)` and blue `(60 60 170)` all fall below it and were seen,
which is exactly why the fault read as a property of one drawing rather than of
the instrument: it reported `pultec-low-cut`'s easternmost ink at 252.772 mm,
**12.7 mm west of where it is**, and read the Lo boost box as absent from a
render it is plainly in.

The fix is to difference in RGB - any pixel differing from the empty-frame
render - so colour and lightness stop mattering. The check now carries a control
that asserts the detector sees orange, pinned so the fault cannot return
quietly.

### 7.2 The task statement's own extent table omitted the group boxes

The figures this run was given as "already measured" were, for three of the four
boards, the extent **excluding the group-box rectangles**:

| board | task statement's max x | excluding rects | **including rects** |
| --- | --- | --- | --- |
| `pultec-hi-boost` | 228.6 | 228.600 | **243.840** |
| `pultec-hi-cut` | 257.8 | 257.810 | **271.780** |
| `pultec-low-boost` | 234.9 | 234.950 | **246.380** |
| `pultec-low-cut` | 265.4 | 251.460 | **265.430** |

The match in the middle column is exact to a tenth of a millimetre on three
boards, which is what identifies the omission rather than guessing at it.
`pultec-low-cut` agreed by coincidence - there the group box happens to be the
easternmost item either way.

**This is the whole of the difference between "all four fit" and "one does
not."** The group boxes are stroked, filled, drawn ink; they have to be inside
the frame. Excluded, `pultec-hi-cut` clears US Letter by 9.567 mm; included, it
misses by 4.530.

### 7.3 Also: the committed renders are exported black-and-white

Found while reproducing a render digest, and recorded because the recipe is not
written down anywhere else. A default `kicad-cli sch export svg` writes KiCad's
theme colours - fifteen distinct ones, `#840000` device outlines and `#DC6E14`
group boxes among them - while every committed render under `drafted/` holds
exactly one colour, `#000000`. Of four flag combinations tried against
`pultec-hi-cut`, whose sheet this run did not touch:

| flags | differing lines vs the committed render, volatile title excluded |
| --- | --- |
| `--black-and-white` | **0** |
| `--black-and-white --no-background-color` | **0** |
| `--no-background-color` | 1083 |
| none | 1089 |

So the recipe is `kicad-cli sch export svg --black-and-white`, and it reproduced
`pultec-hi-cut`'s committed render digest
`5b77acaad5a939c373758f58bbb4b198e33d1a2b25b9af87a0c3a7640b8b1dda` exactly. That
reproduction was run as a precondition **before** any render was overwritten,
and the first attempt - which omitted the flag - refused and wrote nothing.

A consequence worth stating plainly: because the committed SVGs are
black-and-white, the group boxes' colours are not in them. The colour
distinction exists in the sheet and in a PDF export, not in the `.svg` that git
diffs.

8. Checks
---------

| check | result |
| --- | --- |
| `bun run typecheck` | clean |
| `bun test` | 4053 pass, **8 fail** - all `tests/schgen/port-fidelity.test.ts`, every one for an unset `SCHGEN_SOURCE`. The stated baseline; no new failure. |
| `bun test` on the four drafted-page files | 20 pass, 0 fail - including each board's "the committed sheet still hashes to the digest its record binds it to" |
| `make check` | see the run log; compared by failing target name against the stated baseline of `pt2399-core` and three `transistor-preamp` boards |

The per-board digest test needed **no code change**: `recordedSheetDigest` in
`tests/circuits/drafted-sheet.ts` parses the hash out of `RECORD.md` rather than
holding a copy, so updating the record is the whole of the update. That design
is why this run touched no test file.

9. What this run did not do
---------------------------

- **`docs/schematic/verdicts.md` is untouched.** Three verdicts there are now
  bound to superseded bytes. Recording the re-approval is the reviewer's, after
  he has seen the pages.
- **`pultec-hi-cut` is not re-papered** - §4.2. It needs an owner decision.
- **`pultec-mid` is untouched**, out of scope and being re-drawn concurrently.
- **`lib/schgen/ir/types.ts`'s `Paper` type is still `"A4" | "A3" | "A2" | "A1"`
  and cannot express `USLetter`.** It did not bite: these are copperhead-drawn
  sheets, not `schgen` output, and nothing in this run went through that type.
  It will bite the first time `schgen` is asked to draw a US Letter sheet, which
  is now the paper the build packet prints on.
- **No drawing on any page was evaluated.** The figures here are measurements.
  Whether a page is fit to build from is the reviewer's to say.

10. Reproducing it
------------------

The frame geometry and the content extent come from the committed scripts
`docs/research/2026-10-30-mid-letter-redraw/scripts/framegeom.py` and
`extent.py`, and the sheet parse from `docs/research/lib/kicad_sheet.py`, whose
`selftest.py` was run first - 10 controls, every one moved or fired. The
render-differencing, netlist-comparison and geometry-fingerprint passes written
for this run were scratch instruments and are not committed; §5 states what each
compared and what control each carried, and every figure in this document is
re-derivable from the committed scripts above plus `kicad-cli`.

The one number here that nothing re-runs is the per-board clearance in §4. It
belongs to a paper and an arrangement that are both about to be reviewed, so it
is stated with the board's own record beside the drawing rather than only here.
