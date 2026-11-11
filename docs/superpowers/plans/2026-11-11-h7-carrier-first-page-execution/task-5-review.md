### Spec Compliance

- ✅ Spec compliant, with the controller's amendments applied. Every file the brief lists has its hunk: `circuits/h7-platform/parts.ts`, `carrier-board.ts`, `carrier-board.drawing.ts`, `rail-budget.ts`, `boards/h7-carrier/Makefile` and `perfboard.json` (`kind: "pcb"`, `circuit`, `export`, with no `sch`/`netlist`/`vrt`), `tests/circuits/h7-carrier.test.ts`, `decisions.md` and `open-items.md`. All nine of the brief's named tests are present (h7-carrier.test.ts:1137-1231). Each of the controller's C4 amendments has its artifact: the project symbol (h7-platform.kicad_sym), the real-tool spike test (h7-project-symbol.test.ts:1291-1339), the `nocode` `.kicad_sym` extension with its fourth control case (verify.sh hunk; nocode-amendment-controls.sh:+1025), and the README paragraph (execution README:+998). The S pin goes to GND and 2D± are nc (carrier-board.ts u_usbsw). The fuse is kind `ic`, pins 1/2, `Device:Fuse`, 0.75 A, with no MPN. `DESIGNATORS` is a `Record`. The jumpers are `connector` + `Conn_01x02`. RAIL_LOADS covers the sockets, breakout, TPs and decoupling caps at 0 A with reasons, the switch at 30+2×20+1 µA, the pull-up gated on `usbEnabled` and the dummies gated on their flags. Every resistance is read through `ohms(component(...))`.
- Deviations, each disclosed and each justified by a ruling:
  - `RailLoad.amps` takes `(state, network)` (rail-budget.ts:707). The brief has `(state)`. The change is needed because ruling P1 says "read from the network".
  - Two parts were added beyond the controller's text: the shield network R_SHLD/C_SHLD and C_VBUS. Both are labelled implementer additions in CR-CARRIER-USB-C and CR-CARRIER-ESD. That is the right way to surface them, and the controller should either keep them or strike them explicitly.
  - The brief cites two lines wrongly, and the implementer corrected both. Neither is a defect:
    - The VREF_A limit was given as `power.md:227`, which is blank. The code cites `architecture.md:227`, which does state 10 mA.
    - The VBUS divider was given as `parts.md:177`, which is the C_VBUS-at-PA1 option. The code cites `architecture.md:257`, the 12.0 k / 20.0 k row.
- ⚠️ Cannot verify from the diff:
  - (a) The claimed 17 PASS lines from the port verifier, and the 4/4 control cases.
  - (b) That `tests/stripboard/temp-scratch.test.ts` fails on base `beb635c` as well, as the report says it does before this task.
  - (c) That `make -C boards/h7-carrier check` runs only the h7-carrier test.

  The controller should look at the run logs for these rather than re-run them.

### Checks run (named risks)

1. **The TS3USB221 symbol's pin table against the datasheet.** I read SCDS220M Table 4-1 in the scratchpad text, lines 132-150. It gives 1 1D+, 2 1D−, 3 2D+, 4 2D−, 5 GND, 6 OE, 7 D−, 8 D+, 9 S, 10 VCC, which matches h7-platform.kicad_sym:372-551 and `SCDS220M_RSE` (h7-project-symbol.test.ts:1275). Match.
2. **The switch's port selection and its wiring direction.** Table 7-1 (p. 12, lines 689-694) gives S=L, OE=L → D = 1D. On u_usbsw, pin 1 1D+ is USB_C_DP, 2 1D− is USB_C_DM, 7 D− is USB_DM and 8 D+ is USB_DP (carrier-board.ts u_usbsw). The polarity is consistent end to end: port 1 goes to ESD I/O1 for D+ and I/O2 for D−, then to receptacle A6/B6 for D+ and A7/B7 for D−. Correct.
3. **Rail-load figures against the datasheet.** I_CC is 30 µA max at VCC 3.6 V, VIN at VCC or GND, switch on or off. ΔI_CC is 20 µA, one input at 1.8 V, VCC 3.6 V. I_IN is ±1 µA. All three are on p. 5 (lines 235-253), and the citations and constants in rail-budget.ts:715-721 match. §8.3 is on p. 15 (lines 818-825), and the c_usbsw citation is correct.
4. **Net names on the switch and divider side that do not match the contract.** If one did, it would create a dangling net, and `checkInterface` would still pass, because it only inspects socket pads. I read `module-interface.json`: 11 USB_EN_N, 21 VREF_A, 31 USB_VBUS_SENSE, 32-35 CODEC_DOUT/DIN/LRCK/BCK, 36 USB_DM, 37 USB_DP, 38 3V3_D, 39 VIN_MOD, 20/40 GND. Every name the USB path, test points and power entry use matches exactly. 3V3_D and VREF_A are both on J_MOD_B, at pads 18 and 1, which is consistent with `RAIL_LOADS` naming only `j_mod_b`/`brk_b` as source and breakout.
5. **Document citations.** Read at the cited lines:
   - power.md:395: 25 mA. Correct.
   - power.md:378: 3.274-3.513 V. Correct.
   - power.md:246: 729 mA at 7.32 V. Correct.
   - power.md:240: 674 mA. Correct.
   - architecture.md:227: VREF_A, 10 mA. Correct.
   - architecture.md:257: 12.0 k / 20.0 k, 1 %. Correct.
   - architecture.md:258: TS3USB221RSER, 10.0 k to 3V3_D. Correct.
   - architecture.md:356: carrier contents. Correct.
   - parts.md:145, 146 and 158 (Mill-Max 801-43-020-10-012000). Correct.
   - schematic-checklist.md:213 USB-04 (pins 1↔6 I/O1, 3↔4 I/O2, 2 GND, 5 VBUS, C_VBUS 100 nF). Correct.
   - schematic-checklist.md:214 USB-05 (1 MΩ ∥ 4.7 nF). Correct.
   - **processor-and-memory.md:263 is blank.** The 5.1 kΩ Rd sentence is at line 267 (see Minor 1).
6. **Arithmetic in the rail budget and the decision text.** I recomputed it: 3.513 / (147 × 0.99) = 24.139 mA, the pull-up is 0.355 mA, and the total is 24.565 mA. 143 Ω gives 24.815 + 0.426 = 25.24 mA. 357 Ω gives 9.940 mA and 348 Ω gives 10.197 mA. All match. **The 1206 dissipation figure, "86.6 mW", does not:** 147 Ω gives 84.0 mW nominal and 84.8 mW at −1 % (see Minor 2).
7. **The project-library resolver in symbol-names.test.ts could match a sub-symbol.** The match string is `(symbol "TS3USB221RSER"`, with the closing quote, so `"TS3USB221RSER_0_1"` cannot satisfy it. The negative case is tested (symbol-names.test.ts:+1374-1377). Sound.
8. **Whether the model has a type predicate for resistor parameters.** It does: `ResistorComponent` exists (lib/model/types.ts:152), and the repo already narrows with an `isResistor` predicate (tools/bom/rail-bound.ts:57, tools/bom/needs.ts:30). See Minor 3.

### Strengths

- The C4 spike is a real proof, not a smoke test. It runs real copperhead and real kicad-cli, puts each pin on its own net with a unique partner, checks the exported pin function against an independently transcribed table, and includes a positive-control count. The implementer also mutated pins 7↔8 and saw both tests fail. Neither test skips when the tools are absent (h7-project-symbol.test.ts:1259-1260).
- `railDraw` refuses rather than omits (rail-budget.ts:808-823). That is exactly Review Focus 6's second clause, and "a rail load with no stated current refuses" tests it. The extra test "a dummy load is read from the network" (h7-carrier.test.ts:1202-1211) is the right guard against a constant creeping into the table.
- `dummyResistorBehind` (rail-budget.ts:755-769) refuses any dummy topology other than one resistor from the far net to GND. The worst-case formula is therefore never applied to a shape it does not describe.
- Every refusal in `carrier-board.ts` names what is missing and why (lines 151, 154, 172, 182).
- The "every pin number names the symbol pin it claims" test checks both directions. Every model pin lands on a symbol pin, and every symbol pin is claimed by the model (h7-carrier.test.ts:1174). That is stronger than the brief asked for.
- The CR-CARRIER entries are all labelled "Controller ruling (the owner may override)". Implementer additions are marked as such and are not dressed as controller text. CR-CARRIER-USBSW-SELECT says plainly that no h7 document states S.
- The `writeProjectSymbolTable` refusals cover a wrong extension, a missing file and a nickname collision (draw-draft.ts:+1424-1433). LF is built with `String.fromCharCode(10)` per the control-character rule.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None in this task's code. The two items below are controller decisions that need to be made before Task 7, not defects in Task 5:

- **Implementer concern 1: the fuse rating never reaches the page.** The fuse is kind `ic` with no MPN, so its drawn value is "Fuse" (parts.ts:631-644). A built carrier needs the 0.75 A figure, and a schematic that omits it under-describes the part a builder fits. The model is as ruled, so this is not a Task 5 defect. But Task 7 will draw it as "Fuse" unless the controller rules on a value override or a fuse kind first. **Rule before Task 7.**
- **Implementer concern 5: `tools/cli/draw.ts` does not pass `projectSymbolLibraries`.** A `make draw` of `boards/h7-carrier` through the CLI will not resolve `h7-platform:TS3USB221RSER`. That correctly belongs to Task 7, and carrier-board.drawing.ts:60-61 states it, but Task 7's brief must carry it explicitly.

#### Minor (Nice to Have)

1. **A dead line citation.** carrier-board.ts:167-168 (`r_cc1`, `r_cc2`) cites `processor-and-memory.md:263`, which is a blank line. The 5.1 kΩ Rd text is at line 267. The decisions entry CR-CARRIER-USB-C (decisions.md:1345) repeats "§8, line 263". The brief supplied the stale number. Repoint both to :267, or cite §8 alone.
2. **The dissipation figure is wrong.** decisions.md:1395 (CR-CARRIER-DUMMY-LOADS) says "1206 for 3V3_D (86.6 mW at 3.513 V)". For 147 Ω, 3.513² / 147 = 84.0 mW, or 84.8 mW at −1 %. 86.6 mW matches no stated case and sits near the superseded 143 Ω figure of 86.3 mW. The 1206 choice is unaffected, but the number in a ruling should be right.
3. **`Reflect.get` sidesteps the model's narrowing type.** rail-budget.ts:737-743 reads `ohms` through `Reflect.get` into `unknown`. It is not a cast, but the repository already narrows to `ResistorComponent` with an `isResistor` type predicate (tools/bom/rail-bound.ts:57). Using that, or a shared one, would make the refusal and the typing agree.
4. **The USBLC6-2SC6 pin names are understated as unchecked.** parts.ts:99-100 says the USBLC6-2SC6 pin names "are read from the symbol, not checked independently of it" (concern 3). schematic-checklist.md:213 USB-04 is an independent in-repo source that gives the same pin numbers and functions: I/O1 on 1 and 6, I/O2 on 3 and 4, GND on 2, VBUS on 5. Cite USB-04 as the source and the check is no longer circular.
5. **Two placeholder strings behind refusals.** rail-budget.ts:758 has `far[0] ?? ""`, and h7-carrier.test.ts:1222 has `STATES[0] ?? {...}`. Both are unreachable after the length checks, but `?? ""` in production code reads as a fallback. Refusing on `undefined` directly would make that explicit.
6. **The ΔI_CC allowance over-counts, deliberately.** It counts S as a control input, but S is hard-tied to GND and never sits at 1.8 V. The brief directed this and CR-CARRIER-USBSW-SELECT discloses it, so it is not an error. It costs 20 µA of the 435 µA headroom.
7. **Implementer concerns 2, 4, 6 and 7.** Each is judged sound as disclosed:
   - Concern 2: the extra parts are flagged for the controller.
   - Concern 4: the signature change is required by P1.
   - Concern 6: no footprints are set, and a schematic needs none.
   - Concern 7: the value spellings are normalised by `resistanceText`.

### Assessment

**Task quality:** Approved

**Reasoning:** The model, the rail budget and the C4 project symbol match the brief and the controller's rulings. Every spot-checked connection and figure agrees with the datasheet and the h7 documents, and Review Focus 6 is enforced by refusal and tested in all eight states. The remaining items are a dead line citation, one wrong dissipation figure in a ruling's prose, and two decisions (the fuse rating on the page, and project-library plumbing in the draw CLI) that must be settled before Task 7.
