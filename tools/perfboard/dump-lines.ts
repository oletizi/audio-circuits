/**
 * The one tokenizer for the pinned VeroRoute fork's `--dump-board` text.
 *
 * The dump grammar belongs to this perfboard layer, which runs the fork.
 * `cut-state.ts` reads its `NODE`/`CUT_STATE`/`CUT_CONFLICT` lines for the
 * unresolved-cuts explanation, and `tools/guide/dump.ts` reads the whole
 * report for the build guide: one tokenizer for one grammar, rather than two
 * that could drift apart.
 */

/**
 * Every line in `dump` starting with `keyword`, split into whitespace-
 * separated fields (`fields[0]` is the keyword itself).
 */
export function dumpLineFields(dump: string, keyword: string): string[][] {
  return dump
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields[0] === keyword)
}
