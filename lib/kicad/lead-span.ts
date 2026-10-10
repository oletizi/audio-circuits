/**
 * How far apart, and how close together, each through-hole family this
 * repository places can physically be mounted on 2.54mm stripboard.
 *
 * WHY IT EXISTS. The stripboard placement pipeline's stretch lever puts a part's
 * lead on the strip its net already occupies, and the tool will happily stretch
 * any two-terminal part to any span in 2-16 holes - `CompTypes::GetMinLength`
 * returns 2 and `GetMaxLength` 16 for every stretchable family. The part will
 * not. A DIN0207 resistor is 6.3mm of body on a 10.16mm pitch; `--stretch shrink`
 * can take it to 2 holes, which is 5.08mm, which is inside its own body. So both
 * bounds are needed and both are recorded, keyed by the footprint name the
 * netlist actually carries.
 *
 * A FAMILY HAS NO DATASHEET; A PART DOES. `R_Axial_DIN0207_*` names a DIN case
 * size, not something a manufacturer publishes a lead length for, so every entry
 * says which specific widely available part its numbers ARE - and they are that
 * part's numbers, not the family's. Fitting a different part in the same case
 * size is a reason to come back here, not a reason to trust these.
 *
 * NOTHING IS DEFAULTED. An unlisted footprint throws. A footprint whose lead
 * length nobody could source is listed in `UNSOURCED` with what is missing, and
 * also throws - an empty whitelist that refuses loudly beats a general rule that
 * quietly accepts a guess, and a span the part cannot make is not a lever but a
 * fiction.
 *
 * WHAT IS NOT HERE. Off-board parts - the Pultec pots, rotary selectors and
 * inductors in `circuits/pultec/off-board.ts` - are panel-mount, carry a symbol
 * rather than a footprint, and never reach this lookup. In particular the mid and
 * hi-boost inductors have no chosen part at all (`docs/pultec/values.md` admits a
 * catalogue part, a pot core or a transformer winding), so there is no geometry to
 * record; if one comes on-board it arrives here with its datasheet or it refuses.
 *
 * The derivation, shown so a reader can check the arithmetic, is in
 * `docs/stripboard/lead-span.md`. The bend rule and the formulae are in
 * `./lead-span-model.ts`. This file is a sibling of `./import-string.ts` rather
 * than part of it only because that file is already near this repository's
 * 300-500 line ceiling.
 */
import type { DatasheetRef, FamilyGeometry, LeadSpan } from "./lead-span-model.ts"
import { deriveSpanHoles } from "./lead-span-model.ts"

const VISHAY_MBB0207: DatasheetRef = {
  manufacturer: "Vishay Beyschlag",
  document:
    "MBA/SMA 0204, MBB/SMA 0207, MBE/SMA 0414 - Professional. Professional Thin Film " +
    "Leaded Resistors",
  documentId: "Vishay Document Number 28766",
  revision: "Revision: 05-Oct-09",
  location:
    "page 25, table \"DIMENSIONS - Leaded resistor types, mass and relevant physical " +
    "dimensions\", row MBB/SMA 0207: Dmax. 2.5mm, Lmax. 6.5mm, dnom. 0.6mm, lmin. 28.0mm, " +
    "Mmin. 10.0mm, with note (1) \"For 7.5 <= M < 10.0 mm, use version MBB/SMA 0207 ... L0 " +
    "without lacquer on the leads\"",
  url: "https://www1.futureelectronics.com/doc/Vishay/MBB0207VC-BCC.pdf",
}

const TDK_B32529: DatasheetRef = {
  manufacturer: "TDK Electronics (EPCOS)",
  document:
    "Film Capacitors. Capacitors for RFI Filtering, Smoothing, General-Purpose. " +
    "Series/Type: B3252*C/D/E/N/Q/R/T",
  documentId: "B32520_529",
  revision: "Date: June 2026",
  location:
    "page 2 \"Dimensional drawing\", lead spacing / lead diameter table (lead spacing 5.0mm " +
    "+-0.4, lead diameter d1 0.5mm +-0.05, type B32529); and page 6 \"Composition of ordering " +
    "code\", packaging code \"000 = Untaped (standard lead length 6 +-1 mm)\"",
  url: "https://www.tdk-electronics.tdk.com/inf/20/20/db/fc_2009/B32520_529.pdf",
}

const WIMA_FKP2: DatasheetRef = {
  manufacturer: "WIMA",
  document:
    "WIMA FKP 2. Polypropylene (PP) Film/Foil Capacitors for Pulse Applications in PCM 5 mm",
  documentId: "e_WIMA_FKP_2 (catalogue page 31)",
  revision: "03.26",
  location:
    "the dimensional drawing: \"d = 0.5 Ø\", \"Pin length: 6-2 = SD\", \"PCM ... at the pin " +
    "exit points (+-0.5)\"; and the 63 VDC ratings table row 470 pF: W 4.5, H 6, L 7.2, PCM 5",
  url: "https://www.wima.de/wp-content/uploads/media/e_WIMA_FKP_2.pdf",
}

const NICHICON_PS: DatasheetRef = {
  manufacturer: "Nichicon",
  document:
    "ALUMINUM ELECTROLYTIC CAPACITORS. PS series - Miniature Sized, Low Impedance, For " +
    "Switching Power Supplies",
  documentId: "CAT.8100Z",
  revision: "undated - the catalogue page carries only its CAT.8100Z number",
  location:
    "the \"Radial Lead Type\" dimensional drawing: lead length \"15MIN\", and the case-size " +
    "table phiD 5 / 6.3 / 8 against P 2.0 / 2.5 / 3.5 and phid 0.5 / 0.5 / 0.6",
  url: "https://www.nichicon.co.jp/english/products/pdf/e-ps.pdf",
}

const VEROROUTE_FORK: DatasheetRef = {
  manufacturer: "the pinned VeroRoute fork",
  document: "veroroute-perfboard, Src/CompTypes.h",
  documentId: ".tools/veroroute-perfboard/Src/CompTypes.h",
  revision: "the revision `make veroroute` pins",
  location:
    "GetMakeInstructions (TO92: rows = 1, cols = 3; TRIM_FLAT: rows = 3, cols = 3, " +
    "\"+2++++1+3\"), GetMinLength and GetMaxLength (SIP: pin count; DIP: pins/2; TO92 and " +
    "TRIM_FLAT fall through to \"default: assert(0) // Non-stretchable component\")",
  url: "https://github.com/ozzmaker/VeroRoute",
}

const KICAD_FOOTPRINTS: DatasheetRef = {
  manufacturer: "KiCad",
  document: "the installed footprint libraries, read as files",
  documentId: "/Applications/KiCad/KiCad.app/Contents/SharedSupport/footprints",
  revision: "the installed KiCad",
  location:
    "the pad coordinates of the .kicad_mod itself - DIP-16_W7.62mm pads 1 and 16 at x 0 and " +
    "7.62 with 8 pads per row on 2.54; TO-92_Inline pads at x 0, 1.27, 2.54; " +
    "Potentiometer_Runtron_RM-065_Vertical pads 1 and 3 at x 0 and 5.0 with pad 2 at (2.5, 5); " +
    "PinHeader_1x0n_P2.54mm_Vertical pads on 2.54",
  url: "https://gitlab.com/kicad/libraries/kicad-footprints",
}

/**
 * The Vishay MBB/SMA 0207 geometry, which `R_Axial_DIN0207_*` is fitted with.
 *
 * `Mmin. 10.0` IS THE MINIMUM, AND IT IS THE MANUFACTURER'S OWN. The drawing's M
 * is the distance between the formed leads, which is the hole spacing, and note
 * (1) confirms it by saying what to order for a tighter one. The body-plus-
 * standoff arithmetic independently gives 6.5 + 2 x 0.8 = 8.1mm, so the two
 * agree on the same 4-step span; the manufacturer's larger figure is the one
 * recorded because it is the one that was stated rather than computed.
 */
const MBB0207: FamilyGeometry = {
  kind: "formable",
  mpn: "Vishay MBB/SMA 0207 (metric size DIN 0207, CECC size B)",
  mounting: "axial-horizontal",
  bodyLengthMm: 6.5,
  bodyDiameterMm: 2.5,
  nominalPitchMm: 10.16,
  leadLengthMm: 28.0,
  leadLengthBasis:
    "lmin. for the untaped (bulk) part. The taped variants are supplied pre-formed to a 2.5mm " +
    "or 5.0mm lead spacing and have less free lead, so a taped part is NOT covered by this.",
  leadDiameterMm: 0.6,
  manufacturerMinPitchMm: 10.0,
  source: VISHAY_MBB0207,
}

/**
 * The TDK B32529 geometry, shared by the two 2.5mm and 3.5mm-bodied film
 * footprints.
 *
 * THE LEAD IS 5mm IN THE WORST CASE, and that is the whole story of this family.
 * `docs/pultec/capacitor-selection.md` selects the UNTAPED ordering codes
 * (`...K000`), whose standard lead length the datasheet gives as 6 +-1 mm. Five
 * millimetres is 0.24mm more than a minimum dog-leg needs, so the part can be
 * splayed by exactly one step and no further. At the 6mm nominal it would reach
 * two, which is why the tolerance is not rounded away.
 */
const B32529: FamilyGeometry = {
  kind: "formable",
  mpn: "TDK/EPCOS B32529, 63V, untaped (ordering-code packaging field 000)",
  mounting: "radial-vertical",
  bodyLengthMm: 7.2,
  bodyDiameterMm: 2.5,
  nominalPitchMm: 5.0,
  leadLengthMm: 5.0,
  leadLengthBasis:
    "untaped (bulk) standard lead length 6 +-1 mm, taken at the bottom of the tolerance. " +
    "Taped (ammo pack, code 289, or reel, code 189) parts are cut by the tape and are NOT " +
    "covered. TDK offers special lead lengths on request, which would be a different entry.",
  leadDiameterMm: 0.5,
  manufacturerMinPitchMm: null,
  source: TDK_B32529,
}

/**
 * The WIMA FKP2 geometry: the 470pF below B32529's 1nF floor.
 *
 * IT CANNOT BE FORMED AT ALL. The drawing gives the pin length as "6-2", which
 * reads as 6mm with a 2mm downward tolerance either way it is parsed, so 4mm is
 * the worst case - 0.76mm short of a minimum dog-leg. Its span is therefore
 * fixed at the footprint's own, and the stretch lever does not apply to it.
 */
const FKP2_470PF: FamilyGeometry = {
  kind: "formable",
  mpn: "WIMA FKP2, 63V, 470pF (FKP2C004701D00...)",
  mounting: "radial-vertical",
  bodyLengthMm: 7.2,
  bodyDiameterMm: 4.5,
  nominalPitchMm: 5.0,
  leadLengthMm: 4.0,
  leadLengthBasis:
    "pin length \"6-2\" from the dimensional drawing, taken at the bottom of the tolerance. " +
    "The glyph is a hyphen in the extracted text and could be either 6 +-2 or 6 -2; both give " +
    "4.0mm as the worst case, so the reading does not change the result.",
  leadDiameterMm: 0.5,
  manufacturerMinPitchMm: null,
  source: WIMA_FKP2,
}

/** One Nichicon PS case size: same 15mm lead, different pitch and lead diameter. */
function nichiconPs(
  caseDiameterMm: number,
  pitchMm: number,
  leadDiameterMm: number,
): FamilyGeometry {
  return {
    kind: "formable",
    mpn: `Nichicon PS series, case phi${caseDiameterMm}mm`,
    mounting: "radial-vertical",
    bodyLengthMm: 11.0,
    bodyDiameterMm: caseDiameterMm,
    nominalPitchMm: pitchMm,
    leadLengthMm: 15.0,
    leadLengthBasis:
      "\"15MIN\" in the Radial Lead Type drawing, a series-level minimum for the straight-lead " +
      "(bulk) part. Nichicon's trimmed, formed and taped variants are a separate document " +
      "(CAT.8100D / e-mi_tape) and are NOT covered. The same drawing carries a second " +
      "dimension, \"4MIN\", whose meaning could not be established from the document; it is " +
      "not used here, and being smaller than 15 it cannot loosen anything.",
    leadDiameterMm,
    manufacturerMinPitchMm: null,
    source: NICHICON_PS,
  }
}

/** A moulded pin field, whose span is read off the footprint rather than derived. */
function rigid(part: string, terminalPitchMm: number, fixedSpanHoles: number, why: string): FamilyGeometry {
  return {
    kind: "rigid",
    part,
    terminalPitchMm,
    fixedSpanHoles,
    nonStretchable: why,
    source: KICAD_FOOTPRINTS,
  }
}

const SIP_WHY =
  "A header's pins are moulded into its plastic at 2.54mm and there is no lead to form, so " +
  "its span is its pin count. VeroRoute agrees from the other side: GetMinLength(SIP) and " +
  "GetMaxLength(SIP) are both the PIN COUNT, so stretching a SIP changes how many pins the " +
  `part has rather than how far apart they sit (${VEROROUTE_FORK.documentId}).`

const DIP_WHY =
  "A DIP's leads leave a moulded leadframe at a fixed 7.62mm row spacing and 2.54mm along the " +
  "row. VeroRoute's GetMinLength(DIP) is pins/2, i.e. the along-row extent, so a stretch " +
  `changes the pin count, not the mounting span (${VEROROUTE_FORK.documentId}).`

const TO92_WHY =
  "The KiCad footprint puts the three pins on 1.27mm, but VeroRoute's TO92 is rows = 1, " +
  "cols = 3 - three pins on the 2.54mm grid - so the part is splayed to the grid once, as a " +
  "fixed preparation, and is not a lever afterwards. TO92 has no case in GetMinLength or " +
  `GetMaxLength and falls to \"default: assert(0) // Non-stretchable component\" (${VEROROUTE_FORK.documentId}).`

const TRIM_WHY =
  "The trimmer's three legs leave a moulded body at 5.0mm (pins 1 and 3) with the wiper offset, " +
  "and VeroRoute's TRIM_FLAT is a fixed 3 x 3 hole pattern \"+2++++1+3\" with no case in " +
  `GetMinLength or GetMaxLength (${VEROROUTE_FORK.documentId}).`

/** Each family's bounds, with the reasoning for each bound beside it. */
function span(
  footprint: string,
  geometry: FamilyGeometry,
  minBasis: string,
  maxBasis: string,
): LeadSpan {
  const derived = deriveSpanHoles(geometry, footprint)
  return { footprint, ...derived, geometry, minBasis, maxBasis }
}

const AXIAL_MIN =
  "Mmin. 10.0mm, the manufacturer's own minimum lead spacing, which rounds up to 4 grid steps " +
  "(10.16mm) because 10.0mm itself is not on the grid. The 6.5mm body plus a 0.8mm standoff at " +
  "each end gives 8.1mm independently, and lands on the same 4 steps."
const AXIAL_MAX =
  "Lead-limited reach is 55.8mm, about 22 steps, so the lead is NOT the binding constraint " +
  "here - VeroRoute's 16-hole ceiling is, and 16 is what is recorded."

const RADIAL_MIN_GRID =
  "One grid step. Both leads leave the same face and the body stands above the board, so " +
  "nothing has to fit between the holes and the floor is the point at which two holes stop " +
  "being two holes. The tool's own per-diameter floor may be tighter and also binds."
const ELECTRO_MAX =
  "15mm of lead less 4.8-5.2mm of dog-leg overhead leaves about 9.8-10.2mm of outward run per " +
  "lead, so about 26mm of pitch, which is 10 steps."

const SPANS: readonly LeadSpan[] = [
  span(
    "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
    MBB0207,
    AXIAL_MIN,
    AXIAL_MAX,
  ),
  span(
    "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm",
    B32529,
    RADIAL_MIN_GRID,
    "5.0mm of worst-case lead less 4.76mm of dog-leg overhead leaves 0.24mm of outward run per " +
      "lead, so 8.49mm of pitch - 3 steps, one step past the footprint's own 2.",
  ),
  span(
    "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm",
    { ...B32529, bodyDiameterMm: 3.5 },
    RADIAL_MIN_GRID,
    "As the 2.5mm-bodied B32529: the body width does not enter a radial part's span arithmetic, " +
      "only the lead does, and both footprints carry the same 5mm lead on the same 5mm pitch.",
  ),
  span(
    "Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm",
    FKP2_470PF,
    "Not formable: 4.0mm of worst-case lead is 0.76mm short of the 4.76mm a minimum dog-leg " +
      "needs, so the part mounts at its own 5.00mm pitch or not at all.",
    "Not formable - see the minimum. Both bounds are the footprint's own span.",
  ),
  span("Capacitor_THT:CP_Radial_D5.0mm_P2.00mm", nichiconPs(5.0, 2.0, 0.5), RADIAL_MIN_GRID, ELECTRO_MAX),
  span("Capacitor_THT:CP_Radial_D6.3mm_P2.50mm", nichiconPs(6.3, 2.5, 0.5), RADIAL_MIN_GRID, ELECTRO_MAX),
  span("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm", nichiconPs(8.0, 3.5, 0.6), RADIAL_MIN_GRID, ELECTRO_MAX),
  span(
    "Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical",
    rigid("1x01 pin header, 2.54mm", 2.54, 1, SIP_WHY),
    "One hole. A single pin has no span and bridges nothing.",
    "One hole - see the minimum.",
  ),
  span(
    "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
    rigid("1x02 pin header, 2.54mm", 2.54, 2, SIP_WHY),
    SIP_WHY,
    SIP_WHY,
  ),
  span(
    "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical",
    rigid("1x05 pin header, 2.54mm", 2.54, 5, SIP_WHY),
    SIP_WHY,
    SIP_WHY,
  ),
  span("Package_DIP:DIP-16_W7.62mm", rigid("DIP-16, 7.62mm row spacing", 2.54, 8, DIP_WHY), DIP_WHY, DIP_WHY),
  span("Package_TO_SOT_THT:TO-92_Inline", rigid("TO-92, inline leads", 1.27, 3, TO92_WHY), TO92_WHY, TO92_WHY),
  span(
    "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical",
    rigid("Runtron RM-065 trimmer, vertical", 5.0, 3, TRIM_WHY),
    TRIM_WHY,
    TRIM_WHY,
  ),
]

export const LEAD_SPANS: ReadonlyMap<string, LeadSpan> = new Map(
  SPANS.map((entry) => [entry.footprint, entry]),
)

/**
 * Footprints this repository places whose span is deliberately NOT recorded,
 * each mapped to what is missing.
 *
 * These refuse, and they refuse with a better message than an unknown footprint
 * gets, because the remedy is different: an unknown footprint needs an entry, and
 * one of these needs a part number first. Recording a plausible figure for either
 * would be the worst available outcome, because the arithmetic would look right.
 */
export const UNSOURCED: ReadonlyMap<string, string> = new Map([
  [
    "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm",
    "no lead length is sourced. This repository names no mpn for its ceramic discs, and on the " +
      "closest documented part - Vishay BCcomponents D Series, Document Number 28549, Revision " +
      "08-Jan-2026 - lead length is an ORDERING OPTION (digit 13, \"Packaging / Lead Length\", " +
      "\"Please refer to relevant datasheet\"), with the older BCcomponents D Series design note " +
      "giving only the catalogue range \"a lead length from 4 to 30 mm\". A 4mm lead cannot be " +
      "formed at all and a 30mm one reaches the tool's ceiling, so the option chosen decides the " +
      "answer entirely. Name the part and its lead-length option, then add an entry.",
  ],
  [
    "Capacitor_THT:CP_Radial_D5.0mm_P2.50mm",
    "no datasheet is sourced for a phi5mm can at 2.5mm lead spacing. Nichicon's PS, VZ and UM " +
      "case tables all put phi5 at 2.0mm, and Panasonic's \"Aluminum Electrolytic Capacitors " +
      "(Radial Lead Type) - Lead taping radial lead type\" dimensions (DMF0000COL51) confirms " +
      "Figure C \"Lead space : 2.5 mm / phiD x L : phi5 x 11 ...\" exists but states only taped " +
      "dimensions, not a bulk lead length. Either name the part fitted, or check whether it is " +
      "really a phi5/P2.00mm can and change the footprint - which is the likelier answer, since " +
      "CP_Radial_D5.0mm_P2.00mm is already used elsewhere in this repository.",
  ],
])

/** Every footprint with a recorded span, sorted, for quoting in a refusal. */
function recorded(): string {
  return [...LEAD_SPANS.keys()].sort().map((name) => `  ${name}`).join("\n")
}

/**
 * The span bounds for a footprint, or a refusal that says what is missing.
 *
 * There is no default and there will not be one. A span the part cannot
 * physically make produces a board that scores well and cannot be built.
 */
export function leadSpanFor(
  footprint: string,
  spans: ReadonlyMap<string, LeadSpan> = LEAD_SPANS,
  unsourced: ReadonlyMap<string, string> = UNSOURCED,
): LeadSpan {
  const found = spans.get(footprint)
  if (found !== undefined) return found

  const why = unsourced.get(footprint)
  if (why !== undefined) {
    throw new Error(
      `no lead span is recorded for footprint "${footprint}": ${why}\n` +
        "It is listed in UNSOURCED in lib/kicad/lead-span.ts precisely so that it refuses here " +
        "rather than being given a plausible figure. See docs/stripboard/lead-span.md.",
    )
  }

  throw new Error(
    `no lead span is recorded for footprint "${footprint}": it is not in LEAD_SPANS in ` +
      "lib/kicad/lead-span.ts, so how far its leads can be bent apart - and how far they can be " +
      "brought together - is unknown.\nThis is NOT defaulted: the tool will stretch any " +
      "two-terminal part to any span in 2-16 holes, so a guessed bound produces a layout that " +
      "scores well and cannot be built.\nFootprints with a recorded span:\n" +
      `${recorded()}\n` +
      "To add one, read the lead length, lead diameter and body dimensions off a named part's " +
      "datasheet, record them with their document number, revision and table, and put the entry " +
      "beside the others. docs/stripboard/lead-span.md shows the arithmetic.",
  )
}
