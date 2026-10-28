/**
 * **JUDGE A SHEET NOBODY HERE GENERATED.**
 *
 * The draughtsmanship practice separates two jobs that `lib/schgen/` currently does together:
 * deciding where the parts go, and checking that the resulting drawing still says the circuit.
 * The first is being handed to an agent with a drafting library; the second is this file, and it
 * is UNCHANGED BY THAT MOVE - it is the repository's own gate, pointed at an arbitrary
 * `.kicad_sch` instead of at the one the generator just wrote.
 *
 * **WHY THIS IS THE PIECE THAT HAD TO EXIST FIRST.** `CLAUDE.md`: *"An agent may never author the
 * acceptance criteria for the artifact it is producing."* An agent that places parts and then
 * decides whether its own placement is acceptable is the failure that rule names. The criteria
 * reach the drawing through this program, which is derived from the circuit model and knows
 * nothing about who drew the sheet or how.
 *
 * **IT ADDS NO MEASUREMENT OF ITS OWN.** Connectivity is
 * `lib/schgen/gates/connectivity.ts`'s `compareConnectivity`, which has fourteen tests and
 * predates this file. ERC and the render are `kicad-cli`. The only new code here is the glue that
 * lets all three take a sheet path as an argument, because `tools/schgen/verify.ts`'s `runGates`
 * re-generates the sheet it checks and so cannot be asked about one it did not write.
 *
 * **WHAT IT DOES NOT CHECK: whether the drawing is LEGIBLE.** Connectivity and ERC are a
 * correctness floor - they would pass a sheet with every value struck through by a wire, and on
 * `pultec-low-boost` they did exactly that. Legibility is a separate gate and is deliberately not
 * invented here.
 *
 *     bun tools/draught/gate.ts <board> <sheet.kicad_sch> [--pdf <out.pdf>]
 */

import fs from "node:fs"
import path from "node:path"
import { caseResolver, type ParityCase } from "../schgen/authoring-census.ts"
import { ALL_DECLARED_CASES } from "../schgen/board-declarations.ts"
import { parityDesign } from "../schgen/gate-census.ts"
import { generateReported, type GenerateEnv } from "../schgen/generate.ts"
import { exportPdf, kicadVersion, runErc } from "../schgen/kicad-run.ts"
import { exportSexprNetlist } from "../schgen/verify.ts"
import { compareConnectivity, expectedConnectivity } from "../../lib/schgen/gates/connectivity.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

export interface SheetVerdict {
  readonly board: string
  readonly sheet: string
  /** Connectivity problems, verbatim from `compareConnectivity`. Empty means the drawing agrees. */
  readonly connectivity: readonly string[]
  readonly ercErrors: number
  readonly ercWarnings: number
  readonly ercReport: string
  /** Where the page went, so the caller can open it. Null when no render was asked for. */
  readonly pdf: string | null
}

/**
 * The board's circuit model and designator map - the AUTHORITY the sheet is judged against.
 *
 * It runs the generator to obtain them, which looks circular and is not: what is taken is
 * `circuit` and `annotation.refs`, both derived from `circuits/`, and the generated SHEET is
 * discarded. `initLock` is false so the run only reads and writes nothing.
 *
 * **THE DESIGNATOR MAP COMES FROM BESIDE THE SHEET, not from a scratch directory.** `R4` is a
 * fact about one particular drawing (`CLAUDE.md`: *"Ids are semantic; designators belong to
 * KiCad"*), so the `refs.lock.json` that names the sheet's parts is the sheet's own. Reading a
 * different one would compare the circuit against a drawing of the same circuit under other
 * names, and report every part as missing.
 */
async function authorityOf(board: ParityCase, repoRoot: string, sheetDir: string) {
  const lock = path.join(sheetDir, "refs.lock.json")
  if (!fs.existsSync(lock)) {
    throw new Error(
      `no refs.lock.json beside the sheet at ${sheetDir}. That file maps the circuit model's ` +
        `semantic ids to the designators this drawing uses, and without it there is no way to ` +
        `tell whether the sheet's R1 is the model's input_bias_resistor. It is not defaulted to ` +
        `an empty map, because an empty map reports every part as unreferenced - a loud failure ` +
        `that looks like a drawing fault rather than a missing file.`,
    )
  }
  const design = parityDesign(board, caseResolver([board]), repoRoot, sheetDir)
  const env: GenerateEnv = {
    kicadVersion: kicadVersion(),
    stockDir: stockSymbolDir(),
    initLock: false,
    acceptToolchain: true,
  }
  const g = await generateReported(design, env)
  return { circuit: g.circuit, refs: g.annotation.refs }
}

export function findBoard(name: string): ParityCase {
  const found = ALL_DECLARED_CASES.find((c) => c.name === name)
  if (found === undefined) {
    const known = ALL_DECLARED_CASES.map((c) => c.name).sort().join("\n  ")
    throw new Error(
      `no board is declared as "${name}", so there is no circuit model to judge a sheet against. ` +
        `It is not defaulted to the first board because a gate that silently judged the wrong ` +
        `circuit would pass a drawing of something else. Declared boards:\n  ${known}`,
    )
  }
  return found
}

export async function judgeSheet(
  name: string,
  sheetPath: string,
  pdfOut: string | null,
): Promise<SheetVerdict> {
  if (!fs.existsSync(sheetPath)) {
    throw new Error(
      `no schematic at ${sheetPath}. This program judges a sheet that already exists - it does ` +
        `not generate one, which is the whole point of it. Pass the ROOT .kicad_sch of the ` +
        `drawing you want judged.`,
    )
  }
  const board = findBoard(name)
  const repoRoot = moduleRepoRoot()
  const { circuit, refs } = await authorityOf(board, repoRoot, path.dirname(path.resolve(sheetPath)))

  const net = exportSexprNetlist(sheetPath)
  const connectivity = compareConnectivity(
    expectedConnectivity(circuit, refs),
    importNetlist(net.text),
    net.stderr,
  )

  const erc = runErc(sheetPath, "all")

  let pdf: string | null = null
  if (pdfOut !== null) {
    fs.mkdirSync(path.dirname(pdfOut), { recursive: true })
    exportPdf(sheetPath, pdfOut)
    pdf = pdfOut
  }

  return {
    board: name,
    sheet: sheetPath,
    connectivity,
    ercErrors: erc.errors,
    ercWarnings: erc.warnings,
    ercReport: erc.report,
    pdf,
  }
}

export function reportVerdict(v: SheetVerdict): string {
  const lines: string[] = []
  lines.push(`${v.board}: ${v.sheet}`)
  lines.push("")
  if (v.connectivity.length === 0) {
    lines.push("CONNECTIVITY: the drawing says the same circuit as the model.")
  } else {
    lines.push(`CONNECTIVITY: ${v.connectivity.length} problem(s) - the drawing says something else.`)
    for (const p of v.connectivity) lines.push(`  - ${p}`)
  }
  lines.push(`ERC: ${v.ercErrors} error(s), ${v.ercWarnings} warning(s)`)
  if (v.pdf !== null) lines.push(`PAGE: ${v.pdf}`)
  lines.push("")
  lines.push(
    "This says nothing about whether the drawing is READABLE. Open the page and look at it.",
  )
  return lines.join("\n")
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const pdfAt = args.indexOf("--pdf")
  const pdfOut = pdfAt === -1 ? null : args[pdfAt + 1] ?? null
  if (pdfAt !== -1 && pdfOut === null) {
    throw new Error("--pdf needs a path to write the page to; it is not defaulted.")
  }
  const positional = args.filter((_, i) => pdfAt === -1 || (i !== pdfAt && i !== pdfAt + 1))
  const [board, sheet] = positional
  if (board === undefined || sheet === undefined) {
    throw new Error(
      "usage: bun tools/draught/gate.ts <board> <sheet.kicad_sch> [--pdf <out.pdf>]\n" +
        "Neither argument is defaulted: the board names the circuit model that is the authority, " +
        "and the sheet is the drawing being judged.",
    )
  }
  const verdict = await judgeSheet(board, sheet, pdfOut)
  console.log(reportVerdict(verdict))
  process.exitCode = verdict.connectivity.length === 0 && verdict.ercErrors === 0 ? 0 : 1
}
