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
 * **AN INTENT COMES FROM ONE OF TWO DECLARED SOURCES** (`../draught/draw-intent.ts`):
 * a committed file named in `COMMITTED_INTENT` (`../draught/draw-draft.ts`) -
 * the schematic-authoritative Pultec path - or a `drawingIntent()` export on
 * the board's circuit module, generated from the model
 * (`../draught/intent-from-network.ts`) - the model-authoritative path. A
 * board with neither refuses, naming both; a board with both refuses too.
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
 * **WRITES ONLY UNDER THE GITIGNORED `build/draw/`.** The draft, render and
 * crop outputs land in `build/draw/<board>/`; a derived intent (the
 * `drawingIntent()` path - see `../draught/draw-intent.ts`) is written
 * beside it, at `build/draw/<board>.intent.json`, never inside it -
 * `draftWithCopperhead` (`../draught/draw-draft.ts`) empties `outDir`
 * before drafting, so a file this verb needs to survive the draft cannot
 * sit inside the directory the draft is about to clear. Never `drafted/`,
 * never a board's own declared files. `build/` is gitignored, so a run here
 * never shows up in `git status`.
 */
import fs from "node:fs"
import path from "node:path"
import {
  DRAFT_TOOLS,
  draftWithCopperhead,
  verifyIntentAgainstModel,
} from "../draught/draw-draft.ts"
import { resolveDrawIntent } from "../draught/draw-intent.ts"
import {
  RENDER_TOOLS,
  renderSheet,
  repaperToUSLetter,
  runMeasurementSuite,
} from "../draught/draw-render.ts"
import { checkToolchain, readLock, type Toolchain } from "../draught/toolchain.ts"
import { loadDeclaration, type PerfboardDeclaration } from "../perfboard/declaration.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { renderToolchainReport } from "./draught.ts"
import { isMain } from "./entrypoint.ts"

/**
 * EVERY `draughting/tools.lock.json` TOOL THE DRAWING PATH ACTUALLY SPAWNS,
 * and the only tools a disagreement in which may stop a draft - controller
 * Ruling 1 of the final review's fix round 2. See `runDraw`'s step 1 for the
 * ruling and the reasoning.
 *
 * **It is a UNION of what each step declares, never a list written here.**
 * `DRAFT_TOOLS` and `RENDER_TOOLS` sit beside their own `spawnSync` calls in
 * `../draught/draw-draft.ts` and `../draught/draw-render.ts`, because which
 * tools a step needs is a fact about that step's code. A list maintained in
 * this file would be a second place for that fact to be wrong - the same
 * argument `lib/not-source.ts` makes about six walkers' skip-sets, and the
 * one ruling R1 makes about install locations.
 *
 * Sorted and de-duplicated so the order two steps happen to declare in
 * cannot change what this verb reports.
 */
const DRAWING_PATH_TOOLS: readonly string[] = [...new Set([...DRAFT_TOOLS, ...RENDER_TOOLS])].sort()

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

/**
 * A refusal, carrying any advisory sections produced before it.
 *
 * **`advisory` IS NOT OPTIONAL DECORATION (controller Ruling 1).** The
 * toolchain advisory - a lock disagreement on a tool the drawing path does
 * not use - is produced at step 1, before any of the four refusal grounds
 * that follow it. Dropping it on those paths would make a check that RAN and
 * found something look like one that found nothing, which is the shape
 * `CLAUDE.md` names: *"a skipped check must never look like a passing one."*
 * So every refusal after step 1 carries it.
 */
function refusal(stderr: string, advisory: readonly string[] = []): DrawResult {
  return { exitCode: 1, stdout: advisory.join("\n\n"), stderr, drew: false }
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

/**
 * The derived intent's path, beside (never inside) `outDir` - see the module
 * comment's "WRITES ONLY UNDER THE GITIGNORED `build/draw/`" paragraph.
 *
 * **`path.resolve` FIRST, NOT A BARE TEMPLATE (Minor 8, final review).** A
 * trailing-slash `outDir` (`"build/draw/foo/"`) would otherwise produce
 * `"build/draw/foo/.intent.json"` - a path INSIDE the directory
 * `draftWithCopperhead` empties with `rmSync` before every draft, so the
 * intent this run just derived would be deleted before copperhead ever reads
 * it. `path.resolve` strips the trailing slash before `.intent.json` is
 * appended, so the derived path always lands beside `outDir`, never inside
 * it, regardless of how the caller spelled it.
 */
export function derivedIntentPathFor(outDir: string): string {
  return `${path.resolve(outDir)}.intent.json`
}

function resolveBoardDir(repoRoot: string, options: DrawOptions): string {
  if (options.boardDir !== undefined) return options.boardDir
  if (options.board !== undefined) return path.join(repoRoot, "boards", options.board)
  return process.cwd()
}

export async function runDraw(options: DrawOptions = {}): Promise<DrawResult> {
  const repoRoot = moduleRepoRoot()

  // Step 1: check the toolchain. Nothing else runs until every tool THE
  // DRAWING PATH USES agrees - and every other disagreement is reported
  // beside the page instead of blocking it.
  //
  // **CONTROLLER RULING 1, final review fix round 2.** This gate used to
  // refuse on ANY disagreement in `draughting/tools.lock.json`, including
  // tools this path never invokes: `qpdf` (a build-guide tool) from the
  // start, and `numpy`/`pillow` once they were pinned for `framegeom.py`,
  // which `runMeasurementSuite` does not call. `akcli` too - this verb never
  // calls it, by design, as this module's own scope disclosure says. So a
  // missing numpy stopped a page being drawn. The ruling, verbatim:
  //
  //   *"the gate that precedes drafting checks the tools the drawing path
  //   uses, and nothing else"* ... *"'numpy is missing' is a dumb reason not
  //   to draw a schematic"* ... and that `qpdf` was already in that position
  //   *"makes it a pre-existing wrong, not a licence to widen it by two."*
  //
  // It rests on the owner's own words behind `docs/known-gaps.md` G303 -
  // *"if I can't look at it, I cant decide if the refusal is for dumb
  // reasons"* - which `EVALUATING-DRAWINGS.md` §3 states as: only an
  // electrical fault may withhold a drawing. A pre-draft refusal is not
  // literally withholding a rendered page, since no page exists yet; it has
  // the same effect on the reviewer, who gets no page and a reason that is
  // not about the circuit.
  //
  // **WHAT COUNTS AS "THE DRAWING PATH" IS DECLARED BY THE MODULES THAT
  // SPAWN THE TOOLS**, not listed here: `DRAFT_TOOLS` in
  // `../draught/draw-draft.ts` and `RENDER_TOOLS` in
  // `../draught/draw-render.ts`, each beside its own `spawnSync`.
  // `tests/draught/draw.test.ts` cross-checks both against those modules'
  // source, so a tool added to the draw path without being declared fails a
  // test rather than being discovered as a late, worse error message.
  //
  // Machine-wide toolchain health is `make draught-doctor`'s job and it
  // still refuses on every one of these - see `./draught.ts`.
  const lock = options.lock ?? readLock()
  const problems = checkToolchain(lock)
  const blocking = problems.filter((problem) => DRAWING_PATH_TOOLS.includes(problem.tool))
  const advisory = problems.filter((problem) => !DRAWING_PATH_TOOLS.includes(problem.tool))
  if (blocking.length > 0) {
    return refusal(renderToolchainReport(blocking))
  }
  // Reported, never silent, and never gating - the same shape
  // `make draught-doctor` already uses for akcli doctor's own report. A
  // skipped check must never look like a passing one (`CLAUDE.md`), and
  // neither must a check whose finding is not this verb's business. It is
  // threaded through every later refusal as well as into a successful run's
  // stdout - see `refusal` above.
  const advisorySections: string[] =
    advisory.length === 0
      ? []
      : [
          "toolchain (ADVISORY - does not block this draft, because the drawing path does not " +
            "use these tools; `make draught-doctor` is what refuses on them):\n" +
            renderToolchainReport(advisory),
        ]

  const boardDir = resolveBoardDir(repoRoot, options)
  const board = options.board ?? path.basename(boardDir)

  const declarationFile = path.join(boardDir, "perfboard.json")
  if (!fs.existsSync(declarationFile)) {
    return refusal(
      `${boardDir} declares no perfboard.json, so there is no board to draw here. draw acts on ` +
        "$(CURDIR) exactly as check does (docs/known-gaps.md G308) - run it from a board directory, " +
        "e.g. `make -C boards/<board> draw`.",
      advisorySections,
    )
  }
  let declaration: PerfboardDeclaration
  try {
    declaration = loadDeclaration(declarationFile)
  } catch (error) {
    return refusal(error instanceof Error ? error.message : String(error), advisorySections)
  }

  // Step 2: resolve the intent - a committed file, a circuit's drawingIntent() export, or a
  // refusal naming the board and both sources.
  const outDir = options.outDir ?? path.join(repoRoot, "build", "draw", board)
  let resolvedIntent: Awaited<ReturnType<typeof resolveDrawIntent>>
  try {
    resolvedIntent = await resolveDrawIntent({
      board, declaration, override: options.intentPath, derivedIntentPath: derivedIntentPathFor(outDir),
    })
  } catch (error) {
    return refusal(error instanceof Error ? error.message : String(error), advisorySections)
  }
  if ("refusal" in resolvedIntent) return refusal(resolvedIntent.refusal, advisorySections)
  const intent = resolvedIntent.intent

  if (declaration.netlistPath === undefined) {
    return refusal(
      `${declaration.file} declares no "netlist" field, so there is no committed model export to verify ` +
        `${board}'s intent against. Declare "sch"/"netlist" there (tools/perfboard/declaration.ts) before drafting.`,
      advisorySections,
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
    return refusal(`could not read ${declaration.netlistPath}: ${detail}.`, advisorySections)
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
      advisorySections,
    )
  }

  // Step 4: draft with copperhead.
  const draft = draftWithCopperhead({ outDir, board, intentPath: resolvedIntent.path })
  const stdoutSections: string[] = [
    SCOPE_DISCLOSURE,
    ...advisorySections,
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
  // THREE OUTCOMES, NOT TWO (Task 5 fix round 2) - "overflow" is a finding about the board;
  // "unmeasured" is the fit check itself not having run, and must read as exactly that, never
  // as a claim about the board's content. Collapsing the two into one boolean is how a broken
  // measurement tool used to report itself as a false layout finding.
  if (repaper.fitStatus === "overflow") {
    stderrSections.push(
      `re-paper: ${board}'s content does not fit US Letter's inner frame after re-papering - see the ` +
        "paper_fit.py measurement above. This is a finding, not a withholding ground " +
        "(EVALUATING-DRAWINGS.md §3): the page is still rendered below.",
    )
  } else if (repaper.fitStatus === "unmeasured") {
    stderrSections.push(
      `re-paper: whether ${board}'s content fits US Letter's inner frame could not be determined - ` +
        "see the paper_fit.py output above for why. This is the fit CHECK not running, not a " +
        "finding about the board; the page is still rendered below.",
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
