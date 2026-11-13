/**
 * The fabrication standard's constraint values, and the check that a KiCad
 * project file still carries them.
 *
 * Authority: `docs/standards/pcbway-fab-rules.md`, "Project value" column. If a
 * value there changes, it changes here in the same commit.
 *
 * WHY THIS IS A GATE ON A DRC RESULT. The autorouting engine's `route.py` and
 * `route_planes.py` rewrite a `.kicad_pro` beside their output and relax the
 * DRC floors (printing `FAB FLOOR RELAXED`). A DRC run against that project is
 * clean against whatever minimums the router chose, which silently voids the
 * standard. So a DRC result is only meaningful once the project still equals
 * the standard; a difference is a refusal naming the constraint and its value.
 *
 * ASSUMPTION a later task must honour: the standard names "0.3 mm signal, 0.5
 * mm power" without naming the net classes. They are read here as the classes
 * `Default` (signal) and `Power`. A project that names them otherwise is
 * refused, loudly, rather than guessed at.
 */

import fs from "node:fs"
import { DrcRefusal } from "./drc-refusal.ts"

/** `board.design_settings.rules` keys, in mm. */
export const RULE_MINIMUMS: Readonly<Record<string, number>> = {
  min_track_width: 0.25,
  min_clearance: 0.25,
  min_through_hole_diameter: 0.3,
  min_via_diameter: 0.8,
  min_via_annular_width: 0.2,
  min_hole_to_hole: 0.5,
  min_copper_edge_clearance: 0.5,
  min_text_height: 0.8,
  min_text_thickness: 0.15,
}

/** `net_settings.classes[name]` keys, in mm. */
export const NET_CLASS_VALUES: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  Default: { track_width: 0.3, via_diameter: 0.8, via_drill: 0.4 },
  Power: { track_width: 0.5 },
}

const TOLERANCE = 1e-9

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function child(parent: unknown, key: string): unknown {
  return isRecord(parent) ? parent[key] : undefined
}

function drift(name: string, expected: number, actual: unknown): string | undefined {
  if (typeof actual !== "number") {
    return `${name}: standard ${expected} mm, project has ${actual === undefined ? "no value" : JSON.stringify(actual)}`
  }
  if (Math.abs(actual - expected) < TOLERANCE) return undefined
  return `${name}: standard ${expected} mm, project was set to ${actual} mm`
}

export function verifyFabStandard(projectPath: string): void {
  if (!fs.existsSync(projectPath)) {
    throw new DrcRefusal(
      "project-config",
      `no project file at ${projectPath}. Without it the DRC floors cannot be shown to equal docs/standards/pcbway-fab-rules.md, ` +
        "so a clean result would mean nothing. Create it from that standard.",
    )
  }
  let json: unknown
  try {
    json = JSON.parse(fs.readFileSync(projectPath, "utf8"))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new DrcRefusal("project-config", `${projectPath} is not valid JSON (${reason}).`)
  }

  const problems: string[] = []
  const rules = child(child(child(json, "board"), "design_settings"), "rules")
  for (const [key, expected] of Object.entries(RULE_MINIMUMS)) {
    const found = drift(`board.design_settings.rules.${key}`, expected, child(rules, key))
    if (found !== undefined) problems.push(found)
  }

  const classes = child(child(json, "net_settings"), "classes")
  const classList: readonly unknown[] = Array.isArray(classes) ? classes : []
  for (const [className, values] of Object.entries(NET_CLASS_VALUES)) {
    const found = classList.find((c) => child(c, "name") === className)
    if (found === undefined) {
      problems.push(`net class "${className}": standard requires it, project has none`)
      continue
    }
    for (const [key, expected] of Object.entries(values)) {
      const problem = drift(`net class "${className}" ${key}`, expected, child(found, key))
      if (problem !== undefined) problems.push(problem)
    }
  }

  if (problems.length > 0) {
    throw new DrcRefusal(
      "project-config",
      `${projectPath} no longer equals the fabrication standard (the autorouter rewrites this file and relaxes floors):\n  - ` +
        `${problems.join("\n  - ")}\nA DRC run against these values is clean against the wrong minimums.`,
    )
  }
}
