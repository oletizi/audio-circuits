/**
 * Map KiCad footprint names onto VeroRoute "Import Strings".
 *
 * VeroRoute treats an imported netlist's package field as its component Type,
 * trying it first as a user-defined alias and then as an import string
 * directly. A netlist whose package field already holds a valid import string
 * therefore imports with no manual Part Aliases entry at all.
 *
 * THE GRAMMAR IS DELIBERATELY NARROW. Only the five families this repository
 * has evidence for are recognized; everything else refuses. The evidence is
 * `tests/fixtures/pt2399-core.net` paired with
 * `tests/fixtures/pt2399-core-veroroute.net` - the netlist a board that was
 * built and works was laid out from - which pins all seven of its distinct
 * footprints to the import strings that board actually used.
 */

/** Millimetres per 100-mil grid step. */
const GRID_MM = 2.54

const MM_PER_INCH = 25.4

/**
 * How far a lead pitch may sit from the grid and still be accepted.
 *
 * Sized for one specific phenomenon: KiCad names imperial parts in rounded
 * metric. `P2.50mm` IS a 0.1in part and is 0.04mm off; `P7.50mm` IS a 0.3in
 * part and is 0.12mm off; `P10.16mm` is exact. A tighter tolerance refuses
 * real, correct footprints. A much looser one starts accepting genuinely
 * off-pitch parts as though they fitted their holes.
 */
const PITCH_TOLERANCE_MM = 0.15

/** VeroRoute's lead-span suffix range, from CompTypes.h. */
const MIN_SPAN = 1
const MAX_SPAN = 15

/**
 * The electrolytic body diameters VeroRoute actually has types for, from the
 * fork's `Src/CompTypes.h`.
 *
 * THIS IS NOT A 50-MIL LADDER, and implementing it as one is the trap. There
 * is no 350, 450 or 550: the gaps are 50 mil below 300 and 100 mil above. A
 * part measuring 8.89mm (350 mil) rounded to the nearest 50 yields
 * "CAP_ELECTRO_350", which has no matching type and fails the import outright.
 */
const ELECTRO_DIAMETERS: readonly number[] = [200, 250, 300, 400, 500, 600]

/**
 * The domain over which "nearest enumerated diameter" is meaningful: half the
 * first gap below the smallest type, half the last gap above the largest.
 * Outside it, nearest-member selection is no longer a size claim anyone made.
 */
const MIN_ELECTRO_MILS = 175
const MAX_ELECTRO_MILS = 650

/**
 * How close two candidate diameters must be before the choice is called
 * ambiguous. Wide enough that float error cannot decide a midpoint case,
 * narrow enough that no real part lands in it: the nearest midpoints are 25 and
 * 50 mil from their neighbours.
 */
const TIE_BAND_MILS = 0.5

/**
 * Footprints whose import string is NOT what their name derives to.
 *
 * WHY THIS IS EMPTY, and why it is still here. Every footprint this repository
 * places today derives correctly from its name. A line belongs here when the
 * NAME LIES - a footprint copied into a personal library under a name whose
 * D/P fields no longer describe its pads - or when a part must be mapped
 * unconventionally, such as a non-polarized electrolytic, whose `_NP` types
 * exist in VeroRoute but which no KiCad footprint name distinguishes.
 *
 * Say in a comment beside the line WHY the derived answer is wrong for that
 * footprint. An override with no stated reason is indistinguishable from a
 * mistake.
 */
export const FOOTPRINT_IMPORT_STRINGS: ReadonlyMap<string, string> = new Map<string, string>()

/**
 * Film capacitors, by exact footprint name.
 *
 * A WHITELIST RATHER THAN A DERIVATION, and the asymmetry with the families
 * below is the reason. Each of those derives ONE free measurement into ONE
 * VeroRoute parameter - C_Disc's pitch to a span, CP_Radial's diameter to the
 * nearest enumerated diameter. A film capacitor needs two: the pitch to a span,
 * and the body width to a choice between CAP_FILM (one strip row) and
 * CAP_FILM_WIDE (three rows, "+++1+2+++"). That second one is not a
 * measurement, it is a classification of body geometry, and deriving it from a
 * width field would turn dimensional similarity into assumed mechanical
 * equivalence - a part that fits three strips because its name says 3.5mm, on a
 * board where it does not.
 *
 * So each entry is a part somebody has actually held. Empty until then: an
 * empty whitelist refuses loudly, where a general rule would quietly accept a
 * guess.
 */
export const FILM_CAPACITOR_IMPORT_STRINGS: ReadonlyMap<string, string> = new Map<string, string>()

/** The shapes this derives, quoted in every refusal so the operator can fix the source. */
const DERIVABLE_SHAPES = [
  "  R_Axial_*_P<mm>mm_*                    -> RESISTOR<n>      (n = pitch in 100-mil units)",
  "  C_Disc_*_P<mm>mm                       -> CAP_CERAMIC<n>   (n = pitch in 100-mil units)",
  "  CP_Radial_D<mm>mm_*                    -> CAP_ELECTRO_<mil> (nearest of 200/250/300/400/500/600)",
  "  DIP-<pins>_*                           -> DIP<pins>",
  "  PinHeader_1x<pins>_*                   -> SIP<pins>",
  "  <TerminalBlock* library>:*_1x<pins>_P<mm>mm -> BLOCK_100MIL<n> / BLOCK_200MIL<n> by pitch",
].join("\n")

/** Strips the library prefix: "Capacitor_THT:C_Disc_..." -> "C_Disc_...". */
function bareName(footprint: string): string {
  const colon = footprint.indexOf(":")
  return colon === -1 ? footprint : footprint.slice(colon + 1)
}

/** The library a footprint names: "TerminalBlock_Altech:Altech_AK300_..." -> "TerminalBlock_Altech". */
function libraryOf(footprint: string): string {
  const colon = footprint.indexOf(":")
  return colon === -1 ? "" : footprint.slice(0, colon)
}

function refuse(footprint: string, because: string): never {
  throw new Error(
    `no VeroRoute import string for footprint "${footprint}": ${because}\n` +
      `Shapes this derives:\n${DERIVABLE_SHAPES}\n` +
      "Either change the footprint so it follows one of those shapes, or add a line to " +
      "FOOTPRINT_IMPORT_STRINGS in lib/kicad/import-string.ts saying why this one is an exception.",
  )
}

/** Lead pitch in millimetres to a whole number of 100-mil grid steps. */
function gridSteps(mm: number, footprint: string): number {
  const steps = Math.round(mm / GRID_MM)
  const error = Math.abs(mm - GRID_MM * steps)
  if (error > PITCH_TOLERANCE_MM) {
    refuse(
      footprint,
      `its lead pitch ${mm}mm is ${error.toFixed(3)}mm from the nearest 2.54mm grid multiple ` +
        `(${(GRID_MM * steps).toFixed(2)}mm), which exceeds the ${PITCH_TOLERANCE_MM}mm tolerance.`,
    )
  }
  if (steps < MIN_SPAN || steps > MAX_SPAN) {
    refuse(footprint, `its lead span of ${steps} grid steps is outside VeroRoute's range ${MIN_SPAN}-${MAX_SPAN}.`)
  }
  return steps
}

/** Body diameter in millimetres to the nearest enumerated VeroRoute diameter. */
function electroDiameterMils(mm: number, footprint: string): number {
  const mils = (mm / MM_PER_INCH) * 1000
  if (mils < MIN_ELECTRO_MILS || mils > MAX_ELECTRO_MILS) {
    refuse(
      footprint,
      `its body diameter ${mm}mm (${mils.toFixed(1)} mil) is outside the range ` +
        `${MIN_ELECTRO_MILS}-${MAX_ELECTRO_MILS} mil over which VeroRoute's enumerated ` +
        `diameters (${ELECTRO_DIAMETERS.join(", ")}) are a meaningful choice.`,
    )
  }

  const ranked = ELECTRO_DIAMETERS
    .map((diameter) => ({ diameter, distance: Math.abs(mils - diameter) }))
    .sort((a, b) => a.distance - b.distance)
  const best = ranked[0]
  const runnerUp = ranked[1]
  if (best === undefined || runnerUp === undefined) {
    throw new Error("the enumerated diameter table needs at least two entries")
  }

  // AMBIGUITY IS A BAND, NOT AN EQUALITY. Testing `distance === distance` for a
  // tie is dead code: 8.89mm is 350.00000000000006 mil, so 400 wins by 1.2e-13
  // and the midpoint case silently resolves rather than refusing. A part within
  // half a mil of the midpoint genuinely does not determine its type.
  if (Math.abs(best.distance - runnerUp.distance) < TIE_BAND_MILS) {
    refuse(
      footprint,
      `its body diameter ${mm}mm (${mils.toFixed(1)} mil) is equidistant, to within ` +
        `${TIE_BAND_MILS} mil, between CAP_ELECTRO_${Math.min(best.diameter, runnerUp.diameter)} ` +
        `and CAP_ELECTRO_${Math.max(best.diameter, runnerUp.diameter)}. Picking one would be a ` +
        "physical-size claim nobody made.",
    )
  }
  return best.diameter
}

/** Reads a decimal field such as the "2.50" in "P2.50mm". */
function field(bare: string, pattern: RegExp): number | null {
  const match = pattern.exec(bare)
  if (match === null) return null
  const raw = match[1]
  if (raw === undefined) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function derive(footprint: string): string {
  const bare = bareName(footprint)

  if (bare.startsWith("R_Axial_")) {
    const pitch = field(bare, /_P([0-9.]+)mm/)
    if (pitch === null) refuse(footprint, "it is an R_Axial part with no readable _P<mm>mm pitch field.")
    return `RESISTOR${gridSteps(pitch, footprint)}`
  }

  if (bare.startsWith("C_Disc_")) {
    const pitch = field(bare, /_P([0-9.]+)mm/)
    if (pitch === null) refuse(footprint, "it is a C_Disc part with no readable _P<mm>mm pitch field.")
    return `CAP_CERAMIC${gridSteps(pitch, footprint)}`
  }

  if (bare.startsWith("CP_Radial_")) {
    const diameter = field(bare, /_D([0-9.]+)mm/)
    if (diameter === null) refuse(footprint, "it is a CP_Radial part with no readable _D<mm>mm diameter field.")
    return `CAP_ELECTRO_${electroDiameterMils(diameter, footprint)}`
  }

  if (bare.startsWith("DIP-")) {
    const pins = field(bare, /^DIP-([0-9]+)/)
    if (pins === null) refuse(footprint, "it is a DIP part with no readable pin count.")
    if (pins < 2 || pins > 254 || pins % 2 !== 0) {
      refuse(footprint, `a DIP pin count of ${pins} is not an even number in VeroRoute's range 2-254.`)
    }
    return `DIP${pins}`
  }

  if (bare.startsWith("PinHeader_1x")) {
    const pins = field(bare, /^PinHeader_1x([0-9]+)/)
    if (pins === null) refuse(footprint, "it is a PinHeader part with no readable pin count.")
    if (pins < 1 || pins > 255) {
      refuse(footprint, `a SIP pin count of ${pins} is outside VeroRoute's range 1-255.`)
    }
    return `SIP${pins}`
  }

  // MATCHED ON THE LIBRARY, NOT THE PART NAME. KiCad keeps terminal blocks in
  // fourteen libraries all prefixed "TerminalBlock", but the footprint names
  // inside them follow the manufacturer's series: Altech's 46 are
  // "Altech_AK300_1x03_P5.00mm_45-Degree" and Wuerth's 14 are similar. A rule
  // reading the name after the colon refuses all 60 of those while looking
  // perfectly correct on Phoenix and WAGO, which do prefix their names.
  if (libraryOf(footprint).startsWith("TerminalBlock")) {
    const pins = field(bare, /_1x([0-9]+)/)
    if (pins === null) {
      refuse(footprint, "it is a TerminalBlock part with no readable _1x<pins> pin count.")
    }
    if (pins < 1 || pins > 255) {
      refuse(footprint, `a terminal block pin count of ${pins} is outside VeroRoute's range 1-255.`)
    }
    const pitch = field(bare, /_P([0-9.]+)mm/)
    if (pitch === null) {
      refuse(footprint, "it is a TerminalBlock part with no readable _P<mm>mm pitch field.")
    }
    // VeroRoute has exactly two block pitches. A block at any other pitch does
    // not land on this board's holes at all, so it is refused rather than
    // rounded to whichever is closer.
    const steps = gridSteps(pitch, footprint)
    if (steps === 1) return `BLOCK_100MIL${pins}`
    if (steps === 2) return `BLOCK_200MIL${pins}`
    refuse(
      footprint,
      `its lead pitch ${pitch}mm is ${steps} grid steps, and VeroRoute's terminal blocks come ` +
        "only at 1 step (BLOCK_100MIL) or 2 steps (BLOCK_200MIL).",
    )
  }

  if (bare.startsWith("C_Rect_")) {
    refuse(
      footprint,
      "it is a film capacitor, whose import string is not derived from its name. Add it to " +
        "FILM_CAPACITOR_IMPORT_STRINGS in lib/kicad/import-string.ts, with its VeroRoute type " +
        "(CAP_FILM<n> for a body one strip wide, CAP_FILM_WIDE<n> for one three strips wide) " +
        "taken from the part in your hand rather than from the name.",
    )
  }

  refuse(footprint, "its name matches none of the footprint families this repository derives.")
}

/**
 * The import string for a KiCad footprint: an override if one is recorded,
 * otherwise whatever its name derives to, otherwise a refusal that teaches.
 */
export function importStringFor(
  footprint: string,
  overrides: ReadonlyMap<string, string> = FOOTPRINT_IMPORT_STRINGS,
  filmCapacitors: ReadonlyMap<string, string> = FILM_CAPACITOR_IMPORT_STRINGS,
): string {
  const override = overrides.get(footprint)
  if (override !== undefined) return override
  const film = filmCapacitors.get(footprint)
  if (film !== undefined) return film
  return derive(footprint)
}

/**
 * Pin count a pin-count-suffixed import string declares, or null when the type
 * carries a lead span or a fixed geometry instead.
 *
 * A lead span cannot be validated this way: RESISTOR4 spans four grid steps
 * but still has two pins, so its suffix says nothing about pin numbering.
 */
export function declaredPinCount(importStr: string): number | null {
  for (const type of ["SIP", "DIP", "PADS", "BLOCK_100MIL", "BLOCK_200MIL"]) {
    // Anchored, so CAP_ELECTRO_200 is never read as a PADS-style count.
    const match = new RegExp(`^${type}([0-9]+)$`).exec(importStr)
    if (match !== null) {
      const raw = match[1]
      if (raw !== undefined) return Number(raw)
    }
  }
  return null
}
