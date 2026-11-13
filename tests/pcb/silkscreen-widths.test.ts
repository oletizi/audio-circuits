/**
 * THE RE-RUNNING MEASUREMENT OF SILKSCREEN GRAPHIC LINE WIDTH on
 * `circuits/pt2399-core/pt2399-core.kicad_pcb`.
 *
 * `docs/standards/pcbway-fab-rules.md` lists this quantity under "Not
 * enforced": KiCad has no design rule for it, the project sets a minimum TEXT
 * stroke and says nothing about a graphic line, and the spec for this plan
 * marked the figure unverified. This file is where it is now verified, and it
 * points at `tools/pcb/silkscreen-survey.ts` for why the measurement is code
 * rather than a figure in that document.
 *
 * IT IS A DISCLOSURE AND IT DOES NOT GO RED OVER A THIN LINE. No expected width
 * is written down here, and nothing asserts that any footprint clears the
 * threshold. The expected consequence of a thin outline is a faint legend, not a
 * rejected or dearer board, and a test that failed over a stock KiCad
 * footprint's stroke would stop this repository's whole suite for something
 * nobody intends to fix and nothing can refuse. What IS asserted is that the
 * measurement RAN and covered every footprint on the board - the failure worth
 * guarding against here is a survey that quietly measures nothing.
 *
 * WHERE THE WIDTHS ARE: in this test's printed output, re-derived on every run.
 * Run `bun test tests/pcb/silkscreen-widths.test.ts` to read them.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { children, parseSexpr } from "../../lib/kicad/sexpr.ts"
import {
  surveySilkscreen,
  surveySilkscreenText,
  belowThreshold,
  formatSilkscreenSurvey,
} from "../../tools/pcb/silkscreen-survey.ts"
import { RULE_MINIMUMS } from "../../tools/pcb/fab-standard.ts"

const BOARD = path.resolve(import.meta.dir, "../../circuits/pt2399-core/pt2399-core.kicad_pcb")

/**
 * The comparison figure, taken from the one place in code that already holds
 * the standard's silkscreen stroke minimum rather than re-typed here. It is
 * PCBWay's published 0.15 mm, and the standard's own silkscreen note records
 * that their figure is a character width while the project's is a stroke - two
 * different quantities, not asserted equal. Nothing about a graphic line is
 * published at all, so this is the nearest figure to compare against and the
 * comparison is reported, never enforced.
 */
const THRESHOLD_MM = RULE_MINIMUMS["min_text_thickness"] as number

/** The library footprints this board places. A part change here should go red and prompt a re-measure. */
const EXPECTED_FOOTPRINTS = [
  "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm",
  "Capacitor_THT:CP_Radial_D5.0mm_P2.50mm",
  "Capacitor_THT:CP_Radial_D6.3mm_P2.50mm",
  "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm",
  "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical",
  "Package_DIP:DIP-16_W7.62mm",
  "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
].sort()

test("the silkscreen survey covers every footprint on the board, and reports the widths", () => {
  const survey = surveySilkscreen(BOARD)

  // COVERAGE, STRUCTURALLY: every distinct library footprint placed on the
  // board has a row. Derived from the board rather than from the list below, so
  // a footprint added later is covered without editing this assertion.
  const placed = new Set(
    children(parseSexpr(fs.readFileSync(BOARD, "utf8")), "footprint").map((fp) => fp.atoms[0] ?? ""),
  )
  const measured = new Set(survey.byFootprint.map((row) => row.fpid))
  expect([...measured].sort()).toEqual([...placed].sort())

  // COVERAGE, BY NAME: the seven this board is known to place.
  expect([...measured].sort()).toEqual(EXPECTED_FOOTPRINTS)

  // THE MEASUREMENT ACTUALLY MEASURED SOMETHING. A survey returning seven rows
  // of nothing would satisfy the coverage assertions above and disclose no
  // width at all, which is the false green this test exists to prevent.
  for (const row of survey.byFootprint) {
    expect({ fpid: row.fpid, hasGraphics: row.graphics > 0 }).toEqual({ fpid: row.fpid, hasGraphics: true })
    expect({ fpid: row.fpid, positive: row.minWidthMm > 0 }).toEqual({ fpid: row.fpid, positive: true })
    expect(row.references.length).toBeGreaterThan(0)
  }
  expect(survey.items.length).toBe(survey.byFootprint.reduce((total, row) => total + row.graphics, 0))

  // THE DISCLOSURE. Printed, not asserted: see this file's header.
  console.log(`\nF.Silkscreen/B.Silkscreen graphic line widths, read from ${BOARD}:`)
  console.log(formatSilkscreenSurvey(survey, THRESHOLD_MM))
  const thin = belowThreshold(survey, THRESHOLD_MM)
  console.log(
    thin.length === 0
      ? `\nNone below ${THRESHOLD_MM} mm.`
      : `\nBelow ${THRESHOLD_MM} mm (disclosed, not a failure - KiCad has no rule for graphic line width ` +
          `and the consequence is a faint legend):\n  - ` +
          thin.map((row) => `${row.fpid} at ${row.minWidthMm} mm`).join("\n  - "),
  )
})

test("a silkscreen graphic whose width cannot be found is refused, not measured as zero", () => {
  // The guard that keeps the disclosure honest: an unreadable width is a
  // measurement that was not taken, and 0 mm would read as one that was.
  // SYNTHETIC: is this repository's declared prefix for a deliberately fictional
  // footprint name - see tests/kicad/footprint-sweep.ts. It keeps the name out
  // of the footprint sweep's disk check by saying what it is, rather than by
  // happening to name a library KiCad does not ship.
  const text = `(kicad_pcb (footprint "SYNTHETIC:Thing" (property "Reference" "X1") (fp_line (layer "F.SilkS"))))`
  expect(() => surveySilkscreenText(text, "synthetic")).toThrow(/cannot be measured/)
})
