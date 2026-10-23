/**
 * The documents the pin patterns' forming accommodations cite, and nothing else.
 *
 * WHY IT IS ITS OWN FILE. `./pin-pattern.ts` is the per-footprint data and says
 * so; these are the four citations its three formed entries share, each with a
 * long note on what may and may not be concluded from it. Keeping them beside
 * thirteen footprint records took that file past this repository's 300-500 line
 * ceiling when the forming anchor was recorded, and splitting the records
 * themselves would have divided one table by nothing. The split is by KIND of
 * thing, which is the rule `CLAUDE.md` gives for directories and applies as well
 * here: a document reference is not a footprint.
 *
 * `LIBRARY_ROOT` lives here because two of the four are paths under it, and
 * `./pin-pattern.ts` imports it rather than writing a second copy.
 *
 * **`LIBRARY_ROOT` MUST STAY EQUAL TO `tests/kicad/footprint-library.ts`'s
 * `FOOTPRINT_LIBRARY_ROOT`** - `tests/kicad/pin-pattern.test.ts` compares
 * `pattern.source.file` (built from this constant) against
 * `readFootprintPads()`'s own `file` (built from that one), pad by pad.
 * Until `docs/known-gaps.md` **G169** this was two independently hand-written
 * copies of the SAME macOS literal, so the comparison happened to hold; both
 * now compute the identical expression - `KICAD_FOOTPRINTS`, else derived
 * from the resolved `kicad-cli` - so they cannot drift apart on any
 * platform the resolver covers.
 */
import { defaultFootprintDir } from "./install.ts"
import type { DatasheetRef } from "./lead-span-model.ts"
import { KICAD_CLI } from "./netlist.ts"

/**
 * The install the pads were read from, on 2026-10-10 - a per-platform
 * candidate list derived from the resolved `kicad-cli`, not a macOS-only
 * literal (`docs/known-gaps.md` **G169**). Each entry's own path under it is
 * written out, so a mistranscribed file name still fails the test that opens
 * it.
 */
export const LIBRARY_ROOT = process.env["KICAD_FOOTPRINTS"] ?? defaultFootprintDir(KICAD_CLI)

/**
 * KiCad's own footprint for the SAME package with its three leads on the grid.
 *
 * It is the evidence that a TO-92's leads are routinely formed to 2.54mm, and
 * it is a file that can be opened rather than a recollection. What it is NOT
 * is a manufacturer's lead-forming clause: the NXP document its `descr` points
 * at was not read, and nothing is attributed to it. The bend itself is governed
 * by `BEND_RULE` in `./lead-span-model.ts`.
 */
export const KICAD_TO92_INLINE_WIDE: DatasheetRef = {
  manufacturer: "KiCad",
  document: "the installed footprint libraries, read as files",
  documentId: `${LIBRARY_ROOT}/Package_TO_SOT_THT.pretty/TO-92_Inline_Wide.kicad_mod`,
  revision: "that file's own (version 20260206) token",
  location:
    "its three pads, at (at 0 0), (at 2.54 0) and (at 5.08 0) - the same package as " +
    "TO-92_Inline, whose pads are at 0, 1.27 and 2.54 - and its descr, \"TO-92 leads in-line, " +
    "wide, drill 0.75mm (see NXP sot054_po.pdf)\", with both footprints tagged \"to-92 sc-43 " +
    "sc-43a sot54 PA33 transistor\". The NXP document is NOT read here.",
  url: "https://gitlab.com/kicad/libraries/kicad-footprints",
}

/**
 * The Nichicon PS catalogue, which is the document `./lead-span.ts` records as
 * the authority for both `CP_Radial_*` entries whose leads are formed.
 *
 * ITS LEAD LENGTH IS NOT RESTATED HERE. A second copy of a datasheet figure is
 * exactly what the span module exists to stop, so these two accommodations cite
 * the reach that module derived - this footprint's `minSpanHoles` and
 * `maxSpanHoles` - and `admitPattern` checks the prepared extent against it.
 */
export const NICHICON_PS_AS_RECORDED: DatasheetRef = {
  manufacturer: "Nichicon",
  document:
    "ALUMINUM ELECTROLYTIC CAPACITORS. PS series - Miniature Sized, Low Impedance, For " +
    "Switching Power Supplies",
  documentId: "CAT.8100Z",
  revision: "undated - the catalogue page carries only its CAT.8100Z number",
  location:
    "the \"Radial Lead Type\" dimensional drawing, which is the reading lib/kicad/lead-span.ts " +
    "records for these footprints and the one that makes a lead long enough to form. The " +
    "figure itself is not restated here; the reach derived from it is this footprint's " +
    "minSpanHoles/maxSpanHoles in that module, and this entry cites that.",
  url: "https://www.nichicon.co.jp/english/products/pdf/e-ps.pdf",
}

/**
 * WHERE THE BODY SITS ONCE THE LEADS ARE FORMED, read off KiCad's own second
 * footprint for the SAME body at a different pitch.
 *
 * THIS IS THE RECORD `footprint-extent.ts` REFUSED FOR WANT OF, and it is a
 * measurement over files on disk rather than a judgement. KiCad ships all three
 * of this repository's formed bodies twice - at the moulded pitch and at
 * another - and in all three pairs the `F.Fab` box of the second is the box of
 * the first TRANSLATED, by exactly the distance the midpoint between the
 * outermost pads moved, with the width unchanged to the last digit. AND IT
 * DISCRIMINATES: `first-lead` predicts no movement at all in all three pairs
 * and `last-lead` predicts a different figure in each, so every pair refutes
 * both alternatives on its own.
 *
 * THE FIGURES ARE NOT WRITTEN HERE. `tests/kicad/formed-frame.test.ts` reads
 * the six files and checks the relation; `docs/stripboard/pin-pattern.md`
 * section 3.1 tabulates what it found, and what each anchor costs each
 * footprint. A copy here would be a third place to keep in step.
 *
 * WHAT MAY NOT BE CONCLUDED FROM IT. These are KiCad's drawings, not a
 * manufacturer's lead-forming clause, and nothing here is attributed to the
 * datasheets those files' `descr` fields point at. What they establish is that
 * the library draws a formed body centred on its lead row - which is the frame
 * question - and not how far a lead may be bent, which is `./lead-span.ts`'s
 * and `BEND_RULE`'s.
 */
export const KICAD_PREPARED_PITCH_VARIANTS: DatasheetRef = {
  manufacturer: "KiCad",
  document: "the installed footprint libraries, read as files",
  documentId:
    `${LIBRARY_ROOT}/Capacitor_THT.pretty/CP_Radial_D5.0mm_P2.50mm.kicad_mod, ` +
    `${LIBRARY_ROOT}/Capacitor_THT.pretty/CP_Radial_D8.0mm_P2.50mm.kicad_mod and ` +
    `${LIBRARY_ROOT}/Package_TO_SOT_THT.pretty/TO-92_Inline_Wide.kicad_mod`,
  revision: "each file's own (version 20260206) token",
  location:
    "each file's pads and its F.Fab body outline, against the same two fields of the " +
    "moulded-pitch footprint for the same body. In all three pairs the body outline is " +
    "translated by exactly the travel of the midpoint between the outermost pads, and its " +
    "width is unchanged - so the library draws a formed body centred on its lead row.",
  url: "https://gitlab.com/kicad/libraries/kicad-footprints",
}

/**
 * The anchor's own basis text, shared by all three entries because the
 * measurement behind it is one measurement over three pairs of files.
 *
 * The per-footprint half - what the alternatives would have cost THIS
 * footprint - is appended at each entry, because that part differs.
 */
export const MIDPOINT_ANCHOR_BASIS =
  "KiCad ships this body at a second pitch, and its F.Fab outline there is this footprint's " +
  "outline translated by exactly the travel of the midpoint between the outermost pads, width " +
  "unchanged - see KICAD_PREPARED_PITCH_VARIANTS above. It agrees with this entry's own forming " +
  "basis below, which was written before the frame was ever asked about and already describes " +
  "an equal-and-opposite bend."
