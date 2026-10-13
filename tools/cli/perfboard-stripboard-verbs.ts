/**
 * `place` and `adopt`: the stripboard pipeline's own two verbs on the perfboard
 * CLI.
 *
 * THE AUTHORITY is the plan's Task 23. Where this module and that document
 * differ the document wins and this comment is the defect.
 *
 * **THE DIRECTORY YOU ARE STANDING IN IS THE BOARD, as for every other verb
 * here.** `$(CURDIR)` through `make`, `-C <dir>` through `bun run`, and
 * deliberately **no `BOARD=` variable**: *"two ways to say which board is two
 * places for one fact to be wrong."* `--frozen` is the one exception and it is
 * not a second way to name a board - it names a FIXTURE, the frozen hand layout
 * under `tests/fixtures/`, which is not a declared board at all and has no
 * directory to stand in.
 *
 * **`--seed-arm` IS REQUIRED AND THIS VERB DOES NOT CHOOSE ONE.** Task 16's
 * `parseSeedArm` is where text becomes an arm and it refuses the empty string
 * like any other unknown word: *"the three are an experiment with random as its
 * control, and an arm selected by a fallback would be a comparison whose own
 * treatment nobody named."* So a `place` with no arm prints the refusal, lists
 * the three, and exits 1 - it does not run the control.
 *
 * **`place` WRITES ONLY UNDER `build/stripboard/`** (`tools/stripboard/place.ts`),
 * never the layout. That is why it needs no `--allow-dirty`: there is nothing
 * for git to have to undo.
 *
 * **`adopt` IS THE OPPOSITE AND IS THE ONLY VERB IN THIS PIPELINE THAT WRITES
 * UNDER `boards/`** - `G1`. It takes `--run <dir>`, optionally `--candidate
 * <vrt>`, and `--allow-dirty` for the same reason `update` and `stripboard`
 * take it; the gate itself is `tools/stripboard/adopt.ts` and every refusal is
 * that module's. This verb decides nothing: it parses three flags, hands the
 * directory it is standing in to `adoptLayout`, and prints the refusal whole.
 */
import fs from "node:fs"
import path from "node:path"
import { errorMessage, reportLines } from "./perfboard-support.ts"
import {
  adoptLayout,
  candidateFor,
  defaultAdoptDeps,
  type AdoptDeps,
} from "../stripboard/adopt.ts"
import {
  place,
  placeAcrossSeeds,
  reportInputOf,
  type PlaceRun,
  type SeedSweep,
} from "../stripboard/place.ts"
import { renderReport, verdictOf } from "../stripboard/report.ts"
import { exitCodeFor, outcomeOf } from "../stripboard/report-model.ts"
import { loadRules, type StripboardRules } from "../stripboard/rules.ts"
import { SEED_ARMS, parseSeedArm, type SeedArm } from "../stripboard/seed.ts"

/**
 * What a verb here acts on: the effective directory, its own flags, and where
 * its two output streams go.
 *
 * It is this module's own type rather than one lifted out of
 * `./perfboard.ts`'s `runCli`, because the four fields are exactly what a verb
 * needs and nothing more - the CLI's injected `check`, `verbDeps`, `guideDeps`
 * and the rest are other verbs' dependencies, and a verb that took the whole
 * options object could reach them.
 */
export interface VerbContext {
  readonly cwd: string
  readonly args: readonly string[]
  readonly log: (line: string) => void
  readonly error: (line: string) => void
}

/**
 * What `place` needs from outside itself, injected so a CLI test needs neither
 * the fork nor a circuit module.
 *
 * Both are the production path by default, which is the shape every other verb
 * in this CLI already has (`VerbDeps`, `GuideDeps`, `BomDeps`).
 */
export interface PlaceDeps {
  readonly place?: (input: Parameters<typeof place>[0]) => Promise<PlaceRun>
  readonly placeAcrossSeeds?: (input: Parameters<typeof place>[0]) => Promise<SeedSweep>
  readonly loadRules?: () => StripboardRules
}

/** `place`'s own flags, parsed strictly: an unknown flag is a refusal, never a no-op. */
interface PlaceFlags {
  readonly arm: SeedArm
  readonly frozen: string | undefined
  readonly netlist: string | undefined
  readonly sweep: boolean
}

const VALUE_FLAGS = new Set(["--seed-arm", "--frozen", "--netlist"])

/**
 * `--seed-arm <arm>`, `--frozen <fixture>`, `--netlist <export>`, `--sweep`.
 *
 * A VALUE THAT LOOKS LIKE A FLAG IS A MISSING VALUE, the same reading
 * `parseFlags` in `./perfboard-support.ts` gives `--strips`: `--seed-arm
 * --sweep` must not consume `--sweep` as an arm name, or the operator reads a
 * refusal about an arm called `--sweep` instead of one about a missing value.
 */
function parsePlaceFlags(
  args: readonly string[],
  error: (line: string) => void,
): PlaceFlags | null {
  const values = new Map<string, string>()
  let sweep = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? ""
    if (arg === "--sweep") {
      sweep = true
      continue
    }
    if (!VALUE_FLAGS.has(arg)) {
      error(`unknown flag "${arg}" for "place". Run with --help to see the flags this verb accepts.`)
      return null
    }
    const value = args[index + 1]
    if (value === undefined || value.startsWith("--")) {
      error(`${arg} needs a value.`)
      return null
    }
    values.set(arg, value)
    index += 1
  }

  const arm = values.get("--seed-arm")
  if (arm === undefined) {
    // THE REFUSAL THAT MATTERS, and it does not run the control. The wording
    // comes from parseSeedArm so there is one list of the arms, and the flag is
    // named here because the operator typed a flag, not a function argument.
    error(
      `"place" needs --seed-arm, and there is NO DEFAULT ARM: the arms are ${SEED_ARMS.join(", ")}. ` +
        "The three are an experiment with random as its control, so an arm chosen for you would " +
        "be a comparison whose own treatment nobody named. Name one.",
    )
    return null
  }
  let parsed: SeedArm
  try {
    parsed = parseSeedArm(arm)
  } catch (caught) {
    for (const line of reportLines(errorMessage(caught))) error(line)
    return null
  }

  const frozen = values.get("--frozen")
  const netlist = values.get("--netlist")
  if ((frozen === undefined) !== (netlist === undefined)) {
    error(
      "--frozen and --netlist go together: the fixture is the hand layout the benchmark is " +
        "stated against and the netlist is the export of the model it was built from, and a run " +
        "with one and not the other would grade that board against whatever export it found. " +
        "Pass both, or neither to run this directory's own board.",
    )
    return null
  }
  return { arm: parsed, frozen, netlist, sweep }
}

/** One run's input, from the flags and the directory the verb is standing in. */
function inputFor(flags: PlaceFlags, cwd: string, rules: StripboardRules): Parameters<typeof place>[0] {
  if (flags.frozen !== undefined && flags.netlist !== undefined) {
    return { frozen: flags.frozen, netlist: flags.netlist, rules, arm: flags.arm }
  }
  return { board: cwd, rules, arm: flags.arm }
}

/**
 * `place`: run the pipeline on this board, print the report, exit on the
 * outcome and the rule that fired.
 *
 * THE EXIT CODE IS `exitCodeFor`'S AND IS NOT COMPUTED HERE. `Q5`'s backstop
 * makes a run fail with an admissible candidate, so the pair (outcome, rule) is
 * what decides - and a verb that compared the outcome with `"admissible"` would
 * be a second taxonomy.
 */
export async function dispatchPlace(context: VerbContext, deps: PlaceDeps = {}): Promise<number> {
  const flags = parsePlaceFlags(context.args, context.error)
  if (flags === null) return 1
  const rules = (deps.loadRules ?? loadRules)()
  const runOne = deps.place ?? ((input: Parameters<typeof place>[0]) => place(input))
  const runSweep =
    deps.placeAcrossSeeds ?? ((input: Parameters<typeof place>[0]) => placeAcrossSeeds(input))

  let lines: readonly string[]
  let code: number
  try {
    const input = inputFor(flags, context.cwd, rules)
    // THE SWEEP IS ASKED FOR AND IS NOT THE DEFAULT, because it costs the seed
    // set's full budget per seed (Q5's cap is run-level) rather than one
    // climb's. A report without the rate is a run that measured no rate, which
    // is what `ReportInput.sweep === undefined` says.
    const run = flags.sweep ? await runSweep(input) : await runOne(input)
    const judged = "perSeed" in run ? run.first : run
    const rendered = reportInputOf(run)
    lines = renderReport(rendered)
    // THE EXIT CODE COMES FROM THE VERDICT THIS REPORT PRINTED, through
    // `verdictOf` - the one grading `renderReport` itself uses - rather than
    // from `PlaceRun.outcome`. The two agree on every run `place` makes,
    // because that field is set from this same function; computing it here
    // closes the one gap a hand-built run exposed, where a printed outcome and
    // an exit code could have come from two gradings of one candidate.
    code = exitCodeFor(outcomeOf(verdictOf(rendered)), judged.rule)
    context.log(`run: ${judged.runDir}`)
  } catch (caught) {
    // A REFUSAL IS PRINTED WHOLE AND EXITS 1. Every throw in this pipeline
    // names what is missing, where to fix it and why it is not defaulted, and
    // a verb that printed one line of it would be a verb that hid the fix.
    context.error(`FAIL place in ${path.resolve(context.cwd)}`)
    for (const line of reportLines(errorMessage(caught))) context.error(line)
    return 1
  }
  for (const line of lines) context.log(line)
  return code
}

/** `adopt`'s own flags, parsed strictly: an unknown flag is a refusal, never a no-op. */
interface AdoptFlags {
  readonly run: string
  readonly candidate: string | undefined
  readonly allowDirty: boolean
}

const ADOPT_VALUE_FLAGS = new Set(["--run", "--candidate"])

/**
 * `--run <dir>`, `--candidate <vrt>`, `--allow-dirty`.
 *
 * `--run` IS REQUIRED AND THERE IS NO DEFAULT RUN. "The most recent run
 * directory" would be a board adopted off whatever the clock last named, which
 * is the one thing a provenance gate must not take on trust. `--candidate` is
 * optional because `run.json` already identifies the candidate by its hash
 * (`candidateFor`), and leaving the operator to find that file by hand after a
 * report that printed only the directory would be remedial work this verb can
 * do exactly.
 *
 * **BOTH PATHS RESOLVE AGAINST THE REPOSITORY ROOT AND NOT AGAINST THIS VERB'S
 * DIRECTORY, which is a correction MEASURED on the first real run.** This verb
 * stands in the board's directory, so `--run build/stripboard/<board>/<stamp>`
 * resolved against `cwd` became
 * `boards/<board>/build/stripboard/<board>/<stamp>` and the gate refused on a
 * missing `run.json` - naming the right file at a path nobody typed. A run
 * directory is `runDirectory`'s and is relative to the repository root by
 * construction, so that is what a relative one resolves against; an absolute
 * path is untouched either way.
 */
function parseAdoptFlags(
  args: readonly string[],
  cwd: string,
  error: (line: string) => void,
): AdoptFlags | null {
  const values = new Map<string, string>()
  let allowDirty = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? ""
    if (arg === "--allow-dirty") {
      allowDirty = true
      continue
    }
    if (!ADOPT_VALUE_FLAGS.has(arg)) {
      error(
        `unknown flag "${arg}" for "adopt". Run with --help to see the flags this verb accepts.`,
      )
      return null
    }
    const value = args[index + 1]
    if (value === undefined || value.startsWith("--")) {
      error(`${arg} needs a value.`)
      return null
    }
    values.set(arg, value)
    index += 1
  }
  const run = values.get("--run")
  if (run === undefined) {
    error(
      '"adopt" needs --run <dir>, the run directory `place` printed, and there is NO DEFAULT ' +
        "RUN: adopting off the most recent directory would be adopting off whatever the clock " +
        "last named, and this verb is the gate that checks a candidate's provenance rather " +
        "than a verb that assumes it. Name the run.",
    )
    return null
  }
  const resolved = path.resolve(cwd, run)
  if (!fs.existsSync(resolved)) {
    // A MISSING RUN DIRECTORY IS ITS OWN MISTAKE AND GETS ITS OWN MESSAGE. Left
    // to the gate it arrived as `candidate-hash: ... run.json did not read
    // back: ENOENT`, which names a refusal about a candidate for what is
    // actually a mistyped path - and prints the resolved path without the one
    // the operator typed, so the difference between them is invisible.
    error(
      `--run ${JSON.stringify(run)} resolves to ${resolved}, and there is no directory there. ` +
        "A relative --run resolves against the REPOSITORY ROOT, not against the board directory " +
        "this verb stands in, because a run directory is build/stripboard/<board>/<stamp>/ by " +
        "construction (tools/stripboard/run-dir.ts's runDirectory). Pass the path `place` " +
        "printed on its own `run:` line.",
    )
    return null
  }
  const candidate = values.get("--candidate")
  return {
    run: resolved,
    candidate: candidate === undefined ? undefined : path.resolve(cwd, candidate),
    allowDirty,
  }
}

/**
 * `adopt`: admit one layout into this board's directory, or print the refusal.
 *
 * EXIT 0 ONLY WHEN THE LAYOUT IS IN PLACE AND `make check` EXITED 0, which is
 * `G4`: the gate runs it after the copy and reverts when it does not, so a
 * non-zero exit here is always a board that was not adopted.
 */
export async function dispatchAdopt(
  context: VerbContext,
  deps: AdoptDeps = defaultAdoptDeps(),
): Promise<number> {
  const flags = parseAdoptFlags(context.args, deps.repoRoot, context.error)
  if (flags === null) return 1
  try {
    const candidate = flags.candidate ?? candidateFor(flags.run)
    adoptLayout(
      {
        runDir: flags.run,
        candidate,
        boardDir: path.resolve(context.cwd),
        allowDirty: flags.allowDirty,
      },
      deps,
    )
    context.log(`adopted ${candidate}`)
    context.log(`  into ${path.resolve(context.cwd)}, and make check exited 0 on it.`)
  } catch (caught) {
    // A REFUSAL IS PRINTED WHOLE AND EXITS 1, exactly as `place` prints one:
    // every throw in this pipeline names what is missing, where to fix it and
    // why it is not defaulted, and a verb that printed one line of it would be
    // a verb that hid the fix.
    context.error(`FAIL adopt in ${path.resolve(context.cwd)}`)
    for (const line of reportLines(errorMessage(caught))) context.error(line)
    return 1
  }
  return 0
}
