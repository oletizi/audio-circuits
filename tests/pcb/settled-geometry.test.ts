/**
 * THE OWNER'S DECLARED BOARD SIZE, AND WHAT LEAVES THE OUTLINE.
 *
 * `floorplan-intent.json` `envelope.size_mm` is `[150, 100]` - *"increase the
 * board size to 150mm x 100mm"*, 2026-11-13 - and its `enforced_by` read
 * **"NOTHING YET, stated plainly rather than implied. No tool compares this
 * size to the board's Edge.Cuts today."** `tools/pcb/resolve-intent-zones.ts`
 * now does, and that matters more than it looks: every zone in that file is a
 * FRACTION of the outline, so a resized board does not fail - it silently moves
 * the rectangle the placement is graded against.
 *
 * The second half of this file pins the margined-outline false positive that
 * makes `place_seed` exit 4 on a board the grader passes. Both halves are about
 * the same thing - the outline and which parts are inside it - which is why
 * they sit together and the mounting hardware and the `.kicad_dru` mechanism
 * are in `./settled-mounting-holes.test.ts` and `./courtyard-rule.test.ts`.
 *
 * **THESE TESTS DO NOT GRADE THE PLACEMENT.** That is
 * `py_tools/check_floorplan.py --require-rules 1`, which the last test here
 * runs rather than reimplements.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { builtCommit, engineDir, engineEnv, venvPython } from "../../tools/krt/acquire.ts"
import {
  declaredEnvelopeSize, outlineBounds, requireDeclaredSize,
} from "../../tools/pcb/resolve-intent-zones.ts"
import { resolveToFile, verifyResolvedIntent } from "../../tools/pcb/resolved-intent.ts"
import { grade } from "../../tools/pcb/grade-cli.ts"
import { EDGE_CLEARANCE_MM } from "../../tools/pcb/board-outline.ts"
import { mountingHoleRule } from "../../tools/pcb/mounting-hardware.ts"
import { minPartGapMm } from "../../tools/pcb/courtyard-rule.ts"
import { REFERENCES } from "../../tools/pcb/place-mounting-holes.ts"
import {
  BOARD, INTENT, RULES, boardText, insetBy, intent, partsLeaving, rules,
} from "./settled-board.ts"

afterAll(cleanUpTempScratch)

// ---- the outline is the owner's declared size -------------------------------

test("the board's Edge.Cuts is exactly the size the intent declares", () => {
  const size = declaredEnvelopeSize(intent(), INTENT)
  if (size === undefined) throw new Error(`${INTENT} declares no envelope.size_mm`)
  const bounds = outlineBounds(boardText(), BOARD)
  console.log(
    `  declared ${size[0]} x ${size[1]} mm; board ${(bounds.x1 - bounds.x0).toFixed(3)} x ` +
      `${(bounds.y1 - bounds.y0).toFixed(3)} mm at (${bounds.x0}, ${bounds.y0})`,
  )
  expect(size).toEqual([150, 100])
  expect(() => requireDeclaredSize(intent(), bounds, INTENT, BOARD)).not.toThrow()
})

test("a board of the wrong size REFUSES, and the refusal says not to edit the declared size", () => {
  const shrunk = { x0: 10, y0: 10, x1: 10 + 149.9, y1: 110 }
  let message = ""
  try {
    requireDeclaredSize(intent(), shrunk, INTENT, BOARD)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  console.log(`  0.1 mm undersize refuses: ${message.slice(0, 96)}...`)
  expect(message).toContain("149.900 x 100.000 mm outline")
  expect(message).toContain("150 x 100 mm")
  // The direction of the fix is in the message, because the wrong one is
  // tempting and silent: a declared size edited to match the board would move
  // every zone fraction with it and still report a pass.
  expect(message).toContain("do not edit the declared size to match the board")
})

test("the origin is deliberately NOT checked, which is why the intent declares a size", () => {
  const bounds = outlineBounds(boardText(), BOARD)
  const moved = { x0: 1000, y0: 2000, x1: 1000 + (bounds.x1 - bounds.x0), y1: 2000 + (bounds.y1 - bounds.y0) }
  expect(() => requireDeclaredSize(intent(), moved, INTENT, BOARD)).not.toThrow()
})

test("an envelope with a rect, or a malformed size, is refused wherever the intent is read", () => {
  const base = intent() as Record<string, unknown>
  const withRect = { ...base, envelope: { rect: [0, 0, 10, 10] } }
  expect(() => declaredEnvelopeSize(withRect, "x")).toThrow(/envelope\.rect is declared/)
  expect(() => declaredEnvelopeSize({ ...base, envelope: {} }, "x")).toThrow(/no size_mm/)
  for (const bad of [[150], [150, 100, 2], [150, 0], ["150", 100], [150, -1]]) {
    expect(() => declaredEnvelopeSize({ ...base, envelope: { size_mm: bad } }, "x")).toThrow()
  }
})

// ---- the margined-outline false positive, pinned ---------------------------

test("ONLY the mounting holes leave a 2.0 mm margined outline, and the amount is derived from the three approved numbers", () => {
  // WHY THIS TEST EXISTS, and it is not to excuse a failure.
  //
  // `place_seed.py` exits 4 on this board with two `GRADE ERROR [legality]`
  // lines - "parts leaving the board outline: 4.000" and "total off-board
  // overhang (mm): 12.000" - while `check_floorplan.py` grades the same bytes
  // as a clean PASS. The cause is parameter plumbing in the engine, not a
  // property of this board, and it is documented in the engine's own source:
  //
  //   .tools/krt/py_placer/placement/quench.py:424
  //       `margin = max(clearance, board_edge_clearance)` - so --clearance,
  //       which the owner's 2.0 mm PART SPACING sets, also becomes the
  //       board-EDGE margin. The same expression is at
  //       placement/fanout_clearance.py:276.
  //   .tools/krt/py_placer/placement/legality.py:1827
  //       the off-board quantity is measured against an outline inflated by
  //       "the GRADING CLEARANCE -- so it moves when --clearance moves".
  //   .tools/krt/py_placer/placement/seeder.py:1747
  //       the same false positive, named as "cosmetic and common on legitimate
  //       boards (tigard's own corner mounting holes overhang by courtyard;
  //       the human original grades oob 7)", and fixed in that census but not
  //       in `legality_metrics`, which is what floorplan.py reads.
  //
  // "KNOWN FALSE POSITIVE" IS EXACTLY THE SENTENCE SOMEONE WILL REACH FOR TO
  // WAVE THROUGH A REAL OUT-OF-BOUNDS PART, so the claim is narrowed to
  // something that can fail: at this margin the parts leaving the outline are
  // EXACTLY the four mounting holes, by name, and the total is the figure the
  // three approved numbers produce. A circuit part drifting off the board
  // breaks the first clause; a change to the inset, the envelope or the
  // spacing moves the second.
  const rule = mountingHoleRule(rules(), RULES)
  const margin = minPartGapMm(rules(), RULES)
  const radius = rule.envelopeDiameterMm / 2
  // Each hole's courtyard reaches `radius` from a centre `centre_inset_mm` in,
  // so it sits `inset - radius` clear of the real edge and overhangs an outline
  // inflated by `margin` by this much - on EACH of the two edges its corner is
  // formed by.
  const perEdge = radius - rule.centreInsetMm + margin
  const expected = perEdge > 0 ? perEdge * 2 * rule.count : 0
  console.log(
    `  radius ${radius} - inset ${rule.centreInsetMm} + margin ${margin} = ${perEdge} mm per edge; ` +
      `${rule.count} holes x 2 edges = ${expected} mm`,
  )

  const bounds = outlineBounds(boardText(), BOARD)
  const leaving = partsLeaving(insetBy(bounds, margin))
  for (const part of leaving) console.log(`  ${part.ref}: ${part.amount.toFixed(3)} mm outside`)

  // THE DISCRIMINATING CLAUSE. Not "the holes are among them" and not a count:
  // the exact set, by name. Nudge any circuit part off the board and this line
  // goes red - verified by mutation, see the Task 8 report.
  expect(leaving.map((p) => p.ref)).toEqual(perEdge > 0 ? [...REFERENCES].sort() : [])

  const total = leaving.reduce((sum, p) => sum + p.amount, 0)
  expect(total).toBeCloseTo(expected, 6)
  for (const part of leaving) expect(part.amount).toBeCloseTo(perEdge * 2, 6)
})

test("at the board's OWN copper-to-edge clearance, nothing leaves the outline at all", () => {
  // The other half of the same fact, and the one that says the board is right:
  // the approved rule puts each washer 0.5 mm inside the edge deliberately, so
  // at the board's own 0.5 mm floor - which is what `check_floorplan.py` grades
  // at, reporting "edge 0.5 (board constraint)" - no part is off the board,
  // mounting holes included.
  const bounds = outlineBounds(boardText(), BOARD)
  const leaving = partsLeaving(insetBy(bounds, EDGE_CLEARANCE_MM))
  console.log(`  at ${EDGE_CLEARANCE_MM} mm: ${leaving.length} part(s) outside`)
  expect(leaving).toEqual([])

  // And at zero margin too, which is the honest floor: nothing is over the edge
  // even before any clearance is allowed for.
  expect(partsLeaving(bounds)).toEqual([])
})

/** The grader's own numbers for the committed board, at a stated clearance. */
function graderSummary(clearance: number | undefined): { readonly graded: Record<string, unknown>; readonly output: string; readonly status: number | null } {
  // IT IS THE FIRST TEST HERE TO INVOKE THE PINNED ENGINE, and it REFUSES
  // rather than skipping when the engine is not built, for the reason every
  // kicad-cli test in this directory gives: a green suite on a machine with no
  // engine would be the skipped check that reads as a pass. `make krt` builds
  // it; build/krt/invocations.json records the command shapes.
  const repoRoot = path.resolve(import.meta.dir, "../..")
  const python = venvPython(repoRoot)
  if (builtCommit(repoRoot) === undefined || !fs.existsSync(python)) {
    throw new Error(
      `the pinned routing engine is not built at ${engineDir(repoRoot)} (no stamp, or no venv ` +
        `interpreter at ${python}). Run \`make krt\`. This does NOT skip: it is the only check ` +
        "that the grader's own verdict on this board is a PASS, and that claim is what settles " +
        "the two GRADE ERROR [legality] lines place_seed prints - see the two tests above.",
    )
  }
  const dir = freshTempScratch("pcb-grade-")
  const resolved = path.join(dir, "resolved-intent.json")
  resolveToFile(BOARD, INTENT, resolved, RULES)

  const result = spawnSync(
    python,
    [
      "py_tools/check_floorplan.py", BOARD, "--intent", resolved, "--require-rules", "1",
      ...(clearance === undefined ? [] : ["--clearance", String(clearance)]),
    ],
    { cwd: engineDir(repoRoot), encoding: "utf8", env: { ...engineEnv(process.env) } },
  )
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`
  const summary = /JSON_SUMMARY: (\{.*\})/.exec(output)
  if (summary === null) {
    throw new Error(
      `check_floorplan.py printed no JSON_SUMMARY (exit ${String(result.status)}). Its output is ` +
        `the evidence here and an absent summary is not a pass:\n${output}`,
    )
  }
  return { graded: JSON.parse(summary[1] as string) as Record<string, unknown>, output, status: result.status }
}

test("INTEGRATION, real engine: check_floorplan grades the committed board with oob_count 0 and oob_amount 0.0", () => {
  // THE GRADER'S OWN VERDICT, not a reimplementation of it. The two tests above
  // compute the off-board quantity in TypeScript, which is the only way to
  // assert WHICH parts leave a margined outline - but a reimplementation cannot
  // establish what the engine reports, and the engine is what the evidence bar
  // is phrased in terms of. So this runs the real grader.
  const { graded, output, status } = graderSummary(undefined)
  const result = { status }
  console.log(
    `  exit ${String(result.status)}; ${String(graded["rules_run"])} rule(s) ran, ` +
      `${String(graded["violations"])} violation(s); oob_count ${String(graded["oob_count"])}, ` +
      `oob_amount ${String(graded["oob_amount"])}, overlap_area ${String(graded["overlap_area"])}`,
  )
  // The clearance it graded at, said out loud: the board's own netclass and
  // edge constraint, which is the correct pair and the whole point.
  expect(output).toContain(`edge ${EDGE_CLEARANCE_MM} (board constraint)`)
  expect(result.status).toBe(0)
  expect(graded["oob_count"]).toBe(0)
  expect(graded["oob_amount"]).toBe(0.0)
  expect(graded["overlap_area"]).toBe(0.0)
  expect(graded["violations"]).toBe(0)
  // --require-rules 1 makes "no rule ran" a failure rather than a pass; this
  // asserts the stronger thing, that the five rules with something to check
  // plus legality all ran.
  expect(graded["rules_run"]).toBe(6)
})
test("INTEGRATION, real engine: at --clearance 2.0 the ENGINE re-derives oob_count 4 and oob_amount 12.0", () => {
  // THE CROSS-CHECK THE COMMENT ON `outsideAmount` CLAIMS, actually performed.
  // The previous version of this file asserted the engine's numbers only at the
  // board's own 0.5 mm edge clearance, where BOTH implementations are zero - so
  // the agreement it established was the degenerate one, and the 12.000 mm
  // figure, the only number the TypeScript reimplementation actually produces,
  // rested on a run recorded in prose. That is what this repository objects to
  // on principle, and `check_floorplan.py` takes `--clearance`, so one extra
  // invocation makes the engine re-derive it on every run.
  //
  // NOTHING IS TRANSCRIBED ON EITHER SIDE. The expectation comes from the three
  // approved numbers, and the engine is asked at the same margin; the test
  // compares the two.
  const rule = mountingHoleRule(rules(), RULES)
  const margin = minPartGapMm(rules(), RULES)
  const perEdge = rule.envelopeDiameterMm / 2 - rule.centreInsetMm + margin
  const expectedCount = perEdge > 0 ? rule.count : 0
  const expectedAmount = perEdge > 0 ? perEdge * 2 * rule.count : 0

  const { graded, output, status } = graderSummary(margin)
  console.log(
    `  at --clearance ${margin}: exit ${String(status)}, oob_count ${String(graded["oob_count"])}, ` +
      `oob_amount ${String(graded["oob_amount"])}, oob_area ${String(graded["oob_area"])}`,
  )
  console.log(`  TypeScript derives count ${expectedCount}, amount ${expectedAmount} mm`)
  // THE CLEARANCE IT ACTUALLY USED, from the summary's own structured field
  // rather than from the prose line - the prose prints "clearance 2.0 (cli)"
  // while `String(2)` is "2", so a substring match on it fails for a formatting
  // reason and would tempt someone to loosen the assertion instead.
  expect(graded["clearance_used"]).toEqual({ source: "cli", value: margin })
  expect(graded["edge_clearance_used"]).toEqual({ source: "board constraint", value: EDGE_CLEARANCE_MM })

  // THE ENGINE'S NUMBERS, against the derivation.
  expect(graded["oob_count"]).toBe(expectedCount)
  expect(graded["oob_amount"]).toBeCloseTo(expectedAmount, 6)

  // AND THE TWO IMPLEMENTATIONS AGREE PART BY PART, not just in total - which
  // is what makes this a cross-check of `outsideAmount` rather than of a sum.
  const leaving = partsLeaving(insetBy(outlineBounds(boardText(), BOARD), margin))
  expect(leaving.length).toBe(Number(graded["oob_count"]))
  expect(leaving.reduce((sum, p) => sum + p.amount, 0)).toBeCloseTo(Number(graded["oob_amount"]), 6)

  // The grade FAILS at this margin, and that failure is the engine defect the
  // two tests above pin rather than a defect in the board: `legality` is the
  // only rule that fires, and it fires on the four mounting holes.
  expect(status).toBe(4)
  expect(output).toContain("parts leaving the board outline")
  const byRule = graded["violations_by_rule"] as Record<string, unknown>
  expect(Object.keys(byRule)).toEqual(["legality"])
})

// ---- the resolved intent is bound to the board it came from -----------------

test("a resolved intent records the board it was resolved against", () => {
  // WHY A RESOLVED INTENT HAS TO SAY THIS. It is a separate artifact handed to
  // the engine as a separate argument - `check_floorplan.py <board> --intent
  // <resolved>` - and the engine reads the zone rect and the keepout circles
  // out of it without re-deriving them from the board. Its only reference to a
  // board used to be the `board` path copied from the approved file, so a
  // resolved file left on disk from before an outline change would grade the
  // OLD rectangle against the NEW board and could report a pass: the staleness
  // the fraction construct exists to prevent, one level down.
  const dir = freshTempScratch("pcb-bound-")
  const resolved = path.join(dir, "resolved-intent.json")
  resolveToFile(BOARD, INTENT, resolved, RULES)

  const stamp = verifyResolvedIntent(resolved, BOARD)
  const bounds = outlineBounds(boardText(), BOARD)
  console.log(`  bound to sha256 ${stamp.board_sha256.slice(0, 16)}..., outline [${stamp.outline.join(", ")}]`)
  expect(stamp.outline).toEqual([bounds.x0, bounds.y0, bounds.x1, bounds.y1])
  expect(stamp.size_mm).toEqual([150, 100])
  expect(stamp.board_sha256).toMatch(/^[0-9a-f]{64}$/)

  // The stamp is under `context` and NOT at the top level, because the engine
  // validates its intent schema strictly and refuses an unknown top-level key -
  // measured, `unknown top-level key(s): resolved_against`. A test that only
  // checked the stamp's presence would have passed while the grader refused the
  // file, so this asserts the shape the engine accepts.
  const parsed = JSON.parse(fs.readFileSync(resolved, "utf8")) as Record<string, unknown>
  expect(parsed["resolved_against"]).toBeUndefined()
  expect((parsed["context"] as Record<string, unknown>)["resolved_against"]).toBeDefined()
})

test("a resolved intent from a DIFFERENT board is refused, and one with no stamp is too", () => {
  const dir = freshTempScratch("pcb-stale-")
  const resolved = path.join(dir, "resolved-intent.json")
  resolveToFile(BOARD, INTENT, resolved, RULES)

  // THE STALENESS, reproduced: the same resolved file against a board whose
  // bytes have moved on. Any change to the board makes it a different grading
  // subject - the digest is over the whole file, not just the outline, because
  // a placement is graded against this intent too.
  const moved = path.join(dir, "moved.kicad_pcb")
  fs.writeFileSync(moved, `${boardText()}\n`)
  let message = ""
  try {
    verifyResolvedIntent(resolved, moved)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  console.log(`  stale board refuses: ${message.split("\n")[0] ?? ""}`)
  expect(message).toContain("was resolved against a different")
  expect(message).toContain("make resolve-pt2399-core")

  // AND AN UNSTAMPED FILE IS REFUSED RATHER THAN ACCEPTED. A resolved intent
  // written before this guard existed is exactly the unbound file the guard is
  // about, so treating a missing stamp as "nothing to check" would be the
  // skipped check that reads as a pass.
  const unstamped = path.join(dir, "unstamped.json")
  const parsed = JSON.parse(fs.readFileSync(resolved, "utf8")) as Record<string, unknown>
  const context = { ...(parsed["context"] as Record<string, unknown>) }
  delete context["resolved_against"]
  fs.writeFileSync(unstamped, JSON.stringify({ ...parsed, context }))
  let unbound = ""
  try {
    verifyResolvedIntent(unstamped, BOARD)
  } catch (error) {
    unbound = error instanceof Error ? error.message : String(error)
  }
  expect(unbound).toContain("carries no context.resolved_against")
})

test("INTEGRATION, real engine: the documented grading path resolves first, so a stale intent cannot be used", () => {
  // `make grade-pt2399-core` runs this. The digest makes a stale resolved file
  // DETECTABLE; re-resolving on every grade makes it UNREACHABLE, which is the
  // half that matters since nothing can stop a hand-run of the engine.
  const repoRoot = path.resolve(import.meta.dir, "../..")
  const dir = freshTempScratch("pcb-grade-path-")
  // Plant a stale resolved intent - resolved against a DIFFERENT board - where
  // the grading path will look for it.
  const stale = path.join(dir, "resolved-intent.json")
  const other = path.join(dir, "other.kicad_pcb")
  fs.writeFileSync(other, `${boardText()}\n`)
  resolveToFile(other, INTENT, stale, RULES)
  expect(() => verifyResolvedIntent(stale, BOARD)).toThrow(/resolved against a different/)

  const result = grade(repoRoot, BOARD, INTENT, RULES, dir)
  console.log(`  grade exit ${String(result.status)} after overwriting the planted stale intent`)
  // It overwrote the stale file rather than using it, so the grade is clean and
  // the file now binds to this board.
  expect(result.status).toBe(0)
  expect(() => verifyResolvedIntent(result.resolved, BOARD)).not.toThrow()
  expect(result.output).toContain("PASS: 6 rule(s) ran, no violations")
})
