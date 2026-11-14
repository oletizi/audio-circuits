/**
 * The tolerances a board is held to, applied to a report that
 * `drc-report.ts` has already proven complete.
 *
 * | Class                        | Policy                                                           |
 * | ---------------------------- | ---------------------------------------------------------------- |
 * | `schematic_parity`           | zero tolerated at ANY severity: a board that disagrees with its   |
 * |                              | schematic is not this board. Parity findings arrive as warnings   |
 * |                              | and that is why they are not scoped by severity here.             |
 * | violations of a              | zero tolerated at ANY severity - see below. These are the         |
 * | `REQUIRED_ACTIVE_CHECKS` type| `items_not_allowed` / `courtyards_overlap` / `missing_courtyard`  |
 * |                              | checks the hardware-envelope gate is built on.                    |
 * | all other DRC violations     | zero tolerated at error severity; warnings and exclusions are     |
 * |                              | counted and reported, not failed                                  |
 * | `unconnected_items`          | zero on a routed candidate; COUNTED, not ignored, on an           |
 * |                              | unrouted one, where it measures what the router left undone       |
 *
 * **THE SECOND ROW IS NEW AND IT CLOSES A VACUOUS PASS. This table said
 * "zero tolerated at error severity" for every violation until it was
 * measured.** `REQUIRED_ACTIVE_CHECKS` exists to stop a project disabling the
 * hardware-envelope gate, and `./drc-report.ts` refuses a report that lists any
 * of the three under `ignored_checks` - its own comment says "setting any of
 * them to 'ignore' makes that gate pass vacuously". But with the old table,
 * setting one to `warning` instead of `ignore` produced violations that were
 * counted and NOT failed, which is the same vacuous pass reached by a setting
 * KiCad presents as enabled; `./drc-report.ts`'s refusal text was recommending
 * exactly that. A violation of one of those three types therefore fails here at
 * any severity.
 *
 * **THIS IS NOT A NEW TOLERANCE AND IT IS NOT THIS MODULE'S OWN CRITERION.**
 * The acceptance criteria it enforces are already written down elsewhere:
 * `docs/standards/pcbway-fab-rules.md` requires the three checks active, and
 * `docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`'s
 * Task 8 Step 4 table specifies both mechanisms at `error`. What changed is only
 * that the code now enforces what those say.
 *
 * **AND IT IS HERE RATHER THAN ONLY IN A CONFIG CHECK**, because the report is
 * the authority: a report can come from a run whose severities disagree with any
 * `.kicad_pro` on disk - a stale project, a board opened against another one -
 * and that is the same argument `./drc-report.ts` makes for reading
 * `ignored_checks` from the report rather than the project. `./fab-standard.ts`
 * requires the three at `error` as well, and that is fail-fast ahead of a run,
 * not a substitute for this.
 */

import type { ParsedReport } from "./drc-report.ts"
import { REQUIRED_ACTIVE_CHECKS } from "./drc-report.ts"

export interface DrcPolicy {
  /** Explicit, never defaulted: whether this candidate is meant to be fully routed. */
  readonly routed: boolean
}

export interface Verdict {
  readonly pass: boolean
  readonly failures: readonly string[]
  readonly counts: {
    readonly schematicParity: number
    readonly errorViolations: number
    readonly warningViolations: number
    readonly exclusionViolations: number
    /**
     * Violations whose type is one of `REQUIRED_ACTIVE_CHECKS`, at ANY severity.
     * Reported separately because it OVERLAPS the severity counts rather than
     * partitioning them: one `courtyards_overlap` at error severity is counted
     * here and in `errorViolations` both. A reader comparing the counts against
     * `violations.length` would otherwise read the overlap as a miscount.
     */
    readonly requiredCheckViolations: number
    readonly unconnectedItems: number
  }
  /** Set only for an unrouted candidate: the connections still undone. */
  readonly leftUnrouted: number | undefined
}

export function verdictOf(report: ParsedReport, policy: DrcPolicy): Verdict {
  const count = (severity: string): number => report.violations.filter((v) => v.severity === severity).length
  const requiredCheckViolations = report.violations.filter((v) =>
    (REQUIRED_ACTIVE_CHECKS as readonly string[]).includes(v.type),
  )
  const counts = {
    schematicParity: report.schematicParity.length,
    errorViolations: count("error"),
    warningViolations: count("warning"),
    exclusionViolations: count("exclusion"),
    requiredCheckViolations: requiredCheckViolations.length,
    unconnectedItems: report.unconnectedItems.length,
  }

  const failures: string[] = []
  if (counts.schematicParity > 0) {
    failures.push(`${counts.schematicParity} schematic parity finding(s): the board disagrees with its schematic`)
  }
  if (counts.errorViolations > 0) {
    failures.push(`${counts.errorViolations} DRC violation(s) at error severity`)
  }
  // SEVERITY-INDEPENDENT, and listed after the severity failure so an
  // error-severity one appears in both lines rather than replacing it: the
  // severity count is what the board failed on, and this names why the severity
  // could not have excused it.
  if (requiredCheckViolations.length > 0) {
    const bySeverity = requiredCheckViolations.map((v) => `${v.type} (${v.severity})`).sort()
    failures.push(
      `${requiredCheckViolations.length} violation(s) of a gate-critical check, which fail at ANY severity: ` +
        `${[...new Set(bySeverity)].join(", ")}. items_not_allowed, courtyards_overlap and missing_courtyard are ` +
        "what the hardware-envelope gate is built on, so a warning-severity one of these is the vacuous pass " +
        "REQUIRED_ACTIVE_CHECKS exists to prevent - not a finding to note and route past.",
    )
  }
  if (policy.routed && counts.unconnectedItems > 0) {
    failures.push(`${counts.unconnectedItems} unconnected item(s) on a board declared routed`)
  }

  return {
    pass: failures.length === 0,
    failures,
    counts,
    leftUnrouted: policy.routed ? undefined : counts.unconnectedItems,
  }
}
