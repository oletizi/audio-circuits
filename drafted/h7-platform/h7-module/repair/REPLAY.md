# Replaying the h7-module drawing

**What this is.** The record of how the sheets in `..` were made from a fresh
`make -C boards/h7-module draw` (`TOOLING.md` step 5.5, and design change C3 for what a multi-page
board adds). It grows one block at a time as each page is repaired. Today: all twelve drafts are
checked, and the power page and the Task 7b, Task 7c and Task 7d pages in the table below, every block, are
repaired, and the root sheet is assembled with its `.kicad_pro` (Task 7e).

| | sha256 |
| --- | --- |
| start: each block's draft, `build/draw/h7-module/<block>/<block>.kicad_sch` as `make draw` writes it (re-papered to US Letter) | the twelve values in `../RECORD.md`, "The drafts every repair starts from", and in `replay.sh` |
| end: `power.kicad_sch` | `906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f` |
| end: `interface.kicad_sch` | `0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296` |
| end: `clock.kicad_sch` | `83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1` |
| end: `reset_boot.kicad_sch` (Task 7e fix round 1: U5 on `h7-platform:TLV803EA30DBZR`; the approved bytes were `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397`) | `00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24` |
| end: `swd.kicad_sch` | `486923651c80caf44123005ed47fcb5a756c128674a052a4f99727a96b8cfef8` |
| end: `usb_dfu.kicad_sch` | `80947ededbb593f37bd87d6e838d232557dfc07c6f6d147ac6257cca5f5a299f` |
| end: `id_strap.kicad_sch` | `7649af4311431f60b159a7d6717c26d136ed3311182f3d5330f11a44eba6cf09` |
| end: `qspi.kicad_sch` | `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1` |
| end: `vdda.kicad_sch` (Task 7c) | `7f066a9ab786252b592d14ffaa8886e934876bcc678666b73c1922f06eee2444` |
| end: `sdram.kicad_sch` (Task 7c) | `0812ab0287bdb8e126f8bd3b2d4a09e54251ee6dc0e62e784d871b9947a48bcf` |
| end: `decoupling.kicad_sch` (Task 7c) | `8d20ff5196f59330bb77424024d856124808d3d49c5affe89db56f7516c416cb` |
| end: `mcu.kicad_sch` (Task 7d) | `c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981` |
| start: the root's blank text, `assemble-root.ts blank h7-module` (Task 7e) | `134c620e32f4587ab861a8210298ae31533ca041247b3bb183f8e1b13eef25d2` |
| end: `h7-module.kicad_sch`, the root (Task 7e fix round 1: on US Letter, CR-MODULE-ROOT-FITS-LETTER; at Task 7e it was `fd7baeabadac2ed81049b24484c8ee53c27f82fbcb5efb569a1328726fef1d86`) | `3590b959500bd1a3d359915094601450f5437ce071a644dad084aa20e98a99ed` |
| end: `h7-module.kicad_pro` (Task 7e) | `62905f75e8abc6cf0890616b8021b8a31140395b01575e817e372bbd6f09a5a0` |

## Replay

From the repository root, into a new or empty directory outside the repository (`replay.sh`
refuses a non-empty one; it stops non-zero, naming the step, when any step cannot run or any file
differs):

```
bash drafted/h7-platform/h7-module/repair/replay.sh <work-dir>
```

`replay.sh` does, in order:

1. `make -C boards/h7-module draw` (this writes `build/draw/h7-module*` inside the repository,
   overwriting any draft already there). Checks it printed NO `NO INDEPENDENT NETLIST:` block (since
   Task 7e the board declares the root's export as its netlist, so make draw checks each page's
   partition against it), that each
   block's generated intent is byte-identical to `<block>/intent.json`, and that each draft's
   sha256 is the recorded one. A model change since this record stops the replay here, by block.
2. The power page, each generated file checked against the committed copy in `power/`, each op-list
   through `akcli plan` and then `akcli draw --apply`, which must report `APPLIED`:
   1. `draughting/pages/net_strokes.py` on the draft: copperhead's stroke per net (`net_strokes.json`).
   2. `power/01-place.py` on the draft (`01-place.json`).
   3. `draughting/pages/pins.py` on the placed sheet: every pin point akcli reports, cross-checked against the
      sheet's own `lib_symbols` (`pins.json`).
   4. `power/02-wire.py` (`02-wire.json` and its sidecar `02-wire.nets.json`).
   5. `power/03-pwr-flags.py` (`03-pwr-flags.json`).
   6. `bun tools/draught/hierarchical-labels.ts ops <module> power <sheet>`
      (`04-hierarchical-labels.json`), then its `check`, the post-condition.
   7. `power/05-text-edits.py`: strokes, fields, the group rectangle.
   Then the sheet's sha256 must be the end value above, and the sheet byte-identical to
   `../power.kicad_sch`.
3. Each Task 7b page, then each Task 7c page, then the Task 7d page (mcu), in the order of the table above, by `repair_block` with the shared tools
   (`../RECORD.md`, "How the Task 7b pages are repaired"), each generated file checked against the
   committed copy in `<block>/` and each op-list applied as for power: `draughting/pages/ports.ts`,
   `draughting/pages/net_strokes.py`, `draughting/pages/place.py`, `draughting/pages/pins.py`, `<block>/02-wire.py`,
   `<block>/03-pwr-flags.py` where one exists, `hierarchical-labels.ts ops` then `check`, and
   `draughting/pages/text_edits.py`. Then the sheet's sha256 must be its end value above, and the sheet
   byte-identical to `../<block>.kicad_sch`.
4. Makes the `sym-lib-table` (one row, `h7-platform`, naming
   `circuits/h7-platform/h7-platform.kicad_sym` in place in the repository; design change C4) and
   checks it is byte-identical to `../sym-lib-table`.
5. The root (Task 7e), each op-list checked against `root/` and applied as above:
   `assemble-root.ts blank` (its sha256 checked), `assemble-root.ts ops` (`root/01-assemble.json`),
   `draughting/pages/root-flags.ts` (`root/02-pwr-flags.json`), `draughting/pages/root_flag_refs.py`, `draughting/repair/root_pin_justify.py`
   (since Task 7e fix round 1); the root's sha256 must
   be its end value and the sheet byte-identical to `../h7-module.kicad_sch`. Then
   `draughting/pages/kicad-pro.ts` writes the `.kicad_pro`, which must reach its sha256 and be byte-identical to
   `../h7-module.kicad_pro`; and every block sheet must still be byte-identical to its committed copy.

Toolchain: copperhead 0.12.0 and akcli 0.22.0 under `draughting/` (`make draught-doctor` matched
every pinned tool), kicad-cli 10.0.5, python3, bun. Replayed on 2026-11-12 into a new directory and
reached every sha256 (again after Task 7c, with its three pages, after Task 7d, with mcu, and after
Task 7e, with the root and its `.kicad_pro`, and after Task 7e fix round 1, with reset_boot's U5 on
`h7-platform:TLV803EA30DBZR` and the root on US Letter).

Then, to check and look at a page (the tools are in `draughting/pages/` since the H7 pedal plan's
Task 4, each given this board's drafted directory; `tools/` here keeps the module's tables, its
title-block date and its controls):

```
sh draughting/pages/verify.sh drafted/h7-platform/h7-module <block> <sheet.kicad_sch>
sh draughting/pages/render.sh <sheet.kicad_sch> <out-dir>
sh draughting/pages/verify-root.sh drafted/h7-platform/h7-module
sh draughting/pages/render.sh drafted/h7-platform/h7-module/h7-module.kicad_sch <out-dir> root
sh drafted/h7-platform/h7-module/repair/tools/erc-control.sh     (every control, the root's, render's and port labels' among them)
```

## The files

| file | what it is |
| --- | --- |
| `<block>/intent.json`, all twelve | the copperhead intent `drawingPages()` generated for each block at draft time |
| `power/layout.py` | every power-page part's position and rotation, and the rows and columns the wiring uses, in mils; the one place this page's placement is written |
| `power/01-place.py` -> `01-place.json` | akcli op-list: delete copperhead's wires, labels, junctions and no-connects; move and orient the 19 parts. Refuses a draft carrying a power symbol |
| `power/02-wire.py` -> `02-wire.json`, `02-wire.nets.json` | akcli op-list: every wire as one straight segment, with the net it is drawn for (the sidecar); a junction wherever three or more connections meet; U2's RT no-connect; one local label per port net; the title block. Refuses a segment ending inside another and a pin on a wire's interior |
| `power/03-pwr-flags.py` -> `03-pwr-flags.json` | akcli op-list: one PWR_FLAG on VIN_BUCK and one on GND, and why (ERC `power_pin_not_driven`; a PWR_FLAG joins no nets by name, and two on one net are a `pin_to_pin` error across sheets, both measured; ruling CR-MODULE-PWR-FLAGS) |
| `power/04-hierarchical-labels.json` | akcli op-list from `tools/draught/hierarchical-labels.ts`: each port's local label deleted by uuid and a hierarchical label added at its place |
| `power/net_strokes.json`, `power/pins.json` | generated by the shared tools below; checked by the replay |
| `power/05-text-edits.py` | what akcli 0.22.0 has no op for: wire strokes, every part's Reference and Value, the group rectangle |
| `draughting/pages/` | **the shared page tools** (moved there from `tools/` by the H7 pedal plan's Task 4; `TOOLING.md`, design change C3, "The page tools a multi-page board is repaired and checked with"). Each takes this board's drafted directory, `drafted/h7-platform/h7-module`, where it reads the model or the tables below. The rows that follow describe them as the module uses them |
| `draughting/pages/net_strokes.py`, `draughting/pages/pins.py` | copperhead's stroke per net on the draft, and every pin point akcli reports; first copied from `../../h7-carrier/repair/`, with only the repository-root depth changed |
| `draughting/pages/counts.py` | copied from the carrier's, with the root depth changed and symbols told apart by lib_id (parts, power symbols, PWR_FLAGs), since akcli names a PWR_FLAG `#PWR0n` |
| `draughting/pages/depth.py` | copied unchanged from `../../h7-carrier/repair/` |
| `draughting/pages/erc_counts.py` | copied from the carrier's, but it NEVER FAILS: it reports the block sheet alone, which carries `pin_not_connected` errors on its hierarchical labels (not one per label in every case: 31 on sdram's 41). The carrier's fails on any error since issue 32. The block's ERC verdict is `erc_sheets.py`'s |
| `draughting/pages/erc_sheets.py` | ERC errors and warnings by sheet path, for the one-block root; excuses a violation only on an exact match with a declared allowance (sheet, type, the two designator and pin pairs; `erc_match.py`'s rule, which `root_erc.py` shares), naming its ruling; fails an allowance matched more than once, and reports a stale allowance |
| `draughting/pages/erc_match.py` | the one allowance-matching rule, imported by `erc_sheets.py` and `root_erc.py` (final review M6) |
| `draughting/pages/flag_rewrite.py` | the FLGPROBE rewrite `flag_probe.py` and `hierarchy_flag_probe.py` share (final review M6) |
| `draughting/pages/board.ts`, `draughting/pages/table-input.ts`, `draughting/pages/tables.ts` | the board a tool runs for (its model, through `boards/h7-module/perfboard.json`), the input helpers every table shares (the shape checks, the table importer that refuses a missing table naming it, the announced test-override reader, the designator resolver), and the first step of `verify.sh` and `verify-root.sh`, which requires all three tables |
| `tools/erc-allowances.ts` (data) and `draughting/pages/erc-allowances.ts` (logic) | the one declared table of the module's ERC allowances (ruling CR-MODULE-VCAP-ERC), and the tool that holds it to `h7Module()` on every run and writes it as JSON for `erc_sheets.py`; `PAGES_ERC_ALLOWANCES_TABLE` is its announced test override |
| `draughting/pages/block-netcompare.ts` | `compareSheetToModel` of a block sheet's `kicad-cli` export against `h7Module()` restricted to that block's components (`Network.blocks`); exits 1 on a component, net, pin or value disagreement, and on a port whose label is not on the port's pins (`port-labels.ts`, ruling CR-MODULE-PORT-LABEL-CHECK) |
| `draughting/pages/port-labels.ts` | each port's net `/<port>` in a block sheet's export must hold exactly the pins `drawingPages()` gives that port; a failure names the port, the pins expected and the pins found |
| `draughting/pages/one-block-root.ts` | a root holding one block sheet, from `tools/draught/assemble-root.ts`, so ERC sees each hierarchical label meet a sheet pin, with a PWR_FLAG on each stub whose net's flag lives off the block (`tools/pwr-flag-homes.ts`) and a stand-in driver on each net `tools/cross-page-drivers.ts` drives from another page; what it writes is scratch, never committed |
| `draughting/pages/erc-one-block-root.sh` | ERC on one block sheet under that root, judged by `erc_sheets.py`; called by `verify.sh` and by `tools/erc-control.sh` |
| `tools/pwr-flag-homes.ts` (data) and `draughting/pages/flag-homes.ts` (logic) | the one table of where each shared module net's single PWR_FLAG lives (ruling CR-MODULE-PWR-FLAGS), and its reader |
| `tools/cross-page-drivers.ts` (data) and `draughting/pages/cross-page-drivers.ts` (logic) | the one table of the module's signal nets whose driver is on another page (ruling CR-MODULE-CROSS-PAGE-DRIVERS), and its model check; `PAGES_CROSS_PAGE_DRIVERS_TABLE` is its announced test override |
| `tools/title_block.py` | the date the module's pages' title blocks carry, which `draughting/pages/page.py`'s `Wiring.op_list` takes from each `<block>/02-wire.py` |
| `draughting/pages/flag_probe.py`, `draughting/pages/flag-check.ts` | a probe copy whose PWR_FLAGs (found by lib_id) the `kicad-cli` export lists, and the check on that export failing a flag on a shared net whose flag lives elsewhere, naming the net |
| `draughting/pages/flag_at_label.py`, `draughting/pages/strip_pwr_flags.py` | for `tools/erc-control.sh`'s controls: add a PWR_FLAG at a hierarchical label; remove every placed PWR_FLAG |
| `tools/erc-control.sh` | the module's controls for `verify.sh`'s ERC and PWR_FLAG verdicts, each of which must come out as stated; control 13 runs `tools/port-label-control.sh`; controls 14 to 17 hold the VCAP allowance; control 18 runs `tools/root-control.sh`; control 19 runs `draughting/pages/render-control.sh` on reset_boot; control 20 isolates the allowance model check's pin-type, designator and same-pin refusals. It stays with the module because every control names its pages, nets, pins and rulings |
| `tools/port-label-control.sh`, `draughting/pages/label_tamper.py` | the port-label controls: eleven of the twelve committed block pages (all but mcu) verify; scratch copies with two labels swapped (interface) or one deleted (qspi), made by `label_tamper.py` parsing by parenthesis depth, fail naming the port; `Wiring.op_list` refuses a label on another net's wire |
| `draughting/pages/verify.sh` | the verification set for one block sheet, `sh draughting/pages/verify.sh <board-dir> <block> <sheet>`: the board's tables, sha256, depth, the comparison above, the PWR_FLAG homes, ERC alone and under the one-block root, the `draughting/measure/` selftest, crossings, junction audit, label survey, paper fit, counts. First copied from the carrier's, with the block argument |
| `draughting/pages/render.sh` | PDF, SVG and a 150 dpi PNG of one sheet, copied from the carrier's. A third argument, `root` or a KiCad page number, renders that one page of a multi-page export (the root's 13 pages; kicad-cli `--pages`); with none, a multi-page PDF is refused. kicad-cli 10.0.5's SVG export ignores `--pages` for a sub-sheet page and writes the root, so the script compares the SVG's title-block `Sheet:` text with the PDF's and, on a mismatch, deletes every output and refuses naming both sheets: a sub-sheet page cannot be rendered through the root, only `root` can |
| `draughting/pages/render-control.sh` | the controls for that check, `sh draughting/pages/render-control.sh <board-dir> <block>`, on a scratch copy: `root` renders with matching sheets; the block's page number (the module's controls use reset_boot) is refused naming `/reset_boot/` and `/` and leaves no output (before the check, that run exited 0 and wrote a PDF and PNG of reset_boot beside an SVG of the root); and kicad-cli's own SVG of that page is measured to be the root. `tools/erc-control.sh` runs it as its control 19 |
| `draughting/pages/root_pages.py`, `draughting/pages/svg_stroked_text.py` | measures `verify-root.sh` reports and does not judge: the page number each sheet of the root carries; and the drawn text of the committed render (overlapping text ink boxes, ink crossing a sheet box edge) |
| `draughting/repair/root_pin_justify.py` (moved from `tools/` by the final review, M5: nothing in it is board-specific) | root step 5 (Task 7e fix round 1): every root sheet pin's name justified into its box, west left and east right, as KiCad writes them; akcli 0.22.0 writes no justify. Refuses a count other than `root/01-assemble.json`'s, and a second run |
| `draughting/measure/root_sheets_fit.py` (moved from `tools/` likewise) | every root sheet box inside US Letter's inner frame and clear of the title block (`paper_fit.py` does not measure a sheet box); run by `verify-root.sh`, controlled by `tools/root-control.sh` control 10 |
| `draughting/pages/verify-root.sh`, `tools/root-control.sh` | the root's verification set, `sh draughting/pages/verify-root.sh <board-dir> [project-dir]` (fails on ERC, on `paper_fit.py` not reporting "fits: yes", and on a sheet box off the paper), and the module's ten controls for it; `tools/erc-control.sh` runs the controls as its control 18 |
| `draughting/pages/root-netcompare.ts`, `root-drivers.ts`, `hierarchy_flag_probe.py`, `hierarchy-flags.ts`, `root_erc.py`, `root_tamper.py` | the root's export against the whole model; each cross-page driver entry on its net with its real driver; the whole-hierarchy PWR_FLAG check; the root's ERC verdict; and the scratch edits `tools/root-control.sh` makes |
| `draughting/pages/root-flags.ts`, `draughting/pages/root_flag_refs.py`, `draughting/pages/kicad-pro.ts` | root steps 3, 4 and 6: the root-held PWR_FLAGs from `tools/pwr-flag-homes.ts`, their `#FLG0<n>` references, and the `.kicad_pro` from `tools/erc-allowances.ts` |
| `draughting/pages/page.py` | the shared op-list writers for the Task 7b to 7d pages: `load_layout`, `place_ops` (op-list 01), `Wiring` (op-list 02, with its refusals, among them a port label on a wire drawn for another net; the title block's date is the board's, `tools/title_block.py`), and the field placements `layout.py` uses |
| `draughting/pages/place.py`, `draughting/pages/text_edits.py` | op-list 01, and the direct text edits (strokes, fields, the group rectangle), for any Task 7b block, driven by its `layout.py` |
| `draughting/pages/ports.ts` | a block's ports and the pins each reaches, from `drawingPages()` (`<block>/ports.json`) |
| `<block>/layout.py`, Task 7b, 7c and 7d blocks | every part's position, rotation and mirror, the rows and columns its wiring uses, its field placements, group rectangle and title, and the stroke of any net the draft drew no wire for |
| `<block>/02-wire.py`, Task 7b, 7c and 7d blocks | the block's wiring through `draughting/pages/page.py`'s `Wiring`, with the date from `tools/title_block.py` |
| `<block>/ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`, `02-wire.nets.json`, `04-hierarchical-labels.json`, Task 7b, 7c and 7d blocks | generated by the steps above; checked by the replay |
| `replay.sh` | the replay above |
