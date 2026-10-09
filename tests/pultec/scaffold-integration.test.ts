/**
 * GATE C, MODEL HALF: with all five sections present and every scaffold link in its
 * "removed" position, the recovered circuit must be STRICTLY EQUIVALENT to
 * `THREE_BAND_REFERENCE` - not "measures the same", equivalent as a graph. This is
 * what protects the transparency guarantee: the scaffold board may sit in a finished
 * build with its links pulled and must then be electrically invisible.
 *
 * SCOPE, AND WHAT THIS DOES NOT COVER. The design doc's Gate C asks for strict
 * equivalence on the graph DERIVED FROM THE PHYSICAL LAYOUT - the netlist exported
 * from the perfboard layouts of the section boards and the scaffold board, plus the
 * inter-board wiring, in their as-built state. That half is unreachable right now:
 * `boards/pultec-scaffold/` has no perfboard declaration, because a perfboard-driven
 * board needs a physicalization (a `DESIGNATORS` map, pad orders, an off-board set)
 * that does not exist for the scaffold, and the Pultec takes its designators from a
 * vendored schematic the scaffold does not have - inventing `JP1..JP7` would be
 * fabrication (see `lib/board/scaffold/wiring.ts`'s module comment). This test is the
 * half of Gate C that IS available without that: the same strict-equivalence claim,
 * checked on the model that `pultecScaffold()` and `THREE_BAND_REFERENCE` already
 * agree to build from. It is not a substitute for the layout-derived half - a layout
 * can drift from the model that describes it, and only re-exporting the real netlists
 * catches that drift. See "Limits, measured" in the design doc for what must exist
 * (a VeroRoute layout and a declared board) before that half can run.
 *
 * ALSO OUT OF SCOPE HERE, DELIBERATELY: this checks exactly ONE link configuration
 * (every link removed, all five sections present) and exactly one control vector
 * (`SCAFFOLD_FLAT`, the setting every figure in the design doc was measured at). All
 * 31 section combinations, under multiple control vectors, is Gate B's job
 * (`tests/pultec/scaffold-composition.test.ts`) and is already covered there to
 * `1e-6` dB. Neither gate subsumes the other: Gate B covers every configuration but
 * only numerically and only on the model; this gate covers one configuration, but
 * exactly - as a graph, with no tolerance at all.
 *
 * MERGING TWO BOARDS INTO ONE NETWORK IS NOT FREE, AND IS THE SUBSTANCE OF THIS TEST.
 * `pultecScaffold()`'s stand-in components are themselves resolved fragments of the
 * real sections at flat (see that module's own comment) - low-boost's stand-in
 * literally reuses the id "R2" and low-boost's own internal netlist-derived net names,
 * because that is what "a subset of the absent section's own flat-state components"
 * means. On a real bench that is harmless: the stand-in and the real section are two
 * different physical boards, and the only wire between them is the terminal block's
 * screw connection to the shared boundary nets. Modelled naively as one `Network` -
 * ids and net names both left alone - the scaffold's copy of "R2" collides with the
 * real low-boost board's own "R2", and, more dangerously, an internal net the
 * stand-in inherited from low-boost's own wiring (a raw netlist label, not a
 * deliberately shared boundary name) would silently alias the SAME label on the real
 * board and bridge two boards that share no actual wire. `foldIn` below is what keeps
 * the model honest about which nets are actually shared (the scaffold's own declared
 * ports - its terminal-block nets) and which are private to one board or the other.
 *
 * WHY PROPERTY (a) IS NOT A NAIVE RE-USE OF `reduceToBoundary` ON THE WHOLE NETWORK.
 * With links removed, a stand-in's connected group keeps exactly one permanent,
 * unlinked connection to a real net (see the "Isolation" section of the design doc -
 * breaking all but one leg is the rule). Run `reduceToBoundary` on the FULL merged
 * network and that one permanent leg is a real problem: it usually lands on a richly
 * connected real node (`in`, `0`, or a ladder node), and `reduceToBoundary`'s
 * simple-path test, when "the rest of the graph" includes the WHOLE real circuit, can
 * walk from a stand-in component, out through that one real node, and from there reach
 * two further real ports through paths that have nothing to do with the stand-in at
 * all - a false "live" verdict caused by the hub, not by the component. The tool is
 * sound for what it was built for (reducing ONE section against a small, explicit
 * boundary-net set with no other section's components in the graph) and unsound at
 * whole-circuit scale for exactly that reason. The fix is to give it the scope it
 * expects: this test asks property (a) of a resolved network containing ONLY the
 * scaffold's own components, so there is no real circuit on the far side of that one
 * permanent leg for the walk to escape into.
 */
import { test, expect } from "bun:test"
import { pultecScaffold, SCAFFOLD_FLAT } from "../../circuits/pultec/scaffold.ts"
import { THREE_BAND_REFERENCE } from "../../circuits/pultec/electrical/three-band.ts"
import { flatControlState } from "../../lib/board/scaffold/flat.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { reduceToBoundary } from "../../lib/board/scaffold/reduce.ts"
import { projectPhysical } from "../../lib/board/physicalize.ts"
import type { Component, Connection, Network } from "../../lib/model/types.ts"
import type { ControlState, ResolvedComponent, ResolvedNetwork } from "../../lib/model/control-state.ts"

/** Every scaffold-originated id in the merged network carries this prefix, so a
 * component's origin is recoverable after merging without re-deriving it. */
const SCAFFOLD_PREFIX = "SCAFFOLD_"
/** Every scaffold-private net (anything not one of the scaffold's own declared
 * boundary ports) carries this prefix - see the module comment's "merging two boards
 * is not free". */
const SCAFFOLD_NET_PREFIX = "SCAFFOLD_NET_"

function scopeNet(boundaryNets: ReadonlySet<string>, netName: string): string {
  return boundaryNets.has(netName) ? netName : `${SCAFFOLD_NET_PREFIX}${netName}`
}

function scopeConnection(boundaryNets: ReadonlySet<string>, connection: Connection): Connection {
  return connection.kind === "net" ? { kind: "net", net: scopeNet(boundaryNets, connection.net) } : connection
}

/** Fold the scaffold board into the real five-section network as two physically
 * separate boards sharing only their declared boundary nets - see the module comment
 * for why a naive merge of ids and net names is unsound. */
function foldIn(scaffold: Network, real: Network): Network {
  const boundaryNets = new Set(Object.values(scaffold.ports))
  // The scaffold's terminal block is physical-only (a screw terminal, electrically
  // transparent by its own test in tests/pultec/scaffold-board.test.ts) and contributes
  // no electrical content of its own; projecting it away leaves exactly the stand-in
  // components and the links.
  const electrical = projectPhysical(scaffold)
  const scoped: readonly Component[] = electrical.components.map((component) => ({
    ...component,
    id: `${SCAFFOLD_PREFIX}${component.id}`,
    pins: Object.fromEntries(
      Object.entries(component.pins).map(([pin, connection]) => [pin, scopeConnection(boundaryNets, connection)]),
    ),
    units: component.units.map((unit) => ({
      ...unit,
      pins: Object.fromEntries(
        Object.entries(unit.pins).map(([pin, connection]) => [pin, scopeConnection(boundaryNets, connection)]),
      ),
    })),
  }))
  return { ports: real.ports, components: [...real.components, ...scoped] }
}

/** Every link on the merged board, set to "removed" - the configuration this gate
 * checks. Built from the components actually present, for the same reason
 * `flatControlState` is: a hand-written list of link ids would silently go stale the
 * next time a stand-in's isolation count changed. */
function allLinksRemoved(components: readonly Component[]): Readonly<Record<string, string>> {
  const positions: Record<string, string> = {}
  for (const component of components) {
    if (component.kind === "switch" && component.id.startsWith(SCAFFOLD_PREFIX)) positions[component.id] = "removed"
  }
  return positions
}

const combined = foldIn(pultecScaffold(), THREE_BAND_REFERENCE)

/** The real sections' own control state at the setting every scaffold figure was
 * measured at - built from the components actually present, so `RV_HI_Q` (which rides
 * on hi-boost) is never silently omitted. */
const realState: ControlState = flatControlState(THREE_BAND_REFERENCE.components, SCAFFOLD_FLAT)
const combinedState: ControlState = {
  potPositions: realState.potPositions,
  switchPositions: { ...realState.switchPositions, ...allLinksRemoved(combined.components) },
}

const resolvedComposed: ResolvedNetwork = resolveNetwork(combined, combinedState)
const resolvedReference: ResolvedNetwork = resolveNetwork(THREE_BAND_REFERENCE, realState)

/** The boundary property (a) is asked against: EVERY net the scaffold shares with the
 * real circuit, not the three nets `THREE_BAND_REFERENCE` declares externally.
 *
 * THE NARROWER SET MAKES THE GATE BLIND WHERE IT MATTERS MOST. `THREE_BAND_REFERENCE`
 * declares `{in, out, 0}`, but the scaffold crosses FIVE nets - it also touches the two
 * INTERIOR ladder nodes, `hi_boost_out` and `lo_boost_in`. A leak confined to those two
 * joins no two of `{in, out, 0}`, so `reduceToBoundary` reports an empty live set and
 * property (a) passes; property (b) cannot see it either, because it compares the REAL
 * components' live subgraph and a stray scaffold load on an interior node need not
 * change which real components conduct. That is not hypothetical: the Task 8 isolation
 * defect, reconstructed for low-cut alone, is INVISIBLE under `{in, out, 0}` and caught
 * under the five. The gate found mid's half of it only because mid happened to bridge
 * `in` and `0`.
 *
 * DERIVED, NOT LISTED, for three reasons. A hardcoded pre-resolution list would be
 * wrong as well as fragile: `lo_boost_in` is merged away by a closed selector contact
 * and resolves to `j10_p4` in the combined network, so the name to test against is not
 * the name the scaffold declares. The set must grow by itself if a sixth stand-in ever
 * crosses a sixth net. And - the reason it is strongest derived - IT GROWS EXACTLY WHEN
 * THE DEFECT IT HUNTS IS PRESENT. So it is read off the resolved scaffold-only network:
 * every net that did NOT get the scaffold-private prefix is, by construction of
 * `foldIn`, a net the scaffold shares with the real circuit.
 *
 * WHY `hi_boost_out` IS NOT IN THE DERIVED SET, AND WHY THAT IS THE POINT. Four of the
 * five stand-ins touch `hi_boost_out`, and all four isolate it, so with every link
 * removed NOTHING on the scaffold reaches it: `resolveNetwork` drops switches from its
 * component list, so a link contributes no net of its own. The derived set is therefore
 * `{0, in, j10_p4, out}` - the four nets a stand-in still touches permanently, one per
 * connected group, exactly as the isolation rule requires. If isolation ever failed at
 * `hi_boost_out`, the component left behind would put `hi_boost_out` back into this set
 * and the liveness check below would then have two boundary nets to bridge. Deriving it
 * is thus not a weaker version of the five-net list; it is equivalent to it on a correct
 * board and identical to it on a broken one. */
/** The three nets `THREE_BAND_REFERENCE` declares externally.
 *
 * This is the RIGHT boundary for property (b) and the wrong one for property (a), and
 * the difference is what the two properties ask. Property (b) compares the REAL
 * circuit's live subgraph against the reference's, and both must be reduced against the
 * same thing the reference itself presents to the world - its own declared ports.
 * Property (a) asks whether the SCAFFOLD bridges anything, and the scaffold's own
 * boundary is wider; see `sharedBoundary`. */
const REFERENCE_PORTS: ReadonlySet<string> = new Set(Object.values(THREE_BAND_REFERENCE.ports))

function sharedBoundary(scaffoldOnly: readonly ResolvedComponent[]): ReadonlySet<string> {
  const shared = new Set<string>()
  for (const component of scaffoldOnly) {
    for (const unit of component.units) {
      for (const net of Object.values(unit.pins)) {
        if (!net.startsWith(SCAFFOLD_NET_PREFIX)) shared.add(net)
      }
    }
    for (const net of Object.values(component.pins)) {
      if (!net.startsWith(SCAFFOLD_NET_PREFIX)) shared.add(net)
    }
  }
  if (shared.size < 2) {
    throw new Error(
      `The scaffold shares ${shared.size} net(s) with the real circuit ` +
        `(${[...shared].join(", ") || "none"}). Property (a) needs at least two to ` +
        `ask whether anything bridges them; fewer means foldIn's net scoping or the ` +
        `isolation wiring changed shape, and the gate must not be run as if it still ` +
        `meant something.`,
    )
  }
  return shared
}

function isScaffold(component: ResolvedComponent): boolean {
  return component.id.startsWith(SCAFFOLD_PREFIX)
}

/** Stable key for a resolved component's full electrical identity: id, kind,
 * parameters and every unit's pins. Two components with this key equal are the same
 * component on the same nets - exactly what "same components by id, kind and
 * parameters, with the same nets on the same pins" means. */
function identity(component: ResolvedComponent): string {
  return JSON.stringify({
    id: component.id,
    kind: component.kind,
    parameters: component.parameters,
    units: component.units,
  })
}

test("the merged board actually has links, and every one of them is removed", () => {
  const links = combined.components.filter(
    (component) => component.kind === "switch" && component.id.startsWith(SCAFFOLD_PREFIX),
  )
  expect(links.length).toBeGreaterThan(0)
  for (const link of links) {
    expect(combinedState.switchPositions[link.id], link.id).toBe("removed")
  }
})

test("GATE C (model): every scaffold-originated component is dead - on no path between two of the circuit's ports", () => {
  const scaffoldOnly = resolvedComposed.components.filter(isScaffold)
  // Guards the test itself: if nothing from the scaffold survives resolution (every
  // stand-in component were, say, accidentally dropped), the liveness check below would
  // pass vacuously and prove nothing.
  expect(scaffoldOnly.length).toBeGreaterThan(0)

  // Scoped to ONLY the scaffold's own resolved components - see the module comment for
  // why mixing in the real circuit would make this check unsound rather than stricter.
  const scaffoldOnlyNetwork: ResolvedNetwork = { ports: resolvedComposed.ports, components: scaffoldOnly }
  const boundary = sharedBoundary(scaffoldOnly)
  // WIDER THAN `THREE_BAND_REFERENCE`'s THREE DECLARED PORTS, which is the whole point:
  // a leak confined to the interior ladder nodes joins no two of `{in, out, 0}` and is
  // invisible to a gate boundaried on those. The derived set must hold every declared
  // port AND at least one interior node the reference does not declare.
  const interior = [...boundary].filter((net) => !REFERENCE_PORTS.has(net)).sort()
  for (const port of REFERENCE_PORTS) {
    expect(boundary.has(port), `declared port ${port} missing from the derived boundary`).toBe(true)
  }
  expect(interior, "no interior ladder node in the derived boundary").not.toEqual([])
  const live = reduceToBoundary(scaffoldOnlyNetwork, boundary)
  expect(live.map((component) => component.id)).toEqual([])
})

test("GATE C (model): the live subgraph equals THREE_BAND_REFERENCE's, exactly", () => {
  // `reduceToBoundary` over the FULL merged network (real and scaffold components
  // together) is the wrong tool for asking whether a SCAFFOLD component is live - see
  // the module comment's "why property (a) is not a naive re-use". It remains the
  // right tool for THIS question, asked of the REAL components only: does every real
  // component that is live in the reference stay live once the (already proven dead,
  // by the previous test) scaffold board is folded in alongside it, and nothing else
  // becomes live that was not before. Filtering to real-only ids here is scoping the
  // comparison, not re-deciding property (a).
  const liveComposed = reduceToBoundary(resolvedComposed, REFERENCE_PORTS).filter(
    (component) => !isScaffold(component),
  )
  const liveReference = reduceToBoundary(resolvedReference, REFERENCE_PORTS)

  const composedKeys = new Set(liveComposed.map(identity))
  const referenceKeys = new Set(liveReference.map(identity))

  const onlyInReference = liveReference.map(identity).filter((key) => !composedKeys.has(key))
  const onlyInComposed = liveComposed.map(identity).filter((key) => !referenceKeys.has(key))

  // Exact set equality, not a count match and not a tolerance: the partition already
  // provably recomposes to the reference (0.00 dB, elsewhere), so anything other than
  // an empty diff here is a defect to report, never a comparison to loosen.
  expect(onlyInReference).toEqual([])
  expect(onlyInComposed).toEqual([])
  expect(liveComposed).toHaveLength(liveReference.length)
})

test("property (a) CAN fail: the Task 8 isolation defect, reconstructed for low-cut alone", () => {
  // A gate that cannot fail proves nothing, and this one nearly could not. With the
  // boundary fixed at `THREE_BAND_REFERENCE`'s three declared ports, low-cut's half of
  // the Task 8 defect - an isolated leg never rewired, so the 0R arm still bridges
  // `hi_boost_out` to `out` whatever the link does - is INVISIBLE: it joins no two of
  // `{in, out, 0}`, so the live set is empty and property (a) passes. The gate caught
  // mid's half only because mid happens to bridge `in` and `0`. Deriving the boundary
  // is what fixes it, and the fix is asserted here rather than reasoned about.
  const leaking: ResolvedComponent = {
    id: `${SCAFFOLD_PREFIX}RV_LO_CUT.ccw-wiper`,
    kind: "resistor",
    parameters: { ohms: 0 },
    pins: {},
    units: [{ name: "MAIN", pins: { a: "hi_boost_out", b: "out" } }],
  }
  const network: ResolvedNetwork = { ports: resolvedComposed.ports, components: [leaking] }

  expect(reduceToBoundary(network, REFERENCE_PORTS).map((c) => c.id)).toEqual([])
  const boundary = sharedBoundary([leaking])
  expect([...boundary].sort()).toEqual(["hi_boost_out", "out"])
  expect(reduceToBoundary(network, boundary).map((c) => c.id)).toEqual([leaking.id])
})
