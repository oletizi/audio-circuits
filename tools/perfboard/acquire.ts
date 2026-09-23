/**
 * Acquire the forked VeroRoute binary this repository checks layouts against.
 *
 * The fork is a separate GPLv3 Qt5 application with its own build. This
 * repository does not vendor it and does not submodule it - `veroroute.pin`
 * at the repository root names a repo and a pinned commit, and this module
 * clones that repo, checks out that commit, and runs the fork's OWN
 * `build.sh` (which itself runs `qmake` then `make` - this module does not
 * reimplement that recipe, see `acquire` below). The result lands under
 * `.tools/`, which is gitignored: it is a build artifact of a GPLv3 C++
 * project, not repository content.
 *
 * `readPin`, `resolveBinary`, `resolveQmake` and `acquire` are four separate,
 * composable questions:
 *   - `readPin` answers "what does veroroute.pin say" - nothing else.
 *   - `resolveBinary` answers "which binary path and mode apply given this
 *     environment" - a pure function that never touches the filesystem or a
 *     process, so a test can exercise every branch of the resolution rule
 *     without a real checkout anywhere.
 *   - `resolveQmake` answers "which qmake do we build with" by asking
 *     Homebrew where it put the keg-only `qt@5` formula (`brew --prefix
 *     qt@5`), unless `QMAKE` overrides it. It is not pure - it shells to
 *     `brew` through the same injected `run` - but every test still injects
 *     that `run`, so no test here ever shells to a real `brew`.
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
 * `QMAKE` follows the identical shape, one level down the build, because
 * Homebrew's `qt@5` is keg-only and deliberately never linked onto `PATH`:
 *   - `QMAKE` unset -> ask `brew --prefix qt@5` and use `<prefix>/bin/qmake`,
 *     confirming it exists. This is the road every fresh operator gets with
 *     zero configuration, once `qt@5` is installed.
 *   - `QMAKE` set to anything else -> use it unchanged, unconditionally. The
 *     operator pointing at their own Qt is theirs.
 *   - `QMAKE` set but empty or whitespace -> refuse, for the same reason
 *     an empty `VEROROUTE` refuses.
 *
 * There is deliberately no hardcoded fallback like `$HOME/src/...`, and no
 * search over guessed Qt install locations either: `brew --prefix qt@5` is
 * not a fallback search, it is asking the package manager where it put the
 * thing, matching `check.ts`'s own reasoning for `verorouteBinary`.
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

/**
 * The injection seam every git/build step runs through. `env`, when given, is
 * merged over the process environment for that one invocation - only the
 * fork's `build.sh` needs this, to hand it `QT_PREFIX` without mutating
 * `process.env` for every other command this module runs.
 */
export type CommandRunner = (
  command: string,
  args: readonly string[],
  cwd: string,
  env?: Env,
) => CommandResult

/** Which `qmake` to run, and whose Qt5 it is. */
export interface QmakeResolution {
  readonly command: string
  readonly mode: "brew" | "explicit"
}

/**
 * Resolve which `qmake` to invoke for the build.
 *
 * `QMAKE` unset -> ask Homebrew where it put `qt@5` (`brew --prefix qt@5`)
 * and use `<prefix>/bin/qmake`, confirming that binary actually exists
 * before handing it back. Homebrew's `qt@5` is keg-only, so it is
 * deliberately never linked onto `PATH`; `brew --prefix` is how a program,
 * not just a human, is meant to find a keg-only formula. That is
 * categorically different from a fallback search over guessed install
 * locations - it is asking the one program that knows where it put the
 * thing, the same way `resolveBinary` above refuses a hardcoded
 * `$HOME/src/...` guess.
 *
 * `QMAKE` set to anything else -> mode "explicit", returned unchanged. The
 * operator pointing at their own Qt is theirs, mirroring exactly how
 * `VEROROUTE` lets an operator point at their own veroroute-perfboard
 * checkout: this function must never override it.
 *
 * `QMAKE` set but empty or whitespace -> refuse, for the same reason
 * `resolveBinary` refuses an empty `VEROROUTE`: an empty value cannot be an
 * accident of it being unset.
 */
export function resolveQmake(env: Env, run: CommandRunner, repoRoot: string): QmakeResolution {
  const value = env["QMAKE"]
  if (value !== undefined) {
    if (value.trim() === "") {
      throw new Error(
        "QMAKE is set but empty. An empty value cannot be an accident of it being unset - " +
          "something set it to nothing, and guessing which was meant is how a build ends up " +
          "running against a qmake nobody chose. Unset QMAKE to use the qt@5 this tool locates " +
          "through Homebrew, or point it at your own qmake.",
      )
    }
    return { command: value, mode: "explicit" }
  }

  let brewResult: CommandResult
  try {
    brewResult = run("brew", ["--prefix", "qt@5"], repoRoot)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `could not run brew to locate qt@5: ${detail}. This build needs Homebrew ` +
        "(https://brew.sh) installed, then \"brew install qt@5\" - or, to point at a qmake " +
        "from a non-Homebrew Qt installation instead, set QMAKE.",
    )
  }

  if (brewResult.status !== 0) {
    throw new Error(
      `brew --prefix qt@5 exited ${brewResult.status}; qt@5 does not appear to be installed. ` +
        'Run "brew install qt@5", or set QMAKE to point at a qmake from a non-Homebrew Qt ' +
        `installation.\n${brewResult.output}`,
    )
  }

  const prefix = brewResult.output.trim()
  const qmakePath = path.join(prefix, "bin", "qmake")
  if (!fs.existsSync(qmakePath)) {
    throw new Error(
      `${qmakePath}: brew --prefix qt@5 resolved to ${prefix}, but no qmake exists there. ` +
        'Reinstall with "brew reinstall qt@5", or set QMAKE to point at a qmake from a ' +
        "non-Homebrew Qt installation.",
    )
  }

  return { command: qmakePath, mode: "brew" }
}

/** Node reports a missing executable via `spawnSync`'s error as `ENOENT`. */
function isMissingExecutable(error: NodeJS.ErrnoException): boolean {
  return error.code === "ENOENT"
}

function defaultRun(command: string, args: readonly string[], cwd: string, env?: Env): CommandResult {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    ...(env === undefined ? {} : { env: { ...process.env, ...env } }),
  })
  if (result.error) {
    // `qmake` missing entirely (Qt5 not installed at all) is the most likely
    // first-run failure - `veroroute` is the first verb a new operator runs -
    // so it gets the same quality of guidance as the adjacent non-zero-exit
    // branch below, rather than a bare ENOENT.
    if (isMissingExecutable(result.error) && path.basename(command) === "qmake") {
      throw new Error(
        `could not run qmake at ${command}: ${result.error.message}. This build needs ` +
          "Homebrew qt@5 (brew install qt@5), or QMAKE pointed at a real qmake.",
      )
    }
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
  /** Injected so no test resolves `QMAKE` against the real process environment. */
  readonly env?: Env
}

/**
 * Clone the pinned repo (if not already present), check out the pinned
 * commit, run the fork's own `build.sh`, and return the built binary's path.
 *
 * Cloning is skipped when the checkout directory already exists - a run
 * that previously cloned successfully but failed at the build step (missing
 * Homebrew qt@5, say) must be retryable without first deleting a perfectly
 * good clone. Checkout and the build always run: a stale checkout at the
 * wrong commit, or a build left half-done by an earlier interrupted run,
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
  const env = opts.env ?? process.env
  const cloneDir = path.join(opts.repoRoot, CLONE_RELATIVE)
  const binaryPath = path.join(cloneDir, BINARY_RELATIVE)

  // `cwd: opts.repoRoot`, not `.tools/`: on a fresh checkout, `.tools/` does
  // not exist yet (nothing creates it - it is gitignored and this is the
  // only thing that would ever populate it), and `spawnSync` refuses to run
  // in a `cwd` that is not there. `git clone <repo> <dest>` creates every
  // missing leading directory of `<dest>` itself, so running it from a
  // directory that is guaranteed to exist (the repository root) needs no
  // `mkdirSync` here at all.
  if (!fs.existsSync(cloneDir)) {
    const clone = run("git", ["clone", pin.repo, cloneDir], opts.repoRoot)
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
        `veroroute.pin could not be checked out.\n${checkout.output}\n` +
        `If ${cloneDir} is a clone made before this pin advanced, that commit may not be present ` +
        `locally: delete ${cloneDir} and re-run to reclone, or run "git fetch" inside it.`,
    )
  }

  // The fork ships its own build recipe (`build.sh`): clone root -> mkdir
  // build/ -> qmake Src/veroroute.pro -> make. Reimplementing that sequence
  // here would mean carrying a second copy that goes stale silently the
  // moment the fork's own recipe changes - which is exactly how the bare
  // `qmake` (no .pro argument, run in the wrong directory) defect this
  // replaces arose in the first place. `resolveQmake` is reused only to find
  // WHICH Qt5 to build with (Homebrew's keg-only qt@5, or an operator's
  // override); `build.sh` itself is the one authority on how to build.
  const qmakeResolution = resolveQmake(env, run, opts.repoRoot)
  // build.sh takes QT_PREFIX (a directory) and appends "bin/qmake" itself, so
  // the prefix is derived from the resolved qmake path rather than asking
  // brew a second time: <prefix>/bin/qmake -> <prefix>.
  const qtPrefix = path.dirname(path.dirname(qmakeResolution.command))

  const buildScript = path.join(cloneDir, "build.sh")
  if (!fs.existsSync(buildScript)) {
    throw new Error(
      `${buildScript}: not found. Every revision of the veroroute-perfboard fork ships its own ` +
        "build.sh; its absence means the commit pinned in veroroute.pin is not that fork. Check " +
        `veroroute.pin, or remove ${cloneDir} and re-run to reclone.`,
    )
  }

  const build = run(buildScript, [], cloneDir, { QT_PREFIX: qtPrefix })
  if (build.status !== 0) {
    throw new Error(
      `${buildScript} in ${cloneDir} exited ${build.status}; the build did not complete.\n${build.output}`,
    )
  }

  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `${binaryPath}: git and the build both reported success but the expected binary is not ` +
        "there. A build that half-worked and left no binary must not be reported as acquired.",
    )
  }

  return binaryPath
}
