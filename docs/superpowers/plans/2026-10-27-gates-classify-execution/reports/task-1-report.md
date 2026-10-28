Task 1: the vocabulary - report

## What was done

Followed the brief's seven steps in order.

1. **Wrote the failing test file** at `tests/schgen/findings.test.ts`, verbatim from the brief
   (Step 1).
2. **Ran it to confirm it fails on the missing module** (Step 2).
3. **Implemented** `lib/schgen/findings.ts`:
   - `RefusalClass` = `"usable" | "defective" | "not-drawable" | "generator-defect"`.
   - `FindingKind`, the closed union, verbatim from the brief.
   - `Finding` interface, verbatim.
   - `classOf(kind: FindingKind): RefusalClass` - a `switch` with one `case` arm per
     `FindingKind` member, grouped into the four classes by the owner's line (wrong about the
     circuit -> `defective`; hard to read -> `usable`; no geometry -> `not-drawable`; invariant
     broken -> `generator-defect`), and **no `default` arm**. The doc comment states the
     mechanism explicitly: TypeScript narrows `kind` to `never` after every named case, so a
     `FindingKind` member added without a matching `case` makes the function's control-flow
     analysis see a path with no `return`, which fails `tsc` with TS2366 ("Function lacks ending
     return statement..."). I verified this mechanism independently (see below) rather than
     taking it on faith.
   - `worstClass(findings: readonly Finding[]): RefusalClass` - folds over the findings, tracking
     the worst class by severity order `["generator-defect", "defective", "not-drawable",
     "usable"]`; returns `"usable"` for an empty list.
   - `SchgenRefusal extends Error`, carrying `readonly findings: readonly Finding[]`.
4. **Tests pass; `bun run typecheck` exit 0** (Step 4).
5. **Added both new files to `handWritten`** in `tools/schgen/port-manifest.json` (Step 5).
6. **Ran the full suite** (Step 6).
7. **Committed** (Step 7).

## Exhaustiveness mechanism - independent verification

Rather than trust the TS2366 claim, I wrote a throwaway 3-case, 2-arm non-exhaustive switch
(no `default`) in `/tmp/exhaustiveness-check.ts` (deleted after the check; never part of this
repo) and ran `tsc --noEmit --strict` on it directly. It failed with exactly the expected error:

```
error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

(The same invocation also surfaced unrelated `react-router-dom` errors from an ambient
`node_modules` on that machine - irrelevant to this repo's `tsconfig` and not evidence of
anything here; the TS2366 line is the one that matters.) This confirms `classOf`'s compile-time
totality guarantee is real, not asserted.

## Commands and output

### Step 2: failing run (before implementation)

```
$ bun test tests/schgen/findings.test.ts
bun test v1.3.8 (b64edcb4)

tests/schgen/findings.test.ts:

# Unhandled error between tests
-------------------------------
error: Cannot find module '../../lib/schgen/findings.ts' from '/Users/orion/work/audio-circuits-work/pultec-modularize/tests/schgen/findings.test.ts'
-------------------------------


 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [34.00ms]
```

### Step 4: passing run (after implementation)

```
$ bun test tests/schgen/findings.test.ts
bun test v1.3.8 (b64edcb4)

 6 pass
 0 fail
 26 expect() calls
Ran 6 tests across 1 file. [15.00ms]
```

### Step 4: typecheck

```
$ bun run typecheck
$ tsc --noEmit
```

(Exit 0, no output.)

### port-fidelity, with SCHGEN_SOURCE set

```
$ SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test tests/schgen/port-fidelity.test.ts
bun test v1.3.8 (b64edcb4)

 12 pass
 0 fail
 115 expect() calls
Ran 12 tests across 1 file. [48.00ms]
```

### Step 6: full suite

```
$ SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
...
 3895 pass
 0 fail
 44129 expect() calls
Ran 3895 tests across 364 files. [167.57s]
```

0 failures. `tests/schgen/decomposition-probe.test.ts` did not flake in this run.

## A discrepancy I measured rather than assumed, and did not paper over

The brief's context said the expected full-suite total **before** this change was `Ran 3887`,
0 fail. I did not take that on faith: I moved the two new files out of the tree, reverted the
`port-manifest.json` edit (via the Edit tool, not `git checkout`), and reran the full suite
against the true, unmodified HEAD (`da8c6e3`), with `SCHGEN_SOURCE` set the same way:

```
$ SCHGEN_SOURCE=... bun test
...
 3889 pass
 0 fail
 44103 expect() calls
Ran 3889 tests across 363 files. [160.12s]
```

**The true baseline at this HEAD is `3889`, not `3887`** - a 2-test difference from the number
given in my instructions. `git status` at the start of this task showed a clean tree and no
other session's uncommitted changes, so this isn't contamination from a concurrent session; it's
most likely that the `3887` figure in my briefing was taken at an earlier commit than `da8c6e3`
and something upstream of this task (not mine) added 2 tests since. I did not adjust anything to
make `3887 + 6 = 3893` appear true. The two numbers that are actually true, both measured:

- Baseline at HEAD before this change: **3889**, 0 fail.
- After this change (6 new tests added): **3895**, 0 fail. `3889 + 6 = 3895` - exactly consistent.

I then restored my two new files and the manifest edit (confirmed via `git status`), reran
typecheck (exit 0) and the full suite once more to reconfirm `3895 pass, 0 fail` before
committing.

## Manifest ordering

`tools/schgen/port-manifest.ts`/`tests/schgen/port-fidelity.test.ts` enforce that every
`handWritten` entry is under a declared root, on disk, and not duplicated elsewhere in the
manifest - I checked; there is no test enforcing alphabetical order of the array as a whole, and
the array on disk is not globally sorted (it is organized in task-chronological groups, each
internally close to sorted, e.g. the trailing `label-syntax`, `label-freedom`, `text-metrics`
groups). I appended `lib/schgen/findings.ts` then `tests/schgen/findings.test.ts` at the end, in
that order - matching the file's established lib-then-test pairing convention for a task's newest
entries - rather than resorting the whole array, since resorting would be an unrelated,
unreviewed change to every existing line.

## Commit

SHA: `42e16f053351e9eaae95125be976c8b862dc4019`

Message: "Task 1 of the gate-reform plan: the refusal classification vocabulary"

Files committed: `lib/schgen/findings.ts` (new), `tests/schgen/findings.test.ts` (new),
`tools/schgen/port-manifest.json` (modified - `handWritten` array only). Nothing else was staged
or committed. Pushed to `origin/feature/schematics-tooling`.

## Deviations from the brief

None. The test file is verbatim from the brief. The implementation follows the brief's listed
types exactly (`RefusalClass`, `FindingKind`, `Finding`, `classOf`, `worstClass`,
`SchgenRefusal`) with no added or removed members.

## Concerns

1. **The `3887` baseline in my briefing does not match the measured baseline (`3889`) at the
   commit this task actually started from.** Not a defect in my work - I measured it directly by
   temporarily removing my changes - but worth flagging since the brief's author may want to know
   their count was stale by 2, independent of anything this task did.
2. `docs/known-gaps.md` is frozen per this task's constraints, so I did not record the above
   discrepancy there; it's recorded here and in this return message instead, per the brief's own
   instruction to report the number actually measured rather than adjust it.
3. No other concerns. All binding constraints (no `any`/`as`/`@ts-ignore`/`!`, explicit relative
   `.ts` imports, no `default` arm in `classOf`, files committed scoped to this task only, no
   `docs/known-gaps.md` edits, no subagent dispatch) were followed as stated.

---

## Fix round 1

Two items from the coordinator's review, both test-only tightenings. `classOf`, the
`FindingKind` union, the mapping, and the port manifest were NOT touched, per instruction.

### ITEM 1: pin the defective-vs-not-drawable severity relation

The existing tests exercised generator-defect > defective and not-drawable > usable, but never
defective > not-drawable, so swapping those two entries in `SEVERITY` would have passed every
assertion I had. Added a new `it` block to the `worstClass` describe that exercises all three
adjacent pairs explicitly, with the previously-untested relation called out in a comment:

```ts
it("pins every adjacent pair in the severity order, so swapping any two adjacent classes fails", () => {
  // generator-defect > defective
  expect(worstClass([f("short"), f("invariant-violated")])).toBe("generator-defect")
  // defective > not-drawable - the relation the other tests never exercised. Swapping these
  // two in SEVERITY must turn this red; it is the fix this test exists to drive.
  expect(worstClass([f("paper-exhausted"), f("short")])).toBe("defective")
  // not-drawable > usable
  expect(worstClass([f("text-clearance"), f("paper-exhausted")])).toBe("not-drawable")
})
```

### ITEM 2: assert the specific class, not just Error

Changed the refusal test's `expect(r).toBeInstanceOf(Error)` to also assert
`expect(r).toBeInstanceOf(SchgenRefusal)`, so a future change to that class's own prototype chain
is caught even though the current ES2022-target/no-polyfill setup isn't exposed to the classic
extends-Error pitfall.

### Verification: the test, as written, passing

```
$ bun test tests/schgen/findings.test.ts
bun test v1.3.8 (b64edcb4)

 7 pass
 0 fail
 30 expect() calls
Ran 7 tests across 1 file. [8.00ms]
```

### Verification: the deliberate SEVERITY reorder, driven RED

Temporarily edited `lib/schgen/findings.ts`'s `SEVERITY` constant from
`["generator-defect", "defective", "not-drawable", "usable"]` to
`["generator-defect", "not-drawable", "defective", "usable"]` (defective and not-drawable
swapped) and reran the test file:

```
$ bun test tests/schgen/findings.test.ts
tests/schgen/findings.test.ts:
42 |   it("pins every adjacent pair in the severity order, so swapping any two adjacent classes fails", () => {
43 |     // generator-defect > defective
44 |     expect(worstClass([f("short"), f("invariant-violated")])).toBe("generator-defect")
45 |     // defective > not-drawable - the relation the other tests never exercised. Swapping these
46 |     // two in SEVERITY must turn this red; it is the fix this test exists to drive.
47 |     expect(worstClass([f("paper-exhausted"), f("short")])).toBe("defective")
                                                                ^
error: expect(received).toBe(expected)

Expected: "defective"
Received: "not-drawable"

      at <anonymous> (/Users/orion/work/audio-circuits-work/pultec-modularize/tests/schgen/findings.test.ts:47:60)
(fail) worstClass picks the most serious, and an empty list is usable > pins every adjacent pair in the severity order, so swapping any two adjacent classes fails [1.80ms]

 6 pass
 1 fail
 29 expect() calls
Ran 7 tests across 1 file. [12.00ms]
```

Exactly the assertion the fix was meant to drive red, and nothing else. Reverted `SEVERITY` back
to its committed order and reran:

```
$ git status --short
 M tests/schgen/findings.test.ts
$ bun test tests/schgen/findings.test.ts
bun test v1.3.8 (b64edcb4)

 7 pass
 0 fail
 30 expect() calls
Ran 7 tests across 1 file. [8.00ms]
```

`git status --short` shows only the test file as modified - `findings.ts` reverted to its
committed byte content, confirmed clean by git itself (no `M lib/schgen/findings.ts` line).

### Verification: typecheck

```
$ bun run typecheck
$ tsc --noEmit
```

Exit 0, no output.

### Verification: full suite

```
$ SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
...
 3896 pass
 0 fail
 44133 expect() calls
Ran 3896 tests across 364 files. [164.16s]
```

3896 = the prior 3895 plus the one new `it` block added in this round (ITEM 2's extra `expect`
lives inside an existing `it` and does not change the count). 0 fail.

### Commit

SHA: `a3e10f7b5dfa0333c1b420df3e032f179b4c1298`

Message: "Task 1 fix round 1: pin the defective-vs-not-drawable severity relation"

Only `tests/schgen/findings.test.ts` was staged and committed. Pushed to
`origin/feature/schematics-tooling` (fast-forward from `655bbf7`, which was not a commit of
mine - something else landed on this shared branch between my first commit and this fix round;
my push applied cleanly on top of it).

### Concerns

None. Both items addressed exactly as specified; no non-test code was altered in the final
state; the reorder-and-revert was verified live rather than asserted.
