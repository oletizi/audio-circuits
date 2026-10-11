import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import {
  HARD_CONSTRAINTS,
  a1,
  gradeHardConstraints,
  stockFor,
} from "../../tools/stripboard/grade.ts"
import { hc10, hc3, hc4, hc5, hc6, hc9 } from "../../tools/stripboard/constraints.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { checkpointInput, primeCheckpointNetlists } from "./checkpoint-fixtures.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { importClosure } from "./import-closure.ts"
import {
  fixtureDeclaration,
  healthyInput,
  inputWithFeatureOutsideBounds,
  inputWithFootprint,
  inputWithGridAndBounds,
  inputWithMultiRowPartAlongTheStrips,
  inputWithoutBounds,
  negativeInput,
  read,
  withStripAxisFlipped,
} from "./grade-fixtures.ts"

const IDS = ["HC1", "HC2", "HC3", "HC4", "HC5", "HC6", "HC7", "HC8", "HC9", "HC10"] as const

test("there are exactly ten hard constraints and A1 is the verdict that all ten hold", () => {
  expect(HARD_CONSTRAINTS.map((entry) => entry.id)).toEqual([...IDS])
})

test("every constraint reports a result on every grade, so none can be skipped", () => {
  const results = gradeHardConstraints(healthyInput())
  expect(results.map((result) => result.id).sort()).toEqual([...IDS].sort())
  for (const result of results) expect(result.detail, result.id).not.toBe("")
})

test("A1 is false when any single constraint fails, one at a time", () => {
  // Ten subtests in a loop, because a conjunction written as nine ANDs and a
  // typo is a verdict that ignores one constraint and this is what catches it.
  for (const id of IDS) {
    const results = gradeHardConstraints(healthyInput()).map((result) =>
      result.id === id ? { ...result, held: false } : result,
    )
    expect(a1(results), id).toBe(false)
  }
  expect(a1(gradeHardConstraints(healthyInput()))).toBe(true)
})

test("a1 refuses an incomplete result set rather than folding what arrived", () => {
  // `every` is TRUE of the empty list and true of nine passes, so a verdict
  // folded over an incomplete set certifies a board against constraints nobody
  // checked. That is the defect CRITERIA found in PIPELINE, whose A1 stated
  // H1-H9 where there were ten.
  const results = gradeHardConstraints(healthyInput())
  expect(a1(results)).toBe(true)
  for (const id of IDS) {
    const short = results.filter((result) => result.id !== id)
    expect(() => a1(short), id).toThrow(id)
  }
  expect(() => a1([])).toThrow(/ten hard/)
  expect(() => a1([...results, ...results])).toThrow(/two results/)
})

test("V4: each constraint has a fixture it rejects by name", () => {
  // The parent's gate-9 discipline: a grader that cannot fail proves nothing.
  // Each row is a fixture and the constraint it must fail, and the assertion is
  // that THAT constraint failed and that its detail names the offending thing.
  const cases = [
    ["HC1", "incomplete-net", /incomplete/],
    ["HC2", "cuts-unresolved", /UNRESOLVED/],
    ["HC3", "floated-part", /C19/],
    ["HC4", "span-above-tool-range", /16|range/],
    ["HC5", "span-above-reach", /maxSpanHoles|reach/],
    ["HC6", "over-stock", /34|27|stock/],
    ["HC7", "schematic-delta", /delta/],
    ["HC8", "two-nets-shorted", /short|mid|out/],
    ["HC9", "span-below-minimum", /minSpanHoles|minimum/],
    ["HC10", "round-pin-pattern", /strip/],
    ["HC10", "rows-along-a-strip", /strip/],
  ] as const
  for (const [id, fixture, pattern] of cases) {
    const results = gradeHardConstraints(negativeInput(fixture))
    const failed = results.filter((result) => !result.held).map((result) => result.id)
    expect(failed, fixture).toContain(id)
    const detail = results.find((result) => result.id === id)?.detail ?? ""
    expect(detail, fixture).toMatch(pattern)
  }
})

test("HC3 asserts BOTH signals, so a fork change keeping one fails loudly", () => {
  const results = gradeHardConstraints(negativeInput("floated-part"))
  const detail = results.find((result) => result.id === "HC3")?.detail ?? ""
  expect(detail).toMatch(/FLOATING/)
  expect(detail).toMatch(/PIN/)
})

test("HC3's SECOND signal fails on its own: a placed part that prints no PIN lines", () => {
  // ADDED BECAUSE A MUTATION FOUND THIS GAP. Dropping the `placedWithNoPins`
  // clause from hc3's condition broke NO test: every fixture that trips HC3
  // trips signal 1 as well, so signal 2 was carried by signal 1 and CRITERIA's
  // "two assertions, so a change keeping one signal and dropping the other
  // fails loudly" was not true of this suite. It is now.
  //
  // The board below reads AT on its PART line - so signal 1 sees nothing wrong
  // - and prints no PIN line for that part, which is signal 2 alone. Graded by
  // hc3 directly, because every check that needs a part's holes refuses this
  // board by design (`placedParts`), so the full table throws at HC4.
  const text = read("healthy", "dump")
    .split("\n")
    .filter((line) => !line.startsWith("PIN J1 "))
    .join("\n")
  const result = hc3({ ...healthyInput(), dumpText: text, dump: parseBoardDump(text) })
  expect(result.held, result.detail).toBe(false)
  expect(result.detail).toMatch(/J1/)
  expect(result.detail).toMatch(/PIN/)
  // Signal 1 is clean on this board, which is what makes it signal 2's test.
  expect(result.detail).toMatch(/0 part\(s\) read FLOATING/)
})

test("HC3 rejects the MEASURED floated board, graded by the real check", () => {
  // THE HAND-WRITTEN FIXTURE ABOVE MIRRORS A MEASURED FAILURE; THIS IS THE
  // MEASURED FAILURE ITSELF - tests/fixtures/pultec-low-boost-c19-floated.vrt,
  // captured from a shipped verb that exited 0, printed nothing, and wrote the
  // board with C19 off it. It cannot go through gradeHardConstraints: it places
  // `board_terminals`, whose footprint is recorded nowhere here, so PAR2
  // refuses the whole table before HC3 reports - and PAR2 refusing it is
  // correct. `hc3` reads only PART and PIN lines, so it needs no footprint map
  // and grades the real board directly.
  const text = fs.readFileSync(
    path.join(import.meta.dir, "..", "fixtures", "pultec-low-boost-c19-floated.dump"),
    "utf8",
  )
  const result = hc3({ ...healthyInput(), dumpText: text, dump: parseBoardDump(text) })
  expect(result.held).toBe(false)
  expect(result.detail).toMatch(/C19/)
  expect(result.detail).toMatch(/FLOATING/)
  expect(result.detail).toMatch(/PIN/)
})

test("HC5, HC9 and HC10 refuse by name for a footprint with no data, never default", () => {
  // PAR2: both span bounds are required with no default and the pipeline
  // refuses without them, including for a family the module has no datasheet
  // figure for. The same posture now covers HC10's pin pattern.
  const input = inputWithFootprint("Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")
  expect(() => gradeHardConstraints(input)).toThrow(/C_Disc_D5\.0mm/)
  const unknown = inputWithFootprint("Rotary_SW:SW_Rotary11_D30mm")
  expect(() => gradeHardConstraints(unknown)).toThrow(/SW_Rotary11_D30mm/)

  // EACH LOOKUP REFUSES ON ITS OWN, AND THIS WAS ADDED BECAUSE A MUTATION
  // FOUND THE GAP. Giving the SPAN lookup a fallback to the tool's own range
  // broke neither assertion above: HC10's PATTERN lookup still threw and named
  // the footprint, so the test passed while the thing its name claims - that
  // HC5 and HC9 refuse - had stopped being true. The two lookups are separate
  // whitelists with separate remedies, so each is asserted separately.
  for (const [name, check] of [
    ["HC4", hc4],
    ["HC5", hc5],
    ["HC9", hc9],
    ["HC10", hc10],
  ] as const) {
    expect(() => check(input), name).toThrow(/C_Disc_D5\.0mm/)
    expect(() => check(unknown), name).toThrow(/SW_Rotary11_D30mm/)
  }
  // And the span refusals say what is MISSING rather than only that it is
  // absent: C_Disc is in UNSOURCED, which carries the better message.
  expect(() => hc5(input)).toThrow(/no lead span is recorded/)
  expect(() => hc10(input)).toThrow(/no pin pattern is recorded/)
})

test("HC6 measures the occupied extent, not the canvas from GRID", () => {
  // --import leaves the canvas at a default, so a GRID larger than the stock
  // says nothing about copper. A layout whose parts fit inside the stock can be
  // cut from that board whatever its canvas says.
  const wideCanvas = inputWithGridAndBounds({ grid: [60, 60], bounds: [0, 0, 10, 10] })
  const result = gradeHardConstraints(wideCanvas).find((entry) => entry.id === "HC6")
  expect(result?.held, result?.detail).toBe(true)
})

test("HC6 refuses a layout whose WIRE end is inside the stock only if BOUNDS is trusted alone", () => {
  // THE GAP THIS CLOSES. BOUNDS is a union of three sources (Board.h:710) and
  // is not a statement about which features a cuttable board must retain. A
  // wire endpoint, a solder bridge or the copper run a cut depends on can sit
  // outside the component bounding box - measured on two committed boards - and
  // a board trimmed to a box that excludes one does not conduct.
  //
  // The fixture puts a WIRE end one column past BOUNDS and past the stock. A
  // grader reading BOUNDS alone passes it; the fabrication extent refuses it
  // and NAMES THE WIRE, which is the discriminating observation.
  const input = inputWithFeatureOutsideBounds({ kind: "wire" })
  const result = gradeHardConstraints(input).find((entry) => entry.id === "HC6")
  expect(result?.held).toBe(false)
  expect(result?.detail).toMatch(/wire/i)
  expect(result?.detail).toMatch(/stock/)
})

test("HC6's detail reports both figures when they disagree, because the dump cannot attribute it", () => {
  // BOUNDS over-states when a text label or an unplaced part contributes a rect,
  // and the dump reports only the union - so the cause is NOT in the data and
  // the detail says which two numbers disagreed rather than explaining why.
  //
  // THE SOLDER CASE HOLDS AND STILL REPORTS, which is what makes this a
  // different test from the one above rather than the same one twice: the
  // bridge hole is outside BOUNDS and inside the stock, so the discrepancy is
  // reported on a PASS.
  const input = inputWithFeatureOutsideBounds({ kind: "solder" })
  const result = gradeHardConstraints(input).find((entry) => entry.id === "HC6")
  expect(result?.held, result?.detail).toBe(true)
  expect(result?.detail).toMatch(/BOUNDS/)
  expect(result?.detail).toMatch(/feature/i)
})

test("HC6 refuses a dump with no BOUNDS line rather than falling back to the pin extent", () => {
  // Task 7's ruling: the frozen fixtures predate the line, and the refusal
  // belongs where the field is needed. Pin extent is a LOWER bound on physical
  // extent because a body overhangs its leads, so substituting it would
  // silently loosen the constraint.
  expect(() => gradeHardConstraints(inputWithoutBounds())).toThrow(/BOUNDS/)
})

test("HC10 holds only when BOTH halves hold, and the detail says which failed", () => {
  // HC10's criterion sentence is about a PLACEMENT; CRITERIA's Checked-by
  // column specifies a footprint-level classification. Task 2 proves a
  // footprint COULD be placed compatibly. This is the half that proves the
  // produced layout DID - and without it the verdict asserted a constraint
  // whose placement clause nothing checked.
  const footprint = gradeHardConstraints(negativeInput("round-pin-pattern")).find(
    (entry) => entry.id === "HC10",
  )
  expect(footprint?.held).toBe(false)
  expect(footprint?.detail).toMatch(/footprint/)

  const placement = gradeHardConstraints(negativeInput("rows-along-a-strip")).find(
    (entry) => entry.id === "HC10",
  )
  expect(placement?.held).toBe(false)
  expect(placement?.detail).toMatch(/placement/)
  expect(placement?.detail).toMatch(/U1|DIRECTION/)
})

test("HC10's placement half reads DIRECTION as well as the pin holes - two witnesses", () => {
  // M1.1's own reason for the field: reading the orientation directly is what
  // makes the check independent of the lead pattern, and a single-pad or
  // symmetric part has no lead pattern to read. Same shape as HC3's two
  // signals: a change keeping one and dropping the other fails loudly.
  const placement = gradeHardConstraints(negativeInput("rows-along-a-strip")).find(
    (result) => result.id === "HC10",
  )
  expect(placement?.detail).toMatch(/DIRECTION/)
  expect(placement?.detail).toMatch(/[0-9]+,[0-9]+/) // the pin holes it read
})

test("HC10 refuses a placed part whose DIRECTION the dump does not state", () => {
  // The second witness's own refusal, and the reason it is a witness rather
  // than decoration: it can fail on its own. A capture older than the grammar
  // reaches HC10 with no orientation at all, and HC10 says so by name rather
  // than grading the holes and calling the constraint checked.
  const noDirection = negativeInput("rows-along-a-strip")
  const stripped = noDirection.dumpText.replace(/ DIRECTION [A-Z]+$/m, "")
  expect(stripped).not.toBe(noDirection.dumpText)
  expect(() => hc10({ ...noDirection, dumpText: stripped, dump: parseBoardDump(stripped) })).toThrow(
    /DIRECTION/,
  )
})

test("HC10's placement half passes a decomposable footprint turned the RIGHT way", () => {
  // The positive control. Without it the placement half could refuse every
  // multi-row part and every negative fixture would still pass.
  //
  // THE OWNER'S RULE, and the fixture is the mounting he named: *"dips should
  // span strips with a cut down the middle, like a breadboard."* The DIP-16's
  // sixteen pins sit two to a strip across eight strips, one from each of its
  // two eight-pin rows, so no row has two pins on one strip.
  const correct = inputWithMultiRowPartAlongTheStrips()
  const result = gradeHardConstraints(correct).find((entry) => entry.id === "HC10")
  expect(result?.held, result?.detail).toBe(true)
  expect(result?.detail).toMatch(/footprint/)
  expect(result?.detail).toMatch(/placement/)
})

test("HC10's placement half reads the strip axis rather than assuming rows", () => {
  // The same layout under VERTICAL_STRIPS 0 and 1 cannot both be compatible,
  // and a check hard-coded to rows would pass one of them for the wrong reason.
  const horizontal = inputWithMultiRowPartAlongTheStrips()
  const vertical = withStripAxisFlipped(horizontal)
  const held = (input: ReturnType<typeof inputWithMultiRowPartAlongTheStrips>): boolean =>
    hc10(input).held
  expect(held(horizontal)).not.toBe(held(vertical))
})

test("the stock comes from the board when it declares one and from the rules otherwise", () => {
  const rules = loadRules()
  const fromRules = stockFor("boards/pultec-low-boost/perfboard.json", rules)
  expect(fromRules.source).toBe("rules-default")
  expect([fromRules.rows, fromRules.cols]).toEqual([rules.stockRows, rules.stockCols])
  const declared = stockFor(fixtureDeclaration({ stock: { rows: 40, cols: 30 } }), rules)
  expect(declared.source).toBe("board")
  expect([declared.rows, declared.cols]).toEqual([40, 30])
})

test("a malformed declared stock refuses rather than falling back to the rules default", () => {
  // A declaration that TRIED to say something about the owner's stock and
  // failed is not one that said nothing, and substituting 34 x 27 would grade
  // the board against a piece he does not have.
  const rules = loadRules()
  for (const stock of [{ rows: 0, cols: 30 }, { rows: 40 }, { rows: 40, cols: -1 }, "big"]) {
    expect(() => stockFor(fixtureDeclaration({ stock }), rules), JSON.stringify(stock)).toThrow(
      /"stock"/,
    )
  }
})

test("HC6 names both figures on pt2399-core, the board OB4 records as not fitting", async () => {
  await primeCheckpointNetlists()
  // The one hard-constraint failure the criteria already predict from the owner
  // himself: *"It doesn't fit on my stock boards. I improvised to make it
  // work."* Graded through hc6 directly rather than gradeHardConstraints,
  // because PAR2 refuses this board earlier in the table - see the checkpoint
  // test, which is where that refusal is asserted.
  const input = checkpointInput("pt2399-core")
  const result = hc6(input)
  expect(result.held, result.detail).toBe(false)
  expect(result.detail).toMatch(/36/) // the extent it needs
  expect(result.detail).toMatch(/27/) // the stock it has
  expect(result.detail).toMatch(/stock/)
})

test("nothing in the grader's TRANSITIVE import closure is the scorer or the search", async () => {
  // R2: the thing that mutates the board and the thing that certifies it are
  // two implementations of nothing in common.
  //
  // THE TEST THIS REPLACES was `expect(text).not.toContain("score.ts")` on two
  // files for three filenames, under a comment claiming it was "asserted by
  // reading the import graph rather than by intention". It was not: a
  // transitive import through ANY third module passes it, so the comment was a
  // stronger claim than the body and the gap was invisible. The closure is
  // computed, and an unresolvable import is an error rather than a dropped
  // edge - see tests/stripboard/import-closure.ts.
  const forbidden = [
    "tools/stripboard/score.ts",
    "tools/stripboard/climb.ts",
    "tools/stripboard/moves.ts",
    "tools/stripboard/rank.ts", // reaches score.ts, so reaching it reaches the scorer
  ]
  for (const file of [
    "tools/stripboard/grade.ts",
    "tools/stripboard/constraints.ts",
    "tools/stripboard/constraints-electrical.ts",
    "tools/stripboard/constraints-physical.ts",
    "tools/stripboard/extent.ts",
  ]) {
    const closure = await importClosure(file)
    for (const module of forbidden) {
      expect([...closure].sort(), `${file} -> ${module}`).not.toContain(module)
    }
  }
})

test("the grader and the scorer DO share the dump parser, which is intended", async () => {
  // The honest other half. R2 is about two implementations of the objective and
  // the verdict, not about forbidding a shared reader of the input text: both
  // sides must agree on what the dump SAYS or they are grading different
  // boards. Asserting the sharing makes it a decision in the record rather than
  // an accident the closure test tolerates.
  const graderClosure = await importClosure("tools/stripboard/grade.ts")
  expect([...graderClosure]).toContain("tools/guide/dump.ts")
  const scorerClosure = await importClosure("tools/stripboard/score.ts")
  expect([...scorerClosure]).toContain("tools/guide/dump.ts")
})
