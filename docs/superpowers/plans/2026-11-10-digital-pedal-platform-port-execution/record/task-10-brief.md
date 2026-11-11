### Task 10: Layout carry-forward, schematic checklist, bring-up

**Files:** Create `layout-carry-forward.md`, `schematic-checklist.md` and `bring-up.md` under `docs/h7-platform/`. Modify `verify.sh` (add `bringup`).

**Sources:** `LAYOUT-CARRYFORWARD.md`; `SCHEMATIC-CHECKLIST.md`; split spec §9, §12, §12.4; BL-1 to BL-4 in the split spec; `DESIGN-REVIEW.md` (its Layout and Enclosure section headings only, as a pointer: the checklist is third-party material, so link it rather than copy it).

- [ ] **Step 1: Add the `bringup` check.** It fails unless every id `BU-01` … `BU-29` and `BL-1` … `BL-4` appears in `bring-up.md`, and each BU line carries one of `original requirement`, `deferred measurement` or `passed paper analysis`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Write the three documents.**
  - The layout carry-forward is restated per board (h7-module, h7-pedal, carrier) against the split. A pre-split item whose board is not obvious becomes a conflict entry.
  - The schematic checklist keeps the circuit items and their original ids, and drops the items that test the old generator or its gates. The README (Task 12) maps the dropped ids.
  - Open items found here go to `open-items.md`, following the counting steps of Tasks 3–8.
- [ ] **Step 4: Run `verify.sh bringup effective provenance nocode`.** Expected: PASS.
- [ ] **Step 5: Commit and push.**

