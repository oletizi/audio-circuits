### Task 7: Draw the module, page by page, and send each page

**Files:**
- Create: `drafted/h7-platform/h7-module/` (the root, one sheet per block, `RECORD.md`, `repair/`)
- Modify: `boards/h7-module/perfboard.json` (`sch`, `netlist`) once the project exists; `tests/circuits/h7-module.test.ts` (`registerDraftedProjectTests`); `tests/circuits/drafted-kicad-round-trip.test.ts`; `tests/fixtures/h7-module.net`, which is `kicad-cli`'s export of the root, written by `make netlist-agrees`

- [ ] **Step 1: Toolchain.** Run `make draught-doctor`: every pinned tool matches.
- [ ] **Step 2: Draft every page.** Run `make -C boards/h7-module draw`. Record the advisory, the per-page `NO INDEPENDENT NETLIST:` notice, and each page's paper overshoot.
- [ ] **Step 3: Repair one block page at a time, in this order:**
  - power;
  - interface;
  - the small blocks (clock, reset-boot, swd, usb-dfu, id-strap, qspi);
  - vdda;
  - sdram;
  - mcu-decoupling;
  - mcu.

  For each page:
  - repair with akcli (place, wire, hierarchical labels, text), with the op-lists committed under `repair/<block>/`;
  - check it against the block's model (0 disagreements) and with ERC (0 errors);
  - render;
  - **send the render to the owner with a question and nothing else**, then go on to the next block. Do not wait for a verdict. A verdict asking for a change takes precedence over the next block (spec, Sequence).
- [ ] **Step 4: Assemble the root** from `assemble-root.ts`. Then:
  - export the root and bind it with `registerDraftedProjectTests`: 0 disagreements and every component once;
  - write the fixture with `make netlist-agrees`;
  - run `replay.sh` into a new empty directory, and require it to reach every sha256;
  - send the root render to the owner with a question.
  - **PWR_FLAGs (ruling CR-MODULE-PWR-FLAGS, added in Task 7a fix round 1).** The root must place the root-held flags (every net `drafted/h7-platform/h7-module/repair/tools/pwr-flag-homes.ts` homes on `root`: 3V3_D, VREF_A, VSSA as it stands; none on GND, whose flag is the power page's), check exactly one PWR_FLAG per net across the whole hierarchy against that table, and reach 0 ERC errors on the root. `assemble-root.ts` places no flag today. See RECORD.md, "What the root must do about PWR_FLAGs (Task 7b)".
- [ ] **Step 5: Records.**
  - `RECORD.md` lists every controller ruling the pages rest on, linked to `decisions.md`, plus the C3 notes and the measurement set before and after each repair.
  - After the owner's verdicts, or when they ask, send the rulings summary as a separate message.
  - Commit the execution record to `docs/superpowers/plans/2026-11-12-h7-module-pages-execution/` (CLAUDE.md, "commit the execution record").
  - Commit and push.

## Risks the owner should know about

- **The MCU page.** The stock STM32H743IITx symbol is one 176-pin unit. It may not fit a Letter page with its nets, even alone. The plan draws it and sends it anyway. If it does not fit, that is a question for the owner, attached to the page.
- **Repair cost.** Pages above 44 symbols have never been repaired here. Splitting blocks at 40 symbols is the protection, and the order in Task 7 puts the small pages in front of the owner first.
- **The VDDA figures are bounds, not a demonstration.** Without Murata's impedance curve and the capacitors' DC-bias curves, the VDDA rows stay open even when the analysis passes.
- **copperhead's global labels.** A global label on a private net would join two blocks silently. The hierarchical-label repair and negative control 3 are the protection. A page repaired by hand outside that script would not be covered.
