### Spec Compliance

- ✅ Spec compliant. Every rule in the brief's Interfaces list is present in the diff.
  - Kept, docs tree: verify.sh `check_nocode`, the `*.ts)` branch, `*) bad=...` for any path outside `$CIRC`. A `.ts` under `docs/h7-platform/` still fails.
  - Kept, circuits tree: the final `*)` branch. Any other type fails, and `.md`, `.json`, `.svg` and `LICENSE-*` pass.
  - Amended: `.ts` under `$CIRC` is counted and allowed.
  - Scan: `tree_files` now uses `! -name '*.ts'`, so the vocabulary scan skips `.ts`. It still covers the non-record `.md` and `.json` files in both trees and `docs/standards/*.md`.
  - Unchanged: `BYTE_PAIRS`, `check_bytes` and `check_provenance` are not in the diff. No exemption is widened.
  - Disclosed: the PASS line carries the amendment text and the count.
  - The check list is untouched, so it is still 17 names.
- The superseded check is disclosed in three places: the verify.sh header comment, the PASS line, and the README section.
- The immutable-record exemptions are not broadened to hide code. A `.ts` is allowed only by file type under circuits, and `.ts` under docs still fails.
- The `ts` counter lives in the parent shell, because the loop reads from `< <(find ...)` rather than a pipe. The PASS line therefore reports the correct count.
- The new final line of `check_nocode` returns 0 in both branches, so a passing check cannot flip to a failing one.
- The `run_check` change appends any stdout from a passing check to its PASS line. I checked the one named risk, that some other check prints on success and its PASS line would now change. The only other success-path output I found is `check_readme`'s "records" lines, and those go to stderr (verify.sh line 166 `>&2`). `nocode` is the only check that emits stdout on a pass, so the change has no effect on the other checks.
- ⚠️ Cannot verify from the diff. I did not run the verifier or the controls script, as instructed. The "17 PASS" and "all 3 cases behave" results rest on the implementer's report. The controller should re-run `verify.sh` and count lines that start with `PASS`.

### Strengths

- The failure is loud and the success is disclosed: a passing `nocode` with `.ts` present is distinguishable from a plain pass, which meets the "a skipped check must never look like a passing one" rule.
- The amendment is narrow. It is scoped to one tree and one extension, with the other three rules and the byte and provenance protections left intact.
- The controls script exits non-zero if any case misbehaves, so a case cannot quietly pass.
  - It refuses to overwrite an existing path.
  - It removes the probe through a trap as well as directly.
  - It checks the output prefix and a needle string, not just the exit code.
  - It requires `PEDALS_REPO` and refuses to run without it.
- The README section states what was kept, what was amended, and why, without claiming more than was done.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- verify.sh, the `check_nocode` disclosure line: it prints "1 .ts files". This is cosmetic, and the brief used the same wording.
- README, the existing paragraph (around lines 26-27) cites "`verify.sh` line 97" and says the file-type rule covers only the two trees. Both are historical and now slightly stale, since the line numbers shifted. The new section sits directly below them and supersedes them, so this is low risk.
- nocode-amendment-controls.sh: it writes probes into the working tree. A SIGKILL could leave one behind. The trap covers normal exit and signals, and the refuse-to-overwrite guard makes a leftover detectable on the next run, so this is acceptable.
- Neither the PASS line nor the controls script cover a `.ts` that exists only inside `docs/standards/`. That is out of scope: the standards scan only reads `.md`.

### Assessment

**Task quality:** Approved

**Reasoning:** The amendment is minimal and disclosed. The kept protections are unchanged, and the one cross-cutting change, `run_check`'s output append, affects only `nocode`. The controls cover the three cases the brief names.
