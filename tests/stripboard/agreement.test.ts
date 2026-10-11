/**
 * `HC8` against boards nobody here laid out.
 *
 * WHAT THE BENCHMARK SET IS. PIPELINE 3.5 names four hand-laid boards and
 * CRITERIA's `HC8` requires the reconstruction to agree with the reference
 * netlist on "the frozen fixture and on all four hand-laid boards of PIPELINE
 * 3.5" - low-boost being one of the four, reached here through its frozen
 * fixture. So four boards, each with a committed `--dump-board` capture and a
 * committed netlist export, plus a FIFTH board this file rejects: the
 * floated-C19 negative fixture.
 *
 * THE DUMPS ARE NOT THE ONES THE TASK BRIEF NAMED, and the reason is a
 * measurement rather than a preference. The brief's `BOARDS` listed
 * `tests/fixtures/pt2399-core-board.dump`; that file carries no `GRID` line
 * and no `PIN` lines at all - it predates the fork commit (`2cfaad8`) that
 * first emitted either - so `HC8` refuses it with `missing-line: the dump has
 * no GRID line` and cannot grade it. Fresh captures at the pinned binary live
 * in `tests/fixtures/stripboard/` with their provenance; the older dump is
 * left alone for the tests that already read it.
 *
 * WHICH BOARDS ARE LEFT OUT, AND WHY, named rather than silently absent:
 *
 *   transistor-preamp-lab   `--dump-board` reports `CUT_STATE UNRESOLVED` with
 *                           19 `CUT_CONFLICT` lines, so its cut list is absent
 *                           rather than empty and `HC2` excludes it. Measured:
 *                           `HC8` refuses it by name, `cuts-not-computed`. Its
 *                           export also names `J2.1` and `J2.2`, for which the
 *                           dump prints no `PIN` line. Not in the benchmark
 *                           set.
 *   transistor-preamp-buffered
 *                           Committed, hand-laid, `CUT_STATE COMPUTED`, passes
 *                           `make check`, and `HC8` was measured to agree with
 *                           its export - but it is not in PIPELINE 3.5's set,
 *                           and the set is a specified four rather than every
 *                           board that happens to pass.
 *   transistor-preamp-loop  Not in 3.5's set either, and it would not pass:
 *                           measured here, `HC8` reports 15 opens on it. That
 *                           is not a defect in the gate - `make check` fails
 *                           this board too, reporting 15 of its 16 nets
 *                           incomplete, and the nets `HC8` names are the nets
 *                           `make check` names. Two instruments agreeing on a
 *                           board that is known broken, which is the one piece
 *                           of corroboration a set of agreeing boards cannot
 *                           supply. Adding it as a NEGATIVE row would be a
 *                           separate claim with its own provenance, and it is
 *                           not this task's.
 *
 * WHAT A PASS HERE DOES NOT SHOW. Agreement with a netlist is not
 * buildability: the frozen low-boost board fails `make check` today, for the
 * staleness B1-frozen's own split exists to handle, and nothing here is
 * evidence that it does not.
 */
import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import {
  netlistEquivalence,
  referenceNetsFromExport,
} from "../../tools/stripboard/equivalence.ts"

/**
 * The message a call refused with, or "" when it did not refuse - the same
 * shape as Task 4's, because every refusal assertion in this pipeline anchors
 * on the refusal's own opening clause rather than matching its prose. Two
 * copies is the limit: if a THIRD test file needs it, it moves beside
 * `importClosure` in tests/stripboard/ and all three import it.
 */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

const FROZEN_DUMP = "tests/fixtures/stripboard/pultec-low-boost-frozen.dump"
const FROZEN_NETLIST = "tests/fixtures/stripboard/pultec-low-boost-frozen.netlist"

const BOARDS = [
  ["the frozen low-boost fixture", FROZEN_DUMP, FROZEN_NETLIST],
  [
    "pt2399-core",
    "tests/fixtures/stripboard/pt2399-core.dump",
    "tests/fixtures/pt2399-core-veroroute.net",
  ],
  [
    "transistor-preamp-feedback",
    "tests/fixtures/stripboard/transistor-preamp-feedback.dump",
    "tests/fixtures/transistor-preamp-feedback.net",
  ],
  [
    "transistor-preamp-staged",
    "tests/fixtures/stripboard/transistor-preamp-staged.dump",
    "tests/fixtures/transistor-preamp-staged.net",
  ],
] as const

for (const [label, dumpPath, netlistPath] of BOARDS) {
  test(`HC8 agrees with the reference netlist on ${label}`, async () => {
    // The TEXT is what HC8 consumes, so nothing here parses it first: the
    // geometry contract is enforced inside netlistEquivalence.
    //
    // MUTATION RUN (a), one PIN row moved by one, applied to a COPY in a
    // temporary test - the fixture itself is never edited. Moving the frozen
    // dump's `PIN R2 1 AT 7,9` to `8,9` fails with 'error: the frozen
    // low-boost fixture opens', the diff showing
    // `{"net": "out", "groups": [["board_terminals.2"], ["R2.1"]]}`: the
    // board named by the label, the net named, and the split reported as the
    // two groups it is.
    //
    // AND ONE BREAK THAT DID NOT FAIL, recorded because it bounds what these
    // rows catch. Moving a pt2399-core PIN's COLUMN by one -
    // `PIN C1 1 AT 7,4` to `7,5` - passed: strips run along rows here, both
    // holes are on row 7 with no CUT between them, so the lead landed in the
    // same copper component and the partition is unchanged. A column move is
    // only a different net when a cut or a board edge lies between; a ROW
    // move always changes strip. Reverted.
    //
    // MUTATION RUN (b), `netlistEquivalence` returning
    // `{ equivalent: true, opens: [], shorts: [], contractVersion }`
    // unconditionally: 46 pass, 3 fail - and EVERY ROW OF THIS LOOP IS AMONG
    // THE PASSES. The three that fail are all Task 4's, and all assert a
    // DISAGREEMENT: "an OPEN is rejected, naming the net and the groups its
    // pins fell into", "a SHORT is rejected, naming BOTH nets" and "an open
    // and a short are reported separately". This file's floated-C19 row
    // passes too, because its refusal is raised before the return the mutant
    // replaced. That is the honest result, recorded rather than claimed away:
    // four agreeing boards cannot catch a verdict that always agrees, and the
    // agreement rows are evidence of correctness on real boards, not of the
    // verdict having teeth. Reverted.
    const dumpText = await Bun.file(dumpPath).text()
    const reference = referenceNetsFromExport(await Bun.file(netlistPath).text())
    const verdict = netlistEquivalence(dumpText, reference)
    expect(verdict.opens, `${label} opens`).toEqual([])
    expect(verdict.shorts, `${label} shorts`).toEqual([])
    expect(verdict.equivalent, `${label} equivalent`).toBe(true)
  })
}

test("HC8 rejects the floated-C19 board from the copper side, not only HC3's side", async () => {
  // Two independent detections of one measured failure is the standard; one is
  // a coincidence. C19's pins vanish from the PIN lines, so a reference net
  // holding them has a pin with no hole, and HC8 refuses naming the pin.
  //
  // ANCHORED, NOT MATCHED, for Task 4's measured reason: the refusal's own
  // prose names `C19` and `PIN` while explaining itself, and so does the
  // neighbouring `hole-outside-copper-graph` refusal, so `toThrow(/C19\./)`
  // plus `toThrow(/PIN/)` cannot tell the intended refusal from its
  // neighbour.
  //
  // THE FULL MESSAGE, recorded because the brief could not know which of
  // C19's pins the export lists first:
  //   "reference-pin-not-on-board: C19.1 is a reference pin and the dump
  //    prints no PIN line for it. A placed part with no PIN lines is HC3's
  //    refusal and HC8's too, and it is NOT an open: ... (HC8 geometry
  //    contract version 2; ...)"
  //
  // MUTATION RUN (c), the one the brief demands and the one that stops this
  // being a placeholder: with `PIN C19 1 AT 5,13` and `PIN C19 2 AT 3,13`
  // appended to a COPY of the floated dump, this assertion fails with
  // 'Expected to start with: "reference-pin-not-on-board: C19." / Received:
  // ""' - the call returning a verdict instead of refusing. So the assertion
  // is driven by C19's absence and not by the dump happening to throw for
  // some other reason.
  const dumpText = await Bun.file("tests/fixtures/pultec-low-boost-c19-floated.dump").text()
  const reference = referenceNetsFromExport(await Bun.file(FROZEN_NETLIST).text())
  const message = refusalFrom(() => netlistEquivalence(dumpText, reference))
  expect(message).toStartWith("reference-pin-not-on-board: C19.")
  expect(message).toContain("the dump prints no PIN line for it")
  expect(message).toContain("is NOT an open")
})

/**
 * One `ref.pin` on two nets, in EESchema v1.1 - the grammar
 * `lib/kicad/legacy-netlist.ts` reads and the frozen fixture's own export
 * uses. R1.1 is listed under both `mid` and `alias`, which is an export that
 * cannot be true of any board.
 */
const PIN_IN_TWO_NETS = [
  "( { EESchema Netlist Version 1.1 created 2026-10-11T00:00:00 }",
  " ( /R1 RESISTOR4  R1 1k",
  "  (    1 mid )",
  "  (    1 alias )",
  "  (    2 out )",
  " )",
  ")",
  "*",
].join("\n")

test("referenceNetsFromExport refuses one ref.pin on two nets, rather than letting HC8 call it a short", () => {
  // THE MINOR TASK 4'S REVIEW LEFT HERE, measured on the shipped
  // equivalence.ts: with R1.1 on two nets, the verdict reported
  // `shorts: [{ nets: ["alias", "mid"], hole: "1,0" }]` - BLAMING THE COPPER
  // FOR A NETLIST DEFECT, on a board whose copper is correct. The remedy a
  // reader would act on is a layout change, and there is nothing wrong with
  // the layout.
  //
  // The reader of the export owns the export's own consistency, so the
  // refusal is here and `netlistEquivalence` keeps no second check for it.
  // Anchored on the opening clause, like every other refusal assertion in
  // this pipeline, and it names BOTH nets so a reader can find them.
  //
  // MUTATION RUN (d), the refusal dropped - `referenceNetsFromExport` built
  // from the reader's nets with no `netByPin` check - and the wrong answer it
  // then gives is the one Task 4's review predicted. This test failed with
  // 'Expected to start with: "pin-on-two-nets: R1.1" / Received: ""', and the
  // reference it built was
  // `[["mid", ["R1.1"]], ["alias", ["R1.1"]], ["out", ["R1.2"]]]`. Fed to
  // `netlistEquivalence` over a two-strip board whose copper is correct, the
  // verdict was `{"equivalent":false,"opens":[],"shorts":[{"nets":["alias",
  // "mid"],"hole":"0,0"}]}` - A SHORT, NAMING TWO NETS AND A HOLE, pointing a
  // reader at a layout with nothing wrong with it. (The hole is this board's
  // "0,0"; Task 4's review recorded "1,0" over its own fixture. Same defect,
  // different witness hole.) Reverted.
  const message = refusalFrom(() => referenceNetsFromExport(PIN_IN_TWO_NETS))
  expect(message).toStartWith("pin-on-two-nets: R1.1")
  expect(message).toContain("alias")
  expect(message).toContain("mid")
  expect(message).toContain("not a short")
})

test("referenceNetsFromExport refuses a grammar it does not read, rather than trying both readers", () => {
  // MUTATION RUN: with the refusal replaced by a try/catch that attempts the
  // legacy reader and falls through to the s-expression one, this fails with
  // 'Expected to start with: "unknown-export-grammar:" / Received: "expected
  // \"(\" at offset 0"' - a throw, but from the s-expression tokeniser, which
  // names its own offset rather than the input's grammar and says nothing
  // about what this function can read. Reverted.
  const message = refusalFrom(() => referenceNetsFromExport("netname R1.1 R1.2\n"))
  expect(message).toStartWith("unknown-export-grammar:")
  expect(message).toContain("EESchema Netlist Version")
  expect(message).toContain("(export")
})

test("both committed export grammars are read, and which one is chosen comes off the text", async () => {
  // The two readers are reached, so neither branch is a claim nobody drives:
  // the frozen fixture's export is EESchema v1.1 and pt2399-core's modern
  // sibling under tests/fixtures/ is a KiCad s-expression. Each is asserted
  // to have been READ - a net count above zero and the pin ids keyed
  // `ref.pin` - rather than merely not to have thrown.
  //
  // MUTATION RUN: with the s-expression branch's `importNetlist` swapped for
  // `importLegacyNetlist`, this fails with 'error: legacy netlist does not
  // open with (' - and so do the transistor-preamp-feedback and
  // transistor-preamp-staged agreement rows, which is the reason both
  // grammars are in the benchmark set rather than only the one the brief
  // named. Three failures, 8 passes. Reverted.
  const legacy = referenceNetsFromExport(await Bun.file(FROZEN_NETLIST).text())
  const sexpr = referenceNetsFromExport(
    await Bun.file("tests/fixtures/transistor-preamp-feedback.net").text(),
  )
  for (const [label, nets] of [["EESchema v1.1", legacy], ["s-expression", sexpr]] as const) {
    expect(nets.size, `${label} nets`).toBeGreaterThan(0)
    for (const pins of nets.values()) {
      for (const pin of pins) {
        expect(pin, `${label} pin id`).toMatch(/^.+\..+$/)
      }
    }
  }
})

test("the frozen fixture's grid and cut state come from the fixture, and its sha256 is recorded", async () => {
  const dump = parseBoardDump(await Bun.file(FROZEN_DUMP).text())
  // No literal grid: B2's rule is that the fixture's GRID line is the
  // authority. What is asserted is that the parse found one and that the board
  // is COMPUTED - NOT that any particular number is right, which is the
  // fixture's own job and which this test deliberately does not duplicate.
  expect(dump.grid.rows).toBeGreaterThan(0)
  expect(dump.grid.cols).toBeGreaterThan(0)
  expect(dump.cutState).toBe("COMPUTED")
  // MUTATION RUN: with the provenance file's recorded .vrt hash altered in
  // one hex digit, this fails with 'Expected to contain:
  // "411412bdf087c5aeea15195ae6ffc2bd1e453c3ca81fcdcf64307effd21b43ae"' and
  // the whole provenance text as Received. Reverted - the fixture and the
  // provenance are both back as committed.
  const provenance = await Bun.file("tests/fixtures/stripboard/provenance.txt").text()
  // `Bun.SHA256.hash(data, "hex")` rather than hashing into a typed array and
  // converting: the one-argument form's return type is a union of every typed
  // array, so the conversion needed a cast, and this repository does not
  // bypass typing to format a hash.
  const hash = Bun.SHA256.hash(
    await Bun.file("tests/fixtures/stripboard/pultec-low-boost-frozen.vrt").arrayBuffer(),
    "hex",
  )
  expect(provenance).toContain(hash)
})

test("the recorded net and pin counts agree with the fixture's own dump - B2's benchmark", async () => {
  // B2: if the extraction cannot produce an export agreeing with the fixture
  // board's own NODE and PIN counts, "the fixture is wrong and says which
  // number disagreed". Both sides are READ - the dump's own lines and the
  // netlist export's own nets - so no count is written here and a fixture
  // tuned to pass its own test cannot.
  //
  // MUTATION RUN: with one `(    2 j10_p1 )` pin form deleted from a COPY of
  // the fixture's export, this fails with 'error: pin count: the netlist
  // export disagrees with the board's PIN lines / Expected: 27 / Received:
  // 26' - naming which of the two numbers disagreed, which is B2's own
  // requirement of the failure. The copy was made in a temporary test; the
  // committed export is untouched.
  const dump = parseBoardDump(await Bun.file(FROZEN_DUMP).text())
  const reference = referenceNetsFromExport(await Bun.file(FROZEN_NETLIST).text())
  const dumpNets = Object.keys(dump.nodes).length
  const dumpPins = Object.values(dump.pins).reduce((total, list) => total + list.length, 0)
  const referencePins = [...reference.values()].reduce((total, list) => total + list.length, 0)
  expect(reference.size, "net count: the netlist export disagrees with the board's NODE lines")
    .toBe(dumpNets)
  expect(referencePins, "pin count: the netlist export disagrees with the board's PIN lines")
    .toBe(dumpPins)
})

test("the frozen fixture's pads are re-keyed to the netlist's names, which is what makes it gradable", async () => {
  // The PAD mechanism, driven on the board that needs it rather than asserted
  // in a comment. Ten of this board's twenty-seven pins are expanded pads:
  // the export names `SW_LO_BOOST.3`, the dump's PIN line names
  // `SW_LO_BOOST_3.1`, and the `PAD ... FROM SW_LO_BOOST.3` line is the only
  // bridge between them.
  //
  // MUTATION RUN: with `referencePinHoles` replaced by `pinHoles` in
  // equivalence.ts - which is what Task 4 shipped - this fails with
  // 'Expected: "" / Received: "reference-pin-not-on-board: RV_LO_BOOST.1 is a
  // reference pin and the dump prints no PIN line for it. ..."', and so does
  // the frozen-fixture agreement row, which throws the same refusal. 47 pass,
  // 2 fail: the pt2399-core, feedback and staged rows all still passed,
  // because none of those three boards has a `PAD` line. So this board is the
  // only one in the set that drives the mapping at all. Reverted.
  const dumpText = await Bun.file(FROZEN_DUMP).text()
  const padSources: string[] = []
  for (const line of dumpText.split("\n")) {
    const match = /^PAD .* FROM (\S+)$/.exec(line)
    const source = match?.[1]
    if (source !== undefined) {
      padSources.push(source)
    }
  }
  expect(padSources.length, "the fixture's PAD lines").toBeGreaterThan(0)
  const reference = referenceNetsFromExport(await Bun.file(FROZEN_NETLIST).text())
  const referencePins = new Set([...reference.values()].flat())
  for (const source of padSources) {
    expect(referencePins, `PAD source ${source}`).toContain(source)
  }
  expect(refusalFrom(() => netlistEquivalence(dumpText, reference))).toBe("")
})
