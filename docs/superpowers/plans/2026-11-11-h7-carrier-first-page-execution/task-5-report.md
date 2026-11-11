Task 5 report: the carrier model, without loopback. Status: DONE_WITH_CONCERNS.

The first pass stopped BLOCKED on the TS3USB221 symbol (section 1). The controller ruled on six
points, and the task was then carried through.

Commits, all pushed to feature/digital-pedal-platform:
- 9b22937: project symbol TS3USB221RSER and the copperhead spike (the spike on its own)
- f8a5608: carrier model, rail budget, parts, drawing inputs, boards/h7-carrier, tests
- f14fdcc: decisions.md (ten CR-CARRIER rulings) and open-items.md CARRIER-LOOPBACK-FORM

## 1. TS3USB221 symbol comparison (the original blocker)

Sources:
- TS3USB221: TI SCDS220M (rev. Nov 2024), p. 3, Table 4-1, RSE package.
- TS3USB30E: TI SCDS255G (rev. Oct 2024), p. 3, Table 4-1, UQFN and VSSOP columns.
- TS3USB30: TI SCDS237F p. 3. Its RSW pinout equals the TS3USB30E's UQFN column.
- The symbols were read from the installed Interface_USB.kicad_sym.

| Pin | TS3USB221 RSE | TS3USB30ERSWR symbol | TS3USB30EDGSR symbol |
|---|---|---|---|
| 1 | 1D+ | D1+ (match) | S |
| 2 | 1D- | D2+ | D1+ |
| 3 | 2D+ | D+ | D2+ |
| 4 | 2D- | GND | D+ |
| 5 | GND | D- | GND (match) |
| 6 | OE (active low) | D2- | D- |
| 7 | D- | D1- | D2- |
| 8 | D+ | ~OE | D1- |
| 9 | S | VCC | ~OE |
| 10 | VCC | S | VCC (match) |

I scanned all 320 installed single-unit 10-pin symbols and found none that matches. A positive
control run of the same scanner found TS3USB30ERSWR.

## 2. The spike (controller ruling 1): copperhead draws a project symbol

- `circuits/h7-platform/h7-platform.kicad_sym` holds the symbol `TS3USB221RSER`, transcribed pin
  for pin from SCDS220M Table 4-1, with the citation in its Description and Source properties.
- Route. `tools/draught/draw-draft.ts` `draftWithCopperhead` gains an optional
  `projectSymbolLibraries`. Each library is copied into the draft directory and named in a project
  `sym-lib-table` as `${KIPRJMOD}/<file>`.
  - copperhead reads a library that the project table names in place, ahead of its cache
    (`draughting/copperhead/src/kicad/draft/symsource.ts` `resolve`).
  - It keeps that row when it rewrites the table (`draft.ts` `draftSchematic`).
  - Verified: after the draft, the table holds the project row plus copperhead's Device and
    copperhead_power rows.
- Test: `tests/circuits/h7-project-symbol.test.ts`, 2 tests, using the real copperhead and the
  real kicad-cli.
  - It drafts an intent with U1 plus R1..R10, where Rn.1 is on net Nn with U1 pin n.
  - It exports the netlist and asserts three things for every pin n: U1.n shares its net with
    Rn.1 only, the pin function equals the datasheet name, and there are exactly 10 U1 pins.
  - kicad-cli writes the pin function as `<name>_<number>`, and the test strips the suffix.
- Mutation. Swapping the numbers of pins 7 and 8 in the library failed both tests ("Expected D-,
  Received D+" in the export test). The file was restored and the byte comparison confirmed it.
- Draught tests after the draw-draft change: 66 pass, 0 fail.

Port verifier amendment (controller ruling 2):
- `nocode` allows `.kicad_sym` under `circuits/h7-platform/` only. The PASS line reads "2 .ts files
  and 1 .kicad_sym files" at the spike commit; there are now 6 `.ts` files.
- `nocode-amendment-controls.sh` gains a fourth case: `docs/h7-platform/probe.kicad_sym` FAILs.
  All 4 cases behave as stated.
- The execution README records the extension.

## 3. RED and GREEN

- RED: `bun test tests/circuits/h7-carrier.test.ts` gave "Cannot find module
  '../../circuits/h7-platform/carrier-board.ts'", 0 pass, 1 fail, 1 error.
- GREEN: 11 pass, 0 fail, 108 expect() calls.
- `bun test` on h7-carrier, h7-project-symbol and h7-interface-check together: 25 pass, 0 fail.
- `bun run typecheck`: clean (after one fix, a parameters union that did not narrow).
- `make -C boards/h7-carrier check`: it prints the schematic NOTICE (pcb kind, no sch declared, so
  this test is the only check), then 11 pass, 0 fail.
- Port verifier: 17 lines start with PASS, none with FAIL.
- Full `bun test`: see the final section.

Tests in h7-carrier.test.ts are the brief's nine, plus two:
- "a dummy load is read from the network, not a constant": doubling r_dummy_vref_a's ohms in a
  copy of the network roughly halves its draw.
- "the project symbol library path is the committed one".

## 4. Fuse figure and citation (controller ruling 4)

- The largest documented VIN_MOD input current is 729 mA, the 1.5x peak down to VIN_MOD 7.32 V
  (`docs/h7-platform/power.md:246`). It exceeds the contract's `maxPeakCurrentMa` of 674 mA
  (`power.md:240`).
- The rating is 0.75 A hold, the next standard PTC hold current. No MPN is chosen.
- The fuse is kind `ic`, pins "1"/"2", symbol `Device:Fuse`. The rating lives in `parts.ts`
  `FUSE_HOLD_CURRENT_A` (concern 1).

## 5. Dummy resistors and the eight states

The dummy loads are 147 ohm on 3V3_D (1206) and 357 ohm on VREF_A (0805). Each is a 1 % resistor
to GND behind a 2-pin header of kind `connector` (`Conn_01x02`), and the `CarrierState` flag
models the shunt. Figures are printed from `railDraw` on the model:

| dummy3v3d | dummyVrefA | usbEnabled | 3V3_D mA | VREF_A mA |
|---|---|---|---|---|
| false | false | false | 0.071 | 0.000 |
| false | false | true | 0.426 | 0.000 |
| false | true | false | 0.071 | 9.940 |
| false | true | true | 0.426 | 9.940 |
| true | false | false | 24.210 | 0.000 |
| true | false | true | 24.565 | 0.000 |
| true | true | false | 24.210 | 9.940 |
| true | true | true | 24.565 | 9.940 |

The E96 neighbours in the worst state:
- 3V3_D: 140 ohm gives 25.772 mA, 143 ohm gives 25.240 mA, 147 ohm gives 24.565 mA.
- VREF_A: 348 ohm gives 10.197 mA, 357 ohm gives 9.940 mA.

The 0.071 mA in every 3V3_D row is the switch: I_CC 30 uA + Delta-I_CC 2 x 20 uA + I_IN 1 uA
(SCDS220M p. 5, section 5.5). The 0.355 mA step is R_USBEN, 3.513 / 9900.

## 6. What the model holds (30 components)

- **Sockets and breakouts.** `j_mod_a` and `j_mod_b` are the Mill-Max sockets (parts.md:158).
  `brk_a` and `brk_b` are 1x20 headers. All four list pads "1".."20" on the contract nets, with
  RESERVED_16..19 shared by the socket pad and the breakout pad only. GND is on contract pins 20
  and 40, so AGND and DGND are joined (architecture.md section 8, item 10).
- **Test points.** `tp_*`: 8 test points.
- **Power entry and dummy loads.** `j_vin`, `f_vin`, `j_dummy_3v3d` + `r_dummy_3v3d`, and
  `j_dummy_vref_a` + `r_dummy_vref_a`.
- **USB path.**
  - `u_usbsw` is the TS3USB221RSER. Pins 7/8 go to USB_DM/USB_DP, contract pins 36/37. OE goes to
    USB_EN_N, contract pin 11. S goes to GND, and 2D+/2D- are nc.
  - `r_usben` is 10.0k to 3V3_D. `c_usbsw` is 100n, cited to SCDS220M p. 15 section 8.3.
  - `u_esd` is the USBLC6-2SC6 wired per schematic-checklist.md USB-04, with `c_vbus` 100n.
  - `j_usb` is the USB-C receptacle. `r_cc1` and `r_cc2` are 5.1k.
  - `r_shld` 1M and `c_shld` 4.7n form the shield network (USB-05).
  - `r_vbus_top` 12.0k and `r_vbus_bot` 20.0k form the VBUS divider to pin 31.
- **Interface check.** `checkInterface(..., "carrier", ...)` gives no mismatches.

Files:
- `circuits/h7-platform/parts.ts` (106 lines)
- `carrier-board.ts` (about 185 lines)
- `carrier-board.drawing.ts` (21 lines)
- `rail-budget.ts` (151 lines)
- `boards/h7-carrier/Makefile` and `boards/h7-carrier/perfboard.json`
- `tests/circuits/h7-carrier.test.ts`

No split was needed.

## 7. Rulings recorded in decisions.md

Each is labelled "Controller ruling (the owner may override)". The heading form is
`### CR-CARRIER-<topic>`, and the anchor table has a new row for it.
- CR-CARRIER-BREAKOUT
- CR-CARRIER-TEST-POINTS
- CR-CARRIER-USB-C (receptacle, CC 5.1 kOhm, and the shield network)
- CR-CARRIER-ESD (USBLC6-2SC6 per USB-04, with C_VBUS)
- CR-CARRIER-VBUS-SENSE
- CR-CARRIER-USBSW-SELECT (S to GND, port 2 nc, SCDS220M Table 7-1)
- CR-CARRIER-USBSW-SYMBOL (C4 project symbol, the spike, the verifier extension)
- CR-CARRIER-RAIL-LOADS (plan ruling P1)
- CR-CARRIER-DUMMY-LOADS (the aggregate rule, the eight states, the I_CC citation, replaces 143 ohm
  after the plan review)
- CR-CARRIER-VIN (input header, 0.75 A fuse, kind `ic`, no MPN)

Not recorded in decisions.md, because they are code shape and not design: DESIGNATORS as a
Record (ruling 5), and plan ruling P2. `open-items.md` CARRIER-LOOPBACK-FORM now says cut one is
modelled and drawn without the loopback.

## 8. Concerns

1. **The fuse's 0.75 A does not reach the drawing.** The fuse is kind `ic` with no MPN, so
   `valueFor` writes its value as "Fuse". A numeric parameter on an `ic` would make `valueFor`
   refuse. The rating is in `parts.ts` and in CR-CARRIER-VIN only. Task 7's page will show "Fuse"
   unless a fuse kind or a value override is added.
2. **Two parts were added beyond the controller's text, under the brief's "mirror the pedal"
   reason.** Both are flagged in their decisions entries as implementer additions the controller
   may strike.
   - The USB-C shield network: R_SHLD 1M in parallel with C_SHLD 4.7n (schematic-checklist.md
     USB-05). The alternative was leaving the shell unconnected.
   - C_VBUS 100 nF at the USBLC6-2 (USB-04).
3. **The USBLC6-2SC6 pin names are not independently checked.** ST's datasheet could not be
   fetched (st.com timed out twice). Its `DATASHEET_PIN_NAMES` entry is read from the stock symbol,
   which is the part's own (C4). That is stated in `parts.ts`.
4. **`RAIL_LOADS` entries take `(state, network)`, not `(state)` as the brief wrote.** The
   pull-up and the dummy currents must read their resistor from the network, and a static table
   cannot close over it.
5. **`draftWithCopperhead` changed (tools/draught/draw-draft.ts).** It gained the optional
   `projectSymbolLibraries`. `tools/cli/draw.ts` does not pass it yet. Task 7's draw of this board
   must pass `PROJECT_SYMBOL_LIBRARY` (noted in `carrier-board.drawing.ts`).
6. **No footprints are set on any carrier part.** No document names them and a schematic needs
   none. Task 6's `footprintComparisons` will see none.
7. **Value spellings.** The values are given as "10.0k", "12.0k", "20.0k", "5.1k", "1M", "4.7n" and
   "100n". `resistanceText` normalises them on lowering.

## 9. Full suite

The full `bun test` run at f14fdcc gave 2893 pass and 2 fail across 2895 tests in 276 files.

- **Caused by this task, now fixed.** `tests/kicad/symbol-names.test.ts`, "every symbol name swept
  out of the source resolves in an installed KiCad library". The test looked up
  `h7-platform:TS3USB221RSER` in the installed KiCad only. Fixed in f42b3d3: a project library now
  resolves against its committed file, and only for names that file defines. A negative case is
  tested. The file now passes 10 of 10.
- **Pre-existing, not this task's.** `tests/stripboard/temp-scratch.test.ts`, "every mkdtemp site
  under tests/ either removes its own directory or registers it". Its only offender is
  `tests/schgen-trial/comparator-controls.test.ts`, which this task did not touch (last changed in
  00df6db). The new `h7-project-symbol` test removes its temporary directory in a `finally` block
  and is not listed.

Commits, final: 9b22937 (spike), f8a5608 (model), f14fdcc (docs), f42b3d3 (sweep fix).

`make check` at the repository root was not run. The known pt2399-core failure was therefore not
observed in this task.

## Fix round (review rulings A-D), commit b039fae, pushed

- A. The fuse rating is on the page. `PartSpec` gains an optional `value`, and `valueFor` uses it for a part with no electrical quantity, ahead of `mpn` and the symbol name. It refuses `value` on a kind whose value comes from its parameters, and two value-notation tests cover both behaviours. `FUSE` states `0.75A hold`. The test "the fuse's hold rating is its value on the drawing" checks the fuse in `drawingIntent()`. No new component kind was added.
- B. `tools/cli/draw.ts` now passes the project library to the draft. A new function, `projectSymbolLibrariesFor(declaration)` in `tools/draught/draw-intent.ts`, reads `PROJECT_SYMBOL_LIBRARY` from the board's circuit module, which `carrier-board.ts` now re-exports from `parts.ts`. It refuses an export that is not an absolute path to an existing `.kicad_sym`. A module that exports none returns `[]`, and `draftWithCopperhead` then writes no table, as before. Tests in `tests/draught/draw-intent.test.ts`: the carrier gives the h7-platform library, the staged preamp gives `[]`, and a relative path refuses. No drawing loop was run.
- C. CR-CARRIER-USB-C and CR-CARRIER-ESD now state the shield network and C_VBUS as part of the controller ruling, mirroring the pedal's USB-05 and USB-04, which the owner may strike.
- D1. `processor-and-memory.md:263` is now `:267` in `carrier-board.ts` (both cites) and in CR-CARRIER-USB-C. I verified that line 267 is the module USB socket text with the 5.1 kOhm Rd.
- D2. The CR-CARRIER-DUMMY-LOADS dissipation now reads 84.0 mW nominal and 84.8 mW at -1 %.
- D3. `rail-budget.ts` `ohms()` narrows with `isResistor`, which is now exported from `tools/bom/rail-bound.ts`. `Reflect.get` is gone.
- D4. The USBLC6-2SC6 pin names now cite `schematic-checklist.md:213` USB-04. The test "the USBLC6-2SC6 pin names agree with schematic-checklist.md USB-04" reads that line and checks it states I/O1 on pins 1 and 6, I/O2 on pins 3 and 4, pin 2 GND and pin 5 to VBUS. It also checks the table.
- D5. In `dummyResistorBehind`, `far[0] ?? ""` is now an explicit refusal when the value is `undefined`. The `STATES[0] ?? {...}` in the test is now a literal state.

Commands and output (script `fix-verify.sh` in the scratchpad):

```
=== bun test h7 carrier, interface-check, project-symbol, draw-intent, value-notation, symbol-names
 73 pass
 0 fail
 273 expect() calls
Ran 73 tests across 6 files. [2.11s]
=== bun test tests/draught/ tests/bom/
 266 pass
 0 fail
Ran 266 tests across 24 files. [29.04s]
=== bun run typecheck
$ tsc --noEmit
=== make -C boards/h7-carrier check
NOTICE: /Users/orion/work/audio-circuits-work/digital-pedal-platform/boards/h7-carrier/perfboard.json declares no "sch"/"netlist" pair.
 13 pass
 0 fail
Ran 13 tests across 1 file. [206.00ms]
=== verify.sh
PASS lines: 17  FAIL lines: 0
PASS nocode (phase-2 amendment: 6 .ts files and 1 .kicad_sym files under circuits/h7-platform/ held by typecheck and tests)
```

Also ran `bun test tests/kicad tests/model tests/circuits tests/perfboard`: 719 pass, 0 fail, across 64 files.
