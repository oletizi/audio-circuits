/**
 * THE MEASURE A SPACING GESTURE DRIVES DOWN: how many of a pad's neighbours
 * along its own strip hold another net's copper.
 *
 * **SPLIT FROM `./moves-space.ts` FOR THE 500-LINE CEILING, AT THE SEAM THAT
 * FILE ALREADY HAD**: this one answers *what is the quantity* and that one
 * answers *which gestures does this board admit against it*. The same division
 * as `./moves-model.ts` / `./moves.ts` and `./constraints-model.ts` /
 * `./constraints.ts`. `./moves-space.ts` stays the module `./moves.ts` names and
 * re-exports `padAbutments`, so no consumer outside the pair imports this
 * directly.
 *
 * **THE QUANTITY IS THE PLAN'S AND NOT THIS MODULE'S.**
 * `.superpowers/sdd/2026-10-13-buildable-pultec-layouts/`'s Task 2 brief names
 * it - *"the number of same-strip abutments between different nets"* - and this
 * file is its arithmetic and nothing else. No preferred spacing is encoded here:
 * no target gap, no "every third hole", no magic number. The owner's
 * every-third-hole selector row is EVIDENCE THAT SPACING HELPS and is not a
 * constant to score against; `./movable.ts` says the same of itself, in the same
 * words, and for the same reason - an agent may not author the criteria for the
 * artifact it is producing.
 *
 * **WHY IT IS AN ABUTMENT AND NOT A SEGMENT'S FREE HOLES, stated so the proxy
 * is not mistaken for the thing - and the distinction below was got wrong once
 * and corrected on measurement.** `alongStrip` below reads PHYSICALLY ADJACENT
 * holes, one position either side. **The quantity `C` counts is a different
 * adjacency: OCCUPATION ORDER.** A cut sits between two holes rather than in
 * one, so two different-net holes two apart with nothing between them are still
 * consecutive in the sequence of occupied holes along the strip and still take a
 * cut - `docs/stripboard/pipeline-verification.md` section 11.2 states the block
 * identity that reproduces the fork's cut count exactly, and it is
 * occupation-order throughout.
 *
 * **THE RELATION BETWEEN THE TWO IS ONE-DIRECTIONAL, which is worth having
 * straight.** Two holes in adjacent positions are necessarily consecutive in
 * occupation order, so **every abutment this file counts IS a block boundary and
 * a cut**; the converse fails. This measure is therefore a LOWER BOUND on the
 * boundaries a strip carries, never an over-count, and it falls to zero on a row
 * whose holes are all spaced apart however many cuts that row still needs.
 *
 * **SO THIS IS A PACKING MEASURE AND NOT A CUT PREDICTOR, AND THE GATE HAS TO BE
 * THE PACKING ONE.** Read the owner's hand-laid selector row in occupation
 * order: columns 9, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26 of strip 3, in
 * nets `j10_p1 j10_p1 j10_p2 j10_p2 j10_p3 j10_p3 j10_p4 j10_p4 j10_p6 j10_p6
 * j10_p5 j10_p5` - six blocks, so **five cuts on that strip, which a six-throw
 * selector sharing one strip cannot avoid.** An occupation-order gate would
 * therefore score his row non-zero and keep proposing gestures against a layout
 * that is already right. The PHYSICAL reading scores it ZERO on all ten pads,
 * which is the signal the gesture actually needs: *is this row packed*. What his
 * spacing buys is a FREE HOLE inside each net's own stretch of strip, which is
 * where a wire can anchor - the thing the brief says a packed pad row denies,
 * since a net whose every hole is a pad has nowhere to solder one.
 *
 * This file does not count free holes per block and does not predict `C`; it
 * counts physical adjacency, which is the quantity the brief named and the one
 * that tells a packed row from a spaced one, and `F` is what says what a
 * candidate did one evaluation later. The two readings are CORRELATED and not
 * the same: section 11.3 measures the controlling condition for `dC < 0` and
 * finds it is the pad being its own net-BLOCK, which this measure does not
 * compute - 70 of this board's 315 candidates pass the packing gate and cannot
 * reduce `C`, and `./moves-space.ts` carries that figure and why they are not
 * narrowed out.
 *
 * **IT TAKES NO `Occupancy`, AND THAT IS MEASURED RATHER THAN CONVENIENT.** The
 * one board that proves the gesture STOPS proposing is the owner's hand layout,
 * and `occupancyOf` cannot read it: re-dumped with the pinned binary on
 * 2026-10-13 that `.vrt` prints `DIRECTION S` on six of its eight parts and
 * `DIRECTION N` on `R2`, and `occupancyOf` refuses a part across the strips by
 * name, because for such a part `SPAN` is the footprint's ROW count while its
 * column extent appears in no dump line. A measure that needed an occupancy
 * could therefore not be asserted against the one artifact it has to agree
 * with. So this file reads the dump's HOLES and the reference netlist, and the
 * FOOTPRINT question - does a pad fit there - belongs to `occupancyAfter`, the
 * one advance, which `./moves-space.ts`'s `spacingMoves` consults.
 */
import type { BoardDump } from "../guide/dump.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { padLines, type PadLine } from "./pad-provenance.ts"

/** `${row},${col}` - the key every hole map and hole set in this pair is keyed by. */
export function holeKey(row: number, col: number): string {
  return `${row},${col}`
}

/**
 * One placed pad, with its hole and the net the REFERENCE NETLIST puts it on.
 *
 * `net` is `undefined` when the reference does not carry the pad's source pin,
 * or when the `PAD` line says `NOPROVENANCE` - and such a pad gets no gesture,
 * because the measure is defined over nets and there is no net to compare.
 */
export interface PlacedPad {
  readonly ref: string
  readonly row: number
  readonly col: number
  readonly net: string | undefined
}

/** Which net each reference pin id is on, keyed the netlist's own way. */
function netOfPin(reference: ReferenceNets): ReadonlyMap<string, string> {
  const owner = new Map<string, string>()
  for (const [net, pins] of reference) {
    for (const pin of pins) owner.set(pin, net)
  }
  return owner
}

/**
 * Every placed `PAD`, in the dump's own order, with its hole and its net.
 *
 * **THE NET COMES FROM `PadLine.source` ALONE, and that is measured.** A placed
 * pad prints exactly one `PIN` line, and `source` - the `FROM SW_LO_BOOST.2`
 * field - is already in the reference netlist's own spelling, so the
 * reference's key is `source` with nothing in between. All ten of the
 * import-placed low-boost board's `source` fields were confirmed present in the
 * frozen export. `./pad-provenance.ts`'s `referencePinHoles` is NOT used: it is
 * keyed the other way round, by reference pin, and it refuses conditions this
 * measure has no business refusing.
 *
 * A FLOATING PAD IS EXCLUDED for `./movable.ts`'s reason: `--move` refuses a
 * component with no hole to leave, so it has nothing to be spaced out of.
 */
export function placedPads(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): readonly PlacedPad[] {
  const owner = netOfPin(reference)
  const placed: PlacedPad[] = []
  for (const pad of padLines(dumpText)) {
    if (pad.placement === "floating") continue
    requireOneHole(pad, dump)
    const source = pad.source
    placed.push({
      ref: pad.ref,
      row: pad.placement.row,
      col: pad.placement.col,
      net: source === undefined ? undefined : owner.get(source),
    })
  }
  return placed
}

/**
 * Refuse a placed pad the dump prints anything but ONE `PIN` line for.
 *
 * A `PADS<n>` component expands into n ONE-HOLE pads
 * (`./pad-provenance.ts`'s module comment records the measurement), and this
 * measure is computed AT the pad's hole - so two `PIN` lines would make "the
 * pad's hole" two holes and the count would be taken at whichever the code
 * reached first. It is not resolved by preferring either: which hole the gesture
 * would move FROM is not in the data, and a `--to` derived from the wrong one
 * puts the pad somewhere nobody measured.
 */
function requireOneHole(pad: PadLine, dump: BoardDump): void {
  const pins = dump.pins[pad.ref] ?? []
  if (pins.length !== 1) {
    throw new Error(
      `padAbutments: the placed PAD ${pad.ref} has ${pins.length} PIN lines on this board, and a ` +
        "PADS<n> component expands into n ONE-HOLE pads, so exactly one is expected " +
        `("${pad.line}"). It is NOT resolved by taking the first: the abutment count is measured ` +
        "AT the pad's hole and a gesture moves it FROM that hole, so the two readings would " +
        "disagree about which hole the pad is in. Fix the PAD/PIN pair in the source .vrt, or " +
        "widen tools/stripboard/pad-provenance.ts's PadLine to carry several holes with a " +
        "measurement of what --move does to such a component beside it.",
    )
  }
}

/**
 * Which net each hole on the board belongs to, keyed `${row},${col}` - a pad's
 * through its `FROM` field and every other pin's through its own id.
 *
 * **A HOLE THE REFERENCE DOES NOT CARRY GETS NO ENTRY, AND THAT IS NOT A
 * DEFAULT.** Such a hole is not a net segment, so it cannot make an abutment and
 * must not be counted as one - `./moves-spread.ts`'s `netOfHole` states the same
 * rule for the same reason. On the import-placed low-boost board graded against
 * the frozen nine-net export this is most of rows 1 and 2, whose parts belong to
 * the other Pultec sections.
 */
export function netOfHoles(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): ReadonlyMap<string, string> {
  const owner = netOfPin(reference)
  const padRefs = new Map<string, string | undefined>()
  for (const pad of padLines(dumpText)) padRefs.set(pad.ref, pad.source)
  const nets = new Map<string, string>()
  for (const [ref, pins] of Object.entries(dump.pins)) {
    for (const pin of pins) {
      // A PAD'S HOLE IS KEYED THE BOARD'S WAY AND ITS NET THE NETLIST'S, so the
      // `FROM` field is the bridge and the `PIN` line's own id is not asked.
      const id = padRefs.has(ref) ? padRefs.get(ref) : `${ref}.${pin.pin}`
      const net = id === undefined ? undefined : owner.get(id)
      if (net !== undefined) nets.set(holeKey(pin.row, pin.col), net)
    }
  }
  return nets
}

/**
 * Every hole the dump states copper on: each `PIN` hole, and each hole a `WIRE`
 * spans end to end.
 *
 * The wires are here because a pad cannot be put down on one - measured against
 * the fork and recorded in `./seed-geometry.ts`'s own occupancy, which carries
 * every wire's rect for exactly this reason.
 *
 * **WHAT IT DOES NOT HOLD, NAMED RATHER THAN LEFT TO BE FOUND: a part's BODY
 * CELLS.** `CAP_FILM_WIDE`'s two leads sit in the middle row of a three-row
 * footprint, so two of `C18`'s three rows hold no `PIN` and are occupied all the
 * same - and a `RESISTOR` of `SPAN 5` prints leads at its two ends and covers
 * the three holes between them. So this set is the one the COST IDENTITY is
 * computed over (`./targets.ts`'s `occupiedStrips` reads `PIN` holes, and
 * `./moves-spread.ts`'s `spreadTargetStrips` records that a wire's holes do not
 * make a strip occupied for that purpose) and NOT the set a placement must
 * clear. The difference is handed to `occupancyAfter`, the one advance, rather
 * than respelled here: a second answer to *does a part fit* is a second thing to
 * keep correct, and the fork is the authority for it.
 */
export function holesWithCopper(dump: BoardDump): ReadonlySet<string> {
  const taken = new Set<string>()
  for (const own of Object.values(dump.pins)) {
    for (const pin of own) taken.add(holeKey(pin.row, pin.col))
  }
  for (const wire of dump.wires) {
    const [from, to] = wire.ends
    for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row += 1) {
      for (let col = Math.min(from.col, to.col); col <= Math.max(from.col, to.col); col += 1) {
        taken.add(holeKey(row, col))
      }
    }
  }
  return taken
}

/**
 * The two holes beside `(row, col)` ALONG ITS OWN STRIP: one position down, one
 * up, off-board positions left out.
 *
 * **ALONG THE STRIP AND NOT THE FOUR NEIGHBOURS**, because only the strip axis
 * can carry a cut at all: a strip conducts along its length, so two holes on it
 * are joined unless a cut separates them, while two holes on ADJACENT strips are
 * not joined and no cut is needed between them. The strip axis is
 * `./constraints-model.ts`'s `stripOf`, the one definition, read here off
 * `dump.verticalStrips` for a bare pair rather than a `Pin`.
 *
 * **ONE POSITION EITHER SIDE AND NOT THE NEXT OCCUPIED HOLE**, which is the
 * module comment's correction and the whole of what makes this a packing measure
 * rather than a cut predictor. Read the other way it would score the owner's own
 * row at five cuts on strip 3 and never stop proposing against it.
 */
function alongStrip(
  dump: BoardDump,
  row: number,
  col: number,
): readonly (readonly [number, number])[] {
  const beside: (readonly [number, number])[] = []
  for (const step of [-1, 1]) {
    const next: readonly [number, number] = dump.verticalStrips
      ? [row + step, col]
      : [row, col + step]
    if (next[0] < 0 || next[1] < 0) continue
    if (next[0] >= dump.grid.rows || next[1] >= dump.grid.cols) continue
    beside.push(next)
  }
  return beside
}

/**
 * How many of the holes beside `(row, col)` along its strip hold a DIFFERENT
 * net's copper, with `vacated` treated as empty.
 *
 * `vacated` is the hole the pad is leaving: a destination a short way from a
 * pad's own origin can have that origin as a neighbour, and after the gesture it
 * is free. Without it the measure would count the pad as its own neighbour and a
 * short slide would look worse than it is.
 */
export function abutmentsAt(
  dump: BoardDump,
  nets: ReadonlyMap<string, string>,
  row: number,
  col: number,
  net: string,
  vacated: string,
): number {
  let count = 0
  for (const [nextRow, nextCol] of alongStrip(dump, row, col)) {
    const key = holeKey(nextRow, nextCol)
    if (key === vacated) continue
    const other = nets.get(key)
    if (other !== undefined && other !== net) count += 1
  }
  return count
}

/**
 * For every placed pad, how many different-net abutments it has where it
 * stands - the quantity a spacing gesture drives down, in the dump's `PAD`
 * order.
 *
 * **EXPORTED SO THE MEASURE IS ASSERTABLE WITHOUT THE GENERATOR**, which is
 * what makes `tests/stripboard/moves-space.test.ts`' two opposite-facing board
 * tests tight: an empty gesture list agrees with many wrong implementations -
 * one that reads no pads at all passes it - and the discriminating fact is that
 * the owner's hand-laid row scores ZERO on every one of its ten pads while
 * `--import`'s row scores one or two on nine of ten.
 *
 * A pad whose net the reference does not carry is counted as `0`: there is no
 * net to compare its neighbours against, so no abutment of its is OBSERVED. That
 * is a statement about what is known and not about the board, and the
 * consequence is stated where it bites - such a pad gets no gesture.
 */
export function padAbutments(
  dump: BoardDump,
  dumpText: string,
  reference: ReferenceNets,
): ReadonlyMap<string, number> {
  const nets = netOfHoles(dump, dumpText, reference)
  const counts = new Map<string, number>()
  for (const pad of placedPads(dump, dumpText, reference)) {
    const net = pad.net
    counts.set(
      pad.ref,
      net === undefined
        ? 0
        : abutmentsAt(dump, nets, pad.row, pad.col, net, holeKey(pad.row, pad.col)),
    )
  }
  return counts
}
