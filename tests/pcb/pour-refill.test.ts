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
import { measurePour, PourRefusal } from "../../tools/pcb/pour.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { OPEN_PLACE, fixtureBoard } from "./pour-fixtures.ts"

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
    measurePour(board)
  } catch (error) {
    refusal = error
  }
  expect(refusal).toBeInstanceOf(PourRefusal)
  expect((refusal as PourRefusal).guard).toBe("zone-unfilled")

  refill(board)
  expect(fs.readFileSync(board, "utf8")).toContain("(filled_polygon")

  const metrics = measurePour(board)
  // KiCad's default thermal relief on a 1.6 mm through-hole pad: four spokes, on each of the two layers.
  expect(metrics.spokesByGroundPad.get("U1-3")).toBe(8)
  expect(metrics.spokesByGroundPad.get("U1-4")).toBe(8)
  expect(metrics.spokesByGroundPad.get("C1-2")).toBe(8)
  expect(metrics.groundPads.get("U1-3")?.map((r) => [r.layer, r.spokes])).toEqual([["F.Cu", 4], ["B.Cu", 4]])
  // Both layers were poured, and each is measured.
  expect([...metrics.bridgeByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
  expect([...metrics.continuityAroundU1ByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
  // One continuous zone, so U1's ground pins and C1's ground pad share a piece of it.
  expect(metrics.bypassReturn).toBe("pour")
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
    const metrics = measurePour(board)
    for (const pad of ["U1-3", "U1-4"]) {
      expect(metrics.groundPads.get(pad)?.map((r) => [r.layer, r.spokes])).toEqual([["F.Cu", 4], ["B.Cu", 4]])
      for (const reading of metrics.groundPads.get(pad) ?? []) fractions.push(reading.coveredFraction)
    }
  }
  // Four 0.5 mm spokes on a ring of 2.8 + 2 pi (0.8 + 0.25) = 9.4 mm.
  for (const f of fractions) expect(Math.abs(f - 2 / 9.4)).toBeLessThanOrEqual(0.03)
  expect(Math.max(...fractions) - Math.min(...fractions)).toBeLessThanOrEqual(0.001)
})
