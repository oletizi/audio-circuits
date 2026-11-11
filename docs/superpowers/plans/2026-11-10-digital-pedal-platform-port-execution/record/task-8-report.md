Task 8 report: docs/h7-platform/mechanical-and-controls.md

Status: DONE_WITH_CONCERNS
Commit: 2e1b682 "h7-platform port: mechanical-and-controls.md" (BASE 1502047), pushed. No attribution lines.

## What was written

- docs/h7-platform/mechanical-and-controls.md (new):
  - Ported-from list (envelope.md, controls.md, layouts.md and layout-B.svg, ledger R-54/55/56/60/61/62, split spec section 2 and 5.1-5.1.2, LAYOUT-CARRYFORWARD.md, the STEP README by pinned link).
  - "Words used here": the sources use "lid" for both the top panel (O-17, footswitch and button studies) and the back plate (R-62). The document says "top panel" and "back plate" and quotes sources unchanged. Box frame and module frame defined.
  - "How the sources are carried": a label table.
  - Section 1, effective constraints: EC-ENCLOSURE, EC-BOARD-HEIGHT, EC-MODULE-MOUNTING, EC-SOCKET-AND-HEADER, EC-STACK-HEIGHT, EC-MODULE-USB, EC-CONTROL-POSITIONS, EC-LAYOUT-B, EC-LEAD-TRIM, EC-FOOTSWITCH, EC-BUTTON, EC-PRODUCTION-MOUNTING. Each has Set by / Amended by and Not-in-force lines.
  - Section 2: the box (F-5 facts, R-62), FIG-ROOM-UNDER-BOARD, FIG-HEIGHTS-UNDER-BOARD, FIG-JACKS-OVER-LIP, FIG-JACK-HOLE-CROSSCHECK.
  - Section 3: module placement and outline; socket/header, the mate, cut-from-strip note, Preci-Dip fallback; FIG-STACK-HEIGHT, FIG-SEED-IN-SOCKETS, FIG-SOCKET-TAILS, FIG-USB-PLUG-COLUMN.
  - Section 4: layout B placement table, grid figures, plan rules, why leads cross the module; 4.2 both fits per position (electrical side linked to architecture.md 4.7, analog.md 12, power.md 5.4); 4.3 the layout-B picture as a record.
  - Section 5: the actuator (Alpha vs PBS-24-MP table), the two stack-ups, the Schurter LSH, FIG-SPRING-RATE, FIG-REST-GAP-WINDOWS, FIG-FOOTSWITCH-BUILDS, FIG-FOOTSWITCH-LOAD, FIG-FOOTSWITCH-DEPTH-CHAIN, 5.4 clearances, attachment and connection.
  - Section 6: the button, FIG-BUTTON-FIT.
  - Section 7: assembly rules, with the PCBWay order-page text quoted from layouts.md.
  - Section 8: what did not cross. The STEP files are cited only by the pinned README link; analysis code, datasheets, the socket and button candidates not chosen, and layout candidates A and C are recorded there.
  - Section 9: open items.
- docs/h7-platform/open-items.md:
  - 10 rows appended before "## Conflicts" (table contiguous, 7 cells each, 96 rows, no duplicate ids).
  - STACK-HEIGHT-CONFIRM extended: the 15.17 mm stack and margins; that envelope.md took 13.89 mm as the owner's acceptance; R-54's "still fits and is reported" with no owner response in the sources; envelope.md and R-54 added to its Source cell.
  - One Ported-from bullet added (envelope.md, controls.md, layouts.md).
- verify.sh: check_mechanical with dispatcher and ALL_CHECKS entries. The file must exist and contain 1590BB, "stack height" and layout-B.svg (fixed strings), and the whole word "six" (grep -w, so "sixty"/"sixth" do not satisfy it).

## RED and GREEN

RED (before the document existed):
```
FAIL mechanical: [missing docs/h7-platform/mechanical-and-controls.md]
PASS effective
PASS provenance
PASS nocode
exit=1
```
GREEN:
```
PASS mechanical
PASS effective
PASS provenance
PASS nocode
PASS openitems
PASS decisions
PASS architecture
PASS power
PASS analog
PASS bypass
PASS firmware
PASS bytes
exit=0
```
Mutation test of check_mechanical on a scratch copy of the tree (the repository was not touched):

| Case | Result | exit |
| --- | --- | --- |
| unchanged | PASS | 0 |
| lines with 1590BB removed | FAIL (lacks '1590BB') | 1 |
| lines with "stack height" removed | FAIL | 1 |
| lines with layout-B.svg removed | FAIL | 1 |
| lines with the word six removed | FAIL (lacks the word 'six') | 1 |
| file removed | FAIL (missing) | 1 |

A script also checked the following in mechanical-and-controls.md and open-items.md:
- every relative link and anchor resolves; every reference-style link is defined and used;
- 0 control bytes;
- no forbidden drawing word (better, best, good, clean, readable, legible) appears anywhere in either file;
- every row Id the document names exists;
- every "carries"/"carry" in the document is either not an open passage or names its row.

## Open-passage count per source section against rows

Counted by reading, as Tasks 3 to 7 did. The keywords "Not verified", "Carries", "Carry" and U-status almost never appear in these sources; the open passages are worded "to confirm", "first-build check", "assumed", "not dimensioned" and "reported to the controller". 31 unique passages. 10 new rows, 1 existing row extended, 2 existing rows reused.

| Source section | Passages | Rows |
| --- | --- | --- |
| envelope.md "Owner inputs" | 3 | R-62 box match and lip band assumption -> ENCLOSURE-FIRST-BUILD; R-54's 15.17 vs 13.89 "reported to the controller" -> STACK-HEIGHT-CONFIRM (extended) |
| envelope.md section 0 | 1 | boss diameter not dimensioned -> ENCLOSURE-DRAWING-CHECKS |
| envelope.md section 1 | 9 | collar-seat holes and the Ø0.56 tail hole -> AUDIO-BOARD-MECH-LAYOUT; Mill-Max cut and lead time, and Preci-Dip fallback availability/lifecycle -> MODULE-HEADER-SOURCING; insertion check and Seed proud height -> MODULE-SOCKET-MATE; contact capacitance allowance -> I2C-RISE-AND-DEBOUNCE (reused); HRO thickness note and catalog entry -> USB-DFU-VERTICAL (reused); SSM "not re-opened" -> not rowed |
| envelope.md section 5 | 4 | jacks over the lip -> ENCLOSURE-FIRST-BUILD; jack seating held by layout -> AUDIO-BOARD-MECH-LAYOUT; USB bench note -> USB-DFU-VERTICAL (reused); trim text on the order page -> TRIM-RULES-ORDER |
| envelope.md section 7 | 3 new (+5 repeats) | FTSH shroud, PTS645 V body height, PTS645VL 60 °C cap -> MODULE-PART-HEIGHT-READINGS. The repeats (boss, R-62 first build, module insertion, Mill-Max, Seed insulator) map as above |
| controls.md section 1 | 7 | spring rate assumption, first-build check, inner nut in (b) -> CONTROLS-FIRST-BUILD; Schurter actuator diameter, Vidosic section, PBS-24-MP raster lengths -> FOOTSWITCH-PAPER-READINGS; hung board 24 × 15 provisional -> AUDIO-BOARD-MECH-LAYOUT |
| controls.md section 2 | 2 | button axes within 0.25 mm -> ENCLOSURE-DRAWING-CHECKS; button travel unprinted -> CONTROLS-FIRST-BUILD |
| controls.md section 3 | 1 | C&K PTS645SK13 "LCSC not confirmed" -> not rowed |
| controls.md section 4 | 0 new (4 repeats of section 1) | as section 1 |
| layouts.md "Still to confirm" | 1 new (+2 repeats) | PCBWay plugin exports only the active variant -> CONTROL-POSITION-VARIANTS (repeats: boss, order trim text) |
| ledger R-55, R-56, R-60, R-61, R-62 | 0 new | each repeats a passage above |
| layout-B.svg | 0 | — (a finding about the file itself is recorded in the document, section 4.3; see Concerns) |

Not rowed, with reasons:
- **The Samtec SSM socket.** R-62 says "not re-opened" and the ledger keeps it as a recorded option. It is listed under "What did not cross".
- **The C&K PTS645SK13 button candidate's unconfirmed LCSC listing.** The owner chose option A instead, so nothing depends on it.

The split spec 5.1 check that each contract pin lands on its socket position, with the footprints on the back layer, was not in the keyword count. It is named in AUDIO-BOARD-MECH-LAYOUT.

## Conflicts raised

None. Two candidates were considered and rejected:
- **13.89 mm against 15.17 mm.** The owner's O-17 words accepted a baseline with no number in it; 13.89 was the study's figure, which envelope.md "took as" his acceptance. So R-54's 15.17 does not supersede an owner decision. It is put on a Not-in-force line that says so, and the unanswered report is named in STACK-HEIGHT-CONFIRM.
- **O-17's "Hammond 1590BB" against R-62's measured (Tayda) box.** R-62 keeps the 1590BB size and the Hammond plan sizes and changes only the depths, from the owner's own measurements. It is carried as a narrowing linked from O-17 that the owner may override, which is how decisions.md carries it too.

## Labels applied, with source wording

- **O-12, O-17, O-18: owner.**
  - O-12's socket and header parts are labelled controller part choices, last set by R-61 (decisions.md O-12 "Not in force").
  - O-18's two rules are labelled as binding since he chose B ("binding since the owner chose B (2026-10-05)", layouts.md). Their figures, 4.97 mm and 1.4 mm, are labelled controller figures, set through R-54 and R-61.
  - The parts he chose on 2026-10-05 sit under O-17, as decisions.md has them: the PBS-24-MP ("this is the stomp switch actuator: ..."), a tactile switch ("should be a tactile switch… why would those be hard to source?"), and the HCTL button ("lets start with the simple option A").
- **R-56: owner for the decision.** Source: "Owner decision, quoted", "No, design for both". The realisation (Schurter LSH, 5 mm spacers, builds A and B) is labelled the controller's, matching decisions.md ("Realisation (the controller's, under that decision; the owner may override it)").
- **Controller rulings:** R-55, R-60, R-61, R-54, RR-8, R-8, R-20, R-21.
- **R-62:** a controller ruling on the owner's measurements. The measurements are carried separately as owner-supplied fact F-5 ("Owner-supplied fact"), quoted from F-5 / the ledger.
- **Owner-supplied facts:** F-1 (10 mm loft), F-2 (5 mm throw), F-3 (the Alpha as the original), F-6 (no PBS-24-MP on hand).
- **This document's readings:**
  - the "top panel" / "back plate" terminology;
  - the diff of the layout-B picture, labelled "found by this port".
- **Readings labelled as the sources' own:**
  - the FS5700 sentence, now quoted;
  - "consistent" for the jack-hole cross-check, attributed to envelope.md.
- No label was restated differently from decisions.md.

## Anchors other tasks and the decisions.md amendment may need

- **Effective constraints:**
  - #ec-enclosure, #ec-board-height, #ec-module-mounting, #ec-socket-and-header;
  - #ec-stack-height, #ec-module-usb, #ec-control-positions, #ec-layout-b;
  - #ec-lead-trim, #ec-footswitch, #ec-button, #ec-production-mounting.
- **Figures:**
  - #fig-room-under-board, #fig-heights-under-board, #fig-jacks-over-lip, #fig-jack-hole-crosscheck;
  - #fig-stack-height, #fig-seed-in-sockets, #fig-socket-tails, #fig-usb-plug-column;
  - #fig-spring-rate, #fig-rest-gap-windows, #fig-footswitch-builds, #fig-footswitch-load;
  - #fig-footswitch-depth-chain, #fig-button-fit.
- **Sections:** #43-the-layout-b-picture, #42-both-fits-on-every-position.

The figures decisions.md states bare, and where this document derives each:
- **R-62:**
  - the room figures 18.7 / 15.7 / 17.7 -> #fig-room-under-board;
  - module 3.53/2.53, Seed 2.62/1.62, jacks 0.03/−0.97, DC 4.70/3.70, relays 10.50/9.50, hung boards 7.60/6.60 -> #fig-heights-under-board;
  - 28.65 / 27.97 -> #fig-jacks-over-lip;
  - 26.34 vs 26.77 -> #fig-jack-hole-crosscheck.
- **R-61 / R-54 / RR-8 / O-12:**
  - 15.17 and 4.97 -> #fig-stack-height;
  - Seed 2.15 / 16.08 -> #fig-seed-in-sockets;
  - the 0.6 mm trim -> #fig-socket-tails.
- **R-60:** 8.11 mm and 12.85 × 7 -> #fig-usb-plug-column.
- **R-56:**
  - windows 0.80…1.22 / 0.80…1.09 and the 1.90 mm gap -> #fig-rest-gap-windows;
  - switch tops 11.80 / 14.00 and rest gaps 0.80/0.90, 1.00/0.91, ≥ 2.26 N -> #fig-footswitch-builds;
  - 8.42 N, 5.94 ×, 32.36 N, 1.55 × -> #fig-footswitch-load;
  - stack-up tips 11.00/10.90, 13.00/13.09 -> section 5.2.
- **R-55:** the Ø13.4 hole -> section 5.4. **EC-BUTTON:** the Ø4.0 hole -> #fig-button-fit.
- **O-18:** the 4.97 / 1.4 rules -> #ec-lead-trim and #fig-stack-height. Its layout-B picture -> #43-the-layout-b-picture.

## Carried items from earlier tasks

- **USB-DFU-VERTICAL** (Task 7): reused, not duplicated. It already names the thickness note, land pattern, plug column and bench note; FIG-USB-PLUG-COLUMN links it.
- **STACK-HEIGHT-CONFIRM** (Task 3 row, which already linked mechanical-and-controls.md): extended, not duplicated.
- **Already linked to this document:**
  - architecture.md line 20 (enclosure, stack height, control positions), line 129 (socket and header pair, stack height), line 230 (control-position scheme) and line 339 (controls). All of it is now present: EC-ENCLOSURE, EC-STACK-HEIGHT / FIG-STACK-HEIGHT, EC-SOCKET-AND-HEADER, EC-CONTROL-POSITIONS and section 4.2.
  - Those links carry no anchors, so no anchor was required.
- **I2C-RISE-AND-DEBOUNCE**: reused for the 2 pF socket-contact allowance.

## Edits to other tasks' text

- **open-items.md STACK-HEIGHT-CONFIRM:** text appended to its Item and Source cells. This is additive only: no existing words were changed, and its Status, Evidence and Phase cells are unchanged.
- **open-items.md Ported-from list:** one bullet appended.
- **Superseded values:** none found stated as current in architecture.md, power.md, analog.md, bypass-relay.md, processor-and-memory.md, firmware-facing-requirements.md or decisions.md. I scanned for 17.45, 3.32 mm, 3.69, 13.52, 13.89, Ø12.4, lid relief, PTS645SM43, SLW-120, TLW-120, 801-87-020, 800-10-020-10-002101, HC-TYPE-C-16P, 29.75 and 15.45; every hit is on a Not-in-force line or is the fallback. No other task's text was rewritten.

## Concerns

1. **layout-B.svg is not the exact picture the owner chose from.** The spec and decisions.md O-18 call the file "the picture he chose from". At the pin, though, it is candidate-B.svg (pedals b0e69c8, the file on screen at "I prefer B"), renamed at 216f324 and regenerated four more times by 753d63e on 2026-10-06. Diffing the two pinned files:
   - Unchanged: every control, footswitch, LED, jack and relay position.
   - Changed: the title, the module outline (55.09 to 55.12), the socket bodies, and the hung boards (12 to 15 deep).
   - Section 4.3 states this and links the b0e69c8 file by pinned link. The byte-identical record was not touched.
   - The controller may want decisions.md O-18 (and the README, Task 12) to say "the chosen layout as the S1 rulings left it" rather than "the picture he chose from". I did not edit decisions.md.
2. **R-54 reported the 15.17 mm stack, and the sources record no owner response.** It is 1.28 mm taller than the 13.89 mm the study took as his acceptance. I carried this as a fact in STACK-HEIGHT-CONFIRM and did not add an owner question. The controller decides whether it needs one: the owner's words named no number, and the stack still fits.
3. **The ¼ in jacks are −0.97 mm after the 1 mm tolerance.** They are accepted on the owner's reference pedal (R-62), not on arithmetic. This is stated plainly in FIG-JACKS-OVER-LIP and ENCLOSURE-FIRST-BUILD.
4. **Production mounting (O-17, deferred by the owner) has an EC entry but no open-items row.** None of the four phase values fits "after a working board exists". Flagged in case the controller wants a row.
5. **Phase assignments are mine.**
   - ENCLOSURE-FIRST-BUILD, MODULE-SOCKET-MATE and CONTROLS-FIRST-BUILD are bring-up, reading "first build" as bring-up.
   - MODULE-HEADER-SOURCING and MODULE-PART-HEIGHT-READINGS are phase 2 (before the contract freeze, like CONTRACT-FREEZE).
   - FOOTSWITCH-PAPER-READINGS is phase 2.
   - Enclosure drawing, board layout, trim order and variants are phase 4.
6. **decisions.md GAP candidates, for the amendment dispatch:**
   - F-5 says "Used by: R-62" only. FIG-JACKS-OVER-LIP and FIG-JACK-HOLE-CROSSCHECK also use it, and could be linked.
   - The owner's 2026-10-05 question "how will the hung boards be attached? Soldered headers?" is a question, not a decision, so it is not missing.

## Fix round 1 (commit 966628f)

h7-platform port: mechanical-and-controls.md review fixes

Important: the 15.17 mm stack was said to have been "reported" with "no
owner response". The sources say envelope.md's Owner inputs: "Reported
to the controller." The split spec (section 5.1, section 13.1) requires
the stack height and envelope to be reported to the owner, and no source
shows that happened. The text now says so and quotes R-54's own sentence.
New row STACK-HEIGHT-OWNER-REPORT (phase 2) covers the 15.17 mm stack and
the 4.97 mm connector-face limit. STACK-HEIGHT-CONFIRM stays phase 4 and
points to it. This is not a conflict: O-12 fixes no number, and 15.17 fits.

Accuracy:
- The 1.4 mm figure in O-18's rules is the HCTL button's lead (3.0 - 1.6,
  split spec 5.1.2 rule 2), a part the owner chose. Only 4.97 mm is set
  through R-54/R-61.
- "Hammond 1590BB, landscape" and "The enclosure must allow the stacking
  height" are no longer quoted as the owner's words. They are attributed
  to envelope.md and the split spec.
- layout-B.svg is described as the record of layout B, the layout the
  owner chose. It was last regenerated at 753d63e, before 9693f7d
  (R-60, R-61) and a705f7f (R-62), each of which leaves layout B as it
  was. Commit times were checked in pedals.
- EC-PRODUCTION-MOUNTING says it is an owner deferral that returns to him
  after bring-up, with no row because no phase of this programme closes it.

Rows: 1 new (STACK-HEIGHT-OWNER-REPORT); STACK-HEIGHT-CONFIRM text
amended.

Command: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh mechanical openitems effective provenance nocode decisions architecture power analog bypass firmware bytes
Output: PASS for all 12 checks (mechanical, openitems, effective, provenance, nocode, decisions, architecture, power, analog, bypass, firmware, bytes); exit=0.
Also: links and anchors resolve, 0 control bytes, no forbidden drawing word, 97 rows with no duplicate ids. Concern 2 of the original report is superseded by this fix.
