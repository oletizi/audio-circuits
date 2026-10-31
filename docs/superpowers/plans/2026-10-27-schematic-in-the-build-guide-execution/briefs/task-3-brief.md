# Task 3' — `BoardSheets` carries what the guide packet needs

> **THIS BRIEF SUPERSEDES THE PLAN'S TASK 3**, by the controller's Ruling 3 in
> `progress.md`. The plan said to create `tools/schgen/generated-sheet.ts` and extract a resolver
> into it. **There is nothing to extract**: `boardSheets()` in `tools/schgen/board-sheets.ts` is
> already an exported per-board resolver with exactly the right shape. Creating a new module would
> add the second copy of board-to-design resolution that the plan's own Task 3 exists to prevent.
>
> Task 3 and Task 2 have also been SWAPPED (Ruling 4): this runs before the geometry tool, because
> the geometry tool needs the `drawings` this task exposes.

## What exists today

`tools/schgen/board-sheets.ts` exports:

```ts
export interface BoardSheets {
  readonly board: string
  readonly outcome: "generated" | "refused" | "no-declaration"
  /** The blocker in full for `refused`, the reason for `no-declaration`, empty for `generated`. */
  readonly blocker: string
  readonly sheets: number
  readonly fallbacks: readonly FieldFallback[]
  /** The written schematic root, and the PDF when one was exported. */
  readonly files: readonly string[]
}

export interface BoardSheetsOptions {
  readonly outDir: string
  readonly pdf: boolean
}

export async function boardSheets(
  board: BoardRef, repoRoot: string, options: BoardSheetsOptions,
): Promise<BoardSheets>
```

Inside `boardSheets`, on the success path, the schematic root is already computed as:

```ts
const root = path.join(outDir, `${design.spec.project}.kicad_sch`)
```

but only inside `if (options.pdf)`, and it reaches the caller only buried inside `files`.

## What to change

**Add two fields to `BoardSheets`, and nothing else.**

```ts
  /**
   * Every sheet this generation drew, straight off `Generation.drawings`.
   *
   * **It is here so a caller can apply its own gate without generating twice.** The guide packet
   * refuses to print a sheet carrying any `fieldFallbacks` - text the placer could not keep clear -
   * and re-running `generate` to find that out would double the cost of every guide build.
   * Empty for `refused` and `no-declaration`, which is not the same as a board that drew a sheet
   * with no fallbacks: read `outcome` first.
   */
  readonly drawings: readonly SheetDrawing[]
  /**
   * Absolute path to the written top-level `.kicad_sch`, or `undefined` when nothing was written.
   *
   * **Separate from `files` because a caller that wants to export or copy the schematic should not
   * have to guess which entry of a path list is the root.** It was already computed on the PDF
   * path; this lifts it out and makes it unconditional.
   */
  readonly schematicRoot: string | undefined
```

Set them on all three return paths:
- `no-declaration`: `drawings: []`, `schematicRoot: undefined`
- `refused` (the `catch`): `drawings: []`, `schematicRoot: undefined`
- `generated`: `drawings: g.drawings`, `schematicRoot: root` — hoist `const root = path.join(outDir, `${design.spec.project}.kicad_sch`)` out of the `if (options.pdf)` block so both uses share it.

Import `SheetDrawing` as a type from `../../lib/schgen/render/sheet-types.ts`.

**Change nothing else.** No behaviour change, no output change, no signature change.

## Steps

- [ ] **Step 1: Capture the BEFORE output.**

```bash
bun tools/schgen/board-sheets.ts 2>&1 | grep -v "^    wrote " > /tmp/sheets-before.txt
tail -4 /tmp/sheets-before.txt
```

Expect the last lines to include `7 of 11 boards produce a schematic` and a warning naming 34
fallback field placements.

- [ ] **Step 2: Make the change.**

- [ ] **Step 3: Prove it changed nothing.**

```bash
bun tools/schgen/board-sheets.ts 2>&1 | grep -v "^    wrote " > /tmp/sheets-after.txt
diff /tmp/sheets-before.txt /tmp/sheets-after.txt && echo IDENTICAL
```

Expected: `IDENTICAL` and `diff` exit 0. The `grep -v` drops `wrote <path>` lines because the
output directory is a fresh temp dir on every run. **If the diff is not empty, you changed
behaviour — fix that rather than accepting the new numbers.**

- [ ] **Step 4: Typecheck.**

```bash
bun run typecheck
```

Expected: exit 0, no output.

- [ ] **Step 5: Full suite.**

```bash
SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
```

Expected: `Ran 3877`, 0 fail. (3872 at the branch base, plus 5 added by Task 1.) **The `Ran` total
must be exactly that.** If it differs, say so in your report with the number you got — do not
adjust anything to make it match. A changed total means tests appeared or vanished, and a throwing
`beforeAll` has silently hidden tests in this repo three times.

- [ ] **Step 6: Commit** only `tools/schgen/board-sheets.ts`, with a message saying that
`BoardSheets` now carries the drawings and the schematic root, that nothing else changed, and that
the census output was diffed before and after to prove it.
