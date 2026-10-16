/**
 * PHASE 1 UNDER TEST: that cut synthesis reads DECLARED net identity, that it
 * puts a cut between every pair of adjacent runs of different nets and nowhere
 * else, and that the cut-position convention `lib/stripboard/cuts.ts` declares is
 * the one it applies.
 *
 * The differential test against the fork's own cut sets is `./cuts-agree.test.ts`
 * and it is the real evidence; these are the shapes that say what the derivation
 * MEANS, including the three the plan's own revisions got wrong.
 *
 * **EVERY REFUSAL IS ASSERTED WITH `toStartWith` ON ITS KEY.** A regex run
 * against a long message matches its reasoning rather than its verdict, which
 * this project has shipped five times.
 */
import { expect, test } from "bun:test"
import { componentsOf } from "../../../lib/stripboard/connectivity.ts"
import {
  derivedCuts,
  runsOf,
  significantContacts,
  type Cut,
} from "../../../lib/stripboard/cuts.ts"
import {
  at,
  bridgeInsideAGap,
  bridgeToNowhere,
  dipStraddlingACut,
  oneNetSpanningStripThree,
  part,
  pinOffTheGrid,
  pinOnNoNet,
  reference,
  tiedGapOnStripTwo,
  twoNetsInOneHole,
  twoNetsOnStripThree,
  wideGapOnStripTwo,
  wireOnlyStripOneNet,
  wireOnlyStripTwoNets,
  wireToNowhere,
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

const sorted = (cuts: readonly Cut[]): readonly Cut[] =>
  [...cuts].sort((a, b) => a.strip - b.strip || a.afterColumn - b.afterColumn)

test("a strip carrying two nets needs one cut, between their runs", () => {
  expect(derivedCuts(twoNetsOnStripThree(), reference())).toEqual([{ strip: 3, afterColumn: 5 }])
})

test("a strip carrying one net over two leads needs no cut", () => {
  expect(derivedCuts(oneNetSpanningStripThree(), reference())).toEqual([])
})

test("a wire-only strip carrying ONE net is a conductor and needs NO cut", () => {
  // REVISION 1 OF THE PLAN ASSERTED THE OPPOSITE AND WAS WRONG. It required a
  // cut on strip 7, baking in the assumption that recognising a wire-only strip
  // means cutting it. A strip holding two endpoints of the SAME net needs zero
  // cuts, and that test would have taught the model a falsehood and passed.
  const candidate = wireOnlyStripOneNet()
  const cuts = derivedCuts(candidate, reference())
  expect(cuts.filter((cut) => cut.strip === 7)).toEqual([])
  expect(cuts, "and nothing else on the board needs cutting either").toEqual([])
})

test("a wire-only strip's two endpoints are joined by the strip, not only by the wire", () => {
  // What DOES matter about that strip: it conducts. The empty hole between the
  // two endpoints is in the same component as both, which is the part a wire
  // alone could not account for.
  const candidate = wireOnlyStripOneNet()
  const components = componentsOf(candidate, derivedCuts(candidate, reference()))
  expect(components.get("7,2"), "both endpoints share a component").toBe(components.get("7,9"))
  expect(components.get("7,5"), "and so does the bare copper between them").toBe(
    components.get("7,2"),
  )
})

test("a wire-only strip carrying TWO nets needs a cut between them", () => {
  const cuts = derivedCuts(wireOnlyStripTwoNets(), reference())
  expect(cuts.filter((cut) => cut.strip === 7), "one cut on strip 7").toEqual([
    { strip: 7, afterColumn: 5 },
  ])
})

test("a wire endpoint on a strip with no pins at all is still a significant contact", () => {
  const contacts = significantContacts(wireOnlyStripOneNet(), reference())
  const onSeven = contacts.filter((contact) => contact.hole.strip === 7)
  expect(onSeven.map((contact) => contact.hole.column).sort((a, b) => a - b)).toEqual([2, 9])
  expect(new Set(onSeven.map((contact) => contact.net))).toEqual(new Set(["NET_A"]))
})

test("a part's two leads on two strips make one contact each and no cut", () => {
  const candidate = { ...wireOnlyStripOneNet(), wires: [] }
  expect(derivedCuts(candidate, reference())).toEqual([])
})

test("the cut goes in the gap furthest from the nearest soldered hole", () => {
  // NET_A ends at column 3 and NET_B starts at column 9 on strip 2. The gaps
  // after 3..8 are all electrically equivalent; the declared convention takes
  // the one with the most clearance from a solder joint, which is after 5 (two
  // and a half holes from the lead at 3, three and a half from the one at 9).
  expect(derivedCuts(wideGapOnStripTwo(), reference())).toEqual([{ strip: 2, afterColumn: 5 }])
})

test("a tie between two equally clear gaps goes to the lower column", () => {
  // Leads at 3 and 5: the gaps after 3 and after 4 are each half a hole from one
  // lead and one and a half from the other, so the rule has to break the tie
  // rather than leave it to a loop's iteration order.
  expect(derivedCuts(tiedGapOnStripTwo(), reference())).toEqual([{ strip: 2, afterColumn: 3 }])
})

test("two leads in neighbouring holes leave exactly one gap and the cut is in it", () => {
  expect(derivedCuts(twoNetsOnStripThree(), reference())).toEqual([{ strip: 3, afterColumn: 5 }])
})

test("a cut under a DIP's body is produced, not avoided", () => {
  // The owner, 2026-10-14: "parts definitely straddle cuts. All dip packages
  // have cuts under them to separate the two pin rows." A cut is on the copper
  // side and a body is on the component side, so they cannot foul each other,
  // and a derivation treating a body as an obstacle would refuse the standard
  // way every DIP is mounted.
  const cuts = sorted(derivedCuts(dipStraddlingACut(), reference()))
  expect(cuts).toEqual([
    { strip: 4, afterColumn: 2 },
    { strip: 5, afterColumn: 2 },
  ])
  // And the cuts are UNDER the package: strictly between its two pin columns,
  // on both strips its pins occupy.
  for (const cut of cuts) expect(cut.afterColumn).toBeGreaterThanOrEqual(1)
  for (const cut of cuts) expect(cut.afterColumn).toBeLessThan(4)
})

test("a solder bridge is a significant contact, so the cut keeps it with its own net", () => {
  // The miniature of transistor-preamp-loop's SOLDER 0,1 1,1. Strip 1 holds
  // NET_EMIT at column 0 and NET_GND at column 4, and the bridge puts NET_GND in
  // hole 1,1 too. WITH the bridge in the scan there is one gap left and the cut
  // is after column 0; WITHOUT it the convention would choose after column 1 and
  // sever the bridge from the net it carries.
  const candidate = bridgeInsideAGap()
  const cuts = derivedCuts(candidate, reference())
  expect(cuts).toEqual([{ strip: 1, afterColumn: 0 }])
  const components = componentsOf(candidate, cuts)
  expect(components.get("1,1"), "the bridge's hole stays with NET_GND").toBe(
    components.get("1,4"),
  )
  expect(components.get("1,1"), "and is severed from NET_EMIT").not.toBe(components.get("1,0"))
})

test("a bridge's hole appears as a contact on BOTH strips it joins", () => {
  const contacts = significantContacts(bridgeInsideAGap(), reference())
  const bridges = contacts.filter((contact) => contact.what.startsWith("the solder bridge"))
  expect(bridges.map((contact) => `${contact.hole.strip},${contact.hole.column}`).sort()).toEqual([
    "0,1",
    "1,1",
  ])
})

test("runs are maximal, so one net interrupted by another is two runs and two cuts", () => {
  const candidate = {
    grid: { strips: 4, columns: 12 },
    placements: [
      part("P1", { a: at(1, 1), b: at(3, 0) }),
      part("P3", { a: at(1, 5), b: at(3, 4) }),
      part("P2", { a: at(1, 9), b: at(3, 8) }),
    ],
    wires: [],
    bridges: [],
  }
  // NET_A at 1, NET_B at 5, NET_A again at 9 - three runs, two cuts, and the two
  // NET_A segments are then separate pieces of copper, which is phase 2's
  // finding rather than this phase's.
  expect(runsOf(significantContacts(candidate, reference())).filter((run) => run.strip === 1)).toEqual(
    [
      { strip: 1, net: "NET_A", firstColumn: 1, lastColumn: 1 },
      { strip: 1, net: "NET_B", firstColumn: 5, lastColumn: 5 },
      { strip: 1, net: "NET_A", firstColumn: 9, lastColumn: 9 },
    ],
  )
  expect(sorted(derivedCuts(candidate, reference())).filter((cut) => cut.strip === 1)).toEqual([
    { strip: 1, afterColumn: 2 },
    { strip: 1, afterColumn: 6 },
  ])
})

test("consecutive runs on one strip always carry different nets, which is why derivedCuts has no such check", () => {
  // THE PROPERTY A DELETED GUARD WAS GUARDING. `derivedCuts` once skipped a pair
  // of adjacent runs on the same net; a mutation run showed that branch could
  // never fire, because `runsOf` only opens a new run when the net changes. The
  // branch is gone and the property is asserted here, over every fixture that
  // has more than one run on a strip.
  for (const candidate of [
    twoNetsOnStripThree(),
    wireOnlyStripOneNet(),
    wireOnlyStripTwoNets(),
    wideGapOnStripTwo(),
    dipStraddlingACut(),
    bridgeInsideAGap(),
  ]) {
    const runs = runsOf(significantContacts(candidate, reference()))
    for (let index = 1; index < runs.length; index += 1) {
      const earlier = runs[index - 1]
      const later = runs[index]
      if (earlier === undefined || later === undefined) continue
      if (earlier.strip !== later.strip) continue
      expect(earlier.net, `strip ${earlier.strip} has two runs of one net side by side`).not.toBe(
        later.net,
      )
    }
  }
})

test("the derivation is deterministic: two runs over one candidate give one list", () => {
  const candidate = dipStraddlingACut()
  expect(derivedCuts(candidate, reference())).toEqual(derivedCuts(candidate, reference()))
})

test("a wire whose declared net no pin reaches is refused, naming the wire and the net", () => {
  const message = refusalFrom(() => derivedCuts(wireToNowhere(), reference()))
  expect(message).toStartWith("stripboard-cuts-wire-connects-nothing: ")
  expect(message).toContain("NET_ORPHAN")
  expect(message).toContain("7,2")
})

test("a bridge whose declared net no pin reaches is refused the same way", () => {
  const message = refusalFrom(() => derivedCuts(bridgeToNowhere(), reference()))
  expect(message).toStartWith("stripboard-cuts-bridge-connects-nothing: ")
  expect(message).toContain("NET_ORPHAN")
})

test("a placed pin on no reference net is refused, naming the pin and its hole", () => {
  const message = refusalFrom(() => derivedCuts(pinOnNoNet(), reference()))
  expect(message).toStartWith("stripboard-cuts-pin-net-unknown: ")
  expect(message).toContain("P9.a")
  expect(message).toContain("3,5")
})

test("two nets in one hole are refused as the short they are, naming both", () => {
  const message = refusalFrom(() => derivedCuts(twoNetsInOneHole(), reference()))
  expect(message).toStartWith("stripboard-cuts-one-hole-two-nets: ")
  expect(message).toContain("P1.a")
  expect(message).toContain("P3.a")
  expect(message).toContain("no cut can clear")
})

test("two contacts of the SAME net in one hole are one contact, not a refusal", () => {
  // A bridge soldered onto a lead's own hole is the ordinary case, and it is how
  // every committed board's bridges sit.
  const candidate = {
    grid: { strips: 4, columns: 12 },
    placements: [part("G1", { a: at(1, 4), b: at(3, 4) })],
    wires: [],
    bridges: [{ column: 4, strips: [0, 1] as readonly [number, number], net: "NET_GND" }],
  }
  expect(derivedCuts(candidate, reference())).toEqual([])
  expect(runsOf(significantContacts(candidate, reference())).filter((run) => run.strip === 1)).toEqual(
    [{ strip: 1, net: "NET_GND", firstColumn: 4, lastColumn: 4 }],
  )
})

test("a lead in a hole the stock does not have is refused, naming the hole and the grid", () => {
  const message = refusalFrom(() => derivedCuts(pinOffTheGrid(), reference()))
  expect(message).toStartWith("stripboard-cuts-contact-off-grid: ")
  expect(message).toContain("3,11")
  expect(message).toContain("8 holes")
})

test("a reference pin on two nets is refused, because which net its hole carries is unstated", () => {
  const twoNets = new Map<string, readonly string[]>([
    ["NET_A", ["P1.a", "P1.b"]],
    ["NET_C", ["P1.b"]],
  ])
  const message = refusalFrom(() => derivedCuts(twoNetsOnStripThree(), twoNets))
  expect(message).toStartWith("stripboard-cuts-pin-on-two-nets: ")
  expect(message).toContain("P1.b")
})

test("a pin listed twice on ONE net is not a pin on two nets", () => {
  const twice = new Map<string, readonly string[]>([
    ["NET_A", ["P1.a", "P1.a"]],
    ["NET_B", ["P3.a"]],
    ["NET_C", ["P1.b"]],
    ["NET_D", ["P3.b"]],
  ])
  expect(derivedCuts(twoNetsOnStripThree(), twice)).toEqual([{ strip: 3, afterColumn: 5 }])
})

test("NOTHING in phase 1 reads a footprint, so a fixture with no fitted part derives cuts", () => {
  // Every fixture here carries a placeholder in `footprint`, and the derivation
  // never looks at it: a placement is its pins (owner, 2026-10-14), and
  // lib/kicad/footprint-extent.ts and formed-frame.ts gain no consumer here.
  expect(derivedCuts(dipStraddlingACut(), reference()).length).toBe(2)
})
