# `lib/schgen/`

A port of `digital-pedal-platform`'s `tools/schgen/` — a schematic generator
that turns a circuit model into KiCad s-expressions. It lives under `lib/`
because, like `lib/kicad/`, it is pure in the sense that matters: it reads
symbol libraries off disk (see `lib/kicad/symbol-library.ts` for the
precedent) and spawns nothing. `kicad-cli` lives behind
`tools/schgen/kicad-run.ts` once that file ports, never here — what
`render/library.ts` and `render/stock-symbols.ts` use is the *path* to it,
to derive the installed symbol directory, never an invocation.

Since Task 4 it reads two sources, not one: this repository's vendored
symbols and the installed KiCad's stock symbol directory, with the vendored
set as the authority the installed one is checked against. See
`render/stock-symbols.ts` and `docs/known-gaps.md` **G118**/**G119** for what
that buys and what it costs.

## How a file gets here

Every file under `lib/schgen/` is produced by `tools/schgen/port.ts`, named in
`port-manifest.json`'s `handWritten` list, or named in its `diverged` list —
**exactly one of the three**, never two and never none.
`tests/schgen/port-fidelity.test.ts` holds all three claims: the byte-check
over `files[]`, the disjointness of the three categories, and the
bidirectional completeness of their union against a listing of the directory.
A ported file is produced by reading
`tools/schgen/port-manifest.json`, copying the named file from
`$SCHGEN_SOURCE/tools/schgen/<from>`, and rewriting exactly three things, in
order: this entry's declared `cuts` (if any — see below), its
`@/schgen/<path>` and resolved-external imports (into this repository's
explicit relative paths), and its handful of bare `moduleRenames` (e.g.
`"vitest"` to `"bun:test"` for a ported test file). A prepended provenance
header follows. Nothing else changes — see `rewrite()` in
`tools/schgen/port.ts`.

**A ported file's content may differ from its pedals source only through a
declared `cuts` entry, never through a hand edit.** A manifest file entry
may carry `cuts: [{ text, occurrences }]` — text that must appear in the
pedals source exactly `occurrences` times, deleted before anything else
runs. This exists for a deliberate removal the plan calls a cut rather than
a port (Task 2's `ir/types.ts` and `ir/build.ts`, which drop the MCU pin-map
branch entirely — see `docs/known-gaps.md` **G112**): the cut is data, in
the manifest, reviewed and re-derivable on every run, rather than a diff
smuggled into the file on disk. `applyCuts` refuses (does not guess) if the
pedals source has drifted and a cut's text no longer appears its declared
number of times.

`tests/schgen/port-fidelity.test.ts` holds this to account two ways: for
every entry in the manifest, it re-derives the ported file (cuts and all)
from the pedals source and the manifest's own rewrite rule, and asserts the
result is byte-identical to what is on disk; separately, it lists every
`.ts` file that actually exists under `lib/schgen/` and asserts that list is
exactly the subset of `files[].to` that lands under `lib/schgen/` plus
`handWritten` — not a subset of either alone. (A `files[].to` destination
outside `lib/schgen/` — a ported test under `tests/schgen/`, since Task 2 —
is a different claim, that *this* destination holds exactly the rewritten
source, and the first part of this same test is what checks it; it is not
compared against a `lib/schgen/` directory listing it never claimed to be
complete over. **`handWritten` may not name a path outside `lib/schgen/`
at all** — a third assertion in that file fails on one, and fails on any
entry naming a path that is not on disk. An earlier version of this
paragraph said such an entry was covered by `bun test` failing to find the
file; that was false, because `bun test` discovers test files by glob and
a misspelt entry names a file nothing looks for.)
**A ported file is never hand-edited**, and a hand-written file never slips
in unlisted: a new hand-written file must be added to `handWritten`
deliberately, or the second check fails naming it. If a ported file needs a
content change beyond a declared cut, the pedals source changes and `port.ts`
runs again — or the file **diverges**, below.

## `diverged`: a file that has stopped being a port

Since **Task 8** the manifest has a third list. A `diverged` entry says that
a file was ported, that a named task deliberately changed its CONTENT, and
why: `{ from, to, task, why }`. `from` is still the pedals source path, and
`port-fidelity.test.ts` checks it exists under `$SCHGEN_SOURCE`, so the
provenance is a claim that can fail rather than a comment.

**Why it had to exist.** Task 8 widens `RealiseResult` from two outcomes to
five classified ones across `render/block-types.ts`, the seven templates and
five helper modules, and it deletes the `labels` rendering (plan decision
**D3**) that the pedals source has and will keep. Neither is expressible as a
`cuts` entry — cuts are deletion-only and both of those are modifications —
and the alternative, dropping the entries, would have taken each file's
provenance with it and left nothing recording that it ever was a port.
**Ruling R18 is the rule this implements: a file may diverge, and it may not
diverge silently.**

**The line between a cut and a divergence.** If the only content change is
removing text that is in the source, it is a `cuts` entry and the file stays
in `files[]`, byte-checked and re-derived on every run. Task 8 does exactly
that for `ir/validate.ts`'s one-line `labels` clause. Anything else — a
rename, a substitution, new code — is a divergence.

**What a divergence costs, plainly.** Nothing compares a diverged file
against its source again. The byte-check iterates `files[]` only, so an
upstream fix in `digital-pedal-platform` will not arrive here by re-running
the porter, a drift between the two is invisible to every check here, and the
`cuts` a file carried while it was ported stop being declared anywhere but
this manifest's git history. `docs/known-gaps.md` **G139** sizes that loss
(it is 25 files after Task 8, nine of them the port-parity tests Task 7
landed) and records the mechanism that was considered instead and why it was
not taken.

Running the porter prints one `DIVERGED, not rewritten:` line per entry, so a
run cannot be read as having refreshed them. `resolveSpecifier` resolves
`@/schgen/<path>` imports through `diverged` as well as `files[]`, because a
diverged file still occupies its destination and the files that import it are
still ports.

**`SCHGEN_SOURCE` has no default** — see the root `README.md`'s
Prerequisites section and `docs/known-gaps.md` **G110** for why, and for the
consequence that this plan's remaining 18 tasks inherit the same
dependency.

## What is ported, and what is not yet

`port-manifest.json`'s `files` list is **not** the whole corpus — it is only
the files that import nothing this repository cannot yet resolve. Several
things are missing on purpose, and later tasks add to the manifest as each
is resolved rather than hand-porting around the gap:

- **`@/kicad/footprint`, `@/kicad/libtable`, `@/kicad/components`.** Not
  resolved, and nothing here imports them yet.
- **`@/kicad/netlist` resolves, but only for `KICAD_CLI`** (Task 4).
  `render/library.ts`'s `stockSymbolDir()` derives
  `dirname(KICAD_CLI)/../SharedSupport/symbols`, so `lib/kicad/netlist.ts`
  gained that path constant and `externals` points the specifier at the module
  it names. **Everything else about the two modules still differs** —
  `importNetlist` / `ImportedNetlist` here, versus `connectivityFromXml` there
  — and adapting gate 3 to it is Task 11's job. A later ported file importing
  `connectivityFromXml` therefore fails `bun run typecheck` naming the missing
  export rather than refusing at port time.
- **`@/pinmap/*` is gone, not deferred.** There is no MCU in this repository.
  Task 2 ports `ir/build.ts` and `ir/types.ts` *with a cut* that removes the
  `PinmapInput` branch, `BuildContext.pinmap`, `CircuitSpec.mcu` and
  `Circuit.mcu` entirely (supersede means delete — see `docs/known-gaps.md`
  **G112**) rather than waiting on `@/pinmap/*` to resolve; nothing here
  imports it any more.
- **`render/library.ts` is PORTED** (Task 4). It was a hand-written forward
  declaration — the interfaces plus a `createResolver` that threw, naming
  Task 4 — until that task replaced it wholesale with the pedals source and
  removed its `handWritten` entry in favour of a `files[]` one. The
  hand-written files under `lib/schgen/` are now `strict.ts`,
  `render/stock-symbols.ts` and the seven `render/obstacle-*.ts` modules
  (Task 5).

  **`render/obstacle-matrix.ts` and its six `render/obstacle-pairs-*.ts`
  siblings are hand-written and have no pedals source**, because the pedals
  generator never did this. They are the obstacle-category matrix
  `docs/known-gaps.md` **G85** asks for: 14 categories, all 105 unordered
  pairs including self-pairs, each cell naming the function that decides it or
  the reason it needs none. They are a LEDGER, not a check — nothing in the
  pipeline imports them, and `tests/schgen/render/obstacle-matrix.test.ts` is
  the only reader. **Do not read the matrix passing as clearance coverage**:
  95 of its 105 cells rest on reading the ported source rather than on a test
  that could have failed, and **G125** says which. **G126** and **G127** are
  the two blind spots that filling it found; **G128** records where it
  deviates from the Task 5 brief's stated shape.

  Why seven files: 105 defensible sentences is about 1,200 lines, over
  `CLAUDE.md`'s 300-500 ceiling. The data is split by row family and the
  reasons several cells share live once in `render/obstacle-pairs-reasons.ts`.
  Those modules take only `import type` from `obstacle-matrix.ts`, so the
  dependency runs one way at run time.

  **`render/stock-symbols.ts` is hand-written and has no pedals source.**
  It builds the nickname-to-library-file map `createResolver` is handed,
  from this repository's vendored symbols and the installed KiCad's stock
  symbol directory, and it refuses when a vendored symbol disagrees with the
  installed library. The pedals project has no vendored set, so there is
  nothing to port; `docs/known-gaps.md` **G119** records the decision, the
  deviation from the plan's stated mechanism, and the alternative rejected.

  Its fixture libraries are NOT `.ts` and so are not ported by this
  manifest: `tests/schgen/__fixtures__/symbols/Fix.kicad_sym` and
  `Pwr.kicad_sym` are copied verbatim from the pedals source, and
  `tests/schgen/port-fidelity.test.ts` compares them byte-for-byte against
  `$SCHGEN_SOURCE` so a hand-edited or drifted copy fails rather than
  quietly changing what every fixture-backed test measures.

  **The four test files Controller ruling R4 deferred arrive with it** —
  `tests/schgen/ir/build.test.ts`, `classify.test.ts`, `validate.test.ts`
  and `tests/schgen/render/geometry.test.ts`. All four call
  `fixtureResolver()` at module scope, so each
  would have thrown at module load against the stub; they were removed from
  the manifest rather than landed red, and Task 4 re-added their entries
  (`build.test.ts`, `classify.test.ts` and `validate.test.ts` with the same
  pin-map `cuts` Task 2 derived) and landed them passing.

  **A fifth file is deferred under R4 and for a different reason** —
  `render/symbolSelfText.test.ts`. It is import-clean and runs, but its
  fixture makes a `mkdtemp` directory and removes nothing, so
  `tests/stripboard/temp-scratch.test.ts` refuses the whole suite. Cleanup is
  content a `cuts` entry cannot add and a ported file may not be hand-edited,
  so the entry came back out. **The module it tests is covered anyway, by a
  HAND-WRITTEN `tests/schgen/render/symbol-self-text.test.ts`** that
  transcribes every fixture and expectation from the pedals test and takes its
  temp directory from `freshTempScratch`. What that costs is the one thing the
  port would have given: `tests/schgen/port-fidelity.test.ts` does not
  byte-check a hand-written file, so a drift in the pedals source's
  expectations goes unnoticed. `docs/known-gaps.md` **G123** carries the
  evidence, both mechanisms, the three that were ruled out and why, and the
  residual; **G122** is the same cost in the shape the existing exemption table
  does cover.
- **The clearance checks are PORTED, and since Task 7 most of them ARE
  exercised.** Task 5 landed thirteen modules of which twelve were run by no
  test, because every clearance test but `connectivity.test.ts` and
  `wireSafety.test.ts` imports `@/schgen/render/blocks`, which imports
  `@/schgen/render/templates/index`. **Task 7 ported both**, and with them
  four of the waiting tests: `render/bodyClearance.test.ts`,
  `textClearance.test.ts`, `unitText.test.ts` and `noConnectEnds.test.ts`.
  Measured by `bun test tests/ --coverage`, the set of modules under
  `lib/schgen/` that nothing runs went from **17 to 5**: what is left is
  `render/emit.ts`, `emit-items.ts`, `erc-exclusions.ts`, `report.ts` and
  `gates/pin-table.ts`. `docs/known-gaps.md` **G124** has the per-test table,
  both measurements and why the earlier "no test imports it by name" currency
  was the wrong one.

  **Three clearance tests are still out**, and so is the ninth template test:
  `glyphClearance.test.ts` and `glyphGlyphClearance.test.ts` want
  `render/sheetCheck.ts`, `textIndependence.test.ts` wants `render/bus.ts`,
  and `render/templates/templateStock.kicad.test.ts` wants
  `render/sheets.ts` — all three modules are **Task 6b**'s. Both
  `sheetCheck.ts` and `bus.ts` are import-clean today, so these are blocked on
  a task boundary rather than on a dependency. **G135** carries the porter's
  refusal for each and the exact manifest JSON to re-add them.
- **`@/schgen/gates/oscar/*`.** Five files, deferred to Task 18 by the plan
  (the Pultec reference-graph comparison needs the complete pipeline first).
  `gates/oscar/graph.ts` also needs `@/kicad/components`, which is unresolved.
- **`@/schgen/design`, `@/schgen/generate`, `@/schgen/generateFiles`,
  `@/schgen/verify`, `@/schgen/kicadRun`, `@/schgen/kicadConfig`, and the
  `connectivity`/`traceability`/`pinIdentity` gates.** Each imports at least
  one of the above, directly or transitively, so each waits on the same task
  that resolves what it needs.
- **The TEMPLATES and the block layout engine are PORTED** (Task 7):
  `render/blocks.ts`, `layout-kit.ts`, `chain-kit.ts`, `fanout-kit.ts`,
  `fanout-rows.ts` and `render/templates/` — eight registered template ids in
  seven modules plus `opamp-classify.ts` and the registry. Eight of the nine
  ported template test files run (97 pass / 0 fail), which is **port parity**:
  the pedals project's own fixtures against the ported templates with imports
  rewritten and nothing else. That is a regression measurement and says
  nothing about whether a template fits a discrete audio circuit — a different
  number, measured by Task 10.
  `tests/schgen/render/templates/mismatch-census.test.ts` pins the 30
  `mismatch(...)` sites Task 8 must widen, per module, with the five helper
  result types beside them.

- **The EMITTER is ported and the SHEET is not** (Task 6a), and the split is not
  where the plan put it. `render/emit.ts`, `emit-items.ts`, `page-refs.ts`,
  `erc-exclusions.ts`, `project.ts` and `report.ts` are here; the four modules
  that would feed them a drawing - `render/frames.ts`, `bus.ts`,
  `sheet-check.ts` and `sheets.ts` - are **not**. They imported
  `@/schgen/render/blocks`, which Task 7 has now landed, so
  **`sheet-check.ts` and `bus.ts` are import-clean today** and `frames.ts`
  waits only on `bus.ts`; all four are **Task 6b**'s to port.
  `generate.ts` needs `layoutSheet` from
  `render/sheets.ts`, and `design.ts`/`generateFiles.ts` need Task 18's
  `gates/oscar/boundary`, so **nothing here can yet emit a schematic file
  through its own pipeline**: there is a correct emitter with no sheet to hand
  it. `docs/known-gaps.md` **G131** has the per-file table and the port's own
  refusal for each, and **G136** records how Task 7 looked at all eight
  templates' output anyway, and what that does not establish.

  The consequence for coverage is the same one **G124** records for Task 5:
  **five of Task 6's six newly ported modules are exercised by no test** -
  `render/emit.ts`, `emit-items.ts`, `page-refs.ts`, `erc-exclusions.ts` and
  `report.ts` typecheck and nothing runs them, because every ported test that
  would exercise them imports `render/sheets.ts`. The sixth,
  `render/project.ts`, IS exercised, by the ported `render/project.test.ts`.

  **What Task 6 did unblock is `__fixtures__/circuits.ts`** (ported to
  `tests/schgen/__fixtures__/circuits.ts` with the same MCU `cuts` Task 2
  derived), and with it five ported tests that were waiting on nothing else:
  `render/pack.test.ts`, `drawnText.test.ts`, and the three `lock/` tests. The
  three `lock/` modules and `render/pack.ts` and `drawn-text.ts` are no longer
  unexercised.

  **A ported FIXTURE trips this repository's standing guards just as a ported
  test does.** `__fixtures__/circuits.ts` declares `symbol: "Pwr:+3V3"`, which
  `tests/kicad/symbol-names.test.ts` sweeps and requires to resolve in an
  installed KiCad library; it needed a `NOT_A_KICAD_SYMBOL` entry beside the
  `Fix:R` and `Pwr:GND` ones Task 2 added. That is now the **second** repo-wide
  static guard the port has had to be exempted from, after the temp-scratch
  check of **G122**/**G123** - see **G133**, which says why the recurrence
  matters more than either entry.

A file is safe to add to the manifest once every import it has — direct or
through another `@/schgen/<path>` import — resolves to something already
ported or named in `externals`. `tools/schgen/port.ts`'s `resolveSpecifier`
checks `externals` *before* the `@/schgen/<path>` lookup, so a task can
point an import at a hand-written forward declaration without that file
needing to be a `files[]` entry itself — that is how `render/library.ts`
resolved before Task 4 ported it, and the mechanism remains available;
otherwise it throws, naming the file and the unresolved import, rather than
silently leaving an unported import in place.

## Conventions carried over from the plan

- **File names are kebab-case**, this repository's convention; the pedals
  source is camelCase. `port-manifest.json`'s `files` entries carry the
  rename; `port.ts` does the mechanical part.
- **Non-null assertions (`!`) in ported files are kept as the pedals source
  wrote them.** Pedals compiles under `noUncheckedIndexedAccess`; this
  repository does not, so under this compiler they are redundant no-ops
  rather than something unsafe. Rewriting the ~194 sites across the whole
  port would be unreviewable churn that buries the port diff in its own
  task. **New code written for this port (this file's siblings written by
  hand, not by `port.ts`) carries none.**
- **Ported file content is byte-identical to its source modulo imports, the
  file header, and any entry this file's manifest entry declares in
  `cuts`.** `port.ts` does not reformat, does not strip the pedals project's
  semicolons, and does not fix anything it notices — a defect in a ported
  file is a defect in the source, carried here on purpose, fixed in a task
  that has a stated reason to diverge. A deliberate removal is the one
  exception, and it is declared, not hand-edited — see **How a file gets
  here** above and `docs/known-gaps.md` **G112**.
