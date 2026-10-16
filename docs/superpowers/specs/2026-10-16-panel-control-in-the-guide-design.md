A panel control reaches the guide completely and unambiguously
==============================================================

**Status:** design, awaiting the owner's review.
**Closes:** G1, G4 and G10 of `docs/known-gaps.md`, and the label-plumbing
asymmetry recorded as a note under G1.
**Leaves open, deliberately:** G2, and every other register entry. See
**Scope** below.

Why, and what the owner decided
-------------------------------

The previous piece gave a landing pad a shape and an identity, and the guide
stopped being silent about pads. It left one question it was not allowed to
answer: **what the label beside a pad's hole should SAY.** An agent may never
author the acceptance criteria for the artifact it is producing, and that label
is a criterion.

The owner decided it, 2026-10-16, asked which of the terminal identity
(`RV_LO_BOOST.1`), a functional label (`LO BOOST ccw`) or both a pad should
carry:

> *"I like the more descriptive names"*

So: **the descriptive label.** Everything below follows from that, including one
consequence that only became visible once the decision was made.

The obstacle the decision exposes
---------------------------------

The guide ALREADY produces descriptive labels for panel controls - but only for
controls that reach the board as a header PART. `potFunction` in
`tools/guide/off-board.ts:28` derives `"DRIVE ccw"` from a component id by
stripping a `_pot` suffix, and refuses an id without one:

    panel pot <ref> ("<id>") has no "_pot" suffix on its id, so the guide
    cannot name its function for the off-board labels. Rename it to
    "<function>_pot".

**No Pultec control id carries that suffix.** They are `RV_MID`, `SW_MID`,
`SW_HI_BOOST`, `SW_LO_BOOST` - verified by reading
`circuits/pultec/electrical/three-band.ts:142,165,177` and
`from-netlist.ts:246`. So that refusal fires for every Pultec panel control, and
the existing machinery cannot produce a descriptive label for any of them.

**The suffix convention is not wrong; it is out of its range.** It was built for
the transistor-preamp, whose circuits an agent designed and whose ids are
hand-authored (`transformer_drive_pot`). The Pultec's ids come from a netlist
export, where the ref IS the id. `CLAUDE.md` is explicit about which way
authority runs: *"For an existing design being brought in - the Pultec - the
schematic is authoritative and the model is derived from a netlist export."*
**Renaming imported ids to satisfy a guide convention would edit a model
downstream of the authoritative schematic to suit a presentation layer** - the
same inversion the `CAP_FILM2` decision already refused once in this program.

Where a descriptive label comes from
------------------------------------

`circuits/pultec/electrical/controls.ts` is already the authority, and it is
better evidence than a suffix. It records each control's terminals, and for each
rotary it records what every position IS:

    positions: ["20Hz", "30Hz", "60Hz", "100Hz", "150Hz", "200Hz"],
    gang: LO_FREQUENCY_GANG,
    source: "P3bandDoc.pdf p4 Cboost column; LOSWB, the other pole of the low
             frequency selector",

Every entry is transcribed from the reference document with its page and column
named. That is what this repository means by evidence rather than memory.

**Three sources, in order, and a refusal rather than a fallback:**

1. a control the circuit declares with the `_pot` suffix keeps the existing
   `potFunction` label - nothing about the transistor-preamp changes;
2. a control named in the control model takes its label from there - the pot's
   lug names for a potentiometer, and for a selector the common terminal plus
   one position label per throw pin;
3. a control in neither **refuses, naming the control, both places that were
   consulted, and what to add to which file.** It does not fall back to the ref.

Point 3 is not negotiable: a label silently degrading to `RV_LO_BOOST.1` would
reintroduce exactly the spelling the owner rejected, in the case nobody is
watching.

What low-boost's ten labels become
----------------------------------

`RV_LO_BOOST` is a potentiometer, so its three pads read `LO BOOST ccw`,
`LO BOOST wiper`, `LO BOOST cw`.

`SW_LO_BOOST` is one pole of the two-pole low-frequency rotary, so its seven
pads read a common plus the six frequencies - `LO BOOST 20Hz` through
`LO BOOST 200Hz`.

**Which of the seven pins is the common is read from
`SelectorTerminals.commonConnector` and `throwsConnector`, never inferred from
pin order.** The model's own comment says the common terminal carries two pins
wired to the same net while the throws terminal carries one pin per position, so
the mapping is stated and must be used rather than reconstructed.

The plumbing the decision forces
--------------------------------

A part's label comes from the CALLER: `renderLayout` takes
`labels: ReadonlyMap<string, string>`, and that module's comment says so. A
pad's label is computed INSIDE the renderer from `pad.identity`.

With the descriptive label chosen, that is now the wrong side of the interface -
the label needs circuit knowledge, and the renderer has no business holding it.
Two consequences if it stays: the renderer acquires a dependency on the circuit
model, and all three packet images are forced to print identical pad text.

**A pad's label comes from the caller, through the same channel a part's does.**
This was recorded as a note under G1 before the decision, precisely so the
decision would not be made in ignorance of its cost.

The checklist's empty table
---------------------------

`buildChecklist` builds every row from `dump.parts`
(`tools/guide/checklist.ts:200-209`), and a pad has no PART line. So the packet
shows ten rings with ten checkboxes on the layout image while the
**"Wire-to-board junctions" table facing it is empty** - two artifacts in one
document disagreeing about whether ten terminals exist.

Junction rows are built from the pads, carrying the same descriptive labels, so
the row a person ticks off says `LO BOOST 100Hz` against a hole. **This could
not be designed before the label was decided**, which is why G10 recorded its
dependency on G1 rather than being fixed alongside the pads.

A board that carries both representations
-----------------------------------------

A control may now legitimately reach the board as a header PART or as pads.
Nothing refuses a board carrying BOTH for one control, and that is a
contradiction: the same control wired twice, or counted twice.

It refuses, naming the control and both representations. This is G4, and it is
only now statable - before the owner's decision it was unclear which
representation was even intended to survive.

Acceptance
----------

**Who authors it matters more than what it says.** The channels, all of which
exist already:

1. **The owner's call on a render** decides whether the labels read well and
   whether they crowd their row. That is G2, and it is explicitly NOT closed by
   this spec - it is judged against a render carrying these labels, not the
   current ones. No agent may conclude that the labels are good.
2. **A refusal is proven by perturbation.** Every new guard - the
   no-source-for-this-control refusal, the both-representations refusal - is
   perturbed, goes red by name, and is restored, with the real output reported.
   A predicate that cannot fire is this repository's recurring defect, found
   eleven times across two plans.
3. **The junction table is counted, not eyeballed.** A test asserts one row per
   pad against the board's own pad count, derived from the dump rather than
   written down.
4. **The transistor-preamp labels do not change.** Its boards are the regression
   net: a `_pot`-suffixed control produces exactly the label it produces today,
   asserted on a real board.
5. **No label is ever inferred from pin order**, and no label falls back to a
   ref. Both are asserted.

Scope
-----

**In:** G1, G4, G10, and the label-plumbing asymmetry.

**Out, and each has its own home:** G2 (owner's call on a render carrying these
labels), G3 (ceramic capacitor shape), G6 (a 760-line test file), G7 and G8
(comment and caveat defects), G9 (the catalog schema's missing lead fields), G11
(which layer owns hole containment for an imported board). G5 resolves by
measurement inside the running five-board plan.

**Not changing:** the objective, `stripboard/rules.json`, both hard area rules,
the exemption registry, the benchmark gate, the `lib/stripboard/` to `tools/`
boundary, and `lib/kicad/import-string.ts`. The rendering layer consumes the
physical model without modifying it.

Risk, and a sequencing note
---------------------------

**This spec was written while Task 3 of the five-board plan was still running.**
That task materialises low-boost end to end and reports what else is missing,
and its findings may add to this work or reorder it - most plausibly if the
packet build refuses before it reaches the checklist at all. **The
implementation plan for this spec should be written after Task 3 reports**, so
it is planned against measured facts rather than around them.

A second risk worth stating: the control model is the authority for the Pultec,
and this design makes the guide depend on it. If a control is ever added to a
board without being added to that model, the refusal in point 3 is what catches
it - which is the intended behaviour, but it means a board can be laid out and
only fail when somebody asks for its guide. G11 records the same shape of
problem for hole containment, and whether these two belong together is worth
asking when G11 is taken up.
