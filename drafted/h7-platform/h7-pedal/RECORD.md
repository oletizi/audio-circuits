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

Each committed `.svg` beside a sheet is `draughting/pages/render.sh`'s render of that sheet's
committed bytes, with the pinned kicad-cli.

| page | status | render |
| --- | --- | --- |
| interface | **UNREVIEWED** (Task 7a); `verify.sh` exits 0 | `interface.svg` |
| entry | **UNREVIEWED** (Task 7a); `verify.sh` exits 0 | `entry.svg` |

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
  is empty.
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
  is empty.
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
