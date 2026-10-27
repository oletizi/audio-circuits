import { describe, expect, it } from "bun:test"
import { classOf, worstClass, SchgenRefusal, type Finding, type FindingKind } from "../../lib/schgen/findings.ts"

const f = (kind: FindingKind): Finding => ({ kind, what: "x", where: "y" })

describe("the kind to class mapping is the owner's line", () => {
  it("calls wrong-about-the-circuit kinds defective", () => {
    for (const k of ["short", "split-net", "missing-junction", "nc-contact", "dangling-end",
                     "label-misnames-net", "cross-sheet-disagreement", "reference-disagreement",
                     "geometry-disagrees-with-ir"] as const) {
      expect(classOf(k), `${k} is wrong about the circuit`).toBe("defective")
    }
  })

  it("calls hard-to-read kinds usable, because ugly is not defective", () => {
    for (const k of ["body-clearance", "glyph-clearance", "text-clearance", "field-fallback"] as const) {
      expect(classOf(k), `${k} is crowding, not incorrectness`).toBe("usable")
    }
  })

  it("calls no-geometry kinds not-drawable and broken-invariant kinds generator-defect", () => {
    for (const k of ["no-template-applies", "packing-failed", "paper-exhausted", "circuit-invalid"] as const) {
      expect(classOf(k)).toBe("not-drawable")
    }
    for (const k of ["invariant-violated", "backend-raised"] as const) {
      expect(classOf(k)).toBe("generator-defect")
    }
  })
})

describe("worstClass picks the most serious, and an empty list is usable", () => {
  it("prefers generator-defect over defective over not-drawable over usable", () => {
    expect(worstClass([f("text-clearance"), f("short")])).toBe("defective")
    expect(worstClass([f("short"), f("invariant-violated")])).toBe("generator-defect")
    expect(worstClass([f("text-clearance"), f("paper-exhausted")])).toBe("not-drawable")
    expect(worstClass([f("text-clearance")])).toBe("usable")
  })

  it("is usable for no findings, so a clean drawing needs no special case", () => {
    expect(worstClass([])).toBe("usable")
  })

  it("pins every adjacent pair in the severity order, so swapping any two adjacent classes fails", () => {
    // generator-defect > defective
    expect(worstClass([f("short"), f("invariant-violated")])).toBe("generator-defect")
    // defective > not-drawable - the relation the other tests never exercised. Swapping these
    // two in SEVERITY must turn this red; it is the fix this test exists to drive.
    expect(worstClass([f("paper-exhausted"), f("short")])).toBe("defective")
    // not-drawable > usable
    expect(worstClass([f("text-clearance"), f("paper-exhausted")])).toBe("not-drawable")
  })
})

describe("a refusal declares its class", () => {
  it("carries its findings and is an Error, specifically a SchgenRefusal", () => {
    const r = new SchgenRefusal([f("short")], "a short")
    expect(r).toBeInstanceOf(Error)
    expect(r).toBeInstanceOf(SchgenRefusal)
    expect(r.findings.map((x) => x.kind)).toEqual(["short"])
    expect(worstClass(r.findings)).toBe("defective")
  })
})
