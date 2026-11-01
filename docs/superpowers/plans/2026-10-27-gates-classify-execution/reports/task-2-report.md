Task 2: the checkers return findings - report

## What was converted

**The three producers named in the brief, all returning `readonly Finding[]` now:**

- `lib/schgen/render/layout-check.ts`: `checkLayout(g, layout)`. Every helper it defines in-file
  (`placementProblems`, `gridProblems`, `overlapProblems`, `shapeProblems`, `componentProblems`,
  `internalSplitProblems`, `anchorProblems`, `blockGlyphProblems`, `textClearanceProblems`) now
  builds `Finding`s directly, via a small local `finding(kind, what, where)` constructor. A call
  to an EXTERNAL helper that still returns `string[]` (`checkWireSafety`, `danglingWireEnds` from
  `wire-safety.ts`; `clearanceProblems` from `body-clearance.ts`) is wrapped at the call site with
  one kind for the whole batch.
- `lib/schgen/render/text-scene.ts`: `textProblems(scene)` - every finding is kind
  `"text-clearance"` (the whole module is that one check), `where` is `scene.scope`.
  `assertTextClear` now throws `new SchgenRefusal(problems, message)` instead of `new
  Error(message)`; `message` text is byte-identical to before.
- `lib/schgen/render/sheet-check.ts`: `assertSheetSafe(scene)`. Its own existing "wire safety"
  group (`checkWireSafety` + `danglingWireEnds`) and "body clearance" group (`bodyOverlaps` +
  `clearance` + `bodyGlyphProblems` + `glyphGlyphProblems`) - the owner's existing split - are
  preserved as `kind`s rather than re-derived, and both throw sites now throw `SchgenRefusal`
  instead of `Error`, message text unchanged.

**Callers that build a throw from the findings, converted to `SchgenRefusal` (brief's "callers
keep throwing, built from the findings"):**

- `lib/schgen/render/blocks.ts`: `realiseBlock`'s layout-check throw.
- `lib/schgen/render/bus.ts`: `verified()`'s layout-check throw.

`SchgenRefusal extends Error` and does not override `.name`, so `instanceof Error`,
`.message` and `.toString()` are unchanged for every existing catcher; only `instanceof
SchgenRefusal` and `.findings` are new. `tools/schgen/board-sheets.ts`'s one catch (Task 4's
subject, unmodified by this task) reads only `.message`, so this is invisible to it today.

**Callers that only wanted the text (not a throw), mapped to `.map(f => f.what)` at the single
point they consume the result, everything downstream of that point untouched:**

- `lib/schgen/render/templates/connector-fanout.ts` (feeds `obstaclesOf`, which is string-based
  and out of this task's scope).
- `lib/schgen/elk/adapt.ts` (`AdaptReport.problems` stays `readonly string[]`; Task 3 owns
  restructuring the ELK adapter).
- `tools/schgen/label-freedom/step3.ts` (3 call sites) and `freedoms.ts` (1 call site) - research
  tools, hand-written, out of scope.
- `tools/schgen/masked-problems.ts` (`maskedTextProblems`).

## The kind assigned to each former message class, and why

| Former message class | Kind | Why |
|---|---|---|
| `checkWireSafety` batch (cross-net contacts, same-net mid-wire junction cases, mixed in one string[]) | `"short"` | Representative choice for a batch this task does not restructure - see deviation below. Classifies `defective` either way. |
| `danglingWireEnds` batch | `"dangling-end"` | Exact 1:1 fit - the whole function is only about dangling ends. |
| `clearanceProblems`/`sceneClearanceProblems` (pin-line, body-through-wire, anchor-in-body) | `"body-clearance"` | Dedicated kind, matches the module's own name and the sheet-check "body clearance" group it already belongs to. |
| `bodyOverlaps` (full body-vs-body overlap) | `"body-clearance"` | Same bucket as above - it is the same owner's-line group in `assertSheetSafe`, and `checkLayout`'s `overlapProblems` is the per-block analogue of the same check. |
| `bodyGlyphProblems` + `glyphGlyphProblems` | `"glyph-clearance"` | Dedicated kind, matches the module's own name (`glyph-clearance.ts`) and docstring. |
| `componentProblems`: "short between X and Y..." | `"short"` | Exact fit. |
| `componentProblems`: "not-connected pin ... touches ..." | `"nc-contact"` | Exact fit. |
| `componentProblems`: "piece of net X ... has no label or power symbol" | `"split-net"` | **Judgement call**, stated in the code comment: not literally a net cut in two, but the same failure in spirit - the net does not cohere into one labelled whole. No more specific kind exists for it. |
| `internalSplitProblems`: "net X is split into N pieces" | `"split-net"` | Exact fit. |
| `placementProblems` (not-a-unit, not-placed, placed-twice) | `"invariant-violated"` | A mismatch between the layout and the IR's own unit list is the generator's own bookkeeping being wrong, not a claim about the circuit or about readability. |
| `gridProblems` (`assertOnGrid` failures) | `"invariant-violated"` | Off-grid geometry is a generator invariant, not a circuit defect. |
| `shapeProblems` (`assertWireShape`: zero-length, non-orthogonal) | `"invariant-violated"` | Same reasoning. |
| `anchorProblems` (anchor for an untouched net; internal net labelled) | `"invariant-violated"` | A layout declaring an anchor the IR does not support, or labelling a net the model says is wired-only, is the template/placer disagreeing with its own input - a generator bug. |
| `textProblems` (all of it) | `"text-clearance"` | Dedicated kind; the whole module is this one check. |

No new `FindingKind` was needed; every message fit an existing member of the closed union.

**The deviation worth flagging explicitly:** `checkWireSafety`'s return value is NOT
restructured by this task (it lives in `wire-safety.ts`, outside the brief's three named files),
so from the call site I cannot tell a cross-net short from a same-net "split the wire here"
junction case without parsing the string - exactly what `Finding` exists to avoid doing from
outside a function. I picked `"short"` as the one representative kind for that whole batch. This
does not affect `classOf`'s output (`"short"`, `"missing-junction"`, `"nc-contact"` and
`"dangling-end"` all classify `"defective"`), so Task 4's `worstClass` census is unaffected; it
only affects which exact kind label a future reader would see on one of these findings before
`wire-safety.ts` is itself converted. I did not add a kind to work around it, per the brief's
instruction to make `"defective"` the safe default when a kind is genuinely ambiguous.

## Why `lib/schgen/render/sheet-check.ts` and 4 ported tests moved to `diverged` in
`tools/schgen/port-manifest.json`

`sheet-check.ts` was a straight, byte-checked port (`files[]`); `tests/schgen/render/{body-clearance,glyph-clearance,glyph-glyph-clearance}.test.ts`
were too. Converting `assertSheetSafe` to findings, and updating the three tests' assertions from
array-of-string to array-of-`Finding`, is a hand edit `port-fidelity.test.ts` would otherwise
refuse. Each moved entry carries `sourceSha` (computed with `shasum -a 256` against
`$SCHGEN_SOURCE`, never guessed), `task`, and a `why` naming exactly what changed and that no
assertion's meaning changed. `tests/schgen/render/pin-marks.test.ts` already had a `diverged`
entry from Task 6b round 2 (same `sourceSha`, confirming the pedals source has not moved); I
extended its existing `why` rather than add a duplicate entry (a duplicate was my first attempt,
caught by `port-fidelity.test.ts` still red after the first manifest edit - see "A mistake caught
and fixed" below). `field-fallback.test.ts` and `text-clearance.test.ts` needed no manifest
change: the first was already hand-written, the second already diverged.

## Behaviour-preservation proof: the census diff

Brief's Step 3, run after confirming the normaliser can produce an empty diff against itself
(the repository's own warning that a prior filter "could never produce an empty diff").

```
$ cat normalize-census.py
#!/usr/bin/env python3
import re
import sys
pattern = re.compile(r"/[^ ]*schgen-board-sheets-[A-Za-z0-9]+")
for line in sys.stdin:
    sys.stdout.write(pattern.sub("<OUT_DIR>", line))
```

**Why a one-line filter (as the brief suggested) is not enough, found empirically:** the random
mktemp suffix appears not only on the single `writing generations under <dir>` announcement line
but embedded in every `wrote <dir>/...` line the tool prints per board - 10 lines per board, 11
boards. A filter that drops only the announcement line would leave ~100 lines of residual noise
and could never produce an empty diff. The regex above normalises the whole `.../schgen-board-sheets-<random>`
prefix wherever it appears, rather than dropping lines.

**Self-diff sanity check (same run, both captures normalised):** empty, confirming the normaliser
actually eliminates the non-determinism rather than coincidentally matching once.

**Before:** captured from an unmodified checkout at HEAD (`a3e10f7`), via a disposable
`git worktree add --detach <dir> HEAD` (never touching this working tree), then
`SCHGEN_SOURCE=... bun tools/schgen/board-sheets.ts`.

**After:** captured from this working tree with every change in place.

```
$ diff <(python3 normalize-census.py < census-before-raw.txt) \
       <(python3 normalize-census.py < census-after-raw.txt)
$ echo $?
0
```

**Empty.** Same boards refuse, same messages, same fallback counts, same everything - the
deliverable the brief asks for.

## Typecheck

```
$ bun run typecheck
$ tsc --noEmit
```

Exit 0, no output, both before committing the manifest fix and after.

## Full suite

```
$ SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
...
 3896 pass
 0 fail
 44129 expect() calls
Ran 3896 tests across 364 files. [161.07s]
```

0 fail. **3896 matches the brief's stated pre-task baseline exactly** - expected, since this task
added no test and removed none, only changed what two dozen existing tests assert against (array
of `Finding` rather than array of `string`) and two call sites' thrown error class.
`tests/schgen/decomposition-probe.test.ts` did not flake in this run.

## A mistake caught and fixed before it shipped

My first manifest edit added a **second, duplicate** `diverged` entry for
`tests/schgen/render/pin-marks.test.ts` (it already had one from Task 6b round 2, which I had not
checked for before writing the new one). `port-fidelity.test.ts` stayed green either way - nothing
in it rejects a duplicate `to` path - so this was caught by my own review of the diff before
committing, not by a test. Fixed by deleting the duplicate and extending the existing entry's
`why` field instead. Recorded here because a check that did not catch it is worth knowing about if
someone later asks why port-fidelity passed through a duplicate.

## Deviations from the brief, summarised

1. `checkWireSafety`'s batch is tagged one representative kind (`"short"`) rather than split by
   message content, because splitting it is reading a class off a sentence from outside a
   function this task does not restructure. See the table above.
2. `componentProblems`'s "piece of net ... has no label or power symbol" is tagged `"split-net"`
   as the closest existing fit, not a literal match. See the table above.
3. `lib/schgen/render/sheet-check.ts` and four ported test files moved from `files[]` to
   `diverged[]` in `tools/schgen/port-manifest.json` - required by the hand edits this task makes,
   not optional, and not mentioned in the brief (which only lists the three `lib/schgen/render/`
   files and "their callers").
4. The throw sites in `blocks.ts` and `bus.ts` now throw `SchgenRefusal` rather than `Error`. The
   brief says "callers keep throwing, built from the findings," which I read as requiring this
   rather than a plain type-level pass-through; `SchgenRefusal` does not override `.name`, so this
   is invisible to every existing catcher and to the board-sheets.ts census today.

## Concerns for later tasks

- Task 3/4 should be aware that `checkWireSafety` and `danglingWireEnds` (`wire-safety.ts`),
  `clearanceProblems`/`sceneClearanceProblems` (`body-clearance.ts`), and `bodyGlyphProblems`/
  `glyphGlyphProblems` (`glyph-clearance.ts`) are **not** converted to `Finding[]` by this task -
  they remain `string[]` producers, wrapped at each of their two call sites (`layout-check.ts`,
  `sheet-check.ts`). If a later task wants `"missing-junction"` or finer-grained `"nc-contact"`
  distinctions out of `checkWireSafety`'s output, that function itself needs restructuring, not
  just its callers.
- `lib/schgen/elk/adapt.ts`'s `AdaptReport.problems` is still `readonly string[]` by design (Task
  3's explicit territory - "the geometry survives"). It is produced by mapping `checkLayout`'s new
  `Finding[]` down to `.what` immediately, so nothing about it changed in this task, but it means
  Task 3 will need to decide whether `AdaptReport` should carry findings instead.

## Fix round 1: one Important, three Minors

### ITEM 1 (Important) - `checkWireSafety`'s batch tag was `"short"` with a false justification

The review is right and the fix is two parts, both done:

**(a) Recorded the exception at the site.** `layout-check.ts`'s `checkLayout` doc comment and
`sheet-check.ts`'s module doc comment each now carry a paragraph naming the exact branch the
batch tag gets wrong: `wireOverWires`' collinear-overlap case (rule 2, `wire-safety.ts`) runs
with no net test, and a SAME-NET collinear overlap is "redundant geometry" per its own
docstring - correct about the circuit, merely ugly, which is `"usable"`. Tagging the whole batch
one kind mislabels that one case as wrong-about-the-circuit, which is the direction the owner's
line exists to prevent. Not fixed (restructuring `wire-safety.ts` is out of this task's three
named files), but named rather than left for a later reader to re-discover.

**(b) Changed the representative kind from `"short"` to `"missing-junction"`.** Both call sites
(`layout-check.ts`'s `checkLayout`, `sheet-check.ts`'s `assertSheetSafe`) now tag
`checkWireSafety`'s batch `"missing-junction"`. The batch's dominant message shape is "lies
mid-wire on ...; split the wire there" / "ends mid-wire on ...; split the wire there" -
`CLAUDE.md` names this class by this name as the one that must keep refusing. `classOf` maps both
`"short"` and `"missing-junction"` to `"defective"`, so this is a label correction with no class
movement - confirmed by the census diff below, still empty.

### ITEM 2 (Minor) - hoisted the `finding()` constructor

`lib/schgen/findings.ts` now exports `finding(kind, what, where): Finding`. The verbatim-duplicate
local copies in `layout-check.ts` and `sheet-check.ts`, and the fixed-kind local `text()` closure
in `text-scene.ts`, are gone; all three import and use the one constructor. `findings.ts` is
Task 1's file, not one of this task's three named producers, but the duplication was created by
this task and the fix is a one-function addition with no behaviour change, so I made it here
rather than leave a third copy for Task 3 to avoid writing a fourth.

### ITEM 3 (Minor) - `where` now names the item when the producer has it in scope; did NOT need restructuring

Went through every `finding(...)`/`finding()` call site in `layout-check.ts`, `sheet-check.ts` and
`text-scene.ts` and threaded an existing local value into `where` wherever the producer already
had the specific item in scope - no restructuring needed anywhere this applied:

- `text-scene.ts`'s `textProblems`: `where` is now `t.what` (the drawn text each line is about),
  not `scene.scope`.
- `layout-check.ts`'s `placementProblems`: `where` is the unit `key`.
- `gridProblems`: `where` is the same `what` local `assertOnGrid` is already given to name the
  failing item - no new value needed, just reused.
- `overlapProblems`, `sheet-check.ts`'s `bodyOverlaps`: `where` is `"${p.key} & ${q.key}"`, naming
  both overlapping bodies.
- `shapeProblems`: `where` is `item.what` (the `ConnItem` already in scope).
- `componentProblems`: `where` is `"${nets[0]} & ${nets[1]}"` for the short case, `nc.what` for
  the NC-contact case, and the specific `net` for the split-piece case.
- `internalSplitProblems`, `anchorProblems`: `where` is the specific `net`.

**Where it stayed at block/sheet level, and why, named at each site rather than silently kept:**
`blockGlyphProblems` and `checkLayout`'s own wrapping of `checkWireSafety`/`danglingWireEnds`/
`clearanceProblems` (`layout-check.ts`), and `clearance`/`assertSheetSafe`'s wire-safety and glyph
batches (`sheet-check.ts`). All of these wrap a STRING returned by a function in a different file
(`wire-safety.ts`, `body-clearance.ts`, `glyph-clearance.ts`) that carries no per-item structure -
getting an item-specific `where` out of them means reading one off the text (exactly what
`Finding` exists to avoid) or restructuring that other file, which is out of this task's three
named producers. **This is the "stop and say so" case the instruction allowed for; I did not force
it.** Task 3/4, or a future task converting those three files, is where this would be picked up.

### ITEM 4 (Minor) - the ten stale `docs/superpowers/sdd/2026-10-27-gates-classify` references

Fixed all ten, confirmed by a repo-wide grep returning nothing afterward: `findings.ts` (1,
inherited from Task 1), `layout-check.ts`, `sheet-check.ts`, `text-scene.ts`, `adapt.ts` (1 each,
added by this task), and `port-manifest.json` (5 - four `task` fields plus one occurrence inside
a `why` string). All now read `docs/superpowers/plans/2026-10-27-gates-classify.md`, the plan
document that actually exists, rather than the gitignored workspace path.

### VERIFY

**`bun run typecheck`:**

```
$ bun run typecheck
$ tsc --noEmit
```

Exit 0, no output.

**Census before/after diff, same normaliser as before, EMPTY:**

```
$ diff <(python3 normalize-census.py < census-before-raw.txt) \
       <(python3 normalize-census.py < census-after2-raw.txt)
$ echo $?
0
```

(`census-before-raw.txt` is the same unmodified-HEAD capture from the original pass - the kind
rename and `where` changes do not touch the pedals source or the board-sheets.ts code path, so
re-capturing "before" was not needed; "after" was re-captured against this fix round's code.)

**Full suite:**

```
$ SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test
...
 3896 pass
 0 fail
 44129 expect() calls
Ran 3896 tests across 364 files. [166.42s]
```

0 fail. **3896, matching the baseline exactly** - no test added or removed in this fix round
either.

### NOT addressed, per the coordinator's note

The four refusing boards (three transistor-preamp, `pultec-mid`) throwing a plain `Error` rather
than `SchgenRefusal` is Task 3's scope (ELK backend path and `validateCircuit`, both outside this
task's three files) and already recorded by the coordinator. Not touched here.
