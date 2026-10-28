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


---

## ADDENDUM, added by the controller after Task 2's review, and it WIDENS this task

**`[RAN]` a probe calling `generate()` directly on each of the four boards that refuse today:**

```
pultec-mid: PLAIN Error
transistor-preamp-buffered: PLAIN Error
transistor-preamp-loop: PLAIN Error
transistor-preamp-staged: PLAIN Error
```

**All four still throw a plain `Error`, not a `SchgenRefusal`.** Task 2 converted
`checkLayout`, `textProblems` and `assertSheetSafe`, but these four boards refuse on sites Task 2
never touched: the three transistor-preamp boards through the ELK backend path (`adapt.ts` returns
a `Mismatch`, and `blocks.ts` turns `ok: false` into a throw around line 304 - a DIFFERENT site
from the invalid-layout throw at :265 that Task 2 did convert), and `pultec-mid` at
`validateCircuit`, outside the generator's geometry entirely.

**WHY THIS WOULD BREAK THE NEXT TASK SILENTLY.** The spec's rule is that an untyped `Error`
reaching the census is a `generator-defect` and **fails the run**. As the tree stands, all four
boards would be classified `generator-defect` - three ordinary clearance refusals and one invalid
circuit, all reported as bugs in the generator. The next task's first run would fail, and the
reform would look broken when it is merely incomplete.

**A reviewer read this path statically and concluded the findings DO reach the census. Running it
says otherwise.** That is why this addendum exists.

### What this task must additionally deliver

- The ELK backend refusal path carries findings through to the census as a `SchgenRefusal`. A
  `Mismatch` already carries `kind` (`not-applicable`, `invalid-geometry`, `clearance`,
  `backend-raised`) - map each to a `FindingKind` rather than inventing a parallel vocabulary, and
  say in your report which maps to which and why it follows the owner's line.
- `validateCircuit`'s refusal is a `SchgenRefusal` with kind `circuit-invalid`. **It is
  `not-drawable`, NOT `generator-defect`** - an invalid circuit is a fact about the circuit, not a
  bug in this tool, and classifying it as a generator defect would fail the run on a board that is
  simply not ready.

### The acceptance probe for this task

Re-run the probe above. **This task is not complete until all four boards report a typed
`SchgenRefusal` with a sensible class**: `not-drawable` for `pultec-mid`, and `usable` for the
three transistor-preamp boards, whose refusals are clearance crowding and are the three drawings
the whole plan exists to make visible. Put the probe's output in your report verbatim.
