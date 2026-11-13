/**
 * The three tolerances a board is held to, applied to a report that
 * `drc-report.ts` has already proven complete.
 *
 * | Class               | Policy                                                          |
 * | ------------------- | --------------------------------------------------------------- |
 * | `schematic_parity`  | zero tolerated at ANY severity: a board that disagrees with its |
 * |                     | schematic is not this board. Parity findings arrive as warnings |
 * |                     | and that is why they are not scoped by severity here.           |
 * | DRC violations      | zero tolerated at error severity; warnings and exclusions are   |
 * |                     | counted and reported, not failed                                |
 * | `unconnected_items` | zero on a routed candidate; COUNTED, not ignored, on an        |
 * |                     | unrouted one, where it measures what the router left undone     |
 */

import type { ParsedReport } from "./drc-report.ts"

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
    readonly unconnectedItems: number
  }
  /** Set only for an unrouted candidate: the connections still undone. */
  readonly leftUnrouted: number | undefined
}

export function verdictOf(report: ParsedReport, policy: DrcPolicy): Verdict {
  const count = (severity: string): number => report.violations.filter((v) => v.severity === severity).length
  const counts = {
    schematicParity: report.schematicParity.length,
    errorViolations: count("error"),
    warningViolations: count("warning"),
    exclusionViolations: count("exclusion"),
    unconnectedItems: report.unconnectedItems.length,
  }

  const failures: string[] = []
  if (counts.schematicParity > 0) {
    failures.push(`${counts.schematicParity} schematic parity finding(s): the board disagrees with its schematic`)
  }
  if (counts.errorViolations > 0) {
    failures.push(`${counts.errorViolations} DRC violation(s) at error severity`)
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
