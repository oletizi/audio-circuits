## Task 1: The vocabulary

**Files:** create `lib/schgen/findings.ts`, `tests/schgen/findings.test.ts`; modify `tools/schgen/port-manifest.json`.

**Produces:**

```ts
/** What a refusal says about the artifact. The spec's four classes. */
export type RefusalClass = "usable" | "defective" | "not-drawable" | "generator-defect"

/** A closed union. Adding a kind without a class must fail the compiler. */
export type FindingKind =
  // wrong about the circuit
  | "short" | "split-net" | "missing-junction" | "nc-contact" | "dangling-end"
  | "label-misnames-net" | "cross-sheet-disagreement" | "reference-disagreement"
  // hard to read
  | "body-clearance" | "glyph-clearance" | "text-clearance" | "field-fallback"
  // no geometry
  | "no-template-applies" | "packing-failed" | "paper-exhausted" | "circuit-invalid"
  // this generator is broken
  | "invariant-violated" | "backend-raised"

export interface Finding {
  readonly kind: FindingKind
  readonly what: string
  readonly where: string
}

export function classOf(kind: FindingKind): RefusalClass
export function worstClass(findings: readonly Finding[]): RefusalClass

/** A refusal that declares its class. An untyped Error reaching the census is a generator-defect. */
export class SchgenRefusal extends Error {
  readonly findings: readonly Finding[]
  constructor(findings: readonly Finding[], message: string)
}
```

**The mapping principle, which is the owner's and not the implementer's:** *wrong about the circuit* → `defective`; *hard to read* → `usable`; *no geometry* → `not-drawable`; *invariant broken* → `generator-defect`. A kind that is genuinely ambiguous is `defective` — a drawing wrongly withheld costs a look, one wrongly shipped costs a build.

- [ ] **Step 1: Write the failing tests.**

```ts
import { describe, expect, it } from "bun:test"
import { classOf, worstClass, SchgenRefusal, type Finding, type FindingKind } from "../../lib/schgen/findings.ts"

const f = (kind: FindingKind): Finding => ({ kind, what: "x", where: "y" })

describe("the kind to class mapping is the owner's line", () => {
  it("calls wrong-about-the-circuit kinds defective", () => {
    for (const k of ["short", "split-net", "missing-junction", "nc-contact", "dangling-end",
                     "label-misnames-net", "cross-sheet-disagreement", "reference-disagreement"] as const) {
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
})

describe("a refusal declares its class", () => {
  it("carries its findings and is an Error", () => {
    const r = new SchgenRefusal([f("short")], "a short")
    expect(r).toBeInstanceOf(Error)
    expect(r.findings.map((x) => x.kind)).toEqual(["short"])
    expect(worstClass(r.findings)).toBe("defective")
  })
})
```

- [ ] **Step 2: Run them; confirm they fail on the missing module.**
- [ ] **Step 3: Implement.** `classOf` must be exhaustive over `FindingKind` with no `default` arm, so adding a kind without a class is a compile error. State that in the doc comment as the mechanism, not as a style choice.
- [ ] **Step 4:** tests pass; `bun run typecheck` exit 0.
- [ ] **Step 5:** add both new files to `handWritten` in `tools/schgen/port-manifest.json`, sorted.
- [ ] **Step 6:** full suite — expect `Ran 3887 + <your test count>`. Report the number you get.
- [ ] **Step 7:** commit.

---

