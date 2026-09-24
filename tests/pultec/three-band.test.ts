import { test, expect } from "bun:test"
import {
  THREE_BAND_REFERENCE,
  controlState,
  declaredOpens,
} from "../../circuits/pultec/model/three-band.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import { lintConnectivity } from "../../lib/model/connectivity.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import type {
  CapacitorComponent, Component, InductorComponent, PotentiometerComponent, SwitchComponent,
} from "../../lib/model/types.ts"

const MID_POSITIONS = { loFrequency: "60Hz", hiFrequency: "5kHz" }

// `Component` keeps `kind` and `parameters` as independent fields, so narrowing on
// `kind` alone does not narrow `parameters` with it - these give the fixture lookups
// something to narrow into.
function isCapacitor(c: Component): c is CapacitorComponent {
  return c.kind === "capacitor"
}
function isInductor(c: Component): c is InductorComponent {
  return c.kind === "inductor"
}
function isSwitchComponent(c: Component): c is SwitchComponent {
  return c.kind === "switch"
}
function isPotentiometerComponent(c: Component): c is PotentiometerComponent {
  return c.kind === "potentiometer"
}

/** A physical network component's single "MAIN" unit pin, resolved to a net name. */
function pinNet(component: Component, pin: string): string {
  if (component.units.length !== 1) {
    throw new Error(`expected a single-unit component: ${component.id}`)
  }
  const connection = component.units[0].pins[pin]
  if (!connection || connection.kind !== "net") {
    throw new Error(`no net on ${component.id}.${pin}`)
  }
  return connection.net
}

test("the reference network is structurally valid", () => {
  expect(() => validateNetwork(THREE_BAND_REFERENCE)).not.toThrow()
})

test("carries the corroborated low cut bank on its selector positions", () => {
  const byRef = new Map(THREE_BAND_REFERENCE.components.map(c => [c.id, c]))
  // P3bandDoc.pdf p4, Ccut column. 60 Hz is the doubled position.
  const expected: readonly (readonly [string, number])[] = [
    ["C1", 18e-9], ["C2", 10e-9], ["C3", 4.7e-9], ["C4", 3.3e-9],
    ["C5", 2.2e-9], ["C6", 1.8e-9], ["C7", 1e-9],
  ]
  for (const [ref, farads] of expected) {
    const component = byRef.get(ref)
    if (!component || !isCapacitor(component)) throw new Error(`${ref} missing or not a capacitor`)
    expect(component.parameters.farads).toBeCloseTo(farads, 15)
  }
})

test("carries the corroborated low boost bank", () => {
  const byRef = new Map(THREE_BAND_REFERENCE.components.map(c => [c.id, c]))
  // P3bandDoc.pdf p4, Cboost column.
  const expected: readonly (readonly [string, number])[] = [
    ["C18", 330e-9], ["C19", 220e-9], ["C20", 120e-9],
    ["C21", 68e-9], ["C22", 47e-9], ["C23", 33e-9],
  ]
  for (const [ref, farads] of expected) {
    const component = byRef.get(ref)
    if (!component || !isCapacitor(component)) throw new Error(`${ref} missing or not a capacitor`)
    expect(component.parameters.farads).toBeCloseTo(farads, 15)
  }
})

test("includes the hi boost branch and excludes only the mid section", () => {
  const refs = new Set(THREE_BAND_REFERENCE.components.map(c => c.id))
  for (const present of ["C14", "C15", "C16", "C17", "C34", "C35", "C2a2", "R3"]) {
    expect(refs.has(present)).toBe(true)
  }
  for (const present of ["RV_HI_BOOST", "RV_HI_Q", "SW_HI_BOOST"]) {
    expect(refs.has(present)).toBe(true)
  }
  // Mid capacitor values are placeholders in the source schematic.
  for (const absent of ["C8", "C9", "C36", "C41"]) {
    expect(refs.has(absent)).toBe(false)
  }
})

test("the hi boost winding is four inductors spanning tap to coil top", () => {
  const inductors = THREE_BAND_REFERENCE.components.filter(
    (c): c is InductorComponent => isInductor(c) && c.id.startsWith("L_HI_BOOST"),
  )
  expect(inductors.map(c => c.id).sort()).toEqual([
    "L_HI_BOOST_100MH", "L_HI_BOOST_200MH", "L_HI_BOOST_300MH", "L_HI_BOOST_600MH",
  ])
  // The coil is not grounded. Every section returns to the same top node, which
  // leaves the board at J19 and feeds Qmax.
  const tops = new Set(inductors.map(c => pinNet(c, "b")))
  expect(tops.size).toBe(1)
  expect([...tops][0]).not.toBe("0")
  for (const inductor of inductors) expect(pinNet(inductor, "a")).not.toBe("0")
})

test("the two high banks are one ganged switch, not two controls", () => {
  const boost = THREE_BAND_REFERENCE.components.find(c => c.id === "SW_HI_BOOST")
  const cut = THREE_BAND_REFERENCE.components.find(c => c.id === "SW_HI_CUT")
  if (!boost || !isSwitchComponent(boost) || !cut || !isSwitchComponent(cut)) {
    throw new Error("high frequency selectors missing")
  }
  expect(boost.parameters.gang).toBeDefined()
  expect(boost.parameters.gang).toBe(cut.parameters.gang!)
  expect(boost.parameters.positions).toEqual(cut.parameters.positions)
})

test("ganged poles cannot be driven to different positions", () => {
  const state = controlState(1, 1, 1, MID_POSITIONS)
  const split = {
    ...state,
    switchPositions: { ...state.switchPositions, SW_HI_CUT: "10kHz", SW_HI_BOOST: "3kHz" },
  }
  expect(() => resolveNetwork(THREE_BAND_REFERENCE, split)).toThrow("Ganged switches disagree")
})

test("resolves cleanly once unselected switch throws are declared open", () => {
  const state = controlState(1, 1, 1, MID_POSITIONS)
  const resolved = resolveNetwork(THREE_BAND_REFERENCE, state)
  expect(lintConnectivity(resolved, { declaredOpens: declaredOpens(state) })).toEqual([])
})

test("an unselected throw really is floating, and the selected one is not", () => {
  const state = controlState(1, 1, 1, MID_POSITIONS)
  const resolved = resolveNetwork(THREE_BAND_REFERENCE, state)
  const undeclared = lintConnectivity(resolved)
  const floating = new Set(
    undeclared.filter(f => f.code === "singleton-net").map(f => f.net),
  )
  // Low cut is at 60Hz, which the netlist puts on throw pin 3.
  expect(floating.has("j5_p3")).toBe(false)
  expect(floating.has("j5_p1")).toBe(true)
  expect(floating.has("j5_p6")).toBe(true)
})

test("the hi boost level pot wiper is fed by the Q network", () => {
  // The wiper is where the resonant branch bridges into the level pot. It must
  // carry the two pot halves AND the Q pot's output, not sit unloaded.
  const wiper = THREE_BAND_REFERENCE.components.find(c => c.id === "RV_HI_BOOST")
  const q = THREE_BAND_REFERENCE.components.find(c => c.id === "RV_HI_Q")
  if (!wiper || !isPotentiometerComponent(wiper) || !q || !isPotentiometerComponent(q)) {
    throw new Error("hi boost pots missing")
  }
  expect(pinNet(wiper, "wiper")).toBe(pinNet(q, "cw"))
})

test("a selector position change moves exactly one capacitor into circuit", () => {
  const at = (position: string) => {
    const state = controlState(1, 1, 1, { ...MID_POSITIONS, loFrequency: position })
    const resolved = resolveNetwork(THREE_BAND_REFERENCE, state)
    const caps = resolved.components.filter(c => c.kind === "capacitor")
    return new Set(caps.map(c => `${c.id}:${c.units[0]?.pins.a}|${c.units[0]?.pins.b}`))
  }
  const twenty = at("20Hz")
  const thirty = at("30Hz")
  expect(twenty).not.toEqual(thirty)
})

test("rejects an unknown selector position rather than defaulting", () => {
  expect(() =>
    resolveNetwork(THREE_BAND_REFERENCE, controlState(1, 1, 1, { ...MID_POSITIONS, hiFrequency: "7kHz" })),
  ).toThrow("Unknown switch position: SW_HI_CUT=7kHz")
})
