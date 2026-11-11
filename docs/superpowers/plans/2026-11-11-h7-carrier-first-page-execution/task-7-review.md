### Spec Compliance

- ✅ Spec compliant. Every file the brief lists is in the diff with its hunk:
  - `drafted/h7-platform/h7-carrier/`: the sheet, `.kicad_pro`, `.svg`, `sym-lib-table`, `RECORD.md` and `repair/`.
  - `tests/fixtures/h7-carrier.net`.
  - `boards/h7-carrier/perfboard.json`, which gains `sch` and `netlist` (diff lines 41-53).
  - `tests/circuits/h7-carrier.test.ts`, which gains `registerDraftedPageTests` (diff 60604ff).
  - The round-trip `BOARDS` entry (`tests/circuits/drafted-kicad-round-trip.test.ts:52`).
  - The spec G4 sentence.
- Each controller ruling, checked one by one:
  - **`pinDisagreements` is exact.** `h7-carrier.test.ts` declares `pinDisagreements: []`, asserted exactly by `drafted-sheet.ts` (the "known disagreements" test, `expect(pinIdentity.sort()).toEqual(page.pinDisagreements)`). On the fresh export the round-trip test asserts `expect(fromFresh).toEqual(fromFixture)` (`drafted-kicad-round-trip.test.ts:71`), which covers all six lists, `pinIdentity` included, and it also asserts `componentIdentity` and `netMembership` empty on the fresh export (lines 74-75).
  - **RECORD lists every ruling, linked.** `RECORD.md` "The controller rulings this page rests on" lists 10 CR-CARRIER-* entries and R-14. All 11 anchors resolve to `###` headings in `docs/h7-platform/decisions.md`: lines 1323-1399, and 885 for R-14. All 11 sit inside the "Controller rulings (the owner may override)" section, lines 491-1407, so labelling them as controller rulings is correct.
  - **The G4 sentence reads as the ruling states.** It now says "goes to one breakout terminal (a test point or a header pin)" (diff line 92). The two sentences that restate it and the Decisions-table row are changed to match, and an italic note marks the plan-time correction.
  - **`sym-lib-table` resolves from a fresh checkout.** Its URI is `${KIPRJMOD}/../../../circuits/h7-platform/h7-platform.kicad_sym`, which reaches `circuits/` at the repository root from `drafted/h7-platform/h7-carrier/`. No path leaves the repository or the KiCad install.
- Each global constraint:
  - **Zero connectivity disagreement on the fresh export, with the moved-pin control on both sides.**
    - Fresh export clean: `drafted-kicad-round-trip.test.ts:74-75`.
    - Moved-pin control on the fresh export: lines 78-87.
    - Moved-pin control on the fixture: the `registerDraftedPageTests` "moving one pin" test.
  - **`repair/` holds the work and a replay.** It holds every op-list, every script and `intent.json`, and `replay.sh` checks the end sha256 (Risk 3 below).
  - **No skipped check looks like a pass.**
    - `verify.sh`, `replay.sh` and `render.sh` all run `set -eu` and `pipefail`, check that each output file exists, and stop non-zero, naming the step.
    - `netcompare.ts` exits 1 on any componentIdentity, netMembership or pinIdentity entry.
    - `03-text-edits.py` refuses whenever a count does not match.
- ⚠️ Cannot verify from the diff:
  - **The full-suite failure.** The report names `tests/stripboard/temp-scratch.test.ts` (an unnamed mkdtemp site in `schgen-trial/comparator-controls.test.ts`) as failing in the full `bun test`. The diff adds no mkdtemp site, so this task did not cause it. It is not on the global constraints' list of known pre-existing failures, so the controller should confirm it fails identically at `e139c99`.
  - **The replay was not run** (see Risk 3).

### Passes made

1. I read the commit list and stat summary, then the hand-written hunks:
   - the spec edit and `RECORD.md` (diff 54-334);
   - every `repair/*.py`, `*.sh` and `*.ts` file, and `REPLAY.md`;
   - `layout.py`;
   - the two test-file hunks.
2. I did not read the generated bodies of the `.kicad_sch`, the `.svg`, the `.net` or the op-list JSON line by line. I queried them with the scripts and commands listed under each risk below.
3. Outside the diff I read only what the four named risks needed:
   - `lib/kicad/sheet-agreement.ts:370-490`;
   - `lib/kicad/value-notation.ts` (`valueFor`);
   - `circuits/h7-platform/carrier-board.ts:60-200` and `parts.ts` (the PartSpecs);
   - `tests/circuits/drafted-sheet.ts` (`withOnePinMoved` and the registered tests);
   - the round-trip test's body;
   - the headings of `docs/h7-platform/decisions.md`;
   - the installed `Power_Protection.kicad_sym`.

### Named risks and the check made for each

**1. The 36 ERC warnings: all of the library-configuration kind; none is an ERC failure under §3.**
- **Check:**
  - I ran `kicad-cli sch erc --format json --severity-all` on the committed sheet, with output to the scratchpad. It reported 36 violations and 0 errors: 35 `lib_symbol_issues` ("does not include the symbol library 'copperhead_power'") and 1 `lib_symbol_mismatch` ("Symbol 'USBLC6-2SC6' doesn't match copy in library 'Power_Protection'").
  - 35 equals the 30 power symbols plus the 5 PWR_FLAGs.
  - `git status` was clean afterwards.
  - The `.kicad_pro` carries no `rule_severities` override, so ERC ran at its default severities.
- **What the USBLC6 mismatch is.** I compared pins, scratch script `pincmp.py`. The installed `USBLC6-2SC6` is `(extends "USBLC6-2P6")`. The embedded copy's 6 pins match the parent's exactly in number, name, type, position, orientation and length. The difference is in properties: the embedded copy carries the parent's `Value "USBLC6-2P6"`, `Footprint "Package_TO_SOT_SMD:SOT-666"`, a SOT-666 Description and `ki_fp_filters "SOT?666*"` (sheet lines 2546-2604), where the installed -2SC6 says SOT-23-6 and `SOT?23*`. This is not electrical. See Minor 1.

**2. The eight nets that lose their model names: the comparison matches by membership, so a lost name cannot hide a wrong connection.**
- **Check:** in `lib/kicad/sheet-agreement.ts`, `netMembership` is computed at lines 476-482 by `partitionOf([...byNet.values(), ...unconnected])` against `partitionOf(Object.values(exported.nets))`. Both are sets of member sets, and net names are never compared. Every not-connected pin enters as a one-member set (lines 419-425), so a pin wired where the model says NC is caught as well.
- **Names in the fixture.** 39 `/<model name>` nets, the 5 power nets, 8 `Net-(…)` nets (J5-Pin_1, J6-CC1, J6-CC2, J6-SHIELD, J7-Pin_2, J8-Pin_2, U1-1D+, U1-1D-), and 4 `unconnected-…` singletons, which match the model's NC pins. That is 52 in total.
- **The positive control.** `netcompare.ts` reports named nets for information only and never fails on them. The implementer's own U2 episode, six `netMembership` entries from the in-line wiring recorded in `RECORD.md`, shows that membership does catch a wrong connection on this board.

**3. The replay: by inspection, it checks the end sha256 recorded in RECORD.md. I did not run it.**
- **Check, read-only, `repair/replay.sh` (diff 60379-60460):**
  - It refuses a non-empty work directory.
  - It runs `make draw`, compares the generated intent byte for byte with `intent.json`, and checks the draft sha256 `106b21a1…`.
  - It regenerates `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json` and `02-wire.nets.json`, comparing each against the committed copy with `cmp`.
  - It requires `status: APPLIED` from each `akcli draw --apply`.
  - It runs `03-text-edits.py`, then checks the sha256 `dc9e93ea…` and compares the result byte for byte with the committed page.
- **The hashes match.** I hashed the committed sheet (`dc9e93ea4ca6f42249df5faf7004965f83396db9f0c8e366474ca3e3ec5252af`) and `repair/intent.json` (`e28982a7…`). Both match `RECORD.md` and `REPLAY.md`.
- **Why I did not run it.** It cannot be confined to a scratch directory: step 1 is `make -C boards/h7-carrier draw`, which writes `build/draw/h7-carrier/` and `build/draw/h7-carrier.intent.json` inside the repository and overwrites them (gitignored, `.gitignore:6`). See Minor 3.
- **Determinism, by reading.** `03-text-edits.py` iterates over lists in file order. Sets are used only for membership checks, never for output order. Nothing in the chain reads the clock; the date is the literal `2026-11-11` in `02-wire.py`.

**4. The hidden Value fields: none hides a value the model holds. The fuse's "0.75A hold" is shown.**
- **Check:** I parsed every non-power symbol instance in the committed sheet (scratch script `values.py`). Exactly 15 Values are hidden:
  - TP1-TP8, `TestPoint`;
  - J3 and J4, `Conn_01x20`;
  - J5, J7 and J8, `Conn_01x02`;
  - J6, `USB_C_Receptacle_USB2.0_16P`.

  Each hidden Value equals its lib id's part name.
- **The model has nothing more to show for these parts.** `TEST_POINT`, `HEADER_2`, `BREAKOUT_HEADER` and `USB_C_RECEPTACLE` in `circuits/h7-platform/parts.ts` carry no `mpn` and no `value`. They are connectors with empty `parameters` (`carrier-board.ts:71-78`), so `valueFor` falls through to the symbol's part name. `valueDisagreements: []` confirms the drawn value is that string.
- **Values that stay visible:**
  - F1 `0.75A hold` (sheet line 4078), from `FUSE.value`;
  - J1 and J2 `801-43-020-10-012000`, the socket MPN;
  - every R and C value (10K, 12K, 20K, 5.1K ×2, 1M, 147R, 357R, .1uF ×2, 4700pF);
  - U1 `TS3USB221RSER` and U2 `USBLC6-2SC6`.
- **A hidden field stays in the export.** The fixture still carries `(value "TestPoint")` and the others.

### Strengths

- **The verification harness refuses.** `verify.sh` and `replay.sh` stop non-zero on every unrunnable step, write into fresh temporary directories, and compare by sha256 and `cmp`, never by timestamp.
- **The scripts refuse rather than guess.**
  - `01-place.py` refuses a draft symbol that `layout.py` neither places nor deletes.
  - `02-wire.py` refuses non-axis segments, zero-length segments, and a segment ending inside another segment.
  - `net_strokes.py` refuses a net drawn in two strokes.
  - `pins.py` cross-checks akcli's pin points against `lib_symbols`.
- **The fresh-export assertion is real.** It does not rest on equality with the fixture alone. Clean `componentIdentity` and `netMembership` are asserted separately, and the moved-pin control runs on both sides.
- **RECORD.md records a caught electrical fault and its fix.** The U2 in-line wiring produced six `netMembership` entries and was not kept. RECORD also gives a control for the `sym-lib-table`: an empty table produces one more `h7-platform` warning.
- **`RECORD.md` is limited to measures and observations.** It states that the arrangement and the hidden Values are unreviewed agent choices.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. **`RECORD.md` does not say what the USBLC6-2SC6 mismatch is** ("Measurements" row 3; "Left as it is" bullet 1). It says only that the embedded copy "differs from the installed copy".
   - **What was measured:** the pins are identical to the installed symbol's parent, and the difference is that copperhead flattened the `extends` symbol with the parent `USBLC6-2P6`'s properties: Value, `Footprint SOT-666`, Description and `ki_fp_filters "SOT?666*"` (sheet lines 2546-2604).
   - **Why it matters:** a reader cannot tell from RECORD that this warning is non-electrical without re-deriving it. The SOT-666 footprint filter will also matter when a footprint is assigned for the THT or SMD board.
   - **Fix:** state the measurement in `RECORD.md`, and put a comment on the copperhead behaviour where it will be acted on.
2. **The hidden Values are a hand-typed list, not the rule the docstring states.**
   - **Where:** `repair/03-text-edits.py` `FIELDS` ("hide" entries). The docstring says "A Value that is only the KiCad symbol's own name … is hidden", but the code hides whatever `FIELDS` marks, and nothing checks the rule.
   - **What exists already:** the repository has `valueIsSymbolPartName` (`lib/kicad/value-notation.ts`) for exactly this distinction.
   - **Why it matters little:** the list is correct today (checked under Risk 4), and the replay's `intent.json` comparison stops before a model change could make it wrong.
   - **Fix:** a one-line assertion that each "hide" entry's Value equals its lib id's part name.
3. **`REPLAY.md` says "with a new or empty work directory outside the repository" without saying that step 1 still writes inside the repository.** `make draw` writes and overwrites `build/draw/h7-carrier*` in the repository (gitignored). Add one sentence so a reviewer asked to replay read-only knows it is not confined.
4. **`drafted/README.md`'s layout block still says `sym-lib-table` is "empty".** The implementer flagged this and left it. This page's table names the project library, so the README now disagrees with a committed page. Correct it or qualify it.
5. **J7's `Footprint` property is the only part property left visible, and its value is the empty string**, at sheet line 4371. A scratch-script check found every other non-Reference, non-Value property hidden on parts, apart from R1 and R2's `Datasheet "~"`. This is stated as a measure only. It is not a connectivity matter.

### Assessment

**Task quality:** Approved

**Reasoning:**
- **Electrical binding.** The page's fresh `kicad-cli` export agrees with the model by net-membership partition, not by name. The fixture and the fresh export are both asserted, with positive controls. The ERC has 0 errors, and its 36 warnings are library configuration: one kind of library-symbol mismatch whose pins match the parent's exactly.
- **Record and replay.** The record and the replay match the committed sha256. The open points are record precision and a hand-typed list, and none of them affects whether the page is bound to the model.
