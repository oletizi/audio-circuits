import { test, expect } from "bun:test"
import { LADDER_ORDER, suppliers } from "../../lib/board/scaffold/supplier.ts"

test("standalone, the one present board supplies every absent group", () => {
  const assigned = suppliers(new Set(["low-boost"]))
  expect([...assigned.keys()].sort()).toEqual(["hi-boost", "hi-cut", "low-cut", "mid"])
  for (const board of assigned.values()) expect(board).toBe("low-boost")
})

test("the first present board in ladder order supplies each absent group", () => {
  const assigned = suppliers(new Set(["hi-cut", "low-boost"]))
  for (const board of assigned.values()) expect(board).toBe("hi-cut")
})

test("a present section is never assigned a stand-in for itself", () => {
  const assigned = suppliers(new Set(["hi-cut", "low-boost"]))
  expect(assigned.has("hi-cut")).toBe(false)
  expect(assigned.has("low-boost")).toBe(false)
})

test("all five present means no groups at all", () => {
  expect(suppliers(new Set(LADDER_ORDER)).size).toBe(0)
})

test("the assignment does not depend on iteration order of the input", () => {
  const forwards = suppliers(new Set(["mid", "hi-cut"]))
  const backwards = suppliers(new Set(["hi-cut", "mid"]))
  expect([...forwards.entries()].sort()).toEqual([...backwards.entries()].sort())
})

test("adding a board EARLIER in the order moves the assignment, and that is documented", () => {
  // The consequence the spec states: no derivable rule avoids it, because
  // "whichever board you built first" is not a property of the circuit.
  expect(suppliers(new Set(["low-boost"])).get("hi-cut")).toBe("low-boost")
  expect(suppliers(new Set(["hi-boost", "low-boost"])).get("hi-cut")).toBe("hi-boost")
})

test("an empty build refuses rather than returning an empty assignment", () => {
  expect(() => suppliers(new Set())).toThrow(/at least one/)
})

test("an unknown section name refuses, naming the known ones", () => {
  expect(() => suppliers(new Set(["nope"]))).toThrow(/nope/)
})
