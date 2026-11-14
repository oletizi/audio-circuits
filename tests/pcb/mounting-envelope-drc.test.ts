/**
 * THE MOUNTING-HARDWARE ENVELOPE GATE, RUN AGAINST THE REAL `kicad-cli`.
 *
 * Task 8 Step 4b of
 * `docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`
 * specifies three boards and one assertion, and every one of them is here:
 *
 * | fixture             | must produce                                   |
 * | ------------------- | ---------------------------------------------- |
 * | clean control       | ZERO violations                                |
 * | component intrusion | `courtyards_overlap`, error                    |
 * | copper intrusion    | `items_not_allowed`, error                     |
 *
 * plus: `missing_courtyard` is ENABLED, which is read off the report's own
 * `ignored_checks` rather than off a project file, because the report is the
 * authority for what a run actually checked.
 *
 * TWO MECHANISMS, ONE DIAMETER. Copper under the washer is a Rule Area with
 * `tracks`/`vias`/`copperpour` `not_allowed`; a part overlapping it is
 * `courtyards_overlap` against the project-local footprint whose courtyard is
 * the envelope. The fixtures prove each separately, and `tests/pcb/
 * mounting-hardware.test.ts` proves they use the same number.
 *
 * AND THREE THINGS THAT COULD GO SILENTLY WRONG, measured here as controls
 * rather than reasoned about:
 *
 *  1. **A Rule Area that rejects its own mounting hole.** The previous draft of
 *     this mechanism made `pads` and `footprints` `not_allowed` too. The
 *     `pads not_allowed` control below rebuilds the clean board with those
 *     flags and shows the hole being rejected - so the choice of flags is a
 *     measurement here, not a preference.
 *  2. **A part with NO courtyard is invisible to `courtyards_overlap`.** The
 *     control strips the intruder's courtyard and shows the overlap finding
 *     disappear. What catches it instead is `missing_courtyard`, which KiCad
 *     IGNORES BY DEFAULT - so that one assertion is the whole reason the
 *     component half of the gate exists for the parts most likely to slip
 *     through.
 *  3. **A Rule Area KiCad cannot parse is not an error.** The board loads and
 *     the keep-out simply does not exist, so the clean control alone cannot
 *     tell a working mechanism from an absent one. The copper fixture can.
 *
 * THESE TESTS FAIL RATHER THAN SKIP when `kicad-cli` is absent, as
 * `tests/pcb/drc.test.ts` does: a green suite on a machine with no KiCad would
 * be the skipped check that reads as a pass.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { parseReport, REQUIRED_ACTIVE_CHECKS, type ParsedReport } from "../../tools/pcb/drc-report.ts"
import { verdictOf } from "../../tools/pcb/drc-policy.ts"
import { verifyFabStandard } from "../../tools/pcb/fab-standard.ts"
import { runDrc } from "../../tools/pcb/drc.ts"
import { withTopLevelForms } from "../../tools/pcb/board-forms.ts"
import { BOARD_BASENAME, FIXTURE_ROOT } from "../../tools/pcb/mounting-envelope-fixtures.ts"
import {
  MOUNTING_FOOTPRINT,
} from "../../tools/pcb/mounting-hardware.ts"
import {
  mountingFootprintForm, readMountingFootprint,
} from "../../tools/pcb/mounting-hardware-forms.ts"

afterAll(cleanUpTempScratch)

const CLEAN = "mounting-envelope-clean"
const COMPONENT = "mounting-envelope-component"
const COPPER = "mounting-envelope-copper"

/**
 * Copies a fixture directory whole - board, project, `fp-lib-table` and the
 * library copy - and returns the scratch board path.
 *
 * WHOLE, because `kicad-cli` resolves the project and the footprint library
 * from the board's own directory. Copying only the board loses the table, and
 * the clean control then reports `lib_footprint_issues` and is no longer a
 * zero-violation board - measured, and the reason the fixtures carry a library
 * copy at all.
 */
function scratchFixture(name: string): string {
  const dir = freshTempScratch("pcb-envelope-test-")
  fs.cpSync(path.join(FIXTURE_ROOT, name), dir, { recursive: true })
  return path.join(dir, `${BOARD_BASENAME}.kicad_pcb`)
}

/** `kicad-cli pcb drc` on one board, parsed through the real report reader. */
function drcOf(boardPath: string): ParsedReport {
  const cli = defaultKicadCli()
  if (!fs.existsSync(cli)) {
    throw new Error(
      `kicad-cli is not at ${cli}. Set KICAD_CLI or install KiCad. This does NOT skip: the three ` +
        "fixtures are the only evidence the mounting-hardware envelope is enforced at all, and a " +
        "skipped run would leave that claim resting on nothing.",
    )
  }
  const reportPath = path.join(path.dirname(boardPath), "drc.json")
  // No --schematic-parity: these fixtures have no schematic and the envelope
  // gate has nothing to do with parity. tests/pcb/drc.test.ts covers the
  // two-leg parity guard.
  const result = spawnSync(
    cli,
    ["pcb", "drc", "--format", "json", "--severity-all", "--refill-zones", "-o", reportPath, boardPath],
    { encoding: "utf8" },
  )
  if (result.status !== 0) {
    throw new Error(`kicad-cli exited ${String(result.status)} on ${boardPath}: ${result.stderr}`)
  }
  return parseReport(fs.readFileSync(reportPath, "utf8"), reportPath)
}

function describe(report: ParsedReport): string {
  if (report.violations.length === 0) return "no violations"
  return report.violations.map((v) => `${v.type} (${v.severity})`).sort().join(", ")
}

/** The one `(keepout ...)` block in a fixture board, rewritten. */
function withKeepoutFlags(boardPath: string, replacements: readonly (readonly [string, string])[]): void {
  let text = fs.readFileSync(boardPath, "utf8")
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`${boardPath} does not contain ${from}`)
    text = text.replace(from, to)
  }
  fs.writeFileSync(boardPath, text)
}

test("INTEGRATION, real kicad-cli: the CLEAN CONTROL produces zero violations", () => {
  const board = scratchFixture(CLEAN)
  verifyFabStandard(board.replace(".kicad_pcb", ".kicad_pro"))
  const report = drcOf(board)
  console.log(`  kicad ${report.kicadVersion}: ${describe(report)}`)
  // ZERO, not "zero errors". The rule permits its own footprint and its own
  // NPTH drill, and nothing else about the board is remarkable - so anything
  // at all here is a finding.
  expect(report.violations).toEqual([])
  expect(verdictOf(report, { routed: false }).pass).toBe(true)
})

test("INTEGRATION, real kicad-cli: missing_courtyard is ENABLED in the run that produced the report", () => {
  // **WHAT ESTABLISHES THIS IS THE RETURN, NOT AN ASSERTION ON THE RESULT, and
  // the previous version of this test got that backwards.** It asserted that
  // none of `REQUIRED_ACTIVE_CHECKS` appears in `report.ignoredChecks` - but
  // `parseReport` (`tools/pcb/drc-report.ts:172`) THROWS
  // `DrcRefusal("ignored-checks", ...)` in exactly that case, so `drcOf` can
  // never return such a report and the two assertions were unreachable. They
  // were redundant rather than dangerous, since the refusal fails the test too
  // and an ABSENT `ignored_checks` key is refused as well (`arrayField`: "A
  // missing field is not zero") - but the test's own name presented them as the
  // load-bearing part, and an unreachable assertion reads as coverage.
  //
  // So: reaching the next line at all is the finding. What IS asserted is that
  // the field was populated and read - a report whose `ignored_checks` came
  // back empty would mean KiCad had stopped reporting the list, and the
  // refusal above would then have nothing to search.
  const board = scratchFixture(CLEAN)
  const report = drcOf(board)
  console.log(`  parseReport accepted the report; ignored_checks: ${report.ignoredChecks.join(", ")}`)
  expect(report.ignoredChecks.length).toBeGreaterThan(0)
  // KiCad ignores missing_courtyard by DEFAULT, so the project has to turn it
  // on. That the run above did not refuse is the proof it is on; this records
  // which of the three that argument is about.
  expect(REQUIRED_ACTIVE_CHECKS).toContain("missing_courtyard")

  // AND THE REFUSAL ITSELF, exercised rather than assumed - so the mechanism
  // the paragraph above relies on is shown to fire, from this file, on a report
  // shaped exactly like the one just parsed.
  const ignored = { ...JSON.parse(fs.readFileSync(path.join(path.dirname(board), "drc.json"), "utf8")) }
  ignored["ignored_checks"] = [{ key: "missing_courtyard", description: "x" }]
  let guard = ""
  try {
    parseReport(JSON.stringify(ignored), "ignored-probe")
  } catch (error) {
    guard = error instanceof Error ? error.message : String(error)
  }
  expect(guard).toContain("missing_courtyard")
  expect(guard).toContain("hardware-envelope gate")
})

test("INTEGRATION, real kicad-cli: a part whose BODY overlaps the washer is caught, pads clear", () => {
  const board = scratchFixture(COMPONENT)
  const report = drcOf(board)
  console.log(`  ${describe(report)}`)
  const overlaps = report.violations.filter((v) => v.type === "courtyards_overlap")
  expect(overlaps.length).toBe(1)
  expect(overlaps[0]?.severity).toBe("error")
  // There is no items_not_allowed here, and that is the measurement rather
  // than an aside: the part's pads sit OUTSIDE the envelope, so the copper
  // mechanism does not see it. courtyards_overlap is the only thing that does.
  expect(report.violations.filter((v) => v.type === "items_not_allowed")).toEqual([])
  expect(verdictOf(report, { routed: false }).pass).toBe(false)
})

test("INTEGRATION, real kicad-cli: a track entering the envelope is caught, which also proves the Rule Area parsed", () => {
  const board = scratchFixture(COPPER)
  const report = drcOf(board)
  console.log(`  ${describe(report)}`)
  const notAllowed = report.violations.filter((v) => v.type === "items_not_allowed")
  expect(notAllowed.length).toBe(1)
  expect(notAllowed[0]?.severity).toBe("error")
  expect(notAllowed[0]?.description).toContain("not allowed")
  expect(verdictOf(report, { routed: false }).pass).toBe(false)
  // A dangling stub track is a warning and is expected: the fixture's track has
  // no net and no destination. It is named so nobody reads it as a surprise.
  expect(report.violations.filter((v) => v.type === "track_dangling").length).toBe(1)
})

test("INTEGRATION, real kicad-cli: CONTROL - a Rule Area that forbids pads and footprints rejects its own hole", () => {
  // THE DEFECT THIS MECHANISM WAS REVISED TO AVOID, reproduced rather than
  // described. The clean control passes with copper-only flags; the same board
  // with the obvious "keep everything out" flags fails on the mounting hole it
  // exists to protect.
  const board = scratchFixture(CLEAN)
  withKeepoutFlags(board, [
    ["(pads allowed)", "(pads not_allowed)"],
    ["(footprints allowed)", "(footprints not_allowed)"],
  ])
  const report = drcOf(board)
  console.log(`  with pads/footprints not_allowed: ${describe(report)}`)
  for (const violation of report.violations) console.log(`    ${violation.description}`)
  const notAllowed = report.violations.filter((v) => v.type === "items_not_allowed")
  expect(notAllowed.length).toBeGreaterThan(0)
  expect(verdictOf(report, { routed: false }).pass).toBe(false)
})

test("INTEGRATION, real kicad-cli: CONTROL - a part with no courtyard escapes courtyards_overlap", () => {
  // WHY missing_courtyard MUST BE ENABLED, measured. Strip the intruder's
  // courtyard and the overlap finding vanishes: courtyards_overlap compares
  // courtyards, so a part without one is invisible to it. With
  // missing_courtyard in KiCad's default IGNORED set, the component half of
  // the envelope gate would then not exist for exactly those parts.
  const board = scratchFixture(COMPONENT)
  const text = fs.readFileSync(board, "utf8")
  // Only the intruder's courtyard, and only the layer label: moving the shapes
  // to a layer DRC does not read is the smallest edit that removes a courtyard
  // without disturbing anything else about the part.
  const p1 = text.indexOf('"P1"')
  expect(p1).toBeGreaterThan(0)
  const head = text.slice(0, p1)
  const tail = text.slice(p1).replaceAll('(layer "F.CrtYd")', '(layer "Cmts.User")')
  fs.writeFileSync(board, head + tail)

  const report = drcOf(board)
  console.log(`  P1 with its courtyard removed: ${describe(report)}`)
  expect(report.violations.filter((v) => v.type === "courtyards_overlap")).toEqual([])

  const missing = report.violations.filter((v) => v.type === "missing_courtyard")
  console.log(`  missing_courtyard findings: ${missing.length}`)
  // The gate still fails, and it fails on missing_courtyard - which is the
  // whole argument for enabling that check. If a KiCad release stopped
  // reporting it, this line goes red instead of the gate going quiet.
  expect(missing.length).toBeGreaterThan(0)
  expect(verdictOf(report, { routed: false }).pass).toBe(false)
})

test("INTEGRATION, real kicad-cli: a mounting hole needs board_only or SCHEMATIC PARITY reports it", () => {
  // THE FACT THE TASK THAT PLACES THESE HOLES NEEDS, measured here rather than
  // discovered on the real board. A mounting hole has no schematic symbol, so
  // `kicad-cli pcb drc --schematic-parity` sees a footprint with no component.
  // tools/pcb/drc-policy.ts tolerates ZERO parity findings at any severity, so
  // if the attribute is needed, `make parity-pt2399-core` fails the moment the
  // four holes land - and the remedy is a per-instance attribute, not a change
  // to the library footprint.
  //
  // THE GEOMETRY IS IRRELEVANT TO THIS ONE. It uses the known-good two-resistor
  // pair, which has a real schematic to be compared against, and puts the
  // mounting hole clear of both parts.
  const library = readMountingFootprint(
    path.join(FIXTURE_ROOT, "..", "..", "..", "circuits/pt2399-core/pt2399-core.pretty",
      `${MOUNTING_FOOTPRINT}.kicad_mod`),
  )
  const measured = new Map<boolean, number>()
  for (const boardOnly of [false, true]) {
    const dir = freshTempScratch("pcb-parity-hole-")
    for (const ext of ["kicad_pcb", "kicad_pro", "kicad_sch"]) {
      fs.copyFileSync(path.join(FIXTURE_ROOT, "good", `pair.${ext}`), path.join(dir, `pair.${ext}`))
    }
    // The library copy and its table, so the nickname resolves and the run does
    // not also report lib_footprint_issues.
    fs.mkdirSync(path.join(dir, "pt2399-core.pretty"), { recursive: true })
    fs.writeFileSync(
      path.join(dir, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`), library,
    )
    fs.copyFileSync(path.join(FIXTURE_ROOT, "mounting-envelope-clean", "fp-lib-table"),
      path.join(dir, "fp-lib-table"))

    const board = path.join(dir, "pair.kicad_pcb")
    const hole = mountingFootprintForm(library, "parity probe", {
      reference: "MH1", x: 95, y: 105, uuid: "f00d0000-0000-4000-8000-000000000001",
      locked: false, boardOnly,
    })
    fs.writeFileSync(board, withTopLevelForms(fs.readFileSync(board, "utf8"), board, [hole]))

    const report = runDrc(board, { schematicPath: path.join(dir, "pair.kicad_sch") })
    measured.set(boardOnly, report.counts.schematicParity)
    console.log(
      `  board_only ${boardOnly ? "yes" : "no "}: ${report.counts.schematicParity} parity finding(s)` +
        (report.schematicParity.length > 0 ? ` - ${report.schematicParity[0]?.description}` : ""),
    )
  }
  // Without the attribute parity reports the hole; with it, it does not. If a
  // KiCad release changes either half, this says so instead of the placing task
  // finding out from a red gate.
  expect(measured.get(false)).toBeGreaterThan(0)
  expect(measured.get(true)).toBe(0)
})
