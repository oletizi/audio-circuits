Task 6 report: docs/h7-platform/bypass-relay.md

Status: DONE_WITH_CONCERNS. Commit 92cf666 (BASE 2ef6047), pushed.

What I wrote
- docs/h7-platform/bypass-relay.md (new). Ported from BYPASS-RELAY.md (status, owner decision, sections 0-12), split spec 7.4, 7.5 (+ 5.6.5, 7.1, 8, 9.1, 9.3, 11 as amendments), power-fail.md 5-9, 11, ledger R-13, R-37, R-38, R-40, R-57.
  Sections: how the pre-split note is carried (name map + five Not-in-force lines); 1 effective constraints EC-UNPOWERED-BYPASS, EC-RELAY-PART, EC-COIL-RAIL, EC-RELAY-GATE, EC-POWER-FAIL-OVERRIDE, EC-FIRMWARE-RELAY-CONTRACT; 2 topology (nets, G6K pin map, states, why inputs are switched); 3 the unpowered state and every route to bypass; 4 power-fail (why the v1 shed could not cross, R-PF-1..11 table each with its open-item row, the override and codec reset R-PF-4/R-PF-11 from power-fail.md 6 with FIG-OVERRIDE, the loss sequence, power-up); 5 parts (relay, drive, FIG-DRAIN-PEAK, FIG-GATE-TURN-OFF); 6 firmware contract incl. the watchdog; 7 layout; 8 proven-in; 9 bring-up/checklist items mapped to rows; 10 what did not cross; 11 open items.
  Facts already in architecture.md (RELAY_EN pin, 87.4 kOhm gate tolerance, 2.58 V gate), power.md (trip, t_open, margins, Q_MSW, 3V3_P coil check and budget, sequencing) and analog.md (pop table, EC-CODEC-RESET, FIG-CODEC-RST) are linked, not restated. power.md 3.4 deferred R-PF-4/R-PF-11 detail to this document; it is in 4.3.
- verify.sh: check_bypass (unpowered, power-fail), dispatcher entry, ALL_CHECKS entry.
- open-items.md: 3 rows added, 4 extended, BYPASS-RELAY.md added to its Ported-from list.

RED (before the document):
FAIL bypass: [missing docs/h7-platform/bypass-relay.md]
exit=1

GREEN:
PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash .../verify.sh bypass effective provenance nocode openitems
PASS bypass / PASS effective / PASS provenance / PASS nocode / PASS openitems, exit=0
Also checked: 77 table rows, all 9 cells, no duplicate ids; every decisions.md / power.md / analog.md anchor I link exists; 0 NUL and 0 CR bytes in both files; no forbidden drawing words.

Open-passage count vs rows
Strict keywords ("Not verified", "Carries", "Carry", U-status):
- BYPASS-RELAY.md: 0 (line 227 "carry an unknown onboard pull-up" is a verb, not a carry).
- split spec 7.4: 0; 7.5: 0.
- power-fail.md, R-PF portions: 4, all already rowed by Task 4 and reused:
  - 9 item 2, SENSE-to-RESET 50 us allowance -> POWER-FAIL-REPLACEMENT-MEASURE (already names it)
  - 9 item 2, AO3400A IDSS 40 uA at 85 C -> POWER-FAIL-REPLACEMENT-MEASURE and CODEC-DOMAIN-BRINGUP (already name it)
  - 11 S2 sheets: U_PFINV, Q_PFG, Q_PFR -> PEDAL-POWER-PARTS-TO-MODEL (already names them)
  - 11 bring-up: plug pull and mains-off at the jack (BU-08, BU-19), with the release time -> POWER-FAIL-REPLACEMENT-MEASURE
Substantive open passages without those keywords (mapped so that each is NAMED in a row's text):
- BR 3.1 footprint "Task 12 checks it against the p. 6 mounting dimensions" -> BYPASS-PARTS-TO-MODEL (NEW; names the footprint and the p. 6 check)
- BR 5.4 release time with Zener suppressor "not in the datasheet; BU-19" -> POWER-FAIL-REPLACEMENT-MEASURE (now quotes BR 5.4)
- BR 5.4 "BU-08 measures the whole sequence at the jack" -> POWER-FAIL-REPLACEMENT-MEASURE (quoted)
- BR 5.4 residual when engaged at loss (PCM3060 behaviour not specified, BU-08) -> POWER-FAIL-REPLACEMENT-MEASURE (appended)
- BR 7 layout notes -> PEDAL-ANALOG-LAYOUT-RULES (appended); relay height 5.2 mm -> STACK-HEIGHT-CONFIRM (appended)
- BR 9 BU-08 -> POWER-FAIL-REPLACEMENT-MEASURE (evidence now names the split scope: supervisor output, relay gate, VIN_A)
- BR 9 BU-11 -> FIRMWARE-ANALOG-OBLIGATIONS (source now names BR 9 BU-11 and split 11)
- BR 9 BU-19, BU-27 -> POWER-FAIL-REPLACEMENT-MEASURE (already named)
- BR 9 BU-28 (incl. starting on 8.45 V at the jack) -> POWER-FAIL-REPLACEMENT-MEASURE (appended)
- BR 9 BU-29 -> BYPASS-PATH-UNPOWERED (NEW)
- BR 12 "The first board measures it" (v1 12 V margin) -> POWER-FAIL-REPLACEMENT-MEASURE (R-13; v1 value on a Not-in-force line)
- split 7.4 R-PF-1, -2, -3, -5, -6, -8 -> POWER-FAIL-REPLACEMENT-MEASURE (row text now names them); R-PF-4, R-PF-11 -> RELAY-OVERRIDE-ON-TRIP (NEW; names both); R-PF-7 -> ANALOG-HEADROOM-9V; R-PF-9, R-PF-10 -> POWER-FAIL-SEQUENCE-CHECKS (R-PF-10 also IF-PD-1-MEASURE). These rows are named per R-PF id in bypass-relay.md 4.2.
- split 7.4 "Final component values are marked for re-analysis in the plan" -> answered by power-fail.md; held open as paper analysis in POWER-FAIL-REPLACEMENT-MEASURE.
- split 9.3 "codec RST on a trip" -> RELAY-OVERRIDE-ON-TRIP; "RELAY_EN ... through the Daisy bootloader's grace period" -> SEED-BOOTLOADER-PIN-STATES (Task 3).
- split 7.5 "BYPASS-RELAY.md implications (amended in the plan, not here)": applied in bypass-relay.md's name map; not an open item.
Rows added: 3 (BYPASS-PARTS-TO-MODEL phase 2, BYPASS-PATH-UNPOWERED bring-up, RELAY-OVERRIDE-ON-TRIP bring-up). Extended: 4. Difference from the strict count (4): those 4 were already rows; the 3 new rows come from substantive passages no existing row covered.

Conflicts raised: none. Disagreements found, all settled by date/authority and shown as Not-in-force lines, not conflicts:
- split 7.4's sketch (one supervisor pin on both the relay gate and codec RST) vs R-37 (inverter + Q_PFG/Q_PFR): R-37 later, supersedes.
- BR 3.3's split amendment / R-13 first text "R_x,min 90.4 kOhm" vs R-57's 87.4 kOhm: R-57 later.
- BYPASS-RELAY.md at the pin still says 3V3_D, PI5, R_BG 100 Ohm, the BUCK_EN shed in 1, 2.1, 3.1, 3.2, 3.4-5, 7, 9 (only 3.3 carries a split note); split 7.5 says these are "amended in the plan, not here". Applied.
No disagreement found between architecture.md, power.md, analog.md and my sources on a bypass fact. No other task's text rewritten (I found no superseded value stated as current).

Labels applied
- Owner: OWN-01 (BR "Owner decision (2026-10-04)", quoted); the note's design choices as "the note the owner approved on 2026-10-04" (BR status line "approved by the owner on 2026-10-04 and implemented", which decisions.md cites under OWN-01); O-6 (split "which the owner directed (O-6)"); R-34 (owner). The approved v1 shed (BR 11 item 2) appears only on a Not-in-force line, with split 9.1's "The approved shed is replaced by 7.4, which the owner directed (O-6)".
- Controller rulings: RR-3, RR-11, R-13, R-25, R-33-R-40, R-44, R-45, R-52, R-57, R-58.
- BR 11 item 1 (effect-off behaviour) described as "settled with no hardware decision needed", the source's wording, not as a separate owner decision.

Anchors other tasks may need
- bypass-relay.md#ec-unpowered-bypass, #ec-relay-part, #ec-coil-rail, #ec-relay-gate, #ec-power-fail-override, #ec-firmware-relay-contract, #fig-override (0.93 mA / <= 45 uV), #fig-drain-peak (18.5 V), #fig-gate-turn-off (9.5 us). Section 6 is the firmware contract incl. the watchdog sentence, for Task 7's firmware-facing-requirements.md. The decisions.md amendment dispatch could link OWN-01 and O-6 to #ec-unpowered-bypass / #ec-power-fail-override.

Concerns
1. The footprint name Relay_SMD:Relay_DPDT_Omron_G6K-2F-Y was verified to exist in the KiCad 10.0.5 library on this machine (/Applications/KiCad/.../Relay_SMD.pretty). The p. 6 dimension check BR 3.1 assigns has no carried result (v1 VERIFICATION.md is not evidence per split 8), so it is open in BYPASS-PARTS-TO-MODEL.
2. FIG-DRAIN-PEAK is a v1 figure re-applied to 3V3_P on my observation that 3V3_P has the same 3.274-3.513 V range; the ZZT extrapolation from 5 mA to 57 mA is the source's estimate. Labelled so.
3. The 4.4 residual paragraph says the mechanism changes on the split (codec clock master, RST asserted at the trip). That is my reading of split 5.6.5/7.2 applied to BR 5.4; no source re-analysed the residual on the split. It stays a BU-08 measurement.
4. decisions.md has no entry for the BR 11 item 2 shed approval of its own (it is folded into OWN-01's Not-in-force line). Not a gap in effect, since it is superseded; noted for the amendment dispatch.
5. Firmware section links firmware-facing-requirements.md, which Task 7 creates.

## Fix round 1 (commit 6da0b90)

Important:
1. R-PF-2 (bypass-relay.md 4.2): the 3.0 ms is now attached to the release term. The split spec's note (pre-flight K-7/D-1) is carried: the release maximum "does not cap t_open". The On-paper cell lists t_open's four terms (0.017 + 0.050 + 0.00067 + 3.0 ms).
2. R-PF-7, R-PF-9 and R-PF-10 are now named in their rows, with matching evidence:
   - ANALOG-HEADROOM-9V names R-PF-7.
   - POWER-FAIL-SEQUENCE-CHECKS names R-PF-9 (18 V rating of every new part; its bring-up point is SENSE with 18 V reversed). It also names R-PF-10 (VCC/5V_A up before VDD and down after VDD); the evidence adds VCC seen ahead of VDD at power-up.
   - PEDAL-POWER-PARTS-TO-MODEL names R-PF-9 (ratings re-derived against the model).
   - IF-PD-1-MEASURE names R-PF-10's crossings part.
   The 4.2 table and section 11 now match these rows. The R-PF-10 requirement text now reads VCC up before VDD and down after VDD, the module supervisor covers the MCU, and crossings stay inside IF-PD-1.
3. The residual paragraph (bypass-relay.md 4.4) and POWER-FAIL-REPLACEMENT-MEASURE now separate v1 from my reading:
   - They quote v1's analysis and conclusion and say "That conclusion is v1's; no source re-analysed the residual on the split".
   - The split mechanism is labelled as this document's reading.
   - Both carry split 5.6.5's point that after RST falls, DOUT takes about 40 ms (1936/fS) to be zeroed.
   - Both carry BR's "AN 11 item 10 estimates a few mV for the reset case".

Smaller fixes:
- The shed approval is now cited to BR's status line and to split 9.1's Owner decisions table row, not to section 11 item 2.
- The FX_IN row now cites analog.md section 6.
- EC-COIL-RAIL now links power.md 6.1 ("Coils at the rail minimum") and no longer restates its figures.
- The 5 V coil alternative now carries BR 3.1's own reasons: the coil current would sit on the codec's analog rail, and 5V_A outlives 3V3_D, the wrong order for dropping the relay.

Rows: none added. 4 more rows extended (ANALOG-HEADROOM-9V, IF-PD-1-MEASURE, POWER-FAIL-SEQUENCE-CHECKS, PEDAL-POWER-PARTS-TO-MODEL), and the earlier residual text in POWER-FAIL-REPLACEMENT-MEASURE was rewritten. 77 rows, 9 cells each, 0 NUL and 0 CR bytes.

Command:
PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh bypass openitems effective provenance nocode decisions architecture power analog bytes
Output:
PASS bypass
PASS openitems
PASS effective
PASS provenance
PASS nocode
PASS decisions
PASS architecture
PASS power
PASS analog
PASS bytes
exit=0
