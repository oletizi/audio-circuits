Task 2 report: the request generator, from the model only

Status: DONE_WITH_CONCERNS
Commit: fff418f "SchGen trial Task 2: request generator from the board model only" (pushed to ai-schgen)

What was implemented

- tools/schgen-drawing-trial/request.ts
  - TrialRequest interface, exactly as the brief gives it.
  - buildRequest(board): reads modelForSheet(board) only (network, page designators, per-component pin numbers), plus valueFor and intendedLibId. Opens no .kicad_sch. Refuses a board that is not in TRIAL_BOARDS.
  - Text format: PARTS: / NETS: / LABELS:, one item per line, nothing else, trailing newline. PARTS lines are in network order. NETS lines are sorted by net name by code unit, so the order does not depend on locale. Pins within a net are sorted too.
  - The model net "0" is written "GND". It refuses if the model already has a net named GND.
  - LABELS are the network's ports. The ground port ("0") is left out, because ground goes in as power:GND. nc pins are on no net.
  - Every field is checked to hold no whitespace and no stray colon. It refuses rather than escaping.
  - symbols: the sorted unique set of intended library:symbol ids, plus power:GND.
  - parseRequest(text): a strict parser. It refuses sections out of order, malformed lines, repeated designators, nets or labels, a pin on an undeclared part or on two nets, and a label whose net is not listed.
  - CLI: `bun tools/schgen-drawing-trial/request.ts BOARD OUT_DIR` writes request.json (pretty JSON + newline) and request.txt.
- tools/schgen-drawing-trial/boards.ts
  - TRIAL_BOARDS: the five approved Pultec boards. transistor-preamp-staged is excluded.
  - TRIAL_CIRCUIT and assertTrialBoard.
  - approvedDigestOf(sheetPath): hashes the file and refuses unless verdicts.md contains the digest as a backticked token. It takes a path so a perturbed copy can drive the refusal.
  - approvedSheetDigest(board): the gate on the committed page.
- lib/kicad/sheet-agreement.ts
  - intendedSymbol is now exported.
  - New exported intendedLibId returns the full library:symbol, by the same rule and with the same refusal. intendedSymbol = symbolEntry(intendedLibId(c)), which is the same behaviour as before.
- tests/schgen-trial/request.test.ts: 33 tests. Per board:
  - round trip;
  - agreement with the model;
  - control;
  - no placement leak;
  - symbols;
  - approval check.
  Plus: the board list, the refusal of transistor-preamp-staged, and the parser's refusals.

SchGen's request convention, at pinned commit 0707520c

- sch_examples (in both dataset_construction/ and schematic_generation/) holds IMU programs, the IMU sheet and an ESP32 program. It holds no request text.
- Training requests are written by GPT from each schematic's netlist and image, under make_dataset.py:77's q_detailed instruction. That instruction's own example reads: "...3 capacitors with C1: 1.0 uF, ... U2 pin 1 is connected to the 1.8V rail, C1 pin 1, C2 pin 1, C3 pin 1, U2 pin 3 is connected to label INT, ...". It asks for the request to sound like a human customer.
- The inference request (generate.py run_raw_test) is free text from a person.
- I did not download the Hugging Face dataset.
- Followed:
  - parts are named by designator with their value;
  - pins are named by symbol pin NUMBER, as in "U2 pin 1" and what connect_pins/get_pin_location take;
  - a net is stated as the full set of pins it joins;
  - ports are labels joined to a net;
  - ground is a power rail, not a label.
- Departed, and recorded in request.ts's module comment:
  - fixed line format instead of prose ("U2.1", not "U2 pin 1");
  - no function description;
  - library:symbol named on each part line. Theirs names symbols only in the symbol context that follows.
  This request may be off their training distribution. The spec accepts that cost.

Departures from the brief

1. The "matches the model" test uses compareSheetToModel, the comparator the drafted pages are held to, not toImportedNetlist. toImportedNetlist cannot express these boards, for two reasons:
   - Its PinNumbers are keyed by kind. pultec-low-boost's R2 is a=2/b=1 while every other resistor is a=1.
   - Its off-board pad orders must number every pin 1..n. SW_MID has common on 13, and pin 12 is not a model pin. The test hit exactly this refusal on its first run.
   The generator builds the nets directly from modelForSheet. The test checks them through the comparator, so the generator is not checked against itself.
   - The comparator compares which pins share a net and ignores net names, so "0" against "GND" is no difference. That answers the spec's request to confirm how the comparator treats names.
   - The test adds singleton nets for symbol pins left off any net, the way kicad-cli exports them.
   - The test asserts exactly the known disagreement the approved pages also carry: SELECTOR_PIN_DISAGREEMENT, the MP mount lug on SW_Rotary_1x6_MP. Mid's expected list is empty.
2. I added intendedLibId beside the intendedSymbol export, because intendedSymbol returns only the entry name ("R") and the request needs "Device:R".
3. approvedSheetDigest's refusal is tested through approvedDigestOf(path), because approvedSheetDigest(board) has no path to perturb.

TDD evidence

- RED: `bun test tests/schgen-trial/request.test.ts` failed with "error: Cannot find module '../../tools/schgen-drawing-trial/boards.ts'" (0 pass, 1 fail, 1 error).
- Intermediate run, on the first implementation: 3 failures on pultec-mid. toImportedNetlist refused SW_MID's pad order ("names "12", which is not a pin of that component"). That led to departure 1.
- Next run: 8 failures. The test was expecting zero disagreements and got the MP mount-lug line on the four 1x6_MP boards. That line is documented and expected, the same one the approved pages carry, and the test now asserts it exactly.
- GREEN:
  - `bun test tests/schgen-trial/request.test.ts`: 33 pass, 0 fail, 104 expect() calls.
  - `bun run typecheck`: clean. It needed `bun install --frozen-lockfile` first, because this worktree had no node_modules; tsc was not found.
  - `bun test tests/circuits/drafted-kicad-round-trip.test.ts tests/kicad/sheet-agreement-tables.test.ts`: 17 pass, 0 fail.
  - The five tests/circuits/pultec-*.test.ts per-board guards: 35 pass, 0 fail.
- CLI determinism: I ran the CLI twice per board into separate directories, and `diff -r` was empty. Line counts of request.txt: hi-boost 54, hi-cut 42, low-boost 40, low-cut 41, mid 74. Script: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-ai-schgen/ad182292-c732-4a92-a7fa-a4b3e62cc252/scratchpad/cli-determinism.sh

Files changed

- lib/kicad/sheet-agreement.ts (modified)
- tools/schgen-drawing-trial/request.ts (new)
- tools/schgen-drawing-trial/boards.ts (new)
- tests/schgen-trial/request.test.ts (new)

Self-review

- No any, no as-casts, no ts-ignore. Imports are relative with .ts. No fallbacks: every missing input throws with a reason.
- request.ts imports nothing that reads a sheet. boards.ts hashes bytes only.
- The leak test reads the approved sheet's (at/xy/start/end/center/mid x y) pairs in three spellings, plus every UUID. It asserts both lists are non-empty, so it cannot pass vacuously. It also forbids "rotation", "mirror" and "(at " in the text.
- The symbol test resolves every symbol, and every designator.pin in NETS, against the installed KiCad library through tests/kicad/symbol-library-disk.ts. That covers CLAUDE.md's "verify names against the thing itself".

Concerns

1. The CLI does not call approvedSheetDigest. I kept the gate out of request.ts so the generator touches no sheet at all, which is the constraint "the request generator opens no .kicad_sch". Task 4's runner must call approvedSheetDigest(board) before it uses a request.
2. The request includes the "SI" stand-in parts (SI1..SI9). These are other boards' sections, modelled on each board so its junction nets close. They are in the model and on the approved pages, so they are included. The owner may want to know SchGen is asked to draw them.
3. Internal nets go to SchGen under the model's names (j10_p1, si_hi_cut_j4_p2, mid_sel_200hz, ...). These come from the model, not the page. The page's local labels have other names (hcut_t1, sel1).
4. lib/kicad/sheet-agreement.ts is now 492 lines, near the 500-line house limit. It was 480 before this task.
5. SW1's value on the 1x6 boards is "SW_Rotary_1x6_MP", which is what valueFor gives. The approved pages say "6-way selector" (SELECTOR_VALUE_DISAGREEMENT). The request follows the model.

Fix round 1

Status: DONE
Commit: d0d79ff "SchGen trial Task 2 fix round 1: rule pin numbers, symbol token" (pushed to ai-schgen)

Important 1: page-declared pin swap leaked into the request
- What changed in request.ts:
  - It now numbers pins with `requestPinNumbers(component)`. That is exported, and it is `pinNumbersFor`, the rule in tests/circuits/sheet-model.ts.
  - It no longer uses modelForSheet's `pinNumbers`, which overlays DECLARED_PIN_NUMBERS.
  - modelForSheet is still used for the network and the designators.
  - The module comment records why.
- What changed in the tests:
  - `matches the model`, `control` and the round-trip pin set now compare against the same rule-derived map (`rulePinNumbers` in the test, built from requestPinNumbers).
  - compareSheetToModel itself is unchanged.
- New test: "pultec-low-boost: R1.1 is on out".
  - RED, before the fix: it failed with `Expected to contain: "R1.1"`, `Received: [ "J1.4", "R1.2", "SI7.2" ]`.
  - GREEN, after the fix: `out: J1.4 R1.1 SI7.2`, and `lo_boost_in` now carries R1.2.
- I checked all five boards by comparing modelForSheet's pin map against pinNumbersFor for every component. The script is at /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-ai-schgen/ad182292-c732-4a92-a7fa-a4b3e62cc252/scratchpad/declared-check.ts.
  - pultec-hi-boost: no difference. The request is unchanged; request.txt sha256 is the same as round 0, 1e34e7a1....
  - pultec-hi-cut: no difference. Unchanged (a1523887...).
  - pultec-low-boost: R2 differs (page a=2/b=1, rule a=1/b=2). The request changed (9e8a3934... -> e8dabe9e...).
  - pultec-low-cut: no difference. Unchanged (e9b73173...).
  - pultec-mid: no difference. Unchanged (56463893...).
  DECLARED_PIN_NUMBERS has only the one entry, "pultec-low-boost": { R2 }.
- pinNumbersFor numbers every part on all five boards, including SW_MID (common on 13, pin 12 a declared no-connect by the rotary rule), so NEEDS_CONTEXT did not apply.

Minor 5: symbol with no colon
- New exported `symbolToken(text)` refuses anything that is not exactly `library:symbol` (one colon, no whitespace) at the point where the symbol is created.
- `token()` no longer has a symbol special case; it refuses any colon.
- New test: `symbolToken("R")` and `symbolToken("Device:R:x")` throw, and `symbolToken("Device:R")` passes. RED was the missing export, which made the whole test file fail to load.

Verification
- `bun test tests/schgen-trial/request.test.ts`: 35 pass, 0 fail.
- `bun run typecheck`: clean.
- drafted-kicad-round-trip, sheet-agreement-tables and the five pultec-*.test.ts guards: 52 pass, 0 fail.
- CLI twice per board: `diff -r` is identical.

Minors 1-4: left as they are, per the coordinator's ruling.

Concern
- The `matches the model` test now holds the request to the same rule map the generator uses. compareSheetToModel and its net building are still independent of the generator; the pin-number map they share is the one the reviewer asked for.
