/**
 * Task 4: every row in the checklist's four part sections (ICs and
 * transistors; Resistors and trim-pots; Capacitors; Wire-to-board junctions)
 * carries a `Fit` cell saying whether to fit it in the build being built -
 * `always` for a part in the board's own circuit, `only with the <section>
 * group` for a stand-in that belongs to that absent section's group - rather
 * than the same printed checkbox on every row regardless of which parts the
 * build actually needs.
 *
 * WHY THE REAL BOARD. The premise - which parts on `pultec-low-boost` are
 * stand-ins, and for which absent section - is a fact about that board's
 * `ScaffoldDoc`, read through the real pinned veroroute binary the same way
 * `tests/guide/junction-pad-rows.test.ts` and
 * `tests/guide/zero-ohm-is-a-wire-link.test.ts` do. The expected stand-in set
 * is DERIVED from the doc itself, never a hardcoded list of part names, so a
 * board whose scaffold silently changed shape would fail here rather than
 * pass by coincidence.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { isZeroOhmResistor } from "../../lib/model/zero-ohm.ts"
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

/** The four part sections the Fit column belongs on - nothing else gets it. */
const PART_SECTION_TITLES = ["ICs and transistors", "Resistors and trim-pots", "Capacitors", "Wire-to-board junctions"]

/** Dump a board's real, committed `.vrt` through the real, pinned veroroute binary. */
function dumpBoard(vrtPath: string): string {
  const run = runnerFor({})(["--dump-board", vrtPath])
  if (run.status !== 0) {
    throw new Error(`veroroute --dump-board ${vrtPath} exited ${run.status}:\n${run.output}`)
  }
  return run.output
}

interface Loaded {
  readonly dump: BoardDump
  readonly pads: readonly PadTerminal[]
  readonly circuit: BoardCircuit
  readonly checklist: readonly ChecklistSection[]
}

/** Load a board's real layout and circuit, and build its checklist - the pipeline `make guide` runs. */
async function loadBoard(boardName: string): Promise<Loaded> {
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

function partSections(checklist: readonly ChecklistSection[]): readonly ChecklistSection[] {
  const sections = checklist.filter((section) => PART_SECTION_TITLES.includes(section.title))
  if (sections.length !== PART_SECTION_TITLES.length) {
    throw new Error(
      `test: expected the four part sections (${PART_SECTION_TITLES.join(", ")}), got ` +
        `${sections.map((section) => section.title).join(", ")}`,
    )
  }
  return sections
}

test("every stand-in part on pultec-low-boost names its own group; every other part row reads always", async () => {
  const { circuit, checklist } = await loadBoard("pultec-low-boost")
  const scaffold = circuit.scaffold
  if (scaffold === undefined) throw new Error("low-boost declares SCAFFOLD; the guide did not load it")

  // THE PREMISE, before any assertion that rests on it: a group for each of
  // the other four Pultec sections, and eight stand-in parts in total -
  // matching tests/guide/scaffold-loading.test.ts's own premise for this
  // board. A scaffold that silently arrived empty must not pass the rest of
  // this test by having zero of everything to check.
  expect(scaffold.groups.length, "a group for each of the other four sections").toBe(4)
  const standInIds = scaffold.groups.flatMap((group) => group.partIds)
  expect(standInIds.length, "eight stand-in parts").toBe(8)

  // Which absent section each stand-in id belongs to, derived from the doc.
  const sectionOf = new Map<string, string>()
  for (const group of scaffold.groups) {
    for (const partId of group.partIds) sectionOf.set(partId, group.section)
  }

  // The stand-in ids, as the designators they carry on THIS board - derived
  // from the circuit's own id -> ref index, never written out by hand.
  const designatorOf = new Map<string, string>()
  for (const [ref, component] of circuit.byRef) designatorOf.set(component.id, ref)
  const standInRefs = new Map<string, string>()
  for (const id of standInIds) {
    const ref = designatorOf.get(id)
    if (ref === undefined) {
      throw new Error(`test: stand-in part "${id}" (from the ScaffoldDoc) has no designator on low-boost`)
    }
    const section = sectionOf.get(id)
    if (section === undefined) throw new Error(`internal: "${id}" was read from sectionOf's own keys`)
    standInRefs.set(ref, section)
  }
  expect(standInRefs.size, "every stand-in id resolves to a distinct designator").toBe(8)

  // A STAND-IN THAT RESOLVES TO 0 Ω IS A WIRE LINK, NOT A PART ROW - the
  // existing routing in buildChecklist (a task two commits before this one)
  // sends it to the Wire links section before any part row, Fit cell
  // included, is built for it. So the part sections carry a Fit cell for
  // only the stand-ins that are NOT zero-ohm; this count is derived from the
  // circuit's own components, never hardcoded, so a board whose zero-ohm
  // split changed would move this expectation with it.
  const zeroOhmStandInRefs = new Set(
    [...standInRefs.keys()].filter((ref) => isZeroOhmResistor(componentAt(circuit, ref))),
  )
  const expectedConditionCount = standInRefs.size - zeroOhmStandInRefs.size

  let standInRowCount = 0
  const seenRefs = new Set<string>()
  for (const section of partSections(checklist)) {
    expect(section.columns.at(-1), `"${section.title}"'s last column is Fit`).toBe("Fit")
    for (const row of section.rows) {
      const ref = row[0]
      const fit = row.at(-1)
      if (ref === undefined || fit === undefined) {
        throw new Error(`test: a row in "${section.title}" is too short to carry a Part and a Fit cell: ${row}`)
      }
      seenRefs.add(ref)
      const standInSection = standInRefs.get(ref)
      if (standInSection === undefined) {
        expect(fit, `${ref} is not a stand-in part; its Fit cell reads "always"`).toBe("always")
        continue
      }
      standInRowCount += 1
      expect(fit, `${ref}'s Fit cell names its own group ("${standInSection}")`).toBe(`only with the ${standInSection} group`)
    }
  }
  expect(
    standInRowCount,
    "every non-zero-ohm stand-in carries a condition, and nothing else does",
  ).toBe(expectedConditionCount)

  // THE ZERO-OHM STAND-INS ARE NOT MISSING - they are Wire links rows, which
  // this test does not give a Fit cell because the rule (§1 above) says
  // Wire links never get one. Confirm they are still accounted for there,
  // rather than merely absent from the part sections for some other reason.
  const wireLinks = checklist.find((candidate) => candidate.title === "Wire links")
  if (wireLinks === undefined) throw new Error('buildChecklist produced no "Wire links" section')
  for (const ref of zeroOhmStandInRefs) {
    expect(
      wireLinks.rows.some((row) => row[0] === ref),
      `${ref} (a zero-ohm stand-in) is a Wire links row, not a part row`,
    ).toBe(true)
  }
})

test("Wire links, Solder bridges and Cuts carry no Fit column - they are not parts", async () => {
  const { checklist } = await loadBoard("pultec-low-boost")
  for (const title of ["Wire links", "Solder bridges", "Cuts"]) {
    const section = checklist.find((candidate) => candidate.title === title)
    if (section === undefined) throw new Error(`buildChecklist produced no "${title}" section`)
    expect(section.columns.includes("Fit"), `"${title}" has no group to belong to, so no Fit column`).toBe(false)
  }
})

test("a board with no ScaffoldDoc still gets the Fit column, every row reading always", async () => {
  const { circuit, checklist } = await loadBoard("pt2399-core")
  expect(circuit.scaffold, "pt2399-core declares no SCAFFOLD - it is not a Pultec section").toBeUndefined()

  for (const section of partSections(checklist)) {
    expect(section.columns.at(-1), `"${section.title}"'s last column is Fit`).toBe("Fit")
    for (const row of section.rows) {
      const fit = row.at(-1)
      if (fit === undefined) throw new Error(`test: a row in "${section.title}" has no Fit cell: ${row}`)
      expect(fit, `${row[0]}'s Fit cell reads "always" - this board has no group to be absent from`).toBe("always")
    }
  }
})
