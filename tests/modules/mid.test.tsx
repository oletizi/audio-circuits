import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecMid } from "../../modules/pultec-mid/PultecMid.tsx"
import { MID_POSITIONS, MID_TAPS, tapLabel } from "../../reference/pultec/mid.ts"
import { parseValue } from "../../lib/passives/units.ts"

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
