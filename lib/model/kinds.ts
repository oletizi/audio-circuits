/**
 * Canonical pin vocabulary, per component kind.
 *
 * A kind declares the vocabulary and NOTHING ELSE. Mappings to KiCad pin
 * numbers, footprint pads and SPICE argument positions are properties of a
 * concrete symbol, package or model and live there (spec 3.5). An `opamp`
 * cannot say that `in+` is pin 3, because that is true of one symbol's unit A,
 * not of operational amplifiers.
 *
 * `ic` and `connector` declare no vocabulary: their pins are whatever the part
 * has, so they are checked for non-emptiness rather than against a list. `switch`
 * is open for the same reason once it stands for a general selector: a simple SPST
 * has two contacts, but a rotary selector's terminals are a common plus one throw
 * per position, named by the part rather than fixed by the kind.
 */
import type { ComponentKind } from "./types.ts"

const UNIT_PINS: Readonly<Record<ComponentKind, readonly string[]>> = {
  resistor: ["a", "b"],
  capacitor: ["a", "b"],
  inductor: ["a", "b"],
  photoresistor: ["a", "b"],
  diode: ["anode", "cathode"],
  bjt: ["base", "collector", "emitter"],
  potentiometer: ["ccw", "wiper", "cw"],
  switch: [],
  opamp: ["in+", "in-", "out"],
  ic: [],
  connector: [],
}

const PACKAGE_PINS: Readonly<Record<ComponentKind, readonly string[]>> = {
  resistor: [], capacitor: [], inductor: [], photoresistor: [],
  diode: [], bjt: [], potentiometer: [], switch: [],
  opamp: ["v+", "v-"],
  ic: [], connector: [],
}

/**
 * Kinds whose pin names are declared by the PART, not by the kind: an IC, a
 * connector or a switch has whatever pins it has.
 *
 * Declared explicitly rather than inferred from an empty UNIT_PINS entry. An
 * inferred version cannot tell a deliberate open vocabulary from a closed one
 * whose list was left empty by mistake, and would silently stop validating that
 * kind's pins. The CONSISTENCY test below turns that mistake into a loud failure.
 */
const OPEN_VOCABULARY: ReadonlySet<ComponentKind> = new Set(["ic", "connector", "switch"])

export const ALL_KINDS: readonly ComponentKind[] =
  Object.keys(UNIT_PINS) as readonly ComponentKind[]

export function isKnownKind(kind: string): kind is ComponentKind {
  return Object.prototype.hasOwnProperty.call(UNIT_PINS, kind)
}

function assertKnown(kind: string): asserts kind is ComponentKind {
  if (!isKnownKind(kind)) {
    throw new Error(
      `unknown component kind "${kind}". Known kinds: ${Object.keys(UNIT_PINS).join(", ")}`,
    )
  }
}

export function unitPins(kind: ComponentKind): readonly string[] {
  assertKnown(kind)
  return UNIT_PINS[kind]
}

export function packagePins(kind: ComponentKind): readonly string[] {
  assertKnown(kind)
  return PACKAGE_PINS[kind]
}

/** Kinds whose pin names are declared by the part rather than the kind. */
export function hasOpenVocabulary(kind: ComponentKind): boolean {
  assertKnown(kind)
  return OPEN_VOCABULARY.has(kind)
}

/**
 * Argument order for kinds emitted as SPICE PRIMITIVES, where the order is fixed by
 * SPICE itself rather than by any model: a `D` line is always anode then cathode, a
 * `Q` line always collector, base, emitter. Note that this is NOT the kind's pin
 * vocabulary reordered by accident - `UNIT_PINS.bjt` reads base, collector, emitter,
 * and emitting that order would silently swap a transistor's first two terminals.
 *
 * Subcircuit-backed kinds are deliberately absent. Their order is a property of the
 * concrete model (spec 3.5), because two macromodels of one kind may order their pins
 * differently, so it lives on the model entry (`DeviceModel.pinOrder`) and `spicePinOrder`
 * refuses them rather than inventing an order here.
 *
 * Typed `Partial<...>` rather than a total record on purpose: a total record would claim
 * every kind is present and make the `undefined` branch below a check the type says can
 * never fire.
 */
const SPICE_PIN_ORDER: Partial<Readonly<Record<ComponentKind, readonly string[]>>> = {
  resistor: ["a", "b"],
  capacitor: ["a", "b"],
  inductor: ["a", "b"],
  photoresistor: ["a", "b"],
  diode: ["anode", "cathode"],
  bjt: ["collector", "base", "emitter"],
}

export function spicePinOrder(kind: ComponentKind): readonly string[] {
  assertKnown(kind)
  const order = SPICE_PIN_ORDER[kind]
  if (order === undefined) {
    throw new Error(
      `kind "${kind}" is not emitted as a SPICE primitive; its pin order comes from its model`,
    )
  }
  return order
}

export function isSpicePrimitive(kind: ComponentKind): boolean {
  assertKnown(kind)
  return Object.prototype.hasOwnProperty.call(SPICE_PIN_ORDER, kind)
}
