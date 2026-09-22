# Unresolved items

Things the reference does not settle. Each names what is uncertain, the
alternatives, and what would resolve it. None is filled in with a default: the
project's rule is that missing data throws rather than being guessed, and the
same rule applies to the reference itself.

Downstream results inherit this list. A comparison that agrees is evidence about
agreement with the *reference*, never about agreement with the hardware, until
item 1 is closed.

---

## Design intent that must not be "tidied away"

Not an unresolved item — a requirement, recorded here because it is the thing
most likely to be broken by a well-meaning refactor.

**Each frequency selector is ONE two-pole rotary.** The low switch configures
the low boost and low cut networks simultaneously (LOSWA and LOSWB); the high
switch does the same for high boost and high cut (HISWA and HISWB). Boost and
cut therefore cannot be tuned independently.

The builder states that the low pairing "is a critical part of the pultec low
cut + boost sound that I want to maintain". It is: the two shelves have
different shapes, so engaging both does not cancel — it leaves a low shelf with
a dip above it, which is the characteristic Pultec low end. The model measures
roughly +13dB at 20Hz and −5dB at 400Hz with both engaged at 60Hz.

Giving each section its own frequency control would still satisfy every
topology comparison in this project while destroying that behaviour, so the
gang is enforced by the resolver and the curve itself is asserted in
`tests/reference/ac.test.ts`.

---

## 0. The hi boost resonant branch — RESOLVED

The off-board wiring was settled by the builder against legible crops of the
master schematic:

- One pole of the high frequency rotary (HISWA) takes the input to the selected
  capacitor; each capacitor injects at its own tap on the coil.
- The coil is **not grounded**. Its top end returns to the board at J19 and
  feeds Qmax, so the winding section in circuit is the one between the selected
  tap and the top.
- Qmax and the Q pot sit inside that loop and damp it, then reach the 47K level
  pot's wiper.

At resonance the branch bridges out the upper part of the level pot, which is
the documentation's "high boost is achieved by frequency selectively shorting
out some or all of the 47K potentiometer". Every position now peaks within about
1.5% of its LC resonance, and the Q control changes peak height without moving
the centre frequency.

Six positions need only four tap wires because 4k/5k share 0.3H and 10k/16k
share 0.1H — a grouping that falls out of the netlist and independently matches
the documentation's Lboost column.

**Still open within it:** `R3 = 4K7` is the poor-man's Qmax value while the
fitted capacitors are the inductive `Cboost` set — see item 2. And the coil's
DC resistance is unrecorded, which sets the real maximum Q; the model has no
winding loss at all, so its Q is optimistic. Both need the meter.

---

## 1. As-built hardware is not captured

**Uncertain:** whether the physical unit matches the schematic.

The inductors are hand-wound, and the builder's recollection is that capacitor
values may have been fitted to the as-built taps rather than the other way
round. The hi-boost tap values on the breakout board (600/300/200/100 mH) do
match the doc's `Lboost` column exactly, which is evidence against significant
drift in that section, but it is not measurement.

**Alternatives:** the box matches the schematic; or individual components were
substituted during the build and exist only in the hardware.

**Resolves by:** measuring the assembled unit — inductance per tap, capacitance
per selector position — and comparing against `values.md`. Until then, every
claim in this project is about the design, not the artifact.

---

## 2. Qmax resistor contradicts the build variant

**Uncertain:** whether `R3 = 4K7` is correct for this build.

The doc describes two mutually exclusive hi-boost builds. The poor-man's build
uses the `Cpoorboost` capacitors, shorts out the inductor and HiQ pot pins, and
sets **Qmax = 4K7**. The inductive build fits the VTB9042, uses the `Cboost`
capacitors, and uses a Qmax of **nominally 470R** — the doc says that value "has
been found in tests to give a maximum Q similar to that indicated by the
published curves of the original Pultec EQP1A".

This design uses the `Cboost` capacitors and has inductor taps broken out, so it
is the inductive build. But the netlist has `R3 = 4K7`, the poor-man's value.
`R3` sits in the Qmax position, bridging `Hi Boost Sel Ret` and `Hi Boost Q`.

**Alternatives:** the schematic value is a leftover from a poor-man's build and
the hardware has 470R; or 4K7 was a deliberate choice; or the build is a hybrid.

**Resolves by:** measuring R3 on the board, or a decision to change it. Affects
maximum Q in the hi-boost section, so it changes the AC response.

---

## 3. Mid band — SUPERSEDED by a design decision

The original question was which six of the documentation's eleven mid
frequencies the manufactured board fits. It no longer governs.

The builder's direction is to **favour Thompson-Bell's topology and values over
the as-built board**, treating that board as one example rather than the
reference, and to carry **all eleven** mid frequencies into the modular
topology: a position can be left unpopulated at build time, but a position
designed out needs a new board to recover.

`reference/pultec/mid.ts` therefore implements all eleven, from P3bandDoc.pdf
page 3 — the same set as the Pultec MEQ5, on a VTB9050. Seventeen capacitors
across eleven positions, six of them doubled, served by five winding taps.

**Note the provenance difference.** Every other section in this reference takes
its topology from an exact netlist export of the manufactured board. The mid
cannot: that board carries a six-position subset whose values are placeholders
in the schematic. The mid is authored from documentation and validated against
that documentation, not against a netlist. That is a deliberate, recorded
difference.

**Insertion — RESOLVED.** The mid level pot is a rheostat, wiper tied to one
end, running from the node where the hi boost and lo cut pots meet down to the
LC network. The section therefore shunts the signal path to a variable depth
rather than sitting in series with it. From there: selector, capacitor, winding
tap, coil, and the boost/off/cut switch, which returns the coil's far end
through 4K7 to the input, through 1K to ground, or nowhere in the centre.

The mid is now part of `THREE_BAND_REFERENCE`. At full depth each position
peaks within a fraction of a percent of its label, the boost is symmetric about
its centre on a log axis while the cut is several times narrower — the MEQ5
character — and the centre position is flat to within 1e-6 dB, which is what
"off" should mean.

Note the rheostat's inverted sense: level 0 is maximum depth and level 1 is
minimum, because the resistance is in series with the branch.

---

## 4. Hi cut potentiometer value — RESOLVED

**Value: 4K7.** `SteppedPotsfor3BandPultecv0.2.pdf` page 4 states it directly:
"The High Cut pot is the bottom arm of the divider used for High Boost so for
High Boost to be correct, this needs to total exactly 4700 ohms."

Independently confirmed by the same document's insertion-loss figure, which only
holds for this value: "a simple potential divider formed from a 47K
potentiometer and a 4K7 potentiometer. The EQ therefore has a nominal insertion
loss of 4.7/(4.7+47) = 20.83dB."

**Still uncertain:** the taper class. No source states it. It is inert at the
control extremes the reference is validated at, where every curve returns
exactly 0 or exactly 1, so it does not block simulation at those states — but
any interior setting needs it. See item 5.

---

## 5. Log taper curve constant is not stated

**Uncertain:** the resistance-versus-rotation law of the LOG pots.

`values.md` records four LOG controls. The project's `Taper` type models a log
taper as `{ type: "log", curveConstant: number }`, and no source states a curve
constant — "LOG" is a manufacturing class, not a curve.

**Alternatives:** adopt a stated approximation and record it as an assumption;
or measure a physical pot; or restrict simulation to the control extremes, where
the taper does not matter because the wiper is at an endpoint.

**Resolves by:** a decision. The third option is available immediately and is
enough for the boost/cut extremes, which is where the published Pultec curves
are defined.

---

## 6. `COMPONENT_VALUES.md` in the source repository is wrong

**Not uncertain — established.** Recorded here because it has downstream effects
and because anyone re-deriving this reference will encounter it.

`multi-channel-preamp/src/pultec/docs/1.0/COMPONENT_VALUES.md` assigns C1–C7
(18n, 10n, 4.7n …) to *Low Boost*; the netlist and the doc both put them on the
low **cut** selector. It assigns C18–C22 (330n, 220n, 120n, 68n, 47n) to *High
Cut*; both sources put them on low **boost**. It also assigns C29, C32 and C33
to *High Boost*; they are high **cut**.

Consequences already visible in that repository:

- `LOW_BOOST_INDUCTOR_SPECIFICATIONS.md` and `INDUCTOR_SUMMARY.md` derive four
  low-boost inductors (3.52H, 2.81H, 1.50H, 0.768H, ~$161, 12–16 hours of
  winding) from the wrong assignment. The Pultec low section is an RC shelf and
  needs no inductors — as `low-boost/BOM.csv` itself records: "NO HAND-WOUND
  INDUCTORS REQUIRED".
- `low-boost/INDUCTOR_SPECS.md` detected the 1000x impossibility
  (`L = 1/(4π²·20²·18nF) = 3518 H, not 3.5H`) but diagnosed it as a
  nanofarad/microfarad unit error rather than a section mix-up.
- `high-boost/INDUCTOR_SPECS.md` maps `C32 10nF -> 3 kHz`; C32 is a high-cut
  capacitor.
- The module schematics under `src/pultec/modules/` were seeded from it. Three
  of them (`low-cut`, `high-boost`, `high-cut`) are byte-identical stubs
  containing the same two unconnected capacitors, `C23 33n` and `C24 47n` —
  which is exactly this document's incorrect "Low Cut Section" pair.

The low-boost module is the one place it was caught and corrected, against the
doc's page 4 `Cboost` column. That correction agrees with this reference.

---

## 7. Winding-coupling caveat — RETIRED by the discrete-inductor redesign

The original caveat, recorded in `three-band.ts` and `controls.ts`:
representing one tapped coil as several separate inductors is only legitimate
because the selector energises exactly one tap at a time, so unselected
sections carry no current and cannot couple into the live one. If two sections
ever carried current together, the model would need explicit magnetic coupling
between them — a risk flagged rather than modelled.

**No longer load-bearing.** The 2026-09-20 discrete-inductors design (see
`docs/superpowers/specs/2026-09-20-discrete-inductors-design.md`) replaced both
tapped coils — hi boost's four taps and the mid's five — with nine discrete
inductors in the hi boost and mid sections. Discrete parts share no winding,
so there is no coupling to argue about at all: the one-at-a-time switching
argument has nothing left to defend in those sections.

This retirement applies to the board implementation only. `three-band.ts` and
`controls.ts` still model the tapped coil as documented from the original
hardware, and their comments — and the caveat those comments carry — remain
correct descriptions of that model. Recorded here rather than deleted,
consistent with how item 3 keeps its superseded history.

**Still open within it:** the mid's 2H inductor has not been verified as
purchasable at an acceptable price. The design's fallback is to cluster the
mid frequencies onto fewer distinct inductance values; since positions can be
left unpopulated at build time regardless, that is a build decision rather
than a redesign.

---

## 8. Hi boost schematic autorouting warnings after discrete inductors

**Uncertain:** whether this is a tooling limitation or something the circuit
is doing wrong.

Rendering the hi boost module now produces schematic autorouting warnings —
`MultiOffsetIrlsSolver ran out of iterations` — that did not occur before the
inductors landed on the board. Measured per render: 0 warnings at the pre-task
baseline, 2 after. The figure of 12 quoted earlier was six renders inside one
test file, not one render — the causal claim was right but the number was six
times the truth.

Placement does not change the count: it held at every inductor row position
tried from 3 through 6, so the warnings are driven by the added traces
themselves rather than the geometry chosen for them.

No test observes the warning, and no netlist is affected by it — it is a
tscircuit schematic-rendering limit, not a circuit defect.

**Alternatives:** leave it as a rendering wart; reduce trace count or reroute
by hand to make the solver converge; or report it upstream as a tscircuit
limitation.

**Resolves by:** a decision on whether the warning is worth chasing. Nothing
currently depends on it going away.

**Closed by obsolescence, 2026-09-22.** tscircuit was removed from this
repository, so there is no schematic renderer left to emit this warning and no
upstream to report it to. The entry is kept rather than deleted, as item 3's
superseded history is, because it records something that was measured.

---

## 9. `parseValue` does not check a value string's unit against component kind

**Uncertain:** nothing about this project's current values — flagged as a
latent risk, not a present defect.

`parseValue` never cross-checks a value string's unit letter against the kind
of component it is attached to. Nothing stops "450mF" written on an inductor
from parsing silently as 0.45 henries: the digits are read correctly, but the
unit letter is never validated against "this is an inductor, `F` is wrong
here." This is pre-existing shared infrastructure, not something this task
touched, and every value currently in the tree is correct.

**Alternatives:** add a unit-vs-kind check to `parseValue` itself; or accept
the risk as long as values continue to be hand-verified.

**Resolves by:** a decision on whether to harden `parseValue`. Recorded because
a silent wrong-unit parse is a silent-wrong-answer failure mode, not because
anything is wrong today.

---

## 10. Schematic-overlap test only catches exact-coordinate collisions

**Uncertain:** how much headroom the current module layout actually has.

`tests/modules/schematic-overlap.ts` detects overlap only by exact coordinate
equality. `columnLayout` spaces module origins 10 units apart; `createGrid`
multiplies row index by `GRID = 3`, so a module occupying rows 0-3 spans 9
units inside a 10-unit slot. The measured closest cross-module pair today is
1.00 unit apart with 0.35 units of symbol-bounding-box clearance — no overlap
today, but not much margin either.

A sixth module, or one more row added to the mid or hi boost section, closes
that 1-unit gap and produces a real collision the test will not report,
because it only compares exact coordinates rather than bounding boxes or a
minimum clearance.

**Alternatives:** tighten the test to a clearance threshold instead of exact
equality; widen `columnLayout`'s spacing; or leave it and re-check by hand
before adding rows or modules.

**Resolves by:** a decision on which of the above, made before the next module
or row is added rather than after.
