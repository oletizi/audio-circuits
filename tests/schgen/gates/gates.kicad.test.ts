/**
 * Ported from digital-pedal-platform's `tools/schgen/integration/gates.test.ts` and DIVERGED
 * from it by Task 11 of the M1 schematic-authoring plan.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, and re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**.
 * Its `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md`.
 *
 * **GATES 3 AND 6 ON A REAL GENERATED SCHEMATIC, THROUGH THE REAL `kicad-cli`** - the only place
 * either gate meets an artifact rather than a fixture. It **fails rather than skips** when
 * `kicad-cli` is missing (owner directive, **G169**); `lib/kicad/install.ts` holds the
 * per-platform defaults and nothing here writes a path.
 *
 * **WHAT DIVERGED.** Three substitutions, no deletions and no changed assertion:
 *
 *  - the generation harness is `miniInScratch()` (`__fixtures__/designs/mini/run.ts`) plus
 *    `generate`/`writeGeneration` here, rather than pedals' `generateMiniInTmp`, which is not
 *    ported: it makes its temp directory inside an object literal and this repository's static
 *    temp-scratch guard counts that as an unnamed site. `freshTempScratch` registers the
 *    directory instead and `afterAll(cleanUpTempScratch)` removes it, which is why there is no
 *    `rmSync` of an `outDir` here.
 *  - gate 3 reads the s-expression export with `importNetlist` rather than `kicadxml` with
 *    `connectivityFromXml` (see `tools/schgen/verify.ts`'s divergence 1): ONE netlist reader, and
 *    no XML parser in the tree.
 *  - the pin-table directory is read through the design's own `pinTables` field rather than from
 *    a path written out again here, since the two were the same path twice.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch } from "../../support/temp-scratch.ts"
import { miniInScratch } from "../__fixtures__/designs/mini/run.ts"
import { importNetlist, KICAD_CLI } from "../../../lib/kicad/netlist.ts"
import type { LoadedDesign } from "../../../lib/schgen/design.ts"
import { compareConnectivity, expectedConnectivity } from "../../../lib/schgen/gates/connectivity.ts"
import { checkPinIdentity, footprintPads } from "../../../lib/schgen/gates/pin-identity.ts"
import { loadPinTables } from "../../../lib/schgen/gates/pin-table.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { generate, writeGeneration, type Generation } from "../../../tools/schgen/generate.ts"
import { stockFootprintTable } from "../../../tools/schgen/kicad-config.ts"
import { kicadVersion } from "../../../tools/schgen/kicad-run.ts"
import { exportSexprNetlist } from "../../../tools/schgen/verify.ts"

afterAll(cleanUpTempScratch)

interface MiniRun {
  readonly d: LoadedDesign
  readonly g: Generation
}

/** Generate the mini design into a fresh registered scratch outDir (new reference lock) and write it. */
function generateMiniInScratch(): MiniRun {
  const d = miniInScratch()
  const g = generate(d, { kicadVersion: kicadVersion(), stockDir: stockSymbolDir(), initLock: true, acceptToolchain: false })
  writeGeneration(d, g)
  return { d, g }
}

function requireKicadCli(): void {
  if (fs.existsSync(KICAD_CLI)) return
  throw new Error(
    `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI (lib/kicad/install.ts ` +
      "holds the per-platform defaults). These tests do NOT skip: they are the only place gates 3 " +
      "and 6 meet a real generated schematic, and a skipped check resembles a passing one.",
  )
}

describe("gates on the generated fixture design", () => {
  let run: MiniRun | null = null
  beforeAll(() => {
    requireKicadCli()
    run = generateMiniInScratch()
  }, 120_000)
  const mini = (): MiniRun => {
    if (run === null) throw new Error("mini design was not generated")
    return run
  }

  const gate3 = ({ d, g }: MiniRun): string[] => {
    const net = exportSexprNetlist(path.join(d.outDir, "mini.kicad_sch"))
    return compareConnectivity(expectedConnectivity(g.circuit, g.annotation.refs), importNetlist(net.text), net.stderr)
  }

  it("gate 3: the exported netlist equals the IR", () => {
    expect(gate3(mini())).toEqual([])
  }, 120_000)

  it("gate 3 catches a hand-moved wire end", () => {
    // A generation of its own: this test edits the schematic on disk.
    const moved = generateMiniInScratch()
    const file = path.join(moved.d.outDir, "power.kicad_sch")
    const text = fs.readFileSync(file, "utf8")
    const firstWire = /\(wire\s*\(pts\s*\(xy ([-\d.]+) ([-\d.]+)\)/.exec(text)
    if (firstWire?.[1] === undefined) throw new Error("power.kicad_sch has no wire")
    const shifted = firstWire[0].replace(`(xy ${firstWire[1]} `, `(xy ${Number(firstWire[1]) + 1.27} `)
    fs.writeFileSync(file, text.replace(firstWire[0], shifted))
    const problems = gate3(moved)
    expect(problems.filter((p) => /^(net |internal net |schematic has an unlabelled net |pin )/.test(p)).length, problems.join("\n")).toBeGreaterThan(0)
  }, 120_000)

  it("gate 6: pin identity holds with real footprints and the fixture pin table", () => {
    const { d, g } = mini()
    // Footprints resolve through the fp-lib-table generation wrote into the scratch outDir, then
    // the install's default table.
    if (d.spec.pinTables === null) throw new Error("the mini design declares no pinTables directory")
    const tables = loadPinTables(path.resolve(d.dir, d.spec.pinTables))
    expect([...tables.keys()], "the pin table gate 6 compares the MPN-overridden op-amp against").toEqual(["OPA1688"])
    expect(checkPinIdentity(g.circuit, g.symbols, tables, footprintPads(d.outDir, stockFootprintTable(KICAD_CLI, kicadVersion())), new Set())).toEqual([])
  }, 120_000)
})
