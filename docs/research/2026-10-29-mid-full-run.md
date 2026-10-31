pultec-mid: a full run of the drafting loop, fifth and last section board
=========================================================================

**What this is.** `TOOLING.md` §0–6 applied to `pultec-mid`, the fifth Pultec
section board and the one the other four carry stand-ins for. The page, its
crops and every check are committed in
`docs/research/2026-10-29-mid-full-run/`.

**The page is UNREVIEWED.** `EVALUATING-DRAWINGS.md` §1: a drawing has no
quality until a qualified reviewer says so, and the agent that produced one is
never a qualified reviewer of it. Nothing below assesses the drawing; everything
below is an observation or a measurement another reader can check.

- **Sheet** `docs/research/2026-10-29-mid-full-run/mid-hybrid.kicad_sch`
- **sha256** `1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8`
- **PDF / PNG / SVG** `mid-hybrid.pdf`, `.png`, `.svg` beside it
- **Baseline** `baseline-copperhead-v1-blocks-own-last.kicad_sch`,
  sha256 `3aa967a361a726d4ac312abb08d8a34da0b25ccaa60bbf8d3982941a62c10044`
- **Reproduce** `SCRATCHPAD=<dir> sh docs/research/2026-10-29-mid-full-run/run.sh`

**`run.sh` is idempotent and that was checked rather than asserted:** run a
second time from the committed baseline it re-derives the sheet
**byte-identically** (same sha256), the PNG **pixel-identically**
(`magick compare -metric AE` = 0), and the SVG differing in **two lines** — its
own generation timestamp. The PDF differs because it embeds `/CreationDate`,
which is why `TOOLING.md` says a PDF cannot serve as a binding.

---

## 0. Authority, and the toolchain as it was actually run

The Pultec is an imported design, so **the schematic is authoritative and the
model was derived from a netlist export** (`CLAUDE.md`). Nothing under
`circuits/` or `lib/` was edited by this run; the only thing read out of the
model is the generated sheet
`build/schgen-boards/pultec-mid/pultec-mid.kicad_sch`, which the intent is
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
| node / npx / tsx | `v22.19.0` / `tsx 4.23.1` |
| Python | `3.14.6`, with `numpy 2.5.4` and `pillow 13.0.0` in the akcli venv |

Both tools were already in this session's scratchpad, so this run did not have
to reinstall them — **which is luck, not pinning.** The standing risk
`TOOLING.md` records is unchanged. **The venv path is a third value**: the
hi-boost run expects `$SCRATCHPAD/hybrid-pass-1/venv-akcli`, the hairpin-fix run
`$SCRATCHPAD/venv-akcli`, and on this machine `$SCRATCHPAD/venv-akcli` is a
path into `hybrid-pass-1`'s tree. `run.sh` here creates its own if absent.

---

## 1. The circuit, and the intent

`circuits/pultec/schematic/mid.ts` is four lines; all five Pultec section boards
go through `sectionAuthoring()` in `section-board.ts`.
`bun tools/schgen/board-sheets.ts` reports the board **usable with 12 fallback
field placements**, the most of any board — and `pultec-mid` now draws at all,
which it did not until the `ncPins` work earlier today
(`docs/research/2026-10-29-mid-pin12-nc.md`).

**39 parts, 28 nets** plus one unconnected pin. The own section holds 28 of the
39 — **the largest own group of the five boards.** Nine stand-in parts cover the
four absent sections and two 1x05 headers are the junction bus. **Stand-in
semantics, stated because they have been got backwards before: a mid board
carries stand-ins for the sections NOT in the build** — here `hi-boost`
(SI1, SI2), `hi-cut` (SI3–SI6), `low-cut` (SI7) and `low-boost` (SI8, SI9).

**The circuit's shape.** The mid section is a variable-depth SHUNT off
`hi_boost_out`, not a series block:

```
hi_boost_out -[RV1 47K rheostat]- pole -[SW1 1-of-11]- throw k
   - cap(s) - one of five winding taps - [L] - coil_return
   - [SW2 boost/off/cut] - 4K7 to `in` | 1K to GND | open
```

plus `R3` 100K across `in` to ground. The mode switch's centre position opens
the coil's return entirely, which takes the whole section out of circuit; its
contact list in the model is deliberately empty.

**The two structural facts the whole arrangement turns on**, both read off
`MID_POSITIONS` in `circuits/pultec/electrical/mid.ts` (transcribed from
P3bandDoc.pdf p3):

| contact | capacitors | tap |
| --- | --- | --- |
| 1 (200 Hz) | C1 `.33uF` | 2H |
| 2 (300 Hz) | C2 `.15uF` | 2H |
| 3 (500 Hz) | C3 `.047uF` | 2H |
| 4 (700 Hz) | C4 `.022uF` ∥ C5 `3300pF` | 2H |
| 5 (1 kHz) | C6 `.022uF` ∥ C7 `3300pF` | 1H |
| 6 (1k5 Hz) | C8 `.012uF` | 1H |
| 7 (2 kHz) | C9 `.012uF` ∥ C10 `2200pF` | 0R45H |
| 8 (3 kHz) | C11 `4700pF` ∥ C12 `1500pF` | 0R45H |
| 9 (4 kHz) | C13 `4700pF` ∥ C14 `2200pF` | 0R22H |
| 10 (5 kHz) | C15 `4700pF` | 0R22H |
| 11 (7 kHz) | C16 `2200pF` ∥ C17 `1000pF` | 0R1H |

1. **the seventeen capacitors are already in contact order in their
   designators**, and
2. **the five tap groups are CONTIGUOUS in contact order**, so the five tap
   buses do not overlap in x and can sit at one y.

**Net names.** 24 of the 28 arrive from the KiCad export as `Net-(C1-Pad1)`;
the model's own names are good (`mid_sel_200hz`, `mid_tap_2h`,
`mid_coil_return`, `mid_boost_return`, `mid_cut_return`, `mid_sel_common`) and
were used with the `mid_` prefix stripped, which is what the own section's nets
are called on the four accepted pages. The three auto-derived stand-in nodes
(`si_hi_boost_j20_p3`, `si_hi_cut_j4_p2`, `si_hi_cut_j12_p3`) took the names the
accepted low-cut and hi-boost pages give the same nodes: `hi_tap`, `hcut_t2`,
`hcut_t1`.

**Choice recorded so it can be disputed:** the eleven contacts are `sel1`…`sel11`
rather than `sel_200hz`…`sel_7khz`. Two of the four accepted pages use `selN`;
low-cut uses `cN_sel`. The frequency survives on the page only through the
switch pin number, which is what the contact table above ties it to.

**The intent was verified before drafting**, with
`scripts/intent_vs_model.py` copied from the hi-cut run:

```
noConnect in intent: ['SW1.12']
unconnected pins in model: ['SW1.12']
noConnect == unconnected: True
PARTITION (pin sets, names ignored): IDENTICAL
```

with a **positive control** — one pin moved into `sel10` in a copy of the intent
makes the same comparator exit 1 and name both sides of the difference.

---

## 2. Draft — eleven group configurations, every one rendered and looked at

`draft.py` (adapted from the hi-cut run's) writes eleven group assignments,
group orders and paper hints out as literals and renders each. The own section
has **three** internal seams rather than hi-cut's one — the bank, the winding
row and the return network — so the splits cut at them.

**The measured result:**

| variants | true crossings | sheet copperhead chose |
| --- | --- | --- |
| the five that keep the own section whole (v1–v5) | **24** in every one | A3, ink 26% |
| the four that split it in two or three (v6–v9) | **5** in every one | A4, ink 18–45% |
| v1 with the paper pinned to A3 / A2 (v10, v11) | **24** | A3 / A2, ink 26% / **11%** |

**This board reproduces the hi-boost direction and contradicts hi-cut's.** On
hi-boost the splits measured 2 against 8; on hi-cut 11 against 8; here 5 against
24. So the trade `TOOLING.md` calls *"the largest undocumented decision in the
loop"* **exists on this board and is large** — 19 crossings.

**`v1-blocks-own-last` was taken anyway, and here is what that bought and
cost.** Cost: 19 of copperhead's crossings. Bought: the own section stays ONE
headed box, which is the arrangement of all four accepted pages and the ground on
which the low-cut run rejected its merged variants; and the five `tap_*` nets
stay inside one group rather than becoming five cross-group label pairs (v7 put
`coil_return` twice inside `Mid coil`, a duplicate pair the collapse rule would
then have had to reach). **The 24 crossings are moot in any case: every one of
them is inside the Mid rectangle, and every part in it was re-placed** — so the
number the trade was argued over does not survive the repair. That is the part
worth carrying to the next board: *measure the trade on the group you are going
to KEEP, not on the one you are going to redraw.*

**A2 was tried and rejected on a measurement, not a feeling:** pinned to A2 the
same arrangement reports **11% ink** and leaves the top ~40% and bottom ~45% of
the sheet with nothing on them. A3 was copperhead's own choice at 26%.

---

## 3. The repair, in one akcli pass and one text pass

**384 akcli ops** (`repairs.json`, reasons by op index in
`repairs.notes.txt`), dry-run with `akcli plan --ops` first. Its net diff, in
full:

```
# connectivity (0)
  (clean)
Net changes:
  ~ GND: -#PWR02.1 -#PWR03.1 -#PWR04.1 (+2 more) (19->14 pins)
```

— the five deleted ground symbols and nothing else.

**`--apply` was proved by sha, not by exit code** (`TOOLING.md` trap 1):

```
sha before apply: 3aa967a361a726d4ac312abb08d8a34da0b25ccaa60bbf8d3982941a62c10044
sha after apply:  f1e76830b83eb4ff84f8bc84676e080188d8a49c5afc37eaefc9c28bad0578e9
```

Then **165 literal text edits** (`scripts/restyle.py`) for the four things akcli
0.22.0 cannot do.

### Repair 1 — the Mid group, re-authored. **24 true crossings → 0.**

All 28 parts move, so nothing copperhead drew in it was kept.
**The arrangement is agent-authored and nobody has reviewed it.** It is the same
shape as the ACCEPTED `pultec-hi-boost` page, which is this board's structural
twin — capacitors in contact order staircased to their contacts, tap buses
above, windings above those, one rail along the top — with every proportion
measured for this part set rather than copied (§7).

- **`coil_return`**, `y = 118.11`, from `x = 158.75` (L1) to `x = 359.41`
  (SW2's pole) — **200.66 mm**, six pins drawn once.
- **Five winding sections** at rotation 180, `y = 124.46`, each above the x-span
  of the capacitors on its tap, each dropping onto its own bus **between** two
  risers rather than on one.
- **Five tap buses at ONE y** (`134.62`), 15.24 / 30.48 / 30.48 / 45.72 /
  60.96 mm, **182.88 mm total** — they do not overlap in x because the tap
  groups are contiguous in contact order.
- **Seventeen capacitors**, rotation 0, **x strictly ascending in contact number
  at a 15.24 mm pitch**, each at the y of its own contact, so the bank
  descends 2.54 mm per contact across 28 mm. Risers 5.08 to 33.02 mm.
- **Eleven selector runs**, one per contact, **each a single straight
  horizontal with no corner**: 20.32, 35.56, 50.8, 81.28, 111.76, 127.0, 157.48,
  187.96, 218.44, 233.68 and **264.16 mm** — 1488.44 mm in total, and the longest
  wire in this record.
- **The west chain**: the 47K rheostat at rotation 90 with its input entering
  from the west, its wiper tied over the body to pin 3, and 15.24 mm east to the
  selector pole.
- **The return block** east of the rail: the mode switch's pole on the rail's
  east end, the boost leg east through the 4K7 to `in`, the cut leg down through
  the 1K, and the input shunt beside it.

**Why no crossing is possible in that arrangement, proved pairwise before it was
drawn and re-measured after.** A capacitor's riser climbs from its own head to
its tap bus, which is above everything; a selector run is horizontal at its own
contact's y and **stops at the last capacitor on that contact**. For a riser or
a tail at `x_i` (contact `i`) to cross the run of contact `j`, that run's y must
lie between, i.e. `j < i`; and with x ascending in contact number every
capacitor of contact `j < i` lies west of `x_i`, so that run ends west of the
riser. The five tap buses are disjoint in x, so nothing crosses them either.
Measured after: `true wire crossings 0 []`.

### Repair 2 — J2's five stacked ground symbols → one. **FIFTH board, same geometry.**

`#PWR02`–`#PWR06` sat at `x = 72.39`, `y = 83.82 … 93.98`, **2.54 mm apart** —
one per J2 pin, the owner's *"stacked on top of each other"* case. Four deleted,
`#PWR06` kept at `(72.39, 93.98)` as the single terminator (copperhead's GND
draws its triangle 2.54 mm in the sheet's +y direction from its pin, so a
terminator at the top of a downward trunk would draw its body over the trunk),
one 10.16 mm vertical trunk added with four junction dots on it, the five
existing pin stubs untouched.

### Repair 3 — `PWR_FLAG` drawn on `#PWR01`'s exact coordinates. **FOURTH board.**

copperhead synthesised `#FLG01` at **`(72.39, 72.39)` — the same coordinates as
`#PWR01`**, J1's ground, which is what happened on low-cut, hi-boost and hi-cut.
`akcli check --layout` named it (`LAYOUT_LABEL_OVER_SYMBOL label 'out' … runs
over #FLG01`). Moved to `(67.31, 88.90)` on a 5.08 mm stub off the new J2 trunk;
moved rather than deleted, per the owner's low-boost instruction. The `out`
label was not touched.

### Repair 4 — ten duplicate on-page label groups, in THREE groups. **10 → 0.**

**Collapsed without reasoning about it**, per `EVALUATING-DRAWINGS.md`.

| group | net | labels before | how it collapsed |
| --- | --- | --- | --- |
| **Mid** (own) | `coil_return`, `sel_common`, `tap_2h`, `tap_1h`, `tap_0r45h`, `tap_0r22h`, `tap_0r1h` | 2, 2, 2, 3, 4, 3, 3 | all drawn as wires by the re-authoring |
| **Hi boost** stand-in | `hi_tap` | 2 | SI2 turned horizontal (rotation 90) so SI1's pin and SI2's meet on one straight 6.35 mm wire |
| **Hi cut** stand-in | `hcut_t2`, `lo_boost_in` | 3, 2 | the four parts re-laid as a two-row loop (§4) |

**Two of the three groups are stand-ins nobody has commented on.** The rule
admits no test, so they were collapsed; §4 records the Hi cut corrections that
were NOT taken beside the one that was.

### Repair 5 — field offsets and the field ANGLE. **SAME CLASS, and this board shows it in BOTH directions at once.**

`move_component` carried every moved part's field offsets and angles from the
arrangement the move destroyed. **36 of this board's fields rendered VERTICAL
after the ops**, and they split two ways:

| parts | rotation change | carried angle | renders |
| --- | --- | --- | --- |
| twelve capacitors, L1 | 270 → 0, 90 → 180 | `90` | vertical |
| RV1, SI2, SI3, SI4, SI5, SI6 | 0 → 90 / 0 → 270 | `0` | vertical |

**`TOOLING.md`'s one-directional wording is wrong in exactly the way it warns
about**, and this is the first board to show both halves on one page. The rule
is `(symbol rotation + field angle) mod 180 == 0`, nothing simpler.
`scripts/restyle.py` restates **44 parts' fields** as literals: the seventeen
capacitors take their text 6.35 mm to the right of the symbol, one line above and
one below the midline — one offset for seventeen parts instead of copperhead's
seventeen — and the five windings take theirs 6.35 mm to the **left**, because
the eastmost one's text would otherwise reach the mode switch's body.
`scripts/symbols.py` reports `fields that render VERTICAL: 0` after.

### Repair 6 — the two return legs' ground symbols → one.

The first pass gave the boost leg's shunt and the cut leg's resistor a ground
symbol each, 19.7 mm apart. They were merged onto one 15.24 mm link with a
single symbol and a junction, which is the owner's low-boost instruction
(*"we dont need five discrete ground symbols here. one will suffice if all the
wires connect."*) applied without being asked. Ground symbols on the page:
**9 → 4** (`#PWR01` at J1, `#PWR06` on the J2 trunk, `#PWR07` on the return
legs' link, `#PWR09` in the Lo boost stand-in).

### Repair 7 — label SCOPE, which the first render refuted.

The first pass kept copperhead's scopes on the ground that a scope change
renames a net. **The render refuted it.** A global label is drawn as a TAG - a
box around the text - and KiCad draws the wire straight through it:

- `sel_common`'s tag covered the rheostat's wiper **pin number** and its tie;
- `hi_tap`'s tag covered SI1's pin stub;
- `hcut_t2`'s tag sat on the wire it names, with the wire through the middle.

Seven nets that are **wholly inside one group** were made local, which is plain
text above the wire: `sel_common`, `hi_tap`, `hcut_t2` and the four `tap_*`
labels copperhead had written global. The five `tap_*` labels are now
consistent, where copperhead had four global and `tap_0r22h` local. The price is
in the verification table: **7 of 29 net names gained a leading `/`.**

### Repair 8 — orphan junction dots. **CLASS CHECKED, no instance — after a CHECK was fixed.**

131 wires and 11 junctions were deleted here, so the class had every
opportunity. `junction_audit.py` reported **1 orphan** at the shared ground
symbol — and that report was false; see §9.1.

---

## 4. The Hi cut stand-in, which the label rule reached into, and the corrections NOT taken

`hcut_t2` had three labels and `lo_boost_in` two, inside a group nobody has
commented on. The cause is structural: the sub-network is a LOOP —
`hi_boost_out`–SI5–t2–SI6–`lo_boost_in` across the top and t2–SI4–t1–SI3 back to
`lo_boost_in` — and copperhead drew all four parts in one vertical row, where
two spanning nets cannot both be a wire.

Three corrections were worked out and the chosen one is recorded with the two
that were not:

| correction | what it costs | what it leaves |
| --- | --- | --- |
| rotate SI5 by 180° alone | nothing moves | collapses `hcut_t2` to one 35.56 mm wire, but leaves `lo_boost_in` still two labels and puts the input at SI5's bottom |
| rotate SI4/SI6 and wrap `lo_boost_in` round the group | no part moves | an 83.82 mm four-corner run around the outside — *"long, crooked runs need a reason"* |
| **re-lay as a two-row loop** (taken) | all four parts move and turn; the group's wires fall from 7 to 5 | `hi_boost_out` in at the west, `lo_boost_in` out at the east pointing right, 48.26 mm of wire, **0 crossings**, both duplicates gone |

The third was taken because `EVALUATING-DRAWINGS.md` §8 asks what else a
correction fixes: it collapses **both** duplicates and leaves the group reading
left to right on both rows. `crops/before-hi-cut.png` / `crops/after-hi-cut.png`.

**The Lo cut and Lo boost stand-ins were checked and deliberately left alone** —
neither carries a duplicate label and nothing in them was the subject of this
run.

---

## 5. What each surviving device earns

`EVALUATING-DRAWINGS.md` P1: *a device is noise unless it is earning its place,
and the draughtsman must be able to say what work.*

**Ground symbols — 4, down from 9** (`power-after.txt` lists each with the wire
entering its pin):

| symbol | what it earns |
| --- | --- |
| `#PWR06` (J2) | one symbol for five pins that now meet on a 10.16 mm trunk |
| `#PWR07` (the Mid return legs) | one symbol for the 1K's and the 100K's returns, on a 15.24 mm link between them |
| `#PWR09` (SI9, Lo boost) | the only ground in its group; untouched by this run |
| `#PWR01` (J1.5) | **the weakest of the four, and the same symbol all four accepted pages have now put up for overruling.** It is 11.43 mm above the J2 trunk on the same column. He has not ruled on it |

**`#FLG01` earns nothing on the drawing** — it is an ERC annotation. It is on the
page because the owner said to leave low-boost's in place, not because this pass
can defend it.

**Hairpins: none, checked rather than assumed.** `scripts/pwr_survey.py` lists
every power symbol with the wire entering its pin; in every case the triangle
continues away from the part. The one device of that shape on the page is the
rheostat's **tie** — the wiper goes up 2.54 mm, east 6.35 mm and down 6.35 mm
onto the pole wire. It is a bracket over the body rather than a fold back along
the wire it came from, it is the conventional way to draw a rheostat, and it is
reported here rather than defended.

**Labels — 14 global, 23 local, down from 34 and 19. Duplicates inside one
group: 10 → 0.** The four nets still carrying more than one label carry them in
**different groups, one per group**:

| net | labels | groups |
| --- | --- | --- |
| `hi_boost_out` | 5 | Junction, Hi boost, Hi cut, Lo cut, Mid |
| `in` | 3 | Junction, Hi boost, Mid |
| `lo_boost_in` | 3 | Junction, Hi cut, Lo boost |
| `out` | 3 | Junction, Lo cut, Lo boost |

**That "one per group" reading is a precedent, not a rule**, and `TOOLING.md`
already flags it as such. An agent must not promote it.

**The 20 single labels inside the Mid group** — eleven contacts, five winding
taps, the pole node, the coil return and the two mode-switch legs — each name a
node a reader of an eleven-position selector has to find. Each appears once.
That is naming rather than duplication, and it is stated so it can be disputed.

**Long runs.** Eight wires are over 100 mm and each is stated rather than buried:

| wire | length | what it is |
| --- | --- | --- |
| `sel11` run | **264.16 mm** | contact 11 to C17, the far end of a seventeen-wide bank |
| `sel10` run | 233.68 mm | contact 10 to C15 |
| `sel9` run | 218.44 mm | contact 9 to C13 ∥ C14 |
| the `coil_return` rail | 200.66 mm | one 6-pin net drawn once |
| `sel8` run | 187.96 mm | contact 8 to C11 ∥ C12 |
| `sel7`, `sel6`, `sel5` runs | 157.48, 127.0, 111.76 mm | contacts 7, 6, 5 |

The eleven selector runs total **1488.44 mm** and are the fan-out of a 1-of-11
selector to seventeen capacitors — the same structure low-cut was accepted with
at 29–80 mm for seven capacitors, hi-boost at 20–142 mm for nine, and hi-cut at
24–146 mm for ten. **These are 20–264 mm, because this bank is seventeen
capacitors wide.** Total wire length went from 2404.11 mm to 2505.71 mm — a 4%
rise for a page with 67 fewer wires on it.

---

## 6. The per-group signal-flow observation

**Reported as an observation, not as a check.** `S1` is a style preference:
followed where it fits, never enforced, never a reason to withhold or delay a
page. No threshold is invented here and no group is scored.

| group | where the input enters | where the output leaves | which way each points |
| --- | --- | --- | --- |
| **Mid** (own) | `hi_boost_out` at `(41.91, 162.56)`, far west, tag pointing right into RV1's ccw pin | `in` at `(392.43, 115.57)`, at the 4K7's east pin, tag pointing right | left to right across 350 mm; the return leaves **above** the input, because the coil rail is at the top of the group and the selector fan at the bottom |
| **Junction** | four labels on the west, on J1 pins 1–4 | the connector body is east of them | a connector has no through-path; the labels read left-to-right into the pins |
| **Hi boost** stand-in | `in` at SI1's top `(99.06, 59.69)` | `hi_boost_out` at SI2's east pin `(116.84, 69.85)`, pointing right | top to bottom, then left to right; the output points right |
| **Hi cut** stand-in | `hi_boost_out` at SI5's west pin `(158.75, 62.23)`, pointing into the wire | `lo_boost_in` at `(200.66, 71.12)`, pointing right | left to right on both rows; the output leaves 8.89 mm below the input, on the lower row |
| **Lo cut** stand-in | `hi_boost_out` at SI7's top `(236.22, 59.69)` | `out` at SI7's bottom `(236.22, 72.39)`, pointing right | top to bottom; the output points right but sits below the input |
| **Lo boost** stand-in | `out` at SI8's top `(278.13, 59.69)` | `lo_boost_in` at SI8's bottom `(278.13, 77.47)`; SI9 shunts down to ground | top to bottom and left to right |

**The own section is a SHUNT and so are three of the five stand-ins**, so
"where the output leaves" has no answer in the sense `S1` means it: the mid
network hangs off `hi_boost_out` and returns to `in` or to ground rather than
passing a signal through. What the row above reports for `Mid` is the flow of
the **chain** inside the group, which is the working answer `TOOLING.md` records
for `pultec-hi-cut` and still the only one written down.

---

## 7. Verification — before and after, every number re-measured

Baseline is `v1-blocks-own-last` as drafted; final is the repaired sheet.
**Both were rendered from the SAME FILE NAME in two sibling directories with
identical project files, by the same KiCad**, with `intersheets_ref_show` forced
off on both — and it worked: the pixel diff shows **no title-block band**.

| measure | baseline | final |
| --- | --- | --- |
| netlist nets / components | 29 / 39 | 29 / 39 |
| netlist net **pin sets** vs the model's generated sheet | **IDENTICAL** | **IDENTICAL** — through `lib/kicad/netlist.ts`'s own `importNetlist`, with a positive control that the comparator fails when a wire is struck out |
| netlist net **names** | — | **7 of 29 changed**: a leading `/` on the seven group-internal nets made local (§3, repair 7) |
| ERC **errors** | **0** | **0** |
| ERC warnings | 10 | 5 — all `lib_symbol_issues` on `copperhead_power` |
| parenthesis depth, final / lowest | 0 / 0 | **0 / 0** |
| NUL bytes / CR bytes | 0 / 0 (control: 4446 LF) | **0 / 0** (control: 3496 LF) |
| **true wire crossings** | **24** | **0** |
| wire-to-wire tees | 1 — **not carrying a dot** (§9.2) | 21 — **all 21 carry a dot** |
| pins on a wire interior | 0 | 7 — **all 7 carry a dot** |
| junction dots | 11 | 29 |
| **orphan junction dots** | 0 of 11 | **0 of 29** (§9.1) |
| **duplicate on-page labels in one group** | **10** | **0** |
| global labels / local labels | 34 / 19 | 14 / 23 |
| wires | 149 | 82 |
| total wire length | 2404.11 mm | 2505.71 mm |
| longest wire | 215.90 mm | 264.16 mm |
| symbols placed | 49 | 44 |
| symbol pin instances / lib-resolved | 107 / 107 | 102 / 102 |
| group rectangles | 6 | 6 |
| ground symbols | 9 | 4 |
| per-net wire-stroke clusters with mixed stroke | — | **0** (82 of 82 wires parsed) |
| wires written at `(width 0)` | 0 | **0** — control: setting ONE WIRE's stroke to 0 makes the counter read 1 |
| `akcli check --layout` findings | 12 | **3** (§9.3) |
| band `(115.0, 133.35)-(376.0, 154.94)` wires / pins | 11 / 9 | 31 / 13 (control: 149 and 82 whole-sheet wires) |
| **sha256** | `3aa967a3…c10044` | `1f8de321…344ff8` |

**The exact ERC invocation**, because an unreproducible zero is indistinguishable
from a check that was never run:

```
kicad-cli sch erc --exit-code-violations -o <out.rpt> <sheet.kicad_sch>
```

run with the sheet named `pultec-mid.kicad_sch` in a directory holding its own
`pultec-mid.kicad_pro` and `sym-lib-table`. Errors **0** both sides; warnings
**10 → 5**, every one `lib_symbol_issues` on `copperhead_power:GND` and
`copperhead_power:PWR_FLAG`, which copperhead embeds in the sheet and no
`sym-lib-table` declares. **The control is what makes this a reading rather than
a difference between boards:** the same recipe run against the committed,
ACCEPTED `docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch`
reports **0 errors and the same 5 warnings**
(`reports/erc-control-low-cut-accepted-page.rpt`). This reproduces the hi-boost
and hi-cut runs exactly.

**Where the page differs, as bands with their columns** (`pixelbands.txt`;
positive controls: an image against itself 0 differing pixels, against its own
inverse 7,677,127):

```
  rows   56.39 ..   75.56 mm     19163 px   columns [(63.37, 73.41), (98.93, 130.3), (144.14, 221.74)]
  rows   83.06 ..   94.61 mm      1647 px   columns [(66.17, 73.66)]
  rows  106.55 ..  224.92 mm    208900 px   columns [(22.61, 400.18)]
```

The first band is the two stand-in groups that were re-laid (98.9–130.3 Hi
boost, 144.1–221.7 Hi cut) plus the column at J1 where the `PWR_FLAG` was
removed. The second is the J2 ground column. The third is the Mid group.
**Nothing else on the page moved** — the Lo cut and Lo boost stand-ins and the
J1 labels are byte-for-byte where copperhead put them.

### Measurements taken from the rendered page rather than from the sheet

Every figure below is ink measured at 600 dpi (`scripts/measure.py`), each with
a positive control that the measuring box is otherwise empty or that the
detector fires.

| what | measured |
| --- | --- |
| the widest value on the board, `3300pF` | **6.858 mm** of ink (x 184.542–191.400) |
| `.047uF`, same six characters | **6.223 mm** — the leading `.` is a narrow glyph |
| `3300pF` to its OWN plate / to the NEXT capacitor's | **0.900 / 3.418 mm** |
| `.047uF` to its own plate / to the next | **1.219 / 3.734 mm** |
| the `hi_tap` label's text to SI2's body | **1.896 mm** — see §9.3 |
| **the `no_connect` marker's ink** | **1.355 × 1.397 mm**, x 99.632–100.987, y 177.102–178.499 |
| the marker to the nearest RED ink of any kind | 0.042 mm, at y 177.779 — **pin 12's own pin line**, which is where KiCad draws the marker by design |
| **the marker to the pin-number glyph `12`** | **0.212 mm**, measured in a box that excludes the pin line; **0 rows where blue and red share a pixel column** |
| the largest unoccupied region inside the Mid rectangle | **90.5 × 28.5 mm** (x 24.5–115, y 114–142.5), **zero ink** |
| the band under the capacitor bank (x 110–370, y 180–186) | zero ink |
| Mid rectangle content margins, graphics | left 19.05, right 7.62, top 8.89, bottom 8.89 mm |
| Mid rectangle content margins, graphics + text | left 19.05, right 7.62, top 1.90, bottom 0.64 mm |

**The 15.24 mm capacitor pitch is derived from the first two of those numbers,
not copied from the hi-boost or hi-cut pages** — `EVALUATING-DRAWINGS.md` P3
forbids taking a reference's proportions. At the measured 6.858 mm widest value
and a 6.35 mm centred field offset, a pitch of 12.70 mm would leave **0.89 mm**
between a value's right ink and the next capacitor's plate, 13.97 mm leaves
**2.16 mm**, and 15.24 mm leaves **3.42 mm**. **That it lands on the same number
as the last two boards is a coincidence of all three carrying four-digit `pF`
values, and the measurement is what justifies it.** Seventeen capacitors at
15.24 mm make the bank 243.84 mm wide, and **that it still fits A3 was checked
against the frame rather than assumed**: the eastmost ink is the `in` tag at
about 396.6 mm against an inner frame at 410.

**And the marker measurement reproduces across tools.** `docs/research/2026-10-29-mid-pin12-nc.md`
measured the same marker on the `lib/schgen/` page at 1.355 mm of ink and 0.21 mm
to the pin-number glyphs. This page is drawn by copperhead and akcli, placed at
different coordinates, and measures **1.355 mm and 0.212 mm**. The two figures
are a property of the KiCad symbol and the marker's own geometry, not of either
tool.

---

## 8. Regions changed — the back-check

Per `EVALUATING-DRAWINGS.md` §8 these are the parts only one party has
considered. Before and after crops of each are committed at 300 dpi, **the same
box on both sides**.

1. **Mid, the whole group** — `crops/before-mid-whole.png` /
   `crops/after-mid-whole.png`. Twenty-eight parts re-placed and re-rotated, 131
   wires deleted and 64 added, 45 labels deleted and 29 added, 88 fields
   rewritten, the rectangle resized from 307.34 × 118.11 mm to 377.19 × 80.01 mm
   and its heading moved with it. **This is the largest changed region and the
   least-examined part of the page.**
2. **The bank, close in** — `crops/{before,after}-bank-left.png`, `-bank-mid`,
   `-bank-right`. **Every one of these seventeen parts had its Reference and
   Value rewritten**, which is the class invisible to every automated check.
   **Look at:** whether each value reads as belonging to the capacitor on its
   left (0.90 mm to its own plate, 3.42 mm to the next); and whether a
   seventeen-wide staircase reads as eleven contacts.
3. **The coil row** — `crops/{before,after}-coil-row.png`. The rail, the five
   windings and the five tap buses, with each bus named on its own winding's
   drop. **Look at:** whether a bus reads as serving the capacitors beneath it.
4. **The return block** — `crops/{before,after}-return-block.png`. The mode
   switch, the two return legs, the input shunt, the shared ground and the `in`
   label. **Look at:** whether the centre `off` position reads as taking the
   section out of circuit, and whether one ground for two legs reads.
5. **The west chain** — `crops/{before,after}-west-chain.png`. The rheostat at
   rotation 90 with its tie, the pole wire, and the selector at its new place.
6. **The no-connect marker** — `crops/{before,after}-nc-marker.png`, at 4× the
   other crops' zoom. **Look at:** whether an X beside the `12` reads as "this
   detent is deliberately unused" rather than as a mistake.
7. **Junction, J2** — `crops/{before,after}-junction-j2.png`. Five stacked
   ground symbols became one on a trunk; the `PWR_FLAG` moved onto a stub off it.
8. **Junction, J1** — `crops/{before,after}-junction-j1.png`. The `PWR_FLAG`
   diamond was drawn on `#PWR01`'s own coordinates. **Look at:** whether the
   five J1 labels now read.
9. **Hi boost** — `crops/{before,after}-hi-boost.png`. A duplicate `hi_tap` pair
   collapsed by turning SI2 horizontal. **A group nobody asked to have touched.**
10. **Hi cut** — `crops/{before,after}-hi-cut.png`. Four parts re-laid as a loop
    to collapse `hcut_t2` ×3 and `lo_boost_in` ×2. **Also a group nobody asked
    to have touched.**
11. **The whole stand-in band** — `crops/{before,after}-top-band.png`, so each
    group is seen beside its neighbours rather than on its own.

---

## 9. Where `TOOLING.md` was insufficient

Each of these is a place this run had to decide something the written process
does not answer, or a place a committed check was wrong.

**9.1 — A SHEET HOLDS LIBRARY PINS IN TWO TEXTUAL FORMS, AND BOTH
`junction_audit.py` AND `verify.py` SILENTLY DROPPED ONE OF THEM.** KiCad writes
a pin from the standard libraries over two lines; **copperhead writes its own two
embedded power symbols on ONE line** — `(pin power_in line (at 0 0 270) (length 0) hide`.
Both inherited scripts matched `\(pin \w+ \w+\n\s*\(at …\)`, which requires the
newline, so they resolved **0 of this board's 5 power pins** — and `TOOLING.md`
names `junction_audit.py` as the script to trust. The visible symptom was a
**reported ORPHAN JUNCTION** at the shared ground symbol's pin, which is a
legitimate tee. Fixed in both copies by parsing either form and **refusing when
the `(pin ` token count and the parse disagree**; after the fix 102 of 102 pins
resolve and the orphan count is 0. This is the hi-cut run's wire-regex finding
(its §9.1) recurring in a second parser, and **the hi-cut and hi-boost runs'
own "orphan junctions 0" figures were computed with the same blind spot** — they
happened to have no junction at a power pin.

**9.2 — THE BASELINE'S ONE TEE-WITHOUT-A-DOT IS THE COLLINEAR-OVERLAP ARTEFACT,
ON A SECOND BOARD.** `(173.99, 72.39)` reports as a wire-to-wire tee carrying no
dot. The wires there are `(173.99,71.12)-(173.99,73.66)` and
`(173.99,72.39)-(173.99,73.66)` — the second lying **wholly inside** the first on
the same net — with a horizontal meeting the short one's endpoint. Connected by a
shared endpoint, no dot needed. **Not a defect, a check limitation**, exactly as
`TOOLING.md` records from hi-cut, and the second board on which copperhead has
produced an overlapping collinear pair. The artefact recurs.

**9.3 — `akcli check --layout` IS WRONG IN BOTH DIRECTIONS ON THIS PAGE, and the
false POSITIVE is the new half.** 12 findings before, 3 after, 0 errors
throughout. Of the three remaining:

- `LAYOUT_LABEL_OVER_SYMBOL label 'hi_tap' … runs over SI2` — **measured on the
  render at 600 dpi there is 1.896 mm of clear space** between the label's right
  ink and SI2's body. A false positive.
- two `LAYOUT_LABEL_OVER_WIRE … it is not attached to` notes, for `sel_common`
  over the rheostat tie's vertical and `cut_return` over the cut leg's vertical.
  **Both wires are on the label's OWN net.** The lint's net attribution is wrong,
  not its geometry.

`TOOLING.md` records this lint only as reporting *too few* findings. **It also
reports findings that are not there**, and both halves have to be read against
the render.

**9.4 — `dump_sheet.py` CANNOT READ A SHEET akcli HAS WRITTEN, and it refuses
rather than lying — which is the behaviour to keep.** It parses wires by
copperhead's block form only; the finished page holds **18 block-form and 64
one-line-form** wires, so it exits with *"parsed 18 wire blocks but the file
holds 82 '(wire' tokens - the parse is incomplete"*. That refusal is correct and
is why nothing downstream believed 18. **But `TOOLING.md` presents the script as
a sheet dump without saying it is a BEFORE-side tool**, and the two-form parse it
needs is the same one §9.1 had to write twice more.

**9.5 — A POSITIVE CONTROL CAN BE PLACED IN THE WRONG PART OF THE FILE AND
REPORT NOTHING.** The first control for *"wires written at `(width 0)`"* set the
file's first `(width 0.254)` to zero — which belongs to a **symbol graphic in
`lib_symbols`**, not to a wire — and the counter read 0 both ways, which is
indistinguishable from a working check on a clean file. Corrected to perturb the
first stroke **after** the first `\n\t(wire`, and the control then reads 1.
`TOOLING.md` requires a positive control; it does not say that the control has to
perturb the same kind of object the check counts.

**9.6 — THE DRAFT-CHOICE TRADE IS LARGE HERE AND THE NUMBER IT TURNS ON DOES NOT
SURVIVE THE REPAIR.** 24 crossings against 5 — the biggest gap of the four boards
that have measured it. **Every one of the 24 is inside the group that was then
re-authored from nothing**, so the measurement adjudicated a property of a
drawing that no longer exists. The lesson for the next board is to measure the
trade on the parts of the page the repair will KEEP. Nothing in `TOOLING.md`
says this, and its own entry treats the crossing count as decisive.

**9.7 — LABEL SCOPE IS A DRAWN SHAPE, NOT ONLY AN EXPORTED NAME, AND THE WRITTEN
PROCESS ONLY KNOWS THE SECOND HALF.** `TOOLING.md` records scope as *"changes the
exported net name"* and asks what to do *"when a collapse leaves a net with a
single label whose natural scope is local"*. What it does not record is that a
global label is a **tag** which KiCad draws the wire through, so a global label
anchored mid-wire or at a crowded pin covers things a local label does not. Three
of them did here (§3, repair 7), and the only instrument that found it was the
render. The rule this run used — local inside one group, global only for a
crossing net — is **a reading, not something the owner stated**, and is flagged
as such.

**9.8 — `pwr_survey.py` LOOKS AT WIRE ENDPOINTS ONLY AND REPORTS "NO WIRE TOUCHES
THIS ANCHOR" FOR A PIN ON A WIRE'S INTERIOR.** It says exactly that for `#PWR07`,
the shared ground symbol, whose pin sits in the middle of the 15.24 mm link it
terminates. Connectivity is proved three other ways — akcli's connectivity check
clean, the junction audit showing the pin on a wire interior **with** a dot, and
the netlist partition identical — so the line is a false negative of the same
endpoint-only class `TOOLING.md` already records for `orphan_junctions.py`.

**9.9 — `boxgeom.py`'s TEXT MARGINS ARE AN APPROXIMATION AND THIS PAGE MAKES THAT
MATTER.** It reports the Mid rectangle's graphics+text top margin as 1.90 mm and
its bottom as 0.64 mm, from a glyph box estimated as `0.75 × size × len(text)`.
Both numbers are the tightest on the page and both are estimates; the render is
what they would have to be checked against. Its graphics margins (19.05 / 7.62 /
8.89 / 8.89) are exact. `TOOLING.md` cites `boxgeom.py` for margins without the
distinction, and separately records that its per-point attribution is wrong.

**9.10 — THE LOOP AS WRITTEN HAS ONE REVISE STEP AND THIS RUN NEEDED TWO,
WHICH IS NOW FIVE RUNS IN A ROW.** The loop actually run was: verify the intent,
draft eleven, look at eleven, repair, restyle, render, **look** — which found
three label tags over wires and pin numbers and two field collisions no check
reported — **re-scope seven labels, move two parts' fields, merge two ground
symbols, re-derive from the committed baseline, render, look again**, measure.
`TOOLING.md` already says *"write the loop you actually ran"*.

**9.11 — THE akcli VENV PATH IS NOW A THIRD VALUE.** The two committed `run.sh`
scripts disagree; on this machine `$SCRATCHPAD/venv-akcli` resolves into
`hybrid-pass-1`'s tree, so `akcli --version` works from a path neither record
predicts. `run.sh` here creates its own venv when the binary is absent, and
installs `numpy` and `pillow` into it because `pixeldiff.py`, `pixelbands.py`,
`textwidth.py` and `measure.py` all run under it.

---

## 10. What was NOT done, stated plainly

- **The whole Mid arrangement is agent-authored and nobody has reviewed it.**
  Twenty-eight parts placed, a 200 mm rail, five buses, eleven runs, seventeen
  risers. The no-crossing property is proved; the *reading* of it is established
  by nothing.
- **The 90.5 × 28.5 mm unoccupied region in the Mid rectangle's upper-left is
  not closed.** It is empty because the west chain — the rheostat and the
  selector — occupies only the lower 35 mm of an 80 mm-tall group, and the
  selector's throw ys are tied to the eleven runs. Closing it means moving the
  return block to the west, which would turn `in` round to point left, or
  re-laying the group. Both are arrangement changes nobody has reviewed.
- **`#PWR01`, J1's ground, is unchanged** — the same symbol all four accepted
  pages put up for overruling, still unruled.
- **`#FLG01` is still on the page**, moved and not deleted, and earns nothing.
- **The `out` global label in the Junction group still sits against J1's pin-4
  number**, as it does on all four accepted pages. Not touched.
- **The Lo cut and Lo boost stand-ins were not touched at all.** Neither carries
  a duplicate label; `Lo cut`'s output sits below its input, which is noted in
  §6 and left alone — `S1` is followed, never enforced.
- **Seven nets changed name** (a leading `/`), deliberately, so the netlist does
  not match the baseline on names. The pin sets are identical.
- **The five ERC `lib_symbol_issues` warnings are not suppressed.** Errors are 0.
- **`3300pF` sits 0.900 mm from its own plate** — the smallest text-to-graphic
  gap on the page. Measured, reported, not changed: widening the field offset to
  close it would narrow the 3.42 mm gap to the next capacitor by the same amount,
  and which way that trade should go is not an agent's call.
- **The capacitor values are centred on their anchors, not left-justified.** A
  left-justified field would give every value the same gap to its own plate
  regardless of how wide the text is; that is a 34-field change and was not made.
- **The rheostat's tie is a bracket over the body** and was not re-drawn. The
  alternative orientations put the input on the wrong side.
- **`boxgeom.py`, `pwr_survey.py` and `dump_sheet.py` were characterised, not
  fixed** (§9.4, §9.8, §9.9). Only the pin parser in `junction_audit.py` and
  `verify.py` was fixed, because it was producing a false finding on this page.
- **`SW1`'s eleven contacts are named `sel1`…`sel11`, not by frequency.** The
  frequency is in the contact table in §1 and on the switch's pin numbers only.
- **No second akcli pass was run.** The second round of changes went through the
  same op-list re-derived from the committed baseline, which is what makes
  `run.sh` idempotent.
- **No SPICE run, no board layout, no BOM.** Out of scope, and a fully specified
  BOM does not bind a schematic (`CLAUDE.md`).

---

## 11. Repeatability — the summary this run was for

| repair class | low-boost | low-cut | hi-boost | hi-cut | **mid** |
| --- | --- | --- | --- | --- | --- |
| multiple ground symbols where one serves | yes (J2, 5→1) | yes (J2, 5→1) | yes (J2, 5→1) | yes (J2, 5→1) | **yes (J2, 5→1; and the return legs, 2→1)** |
| label where a wire belongs | yes (27 mm) | yes (2 nets) | yes (4 nets, 10 labels) | yes (2 nets, in TWO groups) | **yes (10 nets, 27 labels, in THREE groups)** |
| ground or part oriented so a wire doubles back | yes (RV1) | checked, none | yes (SI7) | checked, none | **checked, none** |
| part placement forcing a long crooked run | yes (SI8) | yes (bank, 7 parts) | yes (bank + coils, 13) | yes (bank, 13) | **yes (the whole own section, 28)** |
| `PWR_FLAG` placed over another device | no | yes | yes, on `#PWR01` | yes, on `#PWR01` | **yes, on `#PWR01` again** |
| field offsets tuned to the superseded layout | not reached | yes, twice | yes, 26 fields + the ANGLE | yes, 30 fields + the ANGLE | **yes, 88 fields, and the ANGLE in BOTH directions** |
| orphan junction dots left by a deletion | not reached | yes, 4 then 7 | checked, none | checked, none | **checked, none — after fixing the checker** |

**All seven classes recurred or were ruled absent by measurement. No new
copperhead repair class appeared** — the third board in a row with none, which
is evidence that side is settling and not that it is closed. **One new akcli-side
class did**: a global label's tag drawn over the wire and pin number it sits on
(§3 repair 7), which is the ninth repair class and the fifth on akcli's side.

What this run produced besides a page is **eleven corrections and gaps in the
written procedure** (§9), of which **four are defects in committed checks** —
the pin parser in `junction_audit.py` and `verify.py`, `pwr_survey.py`'s
endpoint-only test, `dump_sheet.py`'s single-form wire parse, and a positive
control that perturbed the wrong kind of object — and two are behaviours of
`akcli check --layout` that nothing had recorded.

**What a fifth board does NOT establish.** It does not establish that the repair
set is complete, and it does not establish anything at all about the drawing: the
page is unreviewed, and `EVALUATING-DRAWINGS.md` §5 is explicit that no check
passing and no absence of findings advances its status.
