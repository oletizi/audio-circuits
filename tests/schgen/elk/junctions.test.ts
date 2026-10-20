/**
 * SPEC §1.4 REVISION 4, DRIVEN: THE CANONICAL TOPOLOGY, AND OBLIGATION 2 TAKEN OVER IT.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan. The cases are the brief's own, and
 * the canonicalisation ones come first because every assertion below them is taken over its output.
 *
 * **THE LAST TEST IS THE CROSSING-VERSUS-T-JUNCTION DISTINCTION MADE INTO A CHECK THAT COULD FAIL**,
 * and it is the one spec §1.4's obligation 2 left to an implementer's reading until revision 4.
 */

import { expect, test } from "bun:test"
import { branchJunctions, canonicalTopology, crossings, junctionProblems } from "../../../lib/schgen/elk/junctions.ts"
import { checkWireSafety } from "../../../lib/schgen/render/wire-safety.ts"
import { junctionPoints } from "../../../lib/schgen/render/connectivity.ts"
import type { ConnItem } from "../../../lib/schgen/render/connectivity.ts"
import { GRID } from "../../../lib/schgen/render/geometry.ts"
import type { BlockLayout, Wire } from "../../../lib/schgen/render/block-types.ts"
import type { PlacedPin } from "../../../lib/schgen/render/unit-pins.ts"

const layout = (wires: readonly Wire[]): BlockLayout => ({ placements: [], wires: [...wires], anchors: [] })

const G = (n: number): number => n * GRID

/** `n` extra copies of one segment, on one net: `n + 1` wires in and one out. */
function withDuplicateSegments(n: number): BlockLayout {
  const w: Wire = { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" }
  const copies: Wire[] = []
  for (let i = 0; i <= n; i += 1) copies.push({ ...w })
  // One further, distinct segment so `wires.length` after canonicalisation is not simply 1.
  copies.push({ a: { x: 0, y: G(2) }, b: { x: G(4), y: G(2) }, net: "A" })
  return layout(copies)
}

/**
 * A T whose branch point IS a pin end: two collinear segments meeting at the pin, plus a stem.
 *
 * Three arrivals at the pin - two wire ends and the pin itself - so the net's degree there is three
 * and it is a branch. `branchOnPinEnd` deliberately has exactly ONE branch point, so the assertion
 * on `kind` can be an equality over the whole list rather than a search.
 */
function branchOnPinEnd(): { readonly l: BlockLayout; readonly pins: readonly PlacedPin[] } {
  const at = { x: G(2), y: 0 }
  return {
    l: layout([
      { a: { x: 0, y: 0 }, b: at, net: "A" },
      { a: at, b: { x: G(4), y: 0 }, net: "A" },
      { a: at, b: { x: G(2), y: G(3) }, net: "A" },
    ]),
    pins: [{ part: "R_A", unit: 1, pin: "1", at, net: "A" }],
  }
}

/**
 * Two collinear segments of one net where **NEITHER span contains the other** - a genuine partial.
 *
 * `0..4` and `2..6`: they share `2..4` and each runs past the other, so the shared stretch has two
 * readings and clause (d) refuses. This is the shape ruling **R31** leaves refusing, and the shape
 * the twelve parity blocks do **not** produce (measured: 0 of 30).
 */
function partiallyOverlappingSegments(): BlockLayout {
  return layout([
    { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    { a: { x: G(2), y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
  ])
}

/**
 * Two collinear segments of one net where one span lies **wholly inside** the other - a containment.
 *
 * `0..6` contains `0..4`, sharing the `0` endpoint, which is the exact shape the routed chain
 * produces: two CONSECUTIVE edges meeting at a terminal, the second retracing the first and running
 * on. **30 of the 30 overlaps across all twelve blocks are this**, and ruling **R31** collapses it.
 */
function containedSegment(): BlockLayout {
  return layout([
    { a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
    { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
  ])
}

/**
 * One net of degree four drawn as a tree: a spine with two stems, so TWO branch points.
 *
 * Each branch point has three arrivals - the spine entering, the spine leaving, and the stem - and
 * neither coincides with a pin, so both are `t-junction`s.
 */
function fourWayFan(): BlockLayout {
  return layout([
    { a: { x: 0, y: 0 }, b: { x: G(2), y: 0 }, net: "A" },
    { a: { x: G(2), y: 0 }, b: { x: G(5), y: 0 }, net: "A" },
    { a: { x: G(5), y: 0 }, b: { x: G(7), y: 0 }, net: "A" },
    { a: { x: G(2), y: 0 }, b: { x: G(2), y: G(3) }, net: "A" },
    { a: { x: G(5), y: 0 }, b: { x: G(5), y: G(3) }, net: "A" },
  ])
}

/** A horizontal segment of net `A` and a vertical one of net `B`, interiors crossing once. */
function twoNetsCrossing(): BlockLayout {
  return layout([
    { a: { x: 0, y: G(2) }, b: { x: G(6), y: G(2) }, net: "A" },
    { a: { x: G(3), y: 0 }, b: { x: G(3), y: G(5) }, net: "B" },
  ])
}

const NO_PINS: readonly PlacedPin[] = []

test("coincident duplicate segments collapse to one, and the count is reported", () => {
  const t = canonicalTopology(withDuplicateSegments(3), NO_PINS)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.collapsed).toBe(3)
  expect(t.wires.length).toBe(2)
  expect(t.zeroLength).toBe(0)
})

test("zero-length segments are dropped and counted SEPARATELY from duplicates", () => {
  const l = layout([
    { a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, net: "A" },
    { a: { x: G(1), y: G(1) }, b: { x: G(1), y: G(1) }, net: "A" },
    { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
  ])
  const t = canonicalTopology(l, NO_PINS)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  // The two counts must not be summed: the spikes measured them as separate facts (G106).
  expect(t.zeroLength).toBe(2)
  expect(t.collapsed).toBe(1)
  expect(t.wires.length).toBe(1)
})

test("a branch at a pin end is a different object from one in free space", () => {
  const { l, pins } = branchOnPinEnd()
  const t = canonicalTopology(l, pins)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.branches.map((b) => b.kind)).toEqual(["at-pin-end"])
  // The SAME geometry with no pin there is a t-junction, which is what makes the kind load-bearing.
  const bare = canonicalTopology(l, NO_PINS)
  expect(bare.ok).toBe(true)
  if (bare.ok) expect(bare.branches.map((b) => b.kind)).toEqual(["t-junction"])
})

test("an overlap that is neither a duplicate nor a containment REFUSES, naming both segments", () => {
  const t = canonicalTopology(partiallyOverlappingSegments(), NO_PINS)
  expect(t.ok).toBe(false)
  if (!t.ok) {
    expect(t.ambiguous.join(" ")).toContain("wire 0")
    expect(t.ambiguous.join(" ")).toContain("wire 1")
    expect(t.ambiguous.join(" ")).toContain("NEITHER span contains the other")
  }
})

test("two IDENTICAL segments of DIFFERENT nets are a short, not a duplicate, and REFUSE", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "B" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(false)
  if (!t.ok) expect(t.ambiguous.join(" ")).toContain("different nets")
})

test("a net of degree 4 drawn as a tree needs a junction at every branch point", () => {
  const t = canonicalTopology(fourWayFan(), NO_PINS)
  expect(t.ok).toBe(true)
  expect(branchJunctions(t, NO_PINS).length).toBe(2)
})

test("a branch point with no emitted junction REFUSES", () => {
  const t = canonicalTopology(fourWayFan(), NO_PINS)
  expect(junctionProblems(t, NO_PINS, []).length).toBe(2)
  // And emitting exactly the required ones leaves no problem, so the count above is not vacuous.
  expect(junctionProblems(t, NO_PINS, branchJunctions(t, NO_PINS))).toEqual([])
})

test("a junction emitted where no net branches is a problem too", () => {
  const t = canonicalTopology(fourWayFan(), NO_PINS)
  const stray = [...branchJunctions(t, NO_PINS), { x: G(100), y: G(100) }]
  const problems = junctionProblems(t, NO_PINS, stray)
  expect(problems.length).toBe(1)
  expect(problems[0] ?? "").toContain("no net's branch point")
})

test("two different nets meeting at a point are a crossing, and carry no junction", () => {
  const t = canonicalTopology(twoNetsCrossing(), NO_PINS)
  expect(t.ok).toBe(true)
  expect(crossings(t).length).toBe(1)
  expect(branchJunctions(t, NO_PINS)).toEqual([])
  // And a junction emitted AT that crossing is reported as the short it would be.
  const problems = junctionProblems(t, NO_PINS, crossings(t))
  expect(problems.length).toBe(1)
  expect(problems[0] ?? "").toContain("DIFFERENT nets")
})

test("a same-net X is a branch and NOT a crossing, which is the distinction stated the other way", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: G(2) }, b: { x: G(6), y: G(2) }, net: "A" },
      { a: { x: G(3), y: 0 }, b: { x: G(3), y: G(5) }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(crossings(t)).toEqual([])
  expect(branchJunctions(t, NO_PINS)).toEqual([{ x: G(3), y: G(2) }])
})

test("a branch classified at-pin-end against pins that do not hold it REFUSES, naming the point", () => {
  const { l, pins } = branchOnPinEnd()
  const t = canonicalTopology(l, pins)
  expect(t.ok).toBe(true)
  // The defect this catches: the topology was built from one placement set and the junctions are
  // being asked for against another, so a junction would land where a pin no longer is.
  expect(() => branchJunctions(t, NO_PINS)).toThrow(/different placements/)
  expect(() => junctionProblems(t, NO_PINS, [])).toThrow(/different placements/)
})

test("a refused topology answers nothing rather than answering emptily", () => {
  const t = canonicalTopology(partiallyOverlappingSegments(), NO_PINS)
  expect(t.ok).toBe(false)
  expect(branchJunctions(t, NO_PINS)).toEqual([])
  expect(crossings(t)).toEqual([])
  // ... and asking what to emit says so, rather than returning "no problems".
  expect(junctionProblems(t, NO_PINS, []).length).toBe(1)
  expect(junctionProblems(t, NO_PINS, [])[0] ?? "").toContain("was refused")
})

/**
 * **RULING R31, DRIVEN: a same-net collinear containment is deduplication one dimension up.**
 *
 * The interval union IS the container, so there is exactly one reading, and the count is reported
 * the way `collapsed` is. Before R31 this shape refused, and **that refusal was what stopped all
 * twelve parity blocks** - so this test is the difference between the generator refusing everything
 * and the generator getting as far as the next gate.
 */
test("a same-net containment COLLAPSES onto its container, and the count is reported", () => {
  const t = canonicalTopology(containedSegment(), NO_PINS)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.contained).toBe(1)
  expect(t.collapsed).toBe(0)
  expect(t.zeroLength).toBe(0)
  // The CONTAINER survives, not the contained one: the union is the longer span.
  expect(t.wires.length).toBe(1)
  expect(t.wires[0]?.b).toEqual({ x: G(6), y: 0 })
})

test("a containment is counted apart from an exact duplicate, which is a different defect", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
      { a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.collapsed).toBe(1)
  expect(t.contained).toBe(1)
  expect(t.wires.length).toBe(1)
})

/**
 * **THE PARTIAL ARM STAYS ARMED, and R31 says so in as many words.** Its measured population on
 * this corpus is 0 of 30, so nothing would notice if it were quietly dropped along with the
 * containments - which is exactly why it is driven here.
 */
test("a same-net GENUINE PARTIAL still REFUSES, and says that neither span contains the other", () => {
  const t = canonicalTopology(partiallyOverlappingSegments(), NO_PINS)
  expect(t.ok).toBe(false)
  if (!t.ok) {
    expect(t.ambiguous.length).toBe(1)
    expect(t.ambiguous.join(" ")).toContain("NEITHER span contains the other")
    expect(t.ambiguous.join(" ")).toContain("genuine partial")
  }
})

test("a containment of DIFFERENT nets still REFUSES: R31 is about one net", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "B" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(false)
  if (!t.ok) expect(t.ambiguous.join(" ")).toContain("different nets")
})

/**
 * **A REFUSAL NAMES A WIRE BY ITS INDEX IN THE LIST `canonicalTopology` WAS HANDED**, not by its
 * position among the survivors.
 *
 * Round 1 numbered the survivors, so *"wire 17"* named nothing a reader could find in the geometry
 * in front of them - zero-length drops and duplicate collapses had already shifted every index, and
 * it cost a reviewer a wrong intermediate conclusion. Here wires 0 and 1 are dropped before the
 * ambiguity check, so the surviving partial pair is at input indices **2 and 3** and at survivor
 * indices 0 and 1; the message must say 2 and 3.
 */
test("a refusal names a wire by its index in the INPUT list, not among the survivors", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: G(9) }, b: { x: 0, y: G(9) }, net: "Z" },
      { a: { x: G(8), y: G(9) }, b: { x: G(9), y: G(9) }, net: "Z" },
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: G(2), y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(false)
  if (!t.ok) {
    expect(t.zeroLength).toBe(1)
    expect(t.ambiguous.join(" ")).toContain("wire 2")
    expect(t.ambiguous.join(" ")).toContain("wire 3")
    expect(t.ambiguous.join(" ")).not.toContain("wire 0")
  }
})

/**
 * **DEVIATION 7's HOLDING MECHANISM, WHICH ROUND 1 CLAIMED AND DID NOT BUILD.**
 *
 * **ITS RESOLUTION IS COARSE, AND THAT IS WORTH KNOWING RATHER THAN DISCOVERING.** Every shape
 * below is built from whole grid steps, so the biconditional holds the two copies in step on
 * WHETHER there is a collinear overlap and not on the threshold at which each decides there is
 * one. A 1 µm overlap introduced into the ported `collinearOverlap` - changing `hi <= lo` to
 * `hi - lo <= 1`, say - goes **undetected** here, because no fixture places two segments that close
 * together. Not a defect in either copy; a limit of this coupling.
 *
 * `junctions.ts`'s `collinearOverlap` re-derives `wire-safety.ts`'s, which is module-private there.
 * Round 1's comment said this test *"holds them in step over four shapes"* - and the test never
 * imported `wire-safety.ts` and never evaluated `checkWireSafety`, so it asserted the coupling in
 * prose and a change to the ported copy turned nothing red. `checkWireSafety` IS exported, so the
 * mechanism was available and simply unused.
 *
 * The biconditional below is the coupling: **`checkWireSafety` reports a collinear overlap for a
 * shape exactly when `canonicalTopology` finds one** - as a duplicate (`collapsed`), as a
 * containment (`contained`) or as a refusal. The two functions disagreeing turns this red.
 */
test("the collinear-overlap rule agrees with wire-safety's, shape for shape", () => {
  const shapes: readonly { readonly name: string; readonly l: BlockLayout }[] = [
    { name: "genuine partial", l: partiallyOverlappingSegments() },
    { name: "containment", l: containedSegment() },
    { name: "exact duplicate", l: layout([
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    ]) },
    { name: "end to end", l: layout([
      { a: { x: 0, y: 0 }, b: { x: G(2), y: 0 }, net: "A" },
      { a: { x: G(2), y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
    ]) },
    { name: "parallel, not collinear", l: layout([
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: 0, y: G(1) }, b: { x: G(4), y: G(1) }, net: "A" },
    ]) },
    { name: "perpendicular crossing", l: layout([
      { a: { x: 0, y: 0 }, b: { x: G(4), y: 0 }, net: "A" },
      { a: { x: G(2), y: -G(1) }, b: { x: G(2), y: G(1) }, net: "A" },
    ]) },
  ]
  // A run over zero shapes, or over shapes that all agree trivially, would say nothing - so both
  // verdicts must actually occur across the table.
  let overlapping = 0
  for (const { name, l } of shapes) {
    const items: ConnItem[] = l.wires.map((w, i) => ({ kind: "wire", a: w.a, b: w.b, net: w.net, what: `wire ${i}` }))
    const portedSaysOverlap = checkWireSafety(items).some((p) => p.startsWith("collinear "))
    const t = canonicalTopology(l, NO_PINS)
    const hereSaysOverlap = t.ok ? t.collapsed + t.contained > 0 : true
    expect(hereSaysOverlap, `${name}: wire-safety says ${portedSaysOverlap}`).toBe(portedSaysOverlap)
    if (portedSaysOverlap) overlapping += 1
  }
  expect(overlapping).toBe(3)
  expect(shapes.length - overlapping).toBe(3)
})

/**
 * **M13's FIX, HELD BY A FIXTURE THAT DRIVES THE SHAPE IT IS ABOUT.**
 *
 * Round 2 tested the cross-net arm FIRST and unconditionally, and **reverting that change left the
 * suite green** - no fixture drove a point that is simultaneously one net's branch AND another
 * net's contact, so the guard it removed (`&& !requiredKeys.has(...)`) could not be caught putting
 * itself back. Here net `A` branches at the origin with three segments, and net `B` passes straight
 * through the same point. A junction there is legitimate for `A` and shorts `B`, and the obligation
 * is *"every emitted junction sits on exactly one net"* - so it must be reported, and the message
 * must say that being a branch point does not excuse it.
 */
test("a junction where one net branches AND another crosses is a problem, not an exemption", () => {
  // **Net `B` ENDS at the origin rather than passing through it, and that is forced rather than
  // chosen.** A degree-3 orthogonal branch occupies three of the four axes at its point, so any
  // straight line THROUGH it would be collinear with one of `A`'s own segments - a cross-net
  // collinear overlap, which clause (d) refuses before the junction rule is ever asked. The one
  // arrangement that makes the point both `A`'s branch and `B`'s contact is `B` arriving on the
  // fourth axis and stopping.
  const l = layout([
    { a: { x: -G(3), y: 0 }, b: { x: 0, y: 0 }, net: "A" },
    { a: { x: 0, y: 0 }, b: { x: G(3), y: 0 }, net: "A" },
    { a: { x: 0, y: 0 }, b: { x: 0, y: G(3) }, net: "A" },
    { a: { x: 0, y: -G(3) }, b: { x: 0, y: 0 }, net: "B" },
  ])
  const t = canonicalTopology(l, NO_PINS)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  const origin = { x: 0, y: 0 }
  // The premise: the point is BOTH a branch of A and a contact of B. Without both, this says nothing.
  expect(branchJunctions(t, NO_PINS)).toContainEqual(origin)
  expect(crossings(t)).toContainEqual(origin)
  const problems = junctionProblems(t, NO_PINS, [origin])
  expect(problems.length).toBe(1)
  expect(problems[0] ?? "").toContain("DIFFERENT nets")
  expect(problems[0] ?? "").toContain("does not excuse it")
})

/**
 * **RULING R33, DRIVEN: a branch point becomes a real segment end, and the count is reported.**
 *
 * A spine from 0 to 6 with a stem meeting it at 3 is one wire plus one wire in the router's output;
 * criterion (b) requires the branch to be explicit, so the spine comes out as 0-3 and 3-6. **No
 * point moves and no connection changes** - which is why R33 answers obligation 5's repair question
 * in the negative rather than waiving it.
 */
test("a segment is SPLIT at a branch point of its own net, and the count is reported", () => {
  const t = canonicalTopology(
    layout([
      { a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
      { a: { x: G(3), y: 0 }, b: { x: G(3), y: G(3) }, net: "A" },
    ]),
    NO_PINS,
  )
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.split).toBe(1)
  // The list GREW: two wires in, three out, and the same ink.
  expect(t.wires.length).toBe(3)
  const spine = t.wires.filter((w) => w.a.y === 0 && w.b.y === 0)
  expect(spine.length).toBe(2)
  expect(spine.map((w) => [w.a.x, w.b.x])).toEqual([[0, G(3)], [G(3), G(6)]])
  // And the branch is still a branch, now by three coincident ENDS rather than an end on an interior.
  expect(branchJunctions(t, NO_PINS)).toEqual([{ x: G(3), y: 0 }])
})

test("a segment is split at a PIN of its own net lying mid-wire, which is what checkWireSafety asks for", () => {
  const at = { x: G(3), y: 0 }
  const t = canonicalTopology(
    layout([{ a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" }]),
    [{ part: "R_A", unit: 1, pin: "1", at, net: "A" }],
  )
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.split).toBe(1)
  expect(t.wires.length).toBe(2)
})

/**
 * **A FOREIGN-NET PIN MID-WIRE IS NOT SPLIT FOR, AND THAT IS THE DIFFERENCE BETWEEN A
 * REPRESENTATION CHANGE AND HIDING A DEFECT.**
 *
 * `wireOverPins`' first refusal is *"wire (net X) passes over pin end (net Y)"* - a real clearance
 * defect. Dividing the wire around it would leave the geometry unchanged and the defect unreported,
 * which is exactly the repair obligation 5 forbids. So the splitter reads the net.
 */
test("a FOREIGN-net pin lying mid-wire is NOT split for", () => {
  const t = canonicalTopology(
    layout([{ a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" }]),
    [{ part: "R_B", unit: 1, pin: "1", at: { x: G(3), y: 0 }, net: "B" }],
  )
  expect(t.ok).toBe(true)
  if (!t.ok) return
  expect(t.split).toBe(0)
  expect(t.wires.length).toBe(1)
})

/**
 * **THE ORDER IS LOAD-BEARING AND THIS IS THE TEST THAT HOLDS IT.**
 *
 * A genuine partial - `0..4` and `2..6`, neither containing the other - would be split by R33 into
 * `0..2`/`2..4` and `2..4`/`4..6`, producing **two identical `2..4` segments** that the duplicate
 * rule would then quietly merge. **That would repair a shape clause (d) exists to refuse.** The
 * ambiguity check therefore runs BEFORE the split, and this asserts the refusal still happens rather
 * than the partial being silently tidied away.
 */
test("a genuine partial still REFUSES and is never silently split into duplicates", () => {
  const t = canonicalTopology(partiallyOverlappingSegments(), NO_PINS)
  expect(t.ok).toBe(false)
  if (!t.ok) {
    expect(t.ambiguous.length).toBe(1)
    expect(t.ambiguous.join(" ")).toContain("NEITHER span contains the other")
    // The refusal arm reports no split, because the split never ran.
    expect(t.split).toBe(0)
  }
})

/**
 * **R33 IS WHAT MAKES OBLIGATION 2 AND `checkWireSafety` AGREE**, which is the measurement that
 * reversed R32: before the split, `branchJunctions` wanted a junction at a point `junctionPoints`
 * was silent at and `checkWireSafety` refused outright. After it, all three agree.
 */
test("after the split, junctionPoints and branchJunctions agree and wire-safety is silent", () => {
  const l = layout([
    { a: { x: 0, y: 0 }, b: { x: G(6), y: 0 }, net: "A" },
    { a: { x: G(3), y: 0 }, b: { x: G(3), y: G(3) }, net: "A" },
  ])
  const t = canonicalTopology(l, NO_PINS)
  expect(t.ok).toBe(true)
  if (!t.ok) return
  const items: ConnItem[] = t.wires.map((w, i) => ({ kind: "wire", a: w.a, b: w.b, net: w.net, what: `wire ${i}` }))
  // The ported cosmetic rule now fires at the branch, because the split made it three coincident ends.
  expect(junctionPoints(items)).toEqual([{ x: G(3), y: 0 }])
  expect(branchJunctions(t, NO_PINS)).toEqual([{ x: G(3), y: 0 }])
  expect(junctionProblems(t, NO_PINS, junctionPoints(items))).toEqual([])
  // And the refusal that reversed R32 is gone: nothing ends mid-wire any more.
  expect(checkWireSafety(items).filter((p) => p.includes("mid-wire"))).toEqual([])
  // Anti-vacuity: the UNSPLIT geometry is what wire-safety refuses, so the line above means something.
  const unsplit: ConnItem[] = l.wires.map((w, i) => ({ kind: "wire", a: w.a, b: w.b, net: w.net, what: `wire ${i}` }))
  expect(checkWireSafety(unsplit).filter((p) => p.includes("mid-wire")).length).toBe(1)
})
