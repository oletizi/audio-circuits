/**
 * The one answer to "what can a gesture move on this board".
 *
 * **WHY IT EXISTS, MEASURED RATHER THAN ARGUED.** Every move generator in this
 * directory enumerated over `dump.parts`, and `tools/guide/dump.ts`'s
 * `parseParts` reads `PART` lines only - so an off-board pad, which the fork
 * prints as a `PAD` line, was in no generator's loop and no arm could ever
 * move one. That is not a limit of the fork. Measured against the pinned
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
 */
export function movableRefs(dump: BoardDump, dumpText: string): readonly Movable[] {
  const movable: Movable[] = []
  const kindOf = new Map<string, "part" | "pad">()
  const add = (one: Movable): void => {
    const already = kindOf.get(one.ref)
    if (already !== undefined) {
      throw new Error(
        `movableRefs: the ref "${one.ref}" is named by both a ${already.toUpperCase()} line and ` +
          `a ${one.kind.toUpperCase()} line on this board, so two things answer to one --ref. ` +
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
