/**
 * The committed boards `tests/stripboard/vero-import.test.ts` imports, and the
 * two things a dump cannot supply for itself: the designator-to-footprint map
 * and the reference netlist.
 *
 * **IT IS NOT A `.test.ts` FILE**, following `./grade-fixtures.ts` and
 * `./score-fixtures.ts`: two test files read this table, and a third thing that
 * builds dumps by hand lives here too so that the refusal tests do not each
 * respell the grammar.
 *
 * **WHERE EACH BOARD'S FOOTPRINT MAP COMES FROM, and why it is not one source.**
 * The frozen low-boost has a committed `.footprints.json`, because the EESchema
 * v1.1 export it is frozen against cannot carry a footprint at all. The other
 * boards' footprints come from their own committed KiCad export under
 * `tests/fixtures/`, read through `importNetlist` - the same file
 * `boards/<board>/perfboard.json` names. Nothing is transcribed here: a
 * footprint name typed into this file would be the third one this repository
 * shipped that does not exist.
 *
 * `pultec-low-boost-imported` has no footprint map of its own in any
 * vocabulary - its refs are the synthetic ones an `--import` run invents
 * (`SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`) - so it is given the frozen board's map,
 * which covers its eight real designators and none of the rest. That is stated
 * rather than hidden, and the board refuses before the gap is reached.
 */
import fs from "node:fs"
import path from "node:path"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { referenceNetsFromExport, type ReferenceNets } from "../../tools/stripboard/equivalence.ts"

const REPO = path.join(import.meta.dir, "..", "..")
const FIXTURES = path.join(REPO, "tests", "fixtures")
const STRIPBOARD = path.join(FIXTURES, "stripboard")

/** How a board's footprint map is obtained: a committed JSON map, or a netlist export. */
type FootprintSource =
  | { readonly kind: "json"; readonly file: string }
  | { readonly kind: "export"; readonly file: string }

export interface CommittedBoard {
  readonly name: string
  readonly dump: string
  readonly footprints: FootprintSource
  /** The netlist export this board's layout was built against. */
  readonly reference: string
}

export const COMMITTED_BOARDS: readonly CommittedBoard[] = [
  {
    name: "pt2399-core",
    dump: path.join(STRIPBOARD, "pt2399-core.dump"),
    footprints: { kind: "export", file: path.join(FIXTURES, "pt2399-core.net") },
    // The VeroRoute-flavoured export is this board's reference, exactly as
    // tests/stripboard/agreement.test.ts and provenance.txt have it.
    reference: path.join(FIXTURES, "pt2399-core-veroroute.net"),
  },
  {
    name: "pultec-low-boost-frozen",
    dump: path.join(STRIPBOARD, "pultec-low-boost-frozen.dump"),
    footprints: { kind: "json", file: path.join(STRIPBOARD, "pultec-low-boost-frozen.footprints.json") },
    reference: path.join(STRIPBOARD, "pultec-low-boost-frozen.netlist"),
  },
  {
    name: "pultec-low-boost-imported",
    dump: path.join(STRIPBOARD, "pultec-low-boost-imported.dump"),
    footprints: { kind: "json", file: path.join(STRIPBOARD, "pultec-low-boost-frozen.footprints.json") },
    reference: path.join(STRIPBOARD, "pultec-low-boost-frozen.netlist"),
  },
  {
    name: "transistor-preamp-buffered",
    dump: path.join(STRIPBOARD, "transistor-preamp-buffered.dump"),
    footprints: { kind: "export", file: path.join(FIXTURES, "transistor-preamp-buffered.net") },
    reference: path.join(FIXTURES, "transistor-preamp-buffered.net"),
  },
  {
    name: "transistor-preamp-feedback",
    dump: path.join(STRIPBOARD, "transistor-preamp-feedback.dump"),
    footprints: { kind: "export", file: path.join(FIXTURES, "transistor-preamp-feedback.net") },
    reference: path.join(FIXTURES, "transistor-preamp-feedback.net"),
  },
  {
    name: "transistor-preamp-loop",
    dump: path.join(STRIPBOARD, "transistor-preamp-loop.dump"),
    footprints: { kind: "export", file: path.join(FIXTURES, "transistor-preamp-loop.net") },
    reference: path.join(FIXTURES, "transistor-preamp-loop.net"),
  },
  {
    name: "transistor-preamp-staged",
    dump: path.join(STRIPBOARD, "transistor-preamp-staged.dump"),
    footprints: { kind: "export", file: path.join(FIXTURES, "transistor-preamp-staged.net") },
    reference: path.join(FIXTURES, "transistor-preamp-staged.net"),
  },
]

export function dumpTextOf(board: CommittedBoard): string {
  return fs.readFileSync(board.dump, "utf8")
}

export function referenceOf(board: CommittedBoard): ReferenceNets {
  return referenceNetsFromExport(fs.readFileSync(board.reference, "utf8"))
}

/** A board's designator-to-footprint map, from whichever of the two sources it has. */
export function footprintsOf(board: CommittedBoard): ReadonlyMap<string, string> {
  const text = fs.readFileSync(board.footprints.file, "utf8")
  const map = new Map<string, string>()
  if (board.footprints.kind === "export") {
    for (const component of importNetlist(text).components) {
      if (component.footprint !== undefined) map.set(component.designator, component.footprint)
    }
    return map
  }
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${board.footprints.file}: expected an object mapping designator to footprint`)
  }
  for (const [ref, footprint] of Object.entries(parsed)) {
    if (typeof footprint !== "string") {
      throw new Error(`${board.footprints.file}: "${ref}" must name a footprint string`)
    }
    map.set(ref, footprint)
  }
  return map
}

/** The message a call refused with, or "" when it did not refuse. */
export function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/**
 * A dump built from parts, for the refusals no committed board exercises.
 *
 * **IT IS A BUILDER AND NOT A STORED FILE** for the reason
 * `./grade-fixtures.ts` gives for its span fixtures: a stored dump bakes the
 * offending figure into a file whose name says something else, and the three it
 * replaced were wrong about what they contained. Each case below says in one
 * line what it is wrong about. The three lines the pinned fork always emits -
 * `GRID`, `VERTICAL_STRIPS`, `CUT_STATE` - are always present, because
 * `parseBoardDump` refuses without them and that refusal is its own, not this
 * importer's.
 */
export function syntheticDump(options: {
  readonly lines: readonly string[]
  readonly rows?: number
  readonly cols?: number
  readonly verticalStrips?: boolean
}): string {
  return [
    `GRID ${options.rows ?? 12} ${options.cols ?? 12}`,
    `VERTICAL_STRIPS ${options.verticalStrips === true ? 1 : 0}`,
    "CUT_STATE COMPUTED",
    ...options.lines,
  ].join("\n")
}

/** The reference nets a synthetic dump is read against, built the same way. */
export function syntheticReference(nets: Record<string, readonly string[]>): ReferenceNets {
  return new Map(Object.entries(nets))
}
