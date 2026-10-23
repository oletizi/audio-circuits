/**
 * Hand-written, not ported. **`labelledNets` leaves an `auto` block's internal nets UNLABELLED**,
 * which is the half of Task 8's `isUnwired` change that nothing covered.
 *
 * **WHY IT NEEDED ITS OWN TEST.** The ported `ir/classify.test.ts` covers the `bus` side - *"labels
 * every net of a bus-rendered block"* - and the `wired` side, and Task 8 changed the predicate from
 * `rendering.kind !== "wired"` to *not `wired` and not `auto`*. Measured in review: **dropping
 * `&& kind !== "auto"` from `isUnwired` passed the whole suite.** So the clause that decides
 * whether an ELK-drawn block's internal nets get global labels was asserted by nothing.
 *
 * **It is invisible in a netlist and visible only in a drawing**, which is why a netlist-level
 * suite could not have caught it: a net labelled at both ends and a net wired end to end have the
 * same connectivity. The Task 8 brief warned that getting this wrong *"silently unlabels a
 * cross-block net"*; the real risk runs the other way, because **a cross-block net is labelled by
 * `blocks.size > 1` before `unwired` is consulted at all** - so what the clause actually decides is
 * whether a BLOCK-INTERNAL net of an auto block is labelled, and over-labelling is the failure a
 * wrong clause produces. This test is written around that, not around the brief's warning.
 *
 * The fixture is one sheet, one `auto` block, two resistors in series: `IN` and `OUT` reach a peer
 * block so they are labelled whatever the rendering, `MID` is internal to the block and is the net
 * under test, and `GND` is a rail. Built through `buildCircuit` so the IR is the real one.
 */
import { describe, expect, it } from "bun:test"
import { labelledNets } from "../../../lib/schgen/ir/classify.ts"
import { buildCircuit } from "../../../lib/schgen/ir/build.ts"
import type { CircuitSpec, Rendering } from "../../../lib/schgen/ir/types.ts"
import { res, symbols } from "../__fixtures__/circuits.ts"
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts"

/** One `auto` block "A" of two series resistors, plus a peer block that pulls `IN` and `OUT` across. */
function circuitWith(rendering: Rendering): CircuitSpec {
  const parts = [res("R1", "IN", "MID"), res("R2", "MID", "OUT"), res("R_PEER1", "IN", "GND"), res("R_PEER2", "OUT", "GND")]
  return {
    parts,
    blocks: [
      { id: "A", sheet: "s", title: "A", members: ["R1", "R2"], checklist: [], rendering },
      { id: "P", sheet: "s", title: "P", members: ["R_PEER1", "R_PEER2"], checklist: [], rendering: { kind: "bus", groups: [] } },
    ],
    sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
    rails: [{ net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null }],
    orientations: noOrientationPreferences(parts),
    portDirections: NO_PORT_DIRECTIONS,
  }
}

const labelled = (rendering: Rendering): string[] => [...labelledNets(buildCircuit(circuitWith(rendering), { symbols }))].sort()

describe("labelledNets and the auto rendering", () => {
  it("leaves an auto block's internal net unlabelled, as it does a wired block's", () => {
    const auto = labelled({ kind: "auto" })
    expect(auto, "MID is internal to the auto block and is drawn with wires, so it takes no label").toEqual(["GND", "IN", "OUT"])
    // The same circuit with a declared template: identical, which is the point of the clause.
    expect(labelled({ kind: "wired", template: "passive-chain", anchor: null })).toEqual(auto)
  })

  /**
   * The contrast that gives the assertion above its meaning: the one non-wired, non-auto kind
   * DOES label the internal net. Without this, "MID is absent" could be true for any reason.
   */
  it("labels a bus block's internal net, which is what auto is being distinguished from", () => {
    expect(labelled({ kind: "bus", groups: [] })).toEqual(["GND", "IN", "MID", "OUT"])
  })

  /**
   * **AND THE BRIEF'S WARNED FAILURE IS STRUCTURALLY IMPOSSIBLE**, recorded here as a check rather
   * than as a claim: a net crossing two blocks is labelled by `blocks.size > 1`, which is evaluated
   * before `unwired` in the same `||` chain. So `IN` and `OUT` stay labelled under every rendering,
   * and no mistake in `isUnwired` can unlabel a cross-block net.
   */
  it("labels a cross-block net under every rendering, whatever isUnwired says", () => {
    for (const rendering of [
      { kind: "auto" } as const,
      { kind: "bus", groups: [] } as const,
      { kind: "wired", template: "passive-chain", anchor: null } as const,
    ]) {
      const nets = labelled(rendering)
      expect(nets, `IN and OUT cross blocks under ${rendering.kind}`).toContain("IN")
      expect(nets).toContain("OUT")
    }
  })
})
