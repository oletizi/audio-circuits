### Task 3: The VDDA network, by ruling and analysis (VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A, VDDA-DAMPING-LEG)

**Files:**
- Create: `circuits/h7-platform/vdda-noise.ts`
- Test: `tests/circuits/h7-vdda-noise.test.ts`
- Modify: `docs/h7-platform/decisions.md`, `open-items.md`, `analog.md` (one pointer in FIG-VDDA-WIDEBAND)

**Interfaces:**
- Produces `vddaNoise(inputs: VddaInputs): VddaResult`.
  - `VddaInputs` holds:
    - ripple: `deltaIL_A`, `fsw_Hz`, `cout_F` (effective), `esr_ohm`;
    - bead: `beadL_H`, `beadDcr_ohm`;
    - `bank`: a list of `{ nominal_F; esr_ohm }`;
    - `basis`: the derating factor;
    - `damping`: `{ r_ohm; c_F } | null`;
    - `harmonics`: the highest odd harmonic.
  - `VddaResult` holds `f0_Hz`, `q`, `hAt_fsw` (|H| at fsw), `rmsAtPin21_V` and a per-harmonic breakdown.
- **Method** (`analog.md` FIG-VDDA-WIDEBAND, line 298; recon in the execution record):
  - The inductor current is a symmetric triangle, and **ΔIL is its peak-to-peak value** (1.66 A).
    - Odd harmonic n has peak magnitude 4ΔIL/(π²n²). At n = 1 that is `analog.md`'s 0.673 A peak.
    - Each harmonic is converted to rms once, dividing by √2, after it passes through the filter.
    - `analog.md` states the fundamental only, so the 1/n² series is this plan's reading of a triangle, recorded as such.
    - Issue 31, finding 3, corrected an earlier draft of this line that gave 8ΔIL/(π²n²) beside 4ΔIL/π², a factor of two apart at n = 1.
  - Each harmonic passes through the output capacitor's impedance √(Xc² + ESR²).
  - It then passes through the bead-and-bank transfer.
    - Undamped, that is `1/((f/f0)² − 1)` above f0.
    - With a damping leg, it is the full complex divider: the bead's L and DCR in series, into the bank in parallel with the leg's R + 1/(jωC).
  - The harmonic rms values are summed root-sum-square, up to the 15th harmonic.
- **Inputs** (`power.md` :425, :377, :374; `analog.md` :242, :272, :282):
  - ΔIL is 1.66 A, at fsw 450 kHz (the low end of 450–550 kHz, and the worst case for this filter).
  - The output capacitor is 30.6 µF effective with an ESR of 3.33 mΩ.
  - The bead's L is ≥ 0.263 µH. That is a bound from |Z| at 100 MHz, because Murata's curve was not read.
  - The bead's DCR is ≤ 0.045 Ω.
  - Every ceramic is taken on R-57's basis, 0.3825.
  - The limit is 806 µV rms.
- **Controller ruling `CR-MODULE-VDDA-BANK`:**
  - The bank is 2 × 10 µF + 2 × 100 nF X7R, `analog.md` :298's own example.
  - The damping leg is R_DAMP_VDDA in series with 22 µF X7R, across the bank (`open-items.md` :81). R is chosen by this task as the value in the E24 series, between 0.25 and 0.5 Ω, that minimises `rmsAtPin21_V`, subject to Q ≤ 1 and to `hAt_fsw` not exceeding the undamped value.
  - Part numbers are needed for the drawing only as values. MPNs are left for phase 4, and the ruling says so.
  - If no R in the range meets 806 µV, stop and report it to the controller with the numbers. Do not widen the range.
- **What closes:** none of the three rows closes on this alone. Each row's settlement names Murata's curve or the chosen parts' DC-bias curves, and neither is in hand. Each row is amended to cite this analysis as the result on the stated bounds, and stays open, conditional on those two inputs.

- [ ] **Step 1: Write the failing tests:**
  - `"the fundamental is 0.673 A peak for 1.66 A peak-to-peak"`: asserted directly, so that a compensating error elsewhere cannot hide a normalisation error;
  - `"the old bank reproduces analog.md's 2.12 mV rms, undamped"`: 2 × 2.2 µF + 2 × 100 nF on 0.3825, to 0.02 mV;
  - `"the old bank's f0 is 234.1 kHz"`;
  - `"the ruled bank and damping leg meet 806 uV rms at pin 21"`;
  - `"the damping leg keeps Q at or below 1 and does not raise |H| at 450 kHz"`;
  - `"a basis of 1.0 is refused"`: the function requires the basis to be stated and below 1, so a figure on nominal values cannot pass for an R-57 figure.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement `vddaNoise`**, and the ruled values as an exported constant that Task 6's model reads, so that the model and the analysis cannot disagree.
- [ ] **Step 4: Verify, and record.**
  - Record `CR-MODULE-VDDA-BANK` in `decisions.md`, with the computed figures as the test asserts them.
  - Amend the three rows in `open-items.md`.
  - Add one pointer in `analog.md` FIG-VDDA-WIDEBAND to the code and the ruling.
  - Commit and push.

