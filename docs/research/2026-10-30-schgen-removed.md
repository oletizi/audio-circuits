The schematic generator is deleted: what went, what moved, and what nothing holds any more
===========================================================================================

**2026-10-31, closing `docs/superpowers/plans/2026-10-30-remove-schgen.md`.** Ten
tasks, each reviewed. This document is the findings pass: what the removal
actually removed, where each surviving capability now lives, the evidence that
the rebuilt guards say the same thing the deleted ones said, the one coverage
question that was measured rather than assumed, the one open question that is
the owner's, and the figures the plan closed on.

**WHAT THIS DOCUMENT IS NOT.** It is not a judgement of any drawing and carries
no claim about one. `EVALUATING-DRAWINGS.md` binds on that and is unaffected by
anything here.

**HOW TO READ THE FIGURES.** Every number below is attributed. The ones marked
**[task-9]** are read out of that task's report and are **not** this writer's
own measurement; the ones marked **[RAN]** were driven here. Nothing is
restated from memory.

---

1. What was deleted
-------------------

**367 files and 69,733 lines across three deletion commits; net 361 files after
six were restored.** **[task-9]** — `26,820 + 448 + 42,465` lines, reconciled
`(159-5) + (5-1) + (211-2) = 367`.

| commit | what went |
| --- | --- |
| `84e810b` | `tests/schgen/` — 134 files, 124 of them test files, **1,241 assertions** — plus `tests/cli/schgen.test.ts`, `tests/circuits/guard-equivalence.test.ts` and `drafted-sheet.ts`'s `modelUnderTest` |
| `38c147c` | `tools/cli/schgen.ts`, `schgen-parity.ts`, `schgen-anchors.ts`, `tools/draught/gate.ts`, the three `package.json` scripts |
| `6085dc5` | `lib/schgen/` (109 files), `tools/schgen/` (81), the sixteen layout-intent files, `lib/kicad/libtable.ts`, `lib/kicad/footprint.ts`, `tools/repo.ts` |
| `dd7ba1a`, `933583e` | `lib/kicad/schematic.ts` — the stub writer — with `tests/circuits/kicad-round-trip.ts`, `tests/circuits/stub-writer-tripwire.test.ts`, `tests/kicad/schematic.test.ts`, and the five `transistor-preamp` tests repointed |

**The earlier figure in that report was wrong and is shown corrected there**: it
said *"342 files, ~42,500 lines"*, where the `~42,500` was `6085dc5` alone. It
was the one figure in the task not derived from a command and it had been
repeated to the owner. Recorded here because it is `CLAUDE.md`'s *"a figure in
prose is a transcription with a date on it"* landing on a report rather than on
a module comment.

**THE WHOLE-FILE ACCOUNTING WAS MEASURED, NOT ASSUMED** **[task-9]**. Each of
the 124 deleted test files had its imports resolved and classified. Four
imported nothing from either deleted tree — `pointers.test.ts`,
`text-metrics/pen-call-sites.test.ts`, `render/templates/mismatch-census.test.ts`
and `__fixtures__/require-tool.ts` — and the first three are static scans **over
the deleted trees' own source text**, so their subject died with them.
Thirty-nine imported something that survives, and in every case it was a
utility rather than the subject.

**AND THE ONE THAT WAS GOT WRONG IS THE LESSON OF THE WHOLE PLAN.** The research
document's paste guard was waved through as *"a guard on `docs/research/`, now
unguarded"* without anybody opening the constant that names its subject —
which is `docs/schematic/text-handling-research.md`, a 432 KB committed
deliverable that `CLAUDE.md` names and that survives. The checker had **one
import, `node:fs`**, and sat under `tools/schgen/` by an accident of history.
It was restored in `22e184e` as a move. **A path under a deleted tree is
evidence about history, not about what a file depends on** — three files were
saved by reasoning that way (`libtable.ts`, `footprint.ts`, `repo.ts`) and one
was lost by not.

### What was deleted in the prose pass, and why deletion rather than annotation

`docs/schematic/template-parity.md` and `docs/schematic/template-parity-anchors.md`.
Both were headed *"GENERATED - do not hand-edit"* and both named the verb that
rewrote them — `bun run schgen-parity`, `bun run schgen-anchors` — which went in
`38c147c`. A derived artifact that nothing can regenerate and nothing can
content-compare is exactly what makes stale look current, so *supersede means
delete*. They are in git at the commit before. Their one live citation, the row
in `docs/schematic/README.md`, is removed; their citation from the dated
2026-10-26 governance review is left inert, which `CLAUDE.md` explicitly
accepts.

---

2. Where each surviving capability went
---------------------------------------

| what it was | where it is now | task |
| --- | --- | --- |
| `roundTrip` — sheet-against-model comparison, inside `lib/schgen/gates/` | `compareSheetToModel` in **`lib/kicad/sheet-agreement.ts`**, importing nothing from the generator, returning a `SheetAgreement` of **six** lists (the brief predicted five) | 1 |
| the board guards' model-building | **`tests/circuits/sheet-model.ts`**'s `modelForSheet(board)`, returning `{ network, designators, pinNumbers }` | 1, 4 |
| `POLE_PIN`, `THROW_PINS`, `SPDT_PINS` — switch pin geometry in `circuits/pultec/schematic/section-board.ts` | **`circuits/pultec/physical/parts.ts`**, doc comments verbatim, the three runtime refusal messages repointed because a builder reads those | 2, 4 |
| `pultecDesignator`, `JUNCTION_DESIGNATORS`, the designator regex | **`circuits/pultec/designators.ts`** | 3 |
| the live `kicad-cli` round trip for the Pultec boards | **`tests/circuits/drafted-kicad-round-trip.test.ts`**, on the five committed `drafted/` pages | 5 |
| the live `kicad-cli` round trip for the preamp boards | **`tests/circuits/transistor-preamp-kicad-round-trip.test.ts`**, on each board's committed `.kicad_sch` under `circuits/transistor-preamp/` | 5 |
| `lib/schgen/render/occupancy.ts` | **`tools/guide/occupancy.ts`**, beside its surviving consumer; its one self-contained test block moved to `tests/guide/occupancy.test.ts` with the assertions unchanged | 7 |
| `checkVendoredAgreement` — the only check comparing a vendored symbol against the installed library's own text | **`tests/kicad/symbol-names.test.ts`**, as `vendoredDrift` | 9 |
| the research document's paste checker | **`tools/text-metrics/verify-pastes.ts`**, driven by `tests/text-metrics/document-pastes.test.ts`, with the four probe logs at `docs/schematic/text-handling-research-logs/` | 9 |

**Task 7's brief said `occupancy.ts` had one consumer and it had four**, three
of them invisible to the brief's own path grep — one a same-directory relative
import, one a probe with no importers that still had to typecheck, one a test
file. Found by grepping the symbol names instead of the path literal. Recorded
because the same shape recurred in Task 8, where `tools/guide/packet.ts` turned
out to import `boardRefs`/`boardSheets` straight from `tools/schgen/board-sheets.ts`
and not only through `schematic-source.ts`.

---

3. The equivalence evidence for the rebuilt guards
--------------------------------------------------

**The sequence was deliberate: build the replacement, prove it reports exactly
what the original reported, switch the guards onto it, and only then delete the
original.** That ordering is what makes the deletion a move rather than a loss,
and it is the part a later reader cannot re-derive once the original is gone.

- **`tests/kicad/sheet-agreement.test.ts`** — 18 pass / 0 fail on the new module
  alone, and `bun test tests/kicad/` 262 pass / 0 fail across 19 files, at
  Task 1. The module was also measured equal to `roundTrip`'s output on all five
  drafted pages **before** its commit landed.
- **`tests/circuits/guard-equivalence.test.ts`** — the binding evidence, at
  Task 4: **10 pass / 0 fail**. For each of the five pages, `compareSheetToModel`
  and `lib/schgen/gates/round-trip.ts`'s `roundTrip` agree on all **six**
  `SheetAgreement` lists, **element for element and UNSORTED**, plus five
  controls that each fire on one swapped pin number. The test imported the
  deleted implementation on purpose, so it could only exist before the deletion
  and was deleted with it in `84e810b` — **which is why this document records
  what it proved.**
- **Five deleted claims were checked onto their new homes rather than taken on
  trust** **[task-9]**: the four-kind symbol whitelist and `ALL_KINDS.length === 11`
  onto `tests/kicad/sheet-agreement-tables.test.ts` arm 1; the `MECHANICAL_PINS`
  arms onto its arms 2–6; `nc-pins.test.ts`'s installed-library arms — the
  thirteen pins of `SW_Rotary_1x12`, pin 12 as a throw and not a lug, and
  `THROW_PINS ∪ POLE_PIN ∪ MECHANICAL_PINS` as exactly the pin set — onto
  `tests/circuits/pultec-switch-geometry.test.ts`; `symbol-census.test.ts`'s
  G118 criterion onto `tests/kicad/symbol-names.test.ts`; and the two live
  `kicad-cli` round trips onto Tasks 5 and 6's two files.
- **A sixth claim was unaccounted, and finding it is the reason that sweep was
  worth doing** **[task-9]**. `render/stock-symbols.test.ts` arm 1 was the only
  thing comparing every vendored symbol against the installed library's own
  flattened text. Both sides of it survive; the surviving arms only assert that
  a name resolves and that a copy loads with pins, **neither of which notices a
  KiCad release redrawing a symbol under the same name — which is the only thing
  the vendored set is for.** Ported.
- **And its first control could not fail.** It asserted the installed text
  equals the vendored text and then that it does not equal that same text plus a
  space — a string against itself plus a character. **Under the very sabotage
  its own comment claimed to catch, both lines passed.** `22e184e` rebuilt it to
  perturb the installed side in memory and require `vendoredDrift`, the same
  function the real arm calls, to report the disagreement, with a second arm
  handing the flattener a different symbol of the same library. **Driven, not
  argued.**

**Four repo-wide static guards were repaired rather than rebuilt** **[task-9]**,
and three exemption mechanisms were deleted rather than left empty —
`NOT_A_KICAD_SYMBOL` (8 ids), `FIXTURE_FOOTPRINT_LIBRARY` (4) with two
`NOT_A_KICAD_FOOTPRINT` entries, and `REMOVES_VIA_OWN_LIST` (3) with one
`REGISTERING` entry. Each was pinned in both directions, so each **failed** when
the tree went, which is the guards working. A comment stands where each was,
naming what it held and that a future ported fixture needs the list, its teeth
and its test back together.

---

4. The `transistor-preamp` coverage delta, measured
---------------------------------------------------

**This was the plan's one real risk of a silent loss, and the first measurement
of it was wrong in the pessimistic direction.** Recorded in full because the
correction is the useful part.

**What those five boards had.** Each of
`tests/circuits/transistor-preamp-{lab,buffered,feedback,loop,staged}.test.ts`
carried a test named *"KiCad reads the generated stub as the same circuit"*: it
wrote a **fresh, throwaway** stub from the live model with
`lib/kicad/schematic.ts`'s `writeSchematicStub`, exported that with the real
`kicad-cli`, and compared three assertion shapes — net membership, values,
footprints.

**The first conclusion** was that this test needed the stub writer, could not
survive its deletion, and that **nothing would replace it**, because Task 5's
drafted-page round trip covers only the five Pultec boards with a page under
`drafted/` and none of the five preamp boards has one.

**The coordinator caught the error on review.** The measurement of the
dependency was right; the inference was not. *"These boards have no `drafted/`
page"* was treated as equivalent to *"these boards have nothing that proof can
run against"* — but what the proof needs is **any committed schematic plus a
comparison built for that schematic's vocabulary**, and these five boards have
exactly that: a committed `.kicad_sch` under `circuits/transistor-preamp/`,
declared as its own `"sch"` in `boards/<board>/perfboard.json`, and
`expectSameCircuit`'s `toImportedNetlist` comparison, **which never imported the
stub writer and was never going anywhere.** The live proof the stub was
apparently carrying in fact lived in `lib/kicad/`; **only the subject was
dying.**

**The corrected conclusion, and it is the one that holds.** No test will again
write a fresh throwaway stub and export it — that exact description is gone.
But `tests/circuits/transistor-preamp-kicad-round-trip.test.ts` gives each of
the five boards a `bun test`-time, live-`kicad-cli`, model-against-schematic
proof with **the same three assertion shapes**, run against the committed, real
`.kicad_sch` rather than a throwaway — **a truer claim about what ships than the
stub ever was.** So all ten boards now hold that proof, each pointed at the
artifact its own board keeps, through whichever comparison is honest for that
artifact's vocabulary: `compareSheetToModel` for Pultec's off-board parts on an
agent-drawn page, `expectSameCircuit`/`toImportedNetlist` for
`transistor-preamp`'s ordinary perfboard designators.

**`bun test tests/circuits/transistor-preamp-kicad-round-trip.test.ts`: 10 pass
/ 0 fail**, at Task 5.

`tests/circuits/stub-writer-tripwire.test.ts`, deleted with the writer, was a
tripwire on the deletion precondition and not a model-agreement assertion, so it
carries none of this coverage and is not counted here.

---

5. The open question, and it is the owner's
-------------------------------------------

**`schematic/readability-baselines.json` NOW HAS NO READER AT ALL. WHETHER TO
KEEP IT IS HIS DECISION AND NOBODY HAS TAKEN IT.**

It is spec section 3.3's readability-baseline registry: a committed,
owner-granted comparison between a drawing's four measures — bends, crossings,
wire length, occupied area — and a prior drawing of the same block that he
reviewed. `lib/schgen/readability/baseline.ts` was the only code anywhere in
this repository that could parse it, and it is deleted. The registry was not on
the delete list, because it lives under `schematic/` and not under any of the
three deleted trees, **so it survives as a file with no reader rather than as a
file that was removed.**

Measured at Task 7, and cheap to retake:

- **one commit in its entire history** — `b526c1d`, 2026-10-20, *"Task 16: the
  generation manifest, the four measures, the baseline registry and the finding
  contract"*. No change since.
- **`"baselines": []` — zero granted entries, ever.** No owner judgement has
  ever been recorded in it. Section 3.3 grants a baseline only once a block
  reaches a second generation to compare against, and that has not happened for
  any circuit here.

So nothing of substance is lost if it disappears. **What is at stake is the
schema and the channel** for recording a future owner-granted comparison —
whether that channel is still wanted now that its only reader is gone. That is
not an agent's call: `CLAUDE.md` holds that an agent may never author the
acceptance criteria for the artifact it is producing, and a registry of his
recorded judgements about a drawing is exactly such a criterion. **Raised here,
not decided here.** `schematic/README.md` is the page beside the file, and it
says the same thing.

**The 28-case loader test went with the loader.** If the channel is kept, it
needs a reader and a test together; if it is retired, the file goes.

**AND THE FILE'S OWN `notes` BLOCK STILL DESCRIBES THAT LOADER IN THE PRESENT
TENSE — DELIBERATELY NOT EDITED.** Its `schema` note says *"Schema 1 names the
twelve fields `lib/schgen/readability/baseline-model.ts` declares"* and *"the
loader refuses any other value"*; `grantedBy` says *"the loader refuses any
other grantor by name"*; `measures` says *"the loader refuses a sixth number by
name"*. **There is no loader to refuse anything.** The prose pass left every
byte of it alone because this plan's standing gate is that
`git diff -- drafted/ schematic/*.json` is empty, and a registry whose only
content is a schema plus the owner's reserved channel is not a file an agent
edits on its own reading. **`schematic/README.md` is where the correction
lives**, and it says plainly that the registry now has no reader. Whoever
answers the question above settles the `notes` block with it: kept, it needs a
reader and these sentences become true again; retired, the file goes and they go
with it.

**Also left alone, and not repository content**: `build/schgen-boards/` and
`build/schgen-defective-fixture/` may still sit on a working tree from before
the deletion, with a `STATUS.md` and a `RENDER-REPORT.md` per board. They are
**untracked and covered by `.gitignore`'s `build/`**, which is exactly what that
file's comment anticipated when the two specific entries were removed with the
tools that wrote them. Nothing in the repository regenerates or reads them;
`git clean -fdx` removes them.

---

6. What nothing in this repository holds any more
-------------------------------------------------

**Stated as a list because each one is a gap the next plan inherits, not a loose
end to sweep up.**

- **NOTHING GUARDS A DOC-TO-TEST POINTER ANYWHERE IN THIS REPOSITORY.** The
  guard that did was `tests/schgen/pointers.test.ts`, a whitelist of rows that
  each asserted the cited file exists and still contains a fragment of the cited
  assertion's own title — and that pinned its own length besides. **Every row's
  cited test file was inside the deleted tree**, so no row could be kept and the
  mechanism went whole. Two surviving documents, `docs/schematic/m1-remeasurement.md`
  and `docs/schematic/reference-graph-checks.md`, carried `bun test tests/schgen/...`
  re-run instructions for files that do not exist. **They are annotated rather
  than repaired, and the heading says why**: a repaired citation would be held to
  nothing, and the next one to rot would do it silently. `G233`'s stated
  limit — *"every other prose reference to a test file in this repository can
  still rot silently"* — is now the whole of it.
- **`tools/draught/gate.ts` is gone and nothing replaced it.** `TOOLING.md`
  recorded it as *"committed and known inadequate"* — it matched a netlist
  exactly on the page that had overflowed to A5 and was missing a third of its
  circuit. **Read its deletion as a widened gap, not a resolution**: the hole it
  named is open and there is now not even an inadequate check sitting in it.
- **Eight of `docs/schematic/false-greens.md`'s "what guards against it here"
  clauses named a guard inside the deleted tree**, which makes a catalogue of
  false greens claim protection it has lost — itself a false green. They are now
  enumerated in a table at the head of that file: three live and moved, five
  gone, one split. **The three live ones had their paths repaired in the clauses
  themselves**, because a live guard cited at a dead path is that file's own
  mechanism 10 happening again; the five dead ones are left as written and
  answered in the table, because repairing one would mean inventing a
  replacement guard and there is none to name.
- **The four text-handling probes are deleted and their four logs are not**, so
  no log can be re-driven from this tree (they are in git at `6085dc5^`). The
  checker never established that a log was a current run — what it couples is
  the document to the log it was pasted from — so that coupling is intact and
  the loss is the ability to take the measurement again.
- **`elkjs` 0.9.3 is still declared in `package.json` and nothing imports it.**
  The generator was its only consumer; the remaining mentions in the tree are
  that declaration, `bun.lock` and the research documents. Recorded rather than
  dropped, because removing it is a `package.json` change and the closing task
  was a prose pass. `README.md` now says it is dead weight rather than a
  prerequisite.
- **`SCHGEN_SOURCE` is no longer read by anything**, so the eight failures it
  produced on an unset variable are out of the `bun test` baseline. That row is
  removed from `README.md`'s prerequisites and from its
  what-its-absence-does-to-the-suite table.

### A pre-existing defect found by the prose sweep, unrelated to the generator

`docs/schematic/README.md` said *"SEVEN later documents in this directory are
not in it"* over two tables holding **eight** rows, and introduced the second
table as *"the remaining five"* over **six** rows. **Both were understated by
one**, and the file had already corrected that same number once — *"it said five
until 2026-10-23, when the eighth pass added two"* — without either figure
matching what it indexed. That is the fourth instance of a pattern whose first
three the file's own inventory note records. **Both counts are deleted rather
than corrected again**, with the tables left as the list, which is what
`CLAUDE.md`'s *"a figure in prose is a transcription with a date on it"* asks
for. **[RAN]** — counted off the file at `HEAD` before the edit.

---

7. What draws a page now
------------------------

**`TOOLING.md` is the procedure and `EVALUATING-DRAWINGS.md` binds before it.**
Nothing here computes a coordinate: copperhead `0.12.0` drafts a `.kicad_sch`
from an intent built off this repository's own model, akcli-kicad `0.22.0`
repairs it, `kicad-cli` `10.0.5` renders and exports it, **the owner approves or
rejects the rendered page**, and the page is committed under
`drafted/<circuit>/<board>/` beside a `RECORD.md` carrying the sha256 the
verdict is bound to.

**`docs/schematic/verdicts.md` is the authority for a verdict, and a page's
status is never derived.** A `RECORD.md` is the copy beside the drawing; where
the two disagree the register is right. **Four of the five Pultec records say
their page is awaiting re-approval**, because each was re-papered or re-drawn
after its verdict and a verdict is bound to bytes — `EVALUATING-DRAWINGS.md`
§5. **[RAN]** — read off the five `RECORD.md` files on 2026-10-31. **Do not
quote "five approved pages" from this document**, and do not derive the count
from `drafted/` either: the directories say which boards have a page, and only
the register says what he thought of one.

**Neither copperhead nor akcli is pinned in this repository**, and `TOOLING.md`
says so in terms. They have lived in an agent session's scratchpad, which
`git clean -fdx` destroys. That is a standing risk this plan neither touched nor
enlarged.

---

8. The figures the plan closed on
---------------------------------

**All four read out of Task 9's report and attributed to it, not re-measured
here** **[task-9]**:

| gate | figure |
| --- | --- |
| `bun run typecheck` | **clean** after every commit |
| `bun test` | **2714 pass / 0 fail** across **258 files** — 2669 before `22e184e` restored the 44 paste cases and added a second control arm. The 8 baseline failures were `tests/schgen/port-fidelity.test.ts` on an unset `SCHGEN_SOURCE` and went with their file. **Zero failures remain** |
| `make check` | **exactly four FAIL, seven ok** — `pt2399-core` (no parts-list rule for `delay_ic` in `tools/bom/needs.ts`), `transistor-preamp-lab`, `-loop`, `-staged` (incomplete layout state). **The same four boards and the same two causes as the pre-plan baseline**, and neither cause mentions a schematic |
| the five drafted sheets | **byte-identical** — `a1fa4159 e9843e6d b9e42e6a 5e1a4139 d4b0b8cc`, with `git diff f6a4d40..HEAD -- drafted/ schematic/` empty **over Task 9's range, which is the command and the range that report gives** |

**All five Pultec guides rebuild**, 12 pages each and 13 for `pultec-mid`, each
printing `guide.pdf is ONE document: page 2 is the schematic` — a message gated
on `carriesSchematic`, so it is evidence rather than boilerplate. **[task-9]**

**One of those four `make check` failures is worth reading twice**, and Task 9
flagged it: **`pt2399-core` fails before its drawing is ever looked at**, on a
BOM rule for `delay_ic`. That is the shape the owner named on 2026-10-27 —
*"a gate halts rendering and we never look at the picture so we can't tell if
the gate is insane or not"*. It is not this plan's to fix and it is not fixed.

**Gates were run serially throughout.** A full `bun test` takes around 270
seconds and segfaulted once under concurrent load, so it was never run beside
`make check`.

**The prose pass's own gates, driven here** **[RAN]**, 2026-10-31:
`bun run typecheck` clean; `bun test tests/text-metrics/` **44 pass / 0 fail**
before and after the edit to the document those 44 cases guard;
`git diff -- drafted/ schematic/readability-baselines.json` empty.

**DO NOT WIDEN THAT LAST EXPRESSION TO `schematic/` AND EXPECT IT EMPTY.** The
row above quotes Task 9's command over Task 9's range; **the gate this prose
pass was held to is `drafted/` plus `schematic/readability-baselines.json`**,
because `schematic/README.md` is prose in the same directory and the prose pass
rewrote it. Run against `schematic/` at a later commit the diff is red on that
README, and reading it as a changed sheet would be a false alarm of exactly the
kind this document exists to prevent.
