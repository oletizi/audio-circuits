# h7-module: the processor module, drawn one page per block

The circuit: `circuits/h7-platform/module-board.ts` (`h7Module()`, `DESIGNATORS`, `PIN_NUMBERS`,
`PAGE_GROUPS`, `drawingPages()`), twelve `include()`d blocks under `circuits/h7-platform/module/`.
Model-authoritative (`TOOLING.md` step 0): every page is derived from the model. The board is
`boards/h7-module/perfboard.json`, kind `pcb`; since Task 7e its `sch` is the root,
`h7-module.kicad_sch`, and its `netlist` the root's export, `tests/fixtures/h7-module.net`.

The project is drawn under design change C3 (`TOOLING.md`, "Multi-page drawing"): one sheet per
block, each block's ports drawn as hierarchical labels, and a root sheet joining them (Task 7e).
`kicad-cli`'s export of that root is the evidence of how the pages connect
(`registerDraftedProjectTests` in `tests/circuits/h7-module.test.ts`, and
`repair/tools/verify-root.sh`). Each block page is also checked against its own block of the model
(`repair/tools/verify.sh`).

**A page here is UNREVIEWED until the owner records a verdict on its sha256; each page's status below says which it is.** A verdict is bound to the sha256
in the table below; `docs/schematic/verdicts.md` is where it is recorded.

## Sheets

| sheet | role | sha256 |
| --- | --- | --- |
| `h7-module.kicad_sch` | root | `3590b959500bd1a3d359915094601450f5437ce071a644dad084aa20e98a99ed` |
| `power.kicad_sch` | block power | `906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f` |
| `interface.kicad_sch` | block interface | `0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296` |
| `clock.kicad_sch` | block clock | `83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1` |
| `reset_boot.kicad_sch` | block reset_boot | `00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24` |
| `swd.kicad_sch` | block swd | `486923651c80caf44123005ed47fcb5a756c128674a052a4f99727a96b8cfef8` |
| `usb_dfu.kicad_sch` | block usb_dfu | `80947ededbb593f37bd87d6e838d232557dfc07c6f6d147ac6257cca5f5a299f` |
| `id_strap.kicad_sch` | block id_strap | `7649af4311431f60b159a7d6717c26d136ed3311182f3d5330f11a44eba6cf09` |
| `qspi.kicad_sch` | block qspi | `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1` |
| `vdda.kicad_sch` | block vdda | `7f066a9ab786252b592d14ffaa8886e934876bcc678666b73c1922f06eee2444` |
| `sdram.kicad_sch` | block sdram | `0812ab0287bdb8e126f8bd3b2d4a09e54251ee6dc0e62e784d871b9947a48bcf` |
| `decoupling.kicad_sch` | block decoupling | `8d20ff5196f59330bb77424024d856124808d3d49c5affe89db56f7516c416cb` |
| `mcu.kicad_sch` | block mcu | `c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981` |

Every sheet is drawn, the root with them (Task 7e). The root's `.kicad_pro`,
`h7-module.kicad_pro` (sha256 `62905f75e8abc6cf0890616b8021b8a31140395b01575e817e372bbd6f09a5a0`), is
committed beside it and is not a sheet, so it has no row here; `repair/replay.sh` checks its
sha256. `registerDraftedProjectTests` binds this table.

| page | status | render |
| --- | --- | --- |
| root | **reviewed 2026-11-12**, *"approved"* (`docs/schematic/verdicts.md`); `verify-root.sh` exits 0: root ERC 0 errors, with one excluded violation (`pin_to_pin` on `/mcu/`, U1 pins 81 and 125, CR-MODULE-VCAP-ERC). Task 7e's one NRST `pin_to_pin` error was cleared in fix round 1 by retyping U5's symbol (see "The root's ERC error at Task 7e", below) | `h7-module.svg` |
| power | **reviewed 2026-11-12**, *"approved"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `power.svg` |
| interface | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `interface.svg` |
| clock | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `clock.svg` |
| reset_boot | **reviewed 2026-11-12**, *"approved"* (`docs/schematic/verdicts.md`) of the changed page, sha256 `00407478…`. History: The owner's verdict *"approved. proceed"* (2026-11-12, `docs/schematic/verdicts.md`) was of sha256 `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397`. The page now at sha256 `00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24` has U5's symbol swapped under the amended CR-MODULE-SUPERVISOR-SYMBOL (Task 7e fix round 1); that verdict does not bind it | `reset_boot.svg` |
| swd | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `swd.svg` |
| usb_dfu | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `usb_dfu.svg` |
| id_strap | **reviewed 2026-11-12**, *"approved. proceed"*, recorded in `docs/schematic/verdicts.md` against the sha256 above | `id_strap.svg` |
| qspi | **reviewed 2026-11-12**, *"approved"* (`docs/schematic/verdicts.md`); `verify.sh` exits 0 since ruling CR-MODULE-CROSS-PAGE-DRIVERS (27bc5a0); before it, it exited 1 (the history is in its section) | `qspi.svg` |
| vdda | **reviewed 2026-11-12**, *"approved"* (`docs/schematic/verdicts.md`); `verify.sh` exits 0 (Task 7c) | `vdda.svg` |
| sdram | **reviewed 2026-11-12**, *"approved"* (`docs/schematic/verdicts.md`); `verify.sh` exits 0 (Task 7c) | `sdram.svg` |
| decoupling | **reviewed 2026-11-12**, *"approved"* (`docs/schematic/verdicts.md`); `verify.sh` exits 0 (Task 7c) | `decoupling.svg` |
| mcu | **reviewed 2026-11-12**, *"approved"* (`docs/schematic/verdicts.md`); `verify.sh` exits 0 since ruling CR-MODULE-VCAP-ERC, which excuses its one `pin_to_pin` between U1's two VCAP pins; before it, it exited 1 (the history is in its section) (Task 7d) | `mcu.svg` |

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
| `build/draw/h7-module/reset_boot/reset_boot.kicad_sch` | reset_boot | 8 | `a68c14b8c7814103c3f5ebb7b24d6016b3c2a125ec5964000031a1b170c9d5e1` (Task 7e fix round 1, U5 on `h7-platform:TLV803EA30DBZR`; was `ce4271830f6994b4bd197c9ca3a269f42395d3937b2fa89cb1f5786d4588d5c0` with `Power_Supervisor:TPS3839DBZ`) |
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
  export runs for the project. **Since Task 7e the board declares the root's export as its
  `netlist`**, so `make draw` now runs the per-block partition check against it and prints no
  such block; `repair/replay.sh` requires its absence, and the drafts are the same bytes.
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

## What the root does about PWR_FLAGs, cross-page drivers and the VCAP allowance (Task 7e)

Until Task 7e this section said what the root *must* do; each requirement is below with what was
done and the evidence. `repair/tools/verify-root.sh` runs every check on the committed project, and
`repair/tools/root-control.sh` holds the controls (ten; each must come out as stated). Since Task 7e fix round 1 `erc-control.sh` runs them as its control 18.

**PWR_FLAGs.** Ruling [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags):
each module net carries at most one PWR_FLAG across the hierarchy, at the home
`repair/tools/pwr-flag-homes.ts` declares.

- **The root-held flags are placed:** `repair/tools/root-flags.ts` writes `repair/root/02-pwr-flags.json`,
  one `place_pwr_flag` on each net the table homes on `root` (3V3_D, VREF_A, VSSA). None goes on GND,
  whose flag is the power page's.
  - Until Task 7e fix round 1 each flag stood at its net's FIRST root stub label. All three were mcu's.
  - Since then, each stands at the first stub label of its net that is the TOP pin of its sheet edge (rotation 0, the flag above it), or else the first that is the BOTTOM pin (rotation 180, the flag below it).
  - With pins 100 mil apart, a flag drawn toward a neighbouring stub put its text on that stub's label. That was measured on the fix round's first render (CR-MODULE-ROOT-FITS-LETTER).
  - Placements: 3V3_D on mcu's west edge, top; VREF_A on decoupling's west edge, bottom; VSSA on mcu's east edge, bottom.
- **Exactly one per net, across the whole hierarchy, is checked against the table:**
  `repair/tools/hierarchy_flag_probe.py` renames every flag of every sheet the root names to
  `FLGPROBE<k>` in a scratch copy, `kicad-cli` exports the probe root, and
  `repair/tools/hierarchy-flags.ts` maps each flag's net to its MODULE net through the real pins on it
  (never a net name). On the committed project: 5 flags - 3V3_D, VREF_A, VSSA on the root,
  `power_VIN_BUCK` and GND on power - exactly one on each of the 5 declared nets, each at its home.
  Controls (`root-control.sh`): a second 3V3_D flag on the decoupling page fails, *"3V3_D carries 2
  PWR_FLAGs, on root, decoupling"*; the root's three flags removed fails, naming 3V3_D, VREF_A and
  VSSA as carrying none (control 3).
- **The parked Task 7a minor, flag-check.ts treating a flag on a non-port net as private:** the
  whole-hierarchy check is its backstop, and covers it. Control 4: a flag on the power page's private
  FB (U2 pin 8) passes `flag-check.ts` (*"private to power - allowed"*) and fails `hierarchy-flags.ts`,
  *"power_FB carries a PWR_FLAG (on power) and has no declared flag home"*, because every flagged net,
  private ones included (`PRIVATE_FLAGS`), must be declared.
- **The parked Task 7a minor, `#PWR` references repeating across sheets:** it MATTERS to export.
  akcli numbers `#PWR0<n>` per sheet, so the root's flags came out `#PWR01` to `#PWR03` beside the
  power page's `#PWR01` and `#PWR02`. Measured with kicad-cli 10.0.5: the export of that root printed
  *"Warning: schematic has annotation errors, please use the schematic editor to fix them"* (on
  stdout); the same root without flags printed nothing, and the two exports were identical apart from
  their `(source)` line (an export leaves out `#` references). ERC reported nothing for it. Fixed on
  the root, which is not approved: `repair/tools/root_flag_refs.py` renames the root's flags `#FLG01`
  to `#FLG03` (`#FLG` is KiCad's own PWR_FLAG prefix). After it, the export prints no warning and is
  otherwise the same. Checked on every run: the probe fails on any `#` reference used twice across
  the hierarchy, and `verify-root.sh` on an annotation warning. Control 5: the root's `#FLG01` renamed
  `#PWR01` fails, naming `#PWR01` on root and power, and kicad-cli warns again.
- **0 ERC errors on the root: MET** since Task 7e fix round 1. One error was reported at Task 7e, on NRST and not from flags. It is gone with U5's symbol (see the ERC below).

**Cross-page drivers.** Ruling
[CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
the real root carries **no stand-in driver** (its op-lists place only sheets, wires, labels and the
three flags; `counts.py`: 3 symbols, all flags). Every one of the table's 25 entries is cleared by
its real driver:

- **no `pin_not_driven` anywhere** in the root's ERC, every sheet together (and `root_erc.py` fails
  on any error);
- **each driving pin is on its net with every pin the model puts there**, in the root's export:
  `repair/tools/root-drivers.ts` - FLASH_CLK by U1.28 (2 pins), the 22 SDRAM entries by U1's FMC pins,
  NRST by U5.2 (7 pins), BOOT0 by SW2.1 (5 pins). Control 9: the root stub of reset_boot's NRST pin
  cut fails it, *"the driving pin U5.2's exported net /NRST_CUT lacks U1.31, J3.10, TP8.1"*.
- **What the stand-in could not catch, the real root did.** A passive stand-in raises no
  `pin_to_pin`, so a type conflict between a block's pin and its real driver was visible only here
  (this record said so). There was one: on NRST, J3 pin 10 against U5 pin 2. It was a wrong symbol, not a wrong circuit, and it is fixed by the amended CR-MODULE-SUPERVISOR-SYMBOL. See the ERC below.

**The VCAP allowance.** Ruling [CR-MODULE-VCAP-ERC](../../../docs/h7-platform/decisions.md#cr-module-vcap-erc):

- **The root's `.kicad_pro` carries the one exclusion and no other:** `h7-module.kicad_pro`, written by
  `repair/tools/kicad-pro.ts` from `erc-allowances.ts` (held to the model first), one
  `erc_exclusions` entry: `pin_to_pin`, U1 pin 81 (main item) and pin 125, on `/mcu/`, each value
  taken from a committed file (the root's and mcu sheet's uuids, U1's pin uuids, pin 81's point
  from `repair/mcu/pins.json`). The serialisation is the one the pedals repository's v1
  `h7-platform.kicad_pro` carries for the same violation.
- **kicad-cli honours `.kicad_pro` exclusions** - measured with kicad-cli 10.0.5 on this root: with
  the entry, the violation is reported with `"excluded": true` (and severity warning) and no longer
  as an error; with the two pins swapped, or x one unit off, it is not honoured, and KiCad reports the
  real violation as an error AND the unmatched exclusion as a separate excluded marker.
- **Checked the same way as `verify.sh`:** `repair/tools/root_erc.py` reads the report, and an
  excluded violation passes only if it matches a declared allowance exactly (sheet, type, the two
  (designator, pin) pairs, `erc_sheets.py`'s matching); each allowance must be matched exactly once,
  the `.kicad_pro` must carry as many exclusions as there are allowances, and any other error
  fails. Controls 6 to 8: no exclusion fails on the U1 81-125 `pin_to_pin`; the exclusion twice fails
  on the count; a synthetic excluded violation no allowance admits fails, and the exact one passes.

## root: the module's root sheet (Task 7e)

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `3590b959500bd1a3d359915094601450f5437ce071a644dad084aa20e98a99ed` (Task 7e fix round 1; it was
`fd7baeabadac2ed81049b24484c8ee53c27f82fbcb5efb569a1328726fef1d86` at Task 7e, off the paper and with one ERC error).
Render: `h7-module.svg` beside it, and a 150 dpi PNG of the root page by
`sh repair/tools/render.sh h7-module.kicad_sch <out-dir> root`. Its ERC has 0 errors apart from the one
VCAP exclusion, and every sheet symbol lies on US Letter's paper.

### How it was assembled

`repair/root/`, replayed by `repair/replay.sh` after the twelve blocks:

1. `bun tools/draught/assemble-root.ts blank h7-module`: the starting text, uuid seeded by the board,
   US Letter (sha256 `134c620e32f4587ab861a8210298ae31533ca041247b3bb183f8e1b13eef25d2`).
2. `assemble-root.ts ops`, `01-assemble.json`: one sheet per block, placed by
   `tools/draught/root-arrangement.ts` to fit US Letter (CR-MODULE-ROOT-FITS-LETTER), each port a sheet
   pin wired to a 200 mil stub ending in a LOCAL label naming the parent net.
3. `repair/tools/root-flags.ts`, `02-pwr-flags.json`: the three root-held PWR_FLAGs.
4. `repair/tools/root_flag_refs.py`: their references `#FLG01` to `#FLG03`.
5. `draughting/repair/root_pin_justify.py` (Task 7e fix round 1; it was `repair/tools/` until the final review moved it): every sheet pin's name justified into its
   box, west-edge pins left and east-edge pins right, as KiCad writes them (akcli writes no justify).
6. `repair/tools/kicad-pro.ts`: `h7-module.kicad_pro`, unchanged by the fix round.

The committed `sym-lib-table` (C4) was already here; with the `.kicad_pro` beside the root, kicad-cli
reads it, and the root's ERC carries no `lib_symbol_issues` for `h7-platform` (a scratch copy without
the library in reach reports it once).

### The rulings it rests on

- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): the three flags.
- [CR-MODULE-ROOT-FITS-LETTER](../../../docs/h7-platform/decisions.md#cr-module-root-fits-letter):
  the arrangement on US Letter, the pin justification, and where the flags stand.
- [CR-MODULE-SUPERVISOR-SYMBOL](../../../docs/h7-platform/decisions.md#cr-module-supervisor-symbol),
  as amended: U5's pin 2 is `open_collector`, which cleared the root's one ERC error.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  no stand-in; every entry cleared by its real driver.
- [CR-MODULE-VCAP-ERC](../../../docs/h7-platform/decisions.md#cr-module-vcap-erc): the one exclusion.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): no power
  symbol joins a net by name; every rail meets on the root through local labels.
- [CR-MODULE-ROOT-PROJECT-FILE](../../../docs/h7-platform/decisions.md#cr-module-root-project-file):
  the `.kicad_pro` beside the root. Recorded in `decisions.md` in Task 7e from the controller's Task 5
  ruling, which until then lived only in the plan's gitignored progress log.

### Measurements

From `repair/tools/verify-root.sh` (kicad-cli 10.0.5). None of these is a judgement of the page.

| measure | root |
| --- | --- |
| root export against the WHOLE model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 (`footprints` 0; `footprintsUndeclared` 94: the model declares no footprint) |
| exported components, nets, net members | 94 (the model's 94, each once), 174, 482 |
| kicad-cli annotation warning on export | none (it printed one before `root_flag_refs.py`) |
| PWR_FLAGs across the hierarchy | 5: 3V3_D, VREF_A, VSSA on root; GND, VIN_BUCK on power; one per declared net, each at home |
| `#` references across the 13 sheets | 5, none repeated |
| cross-page driver entries on their net with the real driver | 25 of 25 |
| ERC, every sheet, errors | **0** (Task 7e fix round 1). At Task 7e there was 1: `pin_to_pin` on `/swd/` between J3 pin 10 (open collector) and U5 pin 2 (output, the TPS3839DBZ symbol) |
| ERC, excluded | 1: `pin_to_pin` on `/mcu/`, U1 pins 81 and 125, under CR-MODULE-VCAP-ERC |
| ERC, warnings by type | `lib_symbol_mismatch` 3 (on `/`: U2 TPS62933F, U4 W25Q128JVS, U6 USBLC6-2SC6, each an embedded symbol differing from the installed library), `ground_pin_not_ground` 1 (`/mcu/`, U1 pin 37 VSSA) |
| ERC, `pin_not_driven` | 0 |
| sheets | 12 sheet symbols, 204 sheet pins (one per port of each block): 159 on west edges, 45 on mcu's east edge |
| wires, labels | 204 wires (1036.32 mm, 0 corners), 204 local labels on 91 nets; 0 junctions |
| symbols (parts, power symbols, PWR_FLAGs) | 3 (0, 0, 3) |
| true crossings, T-meetings, orphan junctions, tees without a dot | 0, 0, 0, 0 |
| paper fit (US Letter), `paper_fit.py` | fits: yes (content x 25.400 to 232.410 mm, y 20.320 to 177.800 mm). At Task 7e it did not fit: overshoot south 779.103 mm |
| sheet symbols on the paper, `root_sheets_fit.py` | 12 of 12, each inside the inner frame and clear of the title block. At Task 7e, 2 of 12 |
| drawn text, from the SVG's stroked text (`repair/tools/svg_stroked_text.py`, reported by `verify-root.sh`, never judged) | no two text boxes overlap. Four sheet names (power, qspi, id_strap, decoupling) dip into their box's top line with a descender. Before the pin justification and the flag rule, 50 pairs overlapped |

**The root's ERC error at Task 7e, and what cleared it.** NRST joins J3 (swd) pin 10, typed open
collector by `Connector:Conn_ARM_JTAG_SWD_10`, and U5 (reset_boot) pin 2. At Task 7e, U5 pin 2 was
typed output by `Power_Supervisor:TPS3839DBZ`, and KiCad's default pin map makes open collector to
output an error. The two pins are on different pages, so no one-block root could raise it. The fitted
TLV803EA30DBZR drives NRST open drain (owner-approved [D14](../../../docs/h7-platform/decisions.md#d14)).
So the approved reset_boot page stated the wrong output stage, and the ERC error was the symptom.
[CR-MODULE-SUPERVISOR-SYMBOL](../../../docs/h7-platform/decisions.md#cr-module-supervisor-symbol), as
amended in Task 7e fix round 1, puts U5 on the project symbol `h7-platform:TLV803EA30DBZR`, whose
pin 2 is `open_collector`. The root's ERC is now 0 errors, with the one VCAP exclusion.

**The paper, as measured.** At Task 7e, `assemble-root.ts`'s fixed arrangement (three sheets to a
row, pins 200 mil apart) made the mcu sheet 462.28 mm tall and reached y 982.98 mm; 10 of 12 sheet
boxes lay off the frame (`root_sheets_fit.py` on that root). Since Task 7e fix round 1 the
arrangement fits (CR-MODULE-ROOT-FITS-LETTER), and `verify-root.sh` fails on a root that does not:
`paper_fit.py` must report "fits: yes", and `root_sheets_fit.py` must find every sheet box on the
paper. `repair/tools/render.sh` now takes a page argument, so the root page's PNG is made by
`render.sh h7-module.kicad_sch <out-dir> root` (kicad-cli's `--pages 1`).

### What the page shows, as observations

- Twelve sheet symbols, each labelled with its block name above and its file below, all inside the
  frame. mcu stands at the north-west, with sdram and interface to its east, each running from the
  frame's top. decoupling, clock, usb_dfu and id_strap are below mcu; vdda is below sdram; qspi and
  reset_boot are below interface, and swd and power south-east of it, all clear of the title block.
- Each sheet's pins run down its west edge in name order, each with a short wire west to a local
  label naming the parent net. mcu's run down both edges, 45 each: 3V3_D to SDRAM_A4 on the west and
  SDRAM_A5 to VSSA on the east, each east pin wired east to its label. Every pin name is inside its box.
- PWR_FLAGs stand on the stub labels of 3V3_D (mcu, west edge, the top pin, flag above), VREF_A
  (decoupling, the bottom pin, flag below) and VSSA (mcu, east edge, the bottom pin, flag below).
- The title block reads `Sheet: /`, `File: h7-module.kicad_sch`, `Size: USLetter`, `Id: 1/13`, with
  no title. The sub-sheets' page numbers, which the project's page list and each page's title block ("Id: N/13") show, are printed by `repair/tools/root_pages.py` and reported by `verify-root.sh`.

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

**Status: REVIEWED, 2026-11-12, as changed.** The owner's verdict on this sha256, verbatim: *"approved"* (`docs/schematic/verdicts.md`). History (symbol swapped per amended CR-MODULE-SUPERVISOR-SYMBOL; the owner's earlier approval was of sha256 ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397). sha256 `00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24`.
Render: `reset_boot.svg` beside it.

*History:* REVIEWED, 2026-11-12. The owner's verdict, verbatim: *"approved. proceed"* (`docs/schematic/verdicts.md`), of sha256 `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397`, which drew U5 with `Power_Supervisor:TPS3839DBZ`. That symbol types the RESET pin push-pull `output`, and the fitted TLV803EA30DBZR drives NRST open drain. The module root's ERC found this as a `pin_to_pin` on NRST.

**What changed (Task 7e fix round 1).** Only U5's symbol, now `h7-platform:TLV803EA30DBZR` ([CR-MODULE-SUPERVISOR-SYMBOL](../../../docs/h7-platform/decisions.md#cr-module-supervisor-symbol), as amended). That symbol has TPS3839DBZ's geometry, with pin 2 typed `open_collector`.
- The page was remade by `repair/replay.sh` from the new draft. The model change reaches the intent as one line, U5's `libId`. Every generated op-list (`ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`, `02-wire.nets.json`, `04-hierarchical-labels.json`) is byte-identical to the committed one, so no akcli symbol-replace op was needed, and none was written.
- `diff` against the approved bytes shows eight changed lines and nothing else: `lib_id`; the embedded symbol's name and its two unit names; its Value, Datasheet and Description; and pin 2, `output` to `open_collector`. Every position, wire, label, field and junction is unchanged.
- The new SVG differs from the approved one only in its timestamp line.
- `verify.sh reset_boot` exits 0. `/reset_boot/` under the one-block root still has 0 errors and 0 warnings.
- Two warnings are new, one on the sheet alone and one on the one-block root's `/`, both `lib_symbol_issues`. The scratch roots carry no `sym-lib-table`, so KiCad cannot find the `h7-platform` library there. The sdram page, whose U3 is a project symbol, shows the same warning in both places.

The block: `circuits/h7-platform/module/reset-boot.ts`, 8 parts (U5, C46, R11, C47, SW1, R12, C48,
SW2), ports 3V3_D, BOOT0, GND and NRST.

### The rulings this page rests on

- [CR-MODULE-SUPERVISOR-SYMBOL](../../../docs/h7-platform/decisions.md#cr-module-supervisor-symbol):
  U5 is drawn with the project symbol `h7-platform:TLV803EA30DBZR` (pin 2 `open_collector`) and reads
  "TLV803EA30DBZR". Until Task 7e fix round 1 it was drawn with `Power_Supervisor:TPS3839DBZ`.
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
| ERC, the sheet alone | 2 errors (`power_pin_not_driven` 2), 0 warnings | 6 errors (`pin_not_connected` 4: each hierarchical label has no parent sheet; `power_pin_not_driven` 2, on 3V3_D and GND), 0 warnings; since fix round 1, 1 warning (`lib_symbol_issues`, the project library, see above) |
| ERC under a one-block root, `/reset_boot/` | 2 errors (`power_pin_not_driven` 2), 1 warning (`same_local_global_label`) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 6 errors (`hier_label_mismatch` 4, `label_dangling` 2), 2 warnings | 2 errors (`label_dangling` 2: the BOOT0 and NRST stub labels are alone with one block), 0 warnings; since fix round 1, 1 warning (`lib_symbol_issues`, as above) |
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

### The same-class audit: stand-in symbols among the module's parts (Task 7e fix round 1)

The amended CR-MODULE-SUPERVISOR-SYMBOL says a stand-in symbol must match the fitted part's pin electrical types, as well as its names and numbers. The class is any part whose symbol is named for another part.

**How the class was found.** Every distinct (symbol, mpn) pair of the 94 components `h7Module()` returns was listed, and each `decisions.md` ruling using "stand-in" was read.

**Rulings that use "stand-in":**
- CR-MODULE-SUPERVISOR-SYMBOL, for U5. This is the only part-symbol stand-in.
- CR-MODULE-CROSS-PAGE-DRIVERS. Its `Connector:TestPoint` driver is placed only on `verify.sh`'s scratch roots. It is not a module part.
- O-16 and OWN-07. These mean the Seed3 boards, not symbols.

| symbol | parts | named for |
| --- | --- | --- |
| `h7-platform:TLV803EA30DBZR` (was `Power_Supervisor:TPS3839DBZ`) | U5, TLV803EA30DBZR | **was another part (TPS3839)**. Fixed: pin 2 now `open_collector` |
| `MCU_ST_STM32H7:STM32H743IITx` | U1, STM32H743IIT6 | its own part (`x` is the temperature-range letter) |
| `Regulator_Switching:TPS62933F` | U2, TPS62933FDRLR | its own part |
| `h7-platform:W9825G6KH` | U3, W9825G6KH-6I | its own part (project symbol, CR-MODULE-SDRAM-SYMBOL) |
| `Memory_Flash:W25Q128JVS` | U4, W25Q128JVSIQ | its own part |
| `Power_Protection:USBLC6-2SC6` | U6, USBLC6-2SC6 | its own part |
| `Device:R`, `Device:C`, `Device:C_Polarized`, `Device:L`, `Device:FerriteBead`, `Device:Crystal_GND24` | the passives, FB1, Y1 | no part (generic) |
| `Connector:Conn_ARM_JTAG_SWD_10`, `Connector:USB_C_Receptacle_USB2.0_16P`, `Connector_Generic:Conn_01x20`, `Connector:TestPoint`, `Switch:SW_Push` | J1 to J4, TP1 to TP10, SW1, SW2 | no part (generic) |

**Result: U5 is the only stand-in, so there is no other mismatch to fix.**

Not audited, because they are outside the class:
- The pin types of the symbols named for their own part.
- The generic symbols. One of these is J3's `Conn_ARM_JTAG_SWD_10`, which types pin 10 `open_collector`, the SWD interface's convention for a header pin.

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

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1`.
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

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `7f066a9ab786252b592d14ffaa8886e934876bcc678666b73c1922f06eee2444`.
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

## sdram: the SDRAM and its decoupling (Task 7c)

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `0812ab0287bdb8e126f8bd3b2d4a09e54251ee6dc0e62e784d871b9947a48bcf`.
Render: `sdram.svg` beside it.

Repaired by the Task 7b steps, with `repair/sdram/layout.py` and `repair/sdram/02-wire.py`;
`repair/replay.sh` runs it through `repair_block`.

The block: `circuits/h7-platform/module/sdram.ts`, 9 parts (U3 `h7-platform:W9825G6KH`, C36 to C42,
R9), 41 ports: 3V3_D, GND and SDRAM_NE, which each reach more than one pin, and 38 SDRAM nets that
each reach one of U3's pins.

### The rulings this page rests on

- Design change C4 (`TOOLING.md`, "Project symbol libraries"): U3 is drawn with the project symbol
  `h7-platform:W9825G6KH`, embedded in the sheet. The committed `sym-lib-table` already names
  `circuits/h7-platform/h7-platform.kicad_sym` in place, and was not changed.
- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D and GND
  are rows ending in their hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. U3's VDD/VDDQ (3V3_D) and VSS/VSSQ (GND) are power inputs, so the sheet alone reports
  `power_pin_not_driven` on both; under the one-block root the stubs carry their flags, which clears
  both. `pwr-flag-homes.ts` is unchanged.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  **22 entries added to `repair/tools/cross-page-drivers.ts`**, one per SDRAM net whose only pin on
  this page is a U3 input: SDRAM_A0 to SDRAM_A12, SDRAM_BA0, SDRAM_BA1, SDRAM_NBL0, SDRAM_NBL1,
  SDRAM_CLK, SDRAM_CKE, SDRAM_NWE, SDRAM_NRAS and SDRAM_NCAS, each driven by U1's FMC pin on the mcu
  page. Each entry names the `module-pins.ts` line the assignment is taken from and the LQFP-176
  position, and the table's model check holds every one of them on each run (the pin is on the net
  in the model, U1 is in the mcu block, and the installed STM32H743IITx symbol names the pin as the
  entry does). These are exactly the 22 `pin_not_driven` errors the draft reports on `/sdram/`.
  SDRAM_NE needs none: R9's passive pin is on it with U3's /CS, and ERC reports nothing there. The
  sixteen data nets need none: U3's DQ pins are bidirectional.
- The stroke of the 38 one-pin SDRAM nets, which the draft drew no wire for: the default stroke the
  draft gives SDRAM_NE (`sdram/layout.py`, `UNDRAWN_STROKES`, which says why no family colour was
  taken, as on the qspi page). A drawing choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| ports on the wrong net (CR-MODULE-PORT-LABEL-CHECK) | 40 of 41 (only SDRAM_NE's net is `/SDRAM_NE`; 38 one-pin ports unwired) | 0 of 41 |
| exported components, nets, net members | 9, 42, 70 | 9, 42, 70 |
| exported nets carrying a model net name | 3 of 42 (/SDRAM_NE, 3V3_D, GND) | 41 of 42 (every port; the other is U3's NC pin 40) |
| ERC, the sheet alone | 62 errors (`pin_not_connected` 38: U3's one-pin signals, unwired; `pin_not_driven` 22; `power_pin_not_driven` 2), 0 warnings | 55 errors (`pin_not_connected` 31: hierarchical labels with no parent sheet, see below; `pin_not_driven` 22; `power_pin_not_driven` 2), 39 warnings (`isolated_pin_label` 38, `lib_symbol_issues` 1, see below) |
| ERC under a one-block root, `/sdram/` | 62 errors (`pin_not_connected` 38, `pin_not_driven` 22, `power_pin_not_driven` 2), 2 warnings (`same_local_global_label` 2) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 80 errors (`hier_label_mismatch` 41, `label_dangling` 39), 3 warnings | 1 error (`label_dangling` 1: SDRAM_NE's stub label is alone with one block), 33 warnings (`isolated_pin_label` 32, `lib_symbol_issues` 1) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings | 0 | 6: the west GND stubs from pins 6 and 12 over the west 3V3_D bus, at (91.44, 91.44) and (91.44, 106.68); SDRAM_NE's row over both west buses, at (91.44, 124.46) and (88.9, 124.46); the east 3V3_D stubs from pins 49 and 43 over the east GND bus, at (172.72, 91.44) and (172.72, 106.68) |
| T-meetings | 0 | 0 |
| orphan junctions, of total | 0 of 0 | 0 of 28 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 30 on 3 nets (29 global) | 41 on 41 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 30 | 0 of 41 |
| symbols (parts, power symbols, PWR_FLAGs) | 9 (9, 0, 0) | 9 (9, 0, 0) |
| placed pins | 70 | 70 |
| wires, total length | 33, 193.04 mm | 102, 1932.94 mm |
| wire corners | 1 | 6 |
| junctions | 0 | 28 |

**Two things in the ERC rows, measured and not diagnosed further:**

- **`lib_symbol_issues`** (warning): *"The current configuration does not include the symbol library
  'h7-platform'"*, on U3. kicad-cli reads the directory's `sym-lib-table` only for a sheet with a
  `.kicad_pro` beside it, and `drafted/h7-platform/h7-module/` has none yet (the root's project
  comes in Task 7 step 4). Measured with kicad-cli 10.0.5: this page, the committed `sym-lib-table`
  and the library copied into the same relative layout in a scratch directory report the counts in
  the table; with an empty `sdram.kicad_pro` (`{}`) added beside the page, the same counts by type
  less the one `lib_symbol_issues`. The one-block root's scratch directory carries no `sym-lib-table`, so
  it reports the warning on `/` as well. The draft's sheet-alone run does not, because `make draw`
  writes a `.kicad_pro` beside each draft.
- **The sheet-alone `pin_not_connected` count is 31, not 41.** Each is a hierarchical label with no
  parent sheet; kicad-cli 10.0.5 did not report the labels GND, SDRAM_A0 to A3, SDRAM_A10,
  SDRAM_BA0, SDRAM_BA1, SDRAM_D9 and SDRAM_D10 on this page, the same on two runs. An earlier layout
  of this page (the capacitors 300 mil apart) gave 41. The sheet-alone run is reported, not judged
  (`verify.sh` judges the run under the one-block root), so this changes no verdict; why kicad-cli
  leaves those ten out was not looked into.

### What the page shows, as observations

- U3 in the middle, its pins in the part's own order: 1 to 27 down the west side, 28 to 54 up the
  east side.
- Each one-pin signal runs straight out by one short stub to its hierarchical label beside its pin.
  West: SDRAM_D0 to D7, SDRAM_NBL0, NWE, NCAS, NRAS, BA0, BA1, A10 and A0 to A3. East: SDRAM_A4 to
  A9, A11, A12, CKE, CLK, NBL1 and D8 to D15.
- West of the west labels stand two vertical buses: 3V3_D nearer, taking VDD/VDDQ pins 1, 3, 9, 14
  and 27; GND farther, taking VSSQ pins 6 and 12, whose stubs cross the 3V3_D bus. East of the east
  labels: GND nearer, taking VSS/VSSQ pins 28, 41, 46, 52 and 54; 3V3_D farther, taking VDDQ pins
  43 and 49, whose stubs cross the GND bus.
- A 3V3_D row along the top of the page, from 3V3_D's hierarchical label at its west end, joins both
  3V3_D buses; a GND row along the bottom, from GND's label, joins both GND buses.
- SDRAM_NE runs west from pin 19 across both west buses to R9's pin 1 and on to its hierarchical
  label on the west edge; R9 stands above it, its pin 2 rising to the 3V3_D row.
- C36 to C42 stand in a row east of everything, each from the 3V3_D row down to the GND row.
- U3's pin 40 (NC) carries a no-connect.
- U3's Reference and Value are centred above its body, under the 3V3_D row; R9's and each
  capacitor's are east of its body.
- Every wire carries copperhead's default stroke.

## decoupling: the MCU's decoupling and bench pads (Task 7c)

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `8d20ff5196f59330bb77424024d856124808d3d49c5affe89db56f7516c416cb`.
Render: `decoupling.svg` beside it.

Repaired by the Task 7b steps, with `repair/decoupling/layout.py` and `repair/decoupling/02-wire.py`;
`repair/replay.sh` runs it through `repair_block`.

The block: `circuits/h7-platform/module/mcu-decoupling.ts`, 25 parts (C1 to C20 `Device:C`, TP1 to
TP5 `Connector:TestPoint`), ports 3V3_D, BOOT0, GND, VCAP and VREF_A (BOOT0 reaches one pin, TP5's;
VREF_A one pin, TP3's). **The page fits US Letter**: no overshoot to record.

### The rulings this page rests on

- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D, GND,
  VCAP, VREF_A and BOOT0 are wires ending in their hierarchical labels.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. Nothing on it is a power input (every pin is passive), so ERC needs none here.
  `pwr-flag-homes.ts` is unchanged. VCAP is not in it: U1's VCAP pins, on the mcu page, are power
  outputs (the table's own comment).
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  no entry needed; the page has no input pin.
- The stroke of VREF_A and BOOT0, which the draft drew no wire for: copperhead's stroke for a net of
  no colour family, which every net the draft draws here carries (`decoupling/layout.py`,
  `UNDRAWN_STROKES`). A drawing choice, not a transcription.

### Measurements, before (the draft) and after (this page)

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| ports on the wrong net (CR-MODULE-PORT-LABEL-CHECK) | 5 of 5 (no net `/<port>`; BOOT0 and VREF_A unwired) | 0 of 5 |
| exported components, nets, net members | 25, 5, 45 | 25, 5, 45 |
| exported nets carrying a model net name | 3 of 5 (3V3_D, GND, VCAP) | 5 of 5 |
| ERC, the sheet alone | 2 errors (`pin_not_connected` 2: TP3's and TP5's pins, unwired), 0 warnings | 5 errors (`pin_not_connected` 5: each hierarchical label has no parent sheet), 2 warnings (`isolated_pin_label` 2: VREF_A's and BOOT0's labels each meet one pin) |
| ERC under a one-block root, `/decoupling/` | 2 errors (`pin_not_connected` 2), 3 warnings (`same_local_global_label` 3) | **0 errors, 0 warnings** |
| ERC under a one-block root, `/` | 7 errors (`hier_label_mismatch` 5, `label_dangling` 2), 3 warnings | 1 error (`label_dangling` 1: VCAP's stub label is alone with one block, and carries no flag, since VCAP is in no flag table), 2 warnings (`isolated_pin_label` 2: BOOT0's stub label and the sheet's BOOT0 label, each meeting one pin) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings, T-meetings | 0, 0 | 0, 0 |
| orphan junctions, of total | 0 of 6 | 0 of 40 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 0; 0 | 0; 0 |
| labels | 31 on 3 nets (31 global) | 5 on 5 nets, all hierarchical |
| paper fit (US Letter) | fits | fits |
| wire groups with more than one stroke | 0 of 31 | 0 of 5 |
| symbols (parts, power symbols, PWR_FLAGs) | 25 (25, 0, 0) | 25 (25, 0, 0) |
| placed pins | 45 | 45 |
| wires, total length | 59, 389.89 mm | 87, 958.85 mm |
| wire corners | 14 | 4 |
| junctions | 6 | 40 |

### What the page shows, as observations

- Two bands. The upper band: a 3V3_D row along the top and a GND row under it, each from its
  hierarchical label on the west edge; C1 to C18 stand between them in reference order, west to
  east, pin 1 up to 3V3_D and pin 2 down to GND.
- The lower band: a VCAP row from its hierarchical label on the west edge, under GND's, with C19 and
  C20 hanging from it and TP1 standing up at its east end. East of it, VREF_A's hierarchical label
  and a short row to TP3, standing up; then BOOT0's hierarchical label and a short row to TP5,
  standing up.
- A second GND row under the lower band takes C19's and C20's feet and TP2 and TP4, which hang down
  from it, TP2 east of TP1's column and TP4 east of TP3's. It runs east and rises at the east edge to
  the upper GND row.
- Each capacitor's Reference and Value are east of its body; each test point's are east of its
  body, above its row when it stands up and below its row when it hangs down.
- Every wire carries copperhead's default stroke.

## mcu: the STM32H743 (Task 7d)

**Status: REVIEWED, 2026-11-12.** The owner's verdict, verbatim: *"approved"* (`docs/schematic/verdicts.md`). sha256 `c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981`.
Render: `mcu.svg` beside it.

**`verify.sh` exits 0 on this page since ruling
[CR-MODULE-VCAP-ERC](../../../docs/h7-platform/decisions.md#cr-module-vcap-erc)**, with no byte of
the page changed (same sha256). `repair/tools/erc-allowances.ts` declares the one ERC allowance the
ruling admits: sheet `/mcu/`, type `pin_to_pin`, between exactly U1 pin 81 and U1 pin 125, held to
the model on every run (both pins on VCAP in `h7Module()`, each typed `power_out` by the installed
symbol). `verify.sh`'s closing lines name the excused violation with the ruling id. The stock symbol
is kept. `erc-control.sh` controls 14 to 17 hold it: the page verifies; it fails on `pin_to_pin`
with the allowance removed through the test override; an allowance naming pins 81 and 126 is
refused by the model check; and on synthetic reports nothing near the exact match is excused.

**The history, kept: before the ruling, `verify.sh` exited 1 on this page, on one ERC error.** The model
comparison gives 0 disagreements and 0 of 90 ports on the wrong net. Under the one-block root, ERC
reports one error on `/mcu/`: `pin_to_pin`, *"Pins of type Power output and Power output are
connected"*, on *"Symbol U1 Pin 81 [VCAP, Power output, Line]"* and *"Symbol U1 Pin 125 [VCAP, Power
output, Line]"*. The stock symbol `MCU_ST_STM32H7:STM32H743IITx` types both VCAP pins `power_out`,
and the model joins them on one net, VCAP (`circuits/h7-platform/module/mcu.ts:37`, *"VCAP1 pin 81
joined to VCAP2 pin 125"*, from `processor-and-memory.md:136` and CORE-04). The draft carries the same
error, alone and under the one-block root. The page cannot remove it: no wiring of the two pins on one
net avoids it, and the model, the symbol and the ERC settings are not the page's to change. The real
root (Task 7 step 4) holds this sheet, so it will report the same error unless the ruling says
otherwise. Options for the ruling, none tried here: a project-level ERC exclusion of this one
violation, carried in the root's `.kicad_pro` and in `verify.sh` as a declared table like
`cross-page-drivers.ts`; a project symbol (design change C4) typing the VCAP pins otherwise, which
changes the model's symbol; or a project ERC pin map treating power output to power output as
allowed, which applies to every net in the project.

The block: `circuits/h7-platform/module/mcu.ts`, 1 part (U1 `MCU_ST_STM32H7:STM32H743IITx`, 176
pins), 90 ports: 3V3_D (17 pins), GND (12), VCAP (2) and VREF_A (2), and 86 that each reach one pin.
57 pins are NC.

### The rulings this page rests on

- [CR-MODULE-PAGE-RAILS](../../../docs/h7-platform/decisions.md#cr-module-page-rails): 3V3_D, GND,
  VREF_A, VSSA and VCAP are wires ending in their hierarchical labels; no power symbol.
- [CR-MODULE-PWR-FLAGS](../../../docs/h7-platform/decisions.md#cr-module-pwr-flags): no PWR_FLAG on
  this page. U1's VDD/VBAT/VDD33_USB (3V3_D), VSS (GND), VDDA (VREF_A) and VSSA are power inputs, so
  the sheet alone reports `power_pin_not_driven` on those four nets; under the one-block root the
  stubs carry the flags `pwr-flag-homes.ts` homes elsewhere (GND on power; 3V3_D, VREF_A, VSSA on the
  root), which clears all four. The table is unchanged: ERC needed no net it lacks.
- [CR-MODULE-CROSS-PAGE-DRIVERS](../../../docs/h7-platform/decisions.md#cr-module-cross-page-drivers):
  **2 entries added to `repair/tools/cross-page-drivers.ts`**, for the two `pin_not_driven` errors the
  page reported under the one-block root before them, on *"Symbol U1 Pin 31 [NRST, Input, Line]"* and
  *"Symbol U1 Pin 166 [BOOT0, Input, Line]"*:
  - NRST -> reset_boot, U5 pin 2 (`~{RESET}`), the supervisor's open-drain output
    (`circuits/h7-platform/module/reset-boot.ts:27`; U5's symbol `Power_Supervisor:TPS3839DBZ` types
    pin 2 `output`).
  - BOOT0 -> reset_boot, SW2 pin 1, the BOOT button to VDD (`reset-boot.ts:35`). R12, the pull-down,
    is the other passive pin on BOOT0 on that page; the table's model check needs a symbol pin
    number, and the model keys a resistor's pins `a`/`b`, so R12 cannot be named. Either is a passive
    pin and serves the stand-in alike; the real root must clear BOOT0 with its real pins.

  Every other U1 pin on a port is bidirectional (the GPIOs), a power pin, or an input on a net whose
  stub carries the root's flag (VREF+ on VREF_A, PDR_ON on 3V3_D). U1 is the driver of the FLASH_CLK
  and 22 SDRAM entries, so its one-block root places no stand-in for them. The two entries put a
  stand-in on NRST's stub when swd is checked and on BOOT0's when decoupling is checked; both pages
  still verify with 0 errors and 0 warnings on their sheets, same sha256.
- **Unused GPIOs are NC (CORE-27), as the model holds them.** Each of the 57 NC pins in the intent
  carries a no-connect and no wire; no NC pin is on a net.
- The stroke of the 86 one-pin nets, which the draft drew no wire for: copperhead's default stroke,
  which every net the draft draws here carries (`mcu/layout.py`, `UNDRAWN_STROKES`; the qspi and sdram
  pages' rule). A drawing choice, not a transcription.

### U1's rotation, and the paper, as measurements

**U1 stands at rotation 90 and the page fits the US Letter inner frame.** At rotation 0, U1 alone,
pin end to pin end, is 231.14 mm tall: taller than the sheet itself (215.9 mm), so part of it lies off
the paper and no render shows it. A rotation-0 layout was built and measured (the same steps, kept in
scratch, not committed): `paper_fit.py` gave **overshoot south 72.983 mm** and the 150 dpi render
stopped at the paper's edge, through the symbol's lower pins. At rotation 90 the symbol is 231.14 mm
wide and 71.12 mm tall; the page's content extent is x 13.97 to 265.43 mm, y 33.02 to 185.42 mm,
inside a frame x 11.980 to 267.377 mm, y 11.980 to 203.877 mm (**fits: yes**). The draft overshot
south by 61.553 mm. Paper, symbol and block are unchanged: US Letter, one 176-pin unit, one page. The
cost of rotation 90: every one-pin label and every side pin's name and number on U1 reads vertically.

### Measurements, before (the draft) and after (this page)

The page column is `verify.sh`'s own output: since ruling CR-MODULE-VCAP-ERC it runs every step
and exits 0 on this page (re-run in Task 7e: crossings, junctions, labels, paper and counts as
below). Before the ruling it stopped at the ERC failure, and these rows came from the same steps
run without stopping, with the same values. The draft's come from the same steps on the draft.
None of these is a judgement of the page.

| measure | draft | page |
| --- | --- | --- |
| netlist export against the block's model: componentIdentity, netMembership, pinIdentity, values | 0, 0, 0, 0 | 0, 0, 0, 0 |
| ports on the wrong net (CR-MODULE-PORT-LABEL-CHECK) | 88 of 90 | 0 of 90 |
| exported components, nets, net members | 1, 147, 176 | 1, 147, 176 |
| exported nets carrying a model net name | 4 of 147 (/3V3_D, /VCAP, GND, VREF_A) | 90 of 147 (every port; the other 57 are the NC pins) |
| ERC, the sheet alone | 93 errors (`pin_not_connected` 86: the one-pin signals, unwired; `pin_not_driven` 2; `pin_to_pin` 1; `power_pin_not_driven` 4), 1 warning (`ground_pin_not_ground` 1) | 97 errors (`pin_not_connected` 90: hierarchical labels with no parent sheet; `pin_not_driven` 2, NRST and BOOT0; `pin_to_pin` 1, VCAP; `power_pin_not_driven` 4, on 3V3_D, GND, VREF_A, VSSA), 87 warnings (`isolated_pin_label` 86, `ground_pin_not_ground` 1) |
| ERC under a one-block root, `/mcu/` (the two driver entries in the table) | 93 errors (`pin_not_connected` 86, `pin_not_driven` 2, `pin_to_pin` 1, `power_pin_not_driven` 4), 3 warnings (`ground_pin_not_ground` 1, `same_local_global_label` 2) | **1 error (`pin_to_pin` 1: U1 pins 81 and 125, VCAP, see above)**, 1 warning (`ground_pin_not_ground` 1) |
| ERC under a one-block root, `/mcu/`, before the two driver entries | not run | 3 errors (`pin_not_driven` 2: U1 pins 31 NRST and 166 BOOT0; `pin_to_pin` 1), 1 warning |
| ERC under a one-block root, `/` | 174 errors (`hier_label_mismatch` 90, `label_dangling` 84), 6 warnings | 1 error (`label_dangling` 1: VCAP's stub label, alone with one block and in no flag table), 166 warnings (`isolated_pin_label` 166) |
| parenthesis depth at end, lowest | 0, 0 | 0, 0 |
| true wire crossings | 1, at (176.53, 48.26) | 1, at (21.59, 160.02): the VREF_A row over the 3V3_D bus (`mcu/layout.py` says why two nets must cross once) |
| T-meetings | 120 | 0 |
| orphan junctions, of total | 0 of 1 | 0 of 18 |
| wire-to-wire tees without a dot; collinear overlapping pairs | 15; 120 | 0; 0 |
| labels | 5 on 4 nets (3 global) | 90 on 90 nets, all hierarchical |
| no-connects | 57 | 57 |
| paper fit (US Letter) | overshoot south 61.553 mm | fits |
| wire groups with more than one stroke | 0 of 5 | 0 of 90 |
| symbols (parts, power symbols, PWR_FLAGs) | 1 (1, 0, 0) | 1 (1, 0, 0) |
| placed pins | 176 | 176 |
| wires, total length | 41, 722.63 mm | 133, 1059.18 mm |
| wire corners | 4 | 7 |
| junctions | 1 | 18 |

**`ground_pin_not_ground`** (warning), on both: *"Pin VSSA not connected to ground net"*, U1 pin 37.
The model puts pin 37 on its own net, VSSA (`module/mcu.ts`); KiCad warns because the net is not named
as a ground. A warning, so it decides nothing here; recorded because the real root will carry it too.

### What the page shows, as observations

- U1 lies across the page at rotation 90, its body a wide rectangle; the group rectangle and its
  caption enclose it and every label.
- The north face carries U1's former east pins, PA0 at the west end to PE15 at the east end; the south
  face its former west pins, NRST at the west end to VCAP at the east end. Each one-pin signal runs
  straight up or down by one short stub to its hierarchical label, which reads vertically.
- Each NC pin carries a no-connect cross at its end.
- The west face carries the 17 supply pins, VDDA at the north end and VBAT at the south end. The 16
  3V3_D pins run west to a vertical 3V3_D bus, which runs south under the bottom labels, east under
  PDR_ON and up to it; 3V3_D's label stands at the foot of the bus. VDDA runs west past the bus's north
  end to a VREF_A bus farther west, which runs south, east under VREF+ and up to it, crossing the 3V3_D
  bus once; VREF_A's label stands at its foot.
- VCAP's two pins, at the east end of the south face, meet at a tee under the body and run down to
  VCAP's label.
- The east face carries VSSA and the stacked VSS point (one pin shown, 14); each runs east 100 mil
  and turns, VSSA up to its label, GND down to its label.
- U1's Reference and Value are centred in the body. Every wire carries copperhead's default stroke.
