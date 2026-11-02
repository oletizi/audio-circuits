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

