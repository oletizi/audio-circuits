---
status: unreviewed
circuit: pultec-hi-boost
tools: copperhead 0.12.0 (drafting) + akcli-kicad 0.22.0 (repair) + KiCad 10.0.5
prior: docs/research/2026-10-29-hybrid-pass-1.md (pultec-low-boost)
prior: docs/research/2026-10-29-low-cut-full-run.md (pultec-low-cut)
prior: docs/research/2026-10-29-low-cut-collapse-pass.md
---

# Third board through the hybrid loop — pultec-hi-boost

**The drawing produced here is UNREVIEWED.** Nothing in this document is a
judgement of any page. Everything below is a measurement, a statement of what is
on the page, or a statement of what was changed and why. Per
`EVALUATING-DRAWINGS.md` §1 and §2 the only qualified reviewer is the owner.

## What this run was for

Two boards is not repeatability. `pultec-low-boost` and `pultec-low-cut` were
both carried to an accepted page by this loop, and both runs were written by the
agent that built the loop. **This run was done by an agent that did not build
it, following what is written down** — so the second deliverable, equal in
weight to the page, is a list of the places where the written process was
insufficient and something had to be decided. That list is §9.

`pultec-hi-boost` was chosen because it is structurally the least like the two
accepted boards. It is the only Pultec section board with **inductors**, it has
**27 parts against low-cut's 20**, and `bun tools/schgen/board-sheets.ts`
reports **8 fallback field placements** on it, the most of any board in
`boards/`, two of them the inductors.

## 0. The circuit, derived from the repository

`bun tools/schgen/board-sheets.ts` was run from the repository root, then

```
kicad-cli sch export netlist --format kicadxml \
  build/schgen-boards/pultec-hi-boost/pultec-hi-boost.kicad_sch
```

That export is the authority for connectivity, values and designators here.
`circuits/pultec/physical/hi-boost.ts` is the model behind it, and **nothing in
`circuits/` or `lib/` was touched.** `build/schgen-boards/pultec-hi-boost/REFMAP.md`
supplies the block each designator belongs to.

**27 parts, 21 nets** (20 plus the `SW1.MP` mounting lug, a no-connect). The
low-cut figures were 20 and 15; low-boost's 19 and 14.

| group | parts | what it is |
| --- | --- | --- |
| Junction | J1, J2 | the five-way signal and five-way ground junction connectors |
| Mid | SI8 100K | stand-in for the mid section |
| Hi cut | SI1 .047uF, SI2 430R, SI3 0R, SI4 4.7K | stand-in for the hi-cut section |
| Lo boost | SI6 56K, SI7 0R | stand-in for the low-boost section |
| Lo cut | SI5 0R | stand-in for the low-cut section |
| Hi boost | SW1, C1–C9, L1–L4, R1, RV1, RV2 | **this board's own circuit, 18 of the 27 parts** |

**The stand-in semantics were checked against this board's own `REFMAP.md`
rather than assumed**: a hi-boost board carries stand-ins for the four sections
it does NOT contain, and the `SI*` pots arrive as resistor pairs (SI3/SI4 are
`RV_HI_CUT`'s two halves, SI6/SI7 `RV_LO_BOOST`'s). SI5 is a single half here,
which is a difference from low-cut and is what makes the Lo cut group one part.

**The circuit's own shape, and it is not the low-cut bank with inductors added.**
A 1-of-6 rotary takes the input on its common and fans to nine capacitors whose
tails are its six contacts — three contacts carry a parallel pair
(2: C2 ∥ C5, 4: C4 ∥ C8, 5: C6 ∥ C9). The capacitor **heads** land not on one
common node but on **four different taps of one coil**, modelled as four
inductors; those four coil tops are common, and go through R1 (Qmax) to the Q
pot RV2, whose far terminal meets the level pot RV1's wiper. RV1 sits across
`in` and `hi_boost_out`.

**The contact-to-tap mapping is monotone, and the whole arrangement in §3 turns
on that.** Contact 1 → 600 mH, contacts 2 and 3 → 300 mH, contact 4 → 200 mH,
contacts 5 and 6 → 100 mH. Descending inductance with ascending contact number,
in four contiguous blocks, so the four tap spans are **disjoint** when the
capacitors are ordered by contact.

**Net names.** Fourteen of the twenty-one nets came off the export as
`Net-(C1-Pad1)`-style auto-generated names. They were replaced in the intent
with names read off `circuits/pultec/electrical/from-netlist.ts` and
`controls.ts` — `sel1`…`sel6` the six selector contacts, `tap_100mh`…`tap_600mh`
the four coil taps, `coil_top` the common coil top, `qmax_out` the far side of
R3, `boost_wiper` the level pot's wiper. **Where those names come from is a
decision the written process does not cover; see §9.3.**

`scripts/intent_vs_model.py`, adapted from the low-cut run, compares the intent's
net partition against the generated sheet's netlist export:

```
noConnect == unconnected: True
PARTITION (pin sets, names ignored): IDENTICAL
```

## 1. Draft — nine group configurations, and the one taken

`draft.py` builds nine variants as literals (group assignment × group order) and
renders each. **Every configuration was rendered and looked at.** Its variant
set is this board's, not low-cut's: the own section holds 18 of 27 parts, so the
splits cut the **own** group (Cap bank / Tank / Level) where low-cut's split the
stand-ins. Full output: `reports/draft-nine-variants.log`.

**The measured result that matters:**

| variants | wire crossings copperhead reports | sheet |
| --- | --- | --- |
| the five that keep the own section whole (v1–v5) | **8 to 8** in every one | A4, ink 26% (v4: A3, 12%) |
| the four that split it (v6–v9) | **2 to 2** in every one | A4, ink 21–22% |

On low-boost copperhead reached 0 crossings in all 37 configurations measured;
on low-cut it reported 5 in all nine. **It reports a number per configuration and
does not move off it**, which is now three boards' worth of the same behaviour.

**`v2-blocks-own-last` was taken as the draft** — six groups named after the
model's own blocks, ordered `Junction, Mid, Hi cut, Lo boost, Lo cut, Hi boost`,
which puts the five stand-in groups in one band across the top and gives the own
circuit a full-width band of its own. Reasons, stated so they can be disputed:

- the six groups are the model's own blocks, so each heading names a real
  section of the EQ — the ground the low-cut run gave for rejecting its merged
  variants, and the page that was accepted;
- the own 18-part circuit stays in one rectangle. The split variants turn the
  four tap nets into **cross-group label pairs** and cut one section into three
  headed boxes, an arrangement nobody has reviewed;
- the own circuit gets a band it can be re-placed inside, which §3 needs.

**This is the clearest place the written process gave no criterion.** It cost
six crossings in the draft to take a structure the repair could work with. See
§9.5.

- before page: `baseline-copperhead-v2-blocks-own-last.png` / `.pdf`,
  sheet sha256 `b2cdd4a814c32f08dfa392571fb61c7a903fa21ba85d03535e3ec1efe7bd3dde`
- four other variants are committed as renders for comparison:
  `draft-v1-blocks-flow.png`, `draft-v5-merged-own-last.png`,
  `draft-v6-merged-split3.png`, `draft-v9-merged-split2-bank-first.png`

## 2. The repair, in one akcli pass and one text pass

**174 akcli ops** (`repairs-pass1.json`, reasons in `repairs-pass1.notes.txt`),
dry-run with `akcli plan` first. The net diff it printed, in full:

```
# connectivity (0)
  (clean)
Net changes:
  ~ GND: -#PWR02.1 -#PWR03.1 -#PWR04.1 (+1 more) (17->13 pins)
```

— the four deleted ground symbols and nothing else, which is the whole point of
running `plan` before `draw --apply`.

Then **69 literal text edits** (`scripts/restyle_fields.py`) for the three things
akcli 0.22.0 cannot do, all three confirming gaps the low-cut run recorded.

### Repair 1 — J2's five stacked ground symbols → one. **SAME CLASS as low-boost 2 and low-cut 1.**

`#PWR02`–`#PWR06` sat at `x=33.02`, `y=66.04 … 76.20`, **2.54 mm apart** — one
per J2 pin, the owner's *"stacked on top of each other"* case. Four deleted,
`#PWR06` kept at `(33.02, 76.20)` as the single terminator, one vertical trunk
added from `y=66.04` to `y=76.20`, four junction dots on it. The five existing
pin stubs were untouched.

The bottom symbol was kept for the reason the low-cut run states: a KiCad `GND`
symbol's pin is at its top and its triangle hangs below, so a terminator at the
top of a downward trunk draws its body over the trunk.

**Third board, third occurrence, same geometry.** `zoom-before-junction-j2.png`
/ `zoom-after-junction-j2.png`.

### Repair 2 — the hairpin case. **SAME CLASS as low-boost 1; checked, no instance.**

`scripts/pwr_survey.py` lists every power symbol with the wire entering its pin.
All four surviving `GND` symbols take their wire from above or horizontally with
the body continuing away from the part: `#PWR01` (J1.5) and `#PWR06` (J2)
horizontally, `#PWR07` (SI7) and `#PWR08` (SI8) from above. **No ground symbol on
this board is oriented so a wire doubles back**, before or after. Second board
in a row where the class is real and the instance absent.

### Repair 3 — `PWR_FLAG` drawn inside the `out` label. **SAME CLASS as low-cut 5, and the same coordinate collision.**

copperhead synthesises one `PWR_FLAG` per power net. Here `#FLG01` landed at
**`(33.02, 54.61)` — the exact coordinates of `#PWR01`**, J1's ground, which is
what happened on low-cut too. The flag's diamond is drawn above its pin, so it
occupied `x 31.75…34.29, y 52.07…53.34`, inside the box of the `out` global
label at `(35.56, 52.07)`. `akcli check --layout` named it:
`LAYOUT_LABEL_OVER_SYMBOL label 'out' … runs over #FLG01`.

**Remedy:** `#FLG01` moved to `(27.94, 71.12)` on a 5.08 mm stub off the new J2
ground trunk, where its diamond occupies empty space. Moved rather than deleted,
per the owner's low-boost instruction. The `out` label was not touched.

**Two boards out of three.** The flag is placed on the power net with no regard
for what is already at that point, and on both boards where a ground symbol and
the flag were synthesised for the same net they landed on the same pin.

### Repair 4 — the bank and the coils: 8 true crossings → 0. **SAME CLASS as low-cut 4, at thirteen parts instead of seven.**

This is the largest repair and the one `EVALUATING-DRAWINGS.md` §6 ranks first.
**The whole Hi boost group's arrangement is re-authored.** What copperhead
produced: the nine capacitors tiled across two wrapped bands (copperhead's own note:
*"group 'Hi boost' was wider than the sheet; its columns wrapped onto 2
bands"*), three of the four inductors in a column at `x=259.08` — 125 to 165 mm
east of the capacitors they feed — and the four tap nets and `coil_top` carried
as **ten labels** between them — three
`tap_100mh`, three `tap_200mh`, two `tap_300mh`, two `coil_top`, the furthest
pair 200.66 mm apart. Eight true crossings, seven of them in the selector fan-out.

**What was done, and every coordinate is a literal in `scripts/make_repairs.py`:**

- **the nine capacitors are vertical** (rotation 0, pin 1 up to the tap, pin 2
  down to the contact), **x strictly ascending in contact number at a 15.24 mm
  pitch**, each **at the y of its own contact**;
- **six selector runs, one per contact, each a single straight horizontal with
  no corner** — 20.32, 50.80, 66.04, 96.52, 127.00 and 142.24 mm, with a
  junction dot where a run passes through the first of a parallel pair;
- **four tapped-coil sections at rotation 180**, pin 2 up on the rail and pin 1
  down on its own bus, each **above the x-span of the capacitors on its tap**;
- **four tap buses at four heights** (`tap_600mh` is one capacitor and one coil,
  so it is a single vertical with no bus at all; the others at y = 119.38,
  121.92, 124.46);
- **one `coil_top` rail**, 113.03 mm, the second-longest wire on the page,
  carrying all four coil tops to R1 — drawn once as a rail instead of as two
  labels 122 mm apart.

**Why no crossing is possible in that arrangement, proved pairwise before it was
drawn and re-measured after.** A capacitor's riser climbs from its own head
upward; a selector run is horizontal at its own contact's y and stops at the
last capacitor on it. With x ascending in contact number, a riser at `x_k` can
only reach a run at `x_j > x_k`, which means `j > k`, which means that run lies
*below* the riser's bottom end. And the four tap spans being disjoint means a
coil's drop or a capacitor's riser is always inside its own span, so it cannot
reach another tap's bus whatever height that bus is at. Measured after:

```
TRUE CROSSINGS (X): 0  []
```

### Repair 5 — the two duplicate on-page label pairs in Hi cut. **SAME CLASS as the low-cut collapse pass, same two nets, same remedy.**

**Collapsed without reasoning about it, per `EVALUATING-DRAWINGS.md`.**

- **`hcut_t2`**, labelled at SI2's top pin `(78.74, 41.91)` and again at
  `(130.81, 50.80)`, **52.82 mm apart, both inside Hi cut.** One 52.07 mm
  horizontal at `y=44.45` — above SI2's own body, below the group title — plus a
  6.35 mm riser joins SI2.1 to the existing SI3/SI4 pair. One label survives, at
  the position it already had.
- **`lo_boost_in`**, labelled at SI1's right pin `(91.44, 57.15)` and at SI4's
  bottom `(148.59, 63.50)`, **57.50 mm apart, both inside Hi cut.** A straight
  run at `y=57.15` would pass through SI3's body, so it is routed below: 8.89 mm
  down, 59.69 mm across at `y=66.04`, 5.08 mm up. The Hi cut rectangle's bottom
  edge was moved from 67.31 to 69.85 to give that run 3.81 mm of air.
  One label survives, at SI4.

**The low-cut run left a 52.82 mm `hcut_t2` pair with a written defence** and the
owner then named a duplicate label as the defect. The rule has since been
tightened to admit no test, so the identical pair on this board was collapsed
without one. `zoom-before-hi-cut.png` / `zoom-after-hi-cut.png`.

### Repair 6 — field offsets, and a new wrinkle. **SAME CLASS as low-cut 6, plus the field ANGLE.**

`move_component` carries each part's field offsets along faithfully, and
copperhead's offsets are per-part, tuned to the arrangement the move destroys.
Measured on this board, **it also carries the field ANGLE**, which the low-cut
record does not mention:

| part | Reference as `move_component` left it | after |
| --- | --- | --- |
| C1 | `(at 93.98 129.032 90)` | `(at 100.33 124.46 0)` |
| C7 | `(at 215.9 132.588 90)` | `(at 222.25 137.16 0)` |
| L4 | `(at 93.98 106.0477 90)` | `(at 100.33 109.22 0)` |
| L1 | `(at 204.47 109.22 0)` | `(at 207.01 109.22 0)` |

copperhead stores `angle 90` on a capacitor's fields because it placed the
capacitor at rotation 270, where 90 renders horizontal. **A capacitor turned to
rotation 0 keeps `angle 90` and its text renders vertical.** Six of the nine
capacitors and three of the four inductors came out that way; the other four
parts were already at a rotation whose fields are stored at `angle 0`. akcli 0.22.0 has no operation for
a field's position, so `scripts/restyle_fields.py` restates all 26 fields as
literals at one offset — 6.35 mm to the right of the symbol, one line above and
one below its midline.

**And the first offset chosen was wrong, which is the second half of this
finding.** At low-cut's 12.7 mm pitch the widest value (`4700pF`, about 7.6 mm
set) ended **0.93 mm from the NEXT capacitor's plate and 1.4 mm from its own** —
every value nearer its neighbour than the part it belongs to. Nothing overlapped
and no check saw it; it was found in a 300 dpi crop. The pitch was widened to
15.24 mm, which puts that gap at **3.5 mm** and costs **20.32 mm on the longest
selector run** (121.92 → 142.24 mm). Both numbers are stated because the trade is
real and neither side of it has been reviewed.
`zoom-after-bank-left.png`, `zoom-after-bank-right.png`.

### Repair 7 — orphan junction dots. **CLASS CHECKED, no instance — and the inherited check could not say so.**

`delete_object` on a wire leaves the junction dot at its vertex. 60 wires and 5
junctions were deleted here, so the class had every opportunity.

`scripts/orphan_junctions.py`, inherited from the low-cut run, **reported 6
orphans on the final sheet, and all 6 are legitimate.** It counts only the wires
passing through a dot and calls anything with fewer than two an orphan; it does
not know about pins. Every one of the six is a point where the `coil_top` rail
or a selector run passes **through a symbol pin** — the commonest shape in a
rail-and-riser arrangement and exactly what a dot is for.

`scripts/junction_audit.py` is the correction. It resolves every pin's sheet
position from the sheet's own `lib_symbols` block (verified against
`akcli pins <lib_id> --rotation R` for all five passive kinds and the rotary),
counts pins as well as wires, **and reports the converse that no committed
script covered — a wire-to-wire tee with no dot on it**, which is a connection a
reader cannot see.

```
                              baseline   final
junctions                            6      16
ORPHAN JUNCTIONS                     0       0
wire-to-wire tees                    0       6   (all 6 carry a dot)
pins on a wire interior              0       6   (all 6 carry a dot)
```

## 3. What each surviving device earns

`EVALUATING-DRAWINGS.md` P1: *a device is noise unless it is earning its place,
and the draughtsman must be able to say what work.*

**Ground symbols — 4, down from 8.**

| symbol | what it earns |
| --- | --- |
| `#PWR06` (J2) | one symbol for five pins that now meet on a 10.16 mm trunk |
| `#PWR07` (SI7, Lo boost) | the only ground in its group; nearest other 146.2 mm away |
| `#PWR08` (SI8, Mid) | the only ground in its group; nearest other 28 mm away |
| `#PWR01` (J1.5) | **the weakest of the four, and the same one both previous pages put up for overruling.** It is 11.43 mm above the J2 trunk on the same column. His ruling on low-boost's `#PWR02` and low-cut's `#PWR01` settles this one, and he has not given one |

**`#FLG01` earns nothing on the drawing** — it is an ERC annotation. It is on the
page because the owner said to leave low-boost's in place, not because this pass
can defend it.

**Labels — 14 global and 14 local, down from 24 and 12.**

**Duplicate on-page labels inside one group: 6 → 0**, measured by
`scripts/metrics.py`, which reports the count and names the offenders. The four
nets still carrying more than one label each carry them in **different groups**,
one per group:

| net | labels | groups |
| --- | --- | --- |
| `hi_boost_out` | 4 | Hi boost, Junction, Hi cut, Lo cut |
| `in` | 3 | Hi boost, Junction, Mid |
| `lo_boost_in` | 3 | Junction, Hi cut, Lo boost |
| `out` | 3 | Junction, Lo boost, Lo cut |

**That "one per group" reading is a precedent, not a rule, and §9.17 says so.**

**Long runs.** Three wires on this page are over 100 mm and each is stated rather
than buried:

| wire | length | what it is |
| --- | --- | --- |
| `sel6` run | 142.24 mm | contact 6 to C7, the far end of the bank |
| `coil_top` rail | 113.03 mm | all four coil tops to Qmax, drawn once instead of as two labels 122 mm apart |
| `sel5` run | 127.00 mm | contact 5 to C6 ∥ C9 |

The six selector runs total **502.98 mm** and are the fan-out of a 1-of-6
selector to nine capacitors — the same structure the low-cut page gave the same
defence for, there accepted at 29–80 mm. **These are 20–142 mm, longer, because
this bank is nine capacitors wide rather than seven.**

**Hairpins: none**, re-surveyed rather than assumed (repair 2).

## 4. Verification — before and after, every number re-measured

Baseline is `v2-blocks-own-last` as drafted; final is the repaired sheet. **Both
were rendered from the same directory, with the same project file, by the same
KiCad** — see §9.9 for why that sentence is in the verification section.

| measure | baseline | final |
| --- | --- | --- |
| netlist net **pin sets** | 21 nets | **IDENTICAL** |
| netlist net **names** | — | **3 of 21 changed**: `tap_100mh`, `tap_200mh`, `tap_300mh` → `/tap_100mh`, `/tap_200mh`, `/tap_300mh` (see §9.10) |
| ERC **errors** | **0** | **0** |
| ERC warnings | 9 | 5 — all `lib_symbol_issues` on `copperhead_power`, one per power symbol (see §9.14) |
| parenthesis depth, final / minimum | 0 / 0 | **0 / 0** |
| NUL bytes / CR bytes | 0 / 0 | **0 / 0** |
| **true wire crossings** | **8** | **0** |
| wire-to-wire tees | 0 | 6 — **all 6 carry a junction dot** |
| pins on a wire interior | 0 | 6 — **all 6 carry a junction dot** |
| junction dots | 6 | 16 |
| **orphan junction dots** | 0 of 6 | **0 of 16** |
| **duplicate on-page labels in one group** | **6** | **0** |
| nets carrying more than one label | 9 | 4 |
| global labels / local labels | 24 / 12 | 14 / 14 |
| wires | 103 | 74 |
| total wire length | 1225.55 mm | 1198.88 mm |
| longest wire | 140.97 mm | 142.24 mm |
| symbols placed | 36 | 32 |
| symbol pin instances | 77 | 73 |
| group rectangles | 6 | 6 |
| per-net wire-stroke clusters with mixed stroke | 0 | **0** (**5** after akcli and before the restyle) |
| wires written at `(width 0)` | 0 | **0** (**31** after akcli and before the restyle) |
| `akcli check --layout` findings | 8 | 2 |

**Every one of those checks could have returned a different number, and several
did.** The duplicate-label check read 6 on the baseline; the stroke check read 5
mixed clusters and 31 zero-width wires in the intermediate state; the crossing
check read 8. The NUL check was given a positive control — a 7-byte file built
with `bytes([0])` in code, which it counted as 1.

**The two surviving `akcli check --layout` findings are both in regions this pass
did not touch**, and both are proximity warnings rather than overlaps:

```
WARNING [LAYOUT_LABEL_OVER_SYMBOL] label 'hcut_t1' … runs over SI1
NOTE    [LAYOUT_LABEL_OVER_WIRE]   label 'qmax_out' … runs over the wire
                                   (66.04,100.33)-(66.04,106.68)
```

Measured, `hcut_t1`'s text ends 1.0 mm above SI1's body and `qmax_out`'s ends at
the wire's own start point. **The lint was run and is reported; it is not
believed.** It named one real defect on this page (repair 3) and missed every
one of repairs 4, 6 and 7 — nine capacitors' text rendered vertical, thirteen
parts' fields tuned to a destroyed arrangement, and eight true wire crossings.

## 5. Regions changed — the back-check

Per `EVALUATING-DRAWINGS.md` §8 these are the parts only one party has
considered. Before and after crops of each are committed beside this document at
300 dpi.

1. **Hi boost, the whole group** — `zoom-before-hi-boost.png` /
   `zoom-after-hi-boost.png`. Thirteen parts re-placed and thirteen
   re-rotated, 60 wires deleted and 31 added, sixteen labels deleted and ten
   added. **This is the largest
   changed region and the least-examined part of the page.**
2. **The capacitor bank, close in** — `zoom-before-bank-left.png` /
   `zoom-after-bank-left.png` and the `-bank-right` pair. **Every one of these
   thirteen parts had its Reference and Value rewritten**, which is the class
   that is invisible to every automated check. **Look at:** whether each value
   reads as belonging to the capacitor on its left; the 3.5 mm gap to the next
   plate; and whether the nine-wide staircase reads as six contacts.
3. **The coil row** — `zoom-before-coil-row.png` / `zoom-after-coil-row.png`.
   Four inductors on one rail with one tap label each. **Look at:** the 113 mm
   rail; whether four coils hanging off it read as four taps of one winding
   rather than four separate parts.
4. **The selector** — `zoom-before-selector.png` / `zoom-after-selector.png`.
   SW1 moved 30.48 mm east and 5.08 mm south; six runs leave it. **Look at:**
   the six `sel` labels, each anchored past the right-hand end of the run above
   it; and pin 7's wire arriving at the same y as pin 4's run leaving.
5. **Junction, J2** — `zoom-before-junction-j2.png` / `zoom-after-junction-j2.png`.
   Five stacked ground symbols became one on a trunk; the `PWR_FLAG` moved onto a
   stub off that trunk. **Look at:** whether one terminator at the bottom reads
   for all five pins, and whether J1's own ground 11.43 mm above should have been
   folded in.
6. **Junction, J1** — `zoom-before-junction-j1.png` / `zoom-after-junction-j1.png`.
   The `PWR_FLAG` diamond was drawn inside the word `out`. **Look at:** whether
   the five J1 labels now read.
7. **Hi cut** — `zoom-before-hi-cut.png` / `zoom-after-hi-cut.png`. Two duplicate
   label pairs collapsed to wires. **Look at:** the 52 mm `hcut_t2` rail along
   the top of the box, and the `lo_boost_in` rail routed below SI3 — 59.69 mm
   with two corners in place of a label pair 57.50 mm apart.
8. **The Q chain** — `zoom-before-q-chain.png` / `zoom-after-q-chain.png`, which
   are **identical**, and that is why they are here. RV1, RV2 and R1 were
   deliberately not moved.

## 6. What was NOT done, stated plainly

- **The whole Hi boost arrangement is agent-authored and nobody has reviewed
  it.** Thirteen parts placed, four tap buses, six runs and a rail. The
  no-crossing property is proved; the *reading* of it is not established by
  anything.
- **An empty region about 34 × 34 mm sits inside the Hi boost rectangle**,
  bounded by the `in` column on the west, the `boost_wiper` wire on the north
  and SW1 on the east. **It is not closed.** Closing it means moving either the Q
  chain or the selector, and both are arrangement changes nobody has reviewed.
  The Hi boost rectangle also keeps about 7 mm of empty band below its content.
- **`#PWR01`, J1's ground, is unchanged** — the same symbol both previous pages
  put up for overruling, still unruled.
- **`#FLG01` is still on the page**, moved and not deleted, and earns nothing.
- **Two `akcli check --layout` findings are left** (`hcut_t1` over SI1,
  `qmax_out` over a wire), both pre-existing, both in regions this pass did not
  touch, both measured as clear in the render.
- **The `RV1` / `47K` text graze carried from the low-boost page is here too**,
  in copperhead's untouched Q chain, and was not fixed.
- **The `boost_wiper` wire at `y=113.03` passes 1.27 mm above the
  `hi_boost_out` label's anchor at `(30.48, 114.30)`, which is less than the
  half-height of the label's own tag box, so the render shows the wire running
  along the box's top edge.** Pre-existing in the
  draft, unchanged, and visible in both `zoom-*-q-chain.png`.
- **Three nets changed name** (§9.10), deliberately, and the netlist therefore
  does not match the baseline on names.
- **The five ERC `lib_symbol_issues` warnings are not suppressed.** Errors are 0.
- **No second akcli pass was needed and none was run**, so the low-cut finding
  that each pass needs a restyle behind it is confirmed only for one pass here.
- **No SPICE run, no board layout, no BOM.** Out of scope, and a fully specified
  BOM does not bind a schematic (`CLAUDE.md`).

## 7. Repeatability — the summary this run was for

| repair class | low-boost | low-cut | **hi-boost** |
| --- | --- | --- | --- |
| multiple ground symbols where one serves | yes (J2, 5→1) | yes (J2, 5→1) | **yes (J2, 5→1)** |
| label where a wire belongs | yes (27 mm) | yes (21.85 and 63.96 mm) | **yes (4 nets, 10 labels, up to 200.66 mm apart)** |
| ground or part oriented so a wire doubles back | yes (RV1) | checked, no instance | **checked, no instance** |
| part placement forcing a long crooked run | yes (SI8, 1 part) | yes (the cap bank, 7 parts) | **yes (the bank and the coils, 13 parts)** |
| `PWR_FLAG` placed over another device | no (landed 72 mm away) | yes | **yes, on `#PWR01`'s exact coordinates again** |
| field offsets tuned to the superseded layout | not reached | yes, twice | **yes, 26 fields — and the field ANGLE too, which is new** |
| orphan junction dots left by a deletion | not reached | yes, 4 then 7 | **checked, none — and the inherited check could not say so** |

**All seven classes recurred or were ruled absent by measurement, on a board with
inductors, nine capacitors and a four-tap winding. The process transfers.**

What the three boards together have not established: that the repair set is
complete. This board produced **no new repair class**, which is the first time;
what it produced instead is **five corrections to the written procedure and two
to the committed checks**, which is §9.

## 8. Tools

Versions, install commands and the procedure's own gaps are in `TOOLING.md` at
the repository root. What this run used, as data:

| | |
| --- | --- |
| copperhead | `0.12.0`, commit `476cc15965f0d1eeda70afb9e806936f6bb15c5c` |
| akcli-kicad | `0.22.0` (protocol 2), Python `3.14.6` |
| kicad-cli | `10.0.5` |
| invoked copperhead with | `npx tsx src/cli.ts` — tsx `4.23.1`, node `v22.19.0` (**not** bun; see §9.1) |
| PDF → PNG and every crop | ImageMagick `7.1.1-47` |
| the measuring and editing scripts | Python `3.14.6` |
| the throwaway copperhead board directory | `git init -q` |

Nothing was installed into the repository.

## 9. WHAT THE WRITTEN PROCESS DID NOT COVER

**This is the second deliverable and it is not smoothed over.** Each entry is a
place where an agent following `docs/superpowers/specs/2026-10-28-schematic-draughtsmanship-practice-design.md`
and the two prior run records had to decide something the written material does
not state, or where the written material is wrong.

**9.1 — copperhead is invoked with `npx tsx`, not `bun`.** The task brief for
this run said `bun src/cli.ts`; the committed `draft.py` from the low-cut run
uses `npx tsx src/cli.ts`. They are the same entry point, but nothing says which
is canonical, and this run used `npx tsx` because that is what is committed.

**9.2 — the committed `draft.py` cannot run.** It hard-codes a session
scratchpad path. `SCRATCHPAD` is now an environment variable, and `run.sh`
rebuilds the page end to end from the committed baseline.

**9.3 — net naming has no rule, and it changes the layout.** The records say the
auto-generated names "were replaced with short meaningful ones" and that the
intent was "transcribed from the netlist export". The export cannot supply a
meaningful name. Fourteen of this board's twenty-one nets needed one, and they
were read off `circuits/pultec/electrical/from-netlist.ts` and `controls.ts`.
**Nothing in the written process sends you there**, a different agent would name
them differently, and the earlier trial already measured that name length
changes copperhead's placement.

**9.4 — the variant set in `draft.py` is board-specific and must be
re-authored.** Nothing says how many variants, or on what axis to vary them. For
this board the useful splits cut the own group where low-cut's cut the
stand-ins, because the own group holds two thirds of the parts.

**9.5 — there is no criterion for choosing the draft, and the obvious number
pointed the wrong way.** The design says "more than one group assignment if the
first is unusable"; "unusable" is undefined. The four variants that split the own
section reported **2 crossings** against **8** for the five that keep it whole,
and the 8-crossing variant was taken — because the splits turn the four tap nets
into cross-group label pairs and cut one section into three headed boxes. **A
number in copperhead's own output was traded against a structural property, with
nothing written to adjudicate it.** This is the single largest undocumented
decision in the run.

**9.6 — nothing says which repairs go through akcli and which through a text
edit.** Both records use both and neither states a rule. This run put every
structural change through akcli so the net diff gates it, and only the three
documented gaps through literal text edits.

**9.7 — an akcli op cannot carry a reason.** `akcli 0.22.0` rejects any key it
does not recognise, op by op: adding a `"note"` key to each op had every one of them rejected with
`OP_UNSUPPORTED: <op>: unknown field 'note'`.
The reasons are written to a sidecar, `repairs-pass1.notes.txt`, keyed by op
index. (`docs/research/2026-10-28-placement-intent-representations.md` found fourteen
for fourteen EDA systems carrying no reason beside a placement decision; akcli
behaves the same way.)

**9.8 — the verb that applies an op-list is `draw --apply`.** The low-cut record
names `plan` and names the op-list files but never names the apply verb.
`akcli apply` is not a command, and `akcli draw --ops …` without `--apply` is a
dry run that prints `status: dry-run — nothing written` and exits 0. **A step
was lost to this, and the netlist comparison afterwards reported IDENTICAL —
because nothing had been written.** That is a false green the procedure invites.

**9.9 — the render depends on the project file sitting beside the sheet, and the
two prior runs rendered the two sides differently without saying so.**
copperhead's throwaway board directory has no `.kicad_pro`, so a draft renders
with intersheet references OFF. The generated `pultec-hi-boost.kicad_pro` has
`intersheets_ref_show: true`, so the first render of the repaired sheet drew
`[1]` beside **all 14 global labels** — fourteen devices that earn nothing on a
one-sheet page, and a before/after pair that differed by the project rather than
by the sheet. `run.sh` now sets the flag false and renders both sides from the
same directory. **Nothing in the written process mentions the project file as a
render input.**

**9.10 — label scope changes the exported net name, and the verification asks for
names to match.** A local label names its net with the sheet path prefixed:
`tap_100mh` becomes `/tap_100mh`. copperhead emitted the three multi-label tap
nets as globals and the single-label `tap_600mh` as a local. After the collapse
each has exactly one label, so all four were made local — **one label style for
the whole group, at the cost of three renamed nets.** The alternative was four
tag-outlined global labels sitting mid-bus. **Nothing written covers this**, and
the choice is reported rather than hidden: the pin sets are identical, three
names differ by a `/`.

**9.11 — `scripts/orphan_junctions.py` cannot distinguish an orphan from a
legitimate pin tee.** It counts wires only and reported **6 orphans on a page
that has none**. `scripts/junction_audit.py` replaces it. The low-cut record's
`14 junction(s), 0 orphan(s)` is true of that sheet but would not have been true
of this arrangement, where a rail passing through a pin is the normal shape.

**9.12 — no committed check looked for a wire-to-wire tee with NO dot**, the
converse defect and the one a reader cannot see. `junction_audit.py` reports it.
Six tees here, all dotted.

**9.13 — `scripts/metrics.py` had to name a group by BOTH coordinates of its
title.** The Junction and Hi boost rectangles share `x1 = 16.51` on this page,
and matching on x alone filed one group's labels under the other, inflating the
duplicate-label count from 6 to 8. Written down because the first version of
that check was wrong in a way that read as a finding.

**9.14 — the ERC recipe in the low-cut record does not reproduce, and the
control proves it.** That record states, under the recipe "each sheet named
`<board>.kicad_sch` in a directory holding its own `.kicad_pro` and
`sym-lib-table`": `BASELINE Found 0 violations / FINAL Found 0 violations`. Run
exactly that way, this board reports **9 and 5** — all `lib_symbol_issues`,
because copperhead writes `copperhead_power:GND` and `copperhead_power:PWR_FLAG`
and embeds that library in the sheet, where no `sym-lib-table` declares it.
**As a control the same recipe was run on the committed, accepted
`docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch`**
(`reports/erc-control-low-cut-accepted-page.rpt`):

```
 ** ERC messages: 5  Errors 0  Warnings 5
```

**The accepted page produces the same five warnings.** So the recorded "0
violations" came from something that run did and did not write down. Errors are
0 in every case, which is what §3 of `EVALUATING-DRAWINGS.md` turns on, but
**"Found 0 violations" is not what the recipe produces.**

**9.15 — no step says to re-read the field offsets after a move, and nothing in
the stack sees them.** Third board, third confirmation, with the field *angle*
added to the class. Every text defect in this run came from that gap, and all of
them were found in a 300 dpi crop.

**9.16 — nothing says what pitch to space a row of parts at, and the first choice
was measurably wrong.** Copying low-cut's 12.7 mm — the concrete, copyable
number, which is P4 exactly — put each capacitor's value 0.93 mm from the next
part and 1.4 mm from its own. Fixed by measurement, at a cost stated in §2.

**9.17 — "collapse duplicate on-page labels" needs a definition of *duplicate* to
be checkable, and the one used here is read off the accepted pages rather than
stated anywhere.** On a one-sheet page every label is an on-page label, and four
nets on this board legitimately carry three or four because they cross the
junction ladder into four different groups. The two accepted pages collapsed
pairs **inside one group** and kept the cross-group ones, and the owner accepted
both. That precedent was applied here and made into a check that must read zero.
**It is a reading of two verdicts, not a rule**, and it is flagged rather than
asserted.

**9.18 — the loop in the design document has one revise step**, and this run
needed draft → akcli → text pass → render → look → re-place → re-render. The
low-cut run said the same thing; it is still true.

## 10. Artifacts

Committed in `docs/research/2026-10-29-hi-boost-full-run/`, so every number above
can be re-run rather than taken on trust. `sh run.sh` with `SCRATCHPAD` set
rebuilds the final sheet and both renders from the committed baseline.

| file | what |
| --- | --- |
| `hi-boost-hybrid.kicad_sch` | **the final sheet**, sha256 `3c2f302b12a8c4c1eb8d1523bc876740d4b509cc8ee47934208471389d3a682c` |
| `hi-boost-hybrid.pdf` / `.png` / `.svg` | **the after page** |
| `baseline-copperhead-v2-blocks-own-last.kicad_sch` / `.pdf` / `.png` | **the before page**, sha256 `b2cdd4a814c32f08dfa392571fb61c7a903fa21ba85d03535e3ec1efe7bd3dde` |
| `zoom-before-*.png` / `zoom-after-*.png` | eight regions, before and after, 300 dpi |
| `draft-v*.png` | four of the nine drafts, as rendered |
| `base.intent.json` | the copperhead intent, verified against the model |
| `draft.py` | the nine group configurations, every one a literal |
| `crop.py` | the crop rectangles, every one a literal |
| `run.sh` | the whole pass, idempotent from the committed baseline |
| `repairs-pass1.json` | the 174-op akcli pass |
| `repairs-pass1.notes.txt` | what each of those ops is for, because an op cannot carry it |
| `reports/erc-baseline.rpt`, `reports/erc-final.rpt` | the two ERC runs |
| `reports/erc-control-low-cut-accepted-page.rpt` | **the control for §9.14** |
| `reports/draft-nine-variants.log` | copperhead's own output for all nine |
| `scripts/` | the measuring scripts and the one direct editor |

`scripts/` carries, beyond the eighteen inherited from the two prior runs:

- `make_repairs.py` — the arrangement as literal tables, emitted as an akcli
  op-list plus its sidecar of reasons
- `restyle_fields.py` — the three things akcli cannot do
- `junction_audit.py` — **the corrected junction check** (§9.11, §9.12)
- `metrics.py` — one before/after table, including the duplicate-label count
  that must be zero (§9.13)

Every script takes a `.kicad_sch` and prints a measurement or performs a literal
edit; **none of them computes a placement.**
