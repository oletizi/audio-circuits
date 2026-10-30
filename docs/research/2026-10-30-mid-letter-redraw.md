pultec-mid re-drawn to fit US Letter: iterating on an approved page
===================================================================

**What this is.** The owner has a US Letter printer and no A3. The approved
`pultec-mid` page is A3 and its content measures 377.19 x 137.16 mm, which does
not fit Letter. This run re-arranges it onto Letter at full size. **Nothing was
scaled**; the owner rejected ~72% scaling and it was not tried.

**This is the first time the loop has had to re-arrange a page the reviewer has
already approved**, rather than repair a fresh draft, and how that went is as
much the deliverable as the page. §11 is that part.

**The page is UNREVIEWED.** `EVALUATING-DRAWINGS.md` §1: a drawing has no quality
until a qualified reviewer says so, and the agent that produced one is never a
qualified reviewer of it. Nothing below assesses the drawing; everything below is
an observation or a measurement another reader can check.

- **Sheet** `docs/research/2026-10-30-mid-letter-redraw/pultec-mid-letter.kicad_sch`
- **sha256** `d4b0b8cc6e3be35298cf1a240dcf8705bce655822224493670089df272138e2b`
- **PDF / PNG / SVG** `pultec-mid-letter.pdf`, `.png`, `.svg` beside it
- **Input** the committed approved page,
  `drafted/pultec/pultec-mid/pultec-mid.generated-do-not-edit.kicad_sch`,
  sha256 `1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8`,
  **verified before the run reads it and again after it finishes**. Nothing under
  `drafted/`, `circuits/` or `lib/` was written.
- **Reproduce** `SCRATCHPAD=<dir> sh docs/research/2026-10-30-mid-letter-redraw/run.sh`

**`run.sh` is idempotent and that was checked rather than asserted:** run a second
time from the committed approved page it re-derives the sheet **byte-identically**
(`cmp` reports no difference), the PNG **pixel-identically** (`magick compare -metric AE` = 0,
against a control of 3.74e6 differing pixels for the same image against its own
inverse) and the SVG with **no differing lines**.

---

## 0. Authority, and the toolchain as it was actually run

The Pultec is an imported design, so **the schematic is authoritative and the
model was derived from a netlist export** (`CLAUDE.md`). Nothing under
`circuits/` or `lib/` was edited; the only thing read out of the model is
`circuits/pultec/electrical/mid.ts`, for the contact-to-capacitor-to-tap table,
and nothing was written back.

**Versions re-recorded from the installed artifacts**, because `TOOLING.md` names
versions it does not enforce:

| tool | version, as the binary reports it |
| --- | --- |
| akcli-kicad | `akcli 0.22.0 (protocol 2)` |
| kicad-cli | `10.0.5` |
| ImageMagick | `7.1.1-47 Q16-HDRI aarch64` |
| Python | `3.14.6`, with `numpy 2.5.4` and `pillow 13.0.0` in the akcli venv |
| git | system |
| **copperhead** | **NOT INVOKED - see §1** |

The akcli venv was already in this session's scratchpad, which is luck rather
than pinning; the standing risk `TOOLING.md` records is unchanged. The venv path
was a **fourth** value again - the two committed `run.sh` scripts disagree and
the mid run found a third; this one takes `$SCRATCHPAD/venv-akcli` and creates
it when the binary is absent.

---

## 1. RE-ARRANGED, NOT RE-DRAFTED - and why that is the whole shape of the task

`TOOLING.md` step 1 says the draft step is skipped when the starting point is an
existing page. It is skipped here, and the reasons are worth stating because
"fit this on a smaller sheet" is the first task where the choice was not obvious:

1. **copperhead cannot be asked for this.** It has **no coordinate and no
   orientation control** and it **picks its own paper**. The thing this task
   needs is a specific arrangement inside a specific frame. There is no intent
   file that expresses "fold the bank at contact 6 so it fits 255.4 mm".
2. **Its draft of this board was already discarded.** The approved page's Mid
   group is agent-authored; all 28 of copperhead's placements in it were thrown
   away. Re-drafting would re-derive something nobody keeps.
3. **Five of the six groups are placements the reviewer has already looked at.**
   The Junction group and the four stand-ins were accepted on the A3 page. A
   re-draft discards them for nothing.
4. **A re-draft shares no coordinates with the approved page, so there is
   nothing to compare.** The before/after crops this report is built on would
   each be a picture of a different drawing.

**So the transform is: one rigid translation of the whole page, then the Mid
group alone re-laid.** The five groups move by exactly `(-40.64, -34.29)` mm and
nothing else happens to them - **proved, not asserted**, by
`scripts/bandcheck.py`: 73 objects compared including every visible symbol
field's position and angle, every one matching, with a positive control that
moving `J1` 1.27 mm makes the comparison fail.

---

## 2. THE FRAME, MEASURED - and the figure in the task statement is optimistic

The task gave "roughly 265 x 185 mm" for Letter landscape and said to verify it.
Verified with `scripts/framegeom.py`, which writes a sheet carrying nothing but
a `(paper ...)` line, renders it through this `kicad-cli` and finds the frame as
the rows and columns that are almost entirely dark:

| | US Letter | A3, for comparison |
| --- | --- | --- |
| page | 279.400 x 215.900 mm | 419.989 x 297.011 mm |
| inner frame | x 11.980..267.377, y 11.980..203.877 | x 11.980..407.966, y 11.980..284.988 |
| **inside the frame** | **255.397 x 191.897 mm** | 395.986 x 273.008 mm |
| title block | x 159.300..267.250, y 171.831..203.750 | x 299.889..407.839, y 252.942..284.861 |
| **outside the title block as well** | **255.397 x 159.851 mm** | 395.986 x 240.961 mm |

**The title block is a CORNER, not a band**, 107.950 x 31.919 mm in both paper
sizes. Content that reaches east of 159.300 must stay north of 171.831; content
west of 159.300 may use the full 191.897 mm of height. This page is wider than
159.300 mm everywhere, so the binding rectangle is the **255.397 x 159.851 mm**
one - narrower than the task's 265 and **25 mm shorter than its 185**.

Positive control: the same line detector on an all-white image of the same size
finds 0 rows and 0 columns.

---

## 3. WHY THE SINGLE ROW CANNOT FIT. This is arithmetic, not taste.

The approved page draws seventeen capacitors in one row in contact order at a
15.24 mm pitch. **The row alone is 243.84 mm.** The usable width is 255.397 mm,
and the row is not the only thing on the page.

The pitch is governed by TEXT, and the text was re-measured on the approved page
with `scripts/inkmeasure.py` at 600 dpi rather than taken as given
(`EVALUATING-DRAWINGS.md` P3 forbids copying a reference's proportions):

| measured | |
| --- | --- |
| the widest value on this board, `3300pF` (and `2200pF`, `4700pF`, `1500pF`, `1000pF`) | **6.816 mm** of ink |
| `.047uF`, the same six characters | **6.223 mm** - the leading `.` is a narrow glyph |
| `.33uF`, `.15uF`, the narrowest | **4.995 mm** |

With a value centred 6.35 mm east of its symbol and a `Device:C` plate reaching
2.03 mm either side, the two gaps are `o - h - 2.03` to its own plate and
`pitch - o - h - 2.03` to the next capacitor's:

| pitch | to its own plate | to the next plate | row width (16 gaps) |
| --- | --- | --- | --- |
| 15.24 mm (approved) | 0.912 mm | 3.452 mm | 243.84 mm |
| 13.97 mm | 0.912 mm | 2.182 mm | 223.52 mm |
| **12.70 mm - the floor** | **0.912 mm** | **0.912 mm** | **203.20 mm** |

12.70 mm is the floor because below it one of the two gaps goes under the
0.912 mm the approved page already ships on one side. **And 203.20 mm still does
not fit**: the selector symbol alone is 30.48 mm wide and its runs start at its
east edge, so even with the rheostat, the input label and the whole return block
moved out of the row's way, 30.48 + 7.62 + 203.20 + 9.76 = 251.06 mm leaves
4.3 mm for everything else and nowhere at all for the 40 mm return block.

**So the bank has to be folded.** The task said so; this is the measurement
behind it.

**NOTE ON THE VALUE STRINGS, because the task's list is not the sheet's.** The
task gives mid's values as `330nF, 150nF, 47nF, 22nF, 12nF, 3.3nF, 2.2nF,
1.5nF, 4.7nF, 1nF`. Those are the **model's** strings
(`circuits/pultec/electrical/mid.ts`); the approved **sheet** carries `.33uF`,
`.15uF`, `.047uF`, `.022uF`, `3300pF`, `.012uF`, `2200pF`, `4700pF`, `1500pF`,
`1000pF`. This run did not change them - they are what the reviewer approved and
what the measurement above is of. The nF forms are shorter and would admit a
tighter pitch, but swapping them is a change to the drawing's CONTENT and is not
what "fit it on Letter" asks for.

---

## 4. The arrangement: the row folded at the tap boundary

`scripts/arrangement.py` holds every coordinate as a literal and carries eight
assertions that refuse rather than warn. The fold is at the boundary between
contact 6 and contact 7, which is also a **tap** boundary, so no tap group is
split:

> **TIER A** - contacts 1..6, caps C1..C8, taps 2H and 1H. Caps hang NORTH of
> their runs, seventeen risers north to two buses at one y, two windings above
> those, `coil_return` rail A along the top. **x ASCENDS with contact number.**
> This is the approved page's structure, unchanged.
>
> **TIER B** - contacts 7..11, caps C9..C17, taps 0R45H, 0R22H and 0R1H. The
> MIRROR: caps hang SOUTH of their runs, risers south to three buses at one y,
> three windings below those, rail B along the bottom. **x DESCENDS with contact
> number.**
>
> `coil_return` is one net drawn once: rail A (99.06 mm) east to a **86.36 mm
> vertical join** down the east side, then rail B (129.54 mm) back west. The
> mode switch's pole sits on the join at the selector's own height, with the
> return block east of it.

**THE DESCENT IN TIER B IS FORCED, and it is the one thing about this page a
reader has to learn.** `assert_no_crossing()` is a pairwise check over 11 runs
and 17 columns, and the reason is short: a run that ends east of a column which
hangs INTO its row crosses that column. Tier A hangs north of its runs and the
runs go east, so x must ascend. Tier B hangs south and the runs **still** go east
- `SW_Rotary_1x12`'s eleven throws all point one way - so x must descend.
Reversing either puts capacitors across selector runs. Four other arrangements
were worked through and are recorded in §11.4.

So the capacitor order snakes: **contacts 1-6 left to right along the top,
contacts 11-7 left to right along the bottom**, which is contacts 7-11 read right
to left. Stated plainly because it is the page's one unfamiliar property.

**`SW_Rotary_1x12` forces the rest**, read off the installed library: throws 1-12
at symbol x = +15.24 stepping 2.54 mm from y = +15.24 down to y = -15.24 **with
no pin at y = 0**, pole at (-15.24, 0). So the run spacing is 2.54 mm and not
negotiable, the gap between contact 6 and contact 7 is 5.08 mm, and pin 12 - the
unused twelfth detent - is 2.54 mm below contact 11.

**The pitch stays 15.24 mm**, re-derived from the 6.816 mm measurement above
rather than copied. **That it lands on the approved page's number is because it
is the same text.** The fold is what bought the width; P3 asked for the
proportion to be re-derived, not for it to come out different.

### What the fold costs and buys, in numbers

| | approved A3 | this Letter page |
| --- | --- | --- |
| bank width (first cap to last) | 243.84 mm | **121.92 mm** |
| Mid group rectangle | 377.19 x 80.01 mm | **248.92 x 96.52 mm** |
| eleven selector runs | 20.32 … 264.16 mm, **1488.44 mm total** | 7.62 … 129.54 mm, **708.66 mm total** |
| seventeen risers | 5.08 … 33.02 mm | 5.08 … 17.78 mm |
| `coil_return` | one 200.66 mm rail | 99.06 + 86.36 + 129.54 mm, **three segments** |
| total wire length | 2505.71 mm | **1678.94 mm** |
| longest wire | 264.16 mm | **129.54 mm** |
| wires | 82 | 84 |

---

## 5. The repair, in three passes

**Pass 1, the rigid translation** (`scripts/translate.py`). 483 coordinate nodes
in the sheet body rewritten by `(-40.64, -34.29)`, 208 inside `lib_symbols` left
alone, and `(paper "A3")` changed to `(paper "USLetter")`. It rewrites by **byte
offset through the parse**, never by pattern, and **refuses** when the number of
nodes found for a head does not equal the `(<head> ` token count, when a node
carries child lists where numbers are expected, or when a node has fewer than two
numbers. akcli has no translate operation and `move_component` moves one part at
a time carrying its field offsets with it, so this had to be a literal transform;
it is written to be checkable instead of trusted.

**Pass 2, 261 akcli ops** (`repairs.json`, reasons by op index in
`repairs.notes.txt`), dry-run with `akcli plan --ops` first. Its net diff, in
full:

```
# connectivity (0)
  (clean)
Net changes:
  (none)
```

**`--apply` was proved by sha, not by exit code** (`TOOLING.md` trap 1):

```
sha before apply: f9cf501927c7442b89661a37308f6d86aa08b29e9fe88544aa4e032d2b6a63f9
sha after apply:  847b79a32e3ae08512ff6054990430a7cf2851760fc7ca87c7a94eab1ea2b9b3
```

The op list deletes the Mid group's 54 wires, 24 junctions, 22 labels and 1
no-connect, re-places 28 parts with their rotations, moves 1 power symbol, and
adds 56 wires, 24 junctions, 22 labels and 1 no-connect. **The selection is
asserted** - `make_repairs.py` refuses if the delete box picks a different count
than the 54 / 24 / 22 / 1 measured on the translated approved page, because a
selection that changes silently is how a repair reaches into a group nobody asked
about.

**It reads the sheet through `docs/research/lib/kicad_sheet.py`**, the shared
reader, where the mid run's version of this script hand-rolled a regex per object
kind and guarded only the wires with a token count. Three of its four unguarded
patterns were the shape that has silently dropped objects on four boards.

**Pass 3, 138 literal text edits** (`scripts/restyle.py`) for the five things
akcli 0.22.0 cannot do: wire strokes and per-net colours, global labels rewritten
whole in copperhead's own form, **local label `justify`** (new - see §11.1), 76
symbol fields restated as literals, and the group rectangle and its heading.

**The field-angle class recurred in both directions again.** Nine capacitors
turned 0 → 180 and three windings 180 → 0; `scripts/symbols.py` reports
`fields that render VERTICAL: 0` after. The rule is
`(symbol rotation + field angle) mod 180 == 0`, nothing simpler.

---

## 6. What each surviving device earns

`EVALUATING-DRAWINGS.md` P1: *a device is noise unless it is earning its place,
and the draughtsman must be able to say what work.*

**Ground symbols - 4, unchanged from the approved page.** `power-after.txt` lists
each with the wire entering its pin. `#PWR06` (J2, one symbol for five pins on a
10.16 mm trunk), `#PWR09` (the only ground in the Lo boost stand-in) and `#PWR01`
(J1.5) are in the translated band and were not touched. `#PWR07` serves the two
Mid return legs from one 15.24 mm link between them, with its pin on the link's
interior and a dot there. **`#PWR01` is still the symbol all five accepted pages
have put up for overruling, and is still unruled.**

**`#FLG01` earns nothing on the drawing.** It is an ERC annotation, on the page
because the owner said to leave low-boost's in place.

**Hairpins: none, checked rather than assumed.** `pwr_survey.py` lists every
power symbol with the wire entering its pin; in every case the triangle continues
away from the part. The one device of that shape is the rheostat's **tie** - the
wiper goes up 2.54 mm, east 6.35 mm and down onto the pole wire. It is a bracket
over the body rather than a fold back along the wire it came from, it is the
conventional way to draw a rheostat, and it is reported here rather than defended.
It is unchanged from the approved page.

**Labels - 14 global, 23 local, the same counts as the approved page. Duplicates
inside one group: 0.** The four nets carrying more than one label carry them in
different groups, one per group, exactly as before.

**The 22 labels inside the Mid group** - eleven contacts, five winding taps, the
pole node, the coil return, the two mode-switch legs, the input and the return -
each name a node a reader of an eleven-position selector has to find. Each
appears once. That is naming rather than duplication, and it is stated so it can
be disputed.

**Long runs.** Three wires are over 90 mm and each is stated rather than buried:
the `sel7` run at 129.54 mm (contact 7 to C10, the far end of tier B), rail B at
129.54 mm, rail A at 99.06 mm, the `sel5` and `sel8` runs at 99.06 mm each, and
**the 86.36 mm vertical join**. The join exists because `coil_return` is a
six-pin net whose windings are now split across two tiers; drawn as a wire it is
one net drawn once, and the alternative is a pair of on-page labels, which the
owner has ruled on: *"the long rail is the right choice. It's much more clear
than a pair of labels would have been."* **It is 103 mm shorter than the longest
wire on the approved page.**

---

## 7. The per-group signal-flow observation

**Reported as an observation, not as a check.** `S1` is a style preference:
followed where it fits, never enforced, never a reason to withhold or delay a
page. No threshold is invented here and no group is scored.

| group | where the input enters | where the output leaves | which way each points |
| --- | --- | --- | --- |
| **Mid** (own) | `hi_boost_out` at `(30.48, 121.92)`, far west, tag pointing right into RV1's ccw pin | `in` at `(257.81, 119.38)`, at the 4K7's east pin, tag pointing right | left to right across 227 mm; the return leaves 2.54 mm **above** the input |
| **Junction** | four labels on the west, on J1 pins 1-4 | the connector body is east of them | a connector has no through-path; the labels read left-to-right into the pins |
| **Hi boost** stand-in | `in` at SI1's top `(58.42, 25.40)` | `hi_boost_out` at SI2's east pin `(76.20, 35.56)`, pointing right | top to bottom, then left to right; the output points right |
| **Hi cut** stand-in | `hi_boost_out` at SI5's west pin `(118.11, 27.94)` | `lo_boost_in` at `(160.02, 36.83)`, pointing right | left to right on both rows; the output leaves 8.89 mm below the input |
| **Lo cut** stand-in | `hi_boost_out` at SI7's top `(195.58, 25.40)` | `out` at SI7's bottom `(195.58, 38.10)`, pointing right | top to bottom; the output points right but sits below the input |
| **Lo boost** stand-in | `out` at SI8's top `(237.49, 25.40)` | `lo_boost_in` at SI8's bottom `(237.49, 43.18)`; SI9 shunts down to ground | top to bottom and left to right |

**The own section is a SHUNT and so are three of the five stand-ins**, so "where
the output leaves" has no answer in the sense `S1` means it: the mid network
hangs off `hi_boost_out` and returns to `in` or to ground rather than passing a
signal through. What the row above reports for `Mid` is the flow of the **chain**
inside the group, which is the working answer `TOOLING.md` records and still the
only one written down.

**Inside the Mid group the chain now reads: west to east through the selector
and tier A, east down the join, and west again along tier B's windings.** Tier
B's own contacts read east to west. Both halves of that are stated as
observations. Neither is offered as a judgement; this writer is not a
qualified reviewer of either.

The five stand-in groups' flow rows are **unchanged** from the approved page,
which the rigid-translation check proves rather than claims.

---

## 8. Verification - before and after, every number re-measured

Before is the committed approved A3 page; after is this one. **Both were rendered
from the SAME FILE NAME in two sibling directories with identical project files,
by the same KiCad**, with `intersheets_ref_show` forced off on both.

| measure | approved A3 | this Letter page |
| --- | --- | --- |
| paper | A3 | **USLetter** |
| **content extent, sheet body (the headline)** | 377.190 x 137.160 mm | **248.920 x 153.670 mm** |
| … excluding the group rectangles, which is the figure the task quotes | 367.570 x 133.890 mm | 241.840 x 146.590 mm |
| … including every placed symbol's library graphics and pin stubs | 377.190 x 137.160 mm | 248.920 x 153.670 mm |
| … placed graphics, excluding the group rectangles | 368.586 x 133.890 mm | 241.840 x 146.590 mm |
| **fits inside the Letter frame and outside the title block** | **NO** (−92.0 mm east) | **YES** - slack W +3.260, E +3.217, N +3.260, S +2.921 mm |
| netlist nets / components | 29 / 39 | 29 / 39 |
| netlist net **pin sets** | — | **IDENTICAL**, with a positive control that the comparator fails when one pin is moved |
| netlist **net names** | — | **IDENTICAL** - all 29, including the seven with a leading `/` |
| netlist **name → pin set** mapping | — | **IDENTICAL** |
| ERC **errors** | **0** | **0** |
| ERC warnings | 5 | **5** - all `lib_symbol_issues` on `copperhead_power` |
| ERC control, the ACCEPTED low-cut page, same recipe | — | **0 errors, the same 5 warnings** |
| parenthesis depth, final / lowest | 0 / 0 | **0 / 0** |
| NUL bytes / CR bytes | 0 / 0 (control: 3496 LF) | **0 / 0** (control: 3498 LF) |
| **true wire crossings** | 0 | **0** |
| wire-to-wire tees | 21 — all carry a dot | 20 — **all 20 carry a dot** |
| pins on a wire interior | 7 — all carry a dot | 8 — **all 8 carry a dot** |
| junction dots | 29 | **29** |
| **orphan junction dots** | 0 of 29 | **0 of 29** |
| **duplicate on-page labels in one group** | 0 | **0** |
| global labels / local labels | 14 / 23 | **14 / 23** |
| wires | 82 | 84 |
| total wire length | 2505.71 mm | **1678.94 mm** |
| longest wire | 264.16 mm | **129.54 mm** |
| symbols placed | 44 | **44** |
| symbol pin instances / lib-resolved | 102 / 102 | **102 / 102** |
| group rectangles | 6 | 6 |
| ground symbols | 4 | 4 |
| per-net wire-stroke clusters with mixed stroke | — | **0** (84 of 84 wires parsed) |
| **the five untouched groups** | — | **RIGID TRANSLATION, 73 objects, every one matching including fields; control fires** |
| `akcli check --layout` findings | 3 | **4** (§11.3) |
| **sha256** | `1f8de321…344ff8` | `d4b0b8cc…138e2b` |

**The exact ERC invocation**, because an unreproducible zero is indistinguishable
from a check that was never run:

```
kicad-cli sch erc --exit-code-violations -o <out.rpt> <sheet.kicad_sch>
```

run with the sheet named `pultec-mid.kicad_sch` in a directory holding its own
`pultec-mid.kicad_pro` and `sym-lib-table`, and **counted off the report's own
`; error` and `; warning` markers**. `grep -c Violation`, which is what this
writer reached for first, reads **0 on both sides of this report** and would have
been a check that could not fail.

**NO PIXEL DIFF AND NO DIFFERENCE BANDS ARE REPORTED, deliberately.** The
procedure's remedy for a before/after render is the same file name in sibling
directories with identical project files, and this run does that - but the two
sheets are **different paper sizes**, so the renders are 420 x 297 mm and
279.4 x 215.9 mm and no pixel comparison between them means anything. A number
is not produced rather than produced and caveated. The pixel comparison that IS
meaningful is the idempotence one at the top of this document.

### Measurements taken from the rendered page rather than from the sheet

Every figure is ink measured at 600 dpi (`scripts/inkmeasure.py`), each with a
positive control that the box asserted empty is empty and a box asserted to hold
ink does.

| what | measured |
| --- | --- |
| the widest value on the board, `3300pF` | **6.816 mm** of ink |
| `.047uF`, the same six characters | **6.223 mm** |
| `.33uF` / `.15uF`, the narrowest | **4.995 mm** |
| a value to its OWN plate / to the NEXT capacitor's | **0.912 / 3.452 mm**, both tiers |
| the `hi_boost_out` tag to the Mid rectangle's west edge | **1.628 mm** |
| the `in` tag to the Mid rectangle's east edge | **2.876 mm** |
| `sel_common`'s text to SW1's body | **2.355 mm** |
| `sel1`'s text to C1's pin line | **0.991 mm** |
| every `selN` label's text to its own wire | **0.333 mm**, all eleven |
| `sel8`…`sel11`'s text to the run 2.54 mm above | **0.514 mm** |
| the three unoccupied regions inside the Mid rectangle | **71.43 x 19.48**, **69.01 x 19.91**, **36.37 x 21.91 mm**, zero ink in each |
| Mid rectangle content margins, graphics | left 15.24, right 5.33, top 5.08, bottom 5.08 mm |

---

## 9. Regions changed - the back-check

Per `EVALUATING-DRAWINGS.md` §8 these are the parts only one party has
considered. Crops of each are committed, **one box per side**, because the two
sheets are different sizes and no single box contains the same thing on both -
each box is sized to hold its own side's whole state of the region, which is the
hi-cut run's "a crop sized to the after state is not a comparison" lesson applied
where the boxes cannot be identical.

1. **The whole page** - `crops/{before,after}-page.png`.
2. **Mid, the whole group** - `crops/{before,after}-mid-whole.png`. Twenty-eight
   parts re-placed, nine re-rotated, 54 wires deleted and 56 added, 22 labels
   deleted and 22 added, 76 fields rewritten, the rectangle from 377.19 x 80.01
   to 248.92 x 96.52 mm. **This is the largest changed region and the
   least-examined part of the page.**
3. **Tier A, close in** - `crops/{before,after}-bank-tier-a.png`. Contacts 1-6,
   caps C1-C8, hanging north. **Look at:** whether each value reads as belonging
   to the capacitor on its left, and whether six contacts read as six.
4. **Tier B, close in** - `crops/{before,after}-bank-tier-b.png`. Contacts 11-7,
   caps C16, C17, C15, C13, C14, C11, C12, C9, C10 west to east, hanging south.
   **Look at:** whether a tier whose contact numbers DESCEND eastward reads.
5. **The tier-A coil row** - `crops/{before,after}-coil-row-a.png`. Rail A, L1,
   L2 and two buses.
6. **The tier-B coil row** - `crops/{before,after}-coil-row-b.png`. Three buses,
   L5, L4, L3 and rail B, mirrored below.
7. **The rail join** - `crops/{before,after}-rail-join.png`. The 86.36 mm
   vertical that makes two rails one net, with the mode switch's pole on it.
8. **The return block** - `crops/{before,after}-return-block.png`. **Look at:**
   whether the centre `off` position reads as taking the section out of circuit,
   and whether one ground for two legs reads.
9. **The west chain** - `crops/{before,after}-west-chain.png`. The rheostat, its
   tie, the pole wire and the selector.
10. **The selector** - `crops/{before,after}-selector.png`. Eleven throws, eleven
    runs leaving at 2.54 mm and the 5.08 mm gap where pin 12's neighbour is not.
11. **The no-connect marker** - `crops/{before,after}-nc-marker.png`, at 4x the
    other crops' zoom. **Look at:** whether an X beside the `12` reads as "this
    detent is deliberately unused" rather than as a mistake.
12. **The stand-in band** - `crops/{before,after}-stand-in-band.png`. **Nothing
    in it changed except where it is**, which §1 proves.

---

## 10. What was NOT done, stated plainly

- **The whole fold is agent-authored and nobody has reviewed it.** The
  no-crossing property is proved; the *reading* of a tier whose contact numbers
  descend eastward is established by nothing.
- **Three unoccupied regions inside the Mid rectangle are not closed** -
  71.4 x 19.5 mm upper-left, 69.0 x 19.9 mm lower-left, 36.4 x 21.9 mm
  lower-right, measured at zero ink. The upper-left and lower-left are empty
  because the selector occupies only the middle 33 mm of a 96 mm-tall group and
  its throw ys are tied to the eleven runs. Closing any of them is a further
  arrangement change nobody has reviewed.
- **The capacitor VALUES are the sheet's strings, not the model's.** `.33uF` not
  `330nF`. Changing them is a content change and was not made (§3).
- **`#PWR01`, J1's ground, is unchanged** - the symbol all five accepted pages
  put up for overruling, still unruled.
- **`#FLG01` is still on the page**, moved on the approved page and translated
  here, and earns nothing.
- **The `out` global label in the Junction group still sits against J1's pin-4
  number**, as on all five accepted pages. Not touched.
- **The Lo cut stand-in's output still sits below its input.** `S1` is followed,
  never enforced, and the band was not re-laid.
- **`cut_return`'s text still crosses the cut leg's own corner**, as it does on
  the approved page. Measured: the text runs 235.0..244.5 mm and the vertical is
  at 242.57. It is a wire on the label's OWN net.
- **`SW1`'s eleven contacts are still named `sel1`…`sel11`, not by frequency.**
  The frequency is on the switch's pin numbers and in the table in
  `circuits/pultec/electrical/mid.ts`.
- **The capacitor values are centred on their anchors, not left-justified.** A
  left-justified field would give every value the same gap to its own plate
  regardless of width; that is a 34-field change and was not made.
- **The five ERC `lib_symbol_issues` warnings are not suppressed.** Errors are 0.
- **No pixel diff between the two pages** (§8), deliberately.
- **`hi_tap`'s clearance to SI2 was not independently re-measured.** The mid run
  measured 1.896 mm there; that geometry is in the band and the rigid-translation
  check proves it is unchanged, but this run's own box could not isolate purple
  label text from teal value text and a dark-red body, so the 1.896 mm figure is
  relayed rather than confirmed.
- **No SPICE run, no board layout, no BOM.** Out of scope, and a fully specified
  BOM does not bind a schematic (`CLAUDE.md`).
- **No verdict entry was added to `docs/schematic/verdicts.md`.** There is none
  to record: the page is unreviewed.

---

## 11. WHAT ITERATING ON AN APPROVED PAGE NEEDED THAT THE PROCEDURE DOES NOT COVER

This is the point of the exercise. Each item is a place this run had to decide
something `TOOLING.md` does not answer, or a place a check was wrong.

**11.1 - A LOCAL LABEL'S `justify` IS A DRAWN PROPERTY, akcli HAS NO OPERATION
FOR IT, AND `top` DRAWS THE WIRE THROUGH THE TEXT.** The approved page anchors
each `selN` label east of where the run above it ends, so no label's text shares
rows with another run. **In a descending tier that rule has no solution**: the
run above extends further east than the run the label is on. `justify left top`
was tried as the mirror and the render refuted it - it does not put the text
below the wire, it puts the text's top 0.46 mm **above** the anchor, so the wire
is drawn through the glyphs: **six rows of wire ink inside the text's own rows
for `sel7`…`sel10` and twenty-two for `sel11`**, measured by
`scripts/labelclear.py`. Nothing on the sheet sees it and `akcli check --layout`
does not report it. All eleven are `bottom`, and the four in tier B that cannot
escape the run above are left **0.514 mm** from it. `TOOLING.md` records
label SCOPE as a drawn shape (the mid run's §9.7); **`justify` is a second one
and nothing had recorded it.**

**11.2 - A BEFORE/AFTER COMPARISON ACROSS PAPER SIZES HAS NO PIXEL DIFF, AND THE
PROCEDURE'S WHOLE RENDER-COMPARISON APPARATUS ASSUMES ONE.** `TOOLING.md` is
detailed about rendering both sides from the same file name in sibling
directories with identical project files, about reporting difference bands rather
than a bounding box, and about `pixelbands.py` localising columns within row
bands. **None of it applies when the two sheets are different sizes.** The
honest output is no number at all, which the written process has no slot for. The
substitutes this run used are: an **extent** measurement against a **measured**
frame (§2, §8), a **rigid-translation fingerprint** for the part that did not
change (§1), and **idempotence** as the pixel comparison that is meaningful.

**11.3 - `akcli check --layout` IS WRONG IN THE POSITIVE DIRECTION ON THIS PAGE
TOO, AND IT GAINED A FINDING THE PAGE DOES NOT HAVE.** 3 findings before, 4
after, 0 errors throughout. Of the four:

- `LAYOUT_LABEL_OVER_SYMBOL label 'sel1' … runs over C1` - **measured on the
  render at 600 dpi there is 0.991 mm of space** between the label's east
  ink and C1's pin line. A false positive, and the only NEW finding.
- `LAYOUT_LABEL_OVER_SYMBOL label 'hi_tap' … runs over SI2` - in the band, on
  both sides, the finding the mid run measured as 1.896 mm of space.
- two `LAYOUT_LABEL_OVER_WIRE … it is not attached to` notes, for `sel_common`
  and `cut_return`. **Both wires are on the label's OWN net.** The lint's net
  attribution is wrong, not its geometry - on both sides.

**AND IT EARNED ITS KEEP ONCE, WHICH IS THE HARDER THING TO REMEMBER.** Its
first run on this page reported a fifth finding, `label 'sel_common' … runs over
SW1`. Measured, the gap was **0.323 mm** - not an overlap, so the lint was wrong
again, but 0.323 mm is tight enough that being technically right is no comfort.
The selector, the bank and the return block moved one grid step east and the gap
is now 2.355 mm. **A lint that is wrong about whether something touches can still
be right about where to look.**

**11.4 - THE DRAFT-CHOICE TRADE IS REPLACED BY AN ARRANGEMENT-CHOICE TRADE, AND
NOTHING WRITES DOWN HOW TO MAKE ONE.** `TOOLING.md` calls the choice among
copperhead's drafts "the largest undocumented decision in the loop". With no
drafting step there is no such choice - and a larger one takes its place. Four
arrangements were worked through before the fold, and they are recorded so the
choice can be disputed:

| arrangement | why it was not taken |
| --- | --- |
| **one row at a 12.70 mm pitch** (the floor) | 203.20 mm of bank; the page still does not close (§3) |
| **eleven columns, a parallel pair drawn as two VERTICAL caps at 7.62 mm with the two values on the pair's outer sides** | measured footprint **27.18 mm per pair** against 27.05 mm for two singles at 15.24. **No gain at all**: the text is the whole cost, and moving it outward buys nothing |
| **eleven columns of HORIZONTAL caps, pairs stacked, Ref and Value above each** | gets the bank to ~135 mm, the most compact of the four. Rejected because a stacked pair needs **four text lines in a 7.62 mm channel between its own two vertical wires**, which is a text scheme no page here has used and whose reading this writer cannot judge |
| **two tiers both ascending** | puts capacitors across selector runs; `assert_no_crossing()` is the proof |

**The one taken changes the per-contact drawing not at all** - same pitch, same
field offsets, same riser-to-bus-to-winding relationship, same 0.912/3.452 mm
gaps - and changes only how the row is folded. **That was the deciding criterion,
and it is a criterion about how much of an approved page survives rather than
about a number from a tool.** Nothing in the written process suggests it; it is
offered as a candidate rather than asserted as a rule.

**11.5 - "DO NOT MODIFY THE APPROVED PAGE" NEEDS A CHECK, NOT AN INTENTION.**
`run.sh` verifies the input's sha256 **before** anything reads it and **again
after** it finishes. The approved page is the input to this whole transform and
every script takes a path; one mistaken output path would have overwritten it.
The written process says the approved page is the binding and says nothing about
guarding it during a run that reads it.

**11.6 - A REGION A RUN SAYS IT DID NOT CHANGE NEEDS PROVING TOO.**
`EVALUATING-DRAWINGS.md` §8 flags the CORRECTED region as least-examined. The
inverse matters as much when a whole page moves: `scripts/bandcheck.py` compares
73 objects including **every visible symbol field's position and angle**, because
`move_component` carrying a field is repair class 5 and is invisible to every
netlist check. Nothing in the procedure asks for this.

**11.7 - `magick -colorspace Gray` WRITES A 16-BIT PNG THAT PILLOW READS AS A
BLANK PAGE.** `Image.open(p).convert("L")` on a mode-`I;16` PNG returns **every
pixel 255** - no exception, no warning. A page with 233,374 dark pixels read as
empty, and the first run of `framegeom.py` reported "0 horizontal and 0 vertical
frame lines" from a render that was fine, with a refusal message blaming the
threshold. The committed measuring scripts in
`docs/research/2026-10-29-*/scripts/` happen to be safe because none of them
passes `-colorspace Gray`; adding it is the natural thing to reach for. **Every
image-reading script in this run refuses when its render holds no ink at all**,
because an empty page is a real possible answer and must never be reachable by
accident. This belongs in `docs/schematic/false-greens.md`.

**11.8 - A COLOUR CLASSIFIER CANNOT SEPARATE A TEAL WIRE FROM TEAL TEXT, AND THE
FIX IS TO STOP ASKING IT TO.** `labelclear.py` first classified both label text
and wires by colour and could not be made to work: KiCad draws a capacitor's
Reference and Value in teal `(0,100,100)` and this page draws its tap buses in
teal `(0,130,120)`. It reported **35 rows of wire ink through `sel11`** where the
thing in the box was C16's Reference, 2.2 mm away. It now takes the **wires from
the sheet** - which knows where they are to the micron - and only the **text
extent from the render**. Generally: use the render for what the sheet cannot
say, and nothing more.

**11.9 - A POSITIVE CONTROL FOR "NOTHING OVERLAPS" CANNOT BE A BOX.** The first
overlap control was a box over the rail that `coil_return` is anchored to,
expecting text and wire in shared rows. The detector correctly reported them
0.212 mm apart: **a local label's text is never in its own wire's rows**, so a
page with no overlap on it cannot be made to produce one by choosing a box. The control is
now a **perturbation** - it flips one label's justify to `top`, the very defect
§11.1 found, re-renders, and asserts the detector fires. This is the mid run's
§9.5 lesson (*a control has to perturb the same kind of object the check counts*)
one level further in: it has to perturb the same kind of **relationship**.

**11.10 - TWO MEASUREMENT BOXES WERE WRONG IN OPPOSITE DIRECTIONS AND BOTH ARE
KEPT.** A box asserted empty caught the group's own `Mid` heading - first by
7.832 mm, then, moved down, by **one pixel row, 0.085 mm**, because the heading
is drawn larger than body text. And a box asserted empty claimed a void at
y 99..101 under tier A's buses, where **the seventeen risers run**: there is no
void there and the box was describing a region this writer had imagined rather
than looked at. The first is the check working at 600 dpi where a coarser render
would have passed it; the second is the lamp-post problem inside a measurement.

**11.11 - A FIELD COORDINATE IS NOT ON THE GRID AND A GRID GUARD REFUSED THE
CORRECT ARRANGEMENT.** `mil()` refuses anything that is not a whole number of
50-mil steps, which is right for a wire or a pin. Run over the FIELD table it
refused `140.72 mm`, which is copperhead's own 6.10 mm `GND` offset from a
grid-aligned anchor. Separated into `fp()`, with the reason in the code. The
right failure from the wrong guard.

**11.12 - THE LOOP AS WRITTEN HAS ONE REVISE STEP AND THIS RUN NEEDED THREE,
WHICH IS NOW SIX RUNS IN A ROW.** The loop actually run was: measure the frame,
measure the approved page's text, work out that no single row fits, try four
arrangements on paper, build the arrangement with its proofs, translate, repair,
restyle, render, **look** - which found the justify defect - re-justify, render,
**look** - which found the 0.323 mm `sel_common` gap and the 0.318 mm tag-to-
rectangle gap - shift two anchors and the whole east half one grid step, render,
**look** again, measure. `TOOLING.md` already says *"write the loop you actually
ran"*.

**11.13 - THE RUN SCRIPTS WERE NOT COPIED FORWARD, DELIBERATELY.** `run.sh` calls
the mid run's `verify.py`, `symbols.py`, `boxgeom.py`, `netcmp.py`,
`junction_audit.py`, `label_survey.py`, `colour_check.py`, `pwr_survey.py` and
`project_flags.py` **by path**. The convergence of 2026-10-30 moved the PARSER
into `docs/research/lib/kicad_sheet.py` so scripts would stop disagreeing; the
scripts themselves are still per-run copies, and copying nine of them forward
would reintroduce exactly the drift that convergence was for. The cost is that
this run depends on another run's directory, which is a coupling nothing in the
process sanctions either way. **Recorded as a deviation, not as a precedent.**

---

## 12. AND THE SAME INSTRUMENT REFUTES A CONCLUSION RECORDED ABOUT `pultec-hi-cut`

**Found while cross-checking this run's own instrument, and reported because it
changes somebody else's answer rather than this one's.** A concurrent change on
this branch re-papered three of the other Pultec boards to US Letter and left
`pultec-hi-cut` on A4, recording that *"making it fit means narrowing or
re-arranging a group on a drawing he has already approved"*.

**It does not.** `scripts/extent.py` measures `pultec-hi-cut`'s content at
**220.980 x 100.330 mm** against the **255.397 x 159.851 mm** usable rectangle -
**34.4 mm of spare width and 59.5 mm of spare height.** The page does not fit
because it is sitting **too far EAST**, at x 50.800..271.780, so its east edge
lands 4.403 mm past the frame line. The whole drawing fits; it is in the wrong
place on the paper.

**Checked, not argued.** `scripts/translate.py` moved it 20.32 mm west, with no
other change, and the result:

| | A4, as committed | after a 20.32 mm westward translation |
| --- | --- | --- |
| content extent | x 50.800..271.780, y 31.750..132.080 | x 30.480..251.460, y 31.750..132.080 |
| fits the Letter frame and stays outside the title block | **NO**, −4.403 mm east | **YES** - slack W +18.500, E +15.917, N +19.770, S +39.751 mm |
| netlist pin sets / names / mapping | — | **IDENTICAL** all three |
| ERC errors / warnings | — | **0 / 5**, the same five `lib_symbol_issues` |

**A translation is the cheapest thing this whole procedure can do to a page**: no
part moves relative to any other, so the arrangement the reviewer approved is
preserved exactly, which `scripts/bandcheck.py` is built to prove. It needs his
approval because the bytes change and a verdict is bound to a sha256 - but it is
not the arrangement change the record says it is, and nobody has to narrow
anything.

`sh docs/research/2026-10-30-mid-letter-redraw/survey.sh` re-runs the whole
question over every committed drafted page, so this is a tool rather than a
figure:

```
board              paper          width     height east slack south slack  fits
pultec-hi-boost    USLetter     227.330    121.920    +23.537    +18.161  YES
pultec-hi-cut      A4           220.980    100.330     -4.403    +39.751  NO
pultec-low-boost   USLetter     195.580    118.110    +20.997    +19.431  YES
pultec-low-cut     USLetter     234.950     97.790     +1.947    +29.591  YES
pultec-mid         A3           377.190    137.160   -132.673    -14.859  NO
```

**AND IT TURNS UP A SECOND THING NOBODY HAS SAID: `pultec-low-cut` CLEARS THE
FRAME BY 1.947 mm.** It fits, and it is the tightest of the four re-papered
pages by a factor of ten. Nothing is wrong with it; it is recorded because a
page with 1.9 mm of margin is one edit away from not fitting, and the next
person to touch it should know that before they move anything east.

**This run did not act on either.** `pultec-hi-cut` and `pultec-low-cut` are
other people's drawings in `drafted/`, which this run is forbidden to modify and
did not. The measurement is the deliverable here, and the decision is his.

---

## 13. What this run does NOT establish

It does not establish how the page reads, or whether a folded bank reads, or
that a tier whose contact numbers descend eastward reads. **The page is
unreviewed**, and `EVALUATING-DRAWINGS.md` §5 is explicit that no check passing
and no absence of findings advances its status. It establishes that the content
fits inside the measured Letter frame at full size, that the circuit on the page
is the same circuit to the pin, and that the five groups the reviewer has already
seen are where they were relative to one another.
