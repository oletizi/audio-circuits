/**
 * A vactrol (LED optically coupled to a light-dependent resistor) as a
 * parameterised SPICE subcircuit, for STRUCTURAL and DC purposes only.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAY AND MAY NOT BE CLAIMED FROM THIS MODEL
 * ---------------------------------------------------------------------------
 *
 * This model exists so a circuit containing a vactrol emits a valid netlist and
 * resolves its bias points. That is the whole of its purpose.
 *
 * NO COMPRESSION-BEHAVIOUR ASSERTION MAY REST ON IT. Not gain reduction, not
 * threshold, not ratio, not release. Any such number would be an artifact of an
 * interpolation invented here, presented as a property of the circuit.
 *
 * The reason is not caution, it is arithmetic. The optical compressor design
 * (docs/superpowers/specs/2026-09-21-optical-compressor-design.md) gives TWO
 * ENDPOINTS and no curve:
 *
 *   - section 6.2: "Require dark resistance >= 1 MOhm."
 *   - section 6.2: "Require R_LDR <= 10.2 kOhm at or below the chosen maximum
 *     LED current".
 *
 * Two endpoints do not define a curve. Linear-in-resistance,
 * linear-in-log-resistance and power-law interpolations all pass through the
 * same two points and produce materially different compression behaviour.
 *
 * The spec does not supply the missing curve and explicitly declines to. It is
 * built "around a generic LED/LDR vactrol" without "exact transfer curve"
 * (section 1); its goal 3 is to represent the vactrol "without pretending that
 * tscircuit can simulate its optical transfer function"; and its non-goals
 * (section 4) name "calibrated gain-reduction law" and "a mathematically
 * precise threshold or compression ratio". Section 8.7 goes further: "The LED
 * current at which a candidate vactrol reaches 10 kOhm must be read from its
 * datasheet." No datasheet has been read here, and no measurement taken.
 *
 * ---------------------------------------------------------------------------
 * THE INTERPOLATION LAW, WRITTEN OUT
 * ---------------------------------------------------------------------------
 *
 * Let f = clamp(I_LED / fullDriveAmps, 0, 1). Then
 *
 *     R_LDR(I_LED) = darkOhms * (litOhms / darkOhms) ^ f
 *
 * equivalently, and as emitted below to avoid depending on pow()'s semantics
 * for a fractional exponent:
 *
 *     R_LDR(I_LED) = darkOhms * exp( ln(litOhms / darkOhms) * f )
 *
 * That is: log R is LINEAR IN LED CURRENT between the two endpoints.
 *
 * THIS IS AN ASSUMED APPROXIMATION. It is drawn neither from any device
 * datasheet nor from the compressor spec, both of which are silent on the
 * curve, and it has not been checked against a measurement of any real part.
 * It was chosen because a log-resistance law keeps R_LDR positive and finite
 * over the whole drive range for any endpoint pair, and because photoresistor
 * datasheets conventionally plot resistance on a log axis - a presentation
 * convention, not evidence that this particular law is right. The alternatives
 * considered and rejected were linear-in-resistance (which spends nearly all of
 * its travel near the dark endpoint and is visibly wrong against every
 * datasheet plot) and a power law in current (which needs an exponent nobody
 * has supplied, so it would add a second invented number rather than removing
 * the first).
 *
 * Outside [0, fullDriveAmps] the exponent is CLAMPED, so the model saturates at
 * its two endpoints rather than extrapolating a curve it has no basis for. A
 * reversed LED reads a negative sense current, the clamp floors it at zero, and
 * the LDR is dark - which is physical.
 *
 * The model is memoryless. A real vactrol has attack and release, and LDR
 * "light memory" besides; none of that is here. No release or time-constant
 * result may be taken from this model. The spec names release behaviour as
 * something bench measurement must establish (section 8.6).
 *
 * ---------------------------------------------------------------------------
 * THE LED IS REPRESENTED BY A SILICON SIGNAL-DIODE MODEL, NOT AN LED MODEL
 * ---------------------------------------------------------------------------
 *
 * The LED branch uses this project's registered `1N4148` model - a silicon
 * small-signal switching diode. ITS FORWARD VOLTAGE IS NOT AN LED'S. Measured
 * in this deck at 2 mA it drops 0.644 V; the spec's section 8.7 table assumes
 * 1.5 V for the vactrol LED and notes red vactrol LEDs commonly sit higher
 * still. Any conclusion about LED-branch headroom, about R_LED's value, or
 * about the driver's compliance taken from this subcircuit WOULD BE WRONG.
 *
 * No LED model is invented here to paper over that. A fabricated parameter set
 * presented as a part is exactly the defect this project has already had to
 * correct three times. Naming the limitation is worth more.
 *
 * Why it does not affect the resistance this model computes, VERIFIED RATHER
 * THAN ASSERTED: the transfer law reads LED CURRENT, through the sense source
 * below, and never reads a voltage in the LED branch. Substituting a junction
 * with a much larger forward drop moved the anode from 0.644 V to 2.062 V and
 * left both the sense current (2.000 mA) and the LDR divider output
 * (0.08928571428637196) bit-identical. A 1 kOhm pad in series with the drive
 * does the same, and `tests/sim/vactrol.test.ts` pins that as a standing test.
 * The claim holds ONLY while drive is set as a current. A deck that drives this
 * subcircuit from a VOLTAGE source makes the forward drop determine the
 * current, and the claim above becomes false.
 *
 * ---------------------------------------------------------------------------
 * THE SENSE SOURCE IS AN AMMETER, NOT PART OF THE DEVICE
 * ---------------------------------------------------------------------------
 *
 * ngspice reads a branch current only through a VOLTAGE source, so the
 * subcircuit carries a zero-volt source in series with the LED, named
 * `VACTROL_SENSE_SOURCE` below. It is measurement apparatus with no electrical
 * effect - zero volts, and in series, so it neither drops nor diverts anything.
 * A real vactrol has no such element. (The compressor's own 10 Ohm sense
 * resistor, spec section 8.8, is a different thing: a real part on a real
 * board, outside this subcircuit.)
 *
 * Its polarity was established BY MEASUREMENT, not by reasoning about terminal
 * order. With the sense source on the cathode side, `i()` read -2 mA at full
 * drive, the clamp floored the law at zero, and the LDR stayed DARK at full
 * drive. It sits on the anode side for that reason, and
 * `tests/sim/vactrol.test.ts` asserts the sign at the sense element so the
 * error cannot come back silently.
 *
 * ---------------------------------------------------------------------------
 * TERMINAL ORDER, AND HOW A CIRCUIT REFERENCES A VACTROL
 * ---------------------------------------------------------------------------
 *
 * Terminal order on the emitted `.subckt` line, which is also the spec's
 * section 9 pin naming:
 *
 *     1: LED_A  - LED anode      2: LED_K  - LED cathode
 *     3: LDR_1  - photocell      4: LDR_2  - photocell
 *
 * The LDR terminals are interchangeable: the element between them is symmetric
 * in the sign of the voltage across it, so swapping them changes nothing. The
 * LED terminals are NOT interchangeable, and swapping them yields a dark LDR at
 * any drive.
 *
 * THIS MODEL IS NOT REGISTRY-RESIDENT AND IS NOT REACHABLE FROM A `Network`.
 * The only path from a `Network` into a SPICE model is `unit.spiceModel`, a
 * NAME looked up in the static registry by `deviceModel()`
 * (lib/sim/device-lines.ts). A parameterised function has no such path, and
 * registering it would mean either baking one part's endpoints into the
 * registry or inventing a parameter-passing mechanism the emitter does not
 * have. Neither is warranted by a model that exists for structural and DC
 * purposes.
 *
 * So the division of labour, stated here because a later task must find it
 * written down rather than infer it:
 *
 *  - THIS SUBCIRCUIT IS FOR HAND-BUILT DECKS - the DC and bias checks that
 *    `toSpiceNetlist` cannot express, since it is AC-only and emits no `.op`
 *    card.
 *  - INSIDE A `Network`, a photocell stays `kind: "photoresistor"` and emits a
 *    plain resistance at a STATED operating point, which is what
 *    lib/sim/device-lines.ts already does. The operating point is the circuit's
 *    declaration, not this model's output.
 *
 * A consequence worth naming: the `subcktNodeNames` alignment sweep in
 * tests/sim/models.test.ts runs over registry entries, so it does NOT cover
 * this model. The terminal order above is pinned only by this model's own
 * tests.
 */
import { deviceModel } from "./index.ts"

export interface VactrolParameters {
  /** Subcircuit name. Must be SPICE-safe; not sanitized, see below. */
  readonly name: string
  /** R_LDR with the LED off. Spec section 6.2 requires >= 1e6 for the compressor;
   * this model does not enforce the compressor's window, only physics. */
  readonly darkOhms: number
  /** R_LDR at `fullDriveAmps`. Spec section 6.2 requires <= 10.2e3. */
  readonly litOhms: number
  /** The LED current at which R_LDR reaches `litOhms`. Above it the law clamps. */
  readonly fullDriveAmps: number
}

/** The zero-volt source that reads LED current. Exported so a test or a
 * hand-built deck can name it in a hierarchical current reference
 * (`i(v.<instance>.<name>)`) rather than hard-coding this module's internals. */
export const VACTROL_SENSE_SOURCE = "VSENSE"

/** Terminal order on the emitted `.subckt` line. Exported because nothing else
 * pins it: this model is not in the device registry, so the registry's
 * pin-alignment sweep does not cover it. */
export const VACTROL_PIN_ORDER: readonly string[] = ["LED_A", "LED_K", "LDR_1", "LDR_2"]

/** The diode model standing in for the LED. See the header: this is a silicon
 * signal diode and its forward voltage is NOT an LED's. */
const LED_STANDIN_MODEL = "1N4148"

/** SPICE identifiers this module will emit verbatim. A name outside this set is
 * refused rather than sanitized: sanitizing would let two distinct callers
 * collide on one subcircuit name silently, and the caller is naming a
 * subcircuit, not a net. */
const SPICE_SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/

function requirePositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `vactrolSubcircuit: ${field} must be a positive finite number, got ${value}. ` +
        `A vactrol with a non-positive ${field} is not an under-specified device, it is an ` +
        `impossible one.`,
    )
  }
}

/**
 * Emits a `.subckt` block for a vactrol with the given endpoints, including the
 * locally-scoped `.model` line the LED branch needs, so the returned text can be
 * dropped into a deck on its own.
 *
 * Read the header of this file before using any number that comes out of a
 * circuit containing this subcircuit.
 */
export function vactrolSubcircuit(params: VactrolParameters): string {
  if (!SPICE_SAFE_NAME.test(params.name)) {
    throw new Error(
      `vactrolSubcircuit: name "${params.name}" is not a SPICE-safe subcircuit name ` +
        `(must match ${SPICE_SAFE_NAME.source}). It is not sanitized, because sanitizing two ` +
        `different names into one would collide two subcircuits silently.`,
    )
  }
  requirePositiveFinite(params.darkOhms, "darkOhms")
  requirePositiveFinite(params.litOhms, "litOhms")
  requirePositiveFinite(params.fullDriveAmps, "fullDriveAmps")
  if (params.litOhms >= params.darkOhms) {
    throw new Error(
      `vactrolSubcircuit: litOhms (${params.litOhms}) must be strictly below darkOhms ` +
        `(${params.darkOhms}). A vactrol whose resistance does not fall under illumination is ` +
        `not a vactrol, and the interpolation between the two endpoints would be flat or ` +
        `inverted.`,
    )
  }

  // ln(litOhms / darkOhms), negative because litOhms < darkOhms. Computed here
  // rather than emitted as a SPICE ln() call so the deck carries one constant
  // instead of depending on the engine's ln() of a ratio.
  const logSpan = Math.log(params.litOhms / params.darkOhms)

  // clamp(I / fullDrive, 0, 1). `min`/`max` are used rather than `limit()`
  // because both were exercised against this project's engine; see the header
  // on why the clamp is saturation rather than extrapolation.
  const fraction =
    `min(max(i(${VACTROL_SENSE_SOURCE})/${params.fullDriveAmps.toExponential(12)}, 0), 1)`
  const resistance =
    `${params.darkOhms.toExponential(12)} * exp(${logSpan.toExponential(12)} * ${fraction})`

  return [
    `* ${params.name} - vactrol: LED (represented by a ${LED_STANDIN_MODEL} silicon signal-diode`,
    `* model, NOT an LED model - see lib/sim/models/vactrol.ts) driving an LDR whose`,
    `* resistance follows an ASSUMED log-resistance-in-LED-current law between`,
    `* ${params.darkOhms} ohm dark and ${params.litOhms} ohm at ${params.fullDriveAmps} A.`,
    `* That law is drawn from no datasheet and from no specification. No compression`,
    `* behaviour - gain reduction, threshold, ratio, release - may be read from it.`,
    `* ${VACTROL_SENSE_SOURCE} is an ammeter with no electrical effect, not part of the device.`,
    `.subckt ${params.name} ${VACTROL_PIN_ORDER.join(" ")}`,
    deviceModel(LED_STANDIN_MODEL).spice.trimEnd(),
    `${VACTROL_SENSE_SOURCE} LED_A LED_ANODE DC 0`,
    `DLED LED_ANODE LED_K ${LED_STANDIN_MODEL}`,
    `BLDR LDR_1 LDR_2 I = v(LDR_1,LDR_2) / (${resistance})`,
    `.ends ${params.name}`,
  ].join("\n")
}
