/**
 * WHERE EVERY NUMBER IN `./lead-span.ts` CAME FROM: one `DatasheetRef` per
 * source document, each naming the manufacturer, the document, its id, its
 * revision and THE PLACE ON THE PAGE the figures were read.
 *
 * **ITS OWN FILE BECAUSE IT IS PROVENANCE AND NOT GEOMETRY**, and because
 * `./lead-span.ts` was at this repository's 500-line ceiling with the two
 * together. The seam is exact: nothing here is a dimension, and nothing in
 * `./lead-span.ts` is a citation.
 *
 * **`location` IS WHAT MAKES A REF EVIDENCE RATHER THAN A LINK.** A URL says a
 * document exists; the location says which table, row and column a figure was
 * read from, so somebody checking a recorded span can open the page at the right
 * place and disagree. `tests/kicad/lead-span.test.ts` requires all five fields
 * non-empty on every entry.
 *
 * **ONE KNOWN GAP IN WHAT `location` COVERS, stated rather than found later:**
 * no test checks that a `location` mentions the dimensions its entry records, so
 * an unsourced dimension passes the five-field check. `NICHICON_PS` is the live
 * symptom - `nichiconPs()` records `bodyLengthMm: 11.0` while this ref's location
 * cites only the `15MIN` lead length and the phiD/P/phid table. It is harmless
 * (`bodyLengthMm` is unread for a radial family) and it is the shape the check
 * cannot see.
 */
import type { DatasheetRef } from "./lead-span-model.ts"

export const VISHAY_MBB0207: DatasheetRef = {
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

export const TDK_B32529: DatasheetRef = {
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

export const WIMA_FKP2: DatasheetRef = {
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

export const NICHICON_PS: DatasheetRef = {
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

export const VEROROUTE_FORK: DatasheetRef = {
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

export const KICAD_FOOTPRINTS: DatasheetRef = {
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
