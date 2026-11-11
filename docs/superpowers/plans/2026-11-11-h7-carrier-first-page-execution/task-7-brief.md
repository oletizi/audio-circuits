### Task 7: Draw the carrier page and bind it

**Files:**
- Create: `drafted/h7-platform/h7-carrier/` (the sheet, `.kicad_pro`, `.svg`, `sym-lib-table`, `RECORD.md`, `repair/`), per `TOOLING.md` step 5.5 and `drafted/transistor-preamp/transistor-preamp-staged/` as the worked example
- Create: `tests/fixtures/h7-carrier.net`, `kicad-cli`'s export of the drafted sheet, labelled in `RECORD.md` as an export of the drafted page
- Modify: `boards/h7-carrier/perfboard.json` (add `sch` → the drafted sheet, `netlist` → the fixture)
- Modify: `tests/circuits/h7-carrier.test.ts` (add `registerDraftedPageTests` with `circuit: "h7-platform"` and `footprintComparisons` as Task 6 defines it)
- Modify: `tests/circuits/drafted-kicad-round-trip.test.ts` (add `{ board: "h7-carrier", circuit: "h7-platform", netlist: "tests/fixtures/h7-carrier.net" }`)
- Modify: the spec's G4 exception sentence. "goes to a test point" becomes "goes to one breakout terminal (a test point or a header pin)", noted as a plan-time correction under Task 5's header ruling.

**Interfaces:**
- Consumes: everything above; `modelForSheet("h7-carrier")` (Task 6).

- [ ] **Step 1: Install the toolchain (C5).** Run `bash draughting/install.sh`, then `make draught-doctor`. Expected: exit 0. If the doctor refuses, stop and report its output.
- [ ] **Step 2: Draft.** Run `make -C boards/h7-carrier draw`. Expected: a sheet under `build/draw/h7-carrier/`, and the `NO INDEPENDENT NETLIST:` block from Task 2.
- [ ] **Step 3: Repair and record** by `TOOLING.md`'s loop and the skill, exactly as written there. Measure before and after with the verification set. Commit the page, `RECORD.md` with its sha256 binding row and a list of every controller ruling the page rests on (spec G5, each linking its `decisions.md` entry), and `repair/` with a replay that reaches that sha256.
- [ ] **Step 4: Export and bind.** Export the drafted sheet's netlist with `kicad-cli` to `tests/fixtures/h7-carrier.net`. Declare `sch` and `netlist`. Add `registerDraftedPageTests` with `pinDisagreements`, `valueDisagreements`, `footprintlessParts` and `footprintComparisons` stated exactly, each with a one-line reason. Add the board to the round-trip `BOARDS`.
- [ ] **Step 5: Verify.** Run `bun test tests/circuits/h7-carrier.test.ts tests/circuits/drafted-kicad-round-trip.test.ts` and `make -C boards/h7-carrier check`: all pass. These must include:
  - the carrier's **fresh** `kicad-cli` export showing zero `componentIdentity` and zero `netMembership` disagreement (Task 6), not only equality with the fixture;
  - the moved-pin negative control, for both the fixture and the fresh export, reporting a disagreement.

  If the export disagrees with the model on any connection, that is an electrical fault. Stop, and report the disagreement instead of sending the page.
- [ ] **Step 6: Commit and push.** Report the rendered page path and the `RECORD.md` path to the controller. **Do not describe the drawing.** The controller sends the page to the owner with a question and nothing else (`EVALUATING-DRAWINGS.md` §4). The summary of rulings follows in a separate message, after the owner's verdict.
