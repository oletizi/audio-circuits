Task 12 report: docs/h7-platform/README.md and the verify.sh readme check

Status: DONE_WITH_CONCERNS
Commit: 43ccbad (pushed to origin/feature/digital-pedal-platform)
Files: docs/h7-platform/README.md (new); docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh (readme check added to ALL_CHECKS and run_check)

WHAT I WROTE

README.md sections:
- Ported from: pinned links to the files it draws on.
- What the platform is: two paragraphs, linking architecture.md.
- Documents: every file in docs/h7-platform/ and research/, plus the four circuits/h7-platform records and docs/standards/pcbway-fab-rules.md. layout-B.svg is described as "the record of layout B, the layout the owner chose", a regeneration of candidate-B.svg (pedals b0e69c8).
- Source map: one table row per source path (48 rows): 40 collapsed h7-platform paths + 2 specs + 2 research docs + fab rules + 3 rulings ledgers. Each row links its new home with a relative link, or says "Stayed behind:" with a one-clause reason from the spec's Non-goals. Generator-only items are named in their rows: ledger R-3, R-4, R-7; all of A1; A2's unnumbered rulings (except PW-CHASSIS, AN-RING, the OWN-02 quote); OWNER-DEFAULTS ALL-07; split spec §10 and the gate clauses of O-8, O-10, RR-5, RR-9, RR-10; checklist PWR-04, PWR-13, ALL-01, ALL-02, ALL-05, ALL-06, ALL-07 and CORE-01's annotation clause. A closing paragraph names the other cited process records (S1/S2 plans, the generator spec) and says task-17-rulings.md and task-17-research-A.md are not in the pedals history.
- Provenance index: states the strings are historical provenance, not local paths. Then the document-alias table, the "carrier" note, the id-prefix table, the relative-root table, and three traces.
- Licences.
- Superseded statements in the records: five lines beginning `*Superseded in the records:*`, each linked to its effective constraint. No line numbers; points at verify.sh stale-json.

THE README CHECK (verify.sh check_readme)
- The h7-platform/ part of the list comes from `git -C "$PEDALS_REPO" ls-tree -r --name-only 5b926d0 h7-platform` at run time. It collapses boards/v1/, circuit/, mechanical/, vendor/, symbols/, footprints/, pintables/, generated/ and interface-analysis/sources/ (40 paths at the pin). It fails loudly if git cannot list the tree or a collapse directory has no files.
- The 8 paths outside h7-platform/ are hard-coded in README_EXTRA_PATHS. Why: the spec names them, and no rule over the tree would find them (the specs, research documents, fab rules and ledgers sit in different directories next to non-platform files). Each one is checked with `git cat-file -e` at the pin, so a misspelt or missing path fails the check.
- Each path must appear as a code span (`path`) inside the "## Source map" section. That line must contain a relative markdown link (to a document here) or the words "stayed behind". A pinned link elsewhere in the README does not count.
- "## Provenance index" must exist and contain at least three headings matching `^#+ Trace:`.
- Some line naming OSCAR_AUDIO_01 must say "unresolved".

RED: the full no-argument run, before README.md existed
PASS bytes
PASS nocode
PASS provenance
PASS standards
PASS effective
  records circuits/h7-platform/module-interface.json:
    141: ... "A Seed: 17 V, so Seed benches run on 9–12 V (O-15; R-50 limits them to 9 V until bring-up measures a Seed)"
    345: ... "420.3 Hz rounded up (179 Hz before 2026-10-06, S1 Task 17 fix D-B-2, which took C_POSn at −10 % only)"
    355:      "consequence": "Seed benches run on 9–12 V supplies only (O-15)"
    405:      "consequence": "9–12 V development limit on every revision (O-15); ..."
    1349:     "notes": "... noise ≤ 1123 µV rms in 0–421 Hz (0–179 Hz before S1 Task 17 fix D-B-2, 2026-10-06, ruling R-57); ..."
  records circuits/h7-platform/interface-analysis-results.json:
FAIL stale-json:docs/h7-platform/README.md lacks a '## Superseded statements in the records' section (written in Task 12)
PASS decisions
PASS architecture
PASS power
PASS analog
PASS openitems
PASS bypass
PASS firmware
PASS mechanical
PASS parts
PASS bringup
FAIL readme: [missing docs/h7-platform/README.md]
(the long stale-json lines are abridged here with "..."; the output above them is verbatim)

The check also fails on content, not only when the file is missing. Mutation run (scratch script: mutate one thing in README.md, run `verify.sh readme`, restore; README restored byte-identical, confirmed with cmp):
-- drop-vendor-row:       FAIL readme: [source map lacks `h7-platform/vendor/`]
-- stayed-to-nothing:     FAIL readme: [source map line for `h7-platform/Makefile` neither links a document here nor says 'stayed behind']
-- drop-unresolved:       FAIL readme: [no line naming OSCAR_AUDIO_01 says 'unresolved']
-- two-traces:            FAIL readme: [provenance index has 2 'Trace:' headings, expected at least 3]
-- no-provenance-heading: FAIL readme: [no '## Provenance index' section] [provenance index has 0 'Trace:' headings, expected at least 3]

GREEN: the full no-argument run, after README.md
PASS bytes
PASS nocode
PASS provenance
PASS standards
PASS effective
  records circuits/h7-platform/module-interface.json:
    141: (as above)
    345: (as above)
    355:      "consequence": "Seed benches run on 9–12 V supplies only (O-15)"
    405:      "consequence": "9–12 V development limit on every revision (O-15); ..."
    1349: (as above)
  records circuits/h7-platform/interface-analysis-results.json:
PASS stale-json
PASS decisions
PASS architecture
PASS power
PASS analog
PASS openitems
PASS bypass
PASS firmware
PASS mechanical
PASS parts
PASS bringup
PASS readme
stale-json printed its locations, including module-interface.json lines 355 and 405. It found no 9–12 V or 179 Hz line in interface-analysis-results.json.

Link check: a scratch script checked all 243 links in README.md. Local files exist. Local anchors match a heading slug. Every pinned link uses the full SHA and names a path that exists at the pin, with blob for files and tree for directories. Every #L anchor is within the file's line count. Result: 0 problems.

THE THREE TRACES. Every hop's line was printed from `git show 5b926d0:<path>` and its text read. The local contract's sha256 (d0653f47…647b) equals the pinned file's, so local line numbers equal pinned line numbers.

Trace 1: a VREF_A rail limit (permittedNoiseUvRms)
1. h7-platform/module-interface.json L273 `"net": "VREF_A"`. L336-L340 is permittedNoiseUvRms, value 1123. Its source at L339 reads "interface-analysis/vref-a.md §3, ruling R-15: ...", and its analysis at L340 is "S1 Task 11".
2. h7-platform/interface-analysis/vref-a.md L123 is the §3 heading "Noise (`permittedNoiseUvRms` = 1,123 µV rms, ...)". L136 states the requirement "v_n ≤ 806 µV / 0.717 = 1,123 µV rms in 0–421 Hz".
3. docs/superpowers/plans/2026-10-05-h7-split-rulings.md L27 is "R-15 Control resolution and the VREF_A noise requirement (Task 11, 2026-10-06)".
4. docs/superpowers/plans/2026-10-05-h7-split-s1-contract-carrier.md L2577 is "### Task 11: VREF_A — dynamic load, ...".
5. The split spec L369 is "#### 5.6.3 VREF_A (pin 21): ADC reference rail" (the rail's notes say "Contract in spec §5.6.3").
6. In this repository: analog.md#ec-control-noise-band, analog.md#fig-vref-1123, decisions.md#r-15.

Trace 2: an R-57 amendment (the pin-8 relay-gate tolerance, D-B-4)
1. module-interface.json L765 `"pin": 8` (RELAY_EN at L769). L799 is value 87433. Its source at L801 reads "interface-analysis/crossings.md §5: relay gate ... (R-13); 90390 before 2026-10-06 (S1 Task 17 fix D-B-4 ...)".
2. crossings.md L244 is the §5 heading "R-2a: the onboard-pull tolerance of every signal pin". L260 is pin 8's row: 87.4 kΩ, "90.4 kΩ before S1 Task 17 fix D-B-4".
3. Ledger L372 opens R-57 ("Task 17 section B fixes ... controller rulings in `task-17-rulings.md`"). L376 is its bullet "Gate tolerances (D-B-4) ... pin 8 87.4 kΩ (90.4), pins 4/5 60.8 kΩ (60.3)".
4. h7-platform/interface-analysis/REVIEW.md L273 is the D-B-4 defect text. REVIEW.md L3 names the reviewed HEAD 7f87bff, so the crossings.md line numbers inside D-B-4 belong to that commit, not to the pin. The README says so.
5. Ledger L17 is R-13, the ruling R-57 amends.
6. task-17-rulings.md is not in the pedals history (spec global constraint). The README says the R-57 ledger entry is the reachable record.
7. In this repository: architecture.md#49-output-gates-and-the-onboard-pull-margin, decisions.md#r-13 and #r-57, bypass-relay.md#ec-relay-gate.

Trace 3: an mcu.*.pinData path
1. module-interface.json L78 is mcu.module.part STM32H743IIT6. L80 is pinData[0] "vendor/st-pin-data/STM32H743IITx.xml". L72-L73 are mcu.seed.pinData (the two H750IB packages).
2. h7-platform/vendor/st-pin-data/STM32H743IITx.xml L3 is `<Mcu ... Package="LQFP176" RefName="STM32H743IITx" ...>`.
3. h7-platform/vendor/st-pin-data/SOURCE L1-L5 records the upstream STM32_open_pin_data at commit 7d1f1514…, files including mcu/STM32H743IITx.xml, and BSD-3-Clause. LICENSE L1 is "BSD 3-Clause License".
4. The upstream GitHub URL is quoted as SOURCE records it. It was not fetched, and the README says so.

ALIAS LIST AND HOW IT WAS EXTRACTED
Scratch scripts, each written with the Write tool:
- sources.py walked both JSON files at every depth and collected every `source` string: 139 distinct strings. The path tally shows which fields carry them: pins[].seedFact, maxSink/maxSourceCurrent, seedOnboardPullTolerance, rails[].limits.*, declaredLoads, moduleEnvelope.*, and all 76 results keys.
- sources.py tokens and ctx.py tallied candidates: the word before §/Table/Fig/p., capitalised identifiers, hyphen-digit identifiers, and tokens containing a "/". They printed context for each candidate.
- rids.py listed every R-n with the word before it, to separate ledger rulings from split-spec §14 risks.
- scan.py searched the records for candidate superseded values.

Aliases found in the `source` strings, each mapped to a pinned file in the README:
- spec (21 occurrences), and a bare §n in the contract: the split spec. No `source` string names the 2026-09-30 spec.
- PW (1, "PW §8 item 8"): POWER.md.
- POWER.md, ANALOG.md, BYPASS-RELAY.md: h7-platform/.
- interface-analysis/<name>.md (vin-mod, power-fail, envelope, crossings, codec-domain, facts, 3v3-d, vref-a, pedal-digital-rail), the bare forms of the same names, and layouts/layouts.md: h7-platform/interface-analysis/.
- sources/<pdf> (HRO-TYPE-C-31-E-17, MillMax-800-803-p53, PreciDip-801-87-NNN-10-012101, PreciDip-catalog-p43-p108, PreciDip-catalog-p86-p94): h7-platform/interface-analysis/sources/.
- results.json, and dotted keys such as sai.moduleSideSupplyMa: h7-platform/interface-analysis/results.json.
- hotPlug.ts: h7-platform/circuit/analysis/hotPlug.ts.
- DS120, DS105, DS-S3, SCH-R5, LD-H: split spec §16 L893-L898. LD-BOOT appears in seedExceptions, not in a source string.
- S1 Task n / Task n (also every `analysis` field): the S1 plan.
- S2: the S2 plan.
Also mapped: AN and CB, which the brief names; they appear in the split spec, not in the records. BR is the split spec's alias for BYPASS-RELAY.md.
Vendor document numbers (DS12110, DS12556, SLUSEA4D and the like) are recorded as manufacturer documents, not pedals aliases. Each analysis's §0 "Documents read" names their revisions.
Id prefixes found in the records: R- (182), D-A-/D-B-/D-C-/D-D-, O-, R-PF-, BU-, CTL-, I-, M-, S-, and §16 U/V. The brief's other prefixes (RR-, OWN-, D<n>, BL-) are not in the records but are indexed. N-, m-, n- and H- are added from the ledger.

CONCERNS
1. The R- prefix is overloaded in the records. R-2, R-2a to R-2c, "R-7 (§14)" and "spec §14 risk R-14" are split-spec §14 risks; every other R-n is a ledger entry. The README states this rule. A reader without the rule would resolve R-7 to the ledger's generator ruling, which is wrong.
2. "carrier": vin-mod.md and the contract's VIN_MOD source strings use it for h7-pedal. power-fail.md does not contain the word at the pin (0 occurrences), so the brief's naming of power-fail.md does not hold. crossings.md §7 uses "the carrier, Task 25" for the O-13 bring-up carrier. The README names the files where each meaning holds.
3. layout-B.svg: the brief's "every position unchanged" overstates mechanical-and-controls.md §4.3. That section says the control, footswitch, LED, jack and relay positions are unchanged, but the module outline, socket bodies and hung boards changed. The README follows §4.3. Spec Goal 6's "the picture he chose from" is not used, as instructed. The spec text itself still says it; that is a spec wording point for the controller.
4. Superseded values beyond the two the brief requires, found by reading the records:
   - the D_PEN diode reset, in results pedalRail.regulatorLcsc, linked to power.md#ec-qpen-reset;
   - 90.4 kΩ, in results gate.relayPullDownOhms, linked to architecture.md §4.9 and bypass-relay.md#ec-relay-gate;
   - 60.3 kΩ, in results gate.ledPullDownOhms, linked to architecture.md §4.9.
   No ported document carries 60.3 kΩ on a `*Not in force:*` line; decisions.md R-13's "Amended by" gives 60.8. verify.sh's STALE_RE still matches only 9–12 V and 179 Hz, so the tool re-derives locations for those two only. The README names the other three by record and field. Extending STALE_RE would also make check_effective scan the prose for D_PEN, which several documents mention legitimately, so I left it unchanged.
5. decisions.md's "What this document does not carry" list names the gate clauses of O-8, RR-5, RR-9 and RR-10 but not O-10's. O-10's own entry marks it "Not carried". RR-10's clause is noted under "Amended by", not as a "Not carried:" line. The README lists all five and says "each noted in its decisions.md entry". I did not edit decisions.md, which is outside this task's files.
6. verify.sh's README_EXTRA_PATHS are hard-coded, for the reason given above, with an existence check at the pin.
7. The spec's Done-when line on `bun run typecheck` and `make check` was not run: it is not in this task's brief, and nothing here is code.
