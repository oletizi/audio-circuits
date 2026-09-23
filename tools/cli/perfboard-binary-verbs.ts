/**
 * Dispatch for the CLI's binary-backed verbs: `cuts`, `update`, `stripboard`,
 * `edit`, and the `veroroute` acquisition verb.
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

const PIN_FILE_NAME = "veroroute.pin"

export interface VerorouteDeps {
  readonly readPin: (file: string) => Pin
  readonly resolveBinary: (env: Env, repoRoot: string) => BinaryResolution
  readonly binaryExists: (binaryPath: string) => boolean
  readonly acquire: (pin: Pin, opts: AcquireOptions) => string
}

/**
 * Acquire (or report) the pinned VeroRoute fork.
 *
 * `acquire()` is NOT idempotent - it re-runs checkout, qmake and make on
 * every call, skipping only the clone, and a Qt5 build takes many minutes.
 * So this checks whether a binary already exists at the resolved path
 * FIRST, and only builds when there is none (or `--force` was passed). When
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

    if (!force && deps.binaryExists(resolution.path)) {
      log(`${resolution.path} (already built, pinned at commit ${pin.commit})`)
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
