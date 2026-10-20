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
`$SCHGEN_SOURCE/<from>` — **that variable IS the pedals `tools/schgen/`
directory, so the path is not prefixed with it again**; an entry that declares
a `root` resolves against a declared sibling instead, and `sourcePathFor` in
`tools/schgen/port.ts` is the only thing that computes either — and rewriting
exactly three things, in order: this entry's declared `cuts` (if any — see
below), its `@/schgen/<path>` and resolved-external imports (into this
repository's explicit relative paths), and its handful of bare `moduleRenames`
(e.g. `"vitest"` to `"bun:test"` for a ported test file). A prepended
provenance header follows. Nothing else changes — see `rewrite()` in
`tools/schgen/port.ts`.

(This paragraph carried the doubled prefix until Task 6b round 2, which is the
same mistake the porter's own `header()` made — it printed
`tools/schgen/kicad/libtable.ts` for a file whose source is
`tools/kicad/libtable.ts`. Both are fixed; `docs/known-gaps.md` **G161** has
the header one, and that nothing could have caught it.)

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
this manifest's git history. `docs/known-gaps.md` **G139** sizes that loss -
after Task 8 the three lists are **64 ported, 26 diverged, 10 hand-written**,
and nine of the diverged are ported tests - and records the mechanism that was
considered instead and why it was not taken.

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

- **`@/kicad/footprint` and `@/kicad/components`.** Not resolved, and nothing
  here imports them yet.
- **`@/kicad/libtable` IS resolved, and it is a PORT reached through a SECOND
  DECLARED SOURCE ROOT** (Task 6b, Controller ruling R25).
  `tools/schgen/kicad-config.ts` needs `GlobalTable` from pedals'
  **`tools/kicad/libtable.ts`** - 279 lines of generic KiCad plumbing that
  reads the install's own global library tables, not pedals-specific
  configuration - and that file is **outside `$SCHGEN_SOURCE`**, which names
  `<pedals>/tools/schgen/`. The manifest therefore has a `sourceRoots` map
  (root name -> a path relative to `$SCHGEN_SOURCE`) and a `files[]` entry may
  carry `root`; `lib/kicad/libtable.ts` is
  `{ "from": "kicad/libtable.ts", "root": "pedals-tools" }`. It is **byte-checked
  like every other ported file**, which is R25's criterion: nothing enters this
  repository from the pedals tree without a byte-check or a declared `sourceSha`.

  **What the mechanism costs, and every later port task inherits it.**
  `$SCHGEN_SOURCE` used to be a leaf the manifest could only read downward
  from, and is now also a waypoint a declared root reaches `..` out of, so the
  env var's documented meaning (*"the port's source tree"*) is narrower than
  what the manifest can read. `assertDeclaredRoots` in `tools/schgen/port.ts`
  bounds the escape to one directory and refuses an absolute path, and
  `port-fidelity.test.ts` requires every declared root to resolve to a real
  directory **and to be used by an entry**, so an unused widening fails rather
  than sitting there. `sourcePathFor` is the single resolver both the porter
  and that test go through, and the provenance header prints the real source
  path (`tools/kicad/libtable.ts`, not `tools/schgen/kicad/libtable.ts`).
  `docs/known-gaps.md` **G161** records it.

  **It also lands the first ported file outside `lib/schgen/` and
  `tests/schgen/`,** at `lib/kicad/libtable.ts`, beside this repository's
  hand-written `sexpr.ts` and `netlist.ts`. The byte-check covers it (it
  iterates `files[]`, not a directory), but the *completeness* check - which
  asserts that every `.ts` under a directory is ported, diverged or declared -
  covers only `lib/schgen/` and `tests/schgen/`, so a new hand-written file in
  `lib/kicad/` is still invisible to the manifest. The four ported files Task 6b
  puts under `tools/schgen/` - `generate.ts`, `generated-files.ts`,
  `kicad-run.ts` and `kicad-config.ts` - are outside it for the same reason.
- **`@/kicad/netlist` resolves, but only for `KICAD_CLI`** (Task 4).
  `render/library.ts`'s `stockSymbolDir()` derives
  `dirname(KICAD_CLI)/../SharedSupport/symbols`, so `lib/kicad/netlist.ts`
  gained that path constant and `externals` points the specifier at the module
  it names. **Everything else about the two modules still differs** —
  `importNetlist` / `ImportedNetlist` here, versus `connectivityFromXml` there
  — and **Task 11 adapted gate 3 to it**: `lib/schgen/gates/connectivity.ts` is
  DIVERGED, its `compareConnectivity` takes `ImportedNetlist`, and no XML parser
  entered the tree.

  **A FILE IMPORTING A NAME AN `externals` TARGET DOES NOT HAVE NOW REFUSES AT
  PORT TIME AGAIN** (Task 11, closing `docs/known-gaps.md` **G121** clause (a)
  with that entry's own mechanism). `assertExternalExports` in
  `tools/schgen/port.ts` reads each `externals` target's exports and refuses -
  changing nothing - naming the file, the specifier and the missing export. It
  covers `externals` only, deliberately: an `@/schgen/<path>` import resolves to
  another ported file whose text is byte-checked against the pedals source, so a
  name missing there is a defect in the source; the `externals` targets are the
  ones this repository WROTE and so the ones that can silently fail to carry an
  export the source assumed. A target with an `export * from` re-export makes it
  refuse rather than guess.
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
  `render/stock-symbols.ts`, `render/problem-obstacles.ts` (Task 8) and the
  seven `render/obstacle-*.ts` modules (Task 5).

  **`render/problem-obstacles.ts` is hand-written and has no pedals source.**
  It turns one of `checkLayout`'s problem strings into the relation and the
  obstacle PAIR that Task 8's `clearance` mismatch must name, from a declared
  list of relation phrases each transcribed from the function that writes it.
  It exists because restructuring `checkLayout` to carry that pair as data
  would have diverged eight more ported modules and rewritten the assertions
  of the clearance tests that hold their text; `docs/known-gaps.md` **G145**
  records the deviation, what it costs, and the two mechanisms that would
  settle it. It refuses - returns nothing - for a problem naming no pair, and
  `connector-fanout` then throws rather than inventing one.

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

  **Task 6b decided the last three, and one of them is out for good.**
  `glyphClearance.test.ts` and `glyphGlyphClearance.test.ts` landed as pure
  ports; `render/templates/templateStock.kicad.test.ts` landed diverged (its
  PEER block declared `{ kind: "labels" }`), which makes the Task 7 brief's
  count of nine template tests nine again. **`textIndependence.test.ts` cannot
  land at all**: it calls `realiseLabelled`, deleted with the labels renderer
  (**G140**), and it is built on `vi.hoisted` and
  `vi.mock(path, (importOriginal) => …)`, which `bun:test` has no equivalent
  for. **G163** carries it with eight other ported tests the sheet port
  unblocked by import and could not land, each with the exact manifest JSON and
  what stops it; **G135** and **G124** are amended.
- **`@/schgen/gates/oscar/*`.** Five files, deferred to Task 18 by the plan
  (the Pultec reference-graph comparison needs the complete pipeline first).
  `gates/oscar/graph.ts` also needs `@/kicad/components`, which is unresolved.

  **`gates/oscar/boundary.ts` is a HAND-WRITTEN FORWARD DECLARATION** (Task 6b,
  Controller ruling R26), on exactly the pattern Task 2 used for
  `render/library.ts`: the types `design.ts` needs as types (`NetRef`,
  `DeltaEdit`, `SideSpec`, `Subcircuit`'s five fields) plus an `oscarParts`
  that **throws, naming Task 18**. A `cuts` entry deleting
  `OscarConfig.subcircuits` was refused instead, because it would port
  `design.ts` by deleting what Task 18 needs and the plan declares no such cut.
  **Task 18 replaces the file wholesale** and removes its `handWritten` entry
  for a `files[]` one. It is also the first forward declaration to meet Task 8's
  no-shadowing guard, which it necessarily trips - a forward declaration always
  shadows its own future port - so it carries a declared exemption in
  `tests/schgen/port-fidelity.test.ts`. `docs/known-gaps.md` **G162** records
  what it carries, what it does not, and that `SideSpec` is transcribed here
  although it belongs upstream to `gates/oscar/graph.ts`.
- **`@/schgen/verify` and the `connectivity`/`traceability`/`pinIdentity`
  gates.** Each imports at least one of the above, directly or transitively, so
  each waits on the same task that resolves what it needs - Task 11's, mostly.
- **`@/schgen/design`, `generate`, `generateFiles`, `kicadRun` and
  `kicadConfig` ARE PORTED** (Task 6b). `design.ts` is at
  `lib/schgen/design.ts`, with `cuts` removing `CircuitSpec.mcu`'s shape guard
  and `DesignSpec.pinmap` outright - there is no MCU here, so a design module
  declaring a pin map is a type error rather than a field nothing reads. The
  other four are at `tools/schgen/generate.ts`, `generated-files.ts`,
  `kicad-run.ts` and `kicad-config.ts`, under `tools/` because `kicad-run.ts`
  spawns `kicad-cli` and this file's opening paragraph says that never happens
  under `lib/`. `generate.ts` carries seven `cuts`, all of them the MCU pin-map
  branch (**G112**): `pinmapInputFor` and its two `@/pinmap/*` imports are
  gone, and `pinned` stays as an empty map, because `annotate` takes one and a
  design may still pin a reference.
- **The TEMPLATES and the block layout engine are PORTED** (Task 7):
  `render/blocks.ts`, `layout-kit.ts`, `chain-kit.ts`, `fanout-kit.ts`,
  `fanout-rows.ts` and `render/templates/` — eight registered template ids in
  seven modules plus `opamp-classify.ts` and the registry. Eight of the nine
  ported template test files run (97 pass / 0 fail), which is **port parity**:
  the pedals project's own fixtures against the ported templates with imports
  rewritten and nothing else. That is a regression measurement and says
  nothing about whether a template fits a discrete audio circuit — a different
  number, measured by Task 10.
  `tests/schgen/render/templates/mismatch-census.test.ts` pinned the 30
  `mismatch(...)` sites Task 8 had to widen, per module, with the five helper
  result types beside them.

- **TASK 8 HAS WIDENED THEM, AND IT IS THE FIRST TASK THAT DELIBERATELY
  CHANGED PORTED CODE RATHER THAN PORTING IT.** `RealiseResult`'s false arm
  carries a classified `Mismatch` of four kinds, `mismatch(reason)` is
  deleted, and all 30 sites are classified: 18 `not-applicable`, 2
  `invalid-geometry`, 1 `clearance` and 9 forwards of an already-classified
  mismatch (`docs/known-gaps.md` **G143** has the per-module table and what
  the lopsidedness means). `selectRenderer` is new and implements spec §1.3:
  an `auto` block whose every template reports `not-applicable` goes to the
  ELK backend, and anything else refuses - **G147** records why a `wired`
  block's `not-applicable` must refuse too, and the 43 red tests that
  established it. The `labels` rendering is gone (**G140**), and the census
  now counts sites per module AND per kind, over source text with comments
  and literals blanked out.

  **Twenty-six files diverged for it** - fourteen for the widening and twelve
  for the `labels` deletion - which is what the `diverged` list above is for
  and what **G139** counts.

- **The EMITTER AND THE SHEET ARE BOTH PORTED** - the emitter by Task 6a
  (`render/emit.ts`, `emit-items.ts`, `page-refs.ts`, `erc-exclusions.ts`,
  `project.ts`, `report.ts`) and the four modules that feed it a drawing by
  **Task 6b**: `render/frames.ts`, `sheet-check.ts` and `sheets.ts` as ports,
  and `render/bus.ts` **diverged**. Bus diverged because the labels renderer
  goes with the rendering (decision D3, **G140**) - that much is pure deletion -
  while `renderBlock`'s switch has to cover Task 8's new `auto` kind, and
  covering it is new code, which `cuts` cannot express. `auto` goes to
  `realiseBlock` with no ELK backend, so an `auto` block no template draws
  throws naming the block (**G146**); threading a `Backend` through
  `renderBlock`, `blockContent` and `layoutSheet` is Task 12's.

  **SO THIS REPOSITORY NOW EMITS A SCHEMATIC THROUGH ITS OWN PIPELINE, and
  somebody has looked at one.** `bun run schgen generate <design>` builds,
  validates, locks, lays out, emits and writes; `tools/schgen/kicad-run.ts`
  exports the PDF and runs ERC. `docs/known-gaps.md` **G165** is the first look -
  what the two sheets of the ported `mini` fixture look like, that the
  frame-title collision **G136** saw is gone, that `assertSheetSafe` and
  `assertTextClear` ran clean over a frame-bearing scene and were driven red to
  prove it, one blind spot that drive found, and `runErc(…, "all")` at 0 errors
  and 2 warnings.

  The consequence for coverage reverses **G124**'s Task 6 entry: the five
  modules nothing ran - `render/emit.ts`, `emit-items.ts`, `erc-exclusions.ts`,
  `report.ts` and `gates/pin-table.ts` - are now **two**, and the two are
  `gates/pin-table.ts` and the new `gates/oscar/boundary.ts`. What runs them is
  the eleven ported tests Task 6b landed plus the hand-written
  `tests/schgen/emit-byte-stable.test.ts`.

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
resolved before Task 4 ported it, and how `gates/oscar/boundary` resolves
today; otherwise it throws, naming the file and the unresolved import, rather
than silently leaving an unported import in place.

**There are now TWO resolution rules in that function and they do not compete.**
`externals` first, as above; then the `@/schgen/<path>` lookup, which matches
**only entries on the DEFAULT source root**. An entry with a declared `root`
names a file outside the pedals `tools/schgen/` tree, so it can never satisfy a
`@/schgen/<path>` import — without that restriction `kicad/libtable.ts` would
answer for a `@/schgen/kicad/libtable` that exists nowhere.

**`tools/schgen/port-probe.ts` is how you ask the question** without editing the
manifest: it adds one provisional entry at a time to an in-memory copy and calls
`rewrite()`, printing `OK` or the porter's own refusal per file, and writes
nothing. `OK` means the imports resolve — not that the file type-checks or that
its assertions pass.

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
