---
status: unreviewed
circuit: pultec-low-cut
tools: copperhead (drafting) + akcli-kicad 0.22.0 (repair) + KiCad 10.0.5
prior: docs/research/2026-10-29-hybrid-pass-1.md (pultec-low-boost)
---

# Full process run on a second board — pultec-low-cut

**The drawings produced here are UNREVIEWED.** Nothing in this document is a
judgement of any page. Everything below is a measurement, a statement of what is
on the page, or a statement of what was changed and why. Per
`EVALUATING-DRAWINGS.md` §1 and §2 the only qualified reviewer is the owner.

## What this run was for

`pultec-low-boost` produced a page the owner accepted after four repairs
(`2026-10-29-hybrid-pass-1.md`). **The question here is repeatability: does the
same process, and do the same repairs, work on a different circuit?** The
deliverable is a rendered page plus a classification of every repair as a known
class or a new one.

Four of the six repairs recur by class. **Three are new**, and one of the three
is a defect the process creates rather than one copperhead leaves behind.

## 0. The circuit, derived from the repository

`bun tools/schgen/board-sheets.ts` was run from the repository root, then

```
kicad-cli sch export netlist --format kicadxml \
  build/schgen-boards/pultec-low-cut/pultec-low-cut.kicad_sch
```

That export is the authority for connectivity, values and designators here;
`circuits/pultec/physical/low-cut.ts` is the model behind it and nothing in
`circuits/` was touched. **20 parts, 15 nets** (14 plus the `SW1.MP` mounting
lug, which is a no-connect). The low-boost figures were 19 and 14.

`build/schgen-boards/pultec-low-cut/REFMAP.md` supplies the block each
designator belongs to, and **the six blocks became the six copperhead groups**:

| group | parts | what it is |
| --- | --- | --- |
| Junction | J1, J2 | the five-way signal and five-way ground junction connectors |
| Hi boost | SI1 0R, SI2 47K | stand-in for the hi-boost section |
| Mid | SI9 100K | stand-in for the mid section |
| Hi cut | SI3 .047uF, SI4 430R, SI5 0R, SI6 4.7K | stand-in for the hi-cut section |
| Lo boost | SI7 56K, SI8 0R | stand-in for the low-boost section |
| Lo cut | C1–C7, RV1 470K, SW1 | **this board's own circuit** |

**`SI*` parts are stand-ins for absent sections here too, and the note from
low-boost that the pot stand-ins come as resistor pairs holds**: SI1/SI2 are
`RV_HI_BOOST`'s two halves and SI5/SI6 are `RV_HI_CUT`'s. It was checked against
this board's own `REFMAP.md` rather than assumed.

**The circuit is NOT low-boost's with different values.** Its own network is
seven capacitors whose tops all sit on one node (`hi_boost_out`, 11 pins) and
whose bottoms go to the six contacts of a rotary — with **C7 paralleled on C3**,
so position 3 selects two capacitors — plus a 470K pot wired as a rheostat
across the same two nodes. The common node of the bank is a **signal** node, not
ground, which is the structural difference that drives most of what follows.

**Net names.** The export's nine auto-generated names were replaced with short
meaningful ones in the intent (`c1_sel`…`c6_sel`, `hi_tap`, `hcut_t1`,
`hcut_t2`) and `0` with `GND`, as the earlier trial measured that long
auto-generated names change the layout and cost nothing to replace.
`scripts/intent_vs_model.py` compares the intent's net partition against the
generated sheet's netlist export and prints both:

```
noConnect == unconnected: True
PARTITION (pin sets, names ignored): IDENTICAL
```

## 1. Draft — nine group configurations, and the one taken

`draft.py` builds nine variants as literals (group assignment × group order) and
renders each. **Every configuration was rendered and looked at.** The full
output is reproducible by `python3 draft.py`.

**The measured result that matters, and it is new:**

> **copperhead's placement search reports `wire crossings 5 to 5` in all nine
> configurations.** On low-boost it reached **0 in all 37** configurations
> measured in `2026-10-29-copperhead-against-the-idiom.md`.

Every variant also reports `groups wrapped onto 2 rows to fit the sheet` and
`ink 16% of the usable frame, compaction failed`; low-boost's four groups sat on
one row at 21%.

**`v1-blocks-flow` was taken as the draft** — the six groups above, ordered
`Junction, Hi boost, Mid, Hi cut, Lo boost, Lo cut`, which is the order the
junction connector numbers the ladder in. Reasons, stated so they can be
disputed: the six groups are the model's own blocks, so each heading names a
real section of the EQ; the low-cut section stays whole in one group, which the
`v7`/`v8` splits break by putting RV1 in a group of its own; and `v5`/`v6`,
which merge all nine stand-ins into one rectangle, lose the section names
entirely. **Its layout is not low-boost's** — different group count, different
grouping, different order (P3).

- before page: `docs/research/2026-10-29-low-cut-full-run/baseline-copperhead-v1-blocks-flow.png`
  (sha256 of the sheet `fcdfd483a608585ec988c8f80691a50df71a9fba1f332a08054a7e49446f669c`)

## 2. Does akcli damage a copperhead sheet? — re-measured on THIS sheet

Not assumed from low-boost. The probe was a **semantic no-op**:
`set_component_transform SW1 rotation 0 mirror none`, SW1's existing transform,
forcing akcli to parse and rewrite the whole file while changing nothing.

| measure | before | after |
| --- | --- | --- |
| sha256 | `fcdfd483…` | `fcdfd483…` — **IDENTICAL** |
| token families | 70 | 70 |
| whole-file textual diff | — | **empty** |
| netlist pin sets | 15 nets | identical |

**This is a stronger result than low-boost's and it refines that finding.**
There, the same probe added two junction dots and the report recorded a caveat
that akcli writes new elements in a compact single-line style where copperhead
pretty-prints. Here nothing at all was written. **akcli does not reformat a
copperhead sheet; it only emits its own style for elements it adds**, and the
low-boost junction additions were a real normalisation of three-way wire ends
that this sheet did not have.

## 3. The repairs, and their classification

Applied as four akcli op-lists (`repairs-all.json`, 92 ops, then three smaller
passes) plus three direct-edit scripts for things akcli cannot do. Each is
classified against the low-boost pass.

### Repair 1 — J2's five stacked ground symbols → one. **SAME CLASS as low-boost repair 2.**

`#PWR02`–`#PWR06` sat at `x=46.99`, `y=78.74 … 88.90`, **2.54 mm apart** — one
per J2 pin, the owner's *"stacked on top of each other"* case exactly. Four were
deleted, `#PWR06` kept at `(46.99, 88.90)` as the single terminator, and one
vertical trunk added from `y=78.74` to `y=88.90`. The five existing pin stubs
were untouched.

The bottom symbol was kept rather than the top for a reason worth stating: a
KiCad `GND` symbol's pin is at its top and its triangle hangs below, so a
terminator at the top of a downward trunk draws its body over the trunk.

### Repair 2 — the hairpin case. **SAME CLASS as low-boost repair 1, and it did not occur here.**

Checked rather than assumed. `scripts/pwr_survey.py` lists every power symbol
with the wire entering its pin. All four surviving `GND` symbols take their wire
from above or horizontally with the body continuing away from the part:
`#PWR01` (J1.5) and `#PWR06` (J2) horizontally, `#PWR07` (SI8) and `#PWR08`
(SI9) from above. **No ground symbol on this board was oriented so a wire
doubles back**, before or after. The class is real and this board did not
produce an instance.

### Repair 3 — Lo boost's duplicated `lo_boost_in`. **SAME CLASS as low-boost repair 4 — same designator, same remedy.**

`lo_boost_in` carried two labels inside the Lo boost rectangle, **21.85 mm
apart**: at SI7's bottom `(229.87, 67.31)` and SI8's top `(247.65, 54.61)`.

**Measured cause: orientation, not routing.** SI7 was `rotation 0`, putting its
`lo_boost_in` pin (pin 2) at the **bottom**; SI8 was `rotation 180`, putting its
`lo_boost_in` pin at the **top**. The shared node therefore surfaced at opposite
ends of two side-by-side parts, and every wire path between them wraps around
one of the bodies — the shortest measured 35.56 mm with four corners.

**Remedy:** `set_component_transform SI7 rotation 180`. Both `lo_boost_in` pins
are then at `y=57.15` and one **straight 17.78 mm horizontal with no corner**
joins them. Both labels deleted; one `lo_boost_in` added on a 2.54 mm stub at
`(238.76, 52.07)`; `out` moved to SI7's new bottom at `(229.87, 67.31)`.

**Why a rotation is safe for a resistor here and would not be for a capacitor.**
A field's stored text angle is relative to its symbol's rotation. copperhead
stores `angle 0` on resistor fields, which renders horizontal at both `0` and
`180` — SI5 and SI8 on this same sheet are already `rotation 180` and prove it.
It stores `angle 90` on capacitor fields, which renders horizontal **only** at
`270`. So no capacitor was rotated anywhere in this pass.

### Repair 4 — the cap bank: 5 true crossings → 0. **SAME CLASS as low-boost repair 3 (long crooked run caused by placement), at seven parts instead of one.**

This is the largest repair of the pass and the one `EVALUATING-DRAWINGS.md` §6
ranks first — *"the biggest problem is rats nests with wires and part
placement/orientation that don't make any sense."*

**Measured before.** copperhead tiled the seven capacitors column-major into
four columns (`x = 91.44, 128.27, 163.83, 200.66`) with two rows each, each
capacitor at the `y` of its own selector contact. The common node ran as a
**horizontal trunk at `y=127.00` through the middle of the contact span**
(`121.92 … 134.62`) with vertical stubs reaching up and down to capacitors on
both sides of it. Those stubs cross the selector runs:

```
TRUE CROSSINGS (X): 5
  (85.09,124.46) (97.79,124.46) (134.62,124.46) (134.62,129.54) (170.18,129.54)
```

and the selector runs reach 115.57 mm (`c4_sel`, `78.74 → 194.31`).

**Why no simpler repair exists, worked out rather than guessed.** Moving the
trunk above or below the bank while leaving the capacitors where they are does
not help: with the columns not monotone in contact number, a trunk at any single
`y` still has risers passing through the selector runs. The crossings are a
consequence of the tiling, so the tiling is what had to change.

**What was done.** Each capacitor stays at `rotation 270` and at the `y` of its
own contact, and the `x` positions become **monotone ascending with contact
number** at a 12.7 mm pitch: `C1 96.52, C2 109.22, C3 121.92, C4 134.62,
C5 147.32, C6 160.02`, with `C7` at `(121.92, 116.84)` in C3's column because
they are in parallel. Then:

- **six selector runs, one per contact, each a single straight horizontal with
  no corner** — 29.21, 41.91, 54.61, 67.31, 80.01 mm and the 16.51 mm `c1_sel`
- **one `hi_boost_out` trunk** at `y=109.22`, with **one riser per capacitor**
  offset 2.54 mm clear of the capacitor's own field text, plus RV1's drop
- **C7** joined to C3 by a vertical strap on `c3_sel` and a 2.54 mm stub on the
  trunk riser

The no-crossing property is a consequence of the ordering and was proved pairwise
before it was drawn, then re-measured after: with `x` ascending in contact number
and the trunk above every capacitor, a riser's `y`-range lies entirely above the
contact rows it could otherwise cross.

**It also collapsed a label pair for free.** `hi_boost_out` had two labels inside
the Lo cut rectangle, 63.96 mm apart — one at RV1's top pin, one in the bank.
The trunk reaches RV1's pin 1 by wire, so **both were deleted and one label put
at the trunk's right end**. That is the same class as repair 3, obtained without
a repair of its own.

### Repair 5 — the PWR_FLAG drawn inside the `out` label. **NEW CLASS.**

copperhead synthesises one `PWR_FLAG` per power net for ERC. On low-boost it
landed at `(161.29, 144.78)`, 72 mm from the nearest `GND` symbol, on a clear
stretch of the cap-bank trunk, and the owner's instruction was to leave it in
place.

**Here it landed at `(46.99, 67.31)` — the exact coordinates of `#PWR01`.** Two
power symbols at one point. The `PWR_FLAG` symbol's pin is at `(0,0)` with its
diamond drawn from `+1.27` to `+2.54` in symbol space, i.e. **above** the pin in
sheet space, so the diamond occupied `x 45.97…48.01, y 64.77…66.04` — inside the
box of the `out` label at `(49.53, 64.77)`. `zoom-before-junction-j1.png` shows
the diamond struck through the word `out`.

**Remedy:** `#FLG01` moved to `(41.91, 81.28)` on a 5.08 mm stub off the new J2
ground trunk, where its diamond occupies empty space. It was moved rather than
deleted, per the owner's low-boost instruction. The `out` label was not touched:
moving it instead would have run its wire through the diamond.

**Why this is a class and not an accident.** The flag is placed on the power net
with no regard for what is already at that point, and whether it collides
depends entirely on what the net's geometry happens to be on that board. **It
will recur, and on a board whose ground net is dense it will recur in a worse
place.** This one *was* caught by `akcli check --layout`
(`LAYOUT_LABEL_OVER_SYMBOL label 'out' … runs over #FLG01`) — the one real
defect on this page the lint named.

### Repair 6 — field offsets that were right for the old arrangement. **NEW CLASS, and it is the one worth carrying forward.**

**copperhead does not use one field offset per part kind.** Its placement search
nudges each symbol's Reference and Value to clear the wires of the layout *it*
produced. Measured on this sheet's seven capacitors, as `(y_field − y_symbol)`:

| part | Reference | Value |
| --- | --- | --- |
| C1, C2 | −5.842 | −3.302 |
| C3 | **−9.652** | **−7.112** |
| C7 | **+3.302** | **+5.842** (both BELOW the body) |
| C4 | −4.572 | **+4.572** (straddling) |

`move_component` carries those offsets along faithfully. **Every one of them was
tuned to an arrangement that no longer exists**, so after repair 4: C4's
`3300pF` landed on the `c6_sel` run, and C3's and C7's text landed on each
other. The effect is invisible to every check in the stack — the netlist is
identical, ERC is clean, and `akcli check --layout` named none of it. It was
found by rendering the page and looking at it.

**akcli 0.22.0 has no operation for a symbol field's position** (the gap
low-boost recorded), so `scripts/capfields.py` is a direct text edit that
normalises all seven to copperhead's own `−5.842 / −3.302`.

**And normalising them was not enough, which is the second half of the finding.**
A `Device:C` body is **5.08 mm across the leads**, so C7 at 7.62 mm above C3 left
only 2.54 mm between the two bodies, and a part's two lines of field text need
about 4 mm. The `C3` reference was drawn over C7's lower plate
(`zoom-after-lo-cut-C3-C7.png` is the region after the fix). **Pass 3 therefore
dropped C7 to 10.16 mm of clearance and lifted the trunk, its seven risers and
RV1's drop by 2.54 mm** — a second rework of a region that had already passed
every check.

### Repair 7 — orphan junction dots. **NEW CLASS, and this one the process creates.**

**`delete_object` on a wire does not remove the junction dot at its vertex.**

Measured, with a check written for it (`scripts/orphan_junctions.py`, which
reports every junction with fewer than two wires through it):

```
BASELINE                           5 junction(s), 0 orphan(s)
after repair pass 1               18 junction(s), 4 orphan(s)
after repair pass 3               21 junction(s), 7 orphan(s)
final                             14 junction(s), 0 orphan(s)
```

The four from pass 1 were the tees of copperhead's old `hi_boost_out` trunk at
`y=127.00`. Two of them had **zero** wires through them — free-floating dots in
empty space — and two landed **on the new `c3_sel` run, where a dot says "a
connection here"** and there is none. Pass 3's deletions produced seven more, by
the same mechanism, which is what makes it a class rather than an incident.

**Nothing in the stack sees it.** The netlist is byte-for-byte identical with or
without them, akcli's own connectivity gate reports `(clean)`, ERC reports `0
violations`, and `akcli check --layout` has no code for it. **They were found by
looking at the rendered page** — two visible green dots in the middle of nothing
— and only then measured.

They were removed by a second and fourth akcli pass. **The remedy is a check, not
a habit**: `scripts/orphan_junctions.py` runs on a sheet and prints a number that
must be zero.

## 4. What each surviving device earns

`EVALUATING-DRAWINGS.md` P1: *a device is noise unless it is earning its place,
and the draughtsman must be able to say what work.* Anything below that cannot be
defended should be deleted rather than argued for.

**Ground symbols — 4, down from 8.**

| symbol | what it earns |
| --- | --- |
| `#PWR06` (J2) | one symbol for five pins that now meet on a 10.16 mm trunk |
| `#PWR07` (SI8, Lo boost) | the only ground in its group; nearest other 132 mm away |
| `#PWR08` (SI9, Mid) | the only ground in its group; nearest other 68 mm away |
| `#PWR01` (J1.5) | **the weakest of the four, and put up for overruling.** It is 21.59 mm above the J2 trunk on the same column. Folding it in would remove one symbol at the cost of a 21.59 mm run spanning the gap between two different connectors, making a six-tee trunk 32 mm long. This is the same judgement the low-boost pass made for `#PWR02`, flagged the same way, and his ruling on that one settles this one |

**`#FLG01`** earns nothing on the drawing — it is an ERC annotation. It is on the
page because the owner said to leave low-boost's in place, not because this pass
can defend it.

**Labels — 16 global, down from 18, plus 8 local.** Every surviving global label
either leaves its group or is defended below:

| net | labels | closest pair | both in one group? |
| --- | --- | --- | --- |
| `hi_boost_out` | 4 | 35.38 mm | no — Junction, Hi boost, Hi cut, Lo cut |
| `lo_boost_in` | 4 | 42.97 mm | **two of the four are** — see below |
| `in` | 3 | 24.26 mm | no — Junction, Hi boost, Mid |
| `out` | 3 | 55.33 mm | no — Lo cut, Junction, Lo boost |
| `hcut_t2` | 2 | 52.82 mm | **yes, both in Hi cut** — see below |

**Two label pairs inside one group were LEFT, and here is the defence for each.**
The low-boost verdict that collapsed a pair used the owner's words *"used twice
right next to each other"*, about a 27 mm pair. Neither of these is that, and the
criterion is whether the connecting wire would be hard to trace by eye, not
whether a rectangle happens to enclose both ends.

- **`hcut_t2`, 52.82 mm apart in Hi cut.** A wire would be one 52.07 mm
  horizontal plus an 11.43 mm drop — two segments, one corner, across an empty
  region, and at 63.5 mm it would be **the second-longest wire on the page**.
  This is the pass's open judgement call: a defensible page exists either way,
  and it is put up for overruling in those terms.
- **`lo_boost_in`, 57.50 mm apart in Hi cut.** This one has a stronger defence
  and the difference is the point. SI5's body sits between the two endpoints, so
  a wire cannot run straight: the shortest path measures ~71 mm with **three
  corners**, squeezing between SI5's `hi_boost_out` label at `(185.42, 76.20)`
  and the group's bottom edge. **A pair of labels and a four-segment squeeze past
  a label are not the same trade**, which is why one of these two was a close
  call and the other was not.

**Long runs.** The `hi_boost_out` trunk is **138.43 mm, the longest wire on the
page**, and it is stated here rather than buried: it is the low-cut network's
common node — the pot's top terminal and all seven capacitor tops — drawn once as
a rail instead of as labels. It replaced two labels and a staircase. **If the
reviewer reads a 138 mm rail as worse than two labels 64 mm apart, that is the
call to make and this pass does not get to make it.** The six selector runs
(29–80 mm) are the fan-out of a 1-of-6 selector to a row of seven capacitors —
the same defence the low-boost pass gave for the same structure, there accepted.

**Hairpins: none**, re-surveyed rather than assumed (see repair 2).

## 5. Verification — re-measured, not assumed

Baseline is `v1-blocks-flow` as drafted; final is the four-pass sheet.

**Netlist** — `kicad-cli sch export netlist --format kicadxml`, compared as sets
of `REF.PIN` per net, **after every one of the four passes and after every direct
edit**:

```
NET PIN SETS AND NAMES: IDENTICAL
```

15 nets both sides, including `hi_boost_out (11) C1.1 C2.1 C3.1 C4.1 C5.1 C6.1
C7.1 J1.2 RV1.1 SI2.2 SI5.1`, `GND (8) J1.5 J2.1 J2.2 J2.3 J2.4 J2.5 SI8.1
SI9.2` and `unconnected-(SW1-PadMP) (1) SW1.MP`.

**ERC — `kicad-cli sch erc`, same basename both sides**, each sheet named
`pultec-low-cut.kicad_sch` in a directory holding its own `.kicad_pro` and
`sym-lib-table`, because otherwise KiCad never reads the project's symbol
library table and reports ten false `lib_symbol_issues` (the trap recorded on
low-boost):

```
BASELINE  Found 0 violations
FINAL     Found 0 violations
```

**True wire crossings** — horizontal/vertical segment pairs intersecting at a
point interior to at least one of them:

| | baseline | final |
| --- | --- | --- |
| wires | 77 | 64 |
| **true crossings (X)** | **5** | **0** |
| T-meetings | 0 | 11 |

All **11** T-meetings carry a junction dot, checked point by point; the
remaining three of the fourteen dots sit where a wire meets a pin (RV1's wiper
tee, the J2 trunk's terminator, and C3's pin 2 where the selector run and C7's
strap meet). Every dot has at least two wires or a pin through it
(`scripts/orphan_junctions.py`: `14 junction(s), 0 orphan(s)`).

> `scripts/crossings.py`, inherited from the low-boost pass, prints `12` for the
> T-meeting count while listing 11 points: it double-counts one. The crossing
> count it exists for is unaffected. Recorded rather than silently corrected,
> because the script is committed and someone will re-run it.

**Per-net wire-stroke consistency** — copperhead colours wires **by net**, and
colour is how a reader follows one. `akcli add_wire` has no stroke parameter, so
all 36 wires it added came out `(width 0)` with no colour. `scripts/colour_check.py`
groups wires into clusters by shared endpoints and reports any cluster whose
members disagree:

```
BASELINE                                     0 mixed clusters
after pass 1, before restyle                 2 mixed clusters
after pass 3, before restyle                 2 mixed clusters
FINAL                                        0 mixed clusters
```

**`akcli check --layout`:**

```
BASELINE  7 findings
FINAL     1 finding   (pre-existing: label 'hcut_t1' over SI3, in Hi cut,
                       a region this pass did not touch)
```

**This is a different result from low-boost and it is worth recording as a
correction.** There the lint *"reported the same single pre-existing finding
before and after four repairs"*. Here it moved 7 → 1 and it named the PWR_FLAG
collision (repair 5). **It still missed every defect in repairs 6 and 7** —
capacitor values over wires, text over a plate, and seven floating junction dots
— so the standing instruction holds: run it, report it, never gate on it.

**Element census, baseline → final:**

| | baseline | final |
| --- | --- | --- |
| `wire` | 77 | 64 |
| `global_label` | 18 | 16 |
| `label` (local) | 8 | 8 |
| `symbol` | 49 | 45 |
| `junction` | 5 | 14 |
| `rectangle` | 14 | 14 |
| `text` | 6 | 6 |
| `GND` power symbols | 8 | 4 |

## 6. What akcli could not do, and what was done instead

Three direct sheet edits, all outside akcli, all recorded because the page the
owner reviews should not carry tool artifacts unrelated to the repairs.

1. **`add_wire` has no stroke parameter** — 36 new wires at `(width 0)` with no
   colour, against copperhead's `0.254` and per-net colour. `scripts/restyle.py`
   and `scripts/restyle3.py` set them from a literal uuid → colour map.
   *Confirms the low-boost gap.*
2. **`add_net_label` has no `shape`** — it emits `(shape input)`, which renders
   as a pointed tag, where every label on the sheet is `(shape passive)`. Four
   labels rewritten with copperhead's `fields_autoplaced`, `thickness`, colour
   and `Intersheetrefs` form. *Confirms the low-boost gap.*
3. **No operation for a symbol field's position** — see repair 6.
   `scripts/capfields.py`. *Confirms the low-boost gap, and this run is the one
   where it blocked a repair rather than merely annoying one.*

A fourth thing akcli *does* and should not: **it leaves orphan junctions behind**
(repair 7). That is a defect rather than a gap, and it is the first one found in
akcli's own behaviour.

## 7. Regions changed — the back-check

Per `EVALUATING-DRAWINGS.md` §8 these are the parts only one party has
considered, and they go in front of the owner first. Before and after crops of
each are committed beside this document.

1. **Junction, J1** — `zoom-before-junction-j1.png` / `zoom-after-junction-j1.png`.
   The `PWR_FLAG` diamond was drawn inside the word `out`. **Look at:** whether
   the five J1 labels now read, and whether `out` at pin 4 is clear.
2. **Junction, J2** — `zoom-before-junction-j2.png` / `zoom-after-junction-j2.png`.
   Five stacked ground symbols became one on a trunk, and the `PWR_FLAG` moved to
   a stub off that trunk. **Look at:** whether one terminator at the bottom reads
   for all five pins; whether the flag on a 5.08 mm stub sticking left reads as
   an appendage; and whether J1's own ground 21.59 mm above should also have been
   folded in.
3. **Lo cut, the whole group** — `zoom-before-lo-cut.png` / `zoom-after-lo-cut.png`,
   with `zoom-after-lo-cut-C3-C7.png` and
   `zoom-after-lo-cut-selector-labels.png` closer in. Seven capacitors re-placed,
   the common node redrawn as a trunk, 39 wires deleted and 22 added, two labels
   collapsed to one, six selector labels re-placed in a cascade. **This is the
   largest changed region and the least-examined part of the page.** **Look at:**
   the 138.43 mm trunk; C7 sitting above C3 rather than in the contact rows;
   whether the six selector labels in a diagonal cascade read or scatter; and the
   empty band below the bank.
4. **Lo boost** — `zoom-before-lo-boost.png` / `zoom-after-lo-boost.png`. SI7
   turned 180°, two labels became one wire. **Look at:** whether `out` at the
   bottom and `lo_boost_in` on a stub above read the way round they should.

## 8. What the process did not cover

- **copperhead cannot be steered below 5 crossings on this circuit** and reports
  the same count for every configuration offered to it. The process has no step
  that notices this; it was noticed because the draft output was read. A driver
  that parsed `--json` would have the number.
- **Each akcli pass needs a restyle pass behind it**, and a pass that reworks
  earlier wires needs another. Four akcli passes here needed three restyle runs
  and two junction cleanups. The loop in the design document has one revise step.
- **No step re-reads a region it has already changed.** Repair 6's second half
  (C7's clearance) existed only because repair 4 had been applied, and repair 7
  recurred because pass 3 deleted more wires. Both were caught by rendering again
  after every pass, which is not in the written procedure.
- **`akcli check --layout` has no code for a junction dot**, and its
  `LAYOUT_LABEL_OVER_SYMBOL` fired once on this page where the measured gap is
  0.7 mm and the render reads as two separate words — a warning that cost a
  look. The label was moved anyway, which is a case of the lint steering a change
  it could not justify.
- **Field positions are a first-class layout input and nothing in the stack
  treats them as one.** copperhead sets them per part, akcli cannot touch them,
  and no check looks at them. Every one of this pass's text defects came from
  that gap.

## 9. Repeatability — the summary this run was for

| repair | class | low-boost | low-cut |
| --- | --- | --- | --- |
| multiple ground symbols where one serves | structural in copperhead | yes (J2, 5→1) | **yes (J2, 5→1)** |
| label where a wire belongs | structural in copperhead | yes (`hi_boost_out`, 27 mm) | **yes (`lo_boost_in`, 21.85 mm; `hi_boost_out`, 63.96 mm)** |
| ground or part oriented so a wire doubles back | structural in copperhead | yes (RV1) | **class checked, no instance** |
| part placement forcing a long crooked run | placement | yes (SI8, 1 part) | **yes (the cap bank, 7 parts)** |
| `PWR_FLAG` placed over another device | **NEW** | no (landed 72 mm clear) | **yes** |
| field offsets tuned to the superseded layout | **NEW** | not reached | **yes, twice** |
| orphan junction dots left by a deletion | **NEW — created by akcli** | not reached | **yes, 4 then 7** |

**The three expected classes all recurred or were ruled absent by measurement, so
the process transfers.** What it did not predict is that the repairs themselves
have a second order: re-placing parts invalidates the field positions copperhead
chose for them, and deleting wires leaves dots behind. **Both are invisible to the
netlist, to ERC, to akcli's connectivity gate and to its layout lint, and both
were found by rendering the page and looking at it** — which is the practice's
own first rule and the only step that caught anything new here.

## 10. Artifacts

Committed in `docs/research/2026-10-29-low-cut-full-run/`, so every number above
can be re-run rather than taken on trust.

| file | what |
| --- | --- |
| `low-cut-hybrid.kicad_sch` | the final sheet, sha256 `54900d50aad1a1ccca11ee6e827b1325e6e9aae76d37311eb42c75960804494b` |
| `low-cut-hybrid.pdf` / `.png` / `.svg` | **the after page** |
| `baseline-copperhead-v1-blocks-flow.kicad_sch` / `.pdf` / `.png` | **the before page**, sha256 `fcdfd483a608585ec988c8f80691a50df71a9fba1f332a08054a7e49446f669c` |
| `zoom-before-*.png` / `zoom-after-*.png` | every changed region, before and after |
| `base.intent.json` | the copperhead intent, transcribed from the netlist export |
| `draft.py` | the nine group configurations, every one a literal |
| `crop.py` | the crop rectangles, every one a literal |
| `probe.json` | the semantic no-op round-trip probe |
| `repairs-all.json` | the 92-op pass 1 |
| `repairs-pass2.json`, `repairs-pass4.json` | the two junction cleanups |
| `repairs-pass3.json` | the trunk lift and C7's drop |
| `scripts/` | the measuring scripts and the three restyle/field editors |
| `reports/` | the baseline and final ERC reports |

`scripts/` carries, beyond the nine inherited from the low-boost pass:
`intent_vs_model.py` (intent net partition vs the model's netlist),
`groups.py` (group rectangles and what falls in each),
`wires.py` (every segment with its stroke),
`tokens.py` (token-family census and diff),
`orphan_junctions.py` (**the new check**),
`restyle.py` / `restyle3.py` / `capfields.py` (the three direct edits).

Every script takes a `.kicad_sch` and prints a measurement or performs a literal
edit; **none of them computes a placement.**

akcli 0.22.0 and copperhead were reused from the existing scratchpad installs;
nothing was installed into the repository.
