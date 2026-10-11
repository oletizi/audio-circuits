/**
 * P0's targets, and the one implementation of the cut/bridge identity.
 *
 * HOW EVERY EXPECTATION HERE IS DERIVED INDEPENDENTLY OF THE CODE, which for
 * a one-line formula is the whole difficulty: `expect(floor).toBe(Math.max(0,
 * n - r))` computes the expectation the same way `deriveTargets` does and
 * proves nothing at all. So no expectation below is computed from the
 * module's own output. Each comes from one of four places - COST's measured
 * tables, the identity run backwards against them, a hand-counted fixture, or
 * the frozen dump read for its own terms - and `./targets-oracle.ts` says
 * which figure came from which, field by field, including the one thing that
 * is NOT an independent oracle and why residency is what discriminates there.
 *
 * REFUSALS ANCHOR ON THEIR OPENING CLAUSE with `toStartWith`. Eight refusals
 * share the same prose about counts and the identity, and a `toContain` or a
 * bare regex would pass against a neighbouring clause - which is not
 * hypothetical here: two of the mutations below landed on a NEIGHBOURING
 * clause, refusing with the wrong member and naming the wrong fix, and the
 * anchor is what caught them. Every refusal was driven by breaking the clause
 * that raises it, running this file, and copying the REAL output into the
 * comment beside the assertion.
 */
import { test, expect } from "bun:test"
import { circuit } from "../../lib/model/index.ts"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import {
  clustering,
  deriveTargets,
  occupiedStrips,
  onBoard,
  segmentJoins,
} from "../../tools/stripboard/targets.ts"
import {
  BOARDS,
  LOW_CUT_OFF_BOARD,
  componentsOf,
  dumpWithAxis,
  joinsOnBoard,
  netPairsOf,
  refusalFrom,
} from "./targets-oracle.ts"

/** HC6's stock, read from the rules rather than written here as a literal. */
const STRIPS = loadRules().stockRows

const FROZEN_DUMP = "tests/fixtures/stripboard/pultec-low-boost-frozen.dump"

// --- The floor --------------------------------------------------------------

test("the floor is zero on every Pultec section, because each has fewer nets than the stock has strips", () => {
  // MUTATION RUN: with `cutFloor: netCount` the five boards failed with
  // 'error: mid floor / Expected: 0 / Received: 28' and so on - 28, 20, 14,
  // 14, 14, each board's own net count. Reverted.
  //
  // THE EXPECTED NET COUNTS ARE COST §2.3's "nets (model)" COLUMN, and §6.4's
  // first column agrees with it. 34 is HC6's stock, from the rules file. The
  // floor's zero then follows by hand: 28 < 34, so max(0, 28 - 34) = 0.
  //
  // MUTATION RUN, against the claim that N counts a pad's net too: counting
  // only the nets ON-BOARD components touch read 'error: mid nets / Expected:
  // 28 / Received: 26' here and failed five further tests, mid's floor at four
  // strips reading 22 instead of 24. Reverted.
  expect(STRIPS).toBe(34)
  for (const board of BOARDS) {
    const targets = deriveTargets(physicalBoard(board.section), STRIPS, `pultec-${board.section}`)
    expect(targets.netCount, `${board.section} nets`).toBe(board.nets)
    expect(targets.netCount, `${board.section} has room`).toBeLessThan(STRIPS)
    expect(targets.cutFloor, `${board.section} floor`).toBe(0)
    expect(targets.strips, `${board.section} strips`).toBe(STRIPS)
    expect(targets.board, `${board.section} name`).toBe(`pultec-${board.section}`)
  }
})

test("the floor at the four strips --import crammed mid into is twenty-four", () => {
  // DERIVED BY HAND, not by the formula under test: mid's model has 28 nets
  // (COST §2.3), so on four strips twenty-four of them must share with another
  // net, each sharing costing one cut (COST §1.4). 28 - 4 = 24.
  //
  // WHY THIS IS NOT COST §2.2's 19. That figure is the same arithmetic against
  // the COMMITTED layout's 23 nets, and §2.3 restates the floors against the
  // current model precisely because the layouts are stale. CRITERIA K4 records
  // that τ was offered to the owner against the 19 and that he was right to
  // decline.
  const targets = deriveTargets(physicalBoard("mid"), 4, "pultec-mid")
  expect(targets.cutFloor).toBe(24)
  expect(targets.netCount - targets.cutFloor).toBe(4)
})

test("the floor is zero once the strips reach the nets, and never negative beyond", () => {
  // Hand-derived from COST §2.1: R beyond N buys nothing, because an empty
  // strip contributes one segment and one strip and the two cancel (Lemma 3).
  // low-cut has 14 nets (§2.3), so 13 strips leave exactly one net sharing, 14
  // leave none, and 15 is the same zero rather than -1.
  const floorAt = (strips: number): number =>
    deriveTargets(physicalBoard("low-cut"), strips, "pultec-low-cut").cutFloor
  expect(floorAt(13)).toBe(1)
  expect(floorAt(14)).toBe(0)
  expect(floorAt(15)).toBe(0)
})

// --- The net graph and its two bandwidth bounds -----------------------------

test("the net graph reproduces COST §6.4's measured row for every board", () => {
  // EVERY NUMBER HERE WAS MEASURED BY ANOTHER PROGRAM: COST §6.4's table,
  // from `scratchpad/netgraph.ts`. Reproducing all five rows exactly - edges,
  // maximum degree, both bandwidth bounds - is an agreement between two
  // implementations of the same definition, which is the only kind of
  // agreement worth asserting about arithmetic this short.
  for (const board of BOARDS) {
    const { netGraph } = deriveTargets(physicalBoard(board.section), STRIPS, board.section)
    expect(netGraph.nets.length, `${board.section} vertices`).toBe(board.nets)
    expect(netGraph.edges.length, `${board.section} edges`).toBe(board.edges)
    expect(netGraph.maxDegree, `${board.section} max degree`).toBe(board.maxDegree)
    expect(netGraph.bandwidthLowerBound, `${board.section} lower bound`).toBe(board.lowerBound)
  }
})

test("the RCM ordering's bandwidth is COST §6.4's upper bound, and it bounds the lower bound above", () => {
  // The `rcm` column of §6.4, measured there as "bandwidth of one RCM
  // ordering (an upper bound)": 5, 4, 9, 11, 9. The ordering is one
  // arrangement rather than an optimal one, so this is the figure a DIFFERENT
  // ordering would legitimately change - which is why it is asserted against
  // the measurement rather than against a formula, and why the lower bound is
  // asserted separately above.
  //
  // MUTATION RUN, AND IT SHOWS THE FIGURE IS NOT ROBUST TO THE TIE-BREAK:
  // taking BFS roots and neighbours in name order alone, without the
  // increasing-degree rule Cuthill-McKee specifies, read 'error: mid RCM
  // bandwidth / Expected: 5 / Received: 6'. The other four were unchanged.
  // Reverted. So this assertion pins the ordering COST measured, and a future
  // deliberate change to the ordering heuristic is expected to fail it and to
  // be re-measured rather than relaxed.
  for (const board of BOARDS) {
    const targets = deriveTargets(physicalBoard(board.section), STRIPS, board.section)
    expect(targets.orderingBandwidth, `${board.section} RCM bandwidth`).toBe(board.rcm)
    expect(
      targets.orderingBandwidth,
      `${board.section} upper bound is above the lower bound`,
    ).toBeGreaterThanOrEqual(targets.netGraph.bandwidthLowerBound)
  }
})

test("the ordering is one net per strip: a permutation of the nets, nothing dropped or repeated", () => {
  // The floor's condition (a) is one net per strip (COST §2.1), so an
  // ordering that dropped a net - an isolated one, say, which no on-board
  // component touches - would be an arrangement of a smaller board than the
  // one being graded. mid has exactly two such nets: 28 nets against the 26
  // its on-board components touch.
  for (const board of BOARDS) {
    const targets = deriveTargets(physicalBoard(board.section), STRIPS, board.section)
    expect(new Set(targets.ordering).size, `${board.section} distinct`).toBe(board.nets)
    expect([...targets.ordering].sort(), `${board.section} same nets`)
      .toEqual([...targets.netGraph.nets].sort())
  }
})

test("a hand-counted network's nets, edges and degrees are what the graph reports", () => {
  // THE WHOLE FIXTURE, COUNTED BY HAND. Three on-board parts and one
  // off-board landing:
  //   r1  on board   A-B
  //   c1  on board   B-C
  //   r2  on board   A-B   (a second part on a pair r1 already forces)
  //   sw1 off board  C-D-A (a three-net landing: C-D, C-A and D-A)
  // Nets: A, B, C, D - four, D being named only by the off-board part.
  // Edges, on-board components only and de-duplicated: A-B (twice forced,
  // once counted) and B-C. Two.
  // Degrees: A 1, B 2, C 1, D 0 - so maxDegree 2 and the lower bound
  // ceil(2/2) = 1. Pins: 2 + 2 + 2 + 3 = 9.
  // Bandwidth: the only arrangement BFS can produce from the path A-B-C is a
  // contiguous one, and D is its own component, so the widest edge gap is 1.
  const network = circuit()
    .resistor("r1", "1k", { a: "A", b: "B" }, { footprint: "R_Axial_DIN0207" })
    .capacitor("c1", "100nF", { a: "B", b: "C" }, { footprint: "C_Disc_D3.0mm" })
    .resistor("r2", "2k", { a: "A", b: "B" }, { footprint: "R_Axial_DIN0207" })
    .connector("sw1", { "1": "C", "2": "D", "3": "A" }, { symbol: "Connector:Conn_01x03" })
    // D reaches only this one pin, so the model requires it to be a declared
    // port. A port is a name for a net, not a pin, so it adds nothing to
    // either count below.
    .port("tap", "D")
    .done()
  const targets = deriveTargets(network, 3, "hand-counted")
  expect(targets.netGraph.nets).toEqual(["A", "B", "C", "D"])
  expect(targets.netGraph.edges).toEqual([["A", "B"], ["B", "C"]])
  expect(targets.netGraph.maxDegree).toBe(2)
  expect(targets.netGraph.bandwidthLowerBound).toBe(1)
  expect(targets.orderingBandwidth).toBe(1)
  expect(targets.netCount).toBe(4)
  expect(targets.pinCount).toBe(9)
  // Four nets on three strips: one net must share, and that costs one cut.
  expect(targets.cutFloor).toBe(1)
})

// --- Residency: which components force an edge ------------------------------

test("off-board components force no edge, because they break out as free single-hole pads", () => {
  // COST §6.4's own rule for the net graph: "net-graph vertices are nets,
  // edges are forced by on-board components, off-board components break out
  // as free single-hole pads and force nothing". A panel rotary must not make
  // the nets it selects between adjacent in the arrangement, because no part
  // body has to reach across them.
  //
  // THE TEST THIS REPLACES looped over the edges asserting each endpoint was
  // a known net, which every edge satisfies by construction. BOTH HALVES ARE
  // HERE because either alone passes a wrong implementation: with off-board
  // components included in the edge set the first half fails; with no edges
  // emitted at all the second half fails.
  //
  // MUTATION RUN (a), `if (!onBoard(component)) continue` deleted from
  // buildGraph: 'error: SW_LO_CUT is off board and must force no edge
  // out-j5_p1 / Expected: false / Received: true', with mid's edge count
  // reading 104 against §6.4's 29 and its RCM bandwidth 17 against 5.
  // MUTATION RUN (b), the de-duplication test inverted so no edge is ever
  // emitted: 'error: C1 is on board and must force edge hi_boost_out-j5_p1 /
  // Expected: true / Received: false', with mid's edge count 0. Each run
  // failed four tests; both reverted.
  const network = physicalBoard("low-cut")
  const targets = deriveTargets(network, STRIPS, "pultec-low-cut")
  const edge = (a: string, b: string): boolean =>
    targets.netGraph.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

  const offBoard = componentsOf(network, LOW_CUT_OFF_BOARD, "off")
  expect(offBoard.length, "low-cut must actually carry an off-board component").toBeGreaterThan(0)
  let discriminating = 0
  for (const component of offBoard) {
    for (const [a, b] of netPairsOf(component)) {
      if (joinsOnBoard(network, LOW_CUT_OFF_BOARD, a, b)) continue
      discriminating += 1
      expect(edge(a, b), `${component.id} is off board and must force no edge ${a}-${b}`).toBe(false)
    }
  }
  // Without this the first half could be vacuous: if every off-board pair
  // happened to be forced on board too, the loop above would assert nothing
  // while reading as a pass.
  expect(discriminating, "off-board pairs no on-board part forces anyway").toBeGreaterThan(0)

  const onBoardComponents = componentsOf(network, LOW_CUT_OFF_BOARD, "on")
  expect(onBoardComponents.length).toBeGreaterThan(0)
  for (const component of onBoardComponents) {
    for (const [a, b] of netPairsOf(component)) {
      expect(edge(a, b), `${component.id} is on board and must force edge ${a}-${b}`).toBe(true)
    }
  }
})

test("the footprint marker the module reads agrees with the residency list, on every board", () => {
  // TWO VOCABULARIES, HELD AGAINST EACH OTHER. `OFF_BOARD_IDS` is
  // `circuits/pultec/off-board.ts`'s list BY COMPONENT ID, reaching here
  // through `sectionBoard`. `onBoard` reads the `part.footprint` marker
  // `circuits/pultec/physical/parts.ts` attaches from that same list. They
  // are the same decision expressed twice, and this is where a divergence
  // surfaces: a part moved on-board by deleting a line from the list and
  // given no footprint would otherwise reach the net graph as an off-board
  // landing and silently force no edge.
  for (const board of BOARDS) {
    const network = physicalBoard(board.section)
    const byMarker = network.components.filter((component) => !onBoard(component))
      .map((component) => component.id).sort()
    expect(byMarker, `${board.section} off-board`).toEqual([...board.offBoard].sort())
  }
})

// --- S_occ ------------------------------------------------------------------

test("S_occ counts distinct strips holding a lead, on the axis VERTICAL_STRIPS names", () => {
  // HAND-COUNTED. One part, two leads, at holes (0,0) and (2,0). Under
  // horizontal strips a strip is a row, and the two leads are on rows 0 and
  // 2: two strips. Under vertical strips a strip is a column, and both leads
  // are on column 0: one strip. Same holes, different axis, different answer
  // - which is why the axis is read rather than assumed.
  //
  // MUTATION RUN: counting every PIN hole instead of distinct strips gave
  // 'error: Expected: 1 / Received: 2' on the vertical case, and two further
  // failures - the frozen fixture's S_occ read 27 instead of 5, and its J
  // read 23 instead of 1. Reverted.
  const holes = [
    "PART R1 RESISTOR4 1k AT 0,0 SPAN 1", "PIN R1 1 AT 0,0", "PIN R1 2 AT 2,0",
  ]
  expect(occupiedStrips(boardGeometry(dumpWithAxis(0, holes)))).toBe(2)
  expect(occupiedStrips(boardGeometry(dumpWithAxis(1, holes)))).toBe(1)
})

test("S_occ counts a pad's hole with the parts' leads, on the frozen low-boost fixture", async () => {
  // COST §1.6 counts low-boost's occupied strips by hand from its own dump:
  // "nets on strips are rows 3 (six nets), 5, 7, 9 and 10, giving S_occ = 5".
  // Rows 3 and 10 hold NOTHING BUT PAD holes (the rotary's seven landings and
  // the pot's third), so a reading that skipped pads would report 4 and the
  // identity would then miss low-boost's cut count by one.
  const dump = boardGeometry(await Bun.file(FROZEN_DUMP).text())
  expect(occupiedStrips(dump)).toBe(5)
})

test("a placed part whose leads the dump does not report refuses, rather than undercounting S_occ", () => {
  // MUTATION RUN: with the loop over `dump.parts` removed, this read
  // 'error: expect(received).toStartWith(expected) / Received: ""' - no
  // refusal at all. S_occ then reads 1, from R1's two leads on row 0 alone,
  // on a board where R2 is placed as well: the undercount this refuses.
  // Reverted.
  const message = refusalFrom(() => occupiedStrips(boardGeometry(dumpWithAxis(0, [
    "PART R1 RESISTOR4 1k AT 0,0 SPAN 1", "PART R2 RESISTOR4 1k AT 2,0 SPAN 1",
    "PIN R1 1 AT 0,0", "PIN R1 2 AT 0,2",
  ]))))
  expect(message).toStartWith(
    "occupied-missing-pins: part R2 (RESISTOR4) is placed but the dump has no PIN lines for it",
  )
})

// --- The identity, run backwards against what was measured ------------------

test("the identity reproduces every board's measured J from its measured C, N and S_occ", () => {
  // COST §1.6 VERIFIED `C = N + J - S_occ` to the unit on all five committed
  // layouts and reports all four terms, so `segmentJoins` can be handed three
  // and checked against the fourth: 46, 27, 24, 16 and 1. This is the
  // identity run BACKWARDS against a measurement - the only way to check a
  // one-line rearrangement without restating it.
  for (const board of BOARDS) {
    expect(segmentJoins(board.cuts, board.layoutNets, board.occupied), board.section)
      .toBe(board.joins)
  }
})

test("kappa reproduces COST §5's measured fraction for every board", () => {
  // §5's "J / (P - N)" column: 46/48, 27/28, 24/24, 16/18 and 1/18, i.e.
  // 0.96, 0.96, 1.00, 0.89 and 0.06. hi-cut's 1.00 is the worst possible
  // value and is admitted rather than refused: J = P - N is the corollary's
  // upper end, where every pin is its own segment.
  for (const board of BOARDS) {
    expect(clustering(board.joins, board.layoutPins, board.layoutNets), board.section)
      .toBeCloseTo(board.kappa, 10)
  }
  expect(clustering(24, 35, 11)).toBe(1)
})

test("the identity's terms come off the frozen fixture, and give J = 1 and kappa = 1/18", async () => {
  // COST §1.6 and §5: N = 9, P = 27, S_occ = 5, C = 5, so J = 1 and
  // kappa = 1/18. N, P and C are READ FROM THE FIXTURE here rather than
  // restated, so the two produced numbers are the only literals.
  const dump = boardGeometry(await Bun.file(FROZEN_DUMP).text())
  const nets = Object.keys(dump.nodes).length
  const pins = Object.values(dump.pins).reduce((total, list) => total + list.length, 0)
  expect([nets, pins, dump.cuts.length]).toEqual([9, 27, 5])
  const joins = segmentJoins(dump.cuts.length, nets, occupiedStrips(dump))
  expect(joins).toBe(1)
  expect(clustering(joins, pins, nets)).toBeCloseTo(1 / 18, 10)
})

test("P counts a pad's hole as a pin, which is a different column from COST's on-board pins", async () => {
  // DERIVED FROM TWO SOURCES, NEITHER OF THEM THIS MODULE: COST §2.3 gives
  // low-boost 40 on-board pins, and the frozen fixture carries ten `PAD`
  // lines - the 47K pot's three landings and the rotary's seven. Every pad
  // prints a `PIN` line, so P = 40 + 10 = 50. Were `pinCount` the on-board
  // column instead, kappa's denominator would omit ten holes that can split a
  // net exactly as a lead can.
  //
  // MUTATION RUN: with `pinCount` summed over on-board components only, this
  // read 'Expected: 50 / Received: 40' - exactly COST §2.3's on-board column,
  // which is how a reader would mistake the two - and the hand-counted
  // network's P read 6 instead of 9. Reverted.
  const padLines = (await Bun.file(FROZEN_DUMP).text())
    .split("\n").filter((line) => line.startsWith("PAD ")).length
  expect(padLines).toBe(10)
  const targets = deriveTargets(physicalBoard("low-boost"), STRIPS, "pultec-low-boost")
  expect(targets.pinCount).toBe(40 + padLines)
})

// --- The refusals -----------------------------------------------------------

test("a negative J refuses, naming CUT_STATE, because J = sum(k - 1) cannot be below zero", () => {
  // `transistor-preamp-lab` yields C = 0, N = 18, S_occ = 17 and hence
  // J = -1, which correctly revealed a board whose CUT_STATE is UNRESOLVED
  // and which the identity cannot describe (CRITERIA HC2, V2). An impossible
  // value returned as a result would have hidden it.
  //
  // MUTATION RUN: with the `joins < 0` branch deleted, segmentJoins returned
  // -1 and this read 'Received: ""'. Reverted.
  const message = refusalFrom(() => segmentJoins(0, 18, 17))
  expect(message).toStartWith("negative-joins: C = 0, N = 18, S_occ = 17 gives J = C - N + S_occ = -1.")
  expect(message).toContain("CUT_STATE")
  expect(message).toContain("UNRESOLVED")
})

test("kappa refuses when P equals N, rather than dividing by zero", () => {
  // MUTATION RUN: with the `available <= 0` branch deleted, clustering(0, 9,
  // 9) returned 0/0 and this read 'error: expect(received).toStartWith(
  // expected) / Expected to start with: "clustering-undefined: J = 0, P = 9,
  // N = 9 gives P - N = 0." / Received: ""'. A kappa of NaN compares false
  // against every bound, so A2 would have passed the layout. Reverted.
  const message = refusalFrom(() => clustering(0, 9, 9))
  expect(message).toStartWith("clustering-undefined: J = 0, P = 9, N = 9 gives P - N = 0.")
  expect(message).toContain("P - N")
})

test("kappa refuses when P is below N, or when J is above the splitting available", () => {
  // Both are "these three counts did not come from one board". P < N happens
  // when a dump's NODE block describes a board whose parts are not all placed
  // while P counts only the placed ones; J > P - N contradicts COST §1.4's
  // corollary outright.
  //
  // WHY THE ANCHOR IS ON THE CLAUSE AND NOT ON THE CODE, measured: with the
  // `available <= 0` branch deleted, the P < N case still refused - it fell
  // through to the J-above clause and read 'clustering-undefined: J = 1,
  // P = 8, N = 9 has J above P - N = -1.' A test matching the code, or
  // /P - N/, would have passed that; `toStartWith` on the clause caught it.
  // Reverted.
  expect(refusalFrom(() => clustering(1, 8, 9)))
    .toStartWith("clustering-undefined: J = 1, P = 8, N = 9 gives P - N = -1.")
  expect(refusalFrom(() => clustering(19, 27, 9)))
    .toStartWith("clustering-undefined: J = 19, P = 27, N = 9 has J above P - N = 18.")
})

test("a count that did not come from counting refuses, in either arithmetic function", () => {
  // MUTATION RUN: with `requireCount`'s condition disabled, the first
  // assertion read 'Expected to start with: "identity-counts: C = 0.5, N = 2,
  // S_occ = 2: the cut count C is 0.5." / Received: ""' and the run stopped
  // there. Driven directly, the four calls then returned J = 0.5, J = 4 (from
  // N = -1, a plausible-looking join count out of an impossible net count),
  // J = NaN, and kappa = 0.0833. Reverted.
  expect(refusalFrom(() => segmentJoins(0.5, 2, 2)))
    .toStartWith("identity-counts: C = 0.5, N = 2, S_occ = 2: the cut count C is 0.5.")
  expect(refusalFrom(() => segmentJoins(1, -1, 2)))
    .toStartWith("identity-counts: C = 1, N = -1, S_occ = 2: the net count N is -1.")
  expect(refusalFrom(() => segmentJoins(1, 2, Number.NaN)))
    .toStartWith("identity-counts: C = 1, N = 2, S_occ = NaN: the occupied-strip count S_occ is NaN.")
  expect(refusalFrom(() => clustering(1.5, 27, 9)))
    .toStartWith("identity-counts: J = 1.5, P = 27, N = 9: the segment-join count J is 1.5.")
})

test("a strip count that is not a whole positive number refuses, naming where HC6's figure lives", () => {
  // R is not defaulted: the floor moves one cut per strip, so a guessed R is
  // a floor nobody chose, and Q4 and A3 are both measured against it.
  //
  // MUTATION RUN: with the `strips` guard deleted this read 'Expected to
  // start with: "targets-strips: pultec-low-cut was given 0 strips." /
  // Received: ""', and the three calls returned floors of 14 for no strips at
  // all, 11.5 for two and a half, and 48 for minus thirty-four. A floor of 14
  // is exactly what a board with 14 nets and no strips SHOULD read if the
  // question made sense, which is why it has to be refused rather than
  // returned. Reverted.
  const network = physicalBoard("low-cut")
  expect(refusalFrom(() => deriveTargets(network, 0, "pultec-low-cut")))
    .toStartWith("targets-strips: pultec-low-cut was given 0 strips.")
  expect(refusalFrom(() => deriveTargets(network, 2.5, "pultec-low-cut")))
    .toStartWith("targets-strips: pultec-low-cut was given 2.5 strips.")
  expect(refusalFrom(() => deriveTargets(network, -34, "pultec-low-cut")))
    .toStartWith("targets-strips: pultec-low-cut was given -34 strips.")
})

test("an unnamed board refuses, because a report cannot say which board failed", () => {
  // MUTATION RUN: with the guard deleted this read 'Expected to start with:
  // "targets-board: the board name is \"   \"." / Received: ""' - a target
  // derived and returned under a name of three spaces. Reverted.
  expect(refusalFrom(() => deriveTargets(physicalBoard("low-cut"), STRIPS, "   ")))
    .toStartWith('targets-board: the board name is "   ".')
})

test("a network naming no nets refuses, rather than deriving a floor of zero from nothing", () => {
  // max(0, 0 - 34) = 0 would report a board as already at its floor, which is
  // the one answer that must never be guessed.
  //
  // MUTATION RUN, AND THE CLAUSE ORDER IS LOAD-BEARING BECAUSE OF IT: with
  // the net-count guard deleted, an empty network still refused - the
  // residency clause caught it and read 'targets-residency: none of empty's 0
  // components carries a part.footprint.', which sends the reader off to
  // physicalize a network that has nothing in it to physicalize. Same refusal
  // set, wrong member, wrong fix named. The net-count clause therefore comes
  // first, and this assertion names which one fired. Reverted.
  expect(refusalFrom(() => deriveTargets({ components: [], ports: {} }, STRIPS, "empty")))
    .toStartWith("targets-nets: empty's network names no nets at all.")
})

test("an electrical network refuses, because nothing in it is on the board", () => {
  // The edges are forced by on-board components only, so a network with no
  // `part.footprint` anywhere yields an edgeless graph and targets nothing
  // can be held to - and that is exactly what passing a section's ELECTRICAL
  // network instead of `physicalBoard(section)` produces.
  //
  // MUTATION RUN: with the residency guard deleted this returned a graph with
  // 0 edges, maxDegree 0 and a lower bound of 0 for a two-component circuit,
  // and read 'Received: ""'. Reverted.
  const electrical = circuit()
    .resistor("r1", "1k", { a: "A", b: "B" })
    .capacitor("c1", "100nF", { a: "B", b: "C" })
    .port("in", "A")
    .port("out", "C")
    .done()
  expect(refusalFrom(() => deriveTargets(electrical, STRIPS, "unphysicalized")))
    .toStartWith("targets-residency: none of unphysicalized's 2 components carries a part.footprint.")
})
