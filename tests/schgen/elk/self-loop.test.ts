/**
 * `selfLoops` AND THE DIAGNOSIS BUILT FROM IT - PURE FUNCTIONS, NEITHER DRIVING `elkjs`.
 *
 * Hand-written for Task 14 of the M1 schematic-authoring plan, under controller ruling **R30**:
 * both are diagnostic only, and neither test here tries to make anything raise.
 * `tests/schgen/elk/raised.elk.test.ts` is the one file that drives a real raise through the real
 * backend; this file is about what the diagnosis says once it has an error in hand, which is why
 * it takes a plain `Error` rather than the pinned `elkjs`.
 */

import { expect, test } from "bun:test"
import { selfLoops } from "../../../lib/schgen/elk/self-loop.ts"
import { diagnoseRaise, ELK_BACKEND, renderDiagnosis } from "../../../tools/schgen/elk/diagnose.ts"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { dividerSubgraph, selfLoopBlock } from "./fixtures.ts"

test("a unit with two of its own pins on one net is a self-loop", () => {
  expect(selfLoops(selfLoopBlock())).toEqual([{ part: "U_LOOP", unit: 1, net: "LOOP" }])
})

/** A check that could fail the other way: a block with no such unit reports none, not a guess. */
test("a block with no self-loop reports none", () => {
  expect(selfLoops(dividerSubgraph())).toEqual([])
})

test("diagnoseRaise names the self-loop and the horizontal lateral hanging off it", () => {
  const g = selfLoopBlock()
  const input = elkInputOf(g)
  const d = diagnoseRaise(g, input, new Error("Invalid hitboxes for scanline constraint calculation."))
  expect(d.blockId).toBe("B")
  expect(d.backend).toBe(ELK_BACKEND)
  expect(d.message).toBe("Invalid hitboxes for scanline constraint calculation.")
  expect(d.selfLoops).toEqual([{ part: "U_LOOP", unit: 1, net: "LOOP" }])
  // R_LATERAL hangs off LOOP and is declared at rotation 90, so both its pins read left/right.
  expect(d.horizontalPassives).toEqual(["R_LATERAL"])
  expect(d.inputKey).toBe(input.serialized)
})

/** A block with the self-loop but no horizontal lateral reports an empty list, not R_LOAD's. */
test("diagnoseRaise does not call a vertical passive horizontal", () => {
  const g = selfLoopBlock()
  const input = elkInputOf(g)
  const d = diagnoseRaise(g, input, new Error("x"))
  expect(d.horizontalPassives).not.toContain("R_LOAD")
})

test("renderDiagnosis prints the bytes verbatim, so the raise is reproducible from the text alone", () => {
  const g = selfLoopBlock()
  const input = elkInputOf(g)
  const d = diagnoseRaise(g, input, new Error("boom"))
  const text = renderDiagnosis(d)
  expect(text).toContain(input.serialized)
  expect(text).toContain("U_LOOP:1 on LOOP")
  expect(text).toContain("R_LATERAL")
  expect(text).toContain("boom")
})

/** A block with neither shape prints "none" for both - the text says so rather than falling silent. */
test("renderDiagnosis says \"none\" rather than omitting an empty section", () => {
  const g = dividerSubgraph()
  const input = elkInputOf(g)
  const text = renderDiagnosis(diagnoseRaise(g, input, new Error("x")))
  expect(text).toContain("self-loop cells")
  expect(text.split("\n").some((l) => l.includes("self-loop cells") && l.includes("none"))).toBe(true)
})

test("diagnoseRaise refuses a subgraph and an input belonging to two different blocks", () => {
  const g = dividerSubgraph()
  const otherBase = selfLoopBlock()
  const other = { ...otherBase, block: { ...otherBase.block, id: "OTHER" } }
  const otherInput = elkInputOf(other)
  expect(() => diagnoseRaise(g, otherInput, new Error("x"))).toThrow(/A diagnosis is keyed to one block/)
})
