# Digital Pedal Platform Phase 1 (Port) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the h7-platform design knowledge from `oletizi/pedals` into this repository as documentation and unchanged data, with no pedals code.

**Architecture:** Five files cross byte-identical (contract, results, two licences, the layout-B picture). Everything else is rewritten as Markdown under `docs/h7-platform/`, one document per topic. Each topic document resolves amendments by the spec's precedence rule and appends its unresolved items to one shared open-items table. A committed shell script checks the mechanical parts of "Done when" and is run by every task.

**Tech Stack:** Markdown, JSON (copied, never edited), one bash verification script, `git`, `shasum`.

**Spec:** `docs/superpowers/specs/2026-11-10-digital-pedal-platform-port-design.md` (approved 2026-11-10). Read it before any task. It is the authority wherever this plan is silent.

## Global Constraints

- **Source:** `oletizi/pedals` at `5b926d0aaf002d3ea111786f6ab9cdb72b8a913e`. Local checkout: `/Users/orion/work/pedals-work/digital-pedal-platform`. Read it with `git -C <checkout> show 5b926d0:<path>`, never from the working tree, so the pin is what you read.
- **Pinned link prefix**, used for every citation: `https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/`
- **Worktree:** `/Users/orion/work/audio-circuits-work/digital-pedal-platform`, branch `feature/digital-pedal-platform`. Commit and push after every task.
- **No code crosses.** Nothing under `docs/h7-platform/` or `circuits/h7-platform/` is anything but `.md`, `.json`, `.svg` or a `LICENSE-*` file. No pedals command (`pnpm schgen`, `pnpm pinmap`, `pnpm interface`, `make check` in `h7-platform/`) is written as something to run. No schgen IR vocabulary (`PartSpec`, `BlockSpec`, `sheetKit`, `blocksOn`) is used to describe parts.
- **The byte-identical files are never edited** in this phase.
- **Labels.** "Owner decision" is used only where the source itself says so (spec Goal 1). Everything else is "Controller ruling (the owner may override)". Owner measurements are "Owner-supplied fact".
- **Precedence** follows the spec section "How amendments resolve": authority first, then date. A controller ruling never supersedes an owner decision.
- **Effective-constraint shape:** the current value is stated once, followed by `Set by:` and `Amended by:` links. A superseded value appears only on a line that begins `*Not in force:*`.
- **Conflict shape:** a `### Conflict:` heading in `docs/h7-platform/open-items.md` names both sources and does not pick one.
- **Figures from analyses** carry their inputs, their method in words and a pinned source, and are labelled as paper analysis of an unbuilt board.
- **`docs/known-gaps.md` is not touched** unless the owner makes a new decision during this phase.
- **Each document opens with a `Ported from:` list** of pinned links to every pedals file it draws on.
- **Process rules for every agent:**
  - no memory files;
  - no Claude/AI attribution in commits or PRs;
  - no `#` inside Bash heredocs or multi-line quoted arguments (use the Write tool and `git commit -F`);
  - no `sed -i` (use Edit/Write);
  - write every document to disk with the Write tool;
  - never type a control-character escape into a tool parameter.
- **Unreachable source:** R-58 and other Task 17 entries cite `task-17-rulings.md` and `task-17-research-A.md`, which were never committed to pedals. Cite the ledger entry that names them, and say the underlying file is not in the pedals history.

## Review Focus

- **A controller ruling recorded as an owner decision, or the reverse.** Examples: O-15 (a controller ruling despite its number), R-55/R-60/R-61/R-62, and "confirmed" entries with no named confirmer. Task 2's check pins the three ledger owner decisions. The reviewer of every topic task checks every label against the source wording.
- **A superseded value restated as current**, such as 9–12 V Seed benches, the 179 Hz noise band, or a diode reset in place of Q_PEN. The `effective` check pins the first two textually. The Task 4 reviewer checks the reset topology by reading.
- **An open item closed by paraphrase.** A "Not verified" or "Carries" passage gets rewritten as a plain statement and silently loses its open status. The `openitems` check pins the three named items. Each topic task's step 1 counts the source's open passages and its last step matches that count against the rows it added.
- **A pedals-relative citation that resolves to nothing.** The `provenance` check requires the pinned prefix in every document. Task 12's traces pin the JSON aliases.
- **Licence wording that reads as settled.** The `readme` check requires the word "unresolved" beside OSCAR_AUDIO_01.

---

## File Structure

| Path | Responsibility | Task |
|---|---|---|
| `circuits/h7-platform/module-interface.json` | Draft 40-pin contract, byte-identical | 1 |
| `circuits/h7-platform/interface-analysis-results.json` | 76 analysis values, byte-identical | 1 |
| `circuits/h7-platform/LICENSE-OSCAR`, `LICENSE-APACHE-2.0` | Attribution, byte-identical | 1 |
| `docs/h7-platform/layout-B.svg` | The control layout the owner chose, as a record | 1 |
| `docs/h7-platform/open-items.md` | Carry-forward table and conflict entries; every topic task appends | 1 (skeleton), 3-10 |
| `docs/h7-platform/decisions.md` | Owner decisions, owner-supplied facts, controller rulings | 2 |
| `docs/h7-platform/architecture.md` | The split: boards, interface rules, bring-up carrier, Seed facts | 3 |
| `docs/h7-platform/power.md` | Power entry, rails, VIN_MOD, 3V3_D, pedal digital rail, power-fail | 4 |
| `docs/h7-platform/analog.md` | Analog stages, VREF_A, codec domain, domain crossings | 5 |
| `docs/h7-platform/bypass-relay.md` | Relay bypass and its sequencing | 6 |
| `docs/h7-platform/processor-and-memory.md` | MCU, SDRAM, QSPI, clocks, reset (module side) | 7 |
| `docs/h7-platform/firmware-facing-requirements.md` | Hardware constraints firmware imposes or depends on | 7 |
| `docs/h7-platform/mechanical-and-controls.md` | Enclosure, envelope, stack height, six control positions, footswitch | 8 |
| `docs/h7-platform/parts.md` | Chosen parts: role, MPN, LCSC, source, decision link | 9 |
| `docs/h7-platform/layout-carry-forward.md` | What layout must honour, restated per split board | 10 |
| `docs/h7-platform/schematic-checklist.md` | Circuit-level checklist items (not generator items) | 10 |
| `docs/h7-platform/bring-up.md` | BU-01 to BU-29 and BL items, by original id | 10 |
| `docs/h7-platform/research/*.md`, `docs/standards/pcbway-fab-rules.md` | Research and fab rules | 11 |
| `docs/h7-platform/README.md` | What it is, the source-file map, the provenance index, licences | 12 |
| `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh` | Mechanical Done-when checks | 1, extended by each task |
| `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/README.md` | Execution record (not findings) | 13 |

## The verification script

`verify.sh` takes check names as arguments (`verify.sh bytes nocode`) and runs all checks when given none. It prints `PASS <check>` or `FAIL <check>: <reason>` for each one and exits non-zero if any check fails. It requires `PEDALS_REPO` to be set, refusing with a message naming the variable and its expected value if it is not. The script lives under `docs/superpowers/plans/`, which is outside the two paths the no-code rule covers.

---

### Task 1: Byte-identical data, licences, record picture, open-items skeleton, verify script

**Files:**
- Create: the four files under `circuits/h7-platform/`, `docs/h7-platform/layout-B.svg`, `docs/h7-platform/open-items.md`, `.../port-execution/verify.sh`

**Interfaces:**
- Produces: `verify.sh` with the checks `bytes`, `nocode` and `provenance`; the `open-items.md` table with the columns `Id | Item | Board / domain | Status | Evidence that closes it | Phase that must close it | Source`; the `### Conflict:` section heading `## Conflicts`.

- [ ] **Step 1: Write `verify.sh` with three checks.**
  - **`bytes`:** for each pair below, `git -C "$PEDALS_REPO" show 5b926d0:<src> | shasum -a 256` must equal `shasum -a 256 < <dst>`.
    - `h7-platform/module-interface.json` → `circuits/h7-platform/module-interface.json`
    - `h7-platform/interface-analysis/results.json` → `circuits/h7-platform/interface-analysis-results.json`
    - `h7-platform/LICENSE-OSCAR` → `circuits/h7-platform/LICENSE-OSCAR`
    - `h7-platform/LICENSE-APACHE-2.0` → `circuits/h7-platform/LICENSE-APACHE-2.0`
    - `h7-platform/interface-analysis/layouts/layout-B.svg` → `docs/h7-platform/layout-B.svg`
  - **`nocode`:** fails on any file under `docs/h7-platform` or `circuits/h7-platform` that is not `*.md`, `*.json`, `*.svg` or `LICENSE-*`. Also fails on any match of `pnpm |PartSpec|BlockSpec|sheetKit|blocksOn` there.
  - **`provenance`:** fails on any `*.md` under `docs/h7-platform/` that lacks the pinned link prefix.
- [ ] **Step 2: Run `PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash .../verify.sh bytes`.** Expected: `FAIL bytes` (the files are missing). Then run it with `PEDALS_REPO` unset. Expected: a refusal naming `PEDALS_REPO`.
- [ ] **Step 3: Copy the five files.** Use `git -C "$PEDALS_REPO" show 5b926d0:<src> > <dst>`, so nothing passes through an editor. Write `open-items.md`:
  - a `Ported from:` line;
  - one paragraph stating that every figure is paper analysis of an unbuilt board and that no row is a closure;
  - the empty table;
  - an empty `## Conflicts` section.
- [ ] **Step 4: Run `verify.sh bytes nocode provenance`.** Expected: three PASS lines.
- [ ] **Step 5: Commit and push** with the message "h7-platform port: byte-identical contract, results, licences and layout-B record; verify script".

### Task 2: Decisions

**Files:** Create `docs/h7-platform/decisions.md`. Modify `verify.sh` (add `decisions`).

**Interfaces:**
- Consumes: the label rules in Global Constraints.
- Produces: anchors `#o-1` … `#o-18`, and an anchor per ledger entry (`#r-34`). Later tasks link a decision as `decisions.md#o-17`.

**Sources** (all at the pin):
- split spec §2 and §2.1;
- the original platform spec's decision tables;
- `OWNER-DEFAULTS.md` (OWN-xx, D14–D19);
- `CORE-BRIEF.md` §4 (the D-deltas, including the approved D20–D24 that the split spec says the plan appends);
- `docs/superpowers/plans/2026-10-05-h7-split-rulings.md`;
- `2026-10-03-h7-schgen-a1-rulings.md` and `-a2-rulings.md`, but only their owner-decision entries, and only where the decision is about the circuit rather than the generator.

- [ ] **Step 1: Add the `decisions` check.**
  - `decisions.md` has the sections `## Owner decisions`, `## Owner-supplied facts` and `## Controller rulings (the owner may override)`.
  - Each of `O-1` … `O-18` appears in a heading.
  - `R-34`, `R-43` and `R-56` appear under `## Owner decisions`.
  - `O-15` appears under `## Controller rulings`.
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
| 7 | `processor-and-memory.md` and `firmware-facing-requirements.md` | `CORE-BRIEF.md`; `SDRAM-COMPATIBILITY.md`; split spec §6, §11, §12.4; original spec firmware sections; `facts.md` §4–§8 | check `firmware`: in `firmware-facing-requirements.md`, `H750`, `H743`, `QSPI`, `32 MB`, `bootloader`, `SAI2`, `watchdog`, `USB`, and the sentence that this repository does not own firmware |
| 8 | `mechanical-and-controls.md` | `interface-analysis/envelope.md`, `controls.md`; O-12, O-17, O-18; ledger R-55, R-56, R-60–R-62; `layout-B.svg` | check `mechanical`: `1590BB`, `stack height`, `layout-B.svg`, `six` |

**Global check `effective`, added in Task 4:** every line under `docs/h7-platform/` that matches `9[–-]12 V` or `179 Hz` must begin with `*Not in force:*`.

**Steps for each of Tasks 3–8:**

- [ ] **Step 1: Count the source's open passages.** Record the number of "Not verified", "Carries", "Carry" and "U"-status passages in this task's sources, by section, in the commit message draft. This is the target number of open-items rows for step 3.
- [ ] **Step 2: Add the task's check to `verify.sh` and run it.** Expected: FAIL.
- [ ] **Step 3: Write the document.** Write it in plain engineering terms with semantic roles, not schgen types. Apply the precedence rule; the shape for effective constraints is in Global Constraints. Every figure carries its inputs, method and source. Each open passage becomes a row in `open-items.md`, giving the phase that must close it: `phase 2`, `phase 3`, `phase 4` or `bring-up`. Each unsettleable disagreement becomes a `### Conflict:` entry. Link decisions by anchor into `decisions.md`.
- [ ] **Step 4: Run `verify.sh <check> effective provenance nocode`.** Expected: PASS. Then confirm that the rows added equal the count from step 1, or that each difference is explained in the commit message (for example, two passages merged because they state one item).
- [ ] **Step 5: Commit and push** with the message "h7-platform port: <document>". The body gives the open-passage count and the rows added.

Task 5 must add rows **VDDA-WIDEBAND** and **VBUS-HOTPLUG** (R-57). Task 3 must add **FB-AN2606** (R-57, the AN2606 freeze blocker). Task 1's check list gains `openitems`, added in Task 5: `open-items.md` contains all three ids, every table row has a non-empty phase cell, and the phrase `paper analysis` appears.

### Task 9: Parts

**Files:** Create `docs/h7-platform/parts.md`. Modify `verify.sh` (add `parts`).

**Interfaces:**
- Consumes: Tasks 2–8 documents. Every part listed there with a chosen MPN must appear here.

- [ ] **Step 1: Add the `parts` check.** It fails if `parts.md` lacks a table with the columns `Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source`, or if any row has an empty `Chosen by` or `Source` cell. Whether every part in Tasks 2–8 is listed is checked by reading in Step 4, not by pattern matching MPNs.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Write `parts.md` from `OWNER-DEFAULTS.md`, `CORE-BRIEF.md`, the ledger and the Task 2–8 documents.**
  - "Chosen by" is either a decision anchor or "controller ruling".
  - Stock and price are not carried. They were dated observations, and the BOM binds only in phase 4.
  - Footprint names are not carried as facts. Each is marked "re-verify against installed KiCad libraries".
- [ ] **Step 4: Run `verify.sh parts provenance nocode`.** Expected: PASS. Then walk Tasks 2–8's documents for every MPN they name, and confirm each one is in the table.
- [ ] **Step 5: Commit and push.**

### Task 10: Layout carry-forward, schematic checklist, bring-up

**Files:** Create `layout-carry-forward.md`, `schematic-checklist.md` and `bring-up.md` under `docs/h7-platform/`. Modify `verify.sh` (add `bringup`).

**Sources:** `LAYOUT-CARRYFORWARD.md`; `SCHEMATIC-CHECKLIST.md`; split spec §9, §12, §12.4; BL-1 to BL-4 in the split spec; `DESIGN-REVIEW.md` (its Layout and Enclosure section headings only, as a pointer: the checklist is third-party material, so link it rather than copy it).

- [ ] **Step 1: Add the `bringup` check.** It fails unless every id `BU-01` … `BU-29` and `BL-1` … `BL-4` appears in `bring-up.md`, and each BU line carries one of `original requirement`, `deferred measurement` or `passed paper analysis`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Write the three documents.**
  - The layout carry-forward is restated per board (h7-module, h7-pedal, carrier) against the split. A pre-split item whose board is not obvious becomes a conflict entry.
  - The schematic checklist keeps the circuit items and their original ids, and drops the items that test the old generator or its gates. The README (Task 12) maps the dropped ids.
  - Open items found here go to `open-items.md`, following the counting steps of Tasks 3–8.
- [ ] **Step 4: Run `verify.sh bringup effective provenance nocode`.** Expected: PASS.
- [ ] **Step 5: Commit and push.**

### Task 11: Research documents and PCBWay fabrication rules

**Files:** Create `docs/h7-platform/research/proven-reference-designs.md`, `docs/h7-platform/research/processor-module-form-factors.md` and `docs/standards/pcbway-fab-rules.md`.

- [ ] **Step 1: Add the `standards` check.** It fails unless all three files exist and each carries the pinned prefix.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Port the three documents.**
  - Keep the content.
  - Add a `Ported from:` line.
  - Re-point internal pedals links to pinned links.
  - Each research document gets a dated-research banner saying it is background and does not bind.
  - The fab rules keep any dated figure with its date, and a note that PCBWay's current published capabilities are the authority at phase 4.
- [ ] **Step 4: Run `verify.sh standards nocode`.** Expected: PASS.
- [ ] **Step 5: Commit and push.**

### Task 12: README: source map, provenance index, licences

**Files:** Create `docs/h7-platform/README.md`. Modify `verify.sh` (add `readme`).

- [ ] **Step 1: Add the `readme` check.** It holds the list of platform source paths from spec Goal 4:
  - every path from `git -C "$PEDALS_REPO" ls-tree -r --name-only 5b926d0 h7-platform`, collapsed to the directory for `boards/v1/`, `circuit/`, `mechanical/`, `vendor/`, `symbols/`, `footprints/`, `pintables/`, `generated/` and `interface-analysis/sources/`;
  - the two platform specs, the two research documents, the fab rules, and the three rulings ledgers.

  The check fails unless each listed path appears in `README.md`, a `## Provenance index` section exists with three `Trace:` entries, and `unresolved` appears on a line mentioning `OSCAR_AUDIO_01`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Write `README.md`.**
  - What the platform is: two short paragraphs, linking `architecture.md`.
  - The document list.
  - The source map: each source path leads to its new home, or to "stayed behind" with a one-clause reason taken from the spec's non-goals.
  - The provenance index:
    - aliases (`spec` meaning the split spec, unless a citation names the 2026-09-30 spec; `PW` = `POWER.md`; `AN` = `ANALOG.md`; `CB` = `CORE-BRIEF.md`; and every other alias found in the two JSON files, which you find by reading their `source` strings);
    - id prefixes (`O-`, `RR-`, `R-`, `D-A-` … `D-D-`, `OWN-`, `D<n>`, `BU-`, `BL-`, `R-PF-`);
    - relative roots (`vendor/st-pin-data/`, `interface-analysis/`, `sources/`), each mapped to a pinned path.

    It states that these strings are historical provenance, not local paths.
  - Three traces, each resolved hop by hop to a pinned line:
    - a VREF_A rail limit in `module-interface.json`;
    - an R-57 amendment;
    - an `mcu.*.pinData` path.
  - Licences: which circuitry each file covers, and that OSCAR_AUDIO_01's licence statement is unresolved upstream.
- [ ] **Step 4: Run `verify.sh`** (all checks). Expected: every line PASS.
- [ ] **Step 5: Commit and push.**

### Task 13: Final verification and execution record

**Files:** Create `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/README.md`.

- [ ] **Step 1: Run `verify.sh`.** Expected: every line PASS.
- [ ] **Step 2: Run `bun run typecheck` and `make check`.** Expected: both exit 0, unchanged by this phase. If either fails, check whether it also fails on `main` at `05f4a2a`, and report which.
- [ ] **Step 3: Walk the spec's "Done when" by reading.** Cover the items `verify.sh` cannot check:
  - the effective-constraint wording for the 9 V, 421 Hz and Q_PEN items;
  - that no figure lacks a basis;
  - that no open item reads as closed.

  Record each item's result in the execution README.
- [ ] **Step 4: Write the execution README.** It says plainly that it is an execution record and not findings. It holds:
  - the per-task open-passage counts and the rows added;
  - the conflicts raised;
  - anything that could not be ported, with the reason;
  - the final `verify.sh` output.
- [ ] **Step 5: Commit and push.** Then request the whole-branch review.
