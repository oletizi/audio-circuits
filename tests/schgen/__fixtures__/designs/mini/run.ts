/**
 * Test support for the ported `mini` design fixture: the design file's path, and a `LoadedDesign`
 * whose `outDir` is a fresh registered scratch directory.
 *
 * **HAND-WRITTEN, NOT A PORT, AND NOT A SECOND FIXTURE.** The pedals source has an equivalent
 * (`__fixtures__/designs/mini/generateTmp.ts`); it is not ported because it makes its temp
 * directory inside an object literal rather than assigning it to a named const, so this
 * repository's static temp-scratch guard counts it as an unnamed site and a ported file may not be
 * hand-edited. (The call is deliberately not spelled out above: the guard sweeps file TEXT, so a
 * comment quoting it becomes a site of its own.) Here the directory comes from `freshTempScratch`,
 * which registers it, and
 * every caller arms `afterAll(cleanUpTempScratch)`. `docs/known-gaps.md` **G122** and **G123**
 * record the general shape of this cost; what it costs HERE is that nothing byte-checks this file
 * against its pedals counterpart.
 *
 * The DESIGN itself - every part, net, block, template and anchor - is the ported fixture next to
 * this file. Nothing here arranges anything.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { freshTempScratch } from "../../../../support/temp-scratch.ts"
import type { LoadedDesign } from "../../../../../lib/schgen/design.ts"
import { design } from "./index.ts"

/** The design module itself, as the `schgen` CLI takes it on the command line. */
export const MINI_DESIGN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "index.ts")

/**
 * The mini design with its `outDir` pointed at a fresh registered scratch directory, so a
 * generation never writes into the repository and never into a directory a later run reuses.
 *
 * It does NOT call `loadDesign`, deliberately: that function is `async` and exists to prove a
 * module exports a `DesignSpec` across a dynamic import, which is a different claim from the ones
 * the tests here make. The spec is imported statically so a mistake in it is a type error.
 */
export function miniInScratch(): LoadedDesign {
  const dir = path.dirname(MINI_DESIGN_FILE)
  return { file: MINI_DESIGN_FILE, dir, spec: design, outDir: freshTempScratch("schgen-mini-") }
}
