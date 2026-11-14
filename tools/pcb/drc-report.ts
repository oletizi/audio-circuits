/**
 * Reading a `kicad-cli pcb drc --format json` report, refusing anything that is
 * not demonstrably a complete one.
 *
 * The rule throughout: ABSENT, NULL, A STRING OR AN OBJECT IS NOT AN EMPTY
 * ARRAY. A key that is not an array is a malformed report, and reading it as
 * "zero" is how a check that never ran reports clean.
 *
 * A severity is checked against the closed set `error` / `warning` /
 * `exclusion` HERE, before any policy is applied. The policy is severity-scoped,
 * so a violation carrying a severity this code cannot classify would otherwise
 * be silently treated as not-an-error - a real violation becoming a pass.
 */

import { DrcRefusal } from "./drc-refusal.ts"

export const SEVERITIES = ["error", "warning", "exclusion"] as const
export type Severity = (typeof SEVERITIES)[number]

/**
 * Checks a later task's hardware-envelope gate depends on. A project that sets
 * any of them to "ignore" makes that gate pass vacuously, so each is refused
 * here from the report's own `ignored_checks`.
 *
 * **"IGNORE" IS NOT THE ONLY VACUOUS SETTING, which is why this constant is now
 * read in three places rather than one.** `./drc-policy.ts` fails on
 * `errorViolations` only, so setting any of these three to `warning` produces
 * violations that are COUNTED AND NOT FAILED - the same vacuous pass this list
 * exists to prevent, reached by a setting KiCad presents as "enabled" and which
 * this file's own refusal text used to recommend. The three places, and why each
 * is needed:
 *
 *  - `./drc-policy.ts` fails a violation of any of these types at ANY severity.
 *    That is what makes the gate SOUND, and it is here rather than in a config
 *    check because the report is the authority: a report can come from a run
 *    whose severities disagree with any project file on disk, which is the whole
 *    argument for checking the report in the first place.
 *  - `ignored_checks` below, which catches a check that did not run at all.
 *  - `./fab-standard.ts` requires all three at `error` in the project's
 *    `rule_severities`, which is the only place the severity is knowable BEFORE
 *    a run: an absence of violations cannot tell you what severity they would
 *    have carried. That is fail-fast, not soundness, and it does not replace the
 *    policy check.
 */
export const REQUIRED_ACTIVE_CHECKS = ["items_not_allowed", "courtyards_overlap", "missing_courtyard"] as const

export interface ReportItem {
  readonly description: string
  readonly severity: Severity
  /**
   * KiCad's check key, e.g. `invalid_outline` or `courtyards_overlap`. REQUIRED,
   * for the same reason `severity` is: `./drc-policy.ts` is type-scoped as well
   * as severity-scoped now, so an item whose type this code cannot read would be
   * silently treated as not-one-of-the-gate-critical-checks.
   */
  readonly type: string
}

export interface ParsedReport {
  readonly kicadVersion: string
  readonly schematicParity: readonly ReportItem[]
  readonly violations: readonly ReportItem[]
  readonly unconnectedItems: readonly ReportItem[]
  readonly includedSeverities: readonly string[]
  readonly ignoredChecks: readonly string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSeverity(value: unknown): value is Severity {
  return SEVERITIES.some((s) => s === value)
}

function describe(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "an array"
  return typeof value === "object" ? "an object" : `a ${typeof value}`
}

function arrayField(report: Record<string, unknown>, key: string, where: string): readonly unknown[] {
  if (!(key in report)) {
    throw new DrcRefusal(
      "report-shape",
      `${where} has no "${key}" key. A missing field is not zero: the check that fills it did not report.`,
    )
  }
  const value = report[key]
  if (!Array.isArray(value)) {
    throw new DrcRefusal(
      "report-shape",
      `${where} "${key}" is ${describe(value)}, not an array. A malformed field is not an empty one.`,
    )
  }
  return value
}

/**
 * Items under `schematic_parity`, `violations` and `unconnected_items` must
 * each be a record carrying a recognised severity AND a string type. Both are
 * required of all three so the policy never meets an item it cannot classify on
 * either axis; KiCad 10 writes `type` on every item in all three arrays,
 * measured on the pinned 10.0.5.
 */
function items(report: Record<string, unknown>, key: string, where: string): readonly ReportItem[] {
  return arrayField(report, key, where).map((entry, index): ReportItem => {
    if (!isRecord(entry)) {
      throw new DrcRefusal("report-shape", `${where} "${key}"[${index}] is ${describe(entry)}, not an object.`)
    }
    const severity = entry["severity"]
    if (severity === undefined) {
      throw new DrcRefusal(
        "report-shape",
        `${where} "${key}"[${index}] has no severity. The policy is severity-scoped, so an unclassifiable item cannot be tolerated.`,
      )
    }
    if (!isSeverity(severity)) {
      throw new DrcRefusal(
        "report-shape",
        `${where} "${key}"[${index}] has severity ${JSON.stringify(severity)}, outside ${SEVERITIES.join("/")}. ` +
          "It is refused before the policy is applied, because treating it as not-an-error would pass a real violation.",
      )
    }
    const type = entry["type"]
    if (typeof type !== "string" || type === "") {
      throw new DrcRefusal(
        "report-shape",
        `${where} "${key}"[${index}] has no string "type" (got ${describe(entry["type"])}). The policy is ` +
          "type-scoped as well as severity-scoped - a violation of a gate-critical check fails at any severity - " +
          "so an item whose type cannot be read would be silently treated as not one of them. It is not " +
          `defaulted to "": that would make every item match nothing.`,
      )
    }
    const description = typeof entry["description"] === "string" ? entry["description"] : type
    return { description, severity, type }
  })
}

export function parseReport(text: string, where: string): ParsedReport {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new DrcRefusal("report-unreadable", `${where} is not valid JSON (${reason}). It is not read as zero violations.`)
  }
  if (!isRecord(json)) {
    throw new DrcRefusal("report-shape", `${where} is ${describe(json)}, not a JSON object.`)
  }

  const schematicParity = items(json, "schematic_parity", where)
  const violations = items(json, "violations", where)
  const unconnectedItems = items(json, "unconnected_items", where)

  const includedSeverities = arrayField(json, "included_severities", where).map(String)
  const missing = SEVERITIES.filter((s) => !includedSeverities.includes(s))
  if (missing.length > 0) {
    throw new DrcRefusal(
      "severity-coverage",
      `${where} was produced with included_severities [${includedSeverities.join(", ")}], missing ${missing.join(", ")}. ` +
        "A --severity-error run filters out parity findings, which are warnings; the report itself says what was requested.",
    )
  }

  const ignoredChecks = arrayField(json, "ignored_checks", where).map((entry, index): string => {
    if (!isRecord(entry) || typeof entry["key"] !== "string") {
      throw new DrcRefusal("report-shape", `${where} "ignored_checks"[${index}] has no string "key".`)
    }
    return entry["key"]
  })
  const disabled = REQUIRED_ACTIVE_CHECKS.filter((c) => ignoredChecks.includes(c))
  if (disabled.length > 0) {
    throw new DrcRefusal(
      "ignored-checks",
      // THIS MESSAGE USED TO SAY 'set each of them to "error" or "warning"',
      // which recommended the vacuous setting it exists to prevent: the policy
      // failed on error severity only, so a warning-severity violation of one of
      // these three was counted and not failed - what an ignored check does too.
      // The history is here rather than in the message: a person reading a
      // refusal needs the instruction, not the changelog.
      `${where} ignores ${disabled.join(", ")}. The hardware-envelope gate depends on all of items_not_allowed, ` +
        "courtyards_overlap and missing_courtyard (KiCad ignores missing_courtyard by default). Set each of them to " +
        '"error" - NOT "warning" - under the .kicad_pro\'s board.design_settings.rule_severities. "warning" is ' +
        "refused by ./fab-standard.ts because KiCad presents it as enabled while a warning-severity violation is " +
        "counted rather than failed.",
    )
  }

  const kicadVersion = json["kicad_version"]
  if (typeof kicadVersion !== "string") {
    throw new DrcRefusal("report-shape", `${where} has no string "kicad_version"; the version is load-bearing for leg 2.`)
  }
  return { kicadVersion, schematicParity, violations, unconnectedItems, includedSeverities, ignoredChecks }
}
