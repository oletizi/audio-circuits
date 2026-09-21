# Pultec Step 0 and Representation Contract Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and prove the validation tooling and the data-representation contract that every later Pultec step depends on, without depending on a Pultec transcription.

**Architecture:** Three layers, each independently testable. `lib/passives/` owns the labelled physical model — structured parameters in canonical SI units, a control-state resolver that turns the physical model into a simulation network, ownership partitioning, and a connectivity lint kept separate from strict reference comparison. `lib/sim/` owns AC analysis — a SPICE netlist emitter and a wrapper over an in-process WASM engine, plus tolerance-based response comparison. `lib/export/` owns the reverse direction — tscircuit's emitted circuit JSON flattened back to canonical labelled connectivity. Partitioning operates on the physical model; simulation and lint operate on the resolved network.

**Tech Stack:** TypeScript 5.9 (strict, `noEmit`), Bun 1.3 test runner, `eecircuit-engine` 1.5.8 (ngspice compiled to WASM, already a transitive dependency), `@tscircuit/core` `RootCircuit` for headless circuit JSON.

**Spec:** [implementation-plan.md](implementation-plan.md) step 0 and the step 2 representation bullets, together with [implementation-plan-review.md](implementation-plan-review.md). Executors read both. This plan covers only the work that carries no dependency on the Pultec reference; steps 1, 2b, and 3 through 6 are outlined at the end with their entry criteria.

## Global Constraints

- Imports use explicit relative file paths including the `.ts`/`.tsx` extension. No directory imports, no path aliases. tscircuit's web eval does not resolve them.
- No `any`, no `as Type` assertions, no `@ts-ignore`. `as const` is permitted.
- No fallbacks and no mock data outside test code. Missing functionality or missing data throws an error naming what is absent.
- Source files stay under 300–500 lines. Split by responsibility when a file approaches that.
- Every task ends with a commit and a push. Run `bun test`, `bun run typecheck`, and `git diff --check` before committing.
- Never add AI attribution to commit messages.
- Results produced by this plan validate tooling only. Nothing here establishes Pultec fidelity, and no commit message or doc may imply that it does.

## Feasibility already established

These were verified against the working tree before this plan was written. Do not re-litigate them; build on them.

| Question | Answer | Evidence |
| --- | --- | --- |
| Is an AC engine available without a system install? | Yes. `eecircuit-engine` 1.5.8 is already in `node_modules` as a tscircuit transitive dependency. `new Simulation()` / `await start()` / `setNetList(text)` / `await runSim()`. | An RC lowpass with `.ac dec 20 10 100k` returned `dataType: "complex"`, 81 points, variables `frequency,v(in),v(out),i(v1)`, matching the analytic response to 1.11e-16 at 10 Hz and exactly at 1 kHz and 100 kHz. |
| Does tscircuit expose connectivity headlessly? | Yes. `RootCircuit.add(element)`, `.render()`, `.getCircuitJson()` runs under Bun. | A two-group passive fixture emitted `source_component`, `source_port`, `source_net`, `source_trace`, and `source_pin_missing_trace_warning` elements. |
| Can TypeScript resolve the engine's types? | Only under `moduleResolution: "bundler"`. The current `"node"` setting fails with TS2307 despite `dist/main.d.ts` existing, because the package exposes types through `exports`. | Switching to `"bundler"` resolves it and the entire existing project still typechecks clean. |

Three details from the export probe that the adapter must handle:

1. `source_component.name` does **not** carry the enclosing group's name. A `<resistor name="R1">` inside `<group name="LF">` emits `name=R1`. Canonical identity must come from the repository's existing convention of prefixing component names with the module `name` prop, resolved through an explicit mapping — never inferred.
2. Value normalization is inconsistent across component types. `resistance="1k"` emitted `1000` and `capacitance="100nF"` emitted `1e-7`, both numbers, but `inductance="100mH"` emitted the string `"100mH"`. The adapter must run every value through one unit parser.
3. Connectivity is not a net list. It arrives as `source_trace` records carrying `connected_source_port_ids` and `connected_source_net_ids`; a trace may join two ports, or a port and a named net. Nets are the connected components of that relation, so the adapter needs a union-find pass.

---

### Task 1: Typed test foundation

Converts the only test file to TypeScript and brings it under `bun run typecheck`. The revised plan is right that renaming alone is insufficient — four distinct failure classes appear, and this task clears all of them.

**Files:**
- Modify: `tsconfig.json`
- Modify: `package.json` (add `bun-types` to devDependencies)
- Create: `lib/passives/mutable.ts`
- Delete: `tests/topology.test.js`
- Create: `tests/topology.test.ts`

**Interfaces:**
- Consumes: `PassiveNetwork`, `PassiveElement`, `assertSameTopology`, `partitionTopology` from `lib/passives/topology.ts`.
- Produces: `Mutable<T>` and `MutablePassiveNetwork` from `lib/passives/mutable.ts`, used by every later test that mutates a fixture.

- [ ] **Step 1: Add the Bun type package**

```bash
bun add -d bun-types
```

`bun-types` is already present transitively; this declares it directly so the typecheck does not depend on another package's dependency graph.

- [ ] **Step 2: Update the TypeScript configuration**

In `tsconfig.json`, set `moduleResolution` to `"bundler"`, add `"bun-types"` to `types`, and remove `outDir` and `sourceMap` (both inert under `noEmit`). Keep `rootDir`. The resulting `compilerOptions` differences are exactly:

```jsonc
    "moduleResolution": "bundler",   // was "node"
    "types": ["tscircuit", "bun-types"],
    // "outDir": "dist",      <- removed
    // "sourceMap": true,     <- removed
```

- [ ] **Step 3: Verify the configuration change breaks nothing**

Run: `bun run typecheck`
Expected: exit 0, no output. The existing `lib/` and `modules/` sources must still typecheck under bundler resolution.

- [ ] **Step 4: Add the mutable-fixture helper**

Fixtures declared as `PassiveNetwork` cannot be mutated, because `elements` is a `readonly` array and `pins`/`parameters` are `Readonly` records. Tests that deliberately corrupt a fixture need a mutable mirror of the type. Create `lib/passives/mutable.ts`:

```ts
import type { PassiveNetwork } from "./topology.ts"

/** Recursively strips readonly modifiers. Primitives pass through unchanged. */
export type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T

/** A PassiveNetwork that tests may corrupt on purpose. Assignable to PassiveNetwork. */
export type MutablePassiveNetwork = Mutable<PassiveNetwork>
```

- [ ] **Step 5: Convert the test file**

`git mv tests/topology.test.js tests/topology.test.ts`, then apply three changes. Declare the fixture as `MutablePassiveNetwork` rather than `PassiveNetwork` — mutable is assignable to readonly, so it still satisfies both call sites, and `structuredClone` returns the mutable type the mutation helpers need. Annotate the mutation callbacks. The `kind` fields no longer need `as const`, because the fixture's declared type supplies them.

```ts
import { test, expect } from "bun:test"
import { assertSameTopology, partitionTopology } from "../lib/passives/topology.ts"
import type { MutablePassiveNetwork } from "../lib/passives/mutable.ts"

// Synthetic bridge: deliberately NOT a Pultec transcription or acceptance fixture.
const reference: MutablePassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "out" }, parameters: { ohms: "1000" } },
    { ref: "C1", kind: "capacitor", pins: { a: "in", b: "0" }, parameters: { farads: "1e-6" } },
    { ref: "P1", kind: "potentiometer", pins: { cw: "out", wiper: "in", ccw: "0" }, parameters: { ohms: "10000", taper: "log" } },
  ],
}
const ownership: Record<string, string> = { R1: "lf", C1: "lf", P1: "hf" }
```

The mutation table gains an explicit parameter type:

```ts
const mutations: readonly (readonly [string, (n: MutablePassiveNetwork) => void])[] = [
  ["changed shared node", n => { n.elements[2].pins.wiper = "out" }],
  ["changed taper", n => { n.elements[2].parameters.taper = "linear" }],
  ["changed value", n => { n.elements[0].parameters.ohms = "600" }],
  ["missing component", n => { n.elements.pop() }],
  ["extra termination", n => { n.elements.push({ ...n.elements[0], ref: "R2" }) }],
  ["duplicate reference", n => { n.elements.push(n.elements[0]) }],
  ["swapped external ports", n => { n.ports.input = "out"; n.ports.output = "in" }],
]

for (const [name, mutate] of mutations) {
  test(`rejects ${name}`, () => {
    const candidate: MutablePassiveNetwork = structuredClone(reference)
    mutate(candidate)
    expect(() => assertSameTopology(reference, candidate)).toThrow()
  })
}
```

Leave the two non-mutation tests unchanged except for the fixture types.

- [ ] **Step 6: Verify tests pass and are now typechecked**

Run: `bun test`
Expected: 9 pass, 0 fail.

Run: `bun run typecheck`
Expected: exit 0. Confirm the test file is genuinely covered by temporarily introducing `const broken: number = "x"` in the test file, re-running `bun run typecheck`, observing TS2322, and removing it. A silent pass here means `include` is not matching the file.

- [ ] **Step 7: Commit and push**

```bash
git add tsconfig.json package.json bun.lock lib/passives/mutable.ts tests/topology.test.ts
git commit -m "Typecheck the topology tests and resolve package exports types"
git push
```

---

### Task 2: Structured parameters and canonical units

Replaces flat string parameters with a discriminated union in canonical SI units, and separates source provenance from electrical identity so a provenance-only edit does not read as rewiring. This lands before every other consumer so nothing gets typed twice against the old shape.

**Files:**
- Create: `lib/passives/units.ts`
- Create: `lib/passives/parameters.ts`
- Modify: `lib/passives/topology.ts`
- Modify: `tests/topology.test.ts`
- Create: `tests/units.test.ts`

**Interfaces:**
- Produces: `parseValue(text: string): number` from `units.ts`. `ElementParameters` and the per-kind parameter interfaces from `parameters.ts`. A redefined `PassiveElement` union and an unchanged `assertSameTopology` signature from `topology.ts`.
- Consumed by: every later task.

- [ ] **Step 1: Write the failing unit-parser test**

Create `tests/units.test.ts`:

```ts
import { test, expect } from "bun:test"
import { parseValue } from "../lib/passives/units.ts"

test("parses SI suffixes to base units", () => {
  expect(parseValue("1k")).toBe(1000)
  expect(parseValue("100nF")).toBeCloseTo(1e-7, 20)
  expect(parseValue("100mH")).toBeCloseTo(0.1, 12)
  expect(parseValue("4.7uF")).toBeCloseTo(4.7e-6, 18)
  expect(parseValue("1e-6")).toBe(1e-6)
  expect(parseValue("620")).toBe(620)
})

test("rejects unparseable values instead of guessing", () => {
  expect(() => parseValue("")).toThrow("Unparseable value")
  expect(() => parseValue("about 1k")).toThrow("Unparseable value")
  expect(() => parseValue("1Q")).toThrow("Unparseable value")
})
```

Note `m` is milli and `M` is mega; the test above pins `100mH` to 0.1 H. Case matters for that one prefix and nowhere else.

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun test tests/units.test.ts`
Expected: FAIL, cannot resolve `../lib/passives/units.ts`.

- [ ] **Step 3: Implement the parser**

Create `lib/passives/units.ts`:

```ts
const PREFIXES: Readonly<Record<string, number>> = {
  p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3,
  k: 1e3, K: 1e3, M: 1e6, G: 1e9,
}

const UNIT_SUFFIX = /^(?<number>[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)(?<prefix>[pnuµmkKMG])?(?<unit>[a-zA-Z]*)$/

/** Parses a source value string into base SI units. Throws rather than guessing. */
export function parseValue(text: string): number {
  const match = UNIT_SUFFIX.exec(text.trim())
  if (!match?.groups) throw new Error(`Unparseable value: ${JSON.stringify(text)}`)
  const { number, prefix, unit } = match.groups
  if (unit && !/^(ohm|ohms|Ohm|R|F|H)$/.test(unit)) {
    throw new Error(`Unparseable value: ${JSON.stringify(text)} (unrecognized unit ${JSON.stringify(unit)})`)
  }
  const magnitude = Number(number)
  if (!Number.isFinite(magnitude)) throw new Error(`Unparseable value: ${JSON.stringify(text)}`)
  return prefix ? magnitude * PREFIXES[prefix] : magnitude
}
```

An exponent form such as `1e-6` must not be read as the prefix `m`; the regex consumes the exponent inside `number` first, which is why `number` is matched greedily before `prefix`.

- [ ] **Step 4: Run the unit tests**

Run: `bun test tests/units.test.ts`
Expected: 2 pass.

- [ ] **Step 5: Define the structured parameters**

Create `lib/passives/parameters.ts`:

```ts
/** A log pot's curve needs a stated constant from the reference; there is no default. */
export type Taper =
  | { readonly type: "linear" }
  | { readonly type: "log"; readonly curveConstant: number }

export interface ResistorParameters { readonly ohms: number }
export interface CapacitorParameters { readonly farads: number }

export interface InductorParameters {
  readonly henries: number
  /** Tap identifier to inductance measured from pin `a`, for tapped windings. */
  readonly taps?: Readonly<Record<string, number>>
}

export interface PotentiometerParameters {
  readonly ohms: number
  readonly taper: Taper
}

export interface SwitchParameters {
  readonly positions: readonly string[]
  /** Position name to the pin pairs shorted in that position. */
  readonly contacts: Readonly<Record<string, readonly (readonly [string, string])[]>>
  /** Identifier shared by ganged switches that must select together. */
  readonly gang?: string
}

/** Source annotations. Deliberately excluded from electrical identity comparison. */
export interface Provenance {
  readonly source: string
  readonly location?: string
  readonly note?: string
  readonly unresolved?: readonly string[]
}
```

- [ ] **Step 6: Rebuild `PassiveElement` as a discriminated union**

In `lib/passives/topology.ts`, replace the `PassiveElement` interface with a generic base plus a union, and import the parameter types. This is what makes `parameters` depend on `kind` without a cast:

```ts
import type {
  CapacitorParameters, InductorParameters, PotentiometerParameters,
  Provenance, ResistorParameters, SwitchParameters,
} from "./parameters.ts"

interface ElementBase<K extends string, P> {
  readonly ref: string
  readonly kind: K
  readonly pins: Readonly<Record<string, string>>
  readonly parameters: P
  /** Provenance is metadata. assertSameTopology ignores it. */
  readonly provenance?: Provenance
}

export type PassiveElement =
  | ElementBase<"resistor", ResistorParameters>
  | ElementBase<"capacitor", CapacitorParameters>
  | ElementBase<"inductor", InductorParameters>
  | ElementBase<"potentiometer", PotentiometerParameters>
  | ElementBase<"switch", SwitchParameters>
```

- [ ] **Step 7: Make comparison structural, deterministic, and provenance-blind**

Replace `sortedEntries` and the signature builder in `topology.ts`. The old version sorted only top-level keys of a flat string map; structured parameters nest, so canonicalization must recurse. Provenance is dropped before comparison.

```ts
type Canonical = string | number | boolean | null | readonly Canonical[] | { readonly [k: string]: Canonical }

/** Recursively sorts object keys so serialization is order-independent. */
function canonicalize(value: unknown): Canonical {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === "object") {
    const out: Record<string, Canonical> = {}
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      out[key] = canonicalize(Reflect.get(value, key))
    }
    return out
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value
  }
  throw new Error(`Non-canonicalizable parameter value: ${String(value)}`)
}
```

The signature builder then becomes, with `provenance` destructured away:

```ts
    return JSON.stringify({
      ports: canonicalize(network.ports),
      elements: [...network.elements]
        .sort((a, b) => a.ref.localeCompare(b.ref))
        .map(({ ref, kind, pins, parameters }) => ({
          ref, kind, pins: canonicalize(pins), parameters: canonicalize(parameters),
        })),
    })
```

`validate()` is unchanged.

- [ ] **Step 8: Update the existing fixtures to the new shape**

In `tests/topology.test.ts`, convert the three fixture elements and the two parameter mutations:

```ts
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "out" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "in", b: "0" }, parameters: { farads: 1e-6 } },
    { ref: "P1", kind: "potentiometer", pins: { cw: "out", wiper: "in", ccw: "0" },
      parameters: { ohms: 10000, taper: { type: "log", curveConstant: 4.8 } } },
```

```ts
  ["changed taper", n => { n.elements[2].parameters.taper = { type: "linear" } }],
  ["changed value", n => { n.elements[0].parameters.ohms = 600 }],
```

The mutation callbacks now need narrowing, because `parameters` differs per union member. Give the two parameter mutations a guard rather than a cast:

```ts
  ["changed taper", n => {
    const p = n.elements[2]
    if (p.kind !== "potentiometer") throw new Error("fixture element 2 must be a potentiometer")
    p.parameters.taper = { type: "linear" }
  }],
```

Apply the same guard shape to the `ohms` mutation against `n.elements[0]` with `kind !== "resistor"`.

- [ ] **Step 9: Add a provenance-blindness test**

Append to `tests/topology.test.ts`:

```ts
test("provenance edits are not rewiring", () => {
  const annotated: MutablePassiveNetwork = structuredClone(reference)
  annotated.elements[0].provenance = { source: "synthetic fixture", note: "added after transcription review" }
  expect(() => assertSameTopology(reference, annotated)).not.toThrow()
})
```

- [ ] **Step 10: Run the full suite and typecheck**

Run: `bun test`
Expected: 12 pass, 0 fail.

Run: `bun run typecheck`
Expected: exit 0.

- [ ] **Step 11: Commit and push**

```bash
git add lib/passives/units.ts lib/passives/parameters.ts lib/passives/topology.ts tests/units.test.ts tests/topology.test.ts
git commit -m "Replace flat string parameters with structured SI values and provenance"
git push
```

---

### Task 3: Control-state vector and resolver

Establishes the contract the review named as the highest-cost-if-deferred decision. The physical model keeps every pot terminal and every switch contact; a separate control-state vector plus a resolver produce the network that simulation and lint consume. Partitioning continues to operate on the physical model, because unselected contacts are still hardware.

**Files:**
- Create: `lib/passives/control-state.ts`
- Create: `tests/control-state.test.ts`

**Interfaces:**
- Consumes: `PassiveNetwork`, `PassiveElement` from `topology.ts`; `Taper` from `parameters.ts`.
- Produces: `ControlState`, `ResolvedNetwork`, `ResolvedElement`, `resolveNetwork(physical: PassiveNetwork, state: ControlState): ResolvedNetwork`. `ResolvedNetwork` is what Tasks 5, 7, and 8 consume.

- [ ] **Step 1: Write the failing resolver tests**

Create `tests/control-state.test.ts`. The fixture is a pot between two nets plus a two-position switch selecting one of two capacitors — the smallest network that exercises both expansions.

```ts
import { test, expect } from "bun:test"
import { resolveNetwork } from "../lib/passives/control-state.ts"
import type { ControlState } from "../lib/passives/control-state.ts"
import type { PassiveNetwork } from "../lib/passives/topology.ts"

const physical: PassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "P1", kind: "potentiometer", pins: { ccw: "in", wiper: "out", cw: "0" },
      parameters: { ohms: 10000, taper: { type: "linear" } } },
    { ref: "S1", kind: "switch", pins: { common: "out", a: "sel_a", b: "sel_b" },
      parameters: { positions: ["a", "b"], contacts: { a: [["common", "a"]], b: [["common", "b"]] } } },
    { ref: "C1", kind: "capacitor", pins: { a: "sel_a", b: "0" }, parameters: { farads: 1e-8 } },
    { ref: "C2", kind: "capacitor", pins: { a: "sel_b", b: "0" }, parameters: { farads: 2e-8 } },
  ],
}

const midpoint: ControlState = { potPositions: { P1: 0.5 }, switchPositions: { S1: "a" } }

test("expands a linear pot into two resistors summing to its total", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const lower = resolved.elements.find(e => e.ref === "P1.ccw-wiper")
  const upper = resolved.elements.find(e => e.ref === "P1.wiper-cw")
  expect(lower?.kind).toBe("resistor")
  expect(lower?.parameters.ohms).toBeCloseTo(5000, 9)
  expect(upper?.parameters.ohms).toBeCloseTo(5000, 9)
})

test("a closed switch contact merges its two nets", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const c1 = resolved.elements.find(e => e.ref === "C1")
  expect(c1?.pins.a).toBe(resolved.elements.find(e => e.ref === "P1.wiper-cw")?.pins.a)
  expect(resolved.elements.some(e => e.ref === "S1")).toBe(false)
})

test("an open switch contact leaves its net unmerged", () => {
  const resolved = resolveNetwork(physical, midpoint)
  const c2 = resolved.elements.find(e => e.ref === "C2")
  expect(c2?.pins.a).toBe("sel_b")
})

test("rejects invalid or missing control settings instead of defaulting", () => {
  expect(() => resolveNetwork(physical, { potPositions: {}, switchPositions: { S1: "a" } }))
    .toThrow("Missing control setting: P1")
  expect(() => resolveNetwork(physical, { potPositions: { P1: 1.5 }, switchPositions: { S1: "a" } }))
    .toThrow("Pot position out of range: P1")
  expect(() => resolveNetwork(physical, { potPositions: { P1: 0.5 }, switchPositions: { S1: "c" } }))
    .toThrow("Unknown switch position: S1=c")
  expect(() => resolveNetwork(physical, { potPositions: { P1: 0.5, P9: 0.5 }, switchPositions: { S1: "a" } }))
    .toThrow("Unknown control reference: P9")
})

test("ganged switches must select the same position", () => {
  const ganged: PassiveNetwork = {
    ports: physical.ports,
    elements: [
      ...physical.elements,
      { ref: "S2", kind: "switch", pins: { common: "in", a: "sel_a", b: "sel_b" },
        parameters: { positions: ["a", "b"], contacts: { a: [["common", "a"]], b: [["common", "b"]] }, gang: "freq" } },
    ],
  }
  const gangedPhysical: PassiveNetwork = {
    ports: ganged.ports,
    elements: ganged.elements.map(e =>
      e.ref === "S1" && e.kind === "switch"
        ? { ...e, parameters: { ...e.parameters, gang: "freq" } }
        : e),
  }
  expect(() => resolveNetwork(gangedPhysical, { potPositions: { P1: 0.5 }, switchPositions: { S1: "a", S2: "b" } }))
    .toThrow("Ganged switches disagree: freq")
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `bun test tests/control-state.test.ts`
Expected: FAIL, cannot resolve `../lib/passives/control-state.ts`.

- [ ] **Step 3: Implement the resolver**

Create `lib/passives/control-state.ts`. Keep it under 200 lines; if it grows past that, move the union-find into its own file and import it.

```ts
import type { PassiveElement, PassiveNetwork } from "./topology.ts"
import type { CapacitorParameters, InductorParameters, ResistorParameters, Taper } from "./parameters.ts"

export interface ControlState {
  /** Pot reference to wiper fraction, 0 at ccw and 1 at cw. */
  readonly potPositions: Readonly<Record<string, number>>
  /** Switch reference to selected position name. */
  readonly switchPositions: Readonly<Record<string, string>>
}

type ResolvedBase<K extends string, P> = {
  readonly ref: string
  readonly kind: K
  readonly pins: Readonly<Record<string, string>>
  readonly parameters: P
}

export type ResolvedElement =
  | ResolvedBase<"resistor", ResistorParameters>
  | ResolvedBase<"capacitor", CapacitorParameters>
  | ResolvedBase<"inductor", InductorParameters>

export interface ResolvedNetwork {
  readonly ports: Readonly<Record<string, string>>
  readonly elements: readonly ResolvedElement[]
}

/** Fraction of total resistance between ccw and wiper at position `f`. */
function taperFraction(taper: Taper, f: number): number {
  if (taper.type === "linear") return f
  const k = taper.curveConstant
  return (Math.exp(k * f) - 1) / (Math.exp(k) - 1)
}
```

The body performs five passes in order. Implement them as small named functions in the same file:

1. **Validate the state against the network.** Collect every pot and switch ref. Throw `Missing control setting: <ref>` for any control with no entry, `Unknown control reference: <ref>` for any entry naming a ref the network does not contain, `Pot position out of range: <ref>` when a fraction is outside `[0, 1]`, and `Unknown switch position: <ref>=<pos>` when the position is absent from `parameters.positions`.
2. **Check gangs.** Group switches by `parameters.gang`, skipping switches without one, and throw `Ganged switches disagree: <gang>` when a group's selected positions are not all identical.
3. **Merge nets shorted by closed contacts.** Build a union-find over net names. For each switch, look up `parameters.contacts[selected]` and union the nets its pin pairs sit on. Throw if a contact names a pin the switch does not declare.
4. **Expand pots.** Replace each pot with two resistors, `${ref}.ccw-wiper` and `${ref}.wiper-cw`, carrying `ohms * taperFraction(...)` and `ohms * (1 - taperFraction(...))`. A zero-ohm section is legal and must be emitted, not dropped, so that element counts stay stable across the sweep.
5. **Rewrite every remaining element's pins to its net's canonical representative**, and rewrite `ports` the same way. Drop switch elements; they have become topology.

Ground rules for this file: no defaults anywhere, and every throw names the reference it rejected.

- [ ] **Step 4: Run the resolver tests**

Run: `bun test tests/control-state.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `bun test && bun run typecheck`
Expected: 17 pass, 0 fail; typecheck exit 0.

- [ ] **Step 6: Commit and push**

```bash
git add lib/passives/control-state.ts tests/control-state.test.ts
git commit -m "Add control-state vector and physical-to-resolved network resolver"
git push
```

---

### Task 4: Allowed-owner validation

Closes the verified gap where a one-character owner typo silently creates a phantom module that the boundary-net output does not reveal. The generic helper stays reusable; the allowed set is supplied by the caller.

**Files:**
- Modify: `lib/passives/topology.ts`
- Create: `tests/owners.test.ts`

**Interfaces:**
- Produces: `partitionTopology(network, ownerByRef, options?: PartitionOptions)` where `PartitionOptions` is `{ readonly allowedOwners?: readonly string[] }`. The third parameter is optional, so existing calls are unaffected.

- [ ] **Step 1: Write the failing test**

Create `tests/owners.test.ts`:

```ts
import { test, expect } from "bun:test"
import { partitionTopology } from "../lib/passives/topology.ts"
import type { PassiveNetwork } from "../lib/passives/topology.ts"

const network: PassiveNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "mid" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "mid", b: "0" }, parameters: { farads: 1e-6 } },
    { ref: "L1", kind: "inductor", pins: { a: "mid", b: "out" }, parameters: { henries: 0.1 } },
  ],
}

test("a one-character owner typo is rejected when the owner set is declared", () => {
  expect(() => partitionTopology(network, { R1: "lf", C1: "1f", L1: "hf" }, { allowedOwners: ["lf", "hf"] }))
    .toThrow("Unknown owner: 1f")
})

test("the typo is otherwise invisible in the derived boundary nets", () => {
  const intended = partitionTopology(network, { R1: "lf", C1: "lf", L1: "hf" })
  const typo = partitionTopology(network, { R1: "lf", C1: "1f", L1: "hf" })
  expect(Object.keys(typo.modules)).toHaveLength(3)
  expect(typo.boundaryNets.map(b => b.net)).toEqual(intended.boundaryNets.map(b => b.net))
})

test("a declared owner set still accepts a correct map", () => {
  const split = partitionTopology(network, { R1: "lf", C1: "lf", L1: "hf" }, { allowedOwners: ["lf", "hf"] })
  expect(Object.keys(split.modules).sort()).toEqual(["hf", "lf"])
})
```

The second test is the regression guard: it pins the behavior that made the defect hard to see, so a future change that hides it differently still fails here.

- [ ] **Step 2: Run to confirm failure**

Run: `bun test tests/owners.test.ts`
Expected: FAIL on the first test — no error is thrown, because the third argument is currently ignored.

- [ ] **Step 3: Implement the check**

In `lib/passives/topology.ts`, add the options type and validate inside the existing per-element loop, right after the owner is read:

```ts
export interface PartitionOptions {
  /** When present, every owner name must appear here. */
  readonly allowedOwners?: readonly string[]
}
```

```ts
    const owner = ownerByRef[element.ref]
    if (options?.allowedOwners && !options.allowedOwners.includes(owner)) {
      throw new Error(`Unknown owner: ${owner} (allowed: ${options.allowedOwners.join(", ")})`)
    }
```

- [ ] **Step 4: Run the tests**

Run: `bun test tests/owners.test.ts`
Expected: 3 pass.

Run: `bun test && bun run typecheck`
Expected: 20 pass, 0 fail; typecheck exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add lib/passives/topology.ts tests/owners.test.ts
git commit -m "Validate partition owner names against a declared set"
git push
```

---

### Task 5: Connectivity lint

A diagnostic pass kept deliberately separate from `assertSameTopology`. Strict comparison stays strict; this reports the transcription slips comparison cannot see. It must not use a blanket two-terminal rule: external ports and declared opens are legitimate single-terminal nets, and a network split into two internally-well-formed islands is the case a blanket rule would miss entirely.

**Files:**
- Create: `lib/passives/connectivity.ts`
- Create: `tests/connectivity.test.ts`

**Interfaces:**
- Consumes: `ResolvedNetwork` from `control-state.ts`.
- Produces: `LintFinding`, `LintOptions`, `lintConnectivity(network: ResolvedNetwork, options?: LintOptions): readonly LintFinding[]`. Returns findings; never throws for a lint condition.

- [ ] **Step 1: Write the failing tests**

Create `tests/connectivity.test.ts`:

```ts
import { test, expect } from "bun:test"
import { lintConnectivity } from "../lib/passives/connectivity.ts"
import type { ResolvedNetwork } from "../lib/passives/control-state.ts"

const wellFormed: ResolvedNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "mid" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "mid", b: "0" }, parameters: { farads: 1e-6 } },
    { ref: "L1", kind: "inductor", pins: { a: "mid", b: "out" }, parameters: { henries: 0.1 } },
  ],
}

test("a well-formed network produces no findings", () => {
  expect(lintConnectivity(wellFormed)).toEqual([])
})

test("external ports are not reported as singletons", () => {
  // "in" and "out" each touch exactly one element terminal, which is correct.
  expect(lintConnectivity(wellFormed).filter(f => f.code === "singleton-net")).toEqual([])
})

test("an accidental singleton net is reported", () => {
  const typo: ResolvedNetwork = {
    ports: wellFormed.ports,
    elements: [
      ...wellFormed.elements.slice(0, 2),
      { ref: "L1", kind: "inductor", pins: { a: "mjd", b: "out" }, parameters: { henries: 0.1 } },
    ],
  }
  const findings = lintConnectivity(typo)
  expect(findings).toContainEqual({ code: "singleton-net", net: "mjd", terminal: "L1.a" })
})

test("a declared open is not reported", () => {
  const withOpen: ResolvedNetwork = {
    ports: wellFormed.ports,
    elements: [
      ...wellFormed.elements,
      { ref: "C9", kind: "capacitor", pins: { a: "mid", b: "spare" }, parameters: { farads: 1e-9 } },
    ],
  }
  expect(lintConnectivity(withOpen, { declaredOpens: ["spare"] })).toEqual([])
  expect(lintConnectivity(withOpen)).toContainEqual({ code: "singleton-net", net: "spare", terminal: "C9.b" })
})

test("two internally well-formed islands are reported", () => {
  const split: ResolvedNetwork = {
    ports: { input: "in", output: "out", ground: "0" },
    elements: [
      { ref: "R1", kind: "resistor", pins: { a: "in", b: "0" }, parameters: { ohms: 1000 } },
      { ref: "R2", kind: "resistor", pins: { a: "out", b: "iso" }, parameters: { ohms: 1000 } },
      { ref: "C2", kind: "capacitor", pins: { a: "iso", b: "out" }, parameters: { farads: 1e-6 } },
    ],
  }
  const islands = lintConnectivity(split).filter(f => f.code === "disconnected-island")
  expect(islands).toHaveLength(1)
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `bun test tests/connectivity.test.ts`
Expected: FAIL, cannot resolve `../lib/passives/connectivity.ts`.

- [ ] **Step 3: Implement the lint**

Create `lib/passives/connectivity.ts`:

```ts
import type { ResolvedNetwork } from "./control-state.ts"

export type LintFinding =
  | { readonly code: "singleton-net"; readonly net: string; readonly terminal: string }
  | { readonly code: "disconnected-island"; readonly nets: readonly string[] }

export interface LintOptions {
  /** Nets that are intentionally open, such as unused switch contacts. */
  readonly declaredOpens?: readonly string[]
}
```

`lintConnectivity` runs two independent passes:

**Singleton pass.** Count terminals per net across all element pins. A net with exactly one terminal is a finding unless it is a value in `network.ports` or listed in `declaredOpens`. Report the owning terminal as `` `${ref}.${pin}` `` so the message points at the transcription site. Sort findings by net name for stable output.

**Island pass.** Union-find over nets joined by shared elements, seeded so that every net appearing in `ports` also participates. Collect the connected components. If more than one component exists, emit one `disconnected-island` finding per component beyond the first, carrying that component's sorted net list. Choosing "beyond the first" rather than "all" keeps a well-formed network at zero findings.

- [ ] **Step 4: Run the lint tests**

Run: `bun test tests/connectivity.test.ts`
Expected: 5 pass.

Run: `bun test && bun run typecheck`
Expected: 25 pass, 0 fail; typecheck exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add lib/passives/connectivity.ts tests/connectivity.test.ts
git commit -m "Add connectivity lint for singleton nets and disconnected islands"
git push
```

---

### Task 6: AC simulation harness

Wraps the WASM SPICE engine behind a narrow interface and proves it against a network with a closed-form answer. This is the gate the plan requires before AC comparison may serve as a Pultec acceptance criterion.

**Files:**
- Create: `lib/sim/ac.ts`
- Create: `tests/sim/ac.test.ts`

**Interfaces:**
- Produces: `AcPoint`, `AcSweep`, `AcRequest`, `runAcSweep(request: AcRequest): Promise<readonly AcSweep[]>` from `lib/sim/ac.ts`. Tasks 7 and 8 consume `AcSweep`.

- [ ] **Step 1: Write the failing analytic test**

Create `tests/sim/ac.test.ts`. The expected values below were measured against this engine, not derived by hand, and the tolerance reflects observed agreement of 1.11e-16 or better.

```ts
import { test, expect } from "bun:test"
import { runAcSweep } from "../../lib/sim/ac.ts"

const RC_NETLIST = [
  "RC lowpass analytic fixture",
  "V1 in 0 AC 1",
  "R1 in out 1000",
  "C1 out 0 159.1549431n",
  ".ac dec 20 10 100k",
  ".end",
].join("\n")

const FC = 1000 // 1 / (2*pi*1000*159.1549431n)

test("matches the analytic RC response at decade and corner frequencies", async () => {
  const [sweep] = await runAcSweep({ netlist: RC_NETLIST, nodes: ["out"] })
  expect(sweep.points).toHaveLength(81)

  for (const target of [10, 1000, 100000]) {
    const point = sweep.points.find(p => Math.abs(p.frequency - target) < target * 1e-9)
    if (!point) throw new Error(`No sweep point at ${target} Hz`)
    const magnitude = Math.hypot(point.real, point.imaginary)
    const phase = (Math.atan2(point.imaginary, point.real) * 180) / Math.PI
    const analyticMagnitude = 1 / Math.hypot(1, target / FC)
    const analyticPhase = (-Math.atan(target / FC) * 180) / Math.PI
    expect(Math.abs(magnitude - analyticMagnitude)).toBeLessThan(1e-9)
    expect(Math.abs(phase - analyticPhase)).toBeLessThan(1e-6)
  }
})

test("reports a requested node that the engine did not return", async () => {
  await expect(runAcSweep({ netlist: RC_NETLIST, nodes: ["nonexistent"] }))
    .rejects.toThrow("Node not present in simulation output: nonexistent")
})

test("surfaces netlist errors instead of returning empty data", async () => {
  const broken = ["broken", "R1 in out", ".ac dec 20 10 100k", ".end"].join("\n")
  await expect(runAcSweep({ netlist: broken, nodes: ["out"] })).rejects.toThrow()
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `bun test tests/sim/ac.test.ts`
Expected: FAIL, cannot resolve `../../lib/sim/ac.ts`.

- [ ] **Step 3: Implement the wrapper**

Create `lib/sim/ac.ts`:

```ts
import { Simulation } from "eecircuit-engine"

export interface AcPoint {
  readonly frequency: number
  readonly real: number
  readonly imaginary: number
}

export interface AcSweep {
  readonly node: string
  readonly points: readonly AcPoint[]
}

export interface AcRequest {
  /** Complete SPICE deck including its .ac line and .end. */
  readonly netlist: string
  /** Node names to extract, without the v() wrapper. */
  readonly nodes: readonly string[]
}

/** Runs one AC analysis. Throws on engine error, real-valued output, or a missing node. */
export async function runAcSweep(request: AcRequest): Promise<readonly AcSweep[]> {
  const simulation = new Simulation()
  await simulation.start()
  simulation.setNetList(request.netlist)
  const result = await simulation.runSim()

  const errors = simulation.getError()
  if (errors.length > 0) throw new Error(`Simulation error: ${errors.join("; ")}`)
  if (result.dataType !== "complex") {
    throw new Error(`Expected complex AC data, received ${result.dataType}. Check the .ac line.`)
  }

  const frequency = result.data.find(d => d.name.toLowerCase() === "frequency")
  if (!frequency) throw new Error("Simulation output contains no frequency vector")

  return request.nodes.map(node => {
    const wanted = `v(${node.toLowerCase()})`
    const vector = result.data.find(d => d.name.toLowerCase() === wanted)
    if (!vector) throw new Error(`Node not present in simulation output: ${node}`)
    return {
      node,
      points: vector.values.map((value, index) => ({
        frequency: frequency.values[index].real,
        real: value.real,
        imaginary: value.img,
      })),
    }
  })
}
```

Two engine behaviors to expect and not chase: the engine writes `Note: v1: has no value, DC 0 assumed` to the console for an AC-only source, which is harmless; and variable names come back lowercased as `frequency`, `v(in)`, `v(out)`, `i(v1)`, which is why the lookups lowercase both sides.

- [ ] **Step 4: Run the AC tests**

Run: `bun test tests/sim/ac.test.ts`
Expected: 3 pass. First run is slower while the WASM module initializes.

- [ ] **Step 5: Record the engine in the plan's verification section**

Append to the "Verification record and reproduction" section of `docs/pultec/implementation-plan.md` a line naming the engine, its version, and this fixture, so step 0's simulation gate has its evidence recorded where the plan expects it. State plainly that this validates the harness and not any Pultec circuit.

- [ ] **Step 6: Commit and push**

```bash
git add lib/sim/ac.ts tests/sim/ac.test.ts docs/pultec/implementation-plan.md
git commit -m "Add AC sweep harness validated against an analytic RC response"
git push
```

---

### Task 7: SPICE netlist emitter

Turns a resolved network plus a declared environment into a deck the harness can run. The source and load models are explicit inputs, never defaults, because the plan requires them recorded alongside every response set.

**Files:**
- Create: `lib/sim/netlist.ts`
- Create: `tests/sim/netlist.test.ts`

**Interfaces:**
- Consumes: `ResolvedNetwork` from `control-state.ts`; `runAcSweep` from `ac.ts` for the round-trip test.
- Produces: `SourceModel`, `LoadModel`, `SweepModel`, `SimulationEnvironment`, `toSpiceNetlist(network: ResolvedNetwork, environment: SimulationEnvironment): string`.

- [ ] **Step 1: Write the failing round-trip test**

Create `tests/sim/netlist.test.ts`. Building the same RC network as a `ResolvedNetwork` and reproducing Task 6's measured result is what proves the emitter, so the assertion reuses the analytic comparison rather than string-matching the deck.

```ts
import { test, expect } from "bun:test"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import type { ResolvedNetwork } from "../../lib/passives/control-state.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"

const rc: ResolvedNetwork = {
  ports: { input: "in", output: "out", ground: "0" },
  elements: [
    { ref: "R1", kind: "resistor", pins: { a: "in", b: "out" }, parameters: { ohms: 1000 } },
    { ref: "C1", kind: "capacitor", pins: { a: "out", b: "0" }, parameters: { farads: 159.1549431e-9 } },
  ],
}

const environment: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100000 },
  groundPort: "ground",
}

test("emits a deck that reproduces the analytic RC response", async () => {
  const [sweep] = await runAcSweep({ netlist: toSpiceNetlist(rc, environment), nodes: ["out"] })
  const corner = sweep.points.find(p => Math.abs(p.frequency - 1000) < 1e-6)
  if (!corner) throw new Error("No sweep point at 1 kHz")
  expect(Math.hypot(corner.real, corner.imaginary)).toBeCloseTo(0.707107, 5)
})

test("maps the declared ground port to SPICE node 0", () => {
  expect(toSpiceNetlist(rc, environment)).toContain("C1 out 0 ")
})

test("refuses a network whose ground port is not declared", () => {
  expect(() => toSpiceNetlist(rc, { ...environment, groundPort: "chassis" }))
    .toThrow("Ground port not present in network: chassis")
})

test("refuses a source or load port that the network does not expose", () => {
  expect(() => toSpiceNetlist(rc, { ...environment, load: { port: "sidechain", ohms: 1e12 } }))
    .toThrow("Load port not present in network: sidechain")
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `bun test tests/sim/netlist.test.ts`
Expected: FAIL, cannot resolve `../../lib/sim/netlist.ts`.

- [ ] **Step 3: Implement the emitter**

Create `lib/sim/netlist.ts`:

```ts
import type { ResolvedNetwork } from "../passives/control-state.ts"

export interface SourceModel {
  /** Port name in the network's ports map. */
  readonly port: string
  readonly amplitude: number
  readonly seriesOhms: number
}

export interface LoadModel {
  readonly port: string
  readonly ohms: number
  readonly farads?: number
}

export interface SweepModel {
  readonly pointsPerDecade: number
  readonly startHz: number
  readonly stopHz: number
}

export interface SimulationEnvironment {
  readonly source: SourceModel
  readonly load: LoadModel
  readonly sweep: SweepModel
  /** Port name carrying the reference node; becomes SPICE node 0. */
  readonly groundPort: string
}

const PREFIX: Readonly<Record<string, string>> = { resistor: "R", capacitor: "C", inductor: "L" }
```

The body emits, in order: a title line; the source, as `V<n> <srcnode> 0 AC <amplitude>` plus a series resistor when `seriesOhms` is non-zero; one line per element as `` `${PREFIX[kind]}${sanitize(ref)} ${netA} ${netB} ${value}` ``; the load resistor and optional capacitor at the load node; the `.ac dec <pointsPerDecade> <startHz> <stopHz>` line; and `.end`.

Rules the tests pin:

- Resolve `groundPort`, `source.port`, and `load.port` through `network.ports` and throw `Ground port not present in network: <name>`, `Source port not present in network: <name>`, or `Load port not present in network: <name>` when absent.
- Every net equal to the ground net emits as `0`.
- `sanitize` replaces any character outside `[A-Za-z0-9]` with `_`, so a resolved pot section named `P1.ccw-wiper` becomes `RP1_ccw_wiper`. Throw if two distinct refs sanitize to the same name.
- An element whose `pins` record does not hold exactly two entries throws, naming the ref. Multi-terminal elements must have been expanded by the resolver.
- Values emit with `toExponential(12)` so no precision is lost through the deck.

- [ ] **Step 4: Run the emitter tests**

Run: `bun test tests/sim/netlist.test.ts`
Expected: 4 pass.

Run: `bun test && bun run typecheck`
Expected: 32 pass, 0 fail; typecheck exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add lib/sim/netlist.ts tests/sim/netlist.test.ts
git commit -m "Emit SPICE decks from resolved networks with explicit source and load models"
git push
```

---

### Task 8: Response comparison with declared tolerances

The acceptance primitive for every later unsplit-versus-composed comparison. Tolerances are inputs, recorded before a result is judged.

**Files:**
- Create: `lib/sim/compare.ts`
- Create: `tests/sim/compare.test.ts`

**Interfaces:**
- Consumes: `AcSweep` from `ac.ts`.
- Produces: `Tolerance`, `ResponseDeviation`, `compareResponses(reference: AcSweep, candidate: AcSweep, tolerance: Tolerance): readonly ResponseDeviation[]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sim/compare.test.ts`:

```ts
import { test, expect } from "bun:test"
import { compareResponses } from "../../lib/sim/compare.ts"
import type { AcSweep } from "../../lib/sim/ac.ts"

const base: AcSweep = {
  node: "out",
  points: [
    { frequency: 100, real: 0.9, imaginary: -0.1 },
    { frequency: 1000, real: 0.5, imaginary: -0.5 },
  ],
}

const tolerance = { magnitudeDb: 0.01, phaseDegrees: 0.1 }

test("identical sweeps produce no deviations", () => {
  expect(compareResponses(base, base, tolerance)).toEqual([])
})

test("a uniform 10 percent gain error is reported in dB at every point", () => {
  const scaled: AcSweep = {
    node: "out",
    points: base.points.map(p => ({ ...p, real: p.real * 1.1, imaginary: p.imaginary * 1.1 })),
  }
  const deviations = compareResponses(base, scaled, tolerance)
  expect(deviations).toHaveLength(2)
  expect(deviations[0].magnitudeDb).toBeCloseTo(20 * Math.log10(1.1), 9)
  expect(deviations[0].phaseDegrees).toBeCloseTo(0, 9)
})

test("phase deviation is wrapped to the shortest angle", () => {
  const flipped: AcSweep = {
    node: "out",
    points: [base.points[0], { frequency: 1000, real: 0.5, imaginary: 0.5 }],
  }
  const deviations = compareResponses(base, flipped, tolerance)
  expect(deviations).toHaveLength(1)
  expect(Math.abs(deviations[0].phaseDegrees)).toBeCloseTo(90, 9)
})

test("a mismatched frequency grid throws rather than interpolating", () => {
  const shifted: AcSweep = {
    node: "out",
    points: base.points.map(p => ({ ...p, frequency: p.frequency * 1.01 })),
  }
  expect(() => compareResponses(base, shifted, tolerance)).toThrow("Frequency grids differ")
})
```

The last test encodes a deliberate choice: silently interpolating onto a common grid would be a fallback, and would let a genuine sweep-configuration mismatch pass as agreement.

- [ ] **Step 2: Run to confirm failure**

Run: `bun test tests/sim/compare.test.ts`
Expected: FAIL, cannot resolve `../../lib/sim/compare.ts`.

- [ ] **Step 3: Implement the comparison**

Create `lib/sim/compare.ts`:

```ts
import type { AcSweep } from "./ac.ts"

export interface Tolerance {
  readonly magnitudeDb: number
  readonly phaseDegrees: number
}

export interface ResponseDeviation {
  readonly frequency: number
  readonly magnitudeDb: number
  readonly phaseDegrees: number
}

function wrapDegrees(degrees: number): number {
  return ((degrees + 180) % 360 + 360) % 360 - 180
}

/** Returns one entry per frequency exceeding either tolerance. Empty means agreement. */
export function compareResponses(
  reference: AcSweep,
  candidate: AcSweep,
  tolerance: Tolerance,
): readonly ResponseDeviation[] {
  if (reference.points.length !== candidate.points.length) {
    throw new Error(`Frequency grids differ: ${reference.points.length} vs ${candidate.points.length} points`)
  }
  const deviations: ResponseDeviation[] = []
  for (const [index, referencePoint] of reference.points.entries()) {
    const candidatePoint = candidate.points[index]
    if (Math.abs(candidatePoint.frequency - referencePoint.frequency) > referencePoint.frequency * 1e-9) {
      throw new Error(`Frequency grids differ at index ${index}: ${referencePoint.frequency} vs ${candidatePoint.frequency}`)
    }
    const referenceMagnitude = Math.hypot(referencePoint.real, referencePoint.imaginary)
    const candidateMagnitude = Math.hypot(candidatePoint.real, candidatePoint.imaginary)
    if (referenceMagnitude === 0 || candidateMagnitude === 0) {
      throw new Error(`Zero magnitude at ${referencePoint.frequency} Hz cannot be compared in dB`)
    }
    const magnitudeDb = 20 * Math.log10(candidateMagnitude / referenceMagnitude)
    const phaseDegrees = wrapDegrees(
      ((Math.atan2(candidatePoint.imaginary, candidatePoint.real) -
        Math.atan2(referencePoint.imaginary, referencePoint.real)) * 180) / Math.PI,
    )
    if (Math.abs(magnitudeDb) > tolerance.magnitudeDb || Math.abs(phaseDegrees) > tolerance.phaseDegrees) {
      deviations.push({ frequency: referencePoint.frequency, magnitudeDb, phaseDegrees })
    }
  }
  return deviations
}
```

- [ ] **Step 4: Run the comparison tests**

Run: `bun test tests/sim/compare.test.ts`
Expected: 4 pass.

Run: `bun test && bun run typecheck`
Expected: 36 pass, 0 fail; typecheck exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add lib/sim/compare.ts tests/sim/compare.test.ts
git commit -m "Compare AC responses against declared magnitude and phase tolerances"
git push
```

---

### Task 9: Circuit JSON to canonical network

The export adapter spike. Reads what tscircuit actually emits and flattens it to canonical labelled connectivity, so a composed board can later be checked against an independent reference.

**Files:**
- Create: `lib/export/circuit-json.ts`
- Create: `tests/export/fixtures/two-module.tsx`
- Create: `tests/export/circuit-json.test.ts`

**Interfaces:**
- Consumes: `PassiveNetwork` from `topology.ts`, `parseValue` from `units.ts`.
- Produces: `ExportMapping`, `toLabelledNetwork(circuitJson: readonly AnyCircuitElement[], mapping: ExportMapping): PassiveNetwork`.

Run every command in this task from the repository root. Bun resolves `react/jsx-dev-runtime` relative to the importing file, and a `.tsx` file outside the project resolves it from the global module cache and fails.

- [ ] **Step 1: Create the two-module fixture**

Create `tests/export/fixtures/two-module.tsx`. Component names carry their module prefix explicitly, following the repository's module convention, because the emitted `source_component.name` does not include the enclosing group's name.

```tsx
import { RootCircuit } from "@tscircuit/core"

/** Renders a two-module passive fixture and returns its circuit JSON. */
export function renderTwoModule(miswire: boolean = false) {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="LF_R1" resistance="1k" footprint="0402" schX={0} schY={0} />
      <capacitor name="LF_C1" capacitance="100nF" footprint="0402" schX={1} schY={0} />
      <inductor name="HF_L1" inductance="100mH" footprint="0402" schX={3} schY={0} />
      <net name="MID" />
      <net name="GND" />
      <trace from=".LF_R1 > .pin2" to="net.MID" />
      <trace from=".LF_C1 > .pin1" to={miswire ? "net.GND" : "net.MID"} />
      <trace from=".HF_L1 > .pin1" to="net.MID" />
      <trace from=".LF_C1 > .pin2" to="net.GND" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}
```

- [ ] **Step 2: Write the failing adapter test**

Create `tests/export/circuit-json.test.ts`:

```ts
import { test, expect } from "bun:test"
import { renderTwoModule } from "./fixtures/two-module.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"
import type { PassiveNetwork } from "../../lib/passives/topology.ts"

const mapping: ExportMapping = {
  componentNames: { LF_R1: "R1", LF_C1: "C1", HF_L1: "L1" },
  netNames: { MID: "mid", GND: "0" },
  ports: { output: "mid", ground: "0" },
}

const expected: PassiveNetwork = {
  ports: { output: "mid", ground: "0" },
  elements: [
    { ref: "C1", kind: "capacitor", pins: { pin1: "mid", pin2: "0" }, parameters: { farads: 1e-7 } },
    { ref: "L1", kind: "inductor", pins: { pin1: "mid", pin2: "HF_L1.pin2" }, parameters: { henries: 0.1 } },
    { ref: "R1", kind: "resistor", pins: { pin1: "LF_R1.pin1", pin2: "mid" }, parameters: { ohms: 1000 } },
  ],
}

test("flattens emitted connectivity to canonical reference names", () => {
  assertSameTopology(expected, toLabelledNetwork(renderTwoModule(), mapping))
})

test("normalizes inductance, which tscircuit emits as an unparsed string", () => {
  const network = toLabelledNetwork(renderTwoModule(), mapping)
  const inductor = network.elements.find(e => e.ref === "L1")
  if (inductor?.kind !== "inductor") throw new Error("L1 missing from export")
  expect(inductor.parameters.henries).toBeCloseTo(0.1, 12)
})

test("refuses a component with no canonical mapping", () => {
  expect(() => toLabelledNetwork(renderTwoModule(), { ...mapping, componentNames: { LF_R1: "R1" } }))
    .toThrow("Unmapped component: LF_C1")
})
```

**Rule change, recorded after delivery.** The plan specified that unconnected pins keep a derived net name of `` `${emittedName}.${pin}` ``, which is what the `HF_L1.pin2` and `LF_R1.pin1` entries above record, on the reasoning that it keeps them distinct and visible to the connectivity lint rather than silently merged. The delivered adapter does not do this. It rejects dangling pins outright, throwing `` `Dangling pins: <sorted list>` `` for any `source_pin_missing_trace_warning` the renderer emitted, and the fixture was changed to connect every pin so it does not trip that rejection.

Rejecting is the better rule under this plan's own no-fallbacks constraint: a derived name is a fabricated net that appears nowhere in the labelled model, and it makes an incomplete export look like a complete one that merely lints badly. Downgrading a missing connection to a lint finding puts the decision in a diagnostic pass that never throws, which is exactly the silent-degradation class the constraint exists to prevent. The adapter has no fallback net names at all: an unnamed net group also throws rather than deriving a name, and so does a group containing two different named nets.

The corresponding change to the `expected` fixture above is that no `HF_L1.pin2`/`LF_R1.pin1` derived entries exist — those pins land on the named `OUT`/`IN` nets instead. Pin keys also changed: see the pinNames rule change below.

**Second rule change: canonical pin keys.** `ExportMapping` gained `pinNames`, mapping each emitted port name to a canonical pin key. The plan's `expected` fixture above shows pins keyed `pin1`/`pin2` — tscircuit's own port names, passed through. That shape is not resolvable: `requireTwoPin` in `lib/passives/control-state.ts` requires exactly `{a, b}`, so the export output could not reach the resolver or the SPICE emitter. The delivered adapter rekeys through `mapping.pinNames` (typically `{ pin1: "a", pin2: "b" }`) and throws `` `Unmapped pin: <component>.<port>` `` when a port has no entry, rather than passing the raw name through.

- [ ] **Step 3: Run to confirm failure**

Run: `bun test tests/export/circuit-json.test.ts`
Expected: FAIL, cannot resolve `../../lib/export/circuit-json.ts`.

- [ ] **Step 4: Implement the adapter**

Create `lib/export/circuit-json.ts`. The input type is `AnyCircuitElement[]` from `circuit-json`, which is already a dependency, so no `any` is needed.

```ts
import type { AnyCircuitElement } from "circuit-json"
import { parseValue } from "../passives/units.ts"
import type { PassiveElement, PassiveNetwork } from "../passives/topology.ts"

export interface ExportMapping {
  /** Emitted component name to canonical reference. Every component must appear. */
  readonly componentNames: Readonly<Record<string, string>>
  /** Emitted net name to canonical net. */
  readonly netNames: Readonly<Record<string, string>>
  /** Canonical port name to canonical net. */
  readonly ports: Readonly<Record<string, string>>
}

const FTYPE_KIND: Readonly<Record<string, "resistor" | "capacitor" | "inductor">> = {
  simple_resistor: "resistor",
  simple_capacitor: "capacitor",
  simple_inductor: "inductor",
}
```

The body runs five passes:

1. **Reject dangling pins.** If any element has `type === "source_pin_missing_trace_warning"`, throw naming the pins. The renderer already detects this and it must not pass silently.
2. **Index components and ports.** Collect `source_component` records by `source_component_id`, and `source_port` records by `source_port_id`, each carrying its `name` and owning component.
3. **Union-find over traces.** For each `source_trace`, union all ids in `connected_source_port_ids` together with all ids in `connected_source_net_ids`. Ports and nets share one id space in this structure.
4. **Name each group.** If a group contains a `source_net` id whose record has a `name`, that name resolves through `mapping.netNames` — throwing `Unmapped net: <name>` if absent. The plan said a group with no named net takes the derived name `` `${componentName}.${portName}` `` of its lowest-sorted port; as delivered it throws `Unnamed net group: <ports>` instead, for the no-fallbacks reason recorded above. A group holding two DIFFERENT named nets throws `Conflicting nets in group: <names>` rather than picking one.
5. **Build elements.** For each `source_component`, resolve its canonical ref through `mapping.componentNames`, throwing `Unmapped component: <name>` when absent, and its kind through `FTYPE_KIND`, throwing on an unsupported `ftype`. Read `resistance`, `capacitance`, or `inductance` and pass it through `parseValue` when it is a string, or use it directly when it is a number. Build `pins` from the component's ports, each mapped to its group's canonical net.

Return `{ ports: mapping.ports, elements }` with elements sorted by ref.

- [ ] **Step 5: Run the adapter tests**

Run: `bun test tests/export/circuit-json.test.ts`
Expected: 0 fail. Allow extra time on the first run; rendering initializes tscircuit's solvers. The plan expected 3; the delivered file carries more, including the rejection tests for the two rule changes recorded above and the end-to-end export → resolve → netlist chain.

- [ ] **Step 6: Commit and push**

```bash
git add lib/export/circuit-json.ts tests/export/fixtures/two-module.tsx tests/export/circuit-json.test.ts
git commit -m "Flatten tscircuit circuit JSON to canonical labelled connectivity"
git push
```

---

### Task 10: Miswire negative test and comparison diagnostics

Proves the export check has teeth. A comparison that never fails is not a gate. This task also replaces the opaque comparison error with one that names the first differing reference, so a failure is actionable.

**Files:**
- Modify: `lib/passives/topology.ts`
- Modify: `tests/export/circuit-json.test.ts`
- Modify: `tests/topology.test.ts`

**Interfaces:**
- `assertSameTopology` keeps its signature. Only its thrown message changes.

- [ ] **Step 1: Write the failing miswire test**

Append to `tests/export/circuit-json.test.ts`:

```ts
test("a single miswired trace fails the comparison and names the component", () => {
  const miswired = toLabelledNetwork(renderTwoModule(true), mapping)
  expect(() => assertSameTopology(expected, miswired)).toThrow("C1")
})
```

The fixture's `miswire` flag moves `LF_C1.pin1` from `MID` to `GND`, which is exactly the class of error — one trace on one component — that a transcription or layout slip produces.

- [ ] **Step 2: Run to confirm it fails for the right reason**

Run: `bun test tests/export/circuit-json.test.ts`
Expected: FAIL. The comparison does throw, but with `Passive topology differs from reference`, which does not contain `C1`.

- [ ] **Step 3: Report the first differing reference**

In `lib/passives/topology.ts`, replace the single-line equality check in `assertSameTopology`. Compare per element so the message can name what moved:

```ts
  const referenceSignature = signature(reference)
  const candidateSignature = signature(candidate)
  if (referenceSignature === candidateSignature) return

  const referenceByRef = new Map(reference.elements.map(e => [e.ref, JSON.stringify(canonicalize({ kind: e.kind, pins: e.pins, parameters: e.parameters }))]))
  const candidateByRef = new Map(candidate.elements.map(e => [e.ref, JSON.stringify(canonicalize({ kind: e.kind, pins: e.pins, parameters: e.parameters }))]))
  for (const ref of [...referenceByRef.keys()].sort((a, b) => a.localeCompare(b))) {
    const candidateEntry = candidateByRef.get(ref)
    if (candidateEntry === undefined) throw new Error(`Passive topology differs from reference: ${ref} is missing`)
    if (candidateEntry !== referenceByRef.get(ref)) {
      throw new Error(`Passive topology differs from reference: ${ref} differs\n  reference: ${referenceByRef.get(ref)}\n  candidate: ${candidateEntry}`)
    }
  }
  for (const ref of candidateByRef.keys()) {
    if (!referenceByRef.has(ref)) throw new Error(`Passive topology differs from reference: ${ref} is unexpected`)
  }
  throw new Error(`Passive topology differs from reference: external ports differ`)
```

The final throw is reached when every element matches but `ports` does not, which is the existing swapped-ports test.

- [ ] **Step 4: Confirm the existing rejection tests still hold**

The seven mutation tests in `tests/topology.test.ts` assert `toThrow()` with no message, so they remain valid. Strengthen two of them to pin the new diagnostics:

```ts
test("names the component that was rewired", () => {
  const candidate: MutablePassiveNetwork = structuredClone(reference)
  candidate.elements[0].pins.b = "0"
  expect(() => assertSameTopology(reference, candidate)).toThrow("R1 differs")
})

test("names a missing component", () => {
  const candidate: MutablePassiveNetwork = structuredClone(reference)
  candidate.elements.pop()
  expect(() => assertSameTopology(reference, candidate)).toThrow("P1 is missing")
})
```

- [ ] **Step 5: Run everything**

Run: `bun test`
Expected: 0 fail. The plan's original figure of 42 was the arithmetic of the ten
tasks as planned (see "Test count arithmetic" below); the delivered suite is
larger, because the per-task reviews and the final whole-branch review each added
coverage the plan did not anticipate. The figure to trust is the one `bun test`
prints, which at the close of this plan is 64 across 9 files. Treat it as a guard
against silently deleting or merging tests, never as a ceiling.

Run: `bun run typecheck && git diff --check`
Expected: both exit 0.

- [ ] **Step 6: Record step 0 completion evidence**

Update the "Verification record and reproduction" section of `docs/pultec/implementation-plan.md` with the export round-trip and its failing miswire case, and mark step 0's four completion-evidence items. State that these validate tooling only and that no Pultec circuit has been transcribed, simulated, or partitioned.

- [ ] **Step 7: Commit and push**

```bash
git add lib/passives/topology.ts tests/export/circuit-json.test.ts tests/topology.test.ts docs/pultec/implementation-plan.md
git commit -m "Name the differing reference on comparison failure and prove the miswire gate"
git push
```

---

## What this plan does not cover

These remain outlined in [implementation-plan.md](implementation-plan.md). Each entry states the condition that must hold before concrete tasks can be written, because writing them now would mean inventing Pultec component data.

| Work | Entry criterion |
| --- | --- |
| Step 1, reference transcription | A named candidate source with a recorded retrieval and digest. Tasks become writable once the netlist and unresolved-items list exist, because the fixtures are then real data rather than placeholders. |
| Step 2b, unsplit model and AC validation | Step 1's candidate netlist, expressed through the Task 2 and Task 3 contracts, plus the Task 6 through 8 harness. No new tooling is required. |
| Step 3, physical partition | Step 2b. The ownership map uses the Task 4 allowed-owner check with `["lf", "hf"]` supplied at the Pultec boundary. |
| Step 4, tscircuit modules | Step 3, plus the Task 9 adapter scaled from the two-module fixture to the real module prefixes and connector conductors. |
| Steps 5 and 6 | Deferred in the plan; unchanged here. |

Two review findings apply to the outline rather than to this plan's tasks, and are recorded here so they are not lost:

- Step 2 in the plan still bundles the representation contract with reference-dependent AC validation. Tasks 2 and 3 extract the contract half, so what remains of step 2 is purely the modeling half. The plan's step 2 text should be narrowed to match, or step 3 stays transitively blocked on validation it does not need.
- The completion evidence for steps 3 through 6 does not restate that results inherit candidate status until step 1's final gate passes. One clause in each would close it.

## Self-review

**Spec coverage.** Step 0's three named exercises map to tasks: simulation feasibility to Task 6, export feasibility to Tasks 9 and 10, groundwork hardening to Tasks 1, 4, and 5. The tsconfig instruction is in Task 1, and follows the plan's direction to drop `outDir` and `sourceMap` while keeping `rootDir`; `moduleResolution` is an addition the plan did not anticipate, and Task 1 verifies it changes nothing else. The step 2 representation bullets map to Tasks 2 and 3. The plan's requirement that step 0's lint use resolved control states is satisfied by ordering Task 3 before Task 5, which is this plan's answer to review finding B.

**Placeholder scan.** Every test body is written out. Three implementation bodies — the resolver in Task 3, the lint in Task 5, and the adapter in Task 9 — are specified as ordered passes with exact error strings and exact type signatures rather than full listings, because each exceeds what belongs in a plan document; their public interfaces, error messages, and behavior are pinned by the tests above them.

**Type consistency.** `ResolvedNetwork` is produced in Task 3 and consumed unchanged in Tasks 5, 7, and 8. `AcSweep` is produced in Task 6 and consumed in Tasks 7 and 8. `PassiveNetwork` is redefined once, in Task 2, before any other task depends on its shape — no task types a fixture against a shape a later task changes. `parseValue` is defined in Task 2 and used in Task 9. `assertSameTopology` keeps its signature throughout; only its message changes, in Task 10.

**Test count arithmetic.** 9 existing, plus 3 in Task 2, 5 in Task 3, 3 in Task 4, 5 in Task 5, 3 in Task 6, 4 in Task 7, 4 in Task 8, 3 in Task 9, 3 in Task 10 — 42 as planned. That was the plan's projection, not the delivered figure: the per-task reviews and the final whole-branch review added coverage beyond it, and the suite stands at 64 across 9 files at the close of this plan. Measure, do not assume; the planned figure is a lower bound on what the tasks owed, not a target to trim back to.
