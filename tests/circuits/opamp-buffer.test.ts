import { test, expect } from "bun:test"
import { opampBuffer, SOURCE_PART_NAMES } from "../../circuits/opamp-buffer.ts"
import { validateNetwork } from "../../lib/model/validate.ts"
import { parseValue } from "../../lib/model/units.ts"
import { net } from "../../lib/model/types.ts"
import type { Component, PartSpec } from "../../lib/model/types.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import { acSweepOf, deckFor, expectGainAt, NO_CONTROLS } from "../sim/helpers.ts"

function amplifier(): Component {
  const found = opampBuffer().components.find(c => c.kind === "opamp")
  if (!found) throw new Error("the buffer declares no op-amp")
  return found
}

/**
 * Source, load and supplies, each an explicit modelling choice:
 *
 * - The source is ideal (amplitude 1, no series resistance). Amplitude 1 makes
 *   the measured node voltage the gain directly. Zero series resistance is the
 *   same choice tests/sim/netlist.test.ts's fixture makes, and it keeps the
 *   number the circuit's own response rather than a divider against a source
 *   impedance nothing in the module states.
 * - The load is 1e12 ohms, which is this repository's existing way of writing
 *   "unloaded" (tests/sim/netlist.test.ts). It matters here beyond convention:
 *   the module's 100nF output coupling capacitor and the load form a high-pass
 *   corner at 1/(2*pi*R*C), which at 1e12 ohms is about 1.6 microhertz -
 *   decades below anything asserted below. A load small enough to be
 *   interesting would move that corner into the audio band and the assertions
 *   would then be measuring the load, not the buffer.
 * - The supplies are +/-15 V, transcribed from the source module's own header
 *   ("+15V typical" / "-15V typical") and wired to the two rails its power
 *   connector carries. They are REQUIRED for the deck to solve at all: a rail
 *   carrying only a decoupling capacitor and an op-amp supply pin has no DC
 *   path to ground, and ngspice refuses the analysis with "singular matrix"
 *   (pinned in tests/sim/netlist.test.ts). Note that GENERIC_OPAMP is
 *   supply-independent, so the +/-15 V values do not affect the result; they
 *   give the rails a defined potential and nothing more, and no assertion
 *   below is evidence about headroom or clipping.
 */
const ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 1e12 },
  supplies: [
    { port: "vcc", volts: 15 },
    { port: "vee", volts: -15 },
  ],
  sweep: { pointsPerDecade: 20, startHz: 10, stopHz: 100_000 },
  groundPort: "ground",
}

test("the buffer validates and carries the expected parts", () => {
  const n = opampBuffer()
  expect(() => validateNetwork(n)).not.toThrow()

  const kinds = n.components.map(c => c.kind).sort()
  expect(kinds).toContain("opamp")
  // Four capacitors, not two: C_IN and C_OUT on the signal path plus C_VCC and
  // C_VEE decoupling each supply rail to ground. Counted from
  // modules/opamp-buffer/OpampBuffer.tsx.
  expect(kinds.filter(k => k === "capacitor").length).toBe(4)
  expect(kinds.filter(k => k === "resistor").length).toBe(1)
  expect(kinds.filter(k => k === "opamp").length).toBe(1)
  // The three screw terminals are components as well as ports: they are real
  // parts with real footprints and a bill of materials has to see them.
  expect(kinds.filter(k => k === "connector").length).toBe(3)
  // Total as well as per-kind: a per-kind tally alone would survive an extra
  // component of some kind nobody thought to count.
  expect(n.components.length).toBe(9)
  expect(n.components.map(c => c.id).sort()).toEqual(Object.keys(SOURCE_PART_NAMES).sort())
})

test("every transcribed part identity matches the source module", () => {
  // Values are checked below; this checks the PartSpec fields, which a
  // regression could drop without failing anything else. Every figure here
  // comes from the deleted tscircuit sources (lib/chips/TL072.tsx,
  // lib/connectors/ScrewTerminal.tsx) as they stood at 6c5ad0a.
  const byId = new Map(opampBuffer().components.map(c => [c.id, c]))
  const partOf = (id: string): PartSpec => {
    const component = byId.get(id)
    if (!component) throw new Error(`no component "${id}"`)
    if (!component.part) throw new Error(`component "${id}" declares no part`)
    return component.part
  }

  for (const id of [
    "input_coupling_cap", "output_coupling_cap", "vcc_decoupling_cap",
    "vee_decoupling_cap", "input_bias_resistor",
  ]) {
    expect(partOf(id).footprint, id).toBe("0805")
  }

  const amp = partOf("buffer_amp")
  expect(amp.mpn).toBe("TL072")
  expect(amp.footprint).toBe("soic8")
  expect(amp.symbol).toBe("Amplifier_Operational:TL072")
  // TL072 section A: output pin 1, inverting input pin 2, non-inverting pin 3.
  expect(amp.symbolPins).toEqual({ A: { "in+": "3", "in-": "2", out: "1" } })

  expect(partOf("input_terminal").footprint).toBe("pinrow2")
  expect(partOf("output_terminal").footprint).toBe("pinrow2")
  expect(partOf("power_terminal").footprint).toBe("pinrow3")
  // Inertness is declared per part, and the emitter refuses a connector that
  // does not declare it, so these three are what keep the buffer simulable.
  for (const id of ["input_terminal", "output_terminal", "power_terminal"]) {
    expect(partOf(id).electricallyInert, id).toBe(true)
  }
  // A generic screw terminal has no manufacturer part number, and inventing
  // one would be exactly the kind of quiet fiction this project refuses.
  expect(partOf("input_terminal").mpn).toBeUndefined()
})

test("every transcribed value matches the source module", () => {
  const byId = new Map(opampBuffer().components.map(c => [c.id, c]))
  const valueOf = (id: string, field: "farads" | "ohms"): unknown => {
    const component = byId.get(id)
    if (!component) throw new Error(`no component "${id}"`)
    return Reflect.get(component.parameters, field)
  }
  expect(valueOf("input_coupling_cap", "farads")).toBe(parseValue("100nF"))
  expect(valueOf("output_coupling_cap", "farads")).toBe(parseValue("100nF"))
  expect(valueOf("vcc_decoupling_cap", "farads")).toBe(parseValue("100nF"))
  expect(valueOf("vee_decoupling_cap", "farads")).toBe(parseValue("100nF"))
  expect(valueOf("input_bias_resistor", "ohms")).toBe(parseValue("100k"))
})

test("the op-amp's supply pins are on the two separate supply nets", () => {
  const amp = amplifier()
  expect(amp.pins["v+"]).toEqual(net("VCC"))
  expect(amp.pins["v-"]).toEqual(net("VEE"))
  // The point of the split-supply finding: VEE is its own net, and in
  // particular is neither ground nor the positive rail. A test that only
  // checked the two names against themselves would pass for a circuit that
  // tied VEE to GND somewhere else.
  const ports = opampBuffer().ports
  expect(ports["vee"]).not.toBe(ports["ground"])
  expect(ports["vee"]).not.toBe(ports["vcc"])
})

test("the amplifier is wired as a unity-gain follower", () => {
  const unit = amplifier().units[0]
  // Structural unity gain: the section's output and its own INVERTING input
  // share one net, and the signal arrives at the NON-inverting one. Asserting
  // in+ as well as the shorted pair is what makes this fail for a transposed
  // amplifier rather than only for a broken feedback path.
  expect(unit.pins["out"]).toEqual(unit.pins["in-"])
  expect(unit.pins["in+"]).toEqual(net("IN"))
  expect(unit.pins["in+"]).not.toEqual(unit.pins["in-"])
})

test("the op-amp is one section of a dual package, and its part is not its model", () => {
  const amp = amplifier()
  expect(amp.units.length).toBe(1)
  expect(amp.units[0].name).toBe("A")
  // The part really is a TL072; the model really is generic. Conflating the
  // two is exactly the claim this project refuses to make, so both halves are
  // asserted together here.
  expect(amp.part?.mpn).toBe("TL072")
  expect(amp.units[0].spiceModel).toBe("GENERIC_OPAMP")
})

test("the module's whole external interface is declared as ports", () => {
  expect(opampBuffer().ports).toEqual({
    input: "IN_EXT",
    output: "OUT",
    vcc: "VCC",
    vee: "VEE",
    ground: "GND",
  })
})

test("the buffer authors no no-connect pin", () => {
  // A carry-forward from Task 1 says the harness's handling of an explicit
  // no-connect must be falsified by whichever circuit first authors one. This
  // circuit does not: the TL072's unused section is simply undeclared, which
  // is not the same thing. This assertion is what keeps that true, so the
  // obligation cannot be quietly considered discharged by this task.
  for (const component of opampBuffer().components) {
    for (const connection of Object.values(component.pins)) {
      expect(connection.kind).toBe("net")
    }
    for (const unit of component.units) {
      for (const connection of Object.values(unit.pins)) {
        expect(connection.kind).toBe("net")
      }
    }
  }
})

test("the emitted deck instantiates one amplifier section against the generic model", () => {
  const deck = deckFor(opampBuffer(), NO_CONTROLS, ENVIRONMENT)
  // Argument order is the model's pinOrder: in+, in-, out, v+, v-. The element
  // name carries no unit suffix: the emitter appends one only for a component
  // with more than one declared unit, and only section A of the TL072 is
  // declared here.
  expect(deck).toMatch(/^Xbuffer_amp IN FB FB VCC VEE GENERIC_OPAMP$/m)
  expect(deck).toMatch(/^VVCC VCC 0 DC 1\.500000000000e\+1$/m)
  expect(deck).toMatch(/^VVEE VEE 0 DC -1\.500000000000e\+1$/m)
  expect(deck.match(/^\.subckt\s+GENERIC_OPAMP\b/gim)).toHaveLength(1)
  // The three screw terminals declare themselves electrically inert, so they
  // contribute no device line. They are still components, and the emitter
  // would have refused them had they not said so.
  for (const id of ["input_terminal", "output_terminal", "power_terminal"]) {
    expect(deck).not.toContain(id)
  }
})

/**
 * The design's own claim, transcribed: the module calls itself a UNITY-GAIN
 * buffer, so 0 dB is what it promises, not something measured here and then
 * asserted.
 *
 * THE ASSERTION IS ONE-SIDED, AND THAT IS THE POINT. A two-sided band around
 * 0 dB cannot fail for the wiring error that matters most here. A correctly
 * wired follower has closed-loop gain A/(1+A), strictly below unity; with its
 * inputs transposed the loop is positive feedback and the gain is A/(A-1),
 * strictly above. Both land inside any sane tolerance, and narrowing the
 * tolerance does not help because a tighter band is still two-sided. Only the
 * sign of the departure separates them, so every point below is asserted
 * `sided: "below"`.
 *
 * WHERE THE ONE-SIDED ASSERTION ACTUALLY HAS TEETH, stated rather than
 * assumed. The buffer is not a bare op-amp: its input coupling network drops
 * the gain by about (1/2)(fc/f)^2 with fc = 1/(2*pi*100k*100nF) = 15.9 Hz, and
 * the model's finite bandwidth drops it by about (1/2)(f/GBW)^2. Both push the
 * result BELOW unity whatever the polarity, while the polarity signature is
 * 1/A0 = 1e-4 either way. So "strictly below" distinguishes a transposed
 * amplifier only where 1/A0 exceeds the sum of those two, which here means
 * roughly 3.6 kHz to 13 kHz. Measured, with the inputs transposed: 0.987669 at
 * 100 Hz and 0.999973 at 1 kHz (both still below unity, so those two points
 * are blind), and 1.000093 at 10 kHz - above unity, and the 10 kHz point is
 * what goes red. The lower points are kept because they are the frequencies
 * the unity-gain claim is most naturally read at, not because they discriminate.
 *
 * The band starts at 100 Hz, not at 20 Hz. The module's own input coupling
 * network is about 0.5 dB down at 46 Hz and 2.1 dB down at 20 Hz - arithmetic
 * from the transcribed 100nF and 100k, not a measurement - so the module's
 * unity-gain claim is simply not true at the bottom of the audio band, and
 * asserting it there would be asserting something false about the design.
 */
test("gain is unity across the audio band, and strictly below unity", async () => {
  const sweep = await acSweepOf(opampBuffer(), NO_CONTROLS, ENVIRONMENT)
  for (const hz of [100, 1000, 10_000]) {
    expectGainAt(sweep, hz, { db: 0, tol: 0.5, sided: "below" })
  }
})
