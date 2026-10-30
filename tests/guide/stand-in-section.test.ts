/**
 * Task 5: the printed packet carries the stand-in groups section - which
 * positions on this board belong to which absent section, which of three
 * states this build puts each group in, and every build this board can be
 * part of.
 *
 * WHY THE REAL BOARD, AND WHY NOTHING HERE IS A LITERAL COUNT. The premise -
 * four groups, eight stand-in parts, sixteen builds on a five-section Pultec -
 * is a fact about `pultec-low-boost`'s own `ScaffoldDoc`, so it is read from
 * the doc and compared against the section built from it. **The build-row
 * count is asserted as `scaffold.builds.length`, never as `16`**: a literal
 * here would be a second statement of the same fact, free to drift from the
 * model the moment the derivation changes (and an earlier draft of the spec
 * stated it as 31, the count of non-empty combinations of five sections
 * globally, which is a different number about a different thing).
 *
 * Loading the doc needs no layout dump - `loadBoardCircuit` reads the board
 * module's own `SCAFFOLD` export - so these tests run without the veroroute
 * binary. Whether the Fit cells those group blocks name really appear on the
 * checklist's rows is `tests/guide/fit-condition.test.ts`'s subject, against
 * the real dump; what is checked here is that the two come from the one
 * `fitCondition` derivation rather than from two spellings of it.
 */
import { test, expect } from "bun:test"
import path from "node:path"
import { BUILD_COLUMNS } from "../../lib/board/scaffold/wiring.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { loadBoardCircuit } from "../../tools/guide/circuit.ts"
import { ALWAYS, fitCondition, groupMembership } from "../../tools/guide/fit-condition.ts"
import { buildGuideHtml, type GuideInput } from "../../tools/guide/guide.ts"
import { GUIDE_PAPER } from "../../tools/guide/paper.ts"
import {
  NO_GROUPS_DECLARED,
  NO_STAND_IN_GROUPS,
  standInSection,
} from "../../tools/guide/stand-in-section.ts"
import { escapeXml } from "../../tools/guide/svg.ts"
import { FIT_SECTION_TITLES, loadBoard, sectionsNamed } from "./board-pipeline.ts"
import type { ScaffoldDoc } from "../../lib/board/scaffold/doc.ts"

const REPO_ROOT = moduleRepoRoot()

/** The board module's own `SCAFFOLD`, loaded the way the guide loads it. */
async function scaffoldOf(boardName: string): Promise<ScaffoldDoc | undefined> {
  const declaration = loadDeclaration(path.join(REPO_ROOT, "boards", boardName, "perfboard.json"))
  return (await loadBoardCircuit(declaration)).scaffold
}

async function lowBoostScaffold(): Promise<ScaffoldDoc> {
  const scaffold = await scaffoldOf("pultec-low-boost")
  if (scaffold === undefined) throw new Error("low-boost declares SCAFFOLD; the guide did not load it")
  return scaffold
}

/**
 * The board's `wiring.md` as page one names it. The section's prose is handed
 * the same value page one is, so the two cannot disagree about whether there is
 * a sheet - see `tools/guide/stand-in-section.ts`'s `wiringSentence`, and the
 * last test in this file for the board that has none.
 */
const WIRING = "boards/test-board/wiring.md"

/** The whole packet, with everything but the stand-in section stubbed out. */
function guideHtml(scaffold: ScaffoldDoc | undefined, wiringPath: string | undefined): string {
  const input: GuideInput = {
    boardName: "test-board",
    generated: "2026-10-18",
    layoutPath: "boards/test-board/test.vrt",
    schematic: { kind: "printed", path: "circuits/test.kicad_sch" },
    images: { designators: "<svg>d</svg>", values: "<svg>v</svg>", copper: "<svg>c</svg>", clusters: undefined },
    checklist: [],
    powerUpChecks: undefined,
    wiringPath,
    scaffold,
    // Required beside a `"printed"` schematic - see `buildGuideHtml`'s guard.
    // The guide's own paper, so nothing in this file's subject is disturbed by
    // a paper notice.
    schematicPaper: GUIDE_PAPER,
  }
  return buildGuideHtml(input)
}

/**
 * The stand-in section's own markup, so no assertion here can be satisfied by
 * another section.
 *
 * `wiringPath` is REQUIRED rather than defaulted, and that is not a style
 * choice: a default parameter is applied when the argument is `undefined`, so a
 * defaulted one would quietly turn "this board has no wiring sheet" - the case
 * the last test in this file exists for - into the sheet's path.
 */
function standInHtml(scaffold: ScaffoldDoc | undefined, wiringPath: string | undefined): string {
  const html = guideHtml(scaffold, wiringPath)
  const section = /<section class="[^"]*stand-in[^"]*">([\s\S]*?)<\/section>/.exec(html)
  if (section === null) throw new Error(`the packet has no stand-in section:\n${html}`)
  return section[1] ?? ""
}

test("every build this board can be part of gets a row, and every row names this board", async () => {
  const scaffold = await lowBoostScaffold()
  const section = standInSection(scaffold, WIRING)
  if (section.kind !== "groups") throw new Error("low-boost declares a SCAFFOLD, so its section holds groups")

  // DERIVED, NEVER A LITERAL - see the module comment.
  expect(section.buildRows.length, "one row per build in the board's own ScaffoldDoc").toBe(scaffold.builds.length)
  // THE PREMISE: the doc carries more than one build, so the row count above
  // is not satisfied by an empty table.
  expect(scaffold.builds.length > 1, "low-boost can be part of more than one build").toBe(true)
  expect(section.buildColumns, "the wiring sheet's own four headings, reused").toEqual(BUILD_COLUMNS)

  for (const row of section.buildRows) {
    expect(row.length, "one cell per column").toBe(BUILD_COLUMNS.length)
    const bench = row[0]
    if (bench === undefined) throw new Error("test: a build row has no bench cell")
    expect(bench, `"${bench}" names this board - a build without it is not this board's build`).toContain(
      scaffold.section,
    )
  }
})

test("each group is a three-state configuration record, and carries no checkbox", async () => {
  const scaffold = await lowBoostScaffold()
  const section = standInSection(scaffold, WIRING)
  if (section.kind !== "groups") throw new Error("low-boost declares a SCAFFOLD, so its section holds groups")

  expect(section.groups.length, "one block per group in the doc").toBe(scaffold.groups.length)
  expect(section.noGroups, "this board has groups, so no such sentence").toBeUndefined()
  for (const [index, block] of section.groups.entries()) {
    const group = scaffold.groups[index]
    if (group === undefined) throw new Error("test: more blocks than groups")
    expect(block.section).toBe(group.section)
    expect(block.partIds, "the group's own part ids").toEqual(group.partIds)
    expect(block.partCount, "the count is the list's length, not a second statement of it").toBe(group.partIds.length)
    // THE THREE STATES, each named: populated here, not needed because that
    // section is present, or carried on another board (the board written in).
    expect(block.states.length, `${block.section} records which of three states it is in`).toBe(3)
    expect(block.states.filter((state) => state.writeIn).length, "one state takes a board name").toBe(1)
    const texts = block.states.map((state) => state.text).join(" | ")
    expect(texts).toContain("populated here")
    expect(texts, "the second state names the section whose presence makes the group unnecessary").toContain(
      block.section,
    )
    expect(texts).toContain("carried on")
  }

  // NO TICK ON A GROUP. The part rows already carry per-part checkboxes; a
  // ticked box on an omitted group cannot be read as either "all fitted" or
  // "deliberately skipped", which is the whole reason this section records a
  // state instead.
  expect(standInHtml(scaffold, WIRING), "no printed checkbox anywhere in this section").not.toContain('class="box"')
})

test("a group block names the same Fit cell the checklist prints for its parts", async () => {
  const scaffold = await lowBoostScaffold()
  const section = standInSection(scaffold, WIRING)
  if (section.kind !== "groups") throw new Error("low-boost declares a SCAFFOLD, so its section holds groups")
  const membership = groupMembership(scaffold)

  for (const block of section.groups) {
    // THE SAME DERIVATION, not a second spelling of it: every part of the
    // group resolves through `fitCondition` to the label the block prints, so
    // this section and the checklist's Fit column cannot tell two stories
    // about one part.
    for (const partId of block.partIds) {
      expect(fitCondition(partId, membership), `${partId}'s Fit cell is the one its group names`).toBe(block.fitLabel)
    }
  }
})

/**
 * THE ONE TEST THAT READS BOTH ARTIFACTS OF THE PACKET AT ONCE.
 *
 * Two earlier tasks in this plan were each correct alone and produced a defect
 * in their interaction, found by reading the generated page rather than by any
 * test. The interaction here is this: a group's parts do NOT sit together in
 * the checklist - a stand-in that resolves to 0 Ω is a row in **Wire links**
 * while the rest of its group is among the resistors or the capacitors - so
 * the only thing every row of one group has in common is its `Fit` cell. This
 * checks that cell, row by row, against the label the group block prints, over
 * the real board: the section may not claim a part the checklist conditions
 * differently, and the checklist may not carry a conditional row no block
 * claims.
 */
test("the section and the checklist's Fit column tell one story about every stand-in", async () => {
  const { circuit, checklist } = await loadBoard("pultec-low-boost")
  const scaffold = circuit.scaffold
  if (scaffold === undefined) throw new Error("low-boost declares SCAFFOLD; the guide did not load it")
  const section = standInSection(scaffold, WIRING)
  if (section.kind !== "groups") throw new Error("low-boost declares a SCAFFOLD, so its section holds groups")

  /** Every Fit-bearing row, by the Part cell the builder reads: ref -> [section title, Fit cell]. */
  const fitRows = new Map<string, readonly [string, string]>()
  for (const part of sectionsNamed(checklist, FIT_SECTION_TITLES)) {
    for (const row of part.rows) {
      const ref = row[0]
      const fit = row.at(-1)
      if (ref === undefined || fit === undefined) {
        throw new Error(`test: a row in "${part.title}" is too short to carry a Part and a Fit cell: ${row}`)
      }
      fitRows.set(ref, [part.title, fit])
    }
  }

  const claimed = new Set<string>()
  for (const block of section.groups) {
    for (const partId of block.partIds) {
      claimed.add(partId)
      const row = fitRows.get(partId)
      if (row === undefined) {
        throw new Error(
          `the stand-in section lists ${partId} under the ${block.section} group, and no Fit-bearing ` +
            "checklist section has a row for it - the packet names a part a builder cannot find.",
        )
      }
      expect(row[1], `${partId} (row in "${row[0]}") reads the condition its group block prints`).toBe(block.fitLabel)
    }
  }

  // AND IN THE OTHER DIRECTION: a conditional row no block claims would be a
  // part the checklist says to fit only sometimes and the section never
  // mentions.
  const conditional = [...fitRows].filter(([, [, fit]]) => fit !== ALWAYS).map(([ref]) => ref)
  expect(conditional.filter((ref) => !claimed.has(ref)), "every conditional row belongs to a printed group").toEqual([])
  expect(conditional.length, "and the two lists are the same set, so neither is empty by accident").toBe(claimed.size)

  // THE SPLIT IS REAL ON THIS BOARD, which is why a block names the Fit cell
  // rather than a section of the checklist: if every group's parts ever landed
  // in one section, the assertion above would stop being evidence for that
  // wording and this premise would fail rather than pass quietly.
  const titles = new Set([...claimed].map((ref) => fitRows.get(ref)?.[0]))
  expect(titles.size > 1, "low-boost's stand-ins are spread across more than one checklist section").toBe(true)
})

test("the section opens with a blank for the build, ahead of every group decision", async () => {
  const scaffold = await lowBoostScaffold()
  const section = standInSection(scaffold, WIRING)
  if (section.kind !== "groups") throw new Error("low-boost declares a SCAFFOLD, so its section holds groups")
  expect(section.buildPrompt.length > 0, "the build is recorded by hand, on a line of its own").toBe(true)

  const html = standInHtml(scaffold, WIRING)
  const promptAt = html.indexOf(section.buildPrompt)
  const firstGroup = section.groups[0]
  if (firstGroup === undefined) throw new Error("test: low-boost has at least one group")
  const groupAt = html.indexOf(firstGroup.section)
  expect(promptAt >= 0, "the build line is printed").toBe(true)
  expect(promptAt < groupAt, "no group decision means anything until the build is named, so it comes first").toBe(true)
  expect(html, "a rule to write the build on, not a checkbox").toContain("write-in")
})

test("the section points at the wiring sheet only when page one names one", async () => {
  // THE TWO FACTS ARE DELIBERATELY SEPARATE. `tools/guide/packet.ts` chooses the
  // page-one Wiring guide row by looking at disk, not from the scaffold, and
  // `tools/perfboard/wiring-sync.ts` writes no sheet for a board with no
  // off-board or physical-only parts - so a board with a SCAFFOLD and no
  // wiring.md is reachable, and prose that said "named on page one" regardless
  // would send a builder to a row that is not there.
  const scaffold = await lowBoostScaffold()

  const withSheet = standInSection(scaffold, WIRING)
  if (withSheet.kind !== "groups") throw new Error("low-boost declares a SCAFFOLD, so its section holds groups")
  expect(withSheet.intro.join(" "), "the sheet is named on page one, so the prose may say so").toContain(
    "named on page one",
  )
  expect(withSheet.buildIntro.join(" ")).toContain("wiring sheet lists the pads")

  const withoutSheet = standInSection(scaffold, undefined)
  if (withoutSheet.kind !== "groups") throw new Error("the scaffold is the same; only the sheet is gone")
  const prose = `${withoutSheet.intro.join(" ")} ${withoutSheet.buildIntro.join(" ")}`
  expect(prose, "no sheet, so nothing sends a reader to page one for one").not.toContain("named on page one")
  expect(prose, "and the absence is stated rather than left silent").toContain("no wiring sheet")
  // ON THE PRINTED PAGE, not only in the section data: the markup is what a
  // builder holds.
  const html = standInHtml(scaffold, undefined)
  expect(html).not.toContain("named on page one")
  expect(html, "the packet says the pads are listed nowhere in it").toContain("does not list those pads")
})

test("a board with no ScaffoldDoc gets one sentence, never a blank", async () => {
  expect(await scaffoldOf("pt2399-core"), "pt2399-core is not a Pultec section and declares no SCAFFOLD").toBeUndefined()

  const section = standInSection(undefined, WIRING)
  if (section.kind !== "none") throw new Error("a board with no SCAFFOLD has no groups to print")
  expect(section.sentence).toBe(NO_STAND_IN_GROUPS)
  expect(section.sentence, "it says what the gap IS").toContain("no stand-in groups")
  expect(section.sentence, "and that nothing here varies with the build").toContain("every build")

  const html = standInHtml(undefined, WIRING)
  expect(html).toContain(escapeXml(NO_STAND_IN_GROUPS))
  expect(html, "no build table on a board with no builds").not.toContain("Boards on the bench")
})

test("a scaffold that declares no groups says so rather than printing an empty space", () => {
  const scaffold = scaffoldWithNoGroups()
  const section = standInSection(scaffold, WIRING)
  if (section.kind !== "groups") throw new Error("a declared SCAFFOLD prints its build table")
  expect(section.groups.length).toBe(0)
  expect(section.noGroups, "the empty list says which gap it is").toBe(NO_GROUPS_DECLARED)
  // ESCAPED, because the page is XML-escaped HTML and this sentence carries an
  // apostrophe: comparing the raw string would fail on the escaping rather
  // than on the sentence being absent.
  expect(standInHtml(scaffold, WIRING)).toContain(escapeXml(NO_GROUPS_DECLARED))
})

/**
 * A `ScaffoldDoc` with builds and no groups. `lib/board/scaffold/doc.ts`
 * permits one (`groups: []` validates), and no board on disk is one, so the
 * only way to reach that branch is to construct it here - test data, in test
 * code.
 */
function scaffoldWithNoGroups(): ScaffoldDoc {
  return {
    section: "solo",
    flat: { loFrequency: "100Hz", hiFrequency: "5kHz", midFrequency: "1kHz", midMode: "off" },
    groups: [],
    builds: [{ present: ["solo"], populate: [], elsewhere: [], junction: [] }],
    external: [],
  }
}
