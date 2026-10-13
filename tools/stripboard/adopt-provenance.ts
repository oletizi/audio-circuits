/**
 * The sha256 `tests/fixtures/stripboard/provenance.txt` records FOR ONE NAMED
 * FILE, parsed out of that file's own two-line records.
 *
 * **IT EXISTS BECAUSE A SUBSTRING SEARCH OVER THAT FILE CHECKED LESS THAN IT
 * CLAIMED, AND THE MEASUREMENT IS THE REVIEW'S.** `./adopt-checks.ts` first
 * asked `provenance.includes(actual)` - does this hash appear anywhere in the
 * file - and `provenance.txt` carries fourteen sha256 values for eight files, so
 * ANY listed file's hash satisfied ANY fixture's check. Measured, round 1 of the
 * Task 24 review: replacing `pultec-low-boost-frozen.dump` with
 * `pt2399-core.dump`'s bytes PASSED. The association between a name and a hash
 * is what `B2` is about, and a check that reads only the hashes has thrown that
 * association away.
 *
 * **THE RECORD SHAPE, read off the file rather than imposed on it.** Under its
 * `these fixtures` headings each file's basename sits alone on an indented line
 * with `sha256 <64 hex>` on the next:
 *
 * ```
 *   these fixtures
 *     pultec-low-boost-frozen.vrt
 *       sha256 411412bdf087c5aeea15195ae6ffc2bd1e453c3ca81fcdcf64307effd21b43ae
 * ```
 *
 * **A BASENAME ALONE ON A LINE IS NOT ALWAYS A RECORD, AND THAT IS MEASURED
 * RATHER THAN GUESSED AT.** `pultec-low-boost-frozen.footprints.json` also
 * appears alone on line 18 of today's file - the prose describing it wrapped
 * past the column - with prose rather than a hash on the next line. So this
 * does not take the FIRST line matching the basename and demand a hash after
 * it: that reading would refuse for that one file, on a file that records it
 * perfectly well 251 lines further down. It collects every line whose trimmed
 * content is EXACTLY the basename and keeps the ones a `sha256` line follows.
 *
 * **FINDING THE RECORD BY NAME AND NOT BY HASH IS THE POINT, and one pair of
 * files makes that load-bearing.** `pultec-low-boost-frozen.vrt` and the input
 * board it was extracted from share one hash, because they are the same bytes,
 * and the file records that explicitly. A parser that looked up a hash and
 * reported which name it belonged to would have two answers for that value and
 * no way to choose; a parser that looks up a name has one answer for each of the
 * four.
 *
 * **IT REFUSES RATHER THAN FALLING BACK.** No record, or two records disagreeing
 * about one name, is a refusal naming the basename and the file - never a
 * retreat to the substring search, and never an unparseable record read as
 * agreement. A parser that silently finds nothing is the defect above in a new
 * place.
 */
import { refuse } from "./adopt-model.ts"

/**
 * `sha256 <64 lowercase hex>`, and nothing else on the line.
 *
 * THE WIDTH IS ASSERTED, not just the keyword: a truncated or mistyped hash is a
 * record that cannot identify anything, and matching it would compare a file's
 * real hash against a prefix and refuse with two values that look almost alike.
 */
const SHA256_LINE = /^sha256 ([0-9a-f]{64})$/

/**
 * The hash `text` records for `basename`, or a refusal naming both.
 *
 * `file` is `text`'s own path, so a refusal says where to fix it rather than
 * only what is wrong.
 */
export function recordedHashFor(basename: string, text: string, file: string): string {
  const lines = text.split("\n")
  const found: string[] = []
  for (let index = 0; index < lines.length; index += 1) {
    if ((lines[index] ?? "").trim() !== basename) continue
    // THE NEXT NON-BLANK LINE, because a record is two lines and a blank one
    // between them is formatting rather than meaning. It stops at the first
    // non-blank either way, so a basename followed by prose yields no record
    // rather than scanning on to some later file's hash.
    let next = index + 1
    while (next < lines.length && (lines[next] ?? "").trim() === "") next += 1
    const match = (lines[next] ?? "").trim().match(SHA256_LINE)
    if (match !== null) found.push(match[1])
  }
  const distinct = [...new Set(found)]
  const only = distinct[0]
  if (distinct.length === 1 && only !== undefined) return only
  refuse(
    "frozen-fixture-hash",
    distinct.length === 0
      ? `${file} records no sha256 for ${basename}: no line reading exactly "${basename}" is ` +
        "followed by a \"sha256 <64 hex>\" line, so there is nothing to check that fixture " +
        "against"
      : `${file} records ${distinct.length} different sha256 values for ${basename} ` +
        `(${distinct.join(", ")}), so which one that fixture is supposed to be is not in the ` +
        "file",
  )
}
