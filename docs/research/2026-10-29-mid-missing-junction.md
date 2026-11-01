# The missing junction on `pultec-mid`, and the branch shape R33 did not cut

**Subject.** `pultec-mid` was the one board of eleven classified `defective`, on one
finding:

```
[missing-junction] block pultec-mid-own: net mid_tap_2h branches at (26.67, 93.98)
(t-junction) and no junction is emitted there; KiCad joins a branch point only with
a junction object, so the drawing would show a connection the netlist does not make
```

**Reproduce the state this document starts from** at `5edfe1a`:

```
bun tools/schgen/board-sheets.ts
```

**Reproduce the diagnosis**, at any commit:

```
bun tools/schgen/junction-probe.ts --board pultec-mid --at 26.67,93.98
bun tools/schgen/junction-probe.ts --board pultec-mid --branches
```

**Conclusion, stated once.** Neither `junctionProblems` nor `junctionPoints` was wrong
about its own input. The **geometry was never split** at that point:
`splitAtBranches` implemented ruling **R33** for a T and not for an X, so a point this
module's own `branchesOf` scores degree 4 reached the drawing with no segment end on it,
and the two sides of obligation 2 disagreed there by construction. The fix is one clause
in `lib/schgen/elk/junctions.ts`. **No check was weakened**; the refusal's first arm is
now asserted by its whole sentence.

**The page is UNREVIEWED.** This writer is not a qualified reviewer of a drawing. The
crops beside this file are there to be shown to the owner.

---

## 1. Phase 1 - root cause investigation

### 1.1 The instrument

`adapt.ts:339` compares two independent computations and the refusal names only the
point and the net. `tools/schgen/junction-probe.ts` prints both sides at a point: the
`branches` entry with the `ends`/`through`/`atPin` arithmetic per net, every
`layoutItems` item whose geometry touches the point with whether the point is one of its
ends or in its interior, the end count `junctionPoints`' first arm reaches, and whether
its **G293** T-arm finds an end strictly inside a same-net wire.

It reads `refusedLayout(result)` - the geometry that survives the missing-junction arm -
so it works on the drawing that was refused, not on a re-route of it.

### 1.2 What it found, run once

```
block pultec-mid-own of pultec-mid: drawn by elk - obligation 2's gate runs on it
  147 wire(s) as the renderer returned them, 69 placed pin(s)
  point (26.67, 93.98)
    REQUIREMENT: net mid_tap_2h (t-junction)
    EMISSION:    NO junction is emitted here
    the degree arithmetic branchesOf computes, over the canonical wires:
    net mid_tap_2h: ends=0 through=2 atPin=no -> degree 4 (BRANCH)
    junctionPoints arm 1 counts 0 item end(s) here (anchors skipped, any net)
    junctionPoints arm 2 (G293, same-net T) finds 0 end-inside-wire relation(s) here
    every item whose geometry touches this point (2):
      [interior] wire 134 of pultec-mid-own net=mid_tap_2h (26.67, 82.55)-(26.67, 97.79)
      [interior] wire 144 of pultec-mid-own net=mid_tap_2h (38.1, 93.98)-(12.7, 93.98)
```

**Two wires of one net cross interior to interior. Neither ends at the crossing.** That
is the whole of it, and it disposes of all four hypotheses the brief offered: no anchor
participates, no NC or net-null item participates, `strictlyInside` is not the obstacle
because there is no *end* for it to test, and the two sides are looking at the **same**
geometry - 147 wires on both.

### 1.3 Why each side behaves as it does

- **Requirement side.** `branchesOf` (`junctions.ts`) counts a segment PASSING THROUGH a
  point as 2, so `ends=0, through=2` is degree 4 - a branch, and `at-pin-end` is false, so
  `t-junction`. `interestingPoints`' second half exists precisely to find this shape; its
  own comment names *"an X of one net whose two segments cross without either ending
  there"*.
- **Emission side.** `junctionPoints` (`render/connectivity.ts`) emits where **three or
  more item ends** coincide - 0 here - or, in the **G293** block, where an item **end**
  lies `strictlyInside` a same-net wire. Both arms need an END at the point. There is
  none, so neither can fire. **There is no third arm.**

### 1.4 Caused or revealed - the fork the brief asked to settle

**Revealed, with one part of it not knowable from here, stated rather than papered over.**

What is checkable:

- `22ce420` and `bc219f6` touch `lib/schgen/authoring.ts`, `lib/schgen/from-network.ts`
  and `circuits/pultec/schematic/section-board.ts`. **They change no code in the layout,
  snapping, canonicalisation or junction path.**
- `THROW_PINS`, which `bc219f6` introduced in place of `String(index + 1)`, is
  `["1".."6"]` for `Switch:SW_Rotary_1x6_MP` and `["1".."12"]` for
  `Switch:SW_Rotary_1x12` - **value-identical to the rule it replaced** for both symbols.
  The pin map, and therefore every pin's position, is unchanged by it.
- The defect is in `splitAtBranches`, which predates both commits by a long way and had
  simply never been handed this shape.

What is **not** knowable from here: whether declaring `SW_MID` pin 12 no-connect
influenced the route ELK produced. Before those commits the board refused at
`pinsDeclared` and produced **no geometry at all**, so there is no earlier drawing in
which to ask whether the crossing was present. The alternative to "this route" is not
"a different route" but "no route", so the question has no measurement behind it and is
left open rather than answered.

**The defect is in the generator, not in this board.** Any block whose route crosses a
net with itself reaches it.

---

## 2. Phase 2 - pattern analysis, over the whole corpus

`bun tools/schgen/junction-probe.ts --board <b> --branches` over all eleven boards
classifies every branch point by the SHAPE that made it one. **A census of degrees could
not have shown this; a census of shapes does.**

| Shape at the branch point | Count | Junction emitted |
|---|---|---|
| 3 coincident ends | 173 | 173 |
| 4 coincident ends | 26 | 26 |
| 2 ends plus a pin (`at-pin-end`) | 4 | 4 |
| **2 interiors crossing, no end** | **1** | **0** |
| 1 end on another's interior (the shape **G293**'s arm 2 was added for) | 0 | - |

**204 branch points, 203 of them with at least one END at the point, and every one of
those 203 emits.** The single exception is `pultec-mid-own` at (26.67, 93.98).

Two things this makes visible that the brief did not predict:

1. **G293's arm 2 fires nowhere in the corpus today.** R33's split removes the
   end-inside-wire shape before `branchesOf` ever sees it, so arm 2 is a guard against a
   shape the canonicalisation no longer produces. It is not dead code - it is the
   emitter's own rule and the emitter is handed pre-split geometry - but it is not what
   was holding the other 203 together either.
2. **What holds those 203 together is arm 1 counting ends**, and what puts the ends there
   is R33. The two sides of obligation 2 agree everywhere R33 has done its work and
   disagree exactly where it has not.

---

## 3. Phase 3 - the hypothesis, and the one variable tested

> **I think `splitAtBranches` is the root cause**, because R33's contract is that *"every
> segment is SPLIT at the branch points of its own net"* and it cuts only where another
> same-net wire's ENDPOINT, or a same-net PIN, lies strictly inside a segment. A same-net
> X is a branch point by `branchesOf`'s own arithmetic and by `interestingPoints`' own
> comment, and nothing cuts there - so the point reaches the drawing with `ends=0`, which
> no arm of `junctionPoints` can see.

**Predictions, written before the change:** the point comes out with four coincident
ends; arm 1 counts 4 and emits; `branchesOf` recomputes `ends=4, through=0`, degree 4,
still a `t-junction`; `junctionProblems` is empty; `split` grows by 2; and **the other ten
boards are untouched**, because the corpus holds no other same-net interior crossing.

**The change, one clause:** also cut where a *perpendicular* same-net segment crosses
this segment's interior. Only a perpendicular pair can reach it - a same-net collinear
overlap is collapsed by **R31** or refused by clause (d) before `splitAtBranches` runs -
and `inside` is keyed by point, so the endpoint clause and the new one cannot
double-count.

**Why the fix is not on the emission side.** Adding a third arm to `junctionPoints` would
also close the disagreement, and it is the wrong remedy twice over. It is ruling **R32**,
which satisfied obligation 2 and was then refused by `checkWireSafety` at the same 25
points and 0 others - the measurement that reversed it. And `connectedComponents` joins a
wire to a wire **only at coincident ends**, so a junction drawn into unsplit geometry
leaves the generator's own connectivity model unable to see the connection it asserts.

**Ported-file hazard, checked before editing.** `lib/schgen/elk/junctions.ts` is listed
under `handWritten` in `tools/schgen/port-manifest.json` - it is not a ported file and is
edited here. `lib/schgen/render/connectivity.ts` (where `junctionPoints` lives) is a
`diverged[]` entry and `lib/schgen/render/wire-safety.ts` carries the do-not-hand-edit
header; **neither was touched.**

---

## 4. Phase 4 - the failing test, then the fix

**Written and watched to fail first** (`tests/schgen/elk/junctions.test.ts`):

```
(fail) a segment is SPLIT at a same-net X, where neither segment ends at the crossing
  expect(t.split).toBe(2)   Expected: 2   Received: 0
```

It asserts the split count, the four-segment result, that no point moved (the four halves
cover exactly the two original spans), that the branch is still one `t-junction` at the
same point, that `junctionPoints` now emits there and `junctionProblems` is empty, that
`checkWireSafety` is silent - and, as anti-vacuity, that `junctionPoints` over the
**unsplit** geometry emits nothing at all.

**The anti-weakening arm**, which is what makes the first test unachievable by relaxing
the check: `a branch point with nothing emitted still REFUSES, in the words the refusal
uses` asserts `junctionProblems`' first arm **by its whole sentence**, over the same X
fixture and over a three-coincident-end fan. A check weakened to make the test above pass
fails there.

### 4.1 Verification at the point

```
  149 wire(s) as the renderer returned them, 69 placed pin(s)
  point (26.67, 93.98)
    REQUIREMENT: net mid_tap_2h (t-junction)
    EMISSION:    a junction IS emitted here
    net mid_tap_2h: ends=4 through=0 atPin=no -> degree 4 (BRANCH)
    junctionPoints arm 1 counts 4 item end(s) here
      wire 134 (26.67, 82.55)-(26.67, 93.98)   wire 135 (26.67, 93.98)-(26.67, 97.79)
      wire 145 (38.1, 93.98)-(26.67, 93.98)    wire 146 (26.67, 93.98)-(12.7, 93.98)
```

147 wires to 149, every prediction met.

### 4.2 The board census

```
11 of 11 boards produce a drawing: 11 usable, 0 defective
0 produce none: 0 not-drawable, 0 generator-defect
```

`build/schgen-boards/pultec-mid/STATUS.md`: *"pultec-mid: USABLE … No findings: every
gate this generation ran passed."*

### 4.3 The ten boards that already drew, compared by CONTENT

All 22 `.kicad_sch` files the census writes, hashed with `shasum -a 256` before and after
(`CLAUDE.md`: git does not preserve mtimes, so never by timestamp):

**20 of 22 are byte-identical. The two that changed are both `pultec-mid`'s**
(`mid.kicad_sch`, `pultec-mid.kicad_sch`). No other board moved, which is what the shape
census in section 2 predicted.

---

## 5. The KiCad export, and a finding that corrects the refusal's own sentence

The brief named the netlist export as the arbiter. It was run in both directions -
`kicad-cli sch export netlist --format kicadxml` over the sheet generated with the fix
and over the sheet generated from `5edfe1a` reverted geometry:

**29 nets before, 29 nets after, and the partition of (ref, pin) nodes is IDENTICAL.**

So on **this instance** the drawing was *not* wrong about the netlist. The reason is
measurable and was measured, modelling KiCad's own rule (wires join at coincident ends, or
at a junction lying on an interior) over the drawn `.kicad_sch`:

| | wires | junctions | wire components | wires touching the point | components among them |
|---|---|---|---|---|---|
| before | 203 | 28 | 40 | 2 | **1** |
| after | 205 | 29 | 40 | 4 | 1 |

**The two crossing arms of `mid_tap_2h` were already joined by another path**, so the
crossing was redundant connectivity and KiCad's netlister reached the same partition
without a dot there.

**This is recorded rather than retagged**, on the precedent `layout-check.ts`'s own
docstring sets, where a batch tag is known to mislabel one branch of `wireOverWires` as
wrong-about-the-circuit when it is merely ugly, and was recorded instead of silently
reclassified. Stated plainly:

- The refusal's sentence - *"the drawing would show a connection the netlist does not
  make"* - **is not literally true of this instance.** It would be exactly true of a
  same-net X on a net with no alternative path, which this corpus does not contain.
- **The check is still right to refuse, and must not be relaxed.** It is a local rule: it
  sees one point, not whether the net is redundantly connected three frames away.
  Refusing both cases is the conservative side, and the remedy (split) costs two wires and
  is correct in both. A rule that fired only on the non-redundant case would need
  whole-net reachability at the one place in the pipeline with the least information.
- **What the classification over-states is the COST of this instance, not the existence of
  the defect.** The point was a four-arm meeting of one net drawn with no dot, which is
  the picture a reader resolves the wrong way, and `connectedComponents` could not see the
  connection either. Both are now true of the drawing.

---

## 6. Test and gate output, before and after

### `bun test`

| run | pass | fail |
|---|---|---|
| before, with the new failing test in place - run 1 | 3982 | 15 |
| before, with the new failing test in place - run 2 | 3984 | 13 |
| after | 3987 | 10 |

**The two "before" runs are the same tree**, and the two-test difference between them is
the guide flakiness named below. The fail LISTS are what was compared, not the counts.

The 10 remaining, named:

- **8** in `tests/schgen/port-fidelity.test.ts`, all from `SCHGEN_SOURCE is not set`
  (pre-existing, named in the brief);
- **1** `decomposition-probe.test.ts` timeout (pre-existing, named in the brief);
- **1** guide test, and **it is flaky under the full-suite run rather than a regression**:
  the run reported `the real converter prints a multi-page PDF…`, a previous run of the
  same tree reported two different guide tests, and `bun test tests/guide/` in isolation
  is **180 pass, 0 fail**. Those files are the concurrent agent's territory and none of
  them is touched here.

Two failures this work ADDED and then removed:

1. the new `same-net X` test, red by design before the fix;
2. `every .ts file under lib/schgen/, tests/schgen/ and tools/schgen/ is ported, diverged,
   or declared hand-written` - the new probe was none of the three. **The check caught its
   own absence**, which is why the manifest declaration is its own commit.

One committed expectation moved with the fix, as `bc219f6` moved two:
`watermark.test.ts` asserted `pultec-mid` is the one defective board. No board is
defective now, so the assertion is the measurement it was written as - and the comment
says plainly that the defective direction of that sweep sweeps nothing real again and
that `tools/schgen/defective-fixture.ts` is what exercises the mark.

### `make check`

Exits 2, on **exactly four boards and exactly the pre-existing causes**:

- `pt2399-core` - `circuits/pt2399-core/pt2399-core.ts`: no `bomConditions` export;
- `transistor-preamp-lab`, `transistor-preamp-loop`, `transistor-preamp-staged` - no
  `LEAD_SPANS` entry for `Capacitor_THT:CP_Radial_D10.0mm_P5.00mm`, with HC8/HC10
  reporting no verdict under `CUT_STATE UNRESOLVED`.

**Every `pultec-*` board passes `make check`, `pultec-mid` among them.** Nothing was added
to the failing set.

---

## 7. The drawing - observations only

Rendered with `kicad-cli sch export pdf`. Page 1 is the root sheet, page 2 is
`Pultec mid section board` on A3. Crops beside this file, all from a 600 dpi raster of
page 2:

| file | what it covers |
|---|---|
| `page-mid-150dpi.png` | the whole A3 page |
| `crop-junction-600dpi.png` | 40 mm square centred on the point |
| `crop-junction-zoom-4x.png` | 10 mm square centred on the point, 4x nearest-neighbour |
| `crop-fallback-column-600dpi.png` | the capacitor column carrying 11 of the 12 fallbacks |
| `crop-fallback-hi-cut-600dpi.png` | the 12th, in the hi-cut stand-in group |

### 7.1 At the point

Block-local (26.67, 93.98) sits on the sheet at **(54.61, 115.57)**. The offset was not
assumed: the four arm directions and lengths at that sheet point - up 11.43, down 3.81,
right 11.43, left 13.97 mm - match the block geometry exactly, and no other four-way
meeting on the page does.

What the page shows there:

- **a filled junction dot**, at a meeting of four wire arms, three of them on the lengths
  above and the fourth continuing downward;
- **1.27 mm to its left, one grid pitch, a second vertical wire crosses the same
  horizontal wire and carries NO dot.** Probed: that is `mid_tap_1h` crossing
  `mid_tap_2h` - two different nets, degree 2 on each - so the cross-net rule is visible
  in the same crop as the same-net rule, each doing the opposite thing;
- **2.54 mm below the dot, a second junction dot** at a T where a horizontal arm runs
  right into a symbol pin line.

The sheet carries **29 junctions** (28 before). 28 of the 29 sit at a point with three or
more wire ends; the 29th, at (224.79, 199.39), has two wire ends and is an `at-pin-end`
branch, where the pin is the third arrival.

### 7.2 The twelve fallback field placements

`pultec-mid` carries 12, the most of any board, and nobody had looked at them. They are
not reported by the text-clearance checks - the placer already knew - so
`RENDER-REPORT.md` is where they are listed. **Eleven of the twelve are in
`pultec-mid-own`'s capacitor column**, bodies at x = 60.96 mm (R1 at x = 48.26) spanning
y = 41.91 to 139.7 mm; the twelfth is in the hi-cut stand-in group at the bottom of the
page.

| Designator | id | body (mm) | Reference at | Value at | covers |
|---|---|---|---|---|---|
| C1 | C_MID_200HZ_A | 60.96, 125.73 | 63.25, 128.27 | 63.25, 130.81 | wire 37 (`mid_sel_1khz`) |
| C2 | C_MID_300HZ_A | 60.96, 133.35 | 63.25, 135.89 | 63.25, 138.43 | wire 37 (`mid_sel_1khz`) |
| C3 | C_MID_500HZ_A | 60.96, 119.38 | 63.25, 121.92 | 63.25, 124.46 | wires 37, 48 (`mid_sel_1khz`, `mid_sel_300hz`) |
| C6 | C_MID_1KHZ_A | 60.96, 139.7 | 58.67, 134.62 | 58.67, 137.16 | wire 129 (`mid_tap_1h`) |
| C8 | C_MID_1K5HZ_A | 60.96, 97.79 | 58.67, 100.33 | 58.67, 102.87 | wire 129 (`mid_tap_1h`) |
| C9 | C_MID_2KHZ_A | 60.96, 55.88 | 58.67, 58.42 | 58.67, 60.96 | wires 57, 58, 102 |
| C11 | C_MID_3KHZ_A | 60.96, 41.91 | 60.96, 45.21 | 60.96, 47.75 | wire 51; Value of C_MID_2KHZ_B |
| C13 | C_MID_4KHZ_A | 60.96, 71.12 | 60.96, 74.42 | 60.96, 76.96 | wires 56, 69 |
| C15 | C_MID_5KHZ_A | 60.96, 63.5 | 63.25, 58.42 | 63.25, 60.96 | wires 45, 53 |
| R1 | R_MID_BOOST | 48.26, 66.04 | 44.45, 68.58 | 44.45, 71.12 | wire 10 (`in`); Value of C_MID_700HZ_B |
| R3 | R_MID_SHUNT | 60.96, 110.49 | 63.25, 109.22 | 63.25, 111.76 | wires 63, 144 (`mid_sel_500hz`, `mid_tap_2h`) |
| SI6 | SI_HI_CUT_RV_HI_CUT_WIPER_CW | 69.85, 189.23 | 73.66, 191.77 | 73.66, 194.31 | Value of SI_HI_CUT_RV_HI_CUT_CCW_WIPER; wire 6 (`lo_boost_in`) |

Observations from the column crop, as measurements and not judgements:

- **Three of the twelve cover another unit's Value text**, not only wire: C11, R1 and SI6.
  The other nine cover wire only.
- The weighted overlap the placer reports spans **387096 to 2387092 um^2**, a factor of
  about 6 between the smallest and largest.
- Every covering wire named is a horizontal run of the selector fan crossing the capacitor
  column, which is the column's own geometry: eleven parallel capacitor branches between
  two vertical rails, with eleven selector taps leaving rightward through the same band of
  y values the field pairs occupy.
- The eleven in-column pairs fall into **four placements**, read off the field positions
  rather than off the picture: six below at (+2.54, +5.08) from the body centre - C1, C2,
  C3, C8, C9, R1; two below at (+3.302, +5.842) - C11, C13; two **above** at (-5.08,
  -2.54) - C6, C15; and R3 alone **straddling** its body at (-1.27, +1.27).
- Sideways they fall into four as well: +2.286 mm for C1, C2, C3, C15, R3; -2.286 mm for
  C6, C8, C9; 0 for C11, C13; and -3.81 mm for R1.

**None of this is a review.** The page has not been reviewed and this writer cannot review
it. `R_MID_SHUNT`'s pair covering `wire 144 (mid_tap_2h)` is worth the owner's eye for a
reason that is not aesthetic: `mid_tap_2h` is the net this whole document is about, and
the wire index moved from 143 to 144 with the split.

---

## 8. What this leaves open

- **Whether the `missing-junction` kind should distinguish a redundantly-connected X from
  a net-splitting one.** Section 5 measures that the two are different in cost and
  identical to the check. Deciding this needs whole-net reachability in the gate, which is
  information the gate does not have and an owner question nobody has asked. **Not
  proposed here; recorded.**
- **Whether the ELK route should produce a same-net X at all.** The split makes the
  drawing correct about the crossing; it does not ask why a net crosses itself one grid
  pitch from a foreign net it also crosses. That is a routing question, not a
  canonicalisation one.
- **Whether `junctionPoints`' G293 arm 2 still earns its place**, given that it fires on 0
  of 204 branch points in the corpus. It is the emitter's own rule and the emitter is handed
  pre-split geometry, so removing it would change what the emitter does to a template
  layout. Measured, not acted on.
- **Whether the pin-12 declaration influenced the route.** Section 1.4: unanswerable from
  here, because the alternative to this route is no route.
- The twelve fallback field placements, which **nobody has reviewed**, and which the owner
  is the only person who can judge.
