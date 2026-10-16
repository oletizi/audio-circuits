/**
 * PHASE 2 UNDER TEST: that the copper partition is built from GEOMETRY alone -
 * strips, cuts, wires and bridges - and that it never reads a net.
 *
 * **THE SEPARATION IS WHAT THESE TESTS ARE ABOUT.** `componentsOf` takes a
 * candidate and a cut list and nothing else; it is handed the same candidate with
 * different cut lists below and answers differently, which is the property a
 * phase 2 reusing phase 1's labels could not have. A board whose declared nets
 * agree with its wiring but whose geometry does not is what this phase exists to
 * catch, and the invariants in Task 5 read this partition rather than the board.
 *
 * **EVERY REFUSAL IS ASSERTED WITH `toStartWith` ON ITS KEY**, for the reason
 * `./cuts.test.ts` gives.
 */
import { expect, test } from "bun:test"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import { componentsOf } from "../../../lib/stripboard/connectivity.ts"
import { derivedCuts } from "../../../lib/stripboard/cuts.ts"
import {
  at,
  bridge,
  part,
  partAcrossTwoStrips,
  reference,
  twoNetsOnStripThree,
  wire,
  wireOnlyStripOneNet,
} from "./cuts-fixtures.ts"

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/** A bare board of the given size with nothing on it. */
function bare(strips: number, columns: number): Candidate {
  return { grid: { strips, columns }, placements: [], wires: [], bridges: [] }
}

test("an uncut strip is one conductor and two strips are two", () => {
  const components = componentsOf(bare(2, 4), [])
  expect(components.get("0,0")).toBe(components.get("0,3"))
  expect(components.get("1,0")).toBe(components.get("1,3"))
  expect(components.get("0,0")).not.toBe(components.get("1,0"))
})

test("every hole of the grid is in the partition, empty ones included", () => {
  const components = componentsOf(bare(3, 5), [])
  expect(components.size).toBe(15)
  expect(components.get("2,4")).toBeDefined()
})

test("a cut after column c separates hole c from hole c+1 and nothing else", () => {
  const components = componentsOf(bare(1, 6), [{ strip: 0, afterColumn: 2 }])
  expect(components.get("0,2")).toBe(components.get("0,0"))
  expect(components.get("0,3")).toBe(components.get("0,5"))
  expect(components.get("0,2")).not.toBe(components.get("0,3"))
  expect(new Set(components.values()).size, "one strip, one cut, two conductors").toBe(2)
})

test("a wire joins two holes on two strips", () => {
  const candidate: Candidate = {
    ...bare(4, 6),
    wires: [wire(at(0, 1), at(3, 4), "NET_A")],
  }
  expect(componentsOf(candidate, []).get("0,1")).toBe(componentsOf(candidate, []).get("3,4"))
  // And the whole of both strips comes with it, because neither is cut.
  expect(componentsOf(candidate, []).get("0,5")).toBe(componentsOf(candidate, []).get("3,0"))
})

test("a solder bridge joins one column of two adjacent strips", () => {
  const candidate: Candidate = { ...bare(4, 6), bridges: [bridge(2, [1, 2], "NET_A")] }
  const components = componentsOf(candidate, [])
  expect(components.get("1,2")).toBe(components.get("2,2"))
  expect(components.get("1,0"), "strips 0 and 1 are still apart").not.toBe(components.get("0,0"))
})

test("a part's body joins nothing: two leads on two strips are two conductors", () => {
  // A placement is its pins (owner, 2026-10-14), and a two-lead part's leads are
  // joined THROUGH the part rather than through the board - so the partition,
  // which is about copper, must not join them.
  const candidate = partAcrossTwoStrips()
  const components = componentsOf(candidate, derivedCuts(candidate, reference()))
  expect(components.get("2,4")).not.toBe(components.get("4,4"))
})

test("the partition answers differently for different cut lists on ONE candidate", () => {
  // The property that proves phase 2 reads the cut list it is given rather than
  // re-deriving one, or reusing a label phase 1 attached.
  const candidate = twoNetsOnStripThree()
  const withCut = componentsOf(candidate, derivedCuts(candidate, reference()))
  const without = componentsOf(candidate, [])
  expect(withCut.get("3,5")).not.toBe(withCut.get("3,6"))
  expect(without.get("3,5")).toBe(without.get("3,6"))
})

test("component ids are assigned in grid order, so equal boards give equal maps", () => {
  // THE ONE THING THE IDS DEPEND ON. A mutation run found that reversing the
  // union-find's choice of representative changed nothing - the numbering walk
  // is what makes the ids a function of the board - so the preference was
  // deleted and the walk's own order is asserted here instead.
  const candidate = wireOnlyStripOneNet()
  const cuts = derivedCuts(candidate, reference())
  expect([...componentsOf(candidate, cuts)]).toEqual([...componentsOf(candidate, cuts)])
  expect(componentsOf(bare(2, 2), []).get("0,0"), "the first hole is conductor 0").toBe(0)
  expect(componentsOf(bare(2, 2), []).get("1,0"), "the next conductor reached is 1").toBe(1)
  // On a board whose conductors are reached in a particular order, the ids say
  // so: strip 1 is cut in two, and its left half is numbered before its right.
  const split = componentsOf(bare(3, 4), [{ strip: 1, afterColumn: 1 }])
  expect([split.get("0,0"), split.get("1,0"), split.get("1,2"), split.get("2,0")]).toEqual([
    0, 1, 2, 3,
  ])
})

test("a duplicated cut in the list is the same cut, not two", () => {
  const once = componentsOf(bare(1, 6), [{ strip: 0, afterColumn: 2 }])
  const twice = componentsOf(bare(1, 6), [
    { strip: 0, afterColumn: 2 },
    { strip: 0, afterColumn: 2 },
  ])
  expect([...twice]).toEqual([...once])
})

test("a cut in a gap the grid does not have is refused, naming the last real gap", () => {
  const message = refusalFrom(() => componentsOf(bare(2, 4), [{ strip: 0, afterColumn: 3 }]))
  expect(message).toStartWith("stripboard-connectivity-cut-off-grid: ")
  expect(message).toContain("after column 2")
})

test("a cut on a strip the grid does not have is refused", () => {
  const message = refusalFrom(() => componentsOf(bare(2, 4), [{ strip: 7, afterColumn: 1 }]))
  expect(message).toStartWith("stripboard-connectivity-cut-off-grid: ")
  expect(message).toContain("strip 7")
})

test("a wire endpoint off the grid is refused, naming the wire", () => {
  const candidate: Candidate = { ...bare(2, 4), wires: [wire(at(0, 1), at(9, 1), "NET_A")] }
  const message = refusalFrom(() => componentsOf(candidate, []))
  expect(message).toStartWith("stripboard-connectivity-off-grid: ")
  expect(message).toContain("9,1")
})

test("a wire that begins and ends in one hole is refused, because it joins nothing", () => {
  const candidate: Candidate = { ...bare(2, 4), wires: [wire(at(0, 1), at(0, 1), "NET_A")] }
  const message = refusalFrom(() => componentsOf(candidate, []))
  expect(message).toStartWith("stripboard-connectivity-wire-to-itself: ")
})

test("a bridge between strips that are not neighbours is refused", () => {
  // lib/stripboard/board.ts records that the Bridge type cannot enforce
  // adjacency and that this module applies it - so this is the one place the
  // rule lives.
  const candidate: Candidate = { ...bare(5, 4), bridges: [bridge(1, [1, 4], "NET_A")] }
  const message = refusalFrom(() => componentsOf(candidate, []))
  expect(message).toStartWith("stripboard-connectivity-bridge-not-adjacent: ")
  expect(message).toContain("strips 1 and 4")
})

test("a bridge off the grid is refused", () => {
  const candidate: Candidate = { ...bare(3, 4), bridges: [bridge(9, [1, 2], "NET_A")] }
  const message = refusalFrom(() => componentsOf(candidate, []))
  expect(message).toStartWith("stripboard-connectivity-off-grid: ")
})

test("a grid with no strips or no columns is refused rather than partitioned", () => {
  expect(refusalFrom(() => componentsOf(bare(0, 4), []))).toStartWith(
    "stripboard-connectivity-grid-unusable: ",
  )
  expect(refusalFrom(() => componentsOf(bare(3, 0), []))).toStartWith(
    "stripboard-connectivity-grid-unusable: ",
  )
})

test("a one-column board has no gaps at all, so any cut in it is refused", () => {
  expect(componentsOf(bare(3, 1), []).size).toBe(3)
  expect(refusalFrom(() => componentsOf(bare(3, 1), [{ strip: 0, afterColumn: 0 }]))).toStartWith(
    "stripboard-connectivity-cut-off-grid: ",
  )
})

test("placements do not need pins for the partition, which reads no placement at all", () => {
  // Stated as a test rather than only in a comment: the only things that join
  // holes are the strip, the wires and the bridges.
  const candidate: Candidate = {
    ...bare(3, 4),
    placements: [part("P1", { a: at(0, 0), b: at(2, 3) })],
  }
  expect([...componentsOf(candidate, [])]).toEqual([...componentsOf(bare(3, 4), [])])
})
