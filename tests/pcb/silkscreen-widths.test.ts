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

/**
 * Footprints on the board that draw NO silkscreen at all, and therefore have no
 * width to disclose.
 *
 * **NAMED RATHER THAN SUBTRACTED, which is the whole reason this list exists.**
 * The coverage assertion below compares the survey's rows against the board's
 * footprints, and this test went red the moment the four M3 mounting holes
 * landed - correctly, because its own header says a part change should. The
 * tempting fix is to compare against "footprints with silkscreen" computed from
 * the same parse, and that would be the vacuous assertion the struck sum below
 * already warned about: it can no longer fail. So the exception is written
 * down, one entry, with what makes it one.
 *
 * `MountingHole_3.2mm_M3_Washer7.0mm` draws exactly three things - a comment
 * circle on `Cmts.User`, the courtyard circle on `F.CrtYd` and the `${REFERENCE}`
 * text on `F.Fab` - and not one of them is silkscreen. That is inherited from
 * KiCad's stock `MountingHole:MountingHole_3.2mm_M3`, which this one is derived
 * from by changing the courtyard radius and nothing else
 * (`tests/pcb/mounting-hardware.test.ts` compares the two files form by form).
 * A mounting hole with no legend is correct: there is nothing to identify and
 * nothing to orient.
 *
 * The holes' REFERENCE FIELDS are on `F.SilkS` and do appear on the board, but
 * a field is text and this survey measures graphic LINES - which is the
 * distinction `docs/standards/pcbway-fab-rules.md` draws and the reason this
 * survey exists at all.
 */
const NO_SILKSCREEN = ["pt2399-core:MountingHole_3.2mm_M3_Washer7.0mm"].sort()

test("the silkscreen survey covers every footprint on the board, and reports the widths", () => {
  const survey = surveySilkscreen(BOARD)

  // COVERAGE, STRUCTURALLY: every distinct library footprint placed on the
  // board has a row. Derived from the board rather than from the list below, so
  // a footprint added later is covered without editing this assertion.
  const placed = new Set(
    children(parseSexpr(fs.readFileSync(BOARD, "utf8")), "footprint").map((fp) => fp.atoms[0] ?? ""),
  )
  const measured = new Set(survey.byFootprint.map((row) => row.fpid))
  // Every placed footprint either has a row or is one of the written-down
  // exceptions that draw no silkscreen at all. The exception list is an INPUT
  // and not derived from this parse, which is what keeps the comparison able to
  // fail - see NO_SILKSCREEN above.
  expect([...measured, ...NO_SILKSCREEN].sort()).toEqual([...placed].sort())
  // And nothing on the exception list has a row, so an entry cannot sit there
  // excusing a footprint that is in fact being measured.
  for (const fpid of NO_SILKSCREEN) expect(measured.has(fpid)).toBe(false)

  // COVERAGE, BY NAME: the seven circuit footprints this board is known to place.
  expect([...measured].sort()).toEqual(EXPECTED_FOOTPRINTS)

  // THE MEASUREMENT ACTUALLY MEASURED SOMETHING. A survey returning seven rows
  // of nothing would satisfy the coverage assertions above and disclose no
  // width at all, which is the false green this test exists to prevent.
  for (const row of survey.byFootprint) {
    expect({ fpid: row.fpid, hasGraphics: row.graphics > 0 }).toEqual({ fpid: row.fpid, hasGraphics: true })
    expect({ fpid: row.fpid, positive: row.minWidthMm > 0 }).toEqual({ fpid: row.fpid, positive: true })
    expect(row.references.length).toBeGreaterThan(0)
  }
  // A SUM OVER `byFootprint` AGAINST `items.length` STOOD HERE AND IS STRUCK
  // RATHER THAN REPLACED. `byFootprint` is derived from `items`, so it could not
  // fail, and a vacuous assertion is worse than a missing one because it reads
  // as coverage. Nothing took its place: the independent check is the BY-NAME
  // coverage above, since `EXPECTED_FOOTPRINTS` is the only input here not
  // derived from the survey, and a second bound computed from the same parse
  // would be the same mistake in a new shape.

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
