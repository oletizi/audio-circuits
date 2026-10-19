/**
 * Task 4: every row in the checklist's four part sections (ICs and
 * transistors; Resistors and trim-pots; Capacitors; Wire-to-board junctions)
 * carries a `Fit` cell saying whether to fit it in the build being built -
 * `always` for a part in the board's own circuit, `only with the <section>
 * group` for a stand-in that belongs to that absent section's group - rather
 * than the same printed checkbox on every row regardless of which parts the
 * build actually needs.
 *
 * **FIX ROUND 1: WIRE LINKS GETS THE COLUMN TOO.** A zero-ohm stand-in part
 * is routed into the **Wire links** section (`./checklist.ts`'s module
 * comment), and it is exactly as conditional there as it would be in its own
 * part section - so the first version of this test, which asserted Wire
 * links carried no `Fit` column, was asserting the exact defect the whole
 * plan exists to remove: on `pultec-low-boost`, three of its rows ARE
 * conditional stand-ins and the table said nothing about it. A `W`-numbered
 * wire row is never conditional (it is this board's own layout, not a
 * stand-in) and reads `always`; a zero-ohm stand-in row reads `only with the
 * <section> group`, from the SAME `fitCondition` derivation the part
 * sections use.
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
import { isZeroOhmResistor } from "../../lib/model/zero-ohm.ts"
import { componentAt } from "../../tools/guide/circuit.ts"
import { ALWAYS } from "../../tools/guide/fit-condition.ts"
// THE LOADER AND THE SECTION TITLES ARE SHARED, not local to this file:
// `tests/guide/stand-in-section.test.ts` asks the same question of the same
// boards, and two copies of this pipeline could load a board two ways and
// disagree about what the packet says. See `./board-pipeline.ts`.
import { FIT_SECTION_TITLES, PART_SECTION_TITLES, loadBoard, sectionsNamed } from "./board-pipeline.ts"

test("every stand-in part on pultec-low-boost names its own group, in its own section AND in Wire links; every other row reads always", async () => {
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

  // Which absent section each stand-in id belongs to, derived from the doc -
  // never a hardcoded list of names or sections.
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

  // Every section that carries a Fit column - the four part sections AND
  // Wire links (fix round 1) - gets walked by the SAME loop: a W-numbered
  // wire row's ref is never a key of standInRefs, so it falls into the
  // "always" branch exactly like a board's own resistor or capacitor would.
  // Nothing here special-cases Wire links; the one loop is the proof that
  // the same rule governs every row that carries the column.
  let standInRowCount = 0
  for (const section of sectionsNamed(checklist, FIT_SECTION_TITLES)) {
    expect(section.columns.at(-1), `"${section.title}"'s last column is Fit`).toBe("Fit")
    for (const row of section.rows) {
      const ref = row[0]
      const fit = row.at(-1)
      if (ref === undefined || fit === undefined) {
        throw new Error(`test: a row in "${section.title}" is too short to carry a Part and a Fit cell: ${row}`)
      }
      const standInSection = standInRefs.get(ref)
      if (standInSection === undefined) {
        expect(fit, `${ref} (in "${section.title}") is not a stand-in part; its Fit cell reads "always"`).toBe(ALWAYS)
        continue
      }
      standInRowCount += 1
      expect(
        fit,
        `${ref} (in "${section.title}") names its own group ("${standInSection}")`,
      ).toBe(`only with the ${standInSection} group`)
    }
  }
  // EVERY STAND-IN IS ACCOUNTED FOR EXACTLY ONCE, wherever its row landed -
  // its own part section or Wire links (a zero-ohm stand-in). A stand-in
  // silently missing from every Fit-bearing section, or counted twice,
  // would move this number away from the premise's own count.
  expect(standInRowCount, "every one of the eight stand-ins carries a condition, and nothing else does").toBe(8)
})

test("W-numbered wire rows in Wire links read always; zero-ohm stand-in rows there read their own group", async () => {
  const { circuit, checklist } = await loadBoard("pultec-low-boost")
  const scaffold = circuit.scaffold
  if (scaffold === undefined) throw new Error("low-boost declares SCAFFOLD; the guide did not load it")

  const wireLinks = checklist.find((candidate) => candidate.title === "Wire links")
  if (wireLinks === undefined) throw new Error('buildChecklist produced no "Wire links" section')
  expect(wireLinks.columns, '"Wire links" carries the Fit column').toEqual(["Wire", "From", "To", "Fit"])

  // THE PREMISE: at least one W-numbered row and at least one designator
  // (zero-ohm stand-in) row, so the two branches below are each exercised -
  // a board that lost one kind would otherwise pass this test vacuously.
  const wNumbered = wireLinks.rows.filter((row) => /^W\d+$/.test(row[0] ?? ""))
  const designatorRows = wireLinks.rows.filter((row) => !/^W\d+$/.test(row[0] ?? ""))
  expect(wNumbered.length > 0, "at least one W-numbered wire row").toBe(true)
  expect(designatorRows.length > 0, "at least one zero-ohm stand-in row").toBe(true)

  for (const row of wNumbered) {
    expect(row.at(-1), `${row[0]} is this board's own layout, never conditional`).toBe(ALWAYS)
  }

  // Each designator row's expected condition is DERIVED from the
  // ScaffoldDoc's own groups, not listed: a stand-in id that is not a
  // designator row's ref is skipped by `sectionOf.get` returning undefined,
  // which the loop below treats as a hard failure rather than a silent pass.
  const sectionOf = new Map<string, string>()
  for (const group of scaffold.groups) {
    for (const partId of group.partIds) sectionOf.set(partId, group.section)
  }
  for (const row of designatorRows) {
    const ref = row[0]
    if (ref === undefined) throw new Error("test: a Wire links row has no ref cell")
    const component = componentAt(circuit, ref)
    expect(isZeroOhmResistor(component), `${ref} is in Wire links by designator, so it must be zero-ohm`).toBe(true)
    const section = sectionOf.get(component.id)
    if (section === undefined) {
      throw new Error(
        `test: ${ref} ("${component.id}") is a zero-ohm Wire links row but is not a member of any group in ` +
          "low-boost's own ScaffoldDoc - the premise this test depends on does not hold for this part.",
      )
    }
    expect(row.at(-1), `${ref}'s Fit cell names its own group ("${section}")`).toBe(`only with the ${section} group`)
  }
})

test("Solder bridges and Cuts carry no Fit column - nothing has moved into them", async () => {
  const { checklist } = await loadBoard("pultec-low-boost")
  for (const title of ["Solder bridges", "Cuts"]) {
    const section = checklist.find((candidate) => candidate.title === title)
    if (section === undefined) throw new Error(`buildChecklist produced no "${title}" section`)
    expect(section.columns.includes("Fit"), `"${title}" has no group to belong to, so no Fit column`).toBe(false)
  }
})

test("a board with no ScaffoldDoc still gets the Fit column, every row reading always", async () => {
  const { circuit, checklist } = await loadBoard("pt2399-core")
  expect(circuit.scaffold, "pt2399-core declares no SCAFFOLD - it is not a Pultec section").toBeUndefined()

  for (const section of sectionsNamed(checklist, FIT_SECTION_TITLES)) {
    expect(section.columns.at(-1), `"${section.title}"'s last column is Fit`).toBe("Fit")
    for (const row of section.rows) {
      const fit = row.at(-1)
      if (fit === undefined) throw new Error(`test: a row in "${section.title}" has no Fit cell: ${row}`)
      expect(fit, `${row[0]}'s Fit cell reads "always" - this board has no group to be absent from`).toBe(ALWAYS)
    }
  }
})
