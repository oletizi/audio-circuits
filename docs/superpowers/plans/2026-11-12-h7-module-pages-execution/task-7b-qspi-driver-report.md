# Task 7b: qspi cross-page driver fix, report

Status: DONE. Commit 27bc5a0, pushed to origin/feature/digital-pedal-platform.

## What changed

- `drafted/h7-platform/h7-module/repair/tools/cross-page-drivers.ts` (new): the declared table
  `CROSS_PAGE_DRIVERS`, with one entry: FLASH_CLK -> mcu, U1 pin 28 (PF10). Its source is cited
  (module-pins.ts, pedals CORE-BRIEF.md:382 @5b926d0, ST position 28). `checkCrossPageDrivers` holds
  every entry to `h7Module()` and refuses an entry, naming each problem, when:
  - the block is unknown;
  - the designator does not name exactly one component of that block;
  - the pin is missing, or is on another net or NC;
  - the driving block has no port on the net;
  - the pin name differs from the installed KiCad symbol's name for that pin number;
  - two entries name one net.
  `standInsFor` selects the entries for a block that reaches the net and is not the driving block.
  Setting `H7_CROSS_PAGE_DRIVERS_TABLE=<json>` replaces the table for tests. It says so on stderr, and
  the replacement goes through the same model check.
- `one-block-root.ts`: runs the check on every invocation, then places a `place_component`
  `Connector:TestPoint`, reference `#DRV<n>`, at each selected net's stub label. Its log line now
  lists the stand-in drivers.
- `erc_sheets.py`: prints each error on the block's own sheet with the items KiCad names
  (`at <type>: <items>`). The verdict logic is unchanged.
- `erc-control.sh`: controls 1 to 9 are kept unchanged, and 10 to 12 are added (below).
- `erc-one-block-root.sh`: one header comment line.
- `docs/h7-platform/decisions.md`: `### CR-MODULE-CROSS-PAGE-DRIVERS`, in the form of
  CR-MODULE-PWR-FLAGS, dated 2026-11-12, "Controller ruling (the owner may override)". It records the
  mechanism and the measurement.
- `drafted/h7-platform/h7-module/RECORD.md`:
  - The root section: the real root (step 4) must clear every table entry with its real driver, with
    no stand-in.
  - The qspi section: the page now verifies, citing the ruling. The earlier failure is kept as
    history, and the ERC table rows are split into before and after the ruling.

## The stand-in mechanism: what was measured

All of this was run with kicad-cli 10.0.5 on the committed qspi page (a9578cf6…) under its one-block root.

| candidate | result on `/qspi/` |
| --- | --- |
| No stand-in (baseline) | 1 error, `pin_not_driven` on "Symbol U4 Pin 6 [CLK, Input, Line]" |
| Root sheet pin FLASH_CLK typed `output` instead of `input` | the same 1 `pin_not_driven`. A sheet pin is not counted as a driver, so this was rejected |
| `Connector:TestPoint` at the FLASH_CLK stub label, ref `DRV1` | 0 errors, 0 warnings |
| The same, ref `#DRV1` | 0 errors, 0 warnings. `/` has `label_dangling` 1 and 9 warnings in both runs |

Library scan of every top-level symbol under
`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`:
- No one-pin symbol of type output or bidirectional exists. The one-pin symbols are input 4,
  passive 13, power_in 101 and power_out 1 (PWR_FLAG, which is excluded).
- Every output-pin symbol with three pins or fewer has two other pins (power_in, input or passive)
  that would need tying off on the root.
- `Connector:TestPoint` was verified on disk in `Connector.kicad_sym`: one pin, number 1, passive, at (0 0).

KiCad counts a passive pin as a driver for `pin_not_driven`. The page shows this independently:
U4's /CS shares a net with R10's passive pin and is not reported.

## Checks

| check | result |
| --- | --- |
| sha256 | unchanged on all eight module pages (power 906f4549…, interface 0cfb3dac…, clock 83f751b2…, reset_boot ca60cfca…, swd 48692365…, usb_dfu 80947ede…, id_strap 7649af43…, qspi a9578cf6…) and on the carrier c9355a88… |
| `verify.sh` | exits 0 on all eight pages, each `/<block>/` at 0 errors and 0 warnings |
| `erc-control.sh` | exit 0; every control came out as stated (detail below) |
| `replay.sh` | exit 0; every replayed sheet is byte-identical, including qspi |
| `bun run typecheck` | clean |
| `bun test` on the three files | 59 pass, 0 fail |
| port `verify.sh` | 17 PASS |

The three new `erc-control.sh` controls:
- **10:** the qspi page verifies, with `/qspi/` at 0 errors and 0 warnings.
- **11:** with the `[]` override, the page fails with "at pin_not_driven: Symbol U4 Pin 6 [CLK, Input, Line]".
- **12:** an entry naming U1 pin 29 is refused with "U1 pin 29 is on net HSE_IN in the model, not on FLASH_CLK".

No `.kicad_sch` was modified.

## Concerns

- A passive stand-in proves only that the net is driven somewhere. It cannot raise a `pin_to_pin`
  conflict between the block's pin and the real driver's type (U1 PF10 is bidirectional on
  `MCU_ST_STM32H7:STM32H743IITx`). The real-root requirement in RECORD.md covers this, but no check
  exists for it until step 4 assembles the root.
- The test override is an environment variable that `verify.sh` inherits. It announces itself on
  stderr, but a caller who set it would get a verdict from the overridden table. Only
  `erc-control.sh` sets it.
- The pin-name check reads the installed KiCad library at the macOS path through `defaultSymbolDir`.
  On a machine without that library it throws rather than skips.
- The qspi page's status stays UNREVIEWED. The other agent's review is independent of this change.
