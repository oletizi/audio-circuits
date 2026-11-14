/**
 * WHAT THE BOARD READER MAKES OF A PAD, against geometry worked out by hand.
 *
 * `./pour.test.ts` reaches the reader through whole measurements, where the
 * pads are 1.6 mm squares and circles: a corner radius taken from the wrong side
 * of a non-square pad, or a pad's angle added to its footprint's twice, would
 * still read four spokes. These read the outline directly.
 */
import { test, expect } from "bun:test"
import { parseSexpr } from "../../lib/kicad/sexpr.ts"
import { copperLayersOf } from "../../tools/pcb/pour-read.ts"
import { readPads } from "../../tools/pcb/pour-read-pads.ts"
import { OPEN_PLACE, RECTANGLE, fixtureBoard } from "./pour-fixtures.ts"

function pads(options: Parameters<typeof fixtureBoard>[0]) {
  const root = parseSexpr(fixtureBoard(options))
  return readPads(root, "fixture", copperLayersOf(root, "fixture"), (_ref, net) => net === "GND" || net === "+5V")
}

const BASE = { place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] } } as const

test("a roundrect pad's corner radius is its ratio of the SHORTER side, and a circle's and oval's are half of it", () => {
  const find = (list: ReturnType<typeof pads>) => list.find((p) => p.ref === "U1" && p.number === "3")?.outline
  expect(find(pads({ ...BASE, padShape: "roundrect", u1Turn: { degrees: 0, padSize: "3.0 1.6" } }))?.radius).toBeCloseTo(0.25 * 1.6, 9)
  expect(find(pads({ ...BASE, padShape: "oval", u1Turn: { degrees: 0, padSize: "3.0 1.6" } }))?.radius).toBeCloseTo(0.8, 9)
  expect(find(pads({ ...BASE, padShape: "rect", u1Turn: { degrees: 0, padSize: "3.0 1.6" } }))?.radius).toBe(0)
  expect(find(pads({ ...BASE, padShape: "circle" }))?.radius).toBeCloseTo(0.8, 9)
})

test("a pad's centre is its local position turned by the footprint's angle, and its own angle is read as written", () => {
  // U1 at (30, 18) turned 90: local (0, 6) goes to (36, 18), because positive rotation is counter-clockwise on the page.
  const turned = pads({ ...BASE, u1Turn: { degrees: 90, padSize: "1.6 1.6" } })
  const four = turned.find((p) => p.ref === "U1" && p.number === "4")?.outline
  expect(four?.centre[0]).toBeCloseTo(36, 9)
  expect(four?.centre[1]).toBeCloseTo(18, 9)
  // The pad carries the footprint's angle already; adding the footprint's again would read 180.
  expect(four?.degrees).toBe(90)
  const upright = pads(BASE).find((p) => p.ref === "U1" && p.number === "4")?.outline
  expect(upright?.centre).toEqual([30, 24])
  expect(upright?.degrees).toBe(0)
})
