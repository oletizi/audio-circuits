/**
 * GATE C, MODEL HALF: with all five section boards built and NO stand-in group
 * populated on any of them, the composed network must be STRICTLY EQUIVALENT to
 * `THREE_BAND_REFERENCE` - not "measures the same", equivalent as a graph.
 *
 * WHAT CHANGED FROM THE PREVIOUS REVISION. Scaffolding used to live on a separate
 * scaffold board whose links could be pulled; `circuits/pultec/scaffold.ts` and this
 * test's old premise ("every link removed") are both gone. The scaffolding now lives
 * ON the five section boards (`circuits/pultec/physical/board.ts`), and which parts a
 * board carries is a BUILD-TIME choice - which stand-in groups get populated - rather
 * than a run-time link position. `boardNetwork(section, present)` makes that choice
 * explicit: with all five sections present, `suppliers()` (lib/board/scaffold/
 * supplier.ts) assigns no absent-section group to any board, so `boardNetwork(section,
 * ALL_FIVE)` is exactly that section's own parts plus the junction - no stand-in
 * component is ever constructed for this configuration. Composing all five of those
 * is what this test checks against the reference.
 *
 * SCOPE, AND WHAT THIS DOES NOT COVER. The design doc's Gate C also asks for strict
 * equivalence on the graph DERIVED FROM THE PHYSICAL LAYOUT - the netlist exported from
 * the five boards' perfboard layouts, as populated, plus the junction wiring between
 * them. This test is the OTHER half, the one reachable without a layout: the same
 * strict-equivalence claim, checked on the model `boardNetwork()` and
 * `THREE_BAND_REFERENCE` already agree to build from. The layout-derived half waits on
 * all five VeroRoute layouts being redrawn - low-boost's is stale twice over and the
 * other four were never drawn - which is the human designer's work, not this suite's.
 * See "Limits, measured" and "Two milestones" in
 * `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`.
 *
 * PROPERTY (a): NO STAND-IN-ORIGINATED COMPONENT IS PRESENT. In the previous revision
 * this had to be a LIVENESS question - every stand-in sat physically on the board with
 * one link-controlled leg still wired, so the test had to prove that leg carried no
 * current between two boundary nodes. That liveness machinery (a boundary DERIVED from
 * the resolved network, because a hardcoded `{in, out, 0}` list missed a leak confined
 * to the two interior ladder nodes - see the Task 8 defect this module comment used to
 * describe) does not carry over verbatim, because the new model has no such residual
 * state: a stand-in group's parts are either on the board, fully wired into the ladder,
 * or simply not populated. So property (a) is checked directly, by provenance
 * (`STAND_IN_SOURCE` from `circuits/pultec/physical/board.ts`), against every net the
 * composed network has - which is WIDER than any net-boundary check could be, since it
 * does not depend on which nets a leaked group happens to touch. See the can-fail test
 * below, which reconstructs exactly the scenario the old wide boundary existed for and
 * shows property (a) still catches it where a boundary limited to the reference's own
 * ports would not.
 *
 * PROPERTY (b): THE LIVE SUBGRAPH MATCHES THE REFERENCE'S, EXACTLY. This is unchanged
 * in shape from the previous revision: both networks are reduced against
 * `THREE_BAND_REFERENCE`'s own declared ports (read off `THREE_BAND_REFERENCE.ports`,
 * not a hardcoded net-name list) and compared by id, kind, parameters and nets. That
 * boundary is the right one for this property, not the wrong one: property (b) asks
 * whether the REAL circuit's live subgraph still matches the reference's, and both
 * sides must be reduced against the same thing the reference itself presents to the
 * world.
 */
import { test, expect } from "bun:test"
import { boardNetwork, standInGroup, STAND_IN_SOURCE } from "../../circuits/pultec/physical/board.ts"
import { LADDER_ORDER } from "../../lib/board/scaffold/supplier.ts"
import { THREE_BAND_REFERENCE } from "../../circuits/pultec/electrical/three-band.ts"
import { REFERENCE_FLAT } from "../../lib/board/scaffold/index.ts"
import { flatControlState } from "../../lib/board/scaffold/flat.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { reduceToBoundary } from "../../lib/board/scaffold/reduce.ts"
import { projectPhysical } from "../../lib/board/physicalize.ts"
import type { Component, Network } from "../../lib/model/types.ts"
import type { ResolvedComponent, ResolvedNetwork } from "../../lib/model/control-state.ts"

/** Every section, built: the configuration Gate C's model half checks. */
const ALL_FIVE: ReadonlySet<string> = new Set(LADDER_ORDER)

/**
 * The five boards' own parts plus the junction, with the junction's physical-only
 * headers projected away - see `lib/board/physicalize.ts`. No stand-in group is
 * constructed for this configuration (`suppliers(ALL_FIVE)` assigns nothing, because
 * every section already has a present owner - see `groupsOn` in
 * `circuits/pultec/physical/board.ts`), so this is exactly the five sections' own
 * components reassembled, with footprints and symbols attached that the bare reference
 * network does not carry.
 */
function composedNetwork(): Network {
  const components: Component[] = []
  for (const section of LADDER_ORDER) components.push(...boardNetwork(section, ALL_FIVE).components)
  return projectPhysical({ ports: THREE_BAND_REFERENCE.ports, components })
}

const combined: Network = composedNetwork()

/** Both networks share every potentiometer and switch id - the composed network is a
 * repartition of the reference's own components, not a parallel model of them - so one
 * control state, built from the reference's components, resolves either. */
const flatState = flatControlState(THREE_BAND_REFERENCE.components, REFERENCE_FLAT)

const resolvedComposed: ResolvedNetwork = resolveNetwork(combined, flatState)
const resolvedReference: ResolvedNetwork = resolveNetwork(THREE_BAND_REFERENCE, flatState)

/** `THREE_BAND_REFERENCE`'s own declared ports - read off the network, not restated as
 * a literal list. See the module comment for why this (and not a wider derived set) is
 * the right boundary for property (b). */
const REFERENCE_PORTS: ReadonlySet<string> = new Set(Object.values(THREE_BAND_REFERENCE.ports))

/** Stable key for a resolved component's full electrical identity: id, kind,
 * parameters and every unit's pins. Two components with this key equal are the same
 * component on the same nets. */
function identity(component: ResolvedComponent): string {
  return JSON.stringify({
    id: component.id,
    kind: component.kind,
    parameters: component.parameters,
    units: component.units,
  })
}

function standInsIn(components: readonly Component[]): readonly Component[] {
  return components.filter((component) => component.provenance?.source === STAND_IN_SOURCE)
}

test("GATE C (model): the composed network actually has five sections' worth of real parts", () => {
  // Guards the test itself: if `boardNetwork` or `projectPhysical` silently dropped a
  // section's components, property (a) would pass vacuously (nothing to be a stand-in,
  // because nothing survived at all) and prove nothing.
  expect(combined.components.length).toBe(THREE_BAND_REFERENCE.components.length)
})

test("GATE C (model): no stand-in-originated component is present when all five sections are built", () => {
  const leaked = standInsIn(combined.components)
  expect(leaked.map((component) => component.id)).toEqual([])
})

test("GATE C (model): the live subgraph equals THREE_BAND_REFERENCE's, exactly", () => {
  const liveComposed = reduceToBoundary(resolvedComposed, REFERENCE_PORTS)
  const liveReference = reduceToBoundary(resolvedReference, REFERENCE_PORTS)

  const composedKeys = new Set(liveComposed.map(identity))
  const referenceKeys = new Set(liveReference.map(identity))

  const onlyInReference = liveReference.map(identity).filter((key) => !composedKeys.has(key))
  const onlyInComposed = liveComposed.map(identity).filter((key) => !referenceKeys.has(key))

  // THIS GATE'S OWN FLOOR, not a neighbour's. Two empty live sets satisfy every
  // assertion below - no key is only on one side, and the lengths match at zero - so
  // without this the gate reports a pass on a reduction that returned nothing.
  // Confirmed by mutation: `reduceToBoundary` made to return nothing for networks over
  // 30 components (which spares the smaller derivations the module-level stand-ins are
  // built from) left this test GREEN and was caught only by the can-fail companion
  // below. A companion catching it is good; a gate that reads as THE gate reporting a
  // pass on nothing is not.
  expect(liveReference.length, "the reference reduced to nothing, so (b) proves nothing")
    .toBeGreaterThan(0)
  expect(liveComposed.length, "the composition reduced to nothing, so (b) proves nothing")
    .toBeGreaterThan(0)

  // Exact set equality, not a count match and not a tolerance.
  expect(onlyInReference).toEqual([])
  expect(onlyInComposed).toEqual([])
  expect(liveComposed).toHaveLength(liveReference.length)
})

test("GATE C (model) CAN fail: a stand-in group wrongly populated when all five sections are present", () => {
  // `boardNetwork()` cannot produce this by construction - `suppliers(ALL_FIVE)`
  // assigns no group to any board, so there is no code path in this feature that would
  // ever populate low-cut's stand-in while low-cut itself is on the bench. The defect
  // has to be reconstructed by hand to prove the gate would catch it if a build mistake
  // ever put it there - a gate that cannot fail proves nothing, and this feature has
  // already had two tests that could not fail, both found by mutation.
  const leak = standInGroup("low-cut").components
  const corrupted: Network = { ports: combined.ports, components: [...combined.components, ...leak] }

  // Property (a) catches it directly and unconditionally: the corrupted network now
  // carries components whose provenance says they stand in for an absent section,
  // which this gate says never happens once all five are present. This does not depend
  // on which nets the leaked group touches, which is why it is checked first and does
  // not lean on property (b)'s boundary at all.
  const tagged = standInsIn(corrupted.components)
  expect(tagged.map((component) => component.id)).toEqual(leak.map((component) => component.id))
  expect(tagged.length).toBeGreaterThan(0)

  // Property (b) catches the SAME defect too, independently, and the mechanism is
  // worth recording because it is not the one the previous revision's module comment
  // warned about. low-cut's stand-in is a derived COPY of low-cut's own live
  // components, so `SI_LOW_CUT_RV_LO_CUT.ccw-wiper` is a second ideal (0 ohm) short
  // between `hi_boost_out` and `out`, parallel to the real `RV_LO_CUT.ccw-wiper`.
  // `reduceToBoundary` treats an ideal short as a node merge for every OTHER
  // component's liveness test (see lib/board/scaffold/reduce.ts), so with two shorts
  // present each one's own two endpoints collapse to a single electrical node once the
  // OTHER is counted among "the rest of the graph" - both the leak and the real
  // component it duplicates end up judged dead. The identity-diff below surfaces this
  // as the real `RV_LO_CUT.ccw-wiper` dropping out of the live set entirely: not an
  // extra component appearing, but a genuine one disappearing, which the same
  // exact-equality check this gate already runs (property (b)'s own test above) is
  // sufficient to catch without any change of boundary.
  const corruptedState = flatControlState(corrupted.components, REFERENCE_FLAT)
  const resolvedCorrupted = resolveNetwork(corrupted, corruptedState)
  const liveCorrupted = reduceToBoundary(resolvedCorrupted, REFERENCE_PORTS)
  const liveReferenceAgain = reduceToBoundary(resolvedReference, REFERENCE_PORTS)
  const corruptedKeys = new Set(liveCorrupted.map(identity))
  const missingFromCorrupted = liveReferenceAgain.map(identity).filter((key) => !corruptedKeys.has(key))
  expect(missingFromCorrupted).not.toEqual([])
  expect(liveCorrupted.length).not.toBe(liveReferenceAgain.length)
})
