pultec-hi-cut: a full run of the drafting loop, fourth board
============================================================

**What this is.** `TOOLING.md` §0–6 applied to `pultec-hi-cut`, the fourth board
through the loop and the first run on a board of a kind the loop had already
done — `pultec-low-cut` is its near-sibling and is already drawn and accepted.
The page, its crops and every check are committed in
`docs/research/2026-10-29-hi-cut-full-run/`.

**The page is UNREVIEWED.** `EVALUATING-DRAWINGS.md` §1: a drawing has no
quality until a qualified reviewer says so, and the agent that produced one is
never a qualified reviewer of it. Nothing below assesses the drawing; everything
below is an observation or a measurement another reader can check.

- **Sheet** `docs/research/2026-10-29-hi-cut-full-run/hi-cut-hybrid.kicad_sch`
- **sha256** `7ccf557c5474222f6850b78f8c3c53ac45b89389f782f4b8c317d483900a76f1`
- **PDF / PNG / SVG** `hi-cut-hybrid.pdf`, `.png`, `.svg` beside it
- **Baseline** `baseline-copperhead-v4-blocks-mid-late.kicad_sch`,
  sha256 `2bb49cfce8b80dbde4afac44a16fe3c9d19f045d739385daf787b203b00ab876`
- **Reproduce** `SCRATCHPAD=<dir> sh docs/research/2026-10-29-hi-cut-full-run/run.sh`

**`run.sh` is idempotent and that was checked rather than asserted:** run a
second time from the committed baseline it re-derives the sheet
**byte-identically** (same sha256), the PNG **pixel-identically**
(`magick compare -metric AE` = 0), and the SVG differing in one line — its own
generation timestamp. The PDF differs because it embeds `/CreationDate`, which
is why `TOOLING.md` says a PDF cannot serve as a binding.

---

## 0. Authority, and the toolchain as it was actually run

The Pultec is an imported design, so **the schematic is authoritative and the
model was derived from a netlist export** (`CLAUDE.md`). Nothing under
`circuits/` or `lib/` was edited by this run; the only thing read out of the
model is the generated sheet
`build/schgen-boards/pultec-hi-cut/pultec-hi-cut.kicad_sch`, which the intent is
verified against.

**Versions re-recorded from the installed artifacts**, because `TOOLING.md`
names versions it does not enforce:

| tool | version, as the binary reports it |
| --- | --- |
| copperhead | `0.12.0`, `git rev-parse HEAD` = `476cc15965f0d1eeda70afb9e806936f6bb15c5c` |
| akcli-kicad | `akcli 0.22.0 (protocol 2)` |
| kicad-cli | `10.0.5` |
| ImageMagick | `7.1.1-47 Q16-HDRI aarch64` |
| bun | `1.3.8` |
| node / npx | `v22.19.0` |
| Python | `3.14.6` |

Both tools were still in the session scratchpad from the earlier runs, so this
run did not have to reinstall them — **which is luck, not pinning.** The
standing risk `TOOLING.md` records is unchanged.

---

## 1. The circuit, and the intent

`circuits/pultec/schematic/hi-cut.ts` is four lines; all five Pultec section
boards go through `sectionAuthoring()` in `section-board.ts`, which carries the
designator mapping and the selector pin maps. `bun tools/schgen/board-sheets.ts`
reports the board **usable with 2 fallback field placements** — the fewest of
the Pultec boards.

**21 parts, 14 nets** (plus one unconnected pin). The own section holds 13 of
the 21: a 1-of-6 rotary, ten capacitors, a 430R and the level pot. Six
stand-in parts cover the four absent sections, and two 1x05 headers are the
junction bus. **Stand-in semantics, stated because they have been got backwards
before: a hi-cut board carries stand-ins for the sections NOT in the build** —
here `hi-boost` (SI1, SI2), `low-cut` (SI3), `low-boost` (SI4, SI5) and `mid`
(SI6).

**The circuit's shape, and it is not low-cut's bank with three more capacitors.**
The level pot `RV1` sits across `hi_boost_out` and `lo_boost_in`; its **wiper**
feeds the 430R, which feeds the rotary's pole; each of the six contacts carries
one or two capacitors, and **all ten capacitor heads land on one node** —
`lo_boost_in`, which has **14 pins**: ten capacitor heads, `RV1.3`, `J1.3` and
the two low-boost stand-ins. That one-node fan-in is the structural fact the
whole arrangement in §3 turns on, and it is what the owner's verdict on low-cut
called *"the long rail"*.

**The contact-to-capacitance mapping is monotone**, read off the model's own
selector table (`positions` = 3kHz…16kHz for t1…t6):

| contact | capacitors | total |
| --- | --- | --- |
| 1 (3 kHz) | C1 .047uF ∥ C7 .033uF | .080 uF |
| 2 (4 kHz) | C2 .047uF ∥ C8 .01uF | .057 uF |
| 3 (5 kHz) | C3 .047uF | .047 uF |
| 4 (8 kHz) | C4 .022uF ∥ C9 .01uF | .032 uF |
| 5 (10 kHz) | C5 .022uF ∥ C10 2200pF | .0242 uF |
| 6 (16 kHz) | C6 .015uF | .015 uF |

**Net names.** Nine of the fourteen nets arrive from the export as
`Net-(C1-Pad2)`-style auto-generated names. The model's own names for them are
`j12_p1`…`j12_p6`, `j3_p1`, `j4_p2` and `si_hi_boost_j20_p3` — the authoritative
schematic's connector-pin references, which say which jack pin a net lands on
rather than what it does. They were replaced in the intent with
`sel1`…`sel6` (the six contacts, matching the accepted hi-boost page),
`sel_common` (pole to 430R), `cut_wiper` (pot wiper to 430R) and `hi_tap` (the
hi-boost stand-in's mid node, matching the accepted low-cut page). **Where those
names come from is still a decision the written process does not cover**:
`TOOLING.md` records it under what the procedure does not cover and nothing has
been written since. What this run added to it is that the **frequency table in
the model's own `positions` parameter** is where a selector-contact name can be
read from, and that consistency with the already-accepted pages (`sel1`…`sel6`,
`hi_tap`) was the tie-breaker — a style choice, made because style preferences
accumulate across drawings, not because anything says to.

**The intent was verified before drafting**, with
`scripts/intent_vs_model.py` copied from the hi-boost run:

```
noConnect in intent: ['SW1.MP']
unconnected pins in model: ['SW1.MP']
noConnect == unconnected: True
PARTITION (pin sets, names ignored): IDENTICAL
```

---

## 2. Draft — nine group configurations, every one rendered and looked at

`draft.py` (adapted from the hi-boost run's) writes nine group assignments and
group orders out as literals and renders each. Full output:
`reports/draft-nine-variants.log`. Four of the nine renders are committed
(`draft-v1-blocks-ladder.png`, `draft-v5-merged.png`, `draft-v7-blocks-split.png`,
`draft-v9-merged-split-bank-first.png`) plus the baseline; the other four are
re-derivable from `draft.py` and were looked at in the scratchpad.

**The measured result, and it REVERSES the hi-boost trade:**

| variants | wire crossings copperhead reports | sheet |
| --- | --- | --- |
| the six that keep the own section whole (v1–v6) | **9 → 8** in every one | A4, ink 23–25% |
| the three that split it (v7–v9) | **11 → 11** in every one | A4, ink 21% |

`TOOLING.md` records that on hi-boost the splits measured **2** crossings
against **8** for the whole section, and that the 8 was taken anyway — *"a
number from the tool traded against a structural property, with nothing written
to adjudicate it"*. **On this board there is no trade**: splitting the own
section is HIGHER on copperhead's own crossing count *and* turns `sel_common` into a
cross-group label pair *and* cuts one functional section into two headed boxes.
So the undocumented decision the hi-boost record warned about **did not have to
be made**, and that is itself the finding: the tension is a property of a
board's topology, not a standing one.

**`v4-blocks-mid-late` was taken as the baseline.** Its band order is
`Junction, Hi boost, Lo cut, Lo boost, Mid` with `Hi cut` in a full-width band
below. Reasons, stated so they can be disputed:

- the six groups are the model's own blocks, so each heading names a real
  section of the EQ — the ground on which the low-cut run rejected its merged
  variants, and the arrangement of both accepted pages;
- the band order is `LADDER_ORDER` (`lib/board/scaffold/supplier.ts`, *"the one
  order this circuit's own documentation states"*) with the own section
  removed, rather than an order chosen here;
- v1 wraps onto **three** rows and strands `Mid` alone at the bottom-left;
  v3/v6/v9 put the own group first and push the stand-ins below it; v5/v6/v8/v9
  merge the five stand-ins into one box titled `Stand-ins`, losing the
  per-section headings.

---

## 3. The repair, in one akcli pass and one text pass

**168 akcli ops** (`repairs.json`, reasons by op index in
`repairs.notes.txt`), dry-run with `akcli plan --ops` first. Its net diff, in
full:

```
# connectivity (0)
  (clean)
Net changes:
  ~ GND: -#PWR02.1 -#PWR03.1 -#PWR04.1 (+1 more) (17->13 pins)
```

— the four deleted ground symbols and nothing else.

**`--apply` was proved by sha, not by exit code** (`TOOLING.md` trap 1):

```
sha before apply: 2bb49cfce8b80dbde4afac44a16fe3c9d19f045d739385daf787b203b00ab876
sha after apply:  93883318f9184f2e8c36714da98c9a1e65760d69a32dcf74c70d12bbf15ad13c
```

Then **67 literal text edits** (`scripts/restyle.py`) for the four things akcli
0.22.0 cannot do.

### Repair 1 — the Hi cut group, re-authored. **8 true crossings → 0.**

Every one of the group's thirteen parts moves, so nothing copperhead drew in it
was kept: 54 wires, 8 junctions, 13 labels and 1 no-connect deleted, 21 wires,
14 junctions and 10 labels added. (The op-list's totals are 56 wires and 14
labels deleted and 25 wires added, because two wires and one label in Lo boost
and four wires in Junction belong to repairs 2–4.) **The arrangement is agent-authored and
nobody has reviewed it.**

- **The `lo_boost_in` rail**, `y = 96.52`, from `x = 60.96` (the pot's cw pin)
  to `x = 254.0` — **193.04 mm, the longest wire on any page in this record.**
  It carries all ten capacitor heads plus `RV1.3`, drawn **once** instead of as
  the three `lo_boost_in` labels copperhead put inside this group.
- **Ten capacitors vertical** (rotation 0: pin 1 up to the rail, pin 2 down to
  its contact), **x strictly ascending in contact number at a 15.24 mm pitch**,
  each at the y of its own contact. Within a contact the base capacitor comes
  first and its parallel partner second.
- **Six selector runs, one per contact, each a single straight horizontal with
  no corner**, 24.13, 54.61, 69.85, 100.33, 130.81 and 146.05 mm, with a
  junction dot where a run passes through the first capacitor of a pair.
- **Ten risers**, 5.08 to 17.78 mm, each from one capacitor head straight up to
  the rail, with a dot at each tee.
- **The west chain**: the pot at rotation 180 so its cw pin lands on the rail's
  west end and its wiper points west into a 13.97 mm column, then 11.43 mm east
  to the 430R, then 13.97 mm east to the pole.

**Why no crossing is possible in that arrangement, proved pairwise before it was
drawn and re-measured after.** A capacitor's riser climbs from its own head to
the rail, which is above everything. A selector run is horizontal at its own
contact's y and stops at the last capacitor on that contact. For a riser at
`x_i` (contact `i`) to cross a run at contact `j`, that run's y must lie strictly
between the rail and the riser's bottom, i.e. `j < i`; and with x ascending in
contact number every capacitor of contact `j < i` lies west of `x_i`, so that
run ends west of the riser. Measured after:

```
true wire crossings           0  []
```

### Repair 2 — J2's five stacked ground symbols → one. **FOURTH board, same geometry.**

`#PWR02`–`#PWR06` sat at `x = 67.31`, `y = 66.04 … 76.20`, **2.54 mm apart** —
one per J2 pin, the owner's *"stacked on top of each other"* case. Four
deleted, `#PWR06` kept at `(67.31, 76.20)` as the single terminator, one
vertical trunk added from `y = 66.04` to `y = 76.20`, four junction dots on it,
the five existing pin stubs untouched.

The bottom symbol is the one kept because `copperhead_power:GND` draws its
triangle **2.54 mm in the sheet's +y direction from its pin** (read off the
symbol definition in the sheet), so a terminator at the top of a downward trunk
would draw its body over the trunk.

`crops/before-junction-j2.png` / `crops/after-junction-j2.png`.

### Repair 3 — `PWR_FLAG` drawn inside the `out` label. **THIRD board, the same coordinate collision.**

copperhead synthesised `#FLG01` at **`(67.31, 54.61)` — the exact coordinates of
`#PWR01`**, J1's ground, which is what happened on low-cut and on hi-boost too.
The flag's diamond is drawn above its pin, so it occupied the box of the `out`
global label at `(69.85, 52.07)`; `akcli check --layout` named it
(`LAYOUT_LABEL_OVER_SYMBOL label 'out' … runs over #FLG01`), and the before crop
shows the word `out` with a diamond through it.

**Remedy:** `#FLG01` moved to `(62.23, 71.12)` on a 5.08 mm stub off the new J2
ground trunk. Moved rather than deleted, per the owner's low-boost instruction.
The `out` label was not touched.

`crops/before-junction-j1.png` / `crops/after-junction-j1.png`.

### Repair 4 — two duplicate on-page label pairs, in TWO different groups.

**Collapsed without reasoning about it**, per `EVALUATING-DRAWINGS.md`.

- **`cut_wiper`**, labelled at `(66.04, 134.62)` and `(104.14, 105.41)`,
  **48.5 mm apart, both inside Hi cut.** Both deleted with the group; the
  repaired group carries one, on the wiper's own wire.
- **`lo_boost_in` ×3 inside Hi cut** — `(97.79, 111.76)`, `(127.0, 120.65)`,
  `(228.6, 123.19)`. The repaired group carries **one**, at the rail's east end.
- **`lo_boost_in` ×2 inside Lo boost** — `(162.56, 54.61)` and
  `(180.34, 41.91)`, 17.78 mm apart in x and 12.7 mm in y. **This is a
  stand-in group the reviewer has never commented on, and collapsing the pair
  forced an arrangement change in it** (§4 and §9.5).

### Repair 5 — field offsets and the field ANGLE. **SAME CLASS as hi-boost 6, confirmed on a fourth board.**

`move_component` carried every moved part's field offsets and angles from the
arrangement the move destroyed. Measured on this board straight after the ops:

| part | as `move_component` left it | restated to |
| --- | --- | --- |
| C1 Reference | `(at 109.22 102.108 90)` | `(at 120.65 104.14 0)` |
| C10 Value | `(at 231.14 121.412 90)` | `(at 242.57 116.84 0)` |
| RV1 Reference | `(at 56.642 101.6 0)` | `(at 66.04 100.33 0)` |
| #PWR07 Value | `(at 180.34 65.786 0)` | `(at 175.26 62.23 0)` |

**All twenty capacitor fields came out at `angle 90`** on symbols now at
rotation 0, which renders **vertical** — `(rotation + angle) mod 180 == 0` is
the rule and 0 + 90 is not it. **RV1's carried offset of −4.318 mm put both its
fields at `x = 56.642`, half a millimetre from the `cut_wiper` column at
`x = 57.15`.** **#PWR07's carried `GND` text followed it down and landed below
its own group rectangle.** None of the three is visible to any check here; all
three were found by reading the sheet after the ops and confirmed in a 300 dpi
crop.

`scripts/restyle.py` restates **30 fields** as literals: the ten capacitors take
their text 6.35 mm to the right of the symbol, one line above and one below the
midline — one offset for ten parts instead of copperhead's ten.

### Repair 6 — orphan junction dots. **CLASS CHECKED, no instance.**

56 wires and 8 junctions were deleted here, so the class had every opportunity.
`scripts/junction_audit.py` (copied from the hi-boost run, which is the one
`TOOLING.md` says to use):

```
                              baseline   final
wires                               77        46
junctions                            8        19
ORPHAN JUNCTIONS                     0         0
wire-to-wire tees                    2        13   (13 of 13 carry a dot)
pins on a wire interior              0         4   ( 4 of  4 carry a dot)
```

**The two baseline tees carrying no dot are NOT a connectivity defect, and that
is a finding about the check** — see §9.6.

---

## 4. The Lo boost stand-in group, which the label rule reached into

The duplicate `lo_boost_in` pair sits in a group nobody has complained about.
Its cause is structural: **SI4's `lo_boost_in` pin is at its bottom (`y = 52.07`)
and SI5's is at its top (`y = 44.45`)**, 12.7 mm apart in y and 17.78 mm in x, so
copperhead labelled instead of wiring.

Three corrections were worked out and the chosen one is recorded with the two
that were not:

| correction | what it costs | flow it leaves |
| --- | --- | --- |
| route an L around the two bodies | 25.4 mm in three segments, two corners | unchanged |
| rotate SI4 by 180° | nothing moves, no rectangle changes | `out` enters at the BOTTOM, grounds at the bottom — an inverted U |
| **drop SI5 by 7.62 mm** (taken) | SI5, `#PWR07` and its `GND` text move; the rectangle grows 5.08 mm | `out` at the top, down, 17.78 mm across, down to ground at the bottom |

The third was taken because `EVALUATING-DRAWINGS.md` §8 asks what else a
correction fixes: it collapses the duplicate **and** leaves the group reading
top-to-bottom and left-to-right, which is the arrangement of the Lo boost group
on the page the owner approved. `crops/before-lo-boost.png` /
`crops/after-lo-boost.png`.

---

## 5. What each surviving device earns

`EVALUATING-DRAWINGS.md` P1: *a device is noise unless it is earning its place,
and the draughtsman must be able to say what work.*

**Ground symbols — 4, down from 8** (`power-after.txt` lists each with the wire
entering its pin):

| symbol | what it earns |
| --- | --- |
| `#PWR06` (J2) | one symbol for five pins that now meet on a 10.16 mm trunk |
| `#PWR07` (SI5, Lo boost) | the only ground in its group; nearest other 28.96 mm away |
| `#PWR08` (SI6, Mid) | the only ground in its group; nearest other 28.96 mm away |
| `#PWR01` (J1.5) | **the weakest of the four, and the same symbol all three previous pages put up for overruling.** It is 11.43 mm above the J2 trunk on the same column. He has not ruled on it |

**`#FLG01` earns nothing on the drawing** — it is an ERC annotation. It is on the
page because the owner said to leave low-boost's in place, not because this pass
can defend it.

**Hairpins: none.** `scripts/pwr_survey.py` lists every power symbol with the
wire entering its pin: `#PWR01` and `#PWR06` take theirs horizontally, `#PWR07`
and `#PWR08` from above, and in every case the triangle continues away from the
part. Checked rather than assumed, before and after.

**Labels — 13 global, 9 local, down from 18 and 8.** Duplicate on-page labels
**inside one group: 3 → 0**. The four nets still carrying more than one label
carry them in **different groups, one per group**:

| net | labels | groups |
| --- | --- | --- |
| `hi_boost_out` | 4 | Junction, Hi boost, Lo cut, Hi cut |
| `in` | 3 | Junction, Hi boost, Mid |
| `lo_boost_in` | 3 | Junction, Lo boost, Hi cut |
| `out` | 3 | Junction, Lo cut, Lo boost |

**That "one per group" reading is a precedent, not a rule**, and `TOOLING.md`
already flags it as such. An agent must not promote it.

**Long runs.** Three wires are over 100 mm and each is stated rather than buried:

| wire | length | what it is |
| --- | --- | --- |
| the `lo_boost_in` rail | **193.04 mm** | one 14-pin net drawn once, instead of the three labels copperhead put in this group |
| `sel6` run | 146.05 mm | contact 6 to C6, the far end of the bank |
| `sel5` run | 130.81 mm | contact 5 to C5 ∥ C10 |

The six selector runs total **525.78 mm** and are the fan-out of a 1-of-6
selector to ten capacitors — the same structure low-cut was accepted with at
29–80 mm for seven capacitors, and hi-boost at 20–142 mm for nine. **These are
24–146 mm, because this bank is ten capacitors wide.** Total wire length rose
from 610.87 mm to 974.09 mm, and that is the price of drawing the 14-pin node as
a rail instead of as labels.

---

## 6. The per-group signal-flow observation

**Reported as an observation, not as a check.** `S1` is a style preference:
followed where it fits, never enforced, never a reason to withhold or delay a
page. No threshold is invented here and no group is scored.

| group | where the input enters | where the output leaves | which way each points |
| --- | --- | --- | --- |
| **Hi cut** (own) | `hi_boost_out` at the pot's ccw pin, far west, **below** the pot body at `(60.96, 106.68)`, tag pointing right | `lo_boost_in` at the rail's east end `(254.0, 96.52)`, tag pointing right | left to right across 193 mm; the output leaves **above** the input, and the chain descends from the pot to the selector before fanning east |
| **Junction** | four labels on the west, on J1 pins 1–4 | the connector body is east of them | a connector has no through-path; the labels read left-to-right into the pins |
| **Hi boost** stand-in | `in` at SI1's top | `hi_boost_out` at SI2's right, pointing right | top to bottom, then left to right; the output points right |
| **Lo cut** stand-in | `hi_boost_out` at SI3's top | `out` at SI3's bottom, pointing right | top to bottom; the output points right but sits below the input |
| **Lo boost** stand-in | `out` at SI4's top | `lo_boost_in` on the link at SI4's bottom, pointing right; SI5 shunts down to ground | top to bottom and left to right |
| **Mid** stand-in | `in` at SI6's top | ground at SI6's bottom | top to bottom; **no horizontal flow at all** — it is a two-terminal shunt |

**Three of the five stand-ins and the own section are SHUNTS rather than series
paths**, and for a two-terminal shunt to ground "where the output leaves" has no
answer. `TOOLING.md` asks for the flow of a group before repairing anything in
it but gives no way to state it for a group with no through-path; see §9.9.

---

## 7. Verification — before and after, every number re-measured

Baseline is `v4-blocks-mid-late` as drafted; final is the repaired sheet.
**Both were rendered from the SAME FILE NAME in two sibling directories with
identical project files, by the same KiCad**, with `intersheets_ref_show` forced
off on both — which is what `TOOLING.md` now prescribes, and it worked: the
pixel diff shows **no title-block band**.

| measure | baseline | final |
| --- | --- | --- |
| netlist nets / components | 15 / 21 | 15 / 21 |
| netlist net **pin sets** | — | **IDENTICAL**, with a positive control that the comparator moves |
| netlist net **names** | — | **1 of 15 changed**: `cut_wiper` → `/cut_wiper` (§9.4) |
| ERC **errors** | **0** | **0** |
| ERC warnings | 9 | 5 — all `lib_symbol_issues` on `copperhead_power` |
| parenthesis depth, final / lowest | 0 / 0 | **0 / 0** |
| NUL bytes / CR bytes | 0 / 0 | **0 / 0** (positive control: 2332 LF bytes) |
| **true wire crossings** | **8** | **0** |
| wire-to-wire tees | 2 — **neither carrying a dot** | 13 — **all 13 carry a dot** |
| pins on a wire interior | 0 | 4 — **all 4 carry a dot** |
| junction dots | 8 | 19 |
| **orphan junction dots** | 0 of 8 | **0 of 19** |
| **duplicate on-page labels in one group** | **3** | **0** |
| global labels / local labels | 18 / 8 | 13 / 9 |
| wires | 77 | 46 |
| total wire length | 610.87 mm | 974.09 mm |
| longest wire | 73.66 mm | 193.04 mm |
| symbols placed | 30 | 26 |
| symbol pin instances | 64 | 60 |
| group rectangles | 6 | 6 |
| per-net wire-stroke clusters with mixed stroke | 0 | **0** |
| wires written at `(width 0)` | 0 | **0** (25 after akcli, before the restyle) |
| `akcli check --layout` findings | 8 | **0** |

**The exact ERC invocation**, because an unreproducible zero is indistinguishable
from a check that was never run:

```
kicad-cli sch erc --exit-code-violations -o <out.rpt> <sheet.kicad_sch>
```

run with the sheet named `pultec-hi-cut.kicad_sch` in a directory holding its
own `pultec-hi-cut.kicad_pro` and `sym-lib-table`. Errors **0** both sides;
warnings **9 → 5**, every one `lib_symbol_issues` on `copperhead_power:GND` and
`copperhead_power:PWR_FLAG`, which copperhead embeds in the sheet and no
`sym-lib-table` declares. **The control is what makes this a reading rather than
a difference between boards:** the same recipe run against the committed,
ACCEPTED `docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch`
reports **0 errors and the same 5 warnings**
(`reports/erc-control-low-cut-accepted-page.rpt`). This reproduces the
hi-boost run's §9.14 exactly.

**Where the page differs, as bands with their columns** (`pixelbands.txt`;
positive controls: an image against itself 0 differing pixels, against its own
inverse 3,835,631):

```
  rows   32.13 ..   34.16 mm        62 px   columns [(158.5, 158.88)]
  rows   36.70 ..   38.61 mm        56 px   columns [(158.5, 158.88)]
  rows   40.51 ..   76.83 mm      7071 px   columns [(57.53, 69.85), (158.5, 198.25)]
  rows   88.77 ..  153.80 mm     76205 px   columns [(50.55, 271.91)]
```

The two 2 mm bands at the top are a **0.38 mm column at the Lo boost rectangle's
left edge**: the rectangle is dashed and its height changed, so the dash phase
moved. The third band is the J2 ground column (57.5–69.9 mm) and the Lo boost
group (158.5–198.3 mm). The fourth is the Hi cut group. **Nothing else on the
page moved.**

### Measurements taken from the rendered page rather than from the sheet

Every figure below is ink measured at 600 dpi, with a positive control that the
measuring window is otherwise empty:

| what | measured |
| --- | --- |
| the widest value on the board, `2200pF` | **6.858 mm** of ink |
| `.047uF`, same six characters | **6.223 mm** — the leading `.` is a narrow glyph |
| `.047uF` to its OWN plate | **0.994 mm** |
| `.047uF` to the NEXT capacitor's plate | **3.451 mm** |
| `2200pF` to its own plate / to the next plate | **0.63 / 3.18 mm** |
| `cut_wiper` text to R1's body | **3.56 mm** |
| `sel_common` text to the selector's pin-7 NUMBER | **3.13 mm** |
| `sel1` text to the selector's pin-1 number | **2.7 mm** |
| empty region inside the Hi cut rectangle, west of the bank | **18.0 × 10.0 mm, no ink** (x 74.6–92.6, y 97.8–107.8) |
| empty band along the bottom of the Hi cut rectangle | **4.1 mm × 220 mm**, one 0.34 mm descender in it |
| empty strip west of the wiper column | **5.9 × 34 mm** |

**The 15.24 mm capacitor pitch is derived from the first two of those numbers,
not copied from the hi-boost page** — `EVALUATING-DRAWINGS.md` P3 forbids taking
a reference's proportions, and the hi-boost run's own finding was that low-cut's
12.7 mm pitch was *measurably wrong* for a different part set. At 12.70 mm the
value would sit 1.0 mm from its own plate and **1.05 mm from the next one**; at
13.97 mm, 2.32 mm; at 15.24 mm, 3.45 mm. **That it lands on the same number as
hi-boost's is a coincidence of the two boards having six-character values, and
the measurement is what justifies it.**

---

## 8. Regions changed — the back-check

Per `EVALUATING-DRAWINGS.md` §8 these are the parts only one party has
considered. Before and after crops of each are committed at 300 dpi, **the same
box on both sides**.

1. **Hi cut, the whole group** — `crops/before-hi-cut-whole.png` /
   `crops/after-hi-cut-whole.png`. Thirteen parts re-placed and re-rotated, 54
   wires deleted and 21 added, 13 labels deleted and 10 added, 30 fields
   rewritten, the rectangle resized from 195.58 × 64.77 mm to 220.98 × 43.18 mm.
   **This is the largest changed region and the least-examined part of the page.**
2. **The bank, close in** — `crops/{before,after}-bank-left.png`, `-bank-mid`,
   `-bank-right`. **Every one of these ten parts had its Reference and Value
   rewritten**, which is the class invisible to every automated check.
   **Look at:** whether each value reads as belonging to the capacitor on its
   left (0.99 mm to its own plate, 3.45 mm to the next); and whether a ten-wide
   staircase reads as six contacts.
3. **The west chain** — `crops/{before,after}-west-chain.png`. The pot at
   rotation 180 with its wiper pointing west, the 430R, the selector moved
   7.62 mm east of its first placement, and three labels.
   **Look at:** whether the pot reads as sitting across the two rails with the
   wiper feeding the selector.
4. **The rail's east end** — `crops/{before,after}-rail-east.png`. The one
   `lo_boost_in` label the group keeps.
5. **Junction, J2** — `crops/{before,after}-junction-j2.png`. Five stacked
   ground symbols became one on a trunk; the `PWR_FLAG` moved onto a stub off it.
   **Look at:** whether one terminator at the bottom reads for all five pins, and
   whether J1's own ground 11.43 mm above should have been folded in.
6. **Junction, J1** — `crops/{before,after}-junction-j1.png`. The `PWR_FLAG`
   diamond was drawn inside the word `out`. **Look at:** whether the five J1
   labels now read.
7. **Lo boost** — `crops/{before,after}-lo-boost.png`. A duplicate label pair
   collapsed to a 17.78 mm wire, at the cost of moving SI5, its ground symbol
   and the rectangle. **This is a group nobody asked to have touched.**
8. **The whole stand-in band** — `crops/{before,after}-top-band.png`, so each
   group is seen beside its neighbours rather than on its own.

---

## 9. Where `TOOLING.md` was insufficient

Each of these is a place this run had to decide something the written process
does not answer, or a place a committed check was wrong.

**9.1 — A SHEET'S WIRES COME IN TWO TEXTUAL FORMS AND A REGEX THAT READS PAST
THE STROKE SILENTLY DROPS A THIRD OF THEM.** copperhead writes wires in the
pretty-printed block form and akcli writes them on one line. A pattern of the
shape `\(wire\s*\(pts …\) \(stroke \(width W\)…\)` **matched only the wires with
no `(color …)` in the stroke: 54 of 77 on this board.** The 23 it dropped are
every grey ground wire, **including all six of J2's pin stubs** — exactly the
wires a ground repair has to find. It printed 54 and said nothing. The fix is to
count `(wire` tokens, parse by block, and refuse if the two disagree;
`scripts/dump_sheet.py` and `scripts/make_repairs.py` both do. **Nothing in
`TOOLING.md` warns about this**, and the inherited `verify.py` happens to be safe
only because its pattern stops at the `pts`.

**9.2 — `akcli add_net_label` EMITS A GLOBAL LABEL AS `(shape input)`, NOT
`(shape passive)`.** copperhead writes every one of its global labels as
`passive`, which KiCad draws as a plain rectangular tag; `input` draws an
arrow-pointed one. Two new `input`-shaped global labels beside nine `passive`
ones is a visible inconsistency **that no check here reports**. akcli also omits
`(fields_autoplaced yes)` and the hidden `Intersheetrefs` property every
copperhead global label carries. `TOOLING.md` records akcli's styling gaps for
stroke width and label thickness only; this is a third and it changes a drawn
shape rather than a line weight.

**9.3 — THERE IS NO akcli OP FOR A GROUP RECTANGLE, AND `TOOLING.md` DOES NOT
LIST IT** among the things that must be literal edits (it lists stroke, label
thickness, field position and label moves). Two rectangles had to be resized
here — Hi cut from 195.58 × 64.77 to 220.98 × 43.18 mm, Lo boost 5.08 mm taller.
The hi-boost run did one and recorded it only inside its own script.

**9.4 — LABEL SCOPE CHANGES THE EXPORTED NET NAME, again.** `cut_wiper` arrived
as two *global* labels; collapsing the pair leaves one label on a two-pin net
inside one group, where a global tag asserts an off-sheet reference that does
not exist. Made local, the net exports as `/cut_wiper`. **One net renamed, and
the verification set asks for names to match.** Reported rather than hidden: the
pin sets are identical and one name differs by a `/`. This is the hi-boost
run's §9.10 recurring, and nothing has been written to settle it.

**9.5 — NOTHING SAYS THE COLLAPSE PASS REACHES INTO A GROUP THE REVIEWER HAS
NOT COMPLAINED ABOUT, OR HOW FAR ITS CONSEQUENCES MAY PROPAGATE.** The
`lo_boost_in` duplicate pair in **Lo boost** is as much a duplicate as the ones
in the own section, and the rule admits no test — so it was collapsed. Doing it
moved SI5 7.62 mm, moved `#PWR07`, moved a `GND` text that had followed it out
of its own rectangle, and grew that rectangle by 5.08 mm. **A one-label rule
produced a five-part change in a group that was not the subject of the run.**
The three candidate corrections and their costs are in §4 so the choice can be
disputed.

**9.6 — `junction_audit.py` CANNOT DISTINGUISH A TEE-WITHOUT-A-DOT FROM TWO
OVERLAPPING COLLINEAR WIRES.** It reported **2 wire-to-wire tees with no dot on
the baseline**, which `TOOLING.md` describes as *"a real connectivity defect
rather than a cosmetic one"*. Both are copperhead writing a short vertical
**wholly inside a longer collinear vertical on the same net**
(`(161.29,129.54)-(161.29,123.19)` inside `(161.29,139.7)-(161.29,123.19)`), so
the stub's endpoint coincides with the short wire's endpoint and the net is
connected without a dot. **Not a defect — a check limitation**, and the
overlapping pair is itself a drawing artefact worth knowing copperhead produces.
The corollary: a tee-without-a-dot report needs a collinear-overlap test before
it can be read as a connectivity finding.

**9.7 — `boxgeom.py`'s EXTREME-POINT ATTRIBUTION IS WRONG ON THIS SHEET.** It
names `SW1` as the bottom-most and top-most item inside the **Lo boost** and
**Mid** rectangles, where no `SW1` exists — SW1 is 50 mm below, in Hi cut — and
reports a bottom margin of **0.00 mm** for Lo boost where the render shows
2.5 mm of unoccupied space. Its Hi cut margins agree with hand calculation to the
micrometre (left 6.35 = 57.15 − 50.8, top 7.62 = 96.52 − 88.9, right 17.78 →
254.0, bottom 8.89 → 123.19), so **the aggregate min/max is right where it was
checked and the per-point naming is not.** `TOOLING.md` cites `boxgeom.py`
without qualification.

**9.8 — `pixeldiff.py` REPORTS ROW BANDS AND COLUMN BANDS INDEPENDENTLY**, so
when one changed group spans the page width the column band is the whole page
and the small row bands are left unlocalised. Here it reported one column band
of 50.55–271.91 mm against four row bands, which describes the Hi cut group and
says nothing about the two 2 mm bands 60 mm above it. `scripts/pixelbands.py`
reports the columns **within** each row band, which localised them to a 0.38 mm
column at one rectangle's edge. This is the hi-boost lesson — *report bands, not
a bounding box* — applied one level further in.

**9.9 — `TOOLING.md` ASKS FOR A GROUP'S FLOW BUT GIVES NO WAY TO STATE IT FOR A
GROUP WITH NO THROUGH-PATH.** *"Look at a group's flow before repairing anything
else in it, and report where the input enters, where the output leaves and which
way each points."* Four of this board's six groups have no series path at all: a
connector has no through-path, and `Mid`, `Lo boost` and the own section are
shunts. §6 answers it for the **chain** inside each group instead, and says so.

**9.10 — THE CAPACITOR PITCH HAS A METHOD NOW, AND CHARACTER COUNT IS NOT IT.**
`TOOLING.md` records hi-boost's 12.7 → 15.24 mm change and the two gaps either
side of it, but no way to arrive at a pitch on a new board. `scripts/textwidth.py`
measures the rendered ink of the widest value with a positive control. The
finding that would not have come out of a formula: **`2200pF` draws 6.858 mm
while `.047uF` draws 6.223 mm at the same six characters**, because the leading
`.` is a narrow glyph — so the widest value on this board is a digit string, not
one of the `.0xxuF` ones, and its gap to its own plate is **0.63 mm** rather
than the 1.0 mm the six-character case gives.

**9.11 — `akcli check --layout` REPORTED ZERO FINDINGS ON A PAGE WHOSE
`sel_common` LABEL RAN OVER THE SELECTOR'S OWN PIN-7 NUMBER.** The first
placement put the label's text across the `7`; the lint reported **0 findings**
on that sheet. It was found by looking at a 300 dpi crop and fixed by moving R1
3.81 mm and SW1 7.62 mm east, after which the measured separation is 3.13 mm.
**One more instance of `TOOLING.md`'s trap 6: run the lint; do not believe it.**
On the baseline the same lint found 8 real-enough findings, including the
`out`/`#FLG01` collision — so it is not useless, it is partial.

**9.12 — THE akcli VENV PATH IS NOT STATED AND THE TWO COMMITTED `run.sh`
SCRIPTS DISAGREE.** The hi-boost run uses `$SCRATCHPAD/hybrid-pass-1/venv-akcli`
and the hairpin-fix run uses `$SCRATCHPAD/venv-akcli`. `pixeldiff.py` needs
`numpy` and `pillow` **installed into that venv**, which only a docstring
mentions; this run had to install them. `run.sh` here installs all three when
the venv is absent.

**9.13 — "LOOK AT THE RENDER" NEEDED TWO ROUNDS AND THE LOOP AS WRITTEN HAS
ONE.** The first repaired sheet was complete, netlist-identical, reported no lint
findings, and
carried two text proximities a crop showed and no check did. The loop actually
run was: verify intent, draft nine, look at nine, repair, restyle, render, look,
**re-place two parts and the whole bank 3.81–7.62 mm east, re-render, look
again**, measure. `TOOLING.md` already says *"write the loop you actually ran"*;
this is the fourth run in a row that needed more than one revise step.

---

## 10. What was NOT done, stated plainly

- **The whole Hi cut arrangement is agent-authored and nobody has reviewed it.**
  Thirteen parts placed, a 193 mm rail, six runs and ten risers. The
  no-crossing property is proved; the *reading* of it is established by nothing.
- **Three empty regions inside the Hi cut rectangle are not closed**: 18.0 ×
  10.0 mm west of the bank, a 4.1 mm × 220 mm band along the bottom, and a
  5.9 × 34 mm strip west of the wiper column. Closing any of them means moving
  the pot, the 430R or the selector, which is an arrangement change nobody has
  reviewed.
- **`#PWR01`, J1's ground, is unchanged** — the same symbol all three previous
  pages put up for overruling, still unruled.
- **`#FLG01` is still on the page**, moved and not deleted, and earns nothing.
- **The `out` global label in the Junction group still sits against J1's pin-4
  number**, as it does on both accepted pages. Not touched.
- **One net changed name** (`cut_wiper` → `/cut_wiper`), deliberately, so the
  netlist does not match the baseline on names.
- **The five ERC `lib_symbol_issues` warnings are not suppressed.** Errors are 0.
- **`2200pF` sits 0.63 mm from its own plate** — the smallest text-to-graphic gap
  on the page. Measured, reported, not changed: widening the field offset to
  close it would narrow the 3.18 mm gap to the next capacitor by the same
  amount, and which way that trade should go is not an agent's call.
- **The capacitor values are centred on their anchors, not left-justified.** A
  left-justified field would give every value the same gap to its own plate
  regardless of how wide the text is; that is a 20-field change to the effects
  blocks and was not made.
- **No second akcli pass was run.** The second round of changes went through the
  same op-list re-derived from the committed baseline, which is what makes
  `run.sh` idempotent.
- **`boxgeom.py` was not fixed**, only characterised (§9.7).
- **No SPICE run, no board layout, no BOM.** Out of scope, and a fully specified
  BOM does not bind a schematic (`CLAUDE.md`).

---

## 11. Repeatability — the summary this run was for

| repair class | low-boost | low-cut | hi-boost | **hi-cut** |
| --- | --- | --- | --- | --- |
| multiple ground symbols where one serves | yes (J2, 5→1) | yes (J2, 5→1) | yes (J2, 5→1) | **yes (J2, 5→1)** |
| label where a wire belongs | yes (27 mm) | yes (21.85, 63.96 mm) | yes (4 nets, 10 labels) | **yes (2 nets, 5 labels, in TWO groups)** |
| ground or part oriented so a wire doubles back | yes (RV1) | checked, none | checked, none | **checked, none** |
| part placement forcing a long crooked run | yes (SI8) | yes (bank, 7 parts) | yes (bank + coils, 13 parts) | **yes (bank, 13 parts)** |
| `PWR_FLAG` placed over another device | no | yes | yes, on `#PWR01`'s coordinates | **yes, on `#PWR01`'s coordinates again** |
| field offsets tuned to the superseded layout | not reached | yes, twice | yes, 26 fields + the ANGLE | **yes, 30 fields + the ANGLE** |
| orphan junction dots left by a deletion | not reached | yes, 4 then 7 | checked, none | **checked, none** |

**All seven classes recurred or were ruled absent by measurement, on a board
that is a near-sibling of one already accepted. No new repair class appeared** —
the second board in a row with none. What this run produced instead is **thirteen
corrections and gaps in the written procedure** (§9), of which three are defects
in committed checks (`boxgeom.py`, `junction_audit.py`, the wire regex) and two
are akcli behaviours nothing had recorded (`(shape input)`, no rectangle op).

**What a fourth board does NOT establish.** It does not establish that the repair
set is complete, and it does not establish anything at all about the drawing: the
page is unreviewed, and `EVALUATING-DRAWINGS.md` §5 is explicit that no check
passing and no absence of findings advances its status.
