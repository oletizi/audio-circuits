# Optical Compressor Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a +9 V single-supply optical compressor as a tscircuit module — one `Vactrol` library part, one `TL072H` library part, and one `OpticalCompressor` module composed from three internal parts — that type-checks, renders, builds, and passes connectivity tests.

**Architecture:** The module is a feedback optical compressor: input buffer → LDR shunt attenuator → makeup amplifier → output, with a sidechain tapped after makeup gain driving the vactrol LED through a half-wave detector and a degenerated 2N3904. Implementation splits into `parts/PowerSection.tsx`, `parts/AudioPath.tsx`, and `parts/Sidechain.tsx`, composed by `OpticalCompressor.tsx`. Parts are internal — not exported — so the public surface stays one component and one props interface.

**Tech Stack:** tscircuit 0.0.1253, TypeScript 5.9 (strict), Bun 1.3 (runtime + `bun test`), `tsci` CLI for dev/build.

**Spec:** `docs/superpowers/specs/2026-09-21-optical-compressor-design.md` (revision 3). Read it before starting. Section references below (§6.1, §8.7, etc.) point into it.

## Global Constraints

These apply to **every** task. Do not restate them per-task; do not violate them.

- **Imports must be explicit file paths.** `import { TL072H } from "../../lib/chips/TL072H.tsx"` — never a directory import (`"../../lib/chips"`) and never a path alias (`"@/lib/..."`). tscircuit's web eval resolves neither. (The user's global preference for `@/` imports does not apply in this repo; the project `CLAUDE.md` overrides it for exactly this reason.)
- **No `any`, no `as Type` casts, no `@ts-ignore`.** Circuit JSON is traversed through type guards defined in Task 1.
- **Source files stay under 500 lines.** If a part file approaches it, that is a signal to re-split, not to continue.
- **Every component and net name is prefixed with the module's `name` prop.** `${name}_R_SHUNT`, `net.${name}_VBIAS`.
- **No fallbacks or defaulted values that hide missing information.** `vactrolFootprint` is a required prop with no default (§9). Other component values get defaults matching the spec's provisional values.
- **Schematic layout uses `createGrid()` from `lib/layout.ts`** with explicit `schX`/`schY`. Signal flows left→right; power above, ground/sidechain below. `schFlex` does not work for schematics.
- **Named nets, not auto-generated pin concatenations.** Declare `<net name={...} />` and route through it.
- **Never add AI attribution to commit messages.** No `Co-Authored-By`, no session links, no generated-with footer.
- **Test design:** assert on *connectivity, component values, and footprints*. Never assert on `schX`/`schY` coordinates — layout is presentation and those assertions are brittle. Every part test must also assert zero floating pins.

### Component values (from spec revision 3 — use these exactly)

| Ref | Value | Spec § |
|---|---|---|
| R_SHUNT | 22 kΩ | §8.3 |
| C_IN | 100 nF | §8.2 |
| R_IN_BIAS | 1 MΩ | §8.2 |
| R_MAKEUP_G | 10 kΩ | §8.4 |
| C_OUT | 2.2 µF | §8.4 |
| R_OUT_PD | 100 kΩ | §8.4 |
| R_SC_G | 10 kΩ | §8.5 |
| R_SC_F | 100 kΩ | §8.5 |
| C_SC | 1 µF | §8.6 |
| **C_DET** | **4.7 µF** | §8.6.1 |
| R_REL | 100 kΩ | §8.6 |
| R_B | 10 kΩ | §8.7 |
| R_B_PD | 100 kΩ | §8.7 |
| **R_E** | **1 kΩ** | §8.7.1 |
| **R_LED** | **3.3 kΩ** | §8.7.2 |
| R_SENSE | 10 Ω | §8.8 |
| R_PEAK_FAIL | 1 MΩ | §10.1 |
| R_BIAS1 / R_BIAS2 | 47 kΩ each | §8.1 |
| C_BULK / C_BIAS | 47 µF each | §8.1 |
| Decoupling / HF bypass | 100 nF | §8.1 |

### Op-amp section assignment (§8.1) — do not deviate

| Package | Section A | Section B | Declared in |
|---|---|---|---|
| `${name}_U1` | input buffer | makeup amplifier | `parts/AudioPath.tsx` |
| `${name}_U2` | sidechain amplifier | VBIAS buffer | `parts/PowerSection.tsx` |

`U2` section A is used by `Sidechain.tsx` even though `U2` is *declared* in `PowerSection.tsx`. This is intentional and it works: tscircuit resolves `<trace>` selectors by component name across group and fragment boundaries within the same board. This was verified before writing this plan.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `lib/testing/circuit-assertions.ts` | Render a circuit and assert connectivity/values without `any` |
| `lib/chips/TL072H.tsx` | TL072H dual JFET op-amp, rail-to-rail output, 4.5–40 V |
| `lib/connectors/TestPoint.tsx` | 1-pin labeled test point |
| `lib/opto/Vactrol.tsx` | Generic 4-terminal LED/LDR vactrol, **required footprint** |
| `lib/opto/index.ts` | Vactrol re-export |
| `modules/optical-compressor/parts/PowerSection.tsx` | Protection, reservoir, VBIAS divider + buffer, U2 |
| `modules/optical-compressor/parts/AudioPath.tsx` | U1, input buffer, attenuator, vactrol, makeup amp |
| `modules/optical-compressor/parts/Sidechain.tsx` | Sidechain amp passives, detector, degenerated driver, sense resistor |
| `modules/optical-compressor/OpticalCompressor.tsx` | Public component: props, connectors, part composition |
| `modules/optical-compressor/index.ts` | Public re-export (parts are NOT exported) |
| `modules/optical-compressor/optical-compressor.circuit.tsx` | Standalone fixture |
| `modules/optical-compressor/DESIGN-NOTES.md` | Modeling boundary, measured values, populate options |

**Modify:** `package.json` (test script), `lib/chips/index.ts`, `lib/connectors/index.ts`, `lib/index.ts`, `modules/index.ts`, `README.md`.

**Test files** mirror their subjects: `lib/opto/Vactrol.test.tsx`, `modules/optical-compressor/parts/Sidechain.test.tsx`, etc.

---

### Task 1: Test harness and circuit assertion helpers

Everything downstream asserts through these. Build them first and test the helpers themselves.

**Files:**
- Create: `lib/testing/circuit-assertions.ts`
- Create: `lib/testing/circuit-assertions.test.tsx`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Consumes: nothing (foundation task)
- Produces:
  - `renderCircuit(element: ReactElement): Promise<CircuitElement[]>`
  - `netKeyOf(elements: CircuitElement[], componentName: string, pin: string): string | undefined`
  - `expectConnected(elements: CircuitElement[], a: string, b: string): void` — endpoints as `"R1.pin2"` or `"Q1.emitter"`
  - `expectNotConnected(elements, a, b): void`
  - `expectComponentValue(elements, name, field: "resistance" | "capacitance", expected: number): void`
  - `expectNoFloatingPins(elements, allowed?: string[]): void`
  - `findComponent(elements, name): SourceComponent | undefined`
  - `findNet(elements, name): SourceNet | undefined` (used by Task 4)

- [ ] **Step 1: Write the failing test**

Create `lib/testing/circuit-assertions.test.tsx`:

```tsx
import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectComponentValue,
  expectNoFloatingPins,
  findComponent,
} from "./circuit-assertions.ts"

const Fixture = () => (
  <board width="20mm" height="20mm">
    <resistor name="R1" resistance="10k" footprint="0805" />
    <resistor name="R2" resistance="22k" footprint="0805" />
    <capacitor name="C1" capacitance="100nF" footprint="0805" />
    <transistor name="Q1" type="npn" footprint="sot23" />
    <net name="MID" />
    <trace from=".R1 > .pin2" to="net.MID" />
    <trace from=".C1 > .pin1" to="net.MID" />
    <trace from=".R1 > .pin1" to=".R2 > .pin1" />
    <trace from=".Q1 > .emitter" to=".R2 > .pin2" />
  </board>
)

test("renderCircuit returns source elements", async () => {
  const el = await renderCircuit(<Fixture />)
  expect(findComponent(el, "R1")?.name).toBe("R1")
  expect(findComponent(el, "NOPE")).toBeUndefined()
})

test("expectConnected passes for pins on a shared net", async () => {
  const el = await renderCircuit(<Fixture />)
  expectConnected(el, "R1.pin2", "C1.pin1")
})

test("expectConnected passes for a direct trace", async () => {
  const el = await renderCircuit(<Fixture />)
  expectConnected(el, "R1.pin1", "R2.pin1")
})

test("expectConnected resolves named pins via port hints", async () => {
  const el = await renderCircuit(<Fixture />)
  expectConnected(el, "Q1.emitter", "R2.pin2")
})

test("expectConnected throws for unconnected pins", async () => {
  const el = await renderCircuit(<Fixture />)
  expect(() => expectConnected(el, "R1.pin1", "C1.pin1")).toThrow()
})

test("expectConnected throws for a pin that does not exist", async () => {
  const el = await renderCircuit(<Fixture />)
  expect(() => expectConnected(el, "R1.pin9", "C1.pin1")).toThrow(/pin9/)
})

test("expectNotConnected is the inverse", async () => {
  const el = await renderCircuit(<Fixture />)
  expectNotConnected(el, "R1.pin1", "C1.pin1")
  expect(() => expectNotConnected(el, "R1.pin2", "C1.pin1")).toThrow()
})

test("expectComponentValue checks parsed values", async () => {
  const el = await renderCircuit(<Fixture />)
  expectComponentValue(el, "R1", "resistance", 10_000)
  expectComponentValue(el, "C1", "capacitance", 100e-9)
  expect(() => expectComponentValue(el, "R1", "resistance", 22_000)).toThrow()
})

test("expectNoFloatingPins reports floating pins and honours the allowlist", async () => {
  const el = await renderCircuit(<Fixture />)
  // C1.pin2, Q1.collector and Q1.base are deliberately unconnected here
  expect(() => expectNoFloatingPins(el)).toThrow(/C1/)
  expectNoFloatingPins(el, ["C1.pin2", "Q1.collector", "Q1.base"])
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test lib/testing/circuit-assertions.test.tsx
```

Expected: FAIL — `Cannot find module './circuit-assertions.ts'`.

- [ ] **Step 3: Write the implementation**

Create `lib/testing/circuit-assertions.ts`. Note the type-guard approach: `getCircuitJson()` is validated into our own narrow interfaces rather than cast, which satisfies the no-`any`/no-cast constraint.

```ts
/**
 * Test helpers for asserting on rendered tscircuit output.
 *
 * Electrical connectivity is read from `subcircuit_connectivity_map_key` on
 * source ports: ports sharing a key are on the same net, whether they were
 * joined by a direct trace or through a named net. A port with no key is
 * floating.
 */

import type { ReactElement } from "react"
import { RootCircuit } from "tscircuit"

export interface CircuitElement {
  readonly type: string
}

export interface SourceComponent extends CircuitElement {
  readonly type: "source_component"
  readonly source_component_id: string
  readonly name: string
  readonly ftype?: string
  readonly resistance?: number
  readonly capacitance?: number
}

export interface SourcePort extends CircuitElement {
  readonly type: "source_port"
  readonly source_port_id: string
  readonly source_component_id: string
  readonly name: string
  readonly port_hints?: readonly string[]
  readonly subcircuit_connectivity_map_key?: string
}

export interface SourceNet extends CircuitElement {
  readonly type: "source_net"
  readonly name: string
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null

const isCircuitElement = (v: unknown): v is CircuitElement =>
  isRecord(v) && typeof v.type === "string"

const isSourceComponent = (e: CircuitElement): e is SourceComponent =>
  e.type === "source_component" &&
  typeof (e as Record<string, unknown>).name === "string"

const isSourcePort = (e: CircuitElement): e is SourcePort =>
  e.type === "source_port" &&
  typeof (e as Record<string, unknown>).name === "string"

const isSourceNet = (e: CircuitElement): e is SourceNet =>
  e.type === "source_net" &&
  typeof (e as Record<string, unknown>).name === "string"

/** Render a circuit to settled circuit JSON. */
export async function renderCircuit(
  element: ReactElement,
): Promise<CircuitElement[]> {
  const circuit = new RootCircuit()
  circuit.add(element)
  await circuit.renderUntilSettled()
  const json: unknown = circuit.getCircuitJson()
  if (!Array.isArray(json)) {
    throw new Error("getCircuitJson() did not return an array")
  }
  return json.filter(isCircuitElement)
}

export function findComponent(
  elements: readonly CircuitElement[],
  name: string,
): SourceComponent | undefined {
  return elements.filter(isSourceComponent).find((c) => c.name === name)
}

export function findNet(
  elements: readonly CircuitElement[],
  name: string,
): SourceNet | undefined {
  return elements.filter(isSourceNet).find((n) => n.name === name)
}

function portsOf(
  elements: readonly CircuitElement[],
  component: SourceComponent,
): SourcePort[] {
  return elements
    .filter(isSourcePort)
    .filter((p) => p.source_component_id === component.source_component_id)
}

function findPort(
  elements: readonly CircuitElement[],
  componentName: string,
  pin: string,
): SourcePort {
  const component = findComponent(elements, componentName)
  if (!component) {
    throw new Error(
      `No component named "${componentName}". Present: ${elements
        .filter(isSourceComponent)
        .map((c) => c.name)
        .join(", ")}`,
    )
  }
  const ports = portsOf(elements, component)
  const port = ports.find(
    (p) => p.name === pin || (p.port_hints ?? []).includes(pin),
  )
  if (!port) {
    throw new Error(
      `Component "${componentName}" has no pin "${pin}". Pins: ${ports
        .map((p) => p.name)
        .join(", ")}`,
    )
  }
  return port
}

/** Endpoint string "R1.pin2" or "Q1.emitter" -> [component, pin]. */
function splitEndpoint(endpoint: string): [string, string] {
  const dot = endpoint.lastIndexOf(".")
  if (dot < 1 || dot === endpoint.length - 1) {
    throw new Error(
      `Endpoint "${endpoint}" must be of the form "COMPONENT.pin"`,
    )
  }
  return [endpoint.slice(0, dot), endpoint.slice(dot + 1)]
}

/** The connectivity key for a pin, or undefined if the pin is floating. */
export function netKeyOf(
  elements: readonly CircuitElement[],
  componentName: string,
  pin: string,
): string | undefined {
  return findPort(elements, componentName, pin).subcircuit_connectivity_map_key
}

export function expectConnected(
  elements: readonly CircuitElement[],
  a: string,
  b: string,
): void {
  const [aComp, aPin] = splitEndpoint(a)
  const [bComp, bPin] = splitEndpoint(b)
  const aKey = netKeyOf(elements, aComp, aPin)
  const bKey = netKeyOf(elements, bComp, bPin)
  if (aKey === undefined) throw new Error(`${a} is floating (no net)`)
  if (bKey === undefined) throw new Error(`${b} is floating (no net)`)
  if (aKey !== bKey) {
    throw new Error(
      `${a} and ${b} are on different nets (${aKey} vs ${bKey})`,
    )
  }
}

export function expectNotConnected(
  elements: readonly CircuitElement[],
  a: string,
  b: string,
): void {
  const [aComp, aPin] = splitEndpoint(a)
  const [bComp, bPin] = splitEndpoint(b)
  const aKey = netKeyOf(elements, aComp, aPin)
  const bKey = netKeyOf(elements, bComp, bPin)
  if (aKey !== undefined && aKey === bKey) {
    throw new Error(`${a} and ${b} are unexpectedly connected (${aKey})`)
  }
}

export function expectComponentValue(
  elements: readonly CircuitElement[],
  name: string,
  field: "resistance" | "capacitance",
  expected: number,
): void {
  const component = findComponent(elements, name)
  if (!component) throw new Error(`No component named "${name}"`)
  const actual = component[field]
  if (actual === undefined) {
    throw new Error(`Component "${name}" has no ${field}`)
  }
  // Relative tolerance absorbs float representation of values like 4.7µF.
  const tolerance = Math.abs(expected) * 1e-6
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Component "${name}" ${field} is ${actual}, expected ${expected}`,
    )
  }
}

/**
 * Assert no pin is left unconnected.
 *
 * `allowed` lists endpoints ("U1.INB_N") that are deliberately unconnected.
 * Keep it short — a long allowlist usually means real wiring is missing.
 */
export function expectNoFloatingPins(
  elements: readonly CircuitElement[],
  allowed: readonly string[] = [],
): void {
  const allowedSet = new Set(allowed)
  const floating: string[] = []

  for (const component of elements.filter(isSourceComponent)) {
    for (const port of portsOf(elements, component)) {
      if (port.subcircuit_connectivity_map_key !== undefined) continue
      const endpoint = `${component.name}.${port.name}`
      const hintEndpoints = (port.port_hints ?? []).map(
        (h) => `${component.name}.${h}`,
      )
      const isAllowed =
        allowedSet.has(endpoint) || hintEndpoints.some((h) => allowedSet.has(h))
      if (!isAllowed) floating.push(endpoint)
    }
  }

  if (floating.length > 0) {
    throw new Error(`Floating pins: ${floating.join(", ")}`)
  }
}
```

- [ ] **Step 4: Add the test script**

In `package.json`, add to `scripts`:

```json
"test": "bun test",
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
bun test lib/testing/circuit-assertions.test.tsx
bun run typecheck
```

Expected: 9 pass, 0 fail; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add lib/testing package.json
git commit -m "test: add circuit connectivity assertion helpers"
```

---

### Task 2: TL072H and TestPoint library components

**Files:**
- Create: `lib/chips/TL072H.tsx`, `lib/chips/TL072H.test.tsx`
- Create: `lib/connectors/TestPoint.tsx`
- Modify: `lib/chips/index.ts`, `lib/connectors/index.ts`

**Interfaces:**
- Consumes: `renderCircuit`, `findComponent`, `expectNoFloatingPins` from Task 1
- Produces:
  - `tl072hPinLabels` — `{ pin1: "OUTA", pin2: "INA_N", pin3: "INA_P", pin4: "GND", pin5: "INB_P", pin6: "INB_N", pin7: "OUTB", pin8: "VCC" }`
  - `TL072H: (props: TL072HProps) => JSX.Element`, `TL072HProps = ChipProps<typeof tl072hPinLabels>`
  - `TestPoint: (props: TestPointProps) => JSX.Element` with single pin `TP`

Note pin 4: on a single supply the TL072H's negative rail is **ground**, so the label is `GND`, not `VEE` as in the existing bipolar `TL072`. This is the single most important difference between the two parts and the reason a separate component exists.

- [ ] **Step 1: Write the failing test**

Create `lib/chips/TL072H.test.tsx`:

```tsx
import { test, expect } from "bun:test"
import {
  renderCircuit,
  findComponent,
  expectConnected,
} from "../testing/circuit-assertions.ts"
import { TL072H } from "./TL072H.tsx"
import { TestPoint } from "../connectors/TestPoint.tsx"

test("TL072H exposes single-supply pin names with GND on pin 4", async () => {
  const el = await renderCircuit(
    <board width="20mm" height="20mm">
      <TL072H name="U1" />
      <net name="GND" />
      <net name="V9" />
      <trace from=".U1 > .GND" to="net.GND" />
      <trace from=".U1 > .VCC" to="net.V9" />
      <trace from=".U1 > .OUTA" to=".U1 > .INA_N" />
      <trace from=".U1 > .OUTB" to=".U1 > .INB_N" />
      <trace from=".U1 > .INA_P" to="net.GND" />
      <trace from=".U1 > .INB_P" to="net.GND" />
    </board>,
  )
  expect(findComponent(el, "U1")).toBeDefined()
  expectConnected(el, "U1.OUTA", "U1.INA_N")
  expectConnected(el, "U1.GND", "U1.INA_P")
})

test("TL072H defaults to soic8 and accepts a footprint override", async () => {
  const el = await renderCircuit(
    <board width="20mm" height="20mm">
      <TL072H name="U1" footprint="dip8" />
      <net name="GND" />
      <trace from=".U1 > .GND" to="net.GND" />
    </board>,
  )
  expect(findComponent(el, "U1")).toBeDefined()
})

test("TestPoint exposes a single TP pin", async () => {
  const el = await renderCircuit(
    <board width="20mm" height="20mm">
      <TestPoint name="TP_A" />
      <resistor name="R1" resistance="1k" footprint="0805" />
      <net name="GND" />
      <trace from=".TP_A > .TP" to=".R1 > .pin1" />
      <trace from=".R1 > .pin2" to="net.GND" />
    </board>,
  )
  expectConnected(el, "TP_A.TP", "R1.pin1")
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test lib/chips/TL072H.test.tsx
```

Expected: FAIL — `Cannot find module './TL072H.tsx'`.

- [ ] **Step 3: Write TL072H**

Create `lib/chips/TL072H.tsx`:

```tsx
/**
 * TL072H Dual JFET-Input Op-Amp (single-supply variant)
 *
 * Distinct from the bipolar `TL072` in this library: the H suffix is
 * specified for a 4.5-40 V total supply and has a rail-to-rail output
 * stage, both of which the +9 V optical compressor depends on. Pin 4 is
 * labelled GND rather than VEE because on a single supply the negative
 * rail IS ground.
 *
 * The rail-to-rail output headroom figure used in the compressor's
 * sidechain budget is extrapolated from a 40 V characterization and must
 * be measured at 8.7 V before it is trusted. See the design spec, 6.1.3.
 *
 * Pinout (DIP-8 / SOIC-8):
 *   1 OUTA   2 INA_N   3 INA_P   4 GND
 *   5 INB_P  6 INB_N   7 OUTB    8 VCC
 */

import type { ChipProps } from "tscircuit"

export const tl072hPinLabels = {
  pin1: "OUTA",
  pin2: "INA_N",
  pin3: "INA_P",
  pin4: "GND",
  pin5: "INB_P",
  pin6: "INB_N",
  pin7: "OUTB",
  pin8: "VCC",
} as const

export type TL072HProps = ChipProps<typeof tl072hPinLabels>

export const TL072H = (props: TL072HProps) => (
  <chip
    footprint={props.footprint ?? "soic8"}
    pinLabels={tl072hPinLabels}
    schPinArrangement={{
      leftSide: {
        direction: "top-to-bottom",
        pins: ["INA_P", "INA_N", "INB_P", "INB_N"],
      },
      rightSide: { direction: "top-to-bottom", pins: ["OUTA", "OUTB"] },
      topSide: { direction: "left-to-right", pins: ["VCC"] },
      bottomSide: { direction: "left-to-right", pins: ["GND"] },
    }}
    {...props}
  />
)
```

- [ ] **Step 4: Write TestPoint**

Create `lib/connectors/TestPoint.tsx`:

```tsx
/**
 * Single-pin test point for bench probing.
 *
 * Rendered as a 1-pin header so a probe or clip can attach. The pin is
 * named TP so selectors read `.TP_VBIAS > .TP`.
 */

import type { ChipProps } from "tscircuit"

export const testPointPinLabels = { pin1: "TP" } as const

export type TestPointProps = ChipProps<typeof testPointPinLabels>

export const TestPoint = (props: TestPointProps) => (
  <chip
    footprint="pinrow1"
    pinLabels={testPointPinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["TP"] },
    }}
    {...props}
  />
)
```

- [ ] **Step 5: Export both from their index files**

In `lib/chips/index.ts`, add:

```ts
export { TL072H, tl072hPinLabels, type TL072HProps } from "./TL072H.tsx"
```

In `lib/connectors/index.ts`, add:

```ts
export { TestPoint, testPointPinLabels, type TestPointProps } from "./TestPoint.tsx"
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
bun test lib/chips/TL072H.test.tsx
bun run typecheck
```

Expected: 3 pass, 0 fail; typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add lib/chips lib/connectors
git commit -m "feat: add TL072H single-supply op-amp and TestPoint components"
```

---

### Task 3: Vactrol library component

**Files:**
- Create: `lib/opto/Vactrol.tsx`, `lib/opto/Vactrol.test.tsx`, `lib/opto/index.ts`
- Modify: `lib/index.ts`

**Interfaces:**
- Consumes: Task 1 helpers
- Produces:
  - `vactrolPinLabels` — `{ pin1: "LED_A", pin2: "LED_K", pin3: "LDR_1", pin4: "LDR_2" }`
  - `VactrolProps` — `ChipProps<typeof vactrolPinLabels>` with `footprint` **required** (`string`)
  - `Vactrol: (props: VactrolProps) => JSX.Element`

The required footprint is a spec requirement (§9), not a style choice: §12.1 item 7 demands every vactrol pin map to a datasheet-verified pad, and a defaulted footprint would let an unverified pad map reach fabrication output.

- [ ] **Step 1: Write the failing test**

Create `lib/opto/Vactrol.test.tsx`:

```tsx
import { test, expect } from "bun:test"
import {
  renderCircuit,
  findComponent,
  expectConnected,
  expectNotConnected,
} from "../testing/circuit-assertions.ts"
import { Vactrol } from "./Vactrol.tsx"

const fixture = (
  <board width="20mm" height="20mm">
    <Vactrol name="VT1" footprint="dip4" />
    <resistor name="R_LED" resistance="3.3k" footprint="0805" />
    <resistor name="R_SHUNT" resistance="22k" footprint="0805" />
    <net name="V9" />
    <net name="GND" />
    <net name="SIG" />
    <trace from=".R_LED > .pin1" to="net.V9" />
    <trace from=".R_LED > .pin2" to=".VT1 > .LED_A" />
    <trace from=".VT1 > .LED_K" to="net.GND" />
    <trace from=".R_SHUNT > .pin1" to="net.SIG" />
    <trace from=".R_SHUNT > .pin2" to=".VT1 > .LDR_1" />
    <trace from=".VT1 > .LDR_2" to="net.GND" />
  </board>
)

test("Vactrol exposes four semantic pins", async () => {
  const el = await renderCircuit(fixture)
  expect(findComponent(el, "VT1")).toBeDefined()
  expectConnected(el, "VT1.LED_A", "R_LED.pin2")
  expectConnected(el, "VT1.LDR_1", "R_SHUNT.pin2")
})

test("LED and LDR sides are electrically isolated", async () => {
  const el = await renderCircuit(fixture)
  // The defining property of the part: no electrical path between sides.
  expectNotConnected(el, "VT1.LED_A", "VT1.LDR_1")
  expectNotConnected(el, "VT1.LED_A", "VT1.LDR_2")
  expectNotConnected(el, "VT1.LED_K", "VT1.LDR_1")
})

test("footprint is required at the type level", () => {
  // Compile-time contract. If this file type-checks with the line below
  // uncommented, the required-footprint guarantee has regressed.
  // @ts-expect-error - footprint is required and must not have a default
  const bad = <Vactrol name="VT2" />
  expect(bad).toBeDefined()
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test lib/opto/Vactrol.test.tsx
```

Expected: FAIL — `Cannot find module './Vactrol.tsx'`.

- [ ] **Step 3: Write Vactrol**

Create `lib/opto/Vactrol.tsx`:

```tsx
/**
 * Generic four-terminal LED/LDR vactrol (optocoupler with photoresistor).
 *
 * MODELING BOUNDARY - read before relying on this part.
 *
 * This component represents CONNECTIVITY AND PACKAGING ONLY. tscircuit
 * does not understand optical coupling, and nothing here models:
 *   - LDR resistance as a function of LED current
 *   - attack time, release time, or optical memory
 *   - the part's nonlinear, history-dependent recovery
 *
 * The compression behaviour of any circuit using this part is therefore
 * NOT validated by a successful render. It must be measured on the bench.
 * See the design spec, sections 9 and 12.2.
 *
 * The LED and LDR sides are deliberately modelled with no electrical
 * connection between them. Do not "simplify" this into a net-controlled
 * variable resistor: the isolation IS the part.
 *
 * `footprint` is REQUIRED and has no default. The pin-to-pad mapping must
 * be verified against the selected device's datasheet before any
 * fabrication output is trusted.
 */

import type { ChipProps } from "tscircuit"

export const vactrolPinLabels = {
  pin1: "LED_A",
  pin2: "LED_K",
  pin3: "LDR_1",
  pin4: "LDR_2",
} as const

export type VactrolProps = ChipProps<typeof vactrolPinLabels> & {
  /** Required: no default. Verify pin-to-pad mapping against the datasheet. */
  footprint: string
}

export const Vactrol = (props: VactrolProps) => (
  <chip
    pinLabels={vactrolPinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["LED_A", "LED_K"] },
      rightSide: { direction: "top-to-bottom", pins: ["LDR_1", "LDR_2"] },
    }}
    {...props}
  />
)
```

- [ ] **Step 4: Create the index files**

Create `lib/opto/index.ts`:

```ts
export { Vactrol, vactrolPinLabels, type VactrolProps } from "./Vactrol.tsx"
```

In `lib/index.ts`, add:

```ts
// Optical components
export * from "./opto/index"
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
bun test lib/opto/Vactrol.test.tsx
bun run typecheck
```

Expected: 3 pass, 0 fail; typecheck clean. If the `@ts-expect-error` test reports "Unused '@ts-expect-error' directive", the footprint prop has become optional — fix `VactrolProps`, do not delete the directive.

- [ ] **Step 6: Commit**

```bash
git add lib/opto lib/index.ts
git commit -m "feat: add generic Vactrol component with required footprint"
```

---

### Task 4: PowerSection part

Protection, reservoir, VBIAS divider and buffer, and the U2 package.

**Files:**
- Create: `modules/optical-compressor/parts/PowerSection.tsx`
- Create: `modules/optical-compressor/parts/PowerSection.test.tsx`

**Interfaces:**
- Consumes: `TL072H` (Task 2), `TestPoint` (Task 2), `createGrid` from `lib/layout.ts`
- Produces:
  - `PowerSectionProps = { name: string; schX?: number; schY?: number; pcbX?: number; pcbY?: number }`
  - `PowerSection: (props: PowerSectionProps) => JSX.Element`
  - Components other parts reference by name: `${name}_U2` (section A free for Sidechain, section B is the VBIAS buffer)
  - Nets other parts join: `${name}_9V_PROT`, `${name}_VBIAS`, `${name}_GND`

- [ ] **Step 1: Write the failing test**

Create `modules/optical-compressor/parts/PowerSection.test.tsx`:

```tsx
import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectComponentValue,
  findNet,
} from "../../../lib/testing/circuit-assertions.ts"
import { PowerSection } from "./PowerSection.tsx"

const render = () =>
  renderCircuit(
    <board width="60mm" height="60mm">
      <PowerSection name="CMP" />
      {/* U2 section A is consumed by the sidechain; terminate it here so
          the part can be tested in isolation without floating pins. */}
      <trace from=".CMP_U2 > .INA_P" to={"net.CMP_VBIAS"} />
      <trace from=".CMP_U2 > .INA_N" to={"net.CMP_VBIAS"} />
      <trace from=".CMP_U2 > .OUTA" to={"net.CMP_SC_OUT"} />
      <net name="CMP_SC_OUT" />
      <resistor name="LOAD" resistance="100k" footprint="0805" />
      <trace from=".LOAD > .pin1" to="net.CMP_SC_OUT" />
      <trace from=".LOAD > .pin2" to="net.CMP_GND" />
    </board>,
  )

test("reverse-polarity diode sits between raw and protected rails", async () => {
  const el = await render()
  expectConnected(el, "CMP_D_PROT.anode", "CMP_C_BULK.pin1")
  // Schottky cathode feeds the protected rail, not the raw input.
  expectConnected(el, "CMP_D_PROT.cathode", "CMP_C_HF.pin1")
})

test("bias divider is two 47k resistors to a buffered midpoint", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_BIAS1", "resistance", 47_000)
  expectComponentValue(el, "CMP_R_BIAS2", "resistance", 47_000)
  expectConnected(el, "CMP_R_BIAS1.pin2", "CMP_R_BIAS2.pin1")
  // Divider midpoint is VBIAS_RAW and drives the buffer's + input.
  expectConnected(el, "CMP_R_BIAS1.pin2", "CMP_U2.INB_P")
})

test("VBIAS buffer is unity gain and VBIAS is the buffer output", async () => {
  const el = await render()
  expectConnected(el, "CMP_U2.OUTB", "CMP_U2.INB_N")
  expectConnected(el, "CMP_U2.OUTB", "CMP_TP_VBIAS.TP")
})

test("divider midpoint is bypassed but is NOT the VBIAS net", async () => {
  const el = await render()
  // C_BIAS bypasses VBIAS_RAW, the unbuffered node.
  expectConnected(el, "CMP_C_BIAS.pin1", "CMP_U2.INB_P")
  expectComponentValue(el, "CMP_C_BIAS", "capacitance", 47e-6)
  // Loads must hang off the buffered node, so the two nets are distinct.
  expect(findNet(el, "CMP_VBIAS")).toBeDefined()
  expect(findNet(el, "CMP_VBIAS_RAW")).toBeDefined()
})

test("U2 is powered from the protected rail and decoupled", async () => {
  const el = await render()
  expectConnected(el, "CMP_U2.VCC", "CMP_C_U2_DEC.pin1")
  expectConnected(el, "CMP_U2.VCC", "CMP_D_PROT.cathode")
  expectConnected(el, "CMP_U2.GND", "CMP_C_U2_DEC.pin2")
  expectComponentValue(el, "CMP_C_U2_DEC", "capacitance", 100e-9)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test modules/optical-compressor/parts/PowerSection.test.tsx
```

Expected: FAIL — `Cannot find module './PowerSection.tsx'`.

- [ ] **Step 3: Write PowerSection**

Create `modules/optical-compressor/parts/PowerSection.tsx`:

```tsx
/**
 * Power and bias reference for the optical compressor.
 *
 * INTERNAL PART - not exported from the module's index.ts. See the design
 * spec, section 11.1, for why the module splits into parts without
 * promoting them to public modules.
 *
 * Provides:
 *   9V_PROT  - supply after series Schottky reverse-polarity protection
 *   VBIAS    - BUFFERED half-supply reference (~4.35 V)
 *   GND      - ground
 *
 * Also declares U2, whose section A is the sidechain amplifier used by
 * Sidechain.tsx. The package split (audio in U1, control in U2) keeps the
 * transient-rich sidechain out of the audio package. See spec 8.1.
 *
 * VBIAS_RAW (the unbuffered divider midpoint) is deliberately a separate
 * net from VBIAS. Only the buffer output may carry load: audio bias
 * returns, the LDR shunt and gain-setting resistors all connect to VBIAS.
 */

import { TL072H } from "../../../lib/chips/TL072H.tsx"
import { TestPoint } from "../../../lib/connectors/TestPoint.tsx"
import { createGrid } from "../../../lib/layout.ts"

export interface PowerSectionProps {
  name: string
  schX?: number
  schY?: number
  pcbX?: number
  pcbY?: number
}

export const PowerSection = (props: PowerSectionProps) => {
  const { name, schX = 0, schY = 0, pcbX = 0, pcbY = 0 } = props
  const g = createGrid(schX, schY)

  return (
    <group>
      {/* Named nets */}
      <net name={`${name}_9V_RAW`} />
      <net name={`${name}_9V_PROT`} />
      <net name={`${name}_VBIAS_RAW`} />
      <net name={`${name}_VBIAS`} />
      <net name={`${name}_GND`} />

      {/* --- Reverse-polarity protection and reservoir --- */}
      <diode
        name={`${name}_D_PROT`}
        footprint="do214ab"
        pcbX={pcbX - 20}
        pcbY={pcbY}
        {...g.signal(-4)}
      />
      <capacitor
        name={`${name}_C_BULK`}
        capacitance="47uF"
        footprint="1206"
        pcbX={pcbX - 14}
        pcbY={pcbY + 4}
        {...g.below(-3, 1)}
      />
      <capacitor
        name={`${name}_C_HF`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX - 10}
        pcbY={pcbY + 4}
        {...g.below(-2, 1)}
      />

      {/* --- Half-supply divider --- */}
      <resistor
        name={`${name}_R_BIAS1`}
        resistance="47k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 4}
        pcbY={pcbY - 4}
        {...g.above(-1, 1)}
      />
      <resistor
        name={`${name}_R_BIAS2`}
        resistance="47k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 4}
        pcbY={pcbY + 4}
        {...g.below(-1, 1)}
      />
      <capacitor
        name={`${name}_C_BIAS`}
        capacitance="47uF"
        footprint="1206"
        schRotation="90deg"
        pcbX={pcbX}
        pcbY={pcbY + 4}
        {...g.below(0, 1)}
      />
      <capacitor
        name={`${name}_C_BIAS_HF`}
        capacitance="100nF"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 3}
        pcbY={pcbY + 4}
        {...g.below(1, 1)}
      />

      {/* --- Control-side op-amp package (A: sidechain, B: VBIAS buffer) --- */}
      <TL072H
        name={`${name}_U2`}
        pcbX={pcbX + 10}
        pcbY={pcbY}
        {...g.signal(3)}
      />
      <capacitor
        name={`${name}_C_U2_DEC`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX + 10}
        pcbY={pcbY - 5}
        {...g.above(3, 1)}
      />

      {/* --- Test points --- */}
      <TestPoint
        name={`${name}_TP_9V`}
        pcbX={pcbX - 8}
        pcbY={pcbY - 6}
        {...g.above(-2, 2)}
      />
      <TestPoint
        name={`${name}_TP_VBIAS`}
        pcbX={pcbX + 16}
        pcbY={pcbY}
        {...g.signal(5)}
      />
      <TestPoint
        name={`${name}_TP_GND`}
        pcbX={pcbX - 8}
        pcbY={pcbY + 8}
        {...g.below(-2, 2)}
      />

      {/* === Protection: RAW -> D_PROT -> PROTECTED === */}
      <trace from={`.${name}_D_PROT > .anode`} to={`net.${name}_9V_RAW`} />
      <trace from={`.${name}_D_PROT > .cathode`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_BULK > .pin1`} to={`net.${name}_9V_RAW`} />
      <trace from={`.${name}_C_BULK > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_HF > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_HF > .pin2`} to={`net.${name}_GND`} />

      {/* === Divider: PROTECTED -> R_BIAS1 -> VBIAS_RAW -> R_BIAS2 -> GND === */}
      <trace from={`.${name}_R_BIAS1 > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_R_BIAS1 > .pin2`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_R_BIAS2 > .pin1`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_R_BIAS2 > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_BIAS > .pin1`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_C_BIAS > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_BIAS_HF > .pin1`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_C_BIAS_HF > .pin2`} to={`net.${name}_GND`} />

      {/* === VBIAS buffer (U2 section B), unity gain === */}
      <trace from={`.${name}_U2 > .INB_P`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_U2 > .OUTB`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U2 > .INB_N`} to={`net.${name}_VBIAS`} />

      {/* === U2 supply and decoupling === */}
      <trace from={`.${name}_U2 > .VCC`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_U2 > .GND`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_U2_DEC > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_U2_DEC > .pin2`} to={`net.${name}_GND`} />

      {/* === Test points === */}
      <trace from={`.${name}_TP_9V > .TP`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_TP_VBIAS > .TP`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GND > .TP`} to={`net.${name}_GND`} />
    </group>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun test modules/optical-compressor/parts/PowerSection.test.tsx
bun run typecheck
```

Expected: 5 pass, 0 fail; typecheck clean. If a test fails on `do214ab` or another footprint name, run `tsci search "1N5817"` to find a valid footprint and update both the code and this plan.

- [ ] **Step 5: Commit**

```bash
git add modules/optical-compressor/parts
git commit -m "feat: add optical compressor power and bias section"
```

---

### Task 5: AudioPath part

Input buffer, optical attenuator, vactrol, and makeup amplifier.

**Files:**
- Create: `modules/optical-compressor/parts/AudioPath.tsx`
- Create: `modules/optical-compressor/parts/AudioPath.test.tsx`

**Interfaces:**
- Consumes: `TL072H`, `TestPoint`, `Vactrol`, `createGrid`, and the nets `${name}_9V_PROT` / `${name}_VBIAS` / `${name}_GND` from PowerSection
- Produces:
  - `AudioPathProps = { name: string; vactrolFootprint: string; shuntResistance?: string; inputCap?: string; outputCap?: string; schX?; schY?; pcbX?; pcbY? }`
  - `AudioPath: (props: AudioPathProps) => JSX.Element`
  - Names other parts reference: `${name}_VACTROL` (LED side driven by Sidechain), `${name}_U1`
  - Nets: `${name}_IN`, `${name}_IN_BUF`, `${name}_GR`, `${name}_MAKEUP_OUT`, `${name}_OUT`, `${name}_GAIN_FB`

The vactrol is declared here, not in Sidechain, because the LDR is the audio-critical element. Sidechain drives `.${name}_VACTROL > .LED_A` / `.LED_K` by name.

- [ ] **Step 1: Write the failing test**

Create `modules/optical-compressor/parts/AudioPath.test.tsx`:

```tsx
import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectComponentValue,
} from "../../../lib/testing/circuit-assertions.ts"
import { AudioPath } from "./AudioPath.tsx"

const render = () =>
  renderCircuit(
    <board width="80mm" height="60mm">
      <AudioPath name="CMP" vactrolFootprint="dip4" />
      <net name="CMP_9V_PROT" />
      <net name="CMP_VBIAS" />
      <net name="CMP_GND" />
      {/* Stand-ins for the LED drive and pot that other parts supply. */}
      <resistor name="LED_DRV" resistance="3.3k" footprint="0805" />
      <trace from=".LED_DRV > .pin1" to="net.CMP_9V_PROT" />
      <trace from=".LED_DRV > .pin2" to=".CMP_VACTROL > .LED_A" />
      <trace from=".CMP_VACTROL > .LED_K" to="net.CMP_GND" />
      <resistor name="GAIN_POT" resistance="100k" footprint="0805" />
      <trace from=".GAIN_POT > .pin1" to="net.CMP_GAIN_FB" />
      <trace from=".GAIN_POT > .pin2" to="net.CMP_MAKEUP_OUT" />
    </board>,
  )

test("input is AC coupled and biased to VBIAS through 1M", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_C_IN", "capacitance", 100e-9)
  expectComponentValue(el, "CMP_R_IN_BIAS", "resistance", 1_000_000)
  expectConnected(el, "CMP_C_IN.pin2", "CMP_R_IN_BIAS.pin1")
  expectConnected(el, "CMP_C_IN.pin2", "CMP_U1.INA_P")
  expectConnected(el, "CMP_R_IN_BIAS.pin2", "CMP_TP_VBIAS_CHK.TP")
})

test("input buffer is unity gain", async () => {
  const el = await render()
  expectConnected(el, "CMP_U1.OUTA", "CMP_U1.INA_N")
})

test("attenuator is R_SHUNT in series with the LDR shunting to VBIAS", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_SHUNT", "resistance", 22_000)
  // Buffer output feeds R_SHUNT...
  expectConnected(el, "CMP_U1.OUTA", "CMP_R_SHUNT.pin1")
  // ...whose far end is the gain-reduction node, shunted by the LDR.
  expectConnected(el, "CMP_R_SHUNT.pin2", "CMP_VACTROL.LDR_1")
  expectConnected(el, "CMP_VACTROL.LDR_2", "CMP_TP_VBIAS_CHK.TP")
})

test("gain-reduction node drives the makeup amp with NO coupling cap", async () => {
  const el = await render()
  // Both stages share the VBIAS operating point, so they are DC coupled.
  expectConnected(el, "CMP_R_SHUNT.pin2", "CMP_U1.INB_P")
  expectConnected(el, "CMP_TP_GR.TP", "CMP_U1.INB_P")
})

test("makeup amp gain network returns to VBIAS, feedback goes to the pot", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_MAKEUP_G", "resistance", 10_000)
  expectConnected(el, "CMP_R_MAKEUP_G.pin1", "CMP_U1.INB_N")
  expectConnected(el, "CMP_R_MAKEUP_G.pin2", "CMP_TP_VBIAS_CHK.TP")
  expectConnected(el, "CMP_U1.INB_N", "GAIN_POT.pin1")
})

test("output is AC coupled through 2.2uF with a 100k pulldown", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_C_OUT", "capacitance", 2.2e-6)
  expectComponentValue(el, "CMP_R_OUT_PD", "resistance", 100_000)
  expectConnected(el, "CMP_U1.OUTB", "CMP_C_OUT.pin1")
  expectConnected(el, "CMP_C_OUT.pin2", "CMP_R_OUT_PD.pin1")
  expectConnected(el, "CMP_R_OUT_PD.pin2", "CMP_TP_GND_CHK.TP")
  // Output cap must isolate the biased node from the output net.
  expectNotConnected(el, "CMP_U1.OUTB", "CMP_R_OUT_PD.pin1")
})

test("LDR and LED sides remain isolated through the audio path", async () => {
  const el = await render()
  expectNotConnected(el, "CMP_VACTROL.LDR_1", "CMP_VACTROL.LED_A")
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test modules/optical-compressor/parts/AudioPath.test.tsx
```

Expected: FAIL — `Cannot find module './AudioPath.tsx'`.

- [ ] **Step 3: Write AudioPath**

Create `modules/optical-compressor/parts/AudioPath.tsx`. Note the three helper test points (`TP_VBIAS_CHK`, `TP_GND_CHK`) exist so tests can assert "this lands on VBIAS/GND" without reaching into PowerSection; they are also genuinely useful on the bench.

```tsx
/**
 * Audio path for the optical compressor: input buffer, optical attenuator,
 * makeup amplifier.
 *
 * INTERNAL PART - not exported from the module's index.ts.
 *
 * Signal flow:
 *   IN -> C_IN -> [U1.A unity buffer] -> R_SHUNT -+-> [U1.B makeup] -> C_OUT -> OUT
 *                                                 |
 *                                                LDR
 *                                                 |
 *                                               VBIAS
 *
 * The gain-reduction node is DC-biased at VBIAS through R_SHUNT, so it has
 * a defined operating point however high the LDR's dark resistance runs.
 * There is deliberately NO coupling capacitor between the attenuator and
 * the makeup amplifier - both stages share the VBIAS operating point.
 * See spec 8.3.
 *
 * The vactrol is declared here because the LDR is the audio-critical
 * element; Sidechain.tsx drives its LED side by name.
 */

import { TL072H } from "../../../lib/chips/TL072H.tsx"
import { TestPoint } from "../../../lib/connectors/TestPoint.tsx"
import { Vactrol } from "../../../lib/opto/Vactrol.tsx"
import { createGrid } from "../../../lib/layout.ts"

export interface AudioPathProps {
  name: string
  /** Required: no default. See lib/opto/Vactrol.tsx. */
  vactrolFootprint: string
  shuntResistance?: string
  inputCap?: string
  outputCap?: string
  schX?: number
  schY?: number
  pcbX?: number
  pcbY?: number
}

export const AudioPath = (props: AudioPathProps) => {
  const {
    name,
    vactrolFootprint,
    shuntResistance = "22k",
    inputCap = "100nF",
    outputCap = "2.2uF",
    schX = 0,
    schY = 0,
    pcbX = 0,
    pcbY = 0,
  } = props
  const g = createGrid(schX, schY)

  return (
    <group>
      <net name={`${name}_IN`} />
      <net name={`${name}_IN_BUF`} />
      <net name={`${name}_GR`} />
      <net name={`${name}_MAKEUP_OUT`} />
      <net name={`${name}_GAIN_FB`} />
      <net name={`${name}_OUT`} />

      {/* --- Input coupling and bias --- */}
      <capacitor
        name={`${name}_C_IN`}
        capacitance={inputCap}
        footprint="0805"
        pcbX={pcbX - 28}
        pcbY={pcbY}
        {...g.signal(-5)}
      />
      <resistor
        name={`${name}_R_IN_BIAS`}
        resistance="1M"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 24}
        pcbY={pcbY + 5}
        {...g.below(-4, 1)}
      />

      {/* --- Audio op-amp package (A: buffer, B: makeup) --- */}
      <TL072H
        name={`${name}_U1`}
        pcbX={pcbX - 14}
        pcbY={pcbY}
        {...g.signal(-2)}
      />
      <capacitor
        name={`${name}_C_U1_DEC`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX - 14}
        pcbY={pcbY - 6}
        {...g.above(-2, 2)}
      />

      {/* --- Optical attenuator --- */}
      <resistor
        name={`${name}_R_SHUNT`}
        resistance={shuntResistance}
        footprint="0805"
        pcbX={pcbX - 4}
        pcbY={pcbY}
        {...g.signal(0)}
      />
      <Vactrol
        name={`${name}_VACTROL`}
        footprint={vactrolFootprint}
        pcbX={pcbX}
        pcbY={pcbY + 8}
        {...g.below(0, 2)}
      />

      {/* --- Makeup gain network --- */}
      <resistor
        name={`${name}_R_MAKEUP_G`}
        resistance="10k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 8}
        pcbY={pcbY + 5}
        {...g.below(2, 1)}
      />

      {/* --- Output coupling --- */}
      <capacitor
        name={`${name}_C_OUT`}
        capacitance={outputCap}
        footprint="1206"
        pcbX={pcbX + 20}
        pcbY={pcbY}
        {...g.signal(4)}
      />
      <resistor
        name={`${name}_R_OUT_PD`}
        resistance="100k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 25}
        pcbY={pcbY + 5}
        {...g.below(5, 1)}
      />

      {/* --- Test points --- */}
      <TestPoint
        name={`${name}_TP_IN_BUF`}
        pcbX={pcbX - 10}
        pcbY={pcbY - 8}
        {...g.above(-1, 2)}
      />
      <TestPoint
        name={`${name}_TP_GR`}
        pcbX={pcbX + 2}
        pcbY={pcbY - 8}
        {...g.above(1, 2)}
      />
      <TestPoint
        name={`${name}_TP_MAKEUP_OUT`}
        pcbX={pcbX + 16}
        pcbY={pcbY - 8}
        {...g.above(3, 2)}
      />
      {/* Rail references, so bench probing and tests can confirm a node
          really lands on the buffered reference rather than a stub. */}
      <TestPoint
        name={`${name}_TP_VBIAS_CHK`}
        pcbX={pcbX + 2}
        pcbY={pcbY + 14}
        {...g.below(1, 3)}
      />
      <TestPoint
        name={`${name}_TP_GND_CHK`}
        pcbX={pcbX + 25}
        pcbY={pcbY + 10}
        {...g.below(5, 2)}
      />

      {/* === Input: IN -> C_IN -> IN_BUF (biased to VBIAS) === */}
      <trace from={`.${name}_C_IN > .pin1`} to={`net.${name}_IN`} />
      <trace from={`.${name}_C_IN > .pin2`} to={`net.${name}_IN_BUF`} />
      <trace from={`.${name}_R_IN_BIAS > .pin1`} to={`net.${name}_IN_BUF`} />
      <trace from={`.${name}_R_IN_BIAS > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U1 > .INA_P`} to={`net.${name}_IN_BUF`} />
      <trace from={`.${name}_TP_IN_BUF > .TP`} to={`net.${name}_IN_BUF`} />

      {/* === U1 section A: unity-gain buffer === */}
      <trace from={`.${name}_U1 > .OUTA`} to={`.${name}_U1 > .INA_N`} />

      {/* === Attenuator: buffer -> R_SHUNT -> GR node, LDR shunts to VBIAS === */}
      <trace from={`.${name}_U1 > .OUTA`} to={`.${name}_R_SHUNT > .pin1`} />
      <trace from={`.${name}_R_SHUNT > .pin2`} to={`net.${name}_GR`} />
      <trace from={`.${name}_VACTROL > .LDR_1`} to={`net.${name}_GR`} />
      <trace from={`.${name}_VACTROL > .LDR_2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GR > .TP`} to={`net.${name}_GR`} />

      {/* === U1 section B: non-inverting makeup amp, DC coupled to GR === */}
      <trace from={`.${name}_U1 > .INB_P`} to={`net.${name}_GR`} />
      <trace from={`.${name}_R_MAKEUP_G > .pin1`} to={`net.${name}_GAIN_FB`} />
      <trace from={`.${name}_R_MAKEUP_G > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U1 > .INB_N`} to={`net.${name}_GAIN_FB`} />
      <trace from={`.${name}_U1 > .OUTB`} to={`net.${name}_MAKEUP_OUT`} />
      <trace
        from={`.${name}_TP_MAKEUP_OUT > .TP`}
        to={`net.${name}_MAKEUP_OUT`}
      />

      {/* === Output coupling === */}
      <trace from={`.${name}_C_OUT > .pin1`} to={`net.${name}_MAKEUP_OUT`} />
      <trace from={`.${name}_C_OUT > .pin2`} to={`net.${name}_OUT`} />
      <trace from={`.${name}_R_OUT_PD > .pin1`} to={`net.${name}_OUT`} />
      <trace from={`.${name}_R_OUT_PD > .pin2`} to={`net.${name}_GND`} />

      {/* === U1 supply and decoupling === */}
      <trace from={`.${name}_U1 > .VCC`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_U1 > .GND`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_U1_DEC > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_U1_DEC > .pin2`} to={`net.${name}_GND`} />

      {/* === Rail reference test points === */}
      <trace from={`.${name}_TP_VBIAS_CHK > .TP`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GND_CHK > .TP`} to={`net.${name}_GND`} />
    </group>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun test modules/optical-compressor/parts/AudioPath.test.tsx
bun run typecheck
```

Expected: 7 pass, 0 fail; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add modules/optical-compressor/parts
git commit -m "feat: add optical compressor audio path with optical attenuator"
```

---

### Task 6: Sidechain part

Sidechain amplifier passives, half-wave detector, degenerated LED driver, current sense. This is the part the spec's revision-3 corrections concentrate in — the emitter resistor (§8.7.1), the 4.7 µF detector cap (§8.6.1) and the 1 MΩ PEAK REDUCTION fail-safe (§10.1) all live here.

**Files:**
- Create: `modules/optical-compressor/parts/Sidechain.tsx`
- Create: `modules/optical-compressor/parts/Sidechain.test.tsx`

**Interfaces:**
- Consumes: `TestPoint`, `createGrid`; references `${name}_U2` (PowerSection) and `${name}_VACTROL` (AudioPath) by name; joins nets `${name}_MAKEUP_OUT`, `${name}_VBIAS`, `${name}_9V_PROT`, `${name}_GND`
- Produces:
  - `SidechainProps = { name: string; detectorCapacitance?: string; releaseResistance?: string; ledResistance?: string; emitterResistance?: string; sidechainGainResistance?: string; sidechainBiasResistance?: string; sidechainCouplingCap?: string; schX?; schY?; pcbX?; pcbY? }`
  - `Sidechain: (props: SidechainProps) => JSX.Element`
  - Nets: `${name}_PEAK_WIPER`, `${name}_SC_OUT`, `${name}_DET`, `${name}_LED_A`, `${name}_LED_SENSE`, `${name}_EMITTER`

The PEAK REDUCTION pot is external and three-terminal: its TOP and BOTTOM land on `MAKEUP_OUT` and `VBIAS` at the `J_PEAK` connector in Task 7. Only the wiper enters this part, so Sidechain declares no pot-top net of its own.

- [ ] **Step 1: Write the failing test**

Create `modules/optical-compressor/parts/Sidechain.test.tsx`:

```tsx
import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectComponentValue,
  findComponent,
} from "../../../lib/testing/circuit-assertions.ts"
import { Sidechain } from "./Sidechain.tsx"
import { TL072H } from "../../../lib/chips/TL072H.tsx"
import { Vactrol } from "../../../lib/opto/Vactrol.tsx"

const render = () =>
  renderCircuit(
    <board width="80mm" height="60mm">
      <Sidechain name="CMP" />
      {/* Stand-ins for the parts Sidechain references by name. */}
      <TL072H name="CMP_U2" />
      <Vactrol name="CMP_VACTROL" footprint="dip4" />
      <net name="CMP_9V_PROT" />
      <net name="CMP_VBIAS" />
      <net name="CMP_GND" />
      <trace from=".CMP_U2 > .VCC" to="net.CMP_9V_PROT" />
      <trace from=".CMP_U2 > .GND" to="net.CMP_GND" />
      <trace from=".CMP_U2 > .INB_P" to="net.CMP_VBIAS" />
      <trace from=".CMP_U2 > .INB_N" to="net.CMP_VBIAS" />
      <trace from=".CMP_U2 > .OUTB" to="net.CMP_VBIAS" />
      <trace from=".CMP_VACTROL > .LDR_1" to="net.CMP_VBIAS" />
      <trace from=".CMP_VACTROL > .LDR_2" to="net.CMP_VBIAS" />
    </board>,
  )

test("sidechain amp is non-inverting with gain 1 + 100k/10k", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_SC_G", "resistance", 10_000)
  expectComponentValue(el, "CMP_R_SC_F", "resistance", 100_000)
  // Gain leg returns to VBIAS, feedback leg to the output: non-inverting.
  expectConnected(el, "CMP_R_SC_G.pin1", "CMP_U2.INA_N")
  expectConnected(el, "CMP_R_SC_F.pin1", "CMP_U2.INA_N")
  expectConnected(el, "CMP_R_SC_F.pin2", "CMP_U2.OUTA")
  // Signal enters the + input, confirming non-inverting (spec 8.6.2).
  expectConnected(el, "CMP_U2.INA_P", "CMP_R_PEAK_FAIL.pin1")
})

test("PEAK REDUCTION wiper has a 1M fail-safe to VBIAS, not a wiper tie", async () => {
  const el = await render()
  // Spec 10.1: an open wiper must settle at VBIAS (zero compression).
  expectComponentValue(el, "CMP_R_PEAK_FAIL", "resistance", 1_000_000)
  expectConnected(el, "CMP_R_PEAK_FAIL.pin2", "CMP_TP_VBIAS_SC.TP")
  // The 1M must be a resistor to VBIAS, not a short. If someone
  // "simplifies" it away the wiper collapses onto VBIAS and the control
  // stops working entirely.
  expectNotConnected(el, "CMP_R_PEAK_FAIL.pin1", "CMP_R_PEAK_FAIL.pin2")
  // Wiper drives the sidechain amp's + input (non-inverting).
  expectConnected(el, "CMP_R_PEAK_FAIL.pin1", "CMP_U2.INA_P")
})

test("detector is AC coupled into a half-wave rectifier", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_C_SC", "capacitance", 1e-6)
  expectConnected(el, "CMP_C_SC.pin1", "CMP_U2.OUTA")
  // Diode anode takes the coupled signal; cathode charges the detector.
  expectConnected(el, "CMP_C_SC.pin2", "CMP_D_DET.anode")
  expectConnected(el, "CMP_D_DET.cathode", "CMP_C_DET.pin1")
  // Coupling cap must block the VBIAS-centred DC from the detector.
  expectNotConnected(el, "CMP_U2.OUTA", "CMP_C_DET.pin1")
})

test("detector cap is 4.7uF per revision 3, with a 100k release resistor", async () => {
  const el = await render()
  // Revision 2 specified 10uF; degeneration raised the discharge
  // impedance ~5x, so revision 3 uses 4.7uF. See spec 8.6.1.
  expectComponentValue(el, "CMP_C_DET", "capacitance", 4.7e-6)
  expectComponentValue(el, "CMP_R_REL", "resistance", 100_000)
  expectConnected(el, "CMP_C_DET.pin1", "CMP_R_REL.pin1")
  expectConnected(el, "CMP_C_DET.pin2", "CMP_TP_GND_SC.TP")
  expectConnected(el, "CMP_R_REL.pin2", "CMP_TP_GND_SC.TP")
})

test("driver has a 1k EMITTER RESISTOR - the revision 3 control-law fix", async () => {
  const el = await render()
  // Without this the control range is ~1 dB and the law is a switch.
  // See spec 6.1.2 and 8.7.1. This test is the regression guard.
  expectComponentValue(el, "CMP_R_E", "resistance", 1_000)
  expectConnected(el, "CMP_Q_LED.emitter", "CMP_R_E.pin1")
  expectConnected(el, "CMP_R_E.pin2", "CMP_TP_GND_SC.TP")
  // The emitter must NOT go straight to ground.
  expectNotConnected(el, "CMP_Q_LED.emitter", "CMP_TP_GND_SC.TP")
})

test("base is driven through 10k with a 100k pulldown", async () => {
  const el = await render()
  expectComponentValue(el, "CMP_R_B", "resistance", 10_000)
  expectComponentValue(el, "CMP_R_B_PD", "resistance", 100_000)
  expectConnected(el, "CMP_C_DET.pin1", "CMP_R_B.pin1")
  expectConnected(el, "CMP_R_B.pin2", "CMP_Q_LED.base")
  expectConnected(el, "CMP_R_B_PD.pin1", "CMP_Q_LED.base")
  expectConnected(el, "CMP_R_B_PD.pin2", "CMP_TP_GND_SC.TP")
})

test("LED chain is 3.3k limit, vactrol LED, 10R sense, collector", async () => {
  const el = await render()
  // R_LED is 3.3k, not 4.7k: 1.5 V now drops across R_E. Spec 8.7.2.
  expectComponentValue(el, "CMP_R_LED", "resistance", 3_300)
  expectComponentValue(el, "CMP_R_SENSE", "resistance", 10)
  expectConnected(el, "CMP_R_LED.pin2", "CMP_VACTROL.LED_A")
  expectConnected(el, "CMP_VACTROL.LED_K", "CMP_R_SENSE.pin1")
  expectConnected(el, "CMP_R_SENSE.pin2", "CMP_Q_LED.collector")
})

test("sense resistor is bracketed by test points so current is measurable", async () => {
  const el = await render()
  // Bench item 12.2.2 needs LED current without desoldering.
  expectConnected(el, "CMP_TP_SENSE_HI.TP", "CMP_R_SENSE.pin1")
  expectConnected(el, "CMP_TP_SENSE_LO.TP", "CMP_R_SENSE.pin2")
})

test("sidechain amp inverting input and output both carry test pads", async () => {
  const el = await render()
  // Spec 8.6.2: the withdrawn precision-rectifier option leaves test pads
  // at these two nodes so the topology can still be probed on the bench.
  expectConnected(el, "CMP_TP_SC_INV.TP", "CMP_U2.INA_N")
  expectConnected(el, "CMP_TP_SC_OUT.TP", "CMP_U2.OUTA")
})

test("transistor is an NPN", async () => {
  const el = await render()
  expect(findComponent(el, "CMP_Q_LED")?.ftype).toBe("simple_transistor")
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test modules/optical-compressor/parts/Sidechain.test.tsx
```

Expected: FAIL — `Cannot find module './Sidechain.tsx'`.

- [ ] **Step 3: Write Sidechain**

Create `modules/optical-compressor/parts/Sidechain.tsx`:

```tsx
/**
 * Feedback sidechain for the optical compressor: level detector and LED
 * driver.
 *
 * INTERNAL PART - not exported from the module's index.ts.
 *
 * Chain:
 *   MAKEUP_OUT -> PEAK REDUCTION pot -> [U2.A x11] -> C_SC -> D_DET
 *     -> C_DET/R_REL -> R_B -> Q_LED(base)
 *   9V_PROT -> R_LED -> VACTROL.LED_A ... LED_K -> R_SENSE -> collector
 *   emitter -> R_E -> GND
 *
 * THREE REVISION-3 CORRECTIONS LIVE HERE. Do not "simplify" them away:
 *
 * 1. R_E (1k emitter degeneration) is NOT optional. Without it the LED
 *    sweep occupies ~0.15 V of detector voltage, giving ~1 dB of control
 *    range and a switch-like law. With it, ~6.8 dB and beta spread drops
 *    from ~3x to ~7%. Spec 6.1.2 / 8.7.1.
 * 2. C_DET is 4.7uF, not 10uF: degeneration raised the discharge
 *    impedance ~5x. Spec 8.6.1.
 * 3. R_PEAK_FAIL is a 1M wiper-to-VBIAS resistor. PEAK REDUCTION is a
 *    three-terminal DIVIDER - tying its wiper to an end terminal would
 *    short out the control. Spec 10.1.
 *
 * U2 is declared in PowerSection.tsx and VACTROL in AudioPath.tsx; both
 * are referenced here by name, which tscircuit resolves across part
 * boundaries within the same board.
 */

import { TestPoint } from "../../../lib/connectors/TestPoint.tsx"
import { createGrid } from "../../../lib/layout.ts"

export interface SidechainProps {
  name: string
  detectorCapacitance?: string
  releaseResistance?: string
  ledResistance?: string
  emitterResistance?: string
  sidechainGainResistance?: string
  sidechainBiasResistance?: string
  sidechainCouplingCap?: string
  schX?: number
  schY?: number
  pcbX?: number
  pcbY?: number
}

export const Sidechain = (props: SidechainProps) => {
  const {
    name,
    detectorCapacitance = "4.7uF",
    releaseResistance = "100k",
    ledResistance = "3.3k",
    emitterResistance = "1k",
    sidechainGainResistance = "100k",
    sidechainBiasResistance = "10k",
    sidechainCouplingCap = "1uF",
    schX = 0,
    schY = 0,
    pcbX = 0,
    pcbY = 0,
  } = props
  const g = createGrid(schX, schY)

  return (
    <group>
      <net name={`${name}_PEAK_WIPER`} />
      <net name={`${name}_SC_OUT`} />
      <net name={`${name}_DET`} />
      <net name={`${name}_LED_A`} />
      <net name={`${name}_LED_SENSE`} />
      <net name={`${name}_EMITTER`} />

      {/* --- PEAK REDUCTION interface ---
          The pot itself is external: its TOP connects to MAKEUP_OUT and its
          BOTTOM to VBIAS at the J_PEAK connector (see OpticalCompressor.tsx).
          Only the wiper enters this part. */}
      <resistor
        name={`${name}_R_PEAK_FAIL`}
        resistance="1M"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 24}
        pcbY={pcbY + 5}
        {...g.below(-4, 1)}
      />

      {/* --- Sidechain amplifier gain network (U2 section A) --- */}
      <resistor
        name={`${name}_R_SC_G`}
        resistance={sidechainBiasResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 14}
        pcbY={pcbY + 5}
        {...g.below(-3, 1)}
      />
      <resistor
        name={`${name}_R_SC_F`}
        resistance={sidechainGainResistance}
        footprint="0805"
        pcbX={pcbX - 14}
        pcbY={pcbY - 5}
        {...g.above(-3, 1)}
      />

      {/* --- Detector --- */}
      <capacitor
        name={`${name}_C_SC`}
        capacitance={sidechainCouplingCap}
        footprint="0805"
        pcbX={pcbX - 6}
        pcbY={pcbY}
        {...g.signal(-1)}
      />
      <diode
        name={`${name}_D_DET`}
        footprint="0805"
        pcbX={pcbX}
        pcbY={pcbY}
        {...g.signal(0)}
      />
      <capacitor
        name={`${name}_C_DET`}
        capacitance={detectorCapacitance}
        footprint="1206"
        schRotation="90deg"
        pcbX={pcbX + 4}
        pcbY={pcbY + 5}
        {...g.below(1, 1)}
      />
      <resistor
        name={`${name}_R_REL`}
        resistance={releaseResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 8}
        pcbY={pcbY + 5}
        {...g.below(2, 1)}
      />

      {/* --- LED driver --- */}
      <resistor
        name={`${name}_R_B`}
        resistance="10k"
        footprint="0805"
        pcbX={pcbX + 12}
        pcbY={pcbY}
        {...g.signal(3)}
      />
      <resistor
        name={`${name}_R_B_PD`}
        resistance="100k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 16}
        pcbY={pcbY + 5}
        {...g.below(4, 1)}
      />
      <transistor
        name={`${name}_Q_LED`}
        type="npn"
        footprint="sot23"
        pcbX={pcbX + 22}
        pcbY={pcbY}
        {...g.signal(5)}
      />
      {/* THE revision-3 fix. See the header comment. */}
      <resistor
        name={`${name}_R_E`}
        resistance={emitterResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 22}
        pcbY={pcbY + 8}
        {...g.below(5, 2)}
      />
      <resistor
        name={`${name}_R_LED`}
        resistance={ledResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 22}
        pcbY={pcbY - 10}
        {...g.above(5, 3)}
      />
      <resistor
        name={`${name}_R_SENSE`}
        resistance="10"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 22}
        pcbY={pcbY - 4}
        {...g.above(5, 1)}
      />

      {/* --- Test points --- */}
      <TestPoint
        name={`${name}_TP_SC_OUT`}
        pcbX={pcbX - 10}
        pcbY={pcbY - 8}
        {...g.above(-2, 2)}
      />
      {/* Spec 8.6.2: pads left for probing the withdrawn precision-
          rectifier topology on the bench. */}
      <TestPoint
        name={`${name}_TP_SC_INV`}
        pcbX={pcbX - 14}
        pcbY={pcbY - 9}
        {...g.above(-3, 2)}
      />
      <TestPoint
        name={`${name}_TP_DET`}
        pcbX={pcbX + 4}
        pcbY={pcbY - 8}
        {...g.above(1, 2)}
      />
      <TestPoint
        name={`${name}_TP_SENSE_HI`}
        pcbX={pcbX + 27}
        pcbY={pcbY - 6}
        {...g.above(6, 2)}
      />
      <TestPoint
        name={`${name}_TP_SENSE_LO`}
        pcbX={pcbX + 27}
        pcbY={pcbY - 2}
        {...g.above(6, 1)}
      />
      <TestPoint
        name={`${name}_TP_VBIAS_SC`}
        pcbX={pcbX - 20}
        pcbY={pcbY + 12}
        {...g.below(-4, 3)}
      />
      <TestPoint
        name={`${name}_TP_GND_SC`}
        pcbX={pcbX + 12}
        pcbY={pcbY + 12}
        {...g.below(3, 3)}
      />

      {/* === Wiper -> sidechain amp + input, with 1M fail-safe to VBIAS === */}
      <trace
        from={`.${name}_R_PEAK_FAIL > .pin1`}
        to={`net.${name}_PEAK_WIPER`}
      />
      <trace from={`.${name}_R_PEAK_FAIL > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U2 > .INA_P`} to={`net.${name}_PEAK_WIPER`} />

      {/* === U2 section A: non-inverting, gain 1 + 100k/10k === */}
      <trace from={`.${name}_R_SC_G > .pin1`} to={`.${name}_U2 > .INA_N`} />
      <trace from={`.${name}_R_SC_G > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_R_SC_F > .pin1`} to={`.${name}_U2 > .INA_N`} />
      <trace from={`.${name}_R_SC_F > .pin2`} to={`net.${name}_SC_OUT`} />
      <trace from={`.${name}_U2 > .OUTA`} to={`net.${name}_SC_OUT`} />
      <trace from={`.${name}_TP_SC_OUT > .TP`} to={`net.${name}_SC_OUT`} />
      <trace from={`.${name}_TP_SC_INV > .TP`} to={`.${name}_U2 > .INA_N`} />

      {/* === Detector: AC couple, half-wave rectify, store === */}
      <trace from={`.${name}_C_SC > .pin1`} to={`net.${name}_SC_OUT`} />
      <trace from={`.${name}_C_SC > .pin2`} to={`.${name}_D_DET > .anode`} />
      <trace from={`.${name}_D_DET > .cathode`} to={`net.${name}_DET`} />
      <trace from={`.${name}_C_DET > .pin1`} to={`net.${name}_DET`} />
      <trace from={`.${name}_C_DET > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_R_REL > .pin1`} to={`net.${name}_DET`} />
      <trace from={`.${name}_R_REL > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_TP_DET > .TP`} to={`net.${name}_DET`} />

      {/* === Base drive === */}
      <trace from={`.${name}_R_B > .pin1`} to={`net.${name}_DET`} />
      <trace from={`.${name}_R_B > .pin2`} to={`.${name}_Q_LED > .base`} />
      <trace from={`.${name}_R_B_PD > .pin1`} to={`.${name}_Q_LED > .base`} />
      <trace from={`.${name}_R_B_PD > .pin2`} to={`net.${name}_GND`} />

      {/* === Emitter degeneration (revision 3) === */}
      <trace from={`.${name}_Q_LED > .emitter`} to={`net.${name}_EMITTER`} />
      <trace from={`.${name}_R_E > .pin1`} to={`net.${name}_EMITTER`} />
      <trace from={`.${name}_R_E > .pin2`} to={`net.${name}_GND`} />

      {/* === LED chain: rail -> R_LED -> LED -> R_SENSE -> collector === */}
      <trace from={`.${name}_R_LED > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_R_LED > .pin2`} to={`net.${name}_LED_A`} />
      <trace from={`.${name}_VACTROL > .LED_A`} to={`net.${name}_LED_A`} />
      <trace
        from={`.${name}_VACTROL > .LED_K`}
        to={`net.${name}_LED_SENSE`}
      />
      <trace from={`.${name}_R_SENSE > .pin1`} to={`net.${name}_LED_SENSE`} />
      <trace
        from={`.${name}_R_SENSE > .pin2`}
        to={`.${name}_Q_LED > .collector`}
      />

      {/* === Sense test points, so LED current is measurable in circuit === */}
      <trace
        from={`.${name}_TP_SENSE_HI > .TP`}
        to={`net.${name}_LED_SENSE`}
      />
      <trace
        from={`.${name}_TP_SENSE_LO > .TP`}
        to={`.${name}_Q_LED > .collector`}
      />

      {/* === Rail reference test points === */}
      <trace from={`.${name}_TP_VBIAS_SC > .TP`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GND_SC > .TP`} to={`net.${name}_GND`} />
    </group>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun test modules/optical-compressor/parts/Sidechain.test.tsx
bun run typecheck
```

Expected: 10 pass, 0 fail; typecheck clean.

If a test fails on the `sot23` or `do214ab` footprint name, run `bunx tsci search` for the part to find a valid one and update the code.

- [ ] **Step 5: Commit**

```bash
git add modules/optical-compressor/parts
git commit -m "feat: add optical compressor sidechain with degenerated LED driver"
```

---

### Task 7: OpticalCompressor module composition

**Files:**
- Create: `modules/optical-compressor/OpticalCompressor.tsx`
- Create: `modules/optical-compressor/OpticalCompressor.test.tsx`
- Create: `modules/optical-compressor/index.ts`
- Modify: `modules/index.ts`

**Interfaces:**
- Consumes: `PowerSection`, `AudioPath`, `Sidechain`, `ScrewTerminal2`, `ScrewTerminal3`
- Produces:
  - `OpticalCompressorProps` exactly as spec §10 defines it, with `vactrolFootprint` required
  - `OpticalCompressor: (props: OpticalCompressorProps) => JSX.Element`

Connector pin mapping (spec §10.1). Note `J_PEAK` and `J_GAIN` both use TOP/WIPER/BOTTOM names but are wired differently — GAIN is a rheostat with the wiper tied to an end, PEAK REDUCTION is a divider and must not be.

| Connector | P1 | P2 | P3 |
|---|---|---|---|
| `J_IN` | IN | GND | — |
| `J_OUT` | OUT | GND | — |
| `J_PWR` | +9V_RAW | GND | — |
| `J_PEAK` | TOP (`MAKEUP_OUT`) | WIPER (`PEAK_WIPER`) | BOTTOM (`VBIAS`) |
| `J_GAIN` | TOP (`MAKEUP_OUT`) | WIPER (`GAIN_FB`) | BOTTOM (`GAIN_FB`) |

- [ ] **Step 1: Write the failing test**

Create `modules/optical-compressor/OpticalCompressor.test.tsx`:

```tsx
import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectNoFloatingPins,
  findComponent,
} from "../../lib/testing/circuit-assertions.ts"
import { OpticalCompressor } from "./OpticalCompressor.tsx"

const render = () =>
  renderCircuit(
    <board width="100mm" height="80mm">
      <OpticalCompressor name="CMP" vactrolFootprint="dip4" />
    </board>,
  )

test("all five connectors are present", async () => {
  const el = await render()
  for (const j of ["J_IN", "J_OUT", "J_PWR", "J_PEAK", "J_GAIN"]) {
    expect(findComponent(el, `CMP_${j}`)).toBeDefined()
  }
})

test("audio enters through J_IN and leaves through J_OUT", async () => {
  const el = await render()
  expectConnected(el, "CMP_J_IN.P1", "CMP_C_IN.pin1")
  expectConnected(el, "CMP_J_OUT.P1", "CMP_C_OUT.pin2")
  expectConnected(el, "CMP_J_IN.P2", "CMP_J_OUT.P2")
})

test("supply enters raw and reaches the op-amps only via the Schottky", async () => {
  const el = await render()
  expectConnected(el, "CMP_J_PWR.P1", "CMP_D_PROT.anode")
  expectConnected(el, "CMP_U1.VCC", "CMP_D_PROT.cathode")
  expectConnected(el, "CMP_U2.VCC", "CMP_D_PROT.cathode")
  // The raw input must not reach the op-amps directly.
  expectNotConnected(el, "CMP_J_PWR.P1", "CMP_U1.VCC")
})

test("GAIN pot is wired as a rheostat with the wiper tied to an end", async () => {
  const el = await render()
  // Spec 10.1: an open wiper must not open the feedback loop.
  expectConnected(el, "CMP_J_GAIN.P2", "CMP_J_GAIN.P3")
  expectConnected(el, "CMP_J_GAIN.P2", "CMP_U1.INB_N")
  expectConnected(el, "CMP_J_GAIN.P1", "CMP_U1.OUTB")
})

test("PEAK REDUCTION is a divider: wiper NOT tied to either end", async () => {
  const el = await render()
  // The revision-3 correction. Tying these would short the divider.
  expectNotConnected(el, "CMP_J_PEAK.P2", "CMP_J_PEAK.P1")
  expectNotConnected(el, "CMP_J_PEAK.P2", "CMP_J_PEAK.P3")
  // Bottom goes to VBIAS, wiper to the sidechain amp.
  expectConnected(el, "CMP_J_PEAK.P3", "CMP_TP_VBIAS.TP")
  expectConnected(el, "CMP_J_PEAK.P2", "CMP_U2.INA_P")
})

test("the vactrol bridges audio and sidechain without an electrical path", async () => {
  const el = await render()
  expectConnected(el, "CMP_VACTROL.LDR_1", "CMP_R_SHUNT.pin2")
  expectConnected(el, "CMP_VACTROL.LED_A", "CMP_R_LED.pin2")
  expectNotConnected(el, "CMP_VACTROL.LDR_1", "CMP_VACTROL.LED_A")
})

test("the feedback loop is closed: makeup output reaches the LED driver", async () => {
  const el = await render()
  // Makeup output feeds the PEAK REDUCTION divider top at J_PEAK.P1.
  expectConnected(el, "CMP_U1.OUTB", "CMP_J_PEAK.P1")
  expectConnected(el, "CMP_U2.OUTA", "CMP_C_SC.pin1")
  expectConnected(el, "CMP_C_DET.pin1", "CMP_R_B.pin1")
})

test("no pin is left floating", async () => {
  const el = await render()
  expectNoFloatingPins(el)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test modules/optical-compressor/OpticalCompressor.test.tsx
```

Expected: FAIL — `Cannot find module './OpticalCompressor.tsx'`.

- [ ] **Step 3: Write OpticalCompressor**

Create `modules/optical-compressor/OpticalCompressor.tsx`:

```tsx
/**
 * +9 V LA-2A-inspired optical compressor module.
 *
 * Solid-state feedback optical compressor with two controls, PEAK
 * REDUCTION and GAIN. Borrows the LA-2A's operating model, not its
 * circuit: no tubes, transformers, EL panel or T4 cell, and no claim of
 * equivalence.
 *
 * WHAT A SUCCESSFUL RENDER DOES NOT PROVE: tscircuit cannot simulate
 * optical coupling, so compression behaviour, attack, release and the
 * control law are NOT validated here. They must be measured. See
 * DESIGN-NOTES.md and the design spec, section 12.2.
 *
 * Composed from three internal parts. They are deliberately not exported
 * - see the spec, section 11.1, for the distinction between splitting
 * files and extracting modules.
 */

import { ScrewTerminal2, ScrewTerminal3 } from "../../lib/connectors/index"
import { AudioPath } from "./parts/AudioPath.tsx"
import { PowerSection } from "./parts/PowerSection.tsx"
import { Sidechain } from "./parts/Sidechain.tsx"

export interface OpticalCompressorProps {
  name: string
  /** Required: no default. Verify pin-to-pad mapping against the datasheet. */
  vactrolFootprint: string
  shuntResistance?: string
  sidechainGainResistance?: string
  sidechainBiasResistance?: string
  detectorCapacitance?: string
  releaseResistance?: string
  ledResistance?: string
  emitterResistance?: string
  inputCap?: string
  outputCap?: string
  sidechainCouplingCap?: string
  pcbX?: number
  pcbY?: number
  schX?: number
  schY?: number
}

export const OpticalCompressor = (props: OpticalCompressorProps) => {
  const {
    name,
    vactrolFootprint,
    shuntResistance,
    sidechainGainResistance,
    sidechainBiasResistance,
    detectorCapacitance,
    releaseResistance,
    ledResistance,
    emitterResistance,
    inputCap,
    outputCap,
    sidechainCouplingCap,
    pcbX = 0,
    pcbY = 0,
    schX = 0,
    schY = 0,
  } = props

  return (
    <group>
      {/* Power above the audio row, sidechain below it. */}
      <PowerSection
        name={name}
        schX={schX - 6}
        schY={schY - 12}
        pcbX={pcbX - 10}
        pcbY={pcbY - 25}
      />
      <AudioPath
        name={name}
        vactrolFootprint={vactrolFootprint}
        shuntResistance={shuntResistance}
        inputCap={inputCap}
        outputCap={outputCap}
        schX={schX}
        schY={schY}
        pcbX={pcbX}
        pcbY={pcbY}
      />
      <Sidechain
        name={name}
        detectorCapacitance={detectorCapacitance}
        releaseResistance={releaseResistance}
        ledResistance={ledResistance}
        emitterResistance={emitterResistance}
        sidechainGainResistance={sidechainGainResistance}
        sidechainBiasResistance={sidechainBiasResistance}
        sidechainCouplingCap={sidechainCouplingCap}
        schX={schX - 3}
        schY={schY + 15}
        pcbX={pcbX - 5}
        pcbY={pcbY + 25}
      />

      {/* === External connectors === */}
      <ScrewTerminal2
        name={`${name}_J_IN`}
        schX={schX - 24}
        schY={schY}
        pcbX={pcbX - 45}
        pcbY={pcbY}
      />
      <ScrewTerminal2
        name={`${name}_J_OUT`}
        schX={schX + 24}
        schY={schY}
        pcbX={pcbX + 45}
        pcbY={pcbY}
      />
      <ScrewTerminal2
        name={`${name}_J_PWR`}
        schX={schX - 24}
        schY={schY - 15}
        pcbX={pcbX - 45}
        pcbY={pcbY - 25}
      />
      <ScrewTerminal3
        name={`${name}_J_PEAK`}
        schX={schX - 24}
        schY={schY + 15}
        pcbX={pcbX - 45}
        pcbY={pcbY + 25}
      />
      <ScrewTerminal3
        name={`${name}_J_GAIN`}
        schX={schX + 24}
        schY={schY + 15}
        pcbX={pcbX + 45}
        pcbY={pcbY + 25}
      />

      {/* === Audio I/O === */}
      <trace from={`.${name}_J_IN > .P1`} to={`net.${name}_IN`} />
      <trace from={`.${name}_J_IN > .P2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_J_OUT > .P1`} to={`net.${name}_OUT`} />
      <trace from={`.${name}_J_OUT > .P2`} to={`net.${name}_GND`} />

      {/* === Power in === */}
      <trace from={`.${name}_J_PWR > .P1`} to={`net.${name}_9V_RAW`} />
      <trace from={`.${name}_J_PWR > .P2`} to={`net.${name}_GND`} />

      {/* === PEAK REDUCTION: a three-terminal DIVIDER ===
          TOP from the makeup output, BOTTOM to VBIAS, WIPER to the
          sidechain amp. The wiper is NOT tied to either end - doing so
          would short out part of the divider. Spec 10.1. */}
      <trace from={`.${name}_J_PEAK > .P1`} to={`net.${name}_MAKEUP_OUT`} />
      <trace from={`.${name}_J_PEAK > .P2`} to={`net.${name}_PEAK_WIPER`} />
      <trace from={`.${name}_J_PEAK > .P3`} to={`net.${name}_VBIAS`} />

      {/* === GAIN: a RHEOSTAT in the makeup feedback path ===
          Wiper tied to an end terminal so intermittent contact gives a
          bounded resistance rather than an open feedback loop. Spec 10.1. */}
      <trace from={`.${name}_J_GAIN > .P1`} to={`net.${name}_MAKEUP_OUT`} />
      <trace from={`.${name}_J_GAIN > .P2`} to={`net.${name}_GAIN_FB`} />
      <trace from={`.${name}_J_GAIN > .P3`} to={`net.${name}_GAIN_FB`} />
    </group>
  )
}
```

- [ ] **Step 4: Create the index and register the module**

Create `modules/optical-compressor/index.ts`. Parts are deliberately absent:

```ts
// Public surface only. parts/* are internal by design - see the design
// spec, section 11.1.
export {
  OpticalCompressor,
  type OpticalCompressorProps,
} from "./OpticalCompressor.tsx"
```

In `modules/index.ts`, add:

```ts
export {
  OpticalCompressor,
  type OpticalCompressorProps,
} from "./optical-compressor/index"
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
bun test modules/optical-compressor/
bun run typecheck
```

Expected: all pass; typecheck clean.

The `expectNoFloatingPins` test is the one most likely to fail first. Read the error — it names every floating pin. Each one is either a missing trace (fix the wiring) or genuinely unused (which, given §8.1 assigns all four op-amp sections, should not happen — investigate rather than adding to an allowlist).

- [ ] **Step 6: Commit**

```bash
git add modules/optical-compressor modules/index.ts
git commit -m "feat: compose optical compressor module with external connectors"
```

---

### Task 8: Standalone fixture, design notes, and build verification

Closes out spec §12.1, the static project checks.

**Files:**
- Create: `modules/optical-compressor/optical-compressor.circuit.tsx`
- Create: `modules/optical-compressor/DESIGN-NOTES.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: `OpticalCompressor` (Task 7)
- Produces: a default-exported board fixture

- [ ] **Step 1: Write the failing test**

Append to `modules/optical-compressor/OpticalCompressor.test.tsx`:

```tsx
test("the standalone fixture renders with no floating pins", async () => {
  const { default: fixture } = await import("./optical-compressor.circuit.tsx")
  const el = await renderCircuit(fixture())
  expectNoFloatingPins(el)
  expect(findComponent(el, "CMP1_VACTROL")).toBeDefined()
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
bun test modules/optical-compressor/OpticalCompressor.test.tsx
```

Expected: FAIL — `Cannot find module './optical-compressor.circuit.tsx'`.

- [ ] **Step 3: Write the fixture**

Create `modules/optical-compressor/optical-compressor.circuit.tsx`:

```tsx
/**
 * Standalone optical compressor for development, rendering and export.
 *
 * The power connector and bias network are part of this fixture because
 * single-supply behaviour is part of the module's contract. This is a
 * development fixture, NOT a production board - see the design spec,
 * section 11.
 *
 * The vactrol footprint here is a placeholder for rendering. It MUST be
 * replaced with the selected device's verified footprint before any
 * fabrication output is trusted (spec 12.1 item 7).
 */

import { OpticalCompressor } from "./OpticalCompressor.tsx"

export default () => (
  <board width="110mm" height="90mm">
    <OpticalCompressor name="CMP1" vactrolFootprint="dip4" pcbX={0} pcbY={0} />
  </board>
)
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
bun test modules/optical-compressor/
```

Expected: all pass.

- [ ] **Step 5: Verify the spec's static project checks**

Run each and record the result. These are spec §12.1 items 1–4 and 9–10:

```bash
bun install
bun run typecheck
bun test
bunx tsci build modules/optical-compressor/optical-compressor.circuit.tsx
find lib modules -name '*.tsx' -o -name '*.ts' | xargs wc -l | sort -rn | head -5
```

Expected: install clean; typecheck clean; all tests pass; build succeeds; no file over 500 lines.

DRC/autorouting warnings from `tsci build` are acceptable at this stage — the spec defers PCB layout until after electrical validation. Connectivity errors are not; fix those.

- [ ] **Step 6: Write DESIGN-NOTES.md**

Create `modules/optical-compressor/DESIGN-NOTES.md`:

```markdown
# Optical Compressor — Design Notes

Spec: `docs/superpowers/specs/2026-09-21-optical-compressor-design.md` (rev 3)

## Modeling boundary

tscircuit models connectivity and packaging. It does **not** model optical
coupling, LDR resistance versus LED current, optical memory, attack, or
release. A clean render, a passing test suite and a successful build prove
the circuit is *wired* as intended. They prove nothing about how it
*sounds* or whether it compresses usefully.

Everything in "Pending measurement" below is unvalidated.

## Provisional values

All values are starting points from spec revision 3, not measured results.

| Ref | Value | Why |
|---|---|---|
| R_SHUNT | 22 kΩ | Sets the §6.2 vactrol selection windows |
| R_E | 1 kΩ | Control-law fix; without it the range is ~1 dB (§6.1.2) |
| R_LED | 3.3 kΩ | ~1.5 mA max, after the 1.5 V across R_E (§8.7.2) |
| C_DET | 4.7 µF | ~305 ms release, ~5% ripple at 100 Hz (§8.6.1) |
| R_PEAK_FAIL | 1 MΩ | Open-wiper fail-safe to VBIAS (§10.1) |

## Vactrol selection criteria (§6.2)

A candidate part must satisfy **both**:

- dark resistance **≥ 1 MΩ** (keeps insertion loss better than −0.2 dB)
- **R_LDR ≤ 10.2 kΩ** at or below maximum LED current (10 dB gain reduction)

Screen a datasheet against these before ordering. The footprint prop is
required precisely so an unverified pad map cannot reach fabrication.

## Population options

| Ref | Fitted | Alternatives | Notes |
|---|---|---|---|
| R_SHUNT | 22 kΩ | 10 kΩ, 47 kΩ | Changing it invalidates the §6.2 table |
| R_LED | 3.3 kΩ | 2.2 kΩ, 1.5 kΩ | Recompute for the real LED forward voltage |
| C_DET | 4.7 µF | 10 µF, 2.2 µF, 1 µF | Sweep both directions (§12.2 item 9) |
| R_REL | 100 kΩ | depopulate | Independently removable |

The precision rectifier is **not** a population option. It needs an
inverting topology, an anti-saturation clamp, and a solution to
single-supply level shifting. §8.6.2 explains why; the board carries test
pads only.

## Pending measurement

Nothing below has been measured. See spec §12.2 for the full protocol.

- [ ] Vactrol dark resistance (pass: ≥ 1 MΩ)
- [ ] R_LDR versus LED current (pass: ≤ 10.2 kΩ at max)
- [ ] Insertion loss, LED off (pass: better than −0.2 dB)
- [ ] All three §6.1 thresholds (expect ~1.25 V / ~2.75 V / ~4.15 V)
- [ ] Control-law shape — progressive, not switch-like
- [ ] Release, 90% → 10% LED current (estimate: ~305 ms)
- [ ] Ripple sweep across C_DET values
- [ ] TL072H output swing at 8.7 V — the most load-bearing unverified number
- [ ] LED current across ≥ 3 transistor samples (expect single-digit % spread)
- [ ] Power-up transient during the ~2.5 s VBIAS ramp

Record the exact vactrol part and sample with every measurement. Optical
parts vary widely; one sample is evidence for a prototype, not a
component specification.
```

- [ ] **Step 7: Update the README**

In `README.md`, in the Module Status table, change the `opto-compressor` row (add it if absent):

```markdown
| `optical-compressor` | ✅ Renders | +9V LA-2A-inspired optical compressor — **not bench validated** |
```

In the Component Library section, add to the Chips table:

```markdown
| `TL072H` | Dual JFET op-amp, single supply 4.5–40 V, rail-to-rail output | SOIC-8, DIP-8 |
```

And add a new table after it:

```markdown
### Optical (`lib/opto/`)

| Component | Description | Pins |
|-----------|-------------|------|
| `Vactrol` | Generic LED/LDR optocoupler (footprint required) | LED_A, LED_K, LDR_1, LDR_2 |
```

- [ ] **Step 8: Run the full suite one more time**

```bash
bun run typecheck && bun test
```

Expected: typecheck clean, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add modules/optical-compressor README.md
git commit -m "feat: add optical compressor fixture, design notes and README entry"
git push
```

---

## Verification Summary

After Task 8, spec §12.1 should be fully satisfied:

| § | Check | Verified by |
|---|---|---|
| 1 | `bun install` from clean clone | Task 8 Step 5 |
| 2 | `bun run typecheck` passes | Every task |
| 3 | Fixture renders without unresolved traces | Task 8 Step 4 (`expectNoFloatingPins`) |
| 4 | `tsci build` succeeds | Task 8 Step 5 |
| 5 | Schematic reads left to right | Manual — `bunx tsci dev` |
| 6 | External connections have stable names | Task 7 connector tests |
| 7 | Vactrol pins map to verified pads | **Deferred** — needs the selected part |
| 8 | Op-amp is TL072H-compatible | Task 2 |
| 9 | No file over 500 lines | Task 8 Step 5 |
| 10 | `vactrolFootprint` required | Task 3 (`@ts-expect-error` test) |

Item 5 needs a human eye — run `bunx tsci dev`, open the schematic, confirm signal flows left to right and no critical labels overlap.

Item 7 **cannot be closed by this plan.** It needs a selected vactrol and its datasheet. `dip4` is a rendering placeholder; the fixture says so and `DESIGN-NOTES.md` repeats it.

Spec §12.2 (bench characterization) is entirely out of scope here — it needs hardware. `DESIGN-NOTES.md` carries the checklist forward.
