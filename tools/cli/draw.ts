/**
 * `make draw` - THE VERB THAT ABSORBS THE DRAUGHTING MECHANICS.
 *
 * Five run directories under `docs/research/` each hand-wrote the same six
 * mechanical steps: check the toolchain, resolve an intent, verify it against
 * the model, draft with copperhead, render with `kicad-cli`, run the
 * measurement suite and write a crop. `TOOLING.md`'s loop and
 * `.superpowers/sdd/2026-10-30-institutionalise-draughting/task-5-brief.md`
 * name that order; this module is the glue, not a new algorithm - "i want to
 * reuse and glue together agent-driven tooling" (`TOOLING.md`).
 *
 * **G308, the owner, 2026-10-31: "I hate using environment variables."** This
 * verb takes NO board argument and no selecting variable of any kind.
 * `$(CURDIR)` is the whole of its context, exactly as it is for `check`,
 * `bom` and `cuts` (`make/perfboard.mk`'s own comment: *"two ways to say
 * which board is two places for one fact to be wrong"*). Act on a board from
 * outside with make's own flag: `make -C boards/<board> draw`. `runDraw`'s
 * `board`/`boardDir` options exist ONLY so a test can drive this without
 * `cd`-ing the process; the CLI entry point below never reads either from an
 * argument or an environment variable - it reads `process.cwd()`.
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
 * withhold anything.
 *
 * **THIS PLAN DOES NOT DERIVE AN INTENT FROM A `Network`** - stated as an
 * open question in the design this plan implements, and repeated in the
 * task-5 brief. `COMMITTED_INTENT` below is therefore a map of board name to
 * an intent file ALREADY ON DISK, committed by an earlier run; a board with
 * no entry refuses, naming the board, rather than inventing one. This is the
 * same shape `tools/draught/toolchain.ts` already uses for
 * `RESOLVED_BINARY`/`RESOLVED_CHECKOUT_DIR` - a small, explicit, name-keyed
 * map rather than a derivation.
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
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { defaultCopperheadDir } from "../draught/copperhead-install.ts"
import { defaultMagick } from "../draught/magick-install.ts"
import { checkToolchain, readLock, type Toolchain } from "../draught/toolchain.ts"
import { loadDeclaration, type PerfboardDeclaration } from "../perfboard/declaration.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { renderToolchainReport } from "./draught.ts"
import { isMain } from "./entrypoint.ts"

/**
 * One board's committed copperhead intent, repository-relative.
 *
 * **"COMMITTED" MEANS A FILE ALREADY ON DISK, FROM AN EARLIER RUN** - not
 * something this verb derives. `pultec-hi-cut`'s entry is
 * `docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json`,
 * the intent `drafted/pultec/pultec-hi-cut/RECORD.md` names as what produced
 * the committed page ("Produced by copperhead draft `v4-blocks-mid-late`").
 * Drafting from it here will NOT reproduce that page byte-for-byte: the
 * committed page went through akcli repairs and a re-paper/centring pass
 * afterwards that this verb does not run (`TOOLING.md` steps 4-6 are
 * judgement-laden repair work, not mechanics - see the module comment
 * above). The other four Pultec boards with a page under `drafted/pultec/`
 * have no entry here yet; `make -C boards/<one of them> draw` refuses,
 * naming the board, until one is added.
 */
const COMMITTED_INTENT: Readonly<Record<string, string>> = {
  "pultec-hi-cut": "docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json",
}

/** The measurement suite this verb runs against every fresh draft, in order. */
const MEASUREMENT_SCRIPTS: readonly string[] = ["crossings.py", "junction_audit.py", "label_survey.py"]

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

// --- the committed intent file, as copperhead's own `schematic.intent.json` names its shape ---

interface IntentPart {
  readonly ref: string
  readonly libId: string
  readonly value: string
  readonly group: string
}

interface IntentNet {
  readonly name: string
  readonly pins: readonly string[]
}

interface Intent {
  readonly parts: readonly IntentPart[]
  readonly nets: readonly IntentNet[]
  readonly noConnect: readonly string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

/**
 * The minimum this verb needs to believe an intent file before handing it to
 * copperhead: a `parts` array of refs, a `nets` array of named pin lists, and
 * an optional `noConnect` list of bare pins. copperhead's own `draft
 * schematic` validates the file far more thoroughly than this; this check
 * exists only so `verifyIntentAgainstModel` below has something typed to
 * read before that point, and refuses by name rather than letting a
 * malformed file reach `Object.entries` as `unknown`.
 */
function parseIntent(file: string): Intent {
  let raw: string
  try {
    raw = fs.readFileSync(file, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`could not read the committed intent ${file}: ${detail}.`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${file} is not valid JSON: ${detail}.`)
  }
  if (!isRecord(parsed)) throw new Error(`${file} must hold a JSON object; copperhead's intent schema requires one.`)

  const partsValue = parsed["parts"]
  if (!Array.isArray(partsValue)) throw new Error(`${file}: "parts" is missing or not an array.`)
  const parts = partsValue.map((item, index): IntentPart => {
    if (!isRecord(item)) throw new Error(`${file}: parts[${index}] is not an object.`)
    const { ref, libId, value, group } = item
    if (typeof ref !== "string") throw new Error(`${file}: parts[${index}].ref is missing or not a string.`)
    if (typeof libId !== "string") throw new Error(`${file}: parts[${index}].libId is missing or not a string.`)
    if (typeof value !== "string") throw new Error(`${file}: parts[${index}].value is missing or not a string.`)
    if (typeof group !== "string") throw new Error(`${file}: parts[${index}].group is missing or not a string.`)
    return { ref, libId, value, group }
  })

  const netsValue = parsed["nets"]
  if (!Array.isArray(netsValue)) throw new Error(`${file}: "nets" is missing or not an array.`)
  const nets = netsValue.map((item, index): IntentNet => {
    if (!isRecord(item)) throw new Error(`${file}: nets[${index}] is not an object.`)
    const { name, pins } = item
    if (typeof name !== "string") throw new Error(`${file}: nets[${index}].name is missing or not a string.`)
    if (!isStringArray(pins)) throw new Error(`${file}: nets[${index}].pins is missing or not an array of strings.`)
    return { name, pins }
  })

  const noConnectValue = parsed["noConnect"]
  if (noConnectValue !== undefined && !isStringArray(noConnectValue)) {
    throw new Error(`${file}: "noConnect" must be an array of strings when present.`)
  }
  const noConnect = noConnectValue ?? []

  return { parts, nets, noConnect }
}

// --- resolving the intent: a committed one, or a refusal naming the board ---

type IntentResolution = { readonly path: string } | { readonly refusal: string }

function resolveIntentPath(board: string, options: DrawOptions): IntentResolution {
  if (options.intentPath !== undefined) {
    const abs = path.resolve(options.intentPath)
    if (!fs.existsSync(abs)) {
      return { refusal: `--intent override ${options.intentPath} does not exist.` }
    }
    return { path: abs }
  }
  const relative = COMMITTED_INTENT[board]
  if (relative === undefined) {
    const known = Object.keys(COMMITTED_INTENT).sort().join(", ")
    return {
      refusal:
        `no committed copperhead intent is declared for board "${board}". ` +
        "COMMITTED_INTENT in tools/cli/draw.ts names one intent file per board that has one, and " +
        `this plan does not derive an intent from a Network (the board has none yet, among [${known}]). ` +
        `Add "${board}" to COMMITTED_INTENT, pointing at a committed intent file, before drafting it here.`,
    }
  }
  return { path: path.join(moduleRepoRoot(), relative) }
}

// --- verifying the intent's net partition against the model ---

/** A partition as a sorted list of sorted member strings - a MULTISET. */
function partitionOf(sets: readonly (readonly string[])[]): string[] {
  return sets.map((members) => [...members].sort().join(" ")).sort()
}

/** `a` minus `b` as MULTISETS: an entry in `a` twice and in `b` once survives once. */
function withoutOnce(a: readonly string[], b: readonly string[]): string[] {
  const remaining = new Map<string, number>()
  for (const x of b) remaining.set(x, (remaining.get(x) ?? 0) + 1)
  const out: string[] = []
  for (const x of a) {
    const n = remaining.get(x) ?? 0
    if (n > 0) remaining.set(x, n - 1)
    else out.push(x)
  }
  return out
}

type Agreement = { readonly agrees: true } | { readonly agrees: false; readonly disagreements: readonly string[] }

/**
 * Compare the intent's net partition to the model's, AS SETS OF `REF.PIN`
 * SETS - `TOOLING.md`'s own description of `intent_vs_model.py`, the research
 * script this reimplements against a production module instead of a
 * one-off. "The model" here is the board's own COMMITTED netlist export
 * (`perfboard.json`'s `"netlist"` field, imported through
 * `lib/kicad/netlist.ts`'s `importNetlist` - a production module, not a test
 * helper) rather than a fresh derivation from the `Network`: that export is
 * already the netlist `tests/circuits/<board>.test.ts` binds to the TS model
 * on every `bun test` run (`make/board.mk`'s `netlist-agrees`), so comparing
 * against it is comparing against the model through a link this repository
 * already keeps honest, not inventing a second one.
 */
function verifyIntentAgainstModel(intent: Intent, netlistText: string): Agreement {
  const modelSets = partitionOf(Object.values(importNetlist(netlistText).nets))
  const intentSets = partitionOf([...intent.nets.map((net) => net.pins), ...intent.noConnect.map((pin) => [pin])])
  if (modelSets.join("\n") === intentSets.join("\n")) return { agrees: true }
  const disagreements: string[] = []
  for (const set of withoutOnce(modelSets, intentSets)) {
    disagreements.push(`the model connects [${set}] and the intent does not`)
  }
  for (const set of withoutOnce(intentSets, modelSets)) {
    disagreements.push(`the intent connects [${set}] and the model does not`)
  }
  return { agrees: false, disagreements }
}

// --- drafting with copperhead ---

interface DraftOutcome {
  readonly ok: boolean
  readonly schematicPath: string
  readonly stdout: string
  readonly stderr: string
}

/**
 * Draft `board`'s schematic from `intentPath`, into a throwaway git
 * repository under `outDir` - copperhead "REFUSES to draft outside a git
 * repository" (`TOOLING.md`), which every prior run satisfied with
 * `git init -q`. The intent is copied to copperhead's own default location
 * beside the schematic (`schematic.intent.json`), the same way every prior
 * run's `draft.py` used it, rather than passed via `--intent` - both are
 * equivalent for a fresh directory with nothing else in it.
 *
 * **COPPERHEAD IS INVOKED AS `npx tsx <abs path to src/cli.ts>`, NOT `bun`**
 * (`TOOLING.md`: *"the bun path has never been measured"*), with the script
 * path resolved through `defaultCopperheadDir()` - never a hardcoded
 * checkout directory - and never by changing this process's own working
 * directory, the same way `tools/draught/toolchain.ts`'s probe invokes it.
 */
function draftWithCopperhead(opts: { readonly outDir: string; readonly board: string; readonly intentPath: string }): DraftOutcome {
  const schematicRelative = `${opts.board}.kicad_sch`
  const schematicPath = path.join(opts.outDir, schematicRelative)

  fs.rmSync(opts.outDir, { recursive: true, force: true })
  fs.mkdirSync(path.join(opts.outDir, ".copperhead"), { recursive: true })
  fs.writeFileSync(
    path.join(opts.outDir, ".copperhead", "config.json"),
    JSON.stringify({ schematic: schematicRelative, docs: "docs/" }) + "\n",
  )
  fs.copyFileSync(opts.intentPath, path.join(opts.outDir, "schematic.intent.json"))

  const gitInit = spawnSync("git", ["init", "-q", opts.outDir], { encoding: "utf8" })
  if (gitInit.status !== 0) {
    return {
      ok: false,
      schematicPath,
      stdout: "",
      stderr: `git init -q ${opts.outDir} failed: ${gitInit.stderr || gitInit.error?.message || "no output"}. ` +
        "copperhead refuses to draft outside a git repository (TOOLING.md).",
    }
  }

  const cliPath = path.join(defaultCopperheadDir(), "src", "cli.ts")
  const draft = spawnSync("npx", ["tsx", cliPath, "--repo", opts.outDir, "draft", "schematic"], { encoding: "utf8" })
  const produced = fs.existsSync(schematicPath)
  return {
    ok: draft.status === 0 && produced,
    schematicPath,
    stdout: draft.stdout ?? "",
    stderr: produced ? (draft.stderr ?? "") : `${draft.stderr ?? ""}\ncopperhead did not produce ${schematicPath}.`.trim(),
  }
}

// --- rendering, and the one crop this verb can write without a judgement call ---

interface RenderOutcome {
  readonly ok: boolean
  readonly stdout: string
  readonly stderr: string
}

/**
 * Render the drafted sheet to PDF and SVG (`TOOLING.md` step 3: "Export SVG
 * as well as PDF" - git can diff an SVG), then cut ONE whole-page PNG crop.
 *
 * **WHY ONE CROP AND NOT `draughting/measure/crop.py`'s NAMED REGIONS.**
 * That script's `REGIONS` table is hand-surveyed per run, after a human has
 * looked at a render and picked out the groups worth a close-up - every
 * prior run replaced its own copy of that table with its own boxes
 * (`crop.py`'s own promotion note). A fresh, unrepaired draft has had no
 * such survey yet, so there is no named region this MECHANICAL verb can
 * point at without guessing one - the judgement call `crop.py`'s table
 * encodes is exactly the akcli-repair work this verb does not do (see the
 * module comment above). The whole-page PNG is the one crop that needs no
 * judgement: "Render it, print it, read it" (`CLAUDE.md`) applies to the
 * page as a whole before any region of it has been singled out.
 */
function renderSheet(opts: { readonly schematicPath: string; readonly outDir: string; readonly board: string }): RenderOutcome {
  const kicadCli = defaultKicadCli()
  const magick = defaultMagick()
  const pdfPath = path.join(opts.outDir, `${opts.board}.pdf`)
  const svgPath = path.join(opts.outDir, `${opts.board}.svg`)
  const cropDir = path.join(opts.outDir, "crops")
  const cropPath = path.join(cropDir, `${opts.board}-whole-page.png`)

  const stdout: string[] = []
  const stderr: string[] = []

  const pdf = spawnSync(kicadCli, ["sch", "export", "pdf", "-o", pdfPath, opts.schematicPath], { encoding: "utf8" })
  stdout.push((pdf.stdout ?? "").trim())
  if (pdf.status !== 0 || !fs.existsSync(pdfPath)) {
    stderr.push(`${kicadCli} sch export pdf exited ${pdf.status ?? "with no status"}: ${(pdf.stderr ?? "").trim()}`)
    return { ok: false, stdout: stdout.join("\n"), stderr: stderr.join("\n") }
  }

  const svg = spawnSync(kicadCli, ["sch", "export", "svg", "-o", opts.outDir, opts.schematicPath], { encoding: "utf8" })
  stdout.push((svg.stdout ?? "").trim())
  if (svg.status !== 0 || !fs.existsSync(svgPath)) {
    stderr.push(`${kicadCli} sch export svg exited ${svg.status ?? "with no status"}: ${(svg.stderr ?? "").trim()}`)
    return { ok: false, stdout: stdout.join("\n"), stderr: stderr.join("\n") }
  }

  fs.mkdirSync(cropDir, { recursive: true })
  const crop = spawnSync(
    magick,
    ["-density", "200", pdfPath, "-background", "white", "-alpha", "remove", cropPath],
    { encoding: "utf8" },
  )
  if (crop.status !== 0 || !fs.existsSync(cropPath)) {
    stderr.push(`${magick} crop exited ${crop.status ?? "with no status"}: ${(crop.stderr ?? "").trim()}`)
    return { ok: false, stdout: stdout.join("\n"), stderr: stderr.join("\n") }
  }

  return { ok: true, stdout: stdout.filter((s) => s !== "").join("\n"), stderr: stderr.join("\n") }
}

// --- the measurement suite ---

/**
 * Run every script in `MEASUREMENT_SCRIPTS` against the drafted sheet and
 * concatenate what each prints. **A script's own non-zero exit is reported
 * as a TOOLING failure, in its own labelled paragraph, never silently
 * dropped and never treated as a drawing finding** - "a skipped check must
 * never look like a passing one" (`CLAUDE.md`). Neither kind of result ever
 * changes `runDraw`'s exit code: the measurement suite's whole job here is
 * to print findings beside an already-written page, not to gate it
 * (`EVALUATING-DRAWINGS.md` §3, §6).
 */
function runMeasurementSuite(schematicPath: string): { readonly report: string; readonly ok: boolean } {
  const measureDir = path.join(moduleRepoRoot(), "draughting", "measure")
  const sections: string[] = []
  let ok = true
  for (const script of MEASUREMENT_SCRIPTS) {
    const result = spawnSync("python3", [path.join(measureDir, script), schematicPath], { encoding: "utf8" })
    const body = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
    if (result.status !== 0) {
      ok = false
      sections.push(
        `${script}: EXITED ${result.status ?? "with no status"} - a tooling failure, not a drawing finding:\n${body}`,
      )
    } else {
      sections.push(`${script}:\n${body}`)
    }
  }
  return { report: sections.join("\n\n"), ok }
}

// --- orchestration ---

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
  const resolvedIntent = resolveIntentPath(board, options)
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
  const stdoutSections: string[] = [`draft (copperhead, intent ${resolvedIntent.path}):\n${draft.stdout}`.trim()]
  const stderrSections: string[] = []
  if (draft.stderr.trim() !== "") stderrSections.push(`draft:\n${draft.stderr.trim()}`)
  if (!draft.ok) {
    return { exitCode: 1, drew: false, stdout: stdoutSections.join("\n\n"), stderr: stderrSections.join("\n\n") }
  }

  // Step 5: render, and the one crop a mechanical pass can write.
  const render = renderSheet({ schematicPath: draft.schematicPath, outDir, board })
  stdoutSections.push(`render (kicad-cli + ImageMagick):\n${render.stdout}`.trim())
  if (render.stderr.trim() !== "") stderrSections.push(`render:\n${render.stderr.trim()}`)
  if (!render.ok) {
    return { exitCode: 1, drew: false, stdout: stdoutSections.join("\n\n"), stderr: stderrSections.join("\n\n") }
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
