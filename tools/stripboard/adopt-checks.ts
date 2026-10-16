/**
 * What the adoption gate CHECKS: the recorded hashes against the files they
 * name, the frozen benchmark against its own provenance, the chain back to the
 * board, the two fork commits, and the verdict.
 *
 * THE AUTHORITY is CRITERIA `G2.1`-`G2.5`
 * (`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` §9).
 * Where this module and that document differ it wins and this comment is the
 * defect.
 *
 * **THE SEAM IS CHECK VERSUS ACT**, which is the house split `./place.ts` and
 * `./place-inputs.ts` already draw. Nothing here writes anything anywhere:
 * every function either returns or throws, and `./adopt.ts` is the only file in
 * this pipeline that puts bytes under `boards/`. `./adopt-model.ts` holds the
 * ten refusal statements and the types.
 *
 * **`uncommitted-layout` IS NOT HERE AND THAT IS DELIBERATE.** It is the one
 * check about the DESTINATION rather than about the run, its implementation is
 * `tools/perfboard/mutate.ts`'s `assertLayoutRecoverable` rather than anything
 * written for this gate, and it has to run last - immediately before the write
 * it guards. It sits beside that write in `./adopt.ts`.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { refuse, type AdoptDeps, type AdoptInput, type AdoptRefusal } from "./adopt-model.ts"
import { recordedHashFor } from "./adopt-provenance.ts"
import { boundFor, exitCodeFor, OUTCOMES, OUTCOME_WORDING, type Outcome } from "./report-model.ts"
import { runDirectory, type CanonicalInputs, type RunManifest } from "./run-dir.ts"
import { STOPPING_RULES, type StoppingRule } from "./stop-model.ts"

/**
 * `B1-frozen`'s four files, enumerated by name rather than discovered by
 * globbing the fixture directory.
 *
 * GLOBBING WOULD BE WRONG AND WAS MEASURED SO: the same directory holds the
 * three further benchmark dumps and Task 16's import-placed start, and that
 * last one's hash is deliberately NOT in `provenance.txt` (*"it is regenerable
 * and not evidence"*), so a glob would refuse every adoption over a file this
 * check is not about. The four below are the set `B2` names.
 */
const FROZEN_FIXTURE_FILES: readonly string[] = [
  "pultec-low-boost-frozen.vrt",
  "pultec-low-boost-frozen.netlist",
  "pultec-low-boost-frozen.dump",
  "pultec-low-boost-frozen.footprints.json",
]

/** `imported.vrt`, the board every arm starts from - `./place.ts` writes it under this name. */
const IMPORTED_BASENAME = "imported.vrt"

export function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/** One recorded hash against the file it names, refused by its own id. */
export function assertFileHash(
  file: string,
  recorded: string,
  refusal: AdoptRefusal,
  what: string,
): void {
  if (!fs.existsSync(file)) {
    refuse(
      refusal,
      `${what} is not at ${file}, so the hash run.json records for it (${recorded}) cannot be ` +
        "checked",
    )
  }
  const actual = sha256OfFile(file)
  if (actual !== recorded) {
    refuse(
      refusal,
      `${what} at ${file} hashes to ${actual} and run.json records ${recorded} for it`,
    )
  }
}

/**
 * One recorded CLOSURE hash against the closure as it now stands, refused by its
 * own id.
 *
 * **IT TAKES THE HASHING FUNCTION AND NOT A PATH**, which is the whole point:
 * the quantity being compared is a digest over an import closure, so the gate
 * must run the same function `./place.ts` recorded with rather than re-derive a
 * digest of its own. `./geometry-inputs.ts` holds that function and the
 * measurement behind the change from a one-file hash.
 *
 * **A WALK THAT CANNOT RUN IS A REFUSAL, NEVER A PASS.** `closureSha256` throws
 * when the closure reaches a file that is not there or a specifier it will not
 * guess at, and that is reported as this gate's own refusal rather than escaping
 * as a read error from somewhere else in the pipeline - a check that could not
 * run must not look like one that ran.
 */
export function assertClosureHash(
  hashNow: () => string,
  recorded: string,
  refusal: AdoptRefusal,
  what: string,
  entry: string,
): void {
  let actual: string
  try {
    actual = hashNow()
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : String(caught)
    refuse(
      refusal,
      `${what} could not be hashed, so the ${recorded} run.json records for it cannot be ` +
        `checked: walking ${entry}'s import closure failed with ${detail}`,
    )
  }
  if (actual !== recorded) {
    refuse(
      refusal,
      `${what} hashes to ${actual} over ${entry}'s import closure, and run.json records ` +
        `${recorded} for it`,
    )
  }
}

/**
 * `B2`: each of the frozen benchmark's four files still hashes to what
 * `provenance.txt` beside them records.
 *
 * **IT RUNS ON EVERY ADOPTION RATHER THAN ONLY ON A `B1-frozen` RUN, AND THAT
 * IS A DELIBERATE STRENGTHENING OF `G2.2`'s WORDING** - recorded here rather
 * than left for a reader to notice. Two reasons. First, `run.json` carries no
 * frozen flag at all: `CanonicalInputs` has no such field and `./place.ts`
 * records none, so the only recorded signal is `netlistSha256` matching the
 * fixture's own `.netlist`, and keying the check on that is circular - a
 * tampered fixture stops matching and the check turns itself off. Second,
 * `B1-frozen` is the one externally authored criterion in this pipeline and
 * `A2`'s clustering bound is set relative to the hand results it heads, so an
 * edited benchmark is a changed criterion for EVERY board rather than only for
 * the one it is stated against. Four hashes cost microseconds; the conditional
 * version buys nothing and can be switched off by the edit it exists to catch.
 *
 * **EACH FILE IS COMPARED WITH THE HASH ITS OWN BASENAME IS RECORDED AGAINST**,
 * parsed by `./adopt-provenance.ts`. The first version of this check asked only
 * whether a file's hash appeared ANYWHERE in `provenance.txt`, which that module
 * records as measured-weak: one fixture replaced by another listed file's bytes
 * passed it.
 */
export function assertFrozenFixtureUnchanged(deps: AdoptDeps): void {
  if (!fs.existsSync(deps.frozenProvenanceFile)) {
    refuse(
      "frozen-fixture-hash",
      `${deps.frozenProvenanceFile} is not there, so the recorded sha256 of B1-frozen's four ` +
        "fixture files cannot be read at all",
    )
  }
  const provenance = fs.readFileSync(deps.frozenProvenanceFile, "utf8")
  for (const basename of FROZEN_FIXTURE_FILES) {
    const file = path.join(deps.frozenFixtureDir, basename)
    if (!fs.existsSync(file)) {
      refuse(
        "frozen-fixture-hash",
        `B1-frozen's fixture file ${basename} is not at ${file}, and ` +
          `${deps.frozenProvenanceFile} records a hash for it`,
      )
    }
    // THE HASH THIS FILE'S OWN NAME IS RECORDED AGAINST, and never "a hash
    // somewhere in provenance.txt" - see `./adopt-provenance.ts` for the
    // measurement that distinction comes from.
    const recorded = recordedHashFor(
      basename,
      provenance,
      deps.frozenProvenanceFile,
      (offending) => refuse("frozen-fixture-hash", offending),
    )
    const actual = sha256OfFile(file)
    if (actual !== recorded) {
      refuse(
        "frozen-fixture-hash",
        `${file} hashes to ${actual} and ${deps.frozenProvenanceFile} records ${recorded} for ` +
          basename,
      )
    }
  }
}

/** What `assertProvenanceChain` needs about the board, read from its declaration. */
export interface ChainBoard {
  readonly name: string
  readonly declarationFile: string
  readonly circuitPath: string
}

/**
 * `G2.3`: the recorded chain, re-walked on disk, starting from the board as it
 * now is.
 *
 * The five links are listed in `notDefaultedBecause("provenance-chain")`; what
 * is worth saying here is why the last one is a git comparison. The netlist the
 * run checked against is a LOWERING of the board's circuit module, produced by
 * `exportNetlistFor`, which stamps the moment it ran into the export's own
 * header - so the recorded `netlistSha256` is not reproducible by re-exporting,
 * and *"does this board still lower to this netlist"* is not a question a
 * synchronous gate can answer by hashing. What it can ask is whether the
 * board's two authored sources are the bytes they were at the commit the run
 * recorded, which is the same claim one link earlier in the chain.
 */
export function assertProvenanceChain(
  input: AdoptInput,
  manifest: RunManifest,
  board: ChainBoard,
  deps: AdoptDeps,
): void {
  const inputs: CanonicalInputs = manifest.canonical.inputs
  const expectedDir = runDirectory(board.name, manifest.provenance.stamp)
  if (path.resolve(input.runDir) !== path.resolve(expectedDir)) {
    refuse(
      "provenance-chain",
      `${path.join(input.runDir, "run.json")} records the stamp ` +
        `"${manifest.provenance.stamp}", which names the run directory ${expectedDir} for ` +
        `board "${board.name}" and not ${path.resolve(input.runDir)}`,
    )
  }

  const netlist = path.join(input.runDir, `${board.name}.net`)
  if (!fs.existsSync(netlist)) {
    refuse(
      "provenance-chain",
      `the netlist this run checked every candidate against is not at ${netlist}, so the chain ` +
        "has no second link to start from",
    )
  }
  const netlistHash = sha256OfFile(netlist)
  if (netlistHash !== inputs.netlistSha256) {
    refuse(
      "provenance-chain",
      `${netlist} hashes to ${netlistHash} and run.json records ${inputs.netlistSha256} as the ` +
        "netlist this run was graded against",
    )
  }

  const imported = path.join(input.runDir, IMPORTED_BASENAME)
  if (!fs.existsSync(imported)) {
    refuse(
      "provenance-chain",
      `the --import-placed board every arm started from is not at ${imported}`,
    )
  }

  const candidate = path.resolve(input.candidate)
  const runDir = path.resolve(input.runDir)
  if (!candidate.startsWith(`${runDir}${path.sep}`)) {
    refuse(
      "provenance-chain",
      `the candidate ${candidate} is not inside the run directory ${runDir} whose run.json ` +
        "this adoption is reading",
    )
  }

  const sources = [board.declarationFile, board.circuitPath]
  const dirty = deps.git(["status", "--porcelain", "--", ...sources], input.boardDir)
  if (dirty.status !== 0) {
    refuse(
      "provenance-chain",
      `git status --porcelain in ${input.boardDir} exited ${String(dirty.status)}, so whether ` +
        `${board.declarationFile} and ${board.circuitPath} are the board this run started ` +
        "from cannot be established",
    )
  }
  if (dirty.stdout.trim() !== "") {
    refuse(
      "provenance-chain",
      `${board.declarationFile} or ${board.circuitPath} has uncommitted changes (git status ` +
        `reports ${JSON.stringify(dirty.stdout.trim())}), so the board as it now is is not the ` +
        `board this run recorded at pipeline commit ${inputs.pipelineCommit}`,
    )
  }
  const moved = deps.git(
    ["diff", "--quiet", inputs.pipelineCommit, "--", ...sources],
    input.boardDir,
  )
  if (moved.status !== 0) {
    refuse(
      "provenance-chain",
      `${board.declarationFile} or ${board.circuitPath} differs from its state at the run's ` +
        `own pipeline commit ${inputs.pipelineCommit} (git diff --quiet exited ` +
        `${String(moved.status)})`,
    )
  }
}

/** `G2.4`: the pinned commit, the recorded one, and the one that actually ran. */
export function assertForkCommits(inputs: CanonicalInputs, deps: AdoptDeps): void {
  const pinned = deps.readPin(deps.pinFile).commit
  if (inputs.verorouteCommit !== pinned) {
    refuse(
      "veroroute-commit",
      `run.json records verorouteCommit ${inputs.verorouteCommit} and ${deps.pinFile} pins ` +
        pinned,
    )
  }
  // UNKNOWN FIRST, so an absent stamp is never reached through a comparison
  // with the string a caller wrote in its place.
  const stamped = deps.builtCommit(deps.repoRoot)
  if (stamped === undefined) {
    refuse(
      "built-commit",
      `the build stamp under ${deps.repoRoot}/.tools is absent or empty, so which commit the ` +
        "binary that produced this candidate was built from is unknown; run.json records " +
        `builtCommit ${inputs.builtCommit}`,
    )
  }
  if (inputs.builtCommit !== pinned) {
    refuse(
      "built-commit",
      `run.json records builtCommit ${inputs.builtCommit} and ${deps.pinFile} pins ${pinned}`,
    )
  }
  if (inputs.builtCommit !== stamped) {
    refuse(
      "built-commit",
      `run.json records builtCommit ${inputs.builtCommit} and the stamp beside the binary says ` +
        stamped,
    )
  }
}

/** One of `REP5`'s three outcomes, from the string `run.json` recorded. */
function outcomeFrom(text: string, file: string): Outcome {
  const found = OUTCOMES.find((outcome) => outcome === text)
  if (found === undefined) {
    refuse(
      "failing-check",
      `${file} records the outcome ${JSON.stringify(text)}, which is not one of REP5's three ` +
        `(${OUTCOMES.join(", ")}), so this run's verdict cannot be read`,
    )
  }
  return found
}

/** One of `Q1`-`Q6`, from the string `run.json` recorded. */
function ruleFrom(text: string, file: string): StoppingRule {
  const found = STOPPING_RULES.find((rule) => rule === text)
  if (found === undefined) {
    refuse(
      "failing-check",
      `${file} records the stopping rule ${JSON.stringify(text)}, which is not one of ` +
        `${STOPPING_RULES.join(", ")}, so whether the RUN itself failed cannot be read`,
    )
  }
  return found
}

/**
 * `G2.5`: the verdict, read through `exitCodeFor` and not through a second
 * comparison with `"admissible"`.
 *
 * **IT TAKES THE RULE AS WELL AS THE OUTCOME BECAUSE `exitCodeFor` DOES**, and
 * that is what makes a `Q5` stop on an admissible candidate a refusal here:
 * CRITERIA says twice that a run stopping on `Q5` is reported as a failure
 * rather than as a result, and adopting the product of a run reported as a
 * failure would be reading it as a result.
 */
export function assertVerdictAdmits(manifest: RunManifest, file: string): void {
  const outcome = outcomeFrom(manifest.canonical.metrics.outcome, file)
  const rule = ruleFrom(manifest.canonical.metrics.stoppingRule, file)
  // THE BOUND IS RE-DERIVED FROM THE RULE RATHER THAN TRUSTED AS RECORDED, and
  // that closes a gap this check had from the start: `metrics.bound` was folded
  // into the canonical hash and compared against nothing, so the gate trusted
  // the PRODUCER's pairing of the two. A tamperer recomputes the hash over the
  // values it edited, and `run.json` is the one artifact where the bound and the
  // rule can disagree undetected - while REP4 requires that they agree in one
  // report. `BOUNDS` is the one table that pairs them (`./report-model.ts`), so
  // one side is now derived here and compared, which is a different act from
  // reading both off the record.
  const derived = boundFor(rule)
  if (manifest.canonical.metrics.bound !== derived) {
    refuse(
      "failing-check",
      `${file} records the bound ${JSON.stringify(manifest.canonical.metrics.bound)} beside the ` +
        `stopping rule ${rule}, and REP4's own table pairs ${rule} with ${derived}`,
    )
  }
  if (exitCodeFor(outcome, rule) !== 0) {
    refuse(
      "failing-check",
      `${file} reports ${OUTCOME_WORDING[outcome]} - and the run stopped on ${rule}`,
    )
  }
}
