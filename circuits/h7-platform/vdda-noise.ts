/**
 * The module's VDDA network: the 3V3 buck's ripple reaching pin 21 (VDDA tied to VREF+, power.md:387)
 * through FB_VDDA and the VDDA bank, and the damping leg ruling R-18 requires across that bank.
 *
 * METHOD, from analog.md FIG-VDDA-WIDEBAND (line 298), reproduced where it is stated:
 * - the inductor ripple is a symmetric triangle of peak-to-peak deltaIL; its fundamental is
 *   4 deltaIL / pi^2 peak (0.673 A at 1.66 A);
 * - each harmonic current meets the buck's output capacitance as its reactance and ESR in
 *   quadrature, sqrt(Xc^2 + ESR^2);
 * - undamped, the bead and bank pass |H| = 1 / ((f / f0)^2 - 1), with f0 = 1 / (2 pi sqrt(L C_bank,eff))
 *   and C_bank,eff the bank's nominal sum times R-57's basis (analog.md:272);
 * - peak values are converted to rms by dividing by sqrt(2), and odd harmonics to the 15th are
 *   added root-sum-square.
 *
 * WHERE analog.md IS SILENT, this plan's reading (H7 module plan, Task 3), stated so it can be argued:
 * - Harmonic n's peak current is 4 deltaIL / (pi^2 n^2), odd n only: the Fourier series of a
 *   symmetric triangle. analog.md states the fundamental alone and that the harmonics add under 1 %.
 * - The undamped form ignores the bank's ESR and the bead's DCR, as the documented formula does.
 * - With a damping leg, the transfer is the full complex divider: the bead's L and DCR in series,
 *   into the bank (each part's derated C in series with its ESR) in parallel with the leg's
 *   R + 1/(j omega C_leg,eff). The leg's capacitor takes R-57's basis like every ceramic here; its
 *   own ESR is not modelled separately (it is in series with R and no datasheet was read).
 * - The bank's ESR is an input. No bank part has been chosen and no ESR read, so the ruled inputs
 *   carry 0 ohm. That is not conservative for |H| above f0, where ESR raises the shunt impedance;
 *   it is recorded as a concern of the ruling, not hidden here.
 * - Q is the largest Q of a complex pole pair of the network, |p| / (2 |Re p|). For the undamped
 *   lumped network that is exactly analog.md:272's Q = sqrt(L/C) / R. A network with no complex
 *   pair has no resonance; its Q is reported as 0.5, the bound for a real pole pair.
 * - f0 is the bead with the bank alone (analog.md's L_min x C_bank,eff); the leg is not counted in it.
 *
 * Paper analysis of an unbuilt board. The bead's L is a lower bound from |Z| at 100 MHz (Murata's
 * curve was not read), and no chosen part's DC-bias curve is in hand; the open items VDDA-WIDEBAND,
 * 3V3D-RIPPLE-INTO-VREF-A and VDDA-DAMPING-LEG stay open on both (docs/h7-platform/open-items.md).
 */
import { cAbs, cAdd, cDiv, cMul, polyRoots } from "./complex.ts"
import type { Complex } from "./complex.ts"

export interface BankCapacitor {
  /** Nominal capacitance, farads; derated by `basis` inside the analysis. */
  readonly nominal_F: number
  readonly esr_ohm: number
}

export interface DampingLeg {
  readonly r_ohm: number
  /** Nominal capacitance, farads; derated by `basis` like the bank. */
  readonly c_F: number
}

export interface VddaInputs {
  /** Buck inductor ripple, peak-to-peak, amperes. */
  readonly deltaIL_A: number
  readonly fsw_Hz: number
  /** The buck's output capacitance, already effective (not derated again here), farads. */
  readonly cout_F: number
  readonly esr_ohm: number
  readonly beadL_H: number
  readonly beadDcr_ohm: number
  readonly bank: readonly BankCapacitor[]
  /** Derating applied to every bank and leg ceramic: must be stated, and below 1. */
  readonly basis: number
  readonly damping: DampingLeg | null
  /** The highest odd harmonic summed. */
  readonly harmonics: number
}

export interface HarmonicTerm {
  readonly n: number
  readonly f_Hz: number
  readonly iPeak_A: number
  readonly vRipplePeak_V: number
  readonly h: number
  readonly rmsAtPin21_V: number
}

export interface VddaResult {
  readonly f0_Hz: number
  readonly q: number
  /** |H| at fsw, by the transfer in use (the undamped form, or the full divider with a leg). */
  readonly hAt_fsw: number
  readonly rmsAtPin21_V: number
  /** Largest |H| of the full divider over 1 kHz to 10 MHz, and where; for the record. */
  readonly peakH: number
  readonly peakAt_Hz: number
  readonly harmonics: readonly HarmonicTerm[]
}

/** EC-VDDA-WIDEBAND: LSB/4 at 10 bits, recorded as 806 uV rms (analog.md:282, ruling R-15). */
export const VDDA_WIDEBAND_LIMIT_V = 806e-6
/** FB_VDDA's DCR bound (analog.md:242, BLM21PG221SN1D). */
export const BEAD_DCR_MAX_OHM = 0.045
/** R-57's ceramic basis: nominal x 0.9 x 0.85 x 0.5 (decisions.md R-57). */
export const R57_BASIS = 0.9 * 0.85 * 0.5
/**
 * FB_VDDA's least inductance: |Z| <= omega L in the inductive region, with |Z| 165 ohm (the 25 %
 * low end of 220 ohm) at 100 MHz (analog.md:272). Computed rather than rounded to 0.263 uH, because
 * analog.md's 234.1 kHz comes from the unrounded value (0.263 uH gives 234.0 kHz).
 */
export const BEAD_L_MIN_H = 165 / (2 * Math.PI * 100e6)

/** The documented inputs, without a bank or leg. */
export const VDDA_DOCUMENTED: Omit<VddaInputs, "bank" | "damping"> = {
  // power.md:425: SLUSEA4D Eq. 15 at 17.6 V in, 3.513 V out, 4.7 uH -20 %, fSW 450 kHz.
  deltaIL_A: 1.66,
  // power.md:374: 450-550 kHz; the low end is the worst case for a filter above f0.
  fsw_Hz: 450e3,
  // analog.md:298: 40 uF -10 % -15 % = 30.6 uF; ESR 10 mohm per part, three in parallel (power.md:425).
  cout_F: 30.6e-6,
  esr_ohm: 0.01 / 3,
  beadL_H: BEAD_L_MIN_H,
  beadDcr_ohm: BEAD_DCR_MAX_OHM,
  basis: R57_BASIS,
  // analog.md:298: odd harmonics to the 15th.
  harmonics: 15,
}

/**
 * Controller ruling CR-MODULE-VDDA-BANK (decisions.md): the bank is analog.md:298's own example,
 * 2 x 10 uF + 2 x 100 nF X7R. No ESR has been read for any of these parts (see the module comment).
 */
export const VDDA_RULED_BANK: readonly BankCapacitor[] = [
  { nominal_F: 10e-6, esr_ohm: 0 },
  { nominal_F: 10e-6, esr_ohm: 0 },
  { nominal_F: 100e-9, esr_ohm: 0 },
  { nominal_F: 100e-9, esr_ohm: 0 },
]
/** The damping leg's capacitor, nominal (open-items.md VDDA-DAMPING-LEG, "about 22 uF"). */
export const VDDA_DAMPING_C_F = 22e-6

/**
 * CR-MODULE-VDDA-BANK, the bank and leg Task 6's model reads. The leg is R_DAMP_VDDA in series with
 * 22 uF X7R across the bank, never in VDDA's DC path (R-18). R is what `selectDampingR` selects
 * under the ruling's rule; a test holds them equal.
 *
 * Q <= 1 IS NOT REACHED with this leg size, and the ruling records it for the owner. With a 22 uF
 * leg against the ~20 uF bank (8.4 uF vs 7.7 uF effective) a parallel R-C leg cannot bring the
 * pole-pair Q to 1 at any R: at 0.30 ohm it is 2.25 at DCR 0 and 1.26 at DCR 0.045 ohm.
 * analog.md:274's "Q = 1 needs R >= sqrt(L/C)" is the series-R form of Q; it does not size a leg
 * across the bank. A larger leg capacitor was ruled out as redesign that spends R-50's 150 uF.
 */
export const VDDA_RULED: { readonly bank: readonly BankCapacitor[]; readonly damping: DampingLeg } = {
  bank: VDDA_RULED_BANK,
  damping: { r_ohm: 0.3, c_F: VDDA_DAMPING_C_F },
}

/** Symmetric triangle of peak-to-peak `deltaIL`: odd harmonic n's peak, 4 deltaIL / (pi^2 n^2). */
export function triangleHarmonicPeak(deltaIL_A: number, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n % 2 === 0) {
    throw new Error(`vdda-noise: a symmetric triangle has odd harmonics only; n = ${n} asked for`)
  }
  return (4 * deltaIL_A) / (Math.PI * Math.PI * n * n)
}

function requirePositive(name: string, v: number): void {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`vdda-noise: ${name} must be a positive number, got ${v}`)
}

function validate(i: VddaInputs): void {
  if (!Number.isFinite(i.basis) || i.basis <= 0 || i.basis >= 1) {
    throw new Error(
      `vdda-noise: the ceramic basis must be stated and below 1 (R-57's is ${R57_BASIS}); got ${i.basis}. ` +
        "A figure on nominal values would read as an R-57 figure, so it is refused rather than defaulted.",
    )
  }
  const positives: ReadonlyArray<readonly [string, number]> = [
    ["deltaIL_A", i.deltaIL_A], ["fsw_Hz", i.fsw_Hz], ["cout_F", i.cout_F], ["beadL_H", i.beadL_H],
  ]
  for (const [name, v] of positives) requirePositive(name, v)
  if (!(i.esr_ohm >= 0) || !(i.beadDcr_ohm >= 0)) throw new Error("vdda-noise: ESR and DCR must be >= 0")
  if (i.bank.length === 0) throw new Error("vdda-noise: the VDDA bank is empty; it is the filter's shunt element")
  for (const c of i.bank) {
    requirePositive("bank nominal_F", c.nominal_F)
    if (!(c.esr_ohm >= 0)) throw new Error(`vdda-noise: a bank ESR must be >= 0, got ${c.esr_ohm}`)
  }
  if (i.damping !== null) {
    requirePositive("damping r_ohm", i.damping.r_ohm)
    requirePositive("damping c_F", i.damping.c_F)
  }
  if (!Number.isInteger(i.harmonics) || i.harmonics < 1 || i.harmonics % 2 === 0) {
    throw new Error(`vdda-noise: harmonics is the highest odd harmonic summed; got ${i.harmonics}`)
  }
}

/** The shunt branches as series R-C pairs, effective capacitance. */
function branches(i: VddaInputs): { r: number; c: number }[] {
  const out = i.bank.map((b) => ({ r: b.esr_ohm, c: b.nominal_F * i.basis }))
  if (i.damping !== null) out.push({ r: i.damping.r_ohm, c: i.damping.c_F * i.basis })
  return out
}

/** The full divider bead -> (bank || leg) at frequency f. */
function dividerH(i: VddaInputs, f: number): number {
  const w = 2 * Math.PI * f
  let y: Complex = { re: 0, im: 0 }
  for (const b of branches(i)) y = cAdd(y, cDiv({ re: 1, im: 0 }, { re: b.r, im: -1 / (w * b.c) }))
  const zs: Complex = { re: i.beadDcr_ohm, im: w * i.beadL_H }
  return 1 / cAbs(cAdd({ re: 1, im: 0 }, cMul(zs, y)))
}

/** Polynomials in s, ascending powers. */
function pMul(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, j) => b.forEach((y, k) => { out[j + k] += x * y }))
  return out
}
function pAdd(a: readonly number[], b: readonly number[]): number[] {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, k) => (a[k] ?? 0) + (b[k] ?? 0))
}

/** Largest pole-pair Q of 1 + Zs Ysh = 0, in s normalised to the bank's own w0. */
function poleQ(i: VddaInputs, w0: number): number {
  let num = [0]
  let den = [1]
  for (const b of branches(i)) {
    // Y = s C / (1 + s R C), with s = w0 p
    const n = [0, b.c * w0]
    const d = [1, b.r * b.c * w0]
    num = pAdd(pMul(num, d), pMul(n, den))
    den = pMul(den, d)
  }
  const zs = [i.beadDcr_ohm, i.beadL_H * w0]
  const charPoly = pAdd(den, pMul(zs, num))
  const scale = Math.max(...charPoly.map(Math.abs))
  // Known limitation (H7 module plan, Task 3 review): this trims a leading coefficient that is tiny
  // relative to the largest (<= 1e-14 of it), not only an exact zero, and it does so silently. A
  // branch with a vanishing R*C (an ESR of 0) gives an exact zero there; a real but very small
  // coefficient would also be dropped, lowering the order and losing a far pole. Checked at the
  // final-review fix round: for the ruled bank, every E24 candidate leg and the old bank, at both
  // DCR ends, every coefficient dropped is an exact zero. Trim exact zeros only, or refuse, if an
  // input ever lands in between.
  while (charPoly.length > 1 && Math.abs(charPoly[charPoly.length - 1]) <= scale * 1e-14) charPoly.pop()
  let q = 0
  let complexPair = false
  for (const p of polyRoots(charPoly)) {
    const mag = cAbs(p)
    if (Math.abs(p.im) <= mag * 1e-9) continue
    complexPair = true
    q = Math.max(q, Math.abs(p.re) <= mag * 1e-12 ? Infinity : mag / (2 * Math.abs(p.re)))
  }
  return complexPair ? q : 0.5
}

export function vddaNoise(inputs: VddaInputs): VddaResult {
  validate(inputs)
  const cBank = inputs.bank.reduce((s, b) => s + b.nominal_F, 0) * inputs.basis
  const f0 = 1 / (2 * Math.PI * Math.sqrt(inputs.beadL_H * cBank))
  const transfer = (f: number): number => {
    if (inputs.damping !== null) return dividerH(inputs, f)
    if (f <= f0) {
      throw new Error(
        `vdda-noise: the undamped form 1/((f/f0)^2 - 1) holds above f0 only; ${f} Hz is not above ` +
          `f0 = ${f0.toFixed(0)} Hz. Raise the bank or the bead's L so fsw sits above f0.`,
      )
    }
    return 1 / ((f / f0) ** 2 - 1)
  }
  const terms: HarmonicTerm[] = []
  for (let n = 1; n <= inputs.harmonics; n += 2) {
    const f = n * inputs.fsw_Hz
    const iPeak = triangleHarmonicPeak(inputs.deltaIL_A, n)
    const xc = 1 / (2 * Math.PI * f * inputs.cout_F)
    const vPeak = iPeak * Math.hypot(xc, inputs.esr_ohm)
    const h = transfer(f)
    terms.push({ n, f_Hz: f, iPeak_A: iPeak, vRipplePeak_V: vPeak, h, rmsAtPin21_V: (vPeak * h) / Math.SQRT2 })
  }
  let peakH = 0
  let peakAt = 0
  for (let k = 0; k <= 4000; k++) {
    const f = 1e3 * 10 ** (k / 1000)
    const h = dividerH(inputs, f)
    if (h > peakH) { peakH = h; peakAt = f }
  }
  return {
    f0_Hz: f0,
    q: poleQ(inputs, 2 * Math.PI * f0),
    hAt_fsw: terms[0].h,
    rmsAtPin21_V: Math.sqrt(terms.reduce((s, t) => s + t.rmsAtPin21_V ** 2, 0)),
    peakH,
    peakAt_Hz: peakAt,
    harmonics: terms,
  }
}

/** E24 mantissas (IEC 60063). */
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1]

export interface DampingCandidate {
  readonly r_ohm: number
  /** Worst over the bead's DCR bound (0 and BEAD_DCR_MAX_OHM). */
  readonly rms_V: number
  /** Pole-pair Q at DCR 0 and at BEAD_DCR_MAX_OHM. */
  readonly qAtDcrZero: number
  readonly qAtDcrMax: number
  /** The larger of the two: the quantity the ruling minimises. */
  readonly qWorst: number
  /** Worst over the DCR bound. */
  readonly hAt_fsw: number
  /** |H| at fsw of the same bank undamped, by the documented form. */
  readonly undampedH: number
  /** Meets 806 uV rms and does not raise |H| at fsw above the undamped bank's. */
  readonly admissible: boolean
}

/**
 * Every E24 value in 0.25-0.5 ohm as the leg's R, with 22 uF, across the ruled bank, evaluated at
 * both ends of the bead's DCR bound (less DCR is less damping).
 *
 * Known limitation (H7 module plan, Task 3 review): `undampedH` is the documented undamped form,
 * 1 / ((f/f0)^2 - 1), which ignores ESR and DCR, while each candidate's |H| is the full damped
 * divider. The "does not raise |H|" test therefore compares two different models. It is harmless
 * for the ruled network, which meets 806 uV undamped without the leg, but a ruling that leaned on
 * the comparison would need both sides from `dividerH`.
 */
export function dampingCandidates(): readonly DampingCandidate[] {
  const base: VddaInputs = { ...VDDA_DOCUMENTED, bank: VDDA_RULED_BANK, damping: null }
  const undampedH = vddaNoise(base).hAt_fsw
  return E24.map((m) => Math.round(m * 10) / 100)
    .filter((r) => r >= 0.25 && r <= 0.5)
    .map((r): DampingCandidate => {
      const [zero, max] = [0, BEAD_DCR_MAX_OHM].map((dcr) =>
        vddaNoise({ ...base, beadDcr_ohm: dcr, damping: { r_ohm: r, c_F: VDDA_DAMPING_C_F } }))
      const rms = Math.max(zero.rmsAtPin21_V, max.rmsAtPin21_V)
      const h = Math.max(zero.hAt_fsw, max.hAt_fsw)
      return {
        r_ohm: r, rms_V: rms, qAtDcrZero: zero.q, qAtDcrMax: max.q, qWorst: Math.max(zero.q, max.q),
        hAt_fsw: h, undampedH, admissible: rms <= VDDA_WIDEBAND_LIMIT_V && h <= undampedH,
      }
    })
}

/**
 * CR-MODULE-VDDA-BANK's rule: among the admissible candidates (806 uV rms at pin 21, |H| at fsw not
 * above the undamped bank's), the one with the smallest worst-case Q over the DCR bound; ties go to
 * the lower R. Q <= 1 is not a condition (the ruling drops it; see VDDA_RULED). Throws, with every
 * candidate's figures, if none is admissible; the range is not widened here.
 */
export function selectDampingR(): { r_ohm: number; candidates: readonly DampingCandidate[] } {
  const candidates = dampingCandidates()
  const ok = candidates.filter((c) => c.admissible)
  if (ok.length === 0) {
    const table = candidates.map((c) =>
      `${c.r_ohm} ohm: ${(c.rms_V * 1e6).toFixed(1)} uV rms, Q ${c.qAtDcrZero.toFixed(3)} / ` +
      `${c.qAtDcrMax.toFixed(3)} (DCR 0 / ${BEAD_DCR_MAX_OHM}), |H| ${c.hAt_fsw.toFixed(4)}`).join("; ")
    throw new Error(
      `vdda-noise: no E24 damping resistor in 0.25-0.5 ohm meets ${VDDA_WIDEBAND_LIMIT_V * 1e6} uV rms ` +
        `with |H| at fsw <= ${candidates[0].undampedH.toFixed(4)} (undamped). ${table}. ` +
        "Report to the controller; the range is not widened.",
    )
  }
  const best = ok.reduce((a, b) =>
    b.qWorst < a.qWorst || (b.qWorst === a.qWorst && b.r_ohm < a.r_ohm) ? b : a)
  return { r_ohm: best.r_ohm, candidates }
}
