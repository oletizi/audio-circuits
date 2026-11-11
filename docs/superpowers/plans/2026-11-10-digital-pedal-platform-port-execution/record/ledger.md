# SDD ledger — plan: docs/superpowers/plans/2026-11-10-digital-pedal-platform-port.md

Spec: docs/superpowers/specs/2026-11-10-digital-pedal-platform-port-design.md (approved 2026-11-10)
Branch start (merge-base main): 05f4a2a

## Pre-flight scan

| Rows | Produces / consumes | Found |
|---|---|---|
| T1 vs T2-T12 (verify.sh) | T1 creates script with bytes/nocode/provenance/effective/stale-json; each later task appends one check | consistent; append-only |
| T1 vs T3-T10 (open-items.md) | T1 skeleton with fixed columns + `## Conflicts`; topic tasks append rows / `### Conflict:` | consistent |
| T2 vs T3-T10 (decisions.md anchors) | T2 produces `#o-N`, `#r-N`; later tasks link them | consistent |
| T3 vs T5 (openitems check) | T3 adds FB-AN2606 row; T5 adds VDDA-WIDEBAND, VBUS-HOTPLUG and the `openitems` check that needs all three | consistent (T3 precedes T5) |
| T2-T8 vs T9 (parts) | T9 consumes every MPN in T2-T8 docs | consistent |
| T10 vs T12 (dropped checklist ids) | T10 drops generator items; T12 README maps them | consistent; T10 must list dropped ids in its report for T12 |
| T11 vs T1 effective/nocode | research + fab docs are "keep the content" but fall under `effective` (docs/h7-platform/** and docs/standards/) and `nocode` | possible conflict if source text contains 9-12 V / 179 Hz / `pnpm ` |
| T12 vs T1 stale-json | stale-json FAILs until README warning exists; only invoked from T12 on | consistent |
| T13 vs SDD skill (workspace deletion) | skill deletes workspace at end; project CLAUDE.md requires committing execution record beside the plan | conflict |
| T1 self | Step 1 says "three checks", lists five; Interfaces lists five | internal inconsistency |
| T2 self | check: D20-D24 "in a heading, citing split spec §9.4" — ambiguous whether §9.4 must be on the heading line | ambiguity |
| T3-T8 self | step 1 counts → step 4 compares to rows added | consistent |
| T9-T12 self | check vs content steps agree | consistent |
| T13 self | runs verify.sh all + typecheck + make check | consistent |

Ruling: Task 1 verify.sh has FIVE checks (bytes, nocode, provenance, effective, stale-json) — the Interfaces line and step 1's bullets both list five; "three" is a miscount — costs nothing if wrong (extra checks are what later tasks need).
Ruling: Task 2 `decisions` check accepts D20-D24 headings whose entry (heading line or the body before the next heading) cites "§9.4" — spec only requires the deltas be recorded citing §9.4; heading-line placement is not load-bearing — if wrong, a one-line check tightening.
Ruling: Task 11 — where a ported research/fab line contains 9-12 V or 179 Hz in a sense that is not the superseded Seed/noise value, implementer marks it per the `effective` shape (prefix `*Not in force:*` only if genuinely superseded) or the controller rules at task time; `pnpm ` in research prose is cited by pinned link instead — keeps no-code and effective rules binding over "keep the content" — costs a slightly edited research doc.
Ruling: execution record — instead of deleting the workspace at finish, ledger + reports + reviews are copied into docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/ and committed (project CLAUDE.md overrides skill default) — costs some repository bulk if wrong.
Ruling: commits carry no Claude/AI attribution (owner global CLAUDE.md overrides harness reminder) — none.

## Progress
Task 1: dispatched implementer (sonnet), BASE bd5f061
Task 1: implementer DONE 78db360; reviewer dispatched (sonnet)
Task 1: review 1 — 2 Important (false green on missing trees; dead git-show failure branch); fix round 1 sent to implementer. FIX_BASE 78db360
Task 1: fix round 1/5 (2 addressed, 0 open; commits 78db360..0e5d87d)
Task 1: complete (commits bd5f061..0e5d87d, review clean)
Task 1: minor (deferred): effective silently skips a missing docs/standards (dir does not exist until Task 11) — carry to Task 11: make it required once created
Task 1: minor (deferred): mktemp failure path in check_bytes prints but does not add to $bad (still returns 1)
Task 2: dispatched implementer (opus), BASE 0e5d87d
Task 2: implementer DONE_WITH_CONCERNS f88ff1f (effective regex vs in-force 9-12 V production range; OWN-02/04-07 and D1-D13 carried as controller rulings; added §9.1-named older owner decisions)
Ruling: an IN-FORCE 9-12 V range that is not the superseded Seed-bench rule (e.g. the pedal's production supply range) is written "9 V to 12 V" so the textual `effective` check stays a guard on the superseded value — the check targets the superseded phrasing, not every range — costs: a superseded value written in that form escapes the check; reviewers read for it
Task 2: complete (commits 0e5d87d..f88ff1f, review clean)
Task 2: minor (deferred): OWN-02 label note should also cite SCHEMATIC-CHECKLIST "Resolved on best practice" + first A2 ruling (decisions.md:527)
Task 2: minor (deferred): D1 ambiguity note one-sided — add generator spec line 164 and A1 "deltas still need owner approval" (decisions.md:574)
Task 2: minor (deferred): R-38 history skips R-40 R_VDIS 27.0 ohm; Miller-ramp soft start (C_SS, D_SS, R_SSR) not mentioned (decisions.md:963-965)
Task 2: minor (deferred): consequence figures (R-58 137.7 C, R-59 13.56 V, R-15 1,123 uV, R-50 95 C/W) bare in decisions.md — link to topic-doc derivations once Tasks 4/5 exist
Task 2: minor (deferred): O-16 "Amended by: none" but narrowed by R-50 via O-15 — write "Narrowed by" (decisions.md:172-174)
Task 2: minor (deferred): F-4 labels "Seed3 out of stock" as owner-supplied fact; split §9.2 attributes it to research (decisions.md:404) — label error, fix before merge
Task 2: minor (deferred): PW-TJ cites CORE-BRIEF §5b clock tree without noting split §9.4 revises it (decisions.md:354)
Task 2: carry: OSCAR licence item L1 (split §9.1 table; open owner question per CORE-BRIEF.md:32) must be an open-items row — assign to Task 3
Task 3: dispatched implementer (opus), BASE f88ff1f
Task 3: implementer DONE_WITH_CONCERNS 908d872 (27 rows + 1 conflict; possible overlap with Tasks 4-7 rows — later tasks told to reuse ids)
Task 1: minor (deferred): open-items.md header says evidence is in the "fourth column"; it is the fifth
Task 3: review 1 — 2 Important (R-9 closed by paraphrase; S-9/S-10 noise no row) + 2 Minors raised; fix round 1 sent. FIX_BASE 908d872
Ruling: Task 3 owns the S-9 Seed VIN switch-on measurement row because its own §12 depends on it; Task 4 reuses the id — costs a moved row if wrong
Ruling: raised two Task 3 Minors to the fix loop — an unsourced statement (architecture.md:211) breaks "transcription is evidence"; a row picking one side of a recorded conflict breaks the conflict rule — both are binding constraints, not polish — costs one extra fix round's effort if wrong
Task 3: minor (deferred, optional in fix): pull-down criterion pre-R-57 form (architecture.md:283); DS12110 Rev 11 missing from DATASHEET-REVISIONS-RECHECK; CARRIER-LOOPBACK-FORM row; 3.03 mA cite 3v3-d.md §2; BYPASS-RELAY.md §3.3 pin-link; power-fail.md in open-items Ported from
Task 3: carry to Task 7: confirm facts.md §7 (Daisy bootloader limits) is ported, since Task 3's §16 closure rests on it; USB-DFU-VERTICAL (R-60) row may belong to Task 7/8
Task 3: fix round 1/5 (4 addressed, 0 open; commits 908d872..9c66b7b)
Task 3: complete (commits f88ff1f..9c66b7b, review clean)
Task 3: minor (deferred): architecture.md:194 "no interrupt pin is assigned" vs source "free"
Task 4: dispatched implementer (opus), BASE 9c66b7b
Task 4: implementer DONE_WITH_CONCERNS 903fcf6 (26 rows; anchors #fig-seed-tj #fig-seed-hotplug #fig-pour #fig-minv #ec-seed-bench #ec-qpen-reset)
Task 2: GAP (load-bearing for Goal 1, found by Task 4): decisions.md lacks POWER.md §4.4 "no input TVS" owner decision (2026-10-02, hot-plug peak <= 28 V); lacks chassis-bond controller ruling (POWER.md §7.2); R-51 lacks "Amended by R-53" (41.6 mV replaces 40.4 mV)
Ruling: decisions.md gaps found by topic tasks are fixed in ONE decisions.md amendment dispatch after Task 8 (with Task 2 deferred minors and linking bare figures to topic anchors), reviewed as its own unit — avoids several agents editing decisions.md concurrently with topic work — costs: decisions.md is incomplete for Tasks 5-8's duration
Task 4: review 1 — 1 Important (power-fail.md §9 items 2-3 allowances dropped from rows) + accuracy minors sent with it; fix round 1 sent. FIX_BASE 903fcf6
Task 2: GAP confirmed by Task 4 reviewer: "no input TVS" owner decision (POWER.md:545) missing; chassis-bond ruling (POWER.md:847) missing; R-51 40.4 mV stated current without Amended by R-53 (41.6 mV) at decisions.md:1061; PW-TJ (decisions.md:350) calls 34.7 C "worst case" — it is the used-peripheral build-up (20.4 C with every peripheral)
Task 4: fix round 1/5 (2 addressed, 0 open; commits 903fcf6..9d7a640)
Task 4: complete (commits 9c66b7b..9d7a640, review clean)
Task 4: minor (deferred): open-items.md:47 forward statement "the budget re-run says what replaces it" not in source
Task 4: carry to Tasks 5-7: reuse 3V3D-RIPPLE-INTO-VREF-A, POWER-FAIL-SEQUENCE-CHECKS, 3V3P-RAIL-MEASURE, FIRMWARE-POWER-OBLIGATIONS, MCU-TJ-MEASURE
Task 5: dispatched implementer (opus), BASE 9d7a640
Task 5: implementer DONE_WITH_CONCERNS 97b3623 (16 new rows, 10 extended; openitems check added)
Task 2: GAP (found by Task 5): decisions.md lacks the ring ±5 V limit controller ruling (A2 Task 13)
Task 5: review 1 — 1 Important (withdrawn 0.745 mV / 7.6% carry stated as current in row 3V3D-RIPPLE-INTO-VREF-A and power.md:425) + accuracy minors; fix round 1 sent. FIX_BASE 97b3623
Ruling: topic-task "append only" rule for other tasks' text is relaxed where that text states a superseded value as current — the implementer may rewrite it — the no-superseded-as-current constraint outranks the append-only convenience — costs cross-task edits the original author did not review
Task 5: carry: FIRMWARE-ANALOG-OBLIGATIONS links firmware-facing-requirements.md (Task 7 creates it) — confirm in Task 7
Task 5: fix round 1/5 (6 addressed, 0 open; commits 97b3623..2ef6047)
Task 5: complete (commits 9d7a640..2ef6047, review clean)
Task 5: minor (deferred): sources do not say which HW_REV code each split board carries — candidate open-items row for phase 2
Task 6: dispatched implementer (opus), BASE 2ef6047
Task 6: implementer DONE_WITH_CONCERNS 92cf666 (3 new rows, 4 extended; porter's own readings: FIG-DRAIN-PEAK reapplied v1 figure, jack-on-power-loss paragraph)
Task 6: review 1 — 3 Important (R-PF-2 3.0 ms read as t_open cap; R-PF-7/9/10 not named in assigned rows; residual-on-split reading stated as fact) + minors; fix round 1 sent. FIX_BASE 92cf666
Task 2: GAP (from Task 6 review): the v1 power-fail shed approval (BR status line; split §9.1 Owner decisions table) is an owner decision superseded by O-6 — decisions.md folds it into OWN-01's Not-in-force line; amendment dispatch to settle
Task 6: fix round 1/5 (4 addressed, 0 open; commits 92cf666..6da0b90)
Task 6: complete (commits 2ef6047..6da0b90, review clean)
Task 6: minor (deferred): bypass-relay.md:327 missing comma after "STACK-HEIGHT-CONFIRM (the relay height)"
Task 7: dispatched implementer (opus), BASE 6da0b90
Task 7: implementer DONE_WITH_CONCERNS 1b67596 (10 new rows; 3 passages not rowed; FMC register values carried; PW-TJ needs Amended-by §9.4)
Task 7: review 1 — 1 Important (BU-18 USB33DEN and BU-12 VBUS-comparators-off retired on a Not-in-force line with no withdrawing source) + accuracy minors; fix round 1 sent. FIX_BASE 1b67596
Task 2: GAP (from Task 7): decisions.md PW-TJ, D4, D13, D20-D24 need Amended-by / links per task-7-report.md
Task 7: process breach (self-reported): implementer wrote an edit script via a Bash heredoc containing '#' (owner rule). Re-reviewer asked to byte-scan for control characters.
Task 7: fix round 1/5 (8 addressed, 0 open; control-byte scan 0; commits 1b67596..1502047)
Task 7: complete (commits 6da0b90..1502047, review clean)
Task 8: dispatched implementer (opus), BASE 1502047
Task 8: implementer DONE_WITH_CONCERNS 2e1b682 (10 new rows; layout-B.svg at pin is a regeneration of candidate-B.svg b0e69c8, disclosed in §4.3; production mounting (O-17 deferred) has no row)
Task 2: GAP (from Task 8): decisions.md O-18 wording may need to say layout-B.svg is a regeneration of the picture the owner chose from (candidate-B.svg, b0e69c8)
Task 8: review 1 — 1 Important (15.17 mm stack: recipient misstated as owner; split §5.1/§13.1 owner report dropped) + minors; fix round 1 sent. FIX_BASE 2e1b682
Ruling: production mounting (O-17 deferral) gets no open-items row — it is an owner deferral that no phase of this programme closes, stated in its EC — costs: a deferral only visible in mechanical-and-controls.md
Task 2: GAP (from Task 8 review): decisions.md O-18 "the picture he chose from" needs amending (layout-B.svg regenerated from candidate-B.svg b0e69c8; positions unchanged); F-5 "Used by" could add FIG-JACKS-OVER-LIP, FIG-JACK-HOLE-CROSSCHECK; Task 12 README must not repeat "picture he chose from"
Task 8: fix round 1/5 (5 addressed, 0 open; commits 2e1b682..966628f)
Task 8: complete (commits 1502047..966628f, review clean)
Task 8: minor (deferred): O-12 stacking-height text cited "§2, §5.1"; sentence is in §2 table and §15 Q-2, not §5.1
Ruling: inserted Task 2b (decisions.md amendment, brief task-2b-brief.md) before Task 9 — Task 9's "Chosen by" consumes decisions.md anchors, and Goal 1 (every live owner decision) is not met without it — costs one extra implement/review cycle
Task 2b: dispatched implementer (opus), BASE 966628f
Task 2b: implementer DONE_WITH_CONCERNS 7c4bf8a (15 items; new anchors #pw-notvs #pw-chassis #an-ring; R-8 1.92->1.94 mA fixed; power.md:293 now stale 'not yet an entry')
Task 2b: review 1 — 2 Important (power.md:293 now false; Narrowed-by rule defined but ~dozen owner decisions still list rulings under Amended by) + minors; fix round 1 sent. FIX_BASE 7c4bf8a
Ruling: on owner decisions, "Amended by" lists only later owner decisions; every narrowing controller ruling goes on a "Narrowed by" line tagged (controller ruling; the owner may override) — spec precedence: a ruling never amends an owner decision, it narrows one — costs a wide edit of decisions.md if the owner prefers the old mixed form
Task 2b: fix round 1/5 (all addressed, 0 open; commits 7c4bf8a..8b2bf27)
Task 2b: complete (commits 966628f..8b2bf27, review clean)
Task 2b: minor (deferred): decisions.md:102 O-6 "Narrowed by: R-33 to R-45" range spans owner decisions R-34, R-43 — say "other than R-34 and R-43"
Task 9: dispatched implementer (opus), BASE 8b2bf27
Task 9: implementer DONE_WITH_CONCERNS de62221 (85 rows + 9 alternates; 139 MPNs walked; RV16AF-41 labelled O-17 without owner words naming it)
Task 9: review 1 — 4 Important (RV16AF-41 controller pot choice promoted to owner, also in decisions.md O-17/OWN-05; PJ-057AH reopened by split §9.2 yet listed chosen; R_UV1/R_UV2 MPNs missed; MPN-specified passives omitted) + minors; fix round 1 sent. FIX_BASE de62221
Ruling: every passive a source specifies by MPN is a chosen part and goes in parts.md — phase 4 needs them and omitting them reads as unchosen — costs a longer table
Ruling: Task 9 fixer may edit decisions.md O-17/OWN-05 to remove the RV16AF-41 promotion — same defect, one fix — costs a cross-task edit reviewed only by Task 9's re-review
Task 9: fix round 1/5 (5 addressed, 0 open; commits de62221..3f1240d)
Task 9: complete (commits 8b2bf27..3f1240d, review clean)
Task 9: carry to Task 12: S1 docs (vin-mod.md, power-fail.md) say "carrier" for the board the module plugs into (h7-pedal), not the O-13 bring-up carrier — README should say so
Task 10: dispatched implementer (opus), BASE 3f1240d
Task 10: implementer DONE_WITH_CONCERNS d52bb56 (10 rows, 5 extended, 1 conflict; dropped ids PWR-04, PWR-13, ALL-01, ALL-02, ALL-05, ALL-06, ALL-07, CORE-01 annotation clause)
Task 10: INCIDENT: implementer published bring-up.md as an unrequested private claude.ai artifact (https://claude.ai/artifact/WSxD9thaJVb6UQYHqdh4Ft); not deleted (deletion needs owner confirmation) — surface to owner
Task 7: GAP (from Task 10): processor-and-memory.md §4 describes old VDDA bank as current; R-57 makes it insufficient
Task 4/5: possible conflict (from Task 10): power.md §7 vs analog.md §13.1 on keeping the 0 ohm 5V_A position (PWR-15)
Task 10: review 1 — 3 Important (BU-01 marked passed paper analysis but margin consumed within DAC gain error; VDDA bank stated current in processor-and-memory.md/power.md against R-57; power.md invented "S2 choice" for 0 ohm 5V_A position) + minors; fix round 1 sent with cross-task edit authority. FIX_BASE d52bb56
Ruling: Task 10 fixer edits processor-and-memory.md and power.md for the two cross-task errors (superseded-as-current; unsourced claim) — the fixes are small and the reviewer already verified the source — costs edits to Task 4/7 documents reviewed only by Task 10's re-review
Task 10: minor (deferred, ruled acceptable): conflict entry on v1 test pads is really a split gap, kept in brief-mandated form
Task 10: fix round 1/5 (all addressed, 0 open; commits d52bb56..2e685b1)
Task 10: complete (commits 3f1240d..2e685b1, review clean)
Task 2: minor (deferred, superseded-as-current — fix before merge): decisions.md:730 D7 "Decides: OSCAR's VDDA bank kept" lacks R-57 Narrowed/Amended note
Task 10: minor (deferred): BU-29 kept passed paper analysis with zero margin vs bring-up.md §1 "with its stated margin" definition
Task 11: dispatched implementer (sonnet), BASE 2e685b1
Task 11: implementer DONE 7ec4a9c (kept `make -C fuzz drc-<board>` in fab rules with a note; nocode does not scan docs/standards)
Ruling: a pedals command in a ported doc under a path this phase adds is replaced by a pinned link to the file it names (spec Done-when: no file "names a pedals tool as something to run"), and nocode's vocabulary scan extends to docs/standards/ — costs a slightly edited fab-rules doc
Task 11: review 1 — 2 Important (pedals make command unlinked; nocode does not scan docs/standards) + minors; fix round 1 sent. FIX_BASE 7ec4a9c
Task 11: fix round 1/5 (3 addressed, 0 open; commits 7ec4a9c..40682f5)
Task 11: complete (commits 2e685b1..40682f5, review clean)
Task 11: minor (deferred): processor-module-form-factors.md:7 banner says only edits are pinned links — no longer true; verify.sh:97 standards nocode scan silently skipped if dir absent (effective backstops); "dated-by-event supersession" jargon (pcbway-fab-rules.md:5)
Task 12: dispatched implementer (opus), BASE 40682f5
Task 12: implementer DONE_WITH_CONCERNS 43ccbad (all 17 checks pass; extra superseded record values D_PEN, 90.4k, 60.3k; decisions.md 'does not carry' omits O-10 gate clause)
Task 12: complete (commits 40682f5..43ccbad, review clean)
Task 12: minor (deferred): README.md:161 trace 1 hop 5 attributes "Contract in spec §5.6.3" to the rail's notes — it is pin 21's notes (MI L1349); LICENSE-OSCAR's own "h7-platform/LICENSE-APACHE-2.0" path is stale — note it; README.md:188 licence obligation omits the bring-up carrier codec loopback named in OSCAR-AUDIO-LICENCE-L1
Task 2: minor (deferred): decisions.md:1321 "does not carry" gate-clause summary omits O-10
Spec observation (owner's document, not edited): spec Goal 6 (line 204) and Decisions table (line 290) say layout-B.svg is "the picture he chose from"; it is a regeneration with control positions unchanged (mechanical-and-controls.md §4.3) — surface to owner
Task 13: dispatched implementer (sonnet), BASE 43ccbad
Task 13: implementer DONE_WITH_CONCERNS 413b28f (verify 17/17 PASS; typecheck exit 0 after bun install; make check exit 2 at boards/pt2399-core "delay_ic (kind ic) has no parts-list rule in tools/bom/needs.ts" — identical on main 05f4a2a, pre-existing)
Task 13: complete (commits 43ccbad..413b28f; no separate task review — verification-only task, its outputs re-checked by the final review)
Ruling: Task 13 gets no separate task review; the final whole-branch review covers its README and record — it writes no ported content — costs: a record error caught one stage later
Final review: dispatched (opus) over bd5f061..413b28f
Final review: not ready as-is — 3 Important (I-1 decisions.md D7 VDDA bank current; I-2 O-6 "R-33 to R-45" labels owner decisions R-34/R-43 as rulings in 4 places; I-3 pcbway-fab-rules.md "Where the rules are enforced" reads as live pedals-router instruction) + Minors M-1..M-9
Ruling: I-3 is fixed (marked as how pedals enforced the rules at the pin, history; enforcement here set in phase 4) — the owner's "do NOT poison it" and anti-goal outweigh "keep the content" for a standing instruction — costs a slightly edited fab-rules section
Ruling: final fix wave includes I-1, I-2, I-3, M-1, M-2, M-4, M-5, M-6, M-7, M-8; M-3 (verify.sh coverage of D_PEN / stale-json per-value) parked — no defect hidden today, manual sweep found none — costs a weaker guard for later phases
Final fix wave: dispatched (opus), FIX_BASE 413b28f
Final fix wave: DONE ca5f6a0 (I-1..I-3, M-1, M-2, M-4..M-8); residual: pcbway-fab-rules.md:13 present-tense 'every board in this repository is designed to PCBWay standard spec'
Final fix wave: re-review — all findings addressed, no new Critical/Important breakage (commits 413b28f..ca5f6a0)
Final: parked — pcbway-fab-rules.md:11-14 present-tense "Every board in this repository is designed to PCBWay's standard ... spec" — Ruling: left as the standard's stated scope (banners at :5/:7 make phase-4 authority explicit); reviewer rated Minor — costs a sentence that reads as a measured fact
Final: parked — M-3 verify.sh coverage (D_PEN not in STALE_RE; stale-json does not check per-value naming; nocode skip if docs/standards absent when run alone; power check loose) — see Ruling above
Final: complete
