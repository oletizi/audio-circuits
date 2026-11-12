/**
 * Complex arithmetic and polynomial roots for the h7 analyses (vdda-noise.ts). Small on purpose:
 * the networks here are a few branches, so a characteristic polynomial is of low degree and
 * Durand-Kerner on the monic form converges without a numerics library.
 */
export interface Complex {
  readonly re: number
  readonly im: number
}

export const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
export const cSub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im })
export const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
})
export function cDiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im
  if (d === 0) throw new Error("complex: division by zero")
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
export const cAbs = (a: Complex): number => Math.hypot(a.re, a.im)

/**
 * Roots of a real polynomial given in ascending powers (coefficients[k] multiplies x^k), by
 * Durand-Kerner. The leading coefficient must be non-zero. Throws if it does not converge, rather
 * than returning roots it has not found.
 */
export function polyRoots(coefficients: readonly number[]): Complex[] {
  const degree = coefficients.length - 1
  if (degree < 1) throw new Error("complex: a polynomial of degree 0 has no roots to find")
  const lead = coefficients[degree]
  if (lead === 0) throw new Error("complex: the leading coefficient is zero; trim it before asking for roots")
  const monic = coefficients.map((c) => c / lead)
  const evaluate = (x: Complex): Complex => {
    let acc: Complex = { re: 0, im: 0 }
    for (let k = degree; k >= 0; k--) acc = cAdd(cMul(acc, x), { re: monic[k], im: 0 })
    return acc
  }
  const seed: Complex = { re: 0.4, im: 0.9 }
  let roots: Complex[] = []
  let power: Complex = { re: 1, im: 0 }
  for (let k = 0; k < degree; k++) {
    roots.push(power)
    power = cMul(power, seed)
  }
  for (let iteration = 0; iteration < 5000; iteration++) {
    let largestStep = 0
    const next = roots.map((r, j) => {
      let den: Complex = { re: 1, im: 0 }
      roots.forEach((s, k) => { if (k !== j) den = cMul(den, cSub(r, s)) })
      const step = cDiv(evaluate(r), den)
      largestStep = Math.max(largestStep, cAbs(step) / Math.max(1, cAbs(r)))
      return cSub(r, step)
    })
    roots = next
    if (largestStep < 1e-15) return roots
  }
  throw new Error(`complex: Durand-Kerner did not converge for [${coefficients.join(", ")}]`)
}
