/**
 * **WHAT STANDS BETWEEN 5 OF 12 BLOCKS DRAWING AND MORE: every `checkLayout` problem of every
 * declared block that reaches it, classified.**
 *
 *   bun tools/schgen/remeasure-coverage.ts
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan, under controller ruling **R46**.
 *
 * **WHY THIS IS A MODULE AND NOT A SENTENCE IN A REPORT.** R46: the finding that four of the five
 * `checkLayout` refusals are ONE defect *"is the highest-leverage fact in your whole report and it
 * must not be a clause inside a census entry"*, and what it is needed for is an owner-visible scope
 * decision - whether M1 spends a task on draw coverage. **A number somebody remembers from a report
 * is not evidence a decision can be made on**, so the classification is computed here and asserted
 * in `tests/schgen/remeasure.test.ts`.
 *
 * **NOTHING HERE FIXES ANYTHING, AND THAT IS R46's INSTRUCTION, NOT AN OMISSION.** *"I am NOT asking
 * you to fix it, and do not start."* This module measures and classifies; no template, no rule, no
 * clearance check and no field-placement routine is touched by this task.
 *
 * **THE CLASSIFIER IS A WHITELIST THAT THROWS.** A `checkLayout` problem whose text matches no known
 * class refuses rather than being filed under *other*, for the same reason `gateOf` below does: the
 * counts are published as the leverage behind a scope decision, and a problem quietly binned into
 * the wrong class would overstate or understate how many blocks one fix unblocks. A new problem
 * shape in `lib/schgen/render/layout-check.ts` fails here, naming the text it could not place.
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { adaptElkLayoutReported } from "../../lib/schgen/elk/adapt.ts"
import { selectRenderer, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { elkPrePass } from "./elk/layout.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { BlockId } from "../../lib/schgen/ir/types.ts"

/**
 * WHICH GATE OF SPEC §1.4's REALIZATION CONTRACT REFUSED A BLOCK, read off the refusal's own words.
 *
 * **IT IS A WHITELIST THAT THROWS, AND THAT IS THE POINT.** The question *"how many of the seven
 * non-drawing blocks reach `checkLayout` and how many refuse earlier"* is one a reader needs and
 * cannot get from a refusal count, and the honest way to answer it is to recognise each refusal's
 * own sentence. A default arm would silently file a refusal nobody has read under a gate it may not
 * belong to - and this classification is printed in a document, so a wrong one would be published.
 * A new refusal arm in `lib/schgen/elk/adapt.ts` fails here, naming the text it could not place.
 */
export const REFUSAL_GATES: readonly { readonly marker: string; readonly gate: string }[] = [
  { marker: "port coordinate(s) that disagree", gate: "obligation 3: one transform, two readers" },
  { marker: "overlap(s) that are", gate: "clause (d) pre-snap: an ambiguous wire overlap" },
  { marker: "collapsed geometry that was distinct", gate: "obligation 1: the snap collapsed geometry" },
  { marker: "CREATED", gate: "obligations 1 and 5: snapping created an ambiguous overlap" },
  { marker: "the junctions the sheet emitter would place disagree", gate: "obligation 2: a branch point with no junction" },
  { marker: "does not pass the clearance checks", gate: "obligation 4: checkLayout" },
]

export function gateOf(refusal: string): string {
  const found = REFUSAL_GATES.find((r) => refusal.includes(r.marker))
  if (found === undefined) {
    throw new Error(
      `this refusal matches no gate marker, so which stage of spec 1.4's realization contract ` +
        `produced it cannot be reported: ${refusal.slice(0, 200)}. It is NOT filed under a default ` +
        "gate - the classification is published in docs/schematic/m1-remeasurement.md and a wrong " +
        "one would be a published claim about a stage that did not refuse. Add the marker to " +
        `REFUSAL_GATES with the obligation it names. Known markers: ${REFUSAL_GATES.map((r) => r.marker).join(" | ")}.`,
    )
  }
  return found.gate
}

/** The classes of `checkLayout` problem this corpus produces, each with the text that names it. */
export const PROBLEM_CLASSES: readonly { readonly marker: string; readonly problemClass: string }[] = [
  { marker: "no place for its Reference and Value", problemClass: "field-placement" },
  { marker: "overlaps label", problemClass: "body-label-overlap" },
]

export function classOf(problem: string): string {
  const found = PROBLEM_CLASSES.find((p) => problem.includes(p.marker))
  if (found === undefined) {
    throw new Error(
      `this checkLayout problem matches no known class, so it cannot be counted toward how many ` +
        `blocks one fix would unblock: ${problem.slice(0, 200)}. It is NOT filed under "other": the ` +
        "counts this module produces are the leverage behind a scope decision (ruling R46), and a " +
        "problem binned into the wrong class would misstate it. Add the class to PROBLEM_CLASSES. " +
        `Known markers: ${PROBLEM_CLASSES.map((p) => p.marker).join(" | ")}.`,
    )
  }
  return found.problemClass
}

export interface BlockCoverage {
  readonly circuit: string
  readonly block: BlockId
  /** True when the block draws through every gate. */
  readonly draws: boolean
  /** The gate that refused it, or empty where it draws. */
  readonly gate: string
  /** Every `checkLayout` problem's class, in the order `checkLayout` reported them. */
  readonly problemClasses: readonly string[]
  /** The distinct classes, sorted - what a fix would have to address to unblock this block. */
  readonly blockedBy: readonly string[]
}

/**
 * Every declared block, with the problem classes standing between it and a drawing.
 *
 * **A BLOCK REFUSED BEFORE `checkLayout` HAS NO PROBLEM CLASSES AND THAT IS NOT THE SAME AS HAVING
 * NONE.** `oc-audio` and `oc-sidechain` are refused at obligations 1 and 3, so `checkLayout` never
 * runs on them and `problemClasses` is empty - `gate` is what says why. Reading an empty list as
 * *"nothing is wrong with its clearances"* would be wrong: nothing has looked.
 */
export async function coverageCensus(cases: readonly ParityCase[] = PARITY_CASES): Promise<readonly BlockCoverage[]> {
  const symbols = parityResolver()
  const out: BlockCoverage[] = []
  for (const c of cases) {
    const circuit = buildCircuit(circuitSpecFrom(c.network, c.authoring, symbols), { symbols })
    const outcomes = await elkPrePass(circuit, symbols)
    for (const block of circuit.blocks.values()) {
      if (block.rendering.kind === "bus") continue
      const g = subgraphOf(circuit, block.id, symbols)
      if (selectRenderer(g, TEMPLATES).kind !== "elk") continue
      const outcome = outcomes.get(block.id)
      if (outcome === undefined || !outcome.ok) {
        throw new Error(
          `block ${c.name}/${block.id} selects the ELK backend and the pre-pass holds ` +
            `${outcome === undefined ? "no outcome" : "a raise"} for it, so what stands between it ` +
            "and a drawing cannot be measured. It is not skipped: a row missing from this census is " +
            "a block somebody would read as drawing.",
        )
      }
      const report = adaptElkLayoutReported(g, outcome)
      const problemClasses = report.problems.map(classOf)
      out.push({
        circuit: c.name,
        block: block.id,
        draws: report.result.ok,
        gate: report.result.ok ? "" : gateOf(report.result.mismatch.reason),
        problemClasses,
        blockedBy: [...new Set(problemClasses)].sort(),
      })
    }
  }
  return out
}

export interface ClassLeverage {
  readonly problemClass: string
  /** Blocks whose ONLY problem class is this one: fixing it alone makes them draw. */
  readonly soleBlocker: readonly BlockId[]
  /** Blocks this class blocks alongside at least one other class. */
  readonly partialBlocker: readonly BlockId[]
}

/**
 * **PER PROBLEM CLASS, HOW MANY BLOCKS FIXING IT ALONE WOULD UNBLOCK - R46's "leverage".**
 *
 * The split is the whole point and it is not cosmetic. A class that is a block's SOLE blocker is one
 * whose fix makes that block draw; a class that blocks a block alongside another is one whose fix
 * moves nothing by itself. **Reporting only a total would overstate the leverage** of the second
 * kind, which is exactly the shape of claim this entry exists to let somebody check.
 */
export function leverageOf(rows: readonly BlockCoverage[]): readonly ClassLeverage[] {
  const classes = [...new Set(rows.flatMap((r) => r.blockedBy))].sort()
  return classes.map((problemClass) => ({
    problemClass,
    soleBlocker: rows.filter((r) => r.blockedBy.length === 1 && r.blockedBy[0] === problemClass).map((r) => r.block),
    partialBlocker: rows.filter((r) => r.blockedBy.length > 1 && r.blockedBy.includes(problemClass)).map((r) => r.block),
  }))
}

export function renderCoverage(rows: readonly BlockCoverage[]): readonly string[] {
  const draws = rows.filter((r) => r.draws).length
  return [
    ...rows.map((r) =>
      `${r.block} ${r.draws ? "DRAWS" : `refused at ${r.gate}`}` +
      `${r.problemClasses.length === 0 ? "" : ` problems ${r.problemClasses.join(", ")}`}`,
    ),
    `${draws} of ${rows.length} declared blocks draw`,
    ...leverageOf(rows).map((l) =>
      `class ${l.problemClass}: sole blocker of ${l.soleBlocker.length} block(s) ` +
      `(${l.soleBlocker.join(", ") || "none"}), partial blocker of ${l.partialBlocker.length} ` +
      `(${l.partialBlocker.join(", ") || "none"})`,
    ),
  ]
}

if (import.meta.main) {
  for (const line of renderCoverage(await coverageCensus())) console.log(line)
}
