# Drawing the staged preamp with copperhead

**Status:** proposed, awaiting the owner's review. Nothing below is built yet.

## Why

The owner asked whether the copperhead-and-akcli drawing procedure
(`TOOLING.md`, invoked through `.claude/skills/drawing-a-schematic/SKILL.md`)
can produce a schematic drawing of `transistor-preamp-staged`.

The board already has a sheet, `circuits/transistor-preamp/staged-board.kicad_sch`:
the old generator's stub, rearranged by the owner in `fd582f9`, with a
`PWR_FLAG` added in `f3dca40` so it passes ERC. That sheet is the one
`perfboard.json` names and the one page 2 of the build guide prints. **This
work does not touch it.** The copperhead page is a second, separate candidate.

## Which way authority runs

`transistor-preamp-staged` is an agent-designed circuit, so **the model is
authoritative** and the drawing is derived from it (`TOOLING.md` step 0). The
authority for the circuit is `staged-board.ts`, whose own authority is
`docs/superpowers/specs/2026-09-28-transistor-preamp-staged-design.md`.

## What gets built

### 1. An intent derived from the model, by code

`make draw` drafts only for a board with an entry in `COMMITTED_INTENT`
(`tools/draught/draw-draft.ts`). Only `pultec-hi-cut` has one, and its intent
is a hand-written JSON file under `docs/research/`.

For this board the intent is **generated from the `Network`**, not typed by
hand. Every fact the intent needs is already in the model:

| intent field | comes from |
| --- | --- |
| `parts[].ref` | `DESIGNATORS` in `staged-board.ts` |
| `parts[].libId` | each component's `symbol` (`circuits/transistor-preamp/parts.ts`) |
| `parts[].value` | each component's value |
| `nets[].pins` as `REF.PIN` | net membership in the `Network`, pin numbers through `symbolPins` / `PIN_NUMBERS` |
| `nets[].kind` | `ground` for `GND`; `power` for `VCC` |
| `parts[].group`, `hints.groupOrder` | **a committed group map - the one judgement input** |

A small module, `tools/draught/intent-from-network.ts`, does the derivation.
It refuses by name on any component with no designator, no `symbol`, or no
group, rather than defaulting one. It is tested over the five
transistor-preamp boards' models, not only this one.

`make draw` then verifies the generated intent against the board's committed
netlist export (`tests/fixtures/transistor-preamp-staged.net`), as sets of
`REF.PIN` sets, which it already does for hi-cut. **A disagreement stops the
draft before a coordinate is placed** - the one refusal `EVALUATING-DRAWINGS.md`
§3 allows.

### 2. The group map, and two arrangements

Group assignment is the main lever copperhead gives (`TOOLING.md` step 2), and
the procedure says to draft more than one. Two arrangements, both in signal
order, left to right:

**A - one group per stage and per control (six groups)**

| group | contents |
| --- | --- |
| Power | `J3` supply header, `C4` reservoir |
| Stage 1 | `J1` input header, `C2` input coupling, `Q1`, its four legs `R1`/`RV1`, `R2`/`RV2`, `R3`/`RV3`, `R4` with `C1`/`RV4` |
| Drive | `C3` (stage 1's output coupling), `RV5` DRIVE, `C6` |
| Stage 2 | `Q3`, `R8`-`R11`, CHARACTER branch `C7`, `R12`, `RV6` |
| Transformer drive | `C8`, `RV7` TRANSFORMER DRIVE, `C9` |
| Output | `Q2` follower, `R5`-`R7`, `C5` output coupling, `J2` |

`C3` could sit in Stage 1 instead, since the model builds it there
(`addFeedbackStage`); it is placed in Drive here because it is the first part
of the cap-pot-cap attenuator.

**B - each control folded into the stage it feeds (four groups)**

Power; Stage 1; Stage 2 with DRIVE in front of it; Output with TRANSFORMER
DRIVE in front of it.

The exact membership of each group is written out in the group map and
checked by the module: every component in exactly one group.

### 3. Where things live

| what | where | why |
| --- | --- | --- |
| group map (edited here) | `circuits/transistor-preamp/staged-board.drawing.ts` | a source beside its circuit (`CLAUDE.md`: ask whether it will be edited here) |
| derivation module | `tools/draught/intent-from-network.ts` | tooling, with the other draught modules |
| drafts, repairs, renders | `drafted/transistor-preamp/transistor-preamp-staged/<arrangement>/` | the same shape as `drafted/pultec/`, each with a `RECORD.md` |

### 4. The loop, run as the procedure says

For each arrangement: `make draught-doctor`, `make draw` (draft, re-paper to
US Letter, render, measure), look at the render, repair with `akcli` (dry-run
every op-list, read the net diff), re-render, iterate on the measurable costs.
Each `RECORD.md` carries the verification set from the skill before and after
repair, and which arrangement was taken further and why.

### 5. Handing it back

The renders go to the owner **first, side by side, unranked**, with a request
for evaluation and nothing else (`EVALUATING-DRAWINGS.md` §4). Measurements
follow only on request.

**Whether a copperhead page replaces the current sheet is the owner's call**,
made after seeing it. Until then `perfboard.json`, the round-trip tests and the
build guide keep pointing at the existing sheet.

## What this is not

- Not a change to the existing staged sheet.
- Not a general "derive any board's intent" feature. The module is written for
  boards whose components carry `symbol` and a designator map, and refuses
  others by name. The Pultec intents stay as they are.
- Not a verdict on any drawing. Approval is recorded by the owner only.

## Open question for the owner

1. **Is generating the intent from the model the right call**, rather than a
   hand-written JSON file like hi-cut's? Recommended: generated, because a
   hand-typed copy of the circuit is a second place for it to be wrong, and
   the model already holds every fact the intent needs except the grouping.
2. **Are arrangements A and B the right two to start from**, or is there a
   grouping you'd rather see?

## Decisions

| Decision | Who | Why |
| --- | --- | --- |
| Try the copperhead procedure on `transistor-preamp-staged` | owner | *"I'd like to see if our new copperhead hybrid drawing discipline can generate a suitable schematic drawing"* |
| Leave the existing sheet untouched; the copperhead page is a separate candidate | this writer, pending review | the existing sheet is the owner's arrangement and is what the guide prints |
| Model-authoritative | this writer, pending review | an agent-designed circuit (`CLAUDE.md`, `TOOLING.md` step 0) |
| Generate the intent from the `Network` | this writer, pending review | open question 1 |
| Draft arrangements A and B | this writer, pending review | open question 2 |
