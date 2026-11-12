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

The root sheet, its `.kicad_pro` and the block sheets not listed above are not drawn yet. This table
has no root row, so `registerDraftedProjectTests` is not yet bound to this directory.

| page | status | render |
| --- | --- | --- |
| power | **reviewed 2026-11-12**, *"approved"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `power.svg` |
| interface | UNREVIEWED | `interface.svg` |
| clock | UNREVIEWED | `clock.svg` |

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

## interface: the two module headers

**Status: UNREVIEWED.** sha256 `0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296`.
Render: `interface.svg` beside it.

The block: `circuits/h7-platform/module/interface.ts`, 2 parts (J1, J2, `Connector_Generic:Conn_01x20`),
36 ports: GND on J1.20 and J2.20, and 35 that each reach one pad.

### The rulings this page rests on

- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): GND, 3V3_D,
  VREF_A and VIN_MOD are wires ending in hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Nothing on it is a power input, so ERC needs none here.
- The stroke of the 35 nets the draft drew no wire for: copperhead's stroke for a net of no colour
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

**Status: UNREVIEWED.** sha256 `83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1`.
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
