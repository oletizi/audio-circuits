Task 2 report: docs/h7-platform/decisions.md

Status: DONE_WITH_CONCERNS
Commit: f88ff1f (pushed to feature/digital-pedal-platform)
Files: docs/h7-platform/decisions.md (new); docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh (check `decisions` added to ALL_CHECKS and run_check).

RED (before decisions.md existed)
  FAIL decisions: [missing docs/h7-platform/decisions.md]

GREEN
  PASS decisions
  PASS provenance
  PASS nocode
  PASS effective
  (also PASS bytes)

The check can fail on every clause: a mutation script (scratchpad mutate.py) copied verify.sh into a temp tree and ran it against mutated copies. Each of these FAILs, baseline PASSes: missing file; a missing section; O-10 heading removed; O-1 heading removed (O-10..O-18 do not satisfy O-1); R-34 entry moved under rulings; O-15 entry moved under owner decisions; D22 entry without "§9.4"; D24 heading removed; D13 entry without "withdrawn"; D4 heading removed. The first version of the check passed the two "moved" mutations (mentions in prose satisfied it); it now requires the entry's HEADING in the named section. The first heading regex also could not match "### O-1"; fixed before GREEN.

Verbatim check: a script (scratchpad quotes.py) extracted all 86 double-quoted strings in decisions.md and searched for each, whitespace-normalised, in the pinned sources. 85 found verbatim; the one not found is "How amendments resolve", the name of this repository's port-spec section, not a pedals quote. All 87 internal anchor links resolve to a heading.

ANCHORS (stated at the top of decisions.md under "### Anchors")
Every entry is a level-3 heading whose text is only its identifier, so the GitHub anchor is the identifier lower-cased. Link as decisions.md#<anchor>.
- O-1..O-18: #o-1 .. #o-18 (O-15 sits under controller rulings, same anchor scheme)
- S1 ledger: #r-1, #r-2, #r-5, #r-6, #r-8 .. #r-62 (every carried entry; R-3, R-4, R-7 not carried)
- CORE-BRIEF deltas: #d1 .. #d24
- OWN items: #own-01 .. #own-07
- Review-response rulings: #rr-1 .. #rr-11 (Q-6, Q-7 are inside #rr-11)
- Older platform owner decisions: #ps-18v (18 V survival), #pw-tj (MCU Tj at VOS0), #an-d1, #an-d2 (ANALOG.md's own D1/D2, prefixed to avoid colliding with CORE-BRIEF D1/D2)
- Owner-supplied facts: #f-1 .. #f-6 (numbering is this document's own)
- The ledger's unnumbered "R-31 and R-32 amendment" is folded into #r-31 and #r-32.

ENTRIES AND LABELS (with the source wording that justifies the label)

Owner decisions:
- O-1..O-14, O-16, O-17, O-18: split spec §2 "Owner decisions this spec implements (2026-10-05, binding)"; O-16, O-17, O-18 are additionally recorded in its front matter as owner decisions after approval.
- D14, D15, D16, D18, D19: OWNER-DEFAULTS "The owner approved deltas D14–D19 on 2026-10-04" and each "Owner decision (2026-10-04): Approved by the owner."; D19 also A2 rulings "Owner decision (2026-10-04): D19 APPROVED".
- D17: "Approved by the owner (conditional on Task 18 Step 1)" plus "Task 18 Step 1 outcome: D17 stands."
- D20..D24: split spec §9.4 "New deltas, approved by the owner on 2026-10-05 (O-14)", each "Approved by the owner, 2026-10-05." Each entry cites §9.4 and says it was never appended to CORE-BRIEF.
- R-34: ledger title "R-34 Owner decision: R-PF-7 at exactly 9.00 V".
- R-43: ledger title "R-43 Owner decision: the supply rating".
- R-56: ledger "*Owner decision, quoted.*" The entry separates the owner's decision (design for both stack-ups, confirm on first build) from the controller's realisation (Schurter LSH, two builds), labelling the realisation as the controller's that the owner may override.
- OWN-01 (relay bypass, 2026-10-04): OWNER-DEFAULTS "Owner decision (2026-10-04): Decided by the owner: relay bypass"; BYPASS-RELAY.md "Owner decision (2026-10-04)".
- OWN-03 (jack ESD, 2026-10-02): SCHEMATIC-CHECKLIST "Resolved by the owner, 2026-10-02"; AIO-21 "PESD12VL1BA stays the fitted part (owner decision)".
- PS-18V: platform spec Power table "This is an owner decision: an 18 V pedal supply plugged in by mistake is a continuous condition, not a transient."; split §9.1 lists it under owner decisions.
- PW-TJ: POWER.md "Owner decision: MCU junction temperature at 480 MHz (VOS0). Resolved by the owner, 2026-10-01".
- AN-D1, AN-D2: ANALOG.md "Owner decisions (resolved)": "Resolved by the owner, 2026-10-01".

Owner-supplied facts:
- F-1 loft "by my measurement, about 10mm..." (split §2 O-17); F-2 spring throw "it looks like the throw of the spring is about 5mm" (§5.1.1); F-3 the Alpha SF12030F as the likely original (§5.1.1, recorded without his words); F-4 he has original Seeds and the Seed3 is out of stock (O-16; the spec's sentence, not his words, stated so); F-5 the five R-62 box measurements, quoted; F-6 he has no PBS-24-MP on hand (his "No, design for both", R-56).

Controller rulings (the owner may override):
- O-15: split §2 "(2026-10-05, controller ruling on best practice; the owner may override)"; §15 Q-3 "Closed 2026-10-05 by controller ruling on best practice (O-15)". Entry explains this and that R-50's 9 V rule is a ruling narrowing a ruling.
- RR-1..RR-11: split §2.1 "Review-response rulings (controller, 2026-10-05, binding on this spec)"; Q-6/Q-7 "Closed by controller ruling (2026-10-05, RR-11; the owner may override)".
- OWN-02, OWN-04, OWN-05, OWN-06, OWN-07: each source line reads "**Owner decision (2026-10-04):** Decided on best practice (2026-10-04); owner may override." under the file's statement that "The owner's standing instruction is to decide engineering questions by best practice and to report the decision rather than ask." Carried as controller rulings, with the ambiguous heading stated in the OWN-02 entry and referenced from the others.
- D1..D13: CORE-BRIEF records no owner approval for them (approvals start at D14; the A1 ruling says the generator spec's "D1–D13" predate owner-approved deltas). Carried as controller rulings with that ambiguity stated. D4 and D13 are marked withdrawn (split §9.4 "**Withdrawn.**").
- Ledger R-1, R-2, R-5, R-6, R-8..R-33, R-35..R-42, R-44..R-55, R-57..R-62: the ledger labels them rulings/decisions with no owner attribution (R-62 explicitly "controller ruling on the owner's measurements"; R-23 "Confirmed 2026-10-06 (controller ruling)"; R-12's title says "confirmed" with no confirmer, stated in its entry; R-49 "controller-delegated EE ruling").

Effective constraints (the three Done-when samples):
- 9 V Seed bench: O-15 entry "Current" + Set by O-15 + Amended by R-50, R-58, R-59; also in R-50 and R-59 entries. 9–12 V appears only on two `*Not in force:*` lines (O-15, O-16).
- 421 Hz control band: R-15 entry "Current" (Amended by R-57); 179 Hz only on a `*Not in force:*` line.
- Q_PEN reset of 3V3_P's EN: R-44 entry "Current" (Amended by R-45, R-52, R-58) and R-58 entry; the diode reset (D_PEN) only on a `*Not in force:*` line.
Other superseded values handled the same way (R_REF 1.00/3.09 kΩ, R_MGP 1.00 kΩ/270 Ω, R_CRST 10.0 kΩ, VIN_MOD minV 7.94 V, hotPlugPeakV 25.8 V, R-43's 1.08 A, the O-12 annotated socket/header parts, the PTS645SM43 footswitch switch, Ø12.4 lid hole, R-55 lid relief, Hammond room figures, R-8's six spares, D2's pin-27-low clause, D4, D10's PA9 sense, D13).

GENERATOR-ONLY IDS NOT CARRIED (for Task 12's README to map as stayed behind)
- S1 ledger R-3 (hermetic kicad-cli gates, v1 manifest), R-4 (gate 9 role model), R-7 (carrier gates).
- A1 rulings file: every entry (all unnumbered generator rulings). Its one ruling touching an owner approval (gate 8 accepts deltas CORE-BRIEF §4 declares with owner approval; D14–D18 approved 2026-10-04) is a generator rule; the approvals themselves are carried as D14–D19.
- A2 rulings file: the unnumbered controller rulings. Its three owner decisions are carried: D19 approved (as D19), relay bypass (as OWN-01), and the 2026-10-04 footswitch decision (superseded by O-17, carried only on a Not-in-force line under O-17).
- OWNER-DEFAULTS ALL-07 (ERC exclusion for v1's stock KiCad symbol).
- Generator clauses inside carried entries, marked "Not carried" in place: O-8's "its own full gates", O-10's "Sub-project B (layout tooling)", RR-5's "the gate refuses to assign them", RR-9's "gate 9 flags...", RR-10's gate and layout-tooling steps; split spec §10 (generator support) as a whole.

Not generator-only, but not carried as entries, per the brief's restriction of A1/A2 to owner-decision entries: A2's circuit rulings (e.g. ALL-09 chassis bond lug, the expression ring restated to ±5 V, D-1..D-6 citation fixes). Their content lives in the design notes (ANALOG.md, POWER.md) that Tasks 4–5 port. The README should map the A2 file as "owner decisions carried in decisions.md; controller rulings stayed behind (circuit content via the design notes)".

CONFLICTS RAISED
None added to open-items.md. Considered and settled by the precedence rule rather than raised:
- O-16 (owner) cross-references "the 9–12 V development limit (O-15)" while R-50 narrows O-15 to 9 V. The port spec's rule 1 note settles it: O-15 is a ruling, the cross-reference follows O-15 as narrowed. Recorded in the O-16 entry with the old wording on a Not-in-force line.
- O-12's row names Preci-Dip/Samtec sockets and headers, later replaced by R-54 and R-61 (rulings). The part numbers were controller choices annotated into the owner row; the owner's decision is "socketed". Recorded in O-12 as such, not as a ruling overriding the owner.

CONCERNS
1. The `effective` regex `9[–-]12 V` cannot distinguish the superseded Seed bench limit from the platform's production operating input range, which is still in force (platform spec Power table "Operating input range 9–12 V DC"; ledger R-41 "an operating point (9–12 V)"). decisions.md states the operating range as "9 V to 12 V DC" (PS-18V) to keep the true value without tripping the check. Task 4 (power.md) will meet the same problem; the controller may want to rule on the wording, or narrow the regex.
2. Label ambiguity in OWNER-DEFAULTS: OWN-02/04/05/06/07 are headed "Owner decision (2026-10-04)" but say "Decided on best practice; owner may override." I carried them as controller rulings with the ambiguity stated. If the controller reads the heading as the source "saying so", they move to owner decisions.
3. D1–D13 carry no recorded owner approval; I labelled them controller rulings with the ambiguity stated. The generator spec (approved-design) relied on them, which could be read as implicit approval.
4. The older platform-level owner decisions (PS-18V, PW-TJ, AN-D1, AN-D2, OWN-03) come from ANALOG.md, POWER.md, SCHEMATIC-CHECKLIST.md and BYPASS-RELAY.md, which the brief did not list as sources; I included them because split §9.1 names them as existing owner decisions the split leaves in force, and Goal 1 asks for every live owner decision. Their anchor ids (ps-18v, pw-tj, an-d1, an-d2) and the F-n numbering are this document's inventions, stated as such.
5. Ruling summaries are deliberately short and state only values I read as current in the ledger's final amendments; the full derivations belong to Tasks 3–8. A reviewer should spot-check a sample of "Current"/"Decides" lines against the ledger, especially R-36, R-38, R-44, R-46, R-58 (several amendment layers).
6. The ledger's R-59 names a pedals command; decisions.md does not reproduce it.
