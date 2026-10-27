# Task 2' — the geometry baseline, as a tool

> **THIS BRIEF SUPERSEDES THE PLAN'S TASK 2**, by the controller's Rulings 3 and 4 in
> `progress.md`. The plan's version re-implemented `tools/schgen/board-sheets.ts`'s board loop
> inline. It must not: `boardSheets()` is already the exported per-board resolver, and Task 3' has
> just given it the `drawings` this tool needs. Writing a second copy of that loop is precisely what
> the plan's own Task 3 exists to prevent.

## Why this tool exists, and the rule it must not break

`CLAUDE.md`: *a figure in prose is a transcription with a date on it.* The board figure in this
repository read `0`, `1`, `2`, `5`, `6` and `7` inside five days, with three files disagreeing at
once. **The tool is the answer to the question** — no count this programme produces is written into
a document as the authority.

**IT MUST NOT PRODUCE A SCORE.** The three quantities stay independent and are never combined,
weighted, averaged, ranked or thresholded. This is the hardest rule in this area: three such
proxies were invented here in two days and each pointed the opposite way to the owner's judgement
on a specific occasion. A tool that prints three numbers per board is correct; one that prints a
quality number is the defect.

## What to create

`tools/schgen/board-geometry.ts`, run as `bun run tools/schgen/board-geometry.ts`.

For every board under `boards/`, in directory order, print one row:
- `generated`: the board name, then `segments`, `crossings`, `corners`, `fallbacks`.
- `refused`: the board name and the blocker IN FULL, **in place of the numbers, never beside
  zeros**. A row of zeros for a board that drew nothing reads as a clean drawing, and `CLAUDE.md`
  is explicit that a skipped check must never look like a passing one.
- `no-declaration`: the board name and the reason, same argument.

Then a summary line giving the totals over the boards that generated, and saying how many boards
did not.

## What it is built from

Use `boardSheets` and `boardRefs`, both exported from `tools/schgen/board-sheets.ts`. Read that
file first — it is the model for the whole structure, including how it builds its `GenerateEnv`
(`kicadVersion()`, `stockSymbolDir()`, `initLock: true`, `acceptToolchain: true`) and how it makes a
scratch output directory. Follow it rather than inventing a second way.

`BoardSheets` carries, after Task 3':

```ts
readonly board: string
readonly outcome: "generated" | "refused" | "no-declaration"
readonly blocker: string
readonly sheets: number
readonly fallbacks: readonly FieldFallback[]
readonly files: readonly string[]
readonly drawings: readonly SheetDrawing[]
readonly schematicRoot: string | undefined
```

Fold `wireGeometry` (from `lib/schgen/render/fan-geometry.ts`) over `drawings`, summing per board:

```ts
const geo = r.drawings.map((d) => wireGeometry(d.wires))
const sum = (pick: (x: WireGeometry) => number): number => geo.reduce((n, x) => n + pick(x), 0)
```

**Fold per BOARD, not per block.** The owner's test is the board — what he builds — and a per-block
table lets five clean blocks hide one unreadable one.

`wireGeometry` THROWS on a wire that is neither horizontal nor vertical, and on a zero-length wire.
Do not catch those and turn them into a zero: let the tool fail loudly naming the board, because a
diagonal in a generated sheet is a finding in its own right and silently scoring it zero is the
failure this whole module was corrected for.

Pass `pdf: false` — this tool measures, it does not export.

## Steps

- [ ] **Step 1: Read `tools/schgen/board-sheets.ts`** end to end before writing anything.

- [ ] **Step 2: Write the tool.**

- [ ] **Step 3: Run it.**

```bash
bun run tools/schgen/board-geometry.ts
```

Expected: 11 rows. `pultec-mid` refuses at `validateCircuit` on `SW_MID` pin 12;
`transistor-preamp-buffered`, `-loop` and `-staged` refuse on clearance. The other seven generate.

- [ ] **Step 4: Cross-check the one number both tools report.**

```bash
bun tools/schgen/board-sheets.ts 2>&1 | grep -E "fallback field placement\(s\)\)$"
```

**`pultec-low-cut` must show 1 fallback and `pultec-low-boost` 5 in BOTH tools**, and the totals
must agree. If they disagree, the two tools are measuring different things — that is a defect in
this task, not a finding. Put both outputs in your report.

- [ ] **Step 5: Typecheck.**

```bash
bun run typecheck
```

Expected: exit 0, no output.

- [ ] **Step 6: Full suite.**

```bash
SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
```

The expected `Ran` total will be given to you in the dispatch message, because it depends on how
many tests Task 1's fix round added. **Report the number you actually got.** If it differs from the
expected one, say so plainly rather than adjusting anything — a changed total means tests appeared
or vanished, and a throwing `beforeAll` has silently hidden tests in this repository three times.

- [ ] **Step 7: Paste the baseline into the plan.** Put the table you produced into
`docs/superpowers/plans/2026-10-27-schematic-in-the-build-guide.md`, under the `### Baseline`
heading, with the command that reproduces it and the commit SHA it was taken at. This is the one
permitted transcription: a figure accompanied by the command that re-derives it.

- [ ] **Step 8: Commit** `tools/schgen/board-geometry.ts` and the plan file.
