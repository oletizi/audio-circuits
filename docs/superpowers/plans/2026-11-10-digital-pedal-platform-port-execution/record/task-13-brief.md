### Task 13: Final verification and execution record

**Files:** Create `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/README.md`.

- [ ] **Step 1: Run `verify.sh`.** Expected: every line PASS.
- [ ] **Step 2: Run `bun run typecheck` and `make check`.** Expected: both exit 0, unchanged by this phase. If either fails, check whether it also fails on `main` at `05f4a2a`, and report which.
- [ ] **Step 3: Walk the spec's "Done when" by reading.** Cover the items `verify.sh` cannot check:
  - the effective-constraint wording for the 9 V, 421 Hz and Q_PEN items;
  - that no figure lacks a basis;
  - that no open item reads as closed.

  Record each item's result in the execution README.
- [ ] **Step 4: Write the execution README.** It says plainly that it is an execution record and not findings. It holds:
  - the per-task open-passage counts and the rows added;
  - the conflicts raised;
  - anything that could not be ported, with the reason;
  - the final `verify.sh` output.
- [ ] **Step 5: Commit and push.** Then request the whole-branch review.
