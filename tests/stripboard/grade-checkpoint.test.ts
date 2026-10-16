import { test, expect } from "bun:test"
import { a1, gradeHardConstraints } from "../../tools/stripboard/grade.ts"
import { hc6 } from "../../tools/stripboard/constraints.ts"
import { checkpointInput, primeCheckpointNetlists } from "./checkpoint-fixtures.ts"

/**
 * CHECKPOINT 1, as a STANDING test: a checkpoint run once is a checkpoint that
 * stops holding.
 *
 * This is the first place all ten hard constraints meet, and every fixture in
 * `tests/fixtures/stripboard/negative/` is hand-written dump text or a single
 * capture. A committed, hand-laid layout that passes `make check` today is the
 * first evidence the grader is pointed at reality rather than at its own
 * fixtures.
 *
 * WHY THE SET IS TWO BOARDS AND NOT THE PLAN'S FOUR: see
 * `./checkpoint-fixtures.ts`, which names each exclusion and its cause. Neither
 * exclusion is a board that failed.
 */

test("CHECKPOINT: transistor-preamp-feedback has all ten hard constraints hold", async () => {
  // GROUND TRUTH. A board somebody laid out by hand, that passes `make check`,
  // and that the grader must not refuse. If this fails, the constraint that
  // refused it is either wrong or has found something real - OB4's own
  // reasoning: "a built board that violates a hard constraint is exactly the
  // signal that a constraint is wrong". Do not relax the constraint; record the
  // board, the constraint and the detail, and take it to the owner.
  await primeCheckpointNetlists()
  const results = gradeHardConstraints(checkpointInput("transistor-preamp-feedback"))
  const failed = results.filter((result) => !result.held)
  expect(
    failed.map((result) => `${result.id}: ${result.detail}`),
    "a hand-laid board that passes make check must not be refused",
  ).toEqual([])
  expect(a1(results)).toBe(true)

  // READ THE OUTPUT, not only the assertion: the figures each constraint
  // actually measured, so a pass that checked nothing is visible. These are the
  // board's own numbers, recorded in docs/stripboard/pipeline-verification.md.
  const detailOf = (id: string): string =>
    results.find((result) => result.id === id)?.detail ?? ""
  expect(detailOf("HC2")).toMatch(/5 derived cut/)
  expect(detailOf("HC3")).toMatch(/all 16 placed part/)
  expect(detailOf("HC6")).toMatch(/16 x 18 holes, fits the stock 34 x 27/)
  expect(detailOf("HC6")).toMatch(/all 61 required features/)
  expect(detailOf("HC8")).toMatch(/all 11 reference nets/)
  expect(detailOf("HC10")).toMatch(/all 16 placed part/)
})

test("CHECKPOINT: pt2399-core REFUSES, and the refusal is the checkpoint passing", async () => {
  // Expected to refuse, on two conflicts the criteria already record from the
  // owner himself. WHAT WOULD BE A FAILURE IS pt2399-core GRADING ADMISSIBLE,
  // because that means HC6's or PAR2's refusal is not wired in.
  await primeCheckpointNetlists()
  const input = checkpointInput("pt2399-core")

  // PAR2 refuses BY NAME, and the name is the footprint rather than the part:
  // twelve of its twenty-four placed parts carry one of two capacitor
  // footprints listed in UNSOURCED precisely so they refuse here.
  expect(() => gradeHardConstraints(input)).toThrow(/C_Disc_D5\.0mm_W2\.5mm_P2\.50mm/)
  expect(() => gradeHardConstraints(input)).toThrow(/no lead span is recorded/)

  // OB4: its extent does not fit the declared stock, and the detail names BOTH
  // figures. Graded through hc6 directly, because PAR2 refuses the whole table
  // earlier - which is why each constraint is exported on its own.
  const extent = hc6(input)
  expect(extent.held).toBe(false)
  expect(extent.detail).toMatch(/17 x 36 holes/)
  expect(extent.detail).toMatch(/stock 34 x 27/)
  expect(extent.detail).toMatch(/36 columns needed against 27/)
})

test("CHECKPOINT: the one board that holds is not holding because it was graded leniently", async () => {
  // THE CONTROL FOR THE CONTROL. A single all-hold board proves the grader can
  // pass something; it does not prove the grader can fail that same board. So
  // the SAME input is perturbed in one place and must refuse - otherwise "all
  // ten hold on a real board" is a statement about the grader's appetite rather
  // than about the board.
  await primeCheckpointNetlists()
  const input = checkpointInput("transistor-preamp-feedback")
  expect(a1(gradeHardConstraints(input))).toBe(true)

  // Shrink the stock to one column less than the board's measured extent of 18.
  const tight = { ...input, stock: { rows: 34, cols: 17, source: "board" as const } }
  const results = gradeHardConstraints(tight)
  const hc6Result = results.find((result) => result.id === "HC6")
  expect(hc6Result?.held, hc6Result?.detail).toBe(false)
  expect(a1(results)).toBe(false)
})
