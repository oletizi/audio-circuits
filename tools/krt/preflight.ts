/**
 * Preflight the pinned routing engine: prove its four core operations run on
 * THIS machine, and record the exact command lines that did, so later tasks
 * drive the engine from `build/krt/invocations.json` rather than inventing
 * commands.
 *
 * WHY THE VERB NAMES ARE NOT THE PLAN'S. The plan and spec speak of
 * `check-intent`, `place`, `route` and `route-all`. The engine has no such
 * verbs; it is a directory of Python scripts. The real entry points, found by
 * reading each one's `--help`, are:
 *
 *   placement   py_placer/place_optimize.py   input.kicad_pcb output.kicad_pcb
 *   grading     py_tools/check_floorplan.py   board --intent FILE --require-rules 1
 *               exit 0 = graded clean, exit 4 = graded and VIOLATIONS found
 *               (2 = bad intent file, 3 = board not gradable, 1 = crash)
 *   routing     py_router/route.py            input --output FILE --nets ...
 *   zone refill py_router/route_planes.py     creates the (unfilled) pour, then
 *               `kicad-cli pcb drc --refill-zones --save-board` fills and SAVES it
 *
 * ZONE REFILL USES kicad-cli, NOT THE ENGINE'S OWN FILL. The engine's
 * `kicad_exact_fill.py` drives pcbnew and needs KiCad's bundled Python, which is
 * exactly the interpreter `PYTHONHOME`/`PYTHONPATH` stripping exists to keep
 * the engine's venv away from; its header also says it degrades SILENTLY to a
 * raster approximation when unavailable. kicad-cli does the same refill-and-save
 * with no second interpreter, so it is the recorded way. `route_planes.py` only
 * creates the pour; it does not fill it.
 *
 * THE GRADER IS EXERCISED BOTH WAYS. One intent whose zone holds the parts must
 * exit 0, and the same intent with the zone moved away must exit 4; a grader
 * that cannot be made to fail would otherwise approve every placement later.
 * `--require-rules 1` makes "no rule ran" a failure, not a pass.
 *
 * The fixture is a throwaway two-part board (`preflight-fixture.ts`), never a
 * real board. The engine commit recorded is read from the BUILD STAMP.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  builtCommit, defaultRun, engineDir, engineEnv, ensureBuilt, readPin, venvPython,
} from "./acquire.ts"
import type { CommandRunner, Env } from "./acquire.ts"
import { fixtureBoardText } from "./preflight-fixture.ts"
import { defaultKicadCli } from "../../lib/kicad/install.ts"

/** One command line the preflight ran, and what it was required to do. */
export interface Invocation {
  readonly label: string
  /** argv[0] is the interpreter or binary; the rest are exactly as run, relative to `cwd`. */
  readonly argv: readonly string[]
  /** The same argv with the fixture's paths replaced by `{input}`/`{output}`/... tokens. */
  readonly template: readonly string[]
  readonly cwd: string
  readonly expectedStatus: number
  readonly observedStatus: number | null
  readonly succeeded: boolean
  readonly evidence: string
  /** Present when the command changes something beyond its named output. */
  readonly sideEffects?: string
}

export interface OperationRecord {
  readonly operation: "placement" | "grading" | "routing" | "zone-refill"
  readonly engineEntryPoint: string
  readonly succeeded: boolean
  readonly invocations: readonly Invocation[]
}

export interface InvocationsFile {
  readonly engineCommit: string
  readonly environment: { readonly unset: readonly string[]; readonly note: string }
  readonly fixture: string
  readonly pathRules: string
  readonly allSucceeded: boolean
  readonly operations: readonly OperationRecord[]
}

const UNSET: readonly string[] = ["PYTHONHOME", "PYTHONPATH"]
export const INVOCATIONS_RELATIVE = path.join("build", "krt", "invocations.json")
const WORK_RELATIVE = path.join("build", "krt", "preflight")

interface Context {
  readonly repoRoot: string
  readonly run: CommandRunner
  readonly env: Env
  readonly work: string
  readonly engine: string
  readonly python: string
  readonly kicadCli: string
}

function rel(root: string, file: string): string {
  return path.relative(root, file)
}

/**
 * An absolute path under the repository becomes relative to the command's cwd,
 * so the committed record names no machine's home directory; anything else
 * (the system kicad-cli, a flag, a net name) is left as it is.
 */
function local(root: string, cwd: string, arg: string): string {
  if (!path.isAbsolute(arg) || path.relative(root, arg).startsWith("..")) return arg
  return path.relative(cwd, arg)
}

function countOf(file: string, needle: string): number {
  return fs.readFileSync(file, "utf8").split(needle).length - 1
}

/**
 * route.py and route_planes.py rewrite a .kicad_pro beside their output and may
 * relax the DRC floors, printing "FAB FLOOR RELAXED" (engine
 * py_router/fix_kicad_drc_settings.py). The engine's own authors record that
 * saying nothing about this let sub-floor vias through in silence, so it is
 * written into the contract, not left to a report.
 */
const PROJECT_SIDE_EFFECT =
  'Writes or modifies a .kicad_pro beside the output and may relax the DRC floors; grep the output for "FAB FLOOR RELAXED".'

/** Run one command, check its exit status against what it MUST be, and record it. */
function invoke(
  ctx: Context, label: string, binary: string, cwd: string, args: readonly string[],
  tokens: Readonly<Record<string, string>>, expectedStatus: number, evidence: () => string, sideEffects?: string,
): Invocation {
  const result = ctx.run(binary, args.map((a) => local(ctx.repoRoot, cwd, a)), cwd, ctx.env)
  const argv = [local(ctx.repoRoot, ctx.repoRoot, binary), ...args.map((a) => local(ctx.repoRoot, cwd, a))]
  const template = [argv[0], ...args.map((a) => tokens[a] ?? local(ctx.repoRoot, cwd, a))]
  const statusOk = result.status === expectedStatus
  let detail = ""
  let succeeded = statusOk
  if (statusOk) {
    try {
      detail = evidence()
    } catch (error) {
      succeeded = false
      detail = error instanceof Error ? error.message : String(error)
    }
  } else {
    detail = `exited ${result.status}, expected ${expectedStatus}. Output tail:\n${result.output.slice(-1500)}`
  }
  return {
    label, argv, template, cwd: rel(ctx.repoRoot, cwd) || ".", expectedStatus,
    observedStatus: result.status, succeeded, evidence: detail,
    ...(sideEffects === undefined ? {} : { sideEffects }),
  }
}

function ensure(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function placement(ctx: Context, fixture: string, placed: string): OperationRecord {
  const script = "py_placer/place_optimize.py"
  const before = fs.readFileSync(fixture, "utf8")
  const inv = invoke(
    ctx, "optimise placement", ctx.python, ctx.engine,
    [script, fixture, placed, "--max-displacement", "3"],
    { [fixture]: "{input}", [placed]: "{output}" }, 0,
    () => {
      ensure(fs.existsSync(placed), `${placed} was not written`)
      const after = fs.readFileSync(placed, "utf8")
      ensure(after !== before, "the output board is byte-identical to the input; the fixture is built so the optimizer moves its parts, so nothing was optimised")
      ensure(after.includes('"TP1"') && after.includes('"TP2"'), "the output board lost a footprint")
      return "wrote a board that differs from the input and still holds TP1 and TP2"
    },
  )
  return { operation: "placement", engineEntryPoint: script, succeeded: inv.succeeded, invocations: [inv] }
}

const INTENT_ZONE_HOLDS = [5, 5, 31, 25]
const INTENT_ZONE_MISSES = [5, 5, 8, 8]

function intentText(zone: readonly number[]): string {
  return JSON.stringify({
    schema: 1, kind: "floorplan-intent", units: "mm",
    envelope: { rect: [5, 5, 31, 25], tolerance_mm: 0.5 },
    defaults: { zone_tolerance_mm: 0.5 },
    blocks: [{ name: "testpoints", refs: ["TP1", "TP2"], zone, side: "F" }],
  }, null, 2)
}

function grading(ctx: Context, placed: string): OperationRecord {
  const script = "py_tools/check_floorplan.py"
  const good = path.join(ctx.work, "intent-parts-inside-zone.json")
  const bad = path.join(ctx.work, "intent-parts-outside-zone.json")
  fs.writeFileSync(good, intentText(INTENT_ZONE_HOLDS))
  fs.writeFileSync(bad, intentText(INTENT_ZONE_MISSES))
  const grade = (label: string, intent: string, expected: number, pass: boolean): Invocation => {
    const findings = `${intent}.findings.json`
    return invoke(
      ctx, label, ctx.python, ctx.engine,
      [script, placed, "--intent", intent, "--require-rules", "1", "--json", findings],
      { [placed]: "{board}", [intent]: "{intent}", [findings]: "{findings}" }, expected,
      () => {
        const summary: unknown = JSON.parse(fs.readFileSync(findings, "utf8"))
        ensure(typeof summary === "object" && summary !== null, "findings JSON is not an object")
        const text = JSON.stringify(summary)
        ensure(text.includes(`"pass": ${pass}`) || text.includes(`"pass":${pass}`), `findings do not say pass=${pass}`)
        return pass ? "graded clean, at least one rule ran" : "graded and reported violations (exit 4)"
      },
    )
  }
  const passing = grade("grade intent the board satisfies", good, 0, true)
  const failing = grade("grade intent the board violates", bad, 4, false)
  return {
    operation: "grading", engineEntryPoint: script,
    succeeded: passing.succeeded && failing.succeeded, invocations: [passing, failing],
  }
}

function routing(ctx: Context, placed: string, routed: string): OperationRecord {
  const script = "py_router/route.py"
  const inv = invoke(
    ctx, "route the fixture nets", ctx.python, ctx.engine,
    [script, placed, "--output", routed, "--nets", "NET_A", "NET_B"],
    { [placed]: "{input}", [routed]: "{output}", NET_A: "{net1}", NET_B: "{net2}" }, 0,
    () => {
      ensure(countOf(placed, "(segment") === 0, "the input already had copper, so laying copper proves nothing")
      const segments = countOf(routed, "(segment")
      ensure(segments > 0, `${routed} holds no track segments after routing`)
      return `the output holds ${segments} track segments the input did not`
    },
    PROJECT_SIDE_EFFECT,
  )
  return { operation: "routing", engineEntryPoint: script, succeeded: inv.succeeded, invocations: [inv] }
}

function zoneRefill(ctx: Context, routed: string, zoned: string, filled: string): OperationRecord {
  const script = "py_router/route_planes.py"
  const create = invoke(
    ctx, "create an unfilled pour on B.Cu", ctx.python, ctx.engine,
    [script, routed, zoned, "--nets", "NET_B", "--plane-layers", "B.Cu"],
    { [routed]: "{input}", [zoned]: "{output}", NET_B: "{net}", "B.Cu": "{layer}" }, 0,
    () => {
      ensure(countOf(zoned, "(zone") >= 1, `${zoned} has no zone`)
      ensure(countOf(zoned, "(filled_polygon") === 0, "the freshly created pour is already filled, so a later fill proves nothing")
      return "wrote a zone with no filled polygons"
    },
    PROJECT_SIDE_EFFECT,
  )
  if (!create.succeeded) {
    // The pour was not made, so there is nothing to refill. Record the failure
    // (writeRecord turns it into invocations.failed.json) instead of letting a
    // copy of a missing file throw a raw ENOENT first.
    return { operation: "zone-refill", engineEntryPoint: `${script} (creates the pour) + kicad-cli (fills it)`, succeeded: false, invocations: [create] }
  }
  fs.copyFileSync(zoned, filled)
  const report = path.join(ctx.work, "refill-drc.rpt")
  const refill = invoke(
    ctx, "refill zones and save the board (kicad-cli, not the engine)", ctx.kicadCli, ctx.repoRoot,
    ["pcb", "drc", "--refill-zones", "--save-board", "--output", report, filled],
    { [report]: "{report}", [filled]: "{board}" }, 0,
    () => {
      const polygons = countOf(filled, "(filled_polygon")
      ensure(polygons >= 1, `${filled} holds no filled_polygon after the refill, so the pour was not saved`)
      return `the saved board holds ${polygons} filled polygon(s) it did not hold before`
    },
  )
  return {
    operation: "zone-refill", engineEntryPoint: `${script} (creates the pour) + kicad-cli (fills it)`,
    succeeded: create.succeeded && refill.succeeded, invocations: [create, refill],
  }
}

export interface PreflightOptions {
  readonly repoRoot: string
  readonly run?: CommandRunner
  readonly env?: Env
  /** Defaults to `defaultKicadCli()`. Injected so a test names no real install. */
  readonly kicadCli?: string
}

/** Run all four operations on the fixture and return the record. Does not write it. */
export function preflight(opts: PreflightOptions): InvocationsFile {
  const commit = builtCommit(opts.repoRoot)
  if (commit === undefined) {
    throw new Error(
      `no build stamp under ${engineDir(opts.repoRoot)}: the engine is unbuilt or its build did not finish. ` +
        "Run `make krt`; the preflight records the commit from the stamp and will not guess one.",
    )
  }
  const work = path.join(opts.repoRoot, WORK_RELATIVE)
  fs.rmSync(work, { recursive: true, force: true })
  fs.mkdirSync(work, { recursive: true })
  const ctx: Context = {
    repoRoot: opts.repoRoot, run: opts.run ?? defaultRun, env: engineEnv(opts.env ?? process.env),
    work, engine: engineDir(opts.repoRoot), python: venvPython(opts.repoRoot),
    kicadCli: opts.kicadCli ?? defaultKicadCli(),
  }
  for (const name of UNSET) {
    ensure(ctx.env[name] === undefined, `${name} survived engineEnv; refusing to run the engine with KiCad's Python on its path`)
  }

  const fixture = path.join(work, "fixture.kicad_pcb")
  fs.writeFileSync(fixture, fixtureBoardText())
  const placed = path.join(work, "placed.kicad_pcb")
  const routed = path.join(work, "routed.kicad_pcb")
  const zoned = path.join(work, "zoned.kicad_pcb")
  const filled = path.join(work, "filled.kicad_pcb")

  const operations = [
    placement(ctx, fixture, placed),
    grading(ctx, placed),
    routing(ctx, placed, routed),
    zoneRefill(ctx, routed, zoned, filled),
  ]
  return {
    engineCommit: commit,
    environment: {
      unset: UNSET,
      note: "Every command runs with these variables absent: KiCad's shell sets them to its own Python and the engine's venv would load the wrong interpreter. Use engineEnv() from tools/krt/acquire.ts.",
    },
    fixture: "throwaway two-part board generated by tools/krt/preflight-fixture.ts; not a real board",
    pathRules: "argv[0] (the interpreter or binary) resolves against the repository root; every other path in argv resolves against that invocation's cwd, which is itself relative to the repository root. kicad-cli is an absolute system path and is machine-specific (lib/kicad/install.ts defaultKicadCli); it is never on PATH.",
    allSucceeded: operations.every((o) => o.succeeded),
    operations,
  }
}

/** Write the record: to the committed path when every operation held, else beside it, and throw. */
export function writeRecord(repoRoot: string, record: InvocationsFile): string {
  const dir = path.join(repoRoot, "build", "krt")
  fs.mkdirSync(dir, { recursive: true })
  const text = `${JSON.stringify(record, null, 2)}\n`
  if (record.allSucceeded) {
    const file = path.join(repoRoot, INVOCATIONS_RELATIVE)
    fs.writeFileSync(file, text)
    return file
  }
  const failed = path.join(dir, "invocations.failed.json")
  fs.writeFileSync(failed, text)
  const broken = record.operations.filter((o) => !o.succeeded).map((o) => o.operation).join(", ")
  throw new Error(
    `engine preflight failed for: ${broken}. The record is at ${failed}; the committed ${INVOCATIONS_RELATIVE} ` +
      "was NOT updated. This is a toolchain failure, not a board failure.",
  )
}

if (import.meta.main) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
  ensureBuilt(readPin(path.join(repoRoot, "krt.pin")), { repoRoot })
  const record = preflight({ repoRoot })
  const file = writeRecord(repoRoot, record)
  console.log(`krt preflight: all four operations held on engine ${record.engineCommit}`)
  console.log(`recorded: ${file}`)
}
