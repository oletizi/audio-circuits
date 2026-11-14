/**
 * THE CLEARANCE THE FILL WAS ACTUALLY CUT AT, read off the project beside the
 * board, so the continuity loop clears the IC's own pad voids on every board and
 * not only on one whose zone declares the largest clearance.
 *
 * **WHY THE ZONE'S OWN CLEARANCE IS NOT ENOUGH.** KiCad cuts a pour away from
 * foreign copper by the LARGEST clearance that applies to the pair: the zone's own
 * `(connect_pads (clearance ...))`, the netclass clearances in the `.kicad_pro`,
 * the project's `min_clearance`, and any `(constraint clearance ...)` in the
 * `.kicad_dru`. Task 9's continuity figure first read 0.593 on an unbroken pour
 * because its loop sat inside the IC's own pad voids; placing the loop from the
 * zone's clearance alone would bring that back on any board whose netclass
 * clearance exceeds the zone's, with a deficit that is the footprint's and not the
 * pour's. So the loop is placed from the LARGEST of all of them.
 *
 * The largest, not the one that applies to a particular pair of nets: which
 * netclass governs which pad is a lookup through netclass assignments and
 * patterns that is not written here. Taking the maximum over everything can only
 * move the loop further out, which is the safe side of this figure - a loop too
 * far out reads a neighbouring part's voids, a loop too near reads the IC's own.
 *
 * What it will NOT do is guess: a project file that is missing, is not JSON, or
 * names no clearance at all gives an `unavailable` reading with the reason, and
 * the continuity figure is unavailable with it. A `.kicad_dru` clearance in a
 * unit other than mm or mil is the same. It is not defaulted to the zone's.
 */
import fs from "node:fs"
import { measured, unavailable } from "./pour-types.ts"
import type { Reading } from "./pour-types.ts"

export interface ProjectClearance {
  /** The largest clearance of any source, in mm. */
  readonly maxMm: number
  /** Every clearance found and where, so a reader can see what set the maximum. */
  readonly sources: readonly { readonly source: string; readonly mm: number }[]
}

const UNITS: Readonly<Record<string, number>> = { "": 1, mm: 1, mil: 0.0254 }

function projectJsonClearances(text: string, path: string): Reading<readonly { source: string; mm: number }[]> {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    return unavailable(`${path} is not valid JSON (${error instanceof Error ? error.message : String(error)}).`)
  }
  const out: { source: string; mm: number }[] = []
  const board = isRecord(json) ? json["board"] : undefined
  const designSettings = isRecord(board) ? board["design_settings"] : undefined
  const rules = isRecord(designSettings) ? designSettings["rules"] : undefined
  const minClearance = isRecord(rules) ? rules["min_clearance"] : undefined
  if (typeof minClearance === "number") out.push({ source: `${path} board.design_settings.rules.min_clearance`, mm: minClearance })
  const netSettings = isRecord(json) ? json["net_settings"] : undefined
  const classes = isRecord(netSettings) ? netSettings["classes"] : undefined
  if (Array.isArray(classes)) {
    for (const cls of classes) {
      if (isRecord(cls) && typeof cls["clearance"] === "number") {
        out.push({ source: `${path} netclass ${String(cls["name"] ?? "?")}`, mm: cls["clearance"] })
      }
    }
  }
  return measured(out)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function ruleClearances(text: string, path: string): Reading<readonly { source: string; mm: number }[]> {
  const out: { source: string; mm: number }[] = []
  for (const match of text.matchAll(/\(constraint\s+clearance\s*\(min\s+([0-9.]+)\s*([a-z]*)\s*\)/g)) {
    const factor = UNITS[match[2] ?? ""]
    if (factor === undefined) {
      return unavailable(`${path} states a clearance in "${match[2] ?? ""}", and only mm and mil are read; it is not guessed.`)
    }
    out.push({ source: `${path} (constraint clearance)`, mm: Number(match[1]) * factor })
  }
  return measured(out)
}

/** The project's clearances for the board at `boardPath`, from the `.kicad_pro` (required) and `.kicad_dru` (if present) beside it. */
export function readProjectClearance(boardPath: string): Reading<ProjectClearance> {
  const base = boardPath.replace(/\.kicad_pcb$/, "")
  const project = `${base}.kicad_pro`
  if (!fs.existsSync(project)) {
    return unavailable(
      `there is no ${project} beside the board, and the loop round the IC is placed from the clearances in it: ` +
        "without them it could sit inside the IC's own pad voids and read them as breaks in the pour. It is not defaulted.",
    )
  }
  const found = projectJsonClearances(fs.readFileSync(project, "utf8"), project)
  if (found.kind === "unavailable") return found
  const sources = [...found.value]
  const rules = `${base}.kicad_dru`
  if (fs.existsSync(rules)) {
    const fromRules = ruleClearances(fs.readFileSync(rules, "utf8"), rules)
    if (fromRules.kind === "unavailable") return fromRules
    sources.push(...fromRules.value)
  }
  if (sources.length === 0) {
    return unavailable(`${project} names no netclass clearance and no min_clearance, so there is no project clearance to place the loop from.`)
  }
  return measured({ maxMm: Math.max(...sources.map((s) => s.mm)), sources })
}
