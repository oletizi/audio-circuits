/**
 * The readability gate: thresholds, rail lists, baselines, and the
 * assertion.
 *
 * Design: docs/superpowers/specs/2026-09-21-schematic-readability-testing-design.md
 *
 * NOTE THE IMPORTS. This module knows about Tier 1 and nothing else. The
 * assertion's signature accepts `Tier1Metrics`, so no classification can
 * reach the verdict even by accident. That is R1, enforced by the type
 * system rather than by discipline.
 */

import type { Tier1Metrics } from "./schematic-tier1.ts"

// ---------------------------------------------------------------------------
// The one judgement input: explicit rail nets, per module.
// No suffix matching. A net named FOO_GND that is not listed here COUNTS.
// Under R2 this file may not be edited in the same commit as a circuit.
// ---------------------------------------------------------------------------

export const RAIL_NETS: Readonly<Record<string, readonly string[]>> = {
  "optical-compressor": [
    "CMP_GND",
    "CMP_VBIAS",
    "CMP_VBIAS_RAW",
    "CMP_9V_RAW",
    "CMP_9V_PROT",
  ],
  "opamp-buffer": ["BUF1_GND", "BUF1_VCC", "BUF1_VEE"],
}

// ---------------------------------------------------------------------------
// Global thresholds. Not per module (R4). These describe what a reviewable
// schematic requires, NOT what the code currently produces.
// ---------------------------------------------------------------------------

export interface Thresholds {
  readonly maxNonRailLabels: number
  readonly maxLabelCollisions: number
  readonly maxWireCrossingsPerComponent: number
  readonly maxLongHopFraction: number
  readonly minComponentAreaPerComponent: number
  readonly maxComponentAreaPerComponent: number
  readonly minDrawingAreaPerComponent: number
  readonly maxDrawingAreaPerComponent: number
}

export const THRESHOLDS: Thresholds = {
  // An INITIAL FALSIFIABLE THRESHOLD, not a mandate. See design 7.1: only a
  // human's judgement of the rendered artifact may revise it.
  maxNonRailLabels: 8,
  maxLabelCollisions: 0,
  maxWireCrossingsPerComponent: 0.15,
  maxLongHopFraction: 0.1,
  minComponentAreaPerComponent: 4,
  maxComponentAreaPerComponent: 20,
  minDrawingAreaPerComponent: 6,
  maxDrawingAreaPerComponent: 30,
}

// ---------------------------------------------------------------------------
// Baselines: a RECORD of what the artifact achieved, never a chosen budget.
//
// Lifecycle (design 10.1a):
//   A. artifact commit improves 38 -> 31; baseline still 38; passes; STALE
//   B. ruler commit records baseline = 31 exactly (not 35, not 25)
//   C. next artifact work must not exceed 31
// ---------------------------------------------------------------------------

export interface Baseline {
  readonly nonRailLabels: number
  readonly labelCollisions: number
  readonly wireCrossings: number
  readonly longHopFraction: number
  readonly componentAreaPerComponent: number
  readonly drawingAreaPerComponent: number
}

export const BASELINES: Readonly<Record<string, Baseline>> = {
  // Measured, not chosen. See the commit that introduced these numbers.
  "optical-compressor": {
    nonRailLabels: 38,
    labelCollisions: 8,
    wireCrossings: 2,
    longHopFraction: 0.233,
    componentAreaPerComponent: 24.2,
    drawingAreaPerComponent: 25.2,
  },
  "opamp-buffer": {
    nonRailLabels: 7,
    labelCollisions: 1,
    wireCrossings: 0,
    longHopFraction: 0.267,
    componentAreaPerComponent: 31.9,
    drawingAreaPerComponent: 35.8,
  },
}

export interface Finding {
  readonly metric: string
  readonly actual: number
  readonly limit: number
  readonly kind: "regression" | "stale-baseline" | "below-threshold"
}

const LOWER_IS_BETTER = [
  "nonRailLabels",
  "labelCollisions",
  "wireCrossings",
  "longHopFraction",
] as const

/** Regressions against the recorded baseline. These FAIL. */
export function checkBaseline(module: string, m: Tier1Metrics): Finding[] {
  const b = BASELINES[module]
  if (!b) {
    throw new Error(
      `No baseline for "${module}". Add one to BASELINES in ` +
        `lib/testing/schematic-gate.ts, recording the MEASURED value.`,
    )
  }
  const out: Finding[] = []
  const at = (metric: string, actual: number, limit: number) => {
    if (actual > limit + 1e-9) {
      out.push({ metric, actual, limit, kind: "regression" })
    }
  }
  at("nonRailLabels", m.nonRailLabels, b.nonRailLabels)
  at("labelCollisions", m.labelCollisions, b.labelCollisions)
  at("wireCrossings", m.wireCrossings, b.wireCrossings)
  at("longHopFraction", m.longHopFraction, b.longHopFraction)
  return out
}

/**
 * Baselines that are looser than the measured artifact. Not a failure of
 * the artifact - a failure to RECORD an improvement, which silently
 * restores regression headroom (design 10.1a).
 */
export function checkStaleBaseline(
  module: string,
  m: Tier1Metrics,
): Finding[] {
  const b = BASELINES[module]
  if (!b) return []
  const out: Finding[] = []
  const at = (metric: string, actual: number, recorded: number) => {
    if (actual < recorded - 1e-9) {
      out.push({ metric, actual, limit: recorded, kind: "stale-baseline" })
    }
  }
  for (const k of LOWER_IS_BETTER) at(k, m[k], b[k])
  return out
}

/** Distance to the global threshold. Reported, not enforced, until met. */
export function checkThresholds(
  m: Tier1Metrics,
  t: Thresholds = THRESHOLDS,
): Finding[] {
  const out: Finding[] = []
  const at = (metric: string, actual: number, limit: number) => {
    if (actual > limit + 1e-9) {
      out.push({ metric, actual, limit, kind: "below-threshold" })
    }
  }
  at("nonRailLabels", m.nonRailLabels, t.maxNonRailLabels)
  at("labelCollisions", m.labelCollisions, t.maxLabelCollisions)
  at(
    "wireCrossings",
    m.wireCrossings,
    t.maxWireCrossingsPerComponent * m.components,
  )
  at("longHopFraction", m.longHopFraction, t.maxLongHopFraction)
  at(
    "componentAreaPerComponent",
    m.componentAreaPerComponent,
    t.maxComponentAreaPerComponent,
  )
  at(
    "drawingAreaPerComponent",
    m.drawingAreaPerComponent,
    t.maxDrawingAreaPerComponent,
  )
  return out
}

export function formatFindings(fs: readonly Finding[]): string {
  return fs
    .map(
      (f) =>
        `  ${f.kind.toUpperCase().padEnd(16)} ${f.metric} = ` +
        `${f.actual.toFixed(3)} (limit ${f.limit.toFixed(3)})`,
    )
    .join("\n")
}

/**
 * THE gate. Call from a module's test file.
 *
 * Takes Tier1Metrics and nothing else — a diagnostic classification cannot
 * be passed in, so it cannot influence the verdict (R1).
 */
export function assertReadabilityGate(
  module: string,
  m: Tier1Metrics,
): void {
  const regressions = checkBaseline(module, m)
  if (regressions.length > 0) {
    throw new Error(
      `Schematic readability REGRESSED for "${module}":\n` +
        `${formatFindings(regressions)}\n\n` +
        `Baselines record what the artifact achieved. Fix the schematic; ` +
        `do not raise a baseline. See docs/superpowers/specs/` +
        `2026-09-21-schematic-readability-testing-design.md 10.1a.`,
    )
  }
}

/** Report text: baseline status, staleness, and distance to threshold. */
export function gateReport(module: string, m: Tier1Metrics): string {
  const lines: string[] = []
  const stale = checkStaleBaseline(module, m)
  if (stale.length > 0) {
    lines.push(
      "BASELINE STALE — an improvement has not been recorded. Update",
      "BASELINES in a RULER-ONLY commit to exactly these measured values:",
      formatFindings(stale),
    )
  }
  const gap = checkThresholds(m)
  lines.push(
    gap.length === 0
      ? "meets THRESHOLDS in full — this module's baseline can be retired"
      : `below THRESHOLDS on:\n${formatFindings(gap)}`,
  )
  return lines.join("\n")
}
