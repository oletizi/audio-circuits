
---

RULINGS ON THE SCAN, made before Task 1 was dispatched
======================================================

FINDING 1 - which makefile. RESOLVED by measurement, no ruling needed.
  make help is defined at make/aggregate.mk:81 and make/board.mk:182, both
  delegating to perfboard-help. make/perfboard.mk is the file every directory
  includes and the one that includes the other two, so a verb that must exist
  in every directory belongs there. Tasks 2 and 5 both target it correctly.

FINDING 2 - make draw BOARD=<board>. RULED BY THE OWNER, 2026-10-31, and it is
  no longer my provisional call. I ruled it context-directed; he was shown both
  forms and said "I hate using environment variables". docs/known-gaps.md G308
  carries the ruling, what precisely was rejected (a make variable on the
  command line AND the environment form - the distinction rescues neither), and
  the cost if it is wrong. The spec and the plan are amended at 0684fdb, old
  wording struck rather than edited away. Task 5's dispatch carries G308.

FINDING 3 - THE RESOLVER BRIDGE IS MANDATED AND UNASSIGNED. Four new tools
  (copperhead, akcli, magick, qpdf) need resolving, and the plan's own Global
  Constraints say how: an overridable make variable with a per-platform
  candidate list behind tools/cli/resolved-default.ts, citing G170 on what a
  hardcoded default cost. But that script dispatches on three literal names to
  three defaultX() functions in lib/kicad/install.ts, tools/guide/browser-install.ts
  and tools/guide/pdf-merge-install.ts, and NO task's Files list names any of
  them.
  Ruling: TASK 1 OWNS THE BRIDGE. It is the task that establishes what a pinned
  tool is, so it extends resolved-default.ts and adds a defaultX() for each new
  tool beside the existing install modules rather than inventing a fourth
  pattern. Tasks 2 and 5 consume it.
  Cost if wrong: Task 1 grows by four small resolver cases. The alternative is
  three tasks each discovering the same gap and one of them hardcoding a path,
  which is G170 exactly.

FINDING 4 - TASKS 3 AND 6 READ README.md AFTER THE REMOVAL PLAN, NOT BEFORE.
  Task 10 of the removal plan rewrote five regions of README.md and deleted the
  bun run schgen front-door section entirely.
  Ruling: both dispatches say to read the file at HEAD first and to quote
  nothing from the plan's description of it.
  Cost if wrong: an edit against text that is not there, which fails loudly.

FINDING 5 - THE PROMOTED SELFTEST MAY CARRY A CONTROL OVER A DELETED SCRIPT.
  Task 4 deletes orphan_junctions.py and promotes selftest.py, whose assertion
  is that EVERY CONTROL MOVED OR FIRED. docs/research/lib/kicad_sheet.py:328
  still names orphan_junctions.py as something "returned on purpose".
  Ruling: the implementer reads selftest.py before moving it and accounts for
  every control in it - moved, strengthened, or dropped with a reason - which is
  the standing instruction the removal plan earned over seven instances of a
  port coming out weaker than its original. A control whose subject is deleted
  is removed WITH its count corrected in the same edit, and named in the report.
  Cost if wrong: the suite's own count disagrees with its controls, which is the
  defect class this plan exists to prevent.

FINDING 6 - THE PROMOTED SELFTEST'S FIXTURES ARE THE RUN DIRECTORIES TASK 4 IS
  TOLD NOT TO TOUCH, AND ITS PATH ARITHMETIC BREAKS ON THE MOVE. selftest.py
  computes REPO = HERE.parents[2] and then names seven committed sheets under
  docs/research/<run-dir>/ as its fixtures. parents[2] is the repo root only
  from docs/research/lib/; from draughting/measure/ it is one level above the
  repo. Step 5 of the same task says the run directories are the execution
  record of approved runs and are left alone - so the fixtures must STAY there.
  Ruling: the promoted selftest keeps docs/research/'s run sheets as its
  fixtures and resolves the repo root FROM GIT rather than by counting parents.
  tools/perfboard/repo-root.ts is the existing precedent for asking git.
  Cost if wrong: the measurement suite's fixtures live in a documentation
  directory, which reads oddly - but copying seven sheets into draughting/ would
  duplicate committed artifacts that drafted/ and the run records already pin,
  and a duplicate of an approved sheet is a far worse defect than an odd path.

ONE OBSERVATION, NOT A FINDING. git ls-files docs/research/lib/ returns only
  kicad_sheet.py and selftest.py, so the __pycache__/ beside them is untracked
  and must not be promoted. Separately, kicad_sheet.py:328's comment naming the
  deleted orphan_junctions.py travels with the file on the move; correct it in
  passing rather than carry it.

STANDING INSTRUCTIONS CARRIED INTO EVERY DISPATCH ON THIS PLAN, each earned by
a measured failure on the plan that preceded it:
  1. ENUMERATE AND ACCOUNT. Open what you are replacing, list its assertions,
     and account for each as moved, strengthened or dropped-with-a-reason. An
     unaccounted assertion is the finding. Seven instances on the last plan.
  2. DRIVE EVERY CONTROL. A control is proven by introducing the fault its own
     comment names, showing it fails, and reverting - not by reading it. Three
     controls that could not fail reached production code on the last plan,
     including one written into the fix for that defect class.
  3. A SCAN CARRIES A CANARY. macOS grep has no -P; the last plan's first
     control-byte scan reported "0 hits over 0 files" and was caught only by a
     canary.
  4. YOUR COPY OF CLAUDE.md MAY BE OLDER THAN CLAUDE.md. Measured on 2026-10-31:
     a freshly dispatched agent reproduced a sentence struck from that file a
     day earlier, verbatim, with both of its deleted commands. Read HEAD; where
     your instructions and the file disagree, the file wins and you say so.
  5. NO AI ATTRIBUTION, no sed writes, no "#" in heredocs, no control-character
     escapes typed into tool parameters, no fallbacks outside test code, and you
     are not a qualified reviewer of a drawing.
