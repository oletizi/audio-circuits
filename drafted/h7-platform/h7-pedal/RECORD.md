# h7-pedal: the audio pedal board, drawn one page per block

The circuit: `circuits/h7-platform/pedal-board.ts` (`h7Pedal()`, `DESIGNATORS`, `PIN_NUMBERS`,
`PAGE_GROUPS`, `drawingPages()`), one `include()`d block per page under `circuits/h7-platform/pedal/`
(ruling CR-PEDAL-BLOCKS; the board includes a block once its task has built it). Model-authoritative
(`TOOLING.md` step 0): every page is derived from the model. The board is
`boards/h7-pedal/perfboard.json`, kind `pcb`; it declares no `sch` and no `netlist` yet, because
there is no root sheet to name or export.

The project is drawn under design change C3 (`TOOLING.md`, "Multi-page drawing"), as the module's
is (`../h7-module/RECORD.md`): one sheet per block, each block's ports drawn as hierarchical labels,
and a root sheet joining them, assembled once every page is drawn. Each block page is checked
against its own block of the model by the shared tools, `sh draughting/pages/verify.sh
drafted/h7-platform/h7-pedal <block> <sheet>`. The pedal's own data for those tools is in
`repair/tools/`: its three declared tables (`pwr-flag-homes.ts`, `cross-page-drivers.ts`,
`erc-allowances.ts`, each written from the pedal's nets and holding only what the pages drawn so far
need) and its title-block data (`title_block.py`).

**The pages carry the module's page conventions unchanged** (`docs/h7-platform/decisions.md`):
[CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails) (no rail power
symbol on a block page; GND and the rails are wires ending in the block's hierarchical labels),
[CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags) (at most one
PWR_FLAG per net across the hierarchy, at the home the board's table declares),
[CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers),
[CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check) and
[CR-MODULE-BEAD-VALUE](../../../docs/h7-platform/decisions.md#cr-module-bead-value) (a bead is drawn
with its rated impedance, by `valueFor`).

**A page here is UNREVIEWED until the owner records a verdict on its sha256; each page's status
below says which it is.** A verdict is bound to the sha256 in the table below;
`docs/schematic/verdicts.md` is where it is recorded.

## Sheets

| sheet | role | sha256 |
| --- | --- | --- |
| `interface.kicad_sch` | block interface | `963777f3bf9df9c3b5d966ce48c71bf76071f902c716f88a65b07c621b88822a` |
| `entry.kicad_sch` | block entry | `5352fd5b917c96520681efa8421b8b63d9a0f92345156c776044f48708af0736` |
| `pf.kicad_sch` | block pf | `7096a9befaf2e62b42218a2153a34fa317fc9cad0a1ad5e1ae9c0d198a4b2385` |

Each committed `.svg` beside a sheet is `draughting/pages/render.sh`'s render of that sheet's
committed bytes, with the pinned kicad-cli.

| page | status | render |
| --- | --- | --- |
| interface | **UNREVIEWED** (Task 7a); `verify.sh` exits 0 | `interface.svg` |
| entry | **UNREVIEWED** (Task 7a); `verify.sh` exits 0 | `entry.svg` |
| pf | **UNREVIEWED** (Task 7b); `verify.sh` exits 0 | `pf.svg` |

## The drafts every repair starts from

`make -C boards/h7-pedal draw`, 2026-11-13, toolchain checked first by `make draught-doctor` (every
pinned tool matched). The replay's own `make draw`, a second run, drafted byte-identical sheets.
Each repaired page's intent is committed as `repair/<block>/intent.json`, and `repair/replay.sh`
checks each draft against the sha256 here, so every later repair starts from these bytes.

| draft | block | parts | sha256 |
| --- | --- | --- | --- |
| `build/draw/h7-pedal/entry/entry.kicad_sch` | entry | 15 | `561fc836dbaf7178ab2742b2f7d24edcd8d63647040c78678bd2518b46ddec56` |
| `build/draw/h7-pedal/pf/pf.kicad_sch` | pf | 13 | `b7e7c33e37f2650bd183ca26622f52af351459b648ffaf87587cd5d0ebc12abb` |
| `build/draw/h7-pedal/modsw/modsw.kicad_sch` | modsw | 13 | `b7d0331996774d07ec11b3d761bdedec98c665bf2a1b12da2aba75dee62f4fa6` |
| `build/draw/h7-pedal/prail/prail.kicad_sch` | prail | 20 | `ef60fc61776a0806efbc1d389534dec23494317f53ab8c1c0fddabb18fbd5cb9` |
| `build/draw/h7-pedal/ldo_vmid/ldo_vmid.kicad_sch` | ldo_vmid | 19 | `4ab75dd0e2aad78af64d3e949bce37bf81401380570ae5844ef1b8576017d096` |
| `build/draw/h7-pedal/interface/interface.kicad_sch` | interface | 2 | `11fc06bf395a95e524a2406fe24b24a3890dcfa2ea60b95ae4ad498d8d95c6df` |

What `make draw` printed, beside the pages:

- **No ADVISORY section.** `make draw` prints one when a pinned tool outside the drawing path
  disagrees with the lock; none did.
- **`NO INDEPENDENT NETLIST:`**, once for the board (design change C2): the board declares no
  `"netlist"`, so the pre-draft partition check did not run against a committed export. *"There is
  no schematic to export a netlist from yet, and none was derived from the model to stand in: a
  check that compares the model with itself cannot fail."* That is a check not made. The binding
  check is each page's own `kicad-cli` export against the model, which `draughting/pages/verify.sh`
  runs per block.
- **Paper.** copperhead drafted entry on A4, pf on A5, modsw on A5, prail on A3, ldo_vmid on A4 and
  interface on A5; `make draw` re-papered each to US Letter. pf, modsw and interface fit the inner
  frame. **Three overshoot it east**: entry by 3.133 mm (content x 25.400 to 270.510 mm), prail by
  81.873 mm and ldo_vmid by 10.753 mm, against a frame ending at 267.377 mm. copperhead's notes:
  entry *"the natural layout fits A4 at 21% utilization, but no smaller sheet holds the reflowed
  content (A5 196×75 mm vs 190×94 usable)"*; prail *"the natural layout fits A3 at 12% utilization,
  but no smaller sheet holds the reflowed content ()"*; ldo_vmid *"the natural layout fits A4 at 27%
  utilization, but no smaller sheet holds the reflowed content (A5 225×87 mm vs 190×94 usable)"*.
  These are findings about the drafts, not withholding grounds; each page's repair places its own
  parts.
- **No power symbol on any draft**: 0 power symbols and 0 PWR_FLAGs on all six (every net on a
  block page is kind `signal`, C3).

The measurement suite on each draft (selftest: 10 controls, every one moved or fired, on every page):

| block | wires | labels (global) | no-connects | true crossings | T-meetings | orphan junctions | wire tees without a dot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| entry | 47 | 9 (8) | 0 | 2 | 10 | 0 | 7, with 10 collinear overlapping pairs |
| pf | 60 | 17 (11) | 0 | 5 | 1 | 0 | 1, with 1 collinear overlapping pair |
| modsw | 41 | 17 (15) | 0 | 0 | 0 | 0 | 0 |
| prail | 94 | 14 (5) | 1 | 5 | 13 | 0 | 10, with 7 collinear overlapping pairs |
| ldo_vmid | 85 | 15 (5) | 2 | 6 | 0 | 0 | 0 |
| interface | 3 | 1 (0) | 4 | 0 | 0 | 0 | 0 |

## How the pages are repaired

As the module's Task 7b pages are (`../h7-module/RECORD.md`, "How the Task 7b pages are
repaired"), by the shared tools in `draughting/pages/`, each block's directory holding only its own
placement (`repair/<block>/layout.py`) and wiring (`repair/<block>/02-wire.py`); `repair/replay.sh`
runs the steps for each block (`repair_block`, copied from the module's unchanged): `ports.ts`,
`net_strokes.py`, `place.py`, `pins.py`, `02-wire.py`, `hierarchical-labels.ts ops` then `check`,
`text_edits.py`.

The measurements in each table are `draughting/pages/verify.sh` on the page, and the same steps run
without stopping on the draft (a draft fails verify.sh's model comparison and its ERC, as a draft is
not a page). None of these is a judgement of a page.

## The tables after Task 7b

The pf and modsw pages are the first with active parts, so the pedal's tables took their first
entries there, each from that page's ERC report (`repair/tools/`, each file's header says why):

- `pwr-flag-homes.ts`: **GND on the root**, under
  [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags). The pf page's
  U1 and U2 have `power_in` GND pins, and no pin anywhere on the pedal's GND is a power output
  (measured over `h7Pedal()`: 44 passive, 4 `power_in`, and U5's OPA1688 V-, `power_in` on the
  project symbol). The module kept its GND flag on its power page only because that page was
  approved with it; no pedal page carries a flag, so GND's goes on the root and no block page draws
  one.
- `cross-page-drivers.ts`: **5V_A** (driven by U4's OUT on the ldo_vmid page, a `power_out` pin, so
  its one-block-root stand-in is a PWR_FLAG; drafted ruling
  [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers),
  the measurement is in the pf section), and **PF_TRIP** and **PF_ON** (driven by U2's 1Y and 2Y on
  the pf page; each reaches one MOSFET gate, typed `input`, on the modsw page).
- `erc-allowances.ts`: still empty. No page needs an allowance.

**What this does to the Task 7a pages: nothing to their bytes, and one count each under their
one-block roots.** Each one-block root now carries the root's GND flag on its GND stub, so that
stub's label no longer dangles. Re-run after the tables changed: `verify.sh` exits 0 on both
pages; `/interface/` and `/entry/` stay at 0 errors and 0 warnings; `/` drops from 1 to 0
`label_dangling` on interface and from 3 to 2 on entry. Each page's own table below is as it was
measured in Task 7a.

## interface: the two module sockets (Task 7a)

**Status: UNREVIEWED.** sha256 `963777f3bf9df9c3b5d966ce48c71bf76071f902c716f88a65b07c621b88822a`.
Render: `interface.svg` beside it.

The block: `circuits/h7-platform/pedal/interface.ts`, 2 parts (J1 and J2, J_MOD_A and J_MOD_B,
`Connector_Generic:Conn_01x20`, Value `801-43-020-10-012000`, parts.md:158), 35 ports: GND on J1.20
and J2.20, and 34 that each reach one pad. J1's pads 16 to 19 are the contract's NC pins.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `interface` is one of the pedal's 19 blocks and holds
  J_MOD_A and J_MOD_B only.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads), cited by the block for what it does NOT hold: no
  test pad is on this page; each pad goes to the block that builds its net.
- [R-5](../../../docs/h7-platform/decisions.md#r-5): the 40-pin interface is two 1 x 20 parts, J_MOD_A (contract pins 1-20) and
  J_MOD_B (21-40), female on the pedal.
- [R-61](../../../docs/h7-platform/decisions.md#r-61): the socket is Mill-Max 801-43-020-10-012000, the Value both parts carry.
- [RR-5](../../../docs/h7-platform/decisions.md#rr-5): contract pins 16-19 are reserved, so J1's pads 16-19 carry no-connects.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND, 3V3_D,
  VREF_A and VIN_MOD are wires ending in hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Every pin on it is passive, so ERC needs none here; `repair/tools/pwr-flag-homes.ts`
  was empty when it was drawn (Task 7b has since homed GND's flag on the root; see "The tables
  after Task 7b").
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  each port's label holds exactly its pins (0 of 35 on the wrong net).
- The placement and wiring are the module's interface page's
  (`../h7-module/repair/interface/layout.py` and `02-wire.py`), which the owner approved on
  2026-11-12, copied: the pedal's interface block is built through the same `socketPads` and its
  pads carry the same contract nets. Two things differ, both drawing choices: the title, and the
  group rectangle's east edge, moved 7.62 mm east (195.58 to 203.2 mm) because the first render of
  this page showed J2's Value, the socket's longer part number, crossing it.
- The stroke of the 34 nets the draft drew no wire for: copperhead's stroke for a net of no colour
  family, the one the draft's GND carries (`interface/layout.py`, `UNDRAWN_STROKES`). A drawing
  choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 2 (J1, J2: the model declares none) | 0; 2 |
| exported components, nets, net members | 2, 39, 40 | 2, 39, 40 |
| exported nets carrying a model net name | 1 of 39 (/GND) | 35 of 39 (every port; the 4 others are J1's no-connect pads) |
| ports whose label is on the wrong net | 34 of 35 (no label: each one-pad port is unconnected on the draft) | 0 of 35 |
| ERC, the sheet alone | 34 errors (`pin_not_connected` 34), 0 warnings | 35 errors (`pin_not_connected` 35: each hierarchical label has no parent sheet), 34 warnings (`isolated_pin_label` 34) |
| ERC under a one-block root, `/interface/` | 34 errors (`pin_not_connected` 34) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 70 errors (`hier_label_mismatch` 35, `label_dangling` 35), 0 warnings | 1 error (`label_dangling` 1, a stub's label; admitted by `erc_sheets.py` as the stubs' with one block), 68 warnings (`isolated_pin_label` 68) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 0 | 0 of 1 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 1 on 1 net (0 global) | 35 on 35 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 1 | 0 of 35 |
| symbols (parts, power symbols, PWR_FLAGs) | 2 (2, 0, 0) | 2 (2, 0, 0) |
| placed pins | 40 | 40 |
| wires, total length | 3, 17.78 mm | 40, 351.79 mm |
| wire corners | 0 | 3 |
| junctions | 0 | 1 |

### What the page shows, as observations

- J1 and J2 stand upright side by side, J1 west of J2, pin 1 at the top, every pin facing west.
- Each pad with a signal runs west by one 300 mil stub to its hierarchical label, so the labels
  stand in two columns, J1's west of J1 and J2's between the two sockets.
- J1's pads 16 to 19 carry no-connects.
- GND's label is on J1.20's stub. J2.20 runs west, drops to a row under both sockets, runs west
  under J1 and rises to J1.20's stub, where a junction joins it.
- Both sockets carry Reference over Value, centred above pin 1; J2's Value ends inside the group
  rectangle.
- The page's arrangement is the module interface page's, and so are its 35 port names and the pad
  each sits on: the two blocks' `ports.json` are equal (compared as name-to-pins maps).

## entry: the power entry (Task 7a)

**Status: UNREVIEWED.** sha256 `5352fd5b917c96520681efa8421b8b63d9a0f92345156c776044f48708af0736`.
Render: `entry.svg` beside it.

The block: `circuits/h7-platform/pedal/entry.ts`, 15 parts: J3 (J_DC, `Connector:Barrel_Jack`),
FB1 (FB_IN, `Device:FerriteBead`), D1 and D2 (D_AIN, D_MIN, `Diode:PMEG4030ER`), C1 (C_SCH), C2
(C_PROTHF), C3 to C6 (C_BULK to C_BULK4, `Device:C_Polarized`), C7 (C_PROT), R1 (R_VBLD), TP1, TP2
and TP3 (`Connector:TestPoint`). Ports GND, VIN, VIN_A and VIN_MSW (VIN_MSW reaches one pin, D2's
cathode). VIN_FB is private to the page and is drawn as wire, with no label.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `entry` is one of the pedal's 19 blocks: the DC jack,
  both Schottkys, FB_IN, the hold-up reservoir on VIN_A, R_VBLD (and, by CR-PEDAL-TEST-PADS, the
  VIN, VIN_A and GND pads).
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): the pedal adds no model kind. D1
  and D2 are `diode`, pin 1 K and pin 2 A on `Diode:PMEG4030ER`, which is why each anode is pin 2
  on the page. FB_IN is an `inductor` (the block cites it as CR-PEDAL-KINDS' FERRITE_IN), so the
  model carries henries and the page draws the rating (CR-MODULE-BEAD-VALUE, below).
- [CR-PEDAL-CHASSIS-PAD](../../../docs/h7-platform/decisions.md#cr-pedal-chassis-pad), cited by the block for what it does NOT hold:
  the chassis-bond GND pad is layout, not a model part, so it is not on this page.
- [R-35](../../../docs/h7-platform/decisions.md#r-35), amended by [R-40](../../../docs/h7-platform/decisions.md#r-40): one PMEG4030ER per branch (D1 to VIN_A, D2 to the
  module branch), and VIN_A's reservoir of four 100 uF 35 V cans, C3 to C6 (R-40 the fourth).
- [R-36](../../../docs/h7-platform/decisions.md#r-36): R1 (R_VBLD) 10.0 kOhm on VIN, so VIN falls after a plug pull.
- The block also cites PWR-01 and PWR-02 (`schematic-checklist.md` lines 117 and 118, the jack's
  polarity and one Schottky per branch); those are checklist items, not rulings, and reach this page
  through CR-PEDAL-DC-JACK and R-35.
- [CR-PEDAL-DC-JACK](../../../docs/h7-platform/decisions.md#cr-pedal-dc-jack): J3 on the generic
  `Connector:Barrel_Jack`, pin 1 (centre) on GND, pin 2 (sleeve) on VIN, no switch contact.
- [CR-PEDAL-FB-IN](../../../docs/h7-platform/decisions.md#cr-pedal-fb-in): FB1 from VIN to VIN_FB,
  both diodes' anodes on VIN_FB, C1 (C_SCH) on VIN, C2 (C_PROTHF) on VIN_A beside C7 (C_PROT).
- [CR-MODULE-BEAD-VALUE](../../../docs/h7-platform/decisions.md#cr-module-bead-value), as
  CR-PEDAL-FB-IN applies it: FB1 reads its rating, "600R@100MHz" (`valueFor`), not the model's 3 µH.
- [CR-PEDAL-TEST-PADS](../../../docs/h7-platform/decisions.md#cr-pedal-test-pads): TP1 on VIN, TP2
  on VIN_A, TP3 the one GND pad.
- [CR-PEDAL-NETS](../../../docs/h7-platform/decisions.md#cr-pedal-nets): VIN_MSW, D2's cathode.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND, VIN and
  VIN_A are wires ending in hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Every pin on it is passive, so ERC needs none here; `repair/tools/pwr-flag-homes.ts`
  was empty when it was drawn (Task 7b has since homed GND's flag on the root; see "The tables
  after Task 7b").
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 4 ports on the wrong net.
- Drawing choices, not transcriptions: J3 is mirrored top to bottom (`mirror x`) so its VIN pin is
  its upper pin and VIN's row runs above GND's; both diodes are turned 180 so each anode is west;
  VIN_MSW, which the draft drew no wire for, takes the blue stroke copperhead gives the VIN family
  (VIN_A and VIN_FB on the draft), by copperhead's own family rule (`entry/layout.py`,
  `UNDRAWN_STROKES`).
- The placement is the third: the first render showed FB1's Value running into D1's, TP1's Value
  into C1's, and each capacitor's Value reaching its east neighbour's body; the second, TP2's Value
  running into VIN_A's label (`entry/layout.py` records each change).

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 15 (the model declares none) | 0; 15 |
| exported components, nets, net members | 15, 5, 27 | 15, 5, 27 |
| exported nets carrying a model net name | 4 of 5 (/GND, VIN, VIN_A, VIN_FB) | 4 of 5 (/GND, /VIN, /VIN_A, /VIN_MSW; the fifth is VIN_FB, private and unlabelled) |
| ports whose label is on the wrong net | 3 of 4 | 0 of 4 |
| ERC, the sheet alone | 1 error (`pin_not_connected` 1, D2 pin 1), 2 warnings (`lib_symbol_mismatch` 2) | 4 errors (`pin_not_connected` 4: each hierarchical label has no parent sheet), 3 warnings (`isolated_pin_label` 1, `lib_symbol_mismatch` 2) |
| ERC under a one-block root, `/entry/` | 1 error (`pin_not_connected` 1, D2 pin 1), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 8 errors (`hier_label_mismatch` 4, `label_dangling` 4), 2 warnings (`lib_symbol_mismatch` 2) | 3 errors (`label_dangling` 3, the stubs' labels with one block, which `erc_sheets.py` admits), 4 warnings (`isolated_pin_label` 2, `lib_symbol_mismatch` 2) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 2, 10 | 0, 0 |
| orphan junctions, of total | 0 of 4 | 0 of 21 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 7; 10 | 0; 0 |
| labels | 9 on 4 nets (8 global) | 4 on 4 nets, all hierarchical |
| paper fit (US Letter) | overshoots east by 3.133 mm | fits |
| wire groups with more than one stroke | 0 of 9 | 0 of 5 |
| symbols (parts, power symbols, PWR_FLAGs) | 15 (15, 0, 0) | 15 (15, 0, 0) |
| placed pins | 27 | 27 |
| wires, total length | 47, 731.52 mm | 47, 370.84 mm |
| wire corners | 8 | 3 |
| junctions | 4 | 21 |

**`lib_symbol_mismatch`, 2 warnings on the draft and on the page**, measured with `kicad-cli sch erc
--severity-all`: *"Symbol 'PMEG4030ER' doesn't match copy in library 'Diode'"*, on D1 and on D2.

D1's and D2's embedded symbol (`Diode:PMEG4030ER`, `entry.kicad_sch` line 970; line 969 on the
draft), measured against the sheet and the installed `Diode.kicad_sym` (KiCad 10.0.5):

| | embedded in the sheet (draft and page alike) | installed `PMEG4030ER` |
| --- | --- | --- |
| form | a whole symbol, no `extends` | `(extends "PMEG40T10ER")` (installed line 43025): fields only, its pins and graphics the parent's |
| pins | K pin 1 at (-3.81, 0), A pin 2 at (3.81, 0), both passive, length 2.54: identical, token for token, to the installed parent `PMEG40T10ER`'s | the parent's: the same two |
| graphics | the parent's three polylines, the same 12 points | the parent's |
| Value | `PMEG40T10ER` (the parent's) | `PMEG4030ER` |
| Datasheet | `.../data-sheet/PMEG40T10ER.pdf` (the parent's) | `.../data-sheet/PMEG4030ER.pdf` |
| Description | "40V, 1A low Vf Trench MEGA Schottky barrier rectifier, SOD-123W" (the parent's) | "40V, 3A low Vf MEGA Schottky barrier rectifier, SOD-123W" |
| Footprint, `ki_fp_filters`, `ki_keywords` | `Diode_SMD:Nexperia_CFP3_SOD-123W`, `Nexperia*CFP3*SOD?123W*`, "forward voltage diode" | the same |

So the embedded copy is the parent `PMEG40T10ER` flattened under the child's name. That is what
copperhead's flattening of an `extends` symbol produces, as the carrier record measured for
`USBLC6-2SC6` (`../h7-carrier/RECORD.md`, U2's embedded symbol). It is third-party behaviour, and this
repair does not touch `lib_symbols`.

**What reaches the page's netlist export** (`kicad-cli sch export netlist --format kicadxml` on the
committed sheet): each instance's own Value is `PMEG4030ER,115`, the fitted part. Its instance
Datasheet and Description fields are empty. But the `libpart` for `Diode` / `PMEG4030ER` carries
the description "40V, 1A low Vf Trench MEGA Schottky barrier rectifier, SOD-123W", the doc
`PMEG40T10ER.pdf`, and the field Value `PMEG40T10ER`. D1's and D2's `libsource` repeats that
description. So the export describes D1 and D2 as the 40 V 1 A part, with that part's data sheet.

**This is not an electrical fault.** The pins, their numbers, types and positions are the
installed part's, the model comparison is 0, 0, 0, 0, and ERC reports it as a warning. The fitted
part is the 3 A PMEG4030ER (R-35, `PMEG4030ER` in `pedal-parts.ts`), and the instance Value says
so.

**Trap for a later output:** a reader taking the description or data sheet from this page's export
or symbol fields gets the 1 A part's. **What would settle it:** the embedded symbol carrying the
installed `PMEG4030ER`'s own Value, Datasheet and Description. Either the repair rewrites those three
properties in `lib_symbols` (a direct text edit; it changes the page's bytes, so it is a redraw the
owner sees), or copperhead resolves `extends` with the child's fields. Neither is done here: both
pages were sent to the owner at their current sha256.

### What the page shows, as observations

- J3 stands at the west, mirrored top to bottom: pin 2 (VIN) is its upper pin, pin 1 (GND) its
  lower, both facing east.
- VIN runs east on one row from J3.2. VIN's hierarchical label sits on a stub rising from the row
  just east of J3, its text vertical; TP1 stands on the row; C1 and R1 hang from it to the GND row;
  FB1 lies in the row.
- At VIN_FB, east of FB1, a riser goes up to a second row: D2, anode west, runs east to VIN_MSW's
  hierarchical label, which points east. D1, anode west, continues on the first row into VIN_A.
- VIN_A runs east from D1's cathode: C3 to C6, C7 and C2 hang from it to the GND row, 450 mil apart;
  TP2 stands on the row; VIN_A's hierarchical label ends the row at the east, pointing east.
- GND runs along a row under the VIN row, its hierarchical label at the west end pointing west;
  J3.1 drops to it, TP3 hangs under it, and every hanging part's pin 2 meets it.
- VIN_A, VIN_FB and VIN_MSW wires carry copperhead's blue stroke; VIN and GND its default.
- The hanging parts carry Reference over Value east of their bodies; D1's below the row, D2's and
  FB1's above their rows; J3's above its body; the pads' east of their circles.

## pf: the power-fail supervisor (Task 7b)

**Status: UNREVIEWED.** sha256 `7096a9befaf2e62b42218a2153a34fa317fc9cad0a1ad5e1ae9c0d198a4b2385`.
Render: `pf.svg` beside it.

The block: `circuits/h7-platform/pedal/pf.ts`, 13 parts: U1 (U_PF, `h7-platform:TPS3808G01DBV`,
TPS3808G01DBVR), R2 (R_PFT1 13.0 kOhm), R3 (R_PFT2 174 kOhm), R4 (R_PFB 10.0 kOhm), D3 (D_PFCL,
BAS116H on `Device:D`), C8 (C_PFS 1 nF), C9 (C_PF 100 nF), C10 (C_PFCT 47 nF), R5 (R_PFPU 100 kOhm),
U2 (U_PFINV, `74xGxx:SN74LVC2G14DBV`, SN74LVC2G14DBVR), C11 (C_PFINV 100 nF), R6 (R_PFTPD 100 kOhm),
R7 (R_PFONPD 100 kOhm). Ports 5V_A, GND, PF_ON, PF_TRIP and VIN (VIN reaches one pin, R2's pin 1).
PF_CLAMP, PF_SENSE, PF_CT and PF_OK are private to the page and drawn as wire, with no label.

### The rulings this page rests on

- [CR-PEDAL-BLOCKS](../../../docs/h7-platform/decisions.md#cr-pedal-blocks): `pf` is one of the
  pedal's 19 blocks: U_PF, its sense divider, and U_PFINV making PF_TRIP and PF_ON.
- [CR-PEDAL-KINDS](../../../docs/h7-platform/decisions.md#cr-pedal-kinds): U1 and U2 are `ic`; D3 is
  `diode`, pin 1 K and pin 2 A, so its cathode (pin 1) is on PF_CLAMP and its anode on GND.
- [R-36](../../../docs/h7-platform/decisions.md#r-36): U_PF senses VIN at the jack through a 0.1 %
  divider.
- [R-37](../../../docs/h7-platform/decisions.md#r-37): U_PF's open-drain RESET drives only PF_OK,
  pulled up to 5V_A by R5; a Schmitt inverter makes PF_TRIP.
- [R-40](../../../docs/h7-platform/decisions.md#r-40): the top resistor split into R_PFT1 (R2) and
  R_PFT2 (R3) with D_PFCL (D3) clamping the node between them; C_PFCT 47 nF (C10) on CT; the dual
  inverter, U2.
- [CR-PEDAL-POWER-READINGS](../../../docs/h7-platform/decisions.md#cr-pedal-power-readings):
  U_PFINV's channel A is gate 1 (1A pin 1 on PF_OK, 1Y pin 6 PF_TRIP) and channel B gate 2 (2A pin
  3 on PF_TRIP, 2Y pin 4 PF_ON).
- [CR-PEDAL-POWER-DATASHEET-ENDS](../../../docs/h7-platform/decisions.md#cr-pedal-power-datasheet-ends):
  the GND ends of C10 (CT to GND) and C8 (SENSE to GND), from TI SBVS050N.
- [CR-PEDAL-SYMBOL-TPS3808G01](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-tps3808g01):
  U1 is the project symbol, RESET typed `open_collector`.
- [CR-PEDAL-SYMBOL-DIODES](../../../docs/h7-platform/decisions.md#cr-pedal-symbol-diodes): BAS116H on
  `Device:D`, pin 1 K, pin 2 A.
- [CR-PEDAL-PIN-MATCH](../../../docs/h7-platform/decisions.md#cr-pedal-pin-match): the rule U1's
  project symbol and U2's stock symbol are held to (U2, `74xGxx:SN74LVC2G14DBV`, is the part's own
  stock symbol, `pedal-parts.ts`).
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 5V_A and GND
  are wires ending in hierarchical labels; no power symbol on the page.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. GND's single flag is on the root (`pwr-flag-homes.ts`, "The tables after Task 7b"), so
  the one-block root puts a stub flag on GND.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers)
  and the drafted
  [CR-PEDAL-CROSS-PAGE-POWER-DRIVERS](../../../docs/h7-platform/decisions.md#cr-pedal-cross-page-power-drivers):
  5V_A's driver is U4's OUT on the ldo_vmid page; its one-block-root stand-in is a PWR_FLAG (below).
  The page itself is the driver of PF_TRIP and PF_ON, the entries the modsw page needs.
- [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check):
  0 of 5 ports on the wrong net.
- The block also cites `power.md` lines 121, 142 and 149, `bypass-relay.md` lines 184 to 186 and
  `parts.md` lines 59 to 74 and 104 for each part; those are the design notes the rulings above
  rest on, not rulings.
- Drawing choices, not transcriptions: C9 and C11 stand together at the west, next to the 5V_A and
  GND labels, because the signal path runs west to east between the two rows and any column nearer
  U1 or U2 would cross it; D3 is turned 270 so its cathode is up; R5 is turned 180 so its 5V_A pin
  is up; VIN, which the draft drew no wire for, takes copperhead's default stroke, the one VIN has on
  the entry page (`pf/layout.py`, `UNDRAWN_STROKES`).

### The 5V_A stand-in, measured on this page

Under the one-block root, with GND's stub flag in place, `kicad-cli sch erc` (10.0.5) on this page:

| stand-in on 5V_A's stub | `/pf/` |
| --- | --- |
| none | 1 error: `power_pin_not_driven`, *"Symbol U1 Pin 6 [VDD, Power input, Line]"* |
| `Connector:TestPoint` (CR-MODULE-CROSS-PAGE-DRIVERS' stand-in, by the `PAGES_CROSS_PAGE_DRIVERS_TABLE` override) | the same 1 error |
| a PWR_FLAG (the stand-in `standInKind` chooses for U4's `power_out` OUT) | 0 errors, 0 warnings |

With no table entries at all, `/pf/` reports 2 errors, `power_pin_not_driven` on U1's VDD (5V_A) and
on U1's GND (GND); GND's root flag clears the second. A flag home for 5V_A is not taken: U4's OUT is
`power_out`, so a PWR_FLAG on 5V_A in the assembled hierarchy would be a second power output on the
net.

### Measurements, before (the draft) and after (this page)

Both columns with the tables as Task 7b leaves them.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| footprints; footprints undeclared | 0; 13 (the model declares none) | 0; 13 |
| exported components, nets, net members | 13, 9, 34 | 13, 9, 34 |
| exported nets carrying a model net name | 8 of 9 (/PF_CLAMP, /PF_CT, /PF_ON, /PF_SENSE, /PF_TRIP, 5V_A, GND, PF_OK; VIN is unconnected) | 5 of 9 (/5V_A, /GND, /PF_ON, /PF_TRIP, /VIN, the ports; the other 4 private and unlabelled) |
| ports whose label is on the wrong net | 3 of 5 | 0 of 5 |
| ERC, the sheet alone | 3 errors (`pin_not_connected` 1, R2 pin 1; `power_pin_not_driven` 2), 0 warnings | 7 errors (`pin_not_connected` 5: each hierarchical label has no parent sheet; `power_pin_not_driven` 2), 3 warnings (`isolated_pin_label` 1, `lib_symbol_issues` 1, `lib_symbol_mismatch` 1) |
| ERC under a one-block root, `/pf/` | 3 errors (`pin_not_connected` 1, `power_pin_not_driven` 2: U1's VDD and GND), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 8 errors (`hier_label_mismatch` 5, `label_dangling` 3), 4 warnings (`isolated_pin_label` 2, `lib_symbol_issues` 1, `lib_symbol_mismatch` 1) | 2 errors (`label_dangling` 2, the PF_ON and PF_TRIP stubs' labels, alone with one block; `erc_sheets.py` admits them), 4 warnings (the same four) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 5, 1 | 3, 0 |
| orphan junctions, of total | 0 of 7 | 0 of 21 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 1; 1 | 0; 0 |
| labels | 17 on 8 nets (11 global) | 5 on 5 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 17 | 0 of 9 |
| symbols (parts, power symbols, PWR_FLAGs) | 13 (13, 0, 0) | 13 (13, 0, 0) |
| placed pins | 34 | 34 |
| wires, total length | 60, 572.77 mm | 57, 795.02 mm |
| wire corners | 13 | 7 |
| junctions | 7 | 21 |

The draft's ERC columns were measured beside the committed `sym-lib-table` as well as where `make
draw` wrote it: in `build/draw/` the draft alone reports 0 warnings, because its own `sym-lib-table`
maps the stock libraries to copperhead's vendored `sym-lib-cache`; copied beside the committed table it
reports the page's `lib_symbol_issues` 1 and `lib_symbol_mismatch` 1. So both warnings come from the
library context, not from the repair, as the module record found for its usb_dfu page.

**`lib_symbol_issues` 1**: *"The current configuration does not include the symbol library
'h7-platform'"*, on U1. A block page has no `.kicad_pro` beside it, and kicad-cli 10.0.5 does not
take the committed `sym-lib-table` without one; the module's reset_boot and sdram pages, whose
parts include project symbols, carry the same warning, and its root, with a `.kicad_pro`, does not
(`../h7-module/RECORD.md`). U1's symbol is embedded in the sheet, so its pins are the project
symbol's.

**`lib_symbol_mismatch` 1**: *"Symbol 'SN74LVC2G14DBV' doesn't match copy in library '74xGxx'"*, on
U2. Measured as the entry page's PMEG4030ER was:

| | embedded in the sheet (draft and page alike, `pf.kicad_sch` line 14) | installed `SN74LVC2G14DBV` (`74xGxx.kicad_sym` line 27242) |
| --- | --- | --- |
| form | a whole symbol, no `extends` | `(extends "Inverter_Schmitt_Dual")`: fields only, its pins and graphics the parent's |
| pins and graphics | identical, whitespace-normalised, to the installed parent `Inverter_Schmitt_Dual`'s: 1 1A input, 2 GND power_in, 3 2A input, 4 2Y output, 5 V_{CC} power_in, 6 1Y output | the parent's |
| Value | `Inverter_Schmitt_Dual` (the parent's) | `SN74LVC2G14DBV` |
| Datasheet | empty (the parent's) | `https://www.ti.com/lit/ds/symlink/sn74lvc2g14.pdf` |
| Description | "Dual schmitt inverter" (the parent's) | "Dual schmitt inverter, VCC from 1.65 to 5.5 V, SOT-23" |
| Footprint | empty (the parent's) | `Package_TO_SOT_SMD:SOT-23-6` |
| `ki_fp_filters` | `SOT?23* SOT?363* SC?70*` (the parent's) | `SOT?23*` |

copperhead's flattening of an `extends` symbol takes the parent's fields under the child's name,
as the entry page's D1 and D2 and the carrier's U2 show. What reaches the page's export
(`kicad-cli sch export netlist --format kicadxml`): U2's own Value is `SN74LVC2G14DBVR`, the fitted
part; its libsource and libpart describe it as "Dual schmitt inverter", with no data sheet and no
footprint, and the libpart's Value field is `Inverter_Schmitt_Dual`. **Not an electrical fault**:
pins, numbers, types and positions are the installed part's, and the model comparison is 0, 0, 0, 0.
**Trap for a later output**: the export carries the parent's generic description and no data sheet
or footprint for U2. **What would settle it**: the embedded symbol carrying the child's fields, by a
`lib_symbols` text edit (a change to the page's bytes) or by copperhead resolving `extends` with the
child's fields. Not done here.

### Why the page has three crossings, as the layout records it

Observations of the symbols' pin order, not a judgement of the page:

- **U1's MR** (pin 3) sits on the symbol's west side between SENSE (pin 5) above and CT (pin 4)
  below, both on other nets, and MR is on 5V_A with VDD on the top of the body. Any wire from MR to
  the 5V_A row therefore passes SENSE's or CT's wire. Here MR's riser crosses the SENSE row once.
- **U2's PF_TRIP** joins 1Y (pin 6, east, upper) to 2A (pin 3, west, lower). On the symbol, 1Y and 2A
  separate 2Y and GND on one side from 1A and VCC on the other, so a wire between them encloses one
  pair. Here it runs under U2 and crosses U2's GND drop and PF_ON's row, once each. R6 hangs from that
  run.

### What the page shows, as observations

- A 5V_A row along the top and a GND row along the bottom, each from its hierarchical label at the
  west edge, pointing west.
- C9 and C11 stand across the two rows at the west, next to the labels.
- VIN's hierarchical label, pointing west, starts the signal row: R2 lies in it, then the clamp node,
  with D3 (cathode up) hanging to GND, then R3, then the SENSE node, with R4 and C8 hanging to GND,
  and the row runs east into U1's SENSE.
- U1 stands in the middle, VDD up to the 5V_A row and GND down to the GND row. MR's wire goes west
  and rises to the 5V_A row, crossing the SENSE row. CT's goes west and down to C10.
- U1's RESET runs east on one row into U2's 1A; R5 hangs from the 5V_A row onto it.
- U2 stands east of U1, VCC up and GND down. 1Y runs east to PF_TRIP's label at the east edge. From
  a node east of U2 the PF_TRIP wire also runs down, west under U2 and up into 2A; R6 hangs from that
  run to GND. 2Y runs east to PF_ON's label, R7 hanging from it to GND.
- The PF_TRIP and PF_ON labels end the page at the east, in the input shape akcli writes every
  hierarchical label in (`TOOLING.md`, C3).
- The private nets carry copperhead's blue stroke; 5V_A, GND and VIN its default.
- The hanging parts carry Reference over Value east of their bodies; D3's and R6's west; R2's and R3's
  above the row; U1's under its body; U2's above its body.
