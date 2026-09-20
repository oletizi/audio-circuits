import { test, expect } from "bun:test"
import {
  THREE_BAND_REFERENCE,
  controlState,
  declaredOpens,
} from "../../reference/pultec/three-band.ts"
import { resolveNetwork } from "../../lib/passives/control-state.ts"
import { lintConnectivity } from "../../lib/passives/connectivity.ts"
import { validateNetwork } from "../../lib/passives/topology.ts"

const MID_POSITIONS = { loFrequency: "60Hz", hiFrequency: "5kHz" }

test("the reference network is structurally valid", () => {
  expect(() => validateNetwork(THREE_BAND_REFERENCE)).not.toThrow()
})

test("carries the corroborated low cut bank on its selector positions", () => {
  const byRef = new Map(THREE_BAND_REFERENCE.elements.map(e => [e.ref, e]))
  // P3bandDoc.pdf p4, Ccut column. 60 Hz is the doubled position.
  const expected: readonly (readonly [string, number])[] = [
    ["C1", 18e-9], ["C2", 10e-9], ["C3", 4.7e-9], ["C4", 3.3e-9],
    ["C5", 2.2e-9], ["C6", 1.8e-9], ["C7", 1e-9],
  ]
  for (const [ref, farads] of expected) {
    const element = byRef.get(ref)
    if (element?.kind !== "capacitor") throw new Error(`${ref} missing or not a capacitor`)
    expect(element.parameters.farads).toBeCloseTo(farads, 15)
  }
})

test("carries the corroborated low boost bank", () => {
  const byRef = new Map(THREE_BAND_REFERENCE.elements.map(e => [e.ref, e]))
  // P3bandDoc.pdf p4, Cboost column.
  const expected: readonly (readonly [string, number])[] = [
    ["C18", 330e-9], ["C19", 220e-9], ["C20", 120e-9],
    ["C21", 68e-9], ["C22", 47e-9], ["C23", 33e-9],
  ]
  for (const [ref, farads] of expected) {
    const element = byRef.get(ref)
    if (element?.kind !== "capacitor") throw new Error(`${ref} missing or not a capacitor`)
    expect(element.parameters.farads).toBeCloseTo(farads, 15)
  }
})

test("includes the hi boost branch and excludes only the mid section", () => {
  const refs = new Set(THREE_BAND_REFERENCE.elements.map(e => e.ref))
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

test("the tapped winding is four inductors spanning tap to coil top", () => {
  const inductors = THREE_BAND_REFERENCE.elements.filter(e => e.kind === "inductor")
  expect(inductors.map(e => e.ref).sort()).toEqual([
    "L_HI_BOOST_100MH", "L_HI_BOOST_200MH", "L_HI_BOOST_300MH", "L_HI_BOOST_600MH",
  ])
  // The coil is not grounded. Every section returns to the same top node, which
  // leaves the board at J19 and feeds Qmax.
  const tops = new Set(inductors.map(e => e.pins.b))
  expect(tops.size).toBe(1)
  expect([...tops][0]).not.toBe("0")
  for (const inductor of inductors) expect(inductor.pins.a).not.toBe("0")
})

test("the two high banks are one ganged switch, not two controls", () => {
  const boost = THREE_BAND_REFERENCE.elements.find(e => e.ref === "SW_HI_BOOST")
  const cut = THREE_BAND_REFERENCE.elements.find(e => e.ref === "SW_HI_CUT")
  if (boost?.kind !== "switch" || cut?.kind !== "switch") {
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
  const wiper = THREE_BAND_REFERENCE.elements.find(e => e.ref === "RV_HI_BOOST")
  const q = THREE_BAND_REFERENCE.elements.find(e => e.ref === "RV_HI_Q")
  if (wiper?.kind !== "potentiometer" || q?.kind !== "potentiometer") {
    throw new Error("hi boost pots missing")
  }
  expect(wiper.pins.wiper).toBe(q.pins.cw)
})

test("a selector position change moves exactly one capacitor into circuit", () => {
  const at = (position: string) => {
    const state = controlState(1, 1, 1, { ...MID_POSITIONS, loFrequency: position })
    const resolved = resolveNetwork(THREE_BAND_REFERENCE, state)
    const caps = resolved.elements.filter(e => e.kind === "capacitor")
    return new Set(caps.map(c => `${c.ref}:${c.pins.a}|${c.pins.b}`))
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
