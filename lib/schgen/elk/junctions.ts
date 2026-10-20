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
      /**
       * How many same-net collinear CONTAINMENTS were collapsed onto their container - ruling
       * **R31**, spec §1.4 revision 5. **Reported, never silent**, for the same reason `collapsed`
       * is: a drawing whose canonicalisation removed thirty segments is a finding about the backend
       * even when the result is valid, and this count IS the measure of **G189**'s chain-routing
       * defect once the refusal stops hiding it.
       */
      readonly contained: number
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
  | {
      readonly ok: false
      readonly ambiguous: readonly string[]
      readonly collapsed: number
      readonly zeroLength: number
      /** Zero on this arm unless the containments were collapsed before the refusal was reached. */
      readonly contained: number
    }

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

/**
 * One wire named for a refusal, **by its index in the list `canonicalTopology` was HANDED**.
 *
 * **IT IS NOT THE INDEX IN THE POST-DEDUPLICATION LIST, AND THE DIFFERENCE COST A REVIEWER A WRONG
 * INTERMEDIATE CONCLUSION.** Round 1 numbered the survivors, so a message saying *"wire 17"* named
 * nothing a reader could find in the geometry they had in front of them - zero-length drops and
 * duplicate collapses had already shifted every index. `Tracked` carries the original position
 * through both, so the number in a message indexes `l.wires` as the caller built it.
 */
interface Tracked {
  readonly wire: Wire
  /** Position in the `BlockLayout.wires` list handed to `canonicalTopology`. */
  readonly index: number
}

const describe = (t: Tracked): string =>
  `wire ${t.index} (net ${t.wire.net}, ${fmtPoint(t.wire.a)}-${fmtPoint(t.wire.b)})`

/**
 * The span of a collinear segment along its own axis, as `[lo, hi]`.
 *
 * Only meaningful against another segment on the SAME line, which `collinearOverlap` establishes.
 */
function spanOf(w: Wire): readonly [number, number] {
  const along = (p: Point): number => (isHorizontal(w) ? p.x : p.y)
  const a = along(w.a)
  const b = along(w.b)
  return a <= b ? [a, b] : [b, a]
}

/** True when `inner`'s span lies wholly within `outer`'s. Equal spans are deduplicated earlier. */
function contains(outer: Wire, inner: Wire): boolean {
  const [ol, oh] = spanOf(outer)
  const [il, ih] = spanOf(inner)
  return ol <= il && ih <= oh
}

/**
 * Every ambiguous overlap in `wires`, named - clause (d) as **spec §1.4 revision 5** refines it.
 *
 * **CONTAINMENTS ARE NOT HERE ANY MORE, AND THE REFINEMENT IS NARROW.** Round 1 of this function
 * refused every same-net collinear overlap that was not an exact duplicate, and called them all
 * *partial*. **That word was wrong where it decided the ruling.** The Task 13 review rebuilt wire
 * provenance from ELK's raw sections and measured the interval relation of every pair over all
 * twelve blocks: **30 of 30 are CONTAINMENTS** - one span wholly inside the other, same net, same
 * line, between two CONSECUTIVE edges of the routed chain (`X:k` and `X:k+1`) - **0 partial, 0
 * cross-net**, and identically so with padding and the remaining spacings at whole grid steps.
 *
 * A same-net collinear containment has exactly one reading: **the interval union IS the longer
 * segment.** Dropping the contained one changes neither the drawn picture nor the connectivity, so
 * it is deduplication one dimension up - clause (a)'s own job applied to a containment rather than
 * to an exact coincidence. Controller ruling **R31** settles it, and `collapseContainments` does it,
 * counted and never silent.
 *
 * **WHAT STILL REFUSES, and both arms stay armed:**
 *
 * - **a CROSS-NET collinear overlap, including two exactly equal geometries.** That is not a
 *   duplicate at all: it is a short drawn as one line, and deduplicating it would delete one of two
 *   nets' wires and leave the drawing asserting a connection nobody declared;
 * - **a same-net NON-containment overlap - a genuine partial.** Neither span covers the other, so
 *   the shared stretch belongs to both readings and nothing here may choose one. **The measured
 *   population is 0 of 30**, so this is currently a guard against a shape this corpus does not
 *   produce, and R31 says in as many words that it stays armed for the first one that does.
 */
function ambiguousOverlaps(wires: readonly Tracked[]): readonly string[] {
  const out: string[] = []
  for (let i = 0; i < wires.length; i += 1) {
    for (let j = i + 1; j < wires.length; j += 1) {
      const a = wires[i]
      const b = wires[j]
      if (a === undefined || b === undefined) continue
      const overlap = collinearOverlap(a.wire, b.wire)
      if (overlap === null) continue
      if (a.wire.net === b.wire.net) {
        // A containment has one reading and was collapsed before this ran; an exact duplicate was
        // collapsed before that. What is left on one net is a genuine partial.
        if (contains(a.wire, b.wire) || contains(b.wire, a.wire)) {
          throw new Error(
            `${describe(a)} and ${describe(b)} are a same-net containment and reached the ` +
              "ambiguity check, which collapseContainments should have removed before it. This is " +
              "a defect in lib/schgen/elk/junctions.ts, not a layout that cannot be drawn.",
          )
        }
        out.push(
          `${describe(a)} and ${describe(b)} overlap along ${fmtPoint(overlap[0])}-${fmtPoint(overlap[1])} ` +
            "and NEITHER span contains the other, so this is a genuine partial: the shared stretch " +
            "belongs to both readings and nothing here may choose one. A containment would have " +
            "been collapsed (spec 1.4 revision 5, ruling R31); this is not repaired (obligation 5), " +
            "so split or reroute the segment upstream.",
        )
        continue
      }
      out.push(
        `${describe(a)} and ${describe(b)} overlap along ${fmtPoint(overlap[0])}-${fmtPoint(overlap[1])}, ` +
          `and they are on different nets (${a.wire.net} and ${b.wire.net}), so this is a short ` +
          "drawn as one line. It is not deduplicated: deleting either wire would leave the drawing " +
          "asserting a connection nobody declared.",
      )
    }
  }
  return out
}

/**
 * Same-net collinear containments collapsed onto the containing segment - **ruling R31**.
 *
 * A single pass suffices and the reason is worth stating: a segment is dropped only when another
 * segment of its net strictly contains it, and containment is transitive, so if the container is
 * itself dropped its own container covers the inner one too. Equal spans never reach here - they
 * are exact duplicates and `collapsed` has already taken them.
 */
function collapseContainments(wires: readonly Tracked[]): { readonly kept: readonly Tracked[]; readonly contained: number } {
  const kept = wires.filter((t, i) =>
    !wires.some((other, j) => {
      if (i === j || other.wire.net !== t.wire.net) return false
      if (collinearOverlap(t.wire, other.wire) === null) return false
      const [tl, th] = spanOf(t.wire)
      const [ol, oh] = spanOf(other.wire)
      // Strictly longer, so of two equal spans neither removes the other (and duplicates are gone).
      return ol <= tl && th <= oh && oh - ol > th - tl
    }),
  )
  return { kept, contained: wires.length - kept.length }
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
 * **The order is load-bearing and is stated once, here:**
 *
 * 1. **zero-length segments are dropped**, counted as `zeroLength`;
 * 2. **exact same-net duplicates are collapsed**, counted as `collapsed` - clause (a);
 * 3. **same-net collinear CONTAINMENTS are collapsed onto the container**, counted as `contained` -
 *    clause (a) one dimension up, ruling **R31**;
 * 4. **the ambiguity check runs over what is left** - cross-net overlaps and genuine partials.
 *
 * Running the ambiguity check earlier would report every duplicate and every containment as
 * ambiguous, which is the failure this module exists to avoid: those are known, countable backend
 * artefacts, and the ambiguous arm is for the shape nobody has a reading for.
 *
 * **R31's JUSTIFICATION SAYS THE COLLAPSE PRESERVES CONNECTIVITY, AND THAT IS TRUE ONLY WITH A
 * JUNCTION - WHICH OBLIGATION 2 IS WHAT ENFORCES.** The ruling's reason is that the contained
 * span's endpoints *"stay covered by the survivor"*. They do, geometrically. But
 * `connectedComponents` joins a wire to a wire or a pin **only at coincident ENDS** - its own
 * module comment says so, because *"a pin end or wire end on a wire's INTERIOR connects ONLY with a
 * junction there"* - so after the collapse, whatever ended at the contained segment's far endpoint
 * sits in the container's INTERIOR and is joined only if a junction is emitted at that point.
 *
 * **A partition comparison here was written, measured and then DELETED, and both halves are worth
 * knowing** (`docs/known-gaps.md` **G194**). `[RAN]` It fires: on `tp-leg-upper` the collapse takes
 * a 4-piece partition to 5, so the concern is real rather than theoretical, and with the guard in
 * place **R31 could not take effect on any block**. But `connectedComponents` cannot see junctions
 * by construction, so the guard was answering a question with a model that excludes the answer.
 * **The gate that does see it is obligation 2**: the collapse makes that endpoint a degree-3 branch
 * point, `branchJunctions` requires a junction there, `junctionPoints` does not emit one at a
 * pass-through, and `junctionProblems` refuses by name. `[RAN]` With R31 live, `oc-power` and
 * `tp-stage` refuse at exactly that gate naming exactly those points. The check exists and is more
 * precise than the guard was, and two checks for one question is what `CLAUDE.md` forbids.
 */
export function canonicalTopology(l: BlockLayout, pins: readonly PlacedPin[]): CanonicalTopology {
  const extent: Tracked[] = []
  l.wires.forEach((wire, index) => {
    if (!samePoint(wire.a, wire.b)) extent.push({ wire, index })
  })
  const zeroLength = l.wires.length - extent.length

  const deduped: Tracked[] = []
  const seen = new Set<string>()
  let collapsed = 0
  for (const t of extent) {
    const key = `${t.wire.net}\u0000${geometryKey(t.wire)}`
    if (seen.has(key)) {
      collapsed += 1
      continue
    }
    seen.add(key)
    deduped.push(t)
  }

  const { kept, contained } = collapseContainments(deduped)

  const ambiguous = ambiguousOverlaps(kept)
  if (ambiguous.length > 0) return { ok: false, ambiguous, collapsed, zeroLength, contained }

  return {
    ok: true,
    wires: kept.map((t) => t.wire),
    branches: branchesOf(kept.map((t) => t.wire), pins),
    collapsed,
    zeroLength,
    contained,
  }
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
    // **The cross-net arm is tested FIRST and unconditionally** - round 1 guarded it with
    // `&& !requiredKeys.has(...)`, so a point that is simultaneously one net's branch AND another
    // net's contact was accepted. The obligation is *"every emitted junction sits on exactly one
    // net"*, which that reading made non-total: a junction there shorts the second net however
    // legitimately the first one branches. Benign on today's corpus and not a reason to leave a
    // partial check.
    if (crossingKeys.has(pointKey(p))) {
      out.push(
        `a junction is emitted at ${fmtPoint(p)}, where segments of DIFFERENT nets meet. A crossing ` +
          "carries no junction: one there shorts the two nets in the exported netlist" +
          (requiredKeys.has(pointKey(p))
            ? ". It is ALSO a branch point of one net, which does not excuse it: a junction sits on " +
              "exactly one net, and this point carries two"
            : ""),
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
