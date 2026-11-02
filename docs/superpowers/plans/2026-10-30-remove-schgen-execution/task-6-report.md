## Task 6 report: delete `lib/kicad/schematic.ts`

### Status

DONE.

### Commits

- `dd7ba1a` — "Delete the superseded schematic stub writer and its test
  scaffolding": deletes `lib/kicad/schematic.ts`, `tests/circuits/kicad-round-trip.ts`,
  `tests/circuits/stub-writer-tripwire.test.ts`, and `tests/kicad/schematic.test.ts`.
- `933583e` — "Repoint the five transistor-preamp tests off the deleted stub
  writer": modifies the five `tests/circuits/transistor-preamp-*.test.ts` files.

Both on branch `feature/schematics-tooling`, both pushed
(`dec1009..933583e`).

### Beyond the brief's file list

The brief named three files to delete. The required `bun run typecheck`
sweep (plus a direct grep for `writeSchematicStub`/`SchematicStubInput`
importers) found a fourth: `tests/kicad/schematic.test.ts`, which imports
`lib/kicad/schematic.ts` directly and unit-tests `writeSchematicStub`'s own
internals (symbol embedding/dedup, declaration-order placement, the notes
text block's `\n` escape, no-connect vs. label handling, and the
`part.symbol`/pin-connected refusals). This was not an oversight to work
around: `tests/circuits/stub-writer-tripwire.test.ts`'s own instruction text
already named it ("Delete lib/kicad/schematic.ts, tests/kicad/schematic.test.ts
and this file") as going together with the stub writer. All six of its
assertions are **dropped**, not moved or superseded: they tested only the
deleted module's internal mechanics, and no surviving code implements those
mechanics (the labels-everywhere pathology they partly exercised is exactly
what `lib/schgen/` exists to not do). Recorded here and in the deletion
commit message since there is no file left to carry a beside-the-code
comment.

### The five `transistor-preamp-*.test.ts` files — accounting for every assertion

Each file carried exactly two `kicad-round-trip.ts`-dependent tests, per
Task 5's measurement:

1. **`"KiCad reads the generated stub as the same circuit"`** — called
   `kicadRoundTrip`, which calls `writeSchematicStub` directly. **Deleted.**
   Each file keeps a comment in place of the test, naming what it proved
   (net-membership partition, per-designator value, per-component footprint
   agreement between a freshly-written stub and the model, via real
   `kicad-cli`) and naming `tests/circuits/transistor-preamp-kicad-round-trip.test.ts`
   (Task 5, not modified here) as the surviving live-`kicad-cli`,
   model-vs-schematic proof for that exact board — now pointed at the
   board's actual committed `.kicad_sch` instead of a throwaway stub.
   **Superseded**, not dropped: Task 5's second pass closed this gap
   deliberately (see its report's "Step 4, revisited"), so the claim in the
   brief ("Task 5's drafted-page round trip is the remaining proof") is
   stated more precisely here as the *committed-schematic* round trip,
   which is the one that actually covers these five boards (the drafted-page
   round trip only covers the five Pultec boards).

2. **`"the schematic's netlist export describes the same circuit as the
   model"`** — read the committed `tests/fixtures/transistor-preamp-<board>.net`
   fixture and called `expectSameCircuit`/`BoardUnderTest`, both living in
   `kicad-round-trip.ts`. Never called `kicad-cli` or `writeSchematicStub`.
   **Kept, unchanged in behavior.** Repointed onto
   `tests/circuits/committed-schematic.ts`'s copy of the same comparison
   (`expectSameCircuit`, `BoardUnderTest`) — confirmed byte-for-byte
   identical logic to the deleted original except for the `notes` field,
   per Task 5's own header comment on that file. Each board's
   `*_BOARD` object literal drops `notes: schematicNotes()`, since
   `committed-schematic.ts`'s `BoardUnderTest` has no `notes` field (it was
   only ever needed by the stub writer) and TypeScript's excess-property
   check on a directly-typed object literal would otherwise refuse it.
   `schematicNotes()` itself stays imported and used in each file's other,
   unrelated "the schematic notes ..." tests.

No assertion from either test was silently dropped without account: test 1
is superseded per-board by the named Task 5 file; test 2 moved comparison
modules with no behavior change.

### Gates (run serially, per the global constraint)

- `bun test tests/circuits/`: **192 pass / 0 fail**.
- `bun run typecheck`: clean.
- `make check` (alone): fails on exactly `pt2399-core`,
  `transistor-preamp-lab`, `transistor-preamp-loop`, `transistor-preamp-staged`;
  all five Pultec boards and `transistor-preamp-buffered`/`-feedback` `ok`.
- `bun test` (full suite, alone, after `make check` finished — never
  concurrently): **4117 pass / 8 fail**. The 8 failures are the same
  `port-fidelity` `SCHGEN_SOURCE`-unset cases as baseline, by name, confirmed
  via grep of the run log. The drop from the prior baseline (4129) is
  exactly the 12 tests this change deletes (5 preamp "stub" tests + 6
  `tests/kicad/schematic.test.ts` tests + 1 tripwire test) — no other test
  disappeared or newly failed.
- Five `drafted/pultec/*/*.generated-do-not-edit.kicad_sch` digests
  re-hashed after both commits: unchanged, `a1fa415966ad…`,
  `e9843e6dbd3f…`, `b9e42e6a90a7…`, `5e1a4139918c…`, `d4b0b8cc6e3b…`. `git
  status --porcelain` never showed anything under `drafted/`.

### Concerns

- None outstanding. `tests/circuits/committed-schematic.ts`'s deliberate
  duplication of `expectSameCircuit`/`partition`/`valuesOf` (flagged by Task
  5's report as a drift risk pending this deletion) is now the sole copy of
  that logic — the duplication the "supersede means delete" rule objected to
  no longer exists, since `kicad-round-trip.ts` itself is gone.
- `lib/kicad/symbol-library.ts` and `lib/kicad/symbols/PROVENANCE.md` still
  mention `lib/kicad/schematic.ts` in prose (history/rationale comments, not
  imports). **Originally left untouched as out of this task's scope; the
  coordinator's reviewer caught that this was wrong — see "Post-review
  correction" below, where both files were fixed in a third commit.**
- No `#` in any heredoc or quoted argument, no control-character escapes
  typed, no hook bypassed, no fallback or mock data added, no file under
  `drafted/` touched, no edit to `docs/schematic/verdicts.md`,
  `lib/kicad/sheet-agreement.ts`, `tests/circuits/sheet-model.ts`, or the two
  Task 5 test files.

### Post-review correction

The coordinator's reviewer read all six dropped `tests/kicad/schematic.test.ts`
assertions individually and confirmed each is genuinely writer-internal, and
confirmed the five-board supersession claim holds per board, not just in
aggregate — the accounting above stood. It then sent back the one thing this
report's "Concerns" section had flagged and wrongly left as out of scope:
`lib/kicad/symbol-library.ts`'s header said **"IT HAS TWO CONSUMERS NOW"**
and named the deleted `lib/kicad/schematic.ts` as one of them; a comment and
a thrown-error message near its `supportedUnitSymbols` helper called that
file "this function's only production caller"; `lib/kicad/symbols/PROVENANCE.md`
carried the identical "THERE ARE TWO" claim. These are not inert dangling
references of the kind `CLAUDE.md` expects and accepts (a `G<n>` citation
resolving to nothing) — they are affirmative, present-tense architectural
claims in live code, and they were false the moment `lib/kicad/schematic.ts`
was deleted.

**Commit `f5694c9`** — "Correct two stale consumer-count claims
`lib/kicad/schematic.ts`'s deletion left behind" — fixes both files, no
behaviour change. It states what is actually true today rather than just
subtracting one from the old count: `lib/schgen/render/stock-symbols.ts` is
the one production consumer left, and it does **not** import `symbolPins`
(confirmed by reading its import list and by grepping every
`import { symbolPins }` in the repository — there is exactly one, in a test)
— so `symbolPins`, and the `supportedUnitSymbols` helper it shares with
`symbolStrokeSegments`, now have **zero** production callers and are
test-only. Both files say this is a fact about today and not a judgement to
act on, since Task 9 of this same plan deletes `lib/schgen/render/stock-symbols.ts`
itself, which will change the answer again. The `supportedUnitSymbols`
thrown-error message was reworded to match (no longer describing the
deleted stub writer in the present tense, no longer calling it this
function's "only production caller" when it no longer has one), still
matching `tests/kicad/symbol-library.test.ts`'s `/multi-unit/` assertion —
confirmed by re-running that file.

Gates re-run serially after the fix: `bun test tests/kicad/symbol-library.test.ts`
(8 pass / 0 fail), `bun run typecheck` (clean), full `bun test` alone (4117
pass / 8 fail — identical to the pre-correction run, same `port-fidelity`
failures by name), `make check` alone (fails on exactly `pt2399-core`,
`transistor-preamp-lab`, `-loop`, `-staged`; all five Pultec boards and
`transistor-preamp-buffered`/`-feedback` `ok`). Five `drafted/` sheet
digests re-hashed again: unchanged.

**On where this correction's record lives.** This report lives under
`.superpowers/`, which this repository's `CLAUDE.md` says is gitignored and
therefore "invisible to review, absent from the history, and destroyed by
`git clean -fdx`." It is not the durable record of this correction. The
durable record is `f5694c9`'s commit message and the corrected comments
themselves in `lib/kicad/symbol-library.ts` and
`lib/kicad/symbols/PROVENANCE.md`, both committed and pushed — this section
restates them for whoever is reading this session's ledger, but it is not
where a later reader should go looking.
