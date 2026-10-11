/**
 * What the scorer's tests are checked AGAINST: the hand-counted dump, the
 * targets it is graded by, and the committed fixtures' paths.
 *
 * ITS OWN MODULE for the reason `./targets-oracle.ts` and `./rules-fixtures.ts`
 * are: the scorer's tests are one file per check - `score-objective`,
 * `score-counts`, `score-identity` and `score-floor` - and all four need the
 * same fixture. A copy in each would be four fixtures that could drift, which
 * for a dump whose every count is load-bearing is the one duplication that
 * would quietly invalidate the arithmetic. Nothing here imports
 * `tools/stripboard/score.ts`; that is the point.
 *
 * HOW EVERY EXPECTATION IN THOSE FOUR FILES IS DERIVED INDEPENDENTLY OF THE
 * CODE, which for a three-term sum is the whole difficulty:
 * `expect(score.objective).toBeCloseTo(cuts + rules.rhoWire * wires +
 * rules.rhoSolder * solder)` evaluates the expression `objectiveOf` evaluates
 * and passes however wrong both are. It LOOKS like a derivation. It is not,
 * and Task 11's review caught the same shape in
 * `expect(floor).toBe(Math.max(0, n - r))`.
 *
 * So every figure comes from one of four places, named at its assertion, and
 * no fifth:
 *
 * 1. **A hand-counted fixture** - `TEXT` below, whose one `CUT`, one `WIRE`
 *    and one `SOLDER` line are visible in the literal, and whose `F` is
 *    written as the single number the arithmetic comes to rather than as the
 *    sum.
 * 2. **COST's recorded tables** - §1.6's per-board `C`, `N`, `S_occ` and `J`,
 *    §2.2's wire and solder columns, §5's κ fractions - carried in
 *    `./targets-oracle.ts` with their provenance, and the objective hand-added
 *    from them.
 * 3. **The committed fixture dumps, counted with a different spelling** -
 *    `grepCount` below, which is not how `countLines` reads them.
 * 4. **The identity run backwards**: `C`, `N` and `S_occ` are read off a dump
 *    and `J` is checked against COST's own derived figure.
 *
 * REFUSALS ANCHOR ON THEIR OPENING CLAUSE with `toStartWith`, and each was
 * driven by breaking the clause that raises it, running all four files, and
 * copying the REAL output into the comment beside the assertion. Where a
 * mutation comment counts failures, the count is over the four files run
 * together - `bun test tests/stripboard/score-*.test.ts` - because that is
 * what was run.
 */
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { deriveTargets, type BoardTargets } from "../../tools/stripboard/targets.ts"

export const FROZEN_DUMP = "tests/fixtures/stripboard/pultec-low-boost-frozen.dump"
export const PT2399_DUMP = "tests/fixtures/stripboard/pt2399-core.dump"

/**
 * The hand-counted fixture. Three by four holes, horizontal strips, with
 * exactly one of each costed line so every term of `F` is exercised and every
 * count is visible in the text:
 *
 * - `C = 1` (one `CUT` line), `W = 1` (one `WIRE`), `B = 1` (one `SOLDER`).
 * - `N = 2` (two `NODE` lines), `P = 4` (four `PIN` lines).
 * - `S_occ = 2`: the four pins sit on rows 0 and 2, and the strip axis is
 *   rows because `VERTICAL_STRIPS` is 0.
 * - so `J = C - N + S_occ = 1 - 2 + 2 = 1` and `κ = J/(P - N) = 1/2`,
 *   and `F = 1 + 0.25 + 1 = 2.25` at the committed weights.
 */
export const TEXT = [
  "GRID 3 4", "VERO_TRACKS 1", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PIN R1 1 AT 0,0", "PIN R1 2 AT 2,0",
  "PART R2 RESISTOR4 2k AT 0,1 SPAN 1",
  "PIN R2 1 AT 0,1", "PIN R2 2 AT 2,1",
  "WIRE w1 AT 0,3 ENDS 0,3,3,30 2,3,5,30",
  "SOLDER 0,2 1,2",
  "CUT 0,1,1 0,2,2",
  "NODE 1 NAME a R1.1 R2.1", "NODE 2 NAME b R1.2 R2.2",
].join("\n")

/**
 * What the fixture is graded against. The scorer reads only `board` and
 * `cutFloor` from this - see the module comment in `score.ts` - and the
 * `netCount`/`pinCount` here are set to the dump's own 2 and 4 so the fixture
 * states nothing false. `score-identity.test.ts` proves they are not what is
 * read by changing them to numbers the dump contradicts.
 */
export const FIXTURE_TARGETS: BoardTargets = {
  board: "fixture",
  netCount: 2,
  pinCount: 4,
  strips: 3,
  cutFloor: 0,
  netGraph: { nets: ["a", "b"], edges: [["a", "b"]], maxDegree: 1, bandwidthLowerBound: 1 },
  ordering: ["a", "b"],
  orderingBandwidth: 1,
}

/** The fixture with seven more nets declared and nothing else changed: `J = 1 - 9 + 2`. */
export const NINE_NETS = [
  TEXT,
  "NODE 3 NAME c", "NODE 4 NAME d", "NODE 5 NAME e", "NODE 6 NAME f",
  "NODE 7 NAME g", "NODE 8 NAME h", "NODE 9 NAME i",
].join("\n")

/** `grep -c '^<keyword> '` over raw text: a third spelling of the count. */
export function grepCount(text: string, prefix: string): number {
  return text.split("\n").filter((line) => line.startsWith(prefix)).length
}

/** low-boost's targets, as P0 derives them from the model and HC6's stock. */
export function lowBoostTargets(): BoardTargets {
  return deriveTargets(physicalBoard("low-boost"), loadRules().stockRows, "pultec-low-boost")
}
