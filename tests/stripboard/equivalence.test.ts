import { test, expect } from "bun:test"
import {
  netlistEquivalence,
  describeVerdict,
  type ReferenceNets,
} from "../../tools/stripboard/equivalence.ts"
import { importClosure } from "./import-closure.ts"

/**
 * OWNER-BLOCKED NOTE (OB5) - TASK 6 DELETES THIS WHOLE COMMENT BLOCK.
 *
 * Every board in this file is HAND-WRITTEN DUMP TEXT. That is the module's
 * real input seam, so the tests below prove both of `HC8`'s directions: a
 * reference net split across two copper components, and two reference nets
 * inside one.
 *
 * WHAT THEY DO NOT PROVE, and nothing here may be read as proving: that a
 * REAL VeroRoute board carrying the short exits 0 under `--check` while
 * `HC8` rejects it. That is the end-to-end claim - "`HC8` detects a class of
 * defect no pre-existing check detects at all" - and it is UNPROVEN. No
 * board was ever run through `--check` to establish it, because no verb in
 * the pinned fork edits a cut (`DeriveCuts` derives them; the fifteen
 * shipped verbs include no cut editor), so a board with the separating `CUT`
 * removed cannot currently be produced at all.
 *
 * It is Task 6's to prove, and Task 6 is owner-blocked pending the owner's
 * choice between the three routes CRITERIA records. When Task 6 lands the
 * real `.vrt` with its provenance and its end-to-end assertion, it DELETES
 * THIS BLOCK - supersede means delete - rather than leaving a stale caveat
 * beside a claim that has since been measured.
 */

/**
 * Two strips, three nets, one cut on strip 1 between columns 1 and 2. R1
 * bridges the two strips; R2 sits along strip 1 straddling the cut, which is
 * the ordinary stripboard idiom and not a short.
 *
 * Strip 0 (row 0) is uncut and holds R1.1 alone, so net `in` is one
 * component; strip 1 splits into {1,0 1,1} - R1.2 and R2.1, net `mid` - and
 * {1,2 1,3} - R2.2, net `out`.
 *
 * TWO THINGS DIFFER FROM THE TASK BRIEF'S DRAFT, both grammar faults the
 * brief could not have known and both checked against `parseBoardDump`:
 *
 * - A `NODE` line is `NODE <id> NAME <name> <members...>`, so the brief's
 *   `NODE 1 mid R1.2 R2.1` is unreadable and throws in the parser before any
 *   verdict exists. Corrected below, as Task 3's fixture already had to.
 * - A `CUT` hole's node id matches `parseNodedHole`'s `\d+`, so the garbled
 *   ids in the independence test are large rather than negative; the brief's
 *   `-1` does not parse.
 */
const WHOLE = [
  "GRID 2 4",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PART R2 RESISTOR4 1k AT 1,0 SPAN 1",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 1,0",
  "PIN R2 1 AT 1,1",
  "PIN R2 2 AT 1,3",
  "CUT 1,1,3 1,2,4",
].join("\n")

const REFERENCE: ReferenceNets = new Map([
  ["in", ["R1.1"]],
  ["mid", ["R1.2", "R2.1"]],
  ["out", ["R2.2"]],
])

/** The same board with every `CUT` line removed: strip 1 then joins `mid` to `out`. */
const UNCUT = WHOLE.split("\n")
  .filter((line) => !line.startsWith("CUT "))
  .join("\n")

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

test("a board whose copper partitions the pins as the netlist does is equivalent", () => {
  const verdict = netlistEquivalence(WHOLE, REFERENCE)
  expect(verdict.opens).toEqual([])
  expect(verdict.shorts).toEqual([])
  expect(verdict.equivalent).toBe(true)
  // 2, not 1: Task 5 added `PAD` to the contract for pin identity - see the
  // note beside copper.test.ts's version assertion.
  expect(verdict.contractVersion).toBe(2)
  // An equivalent verdict has no findings, so it renders no lines.
  expect(describeVerdict(verdict)).toEqual([])
})

test("an OPEN is rejected, naming the net and the groups its pins fell into", () => {
  // Sever strip 1 between R1.2 at 1,0 and R2.1 at 1,1, which is net `mid`.
  //
  // MUTATION RUN: with `openFindings` returning `[]` unconditionally, this
  // fails at `expect(verdict.equivalent).toBe(false)` with
  // "Expected: false / Received: true", and the groups assertion fails with
  // "Received: undefined". Reverted.
  const verdict = netlistEquivalence(`${WHOLE}\nCUT 1,0,3 1,1,9`, REFERENCE)
  expect(verdict.equivalent).toBe(false)
  expect(verdict.opens.map((finding) => finding.net)).toEqual(["mid"])
  const groups = verdict.opens[0]?.groups.map((group) => [...group].sort())
  expect(groups).toEqual([["R1.2"], ["R2.1"]])
  expect(verdict.shorts).toEqual([])
  // Anchored on the line's own prefix, not on a bare /mid/: the SHORT line
  // also names `mid`, so a loose match cannot tell the two findings apart.
  const lines = describeVerdict(verdict)
  expect(lines).toHaveLength(1)
  expect(lines[0]).toStartWith('OPEN: reference net "mid" has pins in 2 separate copper')
  expect(lines[0]).toContain("{R1.2} | {R2.1}")
})

test("a SHORT is rejected, naming BOTH nets - the direction no pre-existing check looks for", () => {
  // Remove the separating cut and `mid` and `out` share strip 1. This is the
  // defect class CRITERIA's HC8 exists for.
  //
  // WHAT THIS TEST PROVES AND WHAT IT DOES NOT, stated because an earlier
  // revision of this comment asserted a measurement nobody took. It proves
  // that the reconstruction finds two reference nets in one copper component
  // and rejects the board naming both. The board is HAND-WRITTEN DUMP TEXT.
  //
  // IT DOES NOT PROVE that a real VeroRoute board in this state exits 0
  // under --check while HC8 refuses it. That claim is UNPROVEN: no board was
  // run through --check to establish it, and none can currently be produced,
  // because no verb in the pinned fork edits a cut. CRITERIA's reasoning for
  // why membership would still read both nets complete is an argument from
  // GetBoardMembership's source, not a measurement, and this test is not
  // evidence for it. Task 6 owns the proof and is owner-blocked; see the
  // OB5 note at the top of this file, which Task 6 deletes.
  //
  // MUTATION RUN: with `shortFindings` returning `[]` unconditionally, this
  // fails at `expect(verdict.equivalent).toBe(false)` ("Expected: false /
  // Received: true") and at `toHaveLength(1)` ("Received length: 0").
  // Reverted.
  const verdict = netlistEquivalence(UNCUT, REFERENCE)
  expect(verdict.equivalent).toBe(false)
  expect(verdict.shorts).toHaveLength(1)
  expect([...(verdict.shorts[0]?.nets ?? [])].sort()).toEqual(["mid", "out"])
  expect(verdict.opens).toEqual([])
  const lines = describeVerdict(verdict)
  expect(lines).toHaveLength(1)
  expect(lines[0]).toStartWith('SHORT: reference nets "mid" and "out" share one copper component')
  // The witness is a real hole on the board, and it is the one named.
  expect(lines[0]).toContain(`witnessed at hole ${verdict.shorts[0]?.hole ?? "<none>"}`)
  expect(verdict.shorts[0]?.hole).toBe("1,0")
})

test("an open and a short are reported separately, not collapsed into one failure", () => {
  // THE BRIEF'S FIXTURE FOR THIS TEST PRODUCES NO OPEN, measured: it removes
  // every cut and adds `CUT 0,1,1 0,2,2`, which splits strip 0 - and strip 0
  // holds only R1.1, a one-pin net, so no net spans two components. The test
  // would have failed on `opens.length > 0` for the fixture's sake rather
  // than the code's. Corrected by moving the cut instead: severing strip 1
  // between columns 0 and 1 opens `mid` (R1.2 alone, R2.1 with the rest of
  // the strip) while leaving R2.1 and R2.2 joined, which shorts `mid` to
  // `out`. One board, both directions.
  const both = WHOLE.replace("CUT 1,1,3 1,2,4", "CUT 1,0,3 1,1,9")
  const verdict = netlistEquivalence(both, REFERENCE)
  expect(verdict.equivalent).toBe(false)
  // "Reported separately" is the name's claim, so both lists are asserted
  // non-empty rather than only the conjunction they imply.
  expect(verdict.opens.length).toBeGreaterThan(0)
  expect(verdict.shorts.length).toBeGreaterThan(0)
  expect(verdict.opens.map((finding) => finding.net)).toEqual(["mid"])
  expect([...(verdict.shorts[0]?.nets ?? [])].sort()).toEqual(["mid", "out"])
  const lines = describeVerdict(verdict)
  expect(lines).toHaveLength(2)
  expect(lines[0]).toStartWith("OPEN:")
  expect(lines[1]).toStartWith("SHORT:")
})

test("a reference pin with no PIN line refuses, because a missing hole is not an open", () => {
  // A placed part with no PIN lines is HC3's refusal and HC8's too. Treating
  // it as an open would report the wrong constraint and point at the wrong
  // fix.
  //
  // MUTATION RUN, twice, because the first mutant refused for a DIFFERENT
  // reason and that is the case an unanchored assertion cannot see.
  // (a) `holeOfPin` returning the off-board sentinel `-1,-1` instead of
  // refusing: this fails with 'Received: "hole-outside-copper-graph: hole
  // -1,-1 holds a reference pin's lead but is not a hole of the board's
  // copper...."' - a refusal, but the wrong one, pointing a reader at
  // copper.ts instead of at the floating part.
  // (b) `holeOfPin` returning the real hole `0,0` - the true "treat it as an
  // open" mutant: this fails with 'Received: ""', the refusal having been
  // replaced by a verdict. Both reverted.
  //
  // ANCHORED, not matched: the refusal's own prose contains "R2.1" and "PIN",
  // so the brief's `toThrow(/R2\.1/)` and `toThrow(/PIN/)` are satisfied by
  // the message's own explanation of itself - the defect Task 3's review
  // found, in the same shape.
  const floated = WHOLE.replace(
    "PART R2 RESISTOR4 1k AT 1,0 SPAN 1",
    "PART R2 RESISTOR4 1k FLOATING SPAN 1",
  )
    .replace("PIN R2 1 AT 1,1\n", "")
    .replace("PIN R2 2 AT 1,3\n", "")
  const message = refusalFrom(() => netlistEquivalence(floated, REFERENCE))
  expect(message).toStartWith(
    "reference-pin-not-on-board: R2.1 is a reference pin and the dump prints no PIN line for it.",
  )
  expect(message).toContain("is NOT an open")
})

test("an empty reference refuses rather than reporting equivalence vacuously", () => {
  // MUTATION RUN: with the `reference.size === 0` clause removed, this fails
  // with 'Expected to start with: "empty-reference: the reference netlist has
  // no nets" / Received: ""' - the call returning
  // `{ equivalent: true, opens: [], shorts: [] }`, which is the vacuous pass
  // the clause exists to prevent. Reverted.
  const message = refusalFrom(() => netlistEquivalence(WHOLE, new Map()))
  expect(message).toStartWith("empty-reference: the reference netlist has no nets")
})

test("a reference net listing no pins refuses rather than being graded vacuously", () => {
  // MUTATION RUN: with the `pins.length === 0` clause removed, this fails
  // with 'Expected to start with: "empty-reference-net: reference net
  // \"spare\" lists no pins" / Received: ""', the net having been silently
  // skipped and the board reported equivalent. Reverted.
  const withEmptyNet: ReferenceNets = new Map([...REFERENCE, ["spare", []]])
  const message = refusalFrom(() => netlistEquivalence(WHOLE, withEmptyNet))
  expect(message).toStartWith('empty-reference-net: reference net "spare" lists no pins')
})

test("a missing contracted line refuses in HC8's own words, which only the text entry point can say", () => {
  // THE BRIEF'S SIGNATURE WAS `netlistEquivalence(dump: BoardDump, ...)`,
  // and this test is why it is text instead: `missing-line` is inexpressible
  // through a `BoardDump`, which carries a grid and a boolean axis by
  // construction. A caller that parsed the text itself would still throw -
  // `parseBoardDump` refuses a missing GRID - but with the PARSER's wording,
  // which names neither the refusal member nor the contract version, so
  // CRITERIA's "names the missing line and the contract version" would be
  // discharged only by an unrelated message.
  //
  // MUTATION RUN: with `boardGeometry` swapped for `parseBoardDump`, this
  // fails with 'Expected to start with: "missing-line: the dump has no
  // VERTICAL_STRIPS line." / Received: "--dump-board produced no
  // VERTICAL_STRIPS line, so whether this board uses vertical strips is
  // unknown...."' - a refusal, but not HC8's. Reverted.
  const noAxis = WHOLE.split("\n")
    .filter((line) => !line.startsWith("VERTICAL_STRIPS"))
    .join("\n")
  const message = refusalFrom(() => netlistEquivalence(noAxis, REFERENCE))
  expect(message).toStartWith("missing-line: the dump has no VERTICAL_STRIPS line.")
  expect(message).toContain("HC8 geometry contract version 2")
})

test("the verdict is unchanged when the NODE block is emptied and the CUT node ids garbled", () => {
  // V11. The whole independence claim, as a comparison rather than an
  // assertion.
  //
  // MUTATION RUN, and it taught something the brief got wrong. Keying the
  // components on the dump's own node records instead of the copper graph -
  // each pin's component taken from the node id its CUT line reports, and a
  // distinct spare number for a hole no CUT line names - fails 5 tests: this
  // one, the equivalent test, the SHORT test, the open-and-short test and the
  // text scan. Those failures together ARE the argument for HC8: the node ids
  // are VeroRoute's membership arriving by a second route, so a verdict that
  // reads them is neither independent nor able to see a short. Reverted.
  //
  // BUT THE `toEqual` BELOW DID NOT CATCH IT. Measured: under that mutant
  // both calls returned the SAME non-equivalent verdict - `mid` open with
  // groups {R1.2} | {R2.1} either way, because the groups are ordered by
  // component number and 3 and 999999 sort the same side of the spare - so
  // the equality held while the verdict was wrong. What caught it is the
  // `.equivalent` assertion after it, which is therefore not decoration. A
  // pure equality test here would have been a name claiming more than its
  // body proved, which is the defect this plan is built around.
  const withNodes = `${WHOLE}\nNODE 1 NAME mid\nNODE 2 NAME out`
  const garbled = withNodes
    .replace("CUT 1,1,3 1,2,4", "CUT 1,1,999999 1,2,424242")
    .replace(/^NODE .*$/gm, "")
  expect(netlistEquivalence(garbled, REFERENCE)).toEqual(netlistEquivalence(withNodes, REFERENCE))
  // And it is the EQUIVALENT verdict both times, so the comparison is not two
  // identical wrong answers agreeing with each other.
  expect(netlistEquivalence(garbled, REFERENCE).equivalent).toBe(true)
  expect(netlistEquivalence(withNodes, REFERENCE).equivalent).toBe(true)
})

test("nothing in this module's TRANSITIVE import closure is the scorer or the check path", async () => {
  // HC8 shares no code with the scorer or with --check, asserted over the
  // closure rather than over this file's text.
  //
  // THE TEST THIS REPLACES was `expect(text).not.toContain("score.ts")` on one
  // file, with a comment claiming it read the import graph. It did not: one
  // transitive import through any third module satisfies it, so the claim was
  // stronger than the check and the gap was invisible.
  //
  // `tools/stripboard/score.ts` DOES NOT EXIST YET - it is a later task's
  // file - so today only `tools/perfboard/check.ts`'s absence is a live
  // claim and the scorer's is a standing guard for when it arrives. The
  // mutation below was therefore run with check.ts, the module that exists.
  //
  // MUTATION RUN, both halves, and the second is the one that mattered.
  // (a) Adding `import { verorouteBinary } from "../perfboard/check.ts"` to
  // equivalence.ts fails here with 'error: tools/perfboard/check.ts /
  // Expected to not contain: "tools/perfboard/check.ts"'. (b) Removing that
  // and adding the same import to copper.ts instead - a module equivalence.ts
  // imports but does not NAME - fails here AGAIN with the identical message,
  // which is exactly the case the replaced substring scan passed. Both
  // reverted.
  //
  // THE FIRST ATTEMPT AT BOTH HALVES FAILED FOR THE WRONG REASON, and fixing
  // that corrected the walker: check.ts's own closure reaches
  // `lib/sim/operating-point.ts`, which imports `eecircuit-engine`, so the
  // walker refused the bare specifier and the test failed on "neither
  // relative nor a known external" instead of on the forbidden module. Loud
  // either way, but it named the wrong fault, so this repository's one npm
  // dependency is now enumerated in the walker's EXTERNAL set - see the note
  // there, which also records that the brief's claim about bare specifiers
  // was wrong.
  const closure = await importClosure("tools/stripboard/equivalence.ts")
  for (const forbidden of ["tools/stripboard/score.ts", "tools/perfboard/check.ts"]) {
    expect([...closure].sort(), forbidden).not.toContain(forbidden)
  }
})

test("the closure walker finds a TRANSITIVE import, which is the whole reason it exists", async () => {
  // The guard on the guard, and it is not optional: a walker that returned
  // only direct imports would make the test above as weak as the substring
  // scan it replaced, while looking stronger. equivalence.ts imports
  // copper.ts, which imports tools/guide/dump.ts, which equivalence.ts does
  // not name.
  const closure = await importClosure("tools/stripboard/equivalence.ts")
  expect([...closure]).toContain("tools/stripboard/copper.ts")
  expect([...closure]).toContain("tools/guide/dump.ts")
  const direct = await Bun.file("tools/stripboard/equivalence.ts").text()
  expect(direct, "dump.ts must be reached transitively, not named here").not.toContain(
    "guide/dump.ts",
  )
  // And the closure includes its own entry point, so a test asserting absence
  // also catches the entry point BEING the forbidden module.
  expect([...closure]).toContain("tools/stripboard/equivalence.ts")
})

test("the closure walker refuses an unresolvable import rather than dropping the edge", async () => {
  await expect(importClosure("tools/stripboard/does-not-exist.ts")).rejects.toThrow(/not a file/)
})

test("the closure walker refuses a bare specifier rather than guessing at a resolver", async () => {
  // The walker's second refusal, driven rather than assumed. `node:` builtins
  // and `bun:test` are skipped by name, so the only way to reach this clause
  // is a specifier that is neither - and a test file is the nearest module
  // that could acquire one.
  //
  // MUTATION RUN: with the `!specifier.startsWith(".")` clause removed, this
  // fails with "Received function did not throw", the bare specifier having
  // been resolved against the importer's directory and then refused as "not
  // a file" - a DIFFERENT refusal under the same assertion had it been a
  // loose `toThrow()`. Reverted. (Driven here through a fixture module
  // written for it rather than by editing a shipped file; the fixture's
  // `.ts.txt` extension is explained at the top of the fixture itself.)
  const fixture = "tests/fixtures/bare-specifier-importer.ts.txt"
  await expect(importClosure(fixture)).rejects.toThrow(
    /imports "some-package", which is neither relative nor a known external/,
  )
})

test("this module never names a node record, which is a TEXT claim and is labelled as one", async () => {
  // A SCAN, named as a scan. The closure cannot see this: reading a node id
  // off a value whose type already crossed the boundary is a use, not an
  // import. What a scan proves is that the identifiers do not appear in this
  // file; what it does not prove is that no equivalent is reached by another
  // spelling or through a helper. The BEHAVIOURAL version of this claim - the
  // verdict is unchanged when the NODE block is emptied and the CUT ids
  // garbled - is the test above, and that one is the guarantee.
  const text = await Bun.file("tools/stripboard/equivalence.ts").text()
  expect(text).not.toContain(".nodes")
  expect(text).not.toContain("nodeId")
})
