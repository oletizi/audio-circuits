# SDD ledger — plan: docs/superpowers/plans/2026-11-11-h7-carrier-first-page.md

Spec: docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md (approved).
Owner approval to implement with sub-agents: 2026-11-11, at plan 35a89ad.
Branch: feature/digital-pedal-platform. Start commit: 35a89ad.
Record: per CLAUDE.md, this ledger, briefs, reports and reviews are committed at
docs/superpowers/plans/2026-11-11-h7-carrier-first-page-execution/ at the end, not deleted.

## Pre-flight scan

| Rows | Produces / consumes | Found |
|---|---|---|
| T1 -> T2 | PerfboardDeclaration union with kind | consistent |
| T1 -> T5 | pcb check requires tests/circuits/<board>.test.ts; T5 creates h7-carrier.test.ts and perfboard.json kind pcb | consistent |
| T1 -> T7 | T7 adds sch+netlist to a pcb declaration; pcb check then runs netlist-agrees | consistent |
| T2 -> T7 | NO INDEPENDENT NETLIST block on first draw | consistent |
| T3 -> T4, T5 | verifier amended before first .ts under circuits/h7-platform | consistent (order T3 before T4) |
| T4 -> T5 | checkInterface(network, "carrier", sockets) | consistent |
| T5 -> T6 | DESIGNATORS map, PIN_NUMBERS table | PIN_NUMBERS is the kind-keyed table intentFromNetwork takes; T6 builds the per-component map from it. See ruling P2 |
| T6 -> T7 | modelForSheet("h7-carrier"), DraftedPage.footprintComparisons, round-trip circuit field | consistent |
| T1 self | tests vs code | consistent |
| T2 self | tests vs code | consistent |
| T3 self | controls vs rules | consistent |
| T4 self | tests vs signatures | consistent |
| T5 self | railDraw refuses any part with a pin on the rail lacking an entry; but sockets, breakout headers and test points also sit on 3V3_D/VREF_A, and the dummy resistors sit BEHIND their jumpers, not on the rail | rulings P1 |
| T5 self | symbol-exists test vs C4 project symbol | plan: BLOCKED if no stock match, so stock only in this plan; consistent |
| T6 self | DraftedPage gains a required field; the five Pultec board test files construct DraftedPage but are not in Files | ruling P3 |
| T7 self | binding steps vs T6 helpers | consistent |

Ruling P1: RAIL_LOADS entries cover every component with a pin on the rail, including sockets (the source, 0 A), breakout headers and test points (0 A, no DC path), and each dummy jumper, whose entry computes the dummy current from the resistor behind it, read from the network, when its state flag is set. The dummy resistor itself has no pin on the rail. — The plan's refusal rule would otherwise refuse the carrier or miss the dummy. — If wrong: a test-structure rework inside Task 5, no electrical effect.
Ruling P2: T6 derives the carrier's per-component pin-number map from the same PIN_NUMBERS table the intent lowers with, and Task 5's symbol-pin test is the independent check on that table. — The plan states both. — If wrong: a pin-table error would show as a kicad-cli export disagreement in T7.
Ruling P3: Task 6 may modify the five tests/circuits/pultec-*.test.ts board files to add footprintComparisons: "some". — Required field, Files list omitted them. — If wrong: none; the alternative is an optional field with a default, which CLAUDE.md forbids.

## Progress
Task 1: dispatched (BASE 35a89ad, sonnet, agent a5711d157d0ad77c5)
Task 1: implementer DONE_WITH_CONCERNS (474dd8f); concerns: schematic NOTICE text says the layout check ran (wrong for pcb); pcb+sch runs board test twice. Review dispatched (sonnet, a87dd15d1bbd158d4)
Task 1: complete (commits 35a89ad..474dd8f, review clean; 6 minors)
Task 1: minor (deferred): pcb board test runs twice when sch declared (board.mk check + netlist-agrees)
Task 1: minor (deferred): board-kind-make.test.ts fixture names nonexistent circuits/opamp-buffer/opamp-buffer.ts (never opened)
Task 1: minor (deferred): make-routing test writes zz-kind-route-* into boards/; a hard kill leaves a stray board
Task 1: minor (deferred): substring not.toContain("wiring"/"veroroute") assertions are brittle
Ruling: fold Task 1 minor 5 (schematic-notice.ts says "the check below still ran, against the layout" for a pcb board) into Task 2 — CLAUDE.md "a skipped check must never look like a passing one" makes a false notice more than polish, and Task 2 owns the pcb no-netlist messaging — if wrong: a few lines of extra scope in Task 2.
Ruling: fold Task 1 minor 1 (tools/cli/perfboard.ts runCheck fails every pcb board, so the repo-root perfboard check goes red once h7-carrier exists) into Task 2 as an explicit printed SKIP line naming the board and why — otherwise Task 5 turns a documented command red for a non-defect — if wrong: one more line of output to undo.
Task 2: dispatched (BASE 474dd8f, sonnet, agent a81ecc012403430b4; carries the two Task 1 rulings; may install toolchain C5 early)
Task 2: implementer DONE (7bbb75f); toolchain installed (copperhead 0.12.0, akcli 0.22.0, untracked and ignored); draw tests in new tests/draught/draw-board-kind.test.ts (draw.test.ts near size limit); schematic-notice verb now requires --kind. Review dispatched (sonnet, a861ee2a1dd7021d2)
Task 2: complete (commits 474dd8f..7bbb75f, review clean; 4 minors)
Task 2: minor (deferred): draw-partition.ts:599 doc comment mentions notice on the agrees variant, which has none
Task 2: minor (deferred): runCheck loads each declaration twice (loadDeclaration then loadPerfboardDeclaration)
Task 2: minor (deferred): a repo-root perfboard check over only pcb boards exits 0 with SKIP lines; no end-of-run count
Task 2: minor (deferred): draw-board-kind.test.ts depends on pultec hi-cut artifacts and a docs/research intent JSON
Task 3: dispatched (BASE 7bbb75f, sonnet)
Task 3: implementer DONE (b581121)
Task 3: complete (commits 7bbb75f..b581121, review clean; controller re-ran verify.sh: 17 lines starting PASS, no FAIL)
Task 3: minor (deferred): disclosure reads "1 .ts files"; README lines 26-27 cite a stale verify.sh line number
Task 4: dispatched (BASE b581121, sonnet)
Task 4: implementer DONE (5d5d0df); socket pad = pin keyed by pad number string; nc = tagged NC or absent pin
Task 4: review approved (spec ok, 5 minors)
Ruling: fix three Task 4 minors now (socket must list exactly pads 1..20 so a missing pad cannot pass as nc; open-items row states the carrier exception and that the breakout terminal's role is unchecked; test JSON path via import.meta.dir) — a missing pad accepted as nc is a skipped check that looks like a pass (CLAUDE.md) and Task 5 builds the carrier on this checker — if wrong: a small amount of extra strictness to relax.
Task 4: minor (deferred): checkInterface re-parses the contract on every call
Task 4: fix round 1/5 dispatched (resume implementer, FIX_BASE 5d5d0df)
Task 4: fix round 1/5 (3 addressed, 0 open; commits 5d5d0df..beb635c)
Task 4: complete (commits b581121..beb635c, review clean)
Task 5: dispatched (BASE beb635c, opus; carries rulings P1 and the Task 4 socket-pad convention)
Task 5: implementer BLOCKED (no commits): no installed symbol matches TS3USB221 RSE pin for pin (TS3USB30ERSWR differs on 9/10, EDGSR on 8/10; 320 ten-pin symbols scanned, scanner control found TS3USB30ERSWR)
Ruling: under spec C4, add a project symbol for TS3USB221RSER transcribed pin for pin from SCDS220M Table 4-1, but only after a spike shows copperhead drafts it and kicad-cli exports its pins by number; if copperhead cannot use a project symbol, stop and escalate to the owner as a plan defect — C4 says exactly this — if wrong: one project symbol file and its test to remove.
Ruling: the project .kicad_sym lives in circuits/h7-platform/ (CLAUDE.md: the circuit directory holds its KiCad files); extend the Task 3 verifier amendment to allow .kicad_sym there, disclosed in the nocode PASS line, with a fourth control case — keeps one-directory-per-circuit — if wrong: move one file and revert a few verifier lines.
Ruling: TS3USB221 select pin S to GND, 2D+/2D- no-connect (SCDS220M Table 7-1: S=L connects D to 1D) — h7 docs do not specify it, one port is all the carrier uses — Controller ruling (the owner may override); if wrong: one net change on the page.
Ruling: fuse modelled as kind ic with pins "1"/"2" and symbol Device:Fuse; value from power.md:246 729 mA (the larger of the two documented figures) to the next standard PTC hold step 0.75 A; no MPN is required for a schematic (G245) — if wrong: a value field change.
Ruling: DESIGNATORS is a Record, as intentFromNetwork and every existing board take; Task 6 adapts — the plan's ReadonlyMap was not a requirement — if wrong: a type change.
Ruling: dummy-load jumpers are kind connector (a 2-pin header, symbol Connector_Generic:Conn_01x02); the state flag models the shunt — the symbol is a header, not a switch — if wrong: a kind change.
Task 5: resumed with rulings
Task 5: implementer DONE_WITH_CONCERNS (9b22937 spike+symbol, f8a5608 model, f14fdcc rulings, f42b3d3 symbol sweep test); concerns: fuse value shows "Fuse" not 0.75 A; added USB-C shield RC (USB-05) and C_VBUS (USB-04) by "mirror the pedal"; USBLC6 pin names from stock symbol only; RAIL_LOADS take (state, network); Task 7 draw.ts must pass PROJECT_SYMBOL_LIBRARY; no footprints
Task 5: note for Task 7: tools/cli/draw.ts does not yet pass the project symbol library to the draft
Task 5: review approved (opus); 2 items for ruling + 5 minors
Ruling: the fuse's 0.75 A hold rating must appear on the drawing — a builder needs it and a page that says only "Fuse" omits a fact the model holds — implementer picks the mechanism the model and lowering already support (a value field) before adding a kind — if wrong: a field to move.
Ruling: tools/cli/draw.ts passes the board's project symbol library to the draft, discovered from the board's circuit module, with a test, in this fix round rather than Task 7 — the implementer holds the projectSymbolLibraries context — if wrong: code moves between tasks, no behaviour change.
Ruling: keep the implementer's added USB-C shield network (USB-05) and C_VBUS (USB-04) as controller rulings; the plan's reason for the USB path is to mirror the pedal, and both are the pedal's cited parts — the owner may strike them on seeing the page — if wrong: two parts off the page.
Ruling: fix all five Task 5 minors now (processor-and-memory.md:263 -> 267; 86.6 mW -> 84.0/84.8 mW; isResistor instead of Reflect.get; cite schematic-checklist.md USB-04 for USBLC6 pins; refuse on undefined instead of ?? "") — each is a wrong citation, a wrong figure or a fallback-shaped line in a model the owner will read — if wrong: none.
Task 5: fix round 1/5 dispatched (resume implementer, FIX_BASE f42b3d3)
Task 5: fix round 1/5 (all addressed, 0 open; commits f42b3d3..b039fae)
Task 5: complete (commits beb635c..b039fae, review clean)
Task 5: minor (deferred): valueFor's guard against part.value overriding a quantity does not catch structurally represented quantities (e.g. pot taper); disclosed in its comment
Task 5: minor (deferred): ΔI_CC counts the S pin (tied to GND) and over-counts by 20 µA, as directed
Task 6: dispatched (BASE b039fae, sonnet)
Task 6: implementer DONE (df85249); pinNumbers on carrier entry is a function of the network; sheet-model.ts now over 500 lines (518 before)
Task 6: review approved (sonnet); concern: numeric pin names (sockets, headers, ic parts) map by identity through pinNumberFor's fallback, so P2's carrier pin-number test is tautological for them
Ruling: numeric-pin identity mapping stands for this plan; it is the same fallback the lowering uses, the TS3USB221 symbol and its pin connections were checked against SCDS220M by the Task 5 review, and Task 7 must assert the carrier's exact pinIdentity list ([] or declared) on both fixture and fresh export — if wrong: a pin-number error on a numerically named pin could survive to the page; the export comparison is the net.
Ruling: one small fix round for Task 6 minors that mislead a reader (detached BOARDS doc comment; declaredBoard refusal still says drafted/pultec/; sheet-model.ts at 566 lines - move OwnMappingBoard, everyPin, pinNumbersFromTable to their own file and dedupe pinsOf; add literal spot-checks u_usbsw pin "7" and j_usb pin "SH") — a refusal naming the wrong directory teaches wrong — if wrong: none.
Task 6: fix round 1/5 dispatched (resume implementer, FIX_BASE df85249)
Task 6: fix round 1/5 (4 addressed, 0 open; commits df85249..e139c99)
Task 6: complete (commits b039fae..e139c99, review clean)
Task 6: minor (deferred): sheet-model.ts is 532 lines (pre-existing Pultec derivation, down from 566)
Task 7: dispatched (BASE e139c99, opus)
Task 7: implementer DONE (fcc1f52 page+record+repair, b0b4eee binding); fresh export 0 componentIdentity / 0 netMembership, pinDisagreements [], ERC 36 warnings (library-configuration kind), sha256 dc9e93ea...
Task 7: page sent to the owner with a question only (EVALUATING-DRAWINGS §4), before review of the task's code; connectivity agrees with the model, so §3 gives no ground to withhold
Task 7: complete (commits e139c99..b0b4eee, review clean; ERC 0 errors / 36 library-configuration warnings confirmed by reviewer)
Task 7: minor (deferred): RECORD.md says only that the USBLC6 embedded symbol "differs"; measured: pins identical, properties are the -2P6 parent's (SOT-666 footprint and filter)
Task 7: minor (deferred): repair/03-text-edits.py hides 15 Values from a hand-typed list, not the stated rule
Task 7: minor (deferred): REPLAY.md does not say step 1 (make draw) writes build/draw/ inside the repository
Task 7: minor (deferred): drafted/README.md says sym-lib-table is empty; this page's names the project library
Task 7: minor (deferred): J7 Footprint property visible with empty value
Pre-existing: tests/stripboard/temp-scratch.test.ts flags tests/schgen-trial/comparator-controls.test.ts; neither file touched in 35a89ad..HEAD
Final review: dispatched (opus, range 35a89ad..b0b4eee)
Final review: ready with fixes; 4 Important (I1 project symbol library setup undocumented and committed sym-lib-table differs from the tool's; I2 page-export netlist makes the next draw refuse naming the wrong cause, RECORD.md:17 false; I3 pcb check never loads the declared circuit; I4 RECORD.md U2 "differs" without measured fields)
Ruling: one fix wave covering I1-I4, T7-3 (REPLAY.md build/draw note), T3-1 (README verify.sh line pointer), the `as` cast at tests/draught/draw-board-kind.test.ts:67 (owner rule), replay.sh pipefail under sh, and verify.sh back under 500 lines — each is either an owner rule, a false statement in a record, or a check that can pass without running — the drafted .kicad_sch bytes must not change, because that page is with the owner for review — if wrong: rework in a later plan.
Ruling: the remaining minors stay (cost-only, disclosed, or failing toward red), including sheet-model.ts at 532 lines (pre-existing Pultec derivation), the duplicated pin-list helper, the two BoardKind types and the hard-coded library nickname — none changes behaviour — if wrong: cleanup in the module plan.
Final fix wave: dispatched (sonnet, FIX_BASE b0b4eee)
Final fix wave: DONE (3280781, 430c14a); sheet sha256 unchanged; concern: TOOLING C2 recipe for a legitimate model change is untested words
Final re-review: I1-I4 and all controller additions ADDRESSED; hard constraint held (sheet sha256 unchanged)
Final: parked — TOOLING C2 recipe has three wording errors (says page tests are off while the declaration is removed, but the round-trip test always runs; removing "sch" is unnecessary, only a missing "netlist" takes the no-netlist path; omits that the fixture is re-exported after re-declaring) — Ruling: no second fix wave per the process; recorded here and to be corrected when the loopback plan first exercises the recipe — if wrong: someone following the paragraph does one unnecessary step.
Plan complete. Page sent to the owner; verdict pending.
