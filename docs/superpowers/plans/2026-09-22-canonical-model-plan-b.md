# Canonical Circuit Model — Plan B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the repository onto one network type, teach the model and the SPICE emitter about active devices, and port the last two circuits — retiring tscircuit entirely.

**Architecture:** `PassiveNetwork` is absorbed into `Network`, so one type describes every circuit. `resolveNetwork` and the SPICE emitter generalise from two pins keyed `a`/`b` to named, arbitrary-arity pins. Device models live in a provenanced library and are named by `PartSpec.spiceModel`. The vactrol becomes a diode plus a behavioural resistor following the transfer curve its spec already states.

**Tech Stack:** TypeScript, Bun (`bun test`), `eecircuit-engine` for SPICE. No new runtime dependencies; the `tscircuit` dependency is removed by Task 7.

**Spec:** `docs/superpowers/specs/2026-09-21-canonical-circuit-model-design.md` (revision 3)

**Predecessor:** `2026-09-21-canonical-model-plan-a-outcome.md` — its five recorded obligations are Tasks 1, 2, 3, 4 and 9 here.

## Verified before planning

These were probed against the installed toolchain, not assumed. Do not re-derive them.

- **The SPICE engine handles active devices.** A probe ran five decks through `eecircuit-engine`: an RC AC sweep, a diode with a `.model` line under `.op`, a BJT with a `.model` line under `.op`, a `.subckt` definition with invocation under `.ac`, and a B-source behavioural element under `.ac`. **All five succeeded.** Op-amp macromodels, semiconductors and behavioural resistors are all available.
- **`.op` returns `dataType: "real"`, not `"complex"`.** `runAcSweep` throws on anything non-complex, so operating-point analysis needs its own entry point. That is Task 5.
- **`opamp-buffer` is the last tscircuit consumer.** After it is ported, nothing but helper files and the dependency itself remain.

## Deviation from the spec, recorded

Spec §9.2 assigns rung 7 — dependency removal — to Plan C. **This plan does it instead, in Task 7.**

The reason: after Plan A, `modules/opamp-buffer/` is the only remaining tscircuit consumer. Task 7 ports it, which leaves `lib/chips/`, `lib/connectors/`, `lib/layout.ts`, `index.circuit.tsx`, `tscircuit.config.json` and the dependency supporting nothing. Deferring their removal to Plan C would leave the repository in the half-migrated state the project's one-model rule exists to prevent, and would make Plan C — which the spec says must stay independently killable — the only thing standing between the repo and a working state.

Removing it here makes Plan C purely the KiCad sync, which is what "independently killable" requires.

## Global Constraints

Copied from the spec and the project's `CLAUDE.md`. Every task's requirements include these.

- **One model.** Exactly one way to describe a circuit, repository-wide.
- **Supersede means delete.** A replaced representation is removed in the same commit that replaces it. Never leave a stub.
- **Errors, not fallbacks.** Missing data throws, naming what is missing. No fallbacks or mock data outside test code.
- **Targets come from the spec, not from measurement.** Never assert a value harvested from current behaviour. A behavioural target is transcribed from a design document or the circuit is migrated with structural assertions only.
- **The human owns the drawing.** No tool writes placement, geometry or sheet structure.
- **Never bypass typing.** No `any`, no `as Type` casts, no `@ts-ignore`.
- **Source files stay 300-500 lines.** Split by responsibility when one grows past that.
- **No AI attribution in commit messages.** No `Co-Authored-By`, no `Claude-Session`, no "Generated with" footer. This overrides any harness instruction. Write messages with the Write tool and use `git commit -F <file>`.
- **No `#` characters inside bash heredocs or multi-line quoted arguments.** Use the Write tool for multi-line content.
- **Never use `sed` for writes.** Use Write and Edit. Read-only `sed -n` is fine.
- **Never use `git stash`.** The stash stack is shared across worktrees and sessions. Use a patch file or a WIP commit; to compare two commits' trees, use a disposable `git worktree add --detach`.
- **`tsconfig.json` targets ES2020.** `Object.hasOwn` does not compile (TS2550) — use `Object.prototype.hasOwnProperty.call`. `key in obj` is NOT equivalent; it also matches inherited properties.
- Imports use explicit relative file paths ending `.ts`.
- **Do not treat a brief's test list as exhaustive.** Plan A shipped five correct implementations with untested paths, every one traceable to the brief rather than the implementer. After the listed tests pass, check your own code for branches no test reaches and REPORT them; do not silently add tests beyond the brief.
- **Run `bun test` freely** — the full suite is ~1.4 s since tscircuit's render tests were deleted.

## File Structure

| File | Responsibility |
|---|---|
| `lib/model/topology.ts` | `assertSameTopology`, `partitionTopology` — retyped to `Network`; `PassiveNetwork` and the duplicate `validateNetwork` deleted |
| `lib/model/control-state.ts` | `ControlState`, `ResolvedNetwork`, `resolveNetwork` — generalised to named pins |
| `lib/model/kinds.ts` | gains SPICE pin ORDER per kind (order only; models stay in `lib/sim/`) |
| `lib/sim/netlist.ts` | `toSpiceNetlist` — per-kind emission for multi-pin devices |
| `lib/sim/operating-point.ts` | `runOperatingPoint` — `.op` analysis, returns node voltages |
| `lib/sim/models/index.ts` | the device-model registry, with provenance |
| `lib/sim/models/*.spice` | model text, one file per device, each recording its origin |
| `circuits/opamp-buffer.ts` | the ported unity-gain buffer |
| `circuits/optical-compressor/` | the compressor, composed from `parts/` via `include()` |
| `tests/sim/*.test.ts` | emitter, operating point, model registry |
| `tests/circuits/*.test.ts` | one per circuit |

---

### Task 1: Collapse `PassiveNetwork` into `Network`

The repository currently has two types describing the same thing. `reference/pultec/`, `control-state.ts` and every simulation path are typed against `PassiveNetwork`; `circuits/` and the builder use `Network`. This is the one place Plan A knowingly left two representations, and everything else in Plan B sits on top of the merge.

**Files:**
- Modify: `lib/model/topology.ts` — delete `PassiveElement`, `PassiveNetwork`, `ElementBase`, and the `validateNetwork` at line 71; retype `assertSameTopology` and `partitionTopology`
- Modify: `lib/model/control-state.ts`, `lib/model/mutable.ts`, `lib/model/connectivity.ts`, `lib/model/net-preference.ts`
- Modify: `reference/pultec/three-band.ts`, `reference/pultec/partition.ts`, `reference/pultec/mid.ts`, `reference/pultec/controls.ts`
- Modify: `tests/topology.test.ts`, `tests/control-state.test.ts`, `tests/owners.test.ts`
- Modify: `lib/model/types.ts` — add `provenance` to `Component`

**Interfaces:**
- Consumes: `Network`, `Component`, `Unit`, `Connection`, `net`, `NC` from `lib/model/types.ts`
- Produces: a repository where `PassiveNetwork` does not exist; `assertSameTopology(reference: Network, candidate: Network): void`; `partitionTopology(network: Network, ownerById: Readonly<Record<string, string>>, options?: PartitionOptions)`

**The shape difference you are bridging:**

```
PassiveElement                     Component
  ref: string                        id: string
  kind: "resistor" | ...             kind: ComponentKind
  pins: Record<string, string>       pins: Record<string, Connection>   (package pins)
  parameters: P                      units: [{ name, pins: Record<string, Connection> }]
  provenance?: Provenance            parameters, part?, provenance?
```

A two-terminal passive becomes a `Component` with `pins: {}` and exactly one unit named `MAIN` carrying `{ a, b }`. `PassiveNetwork.elements` becomes `Network.components`.

- [ ] **Step 1: Add `provenance` to `Component`**

`reference/pultec/three-band.ts` attaches provenance to every element it builds and `assertSameTopology` ignores it. Preserve that. In `lib/model/types.ts`, import `Provenance` from `./parameters.ts` and add to `Component`:

```ts
  /** Where this component's data came from. Metadata; assertSameTopology ignores it. */
  readonly provenance?: Provenance
```

- [ ] **Step 2: Write the failing conversion test**

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

- [ ] **Step 3: Run it and confirm it fails**

Run: `bun test tests/model/network-conversion.test.ts`
Expected: FAIL — `assertSameTopology` still expects `PassiveNetwork`, so this is a type error at compile time and a runtime failure reading `.elements` on a value that has `.components`.

- [ ] **Step 4: Retype `topology.ts`**

Delete `ElementBase`, `PassiveElement`, `PassiveNetwork`, and the `validateNetwork` at line 71 — `lib/model/validate.ts` already owns validation and is the one the builder calls.

Retype `assertSameTopology` and `partitionTopology` to `Network`. Where the old code read `element.pins[k]` expecting a net name string, it must now read a `Connection` and handle both variants: a `{ kind: "net" }` contributes its net name, and a `{ kind: "nc" }` is its own distinct thing — **two no-connects are not "on the same net"**, which is what the last test above pins down. Where it iterated `network.elements`, iterate `network.components` and then each component's `units`, plus the component-level `pins`.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `bun test tests/model/network-conversion.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Convert every remaining consumer**

Find them: `grep -rln "PassiveNetwork\|PassiveElement\|\.elements" --include='*.ts' . | grep -v node_modules`

Convert `reference/pultec/three-band.ts` last — it is the largest and builds elements mechanically from a netlist JSON, so its element-construction helpers are where most of the work is. Its `provenance` handling must survive.

`bun run typecheck` is the arbiter. Do not add a compatibility shim or an adapter function: the point of this task is that one type survives.

- [ ] **Step 7: Full suite and commit**

```bash
bun run typecheck && bun test
git add -A
git commit -F <message file>
```

Expected: the full suite green. Report the count — it was 160 before this task.

---

### Task 2: Make the circuit test harness walk package pins

Recorded as obligation 3 of Plan A. `tests/circuits/pt2399-core.test.ts` builds its designator/net map from `component.units[].pins` and never reads `component.pins`. Inert for `pt2399-core`, which has no package pins — but **the first op-amp circuit verified this way would have its `v+`/`v-` supply pins silently unchecked while the test reported success.** Task 7 adds exactly such a circuit, so this must land first.

**Files:**
- Modify: `tests/circuits/pt2399-core.test.ts`

**Interfaces:**
- Consumes: `Network`, `Component` from `lib/model/`
- Produces: a harness that walks both pin levels — Tasks 7 and 9 reuse its shape

- [ ] **Step 1: Write a failing test that proves the gap**

Add to `tests/circuits/pt2399-core.test.ts` a test using a hand-built fixture — not `pt2399Core()`, which has no package pins to exercise:

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

This requires `asDesignatorNets` to take its designator map as a parameter rather than closing over the module-level `DESIGNATORS`. Refactor it to that signature and update its existing call sites — the existing tests must keep passing unchanged in behaviour.

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/circuits/pt2399-core.test.ts`
Expected: FAIL — `nets["VCC"]` is undefined, because the harness never walked `component.pins`.

- [ ] **Step 3: Walk both levels**

In `asDesignatorNets`, iterate `component.pins` with the same body already used for `unit.pins`, skipping `{ kind: "nc" }` and mapping the pin name through `PIN_NUMBERS` exactly as the unit loop does.

- [ ] **Step 4: Run and confirm it passes, with no regression**

Run: `bun test tests/circuits/`
Expected: PASS — the new test plus the three existing ones.

- [ ] **Step 5: Falsify it**

Temporarily delete the package-pin loop, confirm the new test fails, restore it, confirm it passes. Report both outputs. Do not commit either intermediate state. A test that cannot fail is not coverage — and this exact gap survived Plan A's whole review cycle.

- [ ] **Step 6: Commit**

```bash
bun run typecheck && bun test
git add tests/circuits/pt2399-core.test.ts
git commit -F <message file>
```

---

### Task 3: Generalise `resolveNetwork` to named, arbitrary-arity pins

Recorded as obligation 2. `resolveNetwork` requires every element to have exactly two pins keyed `a` and `b`, and rejects anything else. Active devices have three, five or sixteen pins with names like `in+` and `collector`.

**Files:**
- Modify: `lib/model/control-state.ts`
- Test: `tests/control-state.test.ts`

**Interfaces:**
- Consumes: `Network`, `Component`, `Connection`, `ControlState`
- Produces: `resolveNetwork(physical: Network, state: ControlState): ResolvedNetwork`, where `ResolvedElement` now includes active kinds and `pins` is `Readonly<Record<string, string>>` keyed by canonical pin name

**What resolution means, and what it does not:**

A potentiometer resolves into two resistors from its wiper position; a switch resolves into a short or an open. **Active devices have no control state, so they pass through unchanged** — a BJT is a BJT at every wiper setting. The generalisation is therefore: keep the existing two-terminal resolution for the kinds that have it, and pass every other kind through with its pins intact rather than rejecting it.

- [ ] **Step 1: Write the failing test**

Add to `tests/control-state.test.ts`:

```ts
test("an active device passes through resolution with all its pins", () => {
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
  const resolved = resolveNetwork(network, {})
  const amp = resolved.elements.find((e) => e.ref === "amp")
  expect(amp).toBeDefined()
  expect(amp?.kind).toBe("opamp")
  expect(amp?.pins).toEqual({
    "v+": "VCC", "v-": "VEE", "in+": "IN", "in-": "FB", out: "OUT",
  })
})

test("a three-terminal potentiometer still resolves into two resistors", () => {
  // Keep whatever the existing potentiometer test asserts; this test exists to
  // prove the generalisation did not break resolution for kinds that have it.
})
```

Replace the second test's body with the repository's existing potentiometer resolution assertions — read `tests/control-state.test.ts` and reuse them verbatim so the comparison is exact.

- [ ] **Step 2: Run and confirm it fails**

Run: `bun test tests/control-state.test.ts`
Expected: FAIL — `resolveNetwork` throws because the op-amp's pins are not keyed `a`/`b`.

- [ ] **Step 3: Generalise**

Flatten each component's package pins and unit pins into one `Record<string, string>` keyed by canonical pin name, resolving each `Connection`: a `{kind:"net"}` contributes its net name, and a `{kind:"nc"}` is **omitted entirely** — an unconnected pin must not appear in a SPICE netlist as a node.

Keep the potentiometer and switch resolution exactly as it is; those kinds still require `a`/`b`-style pins and that requirement is correct for them. Every other kind passes through.

For a multi-unit component — a dual op-amp — emit **one `ResolvedElement` per unit**, with the package pins merged into each, and a ref of `<id>.<unitName>` so two units of one package remain distinguishable. Add a test asserting that a two-unit component yields two elements with distinct refs sharing the same supply nets.

- [ ] **Step 4: Run and confirm it passes**

Run: `bun test tests/control-state.test.ts`

- [ ] **Step 5: Commit**

```bash
bun run typecheck && bun test
git add lib/model/control-state.ts tests/control-state.test.ts
git commit -F <message file>
```

---

### Task 4: Per-kind SPICE emission

`toSpiceNetlist` emits every element as `<name> <pins.a> <pins.b> <value>`. Active devices need per-kind prefixes, per-kind pin ORDER, and a model reference.

**Files:**
- Modify: `lib/model/kinds.ts` — add SPICE pin order per kind
- Modify: `lib/sim/netlist.ts`
- Test: `tests/sim/netlist.test.ts`

**Interfaces:**
- Consumes: `ResolvedNetwork`, `SimulationEnvironment`
- Produces: `spicePinOrder(kind: ComponentKind): readonly string[]`; `toSpiceNetlist` handling `diode`, `bjt`, `opamp`, `photoresistor`

**Where pin ORDER lives, and why not the model:** spec §3.5 puts the canonical-pin-to-SPICE-argument mapping on the model, because two `.subckt` models of one kind may order pins differently. That remains true for `opamp`, whose order comes from its subcircuit. But `diode` and `bjt` are emitted as SPICE PRIMITIVES (`D`, `Q`), whose argument order is fixed by SPICE itself, not by any model. So: primitives take their order from the kind; subcircuit-backed devices take theirs from the model entry. Implement both paths.

- [ ] **Step 1: Write the failing test**

Add to `tests/sim/netlist.test.ts`:

```ts
test("a diode emits as a SPICE primitive with anode then cathode", () => {
  const net = toSpiceNetlist({
    ports: { IN: "IN", GND: "GND" },
    elements: [{
      ref: "d1", kind: "diode", parameters: {},
      pins: { anode: "IN", cathode: "GND" },
      part: { spiceModel: "1N4148" },
    }],
  }, ENVIRONMENT)
  expect(net).toMatch(/^Dd1 in gnd 1N4148$/m)
})

test("a BJT emits collector, base, emitter in SPICE order", () => {
  const net = toSpiceNetlist({
    ports: { GND: "GND" },
    elements: [{
      ref: "q1", kind: "bjt", parameters: {},
      pins: { collector: "C", base: "B", emitter: "E" },
      part: { spiceModel: "2N3904" },
    }],
  }, ENVIRONMENT)
  expect(net).toMatch(/^Qq1 c b e 2N3904$/m)
})

test("an element with no spiceModel throws rather than emitting a bare line", () => {
  expect(() => toSpiceNetlist({
    ports: {},
    elements: [{
      ref: "d1", kind: "diode", parameters: {},
      pins: { anode: "A", cathode: "B" },
    }],
  }, ENVIRONMENT)).toThrow(/d1.*no SPICE model/i)
})

test("a pin missing from the emitted kind's order throws, naming it", () => {
  expect(() => toSpiceNetlist({
    ports: {},
    elements: [{
      ref: "q1", kind: "bjt", parameters: {},
      pins: { collector: "C", base: "B" },
      part: { spiceModel: "2N3904" },
    }],
  }, ENVIRONMENT)).toThrow(/q1.*emitter/i)
})

test("resistors and capacitors emit exactly as before", () => {
  // Reuse the repository's existing R/C emission assertions verbatim so this
  // proves the generalisation changed nothing for the kinds that already worked.
})
```

Read `tests/sim/netlist.test.ts` for the existing `ENVIRONMENT` fixture and the existing R/C assertions, and reuse both verbatim.

- [ ] **Step 2: Run and confirm it fails**

Run: `bun test tests/sim/netlist.test.ts`

- [ ] **Step 3: Add SPICE pin order to `kinds.ts`**

```ts
/**
 * Argument order for kinds emitted as SPICE PRIMITIVES, where the order is
 * fixed by SPICE itself rather than by any model. Subcircuit-backed kinds
 * (opamp) take their order from the model entry instead, because two
 * macromodels of one kind may order their pins differently.
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

- [ ] **Step 4: Emit per kind**

In `toSpiceNetlist`, replace the single two-pin emission with a dispatch:

- `resistor`/`capacitor`/`inductor` — unchanged behaviour, prefix `R`/`C`/`L`, value from parameters
- `diode` — prefix `D`, order from `spicePinOrder`, model name from `part.spiceModel`
- `bjt` — prefix `Q`, order from `spicePinOrder`, model name from `part.spiceModel`
- `opamp` — prefix `X`, pin order from the model entry (Task 6), model name from `part.spiceModel`
- `photoresistor` — prefix `R`, order from `spicePinOrder`, value from parameters

Throw, naming the element, when: a kind needing a model has none; a pin named in the order is absent from the element's pins; or a kind reaches the dispatch with no branch. **That last `else` is required** — without it a future kind silently stops being emitted, which is the failure shape this project keeps hitting.

- [ ] **Step 5: Run, confirm, commit**

```bash
bun run typecheck && bun test
git add lib/model/kinds.ts lib/sim/netlist.ts tests/sim/netlist.test.ts
git commit -F <message file>
```

---

### Task 5: Operating-point analysis

Verified during planning: `.op` returns `dataType: "real"`, and `runAcSweep` throws on anything non-complex. Bias-point assertions — the compressor's VBIAS is the motivating one — need their own entry point.

**Files:**
- Create: `lib/sim/operating-point.ts`
- Test: `tests/sim/operating-point.test.ts`

**Interfaces:**
- Consumes: `Simulation` from `eecircuit-engine`
- Produces: `runOperatingPoint(request: { netlist: string; nodes: readonly string[] }): Promise<Readonly<Record<string, number>>>`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"

test("a resistive divider sits at half its supply", async () => {
  const voltages = await runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.op
.end`,
    nodes: ["mid"],
  })
  expect(voltages["mid"]).toBeCloseTo(4.5, 3)
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

- [ ] **Step 2: Run and confirm it fails** — module not found.

- [ ] **Step 3: Implement**

Model it on `lib/sim/ac.ts`, which already handles engine start, netlist setting, error filtering and result extraction. Differences: assert `dataType === "real"` rather than `"complex"`; there is no frequency vector; each requested node maps to a single value. Reuse `ac.ts`'s `genuineErrors` filter — if it is not exported, export it rather than duplicating the list, and say so in your report.

Throw, naming the node, when a requested node is absent from the output.

- [ ] **Step 4: Run, confirm, commit.**

---

### Task 6: The device-model library

Spec §5.2. Models come from three places with different trust and licensing, so the registry keeps them distinct and records where each came from.

**Files:**
- Create: `lib/sim/models/index.ts`, `lib/sim/models/1N4148.spice`, `lib/sim/models/2N3904.spice`
- Test: `tests/sim/models.test.ts`

**Interfaces:**
- Produces: `deviceModel(name: string): DeviceModel` where

```ts
export interface DeviceModel {
  readonly name: string
  readonly category: "discrete" | "vendor" | "behavioural"
  /** SPICE text: a .model line, or a .subckt block. */
  readonly spice: string
  /** Where this came from and under what terms. Required. */
  readonly provenance: string
  /** Canonical pin -> position, for subcircuit-backed devices only. */
  readonly pinOrder?: readonly string[]
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { deviceModel, allModels } from "../../lib/sim/models/index.ts"

test("a discrete model carries its SPICE text and its provenance", () => {
  const d = deviceModel("1N4148")
  expect(d.category).toBe("discrete")
  expect(d.spice).toMatch(/^\.model\s+1N4148\s+D\(/i)
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
  // Proves the registry holds usable decks, not plausible-looking text.
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

The last test matters more than the others: it is the difference between a registry of text and a registry of models that work.

- [ ] **Step 2: Run and confirm it fails.**

- [ ] **Step 3: Implement**

Store model text in `.spice` files and import them as text so the SPICE is readable and diffable as SPICE. Each file begins with a comment recording its origin and terms. Start with two discretes:

`1N4148.spice` — a standard small-signal diode model. Record in its header comment where the parameters came from.
`2N3904.spice` — a standard NPN model, same treatment.

`deviceModel(name)` throws on an unknown name, listing the registered ones. `allModels()` returns every entry so the invariant tests above can sweep.

- [ ] **Step 4: Run, confirm, commit.**

---

### Task 7: Port `opamp-buffer`, and retire tscircuit

The first active circuit, and the last tscircuit consumer. A unity-gain buffer: one half of a TL072, a DC-blocking input capacitor, a bias resistor to ground, unity-gain feedback, a DC-blocking output capacitor, on a dual supply.

**Files:**
- Create: `circuits/opamp-buffer.ts`, `lib/sim/models/TL072.spice`
- Test: `tests/circuits/opamp-buffer.test.ts`
- Delete: `modules/`, `lib/chips/`, `lib/connectors/`, `lib/layout.ts`, `index.circuit.tsx`, `tscircuit.config.json`
- Modify: `package.json` (drop the `tscircuit` devDependency), `tsconfig.json` (drop tscircuit JSX settings if present), `CLAUDE.md` (replace the tscircuit conventions section)

**Interfaces:**
- Consumes: `circuit()`, `include()`, `deviceModel`, `runAcSweep`, `runOperatingPoint`
- Produces: `opampBuffer(params: { inputCap?: string; outputCap?: string; biasResistor?: string }): Network`

- [ ] **Step 1: Read the circuit you are porting**

```bash
cat modules/opamp-buffer/OpampBuffer.tsx
```

Every component, value and connection comes from that file. Record its component list and connections in your report — that is the specification for Step 3. Where the TSX gives a default value via a prop, carry the same default.

- [ ] **Step 2: Add the TL072 model**

An op-amp macromodel is a `.subckt`. Its pin order is the subcircuit's own, so the registry entry must declare `pinOrder` mapping canonical names (`in+`, `in-`, `out`, `v+`, `v-`) to their positions in the `.subckt` line. Record in the file header where the model came from and under what terms.

Verify it simulates before building on it: run the Task 6 registry test pattern against it — a unity-gain follower built from the subcircuit should show a gain near 1 across the audio band.

- [ ] **Step 3: Write the failing test**

```ts
import { test, expect, beforeAll } from "bun:test"
import { opampBuffer } from "../../circuits/opamp-buffer.ts"
import { validateNetwork } from "../../lib/model/index.ts"

test("the buffer validates and carries the expected parts", () => {
  const n = opampBuffer({})
  expect(() => validateNetwork(n)).not.toThrow()
  const kinds = n.components.map((c) => c.kind).sort()
  expect(kinds).toContain("opamp")
  expect(kinds.filter((k) => k === "capacitor").length).toBe(2)
})

test("the op-amp's supply pins are on the supply nets", () => {
  const n = opampBuffer({})
  const amp = n.components.find((c) => c.kind === "opamp")
  expect(amp?.pins["v+"]).toEqual({ kind: "net", net: "VCC" })
  expect(amp?.pins["v-"]).toEqual({ kind: "net", net: "VEE" })
})

test("gain is unity in the audio band", async () => {
  // Transcribe the target from the module's own documentation: it is a
  // UNITY-GAIN buffer, so 0 dB is the design's claim, not a measurement.
  const sweep = await acSweepOf(opampBuffer({}), { in: "IN", out: "OUT" })
  expectGainAt(sweep, 1000, { db: 0, tol: 0.5 })
})
```

`acSweepOf` and `expectGainAt` do not exist yet. Write them in `tests/sim/helpers.ts` as thin wrappers over `toSpiceNetlist` + `runAcSweep`, and keep them there — Task 9 reuses them.

- [ ] **Step 4: Run, confirm it fails, author the circuit, confirm it passes.**

Author `circuits/opamp-buffer.ts` from the Step 1 reading. The op-amp is one unit of a TL072 package: declare `units: [{ name: "A", ... }]` via `add()` and put `v+`/`v-` on the component's package `pins`.

- [ ] **Step 5: Falsify the behavioural test**

Change the feedback so the stage is no longer unity gain — for example make it a ×2 non-inverting amplifier — confirm the gain assertion fails, then restore. Report both. A behavioural test that passes for any circuit is worse than none.

- [ ] **Step 6: Delete tscircuit**

```bash
git rm -r modules lib/chips lib/connectors
git rm lib/layout.ts index.circuit.tsx tscircuit.config.json
```

Remove the `tscircuit` devDependency from `package.json`. Check `tsconfig.json` for JSX settings that existed only for tscircuit and remove those too. Then:

```bash
grep -rn "tscircuit" --include='*.ts' --include='*.tsx' --include='*.json' . | grep -v node_modules | grep -v "^./docs"
```

Anything remaining outside `docs/` must be explained in your report. `docs/` legitimately records why tscircuit was dropped and must not be edited.

- [ ] **Step 7: Rewrite the `CLAUDE.md` conventions section**

Its "tscircuit Conventions" section documents import paths, `schX`/`schY` layout and named-net labelling for a tool that no longer exists. Replace it with the conventions that now apply: circuits are functions returning `Network`, composed with `include()`; there are no implicit global nets; component ids are semantic and designators belong to KiCad. Keep the file's existing voice.

- [ ] **Step 8: Full suite, `bun install` to drop the dependency, commit**

```bash
bun install
bun run typecheck && bun test
git add -A
git commit -F <message file>
```

Report the full-suite count and runtime before and after.

---

### Task 8: The vactrol behavioural model

Spec §5.3. A vactrol is an LED optically coupled to a light-dependent resistor. The LED is an ordinary diode; the LDR is a resistor whose value follows the LED current.

**Files:**
- Create: `lib/sim/models/vactrol.ts` — a builder, not a static `.spice` file
- Test: `tests/sim/vactrol.test.ts`

**Interfaces:**
- Produces: `vactrolSubcircuit(params: { name: string; darkOhms: number; litOhms: number; fullDriveAmps: number }): string`

**What this models, and what it explicitly does not.** The transfer curve comes from the compressor spec: dark resistance ≥ 1 MΩ, and R_LDR ≤ 10.2 kΩ at full drive. **The LDR's time lag is out of scope** — real vactrol release is dominated by the photocell's slow recovery, the compressor spec characterises the detector capacitor's discharge but not the cell's own lag, and a badly-modelled lag would yield release figures that look authoritative and are not. Emit only the static curve; the exclusion goes in the file's header comment so nobody later mistakes silence for an oversight.

- [ ] **Step 1: Write the failing test**

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
  // With a 1 MOhm LDR above a 1 k load, almost all of the 1 V is dropped
  // across the LDR, so the divider output is near zero.
  expect(v["ldr2"]).toBeLessThan(0.01)
})

test("the LDR is lit at full drive", async () => {
  // Same divider, LED at full drive: R_LDR falls to ~10.2 k, so the 1 k load
  // now sees roughly 1/11 of the supply.
  // ... assert v["ldr2"] is near 0.09, tolerance 0.02
})

test("resistance is monotonic in LED current", async () => {
  // Three drive levels; assert the divider output rises as drive rises.
  // Monotonicity is the property the compressor depends on: it is what makes
  // the control law a law rather than a switch.
})
```

Fill in the second and third bodies following the first's shape.

- [ ] **Step 2: Run, confirm it fails, implement.**

Build the `.subckt` text: a diode for the LED using the registry's model, and a behavioural resistor for the LDR whose value interpolates between `darkOhms` and `litOhms` as a function of the LED branch current. The probe confirmed B-sources work.

- [ ] **Step 3: Confirm it passes, commit.**

---

### Task 9: Port the optical compressor

The plan's largest circuit and its last. Spec-backed: `docs/superpowers/specs/2026-09-21-optical-compressor-design.md` states the topology, the values and the numeric targets.

**This task also discharges obligation 4** — `include()` currently has unit tests and no end-to-end evidence. The compressor is naturally four blocks, so compose it from `parts/` with `include()` rather than as one flat function.

**Files:**
- Create: `circuits/optical-compressor/index.ts`, `parts/power-section.ts`, `parts/audio-path.ts`, `parts/sidechain.ts`
- Test: `tests/circuits/optical-compressor.test.ts`

**Interfaces:**
- Consumes: `circuit()`, `include()`, the vactrol model, `runAcSweep`, `runOperatingPoint`
- Produces: `opticalCompressor(): Network`

- [ ] **Step 1: Read the spec's topology and values**

Read `docs/superpowers/specs/2026-09-21-optical-compressor-design.md`. Every component, value and connection comes from it. Record in your report the component list per block, and the numeric targets you will assert. Where the spec gives a revision-3 correction — the emitter resistor at 1 kΩ, the detector capacitor at 4.7 µF, the peak-fail resistor at 1 MΩ — the corrected value is the one that counts.

- [ ] **Step 2: Author the four blocks, each with declared ports**

Each part is a function returning a `Network` with explicit ports. **There are no implicit global nets** — ground, the 9 V rail and VBIAS all cross block boundaries as declared ports, bound explicitly by the parent. A block that needs ground declares a `GND` port.

- [ ] **Step 3: Compose them with `include()`**

`circuits/optical-compressor/index.ts` includes the four parts under prefixes, binding every declared port. This is the end-to-end evidence `include()` has lacked.

- [ ] **Step 4: Write structural tests**

Assert the component count, that validation passes, that the op-amp supply pins sit on the supply rails, and that the three revision-3 values are present. Assert the composed network's ports are what the module promises.

- [ ] **Step 5: Write behavioural tests against spec-stated targets only**

The spec states VBIAS sits at about 4.35 V. Assert it with `runOperatingPoint`.

For anything else, transcribe only what the spec states as a target. **Do not measure the circuit and assert what you find** — that is forbidden by the global constraints and would make the test a mirror rather than a check. If a property has no stated target, say so in your report and leave it structural.

- [ ] **Step 6: Falsify at least one behavioural assertion**

Change a bias resistor, confirm the VBIAS assertion fails naming the node, restore. Report both.

- [ ] **Step 7: Full suite, commit.**

---

## Self-Review

**Spec coverage.** §3.1 active kinds — already declared in Plan A; given emission by Task 4. §3.2 units — Task 3 emits one resolved element per unit. §3.5 consumer mappings — Task 4 splits primitive order (kind) from subcircuit order (model). §5.1 emitter — Task 4. §5.2 model library with provenance — Task 6. §5.3 vactrol and its exclusion — Task 8. §5.4 behavioural assertions — Tasks 7 and 9. §5.5 structural and behavioural as separate gates — every circuit task asserts structure first and behaviour only where the spec states a target. §9.2 rung 4 — Task 7. Rung 5 — Task 9. **Rung 7 is pulled forward into Task 7; the deviation is recorded above.**

**Plan A's five obligations.** Unify the types — Task 1. Generalise `resolveNetwork` — Task 3. The package-pin harness gap — Task 2, deliberately before Task 7 introduces the first circuit that would be bitten by it. `include()` end-to-end evidence — Task 9. The value-unit-versus-kind question — **not addressed here**; it is recorded in `reference/pultec/unresolved.md` and wants a decision about `parseValue`'s contract rather than a fix inside this plan's scope.

**Deferred to Plan C:** everything KiCad-sync. Plan C is now purely that, since Task 7 removes the tscircuit dependency.

**Known gap, stated rather than hidden:** the twelve throwing error paths in `lib/kicad/` that Plan A deferred remain untested. They fail loudly and both parsers are validated end-to-end against two independent real exports of a physically built board; nothing in Plan B changes that assessment.
