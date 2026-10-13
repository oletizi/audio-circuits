/**
 * `adopt`: the one gate a produced layout reaches the repository through, and
 * the only thing in this pipeline that writes under `boards/`.
 *
 * THE AUTHORITY is CRITERIA `G1`-`G4`
 * (`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` §9) and
 * the plan's Task 24. Where this module and those documents differ they win and
 * this comment is the defect.
 *
 * **EVERYTHING UPSTREAM EXISTS TO EARN THIS WRITE.** Twenty-three tasks produce
 * a candidate, a canonical manifest and a verdict; this file is where those
 * become a file under `boards/`, and it either throws naming one of ten
 * refusals or **copies the candidate `.vrt` into the board's declared path and
 * does nothing else**. It writes no report, no sidecar and no record of itself:
 * a gate that also left artefacts behind would be a gate whose own output
 * somebody has to check.
 *
 * **IT REFUSES EVERYTHING THE PIPELINE PRODUCES TODAY, AND THAT IS CORRECT.**
 * `HC1` fails on every board as of this writing, so no run reaches
 * `admissible` and `failing-check` fires on all of them; the five Pultec boards
 * additionally fail `make check` on Layout state, with every part arriving
 * unplaced. Nothing here is weakened to let that through. A gate calibrated to
 * admit today's best output would be a gate calibrated to its own input.
 *
 * **THE ORDER OF THE CHECKS IS RUN-FIRST, DESTINATION-LAST, AND `make check`
 * IS LAST OF ALL BECAUSE IT IS THE ONLY ONE THAT NEEDS THE COPY TO HAVE
 * HAPPENED.** `G4` makes `make check` the repository's verdict on the board as
 * adopted, so it runs against the file in place; a non-zero exit is a FAILED
 * adoption and the copy is reverted to exactly the bytes that were there
 * before - or removed, when there were none. Nothing is left behind for
 * somebody to find and trust.
 *
 * **IT GENUINELY RUNS `make check` AND NEVER READS A RECORDED VERDICT.** A gate
 * that trusted `run.json`'s account of the repository's own check would be
 * trusting the thing it is gating.
 *
 * **WHAT IT DOES NOT CHECK, STATED RATHER THAN IMPLIED.** It does not require
 * that a `B1-frozen` run has passed. That benchmark cannot currently run at
 * all - two of the frozen board's eight footprints are in neither `LEAD_SPANS`
 * nor `UNSOURCED` nor `PIN_PATTERNS`, so `leadSpanFor` refuses them by name and
 * every grade of a frozen candidate stops there
 * (`tests/fixtures/stripboard/provenance.txt`, and
 * `docs/stripboard/pipeline-verification.md` §8). Gating adoption on a run that
 * cannot be made would be gating it on span data for a terminal block no live
 * board carries any more. What the gate DOES check is that the frozen fixture
 * has not been edited, which is `B2` and is sound whether or not the benchmark
 * runs - `./adopt-checks.ts` says why that check is unconditional.
 *
 * **IT IS THREE FILES**, at the seam the task's own shape draws:
 * `./adopt-model.ts` is what the gate IS (its input, its collaborators, its ten
 * refusal statements), `./adopt-checks.ts` is what it CHECKS, and this file is
 * what admitting one layout DOES. The two beside it write nothing.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { builtCommit as defaultBuiltCommit, readPin as defaultReadPin } from "../perfboard/acquire.ts"
import { boardName, loadDeclaration } from "../perfboard/declaration.ts"
import { assertLayoutRecoverable, defaultGitRunner } from "../perfboard/mutate.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { refuse, type AdoptDeps, type AdoptInput, type MakeCheckRun } from "./adopt-model.ts"
import {
  assertFileHash,
  assertForkCommits,
  assertFrozenFixtureUnchanged,
  assertProvenanceChain,
  assertVerdictAdmits,
  sha256OfFile,
} from "./adopt-checks.ts"
import { RULES_PATH } from "./rules.ts"
import { readManifest, type RunManifest } from "./run-dir.ts"

export {
  ADOPT_REFUSALS,
  notDefaultedBecause,
  type AdoptDeps,
  type AdoptInput,
  type AdoptRefusal,
  type MakeCheckRun,
} from "./adopt-model.ts"

/** The production answers for every path and collaborator the gate needs. */
export function defaultAdoptDeps(repoRoot: string = moduleRepoRoot()): AdoptDeps {
  return {
    repoRoot,
    pinFile: path.join(repoRoot, "veroroute.pin"),
    // RULES_PATH RATHER THAN A SECOND JOIN: `./rules.ts` is the one place the
    // reviewed parameter file's location is written down (PAR3).
    rulesPath: RULES_PATH,
    spanDataPath: path.join(repoRoot, "lib", "kicad", "lead-span.ts"),
    pinPatternPath: path.join(repoRoot, "lib", "kicad", "pin-pattern.ts"),
    frozenFixtureDir: path.join(repoRoot, "tests", "fixtures", "stripboard"),
    frozenProvenanceFile: path.join(repoRoot, "tests", "fixtures", "stripboard", "provenance.txt"),
    readPin: defaultReadPin,
    builtCommit: defaultBuiltCommit,
    // `tools/perfboard/mutate.ts`'s own runner, so this gate's git and
    // `assertLayoutRecoverable`'s git are one spawn rather than two.
    git: defaultGitRunner,
    makeCheck: defaultMakeCheck,
  }
}

/**
 * `make -C <boardDir> check`, spawned for real.
 *
 * A SPAWN THAT CANNOT RUN AT ALL SURFACES AS `status: null` and is refused by
 * the caller, never read as a pass: a skipped check must not look like a
 * passing one, and `make` being absent is exactly the case where it would.
 */
function defaultMakeCheck(boardDir: string): MakeCheckRun {
  const run = spawnSync("make", ["-C", boardDir, "check"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
  if (run.error !== undefined) {
    return { status: null, output: `could not run make in ${boardDir}: ${run.error.message}` }
  }
  const stdout = typeof run.stdout === "string" ? run.stdout : ""
  const stderr = typeof run.stderr === "string" ? run.stderr : ""
  return { status: run.status, output: `${stdout}${stderr}` }
}

/** `run.json`, read and self-checked, with a failure reported as this gate's own refusal. */
function manifestOf(runDir: string): RunManifest {
  try {
    return readManifest(runDir)
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : String(caught)
    // THE CANONICAL HASH IS `readManifest`'S OWN CHECK AND IS NOT RECOMPUTED
    // HERE. That function refuses a manifest whose recorded hash disagrees with
    // its own inputs and metrics, which is exactly G2.1's second clause; what
    // this gate adds is the refusal id, so the message cannot be mistaken for a
    // read error somewhere else in the pipeline.
    refuse("candidate-hash", `${path.join(runDir, "run.json")} did not read back: ${detail}`)
  }
}

/**
 * Which `.vrt` in a run directory is the candidate the run recorded, found by
 * the recorded hash.
 *
 * **IT IS AN IDENTIFICATION AND NOT A SEARCH FOR SOMETHING THAT WILL DO.** A
 * run directory holds one `.vrt` per gesture and per climb, and nothing in a
 * path says which one `best` was - but `inputs.candidateSha256` says exactly
 * which BYTES it was, so the file carrying them is the candidate and no other
 * file is. It exists so the operator does not have to find that file by hand
 * after reading a report that printed only the run directory.
 *
 * ZERO MATCHES AND MORE THAN ONE ARE BOTH REFUSED BY NAME, neither defaulted to
 * a first match: zero means the recorded candidate is not in the directory the
 * manifest belongs to, and two means two files hold the same bytes and the
 * manifest does not distinguish them, so naming one would be this function
 * choosing which board gets adopted.
 */
export function candidateFor(runDir: string): string {
  const recorded = manifestOf(runDir).canonical.inputs.candidateSha256
  const found: string[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && entry.name.endsWith(".vrt") && sha256OfFile(full) === recorded) {
        found.push(full)
      }
    }
  }
  walk(runDir)
  if (found.length !== 1) {
    throw new Error(
      `adopt: ${found.length} of the .vrt files under ${runDir} hash to the ` +
        `${recorded} its run.json records as the candidate, and exactly one must. ` +
        (found.length === 0
          ? "The recorded candidate is not in this run directory at all, so either the " +
            "directory was cleaned or run.json belongs to a different run."
          : `They are: ${found.join(", ")} - two files holding the same bytes, which run.json ` +
            "does not distinguish."
        ) +
        " It is not defaulted to the first match: which board gets adopted would then be this " +
        "function's choice rather than the run's record. Name the candidate with --candidate.",
    )
  }
  return found[0]
}

/** The copy, and the bytes to put back if `make check` then refuses the board. */
interface Placed {
  readonly destination: string
  readonly previous: Buffer | undefined
}

/**
 * Put the candidate at the board's declared path, remembering what was there.
 *
 * `undefined` MEANS THERE WAS NO FILE, which is a different revert from an
 * empty one: the first has to be removed and the second has to be written back
 * as zero bytes. Collapsing them would leave an empty `.vrt` behind after a
 * failed first adoption, which `tools/perfboard/check.ts` would then read as a
 * layout rather than as its absence.
 */
function putInPlace(candidate: string, destination: string): Placed {
  const previous = fs.existsSync(destination) ? fs.readFileSync(destination) : undefined
  fs.copyFileSync(candidate, destination)
  return { destination, previous }
}

function revert(placed: Placed): void {
  if (placed.previous === undefined) {
    fs.rmSync(placed.destination, { force: true })
    return
  }
  fs.writeFileSync(placed.destination, placed.previous)
}

/**
 * Admit one layout, or throw naming the refusal.
 *
 * On success the candidate `.vrt` is at the board's declared path and **nothing
 * else has been written anywhere**.
 */
export function adoptLayout(input: AdoptInput, deps: AdoptDeps): void {
  const declarationFile = path.join(input.boardDir, "perfboard.json")
  const declaration = loadDeclaration(declarationFile)
  const board = {
    name: boardName(declaration),
    declarationFile,
    circuitPath: declaration.circuitPath,
  }
  const manifestFile = path.join(input.runDir, "run.json")

  const manifest = manifestOf(input.runDir)
  const inputs = manifest.canonical.inputs

  if (!fs.existsSync(input.candidate)) {
    refuse(
      "candidate-hash",
      `the candidate ${input.candidate} is not there, so its sha256 cannot be checked against ` +
        `the ${inputs.candidateSha256} ${manifestFile} records`,
    )
  }
  const candidateHash = sha256OfFile(input.candidate)
  if (candidateHash !== inputs.candidateSha256) {
    refuse(
      "candidate-hash",
      `${input.candidate} hashes to sha256 ${candidateHash} and ${manifestFile} records ` +
        inputs.candidateSha256,
    )
  }

  assertFileHash(deps.rulesPath, inputs.rulesSha256, "rules-hash", "the reviewed rules file")
  assertFileHash(deps.spanDataPath, inputs.spanDataSha256, "span-hash", "the lead-span data")
  assertFileHash(
    deps.pinPatternPath,
    inputs.pinPatternSha256,
    "pin-pattern-hash",
    "the pin-pattern data",
  )
  assertFrozenFixtureUnchanged(deps)
  assertProvenanceChain(input, manifest, board, deps)
  assertForkCommits(inputs, deps)
  assertVerdictAdmits(manifest, manifestFile)

  // G2.6, LAST OF THE CHECKS THAT PRECEDE THE WRITE, because it is the only one
  // about the destination rather than about the run. `assertLayoutRecoverable`
  // is the one implementation of it; its own message names which of the two ways
  // the undo is already broken, and this wrapping adds the refusal id so the
  // message cannot be mistaken for `update`'s or `stripboard`'s. The newlines
  // are folded out because this gate's refusals are one paragraph each.
  try {
    assertLayoutRecoverable(declaration.vrtPath, { allowDirty: input.allowDirty, git: deps.git })
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : String(caught)
    refuse("uncommitted-layout", detail.replace(/\n/g, " ").trim())
  }

  const placed = putInPlace(input.candidate, declaration.vrtPath)
  const checked = deps.makeCheck(input.boardDir)
  if (checked.status !== 0) {
    revert(placed)
    refuse(
      "failing-check",
      `make -C ${input.boardDir} check exited ${String(checked.status)} on the adopted ` +
        `${declaration.vrtPath}, which has been reverted: ${checked.output.trim()}`,
    )
  }
}
