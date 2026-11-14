/**
 * THE GUARD THAT CATCHES A FOOTPRINT LEAVING A BOARD UNNAMED, driven to every
 * one of its refusals FROM A COMMITTED TEST.
 *
 * **THAT IS THE POINT OF THIS FILE AND THE REASON THE GUARD IS A PURE
 * FUNCTION.** It used to be three lines inside `tools/pcb/place-mounting-holes.ts`
 * comparing a count the removal callback produced against a count pushed on the
 * line above it. This task's second re-reviewer called that nearly tautological
 * and was right twice over: it could only catch the next `return true` added
 * without a matching push - not a wrong predicate, which is the defect that
 * actually happened twice - and **no committed test could reach its throw**,
 * because within correct code the two numbers can only be made to disagree by
 * editing the source. Its only evidence was a mutation run in a transcript,
 * which is the shape of thing this plan has spent its whole length catching.
 *
 * A pure function over four arguments needs no board, no source mutation and no
 * transcript. Every refusal below is reached by passing arguments that violate
 * the invariant, and the invariant is `after === (before - removed) + added`.
 *
 * `tests/pcb/mounting-hole-placement.test.ts` is where the real tool is driven
 * over real boards; this file is only about the invariant.
 */
import { test, expect } from "bun:test"
import {
  footprintsOf, verifyFootprintAccounting,
} from "../../tools/pcb/footprint-accounting.ts"

/** A board with the named footprints, each with a distinct uuid. */
function board(...parts: readonly (readonly [string, string, string])[]): string {
  const forms = parts.map(
    ([reference, library, uuid]) =>
      `\t(footprint "${library}"\n\t\t(uuid "${uuid}")\n\t\t(at 0 0)\n` +
      `\t\t(property "Reference" "${reference}"\n\t\t\t(at 0 0 0)\n\t\t)\n\t)`,
  )
  return `(kicad_pcb\n\t(version 20260206)\n${forms.join("\n")}\n)\n`
}

const U1 = "11111111-1111-4111-8111-111111111111"
const U2 = "22222222-2222-4222-8222-222222222222"
const U3 = "33333333-3333-4333-8333-333333333333"

/**
 * **THE LIBRARY HALVES ARE `SYNTHETIC:`, which is this repository's declared
 * prefix for a deliberately fictional footprint name, and that is a decision
 * rather than laziness.** This file tests an invariant over s-expression text:
 * the library and the reference are LABELS that appear in refusal messages, and
 * nothing about either footprint's geometry matters. Using a real name would
 * imply it did, and inventing a plausible one is how this repository has twice
 * shipped a footprint nobody can look up - an earlier draft of this file wrote
 * `Resistor_THT:R_Axial`, which does not exist, and
 * `tests/kicad/footprint-names.test.ts` caught it in the same run. The prefix
 * keeps the name out of that sweep's disk check by SAYING what it is rather
 * than by happening to name a library KiCad does not ship.
 */
const A: readonly [string, string, string] = ["R1", "SYNTHETIC:AnOrdinaryPart", U1]
const B: readonly [string, string, string] = ["H1", "SYNTHETIC:AForeignHole", U2]
const C: readonly [string, string, string] = ["MH1", "SYNTHETIC:OneOfOurHoles", U3]

function refusalOf(body: () => unknown): string {
  try {
    body()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("expected a refusal but nothing was thrown")
}

// ---- reading a board's footprints ------------------------------------------

test("footprintsOf keys on uuid and labels each footprint readably", () => {
  const read = footprintsOf(board(A, B), "fixture")
  console.log(`  ${[...read].map(([uuid, label]) => `${label} [${uuid.slice(0, 8)}]`).join(", ")}`)
  expect([...read.keys()]).toEqual([U1, U2])
  expect(read.get(U1)).toBe("R1 (SYNTHETIC:AnOrdinaryPart)")
})

test("a footprint with NO uuid is refused, not counted", () => {
  // Keyed on uuid because two footprints can share a reference, so one without
  // a uuid cannot be told from another - and counting it would be the quiet
  // loss this whole module exists to prevent.
  const noUuid = '(kicad_pcb\n\t(footprint "SYNTHETIC:NoUuid"\n\t\t(property "Reference" "R9"\n\t\t)\n\t)\n)\n'
  const message = refusalOf(() => footprintsOf(noUuid, "fixture"))
  console.log(`  refuses: ${message.slice(0, 92)}...`)
  expect(message).toContain("carries no (uuid ...)")
  expect(message).toContain("R9")
})

test("two footprints sharing a uuid are refused", () => {
  const clash = board(A, ["R2", "SYNTHETIC:AnOrdinaryPart", U1])
  const message = refusalOf(() => footprintsOf(clash, "fixture"))
  expect(message).toContain("share the uuid")
  expect(message).toContain("R1")
  expect(message).toContain("R2")
})

// ---- the invariant, and every way it refuses -------------------------------

test("the accounting PASSES when after is exactly before minus removed plus added", () => {
  expect(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A, B), "before"),
      after: footprintsOf(board(A, C), "after"),
      removed: [U2],
      added: [U3],
      where: "fixture",
    }),
  ).not.toThrow()
})

test("REFUSAL 1: a footprint that LEFT THE BOARD without being named", () => {
  // The silent deletion this module is about: a heatsink gone, nothing saying so.
  const message = refusalOf(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A, B), "before"),
      after: footprintsOf(board(A), "after"),
      removed: [],
      added: [],
      where: "fixture",
    }),
  )
  console.log(`  ${message.split("\n")[1]?.trim() ?? ""}`)
  expect(message).toContain("LEFT THE BOARD WITHOUT BEING NAMED")
  expect(message).toContain("H1 (SYNTHETIC:AForeignHole)")
})

test("REFUSAL 2: a footprint that ARRIVED without being named", () => {
  const message = refusalOf(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A), "before"),
      after: footprintsOf(board(A, C), "after"),
      removed: [],
      added: [],
      where: "fixture",
    }),
  )
  console.log(`  ${message.split("\n")[1]?.trim() ?? ""}`)
  expect(message).toContain("ARRIVED WITHOUT BEING NAMED")
  expect(message).toContain("MH1")
})

test("REFUSAL 3: something named as REMOVED that is still on the board", () => {
  const message = refusalOf(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A, B), "before"),
      after: footprintsOf(board(A, B), "after"),
      removed: [U2],
      added: [],
      where: "fixture",
    }),
  )
  console.log(`  ${message.split("\n")[1]?.trim() ?? ""}`)
  expect(message).toContain("reported REMOVED and are still on the board")
  expect(message).toContain("H1")
})

test("REFUSAL 4: something named as ADDED that is not on the board", () => {
  const message = refusalOf(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A), "before"),
      after: footprintsOf(board(A), "after"),
      removed: [],
      added: [U3],
      where: "fixture",
    }),
  )
  console.log(`  ${message.split("\n")[1]?.trim() ?? ""}`)
  expect(message).toContain("reported ADDED and are not on the board")
})

test("REPLACEMENT - the same uuid removed and added back - is legitimate and passes", () => {
  // THE CASE THAT CAUGHT THE GUARD ITSELF OUT ON ITS FIRST RUN. The
  // mounting-hole tool derives each hole's uuid from its reference so that a
  // re-run of `make geometry-pt2399-core` is byte-identical, so it removes MH1
  // and writes MH1 back with the SAME uuid every time. The first version of
  // this invariant reported all four holes as "reported removed and still on
  // the board" - the guard being wrong, not the tool - and that is the one part
  // of `after = before - removed + added` that reading it as prose does not
  // give you.
  expect(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A, C), "before"),
      after: footprintsOf(board(A, C), "after"),
      removed: [U3],
      added: [U3],
      where: "fixture",
    }),
  ).not.toThrow()
})

test("several refusals at once are ALL named, not just the first", () => {
  // A refusal that stopped at the first problem would send a reader round the
  // loop once per defect.
  const message = refusalOf(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A, B), "before"),
      after: footprintsOf(board(A, C), "after"),
      removed: [],
      added: [],
      where: "fixture",
    }),
  )
  for (const line of message.split("\n").slice(1, 3)) console.log(`  ${line.trim()}`)
  expect(message).toContain("LEFT THE BOARD WITHOUT BEING NAMED")
  expect(message).toContain("ARRIVED WITHOUT BEING NAMED")
  // And the counts, so a reader can see the shape of the edit as well as its defects.
  expect(message).toContain("Before: 2 footprint(s); after: 2")
})

test("REFUSAL 5: something named as REMOVED that was never on the board before", () => {
  // A credit for something that was never there. It can only over-report and
  // never hide a loss, which is why it was the last of the five to be added -
  // but an accounting function that accepts a phantom removal is wrong at its
  // own job, and at the moment it mattered it would read as confusing rather
  // than as a defect.
  const message = refusalOf(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A), "before"),
      after: footprintsOf(board(A), "after"),
      removed: [U2],
      added: [],
      where: "fixture",
    }),
  )
  console.log(`  ${message.split("\n")[1]?.trim() ?? ""}`)
  expect(message).toContain("were NOT ON THE BOARD BEFORE the edit")
  expect(message).toContain(U2.slice(0, 8))
})

test("a phantom removal is caught even when everything else balances", () => {
  // The shape that would otherwise slip through: a real removal AND a phantom
  // one in the same call. Before this check the extra uuid was simply ignored.
  const message = refusalOf(() =>
    verifyFootprintAccounting({
      before: footprintsOf(board(A, B), "before"),
      after: footprintsOf(board(A), "after"),
      removed: [U2, U3],
      added: [],
      where: "fixture",
    }),
  )
  console.log(`  ${message.split("\n")[1]?.trim() ?? ""}`)
  expect(message).toContain("were NOT ON THE BOARD BEFORE the edit")
  // And ONLY that: the genuine removal of U2 is not also complained about.
  expect(message).not.toContain("LEFT THE BOARD WITHOUT BEING NAMED")
  expect(message).not.toContain("reported REMOVED and are still on the board")
})
