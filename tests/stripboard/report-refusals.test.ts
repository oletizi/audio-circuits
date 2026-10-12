/**
 * What `renderReport` REFUSES, and the two scans over the two modules.
 *
 * SPLIT FROM `./report.test.ts` BY CONCERN - that file drives what a report
 * says and this one drives what it will not say - over the shared
 * `./report-fixtures.ts`.
 *
 * **EVERY REFUSAL HERE IS A WIRING DEFECT THE PER-LINK TESTS CANNOT SEE**: a
 * bound naming a rule the search could not have returned, a binding constraint
 * naming a different rule from the one that fired, a run and a rules file that
 * are not the pair being reported, a deciding parameter whose standing nobody
 * recorded, and a candidate beneath its own derived floor. Each is checked for
 * naming what is missing, where to fix it, and why it is not defaulted.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { renderReport } from "../../tools/stripboard/report.ts"
import { bareLiteral } from "./bare-literal.ts"
import { LOW_BOOST, TARGETS, evaluation } from "./stop-fixtures.ts"
import { RULES, TOLERANCE_RULES, clusteredCandidate, reportInput, runResult } from "./report-fixtures.ts"

const MODULES = ["report.ts", "report-model.ts"].map((name) =>
  path.join(import.meta.dir, "..", "..", "tools", "stripboard", name),
)

test("a within-tolerance bound with tau unset is refused as a rule that could not have fired", () => {
  // Q2 returns false while tau is null (CRITERIA K4), so this pair is a bound
  // naming a rule evaluateStop did not return - one of the three wiring
  // defects CHECKPOINT 2 exists to catch, made unreachable here instead.
  expect(RULES.tau).toBeNull()
  expect(() => renderReport(reportInput({ rule: "Q2" }))).toThrow(
    /report-tolerance-without-tau/,
  )
  expect(() => renderReport(reportInput({ rule: "Q2" }))).toThrow(/stripboard\/rules\.json/)
  expect(() => renderReport(reportInput({ rule: "Q2" }))).toThrow(/NOT defaulted/)
  // With a tolerance supplied it renders, so the refusal is about the pair and
  // not about Q2.
  expect(renderReport(reportInput({ rule: "Q2", rules: TOLERANCE_RULES })).join("\n")).toMatch(
    /^bound: within-tolerance/m,
  )
})

test("a search-stopped binding naming another rule is refused, and the agreeing one renders", () => {
  // REP4: the bound field and the named binding constraint must agree in ONE
  // report, and this binding is also the evidence K3 requires before
  // kappa_bench may move.
  const mismatched = reportInput({
    run: runResult({ best: clusteredCandidate() }),
    rule: "Q3",
    binding: { kind: "search-stopped", rule: "Q5" },
  })
  expect(() => renderReport(mismatched)).toThrow(/report-binding-rule-disagrees/)
  expect(() => renderReport(mismatched)).toThrow(/REP4/)
  const agreeing = reportInput({
    run: runResult({ best: clusteredCandidate() }),
    rule: "Q5",
    binding: { kind: "search-stopped", rule: "Q5" },
  })
  const joined = renderReport(agreeing).join("\n")
  expect(joined).toMatch(/The search stopped under Q5/)
  // Said plainly as the search having stopped rather than as a constraint.
  expect(joined).not.toMatch(/binding constraint is/)
})

test("a constraint that DID bind reaches the report as one, with its board and net pair", () => {
  const joined = renderReport(
    reportInput({
      run: runResult({ best: clusteredCandidate() }),
      binding: {
        kind: "span",
        board: "pultec-mid",
        nets: ["VBIAS", "OUT"],
        bound: "maxSpanHoles",
      },
    }),
  ).join("\n")
  expect(joined).toMatch(/The binding constraint is maxSpanHoles on pultec-mid/)
  expect(joined).toMatch(/VBIAS/)
})

test("a run and a rules file that disagree about E3 are refused rather than reconciled", () => {
  const claimsItRan = reportInput({ run: runResult({ worseAcceptanceRan: true }) })
  expect(() => renderReport(claimsItRan)).toThrow(/report-worse-acceptance-disagrees/)
  expect(() => renderReport(claimsItRan)).toThrow(/tools\/stripboard\/search\.ts/)
  const claimsItDidNot = reportInput({ rules: { ...RULES, worseAcceptance: 1 } })
  expect(() => renderReport(claimsItDidNot)).toThrow(/report-worse-acceptance-disagrees/)
})

test("a deciding parameter with no recorded note is refused, not printed bare", () => {
  // OB3's mechanism: a number used silently is the failure. A value whose
  // standing nobody recorded is exactly the one that must not decide an
  // outcome unremarked. The loader refuses such a file, so only a hand-built
  // rules object reaches here.
  const unrecorded = reportInput({ rule: "Q3", rules: { ...RULES, notes: {} } })
  expect(() => renderReport(unrecorded)).toThrow(/report-parameter-unrecorded/)
  expect(() => renderReport(unrecorded)).toThrow(/"seeds"/)
  expect(() => renderReport(unrecorded)).toThrow(/loadRules/)
})

test("a candidate beneath its own derived floor is refused rather than reported", () => {
  // K5: F_floor is a LOWER bound, so this is proof that the floor derivation,
  // the scorer or the dump is not the quantity it claims to be. While tau is
  // null no verdict arithmetic touches the gap, so this report is the only
  // reading left on that path.
  const beneath = reportInput({ targets: { ...TARGETS, cutFloor: 3 } })
  expect(() => renderReport(beneath)).toThrow(/report-negative-gap/)
  expect(() => renderReport(beneath)).toThrow(/not clamped to zero/)
  // And the same candidate against its real floor renders.
  expect(renderReport(reportInput()).join("\n")).toMatch(/gap above the floor = 1/)
})

test("a run with no climb refuses on F_0 when tau is set, rather than inventing one", () => {
  // The report reads F_0 off the first climb. With no climb and a tolerance to
  // compute, verdict.ts refuses - and that refusal is its own, not papered
  // over here.
  const noClimb = reportInput({
    run: { ...runResult(), climbs: [] },
    rule: "Q2",
    rules: TOLERANCE_RULES,
  })
  expect(() => renderReport(noClimb)).toThrow(/verdict-no-initial-objective/)
})

test("A4 refuses a low-boost run that did not say which of the two boards it was", () => {
  const unstated = reportInput({
    targets: LOW_BOOST,
    frozen: undefined,
  })
  expect(() => renderReport(unstated)).toThrow(/verdict-board-unstated/)
  // Stated, the report says which clause it met - V3's requirement.
  const scaffolded = renderReport(
    reportInput({ targets: LOW_BOOST, frozen: false }),
  ).join("\n")
  expect(scaffolded).toMatch(/B1-current/)
  expect(scaffolded).not.toMatch(/B1-frozen/)
})

test("a literal scan finds no bare threshold in either report module - a scan, not a proof", async () => {
  // The per-module half of V9, with the same pattern Task 22 sweeps the tree
  // with. The behavioural half is elsewhere: every figure these modules print
  // comes from the rules object or the targets, so it moves when they move.
  for (const module of MODULES) {
    const text = await Bun.file(module).text()
    expect([...text.matchAll(bareLiteral())].map((match) => match[0]), module).toEqual([])
  }
})

test("both report modules are within this repository's line ceiling", async () => {
  for (const module of MODULES) {
    const text = await fs.promises.readFile(module, "utf8")
    expect(text.split("\n").length, module).toBeLessThan(501)
  }
})

test("the fixtures' hand-built candidate is a whole Evaluation, not a cast", () => {
  // The shape guard score.ts installs: a hand-built score reaches these tests
  // through stop-fixtures' evaluation(), which carries every field.
  const score = evaluation({ cuts: 1, occupied: 9 }).score
  expect(Object.keys(score).sort()).toEqual([
    "clustering",
    "cuts",
    "joins",
    "netCount",
    "objective",
    "occupied",
    "pinCount",
    "solder",
    "wires",
  ])
})
