Task 4 report: docs/h7-platform/power.md

Status: DONE_WITH_CONCERNS
Commit: 903fcf6 "h7-platform port: power.md" (on 9c66b7b), pushed to origin/feature/digital-pedal-platform.

## What was written

- docs/h7-platform/power.md (new, 549 lines). Sections: how the pre-split note is carried (a pre-split → split name map applying split spec §9, and two Not-in-force lines for the v1 BUCK_EN shed and the 5V_A EN divider; the v1 designator map deliberately not carried); 1 power tree after the split; 2 effective constraints EC-SEED-BENCH and EC-QPEN-RESET; 3 pedal power entry (R-PF-7 / VIN_A, reservoir, supervisor with FIG-TRIP, timing and margins, Q_MSW load switch with FIG-EN-DELAY, supply rating R-43, switch-on Tj method with FIG-QMSW-TJ and FIG-POUR, survival table); 4 VIN_MOD (contract values, FIG-MINV, EN/UVLO divider, input network, dip, ripple, hot plug with the owner's no-TVS decision, FIG-HOTPLUG, FIG-SEED-HOTPLUG, gate hold and re-plug, Seed with FIG-SEED-TJ); 5 module 3V3 and pin 38 (892 mA budget, module buck, reset/decoupling, PW-TJ thermal, pin-38 allocation, I²C, footswitch, buttons, R-24 values); 6 3V3_P; 7 5V_A and the analog branch (split LDO table; v1 table Not in force); 8 18 V survival by board; 9 sequencing; 10 ground and return paths (decision carried; zones marked pre-split and restated per board; chassis bond); 11 what did not cross; 12 open-item ids.
- docs/h7-platform/open-items.md: 26 rows appended (table contiguous, 57 rows now, every row 7 cells), one bullet appended to "Ported from:" (POWER.md, vin-mod.md, 3v3-d.md, pedal-digital-rail.md). No conflict entries.
- verify.sh: check_power (file must exist; must contain `Q_PEN`; must have one line containing both `9 V` and `Seed`), its dispatcher entry and its ALL_CHECKS entry.

## RED and GREEN

RED (before power.md existed):
```
FAIL power: [missing docs/h7-platform/power.md]
PASS effective
PASS provenance
PASS nocode
exit=1
```
GREEN:
```
PASS power
PASS effective
PASS provenance
PASS nocode
PASS decisions
PASS bytes
PASS architecture
exit=0
```
Also checked by script: every decisions.md anchor linked from power.md exists as a `### <ID>` heading; every in-page anchor resolves; no table column mismatch in power.md; every open-items row has 7 cells (escaped `\|` excluded); no duplicate ids; zero control-byte lines in the three changed files; `D_PEN`, "diode reset", "32.7 ms" and 9–12 appear in power.md only on `*Not in force:*` lines.

## Open-passage count per section vs rows added

Counted by reading (the verb "carries" dominates a grep). 84 open passages; 26 new rows + 2 reused rows.

| Source section | Open | Closed by own text | Rows |
|---|---|---|---|
| POWER.md §8 Not verified | 10 (items 1–7, 9–11) | item 8 (resolved by Task 11) | 1,6 → MODULE-3V3-BUDGET; 2 → MLCC-DC-BIAS; 3 → TPS62933F-EFFICIENCY + LDO-PSRR-SPUR (split: two kinds of evidence); 4 → PMEG4030ER-TYPICALS; 5 → HOT-PLUG-PEAK; 7 → SCHOTTKY-ALTERNATE-UNQUALIFIED; 9 → MCU-TJ-MEASURE; 10 → 3V3D-RAIL-MEASURE; 11 → MODULE-POWER-PARTS-TO-MODEL (R_DAMP) + PEDAL-POWER-PARTS-TO-MODEL (VMID resistors, LED MOSFETs; the VBUS divider is Task 3's INTERFACE-PARTS-TO-MODEL) |
| vin-mod.md §9 | 6 | | 1, 6 → QMSW-GATE-HOLD-REPLUG; 2 → HOT-PLUG-PEAK; 3, 5 → QMSW-SWITCH-ON-CHECK; 4 → SEED-VIN-SWITCH-ON (reused) |
| vin-mod.md §10 | 15 | | S2 module (4): R_UV, input network, VIN_MOD cap → MODULE-POWER-PARTS-TO-MODEL; ≤ 150 µF → MODULE-BUCK-LOOP-STARTUP. S2 carrier (3): parts → PEDAL-POWER-PARTS-TO-MODEL; pour → QMSW-POUR-LAYOUT. Pin-39 26.3 V → MODULE-POWER-PARTS-TO-MODEL. Bring-up (7): hot plug → HOT-PLUG-PEAK; re-plug, bounce → QMSW-GATE-HOLD-REPLUG; switch-on, start threshold → QMSW-SWITCH-ON-CHECK; Seed → SEED-VIN-SWITCH-ON; ripple → VIN-MOD-RIPPLE-MEASURE |
| 3v3-d.md "Not stated anywhere read" | 4 | | trace and header capacitance → I2C-RISE-AND-DEBOUNCE; 22 µF ESR → 3V3D-RAIL-MEASURE; TPS62933F maximum COUT → MODULE-BUCK-LOOP-STARTUP |
| 3v3-d.md §6 Carries | 12 | Task 13 carry (its own "Superseded" annotation) | S2 pedal (4) → PEDAL-POWER-PARTS-TO-MODEL; freeze → MIDI-IN-RECEIVER-STOCK; loop/start-up → MODULE-BUCK-LOOP-STARTUP; FB_VDDA → 3V3D-RIPPLE-INTO-VREF-A; firmware → FIRMWARE-POWER-OBLIGATIONS; bring-up: ripple → 3V3D-RAIL-MEASURE, I²C rise and bounce → I2C-RISE-AND-DEBOUNCE, pin-21 noise → 3V3D-RIPPLE-INTO-VREF-A (the VREF_A noise measurement itself is Task 5's) |
| pedal-digital-rail.md §7 | 5 | | 1 → TPS62933F-EFFICIENCY; 2 → MIDI-OUT-BRINGUP; 3 → 3V3P-RAIL-MEASURE; 4 → MLCC-DC-BIAS; 5 → POWER-PARTS-STOCK |
| pedal-digital-rail.md §8 | 8 | Task 15 and Task 16 carries (applied in power-fail.md §7 and vin-mod.md §3, §5, §6); R-28 (marked resolved) | S2 pedal → PEDAL-POWER-PARTS-TO-MODEL; Task 18 → POWER-PARTS-STOCK; bring-up (6): rail, relays, LEDs → 3V3P-RAIL-MEASURE; edges, shorted cable → MIDI-OUT-BRINGUP; ripple → VIN-MOD-RIPPLE-MEASURE |
| power-fail.md §9 | 5 | | 1 → PMEG4030ER-TYPICALS; 2 (allowances) split by what each feeds: plateau → QMSW-SWITCH-ON-CHECK, 2N7002 → QPEN-RERELEASE, SENSE-to-RESET / node capacitance / AO3400A IDSS → POWER-FAIL-REPLACEMENT-MEASURE (reused; link appended); 3 → QMSW-SWITCH-ON-CHECK, QMSW-GATE-HOLD-REPLUG; 4 → QMSW-SWITCH-ON-CHECK, SEED-VIN-SWITCH-ON; 5 → POWER-FAIL-SEQUENCE-CHECKS |
| power-fail.md §11 | 14 | Task 16 carries (closed in vin-mod.md) | S2 sheets, catalog → PEDAL-POWER-PARTS-TO-MODEL; S2 layout (3) → QMSW-POUR-LAYOUT; bring-up (9): plug pull → POWER-FAIL-REPLACEMENT-MEASURE; switch-on → QMSW-SWITCH-ON-CHECK; brownout → QPEN-RERELEASE; hot plug, re-plug → HOT-PLUG-PEAK, QMSW-GATE-HOLD-REPLUG; input current → SUPPLY-RATING-MEASURE; VIN_MOD ≤ 1 V, SENSE reversed, VDD−VCC, td → POWER-FAIL-SEQUENCE-CHECKS |
| ledger R-50, R-58, R-59 | 5 | | Seed → SEED-VIN-SWITCH-ON; pour → QMSW-POUR-LAYOUT; 150 µF → MODULE-BUCK-LOOP-STARTUP; re-release → QPEN-RERELEASE; re-plug → QMSW-GATE-HOLD-REPLUG |

The difference (84 passages, 28 rows touched) is merging where one piece of evidence settles several passages, which the brief allows; every passage maps to a row above.

Where my sources add detail to existing rows (not edited beyond appended links):
- SEED-VIN-SWITCH-ON: vin-mod.md §7's Rev5-assumption figures (137.7 / 147.3 °C, 1.05× over ILIMF) and §10's "before 12 V Seed benches"; link to vin-mod.md §7, §9 item 4, §10 appended to its Source cell.
- POWER-FAIL-REPLACEMENT-MEASURE: power-fail.md §5's margins (+10.80 / +16.27 / +8.01 / +1.21 ms) and §9 item 2's allowances; link to power-fail.md §5, §9 item 2, §11 appended to its Source cell. Its text says "R-13: the relay margin at 12 V ... must be at least zero"; power-fail.md shows +1.21 ms (slow fall) on paper, consistent.
- ANALOG-HEADROOM-9V and SEED-PIN38-PIN21-LOAD: no addition needed; power.md §5.4 now holds the pin-38 declared totals SEED-PIN38-PIN21-LOAD points to.

## Conflicts

None raised. Checked and found ordered (later dated text naming what it amends): R-51's 40.4 mV vs R-53's 41.6 mV (vin-mod.md §5 "Restated ... by S1 Task 17 fix D-C-1 (ruling R-53)"); R-50's 95 °C/W vs R-58's 102 °C/W ceiling ("95 °C/W stands"); R-52's 32.7 ms vs R-58 (explicit supersession); R-43's 1.08 A vs its own restatement to 0.98 A; POWER.md §4.2's v1 LDO table vs its own dated split note; POWER.md §5.2's 7.45 V shed vs split §7.4 and R-36.

## Labels applied (source wording)

- Owner: PS-18V, PW-TJ, O-6, O-16 (cross-reference), R-34 ("Owner decision: R-PF-7 at exactly 9.00 V"), R-43 ("Owner decision: the supply rating"), D14/D22/D24 (owner-approved, as decisions.md), and the no-input-TVS decision: POWER.md §4.4 "Decision (owner, 2026-10-02)".
- Controller rulings: O-15 ("controller ruling on best practice; the owner may override"), R-20 to R-59 as linked, R-49 noted as "a controller-delegated EE ruling", R-23 noted "confirmed 2026-10-06 (controller ruling)", the chassis bond: POWER.md §7.2 "Decided (2026-10-04, A2 Task 8 controller ruling; best practice, owner may override)".
- No decision restated with a label different from decisions.md.

## Anchors for decisions.md (bare consequence figures now derived)

All in docs/h7-platform/power.md, level-4 headings whose text is the identifier:
- `power.md#fig-seed-tj` — R-58's 137.7 °C (and R-50's 147.3 °C at 12.6 V)
- `power.md#fig-seed-hotplug` — R-59's 13.56 V
- `power.md#fig-pour` — R-50's 95 °C/W (with the 101.9/102 °C/W ceiling R-58 restates)
- `power.md#fig-minv` — R-46/R-58's `minV` 7.93 V
- `power.md#fig-qmsw-tj` — R-50/R-58's 123.7 °C governing figure
- `power.md#fig-hotplug` — R-59's 26.3 V
- `power.md#fig-trip` — R-36/R-58's trip 7.799–8.159 V, release ≤ 8.404 V
- `power.md#fig-en-delay` — R-44/R-58's ≥ 230 ms
- Effective constraints: `power.md#ec-seed-bench`, `power.md#ec-qpen-reset`.

## Concerns

1. **decisions.md lacks a live owner decision.** POWER.md §4.4, "Decision (owner, 2026-10-02)": no input TVS provided the 18 V hot-plug peak at the buck's VIN stays ≤ about 28 V. The split re-run (R-59, "≤ 28 V holds") still uses that criterion. power.md §4.5 labels it owner and says it is not yet a decisions.md entry. decisions.md not edited.
2. **decisions.md lacks the chassis-bond controller ruling** (POWER.md §7.2, A2 Task 8, 2026-10-04). Carried in power.md §10 with its source wording.
3. **decisions.md R-51 has no Amended-by R-53.** It states 40.4 mV as current; R-53 restated `permittedRippleMvPp` to 41.6 mV. power.md carries 41.6 mV with 40.4 mV on a Not-in-force line.
4. **The effective check does not pin the diode reset textually** (only 9–12 V and 179 Hz). I kept `D_PEN`, "diode reset" and R-52's 32.7 ms to Not-in-force lines by hand and checked it with grep; the reviewer has to read for it.
5. **3V3D-RIPPLE-INTO-VREF-A refers to VDDA-WIDEBAND**, which Task 5 must add. If Task 5's VREF_A noise rows cover the FB_VDDA 450 kHz margin, they should link this row instead of duplicating it. The pin-21 wideband bring-up measurement is left to Task 5 (analog.md).
6. **Overlap with Task 6 (bypass-relay.md).** power.md §3 carries power-fail.md in full but leaves R-PF-1 to R-PF-4 / R-PF-11 detail to bypass-relay.md; Task 6 should reuse POWER-FAIL-REPLACEMENT-MEASURE, POWER-FAIL-SEQUENCE-CHECKS and 3V3P-RAIL-MEASURE rather than adding rows for the same evidence.
7. **Overlap with Task 7.** FIRMWARE-POWER-OBLIGATIONS and MCU-TJ-MEASURE are firmware/processor items; Task 7 should link them from firmware-facing-requirements.md (which power.md and the row already link to, ahead of its existence).
8. **Arithmetic of my own** (labelled where used): the module survival percentages at 18 V (36 %, 51 %, 56 % in power.md §8) and the check (150 − 110.4) / 0.39 ≈ 102 °C/W in FIG-POUR, which reproduces the source's 101.9 within rounding. The FIG-POUR method was read from the pinned vinModSummary.ts (cited by link, nothing copied); vin-mod.md's prose states the ceiling's purpose but not its formula.
9. Figures that remain v1's (no split re-derivation) are marked "v1 figure" in power.md §5.1, §5.2, §8 and §10; the split spec's request to re-run POWER.md §2.1 for the module is open (MODULE-3V3-BUDGET).

## Fix round 1 (commit 9d7a640)

Important: power-fail.md section 9 items 2 and 3, now named in rows (corrected map):
- Item 2, SENSE-to-RESET 50 us, VIN node capacitance 2 nF, AO3400A IDSS 40 uA at 85 C: named in POWER-FAIL-REPLACEMENT-MEASURE (Task 3 row; text appended to its Item cell, with what each feeds: t_open 3.068 ms, the +1.21 ms slow-fall margin, Q_PFR's released-RST level).
- Item 2, BAS116H VF tempco 2 mV/K (previously missing from the map): named in POWER-FAIL-SEQUENCE-CHECKS (D_PFCL clamp, SENSE -0.059 V reversed) and QMSW-GATE-HOLD-REPLUG (D_GS's 1.09 V in the 1.217 V hold).
- Item 2, the Miller plateau 0.9 V -> QMSW-SWITCH-ON-CHECK; the 2N7002 IDSS and hot RDS(on) -> QPEN-RERELEASE (unchanged).
- Item 3, the CRCW2010-HP continuous-pulse trace (about 52 W at 1.2 ms, per-trip 32.7 W for 1.11 ms, 63 %): named in POWER-FAIL-SEQUENCE-CHECKS. Item 3's single-pulse chart stays in QMSW-GATE-HOLD-REPLUG; Fig. 11 ZthJC and the case heat capacity stay in QMSW-SWITCH-ON-CHECK.

Accuracy points:
- MODULE-3V3-BUDGET: added POWER.md section 8 item 6's "PCM3060 input capacitance (10 pF used) is not given in SLAS533B", noting the PCM3060 is now on the pedal behind the SAI isolation.
- PEDAL-POWER-PARTS-TO-MODEL: added "The optional CA-033 ferrites go at the jack."
- MCU-TJ-MEASURE: 34.7 C is the used-peripheral build-up (482 mA), 26.1 C with the full I/O bound, 20.4 C all peripherals enabled (580 mA).
- power.md FIG-POUR: 102 C/W cited to vin-mod.md section 4 and power-fail.md section 11; 101.9 C/W cited to power-fail.md section 7.
- power.md FIG-MINV: the 623 mA and 3V3_P's 1.361 W cited to power-fail.md section 7 and power.md section 6.2.
- power.md EC-QPEN-RESET: R-45 (R_PENPD) and R-52 (R_PENS) shown as "Values R-58 kept from earlier rulings"; "Amended by: none since R-58".
- power.md line 81: the ledger's first R-50 text 123.1 / 139.65 C; 123.18 / 139.68 C is R-58's as-computed restatement (D-D-11); reworded to say R-50 set the 9 V rule from the start and a 12 V Seed bench was never permitted under it.
- power.md line 79: added split spec section 12.4 step 1 ("on a 9-12 V supply only while a Seed is fitted (O-15)", narrowed by R-50) and step 0's bare-Seed3 bench "on a 9-12 V supply" (withdrawn by the owner's O-16, which withdrew split section 13 step 1). Both quotes on the Not-in-force line. Note: the coordinator's message called this "section 17"; it is section 12.4 (lines 816-817).
- power.md section 5.3: the 0.9 A / 80 uF / 91 us/V fall-rate figure marked v1's; noted the module 3V3 may carry up to 150 uF (R-50), and the module figure is in MODULE-BUCK-LOOP-STARTUP's re-derivation.

Rows: unchanged at 26 added (57 total). Command:
PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh power effective provenance nocode decisions architecture bytes
Output:
PASS power
PASS effective
PASS provenance
PASS nocode
PASS decisions
PASS bytes
PASS architecture
exit=0
(Also re-checked: 7 cells in every open-items row, no duplicate ids, all anchors resolve, superseded terms only on Not-in-force lines, 0 control-byte lines.)
