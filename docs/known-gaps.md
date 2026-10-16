Known gaps
==========

**A gap that is not in this file does not exist as far as this project is
concerned.** An agent that finds a defect it is not fixing records it HERE, in
the same change that found it, and commits it. A note in a plan ledger does not
count: `.superpowers/` is gitignored, so a ledger entry is invisible to review,
absent from the repository's history, and destroyed by `git clean -fdx`. This
file exists because that happened - findings accumulated in scratch across two
plans and were reported to the owner in conversation and nowhere else.

**This is a register, not a plan.** An entry states what is wrong, where, how it
was established, and what would settle it. It does not promise a milestone. An
entry leaves when it is fixed or when the owner rules it is not a defect, and in
either case it is DELETED rather than marked closed - supersede means delete.

Each entry carries:

- **Found** - the plan or change that surfaced it;
- **Evidence** - what was actually read or run, so a reader can re-establish it
  rather than trust it;
- **Verified** - whether the person writing the entry confirmed it themselves,
  or is relaying another agent's report;
- **Why it is open** - the reason it was not fixed when found;
- **What would settle it** - a fix, a measurement, or an owner decision.

---

Open: an owner decision is what settles these
---------------------------------------------

### G1 - the guide has two representations of a panel control and reconciles neither

`tools/guide/off-board.ts` represents a panel pot as a header PART with PIN
lines: its module comment says *"every pin of every connector part... and of
every panel pot's HEADER"*, and `potFunction` derives edge labels like
`"DRIVE ccw"` / `"DRIVE wiper"` from the circuit model. A pad-based control has
no PART line and no PIN line, so it takes the pad path added for G-fixed-1 and
gets its `<ref>.<pin>` identity rather than a functional label.

Both representations now exist and nothing chooses between them.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** `tools/guide/off-board.ts` module comment and `potFunction` at
  `:28`; the pad path in `tools/guide/pads.ts`.
- **Verified** yes - the controller read both.
- **Why it is open** reconciling them moves edge labels, the checklist's
  junction rows and `valueLabel` together, and **whether a pad should carry a
  circuit-derived functional label is an acceptance criterion** - which the
  agent producing the artifact may not author.
- **What would settle it** the owner says which label a pad's wire should carry
  in the guide: its terminal identity (`RV_LO_BOOST.1`), a functional label
  (`LO BOOST ccw`), or both.

### G2 - pad labels crowd the row they sit in

Ten pad identities on the frozen low-boost render are legible but tight beside
the cut crosses in the same row.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** the implementer rendered the frozen low-boost and read the PNG.
- **Verified** NO - relayed from the Task 2 implementer's report, not
  independently confirmed by the controller.
- **Why it is open** how a drawing should look is the owner's call on a render,
  by this repository's own acceptance rule.
- **What would settle it** the owner looks at a low-boost render and says
  whether it needs shortening.

---

Open: a fix would settle these
------------------------------

### G3 - a ceramic disc capacitor has no shape, and pt2399-core carries one

`bodyFor` in `tools/guide/part-shapes.ts` has no `CAP_CERAMIC` branch, so
rendering a board carrying one refuses with `no drawing for VeroRoute part type
"CAP_CERAMIC"`. The refusal is loud and names its own fix site, which is why
this is a gap and not a trap.

- **Found** `2026-10-16-pultec-five-boards`, while closing a review finding on
  Task 1 - neither the implementer nor the reviewer went looking for it.
- **Evidence** `bodyFor` enumerates `RESISTOR\d*`, `CAP_ELECTRO_(\d+)`,
  `SIP(\d+)`, `BLOCK_(?:100|200)MIL(\d+)`, `TO92`, `TRIM_FLAT` and the film
  types, and nothing else; `CAP_CERAMIC` appears bare in
  `tests/fixtures/pt2399-core-board.dump` and
  `tests/fixtures/stripboard/pt2399-core.dump`.
- **Verified** yes.
- **Why it is open** out of the Pultec program's scope - no Pultec dump carries
  a ceramic.
- **What would settle it** a `CAP_CERAMIC\d*` branch with a test, and a render
  of pt2399-core read by eye.

### G4 - nothing refuses a board carrying both a header PART and pads for one control

With two valid representations of a panel control in play (see G1), a board that
carries both for the same control is a contradiction no guard detects.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** the Task 2 implementer reports no such guard exists.
- **Verified** NO - relayed, not independently confirmed.
- **Why it is open** Task 2's scope was a pad's shape and identity.
- **What would settle it** a refusal naming the control and both
  representations, with a perturbation proving it fires. Note it is downstream
  of G1: if the owner rules one representation out, this guard enforces that
  ruling.

### G5 - `assertLayoutMatchesCircuit` has never run against a Pultec board

A pads-only control has no PART line, and this check has only ever been
exercised on the transistor-preamp boards.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** the Task 2 implementer reports it as a likely next refusal in a
  packet build.
- **Verified** NO - relayed. **A later task in the same plan runs the whole
  path and will establish this by measurement**, so it may resolve itself.
- **Why it is open** predicted, not yet observed.
- **What would settle it** a packet build on a materialised Pultec board.

### G6 - `tests/stripboard/model/seed-room.test.ts` is 760 lines

Against this repository's 300-500 line ceiling.

- **Found** `2026-10-14-stripboard-model-and-search`.
- **Evidence** `wc -l`.
- **Verified** yes.
- **Why it is open** splitting a test file of this size is its own change with
  its own review, and it was never the task in front of anyone.
- **What would settle it** a split by what each group of tests establishes, not
  by line count.

---

Open: comment and documentation defects, behaviour-free
-------------------------------------------------------

Both of these were parked under a skill rule that allows one fix wave per plan.
Neither changes behaviour; both mislead a reader.

### G7 - `lib/stripboard/seed-fit.ts` mislabels its own denominator

The comment reads *"of 634 intermediate wire-span holes, FIVE are inside one"*.
634 is ALL wire-span holes with endpoints included; the intermediate count is
470 (634 - 2x82 wires). The two figures the paragraph presents as disjoint
overlap by 164.

**The FIVE is unaffected** - endpoints contribute zero, which the paragraph's own
274/0 line independently establishes - so the conclusion stands.

- **Found** `2026-10-15-pultec-layout-capability`.
- **Verified** yes.
- **What would settle it** correct the denominator to 470, or say "wire-span
  holes" and drop "intermediate".

### G8 - the pad test states its limit only partially

`tests/stripboard/model/seed-off-board.test.ts` says `routedUnderRigid` rejects
all three columns. True, and it does not claim the stronger thing - but it never
says `rigidOverlap` closes them identically and that nothing outside
`chooseColumn` can separate the two. That limit is written down in commit
`b9fe02f` and a fix report, but not in the file a reader meets the test in.

By this repository's own standard - two earlier fixes exist precisely to move a
measured limit to where a reader meets it - one line belongs in the test.

- **Found** `2026-10-15-pultec-layout-capability`.
- **Verified** yes.
- **What would settle it** one line in the test's comment.

---

Open: blocked on something else
-------------------------------

### G9 - nine `pt2399-core` BOM lines are unchosen, and the lead span is blocked

One line was chosen deliberately (the 0.1uF disc capacitor, commit `05e62e0`).
Nine remain. Separately, a recorded lead span cannot be completed because **the
catalog schema has no lead-diameter or lead-length field** - so the span cannot
be stated without inventing a geometry, which `lib/kicad/lead-span.ts` refuses
by design.

- **Found** `2026-10-16-pultec-five-boards` and its predecessor.
- **Verified** yes for the schema gap.
- **Why it is open** the schema gap is a real blocker, not a deferral: the
  honest options are to extend the schema with evidence per field, or to leave
  the span unrecorded and let the refusal stand.
- **What would settle it** an owner decision on extending the catalog schema,
  then `part-researcher` on the nine lines.
