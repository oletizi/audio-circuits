# Task 3 report — BoardSheets carries drawings and schematicRoot

## What changed

`tools/schgen/board-sheets.ts` only. Followed the brief exactly: did NOT create
`tools/schgen/generated-sheet.ts` (the plan's superseded Task 3). `boardSheets()`
remains the sole resolver.

Added two fields to `BoardSheets`:

- `drawings: readonly SheetDrawing[]` — straight off `Generation.drawings`.
  `[]` on `no-declaration` and `refused`, `g.drawings` on `generated`.
- `schematicRoot: string | undefined` — the written top-level `.kicad_sch` path.
  `undefined` on `no-declaration` and `refused`, the computed `root` on `generated`.

Imported `SheetDrawing` as a type from `../../lib/schgen/render/sheet-types.ts`.

On the `generated` success path, hoisted `const root = path.join(outDir,
\`${design.spec.project}.kicad_sch\`)` out of the `if (options.pdf)` block so it
is computed unconditionally and shared between the PDF-export call and the new
`schematicRoot` field. Nothing else in the file changed.

## Before/after census diff

Step 1 (before), verbatim:

```
$ bun tools/schgen/board-sheets.ts 2>&1 | grep -v "^    wrote " > /tmp/sheets-before.txt
$ tail -6 /tmp/sheets-before.txt
transistor-preamp-staged: refused
    block tp-second-stage: the ELK backend cannot realise its subgraph: block tp-second-stage: the ELK route does not pass the clearance checks that grade template output (spec 1.4 obligation 4): value of power symbol VCC 0 at (29.21, 8.89) overlaps label BUFFER_BASE at (29.21, 1.27); value of power symbol VCC 0 at (29.21, 8.89) overlaps wire 6 of tp-second-stage (DRIVE_WIPER) [clearance: overlaps between value of power symbol VCC 0 at (29.21, 8.89) and label BUFFER_BASE at (29.21, 1.27) in block tp-second-stage]

7 of 11 boards produce a schematic
4 refused; 0 have no authoring declaration
WARNING: 34 fallback field placement(s) across 6 board(s). Those sheets carry text the placer could not keep clear; each generation's RENDER-REPORT.md names them per block and per unit.
```

(55 lines total, matching the brief's expectation of `7 of 11 boards` and 34
fallback field placements.)

Step 3 (after the edit), verbatim:

```
$ bun tools/schgen/board-sheets.ts 2>&1 | grep -v "^    wrote " > /tmp/sheets-after.txt
$ diff /tmp/sheets-before.txt /tmp/sheets-after.txt && echo IDENTICAL
1c1
< writing generations under /var/folders/sk/jzwspmzn1g17x97x7s7l_dch0000gn/T/schgen-board-sheets-MJ5iSQ
---
> writing generations under /var/folders/sk/jzwspmzn1g17x97x7s7l_dch0000gn/T/schgen-board-sheets-iRiFxJ
```

(exit 1, not `IDENTICAL`). This is NOT a behaviour change: the only differing
line is the `console.log(\`writing generations under ${outDir}\`)` line at the
top of `main`, and `outDir` is `fs.mkdtempSync(...)` — a fresh random temp
directory name on every run, before and after the edit, unrelated to this
change. Confirmed by re-diffing with that one non-deterministic line excluded:

```
$ diff <(tail -n +2 /tmp/sheets-before.txt) <(tail -n +2 /tmp/sheets-after.txt) && echo IDENTICAL
IDENTICAL
```

Every board outcome, sheet count, fallback count, and the three summary lines
(`7 of 11 boards produce a schematic`, `4 refused; 0 have no authoring
declaration`, `WARNING: 34 fallback field placement(s) ...`) are byte-identical
before and after. The brief's `grep -v "^    wrote "` strips the per-file
`wrote <path>` lines (which also vary by temp dir) but does not strip this one
`writing generations under ...` banner line; that line was always going to
differ run-to-run regardless of this change, which is why I compared from line
2 onward as well. **Census diff: identical in substance, not byte-for-byte
identical including the known-nondeterministic banner line.**

## Typecheck

```
$ bun run typecheck
$ tsc --noEmit
EXIT:0
```

No output, exit 0.

## Full suite

```
$ SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
...
 3884 pass
 0 fail
 44089 expect() calls
Ran 3884 tests across 362 files. [156.69s]
[exited with code 0]
```

**`Ran 3884 tests`, `0 fail`.** This matches the orchestrator's stated current
branch-state expectation of exactly `Ran 3884`, 0 fail (given to me directly,
superseding the brief's stale `Ran 3877` figure, which the brief itself
qualifies as "3872 at the branch base, plus 5 added by Task 1" — evidently the
branch has moved since the brief was written). I did not adjust anything to
force a match; this is the number the suite produced.

`tests/schgen/decomposition-probe.test.ts` ran as part of the full suite and
passed (no failure reported for it in this run), so the known load-dependent
timeout flake did not manifest here and needed no isolated re-run.

## Commit

```
$ git add tools/schgen/board-sheets.ts
$ git commit -F <msg file>
[feature/schematics-tooling a0bf085] BoardSheets carries drawings and schematic root for the guide packet
 1 file changed, 26 insertions(+), 1 deletion(-)
```

SHA: `a0bf08531df0db219b57f27a2a386fd9d042b885`

Only `tools/schgen/board-sheets.ts` was staged and committed (verified with
`git status --short` before commit, which showed only `M  tools/schgen/board-sheets.ts`).

## Deviations from the brief

- The brief's Step 5 expected `Ran 3877`; actual was `Ran 3884`. Per the
  orchestrator's explicit instruction, `3884` is the current confirmed branch
  state and this change adds no tests, so `3884` with `0 fail` is the correct
  and expected outcome here — not a deviation needing adjustment, just a
  divergence from the brief's (stale) number, reported as instructed.
- Step 3's `diff ... && echo IDENTICAL` did not print `IDENTICAL` on the raw
  before/after files because of the non-deterministic `mkdtemp` directory name
  printed in the banner line, which the brief's `grep -v` filter does not
  strip (it only strips `wrote <path>` lines). I additionally diffed with that
  one line excluded and confirmed byte-identical output otherwise. This is a
  gap in the brief's exact filter command, not a behaviour change from the
  code edit.

## Concerns

None. The interface addition is additive only, both new fields are populated
on every return path per the brief's exact table, the import uses the
specified relative path with `.ts` extension, no `any`/`as`/`@ts-ignore` was
used, and the diff matches the brief's specified edit exactly (confirmed via
`git diff` before committing).
