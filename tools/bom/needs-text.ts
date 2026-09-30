/**
 * A parts-list line's requirement in plain words, for `BOM.md`'s "Needs" column:
 * value, taper, the named part number, the physical constraint, and the ratings -
 * e.g. "100K, 0207 axial, 10.16 mm leads, min 0.25 W". Shown for chosen and
 * unchosen lines alike, so a reader (or the researcher) can see what each line
 * asks for without reading its key. Deterministic: numbers only, no dates.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import { capacitanceText, resistanceText } from "../../lib/kicad/value-notation.ts"
import type { BomLine, Physical } from "./types.ts"

/** "emitter" -> "E": a TO-92 pin order as the letters a datasheet pinout uses. */
function pinLetter(pin: string): string {
  return pin.charAt(0).toUpperCase()
}

function physicalText(physical: Physical): string {
  switch (physical.kind) {
    case "axial-resistor":
      return `${physical.body} axial, ${physical.leadSpacingMm} mm leads`
    case "radial-electrolytic":
      return `radial, <= ${physical.maxDiameterMm} mm dia, ${physical.leadSpacingMm} mm leads`
    case "to92":
      return `TO-92, ${physical.pinOrder.map(pinLetter).join("-")}`
    case "trimmer":
      return `${physical.package} trimmer`
    case "pin-header":
      return `${physical.pins}-pin ${physical.pitchMm} mm header`
    case "panel-pot":
      return "panel pot"
  }
}

/** Three significant figures: a derived power rating (dissipation x 2) is not a round number. */
function wattsText(watts: number): string {
  return String(Number(watts.toPrecision(3)))
}

export function needsText(line: BomLine): string {
  const parts: string[] = []
  if (line.ohms !== undefined) parts.push(resistanceText(line.ohms, line.key))
  if (line.farads !== undefined) parts.push(capacitanceText(line.farads, line.key))
  if (line.taper !== undefined) parts.push(line.taper)
  // A trimmer's part type is its package ("RM-065"), already in the physical text: said once.
  const physical = physicalText(line.physical)
  if (line.partType !== undefined && !physical.includes(line.partType)) parts.push(line.partType)
  parts.push(physical)
  if (line.minVolts !== undefined) parts.push(`min ${line.minVolts} V`)
  if (line.minWatts !== undefined) parts.push(`min ${wattsText(line.minWatts)} W`)
  return parts.join(", ")
}
