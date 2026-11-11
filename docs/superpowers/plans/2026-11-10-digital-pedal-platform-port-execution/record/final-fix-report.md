Final-review fix wave: report

Commit: ca5f6a0 "h7-platform port: final-review fixes" (pushed to origin/feature/digital-pedal-platform; no attribution lines).
Source checked at pedals 5b926d0 via `git -C /Users/orion/work/pedals-work/digital-pedal-platform show 5b926d0:<path>`.

I-1. D7 (docs/h7-platform/decisions.md:727-735)
- Decides (:730) now reads "... a VDDA bank on FB_VDDA that meets VDDA-WIDEBAND (below)" instead of "OSCAR's VDDA bank kept".
- :733 added "Narrowed by: [R-57](#r-57) (controller ruling; the owner may override): the VDDA bank must meet VDDA-WIDEBAND, f0 ≤ 158.0 kHz", linked to processor-and-memory.md#4-the-mcu-and-its-supply-network (the anchor exists: heading "## 4. The MCU and its supply network", line 131) and analog.md#ec-vdda-wideband.
- :735 added a *Not in force:* line for OSCAR's 2 × 100 nF + 2 × 2.2 µF as the module's bank, linked to processor-and-memory.md §4.
- Verified against: ledger R-57 (docs/superpowers/plans/2026-10-05-h7-split-rulings.md line 375): "the present module network (BLM21PG221SN1D, 2 × 2.2 µF + 2 × 100 nF) gives **2.13 mV rms** at pin 21, over 806 µV ... f0 ≤ **158.0 kHz**"; CORE-BRIEF.md line 146: "VDDA: OSCAR has 2 × 100 nF + 2 × 2.2 µF, which meets AN4938's 100 nF + 1 µF. Keep it."
- Searched decisions.md for other statements of the old bank as current ("VDDA bank", "bank kept", "4.6 µF", "2 × 100 nF"): only :730 stated it; D17 (:259) and R-18 (:926) already carry R-57 or no bank value.

I-2. O-6 range
- decisions.md:103 now "[R-33], [R-35] to [R-42], [R-44], [R-45] and [R-58] (controller ruling; the owner may override), which realise it, with the owner decisions [R-34] and [R-43] between them".
- power.md:38, bypass-relay.md:163 and open-items.md:27: same split, naming R-34 and R-43 as owner decisions.
- Verified against ledger lines 62 ("R-34 Owner decision: R-PF-7 at exactly 9.00 V") and 173 ("R-43 Owner decision: the supply rating"); R-33, R-35..R-42, R-44, R-45 titles are controller rulings or rulings without an owner label (ledger 61-209).
- Range grep (script over docs/h7-platform and docs/standards for any R-a to R-b spanning 34, 43 or 56): remaining hits are README.md:69, :96, :98, :133, :135 and decisions.md:6. None labels the range as rulings: they describe ledger entries (README:96 itself says "R-34, R-43 and R-56 as owner decisions"; :69/:98/:135 say "ledger entries R-54 to R-62"). Left unchanged.

I-3. docs/standards/pcbway-fab-rules.md
- Section retitled "Where the rules were enforced in the pedals repository" (:42), opening with a "History, not an instruction" paragraph saying it is how pedals enforced the rules at the pin, that nothing in it applies here, and that this repository's enforcement is set in phase 4 with its own tooling.
- "A board conforms ... copy both" reworded in past tense as pedals practice; "Current conformance" reworded as "Conformance as the pedals file recorded it at the pin (its last change before the pin was 2026-10-04)", ending "That is a statement about pedals boards; it names no board in this repository." "fails a board" -> "failed a board". All pinned links and figures kept; rules table untouched.
- Banner (:9) records the edit as a controller ruling from the final review.
- Verified against pedals docs/standards/pcbway-fab-rules.md at the pin ("A board conforms when both files carry these values ...", "Current conformance: `fuzz/boards/smd-v2` conforms. Other boards predate this standard ..."). No document linked the old anchor.

M-1. Execution README (docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/README.md)
- :22 re-counted from git (script: data rows of open-items.md's table per commit, header and separator excluded): 0 after Task 2 (f88ff1f), 31 after Task 3 (9c66b7b), 57 (9d7a640), 73 (2ef6047), 76 (6da0b90), 86 (1502047), 97 (966628f), 97 after 2b and 9 (3f1240d), 107 after Task 10 (2e685b1), 107 at head. Matches the reviewer's figures. The text now says the per-task table sums to 107 and records the earlier off-by-one, and the :35 contradiction ("1 row after Task 2" vs "Task 2 added none").
- :56 nocode: now says Task 11 fix round 1 (40682f5) extended nocode's vocabulary scan to docs/standards/*.md (verify.sh line 97, confirmed in the file and in `git show 40682f5`); its file-type rule still covers only the two trees; the standards scan is skipped silently if the directory is absent, which effective backstops (verify.sh line 130 fails effective when docs/standards is missing).
- :66-68: "identical" dropped. Now says the pt2399-core failure also occurs on main, that the runs are not identical (main also stopped at two transistor-preamp boards), and that the conclusion rests on (a) only .md/.json/.svg/licence files added and nothing in tests/, tools/ or lib/ enumerating circuits/ as circuits or boards (the one glob, `circuits/**/*.ts` in tests/document-control-bytes.test.ts, matches nothing the port adds; grep confirmed no other), and (b) the failure present on main.
- :74: now "verify.sh effective passes ...; verify.sh stale-json lists where it remains in the byte-identical records (in module-interface.json)". Confirmed: check_stale_json (verify.sh:147-152) prints the records lines to stderr.
- :78: "All 108 rows" -> "All 107 rows"; re-checked that all 107 status cells begin "open" (split on " | ", since some Item cells contain |Z| / |H|).
- :84: now "The five indented lines under records circuits/h7-platform/module-interface.json ... stale-json prints them (to standard error, before its own PASS line, which is why they appear under PASS effective) ... interface-analysis-results.json has none."

M-2. docs/h7-platform/README.md:161, trace 1 hop 5
- Now: "The rail entry carries no `notes`; the pin-21 entry in `pins` (`signal` `VREF_A`, `category` `reference`) does, and its `notes` ([pinned line 1349](.../h7-platform/module-interface.json#L1349)) say 'Contract in spec §5.6.3'".
- Verified: pedals module-interface.json at the pin is byte-identical to circuits/h7-platform/module-interface.json (cmp); "Contract in spec §5.6.3" occurs only at line 1349, inside pins[20] (pin 21, signal VREF_A); rails[2] (net VREF_A) has no notes key. Split spec line 369 is "#### 5.6.3 VREF_A (pin 21): ADC reference rail".

M-4. open-items.md:16: "fourth column" -> "fifth column ("Evidence that closes it")". Header: Id | Item | Board / domain | Status | Evidence that closes it | ...

M-5. decisions.md:1324 ("What this document does not carry") now lists O-10 among the gate clauses and adds "O-10's clause putting the pedals layout tooling (Sub-project B) before both layouts". O-10's own Not carried line (:146) now also names "re-run every gate", which O-10's Decides omitted without marking it. Verified against split spec line 50: "O-10 | Order of work: interface spec and contract, then split the design into two boards and re-run every gate, ... Sub-project B (layout tooling) comes before both layouts."

M-6. research/processor-module-form-factors.md:7 banner now also lists the "Pedals paths this document cites" line and §2.9's source line gaining "not a file in the pedals history at the pin" after `.tools/oscar`. Verified pedals line 151: "Source: `.tools/oscar` (KiCad), `h7-platform/CORE-BRIEF.md` §1–§2."

M-7. docs/h7-platform/README.md:186 and :188
- :186 notes LICENSE-OSCAR's own text (line 40: "Full text in h7-platform/LICENSE-APACHE-2.0") names the stale pedals path, that LICENSE-OSCAR is a byte-identical record not edited, and that the file is beside it in circuits/h7-platform/.
- :188 adds the bring-up carrier's codec loopback, where it reuses the codec circuit, to the boards the obligation follows, citing OSCAR-AUDIO-LICENCE-L1 (open-items.md:21 lists "the bring-up carrier's codec loopback where it reuses that circuit").

M-8. processor-and-memory.md:41 D17 row now "BLM21PG221SN1D, kept, on the module; narrowed by [R-57](decisions.md#r-57) (controller ruling): the network it is part of must meet VDDA-WIDEBAND, f0 ≤ 158.0 kHz, by more VDDA-bank capacitance or a bead with more inductance (§4)". Matches decisions.md:259 and ledger R-57 ("or a bead with more inductance").

Checks after the fixes
- verify.sh (no arguments), exit 0:
PASS bytes
PASS nocode
PASS provenance
PASS standards
PASS effective
  records circuits/h7-platform/module-interface.json:
    141: (9–12 V source text)
    345: (179 Hz source text)
    355: "Seed benches run on 9–12 V supplies only (O-15)"
    405: "9–12 V development limit on every revision (O-15); ..."
    1349: pin 21 notes (0–179 Hz before S1 Task 17 fix D-B-2)
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
(The five records lines are abbreviated here; they are unchanged from the verbatim output in the execution README.)
- links.py (read first; read-only, runs git cat-file against the pedals checkout): relative-link problems: 0. Pinned: 64 distinct paths; two reports, both pre-existing and on lines this wave did not touch: open-items.md:21 `CORE-BRIEF.md?plain=1#L32` (the script does not strip the `?plain=1` query; the file exists at the pin) and mechanical-and-controls.md:445 `[svg-chosen]` pinned deliberately at b0e69c8 (candidate-B.svg is not at the pin; :306 explains why).
- Control bytes (python3, every byte < 32 other than tab/LF, plus 127) in all nine edited files: 0 in each.

Concerns
- pcbway-fab-rules.md:13 still says "Every board in this repository is designed to PCBWay's standard ..." in the present tense. It is outside the section I-3 named and states the standard rather than the pedals enforcement, so it was left; a reviewer may want it tied to phase 4 as well.
- A stray read-only background command (a uniqueness check that hung on `cat`) was stopped; it wrote nothing.
