Execution record: institutionalising the copperhead + akcli practice
====================================================================

**This is NOT findings, and the plan and the code are what bind.** The plan is
`../2026-10-30-institutionalise-draughting.md`; the design it argues from is
`../../specs/2026-10-30-institutionalise-draughting-design.md`. What is here is
the decision record and the audit trail — what was ruled, why, and what it
would cost if wrong — which `CLAUDE.md` requires be committed beside the plan
rather than left in a workspace that `git clean -fdx` destroys.

- `ledger.md` — the controller's ledger: the pre-flight scan, every ruling with
  its cost-if-wrong, every correction, and each task's completion line with its
  commit range.
- `preflight-scan-and-rulings.md` — the conflict scan run before Task 1, and
  the rulings on what it found.
- `task-N-report.md` / `task-N-review.md` — each implementer's report and the
  review it answered, including every fix round.
- `final-review.md`, `final-fix-report.md` — the whole-branch review and the
  work that closed it.

Review-package diffs are deliberately absent; they regenerate from `git diff`
over the commit ranges the ledger names.

---

## What this execution found that the plan did not predict

**THE PLAN'S OWN TEXT WAS WRONG IN FOUR PLACES, each caught before the task ran
or by the implementer running rather than reading.**

- **`make draw BOARD=<board>`** contradicted a convention `make/perfboard.mk`
  states twice *with its reason* — *"two ways to say which board is two places
  for one fact to be wrong."* The owner ruled it: *"I hate using environment
  variables."* `docs/known-gaps.md` **G308**.
- **Task 3's Step 4 was impossible as written** — install to a scratch location,
  then confirm `make draught-doctor` passes, when the resolvers read the real
  paths.
- **Task 3's Files list omitted `TOOLING.md`** while its Step 5 required editing
  it, and the pre-flight scan's own self-agreement row called that task clean.
- **The resolver bridge was mandated by the Global Constraints and assigned to
  nobody**, so three tasks would each have discovered the same gap.

**AND THE CONTROLLER WAS WRONG FOUR TIMES, each caught by an implementer
refusing an instruction rather than following it.** This is the finding that
most deserves to outlive the plan.

1. **A one-token fix that would have been worse than the bug.** Told to drop
   `tool === "copperhead"` because the right derivation sat beside the name, the
   implementer found the branch body calls `defaultCopperheadDir()` directly —
   so a second commit-pinned tool would have been cloned *into copperhead's own
   checkout*. It built a resolver map instead and drove the control by patching
   in the naive version.
2. **A reviewer's untested mechanism, relayed as instruction.** `hints.paper =
   "USLetter"` does not work: copperhead's draft engine checks a hint against a
   table holding only A5–A0. The implementer reproduced it before using it and
   deviated, citing this repository's own criterion-versus-mechanism rule.
3. **A false reason for not rewriting a commit** — *"it is pushed"* — when it
   was not. The instruction stood on other grounds; the reason did not.
4. **A wrong figure in a brief:** `make check` fails on **four** boards, not
   two. No committed document carried the error; it existed only in the brief.

**THE DEFECT CLASS THIS BRANCH KEPT FINDING: A CHECK WHOSE OUTPUT DOES NOT
DEPEND ON WHAT IT CHECKS.** Eleven instances, and the instructive thing is how
few were visible by reading.

- A guard that **passed with the verb renamed to `DRAWX`**, because the line
  above it said "the pinned **draw**ing toolchain".
- A control-byte scan whose bash pattern `$'\x00\|\r'` collapsed into a literal
  match on the letter **"r"**, reporting false hits on three clean files.
- Two assertions that **both passed against the reintroduced bug**, caught by
  their own author mid-sabotage.
- A static guard that **failed against the fixed tree** because four modules
  discuss `npx` in prose.
- A `--follow` "measurement trap" that **did not reproduce** under six trials.
- And twice, the controller chaining a commit behind `grep -c`, **which exits 1
  on zero matches** — a guard that blocks on success, written while hunting for
  guards that pass on failure.

**The remedy that worked was never review. It was sabotage:** introduce the
fault the comment names, watch the check fail, revert, prove the tree
byte-clean. Every one of the above was found that way or not at all.

**A FLAKE HID FOR FIVE RUNS BEHIND A `tail -40`.** One failure in three runs,
the failing test's identity truncated away and never recovered. Runs 4 and 5
kept the whole log and the answer was immediate: two real-subprocess tests
carrying bun's default 5000ms, crossing it under parallel load. Not assertion
failures — **tests lying about the code.** A tail is fine on a run that says
`0 fail` and useless on the one that does not.

**AND THE SUITE COULD NOT PASS ON A CLEAN CHECKOUT.** Seven `mkdtemp` sites
wrote into a repo-root `build/` that is not committed and that nothing creates.
Every task on this plan gated on a green suite; the suite was green because
this machine had a `build/` left over. It was proved fixed by running the whole
suite with `build/` moved aside.

**WHAT THE TOOLCHAIN ACTUALLY DOES, measured and not assumed:**

- **copperhead cannot draft to US Letter.** Its engine checks a paper hint
  against a table of A5–A0; `USLetter` lives in the legibility checker, a
  different consumer. Every page is re-papered after drafting. The owner has no
  A3 or A4 printer, all five approved pages are `USLetter`, and four of them
  lost their approval to a re-paper pass.
- **The pinned `tsx` was not the one that ran.** Three versions resolved three
  ways, and a clean machine fetched an unpinned one over the network. The cause
  was a missing `cwd`, **not** the absolute script path the review blamed —
  established by holding the path constant and varying only the directory.
- **Installing a third-party checkout inside the repository made it visible to
  three things nobody had connected**: `tsc`, `bun test`'s discovery (250
  vendored test files, 42 failures), and repository sweeps. Six places would
  have had to know it was not ours; now one does.

**AN AGENT'S COPY OF `CLAUDE.md` CAN BE OLDER THAN `CLAUDE.md`.** Three agents
in one session carried a stale paragraph, and **one re-read the file and
reported "no drift found" before retracting.** Checking by eye does not work; the
rule in `CLAUDE.md` now says to diff the passage.

**ONE THING BELONGS IN FRONT OF THE OWNER AS EVIDENCE, NOT AS A QUESTION.**
`TOOLING.md` records that choosing an install script "accepted" copperhead's
dependency posture — 22 vulnerabilities, 3 critical, in packages this repository
did not choose. His recorded word, *"install script"*, answered **how to pin
copperhead and akcli**, not whether to accept their transitive tree. An agent
wrote that acceptance on his behalf. If it is put to him it should carry the
measurement and the vendoring alternative, and his answer belongs in
`docs/known-gaps.md`.
