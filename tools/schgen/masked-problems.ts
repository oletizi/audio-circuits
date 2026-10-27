/**
 * **WHAT EVERY DECLARED BLOCK'S REFUSAL IS HIDING BEHIND IT: the problems `checkLayout` never
 * reported, the ones nobody can measure, and which blocks are genuinely ONE fix from drawing.**
 *
 *   bun tools/schgen/masked-problems.ts
 *
 * Hand-written for Task 22 of the M1 schematic-authoring plan.
 *
 * **THIS IS A DIAGNOSTIC. IT REPORTS AND IT NEVER DECIDES.** No gate calls it, no template calls
 * it, nothing refuses because of it, and it may not be read as one: every line it prints is a
 * measurement over geometry the production pipeline produced, and the production pipeline's
 * verdict on that geometry is `lib/schgen/elk/adapt.ts`'s, unchanged by this file's existence.
 *
 * **WHY IT IS A SEPARATE TOOL RATHER THAN A WIDER REPORT FROM `checkLayout`, which was the
 * preferred shape and is not available.** `lib/schgen/render/layout-check.ts`'s
 * `textClearanceProblems` returns a field-placement refusal ALONE, so the text-clearance pass
 * behind it never runs (`docs/known-gaps.md` **G258**). Making it return both would change what
 * the repository REFUSES, not merely what it reports, and the evidence is a drive rather than a
 * reading:
 *
 * - `ob-buffer`, `oc-power` and `pt-core` refuse today with `Mismatch.kind` **`invalid-geometry`**,
 *   because `adaptElkLayoutReported` takes that arm when NO problem names an obstacle pair
 *   (`pairs[0] === undefined`), and a field-placement refusal names none;
 * - every problem `textProblems` writes DOES name a pair - `" overlaps "`, `" lies under "` and
 *   `" crosses the border of "` are all in `problem-obstacles.ts`'s `RELATIONS` - so for a block
 *   that masks one, appending it makes `pairs[0]` defined and flips the verdict to a
 *   **`clearance`** mismatch with a named constraint and obstacle pair;
 * - `Mismatch.kind` is the classified decision `RealiseResult`'s false arm carries (Task 8).
 *   `render/blocks.ts` branches on it, and `tools/schgen/anchor-sweep.ts`,
 *   `tools/schgen/parity.ts` and `tools/schgen/parity-render.ts` all PRINT it, so a flip changes
 *   output those tools publish. Flipping it is a change of verdict, not of report. **And nothing
 *   would catch it:** `tests/schgen/render/templates/mismatch-census.test.ts` counts the
 *   CONSTRUCTION SITES in the template modules by regex over their source, not the kind any block
 *   refuses with, so it is green either way - a citation this header carried until it was checked.
 *
 * **IT IS ONE BLOCK OF THE TWELVE TODAY, AND THE FIRST DRAFT OF THIS HEADER SAID THREE.** The test
 * below drives the pair arithmetic on the real strings and the claim did not reproduce: `oc-power`
 * and `pt-core` mask NOTHING, so their kind would not move, while `ob-buffer` masks a power-value
 * overlap and its kind would. **That is a worse property than a uniform change, not a smaller
 * one** - the verdict would become contingent on the masked population, which varies per block and
 * per corpus, so a review that passed the widening could not say which block flips next. The
 * second cost is smaller and still real: `layout-check.ts` is a byte-checked `files[]` port, so
 * editing it would add a **G139** divergence.
 *
 * **THE PRICE OF BEING A TOOL NOBODY RUNS, stated because this branch has four pieces of
 * machinery exercised only by their own tests** (`docs/known-gaps.md` **G226**). Nothing wires
 * this into `make check`, and the precondition for ever wiring it is NOT a bug fix: it is a
 * decision that a field-placement block's refusal MAY carry a `clearance` kind with an obstacle
 * pair drawn from the masked population. That decision belongs to a spec or to the owner, never to
 * the agent that produced the measurement; until it exists, this file is a probe, and its test is
 * what keeps it honest when the corpus moves.
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { adaptElkLayoutReported } from "../../lib/schgen/elk/adapt.ts"
import { selectRenderer, subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../lib/schgen/render/templates/index.ts"
import { blockFields, type FieldFallback } from "../../lib/schgen/render/field-placement.ts"
import { anchorsToSymbols, blockPowerLibs, valuesAlong } from "../../lib/schgen/render/power-text.ts"
import { textProblems, textScene } from "../../lib/schgen/render/text-scene.ts"
import { elkPrePass } from "./elk/layout.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import { classOf, gateOf } from "./remeasure-coverage.ts"
import type { BlockLayout, BlockSubgraph } from "../../lib/schgen/render/block-types.ts"
import type { BlockId } from "../../lib/schgen/ir/types.ts"

/**
 * A unit's own Reference or Value, as `render/text-scene.ts` names one: `Reference of C3#1`.
 * **It must NOT match a power symbol's `value of power symbol GND 0 at (...)`**, which is drawn
 * text of a different kind and is measurable without placing anything; the test drives both.
 */
export const FIELD_TEXT = /(Reference|Value) of \S+#\d+/

/**
 * **A UNIT FIELD IN A POPULATION THAT PROMISED TO OMIT THEM, refused rather than reported.** The
 * whole soundness argument for the masked population is that no problem in it involves a field box
 * (`render/text-scene.ts`'s `UnitFieldMode`), so a problem naming one would mean the opposite of
 * what this tool prints: a measurement contingent on a placement nobody chose.
 *
 * It is a function rather than three lines inside the measurement because **a guard that today's
 * data cannot trip is a check nobody has seen work** (`docs/known-gaps.md` **G236**): here the
 * refusing arm is driven directly, from the field-text form
 * `tests/schgen/remeasure.test.ts` already uses, alongside the passing arm.
 */
export function withoutFieldText(blockId: BlockId, problems: readonly string[]): readonly string[] {
  const leaked = problems.filter((p) => FIELD_TEXT.test(p))
  if (leaked.length > 0) {
    throw new Error(
      `block ${blockId}: the field-free text scene reported ${leaked.length} problem(s) naming a ` +
        `unit's own Reference or Value: ${leaked.join("; ")}. render/text-scene.ts's "omitted" mode ` +
        "contributes no field box, and this whole measurement is sound only because of that - a " +
        "problem involving a field is contingent on where that field was put, which for a block " +
        "whose field placement refused is the question under dispute. This is a defect in " +
        "render/text-scene.ts or in this tool's use of it, not a finding about the block.",
    )
  }
  return problems
}

/** The per-unit field-placement probe's reading of one unit, and what it does not establish. */
export interface UnitSlot {
  readonly key: string
  /**
   * True when this unit has NO clear field slot with the obstacle set at its most permissive: it
   * searched FIRST, so no other unit's fields were placed yet. A fallback here is unconditional -
   * adding obstacles cannot create a slot - and a clear slot here is NOT: once an earlier unit's
   * fields occupy a slot, this unit may fall back where it just placed cleanly.
   */
  readonly fallsBackUnconditionally: boolean
}

export interface MaskedBlock {
  readonly circuit: string
  readonly block: BlockId
  readonly draws: boolean
  /**
   * `Mismatch.kind` of the refusal, or `""` where it draws. **It is in the row because it is the
   * premise of this tool's existence**: the three blocks whose only published problem is field
   * placement refuse as `invalid-geometry` precisely because that problem names no obstacle pair,
   * so a wider report would move them to `clearance`. Reading it off the live pipeline is what
   * keeps that claim from being a sentence in a header.
   */
  readonly mismatchKind: string
  /** Every problem `checkLayout` reported, verbatim. */
  readonly publishedProblems: readonly string[]
  /** Problem classes `checkLayout` reported, in its own order. */
  readonly published: readonly string[]
  /**
   * **Every field pair the placer could not keep clear, in the block's REAL placement order.**
   * This is what replaced the refusal `fieldsPlaced` used to report: the placer takes the
   * least-covered slot instead of refusing, so what a reader needs is not whether the fields
   * placed - they always do - but which ones are drawn over something.
   */
  readonly fallbacks: readonly FieldFallback[]
  /**
   * The text-clearance problems measured with every unit field OMITTED, verbatim - for every block
   * that has a layout.
   *
   * **IT IS A CONTROL AND NOT A FINDING, on every row since Task 24**: `checkLayout` reaches the
   * full text pass on every block now, so each of these is already in `publishedProblems`, and
   * `maskedCensus` refuses if one is not.
   */
  readonly fieldFree: readonly string[]
  /**
   * Problem classes the field-free pass found and `checkLayout` did not. **Empty on every row by
   * construction since Task 24**, and still computed: the population it measured was the price of
   * the field-placement refusal, and that refusal is gone. What is unreported NOW is named in
   * `unmeasured` and carried by `fallbacks`.
   */
  readonly masked: readonly string[]
  /** Units with no CLEAR field slot even in first position, so their fallback is unconditional. */
  readonly fallbackUnits: readonly string[]
  /** Every check that could not run, with what stopped it. */
  readonly unmeasured: readonly string[]
  /** The distinct classes known to stand between this block and a drawing, published or masked. */
  readonly blockedBy: readonly string[]
}

/** The masked text-clearance problems of one block's layout: sound, and incomplete by construction. */
function maskedTextProblems(g: BlockSubgraph, layout: BlockLayout): readonly string[] {
  const libs = blockPowerLibs(g)
  const { powers, labels } = anchorsToSymbols(g, layout.anchors, valuesAlong(g.block.rendering))
  const scene = textScene(`block ${g.block.id}`, libs, { blocks: [{ g, layout }], powers, labels, texts: [], frames: [] }, "omitted")
  return withoutFieldText(g.block.id, textProblems(scene).map((f) => f.what))
}

/**
 * **WHICH UNITS HAVE NO FIELD SLOT, not just the first one `tryPlaceFields` names.**
 *
 * `render/field-placement.ts` returns at the FIRST unit it cannot place, so one refusal line is
 * the floor of a block's field-placement defects and not the count - a second masking behind the
 * one **G258** recorded. Each unit is re-asked with the SAME geometry and the same obstacles, moved
 * to the front of the placement order: `tryPlaceFields` accumulates each placed unit's fields as
 * obstacles for the units after it, so first position is the most permissive the search can be for
 * that unit, and a refusal there holds however the rest of the block places.
 *
 * **NOTHING IS INVENTED AND NOTHING IS REMOVED.** Every placement, wire and anchor is the one the
 * pipeline produced; only the ORDER the placer walks them in differs, which is what makes the
 * answer about the unit rather than about the walk. A unit that places here may still fail in its
 * real position, so this is a lower bound - stated in `UnitSlot`.
 */
export function unitSlots(g: BlockSubgraph, layout: BlockLayout): readonly UnitSlot[] {
  const libs = blockPowerLibs(g)
  return layout.placements.map((pl) => {
    const key = `${pl.part}#${pl.unit}`
    const first = { ...layout, placements: [pl, ...layout.placements.filter((q) => q !== pl)] }
    const placed = blockFields(g, first, libs).find((u) => u.key === key)
    if (placed === undefined) throw new Error(`block ${g.block.id}: ${key} is a placement and the placer returned no unit for it`)
    return { key, fallsBackUnconditionally: placed.fallback !== null }
  })
}

/**
 * Every declared block, with what its refusal hid and what nobody can measure.
 *
 * **THE TWO BLOCKS REFUSED BEFORE `checkLayout` ARE UNMEASURABLE, NOT CLEAN, AND NOT LAZY.**
 * `oc-audio`'s snap collapsed geometry that was distinct and `oc-sidechain`'s port coordinates
 * disagree with the pin ends, so `adaptElkLayoutReported` returns before any grid-legal layout
 * exists - `checked` is `null`. Every clearance check needs a layout, so running one would mean
 * supplying geometry the pipeline declined to produce: repairing the collapse, or picking one of
 * the two disagreeing coordinate sets. Both are decisions about what the drawing IS, and this tool
 * has no standing to make either (`docs/known-gaps.md` **G196**: an arm driven on an input the
 * production path cannot produce measures the fixture, not the subject).
 */
export async function maskedCensus(cases: readonly ParityCase[] = PARITY_CASES): Promise<readonly MaskedBlock[]> {
  const symbols = parityResolver()
  const out: MaskedBlock[] = []
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
            `${outcome === undefined ? "no outcome" : "a raise"} for it, so what its refusal hides ` +
            "cannot be measured. It is not skipped: a row missing from this census is a block " +
            "somebody would read as having nothing behind it.",
        )
      }
      const report = adaptElkLayoutReported(g, outcome)
      const published = report.problems.map(classOf)
      const layout = report.checked
      if (layout === null) {
        if (report.result.ok) {
          throw new Error(
            `block ${block.id} drew and carries no checked layout. adaptElkLayoutReported sets ` +
              "`checked` to the geometry it ran checkLayout on and only reaches the ok arm after " +
              "running it, so these two cannot both hold: this is a defect in lib/schgen/elk/adapt.ts.",
          )
        }
        out.push({
          circuit: c.name,
          block: block.id,
          draws: false,
          mismatchKind: report.result.mismatch.kind,
          publishedProblems: report.problems,
          published,
          fallbacks: [],
          fieldFree: [],
          masked: [],
          fallbackUnits: [],
          unmeasured: [`every clearance check: refused at ${gateOf(report.result.mismatch.reason)}, so there is no grid-legal layout for any of them to run on`],
          blockedBy: [],
        })
        continue
      }
      const fallbacks = blockFields(g, layout, blockPowerLibs(g)).flatMap((u) => (u.fallback === null ? [] : [u.fallback]))
      const fieldFree = maskedTextProblems(g, layout)
      // **THE CONTROL, AND SINCE TASK 24 IT RUNS ON EVERY BLOCK WITH A LAYOUT.** `checkLayout`
      // always reaches the full text pass now - the field-placement refusal that used to
      // early-return it no longer exists - so the field-free problems must all be among the
      // published ones, on every row rather than on the rows where the fields happened to place.
      // `masked` is what this leaves over, computed rather than hardcoded to `[]`: the population
      // is empty by construction, and a check that states its own conclusion is no check.
      const missing = fieldFree.filter((p) => !report.problems.includes(p))
      if (missing.length > 0) {
        throw new Error(
          `block ${block.id}: checkLayout ran the full text pass, and yet the field-free pass found ` +
            `${missing.length} problem(s) checkLayout did not report: ${missing.join("; ")}. A scene ` +
            "with FEWER texts cannot have MORE problems - every textProblems comparison is between " +
            "two things already in the scene - so either that is false or the two scenes are not the " +
            "same geometry. This is a defect in render/text-scene.ts or in this tool, not a finding " +
            "about the block.",
        )
      }
      const masked = missing.map(classOf)
      const fallbackUnits = unitSlots(g, layout).filter((u) => u.fallsBackUnconditionally).map((u) => u.key)
      out.push({
        circuit: c.name,
        block: block.id,
        draws: report.result.ok,
        mismatchKind: report.result.ok ? "" : report.result.mismatch.kind,
        publishedProblems: report.problems,
        published,
        fallbacks,
        fieldFree,
        masked,
        fallbackUnits,
        unmeasured:
          fallbacks.length === 0
            ? []
            : [
                `text clearance involving the ${fallbacks.length} fallback field pair(s) of ` +
                  `${fallbacks.map((f) => f.key).join(", ")}: the placer had no clear slot and chose the ` +
                  "least-covered one, so textProblems does not report their overlaps. They are not " +
                  "unreported - each FieldFallback names what it covers, and report.ts prints them per " +
                  "block in RENDER-REPORT.md",
              ],
        blockedBy: [...new Set([...published, ...masked])].sort(),
      })
    }
  }
  return out
}

/** A block with ONE problem class and nothing unmeasured behind it: fix that, and it draws. */
export const oneProblemAway = (r: MaskedBlock): boolean => !r.draws && r.blockedBy.length === 1 && r.unmeasured.length === 0

const names = (rows: readonly MaskedBlock[]): string => rows.map((r) => r.block).join(", ") || "none"

export function renderMasked(rows: readonly MaskedBlock[]): readonly string[] {
  const confirmed = rows.filter(oneProblemAway)
  const residual = rows.filter((r) => !r.draws && r.blockedBy.length === 1 && r.unmeasured.length > 0)
  const several = rows.filter((r) => r.blockedBy.length > 1)
  const nothing = rows.filter((r) => !r.draws && r.blockedBy.length === 0)
  return [
    ...rows.flatMap((r) => [
      `${r.block}: ${r.draws ? "DRAWS" : `blocked by ${r.blockedBy.join(", ") || "nothing measurable"}`}` +
        `${r.published.length === 0 ? "" : ` published ${r.published.join(", ")}`}` +
        `${r.masked.length === 0 ? "" : ` masked ${r.masked.join(", ")}`}` +
        `${r.fallbackUnits.length === 0 ? "" : ` units with no clear slot ${r.fallbackUnits.join(", ")}`}`,
      ...r.fallbacks.map((f) => `    FALLBACK ${f.key} (${f.libId}): covers ${f.covers.join(", ")}`),
      ...r.fieldFree.map((p) => `    control (checkLayout published this too): ${p}`),
      ...r.unmeasured.map((u) => `    unmeasured: ${u}`),
    ]),
    `${rows.filter((r) => r.draws).length} of ${rows.length} declared blocks draw`,
    `${confirmed.length} of ${rows.length} are ONE measured problem from drawing with nothing unmeasured behind it (${names(confirmed)})`,
    `${residual.length} have ONE measured problem and an unmeasured residual: ${names(residual)}`,
    `${several.length} have more than one: ${names(several)}`,
    `${nothing.length} are unmeasurable, nothing looked at them: ${names(nothing)}`,
  ]
}

if (import.meta.main) {
  for (const line of renderMasked(await maskedCensus())) console.log(line)
}
