/**
 * `V3`: the `B1-frozen` run, and what it measured.
 *
 * **THE RESULT, FIRST, BECAUSE EVERY TEST BELOW IS SHAPED BY IT. `B1-frozen` IS
 * NOT MET, AND THE PIPELINE CANNOT SCORE THE FROZEN BOARD AT ALL.** Two of the
 * eight components the hand layout places carry data this repository does not
 * record, and the run refuses on them in order - measured 2026-10-12, both
 * refusals quoted in the tests below and in
 * `docs/stripboard/pipeline-verification.md` section 8:
 *
 *   1. `board_terminals` is a `BLOCK_200MIL3` and
 *      `VEROROUTE_FOOTPRINT_ROWS` has no row count for that VeroRoute type, so
 *      the starting arm refuses before any candidate exists.
 *   2. With that row count supplied in a scratch probe (3, read off the fork's
 *      own `ROTATED ... HOLES 3x7` line and reverted), the next refusal is
 *      `leadSpanFor` on
 *      `TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal`
 *      - `PAR2` refusing a footprint with no recorded span, by name.
 *
 * **THE HAND LAYOUT'S OWN SPANS ARE NOW ADMISSIBLE, AND THEY WERE NOT ON
 * 2026-10-12.** The first test in this file is the one the plan says to run
 * first, and until 2026-10-13 it recorded `R2` at a 3-hole span against a
 * recorded `minSpanHoles` of 5 - **reading 2 of the plan's three**, *"a
 * constraint binds ... the remedy is in the span data rather than in the
 * search"*. The remedy was in the span data, and it was a defect rather than a
 * bound: `lead-span.ts` described only the mounting the FOOTPRINT names, lying
 * flat, and the owner stands his resistors on end. His words: *"It's standard
 * practice to stand resistors on end when their holes are next to each other.
 * That's should NOT be a failure condition"*. `minReachPitchMm` now takes the
 * looser of the part's two mountings, the DIN0207's floor is the grid's 2 holes,
 * and `R2` passes. **The refusals above are untouched by that** - they are
 * missing data on two other footprints, not a span the owner's board uses.
 *
 * **WHAT IS THEREFORE NOT ASSERTED HERE.** No test claims `C <= 5`, `W = 0` or
 * any cut count on the frozen board, because no candidate was scored on it.
 * Nothing was tuned to produce a number: the span tables, the footprint-row
 * table and `stripboard/rules.json` are untouched by this task, and a table
 * edited to admit the artifact it is measured against would be a benchmark
 * grading itself.
 *
 * **THESE TESTS SPAWN THE REAL FORK AND RUN A REAL SEARCH**, at a reduced
 * evaluation cap through the injected rules - the plan's own remedy for the
 * wall clock, never a skip, because *"a skipped benchmark looks exactly like a
 * passing one"*. `bun test tests/stripboard/benchmark.test.ts` is a thing a
 * person can run alone, which is why this file holds nothing else.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import { spanHoles } from "../../tools/stripboard/constraints-model.ts"
import { place, placeAcrossSeeds, reportInputOf } from "../../tools/stripboard/place.ts"
import { exitCodeFor, renderReport } from "../../tools/stripboard/report.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import {
  FROZEN,
  FROZEN_NETLIST,
  LOW_BOOST_BOARD,
  frozenDump,
  frozenFootprints,
  recordingSpawn,
  reducedRules,
  refusalFrom,
} from "./benchmark-fixtures.ts"
import { boardsDigest } from "./run-dir-fixtures.ts"

/**
 * The arm these runs take.
 *
 * **IT IS PASSED EXPLICITLY AT EVERY CALL AND THIS FILE CHOOSES NO DEFAULT
 * FOR THE PIPELINE.** `place` has no default arm - `tools/cli/perfboard-stripboard-verbs.ts`
 * refuses without `--seed-arm` and a test asserts that - and `import` is used
 * here because it is the arm whose start is a copy of `--import`'s own output,
 * so a test about what the run STARTS FROM is not also a test of a
 * construction. The other two arms begin from the same board and differ only
 * in what they do to it.
 */
const ARM = "import" as const

/** Long enough for a real search; every figure in the comments was measured under it. */
const SLOW = 600_000

test("every span the hand layout uses is inside its family's recorded bounds", () => {
  // THE PLAN SAYS RUN THIS FIRST AND READ IT, and read it says: *"if a span the
  // owner's own layout uses is outside maxSpanHoles or below minSpanHoles,
  // reading 2 is the cause of any failure below and the remedy is in the span
  // data, not in the search."* Measured on the committed fixture, with the
  // footprints of the model it was built against:
  //
  //   C18..C23  span 3 holes, against 2-4 for C_Rect_L7.2mm_W2.5/3.5mm_P5.00mm  INSIDE
  //   R2        span 3 holes, against 2-16 for R_Axial_DIN0207_...P10.16mm      INSIDE
  //
  // IT READ *"R2 spans 3 against min 5"* UNTIL 2026-10-13, and that is why this
  // test is phrased as a measurement and not as a hope. The figure moved
  // because the span model moved: a DIN0207's recorded floor was the floor for
  // the part LYING FLAT, where the 6.5mm body has to fit between the holes, and
  // the owner stands his resistors on end, where it does not. The remedy was in
  // the span data, exactly as the plan's reading 2 says, and it was a defect in
  // it rather than a bound it legitimately imposed.
  //
  // WHAT THIS TEST STILL CANNOT BE USED FOR. Both lists being empty says the
  // hand layout is admissible ON THE TWO SPAN CONSTRAINTS. It says nothing
  // about the run below, which refuses for missing footprint data on parts
  // whose spans are not even measurable here.
  const dump = frozenDump()
  const footprints = frozenFootprints()
  const below: string[] = []
  const above: string[] = []
  let twoLead = 0
  for (const [ref, pins] of Object.entries(dump.pins)) {
    if (pins.length !== 2) continue
    const footprint = footprints.get(ref)
    expect(footprint, `${ref} has no footprint in the frozen map`).toBeDefined()
    const span = spanHoles(pins)
    expect(span, `${ref} has two pins and no measurable span`).toBeDefined()
    const bounds = leadSpanFor(footprint!)
    twoLead += 1
    if (span! < bounds.minSpanHoles) below.push(`${ref} spans ${span} against min ${bounds.minSpanHoles}`)
    if (span! > bounds.maxSpanHoles) above.push(`${ref} spans ${span} against max ${bounds.maxSpanHoles}`)
  }
  expect(twoLead, "the frozen board's two-lead parts").toBe(7)
  expect(above, "no span on the hand layout is above its family's maximum").toEqual([])
  expect(below, "no span on the hand layout is below its family's minimum").toEqual([])
  // AND R2 IS IN THE SET THAT WAS CHECKED. An empty `below` from a loop that
  // silently skipped the one part this test is about would read identically.
  expect(Object.keys(dump.pins), "R2 is one of the refs measured").toContain("R2")
  expect(spanHoles(dump.pins["R2"]!), "R2's span on the owner's own board").toBe(3)
  expect(
    leadSpanFor(footprints.get("R2")!).minSpanHoles,
    "the floor R2's 3-hole span is admitted by",
  ).toBe(2)
})

test(
  "V3: the frozen run REFUSES before a candidate exists, and B1-frozen is NOT met",
  async () => {
    // THE RUN, AND ITS RESULT. There is no C, no W and no net-completeness
    // figure to assert, because nothing was scored: the refusal is the whole
    // measurement, and this test is what keeps it from reading as a pass. The
    // message is anchored on its opening clause and on the datum that is
    // missing, so a later edit that supplies the row count moves this test
    // rather than leaving it green over a different world.
    //
    // MUTATION RUN: with BLOCK_200MIL3 added to VEROROUTE_FOOTPRINT_ROWS in a
    // scratch probe this failed with the SECOND refusal in its place - 'no lead
    // span is recorded for footprint "TerminalBlock_Phoenix:...MKDS-1,5-3-5.08
    // _1x03_P5.08mm_Horizontal"' - which is the chain the module comment
    // records. Reverted; the table is untouched by this task.
    const message = await refusalFrom(() =>
      place({ frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules(), arm: ARM }),
    )
    expect(message, "the frozen run must refuse rather than report a result").not.toBe("")
    expect(message).toContain("BLOCK_200MIL3")
    // A REFUSAL THAT TEACHES: where to fix it, and why it is not guessed.
    expect(message).toContain("tools/stripboard/seed-geometry.ts")
    expect(message).toContain("It is NOT guessed")
  },
  SLOW,
)

test("V3's failure is reading 2, and the record says so", async () => {
  // The plan: *"the run must say which of three it is"*. A run that refuses
  // renders no report, so the reading is recorded where the plan puts it - in
  // docs/stripboard/pipeline-verification.md - and this test is the guard that
  // the record names one of the three rather than describing the failure
  // without classifying it.
  const record = await Bun.file("docs/stripboard/pipeline-verification.md").text()
  const section = record.slice(record.indexOf("## 8."))
  expect(section, "section 8 is Task 23's own record").not.toBe("")
  expect(section).toMatch(/optimiser is weak|a constraint binds|the scorer is wrong/)
  expect(section).toContain("a constraint binds")
})

test(
  "a run against the scaffolded board does not report B1-frozen satisfied",
  async () => {
    // `A4`'s own clause, and `V3`'s requirement: the frozen fixture meets
    // B1-frozen, the scaffolded board meets B1-current, and a run states which
    // it ran. The cap is reduced; what is asserted is which clause the report
    // names, which no cap changes.
    const run = await place({ board: LOW_BOOST_BOARD, rules: reducedRules(8), arm: ARM })
    const report = renderReport(reportInputOf(run)).join("\n")
    expect(report).not.toMatch(/B1-frozen/)
    expect(report).toMatch(/B1-current/)
  },
  SLOW,
)

test(
  "the run starts from the import-placed board, not from the hand layout",
  async () => {
    // B1-frozen is stated "starting from the import-placed board". Seeding from
    // the owner's own layout would be reproducing a result by copying it.
    //
    // THE RUN REFUSES AND THE SPAWN RECORD IS STILL THE WITNESS: the import
    // happens before the arm reads the board, so the record is complete up to
    // the refusal - and the second assertion is the one that matters, because
    // it holds over EVERY spawn the run made.
    const spawned: string[][] = []
    const message = await refusalFrom(() =>
      place(
        { frozen: FROZEN, netlist: FROZEN_NETLIST, rules: loadRules(), arm: ARM },
        recordingSpawn(spawned),
      ),
    )
    expect(message).not.toBe("")
    expect(spawned.some((args) => args[0] === "--import")).toBe(true)
    for (const args of spawned) expect(args).not.toContain(FROZEN)
  },
  SLOW,
)

test(
  "the run leaves boards/** byte-identical",
  async () => {
    // V7's witness is `boardsDigest`, NOT `git status --porcelain`: task 13's
    // fix round 2 measured the porcelain comparison INERT rather than merely
    // fragile - it prints ` M path` identically whether a file changed once or
    // three times, so a change made over an already-dirty tree reads the same
    // as none. `./run-dir-fixtures.ts` carries the full reasoning.
    const before = boardsDigest()
    await place({ board: LOW_BOOST_BOARD, rules: reducedRules(8), arm: ARM })
    expect(boardsDigest()).toBe(before)
  },
  SLOW,
)

test(
  "the per-seed results are reported as a rate, and the rate is labelled a diagnostic",
  async () => {
    // The diagnostic, and the guard that keeps it a diagnostic. Reaching the
    // target on one seed and failing most others is materially different from
    // reaching it reliably, and the report must make that visible - WITHOUT
    // becoming a criterion the implementing agent invented.
    //
    // IT RUNS AGAINST THE SCAFFOLDED BOARD because the frozen board cannot be
    // scored at all (see this file's comment), and at a reduced cap because the
    // sweep is one full run per seed. What is asserted is the REPORTING, which
    // no cap changes: every reviewed seed has a row, each row names a bound,
    // and the fraction carries both numbers.
    const rules = reducedRules(8)
    const run = await placeAcrossSeeds({ board: LOW_BOOST_BOARD, rules, arm: ARM })
    expect(run.perSeed.length, "every seed in the reviewed set is run").toBe(rules.seeds.length)
    for (const seed of run.perSeed) {
      expect(rules.seeds).toContain(seed.seed)
      expect(seed.bound, `seed ${seed.seed}`).not.toBe("")
    }
    const lines = renderReport(reportInputOf(run)).join("\n")
    // Both numbers, so a fraction cannot be read as a bare percentage.
    expect(lines).toMatch(new RegExp(`\\b${run.reached}\\b[^\\n]*\\b${rules.seeds.length}\\b`))
    // And it is labelled as what it is.
    expect(lines).toMatch(/diagnostic/i)
    expect(lines).not.toMatch(/success rate (?:below|above|threshold|target)/i)
  },
  SLOW,
)

test(
  "the rate is not an acceptance condition: the verdict is the single run's",
  async () => {
    // THE DISCRIMINATING TEST. The plan's draft scripted a spawn in which
    // exactly one seed reaches the target; no scripted spawn can produce an
    // ADMISSIBLE board on this pipeline today (nothing has reached one), so the
    // discrimination is made the other way round and over a real sweep: take
    // the measured rate and replace it with the most flattering one possible,
    // and every judged figure must be unchanged.
    //
    // MUTATION RUN: with report-sweep.ts's first line changed to print
    // `sweep.reached === sweep.perSeed.length ? "admissible" : outcome` - the
    // shape of a rate that had become a criterion - this failed on the rendered
    // comparison below. Reverted.
    const rules = reducedRules(8)
    const measured = await placeAcrossSeeds({ board: LOW_BOOST_BOARD, rules, arm: ARM })
    expect(measured.reportedOutcome).toBe(measured.singleRunVerdict)
    expect(exitCodeFor(measured.reportedOutcome, measured.first.rule)).toBe(
      exitCodeFor(measured.singleRunVerdict, measured.first.rule),
    )

    // THE SUBSTITUTED RATE IS CHOSEN TO DIFFER FROM THE MEASURED ONE, because
    // the measured one on this board is already `perSeed.length`: `A4` holds on
    // every seed, B1-current's tolerance clause not firing while `tau` is unset,
    // so a flattering substitution would have substituted nothing and the last
    // assertion below would have been vacuous. That the rate reads *every seed*
    // on a board failing `A1` on four constraints is itself a finding, recorded
    // in docs/stripboard/pipeline-verification.md section 8.
    const substituted = measured.reached === 0 ? measured.perSeed.length : 0
    const flattered = { ...measured, reached: substituted }
    const before = renderReport(reportInputOf(measured))
    const after = renderReport(reportInputOf(flattered))
    const judged = (lines: readonly string[]): readonly string[] =>
      lines.filter((line) => /^(outcome|bound|exit|A[1-4]) /.test(line))
    expect(judged(after), "the verdict is not a function of the rate").toEqual(judged(before))
    // And the rate itself DID move, so the comparison above is not vacuous.
    expect(after.join("\n")).not.toBe(before.join("\n"))
  },
  SLOW,
)

test("the frozen fixture's four files are all present, and the GRID is its own authority", () => {
  // The benchmark's inputs, checked as inputs: a missing one would make every
  // test above refuse for the wrong reason. The grid is asserted against the
  // fixture's own line and never against a literal (Task 5's rule), so this
  // states that the figures AGREE rather than what they are.
  const dump = frozenDump()
  expect(fs.existsSync(FROZEN)).toBe(true)
  expect(fs.existsSync(FROZEN_NETLIST)).toBe(true)
  const pins = Object.values(dump.pins).reduce((total, group) => total + group.length, 0)
  expect(pins, "27 pins, as the provenance records").toBe(27)
  expect(Object.keys(dump.pins).length, "across 18 refs, ten of them one-hole pads").toBe(18)
  expect(Object.keys(dump.nodes).length, "9 nets, as the provenance records").toBe(9)
  expect(dump.grid.rows).toBeGreaterThan(0)
  expect(dump.grid.cols).toBeGreaterThan(0)
  // The strip axis decides which of the two the strip count is, and the fixture
  // states the axis: this is the same reading `stripsAcross` makes.
  expect(dump.verticalStrips ? dump.grid.cols : dump.grid.rows).toBeGreaterThanOrEqual(
    Object.keys(dump.nodes).length,
  )
})
