/**
 * The three starting arms, the selector, the stream and the two derivations.
 *
 * `SEED_ARMS` enumerates `SeedArm` completely - three entries, one per member of
 * the union - in a way that would catch the enumeration drifting from the union
 * rather than comparing the array to a copy of itself (CONTROLLER RULING 1,
 * 2026-10-10 stripboard-pipeline Task 13). Typing each literal below `: SeedArm`
 * is what makes that a real check: `"constructed"` fails to compile if the union
 * ever drops that member, and a fourth member added to the union without a
 * fourth literal here is caught by the length assertion instead.
 *
 * THREE TESTS BELOW CARRY A GUARANTEE WEAKER THAN THE PROPERTY THEY ARE ABOUT
 * AND SAY SO IN THEIR OWN COMMENTS: the no-default-arm test proves the
 * selector's half and not the type's; the draw test proves the index map and not
 * the stream's uniformity; and the grid-does-not-grow test's first assertion
 * reads a SIMULATED second board (`./seed-fixtures.ts`'s `dumpOf`), so what has
 * teeth there is the in-bounds assertion over the recorded `--to` values.
 *
 * TWO DEVIATIONS FROM THE BRIEF'S OWN TEST TEXT, both measured and both
 * recorded in `.superpowers/sdd/2026-10-10-stripboard-pipeline/task-16-report.md`:
 * the strip-assignment test cannot assert the assignment equals
 * `targets.ordering` (the junction's five nets are consecutive in that ordering
 * on hi-boost ALONE), and the bandwidth test measures the ASSIGNMENT's bandwidth
 * as well, because the brief's own body only read `targets.orderingBandwidth` -
 * a figure `assignStrips` has no part in, so no mutation of `assignStrips` could
 * ever have failed it.
 */
import { test, expect } from "bun:test"
import { TOOL_MAX_SPAN_HOLES } from "../../lib/kicad/lead-span-model.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import {
  admissiblePositions,
  assignStrips,
  drawFrom,
  junctionNets,
  parseSeedArm,
  SEED_ARMS,
  seedCandidate,
  seededPrng,
  type SeedArm,
} from "../../tools/stripboard/seed.ts"
import {
  crowdedInput,
  DUMPS,
  dumpOf,
  fakeSpawn,
  input,
  reachingInput,
  recordingSpawn,
  targetsFor,
} from "./seed-fixtures.ts"

test("SEED_ARMS has exactly three entries, one per member of the SeedArm union", () => {
  expect(SEED_ARMS.length).toBe(3)
})

test("every member of SeedArm appears in SEED_ARMS", () => {
  const constructed: SeedArm = "constructed"
  const imported: SeedArm = "import"
  const random: SeedArm = "random"
  for (const arm of [constructed, imported, random]) {
    expect(SEED_ARMS).toContain(arm)
  }
})

test("SEED_ARMS names three arms and the text selector refuses anything else, empty included", () => {
  // There is no default arm, and the half of that claim a body can establish
  // is the selector's: it refuses rather than choosing. The other half is the
  // type - SeedInput.arm is required - and the type checker is what proves it.
  expect([...SEED_ARMS].sort()).toEqual(["constructed", "import", "random"])
  expect(() => parseSeedArm("")).toThrow(/constructed, import, random/)
  expect(() => parseSeedArm("best")).toThrow(/best/)
})

test("every arm returns a candidate inside the run directory and writes nowhere else", () => {
  expect(SEED_ARMS.length, "a loop over an empty arm list proves nothing").toBe(3)
  for (const arm of SEED_ARMS) {
    const spawned: string[][] = []
    const path = seedCandidate({ ...input(), arm }, recordingSpawn(spawned, DUMPS))
    expect(path.startsWith(input().runDir), arm).toBe(true)
    expect(spawned.length, `${arm} spawned nothing`).toBeGreaterThan(0)
    // THE GUARD IS `-o` BEING PRESENT, not the value after it being defined.
    // The brief's own body read `args[args.indexOf("-o") + 1]`, which on a
    // gesture with no `-o` at all is `args[0]` - so a `--dump-board` would be
    // tested as if it were an output path, and every arm that reads the board
    // fails on its own first gesture. Two of three arms do read it.
    for (const args of spawned) {
      const at = args.indexOf("-o")
      if (at === -1) continue
      const output = args[at + 1]
      expect(output, `${arm}: ${args.join(" ")} ends at -o`).toBeDefined()
      expect(output!.startsWith(input().runDir), arm).toBe(true)
    }
  }
})

test("every arm passes -o on every placing gesture and never writes in place", () => {
  // The fork's own rule, which every verb meets: never write to a path it
  // derived itself; -o required, no in-place default.
  expect(SEED_ARMS.length).toBe(3)
  for (const arm of SEED_ARMS) {
    const spawned: string[][] = []
    seedCandidate({ ...input(), arm }, recordingSpawn(spawned, DUMPS))
    for (const args of spawned.filter((a) => a[0] !== "--dump-board" && a[0] !== "--check")) {
      expect(args, `${arm}: ${args.join(" ")}`).toContain("-o")
    }
  }
})

test("every arm autofills last, because an unpainted board reports CUT_STATE UNRESOLVED", () => {
  // AutoFillVero runs on --update and on --author --op autofill and NOT on
  // --import --strips or --set-strips, and HC2 refuses an unresolved cut state
  // rather than mis-scoring it. So the paint comes after the last gesture that
  // moves anything, on all three arms including the one that moves nothing.
  expect(SEED_ARMS.length).toBe(3)
  for (const arm of SEED_ARMS) {
    const spawned: string[][] = []
    seedCandidate({ ...input(), arm }, recordingSpawn(spawned, DUMPS))
    const lines = spawned.map((args) => args.join(" "))
    const autofill = lines.findIndex((line) => line.includes("--op autofill"))
    expect(autofill, `${arm} never autofilled`).toBeGreaterThanOrEqual(0)
    expect(autofill, `${arm} autofilled before its last gesture`).toBe(lines.length - 1)
  }
})

test("a spawn that fails stops every arm and names the gesture", () => {
  const failing = (args: readonly string[]) =>
    ({ status: 1, stdout: "", stderr: `refused: ${args[0]}` })
  expect(SEED_ARMS.length).toBe(3)
  for (const arm of SEED_ARMS) {
    expect(() => seedCandidate({ ...input(), arm }, failing), arm).toThrow(/refused/)
  }
})

test("the import arm is one start for every seed; the other two arms are not", () => {
  const gestures = (arm: SeedArm, seed: number) => {
    const spawned: string[][] = []
    seedCandidate({ ...input(), arm, seed }, recordingSpawn(spawned, DUMPS))
    return spawned.map((args) => args.join(" "))
  }
  expect(gestures("import", 0)).toEqual(gestures("import", 1))
  expect(gestures("constructed", 0)).not.toEqual(gestures("constructed", 1))
  expect(gestures("random", 0)).not.toEqual(gestures("random", 1))
  for (const arm of SEED_ARMS) expect(gestures(arm, 3), arm).toEqual(gestures(arm, 3))
})

test("seededPrng is one algorithm, reproducible from its seed and different across seeds", () => {
  const sequence = (seed: number) => Array.from({ length: 5 }, seededPrng(seed))
  expect(sequence(7)).toEqual(sequence(7))
  expect(sequence(7)).not.toEqual(sequence(8))
  for (const value of sequence(7)) {
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  }
})

test("the constructed arm puts one net on each strip, in the ordering's order with the junction gathered", () => {
  // 34 is `loadRules().stockRows`, not a literal: HC6 owns the stock figure and the rules
  // file is how it reaches the pipeline. Inlining it here would let the two drift.
  const targets = targetsFor("low-boost")
  const assignment = assignStrips(targets, 0)
  expect(assignment.size).toBe(targets.netCount)
  expect(new Set(assignment.values()).size).toBe(targets.netCount)

  // THE EXPECTATION IS HAND-DERIVED AND NOT RECOMPUTED. The brief's own body
  // asserted this equalled `targets.ordering`, which cannot hold beside the
  // junction clause below: low-boost's RCM ordering is
  //
  //   si_hi_cut_j12_p3 si_hi_cut_j4_p2 si_hi_boost_j20_p3 lo_boost_in
  //   hi_boost_out in out j10_p6 j10_p5 j10_p4 j10_p3 j10_p2 0 j10_p1
  //
  // and the junction's five nets sit at positions 5, 4, 3, 6 and 12 of it - a
  // span of 9, which a SIP5 at 1-hole pitch cannot occupy. `assignStrips`
  // therefore lifts the five out and puts them back, in the junction's own pin
  // order (in, hi_boost_out, lo_boost_in, out, 0), at the index the first of
  // them stood at: three non-junction nets preceded position 3, so the block
  // goes back in at index 3. Striking the five from the ordering above and
  // splicing the block in at 3 gives exactly the list below, which anyone can
  // check against the two inputs by hand.
  expect([...assignment.entries()].sort((a, b) => a[1] - b[1]).map(([net]) => net)).toEqual([
    "si_hi_cut_j12_p3",
    "si_hi_cut_j4_p2",
    "si_hi_boost_j20_p3",
    "in",
    "hi_boost_out",
    "lo_boost_in",
    "out",
    "0",
    "j10_p6",
    "j10_p5",
    "j10_p4",
    "j10_p3",
    "j10_p2",
    "j10_p1",
  ])
})

test("a different seed gives the constructed arm a different ordering, deterministically", () => {
  const targets = targetsFor("low-boost")
  expect(assignStrips(targets, 1)).not.toEqual(assignStrips(targets, 0))
  expect(assignStrips(targets, 1)).toEqual(assignStrips(targets, 1))
})

test("the junction's five nets land on five consecutive strips, in one fixed order", () => {
  // The SIP5 at 1-hole pitch is the only component forcing more than two nets
  // together, so the constructed arm places it as a sub-arrangement and builds
  // the ordering around it rather than against it.
  const targets = targetsFor("low-boost")
  const assignment = assignStrips(targets, 0)
  const nets = junctionNets(targets)
  expect(nets.length, "a junction with no nets would make the clause below vacuous").toBe(5)
  // The pinout, read off junctionSignalComponent's pins 1 to 5 in parts.ts and
  // not written out in seed-arrangement.ts: asserted here so the fixed order
  // the clause below depends on is a stated order and not whichever one came back.
  expect([...nets]).toEqual(["in", "hi_boost_out", "lo_boost_in", "out", "0"])
  const strips = nets.map((net) => assignment.get(net))
  expect(strips.every((strip) => strip !== undefined)).toBe(true)
  const sorted = [...(strips as number[])].sort((a, b) => a - b)
  expect(sorted[sorted.length - 1]! - sorted[0]!).toBe(sorted.length - 1)
  // Consecutive is necessary and not sufficient: the SIP5's pins are in its own
  // order, so the five strips must ASCEND in that order too.
  expect(strips as number[]).toEqual([sorted[0]!, sorted[0]! + 1, sorted[0]! + 2, sorted[0]! + 3, sorted[0]! + 4])
})

test("the constructed ordering's bandwidth is inside the tool's span ceiling, on all five", () => {
  // COST 6.4 measured every board's RCM bandwidth inside the ceiling with
  // margin, so clustering is geometrically feasible and the tool's span limit
  // is not the obstruction. A seeded ordering that left it is a bug in the
  // ordering, not a fact about the circuit.
  //
  // THE SECOND FIGURE IS THE ONE THIS TEST'S NAME IS ABOUT. `orderingBandwidth`
  // is `deriveTargets`'s own output and `assignStrips` has no part in it, so an
  // assertion on it alone could not fail for any mutation of the assignment.
  // The per-board literals are hand-recorded from a separate script over the
  // five committed boards, not recomputed from the implementation here.
  const expected: Readonly<Record<string, number>> = {
    "hi-boost": 4,
    "hi-cut": 8,
    "low-cut": 11,
    "low-boost": 6,
    mid: 6,
  }
  for (const section of ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"]) {
    const targets = targetsFor(section)
    expect(targets.orderingBandwidth, section).toBeLessThanOrEqual(TOOL_MAX_SPAN_HOLES - 1)
    const assignment = assignStrips(targets, 0)
    let widest = 0
    for (const [a, b] of targets.netGraph.edges) {
      widest = Math.max(widest, Math.abs(assignment.get(a)! - assignment.get(b)!))
    }
    expect(widest, `${section}'s assignment bandwidth`).toBe(expected[section]!)
    expect(widest, section).toBeLessThanOrEqual(TOOL_MAX_SPAN_HOLES - 1)
  }
})

test("a span the construction needs and the part cannot reach refuses, naming both", () => {
  // The start proposes and the grader grades, but a construction that KNOWS it
  // is asking for an unreachable span says so where the remedy is - the span
  // data - rather than emitting a candidate for HC5 to reject anonymously.
  expect(() => seedCandidate(reachingInput("constructed"), fakeSpawn())).toThrow(/maxSpanHoles/)
  expect(() => seedCandidate(reachingInput("constructed"), fakeSpawn())).toThrow(/pultec-/)
})

test("the random arm draws inside the grid, and the grid does not grow", () => {
  // Pan() runs before any wrap: --move --to 40,5 on a 35x35 fixture reports
  // GRID 41 35, and --move --to -5,5 moves three parts nobody named. Either
  // renumbers every hole the next draw is about to use.
  const spawned: string[][] = []
  const start = seedCandidate({ ...input(), arm: "random" }, recordingSpawn(spawned, DUMPS))
  const before = parseBoardDump(DUMPS.imported!)
  const after = parseBoardDump(dumpOf(start))
  expect(after.grid).toEqual(before.grid)
  const moves = spawned.filter((a) => a[0] === "--move")
  expect(moves.length, "a run with no --move would make every bound below vacuous").toBe(8)
  for (const args of moves) {
    const [row, col] = args[args.indexOf("--to") + 1]!.split(",").map(Number)
    expect(row!, args.join(" ")).toBeGreaterThanOrEqual(0)
    expect(col!, args.join(" ")).toBeGreaterThanOrEqual(0)
    expect(row!, args.join(" ")).toBeLessThan(before.grid.rows)
    expect(col!, args.join(" ")).toBeLessThan(before.grid.cols)
  }
})

test("the random arm stretches nothing, so every span is the one --import gave it", () => {
  const spawned: string[][] = []
  seedCandidate({ ...input(), arm: "random" }, recordingSpawn(spawned, DUMPS))
  expect(spawned.some((args) => args[0] === "--move")).toBe(true)
  expect(spawned.filter((args) => args[0] === "--stretch")).toEqual([])
})

test("the draw indexes the enumerated admissible set, and reaches its ends and its middle", () => {
  // WHAT THIS PROVES is the index map: a draw of 0 takes the first admissible
  // position, one just under 1 takes the last, and a half takes the middle, so
  // no admissible position is unreachable and none outside the set is reached.
  // WHAT IT DOES NOT PROVE is that the STREAM is uniform - that is seededPrng,
  // one named algorithm, tested above for reproducibility and range only.
  const positions = admissiblePositions(parseBoardDump(DUMPS.imported!), "R1")
  expect(positions.length, "a one-position set would make every draw equal").toBeGreaterThan(2)
  expect(drawFrom(positions, () => 0)).toEqual(positions[0])
  expect(drawFrom(positions, () => 0.999999)).toEqual(positions[positions.length - 1])
  expect(drawFrom(positions, () => 0.5)).toEqual(positions[Math.floor(positions.length / 2)])
})

test("a part with no admissible position refuses by name, and writes nothing", () => {
  expect(() => seedCandidate({ ...crowdedInput(), arm: "random" }, recordingSpawn([], DUMPS)))
    .toThrow(/R1/)
  expect(() => seedCandidate({ ...crowdedInput(), arm: "random" }, recordingSpawn([], DUMPS)))
    .toThrow(/admissible/)
})
