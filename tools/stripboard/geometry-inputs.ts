/**
 * The two PAR2 geometry inputs a run is graded against, and the one hash over
 * each.
 *
 * **ITS OWN MODULE FOR THE REASON `./rules.ts` HOLDS `RULES_PATH`**: this is the
 * one place the span table's and the pin-pattern table's entry modules are
 * written down, so `./place.ts` (which RECORDS the hashes) and `./adopt.ts`
 * (which CHECKS them) cannot name two different things. Two copies of a path
 * with two copies of a hashing rule is a pair that drifts, and the drift shows
 * up as a gate that compares one quantity against another and calls them equal.
 *
 * **THE HASH IS OVER THE IMPORT CLOSURE AND NOT OVER THE ENTRY FILE.** That is
 * the whole point of this module existing now rather than earlier, and the
 * reason is measured rather than argued:
 *
 * - `lib/kicad/lead-span.ts` imports `deriveSpanHoles` from
 *   `lib/kicad/lead-span-model.ts` and builds `LEAD_SPANS` out of it at module
 *   load, so EVERY `minSpanHoles`/`maxSpanHoles` that `HC5` and `HC9` grade a
 *   candidate by is computed by a file the old one-file hash never read. That
 *   same unread file also holds `BEND_RULE`, the 0.1" stripboard pitch and
 *   `TOOL_MIN_SPAN_HOLES`/`TOOL_MAX_SPAN_HOLES`.
 * - `lib/kicad/pin-pattern.ts` only TYPE-imports from
 *   `lib/kicad/pin-pattern-model.ts`, which is where the runtime `admitPattern`
 *   `HC10` calls actually lives.
 *
 * So the bend arithmetic, the board pitch, the hole clamp or `admitPattern`
 * could be edited after a run and both hashes still matched, both refusals
 * stayed silent, and the gate admitted a layout graded under span and pattern
 * bounds that no longer held - exactly the "a parameter cannot be slipped in
 * after a run" that `G2.2` exists for. `make check` does NOT mitigate it: such
 * an edit changes the bounds the candidate was graded under without changing the
 * netlist, so `G4` sees nothing.
 */
import { closureSha256 } from "../../lib/import-closure.ts"

/**
 * The span table's entry module, repository-relative.
 *
 * Repository-relative rather than absolute because `closureSha256` reports its
 * closure in repository-relative paths and hashes them, so an absolute entry
 * would hash the same closure under a path that varies by checkout.
 */
export const SPAN_DATA_ENTRY = "lib/kicad/lead-span.ts"

/** The pin-pattern table's entry module, repository-relative. */
export const PIN_PATTERN_ENTRY = "lib/kicad/pin-pattern.ts"

/** The sha256 of the span table's whole import closure, as `run.json` records it. */
export function spanClosureHash(): string {
  return closureSha256(SPAN_DATA_ENTRY)
}

/** The sha256 of the pin-pattern table's whole import closure, as `run.json` records it. */
export function pinPatternClosureHash(): string {
  return closureSha256(PIN_PATTERN_ENTRY)
}
