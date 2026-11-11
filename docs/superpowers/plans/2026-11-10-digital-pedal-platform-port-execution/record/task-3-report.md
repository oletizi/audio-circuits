Task 3 report: docs/h7-platform/architecture.md

Status: DONE_WITH_CONCERNS
Commit: 908d872 "h7-platform port: architecture.md" (on f88ff1f), pushed to origin/feature/digital-pedal-platform.

## What was written

- docs/h7-platform/architecture.md (new, about 445 lines). Sections: 1 what the platform is (original spec, with the production input written "9 V to 12 V" and the old 6 pots / 3 toggles on a Not-in-force line); 2 the three boards (h7-module, h7-pedal, bring-up carrier) and a table of what changed from the one-board design (left column labelled "What v1 contained (record only)", with a sentence saying v1 is not an authority); 3 block diagram (split spec §4, plain text); 4 the interface: 4.1 project-owned contract + Seed exceptions S-1 to S-12 (S-11/S-12 from the contract), 4.2 physical (J_MOD_A, J_MOD_B, numbering, mounting, envelope, no module hot-plug), 4.3 the 40-pin table transcribed from MODULE-INTERFACE.md plus pin-assignment history as an effective constraint, 4.4 pin budget (31 / 25 / demand 18 / 5 spares), 4.5 reasons for pin choices, 4.6 audio port (SAI2), 4.7 rails across the interface (VIN_MOD, 3V3_D, VREF_A, GND; limits and permitted load roles only, values pointed to power.md / analog.md), 4.8 domains and IF-PD-1 with the DS12110/SLAS533B limits and the crossing table (Ioff buffers, 47 kOhm bias, 470 Ohm, VBUS divider, USB switch), 4.9 gate pull-downs and the R-2a tolerance, 4.10 the contract as data (letter-case rule explicitly not carried), 4.11 the interface rules (13 numbered rules); 5 h7-module; 6 h7-pedal; 7 bring-up carrier (§13.1); 8 Seed facts (§16 + facts.md §1-§3, §8); 9 order of work mapped to this repo's phases; 10 licences of derived circuitry (L1, "unresolved upstream"); 11 risks table (§14) with status and open-item id per risk; 12 the Seed bench supply as an effective constraint (9 V; Set by O-15; Amended by R-50, R-58, R-59; Not-in-force line for 9-12 V).
- docs/h7-platform/open-items.md: 27 rows appended to the table (contiguous), one `### Conflict:` entry, and three bullets appended to its "Ported from:" list (original spec; CORE-BRIEF.md and LICENSE-OSCAR; facts.md and crossings.md), because the rows cite them. Nothing existing was changed.
- verify.sh: check_architecture (file must exist; must contain h7-module, h7-pedal, bring-up carrier, J_MOD_A, J_MOD_B, SAI2, VREF_A, reservedCompatibility, IF-PD-1), dispatcher entry, ALL_CHECKS entry.

## RED and GREEN

RED (before the document existed):
```
FAIL architecture: [missing docs/h7-platform/architecture.md]
PASS effective
PASS provenance
PASS nocode
exit=1
```
GREEN (after):
```
PASS architecture
PASS effective
PASS provenance
PASS nocode
PASS decisions
PASS bytes
exit=0
```
Every decisions.md anchor linked from architecture.md was checked to exist as a `### <ID>` heading (script loop, no misses).

## Open-passage count per section vs rows added (27 rows)

Counting basis: the grep for "Carries/carry" is dominated by the ordinary verb ("the module carries no codec"), so I counted real open passages by reading: U markers, "unverified/not verified", "not stated", carries sections, and every §14 and §16 item (per the dispatch).

| Source section | Open passages | Rows | Difference explained |
|---|---|---|---|
| split §1, §3, §4, §6, §7, §8 | 0 | 0 | — |
| split §5 | 8 U passages | 1 | 7 restate §16 items 7, 8, 11 (S-2, S-5, S-6, §5.1.1 onboard loads, §5.3 pin-38 current, §5.4 bootloader states, §5.6.2 Seed range) and are merged into the R-2a..R-2c rows; the 8th (§5.6.3, pin-21 regulator stability on Rev7/Seed3) is SEED-PIN21-CAPACITANCE |
| split §13.1 | 1 (stack-height carry-forward) | 0 | merged into STACK-HEIGHT-CONFIRM with R-10 (same evidence) |
| split §14 | 19 risks | 15 | R-1 and R-9 closed (below); R-13 merged into POWER-FAIL-REPLACEMENT-MEASURE (R-3), R-15 into SAI-ACROSS-HEADER (R-6): one measurement settles each pair |
| split §16 | 3 U items + 6 "other facts" | 3 | U items 7, 8, 11 = R-2a..R-2c (rows counted under §14). Other facts: Ioff spec and delay closed; Daisy bootloader limits closed; AN2606 pin list = FB-AN2606 (counted under facts). Rows: PCM3060-POR-XO-START, SAI-KERNEL-CLOCK-SLAVE, FLASH-SIZE-REGISTER |
| original spec | 1 ("unverified" MCU longevity) + open item 3 | 1 | MCU-LONGEVITY; open item 3 (THD+N at 9 V) merged into ANALOG-HEADROOM-9V (R-4). Open items 1, 2, 4 are settled (contract; SDRAM doc, Task 7; CORE-BRIEF HSE/AN2606 verdict) |
| MODULE-INTERFACE.md | 0 new | 0 | its "Seed risks" column is R-2a..R-2c |
| facts.md §1-§3 | 2 | 2 | DATASHEET-REVISIONS-RECHECK (DS12556/AN2606/RM0433 "later revision not ruled out"), FB-AN2606. §1's unstated per-pin source figure and §3's unstated SPI MISO state were resolved by stated conservative bounds in the source, not left open |
| crossings.md interface part (§2, §4-§8) | 11 carries in §8 + 1 bring-up check in §7.4 | 4 | Closed: Task 12 carry (marked done in §8 itself, 3v3-d.md), Task 14 (codec-domain.md line 180 carries 0.94 mA), Task 15 (crossings §6.2 R-37 note, 3.9 kOhm unchanged). VBUS-HOTPLUG left to Task 5 (the plan assigns it there). USBLC6-2 re-check merged into DATASHEET-REVISIONS-RECHECK; FB-AN2606 counted under facts; gate-9 protection-path carry merged into CONTRACT-MODEL-CHECK. Rows: SAI-LAYOUT-RULES, INTERFACE-PARTS-TO-MODEL (Task 24 parts + gate pull-downs + USB switch fit), FIRMWARE-INTERFACE-OBLIGATIONS, USB-SWITCH-FS-IMPEDANCE |
| controller assignment (L1) | 1 | 1 | OSCAR-AUDIO-LICENCE-L1 |

Total rows: 1 + 15 + 3 + 1 + 2 + 4 + 1 = 27.

### Items closed by a later dated source (cited)
- §14 R-1 (no free interface pins): premise superseded by O-18 (owner, recorded after the spec's approval; split §5.2 "After O-18" frees all six toggle pins) and R-8; R-14 took pin 11 back, leaving five digital-only spares (contract pins 1, 2, 3, 7, 10). Residual constraint (every ADC pin used) is stated in architecture.md §4.4, not a row.
- §14 R-9 (Seed supply single source): closed for development by O-16 (owner): the owner has original Seeds and development starts on one; production does not depend on a Seed.
- §16 other fact "SAI isolation part Ioff specification and delay": closed by crossings.md §1-§2 (S1 Task 10, 2026-10-05/06; SN74LVC3G34 and SN74LVC1G34 Ioff +-10 uA; delays in the timing table).
- §16 other fact "Daisy bootloader limits on code size and memory": closed by facts.md §7 (LD-BOOT at libDaisy 08087203: 128 KB internal flash holds the bootloader; application <= 7936 KB QSPI at 0x90040000 or <= 480 kB SRAM).
- crossings §8 Task 12, Task 14, Task 15 carries: as in the table.

## Conflicts raised

- `### Conflict: the Rev4 Daisy Seed's codec and how a Rev4 is detected` — DS120 p. 13 (AK4556; "Rev4/Rev7 ... detects hardware as Rev 4") vs libDaisy (AK4430; PD5 = Rev7, none-low = Rev4), from facts.md §8. Affects only Rev4 identification at bring-up; changes nothing built. Task 7 also has facts.md §8 and may raise the same; it should link this one rather than add a second.
- Not raised: split §9.1 vs CORE-BRIEF.md:32 on L1. §9.1 lists "OSCAR licence item L1 | Unchanged", which reads as "the split leaves it as CORE-BRIEF records it" (open), not a contradiction. The L1 row says so.

## Labels applied (and source wording)

- O-1 to O-14, O-16 to O-18: "owner" (split §2 "Owner decisions this spec implements").
- O-15: controller ruling ("controller ruling on best practice; the owner may override", split §2; decisions.md places it under rulings).
- RR-1 to RR-11: controller rulings ("Review-response rulings (controller ...)", split §2.1).
- D20 to D24: owner-approved ("Approved by the owner, 2026-10-05", split §9.4); D2, D4, D5, D9, D13 linked as decisions.md carries them (controller rulings there); D14, D18, D19 owner (decisions.md).
- All R-n linked (R-5, R-8 to R-11, R-13, R-14, R-17 to R-19, R-21 to R-23, R-25, R-29, R-37, R-50, R-54, R-57 to R-62): controller rulings (ledger, none titled "Owner decision"). R-34 cited in a row as the owner's basis (owner decision per ledger).
- No label was restated differently from decisions.md.

## Anchors other tasks may need

- architecture.md section anchors: `#4-the-interface`, `#48-power-domains-and-if-pd-1` (IF-PD-1 and the crossing table), `#411-the-interface-rules`, `#7-the-bring-up-carrier`, `#8-what-is-known-about-the-daisy-seed`, `#11-risks`, `#12-development-bench-supply-with-a-seed-fitted` (the 9 V Seed bench as an effective constraint).
- No decisions.md bare consequence figure (R-58 137.7 C, R-59 13.56 V, R-15 1,123 uV, R-50 95 C/W) is derived here; those remain for Tasks 4/5.
- Open-items ids other tasks should reuse rather than duplicate: VREF-A-BACKFEED-GATE (Task 5 also has vref-a.md's bring-up gate), POWER-FAIL-REPLACEMENT-MEASURE and ANALOG-HEADROOM-9V (Task 6 / Task 4 power-fail items), STACK-HEIGHT-CONFIRM (Task 8), SAI-KERNEL-CLOCK-SLAVE, FLASH-SIZE-REGISTER, PCM3060-POR-XO-START, FIRMWARE-INTERFACE-OBLIGATIONS (Task 7, which has facts.md §4-§8), SAI-ACROSS-HEADER (Task 5, crossings §1), CONTRACT-FREEZE (any task with a freeze check should name it there).

## Concerns

1. Overlap with later topic tasks. §5.6, §7.4, §7.5 and §16's "other facts" sit in my source list and in Tasks 4-7's. I kept rail values and the power-fail realisation out of architecture.md (pointing to power.md, analog.md, bypass-relay.md) but added rows where §14/§16 required it. Later tasks risk duplicate rows for the same item; the ids above are offered for reuse.
2. Left to others, by name: VBUS-HOTPLUG (Task 5 per plan). Seed exception S-9 (Seed inrush/start-up current unpublished) is the measurement R-50 waits for; it is not a row here because R-50 is in Task 4's sources. If Task 4 does not add it, it is uncovered.
3. open-items.md header says the evidence is in "its fourth column"; it is the fifth (Id, Item, Board, Status, Evidence). Task 1's text, not edited.
4. I appended three bullets to open-items.md's "Ported from:" list (additive only), since the new rows cite those files.
5. The L1 row's closing evidence is a later edit to circuits/h7-platform/LICENSE-OSCAR, a byte-identical record; I wrote it as "in a commit of its own", per the port spec's Done-when.
6. The source says the contract's net names are UPPER_SNAKE (a pedals generator rule). Per CLAUDE.md (G150, owner: letter case does not matter) architecture.md §4.10 says the rule is not carried.
7. decisions.md deferred minor already in the ledger (F-4 label) is untouched; architecture.md cites O-16 for "the owner has original Seeds", not F-4.

## Fix round 1 (commit 9c66b7b)

Changes:
1. R-9: the risks-table cell now reads "Mitigated: development starts on an original Seed the owner holds (F-4, the split spec's sentence; O-16); the OWN-07 procurement watch, extended to the Seed3 stand-ins, is in force", and points to the new row SEED-SUPPLY (phase 4; cites R-9, O-16, F-4, split section 9.2, OWN-07). R-9 is no longer listed as closed.
2. S-9 and S-10: new rows SEED-VIN-SWITCH-ON (S-9 plus R-50's "until bring-up measures a Seed's VIN current and capacitance"; bring-up) and SEED-PIN21-NOISE (S-10's noise half; bring-up). Section 12 of architecture.md now names SEED-VIN-SWITCH-ON; the S-9 and S-10 rows of the exceptions table name their open items.
3. The unsourced "A spare can take a digital input or an interrupt" is replaced with the split spec's own words (5.4: polled devices, an interrupt comes from an expander or a control pin; 5.2: what a spare becomes is a contract change; 14 R-1: high-bandwidth or interrupt-driven signals need a different module footprint, the Seed2 DFM has two more ADC pins) and the caveats on SPARE2-4 (SDMMC1) and SPARE5 (NJTRST). R-1's residual is also in the risks cell.
4. SEED-REVISION-RECORD now says "A Rev4 (codec AK4556 per DS120, AK4430 per libDaisy; see the conflict entry below)".
Optional items done: gate criterion restated per R-57 / crossings 6.1 (87.4 kOhm relay, 60.8 kOhm LEDs); DS12110 Rev 11 named in DATASHEET-REVISIONS-RECHECK (evidence includes comparing Rev 11 with Rev 10); new row CARRIER-LOOPBACK-FORM (phase 2), referenced from architecture.md section 7; 3.03 mA cites 3v3-d.md section 2; BYPASS-RELAY.md section 3.3 pin-linked; Ported from extended (architecture.md: BYPASS-RELAY.md, 3v3-d.md; open-items.md: power-fail.md, OWNER-DEFAULTS.md).

Corrected count: 31 rows added by Task 3 (27 + SEED-SUPPLY, SEED-VIN-SWITCH-ON, SEED-PIN21-NOISE, CARRIER-LOOPBACK-FORM). Split spec section 14: 16 rows (R-1 is the only risk closed; R-13 and R-15 merged). Section 5: 3 rows (pin-21 capacitance, S-9, S-10 noise). Section 13.1: 1 row (loopback form) besides the stack-height carry merged into STACK-HEIGHT-CONFIRM. The closures list in the original report no longer includes R-9.

Command: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh architecture effective provenance nocode decisions bytes
Output:
PASS architecture
PASS effective
PASS provenance
PASS nocode
PASS decisions
PASS bytes
exit=0
The table is still contiguous (31 id rows, ending before the blank line at 46).
