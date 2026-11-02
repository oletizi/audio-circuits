Task 3 fix round 1 - scoped re-review
======================================

Scope: confirm two round-1 items were closed (the refusal returning to validation time; the
replacement tripwire) and that the two new guards can actually fail. Round 0 is out of scope and
was not re-reviewed. Diff reviewed: `18eb600..35011ed` (one commit). Marks: CONFIRMED = driven or
read directly by this reviewer; RELAYED = taken from the implementer's report without independent
drive.

## A. The restored `netNames` rule - can it fail, and does it refuse the right set?

**CONFIRMED.** `lib/schgen/ir/validate.ts` defines `netNames` as a `Rule` applying
`NET_NAME = /^[^\x00-\x1f]+$/` (from `lib/schgen/ir/types.ts`) to every net of the IR, and it is
first in `DRAWING_RULES`, which has eleven entries (counted: `netNames, partShapes, pinsDeclared,
unitsPlaced, sheetsAndBlocks, renderings, singlePinNets, rails, pinSemantics, sheetFiles,
mechanicalPads`).

**Drove it five ways**, running `tests/schgen/ir/net-name.test.ts` as-is (20 pass / 0 fail / 80
expect(), matching the report exactly):

- carriage return: refused, message contains `net "RAW\rCR" is not a usable net name`, names
  `control character (U+000D)`, states the silent-rename reason, cites `no exit code reports`, cites
  `tools/schgen/label-syntax/probe-run.log`.
- NUL: refused, names `control character (U+0000)`.
- tab: refused, names `control character (U+0009)` - and the test's own comment is honest that
  `kicad-cli` accepts a tab verbatim, so the refusal is "because the class is refused," not because
  KiCad rejects it.
- empty string: refused, names `it is empty`, cites `net name must not be empty`.
- multi-character (`A<CR>B<NUL>C`): refused once, names `control character (U+000D, U+0000)` - every
  offending character, in order, in one message.
- lower-case authored name (`hi_boost_out`, `in`, etc.) and a parenthesised synthetic name
  (`Net-(C10-Pad1)`, `unconnected-(U1-CLK_O-Pad5)`): both **accepted**, confirmed by the positive
  controls in `describe("validateCircuit no longer refuses a drawing for a net name's case")`.

**Then I drove it myself, independent of the existing tests.** Removed `netNames` from
`DRAWING_RULES` (simulating round 0's shape) and reran `tests/schgen/ir/net-name.test.ts`: **15
pass / 5 fail**, the five failures being exactly the CR, NUL, tab, empty, and multi-character
validation-time cases (the ones that depend on `validateCircuit` reporting a problem). This matches
the report's claimed "5 of 20 red." Restored the array; `shasum -a 256` of `validate.ts` matched the
pre-perturbation hash exactly.

**One-line message, confirmed both ways.** Read `netNameProblem`/`controlCodesIn` in
`validate.ts`: every string segment is a quoted literal joined with `+`, no embedded `\n`, and the
control-code text is built with `code.toString(16)` rather than a literal escape. Ran the test
`"produces no problem containing a newline, which verify.test.ts:156 requires of gate 1"` - passes.
Read `tests/schgen/verify.test.ts:156` directly: `for (const p of gate1?.problems ?? [])
expect(p).not.toContain("\n")` - confirmed the constraint exists and is honoured.

**Verdict: A is fully confirmed. The rule can fail, refuses exactly the stated class, and accepts
exactly what it should.**

## B. `verify.test.ts` holding at 52 as a negative control

**CONFIRMED, and the count CAN move.** Ran `tests/schgen/verify.test.ts` as-is: 18 pass / 0 fail /
**52** expect() calls, matching the report. Read the file: one `expect(p).not.toContain(...)` call
per gate-1 problem inside a `for` loop (line 156), so the count is a direct function of how many
problems a gate-1 refusal produces - not a fixed literal.

**Perturbed `NET_NAME`** (in `lib/schgen/ir/types.ts`) to also refuse lowercase
(`/^[^a-z\x00-\x1f]+$/`), which refuses the `low_er` net the ported `mini` fixture's bad-spec
test case carries (`cap("C2", "low_er", "GND")` in `verify.test.ts`'s own fixture). Reran
`verify.test.ts`: **53** expect() calls - the count moved exactly as the report predicted an
over-broad predicate would move it. Restored `types.ts`; `shasum -a 256` matched the original hash
exactly.

**Verdict: B is confirmed. The "negative control" reasoning holds** - the predicate's narrowness is
demonstrated by a check that could have (and, under perturbation, did) fail.

## C. The replacement tripwire - can it fail, and does its floor hold?

**CONFIRMED on all four points required.**

**1. Driven red by perturbing the generator.** Added `.toUpperCase()` to `connection.net` at both
pin-assembly sites in `lib/schgen/from-network.ts` (lines 222 and 233, both identical
`out[number] = connection.kind === "net" ? { net: connection.net, identity: canonical } : ...`
expressions). Reran `tests/schgen/ir/net-name.test.ts`: the sweep test failed, naming seven circuits
(`optical-compressor`, `pt2399-core`, and all five Pultec boards) and listing every renamed net in
both directions (`"in the model and not in the IR"` / `"in the IR and not in the model"`). This is a
stronger red than the report's one-line summary implied but is consistent with it - it names the
circuit and the net, for every affected circuit, not just one. Restored `from-network.ts`;
`shasum -a 256` matched the original hash exactly.

**2. The floor assertion fires on an empty case list.** The report's own corpus is
`ALL_DECLARED_CASES` (a shared file, `tools/schgen/board-declarations.ts`), so rather than mutate
that shared file I substituted a local empty array for it inside the test file only
(`const EMPTIED_FOR_REVIEW: typeof ALL_DECLARED_CASES = []`), which exercises the identical code
path without disturbing other tests that import the real list. Result: **both** assertions fire -
`expect(EMPTIED_FOR_REVIEW.length...).toBe(13)` fails (0 received), and independently
`expect(netsCompared, ...).toBeGreaterThan(150)` fails (0 received). So there are two floors, not
one, and both catch an emptied range. Restored the test file; `shasum -a 256` matched the original
hash exactly.

**3. The round-0 claim it refutes, verified narrower.** Under the same case-folding perturbation on
`from-network.ts`:
- `authoring-complete.test.ts`'s refusal-count assertions (`EXPECTED_REFUSALS`): **passed** (36
  pass / 1 fail out of 37, not an error in the counts themselves).
- The one failure in that file was exactly `"the one single-pin net is pt2399-core's CLK_O
  placeholder, which the declaration declares a port"` - expected
  `net unconnected-(U1-CLK_O-Pad5) has only one pin...` and received
  `net UNCONNECTED-(U1-CLK_O-PAD5) has only one pin...`. Confirmed this is a literal-string match
  failing on one net of one circuit, not a pass-through invariant.
- `tests/schgen/ir/validate.test.ts`: 17 pass / 0 fail - confirmed unaffected, as claimed.
- The new sweep: failed, as covered in point 1 above.

This exactly matches the implementer's corrected claim in both the test file's header comment and
`docs/known-gaps.md`'s port-manifest/G281 text: the old mechanism (refusal counts) did **not**
notice the normaliser; one incidental literal did. The narrower claim is accurate and I drove it
myself rather than relaying it.

**Verdict: C is fully confirmed. The sweep can fail, names the circuit and net, both floor
assertions fire independently on an empty range, and the corrected claim about what the old
mechanism does and does not catch is accurate.**

## The register deletion (G279)

**CONFIRMED - clean deletion, no dangling or false references.**

`grep -rn G279 lib tests tools docs` returns **0** hits (grep exit code 1, no matches), confirmed
directly.

Read every site the report claims was rewritten rather than dropped:
- **G150** (`docs/known-gaps.md`, clause (2) of "Why it is STILL open" and the settlement clause):
  reads true - explicitly narrates that round 0 relocated the refusal and lost the tripwire, that
  "both were closed in round 1 and the entry that held them is deleted," and names what replaced
  each half. The round-0 narrative paragraph earlier in the same entry ("DONE, 2026-10-23, TASK 3")
  still describes `DRAWING_RULES` as "ten rules" and `netNames` as "deleted" - but this is explicitly
  framed as what round 0 did, and the entry's own later clause corrects it for a reader going
  linearly through the entry. Not a dangling or false reference; it is accurate history followed by
  an accurate correction.
- **G280**'s reason clause: now cites **G277** (not G279) for the silent-rename measurement, and adds
  that `netNames`' own comment in `validate.ts` carries the same reason. Reads true - G277 is the
  probe-log entry and does carry that measurement.
- **`net-name.test.ts`'s header**: cites G150, G277, G280, G281 - no G279. Reads true against the
  file's own content.
- **`types.ts`'s caller paragraph**: now describes "TWO PRODUCTION CALLERS... not interchangeable,"
  names the validate.ts rule as the guard and the pin-table gate as a backstop, and states "ROUND 0
  OF TASK 3 DELETED THE RULE AND LEFT ONLY THE GATE... do not delete the rule again." Reads true and
  matches the restored code.
- **Two `port-manifest.json` divergence reasons** (`ir/types.ts` and `ir/validate.ts` entries):
  confirmed via diff and via live `diverged[]` count (55 before, 55 after - no entries added or
  removed, only text corrected). Both now say "docs/known-gaps.md G150, G277 and G280" where they
  used to say "...G150 and G279." Read in full: both now correctly describe `netNames` as narrowed
  (not deleted) and `DRAWING_RULES` as eleven rules.

**No dangling reference (pointing at nothing) and no false reference (stating something no longer
true) found in any of the six sites the report claims were touched.**

## Also verified

- **Port fidelity: no file left the byte-check.** `tests/schgen/port-fidelity.test.ts`: 12 pass / 0
  fail / 117 expect() - CONFIRMED, exact match. `port-manifest.json`'s `files[]` array is unchanged
  at 73 entries and `diverged[]` unchanged at 55 entries (confirmed by loading both commits' JSON and
  comparing lengths) - no new `diverged[]` entry this round, only text edits to three existing ones.
- **Suite move: CONFIRMED exactly.** Ran the full suite (`SCHGEN_SOURCE=... bun test`): **3838 pass
  / 0 fail / 43688 expect() / 355 files**, matching the report term for term. Per-file: `verify.test.ts`
  52 (unchanged), `authoring-complete.test.ts` 740 / 37 tests (unchanged), `validate.test.ts` 27 / 17
  tests (unchanged), `net-name.test.ts` 20 tests / 80 expect() (the full +8 tests / +20 expects, all
  in this one file, as claimed).
- **Board census: CONFIRMED, still 0 of 11.** Ran `SCHGEN_SOURCE=... bun tools/schgen/board-sheets.ts`:
  six boards refuse on exactly one problem each - `pt2399-core` on the CLK_O single-pin net, each
  Pultec board on its `SW_*` mounting pin - byte-for-byte matching the report's quoted messages. The
  five `transistor-preamp` boards refuse on unrelated ELK geometry, unchanged. Restoring the rule
  added **no** new refusal to any board.
- **`bun run typecheck`: CONFIRMED clean**, exit 0.
- **G281: CONFIRMED, does not overclaim.** Read the full entry. It now states plainly that it is "a
  RECORD and needs no fix," names the delete trigger ("next time `pin-table.ts` is touched for any
  reason"), and keeps the one still-true residual (five failure modes under one lumped gate message,
  pre-dating Task 3) clearly separated from the subsumed concern. No overclaiming found.
- **The two round-0 corrections: CONFIRMED.** `tools/schgen/gate-census.ts`'s comment no longer
  claims "nothing can produce this row again" - it now says the coordinator reversed the deletion and
  the row "can fire," with the matcher updated to `p.includes("is not a usable net name")`, which
  matches the live message text verbatim (checked by direct string inspection). Verified the matcher
  would in fact match: the rule's message is literally `net ${JSON.stringify(n)} is not a usable
  net name: ...`, which contains the substring. `tests/schgen/authoring-complete.test.ts`'s comment
  no longer says `validateCircuit` "cannot produce it at all any more" - the class is back in
  `RULE_CLASSES` with a 4-tuple, 0 on all four parity circuits, and the file's own comment states this
  is a measurement (confirmed: ran the perturbed-generator check above, which shows the rule can in
  fact fire and the zero is not vacuous).
- **Byte cleanliness: CONFIRMED, zero.** Scanned all eight touched files (the seven code/test files
  plus `docs/known-gaps.md`) byte-by-byte for control bytes outside tab/CR/LF: **0 stray control
  bytes** in all eight files. Confirmed the new code builds control characters via
  `String.fromCharCode` (test file) and `code.toString(16)` / `codePointAt` (validate.ts), with no
  literal control-escape typed into either - matching the claim.
- **No AI attribution in the commit:** read `git log -1 --format="%B" 35011ed` in full - no
  `Co-Authored-By`, no `Claude-Session`, no generated-with footer.
- **Working tree: CONFIRMED clean.** Every perturbation (DRAWING_RULES array, `NET_NAME` regex,
  `from-network.ts`'s two pin-assembly sites, and the test file's case-list substitution) was
  restored and independently verified byte-identical via `shasum -a 256` against hashes captured
  before any perturbation. `git status --porcelain` is empty.

## New findings

None. No false green, dangling reference, or overclaim was found beyond what the report itself
already disclosed and this review independently confirmed.

## Overall verdict: ALL ADDRESSED
