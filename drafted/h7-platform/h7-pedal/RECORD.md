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

Each committed `.svg` beside a sheet is `draughting/pages/render.sh`'s render of that sheet's
committed bytes, with the pinned kicad-cli.

| page | status | render |
| --- | --- | --- |
| interface | **UNREVIEWED** (Task 7a); `verify.sh` exits 0 | `interface.svg` |

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
