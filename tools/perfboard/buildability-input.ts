/**
 * What the four admitted buildability verifiers are handed, assembled from a
 * declared board.
 *
 * **THE SEAM IS ACQUIRE VERSUS GRADE.** Nothing here decides a constraint:
 * `tools/stripboard/buildability.ts` grades, `tools/stripboard/constraints.ts`
 * holds the predicates, and this file's whole job is to produce an honest
 * `CheckInput` from a board on disk. It is the same division
 * `tests/stripboard/checkpoint-fixtures.ts` draws for the two checkpoint boards
 * - and that helper is a TEST fixture, so this is the production path rather
 * than a second copy of one: `make check` cannot read its inputs out of a
 * fixtures directory.
 *
 * **EVERY FIELD IS REAL AND NONE IS STUBBED.** `CheckInput` is one type for all
 * ten constraints, and the subset `make check` admits (`HC5`, `HC8`, `HC9`,
 * `HC10`) does not read `checkReport` or `stock`. They are still filled from the
 * run and from the board's own declaration, because a placeholder would be mock
 * data outside test code - which this repository forbids - and because a
 * `CheckInput` whose unread fields are fiction is one a later author would grade
 * the other six against. `parseCheckReport` refuses an output it cannot account
 * for line by line, loudly, which is the correct behaviour for a board whose
 * report grammar has moved.
 *
 * **THE FOOTPRINTS COME FROM THE CIRCUIT MODEL AND NOT FROM THE EXPORT.** The
 * netlist `make check` compares against is EESchema v1.1
 * (`lib/kicad/legacy-netlist.ts`), whose component field carries the VeroRoute
 * IMPORT STRING - `RESISTOR4`, `CAP_FILM2` - and not a KiCad footprint name. All
 * four admitted constraints are keyed by the KiCad footprint, so reading that
 * field would key every lookup on the wrong vocabulary and refuse every board by
 * name. `component.part.footprint` is the authority, which is the same field
 * `lib/kicad/from-network.ts` lowers the import string from.
 *
 * **OFF-BOARD COMPONENTS ARE NOT IN THE MAP, AND THAT IS NOT A SKIP.** VeroRoute
 * expands an off-board `PADS<n>` into n ONE-HOLE pads with board refs of their
 * own, and `footprintOf` (`tools/stripboard/constraints-model.ts`) exempts a
 * one-hole pad explicitly: it has no lead span to bound and no row structure to
 * orient, so the four checks are EMPTY on it rather than skipped. Anything with
 * two or more holes and no entry here refuses by name in that function.
 *
 * **THIS MODULE AND `./check.ts` IMPORT EACH OTHER, DELIBERATELY AND SAFELY.**
 * `./check.ts` calls `buildabilityInputFor`; this file reads `verorouteBinary`
 * and `assertOffBoardIds` from there, because duplicating either would be a
 * second copy of a refusal rule. Neither module calls the other at MODULE
 * EVALUATION TIME - every crossing is a `function` declaration, which is hoisted
 * and bound before either body runs - so the cycle has no initialisation order
 * to get wrong. It is recorded here rather than left for a reader to find,
 * because the way it WOULD break is somebody adding a top-level `const` that
 * calls across it.
 */
import { spawnSync } from "node:child_process"
import { parseBoardDump } from "../guide/dump.ts"
import { referenceNetsFromExport } from "../stripboard/equivalence.ts"
import { parseCheckReport } from "../stripboard/check-report.ts"
import { stockFor } from "../stripboard/grade.ts"
import { loadRules } from "../stripboard/rules.ts"
import type { CheckInput } from "../stripboard/constraints-model.ts"
import { assertDesignators } from "./circuit-exports.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { isRecord } from "./guards.ts"
import { loadCircuit } from "./load.ts"
import { moduleRepoRoot } from "./repo-root.ts"
import { assertOffBoardIds, verorouteBinary, type CheckRun, type Env } from "./check.ts"

/**
 * `--dump-board` on one layout, as the geometry every one of the four reads.
 *
 * A DUMP THAT DID NOT RUN IS A REFUSAL AND NEVER AN EMPTY BOARD. An empty dump
 * parses to a board with no parts, on which every span and pattern check holds
 * vacuously - which is precisely the shape of a skipped check that looks like a
 * passing one.
 */
export function dumpBoard(
  vrtPath: string,
  repoRoot: string = moduleRepoRoot(),
  env: Env = process.env,
): string {
  const binary = verorouteBinary(env, repoRoot)
  const run = spawnSync(binary, ["--dump-board", vrtPath], { encoding: "utf8" })
  if (run.error) {
    throw new Error(
      `could not run veroroute at ${binary} to dump ${vrtPath}: ${run.error.message}. The four ` +
        "buildability constraints read the board's geometry from --dump-board, so without it " +
        "there is no verdict about this layout at all. Rebuild the binary with the " +
        '"veroroute" verb (`bun run perfboard veroroute`), or check that VEROROUTE points at a ' +
        "real executable.",
    )
  }
  const stdout = typeof run.stdout === "string" ? run.stdout : ""
  const stderr = typeof run.stderr === "string" ? run.stderr : ""
  if (run.status !== 0) {
    throw new Error(
      `veroroute --dump-board ${vrtPath} exited ${String(run.status)}, so this board's geometry ` +
        "could not be read and HC5, HC8, HC9 and HC10 have no verdict about it. This is NOT " +
        "defaulted to an empty dump: an empty board satisfies every span and pattern check " +
        `vacuously.\n${stdout}${stderr}`,
    )
  }
  return stdout
}

/**
 * Designator -> the KiCad footprint the part is fitted with, for the ON-BOARD
 * components of one declared circuit.
 *
 * It refuses an empty map, because a board with no footprint-keyed part is a
 * board on which all four admitted constraints hold by having nothing to look
 * at - and `make check` would print four passes about nothing.
 */
export async function boardFootprints(
  declaration: PerfboardDeclaration,
): Promise<ReadonlyMap<string, string>> {
  const network = await loadCircuit(declaration)
  const imported: unknown = await import(declaration.circuitPath)
  if (!isRecord(imported)) {
    throw new Error(
      `${declaration.file}: the module at ${declaration.circuitPath} did not import as an object`,
    )
  }
  const designators = assertDesignators(imported["DESIGNATORS"], declaration)
  const offBoard = assertOffBoardIds(imported["OFF_BOARD_IDS"], declaration)
  const footprints = new Map<string, string>()
  for (const component of network.components) {
    if (offBoard.has(component.id)) continue
    const designator = designators[component.id]
    if (designator === undefined) {
      throw new Error(
        `${declaration.file}: no designator is mapped for on-board component "${component.id}", ` +
          "so its footprint cannot be keyed to anything the board dump reports. Every component " +
          "must appear in DESIGNATORS; this is not defaulted, because a part with no designator " +
          "is a part HC5, HC8, HC9 and HC10 would silently skip.",
      )
    }
    const footprint = component.part?.footprint
    if (footprint === undefined) {
      throw new Error(
        `${declaration.file}: on-board component "${component.id}" (${designator}) has no ` +
          "part.footprint. HC5 and HC9 read the family's span bounds from it and HC10 reads the " +
          "pin pattern, so a part with none is a part three hard constraints would skip. Give " +
          "the component a part.footprint, or declare it off-board in OFF_BOARD_IDS if it is " +
          "panel-mount.",
      )
    }
    footprints.set(designator, footprint)
  }
  if (footprints.size === 0) {
    throw new Error(
      `${declaration.file}: this circuit declares no on-board component with a footprint at all, ` +
        "so HC5, HC8, HC9 and HC10 would each hold over nothing and report a pass about no part. " +
        "This refuses rather than reporting four vacuous passes.",
    )
  }
  return footprints
}

/** What `buildabilityInputFor` needs injected so no test has to produce a real board. */
export interface BuildabilityInputDeps {
  readonly dumpBoard?: (vrtPath: string) => string
  readonly footprints?: (declaration: PerfboardDeclaration) => Promise<ReadonlyMap<string, string>>
  readonly repoRoot?: string
}

/**
 * The `CheckInput` the four admitted constraints are graded over.
 *
 * `netlistText` IS THE EXPORT `--check` WAS RUN AGAINST, passed in rather than
 * re-exported here: `exportNetlistFor` stamps the moment it ran into the
 * export's header, so a second export is a different string, and `HC8` would be
 * comparing the copper against a netlist nothing else in the run saw.
 *
 * `dumpText` AND `dump` COME FROM ONE STRING, which `CheckInput`'s own contract
 * requires - `HC8` reads the text and the rest read the parse, and two reads of
 * two strings would hand the grader two different boards.
 */
export async function buildabilityInputFor(
  declaration: PerfboardDeclaration,
  netlistText: string,
  run: CheckRun,
  deps: BuildabilityInputDeps = {},
): Promise<CheckInput> {
  const repoRoot = deps.repoRoot ?? moduleRepoRoot()
  const dumpText = (deps.dumpBoard ?? ((vrt: string) => dumpBoard(vrt, repoRoot)))(
    declaration.vrtPath,
  )
  const footprints = await (deps.footprints ?? boardFootprints)(declaration)
  const rules = loadRules()
  return {
    dumpText,
    dump: parseBoardDump(dumpText),
    reference: referenceNetsFromExport(netlistText),
    footprints,
    checkReport: parseCheckReport(run),
    stock: stockFor(declaration.file, rules),
    rules,
  }
}
