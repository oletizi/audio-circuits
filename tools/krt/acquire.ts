/**
 * Acquire the pinned KiCadRoutingTools engine this repository routes boards with.
 *
 * Nothing in this repository computes a copper path - the engine does - so
 * which engine, at which commit, built how, is the foundation every later
 * placement and routing result stands on. `krt.pin` at the repository root
 * names the repo, a tag (provenance only) and a commit (the authority); this
 * module clones it into `.tools/krt/` (gitignored: the engine is a third-party
 * checkout, never repository content), checks out that commit, builds a Python
 * venv and the Rust grid router, and stamps the result.
 *
 * It follows `tools/perfboard/acquire.ts`, which does the same for the
 * VeroRoute fork: `readPin`, a stamp file, an injected command runner so no
 * test ever clones or compiles anything real, clone-then-checkout with one
 * `git fetch` retry, and a last check that the build artifact exists.
 *
 * THE STAMP IS THE HEART OF IT. "Is it built?" keyed on file existence is
 * wrong: a pin bump does not change whether a file exists, so the old build
 * stays in place while the tool reports the new commit - claiming code it is
 * not running. So `.built-commit` records the commit a FINISHED build came
 * from, and it is written LAST, after the router library has been seen on
 * disk. Any re-acquisition deletes the old stamp FIRST, so an interrupted or
 * failed build leaves the tree unstamped - unknown - never falsely agreed
 * with either the old or the new pin. `builtCommit` returning `undefined`
 * means unknown and must be treated as "not the pinned commit".
 *
 * THE ENVIRONMENT. KiCad's own shell points `PYTHONHOME` and `PYTHONPATH` at
 * its bundled Python, and the engine's venv would then load the wrong
 * interpreter. `engineEnv` removes both, `ensureBuilt` runs every command
 * through it, and later tasks that invoke the engine must do the same - that
 * is why it is exported.
 *
 * THE ROUTER IS BUILT FROM SOURCE (`build_router.py --from-source`). The
 * script's default is to download a prebuilt binary from the project's latest
 * release, which would put code on disk that is not the pinned commit; that
 * defeats the pin, so this module never lets it run. It needs `cargo`.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

/** A process environment. A key absent or `undefined` is not set. */
export type Env = Readonly<Record<string, string | undefined>>

/** What `krt.pin` says. `commit` is the authority; `tag` is provenance only. */
export interface Pin {
  readonly url: string
  readonly tag: string
  readonly commit: string
}

/** One command's exit status and its combined stdout+stderr. */
export interface CommandResult {
  readonly status: number | null
  readonly output: string
}

/**
 * The injection seam every git/build step runs through. `env` is the COMPLETE
 * environment for that invocation, not an overlay: removing a variable cannot
 * be expressed as a merge.
 */
export type CommandRunner = (
  command: string,
  args: readonly string[],
  cwd: string,
  env?: Env,
) => CommandResult

function parseLine(line: string, file: string): readonly [string, string] {
  const match = line.trim().match(/^(\S+)\s+(\S+)$/)
  if (match === null) {
    throw new Error(
      `${file}: could not parse line ${JSON.stringify(line)}; expected "<field> <value>", e.g. ` +
        '"url https://github.com/owner/repo.git".',
    )
  }
  return [match[1], match[2]]
}

/** Read `krt.pin`: `<field> <value>` lines, blank lines and `#` comments skipped. */
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
    const trimmed = line.trim()
    if (trimmed === "" || trimmed.startsWith("#")) continue
    const [field, value] = parseLine(line, abs)
    fields[field] = value
  }

  const required = (name: string): string => {
    const value = fields[name]
    if (value === undefined) throw new Error(`${abs}: missing required field "${name}"`)
    return value
  }
  return { url: required("url"), tag: required("tag"), commit: required("commit") }
}

/** Where the engine is cloned and built, relative to the repository root. */
const CLONE_RELATIVE = path.join(".tools", "krt")
const STAMP_BASENAME = ".built-commit"
const VENV_RELATIVE = ".venv"
/** Where `build_router.py --from-source` leaves the router library. */
const ROUTER_LIBRARY_RELATIVE = path.join("rust_router", "grid_router.so")

/** The variables KiCad's shell sets that make the engine's venv load the wrong Python. */
const POISONED_ENV = ["PYTHONHOME", "PYTHONPATH"] as const

/** Absolute path of the engine checkout under `repoRoot`. */
export function engineDir(repoRoot: string): string {
  return path.join(repoRoot, CLONE_RELATIVE)
}

/** Absolute path of the venv's Python interpreter. */
export function venvPython(repoRoot: string): string {
  return path.join(engineDir(repoRoot), VENV_RELATIVE, "bin", "python")
}

/** Absolute path of the built Rust router library. */
export function routerLibraryPath(repoRoot: string): string {
  return path.join(engineDir(repoRoot), ROUTER_LIBRARY_RELATIVE)
}

/** Absolute path of the build stamp. */
export function builtCommitFile(repoRoot: string): string {
  return path.join(engineDir(repoRoot), STAMP_BASENAME)
}

/**
 * The commit the engine under `repoRoot` was built from, or `undefined` when
 * there is no stamp: never built, or a build that did not finish. `undefined`
 * is unknown, which callers must treat as not agreeing with the pin.
 */
export function builtCommit(repoRoot: string): string | undefined {
  const file = builtCommitFile(repoRoot)
  if (!fs.existsSync(file)) return undefined
  const text = fs.readFileSync(file, "utf8").trim()
  return text === "" ? undefined : text
}

/** `env` with `PYTHONHOME` and `PYTHONPATH` removed. Every engine call uses this. */
export function engineEnv(env: Env): Env {
  const kept: Record<string, string | undefined> = { ...env }
  for (const name of POISONED_ENV) delete kept[name]
  return kept
}

function defaultRun(command: string, args: readonly string[], cwd: string, env?: Env): CommandResult {
  const result = spawnSync(command, [...args], {
    cwd,
    encoding: "utf8",
    ...(env === undefined ? {} : { env: { ...env } }),
  })
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
  /** Injected so no test reads the real process environment. */
  readonly env?: Env
}

export interface Built {
  readonly engineDir: string
  /** The commit from the STAMP, never from the pin file. */
  readonly commit: string
  /** True when this call did the acquisition, false when the stamp already agreed. */
  readonly acquired: boolean
}

function step(
  run: CommandRunner,
  env: Env,
  what: string,
  command: string,
  args: readonly string[],
  cwd: string,
): CommandResult {
  const result = run(command, args, cwd, env)
  if (result.status !== 0) {
    throw new Error(
      `${what}: \`${command} ${args.join(" ")}\` in ${cwd} exited ${result.status}; the engine is ` +
        `not built and is left unstamped.\n${result.output}`,
    )
  }
  return result
}

/**
 * Clone (if absent), check out the pinned commit, build the venv and the Rust
 * router, and write the stamp. Always does the work; `ensureBuilt` is the
 * stamp-gated entry point.
 */
export function acquire(pin: Pin, opts: AcquireOptions): Built {
  const run = opts.run ?? defaultRun
  const env = engineEnv(opts.env ?? process.env)
  const dir = engineDir(opts.repoRoot)

  // Drop the old stamp before touching anything: from here until the new
  // stamp is written the tree is UNKNOWN, and a failure must leave it so.
  fs.rmSync(builtCommitFile(opts.repoRoot), { force: true })

  if (!fs.existsSync(dir)) {
    step(run, env, "clone", "git", ["clone", pin.url, dir], opts.repoRoot)
  }

  // A clone made before the pin advanced lacks the new commit: fetch and retry
  // once, so a pin edit is followed without anyone running git in a directory
  // this tool owns.
  let checkout = run("git", ["checkout", pin.commit], dir, env)
  if (checkout.status !== 0) {
    step(run, env, "fetch", "git", ["fetch", "origin"], dir)
    checkout = run("git", ["checkout", pin.commit], dir, env)
  }
  if (checkout.status !== 0) {
    throw new Error(
      `git checkout ${pin.commit} in ${dir} exited ${checkout.status}; the commit pinned in krt.pin ` +
        `could not be checked out, and a git fetch did not bring it in.\n${checkout.output}\n` +
        `Check krt.pin for a typo (commit must be the dereferenced tag target, not the tag object), ` +
        `or remove ${dir} and re-run to reclone.`,
    )
  }

  const cargo = run("cargo", ["--version"], dir, env)
  if (cargo.status !== 0) {
    throw new Error(
      "cargo is not available. The router is built from source at the pinned commit (the prebuilt " +
        "download would not be that commit), so it needs a Rust toolchain: install it from " +
        "https://rustup.rs or `brew install rust`.",
    )
  }

  const venv = path.join(dir, VENV_RELATIVE)
  step(run, env, "venv", "python3", ["-m", "venv", venv], dir)
  const python = venvPython(opts.repoRoot)
  step(run, env, "python dependencies", python, ["-m", "pip", "install", "-r", "requirements.txt"], dir)
  step(run, env, "router build (build_router.py)", python, ["build_router.py", "--from-source"], dir)

  const library = routerLibraryPath(opts.repoRoot)
  if (!fs.existsSync(library)) {
    throw new Error(
      `${library}: build_router.py reported success but the router library is not there. A build ` +
        "that left no artifact must not be stamped as built; the engine's build recipe may have " +
        "moved its output at this commit.",
    )
  }

  // Last, and only now: the stamp claims a FINISHED build.
  fs.writeFileSync(builtCommitFile(opts.repoRoot), `${pin.commit}\n`)
  return { engineDir: dir, commit: pin.commit, acquired: true }
}

/**
 * The stamp-gated entry point: a no-op when the stamp equals the pin's commit,
 * otherwise `acquire`. A missing stamp is unknown, not agreement.
 */
export function ensureBuilt(pin: Pin, opts: AcquireOptions): Built {
  const stamped = builtCommit(opts.repoRoot)
  if (stamped === pin.commit) {
    return { engineDir: engineDir(opts.repoRoot), commit: stamped, acquired: false }
  }
  return acquire(pin, opts)
}

if (import.meta.main) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
  const built = ensureBuilt(readPin(path.join(repoRoot, "krt.pin")), { repoRoot })
  const stamped = builtCommit(repoRoot)
  console.log(`krt engine: ${built.engineDir}`)
  console.log(`krt built from commit (stamp): ${stamped ?? "UNSTAMPED"}`)
  console.log(built.acquired ? "krt: acquired and built just now" : "krt: already built, nothing to do")
}
