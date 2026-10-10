import { test, expect } from "bun:test"
import {
  GROUND_NET,
  REFERENCE_FLAT,
  flatControlState,
  referenceNetwork,
  resolveSectionFlat,
} from "../../lib/board/scaffold/flat.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import { net } from "../../lib/model/types.ts"
import type { Component } from "../../lib/model/types.ts"

const modules = partitionReference().modules

test("a pot at flat emits a zero-ohm arm as a COMPONENT, not a merged node", () => {
  // The whole basis of "ideal shorts are components". RV_LO_BOOST at position 0 shorts
  // lo_boost_in to ground, and omitting that shunt was most of the error in the
  // approach this design replaces - 18.68 dB on low-cut, 17.98 on hi-cut.
  const resolved = resolveSectionFlat("low-boost", modules, REFERENCE_FLAT)
  const arm = resolved.components.find((c) => c.id === "RV_LO_BOOST.ccw-wiper")
  expect(arm).toBeDefined()
  expect(arm!.parameters).toEqual({ ohms: 0 })
  expect(Object.values(arm!.units[0]!.pins).sort()).toEqual(["0", "lo_boost_in"])
})

test("the other arm of the same pot carries the full value", () => {
  const resolved = resolveSectionFlat("low-boost", modules, REFERENCE_FLAT)
  const arm = resolved.components.find((c) => c.id === "RV_LO_BOOST.wiper-cw")
  expect(arm!.parameters).toEqual({ ohms: 47_000 })
})

test("low-cut at flat is a zero-ohm short between two BOUNDARY nets", () => {
  // Low-cut's entire stand-in is this short. If anything merged hi_boost_out with out,
  // the stand-in would be destroyed outright: its terminal count would collapse from
  // two to one, and a group with one terminal cannot be the ladder link low-cut's
  // absence needs.
  const resolved = resolveSectionFlat("low-cut", modules, REFERENCE_FLAT)
  const arm = resolved.components.find((c) => c.id === "RV_LO_CUT.ccw-wiper")
  expect(arm!.parameters).toEqual({ ohms: 0 })
  expect(Object.values(arm!.units[0]!.pins).sort()).toEqual(["hi_boost_out", "out"])
})

test("a closed switch contact merges nets but keeps the BOUNDARY net's name", () => {
  // netPreference prefers ground, then port nets. SW_LO_CUT.common sits on `out`, a
  // boundary net, so the merged class must be named `out` rather than an internal net.
  const resolved = resolveSectionFlat("low-cut", modules, REFERENCE_FLAT)
  const nets = new Set(
    resolved.components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))),
  )
  expect(nets.has("out")).toBe(true)
})

test("the flat control state is built from the components present, not a fixed list", () => {
  // RV_HI_Q rides on hi-boost and resolution refuses a missing setting. A hand-written
  // list of the five level pots would omit it and resolution would throw.
  const state = flatControlState(modules["hi-boost"]!, REFERENCE_FLAT)
  expect(state.potPositions).toHaveProperty("RV_HI_Q")
  expect(state.potPositions["RV_HI_Q"]).toBe(0)
  expect(() => resolveSectionFlat("hi-boost", modules, REFERENCE_FLAT)).not.toThrow()
})

test("every section resolves at the reference flat state", () => {
  for (const section of Object.keys(modules)) {
    expect(() => resolveSectionFlat(section, modules, REFERENCE_FLAT), section).not.toThrow()
  }
})

test("every boundary net is a declared port of the reference network", () => {
  // This is what preserves boundary names through the union-find. Without the ports,
  // SW_LO_BOOST merging lo_boost_in with j10_p4 resolves lexicographically to j10_p4
  // and the boundary net disappears.
  const network = referenceNetwork(modules)
  expect(network.ports["ground"]).toBe(GROUND_NET)
  for (const boundaryNet of ["in", "hi_boost_out", "lo_boost_in", "out"]) {
    expect(network.ports[boundaryNet], boundaryNet).toBe(boundaryNet)
  }
})

test("lo_boost_in survives resolution as itself, not as the switch net it merges with", () => {
  // The specific hazard the reference ports exist to prevent.
  const resolved = resolveSectionFlat("low-boost", modules, REFERENCE_FLAT)
  const nets = new Set(
    resolved.components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))),
  )
  expect(nets.has("lo_boost_in")).toBe(true)
  // The SELECTED throw merges into lo_boost_in and its own net disappears. At 100Hz
  // that is t4 / j10_p4. The five unselected throws keep their nets and their
  // capacitors - dropping those is the reduction's job, not resolution's.
  expect(nets.has("j10_p4")).toBe(false)
  const selected = resolved.components.find(
    (c) =>
      c.kind === "capacitor" &&
      Object.values(c.units[0]!.pins).sort().join() === ["0", "lo_boost_in"].join(),
  )
  expect(selected, "the 100Hz capacitor should now sit between ground and lo_boost_in")
    .toBeDefined()
  const stillOwnNets = [...nets].filter((n) => n.startsWith("j10_p")).sort()
  expect(stillOwnNets).toEqual(["j10_p1", "j10_p2", "j10_p3", "j10_p5", "j10_p6"])
})

test("a section's resolved components are only its own", () => {
  const resolved = resolveSectionFlat("low-boost", modules, REFERENCE_FLAT)
  const ownIds = new Set(modules["low-boost"]!.map((c) => c.id))
  for (const component of resolved.components) {
    const owner = component.id.split(".")[0]!
    expect(ownIds.has(owner), component.id).toBe(true)
  }
})

test("an unrecognised switch refuses rather than guessing a position", () => {
  const inventedSwitch: Component = {
    id: "SW_INVENTED",
    kind: "switch",
    parameters: {
      positions: ["a", "b"],
      contacts: { a: [["common", "x"]], b: [["common", "y"]] },
    },
    pins: {},
    units: [{ name: "MAIN", pins: { common: net("IN"), x: net("OUT"), y: net("0") } }],
  }
  const invented = [...modules["low-boost"]!, inventedSwitch]
  expect(() => flatControlState(invented, REFERENCE_FLAT)).toThrow(/SW_INVENTED/)
  expect(() => flatControlState(invented, REFERENCE_FLAT)).toThrow(/not defaulted/)
})

test("resolution is deterministic", () => {
  const a = resolveSectionFlat("mid", modules, REFERENCE_FLAT)
  const b = resolveSectionFlat("mid", modules, REFERENCE_FLAT)
  expect(JSON.stringify(a)).toBe(JSON.stringify(b))
})
