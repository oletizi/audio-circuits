Task 2 review: request generator (8961222..fff418f)

Verdict: Needs fixes. One Important finding: one bit of page-derived pin assignment reaches the request, and the no-leak test cannot detect it. Everything else meets the brief.

### Spec Compliance (✅/❌ with file:line; ⚠️ cannot verify)

- ✅ `intendedSymbol` exported, with no behaviour change. `lib/kicad/sheet-agreement.ts:145-147` is now `symbolEntry(intendedLibId(c))`, and `intendedLibId` (`:152-`) returns `declared` and then `byKind` in the same order with the same refusal. `symbolEntry` is applied after the branch instead of inside it, which gives the same result. Its only caller is still `compareSheetToModel` at `:441`. Grep found no other importer.
- ✅ `TRIAL_BOARDS`, `approvedSheetDigest` and its refusal. See `tools/schgen-drawing-trial/boards.ts:19-68`. The refusal is tested through `approvedDigestOf` on a copy with one byte flipped (`tests/schgen-trial/request.test.ts:185-199`). I confirmed all five committed page digests appear in `docs/schematic/verdicts.md`, at lines 334 and 411-414. As ruled, the CLI does not call the gate.
- ✅ The `TrialRequest` shape, `buildRequest`, `parseRequest`, and the CLI that writes `request.json` and `request.txt` (`tools/schgen-drawing-trial/request.ts:67-76, 177-182, 193-241, 243-254`).
- ✅ Text format: PARTS, then NETS, then LABELS, one item per line, ground written as `GND` (`request.ts:166-174, 98-107`).
- ✅ SchGen's convention was read and recorded in the module comment, with followed and departed items listed separately (`request.ts:29-52`).
- ✅ `round trip` (`request.test.ts:122-129`), `control` (`:139-155`), `symbols` (`:167-183`) and `approval check` (`:185-199`).
- ✅ with a recorded departure: `matches the model` (`:131-137`) uses `compareSheetToModel`, not `toImportedNetlist`. The reason is recorded in the test module comment (`:11-15`). See the judgement under Strengths.
- ❌ "No placement leak, by construction": `pultec-low-boost`'s pin assignment comes from the approved page. See Important 1.
- ✅ Symbols. I checked each board's request symbol set against the `lib_id`s placed on its approved page. The only differences are the spec's power departure: the page has `copperhead_power:GND` and `copperhead_power:PWR_FLAG`, and the request has `power:GND`. Every other `library:symbol` is identical, which meets the spec's "supplies the exact symbols the approved page uses". The test resolves every symbol and every NETS pin against the installed libraries through `tests/kicad/symbol-library-disk.ts`, which throws when a library file is missing rather than skipping.
- ✅ Determinism. Within one process, building the request twice gives the same JSON for all five boards. Nets, pins, labels and symbols are sorted by code unit, and parts follow network order. The implementer's cross-run `diff -r` was not re-run here.
- ⚠️ The Hugging Face dataset was not downloaded, which the report states. `sch_examples` and `make_dataset.py:77` were quoted, and I did not open the SchGen clone to verify the quotes.

### Strengths

- The generator really does read no sheet. `modelForSheet` reads only `boards/<board>/perfboard.json` (`tests/circuits/sheet-model.ts:133-135`) plus the circuit builders. Designators are a per-prefix count in network order (`sheet-model.ts:480-501`), with no page input.
- The known disagreement is as narrow as it can be. `knownDisagreements` (`request.test.ts:98-101`) uses `toEqual` against the exact constant `SELECTOR_PIN_DISAGREEMENT`: `"SW1 pin numbers: model [1, 2, 3, 4, 5, 6, 7] vs schematic [1, 2, 3, 4, 5, 6, 7, MP]"` (`tests/circuits/drafted-sheet.ts:242-243`). The list must equal `[that string]`, so any other pin, net, value or identity line fails. A wrong symbol on SW1 would also show up in `componentIdentity`/`pinIdentity`.
- The `compareSheetToModel` departure holds up on its merits. It is the comparator the approved pages are already held to, it is independent of the generator's own net-building code, and it compares which pins share a net rather than net names, which the spec needs for `0` against `GND`. `asExport` adds every unlisted symbol pin as a singleton, as `kicad-cli` would export it, so a dropped pin becomes a net-membership difference rather than going unseen.
- The control is a real mutation. It takes the last pin off one net and appends it to another, re-parses the text, asserts that the unmutated text gives only the known list, and then requires a new `"the model connects ["` line (`request.test.ts:139-155`). That prefix matches the comparator's message at `sheet-agreement.ts:480`.
- The leak test cannot pass vacuously. It asserts the pair list and the UUID list are both non-empty, and it checks three spellings of each coordinate pair (`request.test.ts:103-115, 157-165`).
- The request-convention departure is acceptable. The spec requires a fixed format that parses back, which prose cannot do. The followed conventions (pin numbers, a net as its full pin set, ports as labels, ground as a rail) are the mechanical ones, and the cost of being off their training distribution is stated (`request.ts:44-52`).
- Refusals name what is missing and why it is not defaulted: `token`, `requestNetName`, `assertTrialBoard` and `approvedDigestOf`.

### Issues

**Critical:** none.

**Important**

1. **A page-derived pin swap reaches the request, and the no-leak test cannot catch it.** The generator takes pin numbers from `model.pinNumbers` (`request.ts:125, 141-148`), and for `pultec-low-boost` that map includes `DECLARED_PIN_NUMBERS` (`tests/circuits/sheet-model.ts:393-395`): `R2: { a: "2", b: "1" }`. That entry's own comment calls it *"A PIN MAP THE COMMITTED PAGE DECLARES AND NO RULE DERIVES"* (`sheet-model.ts:363-364`). It records a swap made so the approved page's `out` wire would run straight instead of doubling back (`:367-377`).
   - The request I generated says `out: J1.4 R1.2 SI7.2`. Model component `R2` is designated `R1`, and its `a` pin lands on symbol pin 2. The positional rule would put it on pin 1.
   - The swap is electrically a no-op. It is still a layout fact taken from the approved drawing, and the spec says the request is "generated mechanically from the board's model" with "no placement leak, by construction".
   - The leak test only looks for coordinate, rotation, mirror and UUID tokens (`request.test.ts:157-165`), so it cannot detect this.
   - Fix: build the request's pin numbers from `pinNumbersFor(component)` (the rule, `sheet-model.ts:291`) instead of the page-declared map. In the `matches the model` and `control` tests, compare against that same rule-based map, so `compareSheetToModel` still applies unchanged. Add an assertion that `R1.1` is on `out` in the low-boost request, so the test fails if the declared map comes back. If the swap is kept on purpose, it has to be named as a departure in the module comment and the spec, and shown to the owner with the request.

**Minor**

1. `approvedDigestOf` (`boards.ts:47-62`) admits any backticked digest anywhere in `verdicts.md`. That file also records digests of sheets that were shown and criticised, such as earlier pultec runs at lines 57-225. If a trial board's page were reverted to one of those bytes, the gate would admit it. This follows the constraint as written ("absent from verdicts.md"), and the file deliberately has no status field, so this is noted only. A tighter gate would match the digest inside the "four remaining Pultec pages" section or the specific line for the board.
2. The `parseRequest` refusal test (`request.test.ts:206-209`) covers only two cases: trailing text in LABELS that does not match, and sections out of order. The report lists many more refusals (a repeated designator, net or label; a pin on an undeclared part; a pin on two nets; a label naming an unlisted net), and none of them is exercised. Add one case for each.
3. `lib/kicad/sheet-agreement.ts` is 492 lines, which is at the edge of the house limit of 300-500.
4. `tools/` now imports from `tests/` (`modelForSheet`, `draftedSheet`). The brief mandated this, but it is a layering inversion for a tool that a later runner will ship. Consider moving `sheet-model.ts` out of `tests/` later.
5. `token()` (`request.ts:86-96`) accepts a symbol with no colon, because the first regex matches it. `parseRequest` would then refuse it at round trip, so nothing passes silently. Still, the generator could refuse a bare symbol where it is created, with a message that names the cause.

### Assessment

Task quality: **Needs fixes.**

Reasoning: the generator, parser, gate and tests are carefully built. The known disagreement is pinned to one exact string, the control mutation really fails the comparison, the symbols match the approved pages apart from the declared power departure, and the output is deterministic. Both departures the implementer flagged are justified on their merits. The one blocking point is the brief's central question: does anything from the approved sheet reach the request? One thing does. `pultec-low-boost`'s `R2` pin assignment is a page-declared layout choice, it flows into the request through `modelForSheet`'s pin map, and the leak test is not able to see it. Fixing it is local: use the rule-based pin map for the request and in its comparison, and add an assertion.
