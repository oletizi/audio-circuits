/**
 * The footprint table: known KiCad footprints translated into the physical
 * facts a parts search needs (lead spacing, body size, package, pin order).
 * An unknown footprint throws, naming it and this table, rather than
 * guessing - a part search built on a guessed body size buys the wrong part.
 *
 * TO-92 PIN ORDER. Controller ruling: it comes from the circuit module's
 * PIN_NUMBERS for "bjt", as carried on BoardCircuit.pinNumbers - pin number
 * to pin name, sorted by pin number (e.g. 1 emitter, 2 base, 3 collector). A
 * board that declares none for "bjt" is refused, naming the fix, rather than
 * assuming the 2N3904's E-B-C order for a part that might not share it.
 */
import type { Component } from "../../lib/model/types.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import type { Physical } from "./types.ts"

const AXIAL_RESISTOR = /^Resistor_THT:R_Axial_DIN0207_.*_P([0-9]+(?:\.[0-9]+)?)mm_.*$/
const RADIAL_ELECTROLYTIC = /^Capacitor_THT:CP_Radial_D([0-9]+(?:\.[0-9]+)?)mm_P([0-9]+(?:\.[0-9]+)?)mm$/
const TO92_INLINE = "Package_TO_SOT_THT:TO-92_Inline"
const TRIMMER_RM065 = "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical"
const PIN_HEADER = /^Connector_PinHeader_2\.54mm:PinHeader_1x([0-9]+)_P2\.54mm_Vertical$/
const PIN_HEADER_PITCH_MM = 2.54

const KNOWN_FOOTPRINTS =
  "Resistor_THT:R_Axial_DIN0207_*_P<p>mm_* (axial resistor), " +
  "Capacitor_THT:CP_Radial_D<d>mm_P<p>mm (radial electrolytic), " +
  `${TO92_INLINE} (TO-92), ${TRIMMER_RM065} (trimmer), ` +
  "Connector_PinHeader_2.54mm:PinHeader_1x<n>_P2.54mm_Vertical (pin header)"

function parseMm(text: string, footprint: string, what: string): number {
  const value = Number(text)
  if (!Number.isFinite(value)) {
    throw new Error(`footprint "${footprint}": could not parse ${what} "${text}mm" as a number`)
  }
  return value
}

/** Pin number (as PIN_NUMBERS spells it) -> pin name, for "bjt", sorted ascending by pin number. */
function to92PinOrder(component: Component, pinNumbers: PinNumbers): readonly string[] {
  const bjtPins = pinNumbers["bjt"]
  if (bjtPins === undefined || Object.keys(bjtPins).length === 0) {
    throw new Error(
      `component "${component.id}" uses the TO-92 footprint, but the circuit declares no ` +
        'PIN_NUMBERS["bjt"], so its pin order (which lead is emitter, base or collector) is ' +
        'unknown. Add PIN_NUMBERS["bjt"] (canonical pin name -> footprint pin number) to the ' +
        "circuit module.",
    )
  }
  const nameByNumber = new Map<string, string>()
  for (const [name, number] of Object.entries(bjtPins)) {
    const clash = nameByNumber.get(number)
    if (clash !== undefined) {
      throw new Error(
        `component "${component.id}": PIN_NUMBERS["bjt"] maps both "${clash}" and "${name}" to pin ` +
          `${number}, so the TO-92 pin order is ambiguous.`,
      )
    }
    nameByNumber.set(number, name)
  }
  return [...nameByNumber.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, name]) => name)
}

/**
 * The physical facts a footprint implies. Throws on any footprint this table
 * does not recognise, naming it and the recognised set.
 */
export function physicalFor(footprint: string, component: Component, pinNumbers: PinNumbers): Physical {
  if (footprint === TO92_INLINE) {
    return { kind: "to92", pinOrder: to92PinOrder(component, pinNumbers) }
  }
  if (footprint === TRIMMER_RM065) {
    return { kind: "trimmer", package: "RM-065" }
  }
  const axial = AXIAL_RESISTOR.exec(footprint)
  if (axial !== null) {
    return { kind: "axial-resistor", body: "0207", leadSpacingMm: parseMm(axial[1], footprint, "lead spacing") }
  }
  const radial = RADIAL_ELECTROLYTIC.exec(footprint)
  if (radial !== null) {
    return {
      kind: "radial-electrolytic",
      maxDiameterMm: parseMm(radial[1], footprint, "body diameter"),
      leadSpacingMm: parseMm(radial[2], footprint, "lead spacing"),
    }
  }
  const header = PIN_HEADER.exec(footprint)
  if (header !== null) {
    return { kind: "pin-header", pins: Number(header[1]), pitchMm: PIN_HEADER_PITCH_MM }
  }
  throw new Error(
    `component "${component.id}": footprint "${footprint}" is not one of the footprints ` +
      `tools/bom/footprints.ts recognises (${KNOWN_FOOTPRINTS}). Add it there, with a test, before ` +
      "deriving parts-list needs from it.",
  )
}
