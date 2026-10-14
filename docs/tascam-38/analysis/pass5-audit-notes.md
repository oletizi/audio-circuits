# Pass 5 audit of earlier Tascam 38 notes against the authorities

Authorities used (paths relative to `docs/tascam-38/`):

- `interface-matrix.csv` (cited as **M L<n>**, the file line; L2 = J101-1 ... L51 = J108-4). 38 VERIFIED, 12 UNRESOLVED, 0 CANDIDATE, 0 CONTRADICTED.
- `circuit-analysis.md` (cited as **CA L<n>**).
- `sources/README.md` (cited as **SR L<n>**).
- Supporting detail where the authorities summarise: `analysis/block-reproduce-output.md` (**BRO L<n>**), `analysis/block-record-bias-erase.md` (**BRB L<n>**).

Facts that recur below, stated once:

- **Source identity (SR L8-18, L34-36).** There are two committed high-resolution drawings, each one page: `sources/tascam-38-amplifier-schematic.pdf` (was `p2(1).pdf`, SHA-256 now `4cd49610...`) and `sources/tascam-38-transport-schematic.pdf` (was `p1(1).pdf`, now `2133794b...`). The hashes `fda7f796...` (p2) and `cd656f66...` (p1) belong to the files *before* the owner rotated them, and no longer identify anything in the repository. There is no "sheet 2" of the amplifier drawing. Nothing is kept in a "ChatGPT Library". The lower-resolution two-sheet `Tascam 38 Complete schematics (High quality scan).pdf` is **not** an authority and is not in the repository. The owner's worksheet is committed as `sources/tascam-38-junctions.csv` (SR L25-32), and it is a hypothesis set.
- **Status (CA L10-11).** All 50 contacts are traced on both sides by two independent tracers: 38 VERIFIED, 12 UNRESOLVED. Eleven of the 12 show no wire on either side (C08/C09/C13), and J108-1 depends on the C17 crossing. So "no contact verified", "the scan is too dense or too low-resolution to trace the motherboard" and "next: trace each contact" are all stale.
- **K101 coil (M L2-3, CA L151).** J101-2 is the **top** end of the coil, the one annotated 24V, and it is driven from P180-2 (OUT SELECT). J101-1 is the **bottom** end of the coil plus the D101 anode, and it is grounded on the motherboard (P171-7 0V). J101-1 is not a common return on the card, and the 24V end is the switched control line, not a fixed supply.
- **J101-3 (M L4)** is a reproduce-head lead (P121 lower contact) that is tied to the card common bus. Its class is `head`, not ground.

---

## 1. alternate-amplifier-scan-sheet-2.md

**Contradicted statements**

- L1 `High-resolution Tascam 38 amplifier schematic — primary sheet` and the filename `...-sheet-2`: the drawing is the single-page amplifier sheet. There is no sheet 2 (SR L8, L13-14).
- L8 `SHA-256: fda7f796...`: this is the pre-rotation hash. The current identity is `4cd4961067d8...` (SR L8, L15-18).
- L6-7 (page size `1260 × 2160 points`, `19,379,019 bytes`): these describe the pre-rotation file. The committed file is 5250 x 9000 px at 300 ppi (SR L8).
- L9 `Persistent source: ChatGPT Library /Tascam 38/Tascam 38 amplifier schematic - sheet 2.pdf`: the file is committed at `sources/tascam-38-amplifier-schematic.pdf` (SR L8).
- L10 `Related scan: /Tascam 38/Tascam 38 amplifier schematic - 300dpi.pdf (uploaded earlier as p1(1).pdf)`: p1(1).pdf is the **transport** schematic (SR L9, L14).
- L11 `The PDF binary is preserved in Library; this GitHub file is only its manifest.`: the binary is in the repository (SR L8).
- L13 `Use this sheet alongside the first high-resolution scan`: this implies two amplifier sheets. There is one amplifier sheet and one transport sheet.

**Unique content:** none. The pre-rotation byte count and page size identify a file that no longer exists in that form.

**Recommendation: DELETE.**

---

## 2. alternate-amplifier-scan.md

**Contradicted statements**

- The filename `alternate-amplifier-scan.md` mislabels the content. This is the transport scan (SR L9, L14). The body (L4) correctly says transport.
- L8 `SHA-256: cd656f66...`: this is the pre-rotation hash. The current identity is `2133794b11d7...` (SR L9, L15-18).
- L7 `PDF size: 24,279,056 bytes`: the pre-rotation file.
- L9 `Persisted in ChatGPT Library: /Tascam 38/Tascam 38 tape transport schematic - 300dpi.pdf`: the file is committed at `sources/tascam-38-transport-schematic.pdf`.
- L10 `GitHub repository contains this manifest, **not the PDF binary**.`: the binary is in the repository.

**Unique content:** none.

**Recommendation: DELETE.**

---

## 3. amplifier-card-interface.md

**Contradicted or stale statements**

- L3 `Status: **Partial schematic review; connector-level electrical pinout NOT verified**`: 38 of 50 contacts are VERIFIED and 12 are UNRESOLVED with reasons (CA L10-11).
- L7: the source is the 12-page manuals.plus PDF, which is not an authority. The authority is `sources/tascam-38-amplifier-schematic.pdf` (SR L8; CA L9). L11-15 cite page numbers in that non-authoritative PDF.
- L20 `Electrical function, polarity ... and signal direction of *each* card contact` listed as not verified: this is now done for 38 contacts in the matrix, and relay polarity is in CA L149-159.
- L28 `High-resolution crops or direct access to a readable full-size amplifier schematic`: done. The drawing is committed (SR L8).
- L30 `Trace connector contact numbers from card to motherboard and log all nets`: done (the matrix).

**Unique content**

- The URL of the 12-page manuals.plus PDF (L7). This is minor provenance. The interface-analysis plan L17 already lists manuals.plus.
- The physical-evidence asks (L29, L31, L32: photograph the card, measure its dimensions, define a bench dummy procedure) are still valid but are already covered by plan `2026-10-12-tascam-38-interface-analysis.md` Task A (L43-44), Task B (L54) and Task D (L66-70).
- The owner's confirmation that all eight cards are interchangeable (L15) is already recorded in the spec L17 and the electrical plan L12.

**Recommendation: DELETE.** Optionally add the manuals.plus PDF URL to the "Not in the repository" list in `sources/README.md`.

---

## 4. amplifier-interconnect-trace.md

**Contradicted or stale statements**

- L3 `Source: user-supplied *Tascam 38 Complete schematics (High quality scan).pdf*, **page 1**`: this is the lower-resolution scan, not the authority (SR L36).
- L15 `| J106 | P106 | 7,6,5,4,3,2,1 | High | Partial |`: J106 has 8 contacts (M L33-40). The table therefore implies 49 contacts, and the correct total is 50.
- L3 `PARTIAL TRACE — not a complete pinout` and L44 `Do not infer a complete pinout from this pass.`: superseded by the matrix (38 VERIFIED).
- L26 `Exact contact-to-head mapping needs tracing at full magnification.`: done. The reproduce head is on J101-3/-4 via P121 (M L4-5).
- L28 `**Reproduce equalization and output:** The signal chain includes **U102**`: U102 is the input buffer and record amplifier, not part of the reproduce chain. Reproduce uses U101 (CA L34-35, L76-87).
- L35-40 (work required): the contact tracing is done (matrix), and the mode table is done (CA L210-247).
- L48 (Next artifact table): done. `interface-matrix.csv` exists, with the schema from the electrical-analysis plan.

**Unique content:** none.

**Recommendation: DELETE.**

---

## 5. audio-control-topology-2026-10-13.md

**Contradicted or stale statements**

- L7 `Q110 (INPUT), Q106 (SYNC) and Q105 (REPRO) are drawn as controlled branches between the audio/control network and a lower common bus ... They should **not** be modeled as three ordinary series switches selecting among three independent input wires. The topology is consistent with shunt gating/muting`: wrong. They are series N-JFET selection switches whose outputs join at the select node (6543, 1109) and feed U101 2/2 (CA L91-94; BRO L150). The shunt mute is Q107 (CA L86, L153).
- L11 `The U103 circuit shows a 15V supply, a 100pF input capacitor C134`: C134 is not an input capacitor. It is a 100p trimmer from U103's AC65V output node onto the head lead J106-7, and it is the bias-injection and bias-set element (CA L124-125; BRB L60).
- L15 `These are component-level observations, not proof of the 50 contact-to-contact motherboard routes. The precise shunt-device polarity, K102 and K103 timing ... remain to be resolved`: stale. The routes are in the matrix. Gate polarities are in CA L149-159. K102's ~0.5 s delay and the bias's ~0.15 s delay are computed in CA L206-208 and L234 (open as M6).
- L3 cites `p2(1).pdf`, the old name. The file is now `sources/tascam-38-amplifier-schematic.pdf`.

**Unique content:** none. TP2/TP3 are covered in BRB L205-206 and L260.

**Recommendation: DELETE.**

---

## 6. card-side-contact-trace.md

**Contradicted statements**

- L3 `uploaded *Tascam 38 Complete schematics (High quality scan).pdf*, amplifier sheet 1`: this is the lower-resolution scan, not the authority.
- L9 `| J101-1 | Conductive trace rises into the heavy common-return bus under TR101/input stage | Card-side ground/common **verified** |`: refuted. J101-1 is the K101 coil bottom end and the D101 anode (M L2).
- L10 `| J101-2 | Conductor rises to the lower end of K101 coil / D101 suppression diode branch. K101 coil upper end marked 24V. | ... motherboard control endpoint remains candidate J180-2 |`: refuted. J101-2 **is** the coil top end, the one annotated 24V, with the D101 cathode. It is VERIFIED to P180-2 (M L3).
- L11 `| J101-3 | Conductor rises to common-return bus alongside J101-1 | Card-side ground/common **verified** |`: J101-3 is on the upper common bus but it is a reproduce-head lead to P121 (M L4). J101-1 is not alongside it.
- L12 `motherboard route to P121 still requires uninterrupted conductor trace`: done. VERIFIED to the P121 upper contact, reaching TR101 only through K101 (M L5).
- L14 `Do not assume which coil polarity energizes it until the motherboard-side return/control is traced.`: resolved. The coil is energised when P180-2 drives positive and J101-1 is on 0V (CA L151).
- L23 `**R101 510Ω**` and `**C102 100pF**`: R101 is 10 ohms and C102 is 100u (100/10V) (CA L78, L82; BRO L83, L95).
- L30-33 (next checks): all done. P101-4 to P121 (M L5); P106-7 to P151 (M L39); P101-2 = P180-2 (M L3); J102-5 goes to J105-1 over the motherboard U-link (M L10, L26); the no-wire contacts are UNRESOLVED C08/C09/C13.

**Unique content:** none. L18 (J106 has 8 contacts, 50 in total) is correct and is already in the matrix.

**Recommendation: DELETE.**

---

## 7. connector-reconciliation-pass3.md

**Contradicted or stale statements**

- L3 `user-uploaded two-sheet Tascam 38 schematic, amplifier sheet 1`: the lower-resolution scan, not the authority.
- L7 `The owner's worksheet independently contains J106-8, described as ground; the ground assignment is **not independently verified**.`: resolved. J106-8 is the second SYNC HEAD lead (P151 upper contact), and the worksheet's GND reading is refuted (M L40).
- L11 `**J101:** pins 1/3 ground`: J101-1 is the K101 coil bottom (grounded only on the motherboard). J101-3 is a reproduce-head lead (M L2, L4).
- L12 `pin 4 OUT SELECT common-off J180-4`: J102-4 is on P180-3 (M L9). Same line, `pin 5 candidate connection to J105-2`: J102-5 is the same card node as J102-2 and goes over the motherboard U-link to P105-1 only (M L10).
- L13 `pins 4/6 and erase association ambiguous`: J103-4 and J103-6 are both on P181-3 (OUT SELECT REPRO). J103-4 is not an erase connection (M L16, L18).
- L15 `pin 6 oscillator J182-5`: J105-6 is the -15V rail. J182-5 is the oscillator's -15V supply pin, not an oscillator signal (M L31). Same line, `J105-1 vs J105-2 discrepancy remains`: resolved (M L10, L26).
- L16 `pins 2/5/6/8 proposed grounds`: J106-2 is the second line-input conductor (P141-2) and reaches no motherboard 0V. J106-8 is a sync-head lead. Only J106-5 and J106-6 are 0V (M L34, L37-40).
- L18 `**J108:** pin 1 ground`: UNRESOLVED (C17, M L48).
- L24-29 (next tracing priorities): all done.

**Unique content:** none. Every worksheet hypothesis quoted here is now judged in the matrix notes column.

**Recommendation: DELETE.**

---

## 8. consolidated-electrical-analysis.md

**Contradicted or stale statements**

- L3 `**contact-by-contact electrical verification NOT complete**`: 38 VERIFIED, 12 UNRESOLVED (CA L10-11).
- L5 `**Primary drawing:** user-supplied Tascam 38 Complete schematics (High quality scan).pdf, page 1`: the primary drawing is `sources/tascam-38-amplifier-schematic.pdf`. The lower-resolution scan is not in the repository (SR L8, L36).
- L7 `owner's Tascam 38.xlsx / Junctions ... preserved in ChatGPT Library`: committed as `sources/tascam-38-junctions.csv` (SR L25-32).
- L35 `**Still unresolved:** the exact pin on the amplifier card receiving each head conductor ... The owner's J101-4, J106-7, and J108-2/3 hypotheses are useful test points, not proven endpoint assignments.`: the head endpoints are VERIFIED. J101-3/-4 go to P121, J106-7/-8 to P151, and J108-2/-3 to P161 (M L4-5, L39-40, L49-50). Winding polarity and shield termination remain open (C12, C20).
- L42 `Line output, K102 power mute, meter route` (J102 hypothesis): acceptable as a hypothesis column. L45 `| J105 | ... | Meter, oscillator, +15 V |` is wrong: J105 carries no oscillator signal. J105-6 is -15V (M L31).
- L50 `**none of the 50 detailed owner net assignments has yet been fully checked end-to-end against both sides of the drawing**`: stale (38 VERIFIED).
- L76 `The precise K101 state in REPRO versus other modes is **not verified**.`: K101 is driven only when SYNC is pressed (CA L174-176, L199-204). Only the drawn-state question remains (A1).
- L82 `Its relationship to the record/sync head and mode selection must be traced`: resolved. K103 switches J106-7 between sync pickup and record/bias drive (CA L133-142; M L39).
- L90 `The worksheet is internally inconsistent about whether J102-5 joins J105-1 or J105-2. Until the meter/output branch is traced, do not tie these pins together.`: resolved. J102-5 to P105-1 over the motherboard U-link, so the meter is fed after K102 (M L10, L26; CA L97-101).
- L98 `Owner proposes **J105-6** connected to MASTER OSC J182-5 ... The J103-4 note also mentions the erase head, which may be a misidentification or a shared connection.`: J105-6 is the -15V rail. J103-4 is an OUT SELECT line to P181-3, not erase (M L16, L31).
- L104-123 (register table): the "Required resolution" column is stale for every item that is now resolved. Rows C02, C03, C04, C05, C07, C13 are resolved per L125. C14 is resolved per L127. C01 is resolved per its own row. C06 is resolved (M L2-3; CA L151). C08 and C09 now read "no wire on either side, physical check needed" (M L12-13, L46). C15 is resolved, because every rail is now identified by its P171 route (M L17, L30-31, L35-36, L42-44). C16 is resolved, because J104-3 is on P174-1 (M L21). C18 and C19 are carried as caveats on VERIFIED rows (M L23, L30). C11 is resolved as to connection, since J106-5 and J106-6 go to P171-11 (M L37-38). Only C10, C12, C17 and C20 are still open in substance.
- L117 (C14 row) `No card contact reaches the Q110/Q106/Q105 selection network`: refuted by L127 itself and by CA L154-156, but the row still states it as the issue.
- L138 `Resolve all C01–C12 issues`: should name the items still open (C12, C17, C20, and C10 if it is kept).
- L142-146 (section 8): `**NOT completed:** an electrical endpoint mapping for each of the 50 card contacts ... the dense motherboard trace crossings and junctions have not been independently followed for every pin` and `Next concrete action is a high-resolution **contact-by-contact continuity trace**`: both are done (Pass 1, Pass 2 and the independent re-trace; CA L10-11).

**Unique content (must not be lost)**

- **The C01-C20 uncertainty register (L100-127) is the only place where the `uncertainty_id` codes used in `interface-matrix.csv` are defined.** The matrix cites C02, C03, C04, C06, C07, C08, C09, C11, C13 to C20, and CA L262 cites C17. No other file in `trace/`, `analysis/` or the authorities defines them.
- The board-level decomposition (L13-23) and the head-connector families P401-P403/J401-J403 and J122-J128, J152-J158, J162-J168 (L29-33).
- The full P171/J171 pinout (L54-68), including P171-1 `6V` and P171-2 `0V`, which no authority records. The matrix and CA name only P171-3 to -11.

**Recommendation: KEEP-AND-CORRECT.** A cleaner end state is to move section 6 (the register) and the P171 table into `circuit-analysis.md`, update the matrix's references, and then delete this file. Until that happens, it must stay. Corrections:

1. L3: change the status to "Superseded as a narrative by `circuit-analysis.md` and `interface-matrix.csv`. Kept for the C01-C20 register (section 6), the board inventory (section 1), the head families (section 2) and the P171 pinout (section 4)."
2. L5 and L7: cite `sources/tascam-38-amplifier-schematic.pdf` and `sources/tascam-38-junctions.csv`. Demote the lower-resolution scan to "corroboration, not in repository".
3. L35, L50, L76, L82, L90, L98: replace with the resolved facts listed above, citing the matrix rows, or delete these sentences and point to CA.
4. L45: change "Meter, oscillator, +15 V" to "Meter feed, ±15 V".
5. Register: add a `Status` column (Resolved / Open) and fill it from the matrix as listed above. Reword C14's issue as historical. Fold the L125-127 "outcomes" paragraphs into that column.
6. L138: name the still-open items.
7. Section 8 (L140-146): replace with the current counts (38 VERIFIED / 12 UNRESOLVED) and point to CA's open items (A1-A11, M1-M7), or delete the section.
8. Optionally add to section 4 the unique P172/J172 sentence from head-routing-trace.md L29, and to section 2 the shield-bus sentence from head-shield-return-network.md L10 (see 13 and 14 below).

---

## 9. electrical-trace-audit-2026-10-13.md

**Contradicted statements**

- L7 `J101 card-side observations: pin 1 return, pin 2 K101 coil/D101 suppression circuit, pin 3 return`: pin 1 is the K101 coil bottom end and the D101 anode, and is a return only on the motherboard side (M L2). Pin 3 is a reproduce-head lead (M L4).
- L9 `Outstanding: verify head signal and erase routes, power and mute controls, and J102-5 versus J105-1/J105-2 conflict.`: all done (M L4-5, L8, L10, L19, L26, L30-31, L39-40, L49-50).
- L3 cites `p2(1).pdf`, the old name.

**Unique content:** none.

**Recommendation: DELETE.**

---

## 10. function-switch-distribution.md

**Stale statements**

- L11 `Status: block-level topology traced; per-contact control voltage and switching truth table not yet established.`: done. CA L185-208 gives the control sources and OUT SELECT table, CA L210-247 the operating modes, and `analysis/control-function.md` covers poles A/B/C and the FUNCTION LED PCB.
- L3 cites `p2(1).pdf`, the old name.

**Unique content:** none. The "three stacked switching elements" are the ganged poles A/B/C in `analysis/control-function.md` L36-39.

**Recommendation: DELETE.**

---

## 11. github-write-test-2026-10-13.md

This is a three-line connector write test with no technical content.

**Recommendation: DELETE.**

---

## 12. head-routing-trace.md

**Contradicted or stale statements**

- L3 `uploaded **Tascam 38 Complete schematics (High quality scan).pdf**, sheet 1`: the lower-resolution scan.
- L21 `**J106/P106 (7)**` and `These 21 contacts are **not** yet assigned signal names.`: J106 has 8 contacts, so the group has 22, and all 22 now have assigned endpoints (M L2-5, L13-18, L33-40, L48-51).
- L17 `do not infer a separate physical record head solely from this label.`: superseded by Pass 3. The SYNC HEAD is switched by K103 between sync pickup and record/bias drive, so it is the sync/record head. CA L49 and L133-142 mark this as interpretation.
- L33-37 (unresolved segments 1-5): all done (matrix).
- L39-41 `The full-size drawing contains dense crossings, and the cropped overview does not reliably distinguish all junctions.`: all 50 contacts are traced on the high-resolution drawing. Only the C17 crossing remains ambiguous (M L48).

**Unique content:** L29, `**P172/J172** is a distinct two-contact connector next to P171/J171; its electrical identity is not assigned in this pass.` No authority, trace or analysis file mentions P172. The head families (L11-15) and the P171 list (L28) duplicate consolidated-electrical-analysis.md sections 2 and 4.

**Recommendation: DELETE**, after carrying the P172 sentence into consolidated-electrical-analysis.md section 4 (or into CA).

---

## 13. head-shield-return-network.md

**Stale statements**

- L12 `The detailed winding polarity and the exact J101/J106/J108 contact endpoints still need verification.`: the endpoints are VERIFIED (M L4-5, L39-40, L49-50). Polarity is still open.
- L3 cites `p2(1).pdf`, the old name.

**Unique content:** L10, `A vertical conductor on the HEAD PCB joins the shield/return symbols at J401, J402 and J403. This is a common **head-board shield/return network**, distinct from the separately drawn head winding conductors.` No authority, trace or analysis file records this. It bears on open item C12.

**Recommendation: DELETE**, after moving the L10 observation into consolidated-electrical-analysis.md section 2 or the C12 row. If that move is not made, the file is KEEP-AND-CORRECT, and L12 is the only correction it needs.

---

## 14. high-resolution-playback-mode-trace.md

**Contradicted or stale statements**

- L7 `24V is marked at the upper relay-coil supply.`: the 24V-annotated upper end is J101-2, the switched drive from P180-2, not a supply. The lower end, J101-1, is grounded (M L2-3; CA L151).
- L10 `The following circuitry includes **Q112**, a relay **K102** supplied from 24V and diode **D210** across its coil.`: the diode is **D120** (M L8-9). The K102 coil is fed from P180-3 (OUT SELECT) and sunk through POWER MUTE (P171-3), not from a fixed 24V (M L8-9; CA L152). Q112 is in the meter amplifier, which is fed after K102 via J102-5 and J105-1 (CA L97-101), not in the output or mute stage.
- L17 `The full motherboard-side end-to-end mapping remains incomplete.`: stale (matrix).
- L21-26 (checklist for the next pass): all done, including the J102-5/J105 question (M L10, L26).

**Unique content:** none. U101 pin numbers are in BRO L89-91, and the connector order and counts (L13) are in the matrix and the electrical plan L58-62.

**Recommendation: DELETE.**

---

## 15. high-resolution-scan-audit.md

**Contradicted or stale statements**

- L7 `p1(1).pdf, SHA-256 cd656f66...` and L8 `p2(1).pdf, SHA-256 fda7f796...`: the identifications (transport and amplifier) are correct, but the hashes identify the pre-rotation files. The current identities are `2133794b...` and `4cd49610...` (SR L8-9, L15-18).
- L10 `Both files are preserved in Library, but their **Library filenames are misleading**. Use their hashes and this corrected manifest to identify them.`: the files are committed under correct names in `sources/`, and SR is the manifest.
- L16 `**J108/P108 pin 4** has a long trace ... joining the common bus near J107/P107 ... The downstream oscillator connection proposed by the owner's spreadsheet is plausible but **not yet verified end-to-end**.`: VERIFIED to P182-8 (MASTER OSC) (M L51).
- L17 `the precise J105 destination requires following the loop ... do not select J105-1 or -2 by proximity.`: resolved. P105-1 only (M L10, L26).
- L29 `**Not verified:** all 50 contact endpoints, full coil switching truth table, bias/erase signal direction and return paths`: done (matrix; CA L118-142, L149-159, L210-247).
- L31-33 (next systematic step): done.

**Unique content:** none. The P172 mention in L19 is the same fact as head-routing-trace.md L29.

**Recommendation: DELETE.**

---

## 16. j102-j105-trace.md

**Contradicted statements**

- L5 `Card-side trace: J102 pin 5 joins J105 pin 2.`: refuted. J102-5 is the same card node as J102-2 (the K102 fixed contact). J105-2 has no wire on either side (M L10, L27).
- L9 `This resolves the apparent disagreement in the owner's worksheet: one entry describes a card trace, the other describes a motherboard trace.`: this reasoning rests on the refuted card-side link.
- L3 cites `p2(1).pdf`, the old name.
- L7 (P102-5 to P105-1) is correct (M L10, L26).

**Unique content:** none.

**Recommendation: DELETE.**

---

## 17. mode-and-net-reconciliation.md

**Contradicted or stale statements**

- L8 `The K101 relay coil is drawn across a 24 V feed and a separately routed control return`: backwards. The 24V-annotated end (J101-2) is the switched control from P180-2, and the other end (J101-1) is grounded at P171-7 (M L2-3).
- L19 (J102-5 / J105-1 / J105-2): resolved (M L10, L26).
- L20 `J103-4 references both erase head and J108-3 ... Treat this as one possible multi-terminal net`: J103-4 is OUT SELECT P181-3, joined to J103-6 on the motherboard. It is not erase and not J108-3 (M L16, L18).
- L28 `**Current gate:** The full end-to-end 50-contact netlist remains unverified.`: stale. 38 are VERIFIED and 12 UNRESOLVED with reasons.

**Unique content:** none. L11 (K103 means a reproduce-only card needs a defined record-head state) is covered by CA L133-142 and L239-240.

**Recommendation: DELETE.**

---

## 18. p107-2-p104-7-motherboard-link.md

**Contradicted statements**

- L5 `The enlarged motherboard drawing shows a conductor running from P107 contact 2 to P104 contact 7, with a visible connection at the P104-7 vertical conductor.`: refuted. There is no wire on P104-7 on either side, and P107-2 is on the 24V net only (M L25, L42).
- L7 `The schematic connection is evidence that **P104-7 is not an isolated unused motherboard contact**.`: refuted by the same rows.
- L9 `Next: trace the matching J104-7 card-side node and P107-2 to P171/J171 supply.`: done. J104-7 has no card wire, and P107-2 goes to P171-8 24V (M L25, L42).
- L3 cites `p2(1).pdf`, the old name.

**Unique content:** none.

**Recommendation: DELETE.**

---

## 19. p107-p104-return-trace.md

**Contradicted statements:** none in substance. L5 (P107-1 joined to P104-6) agrees with M L24 and L41, both of which put it on the P171-7 0V net. L3 cites `p2(1).pdf`. L7 (`their card-side wiring is a separate tracing task`) is stale: both sides are VERIFIED.

**Unique content:** none.

**Recommendation: DELETE.**

---

## 20. p108-p107-p104-common-return.md

**Contradicted statements**

- L7 `The motherboard conductor from P108 contact 1 turns right and continues horizontally. A junction dot joins it to the vertical conductor from P107 contact 1.` and L9 `the schematic depicts a common net joining **P108-1, P107-1 and P104-6**.`: refuted as a verified join. P108-1 runs down to the y~3730 meter-ground bus, which reaches 0V only through the crossings at (4141, 3730) and (4242, 3730), and those are not settled. The row is UNRESOLVED (C17), and a continuity check is required (M L48; CA L262).
- L15 `The owner's worksheet calls all three contacts ground/return, consistent with this trace.`: holds only for P107-1 and P104-6 (M L24, L41).
- L19 `Status: motherboard-side conductor verified by visual trace.`: refuted for P108-1.
- L17 (the caution against inferring P107-3 to P105-6) is correct. That join is refuted (M L31, L43).

**Unique content:** none.

**Recommendation: DELETE.**

---

## 21. power-control-bus-trace.md

**Contradicted statements**

- L3 `user-uploaded *Tascam 38 Complete schematics (High quality scan).pdf*, **sheet 1 (amplifier)**. Source SHA-256 b9d7cb5f...`: the lower-resolution scan, not the authority.
- L31 `**J106/P106 (7)** ... totaling **49**. They are not 49 verified net assignments.`: J106 has 8, so the total is 50 (M L33-40).
- L37-40 (next tracing work): done.

**Unique content:** none. The P171 table (L9-21) and head families (L27) duplicate consolidated-electrical-analysis.md sections 2 and 4.

**Recommendation: DELETE.**

---

## 22. power-control-bus.csv

**Contradicted statements**

- L2-12, `source` column, `Amplifier schematic sheet 1`: this is the lower-resolution scan's page numbering. The authority is the single-sheet `sources/tascam-38-amplifier-schematic.pdf`. The eleven labels themselves agree with every P171 reference in the matrix.

**Unique content:** a machine-readable P171 pinout. Nothing reads it (no repository references, and the validator reads only `interface-matrix.csv`). The same table is in consolidated-electrical-analysis.md section 4.

**Recommendation: DELETE**, provided consolidated section 4 (or CA) keeps the full P171 list.

---

## 23. prior-connector-analysis-review.md

**Contradicted or stale statements**

- L3 `Persisted original in ChatGPT Library: /Tascam 38/Tascam 38 connector analysis.xlsx`: the worksheet is committed as `sources/tascam-38-junctions.csv` (SR L25-32). Same line, `the user-uploaded two-sheet high-resolution Tascam 38 schematic`: the high-resolution drawings are two separate single-page files, amplifier and transport. The "two-sheet" scan is the lower-resolution one (SR L8-9, L36).
- L17 `| J102-4 | J180-4 common OFF, 24 V |`: P180-3 (M L9).
- L22 `| J105-6 | J182-5 master oscillator |`: the -15V rail. J182-5 is the oscillator's -15V supply pin (M L31).
- L34, L36, L37, L38, L40, L42 (open checks for J102/J105, J103-4 erase, J103-6, J101-2, J181-3, J106-8): all resolved (M L10, L26; L16, L18; L3; L16, L18; L40).
- L39 `J180-1 vs J107-2: Worksheet reports shared +24 V`: confirmed. P180-1 is on the J107-2 24V net (M L42).

**Unique content:** worksheet row and cell references (rows 5-67, cells C22, C24, D23) and the "80 rows, 27 columns" shape. All of these can be recovered from `sources/tascam-38-junctions.csv`, which has 80 lines.

**Recommendation: DELETE.**

---

## 24. relay-diode-correction.md

**Contradicted statements:** none. D120 is right (M L8-9).

**Unique content:** none. It only corrects high-resolution-playback-mode-trace.md, which is also recommended for deletion.

**Recommendation: DELETE.**

---

## 25. reproduce-front-end-detail.md

**Contradicted statements**

- L3 `Tascam 38 two-sheet high-quality schematic, **amplifier sheet 1**`: the lower-resolution scan.
- L7 `The upper supply to the coil is labeled **24V**. The lower coil terminal continues into the mode-control wiring.`: backwards. The lower terminal (J101-1) goes to 0V, and the 24V-annotated upper terminal (J101-2) is the mode-control line from P180-2 (M L2-3). Same line, `Exact actuation polarity at the card connector is not yet confirmed.`: resolved (CA L151).
- L9 `**R101 510**` and `**C102 100p**`: R101 is 10 ohms and C102 is 100u (100/10V) (CA L78, L82; BRO L83, L95).
- L22 `The owner worksheet proposes J101-2 and J101-4 respectively; ... the complete motherboard trace to those contacts has not yet been independently established.`: both are VERIFIED (M L3, L5).

**Unique content:** the "engineering consequences" L15-18 are generic replacement-design cautions. They are covered by the spec L35 and are outside CA's analysis scope (CA L4-6). No unique circuit facts.

**Recommendation: DELETE.**

---

## 26. right-motherboard-conductor-trace.md

**Contradicted statements**

- L8 `**P107-3 and P105-6** appear on a shared horizontal conductor in the enlarged region.`: refuted. P107-3 is +15V (P171-9) and P105-6 is -15V (P171-10) (M L31, L43).
- L15 `The card-side J102-5 to J105-2 conductor is separate, as documented in j102-j105-trace.md.`: refuted (M L10).
- L7, L9, L10 and L11 agree with the matrix (M L24, L41; L21, L47; L10, L26; L25, L11-12).
- L3 cites `p2(1).pdf`, the old name.

**Unique content:** none.

**Recommendation: DELETE.**

---

## 27. source-manual.md

**Contradicted or stale statements**

- L8 `Persisted copy: ChatGPT Library /Tascam 38/Tascam 38 Complete schematics (High quality scan).pdf`: the repository keeps no copy and names no store for it (SR L34-36).
- L9 `GitHub PDF binary: **not yet committed**. GitHub connector available in this session supports UTF-8 text writes; container git network access fails DNS.`: this describes a stale execution environment. The file being absent from the repository is correct (SR L36), but that is by choice. The high-resolution drawings replaced it.
- The note is framed as "original schematic source", but this scan is not the authority (SR L3-9).

**Unique content:** the identity of the lower-resolution scan: SHA-256 `b9d7cb5f16964db0def11d54ae059681e07d02f86720e102469009b2d5ccea69`, about 2.2 MB, 2 pages, scan credited to peel.dk. SR L36 names the file but gives none of these.

**Recommendation: DELETE**, after adding the hash, the peel.dk credit and "2 pages" to the "Not in the repository" bullet at SR L36.

---

## 28. verification-gate.md

**Contradicted statements**

- L5 `Inspected the original user-uploaded two-sheet PDF at high magnification`: the lower-resolution scan.
- L9: already carries an inline correction for J101-1, which is consistent with M L2.
- L10 `**J101-2:** K101 coil / D101 suppression-diode return; upper coil terminal labeled 24V.`: J101-2 **is** the upper, 24V-annotated coil terminal (with the D101 cathode), driven from P180-2. It is not a return (M L3).
- L11 `**J101-3:** common return.`: a reproduce-head lead to P121, tied to the card common bus (M L4).
- L19 `coil has 24V supply and D101 suppression.`: the 24V end is the switched drive from P180-2 (M L3; CA L151).
- L24 `J101 pins 1/3 ground proposals are **consistent with direct card-side trace**.`: refuted. On the card, pin 1 is the coil bottom (0V only on the motherboard) and pin 3 is a head lead (M L2, L4).
- L25 `its proposed ground assignment remains to be checked.` (J106-8): checked. It is a sync-head lead, and the worksheet's GND is refuted (M L40).
- L26 (J102-5 vs J105): resolved (M L10, L26). L27 `J103-4/6 erase routing`: not erase. Both go to P181-3 (M L16, L18).
- L32 `On attempted visual tracing from **P121** to **P101** and from **P151** to **P106**, crossings and branches prevent me from certifying every endpoint unambiguously from the existing magnified image.`, L34 `A higher-resolution/vector scan, board artwork, or de-energized physical continuity measurements would resolve it.` and L40 `**Actual blocker to certifying remaining ambiguous motherboard routes:** insufficiently distinguishable raster junction/crossing evidence on the current scan`: refuted. Two independent tracers traced P101-3/-4 to P121 and P106-7/-8 to P151 on the high-resolution drawing (M L4-5, L39-40), and all 50 contacts are traced. Only the C17 crossing needs a continuity check.
- L39 `**Not done:** ... operational-mode truth table`: done (CA L210-247).

**Unique content:** L19 reports that a printed note on the drawing says the schematic shows one channel except for some components. No authority quotes this note. It bears on C10 (interchangeable cards) and could be added to that register row.

**Recommendation: DELETE**, optionally after quoting the printed note in consolidated C10.

---

## 29. worksheet-cross-reference-audit.md

**Contradicted or stale statements**

- L7 `A schematic-based full-route verification has **not** been completed for any of the 50.`: stale (38 VERIFIED). The worksheet's count of 11 `X` entries is correct as a worksheet count. The matrix has 12 UNRESOLVED, which is those 11 plus J108-1 (C17).
- L13 `| J102-5 | J105-2 | Card-side connection J102-5 to J105-2 verified from high-resolution scan |`: refuted (M L10, L27).
- L15 `| J103-4 | J108-3 | Possible shared net; J108-3 described as erase |`: refuted. J103-4 is P181-3, and J108-3 is the P161 erase lead (M L16, L50).
- L17 `| J103-6 | J103-4 | Could be two contacts on one net; must confirm junction |`: confirmed, as a motherboard join at P181-3 (M L18).
- L21 `**Resolved:** the apparent J102/J105 contradiction came from mixing the card-side and motherboard-side wiring. See j102-j105-trace.md.`: this rests on the refuted card-side link. The actual resolution is that J102-5 shares J102-2's card node and is U-linked to P105-1 on the motherboard (M L10).
- L37-39 (status and outstanding work): stale.
- L3 cites `p2(1).pdf`, the old name.

**Unique content:** none.

**Recommendation: DELETE.**

---

## 30. Planning document: docs/superpowers/specs/2026-10-12-tascam-38-external-electronics-design.md

Corrections only (never DELETE):

- L86-92 "Immediate next actions": add progress against each item.
  - Item 1 (`Obtain and verify readable 38 and MS-16 schematics`): done for the 38 amplifier and transport drawings, which are committed with hashes (SR L6-18). MS-16 is still open.
  - Item 2 (`Produce a transport/electronics interface inventory with citations to exact schematic sheets`): done for the amplifier card, in `docs/tascam-38/interface-matrix.csv` (38 VERIFIED, 12 UNRESOLVED) and `docs/tascam-38/circuit-analysis.md`.
  - Item 4 (`Document the original amplifier-card connector`): done electrically. The mechanical geometry and the bench-test or single-slot procedure are still open.
  - Items 3 and 5 are open.
- L4 `status: Approved for staged feasibility work`: still accurate. Optionally add that milestone 1's electrical-interface work has reached Pass 4 (CA L3).
- No contradicted technical statements were found. L43 ("Record-head sync pickup") is consistent with CA L49 and L133-142.

---

## 31. Planning document: docs/superpowers/plans/2026-10-12-tascam-38-interface-analysis.md

Corrections only:

- L16 `Tascam 38 complete schematics (12-page scan): https://peel.dk/...`: that file is the two-sheet lower-resolution scan (source-manual.md L7; electrical plan L23; SR L36). The 12-page PDF was the manuals.plus one. Correct the label to "two-sheet lower-resolution scan, not in repository, superseded by `docs/tascam-38/sources/`".
- L40 `- [ ] Obtain readable copies of both original schematics.`: this should be `[x]`. Both drawings are committed (SR L8-9).
- L41 `- [ ] Record document title, scan edition, page, drawing number and revision`: partly done. The title block, format and SHA-256 are in SR L6-9, but drawing number and revision are not recorded. Leave the box open and note the partial state.
- L42 `- [ ] Identify every relevant 38 board and its physical connector designation.`: largely done from the drawings (consolidated section 1; matrix; `analysis/control-*.md`). The physical side is unconfirmed. Leave the box open with a note, or split it into a drawing part (done) and a physical part (open).
- L43-44 (MS-16 bundle; photographs): still open.
- L50-52 (Task B column list `assembly,connector,pin,signal_name,...`): superseded by the schema in `2026-10-13-tascam-38-electrical-analysis.md` L38, which the committed matrix uses. Replace the list with a pointer to that plan, and record Task B as complete electrically (50 rows, 38 VERIFIED, 12 UNRESOLVED) but incomplete mechanically (geometry, keying and clearance at L54).
- L82-86 "Current blockers": replace L84 `Full connector-level reading of both schematics is not yet complete.` with the current state. The amplifier-sheet reading is complete for all 50 contacts, and the transport sheet has been read for the control sources (Pass 4, `analysis/control-transport.md`). The remaining evidence questions are the CA open items (A1, A3-A10, M1-M7) and matrix C17. L85-86 still stand.

---

## 32. Planning document: docs/superpowers/plans/2026-10-13-tascam-38-electrical-analysis.md

Corrections only:

- L4 `status: Ready for execution`: update to "Passes 0-4 complete. Pass 5 (audit) in progress" (CA L3-4; git log 7dd36e9 through 3183546).
- L34 `Existing investigative documents remain provenance/history, not competing authorities.`: once Pass 5 deletes the superseded notes, this should read "Superseded investigative notes are deleted (supersede means delete); git history is their provenance. The C-register in `consolidated-electrical-analysis.md` section 6 defines the matrix `uncertainty_id` codes", or name its new home if it is moved.
- L70-76 "Resolve known issues": record the outcomes.
  - L71 `J102-5 ↔ J105-2 on card versus P102-5 ↔ P105-1 on motherboard`: the premise is refuted. There is no card link to J105-2. J102-5 is J102-2's node, and P102-5 goes to P105-1 (M L10).
  - J106-8: a sync-head lead (M L40).
  - P108-1 / P107-1 / P104-6: P107-1 and P104-6 are VERIFIED 0V. P108-1 is UNRESOLVED (C17).
  - P107-2 / P104-7: refuted (M L25, L42).
  - J103-4/6: OUT SELECT P181-3. J108-2/3: erase via P161.
  - X cells: 11 have no wire on either side and are UNRESOLVED pending a physical check.
- L82 `Distinguish Q110/Q106/Q105 **gating/shunt behavior** from simplistic series input selection.`: Pass 3 found the opposite. Q105, Q106 and Q110 are series selection JFETs joining at (6543, 1109), and the shunt is Q107 (CA L86, L91-94, L153). Record the finding, or reword the instruction so it does not presuppose shunt gating.
- L107 `save the exact artifact locally or in Library` and L110 `run this plan in **ChatGPT Work** with access to the connected GitHub account and preserved source files`: these are execution-environment instructions from a different tool. "Library" and "ChatGPT Work" do not apply to this repository. Remove them, or replace them with the repository's own practice (commit and push early and often).
- No checkboxes to tick. Pass 5 steps 1-6 (L94-99) are what this audit is part of.

---

## Links to notes recommended for deletion

Found with `git grep` of each filename stem across the whole repository.

| Note to delete | Linked from |
| --- | --- |
| `verification-gate.md` | `docs/tascam-38/interface-matrix.csv` L2 (J101-1 notes: "Earlier verification-gate.md 'common return' reading is refuted.") |
| `j102-j105-trace.md` | `docs/tascam-38/interface-matrix.csv` L10 (J102-5 notes); `docs/tascam-38/right-motherboard-conductor-trace.md` L15; `docs/tascam-38/worksheet-cross-reference-audit.md` L21 (both of these are also being deleted) |
| `p107-2-p104-7-motherboard-link.md` | `docs/tascam-38/interface-matrix.csv` L25 (J104-7 notes); `docs/tascam-38/consolidated-electrical-analysis.md` L116 (C13 row) |
| `right-motherboard-conductor-trace.md` | `docs/tascam-38/interface-matrix.csv` L31 (J105-6 notes) |
| `alternate-amplifier-scan.md`, `alternate-amplifier-scan-sheet-2.md` | `docs/tascam-38/high-resolution-scan-audit.md` L7-8 (also being deleted) |
| All other notes | no references found |

To fix the matrix notes and the C13 row, either remove the filename or replace it with a portable citation to the commit that introduced the refuted claim:

| Deleted note | Commit that added it |
| --- | --- |
| `verification-gate.md` | `3645580` |
| `j102-j105-trace.md` | `6d88c8e` |
| `p107-2-p104-7-motherboard-link.md` | `b306890` |
| `right-motherboard-conductor-trace.md` | `7bbf941` |

---

## Summary

| Note | Recommendation | Reason |
| --- | --- | --- |
| alternate-amplifier-scan-sheet-2.md | DELETE | "Sheet 2" mislabel, pre-rotation hash, ChatGPT Library path, says p1(1) is an amplifier sheet, says the binary is not in the repository |
| alternate-amplifier-scan.md | DELETE | Filename says amplifier but the file is the transport scan; pre-rotation hash; Library path; says the binary is not in the repository |
| amplifier-card-interface.md | DELETE | Non-authoritative 12-page source; "pinout NOT verified"; next actions done; physical asks already in the plan |
| amplifier-interconnect-trace.md | DELETE | J106 = 7 (49 contacts); lower-resolution source; U102 placed in the reproduce chain; work list done |
| audio-control-topology-2026-10-13.md | DELETE | Calls Q105/Q106/Q110 shunts (they are series selectors; Q107 is the shunt); C134 called an input capacitor |
| card-side-contact-trace.md | DELETE | J101-1 as common return; J101-2 as coil lower end; R101 510 / C102 100p wrong; next checks done |
| connector-reconciliation-pass3.md | DELETE | Worksheet hypotheses now judged in the matrix (J102-5 to J105-2, J105-6 oscillator, J106-8 ground, J108-1 ground) |
| consolidated-electrical-analysis.md | KEEP-AND-CORRECT | Only definition of the matrix's C01-C20 codes, plus the full P171 pinout and head families; fix source identity, register status and the stale blocker in section 8 |
| electrical-trace-audit-2026-10-13.md | DELETE | J101-1 and J101-3 as returns; outstanding list done |
| function-switch-distribution.md | DELETE | "Truth table not yet established" is stale; covered by CA and control-function.md |
| github-write-test-2026-10-13.md | DELETE | Tool test, no content |
| head-routing-trace.md | DELETE (after moving the P172 line) | J106 = 7 / 21 contacts; low-resolution scan; tracing list done; only the P172/J172 sentence is unique |
| head-shield-return-network.md | DELETE (after moving the shield-bus line) | Endpoints now verified; only the J401-J403 shield-bus observation is unique |
| high-resolution-playback-mode-trace.md | DELETE | D210 (is D120); K102 "supplied from 24V"; Q112 placed in the output stage; checklist done |
| high-resolution-scan-audit.md | DELETE | Pre-rotation hashes; "Library filenames"; J108-4 and J102-5 now resolved |
| j102-j105-trace.md | DELETE | Card-side J102-5 to J105-2 is refuted |
| mode-and-net-reconciliation.md | DELETE | K101 polarity backwards; J103-4 erase; "netlist unverified" |
| p107-2-p104-7-motherboard-link.md | DELETE | P107-2 to P104-7 is refuted |
| p107-p104-return-trace.md | DELETE | Correct but fully in the matrix (J104-6, J107-1) |
| p108-p107-p104-common-return.md | DELETE | Claims P108-1 joined and "verified"; the matrix has it UNRESOLVED C17 |
| power-control-bus-trace.md | DELETE | 49 contacts; low-resolution source; P171 table duplicated in consolidated section 4 |
| power-control-bus.csv | DELETE | "Sheet 1" source label; P171 list duplicated in consolidated section 4; nothing reads it |
| prior-connector-analysis-review.md | DELETE | ChatGPT Library xlsx path; "two-sheet high-resolution"; every hypothesis now judged in the matrix |
| relay-diode-correction.md | DELETE | Corrects only a note being deleted; D120 is in the matrix |
| reproduce-front-end-detail.md | DELETE | K101 polarity backwards; R101/C102 values wrong; J101 pins now verified |
| right-motherboard-conductor-trace.md | DELETE | P107-3 to P105-6 and card J102-5 to J105-2 are both refuted |
| source-manual.md | DELETE (after moving the hash into SR) | Library copy / "not committed" environment text; only the low-resolution scan's hash and peel.dk credit are unique |
| verification-gate.md | DELETE | J101-2/-3 wrong; "scan too low-resolution to trace the motherboard" blocker refuted |
| worksheet-cross-reference-audit.md | DELETE | Says card-side J102-5 to J105-2 is "verified"; J103-4/J108-3 shared net; "none of 50 verified" |
| specs/2026-10-12-...-design.md | corrections only | Next actions 1, 2 and 4 are done (wholly or in part) |
| plans/2026-10-12-...-interface-analysis.md | corrections only | "12-page" peel.dk label wrong; Task A first box done; Task B schema superseded; "Current blockers" stale |
| plans/2026-10-13-...-electrical-analysis.md | corrections only | Status "Ready for execution" stale; known-issue outcomes; Q105/Q106/Q110 "shunt" premise; ChatGPT Library/Work text |
