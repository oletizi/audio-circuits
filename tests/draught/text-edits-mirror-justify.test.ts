/**
 * `draughting/pages/text_edits.py` writes each field's justification so that the page reads as the
 * block's `layout.py` FIELDS says. KiCad applies a field's justification in the symbol's frame, so the
 * tool swaps left and right for a part at rotation 90 or 180, and (since the h7 pedal pages plan's Task
 * 9a fix round) once more for a part mirrored left to right, `(mirror y)`. Measured on renders before
 * the change: the usb page's U15 (rotation 0, mirror y) and the midi_i2c page's J8 (rotation 270,
 * mirror y) each had a field written "left" in the sheet that read right-justified on the page.
 *
 * The tests run the tool on a copy of each committed page with its wire strokes (and any page note's
 * justification) reset to akcli's form
 * (the state the tool receives in the replay), using the committed block directory:
 * - it reproduces the committed sheet byte for byte, so the layouts, which now state the page's
 *   justification (U15 "left", J8 "right"), give the bytes the pages were committed with;
 * - U15's fields are written "right" in the sheet for a layout "left", J8's "left" for a layout "right";
 * - a control: U15's layout changed to "right" makes the tool write "left", so the swap is the tool's.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const ROOT = resolve(import.meta.dir, "..", "..")
const PEDAL = join(ROOT, "drafted", "h7-platform", "h7-pedal")
const TOOL = join(ROOT, "draughting", "pages", "text_edits.py")

/** The committed page with every wire's stroke put back to the form akcli's add_wire writes. */
function resetStrokes(sheet: string): string {
  const reset = sheet.replace(/^(\t\(wire \(pts \(xy [-\d.]+ [-\d.]+\) \(xy [-\d.]+ [-\d.]+\)\) )\(stroke \(width 0\.254\) \(type default\)(?: \(color [\d ]+\))?\)/gm,
    "$1(stroke (width 0) (type default))")
  const wires = (sheet.match(/^\t\(wire /gm) ?? []).length
  const done = (reset.match(/\(stroke \(width 0\) \(type default\)\)/g) ?? []).length
  if (wires === 0 || done !== wires) throw new Error(`reset ${done} of ${wires} wire strokes; the sheet is not in the form this test expects`)
  // A page note (akcli add_text) goes back to akcli's form too: text_edits.py adds its justify.
  return reset.replace(/^(\t\(text "(?:[^"\\]|\\.)*" \(at [-\d.]+ [-\d.]+ 0\) \(effects \(font \(size 1\.27 1\.27\)\)) \(justify left\)(\) \(uuid )/gm, "$1$2")
}

/** Run text_edits.py on a reset copy of `block`'s page with `blockDir`; return the sheet it wrote. */
function runTool(block: string, blockDir: string, work: string): string {
  const sheet = join(work, `${block}.kicad_sch`)
  fs.writeFileSync(sheet, resetStrokes(fs.readFileSync(join(PEDAL, `${block}.kicad_sch`), "utf8")))
  const r = Bun.spawnSync(["python3", TOOL, blockDir, sheet, join(blockDir, "02-wire.nets.json"), join(blockDir, "net_strokes.json")],
    { cwd: ROOT, stdout: "pipe", stderr: "pipe" })
  if (r.exitCode !== 0) throw new Error(`text_edits.py on ${block} failed: ${r.stderr.toString()}`)
  return fs.readFileSync(sheet, "utf8")
}

/** The (justify ...) written on `ref`'s Reference field, or "none". */
function referenceJustify(sheet: string, ref: string): string {
  const m = new RegExp(`\\(property "Reference" "${ref}" \\(at [-\\d.]+ [-\\d.]+ \\d+\\)\\n\\t+\\(effects \\(font \\(size 1\\.27 1\\.27\\)\\)(?: \\(justify (\\w+)\\))?`).exec(sheet)
  if (m === null) throw new Error(`no Reference field for ${ref}`)
  return m[1] ?? "none"
}

test("a part mirrored left to right gets its field justification swapped, and the pages are unchanged", () => {
  const work = fs.mkdtempSync(join(tmpdir(), "text-edits-mirror-"))
  try {
    for (const [block, ref, written] of [["usb", "U15", "right"], ["midi_i2c", "J8", "left"]] as const) {
      const out = runTool(block, join(PEDAL, "repair", block), work)
      expect(out === fs.readFileSync(join(PEDAL, `${block}.kicad_sch`), "utf8")).toBe(true)
      expect(referenceJustify(out, ref)).toBe(written)
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
})

test("control: U15's layout stating right makes the tool write left", () => {
  const work = fs.mkdtempSync(join(tmpdir(), "text-edits-mirror-control-"))
  try {
    const dir = join(work, "usb")
    fs.cpSync(join(PEDAL, "repair", "usb"), dir, { recursive: true })
    const layout = fs.readFileSync(join(dir, "layout.py"), "utf8")
    const from = `"U15": fields((1.27, -13.97, "left"), (1.27, -11.43, "left")),`
    if (!layout.includes(from)) throw new Error("usb/layout.py's U15 entry is not the one this control edits")
    fs.writeFileSync(join(dir, "layout.py"), layout.replace(from, from.replaceAll('"left"', '"right"')))
    expect(referenceJustify(runTool("usb", dir, work), "U15")).toBe("left")
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
})
