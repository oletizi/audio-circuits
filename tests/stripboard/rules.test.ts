/**
 * `stripboard/rules.json` as a committed artifact, and the strictness of the
 * loader that is the only way to read it.
 *
 * TWO KINDS OF TEST LIVE HERE AND THEY ANSWER DIFFERENT QUESTIONS. The first
 * group reads the COMMITTED file and asserts what its numbers and notes say -
 * those are tests of the artifact, and they fail when somebody edits a value
 * or drops the reasoning behind one. The second group drives the LOADER over
 * written-out fixtures and asserts each refusal, one at a time.
 *
 * WHY EVERY REFUSAL ASSERTION ANCHORS ON ITS OPENING CLAUSE. The loader raises
 * seventeen refusals and several read almost alike - unknown key, missing key,
 * wrong type, out of range, three ways a seed list is wrong, four ways a note
 * is - over a file where every message mentions the same words ("note",
 * "defaulted", the key's own name). A `toContain` or a bare regex would pass
 * against the neighbouring clause, so each assertion names the code AND the
 * key and uses `toStartWith`.
 *
 * TWENTY-ONE MUTATIONS, ONE PER CLAUSE, AND THE REAL OUTPUT IS RECORDED.
 * Each refusal was driven by breaking the clause that raises it, running this
 * file, and copying what actually came out into the comment beside the
 * assertion - never a paraphrase of what it should have said. Two mutations
 * found faults the assertions alone had not: a message with `undefined`
 * spliced into it, and three file-level faults that all collapsed into one
 * misleading refusal. Both are recorded where they were found.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { loadRules, RULES_PATH, type StripboardRules } from "../../tools/stripboard/rules.ts"
import { fixture, refusalFrom } from "./rules-fixtures.ts"

/** The eleven parameters, as the plan's interface names them. */
const PARAMETERS = [
  "rhoWire",
  "rhoSolder",
  "kappaBench",
  "tau",
  "yieldFloor",
  "evaluationCap",
  "signatureRun",
  "seeds",
  "worseAcceptance",
  "stockRows",
  "stockCols",
] as const

/** The note for one parameter of the committed file. */
function note(rules: StripboardRules, key: string): string {
  const text = rules.notes[key]
  if (text === undefined) throw new Error(`the committed file has no note for "${key}"`)
  return text
}

// ---------------------------------------------------------------------------
// The committed artifact
// ---------------------------------------------------------------------------

test("the committed rules load, and every entry carries a note", () => {
  // MUTATION RUN: with readNotes returning `{}` instead of the notes it read,
  // this failed with 'error: rhoWire / Received: undefined' - the label is the
  // key - and five of the artifact tests below failed with 'the committed file
  // has no note for "tau"' and so on, six failures in all. Reverted.
  const rules = loadRules()
  expect(rules.schema).toBe(1)
  for (const key of PARAMETERS) {
    expect(rules.notes[key], key).toBeDefined()
    expect(note(rules, key).length, key).toBeGreaterThan(40)
  }
  // The notes block holds nothing else: a note for a parameter that does not
  // exist is a reason attached to no number, which the loader also refuses.
  expect(Object.keys(rules.notes).sort()).toEqual([...PARAMETERS].sort())
})

test("the owner's settled values are the ones the committed file carries", () => {
  // The four values CRITERIA records as settled by him: PAR1's two weights,
  // K2's clustering bound, HC6's stock. A test on the numbers themselves,
  // because this file is how reviewed criteria reach the optimiser and an
  // edited value is exactly what must not pass unnoticed.
  const rules = loadRules()
  expect(rules.rhoWire).toBe(0.25)
  expect(rules.rhoSolder).toBe(1)
  expect(rules.kappaBench).toBe(0.05)
  expect(rules.stockRows).toBe(34)
  expect(rules.stockCols).toBe(27)
  // One cut costs as much as four wires, which is the claim rho_w encodes.
  expect(rules.rhoSolder / rules.rhoWire).toBe(4)
})

test("tau is null in the committed file - unset on purpose, with no number standing in", () => {
  // CRITERIA K4: tau has no value and no default. The owner declined to set
  // it because the question was put to him against the wrong floor, and the
  // 0.05 PIPELINE proposed is withdrawn rather than carried quietly. null is
  // the recorded decision; the key being required is what makes it one.
  const rules = loadRules()
  expect(rules.tau).toBeNull()
  expect(note(rules, "tau")).toContain("UNSET")
  expect(note(rules, "tau")).toContain("WITHDRAWN")
  // The withdrawn proposal is named as PIPELINE's, not the owner's.
  expect(note(rules, "tau")).toContain("PIPELINE'S PROPOSED DEFAULT")
  // And the note says what an unset tau does to the verdict: Q2 and A3 do not
  // fire, so a run reports its gap instead of grading itself against a guess.
  expect(note(rules, "tau")).toContain("Q2 AND A3 DO NOT FIRE")
})

test("the two hypotheses are labelled as hypotheses, and the owner's values as his", () => {
  // CRITERIA Q4 and Q6: k = 1 and a run length of 3 are starting values to be
  // refined by evidence, not settled numbers - a number used knowingly is a
  // different failure from one used silently (OB3's distinction). Q4 is the
  // owner's, Q6 is inherited from the sibling repository.
  const rules = loadRules()
  expect(note(rules, "yieldFloor")).toContain("HYPOTHESIS")
  expect(note(rules, "signatureRun")).toContain("INHERITED, NOT DERIVED")
  expect(note(rules, "rhoWire")).toContain("[owner]")
  expect(note(rules, "kappaBench")).toContain("[owner]")
})

test("evaluationCap's note claims the provenance CRITERIA gives it, and not the owner's", () => {
  // Q5 IS [model] - CRITERIA section 5's provenance line tags Q1-Q3 and Q5 to
  // COST 6.4 - and section 10 records nothing about it waiting on the owner.
  // An earlier draft of this note called it "the owner's evaluation cap by
  // provenance", which asserts an attribution the authority denies. That is
  // the small version of the failure this whole programme is built around:
  // provenance is the mechanism, and a note claiming the wrong one lets a
  // derived value be treated as a decision, or a decision be "improved" as
  // though it were derived. So the assertion is two-sided - it names what the
  // note must say AND that it must not wear the owner's tag.
  const text = note(loadRules(), "evaluationCap")
  expect(text).toContain("[model]")
  expect(text).not.toContain("[owner]")
  expect(text).toContain("NOT AN OWNER DECISION")
  // What Q5 actually is: a backstop, with the one requirement a backstop has,
  // and a stop on it reported as a failure rather than as a result.
  expect(text).toContain("A BACKSTOP AND NOT A MEASURE")
  expect(text).toContain("REPORTED AS A FAILURE RATHER THAN AS A RESULT")
  // And the value is a labelled derivation whose margin is stated as a choice.
  expect(text).toContain("11.71 ms")
  expect(text).toContain("A CHOICE AND NOT A MEASUREMENT")
})

test("rhoWire's note quotes the owner's instruction verbatim and keeps the corrected argument", () => {
  const text = note(loadRules(), "rhoWire")
  expect(text).toContain('"favor wires over cuts. cuts are harder and more error prone."')
  // The withdrawn proposal of 3 is kept with WHY it was wrong: the
  // invisibility of a missed cut was entered on the cut's side of the ledger,
  // which is a sign error in the argument rather than a difference of weight.
  expect(text).toContain("A SIGN ERROR IN THE ARGUMENT RATHER THAN A DIFFERENCE OF WEIGHT")
  expect(text).toContain("rho_w = 3")
})

test("kappaBench's note carries all three passing hand-laid values and the ratchet", () => {
  // K3's third condition: the previous value and its reason are KEPT rather
  // than overwritten - the union is the record. At schema 1 there is one
  // value, and the note carries the three measured values it was NOT fitted
  // to. ALL THREE are asserted, not an alternation of them: 0.181, 0.196 and
  // 0.269 are three boards that pass `make check`, and a note carrying one of
  // them would let the next reader loosen the bound without seeing the other
  // two - which is the whole reason K2 says to carry them.
  const text = note(loadRules(), "kappaBench")
  expect(text).toContain("0.181")
  expect(text).toContain("0.196")
  expect(text).toContain("0.269")
  expect(text).toContain("THE HARD END OF A RATCHET")
  expect(text).toContain("PREVIOUS VALUES: none.")
  // And the inadmissible reason for moving it, named so it cannot be used.
  expect(text).toContain('"the search did not get there" is NOT an admissible cause')
})

test("worseAcceptance is null in the committed file, and the note says E3 does not run", () => {
  const rules = loadRules()
  expect(rules.worseAcceptance).toBeNull()
  expect(note(rules, "worseAcceptance")).toContain("E3 DOES NOT RUN")
  expect(note(rules, "worseAcceptance")).toContain("NONE IS INVENTED HERE")
})

test("the seed list is a non-empty list of distinct non-negative integers", () => {
  const seeds = loadRules().seeds
  expect(seeds.length).toBeGreaterThan(0)
  expect(seeds).toEqual([0, 1, 2, 3, 4])
  expect(new Set(seeds).size).toBe(seeds.length)
  expect(seeds.every((seed) => Number.isInteger(seed) && seed >= 0)).toBe(true)
})

test("RULES_PATH points at the committed file, so the canonical hash hashes one thing", () => {
  expect(RULES_PATH.endsWith("stripboard/rules.json")).toBe(true)
  expect(path.isAbsolute(RULES_PATH)).toBe(true)
  expect(fs.existsSync(RULES_PATH)).toBe(true)
  // loadRules() with no argument reads exactly that file and nothing else.
  expect(loadRules()).toEqual(loadRules(RULES_PATH))
})

// ---------------------------------------------------------------------------
// The loader's refusals, one at a time
// ---------------------------------------------------------------------------

test("an unknown key is an error naming it, not ignored", () => {
  // MUTATION RUN: with the loader building its result by spreading the parsed
  // object (`{ ...parsed, schema, ... }`) and the rejectUnknown call deleted -
  // the break the plan's Step 5 prescribes - this failed with 'Expected to
  // start with: "rules-unknown-key: \"extra\" is not a stripboard rules
  // parameter." / Received: ""': the fixture loaded cleanly and `extra: 1`
  // arrived in the result untouched. The file-naming test at the bottom of
  // this file failed with it, and nothing else did. Reverted.
  const message = refusalFrom(() => loadRules(fixture({ extra: 1 })))
  expect(message).toStartWith('rules-unknown-key: "extra" is not a stripboard rules parameter.')
  // The refusal lists what schema 1 does name, so the fix is in the message.
  expect(message).toContain("Schema 1 names exactly: schema, rhoWire")
})

test("a missing key is an error naming it, and nothing is defaulted", () => {
  // MUTATION RUN: with `present` returning `undefined` instead of refusing an
  // absent key, this failed with 'Expected to start with: "rules-missing-key:
  // \"tau\" is absent." / Received: "rules-type: \"tau\" must be a number or
  // null, got undefined. null means the floor tolerance is UNSET ..."' - the
  // absence surfaced two clauses later as a type error, which names the key
  // but tells the reader to fix its TYPE. The loop below failed with it, at
  // schema: 'Received: "rules-schema: \"schema\" must be exactly 1, got
  // undefined. ..."'. Reverted.
  const message = refusalFrom(() => loadRules(fixture({ omit: "tau" })))
  expect(message).toStartWith('rules-missing-key: "tau" is absent.')
  expect(message).toContain("It is NOT defaulted")
})

test("every required key is refused by name when it is the one that is missing", () => {
  // The neighbouring-clause trap, closed by driving all twelve: a refusal
  // that named a fixed key, or the first missing key it happened to find,
  // would pass the tau case above and be wrong for the other eleven.
  for (const key of ["schema", ...PARAMETERS]) {
    const message = refusalFrom(() => loadRules(fixture({ omit: key })))
    expect(message, key).toStartWith(`rules-missing-key: "${key}" is absent.`)
  }
})

test("a wrong schema version refuses rather than being read as schema 1", () => {
  // MUTATION RUN: with the version comparison dropped (readSchema returning
  // RULES_SCHEMA for whatever it read), this failed with 'Expected to start
  // with: "rules-schema: \"schema\" must be exactly 1, got 2." / Received:
  // ""' - a schema-2 file loaded as if it were schema 1, which is the silent
  // acceptance the version field exists to prevent. Reverted.
  const message = refusalFrom(() => loadRules(fixture({ schema: 2 })))
  expect(message).toStartWith('rules-schema: "schema" must be exactly 1, got 2.')
  // A string that looks like the version is not the version.
  expect(refusalFrom(() => loadRules(fixture({ schema: "1" })))).toStartWith(
    'rules-schema: "schema" must be exactly 1, got "1".',
  )
})

test("an entry with no note refuses, because a number with no reason cannot be argued with", () => {
  // MUTATION RUN: with the missing-note refusal replaced by
  // `notes[key] = "TODO"` and a console.warn - the break the plan's Step 5
  // prescribes - this failed with 'Expected to start with:
  // "rules-missing-note: \"tau\" has no entry in \"notes\"." / Received: ""'.
  // The run printed 'warning: no note for "tau"' above the failure, which is
  // exactly the shape the rule exists to refuse: the file loaded, the warning
  // scrolled past, and tau carried a placeholder reason. Reverted.
  const message = refusalFrom(() => loadRules(fixture({ dropNote: "tau" })))
  expect(message).toStartWith('rules-missing-note: "tau" has no entry in "notes".')
  expect(message).toContain("a number with no reason cannot be argued with")
  // Each parameter is named when it is the one whose note is gone - the same
  // fixed-key trap as the missing-key case above.
  for (const key of PARAMETERS) {
    expect(refusalFrom(() => loadRules(fixture({ dropNote: key }))), key).toStartWith(
      `rules-missing-note: "${key}" has no entry in "notes".`,
    )
  }
})

test("a blank note is refused as the absence it is, and a non-string note by type", () => {
  // MUTATION RUN: with the blank-note refusal removed, the first assertion
  // failed with 'Expected to start with: "rules-blank-note: the note for
  // \"tau\" is blank," / Received: ""' - a note of "   " loaded as a reason.
  // Reverted.
  //
  // MUTATION RUN: with the note-TYPE check removed instead, the second
  // assertion failed with 'Received: "note.trim is not a function. (In
  // \'note.trim()\', \'note.trim\' is undefined)"' - the blank check ran on a
  // number and threw a TypeError, which refuses by accident and names neither
  // the key nor the mistake. Reverted.
  expect(refusalFrom(() => loadRules(fixture({ setNote: { tau: "   " } })))).toStartWith(
    'rules-blank-note: the note for "tau" is blank,',
  )
  expect(refusalFrom(() => loadRules(fixture({ setNote: { tau: 5 } })))).toStartWith(
    'rules-note-type: the note for "tau" must be a string, got a number.',
  )
})

test("a note for something that is not a parameter refuses, by name", () => {
  // MUTATION RUN: with the unknown-note loop deleted, this failed with
  // 'Expected to start with: "rules-unknown-note: \"notes\" carries an entry
  // for \"kapaBench\", which is not a parameter." / Received: ""'. The
  // fixture's misspelling is the real case: a note renamed on one side only
  // leaves the right reason attached to no number and the number unexplained.
  // Reverted.
  const message = refusalFrom(() => loadRules(fixture({ setNote: { kapaBench: "a typo" } })))
  expect(message).toStartWith(
    'rules-unknown-note: "notes" carries an entry for "kapaBench", which is not a parameter.',
  )
})

test("notes that are not an object refuse before any note is read", () => {
  // MUTATION RUN: with readNotes's isRecord check deleted, this failed with
  // 'Received: "rules-unknown-note: \"notes\" carries an entry for \"0\",
  // which is not a parameter. ..."' - Object.keys over a string yields its
  // indices, so the refusal that fired was about a note called "0". It
  // refuses, and it sends the reader looking for a renamed parameter.
  // Reverted.
  expect(refusalFrom(() => loadRules(fixture({ notes: "see the design doc" })))).toStartWith(
    'rules-notes-type: "notes" must be a JSON object, got a string.',
  )
})

test("worseAcceptance accepts a number and null, and refuses every other spelling of off", () => {
  // MUTATION RUN: with readNullableNumber skipping checkRange (returning the
  // number as read), the negative case failed with 'Expected to start with:
  // "rules-range: \"worseAcceptance\" must be greater than 0, got -1." /
  // Received: ""' - a bound of -1 loaded, which would have E3 accepting a
  // candidate for being worse. Reverted.
  expect(loadRules(fixture({ worseAcceptance: 2 })).worseAcceptance).toBe(2)
  expect(loadRules().worseAcceptance).toBeNull()
  expect(refusalFrom(() => loadRules(fixture({ worseAcceptance: -1 })))).toStartWith(
    'rules-range: "worseAcceptance" must be greater than 0, got -1.',
  )
  // 0 is refused rather than read as off: that state is spelled null, and two
  // spellings of one state is the ambiguity the file exists to prevent.
  expect(refusalFrom(() => loadRules(fixture({ worseAcceptance: 0 })))).toStartWith(
    'rules-range: "worseAcceptance" must be greater than 0, got 0.',
  )
  expect(refusalFrom(() => loadRules(fixture({ worseAcceptance: "off" })))).toStartWith(
    'rules-type: "worseAcceptance" must be a number or null, got a string.',
  )
})

test("tau accepts a number when one is configured, and refuses a vacuous or impossible one", () => {
  // Setting tau is a deliberate edit under K3's ratchet, so the loader has to
  // accept one - the committed file being null is a decision, not a limit of
  // the loader.
  expect(loadRules(fixture({ tau: 0.05 })).tau).toBe(0.05)
  expect(refusalFrom(() => loadRules(fixture({ tau: 0 })))).toStartWith(
    'rules-range: "tau" must be greater than 0, got 0.',
  )
  expect(refusalFrom(() => loadRules(fixture({ tau: 1.5 })))).toStartWith(
    'rules-range: "tau" must be at most 1, got 1.5.',
  )
  expect(refusalFrom(() => loadRules(fixture({ tau: "tight" })))).toStartWith(
    'rules-type: "tau" must be a number or null, got a string.',
  )
})

test("a non-nullable parameter refuses null, which is not a way of leaving it out", () => {
  // MUTATION RUN: with readNumber delegating to readNullableNumber, this
  // failed with 'Expected to start with: "rules-type: \"rhoWire\" must be a
  // number, got null." / Received: ""' - rhoWire loaded as null and the
  // objective would have multiplied by it. The table test below failed with
  // it and showed a second fault that mutation found rather than this test:
  // 'Received: "rules-type: \"rhoWire\" must be a number or null, got a
  // string. undefined; any other ..."', the hole being NULLABLE having no
  // entry for a non-nullable key. That is now a COMPILE error - NULLABLE is
  // keyed by the two-member NullableParameter union - and `bun run typecheck`
  // refuses this mutation, while `bun test`, which does not typecheck, still
  // runs it. Reverted.
  //
  // MUTATION RUN: with readSeeds's array check deleted, the second assertion
  // failed with 'Received: "null is not an object (evaluating
  // \'value.length\')"' - a TypeError from the next line down, which is a
  // refusal nobody wrote and which names neither the key nor the file.
  // Reverted.
  expect(refusalFrom(() => loadRules(fixture({ rhoWire: null })))).toStartWith(
    'rules-type: "rhoWire" must be a number, got null.',
  )
  expect(refusalFrom(() => loadRules(fixture({ seeds: null })))).toStartWith(
    'rules-type: "seeds" must be an array of numbers, got null.',
  )
})

test("each weight and bound refuses the value that would make its criterion vacuous", () => {
  // MUTATION RUN: with `value < spec.min` changed to `value < 0`, four TESTS
  // failed - this one, the worseAcceptance and tau cases, and the why-message
  // test below - and this one failed on its first case: 'error: rhoWire = 0 /
  // Expected to start with: "rules-range: \"rhoWire\" must be greater than 0,
  // got 0." / Received: ""'. With the `spec.max` check deleted instead, this
  // failed on 'error: kappaBench = 1.5' and the tau case on its 1.5, both
  // with 'Received: ""'. Reverted both.
  const cases: ReadonlyArray<readonly [string, unknown, string]> = [
    ["rhoWire", 0, 'rules-range: "rhoWire" must be greater than 0, got 0.'],
    ["rhoSolder", -1, 'rules-range: "rhoSolder" must be greater than 0, got -1.'],
    ["kappaBench", 0, 'rules-range: "kappaBench" must be greater than 0, got 0.'],
    ["kappaBench", 1.5, 'rules-range: "kappaBench" must be at most 1, got 1.5.'],
    ["yieldFloor", 0, 'rules-range: "yieldFloor" must be greater than 0, got 0.'],
    ["evaluationCap", 0, 'rules-range: "evaluationCap" must be at least 1, got 0.'],
    ["evaluationCap", 2.5, 'rules-range: "evaluationCap" must be a whole number, got 2.5.'],
    ["signatureRun", 1, 'rules-range: "signatureRun" must be at least 2, got 1.'],
    ["stockRows", 0, 'rules-range: "stockRows" must be at least 1, got 0.'],
    ["stockCols", 26.5, 'rules-range: "stockCols" must be a whole number, got 26.5.'],
    ["rhoWire", "a quarter", 'rules-type: "rhoWire" must be a number, got a string.'],
  ]
  for (const [key, value, expected] of cases) {
    const message = refusalFrom(() => loadRules(fixture({ [key]: value })))
    expect(message, `${key} = ${String(value)}`).toStartWith(expected)
  }
})

test("every range refusal says what the bound is protecting, not only that it failed", () => {
  // A refusal that names a limit and not its reason is the one the next
  // person widens, so the `why` is part of the message and is asserted.
  expect(refusalFrom(() => loadRules(fixture({ kappaBench: 0 })))).toContain(
    "a bound of 0 would refuse a layout AT THE FLOOR",
  )
  expect(refusalFrom(() => loadRules(fixture({ signatureRun: 1 })))).toContain(
    "Q6 stops on a REPEATED failure",
  )
})

test("the seed list refuses empty, repeated, negative and fractional entries, each by name", () => {
  // MUTATION RUN: with the `seen.has` branch deleted, the repeated-seed case
  // failed with 'Expected to start with: "rules-seeds-not-distinct:
  // \"seeds\" must be distinct and 1 appears twice." / Received: ""' - the
  // list loaded and one ordering would have been climbed twice while reading
  // as two restarts. With the length check deleted, the empty case failed the
  // same way. With `|| !Number.isInteger(entry)` dropped from the entry
  // check, the 1.5 case failed with 'Expected to start with:
  // "rules-seeds-entry: \"seeds\" must hold whole numbers, got a number
  // (1.5)." / Received: ""'; with the `entry < 0` branch deleted, the -2 case
  // failed the same way. Reverted all four.
  expect(refusalFrom(() => loadRules(fixture({ seeds: [] })))).toStartWith(
    'rules-seeds-empty: "seeds" must list at least one seed.',
  )
  expect(refusalFrom(() => loadRules(fixture({ seeds: [1, 1] })))).toStartWith(
    'rules-seeds-not-distinct: "seeds" must be distinct and 1 appears twice.',
  )
  expect(refusalFrom(() => loadRules(fixture({ seeds: [0, -2] })))).toStartWith(
    'rules-seeds-entry: "seeds" must hold non-negative numbers, got -2.',
  )
  expect(refusalFrom(() => loadRules(fixture({ seeds: [0, 1.5] })))).toStartWith(
    'rules-seeds-entry: "seeds" must hold whole numbers, got a number (1.5).',
  )
  expect(refusalFrom(() => loadRules(fixture({ seeds: ["0"] })))).toStartWith(
    'rules-seeds-entry: "seeds" must hold whole numbers, got a string (0).',
  )
})

test("a file that is not there, not JSON, or not an object refuses in three different ways", () => {
  // MUTATION RUN: all three faults were driven separately, and all three
  // collapse into the SAME wrong refusal when their clause goes - 'Received:
  // "rules-missing-key: \"schema\" is absent. It is NOT defaulted: ..."'.
  // With the read falling back to "{}" for a missing file, with the JSON
  // parse error setting `parsed = {}`, and with the top-level isRecord check
  // deleted, the loader each time reported a rules file that was there and
  // was missing a parameter. Which is why these are three refusals and not
  // one: "there is no rules file" and "the rules file is missing tau" send
  // the reader to different places. Reverted all three.
  const missing = path.join(os.tmpdir(), "stripboard-rules-nothing-here", "rules.json")
  expect(refusalFrom(() => loadRules(missing))).toStartWith(
    "rules-unreadable: the stripboard rules file could not be read:",
  )

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stripboard-rules-bad-"))
  const notJson = path.join(dir, "rules.json")
  fs.writeFileSync(notJson, "{ schema: 1, ")
  expect(refusalFrom(() => loadRules(notJson))).toStartWith(
    "rules-not-json: the stripboard rules file is not valid JSON:",
  )

  const anArray = path.join(dir, "array.json")
  fs.writeFileSync(anArray, "[1, 2, 3]")
  expect(refusalFrom(() => loadRules(anArray))).toStartWith(
    "rules-not-an-object: the stripboard rules file must hold a JSON object at the top level, " +
      "got an array.",
  )
})

test("every refusal names the file it refused, because a fixture and the committed file look alike", () => {
  const file = fixture({ extra: 1 })
  expect(refusalFrom(() => loadRules(file))).toContain(file)
})
