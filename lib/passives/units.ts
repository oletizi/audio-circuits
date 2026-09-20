const PREFIXES: Readonly<Record<string, number>> = {
  p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3,
  k: 1e3, K: 1e3, M: 1e6, G: 1e9,
}

const UNIT_SUFFIX = /^(?<number>[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)(?<prefix>[pnuµmkKMG])?(?<unit>[a-zA-Z]*)$/

/** Parses a source value string into base SI units. Throws rather than guessing. */
export function parseValue(text: string): number {
  const match = UNIT_SUFFIX.exec(text.trim())
  if (!match?.groups) throw new Error(`Unparseable value: ${JSON.stringify(text)}`)
  const { number, prefix, unit } = match.groups
  if (unit && !/^(ohm|ohms|Ohm|R|F|H)$/.test(unit)) {
    throw new Error(`Unparseable value: ${JSON.stringify(text)} (unrecognized unit ${JSON.stringify(unit)})`)
  }
  const magnitude = Number(number)
  if (!Number.isFinite(magnitude)) throw new Error(`Unparseable value: ${JSON.stringify(text)}`)
  return prefix ? magnitude * PREFIXES[prefix] : magnitude
}
