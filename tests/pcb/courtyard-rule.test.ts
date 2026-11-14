/**
 * THE OWNER'S 2 mm HAND-ASSEMBLY SPACING, AND ITS SECOND MECHANISM.
 *
 * `placement-rules.json` `separation.part_to_part` is 2.0 mm - *"Use 2mm min
 * spacing"*, behind *"remember that I have fingers, so I need enough room
 * between parts to use my fingers. I'm not a pick and place machine"* - and
 * names TWO mechanisms at one number: the placer's `--clearance` while a
 * placement is made, and a KiCad `(constraint courtyard_clearance (min 2mm))`
 * so the shipped board is checkable independently of the placer that produced
 * it. Its `enforced_by` said **"NEITHER IS WIRED UP YET"**.
 *
 * This file is the second mechanism. `tools/pcb/courtyard-rule.ts`'s header
 * names this path as the place that *"measures it both ways on every run"*, and
 * that is what the last test does: at the declared minimum the settled board
 * reports zero `courtyards_overlap`, and at a tightened minimum it reports one
 * per offending pair. The second half is the one that matters - a `.kicad_dru`
 * KiCad cannot parse is not an error, so without it the rule would silently not
 * exist.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { parseReport, REQUIRED_ACTIVE_CHECKS } from "../../tools/pcb/drc-report.ts"
import { verdictOf } from "../../tools/pcb/drc-policy.ts"
import { MOUNTING_FOOTPRINT } from "../../tools/pcb/mounting-hardware.ts"
import {
  RULE_NAME, courtyardRuleText, druPathFor, minPartGapMm, verifyCourtyardRule,
} from "../../tools/pcb/courtyard-rule.ts"
import { BOARD, CIRCUIT, LIBRARY, RULES, rules } from "./settled-board.ts"

afterAll(cleanUpTempScratch)

// ---- the 2 mm spacing's second mechanism ------------------------------------

test("the committed .kicad_dru is what the approved figure generates", () => {
  expect(() => verifyCourtyardRule(BOARD, RULES)).not.toThrow()
  const gap = minPartGapMm(rules(), RULES)
  const text = fs.readFileSync(druPathFor(BOARD), "utf8")
  console.log(`  ${path.basename(druPathFor(BOARD))} at ${gap} mm:\n${text.replace(/^/gm, "    ")}`)
  expect(gap).toBe(2.0)
  expect(text).toBe(courtyardRuleText(rules(), RULES))
  expect(text).toContain("courtyard_clearance")
  expect(text).toContain("(min 2mm)")
  expect(text).toContain("(severity error)")
})

test("a MISSING or LOOSENED .kicad_dru refuses, naming how to write it", () => {
  const dir = freshTempScratch("pcb-dru-")
  const board = path.join(dir, "b.kicad_pcb")
  fs.writeFileSync(board, "(kicad_pcb)\n")
  let message = ""
  try {
    verifyCourtyardRule(board, RULES)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  expect(message).toContain("no custom design rules at")
  expect(message).toContain("bun tools/pcb/courtyard-rule.ts")

  // THE DANGEROUS CASE IS NOT ABSENCE, IT IS A FILE THAT EXISTS AND SAYS LESS:
  // DRC then runs, reports nothing, and the spacing is unchecked at the figure
  // that was approved.
  fs.writeFileSync(druPathFor(board), courtyardRuleText(rules(), RULES).replace("2mm", "0.25mm"))
  let loosened = ""
  try {
    verifyCourtyardRule(board, RULES)
  } catch (error) {
    loosened = error instanceof Error ? error.message : String(error)
  }
  expect(loosened).toContain("is not what")
  expect(loosened).toContain("clean against the wrong minimum")
})

test("the approved figure is READ and never defaulted", () => {
  expect(() => minPartGapMm({}, "x")).toThrow(/no positive separation\.part_to_part\.min_gap_mm/)
  expect(() => minPartGapMm({ separation: { part_to_part: { min_gap_mm: 0 } } }, "x")).toThrow()
  expect(() => minPartGapMm({ separation: { part_to_part: {} } }, "x")).toThrow(/never defaulted/)
})

test("INTEGRATION, real kicad-cli: the rule FIRES, and it fires as a type the gate already fails", () => {
  const cli = defaultKicadCli()
  if (!fs.existsSync(cli)) {
    throw new Error(
      `kicad-cli is not at ${cli}. Set KICAD_CLI or install KiCad. This does NOT skip: it is the ` +
        "only evidence that the custom design rule is enforced at all rather than being a text " +
        "file nothing reads.",
    )
  }
  const dir = freshTempScratch("pcb-dru-fires-")
  for (const file of ["pt2399-core.kicad_pcb", "pt2399-core.kicad_pro", "fp-lib-table"]) {
    fs.copyFileSync(path.join(CIRCUIT, file), path.join(dir, file.replace("pt2399-core", "p")))
  }
  fs.mkdirSync(path.join(dir, "pt2399-core.pretty"), { recursive: true })
  fs.copyFileSync(LIBRARY, path.join(dir, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`))
  const board = path.join(dir, "p.kicad_pcb")

  const run = (gap: string): ReturnType<typeof parseReport> => {
    fs.writeFileSync(
      path.join(dir, "p.kicad_dru"),
      courtyardRuleText(rules(), RULES).replace("(min 2mm)", `(min ${gap})`),
    )
    const report = path.join(dir, `drc-${gap}.json`)
    const result = spawnSync(
      cli,
      ["pcb", "drc", "--format", "json", "--severity-all", "--refill-zones", "-o", report, board],
      { encoding: "utf8" },
    )
    if (result.status !== 0) throw new Error(`kicad-cli exited ${String(result.status)}: ${result.stderr}`)
    return parseReport(fs.readFileSync(report, "utf8"), report)
  }

  // AT THE APPROVED FIGURE the settled board is clean, which is the half that
  // says the placement honours the owner's ruling.
  const atLimit = run("2mm")
  const overlapsAtLimit = atLimit.violations.filter((v) => v.type === "courtyards_overlap")
  console.log(`  at 2mm: ${overlapsAtLimit.length} courtyards_overlap`)
  expect(overlapsAtLimit).toEqual([])

  // TIGHTENED, the rule fires - which is the half that says it is enforced at
  // all rather than being a text file nothing reads. A rule KiCad cannot parse
  // is not an error: the board loads and the constraint simply does not exist.
  const tightened = run("2.5mm")
  const overlaps = tightened.violations.filter((v) => v.type === "courtyards_overlap")
  console.log(`  at 2.5mm: ${overlaps.length} courtyards_overlap, e.g. ${overlaps[0]?.description}`)
  expect(overlaps.length).toBeGreaterThan(0)
  expect(overlaps[0]?.severity).toBe("error")
  // It names the rule, so a violation can be traced to this file rather than
  // to KiCad's own courtyard check.
  expect(overlaps.some((v) => v.description.includes(RULE_NAME))).toBe(true)
  // AND THE TYPE IS ONE THE GATE ALREADY FAILS AT ANY SEVERITY. That is why
  // this mechanism needed no change to REQUIRED_ACTIVE_CHECKS, which is Task
  // 5's list and not this one's to widen.
  expect(REQUIRED_ACTIVE_CHECKS).toContain("courtyards_overlap")
  expect(verdictOf(tightened, { routed: false }).pass).toBe(false)
  expect(verdictOf(tightened, { routed: false }).counts.requiredCheckViolations).toBe(overlaps.length)
})
