/**
 * Acquire the forked VeroRoute binary this repository checks layouts against.
 *
 * The fork is a separate GPLv3 Qt5 application with its own build. This
 * repository does not vendor it and does not submodule it - `veroroute.pin`
 * at the repository root names a repo and a pinned commit, and this module
 * clones that repo, checks out that commit, and builds it with `qmake` then
 * `make`. The result lands under `.tools/`, which is gitignored: it is a
 * build artifact of a GPLv3 C++ project, not repository content.
 *
 * `readPin`, `resolveBinary` and `acquire` are three separate, composable
 * questions:
 *   - `readPin` answers "what does veroroute.pin say" - nothing else.
 *   - `resolveBinary` answers "which binary path and mode apply given this
 *     environment" - a pure function that never touches the filesystem or a
 *     process, so a test can exercise every branch of the resolution rule
 *     without a real checkout anywhere.
 *   - `acquire` is the one function that actually shells out. Every git and
 *     build invocation is injected (`AcquireOptions.run`), exactly as
 *     `tools/perfboard/mutate.ts` injects `GitRunner` and `tools/perfboard/
 *     verbs.ts` injects its spawn, so no test here ever clones or builds
 *     anything real - the Qt5 compile this stands in for takes many minutes.
 *
 * THE RESOLUTION RULE, which is the heart of this module:
 *   - `VEROROUTE` unset -> mode "acquired": the path this repository is
 *     responsible for creating, under `.tools/`.
 *   - `VEROROUTE` set to anything else -> mode "explicit", returned
 *     unchanged. That is the operator pointing at their own development
 *     build, and acquisition must never run against it - cloning or
 *     rebuilding over a checkout this tool does not own would be this tool
 *     destroying work that is not its to destroy.
 *   - `VEROROUTE` set but empty or whitespace -> refuse. An empty value
 *     cannot be an accident of it being unset; something set it to nothing,
 *     and guessing which was meant is how a check ends up running against a
 *     binary nobody chose.
 *
 * There is deliberately no hardcoded fallback like `$HOME/src/...`: such a
 * path is right on exactly one machine and wrong everywhere else, matching
 * `check.ts`'s own reasoning for `verorouteBinary`.
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import type { Env } from "./check.ts"

export type { Env }

/** What `veroroute.pin` says: which repo, at which commit. */
export interface Pin {
  readonly repo: string
  readonly commit: string
}

/**
 * Parse one `<field> <value>` line, tolerating the pin file's column
 * whitespace (a literal tab or run of spaces between the two).
 */
function parseLine(line: string, file: string): readonly [string, string] {
  const match = line.trim().match(/^(\S+)\s+(\S+)$/)
  if (match === null) {
    throw new Error(
      `${file}: could not parse line ${JSON.stringify(line)}; expected "<field> <value>", e.g. ` +
        '"repo git@github.com:owner/repo.git".',
    )
  }
  return [match[1], match[2]]
}

/**
 * Read `veroroute.pin`.
 *
 * Blank lines are skipped so a trailing newline is not a parse error. Every
 * other line must be `<field> <value>`; a line that is not throws naming the
 * file and the line, the same voice as `declaration.ts`'s `readString`. Both
 * `repo` and `commit` are required and not defaulted - a pin missing either
 * one names which field is missing rather than silently pinning nothing.
 */
export function readPin(file: string): Pin {
  const abs = path.resolve(file)

  let contents: string
  try {
    contents = fs.readFileSync(abs, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${abs}: could not read pin file: ${detail}`)
  }

  const fields: Record<string, string> = {}
  for (const line of contents.split("\n")) {
    if (line.trim() === "") continue
    const [field, value] = parseLine(line, abs)
    fields[field] = value
  }

  const repo = fields["repo"]
  if (repo === undefined) throw new Error(`${abs}: missing required field "repo"`)
  const commit = fields["commit"]
  if (commit === undefined) throw new Error(`${abs}: missing required field "commit"`)

  return { repo, commit }
}

/** Where `acquire` clones and builds, relative to the repository root. */
const CLONE_RELATIVE = path.join(".tools", "veroroute-perfboard")
/** Where the built app bundle puts its executable, relative to the clone. */
const BINARY_RELATIVE = path.join("veroroute.app", "Contents", "MacOS", "veroroute")

function acquiredBinaryPath(repoRoot: string): string {
  return path.join(repoRoot, CLONE_RELATIVE, BINARY_RELATIVE)
}

/** Which binary path applies, and whether this repo owns acquiring it. */
export interface BinaryResolution {
  readonly path: string
  readonly mode: "acquired" | "explicit"
}

/**
 * Apply the resolution rule documented at the top of this file.
 *
 * Deliberately pure: no filesystem access, no process spawn. `acquire`
 * itself decides, separately, whether the acquired path already has a
 * binary sitting at it - this function only ever answers "which path and
 * whose responsibility."
 */
export function resolveBinary(env: Env, repoRoot: string): BinaryResolution {
  const value = env["VEROROUTE"]
  if (value === undefined) {
    return { path: acquiredBinaryPath(repoRoot), mode: "acquired" }
  }
  if (value.trim() === "") {
    throw new Error(
      "VEROROUTE is set but empty. An empty value cannot be an accident of it being unset - " +
        "something set it to nothing, and guessing which was meant is how a check ends up " +
        "running against a binary nobody chose. Unset VEROROUTE to use the binary this " +
        "repository acquires and builds, or point it at your own veroroute-perfboard checkout.",
    )
  }
  return { path: value, mode: "explicit" }
}

/** One command's exit status and its combined stdout+stderr. */
export interface CommandResult {
  readonly status: number | null
  readonly output: string
}

/** The injection seam every git/build step runs through. */
export type CommandRunner = (command: string, args: readonly string[], cwd: string) => CommandResult

function defaultRun(command: string, args: readonly string[], cwd: string): CommandResult {
  const result = spawnSync(command, [...args], { cwd, encoding: "utf8" })
  if (result.error) {
    throw new Error(`could not run ${command}: ${result.error.message}`)
  }
  const stdout = typeof result.stdout === "string" ? result.stdout : ""
  const stderr = typeof result.stderr === "string" ? result.stderr : ""
  return { status: result.status, output: `${stdout}${stderr}` }
}

export interface AcquireOptions {
  /** The repository root `.tools/` is created under. */
  readonly repoRoot: string
  /** Injected so no test ever clones or builds anything real. */
  readonly run?: CommandRunner
}

/**
 * Clone the pinned repo (if not already present), check out the pinned
 * commit, build with `qmake` then `make`, and return the built binary's
 * path.
 *
 * Cloning is skipped when the checkout directory already exists - a run
 * that previously cloned successfully but failed at `qmake`/`make` (missing
 * Homebrew qt@5, say) must be retryable without first deleting a perfectly
 * good clone. Checkout, `qmake` and `make` always run: a stale checkout at
 * the wrong commit, or a build left half-done by an earlier interrupted run,
 * must not be silently treated as already-acquired.
 *
 * THE LAST CHECK IS THE ONE THAT MATTERS: after every step reports success,
 * this refuses to return a path unless a binary actually exists there. A
 * build that exits 0 but produces no executable - a misconfigured .pro file,
 * an app bundle in the wrong place - must stop here naming what is missing,
 * not hand the caller a path that then fails to spawn with a worse, more
 * distant error.
 */
export function acquire(pin: Pin, opts: AcquireOptions): string {
  const run = opts.run ?? defaultRun
  const toolsDir = path.join(opts.repoRoot, ".tools")
  const cloneDir = path.join(opts.repoRoot, CLONE_RELATIVE)
  const binaryPath = path.join(cloneDir, BINARY_RELATIVE)

  if (!fs.existsSync(cloneDir)) {
    const clone = run("git", ["clone", pin.repo, cloneDir], toolsDir)
    if (clone.status !== 0) {
      throw new Error(
        `git clone ${pin.repo} into ${cloneDir} exited ${clone.status}; nothing was built.\n${clone.output}`,
      )
    }
  }

  const checkout = run("git", ["checkout", pin.commit], cloneDir)
  if (checkout.status !== 0) {
    throw new Error(
      `git checkout ${pin.commit} in ${cloneDir} exited ${checkout.status}; the commit pinned in ` +
        `veroroute.pin could not be checked out.\n${checkout.output}`,
    )
  }

  const qmake = run("qmake", [], cloneDir)
  if (qmake.status !== 0) {
    throw new Error(
      `qmake in ${cloneDir} exited ${qmake.status}. This build needs Homebrew qt@5 ` +
        `(brew install qt@5) with qmake on PATH.\n${qmake.output}`,
    )
  }

  const make = run("make", [], cloneDir)
  if (make.status !== 0) {
    throw new Error(`make in ${cloneDir} exited ${make.status}; the build did not complete.\n${make.output}`)
  }

  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `${binaryPath}: git and the build both reported success but the expected binary is not ` +
        "there. A build that half-worked and left no binary must not be reported as acquired.",
    )
  }

  return binaryPath
}
