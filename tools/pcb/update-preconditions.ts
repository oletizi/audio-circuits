/**
 * Everything the headless update checks BEFORE anything happens - the phase in
 * which nothing has run, nothing has been written, and no scratch directory
 * exists yet.
 *
 * THAT IS THE SEAM, and it is why these refusals live together: not one of them
 * can keep evidence, because there is nowhere for evidence to be. Every refusal
 * here therefore leaves `UpdateRefusal.keepsEvidence` at its default of false,
 * and that is a property of the phase rather than a choice made per throw.
 * `./update-from-schematic.ts` holds the refusals from the phase that CAN have
 * evidence, and the scratch lifecycle that decides.
 *
 * Split out of that file for length (the 300-line rule), on this boundary.
 */
import fs from "node:fs"
import path from "node:path"
import { defaultKicadPython } from "../../lib/kicad/install.ts"
import type { BoardSurvey } from "./board-survey.ts"
import { readBoard } from "./update-io.ts"
import { UpdateRefusal } from "./update-refusal.ts"

export interface PreconditionInputs {
  readonly boardPath: string
  readonly outputPath: string
  readonly schematicPath: string
  /** The interpreter to use. Defaults to `lib/kicad/install.ts`'s derived one. */
  readonly kicadPython?: string
}

export interface Preconditions {
  /** The input board as it was, including the `(setup)` keys R8 compares against. */
  readonly before: BoardSurvey
  readonly interpreter: string
}

/** R6. The interpreter must exist AND be executable. */
function requireInterpreter(interpreter: string): void {
  try {
    fs.accessSync(interpreter, fs.constants.X_OK)
  } catch {
    throw new UpdateRefusal(
      "python-interpreter",
      `no executable KiCad Python interpreter at ${interpreter}. pcbnew ships only inside KiCad's own bundled ` +
        "interpreter, so no system or uv-managed python3 can stand in for it. Set KICAD_PYTHON to the " +
        "interpreter that can import pcbnew.",
    )
  }
}

export function checkPreconditions(inputs: PreconditionInputs): Preconditions {
  if (!fs.existsSync(inputs.boardPath)) {
    throw new UpdateRefusal("invocation", `no board at ${inputs.boardPath}.`)
  }
  if (!fs.existsSync(inputs.schematicPath)) {
    throw new UpdateRefusal(
      "invocation",
      `no schematic at ${inputs.schematicPath}: there is nothing to update from.`,
    )
  }
  // CHECKED HERE, not at the copy: an output directory that does not exist used
  // to surface as a bare ENOENT from the final copyFileSync, which stranded a
  // wholly successful update - every check passed, the board was written in
  // scratch, and the caller got a raw filesystem error.
  const outputDir = path.dirname(path.resolve(inputs.outputPath))
  if (!fs.existsSync(outputDir)) {
    throw new UpdateRefusal(
      "invocation",
      `the output directory ${outputDir} does not exist, so ${inputs.outputPath} could not be written. It is ` +
        "not created here: a board written into a directory this tool invented is a board nobody will find, " +
        "and the schematic, project and board belong side by side under one basename.",
    )
  }

  // R2. The same read supplies the (setup) keys R8 compares against.
  const before = readBoard(inputs.boardPath, "input")
  if (before.footprints !== 0) {
    throw new UpdateRefusal(
      "board-not-empty",
      `${inputs.boardPath} already holds ${before.footprints} footprint(s), and this tool does not do ` +
        "incremental updates: the real updater matches existing footprints by UUID path, and reproducing that " +
        "is out of scope, so updating here would half-update or duplicate instead. The board must be empty of " +
        "footprints. Placement is regenerated from the schematic on every run, so re-deriving it costs a tool " +
        "run and not a person's work.",
    )
  }

  const interpreter = inputs.kicadPython ?? defaultKicadPython()
  requireInterpreter(interpreter)
  return { before, interpreter }
}
