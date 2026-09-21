import { test, expect } from "bun:test"
import { RootCircuit } from "@tscircuit/core"
import { PultecHiBoost } from "../../modules/pultec-hi-boost/PultecHiBoost.tsx"
import { toLabelledNetwork } from "../../lib/export/circuit-json.ts"
import { assertSameTopology } from "../../lib/passives/topology.ts"
import { boardNetwork } from "../../reference/pultec/partition.ts"
import { overlappingComponents, misprintedValues } from "./schematic-overlap.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"

const MAPPING: ExportMapping = {
  componentNames: {
    HB_C14: "C14", HB_C15: "C15", HB_C16: "C16", HB_C17: "C17",
    HB_C34: "C34", HB_C35: "C35",
    HB_C2a2: "C2a2", HB_C4a2: "C4a2", HB_C5a2: "C5a2",
    HB_R3: "R3",
    HB_L_600mH: "L_HI_BOOST_600MH",
    HB_L_300mH: "L_HI_BOOST_300MH",
    HB_L_200mH: "L_HI_BOOST_200MH",
    HB_L_100mH: "L_HI_BOOST_100MH",
  },
  netNames: {
    HB_TAP_600mH: "j15_p4",
    HB_TAP_300mH: "j15_p3",
    HB_TAP_200mH: "j15_p2",
    HB_TAP_100mH: "j15_p1",
    HB_SEL_3kHz: "j8_p6", HB_SEL_4kHz: "j8_p5", HB_SEL_5kHz: "j8_p4",
    HB_SEL_8kHz: "j8_p3", HB_SEL_10kHz: "j8_p2", HB_SEL_16kHz: "j8_p1",
    HB_COIL_TOP: "j19_p1",
    HB_QMAX_OUT: "j20_p1",
  },
  pinNames: { pin1: "a", pin2: "b" },
  // The tap nets and the coil top are NOT here. Each tap now joins a capacitor
  // to the inductor beside it, and the coil top joins the four inductors to
  // Qmax — all board-resident, so none of them needs a wire off the board. That
  // is the 6-way terminal block this design deletes. Only the selector throws
  // and the Qmax return still leave.
  ports: {
    j8_p1: "j8_p1", j8_p2: "j8_p2", j8_p3: "j8_p3",
    j8_p4: "j8_p4", j8_p5: "j8_p5", j8_p6: "j8_p6",
    j20_p1: "j20_p1",
  },
}

function render() {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="70mm" height="40mm">
      <PultecHiBoost name="HB" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

test("the rendered module equals the reference hi boost board", () => {
  assertSameTopology(boardNetwork("hi-boost"), toLabelledNetwork(render(), MAPPING))
})

test("the module emits no dangling pins", () => {
  expect(
    render().filter(e => e.type === "source_pin_missing_trace_warning"),
  ).toHaveLength(0)
})

test("positions sharing an inductance really do share a tap", () => {
  // Six positions, four taps. 4k and 5k both want 0.3H; 10k and 16k both want
  // 0.1H. If a future edit gives each position its own tap, the count changes
  // here before anything subtler goes wrong. Each tap net also carries its own
  // discrete inductor now that the coil is board-resident.
  const exported = toLabelledNetwork(render(), MAPPING)
  const on = (net: string) =>
    exported.elements.filter(e => Object.values(e.pins).includes(net)).map(e => e.ref).sort()
  expect(on("j15_p3")).toEqual(["C15", "C16", "C2a2", "L_HI_BOOST_300MH"])
  expect(on("j15_p1")).toEqual(["C34", "C35", "C5a2", "L_HI_BOOST_100MH"])
  expect(on("j15_p4")).toEqual(["C14", "L_HI_BOOST_600MH"])
})

test("Qmax bridges the coil top to the Q control, not to ground", () => {
  // The coil is not grounded anywhere in this design; its top returns through
  // Qmax. A Qmax wired to ground would be a different circuit entirely.
  const exported = toLabelledNetwork(render(), MAPPING)
  const qmax = exported.elements.find(e => e.ref === "R3")
  if (qmax?.kind !== "resistor") throw new Error("R3 missing from the export")
  expect([qmax.pins.a, qmax.pins.b].sort()).toEqual(["j19_p1", "j20_p1"])
  expect(Object.values(qmax.pins)).not.toContain("0")
})

test("no two components are drawn at the same spot", () => {
  // The inductors landed on the capacitors' own grid rows when they first moved
  // on-board: two symbols per position, stacked. Every topology and value
  // assertion still passed, because the netlist was right — only the drawing
  // was wrong. Nothing else in this file would have caught it.
  expect(overlappingComponents(render())).toEqual([])
})

test("four inductors serve six positions", () => {
  // 4k/5k share 0.3H and 10k/16k share 0.1H. If a future edit gives every
  // position its own part, this catches it before the BOM does.
  const exported = toLabelledNetwork(render(), MAPPING)
  const inductors = exported.elements.filter(e => e.kind === "inductor")
  expect(inductors).toHaveLength(4)
  // Each one returns to the coil-top node; none goes to ground.
  for (const inductor of inductors) {
    expect(Object.values(inductor.pins)).toContain("j19_p1")
    expect(Object.values(inductor.pins)).not.toContain("0")
  }
})

test("every printed value matches the value the part actually carries", () => {
  // tscircuit formats the display string separately from the simulated value,
  // and they can disagree: an inductor written `300mH` simulates as 0.3H and
  // prints "300H". Every other value assertion here reads the simulated side,
  // so nothing else in this suite can see it -- and the printed side is what a
  // reader orders parts from.
  expect(misprintedValues(render())).toEqual([])
})
