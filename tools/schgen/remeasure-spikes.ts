/**
 * THE TWO SPIKES' PUBLISHED FIGURES, TRANSCRIBED, AND NOTHING ELSE.
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan.
 *
 * **WHY A DATA MODULE.** `CLAUDE.md`: *"transcription is evidence, not memory. A circuit ported
 * from somewhere records where it came from in its module comment, names the file that is the
 * authority for it, and states plainly anything it did NOT carry across."* Every number below was
 * read off the named section of the named file while writing this module; none is remembered and
 * none is derived.
 *
 * **THE AUTHORITY** is `docs/schematic/elk-block-spike.md` §3 (the eighteen-block table) and §4
 * (the paired control). `docs/known-gaps.md` **G100** and **G101** quote the same rows and were
 * read as a cross-check; where the register and the spike disagreed about a figure this module
 * would carry the spike's and say so. **They did not disagree on any figure carried here.**
 *
 * **WHAT IS NOT CARRIED ACROSS, stated rather than discovered:**
 *
 * - **no `bends` COUNT.** The spike published `bends/edge` and never the numerator, so a bend count
 *   per block does not exist to compare against;
 * - **no `occupiedArea`.** The spike published a `canvas` in the skin's pixels. It is kept as
 *   `canvasW`/`canvasH` because the ASPECT derived from them is dimensionless and therefore the one
 *   figure in the table that survives a change of frontend unit; the area itself does not;
 * - **no per-block WIRE LENGTH.** §4 published wire length for the whole and for the three blocks
 *   TOGETHER (159 967 against 35 070) and for no single block;
 * - **the `h-rails` and `v-rails` policy columns.** This generator has one policy, so there is
 *   nothing to compare a second one against. §4's `v-rails` shape (267 -> 47, 3.27 -> 2.68,
 *   5.04 -> 3.14) and §3's `h-rails` sentence are left in the spike.
 *
 * **AND THE THING THAT MAKES MOST OF THIS TABLE UNCOMPARABLE, said here so no consumer has to
 * rediscover it.** Every figure was taken through `netlistsvg` at `d3518f1` with its pinned
 * `elkjs` 0.7.1 (**G180**), whose node sizes, port glyphs and layout direction are all different
 * from this backend's. `comparabilityOf` below is the one place that says, per figure, whether the
 * quantity is the same quantity at all - and for `bendsPerEdge` the answer is no, on **G220**'s
 * measured ground that the two denominators are different counts.
 */

/** One row of `docs/schematic/elk-block-spike.md` §3, with every field it published and no other. */
export interface SpikeBlockRow {
  /** The spike's own name for the block, which is NOT always this repository's block id. */
  readonly spikeBlock: string
  /** This repository's declared block id, or `null` where no block corresponds to this row. */
  readonly block: string | null
  /** DISTINCT PARTS, which is the column the spike's ceiling is stated in. */
  readonly parts: number
  readonly ports: number
  readonly canvasW: number
  readonly canvasH: number
  readonly aspect: number
  /** `xnet`: crossings between different nets. */
  readonly crossings: number
  /** ELK's own edge count - the spanning-chain connections, not polylines (**G220**). */
  readonly edges: number
  readonly bendsPerEdge: number
  /** `internal b/e`: the same, excluding every edge touching a port glyph. */
  readonly internalBendsPerEdge: number
}

/**
 * All eighteen declared blocks of §3's table plus its two parent rows, in the table's own order.
 *
 * **THE `block` COLUMN IS THE WHOLE OF THE MAPPING, AND IT IS A TRANSCRIBED CORRESPONDENCE RATHER
 * THAN A GUESS.** A row maps to a block of this repository only where the spike's block is the SAME
 * declared partition: `oc-power`, `oc-audio` and `oc-sidechain` are the three `include()` blocks of
 * `circuits/optical-compressor` under their own ids, and the five `leg-*` rows are
 * `circuits/transistor-preamp`'s declared bias legs, which this repository's authoring file names
 * `tp-leg-*`. **The part counts agree on all eight** - 8, 12, 17, 2, 3, 3, 3, 3 - and that agreement
 * is a check that could have failed, since a re-partition between the spike and Task 9's declaration
 * would have moved one.
 *
 * **THE TEN `null` ROWS ARE THE FINDING THE BRIEF ASKS FOR RATHER THAN A HOLE.** The six
 * `standin-*` rows and the four `pultec-*` rows are blocks of the Pultec stand-in networks, which
 * `tools/schgen/symbol-census.ts`'s `PARITY_CIRCUITS` does not hold and which no authoring file in
 * this repository declares. The brief: *"if a block no longer exists as declared, or a figure cannot
 * be compared, record it rather than substituting a nearby block."*
 */
export const SPIKE_BLOCKS: readonly SpikeBlockRow[] = [
  { spikeBlock: "standin-low-cut", block: null, parts: 1, ports: 2, canvasW: 215, canvasH: 129, aspect: 1.67, crossings: 0, edges: 2, bendsPerEdge: 1.0, internalBendsPerEdge: 1.0 },
  { spikeBlock: "standin-mid", block: null, parts: 1, ports: 2, canvasW: 125, canvasH: 144, aspect: 0.87, crossings: 0, edges: 2, bendsPerEdge: 1.0, internalBendsPerEdge: 1.0 },
  { spikeBlock: "standin-hi-boost", block: null, parts: 2, ports: 2, canvasW: 227, canvasH: 199, aspect: 1.14, crossings: 0, edges: 3, bendsPerEdge: 0.67, internalBendsPerEdge: 0.0 },
  { spikeBlock: "standin-low-boost", block: null, parts: 2, ports: 3, canvasW: 235, canvasH: 159, aspect: 1.48, crossings: 0, edges: 4, bendsPerEdge: 1.5, internalBendsPerEdge: 1.5 },
  { spikeBlock: "leg-collector", block: "tp-leg-collector", parts: 2, ports: 2, canvasW: 207, canvasH: 187, aspect: 1.11, crossings: 0, edges: 4, bendsPerEdge: 2.0, internalBendsPerEdge: 2.5 },
  { spikeBlock: "leg-upper", block: "tp-leg-upper", parts: 3, ports: 2, canvasW: 354, canvasH: 190, aspect: 1.86, crossings: 0, edges: 5, bendsPerEdge: 2.0, internalBendsPerEdge: 2.0 },
  { spikeBlock: "leg-feedback", block: "tp-leg-feedback", parts: 3, ports: 2, canvasW: 390, canvasH: 190, aspect: 2.05, crossings: 0, edges: 5, bendsPerEdge: 2.0, internalBendsPerEdge: 2.0 },
  { spikeBlock: "leg-lowerA", block: "tp-leg-lower-a", parts: 3, ports: 2, canvasW: 378, canvasH: 190, aspect: 1.99, crossings: 0, edges: 5, bendsPerEdge: 2.0, internalBendsPerEdge: 2.0 },
  { spikeBlock: "leg-lowerB", block: "tp-leg-lower-b", parts: 3, ports: 2, canvasW: 378, canvasH: 190, aspect: 1.99, crossings: 0, edges: 5, bendsPerEdge: 2.0, internalBendsPerEdge: 2.0 },
  { spikeBlock: "standin-hi-cut", block: null, parts: 4, ports: 2, canvasW: 256, canvasH: 289, aspect: 0.89, crossings: 0, edges: 7, bendsPerEdge: 1.0, internalBendsPerEdge: 1.0 },
  { spikeBlock: "oc-power", block: "oc-power", parts: 8, ports: 4, canvasW: 831, canvasH: 267, aspect: 3.11, crossings: 0, edges: 20, bendsPerEdge: 2.7, internalBendsPerEdge: 2.67 },
  { spikeBlock: "pultec-low-boost", block: null, parts: 9, ports: 3, canvasW: 469, canvasH: 385, aspect: 1.22, crossings: 5, edges: 23, bendsPerEdge: 2.13, internalBendsPerEdge: 2.07 },
  { spikeBlock: "pultec-low-cut", block: null, parts: 9, ports: 2, canvasW: 592, canvasH: 315, aspect: 1.88, crossings: 4, edges: 24, bendsPerEdge: 2.46, internalBendsPerEdge: 2.12 },
  { spikeBlock: "oc-audio", block: "oc-audio", parts: 12, ports: 7, canvasW: 944, canvasH: 640, aspect: 1.48, crossings: 28, edges: 37, bendsPerEdge: 2.89, internalBendsPerEdge: 2.82 },
  { spikeBlock: "pultec-hi-cut", block: null, parts: 13, ports: 2, canvasW: 878, canvasH: 295, aspect: 2.98, crossings: 16, edges: 33, bendsPerEdge: 2.48, internalBendsPerEdge: 2.27 },
  { spikeBlock: "oc-sidechain", block: "oc-sidechain", parts: 17, ports: 6, canvasW: 1178, canvasH: 650, aspect: 1.81, crossings: 20, edges: 39, bendsPerEdge: 2.51, internalBendsPerEdge: 2.26 },
  { spikeBlock: "pultec-hi-boost", block: null, parts: 17, ports: 2, canvasW: 1361, canvasH: 290, aspect: 4.7, crossings: 14, edges: 32, bendsPerEdge: 1.66, internalBendsPerEdge: 1.63 },
  { spikeBlock: "pultec-mid", block: null, parts: 28, ports: 3, canvasW: 2716, canvasH: 410, aspect: 6.63, crossings: 37, edges: 53, bendsPerEdge: 1.77, internalBendsPerEdge: 1.75 },
]

/**
 * §4's paired control: the same 37-part `optical-compressor`, whole and as its three blocks.
 *
 * **IT IS THE SUBJECT RULING R38 DECLARES UNAVAILABLE**, and it is transcribed anyway, because the
 * ruling's instruction is to report the 6.1x NOT-COMPARABLE rather than to leave a reader unable to
 * see what was not compared.
 */
export interface SpikePairedControl {
  readonly parts: number
  readonly aspect: number
  readonly crossings: number
  readonly edges: number
  readonly bendsPerEdge: number
  readonly wireLength: number
}

export const SPIKE_WHOLE_OPTICAL_COMPRESSOR: SpikePairedControl = {
  parts: 37, aspect: 4.05, crossings: 293, edges: 139, bendsPerEdge: 3.18, wireLength: 159_967,
}

/** The same circuit as its three declared blocks: `worst` aspect, TOTAL crossings, TOTAL wire. */
export const SPIKE_BLOCKED_OPTICAL_COMPRESSOR: SpikePairedControl = {
  parts: 37, aspect: 3.11, crossings: 48, edges: 96, bendsPerEdge: 2.7, wireLength: 35_070,
}

/** §4's headline ratio, as the spike states it: 293 / 48. */
export const SPIKE_CROSSING_RATIO = 6.1

/**
 * WHETHER AN M1 FIGURE AND A SPIKE FIGURE ARE THE SAME QUANTITY AT ALL, per measure.
 *
 * **THIS IS THE GATE EVERY COMPARISON IN THIS TASK GOES THROUGH, AND IT IS NOT A TOLERANCE.** Two
 * numbers can be compared when they count the same thing in the same unit. Where they do not, a
 * verdict of *reproduced* or *moved* would be a sentence about nothing, and §3.3's objection to a
 * composite applies with full force: it *"would produce a number that looks cited"*.
 *
 * | measure | comparable? | why |
 * | --- | --- | --- |
 * | `crossings` | **yes, in kind** | both count contacts between segments of DIFFERENT nets. The absolute is contaminated by the skin's node sizes (**G180**), so a difference is not attributable; the quantity is the same one |
 * | `aspect` | **yes** | a ratio of two lengths in one unit is dimensionless, so it is the one figure in §3's table that survives the change of frontend unit |
 * | `bendsPerEdge` | **NO** | **G220**, measured: the spike divides ELK's `bendPoints` by ELK's own spanning-chain edge count and this repository divides bends by maximal POLYLINES. The two agree only for a two-terminal net |
 * | `wireLength` | **NO** | the spike's unit is the skin's pixel and this repository's is the 1.27 mm grid step. There is no conversion, because the two geometries are not the same drawing at a scale |
 * | `occupiedArea` | **NO** | the spike published no area, and the canvas it published is in the same unit `wireLength` is |
 * | `bends` | **NO** | the spike published no bend COUNT, only the per-edge ratio |
 */
export type Comparability = "same-quantity" | "not-comparable"

export const COMPARABILITY: Readonly<Record<string, Comparability>> = {
  crossings: "same-quantity",
  aspect: "same-quantity",
  bends: "not-comparable",
  bendsPerEdge: "not-comparable",
  wireLength: "not-comparable",
  occupiedArea: "not-comparable",
}

export function comparabilityOf(measure: string): Comparability {
  const known = COMPARABILITY[measure]
  if (known === undefined) {
    throw new Error(
      `tools/schgen/remeasure-spikes.ts: nothing states whether "${measure}" is the same quantity ` +
        "in the spikes and in this generator. It is NOT defaulted to comparable and it is not " +
        'defaulted to incomparable either: "reproduced" about two different quantities is a false ' +
        'statement and "not-comparable" about two identical ones hides a real result. Add the ' +
        `measure to COMPARABILITY with the reason, as the table in this module's comment does. ` +
        `Known: ${Object.keys(COMPARABILITY).sort().join(", ")}.`,
    )
  }
  return known
}

/** The spike's row for a block of this repository, or `null` where it published none. */
export function spikeRowFor(block: string): SpikeBlockRow | null {
  return SPIKE_BLOCKS.find((r) => r.block === block) ?? null
}
