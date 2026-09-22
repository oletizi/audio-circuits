/**
 * What these tests do and do not establish.
 *
 * They exercise `vactrolSubcircuit` as a STRUCTURAL and DC model: that the deck
 * it produces is valid SPICE, that its two endpoints land where the compressor
 * spec's selection criteria put them, that the LED branch conducts the drive
 * current in the intended direction, and that the interpolation between the
 * endpoints is monotonic and coding-error-free.
 *
 * They establish NOTHING about compression behaviour. No assertion here - and
 * none anywhere else - may read gain reduction, threshold, ratio or release out
 * of this model. The interpolation between the two endpoints is invented (see
 * the header of lib/sim/models/vactrol.ts); any such number would be an
 * artifact of that invention presented as a property of the circuit.
 */
import { test, expect } from "bun:test"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import {
  VACTROL_PIN_ORDER,
  VACTROL_SENSE_SOURCE,
  vactrolSubcircuit,
} from "../../lib/sim/models/vactrol.ts"

/** The part-selection endpoints from the compressor spec section 6.2: dark
 * resistance >= 1 MOhm, and R_LDR <= 10.2 kOhm at full drive. The full-drive
 * current is the spec's 1.5 mA target rounded to the 2 mA the brief's fixture
 * uses; nothing here depends on which, because both endpoints are exact by
 * construction and everything between them is the invented interpolation. */
const DARK_OHMS = 1e6
const LIT_OHMS = 10.2e3
const FULL_DRIVE_AMPS = 2e-3

/** The measuring circuit, identical in every test below so that each test
 * varies only the quantity it names.
 *
 * The LDR sits above a 1 kOhm load across a 1 V source, so v(ldr2) reads
 * 1k / (R_LDR + 1k) - a monotonically DEcreasing function of R_LDR, hence
 * increasing in drive.
 *
 * Drive is a CURRENT source in every case, per the corrections: the transfer
 * law's input is LED current, and setting it directly means no test depends on
 * the junction's forward voltage (which, per the model header, is a silicon
 * signal diode's and not an LED's).
 *
 * `BDRIVE` copies the sense source's branch current onto a node as a voltage,
 * in amps, so it can be read back through `runOperatingPoint`, which resolves
 * v() vectors only. `RDRIVE` keeps that node from floating. Neither touches the
 * circuit under measurement.
 */
function divider(driveAmps: number, seriesOhms: number): string {
  // A zero-ohm resistor is not emitted: ngspice substitutes 1e-12 and warns,
  // and `genuineErrors` turns that warning into a throw. With no padding the
  // current source drives the LED anode directly.
  const series = seriesOhms === 0 ? [] : [`RSERIES src a ${seriesOhms.toExponential(12)}`]
  const driven = seriesOhms === 0 ? "a" : "src"
  return [
    "vactrol dc fixture",
    vactrolSubcircuit({
      name: "VTL",
      darkOhms: DARK_OHMS,
      litOhms: LIT_OHMS,
      fullDriveAmps: FULL_DRIVE_AMPS,
    }),
    `ILED 0 ${driven} DC ${driveAmps.toExponential(12)}`,
    ...series,
    "X1 a 0 ldr1 ldr2 VTL",
    "V2 ldr1 0 DC 1",
    "R1 ldr2 0 1k",
    `BDRIVE probe 0 V = i(v.x1.${VACTROL_SENSE_SOURCE})`,
    "RDRIVE probe 0 1e9",
    ".op",
    ".end",
  ].join("\n")
}

async function dividerOutput(driveAmps: number, seriesOhms = 0): Promise<number> {
  const v = await runOperatingPoint({ netlist: divider(driveAmps, seriesOhms), nodes: ["ldr2"] })
  return v["ldr2"]
}

test("the LDR is dark when the LED is off", async () => {
  const out = await dividerOutput(0)
  // 1 MOhm above a 1 k load: almost all of the 1 V is dropped across the LDR.
  expect(out).toBeLessThan(0.01)
})

test("the LDR is lit at full drive", async () => {
  const out = await dividerOutput(FULL_DRIVE_AMPS)
  // R_LDR is at its LIT ENDPOINT here, which is exact by construction and does
  // not depend on the interpolation: 1k / (10.2k + 1k) = 0.0893.
  expect(out).toBeGreaterThan(0.0893 - 0.02)
  expect(out).toBeLessThan(0.0893 + 0.02)
})

test("resistance is monotonic in LED current", async () => {
  // NOTE WHAT THIS DOES AND DOES NOT PROVE. It proves the interpolation we
  // chose is monotonic. It does NOT validate that interpolation against a real
  // vactrol: no datasheet curve or measurement backs it. It is a guard against
  // a coding error in the model, not evidence about the device.
  const off = await dividerOutput(0)
  const half = await dividerOutput(FULL_DRIVE_AMPS / 2)
  const full = await dividerOutput(FULL_DRIVE_AMPS)
  expect(half).toBeGreaterThan(off)
  expect(full).toBeGreaterThan(half)
})

test("the LED conducts the drive current, in the intended direction", async () => {
  // Measured, not reasoned about. A reversed sense source reads the drive
  // current NEGATIVE, the clamp floors the law at zero, and the LDR stays dark
  // at full drive - which the monotonicity test above would not necessarily
  // catch, because a uniformly dark LDR fails it only by a tie, and a test
  // written with >= rather than > would pass. So the sign is asserted here
  // directly, at the sense element, rather than inferred from terminal order.
  const v = await runOperatingPoint({
    netlist: divider(FULL_DRIVE_AMPS, 0),
    nodes: ["probe"],
  })
  // v(probe) carries the sense source's branch current, in amps.
  expect(v["probe"]).toBeCloseTo(FULL_DRIVE_AMPS, 9)
  expect(v["probe"]).toBeGreaterThan(0)
})

test("no drive current flows when the LED is off", async () => {
  const v = await runOperatingPoint({ netlist: divider(0, 0), nodes: ["probe"] })
  expect(Math.abs(v["probe"])).toBeLessThan(1e-9)
})

test("the transfer law reads LED current, not LED branch voltage", async () => {
  // This is the measurement behind the header's claim that representing the LED
  // with a silicon signal-diode model does not affect any result here. A 1 kOhm
  // series resistor moves the LED branch's node voltages by a volt while the
  // current source holds the current fixed; if the law were reading a voltage
  // anywhere, the LDR would move with it.
  const bare = await dividerOutput(FULL_DRIVE_AMPS, 0)
  const padded = await dividerOutput(FULL_DRIVE_AMPS, 1e3)
  expect(padded).toBeCloseTo(bare, 12)
})

test("the pin order the model declares is the order its .subckt line uses", async () => {
  const text = vactrolSubcircuit({
    name: "VTL",
    darkOhms: DARK_OHMS,
    litOhms: LIT_OHMS,
    fullDriveAmps: FULL_DRIVE_AMPS,
  })
  // This model is NOT in the device registry (see the header for why), so the
  // registry's subcktNodeNames alignment sweep does not cover it. Its terminal
  // order is pinned here and nowhere else.
  const line = text.split("\n").find(l => l.trim().toLowerCase().startsWith(".subckt "))
  expect(line).toBe(`.subckt VTL ${VACTROL_PIN_ORDER.join(" ")}`)
  expect(VACTROL_PIN_ORDER).toEqual(["LED_A", "LED_K", "LDR_1", "LDR_2"])
})

test("a lit resistance at or above the dark resistance is refused", () => {
  expect(() =>
    vactrolSubcircuit({ name: "VTL", darkOhms: 1e4, litOhms: 1e4, fullDriveAmps: 2e-3 }),
  ).toThrow(/litOhms/)
})

test("a non-positive full-drive current is refused", () => {
  expect(() =>
    vactrolSubcircuit({ name: "VTL", darkOhms: 1e6, litOhms: 1e4, fullDriveAmps: 0 }),
  ).toThrow(/fullDriveAmps/)
})

test("a non-positive resistance is refused", () => {
  expect(() =>
    vactrolSubcircuit({ name: "VTL", darkOhms: 1e6, litOhms: 0, fullDriveAmps: 2e-3 }),
  ).toThrow(/litOhms/)
})

test("a name that is not SPICE-safe is refused rather than sanitized", () => {
  expect(() =>
    vactrolSubcircuit({ name: "VTL 1", darkOhms: 1e6, litOhms: 1e4, fullDriveAmps: 2e-3 }),
  ).toThrow(/name/)
})
