/**
 * **EVERY `SchematicAuthoring` DECLARATION IN THIS REPOSITORY THAT IS A BOARD UNDER `boards/`,
 * beside the four parity circuits** - so `./board-sheets.ts` can offer each of the eleven boards
 * to `generate` instead of reporting nine of them as having no declaration at all.
 *
 * **WHY A SECOND LIST AND NOT NINE MORE ENTRIES IN `PARITY_CIRCUITS`.** That list is what the M1
 * plan calls the parity set: four circuits, each measured against the pedals repository's own
 * figures. Nine more entries in it would change the subject of every tool and test that reads it
 * - `tools/schgen/parity.ts`, `symbol-census.ts`, `remeasure-*.ts`, `gate-census.ts`,
 * `tests/schgen/authoring-complete.test.ts` and six more - without any of them saying so, and
 * `docs/known-gaps.md` **G246** is this branch's record of what a quiet change of subject costs.
 * The parity set is unchanged and `PARITY_CASES` still holds exactly four.
 *
 * **THE ENTRY IS THE BUILDER, AND THAT IS LOAD-BEARING.** `./board-sheets.ts`'s `declarationFor`
 * matches `perfboard.json`'s `export` field against `ParityCase.entry`, which is the whole of
 * **G247**'s distinction: `circuits/transistor-preamp/` holds five board builders, and matching on
 * the circuit DIRECTORY would report four boards as declared that nothing declares. So an entry
 * here is wrong unless it is `<the exported builder>()` exactly.
 *
 * **IT REFUSES A DECLARATION WHOSE BUILDER IT CANNOT NAME**, for the reason `PARITY_CASES` refuses
 * a parity circuit with no declaration: a case that quietly drops out is a check that stopped
 * running without saying so.
 */

import { PULTEC_HI_BOOST_SCHEMATIC } from "../../circuits/pultec/schematic/hi-boost.ts"
import { PULTEC_HI_CUT_SCHEMATIC } from "../../circuits/pultec/schematic/hi-cut.ts"
import { PULTEC_LOW_BOOST_SCHEMATIC } from "../../circuits/pultec/schematic/low-boost.ts"
import { PULTEC_LOW_CUT_SCHEMATIC } from "../../circuits/pultec/schematic/low-cut.ts"
import { PULTEC_MID_SCHEMATIC } from "../../circuits/pultec/schematic/mid.ts"
import { pultecHiBoost } from "../../circuits/pultec/physical/hi-boost.ts"
import { pultecHiCut } from "../../circuits/pultec/physical/hi-cut.ts"
import { pultecLowBoost } from "../../circuits/pultec/physical/low-boost.ts"
import { pultecLowCut } from "../../circuits/pultec/physical/low-cut.ts"
import { pultecMid } from "../../circuits/pultec/physical/mid.ts"
import { TRANSISTOR_PREAMP_BUFFERED_SCHEMATIC } from "../../circuits/transistor-preamp/schematic/buffered-board.ts"
import { TRANSISTOR_PREAMP_FEEDBACK_SCHEMATIC } from "../../circuits/transistor-preamp/schematic/feedback-board.ts"
import { TRANSISTOR_PREAMP_LOOP_SCHEMATIC } from "../../circuits/transistor-preamp/schematic/loop-board.ts"
import { TRANSISTOR_PREAMP_STAGED_SCHEMATIC } from "../../circuits/transistor-preamp/schematic/staged-board.ts"
import { transistorPreampBuffered } from "../../circuits/transistor-preamp/buffered-board.ts"
import { transistorPreampFeedback } from "../../circuits/transistor-preamp/feedback-board.ts"
import { transistorPreampLoop } from "../../circuits/transistor-preamp/loop-board.ts"
import { transistorPreampStaged } from "../../circuits/transistor-preamp/staged-board.ts"
import { PARITY_CASES, type ParityCase } from "./authoring-census.ts"
import type { SchematicAuthoring } from "../../lib/schgen/authoring.ts"
import type { Network } from "../../lib/model/types.ts"

/** One board declaration: the builder it is written against, and the declaration. */
interface BoardDeclaration {
  readonly name: string
  readonly entry: string
  readonly build: () => Network
  readonly authoring: SchematicAuthoring
}

const DECLARATIONS: readonly BoardDeclaration[] = [
  { name: "pultec-hi-boost", entry: "pultecHiBoost()", build: pultecHiBoost, authoring: PULTEC_HI_BOOST_SCHEMATIC },
  { name: "pultec-hi-cut", entry: "pultecHiCut()", build: pultecHiCut, authoring: PULTEC_HI_CUT_SCHEMATIC },
  { name: "pultec-low-boost", entry: "pultecLowBoost()", build: pultecLowBoost, authoring: PULTEC_LOW_BOOST_SCHEMATIC },
  { name: "pultec-low-cut", entry: "pultecLowCut()", build: pultecLowCut, authoring: PULTEC_LOW_CUT_SCHEMATIC },
  { name: "pultec-mid", entry: "pultecMid()", build: pultecMid, authoring: PULTEC_MID_SCHEMATIC },
  {
    name: "transistor-preamp-buffered",
    entry: "transistorPreampBuffered()",
    build: transistorPreampBuffered,
    authoring: TRANSISTOR_PREAMP_BUFFERED_SCHEMATIC,
  },
  {
    name: "transistor-preamp-feedback",
    entry: "transistorPreampFeedback()",
    build: transistorPreampFeedback,
    authoring: TRANSISTOR_PREAMP_FEEDBACK_SCHEMATIC,
  },
  {
    name: "transistor-preamp-loop",
    entry: "transistorPreampLoop()",
    build: transistorPreampLoop,
    authoring: TRANSISTOR_PREAMP_LOOP_SCHEMATIC,
  },
  {
    name: "transistor-preamp-staged",
    entry: "transistorPreampStaged()",
    build: transistorPreampStaged,
    authoring: TRANSISTOR_PREAMP_STAGED_SCHEMATIC,
  },
]

/** The nine board declarations that are not parity circuits, built, in declaration order. */
export const BOARD_CASES: readonly ParityCase[] = DECLARATIONS.map((d): ParityCase => {
  if (!/^[A-Za-z][A-Za-z0-9]*\(\)$/.test(d.entry)) {
    throw new Error(
      `the board declaration "${d.name}" has entry "${d.entry}", which is not a bare builder ` +
        "call of the form `name()`. tools/schgen/board-sheets.ts matches a board's " +
        "perfboard.json `export` field against this string exactly (docs/known-gaps.md G247), " +
        "so anything else makes the board report as having no declaration while one exists - " +
        "which is the inversion that census exists to make visible.",
    )
  }
  return { name: d.name, entry: d.entry, network: d.build(), authoring: d.authoring }
})

/**
 * Every declared case in the repository: the four parity circuits, then the nine boards.
 *
 * `pt2399-core` and `transistor-preamp` (the lab board) are parity circuits AND boards, so they
 * arrive through `PARITY_CASES` and are deliberately not repeated here.
 */
export const ALL_DECLARED_CASES: readonly ParityCase[] = [...PARITY_CASES, ...BOARD_CASES]
