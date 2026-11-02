# Task 9 report: delete schgen

**Status: DONE.** Six commits, each green, on `feature/schematics-tooling`, all pushed.

| SHA | what |
| --- | --- |
| `84e810b` | `tests/schgen/` (134 files, 124 of them test files, 1,241 assertions), `tests/cli/schgen.test.ts`, `tests/circuits/guard-equivalence.test.ts`, `drafted-sheet.ts`'s `modelUnderTest`; four repo-wide guards repaired; one assertion ported |
| `38c147c` | `tools/cli/schgen{,-parity,-anchors}.ts`, `tools/draught/gate.ts`, the three `package.json` scripts |
| `6085dc5` | `lib/schgen/` (109 files), `tools/schgen/` (81), the sixteen layout-intent files, `lib/kicad/libtable.ts`, `lib/kicad/footprint.ts`, `tools/repo.ts` |
| `dfd629e` | the eighteen surviving files whose comments described the generator as live, `.gitignore`, `PROVENANCE.md` |
| `7a1b813` | one header tense fix |
| `22e184e` | **review fixes**: the research document's paste guard restored out of the deleted trees, the vendored-drift control rebuilt so it can fail, four more tenses |

**TOTALS, CORRECTED.** The three deletion commits removed **367 files and 69,733 lines**
(`26,820 + 448 + 42,465`), reconciled: `(159-5) + (5-1) + (211-2) = 367`. An earlier version of
this report said *"342 files, ~42,500 lines"* — **the ~42,500 was `6085dc5` alone** and the file
count was wrong as well. It was the one figure in this task that was not derived from a command,
and it was repeated to the owner on my authority; `CLAUDE.md`'s *"a figure in prose is a
transcription with a date on it"* applies to a report as much as to a module comment. **After
`22e184e` restored six of those files, the net is 361 deleted.**

## Gates

- `bun run typecheck` **clean** after every one of the five commits.
- `bun test` **2714 pass / 0 fail**, 258 files (2669 before `22e184e` restored 44 paste cases and
  added a second control arm). The 8 baseline failures were
  `tests/schgen/port-fidelity.test.ts` on an unset `SCHGEN_SOURCE` and went with their file.
  **Zero failures remain.**
- `make check`: **exactly four FAIL** — `pt2399-core` (no parts-list rule for `delay_ic` in
  `tools/bom/needs.ts`), `transistor-preamp-lab`, `-loop`, `-staged` (incomplete layout state) —
  and the other **seven ok**. Both failure causes are the pre-existing baseline ones and neither
  mentions a schematic.
- **The five drafted sheets are byte-identical**: `a1fa4159 e9843e6d b9e42e6a 5e1a4139 d4b0b8cc`,
  and `git diff f6a4d40..HEAD -- drafted/ schematic/` is empty.
- **All five Pultec guides rebuild**, 12 pages each (13 for `pultec-mid`), each printing
  `guide.pdf is ONE document: page 2 is the schematic` — a message gated on `carriesSchematic`, so
  it is evidence and not boilerplate.
- Gates run serially. No segfault.
- `schematic/readability-baselines.json`, `schematic/README.md`, the relocated pieces,
  `tests/circuits/sheet-model.ts`, `lib/kicad/sheet-agreement.ts`,
  `tests/circuits/committed-schematic.ts` and the Task 5 files: all untouched or only
  comment-corrected.

## Test accounting: 1,241 assertions across 124 files

**Every file's subject was inside `lib/schgen/` or `tools/schgen/`.** Measured rather than
assumed: each file's imports were resolved and classified, and only four had no import from
either tree — `pointers.test.ts`, `text-metrics/pen-call-sites.test.ts`,
`render/templates/mismatch-census.test.ts` and `__fixtures__/require-tool.ts`. The first three
are static scans **over the deleted trees' own source text** (a pointer whitelist citing two
`tools/schgen/` module comments and two re-run instructions for deleted tests; a call-site count
for `kicadTextBoxExtentAtPen`; a refusal census over `lib/schgen/render/templates/`), so their
subject died too. Thirty-nine files import something that survives, and in every case it is a
utility — `tests/support/temp-scratch.ts`, `tools/perfboard/repo-root.ts`,
`lib/kicad/netlist.ts`'s parser, `lib/kicad/sexpr.ts`, `lib/model/` builders — not the subject.
**So the whole-file accounting is "the generator only" for all 124.**

Six claims did outlive it. Five were already ported by earlier tasks, which is checked here
rather than taken on trust:

| deleted assertion | what covers it now |
| --- | --- |
| `rules/symbols.test.ts`: the four-kind symbol whitelist, every lib id resolved on disk, `ALL_KINDS.length === 11` | `tests/kicad/sheet-agreement-tables.test.ts` arm 1 — same assertions over `SYMBOL_BY_KIND`, with each entry's pins printed into the expectation |
| `ir/mechanical-pins.test.ts` arms 1, 1b, 4: every `MECHANICAL_PINS` key resolved, no stroke endpoint at a listed pin, the electrical-pin contrast, the stale-entry control | `tests/kicad/sheet-agreement-tables.test.ts` arms 2–6, which say so in their own comments |
| `nc-pins.test.ts`'s installed-library arms: the thirteen pins of `SW_Rotary_1x12`, pin 12 as a throw and not a lug, `THROW_PINS ∪ POLE_PIN ∪ MECHANICAL_PINS` exactly the pin set | `tests/circuits/pultec-switch-geometry.test.ts` (Task 1), including the angle-and-side arm `a8646cb` restored |
| `symbol-census.test.ts`: G118's criterion, every symbol a parity circuit names resolves | `tests/kicad/symbol-names.test.ts` — all four parity circuits declare their symbols as literals, so the text sweep reaches every one and resolves it |
| `gates/round-trip.kicad.test.ts`, `gates/pt2399-nc-round-trip.kicad.test.ts`: a live `kicad-cli` round trip | Tasks 5 and 6 — `tests/circuits/drafted-kicad-round-trip.test.ts` and `transistor-preamp-kicad-round-trip.test.ts`, on the committed sheets |

**A SEVENTH WAS UNACCOUNTED AND I GOT IT WRONG FIRST TIME — see the struck "dropped" entry below
for the research document's paste guard, restored in `22e184e`.** The sweep that found the other
six resolved imports and classified subjects correctly; what it did not do for that one file was
**open the constant naming its subject**, and the file's directory was allowed to stand in for its
dependency. That is the generalisable lesson of this task: a path under a deleted tree is evidence
about history, not about what a file depends on. Three files were saved by reasoning that way
(`libtable.ts`, `footprint.ts`, `repo.ts`) and one was lost by not.

**The sixth was unaccounted, and it is the finding.** `render/stock-symbols.test.ts` arm 1 was the
only thing comparing every VENDORED symbol against the installed library's own flattened text, and
the comparison itself was `lib/schgen/render/stock-symbols.ts`'s `checkVendoredAgreement`. Both
sides of that claim survive — `lib/kicad/symbols/*.sexpr`, `VENDORED_SYMBOLS`, and
`tools/kicad/vendor-symbols.ts` which writes them — and nothing else checks it: the surviving arms
are that each name RESOLVES and that each copy loads with pins, **neither of which notices a KiCad
release redrawing a symbol under the same name, which is the only thing the vendored set is for.**
Ported to `tests/kicad/symbol-names.test.ts`, with the `lib/kicad/symbols/PROVENANCE.md` sentence
that named the deleted checker corrected to name it.

**ITS CONTROL WAS VACUOUS AS FIRST WRITTEN, AND `22e184e` REBUILT IT.** The first version asserted
`installedText` equals the vendored text and then that it does not equal that same text plus a
space — a string against itself plus a character, which is a tautology. **Under the very sabotage
its own comment claimed to catch — a flattener returning the vendored text — both lines passed.**
It proved only that `===` distinguishes two different strings, which is the exact failure shape
this task spent its length applying to other people's code. It now perturbs the INSTALLED side
(one character inside the symbol's own block, in memory) and requires `vendoredDrift` — the same
function the real arm calls, factored out so the control cannot exercise a different comparison —
to report the disagreement, with the unperturbed state asserted first and a guard that the
perturbation changed something. A second arm hands the flattener a DIFFERENT symbol of the same
library, so one ignoring which name it was asked about fails too. **Driven, not argued**: under
the sabotage the old control's two lines both pass and the new one's `toBeDefined()` receives
`undefined` and fails.

### Guards that were DROPPED, with why

- **The pointer-staleness guard** (`pointers.test.ts`) had four rows. Two cited `tools/schgen/`
  module comments; the other two cited SURVIVING documents
  (`docs/schematic/m1-remeasurement.md`, `docs/schematic/reference-graph-checks.md`) — but **every
  row's cited TEST file was a deleted `tests/schgen/` test**, and a row asserts the cited file
  exists and still contains a fragment of the assertion's title. So no row could be kept, and the
  mechanism asserted `POINTERS.length === 4` and non-empty besides. **The two documents now carry
  `bun test tests/schgen/...` re-run instructions for files that do not exist.** Task 10 owns that
  prose, but here is the thing Task 10 cannot infer and must be told: **nothing guards a
  doc-to-test pointer anywhere in this repository any more.** The guard that did was a whitelist,
  it cited only deleted files, and it pinned its own length — so a repaired citation in either
  document will not be held to its test by anything, and a future one goes stale silently. That is
  the gap the next plan inherits, not merely two dangling commands.
- ~~**The research document's paste guard** (`text-metrics/document-pastes.test.ts`, 44 cases) held
  `docs/research/`'s pasted probe output to a committed run log on every `bun test`. The checker
  was `tools/schgen/text-metrics/verify-pastes.ts`, deleted. The document is a frozen record and
  `docs/research/*` is out of scope for this task, so it is now unguarded.~~
  **STRUCK AND REVERSED IN `22e184e`, and the struck text is left standing because it is the
  mistake this guard exists to catch, made about this guard.** It never guarded `docs/research/`:
  `verify-pastes.ts`'s `DOCUMENT` is **`docs/schematic/text-handling-research.md`**, the 432 KB
  document that SURVIVES, that `CLAUDE.md` names as the deliverable of the text-handling pass, and
  that `docs/schematic/README.md` points readers at first. I waved the drop through on the wrong
  file and never opened the constant. The checker was never generator code — **one import,
  `node:fs`** — and sat under `tools/schgen/` by exactly the accident of history I did reason about
  one at a time for `lib/kicad/libtable.ts` and `tools/repo.ts`. Worse, all four logs were in the
  deleted trees too, so the guard could not have been rebuilt from the tree at all. Restored as a
  move: `tools/text-metrics/verify-pastes.ts`, `tests/text-metrics/document-pastes.test.ts`, and
  the four logs at `docs/schematic/text-handling-research-logs/`, each named for its probe, each
  verified byte-identical to the original by sha256 against git. All 44 cases pass, the
  document-to-log commit coupling included. **What stays deleted is the four PROBES**, which were
  generator code, so no log can be re-driven from this tree (they are in git at `84e810b^`); the
  checker never established that a log was current, so the coupling it does make is intact. The one
  claim that changed is §6's — its probe needed nothing external, so its figures could be re-taken
  rather than trusted; that is recorded on the section's own comment.
- **`readability/baseline.test.ts`** (28 cases) was the loader's test. The loader
  `lib/schgen/readability/baseline.ts` is deleted as instructed; `schematic/readability-baselines.json`
  survives by the owner's decision and **is now read by nothing** — which is exactly what
  `schematic/README.md` was placed in Task 7 to record.
- **Three exemption mechanisms** whose last entries were all `tests/schgen/` sites:
  `NOT_A_KICAD_SYMBOL` (8 ids), `FIXTURE_FOOTPRINT_LIBRARY` (4) plus two
  `NOT_A_KICAD_FOOTPRINT` entries, and `REMOVES_VIA_OWN_LIST` (3) plus one `REGISTERING` entry.
  Each was pinned in both directions, so each FAILED when the tree went — the guards working.
  All three are deleted rather than left empty, with a comment where each stood naming what it
  held, why every swept id now has to resolve with nothing to skip past, and that a future ported
  fixture needs the list, its teeth and its test back together. **This strengthens the three
  sweeps rather than weakening them.**
- **`tests/kicad/install.test.ts`**'s `stockSymbolDir()`-agrees arm is superseded by the deletion
  of the second implementation, with a comment where it stood.

## Deviations from the brief's file list

Found by sweep, not by the list — consistent with Tasks 6, 7 and 8 each finding one:

1. **Sixteen layout-intent files, not ten.** Every export of every file under
   `circuits/*/schematic/` plus `circuits/opamp-buffer.schematic.ts` was layout intent, so all
   sixteen went and the four directories with them.
2. **Three ported files outside `lib/schgen/`**: `lib/kicad/libtable.ts`, `lib/kicad/footprint.ts`
   and `tools/repo.ts`. Every importer of each was inside the deleted trees. Their headers told a
   reader to edit the pedals source and re-run a port that no longer exists.
3. **Four repo-wide static guards** (above), none in the list.
4. **`tests/document-control-bytes.test.ts`**: its TypeScript arm named
   `tools/schgen/label-syntax/fixtures.ts` as an anti-vacuity anchor and floored the population at
   800 sources. Now one anchor per scanned root and a floor of 560 against a measured 620 (from
   917).
5. **`.gitignore`**: two `build/` entries for directories no tool writes.
6. A reachability sweep from every test file, every CLI verb and every path named in
   `make/`/`Makefile`/`package.json` finds **exactly one unreached module in 620**:
   `tools/kicad/vendor-symbols.ts`, which is a deliberately standalone regenerator named in
   `PROVENANCE.md`. So there is no other dead code left behind.

## Concerns

1. **`lib/kicad/value-notation.ts`'s `valueIsSymbolPartName` is an orphan I did not delete.** Its
   only reader was the generator's field placer; its only caller today is its own test. I labelled
   it in its header rather than removing it — the distinction it draws is a property of `valueFor`
   and of KiCad rather than of any placer, and the owner question recorded on it (*"has it occurred
   to you that extremely long labels are pathological?"*) is reasoning the next thing that decides
   whether a `Value` field is worth printing will want. **Deleting it is a live option and nothing
   depends on it.** Flagged rather than decided, because removing production code the brief did not
   list is a wider call than this task's.
2. **`schematic/readability-baselines.json` now has no reader at all.** Left alone as instructed;
   whether it survives is the owner's decision and `schematic/README.md` holds the question.
3. **Two documents under `docs/schematic/` carry re-run instructions for deleted test files**, and
   **nothing in the repository guards a doc-to-test pointer any more** — see the struck entry
   above for why the guard could not be kept. Task 10's prose sweep should repair
   `m1-remeasurement.md` and `reference-graph-checks.md`; the missing MECHANISM is the part that
   outlives Task 10.
4. ~~**`docs/research/`'s pasted probe output is no longer held to its log.**~~ **Wrong document,
   and reversed in `22e184e`** — the guard's subject was
   `docs/schematic/text-handling-research.md`, which survives, and the guard is restored. See
   above.
5. **Four probes stay deleted, so the research document's logs cannot be re-driven from this
   tree.** They are in git at `84e810b^`. The paste guard does not need them (it couples document
   to log, not log to a fresh run), but a reader who wants to re-measure a figure of §1, §2, §5 or
   §6 now has to recover a probe from git. Flagged as a known consequence rather than a defect.
6. **`elkjs` is still in `package.json`'s dependencies and nothing imports it.** Left in place
   rather than removed with a `bun install` lockfile change inside a deletion commit. One line to
   drop whenever a dependency change is welcome.
7. The four `make check` failures and their causes are unchanged from the baseline, but note that
   **`pt2399-core` fails before its drawing is ever looked at** — on a BOM rule for `delay_ic` —
   which is the `G303` shape `CLAUDE.md` warns about. Pre-existing and out of scope here.
