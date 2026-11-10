/**
 * **THE TRIAL'S RENDER, ON THE INSTALLED KICAD 10.0.5, OF AN APPROVED PULTEC SHEET.**
 *
 * `tools/schgen-drawing-trial/render.ts` must produce a PDF, an SVG and a PNG; the PNG's non-white
 * area must span more than half the page in both axes; and the SVG must carry every designator the
 * sheet's own netlist export lists, so nothing was clipped off the page. `kicad-cli` and `magick`
 * are required: `renderPage` throws, and this test fails, when either is absent.
 */
import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { defaultMagick } from "../../tools/draught/magick-install.ts"
import { draftedSheet } from "../circuits/drafted-sheet.ts"
import { TRIAL_CIRCUIT } from "../../tools/schgen-drawing-trial/boards.ts"
import { exportNetlist } from "../../tools/schgen-drawing-trial/kicad.ts"
import { renderPage } from "../../tools/schgen-drawing-trial/render.ts"

const BOARD = "pultec-hi-cut"
const TIMEOUT_MS = 120_000

/** Width, height, and the non-white bounding box's width and height, from `magick`. */
function inkBox(png: string): { width: number; height: number; inkWidth: number; inkHeight: number } {
  const run = spawnSync(defaultMagick(), [png, "-fuzz", "2%", "-format", "%w %h %@", "info:"], { encoding: "utf8" })
  if (run.status !== 0) throw new Error(`magick could not measure ${png}: ${run.stderr}`)
  const m = /^(\d+) (\d+) (\d+)x(\d+)\+\d+\+\d+$/.exec(run.stdout.trim())
  if (m === null) throw new Error(`unexpected magick output "${run.stdout}"`)
  return { width: Number(m[1]), height: Number(m[2]), inkWidth: Number(m[3]), inkHeight: Number(m[4]) }
}

/** Every string KiCad wrote as SVG text: the hidden `<text>` overlay and the stroked `<desc>`. */
function svgStrings(svg: string): Set<string> {
  const found = new Set<string>()
  for (const m of svg.matchAll(/<(?:text|desc)\b[^>]*>([^<]*)<\/(?:text|desc)>/g)) found.add(m[1] ?? "")
  return found
}

test(
  "an approved sheet renders to PDF, SVG and PNG, spanning the page, with every designator",
  () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-trial-render-"))
    try {
      const sheet = draftedSheet(TRIAL_CIRCUIT, BOARD)
      const page = renderPage(sheet, out)
      for (const file of [page.pdf, page.svg, page.png]) expect(fs.statSync(file).size).toBeGreaterThan(0)

      const box = inkBox(page.png)
      expect(box.inkWidth).toBeGreaterThan(box.width / 2)
      expect(box.inkHeight).toBeGreaterThan(box.height / 2)

      const net = path.join(out, "sheet.net")
      exportNetlist(sheet, net)
      const designators = importNetlist(fs.readFileSync(net, "utf8")).components.map((c) => c.designator)
      expect(designators.length).toBeGreaterThan(0)
      const strings = svgStrings(fs.readFileSync(page.svg, "utf8"))
      expect(designators.filter((d) => !strings.has(d))).toEqual([])
    } finally {
      fs.rmSync(out, { recursive: true, force: true })
    }
  },
  TIMEOUT_MS,
)

test("a missing sheet is refused by name", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-trial-render-"))
  try {
    expect(() => renderPage(path.join(out, "absent.kicad_sch"), out)).toThrow("absent.kicad_sch")
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
})
