# Pultec Section Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive, from the electrical model, a scaffold that lets any combination of the five discrete Pultec sections be built and measured with the absent sections' flat-state networks stood in for exactly.

**Architecture:** A section's flat state reduces to a subset of its own components. `lib/board/scaffold/` discovers each section's boundary, resolves the section at a declared flat state, drops only genuinely disconnected components, and derives isolation points from the connected components of what remains. Verification is structural first (set equality, exact), numerical second (boundary admittance), then compositional across all 31 section combinations.

**Tech Stack:** TypeScript on Bun, the existing `lib/model` resolution layer, ngspice through `lib/sim`, VeroRoute through the perfboard workflow.

**Spec:** `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`

## Global Constraints

- **No fallbacks, no mock data outside tests.** A missing part, an unresolvable boundary or an absent control setting throws, naming what is missing and where to fix it.
- **Never bypass typing.** No `any`, no `as Type`, no `@ts-ignore`.
- **Files 300-500 lines maximum.** `lib/board/scaffold/` is split by responsibility for this reason.
- **Imports are explicit relative paths with the file extension:** `../model/index.ts`, never `../model`.
- **Component ids are semantic**, never reference designators.
- **Derived artifacts are compared by content, never by timestamp.** A committed scaffold value that disagrees with the model fails `make check`.
- **A skipped check must never look like a passing one.** Any gate that cannot run fails loudly.
- **Tests assert on unrounded values.** Tolerances: Gate A2 relative `1e-9` with absolute floor `1e-15` S; Gate B `1e-6` dB.
- **`pruneFloatingBranches` is forbidden in scaffold derivation.** It prepares a network for one source/load configuration; a branch irrelevant there can matter when a neighbour drives a different boundary node.
- **Ideal shorts are components, never node merges.** Low-cut's entire stand-in is a short between `hi_boost_out` and `out`; merging those nodes destroys it.
- Commit after each task. Never add AI attribution to commit messages.

## Facts established against the code, to build on rather than rediscover

- `resolveNetwork(network, state)` returns `ResolvedNetwork` whose `ResolvedComponent.units[].pins` are **net-name strings**.
- A potentiometer resolves to **two resistor components**, `<id>.ccw-wiper` and `<id>.wiper-cw`. At position 0 the first has `ohms: 0` and **is still emitted** - control-state.ts says so explicitly, "so component counts stay stable across a sweep". This is what makes "shorts are components" already true.
- A **switch's closed contacts merge nets** through a union-find. `netPreference` prefers the ground net, then any port net, then lexicographic order, so **a merged class containing a boundary net keeps the boundary net's name.** Boundary identity therefore survives resolution and must not be "undone".
- `resolveNetwork` **throws if the network has no ground port** (`GROUND_PORT_KEY`). The partition's modules are bare `Component[]`, so the derivation must construct a `Network` with ports including ground.
- `partitionReference().modules` is `Record<string, Component[]>` keyed `"low-cut" | "hi-boost" | "low-boost" | "hi-cut" | "mid"`.
- `RV_HI_Q` rides on the **hi-boost** section and needs a position in any control state that includes it. Resolution refuses a missing setting.

## File Structure

```
lib/board/scaffold/boundary.ts    boundary discovery
lib/board/scaffold/flat.ts        the declared flat state, and resolving a section at it
lib/board/scaffold/reduce.ts      boundary-preserving reduction
lib/board/scaffold/isolate.ts     connected components and isolation points
lib/board/scaffold/admittance.ts  boundary admittance measurement
lib/board/scaffold/index.ts       standIn(section) composing the above
circuits/pultec/scaffold.ts       the scaffold board as a Network, built from standIn()
tests/board/scaffold-boundary.test.ts
tests/board/scaffold-reduce.test.ts
tests/board/scaffold-isolate.test.ts
tests/board/scaffold-equivalence.test.ts   gates A1 and A2
tests/pultec/scaffold-composition.test.ts  gate B, all 31 combinations
```

---

### Task 1: Boundary discovery

**Files:**
- Create: `lib/board/scaffold/boundary.ts`
- Test: `tests/board/scaffold-boundary.test.ts`

**Interfaces:**
- Produces: `discoverBoundary(sectionName: string, modules: Record<string, readonly Component[]>, groundNet: string): ReadonlySet<string>`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { discoverBoundary } from "../../lib/board/scaffold/boundary.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"

const modules = partitionReference().modules

test("a section's boundary is every net another section also touches, plus ground", () => {
  const boundary = discoverBoundary("low-boost", modules, "0")
  expect([...boundary].sort()).toEqual(["0", "lo_boost_in", "out"])
})

test("ground is in the boundary even when no other section's component names it", () => {
  // Ground is shared by construction and is the return path. A boundary that
  // omitted it would let the reduction discard a legitimate shunt network.
  const boundary = discoverBoundary("hi-boost", modules, "0")
  expect(boundary.has("0")).toBe(true)
})

test("internal nets are not boundary nets", () => {
  const boundary = discoverBoundary("low-boost", modules, "0")
  expect(boundary.has("j10_p1")).toBe(false)
})

test("every section's boundary is discovered, not listed", () => {
  // The spec's terminal tables are results. Assert the shape the spec reports.
  const expected: Record<string, string[]> = {
    "hi-boost": ["0", "hi_boost_out", "in"],
    "hi-cut": ["0", "hi_boost_out", "lo_boost_in"],
    "low-cut": ["0", "hi_boost_out", "out"],
    "low-boost": ["0", "lo_boost_in", "out"],
    "mid": ["0", "hi_boost_out", "in"],
  }
  for (const [section, nets] of Object.entries(expected)) {
    expect([...discoverBoundary(section, modules, "0")].sort(), section).toEqual(nets)
  }
})

test("an unknown section refuses, naming it", () => {
  expect(() => discoverBoundary("nope", modules, "0")).toThrow(/nope/)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/board/scaffold-boundary.test.ts`
Expected: FAIL, cannot resolve `../../lib/board/scaffold/boundary.ts`.

- [ ] **Step 3: Implement**

```ts
/** Which of a section's nets are externally shared.
 *
 * DISCOVERED, NEVER LISTED. The spec's per-section terminal tables are results of
 * this function, not inputs to it. A boundary inferred from the four named ladder
 * nodes would omit ground, and the reduction would then discard a resistor-to-
 * capacitor-to-ground shunt as "not on a path between two boundary nodes".
 */
import type { Component } from "../../model/types.ts"

function netsOf(components: readonly Component[]): Set<string> {
  const nets = new Set<string>()
  for (const component of components) {
    for (const connection of Object.values(component.pins)) {
      if (connection.kind === "net") nets.add(connection.net)
    }
    for (const unit of component.units) {
      for (const connection of Object.values(unit.pins)) {
        if (connection.kind === "net") nets.add(connection.net)
      }
    }
  }
  return nets
}

export function discoverBoundary(
  sectionName: string,
  modules: Record<string, readonly Component[]>,
  groundNet: string,
): ReadonlySet<string> {
  const own = modules[sectionName]
  if (own === undefined) {
    throw new Error(
      `Unknown section: ${sectionName}. Known sections: ${Object.keys(modules).sort().join(", ")}`,
    )
  }
  const ownNets = netsOf(own)
  const foreign = new Set<string>()
  for (const [name, components] of Object.entries(modules)) {
    if (name === sectionName) continue
    for (const net of netsOf(components)) foreign.add(net)
  }
  const boundary = new Set<string>()
  for (const net of ownNets) if (foreign.has(net)) boundary.add(net)
  // Ground is shared by construction, so it is a boundary net whether or not a
  // neighbouring section's component happens to name it.
  if (ownNets.has(groundNet)) boundary.add(groundNet)
  return boundary
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test tests/board/scaffold-boundary.test.ts && bun run typecheck`

- [ ] **Step 5: Commit**

```bash
git add lib/board/scaffold/boundary.ts tests/board/scaffold-boundary.test.ts
git commit -m "Discover a section's boundary rather than listing it"
```

---

### Task 2: The declared flat state, and resolving a section at it

**Files:**
- Create: `lib/board/scaffold/flat.ts`
- Test: add to `tests/board/scaffold-boundary.test.ts` (same surface, one test file)

**Interfaces:**
- Consumes: `discoverBoundary` from Task 1
- Produces: `REFERENCE_FLAT: FlatState` where `FlatState = { readonly loFrequency: string; readonly hiFrequency: string; readonly midFrequency: string; readonly midMode: string }`, and `resolveSectionFlat(sectionName, modules, flat): ResolvedNetwork`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { REFERENCE_FLAT, resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"

const modules = partitionReference().modules

test("a pot at flat emits a zero-ohm arm as a COMPONENT, not a merged node", () => {
  // This is the whole basis of "shorts are components". RV_LO_BOOST at position 0
  // shorts lo_boost_in to ground, and omitting that shunt was most of the error in
  // the approach this design replaces.
  const resolved = resolveSectionFlat("low-boost", modules, REFERENCE_FLAT)
  const arm = resolved.components.find((c) => c.id === "RV_LO_BOOST.ccw-wiper")
  expect(arm).toBeDefined()
  expect(arm!.parameters).toEqual({ ohms: 0 })
  const pins = Object.values(arm!.units[0]!.pins).sort()
  expect(pins).toEqual(["0", "lo_boost_in"])
})

test("a closed switch contact merges nets but keeps the BOUNDARY net's name", () => {
  // netPreference prefers ground, then port nets. SW_LO_CUT.common is on `out`, a
  // boundary net, so the merged class must be named `out` and not an internal net.
  const resolved = resolveSectionFlat("low-cut", modules, REFERENCE_FLAT)
  const nets = new Set(
    resolved.components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))),
  )
  expect(nets.has("out")).toBe(true)
})

test("resolution refuses a flat state that omits a control the section carries", () => {
  // RV_HI_Q rides on hi-boost. A flat state that forgot it must fail loudly.
  expect(() =>
    resolveSectionFlat("hi-boost", modules, { ...REFERENCE_FLAT, omitHiQ: true } as never),
  ).toThrow()
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/board/scaffold-boundary.test.ts`
Expected: FAIL, cannot resolve `flat.ts`.

- [ ] **Step 3: Implement**

```ts
/** The flat control state a stand-in emulates, and resolution of a section at it.
 *
 * A STAND-IN IS SPECIFIC TO THE SETTING IT EMULATES. An absent section has no
 * frequency selector, so the scaffold assumes one, and its capacitor values follow
 * from that assumption. Holding stand-ins at these settings while the circuit is set
 * elsewhere costs up to 3.71 dB - measured, and recorded in the spec. The setting is
 * therefore data, carried with the stand-in and asserted against the reference.
 */
import { resolveNetwork } from "../../model/control-state.ts"
import { discoverBoundary } from "./boundary.ts"
import type { Component, Network } from "../../model/types.ts"
import type { ControlState, ResolvedNetwork } from "../../model/control-state.ts"

export interface FlatState {
  readonly loFrequency: string
  readonly hiFrequency: string
  readonly midFrequency: string
  readonly midMode: string
}

/** The settings every figure in the spec was measured at. */
export const REFERENCE_FLAT: FlatState = {
  loFrequency: "100Hz",
  hiFrequency: "5kHz",
  midFrequency: "1kHz",
  midMode: "boost",
}

export const GROUND_NET = "0"

/** Every pot in the section at 0, and every switch at the flat state's setting for it.
 * Built from the components present rather than from a fixed list, because resolution
 * refuses a missing setting and a hand-written list would omit RV_HI_Q.
 */
function flatControlState(components: readonly Component[], flat: FlatState): ControlState {
  const potPositions: Record<string, number> = {}
  const switchPositions: Record<string, string> = {}
  const wanted: Record<string, string> = {
    SW_LO_CUT: flat.loFrequency,
    SW_LO_BOOST: flat.loFrequency,
    SW_HI_CUT: flat.hiFrequency,
    SW_HI_BOOST: flat.hiFrequency,
    SW_MID: flat.midFrequency,
    SW_MID_MODE: flat.midMode,
  }
  for (const component of components) {
    if (component.kind === "potentiometer") potPositions[component.id] = 0
    if (component.kind !== "switch") continue
    const setting = wanted[component.id]
    if (setting === undefined) {
      throw new Error(
        `No flat setting for switch ${component.id}. Add it to flatControlState's table ` +
          `in lib/board/scaffold/flat.ts - it is not defaulted because a guessed ` +
          `position silently changes which capacitor a stand-in carries.`,
      )
    }
    switchPositions[component.id] = setting
  }
  return { potPositions, switchPositions }
}

/** The section as a Network with its boundary nets as ports. Ground must be a port:
 * `resolveNetwork` throws without one, and `netPreference` reads the port set to decide
 * which name a merged net class keeps - which is what preserves boundary identity.
 */
export function sectionNetwork(
  sectionName: string,
  modules: Record<string, readonly Component[]>,
): Network {
  const components = modules[sectionName]
  if (components === undefined) throw new Error(`Unknown section: ${sectionName}`)
  const boundary = discoverBoundary(sectionName, modules, GROUND_NET)
  const ports: Record<string, string> = { ground: GROUND_NET }
  for (const net of [...boundary].sort()) if (net !== GROUND_NET) ports[net] = net
  return { components, ports }
}

export function resolveSectionFlat(
  sectionName: string,
  modules: Record<string, readonly Component[]>,
  flat: FlatState,
): ResolvedNetwork {
  const network = sectionNetwork(sectionName, modules)
  return resolveNetwork(network, flatControlState(network.components, flat))
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test tests/board/scaffold-boundary.test.ts && bun run typecheck`

- [ ] **Step 5: Commit**

```bash
git add lib/board/scaffold/flat.ts tests/board/scaffold-boundary.test.ts
git commit -m "Resolve a section at the flat state a stand-in emulates"
```

---

### Task 3: Boundary-preserving reduction

**Files:**
- Create: `lib/board/scaffold/reduce.ts`
- Test: `tests/board/scaffold-reduce.test.ts`

**Interfaces:**
- Consumes: `ResolvedNetwork`, the boundary set
- Produces: `reduceToBoundary(resolved: ResolvedNetwork, boundary: ReadonlySet<string>): readonly ResolvedComponent[]`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { reduceToBoundary } from "../../lib/board/scaffold/reduce.ts"
import type { ResolvedComponent, ResolvedNetwork } from "../../lib/model/control-state.ts"

const r = (id: string, a: string, b: string, ohms = 1000): ResolvedComponent => ({
  id, kind: "resistor", parameters: { ohms }, pins: {},
  units: [{ name: "MAIN", pins: { a, b } }],
})
const c = (id: string, a: string, b: string): ResolvedComponent => ({
  id, kind: "capacitor", parameters: { farads: 1e-7 }, pins: {},
  units: [{ name: "MAIN", pins: { a, b } }],
})
const network = (components: ResolvedComponent[]): ResolvedNetwork =>
  ({ ports: { ground: "0" }, components })

test("a shunt reaching ground through an internal node is KEPT", () => {
  // The case that motivated explicit boundary discovery: with ground out of the
  // boundary set this chain joins no two boundary nodes and is wrongly discarded.
  const kept = reduceToBoundary(
    network([r("R1", "IN", "mid"), c("C1", "mid", "0")]),
    new Set(["IN", "0"]),
  )
  expect(kept.map((k) => k.id).sort()).toEqual(["C1", "R1"])
})

test("a branch on an open switch throw is dropped", () => {
  const kept = reduceToBoundary(
    network([r("R1", "IN", "OUT"), c("C_open", "IN", "dangling")]),
    new Set(["IN", "OUT", "0"]),
  )
  expect(kept.map((k) => k.id)).toEqual(["R1"])
})

test("a zero-ohm component is kept and does NOT merge its nodes", () => {
  // Low-cut's entire stand-in is a short between two boundary nets. Merging them
  // would leave nothing to make removable and collapse the terminal count to one.
  const kept = reduceToBoundary(
    network([r("SHORT", "hi_boost_out", "out", 0)]),
    new Set(["hi_boost_out", "out", "0"]),
  )
  expect(kept).toHaveLength(1)
  const pins = Object.values(kept[0]!.units[0]!.pins).sort()
  expect(pins).toEqual(["hi_boost_out", "out"])
})

test("a branch live only through a zero-ohm arm is kept", () => {
  // The omission that made the earlier design wrong: beyond a short is live.
  const kept = reduceToBoundary(
    network([r("ARM", "IN", "node", 0), c("C1", "node", "0")]),
    new Set(["IN", "0"]),
  )
  expect(kept.map((k) => k.id).sort()).toEqual(["ARM", "C1"])
})

test("every boundary net present in the input survives in the output's nodes", () => {
  const kept = reduceToBoundary(
    network([r("R1", "IN", "OUT"), r("R2", "OUT", "0")]),
    new Set(["IN", "OUT", "0"]),
  )
  const nodes = new Set(kept.flatMap((k) => Object.values(k.units[0]!.pins)))
  for (const net of ["IN", "OUT", "0"]) expect(nodes.has(net), net).toBe(true)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/board/scaffold-reduce.test.ts`
Expected: FAIL, cannot resolve `reduce.ts`.

- [ ] **Step 3: Implement**

```ts
/** Reduce a resolved section to what it presents at its boundary.
 *
 * KEEP EVERY COMPONENT ON A PATH BETWEEN TWO BOUNDARY NODES; DROP ONLY WHAT IS
 * GENUINELY DISCONNECTED. No series or parallel collapsing, no star-mesh transform,
 * no elimination of internal nodes, and above all NO NODE MERGING - a zero-ohm
 * component is an edge for path-finding and stays a component in the output.
 *
 * `pruneFloatingBranches` is deliberately NOT used. It prepares a network for
 * simulation under one source and load configuration, and a branch irrelevant to that
 * configuration can matter when a different boundary node is driven by a neighbouring
 * section.
 */
import type { ResolvedComponent, ResolvedNetwork } from "../../model/control-state.ts"

function nodesOf(component: ResolvedComponent): string[] {
  const nodes = new Set<string>(Object.values(component.pins))
  for (const unit of component.units) {
    for (const net of Object.values(unit.pins)) nodes.add(net)
  }
  return [...nodes]
}

/** Nodes reachable from `start` by traversing components as undirected edges. */
function reachable(start: string, components: readonly ResolvedComponent[]): Set<string> {
  const adjacency = new Map<string, string[]>()
  for (const component of components) {
    const nodes = nodesOf(component)
    for (const node of nodes) {
      const neighbours = adjacency.get(node) ?? []
      for (const other of nodes) if (other !== node) neighbours.push(other)
      adjacency.set(node, neighbours)
    }
  }
  const seen = new Set<string>([start])
  const queue = [start]
  while (queue.length > 0) {
    const node = queue.shift()!
    for (const next of adjacency.get(node) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return seen
}

export function reduceToBoundary(
  resolved: ResolvedNetwork,
  boundary: ReadonlySet<string>,
): readonly ResolvedComponent[] {
  // A component is live when, with that component removed, each of two DISTINCT
  // boundary nodes is still reachable from one of its own nodes - i.e. it sits on a
  // path joining two boundary nodes. Implemented directly: a component is live if it
  // can reach two distinct boundary nodes through the whole network.
  return resolved.components.filter((component) => {
    const touched = new Set<string>()
    for (const node of nodesOf(component)) {
      for (const net of reachable(node, resolved.components)) {
        if (boundary.has(net)) touched.add(net)
      }
      if (touched.size >= 2) return true
    }
    return touched.size >= 2
  })
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test tests/board/scaffold-reduce.test.ts && bun run typecheck`

- [ ] **Step 5: Commit**

```bash
git add lib/board/scaffold/reduce.ts tests/board/scaffold-reduce.test.ts
git commit -m "Reduce a section to its boundary without merging nodes"
```

---

### Task 4: Isolation points, per connected component

**Files:**
- Create: `lib/board/scaffold/isolate.ts`
- Test: `tests/board/scaffold-isolate.test.ts`

**Interfaces:**
- Produces: `isolationPoints(components, boundary): readonly IsolationPoint[]` where `IsolationPoint = { readonly component: string; readonly terminal: string }`, and `connectedGroups(components): readonly (readonly ResolvedComponent[])[]`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { connectedGroups, isolationPoints } from "../../lib/board/scaffold/isolate.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"

const r = (id: string, a: string, b: string, ohms = 1000): ResolvedComponent => ({
  id, kind: "resistor", parameters: { ohms }, pins: {},
  units: [{ name: "MAIN", pins: { a, b } }],
})

test("a two-terminal stand-in needs one isolation point", () => {
  const points = isolationPoints([r("R1", "in", "hi_boost_out")], new Set(["in", "hi_boost_out", "0"]))
  expect(points).toHaveLength(1)
})

test("a three-terminal stand-in needs two", () => {
  // Low-boost: 56k to `out` and a short to ground, meeting at lo_boost_in. One link
  // leaves out connected to ground through the 56k - measured at 0.589 dB on the
  // full build, which is why this is a correctness test and not a style preference.
  const points = isolationPoints(
    [r("SCAF_LB", "lo_boost_in", "out", 56_000), r("SCAF_LB_SHUNT", "lo_boost_in", "0", 0)],
    new Set(["lo_boost_in", "out", "0"]),
  )
  expect(points).toHaveLength(2)
})

test("isolation is derived per connected component, not per section", () => {
  // Two unconnected pieces, two and two terminals: one point each, not one overall.
  const points = isolationPoints(
    [r("A", "in", "out"), r("B", "hi_boost_out", "0")],
    new Set(["in", "out", "hi_boost_out", "0"]),
  )
  expect(connectedGroups([r("A", "in", "out"), r("B", "hi_boost_out", "0")])).toHaveLength(2)
  expect(points).toHaveLength(2)
})

test("the chosen points leave exactly one terminal per group attached", () => {
  const group = [r("SCAF_LB", "lo_boost_in", "out", 56_000), r("SCAF_LB_SHUNT", "lo_boost_in", "0", 0)]
  const points = isolationPoints(group, new Set(["lo_boost_in", "out", "0"]))
  const broken = new Set(points.map((p) => `${p.component}.${p.terminal}`))
  expect(broken.size).toBe(2)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/board/scaffold-isolate.test.ts`

- [ ] **Step 3: Implement**

```ts
/** Where a stand-in must be breakable to take it out of circuit.
 *
 * FOR EACH CONNECTED COMPONENT, ISOLATE ALL BUT ONE DISTINCT EXTERNAL TERMINAL -
 * ground counting as a terminal. Breaking all but one leaves that piece hanging by a
 * single point, joining nothing to nothing; breaking fewer leaves a conductive path.
 *
 * Per connected component, NOT per section: a section whose flat state resolves into
 * two unconnected pieces needs each isolated on its own, and one count applied to the
 * whole section would be wrong. It is a sufficient construction, not a proven minimum.
 */
import type { ResolvedComponent } from "../../model/control-state.ts"

export interface IsolationPoint {
  readonly component: string
  readonly terminal: string
  readonly net: string
}

function nodesOf(component: ResolvedComponent): string[] {
  const nodes = new Set<string>(Object.values(component.pins))
  for (const unit of component.units) for (const net of Object.values(unit.pins)) nodes.add(net)
  return [...nodes]
}

export function connectedGroups(
  components: readonly ResolvedComponent[],
): readonly (readonly ResolvedComponent[])[] {
  const groups: ResolvedComponent[][] = []
  const unassigned = [...components]
  while (unassigned.length > 0) {
    const seed = unassigned.shift()!
    const group = [seed]
    const nets = new Set(nodesOf(seed))
    let grew = true
    while (grew) {
      grew = false
      for (let i = unassigned.length - 1; i >= 0; i -= 1) {
        const candidate = unassigned[i]!
        if (!nodesOf(candidate).some((net) => nets.has(net))) continue
        for (const net of nodesOf(candidate)) nets.add(net)
        group.push(candidate)
        unassigned.splice(i, 1)
        grew = true
      }
    }
    groups.push(group)
  }
  return groups
}

export function isolationPoints(
  components: readonly ResolvedComponent[],
  boundary: ReadonlySet<string>,
): readonly IsolationPoint[] {
  const points: IsolationPoint[] = []
  for (const group of connectedGroups(components)) {
    const terminals: IsolationPoint[] = []
    const seen = new Set<string>()
    for (const component of group) {
      for (const unit of component.units) {
        for (const [terminal, net] of Object.entries(unit.pins)) {
          if (!boundary.has(net) || seen.has(net)) continue
          seen.add(net)
          terminals.push({ component: component.id, terminal, net })
        }
      }
    }
    // Keep one attached. Ground is the cheapest leg to leave connected, so prefer it.
    const sorted = [...terminals].sort((a, b) => (a.net === "0" ? 1 : b.net === "0" ? -1 : a.net < b.net ? -1 : 1))
    points.push(...sorted.slice(0, Math.max(sorted.length - 1, 0)))
  }
  return points
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test tests/board/scaffold-isolate.test.ts && bun run typecheck`

- [ ] **Step 5: Commit**

```bash
git add lib/board/scaffold/isolate.ts tests/board/scaffold-isolate.test.ts
git commit -m "Derive isolation points from each stand-in's connected components"
```

---

### Task 5: `standIn()`, and Gate A1 structural equivalence

**Files:**
- Create: `lib/board/scaffold/index.ts`
- Test: `tests/board/scaffold-equivalence.test.ts`

**Interfaces:**
- Produces: `standIn(sectionName, modules, flat): StandIn` where
  `StandIn = { readonly section: string; readonly flat: FlatState; readonly boundary: readonly string[]; readonly components: readonly ResolvedComponent[]; readonly isolation: readonly IsolationPoint[] }`

- [ ] **Step 1: Write the failing test**

```ts
import { test, expect } from "bun:test"
import { standIn } from "../../lib/board/scaffold/index.ts"
import { REFERENCE_FLAT, resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"

const modules = partitionReference().modules
const SECTIONS = ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"] as const

test("GATE A1: a stand-in is a SUBSET of the section's flat-resolved components", () => {
  // Exact, with no tolerance. Nothing is being fitted, so no numerical threshold
  // should ever be what decides correctness.
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const resolved = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    const live = new Set(resolved.components.map((c) => c.id))
    for (const component of derived.components) {
      expect(live.has(component.id), `${section}: ${component.id}`).toBe(true)
    }
  }
})

test("GATE A1: boundary node identities are unchanged by derivation", () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const nodes = new Set(derived.components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))))
    for (const net of derived.boundary) {
      if (net === "0") continue
      expect(nodes.has(net), `${section}: ${net}`).toBe(true)
    }
  }
})

test("the isolation count matches what the spec reports", () => {
  const expected: Record<string, number> = {
    "hi-boost": 1, "hi-cut": 1, "low-cut": 1, "low-boost": 2, "mid": 2,
  }
  let total = 0
  for (const section of SECTIONS) {
    const count = standIn(section, modules, REFERENCE_FLAT).isolation.length
    expect(count, section).toBe(expected[section]!)
    total += count
  }
  expect(total).toBe(7)
})

test("a stand-in carries the flat state it emulates", () => {
  // The setting is not implicit. Up to 3.71 dB rides on it.
  expect(standIn("hi-cut", modules, REFERENCE_FLAT).flat).toEqual(REFERENCE_FLAT)
})

test("derivation is deterministic", () => {
  const a = standIn("mid", modules, REFERENCE_FLAT)
  const b = standIn("mid", modules, REFERENCE_FLAT)
  expect(JSON.stringify(a)).toBe(JSON.stringify(b))
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/board/scaffold-equivalence.test.ts`

- [ ] **Step 3: Implement**

```ts
/** A stand-in for an absent Pultec section: the section, at flat, with everything
 * disconnected removed. Derived, never transcribed - a hand-written table of values
 * would be a parallel copy of what the model already states and would drift the first
 * time a capacitor changed, and the drift would look like a measurement.
 */
import { discoverBoundary } from "./boundary.ts"
import { GROUND_NET, resolveSectionFlat } from "./flat.ts"
import { isolationPoints } from "./isolate.ts"
import { reduceToBoundary } from "./reduce.ts"
import type { Component } from "../../model/types.ts"
import type { ResolvedComponent } from "../../model/control-state.ts"
import type { FlatState } from "./flat.ts"
import type { IsolationPoint } from "./isolate.ts"

export interface StandIn {
  readonly section: string
  readonly flat: FlatState
  readonly boundary: readonly string[]
  readonly components: readonly ResolvedComponent[]
  readonly isolation: readonly IsolationPoint[]
}

export function standIn(
  sectionName: string,
  modules: Record<string, readonly Component[]>,
  flat: FlatState,
): StandIn {
  const boundary = discoverBoundary(sectionName, modules, GROUND_NET)
  const resolved = resolveSectionFlat(sectionName, modules, flat)
  const components = reduceToBoundary(resolved, boundary)
  if (components.length === 0) {
    throw new Error(
      `Stand-in for ${sectionName} reduced to nothing. Either the boundary was ` +
        `discovered wrongly or the flat state disconnected the section entirely.`,
    )
  }
  return {
    section: sectionName,
    flat,
    boundary: [...boundary].sort(),
    components,
    isolation: isolationPoints(components, boundary),
  }
}

export type { FlatState } from "./flat.ts"
export { REFERENCE_FLAT } from "./flat.ts"
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test tests/board/scaffold-equivalence.test.ts && bun run typecheck`

- [ ] **Step 5: Commit**

```bash
git add lib/board/scaffold/index.ts tests/board/scaffold-equivalence.test.ts
git commit -m "Derive a section's stand-in, exact by construction"
```

---

### Task 6: Gate A2, numerical boundary equivalence

**Files:**
- Create: `lib/board/scaffold/admittance.ts`
- Modify: `tests/board/scaffold-equivalence.test.ts`

**Interfaces:**
- Produces: `boundaryAdmittance(components, boundary, hz): Promise<ReadonlyMap<string, Complex>>` with `Complex = { readonly re: number; readonly im: number }`

- [ ] **Step 1: Write the failing test**

Add to `tests/board/scaffold-equivalence.test.ts`:

```ts
import { boundaryAdmittance } from "../../lib/board/scaffold/admittance.ts"

const SAMPLE_HZ = [20, 50, 120, 300, 800, 2000, 5000, 12000, 20000]
const RELATIVE = 1e-9
const FLOOR = 1e-15

test("GATE A2: stand-in and real flat section agree on boundary admittance", async () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const resolved = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    const boundary = new Set(derived.boundary)
    for (const hz of SAMPLE_HZ) {
      const a = await boundaryAdmittance(derived.components, boundary, hz)
      const b = await boundaryAdmittance(resolved.components, boundary, hz)
      for (const [key, expected] of b) {
        const actual = a.get(key)
        expect(actual, `${section} ${key} @${hz}Hz`).toBeDefined()
        for (const part of ["re", "im"] as const) {
          const tolerance = Math.max(Math.abs(expected[part]) * RELATIVE, FLOOR)
          expect(Math.abs(actual![part] - expected[part]), `${section} ${key}.${part} @${hz}Hz`)
            .toBeLessThanOrEqual(tolerance)
        }
      }
    }
  }
}, 120_000)
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/board/scaffold-equivalence.test.ts`

- [ ] **Step 3: Implement**

Drive each boundary node in turn with a 1 V AC source, grounding the others, and read the current into every boundary node. The matrix entry is `I(j)/V(i)`. Use the existing `toSpiceNetlist` and `runAcSweep`, requesting current probes. Tolerances are solver-noise, not perceptual, because the two networks are structurally identical: anything above numerical noise is a defect.

```ts
/** Boundary admittance of a network, as seen at its externally shared nodes.
 *
 * A GUARD, NOT A FITTING CRITERION. Gate A1 already proves the stand-in is a subset
 * of the section's own flat components, so this must agree to solver noise. It exists
 * to catch the reduction invariants being implemented wrongly in a way that still
 * produces a plausible network.
 */
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test tests/board/scaffold-equivalence.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/board/scaffold/admittance.ts tests/board/scaffold-equivalence.test.ts
git commit -m "Check boundary admittance as a guard on the reduction"
```

---

### Task 7: Gate B, composition across all 31 combinations and control vectors

**Files:**
- Create: `tests/pultec/scaffold-composition.test.ts`

- [ ] **Step 1: Write the test**

For every non-empty subset of the five sections: compose the present sections' components with `standIn()` output for each absent section, and compare each present section's behaviour against `THREE_BAND_REFERENCE` under the **same** control vector, absent sections held at `REFERENCE_FLAT`.

Control vectors per subset, because this circuit is interactive and a one-control-at-a-time test never exercises its characteristic move:

```ts
const VECTORS = [
  "all-flat",
  "each-at-max",          // one per present section
  "lo-boost-and-lo-cut",  // the EQP-1 move: both raised at the same frequency
  "hi-boost-and-hi-cut",
  "all-at-max",
] as const
const TOLERANCE_DB = 1e-6   // looser than A2 deliberately: two different netlists,
                            // so solver matrix ordering differs. Not perceptual.
```

Assertions are on unrounded values. Every `0.00 dB` in the spec is a two-decimal rendering that would pass a 0.004 dB error.

- [ ] **Step 2: Run it**

Run: `bun test tests/pultec/scaffold-composition.test.ts`
Expected: the 31 subsets pass. A failure names the subset, section, vector and frequency.

- [ ] **Step 3: Commit**

```bash
git add tests/pultec/scaffold-composition.test.ts
git commit -m "Prove the stand-in rule composes for all 31 section combinations"
```

---

### Task 8: The scaffold board circuit, and the committed derived artifact

**Files:**
- Create: `circuits/pultec/scaffold.ts`
- Create: `circuits/pultec/generated/scaffold.json`
- Modify: `make/pultec.mk`

- [ ] **Step 1: Write the failing test**

A test that `circuits/pultec/generated/scaffold.json` equals what `standIn()` produces for all five sections, compared by content and **read-only** - it must not rewrite the file it checks. An earlier wiring-sync test called the writing function, quietly repaired stale files and then passed; `tests/perfboard/wiring-sync.test.ts` carries that lesson in a comment.

- [ ] **Step 2: Implement** `circuits/pultec/scaffold.ts`, exporting a `Network` for the scaffold board: every stand-in's components, each isolation point realised as a two-pad link, plus a terminal block for the boundary nets. Links are `physicalOnly` only where they carry no current in the state they represent; the stand-in components themselves are ordinary conducting components on a board whose declared purpose is to conduct.

- [ ] **Step 3: Wire the freshness guard** into `make/pultec.mk` beside `pultec-schematic-agrees`.

- [ ] **Step 4: Run** `bun test && make check`

- [ ] **Step 5: Commit**

---

### Task 9: Scaffold section in the wiring guide, verified against connectivity

**Files:**
- Modify: `lib/board/wiring.ts`
- Modify: `tests/board/wiring.test.ts`
- Create: `boards/pultec-scaffold/perfboard.json`

- [ ] **Step 1: Write the failing test** - the guide names each link, the section it stands in for, which state means absent, and the emulated frequency setting; a stand-in needing two links shows both under the same section name so a half-disabled stand-in reads as obviously incomplete.

- [ ] **Step 2: Implement** the scaffold section in `wiringDocument`.

- [ ] **Step 3: Verify the guide against the layout** - a test asserting the guide's link instructions match the connectivity of the generated layout, so the guide cannot drift into correct-looking instructions for a wrong board.

- [ ] **Step 4: Run** `bun test && make check`

- [ ] **Step 5: Commit**

---

### Task 10: Gate C, integration on the layout-derived graph

**Files:**
- Create: `tests/pultec/scaffold-integration.test.ts`

**Blocked until** `boards/pultec-scaffold/` has a VeroRoute layout, which is the owner's work. Until then this task's test must **fail loudly rather than skip**, because a skipped check that looks like a passing one is the failure mode the whole workflow exists to prevent.

- [ ] **Step 1:** With all five sections present and every link omitted, assert **strict graph equivalence** between the reference network and the graph derived from the exported layout netlists of the section boards, the scaffold board, and the inter-board wiring.

- [ ] **Step 2:** Record the limitation in the test's own comment: a layout exists in one link configuration at a time, so this verifies the configuration as built and nothing else. All-31 coverage is Gate B's job, and neither gate subsumes the other.

- [ ] **Step 3: Commit**
