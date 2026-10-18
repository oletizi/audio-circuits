/**
 * The Cuts table's `Separates` column names what a cut separates in the
 * circuit's own terms - the parts and pad terminals on each of its two nodes
 * - never the net's internal name (`j10_p1`, `si_hi_boost_j20_p3`, ...),
 * which tells a builder at a bench nothing. `docs/known-gaps.md`'s G36,
 * deleted by this change, named the defect; the owner's recommendation
 * (naming the parts a cut separates, never the net alongside them) is what
 * this file asserts.
 *
 * The main assertions run the real pipeline against the real, committed
 * `boards/pultec-low-boost` through the real pinned veroroute binary - the
 * same shape `tests/guide/junction-pad-rows.test.ts` uses, and for the same
 * reason: the premise being asserted ("this cut separates these parts") is a
 * fact about that board, not about a fixture that could drift from it.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { runnerFor } from "../../tools/perfboard/verbs.ts"
import { buildChecklist } from "../../tools/guide/checklist.ts"
import { assertLayoutMatchesCircuit, componentAt, loadBoardCircuit } from "../../tools/guide/circuit.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { nodeMembers } from "../../tools/guide/node-members.ts"
import { offBoardLabels } from "../../tools/guide/off-board.ts"
import { padLabelOf } from "../../tools/guide/pad-label.ts"
import { padTerminals } from "../../tools/guide/pads.ts"
import { buildableDump } from "../../tools/guide/preflight.ts"
import { DUMP_TEXT, fixtureCircuit } from "./fixture.ts"

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

const GENERATED_LADDER_NAMES = [
  "j10_p1", "j10_p2", "j10_p3", "j10_p4", "si_hi_boost_j20_p3", "si_hi_cut_j12_p3",
]

test("pultec-low-boost's Cuts section names what each cut separates, never the net name", async () => {
  const dumpText = dumpLowBoost()
  const dump = buildableDump(dumpText, DECLARATION.vrtPath)
  const pads = padTerminals(dumpText)
  const circuit = await loadBoardCircuit(DECLARATION)
  assertLayoutMatchesCircuit(dump, circuit, pads)
  const edges = offBoardLabels(circuit)
  const padLabels = new Map(pads.map((pad) => [pad.identity, padLabelOf(componentAt(circuit, pad.ref), pad.pin)]))
  const members = nodeMembers(dumpText)

  // THE PREMISE, asserted before anything that depends on it: a board that
  // silently lost its cuts must not pass the assertions below by having
  // zero of everything.
  expect(dump.cuts.length, "the premise: low-boost has four cuts").toBe(4)

  const cuts = buildChecklist(dump, circuit, edges, pads, padLabels, members).find(
    (section) => section.title === "Cuts",
  )
  if (cuts === undefined) throw new Error("buildChecklist produced no Cuts section")
  expect(cuts.rows.length).toBe(4)

  const separatesCells = cuts.rows.map((row) => row[2])

  // THE DEFECT, NAMED: no cell may carry a generated ladder net name.
  for (const name of GENERATED_LADDER_NAMES) {
    expect(separatesCells.some((cell) => (cell ?? "").includes(name)), `no cell should contain "${name}"`).toBe(
      false,
    )
  }

  // THE CUT BETWEEN j10_p1 AND j10_p2 (node 2 and node 3, CUT 10,3,2 10,4,3
  // in the committed dump) must name C18.2 and C19.2, and the two pad
  // terminals (SW_LO_BOOST.2, SW_LO_BOOST.3) by their LABEL, not by their raw
  // netlist identity. The labels are computed through `padLabelOf`, the same
  // function `packet.ts` uses to build `padLabels`, rather than guessed at
  // here.
  const swLoBoost2Component = componentAt(circuit, "SW_LO_BOOST")
  const label2 = padLabelOf(swLoBoost2Component, "2")
  const label3 = padLabelOf(swLoBoost2Component, "3")

  const j10Row = cuts.rows.find((row) => row[2]?.includes("C18.2") || row[2]?.includes("C19.2"))
  if (j10Row === undefined) throw new Error("no Cuts row named C18.2 or C19.2")
  const cell = j10Row[2] ?? ""
  expect(cell).toContain("C18.2")
  expect(cell).toContain("C19.2")
  expect(cell).toContain(label2)
  expect(cell).toContain(label3)
  // The raw pad identities must be ABSENT: a label that silently fell back
  // to the netlist id must fail this test.
  expect(cell).not.toContain("SW_LO_BOOST.2")
  expect(cell).not.toContain("SW_LO_BOOST.3")
})

test("a cut whose node has no NODE line is refused, naming the hole and the node id", () => {
  // Node 99 has no NODE line at all in this hand-written dump - the fixture's
  // own cuts and NODE lines are left alone and a third, unresolvable cut is
  // added. `nodeMembers` is read off the SAME text the dump was parsed from,
  // exactly as `packet.ts` does, so the fixture's real nodes (1-4) resolve
  // correctly and only node 99 is missing.
  const dumpText = `${DUMP_TEXT}CUT 0,0,99 0,1,99\n`
  const dump = parseBoardDump(dumpText)
  const circuit = fixtureCircuit()
  const edges = offBoardLabels(circuit)
  const members = nodeMembers(dumpText)
  expect(() => buildChecklist(dump, circuit, edges, [], new Map(), members)).toThrow(/node 99/)
})

test("a cut whose node has a NODE line with zero members is refused, naming the hole and the node id", () => {
  // Node 98 has a NODE line, but no members follow its NAME field.
  const dumpText = `${DUMP_TEXT}NODE 98 NAME ladder_mystery\nCUT 0,0,98 0,1,98\n`
  const dump = parseBoardDump(dumpText)
  const circuit = fixtureCircuit()
  const edges = offBoardLabels(circuit)
  const members = nodeMembers(dumpText)
  expect(() => buildChecklist(dump, circuit, edges, [], new Map(), members)).toThrow(/node 98/)
})
