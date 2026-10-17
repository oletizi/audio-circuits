/**
 * The five stride derivation rules, now that they are committed source rather
 * than a test fixture.
 *
 * **WHY THIS FILE EXISTS AT ALL.** The rules used to live in
 * `./seed-fixtures.ts` and were covered only through whatever benchmark happened
 * to drive them. On 2026-10-17 one of them - `part-walk s1` - became the
 * arrangement a committed board is built from, so they moved to
 * `lib/stripboard/seed-orderings.ts` and the two properties a board's
 * provenance rests on need asserting directly: that a named rule is the same
 * ordering on every run, and that a name which is not one of the five refuses
 * rather than quietly becoming one.
 *
 * **IT DOES NOT ASSERT THAT ANY RULE IS GOOD.** Which rule is cheapest on a
 * circuit is a measurement (`.superpowers/sdd/ordering-sweep-report.md`), and
 * three of the five refuse outright on `pultec-hi-cut` at stride 1. Nothing here
 * reads as advice.
 */
import { expect, test } from "bun:test"
import {
  derivedOrderings,
  strideOrderingNamed,
} from "../../../lib/stripboard/seed-orderings.ts"
import { feedbackNetlist } from "./seed-fixtures.ts"

const RULE_NAMES = [
  "reference-order",
  "degree-descending",
  "degree-ascending",
  "part-walk",
  "alphabetical",
] as const

test("the five rules are the five, named for the rule and the stride", () => {
  const { netlist } = feedbackNetlist()
  for (const stride of [1, 2, 3]) {
    expect(
      derivedOrderings(netlist, stride).map((entry) => entry.name),
      `stride ${stride}`,
    ).toEqual(RULE_NAMES.map((rule) => `${rule} s${stride}`))
  }
})

test("every rule names every net exactly once, and carries the stride it was asked for", () => {
  const { netlist } = feedbackNetlist()
  for (const ordering of derivedOrderings(netlist, 2)) {
    expect(ordering.stride, ordering.name).toBe(2)
    expect([...ordering.nets].sort(), ordering.name).toEqual([...netlist.nets.keys()].sort())
    expect(new Set(ordering.nets).size, ordering.name).toBe(ordering.nets.length)
  }
})

test("a named rule is the same ordering on every call, which is what a board's record rests on", () => {
  // `run.json` records an ordering's NAME, so the name has to resolve to one
  // arrangement. The two degree rules are the ones this could fail on: without
  // their declared `localeCompare` tie break, equal-degree nets would come out
  // in the netlist's own insertion order - a property of how the export was
  // written rather than of the circuit.
  const { netlist } = feedbackNetlist()
  for (const ordering of derivedOrderings(netlist, 1)) {
    expect(strideOrderingNamed(netlist, 1, ordering.name).nets, ordering.name).toEqual(
      ordering.nets,
    )
  }
  const again = feedbackNetlist().netlist
  for (const ordering of derivedOrderings(netlist, 1)) {
    expect(
      strideOrderingNamed(again, 1, ordering.name).nets,
      `${ordering.name}, over a separately built netlist of the same circuit`,
    ).toEqual(ordering.nets)
  }
})

test("a name that is not one of the five refuses, and lists the five it could have been", () => {
  const { netlist } = feedbackNetlist()
  // THE REALISTIC WRONG VALUE: the directory form of the name, which is what a
  // run directory shows and what the owner himself wrote - "low-cut:
  // part-walk-s1". Falling back to the first rule here would build a board
  // nobody chose and record it under the name that was asked for.
  expect(() => strideOrderingNamed(netlist, 1, "part-walk-s1")).toThrow(
    /^stripboard-ordering-not-a-rule: /,
  )
  let message = ""
  try {
    strideOrderingNamed(netlist, 1, "part-walk-s1")
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  for (const rule of RULE_NAMES) expect(message, rule).toContain(`${rule} s1`)
  // AND A RULE AT THE WRONG STRIDE IS NOT ONE OF THEM EITHER, because the
  // stride is part of what the name identifies.
  expect(() => strideOrderingNamed(netlist, 1, "part-walk s2")).toThrow(
    /^stripboard-ordering-not-a-rule: /,
  )
})
