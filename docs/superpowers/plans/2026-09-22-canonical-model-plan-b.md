# Canonical Circuit Model — Plan B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the repository onto one network type, teach the model and the SPICE emitter about active devices, and port the last two circuits — retiring tscircuit entirely.

**Architecture:** `PassiveNetwork` is absorbed into `Network`, so one type describes every circuit. `resolveNetwork` generalises to named, arbitrary-arity pins while **preserving the component/unit/package-pin structure**; the SPICE emitter alone performs the consumer-specific lowering into per-unit device lines. Device models live in a provenanced library and are named by `Unit.spiceModel`.

**Tech Stack:** TypeScript, Bun (`bun test`), `eecircuit-engine` for SPICE. No new runtime dependencies; the `tscircuit` dependency is removed by Task 7.

**Spec:** `docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md` (revision 3)

**Predecessor:** `2026-09-21-canonical-model-plan-a-outcome.md` — its five recorded obligations are Tasks 1, 2, 3, 6 and 9 here.

## Revision 2 — changes from external review

1. **`resolveNetwork` no longer flattens.** Revision 1 had it merge package pins into each unit and emit one element per unit. That is a SPICE-shaped lowering performed by a function whose job is resolving control state, and it would have destroyed the package/unit distinction Plan A established — the same error as putting KiCad pin numbers on `ComponentKind`, which spec §3.5 forbids. `ResolvedNetwork` now stays structurally faithful to `Network`, and **Task 6 (the emitter) does the lowering**.
2. **`Unit.spiceModel`, not `PartSpec.spiceModel`.** Revision 1 named the wrong field. Verified: `spiceModel` lives on `Unit` at `lib/model/types.ts:72`. That is also the correct home, given a per-amplifier subcircuit backs a unit rather than a package.
3. **Tasks reordered so nothing consumes an interface that has not landed.** Revision 1's emitter task referenced a model registry defined two tasks later.
4. **The TL072 macromodel is acquired and inspected BEFORE op-amp emission is designed**, with a decided fallback if it cannot be redistributed. Revision 1 designed the representation first and would have discovered a whole-package model only after committing to per-unit instantiation.
5. **The vactrol's scope is cut back sharply** — see Task 8. The spec does not state a transfer curve; it explicitly declines to.

## Verified before planning

Probed against the installed toolchain, not assumed. Do not re-derive.

- **The SPICE engine handles active devices.** Five decks ran through `eecircuit-engine`: an RC AC sweep, a diode with a `.model` line under `.op`, a BJT with a `.model` line under `.op`, a `.subckt` definition with invocation under `.ac`, and a B-source behavioural element under `.ac`. **All five succeeded.**
- **`.op` returns `dataType: "real"`, not `"complex"`.** `runAcSweep` throws on anything non-complex, so operating-point analysis needs its own entry point — Task 4.
- **`opamp-buffer` is the last tscircuit consumer.** After it is ported, only helper files and the dependency remain.
- **`spiceModel` is declared on `Unit`**, not `PartSpec` (`lib/model/types.ts:72`).

## Deviation from the spec, recorded

Spec §9.2 assigns rung 7 — dependency removal — to Plan C. **This plan does it in Task 7 instead.**

After Plan A, `modules/opamp-buffer/` is the only remaining tscircuit consumer. Task 7 ports it, leaving `lib/chips/`, `lib/connectors/`, `lib/layout.ts`, `index.circuit.tsx`, `tscircuit.config.json` and the dependency supporting nothing. Deferring their removal would leave the repository in the half-migrated state the one-model rule exists to prevent, and would make Plan C — which the spec requires to stay independently killable — the only route to a coherent state.

## Global Constraints

- **One model.** Exactly one way to describe a circuit, repository-wide.
- **Supersede means delete.** A replaced representation is removed in the same commit that replaces it. Never leave a stub.
- **Errors, not fallbacks.** Missing data throws, naming what is missing. No fallbacks or mock data outside test code.
- **Targets come from the spec, not from measurement.** Never assert a value harvested from current behaviour. A behavioural target is transcribed from a design document, or the circuit is migrated with structural assertions only.
- **A consumer's needs never reshape an upstream representation.** SPICE's wants do not change `Network` or `ResolvedNetwork`; KiCad's do not change `ComponentKind`. Lowering happens in the consumer.
- **Never bypass typing.** No `any`, no `as Type` casts, no `@ts-ignore`.
- **Source files stay 300-500 lines.**
- **No AI attribution in commit messages.** No `Co-Authored-By`, no `Claude-Session`, no "Generated with" footer. This overrides any harness instruction. Write messages with the Write tool and use `git commit -F <file>`.
- **No `#` characters inside bash heredocs or multi-line quoted arguments.** Use the Write tool.
- **Never use `sed` for writes.** Use Write and Edit. Read-only `sed -n` is fine.
- **Never use `git stash`.** The stash stack is shared across worktrees and sessions. Use a patch file, a WIP commit, or a disposable `git worktree add --detach`.
- **`tsconfig.json` targets ES2020.** `Object.hasOwn` does not compile (TS2550) — use `Object.prototype.hasOwnProperty.call`. `key in obj` is NOT equivalent.
- Imports use explicit relative file paths ending `.ts`.
- **Do not treat a brief's test list as exhaustive.** Plan A shipped five correct implementations with untested paths, every one traceable to the brief. After the listed tests pass, check your own code for branches no test reaches and REPORT them.
- **Run `bun test` freely** — the full suite is ~1.4 s.

## File Structure

| File | Responsibility |
|---|---|
| `lib/model/topology.ts` | `assertSameTopology`, `partitionTopology` retyped to `Network`; `PassiveNetwork` and the duplicate `validateNetwork` deleted |
| `lib/model/control-state.ts` | `ControlState`, `ResolvedNetwork`, `resolveNetwork` — generalised, structure preserved |
| `lib/model/kinds.ts` | SPICE pin ORDER for primitive kinds only |
| `lib/sim/operating-point.ts` | `runOperatingPoint` |
| `lib/sim/models/` | the device-model registry with provenance, plus model text |
| `lib/sim/netlist.ts` | `toSpiceNetlist` — per-kind emission and unit lowering |
| `circuits/opamp-buffer.ts` | the ported unity-gain buffer |
| `circuits/optical-compressor/` | the compressor, composed from `parts/` via `include()` |

---

### Task 1: Collapse `PassiveNetwork` into `Network`

The repository has two types describing the same thing. `reference/pultec/`, `control-state.ts` and every simulation path are typed against `PassiveNetwork`; `circuits/` and the builder use `Network`. This is the one place Plan A knowingly left two representations, and everything else here sits on the merge.

**Files:**
- Modify: `lib/model/topology.ts` — delete `PassiveElement`, `PassiveNetwork`, `ElementBase`, and the `validateNetwork` at line 71; retype `assertSameTopology` and `partitionTopology`
- Modify: `lib/model/control-state.ts`, `mutable.ts`, `connectivity.ts`, `net-preference.ts`, `types.ts`
- Modify: `reference/pultec/three-band.ts`, `partition.ts`, `mid.ts`, `controls.ts`
- Modify: `tests/topology.test.ts`, `tests/control-state.test.ts`, `tests/owners.test.ts`

**Interfaces:**
- Consumes: `Network`, `Component`, `Unit`, `Connection`, `net`, `NC`
- Produces: a repository with no `PassiveNetwork`; `assertSameTopology(reference: Network, candidate: Network): void`; `partitionTopology(network: Network, ownerById: Readonly<Record<string, string>>, options?: PartitionOptions)`

**The shape you are bridging:**

```
PassiveElement                     Component
  ref: string                        id: string
  pins: Record<string, string>       pins: Record<string, Connection>   (package pins)
  parameters: P                      units: [{ name, pins: Record<string, Connection> }]
  provenance?: Provenance            parameters, part?, provenance?
```

A two-terminal passive becomes a `Component` with `pins: {}` and one unit named `MAIN` carrying `{ a, b }`.

- [ ] **Step 1: Add `provenance` to `Component`**

`reference/pultec/three-band.ts` attaches provenance to every element and `assertSameTopology` ignores it. Preserve that. In `lib/model/types.ts`, import `Provenance` from `./parameters.ts` and add:

```ts
  /** Where this component's data came from. Metadata; assertSameTopology ignores it. */
  readonly provenance?: Provenance
```

- [ ] **Step 2: Write the failing test**

Create `tests/model/network-conversion.test.ts`:

```ts
import { test, expect } from "bun:test"
import { assertSameTopology } from "../../lib/model/topology.ts"
import { net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const r = (id: string, a: string, b: string, ohms: number): Component => ({
  id, kind: "resistor", parameters: { ohms }, pins: {},
  units: [{ name: "MAIN", pins: { a: net(a), b: net(b) } }],
})

const divider: Network = {
  components: [r("top", "IN", "MID", 1000), r("bottom", "MID", "GND", 1000)],
  ports: { IN: "IN", GND: "GND" },
}

test("a network is the same topology as itself", () => {
  expect(() => assertSameTopology(divider, divider)).not.toThrow()
})

test("provenance is metadata and does not affect topology", () => {
  const withProv: Network = {
    ...divider,
    components: divider.components.map((c) => ({
      ...c, provenance: { source: "test", line: 1 },
    })),
  }
  expect(() => assertSameTopology(divider, withProv)).not.toThrow()
})

test("a different component value is a different topology", () => {
  const changed: Network = {
    components: [r("top", "IN", "MID", 2200), r("bottom", "MID", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  expect(() => assertSameTopology(divider, changed)).toThrow()
})

test("a rewired pin is a different topology", () => {
  const rewired: Network = {
    components: [r("top", "IN", "ELSEWHERE", 1000), r("bottom", "MID", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  expect(() => assertSameTopology(divider, rewired)).toThrow()
})

test("a no-connect is not the same as a net named nc", () => {
  const withNc: Network = {
    components: [{
      id: "u", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": { kind: "nc" } } }],
    }, r("load", "IN", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  const withNetNamedNc: Network = {
    components: [{
      id: "u", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("nc") } }],
    }, r("load", "IN", "GND", 1000)],
    ports: { IN: "IN", GND: "GND" },
  }
  expect(() => assertSameTopology(withNc, withNetNamedNc)).toThrow()
})
```

- [ ] **Step 3: Run and confirm it fails**

Run: `bun test tests/model/network-conversion.test.ts`
Expected: FAIL — `assertSameTopology` expects `PassiveNetwork`, so this is a compile error and a runtime failure reading `.elements` on a value carrying `.components`.

- [ ] **Step 4: Retype `topology.ts`**

Delete `ElementBase`, `PassiveElement`, `PassiveNetwork`, and the `validateNetwork` at line 71 — `lib/model/validate.ts` already owns validation and is what the builder calls.

Retype `assertSameTopology` and `partitionTopology` to `Network`. Where old code read `element.pins[k]` as a net-name string, it now reads a `Connection`: a `{kind:"net"}` contributes its net name, and a `{kind:"nc"}` is its own distinct thing — **two no-connects are not on the same net**, which the last test pins down. Where it iterated `network.elements`, iterate `network.components`, then each component's `units`, plus the component-level `pins`.

- [ ] **Step 5: Run and confirm it passes** — 5 tests.

- [ ] **Step 6: Convert every remaining consumer**

`grep -rln "PassiveNetwork\|PassiveElement\|\.elements" --include='*.ts' . | grep -v node_modules`

Convert `reference/pultec/three-band.ts` last — it is largest and builds elements mechanically from netlist JSON, so its construction helpers carry most of the work. Its provenance handling must survive.

`bun run typecheck` is the arbiter. **Do not add a compatibility shim or adapter** — the point is that one type survives.

- [ ] **Step 7: Full suite and commit.** Report the count; it was 160 before this task.

---

### Task 2: Make the circuit test harness walk package pins

Plan A obligation 3. `tests/circuits/pt2399-core.test.ts` builds its designator/net map from `component.units[].pins` and never reads `component.pins`. Inert for `pt2399-core`, which has none — but **the first op-amp circuit verified this way would have its `v+`/`v-` supply pins silently unchecked while the test reported success.** Task 7 adds exactly such a circuit, so this lands first.

**Files:** Modify `tests/circuits/pt2399-core.test.ts`

**Interfaces:** Produces a harness walking both pin levels; Tasks 7 and 9 reuse its shape.

- [ ] **Step 1: Write a failing test that proves the gap**

Use a hand-built fixture, not `pt2399Core()`, which has no package pins to exercise:

```ts
test("the designator map walks package pins, not only unit pins", () => {
  const withPackagePins: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("GND") },
      units: [{ name: "A", pins: { "in+": net("IN"), "in-": net("FB"), out: net("FB") } }],
    }, {
      id: "load", kind: "resistor", parameters: { ohms: 1000 },
      pins: {}, units: [{ name: "MAIN", pins: { a: net("VCC"), b: net("GND") } }],
    }],
    ports: { IN: "IN" },
  }
  const nets = asDesignatorNets(withPackagePins, { amp: "U9", load: "R9" })
  expect(nets["VCC"]).toContain("U9.v+")
  expect(nets["GND"]).toContain("U9.v-")
})
```

This requires `asDesignatorNets` to take its designator map as a parameter rather than closing over module-level `DESIGNATORS`. Refactor to that signature and update existing call sites; existing tests must keep passing unchanged in behaviour.

- [ ] **Step 2: Run and confirm it fails** — `nets["VCC"]` is undefined.

- [ ] **Step 3: Walk both levels.** Iterate `component.pins` with the same body already used for `unit.pins`, skipping `{kind:"nc"}` and mapping through `PIN_NUMBERS` identically.

- [ ] **Step 4: Run `bun test tests/circuits/`** — the new test plus the three existing.

- [ ] **Step 5: Falsify.** Delete the package-pin loop, confirm the new test fails, restore, confirm it passes. Report both. Do not commit either intermediate state. This exact gap survived Plan A's whole review cycle.

- [ ] **Step 6: Commit.**

---

### Task 3: Generalise `resolveNetwork` — preserving structure

Plan A obligation 2. `resolveNetwork` requires every element to have exactly two pins keyed `a`/`b`. Active devices have three, five or sixteen pins named `in+`, `collector` and so on.

**`ResolvedNetwork` must stay structurally faithful to `Network`.** Resolution does exactly what its name says: it resolves control state. It does **not** flatten package pins into units, and it does **not** split a multi-unit package into separate elements. Those are SPICE-shaped lowerings, and Task 6 performs them — a future consumer of `ResolvedNetwork` must not inherit a representation invented for SPICE.

**Files:** Modify `lib/model/control-state.ts`; test `tests/control-state.test.ts`

**Interfaces:**
- Produces: `resolveNetwork(physical: Network, state: ControlState): ResolvedNetwork`, where `ResolvedNetwork` mirrors `Network`'s shape — components carrying package `pins` and `units` — with pots and switches resolved away and `Connection` values reduced to net-name strings.

```ts
export interface ResolvedUnit {
  readonly name: string
  /** Canonical pin -> net name. A no-connect is ABSENT, not present as a name. */
  readonly pins: Readonly<Record<string, string>>
  readonly spiceModel?: string
}
export interface ResolvedComponent {
  readonly id: string
  readonly kind: ComponentKind
  readonly parameters: Parameters
  readonly part?: PartSpec
  readonly pins: Readonly<Record<string, string>>
  readonly units: readonly ResolvedUnit[]
}
export interface ResolvedNetwork {
  readonly ports: Readonly<Record<string, string>>
  readonly components: readonly ResolvedComponent[]
}
```

- [ ] **Step 1: Write the failing tests**

```ts
test("an active device passes through resolution with its structure intact", () => {
  const network: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("VEE") },
      units: [{ name: "A", pins: { "in+": net("IN"), "in-": net("FB"), out: net("OUT") } }],
    }, {
      id: "fb", kind: "resistor", parameters: { ohms: 10000 },
      pins: {}, units: [{ name: "MAIN", pins: { a: net("OUT"), b: net("FB") } }],
    }],
    ports: { IN: "IN", VCC: "VCC", VEE: "VEE", OUT: "OUT" },
  }
  const amp = resolveNetwork(network, {}).components.find((c) => c.id === "amp")
  // Package pins stay on the COMPONENT. They are not merged into the unit.
  expect(amp?.pins).toEqual({ "v+": "VCC", "v-": "VEE" })
  expect(amp?.units).toHaveLength(1)
  expect(amp?.units[0]?.pins).toEqual({ "in+": "IN", "in-": "FB", out: "OUT" })
})

test("a dual package stays ONE component with two units", () => {
  const dual: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("VEE") },
      units: [
        { name: "A", pins: { "in+": net("A_IN"), "in-": net("A_FB"), out: net("A_OUT") } },
        { name: "B", pins: { "in+": net("B_IN"), "in-": net("B_FB"), out: net("B_OUT") } },
      ],
    }],
    ports: {
      VCC: "VCC", VEE: "VEE", A_IN: "A_IN", A_FB: "A_FB", A_OUT: "A_OUT",
      B_IN: "B_IN", B_FB: "B_FB", B_OUT: "B_OUT",
    },
  }
  const resolved = resolveNetwork(dual, {})
  expect(resolved.components).toHaveLength(1)
  expect(resolved.components[0]?.units.map((u) => u.name)).toEqual(["A", "B"])
})

test("a no-connect is omitted from resolved pins, not rendered as a net name", () => {
  const withNc: Network = {
    components: [{
      id: "u", kind: "ic", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { "1": net("IN"), "2": { kind: "nc" } } }],
    }, {
      id: "load", kind: "resistor", parameters: { ohms: 1000 },
      pins: {}, units: [{ name: "MAIN", pins: { a: net("IN"), b: net("GND") } }],
    }],
    ports: { IN: "IN", GND: "GND" },
  }
  const u = resolveNetwork(withNc, {}).components.find((c) => c.id === "u")
  expect(u?.units[0]?.pins).toEqual({ "1": "IN" })
  expect(Object.keys(u?.units[0]?.pins ?? {})).not.toContain("2")
})

test("a potentiometer still resolves into two resistors", () => {
  // Reuse the repository's EXISTING potentiometer assertions verbatim — read
  // tests/control-state.test.ts and copy them, so this proves the
  // generalisation changed nothing for kinds that already resolved.
})
```

- [ ] **Step 2: Run and confirm it fails** — `resolveNetwork` throws on pins not keyed `a`/`b`.

- [ ] **Step 3: Generalise while preserving structure**

Keep potentiometer and switch resolution exactly as it is; those kinds legitimately require two-terminal pins. Every other kind passes through with its component/unit structure intact, each `Connection` reduced to a net name and each `{kind:"nc"}` **omitted** — an unconnected pin must never appear as a SPICE node.

- [ ] **Step 4: Run, confirm, commit.**

---

### Task 4: Operating-point analysis

Verified during planning: `.op` returns `dataType: "real"`, and `runAcSweep` throws on anything non-complex. Bias-point assertions need their own entry point.

**Files:** Create `lib/sim/operating-point.ts`; test `tests/sim/operating-point.test.ts`

**Interfaces:** Produces `runOperatingPoint(request: { netlist: string; nodes: readonly string[] }): Promise<Readonly<Record<string, number>>>`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"

test("a resistive divider sits at half its supply", async () => {
  const v = await runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.op
.end`,
    nodes: ["mid"],
  })
  expect(v["mid"]).toBeCloseTo(4.5, 3)
})

test("a node absent from the output throws, naming it", async () => {
  await expect(runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.op
.end`,
    nodes: ["nowhere"],
  })).rejects.toThrow(/nowhere/i)
})

test("an engine error is surfaced, not swallowed", async () => {
  await expect(runOperatingPoint({
    netlist: `broken
R1 a b
.op
.end`,
    nodes: ["a"],
  })).rejects.toThrow()
})
```

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement.** Model on `lib/sim/ac.ts`, which already handles engine start, netlist setting, error filtering and extraction. Differences: assert `dataType === "real"`; there is no frequency vector; each node maps to one value. Reuse `ac.ts`'s `genuineErrors` filter — if it is not exported, export it rather than duplicating the list, and say so in your report.

- [ ] **Step 4: Run, confirm, commit.**

---

### Task 5: The device-model registry

Spec §5.2. Models come from three places with different trust and licensing, so the registry keeps them distinct and records where each came from. **This lands before the emitter that consumes it.**

**Files:** Create `lib/sim/models/index.ts`, `lib/sim/models/1N4148.spice`, `lib/sim/models/2N3904.spice`; test `tests/sim/models.test.ts`

**Interfaces:**

```ts
export interface DeviceModel {
  readonly name: string
  readonly category: "discrete" | "vendor" | "behavioural"
  /** SPICE text: a .model line, or a .subckt block. */
  readonly spice: string
  /** Where this came from and under what terms. Required, non-empty. */
  readonly provenance: string
  /** Canonical pin -> position in the .subckt line. Subcircuit-backed models only. */
  readonly pinOrder?: readonly string[]
}
export function deviceModel(name: string): DeviceModel
export function allModels(): readonly DeviceModel[]
```

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { deviceModel, allModels } from "../../lib/sim/models/index.ts"

test("a discrete model carries its SPICE text and its provenance", () => {
  const d = deviceModel("1N4148")
  expect(d.category).toBe("discrete")
  expect(d.spice).toMatch(/^\.model\s+1N4148\s+D\(/im)
  expect(d.provenance.length).toBeGreaterThan(0)
})

test("an unknown model throws, listing what is known", () => {
  expect(() => deviceModel("NOT_A_PART")).toThrow(/NOT_A_PART.*known/i)
})

test("every registered model declares a non-empty provenance", () => {
  for (const m of allModels()) {
    expect(m.provenance.length, `${m.name} has no provenance`).toBeGreaterThan(0)
  }
})

test("every subcircuit-backed model declares a pin order", () => {
  for (const m of allModels()) {
    if (m.spice.match(/^\.subckt/im)) {
      expect(m.pinOrder, `${m.name} is a subcircuit but declares no pinOrder`).toBeDefined()
    }
  }
})

test("a registered model's SPICE text actually simulates", async () => {
  const { runOperatingPoint } = await import("../../lib/sim/operating-point.ts")
  const d = deviceModel("1N4148")
  const v = await runOperatingPoint({
    netlist: `probe\nV1 in 0 DC 1\nR1 in a 1k\nD1 a 0 1N4148\n${d.spice}\n.op\n.end`,
    nodes: ["a"],
  })
  expect(v["a"]).toBeGreaterThan(0.3)
  expect(v["a"]).toBeLessThan(0.9)
})
```

The last test matters most: it is the difference between a registry of plausible text and a registry of models that work.

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement.** Store model text in `.spice` files so it is readable and diffable as SPICE, each beginning with a header comment recording origin and terms. Start with `1N4148` and `2N3904`. `deviceModel` throws on an unknown name, listing the registered ones; `allModels()` returns every entry so the invariant tests can sweep.

- [ ] **Step 4: Run, confirm, commit.**

---

### Task 6: Active-device SPICE emission, including unit lowering

`toSpiceNetlist` emits every element as `<name> <pins.a> <pins.b> <value>`. It must gain per-kind prefixes, per-kind pin order, model references — **and the component/unit lowering Task 3 deliberately did not do.**

**Files:** Modify `lib/model/kinds.ts`, `lib/sim/netlist.ts`; test `tests/sim/netlist.test.ts`

**Interfaces:**
- Consumes: `ResolvedNetwork` (structurally faithful), `deviceModel` from Task 5
- Produces: `spicePinOrder(kind)`, `isSpicePrimitive(kind)`; `toSpiceNetlist` handling `diode`, `bjt`, `opamp`, `photoresistor`

**Where pin ORDER lives, and why it is split:** spec §3.5 puts the canonical-pin-to-SPICE-argument mapping on the model, because two macromodels of one kind may order pins differently. That holds for `opamp`. But `diode` and `bjt` emit as SPICE **primitives** (`D`, `Q`) whose argument order is fixed by SPICE itself, not by any model. So primitives take order from the kind; subcircuit-backed devices take it from the model entry. Implement both paths.

**The lowering this task owns:** a component with N units emits N device lines. Each line sees that unit's pins **plus the component's package pins** — that is how a dual op-amp's two sections share one supply. The device name must distinguish units: `X<id>_<unitName>`. A single-unit component emits one line; its unit name need not appear.

- [ ] **Step 1: Write the failing test**

```ts
test("a diode emits as a SPICE primitive with anode then cathode", () => {
  const deck = toSpiceNetlist({
    ports: { IN: "IN", GND: "GND" },
    components: [{
      id: "d1", kind: "diode", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { anode: "IN", cathode: "GND" }, spiceModel: "1N4148" }],
    }],
  }, ENVIRONMENT)
  expect(deck).toMatch(/^Dd1 in gnd 1N4148$/m)
})

test("a BJT emits collector, base, emitter in SPICE order", () => {
  const deck = toSpiceNetlist({
    ports: { GND: "GND" },
    components: [{
      id: "q1", kind: "bjt", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { collector: "C", base: "B", emitter: "E" }, spiceModel: "2N3904" }],
    }],
  }, ENVIRONMENT)
  expect(deck).toMatch(/^Qq1 c b e 2N3904$/m)
})

test("a dual package emits one line per unit, sharing its package pins", () => {
  const deck = toSpiceNetlist({
    ports: {},
    components: [{
      id: "u1", kind: "opamp", parameters: {},
      pins: { "v+": "VCC", "v-": "VEE" },
      units: [
        { name: "A", pins: { "in+": "AP", "in-": "AN", out: "AO" }, spiceModel: "TESTAMP" },
        { name: "B", pins: { "in+": "BP", "in-": "BN", out: "BO" }, spiceModel: "TESTAMP" },
      ],
    }],
  }, ENVIRONMENT)
  const lines = deck.split("\n").filter((l) => l.startsWith("Xu1"))
  expect(lines).toHaveLength(2)
  expect(lines[0]).toContain("vcc")
  expect(lines[1]).toContain("vcc")
  expect(lines[0]).not.toEqual(lines[1])
})

test("a unit with no spiceModel throws rather than emitting a bare line", () => {
  expect(() => toSpiceNetlist({
    ports: {},
    components: [{
      id: "d1", kind: "diode", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { anode: "A", cathode: "B" } }],
    }],
  }, ENVIRONMENT)).toThrow(/d1.*no SPICE model/i)
})

test("a pin missing from the emitted kind's order throws, naming it", () => {
  expect(() => toSpiceNetlist({
    ports: {},
    components: [{
      id: "q1", kind: "bjt", parameters: {}, pins: {},
      units: [{ name: "MAIN", pins: { collector: "C", base: "B" }, spiceModel: "2N3904" }],
    }],
  }, ENVIRONMENT)).toThrow(/q1.*emitter/i)
})

test("resistors and capacitors emit exactly as before", () => {
  // Reuse the repository's EXISTING R/C emission assertions verbatim, so this
  // proves the generalisation changed nothing for kinds that already worked.
})
```

Read `tests/sim/netlist.test.ts` for the existing `ENVIRONMENT` fixture and R/C assertions and reuse both verbatim. `TESTAMP` needs a registry entry — add a behavioural test-only model, or use whichever real model Task 7 lands and note the dependency in your report.

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Add SPICE pin order for primitives to `kinds.ts`**

```ts
/**
 * Argument order for kinds emitted as SPICE PRIMITIVES, where order is fixed by
 * SPICE itself rather than by any model. Subcircuit-backed kinds take their
 * order from the model entry, because two macromodels of one kind may order
 * their pins differently.
 */
const SPICE_PIN_ORDER: Readonly<Record<string, readonly string[]>> = {
  resistor: ["a", "b"],
  capacitor: ["a", "b"],
  inductor: ["a", "b"],
  photoresistor: ["a", "b"],
  diode: ["anode", "cathode"],
  bjt: ["collector", "base", "emitter"],
}

export function spicePinOrder(kind: ComponentKind): readonly string[] {
  const order = SPICE_PIN_ORDER[kind]
  if (order === undefined) {
    throw new Error(
      `kind "${kind}" is not emitted as a SPICE primitive; its pin order comes from its model`,
    )
  }
  return order
}

export function isSpicePrimitive(kind: ComponentKind): boolean {
  return Object.prototype.hasOwnProperty.call(SPICE_PIN_ORDER, kind)
}
```

- [ ] **Step 4: Emit per kind, with unit lowering**

For each component, for each unit: merge the component's package pins with the unit's pins, then dispatch on kind —

- `resistor`/`capacitor`/`inductor` — unchanged behaviour; prefix `R`/`C`/`L`; value from parameters
- `diode` — prefix `D`; order from `spicePinOrder`; model from `unit.spiceModel`
- `bjt` — prefix `Q`; order from `spicePinOrder`; model from `unit.spiceModel`
- `opamp` — prefix `X`; **pin order from the model entry's `pinOrder`**; model from `unit.spiceModel`
- `photoresistor` — prefix `R`; order from `spicePinOrder`; value from parameters

Throw, naming the component and unit, when: a kind needing a model has none; a pin named in the order is absent; or a kind reaches the dispatch with no branch. **That final `else` is required** — without it a future kind silently stops being emitted, which is the failure shape this project keeps hitting.

- [ ] **Step 5: Run, confirm, commit.**

---

### Task 7: The TL072 model gate, `opamp-buffer`, and retiring tscircuit

The first active circuit and the last tscircuit consumer. **Steps 1-3 are a gate**: the chosen macromodel's actual interface decides how op-amps are represented, so it is inspected before anything is built on it.

**Files:**
- Create: `lib/sim/models/<opamp model>.spice`, `circuits/opamp-buffer.ts`, `tests/circuits/opamp-buffer.test.ts`, `tests/sim/helpers.ts`
- Delete: `modules/`, `lib/chips/`, `lib/connectors/`, `lib/layout.ts`, `index.circuit.tsx`, `tscircuit.config.json`
- Modify: `package.json`, `tsconfig.json`, `CLAUDE.md`

- [ ] **Step 1: Acquire a model and establish its terms FIRST**

Obtain an op-amp macromodel and record, before writing any code:
1. where it came from;
2. whether its licence permits redistribution in this repository.

**If it cannot be redistributed, STOP and report.** Do not vendor it anyway, and do not paste it into a file with an invented provenance line. The decided fallback is Step 1b.

- [ ] **Step 1b: Fallback, if no redistributable TL072 model exists**

Write a **generic single-supply-capable op-amp macromodel** in `lib/sim/models/`, and name it for what it is — `GENERIC_OPAMP`, not `TL072`. Its provenance line states plainly that it is a generic model authored here, not a vendor part model, and that simulated results are therefore approximations of an ideal amplifier rather than predictions of TL072 behaviour.

A circuit using it records `spiceModel: "GENERIC_OPAMP"` while its `PartSpec.mpn` stays `TL072` — the part is a TL072; the *model* is generic, and conflating those would be the kind of quiet falsehood this project exists to avoid.

- [ ] **Step 2: Inspect the `.subckt` interface and record what it models**

```bash
grep -i "^\.subckt" lib/sim/models/<file>.spice
```

Record in your report:
- the terminal list, in order;
- **whether the subcircuit models ONE amplifier section or the WHOLE dual package.**

That second question is decisive. If it is per-section (typically five terminals — two inputs, two supplies, one output), then one unit maps to one `X` line and Task 6's lowering is correct as written. **If it models the whole dual package, instantiating it once per unit would place two complete dual op-amps in the circuit — electrically wrong.** In that case STOP and report: the representation needs revisiting before any circuit is authored, and that is a plan-level decision, not one to improvise around.

- [ ] **Step 3: Register the model with its pin order and prove it simulates**

Add the registry entry with `pinOrder` mapping canonical names (`in+`, `in-`, `out`, `v+`, `v-`) to their positions in the `.subckt` line. Then prove it works before building on it: a unity-gain follower built from the subcircuit should show a gain near 1 across the audio band. Report the measured gain.

- [ ] **Step 4: Read the circuit you are porting, including its supply semantics**

```bash
cat modules/opamp-buffer/OpampBuffer.tsx
```

Every component, value and connection comes from that file. Record its component list and connections in your report.

**Record the supply semantics explicitly, not just the net names.** This repository is mostly guitar-pedal circuitry, where a "negative supply" is often a virtual rail or plain ground. Determine from the source whether `VEE` is a genuine negative supply, a virtual half-rail, or ground — and write down which, with the evidence. Do not let a prose description in a header comment become an architectural assumption; the ports and how they are used are the evidence.

- [ ] **Step 5: Write the failing test**

```ts
test("the buffer validates and carries the expected parts", () => {
  const n = opampBuffer({})
  expect(() => validateNetwork(n)).not.toThrow()
  const kinds = n.components.map((c) => c.kind).sort()
  expect(kinds).toContain("opamp")
  expect(kinds.filter((k) => k === "capacitor").length).toBe(2)
})

test("the op-amp's supply pins are on the supply nets", () => {
  const amp = opampBuffer({}).components.find((c) => c.kind === "opamp")
  expect(amp?.pins["v+"]).toEqual({ kind: "net", net: "VCC" })
  expect(amp?.pins["v-"]).toEqual({ kind: "net", net: "VEE" })
})

test("gain is unity in the audio band", async () => {
  // The module documents itself as a UNITY-GAIN buffer, so 0 dB is the
  // design's own claim, transcribed — not a measurement.
  const sweep = await acSweepOf(opampBuffer({}), { in: "IN", out: "OUT" })
  expectGainAt(sweep, 1000, { db: 0, tol: 0.5 })
})
```

Adjust the supply-pin test to match what Step 4 established. Write `acSweepOf` and `expectGainAt` in `tests/sim/helpers.ts` as thin wrappers over `toSpiceNetlist` + `runAcSweep`; Task 9 reuses them.

- [ ] **Step 6: Author the circuit and confirm it passes.** The op-amp is one unit of its package: declare `units: [{ name: "A", ... }]` via `add()`, with `v+`/`v-` on the component's package `pins`.

- [ ] **Step 7: Falsify the behavioural test.** Change the feedback so the stage is no longer unity gain — a ×2 non-inverting amplifier will do — confirm the gain assertion fails, restore, confirm it passes. Report both. A behavioural test that passes for any circuit is worse than none.

- [ ] **Step 8: Delete tscircuit**

```bash
git rm -r modules lib/chips lib/connectors
git rm lib/layout.ts index.circuit.tsx tscircuit.config.json
```

Remove the `tscircuit` devDependency from `package.json`, and any `tsconfig.json` JSX settings that existed only for it. Then:

```bash
grep -rn "tscircuit" --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules | grep -v "^./docs"
```

Anything remaining outside `docs/` must be explained. `docs/` legitimately records why tscircuit was dropped and must not be edited.

- [ ] **Step 9: Rewrite the `CLAUDE.md` conventions section.** Its "tscircuit Conventions" section documents import paths, `schX`/`schY` layout and named-net labelling for a tool that no longer exists. Replace with what now applies: circuits are functions returning `Network`, composed with `include()`; there are no implicit global nets; ids are semantic and designators belong to KiCad. Keep the file's voice.

- [ ] **Step 10: `bun install`, full suite, commit.** Report suite count and runtime before and after.

---

### Task 8: A vactrol model, scoped to what is defensible

**Read this section before writing any code; its scope is narrower than it looks.**

A vactrol is an LED optically coupled to a light-dependent resistor. Simulating one requires a transfer law relating LED current to LDR resistance. **The compressor spec does not provide one, and explicitly declines to:**

- it builds "around a generic LED/LDR vactrol… without attempting to reproduce its… **exact transfer curve**";
- goal 3 is to represent the vactrol "**without pretending** that [the tool] can simulate its optical transfer function";
- its non-goals include "a calibrated gain-reduction law" and "a mathematically precise threshold or compression ratio".

The spec gives two endpoints — dark resistance ≥ 1 MΩ, and R_LDR ≤ 10.2 kΩ at full drive. **Two endpoints do not define a curve.** Linear-in-resistance, linear-in-log-resistance and power-law interpolations all satisfy them and produce materially different compression behaviour.

So this task builds a model that is **honest about being an approximation**, and the plan draws a hard line around what may be claimed from it:

- **The model exists for structural and DC purposes** — so the compressor emits a valid netlist and its bias points resolve.
- **No compression-behaviour assertion may rest on it.** Not gain reduction, not threshold, not ratio, not release. Any such number would be an artifact of an interpolation we invented, presented as a property of the circuit. The spec names exactly those as non-goals.
- The interpolation is documented **in the model file** as an assumed approximation, with the chosen law written out and the reason it was chosen.

**Files:** Create `lib/sim/models/vactrol.ts`; test `tests/sim/vactrol.test.ts`

**Interfaces:** Produces `vactrolSubcircuit(params: { name: string; darkOhms: number; litOhms: number; fullDriveAmps: number }): string`

- [ ] **Step 1: Choose and document the interpolation law**

Pick log-resistance interpolation in LED current — `log R` linear between `log(darkOhms)` and `log(litOhms)` as current rises from zero to `fullDriveAmps` — unless you find a better-supported law, in which case use that and say where it came from.

Write the chosen equation into the file's header comment, state that it is an **assumed approximation not drawn from the device's datasheet or the compressor spec**, and record that the spec explicitly declines to specify the real curve. Anyone reading a simulation result built on this must be able to see immediately what it does and does not mean.

- [ ] **Step 2: Write the failing tests — properties of the approximation, labelled as such**

```ts
test("the LDR is dark when the LED is off", async () => {
  const v = await runOperatingPoint({
    netlist: `dark
VLED a 0 DC 0
${vactrolSubcircuit({ name: "VTL", darkOhms: 1e6, litOhms: 10.2e3, fullDriveAmps: 2e-3 })}
X1 a 0 ldr1 ldr2 VTL
V2 ldr1 0 DC 1
R1 ldr2 0 1k
.op
.end`,
    nodes: ["ldr2"],
  })
  // 1 MOhm above a 1 k load: almost all of the 1 V is dropped across the LDR.
  expect(v["ldr2"]).toBeLessThan(0.01)
})

test("the LDR is lit at full drive", async () => {
  // Same divider, LED at fullDriveAmps: R_LDR at its lit endpoint, so the 1 k
  // load sees roughly 1/11 of the supply. Assert near 0.09, tolerance 0.02.
})

test("resistance is monotonic in LED current", async () => {
  // Three drive levels; the divider output rises as drive rises.
  //
  // NOTE WHAT THIS DOES AND DOES NOT PROVE. It proves the interpolation we
  // chose is monotonic. It does NOT validate that interpolation against a real
  // vactrol: no datasheet curve or measurement backs it. It is a guard against
  // a coding error in the model, not evidence about the device.
})
```

The comment in the third test is required, not decorative. Without it a later reader takes a passing monotonicity test as evidence the model is right.

- [ ] **Step 3: Implement.** A diode for the LED using the registry's model, and a behavioural resistor for the LDR whose value follows the documented law as a function of LED branch current. The planning probe confirmed B-sources work.

- [ ] **Step 4: Run, confirm, commit.**

---

### Task 9: Port the optical compressor

The plan's largest circuit and its last, backed by `docs/superpowers/specs/2026-09-21-optical-compressor-design.md`.

**This task also discharges Plan A obligation 4** — `include()` has unit tests and no end-to-end evidence. The compressor is naturally four blocks, so compose it with `include()` rather than as one flat function.

**Files:** Create `circuits/optical-compressor/index.ts` and `parts/{power-section,audio-path,sidechain}.ts`; test `tests/circuits/optical-compressor.test.ts`

- [ ] **Step 1: Read the spec's topology and values.** Every component, value and connection comes from it. Record in your report the component list per block and the numeric targets you will assert. Where the spec gives a revision-3 correction — emitter resistor 1 kΩ, detector capacitor 4.7 µF, peak-fail resistor 1 MΩ — the corrected value is the one that counts.

- [ ] **Step 2: Author the four blocks, each with declared ports.** **There are no implicit global nets** — ground, the 9 V rail and VBIAS all cross block boundaries as declared ports, bound explicitly by the parent.

- [ ] **Step 3: Compose with `include()`.** This is the end-to-end evidence composition has lacked.

- [ ] **Step 4: Structural tests.** Component count; validation passes; op-amp supply pins on the supply rails; the three revision-3 values present; the composed network's ports are what the module promises.

- [ ] **Step 5: Behavioural tests — bias only**

The spec states VBIAS sits at about 4.35 V. Assert it with `runOperatingPoint`.

**Assert nothing about compression behaviour.** Gain reduction, threshold, ratio and release all depend on the vactrol transfer law, which Task 8 establishes is an assumed approximation and which the spec names among its non-goals. A number produced from it would be an artifact of our interpolation wearing the costume of a circuit property.

For any other property, transcribe only what the spec states as a target. **Do not measure the circuit and assert what you find.** If a property has no stated target, say so in your report and leave it structural.

- [ ] **Step 6: Falsify the bias assertion.** Change a bias-divider resistor, confirm the VBIAS assertion fails naming the node, restore. Report both.

- [ ] **Step 7: Full suite, commit.**

---

## Self-Review

**Spec coverage.** §3.1 active kinds — declared in Plan A, given emission by Task 6. §3.2 units — preserved by Task 3, lowered by Task 6. §3.5 consumer mappings — Task 6 splits primitive order (kind) from subcircuit order (model). §5.1 emitter — Task 6. §5.2 model library with provenance — Task 5. §5.3 vactrol and its exclusions — Task 8. §5.4 behavioural assertions — Tasks 7 and 9. §5.5 structural and behavioural as separate gates — every circuit task asserts structure first, behaviour only where the spec states a target. §9.2 rung 4 — Task 7; rung 5 — Task 9. **Rung 7 pulled forward into Task 7; deviation recorded above.**

**Plan A's five obligations.** Unify the types — Task 1. Generalise `resolveNetwork` — Task 3. The package-pin harness gap — Task 2, deliberately before Task 7 introduces the circuit that would be bitten by it. `include()` end-to-end evidence — Task 9. The value-unit-versus-kind question — **not addressed here**; it is recorded in `reference/pultec/unresolved.md` and wants a decision about `parseValue`'s contract rather than a fix inside this plan's scope.

**Dependency order.** Every task consumes only what already exists: 3 uses 1; 5 uses 4; 6 uses 3 and 5; 7 uses 2, 5 and 6; 8 uses 4 and 5; 9 uses 6, 7 and 8.

**Two gates that can stop this plan, deliberately.** Task 7 Step 1 stops if no op-amp model can be redistributed (fallback: a generic model, named as generic). Task 7 Step 2 stops if the macromodel turns out to model a whole dual package rather than one amplifier section, because per-unit instantiation would then be electrically wrong — a plan-level decision, not something to improvise around.

**Known gap, stated rather than hidden:** the twelve throwing error paths in `lib/kicad/` that Plan A deferred remain untested. They fail loudly and both parsers are validated end-to-end against two independent real exports of a physically built board; nothing in Plan B changes that assessment.
