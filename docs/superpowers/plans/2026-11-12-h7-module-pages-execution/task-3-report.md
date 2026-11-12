Task 3 report: the VDDA network (VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A, VDDA-DAMPING-LEG)

STATUS: BLOCKED. The brief's stop condition was hit. No E24 resistor in 0.25-0.5 ohm with 22 uF meets the stated constraints. All of them meet 806 uV. All of them fail Q <= 1. No R was ruled, no constant was exported for Task 6, and decisions.md, open-items.md and analog.md were not touched.

Commit: 3604be1 (pushed). Files:
- circuits/h7-platform/vdda-noise.ts (328 lines)
- circuits/h7-platform/complex.ts (60 lines: complex arithmetic and Durand-Kerner roots)
- tests/circuits/h7-vdda-noise.test.ts

Method and assumptions

Reproduced from analog.md:298 where it states the method:
- The ripple current is a triangle; its fundamental is 4 dIL / pi^2.
- Xc and ESR are added in quadrature.
- Undamped, |H| = 1/((f/f0)^2 - 1), with f0 = 1/(2 pi sqrt(L C_bank,eff)).
- Rms is peak / sqrt(2).
- Odd harmonics to the 15th are added root-sum-square.

Inputs:
- dIL 1.66 A, fsw 450 kHz (power.md:425, :374).
- Cout 30.6 uF, ESR 10 mohm / 3 (analog.md:298, power.md:425).
- Bead DCR 0.045 ohm (analog.md:242). Basis 0.3825 (R-57).
- Bead L = 165 ohm / (2 pi x 100 MHz) = 0.2626 uH (analog.md:272). I kept the unrounded value: 0.263 uH gives 234.0 kHz, and analog.md's 234.1 kHz comes from the unrounded figure.

This plan's reading, where analog.md is silent (stated in the module comment):
- Harmonic n carries 4 dIL / (pi^2 n^2), odd n only.
- The undamped form ignores bank ESR and DCR, as the documented formula does.
- With a leg, the transfer is the full complex divider: L + DCR in series, into the bank (each part derated, with its ESR) in parallel with R + the leg capacitor. The leg capacitor is derated by 0.3825 too.
- Bank ESR is 0 ohm because no part is chosen. This is not conservative above f0. It is a concern, see below.
- Q is the largest pole-pair Q, |p| / (2 |Re p|). For the undamped lumped network this equals analog.md:272's Q = sqrt(L/C)/R exactly; a test asserts it.
- Q and |H| are checked at both ends of the DCR bound, 0 and 0.045 ohm, because less DCR means less damping.

Figures

Old bank, 2 x 2.2 uF + 2 x 100 nF on 0.3825, undamped:
- f0 = 234.14 kHz
- |H| at 450 kHz = 0.3712
- fundamental: 0.6728 A pk, 8.093 mV pk ripple, 2124.3 uV rms at pin 21
- harmonics 3 to 15 add 8.35, 0.85, 0.20, 0.07, 0.03, 0.02 and 0.01 uV, so the total is 2.124 mV rms
- this reproduces analog.md's 2.12 mV and 234.1 kHz; no input was tuned
- pole Q at DCR 0.045 = 8.59

Ruled bank, 2 x 10 uF + 2 x 100 nF (7.73 uF effective), undamped:
- f0 = 111.7 kHz, |H| at 450 kHz = 0.0657
- 376.0 uV rms, which already meets 806 uV
- Q = 4.10 at DCR 0.045 ohm, and unbounded at DCR 0

Leg R + 22 uF (8.42 uF effective) across the ruled bank. Rms and |H| are the worse of the two DCR corners:

| R ohm | rms uV | Q at DCR 0 | Q at DCR 0.045 | |H| at 450 kHz (undamped 0.0657) |
|---|---|---|---|---|
| 0.27 | 360.6 | 2.265 | 1.237 | 0.0630 |
| 0.30 | 363.4 | 2.246 | 1.261 | 0.0635 |
| 0.33 | 365.4 | 2.281 | 1.306 | 0.0639 |
| 0.36 | 367.0 | 2.352 | 1.360 | 0.0641 |
| 0.39 | 368.3 | 2.449 | 1.419 | 0.0644 |
| 0.43 | 369.6 | 2.605 | 1.500 | 0.0646 |
| 0.47 | 370.6 | 2.779 | 1.579 | 0.0648 |

Every candidate meets 806 uV and lowers |H| at 450 kHz. None reaches Q <= 1, even at the DCR bound alone (least 1.24). The full divider's peak |H| is 1.58 at 0.27 ohm with DCR 0.045, and 2.84-2.86 near 0.27-0.30 ohm with DCR 0.

Why no candidate works

The leg capacitance (8.4 uF effective) is about the bank's (7.7 uF), so the ratio n = Cd/C is about 1.09. A parallel R-Cd damping leg with n near 1 cannot bring the network to Q = 1 at any R. The minimum over R sits near 0.27-0.30 ohm and stays above 1. The rows' "Q = 1 needs R >= sqrt(L/C)" (analog.md:274, open-items VDDA-DAMPING-LEG) is the series-resistance form Q = sqrt(L/C)/R. Applied to the leg it would give 0.68 at 0.27 ohm. It does not describe a resistor in a leg across the bank.

Scratch exploration, outside the brief's range, for the controller's information only. Nothing was adopted.

| Leg | Q at DCR 0.045 | Q at DCR 0 | rms |
|---|---|---|---|
| 47 uF + 0.15-0.2 ohm | 0.80-0.84 | 1.2-1.4 | under 806 uV |
| 100 uF + 0.15 ohm | 0.68 | 0.72 | under 806 uV |

All of these figures are at bead L minimum.

What the controller needs to rule (my reading of the options, not a recommendation):
- Accept Q <= 1 at the DCR bound, which still fails at 1.24.
- Or change the Q criterion, for example to a peak |H| limit.
- Or enlarge the leg capacitor.
- Or accept the undamped bank: it meets 806 uV, and R-18 requires a leg, but the Q requirement is the row's own.

Test commands and counts
- bun test tests/circuits/h7-vdda-noise.test.ts: 9 pass, 0 fail (21 expect calls). Two of the 9 are test.failing: the brief's "the damping leg keeps Q at or below 1..." and the "meets 806 uV under the stated rule" selection test. They pass because selectDampingR throws.
- Red step: before the implementation, the suite failed with "Cannot find module". After it, the two Q-dependent tests failed with Q 2.265 and the selection's throw, which is how the block was found.
- bun test tests/circuits/: 266 pass, 0 fail (28 files).
- bun run typecheck: clean.
- verify.sh: 17 PASS.
- The carrier page was not touched; no carrier file changed.

Self-review
- The brief's test "the ruled bank and damping leg meet 806 uV" is restated for what is actually true. Every candidate and the undamped bank meet 806 uV, and that is a plain test. The selection test is test.failing.
- The VDDA_RULED constant with r_ohm was removed rather than left as a placeholder. VDDA_RULED_BANK and VDDA_DAMPING_C_F are exported; they are the brief's values, not a recorded ruling.
- The brief's interface is honoured: vddaNoise(VddaInputs) returns VddaResult with f0_Hz, q, hAt_fsw, rmsAtPin21_V and harmonics. I added peakH and peakAt_Hz from the full divider.
- complex.ts is new because lib/board/scaffold/admittance.ts keeps its complex helpers private.

Concerns
1. The block itself: no R in the stated range meets Q <= 1 with 22 uF. A controller ruling is needed before Task 6 can read an R.
2. Bank ESR is taken as 0 ohm, because no parts are chosen. Above f0, ESR raises the shunt impedance and so |H|, so 0 is optimistic. The margin to 806 uV (about 2.2x) makes this unlikely to matter, but it is unmeasured.
3. Bead L is only a lower bound. Q rises with L (sqrt(L/C)), so Q at L minimum is not a bound on Q. This is the reason the rows stay open on Murata's curve.
4. Bank plus leg add 42.2 uF nominal to the module's 3V3. That counts toward R-50's 150 uF, and I did not tally it.
5. The CLAUDE.md snapshot was not diffed against HEAD for this task. The rules I relied on (no known-gaps additions, test.failing for undelivered behaviour) match the file as read.

---

Resumed after the controller ruling

STATUS: DONE under the ruling, which is recorded in decisions.md as part of CR-MODULE-VDDA-BANK and labelled "Controller ruling (the owner may override)".

The rule: keep the documented leg size, 22 uF X7R with R from E24 in 0.25-0.5 ohm. Pick the R with the least worst-case pole-pair Q. Worst-case means the larger Q at DCR 0 and DCR 0.045 ohm. The conditions are rms at pin 21 <= 806 uV and |H| at 450 kHz not above the undamped value. Ties go to the lower R. Q <= 1 is dropped as a condition.

Commits (all pushed):
- 688346a: code and tests.
  - selectDampingR now implements the ruled rule; it still throws with the table if nothing is admissible.
  - DampingCandidate gains qWorst.
  - VDDA_RULED is exported for Task 6: bank 2 x 10 uF + 2 x 100 nF, leg 0.30 ohm + 22 uF.
  - The two test.failing tests are replaced by four plain tests:
    - the ruled bank and leg meet 806 uV;
    - the leg does not raise |H| at 450 kHz;
    - the chosen R is the minimum-worst-case-Q candidate, recomputed from the table in the test;
    - the achieved Q is asserted as numbers, 2.246 and 1.261, with a comment saying Q <= 1 is not met and why.
- b919ccb: docs.
  - decisions.md gets the CR-MODULE-VDDA-BANK entry: the bank, the leg, R, inputs and basis, and a table of rms, |H| and Q at both DCR ends. It states that Q <= 1 is not reached, that the source formula is the series form, and the 42.2 uF toward R-50.
  - open-items.md: VDDA-WIDEBAND and 3V3D-RIPPLE-INTO-VREF-A cite the analysis as meeting 806 uV on the stated bounds. They stay open, conditional on Murata's curve and the DC-bias curves; bank ESR 0 ohm is noted, and 3V3D also on the re-derived ripple. VDDA-DAMPING-LEG cites Q and |H|, says the documented leg size does not reach Q = 1, and says L above its bound raises Q.
  - analog.md FIG-VDDA-WIDEBAND gets one pointer to the code and the ruling.

Ruled figures, L at 0.2626 uH, basis 0.3825, bank ESR 0:

| R = 0.30 ohm | DCR 0 | DCR 0.045 ohm |
|---|---|---|
| rms at pin 21 | 363.4 uV | 362.4 uV |
| |H| at 450 kHz (undamped 0.0657) | 0.0635 | 0.0633 |
| pole-pair Q | 2.246 | 1.261 |

Candidates' worst-case Q, from the earlier table (the DCR 0 column governs):

| R ohm | 0.27 | 0.30 | 0.33 | 0.36 | 0.39 | 0.43 | 0.47 |
|---|---|---|---|---|---|---|---|
| worst Q | 2.265 | 2.246 | 2.281 | 2.352 | 2.449 | 2.605 | 2.779 |

So 0.30 ohm.

Checks after the resume:
- tests/circuits/h7-vdda-noise.test.ts: 11 pass, 0 fail (29 expect calls).
- bun test tests/circuits/: 268 pass, 0 fail (28 files).
- bun run typecheck: clean.
- verify.sh: 17 PASS, 0 FAIL.
- No carrier file was touched.

Remaining concerns:
- Q is above 1 with the documented leg size, recorded for the owner.
- Bank ESR is taken as 0 ohm, which is optimistic above f0.
- L is only a lower bound, and Q rises with L.
- The ruling's date is 2026-11-12, to match the plan and CR-MODULE-ID-STRAP-PIN. The session clock reads 2026-11-11.
