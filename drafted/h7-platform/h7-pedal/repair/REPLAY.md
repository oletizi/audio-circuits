# Replaying the h7-pedal drawing

**What this is.** The record of how the sheets in `..` were made from a fresh
`make -C boards/h7-pedal draw` (`TOOLING.md` step 5.5, and design change C3 for what a multi-page
board adds). It grows one block at a time as each page is repaired (h7 pedal pages plan, Task 7:
7a interface and entry, 7b pf and modsw, 7c prail and ldo_vmid; Task 9a, usb, midi_i2c and
fsw_led; Task 9b, controls_a, controls_b and expr_ref; Task 9c, codec_sup, sai_iso and codec; Task
11a, the analog group's pages, jacks_byp first; each added as it is repaired). The root sheet and its
`.kicad_pro` come once every page is drawn.

| | sha256 |
| --- | --- |
| start: each block's draft, `build/draw/h7-pedal/<block>/<block>.kicad_sch` as `make draw` writes it (re-papered to US Letter) | the nineteen values (fifteen until Task 10 added the analog group's four) in `../RECORD.md`, "The drafts every repair starts from", and in `replay.sh` |
| end: `interface.kicad_sch` (Task 7a) | `963777f3bf9df9c3b5d966ce48c71bf76071f902c716f88a65b07c621b88822a` |
| end: `entry.kicad_sch` (Task 7a) | `5352fd5b917c96520681efa8421b8b63d9a0f92345156c776044f48708af0736` |
| end: `pf.kicad_sch` (Task 7b) | `7096a9befaf2e62b42218a2153a34fa317fc9cad0a1ad5e1ae9c0d198a4b2385` |
| end: `modsw.kicad_sch` (Task 7b) | `89ed82bcbc60b4e2f075257768f68a4a66370348dc5db4e7c4b9632ca3099dc2` |
| end: `prail.kicad_sch` (Task 7c) | `f440c0c355718e6e280f955abe1ef8df8f2075cf89d5866f3ef854f90ae15780` |
| end: `ldo_vmid.kicad_sch` (Task 7c) | `584cdc4ce97d96875c2c2b76a9504e99997eb1a21623668b7feb7202e6f96ecd` |
| end: `usb.kicad_sch` (Task 9a) | `efe062770501a63ad44dfe33558fcb54f7bd6676b5bab682b25278317aecb653` |
| end: `midi_i2c.kicad_sch` (Task 9a) | `fb12cf76ea6924f8cc1a983c9eaed4f85a004e15e399836941852d0e818afc4f` |
| end: `fsw_led.kicad_sch` (Task 9a) | `de6b3e173b854daef218356aa2ade4c1b66cdd5277eed411b969780865fb2021` |
| end: `controls_a.kicad_sch` (Task 9b) | `0e01516c5059915c4bc1b9b22d711689c7f5311af0c78d22bbc7cda3fbdd5888` |
| end: `controls_b.kicad_sch` (Task 9b) | `cd3f1a0869064b31cd5d9302e188614e4fb6f58e74481c8c2ae342644f0da9db` |
| end: `expr_ref.kicad_sch` (Task 9b) | `f85af0345995f4a4b162ecbe287849ebbcbbdaa6eea9b06f229dab14b011539c` |
| end: `codec_sup.kicad_sch` (Task 9c) | `9f98870190e4b1207c005494b73ec8fb75f2f48857df9723e612a96902ce3147` |
| end: `sai_iso.kicad_sch` (Task 9c) | `ffc831855bd99856e6c84610169623a34f99ca50e15a834fccb0b23251cff9c8` |
| end: `codec.kicad_sch` (Task 9c) | `1c17ed164ce98f749cb2db3a88f815e59d10ed82d92b5ca5a924952f4c414588` |
| end: `jacks_byp.kicad_sch` (Task 11a) | `2ad7be98ed45efb192ccd5dc4a56f892bc009c6b3c98beb4d3d3a0de7565c489` |

## Replay

From the repository root, into a new or empty directory outside the repository (`replay.sh`
refuses a non-empty one; it stops non-zero, naming the step, when any step cannot run or any file
differs):

```
bash drafted/h7-platform/h7-pedal/repair/replay.sh <work-dir>
```

`replay.sh` does, in order:

1. `make -C boards/h7-pedal draw` (this writes `build/draw/h7-pedal*` inside the repository,
   overwriting any draft already there). Checks it printed the `NO INDEPENDENT NETLIST:` block (the
   board declares no `"netlist"`: there is no root sheet yet to export one from), that each draft's
   sha256 is the recorded one, and that each repaired block's generated intent is byte-identical to
   `<block>/intent.json`. A model change since this record stops the replay here, by block.
2. Each repaired page, in the order of the table above, by `repair_block` with the shared tools in
   `draughting/pages/` (the module's procedure, `../../h7-module/RECORD.md`, "How the Task 7b pages
   are repaired"), each generated file checked against the committed copy in `<block>/` and each
   op-list through `akcli plan` and then `akcli draw --apply`, which must report `APPLIED`:
   `draughting/pages/ports.ts`, `net_strokes.py`, `place.py`, `pins.py`, `<block>/02-wire.py`,
   `<block>/03-pwr-flags.py` where one exists (none so far), `tools/draught/hierarchical-labels.ts
   ops` then `check`, and `draughting/pages/text_edits.py`. Then the sheet's sha256 must be its end
   value above, and the sheet byte-identical to `../<block>.kicad_sch`.
3. Makes the `sym-lib-table` (one row, `h7-platform`, naming
   `circuits/h7-platform/h7-platform.kicad_sym` in place in the repository; design change C4) and
   checks it is byte-identical to `../sym-lib-table`.

Toolchain: copperhead 0.12.0 and akcli 0.22.0 under `draughting/` (`make draught-doctor` matched
every pinned tool), kicad-cli 10.0.5, python3, bun. Replayed on 2026-11-13 into a new directory and
reached every sha256; that replay's `make draw` was the second run, and it drafted the same six
sheets, byte for byte, as the first. Task 7b replayed again, into new directories, after adding pf
and after adding modsw; each reached every sha256, the Task 7a pages' included. Task 7c replayed
into a new directory after adding prail and ldo_vmid; it reached every sha256, the earlier four
pages' included. Task 9a added the nine drafts of the digital and controls group to the check and
replayed into a new directory after each of its pages; each replay reached every sha256, the earlier
six pages' included. Task 9b replayed into a new directory after each of its pages; each replay
reached every sha256, the earlier pages' included. Task 9c replayed into a new directory after each
of its pages; each replay reached every sha256, the earlier pages' included. Task 10 (no page;
the analog group's four blocks modelled) replayed into a new directory, added the four new drafts to
the check, and replayed into another; both reached every sha256, the fifteen pages byte-identical,
and drafted the four the same. Task 11a replayed into a new directory after each of its pages; each
replay reached every sha256, the earlier pages' included.

Then, to check and look at a page:

```
sh draughting/pages/verify.sh drafted/h7-platform/h7-pedal <block> drafted/h7-platform/h7-pedal/<block>.kicad_sch
sh draughting/pages/render.sh drafted/h7-platform/h7-pedal/<block>.kicad_sch <out-dir>
```

## The files

| file | what it is |
| --- | --- |
| `<block>/intent.json` | the copperhead intent `drawingPages()` generated for the block at draft time; committed with the block's page |
| `<block>/layout.py` | every part's position, rotation and mirror (a multi-unit part unit by unit, keyed `<ref>:<unit>`, as ldo_vmid's U5), the rows and columns its wiring uses, its field placements, group rectangle and title, the stroke of any net the draft drew no wire for, and any text note on the page (`NOTES`, midi_i2c's and codec's) |
| `<block>/02-wire.py` | the block's wiring through `draughting/pages/page.py`'s `Wiring`, with the title-block data from `tools/title_block.py` |
| `<block>/ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`, `02-wire.nets.json`, `04-hierarchical-labels.json` | generated by the steps above; checked by the replay |
| `tools/pwr-flag-homes.ts` | the pedal's table of where each shared net's single PWR_FLAG lives (ruling CR-MODULE-PWR-FLAGS, carried to the pedal); GND on the root since Task 7b, VIN_MOD and VIN_A on the root since Task 7c, 3V3_D on the root since Task 9a, VREF_A on the root since Task 9b, 5V_A_CODEC on the root since Task 9c, each with the measurement that says why in its header |
| `tools/cross-page-drivers.ts` | the pedal's table of nets whose driver is on another page (ruling CR-MODULE-CROSS-PAGE-DRIVERS, and CR-PEDAL-CROSS-PAGE-POWER-DRIVERS for a `power_out` driver); 5V_A, PF_TRIP and PF_ON since Task 7b, 3V3_CODEC, CODEC_RST_N, XO_OUT and DIN_CODEC since Task 9c, VINL and VINR (adc_drv's R_O) since Task 10, each with its source |
| `tools/erc-allowances.ts` | the pedal's table of ERC errors a page's verification excuses; one entry since Task 9b (expr_ref's U12 ST against GND's flag, CR-PEDAL-LM66100-ST-ERC) (Task 9c's two one-item entries for codec's U9 VINL and VINR, CR-PEDAL-CODEC-VIN-AWAITING-ERC, were removed at Task 10, when adc_drv was built; CR-PEDAL-CODEC-VIN-AWAITING-ERC-AMENDED), with the measurement that says why in its header. An entry needs its own ruling in `docs/h7-platform/decisions.md` |
| `tools/erc-control.sh` | the pedal's controls for CR-PEDAL-CROSS-PAGE-POWER-DRIVERS (Task 7c): the pf page with 5V_A's stand-in a TestPoint and with none each fail on U1's VDD, and 5V_A homed on a page is refused board-wide; for CR-PEDAL-LM66100-ST-ERC (Task 9b, controls 7 to 10); for VINL and VINR's cross-page drivers on the codec page (Task 10, controls 11 to 13, replacing Task 9c's one-item allowance controls) |
| `tools/title_block.py` | the date, revision and first comment the pedal's pages' title blocks carry |
| `tools/controls_page.py` | the placement, fields, note and wiring the two control pages share (Task 9b): controls_a and controls_b are the same three-position circuit, so each block's `layout.py` and `02-wire.py` name only their parts and call it |
| `replay.sh` | the replay above |
