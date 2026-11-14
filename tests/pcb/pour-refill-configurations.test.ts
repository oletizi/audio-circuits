/**
 * THREE CONFIGURATIONS THAT MOVED THE CONTINUITY FIGURE ON AN UNBROKEN POUR, run
 * against the real `kicad-cli` fill of a copy of this repository's real board.
 *
 * A loop placed from declared clearances read 0.4221 with a second ground zone on
 * the layer declaring a smaller clearance, 0.9563 with a pad-local
 * `(clearance 1.5)` on one of U1's pads, and 0.7746 with a `.kicad_dru` rule
 * conditioned on a netclass nothing is in - each on a full-board pour with no break
 * in it anywhere. The figure now reads no clearance, so none of them can move it;
 * these tests are that claim made against KiCad's own fill and not against polygons
 * written by hand, and each fails if a clearance is read again and one of them
 * reaches the loop.
 *
 * The real board is only COPIED, into scratch; it has no pour and is not changed.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { measurePour, PT2399_CORE } from "../../tools/pcb/pour.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { valueOf } from "./pour-helpers.ts"

afterAll(cleanUpTempScratch)

const CIRCUIT = path.resolve(import.meta.dir, "../../circuits/pt2399-core")

const ZONE = (uuid: string, clearance: number, outline: string): string =>
  [
    "\t(zone",
    '\t\t(net "GND")',
    '\t\t(layers "F.Cu" "B.Cu")',
    `\t\t(uuid "${uuid}")`,
    "\t\t(hatch edge 0.5)",
    `\t\t(connect_pads (clearance ${clearance}))`,
    "\t\t(min_thickness 0.25)",
    "\t\t(fill yes (thermal_gap 0.5) (thermal_bridge_width 0.5))",
    `\t\t(polygon (pts ${outline}))`,
    "\t)",
  ].join("\n")

const FULL = "(xy 11 11) (xy 159 11) (xy 159 109) (xy 11 109)"

interface Configuration {
  /** More ground zones, as text, besides the full-board one. */
  readonly extraZones?: readonly string[]
  /** Rewrites the board text before the zones go in. */
  readonly edit?: (boardText: string) => string
  /** The text of a `.kicad_dru` to write beside the board. */
  readonly rules?: string
}

/** A copy of the real board in scratch with a full-board GND pour, the configuration applied, and KiCad's own fill saved into it. */
function filledCopy(config: Configuration): string {
  const dir = freshTempScratch("pcb-pour-config-")
  const board = path.join(dir, "pt2399-core.kicad_pcb")
  const source = (config.edit ?? ((t: string) => t))(fs.readFileSync(path.join(CIRCUIT, "pt2399-core.kicad_pcb"), "utf8"))
  const zones = [ZONE("aaaaaaaa-0000-4000-8000-000000000001", 0.5, FULL), ...(config.extraZones ?? [])].join("\n")
  const end = source.lastIndexOf(")")
  fs.writeFileSync(board, `${source.slice(0, end)}${zones}\n${source.slice(end)}`)
  fs.copyFileSync(path.join(CIRCUIT, "pt2399-core.kicad_pro"), path.join(dir, "pt2399-core.kicad_pro"))
  const rules = path.join(CIRCUIT, "pt2399-core.kicad_dru")
  fs.writeFileSync(path.join(dir, "pt2399-core.kicad_dru"), config.rules ?? fs.readFileSync(rules, "utf8"))
  const cli = defaultKicadCli()
  if (!fs.existsSync(cli)) throw new Error(`kicad-cli not found at ${cli}; this test fails rather than skips without it.`)
  const result = spawnSync(cli, ["pcb", "drc", "--refill-zones", "--save-board", "-o", path.join(dir, "drc.json"), board], { encoding: "utf8" })
  if (result.status !== 0) throw new Error(`kicad-cli exited ${result.status}: ${result.stderr}`)
  return board
}

function expectWholeOnBothLayers(board: string): void {
  const loops = valueOf(measurePour(board, PT2399_CORE).continuityAroundIc)
  for (const layer of ["F.Cu", "B.Cu"]) {
    expect(loops.get(layer)?.best.coveredFraction).toBe(1)
    expect(loops.get(layer)?.best.breaksMm).toEqual([])
  }
}

test("the profile on an unbroken full-board pour has the plateau the headline is taken from, and the pad extent itself is far from it", () => {
  const loops = valueOf(measurePour(filledCopy({}), PT2399_CORE).continuityAroundIc).get("F.Cu")
  if (loops === undefined) throw new Error("no F.Cu reading")
  expect(loops.best.coveredFraction).toBe(1)
  // The loop at the pad extent is inside U1's own sixteen pad voids; the plateau starts further out.
  expect(loops.profile[0]?.coveredFraction).toBeLessThan(0.5)
  const whole = loops.profile.filter((l) => l.coveredFraction === 1).map((l) => l.offsetMm)
  expect(whole.length).toBeGreaterThanOrEqual(4)
  expect(whole).toContain(1.5)
})

test("a second ground zone on the layer declaring no clearance does not move the figure", () => {
  const second = ZONE("bbbbbbbb-0000-4000-8000-000000000001", 0, "(xy 11 11) (xy 60 11) (xy 60 40) (xy 11 40)")
  expectWholeOnBothLayers(filledCopy({ extraZones: [second] }))
})

test("a pad-local clearance of 1.5 mm on one of U1's pads does not move the figure", () => {
  const edit = (text: string): string => {
    const footprint = text.indexOf('(footprint "Package_DIP:DIP-16_W7.62mm"')
    const pad = text.indexOf('(pad "2"', footprint)
    const layers = text.indexOf("(layers", pad)
    if (footprint === -1 || pad === -1 || layers === -1) throw new Error("U1 pad 2 not found in the real board")
    return `${text.slice(0, layers)}(clearance 1.5)\n\t\t\t${text.slice(layers)}`
  }
  expectWholeOnBothLayers(filledCopy({ edit }))
})

test("a rules-file clearance conditioned on a netclass nothing is in does not move the figure", () => {
  const rules = '(version 1)\n(rule "hv_spacing"\n\t(condition "A.NetClass == \'NOSUCHCLASS\'")\n\t(constraint clearance (min 3mm)))\n'
  expectWholeOnBothLayers(filledCopy({ rules }))
})
