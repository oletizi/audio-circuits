/**
 * TASK 13 STEP 6: THE OBSTACLE MATRIX RUN AGAINST ELK GEOMETRY, WHICH IS THE SECOND GEOMETRY SOURCE
 * SPEC §1.4 SAYS THE CLEARANCE CHECKS MUST BE RE-VALIDATED AGAINST.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan.
 *
 * **WHY THIS EXISTS AND WHAT IT IS EVIDENCE OF.** `docs/known-gaps.md` **G125** records that **95
 * of the obstacle matrix's 105 cells rest on reading the ported source rather than on a test that
 * could have failed**, and only 4 are backed by a test that places the pair's two categories as real
 * geometry. Spec §1.4's re-validation clause says why that matters here: the ~160 clearance refusals
 * *"were grown against template-produced geometry"*, accreting one pair at a time, *"and pointing a
 * pairwise-accreted check set at a new geometry source is exactly the condition that creates a fresh
 * blind spot."* **Every pair that fires on ELK geometry is the first evidence that cell has ever
 * had**, so the firing set is reported whole - and an EMPTY set is reported as a result too, which
 * `CLAUDE.md` names as a category of finding in its own right.
 *
 * **IT CLASSIFIES AN OBSTACLE NAME AND REFUSES ONE IT CANNOT.** `checkLayout` reports problems as
 * prose and `problem-obstacles.ts` recovers the two obstacle NAMES; turning a name into one of the
 * matrix's 14 CATEGORIES is this module's job, and it is done from the producers' own `what`
 * formats, read out of the code that writes them. **A name no rule here recognises stops the census
 * naming it**, because a census that silently dropped the names it could not classify would report
 * a smaller firing set than it measured - which is the shape of the defect G125 is about.
 */

import { adaptElkLayoutReported } from "../../../lib/schgen/elk/adapt.ts"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { layoutBlocks } from "./layout.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import { circuitSpecFrom } from "../../../lib/schgen/from-network.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { OBSTACLE_CATEGORIES, PAIR_COVERAGE, type ObstacleCategory } from "../../../lib/schgen/render/obstacle-matrix.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "../authoring-census.ts"
import type { BlockId } from "../../../lib/schgen/ir/types.ts"
import type { ProblemObstacles } from "../../../lib/schgen/render/problem-obstacles.ts"

/**
 * How an obstacle NAME is read as one of the matrix's categories, each pattern transcribed from the
 * code that writes the name rather than recalled.
 *
 * The citations matter as much as the patterns: a pattern whose producer does not write that shape
 * is a classification that can never fire, which is the `NOT_IN_THIS_TREE` failure **G132** records.
 */
interface NameRule {
  readonly form: RegExp
  readonly category: ObstacleCategory
  /** The function and module that writes this name. */
  readonly writtenBy: string
}

const NAME_RULES: readonly NameRule[] = [
  { form: /^wire \d+ of /, category: "wire", writtenBy: "layoutItems (render/layout-check.ts)" },
  { form: /^anchor \S+ \d+$/, category: "label-outline", writtenBy: "layoutItems (render/layout-check.ts), the anchor list" },
  { form: /^body of /, category: "body", writtenBy: "sceneClearanceProblems (render/body-clearance.ts)" },
  { form: /^bodies of /, category: "body", writtenBy: "overlapProblems (render/layout-check.ts)" },
  { form: /^glyph of power symbol /, category: "power-glyph", writtenBy: "glyphPair (render/glyph-clearance.ts)" },
  { form: /^value of power symbol /, category: "field-text", writtenBy: "textProblems (render/text-scene.ts), the power-value list" },
  { form: /^label /, category: "label-outline", writtenBy: "textProblems (render/text-scene.ts), the label list" },
  { form: /^(Reference|Value) /, category: "field-text", writtenBy: "textProblems (render/text-scene.ts), the field list" },
  { form: /^sheet text /, category: "field-text", writtenBy: "textProblems (render/text-scene.ts), the sheet-note list" },
  { form: /^frame /, category: "frame-border", writtenBy: "textProblems (render/text-scene.ts), the frame loop" },
  { form: /^no-connect /, category: "no-connect-marker", writtenBy: "unitText (render/unit-text.ts), the decorations list" },
  { form: /^DNP cross /, category: "dnp-cross", writtenBy: "textProblems (render/text-scene.ts), the DNP-cross loop" },
  { form: /^pin name /, category: "pin-name", writtenBy: "unitText (render/unit-text.ts), nameBoxes" },
  { form: /^pin number /, category: "pin-number", writtenBy: "unitText (render/unit-text.ts), decorations" },
  { form: /^pin end \S+\.\S+/, category: "pin-line", writtenBy: "layoutItems (render/layout-check.ts), the pin list" },
  { form: /^junction /, category: "junction", writtenBy: "junctionPoints (render/connectivity.ts)" },
  /**
   * **THIS CITATION SAID "strokes and interiorBoxes" AND THE STROKES ARE NOT IN THIS FORM**, which
   * is the `NOT_IN_THIS_TREE` failure **G132** names, found by a name this census could not read
   * (`docs/known-gaps.md` **G296**). `unitText` writes `interior text ${i} of ${key}` for
   * `graphics.blocks` and `graphic ${i} of ${key}` for `graphics.segments`, so `^interior ` only
   * ever reached the BOXES. The citation is corrected and the strokes get their own rule below.
   */
  { form: /^interior /, category: "interior-graphic", writtenBy: "unitText (render/unit-text.ts), interiorBoxes via graphics.blocks" },
  /**
   * `unitText`'s `strokes`, measured for the first time on 2026-10-26: `oc-power`'s
   * `+9V_PROTECTED` value text lands on `graphic 0 of C1#1` and three more like it. Same category
   * as the interior boxes above - both are the unit's drawn interior graphics - and a separate
   * rule because the two producers write two forms.
   */
  { form: /^graphic \d+ of /, category: "interior-graphic", writtenBy: "unitText (render/unit-text.ts), strokes via graphics.segments" },
  /**
   * `unitText`'s `pins` segment list, also first measured on 2026-10-26: `tp-leg-upper`'s `VCC`
   * value text lands on `pin R1.1`. It is NOT `^pin end \S+\.\S+` - that is `layoutItems`' own pin
   * list in `render/layout-check.ts` - and it is not the bare `<PART>.<PIN>` rule below, which has
   * no `pin ` prefix. The category is `pin-line` either way: all three name a pin's drawn stroke.
   */
  { form: /^pin [A-Za-z0-9_]+\.[A-Za-z0-9_]+$/, category: "pin-line", writtenBy: "unitText (render/unit-text.ts), the pins list" },
  // Bare `<PART>.<PIN>`, which `layoutItems` writes for a pin and several relations print unprefixed.
  { form: /^[A-Za-z0-9_]+\.[A-Za-z0-9_]+( at \(|$)/, category: "pin-line", writtenBy: "layoutItems (render/layout-check.ts), the pin list" },
]

export interface Unclassified {
  readonly name: string
  readonly problem: string
  readonly block: BlockId
}

/** `name`'s category, or `null` when no transcribed rule reads it. */
export function categoryOf(name: string): ObstacleCategory | null {
  for (const rule of NAME_RULES) if (rule.form.test(name)) return rule.category
  return null
}

const pairKey = (a: ObstacleCategory, b: ObstacleCategory): string => [a, b].sort().join("|")

export interface FiredPair {
  readonly key: string
  readonly constraint: string
  readonly blocks: readonly BlockId[]
  readonly example: readonly [string, string]
  /** Whether the matrix records a check for this cell, a reason, or nothing at all. */
  readonly coverage: "checked" | "reason-only" | "absent"
}

export interface Census {
  readonly blocks: number
  readonly drawn: number
  readonly refusedBefore: readonly { readonly block: BlockId; readonly at: string }[]
  readonly reachedClearance: readonly BlockId[]
  readonly fired: readonly FiredPair[]
  readonly unclassified: readonly Unclassified[]
  /** Per block, what canonicalisation removed - the G106 measurement on this driver. */
  readonly counts: readonly { readonly block: BlockId; readonly collapsed: number; readonly zeroLength: number; readonly contained: number; readonly split: number; readonly before: number; readonly after: number }[]
  /** `checkLayout` problems that name no pair at all, which are not clearance findings. */
  readonly nonPairProblems: readonly { readonly block: BlockId; readonly problem: string }[]
}

function coverageOf(key: string): FiredPair["coverage"] {
  const cell = PAIR_COVERAGE.find((p) => pairKey(p.a, p.b) === key)
  if (cell === undefined) return "absent"
  return cell.checkedBy === null ? "reason-only" : "checked"
}

/**
 * Where `adaptElkLayoutReported` stopped, as one word, so the census can say how many blocks never
 * reached the clearance checks at all - which is the difference between "no pair fired" and "the
 * pairs were never asked".
 */
function stoppedAt(reason: string): string {
  if (reason.includes("snapping the ELK route")) return "snap (obligation 1)"
  if (reason.includes("CREATED")) return "snap created an ambiguous overlap"
  if (reason.includes("neither an exact duplicate")) return "canonical topology (clause d)"
  if (reason.includes("port coordinate")) return "port coordinates (obligation 3)"
  if (reason.includes("junctions the sheet emitter")) return "junctions (obligation 2)"
  if (reason.includes("clearance checks")) return "clearance (obligation 4)"
  return "unclassified refusal"
}

/** Every declared block of every parity case, adapted, with every obstacle pair that fired. */
export async function obstacleCensus(cases: readonly ParityCase[] = PARITY_CASES): Promise<Census> {
  const symbols = parityResolver()
  const fired = new Map<string, { constraint: string; blocks: BlockId[]; example: readonly [string, string] }>()
  const unclassified: Unclassified[] = []
  const refusedBefore: { block: BlockId; at: string }[] = []
  const reachedClearance: BlockId[] = []
  const counts: { block: BlockId; collapsed: number; zeroLength: number; contained: number; split: number; before: number; after: number }[] = []
  const nonPairProblems: { block: BlockId; problem: string }[] = []
  let blocks = 0
  let drawn = 0

  for (const c of cases) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    for (const declaration of c.authoring.blocks) {
      blocks += 1
      const g = subgraphOf(circuit, declaration.id, symbols)
      const input = elkInputOf(g)
      const outcome = (await layoutBlocks([input])).get(input.blockId)
      if (outcome === undefined) throw new Error(`layoutBlocks returned no outcome for ${declaration.id}`)
      const id: BlockId = `${c.name}/${declaration.id}`
      const report = adaptElkLayoutReported(g, outcome)
      if (report.counts !== null) {
        counts.push({
          block: id,
          collapsed: report.counts.collapsed,
          zeroLength: report.counts.zeroLength,
          contained: report.counts.contained,
          split: report.counts.split,
          before: report.counts.wiresBefore,
          after: report.counts.wiresAfter,
        })
      }
      if (report.result.ok) drawn += 1
      if (report.problems.length > 0) reachedClearance.push(id)
      else if (!report.result.ok) refusedBefore.push({ block: id, at: stoppedAt(report.result.mismatch.reason) })

      for (const problem of report.problems) {
        if (report.pairs.some((p) => problem.includes(p.obstacles[0]))) continue
        nonPairProblems.push({ block: id, problem })
      }
      for (const pair of report.pairs) record(pair, id, fired, unclassified, report.problems)
    }
  }

  return {
    blocks,
    drawn,
    refusedBefore,
    reachedClearance,
    counts,
    nonPairProblems,
    unclassified,
    fired: [...fired.entries()]
      .map(([key, v]) => ({ key, constraint: v.constraint, blocks: [...new Set(v.blocks)].sort(), example: v.example, coverage: coverageOf(key) }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  }
}

function record(
  pair: ProblemObstacles,
  block: BlockId,
  fired: Map<string, { constraint: string; blocks: BlockId[]; example: readonly [string, string] }>,
  unclassified: Unclassified[],
  problems: readonly string[],
): void {
  const a = categoryOf(pair.obstacles[0])
  const b = categoryOf(pair.obstacles[1])
  if (a === null || b === null) {
    for (const [i, name] of [pair.obstacles[0], pair.obstacles[1]].entries()) {
      if (categoryOf(name) !== null) continue
      unclassified.push({
        name,
        problem: problems.find((p) => p.includes(name)) ?? `(obstacle ${i} of a ${pair.constraint} problem)`,
        block,
      })
    }
    return
  }
  const key = pairKey(a, b)
  const prior = fired.get(key)
  if (prior === undefined) fired.set(key, { constraint: pair.constraint, blocks: [block], example: pair.obstacles })
  else prior.blocks.push(block)
}

/** Every category the matrix knows, for a report that says which never appeared. */
export const ALL_CATEGORIES: readonly ObstacleCategory[] = OBSTACLE_CATEGORIES
