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
 * A RECORD'S TWO BOUNDS CAN BE TWO DIFFERENT MOUNTINGS, and each one says which.
 * The owner: *"It's standard practice to stand resistors on end when their holes
 * are next to each other. That's should NOT be a failure condition"*. So an
 * axial part has two mountings, the span it can reach is the union over them,
 * and the floor comes from standing it on end while the ceiling comes from lying
 * it flat. `minBasis` and `maxBasis` name the mounting for exactly this reason -
 * a floor that silently meant "if stood on end" beside a ceiling that silently
 * meant "if laid flat" is two claims a reader cannot tell apart.
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
 * - `axial-horizontal`: leads leave opposite ends of the body. It names the
 *   footprint's own mounting, LYING FLAT, where the body is between the holes -
 *   NOT the only mounting such a part has. It can also be stood on end, and
 *   then the body is not between the holes and its length constrains nothing:
 *   see `axialVerticalMinPitchMm`.
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
  /**
   * Maximum body length along the lead axis.
   *
   * It constrains an axial part's minimum pitch ONLY LYING FLAT. Stood on end
   * the body is not between the holes and this dimension constrains nothing.
   */
  readonly bodyLengthMm: number
  /**
   * Maximum body diameter or width across it.
   *
   * Read by the flat mounting's descent, and by `axialVerticalMinPitchMm` as the
   * thing the returning lead has to run down the outside of. It is therefore the
   * dimension an axial minimum stood on end depends on, and the one
   * `standingBodyDiameterMm` refuses the family by name for when it is missing.
   */
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
  /**
   * Why `minSpanHoles` is that number - AND WHICH MOUNTING IT COMES FROM.
   *
   * Naming the mounting is not optional prose. The two bounds of one record can
   * come from two different mountings (see `minReachPitchMm`), and a reader who
   * cannot tell which is which will read a floor that means "if stood on end"
   * as though the part were lying flat.
   */
  readonly minBasis: string
  /** Why `maxSpanHoles` is that number, naming its mounting as `minBasis` does. */
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
 * Lead consumed by a 180-degree turn at the minimum radius - the fold an axial
 * part's second lead makes over the top of the body when the part stands on end.
 */
export function halfTurnLengthMm(leadDiameterMm: number): number {
  return Math.PI * bendCentrelineRadiusMm(leadDiameterMm)
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

/**
 * The widest pitch the worst-case lead reaches, before the tool's ceiling.
 *
 * FOR AN AXIAL PART THIS IS THE FLAT MOUNTING, AND STANDING IT ON END DOES NOT
 * RAISE IT ON ANY FAMILY RECORDED HERE. The reason is not an inequality between
 * the two geometries; it is that the flat mounting's reach on the one recorded
 * axial family (55.8mm, about 22 steps) is already past `TOOL_MAX_SPAN_HOLES`,
 * where `deriveSpanHoles` clamps, so no second mounting can move the recorded
 * figure. `HC5`, which bounds a span above by this reach, is therefore untouched
 * by the vertical minimum below.
 *
 * FOR A FUTURE AXIAL FAMILY WHOSE FLAT REACH FALLS SHORT OF THE CEILING THE
 * QUESTION IS OPEN and must be answered rather than assumed, because the span
 * a part can reach is the union over its mountings at this end too.
 * `tests/kicad/lead-span.test.ts` fails when such a family is added, which is
 * where that answer gets demanded.
 */
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

/** An axial mounting other than the one a function is about, refused by name. */
function refuseNonAxial(geometry: FormableGeometry, what: string): never {
  throw new Error(
    `${what} was asked of "${geometry.mpn}", whose mounting is "${geometry.mounting}". It is ` +
      "the arithmetic for an AXIAL part stood on end, and a radial part is already standing - " +
      "its two leads leave the same face, so there is no body to turn through a right angle and " +
      "the question has no answer rather than a default one.\nCall minReachPitchMm, which picks " +
      "the mounting from geometry.mounting, or record the part as axial-horizontal in " +
      "lib/kicad/lead-span.ts if that is what it is.",
  )
}

/**
 * The body diameter, refusing the family BY NAME when it is not recorded.
 *
 * `PAR2`'s rule, applied to the dimension standing on end actually depends on:
 * an empty whitelist that refuses loudly beats a general rule that quietly
 * accepts a guess. A guessed diameter would produce a minimum span that LOOKS
 * derived, which is the worst available outcome here.
 */
function standingBodyDiameterMm(geometry: FormableGeometry): number {
  const diameter = geometry.bodyDiameterMm
  if (!Number.isFinite(diameter) || diameter <= 0) {
    throw new Error(
      `the family whose numbers are "${geometry.mpn}" records bodyDiameterMm as ` +
        `${String(diameter)}, so the pitch it can be STOOD ON END at cannot be derived: the ` +
        "returning lead runs back down alongside the body, so the body's DIAMETER is what sets " +
        "the hole spacing once the body is perpendicular to the board.\nThis is NOT defaulted. " +
        "Read the maximum body diameter off the part's own datasheet " +
        `(${geometry.source.documentId}, ${geometry.source.revision}) and record it beside the ` +
        "other dimensions in lib/kicad/lead-span.ts.",
    )
  }
  return diameter
}

/**
 * The tightest pitch an axial part can be mounted at LYING FLAT: its body has
 * to fit between the holes with a legal standoff at each end.
 */
export function axialFlatMinPitchMm(geometry: FormableGeometry): number {
  if (geometry.mounting !== "axial-horizontal") refuseNonAxial(geometry, "axialFlatMinPitchMm")
  const geometric = geometry.bodyLengthMm + 2 * standoffMm(geometry.leadDiameterMm)
  const stated = geometry.manufacturerMinPitchMm
  return stated === null ? geometric : Math.max(stated, geometric)
}

/**
 * Whether the worst-case lead is long enough to STAND THE PART ON END.
 *
 * The fold is the binding lead: it leaves the top of the body, clears it by a
 * standoff, turns through 180 degrees, runs the whole body length back down and
 * then through the board. The other lead leaves the bottom on the body axis and
 * goes straight down, which costs only the board thickness, so it is never the
 * one that runs out first.
 *
 * `descentMm` is NOT used here, and that is deliberate: it adds half a body
 * diameter for a lead axis lying above the board, which is a fact about the flat
 * mounting. Standing on end the lead arrives vertically at the hole, so the
 * descent is the board and nothing else.
 */
export function axialStandsOnEnd(geometry: FormableGeometry): boolean {
  if (geometry.mounting !== "axial-horizontal") refuseNonAxial(geometry, "axialStandsOnEnd")
  return (
    geometry.leadLengthMm >=
    standoffMm(geometry.leadDiameterMm) +
      halfTurnLengthMm(geometry.leadDiameterMm) +
      geometry.bodyLengthMm +
      STRIPBOARD.thicknessMm
  )
}

/**
 * The tightest pitch an axial part can be mounted at STOOD ON END.
 *
 * THE OWNER'S WARRANT, verbatim: *"It's standard practice to stand resistors on
 * end when their holes are next to each other. That's should NOT be a failure
 * condition"*. An axial two-lead part can always be stood up - body
 * perpendicular to the board, one lead straight down, the other folded over the
 * top and back down beside it - and once it is, THE BODY LENGTH STOPS
 * CONSTRAINING THE HOLE SPACING ENTIRELY. It is no longer between the holes.
 *
 * Two things constrain the spacing instead, and the tighter of them does not
 * bind:
 *
 * - the body's DIAMETER: the returning lead runs down the outside of the body,
 *   so its centreline sits `D/2 + d/2` from the body axis, and the straight lead
 *   sits on that axis;
 * - the FOLD: the two legs of a 180-degree turn at the minimum bend radius are
 *   `2c` apart, where `c` is the centreline radius `bendCentrelineRadiusMm`
 *   already derives from `BEND_RULE`'s Table 7-1.
 *
 * Both are small, so for every part recorded here the GRID is what actually
 * binds - one step, the point at which two holes stop being two holes, the same
 * floor a radial part gets and for the same reason.
 */
export function axialVerticalMinPitchMm(geometry: FormableGeometry): number {
  if (geometry.mounting !== "axial-horizontal") refuseNonAxial(geometry, "axialVerticalMinPitchMm")
  const alongsideBodyMm = standingBodyDiameterMm(geometry) / 2 + geometry.leadDiameterMm / 2
  const foldLegsMm = 2 * bendCentrelineRadiusMm(geometry.leadDiameterMm)
  return Math.max(GRID_MM, alongsideBodyMm, foldLegsMm)
}

/**
 * The tightest pitch the part can physically be mounted at, OVER THE MOUNTINGS
 * AVAILABLE TO IT.
 *
 * An axial part has two: lying flat, where the body is between the holes, and
 * stood on end, where it is not. Standing it up is the owner's standard practice
 * and it is the looser of the two, so it is the one that decides this bound
 * whenever the lead is long enough to make the fold. A radial part has one - it
 * already stands - so its floor is one grid step.
 *
 * THIS BOUND AND `maxReachPitchMm` ARE THEREFORE NOT THE SAME MOUNTING, and each
 * family's `minBasis`/`maxBasis` says which one it is. That is not an
 * inconsistency: a part may be built either way, so the span it can reach is the
 * union of what the two mountings reach, and a union's floor and ceiling come
 * from whichever member is widest at that end.
 */
export function minReachPitchMm(geometry: FormableGeometry): number {
  if (geometry.mounting !== "axial-horizontal") return GRID_MM
  const flat = axialFlatMinPitchMm(geometry)
  if (!axialStandsOnEnd(geometry)) return flat
  return Math.min(flat, axialVerticalMinPitchMm(geometry))
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
