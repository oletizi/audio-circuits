# `lib/schgen/`

A port of `digital-pedal-platform`'s `tools/schgen/` — a schematic generator
that turns a circuit model into KiCad s-expressions. It lives under `lib/`
because, like `lib/kicad/`, it is pure: it reads its own vendored symbol
libraries (see `lib/kicad/symbol-library.ts` for the precedent) and spawns
nothing. `kicad-cli` lives behind `tools/schgen/kicad-run.ts` once that file
ports, never here.

## How a file gets here

Every file under `lib/schgen/` is either produced by `tools/schgen/port.ts`
or named in `port-manifest.json`'s `handWritten` list — never both, and
never neither. A ported file is produced by reading
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
is a different claim, checked by the first part of this same test and by
`bun test` simply failing to find the file; it is not compared against a
`lib/schgen/` directory listing it never claimed to be complete over.)
**A ported file is never hand-edited**, and a hand-written file never slips
in unlisted: a new hand-written file must be added to `handWritten`
deliberately, or the second check fails naming it. If a ported file needs a
content change beyond a declared cut, the pedals source changes (or the
file is edited in a later task that has a stated reason to diverge,
recording the deviation), and `port.ts` runs again.

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
  removed its `handWritten` entry in favour of a `files[]` one. `strict.ts`
  is now the only hand-written file under `lib/schgen/`.

  Its fixture libraries are NOT `.ts` and so are not ported by this
  manifest: `tests/schgen/__fixtures__/symbols/Fix.kicad_sym` and
  `Pwr.kicad_sym` are copied verbatim from the pedals source, and
  `tests/schgen/port-fidelity.test.ts` compares them byte-for-byte against
  `$SCHGEN_SOURCE` so a hand-edited or drifted copy fails rather than
  quietly changing what every fixture-backed test measures.

  **The four test files Controller ruling R4 deferred arrive with it** —
  `tests/schgen/ir/build.test.ts`, `classify.test.ts`, `validate.test.ts`
  (`docs/known-gaps.md` **G113**) and `tests/schgen/render/geometry.test.ts`
  (**G115**). All four call `fixtureResolver()` at module scope, so each
  would have thrown at module load against the stub; they were removed from
  the manifest rather than landed red, and Task 4 re-added their entries
  (`build.test.ts`, `classify.test.ts` and `validate.test.ts` with the same
  pin-map `cuts` Task 2 derived) and landed them passing.
- **`@/schgen/gates/oscar/*`.** Five files, deferred to Task 18 by the plan
  (the Pultec reference-graph comparison needs the complete pipeline first).
- **`@/schgen/design`, `@/schgen/generate`, `@/schgen/generateFiles`,
  `@/schgen/verify`, `@/schgen/kicadRun`, `@/schgen/kicadConfig`, and the
  `connectivity`/`traceability`/`pinIdentity` gates.** Each imports at least
  one of the above, directly or transitively, so each waits on the same task
  that resolves what it needs.

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
