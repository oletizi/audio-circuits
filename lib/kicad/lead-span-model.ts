/**
 * What a hole span is, how a datasheet dimension becomes one, and the mounting
 * standard that decides where a lead may be bent.
 *
 * SPAN IS COUNTED IN HOLES, following VeroRoute's own `length` (the `cols` of
 * `CompTypes::GetMakeInstructions`), NOT in grid steps: `CompTypes::GetMinLength`
 * returns 2 for a `RESISTOR` and `GetMaxLength` returns 16, and a 2-hole span is
 * one 2.54mm step. The import-string suffix is the STEP count, so `RESISTOR4` is
 * a 5-hole span at 10.16mm - see `holesForSteps` in `./grid.ts`, which is the one
 * place the two counts are converted.
 *
 * THE ARITHMETIC IS HERE AND THE NUMBERS ARE IN `./lead-span.ts`, deliberately.
 * A recorded `minSpanHoles` is only as good as the dimensions it came from, so
 * `tests/kicad/lead-span.test.ts` recomputes every recorded integer from the
 * recorded dimensions through these functions. A value that cannot be rederived
 * is a transcription error, and that is the error this split is built to catch.
 *
 * WHAT THIS DOES NOT CLAIM. A datasheet minimum lead length is a statement about
 * what the manufacturer ships, not a guarantee about the individual part in a
 * drawer - bulk and taped parts of the same ordering series differ, and a part
 * cut from a tape has whatever the tape left it. A span inside the lead's reach
 * can still be a poor joint: a long formed lead is a lever, and a board that
 * flexes works the lead-to-seal junction these numbers assume is intact.
 */
import {
  GRID_MM,
  PITCH_TOLERANCE_MM,
  gridStepsAtLeast,
  gridStepsAtMost,
  holesForSteps,
  nearestGridSteps,
} from "./grid.ts"

/** Where a number came from, precisely enough to go and look at it again. */
export interface DatasheetRef {
  readonly manufacturer: string
  /** The document's own title, as printed on it. */
  readonly document: string
  /** Its document, catalogue or order number. */
  readonly documentId: string
  /** Its revision or date, as printed on it. */
  readonly revision: string
  /** The table, figure or drawing the value was read from. */
  readonly location: string
  readonly url: string
}

/**
 * The lead-forming rule, by standard and clause.
 *
 * IEC 61760-1 WAS CHECKED AND DOES NOT APPLY. It is "Surface mounting technology
 * - Part 1: Standard method for the specification of surface mounting components
 * (SMDs)" (IEC webstore publication 5869, 2nd edition 2006-04) and says nothing
 * about forming the leads of a through-hole part. Its through-hole counterpart,
 * IEC 61192-3:2002 "Workmanship requirements for soldered electronic assemblies
 * - Part 3: Through-hole mount assemblies", is paywalled and was NOT read, so
 * nothing is attributed to it. IPC-A-610 is quoted below because it is the one
 * whose clause could actually be read.
 */
export interface BendRule {
  readonly standard: string
  readonly revision: string
  readonly clause: string
  /** The clause, verbatim. */
  readonly quote: string
  readonly radiusTableClause: string
  readonly radiusTableQuote: string
  /** The clause that fixes how far through the board a lead must reach. */
  readonly protrusionClause: string
  readonly protrusionQuote: string
}

export const BEND_RULE: BendRule = {
  standard: "IPC-A-610, Acceptability of Electronic Assemblies",
  revision:
    "Revision E, read from the IPC-A-610E redline \"Changes from Revision D to Revision E\" " +
    "(610E-01 redline), pages 7-3, 7-4 and 7-18",
  clause: "7.1.2.1 Component Mounting - Lead Forming - Bends, Figure 7-10",
  quote:
    "Leads of through-hole mounted component extend at least 1 lead diameter or thickness " +
    "but not less than 0.8 mm [0.031 in] from the body, solder bead, or lead weld.",
  radiusTableClause: "7.1.2.1, Table 7-1 Lead Bend Radius",
  radiusTableQuote:
    "Lead Diameter (D) or Thickness (T) < 0.8 mm [0.031 in]: Minimum Inside Bend Radius 1 D/T; " +
    "0.8 mm [0.031 in] to 1.2 mm [0.0472 in]: 1.5 D/T; > 1.2 mm [0.0472 in]: 2 D/T. " +
    "Note: Rectangular leads use thickness (T).",
  protrusionClause: "7.5.3 Supported Holes - Wire/Lead Protrusion, Table 7-3",
  protrusionQuote: "(L) min., Class 1, 2 and 3: End is discernible in the solder.",
}

/**
 * The board the spans are for.
 *
 * THE THICKNESS IS LOAD-BEARING and is not a guess. A formed lead has to reach
 * the far face before its end can be "discernible in the solder"
 * (`BEND_RULE.protrusionQuote`), so every millimetre of board is a millimetre of
 * reach the part does not get. On the two film-capacitor families, whose whole
 * lead is 4-5mm, it is the difference between a part that can be splayed and one
 * that cannot.
 */
export interface Stripboard {
  readonly thicknessMm: number
  readonly holeDiameterMm: number
  readonly gridMm: number
  readonly source: DatasheetRef
}

export const STRIPBOARD: Stripboard = {
  thicknessMm: 1.6,
  holeDiameterMm: 1.02,
  gridMm: GRID_MM,
  source: {
    manufacturer: "Vero Technologies",
    document:
      "VEROBOARD - Single sided, copper printed circuit boards, fully pierced with holes. " +
      "Also known as stripboard",
    documentId: "Farnell datasheet 10822",
    revision: "undated - the document carries no revision or date",
    location:
      "the \"Veroboard (stripboard) Features\" paragraph: \"All boards are 1.6mm thick with " +
      "copper thickness of 35um. Hole grid: 2.54 x 2.54 mm., hole diameter: 1.02 mm.\"",
    url: "https://www.farnell.com/datasheets/10822.pdf",
  },
}

/**
 * How a formable part meets the board, because it decides which dimension bounds
 * the minimum.
 *
 * - `axial-horizontal`: leads leave opposite ends of the body and the body lies
 *   between the holes, so the BODY sets the minimum span.
 * - `radial-vertical`: both leads leave the same face and the body stands above
 *   the board, so nothing has to fit between the holes and the grid sets the
 *   minimum. Splaying a radial part is two bends per lead, not an axial part's
 *   one, which is why the two share no formula.
 */
export type Mounting = "axial-horizontal" | "radial-vertical"

/** A part whose leads are bare wire, so a span is arithmetic on its dimensions. */
export interface FormableGeometry {
  readonly kind: "formable"
  /** The part the family's numbers ARE. A family has no datasheet; a part does. */
  readonly mpn: string
  readonly mounting: Mounting
  /** Maximum body length along the lead axis. */
  readonly bodyLengthMm: number
  /** Maximum body diameter or width across it. */
  readonly bodyDiameterMm: number
  /** The footprint's own lead pitch - the span the part is nominally mounted at. */
  readonly nominalPitchMm: number
  /** Worst-case usable lead length: a datasheet minimum, or nominal less tolerance. */
  readonly leadLengthMm: number
  /** Which packaging, and which end of the tolerance, `leadLengthMm` is. */
  readonly leadLengthBasis: string
  readonly leadDiameterMm: number
  /**
   * A minimum mounting pitch the manufacturer states itself, when it states one.
   * `null` means it does not, and the body-plus-standoff arithmetic stands alone.
   */
  readonly manufacturerMinPitchMm: number | null
  readonly source: DatasheetRef
}

/** A part whose terminals are moulded in at a fixed pitch, so there is no span to choose. */
export interface RigidGeometry {
  readonly kind: "rigid"
  /** The package, not an orderable part: a moulded pin field is a package fact. */
  readonly part: string
  /** Pitch between the part's own adjacent terminals. */
  readonly terminalPitchMm: number
  /** Holes the pin field occupies along the axis the tool would otherwise stretch. */
  readonly fixedSpanHoles: number
  /** Why the tool must not stretch it. */
  readonly nonStretchable: string
  readonly source: DatasheetRef
}

export type FamilyGeometry = FormableGeometry | RigidGeometry

/** A family's recorded bounds, with the reasoning for each kept beside it. */
export interface LeadSpan {
  readonly footprint: string
  readonly minSpanHoles: number
  readonly maxSpanHoles: number
  /** False when the terminals cannot be formed at all, so min === max. */
  readonly formable: boolean
  readonly geometry: FamilyGeometry
  readonly minBasis: string
  readonly maxBasis: string
}

/** VeroRoute's own span range, from the pinned fork's `Src/CompTypes.h`. */
export const TOOL_MIN_SPAN_HOLES = 2
export const TOOL_MAX_SPAN_HOLES = 16

/** `BEND_RULE.quote`: at least one lead diameter, and never less than 0.8mm. */
export function standoffMm(leadDiameterMm: number): number {
  return Math.max(leadDiameterMm, 0.8)
}

/** `BEND_RULE.radiusTableQuote`, as a function. */
export function bendRadiusMm(leadDiameterMm: number): number {
  if (leadDiameterMm < 0.8) return leadDiameterMm
  if (leadDiameterMm <= 1.2) return 1.5 * leadDiameterMm
  return 2 * leadDiameterMm
}

/**
 * The radius the lead's CENTRELINE turns through, which is what sets both the
 * length of lead a bend eats and the sideways distance it covers.
 *
 * The standard's radius is the INSIDE radius, so the centreline sits half a lead
 * diameter further out. Using the inside radius for the arc would under-count
 * the lead a bend consumes and over-state every maximum.
 */
export function bendCentrelineRadiusMm(leadDiameterMm: number): number {
  return bendRadiusMm(leadDiameterMm) + leadDiameterMm / 2
}

/** Lead consumed by one 90-degree bend at the minimum radius. */
export function quarterBendLengthMm(leadDiameterMm: number): number {
  return (Math.PI / 2) * bendCentrelineRadiusMm(leadDiameterMm)
}

/**
 * How far down a lead must go before its end is "discernible in the solder".
 *
 * An axial part lying on the board has its lead axis half a body diameter up, so
 * it spends that height before it even reaches the top face.
 */
export function descentMm(geometry: FormableGeometry): number {
  const standing = geometry.mounting === "axial-horizontal" ? geometry.bodyDiameterMm / 2 : 0
  return standing + STRIPBOARD.thicknessMm
}

/**
 * Lead eaten by a minimum dog-leg - standoff, out, back down, through the board -
 * before any outward run at all. A radial part whose whole lead is shorter than
 * this cannot be splayed, at any span.
 */
export function doglegOverheadMm(geometry: FormableGeometry): number {
  return (
    standoffMm(geometry.leadDiameterMm) +
    2 * quarterBendLengthMm(geometry.leadDiameterMm) +
    descentMm(geometry)
  )
}

/** Whether the worst-case lead is long enough to form at all. */
export function isFormable(geometry: FamilyGeometry): boolean {
  if (geometry.kind === "rigid") return false
  if (geometry.mounting === "axial-horizontal") {
    return (
      geometry.leadLengthMm >=
      quarterBendLengthMm(geometry.leadDiameterMm) + descentMm(geometry)
    )
  }
  return geometry.leadLengthMm >= doglegOverheadMm(geometry)
}

/**
 * The span a part's own footprint pitch sits at, refusing a pitch that is not on
 * the grid at all - the same judgement `importStringFor` makes, in this module's
 * vocabulary.
 */
export function nominalSpanHoles(geometry: FormableGeometry, footprint: string): number {
  const { steps, errorMm } = nearestGridSteps(geometry.nominalPitchMm)
  if (errorMm > PITCH_TOLERANCE_MM) {
    throw new Error(
      `footprint "${footprint}" declares a lead pitch of ${geometry.nominalPitchMm}mm, which is ` +
        `${errorMm.toFixed(3)}mm off the nearest ${GRID_MM}mm grid multiple - beyond the ` +
        `${PITCH_TOLERANCE_MM}mm tolerance. A part that does not land on the holes unformed has ` +
        "no nominal span to record; give it a footprint whose pitch is on the grid.",
    )
  }
  return holesForSteps(steps)
}

/** The widest pitch the worst-case lead reaches, before the tool's ceiling. */
export function maxReachPitchMm(geometry: FormableGeometry): number {
  const centreline = bendCentrelineRadiusMm(geometry.leadDiameterMm)
  if (geometry.mounting === "axial-horizontal") {
    // One 90-degree bend per lead: straight out from the body, then down.
    const straight =
      geometry.leadLengthMm - quarterBendLengthMm(geometry.leadDiameterMm) - descentMm(geometry)
    return geometry.bodyLengthMm + 2 * (straight + centreline)
  }
  // Two per lead: down out of the body, out sideways, back down through the hole.
  const straight = geometry.leadLengthMm - doglegOverheadMm(geometry)
  return geometry.nominalPitchMm + 2 * (2 * centreline + straight)
}

/**
 * The tightest pitch the part can physically be mounted at.
 *
 * An axial part's body has to fit between the holes with a legal standoff at
 * each end; a radial part's does not, so its floor is one grid step, the point
 * at which the two holes stop being two holes.
 */
export function minReachPitchMm(geometry: FormableGeometry): number {
  if (geometry.mounting !== "axial-horizontal") return GRID_MM
  const geometric = geometry.bodyLengthMm + 2 * standoffMm(geometry.leadDiameterMm)
  const stated = geometry.manufacturerMinPitchMm
  return stated === null ? geometric : Math.max(stated, geometric)
}

const clamp = (holes: number): number =>
  Math.min(Math.max(holes, TOOL_MIN_SPAN_HOLES), TOOL_MAX_SPAN_HOLES)

/** The two bounds, derived. What `./lead-span.ts` records must equal this. */
export interface DerivedSpan {
  readonly minSpanHoles: number
  readonly maxSpanHoles: number
  readonly formable: boolean
}

export function deriveSpanHoles(geometry: FamilyGeometry, footprint: string): DerivedSpan {
  if (geometry.kind === "rigid") {
    const holes = geometry.fixedSpanHoles
    return { minSpanHoles: holes, maxSpanHoles: holes, formable: false }
  }
  if (!isFormable(geometry)) {
    const nominal = nominalSpanHoles(geometry, footprint)
    return { minSpanHoles: nominal, maxSpanHoles: nominal, formable: false }
  }
  return {
    minSpanHoles: clamp(holesForSteps(gridStepsAtLeast(minReachPitchMm(geometry)))),
    maxSpanHoles: clamp(holesForSteps(gridStepsAtMost(maxReachPitchMm(geometry)))),
    formable: true,
  }
}
