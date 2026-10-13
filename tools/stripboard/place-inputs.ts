/**
 * What one `place` run is graded against, assembled from the target it names:
 * the netlist, the reference nets, the footprints, the targets, the stock and
 * which way the strips run.
 *
 * THE AUTHORITY is the plan's Task 23, and `B1-frozen`'s own sentence for the
 * frozen half: *"against the exact electrical model, footprints and board
 * dimensions the hand layout was built for - 9 nets, 27 pins, and the grid the
 * fixture's own GRID line reports"*. Where this module and that document differ
 * the document wins and this comment is the defect.
 *
 * **IT IS A SEPARATE FILE FROM `./place.ts` FOR THE 500-LINE CEILING, AT THE
 * SEAM BETWEEN WHAT A BOARD IS AND WHAT A RUN DOES.** Everything here reads
 * declarations, exports and committed fixtures and produces the one `Prepared`
 * object the search is handed; nothing here searches, stops, grades or writes.
 * The two halves of the pair are the two halves of the asymmetry the repository
 * states in CLAUDE.md - *"for an existing design being brought in, the
 * schematic is authoritative and the model is derived from a netlist export"* -
 * and this is the file where that asymmetry lives.
 *
 * **IT WRITES NOTHING.** The reads of `boards/` are the declaration, the
 * circuit module and one `--dump-board` of the committed layout, which is where
 * the strip direction comes from: `--import` has no default direction, because
 * it is *"a fact about the board in hand"*, and the board in hand is the one
 * that states it.
 */
import fs from "node:fs"
import path from "node:path"
import { boardCircuitFrom } from "../perfboard/board-circuit.ts"
import { exportNetlistFor } from "../perfboard/check.ts"
import { assertDesignators, assertPinNumbers } from "../perfboard/circuit-exports.ts"
import { boardName, loadDeclaration } from "../perfboard/declaration.ts"
import { circuitFromModule, importCircuitModule } from "../perfboard/load.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { boardGeometry } from "./copper.ts"
import { referenceNetsFromExport, type ReferenceNets } from "./equivalence.ts"
import { stockFor, type Stock } from "./grade.ts"
import { refuse, type PlaceInput } from "./place-model.ts"
import type { StripboardRules } from "./rules.ts"
import type { SpawnVeroroute } from "./seed.ts"
import { stripsAcross, targetsFromReference } from "./targets-export.ts"
import { deriveTargets, type BoardTargets } from "./targets.ts"
import { lowBoostBoardIn } from "./verdict.ts"

/** Everything the search is handed, assembled from one target. */
export interface Prepared {
  readonly board: string
  readonly frozen: boolean | undefined
  readonly netlistText: string
  readonly reference: ReferenceNets
  readonly footprints: ReadonlyMap<string, string>
  readonly targets: BoardTargets
  readonly stock: Stock
  /** Which way the strips run, as the board in hand states it - `--import` has no default. */
  readonly strips: "horizontal" | "vertical"
}

/** `--import`'s direction flag, from a dump's own `VERTICAL_STRIPS` line. */
function stripsOf(dumpText: string): "horizontal" | "vertical" {
  return boardGeometry(dumpText).verticalStrips ? "vertical" : "horizontal"
}

/** A `--dump-board` of a board this run only READS - never a board it starts from. */
function dumpOf(board: string, spawn: SpawnVeroroute): string {
  const run = spawn(["--dump-board", board])
  if (run.status !== 0) {
    throw new Error(
      `place: --dump-board ${board} exited ${run.status}, so which way this board's strips run ` +
        `could not be read and --import has no default direction.\n${run.stderr}`,
    )
  }
  return run.stdout
}

/** The frozen footprint map, as the committed JSON holds it. */
function frozenFootprints(file: string): ReadonlyMap<string, string> {
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (error) {
    refuse(
      "place-footprints-malformed",
      `${file} could not be read as JSON: ${error instanceof Error ? error.message : "unknown"}`,
    )
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    refuse("place-footprints-malformed", `${file} does not hold a JSON object`)
  }
  const map = new Map<string, string>()
  for (const [ref, footprint] of Object.entries(parsed)) {
    if (typeof footprint !== "string" || footprint === "") {
      refuse("place-footprints-malformed", `${file} maps "${ref}" to ${JSON.stringify(footprint)}`)
    }
    map.set(ref, footprint)
  }
  if (map.size === 0) refuse("place-footprints-malformed", `${file} names no footprints at all`)
  return map
}

function requireFile(file: string, what: string): string {
  if (!fs.existsSync(file)) {
    refuse("place-frozen-companion-missing", `${what} is not at ${file}`)
  }
  return file
}

/** The frozen fixture's run: the model from its export, the rest from beside it. */
function prepareFrozen(
  fixture: string,
  netlist: string,
  rules: StripboardRules,
  repoRoot: string,
): Prepared {
  const board = lowBoostBoardIn(repoRoot)
  if (!path.basename(fixture).startsWith(board)) {
    refuse(
      "place-frozen-board-unnamed",
      `the fixture ${path.basename(fixture)} does not begin with "${board}"`,
    )
  }
  const base = fixture.replace(/\.vrt$/, "")
  const dumpText = fs.readFileSync(requireFile(`${base}.dump`, "the fixture's committed dump"), "utf8")
  const footprints = frozenFootprints(
    requireFile(`${base}.footprints.json`, "the fixture's footprint map"),
  )
  const netlistText = fs.readFileSync(netlist, "utf8")
  const reference = referenceNetsFromExport(netlistText)
  return {
    board,
    frozen: true,
    netlistText,
    reference,
    footprints,
    // `R` FROM THE FIXTURE'S OWN GRID, under its own strip axis. The stock
    // below is the owner's piece and is what HC6 measures the extent against;
    // this is the strip count the derived floor divides the nets over, and on
    // this board both answers give the same floor - N = 9 is under the
    // fixture's 14 and under the stock's 34, so max(0, N - R) is 0 either way.
    targets: targetsFromReference(reference, footprints, stripsAcross(dumpText), board),
    stock: stockFor(path.join(repoRoot, "boards", board, "perfboard.json"), rules),
    strips: stripsOf(dumpText),
  }
}

/** A declared board's run: everything from its own declaration and circuit. */
async function prepareBoard(
  directory: string,
  rules: StripboardRules,
  spawn: SpawnVeroroute,
): Promise<Prepared> {
  const declarationFile = path.join(directory, "perfboard.json")
  const declaration = loadDeclaration(declarationFile)
  const board = boardName(declaration)
  // ONE MODULE IMPORT, read twice: the network for the targets and the
  // designator index for the footprints. `loadBoardCircuit` does the second
  // half alone and would import the module again for the first.
  const module = await importCircuitModule(declaration)
  const network = circuitFromModule(module, declaration)
  const circuit = boardCircuitFrom(
    network,
    assertDesignators(module["DESIGNATORS"], declaration),
    assertPinNumbers(module["PIN_NUMBERS"], declaration),
  )
  const footprints = new Map<string, string>()
  for (const [ref, component] of circuit.byRef) {
    const footprint = component.part?.footprint
    if (footprint !== undefined) footprints.set(ref, footprint)
  }
  const netlistText = await exportNetlistFor(declaration)
  const stock = stockFor(declarationFile, rules)
  return {
    board,
    // NOT low-boost's frozen fixture. On low-boost this is what makes the run
    // report B1-current rather than B1-frozen (`V3`); off low-boost `A4` is
    // vacuous and `./verdict.ts` does not read it.
    frozen: board === lowBoostBoardIn(moduleRepoRoot()) ? false : undefined,
    netlistText,
    reference: referenceNetsFromExport(netlistText),
    footprints,
    targets: deriveTargets(network, stock.rows, board),
    stock,
    strips: stripsOf(dumpOf(declaration.vrtPath, spawn)),
  }
}

export function prepare(
  input: PlaceInput,
  repoRoot: string,
  spawn: SpawnVeroroute,
): Promise<Prepared> | Prepared {
  // NAMED BEFORE THE BRANCHES, so the refusal below can quote both fields: the
  // narrowing that makes each branch safe also narrows the input to `never`
  // once both have been excluded, and a refusal that cannot name what it was
  // handed is the kind this repository spent a fix wave removing.
  const named = `board ${String(input.board)} and frozen ${String(input.frozen)}`
  if (input.board !== undefined && input.frozen === undefined) {
    return prepareBoard(path.resolve(repoRoot, input.board), input.rules, spawn)
  }
  if (input.frozen !== undefined && input.board === undefined) {
    return prepareFrozen(
      path.resolve(repoRoot, input.frozen),
      path.resolve(repoRoot, input.netlist),
      input.rules,
      repoRoot,
    )
  }
  refuse("place-target-unstated", `this run named ${named}`)
}