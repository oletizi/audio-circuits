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
 * has, so they are checked for non-emptiness rather than against a list.
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
  switch: ["a", "b"],
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
  return UNIT_PINS[kind].length === 0
}
