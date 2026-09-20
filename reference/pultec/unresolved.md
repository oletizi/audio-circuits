# Unresolved items

Things the reference does not settle. Each names what is uncertain, the
alternatives, and what would resolve it. None is filled in with a default: the
project's rule is that missing data throws rather than being guessed, and the
same rule applies to the reference itself.

Downstream results inherit this list. A comparison that agrees is evidence about
agreement with the *reference*, never about agreement with the hardware, until
item 1 is closed.

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

## 3. Mid band is a six-position subset of eleven

**Uncertain:** which six of the doc's eleven mid frequencies are fitted.

The doc specifies eleven mid frequencies (200, 300, 500, 700, 1K, 1K5, 2K, 3K,
4K, 5K, 7K) with an L and C for each. The KiCad schematic has six selector
positions with A/B capacitor pairs, and every mid capacitor value is a
placeholder (`Mid C1A` … `Mid C6B`).

The board was manufactured with mid-band footprints, and the gerber commit
message is "re-worked the mid-range", so a choice was made — it is just not in
the schematic.

**Alternatives:** any six-subset of the eleven; or the mid section is unstuffed.

**Resolves by:** the builder naming the six, or reading them off the board.

---

## 4. Hi cut potentiometer value not recovered

**Uncertain:** the value and taper of the hi-cut level control.

The other five controls were read from the doc's master schematic. The hi-cut
pot was not legible in the same pass.

**Resolves by:** re-reading page 5 of `P3bandDoc.pdf` at higher magnification,
or the stepped-pot document `SteppedPotsfor3BandPultecv0.2.pdf`, which has not
been examined.

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
