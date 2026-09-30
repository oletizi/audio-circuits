/**
 * Whether a catalog entry fits a derived line: same kind, matching value and
 * rating fields, and matching the footprint's physical facts.
 *
 * The kind check runs first and alone: a wrong kind means the rest of the
 * checks below - which interpret `specs` by the LINE's kind - are not
 * meaningful (a potentiometer's "taper" spec and a resistor's "watts" spec
 * share no vocabulary), so a wrong kind short-circuits to exactly one
 * misfit rather than a pile of accidental ones.
 *
 * A needed spec the entry does not state is a misfit ("not stated"), never
 * assumed - a part search built on an assumed spec buys the wrong part.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md; the exact rule
 * per physical kind is the controller ruling in
 * .superpowers/sdd/2026-09-30-bom/task-4-brief.md.
 */
import type { BomLine } from "./types.ts"
import type { CatalogEntry, Specs } from "./catalog.ts"

export interface Misfit {
  readonly field: string
  readonly needed: string
  readonly found: string
}

const NOT_STATED = "not stated"

function foundText(value: number | string | undefined): string {
  return value === undefined ? NOT_STATED : String(value)
}

/** Exact equality: the found value must equal the needed one. Skipped (returns no
 * misfit) when the line does not need this field at all. */
function checkEqual(
  field: string,
  needed: number | string | undefined,
  found: number | string | undefined,
): Misfit | undefined {
  if (needed === undefined) return undefined
  if (found === needed) return undefined
  return { field, needed: String(needed), found: foundText(found) }
}

function checkAtLeast(field: string, needed: number | undefined, found: number | undefined): Misfit | undefined {
  if (needed === undefined) return undefined
  if (found !== undefined && found >= needed) return undefined
  return { field, needed: `>= ${needed}`, found: foundText(found) }
}

function checkAtMost(field: string, needed: number, found: number | undefined): Misfit | undefined {
  if (found !== undefined && found <= needed) return undefined
  return { field, needed: `<= ${needed}`, found: foundText(found) }
}

function checkPinout(needed: readonly string[], found: readonly string[] | undefined): Misfit | undefined {
  if (found !== undefined && found.length === needed.length && found.every((name, index) => name === needed[index])) {
    return undefined
  }
  return { field: "pinout", needed: needed.join(", "), found: found === undefined ? NOT_STATED : found.join(", ") }
}

/** The checks that depend on which footprint the line's `physical` facts describe -
 * axial resistor, radial electrolytic, TO-92, trimmer, pin header. A panel pot has no
 * physical-specific check of its own: it is a value-and-taper-only purchase. */
function physicalMisfits(line: BomLine, specs: Specs): readonly Misfit[] {
  const physical = line.physical
  const misfits: Misfit[] = []
  const push = (misfit: Misfit | undefined): void => {
    if (misfit !== undefined) misfits.push(misfit)
  }

  if (physical.kind === "axial-resistor") {
    // Only the body decides whether an axial part fits: its leads are bent to the
    // footprint's pitch on the bench, so no datasheet states a lead spacing to check.
    push(checkEqual("package", physical.body, specs.package))
  } else if (physical.kind === "radial-electrolytic") {
    push(checkAtMost("diameterMm", physical.maxDiameterMm, specs.diameterMm))
    push(checkEqual("leadSpacingMm", physical.leadSpacingMm, specs.leadSpacingMm))
  } else if (physical.kind === "to92") {
    push(checkEqual("package", "TO-92", specs.package))
    push(checkPinout(physical.pinOrder, specs.pinout))
  } else if (physical.kind === "trimmer") {
    push(checkEqual("package", physical.package, specs.package))
  } else if (physical.kind === "pin-header") {
    push(checkEqual("pins", physical.pins, specs.pins))
    push(checkEqual("pitchMm", physical.pitchMm, specs.pitchMm))
  }
  // physical.kind === "panel-pot": value and taper only, checked below regardless of
  // physical kind - nothing further to check here.

  return misfits
}

/**
 * Every way a catalog entry fails to fit a derived line. A wrong kind yields exactly
 * one misfit (see the module comment); otherwise every applicable field is checked,
 * so a caller sees every mismatch at once rather than one per run.
 */
export function misfits(line: BomLine, entry: CatalogEntry): readonly Misfit[] {
  if (entry.kind !== line.kind) {
    return [{ field: "kind", needed: line.kind, found: entry.kind }]
  }

  const specs = entry.specs
  const result: Misfit[] = []
  const push = (misfit: Misfit | undefined): void => {
    if (misfit !== undefined) result.push(misfit)
  }

  push(checkEqual("ohms", line.ohms, specs.ohms))
  push(checkEqual("farads", line.farads, specs.farads))
  push(checkEqual("taper", line.taper, specs.taper))
  push(checkEqual("mpn", line.mpn, entry.mpn))
  push(checkAtLeast("volts", line.minVolts, specs.volts))
  push(checkAtLeast("watts", line.minWatts, specs.watts))
  result.push(...physicalMisfits(line, specs))

  return result
}
