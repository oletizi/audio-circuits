Hi boost: the Lo boost stand-in group, redrawn
===============================================

**The page is unreviewed in this state.** `EVALUATING-DRAWINGS.md` §1: a drawing
has no quality until a qualified reviewer says so, and the agent that produced
one is never a qualified reviewer of it. Nothing below is a judgement of the
drawing, and no number below approves it. §5: approval is state the reviewer
writes, and the `pultec-hi-boost` entry in `docs/schematic/verdicts.md` is
deliberately **not** amended here, because there is no verdict on this sheet to
record.

**§8 applies to what follows in particular.** The reviewer named the defect; the
correction is derived. *"the corrected region is the least-checked part of the
drawing, because an agent applies a correction perfectly and without resistance
— the compliance is what leaves it unexamined."* The Lo boost group is the
region to look at first.

---

What he said
------------

He accepted the page and named a defect in the same message, with a crop of the
**Lo boost** stand-in group:

> *"The hi boost drawing is pretty good. Certainly usable."*
>
> *"There's a goofy hairpin:"*

Then, on the same group:

> *"Another way to look at why the lo boost stand-in section is goofy is that
> signal usually flows left to right and top to bottom (like english text). This
> had the input below the output, which is goofy. Also, output is usually
> pointing right, horizontally. You have output pointing up which is exactly
> backwards of convention. In this case, it's not a big deal, since it's such a
> small network, but it's still goofy and definitely bad style."*

That second message is why this is a redraw of a group rather than a move of a
ground symbol. **The fold was a consequence.** A repair derived from the first
message alone had already been worked out in full — move `SI7` below the rail,
put its ground underneath — and it would have straightened the ground and left
the group reading the way he had just said was backwards. It was discarded
unapplied.

### What binds here, and what does not

`EVALUATING-DRAWINGS.md` now carries the flow convention as **`S1`** in its
S-series, and the S-series is **followed, never enforced**. His condition for
writing it down at all was that the motivation travel with it:

> *"you can codify this as a **style preference** rather than a rule -
> especially if you include the motivation for applying consistent style"*
>
> *"consistent style and a common style convention accumulate to increase
> readability and comprehension - that's much of what style preferences are
> for."*

**Style preferences have cumulative value when applied consistently**, so much
of what following one buys lands on the next drawing rather than on this one.
And his limit on it, which is part of the preference and not a footnote to it:

> *"let's not obsess about them and turn them into sacred rules; don't make
> perfect the enemy of the good."*

So: **nothing in this directory gates on `S1`.** There is no flow check in the
verification table, no flow score, and no pass/fail. Flow appears below only as
an observation — where the input enters, where the output leaves, which way each
points — and §8's division of labour is why: the reviewer named it, and a
measurement of it authored here would be an acceptance criterion authored by the
producer.

---

The artifacts
-------------

| what | where |
| --- | --- |
| the sheet | `docs/research/2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch` |
| sha256 | `240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a` |
| PDF / PNG / SVG | `hi-boost-hairpin-fixed.{pdf,png,svg}` in the same directory |
| crops, before and after | `crops/before-*.png`, `crops/after-*.png` |
| the op list and its reasons | `repairs.json`, `repairs.notes.txt` |
| the whole run, in one command | `run.sh` |
| the verification tables | `verify-before.txt`, `verify-after.txt`, `netcmp.txt`, `boxes-*.txt`, `pixeldiff.txt` |

**The sheet it starts from** is the accepted page,
`docs/research/2026-10-29-hi-boost-full-run/hi-boost-hybrid.kicad_sch`, sha256
`3c2f302b12a8c4c1eb8d1523bc876740d4b509cc8ee47934208471389d3a682c` — verified by
hashing it, not by reading the hash out of the verdict record. `run.sh` always
starts from that committed file, so re-running it re-derives this sheet rather
than applying the repair twice.

### The toolchain actually used

`TOOLING.md` asks for this to be re-recorded per run, because neither tool is
pinned by any committed file.

| tool | version | how the version was obtained |
| --- | --- | --- |
| akcli-kicad | `0.22.0` (protocol 2) | `akcli --version`, freshly installed from PyPI into a new venv |
| kicad-cli | `10.0.5` | `kicad-cli version` |
| Python | `3.14.6` | `python3 --version` |
| ImageMagick | `7.1.1-47 Q16-HDRI` | `magick --version` |
| numpy / pillow | `2.5.4` / `13.0.0` | `pip list`; used only by `scripts/pixeldiff.py` |

**copperhead was not used and was not needed.** This run starts from a drafted
sheet rather than from an intent, so `run.sh` needs only akcli, kicad-cli and
ImageMagick. That is the first time this loop has been run without the drafter.

**The akcli venv from the run that drew this page was gone** — session rotation,
exactly the standing risk `TOOLING.md` records. Reinstalling `akcli-kicad==0.22.0`
from PyPI reproduced it, so the pin held on this occasion. `run.sh` now creates
the venv itself if it is missing.

---

The defect, verified rather than taken on trust
-----------------------------------------------

Measured on the accepted sheet before anything was touched:

- `SI7` (`Device:R`, `0R`) at (207.01, 53.34) rotation 0; pins at y 49.53 and
  57.15.
- `#PWR07` (`copperhead_power:GND`) at (207.01, 46.99) rotation 0 — **above**
  `SI7`.
- a wire (207.01, 49.53) → (207.01, 46.99), 2.54 mm, joining them.
- the `copperhead_power:GND` body in the sheet's own `lib_symbols`:
  `(polyline (xy 0 0) (xy 0 -1.27))` plus a triangle through `(xy 0 -2.54)`, and
  its pin at `(at 0 0 270)` with `(length 0)`, so the connection point is the
  symbol origin and the graphic occupies symbol-local y 0 to −2.54. Symbol-local
  −y maps to sheet +y, so at rotation 0 it draws from sheet y 46.99 **down** to
  49.53 — **the whole 2.54 mm wire, with the apex on SI7's top pin.**

`crops/before-si7-ground.png` shows the wire is not visible at all: the symbol
covers it.

**The structural cause, which is what was repaired.** `lo_boost_in` — the input
— arrived at the **bottom** of the group on a horizontal rail at y 59.69, and
both parts hung upward off it, so `out` left at the **top** at y 41.91 with its
wire running up into it, and the only place left for a ground was above the part
it grounds.

### The topology, read from the netlist

Not from anyone's description of it. From `kicad-cli sch export netlist
--format kicadxml` on the accepted sheet:

```
GND           (8)  J1.5 J2.1 J2.2 J2.3 J2.4 J2.5 SI7.1 SI8.2
lo_boost_in   (5)  J1.3 SI1.1 SI4.2 SI6.2 SI7.2
out           (3)  J1.4 SI5.2 SI6.1
```

So inside the group: `lo_boost_in` is the common node, `SI6` (56K) is a series
element from it to `out`, and `SI7` (0R) shunts it to ground. An input node with
one series element to the output and one shunt to ground.

---

The arrangement, and every number in it
---------------------------------------

```
    [lo_boost_in>----+----[ SI6 56K ]----<out]
                     |
                   [SI7 0R]
                     |
                    GND
```

| what | before | after |
| --- | --- | --- |
| signal line | none — a rail at y 59.69 along the bottom | y 43.18 |
| `lo_boost_in` anchor | (189.23, 59.69) rot 180, at the **bottom** | (189.23, 43.18) rot 180, at the **left** |
| `out` anchor | (189.23, 41.91) rot 0, at the **top** | (207.01, 43.18) rot 0, at the **right** |
| `SI6` | (189.23, 48.26) rot 0, vertical | (200.66, 43.18) rot **270**, horizontal |
| `SI7` | (207.01, 53.34) rot 0 | (191.77, 49.53) rot **180** |
| `#PWR07` | (207.01, 46.99), **above** SI7 | (191.77, 55.88), **below** SI7 |
| group rectangle | (171.45, 31.75) → (215.9, 63.5) | **unchanged** |
| wires in the group | 6 | 4 |
| junction dots in the group | 0 | 1, at the shunt tee (191.77, 43.18) |

**Every coordinate is a whole number of mils** — `make_repairs.py` refuses a
value that is not, which is how a transcription slip fails rather than rounds.

### Why the group rectangle did not have to change

`y = 43.18` for the signal line was not chosen for its own sake. The `Mid` group
on this same page is the identical shape — a stand-in resistor with a ground
below it drawing downward — and `scripts/boxgeom.py` measures its bottom margins
as **5.08 mm** from the group box to the ground triangle's apex and **3.43 mm**
to the bottom of the `GND` text. At y 43.18 the Lo boost ground apex lands at
58.42 and its `GND` text bottom at 60.07, against the existing bottom edge at
63.5: **5.08 and 3.43**, the same two numbers. The box did not need to move, and
did not.

`boxes-before.txt` and `boxes-after.txt` are byte-identical for all five other
group rectangles — which is a second, independent statement that nothing outside
the Lo boost group moved.

### Rotations: 270 and 180, and why neither is arbitrary

- **`SI6` at 270, not 90.** At 270 pin 2 is on the left and pin 1 on the right;
  pin 2 is `lo_boost_in` and pin 1 is `out`, so 270 puts the input on the left
  of the series element and the output on the right. 90 would reverse them.
  `R1` is the one other horizontal `Device:R` on this page and is also at 270.
- **`SI7` at 180, not 0.** `Device:R` pin 1 is at the top at rotation 0 and at
  the bottom at 180. `SI7.1` is on `GND` and `SI7.2` on `lo_boost_in`, so 180 is
  what keeps pin 1 at the ground end. **Rotation 0 would have swapped the two
  pins between the two nets and changed the netlist pin sets** — which this
  repair has to leave untouched, since it is electrically a no-op.
  `Device:R` is a symmetric rectangle with `pin_numbers hide` and empty pin
  names, so 180 and 0 draw the same thing; `SI3` on this page is already at 180
  and `crops/before-top-band.png` shows it rendering the same as `SI4` at 0.

---

**Repair class 5 is stated backwards in `TOOLING.md`, and the correction is a
measurement**
-------------------------------------------------------------------------------

`TOOLING.md` records class 5 as: *"a capacitor turned from rotation 270 to 0
keeps `angle 90` on its fields and renders its text vertical."* That is a true
observation of one direction, and the remedy it implies — set the field angle to
0 — is **wrong in the other direction**, which this repair ran into immediately.

`SI6` turned from rotation 0 to 270 and `move_component` carried its fields
through at **angle 0**. Setting them to 0 is exactly what the recorded remedy
says to do, and `crops/control-si6-field-angle-0.png` is a render of that state:
**`SI6` and `56K` come out vertical.** The committed sheet carries them at
**angle 90**, and `crops/after-si7-ground.png` shows them horizontal.

**The rule the evidence supports is a composition, not a constant:**

> a field renders horizontally when `(symbol rotation + field angle) mod 180 == 0`

which fits all four cases on this page that could test it — `R1` at 270 with
angle 90 (horizontal), `SI3` at 180 with angle 0 (horizontal), `SI6` at 0 with
angle 0 (horizontal), and the control above at 270 with angle 0 (vertical).
**The control is the part that makes this a finding**: without rendering the
angle-0 state, "90 is what works here" would have been indistinguishable from a
guess that happened to land.

This also silently corrupted a measuring script. `scripts/boxgeom.py` read the
stored angle as the rendered one and reported `SI6`'s reference as a vertical
2.86 mm-tall box instead of a horizontal 1.27 mm-tall one — a 1.43 mm error in a
margin, in the direction that makes a page look tighter than it is. It is fixed
and the fix is in its docstring.

---

The other two things akcli could not do
---------------------------------------

Recorded because `TOOLING.md` states plainly that nothing says which repairs go
through an op and which through a text edit, and this run used both.

1. **akcli 0.22.0 has no operation that moves a label.** The vocabulary is
   `add_net_label` and `rename_net`; nothing else touches one. Deleting and
   re-adding would have lost copperhead's `(thickness 0.2)` styling and the
   `Intersheetrefs` property, so `scripts/move_labels.py` edits the two anchors
   as literals, each label block matched whole **including its `Intersheetrefs`
   property**, which carries its own copy of the anchor.

   **It runs BEFORE the ops, and the ordering is not cosmetic.** `akcli plan`
   checks the connectivity of the state its ops would produce. With the labels
   still at their old anchors it reports two `DANGLING_ENDPOINT` errors against
   the new wires — correctly, because at that moment nothing meets them. Moving
   the labels first is what lets akcli's own connectivity check mean something.

   **The cost of that ordering, stated rather than hidden:** akcli's *net diff*
   then compares against a half-moved sheet and reports a `SPLIT` and two
   `MERGE`s that are artifacts of the intermediate state, not of the repair.
   Either ordering confuses one of akcli's two checks. The binding comparison is
   therefore neither of them but `scripts/netcmp.py`, run on the committed
   before-sheet against the finished after-sheet.

2. **`add_wire` has no stroke parameter**, so all four wires it wrote came out
   `(width 0)` with no colour against copperhead's `0.254` and its per-net
   colour. Restated in `scripts/restyle.py`: three uncoloured for the signal
   nets, one grey `70 70 70 1` for `GND`, which is what the deleted ground stub
   carried and what `SI8`'s ground stub in the Mid group still carries.
   `colour_check.py` reports **0 clusters with mixed stroke** on both sheets,
   with all 72 wires parsed.

   **`add_junction` needed no restyling** — it wrote
   `(diameter 0) (color 0 0 0 0)`, byte-for-byte what the sixteen junctions
   already on the sheet carry. Checked, and asserted in `restyle.py` so it stops
   being an assumption.

---

Flow, as an observation
-----------------------

Not a check, not a score, and nothing here passes or fails on it.

**Before.** `lo_boost_in`, the input, entered at the **bottom** of the group at
(189.23, 59.69); its tag extended left and its wire ran right along a rail and
then turned up. `out`, the output, left at the **top** at (189.23, 41.91); its
tag extended right but its wire reached it from **below**, so the output pointed
up. The ground sat at the top of `SI7` and pointed down, back over its own wire.

**After.** `lo_boost_in` enters at the **left** at (189.23, 43.18), tag
extending left, wire running right. `out` leaves at the **right** at
(207.01, 43.18), tag extending right, wire arriving from the left — the output
points right. `SI7` hangs down from the node and its ground sits below it
pointing down, away from the part.

**The hairpin is gone because `SI7` and `#PWR07` moved, not because the wire was
re-routed.** There is no wire in the group whose only job is to reach back to
something above it.

**Where the same trait appears elsewhere on this page — observed, named, and
NOT changed.** `EVALUATING-DRAWINGS.md` §8 does not license widening a repair to
every group sharing a trait, and the style section says in as many words that
perfecting a page's style is not a reason to widen one. Of the five other
groups: `Mid` has its `in` label at the top (60.96, 41.91) and its ground at the
bottom; `Lo cut` has `hi_boost_out` at the top (224.79, 41.91) and `out` at the
bottom (224.79, 54.61), both tags extending right; `Hi cut` has `hcut_t2` at the
top and `hi_boost_out` / `lo_boost_in` at the bottom, tags extending right;
`Junction` has J1's four labels to the left of the connector with their wires
running right into it; `Hi boost` has `in` at its top left and the coil row
running left to right. **None of them has its output above its input.** Lo boost
was the only one, and it is the only one touched.

---

The verification set
--------------------

Every row is a number that could have come out differently. Full output in
`verify-before.txt` / `verify-after.txt`; `scripts/verify.py` prints it and
refuses an empty netlist rather than reporting one.

| measure | before | after |
| --- | --- | --- |
| sha256 | `3c2f302b…a3d682c` | `240c61df…8f0135a` |
| netlist nets / components | 21 / 27 | 21 / 27 |
| **net partition, as sets of REF.PIN** | — | **IDENTICAL** |
| **net names** | — | **IDENTICAL** |
| **net name → pin set mapping** | — | **IDENTICAL** |
| ERC errors | 0 | 0 |
| ERC warnings | 5, all `lib_symbol_issues` | 5, all `lib_symbol_issues` |
| parenthesis depth at end / lowest reached | 0 / 0 | 0 / 0 |
| NUL bytes / CR bytes | 0 / 0 | 0 / 0 |
| wires | 74 | 72 |
| total wire length | 1198.88 mm | 1181.10 mm |
| longest wire | 142.24 mm | 142.24 mm |
| true wire crossings | 0 | 0 |
| wire-to-wire tees / without a dot | 6 / 0 | 7 / 0 |
| pins on a wire interior / without a dot | 6 / 0 | 6 / 0 |
| junction dots / orphans | 16 / 0 | 17 / 0 |
| symbols placed | 32 | 32 |
| symbol pin instances | 73 | 73 |
| global labels / local labels | 14 / 14 | 14 / 14 |
| duplicate labels inside one group | 0 | 0 |
| group rectangles | 6 | 6 |
| per-net stroke clusters with mixed colour or width | 0 | 0 |
| **page area that differs between the two renders** | — | **one band, x 176.91–212.22 mm, y 38.86–61.09 mm** |

The ERC invocation, exactly: `kicad-cli sch erc --exit-code-violations -o
<out.rpt> <sheet>`, exit code 5 on both sides. The five warnings are
pre-existing, are all `lib_symbol_issues` on `copperhead_power` — a symbol
copperhead embeds in the sheet that no `sym-lib-table` declares — and are
reproduced by the same recipe against the committed low-cut page.

### The positive controls

`TOOLING.md` records a NUL check whose pattern collapsed to empty and counted
every line. Each of these proves its instrument moves:

- **byte counts**: alongside 0 NUL and 0 CR, the same counter reports 2798 LF
  bytes. A counter that has collapsed to zero everywhere is distinguishable from
  a file that carries neither byte.
- **netlist comparison**: one pin is moved from the largest net to the smallest
  in a copy of the BEFORE netlist and the partitions must come out different.
  They do (`moved SI8.2 from GND to unconnected-(SW1-PadMP)`). If that control
  failed, `netcmp.py` exits rather than printing a result.
- **netlist comparison, second control**: comparing a file to itself is reported
  as **VACUOUS** and exits non-zero, because such a comparison cannot fail. This
  is the guard against the `--apply` trap below.
- **render comparison**: an image against itself must give 0 differing pixels
  and against its own inverse must give many. Measured: 0 and 3,826,842.
- **band occupancy**: the predicate that counts objects in a region is also run
  over the whole sheet, where it must count every wire. It counts 72 of 72.

### Six traps, and what each one did here

1. **`akcli draw --ops` without `--apply` exits 0 having written nothing.**
   `run.sh` prints the sha256 of the sheet either side of the call —
   `e57ebb98…` before, `aa7ba170…` after. A dry run would have printed the same
   hash twice. `netcmp.py` independently refuses to compare two byte-identical
   files.
2. **`move_component` carries field offsets and the field ANGLE.** It did, on
   all three parts. See the class-5 correction above; `crops/after-si7-ground.png`
   is the rendered crop with the neighbours in frame, which is the only thing
   that can catch this class.
3. **`delete_object` orphans junction dots.** Six wires were deleted here.
   `junction_audit.py` — the committed one that resolves pin positions from the
   sheet's own `lib_symbols`, **not** `orphan_junctions.py` from the low-cut run
   — reports 0 orphans before and 0 after, with 16 dots becoming 17 and 0 tees
   missing a dot on either side.
4. **`kicad-cli sch export netlist` exits 0 on a structurally broken sheet.**
   A parenthesis-depth counter runs on both sheets (0 at the end, never below
   0), and both `verify.py` and `netcmp.py` treat an empty `<nets/>` or
   `<components/>` as a failure rather than as a reading.
5. **The render depends on what sits beside the sheet.** Both sides rendered
   from the same KiCad, the same project file with `intersheets_ref_show: false`
   — and, **new on this run, from the same FILE NAME.** See below.
6. **ERC warnings are pre-existing.** 5 before, 5 after, reported separately
   from errors, with the invocation written out.

Also: no control-character escape was typed into any tool parameter. The byte
counts above are how that is checked, not reading the files.

---

**A trap no earlier record carries: the title block prints the sheet's file
name**
-------------------------------------------------------------------------------

The first before/after render pair for this repair was made the way `run.sh` for
the hi-boost run makes one — both sheets in one directory, one named
`before.kicad_sch` and one `pultec-hi-boost.kicad_sch`. A pixel diff of the two
pages then reported differences in **two** bands: the Lo boost group, and a
second band at y 184.91–186.94 mm, about 125 mm away from anything this repair
touched.

That second band is the title block, which prints `File: before.kicad_sch`
against `File: pultec-hi-boost.kicad_sch`.

This is the same shape as the `intersheets_ref_show` trap already recorded —
**a before/after pair that differs by something other than the sheet's
content** — and the existing remedy, *"render both sides of a comparison from
one directory"*, does not prevent it. `run.sh` now renders the two sides as the
**same file name in two sibling directories carrying identical project files**.
With that, the diff reports **one band**, x 176.91–212.22 mm, y 38.86–61.09 mm,
entirely inside the Lo boost group rectangle.

**And the bounding box hid it.** The first measurement took ImageMagick's trim
box over the thresholded difference, which spanned both bands and read as a
single 148 mm-tall region — a number that looks like a catastrophe and is
actually two small changes with the whole page between them.
`scripts/pixeldiff.py` reports **bands** of differing rows and columns rather
than one box, for exactly this reason.

---

What I did not do
-----------------

- **I did not add an entry to `docs/schematic/verdicts.md`.** There is no
  verdict on this sheet. The existing `pultec-hi-boost` entry still binds to the
  accepted sheet's sha256 and is untouched.
- **I did not change anything outside the Lo boost group.** Measured three ways:
  the five other group rectangles' content margins are byte-identical in
  `boxes-before.txt` and `boxes-after.txt`; the render differs in one band
  inside the Lo boost rectangle; and the netlist is identical as pin sets, as
  names, and as the mapping between them.
- **I did not touch `circuits/` or `lib/`.** `circuits/pultec/schematic/low-boost.ts`
  was modified and unstaged when this work began and is left exactly as it was,
  unstaged.
- **I did not apply the first correction**, which moved `SI7` below the existing
  bottom rail and left the input below the output. It is described above because
  what it got wrong is the useful part.
- **I did not re-arrange the other groups to match `S1`**, and I did not score
  them against it. Where the trait appears elsewhere it is named above and left.
- **I did not write a flow check, a flow gate or a flow score**, anywhere in this
  directory.

### Things I noticed and deliberately left

He pointed at one group. These are observations, not proposals:

- **`#PWR07`'s hidden `Reference` field was 19.05 mm west of its own symbol**,
  over the SI6 column. `move_component` carried that offset along, which would
  have put it just inside the group's left edge. It draws nothing, because the
  field is hidden. It was restated at the symbol's own origin — which is
  `#PWR08`'s arrangement — as housekeeping within the group being redrawn, and
  it is the one edit here that changes no pixel. **The other three ground
  symbols on the page have the same kind of offset and were not touched.**
- **`copperhead_power:GND` un-hides its `Value` at the instance level.** The
  library hides it; every placed instance on this page shows `GND` beside the
  symbol. Four instances, four different offsets — `#PWR01` and `#PWR06` to the
  left at dy 0, `#PWR08` below at dy +3.556, and `#PWR07` which was above at
  dy −3.556. `#PWR07` now matches `#PWR08`. The other three are unchanged.
- **The exported netlist carries a mix of scoped and unscoped net names** —
  `/sel1` and `/tap_100mh` against `GND`, `in`, `out`, `lo_boost_in`,
  `hi_boost_out`, `hcut_t2`. `TOOLING.md` already records that label scope
  changes the exported name and that nothing covers what to do about it. Both
  labels this repair moved kept their scope, so the mix is unchanged.
- **`junction_audit.py`'s pin regex misses a single-line pin declaration.** It
  resolves 68 of the sheet's 73 pin instances; the five it misses are the hidden
  single-line pins of the four `GND` symbols and the `PWR_FLAG`. It does not
  affect the orphan result here — those pins sit at wire endpoints, not on wire
  interiors — and `verify.py` reports both counts side by side so the gap is
  visible rather than silent. Not fixed, because it is the committed instrument
  the last run's numbers were taken with.
- **`akcli pins` mixes units.** Given `--at 207.01 53.34` in millimetres it
  returns `y_mil` of −96.66 and 203.34, which is the millimetre value with a
  ±150 **mil** offset added. The pin *spacing* it reports is right and the
  absolute coordinates are not. Pin positions in this repair were taken from the
  sheet's own `lib_symbols` instead. Worth knowing before trusting
  `akcli pins --at` for a coordinate.

---

Was `TOOLING.md` enough for this task?
--------------------------------------

Mostly, and it is the reason the traps above cost minutes rather than a pass.
Four places it did not cover:

1. **Its `akcli plan` invocation is wrong.** It gives
   `akcli plan <ops.json> <sheet.kicad_sch>`; the tool takes
   `akcli plan --ops <ops.json> <sheet.kicad_sch>` and rejects the positional
   form with `unrecognized arguments`. The `draw` line beside it is right.
2. **The title-block file-name trap**, above. The existing remedy for its own
   class does not catch it.
3. **Repair class 5's remedy is stated for one direction only**, and following
   it for a part rotated the other way produces vertical text. The composition
   rule and the control render are above.
4. **Nothing covers what to do when a repair needs a label moved.** akcli has no
   op for it, so it has to be a literal edit, and *when* that edit runs relative
   to the ops decides which of akcli's two self-checks is meaningful and which
   reports artifacts. The ordering chosen here and its cost are written out
   above; it is a judgement the document does not make.

One thing it does cover that was load-bearing: **look at the render.** The
field-angle class, the `GND` text landing on `SI7`'s lead, and the title-block
band were all invisible to every count in the table above.
