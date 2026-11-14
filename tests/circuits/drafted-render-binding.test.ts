/**
 * **A COMMITTED RENDER IS THE RENDER OF THE COMMITTED SHEET'S BYTES** (H7 module plan, final review M8).
 *
 * A verdict is bound to a sheet's sha256 (`EVALUATING-DRAWINGS.md` §5), but what the owner looked at
 * is the `.svg` committed beside it. Before this test nothing tied the two: `render.sh` compares only
 * the PDF's and SVG's "Sheet:" text, and `verify-root.sh` reads `h7-module.svg` as given, so a sheet
 * re-committed without re-rendering would keep its verdict's sha256 while the picture showed other
 * bytes, and every check would pass.
 *
 * So each committed `.svg` of a multi-page project is rendered again here, right now, from the
 * committed `.kicad_sch` in place, with the pinned `kicad-cli` (`draughting/tools.lock.json`), and
 * compared with the committed file byte for byte, except for the one thing kicad-cli writes that is
 * not the drawing: the export time in the `<title>` line ("SVG Image created as <file> date <time>").
 * Exactly one such time is masked per file, so the mask cannot hide anything else. A root renders its
 * own page (`--pages`, read from its `(sheet_instances (path "/" (page ...)))`), as `render.sh` does.
 *
 * It does not skip: a missing or differently versioned `kicad-cli` refuses, since another version's
 * SVG would differ for reasons that are not the sheet.
 */
import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { KICAD_CLI } from "../../lib/kicad/netlist.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/** `control`: the block sheet whose title the control edits (one carrying a `(title ...)`). */
const PROJECTS: ReadonlyArray<{ readonly board: string; readonly dir: string; readonly control: string }> = [
  { board: "h7-module", dir: path.join(moduleRepoRoot(), "drafted", "h7-platform", "h7-module"), control: "power" },
  { board: "h7-pedal", dir: path.join(moduleRepoRoot(), "drafted", "h7-platform", "h7-pedal"), control: "entry" },
]

const EXPORT_TIME = /( date )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}( <\/title>)/g

function pinnedKicadCliVersion(): string {
  const lock: unknown = JSON.parse(fs.readFileSync(path.join(moduleRepoRoot(), "draughting", "tools.lock.json"), "utf8"))
  if (typeof lock !== "object" || lock === null || !("kicad-cli" in lock)) {
    throw new Error("draughting/tools.lock.json has no kicad-cli entry; the render check needs the pinned version")
  }
  const entry: unknown = lock["kicad-cli"]
  if (typeof entry !== "object" || entry === null || !("version" in entry) || typeof entry.version !== "string") {
    throw new Error("draughting/tools.lock.json's kicad-cli entry has no version string")
  }
  return entry.version
}

function installedKicadCliVersion(): string {
  try {
    return execFileSync(KICAD_CLI, ["--version"], { encoding: "utf8" }).trim()
  } catch (e) {
    throw new Error(
      `kicad-cli could not be run at ${KICAD_CLI} (${e instanceof Error ? e.message : String(e)}). Install KiCad or set ` +
        "KICAD_CLI. This does not skip: without it nothing binds a committed render to its sheet.",
    )
  }
}

/** The SVG text with its one export time masked; refuses a file that does not carry exactly one. */
function masked(svg: string, file: string): string {
  const times = svg.match(EXPORT_TIME) ?? []
  if (times.length !== 1) {
    throw new Error(`${file}: expected exactly one kicad-cli export time in its <title>, found ${times.length}; the mask would hide something else`)
  }
  return svg.replace(EXPORT_TIME, "$1<time>$2")
}

function rootPage(sheet: string): string {
  const m = /\(sheet_instances\s*\(path "\/"\s*\(page "(\d+)"\)/.exec(fs.readFileSync(sheet, "utf8"))
  const page = m?.[1]
  if (page === undefined) throw new Error(`${sheet} has no (sheet_instances (path "/" (page ...))); is it a root sheet?`)
  return page
}

function renderSvg(sheet: string, isRoot: boolean): string {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "render-binding-"))
  try {
    const pages = isRoot ? ["--pages", rootPage(sheet)] : []
    execFileSync(KICAD_CLI, ["sch", "export", "svg", ...pages, "-o", out, sheet], { stdio: "pipe" })
    const svg = path.join(out, `${path.basename(sheet, ".kicad_sch")}.svg`)
    if (!fs.existsSync(svg)) throw new Error(`kicad-cli wrote no ${path.basename(svg)} for ${sheet}; it wrote ${fs.readdirSync(out).join(", ")}`)
    return fs.readFileSync(svg, "utf8")
  } finally {
    fs.rmSync(out, { recursive: true, force: true })
  }
}

test("the kicad-cli this check renders with is the pinned one", () => {
  expect(installedKicadCliVersion()).toBe(pinnedKicadCliVersion())
})

for (const { board, dir, control } of PROJECTS) {
  const sheets = fs.readdirSync(dir).filter((f) => f.endsWith(".kicad_sch")).sort()
  const svgs = fs.readdirSync(dir).filter((f) => f.endsWith(".svg")).sort()

  test(`${board}: every committed sheet has a committed render, and every render a sheet`, () => {
    expect(svgs.map((f) => f.replace(/\.svg$/, ""))).toEqual(sheets.map((f) => f.replace(/\.kicad_sch$/, "")))
  })

  for (const sheet of sheets) {
    test(`${board}: ${sheet}'s committed render is kicad-cli's render of its committed bytes`, () => {
      const file = path.join(dir, sheet)
      const svgFile = path.join(dir, sheet.replace(/\.kicad_sch$/, ".svg"))
      const fresh = masked(renderSvg(file, sheet === `${board}.kicad_sch`), `fresh render of ${sheet}`)
      expect(fresh).toBe(masked(fs.readFileSync(svgFile, "utf8"), svgFile))
    })
  }

  test(`${board}: a render of other bytes is caught - the control for the equality above`, () => {
    const svgFile = path.join(dir, `${control}.svg`)
    const committed = masked(fs.readFileSync(svgFile, "utf8"), svgFile)
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "render-binding-control-"))
    try {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".kicad_sch") || f.endsWith(".kicad_pro") || f === "sym-lib-table") fs.copyFileSync(path.join(dir, f), path.join(work, f))
      }
      const copy = path.join(work, `${control}.kicad_sch`)
      const text = fs.readFileSync(copy, "utf8")
      const edited = text.replace(/\(title "([^"]*)"/, '(title "$1 CONTROL"')
      if (edited === text) throw new Error(`${control}.kicad_sch has no (title ...) to edit; the control would not change the bytes`)
      fs.writeFileSync(copy, edited)
      expect(masked(renderSvg(copy, false), "control render")).not.toBe(committed)
    } finally {
      fs.rmSync(work, { recursive: true, force: true })
    }
  })
}
