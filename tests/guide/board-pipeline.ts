/**
 * The pipeline `make guide` runs, for tests that need a REAL board: the
 * committed `.vrt` dumped through the real, pinned veroroute binary, the
 * board's own circuit module, and the checklist built from the two.
 *
 * **SHARED, BECAUSE TWO TESTS ASK THE SAME QUESTION OF THE SAME BOARDS.**
 * `tests/guide/fit-condition.test.ts` checks what the `Fit` column says on
 * every row; `tests/guide/stand-in-section.test.ts` checks that the stand-in
 * groups section names the same conditions those rows carry. A second copy of
 * this loader would let the two load the board two slightly different ways and
 * then disagree about what the packet says - which is the defect class both
 * tests exist to catch, reproduced in the tests themselves.
 *
 * Nothing here is a fixture: every board it loads is one on disk, and a board
 * whose layout and circuit have drifted apart is refused by
 * `assertLayoutMatchesCircuit` rather than loaded in a half state.
 */
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { runnerFor } from "../../tools/perfboard/verbs.ts"
import { buildChecklist, type ChecklistSection } from "../../tools/guide/checklist.ts"
import { assertLayoutMatchesCircuit, componentAt, loadBoardCircuit, type BoardCircuit } from "../../tools/guide/circuit.ts"
import { type BoardDump } from "../../tools/guide/dump.ts"
import { nodeMembers } from "../../tools/guide/node-members.ts"
import { offBoardLabels } from "../../tools/guide/off-board.ts"
import { padLabelOf } from "../../tools/guide/pad-label.ts"
import { padTerminals, type PadTerminal } from "../../tools/guide/pads.ts"
import { buildableDump } from "../../tools/guide/preflight.ts"

const REPO_ROOT = moduleRepoRoot()

/** The four part sections the Fit column belongs on. */
export const PART_SECTION_TITLES = [
  "ICs and transistors",
  "Resistors and trim-pots",
  "Capacitors",
  "Wire-to-board junctions",
]

/**
 * Every section that carries a `Fit` column: the four part sections, plus
 * Wire links (it carries zero-ohm stand-in parts - see
 * `tools/guide/checklist.ts`'s module comment). Solder bridges and Cuts are
 * deliberately excluded: nothing has moved into them, and they have no group
 * to belong to.
 */
export const FIT_SECTION_TITLES = [...PART_SECTION_TITLES, "Wire links"]

/** Dump a board's real, committed `.vrt` through the real, pinned veroroute binary. */
function dumpBoard(vrtPath: string): string {
  const run = runnerFor({})(["--dump-board", vrtPath])
  if (run.status !== 0) {
    throw new Error(`veroroute --dump-board ${vrtPath} exited ${run.status}:\n${run.output}`)
  }
  return run.output
}

export interface Loaded {
  readonly dump: BoardDump
  readonly pads: readonly PadTerminal[]
  readonly circuit: BoardCircuit
  readonly checklist: readonly ChecklistSection[]
}

/** Load a board's real layout and circuit, and build its checklist - the pipeline `make guide` runs. */
export async function loadBoard(boardName: string): Promise<Loaded> {
  const declaration = loadDeclaration(path.join(REPO_ROOT, "boards", boardName, "perfboard.json"))
  const dumpText = dumpBoard(declaration.vrtPath)
  const dump = buildableDump(dumpText, declaration.vrtPath)
  const pads = padTerminals(dumpText)
  const circuit = await loadBoardCircuit(declaration)
  assertLayoutMatchesCircuit(dump, circuit, pads)
  const edges = offBoardLabels(circuit)
  const padLabels = new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)]))
  const members = nodeMembers(dumpText)
  const checklist = buildChecklist(dump, circuit, edges, pads, padLabels, members)
  return { dump, pads, circuit, checklist }
}

/** The named sections, in order, refusing if any is missing - never a silent partial list. */
export function sectionsNamed(
  checklist: readonly ChecklistSection[],
  titles: readonly string[],
): readonly ChecklistSection[] {
  const sections = checklist.filter((section) => titles.includes(section.title))
  if (sections.length !== titles.length) {
    throw new Error(
      `test: expected sections (${titles.join(", ")}), got (${sections.map((section) => section.title).join(", ")})`,
    )
  }
  return sections
}
