Pre-flight conflict scan: 2026-10-30-institutionalise-draughting
================================================================

Run before Task 1 is dispatched, against the tree at the head of the removal
plan. One row per task pair that shares a file or an interface, one row per
task for whether its own text agrees with itself. A ruling beside every
finding.

Shared files and interfaces
---------------------------

| Tasks | What one produces / what the other consumes | Found |
| --- | --- | --- |
| 1 -> 2 | `tools/draught/toolchain.ts` produces the version check; Task 2's `draught-doctor` consumes it | Clean. Task 2 must not re-implement the comparison - the doctor is a reporter over Task 1's checker. |
| 1 -> 5 | the same checker; `make draw` must refuse on a mismatch before drafting | Clean, with a note: Task 5's refusal is Task 1's refusal, not a second one. |
| 2 -> 5 | both Modify `make/perfboard.mk`, adding a top-level verb | Clean as a text conflict - different targets, and 5 follows 2 so it copies 2's shape. See FINDING 1 and FINDING 2, which are about that file's contents rather than the pair. |
| 3 -> 6 | both Modify `README.md` | Clean. Task 3 edits the prerequisites section, Task 6 the governing-documents table. Different sections. |
| 1, 2, 5 -> `tools/cli/resolved-default.ts` | Global Constraints mandate that tools resolve the way `KICAD_CLI` and `HTML_TO_PDF` do - an overridable make variable behind that bridge script | FINDING 3: no task's Files list names it, or the `lib/**/install.ts` modules holding the `defaultX()` functions it dispatches to. |
| 2, 5 -> `tools/cli/entrypoint.ts` | both Create a `tools/cli/` verb | Clean. `entrypoint.ts` exports only `isMain(moduleUrl)`; there is no verb registry to update, so neither task touches it. |
| 4 -> 7 | promoted script paths that `TOOLING.md` then cites | Clean, and the ordering matters: 7 cites 4's paths, so 4 lands first. |
| plan 1 Task 10 -> 7 | both Modify `TOOLING.md` | Ruled already (Ruling C on the removal plan): Task 10 corrects falsehoods only, Task 7 owns the structure. |
| plan 1 Task 10 -> 3, 6 | plan 1 Task 10 rewrites four regions of `README.md`, including the `bun run schgen` front-door section | FINDING 4: Tasks 3 and 6 must read `README.md` as Task 10 leaves it, not as the plan's author saw it. |
| all -> `drafted/`, `verdicts.md` | Global Constraints forbid touching them | Clean, and the five sha256s are the check. |

Self-agreement, one row per task
--------------------------------

| Task | Its own text against itself | Found |
| --- | --- | --- |
| 1 | lockfile + checker + test | Clean. |
| 2 | `make draught-doctor` | Its Files line already asks the implementer to check which file `make help` lists verbs from. Resolved below (FINDING 1). |
| 3 | install script + README prerequisites + test | Clean. |
| 4 | promote the measurement scripts | FINDING 5: the test drives `draughting/measure/selftest.py`, and the task also says `orphan_junctions.py` is deleted and does not return. If `selftest.py` exercises a control over that script, the promoted selftest fails on arrival. |
| 5 | `make draw BOARD=<board>` | FINDING 2, and it is the sharp one. |
| 6 | the skill + README table | Clean. |
| 7 | `TOOLING.md` | Clean. |

Findings and rulings
--------------------

**FINDING 1 - which makefile. RESOLVED, no ruling needed.** `make help` is
defined twice, at `make/aggregate.mk:81` and `make/board.mk:182`, both
delegating to `perfboard-help`. `make/perfboard.mk` is the file every
directory includes and the one that includes the other two, so a verb that
must exist in every directory belongs there. The plan's "check first" is
answered: `make/perfboard.mk` is correct for both Task 2 and Task 5.

**FINDING 2 - `make draw BOARD=<board>` CONTRADICTS A STATED CONVENTION, and
the convention gives its reason.** `make/perfboard.mk:14-28`:

> *"THE DIRECTORY YOU ARE STANDING IN IS THE CONTEXT. There are no variables
> to remember in the common case ... TO ACT ON A BOARD FROM OUTSIDE ITS
> DIRECTORY, use make's own flag: `make -C boards/pt2399-core check`. That is
> the same mechanism driven from elsewhere, not a second one - there is
> deliberately no BOARD=<name> variable."*

and `make/board.mk:4` states it again with the reason: *"no BOARD=<name>
variable, because two ways to say which board"*. The plan's Task 5 title is
the one thing this file says it will not have.

**Ruling: the verb is `make draw`, context-directed, and `make -C <board dir>
draw` is how it is driven from elsewhere.** The plan's `BOARD=<board>` is
dropped. Reasons: the convention is stated twice with its rationale and is
load-bearing for every other verb in the file; a second way to name a board
is the defect it names; and nothing in the drawing flow needs a board named
from outside a board directory that `-C` does not already give. **This is a
plan correction, not an implementer's choice** - carry it in Task 5's
dispatch, and carry it to Task 7 too, because `TOOLING.md` will document the
verb.

**What it costs if wrong:** if the drawing flow turns out to need a board
named from a directory that is not a board - a cross-board sweep, say - then
`draw` needs an argument after all, and the right answer then is a verb in an
aggregate directory that walks down, which is the shape `check` already has.
Reversible in one commit either way.

**FINDING 3 - the resolver bridge is mandated and unassigned.** Four new tools
(`copperhead`, `akcli`, `magick`, `qpdf`) need resolution, and the Global
Constraints say how: an overridable make variable with a per-platform
candidate list behind `tools/cli/resolved-default.ts`, citing what a
hardcoded default cost (**G170**). But `resolved-default.ts` dispatches on
three literal names to three `defaultX()` functions in `lib/kicad/install.ts`,
`tools/guide/browser-install.ts` and `tools/guide/pdf-merge-install.ts`, and no
task's Files list names any of them.

**Ruling: Task 1 owns the bridge.** It is the task that establishes what a
pinned tool is, so it extends `resolved-default.ts` and adds the `defaultX()`
for each new tool beside the existing install modules rather than inventing a
fourth pattern. Tasks 2 and 5 consume it. **What it costs if wrong:** Task 1
grows by four small resolver cases; the alternative is three tasks each
discovering the same gap and one of them hardcoding a path, which is exactly
G170.

**FINDING 4 - Tasks 3 and 6 read `README.md` after Task 10, not before.**
Plan 1's Task 10 rewrites the prerequisites-adjacent prose and deletes the
`bun run schgen` front-door section entirely. **Ruling: both dispatches say
to read the file first and to quote nothing from the plan's description of
it.** Cost if wrong: an edit against text that is no longer there, which
fails loudly rather than quietly.

**FINDING 5 - the promoted selftest may carry a control over a deleted
script.** Task 4 deletes `orphan_junctions.py` and promotes `selftest.py`,
whose assertion is that *every control moved or fired*. **Ruling: the
implementer reads `selftest.py` before moving it and accounts for every
control in it, exactly as the removal plan's standing instruction requires;
a control whose subject is deleted is removed from the selftest WITH its
count corrected in the same edit, and named in the report.** Cost if wrong:
the suite's own count disagrees with its controls, which is the defect class
this plan is meant to prevent.

**FINDING 6 - THE PROMOTED SELFTEST'S FIXTURES ARE THE RUN DIRECTORIES TASK 4
IS TOLD NOT TO TOUCH, and its path arithmetic breaks on the move.** This is
the one the plan could not have predicted, and it is why Task 4's test fails
on arrival if written as the plan writes it. `docs/research/lib/selftest.py`
computes

    HERE = pathlib.Path(__file__).resolve().parent
    REPO = HERE.parents[2]
    RESEARCH = REPO / "docs/research"

and then names seven committed sheets under `docs/research/<run-dir>/` as its
fixtures. `HERE.parents[2]` is the repo root only from `docs/research/lib/`;
from `draughting/measure/` it is one level above the repo. So the move breaks
`REPO`, and even once `REPO` is fixed the fixtures **stay** in
`docs/research/` - which is correct, because Task 4 Step 5 says the run
directories are the execution record of approved runs and are left alone.

**Ruling: the promoted selftest keeps `docs/research/`'s run sheets as its
fixtures and resolves the repo root from git rather than by counting
parents.** A path computed by counting directory levels is a path that breaks
silently on exactly this kind of move; `tools/perfboard/repo-root.ts` is the
existing precedent for asking git instead. **Cost if wrong:** the
measurement suite's fixtures live in a documentation directory, which reads
oddly - but copying seven sheets into `draughting/` would duplicate committed
artifacts that `drafted/` and the run records already pin, and a duplicate of
an approved sheet is a far worse defect than an odd-looking path.

**One observation, not a finding.** `git ls-files docs/research/lib/` returns
only `kicad_sheet.py` and `selftest.py`, so the `__pycache__/` beside them is
untracked. Task 4 must not promote it. Separately,
`docs/research/lib/kicad_sheet.py:328` carries a comment naming
`orphan_junctions.py` as something *"returned on purpose"* - a reference to
the deleted script that travels with the file on the move, and one Task 4
should correct in passing rather than carry.
