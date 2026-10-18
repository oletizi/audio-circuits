/**
 * Task 4: the junction table gains a row per landing pad.
 *
 * `buildChecklist` used to build every "Wire-to-board junctions" row from
 * `dump.parts`, and a landing pad has no `PART` line (`./pads.ts`'s module
 * comment). On `boards/pultec-low-boost` that meant the layout image drew
 * ten solder rings while the printed table carried only the two header
 * rows that DO have `PART` lines - one packet, two artifacts disagreeing
 * about whether ten terminals exist.
 *
 * This test runs the real pipeline against the real, committed low-boost
 * board - the same veroroute binary and circuit loader `make guide` uses -
 * rather than a hand-written fixture, because the premise being asserted
 * ("low-boost has ten off-board terminals") is a fact about that board, not
 * about a fixture this file could quietly drift from it.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { runnerFor } from "../../tools/perfboard/verbs.ts"
import { buildChecklist } from "../../tools/guide/checklist.ts"
import { assertLayoutMatchesCircuit, componentAt, loadBoardCircuit } from "../../tools/guide/circuit.ts"
import { nodeMembers } from "../../tools/guide/node-members.ts"
import { offBoardLabels } from "../../tools/guide/off-board.ts"
import { padLabelOf } from "../../tools/guide/pad-label.ts"
import { padTerminals } from "../../tools/guide/pads.ts"
import { buildableDump } from "../../tools/guide/preflight.ts"

const REPO_ROOT = moduleRepoRoot()
const DECLARATION = loadDeclaration(path.join(REPO_ROOT, "boards", "pultec-low-boost", "perfboard.json"))

/** Dump the real board through the real, pinned veroroute binary. */
function dumpLowBoost(): string {
  const run = runnerFor({})(["--dump-board", DECLARATION.vrtPath])
  if (run.status !== 0) {
    throw new Error(`veroroute --dump-board ${DECLARATION.vrtPath} exited ${run.status}:\n${run.output}`)
  }
  return run.output
}

test("every off-board terminal on pultec-low-boost gets a junction row naming its wire", async () => {
  const dumpText = dumpLowBoost()
  const dump = buildableDump(dumpText, DECLARATION.vrtPath)
  const pads = padTerminals(dumpText)
  const circuit = await loadBoardCircuit(DECLARATION)
  assertLayoutMatchesCircuit(dump, circuit, pads)
  const edges = offBoardLabels(circuit)
  const padLabels = new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)]))
  const members = nodeMembers(dumpText)

  // THE PREMISE, asserted before the count that depends on it: a board that
  // silently lost its pads (an empty `pads` list) must not be able to pass
  // the row-count assertion below by having zero of each.
  expect(pads.length, "the premise: low-boost has ten off-board terminals").toBe(10)

  const junctions = buildChecklist(dump, circuit, edges, pads, padLabels, members).find(
    (section) => section.title === "Wire-to-board junctions",
  )
  if (junctions === undefined) throw new Error("buildChecklist produced no Wire-to-board junctions section")

  expect(junctions.rows.length, "one row per terminal, plus the two existing header rows").toBe(12)
  // THE ROW SAYS WHAT THE WIRE IS, not only where it lands: the label
  // `padLabelOf` gives this terminal must be readable in its own row.
  expect(junctions.rows.some((row) => row.some((cell) => cell.includes("LO BOOST 60Hz")))).toBe(true)
})
