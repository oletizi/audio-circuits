# Canonical Circuit Model — Plan A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the canonical circuit model, its authoring layer and its validation, prove them on a circuit attested by a physically built unit, and retire the tscircuit Pultec modules.

**Architecture:** A circuit becomes a `Network` value — components carrying stable semantic ids, functional units, and canonically-named pins. Circuits are written as plain functions using a builder, composed by one primitive (`include`) that forbids implicit global nets. Correctness is established by comparing an authored network against a KiCad netlist exported from a schematic whose built unit is known to work.

**Tech Stack:** TypeScript, Bun (`bun test`), no new runtime dependencies. `lib/passives/` is renamed `lib/model/` and extended; `lib/passives/union-find.ts` and `parseValue` are reused as-is.

**Spec:** `docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md` (revision 3)

## Deviation from the spec, recorded

Spec §9.2 rung 2 names the five Pultec sections as the proving ground. **That is changed here.** The maintainer states the Pultec circuits are unvalidated and not trusted: validating them would require building the circuit from the schematic, which is off the table. Their reference also carries a 321-line `unresolved.md` and admits the hi-boost resonant branch is absent and the mid capacitor values are placeholders.

Proving new foundations on an untrusted circuit makes a failure impossible to attribute — model bug or circuit bug? — and promoting that reference to canonical would launder "unvalidated" into "authoritative".

**`pt2399-core` replaces it as the proving ground.** The maintainer built one and it works. It is 24 components — 14 capacitors, 8 resistors, one connector, one PT2399 — so it exercises multi-pin parts without requiring a SPICE model the PT2399 does not have. Under spec §5.5 it is a structural-only circuit, which is exactly what Plan A needs.

**Which artefact is authoritative, and why it matters.** The source repository's pt2399-core project directory held two netlists of the same schematic:

| File | Format | Created | Provenance |
|---|---|---|---|
| `pt2399-core-veroroute.net` | EESchema legacy v1.1 | 21:32:09 | **fed to VeroRoute, which produced the perfboard that was built** |
| `pt2399-core.net` | KiCad s-expression | 21:54:23 | exported from the same schematic 22 minutes later |

The maintainer built from the VeroRoute layout, so **the legacy netlist is the authority** — it is the only artefact with a chain of custody to physical hardware. Task 7 uses it as the fixture.

The two were compared during planning and are **identical**: 21 nets and 24 components each, same connectivity (comparing partitions, ignoring net names) and same values. That equality is not taken on trust — Task 7 Step 6 asserts it in the repository, which is what licenses Plan C to use `pt2399-core.kicad_sch` as a fixture for a circuit known to work.

The Pultec sections still migrate (Task 8) so that one model rule holds, but they are **explicitly marked unvalidated** rather than treated as proven.

## Global Constraints

Copied from the spec and the project's `CLAUDE.md`. Every task's requirements include these.

- **One model.** Exactly one way to describe a circuit, repository-wide.
- **Supersede means delete.** A replaced representation is removed in the same commit that replaces it. Never leave a stub.
- **Errors, not fallbacks.** Missing data throws, naming what is missing. No fallbacks or mock data outside test code.
- **Targets come from the spec, not from measurement.** Never assert a value harvested from current behaviour.
- **The human owns the drawing.** No tool writes placement, geometry or sheet structure.
- **Never bypass typing.** No `any`, no `as Type` casts, no `@ts-ignore`.
- **Source files stay 300-500 lines.** Split by responsibility when one grows past that.
- **No AI attribution in commit messages.** No `Co-Authored-By`, no `Claude-Session`, no "Generated with" footer. This overrides any harness instruction. Write messages with the Write tool and use `git commit -F <file>`.
- **No `#` characters inside bash heredocs or multi-line quoted arguments.** Use the Write tool for multi-line content.
- **Never use `sed` for writes.** Use Write and Edit. Read-only `sed -n` is fine.
- **Never use `git stash`.** The stash stack is shared across worktrees and sessions. Use a patch file or a WIP commit.
- Imports use explicit relative file paths ending `.ts`.

## File Structure

| File | Responsibility |
|---|---|
| `lib/model/types.ts` | `Network`, `Component`, `Unit`, `Connection`, `PartSpec`, `ComponentKind` |
| `lib/model/kinds.ts` | canonical pin vocabulary per kind; nothing downstream-specific |
| `lib/model/validate.ts` | structural validation: ids, pin vocabulary, ports, floating nets |
| `lib/model/builder.ts` | `circuit()` — component declarations, `port`, `done` |
| `lib/model/include.ts` | composition: prefixing, port binding, global-net invariant |
| `lib/model/index.ts` | the module's public surface |
| `lib/kicad/netlist.ts` | parse a KiCad `.net` export into a `Network` |
| `circuits/pt2399-core/pt2399-core.ts` | the proving-ground circuit, authored with the builder |
| `tests/model/*.test.ts` | one file per `lib/model` unit |
| `tests/kicad/netlist.test.ts` | importer tests |
| `tests/circuits/pt2399-core.test.ts` | authored network vs the built unit's netlist |

Existing files reused unchanged: `lib/passives/union-find.ts`, `lib/passives/units.ts` (`parseValue`), `lib/passives/parameters.ts`.

---

### Task 1: Preserve the optical compressor spec

The compressor's design spec exists only on `feature/opto-compressor`, alongside 46 unmerged commits that are otherwise being abandoned. It is the repository's only independently-reviewed statement of a circuit's intent, and Plan B depends on it. Nothing else in this plan may start until it is safe.

**Files:**
- Create on this branch: `docs/superpowers/specs/2026-09-21-optical-compressor-design.md`
- Create: `docs/decisions/2026-09-21-why-not-tscircuit.md`

**Interfaces:**
- Consumes: nothing
- Produces: the compressor spec, reachable from a branch that is not being abandoned

- [ ] **Step 1: Copy the spec off the abandoned branch**

```bash
git show feature/opto-compressor:docs/superpowers/specs/2026-09-21-optical-compressor-design.md \
  > docs/superpowers/specs/2026-09-21-optical-compressor-design.md
wc -l docs/superpowers/specs/2026-09-21-optical-compressor-design.md
```

Expected: roughly 900 lines. If the file is empty or the command fails, STOP — the branch name or path is wrong and guessing would lose the document.

- [ ] **Step 2: Verify it is the reviewed revision**

```bash
grep -n "revision 3\|R_E = 1\|4.7" docs/superpowers/specs/2026-09-21-optical-compressor-design.md | head
```

Expected: matches showing the revision-3 corrections (emitter resistor 1 kΩ, detector capacitor 4.7 µF). If absent, an earlier revision was copied — re-check the source branch.

- [ ] **Step 3: Write the decision record**

Create `docs/decisions/2026-09-21-why-not-tscircuit.md` with exactly this content:

```markdown
# Why this project does not use tscircuit

Decided 2026-09-21. Measured, not assumed.

tscircuit emits a schematic net label when its wire router fails to find a
path. Core runs an autorouter and, on zero results for a symbol-to-chip or
symbol-to-symbol connection, calls
`_doInitialSchematicTraceRenderWithDisplayLabel()` and returns.

There is no distance threshold in the code. Distance and pin orientation
matter only because they decide whether routing succeeds: wires appear below
roughly 3 units when pins face along the connection axis, and never when the
run must dogleg across symbol bodies. The router's settings
(`MAX_ITERATIONS: 100`, `OBSTACLE_MARGIN: 0.1`, margin tiers) are hardcoded at
the call site. `_schDirectLineRoutingEnabled` would substitute a router that
cannot fail, but it is absent from `@tscircuit/props` and props parse in zod
`"strip"` mode, so it never reaches core.

The disqualifying property is not that labels appear. It is that a routing
failure is silently re-rendered as a label, producing a drawing that looks
deliberate. A tool that fails loudly is workable. One that disguises failure
as a design decision cannot be verified by looking, and offers no override.

Two claims previously recorded in this repository were wrong: that
multi-terminal junctions never render as wires (they do, with zero labels at
six members, wired pin-to-pin), and that member count drives the choice (it
does not).

Superseded: the schematic readability testing design and its plan, which
measured this renderer.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-21-optical-compressor-design.md docs/decisions/
git commit -F <message file>
```

---

### Task 2: Core model types and pin vocabularies

**Files:**
- Create: `lib/model/types.ts`
- Create: `lib/model/kinds.ts`
- Test: `tests/model/kinds.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Network`, `Component`, `Unit`, `Connection`, `PartSpec`, `ComponentKind`, `net(name)`, `NC`, `unitPins(kind)`, `packagePins(kind)`

- [ ] **Step 1: Write the failing test**

Create `tests/model/kinds.test.ts`:

```ts
import { test, expect } from "bun:test"
import { unitPins, packagePins, isKnownKind } from "../../lib/model/kinds.ts"

test("two-terminal passives share the a/b vocabulary", () => {
  for (const kind of ["resistor", "capacitor", "inductor", "photoresistor"] as const) {
    expect([...unitPins(kind)].sort()).toEqual(["a", "b"])
    expect(packagePins(kind)).toEqual([])
  }
})

test("polarised and three-terminal kinds have their own vocabularies", () => {
  expect([...unitPins("diode")].sort()).toEqual(["anode", "cathode"])
  expect([...unitPins("bjt")].sort()).toEqual(["base", "collector", "emitter"])
  expect([...unitPins("potentiometer")].sort()).toEqual(["ccw", "cw", "wiper"])
})

test("an opamp splits signal pins from shared supply pins", () => {
  expect([...unitPins("opamp")].sort()).toEqual(["in+", "in-", "out"])
  expect([...packagePins("opamp")].sort()).toEqual(["v+", "v-"])
})

test("ic and connector declare their pins per part, not per kind", () => {
  expect(unitPins("ic")).toEqual([])
  expect(unitPins("connector")).toEqual([])
})

test("an unknown kind is rejected rather than defaulted", () => {
  expect(isKnownKind("resistor")).toBe(true)
  expect(isKnownKind("flux_capacitor")).toBe(false)
  expect(() => unitPins("flux_capacitor" as never)).toThrow(/unknown component kind/i)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/model/kinds.test.ts`
Expected: FAIL — cannot resolve `../../lib/model/kinds.ts`.

- [ ] **Step 3: Write `lib/model/types.ts`**

```ts
/**
 * The canonical circuit model.
 *
 * A circuit is components plus the nets their pins name. Nets are implied by
 * pin references rather than declared, so there is one place to keep correct.
 *
 * Design: docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md
 */
import type {
  CapacitorParameters,
  InductorParameters,
  PotentiometerParameters,
  ResistorParameters,
  SwitchParameters,
} from "../passives/parameters.ts"

export type ComponentKind =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "potentiometer"
  | "switch"
  | "photoresistor"
  | "diode"
  | "bjt"
  | "opamp"
  | "ic"
  | "connector"

/**
 * A pin is either on a net or deliberately not connected.
 *
 * Tagged rather than a magic string: "nc" is a legal net name, and a
 * representation that could not tell an intentional no-connect from a net
 * someone called "nc" would accept a defect silently.
 */
export type Connection =
  | { readonly kind: "net"; readonly net: string }
  | { readonly kind: "nc" }

export const NC: Connection = { kind: "nc" }

export function net(name: string): Connection {
  if (name.length === 0) throw new Error("net name must not be empty")
  return { kind: "net", net: name }
}

export type Parameters =
  | ResistorParameters
  | CapacitorParameters
  | InductorParameters
  | PotentiometerParameters
  | SwitchParameters
  | Record<string, never>

export interface PartSpec {
  readonly mpn?: string
  readonly footprint?: string
  /** KiCad symbol library id, e.g. "Amplifier_Operational:TL072". */
  readonly symbol?: string
  /** Canonical pin -> KiCad symbol pin number, keyed by unit name. */
  readonly symbolPins?: Readonly<Record<string, Readonly<Record<string, string>>>>
  /** Canonical pin -> footprint pad. */
  readonly pads?: Readonly<Record<string, string>>
}

export interface Unit {
  /** Unique within the component: "A"/"B" for a dual op-amp, "MAIN" otherwise. */
  readonly name: string
  readonly pins: Readonly<Record<string, Connection>>
  readonly symbol?: string
  readonly spiceModel?: string
}

export interface Component {
  /** Stable semantic identity, e.g. "input_bias". Never a designator. */
  readonly id: string
  readonly kind: ComponentKind
  readonly parameters: Parameters
  readonly part?: PartSpec
  /** Package pins shared across units: supply, shield, substrate. */
  readonly pins: Readonly<Record<string, Connection>>
  /** One entry per functional unit. Single-unit parts have exactly one. */
  readonly units: readonly Unit[]
}

export interface Network {
  readonly components: readonly Component[]
  /** External interface: port name -> net name. */
  readonly ports: Readonly<Record<string, string>>
}
```

- [ ] **Step 4: Write `lib/model/kinds.ts`**

```ts
/**
 * Canonical pin vocabulary, per component kind.
 *
 * A kind declares the vocabulary and NOTHING ELSE. Mappings to KiCad pin
 * numbers, footprint pads and SPICE argument positions are properties of a
 * concrete symbol, package or model and live there (spec 3.5). An `opamp`
 * cannot say that `in+` is pin 3, because that is true of one symbol's unit A,
 * not of operational amplifiers.
 *
 * `ic` and `connector` declare no vocabulary: their pins are whatever the part
 * has, so they are checked for non-emptiness rather than against a list.
 */
import type { ComponentKind } from "./types.ts"

const UNIT_PINS: Readonly<Record<ComponentKind, readonly string[]>> = {
  resistor: ["a", "b"],
  capacitor: ["a", "b"],
  inductor: ["a", "b"],
  photoresistor: ["a", "b"],
  diode: ["anode", "cathode"],
  bjt: ["base", "collector", "emitter"],
  potentiometer: ["ccw", "wiper", "cw"],
  switch: ["a", "b"],
  opamp: ["in+", "in-", "out"],
  ic: [],
  connector: [],
}

const PACKAGE_PINS: Readonly<Record<ComponentKind, readonly string[]>> = {
  resistor: [], capacitor: [], inductor: [], photoresistor: [],
  diode: [], bjt: [], potentiometer: [], switch: [],
  opamp: ["v+", "v-"],
  ic: [], connector: [],
}

export function isKnownKind(kind: string): kind is ComponentKind {
  return Object.hasOwn(UNIT_PINS, kind)
}

function assertKnown(kind: string): asserts kind is ComponentKind {
  if (!isKnownKind(kind)) {
    throw new Error(
      `unknown component kind "${kind}". Known kinds: ${Object.keys(UNIT_PINS).join(", ")}`,
    )
  }
}

export function unitPins(kind: ComponentKind): readonly string[] {
  assertKnown(kind)
  return UNIT_PINS[kind]
}

export function packagePins(kind: ComponentKind): readonly string[] {
  assertKnown(kind)
  return PACKAGE_PINS[kind]
}

/** Kinds whose pin names are declared by the part rather than the kind. */
export function hasOpenVocabulary(kind: ComponentKind): boolean {
  assertKnown(kind)
  return UNIT_PINS[kind].length === 0
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `bun test tests/model/kinds.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Typecheck and commit**

```bash
bun run typecheck
git add lib/model/types.ts lib/model/kinds.ts tests/model/kinds.test.ts
git commit -F <message file>
```

---

### Task 3: Structural validation

**Files:**
- Create: `lib/model/validate.ts`
- Test: `tests/model/validate.test.ts`

**Interfaces:**
- Consumes: `Network`, `Component`, `Connection`, `unitPins`, `packagePins`, `hasOpenVocabulary`
- Produces: `validateNetwork(network: Network): void` — throws on the first violation, naming it

- [ ] **Step 1: Write the failing test**

Create `tests/model/validate.test.ts`:

```ts
import { test, expect } from "bun:test"
import { validateNetwork } from "../../lib/model/validate.ts"
import { NC, net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const resistor = (id: string, a: string, b: string): Component => ({
  id, kind: "resistor", parameters: { ohms: 1000 }, pins: {},
  units: [{ name: "MAIN", pins: { a: net(a), b: net(b) } }],
})

const twoResistors: Network = {
  components: [resistor("r1", "IN", "MID"), resistor("r2", "MID", "OUT")],
  ports: { IN: "IN", OUT: "OUT" },
}

test("a well-formed network validates", () => {
  expect(() => validateNetwork(twoResistors)).not.toThrow()
})

test("duplicate component ids are rejected", () => {
  const dup: Network = {
    components: [resistor("r1", "IN", "MID"), resistor("r1", "MID", "OUT")],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(dup)).toThrow(/duplicate component id "r1"/i)
})

test("a pin outside the kind's vocabulary is rejected", () => {
  const bad: Network = {
    components: [{
      id: "r1", kind: "resistor", parameters: { ohms: 1 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN"), wiper: net("OUT") } }],
    }],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(bad)).toThrow(/pin "wiper".*resistor/i)
})

test("a missing pin from the kind's vocabulary is rejected", () => {
  const bad: Network = {
    components: [{
      id: "r1", kind: "resistor", parameters: { ohms: 1 }, pins: {},
      units: [{ name: "MAIN", pins: { a: net("IN") } }],
    }],
    ports: { IN: "IN" },
  }
  expect(() => validateNetwork(bad)).toThrow(/missing pin "b"/i)
})

test("a net with only one component pin and no port is floating", () => {
  const floating: Network = {
    components: [resistor("r1", "IN", "DANGLE")],
    ports: { IN: "IN" },
  }
  expect(() => validateNetwork(floating)).toThrow(/net "DANGLE".*one component pin/i)
})

test("one component pin plus a declared port is valid", () => {
  const connectorLike: Network = {
    components: [{
      id: "j1", kind: "connector", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("OUT") } }],
    }, resistor("r1", "IN", "OUT")],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(connectorLike)).not.toThrow()
})

test("an explicit no-connect is exempt from the floating rule", () => {
  const withNc: Network = {
    components: [{
      id: "u1", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("OUT"), "3": NC } }],
    }, resistor("r1", "IN", "OUT")],
    ports: { IN: "IN", OUT: "OUT" },
  }
  expect(() => validateNetwork(withNc)).not.toThrow()
})

test("a net named nc is an ordinary net, not a no-connect", () => {
  const trap: Network = {
    components: [{
      id: "u1", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("nc") } }],
    }],
    ports: {},
  }
  expect(() => validateNetwork(trap)).toThrow(/net "nc".*one component pin/i)
})

test("a port naming a net no pin sits on is rejected", () => {
  const bad: Network = {
    components: [resistor("r1", "IN", "OUT")],
    ports: { IN: "IN", OUT: "OUT", SPARE: "NOWHERE" },
  }
  expect(() => validateNetwork(bad)).toThrow(/port "SPARE".*"NOWHERE"/i)
})

test("an open-vocabulary kind still rejects an empty pin map", () => {
  const bad: Network = {
    components: [{
      id: "u1", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: {} }],
    }],
    ports: {},
  }
  expect(() => validateNetwork(bad)).toThrow(/declares no pins/i)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/model/validate.test.ts`
Expected: FAIL — cannot resolve `../../lib/model/validate.ts`.

- [ ] **Step 3: Write `lib/model/validate.ts`**

```ts
/**
 * Structural validation of a Network.
 *
 * Throws on the first violation, naming it. Nothing here degrades or repairs:
 * a malformed network is a programming error, and a fallback would hide it.
 */
import { hasOpenVocabulary, packagePins, unitPins } from "./kinds.ts"
import type { Component, Connection, Network } from "./types.ts"

function netOf(c: Connection): string | undefined {
  return c.kind === "net" ? c.net : undefined
}

function checkVocabulary(component: Component): void {
  const allowedPackage = packagePins(component.kind)
  for (const pin of Object.keys(component.pins)) {
    if (!allowedPackage.includes(pin)) {
      throw new Error(
        `component "${component.id}": package pin "${pin}" is not in the ` +
          `${component.kind} vocabulary [${allowedPackage.join(", ")}]`,
      )
    }
  }
  for (const missing of allowedPackage.filter((p) => !(p in component.pins))) {
    throw new Error(
      `component "${component.id}": missing package pin "${missing}" required by kind ${component.kind}`,
    )
  }

  const open = hasOpenVocabulary(component.kind)
  const allowedUnit = unitPins(component.kind)
  for (const unit of component.units) {
    const names = Object.keys(unit.pins)
    if (names.length === 0) {
      throw new Error(
        `component "${component.id}" unit "${unit.name}" declares no pins`,
      )
    }
    if (open) continue
    for (const pin of names) {
      if (!allowedUnit.includes(pin)) {
        throw new Error(
          `component "${component.id}" unit "${unit.name}": pin "${pin}" is not in ` +
            `the ${component.kind} vocabulary [${allowedUnit.join(", ")}]`,
        )
      }
    }
    for (const missing of allowedUnit.filter((p) => !(p in unit.pins))) {
      throw new Error(
        `component "${component.id}" unit "${unit.name}": missing pin "${missing}" ` +
          `required by kind ${component.kind}`,
      )
    }
  }
}

export function validateNetwork(network: Network): void {
  const seen = new Set<string>()
  for (const component of network.components) {
    if (component.id.length === 0) throw new Error("component id must not be empty")
    if (seen.has(component.id)) {
      throw new Error(`duplicate component id "${component.id}"`)
    }
    seen.add(component.id)
    if (component.units.length === 0) {
      throw new Error(`component "${component.id}" declares no units`)
    }
    const unitNames = new Set<string>()
    for (const unit of component.units) {
      if (unitNames.has(unit.name)) {
        throw new Error(`component "${component.id}": duplicate unit "${unit.name}"`)
      }
      unitNames.add(unit.name)
    }
    checkVocabulary(component)
  }

  // Count component pins per net. An explicit no-connect contributes nothing,
  // which is what makes it exempt from the floating rule below.
  const pinCount = new Map<string, number>()
  const bump = (name: string) => pinCount.set(name, (pinCount.get(name) ?? 0) + 1)
  for (const component of network.components) {
    for (const c of Object.values(component.pins)) {
      const n = netOf(c)
      if (n !== undefined) bump(n)
    }
    for (const unit of component.units) {
      for (const c of Object.values(unit.pins)) {
        const n = netOf(c)
        if (n !== undefined) bump(n)
      }
    }
  }

  for (const [portName, netName] of Object.entries(network.ports)) {
    if (!pinCount.has(netName)) {
      throw new Error(
        `port "${portName}" names net "${netName}", which no component pin sits on`,
      )
    }
  }

  const ported = new Set(Object.values(network.ports))
  for (const [netName, count] of pinCount) {
    if (count === 1 && !ported.has(netName)) {
      throw new Error(
        `net "${netName}" has only one component pin and is not a declared port. ` +
          `Connect it, declare a port for it, or mark the pin as a no-connect.`,
      )
    }
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `bun test tests/model/validate.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
bun run typecheck
git add lib/model/validate.ts tests/model/validate.test.ts
git commit -F <message file>
```

---

### Task 4: The `circuit()` builder

**Files:**
- Create: `lib/model/builder.ts`
- Test: `tests/model/builder.test.ts`

**Interfaces:**
- Consumes: `Network`, `Component`, `Connection`, `net`, `NC`, `validateNetwork`, `parseValue`
- Produces: `circuit(): Builder` with methods `resistor`, `capacitor`, `inductor`, `ic`, `connector`, `port`, `add`, `done`

A pin map accepts a bare string as shorthand for a net, so authoring never writes `net("IN")` by hand.

- [ ] **Step 1: Write the failing test**

Create `tests/model/builder.test.ts`:

```ts
import { test, expect } from "bun:test"
import { circuit } from "../../lib/model/builder.ts"
import { NC } from "../../lib/model/types.ts"

test("a two-resistor divider builds and validates", () => {
  const n = circuit()
    .resistor("top", "10k", { a: "IN", b: "MID" })
    .resistor("bottom", "10k", { a: "MID", b: "GND" })
    .port("IN", "IN")
    .port("GND", "GND")
    .done()

  expect(n.components).toHaveLength(2)
  expect(n.components[0]?.id).toBe("top")
  expect(n.components[0]?.parameters).toEqual({ ohms: 10000 })
  expect(n.components[0]?.units[0]?.pins.a).toEqual({ kind: "net", net: "IN" })
  expect(n.ports).toEqual({ IN: "IN", GND: "GND" })
})

test("values are parsed, not stored as strings", () => {
  const n = circuit()
    .capacitor("c", "4.7uF", { a: "IN", b: "GND" })
    .resistor("r", "1k", { a: "IN", b: "GND" })
    .port("IN", "IN").port("GND", "GND")
    .done()
  expect(n.components[0]?.parameters).toEqual({ farads: 4.7e-6 })
  expect(n.components[1]?.parameters).toEqual({ ohms: 1000 })
})

test("an ic declares its own pins and accepts a no-connect", () => {
  const n = circuit()
    .ic("u1", { "1": "VCC", "2": "OUT", "3": NC }, { mpn: "PT2399" })
    .resistor("load", "1k", { a: "OUT", b: "VCC" })
    .port("VCC", "VCC")
    .done()
  const u1 = n.components[0]
  expect(u1?.kind).toBe("ic")
  expect(u1?.part?.mpn).toBe("PT2399")
  expect(u1?.units[0]?.pins["3"]).toEqual({ kind: "nc" })
})

test("done() runs validation, so a floating net throws at construction", () => {
  expect(() =>
    circuit().resistor("r", "1k", { a: "IN", b: "DANGLE" }).port("IN", "IN").done(),
  ).toThrow(/net "DANGLE"/i)
})

test("a duplicate id throws at declaration, not at done()", () => {
  const b = circuit().resistor("r", "1k", { a: "IN", b: "GND" })
  expect(() => b.resistor("r", "2k", { a: "GND", b: "OUT" })).toThrow(/duplicate component id "r"/i)
})

test("a port declared twice throws", () => {
  const b = circuit().resistor("r", "1k", { a: "IN", b: "GND" }).port("IN", "IN")
  expect(() => b.port("IN", "GND")).toThrow(/port "IN" is already declared/i)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/model/builder.test.ts`
Expected: FAIL — cannot resolve `../../lib/model/builder.ts`.

- [ ] **Step 3: Write `lib/model/builder.ts`**

```ts
/**
 * The authoring layer: a circuit is a function that returns a Network.
 *
 * The builder exists so declarations read like the circuit rather than like a
 * data structure. It throws as early as it can - a duplicate id is rejected at
 * the declaration that causes it, not at done(), so the stack points at the
 * mistake.
 */
import { parseValue } from "../passives/units.ts"
import { validateNetwork } from "./validate.ts"
import { NC, net } from "./types.ts"
import type { Component, Connection, Network, PartSpec, Unit } from "./types.ts"

/** A pin map accepts a bare net name as shorthand for net(name). */
export type PinMap = Readonly<Record<string, string | Connection>>

function toConnections(pins: PinMap): Readonly<Record<string, Connection>> {
  const out: Record<string, Connection> = {}
  for (const [pin, value] of Object.entries(pins)) {
    out[pin] = typeof value === "string" ? net(value) : value
  }
  return out
}

const mainUnit = (pins: PinMap): readonly Unit[] => [
  { name: "MAIN", pins: toConnections(pins) },
]

export class Builder {
  private readonly components: Component[] = []
  private readonly ports: Record<string, string> = {}

  private push(component: Component): this {
    if (this.components.some((c) => c.id === component.id)) {
      throw new Error(`duplicate component id "${component.id}"`)
    }
    this.components.push(component)
    return this
  }

  resistor(id: string, value: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "resistor", parameters: { ohms: parseValue(value) },
      pins: {}, units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  capacitor(id: string, value: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "capacitor", parameters: { farads: parseValue(value) },
      pins: {}, units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  inductor(id: string, value: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "inductor", parameters: { henries: parseValue(value) },
      pins: {}, units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  ic(id: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "ic", parameters: {}, pins: {},
      units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  connector(id: string, pins: PinMap, part?: PartSpec): this {
    return this.push({
      id, kind: "connector", parameters: {}, pins: {},
      units: mainUnit(pins), ...(part ? { part } : {}),
    })
  }

  /** Escape hatch for kinds the builder has no shorthand for yet. */
  add(component: Component): this {
    return this.push(component)
  }

  port(name: string, netName: string): this {
    if (Object.hasOwn(this.ports, name)) {
      throw new Error(`port "${name}" is already declared`)
    }
    this.ports[name] = netName
    return this
  }

  done(): Network {
    const network: Network = {
      components: [...this.components],
      ports: { ...this.ports },
    }
    validateNetwork(network)
    return network
  }
}

export function circuit(): Builder {
  return new Builder()
}

export { NC }
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `bun test tests/model/builder.test.ts`
Expected: PASS, 6 tests.

If `parseValue` rejects `"4.7uF"` or `"10k"`, read `lib/passives/units.ts` and use the spellings it accepts — do **not** add a fallback parser. Report the accepted spellings in the task report.

- [ ] **Step 5: Typecheck and commit**

```bash
bun run typecheck
git add lib/model/builder.ts tests/model/builder.test.ts
git commit -F <message file>
```

---

### Task 5: `include()` and the no-implicit-global-nets invariant

**Files:**
- Create: `lib/model/include.ts`
- Create: `lib/model/index.ts`
- Modify: `lib/model/builder.ts` (add the `include` method)
- Test: `tests/model/include.test.ts`

**Interfaces:**
- Consumes: `Network`, `Component`, `Connection`
- Produces: `includeNetwork(prefix, network, portMap): { components, netRenames }`, and `Builder.include(prefix, network, portMap)`

- [ ] **Step 1: Write the failing test**

Create `tests/model/include.test.ts`:

```ts
import { test, expect } from "bun:test"
import { circuit } from "../../lib/model/builder.ts"

const divider = () =>
  circuit()
    .resistor("top", "10k", { a: "IN", b: "MID" })
    .resistor("bottom", "10k", { a: "MID", b: "GND" })
    .port("IN", "IN")
    .port("OUT", "MID")
    .port("GND", "GND")
    .done()

test("included component ids are prefixed", () => {
  const n = circuit()
    .include("first", divider(), { IN: "SIG", OUT: "TAP", GND: "GROUND" })
    .resistor("load", "1k", { a: "TAP", b: "GROUND" })
    .port("SIG", "SIG").port("GROUND", "GROUND")
    .done()

  expect(n.components.map((c) => c.id).sort())
    .toEqual(["first_bottom", "first_top", "load"])
})

test("bound ports take the parent's net; unbound internals are prefixed", () => {
  const n = circuit()
    .include("first", divider(), { IN: "SIG", OUT: "TAP", GND: "GROUND" })
    .resistor("load", "1k", { a: "TAP", b: "GROUND" })
    .port("SIG", "SIG").port("GROUND", "GROUND")
    .done()

  const top = n.components.find((c) => c.id === "first_top")
  expect(top?.units[0]?.pins.a).toEqual({ kind: "net", net: "SIG" })
  expect(top?.units[0]?.pins.b).toEqual({ kind: "net", net: "TAP" })
})

test("two instances of the same sub-circuit do not collide", () => {
  const n = circuit()
    .include("a", divider(), { IN: "SIG", OUT: "TAP_A", GND: "GROUND" })
    .include("b", divider(), { IN: "TAP_A", OUT: "TAP_B", GND: "GROUND" })
    .resistor("load", "1k", { a: "TAP_B", b: "GROUND" })
    .port("SIG", "SIG").port("GROUND", "GROUND")
    .done()

  expect(n.components).toHaveLength(5)
  const aTop = n.components.find((c) => c.id === "a_top")
  const bTop = n.components.find((c) => c.id === "b_top")
  expect(aTop?.units[0]?.pins.b).toEqual({ kind: "net", net: "TAP_A" })
  expect(bTop?.units[0]?.pins.a).toEqual({ kind: "net", net: "TAP_A" })
})

test("an unbound declared port is rejected - there are no implicit global nets", () => {
  expect(() =>
    circuit().include("first", divider(), { IN: "SIG", OUT: "TAP" }),
  ).toThrow(/port "GND" .*not bound/i)
})

test("binding a port the sub-circuit does not declare is rejected", () => {
  expect(() =>
    circuit().include("first", divider(), {
      IN: "SIG", OUT: "TAP", GND: "GROUND", VCC: "RAIL",
    }),
  ).toThrow(/"VCC" is not a declared port/i)
})

test("a prefix colliding with an existing id is rejected", () => {
  const b = circuit().resistor("first_top", "1k", { a: "SIG", b: "GROUND" })
  expect(() => b.include("first", divider(), { IN: "SIG", OUT: "TAP", GND: "GROUND" }))
    .toThrow(/duplicate component id "first_top"/i)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/model/include.test.ts`
Expected: FAIL — `Builder.include is not a function`.

- [ ] **Step 3: Write `lib/model/include.ts`**

```ts
/**
 * Composition. One primitive, deliberately.
 *
 * THERE ARE NO IMPLICIT OR GLOBAL NETS. Ground, supply rails and bias
 * references are not special: every net crossing a composition boundary must be
 * a declared port and must be explicitly bound. The property this buys is that
 * `mid_GND` can never silently appear because someone assumed ground was
 * ambient - a rail that should be shared and is not becomes a construction
 * error instead of a subtle simulation result.
 */
import type { Component, Connection, Network, Unit } from "./types.ts"

export type PortMap = Readonly<Record<string, string>>

function rename(
  c: Connection,
  prefix: string,
  bound: Readonly<Record<string, string>>,
): Connection {
  if (c.kind === "nc") return c
  const parent = bound[c.net]
  return { kind: "net", net: parent ?? `${prefix}_${c.net}` }
}

export function includeNetwork(
  prefix: string,
  network: Network,
  portMap: PortMap,
): readonly Component[] {
  if (prefix.length === 0) throw new Error("include prefix must not be empty")

  for (const portName of Object.keys(portMap)) {
    if (!Object.hasOwn(network.ports, portName)) {
      throw new Error(
        `"${portName}" is not a declared port of the included network. ` +
          `Declared: ${Object.keys(network.ports).join(", ") || "(none)"}`,
      )
    }
  }
  for (const portName of Object.keys(network.ports)) {
    if (!Object.hasOwn(portMap, portName)) {
      throw new Error(
        `port "${portName}" of the included network is not bound. There are no ` +
          `implicit global nets: bind every declared port explicitly.`,
      )
    }
  }

  // Internal net name -> parent net name, for the nets the ports name.
  const bound: Record<string, string> = {}
  for (const [portName, parentNet] of Object.entries(portMap)) {
    const internal = network.ports[portName]
    if (internal === undefined) {
      throw new Error(`port "${portName}" has no net`)
    }
    bound[internal] = parentNet
  }

  return network.components.map((component): Component => {
    const units: readonly Unit[] = component.units.map((unit) => ({
      ...unit,
      pins: Object.fromEntries(
        Object.entries(unit.pins).map(([pin, c]) => [pin, rename(c, prefix, bound)]),
      ),
    }))
    return {
      ...component,
      id: `${prefix}_${component.id}`,
      pins: Object.fromEntries(
        Object.entries(component.pins).map(([pin, c]) => [pin, rename(c, prefix, bound)]),
      ),
      units,
    }
  })
}
```

- [ ] **Step 4: Add `include` to the builder**

In `lib/model/builder.ts`, add the import and the method:

```ts
import { includeNetwork } from "./include.ts"
import type { PortMap } from "./include.ts"
```

```ts
  include(prefix: string, network: Network, portMap: PortMap): this {
    for (const component of includeNetwork(prefix, network, portMap)) {
      this.push(component)
    }
    return this
  }
```

- [ ] **Step 5: Write `lib/model/index.ts`**

```ts
export { circuit, Builder } from "./builder.ts"
export type { PinMap } from "./builder.ts"
export { includeNetwork } from "./include.ts"
export type { PortMap } from "./include.ts"
export { validateNetwork } from "./validate.ts"
export { isKnownKind, unitPins, packagePins, hasOpenVocabulary } from "./kinds.ts"
export { NC, net } from "./types.ts"
export type {
  Component, ComponentKind, Connection, Network, Parameters, PartSpec, Unit,
} from "./types.ts"
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `bun test tests/model/`
Expected: PASS, 22 tests across three files.

- [ ] **Step 7: Typecheck and commit**

```bash
bun run typecheck
git add lib/model/include.ts lib/model/index.ts lib/model/builder.ts tests/model/include.test.ts
git commit -F <message file>
```

---

### Task 6: KiCad netlist importers (both formats)

Reads KiCad netlist exports into a common shape. **Two formats are needed, for different reasons.**

The **EESchema legacy v1.1** format is what VeroRoute consumed to lay out the board the maintainer built, so it is the authority Task 7 verifies against. The **s-expression** format is KiCad's modern export; Plan C needs an s-expression reader for `.kicad_sch` anyway, and Task 7 uses it to assert the two netlists agree.

Both produce the same `ImportedNetlist` shape so the comparison is a set comparison rather than a format translation.

An imported network is keyed by KiCad **designators** (`C1`, `R1`) with **pin numbers** (`1`, `2`), not semantic ids and canonical pin names. That is correct and expected: the comparison in Task 7 supplies the mapping.

**Files:**
- Create: `lib/kicad/sexpr.ts`
- Create: `lib/kicad/netlist.ts`
- Create: `lib/kicad/legacy-netlist.ts`
- Test: `tests/kicad/sexpr.test.ts`
- Test: `tests/kicad/netlist.test.ts`
- Test: `tests/kicad/legacy-netlist.test.ts`

**Interfaces:**
- Consumes: `Network`, `Component`
- Produces: `parseSexpr(text: string): SNode`, `importNetlist(text: string): ImportedNetlist`, `importLegacyNetlist(text: string): ImportedNetlist`

```ts
export interface ImportedComponent {
  readonly designator: string      // "C1"
  readonly value: string           // ".1uF"
  readonly footprint?: string
  readonly libPart?: string        // libsource part, e.g. "C"
}
export interface ImportedNetlist {
  readonly components: readonly ImportedComponent[]
  /** net name -> sorted "designator.pin" strings */
  readonly nets: Readonly<Record<string, readonly string[]>>
}
```

- [ ] **Step 1: Write the s-expression parser test**

Create `tests/kicad/sexpr.test.ts`:

```ts
import { test, expect } from "bun:test"
import { parseSexpr, children, attr } from "../../lib/kicad/sexpr.ts"

test("parses a nested form with quoted atoms", () => {
  const node = parseSexpr(`(comp (ref "C1") (value ".1uF"))`)
  expect(node.name).toBe("comp")
  expect(attr(node, "ref")).toBe("C1")
  expect(attr(node, "value")).toBe(".1uF")
})

test("quoted atoms may contain spaces and parentheses", () => {
  const node = parseSexpr(`(field (name "Description") "Unpolarized (film) capacitor")`)
  expect(node.atoms).toContain("Unpolarized (film) capacitor")
})

test("children returns every matching sub-form", () => {
  const node = parseSexpr(`(net (node (ref "C1")) (node (ref "R2")))`)
  expect(children(node, "node").map((n) => attr(n, "ref"))).toEqual(["C1", "R2"])
})

test("an unbalanced form throws rather than returning a partial tree", () => {
  expect(() => parseSexpr(`(comp (ref "C1")`)).toThrow(/unbalanced/i)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/kicad/sexpr.test.ts`
Expected: FAIL — cannot resolve `../../lib/kicad/sexpr.ts`.

- [ ] **Step 3: Write `lib/kicad/sexpr.ts`**

```ts
/**
 * A minimal s-expression reader for KiCad files.
 *
 * KiCad writes atoms bare or double-quoted, with backslash escapes inside
 * quotes. Quoted atoms may contain whitespace and parentheses, so the tokeniser
 * must track quoting rather than splitting on delimiters.
 */
export interface SNode {
  readonly name: string
  /** Bare and quoted atoms, in order, excluding the leading name. */
  readonly atoms: readonly string[]
  readonly nodes: readonly SNode[]
}

export function parseSexpr(text: string): SNode {
  let i = 0

  const skipSpace = () => {
    while (i < text.length && /\s/.test(text[i] ?? "")) i++
  }

  const readQuoted = (): string => {
    i++ // opening quote
    let out = ""
    while (i < text.length) {
      const ch = text[i] ?? ""
      if (ch === "\\") {
        out += text[i + 1] ?? ""
        i += 2
        continue
      }
      if (ch === '"') {
        i++
        return out
      }
      out += ch
      i++
    }
    throw new Error("unbalanced quote in s-expression")
  }

  const readBare = (): string => {
    let out = ""
    while (i < text.length && !/[\s()]/.test(text[i] ?? "")) {
      out += text[i]
      i++
    }
    return out
  }

  const readNode = (): SNode => {
    skipSpace()
    if (text[i] !== "(") throw new Error(`expected "(" at offset ${i}`)
    i++
    skipSpace()
    const name = text[i] === '"' ? readQuoted() : readBare()
    const atoms: string[] = []
    const nodes: SNode[] = []
    for (;;) {
      skipSpace()
      if (i >= text.length) throw new Error("unbalanced s-expression: ran out of input")
      const ch = text[i]
      if (ch === ")") {
        i++
        return { name, atoms, nodes }
      }
      if (ch === "(") {
        nodes.push(readNode())
        continue
      }
      atoms.push(ch === '"' ? readQuoted() : readBare())
    }
  }

  return readNode()
}

export function children(node: SNode, name: string): readonly SNode[] {
  return node.nodes.filter((n) => n.name === name)
}

export function child(node: SNode, name: string): SNode | undefined {
  return node.nodes.find((n) => n.name === name)
}

/** First atom of the named child form, e.g. attr(comp, "ref") for (ref "C1"). */
export function attr(node: SNode, name: string): string | undefined {
  return child(node, name)?.atoms[0]
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `bun test tests/kicad/sexpr.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the netlist importer test**

Create `tests/kicad/netlist.test.ts`:

```ts
import { test, expect } from "bun:test"
import { importNetlist } from "../../lib/kicad/netlist.ts"

const SAMPLE = `(export
  (version "E")
  (components
    (comp (ref "C1") (value ".1uF")
      (footprint "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")
      (libsource (lib "Device") (part "C")))
    (comp (ref "R1") (value "10k")
      (libsource (lib "Device") (part "R"))))
  (nets
    (net (code "1") (name "+5V")
      (node (ref "C1") (pin "1") (pintype "passive"))
      (node (ref "R1") (pin "1") (pintype "passive")))
    (net (code "2") (name "GND")
      (node (ref "C1") (pin "2") (pintype "passive"))
      (node (ref "R1") (pin "2") (pintype "passive")))))`

test("components carry designator, value, footprint and libsource part", () => {
  const n = importNetlist(SAMPLE)
  expect(n.components).toHaveLength(2)
  const c1 = n.components.find((c) => c.designator === "C1")
  expect(c1?.value).toBe(".1uF")
  expect(c1?.libPart).toBe("C")
  expect(c1?.footprint).toContain("C_Disc")
})

test("nets map to sorted designator.pin members", () => {
  const n = importNetlist(SAMPLE)
  expect(n.nets["+5V"]).toEqual(["C1.1", "R1.1"])
  expect(n.nets["GND"]).toEqual(["C1.2", "R1.2"])
})

test("a netlist with no components section throws", () => {
  expect(() => importNetlist(`(export (version "E") (nets))`))
    .toThrow(/no \(components\) section/i)
})

test("a node referencing an undeclared component throws", () => {
  const bad = `(export (components (comp (ref "C1") (value "1n")))
    (nets (net (code "1") (name "N") (node (ref "C1") (pin "1")) (node (ref "R9") (pin "1")))))`
  expect(() => importNetlist(bad)).toThrow(/"R9".*not declared/i)
})
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `bun test tests/kicad/netlist.test.ts`
Expected: FAIL — cannot resolve `../../lib/kicad/netlist.ts`.

- [ ] **Step 7: Write `lib/kicad/netlist.ts`**

```ts
/**
 * Import a `kicad-cli` netlist export.
 *
 * The result is keyed by KiCad DESIGNATORS with PIN NUMBERS, not by semantic
 * ids and canonical pin names. That is deliberate: this reads someone else's
 * artefact, and translating it into our vocabulary requires a mapping the
 * caller supplies.
 */
import { attr, child, children, parseSexpr } from "./sexpr.ts"

export interface ImportedComponent {
  readonly designator: string
  readonly value: string
  readonly footprint?: string
  readonly libPart?: string
}

export interface ImportedNetlist {
  readonly components: readonly ImportedComponent[]
  /** net name -> sorted "designator.pin" members */
  readonly nets: Readonly<Record<string, readonly string[]>>
}

export function importNetlist(text: string): ImportedNetlist {
  const root = parseSexpr(text)
  const componentsNode = child(root, "components")
  if (componentsNode === undefined) {
    throw new Error("netlist has no (components) section")
  }

  const components = children(componentsNode, "comp").map((comp): ImportedComponent => {
    const designator = attr(comp, "ref")
    if (designator === undefined) throw new Error("(comp) with no (ref)")
    const value = attr(comp, "value")
    if (value === undefined) throw new Error(`component "${designator}" has no (value)`)
    const libsource = child(comp, "libsource")
    const footprint = attr(comp, "footprint")
    return {
      designator,
      value,
      ...(footprint !== undefined ? { footprint } : {}),
      ...(libsource !== undefined && attr(libsource, "part") !== undefined
        ? { libPart: attr(libsource, "part") as string }
        : {}),
    }
  })

  const declared = new Set(components.map((c) => c.designator))
  const nets: Record<string, readonly string[]> = {}
  const netsNode = child(root, "nets")
  for (const netNode of netsNode === undefined ? [] : children(netsNode, "net")) {
    const name = attr(netNode, "name")
    if (name === undefined) throw new Error("(net) with no (name)")
    const members = children(netNode, "node").map((node) => {
      const ref = attr(node, "ref")
      const pin = attr(node, "pin")
      if (ref === undefined || pin === undefined) {
        throw new Error(`net "${name}" has a (node) missing (ref) or (pin)`)
      }
      if (!declared.has(ref)) {
        throw new Error(`net "${name}" references "${ref}", which is not declared in (components)`)
      }
      return `${ref}.${pin}`
    })
    nets[name] = [...members].sort()
  }

  return { components, nets }
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `bun test tests/kicad/`
Expected: PASS, 8 tests.

- [ ] **Step 9: Write the legacy importer test**

The EESchema v1.1 format is shaped differently: a brace comment, then one form per component whose leading atoms are uuid, footprint, designator and value, followed by one form per pin.

Create `tests/kicad/legacy-netlist.test.ts`:

```ts
import { test, expect } from "bun:test"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"

const SAMPLE = `( { EESchema Netlist Version 1.1 created  2026-09-15T21:32:09 }
 ( /04737d7e-1324-4a9b-8c05-3227c13a478c CAP_CERAMIC1  C12 5600pF
  (    1 Net-(C12-Pad1) )
  (    2 GND )
 )
 ( /304173c5-1ea4-4fe8-87ec-61bada675f8a RESISTOR4  R7 10K
  (    1 Net-(C12-Pad1) )
  (    2 Net-(U1-LPF2-IN) )
 )
)`

test("components carry designator, value and footprint", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(n.components).toHaveLength(2)
  const c12 = n.components.find((c) => c.designator === "C12")
  expect(c12?.value).toBe("5600pF")
  expect(c12?.footprint).toBe("CAP_CERAMIC1")
})

test("nets map to sorted designator.pin members", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(n.nets["Net-(C12-Pad1)"]).toEqual(["C12.1", "R7.1"])
  expect(n.nets["GND"]).toEqual(["C12.2"])
})

test("net names containing parentheses survive tokenising", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(Object.keys(n.nets)).toContain("Net-(U1-LPF2-IN)")
})

test("the brace header is not mistaken for a component", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(n.components.map((c) => c.designator).sort()).toEqual(["C12", "R7"])
})
```

- [ ] **Step 10: Run it and confirm it fails**

Run: `bun test tests/kicad/legacy-netlist.test.ts`
Expected: FAIL — cannot resolve `../../lib/kicad/legacy-netlist.ts`.

- [ ] **Step 11: Write `lib/kicad/legacy-netlist.ts`**

Note the hazard the third test guards: KiCad's generated net names contain parentheses (`Net-(U1-LPF2-IN)`), so a naive paren-matching tokeniser will mis-nest. Atoms are read to whitespace, and a form's structure is decided by its position, not by scanning for balanced parens inside atoms.

```ts
/**
 * Import an EESchema v1.1 netlist - the format VeroRoute consumes.
 *
 * This is the authoritative artefact for pt2399-core: it is what the built
 * board was laid out from.
 *
 * Shape:
 *   ( { header comment }
 *    ( /uuid FOOTPRINT REF VALUE
 *     (    1 NetName )
 *     (    2 NetName ) ) ... )
 *
 * HAZARD: generated net names contain parentheses, e.g. "Net-(U1-LPF2-IN)".
 * A tokeniser that treats every "(" and ")" as structural, or that strips a
 * trailing ")" from an atom, corrupts those names into "Net-(U1-LPF2-IN".
 *
 * EESchema writes structural parentheses whitespace-delimited, so tokenising on
 * whitespace and treating a token as structural ONLY when it is exactly "(" or
 * ")" reads net names intact. The "net names containing parentheses survive
 * tokenising" test guards this; if it ever fails, the assumption about
 * whitespace has been violated and the tokeniser needs a real parser, not a
 * patch.
 */
import type { ImportedComponent, ImportedNetlist } from "./netlist.ts"

function stripComments(text: string): string {
  return text.replace(/\{[^}]*\}/g, " ")
}

function tokenise(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.length > 0)
}

export function importLegacyNetlist(text: string): ImportedNetlist {
  const tokens = tokenise(stripComments(text))
  if (tokens[0] !== "(") throw new Error("legacy netlist does not open with (")

  const components: ImportedComponent[] = []
  const nets: Record<string, string[]> = {}

  let i = 1
  while (i < tokens.length) {
    if (tokens[i] === ")") { i++; continue }
    if (tokens[i] !== "(") { i++; continue }
    i++ // into the component form

    const uuid = tokens[i++] ?? ""
    if (!uuid.startsWith("/")) {
      throw new Error(`expected a /uuid at the head of a component form, got "${uuid}"`)
    }
    const footprint = tokens[i++] ?? ""
    const designator = tokens[i++] ?? ""
    const value = tokens[i++] ?? ""
    if (designator.length === 0 || value.length === 0) {
      throw new Error(`component form for "${uuid}" is missing a designator or value`)
    }
    components.push({ designator, value, footprint })

    while (i < tokens.length && tokens[i] === "(") {
      i++ // into the pin form
      const pin = tokens[i++] ?? ""
      const netName = tokens[i++] ?? ""
      if (tokens[i] !== ")") {
        throw new Error(`pin form for ${designator}.${pin} did not close where expected`)
      }
      i++
      ;(nets[netName] ??= []).push(`${designator}.${pin}`)
    }
    if (tokens[i] !== ")") {
      throw new Error(`component form for "${designator}" did not close where expected`)
    }
    i++
  }

  if (components.length === 0) throw new Error("legacy netlist declares no components")
  for (const key of Object.keys(nets)) nets[key] = (nets[key] ?? []).sort()
  return { components, nets }
}
```

- [ ] **Step 12: Run everything in the module and confirm it passes**

Run: `bun test tests/kicad/`
Expected: PASS, 12 tests.

- [ ] **Step 13: Typecheck and commit**

```bash
bun run typecheck
git add lib/kicad/ tests/kicad/
git commit -F <message file>
```

---

### Task 7: Author `pt2399-core` and verify it against the built unit

This is the plan's proving ground. The maintainer built this circuit from a private source repository and it works, so its netlist is the strongest correctness evidence available without a bench.

**Files:**
- Create: `circuits/pt2399-core/pt2399-core.ts`
- Create: `tests/fixtures/pt2399-core-veroroute.net` (the built board's netlist — authority)
- Create: `tests/fixtures/pt2399-core.net` (the s-expression export — cross-check)
- Test: `tests/circuits/pt2399-core.test.ts`

**Interfaces:**
- Consumes: `circuit()`, `NC`, `importLegacyNetlist`, `importNetlist`
- Produces: `pt2399Core(): Network`, `DESIGNATORS`, `PIN_NUMBERS`

- [ ] **Step 1: Copy both netlist fixtures and read the circuit**

```bash
mkdir -p tests/fixtures
SRC=<source-repo>/pt2399/pt2399-core/pt2399-core
cp "$SRC/pt2399-core-veroroute.net" tests/fixtures/pt2399-core-veroroute.net
cp "$SRC/pt2399-core.net"           tests/fixtures/pt2399-core.net
wc -l tests/fixtures/pt2399-core-veroroute.net tests/fixtures/pt2399-core.net
```

Expected: roughly 116 and 2130 lines. If either is missing, STOP and report — do not author the circuit from memory or from a datasheet.

**The VeroRoute netlist is the authority.** It is what VeroRoute consumed to lay out the perfboard the maintainer built, so it is the only artefact with a chain of custody to working hardware. Read the topology from it:

```bash
bun -e 'import {importLegacyNetlist} from "./lib/kicad/legacy-netlist.ts";
const n = importLegacyNetlist(await Bun.file("tests/fixtures/pt2399-core-veroroute.net").text());
console.log(n.components.map(c => `${c.designator} ${c.value} ${c.footprint ?? ""}`).join("\n"));
console.log(Object.entries(n.nets).map(([k,v]) => `${k}: ${v.join(" ")}`).join("\n"))'
```

Expected: 24 components, 21 nets. Record that output in the task report — it is the specification for Step 4.

- [ ] **Step 2: Write the failing test**

Create `tests/circuits/pt2399-core.test.ts`:

```ts
import { test, expect } from "bun:test"
import { pt2399Core, DESIGNATORS, PIN_NUMBERS } from "../../circuits/pt2399-core/pt2399-core.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import type { Network } from "../../lib/model/types.ts"

/** Our network expressed the way the KiCad netlist expresses itself. */
function asDesignatorNets(n: Network): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const add = (netName: string, member: string) => {
    ;(out[netName] ??= []).push(member)
  }
  for (const component of n.components) {
    const designator = DESIGNATORS[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    for (const unit of component.units) {
      for (const [pin, conn] of Object.entries(unit.pins)) {
        if (conn.kind === "nc") continue
        const number = PIN_NUMBERS[component.kind]?.[pin] ?? pin
        add(conn.net, `${designator}.${number}`)
      }
    }
  }
  for (const key of Object.keys(out)) out[key] = (out[key] ?? []).sort()
  return out
}

const built = async () =>
  importLegacyNetlist(await Bun.file("tests/fixtures/pt2399-core-veroroute.net").text())

test("the authored network matches the netlist of the built unit", async () => {
  const imported = await built()
  const ours = asDesignatorNets(pt2399Core())

  // Compare connectivity as sets of members, keyed by net name.
  expect(Object.keys(ours).sort()).toEqual(Object.keys(imported.nets).sort())
  for (const [name, members] of Object.entries(imported.nets)) {
    expect(ours[name]).toEqual([...members])
  }
})

test("every component in the built unit is present, with its value", async () => {
  const imported = await built()
  const ours = pt2399Core()
  expect(ours.components).toHaveLength(imported.components.length)
  const mapped = new Set(ours.components.map((c) => DESIGNATORS[c.id]))
  for (const c of imported.components) expect(mapped.has(c.designator)).toBe(true)
})

/**
 * The board was built from the VeroRoute netlist; the s-expression export came
 * from the same schematic 22 minutes later. Asserting they agree is what
 * licenses Plan C to use pt2399-core.kicad_sch as a fixture for a circuit known
 * to work. Net NAMES are ignored - the two exporters generate them differently
 * and only the partition carries electrical meaning.
 */
test("the schematic export describes the same circuit as the built board", async () => {
  const legacy = await built()
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())

  const partition = (n: { nets: Readonly<Record<string, readonly string[]>> }) =>
    Object.values(n.nets)
      .map((members) => [...members].sort().join(" "))
      .sort()

  expect(partition(modern)).toEqual(partition(legacy))

  const values = (cs: readonly { designator: string; value: string }[]) =>
    Object.fromEntries(cs.map((c) => [c.designator, c.value]))
  expect(values(modern.components)).toEqual(values(legacy.components))
})
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `bun test tests/circuits/pt2399-core.test.ts`
Expected: FAIL — cannot resolve `../../circuits/pt2399-core/pt2399-core.ts`.

- [ ] **Step 4: Author the circuit**

Create `circuits/pt2399-core/pt2399-core.ts`. Transcribe from the netlist output captured in Step 1 — **every component and every connection comes from that output, not from memory or from the datasheet.** Give each component a semantic id describing its role; keep the designator mapping beside it.

The file's shape:

```ts
/**
 * PT2399 delay core.
 *
 * Transcribed from the netlist of a unit that was built and works.
 * Semantic ids describe each part's role; DESIGNATORS maps them to the
 * schematic's reference designators, which
 * belong to KiCad and are recorded here only so the verification test can
 * compare the two.
 */
import { circuit, NC } from "../lib/model/index.ts"
import type { ComponentKind, Network } from "../lib/model/index.ts"

/** Semantic id -> the built unit's reference designator. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  // e.g. supply_bypass: "C1",
}

/** Canonical pin -> KiCad pin number, per kind. Two-terminal passives are 1/2. */
export const PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  resistor: { a: "1", b: "2" },
  capacitor: { a: "1", b: "2" },
}

export function pt2399Core(): Network {
  return circuit()
    // ... one declaration per component from the Step 1 output
    .done()
}
```

Rules while transcribing:
- Net names come from the netlist verbatim (`+5V`, `GND`, and KiCad's generated names).
- The PT2399 is `ic`, with pin names that are its pin numbers as strings.
- The connector is `connector`, likewise.
- A pin the netlist shows on no net is `NC`.
- Declare a `port` for every net that leaves the board — at minimum those the connector sits on — or validation will reject single-pin nets.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `bun test tests/circuits/pt2399-core.test.ts`
Expected: PASS, 3 tests.

A failure in either of the first two means the transcription differs from the built unit. **Fix the transcription; never relax the assertion.** If a mismatch appears to be a defect in the netlist rather than in the transcription, STOP and report it — that is a finding about a circuit the maintainer built, and it is not yours to paper over.

A failure in the third — the two netlists disagreeing — is a **different and more serious** finding: it would mean the schematic on disk does not describe the board that was built. It was verified during planning that they agree (21 nets, 24 components, identical partitions and values), so a failure here means something changed since. STOP and report it rather than adjusting either fixture.

- [ ] **Step 6: Typecheck, run everything, commit**

```bash
bun run typecheck
bun test
git add circuits/ tests/circuits/ tests/fixtures/
git commit -F <message file>
```

---

### Task 8: Migrate the Pultec reference and delete the tscircuit Pultec modules

The Pultec reference network already exists in `reference/pultec/`, assembled mechanically from a `kicad-cli` export. The tscircuit modules are a second derived representation asserted equal to it, so they carry no information the reference lacks. Deleting them removes a representation, not knowledge.

**These circuits are unvalidated.** The maintainer cannot validate them without building from the schematic, which is off the table. This task moves them to the canonical model so the one-model rule holds; it does not make them trusted, and the marker added in Step 2 says so.

**Files:**
- Modify: `circuits/pultec/model/three-band.ts`, `partition.ts`, `controls.ts`, `mid.ts` (import from `lib/model/`)
- Modify: `lib/passives/*` → moved to `lib/model/` (see Step 1)
- Delete: `modules/pultec-hi-boost/`, `modules/pultec-hi-cut/`, `modules/pultec-low-boost/`, `modules/pultec-low-cut/`, `modules/pultec-mid/`, `modules/pultec-passive-eq/`
- Delete: `tests/modules/*.test.tsx` for those six modules
- Delete: `lib/export/circuit-json.ts` and `tests/export/circuit-json.test.ts` if nothing else imports them

**Interfaces:**
- Consumes: `lib/model/` types
- Produces: `reference/pultec/` typed against `Network`

- [ ] **Step 1: Move the remaining `lib/passives` files into `lib/model`**

```bash
git mv lib/passives/parameters.ts lib/model/parameters.ts
git mv lib/passives/units.ts lib/model/units.ts
git mv lib/passives/union-find.ts lib/model/union-find.ts
git mv lib/passives/connectivity.ts lib/model/connectivity.ts
git mv lib/passives/control-state.ts lib/model/control-state.ts
git mv lib/passives/topology.ts lib/model/topology.ts
git mv lib/passives/mutable.ts lib/model/mutable.ts
git mv lib/passives/net-preference.ts lib/model/net-preference.ts
```

Update every import of `../passives/` or `lib/passives/` to `../model/` / `lib/model/`. Find them with:

```bash
grep -rln "passives/" --include='*.ts' --include='*.tsx' . | grep -v node_modules
```

Run `bun run typecheck` until clean. Do not rename `PassiveNetwork` yet — that is Step 3.

- [ ] **Step 2: Mark the Pultec reference unvalidated**

Add this to the top of `docs/pultec/provenance.md`, immediately under the title:

```markdown
> **UNVALIDATED.** No unit has been built from this model. Validation would
> require building the circuit from the schematic, which is out of scope. The
> model is additionally known to be incomplete: the hi boost resonant branch is
> absent and the mid capacitor values are placeholders (see `unresolved.md`).
> Any response computed from it is the response of this subset, not of a built
> unit. Do not treat it as a reference for a working circuit.
```

- [ ] **Step 3: Delete the six tscircuit Pultec modules and their tests**

```bash
git rm -r modules/pultec-hi-boost modules/pultec-hi-cut modules/pultec-low-boost \
          modules/pultec-low-cut modules/pultec-mid modules/pultec-passive-eq
git rm tests/modules/hi-boost.test.tsx tests/modules/hi-cut.test.tsx \
       tests/modules/low-boost.test.tsx tests/modules/low-cut.test.tsx \
       tests/modules/mid.test.tsx tests/modules/passive-eq.test.tsx \
       tests/modules/unsplit-vs-composed.test.tsx
```

Then remove their entries from `modules/index.ts` and `lib/index.ts`.

- [ ] **Step 4: Delete the export seam if it is now unused**

```bash
grep -rn "circuit-json" --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v "^./lib/export"
```

If that returns nothing, the seam exists only for the deleted tests:

```bash
git rm lib/export/circuit-json.ts tests/export/circuit-json.test.ts
```

If it returns matches, list them in the task report and leave the file — something still depends on it and deleting it is not this task's call.

- [ ] **Step 5: Run everything**

```bash
bun run typecheck
bun test
```

Expected: green. The suite shrinks by the deleted module tests; `tests/topology.test.ts`, `tests/control-state.test.ts`, `tests/sim/*` and `tests/pultec/*` must all still pass, because none of them depended on tscircuit.

Report the before/after test counts.

- [ ] **Step 6: Commit**

Component deletion and its replacement belong in one commit per the global constraints, and here the replacement already existed — so this single commit removes the superseded representation and nothing is left in two forms.

```bash
git add -A
git commit -F <message file>
```

---

## Self-Review

**Spec coverage.** §3 types — Task 2. §3.1 kinds — Task 2 (active kinds declared; their simulation is Plan B). §3.3 identity — Task 7 (`DESIGNATORS` keeps designators out of circuit source). §3.4/§3.5 pin vocabulary and where mappings live — Task 2, and `PIN_NUMBERS` in Task 7 sits on the circuit, not the kind. §4 authoring — Tasks 4, 5. §4.1 no implicit global nets — Task 5. §4.3 floating rule — Task 3. §5.5 structural-only circuits — Task 7 (`pt2399-core` has no behavioural targets and is migrated anyway). §7 repo structure — Tasks 2-8. §9.1 preserve the compressor spec — Task 1. §9.4 deletions — Task 8.

**Deferred to Plan B, deliberately:** `opamp`/`bjt`/`diode`/`photoresistor` are declared as kinds in Task 2 but no circuit uses them here; multi-unit authoring has no builder shorthand yet (`add()` is the escape hatch) because no Plan A circuit is multi-unit. `resolveNetwork`'s `a`/`b` generalisation (spec §3.1) is untouched — no Plan A circuit needs simulation. **Plan B must generalise it before the compressor can simulate.**

**Deferred to Plan C:** `.kicad_sch` parsing, the sync baseline, the three-way merge, the mutation-preservation gate, and removal of the `tscircuit` dependency — `modules/opamp-buffer/` still uses it and is Plan B's to port.

**Known gap, stated rather than hidden:** `lib/model/topology.ts` still defines `PassiveNetwork` alongside the new `Network`. Two network types coexist until Plan B unifies them. This is the one place Plan A leaves a second representation, and it is load-bearing: `reference/pultec/`, `control-state.ts` and all of `lib/sim/` are typed against `PassiveNetwork`, and converting them is Plan B's work. **Plan B's first task must be that unification.**
