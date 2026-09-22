/**
 * What these tests do and do not establish.
 *
 * They exercise `vactrolSubcircuit` as a STRUCTURAL and DC model: that the deck
 * it produces is valid SPICE, that its two endpoints land on the compressor
 * spec's section 6.2 selection criteria (>= 1 MOhm dark, <= 10.2 kOhm lit -
 * both asserted against the criterion itself, not against a loose band that
 * would admit a violating value), that the clamps saturate rather than
 * extrapolate, that the LED branch conducts the drive current in the intended
 * direction and drops the forward voltage the caller stated, and that the
 * interpolation between the endpoints is monotonic and coding-error-free.
 *
 * They establish NOTHING about compression behaviour, and NOTHING about driver
 * bias. No assertion here - and none anywhere else - may read gain reduction,
 * threshold, ratio or release out of this model, nor V_CE, headroom or
 * rail-budget margin. The interpolation between the two endpoints is invented,
 * and the LED branch is a silicon stand-in plus an offset sized to a stated
 * assumption (see the header of lib/sim/models/vactrol.ts); any such number
 * would be an artifact of one of those two, presented as a property of the
 * circuit.
 */
import { test, expect } from "bun:test"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import {
  VACTROL_FORWARD_OFFSET_SOURCE,
  VACTROL_PIN_ORDER,
  VACTROL_SENSE_SOURCE,
  vactrolSubcircuit,
} from "../../lib/sim/models/vactrol.ts"
import type { VactrolParameters } from "../../lib/sim/models/vactrol.ts"

/** The part-selection endpoints from the compressor spec section 6.2: dark
 * resistance >= 1 MOhm, and R_LDR <= 10.2 kOhm at full drive. */
const DARK_OHMS = 1e6
const LIT_OHMS = 10.2e3
const FULL_DRIVE_AMPS = 2e-3

/** The spec section 8.7 table's assumed vactrol LED forward drop. It is an
 * ASSUMPTION, which is the entire reason the parameter is required: stating it
 * here puts it in front of a reader of this deck. */
const LED_FORWARD_VOLTS = 1.5

const BASE: VactrolParameters = {
  name: "VTL",
  darkOhms: DARK_OHMS,
  litOhms: LIT_OHMS,
  fullDriveAmps: FULL_DRIVE_AMPS,
  ledForwardVolts: LED_FORWARD_VOLTS,
}

/** The load the LDR sits above, and the supply across the pair. */
const LOAD_OHMS = 1e3

/** The measuring circuit, identical in every test below so that each test
 * varies only the quantity it names.
 *
 * The LDR sits above a 1 kOhm load across a 1 V source, so v(ldr2) reads
 * LOAD / (R_LDR + LOAD) - a monotonically DEcreasing function of R_LDR, hence
 * increasing in drive, and invertible back to R_LDR exactly (see `ldrOhms`).
 *
 * Drive is a CURRENT source in every case, per the corrections: the transfer
 * law's input is LED current, and setting it directly means no test depends on
 * the branch's forward voltage.
 *
 * `BDRIVE` copies the sense source's branch current onto a node as a voltage,
 * in amps, so it can be read back through `runOperatingPoint`, which resolves
 * v() vectors only. `RDRIVE` keeps that node from floating. Neither touches the
 * circuit under measurement.
 */
function divider(
  driveAmps: number,
  seriesOhms: number,
  overrides: Partial<VactrolParameters> = {},
): string {
  // A zero-ohm resistor is not emitted: ngspice substitutes 1e-12 and warns,
  // and `genuineErrors` turns that warning into a throw. With no padding the
  // current source drives the LED anode directly.
  const series = seriesOhms === 0 ? [] : [`RSERIES src a ${seriesOhms.toExponential(12)}`]
  const driven = seriesOhms === 0 ? "a" : "src"
  return [
    "vactrol dc fixture",
    vactrolSubcircuit({ ...BASE, ...overrides }),
    `ILED 0 ${driven} DC ${driveAmps.toExponential(12)}`,
    ...series,
    "X1 a 0 ldr1 ldr2 VTL",
    "V2 ldr1 0 DC 1",
    `R1 ldr2 0 ${LOAD_OHMS.toExponential(12)}`,
    `BDRIVE probe 0 V = i(v.x1.${VACTROL_SENSE_SOURCE})`,
    "RDRIVE probe 0 1e9",
    ".op",
    ".end",
  ].join("\n")
}

async function dividerOutput(
  driveAmps: number,
  seriesOhms = 0,
  overrides: Partial<VactrolParameters> = {},
): Promise<number> {
  const v = await runOperatingPoint({
    netlist: divider(driveAmps, seriesOhms, overrides),
    nodes: ["ldr2"],
  })
  return v["ldr2"]
}

/** R_LDR recovered from the divider reading, so an assertion can name the
 * spec's criterion in ohms instead of a divider fraction that hides how much
 * slack it really allows. */
function ldrOhms(dividerReading: number): number {
  return LOAD_OHMS / dividerReading - LOAD_OHMS
}

async function ldrOhmsAt(driveAmps: number): Promise<number> {
  return ldrOhms(await dividerOutput(driveAmps))
}

/** Slack for the float round-trip through the divider and back out of
 * `ldrOhms`, and for NOTHING else. The dark endpoint comes back as
 * 999999.9999999995 - short of 1e6 by 5 parts in 1e16 - so a bare `>=` against
 * the spec criterion fails on arithmetic rather than on the model. This is
 * deliberately nine orders of magnitude tighter than any modelling tolerance,
 * so it cannot quietly become one: it admits 1 part per billion, where the
 * defect it replaced admitted a factor of 10. */
const ROUNDTRIP_SLACK = 1e-9

test("the LDR is dark when the LED is off", async () => {
  // Asserted against the spec section 6.2 criterion (>= 1 MOhm), not against a
  // loose divider band. The dark endpoint is exact by construction, so there is
  // nothing to buy by being generous: a band wide enough to be comfortable is
  // also wide enough to admit a 10x error in the endpoint, which is a direct
  // violation of the criterion this test cites.
  const ohms = await ldrOhmsAt(0)
  expect(ohms).toBeGreaterThanOrEqual(DARK_OHMS * (1 - ROUNDTRIP_SLACK))
  expect(ohms / DARK_OHMS).toBeCloseTo(1, 6)
})

test("the LDR is lit at full drive", async () => {
  // Likewise asserted against the spec's ceiling: R_LDR <= 10.2 kOhm at full
  // drive. This endpoint too is exact by construction, so the assertion says so
  // rather than accepting a band that would pass a value 32% over the ceiling.
  const ohms = await ldrOhmsAt(FULL_DRIVE_AMPS)
  expect(ohms).toBeLessThanOrEqual(LIT_OHMS * (1 + ROUNDTRIP_SLACK))
  expect(ohms / LIT_OHMS).toBeCloseTo(1, 6)
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

test("drive beyond full saturates at the lit endpoint rather than extrapolating", async () => {
  // The header claims the exponent is CLAMPED outside [0, fullDriveAmps], so
  // the model saturates at its endpoints rather than continuing a curve it has
  // no basis for. Without this test, deleting the `min(..., 1)` leaves every
  // other test green while the model emits resistances below the lit endpoint -
  // extrapolation of an invented law past the only two points that constrain it.
  for (const drive of [FULL_DRIVE_AMPS * 1.5, FULL_DRIVE_AMPS * 10, FULL_DRIVE_AMPS * 1000]) {
    expect(await ldrOhmsAt(drive)).toBeCloseTo(LIT_OHMS, 3)
  }
})

test("reversed drive saturates at the dark endpoint rather than extrapolating", async () => {
  // The other clamp branch. Deleting the `max(..., 0)` leaves every other test
  // green while a reversed LED drives R_LDR ABOVE the dark endpoint without
  // bound. A reversed LED is dark; it is not super-dark.
  for (const drive of [-1e-6, -FULL_DRIVE_AMPS, -FULL_DRIVE_AMPS * 10]) {
    expect((await ldrOhmsAt(drive)) / DARK_OHMS).toBeCloseTo(1, 6)
  }
})

test("the LED conducts the drive current, in the intended direction", async () => {
  // Measured, not reasoned about. A reversed sense source reads the drive
  // current NEGATIVE, the clamp floors the law at zero, and the LDR stays dark
  // at full drive - which the monotonicity test above would not necessarily
  // catch, because a uniformly dark LDR fails it only by a tie, and a test
  // written with >= rather than > would pass. So the sign is asserted here
  // directly, at the sense element, rather than inferred from terminal order.
  const v = await runOperatingPoint({ netlist: divider(FULL_DRIVE_AMPS, 0), nodes: ["probe"] })
  // v(probe) carries the sense source's branch current, in amps.
  expect(v["probe"]).toBeCloseTo(FULL_DRIVE_AMPS, 9)
  expect(v["probe"]).toBeGreaterThan(0)
})

test("no drive current flows when the LED is off", async () => {
  const v = await runOperatingPoint({ netlist: divider(0, 0), nodes: ["probe"] })
  expect(Math.abs(v["probe"])).toBeLessThan(1e-9)
})

test("the LED branch drops the forward voltage the caller stated", async () => {
  // This is the standing check on the offset's sizing. `standInForwardVolts`
  // restates the engine's junction equation in TypeScript; if that arithmetic
  // ever drifts from what the engine actually solves - a different default
  // temperature, a changed 1N4148 parameter, a units slip - the branch stops
  // dropping what the caller asked for, and this goes red instead of quiet.
  //
  // It asserts that a STATED ASSUMPTION is honoured, and nothing more. It does
  // not make the branch an LED, and no driver-bias conclusion follows from it.
  //
  // THE CURRENT IS VARIED, NOT ONLY THE VOLTAGE, and that is the half with
  // teeth. `standInForwardVolts` takes `amps`; with every case at one current,
  // hardcoding that argument left the whole suite green - measured, with these
  // two cases removed and `amps` hardcoded: 285 pass / 0 fail.
  // MEASURED with `amps` replaced by the literal 2e-3 inside
  // `standInForwardVolts`: this test goes RED, at v(a) = 1.38533 V for the
  // 2e-4 case and 1.62514 V for the 2e-2 case, each against the stated 1.5 V.
  // Those misses - 0.115 V and 0.125 V - are what the gap was worth, against a
  // spec whose entire V_CE allocation at section 8.7.2 is 0.74 V.
  for (const stated of [1.5, 1.8, 2.2]) {
    const v = await runOperatingPoint({
      netlist: divider(FULL_DRIVE_AMPS, 0, { ledForwardVolts: stated }),
      nodes: ["a"],
    })
    // The cathode is on node 0 and the sense source drops nothing, so v(a) IS
    // the whole branch drop.
    expect(v["a"]).toBeCloseTo(stated, 4)
  }
  // A decade either side of that point. The drive current moves WITH
  // `fullDriveAmps`, because the claim is that the branch drops the stated
  // voltage at the stated full-drive current.
  for (const amps of [2e-4, 2e-2]) {
    const v = await runOperatingPoint({
      netlist: divider(amps, 0, { fullDriveAmps: amps, ledForwardVolts: 1.5 }),
      nodes: ["a"],
    })
    expect(v["a"], `at fullDriveAmps ${amps}, v(a) is ${v["a"]} V, not the stated 1.5 V`)
      .toBeCloseTo(1.5, 4)
  }
})

/** WHY THE CASES ABOVE STOP AT 2.2 V, measured rather than chosen by taste.
 *
 * The residual between the stated forward voltage and the simulated branch drop
 * is flat up to 3.0 V and then steps, at this fixture's 2 mA drive:
 *
 *   stated 1.5 / 1.8 / 2.2 / 2.6 / 3.0 V   residual -5.0901e-8 V
 *   stated 3.5 / 4.0 / 5.0 V               residual +1.2826e-4 V
 *
 * `toBeCloseTo(stated, 4)` admits |delta| < 5e-5, so a caller stating a blue or
 * white LED's forward voltage would fail the assertion above on a 128 microvolt
 * engine convergence artifact rather than on a modelling error. The step is
 * physically negligible and the model is not wrong there; the TEST's tolerance
 * simply does not reach that far, and a future case added at 3.5 V or above
 * needs a looser one and a note saying why. Recorded here so the next reader
 * does not have to re-derive it.
 */

test("the LDR is unaffected by the stated forward voltage at a given LED current", async () => {
  // The durable form of the header's claim that the LED stand-in does not
  // affect the resistance. Earlier this was checked by hand, by swapping the
  // .model line; now the forward voltage is a public parameter, so the check
  // runs through the public interface and stays.
  const at15 = await dividerOutput(FULL_DRIVE_AMPS, 0, { ledForwardVolts: 1.5 })
  const at22 = await dividerOutput(FULL_DRIVE_AMPS, 0, { ledForwardVolts: 2.2 })
  expect(at22).toBeCloseTo(at15, 12)
})

test("the transfer law reads LED current, not LED branch voltage", async () => {
  // A 1 kOhm series resistor moves the LED branch's node voltages by a volt
  // while the current source holds the current fixed; if the law were reading a
  // voltage anywhere, the LDR would move with it.
  const bare = await dividerOutput(FULL_DRIVE_AMPS, 0)
  const padded = await dividerOutput(FULL_DRIVE_AMPS, 1e3)
  expect(padded).toBeCloseTo(bare, 12)
})

test("the pin order the model declares is the order its .subckt line uses", () => {
  const text = vactrolSubcircuit(BASE)
  // This model is NOT in the device registry (see the header for why), so the
  // registry's subcktNodeNames alignment sweep does not cover it. Its terminal
  // order is pinned here and nowhere else.
  const line = text.split("\n").find(l => l.trim().toLowerCase().startsWith(".subckt "))
  expect(line).toBe(`.subckt VTL ${VACTROL_PIN_ORDER.join(" ")}`)
  expect(VACTROL_PIN_ORDER).toEqual(["LED_A", "LED_K", "LDR_1", "LDR_2"])
})

test("the emitted text names the offset source as part of the stand-in", () => {
  const text = vactrolSubcircuit(BASE)
  // The offset is the one element here that is neither a real device nor inert
  // apparatus, so a reader who meets only the emitted deck must still be told
  // what it is and what may not be concluded from the branch.
  expect(text).toContain(`${VACTROL_FORWARD_OFFSET_SOURCE} LED_DROP LED_K DC `)
  expect(text).toContain("STRUCTURAL STAND-IN, not an LED model")
  expect(text).toContain("V_CE")
})

test("a lit resistance at or above the dark resistance is refused", () => {
  expect(() => vactrolSubcircuit({ ...BASE, darkOhms: 1e4, litOhms: 1e4 })).toThrow(/litOhms/)
})

test("every numeric parameter is refused when non-positive or non-finite", () => {
  // Named per field and per bad value, rather than leaving the guard's reach to
  // be inferred from one case.
  const fields = ["darkOhms", "litOhms", "fullDriveAmps", "ledForwardVolts"] as const
  for (const field of fields) {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        () => vactrolSubcircuit({ ...BASE, [field]: bad }),
        `${field} = ${bad} should be refused`,
      ).toThrow(new RegExp(field))
    }
  }
})

test("a forward voltage below the silicon stand-in's own drop is refused", () => {
  // Reaching it would need a negative offset source - a branch that generates
  // voltage rather than dropping it. Refused rather than clamped to zero: a
  // silent clamp would emit a branch that does not drop what the caller stated,
  // which is the whole thing this parameter exists to prevent.
  expect(() => vactrolSubcircuit({ ...BASE, ledForwardVolts: 0.3 })).toThrow(/NEGATIVE offset/)
})

test("a name that is not SPICE-safe is refused rather than sanitized", () => {
  expect(() => vactrolSubcircuit({ ...BASE, name: "VTL 1" })).toThrow(/name/)
})
