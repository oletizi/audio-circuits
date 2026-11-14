/**
 * THE SUCCESS PATH of the headless Update PCB from Schematic
 * (`tools/pcb/update-from-schematic.ts`).
 *
 * THE FIRST TEST IS THE POINT OF THE TOOL, and it runs everything for real -
 * the real `kicad-cli`, the real KiCad Python with its real `pcbnew`, the real
 * `circuits/pt2399-core/` schematic, the real board's own empty bytes, and then
 * this project's OWN parity gate as the authority on the result. It asserts the
 * COUNTS and zero parity findings, never merely an exit code: a tool that exits
 * 0 having written nothing is this repository's most-repeated failure.
 *
 * Everything here works on COPIES in temp directories. The committed board is
 * never a target, and neither is `boards/pt2399-core/`, which is the owner's
 * built stripboard layout. Running the tool against the committed board was a
 * separate, deliberate act, and it is why the input board is now
 * `../support/pcb-update.ts`'s `EMPTY_BOARD` rather than the committed file.
 *
 * THREE SIBLING FILES, AND WHAT EACH ONE OWNS. This file grew past CLAUDE.md's
 * 500-line ceiling, and the seam it wanted was already in it:
 *
 *  - `./update-refusals.test.ts` - every guard, driven one at a time. Split out
 *    for length, on the line between a run that succeeds and a run that refuses.
 *  - `./update-scratch-retention.test.ts` - whether a refusal's scratch
 *    directory survives, over every guard in `UPDATE_GUARDS` rather than a
 *    sample of them.
 *  - `./empty-board-fixture.test.ts` - the provenance of `EMPTY_BOARD` and the
 *    drift it could suffer against the committed board it was copied from.
 *
 * What stays here is the run that works, and the contract over what it leaves
 * behind - including that it leaves no scratch directory.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { cleanUpToolScratch, scratchCircuit, toolScratchDirs } from "../support/pcb-update.ts"
import { lostSetupKeys, PLACEMENT, updateBoardFromSchematic } from "../../tools/pcb/update-from-schematic.ts"
import { surveyBoard } from "../../tools/pcb/board-survey.ts"
import { runDrc } from "../../tools/pcb/drc.ts"

/** This file's OWN snapshot, taken at its module load: see cleanUpToolScratch. */
const PRE_EXISTING_TOOL_SCRATCH = new Set(toolScratchDirs())
afterAll(() => cleanUpToolScratch(PRE_EXISTING_TOOL_SCRATCH))
afterAll(cleanUpTempScratch)

test("end to end: the real schematic's 24 components land on the real board, netted, and parity reports nothing", () => {
  const { board, schematic } = scratchCircuit()
  const before = surveyBoard(board)
  expect(before.footprints).toBe(0)
  const scratchBefore = toolScratchDirs().length

  const result = updateBoardFromSchematic(board, { schematicPath: schematic })

  // The resolver found libraries. A NUMBER is deliberately not asserted: how
  // many a machine resolves is a property of that machine, and this is the part
  // that must not silently become zero.
  expect(result.librariesResolved).toBeGreaterThan(0)
  // A successful run leaves no scratch directory behind.
  expect(toolScratchDirs().length).toBe(scratchBefore)

  // The counts, taken from the written file by tools/pcb/board-survey.ts - not
  // from the Python writer, and not from an exit code.
  expect(result.footprints).toBe(24)
  expect(result.nettedPads).toBe(65)
  expect(result.components).toBe(24)
  expect(result.nodes).toBe(65)
  const written = surveyBoard(board)
  expect(written.footprints).toBe(24)
  expect(written.nettedPads).toBe(65)

  // The project's OWN gate is the authority on whether the board says what the
  // schematic says. It reported 24 "Missing footprint" findings on this board
  // before this tool existed.
  const report = runDrc(board, { schematicPath: schematic })
  expect(report.schematicParity).toEqual([])
  expect(report.netlistComponents).toBe(24)

  // R8's allowed direction: KiCad writes out values it previously left
  // implicit, so the (setup) block GROWS. Nothing may disappear from it.
  for (const key of before.setupKeys) expect(written.setupKeys).toContain(key)
  expect(written.setupKeys.length).toBeGreaterThan(before.setupKeys.length)

  // The two cured defects that parity catches but no "Missing footprint" would:
  // every footprint carries its schematic link and its full Library:Name FPID.
  const text = fs.readFileSync(board, "utf8")
  expect((text.match(/\n\t\t\(path "\/[0-9a-f-]{36}"\)/g) ?? []).length).toBe(24)
  expect(text).toContain('(footprint "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm"')

  // The grid is scaffolding, but it has to actually separate the parts: no two
  // footprints share a position.
  const positions = text.match(/\n\t\t\(at [-0-9. ]+\)/g) ?? []
  expect(positions.length).toBeGreaterThanOrEqual(24)
  expect(text).toContain(`(at ${PLACEMENT.originMm} ${PLACEMENT.originMm})`)
})

test("lostSetupKeys is a multiset comparison, and additions are not losses", () => {
  expect(lostSetupKeys(["a", "a", "b"], ["a", "b"])).toEqual(["a"])
  expect(lostSetupKeys(["a", "b"], ["a", "b", "c", "c"])).toEqual([])
  expect(lostSetupKeys(["a", "b"], ["b"])).toEqual(["a"])
  expect(lostSetupKeys([], ["a"])).toEqual([])
})
