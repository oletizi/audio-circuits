/**
 * `tools/pcb/routed-survey.ts` - the copper a route run produced, and whether it
 * moved a part.
 *
 * Every test here is a change detector on a predicate that would otherwise fail
 * SILENTLY in the direction that matters. Three in particular, because each one
 * was reached by asking "if this were wrong, would anything notice?":
 *
 *  - `normalisedRotation` with a NEGATIVE angle. The engine wrote `-90` where
 *    the adopted board wrote `270`, and a bare `% 360` leaves `-90` as `-90`, so
 *    the tool reported two parts moved on a board where nothing had. A false
 *    "a part moved" on the one check that guards the approved placement is
 *    indistinguishable from the real thing until somebody opens both files.
 *  - A real rotation change must still be caught. Normalising is only safe if
 *    90 against 270 still differs, and nothing else here would notice if it did not.
 *  - `belowFloor` AT the floor. A floor is a minimum, so equality is not below
 *    it; a `<=` there would fail every board routed exactly at the standard, and
 *    a tool that cries wolf on a correct board gets ignored on a wrong one.
 *
 * **THE SWEEP THAT WROTE TWO OF THESE TESTS, and the one survivor it leaves.**
 * 19 mutations of `tools/pcb/routed-survey.ts`, 18 killed. Two survived the first
 * pass and both were gaps rather than equivalences, and each is now a test with
 * the reason written on it: `belowFloor`'s two guards were only ever exercised
 * together, so deleting either left the other covering for it; and the main
 * fixture carried its narrowest track on the layer written FIRST, so "the first
 * layer's narrowest" and "the minimum over all layers" could not be told apart.
 *
 * The ONE survivor, named with the reason it is equivalent rather than counted:
 * **deleting the `limit === undefined` guard in `belowFloor` changes no output.**
 * With it gone the comparison becomes `actual < undefined`, which is `false` for
 * every number because the operand coerces to `NaN`, so the branch is never
 * taken and the result is identical. No test can distinguish the two. The guard
 * is kept anyway: expressing "the file declares no floor for this" through an
 * accidental NaN comparison is not a thing to leave to the next reader.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  belowFloor, copperGeometry, movedParts, normalisedRotation, partPoses, readFabFloor,
} from "../../tools/pcb/routed-survey.ts"
import type { CopperGeometry, PartPose } from "../../tools/pcb/routed-survey.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

afterAll(cleanUpTempScratch)

function write(name: string, text: string): string {
  const dir = freshTempScratch("pcb-routed-survey-")
  const file = path.join(dir, name)
  fs.writeFileSync(file, text)
  return file
}

const BOARD = `(kicad_pcb
\t(version 20241229)
\t(footprint "lib:R_0805"
\t\t(layer "F.Cu")
\t\t(at 20.5 30.25 270)
\t\t(property "Reference" "R1")
\t)
\t(footprint "lib:C_Disc"
\t\t(layer "F.Cu")
\t\t(at 40 50)
\t\t(property "Reference" "C1")
\t)
\t(segment (start 1 1) (end 2 1) (width 0.3) (layer "F.Cu") (net 1))
\t(segment (start 2 1) (end 3 1) (width 0.2) (layer "F.Cu") (net 1))
\t(segment (start 3 1) (end 4 1) (width 0.3) (layer "F.Cu") (net 1))
\t(arc (start 6 1) (mid 6.5 1.2) (end 7 1) (width 0.4) (layer "F.Cu") (net 1))
\t(segment (start 1 5) (end 2 5) (width 0.5) (layer "B.Cu") (net 2))
\t(via (at 5 5) (size 0.8) (drill 0.4) (layers "F.Cu" "B.Cu") (net 1))
\t(via (at 6 5) (size 0.6) (drill 0.3) (layers "F.Cu" "B.Cu") (net 1))
)
`

const FLOOR = `# a comment line
track_width = 0.25   # with a trailing comment
via_diameter     = 0.8
via_drill = 0.4

# a blank line and a comment above this one
clearance = 0.25
`

test("every track width and via size is counted per layer, with the narrowest named", () => {
  const geometry = copperGeometry(write("board.kicad_pcb", BOARD))
  const front = geometry.tracksByLayer.get("F.Cu")
  // An `arc` is copper and is counted with the segments: KiCad writes a curved
  // track as `(arc ...)` with its own `(width ...)`, and a reader that looked
  // only at `(segment ...)` would miss a necked arc entirely.
  expect(front?.segments).toBe(4)
  expect([...(front?.byWidthMm ?? [])].sort((a, b) => a[0] - b[0])).toEqual([[0.2, 1], [0.3, 2], [0.4, 1]])
  expect(front?.narrowestMm).toBe(0.2)
  expect(geometry.tracksByLayer.get("B.Cu")?.narrowestMm).toBe(0.5)
  expect(geometry.narrowestTrackMm).toBe(0.2)
  expect(geometry.vias.vias).toBe(2)
  expect(geometry.vias.narrowestDiameterMm).toBe(0.6)
  expect(geometry.vias.narrowestDrillMm).toBe(0.3)
  expect([...geometry.vias.bySizeMm].sort()).toEqual([["0.6/0.3", 1], ["0.8/0.4", 1]])
})

test("the board's narrowest track is the minimum over the layers, not the first layer's", () => {
  // The main fixture happens to carry its narrowest track on the layer that is
  // written FIRST, so "the first layer's narrowest" and "the minimum over all
  // layers" agree on it and a mutation between them survived the sweep. Here the
  // narrow one is on the second layer written.
  const geometry = copperGeometry(write("board.kicad_pcb", `(kicad_pcb
\t(version 20241229)
\t(segment (start 1 1) (end 2 1) (width 0.5) (layer "F.Cu") (net 1))
\t(segment (start 1 5) (end 2 5) (width 0.25) (layer "B.Cu") (net 2))
)
`))
  expect([...geometry.tracksByLayer.keys()]).toEqual(["F.Cu", "B.Cu"])
  expect(geometry.narrowestTrackMm).toBe(0.25)
})

test("a board with no copper reports no narrowest width rather than a zero", () => {
  const geometry = copperGeometry(write("bare.kicad_pcb", "(kicad_pcb (version 20241229))\n"))
  expect(geometry.narrowestTrackMm).toBeNull()
  expect(geometry.vias.narrowestDiameterMm).toBeNull()
  expect(geometry.vias.narrowestDrillMm).toBeNull()
  expect(geometry.tracksByLayer.size).toBe(0)
})

test("a footprint's reference, position, rotation and layer are read; an absent rotation is 0", () => {
  expect(partPoses(write("board.kicad_pcb", BOARD))).toEqual([
    { ref: "R1", x: 20.5, y: 30.25, rotation: 270, layer: "F.Cu" },
    { ref: "C1", x: 40, y: 50, rotation: 0, layer: "F.Cu" },
  ])
})

test("a rotation is reduced to [0, 360), so a negative angle is the positive one it equals", () => {
  expect(normalisedRotation(-90)).toBe(270)
  expect(normalisedRotation(270)).toBe(270)
  expect(normalisedRotation(360)).toBe(0)
  expect(normalisedRotation(0)).toBe(0)
  expect(normalisedRotation(450)).toBe(90)
  expect(normalisedRotation(-360)).toBe(0)
})

const R1: PartPose = { ref: "R1", x: 20.5, y: 30.25, rotation: 270, layer: "F.Cu" }

test("-90 against 270 is NOT a part moving: it is the same orientation, written the engine's way", () => {
  expect(movedParts([R1], [{ ...R1, rotation: -90 }])).toEqual([])
})

test("a real rotation change is still caught, which is what makes normalising safe", () => {
  expect(movedParts([R1], [{ ...R1, rotation: 90 }])).toEqual([
    { ref: "R1", what: "rotated from 270 to 90" },
  ])
})

test("a position change is reported with both coordinates, and re-serialised digits are not one", () => {
  expect(movedParts([R1], [{ ...R1, x: 20.6 }])).toEqual([
    { ref: "R1", what: "moved from (20.5, 30.25) to (20.6, 30.25)" },
  ])
  // Both coordinates, separately: a predicate that compared only x would pass a
  // part that slid the whole way down the board.
  expect(movedParts([R1], [{ ...R1, y: 31 }])).toEqual([
    { ref: "R1", what: "moved from (20.5, 30.25) to (20.5, 31)" },
  ])
  // 107.000000 and 107 are compared as numbers, so the engine's shorter form is not a move.
  expect(movedParts([{ ...R1, x: Number("107.000000") }], [{ ...R1, x: Number("107") }])).toEqual([])
})

test("a part that appears, disappears or changes layer is each named", () => {
  expect(movedParts([R1], [])).toEqual([
    { ref: "R1", what: "present on the reference board and absent from the candidate" },
  ])
  expect(movedParts([], [R1])).toEqual([
    { ref: "R1", what: "absent from the reference board and present on the candidate" },
  ])
  expect(movedParts([R1], [{ ...R1, layer: "B.Cu" }])).toEqual([
    { ref: "R1", what: "moved from F.Cu to B.Cu" },
  ])
})

test("the fab floor file is read as key-to-number pairs, with comments and blank lines ignored", () => {
  const floor = readFabFloor(write("floor.txt", FLOOR))
  expect(floor.get("track_width")).toBe(0.25)
  expect(floor.get("via_diameter")).toBe(0.8)
  expect(floor.get("via_drill")).toBe(0.4)
  expect(floor.get("clearance")).toBe(0.25)
  expect(floor.size).toBe(4)
})

test("a line that is neither a comment nor a key-value pair refuses, naming the line", () => {
  const bad = write("floor.txt", "track_width = 0.25\nthis is not a floor\n")
  expect(() => readFabFloor(bad)).toThrow(/floor\.txt:2/)
})

test("a floor file declaring nothing refuses rather than silently checking nothing", () => {
  expect(() => readFabFloor(write("floor.txt", "# only a comment\n\n"))).toThrow(/declares no floors/)
})

function geometryOf(narrowestTrackMm: number | null, diameter: number | null, drill: number | null): CopperGeometry {
  return {
    tracksByLayer: new Map(),
    vias: { bySizeMm: new Map(), vias: 0, narrowestDiameterMm: diameter, narrowestDrillMm: drill },
    narrowestTrackMm,
  }
}

test("copper below a declared floor is named with both figures", () => {
  const floor = readFabFloor(write("floor.txt", FLOOR))
  expect(belowFloor(geometryOf(0.2, 0.8, 0.4), floor)).toEqual([
    "the narrowest track is 0.2 mm, below the declared track_width floor of 0.25 mm",
  ])
  expect(belowFloor(geometryOf(0.3, 0.7, 0.3), floor)).toEqual([
    "the narrowest via diameter is 0.7 mm, below the declared via_diameter floor of 0.8 mm",
    "the narrowest via drill is 0.3 mm, below the declared via_drill floor of 0.4 mm",
  ])
})

test("copper EXACTLY at a floor is not below it: a floor is a minimum, not a target", () => {
  const floor = readFabFloor(write("floor.txt", FLOOR))
  expect(belowFloor(geometryOf(0.25, 0.8, 0.4), floor)).toEqual([])
})

test("a figure the board gives no answer to is not a zero, EVEN WHEN the file declares that floor", () => {
  // This test's first version declared only `track_width`, so the no-floor guard
  // returned before the no-figure guard was ever reached and a mutation deleting
  // the second survived the sweep. Each guard needs the other's case ABSENT to be
  // tested at all - which is the whole reason the sweep is run.
  const floor = readFabFloor(write("floor.txt", FLOOR))
  expect(floor.get("via_diameter")).toBe(0.8)
  expect(belowFloor(geometryOf(0.3, null, null), floor)).toEqual([])
})

test("a floor the file does not declare reports nothing, which is a limit of this tool and not a clean bill", () => {
  const floor = readFabFloor(write("floor.txt", "track_width = 0.25\n"))
  // The file declares no via floor, so a 0.1 mm via is not reported here - and that
  // limitation is the reason this tool is not the only gate on via geometry.
  expect(belowFloor(geometryOf(0.3, 0.1, 0.05), floor)).toEqual([])
})
