import { test, expect } from "bun:test"
import { assertSameTopology } from "../../lib/model/topology.ts"
import { assertElectricallyTransparent, physicalOnly, projectPhysical } from "../../lib/board/physicalize.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { OFF_BOARD } from "../../reference/pultec/off-board.ts"
import { partitionReference } from "../../reference/pultec/partition.ts"
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
  // The target is the PARTITION MODULE, not boardNetwork(owner). boardNetwork
  // drops everything off-board, and the off-board parts are exactly what this
  // design keeps in the network. Ports are {} on both sides: the terminal block
  // and the PADS pads are the board's interface now.
  const modules = partitionReference().modules
  for (const [owner, , build] of BOARDS) {
    const target: Network = { ports: {}, components: modules[owner] ?? [] }
    expect(() => assertSameTopology(target, projectPhysical(build())), owner).not.toThrow()
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

test("each board's off-board ids are exactly its share of the global set", () => {
  for (const [owner, module, build] of BOARDS) {
    const onThisBoard = build().components.filter((c) => !physicalOnly(c)).map((c) => c.id)
    const expected = onThisBoard.filter((id) => OFF_BOARD.has(id)).sort()
    expect([...module.OFF_BOARD_IDS].sort(), owner).toEqual(expected)
  }
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

// Fails today because FILM_CAPACITOR_IMPORT_STRINGS is deliberately empty until
// a capacitor family is chosen - see circuits/pultec/parts.ts. Task 10 enters
// that footprint's VeroRoute import string and turns this on.
test.todo("each board exports to a netlist", () => {
  for (const [owner, module, build] of BOARDS) {
    expect(() => toImportedNetlist(
      build(), module.DESIGNATORS, module.PIN_NUMBERS, module.OFF_BOARD_IDS, module.PAD_ORDER,
    ), owner).not.toThrow()
  }
})
