Task 10 report: layout carry-forward, schematic checklist, bring-up

Status: DONE_WITH_CONCERNS
Commit: d52bb56 (base 3f1240d), pushed to origin/feature/digital-pedal-platform.

What I wrote
- docs/h7-platform/layout-carry-forward.md (144 lines). LAYOUT-CARRYFORWARD.md restated per board: §1 every board (ground plane linked to power.md §10, part data through the board file, lifecycle, net classes per board, USB pairs on three paths, enclosure fit with v1's tall electrolytics mapped to split labels via REFMAP), §2 h7-module, §3 h7-pedal (power entry, analog/codec/jacks, USB-C, chassis bond, DC jack, BZT52C12 -79, layout B/sockets/footswitch boards linked to mechanical-and-controls.md, test pads), §4 the O-13 carrier, §5 Not in force (8 lines, each with its withdrawing source), §6 hand checks -> bring-up.md, §7 DESIGN-REVIEW.md linked with its "2. PCB Layout (18 checks)" and "3. Enclosure (13 checks)" headings only, §8 did not cross, §9 open items. States that the S1 documents' "carrier" is h7-pedal.
- docs/h7-platform/schematic-checklist.md (262 lines). Every circuit item under its original id, tagged with its split board per split spec §9.3, linked to the topic section that carries it where one does; pin-level wiring no topic doc carries is stated; MPNs only the checklist specifies are marked "v1 contained" under a stated rule ("what v1 contained, which is all it is"). 19 *Not in force:* lines, each citing the split source (§6.2, §7.2, §7.3, §7.5, §9.3, §9.4, D4/D13 withdrawn, D20, D22, D23, D24, R-13, R-17, R-19, R-22, R-57, O-17, O-18). §8 points the OWN items to decisions.md; §9 lists the dropped ids with reasons; §10 did not cross.
- docs/h7-platform/bring-up.md (151 lines). §1 the three markings, labelled as this document's reading; §2 the §12.4 order as amended (step 0 withdrawn by O-16 on a Not-in-force line; Seed benches at 9 V via EC-SEED-BENCH, no 18 V test with a Seed); §3 BU-01..BU-29, one line each beginning "- **BU-NN** · *marking* ·", with board, current meaning, figure links and the open-items row each closes; 9 *Not in force:* lines (BU-08, -09 x2, -12, -16, -18, -20, -22, -24, -25, -28) for the §9.3 rework and the withdrawn v1 wording; §4 the eleven §9.3 additions (no ids invented), each marked; §5 BL-1..BL-4 linked to firmware-facing-requirements.md §3.1; §6 first-build checks from the layout carry-forward.
- verify.sh: check_bringup + dispatcher entry + ALL_CHECKS entry.
- open-items.md: 10 rows added, 5 rows extended, 1 conflict entry, the Ported-from parentheticals for LAYOUT-CARRYFORWARD and SCHEMATIC-CHECKLIST widened. (The commit body says "Rows extended: 6"; the correct figure is 5; the sixth edit was the Ported-from line, not a row.)

Markings applied (BU)
- passed paper analysis: BU-01 (FIG-HEADROOM), BU-08 (R-PF-1..11 on paper), BU-16 (FIG-CODEC-RST margin), BU-25 (power.md §4.5), BU-28 (FIG-TRIP), BU-29 (two contacts' data-sheet maximum).
- deferred measurement: BU-02, -03, -04, -05, -06, -07, -14, -17, -19, -22, -23, -26, -27.
- original requirement: BU-09, -10, -11, -12, -13, -15, -18, -20, -21, -24.
- BL-1..BL-4 all original requirement.

RED and GREEN
- RED 1 (no file): `FAIL bringup: [missing docs/h7-platform/bring-up.md]`, exit 1.
- RED 2 (temporary malformed bring-up.md, removed afterwards): `FAIL bringup: [BU-03 line carries 0 markings, expected exactly 1] [BU-07: 2 lines beginning '- **BU-07**', expected 1] [BU-29 line carries 2 markings, expected exactly 1] [no line beginning '- **BL-3**']`, exit 1.
- GREEN: `verify.sh bringup openitems effective provenance nocode decisions parts` -> all PASS, exit 0.
- Also checked by script: every intra-doc link and anchor in the three new files and open-items.md resolves; every open-items id the new documents name exists; 0 control bytes; no "better/best/good/clean/readable/legible" in the three new files.

Open-passage count per source section vs rows
- SCHEMATIC-CHECKLIST.md §11 "Not verified here": 5 bullets -> 3 new rows + 2 extensions. Bullet 1 (USB-03, USB 2.0 not opened) and the first half of bullet 3 (USB-04 C_VBUS vs the USB 2.0 capacitance limit) -> USB2-SPEC-UNREAD (merged: one reading of the USB 2.0 spec settles both). Bullet 2 (Arm/CoreSight DDI0314H) -> SWD-PINOUT-FORMAL-SPEC. Bullet 3's second half (USBLC6-2 Rev 5, later revision not compared) -> DATASHEET-REVISIONS-RECHECK (extended: it already named the USBLC6-2 Rev 5 gap; source citation added). Bullet 4 (parametrics distributor-only) -> CHECKLIST-PARTS-PARAMETRICS. Bullet 5 (6–7 ps/mm) -> SDRAM-LAYOUT-TIMING (extended).
- SCHEMATIC-CHECKLIST.md inline: CORE-04 "the catalogue gives no guaranteed figure" -> CHECKLIST-PARTS-PARAMETRICS; ALL-09 note "Not ticked; the item stays open" -> ENCLOSURE-FIRST-BUILD (extended, chassis continuity); OWN-05's pointer to OWNER-DEFAULTS.md UNVERIFIED checks -> no new row (that file was ported by Tasks 8/9; schematic-checklist.md §8 says so); USB-06 "PDF metadata 2011, unverified" is bullet 2.
- LAYOUT-CARRYFORWARD.md: 0 by the keyword rule (its "carry"/"carries" hits are the title, "carries both … footprints", "does not carry over", "carries 1.03 A"). 9 open by meaning -> "Still owed" plug fit: DC-JACK-FIT (new); G-L3 no diff-pair rule: USB-DIFF-PAIR-RULE (new); G-L5 tented/filled: LAYOUT-FAB-NOTES (new); "Confirm THICKNESS 0.8": USB-DFU-VERTICAL (existing, already names it); "S2 decides" bleeder: VREF-A-BLEEDER-DECISION (existing); enclosure first-build check: ENCLOSURE-FIRST-BUILD (existing); footswitch "First build: confirm": CONTROLS-FIRST-BUILD (existing); VREF_A bring-up gate: VREF-A-BACKFEED-GATE (existing); "ALL-07 sign-off: no owner signature yet": not rowed, Not-in-force line citing split spec §8 (v1 verification results not carried) and decisions.md's record that the ERC exclusion is not carried.
- LAYOUT-CARRYFORWARD.md layout requirements with no row before this task: LAYOUT-NET-CLASSES, MODULE-LAYOUT-RULES, PEDAL-POWER-LAYOUT-RULES, TEST-PAD-SPLIT (new); PEDAL-ANALOG-LAYOUT-RULES (decoupling returns, expression blocking network) and AUDIO-BOARD-MECH-LAYOUT (pot nut, LED spacers) extended.
- Split spec §9, §12, §12.4, BL-1..BL-4: no new open passages. §12.1's three U items are SEED-ONBOARD-LOADS, SEED-PIN38-PIN21-LOAD, SEED-BOOTLOADER-PIN-STATES (Task 3); BL-1's unset sizes are BOOTLOADER-FLASH-MAP (Task 7); §9.2's OWN-07 extension is POWER-PARTS-STOCK; every §12.4 / §9.3 check names its existing row in bring-up.md.
- Totals: 10 rows added, 5 extended, 1 conflict.

Map: open passage -> row naming it (the rows' text was checked to name each)
- USB 2.0 VBUS figure (USB-03) -> USB2-SPEC-UNREAD; USB 2.0 VBUS capacitance (USB-04) -> USB2-SPEC-UNREAD; DDI0314H not retrieved -> SWD-PINOUT-FORMAL-SPEC; USBLC6-2 later revision -> DATASHEET-REVISIONS-RECHECK; distributor parametrics -> CHECKLIST-PARTS-PARAMETRICS; VCAP ESR no guaranteed figure -> CHECKLIST-PARTS-PARAMETRICS; 6–7 ps/mm -> SDRAM-LAYOUT-TIMING; chassis continuity -> ENCLOSURE-FIRST-BUILD; plug fit -> DC-JACK-FIT; diff pair -> USB-DIFF-PAIR-RULE; thermal-via drill and tenting, SWD stencil, BOM fields, order-page notes, BZT52C12-7-F-79, hung boards ordered with header -> LAYOUT-FAB-NOTES; net classes -> LAYOUT-NET-CLASSES; buck hot loop, supervisor sensing, FB_VDDA, crystal (G-L4), thermal via count, SDRAM/QSPI routing -> MODULE-LAYOUT-RULES; two branches apart, D_AIN/D_MIN copper, U_PF placement, U_PRAIL loop -> PEDAL-POWER-LAYOUT-RULES; test pads -> TEST-PAD-SPLIT (+ conflict); op-amp/codec decoupling returns, LM66100 group -> PEDAL-ANALOG-LAYOUT-RULES; pot nut, LED spacers -> AUDIO-BOARD-MECH-LAYOUT.

Conflicts raised
- "### Conflict: the v1 test pads on the split boards": SCHEMATIC-CHECKLIST PWR-16/USB-07 and LAYOUT-CARRYFORWARD's one pogo grid vs split spec §9.3 ("PWR-16 split", "USB-07 split"), §6.1, §7.1 and D15; neither picked; affects test access only; settled by phase 2 (TEST-PAD-SPLIT). This is the one pre-split item whose board is not obvious. The four-layer stack-up was not made a conflict because power.md §10 already restates it for both boards.

Dropped checklist ids (also schematic-checklist.md §9, for Task 12's README)
- CORE-01's annotation clause only (item carried): "U_MCU must be annotated U1" for the pin-map check; designators belong to KiCad here.
- PWR-04: net named exactly VIN_PROT for the BOM check's leaf-net lookup; its copper-separation content is superseded by the split's two branches.
- PWR-13: AbsMaxV field and U+digit annotation for the BOM check's >= 20 V gate; the survival requirement it enforced is power.md §3.7/§8 (PS-18V).
- ALL-01: the BOM check's four-field contract; what the fabricator needs is layout-carry-forward.md §1.
- ALL-02: not-fitted parts still carrying the four fields because the BOM check did not skip them; the not-fitted parts are named in CODEC-06, -09, -10, USB-08.
- ALL-05: the six hierarchical sheets of the generator's layout; drawing here is TOOLING.md's.
- ALL-06: functional-label/annotation rule and the BOM check's ^(U|Q|D)\d regex.
- ALL-07: ERC waivers and the VCAP owner sign-off in v1's verification file; split spec §8 does not carry v1 results; the circuit fact is under CORE-04.
- Also not carried (not ids): §10's coverage table and item count; §9 moved to bring-up.md.

Edits to other tasks' text
- None rewrote a superseded value. Appended (allowed reuse): ENCLOSURE-FIRST-BUILD (item, evidence, source: chassis continuity), SDRAM-LAYOUT-TIMING (item, evidence, source: 6–7 ps/mm), DATASHEET-REVISIONS-RECHECK (source), PEDAL-ANALOG-LAYOUT-RULES (item, source), AUDIO-BOARD-MECH-LAYOUT (item); and the open-items Ported-from parentheticals.

Labels applied (source wording)
- Owner: AN-D1, AN-D2, R-34, PW-TJ, PW-NOTVS, PS-18V, OWN-01, OWN-03, O-9, O-11, O-12, O-13, O-16, O-17, O-18; owner-approved deltas D14, D15, D16, D17, D18, D20, D21, D22, D23, D24 (as decisions.md files them under Owner decisions).
- Controller ruling: OWN-02, OWN-04..07, PW-CHASSIS, AN-RING, RR-11, D2, D4/D13 (withdrawn), D6, D7, D9, R-13, R-14, R-17, R-18, R-19, R-22, R-23, R-27, R-35, R-36, R-57, R-60, R-61, R-62 (on the owner's F-5).
- This document's reading (labelled in place): the BU/BL markings; BU-12's MIDI RX pull-up carried to PB7; VIN_A/VIN_MOD copper apart; no split copper area for D_AIN/D_MIN; the pedal USB-C placement; no socket-tail trim on the carrier; PWR-12's net mapping; USB2-SPEC-UNREAD's "no source restates the split divider's low-VBUS margin".

Anchors other tasks may need
- None new as headings of record; useful targets: layout-carry-forward.md §1–§4; schematic-checklist.md §9 (dropped ids) for Task 12's README; bring-up.md §1 (markings), §3, §4, §5 (BL).

Concerns
1. I published bring-up.md by mistake as a private claude.ai artifact (https://claude.ai/artifact/WSxD9thaJVb6UQYHqdh4Ft) while applying one edit. It was not requested. It is private; I did not delete it because deleting needs the owner's confirmation. The owner may want it deleted.
2. processor-and-memory.md §4 describes OSCAR's VDDA bank (2 × 100 nF + 2 × 2.2 µF) on the module without a Not-in-force line, although R-57 makes it insufficient; it does point to analog.md §9. I did not edit it (borderline, not clearly a superseded value stated as current); schematic-checklist.md CORE-07 carries the Not-in-force line.
3. power.md §7 says whether the split pedal keeps the 0 Ω 5V_A position is "an S2 choice", while analog.md §13.1 joins 5V_A_CODEC "through a 0 Ω, v1's R_5VA" and split spec §9.3 sends PWR-15 to the pedal. schematic-checklist.md PWR-15 cites all three; the two topic documents should be reconciled.
4. The BU markings are a classification this port makes; a reviewer may place BU-01, -16 or -29 differently (passed paper analysis vs deferred measurement).
5. The commit body's "Rows extended: 6" should read 5 (see above).

Fix round 1 (commit 2e685b1, base d52bb56)

Changes
1. bring-up.md BU-01: marking changed to *deferred measurement*. "The headroom it confirms passed on paper" is replaced: the FIG-HEADROOM margin is used up by a DAC or 5V_A only 0.4 % high, well inside the DAC's ±6 % maximum gain error, and the interpolated margin at the real load is negative (analog.md §3 "Limits of the check"); the line still names ANALOG-HEADROOM-9V. Markings are now: passed paper analysis BU-08, -16, -25, -28, -29; deferred measurement BU-01 to -07, -14, -17, -19, -22, -23, -26, -27.
2. processor-and-memory.md (D7 table row; §4 VDDA/VREF+ bullet) and power.md §5.3 decoupling paragraph: R-57's VDDA-WIDEBAND requirement is stated in place. It sets f0 ≤ 158.0 kHz and L_min × C_bank,eff ≥ 1.015 µH·µF. With the BLM21PG221SN1D (L ≥ 0.263 µH) that means C_eff ≥ 3.86 µF, a nominal X7R bank ≥ 10.1 µF, or a bead with more inductance. Each statement links R-57 and EC-VDDA-WIDEBAND. OSCAR's 2 × 100 nF + 2 × 2.2 µF bank now appears only on new *Not in force:* lines, one in each file. Values checked against the S1 ledger R-57 (D-B-1) at 5b926d0, line 375: "2.13 mV rms … f0 ≤ 158.0 kHz … 1.015 µH·µF … C_eff ≥ 3.86 µF, nominal X7R ≥ 10.1 µF".
3. power.md §7: "whether the split pedal keeps the position is an S2 choice" removed. The text now says the pedal keeps R_5VA (split spec §9.3 sends PWR-15 to the pedal unchanged; codec-domain.md §1 "v1's R_5VA, 0 Ω, joins it", checked at the pin; analog.md §13.1). schematic-checklist.md PWR-15's citation simplified to match.
4. BU-29: "The 0.2 Ω limit equals two contacts' data-sheet maximum in series, so the paper check has zero margin."
5. layout-carry-forward.md: both bring-up references (chassis bond and §6 hand checks) now point to §6; the stray "(§6)" in the power-fail supervisor item is removed; the Not-in-force line withdraws only U_PF's placement and says the supervisor-sensing item stays in force (§2); §1 now says the board-file, lifecycle, net-class and USB-pair items binding the carrier is this document's reading; the carrier's net-class sub-item, the three-path 90 Ω rule (which covers the module's DFU socket) and the carrier's USB item §4 are labelled likewise; D_AIN/D_MIN now take power.md §8's "1 cm² cathode pad" rather than saying no split source gives an area.
6. open-items.md: PEDAL-POWER-LAYOUT-RULES now cites power.md §8's 1 cm² pad, in the item and in its evidence; USB-DIFF-PAIR-RULE labels the three-path extension as this port's reading.
7. schematic-checklist.md §9 ALL-05: the source is the original spec's *Repository layout*, and split spec §9.3 reworked the item ("ALL-05 lists each design's sheets"). It is dropped because organising a schematic into sheets is not a circuit requirement. The §9 lead sentence is adjusted to match.
8. bring-up.md §6: adds VREF_A's noise at pin 21 with our module: 0–421 Hz ≤ 1,123 µV rms and wideband ≤ 806 µV rms (R-15, R-57; EC-CONTROL-NOISE-BAND, EC-VDDA-WIDEBAND), naming VREF-A-NOISE-MEASURE. layout-carry-forward.md §6 lists it.
9. The fix commit's body records that d52bb56's "6 rows extended" should be 5.

Concerns 2, 3 and 4 above are resolved by these changes. Concern 1 (the artifact) stands. No artifact was published in this round.

Command
`PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh bringup openitems effective provenance nocode decisions parts power analog firmware`

Output
PASS bringup / PASS openitems / PASS effective / PASS provenance / PASS nocode / PASS decisions / PASS parts / PASS power / PASS analog / PASS firmware; exit 0.
Also: every link and anchor resolves (the link-check script's one hit, "USBLC6-2" read as an id, is a false positive); 0 control bytes in power.md and processor-and-memory.md.
