/** Decimal exponent per SI prefix. Scaling is applied by building the number in
 * exponent form and parsing it once, NOT by multiplying.
 *
 * Multiplying introduces rounding the literal does not have: `18 * 1e-9` is
 * 1.8000000000000002e-8 while `Number("18e-9")` is exactly 1.8e-8. That
 * difference is invisible until a parsed value is compared against one a tool
 * produced from the same text, at which point an exact topology comparison
 * fails on two values that are supposed to be identical.
 */
const EXPONENTS: Readonly<Record<string, number>> = {
  p: -12, n: -9, u: -6, µ: -6, m: -3,
  k: 3, K: 3, M: 6, G: 9,
}

const UNIT_SUFFIX = /^(?<number>[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)(?<prefix>[pnuµmkKMG])?(?<unit>[a-zA-Z]*)$/

/** RKM notation (IEC 60062): the multiplier letter stands in for the decimal
 * point, so `4n7` is 4.7nF and `4K7` is 4.7k. `R` marks a plain ohms value with
 * no multiplier, as in `4R7`. This form is pervasive in real schematic exports.
 */
const RKM = /^(?<whole>\d+)(?<prefix>[RpnuµmkKMG])(?<fraction>\d+)$/

function scaled(mantissa: string, prefix: string | undefined, subject: string): number {
  const value = prefix === undefined || prefix === "R"
    ? Number(mantissa)
    : Number(`${mantissa}e${EXPONENTS[prefix]}`)
  if (!Number.isFinite(value)) throw new Error(`Unparseable value: ${subject}`)
  return value
}

/** Parses a source value string into base SI units. Throws rather than guessing.
 * Error subjects are bare, matching every other module's `<Problem phrase>: <subject>`
 * shape. An empty or whitespace-only input would otherwise vanish from the message
 * entirely, so it is reported as the literal marker `(empty)`.
 */
export function parseValue(text: string): number {
  const trimmed = text.trim()
  const subject = trimmed.length > 0 ? trimmed : "(empty)"

  const rkm = RKM.exec(trimmed)
  if (rkm?.groups) {
    const { whole, prefix, fraction } = rkm.groups
    return scaled(`${whole}.${fraction}`, prefix, subject)
  }

  const match = UNIT_SUFFIX.exec(trimmed)
  if (!match?.groups) throw new Error(`Unparseable value: ${subject}`)
  const { number, prefix, unit } = match.groups
  if (unit && !/^(ohm|ohms|Ohm|R|F|H)$/.test(unit)) {
    throw new Error(`Unparseable value: ${subject} (unrecognized unit ${unit})`)
  }
  return scaled(number, prefix, subject)
}
