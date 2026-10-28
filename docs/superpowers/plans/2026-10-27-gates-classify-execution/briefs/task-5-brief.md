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
