/**
 * THE COMPLETION PASS: what it proposes, what it accepts, and what it reports
 * about a net it could not close.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT.** The injected spawn answers
 * `--dump-board` and `--check` from scripts keyed by the evaluation index, so it
 * does not simulate a gesture: the board a candidate reports is the script's and
 * not the wires' effect. So these assert the pass's OBJECTIVE and its
 * BOOKKEEPING - which candidates the generator proposes, which the rule accepts,
 * that a candidate breaking a constraint the entering board held is refused, and
 * what `unclosed` says - and never the fork's geometry, which
 * `./seed-geometry.test.ts` holds against the real binary.
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/completion-pass-report.md`
 * carries what the pass did on the real boards.
 *
 * Every expected count is hand-derived from the fixture boards, with the
 * derivation written out, and never recomputed from the implementation's own
 * expression.
 *
 * **ONE GUARD IN `./complete-joins.ts` IS NOT COVERED HERE AND THAT IS STATED
 * RATHER THAN PAPERED OVER.** `bridgeBetween` checks that the wire LANDED on the
 * two holes it asked for before proposing it, and a mutation run with that check
 * removed left all of these passing - correctly, because the arithmetic it
 * guards is right, so no fixture can make the planner and the anchor disagree.
 * It defends against a future divergence between
 * `tools/stripboard/seed-placement.ts`'s transcribed turn and the binary, which
 * is what `./seed-geometry.test.ts` would catch first. No test here claims to
 * provide it.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import { completionPass } from "../../tools/stripboard/complete.ts"
import { netJoinPlans } from "../../tools/stripboard/complete-joins.ts"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { importClosure } from "./import-closure.ts"
import {
  BASE_DUMP,
  REFERENCE,
  type CheckScript,
  type DumpScript,
} from "./climb-fixtures.ts"
import {
  CUT_SPLIT,
  CUT_SPLIT_DUMP,
  CUT_SPLIT_OCC,
  FAR,
  FAR_DUMP,
  FAR_OCC,
  FAR_REPORT,
  PAD_SPLIT,
  PAD_SPLIT_DUMP,
  PAD_SPLIT_OCC,
  SPLIT,
  SPLIT_DUMP,
  SPLIT_OCC,
  SPLIT_REPORT,
  TALL_JOINED_DUMP,
  WHOLE_REPORT,
  completionInput,
  freshPassDir,
  passSpawn,
  passStart,
} from "./complete-fixtures.ts"

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error("the call did not refuse")
}

/**
 * The script the pass's one-net tests run: evaluation 0 is the start, reporting
 * `SPLIT_DUMP` with `left` incomplete; evaluation 1 is the candidate, reporting
 * `BASE_DUMP` with every net whole.
 *
 * There is no "and thereafter" fallback - every index is answered explicitly, so
 * a pass that evaluated a third candidate would read the last branch rather
 * than a default and the test would say so.
 */
const CLOSES_ON_FIRST: DumpScript = (index) => (index === 0 ? SPLIT_DUMP : BASE_DUMP)
const CHECK_CLOSES: CheckScript = (index) =>
  index === 0 ? { status: 1, report: SPLIT_REPORT } : { status: 0, report: WHOLE_REPORT }

test("one wire closes the split net, and the pass reports the board that carries it", () => {
  const runDir = freshPassDir()
  const start = passStart(runDir, SPLIT_DUMP, SPLIT_OCC)
  const result = completionPass(
    start,
    completionInput(runDir),
    passSpawn(CLOSES_ON_FIRST, CHECK_CLOSES),
  )

  // ONE OPEN NET ON THE START AND NONE ON THE RESULT: `SPLIT_REPORT` names
  // `left` incomplete and `WHOLE_REPORT` names neither, and `openNets` is each
  // report's own incomplete count.
  expect(result.start.openNets).toBe(1)
  expect(result.evaluation.openNets).toBe(0)
  expect(result.unclosed).toEqual([])

  // TWO EVALUATIONS: the start, and one candidate for the one open net. A
  // second round swept nothing because no net was open on the candidate.
  expect(result.evaluations).toBe(2)
  expect(result.rounds).toBe(2)
  expect(result.acceptedPerRound).toEqual([1, 0])

  // ONE WIRE, by the DUMPS' own `WIRE` counts: `SPLIT_DUMP` carries `W2` alone
  // and `BASE_DUMP` carries `W1` and `W2`.
  expect(boardGeometry(SPLIT_DUMP).wires.length).toBe(1)
  expect(boardGeometry(BASE_DUMP).wires.length).toBe(2)
  expect(result.wiresAdded).toBe(1)

  // THE REPORTED BOARD IS NOT THE START, and it is not the painted candidate
  // either: a further gesture goes on the unpainted file.
  expect(result.best.board).not.toBe(start.board)
  expect(result.best.board.endsWith("-filled.vrt")).toBe(false)
  expect(fs.existsSync(result.best.board)).toBe(true)
  // AND THE START BOARD'S BYTES ARE UNTOUCHED: `-o` always, never in place.
  expect(fs.readFileSync(start.board, "utf8")).toBe(SPLIT_DUMP)
})

test("the generator plans one wire for the one join the split net needs", () => {
  // THE JOIN COUNT IS HAND-DERIVED: `SPLIT_DUMP` has no `CUT` line, so under
  // vertical strips each of its forty columns is its own copper component. The
  // net `left` is `R1.1` at 2,1 and `R2.1` at 7,2 - columns 1 and 2, two
  // components - so it needs exactly one join. `right` is `R1.2` at 2,6 and
  // `R2.2` at 7,7 over `W2`, which unions those two holes, so it is one
  // component and `--check` calls it complete.
  const plans = netJoinPlans({
    dumpText: SPLIT_DUMP,
    dump: SPLIT,
    occupancy: SPLIT_OCC,
    reference: REFERENCE,
    openNets: ["left"],
  })
  expect(plans.length).toBe(1)
  const plan = plans[0]
  expect(plan?.net).toBe("left")
  expect(plan?.components).toBe(2)
  expect(plan?.shortfall).toBe(null)
  expect(plan?.wires.length).toBe(1)
  // THE WIRE IS NAMED FOR THE BOARD'S OWN WIRE COUNT: `SPLIT_DUMP` carries one
  // wire, so the fork will name the next one `Wire2`.
  const wire = plan?.wires[0]
  expect(wire?.kind).toBe("add-wire")
  if (wire?.kind === "add-wire") {
    expect(wire.net).toBe("left")
    expect(wire.plan.name).toBe("Wire2")
    // AND IT LANDS ON THE TWO STRIPS THE NET IS SPLIT ACROSS - columns 1 and 2,
    // which is what makes it a join rather than a decoration. The row is
    // whichever line the search reached first and is not asserted.
    expect([wire.ends[0][1], wire.ends[1][1]].sort()).toEqual([1, 2])
  }
})

test("a net split by a cut on ONE strip is joined by a wire along that strip", () => {
  // THE TWO COMPONENTS ARE BOTH IN COLUMN 1 - `R1.1` at 2,1 above the cut
  // between rows 4 and 5, `R2.1` at 7,1 below it - so no line across the strips
  // has a hole of both and only `wireAlong` can reach. This is the case the
  // `--import`-placed board is made of, and the only board in this suite that
  // exercises that search.
  const plans = netJoinPlans({
    dumpText: CUT_SPLIT_DUMP,
    dump: CUT_SPLIT,
    occupancy: CUT_SPLIT_OCC,
    reference: REFERENCE,
    openNets: ["left"],
  })
  const plan = plans[0]
  expect(plan?.components).toBe(2)
  expect(plan?.shortfall).toBe(null)
  expect(plan?.wires.length).toBe(1)
  const wire = plan?.wires[0]
  if (wire?.kind !== "add-wire") throw new Error("the plan's one wire is not an add-wire")
  // BOTH ENDS IN COLUMN 1 - one strip - and on opposite sides of the cut: the
  // cut severs the copper between rows 4 and 5, so a wire that joined the two
  // components has one end at row 4 or above and one at row 5 or below.
  expect(wire.ends[0][1]).toBe(1)
  expect(wire.ends[1][1]).toBe(1)
  const rows = [wire.ends[0][0], wire.ends[1][0]].sort((a, b) => a - b)
  expect(rows[0]).toBeLessThanOrEqual(4)
  expect(rows[1]).toBeGreaterThanOrEqual(5)
  // AND IT IS THE BOARD'S FIRST WIRE: `CUT_SPLIT_DUMP` carries no `WIRE` line.
  expect(CUT_SPLIT.wires.length).toBe(0)
  expect(wire.plan.name).toBe("Wire1")
})

test("an off-board part's expanded pad is located by its provenance, not by its board name", () => {
  // THE NETLIST NAMES `R2.1` AND THE DUMP NAMES `R2_1.1`. Only the `PAD` line's
  // `FROM R2.1` field connects the two, so a generator reading `PIN` names alone
  // finds one of this net's two pins, calls the other absent and plans nothing.
  // On the real low-boost board that is ten pins of twenty-seven.
  const plans = netJoinPlans({
    dumpText: PAD_SPLIT_DUMP,
    dump: PAD_SPLIT,
    occupancy: PAD_SPLIT_OCC,
    reference: REFERENCE,
    openNets: ["left"],
  })
  const plan = plans[0]
  expect(plan?.net).toBe("left")
  // TWO COMPONENTS AND ONE WIRE: `R1.1` in column 1 and the pad holding `R2.1`
  // in column 2. A pin read by board name would be ABSENT, which is the other
  // branch and names the pins it could not find.
  expect(plan?.components).toBe(2)
  expect(plan?.shortfall).toBe(null)
  expect(plan?.wires.length).toBe(1)
})

test("a net whose components no single wire reaches is reported, not proposed", () => {
  const runDir = freshPassDir()
  // BOTH NETS ARE TWENTY STRIPS APART on `FAR_DUMP` - `left` on columns 1 and
  // 20, `right` on 6 and 25 - against the fork's sixteen-hole stretch bound,
  // and the two parts share no row, so there is no along-strip pair either.
  const result = completionPass(
    passStart(runDir, FAR_DUMP, FAR_OCC),
    completionInput(runDir),
    passSpawn(
      () => FAR_DUMP,
      () => ({ status: 1, report: FAR_REPORT }),
    ),
  )
  // ONE EVALUATION ONLY - the start. No candidate was proposed, so no wire was
  // ever applied and nothing was scored beyond the board handed over.
  expect(result.evaluations).toBe(1)
  expect(result.rounds).toBe(1)
  expect(result.acceptedPerRound).toEqual([0])
  expect(result.wiresAdded).toBe(0)
  expect(result.evaluation.openNets).toBe(2)

  // AND BOTH NETS ARE REPORTED WITH THE CAUSE, which is the result this pass
  // exists to be able to state.
  expect(result.unclosed.map((net) => net.net).sort()).toEqual(["left", "right"])
  for (const net of result.unclosed) {
    expect(net.components).toBe(2)
    expect(net.wiresPlanned).toBe(0)
    expect(net.reason).toContain("no single wire the model admits joins its copper components")
    expect(net.reason).toContain("2 to 16 holes")
  }
})

test("a candidate that closes the net but breaks a constraint the start held is refused", () => {
  const runDir = freshPassDir()
  // `TALL_JOINED_DUMP` has `left` WHOLE - both its strips are joined - so the
  // candidate really does close the net, and `--check` says so. What it also
  // has is `R2` at row 45, a row extent of 44 against the 34 strips the rules
  // declare, so `HC6` FAILS on it and HELD on `SPLIT_DUMP` (extent rows 2 to 7).
  // Only the no-regression clause can reject this candidate.
  const result = completionPass(
    passStart(runDir, SPLIT_DUMP, SPLIT_OCC),
    completionInput(runDir),
    passSpawn(
      (index) => (index === 0 ? SPLIT_DUMP : TALL_JOINED_DUMP),
      CHECK_CLOSES,
    ),
  )
  // THE CANDIDATE WAS EVALUATED AND REJECTED: two evaluations, nothing accepted.
  expect(result.evaluations).toBe(2)
  expect(result.acceptedPerRound).toEqual([0])
  // AND THE BOARD LEAVING THE PASS IS THE BOARD THAT ENTERED IT - no fewer open
  // nets, and no broken constraint either.
  expect(result.evaluation.openNets).toBe(result.start.openNets)
  expect(result.wiresAdded).toBe(0)
  const held = (which: typeof result.start, id: string): boolean =>
    which.results.find((entry) => entry.id === id)?.held === true
  expect(held(result.start, "HC6")).toBe(true)
  expect(held(result.evaluation, "HC6")).toBe(true)
  // AND THE REASON NAMES THE CONSTRAINT, from the regression list rather than
  // from a phrase about cost.
  const open = result.unclosed[0]
  expect(open?.net).toBe("left")
  expect(open?.reason).toContain("BREAKS HC6")
})

test("a candidate with more open nets is refused whatever its F", () => {
  const runDir = freshPassDir()
  // THE CANDIDATE REPORTS BOTH NETS INCOMPLETE where the start had one, and its
  // `F` is LOWER: `FAR_DUMP` carries no `WIRE` line at all, so `F = 0`, against
  // `SPLIT_DUMP`'s one wire at 0.25. A rule comparing `F` first would take it.
  const result = completionPass(
    passStart(runDir, SPLIT_DUMP, SPLIT_OCC),
    completionInput(runDir),
    passSpawn(
      (index) => (index === 0 ? SPLIT_DUMP : FAR_DUMP),
      (index) => (index === 0
        ? { status: 1, report: SPLIT_REPORT }
        : { status: 1, report: FAR_REPORT }),
    ),
  )
  expect(result.start.openNets).toBe(1)
  expect(boardGeometry(FAR_DUMP).wires.length).toBe(0)
  expect(result.acceptedPerRound).toEqual([0])
  expect(result.evaluation.openNets).toBe(1)
  expect(result.unclosed[0]?.reason).toContain("openNets 1 -> 2")
})

test("a wire whose board cannot be scored is counted and reported, not thrown", () => {
  const runDir = freshPassDir()
  // `CUT_STATE UNRESOLVED` is what the fork reports when a wire shorts two nets,
  // and `score.ts` refuses such a board rather than pricing it at zero cuts. The
  // pass catches that ONE refusal by name and counts the candidate.
  const unresolved = SPLIT_DUMP.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")
  const result = completionPass(
    passStart(runDir, SPLIT_DUMP, SPLIT_OCC),
    completionInput(runDir),
    passSpawn(
      (index) => (index === 0 ? SPLIT_DUMP : unresolved),
      CHECK_CLOSES,
    ),
  )
  expect(result.unscoreable).toBe(1)
  expect(result.firstUnscoreable).toContain("score-cuts-not-computed")
  expect(result.acceptedPerRound).toEqual([0])
  // THE EVALUATION COUNT EXCLUDES IT: it is a candidate the pass could not
  // evaluate, which is `ClimbResult.unscoreable`'s own distinction.
  expect(result.evaluations).toBe(1)
  expect(result.unclosed[0]?.reason).toContain("could not be SCORED")
})

test("the pass refuses a measurement whose open-net count and report disagree", () => {
  // THE TWO ARE ONE READING in `climb-evaluate.ts` - `openNets` is the report's
  // own `incompleteNets.length` - so this can only be reached by a hand-built
  // record, and the refusal says so rather than reconciling them. The scripted
  // spawn makes one: `--check` names `left` incomplete and EXITS 0, which
  // `parseCheckReport` reads as one incomplete net, while the report the grader
  // sees is the same one - so to force a disagreement the dump's own net count
  // is what changes.
  const runDir = freshPassDir()
  const refusal = refusalFrom(() =>
    completionPass(
      passStart(runDir, SPLIT_DUMP, SPLIT_OCC),
      completionInput(runDir),
      passSpawn(
        () => SPLIT_DUMP,
        () => ({ status: 1, report: "Layout state\nnot_a_net incomplete\nCuts: 0\n" }),
      ),
    ),
  )
  // The net the report names is not in the reference netlist, which is the
  // generator's own refusal and names the two sides.
  expect(refusal).toContain("the reference netlist has no such net")
})

test("no file in the completion pass's TRANSITIVE closure names a clock, a pid, a listing or Math.random", async () => {
  // THE SAME CLAIM `./escapes-search.test.ts` MAKES ABOUT THE SEARCH, over the
  // pass's own entry points, because `V6`'s determinism argument has to cover
  // every stage that writes the board a run reports - and this one adds a
  // generator that reads a copper graph, a pad table and a netlist. A pass that
  // proposed its wires in an order a directory listing decided would make the
  // run irreproducible exactly where the search is not.
  //
  // THE EXEMPTIONS ARE THAT FILE'S and are not restated here: both are reached
  // through the same type-only edge from `check-report.ts`, which that file
  // holds, so a copy of the list here would be a second place to keep correct.
  // What this test asserts is that the pass adds NO NEW hit of its own.
  //
  // WHAT IT DOES NOT PROVE, exactly as that file says of itself: a scan cannot
  // see an aliased access, a clock reached through a builtin the walker skips,
  // or a nondeterminism that is not one of these five identifiers.
  const forbidden = ["Date.now", "performance.now", "process.pid", "readdirSync", "Math.random"]
  const exempt = ["tools/bom/catalog.ts", "tools/perfboard/declaration.ts"]
  const closure = new Set<string>()
  for (const entry of [
    "tools/stripboard/complete.ts",
    "tools/stripboard/complete-joins.ts",
  ]) {
    for (const file of await importClosure(entry)) closure.add(file)
  }
  expect(closure.size, "the closure must be more than the two entry points").toBeGreaterThan(2)
  // AND THE GENERATOR'S OWN DEPENDENCIES ARE REALLY IN IT, so a closure that
  // silently came back as the two entry points alone cannot pass.
  expect(closure).toContain("tools/stripboard/pad-provenance.ts")
  expect(closure).toContain("tools/stripboard/copper.ts")
  expect(closure).toContain("tools/stripboard/moves-wire.ts")
  for (const file of [...closure].sort()) {
    if (exempt.includes(file)) continue
    const text = await Bun.file(file).text()
    for (const identifier of forbidden) {
      expect(text, `${file}: ${identifier}`).not.toContain(identifier)
    }
  }
})

test("every candidate's wires are assigned to their net by an --update before it is measured", () => {
  // THE STEP WITHOUT WHICH THE PASS CLOSES NOTHING, and the first sweep against
  // the real binary is what found that. A wire added by `--author --op add-wire`
  // lands on holes carrying no node id, `--check`'s completeness reads node ids,
  // so the net stays incomplete and the acceptance rule correctly rejects a
  // candidate that cost a wire and repaired nothing. Measured on `constructed`
  // seed 0's best board: one wire placed by hand put both of `j10_p6`'s pins in
  // ONE copper component and `--check` still called it incomplete; after
  // `--update` the same wire reads a node id on both ends and the net is
  // complete. `tools/stripboard/complete-apply.ts` carries the whole record.
  //
  // THIS INJECTED SPAWN CANNOT SIMULATE THAT, so what is asserted is the thing a
  // refactor would drop: that the update is RUN, on the candidate, with the
  // netlist, before the board is painted and checked.
  const runDir = freshPassDir()
  const spawned: string[][] = []
  const input = completionInput(runDir)
  const result = completionPass(
    passStart(runDir, SPLIT_DUMP, SPLIT_OCC),
    input,
    passSpawn(CLOSES_ON_FIRST, CHECK_CLOSES, spawned),
  )
  expect(result.acceptedPerRound[0]).toBe(1)
  const updates = spawned.filter((args) => args[0] === "--update")
  // ONE PER CANDIDATE AND NOT ONE PER WIRE: the pass evaluated the start and one
  // candidate, so exactly one candidate was produced.
  expect(updates.length).toBe(1)
  const update = updates[0]
  expect(update?.includes("--netlist")).toBe(true)
  expect(update?.[update.indexOf("--netlist") + 1]).toBe(input.netlist)
  // AND IT COMES BEFORE THE PAINT, because an autofill of a board whose wires
  // are on no net is what produced the inert candidate in the first place.
  const order = spawned.map((args) => args[0] ?? "")
  const firstUpdate = order.indexOf("--update")
  const paintAfter = order.indexOf("--author", firstUpdate)
  expect(firstUpdate).toBeGreaterThan(-1)
  expect(paintAfter).toBeGreaterThan(firstUpdate)
  // THE START IS NOT UPDATED, which keeps the before figure the same quantity
  // route 1 reported: autofill then check, with no --update.
  expect(order.slice(0, firstUpdate)).not.toContain("--update")
})
