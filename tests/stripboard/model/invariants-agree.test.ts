/**
 * THE CROSS-CHECK: the in-memory invariants against `HC8`'s existing verifier,
 * on the committed boards.
 *
 * `lib/stripboard/invariants.ts` reads a `Candidate` and `./connectivity.ts`'s
 * partition; `tools/stripboard/equivalence.ts` reads the `.vrt` dump TEXT and
 * reconstructs the copper from the fork's exported geometry. The two share no
 * code at all - not the parser, not the union-find, not the pin-identity mapping
 * - so an agreement between them is an agreement between two implementations.
 * **A test may import `tools/`; the module under test may not, and
 * `./no-fork.test.ts` enforces that over the whole import closure.**
 *
 * **HOW BIG THIS EVIDENCE IS, SIZED BEFORE IT IS LEANED ON.** Measured
 * 2026-10-14: **two** of the seven committed boards import completely -
 * `transistor-preamp-feedback` and `transistor-preamp-loop`. The other five
 * refuse in the importer, for reasons that belong to part records and to the
 * dump rather than to either invariant, and `./cuts-agree.test.ts` owns the table
 * of their refusal keys. This file asserts only that the reach is still exactly
 * those two, so a board that starts or stops importing fails here rather than
 * quietly joining or leaving the comparison. **Calling this a seven-board
 * cross-check would be false.**
 *
 * **AND THE TWO BOARDS COVER BOTH ANSWERS, which a set of sound boards could
 * not.** `feedback` is sound - the owner laid it out and built it. **`loop` is
 * known broken**: `tests/stripboard/agreement.test.ts` records `HC8` reporting
 * 15 opens on it, corroborated by `make check` reporting 15 of its 16 nets
 * incomplete, on the same nets. So one board exercises the agreement on a pass
 * and the other on fifteen failures - and the agreement is checked finding for
 * finding, not verdict to verdict: the same 15 nets, each with the same pins
 * grouped the same way.
 *
 * **WHAT IS COMPARED AND WHAT IS NOT.** The pins and their GROUPING are compared;
 * the component IDS are not, and deliberately. The two sides number their
 * conductors independently - ours in grid order over the candidate's holes,
 * `copperGraph`'s over the dump's - so equal ids would be a coincidence and
 * unequal ids are not a disagreement. What the two must agree on is which pins
 * share a conductor, which is the whole content of both invariants.
 *
 * **THE SHORT DIRECTION IS NOT EXERCISED BY ANY COMMITTED BOARD**, so it is
 * exercised by perturbation: each of `feedback`'s five `CUT` lines is deleted in
 * turn, and both implementations are then asked about that same board with that
 * same severance missing. All five produce a short, and the two sides name the
 * same pair of nets and the same witness hole every time. Stated plainly: those
 * five are a perturbation and not a measurement of a board anybody laid out.
 *
 * **NO DISAGREEMENT WAS FOUND**, on either board, with either cut source, or on
 * any of the five perturbations. Every figure in this comment was printed by a
 * run, not reasoned to.
 */
import { expect, test } from "bun:test"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import { derivedCuts, type Cut, type ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import { violationsOf, type Violation } from "../../../lib/stripboard/invariants.ts"
import { parseBoardDump } from "../../../tools/guide/dump.ts"
import { netlistEquivalence, type EquivalenceVerdict } from "../../../tools/stripboard/equivalence.ts"
import { candidateFromDump } from "../../../tools/stripboard/vero-import.ts"
import {
  COMMITTED_BOARDS,
  dumpTextOf,
  footprintsOf,
  referenceOf,
  type CommittedBoard,
} from "../vero-import-fixtures.ts"

/** The boards that import completely, and so the boards this comparison reaches. */
const COMPARED: readonly string[] = ["transistor-preamp-feedback", "transistor-preamp-loop"]

function candidateOf(board: CommittedBoard): Candidate {
  return candidateFromDump(dumpTextOf(board), referenceOf(board), footprintsOf(board), PIN_PATTERNS)
}

/**
 * The fork's own `CUT` lines as this model's `Cut`.
 *
 * It is here as well as in `./cuts-agree.test.ts` because this file asks a
 * different question with it: that file compares the two CUT LISTS, and this one
 * feeds the fork's list to our partition so that both implementations are
 * judging the same severances. The reading - `afterColumn = min(column)` - is
 * checked there line by line rather than twice.
 */
function forkCuts(dumpText: string): readonly Cut[] {
  return parseBoardDump(dumpText).cuts.map((cut) => ({
    strip: cut.a.row,
    afterColumn: Math.min(cut.a.col, cut.b.col),
  }))
}

/** Our opens as `net -> the pins of each component, sorted`, which is what theirs carries too. */
function ourOpens(violations: readonly Violation[]): ReadonlyMap<string, string> {
  const grouped = new Map<string, string>()
  for (const violation of violations) {
    if (violation.kind !== "open") continue
    grouped.set(
      violation.net,
      violation.groups
        .map((group) => `{${group.pins.join(",")}}`)
        .sort()
        .join("|"),
    )
  }
  return grouped
}

function theirOpens(verdict: EquivalenceVerdict): ReadonlyMap<string, string> {
  const grouped = new Map<string, string>()
  for (const open of verdict.opens) {
    grouped.set(
      open.net,
      open.groups
        .map((group) => `{${[...group].sort().join(",")}}`)
        .sort()
        .join("|"),
    )
  }
  return grouped
}

/** Our shorts as `nets@witness hole`, the two fields theirs carries. */
const ourShorts = (violations: readonly Violation[]): readonly string[] =>
  violations
    .filter((violation): violation is Extract<Violation, { kind: "short" }> =>
      violation.kind === "short",
    )
    .map((violation) => `${violation.nets.join("+")}@${violation.hole}`)
    .sort()

const theirShorts = (verdict: EquivalenceVerdict): readonly string[] =>
  verdict.shorts.map((short) => `${[...short.nets].sort().join("+")}@${short.hole}`).sort()

const compared: readonly CommittedBoard[] = COMMITTED_BOARDS.filter((board) =>
  COMPARED.includes(board.name),
)

test("the cross-check reaches exactly two of the seven committed boards", () => {
  expect(compared.map((board) => board.name)).toEqual([...COMPARED])
  for (const board of COMMITTED_BOARDS) {
    if (COMPARED.includes(board.name)) {
      expect(() => candidateOf(board), `${board.name} still imports`).not.toThrow()
      continue
    }
    // The refusal KEYS are asserted in `./cuts-agree.test.ts`, which owns that
    // table; two owners of one rule is one more than this pipeline allows. What
    // is asserted here is only that the board is still out of this comparison.
    expect(() => candidateOf(board), `${board.name} still refuses to import`).toThrow()
  }
})

for (const board of compared) {
  const name = board.name

  test(`${name}: the two implementations agree on whether the board is sound`, () => {
    const candidate = candidateOf(board)
    const reference = referenceOf(board)
    const ours = violationsOf(candidate, derivedCuts(candidate, reference), reference)
    const theirs = netlistEquivalence(dumpTextOf(board), reference)
    expect(ours.length === 0, "our verdict").toBe(theirs.equivalent)
  })

  test(`${name}: they agree finding for finding, with the pins grouped the same way`, () => {
    const candidate = candidateOf(board)
    const reference = referenceOf(board)
    const ours = violationsOf(candidate, derivedCuts(candidate, reference), reference)
    const theirs = netlistEquivalence(dumpTextOf(board), reference)
    expect([...ourOpens(ours)].sort(), "the same opens, net by net").toEqual(
      [...theirOpens(theirs)].sort(),
    )
    expect(ourShorts(ours), "the same shorts").toEqual(theirShorts(theirs))
  })

  test(`${name}: they still agree when our partition is given the fork's own cuts`, () => {
    // OUR CUT CONVENTION IS NOT WHAT THE AGREEMENT RESTS ON. `./cuts-agree.test.ts`
    // measures that the two derivations put their cuts in different gaps on this
    // board while partitioning the contacts identically; this asserts the
    // consequence - that the invariants answer the same either way.
    const candidate = candidateOf(board)
    const reference = referenceOf(board)
    const dumpText = dumpTextOf(board)
    const theirs = netlistEquivalence(dumpText, reference)
    const ours = violationsOf(candidate, forkCuts(dumpText), reference)
    expect(ours.length === 0).toBe(theirs.equivalent)
    expect([...ourOpens(ours)].sort()).toEqual([...theirOpens(theirs)].sort())
    expect(ourShorts(ours)).toEqual(theirShorts(theirs))
  })
}

test("transistor-preamp-feedback is the SOUND half of the comparison", () => {
  const board = byName("transistor-preamp-feedback")
  const candidate = candidateOf(board)
  const reference = referenceOf(board)
  expect(violationsOf(candidate, derivedCuts(candidate, reference), reference)).toEqual([])
  expect(netlistEquivalence(dumpTextOf(board), reference).equivalent).toBe(true)
  expect(countPins(reference), "37 reference pins, every one of them placed").toBe(37)
})

test("transistor-preamp-loop is the BROKEN half: 15 opens, no short, both ways", () => {
  // The figure is `tests/stripboard/agreement.test.ts`'s, corroborated there by
  // `make check` naming the same 15 nets. It is asserted rather than cited so
  // that a change in either implementation says so.
  const board = byName("transistor-preamp-loop")
  const candidate = candidateOf(board)
  const reference = referenceOf(board)
  const ours = violationsOf(candidate, derivedCuts(candidate, reference), reference)
  const theirs = netlistEquivalence(dumpTextOf(board), reference)
  expect(ours.filter((violation) => violation.kind === "open")).toHaveLength(15)
  expect(ourShorts(ours)).toEqual([])
  expect(theirs.opens).toHaveLength(15)
  expect(theirs.shorts).toEqual([])
  expect([...ourOpens(ours).keys()].sort()).toEqual([...theirOpens(theirs).keys()].sort())
  const order = ours.filter((violation) => violation.kind === "open").map((open) => open.net)
  expect(order, "fifteen opens in the declared ascending net-name order").toEqual([...order].sort())
  expect(countPins(reference), "57 reference pins, every one of them placed").toBe(57)
})

test("the short direction: deleting any one of feedback's five cuts shorts it, identically", () => {
  // A PERTURBATION AND NOT A MEASUREMENT OF A LAID-OUT BOARD, and the module
  // comment says so. Both implementations are handed the same board with the
  // same severance missing - ours through `forkCuts` of the perturbed text, so
  // neither side is reading a cut the other cannot see.
  const board = byName("transistor-preamp-feedback")
  const candidate = candidateOf(board)
  const reference = referenceOf(board)
  const lines = dumpTextOf(board).split("\n")
  const cutLines = lines.filter((line) => line.startsWith("CUT "))
  expect(cutLines, "five CUT lines to delete in turn").toHaveLength(5)
  const agreed: string[] = []
  for (const [index, line] of lines.entries()) {
    if (!line.startsWith("CUT ")) continue
    const perturbed = lines.filter((_unused, at) => at !== index).join("\n")
    const ours = violationsOf(candidate, forkCuts(perturbed), reference)
    const theirs = netlistEquivalence(perturbed, reference)
    expect(theirs.equivalent, `dropping "${line.trim()}" breaks the board`).toBe(false)
    expect(ourShorts(ours), `dropping "${line.trim()}": the same short`).toEqual(
      theirShorts(theirs),
    )
    expect([...ourOpens(ours)].sort(), `dropping "${line.trim()}": the same opens`).toEqual(
      [...theirOpens(theirs)].sort(),
    )
    expect(ourShorts(ours), "a dropped cut shorts exactly one pair of nets").toHaveLength(1)
    agreed.push(...ourShorts(ours))
  }
  // THE FIVE PAIRS, AS A FIGURE, so that a change in either side says so. Two of
  // the five cuts separate the same pair on the same strip-8 conductor, which is
  // why "/BASE+GND@8,6" appears twice.
  expect(agreed.sort()).toEqual([
    "/BASE+/COLLECTOR_LOAD_FLOOR@8,6",
    "/BASE+GND@8,6",
    "/BASE+GND@8,6",
    "/COLLECTOR+/OUT@7,3",
    "/EMITTER+/IN_EXT@9,16",
  ])
})

function byName(name: string): CommittedBoard {
  const board = compared.find((one) => one.name === name)
  if (board === undefined) {
    throw new Error(`${name} is not in this file's compared set, which is ${COMPARED.join(", ")}`)
  }
  return board
}

function countPins(reference: ReferenceNets): number {
  let total = 0
  for (const [, pins] of reference) total += pins.length
  return total
}
