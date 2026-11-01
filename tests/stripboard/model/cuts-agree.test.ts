/**
 * THE DIFFERENTIAL TEST: our cut derivation against VeroRoute's own, on the
 * committed boards.
 *
 * **HOW BIG THIS EVIDENCE ACTUALLY IS, SIZED BEFORE IT IS LEANED ON.** The plan
 * billed it as eleven boards whose cut sets an independent C++ implementation
 * derived years ago. **Measured, THREE of the committed boards import completely** -
 * `transistor-preamp-feedback` (5 cuts, hand-laid and hand-built by the owner),
 * `transistor-preamp-loop` (49 cuts) and, since 2026-10-30,
 * `transistor-preamp-staged` (10 cuts). The rest refuse for reasons that belong
 * to the importer and to part records rather than to cut derivation, and each
 * one's key is asserted below so that a board which starts importing fails this
 * file rather than quietly staying out of the comparison. **64 cuts across three
 * real boards is what this test runs on, and calling it an eleven-board
 * comparison would be false.**
 *
 * **THE THIRD BOARD IS HERE BECAUSE THIS FILE DEMANDED IT, which is the mechanism
 * working rather than a widening somebody chose.** `transistor-preamp-staged`
 * refused to import for want of a lead span and a pin pattern for
 * `Capacitor_THT:CP_Radial_D10.0mm_P5.00mm`; recording those (Panasonic M-A
 * ECA-1VM471) made it import, and the "starts importing" assertion below went red
 * until it was either compared or excluded for a stated reason. It is compared:
 * all three of its per-board agreements hold, unchanged and unexplained-away.
 *
 * **WHAT AGREES, AND IT IS THE SUBSTANCE.** On both boards the two derivations
 * find the same NUMBER of cuts, on the same STRIPS, separating the same pairs of
 * runs - and every one of the fork's cuts falls inside the between-runs gap our
 * derivation identified, one for one. The copper partition over the significant
 * contacts is therefore identical. That is checked here rather than asserted, and
 * a count match alone would not have been enough: Task 9's materialization
 * requires physical-state equivalence, so two cut sets agreeing on how many and
 * disagreeing on which strip is exactly what this file exists to catch.
 *
 * **WHAT DIFFERS, AND WHY IT IS A CONVENTION RATHER THAN A FINDING.** Which gap
 * inside that span each cut sits in. Our convention is declared in
 * `lib/stripboard/cuts.ts` - the gap with the greatest clearance from the nearest
 * soldered hole, ties downwards - and the fork's is not a convention about
 * building at all: `.tools/veroroute-perfboard/Src/Reconcile_cuts.cpp`'s
 * `DeriveCuts` puts the cut "between the hole at which the nodeId changes and the
 * hole IMMEDIATELY BEFORE it on the strip", walking holes whose nodeIds
 * `AutoFillVero` PAINTED. So the fork's gap is a function of its paint, which on
 * a hand-laid board is a function of what a person painted. Measured both ways:
 * our convention puts 40 of the 64 cuts in the fork's own gap, and a
 * hug-the-earlier-run convention would put 58 there. **The convention was chosen
 * on the clearance argument and not tuned towards either figure**, the difference
 * is reported rather than smoothed over, and `gapFor` is one line if the plan
 * would rather have the other rule.
 *
 * **ONE INDEPENDENCE CAVEAT, flagged by Task 8 and sharpened here.** A wire's net
 * comes from the node id the fork prints on the wire's ends, so on a wire-carrying
 * board this comparison is not fully independent of VeroRoute's own net identity.
 * There is no second source: the reference netlist names a wire nothing.
 * `transistor-preamp-feedback` carries 4 wires and `transistor-preamp-staged` 7,
 * so both are affected.
 * **`transistor-preamp-loop` carries none**, and its bridges' nets come from the
 * pins in their own holes (`tools/stripboard/vero-import-nets.ts`'s `bridgesOf`)
 * rather than from a node id - so its 49 cuts are derived from the `PIN` lines and
 * the KiCad export alone, and that board's agreement IS independent.
 */
import { expect, test } from "bun:test"
import { parseBoardDump } from "../../../tools/guide/dump.ts"
import { candidateFromDump } from "../../../tools/stripboard/vero-import.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import { componentsOf } from "../../../lib/stripboard/connectivity.ts"
import {
  derivedCuts,
  holeKey,
  runsOf,
  significantContacts,
  type Cut,
  type ReferenceNets,
} from "../../../lib/stripboard/cuts.ts"
import {
  COMMITTED_BOARDS,
  dumpTextOf,
  footprintsOf,
  referenceOf,
  type CommittedBoard,
} from "../vero-import-fixtures.ts"

/**
 * The boards this comparison runs on, and the leading refusal key of every board
 * it does not.
 *
 * **A BOARD MISSING FROM BOTH LISTS FAILS**, and so does one that moves between
 * them. That is the point: the comparison's reach is the thing most likely to
 * shrink silently as the importer changes, and a shrinking differential test that
 * still passes is the failure mode this whole workflow exists to prevent.
 */
const COMPARED: readonly string[] = ["transistor-preamp-feedback", "transistor-preamp-loop", "transistor-preamp-staged"]

const REFUSED: ReadonlyMap<string, string> = new Map([
  // Footprints with no recorded pin pattern - part records, not cut derivation.
  ["pt2399-core", "vero-import-no-geometry"],
  // A Phoenix terminal block in no pattern or span table at all.
  ["pultec-low-boost-frozen", "vero-import-no-geometry"],
  // The synthetic refs an --import run invents, which no committed map covers.
  ["pultec-low-boost-imported", "vero-import-footprint-unmapped"],
  // One SOLDER line whose net the dump does not record anywhere.
  ["transistor-preamp-buffered", "vero-import-bridge-net-unknown"],
])

function candidateOf(board: CommittedBoard): Candidate {
  return candidateFromDump(
    dumpTextOf(board),
    referenceOf(board),
    footprintsOf(board),
    PIN_PATTERNS,
  )
}

/**
 * The fork's `CUT` lines as this model's `Cut`, with the reading checked rather
 * than assumed.
 *
 * A `CUT` line names two holes with a node id each. That the two are on one strip
 * and in neighbouring columns is what makes `afterColumn = min(column)` a
 * faithful reading, so it is asserted per line; and that their node ids differ is
 * the fork's own independent statement that the two sides really are different
 * nets (`Headless_dump.cpp` reads them off the board rather than off its own
 * derivation, for exactly that reason).
 */
function forkCuts(board: CommittedBoard): readonly Cut[] {
  const dump = parseBoardDump(dumpTextOf(board))
  return dump.cuts.map((cut) => {
    expect(cut.a.row, `${board.name}: a CUT line names one strip`).toBe(cut.b.row)
    expect(
      Math.abs(cut.a.col - cut.b.col),
      `${board.name}: a CUT line names two neighbouring holes`,
    ).toBe(1)
    expect(
      cut.a.nodeId,
      `${board.name}: the fork reports different nodes either side of its own cut`,
    ).not.toBe(cut.b.nodeId)
    return { strip: cut.a.row, afterColumn: Math.min(cut.a.col, cut.b.col) }
  })
}

const canonical = (cuts: readonly Cut[]): readonly string[] =>
  cuts.map((cut) => `${cut.strip}:${cut.afterColumn}`).sort()

/** How many cuts each strip carries, as a sorted, printable list. */
const perStrip = (cuts: readonly Cut[]): readonly string[] => {
  const counts = new Map<number, number>()
  for (const cut of cuts) counts.set(cut.strip, (counts.get(cut.strip) ?? 0) + 1)
  return [...counts]
    .sort((a, b) => a[0] - b[0])
    .map(([strip, count]) => `strip ${strip}: ${count}`)
}

/** Which significant contacts share a conductor, as a canonical string. */
function contactPartition(
  candidate: Candidate,
  reference: ReferenceNets,
  cuts: readonly Cut[],
): string {
  const components = componentsOf(candidate, cuts)
  const groups = new Map<number, Set<string>>()
  for (const contact of significantContacts(candidate, reference)) {
    const key = holeKey(contact.hole)
    const id = components.get(key)
    if (id === undefined) throw new Error(`no conductor for hole ${key}`)
    const group = groups.get(id) ?? new Set<string>()
    group.add(key)
    groups.set(id, group)
  }
  return [...groups.values()]
    .map((group) => [...group].sort().join("|"))
    .sort()
    .join(" / ")
}

const compared: readonly CommittedBoard[] = COMMITTED_BOARDS.filter((board) =>
  COMPARED.includes(board.name),
)

test("every committed board either imports and is compared, or refuses by a named key", () => {
  expect(COMPARED.length + REFUSED.size, "every board is accounted for").toBe(
    COMMITTED_BOARDS.length,
  )
  for (const board of COMMITTED_BOARDS) {
    const expected = REFUSED.get(board.name)
    if (expected === undefined) {
      expect(COMPARED, `${board.name} is compared`).toContain(board.name)
      expect(() => candidateOf(board)).not.toThrow()
      continue
    }
    let message = ""
    try {
      candidateOf(board)
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message, `${board.name} still refuses`).toStartWith(`${expected}: `)
  }
})

test("the comparison runs on three boards and 64 of the fork's cuts, not eleven boards", () => {
  expect(compared.map((board) => board.name)).toEqual([...COMPARED])
  expect(compared.reduce((total, board) => total + forkCuts(board).length, 0)).toBe(64)
})

for (const board of COMMITTED_BOARDS) {
  if (!COMPARED.includes(board.name)) continue

  test(`${board.name}: the two derivations find the same cuts on the same strips`, () => {
    const ours = derivedCuts(candidateOf(board), referenceOf(board))
    const fork = forkCuts(board)
    expect(ours.length, "the same number of cuts").toBe(fork.length)
    expect(perStrip(ours), "on the same strips, with the same count on each").toEqual(
      perStrip(fork),
    )
  })

  test(`${board.name}: every fork cut is in the gap our derivation chose, one for one`, () => {
    // POSITIONS, NOT COUNTS. Two cut sets can agree on how many and disagree on
    // which strip, and Task 9's materialization needs physical-state
    // equivalence - so this walks each of the fork's cuts to the pair of runs it
    // separates and insists our list holds exactly one cut in that same span.
    const candidate = candidateOf(board)
    const reference = referenceOf(board)
    const ours = derivedCuts(candidate, reference)
    const runs = runsOf(significantContacts(candidate, reference))
    const claimed = new Set<string>()
    for (const cut of forkCuts(board)) {
      const onStrip = runs.filter((run) => run.strip === cut.strip)
      const span = onStrip
        .map((run, index) => ({ earlier: onStrip[index - 1], later: run }))
        .find(
          ({ earlier, later }) =>
            earlier !== undefined &&
            earlier.net !== later.net &&
            earlier.lastColumn <= cut.afterColumn &&
            cut.afterColumn < later.firstColumn,
        )
      expect(
        span?.earlier,
        `fork cut ${cut.strip}:${cut.afterColumn} separates two runs of our own`,
      ).toBeDefined()
      const earlier = span?.earlier
      const later = span?.later
      if (earlier === undefined || later === undefined) continue
      const mine = ours.filter(
        (one) =>
          one.strip === cut.strip &&
          one.afterColumn >= earlier.lastColumn &&
          one.afterColumn < later.firstColumn,
      )
      expect(
        mine.length,
        `exactly one of our cuts in ${cut.strip}:${earlier.lastColumn}..${later.firstColumn - 1} ` +
          `(${earlier.net} | ${later.net})`,
      ).toBe(1)
      const key = `${cut.strip}:${earlier.lastColumn}`
      expect(claimed.has(key), "no two fork cuts claim one span").toBe(false)
      claimed.add(key)
    }
    expect(claimed.size, "and every one of our cuts was claimed").toBe(ours.length)
  })

  test(`${board.name}: the copper partition over the contacts is the same either way`, () => {
    const candidate = candidateOf(board)
    const reference = referenceOf(board)
    expect(contactPartition(candidate, reference, derivedCuts(candidate, reference))).toEqual(
      contactPartition(candidate, reference, forkCuts(board)),
    )
  })
}

test("how many positions agree exactly, which is a property of the convention", () => {
  // ASSERTED AS A FIGURE SO THAT CHANGING `gapFor` SAYS SO. It is not a
  // correctness claim: the tests above are, and they hold whichever gap the
  // convention picks inside a span. The three numbers are 1 of 5 on `feedback`,
  // 37 of 49 on `loop` and 2 of 10 on `staged`.
  const agreed = new Map<string, string>()
  for (const board of compared) {
    const ours = canonical(derivedCuts(candidateOf(board), referenceOf(board)))
    const fork = canonical(forkCuts(board))
    const same = fork.filter((key) => ours.includes(key)).length
    agreed.set(board.name, `${same} of ${fork.length}`)
  }
  expect([...agreed]).toEqual([
    ["transistor-preamp-feedback", "1 of 5"],
    ["transistor-preamp-loop", "37 of 49"],
    ["transistor-preamp-staged", "2 of 10"],
  ])
})

test("the fork's own gap rule, applied to our runs, would agree on 58 of the 64", () => {
  // The measurement behind this module's comment, kept as a test so the claim is
  // checked rather than remembered: hugging the earlier run's last hole - which
  // is what `AutoFillVero`'s paint amounts to on these boards - reproduces the
  // fork's positions on 58 of the 64 cuts. Two of the six it does not are on
  // `feedback`, whose paint was a person's.
  //
  // **THE OTHER FOUR ARE ON `staged` AND ARE UNDIAGNOSED**, stated rather than
  // explained away: this figure went from 52 of 54 to 58 of 64 when that board
  // joined the comparison, so six of its ten cuts hug and four do not, while only
  // two of its ten sit where OUR convention puts them. Nothing here establishes
  // whose paint that board carries. WHAT WOULD SETTLE IT: read whether its
  // committed `.vrt` was painted by `AutoFillVero` or by hand, which is the same
  // question `feedback`'s two answered. It bears on this caveat and on nothing
  // above it - every correctness comparison on that board holds.
  let agreed = 0
  let total = 0
  for (const board of compared) {
    const candidate = candidateOf(board)
    const reference = referenceOf(board)
    const runs = runsOf(significantContacts(candidate, reference))
    const hugging: Cut[] = []
    for (let index = 1; index < runs.length; index += 1) {
      const earlier = runs[index - 1]
      const later = runs[index]
      if (earlier === undefined || later === undefined) continue
      if (earlier.strip !== later.strip || earlier.net === later.net) continue
      hugging.push({ strip: earlier.strip, afterColumn: earlier.lastColumn })
    }
    const fork = canonical(forkCuts(board))
    const theirs = canonical(hugging)
    total += fork.length
    agreed += fork.filter((key) => theirs.includes(key)).length
  }
  expect(total).toBe(64)
  expect(agreed).toBe(58)
})

test("transistor-preamp-loop carries no wire, so its 49 cuts are an independent comparison", () => {
  // The caveat Task 8 recorded is that a wire's net comes from the fork's own
  // node id. This board has no wire at all, and its bridges' nets come from the
  // pins in their own holes - so nothing about VeroRoute's net identity reaches
  // the derivation on it.
  const loop = compared.find((board) => board.name === "transistor-preamp-loop")
  expect(loop).toBeDefined()
  if (loop === undefined) return
  const candidate = candidateOf(loop)
  expect(candidate.wires.length, "no wires on this board").toBe(0)
  expect(candidate.bridges.length, "and five bridges, whose nets come from pins").toBe(5)
  expect(derivedCuts(candidate, referenceOf(loop)).length).toBe(49)
})

test("transistor-preamp-feedback carries wires, so its 5 cuts are NOT fully independent", () => {
  const feedback = compared.find((board) => board.name === "transistor-preamp-feedback")
  expect(feedback).toBeDefined()
  if (feedback === undefined) return
  const candidate = candidateOf(feedback)
  expect(candidate.wires.length, "four wires, each with a fork-derived net").toBe(4)
})
