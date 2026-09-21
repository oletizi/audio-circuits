/**
 * Project schematic readability standard, and the ratchet that enforces it.
 *
 * See docs/SCHEMATIC-STANDARDS.md for the rationale. In short: a human is
 * required to review every schematic and to do PCB layout, so readability is
 * a functional requirement and gets measured like one.
 *
 * No module meets the standard yet. Until one does, the check enforces a
 * per-module CEILING that may only move downward — metrics can improve
 * freely, regressions fail. The ratchet turns one way.
 */

import type { SchematicMetrics } from "./schematic-metrics.ts"

export interface SchematicStandard {
  readonly maxLabelCollisions: number
  /** Labels nobody chose. Zero: every label must be rail, long-span, forced, or declared. */
  readonly maxGratuitousLabels: number
  readonly maxSignalLabelRatio: number
  /** Budget is this fraction of the component count. */
  readonly maxWireCrossingsPerComponent: number
  readonly minAreaPerComponent: number
  readonly maxAreaPerComponent: number
  readonly maxLabelsOnOneSignalNet: number
  /**
   * Connections longer than SHORT_SPAN_UNITS degrade into labels. This
   * bounds PLACEMENT, which is the root cause the other metrics only see
   * the symptoms of.
   */
  readonly maxLongHopFraction: number
  readonly maxMedianHop: number
}

/** What a reviewable schematic requires. The target, not a description. */
export const SCHEMATIC_STANDARD: SchematicStandard = {
  maxLabelCollisions: 0,
  maxGratuitousLabels: 0,
  maxSignalLabelRatio: 0.45,
  maxWireCrossingsPerComponent: 0.15,
  minAreaPerComponent: 6,
  maxAreaPerComponent: 30,
  maxLabelsOnOneSignalNet: 3,
  maxLongHopFraction: 0.1,
  maxMedianHop: 5,
}

export interface Ceiling {
  readonly labelCollisions: number
  readonly gratuitousLabels: number
  readonly signalLabelRatio: number
  readonly wireCrossings: number
  readonly areaPerComponent: number
}

/**
 * Recorded ceilings. LOWER THESE when a module improves — in the same commit
 * that improves it. Never raise one to make a build pass; that is the whole
 * thing this file exists to prevent.
 */
export const RATCHET: Readonly<Record<string, Ceiling>> = {
  "optical-compressor": {
    gratuitousLabels: 11,
    labelCollisions: 8,
    signalLabelRatio: 0.52,
    wireCrossings: 2,
    areaPerComponent: 24,
  },
  "opamp-buffer": {
    gratuitousLabels: 6,
    labelCollisions: 1,
    signalLabelRatio: 0.64,
    wireCrossings: 0,
    areaPerComponent: 33,
  },
}

/**
 * Labels the author has decided are the right call, with the reason. This
 * is the escape hatch from `gratuitous`: not a budget, a recorded argument
 * someone can disagree with in review.
 *
 * Keyed by module, then by label text.
 */
export const DECLARED_LABELS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "optical-compressor": {
    CMP_BASE:
      "Three-terminal junction at Q_LED. MEASURED: wiring it pin-to-pin " +
      "produces one auto-label naming every member " +
      "(CMP_R_B_pin2/CMP_R_B_PD_pin1/CMP_Q_LED_pin3, ~43 chars) which is " +
      "far wider than three short labels, and it collided with the " +
      "collector node's equivalent -- label collisions went 8 -> 9. The " +
      "labels anchor at Q_LED's own pins, so spacing other components " +
      "cannot separate them. A short named net is the better trade here.",
    CMP_COLL:
      "Three-terminal junction at Q_LED, same measured trade as CMP_BASE: " +
      "pin-to-pin yields CMP_Q_LED_pin1/CMP_R_SENSE_pin2/CMP_TP_SENSE_LO_TP " +
      "(~50 chars), which collides with the base node's auto-label.",
  },
}

export interface Violation {
  readonly metric: string
  readonly actual: number
  readonly limit: number
  readonly kind: "ratchet" | "standard"
}

/** Regressions against the recorded ceiling. These FAIL a build. */
export function checkRatchet(
  moduleName: string,
  m: SchematicMetrics,
): Violation[] {
  const c = RATCHET[moduleName]
  if (!c) {
    throw new Error(
      `No ratchet entry for "${moduleName}". Add one to RATCHET in ` +
        `lib/testing/schematic-standards.ts, or delete the entry only when ` +
        `the module meets SCHEMATIC_STANDARD outright.`,
    )
  }
  const v: Violation[] = []
  const at = (metric: string, actual: number, limit: number) => {
    if (actual > limit) v.push({ metric, actual, limit, kind: "ratchet" })
  }
  at("gratuitousLabels", m.gratuitousLabels, c.gratuitousLabels)
  at("labelCollisions", m.labelCollisions.length, c.labelCollisions)
  at("signalLabelRatio", m.signalLabelRatio, c.signalLabelRatio)
  at("wireCrossings", m.wireCrossings, c.wireCrossings)
  at("areaPerComponent", m.areaPerComponent, c.areaPerComponent)
  return v
}

/** Distance from the actual standard. Reported, not enforced, until met. */
export function checkStandard(
  m: SchematicMetrics,
  railSuffixCheck: (text: string) => boolean,
  s: SchematicStandard = SCHEMATIC_STANDARD,
): Violation[] {
  const v: Violation[] = []
  const at = (metric: string, actual: number, limit: number) => {
    if (actual > limit) v.push({ metric, actual, limit, kind: "standard" })
  }
  at("gratuitousLabels", m.gratuitousLabels, s.maxGratuitousLabels)
  at("labelCollisions", m.labelCollisions.length, s.maxLabelCollisions)
  at("signalLabelRatio", m.signalLabelRatio, s.maxSignalLabelRatio)
  at(
    "wireCrossings",
    m.wireCrossings,
    s.maxWireCrossingsPerComponent * m.components,
  )
  at("areaPerComponent", m.areaPerComponent, s.maxAreaPerComponent)
  if (m.areaPerComponent < s.minAreaPerComponent) {
    v.push({
      metric: "areaPerComponent (too cramped)",
      actual: m.areaPerComponent,
      limit: s.minAreaPerComponent,
      kind: "standard",
    })
  }
  const worstSignalNet = m.labelsByNet.find((n) => !railSuffixCheck(n.text))
  if (worstSignalNet) {
    at(
      `labelsOnOneSignalNet (${worstSignalNet.text})`,
      worstSignalNet.count,
      s.maxLabelsOnOneSignalNet,
    )
  }
  return v
}

export function formatViolations(vs: readonly Violation[]): string {
  return vs
    .map(
      (v) =>
        `  ${v.kind === "ratchet" ? "REGRESSION" : "below standard"}: ` +
        `${v.metric} = ${v.actual.toFixed(3)} (limit ${v.limit.toFixed(3)})`,
    )
    .join("\n")
}

/**
 * THE assertion to call from a module's test file, alongside its
 * connectivity assertions. Readability is a functional requirement here
 * (a human must review the schematic and lay out the board), so it is
 * asserted in the same place and with the same force as wiring.
 *
 * Enforcement is split honestly:
 *   - Metrics the module ALREADY meets are asserted against
 *     SCHEMATIC_STANDARD, so they can never fall below it again.
 *   - Metrics it does NOT yet meet are asserted against its recorded
 *     ceiling in RATCHET, so they can only improve.
 *
 * Throws with the full metric dump on any violation.
 */
export function assertSchematicReadable(
  moduleName: string,
  m: SchematicMetrics,
  isRail: (text: string) => boolean,
  format: (m: SchematicMetrics) => string,
): void {
  const regressions = checkRatchet(moduleName, m)
  const gap = checkStandard(m, isRail)

  // A metric absent from `gap` is one the module currently meets; hold it
  // to the standard permanently rather than to a looser ceiling.
  const gapMetrics = new Set(gap.map((v) => v.metric))
  const locked = (
    ["gratuitousLabels", "labelCollisions", "wireCrossings"] as const
  ).filter((k) => !gapMetrics.has(k))

  const problems = [...regressions]
  for (const v of gap) {
    // Only enforce standard violations that the ratchet does not already
    // cover -- otherwise a module below standard could never pass.
    if (!RATCHET[moduleName]) problems.push(v)
  }

  if (problems.length > 0) {
    throw new Error(
      `Schematic readability failed for "${moduleName}":\n` +
        `${formatViolations(problems)}\n\n` +
        `Metrics currently held to the full standard: ${locked.join(", ") || "(none)"}\n\n` +
        `${format(m)}\n\n` +
        `See docs/SCHEMATIC-STANDARDS.md. Never raise a RATCHET ceiling to ` +
        `make this pass -- fix the schematic, or lower the ceiling if you ` +
        `improved it.`,
    )
  }
}

/** Distance to the standard, for reporting in test output. */
export function remainingGap(
  m: SchematicMetrics,
  isRail: (text: string) => boolean,
): string {
  const gap = checkStandard(m, isRail)
  return gap.length === 0
    ? "meets SCHEMATIC_STANDARD in full"
    : `below SCHEMATIC_STANDARD on:\n${formatViolations(gap)}`
}
