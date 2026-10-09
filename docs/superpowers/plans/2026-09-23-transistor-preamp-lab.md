# Transistor Preamp Lab Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Model the jumper-and-trim-pot transistor preamp lab board, generate a KiCad schematic stub from the model, and set the board up in the perfboard workflow, ready for the operator to arrange the schematic and lay out the stripboard.

**Architecture:** One circuit function (`transistorPreampLab()`) is the single source for simulation, the KiCad stub and the VeroRoute netlist. Named bench settings are `ControlState`s over its jumpers and trim-pots. A new stub writer lowers the model into a label-connected `.kicad_sch` using KiCad symbols vendored into the repo. A new `perfboard import` verb creates the board's first `.vrt`.

**Tech Stack:** TypeScript on Bun (`bun test`), ngspice via `eecircuit-engine`, KiCad 10 (`kicad-cli`) for the round-trip check, the pinned VeroRoute fork for layout.

**Spec:** `docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md` (revision 2). Read it before starting. The brief it serves is `docs/transistor-preamp/microphone-preamp-feedback-lab.md`.

**Where this plan goes beyond or tightens the spec**, each found while planning against the code:
- Task 1: `eecircuit-engine` is undeclared in `package.json`, so the simulation tests cannot run in a fresh checkout.
- Task 2: the spec says `TO-92_Inline*`; this plan maps the exact name only, because `TO-92_Inline_Wide` and the horizontal variants have different geometry.
- Task 4: `toSpiceNetlist` has no `.op` route; the sanity checks need one.
- Task 10: `perfboard update` needs an existing `.vrt`; a new board needs `import` (the fork's `--import`).

## Global Constraints

- **Imports are explicit relative paths with the `.ts` extension.** `import { circuit } from "../../lib/model/index.ts"`. Never extensionless, never a path alias.
- **No fallbacks, no mock data outside tests.** Every unhandled case throws an error naming the thing, the observed state and the fix.
- **Never bypass typing.** No `any`, no `as Type` casts, no `@ts-ignore`. Narrow with type predicates (`tools/perfboard/guards.ts` shows the pattern).
- **Files stay under 300–500 lines.** Split by responsibility if one grows past that.
- **Semantic ids in circuit source; designators only in `DESIGNATORS`.**
- **Values are bench starting points.** Do not add value-precision tests beyond what a task specifies. The simulation checks are sanity bounds, not predictions.
- **`bun test` and `bun run typecheck` pass before every commit.** Report the actual test counts. Never reshape a test to hit a number.
- **Commit and push after each task.** Commit messages carry NO AI attribution of any kind: no `Co-Authored-By`, no `Claude-Session:`, no generated-with footer, no session links.
- **Never put `#` characters inside a Bash heredoc or multi-line quoted argument.** Write multi-line commit messages to a file with the Write tool and use `git commit -F <file>`.
- **Never use `sed` to write files.** Use the Edit and Write tools.
- **Use the Write tool to put every file on disk.** Do not describe a file without writing it.

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `bun.lock` | **Modify.** Declare `eecircuit-engine`, which `lib/sim/` imports but no manifest declares. |
| `lib/kicad/import-string.ts` | **Modify.** `TO-92_Inline` → `TO92`, `Potentiometer_Bourns_3006P_Horizontal` → `TRIM_3006P`, fixed three-pin counts. |
| `lib/kicad/value-notation.ts` | **Modify.** Potentiometers format as resistances; megohms format; switches take their part name. |
| `lib/sim/netlist.ts` | **Modify.** Add `toSpiceOperatingPointNetlist` sharing the AC deck's body. |
| `circuits/transistor-preamp/lab-board.ts` | **Create.** The circuit, `LEGS`, `DESIGNATORS`, `PIN_NUMBERS`. |
| `circuits/transistor-preamp/lab-settings.ts` | **Create.** `legPosition`, `SETTINGS`, `controlStateFor`, `schematicNotes`. |
| `circuits/transistor-preamp/index.ts` | **Create.** Re-exports both, as the one module tools load. |
| `lib/kicad/symbol-library.ts` | **Create.** Raw-text symbol extraction, `extends` flattening, pin geometry, vendored-symbol loading. |
| `lib/kicad/symbols/**` | **Create.** Seven vendored symbol definitions plus `PROVENANCE.md`. |
| `tools/kicad/vendor-symbols.ts` | **Create.** Re-runnable script that regenerates `lib/kicad/symbols/` from an installed KiCad. |
| `lib/kicad/from-network.ts` | **Modify.** Export `pinNumberFor`. |
| `lib/kicad/schematic.ts` | **Create.** `writeSchematicStub`. |
| `tools/perfboard/check.ts`, `tools/perfboard/load.ts` | **Modify.** Export the `DESIGNATORS`/`PIN_NUMBERS` validators and `isNetwork` for reuse. |
| `tools/cli/schematic-stub.ts` | **Create.** The one-shot stub verb. |
| `tools/perfboard/import.ts` | **Create.** `runImport`, a board's first `.vrt`. |
| `tools/perfboard/verbs.ts` | **Modify.** Export `runnerFor`, `tempPathAlongside`, `cleanupProduced`. |
| `tools/cli/perfboard-binary-verbs.ts`, `tools/cli/perfboard.ts`, `make/board.mk` | **Modify.** Wire `import`. |
| `boards/transistor-preamp-lab/` | **Create.** `perfboard.json`, `Makefile`, the first `.vrt`. |
| `circuits/transistor-preamp/lab-board.kicad_sch` | **Create (generated once).** The stub the operator takes over. |
| `tests/fixtures/transistor-preamp-lab.net` | **Create (by `netlist-sync`).** The schematic's netlist export. |
| `tests/circuits/transistor-preamp-lab.test.ts` | **Create.** Structure, settings, simulation, KiCad round trip, fixture agreement. `make netlist-agrees` runs this file by name. |

---

### Task 1: Declare the simulation engine dependency

`lib/sim/ac.ts` and `lib/sim/operating-point.ts` import `eecircuit-engine`, but `package.json` has never declared it. Sibling worktrees pass only because of stale `node_modules`. In a fresh checkout, `bun test` shows **376 pass, 12 fail**, all from `Cannot find package 'eecircuit-engine'`.

**Files:**
- Modify: `package.json`
- Modify: `bun.lock` (by `bun install`)

**Interfaces:**
- Produces: `eecircuit-engine` 1.5.8 resolvable from `lib/sim/`.

- [ ] **Step 1: Confirm the failure**

Run: `bun test 2>&1 | tail -4`
Expected: `376 pass`, `12 fail`, and `Cannot find package 'eecircuit-engine'` in the output.

- [ ] **Step 2: Declare it**

1.5.8 is the version installed in every sibling worktree that runs the simulations today.

Run: `bun add eecircuit-engine@1.5.8`

- [ ] **Step 3: Verify**

Run: `bun test 2>&1 | tail -4 && bun run typecheck`
Expected: `0 fail`, typecheck clean. Record the pass count, because it is the baseline for the tasks after this one.

- [ ] **Step 4: Commit and push**

```bash
git add package.json bun.lock
git commit -m "Declare eecircuit-engine, which lib/sim imports but no manifest declared"
git push
```

---

### Task 2: TO-92 and Bourns 3006P footprints lower to VeroRoute

**Files:**
- Modify: `lib/kicad/import-string.ts` (`DERIVABLE_SHAPES`, `derive`, `declaredPinCount`)
- Test: `tests/kicad/import-string.test.ts`

**Interfaces:**
- Produces: `importStringFor("Package_TO_SOT_THT:TO-92_Inline") === "TO92"`, `importStringFor("Potentiometer_THT:Potentiometer_Bourns_3006P_Horizontal") === "TRIM_3006P"`, `declaredPinCount("TO92") === 3`, `declaredPinCount("TRIM_3006P") === 3`.

The type names come from the pinned fork's `Src/CompTypes.h`: `UpdateMaps(COMP::TO92, "TO92", "TO92")` and `UpdateMaps(COMP::TRIM_3006P, "Bourns 3006P", "TRIM_3006P")`. Only these **exact** footprint names map. `TO-92_Inline_Wide`, `TO-92`, the horizontal TO-92 variants and every other trimmer keep refusing, because their geometry differs from VeroRoute's fixed shape.

- [ ] **Step 1: Retarget the two existing tests that use TO-92 as their "unrecognized" example**

In `tests/kicad/import-string.test.ts`, the tests "an unrecognized family refuses, listing the shapes that derive" and "an override wins over the derivation" use `"Package_TO_SOT_THT:TO-92_Inline"` as a footprint that derives nothing. After this task it derives, so change both to `"Package_TO_SOT_THT:TO-220-3_Vertical"`. In the first test the regex becomes `/TO-220-3_Vertical[\s\S]*R_Axial[\s\S]*PinHeader_1x/`. Update the comment in the override test to name the new footprint.

- [ ] **Step 2: Write the failing tests**

Append to `tests/kicad/import-string.test.ts`:

```ts
test("the exact TO-92 inline and Bourns 3006P footprints derive their fixed VeroRoute types", () => {
  expect(importStringFor("Package_TO_SOT_THT:TO-92_Inline")).toBe("TO92")
  expect(importStringFor("Potentiometer_THT:Potentiometer_Bourns_3006P_Horizontal")).toBe("TRIM_3006P")
})

test("neighbouring TO-92 and trimmer footprints still refuse", () => {
  for (const footprint of [
    "Package_TO_SOT_THT:TO-92_Inline_Wide",
    "Package_TO_SOT_THT:TO-92",
    "Package_TO_SOT_THT:TO-92_Inline_Horizontal1",
    "Potentiometer_THT:Potentiometer_Bourns_3006W_Horizontal",
    "Potentiometer_THT:Potentiometer_Bourns_3296W_Vertical",
  ]) {
    expect(() => importStringFor(footprint)).toThrow(/no VeroRoute import string/)
  }
})

test("fixed-geometry three-pin types declare three pins", () => {
  expect(declaredPinCount("TO92")).toBe(3)
  expect(declaredPinCount("TRIM_3006P")).toBe(3)
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `bun test tests/kicad/import-string.test.ts`
Expected: the three new tests FAIL. The two retargeted tests PASS.

- [ ] **Step 4: Implement**

In `lib/kicad/import-string.ts`, add two lines to the `DERIVABLE_SHAPES` array, after the `PinHeader_1x` line, in the same column layout:

```ts
  "  TO-92_Inline (exactly)                 -> TO92",
  "  Potentiometer_Bourns_3006P_Horizontal  -> TRIM_3006P",
```

Above `function derive`, add:

```ts
/**
 * Footprints whose VeroRoute type is a fixed shape rather than a derived
 * span or count. Each name is matched EXACTLY: a neighbouring variant (a
 * wide-pitch TO-92, a vertical trimmer) has different geometry, and mapping it
 * here would place the part on the wrong holes.
 *
 * Evidence: the pinned fork's Src/CompTypes.h,
 *   UpdateMaps(COMP::TO92,       "TO92",         "TO92");
 *   UpdateMaps(COMP::TRIM_3006P, "Bourns 3006P", "TRIM_3006P");
 */
const FIXED_SHAPE_TYPES: ReadonlyMap<string, string> = new Map([
  ["TO-92_Inline", "TO92"],
  ["Potentiometer_Bourns_3006P_Horizontal", "TRIM_3006P"],
])
```

In `derive`, immediately after `const bare = bareName(footprint)`, add:

```ts
  const fixed = FIXED_SHAPE_TYPES.get(bare)
  if (fixed !== undefined) return fixed
```

Replace `declaredPinCount` with:

```ts
/** Pin counts of the fixed-shape types in FIXED_SHAPE_TYPES. */
const FIXED_SHAPE_PIN_COUNTS: ReadonlyMap<string, number> = new Map([
  ["TO92", 3],
  ["TRIM_3006P", 3],
])

/**
 * Pin count a pin-count-suffixed or fixed-shape import string declares, or
 * null when the type carries a lead span instead.
 *
 * A lead span cannot be validated this way: RESISTOR4 spans four grid steps
 * but still has two pins, so its suffix says nothing about pin numbering.
 */
export function declaredPinCount(importStr: string): number | null {
  const fixed = FIXED_SHAPE_PIN_COUNTS.get(importStr)
  if (fixed !== undefined) return fixed
  for (const type of ["SIP", "DIP", "PADS"]) {
    // Anchored, so CAP_ELECTRO_200 is never read as a PADS-style count.
    const match = new RegExp(`^${type}([0-9]+)$`).exec(importStr)
    if (match !== null) {
      const raw = match[1]
      if (raw !== undefined) return Number(raw)
    }
  }
  return null
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `bun test tests/kicad/ && bun run typecheck`
Expected: all PASS, typecheck clean.

- [ ] **Step 6: Commit and push**

```bash
git add lib/kicad/import-string.ts tests/kicad/import-string.test.ts
git commit -m "Lower TO-92 inline and Bourns 3006P footprints to VeroRoute's fixed types"
git push
```

---

### Task 3: Trim-pots, megohms and jumpers get netlist values

**Files:**
- Modify: `lib/kicad/value-notation.ts`
- Test: `tests/kicad/value-notation.test.ts`

**Interfaces:**
- Produces: `valueFor(pot)` gives the resistance spelling (`"50K"`, `"1M"`). Resistances from 1k up to, but not including, 10M format (`"1M"`, `"1.5M"`). `valueFor(switch)` gives `part.mpn`, else the symbol's part name, else throws.

- [ ] **Step 1: Update the tests whose range this widens**

In `tests/kicad/value-notation.test.ts`:

- In "decades the board does not exercise are refused, not guessed", replace the `2e6` line with `expect(() => valueFor(resistor(1e7))).toThrow(/1k.*10M/s)`, and change the `470` line's regex to `/1k.*10M/s`.
- Replace the test "resistor boundaries: 1000 ohms, 999000 ohms both format, 999001 refuses" with:

```ts
test("resistor boundaries: 1k formats, the K/M boundary is 1M, 10M refuses", () => {
  expect(valueFor(resistor(1000))).toBe("1K")
  expect(valueFor(resistor(999000))).toBe("999K")
  expect(valueFor(resistor(1e6))).toBe("1M")
  expect(valueFor(resistor(1.5e6))).toBe("1.5M")
  expect(() => valueFor(resistor(1e7))).toThrow(/1k.*10M/s)
})
```

- [ ] **Step 2: Write the failing tests**

Append:

```ts
test("a trim-pot's value is its resistance, spelled like a resistor's", () => {
  const pot = (ohms: number): Component => ({
    id: "trim", kind: "potentiometer", parameters: { ohms, taper: { type: "linear" } },
    pins: {}, units: [], part: { mpn: "3006P", symbol: "Device:R_Potentiometer_Trim" },
  })
  expect(valueFor(pot(50000))).toBe("50K")
  expect(valueFor(pot(1e6))).toBe("1M")
})

test("a jumper's value is its part name, as for a connector", () => {
  expect(valueFor({
    id: "jumper", kind: "switch",
    parameters: { positions: ["fitted", "removed"], contacts: { fitted: [["1", "2"]], removed: [] } },
    pins: {}, units: [], part: { symbol: "Jumper:Jumper_2_Open" },
  })).toBe("Jumper_2_Open")
})

test("a switch with neither an mpn nor a symbol refuses", () => {
  expect(() => valueFor({
    id: "bare_switch", kind: "switch",
    parameters: { positions: ["a"], contacts: { a: [] } },
    pins: {}, units: [],
  })).toThrow(/bare_switch/)
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `bun test tests/kicad/value-notation.test.ts`
Expected: the trim-pot and jumper tests FAIL (they are refused today). The megohm boundary test FAILs.

- [ ] **Step 4: Implement**

In `lib/kicad/value-notation.ts`:

1. Replace `const MAX_OHMS = 999000` with `const MAX_OHMS_EXCLUSIVE = 1e7`, and replace `resistanceText` with:

```ts
function resistanceText(ohms: number, id: string): string {
  if (!Number.isFinite(ohms) || ohms < MIN_OHMS || ohms >= MAX_OHMS_EXCLUSIVE) {
    throw new Error(
      `resistance ${ohms}R on "${id}" is outside the range this formatter has been proven ` +
        "over (1k up to but not including 10M). Extend lib/kicad/value-notation.ts with a test " +
        "rather than letting it guess a spelling.",
    )
  }
  return ohms < 1e6 ? `${decimal(ohms / 1000)}K` : `${decimal(ohms / 1e6)}M`
}
```

2. Change `UNFORMATTED_ELECTRICAL_KINDS` to `new Set(["inductor"])`. Update its comment: a switch's parameters (positions and contacts) are not an electrical quantity, so a switch takes the mpn/symbol path like a connector. A potentiometer is formatted below.

3. In `valueFor`, change the resistor branch's condition to cover potentiometers, and word the message by kind:

```ts
  if (component.kind === "resistor" || component.kind === "potentiometer") {
    const ohms: unknown = Reflect.get(component.parameters, "ohms")
    if (typeof ohms !== "number") {
      throw new Error(`${component.kind} "${component.id}" has no numeric ohms parameter`)
    }
    return resistanceText(ohms, component.id)
  }
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `bun test tests/kicad/ && bun run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit and push**

```bash
git add lib/kicad/value-notation.ts tests/kicad/value-notation.test.ts
git commit -m "Give trim-pots, megohm resistors and jumpers netlist values"
git push
```

---

### Task 4: An operating-point deck from the same emitter

`toSpiceNetlist` always writes `.ac`, so there is no `.op` route through it. This task shares its body with an `.op` twin instead of hand-building decks.

**Files:**
- Modify: `lib/sim/netlist.ts:131-239`
- Test: `tests/sim/netlist.test.ts`

**Interfaces:**
- Produces: `export type OperatingPointEnvironment = Omit<SimulationEnvironment, "sweep">` and `export function toSpiceOperatingPointNetlist(network: ResolvedNetwork, environment: OperatingPointEnvironment): string`. A `SimulationEnvironment` is assignable to `OperatingPointEnvironment`. The AC source still appears in the deck (as `AC` with DC 0, which ngspice notes and the error filter ignores).

- [ ] **Step 1: Write the failing test**

Append to `tests/sim/netlist.test.ts`, adding any of these imports the file lacks: `circuit` from `../../lib/model/index.ts`, `resolveNetwork` from `../../lib/model/control-state.ts`, `runOperatingPoint` from `../../lib/sim/operating-point.ts`, and `spiceNodeName` and `toSpiceOperatingPointNetlist` from `../../lib/sim/netlist.ts`.

```ts
test("the operating-point deck shares the AC deck's body and solves a DC divider", async () => {
  // The source couples in through a capacitor, which is open at DC, so the
  // midpoint is set by the divider alone: 9 V across two equal resistors.
  const divider = circuit()
    .resistor("top", "1k", { a: "VCC", b: "MID" })
    .resistor("bottom", "1k", { a: "MID", b: "GND" })
    .capacitor("coupling", "1uF", { a: "IN", b: "MID" })
    .port("input", "IN").port("output", "MID").port("vcc", "VCC").port("ground", "GND")
    .done()
  const deck = toSpiceOperatingPointNetlist(
    resolveNetwork(divider, { potPositions: {}, switchPositions: {} }),
    {
      source: { port: "input", amplitude: 1, seriesOhms: 0 },
      load: { port: "output", ohms: 1e12 },
      supplies: [{ port: "vcc", volts: 9 }],
      groundPort: "ground",
    },
  )
  expect(deck).toContain("\n.op\n.end\n")
  expect(deck).not.toContain(".ac ")
  const mid = spiceNodeName("MID")
  const result = await runOperatingPoint({ netlist: deck, nodes: [mid] })
  expect(result[mid]).toBeCloseTo(4.5, 6)
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `bun test tests/sim/netlist.test.ts`
Expected: FAIL. `toSpiceOperatingPointNetlist` is not exported.

- [ ] **Step 3: Implement**

In `lib/sim/netlist.ts`:

1. After `SimulationEnvironment`, add:

```ts
/** Everything an operating-point deck needs: the AC environment without its sweep. */
export type OperatingPointEnvironment = Omit<SimulationEnvironment, "sweep">
```

2. Rename the body of `toSpiceNetlist` into a private function that stops before the analysis card:

```ts
/** Title, source, supplies, devices, load and model texts: every line both decks share. */
function circuitLines(
  network: ResolvedNetwork,
  environment: OperatingPointEnvironment,
  title: string,
): string[] {
```

Its body is the current body of `toSpiceNetlist` from `const groundNet = ...` through `for (const text of modelTexts.values()) lines.push(text.trimEnd())`, with the title line initialised as `const lines: string[] = [title]`. Keep the existing comment about the title, reworded to say the caller names what the deck is. End with `return lines`.

3. Replace the public functions with:

```ts
/** Turns a resolved network plus an explicitly declared simulation environment into a
 * complete AC SPICE deck: the shared circuit lines, the `.ac` line, and `.end`. Source and
 * load models are required inputs and are never defaulted.
 */
export function toSpiceNetlist(network: ResolvedNetwork, environment: SimulationEnvironment): string {
  const lines = circuitLines(network, environment, "AC sweep emitted from a resolved circuit network")
  lines.push(`.ac dec ${environment.sweep.pointsPerDecade} ${environment.sweep.startHz} ${environment.sweep.stopHz}`)
  lines.push(".end")
  return `${lines.join("\n")}\n`
}

/** The same circuit lines as `toSpiceNetlist`, ending in `.op` rather than `.ac`: the DC
 * operating point with every capacitor open and the AC source at DC 0.
 */
export function toSpiceOperatingPointNetlist(
  network: ResolvedNetwork,
  environment: OperatingPointEnvironment,
): string {
  const lines = circuitLines(network, environment, "Operating point emitted from a resolved circuit network")
  lines.push(".op")
  lines.push(".end")
  return `${lines.join("\n")}\n`
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test && bun run typecheck`
Expected: all PASS. The existing AC deck tests are unchanged, which proves the refactor kept the AC deck byte-identical.

- [ ] **Step 5: Commit and push**

```bash
git add lib/sim/netlist.ts tests/sim/netlist.test.ts
git commit -m "Emit an operating-point deck from the same body as the AC deck"
git push
```

---

### Task 5: The lab board circuit

**Files:**
- Create: `circuits/transistor-preamp/lab-board.ts`
- Create: `circuits/transistor-preamp/index.ts`
- Test: `tests/circuits/transistor-preamp-lab.test.ts`

**Interfaces:**
- Consumes: Task 2 and Task 3 (lowering to VeroRoute).
- Produces:
  - `export type LegName = "upper" | "feedback" | "lowerA" | "lowerB" | "collector" | "emitterBypass"`
  - `export interface Leg { readonly trimId: string; readonly trim: string; readonly floor?: { readonly id: string; readonly value: string }; readonly jumperId?: string }`
  - `export const LEGS: Readonly<Record<LegName, Leg>>`
  - `export function transistorPreampLab(): Network`
  - `export const DESIGNATORS: Readonly<Record<string, string>>`
  - `export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>>`
  - Ports: `input` (IN_EXT), `output` (OUT), `vcc` (VCC), `ground` (GND), `base` (BASE), `emitter` (EMITTER), `collector` (COLLECTOR).

- [ ] **Step 1: Write the failing tests**

Create `tests/circuits/transistor-preamp-lab.test.ts`:

```ts
import { test, expect } from "bun:test"
import {
  transistorPreampLab, DESIGNATORS, PIN_NUMBERS, LEGS,
} from "../../circuits/transistor-preamp/index.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import type { Component } from "../../lib/model/types.ts"

function byId(id: string): Component {
  const found = transistorPreampLab().components.find((c) => c.id === id)
  if (found === undefined) throw new Error(`the lab board declares no "${id}"`)
  return found
}

function netOf(component: Component, pin: string): string {
  const connection = component.units[0]?.pins[pin]
  if (connection === undefined || connection.kind !== "net") {
    throw new Error(`"${component.id}" pin "${pin}" is not on a net`)
  }
  return connection.net
}

test("the lab board validates, and every part has exactly one designator", () => {
  const network = transistorPreampLab()
  expect(() => validateNetwork(network)).not.toThrow()
  expect(network.components.map((c) => c.id).sort()).toEqual(Object.keys(DESIGNATORS).sort())
  const designators = Object.values(DESIGNATORS)
  expect(new Set(designators).size).toBe(designators.length)
  expect(network.components.length).toBe(32)
})

test("every part names a symbol and a footprint", () => {
  for (const component of transistorPreampLab().components) {
    expect(component.part?.symbol).toBeDefined()
    expect(component.part?.footprint).toBeDefined()
  }
})

test("every trim-pot is a rheostat: its wiper is strapped to its cw end", () => {
  for (const leg of Object.values(LEGS)) {
    const trim = byId(leg.trimId)
    expect(netOf(trim, "wiper")).toBe(netOf(trim, "cw"))
    expect(netOf(trim, "ccw")).not.toBe(netOf(trim, "cw"))
  }
})

test("each electrolytic's + terminal (pin a) faces the higher DC node", () => {
  expect(netOf(byId("input_coupling_cap"), "a")).toBe("BASE")
  expect(netOf(byId("output_coupling_cap"), "a")).toBe("COLLECTOR")
  expect(netOf(byId("emitter_bypass_cap"), "a")).toBe("BYPASS_JUMPED")
  expect(netOf(byId("supply_decoupling_cap"), "a")).toBe("VCC")
})

test("the board lowers to a VeroRoute netlist with the new fixed-shape types", () => {
  const lowered = toImportedNetlist(transistorPreampLab(), DESIGNATORS, PIN_NUMBERS)
  const typeOf = (designator: string): string | undefined =>
    lowered.components.find((c) => c.designator === designator)?.footprint
  expect(typeOf("Q1")).toBe("TO92")
  expect(typeOf("RV2")).toBe("TRIM_3006P")
  expect(typeOf("TP1")).toBe("SIP1")
  expect(typeOf("JP1")).toBe("SIP2")
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `bun test tests/circuits/transistor-preamp-lab.test.ts`
Expected: FAIL. The module does not exist.

- [ ] **Step 3: Write `circuits/transistor-preamp/lab-board.ts`**

```ts
/**
 * Transistor preamp lab board.
 *
 * One common-emitter 2N3904 stage whose bias network, collector load and
 * emitter bypass are reconfigured with jumpers and trim-pots, for the bench
 * sequence in docs/transistor-preamp/microphone-preamp-feedback-lab.md
 * (Builds 0, 1, 2A DC-coupled, and 2B).
 *
 * THIS IS A DESIGN, NOT A TRANSCRIPTION. The brief states the nominal stage
 * (80k/10k divider, 1.8k collector, 1.5k emitter, 9 V, 2N3904). Everything
 * around it is specified in
 * docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md, which is
 * the authority for every part below. Values are bench starting points, not
 * design targets: a range that proves wrong is fixed by swapping a part.
 *
 * RHEOSTAT WIRING. Every trim-pot has its wiper strapped to its cw end, with
 * ccw on one node of the leg and wiper+cw on the other. The leg resistance is
 * position x R_trim, rising clockwise. The strap sets the failure mode: an
 * open wiper leaves the whole element in circuit, so every leg fails to its
 * MAXIMUM resistance - never open, never zero. Each adjustable bias leg also
 * has a fixed "floor" resistor in series, so no setting drives the base
 * directly from a rail, and a 2-pin jumper that takes the leg out entirely.
 *
 * THE EMITTER. One fixed 1.5k carries all the DC, so the bias never depends
 * on a pot. A separate AC branch (jumper, 220uF, 1k trim) sits beside it: at
 * audio frequencies the unbypassed resistance is roughly 1.5k || R_trim, from
 * fully bypassed (trim at 0) to fully unbypassed (jumper removed). The spec
 * section 3.3 records why this departs from the brief's series split.
 *
 * CAPACITORS ARE PLACEHOLDERS until the bench confirms them. The brief gives
 * no coupling or bypass values. Each electrolytic's + terminal is pin a
 * (pin 1 on Device:C_Polarized) and faces the higher DC node: BASE for the
 * input cap, COLLECTOR for the output cap, the emitter side for the bypass
 * cap, VCC for the decoupling cap. The 100uF supply decoupling cap is not in
 * the brief; it is a design choice.
 *
 * TEST POINTS on VCC, BASE, EMITTER, COLLECTOR, GND, IN_EXT and OUT give every
 * node the brief asks to measure a probe or clip point. BASE, EMITTER and
 * COLLECTOR are also ports, which keeps those canonical net names when a
 * fitted jumper merges a leg's internal net into them.
 */
import { circuit, net } from "../../lib/model/index.ts"
import type { Builder, Component, Network, PartSpec } from "../../lib/model/index.ts"
import { parseValue } from "../../lib/model/units.ts"

export type LegName = "upper" | "feedback" | "lowerA" | "lowerB" | "collector" | "emitterBypass"

export interface Leg {
  readonly trimId: string
  /** The trim-pot's full value, e.g. "50k". */
  readonly trim: string
  /** Fixed resistor in series with the trim; absent where the leg has none. */
  readonly floor?: { readonly id: string; readonly value: string }
  /** The jumper that takes the leg out of circuit; absent where the leg is always in. */
  readonly jumperId?: string
}

export const LEGS: Readonly<Record<LegName, Leg>> = {
  upper: {
    jumperId: "upper_bias_jumper",
    floor: { id: "upper_bias_floor", value: "47k" },
    trimId: "upper_bias_trim", trim: "50k",
  },
  feedback: {
    jumperId: "feedback_bias_jumper",
    floor: { id: "feedback_bias_floor", value: "470k" },
    trimId: "feedback_bias_trim", trim: "1M",
  },
  lowerA: {
    jumperId: "lower_bias_a_jumper",
    floor: { id: "lower_bias_a_floor", value: "4.7k" },
    trimId: "lower_bias_a_trim", trim: "10k",
  },
  lowerB: {
    jumperId: "lower_bias_b_jumper",
    floor: { id: "lower_bias_b_floor", value: "47k" },
    trimId: "lower_bias_b_trim", trim: "200k",
  },
  collector: {
    floor: { id: "collector_floor", value: "1k" },
    trimId: "collector_trim", trim: "2k",
  },
  emitterBypass: {
    jumperId: "emitter_bypass_jumper",
    trimId: "emitter_bypass_trim", trim: "1k",
  },
}

const VCC = "VCC"
const GND = "GND"
const IN_EXT = "IN_EXT"
const BASE = "BASE"
const EMITTER = "EMITTER"
const COLLECTOR = "COLLECTOR"
const OUT = "OUT"

const RESISTOR: PartSpec = {
  footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
  symbol: "Device:R",
}
const TRIM: PartSpec = {
  mpn: "3006P",
  footprint: "Potentiometer_THT:Potentiometer_Bourns_3006P_Horizontal",
  symbol: "Device:R_Potentiometer_Trim",
}
const HEADER_2: PartSpec = {
  footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
  symbol: "Connector_Generic:Conn_01x02",
  electricallyInert: true,
}
const TEST_POINT: PartSpec = {
  footprint: "Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical",
  symbol: "Connector:TestPoint",
  electricallyInert: true,
}

/** Can sizes are typical for the value, not measured; `perfboard check` reports a
 * mismatch against the physical part, which is resolved against the part. */
function electrolytic(footprint: string): PartSpec {
  return { footprint: `Capacitor_THT:${footprint}`, symbol: "Device:C_Polarized" }
}

/** A trim-pot wired as a rheostat: ccw on `from`, wiper and cw strapped on `to`. */
function trim(id: string, value: string, from: string, to: string): Component {
  return {
    id, kind: "potentiometer",
    parameters: { ohms: parseValue(value), taper: { type: "linear" } },
    part: TRIM,
    pins: {},
    units: [{ name: "MAIN", pins: { ccw: net(from), wiper: net(to), cw: net(to) } }],
  }
}

/** A 2-pin header and shunt: fitted shorts its pins, removed shorts nothing. */
function jumper(id: string, a: string, b: string): Component {
  return {
    id, kind: "switch",
    parameters: { positions: ["fitted", "removed"], contacts: { fitted: [["1", "2"]], removed: [] } },
    part: {
      footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
      symbol: "Jumper:Jumper_2_Open",
    },
    pins: {},
    units: [{ name: "MAIN", pins: { "1": net(a), "2": net(b) } }],
  }
}

/** One adjustable leg from `from` to `to`: jumper, then floor, then trim, each where present. */
function addLeg(builder: Builder, leg: Leg, netPrefix: string, from: string, to: string): void {
  let node = from
  if (leg.jumperId !== undefined) {
    const next = `${netPrefix}_JUMPED`
    builder.add(jumper(leg.jumperId, node, next))
    node = next
  }
  if (leg.floor !== undefined) {
    const next = `${netPrefix}_FLOOR`
    builder.resistor(leg.floor.id, leg.floor.value, { a: node, b: next }, RESISTOR)
    node = next
  }
  builder.add(trim(leg.trimId, leg.trim, node, to))
}

export function transistorPreampLab(): Network {
  const builder = circuit()

  addLeg(builder, LEGS.upper, "UPPER", VCC, BASE)
  addLeg(builder, LEGS.feedback, "FEEDBACK", COLLECTOR, BASE)
  addLeg(builder, LEGS.lowerA, "LOWER_A", BASE, GND)
  addLeg(builder, LEGS.lowerB, "LOWER_B", BASE, GND)
  addLeg(builder, LEGS.collector, "COLLECTOR_LOAD", VCC, COLLECTOR)

  // Emitter: the fixed DC path, and beside it the jumpered AC bypass branch.
  builder.resistor("emitter_dc_resistor", "1.5k", { a: EMITTER, b: GND }, RESISTOR)
  const bypass = LEGS.emitterBypass
  if (bypass.jumperId === undefined) throw new Error("the emitter bypass leg must have a jumper")
  builder.add(jumper(bypass.jumperId, EMITTER, "BYPASS_JUMPED"))
  builder.capacitor("emitter_bypass_cap", "220uF", { a: "BYPASS_JUMPED", b: "BYPASS_CAP" },
    electrolytic("CP_Radial_D8.0mm_P3.50mm"))
  builder.add(trim(bypass.trimId, bypass.trim, "BYPASS_CAP", GND))

  builder
    .add({
      id: "gain_transistor", kind: "bjt", parameters: {},
      part: {
        mpn: "2N3904",
        footprint: "Package_TO_SOT_THT:TO-92_Inline",
        symbol: "Transistor_BJT:2N3904",
      },
      pins: {},
      units: [{
        name: "MAIN",
        pins: { base: net(BASE), collector: net(COLLECTOR), emitter: net(EMITTER) },
        spiceModel: "2N3904",
      }],
    })
    .capacitor("input_coupling_cap", "10uF", { a: BASE, b: IN_EXT },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .capacitor("output_coupling_cap", "10uF", { a: COLLECTOR, b: OUT },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .capacitor("supply_decoupling_cap", "100uF", { a: VCC, b: GND },
      electrolytic("CP_Radial_D6.3mm_P2.50mm"))
    .connector("input_header", { "1": IN_EXT, "2": GND }, HEADER_2)
    .connector("output_header", { "1": OUT, "2": GND }, HEADER_2)
    .connector("power_header", { "1": VCC, "2": GND }, HEADER_2)
    .connector("vcc_test_point", { "1": VCC }, TEST_POINT)
    .connector("base_test_point", { "1": BASE }, TEST_POINT)
    .connector("emitter_test_point", { "1": EMITTER }, TEST_POINT)
    .connector("collector_test_point", { "1": COLLECTOR }, TEST_POINT)
    .connector("ground_test_point", { "1": GND }, TEST_POINT)
    .connector("input_test_point", { "1": IN_EXT }, TEST_POINT)
    .connector("output_test_point", { "1": OUT }, TEST_POINT)
    .port("input", IN_EXT)
    .port("output", OUT)
    .port("vcc", VCC)
    .port("ground", GND)
    .port("base", BASE)
    .port("emitter", EMITTER)
    .port("collector", COLLECTOR)

  return builder.done()
}

/** Semantic id -> KiCad reference designator. The only place the two vocabularies meet. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  upper_bias_jumper: "JP1", upper_bias_floor: "R1", upper_bias_trim: "RV1",
  feedback_bias_jumper: "JP2", feedback_bias_floor: "R2", feedback_bias_trim: "RV2",
  lower_bias_a_jumper: "JP3", lower_bias_a_floor: "R3", lower_bias_a_trim: "RV3",
  lower_bias_b_jumper: "JP4", lower_bias_b_floor: "R4", lower_bias_b_trim: "RV4",
  collector_floor: "R5", collector_trim: "RV5",
  emitter_dc_resistor: "R6",
  emitter_bypass_jumper: "JP5", emitter_bypass_cap: "C1", emitter_bypass_trim: "RV6",
  input_coupling_cap: "C2", output_coupling_cap: "C3", supply_decoupling_cap: "C4",
  gain_transistor: "Q1",
  input_header: "J1", output_header: "J2", power_header: "J3",
  vcc_test_point: "TP1", base_test_point: "TP2", emitter_test_point: "TP3",
  collector_test_point: "TP4", ground_test_point: "TP5", input_test_point: "TP6",
  output_test_point: "TP7",
}

/**
 * Canonical pin -> KiCad symbol/footprint pin number, by kind. Jumpers,
 * headers and test points already name their pins by number.
 *
 * bjt: Transistor_BJT:2N3904 and Package_TO_SOT_THT:TO-92_Inline are both
 * E-B-C, pins 1-2-3. potentiometer: Device:R_Potentiometer_Trim and the
 * Bourns 3006P footprint both put the wiper on pin 2.
 */
export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
  potentiometer: { ccw: "1", wiper: "2", cw: "3" },
  bjt: { emitter: "1", base: "2", collector: "3" },
}
```

If `Builder` is not exported as a type from `lib/model/index.ts`, it is: `export { circuit, Builder } from "./builder.ts"`. Import it with `import type`.

- [ ] **Step 4: Write `circuits/transistor-preamp/index.ts`**

```ts
/** The lab board's one loadable module: tools (the perfboard workflow, the
 * schematic stub verb) name this file, and it re-exports everything they read. */
export { transistorPreampLab, DESIGNATORS, PIN_NUMBERS, LEGS } from "./lab-board.ts"
export type { Leg, LegName } from "./lab-board.ts"
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `bun test tests/circuits/transistor-preamp-lab.test.ts && bun run typecheck`
Expected: all PASS. If "the lab board validates" fails on a pin-vocabulary or package-pin rule, read the message: it names the component and pin. Fix the declaration; do not loosen validation.

- [ ] **Step 6: Commit and push**

```bash
git add circuits/transistor-preamp tests/circuits/transistor-preamp-lab.test.ts
git commit -m "Add the transistor preamp lab board circuit"
git push
```

---

### Task 6: Named bench settings, with sanity simulations

**Files:**
- Create: `circuits/transistor-preamp/lab-settings.ts`
- Modify: `circuits/transistor-preamp/index.ts`
- Test: `tests/circuits/transistor-preamp-lab.test.ts`

**Interfaces:**
- Consumes: `LEGS`, `DESIGNATORS`, `LegName`, `Leg` (Task 5); `toSpiceOperatingPointNetlist` (Task 4); `acSweepOf` from `tests/sim/helpers.ts`.
- Produces:
  - `export const OUT = "out"`
  - `export interface LabSetting { readonly name: string; readonly summary: string; readonly legs: Readonly<Record<LegName, string>> }`, where each leg is a total-resistance value string or `OUT`
  - `export const SETTINGS: readonly LabSetting[]`, named `nominal`, `dividerWithFeedback`, `collectorFeedback`, `collectorFeedbackOnly`
  - `export function legPosition(leg: Leg, ohms: number): number`
  - `export function controlStateFor(setting: LabSetting): ControlState`
  - `export function schematicNotes(): readonly string[]`

- [ ] **Step 1: Write the failing tests**

Add these imports to the top of `tests/circuits/transistor-preamp-lab.test.ts`:

```ts
import {
  SETTINGS, OUT, controlStateFor, legPosition, schematicNotes,
} from "../../circuits/transistor-preamp/index.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { spiceNodeName, toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import { acSweepOf } from "../sim/helpers.ts"
```

Append:

```ts
test("a leg's ohms convert to a wiper position and back; out-of-range ohms throw", () => {
  expect(legPosition(LEGS.upper, 47_000)).toBe(0)
  expect(legPosition(LEGS.upper, 97_000)).toBe(1)
  expect(legPosition(LEGS.upper, 80_000)).toBeCloseTo(0.66, 10)
  expect(legPosition(LEGS.emitterBypass, 0)).toBe(0)
  expect(() => legPosition(LEGS.upper, 46_000)).toThrow(/upper_bias_trim/)
  expect(() => legPosition(LEGS.upper, 98_000)).toThrow(/upper_bias_trim/)
})

test("every setting resolves, and taking out a leg with no jumper throws", () => {
  for (const setting of SETTINGS) {
    expect(() => resolveNetwork(transistorPreampLab(), controlStateFor(setting))).not.toThrow()
  }
  const [first] = SETTINGS
  if (first === undefined) throw new Error("no settings declared")
  expect(() => controlStateFor({ ...first, legs: { ...first.legs, collector: OUT } }))
    .toThrow(/collector/)
})

test("the schematic notes list every setting with its jumpers", () => {
  const text = schematicNotes().join("\n")
  for (const setting of SETTINGS) expect(text).toContain(setting.name)
  for (const jumper of ["JP1", "JP2", "JP3", "JP4", "JP5"]) expect(text).toContain(jumper)
})

/**
 * Sanity bounds, not predictions. The board is a bench instrument; these catch
 * wiring and generation errors. Source: 1 V AC ideal (so the load node reads
 * the gain directly). Load: the brief's 100k measurement load. Supply: the
 * brief's 9 V.
 */
const ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 100_000 },
  supplies: [{ port: "vcc", volts: 9 }],
  sweep: { pointsPerDecade: 10, startHz: 100, stopHz: 10_000 },
  groundPort: "ground",
}

const EMITTER_DC_OHMS = 1500

for (const setting of SETTINGS) {
  test(`${setting.name}: the transistor is biased into its active region`, async () => {
    const deck = toSpiceOperatingPointNetlist(
      resolveNetwork(transistorPreampLab(), controlStateFor(setting)), ENVIRONMENT)
    const [emitter, collector] = [spiceNodeName("EMITTER"), spiceNodeName("COLLECTOR")]
    const v = await runOperatingPoint({ netlist: deck, nodes: [emitter, collector] })
    const ve = v[emitter]
    const vc = v[collector]
    if (ve === undefined || vc === undefined) throw new Error("operating point is missing a node")
    expect(ve / EMITTER_DC_OHMS).toBeGreaterThan(1e-4)
    expect(vc - ve).toBeGreaterThan(1)
  })

  test(`${setting.name}: the stage inverts with gain greater than one at 1 kHz`, async () => {
    const sweep = await acSweepOf(transistorPreampLab(), controlStateFor(setting), ENVIRONMENT)
    const nearest = [...sweep.points].sort(
      (a, b) => Math.abs(a.frequency - 1000) - Math.abs(b.frequency - 1000))[0]
    if (nearest === undefined) throw new Error("the sweep returned no points")
    const gain = Math.hypot(nearest.real, nearest.imaginary)
    const phase = (Math.atan2(nearest.imaginary, nearest.real) * 180) / Math.PI
    expect(Number.isFinite(gain)).toBe(true)
    expect(gain).toBeGreaterThan(1)
    expect(Math.abs(phase)).toBeGreaterThan(135)
  })
}
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `bun test tests/circuits/transistor-preamp-lab.test.ts`
Expected: FAIL, because the settings exports do not exist.

- [ ] **Step 3: Write `circuits/transistor-preamp/lab-settings.ts`**

```ts
/**
 * The lab board's named bench settings: which jumpers are fitted and where
 * each trim-pot starts. Each is a ControlState over transistorPreampLab(), so
 * one board serves the simulations, the schematic's settings table and the
 * bench.
 *
 * Settings are written as each leg's TOTAL resistance (floor + trim), which is
 * what the brief talks about, and converted to wiper positions here. Values
 * are starting points to dial in from, not predictions.
 */
import type { ControlState } from "../../lib/model/control-state.ts"
import { parseValue } from "../../lib/model/units.ts"
import { DESIGNATORS, LEGS } from "./lab-board.ts"
import type { Leg, LegName } from "./lab-board.ts"

/** A leg setting meaning "jumper removed: this leg is out of circuit". */
export const OUT = "out"

export interface LabSetting {
  readonly name: string
  readonly summary: string
  /** Each leg's total resistance as a value string, or OUT. */
  readonly legs: Readonly<Record<LegName, string>>
}

const LEG_NAMES: readonly LegName[] = [
  "upper", "feedback", "lowerA", "lowerB", "collector", "emitterBypass",
]

/** Position given to a trim-pot on a leg that is out of circuit. Its value is
 * irrelevant there; resolveNetwork requires every pot to have one. */
const PARKED = 0.5

export const SETTINGS: readonly LabSetting[] = [
  {
    name: "nominal",
    summary: "divider bias, the brief's Build 0",
    legs: { upper: "80k", feedback: OUT, lowerA: "10k", lowerB: OUT, collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "dividerWithFeedback",
    summary: "divider plus collector-to-base feedback, Build 2A (DC-coupled)",
    legs: { upper: "80k", feedback: "1M", lowerA: "10k", lowerB: OUT, collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "collectorFeedback",
    summary: "collector-feedback bias with a base-to-ground leg, Build 2B",
    legs: { upper: OUT, feedback: "470k", lowerA: OUT, lowerB: "150k", collector: "1.8k", emitterBypass: "0" },
  },
  {
    name: "collectorFeedbackOnly",
    summary: "collector-feedback bias alone, Build 2B",
    legs: { upper: OUT, feedback: "1.3M", lowerA: OUT, lowerB: OUT, collector: "1.8k", emitterBypass: "0" },
  },
]

/** Wiper position giving `ohms` of total leg resistance. Throws, never clamps. */
export function legPosition(leg: Leg, ohms: number): number {
  const floorOhms = leg.floor === undefined ? 0 : parseValue(leg.floor.value)
  const trimOhms = parseValue(leg.trim)
  const position = (ohms - floorOhms) / trimOhms
  if (!Number.isFinite(position) || position < 0 || position > 1) {
    throw new Error(
      `${leg.trimId}: ${ohms} ohms is outside this leg's range, ${floorOhms} to ` +
        `${floorOhms + trimOhms} ohms. Swap the fixed resistor or the trim-pot rather than ` +
        "asking for a setting the board cannot reach.",
    )
  }
  return position
}

export function controlStateFor(setting: LabSetting): ControlState {
  const potPositions: Record<string, number> = {}
  const switchPositions: Record<string, string> = {}
  for (const name of LEG_NAMES) {
    const leg = LEGS[name]
    const value = setting.legs[name]
    if (value === OUT) {
      if (leg.jumperId === undefined) {
        throw new Error(
          `setting "${setting.name}" takes out leg "${name}", which has no jumper and is always in circuit`,
        )
      }
      switchPositions[leg.jumperId] = "removed"
      potPositions[leg.trimId] = PARKED
      continue
    }
    if (leg.jumperId !== undefined) switchPositions[leg.jumperId] = "fitted"
    potPositions[leg.trimId] = legPosition(leg, parseValue(value))
  }
  return { potPositions, switchPositions }
}

function designatorOf(id: string): string {
  const designator = DESIGNATORS[id]
  if (designator === undefined) throw new Error(`"${id}" has no designator in DESIGNATORS`)
  return designator
}

/** The bench-settings table carried as text on the generated schematic stub. */
export function schematicNotes(): readonly string[] {
  const lines = [
    "BENCH SETTINGS (circuits/transistor-preamp/lab-settings.ts)",
    "Jumpers: F = fitted, - = removed. Trim values are each leg's total resistance.",
  ]
  for (const setting of SETTINGS) {
    const jumpers: string[] = []
    const trims: string[] = []
    for (const name of LEG_NAMES) {
      const leg = LEGS[name]
      const value = setting.legs[name]
      if (leg.jumperId !== undefined) {
        jumpers.push(`${designatorOf(leg.jumperId)} ${value === OUT ? "-" : "F"}`)
      }
      if (value !== OUT) trims.push(`${designatorOf(leg.trimId)} ${value}`)
    }
    jumpers.sort()
    lines.push(`${setting.name}: ${setting.summary}`)
    lines.push(`  ${jumpers.join("  ")}`)
    lines.push(`  ${trims.join("  ")}`)
  }
  return lines
}
```

`parseValue("0")` must return 0. If it throws, report that and stop; do not work around it.

- [ ] **Step 4: Export the settings**

Append to `circuits/transistor-preamp/index.ts`:

```ts
export {
  SETTINGS, OUT, controlStateFor, legPosition, schematicNotes,
} from "./lab-settings.ts"
export type { LabSetting } from "./lab-settings.ts"
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `bun test tests/circuits/transistor-preamp-lab.test.ts && bun run typecheck`
Expected: all PASS.

If a simulation test fails, the bound is not wrong. Something in the circuit or the deck is. Use superpowers:systematic-debugging: print the deck (`console.log(deck)`) and the node voltages, and look for a floating node, a swapped pin or a jumper on the wrong net. Do not relax a bound to pass.

- [ ] **Step 6: Commit and push**

```bash
git add circuits/transistor-preamp tests/circuits/transistor-preamp-lab.test.ts
git commit -m "Add the lab board's named bench settings and sanity simulations"
git push
```

---

### Task 7: Vendored KiCad symbols

**Files:**
- Create: `lib/kicad/symbol-library.ts`
- Create: `tools/kicad/vendor-symbols.ts`
- Create: `lib/kicad/symbols/PROVENANCE.md`
- Create (by running the script): `lib/kicad/symbols/Device/R.sexpr`, `Device/C_Polarized.sexpr`, `Device/R_Potentiometer_Trim.sexpr`, `Transistor_BJT/2N3904.sexpr`, `Connector_Generic/Conn_01x02.sexpr`, `Connector/TestPoint.sexpr`, `Jumper/Jumper_2_Open.sexpr`
- Test: `tests/kicad/symbol-library.test.ts`

**Interfaces:**
- Produces:
  - `export const VENDORED_SYMBOLS: readonly string[]` (the seven lib ids above)
  - `export function splitLibId(libId: string): { readonly library: string; readonly name: string }`
  - `export function librarySymbols(libraryText: string): ReadonlyMap<string, string>`, name to raw block
  - `export function flattenedSymbol(library: ReadonlyMap<string, string>, name: string): string`
  - `export interface SymbolPin { readonly number: string; readonly x: number; readonly y: number; readonly angle: number }`
  - `export function symbolPins(block: string): readonly SymbolPin[]`
  - `export function vendoredSymbolText(libId: string): string`
  - `export function embeddedSymbol(libId: string, block: string): string` (the block renamed to its lib id, as a schematic's `lib_symbols` needs)

Symbols are handled as **raw text**, because `parseSexpr` drops the quoted-or-bare distinction a writer would need. The parser is still used to read names and pin geometry from each block.

- [ ] **Step 1: Write the failing tests**

Create `tests/kicad/symbol-library.test.ts`:

```ts
import { test, expect } from "bun:test"
import {
  VENDORED_SYMBOLS, embeddedSymbol, flattenedSymbol, librarySymbols, splitLibId, symbolPins,
  vendoredSymbolText,
} from "../../lib/kicad/symbol-library.ts"

const LIBRARY = [
  "(kicad_symbol_lib",
  "\t(version 20241209)",
  '\t(symbol "Base"',
  '\t\t(property "Reference" "Q" (at 0 0 0))',
  '\t\t(property "Value" "Base (parent)" (at 0 0 0))',
  '\t\t(symbol "Base_0_1" (polyline (pts (xy 0 0) (xy 1 1))))',
  '\t\t(symbol "Base_1_1"',
  '\t\t\t(pin passive line (at 0 2.54 270) (length 1.27) (name "~") (number "1"))',
  '\t\t\t(pin passive line (at 0 -2.54 90) (length 1.27) (name "~") (number "2"))',
  "\t\t)",
  "\t)",
  '\t(symbol "Child" (extends "Base")',
  '\t\t(property "Value" "Child" (at 0 0 0))',
  '\t\t(property "ki_fp_filters" "TO?92*" (at 0 0 0))',
  "\t)",
  ")",
].join("\n")

test("library symbols are found by name, even with parentheses inside quoted strings", () => {
  const symbols = librarySymbols(LIBRARY)
  expect([...symbols.keys()].sort()).toEqual(["Base", "Child"])
  expect(symbols.get("Base")).toContain('"Base (parent)"')
})

test("flattening an extends copies the parent's body under the child's name and properties", () => {
  const flat = flattenedSymbol(librarySymbols(LIBRARY), "Child")
  expect(flat.startsWith('(symbol "Child"')).toBe(true)
  expect(flat).toContain('(symbol "Child_1_1"')
  expect(flat).toContain('(property "Value" "Child"')
  expect(flat).toContain('(property "Reference" "Q"')
  expect(flat).toContain('(property "ki_fp_filters" "TO?92*"')
  expect(flat).not.toContain("extends")
  expect(flat).not.toContain('"Base')
})

test("pin geometry comes from the symbol's units", () => {
  const pins = symbolPins(flattenedSymbol(librarySymbols(LIBRARY), "Child"))
  expect(pins).toEqual([
    { number: "1", x: 0, y: 2.54, angle: 270 },
    { number: "2", x: 0, y: -2.54, angle: 90 },
  ])
})

test("embedding renames the top-level symbol to its lib id and leaves its units alone", () => {
  const block = flattenedSymbol(librarySymbols(LIBRARY), "Child")
  const embedded = embeddedSymbol("Lib:Child", block)
  expect(embedded.startsWith('(symbol "Lib:Child"')).toBe(true)
  expect(embedded).toContain('(symbol "Child_1_1"')
})

test("a lib id without a colon, or an unvendored symbol, refuses", () => {
  expect(() => splitLibId("R")).toThrow(/Library:Name/)
  expect(() => vendoredSymbolText("Device:NoSuchPart")).toThrow(/Device:NoSuchPart/)
})

test("every vendored symbol loads, is self-contained, and has pins", () => {
  for (const libId of VENDORED_SYMBOLS) {
    const text = vendoredSymbolText(libId)
    expect(text).not.toContain("(extends")
    expect(symbolPins(text).length).toBeGreaterThan(0)
  }
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `bun test tests/kicad/symbol-library.test.ts`
Expected: FAIL. The module does not exist.

- [ ] **Step 3: Write `lib/kicad/symbol-library.ts`**

```ts
/**
 * KiCad symbol definitions, handled as raw text.
 *
 * A generated schematic embeds a copy of every symbol it uses (`lib_symbols`),
 * so the stub writer needs symbol TEXT it can paste. `parseSexpr` is used to
 * read names and pin geometry, but never to re-serialise: it drops whether an
 * atom was quoted, and KiCad distinguishes `yes` from `"yes"`.
 *
 * The symbols live in `./symbols/<Library>/<Name>.sexpr`, copied from an
 * installed KiCad by `tools/kicad/vendor-symbols.ts`, so a generated schematic
 * never depends on whichever KiCad happens to be installed. See
 * `./symbols/PROVENANCE.md`.
 */
import fs from "node:fs"
import path from "node:path"
import { parseSexpr } from "./sexpr.ts"
import type { SNode } from "./sexpr.ts"

export const VENDORED_SYMBOLS: readonly string[] = [
  "Device:R",
  "Device:C_Polarized",
  "Device:R_Potentiometer_Trim",
  "Transistor_BJT:2N3904",
  "Connector_Generic:Conn_01x02",
  "Connector:TestPoint",
  "Jumper:Jumper_2_Open",
]

const VENDORED_DIR = path.join(import.meta.dir, "symbols")

interface RawForm {
  readonly node: SNode
  readonly text: string
  readonly start: number
  readonly end: number
}

/** The direct child forms of the form starting at offset 0 of `text`, with their raw text
 * and offsets. Tracks quoting, so a parenthesis inside a quoted string is not structure. */
function directChildren(text: string): readonly RawForm[] {
  const out: RawForm[] = []
  let depth = 0
  let inQuote = false
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      if (ch === "\\") {
        i++
        continue
      }
      if (ch === '"') inQuote = false
      continue
    }
    if (ch === '"') {
      inQuote = true
      continue
    }
    if (ch === "(") {
      depth++
      if (depth === 2) start = i
      continue
    }
    if (ch === ")") {
      if (depth === 2) {
        const slice = text.slice(start, i + 1)
        out.push({ node: parseSexpr(slice), text: slice, start, end: i + 1 })
      }
      depth--
      if (depth === 0) return out
    }
  }
  throw new Error("unbalanced s-expression: the outer form never closed")
}

export function splitLibId(libId: string): { readonly library: string; readonly name: string } {
  const colon = libId.indexOf(":")
  if (colon <= 0 || colon === libId.length - 1) {
    throw new Error(`"${libId}" is not a KiCad lib id; expected Library:Name`)
  }
  return { library: libId.slice(0, colon), name: libId.slice(colon + 1) }
}

/** Every top-level symbol in a `.kicad_sym` library, name -> raw block text. */
export function librarySymbols(libraryText: string): ReadonlyMap<string, string> {
  const symbols = new Map<string, string>()
  for (const form of directChildren(libraryText)) {
    if (form.node.name !== "symbol") continue
    const name = form.node.atoms[0]
    if (name === undefined) throw new Error("a library (symbol) form has no name")
    symbols.set(name, form.text)
  }
  return symbols
}

/**
 * A library symbol made self-contained: an `(extends "Parent")` is replaced by
 * the parent's body, renamed to the child, with the child's properties
 * overriding or adding to the parent's. A schematic's embedded symbols must
 * not extend anything.
 */
export function flattenedSymbol(library: ReadonlyMap<string, string>, name: string): string {
  const block = library.get(name)
  if (block === undefined) throw new Error(`symbol "${name}" is not in this library`)
  const children = directChildren(block)
  const extendsForm = children.find((f) => f.node.name === "extends")
  if (extendsForm === undefined) return block
  const parentName = extendsForm.node.atoms[0]
  if (parentName === undefined) throw new Error(`symbol "${name}" has an (extends) with no parent name`)

  let flattened = flattenedSymbol(library, parentName)
    .replace(`(symbol "${parentName}"`, `(symbol "${name}"`)
    .split(`(symbol "${parentName}_`)
    .join(`(symbol "${name}_`)

  for (const property of children.filter((f) => f.node.name === "property")) {
    const key = property.node.atoms[0]
    const current = directChildren(flattened).filter((f) => f.node.name === "property")
    const existing = current.find((f) => f.node.atoms[0] === key)
    if (existing !== undefined) {
      flattened = flattened.slice(0, existing.start) + property.text + flattened.slice(existing.end)
      continue
    }
    const last = current[current.length - 1]
    if (last === undefined) throw new Error(`parent symbol "${parentName}" has no properties to extend`)
    flattened = `${flattened.slice(0, last.end)}\n\t\t${property.text}${flattened.slice(last.end)}`
  }
  return flattened
}

export interface SymbolPin {
  readonly number: string
  readonly x: number
  readonly y: number
  /** Direction, in degrees, from the connection point into the symbol body. */
  readonly angle: number
}

/** The pins of a single-unit symbol: every pin in its common (style 0) and normal
 * (style 1) unit bodies, in file order. */
export function symbolPins(block: string): readonly SymbolPin[] {
  const root = parseSexpr(block)
  const name = root.atoms[0] ?? "(unnamed)"
  const pins: SymbolPin[] = []
  for (const unit of root.nodes.filter((n) => n.name === "symbol")) {
    const unitName = unit.atoms[0] ?? ""
    const style = unitName.slice(unitName.lastIndexOf("_") + 1)
    if (style !== "0" && style !== "1") continue
    for (const pin of unit.nodes.filter((n) => n.name === "pin")) {
      const at = pin.nodes.find((n) => n.name === "at")
      const number = pin.nodes.find((n) => n.name === "number")?.atoms[0]
      if (at === undefined || number === undefined) {
        throw new Error(`symbol "${name}" has a pin with no (at) or no (number)`)
      }
      const [x, y, angle] = at.atoms.map(Number)
      if (x === undefined || y === undefined || angle === undefined ||
        !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(angle)) {
        throw new Error(`symbol "${name}" pin "${number}" has an unreadable (at ...)`)
      }
      if (pins.some((p) => p.number === number)) {
        throw new Error(`symbol "${name}" declares pin "${number}" twice`)
      }
      pins.push({ number, x, y, angle })
    }
  }
  return pins
}

/** The vendored, already-flattened block for `libId`. */
export function vendoredSymbolText(libId: string): string {
  const { library, name } = splitLibId(libId)
  const file = path.join(VENDORED_DIR, library, `${name}.sexpr`)
  if (!fs.existsSync(file)) {
    throw new Error(
      `no vendored KiCad symbol for "${libId}" (looked for ${file}). Vendored: ` +
        `${VENDORED_SYMBOLS.join(", ")}. Add it to VENDORED_SYMBOLS in lib/kicad/symbol-library.ts ` +
        "and run tools/kicad/vendor-symbols.ts.",
    )
  }
  return fs.readFileSync(file, "utf8")
}

/** A library block as a schematic's lib_symbols holds it: the top-level name becomes the
 * full lib id; the unit sub-symbols keep their bare names. */
export function embeddedSymbol(libId: string, block: string): string {
  const { name } = splitLibId(libId)
  const header = `(symbol "${name}"`
  if (!block.startsWith(header)) {
    throw new Error(`the block for "${libId}" does not start with ${header}`)
  }
  return `(symbol "${libId}"${block.slice(header.length)}`
}
```

- [ ] **Step 4: Write `tools/kicad/vendor-symbols.ts`**

```ts
/**
 * Regenerate lib/kicad/symbols/ from an installed KiCad's symbol libraries.
 *
 *   bun tools/kicad/vendor-symbols.ts <kicad-symbols-dir>
 *
 * On macOS the directory is
 * /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols. Every symbol in
 * VENDORED_SYMBOLS is flattened (see flattenedSymbol) and written to
 * lib/kicad/symbols/<Library>/<Name>.sexpr. Record the KiCad version in
 * lib/kicad/symbols/PROVENANCE.md whenever this is re-run.
 */
import fs from "node:fs"
import path from "node:path"
import { VENDORED_SYMBOLS, flattenedSymbol, librarySymbols, splitLibId } from "../../lib/kicad/symbol-library.ts"

const [symbolsDir] = process.argv.slice(2)
if (symbolsDir === undefined) {
  throw new Error("usage: bun tools/kicad/vendor-symbols.ts <kicad-symbols-dir>")
}

const outDir = path.join(import.meta.dir, "..", "..", "lib", "kicad", "symbols")
const libraries = new Map<string, ReadonlyMap<string, string>>()

for (const libId of VENDORED_SYMBOLS) {
  const { library, name } = splitLibId(libId)
  let symbols = libraries.get(library)
  if (symbols === undefined) {
    const file = path.join(symbolsDir, `${library}.kicad_sym`)
    if (!fs.existsSync(file)) throw new Error(`no symbol library at ${file}`)
    symbols = librarySymbols(fs.readFileSync(file, "utf8"))
    libraries.set(library, symbols)
  }
  const target = path.join(outDir, library, `${name}.sexpr`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, `${flattenedSymbol(symbols, name)}\n`)
  console.log(`wrote ${target}`)
}
```

- [ ] **Step 5: Vendor the symbols**

Run: `bun tools/kicad/vendor-symbols.ts /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`
Expected: seven `wrote ...` lines. Run `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli --version` and note the version for the next step (10.0.5 when this plan was written).

- [ ] **Step 6: Write `lib/kicad/symbols/PROVENANCE.md`**

With the Write tool:

```markdown
# Vendored KiCad symbols

Copied from the KiCad 10.0.5 standard symbol libraries
(`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`) by
`tools/kicad/vendor-symbols.ts`, which is the only thing that should write
this directory. Re-run it, and update the version above, to refresh them.

Each file is one symbol definition, as raw library text. `Transistor_BJT:2N3904`
is defined in its library as `(extends "Q_NPN_EBC")`. A schematic's embedded
symbols must be self-contained, so the vendored copy is FLATTENED: the parent's
body under the child's name, with the child's properties applied. The other
six are verbatim.

Licence: the KiCad libraries are CC-BY-SA 4.0 with an exception: using a
library symbol in a design places no licence obligation on the design. See
https://www.kicad.org/libraries/license/ .
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `bun test tests/kicad/symbol-library.test.ts && bun run typecheck`
Expected: all PASS.

- [ ] **Step 8: Commit and push**

```bash
git add lib/kicad/symbol-library.ts lib/kicad/symbols tools/kicad tests/kicad/symbol-library.test.ts
git commit -m "Vendor the KiCad symbols the lab board uses, flattened and self-contained"
git push
```

---

### Task 8: The schematic stub writer

**Files:**
- Modify: `lib/kicad/from-network.ts` (export `pinNumberFor`)
- Create: `lib/kicad/schematic.ts`
- Test: `tests/kicad/schematic.test.ts`

**Interfaces:**
- Consumes: `symbolPins`, `vendoredSymbolText`, `embeddedSymbol` (Task 7); `valueFor` (Task 3).
- Produces:
  - `export interface SchematicStubInput { readonly network: Network; readonly designators: Readonly<Record<string, string>>; readonly pinNumbers: PinNumbers; readonly notes: readonly string[]; readonly projectName: string; readonly newUuid: () => string }`
  - `export function writeSchematicStub(input: SchematicStubInput): string`

Layout: symbols in designator order on a 10-column grid with 30.48 mm pitch, A3 paper. Each pin gets a 2.54 mm wire stub pointing away from the body, with a local label named after its net at the stub's end. A deliberately unconnected (`NC`) pin gets a no-connect flag instead. The notes go in a text block below the grid. The format version is `20260306`, the version KiCad 10.0 wrote `circuits/pt2399-core/pt2399-core.kicad_sch` in.

- [ ] **Step 1: Export `pinNumberFor`**

In `lib/kicad/from-network.ts`, change `function pinNumberFor(` to `export function pinNumberFor(`.

- [ ] **Step 2: Write the failing tests**

Create `tests/kicad/schematic.test.ts`:

```ts
import { test, expect } from "bun:test"
import { writeSchematicStub } from "../../lib/kicad/schematic.ts"
import type { SchematicStubInput } from "../../lib/kicad/schematic.ts"
import { parseSexpr, children, child, attr } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"
import { circuit, NC } from "../../lib/model/index.ts"
import type { Network } from "../../lib/model/index.ts"

function counter(): () => string {
  let n = 0
  return () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`
}

const RESISTOR = {
  footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
  symbol: "Device:R",
}
const HEADER = {
  footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
  symbol: "Connector_Generic:Conn_01x02",
  electricallyInert: true,
}

function input(network: Network, designators: Record<string, string>): SchematicStubInput {
  return {
    network, designators,
    pinNumbers: { resistor: { a: "1", b: "2" } },
    notes: ["BENCH NOTE", "second line"],
    projectName: "tiny",
    newUuid: counter(),
  }
}

const tiny = (): Network => circuit()
  .resistor("load", "1k", { a: "A", b: "B" }, RESISTOR)
  .connector("header", { "1": "A", "2": "B" }, HEADER)
  .done()

function property(symbol: SNode, key: string): string | undefined {
  return children(symbol, "property").find((p) => p.atoms[0] === key)?.atoms[1]
}

test("the stub embeds each symbol once and places one instance per part", () => {
  const root = parseSexpr(writeSchematicStub(input(tiny(), { load: "R1", header: "J1" })))
  expect(root.name).toBe("kicad_sch")
  const libSymbols = child(root, "lib_symbols")
  if (libSymbols === undefined) throw new Error("no lib_symbols")
  expect(children(libSymbols, "symbol").map((s) => s.atoms[0]).sort())
    .toEqual(["Connector_Generic:Conn_01x02", "Device:R"])

  const placed = children(root, "symbol")
  expect(placed.map((s) => property(s, "Reference")).sort()).toEqual(["J1", "R1"])
  const r1 = placed.find((s) => property(s, "Reference") === "R1")
  if (r1 === undefined) throw new Error("no R1")
  expect(attr(r1, "lib_id")).toBe("Device:R")
  expect(property(r1, "Value")).toBe("1K")
  expect(property(r1, "Footprint")).toBe(RESISTOR.footprint)
})

test("every pin is carried to a net label, and nothing else connects", () => {
  const root = parseSexpr(writeSchematicStub(input(tiny(), { load: "R1", header: "J1" })))
  expect(children(root, "label").map((l) => l.atoms[0]).sort()).toEqual(["A", "A", "B", "B"])
  expect(children(root, "wire").length).toBe(4)
})

test("the notes become one text block, with KiCad's \\n line escape", () => {
  // Asserted on the raw text: parseSexpr's reader keeps the character after a
  // backslash and drops the backslash, so it cannot show the escape.
  const text = writeSchematicStub(input(tiny(), { load: "R1", header: "J1" }))
  expect(children(parseSexpr(text), "text").length).toBe(1)
  expect(text).toContain('(text "BENCH NOTE\\nsecond line"')
})

test("a deliberately unconnected pin gets a no-connect flag, not a label", () => {
  const network = circuit()
    .resistor("load", "1k", { a: "A", b: "B" }, RESISTOR)
    .connector("header", { "1": "A", "2": NC }, HEADER)
    .connector("other", { "1": "B", "2": "A" }, HEADER)
    .done()
  const root = parseSexpr(writeSchematicStub(
    input(network, { load: "R1", header: "J1", other: "J2" })))
  expect(children(root, "no_connect").length).toBe(1)
  expect(children(root, "label").length).toBe(5)
})

test("a part with no symbol, or a symbol pin the circuit leaves unmentioned, refuses", () => {
  const noSymbol = circuit()
    .resistor("load", "1k", { a: "A", b: "B" }, { footprint: RESISTOR.footprint })
    .done()
  expect(() => writeSchematicStub(input(noSymbol, { load: "R1" }))).toThrow(/part\.symbol/)

  const halfHeader = circuit()
    .resistor("load", "1k", { a: "A", b: "B" }, RESISTOR)
    .connector("header", { "1": "A" }, HEADER)
    .done()
  expect(() => writeSchematicStub(input(halfHeader, { load: "R1", header: "J1" })))
    .toThrow(/pin 2.*not connected/s)
})
```

If `validateNetwork` (run by `done()`) rejects a net with a single member, restructure that test's network so every net has two members. Do not weaken validation.

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `bun test tests/kicad/schematic.test.ts`
Expected: FAIL. The module does not exist.

- [ ] **Step 4: Write `lib/kicad/schematic.ts`**

```ts
/**
 * A KiCad schematic STUB, written once from a canonical Network.
 *
 * Every part is placed on a plain grid with its symbol, reference, value and
 * footprint, and every pin is carried by a short wire to a net label, so
 * connectivity is carried entirely by labels. That is a starting point, not a
 * drawing: the operator arranges it in KiCad and owns it from then on. After
 * that, only electrical equivalence to the Network is ever enforced (through
 * the exported netlist); positions, wires, labels and text are the operator's.
 *
 * Symbols come from lib/kicad/symbols/ (vendored), never from an installed
 * KiCad, so the output does not depend on the machine.
 */
import type { Component, Connection, Network } from "../electrical/types.ts"
import { pinNumberFor } from "./from-network.ts"
import type { PinNumbers } from "./from-network.ts"
import { embeddedSymbol, symbolPins, vendoredSymbolText } from "./symbol-library.ts"
import type { SymbolPin } from "./symbol-library.ts"
import { valueFor } from "./value-notation.ts"

export interface SchematicStubInput {
  readonly network: Network
  readonly designators: Readonly<Record<string, string>>
  readonly pinNumbers: PinNumbers
  /** Lines of the text block placed below the parts. */
  readonly notes: readonly string[]
  /** The schematic file's stem; symbol instances are recorded under it. */
  readonly projectName: string
  readonly newUuid: () => string
}

/** The file format KiCad 10.0 wrote circuits/pt2399-core/pt2399-core.kicad_sch in. */
const FORMAT_VERSION = "20260306"
const GRID = 30.48
const COLUMNS = 10
const ORIGIN = 30.48
const STUB = 2.54
const FONT = "(effects (font (size 1.27 1.27)))"

function quote(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`
}

/** Millimetres as KiCad writes them, with float noise (cos 90 = 6e-17) rounded away. */
function mm(value: number): string {
  return String(Number(value.toFixed(4)))
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

/** Symbol pin number -> this component's connection on it. */
function connectionsByNumber(component: Component, pinNumbers: PinNumbers): Map<string, Connection> {
  const byNumber = new Map<string, Connection>()
  const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
  for (const group of groups) {
    for (const [pin, connection] of Object.entries(group)) {
      const number = pinNumberFor(component, pin, pinNumbers)
      if (byNumber.has(number)) {
        throw new Error(`component "${component.id}" maps two pins to symbol pin ${number}`)
      }
      byNumber.set(number, connection)
    }
  }
  return byNumber
}

function assertPinsAgree(
  component: Component,
  libId: string,
  pins: readonly SymbolPin[],
  connections: ReadonlyMap<string, Connection>,
): void {
  const onSymbol = new Set(pins.map((p) => p.number))
  for (const number of connections.keys()) {
    if (!onSymbol.has(number)) {
      throw new Error(
        `component "${component.id}" uses pin ${number}, which symbol ${libId} does not have ` +
          `(it has ${[...onSymbol].join(", ")}). Check PIN_NUMBERS or the part's symbol.`,
      )
    }
  }
  for (const number of onSymbol) {
    if (!connections.has(number)) {
      throw new Error(
        `symbol ${libId} pin ${number} on component "${component.id}" is not connected in the ` +
          "circuit. Declare it NC if it is deliberately unconnected; an omission is not a no-connect.",
      )
    }
  }
}

export function writeSchematicStub(input: SchematicStubInput): string {
  const root = input.newUuid()
  const placed = input.network.components
    .map((component) => ({
      component,
      designator: required(
        input.designators[component.id],
        `component "${component.id}" has no designator in DESIGNATORS; a schematic symbol needs one`,
      ),
    }))
    .sort((a, b) => a.designator.localeCompare(b.designator, "en", { numeric: true }))

  const libIds = new Set<string>()
  const body: string[] = []

  placed.forEach(({ component, designator }, index) => {
    const libId = required(
      component.part?.symbol,
      `component "${component.id}" has no part.symbol, so the stub has no symbol to place for it`,
    )
    const footprint = required(
      component.part?.footprint,
      `component "${component.id}" has no part.footprint; the stub carries it to KiCad`,
    )
    libIds.add(libId)
    const pins = symbolPins(vendoredSymbolText(libId))
    const connections = connectionsByNumber(component, input.pinNumbers)
    assertPinsAgree(component, libId, pins, connections)

    const x = ORIGIN + (index % COLUMNS) * GRID
    const y = ORIGIN + Math.floor(index / COLUMNS) * GRID
    const at = `${mm(x)} ${mm(y)}`
    body.push([
      "\t(symbol",
      `\t\t(lib_id ${quote(libId)})`,
      `\t\t(at ${at} 0)`,
      "\t\t(unit 1)",
      "\t\t(exclude_from_sim no)",
      "\t\t(in_bom yes)",
      "\t\t(on_board yes)",
      "\t\t(dnp no)",
      `\t\t(uuid ${quote(input.newUuid())})`,
      `\t\t(property "Reference" ${quote(designator)} (at ${mm(x + 5.08)} ${mm(y - 1.27)} 0) ` +
        "(effects (font (size 1.27 1.27)) (justify left)))",
      `\t\t(property "Value" ${quote(valueFor(component))} (at ${mm(x + 5.08)} ${mm(y + 1.27)} 0) ` +
        "(effects (font (size 1.27 1.27)) (justify left)))",
      `\t\t(property "Footprint" ${quote(footprint)} (at ${at} 0) (hide yes) ${FONT})`,
      `\t\t(property "Datasheet" "" (at ${at} 0) (hide yes) ${FONT})`,
      ...pins.map((pin) => `\t\t(pin ${quote(pin.number)} (uuid ${quote(input.newUuid())}))`),
      `\t\t(instances (project ${quote(input.projectName)} (path ${quote(`/${root}`)} ` +
        `(reference ${quote(designator)}) (unit 1))))`,
      "\t)",
    ].join("\n"))

    for (const pin of pins) {
      const connection = required(connections.get(pin.number), `pin ${pin.number} vanished`)
      // Symbol coordinates are y-up; the schematic is y-down.
      const px = x + pin.x
      const py = y - pin.y
      if (connection.kind === "nc") {
        body.push(`\t(no_connect (at ${mm(px)} ${mm(py)}) (uuid ${quote(input.newUuid())}))`)
        continue
      }
      // The pin's angle points into the body; the stub goes the other way.
      const radians = (pin.angle * Math.PI) / 180
      const ex = px - STUB * Math.cos(radians)
      const ey = py + STUB * Math.sin(radians)
      body.push(
        `\t(wire (pts (xy ${mm(px)} ${mm(py)}) (xy ${mm(ex)} ${mm(ey)})) ` +
          `(stroke (width 0) (type default)) (uuid ${quote(input.newUuid())}))`,
      )
      body.push(
        `\t(label ${quote(connection.net)} (at ${mm(ex)} ${mm(ey)} 0) ` +
          `(effects (font (size 1.27 1.27)) (justify left bottom)) (uuid ${quote(input.newUuid())}))`,
      )
    }
  })

  const rows = Math.ceil(placed.length / COLUMNS)
  if (input.notes.length > 0) {
    body.push(
      `\t(text ${quote(input.notes.join("\n"))} (exclude_from_sim no) ` +
        `(at ${mm(ORIGIN)} ${mm(ORIGIN + rows * GRID)} 0) ` +
        `(effects (font (size 1.27 1.27)) (justify left top)) (uuid ${quote(input.newUuid())}))`,
    )
  }

  const embedded = [...libIds].sort().map((libId) => embeddedSymbol(libId, vendoredSymbolText(libId).trimEnd()))
  return [
    "(kicad_sch",
    `\t(version ${FORMAT_VERSION})`,
    '\t(generator "audio-circuits")',
    '\t(generator_version "10.0")',
    `\t(uuid ${quote(root)})`,
    '\t(paper "A3")',
    "\t(lib_symbols",
    ...embedded,
    "\t)",
    ...body,
    '\t(sheet_instances (path "/" (page "1")))',
    "\t(embedded_fonts no)",
    ")",
    "",
  ].join("\n")
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `bun test tests/kicad/ && bun run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit and push**

```bash
git add lib/kicad/from-network.ts lib/kicad/schematic.ts tests/kicad/schematic.test.ts
git commit -m "Write a label-connected KiCad schematic stub from a Network"
git push
```

---

### Task 9: The stub verb, and the KiCad round trip

**Files:**
- Modify: `tools/perfboard/check.ts` (export the two validators with a narrower `where` parameter)
- Modify: `tools/perfboard/load.ts` (export `isNetwork`)
- Create: `tools/cli/schematic-stub.ts`
- Modify: `package.json` (script)
- Test: `tests/cli/schematic-stub.test.ts`
- Test: `tests/circuits/transistor-preamp-lab.test.ts`

**Interfaces:**
- Consumes: `writeSchematicStub` (Task 8), `schematicNotes` (Task 6).
- Produces:
  - `export function assertDesignators(value: unknown, where: SourceOfExports): Readonly<Record<string, string>>` and `export function assertPinNumbers(value: unknown, where: SourceOfExports): ...`, where `export interface SourceOfExports { readonly file: string; readonly circuitPath: string }` (a `PerfboardDeclaration` satisfies it)
  - `export function isNetwork(value: unknown): value is Network` from `tools/perfboard/load.ts`
  - `export interface SchematicStubDeps { readonly exists: (filePath: string) => boolean; readonly write: (filePath: string, text: string) => void; readonly newUuid: () => string }`
  - `export async function runSchematicStub(args: readonly string[], deps: SchematicStubDeps, log: (line: string) => void, error: (line: string) => void): Promise<number>`
  - Script: `bun run schematic-stub <circuit-module> <export> <out.kicad_sch>`

- [ ] **Step 1: Export the validators and the Network guard**

In `tools/perfboard/check.ts`, add above `assertDesignators`:

```ts
/** Where a circuit's exports were read from, for error messages. A PerfboardDeclaration
 * is one; the schematic-stub verb passes the module path for both fields. */
export interface SourceOfExports {
  readonly file: string
  readonly circuitPath: string
}
```

Then change `function assertDesignators(value: unknown, declaration: PerfboardDeclaration)` to `export function assertDesignators(value: unknown, declaration: SourceOfExports)`, and make the same change to `assertPinNumbers`. Their bodies are unchanged.

In `tools/perfboard/load.ts`, change `function isNetwork(` to `export function isNetwork(`.

Run: `bun test tests/perfboard && bun run typecheck`
Expected: PASS, unchanged.

- [ ] **Step 2: Write the failing verb tests**

Create `tests/cli/schematic-stub.test.ts`:

```ts
import { test, expect } from "bun:test"
import { runSchematicStub } from "../../tools/cli/schematic-stub.ts"
import type { SchematicStubDeps } from "../../tools/cli/schematic-stub.ts"

function harness(existing: ReadonlySet<string>) {
  const written = new Map<string, string>()
  const logs: string[] = []
  const errors: string[] = []
  let n = 0
  const deps: SchematicStubDeps = {
    exists: (p) => existing.has(p),
    write: (p, text) => { written.set(p, text) },
    newUuid: () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`,
  }
  return { deps, written, logs, errors, log: (l: string) => logs.push(l), error: (l: string) => errors.push(l) }
}

const MODULE = "circuits/transistor-preamp/index.ts"
const OUT = "/tmp/schematic-stub-test/lab-board.kicad_sch"

test("writes the stub for a module that exports everything it needs", async () => {
  const h = harness(new Set())
  const status = await runSchematicStub([MODULE, "transistorPreampLab", OUT], h.deps, h.log, h.error)
  expect(h.errors).toEqual([])
  expect(status).toBe(0)
  const text = h.written.get(OUT)
  if (text === undefined) throw new Error("nothing written")
  expect(text).toContain('(project "lab-board"')
  expect(text).toContain("BENCH SETTINGS")
})

test("refuses to overwrite an existing schematic", async () => {
  const h = harness(new Set([OUT]))
  const status = await runSchematicStub([MODULE, "transistorPreampLab", OUT], h.deps, h.log, h.error)
  expect(status).toBe(1)
  expect(h.written.size).toBe(0)
  expect(h.errors.join("\n")).toMatch(/already exists/)
})

test("refuses a module that does not export DESIGNATORS", async () => {
  const h = harness(new Set())
  const status = await runSchematicStub(
    ["circuits/opamp-buffer.ts", "opampBuffer", OUT], h.deps, h.log, h.error)
  expect(status).toBe(1)
  expect(h.errors.join("\n")).toMatch(/DESIGNATORS/)
})

test("refuses the wrong number of arguments", async () => {
  const h = harness(new Set())
  expect(await runSchematicStub([MODULE], h.deps, h.log, h.error)).toBe(1)
  expect(h.errors.join("\n")).toMatch(/usage/)
})
```

- [ ] **Step 3: Write the failing KiCad round-trip test**

Add to the imports of `tests/circuits/transistor-preamp-lab.test.ts`:

```ts
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { writeSchematicStub } from "../../lib/kicad/schematic.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import { defaultKicadCliExists, defaultRunExport } from "../../tools/perfboard/netlist-sync.ts"
```

Append:

```ts
/** The same default make/board.mk uses; KICAD_CLI overrides it. */
const KICAD_CLI = process.env["KICAD_CLI"] ?? "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

/** Nets as a partition of "designator.pin" members, ignoring net names. */
function partition(netlist: Pick<ImportedNetlist, "nets">): string[] {
  return Object.values(netlist.nets).map((members) => [...members].sort().join(" ")).sort()
}

function valuesOf(netlist: Pick<ImportedNetlist, "components">): Record<string, string> {
  return Object.fromEntries(netlist.components.map((c) => [c.designator, c.value]))
}

/** Asserts a KiCad netlist export describes exactly the lab board. */
function expectSameCircuit(exported: ImportedNetlist): void {
  const network = transistorPreampLab()
  const ours = toImportedNetlist(network, DESIGNATORS, PIN_NUMBERS)
  expect(partition(exported)).toEqual(partition(ours))
  expect(valuesOf(exported)).toEqual(valuesOf(ours))
  const footprints = new Map(exported.components.map((c) => [c.designator, c.footprint]))
  for (const component of network.components) {
    expect(footprints.get(DESIGNATORS[component.id] ?? "")).toBe(component.part?.footprint)
  }
}

test("KiCad reads the generated stub as the same circuit", () => {
  if (!defaultKicadCliExists(KICAD_CLI)) {
    throw new Error(
      `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI. This test ` +
        "does not skip: it is the only proof KiCad reads the stub the way the circuit means it.",
    )
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lab-board-stub-"))
  try {
    const sch = path.join(dir, "lab-board.kicad_sch")
    fs.writeFileSync(sch, writeSchematicStub({
      network: transistorPreampLab(), designators: DESIGNATORS, pinNumbers: PIN_NUMBERS,
      notes: schematicNotes(), projectName: "lab-board", newUuid: randomUUID,
    }))
    const net = path.join(dir, "lab-board.net")
    defaultRunExport(KICAD_CLI, sch, net, dir)
    expectSameCircuit(importNetlist(fs.readFileSync(net, "utf8")))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}, 30_000)
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `bun test tests/cli/schematic-stub.test.ts tests/circuits/transistor-preamp-lab.test.ts`
Expected: the verb tests FAIL, because the module does not exist. The round-trip test PASSes or FAILs on its own merits: it exercises Task 8's writer against real KiCad for the first time. If it fails, diagnose with superpowers:systematic-debugging before continuing. Run `kicad-cli sch erc` on a kept copy of the stub, and compare `partition` output side by side. Typical causes are a stub direction sign or a label not landing on a wire end. Fix the writer in `lib/kicad/schematic.ts` and add a unit test in `tests/kicad/schematic.test.ts` that pins the fix.

- [ ] **Step 5: Write `tools/cli/schematic-stub.ts`**

```ts
/**
 * Write a circuit's KiCad schematic stub, once.
 *
 *   bun run schematic-stub <circuit-module> <export> <out.kicad_sch>
 *
 * The module must export the named circuit function, DESIGNATORS, PIN_NUMBERS
 * and schematicNotes(). The stub is a starting point: it refuses to overwrite
 * an existing schematic, because once written the schematic belongs to the
 * operator, and the board's netlist-sync keeps it electrically honest.
 */
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { writeSchematicStub } from "../../lib/kicad/schematic.ts"
import { assertDesignators, assertPinNumbers } from "../perfboard/check.ts"
import { isRecord } from "../perfboard/guards.ts"
import { isNetwork } from "../perfboard/load.ts"
import { isMain } from "./entrypoint.ts"

export interface SchematicStubDeps {
  readonly exists: (filePath: string) => boolean
  readonly write: (filePath: string, text: string) => void
  readonly newUuid: () => string
}

const USAGE = "usage: bun run schematic-stub <circuit-module> <export> <out.kicad_sch>"

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export async function runSchematicStub(
  args: readonly string[],
  deps: SchematicStubDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const [moduleArg, exportName, outArg] = args
  if (args.length !== 3 || moduleArg === undefined || exportName === undefined || outArg === undefined) {
    error(USAGE)
    return 1
  }
  const modulePath = path.resolve(moduleArg)
  const outPath = path.resolve(outArg)
  if (deps.exists(outPath)) {
    error(
      `${outPath} already exists. The stub is written once; after that the schematic is yours, ` +
        "and netlist-sync keeps it electrically honest. Delete it first only if you mean to " +
        "throw your arrangement away.",
    )
    return 1
  }
  try {
    const imported: unknown = await import(modulePath)
    if (!isRecord(imported)) throw new Error(`${modulePath} did not import as an object`)
    const build = imported[exportName]
    if (typeof build !== "function") {
      throw new Error(`${modulePath} has no function export named "${exportName}"`)
    }
    const network: unknown = build()
    if (!isNetwork(network)) throw new Error(`"${exportName}" in ${modulePath} did not return a Network`)
    const where = { file: modulePath, circuitPath: modulePath }
    const designators = assertDesignators(imported["DESIGNATORS"], where)
    const pinNumbers = assertPinNumbers(imported["PIN_NUMBERS"], where)
    const notesOf = imported["schematicNotes"]
    if (typeof notesOf !== "function") {
      throw new Error(`${modulePath} does not export schematicNotes(); the stub's settings text comes from it`)
    }
    const notes: unknown = notesOf()
    if (!isStringArray(notes)) throw new Error(`schematicNotes() in ${modulePath} did not return strings`)
    deps.write(outPath, writeSchematicStub({
      network, designators, pinNumbers, notes,
      projectName: path.basename(outPath, ".kicad_sch"),
      newUuid: deps.newUuid,
    }))
    log(`wrote ${outPath}. Arrange it in KiCad; from here on it is yours.`)
    return 0
  } catch (caught) {
    error(caught instanceof Error ? caught.message : String(caught))
    return 1
  }
}

if (isMain(import.meta.url)) {
  const deps: SchematicStubDeps = {
    exists: (filePath) => fs.existsSync(filePath),
    write: (filePath, text) => fs.writeFileSync(filePath, text),
    newUuid: () => randomUUID(),
  }
  process.exit(await runSchematicStub(process.argv.slice(2), deps, console.log, console.error))
}
```

In `package.json` `scripts`, add `"schematic-stub": "bun run tools/cli/schematic-stub.ts"`.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `bun test && bun run typecheck`
Expected: all PASS, including the KiCad round trip.

- [ ] **Step 7: Commit and push**

```bash
git add tools/perfboard/check.ts tools/perfboard/load.ts tools/cli/schematic-stub.ts package.json tests/cli/schematic-stub.test.ts tests/circuits/transistor-preamp-lab.test.ts
git commit -m "Add the schematic-stub verb and prove KiCad reads the stub as the circuit"
git push
```

---

### Task 10: `perfboard import`, a board's first layout

`update` needs an existing `.vrt`. A new board has none, and the fork's `--import <net> -o <out>` is what creates one.

**Files:**
- Modify: `tools/perfboard/verbs.ts` (export `runnerFor`, `tempPathAlongside`, `cleanupProduced`)
- Create: `tools/perfboard/import.ts`
- Modify: `tools/cli/perfboard-binary-verbs.ts` (add `dispatchImport`)
- Modify: `tools/cli/perfboard.ts` (the `VERBS` table and dispatch)
- Modify: `make/board.mk` (`import` target, `.PHONY`, help)
- Test: `tests/perfboard/import.test.ts`

**Interfaces:**
- Produces: `export async function runImport(declaration: PerfboardDeclaration, deps: VerbDeps = {}): Promise<string>`, and the verb `bun run perfboard import -C <board-dir>` / `make import`.

- [ ] **Step 1: Export the three helpers**

In `tools/perfboard/verbs.ts`, change `function runnerFor(`, `function tempPathAlongside(` and `function cleanupProduced(` to `export function ...`. Bodies unchanged.

- [ ] **Step 2: Write the failing tests**

Create `tests/perfboard/import.test.ts`:

```ts
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { runImport } from "../../tools/perfboard/import.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"
import type { VerbDeps } from "../../tools/perfboard/verbs.ts"

function board(): PerfboardDeclaration {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-import-"))
  return {
    file: path.join(dir, "perfboard.json"), dir,
    circuitPath: path.join(dir, "circuit.ts"), exportName: "circuit",
    vrtPath: path.join(dir, "board.vrt"),
  }
}

function deps(status: number, calls: string[][]): VerbDeps {
  return {
    exportNetlist: async () => "NETLIST",
    runVeroroute: (args) => {
      calls.push([...args])
      const out = args[args.indexOf("-o") + 1]
      if (status === 0 && out !== undefined) fs.writeFileSync(out, "VRT")
      return { status, output: status === 0 ? "" : "import failed" }
    },
  }
}

test("creates the first layout from the circuit's netlist", async () => {
  const declaration = board()
  const calls: string[][] = []
  const report = await runImport(declaration, deps(0, calls))
  expect(calls[0]?.[0]).toBe("--import")
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("VRT")
  expect(report).toMatch(/unplaced/)
})

test("refuses when the layout already exists, pointing at update", async () => {
  const declaration = board()
  fs.writeFileSync(declaration.vrtPath, "EXISTING")
  await expect(runImport(declaration, deps(0, []))).rejects.toThrow(/update/)
  expect(fs.readFileSync(declaration.vrtPath, "utf8")).toBe("EXISTING")
})

test("a failed import writes nothing and leaves no temp file behind", async () => {
  const declaration = board()
  await expect(runImport(declaration, deps(1, []))).rejects.toThrow(/import failed/)
  expect(fs.readdirSync(declaration.dir).filter((f) => f.endsWith(".vrt"))).toEqual([])
})
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `bun test tests/perfboard/import.test.ts`
Expected: FAIL. The module does not exist.

- [ ] **Step 4: Write `tools/perfboard/import.ts`**

```ts
/**
 * `import`: create a board's FIRST layout from its circuit.
 *
 * `update` reconciles an existing .vrt; a new board has none. The fork's
 * `--import <net> -o <out>` builds a fresh board with every part unplaced. The
 * netlist comes through `exportNetlistFor`, the same single lowering path every
 * other verb uses, and the result lands through `replaceAtomically` from a
 * same-directory temp file, as every other write does.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { exportNetlistFor } from "./check.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { replaceAtomically } from "./mutate.ts"
import { cleanupProduced, runnerFor, tempPathAlongside } from "./verbs.ts"
import type { VerbDeps, VerbRun } from "./verbs.ts"

export async function runImport(declaration: PerfboardDeclaration, deps: VerbDeps = {}): Promise<string> {
  if (fs.existsSync(declaration.vrtPath)) {
    throw new Error(
      `${declaration.vrtPath} already exists. "import" creates a board's first layout; to bring ` +
        'an existing layout up to date with its circuit, use "update".',
    )
  }
  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const runVeroroute = runnerFor(deps)
  const producedPath = tempPathAlongside(declaration.vrtPath, "import")
  const text = await exportNetlist(declaration)

  const netDir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-import-"))
  let run: VerbRun
  try {
    const netPath = path.join(netDir, `${path.basename(declaration.vrtPath, ".vrt")}.net`)
    fs.writeFileSync(netPath, text)
    try {
      run = runVeroroute(["--import", netPath, "-o", producedPath])
    } catch (error) {
      cleanupProduced(producedPath)
      throw error
    }
  } finally {
    fs.rmSync(netDir, { recursive: true, force: true })
  }

  if (run.status !== 0) {
    cleanupProduced(producedPath)
    throw new Error(
      `veroroute --import for ${declaration.vrtPath} exited ${run.status}; no layout was written.\n` +
        run.output,
    )
  }
  replaceAtomically(declaration.vrtPath, producedPath)
  return (
    `${declaration.vrtPath} created from the circuit with every part unplaced. Commit it, then ` +
    'arrange it with "edit".'
  )
}
```

- [ ] **Step 5: Wire the verb**

In `tools/cli/perfboard-binary-verbs.ts`, import `runImport` from `../perfboard/import.ts` and add, next to `dispatchUpdate`:

```ts
export async function dispatchImport(
  cwd: string,
  args: readonly string[],
  verbDeps: VerbDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  if (parseFlags(args, new Set(), error) === null) return 1
  const declaration = boardHere(cwd, "import", error)
  if (declaration === null) return 1
  try {
    log(await runImport(declaration, mergedVerbDeps(verbDeps, repoRoot)))
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}
```

In `tools/cli/perfboard.ts`:
- Add `["import", "create this board's first layout from its circuit"],` to `VERBS`, directly before the `update` entry.
- Import `dispatchImport` alongside `dispatchUpdate`.
- Add `if (verb === "import") return dispatchImport(cwd, args.slice(1), opts.verbDeps, opts.repoRoot, log, error)` directly before the `update` dispatch line.

In `make/board.mk`:
- Add `import` to the `.PHONY` line.
- Next to the `update:` target, add:

```make
import: veroroute netlist-agrees
	@bun "$(CLI)" import -C "$(CURDIR)"
```

- In `perfboard-help`, under "Work on it", add a line in the same style as `make update`: `make import                            create this board's first layout`.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `bun test && bun run typecheck`
Expected: all PASS. If a CLI test asserts the exact `VERBS` help text, update its expected text to include the new line.

- [ ] **Step 7: Commit and push**

```bash
git add tools/perfboard tools/cli make/board.mk tests/perfboard/import.test.ts
git commit -m "Add perfboard import: a new board's first layout from its circuit"
git push
```

---

### Task 11: The board, the stub and the first layout

**Files:**
- Create (generated): `circuits/transistor-preamp/lab-board.kicad_sch`
- Create: `boards/transistor-preamp-lab/perfboard.json`
- Create: `boards/transistor-preamp-lab/Makefile`
- Create (by `netlist-sync`): `tests/fixtures/transistor-preamp-lab.net`
- Create (by `import`, then `stripboard`): `boards/transistor-preamp-lab/transistor-preamp-lab.perfboard.vrt`
- Modify: `tests/circuits/transistor-preamp-lab.test.ts`

`make netlist-agrees` runs `tests/circuits/<board-directory-name>.test.ts`, which is why the board directory is named `transistor-preamp-lab`.

- [ ] **Step 1: Generate the stub**

Run: `bun run schematic-stub circuits/transistor-preamp/index.ts transistorPreampLab circuits/transistor-preamp/lab-board.kicad_sch`
Expected: `wrote .../lab-board.kicad_sch`.

- [ ] **Step 2: Declare the board**

Write `boards/transistor-preamp-lab/perfboard.json`:

```json
{
  "sch": "../../circuits/transistor-preamp/lab-board.kicad_sch",
  "circuit": "../../circuits/transistor-preamp/index.ts",
  "export": "transistorPreampLab",
  "netlist": "../../tests/fixtures/transistor-preamp-lab.net",
  "vrt": "transistor-preamp-lab.perfboard.vrt"
}
```

Write `boards/transistor-preamp-lab/Makefile`, identical to `boards/pt2399-core/Makefile`:

```make
# Perfboard targets; `make help` lists them. This line is the whole of what a
# board or aggregate directory needs.
include $(shell git rev-parse --show-toplevel)/make/perfboard.mk
```

- [ ] **Step 3: Write the failing fixture test**

Append to `tests/circuits/transistor-preamp-lab.test.ts`:

```ts
test("the schematic's netlist export describes the same circuit as the model", async () => {
  expectSameCircuit(importNetlist(await Bun.file("tests/fixtures/transistor-preamp-lab.net").text()))
})
```

Run: `bun test tests/circuits/transistor-preamp-lab.test.ts`
Expected: FAIL, because the fixture does not exist yet.

- [ ] **Step 4: Produce the fixture through the board's own freshness check**

Run: `make -C boards/transistor-preamp-lab netlist-agrees`
Expected: `tests/fixtures/transistor-preamp-lab.net created from ...`, followed by the board's test file passing.

- [ ] **Step 5: Commit and push the stub, the board and the fixture**

```bash
git add circuits/transistor-preamp/lab-board.kicad_sch boards/transistor-preamp-lab tests/fixtures/transistor-preamp-lab.net tests/circuits/transistor-preamp-lab.test.ts
git commit -m "Generate the lab board's schematic stub and declare its board"
git push
```

- [ ] **Step 6: Create the first layout**

Run: `make -C boards/transistor-preamp-lab import`
Expected: acquires or builds the pinned VeroRoute fork if needed, then `... created from the circuit with every part unplaced`. If the fork build fails, stop and report the output. Do not work around it.

Commit and push it (`stripboard` in the next step refuses an uncommitted layout):

```bash
git add boards/transistor-preamp-lab/transistor-preamp-lab.perfboard.vrt
git commit -m "Import the lab board's first, unplaced layout"
git push
```

- [ ] **Step 7: Switch it to stripboard**

Run: `make -C boards/transistor-preamp-lab stripboard STRIPS=horizontal`
Expected: the layout is rewritten in strip mode.

Then run: `make -C boards/transistor-preamp-lab check`
Expected: a clean check against the circuit. Record the output verbatim in the commit message body if it reports anything other than clean.

```bash
git add boards/transistor-preamp-lab/transistor-preamp-lab.perfboard.vrt
git commit -m "Put the lab board layout in horizontal strip mode"
git push
```

- [ ] **Step 8: Full verification**

Run: `bun test && bun run typecheck && make -C boards check`
Expected: all green, and every board checks clean. Report the actual counts.

- [ ] **Step 9: Hand off**

Report to the operator:
- `circuits/transistor-preamp/lab-board.kicad_sch` is theirs to arrange in KiCad. After editing, `make -C boards/transistor-preamp-lab netlist-agrees` confirms it is still the same circuit.
- `make -C boards/transistor-preamp-lab edit` opens the unplaced layout in VeroRoute for placement.
- Capacitor values and can sizes are placeholders to confirm on the bench.
