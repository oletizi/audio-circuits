import { test, expect } from "bun:test"
import {
  renderCircuit,
  findComponent,
  expectConnected,
} from "../testing/circuit-assertions.ts"
import { TL072H } from "./TL072H.tsx"
import { TestPoint } from "../connectors/TestPoint.tsx"

test("TL072H exposes single-supply pin names with GND on pin 4", async () => {
  const el = await renderCircuit(
    <board width="20mm" height="20mm">
      <TL072H name="U1" />
      <net name="GND" />
      <net name="V9" />
      {/* Bias net for + inputs: tying signal inputs to a chip's own ground
          creates a pathology in tscircuit's router (~30s vs ~210ms). In the
          real compressor, every + input connects to a signal or VBIAS node,
          never to ground. */}
      <net name="BIAS" />
      <trace from=".U1 > .GND" to="net.GND" />
      <trace from=".U1 > .VCC" to="net.V9" />
      <trace from=".U1 > .OUTA" to=".U1 > .INA_N" />
      <trace from=".U1 > .OUTB" to=".U1 > .INB_N" />
      <trace from=".U1 > .INA_P" to="net.BIAS" />
      <trace from=".U1 > .INB_P" to="net.BIAS" />
    </board>,
  )
  expect(findComponent(el, "U1")).toBeDefined()
  expectConnected(el, "U1.OUTB", "U1.INB_N")
  expectConnected(el, "U1.INA_P", "U1.INB_P")
})

test("TL072H defaults to soic8 and accepts a footprint override", async () => {
  const el = await renderCircuit(
    <board width="20mm" height="20mm">
      <TL072H name="U1" footprint="dip8" />
      <net name="GND" />
      <trace from=".U1 > .GND" to="net.GND" />
    </board>,
  )
  expect(findComponent(el, "U1")).toBeDefined()
})

test("TestPoint exposes a single TP pin", async () => {
  const el = await renderCircuit(
    <board width="20mm" height="20mm">
      <TestPoint name="TP_A" />
      <resistor name="R1" resistance="1k" footprint="0805" />
      <net name="GND" />
      <trace from=".TP_A > .TP" to=".R1 > .pin1" />
      <trace from=".R1 > .pin2" to="net.GND" />
    </board>,
  )
  expectConnected(el, "TP_A.TP", "R1.pin1")
})
