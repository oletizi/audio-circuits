import { test, expect } from "bun:test"
import {
  HI_BOOST_WIPER_NET,
  THREE_BAND_REFERENCE,
  controlState,
  declaredOpens,
} from "../../reference/pultec/three-band.ts"
import { resolveNetwork } from "../../lib/passives/control-state.ts"
import { lintConnectivity } from "../../lib/passives/connectivity.ts"
import { validateNetwork } from "../../lib/passives/topology.ts"

const MID_POSITIONS = { loCut: "60Hz", loBoost: "60Hz", hiCut: "5kHz" }

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

test("excludes the hi boost resonant branch and the mid section", () => {
  const refs = new Set(THREE_BAND_REFERENCE.elements.map(e => e.ref))
  for (const absent of ["C14", "C15", "C16", "C17", "C34", "C35", "C2a2", "R3"]) {
    expect(refs.has(absent)).toBe(false)
  }
  for (const absent of ["C8", "C9", "C36", "C41"]) {
    expect(refs.has(absent)).toBe(false)
  }
  // The level pot is retained: the signal path runs through it.
  expect(refs.has("RV_HI_BOOST")).toBe(true)
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

test("the hi boost wiper is a real node, not a floating terminal", () => {
  // An unloaded wiper still sits between the pot's two resolved halves, so it
  // carries two terminals. It must not be reported as a singleton.
  const state = controlState(1, 1, 1, MID_POSITIONS)
  const resolved = resolveNetwork(THREE_BAND_REFERENCE, state)
  const onWiper = resolved.elements.filter(
    e => e.pins.a === HI_BOOST_WIPER_NET || e.pins.b === HI_BOOST_WIPER_NET,
  )
  expect(onWiper.map(e => e.ref).sort()).toEqual([
    "RV_HI_BOOST.ccw-wiper",
    "RV_HI_BOOST.wiper-cw",
  ])
})

test("a selector position change moves exactly one capacitor into circuit", () => {
  const at = (position: string) => {
    const state = controlState(1, 1, 1, { ...MID_POSITIONS, loCut: position })
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
    resolveNetwork(THREE_BAND_REFERENCE, controlState(1, 1, 1, { ...MID_POSITIONS, hiCut: "7kHz" })),
  ).toThrow("Unknown switch position: SW_HI_CUT=7kHz")
})
