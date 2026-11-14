/**
 * THE POUR MEASUREMENT AGAINST A BOARD KICAD ITSELF FILLED, and the refusal of
 * the same board before it was.
 *
 * `./pour.test.ts` drives the measurement over polygons written by hand. That
 * proves the arithmetic and cannot prove that KiCad writes what the reader
 * expects, or that a board KiCad has not filled looks unfilled to it. This file
 * does both with the real pinned `kicad-cli`, which fails rather than skips when
 * it is absent: a skipped run would read as a clean one.
 *
 * The board is the same fixture, with its zone declared on both copper layers and
 * NO fill written. It is measured as it stands (refused), put through
 * `kicad-cli pcb drc --refill-zones --save-board`, and measured again.
 *
 * What is asserted of the refilled board is what KiCad's default thermal relief
 * does to a 1.6 mm through-hole pad: four spokes on each layer. That is a
 * measurement of KiCad's output on this fixture, not a requirement on a pour.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { measurePour, PourRefusal, PT2399_CORE } from "../../tools/pcb/pour.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { OPEN_PLACE, fixtureBoard } from "./pour-fixtures.ts"
import { valueOf } from "./pour-helpers.ts"

afterAll(cleanUpTempScratch)

function unfilledBoard(): string {
  const dir = freshTempScratch("pcb-pour-refill-")
  const board = path.join(dir, "fixture.kicad_pcb")
  fs.writeFileSync(board, fixtureBoard({ place: OPEN_PLACE, pour: {}, zoneLayers: ["F.Cu", "B.Cu"], filledLayers: [] }))
  return board
}

function refill(board: string): void {
  const cli = defaultKicadCli()
  if (!fs.existsSync(cli)) throw new Error(`kicad-cli not found at ${cli}; this test fails rather than skips without it.`)
  const report = path.join(path.dirname(board), "drc.json")
  const result = spawnSync(cli, ["pcb", "drc", "--refill-zones", "--save-board", "-o", report, board], { encoding: "utf8" })
  if (result.status !== 0) throw new Error(`kicad-cli exited ${result.status}: ${result.stderr}`)
}

test("the board as written, with a zone and no fill, is refused; after KiCad refills and saves it, it is measured", () => {
  const board = unfilledBoard()
  let refusal: unknown
  try {
    measurePour(board, PT2399_CORE)
  } catch (error) {
    refusal = error
  }
  expect(refusal).toBeInstanceOf(PourRefusal)
  expect((refusal as PourRefusal).guard).toBe("zone-unfilled")

  refill(board)
  expect(fs.readFileSync(board, "utf8")).toContain("(filled_polygon")

  const metrics = measurePour(board, PT2399_CORE)
  // KiCad's default thermal relief on a 1.6 mm through-hole pad: four spokes, on each of the two layers, kept per layer.
  const spokes = valueOf(metrics.spokesByGroundPad)
  for (const pad of ["U1-3", "U1-4", "C1-2"]) {
    expect([...(spokes.get(pad) ?? [])].map(([layer, r]) => [layer, r.spokes, r.declaredConnection])).toEqual([
      ["F.Cu", 4, "thermal"], ["B.Cu", 4, "thermal"],
    ])
  }
  // Both layers were poured, and each is measured.
  expect([...metrics.regionsByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
  expect([...valueOf(metrics.continuityAroundIc).keys()]).toEqual(["F.Cu", "B.Cu"])
  // One continuous zone, so U1's ground pins and C1's ground pad share a piece of it.
  expect(valueOf(metrics.bypassReturn).overall).toBe("pour")
})

/**
 * A 3.0 x 1.6 mm oval pad is the one shape here whose ring depends on its angle:
 * turned the wrong way, the ring cut round the pad would run through the pad's
 * own copper on its long sides and across solid pour at its ends, and the spokes
 * read would not be the ones KiCad cut. A circle cannot show that, so this does,
 * at three angles - KiCad cuts the same relief round the pad at each, and a ring
 * placed with the wrong angle, or the wrong sign of it, cannot read the same
 * four spokes at all three.
 */
test("an oval pad turned 0, 90 and 270 degrees reads the four spokes KiCad cut round it, on both layers, at every angle", () => {
  const fractions: number[] = []
  for (const degrees of [0, 90, 270]) {
    const dir = freshTempScratch("pcb-pour-refill-")
    const board = path.join(dir, "fixture.kicad_pcb")
    fs.writeFileSync(
      board,
      fixtureBoard({
        place: OPEN_PLACE, pour: {}, zoneLayers: ["F.Cu", "B.Cu"], filledLayers: [],
        padShape: "oval", u1Turn: { degrees, padSize: "3.0 1.6" },
      }),
    )
    refill(board)
    const metrics = measurePour(board, PT2399_CORE)
    for (const pad of ["U1-3", "U1-4"]) {
      const layers = valueOf(metrics.spokesByGroundPad).get(pad)
      expect([...(layers ?? [])].map(([layer, r]) => [layer, r.spokes])).toEqual([["F.Cu", 4], ["B.Cu", 4]])
      for (const reading of layers?.values() ?? []) fractions.push(reading.coveredFraction)
    }
  }
  // Four 0.5 mm spokes on a ring of 2.8 + 2 pi (0.8 + 0.25) = 9.4 mm.
  for (const f of fractions) expect(Math.abs(f - 2 / 9.4)).toBeLessThanOrEqual(0.03)
  expect(Math.max(...fractions) - Math.min(...fractions)).toBeLessThanOrEqual(0.001)
})

/**
 * THE BOARD THAT SHOWED THE FIRST CONTINUITY FIGURE WAS WRONG. A copy of this
 * repository's real board with one full-board ground zone on both layers, filled
 * by the pinned `kicad-cli`: an unbroken plane, so a figure that reads anything
 * but full coverage is reading something other than the pour. The first version
 * walked the courtyard's bounding box, which sits 1.055 mm from U1's pad centres
 * inside the 1.3 mm void round each, and read 0.593.
 *
 * The real board is only COPIED, into scratch; it has no pour and is not changed.
 */
test("the real board with an unbroken full-board pour reads full coverage round U1 on both layers, one region, and no bridge", () => {
  const circuit = path.resolve(import.meta.dir, "../../circuits/pt2399-core")
  const dir = freshTempScratch("pcb-pour-refill-")
  const board = path.join(dir, "pt2399-core.kicad_pcb")
  const source = fs.readFileSync(path.join(circuit, "pt2399-core.kicad_pcb"), "utf8")
  const zone = [
    "\t(zone",
    '\t\t(net "GND")',
    '\t\t(layers "F.Cu" "B.Cu")',
    '\t\t(uuid "aaaaaaaa-0000-4000-8000-000000000001")',
    "\t\t(hatch edge 0.5)",
    "\t\t(connect_pads (clearance 0.5))",
    "\t\t(min_thickness 0.25)",
    "\t\t(fill yes (thermal_gap 0.5) (thermal_bridge_width 0.5))",
    "\t\t(polygon (pts (xy 11 11) (xy 159 11) (xy 159 109) (xy 11 109)))",
    "\t)",
  ].join("\n")
  const end = source.lastIndexOf(")")
  fs.writeFileSync(board, `${source.slice(0, end)}${zone}\n${source.slice(end)}`)
  fs.copyFileSync(path.join(circuit, "pt2399-core.kicad_pro"), path.join(dir, "pt2399-core.kicad_pro"))
  refill(board)

  const metrics = measurePour(board, PT2399_CORE)
  const loops = valueOf(metrics.continuityAroundIc)
  for (const layer of ["F.Cu", "B.Cu"]) {
    expect(loops.get(layer)?.best.coveredFraction).toBe(1)
    expect(loops.get(layer)?.best.breaksMm).toEqual([])
    expect(metrics.regionsByLayer.get(layer)).toBe(1)
  }
  expect(metrics.narrowestBridgeMm.kind).toBe("unavailable")
  // The constriction between pad voids is a figure of its own, and is not a bridge.
  expect(metrics.narrowestNeckMm).not.toBeNull()
})
