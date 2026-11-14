/**
 * THE PROJECT CLEARANCE READER: which clearances it finds, the largest it takes,
 * and the three ways it refuses to guess. Numbers against files written here.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { readProjectClearance } from "../../tools/pcb/pour-project.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { reasonOf, valueOf } from "./pour-helpers.ts"

afterAll(cleanUpTempScratch)

function project(files: { pro?: string; dru?: string }): string {
  const dir = freshTempScratch("pcb-pour-project-")
  const board = path.join(dir, "b.kicad_pcb")
  fs.writeFileSync(board, "(kicad_pcb)")
  if (files.pro !== undefined) fs.writeFileSync(path.join(dir, "b.kicad_pro"), files.pro)
  if (files.dru !== undefined) fs.writeFileSync(path.join(dir, "b.kicad_dru"), files.dru)
  return board
}

const PRO = JSON.stringify({
  board: { design_settings: { rules: { min_clearance: 0.1 } } },
  net_settings: { classes: [{ name: "Default", clearance: 0.2 }, { name: "Power", clearance: 0.9 }] },
})

test("the largest of the netclass clearances, the project minimum and the rules file is taken, and every source is kept", () => {
  const read = valueOf(readProjectClearance(project({ pro: PRO, dru: '(version 1)\n(rule "wide"\n\t(constraint clearance\n\t\t(min 1.1mm)))\n(rule "x" (constraint courtyard_clearance (min 2mm)))' })))
  expect(read.maxMm).toBeCloseTo(1.1, 9)
  expect(read.sources.map((s) => s.mm).sort()).toEqual([0.1, 0.2, 0.9, 1.1])
})

test("without a rules file the maximum is the project's own, and mil is converted", () => {
  expect(valueOf(readProjectClearance(project({ pro: PRO }))).maxMm).toBeCloseTo(0.9, 9)
  expect(valueOf(readProjectClearance(project({ pro: PRO, dru: "(rule r (constraint clearance (min 50mil)))" }))).maxMm).toBeCloseTo(1.27, 9)
})

test("a missing project, one that is not JSON, one naming no clearance, and a rule in an unread unit are each unavailable with the reason", () => {
  expect(reasonOf(readProjectClearance(project({})))).toContain("no ")
  expect(reasonOf(readProjectClearance(project({ pro: "{not json" })))).toContain("not valid JSON")
  expect(reasonOf(readProjectClearance(project({ pro: "{}" })))).toContain("no netclass clearance")
  expect(reasonOf(readProjectClearance(project({ pro: PRO, dru: "(rule r (constraint clearance (min 2in)))" })))).toContain('"in"')
})
