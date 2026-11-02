Task 2 report: the geometry baseline, as a tool

What was built
---------------

`tools/schgen/board-geometry.ts` — a new tool, run as `bun run tools/schgen/board-geometry.ts`.
For every board under `boards/` (via `boardRefs`/`boardSheets` from `tools/schgen/board-sheets.ts`
— no second board-walking loop, per the brief), it prints one row:

- `generated`: board name, `segments`, `crossings`, `corners`, `fallbacks`.
- `refused` / `no-declaration`: board name and the blocker/reason IN FULL, in place of the numbers,
  never beside zeros.

Then a totals line over the boards that generated, and a line saying how many did not.

`wireGeometry` (from `lib/schgen/render/fan-geometry.ts`) is folded PER BOARD (summed over every
`SheetDrawing` the board produced, via `BoardSheets.drawings`), never per block, matching the
brief's `sum`/`geo` pattern verbatim. Its throw on a diagonal or zero-length wire is NOT caught —
it propagates and names the board/net/points itself.

The three geometry quantities (`segments`, `crossings`, `corners`) and the fallback count are kept
independent throughout: no combination, weighting, average, rank, or threshold anywhere in the
tool or its summary line. `pdf: false` is passed via `boardSheets`'s options (the tool never
exports a PDF).

`tools/schgen/port-manifest.json`: added `"tools/schgen/board-geometry.ts"` to the `handWritten`
array, placed immediately after `"tools/schgen/board-sheets.ts"` — its one real neighbour, being
built directly on top of it (the array elsewhere is chronological-by-feature rather than
alphabetical, e.g. `board-sheets.ts` / `field-fallback.test.ts` / `board-declarations.ts` /
`board-declarations.test.ts` are not alphabetical either, so "next to board-sheets.ts" is the most
defensible "sorted position among its neighbours").

Verbatim command and full output
---------------------------------

```
$ bun run tools/schgen/board-geometry.ts
writing generations under /var/folders/sk/jzwspmzn1g17x97x7s7l_dch0000gn/T/schgen-board-geometry-ti2tbv
pt2399-core: generated (segments 153, crossings 54, corners 107, fallbacks 15)
pultec-hi-boost: generated (segments 130, crossings 12, corners 79, fallbacks 8)
pultec-hi-cut: generated (segments 94, crossings 10, corners 50, fallbacks 2)
pultec-low-boost: generated (segments 111, crossings 4, corners 70, fallbacks 5)
pultec-low-cut: generated (segments 103, crossings 8, corners 61, fallbacks 1)
pultec-mid: refused
    circuit is invalid:
      - part SW_MID: pin 12 (12) is neither on a net nor declared not connected, nor a mechanical mount point in lib/schgen/ir/mechanical-pins.ts
transistor-preamp-buffered: refused
    block tp-stage: the ELK backend cannot realise its subgraph: block tp-stage: the ELK route does not pass the clearance checks that grade template output (spec 1.4 obligation 4): value of power symbol VCC 1 at (34.29, 48.26) overlaps pin Q1.2 text [clearance: overlaps between value of power symbol VCC 1 at (34.29, 48.26) and pin Q1.2 text in block tp-stage]
transistor-preamp-feedback: generated (segments 79, crossings 4, corners 48, fallbacks 0)
transistor-preamp-lab: generated (segments 132, crossings 11, corners 79, fallbacks 3)
transistor-preamp-loop: refused
    block tp-stage: the ELK backend cannot realise its subgraph: block tp-stage: the ELK route does not pass the clearance checks that grade template output (spec 1.4 obligation 4): value of power symbol VCC 1 at (34.29, 55.88) overlaps pin Q1.2 text [clearance: overlaps between value of power symbol VCC 1 at (34.29, 55.88) and pin Q1.2 text in block tp-stage]
transistor-preamp-staged: refused
    block tp-second-stage: the ELK backend cannot realise its subgraph: block tp-second-stage: the ELK route does not pass the clearance checks that grade template output (spec 1.4 obligation 4): value of power symbol VCC 0 at (29.21, 8.89) overlaps label BUFFER_BASE at (29.21, 1.27); value of power symbol VCC 0 at (29.21, 8.89) overlaps wire 6 of tp-second-stage (DRIVE_WIPER) [clearance: overlaps between value of power symbol VCC 0 at (29.21, 8.89) and label BUFFER_BASE at (29.21, 1.27) in block tp-second-stage]

totals over 7 of 11 board(s) that generated: 802 segments, 103 crossings, 494 corners, 34 fallback field placement(s)
4 of 11 board(s) did not produce a sheet (refused or no authoring declaration)
```

11 rows, matching the brief's expectation exactly: `pultec-mid` refuses on `SW_MID` pin 12;
`transistor-preamp-buffered`, `-loop` and `-staged` refuse on clearance; the other seven (including
`transistor-preamp-feedback`) generate. No board reported `no-declaration` in this run — all 11 now
carry a declaration, which is consistent with `CLAUDE.md`'s note that the declaration gap closed on
2026-10-21/24.

Cross-check against `bun tools/schgen/board-sheets.ts`
--------------------------------------------------------

```
$ bun tools/schgen/board-sheets.ts 2>&1 | grep -E "fallback field placement\(s\)\)$"
pt2399-core: generated (1 sheet(s), 15 fallback field placement(s))
pultec-hi-boost: generated (1 sheet(s), 8 fallback field placement(s))
pultec-hi-cut: generated (1 sheet(s), 2 fallback field placement(s))
pultec-low-boost: generated (1 sheet(s), 5 fallback field placement(s))
pultec-low-cut: generated (1 sheet(s), 1 fallback field placement(s))
transistor-preamp-feedback: generated (1 sheet(s), 0 fallback field placement(s))
transistor-preamp-lab: generated (1 sheet(s), 3 fallback field placement(s))
```

`pultec-low-cut` shows 1 fallback and `pultec-low-boost` shows 5 in BOTH tools, per board, and the
full set of seven generated boards' fallback counts agree exactly (15, 8, 2, 5, 1, 0, 3 — total 34
in both). I also confirmed the four refused boards are identical between the two tools
(`pultec-mid`, `transistor-preamp-buffered`, `transistor-preamp-loop`, `transistor-preamp-staged`)
by grepping the full `board-sheets.ts` output for each name and `: refused`.

Typecheck
---------

```
$ bun run typecheck
$ tsc --noEmit
EXIT:0
```

No output, exit 0, as expected.

Full suite
----------

```
$ SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
...
 3884 pass
 0 fail
 44089 expect() calls
Ran 3884 tests across 362 files. [155.47s]
```

`Ran 3884`, 0 fail — matches the expected total exactly. `tests/schgen/decomposition-probe.test.ts`
(the known load-dependent timeout flake) did not fail or need a separate re-run in this pass; it
completed inline within the full-suite run (visible output: "pultec-hi-boost: 17 members, 524216
probes..." etc., no timeout). No tests were skipped or hidden — the `SCHGEN_SOURCE` env var was set
so `tests/schgen/port-fidelity.test.ts` did not refuse any of its 8 tests.

Commit SHAs
-----------

Two commits, split because the baseline table needed to cite the SHA of the commit that introduced
the tool it was produced by — citing a commit's own not-yet-known SHA inside itself isn't possible,
so Step 8 ("commit the tool and the plan file") became two commits rather than one. This is the one
deviation from the brief's literal step list; the content is unchanged (both files are committed,
in order, on this branch).

1. `395f01de01c4c3c91243d90df92e919c619803a2` — "Add the board-geometry tool: three independent
   closed-form numbers per board" (`tools/schgen/board-geometry.ts`, `tools/schgen/port-manifest.json`)
2. `b2bd57beb978b9a85537ae58015831585e1822ec` — "Paste the geometry baseline into the plan, with the
   command and commit it reproduces from" (`docs/superpowers/plans/2026-10-27-schematic-in-the-build-guide.md`)

Both pushed to `feature/schematics-tooling` (`cb4311c..b2bd57b`).

Deviations from the brief
--------------------------

- Split Step 8 into two commits (see above) so the baseline table could cite an accurate, already-
  existing commit SHA rather than a forward reference.
- `port-manifest.json` placement: inserted right after `tools/schgen/board-sheets.ts` rather than
  alphabetically, because the array is not alphabetically sorted elsewhere either (see "What was
  built" above) and "next to the file it's built on" is the clearest reading of "sorted position
  among its neighbours" available from the file's own precedent.
- Everything else (function names, fold-per-board, refusal-in-place-of-numbers, no score, `pdf:
  false`) follows the brief and `tools/schgen/board-sheets.ts`'s structure directly.

Concerns
--------

- None found during this task. The two tools agree exactly on every board's outcome and fallback
  count, typecheck is clean, and the full suite total matches the expected 3884 with 0 failures.
- Not in scope for this task, already known and unrelated to this change: `pultec-mid` and the three
  `transistor-preamp-*` refusals are pre-existing circuit/layout issues (`SW_MID` pin 12 mechanical-
  pin gap; VCC power-symbol clearance overlaps in `tp-stage` and `tp-second-stage`), not caused by
  or fixed by this tool.
