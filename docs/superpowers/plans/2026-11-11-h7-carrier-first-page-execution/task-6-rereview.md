Task 6 re-review, fix round 1 (df85249..e139c99)

### Finding Verdicts

- **"A STATIC TABLE..." doc comment sits directly above `const BOARDS`** - ADDRESSED. tests/circuits/sheet-model.ts:93-105 is the doc comment (line 96 carries "A STATIC TABLE, VERIFIED AGAINST..."), and line 106 is `const BOARDS`. Nothing sits between them. The stray OwnMappingBoard/everyPin/pinNumbersFromTable block that separated them in df85249 is gone.

- **`declaredBoard` refusal no longer claims every board is committed under `drafted/pultec/`** - ADDRESSED. tests/circuits/sheet-model.ts:135-136 now reads "The boards declared are [...]". The only remaining `drafted/pultec/` occurrence in that file is the module header at line 14, which describes the Pultec-derived subject and is not part of the refusal.

- **`OwnMappingBoard`, `everyPin`, `pinNumbersFromTable` moved to their own file; test no longer duplicates `everyPin` as `pinsOf`** - ADDRESSED. tests/circuits/own-mapping-board.ts exports all three (lines 9, 22, 32). sheet-model.ts no longer defines them (grep finds no `function everyPin`, `function pinNumbersFromTable` or `interface OwnMappingBoard` in tests/circuits/*.ts other than own-mapping-board.ts), and imports `type OwnMappingBoard, pinNumbersFromTable` at line 63. sheet-model.test.ts imports `everyPin` from ./own-mapping-board.ts (line 4) and has no `pinsOf`. The `pinsOf` in tests/circuits/h7-carrier.test.ts:26 is a different function over a different input (library symbols) and is not a duplicate of this one.
  - `pinNumberFor` is no longer imported by sheet-model.ts and has no remaining use there, so the removed import leaves nothing dangling. The new file's `OwnMappingBoard` no longer extends `DraftedBoard`; it restates board, module, exportName and build, and the manifest check in declaredBoard reads only those fields, so it still type-checks as the report says.

- **Carrier pin-number test has literal spot-checks for `u_usbsw` pin "7" and `j_usb` pin "SH", numbers taken from the symbols** - ADDRESSED. tests/circuits/sheet-model.test.ts:92-96 asserts `get("u_usbsw")?.get("7")` is "7" and `get("j_usb")?.get("SH")` is "SH". Checked against the symbols on disk:
  - circuits/h7-platform/h7-platform.kicad_sym: the pin with `(name "D-")` has `(number "7")` (line 133 of the `sed -n 86,...` window, i.e. file line ~218). TS3USB221RSER pin 7 is D-, matching the description string and carrier-board.ts:154 (`"7": "USB_DM"`).
  - /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Connector.kicad_sym, symbol USB_C_Receptacle_USB2.0_16P: the pin with `(name "SHIELD")` has `(number "SH")`.
  - u_usbsw is kind `ic`, which has no PIN_NUMBERS entry, so the lookup is the identity path (from-network.ts:64). The literal therefore checks that the canonical name "7" is the symbol's physical number "7", which is the claim the test needs. It is not a tautology against the table.
  - The literal check does not depend on PIN_NUMBERS, so a wrong table entry for either would not hide behind the loop above it. This is what the finding asked for.

### New Breakage in the Fix Diff

None. The fix is a move, a comment placement and a message rewrite, plus two assertions that pass per the report. No new imports point at missing modules (own-mapping-board.ts imports ../../lib/kicad/from-network.ts and ../../lib/model/types.ts, both used). Test-run claims in the report (sheet-model, footprint-comparisons, round-trip 16 pass; tests/circuits 229 pass; typecheck clean) were not re-run, per the scoped instructions, and the code reading raises no doubt they would fail.

- Minor: the new literal assertions use `?.get(...)` and `toBe`, so a missing entry yields `undefined` and fails loudly. No issue.

### Out-of-Scope Observations

- tests/circuits/sheet-model.ts is 532 lines, above the 300-500 line guideline in the user's CLAUDE.md. The report discloses this as pre-existing and it shrank from 566, so it is not a regression from this fix.
- tests/circuits/sheet-model.ts:14 still names `drafted/pultec/` in the file header. This is accurate for the Pultec subject of that file and was not in the findings, so I did not treat it as open.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.
Open findings: none.
