# Staged preamp: stage 1 at the tuned values, as fixed parts

**Status:** reviewed; the owner chose the values. The implementation plan is next.

## Why

The owner, 2026-11-02: *"I'm thinking that we should bake those hand-tuned
values into the staged board, since adding the inter-stage pots adds a level of
hand-tuning complexity I'd like to reduce. I'd like to fix the variables we've
already found suitable values for."*

The staged board adds three panel controls (DRIVE, CHARACTER, TRANSFORMER
DRIVE) to stage 1's four trim-pots. Stage 1's trims have already been tuned by
hand on the built buffered board (Build 3). Fixing them leaves the panel
controls as the only things to set.

The staged board has not been built, so changing its layout costs no rework.

## What the tuned values are, and how well they are known

The owner's in-circuit readings on the buffered board, recorded in
`docs/superpowers/specs/2026-09-25-transistor-preamp-loop-design.md`
("Calibration"), pots alone: RV1 394k, RV2 217k, RV3 1.8k, RV4 0. With the
fixed floor resistors those are legs of about 864k (feedback), 264k (base to
ground) and 2.8k (collector), emitter fully bypassed. A parallel path through
the follower's divider pulls the RV1 and RV2 readings down; corrected, the legs
are nearer 1.13M and 305k. The measured voltages fit both sets about equally.

Simulated now, stage 1 with each leg as one fixed E-series resistor, at 24 V,
against the buffered board's 24 V measurement (emitter 2.3 V, collector 20.0 V;
the base read low under meter loading):

| feedback | base to ground | collector | base | emitter | collector |
| --- | --- | --- | --- | --- | --- |
| 820k | 240k | 2.7k | 2.89 | 2.22 | 19.97 |
| 820k | 270k | 2.7k | 3.01 | 2.34 | 19.76 |
| 910k | 270k | 2.7k | 2.82 | 2.15 | 20.10 |
| 910k | 300k | 2.7k | 2.92 | 2.25 | 19.92 |
| 1M | 270k | 2.7k | 2.65 | 1.98 | 20.40 |
| 1M | 300k | 2.7k | 2.75 | 2.08 | 20.22 |

820k / 270k and 910k / 300k both land within the bench's resolution (1-2%
meters, 5% resistors, 2N3904 beta spread). The ratio of the two legs sets the
bias more than either value alone.

**The owner chose 820k / 270k** - the pair nearest the readings he took.

## The change

On the staged board only:

| leg | today | becomes |
| --- | --- | --- |
| feedback | R1 470k + RV1 1M trim | one resistor, 820k |
| base to ground | R2 47k + RV2 200k trim | one resistor, 270k |
| collector | R3 1k + RV3 2k trim | one resistor, 2.7k |
| emitter bypass | RV4 1k trim between C1 and GND | removed; C1 straight to GND |

`circuits/transistor-preamp/feedback-board.ts`'s `addFeedbackStage` builds
stage 1 for the feedback, buffered, loop and staged boards. **The other three
keep their trims**: they are bench boards for tuning, and the buffered board is
the one that was tuned. So stage 1's builder takes the leg parts as a parameter
(trimmed legs, or fixed values), rather than the staged board copying stage 1.
Ids stay semantic and say what each part does now; designators for the fixed
parts are assigned in the staged board's `DESIGNATORS` and the removed trims'
designators are not reused.

`START` for the staged board loses its stage-1 trim positions; the panel
controls keep theirs. Its `schematicNotes()` - printed in the guide as Build
notes - says stage 1 is fixed at the values tuned on the buffered board, and
names the values.

## What follows from it

Each of these is regenerated or redone, never left stale:

- **Netlist fixture** `tests/fixtures/transistor-preamp-staged.net`, from the
  updated schematic.
- **Schematic** `circuits/transistor-preamp/staged-board.kicad_sch`. The board
  is model-authoritative, so the sheet follows the model: the trims are
  deleted and the fixed resistors placed with akcli on the current page (not a
  re-draft - the owner has reviewed this page). **The repair is committed**
  under `drafted/transistor-preamp/transistor-preamp-staged/repair/`, per
  `TOOLING.md` step 5.5, with a replay from the current committed sha256. The
  changed page goes to the owner for review before anything else is said
  about it.
- **Stripboard layout** `boards/transistor-preamp-staged/*.vrt`: re-placed for
  the new parts with the headless VeroRoute verbs, and `make check` must pass.
- **Parts list** (`make bom`): four trimmers out, three resistors in.
- **Power-up checks**: recomputed by the operating-point simulation at the new
  values.
- **Build guide**: rebuilt and shown to the owner.

## What this is not

- Not a change to the feedback, buffered or loop boards.
- Not a retune: the values are the owner's, taken from his readings.
- Not a change to the panel controls.

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Fix stage 1 at the buffered board's tuned values on the staged board | owner | *"I'd like to fix the variables we've already found suitable values for"* |
| Collector 2.7k, emitter fully bypassed (RV4 removed) | this writer, reviewed | 2.7k is the E24 value nearest 1k + 1.8k; RV4 was at 0 |
| Feedback, buffered and loop boards keep their trims | this writer, reviewed | they are tuning boards; stage 1's builder is shared, so it is parameterised, not copied |
| Feedback leg 820k, base-to-ground leg 270k | owner | *"Let's use the 820K/270K pair"* |
| Staged board not yet built | owner | *"I have not build the staged board yet"* |
