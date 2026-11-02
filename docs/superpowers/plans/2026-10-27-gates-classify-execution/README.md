# Execution record: gates classify, they do not hide

**This is not findings and it does not bind.** It is the decision record and audit trail of one
plan, committed because `CLAUDE.md` requires it — `.superpowers/` is gitignored and one
`git clean -fdx` from gone. What binds is the code, the tests and the tools.

**ONE THING HERE IS A FINDING AND IT IS FIRST, because it existed in no committed file until this
one and it is the reason the whole reform was built.**

---

## THE FINDING: the clearance gate refuses the wrong thing

The owner, 2026-10-27, after four gate-bypass attempts produced no picture:

> *"this is a persistent pathology: a gate halts rendering and we never look at the picture so we
> can't tell if the gate is insane or not"*

**The reform made the drawings visible. The first look answered his question, and the answer is
that the gate is wrong.**

`transistor-preamp-buffered` was hidden from every person and every census for the whole life of
this generator, for one reason: **a `VCC` label brushing Q1's pin-2 number.** Rendered and read at
140 dpi, *both are perfectly legible.*

On that same sheet, `R4`'s value reads **`1●5K`** — a wire and a junction dot pass through where
the decimal point belongs, so **`1.5K` and `15K` are indistinguishable.** At a bench that is the
difference between a working bias and a dead stage. **That one passes**, because it is a fallback
field placement, which classifies `usable` and refuses nothing. On `-loop`, `R5 4.6K` and
`C4 100uF` are struck through by wires the same way.

**39 fallback field placements across 9 boards. None of them gated.**

So the gate withholds readable drawings over near-touches of legible items, and ships text a person
cannot read. Reproduce with `bun run tools/schgen/board-geometry.ts` and
`bun tools/schgen/board-sheets.ts`; the artifacts are at `build/schgen-boards/<board>/`.

**Fixing a gate is OUT OF SCOPE by the spec, deliberately** — the reform exists so the question can
be asked with the drawing in hand instead of from a refusal message. It now can be, and it is the
owner's to raise. `docs/known-gaps.md` **G303** is the directive this sits under.

**Two consequences follow and neither is decided here:** `FindingKind` `field-fallback` exists with
no producer — it is the kind that would gate exactly these — and the strict `generate` still
refuses to write a marked drawing into a circuit directory although its stated reason
(*"the marks don't exist yet"*) has now expired.

---

## What was built

Five tasks, commits `da8c6e3..d994d03`:

| | |
| --- | --- |
| `lib/schgen/findings.ts` | 19 `FindingKind`s, four `RefusalClass`es, `classOf` exhaustive with **no default arm** so a new kind without a class is `TS2366` |
| checkers | `checkLayout`, `textProblems`, `assertSheetSafe` return typed findings; census byte-identical |
| the chain | geometry survives its own refusal — `RealiseResult` → `Selection.refused` → `BlockRealisation` → `SheetDrawing.findings` → `Generation.findings`, and the sheet-level gates stop throwing |
| the census | four classes; an untyped `Error` is `generator-defect` and **fails the run**; `build/schgen-boards/<board>/` per board |
| the marks | `DEFECTIVE - DO NOT BUILD` watermark in the `.kicad_sch` plus a reserved title-block comment |

**The census sentence changed, because the old one never answered *may I build from it*:**

```
before:  7 of 11 boards produce a schematic
after:  10 of 11 boards produce a drawing: 10 usable, 0 defective
         1 produce none: 1 not-drawable, 0 generator-defect
```

Suite `Ran 3947`, 0 fail. Typecheck clean.

## What the reviews caught, which is worth more than the fixes

- **Three defects were invisible to every task-scoped review by construction.** A review sees one
  diff; a port-manifest gap, a duplicated measurement and a false notice each live outside one.
- **Execution beat static reading twice.** A reviewer traced the refusal path and concluded findings
  reached the census; a probe showed all four boards still threw a plain `Error`. That probe, made
  a condition of Task 3, is why Task 4 landed first time.
- **An implementer refused a number it was given.** The plan's stated suite baseline was stale by
  two; it reverted its own files, re-measured, and reported both figures rather than forcing a
  match.
- **Two verification steps this controller wrote could not have produced their stated result** — a
  census filter that missed ~110 non-deterministic lines, and a premise that `assertSheetSafe`
  returned `string[]` when it returned `void`. Implementers caught both.
- **A watermark's weight was chosen from seven probe renders, not from argument.** Alpha alone is a
  ghost because KiCad strokes glyphs rather than filling them; alpha 0.5 swallowed `RV1 47K`.

## Known residuals, carried deliberately

- **The junction arm is covered by reading, not by a test.** No board takes it and forcing it needs
  a graph built so `junctionPoints` and `branchJunctions` disagree, which `G293` reconciled on
  purpose. It is the one class that must keep refusing, and it is the subtlest code on the branch.
- **The refusal-site enumeration is unfinished** — `emit.ts`, `generated-files.ts`, `fittingPaper`,
  `shelfPacking` still throw plain `Error`; none fires on any board today, and the chokepoint
  comment names them.
- **The `wire-safety` batch tag is still wrong for one branch.** `wireOverWires` emits same-net
  collinear overlap, which is correct-but-redundant and therefore `usable`; the batch carries a
  `defective` kind, so such a drawing would be stamped `DEFECTIVE` and barred. Documented at the
  site; fires on no board today.
- **`fittingPaper`'s `grewFrom` is computed and never read**, while `emitSheet` writes the
  *declared* paper — so a sheet that ever grew would declare a page smaller than its contents, and
  the watermark is deliberately placed against the declared paper because of it. Pre-existing.
- **Four `FindingKind`s have no producer**: `paper-exhausted`, `packing-failed`, `field-fallback`,
  `label-misnames-net`.

## Where the rest is

`rulings.md` — seven decisions taken on the owner's behalf, with what each costs if wrong.
`ledger.md` — the working record in the order things happened. `briefs/` — what each implementer
was actually asked, including the addendum that widened Task 3. `reports/` — what each returned,
with verbatim command output, which is what makes this file's claims checkable. Review packages
are not copied; they regenerate from `git diff`.
