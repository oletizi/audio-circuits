/**
 * One REAL materialisation run of `pultec-low-boost`, and the apparatus for
 * handing its run directory to the adoption gate's own checks.
 *
 * **THE RUN IS REAL AND THE GATE IS THE PRODUCTION ONE.** `defaultAdoptDeps()`
 * is what `tools/cli/perfboard-stripboard-verbs.ts` hands `adoptLayout`, so the
 * rules file, the two import closures and `B1-frozen`'s four fixtures are hashed
 * as they stand in the repository, and `readPin`/`builtCommit` read the real
 * `veroroute.pin` and the real build stamp. A scripted spawn here would make
 * every assertion a statement about the script.
 *
 * **NOTHING UNDER `boards/` IS WRITTEN AND `adoptLayout` IS NEVER CALLED.** That
 * function copies the candidate into the board's declared path, which is the one
 * thing these tests must not do: the committed `pultec-low-boost.perfboard.vrt`
 * is the owner's own partially-placed layout. So the checks are called
 * individually - which is also what makes a failure name WHICH of the ten
 * refused, rather than reporting the first one `adoptLayout` happens to reach.
 *
 * **IT DOES NOT SKIP WHEN THE FORK IS UNAVAILABLE.** `spawnSync` failing is a
 * loud throw naming the binary, because a skipped check that looks like a
 * passing one is the failure mode the whole stripboard workflow exists to
 * prevent.
 *
 * **THE RUN IS MADE ONCE PER FILE AND CACHED.** It costs about 340 ms and 22
 * fork invocations; two test files share this module so that the perturbation
 * table and the unperturbed assertions are about one run directory rather than
 * two.
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { loadDeclaration } from "../../tools/perfboard/declaration.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import type { ChainBoard } from "../../tools/stripboard/adopt-checks.ts"
import { defaultAdoptDeps } from "../../tools/stripboard/adopt.ts"
import type { AdoptDeps, AdoptInput } from "../../tools/stripboard/adopt-model.ts"
import { materializeRun, type MaterializeRun } from "../../tools/stripboard/materialize-run.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import {
  canonicalHash,
  readManifest,
  type CanonicalInputs,
  type CanonicalMetrics,
  type ExecutionProvenance,
} from "../../tools/stripboard/run-dir.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { scratchStamp } from "./run-scratch.ts"

export { cleanUpFixtures } from "./run-scratch.ts"

export const REPO = moduleRepoRoot()
export const BOARD = "pultec-low-boost"
export const BOARD_DIR = path.join("boards", BOARD)

/** The pinned fork, spawned for real, or a throw naming the binary. Never skips. */
export function forkSpawn(): SpawnVeroroute {
  const binary = verorouteBinary(process.env, REPO)
  return (args) => {
    const run = spawnSync(binary, [...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    if (run.error !== undefined) {
      throw new Error(
        `could not run ${binary} ${args.join(" ")}: ${run.error.message}. This test does not ` +
          "skip when the fork is unavailable: a skipped check that looks like a passing one is " +
          "the failure mode the whole stripboard workflow exists to prevent. veroroute.pin " +
          "names the commit and tools/perfboard/acquire.ts names the rebuild.",
      )
    }
    if (run.status === null) {
      throw new Error(`${binary} was killed by a signal running: ${args.join(" ")}`)
    }
    return {
      status: run.status,
      stdout: typeof run.stdout === "string" ? run.stdout : "",
      stderr: typeof run.stderr === "string" ? run.stderr : "",
    }
  }
}

/**
 * The committed rules with a `kappa_bench`, which is what makes a run directory
 * EXIST for these tests to hand the gate.
 *
 * **IT IS NOT A DEFAULT, AND THE REASON IT IS HERE IS A FINDING RATHER THAN A
 * CONVENIENCE.** The owner unset the clustering bound on 2026-10-16 (*"if the
 * layout is electrically correct, let's keep it. It looks fine to me"*), so
 * under the committed rules the materialised low-boost grades **admissible** -
 * and `materializeRun`'s own `assertRuleNotLoadBearing` then REFUSES to write
 * the run at all, because `exitCodeFor("admissible", "Q3")` is zero and `Q3`
 * here is earned over the restart schedule alone (`docs/known-gaps.md` G21,
 * G25). That refusal is driven directly, under the committed rules, by
 * `./materialize-run-perturbed.test.ts`.
 *
 * These two files are about the GATE's ten checks over a produced run
 * directory, which needs a run directory to exist. So they supply the 0.05 that
 * was committed until the ruling - which grades this board *valid, below
 * target*, the state the gate's `failing-check` was measured against - and say
 * here that the figure is the fixture's and no longer the file's.
 */
export const GRADED_RULES: StripboardRules = { ...loadRules(), kappaBench: 0.05 }

/** One real materialisation run, with its stamp registered for removal. */
export async function producedRun(label: string): Promise<MaterializeRun> {
  return materializeRun(
    { boardDir: BOARD_DIR, rules: GRADED_RULES, stamp: scratchStamp(BOARD, label) },
    forkSpawn(),
  )
}

/**
 * What `adoptLayout` would be handed for this run: the run directory, the
 * candidate `run.json` names, and the board's own directory.
 *
 * `allowDirty` IS FALSE, which is the production default and is not read by any
 * check in `./adopt-checks.ts` - `uncommitted-layout` is raised in `adopt.ts`
 * beside the write it guards, and no test here reaches that write.
 */
export function adoptInputFor(run: MaterializeRun): AdoptInput {
  return {
    runDir: run.runDir,
    candidate: run.candidate,
    boardDir: path.join(REPO, "boards", BOARD),
    allowDirty: false,
  }
}

/** What `assertProvenanceChain` needs about the board, read from its own declaration. */
export function chainBoard(): ChainBoard {
  const declarationFile = path.join(REPO, "boards", BOARD, "perfboard.json")
  const declaration = loadDeclaration(declarationFile)
  return { name: BOARD, declarationFile, circuitPath: declaration.circuitPath }
}

/** The production dependencies, which is what the real gate reaches through. */
export function realDeps(): AdoptDeps {
  return defaultAdoptDeps(REPO)
}

/** Where `run.json` is, for a test that edits it. */
export function manifestPath(run: MaterializeRun): string {
  return path.join(run.runDir, "run.json")
}

/**
 * Run `body` with `run.json` replaced by `edited`, then put the original bytes
 * back whatever happened.
 *
 * **THE RESTORE IS IN A `finally`** so one perturbation's edit cannot be the next
 * one's input: every scenario has to be healthy except in the one respect it is
 * about, or a test could pass against whichever check happened to run first and
 * the refusal it names could be dead.
 */
export function withManifest(run: MaterializeRun, edited: string, body: () => void): void {
  const file = manifestPath(run)
  const original = fs.readFileSync(file)
  fs.writeFileSync(file, edited)
  try {
    body()
  } finally {
    fs.writeFileSync(file, original)
  }
}

/** One field of one block, changed, with everything else left as the run wrote it. */
export interface ManifestChange {
  readonly inputs?: Partial<CanonicalInputs>
  readonly metrics?: Partial<CanonicalMetrics>
  readonly provenance?: Partial<ExecutionProvenance>
}

/**
 * `run.json` with one field changed and **the canonical hash RECOMPUTED over the
 * edit**.
 *
 * **RECOMPUTING IS WHAT MAKES THE PERTURBATION ABOUT THE FIELD'S OWN CHECK.**
 * `readManifest` refuses a manifest whose recorded hash disagrees with its own
 * two blocks, and `adopt` reports that as `candidate-hash` - so an edit that
 * left the hash alone would refuse by that one id whatever field was touched,
 * and would prove the canonical hash works rather than that the field is seen.
 * `./materialize-run-perturbed.test.ts` drives the hash-left-alone case once, on
 * its own, for exactly that reason.
 *
 * It builds the two blocks from `readManifest`'s typed result rather than from
 * `JSON.parse`, so a field renamed in `CanonicalInputs` is a type error here
 * instead of a perturbation that silently stops perturbing anything.
 */
export function rewritten(run: MaterializeRun, change: ManifestChange): string {
  const manifest = readManifest(run.runDir)
  const inputs: CanonicalInputs = { ...manifest.canonical.inputs, ...change.inputs }
  const metrics: CanonicalMetrics = { ...manifest.canonical.metrics, ...change.metrics }
  const provenance: ExecutionProvenance = { ...manifest.provenance, ...change.provenance }
  const rebuilt = {
    canonical: { inputs, metrics, hash: canonicalHash(inputs, metrics) },
    provenance,
  }
  return `${JSON.stringify(rebuilt, null, 2)}\n`
}

/** Run `body` with `file` moved aside, then put it back whatever happened. */
export function withFileAbsent(file: string, body: () => void): void {
  const original = fs.readFileSync(file)
  fs.rmSync(file)
  try {
    body()
  } finally {
    fs.writeFileSync(file, original)
  }
}
