### Task 2: Decisions

**Files:** Create `docs/h7-platform/decisions.md`. Modify `verify.sh` (add `decisions`).

**Interfaces:**
- Consumes: the label rules in Global Constraints.
- Produces: anchors `#o-1` … `#o-18`, and an anchor per ledger entry (`#r-34`). Later tasks link a decision as `decisions.md#o-17`.

**Sources** (all at the pin):
- split spec §2 and §2.1;
- the original platform spec's decision tables;
- `OWNER-DEFAULTS.md` (OWN-xx, D14–D19);
- `CORE-BRIEF.md` §4 (the D-deltas). It stops at **D19** at the pin.
- **Split spec §9.4**, which is the only home of the approved D20–D24 (O-14). It also withdraws D4 (MCU-driven codec reset) and D13 (PC3_C carrying SDCKE0) and amends the other core assumptions. Its planned append to `CORE-BRIEF.md` never happened, and this port does not do it either: the deltas are recorded here, citing §9.4.
- `docs/superpowers/plans/2026-10-05-h7-split-rulings.md`;
- `2026-10-03-h7-schgen-a1-rulings.md` and `-a2-rulings.md`, but only their owner-decision entries, and only where the decision is about the circuit rather than the generator.

- [ ] **Step 1: Add the `decisions` check.**
  - `decisions.md` has the sections `## Owner decisions`, `## Owner-supplied facts` and `## Controller rulings (the owner may override)`.
  - Each of `O-1` … `O-18` appears in a heading.
  - `R-34`, `R-43` and `R-56` appear under `## Owner decisions`.
  - `O-15` appears under `## Controller rulings`.
  - `D20` … `D24` each appear in a heading, citing split spec §9.4.
  - `D4` and `D13` each appear with the word `withdrawn`.
- [ ] **Step 2: Run `verify.sh decisions`.** Expected: FAIL.
- [ ] **Step 3: Write `decisions.md`.** For each entry, record:
  - the date;
  - the owner's words verbatim, where they exist;
  - what it decides, as currently in force, with amendments folded in by the precedence rule;
  - its pinned link;
  - what amended it.

  Generator-only decisions are not carried; the README (Task 12) maps them as stayed behind. An entry recorded as "confirmed" without a named confirmer goes under controller rulings, with that ambiguity stated.
- [ ] **Step 4: Run `verify.sh decisions provenance nocode`.** Expected: PASS.
- [ ] **Step 5: Commit and push.**

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

