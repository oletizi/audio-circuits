/**
 * SPEC §3.5's FINDING CONTRACT: the five fields are checked, the CONTENT is not, and a reviewer may
 * not carry a criterion of its own.
 *
 * **WHAT THIS FILE DELIBERATELY DOES NOT TEST, because testing it would be the defect.** There is
 * no assertion about how many findings a report should hold, no list of defect categories a
 * reviewer should have covered, and no check that a particular kind of misreading was found. §3.5:
 * *"a reviewing agent is handed the CRITERION and never the list"*, and `docs/known-gaps.md`
 * **G83** measured what happens otherwise - the source project's reviewer had its categories
 * pre-named and five of twenty findings map onto that list one-to-one. **A test with an expected
 * count or an expected category is that same contamination wearing a test's clothes.**
 */
import { describe, expect, it } from "bun:test"
import {
  FINDING_CLASSES,
  FINDING_KEYS,
  FINDING_SEVERITIES,
  FORBIDDEN_FINDING_KEYS,
  parseFindings,
} from "../../../lib/schgen/readability/finding.ts"

/**
 * A well-formed finding, with `misreading` stated AS the misreading.
 *
 * The sentence is §3.5's own worked example - *"a reader would take this wire as joining C3 to the
 * coil return"* rather than *"this is unclear"* - so the fixture demonstrates the distinction the
 * field exists for instead of merely satisfying a string check.
 */
const FINDING = {
  where: "signal sheet, DEC block, around (120, 64)",
  misreading: "a reader would take this wire as joining C3 to the coil return",
  classification: "readability-problem",
  evidence: "signal.kicad_sch exported at 300 dpi, crop x 110-130 y 55-75",
  severity: "suggestion",
}

const report = (findings: readonly unknown[]): string => JSON.stringify({ findings })
const parsed = (json: string) => parseFindings(json, "fixture.json")

describe("parseFindings", () => {
  it("accepts a well-formed finding - the control case", () => {
    const findings = parsed(report([FINDING]))
    expect(findings.length).toBe(1)
    expect(findings[0]?.classification).toBe("readability-problem")
    expect(findings[0]?.severity).toBe("suggestion")
  })

  it("accepts an EMPTY list and refuses a MISSING one, which are different claims", () => {
    expect(parsed(report([]))).toEqual([])
    expect(() => parsed(JSON.stringify({}))).toThrow(/findings-missing-key/)
  })

  it("refuses a finding carrying a criterion of its own, and says where a proposal belongs", () => {
    for (const key of FORBIDDEN_FINDING_KEYS) {
      expect(() => parsed(report([{ ...FINDING, [key]: "no net may cross a frame edge" }])), key).toThrow(
        /findings-carries-a-criterion/,
      )
    }
    expect(() => parsed(report([{ ...FINDING, criterion: "x" }]))).toThrow(/PROPOSED ADDITION to the standing rule/)
  })

  it("names the criterion clause rather than the unknown-key clause, which is a diagnosis", () => {
    // Both clauses would fire on `criterion`. The criterion one runs first, because "that is not a
    // finding field" sends a reader off to look for a typo in a field that is not a typo.
    expect(() => parsed(report([{ ...FINDING, criterion: "x" }]))).toThrow(/findings-carries-a-criterion/)
    expect(() => parsed(report([{ ...FINDING, sheetNumber: 2 }]))).toThrow(/findings-unknown-key/)
  })

  it("refuses a missing field, a blank field and a non-string field", () => {
    for (const key of FINDING_KEYS) {
      const { [key]: dropped, ...without } = FINDING
      expect(dropped, key).toBeDefined()
      expect(() => parsed(report([without])), key).toThrow(/findings-missing-field/)
      expect(() => parsed(report([{ ...FINDING, [key]: "  " }])), key).toThrow(/findings-blank-field/)
      expect(() => parsed(report([{ ...FINDING, [key]: 3 }])), key).toThrow(/findings-field-type/)
    }
  })

  it("refuses a classification or a severity outside the declared two, and defaults neither", () => {
    expect(() => parsed(report([{ ...FINDING, classification: "cosmetic" }]))).toThrow(/findings-unknown-class/)
    expect(() => parsed(report([{ ...FINDING, severity: "minor" }]))).toThrow(/findings-unknown-severity/)
    expect([...FINDING_CLASSES]).toEqual(["electrical-error", "readability-problem"])
    expect([...FINDING_SEVERITIES]).toEqual(["blocking", "suggestion"])
  })

  it("refuses a verdict or a summary beside the list", () => {
    expect(() => parsed(JSON.stringify({ findings: [], verdict: "pass" }))).toThrow(/findings-unknown-key/)
    expect(() => parsed(JSON.stringify({ findings: [], count: 0 }))).toThrow(/findings-unknown-key/)
  })

  it("refuses malformed input rather than reporting no findings", () => {
    expect(() => parsed("not json")).toThrow(/findings-not-json/)
    expect(() => parsed(JSON.stringify({ findings: "none" }))).toThrow(/findings-not-a-list/)
    expect(() => parsed(report(["a finding"]))).toThrow(/findings-not-an-object/)
  })

  it("carries exactly spec 3.5's five fields and no sixth", () => {
    expect([...FINDING_KEYS]).toEqual(["where", "misreading", "classification", "evidence", "severity"])
  })
})
