/**
 * `V9`'s literal scan, as ONE pattern in ONE file.
 *
 * `V9` is *"no fitted coefficient anywhere - the pipeline reports no ratio
 * fitted across boards, and any constant it carries traces to a derivation, a
 * measurement, or an owner's parameter"*. **This file is not that guarantee.**
 * It is the mechanical floor under it: a text scan for the two shapes a
 * threshold is usually written in, so a module cannot carry one unnoticed.
 * The judgement half is `docs/stripboard/pipeline-verification.md` plus the
 * owner's review.
 *
 * IT LIVES HERE RATHER THAN IN TWO PLACES. Task 19's per-module scan over
 * `tools/stripboard/stop.ts` and Task 22's sweep over every pipeline source
 * import this same `bareLiteral`, because a module clean under one and dirty
 * under the other would mean the two patterns had drifted - which is what a
 * second copy guarantees eventually. Task 19 declares it because Task 19 comes
 * first and the pattern has to exist before its first use.
 *
 * WHAT IT MATCHES: a bare fraction (`0.05`, `1.5`) and a bare integer of three
 * digits or more (`2000`), outside an identifier and outside a comment.
 *
 * WHAT IT MISSES, measured against the cases in
 * `tests/stripboard/stop.test.ts` rather than reasoned about - these are the
 * blind spots, written down so the scan is never read as a proof:
 *
 * - **A SMALL INTEGER USED AS A THRESHOLD.** `signatureRun`'s three is a bare
 *   `3` and nothing here can tell it from an array index.
 * - **AN EXPONENT FORM.** `5e-2` is `0.05` and does not match.
 * - **A COMPOSED VALUE.** Two literals the scan accepts separately can be
 *   multiplied into one it would have refused.
 * - **A LITERAL INSIDE A STRING.** A refusal message quoting `"2000"` matches,
 *   which is a FALSE POSITIVE rather than a miss, and the fix is to say the
 *   figure in words or to splice the parameter in.
 * - **A NUMBER AFTER A `*` ON A LINE OF CODE.** The comment exclusion below is
 *   a lookbehind for `//` or `*` earlier on the line, because this repository's
 *   block comments are all ` * `-prefixed and a criteria citation such as
 *   `COST 1.4` in prose would otherwise fail every module in the tree. The
 *   price is that `k * 0.05` written in code is MISSED. Measured: it is.
 *
 * The behavioural check that catches what no scan can is in
 * `tests/stripboard/stop.test.ts` - every threshold a module applies must MOVE
 * when the rules file's value moves.
 */

/**
 * The pattern's text, named once so the two scans cannot disagree.
 *
 * `String.raw` so the escapes reach the `RegExp` rather than the string parser.
 */
const SOURCE = String.raw`(?<!(?:\/\/|\*)[^\n]*)(?<![\w.])(?:\d+\.\d+|\d{3,})(?![\w.])`

/**
 * The pattern, FRESH ON EVERY CALL. **This is the only export, and a function
 * rather than a constant is the point.**
 *
 * THE BRIEF ASKED FOR `BARE_LITERAL: RegExp`, AND A CONSTANT CANNOT BE MADE
 * SAFE. A `g`-flagged regex carries `lastIndex`, and `String.prototype.matchAll`
 * **reads** it when it clones - so one `.test()` or `.exec()` anywhere, on a
 * shared instance, silently truncates every later `matchAll` through it. A scan
 * that then finds nothing reads as a module with no bare literal in it. ES
 * modules cannot export a getter, so there is no spelling of a constant that
 * hands out a fresh instance; the brief's own alternative - *"a fresh `RegExp`
 * per call"* - is this function, and the constant is DELETED rather than left
 * beside it for somebody to reach for.
 *
 * Task 22 imports `bareLiteral` and calls it per scan.
 */
export function bareLiteral(): RegExp {
  return new RegExp(SOURCE, "g")
}
