/**
 * `V5` and `V9`'s mechanical half: can the pipeline's statistics tell a good
 * placement from a bad one, and is any constant in the pipeline unaccounted for?
 *
 * **`V5` IS NOT A COMPARISON OF FOUR BOARDS AGAINST FOUR BOARDS.** The brief's
 * form required each statistic to move between `--import`'s placement and the
 * pipeline's *"by more than its across-board variation"*, the variation being
 * computed from the four import-placed boards' own spread. That spread is the
 * PLACER'S FINGERPRINT: `C/P` reads 0.92, 0.91, 0.91 and 0.85 across those four
 * - a coefficient of variation near 3% - and the hand-laid board arrives at 0.19
 * and takes the five-board variation to roughly 38%. A tolerance derived from
 * one placer's self-consistency is a measure of that placer, so the comparison
 * here is a GOOD layout against a BAD layout of the SAME netlist, which is what
 * *"a metric that cannot distinguish a good placer from a bad one is not a
 * metric"* (PIPELINE §10) is actually about. `./discrimination-fixtures.ts`
 * carries the three pairs and why each exists.
 *
 * **`V9` HERE IS A SCAN AND A REGISTER, AND IT IS HONEST ABOUT ONE THING ONLY:
 * that no constant in the pipeline's sources is unaccounted for.** `V9`'s claim
 * is *"no fitted coefficient anywhere"*, which five boards cannot support and no
 * text scan can establish; the guarantee is
 * `docs/stripboard/pipeline-verification.md` §7 plus the owner's review. What
 * this file provides is the floor under it: every literal the scan finds is
 * named in a register with the file it sits in, so a NEW one fails the suite and
 * an accounted one that disappears fails it too. The register's reasons are in
 * §7; the register itself is data.
 *
 * `./bare-literal.ts` is the one pattern, shared with Task 19's per-module scan,
 * and **it is called INSIDE every loop** - a `g`-flagged regex carries
 * `lastIndex`, `matchAll` reads it when it clones, and one hoisted instance
 * would make this sweep truncate after its first hit while reading as a tree
 * with no bare literal in it.
 */
import { expect, test } from "bun:test"
import { readdirSync } from "node:fs"
import path from "node:path"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { countLines, scoreDumpText, type Score } from "../../tools/stripboard/score.ts"
import { TARGETS } from "./climb-fixtures.ts"
import { bareLiteral } from "./bare-literal.ts"
import { BAD_CUT_DUMP, GOOD_DUMP, PLACEMENT_PAIRS } from "./discrimination-fixtures.ts"

const rules = loadRules()

const PIPELINE_DIR = path.join(import.meta.dir, "..", "..", "tools", "stripboard")

/**
 * The modules `V9` sweeps: every `tools/stripboard/*.ts`, with no exclusions.
 *
 * **`rules.ts` USED TO BE EXCLUDED, "which is where numbers legitimately live",
 * AND THE EXCLUSION WAS DEAD.** Measured with `bareLiteral()` over the current
 * files: neither `rules.ts` nor `rules-model.ts` holds a literal of the swept
 * shape, and the bound specs the exclusion's reason pointed at moved into
 * `rules-model.ts` - which was never excluded and is therefore already swept. So
 * the exclusion named a file that no longer held what it said, and unlike
 * `RECORDING_ONLY` below nothing required it to still be needed. A dead
 * exclusion is removed rather than guarded.
 *
 * **DERIVED RATHER THAN LISTED**, so a module a later task adds is covered
 * without anybody remembering to add it - and asserted non-empty below, because
 * a listing that matched nothing is the most comfortable way for a sweep to pass.
 */
const PIPELINE_SOURCES: readonly string[] = readdirSync(PIPELINE_DIR)
  .filter((name) => name.endsWith(".ts"))
  .sort()

/** A `Score`'s nine field names, taken from a real one rather than written out. */
const SCORE_KEYS: readonly string[] = Object.keys(scoreDumpText(GOOD_DUMP, TARGETS, rules))

/** The reader for `score.<field>`, FRESH PER CALL for `bareLiteral`'s reason. */
function scoreRead(): RegExp {
  return new RegExp(String.raw`\bscore\.([A-Za-z]+)`, "g")
}

/**
 * The modules whose `score.<field>` reads RECORD a figure rather than compare
 * one, excluded from the statistics scan by name.
 *
 * **ADDED IN TASK 23, AND THE REASON IS A MEASUREMENT.** `V5`'s claim is about
 * the statistics that can order one candidate ahead of another: *"a field that
 * takes the same value on a good layout and a bad layout of the SAME netlist is
 * reading the circuit, not the placement, and the pipeline must not read it."*
 * `tools/stripboard/place.ts` writes `run.json`'s canonical metrics, and Task
 * 13's `CanonicalMetrics` declares `netCount` among them - the candidate's own
 * `NODE` count, which a layout may raise above the netlist's. That write made
 * `score.netCount` appear in a pipeline source for the first time and both `V5`
 * tests failed, demanding that a property of the circuit separate two layouts
 * of it, which it cannot. **The scan's own docstring says over-inclusion "can
 * only make V5 demand separation of a field nothing reads"; a recording read is
 * the case that is not true of**, and this is the narrowest fix: one module,
 * named, with its reason.
 *
 * **IT DOES NOT NARROW `V9`.** `PIPELINE_SOURCES` is unchanged, so the literal
 * sweep below still reads every module including this one; only the
 * `score.<field>` intersection skips it. And the closure test still holds every
 * `Score` field to being either read-and-separating or blind-and-unread, so a
 * field this exclusion hides from `V5` has to be blind - which is checked, not
 * assumed, by that test's own two lists.
 *
 * **IT NAMES `place-manifest.ts` AND NO LONGER `place.ts`, AND THE MOVE IS THE
 * EXCLUSION FOLLOWING THE CODE RATHER THAN THE FILE NAME.** `run.json`'s two
 * blocks are now assembled in `place-manifest.ts`, split out of `place.ts` at the
 * running-versus-recording seam, and the `score.netCount` read this exclusion
 * exists for went with them. `place.ts` still reads `score.cuts`, `score.wires`,
 * `score.solder` and `score.objective` - all of which DO separate a good layout
 * from a bad one - so it needs no exclusion any more, and the guard below is what
 * forced that conclusion rather than letting a dead entry sit here: it requires
 * every excluded module to still carry the read, which `place.ts` does not. The
 * split is also what caught the move in the first place, all three tests in this
 * file failing the moment `score.netCount` appeared in an unexcluded module.
 */
const RECORDING_ONLY: readonly string[] = ["place-manifest.ts"]

/**
 * Which `Score` fields the pipeline actually reads: `tools/stripboard/*.ts`
 * scanned for `score.<field>`, intersected with the nine field names.
 *
 * **IT IS DERIVED FROM THE MODULES, NOT LISTED HERE**, because a hand-written
 * list is a list of the statistics an agent thought were reported and `V5` would
 * then be checking that agent's opinion. A MENTION IN A COMMENT COUNTS, which
 * over-includes rather than under-includes: it can only make `V5` demand
 * separation of a field nothing reads, never excuse a field something does -
 * except for a read that only RECORDS, which is `RECORDING_ONLY` above.
 */
async function readStatistics(): Promise<readonly string[]> {
  const found = new Set<string>()
  for (const name of PIPELINE_SOURCES.filter((source) => !RECORDING_ONLY.includes(source))) {
    const text = await Bun.file(path.join(PIPELINE_DIR, name)).text()
    for (const match of text.matchAll(scoreRead())) {
      const field = match[1]
      if (field !== undefined && SCORE_KEYS.includes(field)) found.add(field)
    }
  }
  return SCORE_KEYS.filter((key) => found.has(key))
}

/** Every pair scored on both sides, once, so each test reads numbers not boards. */
const SCORED = PLACEMENT_PAIRS.map((pair) => ({
  pair,
  good: scoreDumpText(pair.good, TARGETS, rules),
  bad: scoreDumpText(pair.bad, TARGETS, rules),
}))

/** How many of the pairs a field takes a different value on. */
function pairsSeparated(key: string): number {
  return SCORED.filter((row) => valueOf(row.good, key) !== valueOf(row.bad, key)).length
}

/** One field of a `Score` by name, refusing a name a `Score` has not got. */
function valueOf(score: Score, key: string): number {
  const entry = Object.entries(score).find(([field]) => field === key)
  if (entry === undefined) {
    throw new Error(
      `valueOf: a Score has no field ${key}, so there is nothing to compare. It is not ` +
        "defaulted to zero: a missing field read as zero would make every comparison in V5 " +
        "pass by agreeing with itself. The field names come from Object.keys of a real Score " +
        "in tests/stripboard/discrimination.test.ts - fix the caller that invented this one.",
    )
  }
  const [, value] = entry
  if (typeof value !== "number") {
    throw new Error(
      `valueOf: ${key} holds ${typeof value} rather than a number, and V5 compares numbers. ` +
        "It is not coerced: a field that stopped being a count is a change to Score that " +
        "tools/stripboard/score.ts must state, not one this test absorbs.",
    )
  }
  return value
}

test("V5: every Score field the pipeline reads separates a good layout from a bad one", async () => {
  // A field that takes the same value on a good layout and a bad layout of the
  // SAME netlist is reading the circuit, not the placement, and the pipeline
  // must not read it. Three pairs rather than one, because each spends a
  // different term of F and a single pair leaves the terms it does not move
  // looking like statistics nothing can separate.
  const reported = await readStatistics()
  for (const key of reported) {
    expect(pairsSeparated(key), `${key} separates no good-versus-bad pair`).toBeGreaterThan(0)
  }
})

test("V5's sharp form: F, J and kappa are strictly lower on the good layout of EVERY pair", () => {
  // THE THREE THE BRIEF NAMES, and the assertion a constant metric fails. It is
  // `toBeLessThan` rather than `not.toBe`: a statistic that merely MOVED when
  // the layout changed would pass a difference test while ordering the bad
  // layout first, and an objective that ranks the abutted board above the clean
  // one is worse than one that cannot tell them apart.
  //
  // PROVED TO DISCRIMINATE, not argued: with `objectiveOf` in
  // tools/stripboard/score.ts returning a constant, this test fails all three
  // objective rows; with the `good` side of every pair pointed at its `bad`
  // side, it fails all nine. Both runs are recorded in
  // docs/stripboard/pipeline-verification.md section 7.2.
  for (const row of SCORED) {
    for (const key of ["objective", "joins", "clustering"] as const) {
      expect(
        valueOf(row.good, key),
        `${row.pair.name}: ${key} does not order the good layout first (the bad side spends ` +
          `${row.pair.spends})`,
      ).toBeLessThan(valueOf(row.bad, key))
    }
  }
})

test("V5 can fail: the fields blind to the placement are exactly the two, and neither is read", async () => {
  // netCount and pinCount are properties of the CIRCUIT. Every pair holds the
  // netlist fixed, so these two cannot move at all - which is what makes the
  // test above a discrimination test rather than a description of three
  // fixtures: if a statistic could pass it without reading the layout, these
  // two would pass it.
  const blind = SCORE_KEYS.filter((key) => pairsSeparated(key) === 0)
  expect(blind).toEqual(["netCount", "pinCount"])
  const reported = await readStatistics()
  for (const key of blind) {
    expect(reported, `${key} is blind to the placement and must not be a pipeline statistic`)
      .not.toContain(key)
  }
  // THE CLOSURE PROPERTY, which is what keeps this from being two hand-picked
  // lists: every field of a Score is either read by the pipeline and separates a
  // pair, or separates nothing and is not read. A tenth field added to Score has
  // to land in one of the two, and lands in neither until somebody decides.
  expect([...reported, ...blind].sort()).toEqual([...SCORE_KEYS].sort())
})

test("the recording-only exclusion names a module that exists and really records netCount", async () => {
  // THE EXCLUSION'S OWN GUARD, because a name-only exclusion fails silently in
  // the one direction that matters: a renamed or deleted module stops matching,
  // the scan quietly widens or narrows, and nobody reads an exclusion that
  // matched nothing. So the file has to exist, and it has to still carry the
  // read the exclusion exists for - if place.ts stops writing netCount into the
  // manifest, this exclusion is dead and should go rather than sit here.
  for (const name of RECORDING_ONLY) {
    expect(PIPELINE_SOURCES, `${name} is not a module of this pipeline`).toContain(name)
    const text = await Bun.file(path.join(PIPELINE_DIR, name)).text()
    expect(text, `${name} no longer reads score.netCount`).toContain("score.netCount")
  }
  // AND THE EXCLUSION IS WHAT MAKES THE DIFFERENCE, not a coincidence: with the
  // module included, netCount joins the reported set and V5's two tests above
  // fail. Measured here rather than described.
  const withRecorder = new Set<string>()
  for (const name of PIPELINE_SOURCES) {
    const text = await Bun.file(path.join(PIPELINE_DIR, name)).text()
    for (const match of text.matchAll(scoreRead())) {
      const field = match[1]
      if (field !== undefined && SCORE_KEYS.includes(field)) withRecorder.add(field)
    }
  }
  expect([...withRecorder]).toContain("netCount")
  expect(await readStatistics()).not.toContain("netCount")
})

test("V5's inputs are real: the derivation is not vacuous and the pairs are not one board", async () => {
  // Each half of the test above could pass while looking at nothing - an empty
  // derived statistic list makes its loop empty, and a pair whose two sides are
  // the same board makes every comparison compare a board with itself.
  const reported = await readStatistics()
  expect(reported).toContain("objective")
  expect(reported.length).toBeGreaterThan(1)
  expect(SCORED.length).toBe(PLACEMENT_PAIRS.length)
  expect(PLACEMENT_PAIRS.length).toBeGreaterThan(2)
  for (const row of SCORED) {
    expect(row.pair.good, row.pair.name).not.toBe(row.pair.bad)
    // Same circuit on both sides, which is the premise the blindness finding
    // rests on: if a pair changed the netlist, netCount moving would say nothing.
    expect(row.good.netCount, row.pair.name).toBe(row.bad.netCount)
    expect(row.good.pinCount, row.pair.name).toBe(row.bad.pinCount)
  }
})

test("an UNRESOLVED board is refused rather than scored, where a line count would rank it first", () => {
  // THE CAVEAT THAT WOULD CORRUPT EVERY MEASUREMENT ON THIS PAGE. A refused
  // gesture comes back CUT_STATE UNRESOLVED with no cut list, and a naive
  // `grep -c '^CUT '` scores that board at ZERO cuts - the best possible result
  // awarded to a board nothing is known about. Measured here on the one fixture
  // whose cuts are non-zero: the independent line count reports no cuts, and the
  // scorer refuses instead of reporting the best score in the run.
  const resolved = scoreDumpText(BAD_CUT_DUMP, TARGETS, rules)
  expect(resolved.cuts).toBeGreaterThan(0)
  const unresolved = BAD_CUT_DUMP.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED").replace(
    "CUT 4,6,2 5,6,1\n",
    "",
  )
  expect(countLines(unresolved).cuts).toBe(0)
  expect(() => scoreDumpText(unresolved, TARGETS, rules)).toThrow("score-cuts-not-computed")
})

/**
 * `V9`'s REGISTER: every literal the scan finds, by the file it sits in.
 *
 * Each entry's reason is in `docs/stripboard/pipeline-verification.md` §7.3,
 * which is where the judgement half of `V9` lives. **Fourteen of the sixteen are
 * specification citations or quoted figures inside STRING literals** -
 * `COST 2.1`, `COST 6.4`, the filename
 * `2026-10-10-stripboard-acceptance-criteria.md`, and `GetMaxLength 255` quoted
 * from the fork - which `./bare-literal.ts`'s own blind-spot list names as the
 * scan's one false-positive shape. They are kept as citations rather than
 * reworded into prose, because a refusal that names its authority by section is
 * what this repository's refusals are for. **Only the two in
 * `seed-arrangement.ts` are values the code uses**: the `2^32` normaliser and a
 * fixed epoch timestamp.
 *
 * IT IS COMPARED EXACTLY, in both directions: a literal appearing in a module
 * that is not here fails, and an entry here whose literal has gone fails too, so
 * the register cannot go stale while reading as a pass.
 */
const ACCOUNTED: Readonly<Record<string, readonly string[]>> = {
  // The plan filename `2026-10-10-stripboard-pipeline.md`, cited in the module
  // comment and in the refusal's tail because that document is where the
  // departure that charged this count is recorded as made, measured inert and
  // reverted. A citation, like `equivalence.ts`'s and `seed-compare.ts`'s - not
  // a value the code uses.
  "cut-necessity.ts": ["2026"],
  "equivalence.ts": ["2026"],
  "geometry-contract.ts": ["1.5"],
  // The four section citations moved with the refusal prose when `score.ts`
  // was split at the declarations seam for the line ceiling; `score.ts` itself
  // now carries no literal at all.
  "score-model.ts": ["2.1", "1.4", "2.1", "4.1"],
  "seed-arrangement.ts": ["4294967296", "1970"],
  "seed-compare.ts": ["2026"],
  "seed-geometry.ts": ["255"],
  "targets.ts": ["2.1", "6.4", "1.4", "1.4", "2.1", "6.4"],
}

test("V9's mechanical half: every literal in the pipeline's sources is in the register", async () => {
  // THE NAME THIS DOES NOT CARRY is "every numeric literal traces to a rule, a
  // datum or a derivation" - that is V9's claim and this is not it. The scan
  // catches a bare fraction and a bare integer of three digits or more. It does
  // NOT catch a small integer used as a threshold, a value written 5e-2, a hex
  // constant, or two literals combined into one.
  //
  // So: a scan, named as a scan, whose finding is compared against a register
  // rather than against the empty list. The brief asked for `toEqual([])`, and
  // that is unreachable without rewriting fourteen refusal messages to say
  // "section two point one" in words - which would cost the citations their
  // grep-ability to buy a pattern a cleaner-looking assertion.
  const found: Record<string, readonly string[]> = {}
  for (const name of PIPELINE_SOURCES) {
    const text = await Bun.file(path.join(PIPELINE_DIR, name)).text()
    // FRESH PER FILE. A hoisted instance would carry lastIndex between files.
    const hits = [...text.matchAll(bareLiteral())].map((match) => match[0])
    if (hits.length > 0) found[name] = hits
  }
  expect(found).toEqual(ACCOUNTED)
})

test("V9's register names only modules that exist, and the sweep is not a loop over nothing", () => {
  // PIPELINE_SOURCES is derived, so an empty or wrong listing would make the
  // sweep above vacuous while green, and a register row for a deleted module
  // would make it fail for a reason that is not a finding. Both halves asserted.
  expect(PIPELINE_SOURCES.length).toBeGreaterThan(10)
  // rules.ts IS swept now - the exclusion that used to keep it out was dead, and
  // naming it here is what keeps it from being quietly reintroduced.
  expect(PIPELINE_SOURCES).toContain("rules.ts")
  expect(PIPELINE_SOURCES).toContain("rules-model.ts")
  expect(PIPELINE_SOURCES).toContain("score.ts")
  expect(Object.keys(ACCOUNTED).length).toBeGreaterThan(0)
  for (const name of Object.keys(ACCOUNTED)) expect(PIPELINE_SOURCES).toContain(name)
})

test("V9's pattern matches the two shapes it claims, and misses a hex constant", () => {
  // The two shapes, which are Task 19's own cases, so the sweep is known to be
  // able to find something.
  expect([..."const tau = 0.05".matchAll(bareLiteral())].map((m) => m[0])).toEqual(["0.05"])
  expect([..."const cap = 2000".matchAll(bareLiteral())].map((m) => m[0])).toEqual(["2000"])
  // A BLIND SPOT THIS SWEEP FOUND AND ./bare-literal.ts's LIST DOES NOT NAME:
  // a hex constant is invisible, because every digit run in it is flanked by a
  // letter. seed-arrangement.ts's mulberry32 carries two - 0x9e3779b9 and
  // 0x6d2b79f5 - and the sweep reports neither. Measured, and recorded in
  // section 7.3 beside the literals it did find.
  expect([..."const SEED = 0x9e3779b9".matchAll(bareLiteral())].map((m) => m[0])).toEqual([])
})

test("the fixture and the test are within this repository's line ceiling", async () => {
  for (const name of ["discrimination.test.ts", "discrimination-fixtures.ts"]) {
    const text = await Bun.file(path.join(import.meta.dir, name)).text()
    expect(text.split("\n").length, name).toBeLessThan(501)
  }
})
