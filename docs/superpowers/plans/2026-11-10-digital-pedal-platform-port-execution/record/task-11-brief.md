### Task 11: Research documents and PCBWay fabrication rules

**Files:** Create `docs/h7-platform/research/proven-reference-designs.md`, `docs/h7-platform/research/processor-module-form-factors.md` and `docs/standards/pcbway-fab-rules.md`.

- [ ] **Step 1: Add the `standards` check.** It fails unless all three files exist and each carries the pinned prefix.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Port the three documents.**
  - Keep the content.
  - Add a `Ported from:` line.
  - Re-point internal pedals links to pinned links.
  - Each research document gets a dated-research banner saying it is background and does not bind.
  - The fab rules keep any dated figure with its date, and a note that PCBWay's current published capabilities are the authority at phase 4.
- [ ] **Step 4: Run `verify.sh standards nocode`.** Expected: PASS.
- [ ] **Step 5: Commit and push.**

