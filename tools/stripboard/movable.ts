/**
 * The one answer to "what can a gesture move on this board".
 *
 * **WHY IT EXISTS, MEASURED RATHER THAN ARGUED.** Every move generator that
 * enumerated over a COMPONENT enumerated over `dump.parts`, and
 * `tools/guide/dump.ts`'s `parseParts` reads `PART` lines only - so an
 * off-board pad, which the fork prints as a `PAD` line, was in no such loop
 * and no arm could ever move one. (`./moves-wire-nets.ts`'s
 * `netPinsAlongStrips` is the one generator that walked `dump.pins` instead, so
 * it already saw a pad's HOLE; it gated the hole out on the pin-id spelling
 * until that function was translated, and the measurement that cost is recorded
 * there.) None of this is a limit of the fork. Measured against the pinned
 * binary on 2026-10-13:
 *
 *     $ veroroute --move t.vrt --ref SW_LO_BOOST_2 --to 13,1 -o t3.vrt
 *     MOVED SW_LO_BOOST_2 FROM 3,11 TO 13,1 IN GRID 14 32
 *     $ echo $?
 *     0
 *
 * One `MOVED` line, so the verb takes a pad's board ref and moves that pad
 * ALONE - pads are not grouped, and a pad row can be spaced one pad at a time.
 * An earlier attempt with `--delta 0,1` was refused on an occupied
 * destination, which is how the verb is known to engage rather than ignore the
 * ref. So the gap was in this repository's TypeScript, and this module closes
 * it: the generators read the union and `dump.parts` is no longer the whole
 * movable set.
 *
 * **IT TAKES BOTH THE PARSED DUMP AND THE TEXT, AND THAT IS NOT REDUNDANCY.**
 * `./climb-evaluate.ts` records that *"a parsed dump carries no `PAD`"*:
 * `BoardDump` genuinely has no pad lines, so the text is the only source for
 * them, and that is also why this cannot live inside `parseBoardDump`. The
 * `PAD` grammar is read through `./pad-provenance.ts`'s `padLines`, which
 * already refuses an unreadable line by name, rather than respelled here - a
 * second spelling of one grammar is a second thing to keep correct.
 *
 * **IT DECLARES NOTHING ABOUT WHERE A PAD SHOULD GO.** This module answers
 * only which refs a gesture may name. Which arrangement is better is
 * `./climb-accepts.ts`'s and the rules file's to judge, and encoding a
 * preferred pad spacing here would be this module grading its own output.
 */
import type { BoardDump } from "../guide/dump.ts"
import { padLines } from "./pad-provenance.ts"

/** One thing a gesture may name, and the hole it would move from. */
export interface Movable {
  readonly ref: string
  readonly row: number
  readonly col: number
  /** Which dump line it came from: a `PART` or a `PAD`. */
  readonly kind: "part" | "pad"
}

/**
 * Every ref a gesture may name on this board: the dump's placed `PART` lines in
 * the dump's own order, then its placed `PAD` lines in theirs.
 *
 * **THE ORDER IS THE DUMP'S, BECAUSE THE GENERATORS' ORDER HAS TO BE
 * REPRODUCIBLE** - `./moves.ts`'s `partMoves` says the same of itself, for the
 * run hash. Parts keep their existing positions in the sequence and pads are
 * appended, so adding pads moves no existing candidate's index.
 *
 * **A FLOATING PART OR PAD IS EXCLUDED, AND IT IS A FORK FACT RATHER THAN A
 * PREFERENCE.** `--move` and `--rotate` refuse an unplaced component by name
 * (the shared FLOATING refusal `./seed-geometry.ts` quotes), so it has no hole
 * to move FROM and every gesture naming it would be refused. It is excluded
 * loudly here - in this comment and in the type, which makes an unplaced pad's
 * missing hole unrepresentable - rather than silently dropped.
 *
 * **IT RE-PARSES THE DUMP TEXT ON EVERY CALL, AND THAT IS LEFT ALONE
 * DELIBERATELY.** The spread's inner loops reach it roughly
 * `nets x crowded x free x 4` times per round. Per call: 0.0218 ms measured
 * 2026-10-13, 0.0279 ms on re-measurement over 2,000 calls the same day - the
 * same reading. Against four fork spawns per evaluation, which dominate it by
 * orders of magnitude. **A cache added on that evidence would be a cache added
 * blind, and it would have to be invalidated per candidate.** If a later task's
 * round times look wrong, this is the first place to look.
 *
 * **ONE FIGURE THIS COMMENT CARRIED DID NOT REPRODUCE, AND IT IS CORRECTED
 * RATHER THAN FOOTNOTED.** It read *"4.7 ms for a whole `enumerateMoves` on the
 * real low-boost board"*. Re-measured on the same fixture later the same day:
 * **31.3 ms with the spacing generator removed, 40.9 ms with it.** So the whole
 * enumeration is roughly 7x what was recorded, and the spacing kind adds about
 * 9.6 ms of model work to a round whose fork time is ~17.5 s - a fifth of a
 * percent, which is why the conclusion above is unchanged. The 4.7 ms was
 * written in this plan's Task 1 and the non-reproduction found in its Task 2,
 * two commits apart, so it is this comment's to fix: a figure left standing
 * with its correction in another file is the stale-claim shape this repository
 * keeps paying for. `docs/stripboard/pipeline-verification.md` section 11.7
 * holds the measurement.
 */
export function movableRefs(dump: BoardDump, dumpText: string): readonly Movable[] {
  const movable: Movable[] = []
  const kindOf = new Map<string, "part" | "pad">()
  const add = (one: Movable): void => {
    const already = kindOf.get(one.ref)
    if (already !== undefined) {
      // TWO LINES OF ONE KIND READS AS "two PART lines", NOT "both a PART line
      // and a PART line". The duplicate-within-one-kind case is the likelier of
      // the two on a hand-edited `.vrt`, so it is the one that must not come out
      // as nonsense.
      const lines =
        already === one.kind
          ? `two ${one.kind.toUpperCase()} lines`
          : `both a ${already.toUpperCase()} line and a ${one.kind.toUpperCase()} line`
      throw new Error(
        `movableRefs: the ref "${one.ref}" is named by ${lines} on this board, so two things ` +
          "answer to one --ref. " +
          "It is NOT resolved by preferring either: a gesture carries one ref and the fork moves " +
          "whichever component it finds first, so the arm would be proposing against one " +
          "geometry and the board would be changing the other. Rename one of the two in the " +
          "source .vrt - the same refusal tools/stripboard/seed-geometry.ts makes for a ref " +
          "that is both a WIRE and a PART, and for the same reason.",
      )
    }
    kindOf.set(one.ref, one.kind)
    movable.push(one)
  }
  for (const part of dump.parts) {
    if (part.placement === "floating") continue
    add({ ref: part.ref, row: part.placement.row, col: part.placement.col, kind: "part" })
  }
  for (const pad of padLines(dumpText)) {
    if (pad.placement === "floating") continue
    add({ ref: pad.ref, row: pad.placement.row, col: pad.placement.col, kind: "pad" })
  }
  return movable
}
