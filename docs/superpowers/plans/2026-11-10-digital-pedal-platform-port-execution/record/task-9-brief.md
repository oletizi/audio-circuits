### Task 9: Parts

**Files:** Create `docs/h7-platform/parts.md`. Modify `verify.sh` (add `parts`).

**Interfaces:**
- Consumes: Tasks 2–8 documents. Every part listed there with a chosen MPN must appear here.

- [ ] **Step 1: Add the `parts` check.** It fails if `parts.md` lacks a table with the columns `Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source`, or if any row has an empty `Chosen by` or `Source` cell. Whether every part in Tasks 2–8 is listed is checked by reading in Step 4, not by pattern matching MPNs.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Write `parts.md` from `OWNER-DEFAULTS.md`, `CORE-BRIEF.md`, the ledger and the Task 2–8 documents.**
  - "Chosen by" is either a decision anchor or "controller ruling".
  - Stock and price are not carried. They were dated observations, and the BOM binds only in phase 4.
  - Footprint names are not carried as facts. Each is marked "re-verify against installed KiCad libraries".
- [ ] **Step 4: Run `verify.sh parts provenance nocode`.** Expected: PASS. Then walk Tasks 2–8's documents for every MPN they name, and confirm each one is in the table.
- [ ] **Step 5: Commit and push.**

