/**
 * Build notes: free-text lines a circuit module wants printed on the build
 * guide, verbatim and in order - typically text that used to live on a
 * schematic page and was dropped when the sheet was redrawn.
 *
 * A circuit module MAY export
 *
 *   guideNotes(): readonly string[]
 *
 * beside its circuit function, and `make guide` prints a **Build notes**
 * section carrying those lines.
 *
 * **SEPARATE FROM `schematicNotes()`, DELIBERATELY.** Four of the five
 * transistor-preamp boards already export `schematicNotes()` and their own
 * `.kicad_sch` pages already carry that text - keying this section on
 * `schematicNotes()` would print it a second time, once on the schematic page
 * and once more in the guide. A module opts in to the guide's Build notes
 * section only by exporting `guideNotes` under its own name, even when, as
 * `circuits/transistor-preamp/staged-board.ts` does, its body is nothing more
 * than `schematicNotes()` - that board's notes were dropped from its redrawn
 * sheet and this is their only remaining home, so it alone makes that export.
 *
 * Lines are printed exactly as returned, in order; a line that wants to read
 * as an indented continuation includes its own leading spaces ("  like
 * this"). There is no `conditions`-style header line the way `powerUpChecks`
 * has one (./power-up.ts) - these are notes, not a table that needs a state
 * named once above it.
 *
 * A module that exports nothing under the `guideNotes` name declares no
 * notes, and the guide prints no Build notes section at all - no heading, no
 * "declares none" sentence. That is unlike `powerUpChecks`, which always
 * prints a section, because the design this module implements
 * (`docs/superpowers/specs/2026-11-01-staged-preamp-copperhead-drawing-design.md`,
 * "Build notes in the guide") says the absence should be silent: most boards
 * never had schematic-page notes to begin with, and a sentence announcing
 * that on every one of them would be noise rather than information.
 *
 * A module that exports something else under that name, whose result is not
 * an array, whose array holds a non-string element, or whose array is empty,
 * is refused here, at load - naming `where` (the module's circuit path), the
 * same shape of refusal `declaredPowerUpChecks` gives (./power-up.ts): a
 * board that exports guideNotes must have at least one line to show for it,
 * and an empty or malformed export is a defect in the module, never
 * something this function can default its way past.
 */

/** The shape of a circuit module's `guideNotes` export. */
export type GuideNotesExport = () => readonly string[]

/**
 * The build-notes lines a circuit module declares: `undefined` when it
 * exports no `guideNotes`, its validated lines when it does. `where` names
 * the module in every refusal.
 */
export function declaredGuideNotes(
  module: Readonly<Record<string, unknown>>,
  where: string,
): readonly string[] | undefined {
  const exported = module["guideNotes"]
  if (exported === undefined) return undefined
  if (typeof exported !== "function") {
    throw new Error(
      `${where}: exports "guideNotes" as a ${typeof exported}, not a function. Export ` +
        "`guideNotes(): readonly string[]` (tools/guide/guide-notes.ts), or remove it.",
    )
  }
  const result: unknown = exported()
  if (!Array.isArray(result)) {
    throw new Error(
      `${where}: guideNotes() returned a ${typeof result}, not an array of strings. Export ` +
        "`guideNotes(): readonly string[]` (tools/guide/guide-notes.ts), or remove it.",
    )
  }
  const lines: string[] = result.map((line: unknown, index: number): string => {
    if (typeof line !== "string") {
      throw new Error(
        `${where}: guideNotes()[${index}] is a ${typeof line}, not a string. Every line guideNotes() ` +
          "returns must be a string (tools/guide/guide-notes.ts's `guideNotes(): readonly string[]`).",
      )
    }
    return line
  })
  if (lines.length === 0) {
    throw new Error(
      `${where}: guideNotes() returned no lines. A board that exports guideNotes must declare at ` +
        "least one; remove the export if the board has none.",
    )
  }
  return lines
}
