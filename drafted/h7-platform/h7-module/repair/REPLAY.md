# Replaying the h7-module drawing

**What this is.** The record of how the sheets in `..` were made from a fresh
`make -C boards/h7-module draw` (`TOOLING.md` step 5.5, and design change C3 for what a multi-page
board adds). It grows one block at a time as each page is repaired. Today: all twelve drafts are
checked, and the power page and the Task 7b pages in the table below are repaired. The root sheet
is not assembled yet.

| | sha256 |
| --- | --- |
| start: each block's draft, `build/draw/h7-module/<block>/<block>.kicad_sch` as `make draw` writes it (re-papered to US Letter) | the twelve values in `../RECORD.md`, "The drafts every repair starts from", and in `replay.sh` |
| end: `power.kicad_sch` | `906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f` |
| end: `interface.kicad_sch` | `0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296` |
| end: `clock.kicad_sch` | `83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1` |
| end: `reset_boot.kicad_sch` | `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397` |
| end: `swd.kicad_sch` | `486923651c80caf44123005ed47fcb5a756c128674a052a4f99727a96b8cfef8` |
| end: `usb_dfu.kicad_sch` | `80947ededbb593f37bd87d6e838d232557dfc07c6f6d147ac6257cca5f5a299f` |
| end: `id_strap.kicad_sch` | `7649af4311431f60b159a7d6717c26d136ed3311182f3d5330f11a44eba6cf09` |
| end: `qspi.kicad_sch` | `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1` |

## Replay

From the repository root, into a new or empty directory outside the repository (`replay.sh`
refuses a non-empty one; it stops non-zero, naming the step, when any step cannot run or any file
differs):

```
bash drafted/h7-platform/h7-module/repair/replay.sh <work-dir>
```

`replay.sh` does, in order:

1. `make -C boards/h7-module draw` (this writes `build/draw/h7-module*` inside the repository,
   overwriting any draft already there). Checks it printed `NO INDEPENDENT NETLIST:`, that each
   block's generated intent is byte-identical to `<block>/intent.json`, and that each draft's
   sha256 is the recorded one. A model change since this record stops the replay here, by block.
2. The power page, each generated file checked against the committed copy in `power/`, each op-list
   through `akcli plan` and then `akcli draw --apply`, which must report `APPLIED`:
   1. `tools/net_strokes.py` on the draft: copperhead's stroke per net (`net_strokes.json`).
   2. `power/01-place.py` on the draft (`01-place.json`).
   3. `tools/pins.py` on the placed sheet: every pin point akcli reports, cross-checked against the
      sheet's own `lib_symbols` (`pins.json`).
   4. `power/02-wire.py` (`02-wire.json` and its sidecar `02-wire.nets.json`).
   5. `power/03-pwr-flags.py` (`03-pwr-flags.json`).
   6. `bun tools/draught/hierarchical-labels.ts ops <module> power <sheet>`
      (`04-hierarchical-labels.json`), then its `check`, the post-condition.
   7. `power/05-text-edits.py`: strokes, fields, the group rectangle.
   Then the sheet's sha256 must be the end value above, and the sheet byte-identical to
   `../power.kicad_sch`.
3. Each Task 7b page, in the order of the table above, by `repair_block` with the shared tools
   (`../RECORD.md`, "How the Task 7b pages are repaired"), each generated file checked against the
   committed copy in `<block>/` and each op-list applied as for power: `tools/ports.ts`,
   `tools/net_strokes.py`, `tools/place.py`, `tools/pins.py`, `<block>/02-wire.py`,
   `<block>/03-pwr-flags.py` where one exists, `hierarchical-labels.ts ops` then `check`, and
   `tools/text_edits.py`. Then the sheet's sha256 must be its end value above, and the sheet
   byte-identical to `../<block>.kicad_sch`.
4. Makes the `sym-lib-table` (one row, `h7-platform`, naming
   `circuits/h7-platform/h7-platform.kicad_sym` in place in the repository; design change C4) and
   checks it is byte-identical to `../sym-lib-table`.

Toolchain: copperhead 0.12.0 and akcli 0.22.0 under `draughting/` (`make draught-doctor` matched
every pinned tool), kicad-cli 10.0.5, python3, bun. Replayed on 2026-11-12 into a new directory and
reached every sha256.

Then, to check and look at a page:

```
sh drafted/h7-platform/h7-module/repair/tools/verify.sh <block> <sheet.kicad_sch>
sh drafted/h7-platform/h7-module/repair/tools/render.sh <sheet.kicad_sch> <out-dir>
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
| `tools/net_strokes.py`, `tools/pins.py` | copied from `../../h7-carrier/repair/`, with only the repository-root depth changed (`parents[5]`) |
| `tools/counts.py` | copied from the carrier's, with the root depth changed and symbols told apart by lib_id (parts, power symbols, PWR_FLAGs), since akcli names a PWR_FLAG `#PWR0n` |
| `tools/depth.py` | copied unchanged from `../../h7-carrier/repair/` |
| `tools/erc_counts.py` | copied from the carrier's, but it NEVER FAILS: it reports the block sheet alone, which always carries one `pin_not_connected` per hierarchical label. The carrier's fails on any error since issue 32. The block's ERC verdict is `erc_sheets.py`'s |
| `tools/erc_sheets.py` | ERC errors and warnings by sheet path, for the one-block root |
| `tools/block-netcompare.ts` | `compareSheetToModel` of a block sheet's `kicad-cli` export against `h7Module()` restricted to that block's components (`Network.blocks`); exits 1 on a component, net, pin or value disagreement |
| `tools/one-block-root.ts` | a root holding one block sheet, from `tools/draught/assemble-root.ts`, so ERC sees each hierarchical label meet a sheet pin, with a PWR_FLAG on each stub whose net's flag lives off the block (`pwr-flag-homes.ts`); what it writes is scratch, never committed |
| `tools/erc-one-block-root.sh` | ERC on one block sheet under that root, judged by `erc_sheets.py`; called by `verify.sh` and by `erc-control.sh` |
| `tools/pwr-flag-homes.ts` | the one table of where each shared module net's single PWR_FLAG lives (ruling CR-MODULE-PWR-FLAGS) |
| `tools/flag_probe.py`, `tools/flag-check.ts` | a probe copy whose PWR_FLAGs (found by lib_id) the `kicad-cli` export lists, and the check on that export failing a flag on a shared net whose flag lives elsewhere, naming the net |
| `tools/flag_at_label.py`, `tools/strip_pwr_flags.py` | for `erc-control.sh`'s controls: add a PWR_FLAG at a hierarchical label; remove every placed PWR_FLAG |
| `tools/erc-control.sh` | the controls for `verify.sh`'s ERC and PWR_FLAG verdicts, each of which must come out as stated |
| `tools/verify.sh` | the verification set for one block sheet: sha256, depth, the comparison above, the PWR_FLAG homes, ERC alone and under the one-block root, the `draughting/measure/` selftest, crossings, junction audit, label survey, paper fit, counts. Copied from the carrier's, with the block argument |
| `tools/render.sh` | PDF, SVG and a 150 dpi PNG of one sheet, copied from the carrier's |
| `tools/page.py` | the shared op-list writers for the Task 7b pages: `load_layout`, `place_ops` (op-list 01), `Wiring` (op-list 02, with its refusals), and the field placements `layout.py` uses |
| `tools/place.py`, `tools/text_edits.py` | op-list 01, and the direct text edits (strokes, fields, the group rectangle), for any Task 7b block, driven by its `layout.py` |
| `tools/ports.ts` | a block's ports and the pins each reaches, from `drawingPages()` (`<block>/ports.json`) |
| `<block>/layout.py`, Task 7b blocks | every part's position, rotation and mirror, the rows and columns its wiring uses, its field placements, group rectangle and title, and the stroke of any net the draft drew no wire for |
| `<block>/02-wire.py`, Task 7b blocks | the block's wiring through `tools/page.py`'s `Wiring` |
| `<block>/ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`, `02-wire.nets.json`, `04-hierarchical-labels.json`, Task 7b blocks | generated by the steps above; checked by the replay |
| `replay.sh` | the replay above |
