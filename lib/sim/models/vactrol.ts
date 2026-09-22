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
 * the LDR is dark - which is physical. Both clamp branches are pinned by tests.
 *
 * The model is memoryless. A real vactrol has attack and release, and LDR
 * "light memory" besides; none of that is here. No release or time-constant
 * result may be taken from this model. The spec names release behaviour as
 * something bench measurement must establish (section 8.6).
 *
 * ---------------------------------------------------------------------------
 * THE LED BRANCH IS A STRUCTURAL STAND-IN, NOT AN LED MODEL
 * ---------------------------------------------------------------------------
 *
 * The LED branch is this project's registered `1N4148` model - A SILICON
 * SMALL-SIGNAL SWITCHING DIODE, NOT AN LED - in series with a fixed offset
 * voltage source sized so the whole branch drops `ledForwardVolts` at
 * `fullDriveAmps`. Nothing here is an LED model, and no LED parameters are
 * invented: a fabricated parameter set presented as a part is exactly the
 * defect this project has had to correct three times. What the branch offers is
 * a stated total forward drop and a diode's reverse blocking, and no claim at
 * all that its curve resembles a real LED's.
 *
 * `ledForwardVolts` is REQUIRED and has no default. A default would be the
 * fallback this project forbids, and it would put the old failure straight back
 * in: before this parameter existed the branch was a bare 1N4148 dropping
 * 0.644 V at 2 mA, against the spec section 8.7 table's 1.5 V assumption for
 * the vactrol LED and its note that red vactrol LEDs commonly sit higher.
 *
 * Two things the parameter buys, and neither is more than this:
 *
 *  - EVERY CALL SITE MUST NOW STATE THE FORWARD VOLTAGE IT ASSUMES, so the
 *    assumption travels with the deck instead of hiding inside the model where
 *    a reader would never meet it.
 *  - A CALLER PASSING THE SPEC'S 1.5 V LANDS ON THE SPEC'S OWN BUDGET LINE, so
 *    a driver deck becomes meaningful RELATIVE TO A STATED ASSUMPTION.
 *
 * THAT IS NOT THE SAME AS BEING PREDICTIVE OF HARDWARE, and must not be read as
 * it. The spec's 1.5 V is itself an assumption; section 8.7.2 says a candidate
 * vactrol's numbers must be read from its datasheet, and none has been.
 *
 * WHERE THE FORWARD DROP ACTUALLY LANDS, MEASURED. In the section 8.7 driver
 * stage (8.7 V rail, R_LED 3.3 kOhm, the section 8.8 10 Ohm sense resistor, a
 * 2N3904 low-side driver with R_E = 1 kOhm of emitter degeneration) the stage is
 * a CURRENT SINK: R_E sets the current, I_E ~= (V_DET - V_BE) / R_E, and the
 * LED's forward drop is absorbed by the collector node. Swapping a 0.63 V
 * junction for a 1.50 V one at fixed V_DET moved I_LED by 1.31 uA - 0.087 % -
 * not by the hundreds of microamps a bare resistor-to-ground branch would give.
 *
 * The surplus drop lands on V_CE instead, and that is the sharp consequence. A
 * bare-1N4148 branch read V_CE = 1.595 V where a 1.5 V junction gives 0.729 V -
 * an 0.866 V error, which EXCEEDS THE SPEC'S ENTIRE 0.74 V V_CE ALLOCATION at
 * section 8.7.2. The 1.5 V case reproduces the spec's own budget line, so the
 * spec is right and an unoffset model is out in the flattering direction. At a
 * 2.2 V red LED the real stage sits at V_CE = 0.176 V - in the knee - at its
 * nominal 1.5 mA operating point, while an unoffset model reads 1.595 V and
 * looks comfortably active. That is not a margin overstatement; it is a model
 * reporting "fine" for a circuit that is not.
 *
 * SO, EXPLICITLY, WHAT MAY NOT BE CONCLUDED FROM A DECK CONTAINING THIS MODEL:
 *
 *   - NOTHING ABOUT DRIVER BIAS. Not V_CE, not headroom, not rail-budget
 *     margin, not "the 2N3904 stays out of saturation", and neither a
 *     validation nor a refutation of the section 8.7.2 budget table. A V_CE
 *     printed from such a deck is an artifact of the silicon stand-in plus
 *     whatever `ledForwardVolts` the caller asserted, and must be labelled so.
 *   - NOTHING ABOUT R_LED'S VALUE. Absorbing the LED drop is R_LED's whole job.
 *   - NOTHING ABOUT COMPRESSION BEHAVIOUR - unchanged and binding.
 *   - NO LED CURRENT FROM A PASSIVE, TRANSISTOR-LESS LED BRANCH, where the drop
 *     does enter the current equation (0.26-0.46 mA of spread across candidate
 *     forward voltages, measured).
 *
 * WHAT MAY BE ASSERTED: LED current from a FULL section 8.7 driver deck, given
 * the 0.087 % sensitivity above - provided the assertion states that R_E sets
 * the current, not the LED.
 *
 * The offset is a fixed DC source, so the branch drops `ledForwardVolts`
 * EXACTLY at `fullDriveAmps` and tracks the 1N4148's own curve, shifted by that
 * constant, everywhere else. Its size is computed from the registered model's
 * own IS/N/RS rather than from a number typed here, so there is one source of
 * truth for the junction; `tests/sim/vactrol.test.ts` then pins the SIMULATED
 * branch drop against the requested value, so a drift between that arithmetic
 * and the engine goes red rather than quiet.
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
 * board, outside this subcircuit.) The forward-drop offset source beside it is
 * NOT apparatus - it is part of the stand-in, and it does drop voltage.
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
  /** The total forward drop the LED branch takes at `fullDriveAmps`. REQUIRED,
   * with no default - see the header. The spec's section 8.7 table assumes
   * 1.5 V and notes red vactrol LEDs sit higher. This is the caller's
   * ASSUMPTION, carried into the deck so it is visible there: not a
   * measurement, and not any part's datasheet figure. */
  readonly ledForwardVolts: number
}

/** The zero-volt source that reads LED current. Exported so a test or a
 * hand-built deck can name it in a hierarchical current reference
 * (`i(v.<instance>.<name>)`) rather than hard-coding this module's internals. */
export const VACTROL_SENSE_SOURCE = "VSENSE"

/** The series source that lifts the silicon stand-in's drop to the caller's
 * stated `ledForwardVolts`. Exported for the same reason as the sense source:
 * so a deck or a test names it symbolically. Unlike the sense source it is NOT
 * apparatus - it is part of the stand-in and it drops voltage. */
export const VACTROL_FORWARD_OFFSET_SOURCE = "VFWD"

/** Terminal order on the emitted `.subckt` line. Exported because nothing else
 * pins it: this model is not in the device registry, so the registry's
 * pin-alignment sweep does not cover it. */
export const VACTROL_PIN_ORDER: readonly string[] = ["LED_A", "LED_K", "LDR_1", "LDR_2"]

/** The diode model the LED branch is built from. See the header: this is a
 * silicon signal diode, and the branch is a stand-in, not an LED model. */
const LED_STANDIN_MODEL = "1N4148"

/** SPICE identifiers this module will emit verbatim. A name outside this set is
 * refused rather than sanitized: sanitizing would let two distinct callers
 * collide on one subcircuit name silently, and the caller is naming a
 * subcircuit, not a net. */
const SPICE_SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/

/** ngspice's default instance temperature, 27 degC, in kelvin. The registered
 * 1N4148 line sets no TNOM and no temperature coefficients, so the junction is
 * evaluated at the default and nothing here models a temperature sweep. */
const NOMINAL_KELVIN = 300.15
const BOLTZMANN_J_PER_K = 1.380649e-23
const ELEMENTARY_CHARGE_C = 1.602176634e-19

/** A plain SPICE number, with no engineering suffix. The three parameters this
 * module reads are all written plainly in the registered model line; a suffixed
 * value is skipped rather than silently misparsed, and its absence then throws
 * by name in `requiredParameter`. */
const PLAIN_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

/** The `KEY=VALUE` pairs inside a `.model NAME TYPE(...)` line, read from the
 * registry's own text so the junction has ONE source of truth. Throws naming
 * what is missing rather than assuming anything about the model's shape. */
function modelParameters(spiceText: string): ReadonlyMap<string, number> {
  const line = spiceText
    .split("\n")
    .find(candidate => candidate.trim().toLowerCase().startsWith(".model "))
  if (line === undefined) {
    throw new Error(
      `vactrolSubcircuit: model "${LED_STANDIN_MODEL}" has no .model line, so the LED branch's ` +
        `forward-drop offset cannot be computed from it`,
    )
  }
  const open = line.indexOf("(")
  const close = line.lastIndexOf(")")
  if (open < 0 || close < open) {
    throw new Error(
      `vactrolSubcircuit: model "${LED_STANDIN_MODEL}"'s .model line carries no parenthesised ` +
        `parameter list: ${line}`,
    )
  }
  const parsed = new Map<string, number>()
  for (const token of line.slice(open + 1, close).split(/\s+/)) {
    const [key, value] = token.split("=")
    if (value === undefined || !PLAIN_NUMBER.test(value)) continue
    parsed.set(key.toUpperCase(), Number(value))
  }
  return parsed
}

function requiredParameter(parsed: ReadonlyMap<string, number>, key: string): number {
  const value = parsed.get(key)
  if (value === undefined) {
    throw new Error(
      `vactrolSubcircuit: model "${LED_STANDIN_MODEL}" declares no plain-numeric "${key}", which ` +
        `the LED branch's forward-drop offset needs. Parsed keys: ${[...parsed.keys()].join(", ")}`,
    )
  }
  return value
}

/** The registered 1N4148's own forward drop at `amps`, from its own IS/N/RS:
 *
 *     V = N * Vt * ln(I / IS + 1) + I * RS
 *
 * This restates the engine's junction equation, which is exactly why it is not
 * trusted on its own: it only SIZES the offset below, and the SIMULATED branch
 * drop is pinned against the caller's `ledForwardVolts` by a standing test, so
 * any drift between this arithmetic and the engine goes red.
 */
function standInForwardVolts(amps: number): number {
  const parsed = modelParameters(deviceModel(LED_STANDIN_MODEL).spice)
  const saturationAmps = requiredParameter(parsed, "IS")
  const emission = requiredParameter(parsed, "N")
  const seriesOhms = requiredParameter(parsed, "RS")
  const thermalVolts = (BOLTZMANN_J_PER_K * NOMINAL_KELVIN) / ELEMENTARY_CHARGE_C
  return emission * thermalVolts * Math.log(amps / saturationAmps + 1) + amps * seriesOhms
}

function requirePositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `vactrolSubcircuit: ${field} must be a positive finite number, got ${value}. ` +
        `A vactrol with a non-positive ${field} is not an under-specified device, it is an ` +
        `impossible one.`,
    )
  }
}

/** The emitted comment block, which travels with the subcircuit into any deck
 * someone pastes it into - so the two things a reader must not conclude are in
 * front of them there, not only in this file. */
function emittedNotice(params: VactrolParameters, offsetVolts: number): readonly string[] {
  return [
    `* ${params.name} - vactrol. The LED is a STRUCTURAL STAND-IN, not an LED model: a`,
    `* ${LED_STANDIN_MODEL} silicon signal diode plus a ${offsetVolts.toPrecision(6)} V series`,
    `* offset, sized so the branch drops the caller's ASSUMED ${params.ledForwardVolts} V at`,
    `* ${params.fullDriveAmps} A. NOTHING about driver bias - V_CE, headroom, rail-budget`,
    `* margin, "stays out of saturation" - may be concluded from it, nor anything about`,
    `* R_LED's value. The LDR follows an ASSUMED log-resistance-in-LED-current law`,
    `* between ${params.darkOhms} ohm dark and ${params.litOhms} ohm at full drive, drawn`,
    `* from no datasheet and no specification. No compression behaviour - gain`,
    `* reduction, threshold, ratio, release - may be read from it.`,
    `* See lib/sim/models/vactrol.ts. ${VACTROL_SENSE_SOURCE} is an ammeter with no`,
    `* electrical effect; ${VACTROL_FORWARD_OFFSET_SOURCE} is part of the stand-in and does drop voltage.`,
  ]
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
  requirePositiveFinite(params.ledForwardVolts, "ledForwardVolts")
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

  // What the silicon stand-in drops on its own at full drive, and therefore how
  // much must be added in series to reach the caller's stated forward voltage.
  const junctionVolts = standInForwardVolts(params.fullDriveAmps)
  const offsetVolts = params.ledForwardVolts - junctionVolts
  if (offsetVolts < 0) {
    throw new Error(
      `vactrolSubcircuit: ledForwardVolts (${params.ledForwardVolts} V) is below the ` +
        `${LED_STANDIN_MODEL} stand-in's own ${junctionVolts.toPrecision(4)} V drop at ` +
        `${params.fullDriveAmps} A, so reaching it would need a NEGATIVE offset source - a ` +
        `branch that generates voltage rather than dropping it. No LED has a forward voltage ` +
        `below a silicon signal diode's; state the drop the part actually assumes.`,
    )
  }

  // clamp(I / fullDrive, 0, 1). `min`/`max` were exercised against this
  // project's engine and behave as written; `limit()` was not, and an unverified
  // spelling of an already-verified behaviour is not worth preferring. The clamp
  // is saturation, not extrapolation - see the header.
  const fraction =
    `min(max(i(${VACTROL_SENSE_SOURCE})/${params.fullDriveAmps.toExponential(12)}, 0), 1)`
  const resistance =
    `${params.darkOhms.toExponential(12)} * exp(${logSpan.toExponential(12)} * ${fraction})`

  return [
    ...emittedNotice(params, offsetVolts),
    `.subckt ${params.name} ${VACTROL_PIN_ORDER.join(" ")}`,
    deviceModel(LED_STANDIN_MODEL).spice.trimEnd(),
    `${VACTROL_SENSE_SOURCE} LED_A LED_ANODE DC 0`,
    `DLED LED_ANODE LED_DROP ${LED_STANDIN_MODEL}`,
    `${VACTROL_FORWARD_OFFSET_SOURCE} LED_DROP LED_K DC ${offsetVolts.toExponential(12)}`,
    `BLDR LDR_1 LDR_2 I = v(LDR_1,LDR_2) / (${resistance})`,
    `.ends ${params.name}`,
  ].join("\n")
}
