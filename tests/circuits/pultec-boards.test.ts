import { test, expect } from "bun:test"
import { assertSameTopology, componentNets } from "../../lib/model/topology.ts"
import { assertElectricallyTransparent, physicalOnly, projectPhysical } from "../../lib/board/physicalize.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import { boundaryConductors, partitionReference } from "../../reference/pultec/partition.ts"
import type { ModuleOwner } from "../../reference/pultec/partition.ts"
import type { Network } from "../../lib/model/types.ts"
import * as lowCut from "../../circuits/pultec/low-cut.ts"
import * as lowBoost from "../../circuits/pultec/low-boost.ts"
import * as hiCut from "../../circuits/pultec/hi-cut.ts"
import * as hiBoost from "../../circuits/pultec/hi-boost.ts"
import * as mid from "../../circuits/pultec/mid.ts"

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

test("each board projects back to its electrical partition", () => {
  // The target is the PARTITION MODULE. Ports come from the board because the
  // property under test is component topology; validateNetwork independently
  // refuses both a bogus port and a missing one.
  const modules = partitionReference().modules
  for (const [owner, , build] of BOARDS) {
    const board = build()
    const target: Network = { ports: board.ports, components: modules[owner] ?? [] }
    expect(() => assertSameTopology(target, projectPhysical(board)), owner).not.toThrow()
  }
})

test("a board's ports are exactly the crossing nets its own components touch", () => {
  const modules = partitionReference().modules
  for (const [owner, , build] of BOARDS) {
    const board = build()
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
  for (const [owner, , build] of BOARDS) {
    const expected = boundaries.filter((b) => b.owners.includes(owner)).map((b) => b.net).sort()
    expect(Object.keys(build().ports).sort(), owner).toEqual(expected)
  }
})

test("every physical-only component is electrically transparent", () => {
  // projectPhysical enforces this itself, so this is a direct statement of the
  // same fact rather than the only thing holding it. The count assertion keeps
  // it from passing vacuously if physicalizedBoard ever stops adding a block.
  let checked = 0
  for (const [, , build] of BOARDS) {
    for (const component of build().components) {
      if (!physicalOnly(component)) continue
      assertElectricallyTransparent(component)
      checked += 1
    }
  }
  expect(checked).toBe(BOARDS.length)
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

test("each board carries exactly the off-board components the partition assigns it", () => {
  const modules = partitionReference().modules
  let total = 0
  for (const [owner, module, ] of BOARDS) {
    const expected = (modules[owner] ?? [])
      .filter((component) => OFF_BOARD.has(component.id))
      .map((component) => component.id)
      .sort()
    expect([...module.OFF_BOARD_IDS].sort(), owner).toEqual(expected)
    total += expected.length
  }
  // Every member of the global set is on exactly one board: 6 pots, 6 switches,
  // 9 inductors. A board that emitted none would pass the per-board check above
  // with two empty sets, and this is what refuses that.
  expect(total).toBe(OFF_BOARD.size)
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

test("every board carries a ground pin on its terminal block", () => {
  for (const [owner, , build] of BOARDS) {
    const blocks = build().components.filter(physicalOnly)
    const groundPins = blocks.flatMap((block) =>
      block.units.flatMap((unit) =>
        Object.entries(unit.pins).filter(([, c]) => c.kind === "net" && c.net === "0")))
    expect(groundPins.length, owner).toBe(1)
  }
})

test("each board exports to a netlist", () => {
  for (const [owner, module, build] of BOARDS) {
    expect(() => toImportedNetlist(
      build(), module.DESIGNATORS, module.PIN_NUMBERS, module.OFF_BOARD_IDS, module.PAD_ORDER,
    ), owner).not.toThrow()
  }
})
