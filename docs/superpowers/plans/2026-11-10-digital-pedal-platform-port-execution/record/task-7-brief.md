Task 7 — your row of the topic-task table (the shared steps follow below):

| Task | Document | Sources | Must contain (added to `verify.sh` as check `<name>`) |
|---|---|---|---|
| 7 | `processor-and-memory.md` and `firmware-facing-requirements.md` | `CORE-BRIEF.md` **as amended by split spec §9.4** (D4 and D13 withdrawn, D20–D24 in force, other core assumptions amended; use the current meaning and link `decisions.md`); `SDRAM-COMPATIBILITY.md`; split spec §6, §11, §12.4; original spec firmware sections; `facts.md` §4–§8 | check `firmware`: in `firmware-facing-requirements.md`, `H750`, `H743`, `QSPI`, `32 MB`, `bootloader`, `SAI2`, `watchdog`, `USB`, and the sentence that this repository does not own firmware |

### Tasks 3–8: topic documents (one task each, same shape)

Every topic task follows the same five steps. The table gives each task's document, sources and required content. The sources are pedals paths at the pin; "spec" means the split spec unless the original is named.

| Task | Document | Sources | Must contain (added to `verify.sh` as check `<name>`) |
|---|---|---|---|
| 3 | `architecture.md` | split spec §1, §3–§8, §13.1, §14, §16; original spec; `MODULE-INTERFACE.md`; `interface-analysis/facts.md`; `crossings.md` (interface rules part) | check `architecture`: `h7-module`, `h7-pedal`, `bring-up carrier`, `J_MOD_A`, `J_MOD_B`, `SAI2`, `VREF_A`, `reservedCompatibility`, `IF-PD-1` |
| 4 | `power.md` | `POWER.md`; `interface-analysis/vin-mod.md`, `3v3-d.md`, `pedal-digital-rail.md`, `power-fail.md`; ledger R-50, R-58, R-59 | check `power`: `Q_PEN`, a line containing `9 V` and `Seed`; and global check `effective` (below) |
| 5 | `analog.md` | `ANALOG.md`; `interface-analysis/vref-a.md`, `codec-domain.md`, `crossings.md`; ledger R-15, R-57 | check `analog`: `421 Hz`, `806`, `PCM3060` |
| 6 | `bypass-relay.md` | `BYPASS-RELAY.md`; split spec §7.4, §7.5; power-fail R-PF items | check `bypass`: `unpowered`, `power-fail` |
| 7 | `processor-and-memory.md` and `firmware-facing-requirements.md` | `CORE-BRIEF.md` **as amended by split spec §9.4** (D4 and D13 withdrawn, D20–D24 in force, other core assumptions amended; use the current meaning and link `decisions.md`); `SDRAM-COMPATIBILITY.md`; split spec §6, §11, §12.4; original spec firmware sections; `facts.md` §4–§8 | check `firmware`: in `firmware-facing-requirements.md`, `H750`, `H743`, `QSPI`, `32 MB`, `bootloader`, `SAI2`, `watchdog`, `USB`, and the sentence that this repository does not own firmware |
| 8 | `mechanical-and-controls.md` | `interface-analysis/envelope.md`, `controls.md`; O-12, O-17, O-18; ledger R-55, R-56, R-60–R-62; `layout-B.svg` | check `mechanical`: `1590BB`, `stack height`, `layout-B.svg`, `six` |

`effective` is defined in Task 1 (see there for its scope and exemptions).

**Steps for each of Tasks 3–8:**

- [ ] **Step 1: Count the source's open passages.** Record the number of "Not verified", "Carries", "Carry" and "U"-status passages in this task's sources, by section, in the commit message draft. This is the target number of open-items rows for step 3.
- [ ] **Step 2: Add the task's check to `verify.sh` and run it.** Expected: FAIL.
- [ ] **Step 3: Write the document.** Write it in plain engineering terms with semantic roles, not schgen types. Apply the precedence rule; the shape for effective constraints is in Global Constraints. Every figure carries its inputs, method and source. Each open passage becomes a row in `open-items.md`, giving the phase that must close it: `phase 2`, `phase 3`, `phase 4` or `bring-up`. Each unsettleable disagreement becomes a `### Conflict:` entry. Link decisions by anchor into `decisions.md`.
- [ ] **Step 4: Run `verify.sh <check> effective provenance nocode`.** Expected: PASS. Then confirm that the rows added equal the count from step 1, or that each difference is explained in the commit message (for example, two passages merged because they state one item).
- [ ] **Step 5: Commit and push** with the message "h7-platform port: <document>". The body gives the open-passage count and the rows added.

Task 5 must add rows **VDDA-WIDEBAND** and **VBUS-HOTPLUG** (R-57). Task 3 must add **FB-AN2606** (R-57, the AN2606 freeze blocker). Task 1's check list gains `openitems`, added in Task 5: `open-items.md` contains all three ids, every table row has a non-empty phase cell, and the phrase `paper analysis` appears.
