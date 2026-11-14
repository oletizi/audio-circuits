/**
 * Fixtures and helpers shared by the headless-update test files.
 *
 * WHY THIS EXISTS. `tests/pcb/update-from-schematic.test.ts` passed CLAUDE.md's
 * 500-line ceiling, and the seam it wanted was already there: the file held the
 * SUCCESS path - one end-to-end run and the contract over what it produces - and
 * eleven REFUSALS, which share nothing with it but their fixtures. Those are now
 * `tests/pcb/update-from-schematic.test.ts` and
 * `tests/pcb/update-refusals.test.ts`, and the fixtures they both need live here
 * rather than in a second copy. `tests/pcb/empty-board-fixture.test.ts` came out
 * of the same split and holds the provenance-and-drift contract over
 * `EMPTY_BOARD`.
 *
 * `tests/pcb/update-scratch-retention.test.ts` is deliberately NOT rewritten
 * onto this module. Its `netlistText` takes pre-rendered component and net
 * strings because it builds one netlist per guard, so it is a different helper
 * with the same name rather than a copy of this one, and collapsing the two
 * would mean giving one of them a shape it does not want.
 */
import { expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { freshTempScratch, tempScratchMatching } from "./temp-scratch.ts"
import { UpdateRefusal } from "../../tools/pcb/update-from-schematic.ts"
import type { UpdateGuard } from "../../tools/pcb/update-from-schematic.ts"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
export const CIRCUIT = path.join(REPO_ROOT, "circuits", "pt2399-core")
export const FIXTURES = path.join(REPO_ROOT, "tests", "fixtures", "pcb")
export const COMMITTED_BOARD = path.join(CIRCUIT, "pt2399-core.kicad_pcb")

/**
 * The board the tool can accept: EMPTY, and the real board's own bytes before it
 * was populated.
 *
 * THIS USED TO BE `circuits/pt2399-core/pt2399-core.kicad_pcb` AND CANNOT BE
 * AGAIN. Running the tool against the committed board - the deliberate act the
 * tool exists for - put 24 footprints on it, and R2 refuses a board that holds
 * any. Every refusal test then refused at `board-not-empty` instead of reaching
 * its own guard: 25 false reds, each reporting the wrong refusal rather than
 * reporting nothing.
 *
 * Its provenance, and the drift it could suffer, are the subject of
 * `tests/pcb/empty-board-fixture.test.ts`; that file is the authority and this
 * comment is not a second copy of it.
 */
export const EMPTY_BOARD = path.join(FIXTURES, "pt2399-core-empty", "pt2399-core.kicad_pcb")

export const SCRATCH_PREFIX = "pcb-update-test-"

/**
 * The tool's OWN scratch directories under TMPDIR, which
 * `tests/stripboard/temp-scratch.test.ts` cannot see: that audit scans `tests/`,
 * and these are made in `tools/`. They leaked on every refusal once, so the
 * count is asserted by the tests rather than left to a guard that is blind to
 * it - and `tests/pcb/update-scratch-retention.test.ts` holds the contract over
 * every guard.
 */
export function toolScratchDirs(): readonly string[] {
  return tempScratchMatching("pcb-update-")
}

/**
 * Removes the tool's own scratch directories a test file caused, and only those.
 *
 * `preExisting` is the caller's OWN snapshot, taken at its module load, because
 * only the caller knows which directories were not its to delete. The tool keeps
 * its scratch for a refusal whose message names a path inside it - that is the
 * retention rule, and tests drive such refusals deliberately - so those
 * directories are the test file's to clear up afterwards.
 */
export function cleanUpToolScratch(preExisting: ReadonlySet<string>): void {
  for (const dir of toolScratchDirs()) {
    if (!preExisting.has(dir)) fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** The pt2399-core schematic and project, with the empty board, copied to a scratch directory under one basename. */
export function scratchCircuit(): { dir: string; board: string; schematic: string } {
  const dir = freshTempScratch(SCRATCH_PREFIX)
  for (const extension of ["kicad_sch", "kicad_pro"]) {
    fs.copyFileSync(path.join(CIRCUIT, `pt2399-core.${extension}`), path.join(dir, `pt2399-core.${extension}`))
  }
  fs.copyFileSync(EMPTY_BOARD, path.join(dir, "pt2399-core.kicad_pcb"))
  return {
    dir,
    board: path.join(dir, "pt2399-core.kicad_pcb"),
    schematic: path.join(dir, "pt2399-core.kicad_sch"),
  }
}

export function refusalOf(body: () => unknown): UpdateRefusal {
  try {
    body()
  } catch (error) {
    if (error instanceof UpdateRefusal) return error
    throw error
  }
  throw new Error("expected an UpdateRefusal but nothing was thrown")
}

export function expectGuard(body: () => unknown, guard: UpdateGuard): UpdateRefusal {
  const refusal = refusalOf(body)
  expect(refusal.guard).toBe(guard)
  return refusal
}

export interface FakeComponent {
  readonly ref: string
  readonly value: string
  readonly footprint?: string
}

export interface FakeNet {
  readonly name: string
  readonly nodes: readonly { readonly ref: string; readonly pin: string }[]
}

/**
 * A `kicadsexpr` netlist in the shape `kicad-cli` writes, for the refusals that
 * are about a netlist's CONTENT - a nickname that does not resolve, a footprint
 * that is not in its library, a net member whose pad does not exist. Driving
 * those from the real schematic would mean editing the real schematic to be
 * wrong, which is a worse fixture than this.
 */
export function netlistText(components: readonly FakeComponent[], nets: readonly FakeNet[]): string {
  const comps = components
    .map((component, index) => {
      const footprint = component.footprint === undefined ? "" : `\n\t\t\t(footprint "${component.footprint}")`
      return (
        `\t\t(comp\n\t\t\t(ref "${component.ref}")\n\t\t\t(value "${component.value}")${footprint}\n` +
        `\t\t\t(fields\n\t\t\t\t(field\n\t\t\t\t\t(name "Description") "a fake component")\n\t\t\t)\n` +
        `\t\t\t(sheetpath\n\t\t\t\t(names "/")\n\t\t\t\t(tstamps "/")\n\t\t\t)\n` +
        `\t\t\t(tstamps "00000000-0000-4000-8000-00000000000${index}")\n\t\t)`
      )
    })
    .join("\n")
  const netForms = nets
    .map((net, index) => {
      const nodes = net.nodes
        .map((node) => `\t\t\t(node\n\t\t\t\t(ref "${node.ref}")\n\t\t\t\t(pin "${node.pin}")\n\t\t\t)`)
        .join("\n")
      return `\t\t(net\n\t\t\t(code "${index + 1}")\n\t\t\t(name "${net.name}")\n${nodes}\n\t\t)`
    })
    .join("\n")
  return `(export\n\t(version "E")\n\t(components\n${comps}\n\t)\n\t(nets\n${netForms}\n\t)\n)\n`
}

/** The `boardOut` the tool asked the writer for, read back out of the instruction file. */
export function boardOutOf(instructionsPath: string): string {
  const spec: unknown = JSON.parse(fs.readFileSync(instructionsPath, "utf8"))
  if (typeof spec !== "object" || spec === null || !("boardOut" in spec)) {
    throw new Error(`the instruction file at ${instructionsPath} has no boardOut`)
  }
  const out = spec.boardOut
  if (typeof out !== "string") throw new Error(`boardOut in ${instructionsPath} is not a string`)
  return out
}

/** Writes `text` as the export, in place of running kicad-cli. */
export function fakeExport(text: string): (schPath: string, outPath: string) => void {
  return (_schPath, outPath) => {
    fs.writeFileSync(outPath, text)
  }
}
