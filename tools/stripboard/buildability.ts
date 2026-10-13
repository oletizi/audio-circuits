/**
 * The four buildability verifiers `make check` admits, and the section they
 * print into a board's report.
 *
 * **WHAT THIS CLOSES.** `HC5`, `HC8`, `HC9` and `HC10` ran only on the adoption
 * path (`./adopt.ts`), so `make check` - *"the repository's main verification
 * command, the one that runs on boards a human laid"* - was WEAKER THAN THE
 * ADOPTION GATE on exactly the constraints that catch a board that does not
 * conduct. CRITERIA `G4` is the authority
 * (`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` §9),
 * and the owner reviewed that document on 2026-10-13, which is what `G4`'s
 * second admission condition reads against.
 *
 * **THE INVARIANT THIS DOES NOT BREACH.** An agent may never author the
 * acceptance criteria for the artifact it is producing. Nothing here states a
 * criterion: the four constraint predicates are `./constraints.ts`'s, the ids
 * are CRITERIA's, every bound comes from `lib/kicad/lead-span.ts`,
 * `lib/kicad/pin-pattern.ts` or `stripboard/rules.json`, and each of those
 * REFUSES BY NAME rather than defaulting when the datum it needs is not
 * recorded. This module selects which of the ten a gate admits and renders the
 * result; it decides no bound.
 *
 * **WHY `HC6` IS NOT HERE.** `OB4`: `pt2399-core` is 17 x 36 against a declared
 * stock of 34 x 27 and it is a board that works - the owner's own words,
 * recorded in `stripboard/rules.json`'s `stockCols` note, are *"It doesn't fit
 * on my stock boards. I improvised to make it work."* Admitting `HC6` here would
 * refuse a built board over a figure he expects to change. The other five are
 * not admitted by this gate either, and the record of what each task admitted is
 * `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`.
 *
 * **THE VERDICT ARRIVES THROUGH THE REPORT, NOT ONLY THROUGH A THROW**, because
 * `make check`'s printed output is what a person reads
 * (`tools/cli/perfboard.ts` prints `PerfboardResult.report` under `FAIL`). A
 * constraint that does not hold is rendered here and folded into `ok`. A datum
 * that is NOT RECORDED still throws, from the lookup that refuses it, and that
 * distinction is `hc8`'s own and is kept: a throw says *this board cannot be
 * graded*, which is the honest answer to missing data, and the CLI prints the
 * refusal under `FAIL` as well, so neither outcome can be mistaken for a pass.
 *
 * **A HELD CONSTRAINT PRINTS ITS FIGURES TOO.** `ConstraintResult.detail` is
 * non-empty on a pass by its own contract - *"a pass that says nothing is
 * indistinguishable from a pass that checked nothing, and this pipeline has
 * shipped the latter before"* - so the section lists all four whatever they say.
 * A board failing on something else still prints this section, which is where a
 * reader finds out the four ran at all.
 */
import { gradeConstraints } from "./grade.ts"
import type { CheckInput, ConstraintId, ConstraintResult } from "./constraints-model.ts"

/**
 * The ids `make check` admits, each with the reason it is admitted - `G4`'s
 * first condition is that *"the constraint is one CRITERIA states"*, and the
 * wording below is what the gate prints when asked.
 *
 * **THIS LIST IS THE ONE PLACE THE SUBSET IS NAMED.** `./grade.ts`'s
 * `gradeConstraints` takes it as an argument and refuses an empty or repeated
 * set; nothing else chooses which constraints a gate runs.
 */
export const ADMITTED: readonly {
  readonly id: ConstraintId
  readonly why: string
}[] = [
  {
    id: "HC5",
    why: "no lead span past the part's own reach - a span the part cannot make is not a lever but a fiction",
  },
  {
    id: "HC8",
    why: "the copper partitions the pins exactly as the netlist does - no open and no short, reconstructed from the board rather than from the plan",
  },
  {
    id: "HC9",
    why: "no lead span compressed below the part's own minimum, which every other span check passes",
  },
  {
    id: "HC10",
    why: "no part whose pin pattern the strips cannot take, across the footprint half and the placement half both",
  },
]

/** The ids alone, for `gradeConstraints`. */
export const ADMITTED_IDS: readonly ConstraintId[] = ADMITTED.map((entry) => entry.id)

/** The heading the section is printed under, and the string a test anchors on. */
export const BUILDABILITY_HEADING = `Buildability (CRITERIA G4: ${ADMITTED_IDS.join(", ")})`

/** The four verdicts and the text `make check` prints for them. */
export interface BuildabilityVerdict {
  /**
   * Whether the four were graded AT ALL.
   *
   * `false` means a datum they need is not recorded, or the board could not be
   * read, so there is no verdict about this layout - see `refusedBuildability`.
   * `graded: false` implies `ok: false` and `results: []` by construction,
   * because the one reading a refusal must never support is a pass.
   */
  readonly graded: boolean
  readonly ok: boolean
  readonly results: readonly ConstraintResult[]
  readonly report: string
}

const NOT_A_VERDICT =
  "    This is a REFUSAL TO GRADE and not a verdict that the board is buildable: the four " +
  "constraints have no answer about this layout, which is why the board is reported as failing " +
  "rather than as passing. A constraint whose check silently passes is worse than no constraint, " +
  "because the verdict claims it held."

/**
 * The section printed when the four could NOT be graded, carrying the refusal
 * verbatim.
 *
 * **WHY A REFUSAL IS RENDERED HERE RATHER THAN LEFT TO ESCAPE AS A THROW.**
 * `make check`'s printed output is what a person reads, and a refusal that
 * escapes `checkPerfboard` replaces the binary's own report with its own text -
 * so a board already failing on Layout state would lose the list of incomplete
 * nets, which is the half of the output that says what to go and fix. Carried as
 * a section, both survive.
 *
 * **IT IS STILL A REFUSAL AND NOT A FAILED CONSTRAINT**, which is `hc8`'s own
 * distinction: a failed constraint is a fact about the board, a refusal is the
 * absence of a datum, and the wording above never lets the two read alike.
 * `ok` is false either way, so nothing about this is a softening.
 */
export function refusedBuildability(detail: string): BuildabilityVerdict {
  return {
    graded: false,
    ok: false,
    results: [],
    report: [BUILDABILITY_HEADING, `  NOT GRADED - ${detail}`, NOT_A_VERDICT, ""].join("\n"),
  }
}

/**
 * Grade the admitted four over one board and render them.
 *
 * **`ok` IS THE CONJUNCTION OVER EXACTLY THE ADMITTED IDS AND IS CHECKED, NOT
 * ASSUMED.** `results.every(...)` is `true` of the empty list, which is how a
 * gate comes to report green over nothing, so this refuses a result set that is
 * not one per admitted id before it folds - the same discipline `a1` applies to
 * the ten, for the same reason.
 */
export function gradeBuildability(input: CheckInput): BuildabilityVerdict {
  const results = gradeConstraints(input, ADMITTED_IDS)
  const seen = new Set<ConstraintId>(results.map((result) => result.id))
  const missing = ADMITTED_IDS.filter((id) => !seen.has(id))
  if (missing.length > 0 || results.length !== ADMITTED_IDS.length) {
    throw new Error(
      `the buildability gate asked for ${ADMITTED_IDS.join(", ")} and was handed ` +
        `${results.length} result(s)` +
        (missing.length > 0 ? ` with ${missing.join(", ")} absent` : "") +
        ".\nThis refuses rather than folding what arrived: `every` is true of an empty list and " +
        "true of three passes, so a conjunction over an incomplete set is a board reported " +
        "buildable against constraints nobody checked.",
    )
  }
  const lines = [BUILDABILITY_HEADING]
  for (const result of results) {
    if (result.held) {
      lines.push(`  ${result.id} held - ${result.detail}`)
      continue
    }
    // THE CRITERION'S OWN PURPOSE IS PRINTED BESIDE A FAILURE and not beside a
    // pass: a reader who has just been handed a red board needs to know WHAT
    // was being required of it, and the detail alone says only what was
    // measured. `ADMITTED`'s wording is therefore load-bearing output rather
    // than a comment in a list.
    lines.push(`  ${result.id} NOT HELD - ${result.detail}`)
    lines.push(`    ${result.id} requires: ${whyAdmitted(result.id)}`)
  }
  return {
    graded: true,
    ok: results.every((result) => result.held),
    results,
    report: `${lines.join("\n")}\n`,
  }
}

function whyAdmitted(id: ConstraintId): string {
  const entry = ADMITTED.find((candidate) => candidate.id === id)
  if (entry === undefined) {
    throw new Error(
      `${id} has a result in this gate's output and no entry in ADMITTED, so what it requires ` +
        "cannot be printed beside its failure. This refuses rather than printing the failure " +
        "without it: ADMITTED is the one place the subset is named, and a result from outside it " +
        "means the gate graded a constraint nobody admitted.",
    )
  }
  return entry.why
}
