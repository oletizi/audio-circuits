# Drawing the staged preamp with copperhead - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `make draw` draft `transistor-preamp-staged` from a copperhead intent generated from its circuit model, as one group, then run the draft through the repair loop to a page the owner can review.

**Architecture:** A small module lowers a `Network` to copperhead's intent shape, reusing `pinNumberFor` and `valueFor` for pin numbers and value spelling. A circuit module opts in by exporting `drawingIntent()`, the same named-export convention `bomConditions` and `powerUpChecks` already use. `make draw` resolves an intent from either the `COMMITTED_INTENT` file registry or that export, and refuses when a board has both or neither. The generated intent is written next to the build output on every run, and is never committed.

**Tech Stack:** TypeScript on Bun, `bun test`, copperhead (pinned), `kicad-cli`, `akcli` (pinned).

**Spec:** `docs/superpowers/specs/2026-11-01-staged-preamp-copperhead-drawing-design.md`

## Global Constraints

- Imports are explicit relative paths with the `.ts` extension (`CLAUDE.md`, Imports).
- No `any`, no `as Type`, no `@ts-ignore`; narrow with type guards.
- Every `throw` names what is missing, where to fix it, and why it is not defaulted (`CLAUDE.md`, "Refusals teach").
- No fallbacks or defaults for missing data: a component with no designator, no `part.symbol`, or a pin with no number refuses.
- Files stay under 500 lines; `tools/cli/draw.ts` (388) and `tools/draught/draw-draft.ts` (302) must stay under it after this plan.
- Supersede means delete: every comment, test and doc line that says `make draw` "does not derive an intent from a Network" is rewritten in the same task that makes it false.
- Commit messages carry no AI attribution lines. Commit and push after each task.
- Never put `#` inside a Bash heredoc or multi-line quoted argument; write the text to a file with the Write tool and pass the file (`git commit -F`).
- Never use `sed -i` or any sed write; edit files with the Edit tool.
- No drawing verdict words in any commit, comment, record or message (`EVALUATING-DRAWINGS.md` §2): better, best, worse, good, bad, clean, readable, legible, clear, tidy, wins, ugly.
- The existing `circuits/transistor-preamp/staged-board.kicad_sch`, `boards/transistor-preamp-staged/perfboard.json` and the build guide are not touched.

---

## File structure

| file | status | responsibility |
| --- | --- | --- |
| `tools/draught/intent-from-network.ts` | create | lower a `Network` plus drawing inputs to a copperhead intent; refuse on missing data |
| `tests/draught/intent-from-network.test.ts` | create | unit refusals, and agreement with all five preamp boards' committed netlists |
| `circuits/transistor-preamp/staged-board.drawing.ts` | create | the staged board's drawing inputs (the one group's caption, net kinds) and its `drawingIntent()` |
| `circuits/transistor-preamp/staged-board.ts` | modify | re-export `drawingIntent` so `make draw` finds it through `perfboard.json` |
| `tools/draught/draw-intent.ts` | create | resolve a board's intent from the registry or the circuit's export; write a generated one to disk |
| `tools/draught/draw-draft.ts` | modify | move `resolveIntentPath` out; rewrite the `COMMITTED_INTENT` comment |
| `tools/cli/draw.ts` | modify | call the new resolver; rewrite the module comment's "does not derive" paragraph |
| `tests/draught/draw.test.ts` | modify | update the no-intent refusal test; add both-sources and staged tests |
| `.claude/skills/drawing-a-schematic/SKILL.md`, `TOOLING.md` | modify | say how a model-authoritative board supplies its intent |
| `drafted/transistor-preamp/transistor-preamp-staged/` | create (Task 4) | the repaired page and its `RECORD.md` |

---

### Task 1: Lower a Network to a copperhead intent

**Files:**
- Create: `tools/draught/intent-from-network.ts`
- Test: `tests/draught/intent-from-network.test.ts`

**Interfaces:**
- Consumes: `pinNumberFor(component, pin, pinNumbers)` and `PinNumbers` from `lib/kicad/from-network.ts`; `valueFor(component)` from `lib/kicad/value-notation.ts`; `Network`, `Component` from `lib/model/types.ts`; `Intent`, `verifyIntentAgainstModel` from `tools/draught/draw-draft.ts` (test only).
- Produces:
  ```ts
  export type NetKind = "ground" | "power"
  export interface DrawingInputs {
    readonly group: string
    readonly netKinds: Readonly<Record<string, NetKind>>
  }
  export interface CopperheadIntent {
    readonly version: 1
    readonly parts: readonly { readonly ref: string; readonly libId: string; readonly value: string; readonly group: string }[]
    readonly nets: readonly { readonly name: string; readonly kind?: NetKind; readonly pins: readonly string[] }[]
    readonly noConnect: readonly string[]
    readonly hints: { readonly groupOrder: readonly string[] }
  }
  export function intentFromNetwork(
    network: Network,
    designators: Readonly<Record<string, string>>,
    pinNumbers: PinNumbers,
    inputs: DrawingInputs,
  ): CopperheadIntent
  ```
  `CopperheadIntent` is structurally assignable to `Intent` (`tools/draught/draw-draft.ts`), so `verifyIntentAgainstModel` accepts it directly.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/draught/intent-from-network.test.ts
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { circuit } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"
import { intentFromNetwork, type DrawingInputs } from "../../tools/draught/intent-from-network.ts"
import { verifyIntentAgainstModel } from "../../tools/draught/draw-draft.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import * as buffered from "../../circuits/transistor-preamp/buffered-board.ts"
import * as feedback from "../../circuits/transistor-preamp/feedback-board.ts"
import * as lab from "../../circuits/transistor-preamp/lab-board.ts"
import * as loop from "../../circuits/transistor-preamp/loop-board.ts"
import * as staged from "../../circuits/transistor-preamp/staged-board.ts"
import { PIN_NUMBERS, RESISTOR } from "../../circuits/transistor-preamp/parts.ts"

const INPUTS: DrawingInputs = { group: "Board", netKinds: { GND: "ground", VCC: "power" } }

function divider(): Network {
  return circuit()
    .resistor("upper", "10k", { a: "VCC", b: "MID" }, RESISTOR)
    .resistor("lower", "4.7k", { a: "MID", b: "GND" }, RESISTOR)
    .done()
}

test("a two-resistor divider lowers to refs, symbols, values, numbered pins and kinds", () => {
  const intent = intentFromNetwork(divider(), { upper: "R1", lower: "R2" }, PIN_NUMBERS, INPUTS)
  expect(intent.version).toBe(1)
  expect(intent.parts).toEqual([
    { ref: "R1", libId: "Device:R", value: "10K", group: "Board" },
    { ref: "R2", libId: "Device:R", value: "4.7K", group: "Board" },
  ])
  expect(intent.nets).toEqual([
    { name: "GND", kind: "ground", pins: ["R2.2"] },
    { name: "MID", pins: ["R1.2", "R2.1"] },
    { name: "VCC", kind: "power", pins: ["R1.1"] },
  ])
  expect(intent.noConnect).toEqual([])
  expect(intent.hints).toEqual({ groupOrder: ["Board"] })
})

test("a component with no designator refuses, naming the component and DESIGNATORS", () => {
  expect(() => intentFromNetwork(divider(), { upper: "R1" }, PIN_NUMBERS, INPUTS)).toThrow(/"lower".*DESIGNATORS/)
})

test("a component with no KiCad symbol refuses, naming the component and part.symbol", () => {
  const network = circuit().resistor("bare", "1k", { a: "A", b: "B" }).done()
  expect(() => intentFromNetwork(network, { bare: "R1" }, PIN_NUMBERS, INPUTS)).toThrow(/"bare".*part\.symbol/)
})

test("two components sharing a designator refuse", () => {
  expect(() => intentFromNetwork(divider(), { upper: "R1", lower: "R1" }, PIN_NUMBERS, INPUTS)).toThrow(/R1/)
})

test("a net kind declared for a net the circuit does not have refuses", () => {
  const inputs: DrawingInputs = { group: "Board", netKinds: { GND: "ground", VDD: "power" } }
  expect(() => intentFromNetwork(divider(), { upper: "R1", lower: "R2" }, PIN_NUMBERS, inputs)).toThrow(/VDD/)
})

// THE FIVE PREAMP BOARDS, against the netlists their own perfboard.json files commit. This
// is what makes the module a claim about real circuits and not only about a divider.
const BOARDS: readonly (readonly [string, Network, Readonly<Record<string, string>>])[] = [
  ["transistor-preamp-lab", lab.transistorPreampLab(), lab.DESIGNATORS],
  ["transistor-preamp-feedback", feedback.transistorPreampFeedback(), feedback.DESIGNATORS],
  ["transistor-preamp-buffered", buffered.transistorPreampBuffered(), buffered.DESIGNATORS],
  ["transistor-preamp-loop", loop.transistorPreampLoop(), loop.DESIGNATORS],
  ["transistor-preamp-staged", staged.transistorPreampStaged(), staged.DESIGNATORS],
]

for (const [board, network, designators] of BOARDS) {
  test(`${board}: the generated intent's net partition is the committed netlist's`, () => {
    const intent = intentFromNetwork(network, designators, PIN_NUMBERS, INPUTS)
    const netlist = fs.readFileSync(path.join(moduleRepoRoot(), "tests/fixtures", `${board}.net`), "utf8")
    const agreement = verifyIntentAgainstModel(intent, netlist)
    expect(agreement.agrees ? [] : agreement.disagreements).toEqual([])
  })
}
```

Before running, confirm the five constructor names against the modules (`grep -n "export function transistorPreamp" circuits/transistor-preamp/*.ts`); they were read off the source when this plan was written.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test ./tests/draught/intent-from-network.test.ts`
Expected: FAIL - `Cannot find module '../../tools/draught/intent-from-network.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// tools/draught/intent-from-network.ts
/**
 * Lower a canonical `Network` to a copperhead intent - for a MODEL-AUTHORITATIVE
 * board, where the drawing is derived from the circuit (`TOOLING.md` step 0).
 *
 * Every fact the intent carries except the grouping is already in the model:
 * refs from the circuit's `DESIGNATORS`, symbols from each part's `symbol`,
 * pin numbers through `pinNumberFor` (the same mapping `toImportedNetlist`
 * uses), and values through `valueFor` (the netlist's own spelling). The
 * grouping and the net kinds are drawing inputs, supplied by the circuit's
 * drawing file. A hand-typed intent would be a second copy of the circuit, and
 * a second place for it to be wrong.
 *
 * Pultec intents are NOT made here: that circuit is schematic-authoritative,
 * and its intents were transcribed from a netlist.
 */
import type { Component, Network } from "../../lib/model/types.ts"
import { pinNumberFor, type PinNumbers } from "../../lib/kicad/from-network.ts"
import { valueFor } from "../../lib/kicad/value-notation.ts"

export type NetKind = "ground" | "power"

/** What a circuit's drawing file supplies: the one thing the model cannot. */
export interface DrawingInputs {
  /** The group every part is placed in. copperhead draws it as one captioned box. */
  readonly group: string
  /** Nets copperhead should draw as ground or power symbols, by net name. */
  readonly netKinds: Readonly<Record<string, NetKind>>
}

export interface CopperheadIntentPart {
  readonly ref: string
  readonly libId: string
  readonly value: string
  readonly group: string
}

export interface CopperheadIntentNet {
  readonly name: string
  readonly kind?: NetKind
  readonly pins: readonly string[]
}

/** copperhead's `schematic.intent.json`, version 1, as far as this repository writes it. */
export interface CopperheadIntent {
  readonly version: 1
  readonly parts: readonly CopperheadIntentPart[]
  readonly nets: readonly CopperheadIntentNet[]
  readonly noConnect: readonly string[]
  readonly hints: { readonly groupOrder: readonly string[] }
}

function refFor(component: Component, designators: Readonly<Record<string, string>>): string {
  const ref = designators[component.id]
  if (ref === undefined) {
    throw new Error(
      `no designator mapped for component "${component.id}". Add it to the circuit's DESIGNATORS ` +
        "map: an intent part is named by its reference designator, and inventing one would put a " +
        "part on the drawing that no board or netlist knows by that name.",
    )
  }
  return ref
}

function libIdFor(component: Component): string {
  const symbol = component.part?.symbol
  if (symbol === undefined) {
    throw new Error(
      `component "${component.id}" has no part.symbol. copperhead draws each part from the KiCad ` +
        "symbol its intent names, so the symbol is set on the part (e.g. RESISTOR in " +
        "circuits/transistor-preamp/parts.ts) rather than guessed from the component's kind.",
    )
  }
  return symbol
}

export function intentFromNetwork(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
  inputs: DrawingInputs,
): CopperheadIntent {
  const parts: CopperheadIntentPart[] = []
  const nets = new Map<string, string[]>()
  const noConnect: string[] = []
  const owner = new Map<string, string>()

  for (const component of network.components) {
    const ref = refFor(component, designators)
    const previous = owner.get(ref)
    if (previous !== undefined) {
      throw new Error(
        `components "${previous}" and "${component.id}" both map to designator "${ref}" in ` +
          "DESIGNATORS. Two parts drawn under one reference would merge on the page and in the " +
          "netlist copperhead writes back.",
      )
    }
    owner.set(ref, component.id)
    parts.push({ ref, libId: libIdFor(component), value: valueFor(component), group: inputs.group })

    for (const pins of [component.pins, ...component.units.map((unit) => unit.pins)]) {
      for (const [pin, connection] of Object.entries(pins)) {
        const member = `${ref}.${pinNumberFor(component, pin, pinNumbers)}`
        if (connection.kind === "nc") {
          noConnect.push(member)
          continue
        }
        const members = nets.get(connection.net) ?? []
        members.push(member)
        nets.set(connection.net, members)
      }
    }
  }

  for (const name of Object.keys(inputs.netKinds)) {
    if (!nets.has(name)) {
      throw new Error(
        `the drawing inputs declare a kind for net "${name}", which this circuit does not have. ` +
          `Its nets are: ${[...nets.keys()].sort().join(", ")}. A kind on a net that does not ` +
          "exist is a drawing file that has drifted from its circuit.",
      )
    }
  }

  const intentNets = [...nets.keys()].sort().map((name): CopperheadIntentNet => {
    const pins = (nets.get(name) ?? []).sort()
    const kind = inputs.netKinds[name]
    return kind === undefined ? { name, pins } : { name, kind, pins }
  })

  return { version: 1, parts, nets: intentNets, noConnect: noConnect.sort(), hints: { groupOrder: [inputs.group] } }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test ./tests/draught/intent-from-network.test.ts && bun run typecheck`
Expected: PASS, 10 tests (5 unit, 5 boards); typecheck exits 0.

If a board test fails, read the disagreement lines: they name a `REF.PIN` set the model and the committed netlist disagree on. That is a finding about the model or the fixture, not about this module. Stop and report it rather than editing the fixture.


- [ ] **Step 5: Commit**

```bash
git add tools/draught/intent-from-network.ts tests/draught/intent-from-network.test.ts
git commit -m "Lower a Network to a copperhead intent, checked against five preamp netlists"
git push
```

---

### Task 2: The staged board's drawing inputs and its `drawingIntent()` export

**Files:**
- Create: `circuits/transistor-preamp/staged-board.drawing.ts`
- Modify: `circuits/transistor-preamp/staged-board.ts` (add one re-export after the existing `export { PIN_NUMBERS } from "./parts.ts"` line, near line 54)
- Test: `tests/draught/intent-from-network.test.ts` (append)

**Interfaces:**
- Consumes: `intentFromNetwork`, `DrawingInputs`, `CopperheadIntent` from Task 1.
- Produces: `export const STAGED_DRAWING: DrawingInputs` and `export function drawingIntent(): CopperheadIntent`, the latter re-exported from `staged-board.ts`. Task 3 reads the export by the name `drawingIntent`.

- [ ] **Step 1: Write the failing test** (append to `tests/draught/intent-from-network.test.ts`)

```ts
import { drawingIntent as stagedDrawingIntent } from "../../circuits/transistor-preamp/staged-board.ts"

test("the staged board exports a one-group intent that agrees with its committed netlist", () => {
  const intent = stagedDrawingIntent()
  const groups = new Set(intent.parts.map((part) => part.group))
  expect([...groups]).toEqual(["Transistor preamp - staged"])
  expect(intent.hints.groupOrder).toEqual(["Transistor preamp - staged"])
  expect(intent.nets.find((net) => net.name === "GND")?.kind).toBe("ground")
  expect(intent.nets.find((net) => net.name === "VCC")?.kind).toBe("power")
  const netlist = fs.readFileSync(path.join(moduleRepoRoot(), "tests/fixtures/transistor-preamp-staged.net"), "utf8")
  const agreement = verifyIntentAgainstModel(intent, netlist)
  expect(agreement.agrees ? [] : agreement.disagreements).toEqual([])
})
```

Move the new `import` line to the top of the file with the others.

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test ./tests/draught/intent-from-network.test.ts`
Expected: FAIL - `drawingIntent` is not exported from `staged-board.ts`.

- [ ] **Step 3: Write the drawing file and the re-export**

```ts
// circuits/transistor-preamp/staged-board.drawing.ts
/**
 * The staged board's drawing inputs: what copperhead needs that the circuit
 * model does not hold.
 *
 * ONE GROUP, the owner's decision (docs/superpowers/specs/
 * 2026-11-01-staged-preamp-copperhead-drawing-design.md): the staged preamp is
 * one signal chain, and copperhead draws a net as wire only when every
 * endpoint is in one group. The caption is the only free text copperhead
 * places.
 *
 * Everything else in the intent - refs, symbols, values, pins - is derived
 * from staged-board.ts by tools/draught/intent-from-network.ts.
 */
import { intentFromNetwork } from "../../tools/draught/intent-from-network.ts"
import type { CopperheadIntent, DrawingInputs } from "../../tools/draught/intent-from-network.ts"
import { PIN_NUMBERS } from "./parts.ts"
import { DESIGNATORS, transistorPreampStaged } from "./staged-board.ts"

export const STAGED_DRAWING: DrawingInputs = {
  group: "Transistor preamp - staged",
  netKinds: { GND: "ground", VCC: "power" },
}

/** The copperhead intent `make draw` drafts this board from. */
export function drawingIntent(): CopperheadIntent {
  return intentFromNetwork(transistorPreampStaged(), DESIGNATORS, PIN_NUMBERS, STAGED_DRAWING)
}
```

In `circuits/transistor-preamp/staged-board.ts`, directly after `export { PIN_NUMBERS } from "./parts.ts"`:

```ts
export { drawingIntent } from "./staged-board.drawing.ts"
```

This is a circular import: the drawing file imports `staged-board.ts`, which re-exports from the drawing file. It is safe because neither module reads the other's bindings at load time, only inside functions. If Bun reports a binding used before initialisation, move `DESIGNATORS` and `transistorPreampStaged` into the drawing file's function body through a dynamic lookup instead. Do not fall back to duplicating `DESIGNATORS`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test ./tests/draught/intent-from-network.test.ts ./tests/circuits/transistor-preamp-staged.test.ts && bun run typecheck`
Expected: PASS; typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add circuits/transistor-preamp/staged-board.drawing.ts circuits/transistor-preamp/staged-board.ts tests/draught/intent-from-network.test.ts
git commit -m "The staged board's drawing inputs: one group, GND and VCC kinds, drawingIntent()"
git push
```

---

### Task 3: `make draw` drafts from a circuit's `drawingIntent()` export

**Files:**
- Create: `tools/draught/draw-intent.ts`
- Modify: `tools/draught/draw-draft.ts` (remove `IntentResolution` and `resolveIntentPath`, lines 122-146; rewrite the `COMMITTED_INTENT` comment, lines 17-32; export `COMMITTED_INTENT`)
- Modify: `tools/cli/draw.ts` (the module comment paragraph beginning `**THIS PLAN DOES NOT DERIVE AN INTENT FROM A \`Network\`**`; Step 2 of `runDraw`, around line 273)
- Modify: `tests/draught/draw.test.ts` (the test at line 169)

**Interfaces:**
- Consumes: `COMMITTED_INTENT`, `parseIntent`, `Intent` from `tools/draught/draw-draft.ts`; `importCircuitModule` from `tools/perfboard/load.ts`; `PerfboardDeclaration` from `tools/perfboard/declaration.ts`; `CopperheadIntent` from Task 1.
- Produces:
  ```ts
  export type DrawIntent =
    | { readonly source: "committed" | "override"; readonly path: string; readonly intent: Intent }
    | { readonly source: "derived"; readonly path: string; readonly intent: Intent }
  export async function resolveDrawIntent(opts: {
    readonly board: string
    readonly declaration: PerfboardDeclaration
    readonly override: string | undefined
    readonly derivedIntentPath: string
    readonly committed?: Readonly<Record<string, string>>
  }): Promise<DrawIntent | { readonly refusal: string }>
  ```
  `path` is always a file on disk that `draftWithCopperhead` can copy.

- [ ] **Step 1: Write the failing tests** (in `tests/draught/draw.test.ts`)

Replace the test at line 169 (`"a board with no committed intent refuses..."`) with:

```ts
test("a board with no intent from either source refuses, naming the board and both sources", async () => {
  // pultec-mid has a page under drafted/pultec/, no COMMITTED_INTENT entry, and its circuit
  // module exports no drawingIntent - so there is nothing to draft from, and it must refuse
  // rather than guess.
  const result = await runDraw({ board: "pultec-mid" })
  expect(result.exitCode).not.toBe(0)
  expect(result.drew).toBe(false)
  expect(result.stderr).toContain("pultec-mid")
  expect(result.stderr).toContain("COMMITTED_INTENT")
  expect(result.stderr).toContain("drawingIntent")
})
```

Add, in a new file `tests/draught/draw-intent.test.ts`:

```ts
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { resolveDrawIntent } from "../../tools/draught/draw-intent.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

function stagedDeclaration() {
  return loadDeclaration(path.join(moduleRepoRoot(), "boards/transistor-preamp-staged/perfboard.json"))
}

test("a circuit exporting drawingIntent drafts from it, written to the path given", async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "draw-intent-"))
  const derivedIntentPath = path.join(scratch, "staged.intent.json")
  try {
    const resolved = await resolveDrawIntent({
      board: "transistor-preamp-staged", declaration: stagedDeclaration(), override: undefined, derivedIntentPath,
    })
    if ("refusal" in resolved) throw new Error(resolved.refusal)
    expect(resolved.source).toBe("derived")
    expect(resolved.path).toBe(derivedIntentPath)
    const written: unknown = JSON.parse(fs.readFileSync(derivedIntentPath, "utf8"))
    expect(written).toEqual(JSON.parse(JSON.stringify(resolved.intent)))
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})

test("a board with BOTH a COMMITTED_INTENT entry and a drawingIntent export refuses", async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "draw-intent-"))
  try {
    const resolved = await resolveDrawIntent({
      board: "transistor-preamp-staged",
      declaration: stagedDeclaration(),
      override: undefined,
      derivedIntentPath: path.join(scratch, "staged.intent.json"),
      committed: { "transistor-preamp-staged": "docs/research/2026-10-29-hi-cut-full-run/base.intent.json" },
    })
    expect("refusal" in resolved && resolved.refusal).toContain("both")
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `bun test ./tests/draught/draw-intent.test.ts ./tests/draught/draw.test.ts`
Expected: FAIL - `draw-intent.ts` does not exist, and the pultec-mid refusal does not mention `drawingIntent`.

- [ ] **Step 3: Write `tools/draught/draw-intent.ts`**

```ts
/**
 * Where `make draw` gets a board's copperhead intent - one of exactly two
 * declared sources, never both and never a guess:
 *
 *   - `COMMITTED_INTENT` (`./draw-draft.ts`): an intent FILE already on disk
 *     from an earlier run. The Pultec boards' path - that circuit is
 *     schematic-authoritative, and its intents were transcribed by hand.
 *   - a `drawingIntent()` export on the circuit module the board's
 *     `perfboard.json` names: an intent GENERATED from the model
 *     (`./intent-from-network.ts`). The model-authoritative path.
 *
 * A board with both refuses: two declarations of one board's drawing input
 * are two places for one fact to be wrong. A board with neither refuses,
 * naming both, rather than inventing an intent.
 *
 * A generated intent is written to `derivedIntentPath` on every run, so the
 * file copperhead reads is the one this run derived - a derived artifact,
 * regenerated every run and never committed (`CLAUDE.md`).
 */
import fs from "node:fs"
import path from "node:path"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import { importCircuitModule } from "../perfboard/load.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { COMMITTED_INTENT, parseIntent, type Intent } from "./draw-draft.ts"

export type DrawIntent = {
  readonly source: "committed" | "override" | "derived"
  readonly path: string
  readonly intent: Intent
}

export type DrawIntentResolution = DrawIntent | { readonly refusal: string }

export async function resolveDrawIntent(opts: {
  readonly board: string
  readonly declaration: PerfboardDeclaration
  /** Test-only: draft from this file, bypassing both sources. */
  readonly override: string | undefined
  readonly derivedIntentPath: string
  /** Test-only: replaces COMMITTED_INTENT. */
  readonly committed?: Readonly<Record<string, string>>
}): Promise<DrawIntentResolution> {
  if (opts.override !== undefined) {
    const abs = path.resolve(opts.override)
    if (!fs.existsSync(abs)) return { refusal: `--intent override ${opts.override} does not exist.` }
    return { source: "override", path: abs, intent: parseIntent(abs) }
  }

  const registry = opts.committed ?? COMMITTED_INTENT
  const committed = registry[opts.board]
  const module = await importCircuitModule(opts.declaration)
  const exported = module["drawingIntent"]
  const circuit = opts.declaration.circuitPath

  if (committed !== undefined && exported !== undefined) {
    return {
      refusal:
        `${opts.board} declares a copperhead intent twice: COMMITTED_INTENT in tools/draught/draw-draft.ts ` +
        `names ${committed}, and ${circuit} exports drawingIntent. Two declarations of one board's drawing ` +
        "input are two places for one fact to be wrong - remove one. A model-authoritative circuit keeps " +
        "the export; a schematic-authoritative one keeps the committed file.",
    }
  }

  if (committed !== undefined) {
    const abs = path.join(moduleRepoRoot(), committed)
    return { source: "committed", path: abs, intent: parseIntent(abs) }
  }

  if (exported === undefined) {
    const known = Object.keys(registry).sort().join(", ")
    return {
      refusal:
        `no copperhead intent is declared for board "${opts.board}". Either add it to COMMITTED_INTENT in ` +
        `tools/draught/draw-draft.ts, pointing at a committed intent file (boards with one: [${known}]), ` +
        `or export drawingIntent() from ${circuit}, generated from the model by ` +
        "tools/draught/intent-from-network.ts. Neither is guessed.",
    }
  }
  if (typeof exported !== "function") {
    return { refusal: `${circuit} exports drawingIntent as a ${typeof exported}, not a function returning an intent.` }
  }

  const generated: unknown = exported()
  fs.mkdirSync(path.dirname(opts.derivedIntentPath), { recursive: true })
  fs.writeFileSync(opts.derivedIntentPath, JSON.stringify(generated, null, 2) + "\n")
  return { source: "derived", path: opts.derivedIntentPath, intent: parseIntent(opts.derivedIntentPath) }
}
```

`parseIntent` re-reads the written file, so a malformed export refuses through the same checks a committed file gets.

- [ ] **Step 4: Rewire `tools/draught/draw-draft.ts`**

Delete `IntentResolution` and `resolveIntentPath` (the block beginning `// --- resolving the intent: a committed one, or a refusal naming the board ---`). Change `const COMMITTED_INTENT` to `export const COMMITTED_INTENT`. Replace its doc comment's last two sentences (`The other four Pultec boards ... until one is added.`) with:

```
 * The other four Pultec boards with a page under `drafted/pultec/` have
 * intents committed in their research run directories but no entry here yet.
 * A MODEL-AUTHORITATIVE board does not belong here at all: its circuit module
 * exports `drawingIntent()` instead, and `./draw-intent.ts` resolves between
 * the two sources.
```

- [ ] **Step 5: Rewire `tools/cli/draw.ts`**

Replace the import of `resolveIntentPath` with `import { resolveDrawIntent } from "../draught/draw-intent.ts"`, and drop `parseIntent` from the `draw-draft.ts` import if nothing else in the file uses it.

Replace the Step 2 block (from `// Step 2: resolve the intent` through the `parseIntent` try/catch) with:

```ts
  // Step 2: resolve the intent - a committed file, a circuit's drawingIntent() export, or a
  // refusal naming the board and both sources.
  const outDir = options.outDir ?? path.join(repoRoot, "build", "draw", board)
  let resolvedIntent: Awaited<ReturnType<typeof resolveDrawIntent>>
  try {
    resolvedIntent = await resolveDrawIntent({
      board, declaration, override: options.intentPath, derivedIntentPath: `${outDir}.intent.json`,
    })
  } catch (error) {
    return refusal(error instanceof Error ? error.message : String(error), advisorySections)
  }
  if ("refusal" in resolvedIntent) return refusal(resolvedIntent.refusal, advisorySections)
  const intent = resolvedIntent.intent
```

Delete the later `const outDir = ...` line in Step 4, since `outDir` is now declared in Step 2. The derived intent sits beside `outDir`, not inside it, because `draftWithCopperhead` empties `outDir` before drafting.

In the module comment, replace the paragraph beginning `**THIS PLAN DOES NOT DERIVE AN INTENT FROM A \`Network\`**` with:

```
 * **AN INTENT COMES FROM ONE OF TWO DECLARED SOURCES** (`../draught/draw-intent.ts`):
 * a committed file named in `COMMITTED_INTENT` (`../draught/draw-draft.ts`) -
 * the schematic-authoritative Pultec path - or a `drawingIntent()` export on
 * the board's circuit module, generated from the model
 * (`../draught/intent-from-network.ts`) - the model-authoritative path. A
 * board with neither refuses, naming both; a board with both refuses too.
```

- [ ] **Step 6: Run the tests**

Run: `bun test ./tests/draught/ && bun run typecheck && wc -l tools/cli/draw.ts tools/draught/draw-draft.ts tools/draught/draw-intent.ts`
Expected: all `tests/draught/` tests PASS; typecheck exits 0; each file under 500 lines.

- [ ] **Step 7: Commit**

```bash
git add tools/draught/draw-intent.ts tools/draught/draw-draft.ts tools/cli/draw.ts tests/draught/draw.test.ts tests/draught/draw-intent.test.ts
git commit -m "make draw drafts from a circuit's drawingIntent() export as well as a committed file"
git push
```

---

### Task 4: Document the model-authoritative path

**Files:**
- Modify: `TOOLING.md` (step 1, "Build the copperhead intent from the repo's own model", near line 287)
- Modify: `.claude/skills/drawing-a-schematic/SKILL.md` ("Running the mechanics", item 2, the sentences beginning `Only \`pultec-hi-cut\` has a \`COMMITTED_INTENT\` entry today`)

- [ ] **Step 1: TOOLING.md step 1** - add after its first paragraph:

```
**For a model-authoritative board, the intent is generated, not written.** Its
circuit module exports `drawingIntent()`, built by
`tools/draught/intent-from-network.ts` from the `Network`, the circuit's
`DESIGNATORS` and `PIN_NUMBERS`, and a small drawing file holding the group and
the net kinds (`circuits/transistor-preamp/staged-board.drawing.ts` is the
first). `make draw` writes it to `build/draw/<board>.intent.json` on every run.
A schematic-authoritative board - the Pultec - keeps a committed, hand-written
intent named in `COMMITTED_INTENT`. `tools/draught/draw-intent.ts` refuses a
board that declares both.
```

- [ ] **Step 2: SKILL.md** - replace the two sentences beginning `Only \`pultec-hi-cut\` has a \`COMMITTED_INTENT\` entry today` through `until one is added.` with:

```
   A board's intent comes from one of two declared sources: a committed
   file in `COMMITTED_INTENT` (`tools/draught/draw-draft.ts`; only
   `pultec-hi-cut` is registered, though all five Pultec boards have intents
   under `docs/research/`), or a `drawingIntent()` export on a
   model-authoritative circuit (`transistor-preamp-staged` is the first). A
   board with neither refuses by name, and so does one with both
   (`tools/draught/draw-intent.ts`).
```

`TOOLING.md` is the original for any text the skill copies; this edit is not one of the three copied sections, so it is made in each file on its own terms.

- [ ] **Step 3: Commit**

```bash
git add TOOLING.md .claude/skills/drawing-a-schematic/SKILL.md
git commit -m "TOOLING and the drawing skill: a model-authoritative board's intent is generated"
git push
```

---

### Task 5: Draft, look, repair, and hand the page to the owner

This task is the procedure in `.claude/skills/drawing-a-schematic/SKILL.md`, not test-driven code. Read that skill and `EVALUATING-DRAWINGS.md` in full before starting. Every number below is recorded before and after repair.

**Files:**
- Create: `drafted/transistor-preamp/transistor-preamp-staged/transistor-preamp-staged.generated-do-not-edit.kicad_sch` (the repaired page, copied from the working sheet)
- Create: `drafted/transistor-preamp/transistor-preamp-staged/RECORD.md`
- Create: `drafted/transistor-preamp/transistor-preamp-staged/transistor-preamp-staged.generated-do-not-edit.svg`

- [ ] **Step 1: Toolchain, then draft**

Run: `make draught-doctor` - expect every pinned tool to match. Then run `make -C boards/transistor-preamp-staged draw`.
Expected: exit 0, a sheet under `build/draw/transistor-preamp-staged/`, a render, and the measurement suite report (`selftest.py` first, then crossings, junction audit, label survey). Save the full output to the scratchpad; it is the "before" column of the record.

- [ ] **Step 2: Look at the render**

Open the whole-page PNG `make draw` wrote, and crop each region with `magick` at a size where the text can be read. Record observations only - what is where, what overlaps what, where the input enters and the output leaves and which way each points - in the vocabulary `EVALUATING-DRAWINGS.md` §2 allows.

- [ ] **Step 3: Repair with akcli, one class at a time**

For each repair: query geometry first (pin positions from the sheet's own `lib_symbols` block, not from `akcli pins`); write an op-list JSON in the scratchpad; `akcli plan --ops <ops.json> <sheet>` and read the net diff, which must show no change except the one intended; then `akcli draw --ops <ops.json> <sheet> --apply`; re-render and look at the crop. Watch the trap index in the skill, especially field angles on a moved part and labels over pin numbers.

- [ ] **Step 4: Verify after repair**

Run, and record each as a number:
- `kicad-cli sch erc --severity-all --format json` - error and warning counts, separately;
- `kicad-cli sch export netlist --format kicadxml`, compared as `REF.PIN` sets against `tests/fixtures/transistor-preamp-staged.net`;
- parenthesis depth (must end at 0, never go negative);
- `python3 draughting/measure/junction_audit.py <sheet>`;
- `python3 draughting/measure/crossings.py <sheet>` and `label_survey.py <sheet>`;
- symbol and pin counts against the draft (a repair changes neither);
- sha256 of the sheet.

A netlist disagreement or an ERC error is the one ground for not sending the page. Fix it and re-verify.

- [ ] **Step 5: Commit the page and its record**

Copy the repaired sheet and its SVG export into `drafted/transistor-preamp/transistor-preamp-staged/`. Write `RECORD.md` in the shape of `drafted/pultec/pultec-hi-cut/RECORD.md`: a table naming where the page came from (`make draw` from `drawingIntent()`, one group), the paper, the repairs applied, the before and after measurements, the sha256, and **status: unreviewed**. No verdict words.

```bash
git add drafted/transistor-preamp/transistor-preamp-staged/
git commit -F <scratchpad>/record-commit-msg.txt
git push
```

- [ ] **Step 6: Send the render first**

Send the whole-page PNG to the owner **before** writing any summary, with one question: a request for his evaluation. If he asks, place it beside a render of the existing `staged-board.kicad_sch`, unranked. Measurements only on request. Whether the copperhead page replaces the existing sheet is his decision, recorded by him.
