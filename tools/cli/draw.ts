/**
 * `make draw` - THE VERB THAT ABSORBS THE DRAUGHTING MECHANICS.
 *
 * Five run directories under `docs/research/` each hand-wrote the same six
 * mechanical steps: check the toolchain, resolve an intent, verify it against
 * the model, draft with copperhead, render with `kicad-cli`, run the
 * measurement suite and write a crop. `TOOLING.md`'s loop and
 * `.superpowers/sdd/2026-10-30-institutionalise-draughting/task-5-brief.md`
 * name that order; this module is the glue, not a new algorithm - "i want to
 * reuse and glue together agent-driven tooling" (`TOOLING.md`). The drafting
 * and intent-handling half lives in `../draught/draw-draft.ts`; the
 * re-paper/render/measure half lives in `../draught/draw-render.ts`
 * (Task 5 fix round 1, M-1: this file was 557 lines on its own, over this
 * project's 300-500 ceiling).
 *
 * **IT IS A MECHANICAL DRAFT, NOT A FINISHED PAGE - SAID HERE, NOT LEFT
 * IMPLICIT.** A successful run's own report states this plainly (the same
 * fix `draught-doctor` already applies to its own "pass" line, Task 2): it
 * drafts, re-papers, renders and measures; it does NOT run akcli repairs, it
 * does not re-centre, and the page it writes under `build/draw/` is raw
 * material for that judgement-laden pass, not the reviewer-ready artifact
 * `drafted/` holds.
 *
 * **G308, the owner, 2026-10-31: "I hate using environment variables."** This
 * verb takes NO board argument and no selecting variable of any kind.
 * `$(CURDIR)` is the whole of its context, exactly as it is for `check`,
 * `bom` and `cuts` (`make/perfboard.mk`'s own comment: *"two ways to say
 * which board is two places for one fact to be wrong"*). Act on a board from
 * outside with make's own flag: `make -C boards/<board> draw`. `runDraw`'s
 * `board`/`boardDir` options exist ONLY so a test can drive this without
 * `cd`-ing the process; the CLI entry point below never reads either from an
 * argument or an environment variable - it reads `process.cwd()`. Measured
 * directly in a fix-round regression test: `BOARD=pultec-hi-cut` passed both
 * as a `make` command-line variable and as a process environment variable
 * while running `make -C boards/pultec-mid draw` is ignored either way, and
 * the refusal still names `pultec-mid`.
 *
 * **IT NEVER WITHHOLDS A PAGE (`EVALUATING-DRAWINGS.md` §3).** Once
 * copperhead drafts and `kicad-cli` renders, the measurement suite's
 * findings are printed BESIDE the page - never used to refuse it. The one
 * thing refused ahead of drafting is the one §3 itself names as a valid
 * ground: *"a drawing whose connectivity disagrees with the circuit
 * model."* Comparing the intent's own net partition against the model's
 * committed netlist export catches that before a single coordinate is
 * drafted, so a disagreement here withholds the page for the reason §3
 * permits, not for a legibility finding - which this verb must never use to
 * withhold anything. A paper-fit overflow (see `../draught/draw-render.ts`'s
 * `repaperToUSLetter`) is reported the same way - a finding, never a
 * withholding ground.
 *
 * **THIS PLAN DOES NOT DERIVE AN INTENT FROM A `Network`** - stated as an
 * open question in the design this plan implements, and repeated in the
 * task-5 brief. `COMMITTED_INTENT` (`../draught/draw-draft.ts`) is therefore
 * a map of board name to an intent file ALREADY ON DISK, committed by an
 * earlier run; a board with no entry refuses, naming the board, rather than
 * inventing one. This is the same shape `tools/draught/toolchain.ts` already
 * uses for `RESOLVED_BINARY`/`RESOLVED_CHECKOUT_DIR` - a small, explicit,
 * name-keyed map rather than a derivation.
 *
 * **NO TOOL PATH IS HARDCODED (`docs/known-gaps.md` G170).** `kicad-cli`,
 * `magick` and copperhead's checkout directory are resolved through the same
 * functions `tools/draught/toolchain.ts` probes with -
 * `defaultKicadCli`/`defaultMagick`/`defaultCopperheadDir` - never written
 * out a second time. `git` and `python3` are invoked by their bare PATH
 * names, the same way `npx`/`tsx`/`bun` are elsewhere in this repository:
 * none of the five is in `draughting/tools.lock.json`, and `TOOLING.md`'s own
 * toolchain table lists `git` and `Python` as system tools this repository
 * has never pinned.
 *
 * **WRITES ONLY UNDER `build/draw/<board>/`.** Never `drafted/`, never a
 * board's own declared files. `build/` is gitignored, so a run here never
 * shows up in `git status`.
 */
import fs from "node:fs"
import path from "node:path"
import {
  draftWithCopperhead,
  parseIntent,
  resolveIntentPath,
  verifyIntentAgainstModel,
  type Intent,
} from "../draught/draw-draft.ts"
import { renderSheet, repaperToUSLetter, runMeasurementSuite } from "../draught/draw-render.ts"
import { checkToolchain, readLock, type Toolchain } from "../draught/toolchain.ts"
import { loadDeclaration, type PerfboardDeclaration } from "../perfboard/declaration.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { renderToolchainReport } from "./draught.ts"
import { isMain } from "./entrypoint.ts"

/** Printed at the top of every successful (or partially successful) run - see the module comment. */
const SCOPE_DISCLOSURE =
  "make draw is a MECHANICAL draft: toolchain check, intent resolution and verification, " +
  "copperhead draft, re-paper to USLetter, kicad-cli render, the measurement suite, one crop. " +
  "It does NOT run akcli repairs, re-centre content, or otherwise perform the judgement-laden " +
  "repair pass TOOLING.md treats as a separate step - the page it writes is raw material for " +
  "that pass, not the reviewer-ready artifact under drafted/."

export interface DrawOptions {
  /**
   * Which board to draw. Resolves to `boards/<board>` unless `boardDir` is
   * also given. ONLY for a test's convenience - the real CLI entry point
   * never sets this from a flag or an environment variable (G308); it reads
   * `process.cwd()`.
   */
  readonly board?: string
  /** Overrides the resolved board directory outright. Test-only. */
  readonly boardDir?: string
  /** Defaults to `readLock()` - the real pinned toolchain. Test-only override. */
  readonly lock?: Toolchain
  /** Defaults to `build/draw/<board>`. Test-only override. */
  readonly outDir?: string
  /**
   * Bypasses `COMMITTED_INTENT` outright and drafts from this file instead.
   * Test-only - the real CLI entry point takes no `--intent` flag, for the
   * same reason it takes no `--board` one.
   */
  readonly intentPath?: string
}

export interface DrawResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  /** Whether a sheet was drafted AND rendered - a page someone could open and look at. */
  readonly drew: boolean
}

function refusal(stderr: string): DrawResult {
  return { exitCode: 1, stdout: "", stderr, drew: false }
}

/**
 * A failure after copperhead has already written a `.kicad_sch` to disk
 * (Task 5 fix round 1, M-2): the refusal names that file explicitly, so a
 * reader is not left to wonder whether anything survived a render or
 * re-paper failure. Nothing is hidden or deleted either way - this only
 * fixes what the message SAYS.
 */
function partialFailure(stdoutSections: readonly string[], stderrSections: readonly string[], schematicPath: string): DrawResult {
  return {
    exitCode: 1,
    drew: false,
    stdout: stdoutSections.join("\n\n"),
    stderr: [
      ...stderrSections,
      `note: ${schematicPath} exists on disk from this run - a later step failed, but that file was ` +
        "not deleted or hidden. It can still be opened directly in KiCad.",
    ].join("\n\n"),
  }
}

function resolveBoardDir(repoRoot: string, options: DrawOptions): string {
  if (options.boardDir !== undefined) return options.boardDir
  if (options.board !== undefined) return path.join(repoRoot, "boards", options.board)
  return process.cwd()
}

export async function runDraw(options: DrawOptions = {}): Promise<DrawResult> {
  const repoRoot = moduleRepoRoot()

  // Step 1: check the toolchain. Nothing else runs until every pinned tool agrees.
  const lock = options.lock ?? readLock()
  const problems = checkToolchain(lock)
  if (problems.length > 0) {
    return refusal(renderToolchainReport(problems))
  }

  const boardDir = resolveBoardDir(repoRoot, options)
  const board = options.board ?? path.basename(boardDir)

  const declarationFile = path.join(boardDir, "perfboard.json")
  if (!fs.existsSync(declarationFile)) {
    return refusal(
      `${boardDir} declares no perfboard.json, so there is no board to draw here. draw acts on ` +
        "$(CURDIR) exactly as check does (docs/known-gaps.md G308) - run it from a board directory, " +
        "e.g. `make -C boards/<board> draw`.",
    )
  }
  let declaration: PerfboardDeclaration
  try {
    declaration = loadDeclaration(declarationFile)
  } catch (error) {
    return refusal(error instanceof Error ? error.message : String(error))
  }

  // Step 2: resolve the intent - a committed one, or a refusal naming the board.
  const resolvedIntent = resolveIntentPath(board, options.intentPath)
  if ("refusal" in resolvedIntent) return refusal(resolvedIntent.refusal)

  let intent: Intent
  try {
    intent = parseIntent(resolvedIntent.path)
  } catch (error) {
    return refusal(error instanceof Error ? error.message : String(error))
  }

  if (declaration.netlistPath === undefined) {
    return refusal(
      `${declaration.file} declares no "netlist" field, so there is no committed model export to verify ` +
        `${board}'s intent against. Declare "sch"/"netlist" there (tools/perfboard/declaration.ts) before drafting.`,
    )
  }

  // Step 3: verify the intent's net partition against the model. A disagreement here is the
  // one ground EVALUATING-DRAWINGS.md §3 permits withholding a page for - a drawing whose
  // connectivity would disagree with the circuit model - so nothing is drafted.
  let netlistText: string
  try {
    netlistText = fs.readFileSync(declaration.netlistPath, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return refusal(`could not read ${declaration.netlistPath}: ${detail}.`)
  }
  const agreement = verifyIntentAgainstModel(intent, netlistText)
  if (!agreement.agrees) {
    return refusal(
      [
        `${board}'s intent (${resolvedIntent.path}) disagrees with the model's committed netlist ` +
          `(${declaration.netlistPath}) on net partition - EVALUATING-DRAWINGS.md §3 permits withholding a ` +
          "drawing whose connectivity disagrees with the circuit model, so nothing was drafted:",
        ...agreement.disagreements,
      ].join("\n"),
    )
  }

  // Step 4: draft with copperhead.
  const outDir = options.outDir ?? path.join(repoRoot, "build", "draw", board)
  const draft = draftWithCopperhead({ outDir, board, intentPath: resolvedIntent.path })
  const stdoutSections: string[] = [
    SCOPE_DISCLOSURE,
    `draft (copperhead, intent ${resolvedIntent.path}):\n${draft.stdout}`.trim(),
  ]
  const stderrSections: string[] = []
  if (draft.stderr.trim() !== "") stderrSections.push(`draft:\n${draft.stderr.trim()}`)
  if (!draft.ok) {
    return { exitCode: 1, drew: false, stdout: stdoutSections.join("\n\n"), stderr: stderrSections.join("\n\n") }
  }

  // Step 4.5: re-paper to USLetter - every approved page's paper; copperhead's own draft
  // engine cannot be asked to target it directly (see draw-draft.ts's draftWithCopperhead).
  const repaper = repaperToUSLetter(draft.schematicPath)
  stdoutSections.push(`re-paper (US Letter):\n${repaper.stdout}`.trim())
  if (repaper.stderr.trim() !== "") stderrSections.push(`re-paper:\n${repaper.stderr.trim()}`)
  if (!repaper.ok) {
    return partialFailure(stdoutSections, stderrSections, draft.schematicPath)
  }
  if (!repaper.fits) {
    stderrSections.push(
      `re-paper: ${board}'s content does not fit US Letter's inner frame after re-papering - see the ` +
        "paper_fit.py measurement above. This is a finding, not a withholding ground " +
        "(EVALUATING-DRAWINGS.md §3): the page is still rendered below.",
    )
  }

  // Step 5: render, and the one crop a mechanical pass can write.
  const render = renderSheet({ schematicPath: draft.schematicPath, outDir, board })
  stdoutSections.push(`render (kicad-cli + ImageMagick):\n${render.stdout}`.trim())
  if (render.stderr.trim() !== "") stderrSections.push(`render:\n${render.stderr.trim()}`)
  if (!render.ok) {
    return partialFailure(stdoutSections, stderrSections, draft.schematicPath)
  }

  // Step 6: the measurement suite. Findings are printed beside the page, never used to
  // withhold it - the page is already written by this point.
  const measurement = runMeasurementSuite(draft.schematicPath)
  stdoutSections.push(`measurement suite (draughting/measure/):\n${measurement.report}`)
  if (!measurement.ok) stderrSections.push("measurement suite: at least one script did not run cleanly - see stdout.")

  return {
    exitCode: 0,
    drew: true,
    stdout: stdoutSections.join("\n\n") + "\n",
    stderr: stderrSections.join("\n\n"),
  }
}

if (isMain(import.meta.url)) {
  runDraw()
    .then((result) => {
      if (result.stdout !== "") console.log(result.stdout)
      if (result.stderr !== "") console.error(result.stderr)
      process.exit(result.exitCode)
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    })
}
