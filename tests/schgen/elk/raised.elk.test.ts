/**
 * THE DIAGNOSIS A REAL RAISE PRODUCES, THROUGH THE REAL BACKEND.
 *
 * Hand-written for Task 14 of the M1 schematic-authoring plan, under controller ruling **R30**.
 *
 * **WHY THIS DOES NOT TRY TO REPRODUCE `docs/known-gaps.md` G94's OWN CRASH.** `java.lang.
 * IllegalStateException: Invalid hitboxes for scanline constraint calculation` needs a self-loop
 * net with a horizontally-drawn lateral AND the hitbox geometry `netlistsvg` fed it - and G185's
 * twenty-arm sweep, beyond the production run, turned every vertical two-port node horizontal on
 * all twelve declared blocks at both rotations and got **zero raises**, for the principled reason
 * recorded there and restated in G94's own rewrite: boundary nodes are zero-size here where
 * `netlistsvg` drew 30x20 cells, node sizes are the library's own micrometres rather than skin
 * extents, and the direction is `RIGHT` rather than the skin's `DOWN`. Hand-building an `ElkNode`
 * to force that exact exception would test `elkjs`, not this pipeline - exactly what R30 forbids.
 *
 * **WHAT THIS DOES DRIVE: the SAME dangling-edge rejection
 * `tests/schgen/elk/layout.elk.test.ts` already uses** - a `JsonImportException`, an
 * input-validity error, not G94's `IllegalStateException` - and checks the one thing Task 14 adds
 * on top of that already-exercised handling: that the `Mismatch` a generation run would actually
 * throw on carries a full, reproducible diagnosis, not a bare message.
 */

import { expect, test } from "bun:test"
import { elkBackendFrom, layoutBlocks } from "../../../tools/schgen/elk/layout.ts"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { dividerSubgraph, groundOfDegreeSix } from "./fixtures.ts"
import type { ElkBlockInput } from "../../../lib/schgen/elk/graph.ts"

/** A real subgraph's own input, with a dangling edge spliced into the GRAPH `elk.layout()` sees. */
function corruptedRaisingInput(blockId: string): { readonly g: ReturnType<typeof dividerSubgraph>; readonly input: ElkBlockInput } {
  const base = dividerSubgraph()
  const g = { ...base, block: { ...base.block, id: blockId } }
  const input = elkInputOf(g)
  const corrupted: ElkBlockInput = {
    ...input,
    graph: {
      ...input.graph,
      edges: [...(input.graph.edges ?? []), { id: "BOGUS", sources: ["nonexistent"], targets: ["also-nonexistent"] }],
    },
  }
  return { g, input: corrupted }
}

test("a real raise, forwarded through the backend, carries a full diagnosis naming the exact bytes", async () => {
  const { g, input } = corruptedRaisingInput("RAISES")
  const outcomes = await layoutBlocks([input])

  // The pre-pass's OWN stored outcome is the short reason, untouched - only the backend's copy
  // (below) is enriched. This is the half of the wiring that proves enrichment happens at the
  // backend seam and not inside layoutBlocks, which tests/schgen/elk/layout.elk.test.ts still
  // pins exactly as it did before this task.
  const stored = outcomes.get("RAISES")
  expect(stored?.ok).toBe(false)
  if (stored === undefined || stored.ok) return
  expect(stored.mismatch.kind).toBe("backend-raised")
  if (stored.mismatch.kind !== "backend-raised") return
  expect(stored.mismatch.reason).not.toContain("self-loop cells")
  expect(stored.mismatch.reason).toContain("Referenced shape does not exist")

  const result = elkBackendFrom(outcomes).realise(g)
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.mismatch.kind).toBe("backend-raised")
  if (result.mismatch.kind !== "backend-raised") return

  const reason = result.mismatch.reason
  // Reproducible from the report alone: the exact bytes elk.layout() was given, verbatim.
  expect(reason).toContain(input.serialized)
  // The backend's own sentence survives inside the enriched reason.
  expect(reason).toContain("Referenced shape does not exist")
  // The diagnosis's two diagnostic sections are present even though this graph has neither shape:
  // "none" is printed rather than the section vanishing.
  expect(reason).toContain("self-loop cells")
  expect(reason).toContain("horizontal passives")
  expect(reason.split("\n").some((l) => l.includes("self-loop cells") && l.includes("none"))).toBe(true)
})

test("a block whose bytes disagree with what actually raised is refused, not silently diagnosed", async () => {
  const { input } = corruptedRaisingInput("RAISES")
  const outcomes = await layoutBlocks([input])
  // A DIFFERENT subgraph than the one that produced `input` - same block id, different topology
  // (five resistors to GND rather than two in series) - so elkInputOf(wrongGraph) cannot agree
  // with the bytes that actually raised.
  const otherBase = groundOfDegreeSix()
  const wrongGraph = { ...otherBase, block: { ...otherBase.block, id: "RAISES" } }
  expect(() => elkBackendFrom(outcomes).realise(wrongGraph)).toThrow(/raised on bytes different/)
})
