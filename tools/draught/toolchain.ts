/**
 * THE PINNED TOOLCHAIN AND THE CHECK THAT REFUSES ON A MISMATCH.
 *
 * `TOOLING.md`'s own words about its toolchain table: *"a procedure that
 * names versions it does not enforce is a transcription with a date on
 * it."* `draughting/tools.lock.json` is the names; `readLock` and
 * `checkToolchain` below are the enforcement. Nothing here installs
 * anything - `draughting/install.sh` (Task 3 of
 * `docs/superpowers/plans/2026-10-30-institutionalise-draughting.md`) does
 * that - and nothing here decides what to do about a disagreement, which is
 * `make draught-doctor` (Task 2) and `make draw` (Task 5).
 *
 * **"any" AS A VERSION MEANS PRESENCE ONLY.** `qpdf`'s entry in the lock
 * carries no pinned version because nothing in the loop depends on a
 * specific one (`TOOLING.md`); `checkToolchain` still runs its probe and
 * still reports a problem if it finds nothing, because "any version" is not
 * "no check".
 *
 * **A PROBE THAT CANNOT RUN YIELDS `found: null`, NEVER A THROWN ERROR.**
 * The caller - the doctor verb, `make draw`'s own refusal - decides what a
 * missing tool means; this module only reports what it measured.
 *
 * **WHY SOME PROBES ARE NOT THE BARE COMMAND THE LOCK NAMES.**
 * `.superpowers/sdd/2026-10-30-institutionalise-draughting/rulings.md`
 * Finding 7, measured on the machine this was written on: `kicad-cli` is
 * fully installed and working (`make check` invokes it on every run) but is
 * NOT on `PATH` - it lives where `lib/kicad/install.ts`'s `defaultKicadCli`
 * resolves it, the macOS `.app` bundle's `Contents/MacOS/kicad-cli`. A probe
 * that runs `execFileSync("kicad-cli", ...)` would report that working
 * install as absent. **A probe resolves its tool the way the rest of this
 * repository does**: for a tool with a resolver
 * (`kicad-cli`, `akcli`, `magick`, `qpdf`, `copperhead`), `resolveProbeArgv`
 * below substitutes the resolved path before running anything. The bare-name
 * form in the lock stays as the human-readable, documentary command; only
 * `nosuchtool`-shaped entries with no resolver actually run it verbatim.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { defaultQpdf } from "../guide/pdf-merge-install.ts"
import { defaultAkcli } from "./akcli-install.ts"
import { defaultCopperheadDir } from "./copperhead-install.ts"
import { defaultMagick } from "./magick-install.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

/** One tool's pinned spec, as `draughting/tools.lock.json` declares it. */
export interface ToolSpec {
  readonly version: string
  readonly probe: readonly string[]
  readonly commit?: string
  readonly upstream?: string
  readonly licence?: string
  readonly pypi?: string
}

export type Toolchain = Readonly<Record<string, ToolSpec>>

export interface ToolchainProblem {
  readonly tool: string
  readonly wanted: string
  readonly found: string | null
  readonly how: string
}

const LOCK_PATH = path.join(moduleRepoRoot(), "draughting", "tools.lock.json")

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string"
}

function parseToolSpec(lockPath: string, tool: string, value: unknown): ToolSpec {
  if (!isRecord(value)) {
    throw new Error(
      `${lockPath}: "${tool}" must be a JSON object naming at least "version" and "probe", ` +
        `found ${JSON.stringify(value)}.`,
    )
  }
  const { version, probe, commit, upstream, licence, pypi } = value
  if (typeof version !== "string") {
    throw new Error(`${lockPath}: "${tool}.version" is missing or not a string.`)
  }
  if (!isStringArray(probe) || probe.length === 0) {
    throw new Error(
      `${lockPath}: "${tool}.probe" is missing or not a non-empty array of strings - it is the ` +
        "command this check runs to find the installed version.",
    )
  }
  if (!isOptionalString(commit)) {
    throw new Error(`${lockPath}: "${tool}.commit" must be a string when present.`)
  }
  if (!isOptionalString(upstream)) {
    throw new Error(`${lockPath}: "${tool}.upstream" must be a string when present.`)
  }
  if (!isOptionalString(licence)) {
    throw new Error(`${lockPath}: "${tool}.licence" must be a string when present.`)
  }
  if (!isOptionalString(pypi)) {
    throw new Error(`${lockPath}: "${tool}.pypi" must be a string when present.`)
  }
  return { version, probe, commit, upstream, licence, pypi }
}

/**
 * Read and validate `draughting/tools.lock.json`, throwing naming the file
 * and the missing or malformed field rather than defaulting one.
 */
export function readLock(): Toolchain {
  let raw: string
  try {
    raw = readFileSync(LOCK_PATH, "utf8")
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`could not read the pinned toolchain lock ${LOCK_PATH}: ${detail}.`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${LOCK_PATH} is not valid JSON: ${detail}.`)
  }

  if (!isRecord(parsed)) {
    throw new Error(`${LOCK_PATH} must hold a JSON object mapping tool name to its pinned spec.`)
  }

  const toolchain: Record<string, ToolSpec> = {}
  for (const [tool, value] of Object.entries(parsed)) {
    toolchain[tool] = parseToolSpec(LOCK_PATH, tool, value)
  }
  return toolchain
}

/**
 * Resolvers for the tools this repository pins beyond trusting `PATH` -
 * Finding 3 of the rulings file above, extended here beside
 * `lib/kicad/install.ts`'s own `defaultKicadCli` rather than a fourth
 * pattern. Keyed by the lock's tool name, each returns the resolved
 * BINARY path that replaces `probe[0]`.
 */
const RESOLVED_BINARY: Readonly<Record<string, () => string>> = {
  "kicad-cli": defaultKicadCli,
  akcli: defaultAkcli,
  magick: defaultMagick,
  qpdf: defaultQpdf,
}

/**
 * Build the argv actually executed for `tool`'s `probe`: substitute a
 * resolved path for tools `RESOLVED_BINARY` knows, resolve copperhead's
 * relative `src/cli.ts` against its checkout directory, and otherwise run
 * the lock's own command verbatim - the path a genuinely PATH-resident tool
 * (or an unrecognised one, like the "nosuchtool" test fixture) takes.
 */
function resolveProbeArgv(tool: string, probe: readonly string[]): readonly string[] {
  const resolver = RESOLVED_BINARY[tool]
  if (resolver !== undefined) {
    return [resolver(), ...probe.slice(1)]
  }
  if (tool === "copperhead") {
    const scriptIndex = probe.indexOf("src/cli.ts")
    if (scriptIndex === -1) return probe
    const resolved = [...probe]
    resolved[scriptIndex] = path.join(defaultCopperheadDir(), "src/cli.ts")
    return resolved
  }
  return probe
}

/** The first `major.minor(.patch)(-build)`-shaped token in free-form `--version` output. */
function extractVersion(output: string): string | null {
  const match = output.match(/\d+\.\d+(?:\.\d+)?[\w.-]*/)
  return match ? match[0] : null
}

/**
 * Run `tool`'s `probe` (through `resolveProbeArgv`) and report what it
 * printed - a version-looking token if one is found, the trimmed raw output
 * otherwise, or `null` if the command could not be run at all. Never throws:
 * a probe failing to run IS the answer "not found", not an error in this
 * check.
 */
export function probeTool(tool: string, probe: readonly string[]): string | null {
  const argv = resolveProbeArgv(tool, probe)
  const [command, ...args] = argv
  if (command === undefined) return null
  try {
    // `stdio` is explicit, not left to default: a probe that fails (every
    // "not installed" case this function exists to report) otherwise lets
    // the failing subprocess's own stack trace reach this process's own
    // stderr, which reads like THIS check crashed rather than like the
    // probe answering "not found".
    const output = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    const trimmed = output.trim()
    return extractVersion(trimmed) ?? (trimmed === "" ? null : trimmed)
  } catch {
    return null
  }
}

/**
 * The `pip` sibling of a resolved venv console script - same directory, same
 * naming convention the script's own path already carries (`.exe` or not).
 * Fix-round Important 2: a `how` string for a pypi-backed tool has to
 * install into the SAME venv the probe reads, not whatever `pip` happens to
 * be on `PATH` - deriving it from the already-resolved binary path, rather
 * than writing the venv's location out a second time, is what keeps the two
 * from drifting apart the way Important 1 did for copperhead.
 */
function venvPipFor(scriptPath: string): string {
  const dir = path.dirname(scriptPath)
  const pipName = scriptPath.toLowerCase().endsWith(".exe") ? "pip.exe" : "pip"
  return path.join(dir, pipName)
}

/**
 * The command that would fix `tool`, given what its lock entry carries and
 * what the probe actually found - `null` for "nothing answered at all" (a
 * BOOTSTRAP: the venv or checkout itself is missing), anything else for "it
 * ran and reported the wrong thing" (an UPGRADE: the venv or checkout
 * exists, just at the wrong version or commit).
 *
 * **R6 (rulings.md): a bootstrap `how` and an upgrade `how` are two
 * different commands, and this function printed the same one for both
 * states until now.** `git clone` refuses outright onto a directory that
 * already exists, so the clone chain this function used to print
 * unconditionally for copperhead was correct only for "absent" and failed
 * with `fatal: destination path ... already exists` on the far more common
 * mismatch case - a checkout present at the wrong commit. `pip install`
 * fails `No such file or directory` against a venv's `bin/pip` that was
 * never created, so the bare pip-install chain this function printed
 * unconditionally for akcli was correct only for "version mismatch inside an
 * existing venv" and failed on this very machine's actual state before Task
 * 3's install ran (the venv did not exist at all). `found` is what
 * distinguishes the two states, and `checkToolchain` already has it to
 * hand - this function just has to be given it rather than reprobing the
 * filesystem a second time.
 */
export function howToFix(tool: string, spec: ToolSpec, found: string | null): string {
  if (spec.pypi !== undefined) {
    const pinnedPackage = spec.pypi.replace(/==.*/, `==${spec.version}`)
    const resolver = RESOLVED_BINARY[tool]
    // Fix-round Important 2: if this tool resolves to a specific installed
    // binary (akcli does, via its venv), target THAT venv's pip rather than
    // the bare "pip" a plain shell would resolve from PATH - the probe reads
    // the resolved binary, so the fix has to install beside it.
    if (resolver !== undefined) {
      const binary = resolver()
      const pip = venvPipFor(binary)
      // R6: BOOTSTRAP. Nothing answered the probe at all, which for a
      // pypi-backed tool with a dedicated venv means the venv itself is
      // missing - `pip install` into a `bin/pip` that was never created
      // fails `No such file or directory` rather than installing anything.
      // Create the venv first, in the exact directory the probe (and this
      // same `pip`) already resolve - two levels above the binary on every
      // platform this repository's venv layouts use (`bin/<tool>` or
      // `Scripts\<tool>.exe`), never a second literal path.
      //
      // Fix round 2, M-2: this used to also require `tool === "akcli"`
      // literally, which is exactly the bug R6 exists to fix, reproduced in
      // R6's own code - akcli is the only pypi-backed, resolver-backed tool
      // TODAY, so the literal name check was harmless today and would
      // silently print the wrong (non-venv-creating) command for a SECOND
      // one added later. `found === null` plus already being inside both
      // `spec.pypi !== undefined` and `resolver !== undefined` is the
      // derivation this branch actually needs - a property of the SPEC and
      // the probe's result, not of which tool happens to be named here.
      // `tests/draught/toolchain.test.ts`'s "M-2 regression" test drives a
      // synthetic second pypi tool through this exact path.
      if (found === null) {
        const venvDir = path.dirname(path.dirname(binary))
        return `python3 -m venv ${venvDir} && ${pip} install '${pinnedPackage}'`
      }
      return `${pip} install '${pinnedPackage}'`
    }
    return `pip install '${pinnedPackage}'`
  }
  if (tool === "copperhead" && spec.commit !== undefined && spec.upstream !== undefined) {
    // Fix-round Important 1: built from `defaultCopperheadDir()`, the same
    // function `resolveProbeArgv` above calls - never the literal
    // "draughting/copperhead" a second time, so this cannot drift from
    // wherever the probe actually looks.
    const dir = defaultCopperheadDir()
    // R6: UPGRADE. The probe ran and reported something - so the checkout
    // directory exists - and `git clone` onto an existing directory refuses
    // outright rather than updating it. Fetch and check out the pinned
    // commit in place instead of cloning a second time.
    if (found !== null) {
      return `git -C ${dir} fetch && git -C ${dir} checkout ${spec.commit} && cd ${dir} && npm install`
    }
    // R6: BOOTSTRAP. Nothing answered the probe at all, so there is nothing
    // at `dir` yet to fetch into - clone it fresh.
    return `git clone ${spec.upstream} ${dir} && git -C ${dir} checkout ${spec.commit} && cd ${dir} && npm install`
  }
  if (spec.upstream !== undefined) {
    return `install ${tool} ${spec.version} from ${spec.upstream}`
  }
  return `install ${tool} ${spec.version} - see draughting/tools.lock.json and TOOLING.md`
}

/**
 * Probe every tool the lock names and report one problem per disagreement:
 * a version that does not match (for a pinned version) or a tool the probe
 * could not find at all (for "any", or for a pinned version nothing
 * answered for). A tool that matches is not reported - this is a list of
 * disagreements, not a status report.
 */
export function checkToolchain(lock: Toolchain): ToolchainProblem[] {
  const problems: ToolchainProblem[] = []
  for (const [tool, spec] of Object.entries(lock)) {
    const found = probeTool(tool, spec.probe)
    if (spec.version === "any") {
      if (found === null) {
        problems.push({ tool, wanted: spec.version, found, how: howToFix(tool, spec, found) })
      }
      continue
    }
    if (found === null || found !== spec.version) {
      problems.push({ tool, wanted: spec.version, found, how: howToFix(tool, spec, found) })
    }
  }
  return problems
}
