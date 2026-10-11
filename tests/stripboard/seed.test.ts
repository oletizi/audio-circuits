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
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { TOOL_MAX_SPAN_HOLES } from "../../lib/kicad/lead-span-model.ts"
import type { Network } from "../../lib/model/types.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { deriveTargets } from "../../tools/stripboard/targets.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { constructionSpan } from "../../tools/stripboard/seed-constructed.ts"
import { netsByPart } from "../../tools/stripboard/seed-nets.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
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
  // A TYPE PREDICATE AND NOT A CAST. `as number[]` is what this read was first
  // written as, and CLAUDE.md forbids it; the filter narrows by a guard the
  // compiler checks, and the length assertion beside it is what makes the
  // narrowing honest - a net whose strip was missing would shorten the list
  // rather than slip through as undefined.
  const strips = nets
    .map((net) => assignment.get(net))
    .filter((strip): strip is number => strip !== undefined)
  expect(strips.length, "every junction net has a strip").toBe(nets.length)
  const sorted = [...strips].sort((a, b) => a - b)
  expect(sorted[sorted.length - 1]! - sorted[0]!).toBe(sorted.length - 1)
  // Consecutive is necessary and not sufficient: the SIP5's pins are in its own
  // order, so the five strips must ASCEND in that order too.
  expect(strips).toEqual([sorted[0]!, sorted[0]! + 1, sorted[0]! + 2, sorted[0]! + 3, sorted[0]! + 4])
})

test("junctionNets refuses a board that is not a Pultec section, naming it", () => {
  // THE FIRST OF THREE REFUSALS, AND THE ONLY ONE A REAL BOARD CAN REACH.
  // deriveTargets takes the board NAME as a parameter, so a target set can
  // legitimately carry one that is not pultec-<section> - and the junction's
  // pinout is a fact about these boards and no others.
  const targets = deriveTargets(physicalBoard("low-boost"), loadRules().stockRows, "widget-mk1")
  expect(() => junctionNets(targets)).toThrow(/widget-mk1/)
  expect(() => junctionNets(targets)).toThrow(/junction_signals/)
  // NOT an empty list, which is the whole reason the refusal exists.
  expect(() => junctionNets(targets)).toThrow(/no-op nobody noticed/)
})

test("junctionNets refuses a section whose network carries no junction_signals", () => {
  // All five committed sections carry one, so this refusal is unreachable from
  // any real board - which is exactly why `boardFor` is injected. A guard no
  // test can drive is a guard that has already stopped working.
  const targets = targetsFor("low-boost")
  const withoutJunction = (): Network => ({
    ...physicalBoard("low-boost"),
    components: physicalBoard("low-boost").components.filter(
      (component) => component.id !== "junction_signals",
    ),
  })
  expect(() => junctionNets(targets, withoutJunction)).toThrow(/junction_signals/)
  expect(() => junctionNets(targets, withoutJunction)).toThrow(/pultec-low-boost/)
  expect(() => junctionNets(targets, withoutJunction)).toThrow(/no-op nobody noticed/)
  // And the default lookup finds one on the same board, so the fixture above is
  // removing something that is really there rather than testing a typo.
  expect(junctionNets(targets).length).toBe(5)
})

test("junctionNets refuses a junction whose nets the target set does not carry", () => {
  // The condition this file cannot otherwise see: BoardTargets is derived once
  // and passed around, so targets built from a different network would have the
  // junction's nets assigned strips no part of this board is on.
  const targets = targetsFor("low-boost")
  const renamedJunction = (): Network => ({
    ...physicalBoard("low-boost"),
    components: physicalBoard("low-boost").components.map((component) =>
      component.id === "junction_signals"
        ? {
            ...component,
            units: component.units.map((unit) => ({
              ...unit,
              pins: { ...unit.pins, "1": { kind: "net" as const, net: "not_a_net_on_this_board" } },
            })),
          }
        : component,
    ),
  })
  expect(() => junctionNets(targets, renamedJunction)).toThrow(/not_a_net_on_this_board/)
  expect(() => junctionNets(targets, renamedJunction)).toThrow(/derived from different networks/)
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
  //
  // NO PER-BOARD BANDWIDTH LITERALS. This test carried five - 4, 8, 11, 6, 6 -
  // and they were the implementation's own output pasted back, which passes
  // however wrong the implementation is. A graph bandwidth over fourteen to
  // twenty-eight nets and dozens of edges is not a figure a reader can re-derive
  // from a comment, so they are gone rather than dressed up. Both bounds that
  // remain ARE derivable by hand, and between them they still fail the
  // Object.keys mutation: it takes hi-boost's assignment bandwidth to 18.
  for (const section of ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"]) {
    const targets = targetsFor(section)
    expect(targets.orderingBandwidth, section).toBeLessThanOrEqual(TOOL_MAX_SPAN_HOLES - 1)
    const assignment = assignStrips(targets, 0)
    let widest = 0
    for (const [a, b] of targets.netGraph.edges) {
      widest = Math.max(widest, Math.abs(assignment.get(a)! - assignment.get(b)!))
    }
    // THE CEILING, which is what the test's name claims and what the tool
    // imposes: a span of `widest + 1` holes has to be inside TOOL_MAX_SPAN_HOLES.
    expect(widest, `${section}'s assignment bandwidth`).toBeLessThanOrEqual(TOOL_MAX_SPAN_HOLES - 1)
    // AND A HAND-DERIVED FLOOR. The junction's five nets are mutually adjacent -
    // one SIP5 touches all five, and a component makes every pair of its own
    // nets an edge - so they are a K5 in the net graph. Five mutually adjacent
    // nets laid on a line put two of them four apart whatever the order, and the
    // gathering puts them on five consecutive strips, so the widest edge is at
    // least 4 on every board. A bandwidth below 4 would mean the junction's own
    // edges had gone missing.
    expect(widest, `${section} is below the junction's own K5 floor`).toBeGreaterThanOrEqual(4)
  }
})

test("a span the construction needs and the part cannot reach refuses, naming both", () => {
  // The start proposes and the grader grades, but a construction that KNOWS it
  // is asking for an unreachable span says so where the remedy is - the span
  // data - rather than emitting a candidate for HC5 to reject anonymously.
  //
  // DRIVEN DIRECTLY AND NOT THROUGH `seedCandidate`, which is a change from the
  // brief's own body and a finding rather than a convenience: the gathered
  // arrangement's bandwidth is at most 11 across the five committed boards, so
  // the widest span any of them asks for is 12 - inside the tool's 16. The
  // refusal cannot be reached through a board that exists, and the fixture that
  // used to reach it was a synthetic two-part board whose NODE pin sets no
  // longer join to any model (see seed-fixtures.ts). A guard no test can drive
  // is a guard that has already stopped working, so it is called by hand.
  //
  // 0 AND 27 ARE THE ENDS OF MID'S OWN ARRANGEMENT, which is where a span like
  // this would come from if one ever did: 28 nets, so a part on the first and
  // last strips asks for 28 holes.
  expect(() => constructionSpan("L1", 0, 27, "pultec-mid")).toThrow(/maxSpanHoles/)
  expect(() => constructionSpan("L1", 0, 27, "pultec-mid")).toThrow(/pultec-/)
  expect(() => constructionSpan("L1", 0, 27, "pultec-mid")).toThrow(/28 holes/)
  // AND IT PASSES WHAT IT SHOULD: the widest span any committed board asks for.
  expect(constructionSpan("R2", 3, 14, "pultec-low-cut")).toBe(12)
  expect(constructionSpan("R2", 0, 15, "pultec-low-cut")).toBe(TOOL_MAX_SPAN_HOLES)
})

test("the pin-set join refuses an unjoinable node, in both directions, and only then", () => {
  // THE NARROWED REFUSAL. It does NOT fire on `NAME -`, which is what every
  // --import-placed board writes on every NODE line and is now expected and
  // routine. It fires when the pin SETS cannot be joined - which is a genuine
  // disagreement about which board is being graded, in either direction.
  const nodes = (lines: readonly string[]) =>
    ["GRID 4 4", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED", ...lines, ""].join("\n")
  const reference: ReferenceNets = new Map([
    ["a", ["R1.1", "R2.1"]],
    ["b", ["R1.2", "R2.2"]],
  ])

  // JOINS, with every NAME a bare dash and the pin order reversed on one line:
  // a pin SET has no order, so the join does not care.
  const joined = netsByPart(
    nodes(["NODE 7 NAME - R1.1 R2.1", "NODE 9 NAME - R2.2 R1.2"]),
    reference,
    "pultec-low-boost",
  )
  expect([...(joined.get("R1") ?? [])].sort(), "R1 is on both nets").toEqual(["a", "b"])
  expect([...(joined.get("R2") ?? [])].sort(), "R2 is on both nets").toEqual(["a", "b"])

  // A NODE MATCHING NO REFERENCE NET.
  expect(() =>
    netsByPart(nodes(["NODE 7 NAME - R1.1 R9.9", "NODE 9 NAME - R1.2 R2.2"]), reference, "pultec-low-boost"),
  ).toThrow(/board node 7 carries pins R1.1 R9.9/)

  // AND A REFERENCE NET WITH NO NODE: the other direction, which a one-sided
  // join would pass over, leaving part of the circuit silently unarranged.
  expect(() =>
    netsByPart(nodes(["NODE 7 NAME - R1.1 R2.1"]), reference, "pultec-low-boost"),
  ).toThrow(/exports net\(s\) b that no NODE on this board carries/)
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
  // THE SET IS WHAT IS IN BOUNDS, AND ASSERTING THE SET IS DETERMINISTIC. This
  // is a correction the mutation run forced: widening `admissiblePositions` by
  // one row left the eight draws below unchanged - over a 35x35 grid, no draw
  // happened to land on the extra row - so the per-draw bounds caught that
  // mutation only by luck. `C19` is a `CAP_FILM`, whose footprint is one row by
  // three columns (`CompTypes.h:561`, `rows = 1; cols = 3`), so on a 35x35 grid
  // the last origin that fits is column 32 and the last row is 34 - and rows 3
  // upward are entirely free on this board, so nothing else bounds the row.
  // Both figures are read off the grid size and the footprint, by hand.
  const positions = admissiblePositions(before, "C19")
  expect(Math.max(...positions.map(([row]) => row)), "an origin past the last row").toBe(34)
  expect(Math.max(...positions.map(([, col]) => col)), "a lead past the last column").toBe(32)
  expect(before.grid, "the figures above are read off this grid").toEqual({ rows: 35, cols: 35 })

  const moves = spawned.filter((a) => a[0] === "--move")
  // SEVENTEEN, which is the import-placed low-boost board's own PART count: the
  // arm moves every part and the ten PAD holes are not parts and never move.
  expect(moves.length, "a run with no --move would make every bound below vacuous").toBe(17)
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
  const positions = admissiblePositions(parseBoardDump(DUMPS.imported!), "C19")
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
