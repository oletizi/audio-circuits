Task 2b report: decisions.md amendments from topic-task reviews

Status: DONE_WITH_CONCERNS
Commit: 7c4bf8a "h7-platform port: decisions.md amendments from topic-task reviews" (pushed to feature/digital-pedal-platform)
File changed: docs/h7-platform/decisions.md only (+177 / -31). No other document edited.

Every item was checked against the pedals sources at 5b926d0 (git show 5b926d0:<path>) before it was written. Each brief item was applied; no item turned out wrong at the pin. Smaller corrections to the brief's wording are noted under the item.

ITEMS

1. No input TVS: new owner-decision entry PW-NOTVS (under "## Owner decisions", after PW-TJ).
   Source, POWER.md §4.4 line 545: "**Decision (owner, 2026-10-02).** No input TVS, provided this analysis keeps the peak at the buck's VIN at or below about 28 V (87 % of its 32 V absolute maximum) for an 18 V hot plug."
   Also POWER.md §4 line 452: "**No input TVS is fitted** (owner decision 2026-10-02, design-review gap G-S2)".
   Still live: ledger R-59 "Pin-39 parts are rated against 26.3 V; ≤ 28 V holds". The split spec §5.6.1 requires the re-run.
   The entry records the source sentence. It says his own words are not recorded. It gives Amended by: none (owner); R-59 is the re-run showing the condition holds.
   Derived in: power.md#45-hot-plug-at-the-module-input, #fig-hotplug, #fig-seed-hotplug (all confirmed).
   Not-in-force line: the one-board v1 result (21.9 V grid, 24.8 V corner), because the buck moved onto the module.
   R-59 now cross-links PW-NOTVS.
   Label: owner decision. The source says "Decision (owner, …)".

2. Chassis bond: new controller-ruling entry PW-CHASSIS (under rulings, after OWN-07).
   POWER.md §7.2 line 847: "**Decided (2026-10-04, A2 Task 8 controller ruling; best practice, owner may override):** a ground lug with a star washer under one audio-jack nut, wired to the dedicated GND solder pad …".
   A2 rulings ALL-09: "… — best practice, owner may override".
   SCHEMATIC-CHECKLIST ALL-09: "Resolved on best practice, 2026-10-04 (A2 Task 8 controller ruling; owner may override)".
   Carried in power.md#10-ground-and-return-paths.
   Not-in-force: the bond through the metal jack sleeves (POWER.md's first text).

3. Ring ±5 V DC limit: new controller-ruling entry AN-RING.
   ANALOG.md §8.2 line 769: "**Ring external DC limit: ±5 V** (A2 Task 13 ruling, best practice; owner may override)."
   A2 rulings: "Ruling (EE, decided on best practice per CLAUDE.md, owner may override): the expression ring is specified for passive expression pedals; its external DC limit is restated as ±5 V (not ±12 V; tip keeps ±12 V) …".
   Date: the A2 ruling has no date of its own. It sits between two entries dated 2026-10-04, and the entry says so.
   Derived in: analog.md#101-ring-reference, #fig-vref-load.
   Amended by: none to the limit. R-19 designs the −5 V case within it.
   Not-in-force: ±12 V on the ring; R_REF 1.00 kΩ from VDDA (69 mW at −5 V).

4. v1 power-fail shed approval: the option taken was "make the OWN-01 fold explicit with the correct label", with no new entry.
   Reason: decisions.md's own rule (in "What this document does not carry") is that superseded owner decisions appear only on Not-in-force lines beside the decision that replaced them.
   OWN-01 now has its own Not-in-force line. It names the shed approval as "a second owner decision of 2026-10-04 … superseded by a later owner decision, O-6".
   Source wording:
   - BYPASS-RELAY.md status "approved by the owner on 2026-10-04 and implemented";
   - §11 item 2 "Approve the power-fail shed";
   - split §9.1 row "Relay bypass (2026-10-04) and the power-fail shed (`BR` §11 item 2)": "The approved shed is replaced by §7.4, which the owner directed (O-6)".
   O-6 carries a matching Not-in-force line, because it is the replacing decision.
   OWN-01's Amended-by now reads "none to the relay bypass" (split §9.1 "Relay bypass unchanged"). The old text said the shed was "replaced by the hold-up design O-6 directs" under Amended by. That presented the replacement of an owner decision as an amendment of OWN-01.
   Links: bypass-relay.md#ec-unpowered-bypass, #ec-relay-part (OWN-01); #ec-power-fail-override and §4 (O-6).

5. R-51: now "Current: permittedRippleMvPp 41.6 mV p-p", with Amended by R-53.
   The R-53 quote is from the ledger at line 341: "the contract's `permittedRippleMvPp` 41.6 mV (R-51's rule unchanged: 1.5 × (27.2 + 0.47) mV, rounded up; 40.4 before)".
   vin-mod.md §5 line 178 agrees: "`permittedRippleMvPp` = 41.6 mV".
   40.4 mV appears only on a Not-in-force line.
   The R-53 entry now names this consequence. Derived in: power.md#44-ripple.
   Note: the brief says vin-mod.md §5 restates it. It does, but the restating ruling is R-53, in the ledger's "Consequences, re-recorded".

6. PW-TJ: the "worst case" wording is corrected.
   POWER.md lines 132-136 give the rows at maximum currents:
   - 34.7 °C: used-peripheral build-up, 30 mA estimated I/O;
   - 26.1 °C: the full 88.8 mA I/O;
   - 20.4 °C: every peripheral, 580 mA.
   At VOS1 400 MHz the ambient may reach 57 °C (POWER.md line 158).
   Also found: decisions.md's old wording came from the ledger, R-20: "`POWER.md` §4.2 gives TA ≤ 34.7 °C at 480 MHz VOS0 worst case and ≤ 57 °C at VOS1 400 MHz". The table it cites is in POWER.md's owner-decision section (line 89 onward), not §4.2. §4.2 cites only the 57 °C envelope (line 522). The PW-TJ entry and the R-20 entry both state this.
   Clock tree: split §9.4 "§5b clock tree | Revised: SAI1 → SAI2, both blocks slave; PLL3's MCLK role ends (…); USB on the OTG_HS controller (USB1) using its internal full-speed PHY, with CRS synchronised to USB1 SOF, not USB2" is quoted. 480 MHz at VOS0 is unaffected. Linked: processor-and-memory.md#ec-clock-tree.
   Derived in: power.md#53-mcu-reset-decoupling-and-junction-temperature (it carries 34.7/26.1/20.4 and 57 °C).

7. F-4: split as the brief asks.
   The fact now reads: the owner has original Daisy Seeds.
   It keeps the split spec's sentence and says it is the spec's sentence, not his words.
   A new "Not his fact" bullet quotes split §9.2 "single source, out of stock per the research, V" and §14 R-9 "single source, sold out at the time of the research (V)".
   O-16 gains a "Facts behind it" line saying the same.
   O-9's Amended-by sentence was adjusted so it no longer presents the stock as the owner's fact.

8. O-16: "Amended by: none." is kept (there is no later owner decision). A new line was added: "Narrowed by: R-50 (controller ruling, via O-15; the owner may override)", with the cross-reference explanation moved under it.
   "How to read" now defines the Narrowed-by line.

9. O-18: "The picture he chose from" is replaced by "the record of layout B, the layout the owner chose". The text says it is not the exact file he chose from. Verified in pedals:
   - `git log --follow` of h7-platform/interface-analysis/layouts/layout-B.svg shows b0e69c8 (candidates A, B, C), then 216f324 ("layout B chosen (owner, 2026-10-05: \"I prefer B\")"), then 081ef34, 3bd0f3d, 7e5c136, and 753d63e as the last change.
   - 9693f7d (R-60/R-61) and a705f7f (R-62) are later commits that do not touch it.
   - Ledger quotes, each found: "Layout B's drawing is unchanged" (R-60), "layout B unchanged" (R-61), "The NMJ6HCD2 and layout B stay" (R-62).
   - The list of what changed (title, module outline, socket bodies, hung boards) is taken from mechanical-and-controls.md §4.3, which diffed the two pinned files. I did not re-diff the SVGs.
   Linked: mechanical-and-controls.md#43-the-layout-b-picture.

10. OWN-02 label note: it now quotes two further records.
   - SCHEMATIC-CHECKLIST lines 216-221: OWN-02, 04, 05, 06 and 07 each read "Resolved on best practice, 2026-10-04 (owner may override):"; OWN-03 reads "Resolved by the owner, 2026-10-02:".
   - The first A2 ruling (line 3): "Ruling: per the owner standing preference (defer EE judgement; decide by best practice, report, do not ask), Task 1 OWN items are decided by the controller on best practice and reported to the owner with the option to override".
   The label is unchanged (controller ruling).

11. D1 ambiguity note: rewritten as evidence both ways. The label is unchanged (controller ruling, per the label rule).
   - Against approval: CORE-BRIEF records none for D1-D13. OWNER-DEFAULTS: "The owner approved deltas D14–D19 on 2026-10-04".
   - For approval:
     - generator spec (docs/superpowers/specs/2026-10-03-h7-schematic-generator-design.md) front matter "status: approved-design (rev 3)";
     - line 164: "Every difference must be declared as one of CORE-BRIEF D1–D13";
     - line 34: "about 10 of the 13 CORE-BRIEF deltas";
     - A1 rulings line 22: "deltas still need owner approval to enter CORE-BRIEF".
   - Correction to the brief: it calls the generator spec "owner-approved". The file says "approved-design (rev 3)" and does not say who approved it. The entry states exactly that.
   The generator spec is added to "Ported from" and as link [gen].

12. R-38: the entry now has a "Current" line:
   - Q_MSW AOD4185, R_MSWT 15.0 kΩ, R_MSWB 4.30 kΩ;
   - soft start C_SS 2.2 µF, D_SS BAS116H, R_SSR 15.0 kΩ;
   - R_VDIS 10.0 Ω CRCW201010R0FKEFHP.
   Amended by now names R-40's soft start and R_VDIS, and R-41's re-size and 1206 R_VDIS.
   The Not-in-force lines are:
   - AO3401A with R_MSWT 10.0 kΩ / R_MSWB 12.0 kΩ;
   - R_VDIS 22 Ω 1206 (R-38), then 27.0 Ω CRCW120627R0FKEAHP (R-40), then 10.0 Ω CRCW120610R0FKEAHP 1206 (R-41);
   - the first soft-start sizing, C_SS 1 µF and R_SSR 33.0 kΩ.
   Sources, ledger lines:
   - 66: R-38 "*Amended 2026-10-06 (fix round 1, R-40):* … Q_MSW has a diode-steered Miller-ramp soft start. R_VDIS is 27 Ω pulse-proof (CRCW1206-HP)";
   - 73: R-40 soft start C_SS 1 µF, D_SS BAS116H, R_SSR 33.0 kΩ;
   - 79: "R_VDIS 27.0 Ω pulse-proof 1206 … CRCW120627R0FKEAHP";
   - 105: R-41 "R_MSWT 15.0 kΩ, R_MSWB 4.30 kΩ, R_SSR 15.0 kΩ, C_SS 2.2 µF 50 V X7R 1206";
   - 121: R-41 "R_VDIS becomes 10.0 Ω, Vishay CRCW120610R0FKEAHP";
   - 165: R-42 CRCW201010R0FKEFHP.
   power.md lines 147-148 agree on the current values.
   The field name changed from "Decides" to "Current", as other multi-layer entries use. This is not a label change.

13. D21: decisions.md already attributed the supervisor clause to Q-6. It is now consistent with processor-and-memory.md line 44, "the power-fail supervisor also driving RST is RR-11's Q-6 ruling".
   - "Decides" holds only the owner-approved local reset.
   - Amended by: none (owner). It replaces D4.
   - A new line, "Narrowed by: RR-11 (controller ruling, Q-6; the owner may override)", quotes split §9.4: "Q-6's ruling (§15) adds that the power-fail supervisor also drives RST; the plan step records that in the delta text". The plan step never ran, so the clause is the ruling's.
   - Carried in: analog.md#ec-codec-reset; firmware-facing-requirements.md#4-audio-the-codec-is-master-sai2-is-slave.

14. Bare figures linked: every entry that states a figure from an analysis now has a "Derived in" line. Entries carried into a topic document without a figure of their own have a "Carried in" line. "How to read" defines both.
   Entries given a Derived-in or Carried-in line:
   - O-2, O-4, O-6, O-11, O-12, O-15, O-17, O-18;
   - D1, D4, D8, D13, D17, D20-D24;
   - R-34, R-43, R-56;
   - OWN-01, OWN-02, OWN-03, OWN-04;
   - PS-18V, PW-TJ, PW-NOTVS, AN-D1;
   - F-5 (Used by now includes FIG-JACKS-OVER-LIP and FIG-JACK-HOLE-CROSSCHECK);
   - RR-8, RR-11, PW-CHASSIS, AN-RING;
   - R-5, R-6, R-8 to R-11, R-13 to R-33, R-35 to R-62 (except R-12, which has no figure).
   Each anchor was checked to exist before it was linked. A script computed GitHub-style slugs, with links inside headings stripped (analog.md §13.2/§13.3 headings contain links). It then checked every relative link in decisions.md: 438 links, 0 bad. Links in the other eight docs were re-checked, all 0 bad.
   Each figure was located in the linked section by a search script. Notes:
   - R-9: decisions.md's 75.3/110.3 ns are the ledger's figures; analog.md FIG-SAI-MARGINS gives 75.28/110.28; the entry says so.
   - R-32: power.md §7 rounds the ledger's 74.1/64.1 °C to 74/64 °C; the entry says so.
   - R-43: the derivation is the "Supply rating" paragraph that power.md places under its FIG-EN-DELAY heading; the link says so.
   Correction found while linking (beyond the brief, inside item 14's purpose): R-8 stated "control-button-pullup (1.92 mA declared)" as current. Ledger R-23 (line 35) declares the pin-38 loads at worst case: "button pull-ups 1.94 (spec §5.6.2's 0.70 and 1.92 are nominal)". power.md §5.4's table has 1.94. R-8 now states 1.94 mA, Amended by R-23 with that quote, and 1.92 mA is on a Not-in-force line.

15. D4, D13, D20-D24 links per task-7 report "What decisions.md should link":
   - D4 -> processor-and-memory.md#how-the-core-brief-is-carried (the delta table), firmware-facing-requirements.md#ec-sai2-slave, analog.md#ec-codec-reset;
   - D13 and D23 -> processor-and-memory.md#ec-sdram-control-pins;
   - D20 -> firmware-facing-requirements.md#ec-sai2-slave (plus EC-CLOCK-TREE, analog §13.1);
   - D21 -> analog.md#ec-codec-reset, firmware §4;
   - D22 -> analog.md#133-vdd-regulator-and-the-power-down-clamp-r-30 (plus power §7);
   - D24 -> power.md#41-the-modules-enuvlo-divider.
   The rest of that list was applied too:
   - PW-TJ -> EC-CLOCK-TREE;
   - D1 and O-4 -> EC-SDRAM-CLASS;
   - D8 -> FIG-HSE-GM;
   - O-11 and R-60 -> firmware §3.1 and processor §8, and R-60 to open item USB-DFU-VERTICAL (open-items.md; the row has no anchor, so the file is linked);
   - RR-11 Q-7 -> firmware §3.1;
   - R-9 -> EC-SAI2-SLAVE;
   - R-14 -> EC-USB-OTG-HS.
   Task 7 listed no new Amended-by entries for these deltas except PW-TJ's (item 6). The "Amended by" lines of D4, D13 and D20-D24 are unchanged, except D21 (item 13).

OTHER EDITS
- "Ported from" now lists the A2 rulings' two live controller rulings and the Task-1 ruling, the A1 gate-8 ruling, the generator spec, POWER.md §4/§4.4/§7.2, ANALOG.md §8.2, BYPASS-RELAY §11 item 2, and SCHEMATIC-CHECKLIST OWN-02..07.
- The Anchors table has new rows (see below), and the note says PW-NOTVS, PW-CHASSIS and AN-RING are this document's names.
- "What this document does not carry" now excepts the A2 rulings carried here. It notes that the A1 ruling is quoted as evidence under D1.
- Link definition added: [gen].

NEW ANCHORS
- decisions.md#pw-notvs: owner decision, no input TVS (under "## Owner decisions").
- decisions.md#pw-chassis: controller ruling, chassis bond (under "## Controller rulings").
- decisions.md#an-ring: controller ruling, expression ring ±5 V (under "## Controller rulings").
No anchor was renamed or removed. Every existing anchor still resolves.

BRIEF ITEMS NOT APPLIED
None. Two of the brief's readings were refined rather than taken as written:
- Item 11's "owner-approved generator spec": the source says only "approved-design (rev 3)", with no approver named.
- Item 4: the fold was chosen over a new entry, for the reason given.

LABELS
No existing label changed. The new entries' labels and their source wording:
- PW-NOTVS (owner decision): "Decision (owner, 2026-10-02)".
- PW-CHASSIS (controller ruling): "A2 Task 8 controller ruling; best practice, owner may override".
- AN-RING (controller ruling): "A2 Task 13 ruling, best practice; owner may override".
- Two entries gained a "Narrowed by" line. Neither label changed:
  - O-16 is still an owner decision; R-50 narrows it.
  - D21 is still owner-approved; RR-11 narrows it.

CHECKS
- Quotations: a script extracted all 129 double-quoted strings in decisions.md. It searched each, whitespace- and markup-normalised and split at "…", in the twelve pinned source files. 127 were found. The 2 not found are both "How amendments resolve", the port spec's section name, as in Task 2.
- 0 NUL, 0 CR bytes in decisions.md.
- "9–12 V" and "179 Hz" appear only on *Not in force:* lines.
- No forbidden drawing word is used about a drawing. "best" appears only in "best practice", quoting sources.

VERIFY OUTPUT
Command: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh decisions architecture power analog openitems bypass firmware mechanical effective provenance nocode bytes
PASS decisions
PASS architecture
PASS power
PASS analog
PASS openitems
PASS bypass
PASS firmware
PASS mechanical
PASS effective
PASS provenance
PASS nocode
PASS bytes
exit=0

CONCERNS
1. power.md line 293 is now false. It says the no-TVS owner decision "is not yet an entry in [decisions.md](decisions.md); this paragraph and POWER.md §4.4 are its record here". It is now PW-NOTVS. The brief allows editing other documents only to fix a link this pass breaks, so I left it. It needs a one-line fix: link decisions.md#pw-notvs.
2. R-20 as written in the ledger misdescribes POWER.md: it calls 34.7 °C "worst case" and cites §4.2. decisions.md now says so in PW-TJ and R-20, but R-20's ruling text is the source and is quoted as it stands. No topic document relies on 34.7 °C as the envelope; the rulings compare against 57 °C.
3. Item 9's list of what changed between candidate-B.svg and layout-B.svg relies on Task 8's diff, which I did not repeat. The commit history was verified.
4. The analog.md §9.3 anchor contains "µ" (93-maximum-external-capacitance-4-µf-a-decision). I expect GitHub's slugger to keep it as a letter. If it does not, the R-18 link and analog.md's own links to it break together.

FIX ROUND 1 (commit 8b2bf27, pushed)

Files: docs/h7-platform/decisions.md, power.md, analog.md, open-items.md.

1. power.md §4.5 (was :293): the stale sentence ("It is not yet an entry in decisions.md; this paragraph and POWER.md §4.4 are its record here") now reads "Its entry is [PW-NOTVS](decisions.md#pw-notvs); [POWER.md §4.4][pw] is its source." This closes the round-0 concern 1.

2. The uniform Narrowed-by form is applied to every owner-decision entry. On an owner decision, Amended by now lists only later owner decisions, plus the owner-approved split spec's §9 dispositions, which were already there. Each controller ruling moved to a "Narrowed by:" line tagged "(controller ruling; the owner may override)". Entries changed:
   - O-1: RR-4.
   - O-2: RR-6, RR-11, R-29, R-9. Amended by now says "none (no later owner decision); D20 (owner-approved) implements it".
   - O-4: RR-1, RR-3, R-60. O-11 stays under Amended by.
   - O-5: RR-3, R-25. O-17 and O-18 stay.
   - O-6: R-33 to R-45 and R-58. R-34 and R-43 (owner) stay under Amended by.
   - O-8: R-5.
   - O-10: RR-10. O-16 stays.
   - O-11: RR-11 (Q-7), R-14, R-60.
   - O-12: RR-8, R-61. O-17 stays.
   - O-17: R-62 (tagged "controller ruling on the owner's measurements F-5; the owner may override"), R-55, R-60, R-61. O-18 and R-56 (owner) stay.
   - O-18: R-54, R-61, R-55, R-8.
   - D17: R-57.
   - D19: RR-1 ("keeps it within VREF_A's contract").
   - D20: R-29. D22: R-30. D24: R-47.
   - R-34: R-40. "Supersedes R-33 in effect" stays as a statement of R-34's own effect.
   - R-43: the controller's 2026-10-06 restatement (D-D-2) and R-50's withdrawal of a figure.
   - PS-18V: O-15 (no 18 V survival on a Seed bench), R-32 (with R-20), R-41.
   - PW-TJ: OWN-06. The split spec §9.1/§9.4 text stays.
   - PW-NOTVS: R-59.
   Already in this form from round 0: O-16 (R-50 via O-15) and D21 (RR-11 Q-6).
   Unchanged, because no ruling was listed: O-3, O-7, O-9, O-13, O-14, D14, D15, D16, D18, D23, R-56, OWN-01, OWN-03, AN-D1, AN-D2.
   Controller-ruling entries' own Amended-by lines were not touched.
   Check: a script listed every decisions.md link inside an "Amended by" line in the owner section. The only non-owner targets left are D4 (D21 "It replaces D4"), D13 (D23 "replaces D13") and R-33 (R-34 supersedes it). Each is the owner decision's own effect, not an amendment of it.

3. D1: the A1 rulings :22 clause is now quoted whole: "Ruling: A2 pre-flight (a)2 — gate 8 accepts any delta that CORE-BRIEF.md §4 declares with owner approval; D14–D18 were approved 2026-10-04 — the spec's "D1–D13" predates owner-approved later deltas — cost if wrong: none, because deltas still need owner approval to enter CORE-BRIEF." Both readings are stated: the "still need owner approval" rule, and the "predates owner-approved later deltas" contrast, which suggests D1–D13 had no such approval. The label is unchanged.

4. Shed Not-in-force line: the full record now sits only beside O-6, the replacing decision. It has the BR status line, §11 item 2 and the split §9.1 row, quoted. OWN-01 keeps a one-line pointer: "The owner's 2026-10-04 approval of the power-fail shed, carried in the same note as this decision, is superseded by O-6, and recorded there."

5. R-8: "Decides" keeps the ruling as made. A new "Current:" line reads: `control-button-pullup` declared at 1.94 mA (1 % worst case at 3.513 V); spares SPARE1–SPARE5 on pins 1, 2, 3, 7, 10; pin 11 USB_EN_N. Amended by and the 1.92 mA Not-in-force line are unchanged.

6. Topic-doc links to the new entries:
   - open-items.md HOT-PLUG-PEAK (:56): "the owner's ≤ 28 V no-TVS criterion, [PW-NOTVS](decisions.md#pw-notvs)". The cell count is unchanged.
   - analog.md §10.1 (:331): "… a controller ruling, [AN-RING](decisions.md#an-ring)".
   - power.md §10 (:531): "Chassis bond ([PW-CHASSIS](decisions.md#pw-chassis); `POWER.md` §7.2: …)".

7. F-3: a "Derived in: mechanical-and-controls.md §5.1 (#51-the-actuator)" line was added. The anchor was verified. §5.1 line 312 states "the two agree within 0.5 everywhere" and follows it with the dimension table.

Checks:
- Anchor-link check: decisions.md 440 links, 0 bad; power.md 155, analog.md 109, open-items.md 76, all 0 bad.
- Quotations: 131 found, 2 not found (both the port spec's section name "How amendments resolve", as before).
- 0 NUL and 0 CR bytes in all four files.

Command: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh decisions architecture power analog openitems bypass firmware mechanical effective provenance nocode bytes
PASS decisions
PASS architecture
PASS power
PASS analog
PASS openitems
PASS bypass
PASS firmware
PASS mechanical
PASS effective
PASS provenance
PASS nocode
PASS bytes
exit=0

Remaining concerns: round-0 concerns 2 to 4 stand; concern 1 is fixed.
