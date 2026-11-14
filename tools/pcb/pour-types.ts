/**
 * THE SHAPES `./pour.ts` REPORTS, and the one rule they share: A FIGURE THE
 * BOARD GIVES NO ANSWER TO IS REPORTED AS ABSENT, WITH THE REASON, AND DOES NOT
 * TAKE THE OTHER FIGURES DOWN WITH IT.
 *
 * `Reading<T>` is that rule as a type. It was a refusal, and the reviewer of
 * Task 9 showed why that was wrong: `measurePour` used to throw when a board had
 * no through-hole ground pad, or a bypass capacitor whose return it could not
 * file under "pour" or "track", and one absent subject threw away three figures
 * that were perfectly computable. A surface-mount build of this circuit - one of
 * the five output classes this repository's mandate names - has no through-hole
 * ground pad at all. A measurement that declines to measure the whole board is
 * a gate on it, and there is no gate here (`docs/known-gaps.md` G313).
 *
 * What still refuses, in `./pour-refusal.ts`, is what makes EVERY figure
 * meaningless: a board that cannot be read, a board with no ground zone, a zone
 * nobody refilled, or copper this reader does not understand.
 */

/** A figure, or the plain reason the board gives no answer to it. Never a zero standing in for either. */
export type Reading<T> =
  | { readonly kind: "measured"; readonly value: T }
  | { readonly kind: "unavailable"; readonly reason: string }

export const measured = <T>(value: T): Reading<T> => ({ kind: "measured", value })
export const unavailable = <T>(reason: string): Reading<T> => ({ kind: "unavailable", reason })

/**
 * What `measurePour` is asked about. REQUIRED, with no default: the nets and
 * the IC are a fact about the board being measured, and a tool that assumed
 * `GND`, `+5V` and `U1` would refuse the next circuit (the Pultec has none of
 * the three) for being someone else's, rather than measuring it.
 */
export interface PourSubject {
  readonly groundNet: string
  readonly supplyNet: string
  /** The reference of the IC the continuity figure is about. */
  readonly icReference: string
}

/** This repository's `pt2399-core` board. Named so a caller passes a subject rather than inheriting one. */
export const PT2399_CORE: PourSubject = { groundNet: "GND", supplyNet: "+5V", icReference: "U1" }

/** One closed loop walked around the IC on one pour layer. */
export interface LoopContinuity {
  /** Fraction, 0 to 1, of the loop's samples that lie on poured copper. */
  readonly coveredFraction: number
  /**
   * Lengths in mm of each uncovered run along the loop, longest first. A
   * fraction cannot tell one 5 mm break from fifty 0.1 mm ones, and these can.
   */
  readonly breaksMm: readonly number[]
  /** How many distinct filled polygons (pieces of copper) the loop touches. 1 means the covered part is all one piece. */
  readonly polygonsTouched: number
  /** How far outside the IC's pad extent the loop was walked, and where that came from. */
  readonly offsetMm: number
}

/** What a ground pad's ring read on one pour layer. */
export interface SpokeReading {
  /** Separate runs of copper crossing the ring cut round the pad. 0 for a ring with no uncovered sample. */
  readonly spokes: number
  readonly coveredFraction: number
  /**
   * What the zone DECLARES for pad connection - `thermal` (the KiCad default,
   * when the form is absent), `yes` (solid), `no`, or `thru_hole_only` - so a
   * pad that reads 0 spokes because the zone connects it solid is told apart
   * from one the pour starves.
   */
  readonly declaredConnection: string
}

/** One ground track joining two or more separate pieces of fill on a layer. */
export interface RegionJoin {
  readonly layer: string
  /** Fill polygons the track (or the chain of tracks it is part of) touches. */
  readonly polygons: readonly number[]
  /** The narrowest track in the chain, in mm. NOT necessarily the bottleneck path through it. */
  readonly widthMm: number
}

/** A ground via that sits in fill on more than one polygon, which is what ties a back-layer island to a front-layer pour. */
export interface ViaLink {
  readonly at: readonly [number, number]
  readonly polygons: readonly number[]
}

/** How one bypass capacitor's ground pad reaches U1's ground. */
export type BypassKind = "pour" | "track" | "via" | "none-found"

export interface BypassReturn {
  /** `"pour"` etc. only when every capacitor agrees; `"mixed"` when they do not. Never a ranking of the answers. */
  readonly overall: BypassKind | "mixed"
  readonly byCap: ReadonlyMap<string, BypassKind>
}

export interface PourMetrics {
  readonly resolutionMm: number
  /** What the neck figure resolves, in mm: bodies must be this much wider in radius than the neck that joins them. */
  readonly noiseFloorMm: number
  /** Connected pieces of fill per pour layer. */
  readonly regionsByLayer: ReadonlyMap<string, number>
  /**
   * The narrowest ground track joining two separate pieces of fill. Unavailable,
   * with the reason, when every layer is one piece (nothing to bridge) AND when
   * there are separate pieces and no ground track joins them.
   */
  readonly narrowestBridgeMm: Reading<number>
  readonly regionJoins: readonly RegionJoin[]
  readonly viaLinks: readonly ViaLink[]
  /**
   * The narrowest constriction WITHIN connected fill between two wider bodies
   * (`./pour-bridge.ts`), over all layers; null when no layer has two bodies.
   * This is the figure `narrowestBridgeMm` used to be, under its own name.
   */
  readonly narrowestNeckMm: number | null
  readonly neckByLayer: ReadonlyMap<string, number | null>
  readonly continuityAroundIc: Reading<ReadonlyMap<string, LoopContinuity>>
  /** pad key `REF-NUMBER` -> pour layer -> reading. Per layer, because a sum across layers is not comparable between boards. */
  readonly spokesByGroundPad: Reading<ReadonlyMap<string, ReadonlyMap<string, SpokeReading>>>
  readonly bypassReturn: Reading<BypassReturn>
}
