# A resistor power rating from a rail bound, not from an operating point

**2026-10-30.** `pt2399-core`'s parts-list conditions refused, and the refusal named a
chain it could not get past: `deriveNeeds` requires a per-resistor dissipation figure,
which comes from `resistorDissipation`, which needs a DC operating point, which needs a
PT2399 SPICE model that does not exist plus a source and a load nobody recorded.
`docs/research/2026-10-30-known-defects.md` section 1 measured all three.

This records what replaced that refusal, the arithmetic behind it **recomputed here from
the model rather than taken on trust**, the shape chosen and why, the two refusal arms
with the output that proves each fires, and **two gates behind the power gate that
nobody had seen because the power gate hid them** - one closed here, one deliberately
not.

**Every figure below names the command or the test that re-runs it.** A figure written
down is a transcription with a date on it; the re-run is the authority.

## 1. The premise, which is the owner's and not an agent's

The owner, 2026-10-30, supplying the engineering judgement:

> *"pt2399 is a 5 volt dsp chip. It doesn't need to be above 1/4 watt"*

Those words are carried in the declaration itself
(`circuits/pt2399-core/pt2399-core.ts`, `bomConditions().railBound.basis`) and quoted
in every refusal the declaration produces, so the claim being contradicted is named
rather than only the number that contradicts it.

## 2. WHAT THE GATE WAS FOR, WHICH IS THE WHOLE MOVE

`deriveNeeds` refuses a resistor with no dissipation figure. **But a dissipation figure
is not what a parts list needs - a wattage to order is.** `CLAUDE.md` names this
pattern: *"A REFUSAL WHOSE REASON CANNOT BE STATED SHOULD NOT EXIST. ASK WHAT A DEMAND
IS FOR BEFORE WORKING OUT HOW TO SATISFY IT."*

**This is NOT a fifth instance of that failure, and the distinction matters.** The four
instances `CLAUDE.md` lists were demands whose reason could not be stated at all. This
one states its reason perfectly well - `requiredResistorWatts` needs a dissipation
figure because a rating is derated from one - and the reason survives questioning. What
was wrong was narrower: **the only SOURCE for that figure was a simulation**, and a
board on a single low-voltage rail has a second source that needs no simulation.

So nothing was weakened. `deriveNeeds` still refuses a resistor with no figure;
`resistorDissipation` is untouched; a board that can be simulated still is. What was
added is a second, narrower way to supply the figure, available only to a board that
can state a bound and have it checked.

## 3. The arithmetic, recomputed from the model

**The bound.** The worst case for a resistor on a single rail is the whole rail across
it, so `P <= V^2 / R`. No operating point, no source, no load, no device model.

**The threshold, and it is NOT `V^2/P`.** The brief that commissioned this work computed
`R = V^2/P = 25/0.25 = 100` ohms and asked for the arithmetic to be verified rather than
trusted. Verifying it found a factor of two:

| | at a 5 V rail |
| --- | --- |
| bare `V^2/P` | 100 ohms |
| **the threshold a 1/4 W part actually honours here** | **200 ohms** |

`requiredResistorWatts` (`tools/bom/ratings.ts`) **doubles every dissipation figure
before it becomes a rating to order** - its Decision in
`docs/superpowers/specs/2026-09-30-bom-design.md`. So a 150-ohm resistor on a 5 V rail
dissipates at most 0.167 W, clears the bare 100-ohm threshold, and would have
`deriveNeeds` ask for **0.333 W** while the declaration said 1/4 W was enough. **A
declaration that contradicts the line derived from it is worse than no declaration**, so
`railBoundMinimumOhms` takes the stricter threshold: it is `requiredResistorWatts`
inverted, the resistance at which the rule asks for exactly the rating claimed.

**The factor of 2 is this repository's own derating rule, not a second opinion about the
physics, and it does not touch the owner's judgement.** His claim is about the rating to
fit; both thresholds are two orders of magnitude below this board's smallest resistor.

`tests/bom/rail-bound.test.ts`'s *"railBoundMinimumOhms inverts requiredResistorWatts
exactly at the threshold"* proves the inversion at three rail/rating pairs rather than
restating the formula: at the threshold the rule asks for exactly the rating, and one ohm
below it asks for more. Drop the derating factor and five tests go red (section 6).

**The margin, from the model.** Re-run: the test
*"the rail bound covers every resistor on this board, with the margin computed not
asserted"* in `tests/circuits/pt2399-core.test.ts`, which reads the resistors out of
`pt2399Core()` and the threshold out of the declaration.

- Eight resistors: 100K, 15K, 10K, 15K, 15K, 10K, 15K, **2.7K**.
- Smallest: `output_mix_resistor` (R5) at 2.7K, **13.5x the 200-ohm threshold**.
- Worst-case dissipation on the board: **9.26 mW** (25/2700), confirming the brief's
  9.3 mW.
- `requiredResistorWatts(0.00926)` = `max(0.25, 0.0185)` = **0.25 W**: the 1/4 W floor,
  which is the rating the owner named.

Every resistor's bound, as the tool computes it: R5 9.26 mW, R1 and R7 2.50 mW, R3, R2,
R6 and R8 1.67 mW, R4 0.25 mW.

## 4. THE SHAPE CHOSEN, AND WHY

**`BomConditions` became a discriminated union of two arms, and the rail-bound arm
carries no `environment` at all.**

```
SimulatedBomConditions   description, controlState, environment            railBound?: undefined
RailBoundBomConditions   description, controlState, railBound              environment?: undefined
```

`RailBoundPower` (`tools/bom/rail-bound.ts`) carries `supplies`, `ratedWatts` and
`basis`. `tools/bom/run.ts` has **one** branch - the only place that chooses - and
`railBoundResistorWatts` fills the same `ReadonlyMap<string, number>` that
`resistorDissipation` fills, so `deriveNeeds` is unchanged and does not know which arm
it was served by.

**Why a union arm and not a flag on the existing shape.** The hard constraint was not to
invent `environment.source` or `environment.load`. A flag would have left those fields
present and required on the type, so a rail-bound board would still have had to put
*something* in them. **Making it a separate arm means a board on this path is never in a
position to invent them** - the fields do not exist for it. That is the constraint
enforced by the type rather than by an agent remembering it.

**Why a new `BomConditions` arm and not a separate export name.** A rail-bound board
still needs a `description` for `BOM.md` and a rail for every capacitor's voltage
rating, so a second export would have duplicated two thirds of the shape and given
`highestRailVolts` two sources to read. One shape, two arms, one reader
(`declaredSupplies`).

**Why discriminate on `railBound === undefined` rather than a `kind` tag.** It keeps the
existing arm's field names exactly as they are. `circuits/transistor-preamp/staged-board.ts`
and `circuits/pultec/` are untouched; the only ripple was four type annotations and one
assertion in tests.

**`resistorDissipation` now takes `SimulatedBomConditions`, not `BomConditions`.** A
rail-bound board cannot reach it at all, and the type says so rather than a runtime check
finding out. Same for `BomDeps.dissipation`, the injection point: there is no simulation
to stand in for on the rail-bound path, and its check is the point of taking it.

## 5. The check, and the two arms that prove it can fail

`railBoundResistorWatts` refuses before it returns. Five refusals, each with teeth
(section 6):

1. **a resistor below the implied minimum**, by name;
2. **a supply on a port the circuit does not declare** - this is what ties the declared
   voltage to the model: `{ port: "vcc", volts: 5 }` is a claim about the net `vcc`
   names, and a circuit that stops declaring that port stops satisfying it;
3. **no supplies, or a non-positive rail** - a rail of 0 V bounds every resistance at
   zero watts, including ones no part could survive;
4. **a potentiometer** - its section resistance is a function of its control and reaches
   0 ohms at a taper extreme, where `V^2/R` is unbounded. The operating-point path
   handles this because the simulator reports the voltage actually across the section;
   arithmetic over a declared rail cannot, so it says so loudly rather than passing over
   it in silence. `pt2399-core` has no pots, so this costs nothing today;
5. **a claimed rating below the 1/4 W floor** `requiredResistorWatts` applies, where no
   resistance would satisfy the claim and the threshold is undefined.

### ARM ONE: a 47 ohm resistor added to pt2399-core's own circuit

`[RAN 2026-10-30]`, verbatim:

> pt2399-core: the declared rail bound does NOT cover this circuit. resistor
> "vco_trim_resistor" is 47 ohms, below the 200 ohms a 0.25 W part covers with the whole
> 5 V rail across it (worst case 0.532 W, and requiredResistorWatts doubles
> a dissipation figure before it becomes a rating to order). The basis for the claimed
> rating was the owner, 2026-10-30: "pt2399 is a 5 volt dsp chip. It doesn't need to be
> above 1/4 watt". Either raise the resistor's value, raise
> bomConditions().railBound.ratedWatts to a rating that covers it - with a basis for that
> rating - or derive this board's dissipation from an operating point instead.

### ARM TWO: the rail raised, and the threshold moving past a resistor that passed

The threshold is not a constant. At 5 V it is 200 ohms and all eight resistors clear it.
At **20 V** it is 3200 ohms - between this board's smallest resistor (2.7K) and its next
smallest (10K) - so the refusal names exactly the one part the moved threshold caught.
`[RAN 2026-10-30]`, verbatim:

> pt2399-core: the declared rail bound does NOT cover this circuit. resistor
> "output_mix_resistor" is 2700 ohms, below the 3200 ohms a 0.25 W part covers with the
> whole 20 V rail across it (worst case 0.148 W, and requiredResistorWatts
> doubles a dissipation figure before it becomes a rating to order). ...

20 V rather than a larger rail **on purpose**: at 60 V the threshold is 28.8K and the
refusal names `input_mix_resistor` (15K) instead, because the walk refuses on the first
resistor below the threshold. A test asserting the 2.7K by name at 60 V would have been
asserting declaration order, not the threshold. The fixture arm in
`tests/bom/rail-bound.test.ts` makes the same point the other way: it asserts the
refusal does **not** name the 10K that is still fine.

## 6. Every new gate gutted in turn, and what went red

Not a claim that the tests pass - a claim that they could have failed. Each gate was
replaced by its always-false form, the three affected test files run, and the file
restored. `[RAN 2026-10-30]`:

| gutted | pass / fail | tests that went red |
| --- | --- | --- |
| `ohms < minimumOhms` -> `false` | 38 / 4 | both pt2399-core arms, both fixture arms |
| both-arms refusal -> `false` | 41 / 1 | *declaring BOTH environment and railBound is refused* |
| supply-port check -> `false` | 41 / 1 | *a supply on a port the circuit does not declare is refused* |
| potentiometer refusal removed | 41 / 1 | *a potentiometer is refused: a wiper that can reach 0 ohms* |
| derating factor 2 -> 1 in `railBoundMinimumOhms` | 36 / 6 | all four threshold arms, plus the margin test |
| **restored** | **42 / 0** | - |

The harness is `scratchpad/perturb.py` from the run; it is not committed, because the
table above is the result and the gates are re-verified by the tests themselves.

## 7. TWO GATES BEHIND THE POWER GATE, AND THE BOARD STILL DOES NOT PASS `make check`

**This is the finding the task that commissioned the work did not expect, and it is the
same shape `docs/research/2026-10-30-known-defects.md` section 5 recorded nine hours
earlier for this same board: a gate nobody could see past hid the ones behind it.** The
brief asked for `make check` to be green on `pt2399-core` with only the three
`transistor-preamp` boards left red. It is not, and the power gate was not the last
blocker.

`[RAN 2026-10-30]` - a probe that enumerated every component against both tables
`deriveNeeds` consults, rather than stopping at the first refusal, because stopping at
the first refusal is exactly how the power gate hid these:

| | what refuses | count |
| --- | --- | --- |
| a | `physicalFor`: `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm` is in no footprint table | 10 components (C1, C4, C5, C6, C8, C9, C11, C12, C13, C14) |
| b | `assertSupportedKind`: `kind "ic"` has no parts-list rule | 1 component (U1, the PT2399) |

Neither is about power. Both were invisible while the dissipation gate refused first.

### (a) CLOSED: the `C_Disc` footprint family

Closed here, and the reason it was in scope at all is that **this repository had already
answered it**. `boards/pt2399-core/bom.json` already chooses
`ceramic-100nf-50v-x7r-radial-2.5mm` against the line key
`capacitor .1uF C_Disc_D5.0mm_W2.5mm_P2.50mm`, and
`parts/ceramic-100nf-50v-x7r-radial-2.5mm.json` records datasheet evidence that reasons
about **this exact footprint by name**, including reading its silkscreen outline. The
footprint table was the only missing piece, and filling it authored no criterion: the
fit rule is the one already ruled for radial electrolytics - body diameter at most the
footprint's `D`, lead spacing exactly its `P`.

**The dimensions were read off the library file, not from memory.**
`C_Disc_D5.0mm_W2.5mm_P2.50mm.kicad_mod`, version 20260206, carries
`descr "C, Disc series, Radial, pin pitch=2.50mm, diameter*width=5*2.5mm^2, ..."` with
pads 1 and 2 at x 0 and x 2.5.

**The `W` dimension is captured and discarded, deliberately.** It is the body's
thickness and `tools/bom/catalog.ts`'s `Specs` has no field for one. A needed spec an
entry does not state is a misfit, so adding the field would make every existing
capacitor entry stop fitting. The absence is recorded in `tools/bom/types.ts` beside the
variant rather than left to be rediscovered.

**The variant is named `disc-capacitor` and its "Needs" text says `non-polarised`, not
`disc`.** The footprint family is `C_Disc`; the part fitted need not be a literal disc,
and the catalog entry establishes that **no genuine 0.1 uF ceramic disc is sold at 2.5 mm
lead spacing at all** - a radial dipped MLCC is what that pitch is sold at. What a buyer
has to get right is that it is not an electrolytic.

### (b) NOT CLOSED, AND NOT THIS CHANGE'S TO CLOSE: a parts-list rule for `kind "ic"`

`[RAN 2026-10-30]`:

> component "delay_ic" (kind "ic") has no parts-list rule in tools/bom/needs.ts. Add one,
> with a test, before deriving needs for a board that uses this kind.

**This refusal is legitimate and states its reason** - *"a part search built on a guessed
body size buys the wrong part"* - so it is a refusal to satisfy and not a demand to
question. It was still not satisfied here, and the reason is the invariant in `CLAUDE.md`
rather than effort: **an agent may never author the acceptance criteria for the artifact
it is producing.**

Closing it requires deciding, with nothing in the repository to copy:

- a new `Physical` variant for a DIP, and **which of its dimensions bind a catalog
  entry**. `Package_DIP:DIP-16_W7.62mm` names only the row spacing; the 2.54 mm pitch
  would come from the DIP standard, i.e. from outside the footprint name. `Specs` has
  `pins` and `pitchMm` but no row spacing - the same hole the `C_Disc` `W` ran into,
  without an already-ruled analogue to copy;
- **no IC catalog entry exists anywhere in `parts/`** (the kinds present are accessory,
  bjt, capacitor, connector, potentiometer, resistor), so the first one ever written
  would be judged by criteria written in the same change.

The `C_Disc` rule was taken because it copies an existing ruled rule for an
already-chosen, already-evidenced part. This one has neither.

**WHAT WOULD SETTLE IT.** The CRITERION: `make -C boards/pt2399-core bom` derives a line
for U1 and `make check` passes on the board. The MECHANISM is a guess from someone who
has not tried it, and it carries one question that is **not** an MPN request - `G245`
and `G282` both struck that shape, and this is not it. The question is about scope, not
about a part: **does a derived IC line buy only the chip, or does a DIP on a perfboard
also imply a socket?** The design already has a home for the second answer - `bom.json`'s
`extras`, which is where a purchase not derived from the circuit goes - and the model
carries a DIP footprint and no socket, so the honest derivation is one line and a socket
is an extra. **That reading is an agent's and has not been reviewed**, which is exactly
why it is written here instead of implemented.

### What `make check` reports on the board now

The refusal moved from the power gate to (b), which is the direction this repository
counts as progress - but the board is red, and saying so plainly is the point of this
section. `make -C boards/pt2399-core check`.

**`boards/pt2399-core/bom.json` was NOT deleted.** `docs/known-gaps.md` **G251** carries
the 2026-10-16 instruction for this shape, and the owner has taken a different route.

## 7b. THE LINES THE BOUND PRODUCES, READ RATHER THAN INFERRED FROM A GREEN CHECK

`make bom` cannot complete on this board - section 7(b) is why - so **this was read
through a probe that removes U1 to see past that one refusal**. It is a probe, not the
board's `BOM.md`, and that distinction is the point of saying so: there is no committed
`BOM.md` for `pt2399-core` and this does not stand in for one. `[RAN 2026-10-30]`:

```
Conditions: Supply 5 V on "+5V" (J1 pin 1); no controls. Resistor power ratings are bounded by the rail, not simulated.
Basis:      the owner, 2026-10-30: "pt2399 is a 5 volt dsp chip. It doesn't need to be above 1/4 watt"
```

| Designators | Needs | Qty |
| --- | --- | --- |
| C6, C11 | 560pF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 2 |
| C8, C12 | 5600pF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 2 |
| C9 | .01uF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 1 |
| C1, C4, C5, C13, C14 | .1uF, non-polarised, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 5 |
| C7 | 4.7uF, radial, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 1 |
| C10 | 10uF, radial, <= 5 mm dia, 2.5 mm leads, min 6.3 V | 1 |
| C3 | 47uF, radial, <= 6.3 mm dia, 2.5 mm leads, min 6.3 V | 1 |
| C2 | 100uF, radial, <= 5 mm dia, 2 mm leads, min 6.3 V | 1 |
| J1 | 5-pin 2.54 mm header | 1 |
| R5 | 2.7K, 0207 axial, 10.16 mm leads, **min 0.25 W** | 1 |
| R1, R7 | 10K, 0207 axial, 10.16 mm leads, **min 0.25 W** | 2 |
| R2, R3, R6, R8 | 15K, 0207 axial, 10.16 mm leads, **min 0.25 W** | 4 |
| R4 | 100K, 0207 axial, 10.16 mm leads, **min 0.25 W** | 1 |

**All eight resistors come out at 1/4 W, which is the rating the owner named**, and they
get there through `requiredResistorWatts`'s existing floor rather than through the
declared number being copied onto the line. The capacitors' `min 6.3 V` is
`requiredCapacitorVolts(5)` - the same rail, through the arm-agnostic `highestRailVolts`,
which is the other reason both arms carry supplies.

## 8. What was refused, and why

- **A source and a load for `pt2399-core`.** No basis exists; both move the operating
  point they feed. The rail-bound arm carries neither, which is why it is an arm and not
  a flag.
- **A PT2399 SPICE model.** It would be an acceptance criterion authored by the agent
  whose artifact it judges, and a macromodel with no stated provenance is what
  `lib/sim/models/` exists to prevent.
- **Declaring the PT2399 `electricallyInert`.** The claim would be false: it is the only
  active device on the board.
- **Weakening `deriveNeeds`, `resistorDissipation` or `requiredResistorWatts`.** All
  three are untouched. `deriveNeeds` still refuses a resistor with no figure.
- **Taking the bare `V^2/P` threshold the brief computed.** It would have let
  `deriveNeeds` ask for more than the declaration claimed. Section 3.
- **A parts-list rule for `kind "ic"`.** Section 7(b).
- **Renaming `GROUND_PORT_KEY`, or this circuit's `gnd` port.** The rail-bound path
  resolves no control state, so this now costs this board nothing. It is still a real
  one-word disagreement between this circuit and every other one here.

## 9. Before and after

### `make check`

Both full runs on this machine; `before` at `b84e7e9`.

```
pt2399-core                 FAIL -> FAIL   (reason changed: bomConditions refused -> kind "ic" has no parts-list rule)
transistor-preamp-lab       FAIL -> FAIL   (unchanged: CUT_STATE UNRESOLVED, not ours)
transistor-preamp-loop      FAIL -> FAIL   (unchanged: CUT_STATE UNRESOLVED, not ours)
transistor-preamp-staged    FAIL -> FAIL   (unchanged: HC5 NOT HELD, not ours)
```

**The three `transistor-preamp` boards' output is byte-identical across the change**,
which is the evidence for the hard constraint that a board deriving dissipation from an
operating point keeps doing so. `transistor-preamp-staged` is the one that exercises it:
it has a `bom.json`, so `checkBoardBom` runs its full parts-list derivation through
`resistorDissipation` on every run.

### `bun test`

**`4001 pass / 8 fail` before, `4024 pass / 8 fail` after, and the failure lists are
IDENTICAL BY NAME** - compared with timings stripped, and `diff` reports nothing. The
eight that remain are all of `tests/schgen/port-fidelity.test.ts`, which refuses on an
unset `SCHGEN_SOURCE`: it needs digital-pedal-platform's `tools/schgen/` on disk and
defaults to no guessed path. The 23 new passes are the rail-bound mechanism's tests, the
two arms on `pt2399-core`'s own circuit, the two union-arm refusals, and the `C_Disc`
footprint.

`bun run typecheck` is clean. No hook was bypassed; this repository has none.
