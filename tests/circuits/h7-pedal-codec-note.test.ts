/**
 * The h7 pedal's codec page carries CR-PEDAL-POPULATION's class 1 note: every part left out of the
 * model and off the page (`NOT_FITTED_PARTS`), and CODEC-10's sheet note verbatim (`CODEC10_SHEET_NOTE`),
 * both from `circuits/h7-platform/pedal-population.ts`. The note's text is written in the page's
 * `repair/codec/layout.py`; this holds the committed sheet's note to the model's constants, so a change
 * to either side fails here (h7 pedal pages plan, Task 9c).
 *
 * Control: the same check run against the expr_ref page, which carries no population note, finds none
 * of the lines.
 */
import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { CODEC10_SHEET_NOTE, NOT_FITTED_PARTS } from "../../circuits/h7-platform/pedal-population.ts"

const PEDAL = join(resolve(import.meta.dir, "..", ".."), "drafted", "h7-platform", "h7-pedal")
/** KiCad writes a text's line break as a backslash and an "n"; built in code, never typed as an escape. */
const LINE_BREAK = String.fromCharCode(92) + "n"

/** Every line of every top-level text note on a sheet. */
function noteLines(sheet: string): readonly string[] {
  const source = readFileSync(join(PEDAL, sheet), "utf8")
  const texts = [...source.matchAll(/^\t\(text "([^"]*)"/gm)].map((m) => m[1] ?? "")
  return texts.flatMap((t) => t.split(LINE_BREAK))
}

/** The lines the population note must carry: one per not-fitted part, and the sheet note itself. */
function wanted(): readonly string[] {
  return [...NOT_FITTED_PARTS.map((p) => `- ${p.id}: ${p.what}`), CODEC10_SHEET_NOTE]
}

test("the codec page's note lists every not-fitted part and carries CODEC-10's sheet note verbatim", () => {
  const lines = noteLines("codec.kicad_sch")
  expect(NOT_FITTED_PARTS.length).toBe(5)
  for (const line of wanted()) expect(lines).toContain(line)
})

test("control: the expr_ref page, which has no population note, carries none of those lines", () => {
  const lines = noteLines("expr_ref.kicad_sch")
  for (const line of wanted()) expect(lines).not.toContain(line)
})
