/**
 * HC8's geometry contract: which dump lines the copper reconstruction reads,
 * which malformed inputs it refuses, and why none of the nine can be guessed
 * past.
 *
 * Its own file because `copper.ts` holds the reconstruction and this holds
 * the vocabulary the reconstruction is judged against - and because the nine
 * reasons below are prose a reviewer reads in one sitting, not comments
 * scattered through a union-find. `copper.ts` re-exports what Task 4's
 * consumers were promised, so the split is invisible to them.
 *
 * THE AUTHORITY is HC8 and the trust-boundary paragraphs around it in
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`.
 * Where this file and that document differ, the document wins.
 *
 * ONE PLACE WHERE THEY DIFFER TODAY, AND IT IS RECORDED RATHER THAN HIDDEN.
 * CRITERIA's geometry-contract table is headed "version 1" and lists six
 * lines. `PAD` is a SEVENTH, added here at version 2, and the reason is
 * measured rather than argued: on the frozen low-boost fixture the netlist
 * export names `RV_LO_BOOST.1` and `SW_LO_BOOST.1`..`.7` while the dump's
 * `PIN` lines name `RV_LO_BOOST_1.1` and `SW_LO_BOOST_1.1`..`SW_LO_BOOST_7.1`
 * - VeroRoute expands a `PADS<n>` component into n one-hole pads, and the
 * `PAD <name> <value> <FLOATING|AT r,c> <FROM <ref>.<pin>|NOPROVENANCE>` line
 * is the ONLY place the dump records which reference pin each expanded pad
 * is. Without it, HC8 on that board refuses ten of its twenty-seven pins as
 * `reference-pin-not-on-board` and the frozen fixture - B1-frozen's own
 * benchmark - cannot be graded at all.
 *
 * `PAD` ADDS NO JOIN MECHANISM. It is read for pin IDENTITY only, never as an
 * edge, so COST 1.5's three mechanisms and the absence of a fourth are
 * untouched. What changed is the set of lines read, which is exactly what
 * `GEOMETRY_CONTRACT_VERSION`'s own rule says a bump means.
 *
 * CRITERIA's table is the authority and this file is not allowed to amend it,
 * so the divergence is reported for the spec to absorb; until it does, a
 * reader comparing the two should treat this comment as the record of why
 * they disagree, not as permission for a third line to arrive the same way.
 */

/**
 * The version of the dump-line contract the reconstruction reads: the lines
 * in `CONTRACTED_LINES`, with the fields CRITERIA's geometry-contract table
 * lists.
 *
 * A BUMP MEANS the set of lines read, or the fields read from one of them,
 * CHANGED - so a consumer pinned to version 1 can no longer assume it knows
 * what was consumed. It is not a version of these files: a refactor that
 * reads the same fields does not bump it. What pins the contract to a binary
 * is already in the canonical hash (PIPELINE 10.1 hashes `veroroute.pin` and
 * the commit the binary was built from), so a grammar change arriving under
 * the contract changes the hash rather than passing unnoticed.
 */
export const GEOMETRY_CONTRACT_VERSION = 2

/**
 * Every dump line the reconstruction consumes. CRITERIA's geometry-contract
 * table is the authority for the first six; `PAD` is version 2's addition and
 * the module comment above records why it is here and why it is not an edge.
 */
export const CONTRACTED_LINES: readonly string[] = [
  "GRID",
  "VERTICAL_STRIPS",
  "PIN",
  "PAD",
  "CUT",
  "SOLDER",
  "WIRE",
]

/**
 * The contracted lines whose ABSENCE is malformed, as opposed to the four
 * whose lists "may legitimately be zero lines, e.g. a strip board with only
 * one net on it" (CRITERIA). `CUT_STATE COMPUTED` is what makes zero `CUT`
 * lines evidence rather than silence, which is why `cuts-not-computed`
 * exists; `CUT_STATE` is itself a guard on the cut list rather than a
 * geometry line, so it is not in `CONTRACTED_LINES`.
 */
export const LINES_REQUIRED_PRESENT: readonly string[] = ["GRID", "VERTICAL_STRIPS"]

/**
 * The thirteen enumerated malformed-geometry refusals - the nine of version 1
 * plus the four `PAD` brought with it. A union rather than a loose string so
 * the set is a type and cannot grow silently, and so the `switch` in
 * `notDefaultedBecause` proves every member has a reason: add a fourteenth
 * member without an arm and `bun run typecheck` fails, because the function
 * then has a reachable end and a declared `string` return.
 */
export type GeometryRefusal =
  | "missing-line"
  | "out-of-bounds"
  | "cut-not-strip-adjacent"
  | "cut-across-strips"
  | "duplicate-pin"
  | "conflicting-pin"
  | "unsupported-strip-axis"
  | "cuts-not-computed"
  | "solder-not-strip-neighbours"
  | "pad-unreadable"
  | "pad-without-provenance"
  | "pad-pin-count"
  | "pad-provenance-collision"

/**
 * One sentence per refusal: why the malformed input is not guessed past.
 *
 * "Refuse rather than guess" applies here with no latitude. A
 * reconstruction that resolves an ambiguity by choosing is a reconstruction
 * reporting a connectivity it did not compute, and it reports it with the
 * same confidence as a correct one - which is exactly the failure HC8
 * exists to catch in the optimiser.
 */
export function notDefaultedBecause(refusal: GeometryRefusal): string {
  switch (refusal) {
    case "missing-line":
      return (
        "The board's extent and its strip axis are DEFINITIONS, not defaults: a dump with " +
        "no VERTICAL_STRIPS line does not default to rows and a dump with no GRID line does " +
        "not infer the extent from the pins. A missing line means the binary is not the " +
        "pinned fork or the grammar has changed under the contract."
      )
    case "unsupported-strip-axis":
      return (
        'A third VERTICAL_STRIPS value means the grammar moved, and "the same strip" has ' +
        "no meaning until the axis is read. Choosing rows or columns here would decide the " +
        "whole connectivity question by assumption."
      )
    case "cuts-not-computed":
      return (
        "Under any state but COMPUTED the cut list is NOT EMITTED, so zero CUT lines is " +
        "indistinguishable from no cuts - and a graph built from that joins holes the board " +
        "severs, which is the most convincing wrong answer this reconstruction can produce. " +
        "Resolve the board's cuts (tools/perfboard/cut-state.ts explains why they are " +
        "unresolved) and dump it again."
      )
    case "out-of-bounds":
      return (
        "A coordinate off the board is either a grammar change or a corrupt dump. Clamping " +
        "it invents a hole, and a hole that does not exist conducts to whatever it is " +
        "clamped onto."
      )
    case "cut-not-strip-adjacent":
      return (
        'The contract is that a CUT names "the two strip-adjacent holes to sever the strip ' +
        'between". Which of the intervening gaps a wider pair means to sever is not stated ' +
        "and is not derivable from the line."
      )
    case "cut-across-strips":
      return (
        "A cut severs a strip ALONG its run, so a pair naming two different strips describes " +
        "nothing the fork emits. Severing either strip, or both, would be the reconstruction " +
        "choosing a board."
      )
    case "duplicate-pin":
      return (
        "A repeated PIN record means the dump was concatenated or the parse is wrong. " +
        "Silently de-duplicating hides both, and both change what every later check reads."
      )
    case "conflicting-pin":
      return (
        "One lead cannot be in two holes, so picking either is picking a board - and the " +
        "board picked would then be graded as if it were the one on the bench."
      )
    case "solder-not-strip-neighbours":
      return (
        'The contract\'s own words are "two strip-adjacent holes on two different, ' +
        'neighbouring strips". A bridge between non-neighbours is a join mechanism this ' +
        "edge set has not got, and inventing a path for it would add COST 1.5's forbidden " +
        "fourth mechanism."
      )
    case "pad-unreadable":
      return (
        "The fork's own grammar is `PAD <name> <value> <FLOATING|AT r,c> " +
        "<FROM <ref>.<pin>|NOPROVENANCE>` (Src/Headless_dump.cpp), and every field of it is " +
        "whitespace-free by construction - an empty value prints as \"-\". A line that does " +
        "not read that way means the grammar moved under the contract, so guessing which " +
        "field is which would mis-key a pin while reporting a verdict."
      )
    case "pad-without-provenance":
      return (
        "A placed PAD prints NOPROVENANCE when the board has lost which netlist pin it came " +
        "from, and that mapping is not recoverable from anything else in the dump: the pad's " +
        "own name is the board's, not the schematic's. Grading the hole under the pad's board " +
        "name would compare a reference pin against nothing and report the net as split. " +
        "Re-import the board from its netlist so the provenance is recorded again."
      )
    case "pad-pin-count":
      return (
        "A PAD is one hole, so a placed one has exactly one PIN line, and its one FROM " +
        "reference names exactly one pin. Choosing which of several holes the reference pin " +
        "means would decide the connectivity question by assumption, and reporting none of " +
        "them would read as a reference pin that is not on the board."
      )
    case "pad-provenance-collision":
      return (
        "Two holes claiming one reference pin cannot both be it, and whichever were kept " +
        "would be graded as if it were the board on the bench. It means either the dump " +
        "pairs two pads with one source pin or a pad's source collides with a real part's " +
        "own PIN id - both are producer defects, and neither is resolvable here."
      )
  }
}

/**
 * Refuse, naming the `GeometryRefusal` member, the offending line, why it is
 * not defaulted, and the contract version - so a grammar change arriving
 * under the contract is distinguishable from a bad board.
 */
export function refuse(refusal: GeometryRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      `(HC8 geometry contract version ${GEOMETRY_CONTRACT_VERSION}; ` +
      "GEOMETRY_CONTRACT_VERSION is declared in tools/stripboard/geometry-contract.ts, and " +
      "docs/stripboard/pipeline-verification.md records what an HC8 pass does and does " +
      "not cover.)",
  )
}
