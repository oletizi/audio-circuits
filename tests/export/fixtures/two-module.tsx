import { RootCircuit } from "@tscircuit/core"

/** Renders a two-module passive fixture and returns its circuit JSON.
 * Component names carry their module prefix explicitly (LF_/HF_) because the emitted
 * `source_component.name` does not include the enclosing group's name.
 * Every pin is connected: LF_R1.pin1 and HF_L1.pin2 land on the named IN/OUT nets so
 * the fixture never trips the adapter's own dangling-pin rejection.
 */
export function renderTwoModule(miswire: boolean = false) {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="20mm" height="20mm">
      <resistor name="LF_R1" resistance="1k" footprint="0402" schX={0} schY={0} />
      <capacitor name="LF_C1" capacitance="100nF" footprint="0402" schX={1} schY={0} />
      <inductor name="HF_L1" inductance="100mH" footprint="0402" schX={3} schY={0} />
      <net name="IN" />
      <net name="MID" />
      <net name="GND" />
      <net name="OUT" />
      <trace from=".LF_R1 > .pin1" to="net.IN" />
      <trace from=".LF_R1 > .pin2" to="net.MID" />
      <trace from=".LF_C1 > .pin1" to={miswire ? "net.GND" : "net.MID"} />
      <trace from=".HF_L1 > .pin1" to="net.MID" />
      <trace from=".LF_C1 > .pin2" to="net.GND" />
      <trace from=".HF_L1 > .pin2" to="net.OUT" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}

/** Two resistors wired pin-to-pin with a direct trace and no `<net>` element between
 * them. Exercises the ruling that a connected group with no named source_net has no
 * derived fallback name and must throw. Every pin is still connected (via IN/OUT on
 * the outer pins) so this does not also trip the dangling-pin rejection.
 */
export function renderUnnamedNetFixture() {
  const circuit = new RootCircuit()
  circuit.add(
    <board width="10mm" height="10mm">
      <resistor name="A_R1" resistance="1k" footprint="0402" schX={0} schY={0} />
      <resistor name="A_R2" resistance="1k" footprint="0402" schX={1} schY={0} />
      <net name="IN" />
      <net name="OUT" />
      <trace from=".A_R1 > .pin1" to="net.IN" />
      <trace from=".A_R1 > .pin2" to=".A_R2 > .pin1" />
      <trace from=".A_R2 > .pin2" to="net.OUT" />
    </board>,
  )
  circuit.render()
  return circuit.getCircuitJson()
}
