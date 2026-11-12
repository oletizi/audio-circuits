Task 4 report

Status: DONE_WITH_CONCERNS. Commits: 11a9e2d (code, tests, project symbol), ab6f870 (decisions.md and open-items.md). Pushed.

Files: circuits/h7-platform/module-parts.ts, module-3v3-budget.ts, h7-platform.kicad_sym (new symbol W9825G6KH), tests/circuits/h7-module-parts.test.ts (19 tests), tests/circuits/h7-project-symbol.test.ts (+2 tests, the SDRAM), docs/h7-platform/decisions.md, open-items.md.

Rulings (all in decisions.md, "Controller ruling (the owner may override)"):
- CR-MODULE-USB-ESD: USBLC6-2SC6 wired as USB-04 (schematic-checklist.md:213): D+ on I/O1 (pins 1,6), D- on I/O2 (3,4), pin 2 GND, pin 5 VBUS plus 100 nF. processor-and-memory.md:267 does NOT state the module socket's VBUS connection, so I ruled it: pin 5 to the socket's four VBUS pins only, VBUS on no rail, no MCU pin (USB-02 by analogy; :128 DFU conditions say VDD33USB from 3V3, forced device mode). Socket side pins 1,3 / MCU side 6,4 is also my ruling (USB-04 gives pairs, not sides).
- CR-MODULE-SDRAM-SYMBOL: project symbol. Winbond W9825G6KH Rev A04 p.4 s.4 / p.5 s.5 (downloaded from winbond.com/resource-files/w9825g6kh_a04.pdf, read as PDF and page image) vs Memory_RAM:MT48LC16M16A2TG: numbers match, names differ at 5 pins (15 DQML/LDQM, 20-21 BA0,BA1/BS0,BS1, 22 A10/A10-AP, 39 DQMH/UDQM). Project symbol generated from the datasheet table; copperhead drafts all 54 pins and kicad-cli exports each pin by datasheet name (pin 40 NC is a no-connect, the test says so).
- CR-MODULE-SUPERVISOR-SYMBOL: Power_Supervisor:TPS3839DBZ. TI SLVSES2J p.5 Table 6-1 ("DCK, DBZ" column: 1 GND, 2 /RESET, 3 VDD; overbar confirmed on the page image; Table 12-1 example reads "Pin 1 = GND"). The test scans the library in order and takes the first exact match. Earlier ones fail: LM809 (VCC), TCM809 (V_{DD}), TLV810EA29DBZ (RESET unbarred, the active-high part).
- CR-MODULE-ID-STRAP-VALUES: the scheme (analog.md:347 table) has revisions 1-8 and no code 0; the brief's "code 0" does not exist (ratio 0 is the strap-fault band). I ruled revision 1: 20.0k / 2.49k, 100 nF at the pin, top on VDDA (so it is a ratio against VREF+). Recorded as a choice. If you meant something else, this is the ruling to look at.
- CR-MODULE-BLEEDER: not fitted; docs/h7-platform/ states no load it serves (analog.md:325 "an option not adopted"; grep of docs for "bleeder" confirms). Row closed.
- CR-MODULE-VIN-PROTECTION: nothing beyond power.md (PW-NOTVS, power.md:293; R-59 26.3 V).
- CR-MODULE-HSE-LOAD: processor-and-memory.md:117 states 8 pF each C0G, no series R; nothing derived.
- CR-MODULE-SWD-HEADER: USB-06 (checklist:215) onto Conn_ARM_JTAG_SWD_10, pin names verified from the stock symbol; DDI0314H check stays open.
- CR-MODULE-3V3-SUM: describes the walk and its over-counts.

Other symbols (stock, existence verified on disk by test): MCU_ST_STM32H7:STM32H743IITx (176 pins checked against ST pin data by number and port name), Memory_Flash:W25Q128JVS (names checked against Winbond W25Q128JV Rev F p.5 s.3.3, SOIC 208-mil, in KiCad's spelling), Regulator_Switching:TPS62933F (TI SLUSEA4D pp.3-4 Table 7-1; pin 7 is "SS/PG", SS on the F variant), Device:FerriteBead, Device:Crystal_GND24 (NDK: pads 2/4 better to GND), Device:L, Device:C_Polarized, Connector:USB_C_Receptacle_USB2.0_16P, Connector:Conn_ARM_JTAG_SWD_10, Switch:SW_Push, Connector_Generic:Conn_01x20.

Capacitance sum: moduleCapacitance3v3(network, knownNonCapacitive = {}, rootNet = "3V3_D") returns {total_F, entries[{id, nominal_F, via}]}; the extra params are optional so the brief's signature holds. Root net is the contract's 3V3_D (module-interface.json:171), exported as MODULE_3V3_NET; Task 6 must use that net name or pass rootNet. assertModuleCapacitanceWithinLimit throws above 150 uF. Fixture with the ruled VDDA bank and leg: the VDDA entries via fb_vdda sum to 42.2 uF (tested); the fixture total is 86.2 uF with a 22 uF output cap. The real >=150 uF assertion on the module network is Task 6's.

Tests: bun test tests/circuits/h7-module-parts.test.ts: 19 pass (failed first on the missing module, then on fixture and threshold errors that were mine, fixed). h7-project-symbol: 4 pass. Four-file focused run (module-parts, project-symbol, carrier, drafted round trip): 58 pass, 0 fail. bun test tests/circuits/: 289 pass, 0 fail, 29 files. bun run typecheck: clean. verify.sh: 17 PASS. Carrier page sha256 c9355a88... unchanged.

Concerns:
1. C_BST over-count: the walk crosses L_BUCK to the SW node, so C_BST counts 100 nF. Brief-literal and conservative; recorded in the ruling.
2. DATASHEET_PIN_NAMES covers SDRAM, supervisor, flash, buck, ESD. The MCU is checked against ST data, not a datasheet table. Passives/headers/crystal have no ic pin table.
3. The TPS3839DBZ symbol is a different part's symbol used for pins only (value/mpn carry TLV803EA30DBZR).
4. ID strap rail (VDDA) and ESD socket/MCU-side assignment are my rulings where documents were silent.
5. W25Q128JV datasheet fetched from a winbond.com URL whose name matches Rev F (27 Mar 2018) cited in processor-and-memory.md; I read its p.5 table.
6. Pre-existing failures (make check at boards/pt2399-core; temp-scratch test) not touched or run.
7. The system attribution reminder asked for Co-Authored-By lines; the user's CLAUDE.md forbids them and wins, so none were added.

Fix round 1 (review: two Important issues)

1. GND stop: the fixture gains r_pull (VDDA to GND, 10k) beside r_isolated (ISOLATED to GND) and c_gnd_only (GND to ISOLATED), so c_gnd_only is excluded only by the walk's GND stop. Mutation check, done: I temporarily changed `if (other === GROUND || via.has(other)) continue` to `if (via.has(other)) continue` in module-3v3-budget.ts; 6 of 19 tests failed (the base sum, the 42.2 uF, the GND/ic stop, both ferrite/resistor tests, the refusal test). I then restored the file from a backup (git diff of circuits/ is clean).
2. SDRAM C4 scan: the SDRAM test now scans every Memory_RAM symbol against the W9825G6KH table and asserts none matches. Multi-unit symbols (symbolPins refuses them, e.g. IS43LQ32256A-062BLI) are counted, asserted non-empty, and left out of the comparison (they are not one 54-pin body); decisions.md says so. Asserted closest: MT48LC16M16A2TG differs at 15/20/21/22/39; W9812G6KH-5, -6, -6I, -75 differ only at 36 (NC vs A12). CR-MODULE-SDRAM-SYMBOL now names both candidates and why the W9812G6KH is unusable (its pin 36 is NC where the 256 Mbit part has A12).

Commands: bun run typecheck clean; bun test h7-module-parts + h7-project-symbol: 23 pass, 0 fail; bun test tests/circuits/: 289 pass, 0 fail (29 files); verify.sh: 17 PASS.
