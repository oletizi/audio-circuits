### Task 3: Retire the port's "no model code" scope rule for phase 2

The port verifier's `check_nocode` accepts only `.md`, `.json`, `.svg` and `LICENSE-*` files anywhere under `docs/h7-platform/` and `circuits/h7-platform/`. That was phase 1's scope rule: port the records, write no model. Phase 2's G1 exists to write that model, and Tasks 4 and 5 put TypeScript under `circuits/h7-platform/`. The rule did its job and is now superseded for that one tree and that one file type. Everything it protects that still holds is kept.

**Files:**
- Modify: `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh` (`check_nocode`, `tree_files` callers, the header comment)
- Modify: `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/README.md` (one paragraph recording the amendment and why)

**Interfaces:**
- Produces: `check_nocode` with these rules, and the check list still at 17 names:
  - **Kept:** under `docs/h7-platform/`, every file is `.md`, `.json`, `.svg` or `LICENSE-*`. A `.ts` there still fails.
  - **Kept:** under `circuits/h7-platform/`, every file that is not `.ts` is `.md`, `.json`, `.svg` or `LICENSE-*`. Any other type fails.
  - **Amended:** a `.ts` file under `circuits/h7-platform/` is allowed. It is phase-2 model code, held by `bun run typecheck` and `bun test`, not by this script.
  - **Kept:** the code-vocabulary scan still covers every non-record `.md` and `.json` file in both trees and `docs/standards/`. It no longer reads `.ts` files, because a source file naming `make -C` in a comment is not ported prose leaking pedals-repo vocabulary, which is what the scan exists to catch.
  - **Unchanged:** `check_bytes` and the five byte-identical records, `check_provenance`, and every other check. The record exemptions in `BYTE_PAIRS` are not widened.
  - **Disclosed:** when `nocode` passes with any `.ts` file present, the PASS line names the amendment, for example `PASS nocode (phase-2 amendment: N .ts files under circuits/h7-platform/ held by typecheck and tests)`.

- [ ] **Step 1: Show the failure first.** Write a scratch script (not under the repo) that creates `circuits/h7-platform/probe.ts`, runs `verify.sh nocode`, records the output and deletes the probe. Expected today: `FAIL nocode` naming `probe.ts`.
- [ ] **Step 2: Amend `check_nocode`** to the rules above, and the script's header comment to say which rule was amended, by which design (phase 2, G1) and why.
- [ ] **Step 3: Negative controls.** Extend the scratch script to run three cases, each creating one probe file, running `verify.sh nocode`, and deleting the probe:
  - `circuits/h7-platform/probe.ts` → `PASS`, with the disclosure text;
  - `circuits/h7-platform/probe.py` → `FAIL`;
  - `docs/h7-platform/probe.ts` → `FAIL`.

  Run it. All three behave as stated. Confirm with `git status` that no probe is left behind. Commit the script under `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/nocode-amendment-controls.sh` so the controls can be re-run.
- [ ] **Step 4: Verify.** Run the full verifier: 17 `PASS`. Record the amendment in the execution README. Commit and push.

