/**
 * THE CONTRACT OVER `tests/fixtures/pcb/pt2399-core-placed/pt2399-core.kicad_pcb`:
 * what it is, that it has not drifted from the board it is a copy of, and that
 * it still has the two properties the tooling tests take from it.
 *
 * WHY A COPY OF A LIVE ARTIFACT EXISTS. On 2026-11-17 the owner adopted the
 * routed candidate as `circuits/pt2399-core/pt2399-core.kicad_pcb` in order to
 * hand-edit it in KiCad, and that file stopped being the output of any tool
 * here. Eight tests were reading it for properties only the agent-produced board
 * has - byte-for-byte reproducibility from the mounting-hole placer, its own
 * six-decimal coordinate spelling, and the absence of a ground zone - and all
 * eight broke. `../fixtures/pcb/pt2399-core-placed/NOTES.txt` records which, and
 * `./placed-board.ts` holds the dividing line between a test of the tooling and
 * a test of the deliverable.
 *
 * THE FIXTURE IS NOT WHAT KEEPS THE DELIVERABLE HONEST, and that is the thing to
 * know before adding a test here. Schematic parity, DRC including the owner's
 * 2 mm courtyard rule, the floorplan grade and the silkscreen widths all still
 * read HIS board, and they are what must fail when a hand edit breaks a rule. A
 * claim about the board being shipped does not belong in this file.
 */
import { test, expect } from "bun:test"
import crypto from "node:crypto"
import fs from "node:fs"
import { surveyBoard } from "../../tools/pcb/board-survey.ts"
import { outlineBounds } from "../../tools/pcb/resolve-intent-zones.ts"
import { COMMITTED_BOARD } from "../support/pcb-update.ts"
import { PLACED_BOARD, placedBoardText } from "./placed-board.ts"

/**
 * The fixture's provenance, PINNED IN CODE rather than asserted in prose.
 *
 * These are the bytes committed by f3b295b, "pcb: stop the hole placer deleting
 * real parts, and make its output idempotent" - the last commit that wrote this
 * board while it was still an agent artifact. `NOTES.txt` beside the file can
 * only state that; this is what makes it fail if the file is ever edited by
 * hand, and a deliberate re-baseline is then a deliberate edit to this constant.
 *
 * The commit hash is NOT checked here, for the reason
 * `./empty-board-fixture.test.ts` gives: resolving it would couple a unit test
 * to a subprocess and to history staying rewrite-free. The hash identifies the
 * bytes; the commit is where they came from.
 */
const FIXTURE_SHA256 = "0edd54288814139370b930d611d2732e6f28264384d15dd2f4f37d2349bda1b0"

/** Every footprint reference on a board, in sorted order. */
function referencesOf(text: string): readonly string[] {
  return [...text.matchAll(/\(property "Reference" "([^"]*)"/g)].map((m) => m[1] ?? "").sort()
}

test("the fixture is the exact bytes its provenance claims", () => {
  const sha = crypto.createHash("sha256").update(fs.readFileSync(PLACED_BOARD)).digest("hex")
  expect(sha).toBe(FIXTURE_SHA256)
})

test("the fixture carries every part, which is the first property the tooling tests take from it", () => {
  const fixture = surveyBoard(PLACED_BOARD)
  // 24 circuit parts plus the four M3 mounting holes.
  expect(fixture.footprints).toBe(28)
  expect(fixture.nettedPads).toBeGreaterThan(0)
  // And it is the real 150 x 100 mm board rather than a reduced one: the size
  // is the owner's ruling, recorded in floorplan-intent.json's envelope.size_mm.
  const outline = outlineBounds(placedBoardText(), PLACED_BOARD)
  expect(outline.x1 - outline.x0).toBeCloseTo(150, 6)
  expect(outline.y1 - outline.y0).toBeCloseTo(100, 6)
})

test("the fixture carries no copper, which is the second property and the one the pour tests depend on", () => {
  const text = placedBoardText()
  // The pour-refill tests build their subject by adding ONE full-board ground
  // zone. A second ground zone is refused at `board-shape` when the two declare
  // different thermal gaps, which is what adopting the routed board did to them.
  expect(text).not.toContain("filled_polygon")
  expect([...text.matchAll(/\(segment/g)]).toHaveLength(0)
  // The four mounting-hole keepout Rule Areas are NOT copper and must survive:
  // they are part of the settled geometry the placer is checked against.
  expect([...text.matchAll(/\(vias not_allowed\)/g)]).toHaveLength(4)
})

test("the fixture still describes the same circuit as the owner's board", () => {
  // THE DRIFT CHECK, and it is by REFERENCE rather than by bytes or positions
  // on purpose. The owner moves parts and KiCad reformats the whole file on
  // every save, so neither of those is drift. A part appearing or disappearing
  // IS: the tooling tests would then be checking the placer against a circuit
  // the board no longer has.
  expect(
    referencesOf(placedBoardText()),
    "the owner's board and this fixture no longer carry the same parts. Either the board gained or lost a part " +
      "and this fixture needs re-baselining from the commit that produced it (and FIXTURE_SHA256 updating with " +
      "it), or a part was removed by accident - decide which, rather than relaxing this comparison.",
  ).toEqual(referencesOf(fs.readFileSync(COMMITTED_BOARD, "utf8")))
})
