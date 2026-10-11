import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import {
  boardGeometry,
  copperGraph,
  holeKey,
  parseHoleKey,
  pinHoles,
  CONTRACTED_LINES,
  GEOMETRY_CONTRACT_VERSION,
} from "../../tools/stripboard/copper.ts"

/**
 * A four-column, three-row horizontal-strip board. R1 spans strip 0, R2
 * strip 2, and a wire joins the two. One cut severs strip 0 between columns
 * 1 and 2.
 *
 * THREE FIXTURE LINES DIFFER FROM THE TASK BRIEF'S DRAFT, because the draft
 * does not match the grammar the pinned fork emits and `parseBoardDump`
 * reads. Each was checked against the fork's source and a real dump:
 *
 * - A `WIRE` end is `<row>,<col>,<gridNodeId>,<wireNodeId>` - four fields,
 *   per `Src/Headless_dump_wires.cpp`'s grammar paragraph - so the brief's
 *   `ENDS 0,0 2,0` is unreadable. The two node ids are present in the text
 *   and discarded by the reconstruction, which is the point.
 * - A `NODE` line is `NODE <id> NAME <name> <members...>`, per the real dumps
 *   in `tests/fixtures/`, so the brief's `NODE 1 net_a ...` is unreadable.
 * - A `CUT` hole's node id is an unsigned integer (`parseNodedHole`'s own
 *   pattern), so the independence test's garbage node ids are large rather
 *   than negative; "garbage" only has to be a value nothing could have
 *   computed for these holes, and 999999/424242 are that.
 */
const BOARD = [
  "GRID 3 4",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PART R2 RESISTOR4 1k AT 2,0 SPAN 1",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 0,3",
  "PIN R2 1 AT 2,0",
  "PIN R2 2 AT 2,3",
  "WIRE w1 AT 0,0 ENDS 0,0,11,11 2,0,11,11",
  "CUT 0,1,7 0,2,8",
].join("\n")

/** The module's own text seam: contract-checked parse, then reconstruction. */
function graphOf(dumpText: string) {
  return copperGraph(boardGeometry(dumpText))
}

/** The message a refusal produced, or "" if the call did not refuse. */
function refusalFrom(dumpText: string): string {
  try {
    graphOf(dumpText)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("the contract's version and its line list are declared, not implied", () => {
  // MUTATION RUN (the one the type system owns): adding a tenth member,
  // "tenth-refusal-with-no-message", to GeometryRefusal with no arm in
  // notDefaultedBecause. `bun run typecheck` exited 2 with:
  //   tools/stripboard/geometry-contract.ts(80,64): error TS2366: Function
  //   lacks ending return statement and return type does not include
  //   'undefined'.
  // So the set cannot grow without a reason for the new member. Reverted.
  expect(GEOMETRY_CONTRACT_VERSION).toBe(1)
  expect([...CONTRACTED_LINES].sort()).toEqual([
    "CUT",
    "GRID",
    "PIN",
    "SOLDER",
    "VERTICAL_STRIPS",
    "WIRE",
  ])
})

test("holeKey and parseHoleKey are inverses, and neither repairs a near-miss", () => {
  expect(holeKey({ row: 7, col: 12 })).toBe("7,12")
  expect(parseHoleKey("7,12")).toEqual({ row: 7, col: 12 })
  expect(() => parseHoleKey("7, 12")).toThrow(/not a hole key/)
  expect(() => holeKey({ row: 1.5, col: 0 })).toThrow(/pair of integers/)
})

test("holes on one uncut stretch of strip are one component", () => {
  // MUTATION RUN: unioning every pair of holes on a strip regardless of the
  // severed set leaves this test passing (it asserts a join), which is why
  // the cut test below is the one that pins cuts.
  const graph = graphOf(BOARD)
  expect(graph.components.get(holeKey({ row: 0, col: 0 }))).toBe(
    graph.components.get(holeKey({ row: 0, col: 1 })),
  )
})

test("a CUT severs the strip BETWEEN its two holes, so the two sides differ", () => {
  // MUTATION RUN (break 1): `if (!severed.has(gap) || true)` in
  // unionUncutStripNeighbours - union every along-strip neighbour, cuts
  // ignored. Observed:
  //   error: expect(received).not.toBe(expected)
  //   Expected: not 0
  //   Received: 0
  // 13 pass / 2 fail: this test, and the componentCount test below (Expected
  // 3, Received 2 - the cut no longer splits strip 0). Reverted.
  const graph = graphOf(BOARD)
  expect(graph.components.get(holeKey({ row: 0, col: 1 }))).not.toBe(
    graph.components.get(holeKey({ row: 0, col: 2 })),
  )
})

test("a WIRE joins its two ends across non-adjacent strips", () => {
  const graph = graphOf(BOARD)
  expect(graph.components.get(holeKey({ row: 0, col: 0 }))).toBe(
    graph.components.get(holeKey({ row: 2, col: 0 })),
  )
})

test("a SOLDER line joins two neighbouring strips at one column", () => {
  const graph = graphOf(`${BOARD}\nSOLDER 1,3 2,3`)
  expect(graph.components.get(holeKey({ row: 1, col: 3 }))).toBe(
    graph.components.get(holeKey({ row: 2, col: 3 })),
  )
})

test("componentCount counts every region of copper, isolated strips included", () => {
  // Three rows, no cut, no wire, no bridge: three strips, three components.
  const bare = BOARD.split("\n")
    .filter((line) => !line.startsWith("CUT ") && !line.startsWith("WIRE "))
    .join("\n")
  expect(graphOf(bare).componentCount).toBe(3)
  // BOARD's cut splits strip 0 in two and its wire rejoins the left half to
  // strip 2, so: strip-0-left + strip 2 (one), strip-0-right, strip 1.
  expect(graphOf(BOARD).componentCount).toBe(3)
})

test("VERTICAL_STRIPS 1 changes which holes share a strip, and is read rather than assumed", () => {
  // The CUT moves WITH the axis, and it has to: BOARD's `CUT 0,1 0,2` names two
  // holes in one row, which is one strip under VERTICAL_STRIPS 0 and TWO
  // different strips under VERTICAL_STRIPS 1 - where it is malformed and the
  // `cut-across-strips` refusal rejects it. So the vertical board gets a
  // vertical cut: same column, adjacent rows.
  //
  // MUTATION RUN (break 3): hard-coding stripOf to rows, alongOf to cols and
  // the neighbour step to col + 1 - the axis assumed rather than read.
  // Observed, 14 pass / 1 fail, this test alone:
  //   error: cut-across-strips: "CUT 0,1 1,1" names holes on two different
  //   strips. A cut severs a strip ALONG its run, so a pair naming two
  //   different strips describes nothing the fork emits. ...
  // It fails by REFUSING rather than by a component mismatch, which is the
  // stronger outcome: with the axis hard-coded, this board's legitimate
  // vertical cut becomes unreadable. Reverted.
  const vertical = BOARD.replace("VERTICAL_STRIPS 0", "VERTICAL_STRIPS 1").replace(
    "CUT 0,1,7 0,2,8",
    "CUT 0,1,7 1,1,8",
  )
  const graph = graphOf(vertical)
  // Down a column is now one strip; across a row is not.
  expect(graph.components.get(holeKey({ row: 0, col: 0 }))).toBe(
    graph.components.get(holeKey({ row: 1, col: 0 })),
  )
  expect(graph.components.get(holeKey({ row: 0, col: 2 }))).not.toBe(
    graph.components.get(holeKey({ row: 0, col: 3 })),
  )
})

test("a stretched two-terminal part is NOT an edge - the correction that must not be lost", () => {
  // R1's two leads are on strips 0 and 0 here; put one on strip 1 and the part
  // must still not join them. COST 1.5: a component lead can never supply a
  // join, and a pipeline that believes it can produces boards that do not
  // conduct and scores them as if they did.
  //
  // MUTATION RUN (break 2): a loop in copperGraph unioning each part's PIN
  // holes to one another - a lead treated as a join. Observed:
  //   error: expect(received).not.toBe(expected)
  //   Expected: not 0
  //   Received: 0
  // 12 pass / 3 fail: this test, the CUT test and the componentCount test -
  // R1's leads straddle the cut, so believing a lead conducts also undoes the
  // cut. Three tests catch the one defect. Reverted.
  const across = BOARD.replace("PIN R1 2 AT 0,3", "PIN R1 2 AT 1,3")
  const graph = graphOf(across)
  expect(graph.components.get(holeKey({ row: 0, col: 0 }))).not.toBe(
    graph.components.get(holeKey({ row: 1, col: 3 })),
  )
})

test("pin holes are read from PIN lines, keyed ref.pin, and a floating part has none", () => {
  const floated = boardGeometry(
    BOARD.replace("PART R2 RESISTOR4 1k AT 2,0 SPAN 1", "PART R2 RESISTOR4 1k FLOATING SPAN 1")
      .replace("PIN R2 1 AT 2,0\n", "")
      .replace("PIN R2 2 AT 2,3\n", ""),
  )
  const holes = pinHoles(floated)
  expect(holes.get("R1.1")).toBe(holeKey({ row: 0, col: 0 }))
  expect(holes.has("R2.1")).toBe(false)
})

test("a missing contracted line refuses as missing-line, naming the line and the version", () => {
  // MUTATION RUN (refusal 1 of 9): deleting boardGeometry's
  // LINES_REQUIRED_PRESENT loop. Observed, 14 pass / 1 fail, this test alone:
  //   error: GRID 3 4
  //   Expected to contain: "missing-line"
  //   Received: "--dump-board produced no GRID line, so this board's size in
  //   holes is unknown. This dump is from an unpinned or older veroroute fork;
  //   rebuild the pinned veroroute fork (`make veroroute` in the board's
  //   directory) and run this again."
  // So parseBoardDump does refuse - with a wording that names neither the
  // refusal nor the contract version, which is why this seam exists.
  // Reverted.
  for (const line of ["GRID 3 4", "VERTICAL_STRIPS 0"]) {
    const without = BOARD.split("\n")
      .filter((text) => text !== line)
      .join("\n")
    const message = refusalFrom(without)
    expect(message, line).toContain("missing-line")
    expect(message, line).toContain(line.split(" ")[0] ?? "")
    expect(message, line).toContain(`contract version ${GEOMETRY_CONTRACT_VERSION}`)
    expect(message, line).toContain("not defaul")
  }
})

test("every enumerated malformed input refuses, naming its refusal - one case each", () => {
  // The verifier must not construct a plausible graph from malformed input.
  // Each row is a mutation of BOARD and the refusal it must produce; the
  // assertion is that THAT refusal fired, because a module that threw the same
  // error for all nine would pass a test asserting only "it threw".
  //
  // MUTATION RUN (the one that matters more than the nine): replacing
  // refuse()'s `${refusal}: ${offending}. ${notDefaultedBecause(refusal)}`
  // with "malformed dump: ${offending}. malformed dump". Observed 13 pass /
  // 2 fail - this test and the missing-line test above:
  //   error: unsupported-strip-axis
  //   Expected to contain: "unsupported-strip-axis"
  //   Received: "malformed dump: VERTICAL_STRIPS reads \"2\", which is neither
  //   0 nor 1. malformed dump (HC8 geometry contract version 1; ...)"
  // Reverted. A refusal set that cannot say which refusal fired is one a
  // caller cannot act on, and it is also one where eight of the nine
  // validations could be missing undetected.
  const cases = [
    ["unsupported-strip-axis", BOARD.replace("VERTICAL_STRIPS 0", "VERTICAL_STRIPS 2")],
    ["cuts-not-computed", BOARD.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")],
    ["out-of-bounds", BOARD.replace("PIN R1 2 AT 0,3", "PIN R1 2 AT 0,9")],
    ["out-of-bounds", `${BOARD}\nSOLDER 1,3 9,3`],
    // Same strip (row 0), two steps apart: which of the two gaps to sever is
    // not stated by the contract and is not derivable from the line.
    ["cut-not-strip-adjacent", BOARD.replace("CUT 0,1,7 0,2,8", "CUT 0,1,7 0,3,8")],
    // Two different strips: a cut severs a strip ALONG its run.
    ["cut-across-strips", BOARD.replace("CUT 0,1,7 0,2,8", "CUT 0,1,7 1,1,8")],
    ["duplicate-pin", `${BOARD}\nPIN R1 1 AT 0,0`],
    ["conflicting-pin", `${BOARD}\nPIN R1 1 AT 0,2`],
    ["solder-not-strip-neighbours", `${BOARD}\nSOLDER 0,3 2,3`],
  ] as const
  // MUTATION RUNS, refusals 2-9 of 9, each deleted in turn. Each failed this
  // test on exactly its own row, at 14 pass / 1 fail, except cuts-not-computed
  // which also failed the UNRESOLVED test below (13 pass / 2 fail). The real
  // `Received:` text in each case:
  //   unsupported-strip-axis       "unreadable VERTICAL_STRIPS line:
  //                                 \"VERTICAL_STRIPS 2\"" - parseVerticalStrips
  //                                 refuses, naming neither refusal nor version
  //   cuts-not-computed            "" - no refusal; a graph was built. See the
  //                                 UNRESOLVED test below for what it claimed
  //   out-of-bounds (PIN row)      ""
  //   out-of-bounds (SOLDER row)   "" (one deletion; both rows went silent)
  //   cut-not-strip-adjacent       ""
  //   cut-across-strips            "cut-not-strip-adjacent: \"CUT 0,1 1,1\"
  //                                 names two holes on strip 0 that are 0 steps
  //                                 apart, not 1. ..." - the WRONG refusal
  //                                 fired, because `strip` is read off cut.a
  //                                 and the along-strip gap then collapses to
  //                                 0. The two clauses overlap on this input
  //                                 and only their ORDER distinguishes them,
  //                                 which is why this row asserts the name
  //                                 rather than that something threw
  //   duplicate-pin                "conflicting-pin: PIN R1.1 is reported at
  //                                 0,0 and at 0,0. ..." - same overlap, same
  //                                 reason: `seen === key` must precede
  //                                 `seen !== undefined` or a repeat reads as
  //                                 a conflict with itself
  //   conflicting-pin              ""
  //   solder-not-strip-neighbours  ""
  // All reverted.
  for (const [refusal, text] of cases) {
    const message = refusalFrom(text)
    expect(message, refusal).toContain(refusal)
    expect(message, refusal).toMatch(/GEOMETRY_CONTRACT_VERSION|contract version 1/)
  }
})

test("CUT_STATE UNRESOLVED refuses, because an absent cut list is not an empty one", () => {
  // The refusal that is easy to leave to the scorer. Under UNRESOLVED the cut
  // list is NOT EMITTED, so zero CUT lines and no cuts are the same text - and
  // a graph built from it joins holes the board severs, which is the most
  // convincing wrong answer this module can produce. R2 keeps the grader and
  // the scorer on separate paths, so a refusal only in the scorer leaves the
  // grader unprotected.
  //
  // MUTATION RUN (the second one that matters): making the cuts-not-computed
  // refusal unreachable so the reconstruction proceeds. Observed, 13 pass /
  // 2 fail - this test and the enumerated test above:
  //   error: expect(received).toThrow(expected)
  //   Expected pattern: /cuts-not-computed/
  //   Received function did not throw
  //   Received value: { components: Map(12) { "0,0": 0, "0,1": 0, "0,2": 0,
  //     "0,3": 0, "1,0": 1, ... "2,3": 0 }, componentCount: 2 }
  // Note what that claims: strip 0 WHOLE, cut and all, joined to strip 2 by
  // the wire - a connectivity the board does not have.
  //
  // RUN AGAINST transistor-preamp-lab's REAL dump as well, which is this case
  // live (CUT_STATE UNRESOLVED, 19 CUT_CONFLICT lines, ZERO CUT lines, GRID 29
  // 46). With the refusal unreachable the reconstruction returned
  // componentCount 29 over 1334 holes: exactly one component per strip, every
  // strip whole, every cut the board needs missing. The board has 19 recorded
  // cut conflicts, so that answer is wrong in at least 19 places and carries
  // no sign of it. Reverted.
  const unresolved = BOARD.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")
    .split("\n")
    .filter((line) => !line.startsWith("CUT "))
    .join("\n")
  expect(() => graphOf(unresolved)).toThrow(/cuts-not-computed/)
  expect(() => graphOf(unresolved)).toThrow(/UNRESOLVED/)
})

test("a legitimately empty cut, solder or wire list is NOT a missing line", () => {
  // The other side of the refusal above, and the reason CUT_STATE carries it:
  // CRITERIA says the lists "may legitimately be zero lines, e.g. a strip board
  // with only one net on it". COMPUTED is what makes zero lines evidence.
  const noFeatures = BOARD.split("\n")
    .filter((line) => !line.startsWith("CUT "))
    .join("\n")
  expect(() => graphOf(noFeatures)).not.toThrow()
})

test("the graph is built without reading NODE lines or any nodeId - the independence", () => {
  // The CUT line's node ids are Element::GetNodeId(), VeroRoute's own net
  // assignment arriving by a second route. Replacing them with garbage, and
  // emptying the NODE block, must not change one component.
  //
  // MUTATION RUN (break 4, run FIRST because it is the defect HC8 exists to
  // prevent and the only one whose absence would still look like a working
  // gate): reading the CUT line's nodeId into the component key - the
  // component number of a hole a CUT names becomes that hole's painted node
  // id. Grouping is unchanged, so only this test notices. Observed:
  //   error: expect(received).toEqual(expected)
  //   @@ -3,4 +3,4 @@
  //      "0,1" => 0,
  //   -  "0,2" => 8,
  //   -  "0,3" => 8,
  //   +  "0,2" => 424242,
  //   +  "0,3" => 424242,
  //      "1,0" => 2,
  //   14 pass / 1 fail - this test alone. Reverted.
  const withNodes = `${BOARD}\nNODE 1 NAME net_a R1.1 R2.1\nNODE 2 NAME net_b R1.2 R2.2`
  const garbled = withNodes
    .replace("CUT 0,1,7 0,2,8", "CUT 0,1,999999 0,2,424242")
    .replace(/^NODE .*$/gm, "")
  expect(graphOf(garbled).components).toEqual(graphOf(withNodes).components)
  // And the NODE block really was read by the parser, so the comparison is
  // between a dump that had one and a dump that does not.
  expect(Object.keys(parseBoardDump(withNodes).nodes)).toEqual(["1", "2"])
  expect(Object.keys(parseBoardDump(garbled).nodes)).toEqual([])
})
