/**
 * The Pultec circuit's id-to-designator map - the bridge `CLAUDE.md` describes: *"A component's
 * `id` says what the part DOES ... It is never a reference designator ... Where a circuit has to
 * be checked against one, it exports a separate id-to-designator map ... and that map is the only
 * place the two vocabularies meet."*
 *
 * This is a fact about the Pultec circuit's own ids against the authoritative schematic's
 * designators, not layout intent for the schematic generator (`lib/schgen/`) that used to be this
 * map's only reader - which is why it lives beside the circuit rather than in
 * `circuits/pultec/schematic/section-board.ts`, which declared it only to feed that generator.
 */

/** The KiCad designator for the two junction rows, which have no designator-shaped id. */
export const JUNCTION_DESIGNATORS: Readonly<Record<string, string>> = {
  junction_signals: "J_SIGNALS",
  junction_grounds: "J_GROUNDS",
}

const DESIGNATOR = /^[A-Z][A-Z0-9_]*$/

/**
 * A component's KiCad designator: its own id, upper-cased, with `.` and `-` turned into `_`.
 *
 * **THIS IS A MAPPING AND IT IS NOT A NO-OP, WHICH IS THE POINT OF HAVING IT HERE RATHER THAN
 * REUSING THE BOARD'S OWN MAP.** `designatorsFor` in `./physical/parts.ts` maps every id to
 * ITSELF, annotated *"the reference ids are netlist-derived and already designator-shaped"*. That
 * is true of `C14` and `R3` and false of three kinds of id the boards actually carry, each of
 * which the IR's `partShapes` rule refuses as a label (`^[A-Z][A-Z0-9_]*$`):
 *
 * - the Pultec schematic's own lower-cased suffixes - `C2a2`, `C4a2`, `C5a2` on hi-boost, and
 *   every `C_MID_*Hz_*` on mid;
 * - the stand-in reduction's generated ids for a pot split into two resistors -
 *   `SI_HI_CUT_RV_HI_CUT.ccw-wiper`, which carries both a `.` and a `-`;
 * - the two junction rows, `junction_signals` and `junction_grounds`, which are handled by
 *   `JUNCTION_DESIGNATORS` above because upper-casing them would produce a label with no
 *   reference prefix a reader would recognise.
 *
 * **THE COST IS REAL AND IS RECORDED RATHER THAN HIDDEN.** For the Pultec the SCHEMATIC is
 * authoritative and the model is derived from a netlist export (`CLAUDE.md`, *"Authority runs in
 * both directions"*), so a generated drawing labelled `C2A2` disagrees with the authoritative
 * drawing's `C2a2` by one character. `docs/known-gaps.md` carries the measurement and the list.
 * Nothing in the circuit is edited to avoid it: an id is semantic and a designator is declared.
 */
export function pultecDesignator(id: string): string {
  const declared = JUNCTION_DESIGNATORS[id]
  if (declared !== undefined) return declared
  const designator = id.toUpperCase().replace(/[.-]/g, "_")
  if (!DESIGNATOR.test(designator)) {
    throw new Error(
      `the Pultec component id "${id}" does not become a KiCad designator by upper-casing and ` +
        `replacing "." and "-" with "_": the result "${designator}" is not ` +
        `${DESIGNATOR.source}, which the IR's partShapes rule requires of every part label. ` +
        "Add an explicit entry to JUNCTION_DESIGNATORS in " +
        "circuits/pultec/designators.ts, beside the two junction rows, rather than " +
        "widening this transformation - a wider transformation would silently rename a part the " +
        "authoritative Pultec schematic names, which is the one thing a designator map must not " +
        "do quietly.",
    )
  }
  return designator
}
