# Task 7 report: relocate `occupancy.ts`, raise the readability-baselines question

**Status: DONE.**

**Commit:** `32cbf63` — "Task 7: relocate occupancy.ts beside its surviving consumer" (pushed to `feature/schematics-tooling`, previous tip `f5694c9`).

## Test summary

- `bun run typecheck`: clean.
- `bun test`: **4117 pass / 8 fail** — matches the stated baseline exactly (all 8 failures are `tests/schgen/port-fidelity.test.ts` on unset `SCHGEN_SOURCE`).
- `make check`: fails on exactly the four expected boards (`pt2399-core`, `transistor-preamp-lab`, `-loop`, `-staged`); the other seven `ok`.
- `drafted/` digests unchanged — verified by sha256 against all five stated prefixes: `a1fa4159`, `e9843e6d`, `b9e42e6a`, `5e1a4139`, `d4b0b8cc`.

## What was done

**1. Moved `occupancy.ts`.** `lib/schgen/render/occupancy.ts` → `tools/guide/occupancy.ts`, content unchanged (header doc-comment rewritten to describe the move and its reason, not the computation).

**The brief's "one consumer" claim was wrong, as warned it might be — the sweep found three more real importers:**

| importer | why the first sweep (`grep "schgen/render/occupancy"`) would miss it | fix |
| --- | --- | --- |
| `tools/guide/placement.ts` | the brief's stated consumer | import path → `./occupancy.ts`; header comment rewritten |
| `lib/schgen/render/field-placement.ts` | **same-directory relative import (`./occupancy.ts`)** — a path-literal grep for `schgen/render/occupancy` never matches this. Found by grepping `createOccupancy\|chooseLeastCovered\|leastCovered\|MARK_WEIGHT` instead. This is a production file (schgen's live field placer), so it had to keep compiling. | import path → `../../../tools/guide/occupancy.ts` |
| `tools/schgen/text-metrics/placement.ts` | a research probe with no importers of its own — dead code, but still typechecked (`tsconfig.json` includes all `**/*.ts`), so it had to keep resolving | import path → `../../guide/occupancy.ts` |
| `tests/schgen/render/field-fallback.test.ts` | a test file — the brief's grep would have caught this one, but didn't check | its one self-contained block that tests `occupancy.ts` directly ("the weighted overlap cost") **moved** to new `tests/guide/occupancy.test.ts`, assertions unchanged (exact values: 20, 40, `MARK_WEIGHT===2`). The rest of the file — which tests the schematic field placer, not the primitive — stays, now with no occupancy import at all. |

All three of the non-`tools/guide/placement.ts` importers live inside `lib/schgen/`, `tools/schgen/`, or `tests/schgen/`, and are deleted wholesale in Task 9 — so updating their import path (rather than leaving a compatibility shim) is enough; they die with their tree one task later regardless.

**Standing-instruction accounting for the move:** everything `lib/schgen/render/occupancy.ts` exported or guaranteed — `Box`, `Occupancy`, `createOccupancy`, `MARK_WEIGHT`, `Chosen<T>`, `chooseLeastCovered` (incl. its throw on an empty candidate list), `leastCovered` — moved unchanged. The one test that exercised it directly moved with the same exact-value assertions. Noted, not a regression from this move: neither `chooseLeastCovered` nor `leastCovered` had (or has) a direct unit test by name anywhere in the repo; both are exercised only indirectly, through `tests/guide/` (the build-guide render tests) and `tests/schgen/render/field-fallback.test.ts` (the schematic field placer). That gap pre-dates this task.

**A fourth, unforeseen fix was needed to hold the "no new failures" gate:** `tools/schgen/port-manifest.json`'s `handWritten` list still named `lib/schgen/render/occupancy.ts` at its old path. `tests/schgen/port-fidelity.test.ts`'s "every `.ts` file under `lib/schgen/`, `tests/schgen/` and `tools/schgen/` is ported, diverged, or declared hand-written" check failed because of it (the file it names is no longer on disk there) — 2 failures beyond the known 8. Removed the stale manifest entry; `bun test` is back to the baseline 4117/8 exactly. This is a data file, not a test file, and not covered by any file this plan protects.

**2. Measured `schematic/readability-baselines.json`, and did not decide anything about it.**

- **Who wrote it, when:** one commit only — `b526c1d`, 2026-10-20, "Task 16: the generation manifest, the four measures, the baseline registry and the finding contract." No change since; it is in exactly the state it shipped in.
- **What it contains:** `schema: 1`, `baselines: []` — **zero granted baselines, ever**. A `notes` block of six entries, written by the implementing agent (not the owner), explaining the registry's design (why it ships empty, why it has five/six measure fields rather than stripboard's twelve, the serialization-hash scoping, the owner-words voice check, etc.). There is no owner judgement recorded in this file today — it is an empty shell built to hold one once a block gets a *second* generation to compare against, which spec §3.3 says hasn't happened yet for any circuit here.
- **Who reads it today, before Task 9:** `lib/schgen/readability/baseline.ts` is the only loader (`loadBaselines`/`parseRegistry`). Its current callers are `tools/schgen/verify.ts` (calls `loadBaselines()` live, as one of `gate-census.ts`'s reported citations), `tools/schgen/remeasure.ts`, and several `tests/schgen/` files. **The brief's "nothing imports that loader" is not true today** — but every one of those callers lives inside `lib/schgen/`/`tools/schgen/`/`tests/schgen/`, which Task 9 deletes in the very next task. No `Makefile`/`make/*.mk` target reaches any of this (`grep schgen Makefile make/*.mk` is empty), so nothing in `make check` or CI depends on it either.
- **What reads it after Task 9:** nothing. Task 9 deletes `lib/schgen/` (so `baseline.ts` itself is gone), but `schematic/readability-baselines.json` is **not** in Task 9's delete list — it lives under `schematic/`, not `lib/schgen/`/`tools/schgen/`/`tests/schgen/`. It survives as an orphaned file with no code able to read it, which is the brief's claim, true as of Task 9 rather than as of now.
- **What would be lost if it went:** nothing of substance, because nothing has ever been recorded in it — no owner words to lose. What would be lost is the schema and the channel for recording a future owner-granted baseline comparison. Whether that channel is still wanted is the owner's call (`CLAUDE.md`: an agent may never author the acceptance criteria for the artifact it is producing — a judgement registry's continued existence is exactly such a criterion).
- **Recorded as a comment beside the code**, in `lib/schgen/readability/baseline.ts`'s module doc-comment (the natural place, since `schematic/readability-baselines.json` is pure, schema-validated JSON with no room for a comment and no sibling doc file exists in `schematic/`): flags the above for whoever runs Task 9, and says explicitly not to delete the JSON registry on the strength of this file's own deletion without an owner answer.
- **Did not**: delete the registry, delete the loader, or decide anything about it.

## Concerns / things the next task should know

- The readability-baselines question is raised here and in the comment; it still needs to reach `docs/known-gaps.md` as an owner decision once he actually answers it (per `CLAUDE.md`, that register only accepts owner decisions/declinations, which this is not yet) and/or Task 10's findings document, which is explicitly scoped to carry "the readability-baselines question."
- No other gap found. The `port-manifest.json` fix is a side-effect correction, not a new design question.
