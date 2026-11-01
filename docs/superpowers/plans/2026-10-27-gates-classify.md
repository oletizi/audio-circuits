# Gates classify, they do not hide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** every board produces an artifact a person can open, carrying its class — and the three transistor-preamp drawings nobody has ever seen become visible.

**Spec:** `docs/superpowers/specs/2026-10-27-gates-ratify-they-do-not-hide-design.md` (revision 4). Read it first. Its authority is `docs/known-gaps.md` **G303**.

**Architecture:** a refusal becomes a typed error carrying a class; geometry survives the chain instead of dying at `adapt.ts:367`; the census classifies at the one `catch` every refusal already passes through, and writes an artifact for every board.

## Why this plan gives interfaces and tests rather than finished implementations

**The previous plan's Task 1 shipped a code block that an independent review refuted** — a corner counter that overcounted every star hub, written confidently into a plan and transcribed faithfully. `docs/superpowers/plans/2026-10-27-schematic-in-the-build-guide-execution/` records it. **A plan is a good place to state an interface and a failing test; it is a bad place to assert an algorithm nobody has run.** Where this plan gives code it is a type or a test. Bodies are the implementer's, against the tests here.

## Global Constraints

- **Suite baseline `Ran 3889`, 0 fail**, with `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`. Account for every change term by term; `pass + fail == Ran` does not catch a throwing `beforeAll`.
  > **This said `3887` and was stale by two, caught by Task 1's implementer MEASURING it rather than trusting it** - it reverted its own files, re-ran against `da8c6e3`, got 3889, and reported both numbers instead of forcing a match. The two came from `23ef67a`, the previous plan's final fix wave, after this writer last measured. **A test count in prose is a transcription with a date on it, in the very section that says to account for it term by term.**
- **`tests/schgen/decomposition-probe.test.ts` is a load-dependent timeout flake.** If only it fails, re-run it alone. Not yours to fix.
- **A new `.ts` under `lib/schgen/`, `tests/schgen/` or `tools/schgen/` must be declared in `tools/schgen/port-manifest.json`'s `handWritten`** or `tests/schgen/port-fidelity.test.ts` fails.
- **NEVER bypass typing.** No `any`, `as T`, `as unknown`, `@ts-ignore`, `!`.
- **Imports are relative with the `.ts` extension.**
- **Refusals teach:** every `throw` names what is missing, where to fix it, why it is not defaulted.
- **Files 300-500 lines.**
- **`docs/known-gaps.md` is FROZEN** — owner decisions only.
- **Commit only paths you changed.** Never `git add -A`.
- **No `#` in bash heredocs**; use Write and `git commit -F`. **No `sed` writes.**

---

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
- [ ] **Step 6:** full suite — expect `Ran 3889 + <your test count>`. Report the number you get.
- [ ] **Step 7:** commit.

---

## Task 2: The checkers return findings

**Files:** modify `lib/schgen/render/layout-check.ts`, `lib/schgen/render/text-scene.ts`, `lib/schgen/render/sheet-check.ts`, and their callers.

**`checkLayout` returns `string[]` today (`layout-check.ts:191`), mixing shorts, split nets, dangling ends, NC contact, body clearance, glyph clearance and text clearance.** A class cannot be read off a sentence. Same for `textProblems` (`text-scene.ts:182`) and `assertSheetSafe` (`sheet-check.ts:83`).

**`assertSheetSafe` already splits the two groups** — `wire safety` (shorts, dangling ends) and `body clearance` — which is the owner's line already present in the code. Preserve that split as `kind`s; do not re-derive it.

- [ ] **Step 1:** change each producer to return `readonly Finding[]`. Keep the human-readable message in `Finding.what` verbatim, so no refusal text changes.
- [ ] **Step 2:** callers keep throwing, built from the findings. **Behaviour must not change in this task** — same boards refuse, same messages.
- [ ] **Step 3: prove it.** Capture `bun tools/schgen/board-sheets.ts` before and after, filtered of the non-deterministic temp-dir line, and `diff` them. **An empty diff is the deliverable.** If it is not empty you changed behaviour; fix that rather than accepting it.
- [ ] **Step 4:** typecheck; full suite at the Task 1 total; commit.

---

## Task 3: The geometry survives

**Files:** modify `lib/schgen/render/block-types.ts`, `lib/schgen/elk/adapt.ts`, `lib/schgen/render/blocks.ts`, `lib/schgen/render/bus.ts`, `lib/schgen/render/sheets.ts`, `lib/schgen/render/sheet-types.ts`, `tools/schgen/generate.ts`.

**This is the task the whole plan turns on, and the one an earlier revision of the spec got wrong twice.**

```
adapt.ts:294   const layout: BlockLayout = { ... }        geometry exists
adapt.ts:331   checked: null,                             junction arm discards it
adapt.ts:362   checked: layout,                           clearance arm keeps it
adapt.ts:367   return adaptElkLayoutReported(...).result  and HERE it is dropped
```

`RealiseResult`'s false arm carries `Mismatch` and no layout (`block-types.ts:151`).

- [ ] **Step 1:** widen `RealiseResult`'s false arm to carry the layout when one exists, and `adapt.ts:331` to pass `checked: layout`.
- [ ] **Step 2:** propagate through `elkBackendFrom` → `realiseBlock`/`renderBlock` → `layoutSheet` → `SheetDrawing` → `Generation`. `SheetDrawing` gains `findings`; `Generation` gains generation-level `findings`, because `assertRefsMatchDrawings` and `assertCrossSheet` (`generate.ts:368`, `:377`) belong to no single sheet.
- [ ] **Step 3: the sheet-level gates get non-throw paths.** `sheets.ts:258-259` — `assertSheetSafe` and `assertTextClear`. **Without this the preamp boards simply refuse later and nothing visible changes**; that is precisely what disproved an earlier prediction.
- [ ] **Step 4: a partial multi-sheet generation is kept.** When a later sheet fails, the sheets already drawn are retained.
- [ ] **Step 5:** typecheck; full suite. **Expect boards to move.** Record which, and do not adjust anything to keep the old numbers.
- [ ] **Step 6:** commit.

---

## Task 4: The census classifies, and every board gets an artifact

**Files:** modify `tools/schgen/board-sheets.ts`; create `tests/schgen/board-status.test.ts`.

**`board-sheets.ts:185` is the one `catch` every refusal already passes through.** It reads `caught.message` and calls everything `refused` — a classifier that cannot tell a gate from a `TypeError`.

- [ ] **Step 1:** `BoardSheets.outcome` becomes the four classes. A `SchgenRefusal` is classified by `worstClass(findings)`. **An untyped `Error` is `generator-defect`.**
- [ ] **Step 2:** a durable, gitignored output directory, one artifact per board, replaced wholly each run. A `not-drawable` board gets a **one-page refusal sheet** naming the board and the reason — not a drawing, and not nothing.
- [ ] **Step 3:** the census asserts its rows cover `BOARDS` exactly. `tests/schgen/board-declarations.test.ts:48` anchors `BOARDS.length` at 11.
- [ ] **Step 4: the committed expectations, which the run may disagree with.** Write them as a test:
  - `pultec-mid` is `not-drawable`
  - **no board is `generator-defect`** — if one is, that is a bug report, not a status
  - every other board produces a drawing (`usable` or `defective`)
  - **no usable/defective split is predicted.** Record what the run reports.
- [ ] **Step 5: LOOK AT THE THREE DRAWINGS.** Render `transistor-preamp-buffered`, `-loop` and `-staged`, read each PNG with the Read tool, and describe what you see in your own words. **This is the deliverable of the whole plan** — three drawings nobody has ever seen. A passing test is not evidence that a page is worth looking at.
- [ ] **Step 6:** typecheck; full suite; commit.

---

## Task 5: The two marks

**Files:** modify `lib/schgen/render/emit.ts`, `tools/schgen/generate.ts`; create a defective fixture and `tests/schgen/watermark.test.ts`.

- [ ] **Step 1: a watermark**, graphic text in the `.kicad_sch`. **Possible to read, not easy** — heavy enough that nobody mistakes the sheet for a build document, light enough to examine the geometry underneath.
- [ ] **Step 2: a title-block comment field.** `emitContext` already takes `titleComments` with `MAX_COMMENTS = 9` (`emit.ts:61`); reserve one for status.
- [ ] **Step 3: obligation 5.** `adapt.ts:29` forbids altering geometry after the last clearance check. The mark is exempt because **it is not circuit geometry** — no net, no pin, no connectivity. Write that reason at the site; a sheet must never be refused for its own warning.
- [ ] **Step 4: a deliberately defective fixture**, since zero real boards are expected defective and no test over real boards would exercise the mark at all. Prove the mark is emitted, survives `kicad-cli` PDF export, and leaves the drawing inspectable underneath.
- [ ] **Step 5: both directions, over all eleven.** A `defective` sheet carries both marks; a `usable` one carries neither.
- [ ] **Step 6: RENDER THE DEFECTIVE FIXTURE AND LOOK AT IT.** Read the PNG. Is the warning unmissable? Is the drawing still readable underneath? Report what you see; the owner accepts the weight by looking.
- [ ] **Step 7:** typecheck; full suite; commit.

---

## Done

- Every board in `BOARDS` has an artifact on disk a person can open, carrying its class.
- The committed expectations hold, or their failures are reported as findings.
- `bun run typecheck` clean; `bun test` 0 fail; `Ran` accounted for term by term.
- **The owner has looked at the three transistor-preamp drawings and can say whether the gates that hid them were right.** Code cannot satisfy this one.
