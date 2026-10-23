/**
 * **ONE SPELLING PER COMPONENT VALUE, so `4k7`, `4.7k` and `4700` compare equal and `2u2F` and
 * `2.2uF` do too.** Gate 8 keys components by VALUE, and a value spelled two ways is a difference
 * the gate would report where there is no electrical one.
 *
 * **TRANSCRIBED, NOT REMEMBERED** (`CLAUDE.md`: *"Transcription is evidence, not memory"*).
 * Every line below is read from `$SCHGEN_SOURCE/gates/oscar/canonical.ts` in the
 * `digital-pedal-platform` tree, sha256
 * `0a56de2bc4d9b09a16b676e9e624ae8e09ce0cebe10b2a053128a1f56e8ff942` as read on 2026-10-20 - the
 * `MULT` table, all four regular expressions, `fmt`, `plainValue` and `canonicalValue`, with their
 * comments. The only change is the file it lives in and this header.
 *
 * **WHAT WAS NOT CARRIED ACROSS, said plainly.** That source also holds `isomorphic`,
 * `multisetDiff`, `pairings`, `checkWellFormed`, `profile`, `profileProblems`, `interchangeKey`
 * and `signatureProblems` - the exact part-for-part isomorphism. **None of it is here**, because
 * all of it is written against `gates/oscar/graph.ts`'s `Subgraph`/`SubPart`, which carry a
 * subcircuit's anchors, rails and `ext x n` outside-contact labels. That is the OSCAR boundary
 * (`gates/oscar/boundary.ts`), which M1 does not port: this milestone's half of gate 8 compares
 * two WHOLE circuits with an empty permitted delta, so there is no boundary to extract and nothing
 * for anchors or rails to say. `lib/schgen/gates/graph-match.ts` holds the match this adaptation
 * needs, written against `ReferenceGraph` and NOT a transcription of `isomorphic` - see its own
 * header for what it does and does not claim relative to that function.
 *
 * It is NOT a `files[]` or `diverged[]` port: it carries part of one pedals module under a
 * different name, so `rewrite()` could not re-derive it and
 * `tests/schgen/port-fidelity.test.ts` must not byte-check it. Its entry is in
 * `tools/schgen/port-manifest.json`'s `handWritten`, which is the category
 * `lib/schgen/gates/oscar/boundary.ts` already uses for a transcription.
 */

const MULT: Readonly<Record<string, number>> = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, "μ": 1e-6, m: 1e-3, "": 1, R: 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }
const multOf = new Map(Object.entries(MULT))
/** RKM notation: the multiplier letter is the decimal point (4k7, 2u2, 4R7). */
const RKM = /^(\d+)([pnuµμmRkKMG])(\d+)$/
/** A whole whitespace-delimited token: number (comma as decimal point), optional multiplier and unit. */
const NUMBER_TOKEN = /^(\d+(?:[.,]\d+)?)([pnuµμmkKMG]?)(?:F|H|Ω|R|ohm|Ohm)?$/
/** A whole token after a bare number: a non-empty multiplier and/or unit, nothing else. */
const UNIT_TOKEN = /^(?=.)([pnuµμmkKMG]?)(?:F|H|Ω|R|ohm|Ohm)?$/
/** "1,000" could be one thousand or 1.000: ambiguous, so never read as a number. */
const THOUSANDS = /^\d{1,3},\d{3}$/

function fmt(x: number): string {
  return x === 0 ? "0" : Number(x.toPrecision(6)).toExponential()
}

/** The multiplier of a value whose first token(s) are well formed; null when they are not. */
function plainValue(tokens: readonly string[]): number | null {
  const [first, second] = tokens
  const num = first === undefined ? null : NUMBER_TOKEN.exec(first)
  if (num === null || num[1] === undefined || THOUSANDS.test(num[1])) return null
  const x = Number(num[1].replace(",", "."))
  // A complete first token ("2.2uF", "10k", "4700") ends the value; later tokens are ignored,
  // unless the first token is a bare number, when a following token must be a complete unit.
  const glued = first !== undefined && first !== num[1]
  if (glued || second === undefined) return x * (multOf.get(num[2] ?? "") ?? Number.NaN)
  const unit = UNIT_TOKEN.exec(second)
  if (unit === null) return null
  return x * (multOf.get(unit[1] ?? "") ?? Number.NaN)
}

/** One spelling per value; anything unrecognised is `raw:<trimmed>`, compared verbatim, never guessed. */
export function canonicalValue(v: string): string {
  const t = v.trim()
  const rkm = RKM.exec(t)
  if (rkm !== null && rkm[1] !== undefined && rkm[2] !== undefined && rkm[3] !== undefined) {
    const m = multOf.get(rkm[2])
    if (m !== undefined) return fmt(Number(`${rkm[1]}.${rkm[3]}`) * m)
  }
  const x = t === "" ? null : plainValue(t.split(/\s+/))
  if (x === null || Number.isNaN(x)) return `raw:${t}`
  return fmt(x)
}
