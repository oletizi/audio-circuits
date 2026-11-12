# h7-module: the processor module, drawn one page per block

The circuit: `circuits/h7-platform/module-board.ts` (`h7Module()`, `DESIGNATORS`, `PIN_NUMBERS`,
`PAGE_GROUPS`, `drawingPages()`), twelve `include()`d blocks under `circuits/h7-platform/module/`.
Model-authoritative (`TOOLING.md` step 0): every page is derived from the model. The board is
`boards/h7-module/perfboard.json`, kind `pcb`, with no `sch` or `netlist` until the root sheet exists.

The project is drawn under design change C3 (`TOOLING.md`, "Multi-page drawing"): one sheet per
block, each block's ports drawn as hierarchical labels, and a root sheet, assembled later, joining
them. `kicad-cli`'s export of that root will be the evidence of how the pages connect. Until it
exists, each page is checked against its own block of the model (`repair/tools/verify.sh`).

**Every page here is UNREVIEWED until the owner records a verdict.** A verdict is bound to the sha256
in the table below; `docs/schematic/verdicts.md` is where it is recorded.

## Sheets

| sheet | role | sha256 |
| --- | --- | --- |
| `power.kicad_sch` | block power | `906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f` |
| `interface.kicad_sch` | block interface | `0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296` |
| `clock.kicad_sch` | block clock | `83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1` |
| `reset_boot.kicad_sch` | block reset_boot | `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397` |
| `swd.kicad_sch` | block swd | `486923651c80caf44123005ed47fcb5a756c128674a052a4f99727a96b8cfef8` |
| `usb_dfu.kicad_sch` | block usb_dfu | `80947ededbb593f37bd87d6e838d232557dfc07c6f6d147ac6257cca5f5a299f` |
| `id_strap.kicad_sch` | block id_strap | `7649af4311431f60b159a7d6717c26d136ed3311182f3d5330f11a44eba6cf09` |
| `qspi.kicad_sch` | block qspi | `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1` |
| `vdda.kicad_sch` | block vdda | `7f066a9ab786252b592d14ffaa8886e934876bcc678666b73c1922f06eee2444` |

The root sheet, its `.kicad_pro` and the block sheets not listed above are not drawn yet. This table
has no root row, so `registerDraftedProjectTests` is not yet bound to this directory.

| page | status | render |
| --- | --- | --- |
| power | **reviewed 2026-11-12**, *"approved"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `power.svg` |
| interface | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 below | `interface.svg` |
| clock | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 below | `clock.svg` |
| reset_boot | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 below | `reset_boot.svg` |
| swd | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 below | `swd.svg` |
| usb_dfu | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 below | `usb_dfu.svg` |
| id_strap | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 below | `id_strap.svg` |
| qspi | UNREVIEWED; `verify.sh` exits 1 on one ERC error under the one-block root, awaiting a controller ruling (see its section) | `qspi.svg` |
| vdda | UNREVIEWED; `verify.sh` exits 0 (Task 7c) | `vdda.svg` |

## The drafts every repair starts from

`make -C boards/h7-module draw`, 2026-11-12, toolchain checked first by `make draught-doctor` (every
pinned tool matched). Two runs drafted byte-identical sheets and intents. Each page's intent is
committed as `repair/<block>/intent.json`, and `repair/replay.sh` checks each draft against the
sha256 here, so every later repair starts from these bytes.

| draft | block | parts | sha256 |
| --- | --- | --- | --- |
| `build/draw/h7-module/mcu/mcu.kicad_sch` | mcu | 1 | `f4814efe8202001dd8ecf2cb64c56e3c329ff604ce91f30292b64448fd4282eb` |
| `build/draw/h7-module/decoupling/decoupling.kicad_sch` | decoupling | 25 | `6c9d10a2f9cbeb8219380d3f52f54f23c9a775133e486012934166587d2eefdb` |
| `build/draw/h7-module/vdda/vdda.kicad_sch` | vdda | 8 | `dd3216347137c8e7b95ee07b03fade7d19382283ce2f95e4bfa52d6d3ed79bdd` |
| `build/draw/h7-module/power/power.kicad_sch` | power | 19 | `1aee153350e07e96d7ecc09a5b25a4ff6c6987016244840a081d716b79df38b4` |
| `build/draw/h7-module/sdram/sdram.kicad_sch` | sdram | 9 | `bd560a2406a4ab6d7181202cf0cc59861d7880ff1bddf0592f075e93df04f2f8` |
| `build/draw/h7-module/qspi/qspi.kicad_sch` | qspi | 3 | `1cde054c9d8e9d8cf2e362503d47a140ea39cf69bc709774d2ee9aa4e1a4c788` |
| `build/draw/h7-module/clock/clock.kicad_sch` | clock | 3 | `4e6c1565f3b035a5137d2ee2aec5d5c428d6b4a8e4bb3ae2206769dac3a236bb` |
| `build/draw/h7-module/reset_boot/reset_boot.kicad_sch` | reset_boot | 8 | `ce4271830f6994b4bd197c9ca3a269f42395d3937b2fa89cb1f5786d4588d5c0` |
| `build/draw/h7-module/swd/swd.kicad_sch` | swd | 6 | `a772b4a70a576bf77c940ac686b81a5d6259b442e5eefda3c840f3cc6d637837` |
| `build/draw/h7-module/usb_dfu/usb_dfu.kicad_sch` | usb_dfu | 7 | `8961061ef5970c5f567bb53c8adcb63d83636187c63391dbc16ad284c83fe791` |
| `build/draw/h7-module/id_strap/id_strap.kicad_sch` | id_strap | 3 | `4155a90943894fc2dedf9945034ec3d4c3a35f7cde36052c74fb1d9f13ec6ddd` |
| `build/draw/h7-module/interface/interface.kicad_sch` | interface | 2 | `a19804fc684e8b0d33d8fc50b305421b2399378590f109a260f56d9b5c2adaae` |

What `make draw` printed, beside the pages:

- **No ADVISORY section.** `make draw` prints one when a pinned tool outside the drawing path
  disagrees with the lock; none did.
- **`NO INDEPENDENT NETLIST:`**, once for the board (design change C2): the board declares no
  `"netlist"`, so the pre-draft partition check did not run against a committed export. *"There is
  no schematic to export a netlist from yet, and none was derived from the model to stand in: a
  check that compares the model with itself cannot fail."* The binding check is each page's own
  `kicad-cli` export against the model, which `repair/tools/verify.sh` runs per block and the root's
  export will run for the project.
- **Paper.** copperhead drafted mcu on A3, power on A4 and the other ten on A5; `make draw`
  re-papered each to US Letter. Ten fit the inner frame. **mcu overshoots it south by 61.553 mm**
  (content y 15.24 to 265.43 mm against a frame ending at 203.877 mm); copperhead's own note: *"the
  natural layout fits A3 at 17% utilization, but no smaller sheet holds the reflowed content"*.
- **No power symbol on any draft**: 0 `power:` symbols, 0 `#PWR` and 0 `#FLG` references on all
  twelve (every net on a block page is kind `signal`, C3).

The measurement suite on each draft, as `make draw` printed it (selftest: 10 controls, every one
moved or fired, on every page):

| block | wires | labels (global) | no-connects | true crossings | T-meetings | orphan junctions | wire tees without a dot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mcu | 41 | 5 (3) | 57 | 1 | 120 | 0 | 15 |
| decoupling | 59 | 31 (31) | 0 | 0 | 0 | 0 | 0 |
| vdda | 23 | 7 (6) | 0 | 0 | 0 | 0 | 0 |
| power | 85 | 15 (4) | 1 | 3 | 1 | 0 | 1, at a collinear overlap |
| sdram | 33 | 30 (29) | 1 | 0 | 0 | 0 | 0 |
| qspi | 12 | 4 (2) | 0 | 0 | 0 | 0 | 0 |
| clock | 12 | 3 (0) | 0 | 0 | 0 | 0 | 0 |
| reset_boot | 26 | 10 (5) | 0 | 1 | 0 | 0 | 0 |
| swd | 15 | 7 (4) | 3 | 0 | 0 | 0 | 0 |
| usb_dfu | 37 | 13 (8) | 2 | 0 | 0 | 0 | 0 |
| id_strap | 10 | 2 (0) | 0 | 0 | 0 | 0 | 0 |
| interface | 3 | 1 (0) | 4 | 0 | 0 | 0 | 0 |

## What the root must do about PWR_FLAGs (Task 7b)

Ruling [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): each
module net carries at most one PWR_FLAG across the hierarchy, at the home
`repair/tools/pwr-flag-homes.ts` declares. The block pages carry none on a shared net whose flag
lives on the root, so the root assembled in Task 7b must:

- **place the root-held flags**, one on each net the table homes on `root` (3V3_D, VREF_A and VSSA
  as the table stands), and none on GND, whose flag is the power page's;
- **check exactly one PWR_FLAG per net across the hierarchy**, every sheet together, against the
  table, failing and naming any net with two or with none where ERC needs one;
- **reach 0 ERC errors on the root**, every sheet included.

`tools/draught/assemble-root.ts` places no flag today, and no check of the one-per-net rule across
the whole hierarchy exists yet: `verify.sh` checks one block page at a time. Two flags on one net
across two sheets is a `pin_to_pin` error at the root (measured; the ruling quotes it), so the root
ERC is itself a backstop, but it does not name the table entry at fault.

**And about cross-page drivers.** Ruling
[CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
`repair/tools/cross-page-drivers.ts` declares each signal net whose driver is on another page
(FLASH_CLK -> mcu, U1 PF10, as the table stands), and the one-block root puts a stand-in driver, a
`Connector:TestPoint`, on that net's stub when the block under check is not the driving block. The
stand-in only says the net is driven somewhere, and a passive pin cannot raise a `pin_to_pin`
conflict, so the root assembled in Task 7b (step 4) must:

- **clear every entry of the table with its real driver**: the root's ERC, every sheet together and
  no stand-in placed, reports no `pin_not_driven` on any table net, and the driving pin the entry
  names is on that net in the root's netlist export.

## power: 3.3 V buck and input network

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f`.
Render: `power.svg` beside it (PDF and PNG from `repair/tools/render.sh`).

The block: `circuits/h7-platform/module/power.ts`, 19 parts (L1, C26 to C35, R3 to R8, U2), ports
VIN_MOD, 3V3_D and GND.

### The rulings this page rests on

- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): no rail power
  symbol; VIN_MOD, GND and 3V3_D are wires ending in the block's hierarchical labels.
- [CR-MODULE-VIN-PROTECTION](../../../docs/h7-platform/decisions.md#cr-module-vin-protection):
  nothing ahead of L1 but the EN divider.
- [CR-MODULE-INDUCTANCE-NOTATION](../../../docs/h7-platform/decisions.md#cr-module-inductance-notation):
  L1 and L2 read ".0047mH".
- [CR-MODULE-SUBOHM-RKM](../../../docs/h7-platform/decisions.md#cr-module-subohm-rkm): R3 reads
  "0R22".
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): the two
  PWR_FLAGs (op-list 03), on VIN_BUCK and GND. Without them `kicad-cli sch erc` reports two
  `power_pin_not_driven` ERRORS, on U2's VIN (VIN_BUCK) and GND, on the draft and on the repair
  alike; the replay without op-list 03 reaches a page that fails ERC with those two errors. Each
  module net carries at most one PWR_FLAG across the hierarchy, at the home declared in
  `repair/tools/pwr-flag-homes.ts`: GND's is this page's, VIN_BUCK is private to it, and 3V3_D,
  VREF_A and VSSA have theirs on the root.

  What was measured (kicad-cli 10.0.5). A PWR_FLAG joins no nets by name: on a copy of the
  two-block fixture, a flag on each block's same-named private FB left the root export's nets
  unchanged (four nets, /a/FB and /b/FB still two) and ERC on that root at 0 errors, 0 warnings.
  **Two flags on one SHARED net are an error, on one sheet and across sheets**, measured, not
  inferred: a second flag on this page's own GND row gave a new `pin_to_pin` (Task 7a review); on a
  copy of the two-block fixture, a GND flag in block a and one in block b gave, at the root,
  *"[error] pin_to_pin: Pins of type Power output and Power output are connected"* on `/a/`, where a
  GND flag in block a alone gave 0 violations; and this page with an extra flag on 3V3_D, under a
  one-block root whose 3V3_D stub carries the root's flag, gave the same error on `/`.

### How it was repaired

`repair/power/`, replayed by `repair/replay.sh` (see `repair/REPLAY.md`):

1. `01-place.py`: delete every copperhead wire, label, junction and no-connect; place and orient the
   19 parts to `layout.py`.
2. `02-wire.py`: every wire as one straight segment, a junction wherever three connections meet,
   U2's RT no-connect, one local label on each port net at the page edge, and the title block.
3. `03-pwr-flags.py`: a PWR_FLAG on VIN_BUCK (at C28's tap, pointing up) and on GND (at U2's tap,
   pointing down).
4. `tools/draught/hierarchical-labels.ts ops`: each port's local label becomes the block's
   hierarchical label, at the same place; then its `check` (one hierarchical label per port, no
   global label).
5. `05-text-edits.py`: copperhead's per-net wire stroke, every part's Reference and Value by a rule
   on its orientation, and the group rectangle.

### Measurements, before (the draft) and after (this page)

From `repair/tools/verify.sh power <sheet>` on each. None of these is a judgement of the page.

**Since issue 32, `verify.sh` fails on ERC**, not only reports it. It exits non-zero when, under
the one-block root:
- the block's own sheet is missing or carries any error;
- the root carries an error other than its stubs' `label_dangling`;
- or any other sheet appears.

The sheet-alone run is still only reported, because its `pin_not_connected` errors on the
hierarchical labels are expected of a sheet with no parent.

`repair/tools/erc-control.sh` holds the controls:
- the committed page verifies;
- the page with its two PWR_FLAGs removed fails on `/power/`'s `power_pin_not_driven`, which is the
  reviewer's reproduction;
- five synthetic reports each come out as stated;
- the page with one more PWR_FLAG, on 3V3_D, fails, and `flag-check.ts` names 3V3_D and the root
  (CR-MODULE-PWR-FLAGS);
- the committed swd draft, with only its hierarchical-label op-list applied and no flag of its own,
  reports `power_pin_not_driven` alone and 0 errors, 0 warnings on `/swd/` under its one-block root,
  whose GND and 3V3_D stubs carry the flags.

`verify.sh` also fails, before ERC, when the page carries a PWR_FLAG on a shared net whose single
flag lives elsewhere (`repair/tools/flag-check.ts`, on the `kicad-cli` export of a probe copy whose
flags `flag_probe.py` renames so the export lists them; the export leaves out `#` references). The
one-block root puts a flag on a stub exactly when that net's flag lives off the block under check;
for this page that is 3V3_D's stub, and GND's stub carries none.

The draft column below would now fail, on its `/power/` errors and its root `hier_label_mismatch`.
That is expected, because a draft is not a page.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 19, 12, 44 | 19, 12, 44 |
| exported nets carrying a model net name | 11 of 12 | 3 of 12 (/3V3_D, /GND, /VIN_MOD; private nets are unlabelled wire) |
| ERC, the sheet alone (`kicad-cli sch erc --severity-all`) | 2 errors (`power_pin_not_driven` 2), 1 warning | 3 errors (`pin_not_connected` 3: each hierarchical label "cannot be connected to non-existent parent sheet"), 1 warning |
| ERC under a one-block root, the block's own sheet `/power/` | 2 errors (`power_pin_not_driven` 2), 0 warnings | **0 errors, 0 warnings** |
| ERC under a one-block root, the root `/` | 6 errors (`hier_label_mismatch` 3, `label_dangling` 3), 1 warning | 2 errors (`label_dangling` 2: the GND and VIN_MOD stub labels are alone with one block; 3V3_D's stub carries the root's PWR_FLAG, so its label is not dangling), 1 warning. Before the stub flags (CR-MODULE-PWR-FLAGS): 3 `label_dangling` |
| ERC warning (both runs) | `lib_symbol_mismatch`: U2's embedded TPS62933F differs from the library copy | the same |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings | 3 | 1, at (114.3, 93.98): the EN descent over the VIN_BUCK row |
| T-meetings | 1 | 0 |
| orphan junctions, of total | 0 of 14 | 0 of 24 |
| wire-to-wire tees without a dot | 1, at a collinear overlap | 0 |
| collinear overlapping wire pairs | 5 | 0 |
| labels | 15 on 11 nets (4 global) | 3 on 3 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 15 | 0 of 11 |
| symbols (parts, power symbols, PWR_FLAGs) | 19 (19, 0, 0) | 21 (19, 0, 2); `counts.py` tells them apart by lib_id, since akcli names a PWR_FLAG `#PWR01` |
| placed pins | 44 | 46 (44 on parts) |
| wires, total length | 85, 749.30 mm | 60, 765.81 mm |
| wire corners | 19 | 3 |
| junctions | 14 | 24 |

The comparison has two negative controls, run on copies of this page: R5's Value changed to "4.7K"
gives `values: 1` and exit 1; the wire from R8 to the GND row deleted gives `netMembership: 3` and
exit 1.

### What the page shows, as observations

- VIN_MOD enters as a hierarchical label on the west edge, on the VIN row; GND's hierarchical label
  is on the west edge of the GND row below it; 3V3_D's is on the east edge of the SW row.
- From VIN_MOD the row runs east through L1 to U2's VIN (pin 3) as VIN_BUCK. Hanging from it, west to
  east: R3 over C29 (C29's + up), C26, C27, C28, each down to the GND row.
- VIN_MOD also rises at the tap west of L1 to a row above, through R4, east to a point above R5, and
  down to U2's EN (pin 2); that descent crosses the VIN_BUCK row, the page's one true crossing. R5
  hangs from the EN node to the GND row.
- C31 stands between R5 and U2 on U2's SS (pin 7) row; U2's RT (pin 1) carries a no-connect.
- East of U2: BST (pin 6) runs through R6 and C30 and drops to the SW row; SW (pin 5) runs east
  through L2 to the 3V3_D row, which carries R7 and C32 to C35. R7 and R8 stand one above the other;
  their node runs west to U2's FB (pin 8).
- Every part's Reference and Value are horizontal. Upright parts carry them to the east, except R7
  and R8, to the west; parts lying east-west carry them above.
- Wires on VIN_MOD and VIN_BUCK carry copperhead's blue stroke; the others its default.

## How the Task 7b pages are repaired

The pages after power are repaired by shared tools, each block's directory holding only its own
placement (`repair/<block>/layout.py`) and wiring (`repair/<block>/02-wire.py`). The steps are the
power page's, in the same order, and `repair/replay.sh` runs them for each block (`repair_block`):

1. `tools/ports.ts <block>`: the block's ports and the pins each reaches, from `drawingPages()`
   (`ports.json`). A port reaching one pin is not in the block's intent, so this is where the wiring
   learns which net such a pin is on.
2. `tools/net_strokes.py` on the draft (`net_strokes.json`), as for power.
3. `tools/place.py`: delete every copperhead wire, label, junction and no-connect; place and orient
   every part to `layout.py` (`01-place.json`).
4. `tools/pins.py` on the placed sheet (`pins.json`), as for power.
5. `<block>/02-wire.py`, through `tools/page.py`'s `Wiring` (`02-wire.json`, `02-wire.nets.json`):
   every wire one straight segment; a junction wherever three or more connections meet; the
   intent's no-connects; one local label per port net; the title block. It refuses a segment that is
   not axis-aligned or has zero length, a segment ending inside another, a pin on a wire's interior,
   a wire end on a pin of another net than the one the wire is drawn for (read from the intent and
   `ports.json`), a label not on exactly one wire end, and labels that are not one per port.
6. `<block>/03-pwr-flags.py`, only where a block has one (none of the pages below does).
7. `tools/draught/hierarchical-labels.ts ops`, then its `check` (`04-hierarchical-labels.json`).
8. `tools/text_edits.py`: wire strokes, every part's Reference and Value from `layout.py`'s
   `FIELDS`, the group rectangle. A net the draft drew no wire for takes the stroke `layout.py`'s
   `UNDRAWN_STROKES` names, with its reason there.

Every page below draws no rail power symbol and no PWR_FLAG: GND, 3V3_D and VREF_A are wires ending
in the block's hierarchical labels
([CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails)), and their
single flags live on the power page (GND) and the root (3V3_D, VREF_A), per
[CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags); the one-block
root supplies them on its stubs when `verify.sh` runs ERC.

The measurements in each table are `repair/tools/verify.sh <block> <sheet>` on the page, and the same
steps run without stopping on the draft (a draft fails verify.sh's ERC, as a draft is not a page).
None of these is a judgement of a page.

Since ruling [CR-MODULE-PORT-LABEL-CHECK](../../../docs/h7-platform/decisions.md#cr-module-port-label-check),
`verify.sh` also fails a page when a port's net `/<port>` in its export does not hold exactly the
pins `drawingPages()` gives that port, which the membership row cannot see for a port reaching one
pin; `Wiring.op_list` refuses the same at generation. Every page below, and power, verifies with 0
ports on the wrong net, and no page byte changed (`erc-control.sh` control 13,
`repair/tools/port-label-control.sh`).

## interface: the two module headers

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved. proceed"* (`docs/schematic/verdicts.md`). sha256 `0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296`.
Render: `interface.svg` beside it.

The block: `circuits/h7-platform/module/interface.ts`, 2 parts (J1, J2, `Connector_Generic:Conn_01x20`),
35 ports: GND on J1.20 and J2.20, and 34 that each reach one pad.

### The rulings this page rests on

- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND, 3V3_D,
  VREF_A and VIN_MOD are wires ending in hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Nothing on it is a power input, so ERC needs none here.
- The stroke of the 34 nets the draft drew no wire for: copperhead's stroke for a net of no colour
  family, the one the draft's GND carries (`interface/layout.py`, `UNDRAWN_STROKES`). A drawing
  choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 2, 39, 40 | 2, 39, 40 |
| exported nets carrying a model net name | 1 of 39 (/GND) | 35 of 39 (every port; the 4 others are J1's no-connect pads) |
| ERC, the sheet alone | 34 errors (`pin_not_connected` 34), 0 warnings | 35 errors (`pin_not_connected` 35: each hierarchical label has no parent sheet), 34 warnings (`isolated_pin_label` 34) |
| ERC under a one-block root, `/interface/` | 34 errors (`pin_not_connected` 34) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 67 errors (`hier_label_mismatch` 35, `label_dangling` 32), 3 warnings | 0 errors, 64 warnings (`isolated_pin_label` 64: each stub label meets one pin, with one block) |
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
  stand in two columns, J1's west of J1 and J2's between the two headers.
- J1's pads 16 to 19 carry no-connects.
- GND's label is on J1.20's stub. J2.20 runs west, drops to a row under both headers, runs west
  under J1 and rises to J1.20's stub, where a junction joins it.
- Both headers carry Reference over Value, centred above pin 1.

## clock: the HSE crystal

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved. proceed"* (`docs/schematic/verdicts.md`). sha256 `83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1`.
Render: `clock.svg` beside it.

The block: `circuits/h7-platform/module/clock.ts`, 3 parts (Y1 `Device:Crystal_GND24`, C44, C45),
ports GND, HSE_IN and HSE_OUT.

### The rulings this page rests on

- [CR-MODULE-HSE-LOAD](../../../docs/h7-platform/decisions.md#cr-module-hse-load): C44 and C45 read
  "8pF".
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND is a row
  ending in its hierarchical label.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Nothing on it is a power input.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 3, 3, 8 | 3, 3, 8 |
| exported nets carrying a model net name | 3 of 3 | 3 of 3 |
| ERC, the sheet alone | 0 errors, 0 warnings | 3 errors (`pin_not_connected` 3: each hierarchical label has no parent sheet), 0 warnings |
| ERC under a one-block root, `/clock/` | 0 errors, 0 warnings | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 5 errors (`hier_label_mismatch` 3, `label_dangling` 2), 1 warning | 2 errors (`label_dangling` 2: the HSE_IN and HSE_OUT stub labels are alone with one block; GND's stub carries the stand-in flag), 0 warnings |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 1 | 0 of 4 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 3 on 3 nets (0 global) | 3 on 3 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 3 | 0 of 3 |
| symbols (parts, power symbols, PWR_FLAGs) | 3 (3, 0, 0) | 3 (3, 0, 0) |
| placed pins | 8 | 8 |
| wires, total length | 12, 43.18 mm | 12, 124.46 mm |
| wire corners | 4 | 1 |
| junctions | 1 | 4 |

### What the page shows, as observations

- One HSE row runs west to east: HSE_IN's hierarchical label on the west, C44's tap, Y1 from pin 1 to
  pin 3, C45's tap, HSE_OUT's hierarchical label on the east.
- C44 and C45 hang from the row to one GND row under it; Y1's case pins 2 and 4, which KiCad
  10.0.5's `Crystal_GND24` draws at one point under the body, drop to the same row between them.
  GND's hierarchical label is at the row's west end, under HSE_IN's.
- Y1's Reference and Value are centred above its case outline; C44's and C45's are to their east.
- Wires on HSE_IN and HSE_OUT carry copperhead's blue stroke; GND its default.

## reset_boot: the NRST supervisor and the two buttons

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved. proceed"* (`docs/schematic/verdicts.md`). sha256 `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397`.
Render: `reset_boot.svg` beside it.

The block: `circuits/h7-platform/module/reset-boot.ts`, 8 parts (U5, C46, R11, C47, SW1, R12, C48,
SW2), ports 3V3_D, BOOT0, GND and NRST.

### The rulings this page rests on

- [CR-MODULE-SUPERVISOR-SYMBOL](../../../docs/h7-platform/decisions.md#cr-module-supervisor-symbol):
  U5 is drawn with `Power_Supervisor:TPS3839DBZ` and reads "TLV803EA30DBZR".
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D and GND
  are rows ending in their hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. U5's VDD (3V3_D) and GND are power inputs, so the sheet alone reports
  `power_pin_not_driven` on both; their flags live on the root (3V3_D) and the power page (GND), and
  under the one-block root the stubs carry them, which clears both.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 8, 4, 17 | 8, 4, 17 |
| exported nets carrying a model net name | 4 of 4 | 4 of 4 |
| ERC, the sheet alone | 2 errors (`power_pin_not_driven` 2), 0 warnings | 6 errors (`pin_not_connected` 4: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, on 3V3_D and GND), 0 warnings |
| ERC under a one-block root, `/reset_boot/` | 2 errors (`power_pin_not_driven` 2), 1 warning (`same_local_global_label`) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 6 errors (`hier_label_mismatch` 4, `label_dangling` 2), 2 warnings | 2 errors (`label_dangling` 2: the BOOT0 and NRST stub labels are alone with one block), 0 warnings |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 1, 0 | 0, 0 |
| orphan junctions, of total | 0 of 2 | 0 of 13 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 10 on 4 nets (5 global) | 4 on 4 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 10 | 0 of 4 |
| symbols (parts, power symbols, PWR_FLAGs) | 8 (8, 0, 0) | 8 (8, 0, 0) |
| placed pins | 17 | 17 |
| wires, total length | 26, 114.30 mm | 33, 365.76 mm |
| wire corners | 7 | 3 |
| junctions | 2 | 13 |

### What the page shows, as observations

- A 3V3_D row along the top and a GND row along the bottom, each entering from its hierarchical
  label on the west edge.
- West part: SW2 stands between the 3V3_D row and the BOOT0 row, which runs west to BOOT0's
  hierarchical label on the west edge, between the 3V3_D and GND labels. R12 and C48 hang from the
  BOOT0 row to GND.
- East part: C46 stands between the rows. U5 has VDD (pin 3) up to 3V3_D, GND (pin 1) down to GND,
  and ~RESET (pin 2) east on the NRST row. R11 hangs from 3V3_D to the NRST row; C47 and SW1 hang
  from it to GND. The NRST row ends in NRST's hierarchical label on the east edge.
- Every part's Reference and Value are horizontal: east of each resistor, capacitor and SW1, west of
  SW2, and under the NRST row east of U5's GND drop for U5.
- Every wire carries copperhead's default stroke.

## swd: the SWD header and its test points

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved. proceed"* (`docs/schematic/verdicts.md`). sha256 `486923651c80caf44123005ed47fcb5a756c128674a052a4f99727a96b8cfef8`.
Render: `swd.svg` beside it.

The block: `circuits/h7-platform/module/swd.ts`, 6 parts (J3 `Connector:Conn_ARM_JTAG_SWD_10`, TP6 to
TP10 `Connector:TestPoint`), ports 3V3_D, GND, NRST, SWCLK and SWDIO.

### The rulings this page rests on

- [CR-MODULE-SWD-HEADER](../../../docs/h7-platform/decisions.md#cr-module-swd-header): J3's pinout;
  pins 6 (SWO), 7 (KEY) and 8 (NC/TDI) carry no-connects.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D and GND
  are rows ending in their hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. J3's VTref (3V3_D) and GND are power inputs, so the sheet alone reports
  `power_pin_not_driven` on both; under the one-block root the stubs carry their flags, which clears
  both. (This is `erc-control.sh`'s control 9, on the draft.)

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 6, 8, 15 | 6, 8, 15 |
| exported nets carrying a model net name | 5 of 8 (the 3 others are J3's no-connect pins) | 5 of 8 |
| ERC, the sheet alone | 2 errors (`power_pin_not_driven` 2), 0 warnings | 7 errors (`pin_not_connected` 5: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, on 3V3_D and GND), 0 warnings |
| ERC under a one-block root, `/swd/` | 2 errors (`power_pin_not_driven` 2), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 8 errors (`hier_label_mismatch` 5, `label_dangling` 3), 2 warnings | 3 errors (`label_dangling` 3: the NRST, SWCLK and SWDIO stub labels are alone with one block), 0 warnings |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 0 | 0 of 6 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 7 on 5 nets (4 global) | 5 on 5 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 7 | 0 of 5 |
| symbols (parts, power symbols, PWR_FLAGs) | 6 (6, 0, 0) | 6 (6, 0, 0) |
| placed pins | 15 | 15 |
| wires, total length | 15, 95.25 mm | 14, 165.10 mm |
| wire corners | 2 | 2 |
| junctions | 0 | 6 |

### What the page shows, as observations

- J3 in the middle. ~RESET (pin 10), SWCLK (pin 4) and SWDIO (pin 2) each run east from J3 to its
  hierarchical label (NRST, SWCLK, SWDIO) on the east edge.
- Each of those rows carries its test point at a junction: TP8 on NRST and TP7 on SWCLK stand up
  from their rows; TP6 on SWDIO hangs down from its row, which is 100 mil under SWCLK's.
- VTref (pin 1) rises to a 3V3_D row that runs west past TP9, standing up from it, to 3V3_D's label
  on the west edge.
- GND (pins 3 and 5, which the symbol stacks at one point) and GNDDetect (pin 9) drop to a GND row
  under J3 that runs west past TP10, standing up from it, to GND's label on the west edge.
- J3's pins 6, 7 and 8 carry no-connects; pin 7 (KEY) is on J3's west side.
- J3's Reference and Value are above its body, west of the VTref rise; each test point's are east
  of its body.
- Every wire carries copperhead's default stroke.

## usb_dfu: the ROM DFU USB socket

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved. proceed"* (`docs/schematic/verdicts.md`). sha256 `80947ededbb593f37bd87d6e838d232557dfc07c6f6d147ac6257cca5f5a299f`.
Render: `usb_dfu.svg` beside it.

The block: `circuits/h7-platform/module/usb-dfu.ts`, 7 parts (J4
`Connector:USB_C_Receptacle_USB2.0_16P`, U6 `Power_Protection:USBLC6-2SC6`, C49, R13, R14, R15, C50),
ports DFU_USB_DM, DFU_USB_DP and GND.

### The rulings this page rests on

- [CR-MODULE-USB-ESD](../../../docs/h7-platform/decisions.md#cr-module-usb-esd): U6 between the
  socket and the MCU, socket side pins 1 (D+) and 3 (D-), MCU side pins 6 and 4; pin 5 on the
  socket's VBUS and nothing else, with C49 (100 nF) from it to GND next to U6.
- [CR-MODULE-USB-C-PINS](../../../docs/h7-platform/decisions.md#cr-module-usb-c-pins): J4's GND pins
  to GND, A8 and B8 (SBU) no-connects, the shield to GND through R15 (1M) parallel with C50
  (4700pF).
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND is a wire
  ending in its hierarchical label.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Nothing on it is a power input (U6's pin 5 and J4's VBUS are passive in their
  symbols), so ERC needs none, on DFU_VBUS or elsewhere.
- The stroke of DFU_USB_DM and DFU_USB_DP, which the draft drew no wire for: the DFU family's blue,
  by copperhead's own family rule (`usb_dfu/layout.py`, `UNDRAWN_STROKES`, citing
  `draughting/copperhead/src/kicad/draft/engine.ts`). A drawing choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 7, 11, 33 | 7, 11, 33 |
| exported nets carrying a model net name | 7 of 11 | 3 of 11 (/DFU_USB_DM, /DFU_USB_DP, /GND; private nets are unlabelled wire) |
| ERC, the sheet alone | 2 errors (`pin_not_connected` 2: U6's pins 4 and 6, unwired), 0 warnings | 3 errors (`pin_not_connected` 3: each hierarchical label has no parent sheet), 3 warnings (`isolated_pin_label` 2, `lib_symbol_mismatch` 1) |
| ERC under a one-block root, `/usb_dfu/` | 2 errors (`pin_not_connected` 2), 1 warning (`same_local_global_label`) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 5 errors (`hier_label_mismatch` 3, `label_dangling` 2), 2 warnings | 0 errors, 5 warnings (`isolated_pin_label` 4, `lib_symbol_mismatch` 1) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings | 0 | 2: at (170.18, 88.9), GND's drop over the VBUS row; at (170.18, 114.3), D-'s descent over D+'s row |
| T-meetings | 0 | 0 |
| orphan junctions, of total | 0 of 2 | 0 of 10 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 13 on 7 nets (8 global) | 3 on 3 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 13 | 0 of 9 |
| symbols (parts, power symbols, PWR_FLAGs) | 7 (7, 0, 0) | 7 (7, 0, 0) |
| placed pins | 33 | 33 |
| wires, total length | 37, 303.53 mm | 43, 650.24 mm |
| wire corners | 12 | 14 |
| junctions | 2 | 10 |

U6's `lib_symbol_mismatch` warning is in the page column and not in the draft column because the
two were measured in different library contexts, not because the repair changed U6's embedded
symbol. The draft was measured where `make draw` wrote it, beside a `sym-lib-table` that maps
`Power_Protection` to copperhead's vendored `sym-lib-cache`; the page sits beside the committed
`sym-lib-table`, which names only the project library, so KiCad compares U6 (`USBLC6-2SC6`, an
`extends` symbol) with the installed library. Measured with kicad-cli 10.0.5: the draft (sha256
`8961061ef5970c5f567bb53c8adcb63d83636187c63391dbc16ad284c83fe791`) copied beside the committed `sym-lib-table` reports the same one warning on U6. The
power section's U2 warning is the same kind.

**Why the page has two crossings and a long GND row, as the layout records it** (observations of
the symbols, not a judgement of the page). J4 puts D- above D+ and U6 puts D+ (pin 1) above D-
(pin 3), so the two D lines change order once between the parts. CC1 and CC2 leave J4 between VBUS
above and the D lines below, and VBUS ends on U6's top pin, so the CC rows are enclosed by VBUS, U6
and the D lines; GND reaches R13, R14 and C49 there by one drop from a GND row along the top of the
page, which crosses VBUS once and joins the bottom GND row down J4's west side.

### What the page shows, as observations

- J4 on the west, its pins facing east; U6 east of it; DFU_USB_DP and DFU_USB_DM leave U6's east
  side (pins 6 and 4) to their hierarchical labels on the east edge.
- J4's stacked VBUS pins rise to a row along the top, which runs east past C49 and down to U6's pin 5.
  C49 hangs from it next to U6.
- CC1 and CC2 run east along their rows to R13 and R14, lying along them, R14 east of R13.
- J4's two D- pins join and run east, then down across D+'s row to U6's pin 3; its two D+ pins join
  and run east, then down to U6's pin 1.
- GND's hierarchical label is at the top-left. Its row runs east along the top of the page and drops
  across the VBUS row to R13's and R14's east ends and C49's foot; from the label it also runs down
  J4's west side to a bottom row that takes R15, C50, J4's GND pins and U6's pin 2.
- J4's SH drops to a shield row with R15 and C50 hanging from it to the bottom GND row.
- J4's A8 and B8 carry no-connects.
- R13's fields are above it and R14's below it; the others' are beside or above their bodies.
- Wires on DFU_VBUS, the D lines and DFU_USB_DM/DP carry copperhead's blue stroke; the others its
  default.

## id_strap: the module ID strap

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved. proceed"* (`docs/schematic/verdicts.md`). sha256 `7649af4311431f60b159a7d6717c26d136ed3311182f3d5330f11a44eba6cf09`.
Render: `id_strap.svg` beside it.

The block: `circuits/h7-platform/module/id-strap.ts`, 3 parts (R16, R17, C51), ports GND,
MODULE_ID_STRAP and VREF_A (VREF_A reaches one pin, R16's pin 1).

### The rulings this page rests on

- [CR-MODULE-ID-STRAP-VALUES](../../../docs/h7-platform/decisions.md#cr-module-id-strap-values): R16
  "20K" from VREF_A, R17 "2.49K" to GND, C51 ".1uF" at the strap node.
- [CR-MODULE-ID-STRAP-PIN](../../../docs/h7-platform/decisions.md#cr-module-id-strap-pin): the net is
  MODULE_ID_STRAP; which MCU pin it reaches is on the mcu page, not this one.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): VREF_A and GND
  are wires ending in their hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Nothing on it is a power input.
- The stroke of VREF_A, which the draft drew no wire for: copperhead's stroke for a net of no colour
  family (`id_strap/layout.py`, `UNDRAWN_STROKES`). A drawing choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 3, 3, 6 | 3, 3, 6 |
| exported nets carrying a model net name | 2 of 3 | 3 of 3 |
| ERC, the sheet alone | 1 error (`pin_not_connected` 1: R16's pin 1, unwired), 0 warnings | 2 errors (`pin_not_connected` 2: the GND and MODULE_ID_STRAP hierarchical labels have no parent sheet), 1 warning (`isolated_pin_label` 1: VREF_A's label meets one pin) |
| ERC under a one-block root, `/id_strap/` | 1 error (`pin_not_connected` 1) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 4 errors (`hier_label_mismatch` 3, `label_dangling` 1), 2 warnings | 1 error (`label_dangling` 1: the MODULE_ID_STRAP stub label is alone with one block; the GND and VREF_A stubs carry the stand-in flags), 0 warnings |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 1 | 0 of 3 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 2 on 2 nets (0 global) | 3 on 3 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 2 | 0 of 3 |
| symbols (parts, power symbols, PWR_FLAGs) | 3 (3, 0, 0) | 3 (3, 0, 0) |
| placed pins | 6 | 6 |
| wires, total length | 10, 55.88 mm | 11, 88.90 mm |
| wire corners | 5 | 2 |
| junctions | 1 | 3 |

### What the page shows, as observations

- VREF_A's hierarchical label is on the west edge at the top; its row runs east and turns down into
  R16.
- R16 stands above R17 in one column; the strap node between them runs east past C51 to
  MODULE_ID_STRAP's hierarchical label on the east edge.
- R17 and C51 drop to a GND row that runs west to GND's hierarchical label, under VREF_A's.
- Each part's Reference and Value are east of its body.
- Every wire carries copperhead's default stroke.

## qspi: the QSPI flash

**Status: UNREVIEWED.** sha256 `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1`.
Render: `qspi.svg` beside it.

**`verify.sh` exits 0 on this page since ruling
[CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers)**,
with no byte of the page changed (same sha256). The one-block root now places a stand-in driver, a
`Connector:TestPoint`, on FLASH_CLK's stub, because `repair/tools/cross-page-drivers.ts` declares
FLASH_CLK's driver as U1's PF10 on the mcu page; under it `/qspi/` reports 0 errors and 0 warnings.
The module's real root must clear FLASH_CLK with U1's PF10 itself (the section on what the root must
do, above). `erc-control.sh` controls 10 to 12 hold it: the page verifies, it fails with
`pin_not_driven` on U4's CLK when the entry is removed through the test override, and an entry naming
a pin off the net is refused.

**The history, kept: before the ruling, `verify.sh` exited 1 on this page.** The model
comparison gives 0 disagreements. Under the one-block root, ERC reports one error on `/qspi/`:
`pin_not_driven`, *"Input pin not driven by any Output pins"*, on *"Symbol U4 Pin 6 [CLK, Input,
Line]"*. U4's CLK is the only pin on FLASH_CLK on this page, and its driver is U1's PF10 on the mcu
page (`circuits/h7-platform/module-pins.ts`, FLASH_CLK on PF10). The one-block root holds only this
block, so the stub has no driver. The same error is on the draft. The committed check of that cause
is `repair/tools/erc-control.sh`: control 10 shows `/qspi/` at 0 errors and 0 warnings with a driver
on FLASH_CLK's stub, and control 11 shows the same page failing with `pin_not_driven` on U4's CLK
without one. (A scratch root holding this page and the mcu draft was measured once before the
ruling and gave `/qspi/` 0 errors and 0 warnings; nothing committed re-runs it, so it is not cited
as evidence here.) The other three inputs on the page are not reported: /CS has R10 on its net, a
passive pin, and IO0 to IO3 are bidirectional. So the error comes from the check's context, not from
a disagreement between the page and the model. It was a failing check until the controller ruled on
what the one-block root should hold for a net whose driver is on another page, and the harness was
not changed for it before that ruling.

The block: `circuits/h7-platform/module/qspi.ts`, 3 parts (U4 `Memory_Flash:W25Q128JVS`, R10, C43),
ports 3V3_D, FLASH_CLK, FLASH_IO0 to FLASH_IO3, FLASH_NCS and GND (FLASH_CLK and FLASH_IO0 to IO3
each reach one pin).

### The rulings this page rests on

- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D and GND
  are rows ending in their hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. U4's VCC (3V3_D) and GND are power inputs, so the sheet alone reports
  `power_pin_not_driven` on both; under the one-block root the stubs carry their flags, which clears
  both.
- The stroke of the five FLASH nets the draft drew no wire for: the default stroke the draft gives
  FLASH_NCS (`qspi/layout.py`, `UNDRAWN_STROKES`, which says why no family colour was taken). A
  drawing choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| exported components, nets, net members | 3, 8, 12 | 3, 8, 12 |
| exported nets carrying a model net name | 3 of 8 | 8 of 8 |
| ERC, the sheet alone | 8 errors (`pin_not_connected` 5: U4's five one-pin signals, unwired; `pin_not_driven` 1; `power_pin_not_driven` 2), 0 warnings | 8 errors (`pin_not_connected` 5: hierarchical labels with no parent sheet; `pin_not_driven` 1, U4's CLK; `power_pin_not_driven` 2, on 3V3_D and GND), 6 warnings (`isolated_pin_label` 5, `lib_symbol_mismatch` 1) |
| ERC under a one-block root, `/qspi/`, before the ruling (no stand-in) | 8 errors (`pin_not_connected` 5, `pin_not_driven` 1, `power_pin_not_driven` 2), 1 warning | 1 error (`pin_not_driven` 1: U4's CLK, see above), 0 warnings |
| ERC under a one-block root, `/`, before the ruling | 14 errors (`hier_label_mismatch` 8, `label_dangling` 6), 3 warnings | 1 error (`label_dangling` 1: FLASH_NCS's stub label is alone with one block), 11 warnings (`isolated_pin_label` 10, `lib_symbol_mismatch` 1) |
| ERC under a one-block root, `/qspi/`, with FLASH_CLK's stand-in (the ruling) | not run | **0 errors, 0 warnings** |
| ERC under a one-block root, `/`, with FLASH_CLK's stand-in | not run | 1 error (`label_dangling` 1: FLASH_NCS's stub), 9 warnings (`isolated_pin_label` 8, `lib_symbol_mismatch` 1) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 0 | 0 of 4 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 4 on 3 nets (2 global) | 8 on 8 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 4 | 0 of 8 |
| symbols (parts, power symbols, PWR_FLAGs) | 3 (3, 0, 0) | 3 (3, 0, 0) |
| placed pins | 12 | 12 |
| wires, total length | 12, 116.84 mm | 18, 317.50 mm |
| wire corners | 6 | 2 |
| junctions | 0 | 4 |

U4's `lib_symbol_mismatch` warning is in the page column and not in the draft column because the
two were measured in different library contexts, not because the repair changed U4's embedded
symbol. The draft was measured where `make draw` wrote it, beside a `sym-lib-table` that maps
`Memory_Flash` to copperhead's vendored `sym-lib-cache`; the page sits beside the committed
`sym-lib-table`, which names only the project library, so KiCad compares U4 (`W25Q128JVS`, an
`extends` symbol) with the installed library. Measured with kicad-cli 10.0.5: the draft (sha256
`1cde054c9d8e9d8cf2e362503d47a140ea39cf69bc709774d2ee9aa4e1a4c788`) copied beside the committed `sym-lib-table` reports the same one warning on U4. The
power section's U2 warning is the same kind.

Before the ruling, the page-side measurements came from the same steps as `verify.sh`, run without
stopping, because `verify.sh` stopped at the ERC failure before its crossings, junction, label, paper
and counts steps. Since the ruling `verify.sh` runs every step on the page and gives the same values.

### What the page shows, as observations

- U4 stands in the middle with its six signal pins facing west; each runs west on its own row to its
  hierarchical label on the west edge: FLASH_NCS, FLASH_CLK, FLASH_IO0, FLASH_IO1, FLASH_IO2,
  FLASH_IO3, top to bottom, in the symbol's pin order.
- A 3V3_D row along the top, from its label on the west edge, takes R10, U4's VCC (pin 8) and C43.
  R10 stands between it and the FLASH_NCS row, pin 2 up.
- A GND row along the bottom, from its label, takes U4's GND (pin 4) and C43.
- R10's and C43's fields are east of their bodies; U4's are above its body, east of the VCC rise.
- Every wire carries copperhead's default stroke.

## vdda: the VDDA bead, bank and damping leg (Task 7c)

**Status: UNREVIEWED.** sha256 `7f066a9ab786252b592d14ffaa8886e934876bcc678666b73c1922f06eee2444`.
Render: `vdda.svg` beside it.

Repaired by the Task 7b steps ("How the Task 7b pages are repaired", above), with `repair/vdda/layout.py`
and `repair/vdda/02-wire.py`; `repair/replay.sh` runs it through `repair_block`.

The block: `circuits/h7-platform/module/vdda.ts`, 8 parts (FB1 `Device:FerriteBead`, C21 to C25, R1,
R2), ports 3V3_D, GND, VREF_A and VSSA (3V3_D reaches one pin, FB1's pin 1; GND reaches one pin,
R2's pin 2).

### The rulings this page rests on

- [CR-MODULE-VDDA-BANK](../../../docs/h7-platform/decisions.md#cr-module-vdda-bank): the bank C21,
  C22 (10uF) and C23, C24 (.1uF) from VREF_A to VSSA, and the damping leg R1 ("0R3") in series with
  C25 (22uF) across the bank, never in VDDA's DC path. Drawn exactly as the model holds them. **The
  open item VDDA-DAMPING-LEG stays open**: the ruling leaves it conditional on Murata's impedance
  curve and the capacitors' DC-bias curves, and this page settles nothing about it.
- [CR-MODULE-BEAD-VALUE](../../../docs/h7-platform/decisions.md#cr-module-bead-value): FB1 reads
  "220R@100MHz", the bead's rating, not the model's analysis inductance.
- [CR-MODULE-SUBOHM-RKM](../../../docs/h7-platform/decisions.md#cr-module-subohm-rkm): R1 reads
  "0R3"; R2 reads "0R".
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D, VREF_A,
  VSSA and GND are wires ending in their hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Nothing on it is a power input (every pin is passive), so ERC needs none here; the
  flags of 3V3_D, VREF_A and VSSA live on the root and GND's on the power page, and the one-block
  root's stubs carry all four. `pwr-flag-homes.ts` is unchanged.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  no entry needed; the page has no input pin.
- The stroke of 3V3_D and GND, which the draft drew no wire for: copperhead's stroke for a net of no
  colour family, which every net the draft draws here carries (`vdda/layout.py`,
  `UNDRAWN_STROKES`). A drawing choice, not a transcription.

### Measurements, before (the draft) and after (this page)

The draft column is `verify.sh`'s steps run without stopping on the draft. The draft now fails the
port-label row, which did not exist when the Task 7b drafts were measured: a draft carries no
hierarchical label, so no port's net is named `/<port>`.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| ports on the wrong net (CR-MODULE-PORT-LABEL-CHECK) | 4 of 4 (no net `/<port>`; 3V3_D and GND unwired) | 0 of 4 |
| exported components, nets, net members | 8, 5, 16 | 8, 5, 16 |
| exported nets carrying a model net name | 3 of 5 (/DAMP, VREF_A, VSSA) | 4 of 5 (/3V3_D, /GND, /VREF_A, /VSSA; DAMP is unlabelled wire) |
| ERC, the sheet alone | 2 errors (`pin_not_connected` 2: FB1's pin 1 and R2's pin 2, unwired), 0 warnings | 4 errors (`pin_not_connected` 4: each hierarchical label has no parent sheet), 2 warnings (`isolated_pin_label` 2: 3V3_D's and GND's labels each meet one pin) |
| ERC under a one-block root, `/vdda/` | 2 errors (`pin_not_connected` 2), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 4 errors (`hier_label_mismatch` 4), 4 warnings (`isolated_pin_label` 4) | 0 errors, 0 warnings (every stub carries a PWR_FLAG) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 2 | 0 of 10 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 7 on 3 nets (6 global) | 4 on 4 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 7 | 0 of 5 |
| symbols (parts, power symbols, PWR_FLAGs) | 8 (8, 0, 0) | 8 (8, 0, 0) |
| placed pins | 16 | 16 |
| wires, total length | 23, 151.13 mm | 25, 271.78 mm |
| wire corners | 9 | 0 |
| junctions | 2 | 10 |

### What the page shows, as observations

- Two rows across the page. The top row: 3V3_D's hierarchical label on the west edge, FB1 lying
  along the row (pin 1 west), then the VREF_A row east to VREF_A's hierarchical label on the east
  edge.
- The bottom row: GND's hierarchical label on the west edge, under 3V3_D's, R2 lying along the row
  (pin 2, GND, west), then the VSSA row east to VSSA's hierarchical label on the east edge, under
  VREF_A's.
- C21, C22, C23 and C24 stand between the two rows, west to east, each with pin 1 up to VREF_A and
  pin 2 down to VSSA.
- East of them, the damping leg stands in one column: R1 from the VREF_A row down to the DAMP node,
  C25 from DAMP down to the VSSA row.
- FB1's and R2's Reference and Value are centred above their bodies, Reference over Value; every
  other part's are east of its body.
- Every wire carries copperhead's default stroke.
