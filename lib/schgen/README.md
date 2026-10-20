# `lib/schgen/`

A port of `digital-pedal-platform`'s `tools/schgen/` — a schematic generator
that turns a circuit model into KiCad s-expressions. It lives under `lib/`
because, like `lib/kicad/`, it is pure: it reads its own vendored symbol
libraries (see `lib/kicad/symbol-library.ts` for the precedent) and spawns
nothing. `kicad-cli` lives behind `tools/schgen/kicad-run.ts` once that file
ports, never here.

## How a file gets here

Nothing in this directory is hand-written against the pedals source. Every
file is produced by `tools/schgen/port.ts`, which reads
`tools/schgen/port-manifest.json`, copies the named file from
`$SCHGEN_SOURCE/tools/schgen/<from>`, and rewrites exactly two things: its
`@/schgen/<path>` and resolved-external imports (into this repository's
explicit relative paths), and a prepended provenance header. Nothing else
changes — see `rewrite()` in `tools/schgen/port.ts`.

`tests/schgen/port-fidelity.test.ts` holds this to account two ways: for
every entry in the manifest, it re-derives the ported file from the pedals
source and the manifest's own rewrite rule, and asserts the result is
byte-identical to what is on disk; separately, it lists every `.ts` file
that actually exists under `lib/schgen/` and asserts that list is exactly
`files[].to` plus `handWritten` — not a subset. **A ported file is never
hand-edited**, and a hand-written file never slips in unlisted: a new
hand-written file must be added to `handWritten` deliberately, or the
second check fails naming it. If a ported file needs to change, the pedals
source changes (or the file is edited in a later task that has a stated
reason to diverge, recording the deviation), and `port.ts` runs again.

**`SCHGEN_SOURCE` has no default** — see the root `README.md`'s
Prerequisites section and `docs/known-gaps.md` **G110** for why, and for the
consequence that this plan's remaining 18 tasks inherit the same
dependency.

## What is ported, and what is not yet

`port-manifest.json`'s `files` list is **not** the whole corpus — it is only
the files that import nothing this repository cannot yet resolve. Four
things are missing on purpose, and later tasks add to the manifest as each
is resolved rather than hand-porting around the gap:

- **`@/kicad/netlist`, `@/kicad/footprint`, `@/kicad/libtable`,
  `@/kicad/components`.** This repository's `lib/kicad/netlist.ts` has a
  different shape from pedals' `tools/kicad/netlist.ts` (`importNetlist` /
  `ImportedNetlist` here, versus `connectivityFromXml` / `KICAD_CLI` there) —
  adapting gate 3 to it is Task 11's job, stated in the plan, not a mapping
  this task can shortcut.
- **`@/pinmap/*`.** There is no MCU in this repository. `ir/build.ts`'s
  `PinmapInput` branch is dead code here; Task 2 removes it rather than
  porting it (supersede means delete), so `ir/build.ts` is not ported until
  that task does both at once.
- **`@/schgen/gates/oscar/*`.** Five files, deferred to Task 18 by the plan
  (the Pultec reference-graph comparison needs the complete pipeline first).
- **`@/schgen/design`, `@/schgen/generate`, `@/schgen/generateFiles`,
  `@/schgen/verify`, `@/schgen/kicadRun`, `@/schgen/kicadConfig`, and the
  `connectivity`/`traceability`/`pinIdentity` gates.** Each imports at least
  one of the above, directly or transitively, so each waits on the same task
  that resolves what it needs.

A file is safe to add to the manifest once every import it has — direct or
through another `@/schgen/<path>` import — resolves to something already
ported or to one of `externals`' three entries (`@/kicad/sexpr`,
`@/placement/strict`, `@/repo`). `tools/schgen/port.ts`'s `resolveSpecifier`
throws, naming the file and the unresolved import, if that is not yet true —
it does not silently leave an unported import in place.

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
- **Ported file content is byte-identical to its source modulo imports and
  the file header.** `port.ts` does not reformat, does not strip the pedals
  project's semicolons, and does not fix anything it notices — a defect in a
  ported file is a defect in the source, carried here on purpose, fixed in a
  task that has a stated reason to diverge.
