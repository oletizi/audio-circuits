/**
 * SPEC §1.4 REVISION 4: THE CANONICAL WIRE TOPOLOGY, AND SPEC §1.4 OBLIGATION 2 TAKEN OVER IT.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan.
 *
 * **THIS IS NOT PRECAUTIONARY AND THE EVIDENCE WAS IN HAND BEFORE A LINE OF IT WAS WRITTEN.**
 * `docs/known-gaps.md` **G106**, from the spikes: `docs/schematic/elk-spike.md` §7 measured
 * ***"duplicate wire segments: 30-187 per drawing. Any measure that does not collapse them
 * double-counts crossings"***, and `docs/schematic/elk-block-spike.md` §10 measured **0-80 per
 * block drawing** plus zero-length segments (1-8 flat, 0-5 per block). **Duplicate and degenerate
 * segments are already in the geometry this layer adapts FROM.** An adapter that passes ELK's
 * sections through emits them into the `.kicad_sch`, and every measure taken over an
 * uncanonicalised topology is inflated by an unknown amount.
 *
 * **THE THREE THINGS OBLIGATION 2 ASSUMED AND DID NOT DEFINE**, which spec §1.4 revision 4
 * (finding 21) settles and which this module is where they are settled:
 *
 * - **a wire CROSSING is distinguished from a T-JUNCTION.** Two segments whose interiors meet at a
 *   point are a crossing when they are on DIFFERENT nets and a branch when they are on the same
 *   one. The distinction is a property of net membership and segment geometry, never of appearance,
 *   so `crossings` reads the nets and `branchJunctions` reads the nets;
 * - **whether a branch point may coincide with a pin ENDPOINT is stated: it may, and it is a
 *   DIFFERENT OBJECT when it does.** A pin end is already an electrical attachment in KiCad, so
 *   `Branch.kind` carries `"at-pin-end"` there and `"t-junction"` in free space. An emitter that
 *   treated them alike *"either double-counts a connection or drops a junction"*;
 * - **coincident branches are NORMALISED before counting.** Two branches at one point of one net
 *   are one branch point, so `branches` holds at most one entry per (net, point).
 *
 * **AND CLAUSE (d) IS A REFUSAL, NEVER A REPAIR.** A partial overlap that is neither an exact
 * duplicate nor a clean T names both segments and stops. That is obligation 5's discipline applied
 * here: the repair would be a second router, chosen at the point in the pipeline with the least
 * information and the most incentive to make the sheet pass.
 */

import { pointKey, samePoint, type Point } from "../render/geometry.ts"
import { fmtPoint, onSegment, strictlyInside } from "../render/connectivity.ts"
import type { Wire } from "../render/block-types.ts"
import type { BlockLayout } from "../render/block-types.ts"
import type { PlacedPin } from "../render/unit-pins.ts"
import type { NetName } from "../ir/types.ts"

export interface Branch {
  readonly net: NetName
  readonly at: Point
  /** A branch at a pin end is a different object from one in free space. */
  readonly kind: "t-junction" | "at-pin-end"
}

export type CanonicalTopology =
  | {
      readonly ok: true
      /** Coincident duplicates collapsed, zero-length dropped. */
      readonly wires: readonly Wire[]
      /** Each net's branch points, explicit and normalised to one entry per point. */
      readonly branches: readonly Branch[]
      /** How many coincident duplicates were collapsed: REPORTED, never silent. */
      readonly collapsed: number
      /**
       * How many ZERO-LENGTH segments were dropped.
       *
       * **A FIELD THE BRIEF's TYPE DOES NOT DECLARE, ADDED DELIBERATELY, AND THE DEVIATION IS
       * RECORDED** (`docs/known-gaps.md`). The declared type carries one number, whose own comment
       * is *"how many duplicates were collapsed"*. The spikes measured the two defects
       * **separately** - 30-187 duplicates and 1-8 zero-length per whole-circuit drawing - and they
       * are different facts about the backend: a duplicate is the router emitting one segment twice,
       * a zero-length segment is it emitting a segment with no extent. Summing them into one
       * reported number would make the measurement this field exists to produce uncomparable with
       * the figures it is meant to be compared against.
       */
      readonly zeroLength: number
    }
  /**
   * An overlap that is neither a duplicate nor a clean T: named segments, and a refusal.
   *
   * **IT CARRIES THE TWO COUNTS AS WELL, WHICH THE BRIEF's TYPE DOES NOT, AND THE DEVIATION IS
   * FORCED BY THE BRIEF's OWN STEP 5** (recorded in `docs/known-gaps.md`). That step requires the
   * duplicate count to be *"reported per block"* as *"the first measurement of the duplicate-segment
   * defect on a driver that is not `netlistsvg`'s"* - and `[RAN]` **11 of the 12 declared blocks of
   * the four parity circuits refuse on this arm**, so a refusal that carried no counts would make
   * the required measurement unobtainable on eleven twelfths of the corpus. The deduplication runs
   * BEFORE the ambiguity check (see `canonicalTopology`), so both numbers are already known when
   * this arm is taken; dropping them would be throwing away a measurement, not declining to make one.
   */
  | { readonly ok: false; readonly ambiguous: readonly string[]; readonly collapsed: number; readonly zeroLength: number }

/** A segment's geometry, independent of which end was called `a`. */
function geometryKey(w: Wire): string {
  const ends = [pointKey(w.a), pointKey(w.b)].sort()
  return `${ends[0] ?? ""}|${ends[1] ?? ""}`
}

const isHorizontal = (w: Wire): boolean => w.a.y === w.b.y

/**
 * The positive-length overlap of two collinear axis-aligned segments, or `null` when they are not
 * collinear or share at most a point.
 *
 * **It is `wire-safety.ts`'s `collinearOverlap`, re-derived rather than imported, because that one
 * is not exported** - it is a module-private helper of `wireOverWires`. Two copies of one rule is
 * what `CLAUDE.md` forbids, so the duplication is recorded here rather than left silent: the
 * criterion is that a collinear overlap is decided by one rule, and the mechanism available without
 * diverging a tenth ported file is this. The behaviours are asserted equal in
 * `tests/schgen/elk/junctions.test.ts` against the same shapes
 * `tests/schgen/render/wire-safety.test.ts` uses.
 */
function collinearOverlap(w1: Wire, w2: Wire): readonly [Point, Point] | null {
  const h1 = isHorizontal(w1)
  const h2 = isHorizontal(w2)
  if (h1 !== h2) return null
  if (h1 && w1.a.y !== w2.a.y) return null
  if (!h1 && w1.a.x !== w2.a.x) return null
  const along = (p: Point): number => (h1 ? p.x : p.y)
  const lo = Math.max(Math.min(along(w1.a), along(w1.b)), Math.min(along(w2.a), along(w2.b)))
  const hi = Math.min(Math.max(along(w1.a), along(w1.b)), Math.max(along(w2.a), along(w2.b)))
  if (hi <= lo) return null
  const at = (v: number): Point => (h1 ? { x: v, y: w1.a.y } : { x: w1.a.x, y: v })
  return [at(lo), at(hi)]
}

const describe = (w: Wire, i: number): string => `wire ${i} (net ${w.net}, ${fmtPoint(w.a)}-${fmtPoint(w.b)})`

/**
 * Every ambiguous overlap in `wires`, named - clause (d).
 *
 * Two cases, and the second is the one that would otherwise be read as a duplicate:
 *
 * - **same net, collinear, overlapping over a positive length, not an exact duplicate.** Which
 *   segment the shared stretch belongs to has two readings and nothing here can choose. KiCad draws
 *   both and a reader sees one line;
 * - **DIFFERENT nets, collinear, overlapping over a positive length - including when the two
 *   geometries are exactly equal.** An exact geometric match of two different nets is not a
 *   duplicate at all: it is a short drawn as one line, and deduplicating it would delete one of two
 *   nets' wires and leave the drawing asserting a connection nobody declared.
 */
function ambiguousOverlaps(wires: readonly Wire[]): readonly string[] {
  const out: string[] = []
  for (let i = 0; i < wires.length; i += 1) {
    for (let j = i + 1; j < wires.length; j += 1) {
      const a = wires[i]
      const b = wires[j]
      if (a === undefined || b === undefined) continue
      const overlap = collinearOverlap(a, b)
      if (overlap === null) continue
      const identical = geometryKey(a) === geometryKey(b)
      if (identical && a.net === b.net) continue
      out.push(
        `${describe(a, i)} and ${describe(b, j)} overlap along ${fmtPoint(overlap[0])}-${fmtPoint(overlap[1])}, ` +
          (a.net === b.net
            ? "which is neither an exact duplicate nor a clean T: the shared stretch belongs to " +
              "both readings and nothing here may choose one. It is not repaired (spec 1.4 " +
              "obligation 5); split or reroute the segment upstream."
            : `and they are on different nets (${a.net} and ${b.net}), so this is a short drawn as ` +
              "one line. It is not deduplicated: deleting either wire would leave the drawing " +
              "asserting a connection nobody declared."),
      )
    }
  }
  return out
}

/** The nets whose segments touch `p`, and how many segment-ends and pass-throughs are there. */
interface Incidence {
  readonly ends: number
  readonly through: number
}

function incidenceAt(p: Point, segments: readonly Wire[]): Incidence {
  let ends = 0
  let through = 0
  for (const s of segments) {
    if (samePoint(p, s.a)) ends += 1
    if (samePoint(p, s.b)) ends += 1
    if (strictlyInside(p, s.a, s.b)) through += 1
  }
  return { ends, through }
}

/**
 * Every point worth examining for one net: its segment endpoints, plus every point where two of its
 * segments touch without sharing an endpoint.
 *
 * The second half is what catches a clean T whose stem ends in another segment's interior, and an X
 * of one net whose two segments cross without either ending there.
 */
function interestingPoints(segments: readonly Wire[]): readonly Point[] {
  const seen = new Map<string, Point>()
  const add = (p: Point): void => {
    if (!seen.has(pointKey(p))) seen.set(pointKey(p), p)
  }
  for (const s of segments) {
    add(s.a)
    add(s.b)
  }
  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const a = segments[i]
      const b = segments[j]
      if (a === undefined || b === undefined) continue
      if (isHorizontal(a) === isHorizontal(b)) continue
      // One is horizontal and one vertical: they can meet only where their fixed coordinates cross.
      const h = isHorizontal(a) ? a : b
      const v = isHorizontal(a) ? b : a
      const p: Point = { x: v.a.x, y: h.a.y }
      if (onSegment(p, h.a, h.b) && onSegment(p, v.a, v.b)) add(p)
    }
  }
  return [...seen.values()]
}

/**
 * The branch points of each net, normalised to one entry per (net, point) and classified against
 * `pins`.
 *
 * **A POINT IS A BRANCH WHEN THE NET'S OWN DEGREE THERE IS 3 OR MORE**, counting a segment that
 * PASSES THROUGH the point as 2. That is the definition KiCad's own rule forces: two segment ends
 * meeting is a corner and needs nothing, and a third arrival is a place where current can divide,
 * which KiCad joins only with a junction object.
 *
 * **A pin end counts, which is the second of revision 4's three settlements.** A pin arriving at a
 * point contributes an attachment of its own, so a net whose two wire-ends meet AT a pin end is a
 * branch - three things at one point - and it is `"at-pin-end"` rather than `"t-junction"`.
 */
function branchesOf(wires: readonly Wire[], pins: readonly PlacedPin[]): readonly Branch[] {
  const nets = [...new Set(wires.map((w) => w.net))].sort()
  const out: Branch[] = []
  for (const net of nets) {
    const segments = wires.filter((w) => w.net === net)
    const netPins = pins.filter((p) => p.net === net)
    for (const p of interestingPoints(segments)) {
      const { ends, through } = incidenceAt(p, segments)
      const atPin = netPins.some((q) => samePoint(q.at, p))
      const degree = ends + 2 * through + (atPin ? 1 : 0)
      if (degree < 3) continue
      out.push({ net, at: p, kind: atPin ? "at-pin-end" : "t-junction" })
    }
  }
  return out.sort((a, b) => a.net.localeCompare(b.net) || a.at.y - b.at.y || a.at.x - b.at.x)
}

/**
 * The canonical topology of `l`, or a refusal naming every ambiguous overlap.
 *
 * Order matters and is stated: **zero-length segments are dropped first**, then exact duplicates of
 * one net are collapsed, then the ambiguity check runs over what is left. Running the ambiguity
 * check first would report every duplicate pair as an ambiguous overlap, which is the failure this
 * module exists to avoid - a duplicate is a known, countable backend artefact, and the ambiguous
 * arm is for the shape nobody has a reading for.
 */
export function canonicalTopology(l: BlockLayout, pins: readonly PlacedPin[]): CanonicalTopology {
  const extent = l.wires.filter((w) => !samePoint(w.a, w.b))
  const zeroLength = l.wires.length - extent.length

  const kept: Wire[] = []
  const seen = new Set<string>()
  let collapsed = 0
  for (const w of extent) {
    const key = `${w.net} ${geometryKey(w)}`
    if (seen.has(key)) {
      collapsed += 1
      continue
    }
    seen.add(key)
    kept.push(w)
  }

  const ambiguous = ambiguousOverlaps(kept)
  if (ambiguous.length > 0) return { ok: false, ambiguous, collapsed, zeroLength }

  return { ok: true, wires: kept, branches: branchesOf(kept, pins), collapsed, zeroLength }
}

/**
 * The pins `pins` holds that a branch claims to sit on, checked against the topology's own
 * classification.
 *
 * **WHY THE PIN LIST IS A PARAMETER OF THE FUNCTIONS BELOW AND NOT JUST OF `canonicalTopology`.**
 * The brief's signatures pass it to all three, and a parameter nothing reads is dead weight - so it
 * is read, as a consistency check that can fail: an `"at-pin-end"` branch must coincide with a pin
 * in the list it is handed. The defect that catches is a caller computing the topology from one
 * placement set and the junctions from another, which would classify a branch against pins that are
 * no longer where they were and emit a junction at a point that is no longer an attachment. It
 * costs nothing and it is the only use of the parameter that is not decoration.
 */
function assertPinsAgree(t: Extract<CanonicalTopology, { ok: true }>, pins: readonly PlacedPin[], caller: string): void {
  for (const b of t.branches) {
    if (b.kind !== "at-pin-end") continue
    if (pins.some((p) => p.net === b.net && samePoint(p.at, b.at))) continue
    throw new Error(
      `${caller}: the branch of net ${b.net} at ${fmtPoint(b.at)} was classified "at-pin-end" by ` +
        "canonicalTopology, and the pin list passed here has no pin of that net at that point. The " +
        "two calls were given different placements. Pass the same PlacedPin[] to canonicalTopology " +
        "and to this function; it is not reclassified here, because a junction emitted at a point " +
        "that is no longer a pin end is a connection the schematic does not have.",
    )
  }
}

/** Every branch point of every net, which KiCad connects only with a junction object. */
export function branchJunctions(t: CanonicalTopology, pins: readonly PlacedPin[]): readonly Point[] {
  if (!t.ok) return []
  assertPinsAgree(t, pins, "branchJunctions")
  const seen = new Map<string, Point>()
  for (const b of t.branches) if (!seen.has(pointKey(b.at))) seen.set(pointKey(b.at), b.at)
  return [...seen.values()].sort((a, b) => a.y - b.y || a.x - b.x)
}

/**
 * Every way `emitted` disagrees with the junctions this topology requires - obligation 2's refusal.
 *
 * Three ways, and the third is the half the obligation states as *"every emitted junction sits on
 * exactly one net"*:
 *
 * 1. a branch point with no emitted junction: *"a net's branch point carrying none is a refusal
 *    rather than a cosmetic miss"*;
 * 2. an emitted junction at a point that is no net's branch point: a dot that asserts a connection
 *    the topology does not have;
 * 3. an emitted junction at a point where two DIFFERENT nets meet: *"a crossing between different
 *    nets carries no junction"*, and one there is a short the netlist would export.
 */
export function junctionProblems(
  t: CanonicalTopology,
  pins: readonly PlacedPin[],
  emitted: readonly Point[],
): readonly string[] {
  if (!t.ok) {
    return [
      "the canonical topology was refused, so the junctions it requires are unknown; fix the " +
        "ambiguous overlaps it named before asking what to emit",
    ]
  }
  assertPinsAgree(t, pins, "junctionProblems")
  const required = branchJunctions(t, pins)
  const emittedKeys = new Set(emitted.map(pointKey))
  const requiredKeys = new Set(required.map(pointKey))
  const crossingKeys = new Set(crossings(t).map(pointKey))
  const out: string[] = []

  for (const b of t.branches) {
    if (emittedKeys.has(pointKey(b.at))) continue
    out.push(
      `net ${b.net} branches at ${fmtPoint(b.at)} (${b.kind}) and no junction is emitted there; ` +
        "KiCad joins a branch point only with a junction object, so the drawing would show a " +
        "connection the netlist does not make",
    )
  }
  for (const p of emitted) {
    if (crossingKeys.has(pointKey(p)) && !requiredKeys.has(pointKey(p))) {
      out.push(
        `a junction is emitted at ${fmtPoint(p)}, where segments of DIFFERENT nets meet. A crossing ` +
          "carries no junction: one there shorts the two nets in the exported netlist",
      )
      continue
    }
    if (!requiredKeys.has(pointKey(p))) {
      out.push(
        `a junction is emitted at ${fmtPoint(p)}, which is no net's branch point in this topology; ` +
          "a dot there asserts a connection the geometry does not have",
      )
    }
  }
  return out
}

/**
 * Two segments of DIFFERENT nets meeting at a point: never a junction.
 *
 * "Meeting" is any contact - two ends coincident, one end on the other's interior, or two interiors
 * crossing - because every one of them is a place a reader joins two lines and KiCad does not. It
 * takes no pin list: a crossing is a property of two segments and their nets, and `crossings` is
 * the function obligation 2's *"a crossing between different nets carries no junction"* is about.
 */
export function crossings(t: CanonicalTopology): readonly Point[] {
  if (!t.ok) return []
  const seen = new Map<string, Point>()
  for (let i = 0; i < t.wires.length; i += 1) {
    for (let j = i + 1; j < t.wires.length; j += 1) {
      const a = t.wires[i]
      const b = t.wires[j]
      if (a === undefined || b === undefined || a.net === b.net) continue
      for (const p of contactPoints(a, b)) if (!seen.has(pointKey(p))) seen.set(pointKey(p), p)
    }
  }
  return [...seen.values()].sort((a, b) => a.y - b.y || a.x - b.x)
}

/** Every point at which two axis-aligned segments touch. Collinear overlaps never reach here. */
function contactPoints(a: Wire, b: Wire): readonly Point[] {
  const out: Point[] = []
  for (const end of [a.a, a.b]) if (onSegment(end, b.a, b.b)) out.push(end)
  for (const end of [b.a, b.b]) if (onSegment(end, a.a, a.b)) out.push(end)
  if (isHorizontal(a) !== isHorizontal(b)) {
    const h = isHorizontal(a) ? a : b
    const v = isHorizontal(a) ? b : a
    const p: Point = { x: v.a.x, y: h.a.y }
    if (onSegment(p, h.a, h.b) && onSegment(p, v.a, v.b)) out.push(p)
  }
  return out
}
