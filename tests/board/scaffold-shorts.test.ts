import { test, expect } from "bun:test"
import { connectedGroups } from "../../lib/board/scaffold/shorts.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"

const r = (id: string, a: string, b: string, ohms = 1000): ResolvedComponent => ({
  id,
  kind: "resistor",
  parameters: { ohms },
  pins: {},
  units: [{ name: "MAIN", pins: { a, b } }],
})

test("components sharing a net are one connected component", () => {
  const groups = connectedGroups([r("a", "in", "mid"), r("b", "mid", "out")])
  expect(groups).toHaveLength(1)
  expect(groups[0]).toHaveLength(2)
})

test("two pieces sharing no net are two connected components", () => {
  // Moved from the retired `isolate.ts` tests, which used this to show isolation is
  // derived per connected component rather than per section - the isolation half of
  // that claim is gone with it, but the partitioning claim itself belongs here.
  const pieces = [r("a", "in", "out"), r("b", "hi_boost_out", "0")]
  expect(connectedGroups(pieces)).toHaveLength(2)
})
