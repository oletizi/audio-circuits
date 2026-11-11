Finding Verdicts

- **A. Fuse 0.75 A rating drawn as its value** — ADDRESSED. `parts.ts` FUSE now carries `value: "0.75A hold"` (built from FUSE_HOLD_CURRENT_A). `valueFor` in lib/kicad/value-notation.ts uses `part.value`. No new kind was added. The test in tests/circuits/h7-carrier.test.ts ("the fuse's hold rating is its value on the drawing") reads `drawingIntent()` and checks that the fuse's `value` contains `0.75A`.
- **B. draw.ts passes the project symbol library** — ADDRESSED. `projectSymbolLibrariesFor` (tools/draught/draw-intent.ts) reads the `PROJECT_SYMBOL_LIBRARY` export from the board's circuit module, so no path is hard-coded. tools/cli/draw.ts passes the result to `draftWithCopperhead`, which already accepts `projectSymbolLibraries` (draw-draft.ts:313, 325). A module that exports none returns `[]`, which leaves the draft as before. Tests in tests/draught/draw-intent.test.ts cover the carrier (gives the library), the staged preamp (gives `[]`) and a bad path (refuses). The carrier re-exports the constant from carrier-board.ts.
- **C. Shield network and C_VBUS as controller rulings** — ADDRESSED. decisions.md CR-CARRIER-USB-C and CR-CARRIER-ESD now say the shield network and C_VBUS are part of the ruling, "the owner may strike it". Both entries carry the "Controller ruling (the owner may override)" label, and the "added by the implementer" wording is gone.
- **D1. :263 becomes :267** — ADDRESSED. The change is in carrier-board.ts (both cites) and in CR-CARRIER-USB-C. I confirmed line 267 of processor-and-memory.md holds the 5.1 text.
- **D2. 84.0 mW nominal and 84.8 mW at -1 %** — ADDRESSED. I recomputed 3.513^2/147 = 83.95 mW and 3.513^2/(147*0.99) = 84.80 mW.
- **D3. `isResistor` instead of `Reflect.get`** — ADDRESSED. `isResistor` is now exported from tools/bom/rail-bound.ts and used in rail-budget.ts `ohms()`.
- **D4. USBLC6 pin names cite USB-04** — ADDRESSED. The parts.ts comment cites schematic-checklist.md:213, and a new test reads the USB-04 line and checks it against the table.
- **D5. `far[0] ?? ""` replaced by an explicit refusal** — ADDRESSED. rail-budget.ts now throws when `farNet === undefined` (or `far.length !== 1`). The test's `STATES[0] ?? {...}` fallback was also removed.

New Breakage in the Fix Diff

None Critical or Important. Named-risk check on the shared change (`part.value`):
- `valueFor` checks `part.value` before the kind branches. If the component carries any top-level numeric parameter (`hasNumericQuantity`), it throws instead of letting the stated value override the electrical quantity. That removes the silent-override path for resistors, capacitors, inductors, photoresistors and potentiometers. A test covers the resistor case ("derived from its parameters").
- An empty or whitespace `value` throws.
- No existing part sets `value`: the only addition is the fuse, and the report shows tests/kicad, tests/model, tests/circuits and tests/perfboard (719), tests/draught and tests/bom (266), and typecheck all passing. I did not re-run them.
- Minor: a kind with a non-numeric structural quantity (for example a pot `taper`) is not guarded by `hasNumericQuantity`. valueFor's own comment already discloses this limit, and no current part triggers it.
- Minor: `circuits/h7-platform/carrier-board.ts` imports `PROJECT_SYMBOL_LIBRARY` by relative path from `./parts.ts`. That is consistent with the file's existing imports.

Out-of-Scope Observations

None.

Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.
