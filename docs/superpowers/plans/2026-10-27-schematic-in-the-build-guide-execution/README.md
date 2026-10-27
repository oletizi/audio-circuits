# Execution record: the schematic-in-the-build-guide plan

**This is not findings, and it does not bind.** It is the decision record and audit trail of one
plan's execution, committed because `CLAUDE.md` requires it: *"a plan's record is committed beside
the plan"*, and the rule is explicitly not limited to research plans. The working ledger lived in
`.superpowers/sdd/`, which is gitignored — so without this file, `git clean -fdx` destroys the only
copy of every decision taken here, and a later reader cannot re-derive any of it.

**What binds is the code, the tests and the tools.** `docs/known-gaps.md` is frozen and holds only
owner decisions; a measurement lives in the tool that re-runs it
(`bun run tools/schgen/board-geometry.ts`), and a defect not being fixed lives in a comment beside
the code it is about.

## What was built

Tasks 1 to 4 of `../2026-10-27-schematic-in-the-build-guide.md`, in commits `3975e30..23ef67a`:

- `lib/schgen/render/fan-geometry.ts` — per-vertex corner counting and segment counting, with
  refusals for non-orthogonal and zero-length wires.
- `tools/schgen/board-geometry.ts` — the baseline, per board and per block, re-runnable.
- `tools/schgen/board-sheets.ts` — `BoardSheets` carries `drawings` and `schematicRoot`.
- `tools/guide/schematic-source.ts`, `schematic-notice.ts`, `packet.ts`, `guide.ts` — the build
  guide prints a schgen-generated schematic, or withholds one and says so.

Tasks 5 and 6 — the selector-bank arrangement, developed by drawing — are NOT implemented and are
not meant to be. They are an owner-facing loop.

## THE PLAN DOCUMENT IS STALE IN THREE PLACES AND IS NOT BEING REWRITTEN

**Read this before following that plan.** Rewriting it would destroy the record of what was
actually asked, which is the more useful artifact. The deviations:

1. **The plan's File Structure and Task 3 create `tools/schgen/generated-sheet.ts` with a
   `generatedSheetFor` signature. That file does not exist and was never built** (Ruling 3). There
   was nothing to extract: `boardSheets()` in `tools/schgen/board-sheets.ts` was already the
   per-board resolver, and a new module would have been the second copy of board-to-design
   resolution that the task existed to prevent. What landed instead is two added fields on
   `BoardSheets`.
2. **Tasks 2 and 3 ran in the opposite order to the plan's numbering** (Ruling 4), because the
   geometry tool needs the `drawings` that the `BoardSheets` change exposes. The plan's order would
   have had Task 2 write a duplicate board loop and Task 3 delete it.
3. **THE PLAN'S TASK 1 CONTAINS, VERBATIM AND PRESENTED AS THE IMPLEMENTATION TO WRITE, A
   `wireGeometry` THAT IS WRONG** (Ruling 5). Its corner counter counts per segment PAIR, so a hub
   with three arms scores 2 for one vertex — and this repository's `edgesForNet` emits a STAR, so a
   hub with both horizontal and vertical arms is the normal case. It also scores a diagonal wire
   zero, silently. **Do not copy that code block.** What shipped counts per vertex and refuses
   non-orthogonal and zero-length wires.

## Rulings, in the order they were made

Each is a decision the controller took rather than stopping to ask, with what it costs if wrong.

| # | Ruling | Cost if wrong |
| --- | --- | --- |
| 1 | The geometry tool moves to the shared resolver rather than keeping its own `try/catch` refusal path | Small rework of one tool's error branch |
| 2 | **AMENDED BEFORE IT SHIPPED.** First said the packet should build `GenerateEnv` with `initLock: false`; `readRefLock` throws when the lock file is absent and `initLock` is false, and the packet generates into a fresh temp dir that never has one — so every board would have refused for a reason that was purely this ruling's artefact. Corrected to `true` | None now; had it shipped, four boards would have refused with a misleading message |
| 3 | No new `generated-sheet.ts`; extend `BoardSheets` instead | Task 4 consumes a different shape than the plan names — handled by rewriting the brief |
| 4 | Tasks 2 and 3 swap | The plan and the ledger disagree on numbering; no code consequence |
| 5 | The reviewer's refutation of the plan's own corner counter is CORRECT; corners count per vertex, and non-orthogonal and zero-length wires are refused | The baseline's corner figures change meaning. Contained — no baseline had been published |
| 6 | The `decomposition-probe` timeout flake is NOT fixed inside this plan | The suite stays intermittently red under load, which could mask a real failure; mitigated by re-running per-file before acting on any 2-fail result |
| 7 | The defective verification filter in the Task 3 brief is recorded, not retrofitted | Nothing; no later step uses it |
| 8 | Accept the implementer's deviation adding `boardRefs`/`boardSheets` to `GuideDeps` rather than calling them directly | Two more injection points to keep honest |
| 9 | The generated export must route through `deps.exportSchematicPdf` — my brief's defect | None; honouring an existing seam cannot break a caller that was not using it |
| 10 | Close the temp-dir leak when the resolver throws | None |
| 11 | Split `packet.ts` at the 500-line ceiling | None |
| 12 | **PARKED, not fixed:** a no-`sch` board's guide depends on schgen's own `KICAD_CLI` resolution, which no caller can redirect — `make guide --kicad-cli` governs the export but not the generation | A guide build refuses on a machine where `KICAD_CLI` differs; the comment in `tools/guide/schematic-source.ts` is what tells that person why |
| 13 | Promote and fix the zero-drawings gate: `[].every(...)` is `true`, so a generation with no sheets would have passed the gate having examined nothing | None |

## What the review process actually caught, and what it did not

Kept because the pattern is more reusable than the findings.

**Three defects were invisible to every task-scoped review, by construction:**

- The **port-manifest gap** — a new file under `lib/schgen/` must be declared as ported, diverged or
  hand-written, and no task diff can show that. Found by running the full suite.
- **`crossings` was already implemented**, in `lib/schgen/readability/measures.ts`, over
  `canonicalTopology`, which refuses an ambiguous overlap rather than publishing a figure about a
  drawing nobody picked. The new module duplicated it WITHOUT that refusal. No task diff contained
  `measures.ts`. Found only by the whole-branch review. **This is the constitution's Principle 6
  failure — read what the project already knows before adding to it — committed by the controller's
  own pre-flight scan, which checked task-against-task conflicts and never asked whether the thing
  already existed.**
- **The withheld notice asserted a sheet was drawn when schgen had refused**, live on `pultec-mid`.
  Three claims printing as two notices: the governing rule failing on its own terms.

**And one defect would have armed itself on success:** `tests/guide/clusters-packet.test.ts` injects
a throwing `exportSchematicPdf` so a stray export is loud. While both target boards are withheld,
nothing exports and the test is green. The moment the drawing work drives a board's fallbacks to
zero, that board resolves `generated` and spawns the real binary at the test's fake path. Nothing
today would have caught it.

**Two defects were caught by telling a reviewer to do the arithmetic by hand rather than trust the
tests** — the per-pair corner count, and the `parseInt` that truncated a fractional coordinate and
silently dropped a corner.

## Deferred, with the final review's triage

Nothing here blocks the drawing work.

- **SHOULD:** `BoardGeometry` fills its numeric fields with `0` on refused and no-declaration
  boards. The printed output is honest, but `boardGeometryCensus` is exported, and a consumer
  reading the record directly would average four zeros in and report crossings falling when nothing
  changed. `number | undefined` or a union makes it unrepresentable.
- **SHOULD:** `tests/schgen/decomposition-probe.test.ts` is a load-dependent timeout flake — 3.3s
  alone against bun's default 5s, and it enumerates 524,216 subsets. It already cost one false
  two-failure reading during this execution.
- **SHOULD:** `schematicRoot`'s doc comment says "Absolute path" where the type guarantees none.
- **SHOULD:** `fan-geometry.ts` does not state that collinear different-net overlap counts as zero
  crossings — a scope limit its comment does not list beside the two it does.
- **FINE:** the unreachable second `schematicRoot`-undefined refusal (TypeScript narrowing, not dead
  code); two O(n²) passes; `VertexInfo` declared in-function; port-manifest entries not globally
  sorted.

## Where the rest of the record is

The working ledger, every dispatch brief, every implementer report and every review package are in
`.superpowers/sdd/2026-10-27-schematic-in-the-build-guide/` for the life of this worktree, and are
gitignored. Everything from them that a later reader would need and could not re-derive is in this
file. The review packages are not copied: they regenerate from `git diff`.
