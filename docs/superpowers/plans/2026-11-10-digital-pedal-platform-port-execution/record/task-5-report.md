Task 5 report: docs/h7-platform/analog.md

Status: DONE_WITH_CONCERNS
Commit: 97b3623 "h7-platform port: analog.md" (on 9d7a640), pushed to origin/feature/digital-pedal-platform.

## What was written

- docs/h7-platform/analog.md (new, 512 lines). Sections:
  - Ported-from list, pinned.
  - How the pre-split note is carried. A pre-split to split name map applying split spec section 9: VIN_PROT to VIN_A; VDDA/VREF+ to VREF_A; PINMAP pins to contract pins 22-30; pots/toggles to O-18 positions; codec VDD/RST/SCKI to D20-D22; coils to 3V3_P; R_REF 1.00 kOhm to 3.30 kOhm. Two Not-in-force lines (the v1 power-fail shed; the v1 expression ring). The designator map is not carried.
  - 1 Effective constraints: EC-CONTROL-NOISE-BAND (0-421 Hz; Set by R-15; Amended by R-57), EC-VDDA-WIDEBAND (806 uV, f0 <= 158.0 kHz; Set by R-15 M-1; Amended by R-57), EC-RING-REFERENCE (R-17, R-19), EC-CODEC-RESET (R-31, R-37, R-40, R-53). Each has Not-in-force lines.
  - 2 Levels and the analog-interface table (AN-D1, AN-D2 owner).
  - 3 Headroom (FIG-HEADROOM; the R-34 8.615 V basis; the candidates; the load caveat).
  - 4 Op-amp allocation and supply currents.
  - 5 VMID.
  - 6 Input stage, 6.1 to 6.7.
  - 7 Output stage, 7.1 to 7.6.
  - 8 The jacks in bypass and the pop table (v1 figures; the relay detail is left to bypass-relay.md).
  - 9 VREF_A: 9.1 contract values; 9.2 FIG-VREF-LOAD; 9.3 4 uF and the damping leg; 9.4 FIG-VREF-806, FIG-VREF-1123, FIG-VREF-BAND; 9.5 FIG-VDDA-WIDEBAND; 9.6 back-feed with FIG-VREF-BLOCKED.
  - 10 Expression input.
  - 11 HW_REV.
  - 12 Control positions.
  - 13 Codec domain: oscillator R-29; VDD regulator R-30 with FIG-CVCL; local reset with FIG-CODEC-RST; budget; parts.
  - 14 Domain crossings: link to architecture.md section 4.8; SAI timing with FIG-SAI-MARGINS; the 33 Ohm codec-side resistors; FIG-VBUS-HOTPLUG.
  - 15 What did not cross.
  - 16 Open-item ids.
- docs/h7-platform/open-items.md:
  - 16 rows appended. The table stays contiguous and holds 73 rows, each with 7 cells and a unique id.
  - 10 existing rows extended with appended text and source links. The edits are listed below.
  - One Ported-from bullet added (ANALOG.md, vref-a.md, codec-domain.md).
  - No conflict entries.
- verify.sh:
  - check_analog: the file must exist and contain `421 Hz`, `806` and `PCM3060`.
  - check_openitems: FB-AN2606, VDDA-WIDEBAND and VBUS-HOTPLUG must each be a table row Id, not merely a word in the file. Every table row needs a non-empty sixth (phase) cell, with escaped `\|` not counted as a boundary. The phrase "paper analysis" must appear.
  - Both checks have dispatcher entries and ALL_CHECKS entries.

## RED and GREEN

RED, before analog.md and the rows existed:
```
FAIL analog: [missing docs/h7-platform/analog.md]
FAIL openitems: [no table row with Id VDDA-WIDEBAND] [no table row with Id VBUS-HOTPLUG]
PASS effective
PASS provenance
PASS nocode
exit=1
```
A plain grep for VDDA-WIDEBAND would already have passed at RED, because Task 4's 3V3D-RIPPLE-INTO-VREF-A names it. That is why the check requires a row Id.

GREEN, at HEAD 97b3623:
```
PASS analog
PASS openitems
PASS effective
PASS provenance
PASS nocode
PASS decisions
PASS bytes
PASS architecture
PASS power
exit=0
```

Mutation test of check_openitems. Each case ran on a scratch copy of verify.sh with an altered open-items.md; the repository was not touched.
```
unchanged                        exit=0 PASS openitems
empty phase on VDDA-WIDEBAND     exit=1 FAIL openitems: [empty phase cell: line 74 (VDDA-WIDEBAND) ]
no 'paper analysis'              exit=1 FAIL openitems: [open-items.md lacks the phrase 'paper analysis']
VBUS-HOTPLUG row removed         exit=1 FAIL openitems: [no table row with Id VBUS-HOTPLUG]
```

A script also checked the following:
- Every decisions.md anchor linked from analog.md and open-items.md exists as a `### <ID>` heading.
- Every in-page anchor resolves.
- Every reference-style link is defined and used.
- No table in analog.md has a column mismatch.
- Every open-items row has 7 cells, and no Id repeats.
- Every Id in analog.md section 16 is a row.
- There are 0 control bytes.
- `421 Hz` appears exactly once in analog.md, on the EC-CONTROL-NOISE-BAND line.
- 179 Hz, 0.745, 16.66, "6.5 °C" and 3.09 kOhm appear only on `*Not in force:*` lines.

## Open-passage count per section, and the rows that name each passage

I counted by reading the source rather than by grep, because the verb "carries" dominates a grep. The total is 70 open passages. They map onto 16 new rows, 10 existing rows I extended and 2 existing rows reused unchanged. In the tables below, NEW marks a row this task added, and APPENDED marks an existing row whose text this task extended so that it names the passage.

### ANALOG.md (17)

| Passage | Row(s) that name it |
|---|---|
| D1 acceptance gate (THD+N at 9.0 V, cold and hot) | ANALOG-HEADROOM-9V (APPENDED: "cold and hot" in the evidence) |
| §2.4 load caveat (6.8 kOhm, 0.37 V interpolated, -0.005 Vp-p) | ANALOG-HEADROOM-9V (APPENDED) |
| §2.4 "Codec and supply tolerance (not covered)" | ANALOG-HEADROOM-9V (APPENDED: 0.4 %, +7 %); ANALOG-CODEC-GAIN-AND-INPUT (NEW) |
| §5.7 "Bring-up measures it (BU-26)" | JACK-ESD-SYSTEM (NEW) |
| §7.4 "BU-08, BU-19 and BU-27 measure it" | POWER-FAIL-REPLACEMENT-MEASURE (APPENDED) |
| §11 item 1 | ANALOG-HEADROOM-9V (APPENDED) |
| §11 item 2 | ANALOG-HEADROOM-9V (APPENDED); ANALOG-CODEC-GAIN-AND-INPUT (NEW) |
| §11 item 3 | ANALOG-CODEC-OVERLOAD-AND-RESET (NEW) |
| §11 item 4, relay release with suppressor (BU-19) | POWER-FAIL-REPLACEMENT-MEASURE (APPENDED, marked as pre-split wording) |
| §11 item 5 | ANALOG-CODEC-GAIN-AND-INPUT (NEW) |
| §11 item 6 (node T parasitic, C_A 0.5x) | ANALOG-PASSBAND-ASSUMPTIONS (NEW) |
| §11 item 7, three sub-items (system IEC; Cd no maximum and the H3 estimate; leakage) | JACK-ESD-SYSTEM (NEW), all three named |
| §11 item 8 | ANALOG-NOISE-MEASURE (NEW) |
| §11 item 9 | HW-REV-ADC-ACCURACY (NEW) |
| §11 item 10 | ANALOG-CODEC-OVERLOAD-AND-RESET (NEW) |
| §12 hand-off to Task 12 (MPNs, leg assignment, jacks) | PEDAL-ANALOG-PARTS-TO-MODEL (NEW) |
| §12 hand-off to firmware | FIRMWARE-ANALOG-OBLIGATIONS (NEW) |

Closed by the source's own text: §12 "To POWER.md (applied ...)".

### vref-a.md (20)

| Passage | Row(s) |
|---|---|
| §0 Murata curve not readable (L from \|Z\| lower bound only) | VDDA-WIDEBAND (NEW); VDDA-DAMPING-LEG (NEW) |
| §1 D_RCLAMP leakage allowance 0.86 mA | VREF-A-LOAD-ALLOWANCES (NEW) |
| §1 B10K at -20 % (R-16 allowance) | VREF-A-LOAD-ALLOWANCES (NEW) |
| §1 U_EXP short-circuit current, no maximum | VREF-A-LOAD-ALLOWANCES (NEW) |
| §2 Rev7 and Seed3 regulators unpublished; the bound covers Rev5 only | SEED-PIN21-CAPACITANCE (existing text) |
| §2 the 4 uF decision carried as a loop and start-up check | MODULE-BUCK-LOOP-STARTUP (existing text names 4 uF, R-18; unchanged) |
| §2 the damping leg carried as a named S2 requirement | VDDA-DAMPING-LEG (NEW) |
| §3 U_EXP PSRR at 40 dB, an allowance | VREF-A-NOISE-MEASURE (NEW) |
| §3 VDDA-WIDEBAND (parts and DC-bias curves, or keep 0.5) | VDDA-WIDEBAND (NEW) |
| §3 "Bring-up measures pin-21 wideband noise at the highest VIN" | VREF-A-NOISE-MEASURE (NEW) |
| §4 IOUT,OFF specified only for VIN >= 1.5 V, and the bring-up gate | VREF-A-BACKFEED-GATE (APPENDED) |
| §4 the bleeder backstop, not adopted | VREF-A-BLEEDER-DECISION (NEW) |
| §4 IN+ node short and guarded | PEDAL-ANALOG-LAYOUT-RULES (NEW) |
| §4 Seed residual, not fixed | VREF-A-BACKFEED-GATE (APPENDED) |
| §5 carry "S2 pedal" | PEDAL-ANALOG-PARTS-TO-MODEL (NEW), and the IN+ guard in PEDAL-ANALOG-LAYOUT-RULES (NEW) |
| §5 carry "Module design, option not adopted" | VREF-A-BLEEDER-DECISION (NEW) |
| §5 carry "Module design (S2 plan Task 5)" | VDDA-DAMPING-LEG (NEW); MODULE-BUCK-LOOP-STARTUP; VDDA-WIDEBAND (NEW) |
| §5 carry "Firmware contract" (10 bits; ramp readings discarded) | FIRMWARE-ANALOG-OBLIGATIONS (NEW) |
| §5 carry "Bring-up" (noise; the gate; D_RCLAMP leakage at temperature) | VREF-A-NOISE-MEASURE (NEW); VREF-A-BACKFEED-GATE; VREF-A-LOAD-ALLOWANCES (NEW) |
| §5 carry "Task 17 / Task 18" (Murata L; RV16AF tolerance; SCH-R5 re-read) | VDDA-WIDEBAND (NEW); VREF-A-LOAD-ALLOWANCES (NEW); SEED-PIN21-CAPACITANCE (APPENDED) |

### codec-domain.md (21, plus 1 closed)

| Passage | Row(s) |
|---|---|
| §0 SCKI jitter requirement not stated | CODEC-DOMAIN-BRINGUP (NEW) |
| §0 SCKI input capacitance not stated | CODEC-DOMAIN-BRINGUP (NEW) |
| §0 IDD and RST pull-down over temperature not stated | CODEC-DOMAIN-BRINGUP (NEW) |
| §0 RST pull-down minimum not stated | CODEC-DOMAIN-BRINGUP (NEW) |
| §0 TPS7A24 ground current at load not stated | CODEC-DOMAIN-BRINGUP (NEW) |
| §1 jitter typical only, at 20 MHz | CODEC-DOMAIN-BRINGUP (NEW) |
| §1 the YXC alternate's gaps (no decode, no supply or load drift, footprint) | POWER-PARTS-STOCK (APPENDED) |
| §1 the 15 pF load as a layout requirement, and the SCKI duty check | PEDAL-ANALOG-LAYOUT-RULES (NEW); CODEC-DOMAIN-BRINGUP (NEW) |
| §2 D_CVCL VF interpolated and its tempco read from typical curves | POWER-FAIL-SEQUENCE-CHECKS (APPENDED) |
| §2 D_CVCL 0.86 mA hot-leakage allowance (R_CBLD sizing) | POWER-FAIL-SEQUENCE-CHECKS (APPENDED) |
| §3 Q_PFR IDSS 40 uA at 85 °C, an allowance | CODEC-DOMAIN-BRINGUP (NEW); already in POWER-FAIL-REPLACEMENT-MEASURE |
| §3 internal pull-down 26.4 kOhm (x0.8), an allowance | CODEC-DOMAIN-BRINGUP (NEW) |
| §3 5V_A soft start at a 28 ms allowance (R-31) | PCM3060-POR-XO-START (APPENDED) |
| §4 PCM3060 IDD 12 mA, an allowance | CODEC-DOMAIN-BRINGUP (NEW) |
| §4 U_CVDD ground current 0.1 mA, an allowance | CODEC-DOMAIN-BRINGUP (NEW) |
| §6 stock (U_CRST 449; the catalogue codes read 0) | POWER-PARTS-STOCK (APPENDED) |
| §7 carry "S1 Task 24 / S2 Task 10" parts and catalogue rows | PEDAL-ANALOG-PARTS-TO-MODEL (NEW) |
| §7 carry "S2 layout" | PEDAL-ANALOG-LAYOUT-RULES (NEW) |
| §7 carry "Bring-up" (SCKI; 3V3_CODEC; IDD; RST timing; VDD - VCC) | CODEC-DOMAIN-BRINGUP (NEW); PCM3060-POR-XO-START (APPENDED, RST timing); POWER-FAIL-SEQUENCE-CHECKS (existing text, VDD - VCC) |
| §7 carry "Task 18 / OWN-07" stock (U_CRST 449, U_XO 753) | POWER-PARTS-STOCK (APPENDED) |

Closed by the source's own text: §7 "S1 Task 15" ("Done 2026-10-06").

### crossings.md, the part Task 3 left (6)

| Passage | Row(s) |
|---|---|
| §0 the USB Type-C specification not read (vSafe5V via the ECN) | VBUS-HOTPLUG (NEW) |
| §1 the R-6 2 ns engineering allowance | SAI-ACROSS-HEADER (existing text) |
| §1 the 20 pF node allowance (R-10) | SAI-ACROSS-HEADER (APPENDED) |
| §1 U_ISO_M 1.4 ns minimum, an allowance at the test load | SAI-ACROSS-HEADER (APPENDED) |
| §4 VBUS hot-plug edge | VBUS-HOTPLUG (NEW) |
| §8 carry "S2 pedal, VBUS-HOTPLUG", including the bring-up scope | VBUS-HOTPLUG (NEW); IF-PD-1-MEASURE (APPENDED, the scope) |

Task 3 counted and mapped the other §8 carries.

### Ledger (6)

| Passage | Row(s) |
|---|---|
| R-15 "bring-up measures it" (wideband) | VREF-A-NOISE-MEASURE (NEW) |
| R-15 firmware smoothing above the band (firmware contract) | FIRMWARE-ANALOG-OBLIGATIONS (NEW) |
| R-15 "FB_VDDA's attenuation at 450 kHz must hold this margin" (superseded by R-57) | VDDA-WIDEBAND (NEW); 3V3D-RIPPLE-INTO-VREF-A (APPENDED with R-57's withdrawal) |
| R-57 VDDA-WIDEBAND | VDDA-WIDEBAND (NEW) |
| R-57 VBUS-HOTPLUG | VBUS-HOTPLUG (NEW) |
| R-57 FB-AN2606 | FB-AN2606 (Task 3; unchanged) |

### Why 70 passages map onto 28 rows

- One piece of evidence settles several passages: a single bring-up measurement, a single phase-2 model entry, or a single layout review.
- An item stated in two or three sources becomes one row:
  - VBUS-HOTPLUG appears in crossings.md §4 and §8 and in R-57.
  - The wideband requirement appears in R-15, R-57, vref-a.md §3 and vref-a.md §5.
- Every passage maps to a row above.

## Edits to other tasks' rows (all appended text or links; nothing deleted)

| Row (owner) | Edit |
|---|---|
| ANALOG-HEADROOM-9V (Task 3) | Item: ANALOG.md §11 items 1 and 2 (the 6.8 kOhm load caveat, 0.37 V, -0.005 Vp-p; the 0.4 % and +7 % thresholds). Evidence: "cold and hot, as the owner's full-scale decision (AN-D1) asks". Source: ANALOG.md link. |
| SAI-ACROSS-HEADER (Task 3) | Item: the 20 pF node allowance and the U_ISO_M 1.4 ns allowance; the setup and hold margins; FIG-SAI-MARGINS. |
| VREF-A-BACKFEED-GATE (Task 3) | Item: IOUT,OFF specified only for VIN >= 1.5 V; the gate is single-sample; the bleeder backstop row; the Seed +12 V tip residual. Source: vref-a.md §4, §5. |
| SEED-PIN21-CAPACITANCE (Task 3) | Item: SCH-R5's pin-21 values to be re-read on a full-resolution copy. Source: vref-a.md §2, §5. |
| PCM3060-POR-XO-START (Task 3) | Item: the local reset that realises the bound, the 28 ms soft-start allowance, and the RST-timing carry. Evidence: the RST delay measured at >= 130 ms. Source: codec-domain.md §3, §7. |
| POWER-FAIL-REPLACEMENT-MEASURE (Task 3) | Item: ANALOG.md §11 item 4 (pre-split wording), and §7.4's BU-08/19/27. Source: ANALOG.md. |
| IF-PD-1-MEASURE (Task 3) | Item and evidence: PA1 scoped at a USB-C plug-in (VBUS-HOTPLUG). Source: crossings.md §8, R-57. |
| POWER-PARTS-STOCK (Task 4) | Item: the codec-domain stock flags, fallbacks and YXC alternate gaps. Source: codec-domain.md. |
| POWER-FAIL-SEQUENCE-CHECKS (Task 4) | Item: the D_CVCL VF and tempco basis, and the leakage allowance. Source: codec-domain.md §2, §7. |
| 3V3D-RIPPLE-INTO-VREF-A (Task 4) | Item: R-57 withdrew the 0.745 mV figure as a bound (2.13 mV on R-57's basis), so the 7.6 % margin is not in force; the requirement is VDDA-WIDEBAND. Source: vref-a.md §3, R-57. See concern 1. |

## Conflicts

None raised. The following were checked and found to be ordered by later dated text that names what it amends:

| Earlier | Later | Basis |
|---|---|---|
| 179 Hz | 421 Hz | R-57 |
| 0.745 mV | 2.13 mV | R-57 withdraws the earlier figure |
| R_CRST 10.0 kOhm | 4.70 kOhm | R-40 |
| R_REF 1.00 kOhm, 3.09 kOhm | 3.30 kOhm | fix round 2 |
| The R-30 onset at 6.5 °C | about -5 °C | D-C-9, R-53 |
| Domain current 16.66 mA | 17.05 mA | R-40 |
| U_PF's pin on CODEC_RST_N | Q_PFR | R-37 |
| The split spec §5.6.3 note's 0-179 Hz | 0-421 Hz | its own R-57 amendment |

## Labels applied (source wording)

Owner:
- AN-D1 ("Resolved by the owner, 2026-10-01: option (b), 7.62 Vp-p into 10 kOhm").
- AN-D2 ("Resolved by the owner ... resistive input impedance").
- OWN-03 (jack ESD, "owner decision 2026-10-02").
- OWN-01 (relay bypass, 2026-10-04).
- O-2, O-6, O-18.
- R-34 ("Owner decision" in the ledger).
- D19, D20, D21, D22: owner-approved, as decisions.md has them.

Controller rulings:
- R-15 to R-20, R-6, R-9, R-10, R-14, R-24, R-25, R-29 to R-32, R-35, R-37, R-40, R-50, R-53 and R-57 (none is titled "Owner decision").
- RR-2.
- OWN-02, carried as decisions.md has it: "a controller ruling the source heads as an owner decision".
- The ring's +/-5 V external DC limit: ANALOG.md §8.2 reads "A2 Task 13 ruling, best practice; owner may override". It is carried as a controller ruling in its source wording. It is not a decisions.md entry (concern 2).

No decision is restated with a label different from decisions.md.

## Anchors for decisions.md and other tasks

Bare consequence figures in decisions.md are now derived. All of these are level-4 headings in docs/h7-platform/analog.md:

| Anchor | What it derives |
|---|---|
| `analog.md#fig-vref-806` | R-15's 806 uV (LSB/4 at 10 bits over 3.3 V: 805.7 uV) |
| `analog.md#fig-vref-1123` | R-15's 1,123 uV rms (805.7 / 0.717 = 1,123.6, recorded rounded down) |
| `analog.md#fig-vref-band` | R-57's 421 Hz band edge (1 / (2 pi x 9.9 kOhm x 38.25 nF) = 420.3 Hz) |
| `analog.md#fig-vdda-wideband` | R-57's 2.13 mV, f0 <= 158.0 kHz, 1.015 uH uF, 10.1 uF |
| `analog.md#fig-vref-load` | R-16/R-19's 6.49 / 9.74 mA and 8.50 / 12.75 mA |
| `analog.md#fig-vref-blocked` | R-17's 0.38 V and 0.91 V margin |
| `analog.md#fig-headroom` | AN-D1's +0.031 Vp-p |
| `analog.md#fig-sai-margins` | R-9's 75.28 / 110.28 ns |
| `analog.md#fig-vbus-hotplug` | R-57's 7.00 V, 8.4 us and 44 us |
| `analog.md#fig-codec-rst` | R-31/R-40's 2.58 V |
| `analog.md#fig-cvcl` | R-30's 251 mV and 24 mV exception |

Effective constraints: `analog.md#ec-control-noise-band`, `analog.md#ec-vdda-wideband`, `analog.md#ec-ring-reference`, `analog.md#ec-codec-reset`.

Rows other tasks should reuse:
- FIRMWARE-ANALOG-OBLIGATIONS (Task 7 should link it from firmware-facing-requirements.md).
- POWER-FAIL-REPLACEMENT-MEASURE now names ANALOG.md §11 item 4 (Task 6, bypass relay).
- PEDAL-ANALOG-PARTS-TO-MODEL and PEDAL-ANALOG-LAYOUT-RULES (Task 9 parts, Task 10 layout carry-forward).

## Concerns

1. **Task 4's row 3V3D-RIPPLE-INTO-VREF-A stated R-57's withdrawn figure as current.** It said 0.745 mV against 806 uV, "a 7.6 % margin". R-57 withdrew that figure as a bound. I appended the withdrawal rather than rewrite another task's text. The row's first sentence still reads as current, followed by the correction. A reviewer may prefer the first sentence reworded.
2. **decisions.md gaps, not edited:**
   - The ring's +/-5 V external DC limit (A2 Task 13 controller ruling, ANALOG.md §8.2) has no entry.
   - decisions.md R-15 says the 0.745 mV was "withdrawn as a bound by R-57", which is right. Its "Current" line states 1,123 uV, 421 Hz and 806 uV bare. These can now link the FIG anchors above.
3. **The FIG-VBUS-HOTPLUG method is my reconstruction.** crossings.md's prose gives 8.4 us and 44 us without the start condition. They reproduce exactly from tau = 7.46 kOhm x 38.25 nF = 285 us rising from the steady 3.498 V, not from 0 V. analog.md says so. Whether a plug-in edge should start from steady state is a question for phase 2's VBUS-HOTPLUG work. The question is not raised as a conflict, because the source does not contradict itself.
4. **1,123 uV is the floor of 1,123.6.** analog.md shows the unrounded value. 806 / 0.717 using the rounded 806 would give 1,124.1, so the source used the unrounded LSB/4.
5. **The relay part name differs between sources.** ANALOG.md §11 item 4 names the G6K-2F-Y, while power.md and split spec R-PF-2 cite K106-E1-11 release figures. I marked the appended text in POWER-FAIL-REPLACEMENT-MEASURE "pre-split wording" and left the part to Task 6.
6. **HW_REV codes on the split boards.** ANALOG.md assigned revision 1 to v1. The sources read do not say which code each split board carries. analog.md §11 says so. I did not add a row for it, because it is not an open passage in the sources.
7. **check_openitems tests that the phase cell is non-empty, as specified.** It does not test that the value is one of `phase 2`, `phase 3`, `phase 4` or `bring-up`. All 73 rows use one of those values today.
8. **One forbidden word remains, inside a quote.** "best practice" appears in analog.md §10.1, in a quotation of the ring-limit ruling's source wording. It concerns a ruling, not a drawing.

## Fix round 1 (commit 2ef6047, on 97b3623)

Changes:
1. (Important) open-items 3V3D-RIPPLE-INTO-VREF-A. Under the controller's ruling authorising rewrites of superseded-as-current text, I rewrote the row's lead:
   - It now says the present bank passes 2.13 mV rms on R-57's basis, over 806 µV, and points to VDDA-WIDEBAND (f0 ≤ 158.0 kHz; analog.md EC-VDDA-WIDEBAND) for the current requirement.
   - The row carries the ripple side, as the input that check uses.
   - The 0.745 mV / 7.6 % estimate and its "keep FB_VDDA's attenuation ... so that the margin holds" carry appear only in a sentence headed "History, withdrawn by R-57".
   - My earlier appended correction was replaced; it is not duplicated.
   - power.md §5.4 (former line 425): rewritten the same way, with the 0.745 mV estimate moved to its own `*Not in force:*` line linking R-57.
   - The figure 0.745 now appears in docs/h7-platform only on Not-in-force lines (analog.md, power.md, decisions.md) and in that row's withdrawn-history sentence.
2. analog.md FIG-VBUS-HOTPLUG:
   - It now says the source's 8.4 µs and 44 µs "are consistent with a start from the steady-state level (the source's prose does not state its start condition)".
   - It adds that a real plug-in starts from VBUS ≈ 0 V, and that the 3.498 V start is the shorter, conservative window.
   - From 0 V the 3.6 V window is τ × ln(7.00 / 3.40) ≈ 206 µs, and the 4.0 V window τ × ln(7.00 / 3.00) ≈ 242 µs.
   - Verified with `python3 -I -c` arithmetic: τ = 285.3 µs → 8.43, 44.15, 206.06 and 241.77 µs.
3. open-items POWER-FAIL-REPLACEMENT-MEASURE:
   - The item now reads "the Omron G6K-2F-Y (its data sheet is catalogue number K106-E1-11, the same part)". This is confirmed in BYPASS-RELAY.md §0 line 23 ("G6K Surface Mounting Relay datasheet, Cat. No. K106-E1-11") and power-fail.md line 51.
   - The "(pre-split wording)" tag is removed. The ≤ 2.7 ms is now attributed to BU-19's target, set on v1's stack (BYPASS-RELAY.md §5.4) and kept by split spec R-PF-2.
   - BU-27 is added to the Evidence cell ("BU-08, BU-19, BU-27 and BU-28").
   - This also resolves my concern 5: there is no part discrepancy.
4. open-items ANALOG-HEADROOM-9V evidence now reads "cold and hot, as `ANALOG.md`'s acceptance gate for D1 states".
5. open-items FIRMWARE-ANALOG-OBLIGATIONS:
   - The item adds "and the independent watchdog kept on (`BYPASS-RELAY.md` §4)".
   - The evidence adds "the relay engage sequence with the independent watchdog on".
6. verify.sh check_openitems also fails when a phase cell is not one of `phase 2`, `phase 3`, `phase 4` or `bring-up`. The failure message names the line, the Id and the value. This resolves concern 7.

Rows: unchanged at 73.

Mutation test. Each case is a scratch tree under the session scratchpad, outside the worktree, holding a copy of verify.sh and an altered open-items.md:
```
unchanged                        exit=0 PASS openitems
empty phase on VDDA-WIDEBAND     exit=1 FAIL openitems: [phase cell empty or not one of phase 2, phase 3, phase 4, bring-up: line 74 (VDDA-WIDEBAND): empty ]
phase 'later' on VBUS-HOTPLUG    exit=1 FAIL openitems: [phase cell empty or not one of phase 2, phase 3, phase 4, bring-up: line 75 (VBUS-HOTPLUG): "later" ]
phase 'phase 5' on FB-AN2606     exit=1 FAIL openitems: [phase cell empty or not one of phase 2, phase 3, phase 4, bring-up: line 17 (FB-AN2606): "phase 5" ]
no 'paper analysis'              exit=1 FAIL openitems: [open-items.md lacks the phrase 'paper analysis']
VBUS-HOTPLUG row removed         exit=1 FAIL openitems: [no table row with Id VBUS-HOTPLUG]
```

Command:

    PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh analog openitems effective provenance nocode decisions architecture power bytes

Output:
```
PASS analog
PASS openitems
PASS effective
PASS provenance
PASS nocode
PASS decisions
PASS architecture
PASS power
PASS bytes
exit=0
```

The self-check script was re-run. It confirms every open-items row still has 7 cells, no Id repeats, all anchors resolve, and there are 0 control bytes. The only items it flags are known false positives: dates in the link list, and R2's legitimate 1.00 MΩ.
