### Task 5: The carrier model, without loopback

**Files:**
- Create: `circuits/h7-platform/parts.ts`, holding the part specs shared by h7 boards, each with `mpn`, `symbol` and the citation
- Create: `circuits/h7-platform/carrier-board.ts`, which exports `h7Carrier(): Network`, `DESIGNATORS`, `PIN_NUMBERS`, `RAIL_LOADS` and re-exports `drawingIntent`
- Create: `circuits/h7-platform/carrier-board.drawing.ts`, which exports `CARRIER_DRAWING: DrawingInputs` and `drawingIntent(): CopperheadIntent`
- Create: `circuits/h7-platform/rail-budget.ts`, which computes the carrier's worst-case draw per rail and per supported state
- Create: `boards/h7-carrier/Makefile` (the one include line) and `boards/h7-carrier/perfboard.json` (`kind: "pcb"`, `circuit`, `export: "h7Carrier"`, with no `sch`, `netlist` or `vrt`)
- Create: `tests/circuits/h7-carrier.test.ts`
- Modify: `docs/h7-platform/decisions.md` (the carrier rulings) and `docs/h7-platform/open-items.md`

**Interfaces:**
- Consumes: `checkInterface` and `loadContract` (Task 4); the `pcb` kind (Task 1); `intentFromNetwork` (`tools/draught/intent-from-network.ts`).
- Produces: `h7Carrier()`, plus the component ids `j_mod_a` and `j_mod_b` passed to `checkInterface` as `sockets`.
- Produces: `DESIGNATORS: ReadonlyMap<string, string>` (component id → reference) and `PIN_NUMBERS` (the table `intentFromNetwork` lowers with). Task 6 builds the carrier's drafted-page model from these two, not from any Pultec rule.
- Produces, in `rail-budget.ts`:
  - `type CarrierState = { dummy3v3d: boolean; dummyVrefA: boolean; usbEnabled: boolean }`;
  - `RAIL_LOADS`: for each rail (`3V3_D`, `VREF_A`), a table from component id to a function `(state: CarrierState) => number` giving its worst-case current in amps, each entry citing its source;
  - `railDraw(network: Network, rail: "3V3_D" | "VREF_A", state: CarrierState): number`. It refuses a component with a pin on that rail that has no `RAIL_LOADS` entry, naming it. Resistor currents are computed from the resistor's value **read from the network**, at −1 % and the 3.513 V rail maximum (`power.md:378`). They are never copied into the table as constants.

**What the carrier holds.** Authority: `architecture.md` §carrier (line 356) and `parts.md`. Each item marked *ruling* is recorded in `decisions.md` as a controller ruling, with the reason given here.
- **Sockets.** `j_mod_a`, `j_mod_b`: female 1×20 2.54 mm, Mill-Max 801-43-020-10-012000 (`parts.md`, the module socket row), symbol `Connector_Generic:Conn_01x20`. Every pad's net follows Task 4's semantics.
- **Breakout headers (ruling).** Every contract pin goes to a 1×20 2.54 mm male header, `brk_a` and `brk_b`, pad for pad with the sockets, symbol `Connector_Generic:Conn_01x20`. Why headers and not 40 test points: O-13's "40-pin breakout" in two parts instead of forty, which keeps the page near the size the loop has already drawn. A header pin is the reserved pins' one breakout terminal.
- **Test points (ruling).** Probe test points on VIN_MOD, 3V3_D, VREF_A, GND and the four SAI nets (contract pins 32-35), symbol `Connector:TestPoint`, as `architecture.md` lists them.
- **USB path.** Contract pins 36/37 go through U_USBSW TS3USB221RSER with its 10.0 kΩ enable pull-up to 3V3_D, matching the pedal (`parts.md:145`, R-14), with 100 nF decoupling on its supply.
  - **Receptacle (ruling):** USB-C, symbol `Connector:USB_C_Receptacle_USB2.0_16P`, with 2× 5.1 kΩ CC pull-downs. That is the module's USB-DFU arrangement (`processor-and-memory.md:263`).
  - **ESD (ruling):** USBLC6-2SC6, the pedal's choice (`parts.md:146`).
  - **VBUS sense (ruling):** VBUS reaches pin 31 USB_VBUS_SENSE through the pedal's 12.0 kΩ / 20.0 kΩ divider (`parts.md:177`).
  - **Why mirror the pedal:** the carrier's job is to exercise the same interface path the pedal will.
- **Rail loads.** The 25 mA 3V3_D limit (`power.md:395`) and the 10 mA VREF_A limit (`power.md:227`) bound the carrier's **aggregate** draw on each rail, not any one part. `RAIL_LOADS` therefore covers every part with a pin on either rail:
  - **USB enable pull-up:** when `usbEnabled`, firmware holds OE at 0 V, so the current is 3.513 V over the pull-up's value at −1 %, about 0.35 mA (R-14 records 0.35 mA). When not enabled, it is 0.
  - **TS3USB221 supply current:** I_CC max 30 µA (SCDS220M §5.5, VCC 3.6 V, control inputs at VCC or GND, switch on or off; confirmed by the controller against the datasheet). Count it in every state, because the switch is powered whenever 3V3_D is up. Also count ΔI_CC, 20 µA per control input at 1.8 V (same table, VCC 3.6 V), for each control input, as a conservative allowance for an input passing through its threshold, and the OE input current I_IN ±1 µA.
  - **Decoupling capacitors and test points:** 0 A, with the reason stated in the entry (no DC path).
  - **Dummy loads:** as below.
- **Dummy loads (ruling on values).** Each is fitted by a 2-pin jumper header (`Connector_Generic:Conn_01x02`). Its value is the smallest E96 1 % resistor for which the rail's aggregate draw stays within its limit **in every supported state**, with the dummy fitted. Every combination of the three state flags is supported: no state is ruled out by an interlock or a note, because a bring-up user enabling USB with the dummy fitted is ordinary use.
  - **3V3_D:** the rule gives **147 Ω**: 24.14 mA, plus 0.355 mA pull-up, 0.03 mA I_CC and 0.04 mA ΔI_CC for two control inputs, for 24.57 mA. (143 Ω, the previous choice, reaches 25.17 mA with USB enabled, which is what the plan review found.) 1206.
  - **VREF_A:** 357 Ω, 0805, for 9.94 mA against 10 mA, unless another carrier part turns out to sit on VREF_A, in which case the same rule applies.
- **VIN entry (ruling).**
  - **Input:** a 2-pin input connector, symbol `Connector_Generic:Conn_01x02`.
  - **Fuse:** `Device:Fuse`. Its rating is the smallest standard hold current above the module's documented maximum VIN_MOD input current, cited from `power.md` or `vin-mod`. If the documents give no such figure, this step throws instead of choosing one, and the controller rules.
- **Symbols.** Apply the spec's C4 rule. TS3USB221 has no stock symbol. Compare its RSE pinout with `Interface_USB:TS3USB30ERSWR` and `TS3USB30EDGSR` pin by pin from both TI datasheets, and record the comparison with page citations in `parts.ts`. If neither matches pin for pin, do not substitute. Stop and report BLOCKED, naming the mismatch, so the controller can rule on a project symbol under C4.
- **Not on this board:** the loopback and anything from the codec domain (sequence step 5).

- [ ] **Step 1: Write the failing tests** in `tests/circuits/h7-carrier.test.ts`:
  - `"the carrier validates"`: `h7Carrier()` does not throw.
  - `"the carrier's interface matches the contract"`: `checkInterface(h7Carrier(), "carrier", { J_MOD_A: "j_mod_a", J_MOD_B: "j_mod_b" }).mismatches` equals `[]`.
  - `"every component has a unique designator"`: `DESIGNATORS` is 1:1 with the component ids.
  - `"every part names a symbol that exists in the installed KiCad libraries"`: parse each `part.symbol` as `Lib:Name` and assert the `.kicad_sym` file defines `(symbol "Name"`.
  - `"every pin number names the symbol pin it claims"`: for every component, read its symbol from the installed `.kicad_sym` (or the project symbol under C4) and assert that each `PIN_NUMBERS` entry's number exists on the symbol, and, for `ic` parts, that the symbol's pin name at that number is the one the entry claims. This is the independent check on the table Task 6 reuses.
  - `"every supported state keeps each rail within its limit"`: enumerate all eight `CarrierState` combinations, and for each assert `railDraw(h7Carrier(), "3V3_D", s) <= 0.025` and `railDraw(h7Carrier(), "VREF_A", s) <= 0.010`.
  - `"dummy fitted with USB enabled is within the 3V3_D limit"`: the named regression for the plan review's finding, with `{ dummy3v3d: true, dummyVrefA: true, usbEnabled: true }`. Also assert this state draws more than the same state with `usbEnabled: false`, so the pull-up is demonstrably counted.
  - `"a rail load with no stated current refuses"`: add a resistor from 3V3_D to GND to a copy of the carrier network, and assert `railDraw` throws naming it.
  - `"the intent lowers"`: `drawingIntent()` returns one part per component, and no pin is claimed twice under one reference.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/circuits/h7-carrier.test.ts`. Expected: they fail on the missing module.
- [ ] **Step 3: Write `parts.ts`, `carrier-board.ts`, `carrier-board.drawing.ts`, `rail-budget.ts` and `boards/h7-carrier/`.**
  - `CARRIER_DRAWING` uses one group, `"H7 bring-up carrier"`.
  - `netKinds` lists `GND` as ground, and `VIN_MOD`, `3V3_D`, `VREF_A` and the USB `VBUS` net as power.
  - The module comment of `carrier-board.ts` names its authorities and states what it does not carry: the loopback, the codec, the failsafe-protection check.
- [ ] **Step 4: Verify.** Run `bun test tests/circuits/h7-carrier.test.ts`, `bun run typecheck` and `make -C boards/h7-carrier check`: all pass.
- [ ] **Step 5: Record the rulings** in `decisions.md`, one entry per ruling marked above, in the decisions file's existing entry shape. The dummy-load entry states the aggregate rule, the eight states, the I_CC citation, and that it replaces the plan's earlier 143 Ω after the plan review. In `open-items.md`, update CARRIER-LOOPBACK-FORM to say cut one is drawn without it. Run the port verifier (17 PASS). Commit and push.

