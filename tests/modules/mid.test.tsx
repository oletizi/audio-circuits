import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecMid } from "../../modules/pultec-mid/PultecMid.tsx"
import { MID_POSITIONS, MID_TAPS, tapLabel } from "../../reference/pultec/mid.ts"
import { parseValue } from "../../lib/passives/units.ts"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import { overlappingComponents } from "./schematic-overlap.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"

function render() {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="120mm" height="60mm">
      <PultecMid name="MID" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

/** Capacitor value per emitted component name. */
function capacitors(): Map<string, number> {
  const out = new Map<string, number>()
  for (const element of render()) {
    if (element.type !== "source_component") continue
    if (element.ftype !== "simple_capacitor") continue
    const raw: unknown = Reflect.get(element, "capacitance")
    out.set(
      element.name,
      typeof raw === "string" ? parseValue(raw) : (raw as number),
    )
  }
  return out
}

test("carries all eleven documented mid frequencies", () => {
  // The builder's own board fits six. Designing in all eleven means a position
  // can be left unpopulated later; a position left out cannot be added back
  // without a new board.
  expect(MID_POSITIONS).toHaveLength(11)
  const labels = MID_POSITIONS.map(p => p.label)
  expect(labels).toEqual([
    "200Hz", "300Hz", "500Hz", "700Hz", "1kHz", "1k5Hz",
    "2kHz", "3kHz", "4kHz", "5kHz", "7kHz",
  ])
})

test("every capacitor matches the documented value for its position", () => {
  const emitted = capacitors()
  for (const position of MID_POSITIONS) {
    position.capacitors.forEach((capacitance, index) => {
      const ref = `MID_C_${position.label}_${index === 0 ? "A" : "B"}`
      const value = emitted.get(ref)
      if (value === undefined) throw new Error(`${ref} was not emitted`)
      expect(value).toBeCloseTo(parseValue(capacitance), 15)
    })
  }
  // Seventeen capacitors in total: eleven positions, six of them doubled.
  expect(emitted.size).toBe(17)
})

test("five winding taps serve the eleven positions", () => {
  expect(MID_TAPS).toEqual([2, 1, 0.45, 0.22, 0.1])
  // Each position's capacitors land on the tap its documentation specifies.
  const perTap = new Map<number, string[]>()
  for (const position of MID_POSITIONS) {
    perTap.set(position.henries, [...(perTap.get(position.henries) ?? []), position.label])
  }
  expect(perTap.get(2)).toEqual(["200Hz", "300Hz", "500Hz", "700Hz"])
  expect(perTap.get(1)).toEqual(["1kHz", "1k5Hz"])
  expect(perTap.get(0.1)).toEqual(["7kHz"])
})

test("tap net names survive a decimal point", () => {
  // 0.45H and 0.22H would otherwise produce net names with dots in them, which
  // the SPICE emitter sanitises away and could collide.
  expect(tapLabel(0.45)).toBe("0R45H")
  expect(tapLabel(2)).toBe("2H")
  const names = MID_TAPS.map(tapLabel)
  expect(new Set(names).size).toBe(names.length)
})

test("boost and cut returns are separate, with the documented resistors", () => {
  // The cut/boost switch chooses where the winding's far end goes: 4K7 to the
  // input, or 1K to ground. If these ever share a net the switch does nothing.
  const resistors = new Map<string, unknown>()
  for (const element of render()) {
    if (element.type === "source_component" && element.ftype === "simple_resistor") {
      resistors.set(element.name, Reflect.get(element, "resistance"))
    }
  }
  expect(resistors.size).toBe(3)
  expect(Number(resistors.get("MID_R_BOOST"))).toBe(4_700)
  expect(Number(resistors.get("MID_R_CUT"))).toBe(1_000)
  expect(Number(resistors.get("MID_R_SHUNT"))).toBe(100_000)
})

test("the module emits no dangling pins", () => {
  expect(
    render().filter(e => e.type === "source_pin_missing_trace_warning"),
  ).toHaveLength(0)
})

const MID_NET_NAMES: Readonly<Record<string, string>> = {
  MID_IN: "in",
  MID_GND: "0",
  MID_BOOST_RETURN: "mid_boost_return",
  MID_CUT_RETURN: "mid_cut_return",
  MID_COIL_RETURN: "mid_coil_return",
  ...Object.fromEntries(
    MID_TAPS.map(henries => [
      `MID_TAP_${tapLabel(henries)}`,
      `mid_tap_${tapLabel(henries).toLowerCase()}`,
    ]),
  ),
  ...Object.fromEntries(
    MID_POSITIONS.map(position => [
      `MID_SEL_${position.label}`,
      `mid_sel_${position.label.toLowerCase()}`,
    ]),
  ),
}

const MID_MAPPING: ExportMapping = {
  componentNames: {
    MID_R_BOOST: "R_MID_BOOST",
    MID_R_CUT: "R_MID_CUT",
    MID_R_SHUNT: "R_MID_SHUNT",
    MID_L_2H: "L_MID_2H",
    MID_L_1H: "L_MID_1H",
    MID_L_0R45H: "L_MID_0R45H",
    MID_L_0R22H: "L_MID_0R22H",
    MID_L_0R1H: "L_MID_0R1H",
    ...Object.fromEntries(
      MID_POSITIONS.flatMap(position =>
        position.capacitors.map((_, index) => {
          const slot = index === 0 ? "A" : "B"
          return [`MID_C_${position.label}_${slot}`, `C_MID_${position.label}_${slot}`]
        })),
    ),
  },
  netNames: MID_NET_NAMES,
  pinNames: { pin1: "a", pin2: "b" },
  // Every net the mid board touches, as identity: `boardNetwork` exposes each
  // net an element's pins reach as a port, so the candidate side must carry the
  // same set (see PultecHiBoost's comparison test for the same pattern).
  ports: Object.fromEntries(Object.values(MID_NET_NAMES).map(net => [net, net])),
}

test("the rendered module equals the reference mid board", () => {
  assertSameTopology(boardNetwork("mid"), toLabelledNetwork(render(), MID_MAPPING))
})

test("no two components are drawn at the same spot", () => {
  // A schematic collision is invisible to every topology and value assertion,
  // because the netlist is correct either way — two symbols stacked on the
  // same coordinates still wire up identically. Only a drawing-position check
  // like this one can catch it.
  expect(overlappingComponents(render())).toEqual([])
})
