/**
 * The five section boards, in both of the networks a board has.
 *
 * WHICH NETWORK EACH TEST BELONGS TO is the thing to get right here, and it is not a
 * matter of taste. A section board exports the MAXIMAL network - its own parts, all
 * four other sections' stand-in groups, and the junction - because that is what the
 * VeroRoute layout holds and therefore the only network a layout can be checked
 * against. Everything the perfboard workflow reads off these modules (`DESIGNATORS`,
 * `PAD_ORDER`, `OFF_BOARD_IDS`) describes that network, so the tests about those read
 * `build()`.
 *
 * The claims about PARTITIONING, by contrast, are claims about the all-five
 * configuration: that each board projects back to its electrical module, that its ports
 * are the boundary nets the partition assigns it, that every reference component sits
 * on exactly one board. Those hold of `boardNetwork(owner, ALL)` - own parts plus the
 * junction - and are false of the maximal network, because the maximal network
 * deliberately carries four other sections' worth of parts. Checking them against the
 * maximal network would not be a stricter test; it would be a different and wrong
 * claim. See `circuits/pultec/physical/board.ts`.
 */
import { test, expect } from "bun:test"
import { assertSameTopology, componentNets } from "../../lib/model/topology.ts"
import { assertElectricallyTransparent, physicalOnly, projectPhysical } from "../../lib/board/physicalize.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { OFF_BOARD } from "../../circuits/pultec/off-board.ts"
import { boundaryConductors, partitionReference } from "../../circuits/pultec/partition.ts"
import type { ModuleOwner } from "../../circuits/pultec/partition.ts"
import type { Network } from "../../lib/model/types.ts"
import { boardNetwork, standInGroup } from "../../circuits/pultec/physical/board.ts"
import { LADDER_ORDER } from "../../lib/board/scaffold/supplier.ts"
import * as lowCut from "../../circuits/pultec/physical/low-cut.ts"
import * as lowBoost from "../../circuits/pultec/physical/low-boost.ts"
import * as hiCut from "../../circuits/pultec/physical/hi-cut.ts"
import * as hiBoost from "../../circuits/pultec/physical/hi-boost.ts"
import * as mid from "../../circuits/pultec/physical/mid.ts"

interface BoardModule {
  readonly DESIGNATORS: Readonly<Record<string, string>>
  readonly PIN_NUMBERS: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly OFF_BOARD_IDS: ReadonlySet<string>
  readonly PAD_ORDER: Readonly<Record<string, readonly string[]>>
  readonly DECLARED_OPENS: readonly string[]
}

const BOARDS: readonly (readonly [ModuleOwner, BoardModule, () => Network])[] = [
  ["low-cut", lowCut, lowCut.pultecLowCut],
  ["low-boost", lowBoost, lowBoost.pultecLowBoost],
  ["hi-cut", hiCut, hiCut.pultecHiCut],
  ["hi-boost", hiBoost, hiBoost.pultecHiBoost],
  ["mid", mid, mid.pultecMid],
]

/** The configuration with every section built: no board carries any stand-in group. */
const ALL: ReadonlySet<string> = new Set(LADDER_ORDER)

/** Which absent sections' groups a board carries standalone: the other four. */
function maximalGroups(owner: ModuleOwner): readonly string[] {
  return LADDER_ORDER.filter((section) => section !== owner)
}

test("each board projects back to its electrical partition", () => {
  // The target is the PARTITION MODULE. Ports come from the board because the
  // property under test is component topology; validateNetwork independently
  // refuses both a bogus port and a missing one.
  const modules = partitionReference().modules
  for (const [owner] of BOARDS) {
    const board = boardNetwork(owner, ALL)
    const target: Network = { ports: board.ports, components: modules[owner] ?? [] }
    expect(() => assertSameTopology(target, projectPhysical(board)), owner).not.toThrow()
  }
})

test("a board's ports are exactly the crossing nets its own components touch", () => {
  const modules = partitionReference().modules
  for (const [owner] of BOARDS) {
    const board = boardNetwork(owner, ALL)
    const electrical = modules[owner] ?? []
    const touched = new Set(electrical.flatMap((component) => componentNets(component)))
    for (const netName of Object.keys(board.ports)) {
      expect(touched.has(netName), `${owner}: port ${netName} touches no component`).toBe(true)
    }
    // Ground is physical-only on exactly the boards whose signal path does not
    // return through it; those boards must NOT declare it as a port.
    const declaresGround = Object.keys(board.ports).includes("0")
    expect(declaresGround, `${owner}: ground port`).toBe(touched.has("0"))
  }
})

test("a board's ports are exactly the boundary nets the partition says it owns", () => {
  // THE DIRECTION WITH TEETH. The ports test above checks ports are a subset of
  // what the board touches, which a board missing a crossing net still satisfies -
  // its output simply has nowhere to land, silently. This checks the other way:
  // every net the partition says crosses this module's boundary must be a port.
  const boundaries = boundaryConductors()
  for (const [owner] of BOARDS) {
    const expected = boundaries.filter((b) => b.owners.includes(owner)).map((b) => b.net).sort()
    expect(Object.keys(boardNetwork(owner, ALL).ports).sort(), owner).toEqual(expected)
  }
})

test("standalone, every board's ports are all five junction nets", () => {
  // The maximal counterpart of the test above, and the reason the two have to be
  // separate claims: populate hi-cut's and mid's groups on low-boost's board and it
  // gains `hi_boost_out` and `in`, which the section alone never names. That is what
  // makes any present board able to host any absent section's group.
  for (const [owner, , build] of BOARDS) {
    expect(Object.keys(build().ports).sort(), owner)
      .toEqual(["0", "hi_boost_out", "in", "lo_boost_in", "out"])
  }
})

test("every physical-only component is electrically transparent", () => {
  // projectPhysical enforces this itself, so this is a direct statement of the
  // same fact rather than the only thing holding it. The count assertion keeps
  // it from passing vacuously if physicalizedBoard ever stops adding its
  // junction rows - two per board (signals, grounds), not one.
  let checked = 0
  for (const [, , build] of BOARDS) {
    for (const component of build().components) {
      if (!physicalOnly(component)) continue
      assertElectricallyTransparent(component)
      checked += 1
    }
  }
  expect(checked).toBe(BOARDS.length * 2)
})

test("every on-board component has a footprint and every off-board one does not", () => {
  for (const [owner, module, build] of BOARDS) {
    for (const component of build().components) {
      if (physicalOnly(component)) continue
      if (module.OFF_BOARD_IDS.has(component.id)) {
        expect(component.part?.footprint, `${owner}/${component.id}`).toBeUndefined()
      } else {
        expect(component.part?.footprint, `${owner}/${component.id}`).toBeDefined()
      }
    }
  }
})

test("every member of OFF_BOARD is assigned to exactly one section by the partition", () => {
  // Computed from the partition modules directly, independent of any board: 6 pots,
  // 6 switches, 9 inductors. A board that emitted none would pass the per-board check
  // below with two empty sets, and this is what refuses that.
  const modules = partitionReference().modules
  const assigned: string[] = []
  for (const [owner] of BOARDS) {
    assigned.push(...(modules[owner] ?? [])
      .filter((component) => OFF_BOARD.has(component.id))
      .map((component) => component.id))
  }
  expect(new Set(assigned).size).toBe(assigned.length)
  expect(assigned.length).toBe(OFF_BOARD.size)
})

test("a board's off-board ids are its own landings plus its stand-in groups' landings", () => {
  // The maximal board's landings, because OFF_BOARD_IDS is what the layout check reads.
  // mid's 1H tap is the case that matters: it is an off-board landing wherever it sits,
  // so the four boards standing in for mid each get one, and `SI_MID_L_MID_1H` must be
  // a PADS landing rather than a part with a footprint nobody has chosen.
  const modules = partitionReference().modules
  for (const [owner, module] of BOARDS) {
    const expected = new Set(
      (modules[owner] ?? [])
        .filter((component) => OFF_BOARD.has(component.id))
        .map((component) => component.id),
    )
    for (const absent of maximalGroups(owner)) {
      for (const id of standInGroup(absent).offBoardIds) expected.add(id)
    }
    expect([...module.OFF_BOARD_IDS].sort(), owner).toEqual([...expected].sort())
  }
})

test("every part that needs a symbol has one, so its netlist value is not empty", () => {
  // valueFor derives a value from a numeric quantity where there is one, and
  // falls back to mpn then symbol otherwise. Switches and the terminal block
  // have no quantity, so without a symbol they refuse at export - which the
  // parked export test would otherwise be the only thing to notice.
  let checked = 0
  for (const [owner, , build] of BOARDS) {
    for (const component of build().components) {
      if (component.kind !== "switch" && component.kind !== "connector") continue
      expect(component.part?.symbol ?? component.part?.mpn, `${owner}/${component.id}`).toBeDefined()
      checked += 1
    }
  }
  expect(checked).toBeGreaterThan(BOARDS.length)
})

test("every off-board component has a pad order that is a permutation of its pins", () => {
  for (const [owner, module, build] of BOARDS) {
    for (const component of build().components) {
      if (!module.OFF_BOARD_IDS.has(component.id)) continue
      const pins = new Set<string>(Object.keys(component.pins))
      for (const unit of component.units) for (const pin of Object.keys(unit.pins)) pins.add(pin)
      const order = module.PAD_ORDER[component.id]
      expect(order, `${owner}/${component.id}`).toBeDefined()
      expect([...(order ?? [])].sort()).toEqual([...pins].sort())
    }
  }
})

/** How many pins on this board name each net. */
function netMembers(board: Network): Map<string, number> {
  const counts = new Map<string, number>()
  for (const component of board.components) {
    const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
    for (const group of groups) {
      for (const connection of Object.values(group)) {
        if (connection.kind !== "net") continue
        counts.set(connection.net, (counts.get(connection.net) ?? 0) + 1)
      }
    }
  }
  return counts
}

test("every singleton net is declared, and every declaration is a singleton", () => {
  // BOTH DIRECTIONS, because neither alone is enough. Checking only that
  // singletons are declared lets a genuine accidental singleton be declared
  // away; checking only that declarations are singletons lets a declaration go
  // stale after the net it named gained a second member.
  for (const [owner, module, build] of BOARDS) {
    const counts = netMembers(build())
    const singletons = [...counts].filter(([, n]) => n === 1).map(([netName]) => netName).sort()
    expect(singletons, `${owner}: singleton nets`).toEqual([...module.DECLARED_OPENS].sort())
  }
})

test("every board carries ground pins on its junction", () => {
  // Six, not one: the junction interleaves a ground return beside each of the
  // five signal pins (1,3,5,7,9 are in/hi_boost_out/lo_boost_in/out/0) plus the
  // trailing all-ground pair (9,10), giving pins 2,4,6,8,9,10 - six in total,
  // identical on every board. See "The junction is a stacking 2x05 bus" in the
  // design doc for why: these are high-impedance nodes where in/out sitting
  // adjacent with nothing between them would be a feedback path.
  for (const [owner, , build] of BOARDS) {
    const blocks = build().components.filter(physicalOnly)
    const groundPins = blocks.flatMap((block) =>
      block.units.flatMap((unit) =>
        Object.entries(unit.pins).filter(([, c]) => c.kind === "net" && c.net === "0")))
    expect(groundPins.length, owner).toBe(6)
  }
})

test("each board exports to a netlist", () => {
  for (const [owner, module, build] of BOARDS) {
    expect(() => toImportedNetlist(
      build(), module.DESIGNATORS, module.PIN_NUMBERS, module.OFF_BOARD_IDS, module.PAD_ORDER,
    ), owner).not.toThrow()
  }
})
