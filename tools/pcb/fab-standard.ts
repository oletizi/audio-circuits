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
 * The net class names `Default` (signal) and `Power` are written in that
 * standard, so this file and the project file read them from one source. A
 * project that names them otherwise is refused.
 *
 * WHAT THIS FILE DOES NOT CHECK, named so it is not mistaken for checked:
 * WHICH NETS are in `Power`. It compares class DEFINITIONS, which is why a
 * project declaring `Power` at 0.5 mm with an empty `netclass_patterns` passed
 * here while no net was in it; `tests/pcb/netclass-patterns.test.ts` holds the
 * assignment, measured through `pcbnew`.
 *
 * AND THE SECOND THING IT DOES NOT CHECK, WHICH MATTERS TO THE NEXT BOARD
 * RATHER THAN TO THIS ONE: a `.kicad_dru`. KiCad takes CUSTOM design rules from
 * a file of that name beside the board, and nothing here reads one - this file
 * compares the `.kicad_pro`'s `rules`, `rule_severities` and net classes and
 * stops there. A custom rule that was deleted, renamed or quietly loosened
 * therefore leaves a DRC run reporting nothing with the constraint unchecked,
 * which is the same shape of failure this file exists to catch in the project.
 *
 * `pt2399-core` DOES carry one - `circuits/pt2399-core/pt2399-core.kicad_dru`,
 * `(constraint courtyard_clearance (min 2mm))`, which is the second of the two
 * mechanisms its `placement-rules.json` `separation.part_to_part` names for the
 * owner's hand-assembly spacing. It is gated by `./courtyard-rule.ts` made a
 * PREREQUISITE of every DRC target in `make/pcb.mk`, so that one board is
 * covered. **A SECOND BOARD GAINING A `.kicad_dru` GETS NO CHECK AT ALL** until
 * someone either adds the same prerequisite for it or generalises the
 * mechanism. That generic mechanism is deliberately NOT built: there is no
 * second board, and a facility with one caller is a guess about the second.
 * This paragraph is here so the limitation is findable from the file a second
 * board's author would read, rather than discovered from a clean DRC result.
 *
 * AND WHAT IT CHECKS THAT THE STANDARD'S TABLE DOES NOT LIST: the three
 * `REQUIRED_ACTIVE_CHECKS` severities, which live in the standard's prose rather
 * than its "Project value" column. See `REQUIRED_CHECK_SEVERITY` below, and
 * `./drc-policy.ts`'s header for the half of that check which makes the gate
 * sound rather than merely fast.
 *
 * EQUALITY IS DELIBERATE. A project stricter than the standard is refused too.
 * That is a loud failure fixed in a minute; the hazard here is the router
 * relaxing a floor silently. Tolerating "better than the standard" would need a
 * per-constraint definition of better, which is more judgment than this needs.
 */

import fs from "node:fs"
import { DrcRefusal } from "./drc-refusal.ts"
import { REQUIRED_ACTIVE_CHECKS } from "./drc-report.ts"

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

/**
 * The severity every `REQUIRED_ACTIVE_CHECKS` check must carry in
 * `board.design_settings.rule_severities`.
 *
 * WHY `error` AND NOT "anything but ignore". `./drc-policy.ts` now fails a
 * violation of one of those three types at any severity, so soundness does not
 * rest on this. What rests on this is FAIL-FAST, and it is the only place the
 * severity can be known AHEAD of a run: an absence of violations cannot tell you
 * what severity they would have carried, so a project set to `warning` reads as
 * clean until the day something actually overlaps. `error` is what
 * `docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`'s
 * Task 8 Step 4 table specifies for both hardware-envelope mechanisms, and what
 * `docs/standards/pcbway-fab-rules.md` means by requiring them enabled. It is
 * not a criterion this file chose.
 */
export const REQUIRED_CHECK_SEVERITY = "error"

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

  // THE THREE GATE-CRITICAL CHECKS, AT error. Checked here because this is the
  // only place their severity is knowable before a run; the soundness half is in
  // ./drc-policy.ts, which fails a violation of one of these types at any
  // severity. See REQUIRED_CHECK_SEVERITY above for why the bar is `error`
  // rather than "not ignore".
  const severities = child(child(child(json, "board"), "design_settings"), "rule_severities")
  for (const check of REQUIRED_ACTIVE_CHECKS) {
    const actual = child(severities, check)
    if (actual === REQUIRED_CHECK_SEVERITY) continue
    problems.push(
      `board.design_settings.rule_severities.${check}: the hardware-envelope gate needs "${REQUIRED_CHECK_SEVERITY}", ` +
        `project has ${actual === undefined ? "no value" : JSON.stringify(actual)}` +
        (actual === "warning"
          ? ' - and "warning" is the setting to be most careful about, because KiCad presents it as enabled while a ' +
            "warning-severity violation is counted rather than failed"
          : ""),
    )
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
