Task 2b (controller-added, after Tasks 3-8): decisions.md amendment

Why: the topic tasks (3-8) and their reviewers found gaps and inaccuracies in docs/h7-platform/decisions.md (Task 2). The controller ruled that they are fixed in ONE amendment pass, reviewed as its own unit, before Task 9 (parts.md uses decisions.md anchors as "Chosen by").

Requirements (each item verified against the pedals source AT THE PIN before writing; labels follow spec Goal 1 exactly):

A. Missing entries (Goal 1: every live owner decision recorded)
 1. POWER.md §4.4 owner decision "No input TVS" (POWER.md line ~545 at the pin: "Decision (owner, 2026-10-02). No input TVS, provided this analysis keeps the peak at the buck's VIN at or below about 28 V"; repeated §4 line ~452, design-review gap G-S2). Still live: R-59 "Pin-39 parts are rated against 26.3 V; ≤ 28 V holds". Owner decision section, verbatim words, link, Amended by/Narrowed by as applicable, link to power.md's hot-plug derivation (power.md#fig-hotplug / #fig-seed-hotplug — confirm anchors).
 2. Chassis-bond controller ruling (POWER.md §7.2, line ~847: "Decided (2026-10-04, A2 Task 8 controller ruling; best practice, owner may override)").
 3. Ring ±5 V DC limit controller ruling (A2 Task 13; analog.md labels it inline — see analog.md around the ring limit and ANALOG.md:769).
 4. The v1 power-fail shed approval: BYPASS-RELAY.md status line ("approved by the owner on 2026-10-04 and implemented") and split §9.1's Owner decisions table ("Relay bypass (2026-10-04) and the power-fail shed (BR §11 item 2)"), superseded by owner decision O-6. It is currently folded into OWN-01's Not-in-force line. Give it its own entry (owner decision, NOT in force, superseded by O-6) or make the OWN-01 fold explicit with the correct label — whichever keeps "an owner decision is superseded only by a later owner decision" visible.

B. Corrections
 5. R-51: states 40.4 mV as current (decisions.md ~:1061). R-53 restates it to 41.6 mV (vin-mod.md §5). Apply the effective-constraint shape: current 41.6 mV, Amended by R-53; 40.4 mV only on a *Not in force:* line.
 6. PW-TJ (~:350): calls 34.7 °C the "worst case"; in POWER.md:134-136 34.7 °C is the used-peripheral build-up at maximum currents (26.1 °C full 88.8 mA I/O; 20.4 °C every peripheral, 580 mA). Also note that split §9.4 revises the CORE-BRIEF §5b clock tree (SAI1 → SAI2 slave, PLL3 MCLK role ends, USB on OTG_HS with CRS on USB1 SOF); 480 MHz at VOS0 unaffected — link processor-and-memory.md's EC-CLOCK-TREE.
 7. F-4 (~:404): "the Seed3 is out of stock" is research (split §9.2: "single source, out of stock per the research, V"), not an owner-supplied fact. Only "the owner has original Seeds" is his (and decisions.md already notes it is the split spec's sentence). Split the entry accordingly.
 8. O-16 (~:172-174): "Amended by: none" but it is narrowed by R-50 via O-15. Write "Narrowed by: R-50 (controller ruling, via O-15; the owner may override)".
 9. O-18: "the picture he chose from" — layout-B.svg at the pin is a regeneration of candidate-B.svg (pedals commit b0e69c8); every control, LED, jack and relay position is unchanged, title/module outline/socket bodies/hung-board size changed; last regenerated at 753d63e before R-60/R-61/R-62, each of which leaves layout B unchanged. Reword to "the record of layout B, the layout the owner chose" and link mechanical-and-controls.md §4.3.
 10. OWN-02 label note (~:527): add SCHEMATIC-CHECKLIST's "Resolved on best practice, 2026-10-04 (owner may override)" for OWN-02/04/05/06/07 and the first A2 ruling ("Task 1 OWN items are decided by the controller on best practice and reported to the owner with the option to override") as evidence.
 11. D1 ambiguity note (~:574): add the evidence the other way — the owner-approved generator spec (status approved-design, line ~164): "Every difference must be declared as one of CORE-BRIEF D1–D13"; and the A1 ruling "deltas still need owner approval to enter CORE-BRIEF". Keep D1-D13 labelled controller rulings (the label rule) but present the ambiguity in full so the owner can rule.
 12. R-38 (~:963-965): the Not-in-force history skips R-40's R_VDIS 27.0 Ω CRCW1206-HP between "22 Ω 1206" and "10.0 Ω 1206"; the current Miller-ramp soft start (C_SS, D_SS, R_SSR, added by R-40) is not mentioned under Decides/Amended by.
 13. D21: the power-fail supervisor assertion is RR-11's Q-6 ruling (check decisions.md already says so; keep it consistent with processor-and-memory.md).

C. Links to the topic documents (the "bare number does not count as ported" rule)
 14. Every consequence figure decisions.md states bare gets a link to the topic-document section that derives it. Anchors are listed in the implementer reports: W/task-4-report.md (power.md #fig-seed-tj, #fig-seed-hotplug, #fig-pour, #fig-minv, #fig-qmsw-tj, #fig-hotplug, #fig-trip, #fig-en-delay, #ec-seed-bench, #ec-qpen-reset), W/task-5-report.md (analog.md #fig-vref-806, #fig-vref-1123, #fig-vref-band, #fig-vdda-wideband, #ec-control-noise-band, …), W/task-6-report.md, W/task-7-report.md (section "What decisions.md should link"), W/task-8-report.md (F-5 Used by: FIG-JACKS-OVER-LIP, FIG-JACK-HOLE-CROSSCHECK). Verify each anchor exists before linking.
 15. D4, D13, D20-D24: add the Amended-by / links task-7-report.md lists.

Constraints:
- Do not change any label except where an item above says so; a label change needs the source wording quoted in the report.
- Do not edit other documents except to fix a link that this pass breaks.
- `decisions` check in verify.sh must still pass; run `verify.sh` with every check registered so far except stale-json and the not-yet-written ones (decisions, architecture, power, analog, openitems, bypass, firmware, mechanical, effective, provenance, nocode, bytes).
- Commit: subject "h7-platform port: decisions.md amendments from topic-task reviews"; body lists items 1-15 and their disposition.
