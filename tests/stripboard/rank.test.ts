/**
 * Task 15: the ranking, and `A_occ`.
 *
 * THE AUTHORITY for everything asserted here is `OBJ3` in
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`, and
 * the brief at
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/task-15-brief.md`.
 *
 * WHAT THESE TESTS PROVE AND WHAT THEY DO NOT. Every assertion below is
 * stated against a hand-constructed tuple or a hand-counted rectangle whose
 * expected value is written independently of `rank.ts`'s own arithmetic -
 * never `expect(x).toBe(<the same expression x was computed by>)`, which
 * looks like a derivation and passes however wrong both sides are
 * identically.
 *
 * `occupiedArea`'s own test is a LITERAL, not a recomputed formula, and that
 * is a correction rather than a style choice: an earlier version restated
 * `(maxRow - minRow + 1) * (maxCol - minCol + 1)` over `dump.bounds!` on the
 * expected side, which reads like a second path but is the same formula
 * written twice - it catches accidental drift but not a shared conceptual
 * error, most importantly a wrong `+1` convention, because an off-by-one in
 * the inclusive-rectangle count appears identically on both sides and the
 * test still passes. The hardcoded figures below, stated beside the
 * rectangle's own corners, are a real independent derivation: a reader
 * counts the holes by hand and checks the number, which the formula cannot
 * be checked against by anyone who does not already trust it.
 */
import { expect, test } from "bun:test"
import { compareRanking, occupiedArea, RANKING, rankingTuple } from "../../tools/stripboard/rank.ts"
import { dumpWithBounds, dumpWithoutBounds, REFERENCE, score } from "./rank-fixtures.ts"

test("RANKING names all five terms in the tuple's order, and carries prose for each", () => {
  // A reviewable ranking beats a weighted sum with tuned coefficients, and a
  // declared order with no reasons is not reviewable.
  //
  // WHAT THIS TEST PROVES is that each of the five terms is named, that they
  // appear in the order rankingTuple produces, and that each name is followed by
  // some prose before the next one. WHAT IT DOES NOT PROVE is that the prose is
  // a REASON - no test can, and the previous version asserted
  // RANKING.length > 400 under a name that claimed it did, which a single long
  // sentence satisfies. The reason being a reason is the owner's judgement at
  // review time, and that is stated rather than simulated.
  const terms = ["cuts", "wire", "solder", "A_occ", "wirelength"]
  const positions = terms.map((term) => RANKING.indexOf(term))
  for (const [index, at] of positions.entries()) {
    expect(at, `${terms[index]} is not named in RANKING`).toBeGreaterThanOrEqual(0)
  }
  expect(positions, "RANKING must name the terms in the tuple's own order")
    .toEqual([...positions].sort((a, b) => a - b))
  for (const [index, at] of positions.entries()) {
    const next = positions[index + 1] ?? RANKING.length
    const prose = RANKING.slice(at + (terms[index]?.length ?? 0), next).trim()
    expect(prose.length, `${terms[index]} is named with no prose after it`).toBeGreaterThan(40)
  }
  expect(RANKING).toMatch(/proxy/)
})

test("the tuple is in the declared order, and area never outranks a construction cost", () => {
  const cheapBigBoard = rankingTuple(score({ cuts: 1 }), dumpWithBounds(0, 0, 30, 30), REFERENCE)
  const dearSmallBoard = rankingTuple(score({ cuts: 2 }), dumpWithBounds(0, 0, 2, 2), REFERENCE)
  expect(compareRanking(cheapBigBoard, dearSmallBoard)).toBeLessThan(0)
})

test("A_occ separates two candidates that F cannot", () => {
  const same = score({ cuts: 1, wires: 0, solder: 0 })
  const tight = rankingTuple(same, dumpWithBounds(0, 0, 2, 2), REFERENCE)
  const sprawling = rankingTuple(same, dumpWithBounds(0, 0, 20, 20), REFERENCE)
  expect(compareRanking(tight, sprawling)).toBeLessThan(0)
})

test("A_occ is a hand-counted rectangle, on a square board and a non-square one", () => {
  // BOUNDS 3,5 9,11, with minRow and minCol different (3 and 5), catches a
  // MIXED-AXIS read - subtracting minCol from maxRow by mistake, the
  // plausible copy-paste error: (9-5+1)*(11-3+1) = 5*9 = 45, not 49. Rows
  // 3,4,5,6,7,8,9 - seven of them. Columns 5,6,7,8,9,10,11 - seven of them.
  // 7 * 7 = 49 holes.
  expect(occupiedArea(dumpWithBounds(3, 5, 9, 11))).toBe(49)
  // BOUNDS 0,0 2,5, non-square, catches a DOUBLED DIMENSION - rows*rows or
  // cols*cols instead of rows*cols: 3*3 = 9 and 6*6 = 36, neither is 18. The
  // square fixture above cannot catch this, because 7*7 is the right answer
  // there. Neither fixture catches a swapped multiplication order
  // (cols*rows instead of rows*cols): area is commutative, so that error is
  // undetectable by any rectangle and these two are not for it. Rows 0,1,2
  // - three of them. Columns 0,1,2,3,4,5 - six of them. 3 * 6 = 18 holes.
  expect(occupiedArea(dumpWithBounds(0, 0, 2, 5))).toBe(18)
})

test("A_occ refuses a dump with no BOUNDS, rather than substituting the pin extent", () => {
  // D19: the bounding box of the PIN and WIRE holes measures lead extent
  // rather than the footprint rectangle, so substituting it would silently
  // redefine a settled ranking term, which is a change to a decision and not
  // an implementation detail.
  expect(() => occupiedArea(dumpWithoutBounds())).toThrow(/BOUNDS/)
})

test("the wirelength term is named and documented as a proxy, not as a measurement", async () => {
  const text = await Bun.file("tools/stripboard/rank.ts").text()
  expect(text).toMatch(/proxy for track length/)
  expect(text).toMatch(/H-11/)
})

test("a plateau walk under this order cannot cycle", () => {
  // A strict decrease in a lexicographic order over a finite set of integer
  // tuples terminates, so a plateau walk either leaves the plateau or stops.
  // Asserted as the property the climb relies on: the comparison is a strict
  // weak order.
  const tuples = [rankingTuple(score({ cuts: 1 }), dumpWithBounds(0, 0, 2, 2), REFERENCE),
                  rankingTuple(score({ cuts: 1 }), dumpWithBounds(0, 0, 3, 3), REFERENCE),
                  rankingTuple(score({ cuts: 0 }), dumpWithBounds(0, 0, 9, 9), REFERENCE)]
  for (const a of tuples) for (const b of tuples) {
    if (compareRanking(a, b) < 0) expect(compareRanking(b, a)).toBeGreaterThan(0)
    if (compareRanking(a, b) === 0) expect(compareRanking(b, a)).toBe(0)
  }
})
