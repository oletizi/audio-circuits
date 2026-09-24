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

test("a transparent component puts each pin on a different net", () => {
  expect(() => assertElectricallyTransparent(BLOCK)).not.toThrow()
})

test("a physical-only component that joins two pins to one net is not transparent", () => {
  const shorting: Component = {
    ...BLOCK,
    id: "shorting_block",
    units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("IN") } }],
  }
  expect(() => assertElectricallyTransparent(shorting)).toThrow(/joins pins/)
})

test("projection REFUSES a physical-only component that is not transparent", () => {
  // The invariant the whole abstraction rests on. Without this, the provenance
  // marker alone is enough to make arbitrary circuitry vanish from every
  // equivalence check, and assertElectricallyTransparent only holds where
  // somebody remembered to call it.
  const shorting: Component = {
    ...BLOCK,
    id: "shorting_block",
    units: [{ name: "MAIN", pins: { "1": net("IN"), "2": net("IN") } }],
  }
  const board: Network = { ports: {}, components: [CAP, shorting] }
  expect(() => projectPhysical(board)).toThrow(/joins pins/)
})

test("projecting a network with no physical-only components changes nothing", () => {
  const board: Network = { ports: {}, components: [CAP] }
  expect(projectPhysical(board).components).toEqual([CAP])
})
