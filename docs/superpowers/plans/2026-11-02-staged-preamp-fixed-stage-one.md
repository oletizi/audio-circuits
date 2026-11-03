# Staged preamp: fixed stage 1 - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the staged board's four stage-1 trim-pots with fixed parts at the owner's tuned values (feedback 820k, base to ground 270k, collector 2.7k, emitter fully bypassed), and bring the schematic, stripboard layout, parts list and build guide into line.

**Architecture:** `addFeedbackStage` takes the stage-1 leg parts as a parameter - trimmed (today's parts, for the feedback, buffered and loop boards) or fixed (one resistor per leg, no bypass trim). The staged board passes the fixed variant. Everything downstream of the model is regenerated or redone from it.

**Tech Stack:** TypeScript on Bun, `bun test`, KiCad (`kicad-cli`), akcli (pinned), the VeroRoute fork (headless verbs), ngspice via `lib/sim/`.

**Spec:** `docs/superpowers/specs/2026-11-02-staged-preamp-fixed-stage-one-design.md`

## Global Constraints

- Feedback leg **820k**, base-to-ground leg **270k**, collector leg **2.7k**, emitter bypass: **C1 straight to GND** (no trim). Staged board only.
- The feedback, buffered and loop boards are unchanged, part for part and id for id; their tests stay green untouched.
- Imports are explicit relative paths with `.ts`. No `any`, no `as Type`, no `@ts-ignore`. No fallbacks or defaults: a missing value refuses, naming what and where.
- Files under 500 lines.
- Ids are semantic; designators live only in `DESIGNATORS`. The fixed leg resistors take **R1, R2, R3** (the positions of the floor resistors they replace). **RV1-RV4 are not reused.**
- Supersede means delete: no comment, note or doc may keep describing the staged board's stage-1 trims.
- A drawing repair is committed under `drafted/transistor-preamp/transistor-preamp-staged/repair/` with a checked replay (`TOOLING.md` step 5.5). No drawing verdict words (`EVALUATING-DRAWINGS.md` §2).
- Commit messages carry no AI attribution lines. Never `#` inside a Bash heredoc or multi-line quoted argument; write such text with the Write tool and use `git commit -F`. Never `sed -i`.
- Commit and push after each task.

---

## File structure

| file | change |
| --- | --- |
| `circuits/transistor-preamp/feedback-board.ts` | `StageOneLegs`, `TRIMMED_STAGE_ONE`; `addFeedbackStage(builder, couplesTo, legs)` |
| `circuits/transistor-preamp/buffered-board.ts`, `loop-board.ts` | pass `TRIMMED_STAGE_ONE`; buffered exports `followerNotes()` |
| `circuits/transistor-preamp/staged-board.ts` | fixed stage 1; own `DESIGNATORS`; settings, notes, power-up and BOM conditions without stage-1 trims |
| `tests/circuits/transistor-preamp-feedback.test.ts` (or a new file) | the fixed variant's parts and nets |
| `tests/circuits/transistor-preamp-staged.test.ts` | updated for the fixed stage 1 |
| `circuits/transistor-preamp/staged-board.kicad_sch`, `tests/fixtures/transistor-preamp-staged.net` | sheet repaired with akcli; netlist regenerated |
| `drafted/transistor-preamp/transistor-preamp-staged/` | the repaired page, its record, and `repair/` |
| `boards/transistor-preamp-staged/*.vrt`, `bom.json`, `BOM.md` | layout re-placed; parts list regenerated |
| `tests/fixtures/stripboard/transistor-preamp-staged.dump`, `provenance.txt` | frozen dump re-captured by its recorded command |

---

### Task 1: `addFeedbackStage` takes its leg parts as a parameter

No board changes behaviour in this task. The staged board still passes the trimmed legs; Task 2 switches it.

**Files:**
- Modify: `circuits/transistor-preamp/feedback-board.ts`
- Modify: `circuits/transistor-preamp/buffered-board.ts`, `circuits/transistor-preamp/loop-board.ts`, `circuits/transistor-preamp/staged-board.ts` (call sites only)
- Test: `tests/circuits/transistor-preamp-stage-one.test.ts` (new)

**Interfaces - Produces:**
```ts
export type StageOneLegs =
  | { readonly kind: "trimmed" }
  | {
      readonly kind: "fixed"
      readonly feedback: string
      readonly baseToGround: string
      readonly collector: string
    }
export const TRIMMED_STAGE_ONE: StageOneLegs
export function addFeedbackStage(builder: Builder, couplesTo: string, legs: StageOneLegs): void
```
Fixed-variant component ids: `feedback_resistor` (COLLECTOR-BASE), `base_ground_resistor` (BASE-GND), `collector_resistor` (VCC-COLLECTOR); `emitter_bypass_cap` keeps its id with pin b on `GND`. Every other stage-1 part is identical in both variants.

- [ ] **Step 1: Write the failing test** - `tests/circuits/transistor-preamp-stage-one.test.ts`:

```ts
import { expect, test } from "bun:test"
import { circuit } from "../../lib/model/index.ts"
import type { Component, Network } from "../../lib/model/index.ts"
import { addFeedbackStage, TRIMMED_STAGE_ONE } from "../../circuits/transistor-preamp/feedback-board.ts"

function stageOne(legs: Parameters<typeof addFeedbackStage>[2]): Network {
  const builder = circuit()
  builder.port("input", "IN_EXT").port("out", "OUT")
  addFeedbackStage(builder, "OUT", legs)
  return builder.done()
}

function byId(network: Network, id: string): Component {
  const found = network.components.find((component) => component.id === id)
  if (found === undefined) throw new Error(`no component "${id}"`)
  return found
}

function nets(component: Component): readonly string[] {
  return component.units.flatMap((unit) =>
    Object.values(unit.pins).map((connection) => (connection.kind === "net" ? connection.net : "nc")))
}

test("the fixed variant has one resistor per leg and no trims", () => {
  const network = stageOne({ kind: "fixed", feedback: "820k", baseToGround: "270k", collector: "2.7k" })
  const ids = network.components.map((component) => component.id)
  expect(ids.filter((id) => id.endsWith("_trim") || id.endsWith("_floor"))).toEqual([])
  expect(nets(byId(network, "feedback_resistor"))).toEqual(["COLLECTOR", "BASE"])
  expect(nets(byId(network, "base_ground_resistor"))).toEqual(["BASE", "GND"])
  expect(nets(byId(network, "collector_resistor"))).toEqual(["VCC", "COLLECTOR"])
  expect(nets(byId(network, "emitter_bypass_cap"))).toEqual(["EMITTER", "GND"])
  expect(byId(network, "feedback_resistor").parameters).toEqual({ ohms: 820_000 })
  expect(byId(network, "base_ground_resistor").parameters).toEqual({ ohms: 270_000 })
  expect(byId(network, "collector_resistor").parameters).toEqual({ ohms: 2_700 })
})

test("the trimmed variant is today's stage 1, part for part", () => {
  const ids = stageOne(TRIMMED_STAGE_ONE).components.map((component) => component.id).sort()
  expect(ids).toEqual([
    "base_ground_floor", "base_ground_trim", "collector_floor", "collector_trim",
    "emitter_bypass_cap", "emitter_bypass_trim", "emitter_dc_resistor", "feedback_floor",
    "feedback_trim", "gain_transistor", "input_coupling_cap", "output_coupling_cap",
    "power_header", "supply_decoupling_cap",
  ])
})
```

If `circuit().done()` refuses a single-pin net in this harness (validation requires a single-pin net to be a declared port), declare the extra ports it names rather than adding parts; say so in the report.

- [ ] **Step 2: Run it to verify it fails** - `bun test ./tests/circuits/transistor-preamp-stage-one.test.ts` - expect FAIL: `TRIMMED_STAGE_ONE` is not exported.

- [ ] **Step 3: Implement** in `feedback-board.ts`. Add the type and constant above `addFeedbackStage`, with a doc comment: trimmed legs are the bench boards' (feedback, buffered, loop); fixed legs are for a board built at already-tuned values (the staged board). Change `addFeedbackStage` so its first four statements become:

```ts
export function addFeedbackStage(builder: Builder, couplesTo: string, legs: StageOneLegs): void {
  if (legs.kind === "trimmed") {
    addLeg(builder, FEEDBACK_LEGS.feedback, "FEEDBACK", COLLECTOR, BASE)
    addLeg(builder, FEEDBACK_LEGS.baseToGround, "BASE_GROUND", BASE, GND)
    addLeg(builder, FEEDBACK_LEGS.collector, "COLLECTOR_LOAD", VCC, COLLECTOR)
  } else {
    builder
      .resistor("feedback_resistor", legs.feedback, { a: COLLECTOR, b: BASE }, RESISTOR)
      .resistor("base_ground_resistor", legs.baseToGround, { a: BASE, b: GND }, RESISTOR)
      .resistor("collector_resistor", legs.collector, { a: VCC, b: COLLECTOR }, RESISTOR)
  }

  builder.resistor("emitter_dc_resistor", "1.5k", { a: EMITTER, b: GND }, RESISTOR)
  const bypassTo = legs.kind === "trimmed" ? "BYPASS_CAP" : GND
  builder.capacitor("emitter_bypass_cap", "220uF", { a: EMITTER, b: bypassTo },
    electrolytic("CP_Radial_D8.0mm_P3.50mm"))
  if (legs.kind === "trimmed") {
    const bypass = FEEDBACK_LEGS.emitterBypass
    builder.add(trim(bypass.trimId, bypass.trim, "BYPASS_CAP", GND))
  }
```
(the rest of the function unchanged). Update its doc comment to describe the parameter. Pass `TRIMMED_STAGE_ONE` at the four call sites (`feedback-board.ts`'s own, buffered, loop, staged).

- [ ] **Step 4: Run** `bun test ./tests/circuits/ && bun run typecheck` - expect all PASS (no board's netlist changed).

- [ ] **Step 5: Commit and push.**

---

### Task 2: The staged board at fixed values, with its schematic and netlist

The model and the sheet change together, because `tests/circuits/transistor-preamp-staged.test.ts` checks the committed sheet's netlist against the model. **The stripboard layout is NOT changed here**: after this task `make -C boards/transistor-preamp-staged check` and the stripboard tests that read the staged layout are expected to fail, and Task 3 makes them pass. List every failing test by name in the report; any failure outside that set is a defect in this task.

**Files:** `circuits/transistor-preamp/staged-board.ts`, `circuits/transistor-preamp/buffered-board.ts` (add `followerNotes()`), `tests/circuits/transistor-preamp-staged.test.ts`, `circuits/transistor-preamp/staged-board.kicad_sch`, `tests/fixtures/transistor-preamp-staged.net`, `drafted/transistor-preamp/transistor-preamp-staged/` (page, `RECORD.md`, `repair/`), `docs/schematic/verdicts.md`.

- [ ] **Step 1: The model.** In `staged-board.ts`:
  - define `export const STAGE_ONE: StageOneLegs = { kind: "fixed", feedback: "820k", baseToGround: "270k", collector: "2.7k" }` with a comment citing the spec and the owner's choice, and pass it to `addFeedbackStage`;
  - give the board its own `DESIGNATORS`: the buffered board's map minus the ids that no longer exist on this board (`feedback_floor`, `feedback_trim`, `base_ground_floor`, `base_ground_trim`, `collector_floor`, `collector_trim`, `emitter_bypass_trim`), plus `feedback_resistor: "R1"`, `base_ground_resistor: "R2"`, `collector_resistor: "R3"`, plus the existing Q3 / panel entries. Add a test that every component in the network has a designator and every designator names a component;
  - `StagedSetting` becomes the panel controls only (`drive`, `character`, `transformerDrive`); `START` and `controlStateFor` drop the stage-1 trims;
  - `buffered-board.ts`: split its follower lines out of `schematicNotes()` into an exported `followerNotes()`; `schematicNotes()` returns `[...feedbackNotes(), ...followerNotes()]` (unchanged text);
  - staged `schematicNotes()` (printed in the guide as Build notes) becomes: a line that stage 1 is fixed at the values tuned by hand on the buffered board - R1 820k feedback, R2 270k base to ground, R3 2.7k collector, emitter fully bypassed - then `followerNotes()`, then the PANEL CONTROLS lines;
  - `powerUpConditions()` and anything else that names stage-1 trims stops naming them.
  Update `tests/circuits/transistor-preamp-staged.test.ts` to match: tests that assert stage-1 trim positions are rewritten for the fixed parts, not deleted, unless they test something that no longer exists - say which in the report. Run `bun test ./tests/circuits/ ./tests/draught/`; the committed-schematic agreement test is expected to fail until Step 2.

- [ ] **Step 2: The schematic.** Read `.claude/skills/drawing-a-schematic/SKILL.md`, `EVALUATING-DRAWINGS.md` and `TOOLING.md` steps 3-6 first. This is a **repair of an existing page** - no draft. Working in a scratch copy, with akcli (plan, read the net diff, then `draw --apply`): delete RV1-RV4 and the floor resistors' old wiring as needed; set R1, R2, R3 to their new values; place nothing new where an existing symbol can be re-valued; route C1's minus side to GND; set each part's Footprint from the model (as the promotion did, `288bd0a`). Re-render, look at every changed region, iterate on measurable costs. Verify: `kicad-cli sch export netlist` partition equals `toImportedNetlist(transistorPreampStaged(), DESIGNATORS, PIN_NUMBERS)`; ERC 0 errors; parenthesis depth 0; `draughting/measure/junction_audit.py` orphan junctions 0.

- [ ] **Step 3: Commit the repair, per `TOOLING.md` step 5.5.** Under `drafted/transistor-preamp/transistor-preamp-staged/repair/`: every op-list in order, every script, and a `REPLAY.md` from the **current committed** `circuits/transistor-preamp/staged-board.kicad_sch` sha256 (`402e0f38...`, or whatever HEAD holds - check) to the new sheet's sha256. Replay it and confirm the sha256 matches before committing. Copy the repaired sheet to `circuits/transistor-preamp/staged-board.kicad_sch`. Regenerate the netlist with `make -C boards/transistor-preamp-staged netlist-agrees` (it rewrites `tests/fixtures/transistor-preamp-staged.net`; that target's own test then passes).

- [ ] **Step 4: Records.** In `drafted/.../RECORD.md` and `docs/schematic/verdicts.md`, add that the page changed (stage 1 fixed, per this spec), the new sha256, and that it awaits the owner's review. No verdict words.

- [ ] **Step 5: Verify and commit.** `bun run typecheck`; `bun test ./tests/circuits/ ./tests/draught/ ./tests/guide/` green. Run `bun test` once and list every failure; each must be a test that reads the staged stripboard layout. Commit and push. Report the absolute path of a whole-page PNG render of the new sheet.

---

### Task 3: Re-place the staged stripboard and re-capture its frozen dump

**Files:** `boards/transistor-preamp-staged/transistor-preamp-staged.perfboard.vrt` and its `.png` renders, `tests/fixtures/stripboard/transistor-preamp-staged.dump`, `tests/fixtures/stripboard/provenance.txt`, and any staged-specific expectations in `tests/stripboard/` that the new layout changes.

- [ ] **Step 1:** Read `CLAUDE.md` on layouts and the commit `60ded02`'s message (how the current layout was made: re-import from the netlist, then headless `--move`/`--rotate`/`--stretch`, wire links via `--author add-wire`). The constraint from that commit still binds: **fits 35-strip x 27-hole stock with no cuts if achievable**; if it is not, report the smallest stock it fits and the cut count, as a finding.
- [ ] **Step 2:** Re-place the board for the new parts (three resistors where four trimmers and three floor resistors were; C1 to GND). Commit the commands used as a script beside the layout, the way the drawing repair is committed - the layout is the same kind of work.
- [ ] **Step 3:** `make -C boards/transistor-preamp-staged check` passes; `make cuts` and `make guide` succeed.
- [ ] **Step 4:** Re-capture `tests/fixtures/stripboard/transistor-preamp-staged.dump` **by the command `provenance.txt` records for it**, and update `provenance.txt`'s entry: why it was re-captured (this plan), the input board's sha256, the binary's commit. Update any staged-specific numbers in `tests/stripboard/` that the new layout changes (cut counts, extents), each change named in the report with the measured value that justifies it - never loosen a check to make it pass.
- [ ] **Step 5:** Full `bun test` green, `bun run typecheck` clean. Commit and push. Report the absolute paths of the layout renders.

---

### Task 4: Parts list and build guide

- [ ] **Step 1:** `make -C boards/transistor-preamp-staged bom`. Four trimmers out, R1/R2/R3 at their new values; any line reported "not chosen" is a finding to report, not to guess.
- [ ] **Step 2:** `make -C boards/transistor-preamp-staged guide`. Check: page 2 is the new sheet; the power-up checks reflect the fixed stage 1; Build notes name the fixed values and no stage-1 trims; the parts list in the guide has no RV1-RV4.
- [ ] **Step 3:** Grep `circuits/transistor-preamp/`, `boards/transistor-preamp-staged/`, `docs/transistor-preamp/` and `README.md` for statements that the staged board's stage 1 is trimmed (`RV1`-`RV4` in a staged context, "trim" in the staged notes) and fix each. Commit and push.
