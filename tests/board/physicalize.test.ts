import { test, expect } from "bun:test"
import {
  PHYSICAL_ONLY,
  assertElectricallyTransparent,
  physicalOnly,
  projectPhysical,
} from "../../lib/board/physicalize.ts"
import { net } from "../../lib/model/types.ts"
import type { Component, Network } from "../../lib/model/types.ts"

const CAP: Component = {
  id: "c1",
  kind: "capacitor",
  parameters: { farads: 1e-7 },
  pins: {},
  units: [{ name: "MAIN", pins: { a: net("IN"), b: net("GND") } }],
}

const BLOCK: Component = {
  id: "terminals",
  kind: "connector",
  parameters: {},
  part: { footprint: "TerminalBlock:TerminalBlock_1x02_P5.08mm", electricallyInert: true },
  pins: {},
  units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("GND") } }],
  provenance: { source: PHYSICAL_ONLY },
}

test("a component is physical-only when its provenance says so", () => {
  expect(physicalOnly(BLOCK)).toBe(true)
  expect(physicalOnly(CAP)).toBe(false)
})

test("projection removes physical-only components and keeps the rest", () => {
  const board: Network = { ports: { input: "IN" }, components: [CAP, BLOCK] }
  const projected = projectPhysical(board)
  expect(projected.components.map((c) => c.id)).toEqual(["c1"])
  expect(projected.ports).toEqual({ input: "IN" })
})

test("a transparent component declares electricallyInert: true", () => {
  expect(() => assertElectricallyTransparent(BLOCK)).not.toThrow()
})

test("two pins of a physical-only component naming the same net is not a short - it is one net, same as everywhere else in this model", () => {
  // Ruling 2026-10-09: this used to throw. Nets are implied by pin references
  // rather than declared, so two pins naming the same string ARE one net by
  // construction - a physical-only component repeating a net across several
  // pins (a connector landing six interleaved ground pins) joins nothing
  // that was not already joined. Only `electricallyInert` decides whether
  // projecting the component away is sound; a repeated net name is not
  // evidence either way.
  const repeating: Component = {
    ...BLOCK,
    id: "repeating_block",
    units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("IN") } }],
  }
  expect(() => assertElectricallyTransparent(repeating)).not.toThrow()
})

test("projection ACCEPTS a physical-only component that repeats a net across pins, given electricallyInert: true", () => {
  const repeating: Component = {
    ...BLOCK,
    id: "repeating_block",
    units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("IN") } }],
  }
  const board: Network = { ports: {}, components: [CAP, repeating] }
  expect(() => projectPhysical(board)).not.toThrow()
  expect(projectPhysical(board).components.map((c) => c.id)).toEqual(["c1"])
})

test("REGRESSION: a physical-only component spanning two different nets without electricallyInert still throws", () => {
  // The ruling that let repeated nets through was explicit that this must
  // still bite: relaxing the pin-map check must not let an actually-shorting
  // part (two DIFFERENT nets, no inertness declared) slip through projection.
  const maybeShorting: Component = {
    id: "ground_lift",
    kind: "resistor",
    parameters: { ohms: 0.001 },
    pins: {},
    units: [{ name: "MAIN", pins: { a: net("IN"), b: net("GND") } }],
    provenance: { source: PHYSICAL_ONLY },
  }
  expect(() => assertElectricallyTransparent(maybeShorting)).toThrow(/electricallyInert/)
})

test("projection REFUSES a physical-only component whose pins are on different nets but which does not declare electricallyInert", () => {
  // A pin map alone cannot prove a component conducts nothing between its
  // pads - a 0.001-ohm resistor between two different nets would pass the
  // pin-map check and still short them. Only a declared electricallyInert:
  // true on the part makes projecting it away sound.
  const maybeConducting: Component = {
    id: "ground_lift",
    kind: "resistor",
    parameters: { ohms: 0.001 },
    pins: {},
    units: [{ name: "MAIN", pins: { a: net("0"), b: net("CHASSIS") } }],
    provenance: { source: PHYSICAL_ONLY },
  }
  const board: Network = { ports: {}, components: [CAP, maybeConducting] }
  expect(() => projectPhysical(board)).toThrow(/electricallyInert/)
})

test("projecting a network with no physical-only components changes nothing", () => {
  const board: Network = { ports: {}, components: [CAP] }
  expect(projectPhysical(board).components).toEqual([CAP])
})
