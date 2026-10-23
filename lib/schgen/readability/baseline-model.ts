/**
 * WHAT A RECORDED READABILITY BASELINE IS: the one file's path, its schema version, the twelve
 * fields an entry carries, who may grant one, the lookup shape, and `[RAN]` G95's block-scale
 * classification. `MeasureComparison` and the two functions that build one - `compareMeasures` and
 * `baselineFor` - are at the front door, because they are behaviour and this file is declarations.
 *
 * Hand-written for Task 16 of the M1 schematic-authoring plan.
 *
 * **ITS OWN FILE FOR THE REASON `tools/stripboard/approvals-model.ts` IS**: the declarations are
 * most of this area's prose and none of its behaviour, so `./baseline.ts` is the strict loader and
 * nothing else. **NOTHING HERE READS A FILE OR REFUSES ANYTHING**, with the one exception of
 * `baselinesPath`, which computes a path and reads nothing. Consumers import everything they need
 * from `./baseline.ts`, which re-exports this module's declarations.
 *
 * **THE THREE-FILE SPLIT IS A DEVIATION FROM THIS TASK's BRIEF AND IS FORCED BY `CLAUDE.md`'s LINE
 * CEILING.** The brief names one file, `./baseline.ts`; written as one it is just over 800 lines,
 * against a stated ceiling of 300-500. The seam is `tools/stripboard/`'s own and is not invented
 * here: `approvals-model.ts` answers *what is a recorded approval*, `approvals-read.ts` answers *is
 * this one entry well formed*, and `approvals.ts` answers *what is in the file*. The deviation is
 * recorded in `docs/known-gaps.md`.
 *
 * The REASONING for the channel, for the empty registry, for the literal `"descriptive"` verdict
 * and for `comparable-hash-moved` is in `./baseline.ts`'s header, which is the front door a reader
 * arrives at.
 */

import path from "node:path"
import { fileURLToPath } from "node:url"
import type { BlockId } from "../ir/types.ts"
import type { SchematicMeasures } from "./measures.ts"

/** How the registry is cited in a notice and a refusal: short, and copy-pasteable. */
export const BASELINES_FILE = "schematic/readability-baselines.json"

/** The one committed registry, absolute - computed once, from this module's own location. */
export function baselinesPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, "..", "..", "..", "schematic", "readability-baselines.json")
}

/** The only schema version this loader reads. */
export const BASELINES_SCHEMA = 1

/** Who may grant a readability baseline. A whitelist of one; see this module's comment. */
export const BASELINE_GRANTORS = ["owner"] as const

export type BaselineGrantor = (typeof BASELINE_GRANTORS)[number]

/**
 * One reviewed baseline: which block, which bytes, which four numbers, on whose word, said how.
 *
 * **TWELVE FIELDS, AS `stripboard/render-approvals.json` HAS - WITH TWO DEPARTURES, ONE OF WHICH
 * SPEC §3.3 PREDICTED AND ONE OF WHICH IT DID NOT.**
 *
 *   - **predicted:** *"an approval admits one termination, whereas a baseline carries four measured
 *     numbers"*, so `admits` becomes `measures`;
 *   - **not predicted, and recorded in `docs/known-gaps.md` rather than smoothed over:** an
 *     approval's `board` becomes `circuit` AND `block` (a baseline is per block, and a block id is
 *     only unique within a circuit), and the twelfth field that makes room for the second of those
 *     is `renderedFrom` - **which is deleted.** That field is load-bearing in the approvals
 *     registry: it is where *"WHAT HE LOOKED AT WAS THE PICTURE AND NOT THESE BYTES"* is said in
 *     prose a reader can judge. A baseline has nowhere to say it, so what he was shown has to be
 *     said in `why` or `note` with no field obliging anyone to say it at all. The cost is real and
 *     is registered with its criterion.
 */
export interface ReadabilityBaseline {
  /** Unique, and how a notice cites this entry. */
  readonly id: string
  /** The circuit the block belongs to, as the parity census names it. */
  readonly circuit: string
  readonly block: BlockId
  /** §3.3: scoped to the SAME serialized layout input the manifest hashes. */
  readonly layoutInputSha256: string
  readonly measures: SchematicMeasures
  readonly why: string
  readonly grantedBy: BaselineGrantor
  /** ISO `yyyy-mm-dd`, the day he said it. */
  readonly grantedOn: string
  /** His words, verbatim, one utterance per element. Not paraphrased, not concatenated. */
  readonly ownerWords: readonly string[]
  readonly doesNotExcuse: readonly string[]
  /** Repository-relative paths of the files that really consult this entry. */
  readonly consultedBy: readonly string[]
  readonly note: string
}

export interface BaselineRegistry {
  readonly schema: 1
  readonly baselines: readonly ReadabilityBaseline[]
  /** One entry per field of the registry that carries a recorded decision. */
  readonly notes: Readonly<Record<string, string>>
}

/**
 * Spec §3.3 rev 4: REPRODUCIBILITY identity (the exact bytes) and COMPARISON identity (the
 * fixture) are different things. A moved serialization hash is FLAGGED, never a refusal to compare.
 */
export type BaselineLookup =
  | { readonly kind: "found"; readonly entry: ReadabilityBaseline }
  | { readonly kind: "comparable-hash-moved"; readonly entry: ReadabilityBaseline; readonly was: string }
  | { readonly kind: "absent" }

/**
 * WHETHER A BASELINE IS ABOUT THE CIRCUIT OR ABOUT A SERIALIZATION - `[RAN]` **G95**'s block-scale
 * refinement, which decides whether a baseline is worth holding at all.
 *
 * Measured: *"a baseline over blocks small enough that the measure does not move under reordering is
 * a baseline about the circuit. Over large blocks it is a baseline about a serialization"* -
 * legitimate and much weaker - *"and a gate citing one must not be read as the former."*
 *
 * **THE TWO BOUNDS ARE TASK 17's AND NO LONGER THE SPIKE's, AND THE RE-MEASUREMENT MOVED THEM
 * BOTH.** Until 2026-10-20 they were 9 and 13, read off G95's table of a shuffle run through
 * `netlistsvg` at `d3518f1` with its pinned `elkjs` 0.7.1. `[RAN]`
 * `tools/schgen/remeasure-ceiling.ts` ran the same shuffle on THIS backend over all twelve declared
 * blocks: the crossing count is **invariant at 2 and 3 placements** and **moves at 8 and at every
 * larger size measured** - and the clearest row is `oc-power`, the SAME 8-part block the spike
 * measured at **0, 0, 0, 0**, which here gives **1, 3, 2, 2**. Carrying 9 forward would have left
 * this module classifying `oc-power` as *about the circuit* on evidence this repository has
 * falsified, which is the exact failure G101's caveat records about itself.
 *
 * **THERE ARE THREE ARMS AND NOT TWO, because 4 to 7 placements was never measured.** No declared
 * block of this repository has 4, 5, 6 or 7 placements, and ruling **R40** forbids constructing one:
 * *"if no real subject exists at a size, that size is unmeasured and you say so, per size."*
 * Calling a 5-placement block *about the circuit* would be extending a measured range by assertion,
 * which is what `CLAUDE.md` means by a silent widening; calling it *about a serialization* would
 * overstate a defect nobody has seen at that size. `unmeasured-scale` says so.
 */
export type BaselineScale =
  | { readonly kind: "about-the-circuit"; readonly cells: number; readonly why: string }
  | { readonly kind: "about-a-serialization"; readonly cells: number; readonly why: string }
  | { readonly kind: "unmeasured-scale"; readonly cells: number; readonly why: string }

/**
 * **HOW NARROWLY THE TWO BOUNDS BELOW ARE FOUNDED - controller ruling R44(a), and it is here in
 * CODE rather than only in the register for the reason that ruling gives: *"a later reader who
 * finds 3 and 8 must not be able to mistake them for the same quality of evidence as the numbers
 * they replaced."***
 *
 * The 9 and 13 these replaced came from 18 blocks of two parents. These come from **12 declared
 * blocks of 4 circuits**, and the subject set is thinner in four specific ways:
 *
 * - **of the seven sizes the spike swept - 3, 4, 8, 9, 13, 17, 28 - only TWO have a real subject
 *   here.** Size 3 has four (the congruent bias legs) and size 8 has one (`oc-power`). **Five are
 *   unmeasured**, and ruling **R40** forbids constructing a block to fill them;
 * - **7 of the 12 subjects are geometry the post-layout gates REFUSE**, so the bounds are a
 *   property of the backend's OUTPUT and not of the pipeline's accepted output (R40 again);
 * - **the only subject at size 8 is one of those seven** - `oc-power` fails `checkLayout` - and it
 *   is the subject that fixes `SCALE_UNSTABLE_FROM`. The upper bound rests on one refused layout;
 * - **the invariant side is three distinct topologies, not six blocks** - and the CEILING's OWN
 *   SIZE is thinner than that aggregate admits. Six blocks are at or below `SCALE_INVARIANT_UPTO`,
 *   but **at size 3, the bound itself, all four subjects are ONE topology**: the bias legs draw
 *   byte-identically (`docs/known-gaps.md` **G185**), so they are the same block four times, and
 *   each was swept over **3 of its 6 possible permutations**. **Size 2 is the better-supported
 *   size - two distinct topologies, both swept exhaustively - and size 2 is not the bound.**
 *
 * **WHAT IS STRONGER HERE THAN IN THE NUMBERS REPLACED:** these were measured on the backend that
 * actually draws, and the decisive row is a direct contradiction on a shared subject - `oc-power`,
 * 8 parts, measured 0, 0, 0, 0 through `netlistsvg` and **1, 3, 2, 2** here. **What is weaker: the
 * range covered.** Both halves travel with the figure, in **G95** and **G101** and here.
 */

/**
 * The largest block size at which the crossing count was measured INVARIANT under reordering, in
 * PLACEMENTS - Task 17's re-measurement on this backend, not the spike's 9. **Read the block above
 * before quoting it.**
 */
export const SCALE_INVARIANT_UPTO = 3
/**
 * The smallest block size at which the crossing count was measured MOVING under reordering - Task
 * 17's re-measurement, not the spike's 13. **It rests on a single subject, `oc-power`, whose layout
 * the gates refuse** - see the block above.
 */
export const SCALE_UNSTABLE_FROM = 8

export function baselineScale(cells: number): BaselineScale {
  if (cells <= SCALE_INVARIANT_UPTO) {
    return {
      kind: "about-the-circuit",
      cells,
      why:
        `${cells} cells is at or below ${SCALE_INVARIANT_UPTO}, and docs/known-gaps.md G95 measured ` +
        "the inter-net crossing count INVARIANT over four declaration orders at 2 and 3 placements " +
        "on this backend - 0 in every order, on six blocks. At this size the measured quality is a " +
        "property of the block, so a baseline over it is a baseline about the circuit. The six " +
        "blocks are three distinct topologies, because four of them are the congruent bias legs.",
    }
  }
  if (cells >= SCALE_UNSTABLE_FROM) {
    return {
      kind: "about-a-serialization",
      cells,
      why:
        `${cells} cells is at or above ${SCALE_UNSTABLE_FROM}, and docs/known-gaps.md G95 measured ` +
        "the crossing count MOVING under reordering from that size up on this backend - oc-power at " +
        "8 placements gives 1, 3, 2, 2 and pt-core at 24 gives 78, 53, 39, 65. The numbers are then " +
        "partly a property of the order somebody typed the components in, so a baseline over this " +
        "block is a baseline about a SERIALIZATION. That is legitimate and much weaker, and a gate " +
        "citing it must not be read as citing a property of the circuit.",
    }
  }
  return {
    kind: "unmeasured-scale",
    cells,
    why:
      `${cells} cells falls in the gap nothing has measured: no declared block of this repository ` +
      `has 4, 5, 6 or 7 placements, so nothing is known between ${SCALE_INVARIANT_UPTO + 1} and ` +
      `${SCALE_UNSTABLE_FROM - 1}. It is reported as unmeasured rather than assigned to the nearer ` +
      "arm, because extending a measured range by assertion is exactly the silent widening " +
      "CLAUDE.md forbids - and ruling R40 forbids constructing a synthetic block to fill the gap. " +
      "A DECLARED block of this size, run through tools/schgen/remeasure-ceiling.ts, would settle it.",
  }
}

/** The fewest edges an entry may state, and the two names its text must mention. */
export const BASELINE_EDGES_REQUIRED = 3

/**
 * The two names an entry's edges must mention.
 *
 * **THEY ARE THE EDGES WHOSE ABSENCE IS DANGEROUS, and a NAME is required rather than a description
 * because a name is checkable against the thing that exports it and a paraphrase is not** - the
 * approvals registry's `APPROVAL_REQUIRED_EDGE_NAMES` carries that reasoning and this is the same
 * device with this registry's two dangers:
 *
 *   - `verdict` (`MeasureComparison`, this module) - the misreading spec §3.3 revision 4 was
 *     written to stop. A reader taking a baseline comparison for an acceptance result has read four
 *     diagnostics as a pass, and the entry must say in its own words that it is not one;
 *   - `layoutInputSha256` - the scope. A baseline read as covering *this block* rather than *this
 *     serialization* would be cited for a drawing nobody looked at.
 */
export const BASELINE_REQUIRED_EDGE_NAMES = ["verdict", "layoutInputSha256"] as const

/** Every field an entry must carry, in the order the committed file carries them. */
export const BASELINE_ENTRY_KEYS = [
  "id",
  "circuit",
  "block",
  "layoutInputSha256",
  "measures",
  "why",
  "grantedBy",
  "grantedOn",
  "ownerWords",
  "doesNotExcuse",
  "consultedBy",
  "note",
] as const

/** Every key a schema-1 file may carry at the top level, and no other. */
export const BASELINE_TOP_LEVEL_KEYS: readonly string[] = ["schema", "baselines", "notes"]

/**
 * The notes block's keys: one recorded decision per field of the registry's own design.
 *
 * `twelveFieldShape` is the one that is not a field: it records the two departures from
 * `stripboard/render-approvals.json`'s shape, because a shape with no reason gets reshaped by the
 * next reader and this registry's shape was argued once.
 */
export const BASELINE_NOTE_KEYS: readonly string[] = [
  "schema",
  "baselines",
  "measures",
  "layoutInputSha256",
  "grantedBy",
  "ownerWords",
  "twelveFieldShape",
]

/** The five numeric fields of `SchematicMeasures`, read by name and never spread. */
export const MEASURE_KEYS = ["bends", "bendsPerEdge", "crossings", "wireLength", "occupiedArea"] as const

