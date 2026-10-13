/**
 * What the adoption gate IS: its inputs, its collaborators, and the ten things
 * it refuses.
 *
 * THE AUTHORITY is CRITERIA `G1`-`G4`
 * (`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` §9) and
 * the plan's Task 24. Where this module and those documents differ they win and
 * this comment is the defect.
 *
 * **IT IS A SEPARATE FILE FOR THE REASON `./stop-model.ts` AND
 * `./report-model.ts` ARE**: the ten refusal statements are most of this gate's
 * prose and none of its behaviour, and keeping them beside the one `switch` the
 * type checker proves complete leaves `./adopt.ts` as the checks themselves.
 *
 * **"SIX REFUSALS" IN `G2`'s PROSE AND TEN IN `AdoptRefusal` ARE THE SAME SET
 * AT TWO GRAINS, and the finer grain is the one implemented.** `G2` numbers six
 * CLAUSES - `G2.1` to `G2.6` - and four of them carry more than one refusal:
 * `G2.1` is the candidate's own `sha256` and the manifest's canonical hash,
 * `G2.2` is the rules file and the span data and the pin-pattern data and the
 * frozen fixture, `G2.4` is the pinned veroroute commit and, separately, the
 * built one, and `G2.5` is any failing check including a non-admissible
 * verdict. A suite written to the prose's count would leave four of the ten
 * untested, and *"a gate with five of six refusals is a gate"* is the task's own
 * warning, so each of the ten has its own id, its own statement here and its own
 * test. The discrepancy is recorded in the plan rather than resolved by reading
 * one number as the other.
 */
import { assertEnumerated } from "./report-model.ts"
import type { GitRunner } from "../perfboard/mutate.ts"
import type { Pin } from "../perfboard/acquire.ts"

/**
 * The ten things the gate refuses.
 *
 * ENUMERATED AS A UNION SO THE `switch` BELOW IS PROVED COMPLETE. Adding an
 * eleventh id without a statement for it is `TS2366` on
 * `notDefaultedBecause` - the same device `StopRefusal` and `VerdictRefusal`
 * use, and the reason there is no `default` arm: a `default` would absorb the
 * new id and a gate whose refusal set can grow silently is a gate with an
 * unchecked case.
 */
export type AdoptRefusal =
  | "candidate-hash"
  | "rules-hash"
  | "span-hash"
  | "pin-pattern-hash"
  | "frozen-fixture-hash"
  | "provenance-chain"
  | "veroroute-commit"
  | "built-commit"
  | "failing-check"
  | "uncommitted-layout"

/**
 * Every member of `AdoptRefusal`, as a RECORD the compiler proves complete.
 *
 * **THE ARRAY BELOW IS WHAT A TEST LOOPS OVER AND A MISSING MEMBER OF IT IS NOT
 * A TYPE ERROR** - `readonly AdoptRefusal[]` is satisfied by a list of nine -
 * so the array alone would leave "the gate's refusal set can grow silently" open
 * on exactly the half the typecheck does not reach. `Record<AdoptRefusal, true>`
 * closes it: a missing key is `TS2741` and an extra one `TS2353`, and
 * `assertEnumerated` compares the array against this record's keys at import.
 * So an eleventh id costs a statement in the `switch` (`TS2366`), an entry here,
 * and a member of the array - and omitting any of the three stops a run.
 */
const ADOPT_REFUSAL_KEYS: Readonly<Record<AdoptRefusal, true>> = {
  "candidate-hash": true,
  "rules-hash": true,
  "span-hash": true,
  "pin-pattern-hash": true,
  "frozen-fixture-hash": true,
  "provenance-chain": true,
  "veroroute-commit": true,
  "built-commit": true,
  "failing-check": true,
  "uncommitted-layout": true,
}

/** Every member of `AdoptRefusal`, so a test can assert its own cases cover it. */
export const ADOPT_REFUSALS: readonly AdoptRefusal[] = [
  "candidate-hash",
  "rules-hash",
  "span-hash",
  "pin-pattern-hash",
  "frozen-fixture-hash",
  "provenance-chain",
  "veroroute-commit",
  "built-commit",
  "failing-check",
  "uncommitted-layout",
]

// CHECKED AT IMPORT, the same device and the same function `./report-model.ts`
// uses for `OUTCOMES` and `BOUND_STATUSES` against their phrasing tables.
assertEnumerated(ADOPT_REFUSALS, Object.keys(ADOPT_REFUSAL_KEYS), "adoption refusal")

/** One statement per refusal: what is missing, where to fix it, and why it is not defaulted. */
export function notDefaultedBecause(refusal: AdoptRefusal): string {
  switch (refusal) {
    case "candidate-hash":
      return (
        "run.json's canonical block is the only proof a run produced a given board, and the " +
        "gate recomputes it rather than trusting it: the recorded hash is checked against " +
        "canonicalHash(inputs, metrics) over the file's own two blocks, and the candidate .vrt " +
        "handed in is hashed and checked against inputs.candidateSha256. Neither is defaulted " +
        "and neither is skipped when the file looks plausible, because a board adopted on a " +
        "manifest that no longer describes it is a layout nothing in this repository can trace " +
        "to a run. Adopt the .vrt the run named in its own run.json, rather than a board edited " +
        "after the run that scored it."
      )
    case "rules-hash":
      return (
        "Every parameter the run was judged against is in one committed file, stripboard/" +
        "rules.json (PAR3), and its sha256 is in the canonical inputs for exactly this check: " +
        "without it a parameter could be slipped in AFTER a run and the run's own numbers would " +
        "still look like evidence for the board. It is not defaulted and the mismatch is not " +
        "tolerated on the grounds that the edit looks harmless - whether it does is the " +
        "reviewer's call on the rules file, not this gate's. Re-run the pipeline against the " +
        "rules as they now stand."
      )
    case "span-hash":
      return (
        "lib/kicad/lead-span.ts is the authority for every physical lead span HC5 and HC9 grade " +
        "a candidate by (PAR2), so a board graded against one table and adopted under another " +
        "has been graded against nothing that is now true. It is not defaulted: the table " +
        "refuses an unlisted footprint by name rather than widening, and this gate holds the " +
        "same line one step later. Re-run the pipeline against the span data as it now stands."
      )
    case "pin-pattern-hash":
      return (
        "lib/kicad/pin-pattern.ts is the authority for every package's pin geometry, which is " +
        "what HC4, HC9 and HC10 read to decide whether a part can sit where the layout puts it " +
        "(PAR2). A candidate graded against an earlier pattern table proves nothing about the " +
        "board that would be built from today's. It is not defaulted, for the same reason the " +
        "span table is not: an empty whitelist that refuses loudly beats a general rule that " +
        "quietly accepts a guess. Re-run the pipeline against the pin-pattern data as it now " +
        "stands."
      )
    case "frozen-fixture-hash":
      return (
        "B1-frozen is the ONE externally authored criterion in this pipeline and it is stated " +
        "against the four committed files under tests/fixtures/stripboard/, whose sha256s are " +
        "recorded in provenance.txt beside them (B2). The gate hashes each file and requires " +
        "its hash to appear there, so a silently edited benchmark surfaces as a changed hash " +
        "rather than as a quietly easier test. It is NOT recomputed into provenance.txt and the " +
        "fixture is NOT regenerated: a benchmark adjusted until it passes is a benchmark " +
        "grading itself. If the fixture genuinely has to move, re-extract it by the commands " +
        "provenance.txt records and record the new hash there in the same change."
      )
    case "provenance-chain":
      return (
        "The chain runs board -> netlist -> imported.vrt -> candidate, and G2.3 refuses one " +
        "that does not START from the board as it now is. So the gate re-walks it on disk: " +
        "run.json's own stamp must reproduce the run directory for THIS board, the netlist the " +
        "run wrote must still hash to inputs.netlistSha256, the imported board every arm " +
        "started from must still be there, the candidate must be inside that run directory, " +
        "and the board's own perfboard.json and circuit module must be byte-identical to what " +
        "they were at inputs.pipelineCommit with no uncommitted edits. None of the five is " +
        "defaulted, because a chain with a link taken on trust is a chain that proves nothing " +
        "about the other four. KNOWN LIMIT, recorded rather than papered over: the circuit " +
        "module is compared as ONE file and its transitive imports are not, so a change inside " +
        "a module it imports is not caught here - tests/stripboard/import-closure.ts is the " +
        "machinery that would close it and run.json records no closure hash to compare against."
      )
    case "veroroute-commit":
      return (
        "veroroute.pin is what the fork was PINNED to, and inputs.verorouteCommit is what the " +
        "run recorded. A disagreement means the run's figures came from a different fork than " +
        "this repository now pins, and every cut count, span and copper reading in the run is a " +
        "measurement of that other binary. It is not defaulted to the pin: doing so would make " +
        "the gate assert agreement it did not observe. Re-run the pipeline on the pinned fork, " +
        "or say in a reviewed change why the pin moved."
      )
    case "built-commit":
      return (
        "D25's two figures: veroroute.pin is what was INTENDED and " +
        "tools/perfboard/acquire.ts's builtCommit() is what RAN, read from " +
        ".tools/veroroute-perfboard/.built-commit. They have disagreed once already and every " +
        "figure in COST and MOVE went through the disagreement, which is why both are canonical " +
        "and why this gate checks the built commit against the pin AND against the stamp on " +
        "disk, separately. An UNKNOWN built commit - no stamp, or an empty one - is refused " +
        "rather than taken as agreement: unknown is not the pinned commit, and a stale local " +
        "build is a real state rather than a bug to default away. Rebuild the fork through " +
        "`make veroroute` so the stamp is written, then re-run."
      )
    case "failing-check":
      return (
        "G2.5 refuses any failing check, and the gate reads the verdict through " +
        "./report-model.ts's exitCodeFor(outcome, rule) rather than comparing the outcome with " +
        "\"admissible\" itself - a second comparison would be a second taxonomy, and this one " +
        "also catches a Q5 stop on a healthy candidate, which CRITERIA twice calls a run " +
        "reported as a failure rather than as a result. After the copy, `make check` in the " +
        "board's own directory is the repository's verdict (G4) and a non-zero exit is a FAILED " +
        "adoption: the copy is reverted rather than left behind for somebody to find. Nothing " +
        "is defaulted and no outcome is admitted on the grounds that it is close - valid, below " +
        "target is a result the pipeline reports and does not adopt."
      )
    case "uncommitted-layout":
      return (
        "This verb rewrites boards/<board>/<board>.perfboard.vrt IN PLACE and git is the way " +
        "back, so it refuses while the way back would not reach the state you are in now - " +
        "exactly how update and stripboard already behave " +
        "(tools/perfboard/mutate.ts's assertLayoutRecoverable, which is the one implementation " +
        "of this check rather than a second copy of it). It is not defaulted to overwriting: " +
        "commit the layout first, or pass --allow-dirty to say that these changes are not " +
        "recoverable."
      )
  }
}

/**
 * Throw the named refusal.
 *
 * `never` RETURN, so a call site needs no `return` after it and the type checker
 * knows the branch ends - `./stop-model.ts`'s `refuse`, same shape and same
 * reason.
 */
export function refuse(refusal: AdoptRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(CRITERIA G1-G4 section 9 is the authority, and tools/stripboard/adopt.ts is the only " +
      "thing in this pipeline that writes under boards/.)",
  )
}

/** What one adoption is about: a run, the candidate out of it, and the board it would land on. */
export interface AdoptInput {
  /**
   * The run directory holding `run.json` - `build/stripboard/<board>/<stamp>/`.
   * The gate reads it and never writes into it.
   */
  readonly runDir: string
  /**
   * The candidate `.vrt` to adopt, which the run's own `inputs.candidateSha256`
   * has to agree with. It is handed in rather than derived, because a run
   * directory holds one `.vrt` per gesture and per climb and nothing on disk
   * says which one `best` was - only its hash does.
   */
  readonly candidate: string
  /**
   * The board's own directory, holding its `perfboard.json`. The directory you
   * are standing in, as for every other verb on this CLI - **no `BOARD=`
   * variable**, because two ways to say which board is two places for one fact
   * to be wrong.
   */
  readonly boardDir: string
  /** The operator's explicit statement that this write cannot be undone. */
  readonly allowDirty: boolean
}

/** One `make check` run: its exit status and everything it printed. */
export interface MakeCheckRun {
  readonly status: number | null
  readonly output: string
}

/**
 * What the gate needs from outside itself.
 *
 * **EVERY PATH IS A DEPENDENCY RATHER THAN A CONSTANT, AND THAT IS NOT
 * CONFIGURATION.** Each of these files is one the run recorded a hash of, and a
 * test has to be able to hand the gate a CHANGED one to prove the matching
 * refusal fires. Resolving them from `moduleRepoRoot()` inside the gate would
 * leave five of the ten refusals undrivable, and a refusal that cannot be
 * driven is a refusal nobody has seen work. `defaultAdoptDeps` below is the one
 * place the production answers live.
 */
export interface AdoptDeps {
  /** The repository root `builtCommit` reads its build stamp under. */
  readonly repoRoot: string
  /** `veroroute.pin`. */
  readonly pinFile: string
  /** `stripboard/rules.json` - `RULES_PATH` in production. */
  readonly rulesPath: string
  /** `lib/kicad/lead-span.ts`. */
  readonly spanDataPath: string
  /** `lib/kicad/pin-pattern.ts`. */
  readonly pinPatternPath: string
  /** `tests/fixtures/stripboard/`, holding B1-frozen's four files. */
  readonly frozenFixtureDir: string
  /** The `provenance.txt` beside them, which records their hashes. */
  readonly frozenProvenanceFile: string
  readonly readPin: (file: string) => Pin
  readonly builtCommit: (repoRoot: string) => string | undefined
  readonly git: GitRunner
  /** `make -C <boardDir> check`, the repository's verdict (`G4`). */
  readonly makeCheck: (boardDir: string) => MakeCheckRun
}
