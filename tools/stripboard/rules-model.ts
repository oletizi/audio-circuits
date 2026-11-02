/**
 * WHAT THE REVIEWED RULES ARE: the one file's path, its schema version, the
 * eleven parameters, their declared ranges and what `null` means for the three
 * that may be it.
 *
 * **ITS OWN FILE FOR THE REASON `./stop-model.ts`, `./place-model.ts`,
 * `./climb-model.ts` AND `./adopt-model.ts` ARE**: the declarations are most of
 * this area's prose and none of its behaviour, and `./rules.ts` is then the
 * strict loader and nothing else. It also put `rules.ts` back under the 500-line
 * ceiling, which it had passed by two.
 *
 * **NOTHING HERE READS A FILE OR REFUSES ANYTHING.** The ranges say what a value
 * must be and WHY the bound is where it is; `./rules.ts` is what applies them,
 * and it is the only way into this data. Consumers import `StripboardRules`,
 * `RULES_PATH`, `RULES_SCHEMA` and `loadRules` from `./rules.ts` as they always
 * did - it re-exports the three declarations - so this split is invisible to
 * them.
 *
 * THE GOVERNING INVARIANT, restated here because this is where the parameters
 * live: an agent may never author the acceptance criteria for the artifact it
 * produces (`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`),
 * and the rules file is how criteria reach the optimiser WITHOUT passing through
 * the agent that runs it. CRITERIA PAR3 is the criterion; PAR4 is why there is
 * no per-board variant.
 *
 * NULL IS A VALUE AND NOT AN ABSENCE. `kappaBench` (CRITERIA K2),
 * `tau` (CRITERIA K4) and `worseAcceptance` (PIPELINE E3) are deliberately
 * unset, and all three are written `null` with their keys REQUIRED, so "unset
 * on purpose, and here is why" is distinguishable from "left out by accident".
 * `NULLABLE` below is keyed by the union, so reading a fourth parameter as
 * nullable does not compile until this file says what the pipeline does while
 * that one is unset.
 *
 * **`kappaBench` JOINED THAT LIST ON 2026-10-16, BY THE OWNER'S RULING**, and
 * it is the clearest case in the file of the invariant restated below biting
 * the file itself: the withdrawn bound of 0.05 was an acceptance criterion an
 * agent authored for an artifact agents produce, set below every one of the
 * four boards the owner has built (kappa = 0.055, 0.181, 0.196, 0.269), and
 * ratcheted by the same agent's reasoning so it would be hard to move. He ruled
 * on the board it refused: *"i prefer the loose layout. It's much easier to
 * build. I don't see the problem"*. The whole account is in that parameter's
 * note in `stripboard/rules.json`, and no number replaces it.
 */
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"

/**
 * The one committed rules file, absolute - computed once, because G2.2 hashes
 * its content into the run manifest and a canonical hash has to hash one
 * thing. A second way to name this file would be a second file to that hash.
 */
export const RULES_PATH = path.join(moduleRepoRoot(), "stripboard", "rules.json")

/** The only schema version this loader reads. */
export const RULES_SCHEMA = 1

export interface StripboardRules {
  readonly schema: 1
  /** CRITERIA PAR1's `rho_w`: what one wire bridge costs against one cut. */
  readonly rhoWire: number
  /** CRITERIA PAR1's `rho_s`: what one solder bridge costs. */
  readonly rhoSolder: number
  /**
   * CRITERIA K2's `kappa_bench`, the clustering bound A2 applies - `null` while
   * it is UNSET, which is the owner's ruling of 2026-10-16 and not an omission.
   * While it is null, A2 does not fire; `kappa` is still computed and reported
   * on every run, because unsetting the bound removes the GRADING and never the
   * MEASUREMENT.
   */
  readonly kappaBench: number | null
  /**
   * CRITERIA K4's `tau`, the floor tolerance - `null` while it is UNSET, which
   * is the owner's decision and not an omission. While it is null, Q2 and A3
   * do not fire.
   */
  readonly tau: number | null
  /** CRITERIA Q4's `k`, the diminishing-returns ratio. A labelled hypothesis. */
  readonly yieldFloor: number
  /** CRITERIA Q5's run-level evaluation budget - a backstop, not a target. */
  readonly evaluationCap: number
  /** CRITERIA Q6's run length: how many results must share a failure signature. */
  readonly signatureRun: number
  /** PIPELINE R7/E2's seed list, which the restart schedule is derived from. */
  readonly seeds: readonly number[]
  /**
   * PIPELINE E3's bound on accepting a worse candidate - `null` meaning the
   * mechanism DOES NOT RUN, because no source supplies a schedule and none is
   * invented.
   */
  readonly worseAcceptance: number | null
  /** CRITERIA HC6's stock, in strips. */
  readonly stockRows: number
  /** CRITERIA HC6's stock, in columns. */
  readonly stockCols: number
  /** One entry per parameter, recording why the number is what it is. */
  readonly notes: Readonly<Record<string, string>>
}

/** The eleven parameters, in the order the committed file carries them. */
const PARAMETERS = [
  "rhoWire",
  "rhoSolder",
  "kappaBench",
  "tau",
  "yieldFloor",
  "evaluationCap",
  "signatureRun",
  "seeds",
  "worseAcceptance",
  "stockRows",
  "stockCols",
] as const

/** Every key a schema-1 file may carry, and no other. */
const TOP_LEVEL_KEYS: readonly string[] = ["schema", ...PARAMETERS, "notes"]

type Parameter = (typeof PARAMETERS)[number]

/**
 * The three parameters that may be null - a union rather than a runtime list,
 * so that reading a fourth as nullable does not compile until `NULLABLE` below
 * says what the pipeline does while that one is unset.
 */
type NullableParameter = "kappaBench" | "tau" | "worseAcceptance"

/** Every parameter that is a single number - which is all of them but the seed list. */
type NumericParameter = Exclude<Parameter, "seeds">

/**
 * What a numeric parameter must be, and WHY the bound is where it is.
 *
 * `why` is spliced into the refusal, because a range that refuses without
 * saying what it is protecting is a range the next person widens. Every one of
 * these comes from a criterion, named in the text.
 */
interface NumberSpec {
  readonly integer: boolean
  /** Inclusive. A value below this is refused. */
  readonly min: number
  /** Inclusive, when present. */
  readonly max?: number
  readonly why: string
}

const NUMBERS: Readonly<Record<NumericParameter, NumberSpec>> = {
  rhoWire: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "CRITERIA PAR1 prices a wire against a cut, so a weight of zero or less would " +
      "make wires free or profitable and F would stop being a cost",
  },
  rhoSolder: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "a derived solder bridge is a join somebody has to make - on the owner's bench by " +
      "running a wire for it - so a weight of zero or less would make bridges free or " +
      "profitable. The VALUE is in stripboard/rules.json with its warrant; this bound is " +
      "only that it is positive",
  },
  kappaBench: {
    integer: false,
    min: Number.MIN_VALUE,
    max: 1,
    why:
      "kappa = J/(P - N) lies in [0, 1] (CRITERIA K1), so a bound above 1 refuses " +
      "nothing; and a bound of 0 would refuse a layout AT THE FLOOR, which sits at " +
      "kappa = 0 - K2 rests on A2 being unable to refuse a provably optimal layout. " +
      "This range applies to a bound SOMEBODY SETS: the committed value is null, and " +
      "setting one is a deliberate edit carrying the evidence it rests on",
  },
  tau: {
    integer: false,
    min: Number.MIN_VALUE,
    max: 1,
    why:
      "the tolerance is (F - F_floor)/max(1, F_0 - F_floor) < tau (CRITERIA K4), a " +
      "fraction of the gap to the derived floor, so 0 passes nothing and 1 passes " +
      "everything the search started from",
  },
  yieldFloor: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "Q4 stops when g/r > k*e (CRITERIA Q4) and k is a ratio of effort to effort, so " +
      "k <= 0 stops the search on its first evaluation",
  },
  evaluationCap: {
    integer: true,
    min: 1,
    why:
      "Q5 is a run-level backstop against a looping bug (CRITERIA Q5), and a cap below " +
      "one evaluation stops a run before it has scored anything",
  },
  signatureRun: {
    integer: true,
    min: 2,
    why:
      "Q6 stops on a REPEATED failure (CRITERIA Q6), so a run length of 1 compares a " +
      "signature with nothing and stops on the first failure of any kind",
  },
  stockRows: {
    integer: true,
    min: 1,
    why: "HC6's stock is a physical board, measured in whole strips (CRITERIA HC6)",
  },
  stockCols: {
    integer: true,
    min: 1,
    why: "HC6's stock is a physical board, measured in whole columns (CRITERIA HC6)",
  },
  worseAcceptance: {
    integer: false,
    min: Number.MIN_VALUE,
    why:
      "E3 accepts a worse candidate WITHIN a bound (PIPELINE E3), so a bound of 0 or " +
      'less accepts nothing worse - which is the mechanism not running, and that state ' +
      "is written null so there is exactly one spelling of it",
  },
}

/**
 * What null MEANS for each parameter that may be it - keyed by
 * `NullableParameter`, so the compiler requires an entry: unset without a
 * statement of what the pipeline then does is a silent change of behaviour,
 * which is the opposite of what null records here.
 */
const NULLABLE: Readonly<Record<NullableParameter, string>> = {
  kappaBench:
    "null means the clustering bound is UNSET (CRITERIA K2), so A2 does not fire and the " +
    "admissibility verdict rests on A1, A3 and A4 - while kappa is still computed and " +
    "reported on every run, the bound being the grading and not the measurement",
  tau: "null means the floor tolerance is UNSET (CRITERIA K4), so Q2 and A3 do not fire",
  worseAcceptance: "null means E3 does not run and the report says so (PIPELINE E3)",
}
export type { NullableParameter, NumberSpec, NumericParameter, Parameter }
export { NULLABLE, NUMBERS, PARAMETERS, TOP_LEVEL_KEYS }
