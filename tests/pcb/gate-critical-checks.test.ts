/**
 * THE CONTRACT THAT THE THREE GATE-CRITICAL DRC CHECKS CANNOT BE MADE VACUOUS.
 *
 * `items_not_allowed`, `courtyards_overlap` and `missing_courtyard` are what the
 * hardware-envelope mechanism is built on - keeping copper and parts out of the
 * mounting-hole envelope - and nothing else checks that envelope.
 * `REQUIRED_ACTIVE_CHECKS` in `tools/pcb/drc-report.ts` exists to stop a project
 * disabling them, and its own comment states the purpose: "setting any of them
 * to 'ignore' makes that gate pass vacuously, so each is refused."
 *
 * WHAT WAS MEASURED, AND WHY THIS FILE IS SEPARATE FROM `./drc.test.ts`.
 * `ignore` was not the only vacuous setting. `tools/pcb/drc-policy.ts` failed on
 * `errorViolations` only - its own header table said "warnings and exclusions
 * are counted and reported, not failed" - so setting any of the three to
 * `warning` produced violations that were counted and NOT failed. That is the
 * same vacuous pass, reached through a setting KiCad presents as enabled, and
 * `drc-report.ts`'s own refusal text recommended it in so many words: it told
 * the reader to set each of them to `"error" or "warning"`.
 *
 * THREE MECHANISMS NOW HOLD IT, in three different files, and the contract is
 * gathered here rather than split across their test files because no one of them
 * is sufficient alone:
 *
 *  1. SOUNDNESS - `verdictOf` fails a violation of one of these types at ANY
 *     severity. This is the one that matters, and it lives in the policy because
 *     the report is the authority: a report can come from a run whose severities
 *     disagree with any project file on disk.
 *  2. READABILITY - `parseReport` requires a string `type` on every item, since
 *     a type-scoped policy that cannot read a type would silently treat the item
 *     as not one of the three.
 *  3. FAIL-FAST - `verifyFabStandard` requires all three at `error` in the
 *     project's `rule_severities`, which is the only place the severity is
 *     knowable BEFORE a run: an absence of violations cannot tell you what
 *     severity they would have carried.
 *
 * NONE OF THIS IS A NEW TOLERANCE. `docs/standards/pcbway-fab-rules.md` requires
 * the three active, and the plan's Task 8 Step 4 table specifies both
 * hardware-envelope mechanisms at `error`. These tests enforce what is already
 * written down.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { parseReport, REQUIRED_ACTIVE_CHECKS, SEVERITIES } from "../../tools/pcb/drc-report.ts"
import { verdictOf } from "../../tools/pcb/drc-policy.ts"
import { verifyFabStandard, REQUIRED_CHECK_SEVERITY } from "../../tools/pcb/fab-standard.ts"
import { DrcRefusal } from "../../tools/pcb/drc-refusal.ts"

afterAll(cleanUpTempScratch)

const FIXTURES = path.resolve(import.meta.dir, "../fixtures/pcb")
const PROJECT = path.resolve(import.meta.dir, "../../circuits/pt2399-core/pt2399-core.kicad_pro")

const CLEAN_REPORT = {
  kicad_version: "10.0.5",
  included_severities: ["error", "warning", "exclusion"],
  ignored_checks: [],
  schematic_parity: [],
  violations: [],
  unconnected_items: [],
}

function report(over: Record<string, unknown>): ReturnType<typeof parseReport> {
  return parseReport(JSON.stringify({ ...CLEAN_REPORT, ...over }), "test")
}

function refusalOf(body: () => unknown): DrcRefusal {
  try {
    body()
  } catch (error) {
    if (error instanceof DrcRefusal) return error
    throw error
  }
  throw new Error("expected a DrcRefusal but nothing was thrown")
}

// ---- 1. SOUNDNESS: the policy fails these types at every severity -----------

test("a gate-critical violation FAILS at every severity, not only at error", () => {
  // THE FAILURE THIS CLOSES, driven over the whole cross product rather than
  // sampled: `warning` was the setting that passed, and `exclusion` is the other
  // one the policy counts without failing.
  for (const type of REQUIRED_ACTIVE_CHECKS) {
    for (const severity of SEVERITIES) {
      const verdict = verdictOf(report({ violations: [{ type, severity }] }), { routed: false })
      expect({ type, severity, pass: verdict.pass }).toEqual({ type, severity, pass: false })
      expect(verdict.counts.requiredCheckViolations).toBe(1)
      // The failure NAMES the check and its severity, so a reader is not left to
      // infer which of the three fired.
      expect(verdict.failures.join("\n")).toContain(`${type} (${severity})`)
      expect(verdict.failures.join("\n")).toContain("ANY severity")
    }
  }
})

test("the policy does NOT over-reach: an ordinary warning-severity violation is still counted, not failed", () => {
  // The tolerance the second row of drc-policy.ts's table deliberately keeps. If
  // this went red, the fix above would have turned every warning into a failure
  // rather than the three it is about.
  const verdict = verdictOf(report({ violations: [{ type: "silk_overlap", severity: "warning" }] }), { routed: false })
  expect(verdict.pass).toBe(true)
  expect(verdict.counts.warningViolations).toBe(1)
  expect(verdict.counts.requiredCheckViolations).toBe(0)
})

test("an error-severity gate-critical violation is reported under BOTH failures, not one instead of the other", () => {
  // The counts overlap rather than partition, and the two failure lines say
  // different things: one is what the board failed on, the other is why its
  // severity could not have excused it.
  const verdict = verdictOf(
    report({ violations: [{ type: "courtyards_overlap", severity: "error" }] }),
    { routed: false },
  )
  expect(verdict.pass).toBe(false)
  expect(verdict.counts.errorViolations).toBe(1)
  expect(verdict.counts.requiredCheckViolations).toBe(1)
  expect(verdict.failures.length).toBe(2)
})

test("a clean report still passes, so the new failure is not unconditional", () => {
  const verdict = verdictOf(report({}), { routed: false })
  expect(verdict.pass).toBe(true)
  expect(verdict.counts.requiredCheckViolations).toBe(0)
})

// ---- 2. READABILITY: a type that cannot be read is refused ------------------

test("a violation with no readable type is REFUSED, not treated as not-gate-critical", () => {
  for (const bad of [undefined, null, 7, "", {}]) {
    const entry = bad === undefined ? { severity: "error" } : { type: bad, severity: "error" }
    const refusal = refusalOf(() => report({ violations: [entry] }))
    expect(refusal.guard).toBe("report-shape")
    expect(refusal.message).toContain("type")
  }
})

test("the type requirement covers all three report arrays, so none of them can carry an unreadable item", () => {
  for (const key of ["schematic_parity", "violations", "unconnected_items"]) {
    const refusal = refusalOf(() => report({ [key]: [{ severity: "warning" }] }))
    expect(refusal.guard).toBe("report-shape")
  }
})

// ---- 3. FAIL-FAST: the project must set all three to error ------------------

/** The pt2399-core project with one edit applied, written to a scratch path. */
function editedProject(edit: (severities: Record<string, unknown>) => void): string {
  const dir = freshTempScratch("pcb-severity-test-")
  const parsed: unknown = JSON.parse(fs.readFileSync(PROJECT, "utf8"))
  if (typeof parsed !== "object" || parsed === null) throw new Error(`${PROJECT} is not a JSON object`)
  const project = parsed as Record<string, unknown>
  const board = (project["board"] ?? {}) as Record<string, unknown>
  const settings = (board["design_settings"] ?? {}) as Record<string, unknown>
  const severities = (settings["rule_severities"] ?? {}) as Record<string, unknown>
  edit(severities)
  settings["rule_severities"] = severities
  const out = path.join(dir, "edited.kicad_pro")
  fs.writeFileSync(out, JSON.stringify(project))
  return out
}

test("the committed project is accepted, so the three are at error today", () => {
  verifyFabStandard(PROJECT)
  // And the committed fixtures the DRC tests run against, which must agree.
  for (const fixture of ["good", "wrong-net"]) {
    verifyFabStandard(path.join(FIXTURES, fixture, "pair.kicad_pro"))
  }
})

test("downgrading any of the three to warning, ignore or nothing at all is REFUSED before a run", () => {
  for (const check of REQUIRED_ACTIVE_CHECKS) {
    for (const value of ["warning", "ignore", "exclusion"]) {
      const refusal = refusalOf(() => verifyFabStandard(editedProject((s) => void (s[check] = value))))
      expect(refusal.guard).toBe("project-config")
      expect(refusal.message).toContain(check)
      expect(refusal.message).toContain(value)
    }
    // ABSENT IS NOT ENABLED. KiCad ignores missing_courtyard by default, so a
    // key that is simply not there is the realistic form of this defect.
    const refusal = refusalOf(() => verifyFabStandard(editedProject((s) => void delete s[check])))
    expect(refusal.guard).toBe("project-config")
    expect(refusal.message).toContain(check)
    expect(refusal.message).toContain("no value")
  }
})

test("the warning case says why warning in particular is the dangerous one", () => {
  const refusal = refusalOf(() =>
    verifyFabStandard(editedProject((s) => void (s["courtyards_overlap"] = "warning"))),
  )
  expect(refusal.message).toContain("counted rather than failed")
  expect(refusal.message).toContain(REQUIRED_CHECK_SEVERITY)
})

// ---- the refusal text no longer recommends the vacuous setting --------------

test("the ignored-checks refusal tells the reader to set error, and not to set warning", () => {
  const refusal = refusalOf(() => report({ ignored_checks: [{ key: "missing_courtyard", description: "x" }] }))
  expect(refusal.guard).toBe("ignored-checks")
  // It still mentions the word, but only to say NOT to use it - so this asserts
  // the recommendation rather than the absence of a substring.
  expect(refusal.message).toContain('"error" - NOT "warning" -')
  expect(refusal.message).not.toContain('"error" or "warning"')
  expect(refusal.message).toContain("counted rather than failed")
})
