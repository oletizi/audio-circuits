# Task 7e fix round 1 report: the supervisor symbol, and the root on US Letter

## Status

DONE_WITH_CONCERNS. Both rulings are implemented. Every MUST HOLD check passes; the quoted results are below. The concerns are about how far the work reached past its stated mechanism, and about what the owner is now shown. None of them leaves a check failing.

## Ruling 1: CR-MODULE-SUPERVISOR-SYMBOL, amended

### The library scan

I read all 223 installed libraries from the files, `Power_Supervisor` first, comparing name, number and electrical type. Scratch scripts: `scan-supervisor.ts`, `scan-near.ts` and `scan-skipped.ts` in the scratchpad's `t7e-fix/`.

- **No symbol has 1 = GND, 2 = `~{RESET}` typed `open_collector`, 3 = VDD or VCC.**
- Two symbols match by name alone, and both type pin 2 `output`:
  - `Power_Supervisor:LM809`: 1 GND, 2 `~{RESET}`, 3 VCC.
  - `Power_Supervisor:TPS3839DBZ`: 1 GND, 2 `~{RESET}`, 3 VDD.
- `symbolPins` refuses 1,347 symbols, because they are multi-unit or declare a pin number twice. I read those by text, and none has a pin 2 named `~{RESET}` typed `open_collector`. The text reader is controlled on TPS3839DBZ and on MCP120-xxxHxTO, and reads both correctly.

### The project symbol

There was no stock match, so I made the C4 project symbol `h7-platform:TLV803EA30DBZR` in `circuits/h7-platform/h7-platform.kicad_sym`, the library the SDRAM symbol is in.

- **Pins** come from TI SLVSES2J p. 5 Table 6-1, column "DCK, DBZ":
  - pin 1 GND, `power_in` (I/O "—");
  - pin 2 RESET overbarred, `open_collector`;
  - pin 3 VDD, `power_in` (I/O "I", the supply).
- **The open-drain type.** Table 6-1 gives RESET only as "O". The open drain is stated on p. 1, Features ("TLV803E: open-drain, active-low"), and p. 3, section 5 Device Comparison ("803E: Open-Drain Active-Low"). I read all three pages from the PDF at `pedals-work/.../interface-analysis/sources/TI-TLV803E-SLVSES2J.pdf`.
- **Geometry** is TPS3839DBZ's, copied by a script that asserts each replacement count: the body, the pin positions and lengths, and the field positions. Only the name, Value, Datasheet, Description and pin 2's type differ. That is why the page keeps every position and wire.

### Code and tests

- `circuits/h7-platform/module-parts.ts`: `SUPERVISOR.symbol` is the project symbol. `SUPERVISOR_PIN_TYPES` is added, and the `DATASHEET_PIN_NAMES` key has moved.
- `tests/circuits/h7-module-parts.test.ts`:
  - The scan now covers every installed library, by name, number and type, and requires no match.
  - Positive control: the name-only scan still finds exactly TPS3839DBZ.
  - **Negative control: TPS3839DBZ is rejected for its pin-2 type.** `typeMismatches` gives `["2"]`, and its pin 2 reads `output`.
  - The project symbol matches both tables, and its pin geometry equals TPS3839DBZ's.
- `tests/circuits/h7-project-symbol.test.ts` shows C4's precondition. Copperhead drafts the symbol, and kicad-cli exports each pin on the datasheet's name and type (pin 2 `pintype "open_collector"`).
- `repair/tools/cross-page-drivers.ts`: `installedSymbolPin` is renamed `libraryPin` and resolves the `h7-platform` nickname to the project library. It read only KiCad's installed libraries before, so it would have failed on U5. `erc-allowances.ts` uses it.

### The same-class audit

**U5 is the only stand-in. No other part has a symbol named for another part, so there was nothing else to fix.**

- I listed every distinct (symbol, mpn) pair of the 94 components `h7Module()` returns, and read each `decisions.md` ruling that says "stand-in".
- Among those rulings, CR-MODULE-CROSS-PAGE-DRIVERS's `Connector:TestPoint` is placed only on the scratch roots, so it is not a module part. O-16 and OWN-07 mean Seed3 boards, not symbols.
- The ICs' symbols are named for their own parts: U1 STM32H743IITx, U2 TPS62933F, U3 the project W9825G6KH, U4 W25Q128JVS, U6 USBLC6-2SC6. The rest are generic.
- The table is in `RECORD.md`, "The same-class audit".

### The reset_boot page

**The mechanism differs from the brief, and the criterion is met.** The symbol enters through the model, so `make draw`'s intent for reset_boot changes by one line, U5's `libId`. That changes the draft's sha256 from `ce427183…` to `a68c14b8…`.

- `replay.sh` then repairs the page by its committed steps. **Every generated op-list was byte-identical to the committed one:** `ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`, `02-wire.nets.json` and `04-hierarchical-labels.json`.
- So no akcli symbol-replace op was needed, and none was written or committed under `repair/reset_boot/`. What changed there is `intent.json`, plus one comment in `layout.py`.
- `diff` against the approved bytes shows eight lines, all the symbol:
  - `lib_id`;
  - the embedded symbol's name and its two unit names;
  - its Value, Datasheet and Description;
  - pin 2, `output` to `open_collector`.
- The new SVG differs from the old only in its timestamp.

| | |
| --- | --- |
| reset_boot sha256 | old `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397`, new `00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24` |
| status in RECORD.md | "UNREVIEWED (changed after approval: symbol swapped per amended CR-MODULE-SUPERVISOR-SYMBOL; the owner's earlier approval was of sha256 ca60cfca…)". The earlier verdict is kept as History. `docs/schematic/verdicts.md` is not touched |
| SVG | `drafted/h7-platform/h7-module/reset_boot.svg` |
| PNG, 150 dpi | `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7e-fix/render/reset_boot.png` |
| `verify.sh reset_boot` | exit 0. `/reset_boot/` under its one-block root: 0 errors, 0 warnings |

Two `lib_symbol_issues` warnings are new: one on the sheet alone, and one on the one-block root's `/`. The scratch roots have no `sym-lib-table` that reaches the project library. The sdram page, whose U3 is a project symbol, shows the same pair. Both are recorded in `RECORD.md`.

## Ruling 2: CR-MODULE-ROOT-FITS-LETTER

### The new arrangement

`tools/draught/assemble-root.ts` now takes its arrangement from the new `tools/draught/root-arrangement.ts`. The rule is deterministic:
- Pins are 100 mil apart, and stubs are 200 mil long.
- Each block is a cell sized from its port count and text lengths, at a measured 48 mil per character, estimated at 50.
- Cells are packed tallest first, ties in `Network.blocks` order. Each goes at the first candidate point, smallest y then x, inside the frame, clear of the title block (measured, `docs/research/2026-10-30-letter-repaper.md` section 3), and at least 100 mil from every other cell.
- A block whose pins do not fit one edge within the frame splits them, first half on the west edge and the rest on the east. On the module only mcu splits, 45 and 45.
- A board that cannot fit is refused, naming the block.

**I tried a column rule first, and it could not fit the module.** That was blocks in order down columns, with a new column at the frame or the title block. The column rule is not in the commit; I replaced it with the packing before committing.

### Why two more repair steps were needed

The first render, measured from the SVG's stroked-text ink, showed two faults. These are geometry measurements, not a review.

- **(a) Pin names crossed their edges.** akcli writes no justify on a sheet pin, and kicad-cli then centres the name about 1.45 mm inside the edge. A long name crossed the box edge and the stub, and ran into its own label: `SDRAM_A5` on mcu's east edge, and `USB_VBUS_SENSE` on interface's west edge.
  - KiCad's own demo files write east-edge pins `(justify right)` and west-edge pins `(justify left)`. That is 810 pins, read from the files.
  - So `repair/tools/root_pin_justify.py` (root step 5) justifies all 204 pins. It refuses a second run, and a count that differs from `01-assemble.json`.
- **(b) PWR_FLAG text sat on neighbouring labels.** At 100 mil pitch, the PWR_FLAGs on mcu's east-edge VREF_A and VSSA labels put their text on the VCAP and VREF_A labels.
  - `repair/tools/root-flags.ts` now puts each flag on the first stub label of its net that is the top pin of its edge (rotation 0), or else the bottom pin (rotation 180). It refuses otherwise.
  - The result: 3V3_D on mcu west, top; VREF_A on decoupling, bottom; VSSA on mcu east, bottom.
- After both steps, the ink measurement finds 0 overlapping text pairs; there were 50 before.
- Four sheet names (power, qspi, id_strap, decoupling) touch their box's top line with a descender.

### The fit, measured

`paper_fit.py` does not measure a `(sheet ...)` box, so I wrote `repair/tools/root_sheets_fit.py` to check every sheet box.
- Every sheet box must lie inside the frame and clear of the title block. It finds 12 of 12 on the new root. The old root fails it, with 2 of 12 on the paper.
- `verify-root.sh` now fails unless `paper_fit.py` prints "fits: yes" and `root_sheets_fit.py` passes.
- `root-control.sh` control 10:
  - The committed root is 12 of 12 and "fits: yes".
  - In a scratch copy with interface moved 100 mm south, `root_sheets_fit.py` fails naming interface, and `verify-root.sh` fails naming `sheets-fit`.

### The root page

| | |
| --- | --- |
| root sha256 | `3590b959500bd1a3d359915094601450f5437ce071a644dad084aa20e98a99ed` (was `fd7baeab…`) |
| paper fit | `paper_fit.py`: "fits: yes", content x 25.400 to 232.410 mm, y 20.320 to 177.800 mm. `root_sheets_fit.py`: "sheets on the paper: 12 of 12" |
| SVG | `drafted/h7-platform/h7-module/h7-module.svg` |
| PNG, 150 dpi | `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7e-fix/render/root.png` |
| `.kicad_pro` | unchanged, `62905f75…` |

- **How the PNG was made.** It comes from `sh repair/tools/render.sh drafted/h7-platform/h7-module/h7-module.kicad_sch <dir> root`. I then renamed `h7-module.png` to `root.png`, which is the only manual step.
- **render.sh** now takes an optional third argument: a KiCad page number, or `root`, read from the sheet's own `sheet_instances`.
  - It is passed to kicad-cli's `--pages`, and the PDF must then hold exactly one page.
  - With no argument, a multi-page PDF is refused.
  - Controls run: reset_boot with no page renders; the root with `root` renders 1 page; the root with no page is refused, naming the 13 pages; a page of `x1` is refused.

### The two-block fixture

The fixture's root and `repair/root/01-assemble.json` were regenerated by the same tool. I updated the root sha256, `7fb295e5…` to `4a1087d1…`, in its `replay.sh`, `REPLAY.md` and `RECORD.md`. `RECORD.md` also records the regeneration.
- The fixture's `replay.sh` into a new directory reaches every sha256.
- `two-block-project.test.ts` passes, with its three negative controls and the positives.
- A fresh export differs from `two-block-board.net` only in the `(date)` and `(source)` lines, so the committed export was not regenerated.
- `a.kicad_sch` and `b.kicad_sch` are unchanged.
- The fixture's root does not go through `root_pin_justify.py`: it is test data and is never reviewed.

## After both

- **Root ERC:** 0 errors. One excluded violation: `pin_to_pin` on `/mcu/`, U1 81 and 125, under CR-MODULE-VCAP-ERC. Four warnings:
  - `lib_symbol_mismatch` 3 on `/`, for U2, U4 and U6, unchanged from Task 7e. U5 does not appear.
  - `ground_pin_not_ground` 1 on `/mcu/`, for U1 pin 37.
- **`verify-root.sh`:** exit 0, "every check passed".
- **Root export:** componentIdentity, netMembership, pinIdentity and values are each 0. "export: 94 components, 174 nets, 482 net members; model: 94 components". PWR_FLAGs: 5, one on each of 5 nets, each at its home. Cross-page drivers: 25 of 25.
- **`erc-control.sh` control 18** runs `root-control.sh`; "10 root controls came out as stated".
- **`tests/fixtures/h7-module.net`** was regenerated by `make netlist-agrees` after the symbol change. Only U5's libsource and libpart changed. The root's new layout left the export unchanged.

## MUST HOLD, quoted (scratchpad `t7e-fix/final.sh`, log `final.log`)

- **Block page sha256s against 71db737:** eleven "unchanged". `reset_boot CHANGED ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397 -> 00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24`. Carrier `c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8`, as wanted.
- **verify.sh on the twelve block pages:** each "exit 0"; "verify.sh failures: none".
- **verify-root.sh:** "exit 0 (verify-root.sh: every check passed)".
- **replay.sh into a new empty directory:** "exit 0". It reached:
  - reset_boot `00407478…`, "byte-identical to the committed sheet";
  - root "after root 01 to 04 … 3590b959…", "byte-identical to the committed root";
  - `.kicad_pro` `62905f75…`;
  - "every block sheet is unchanged by the root's assembly".
- **`bun run typecheck`:** exit 0.
- **bun test:** h7-module, h7-module-parts, drafted-kicad-round-trip, h7-carrier, two-block-project, h7-project-symbol, root-arrangement and drawing-pages: "127 pass, 0 fail".
- **`make -C boards/h7-module check`:** exit 0.
- **Port verify.sh:** exit 0, 17 lines starting `PASS`.
- **erc-control.sh:** "exit 0 (erc-control.sh: every control came out as stated)". Control 18: "10 root controls came out as stated".

## Commits (all pushed to feature/digital-pedal-platform)

- `3889312`: U5 on a project symbol typing RESET open drain (Ruling 1, render.sh, the fixture netlist).
- `75c4b6f`: the root fits US Letter, every sheet symbol on the paper (Ruling 2, the fixture root, docs).
- `299405c`: no `as const` in root-arrangement.ts.

## Concerns

1. **The redraw mechanism is not the brief's.** No akcli replace op was written: the model change and the existing replay produced the swap, with every op-list byte-identical. The criterion is met, since the diff shows only the symbol lines. But nothing new is committed under `repair/reset_boot/` apart from `intent.json` and a comment.
2. **Ruling 2 went past the arrangement.** It also needed two root repair steps the brief did not name: pin-name justification, and a new rule for where the root PWR_FLAGs stand. Without them, the render had measured text collisions. Both are recorded in CR-MODULE-ROOT-FITS-LETTER, and both are fixed rules. The controller may want to look at the flag rule, which changes where two of the three root flags stand (VREF_A and VSSA).
3. **akcli writes no justify on sheet pins.** That is a tool limit. The h7 root is patched by `root_pin_justify.py`; the two-block fixture's root is not, because it is test data. Any later multi-page board needs the same step, or an akcli op. `TOOLING.md` C3 now says so.
4. **The ink measurement is a scratch script**, `svg_stroked_text.py` in the scratchpad, not a committed check. The "0 overlapping text pairs" figure comes from it. I did not commit it as a check, because it is a measurement of the drawing's text and not a gate anyone ruled.
5. **The reset_boot page is UNREVIEWED again,** and the root has changed. The controller still has to update `docs/schematic/verdicts.md` and send both pages to the owner.
6. **The page numbers on the root.** akcli numbers a sub-sheet's page by its op index, so the block pages are numbered 2, 183, … and not 2 to 13. This was so before this round too; I did not change it.
7. Pre-existing failures, not run and not mine: `make check` at boards/pt2399-core, and `tests/stripboard/temp-scratch.test.ts`.
