/**
 * `draughting/pages/text_edits.py` reads a part's mirror in both of the sheet's textual forms (the
 * drawing-a-schematic skill's trap index): akcli's, on the `(at ...)` line, and copperhead's, on a line
 * of its own, which survives when the draft already carried the mirror the layout asks for. The h7
 * pedal's expr_ref page (Task 9b) is the first with parts in copperhead's form, J4 (mirror x) and Q6
 * (mirror y); before the change the tool read them as unmirrored and refused J4.
 *
 * - On a copy of the committed page with its wire strokes reset to akcli's form (the state the tool
 *   receives in the replay), the tool reproduces the committed sheet byte for byte, and the copy
 *   carries J4's and Q6's mirrors on lines of their own.
 * - Control: with J4's own-line mirror deleted, the tool refuses J4 as not at layout.py's place, so
 *   it is reading that line.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const ROOT = resolve(import.meta.dir, "..", "..")
const PEDAL = join(ROOT, "drafted", "h7-platform", "h7-pedal")
const TOOL = join(ROOT, "draughting", "pages", "text_edits.py")
const DIR = join(PEDAL, "repair", "expr_ref")
const J4_MIRROR = '\t\t(lib_id "Connector_Audio:NMJ6HCD2")\n\t\t(at 35.56 78.74 0)\n\t\t(mirror x)\n'

function resetStrokes(sheet: string): string {
  const reset = sheet.replace(/^(\t\(wire \(pts \(xy [-\d.]+ [-\d.]+\) \(xy [-\d.]+ [-\d.]+\)\) )\(stroke \(width 0\.254\) \(type default\)(?: \(color [\d ]+\))?\)/gm,
    "$1(stroke (width 0) (type default))")
  const wires = (sheet.match(/^\t\(wire /gm) ?? []).length
  const done = (reset.match(/\(stroke \(width 0\) \(type default\)\)/g) ?? []).length
  if (wires === 0 || done !== wires) throw new Error(`reset ${done} of ${wires} wire strokes; the sheet is not in the form this test expects`)
  return reset
}

function run(sheetText: string, work: string): { code: number; out: string; err: string } {
  const sheet = join(work, "expr_ref.kicad_sch")
  fs.writeFileSync(sheet, sheetText)
  const r = Bun.spawnSync(["python3", TOOL, DIR, sheet, join(DIR, "02-wire.nets.json"), join(DIR, "net_strokes.json")],
    { cwd: ROOT, stdout: "pipe", stderr: "pipe" })
  return { code: r.exitCode, out: fs.readFileSync(sheet, "utf8"), err: r.stderr.toString() }
}

test("a mirror on a line of its own is read, and the expr_ref page is reproduced", () => {
  const work = fs.mkdtempSync(join(tmpdir(), "text-edits-mirror-forms-"))
  try {
    const committed = fs.readFileSync(join(PEDAL, "expr_ref.kicad_sch"), "utf8")
    const reset = resetStrokes(committed)
    expect(reset.includes(J4_MIRROR)).toBe(true)
    expect(reset.includes('\t\t(lib_id "Transistor_FET:2N7002")\n\t\t(at 170.18 101.6 0)\n\t\t(mirror y)\n')).toBe(true)
    const r = run(reset, work)
    expect(r.code).toBe(0)
    expect(r.out === committed).toBe(true)
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
})

test("control: J4 with its own-line mirror deleted is refused", () => {
  const work = fs.mkdtempSync(join(tmpdir(), "text-edits-mirror-forms-control-"))
  try {
    const reset = resetStrokes(fs.readFileSync(join(PEDAL, "expr_ref.kicad_sch"), "utf8"))
    const r = run(reset.replace(J4_MIRROR, J4_MIRROR.replace("\t\t(mirror x)\n", "")), work)
    expect(r.code).not.toBe(0)
    expect(r.err).toContain("J4 is at (35.56, 78.74, 0, 'none'), not layout.py's (1400, 3100, 0, 'x')")
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
})
