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
 * any of them to "ignore" makes that gate pass vacuously, so each is refused.
 */
export const REQUIRED_ACTIVE_CHECKS = ["items_not_allowed", "courtyards_overlap", "missing_courtyard"] as const

export interface ReportItem {
  readonly description: string
  readonly severity: Severity
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
 * each be a record carrying a recognised severity. The severity is required of
 * all three so the policy never meets an item it cannot classify.
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
    const description = typeof entry["description"] === "string" ? entry["description"] : String(entry["type"] ?? "")
    return { description, severity }
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
      `${where} ignores ${disabled.join(", ")}. The hardware-envelope gate depends on all of items_not_allowed, ` +
        "courtyards_overlap and missing_courtyard (KiCad ignores missing_courtyard by default). Set each of them to " +
        '"error" or "warning" under the .kicad_pro\'s board.design_settings.rule_severities.',
    )
  }

  const kicadVersion = typeof json["kicad_version"] === "string" ? json["kicad_version"] : "unreported"
  return { kicadVersion, schematicParity, violations, unconnectedItems, includedSeverities, ignoredChecks }
}
