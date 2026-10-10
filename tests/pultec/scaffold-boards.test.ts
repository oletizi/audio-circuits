/**
 * Stand-in groups on the five section boards: ONE LAYOUT, MANY CONFIGURATIONS.
 *
 * The distinction this file exists to hold is between two different artifacts,
 * checked against two different things:
 *
 * - `physicalBoard(section)` is the MAXIMAL network - the section's own parts, all
 *   four other sections' stand-in groups, and the junction. It is what the VeroRoute
 *   layout is checked against, because the standalone build is the only configuration
 *   in which every placed part is actually in circuit. The layout file holds every
 *   position and never varies.
 * - `boardNetwork(section, present)` is ONE configuration: the own parts, the junction,
 *   and only the groups THIS board supplies for that build. Those are verified in the
 *   model - by the 31-combination composition gate in `scaffold-composition.test.ts` -
 *   and no layout is involved.
 *
 * TWO DRIFT TESTS LIVE HERE, routed from earlier reviews of Task 1 and Task 3. Both
 * are the same class of problem - a hand-restated vocabulary with nothing enforcing
 * agreement with the thing it restates - and this is the first task that consumes both
 * vocabularies at once, so it is where they belong.
 *
 * DEVIATION FROM THE PLAN'S TEST SKETCH, recorded rather than silently absorbed: the
 * sketch skipped a component with `id === "board_junction"`. No such component exists.
 * Task 1 split the junction into `junction_signals` and `junction_grounds` (two 1x05
 * rows - there is no verified VeroRoute shape for a 2.54mm 2x05), so the skip is
 * derived from `junctionComponents()` instead of naming an id that would silently
 * match nothing and make the assertion vacuous.
 */
import { test, expect } from "bun:test"
import { allStandIns, REFERENCE_FLAT } from "../../lib/board/scaffold/index.ts"
import { LADDER_ORDER, suppliers } from "../../lib/board/scaffold/supplier.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import {
  STAND_IN_SOURCE,
  boardNetwork,
  groupsOn,
  physicalBoard,
  placedComponent,
  placedNet,
  standInGroup,
} from "../../circuits/pultec/physical/board.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import { JUNCTION_NETS, junctionComponents } from "../../circuits/pultec/physical/parts.ts"
import { physicalOnly } from "../../lib/board/physicalize.ts"
import { componentNets } from "../../lib/model/topology.ts"
import type { Component } from "../../lib/model/types.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"

const STAND_INS = allStandIns(partitionReference().modules, REFERENCE_FLAT)
const JUNCTION_IDS: ReadonlySet<string> = new Set(junctionComponents().map((c) => c.id))

/** Every net any pin of `component` names. */
function netsOf(component: Component): readonly string[] {
  return componentNets(component)
}

/** Every non-empty subset of the five sections: the 31 buildable configurations. */
function configurations(): readonly (readonly string[])[] {
  const all: string[][] = []
  for (let mask = 1; mask < 1 << LADDER_ORDER.length; mask += 1) {
    all.push(LADDER_ORDER.filter((_, index) => (mask & (1 << index)) !== 0))
  }
  return all
}

/** How many parts each group has, and 10 in total across the five.
 *
 * mid is ONE because `REFERENCE_FLAT` holds `midMode: "off"`, where the mode switch
 * opens the coil's return and mid's whole reactive branch reduces away as inert; its
 * stand-in is `R_MID_SHUNT` alone. See `tests/board/scaffold-mid-modes.test.ts`.
 */
const GROUP_SIZE: Readonly<Record<string, number>> = {
  "hi-boost": 2, "hi-cut": 4, "low-cut": 1, "low-boost": 2, mid: 1,
}
const ALL_GROUP_PARTS = Object.values(GROUP_SIZE).reduce((sum, n) => sum + n, 0)

test("the maximal network holds every stand-in group, for the layout to be checked against", () => {
  // OVER EVERY BOARD, not just low-boost. Nothing else at model level asserts that a
  // board carries all four groups, and the margin on every junction net is 3 to 14
  // pins, so a board quietly losing a whole group produces no singleton, no port
  // change and no topology failure. Mutation-checked: dropping low-cut's group from
  // mid's board alone used to leave every model-level test green.
  //
  // EXACT ID EQUALITY, not `includes`: a substring match for "R1" is also satisfied by
  // "R12", so the loose form could pass while the part under test was absent.
  let checked = 0
  for (const section of LADDER_ORDER) {
    const ids = new Set(physicalBoard(section).components.map((c) => c.id))
    for (const absent of LADDER_ORDER) {
      if (absent === section) continue
      const group = standInGroup(absent)
      expect(group.components.length, absent).toBe(GROUP_SIZE[absent] ?? -1)
      for (const component of group.components) {
        expect(ids.has(component.id), `${section} <- ${absent}/${component.id}`).toBe(true)
        checked += 1
      }
    }
  }
  // Not vacuous: five boards, each carrying every group but its own.
  expect(checked).toBe(LADDER_ORDER.length * ALL_GROUP_PARTS - ALL_GROUP_PARTS)
})

test("a configuration holds only the groups this board supplies", () => {
  // low-boost with hi-boost also built: hi-boost is earlier in ladder order, so it
  // supplies every absent group and low-boost's own network carries none of them.
  const network = boardNetwork("low-boost", new Set(["hi-boost", "low-boost"]))
  const ids = new Set(network.components.map((c) => c.id))
  let checked = 0
  for (const absent of ["hi-cut", "low-cut", "mid"]) {
    for (const component of standInGroup(absent).components) {
      expect(ids.has(component.id), `${absent}/${component.id}`).toBe(false)
      checked += 1
    }
  }
  // Not vacuous: the three absent sections' groups, every part of each.
  expect(checked).toBe(
    (GROUP_SIZE["hi-cut"] ?? 0) + (GROUP_SIZE["low-cut"] ?? 0) + (GROUP_SIZE["mid"] ?? 0),
  )
})

test("standalone, the board carries all four groups", () => {
  // A one-board build has no neighbour to supply anything, so this board holds every
  // absent section's group itself. Asserted by EXACT PART ID over all four groups, and
  // counted, rather than by a single marker part: this used to look for the one
  // inductor in the scaffolding, mid's 1 H tap, which the scaffold no longer needs now
  // that the reference holds mid in `off` - and a marker part is a proxy for the thing
  // under test rather than the thing itself in any case.
  const network = boardNetwork("low-boost", new Set(["low-boost"]))
  const ids = new Set(network.components.map((c) => c.id))
  const absent = LADDER_ORDER.filter((section) => section !== "low-boost")
  let checked = 0
  for (const section of absent) {
    for (const component of standInGroup(section).components) {
      expect(ids.has(component.id), `low-boost alone <- ${section}/${component.id}`).toBe(true)
      checked += 1
    }
  }
  // Not vacuous: four groups, every part of each.
  expect(absent).toHaveLength(4)
  expect(checked).toBe(ALL_GROUP_PARTS - (GROUP_SIZE["low-boost"] ?? 0))
})

test("every stand-in part on a board is an ordinary conducting component", () => {
  // NOT physicalOnly. Only the junction is inert. The section boards keep
  // assertElectricallyTransparent's guarantee untouched because nothing claims it.
  const maximal = physicalBoard("low-boost")
  let checked = 0
  for (const component of maximal.components) {
    if (JUNCTION_IDS.has(component.id)) continue
    expect(component.part?.electricallyInert ?? false, component.id).toBe(false)
    expect(physicalOnly(component), component.id).toBe(false)
    checked += 1
  }
  // Not vacuous: the skip above must remove exactly the two junction rows.
  expect(checked).toBe(maximal.components.length - 2)
})

test("the maximal network of every section validates", () => {
  for (const section of LADDER_ORDER) expect(() => physicalBoard(section), section).not.toThrow()
  // Strengthened past construction: `validateNetwork` refuses a duplicate id, a pin
  // outside its kind's vocabulary, a port naming a net nothing sits on, and - the one
  // that bites here - any net with a single pin that is not a declared port. On the
  // all-five configuration several ladder nets ARE single-pin (the junction's lone pin
  // for a net this section does not use), which is why no board could call this before
  // the stand-in groups existed and why it is asserted on the maximal network only.
  for (const section of LADDER_ORDER) {
    expect(() => validateNetwork(physicalBoard(section)), section).not.toThrow()
  }
})

test("every stand-in part is marked as scaffolding, and nothing else is", () => {
  // The marker the guide reads, so a builder can be told which parts are stand-ins
  // without anybody parsing an id prefix. It is NOT physical-only: see the module
  // comment in circuits/pultec/physical/board.ts.
  for (const section of LADDER_ORDER) {
    const group = new Set(
      LADDER_ORDER.filter((other) => other !== section)
        .flatMap((other) => standInGroup(other).components.map((c) => c.id)),
    )
    for (const component of physicalBoard(section).components) {
      const scaffolding = component.provenance?.source === STAND_IN_SOURCE
      expect(scaffolding, `${section}/${component.id}`).toBe(group.has(component.id))
      if (scaffolding) {
        expect(component.provenance?.location, component.id).not.toBeUndefined()
      }
    }
  }
})

test("the maximal network IS the standalone configuration, by construction", () => {
  // The reason a layout can only ever be checked against the maximal network: there is
  // one network builder, and `physicalBoard(s)` is defined as `boardNetwork(s, {s})`.
  // There is no way to ask for a layout-shaped network of a partial configuration.
  for (const section of LADDER_ORDER) {
    expect(physicalBoard(section), section).toEqual(boardNetwork(section, new Set([section])))
  }
})

test("a stand-in id is prefixed by the section it stands in for", () => {
  for (const section of LADDER_ORDER) {
    const group = standInGroup(section)
    const expected = `SI_${section.replace(/-/g, "_").toUpperCase()}_`
    for (const component of group.components) {
      expect(component.id.startsWith(expected), `${section}/${component.id}`).toBe(true)
    }
  }
})

test("no two components on a maximal board share an id", () => {
  // The collision the prefix exists to prevent: mid's board carries low-boost's `R2`
  // stand-in, and `R2` is also a real part on the low-boost board.
  for (const section of LADDER_ORDER) {
    const ids = physicalBoard(section).components.map((c) => c.id)
    expect(new Set(ids).size, section).toBe(ids.length)
  }
})

test("a stand-in group's unprefixed nets are junction nets, and nothing else is shared", () => {
  // A group's internal nodes are prefixed too, so two groups on one board cannot
  // accidentally merge an internal node; the only nets a group shares with the rest of
  // the board are the ladder nets the junction carries. Without this, a future
  // derivation that renamed an internal net to something a section already uses would
  // short two nodes together and look like a measurement rather than a bug.
  const junction = new Set(JUNCTION_NETS)
  for (const section of LADDER_ORDER) {
    const group = standInGroup(section)
    const prefix = `si_${section.replace(/-/g, "_")}_`
    let shared = 0
    for (const component of group.components) {
      for (const netName of netsOf(component)) {
        if (netName.startsWith(prefix)) continue
        expect(junction.has(netName), `${section}: ${netName}`).toBe(true)
        shared += 1
      }
    }
    // Not vacuous: a stand-in that shared no net with the ladder would conduct nowhere.
    expect(shared, section).toBeGreaterThan(1)
  }
})

test("across all 31 configurations, each absent group is carried by exactly one board", () => {
  // The failure this prevents: two copies of a group on one bus sit in parallel and
  // quietly halve a value. That produces a plausible wrong measurement, not a fault.
  for (const present of configurations()) {
    const set = new Set(present)
    const carriers = new Map<string, string[]>()
    for (const section of present) {
      for (const absent of groupsOn(section, set)) {
        carriers.set(absent, [...(carriers.get(absent) ?? []), section])
      }
    }
    const absentSections = LADDER_ORDER.filter((section) => !set.has(section))
    expect([...carriers.keys()].sort(), present.join("+")).toEqual([...absentSections].sort())
    for (const [absent, boards] of carriers) {
      expect(boards, `${present.join("+")} / ${absent}`).toHaveLength(1)
      const supplier = suppliers(set).get(absent)
      if (supplier === undefined) throw new Error(`no supplier assigned for absent ${absent}`)
      expect(boards[0], `${present.join("+")} / ${absent}`).toBe(supplier)
    }
  }
})

test("a board that is not in the build refuses to be asked what it supplies", () => {
  expect(() => groupsOn("mid", new Set(["low-boost"]))).toThrow(/not present/)
})

test("an unknown section refuses everywhere, naming the known ones", () => {
  expect(() => physicalBoard("nope")).toThrow(/nope/)
  expect(() => standInGroup("nope")).toThrow(/nope/)
})

test("a boundary net the junction does not carry refuses, rather than being placed", () => {
  // Never reached by live data - every section's boundary is a subset of JUNCTION_NETS,
  // which the property test above asserts. Exercised here because a refusal nobody has
  // seen fire is an unproven claim: if the partition's boundary moved to a net no header
  // carries, a stand-in would be wired to nothing and this is what must say so.
  expect(() => placedNet("hi-cut", new Set(["mystery_rail"]), "mystery_rail"))
    .toThrow(/the junction does not\s+carry/)
})

test("a junction net outside the group's boundary refuses, rather than being prefixed", () => {
  // Prefixing it would hide a ladder net from the shared bus; leaving it bare would
  // join a node the boundary says is private. Neither is defaulted.
  expect(() => placedNet("hi-cut", new Set(["hi_boost_out"]), "out"))
    .toThrow(/not in its boundary/)
})

test("a stand-in component with package pins refuses, rather than dropping them", () => {
  // A dropped package pin is a connection the board would be missing with nothing to
  // show it. Live data never has one, so this is the only place the guard is proven.
  const resolved: ResolvedComponent = {
    id: "C99",
    kind: "capacitor",
    parameters: { farads: 1e-8 },
    pins: { shield: "0" },
    units: [{ name: "MAIN", pins: { a: "hi_boost_out", b: "lo_boost_in" } }],
  }
  expect(() => placedComponent("hi-cut", new Set(["hi_boost_out", "lo_boost_in"]), resolved))
    .toThrow(/declares package pins/)
})

test("with all five built, a board's configuration network is its own parts and the junction", () => {
  const all = new Set(LADDER_ORDER)
  for (const section of LADDER_ORDER) {
    const network = boardNetwork(section, all)
    const ids = new Set(network.components.map((c) => c.id))
    for (const absent of LADDER_ORDER) {
      for (const component of standInGroup(absent).components) {
        expect(ids.has(component.id), `${section} <- ${component.id}`).toBe(false)
      }
    }
  }
})

/** Every net a junction row's pins name, in ascending pin-number order. */
function rowNets(component: Component): readonly string[] {
  if (Object.keys(component.pins).length > 0) {
    throw new Error(
      `junction "${component.id}" declares package pins, which this reading ignores; ` +
        "extend it rather than letting a pin fall out of the comparison",
    )
  }
  const unit = component.units[0]
  if (unit === undefined || component.units.length !== 1) {
    throw new Error(`junction "${component.id}" must have exactly one unit`)
  }
  const numbers = Object.keys(unit.pins).map((pin) => {
    const number = Number(pin)
    if (!Number.isInteger(number)) {
      throw new Error(`junction "${component.id}" pin "${pin}" is not a pin number`)
    }
    return number
  }).sort((a, b) => a - b)
  return numbers.map((number) => {
    const connection = unit.pins[String(number)]
    if (connection === undefined || connection.kind !== "net") {
      throw new Error(`junction "${component.id}" pin ${number} is not on a net`)
    }
    return connection.net
  })
}

/**
 * DRIFT TEST 1, from the Task 1 review. `JUNCTION_NETS` hand-restates the five net
 * names the junction components emit, because `sharedByFor` and `portsOn` need bare
 * names rather than a pin map. Nothing enforced agreement, so a pinout edit could
 * leave every board's port set and the wiring guide describing nets no header carries.
 *
 * BOTH HALVES READ THE COMPONENTS. An earlier version of this test asserted the order
 * half against a hardcoded literal, which made the test a THIRD copy of the vocabulary
 * rather than a check of the second against the first: swapping pins "1" and "2" of
 * `junctionSignalComponent` left it green. There is a derivable source here - the
 * signal row's own ordered pin list - so a literal is never the right thing to compare
 * against. (Contrast drift test 2 below, where the authority is the spec's prose and a
 * literal in the test is the only way to hold it.)
 */
test("JUNCTION_NETS is the signal row's nets, in its own pin order", () => {
  const [signals, grounds] = junctionComponents()
  expect(JUNCTION_NETS).toEqual(rowNets(signals))
  // And the set half, over BOTH rows: a net appearing only on the ground row would
  // still be one the junction carries, and must not be missing from the list.
  const carried = new Set([...rowNets(signals), ...rowNets(grounds)])
  expect([...JUNCTION_NETS].sort()).toEqual([...carried].sort())
  expect(new Set(JUNCTION_NETS).size).toBe(JUNCTION_NETS.length)
})

/**
 * The ladder positions the spec's table fixes, section by section, each with the
 * boundary nets that section actually presents.
 *
 * THE SECOND COLUMN IS WHAT GIVES THE FIRST ITS TEETH. The order cannot be derived:
 * ordering the sections by their boundary's position along `in -> hi_boost_out ->
 * lo_boost_in -> out` puts mid second, and the spec deliberately puts it last because
 * it bridges rather than sits in the chain. So the order is prose, and a literal here
 * is the only way to hold it. Pairing each name with its boundary means neither this
 * table nor `LADDER_ORDER` can move alone: a swap in `LADDER_ORDER` fails the order
 * assertion, and a swap in this table fails the boundary assertion against the model.
 */
const LADDER_POSITIONS: readonly (readonly [string, readonly string[]])[] = [
  ["hi-boost", ["hi_boost_out", "in"]],
  ["hi-cut", ["hi_boost_out", "lo_boost_in"]],
  ["low-cut", ["hi_boost_out", "out"]],
  ["low-boost", ["0", "lo_boost_in", "out"]],
  ["mid", ["0", "hi_boost_out", "in"]],
]

/**
 * DRIFT TEST 2, from the Task 3 review. `LADDER_ORDER` is a second source of truth for
 * the section vocabulary - the first is the partition's module keys. A section renamed
 * in the partition and not here would make `suppliers()` refuse a real board, or worse,
 * silently stop assigning a group that still needs one.
 *
 * MEMBERSHIP IS NOT ENOUGH, and an earlier version of this test checked only that:
 * swapping `"hi-cut"` and `"low-cut"` reassigns which board supplies which group and
 * left the whole suite green. The order is read straight off this constant by
 * `suppliers()`, so it is pinned too.
 */
test("LADDER_ORDER is the sections the partition has, in the spec's ladder order", () => {
  expect([...LADDER_ORDER].sort()).toEqual(Object.keys(partitionReference().modules).sort())
  expect(new Set(LADDER_ORDER).size).toBe(LADDER_ORDER.length)
  expect(LADDER_ORDER).toEqual(LADDER_POSITIONS.map(([section]) => section))
  for (const [section, boundary] of LADDER_POSITIONS) {
    const derived = STAND_INS[section]
    if (derived === undefined) throw new Error(`no stand-in derived for ${section}`)
    expect(derived.boundary, section).toEqual(boundary)
  }
})
