/**
 * Dispatch for the CLI's binary-backed verbs: `cuts`, `import`, `update`,
 * `stripboard`, `edit`, `guide`, and the `veroroute` acquisition verb.
 *
 * Split out of `tools/cli/perfboard.ts` to keep that file under the
 * repository's file-size ceiling: this is the coherent half that shells out
 * to (or rewrites a layout through) the forked VeroRoute binary, and
 * `check`/`boards`/`board-info` are the other, read-only half.
 */
import fs from "node:fs"
import path from "node:path"
import type { Env } from "../perfboard/check.ts"
import type { Pin, BinaryResolution, AcquireOptions } from "../perfboard/acquire.ts"
import { runCuts, runUpdate, runStripboard, runEdit, type VerbDeps } from "../perfboard/verbs.ts"
import { runImport } from "../perfboard/import.ts"
import { writeGuidePacket, type GuideDeps } from "../guide/packet.ts"
import { boardHere, parseFlags, isStripsDirection, reportLines, errorMessage } from "./perfboard-support.ts"

/**
 * `verbDeps`, with `repoRoot` merged in as the fallback for `repoRoot` when
 * the caller did not already set one on `verbDeps` itself.
 *
 * Without this, the CLI's top-level `repoRoot` option silently had no effect
 * on `cuts`, `update`, `stripboard` and `edit` - each resolved its own
 * binary path against `moduleRepoRoot()` regardless of what the top-level
 * option said. No production impact (that fallback is correct too), but a
 * hermeticity trap for a test that sets `repoRoot` expecting it to reach
 * every verb.
 */
function mergedVerbDeps(verbDeps: VerbDeps | undefined, repoRoot: string | undefined): VerbDeps {
  return { ...verbDeps, repoRoot: verbDeps?.repoRoot ?? repoRoot }
}

export function dispatchCuts(
  cwd: string,
  args: readonly string[],
  verbDeps: VerbDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  if (parseFlags(args, new Set(), error) === null) return 1
  const declaration = boardHere(cwd, "cuts", error)
  if (declaration === null) return 1
  try {
    log(runCuts(declaration, mergedVerbDeps(verbDeps, repoRoot)))
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

export function dispatchEdit(
  cwd: string,
  args: readonly string[],
  verbDeps: VerbDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  if (parseFlags(args, new Set(), error) === null) return 1
  const declaration = boardHere(cwd, "edit", error)
  if (declaration === null) return 1
  try {
    log(runEdit(declaration, mergedVerbDeps(verbDeps, repoRoot)))
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

export async function dispatchUpdate(
  cwd: string,
  args: readonly string[],
  verbDeps: VerbDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const flags = parseFlags(args, new Set(["--allow-dirty"]), error)
  if (flags === null) return 1
  const declaration = boardHere(cwd, "update", error)
  if (declaration === null) return 1
  try {
    log(await runUpdate(declaration, { allowDirty: flags.allowDirty }, mergedVerbDeps(verbDeps, repoRoot)))
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

export async function dispatchImport(
  cwd: string,
  args: readonly string[],
  verbDeps: VerbDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  if (parseFlags(args, new Set(), error) === null) return 1
  const declaration = boardHere(cwd, "import", error)
  if (declaration === null) return 1
  try {
    log(await runImport(declaration, mergedVerbDeps(verbDeps, repoRoot)))
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

export async function dispatchStripboard(
  cwd: string,
  args: readonly string[],
  verbDeps: VerbDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const flags = parseFlags(args, new Set(["--allow-dirty", "--strips"]), error)
  if (flags === null) return 1
  const declaration = boardHere(cwd, "stripboard", error)
  if (declaration === null) return 1

  let strips: "horizontal" | "vertical" | undefined
  if (flags.strips !== undefined) {
    if (!isStripsDirection(flags.strips)) {
      error(`invalid --strips value "${flags.strips}"; must be "horizontal" or "vertical".`)
      return 1
    }
    strips = flags.strips
  }

  try {
    log(
      await runStripboard(
        declaration,
        { strips, allowDirty: flags.allowDirty },
        mergedVerbDeps(verbDeps, repoRoot),
      ),
    )
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

const GUIDE_TOOL_FLAGS = ["--kicad-cli", "--html-to-pdf", "--pdf-merge"] as const

const GUIDE_USAGE =
  "guide takes exactly --kicad-cli <path> --html-to-pdf <path> --pdf-merge <path>, in any order: " +
  "the kicad-cli that exports the schematic page, the headless browser that prints the guide's " +
  "own pages, and the qpdf-compatible tool that merges the two into the one guide.pdf (`make " +
  "guide` passes its KICAD_CLI, HTML_TO_PDF and PDF_MERGE). None is defaulted here, so that a " +
  "path lives in one place."

/**
 * The two tool paths `guide` needs, or `null` having said what was wrong.
 *
 * BOTH ARE REQUIRED AND NEITHER HAS A DEFAULT HERE, for the reason
 * `--kicad-cli` never had one: make/board.mk resolves each with its own
 * contingent default and passes it down, and a second default in TypeScript
 * would be a second place for one path to be wrong.
 */
function guideToolPaths(
  args: readonly string[],
  error: (line: string) => void,
): { kicadCli: string; htmlToPdf: string; pdfMerge: string } | null {
  const seen = new Map<string, string>()
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]
    const value = args[i + 1]
    if (flag === undefined || !GUIDE_TOOL_FLAGS.some((known) => known === flag)) {
      error(`unknown or misplaced argument "${String(flag)}" for guide. ${GUIDE_USAGE}`)
      return null
    }
    // A MISSING VALUE AND A NEXT FLAG ARE DISTINGUISHED, as parseFlags does
    // for --strips: "--kicad-cli --html-to-pdf x" must not silently take
    // "--html-to-pdf" as a kicad-cli path.
    if (value === undefined || value.startsWith("--")) {
      error(`${flag} needs a path. ${GUIDE_USAGE}`)
      return null
    }
    if (seen.has(flag)) {
      error(`${flag} was given twice. ${GUIDE_USAGE}`)
      return null
    }
    seen.set(flag, value)
  }
  const kicadCli = seen.get("--kicad-cli")
  const htmlToPdf = seen.get("--html-to-pdf")
  const pdfMerge = seen.get("--pdf-merge")
  if (kicadCli === undefined || htmlToPdf === undefined || pdfMerge === undefined) {
    const missing = GUIDE_TOOL_FLAGS.filter((flag) => !seen.has(flag))
    error(`guide is missing ${missing.join(" and ")}. ${GUIDE_USAGE}`)
    return null
  }
  return { kicadCli, htmlToPdf, pdfMerge }
}

/**
 * `guide`: write this board's printable build packet into its `guide/`.
 *
 * Takes `--kicad-cli <path>`, `--html-to-pdf <path>` and `--pdf-merge <path>`,
 * as `netlist-sync` takes `--kicad-cli`: make/board.mk resolves KICAD_CLI,
 * HTML_TO_PDF and PDF_MERGE with its own defaults and passes them, so this
 * verb never holds a second default of its own.
 */
export async function dispatchGuide(
  cwd: string,
  args: readonly string[],
  guideDeps: Omit<GuideDeps, "kicadCli" | "htmlToPdf" | "pdfMerge"> | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const tools = guideToolPaths(args, error)
  if (tools === null) return 1
  const declaration = boardHere(cwd, "guide", error)
  if (declaration === null) return 1
  try {
    log(
      await writeGuidePacket(declaration, {
        ...guideDeps,
        repoRoot: guideDeps?.repoRoot ?? repoRoot,
        kicadCli: tools.kicadCli,
        htmlToPdf: tools.htmlToPdf,
        pdfMerge: tools.pdfMerge,
      }),
    )
    return 0
  } catch (caught) {
    error(`FAIL ${declaration.vrtPath}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

const PIN_FILE_NAME = "veroroute.pin"

export interface VerorouteDeps {
  readonly readPin: (file: string) => Pin
  readonly resolveBinary: (env: Env, repoRoot: string) => BinaryResolution
  readonly binaryExists: (binaryPath: string) => boolean
  /** The commit an existing build was made from, or `undefined` if unknown. */
  readonly builtCommit: (repoRoot: string) => string | undefined
  readonly acquire: (pin: Pin, opts: AcquireOptions) => string
}

/**
 * Acquire (or report) the pinned VeroRoute fork.
 *
 * `acquire()` is NOT idempotent - it re-runs checkout, qmake and make on
 * every call, skipping only the clone, and a Qt5 build takes many minutes.
 * So this checks for an existing build FIRST, and only builds when there is
 * none, when it was made from a different commit, or when `--force` was
 * passed.
 *
 * "A binary exists there" was the whole check once, and it is not enough:
 * a pin bump does not change whether a file exists, so advancing
 * veroroute.pin left the old binary in place while this reported the new
 * commit - the run claimed code it was not executing. The commit a build
 * was actually made from is the thing to compare, and an unstamped build
 * is unknown, not agreed. When
 * `VEROROUTE` points at the operator's own checkout ("explicit" mode), this
 * `VEROROUTE` points at the operator's own checkout ("explicit" mode), this
 * never acquires at all: that is a build this tool does not own, and cloning
 * or rebuilding over it would be this tool destroying work that is not its
 * to destroy.
 */
function dispatchVeroroute(
  repoRoot: string,
  env: Env,
  force: boolean,
  deps: VerorouteDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  try {
    const resolution = deps.resolveBinary(env, repoRoot)

    if (resolution.mode === "explicit") {
      log(
        `${resolution.path} (VEROROUTE is set, so acquisition was skipped: this points at your own ` +
          "checkout, and this tool will not clone or rebuild over work it does not own.)",
      )
      return 0
    }

    const pin = deps.readPin(path.join(repoRoot, PIN_FILE_NAME))

    const built = deps.builtCommit(repoRoot)
    if (!force && deps.binaryExists(resolution.path) && built === pin.commit) {
      log(`${resolution.path} (already built from commit ${pin.commit})`)
      return 0
    }

    const builtPath = deps.acquire(pin, { repoRoot, env })
    log(`${builtPath} (built from ${pin.repo} at commit ${pin.commit})`)
    return 0
  } catch (caught) {
    error(`FAIL veroroute`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}

/** `veroroute`'s own flag parsing (`--force`), then `dispatchVeroroute`. */
export function dispatchVerorouteVerb(
  args: readonly string[],
  repoRoot: string,
  env: Env,
  deps: VerorouteDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  const flags = parseFlags(args, new Set(["--force"]), error)
  if (flags === null) return 1
  return dispatchVeroroute(repoRoot, env, flags.force, deps, log, error)
}

export function defaultBinaryExists(binaryPath: string): boolean {
  return fs.existsSync(binaryPath)
}
