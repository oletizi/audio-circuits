import type { BoardDump, Bridge, Cut, HolePosition, Wire } from "./dump.ts"

/**
 * The one numbering of a board's cuts, solder bridges and wire links,
 * shared by the layout images and the build checklist so the two always
 * agree.
 *
 * Numbers run from 1 in reading order on the component side: by row, then
 * by column, of each mark's first hole (the one that comes first in that
 * same order), with the second hole breaking any tie. The copper-side view
 * mirrors the board but keeps the cut and bridge numbers; it draws no wires.
 *
 * A wire's number is its own (W1, W2 ...), not VeroRoute's name for it
 * (Wire1, Wire6 ...), which follows the order the wires were placed in.
 */

export function compareHoles(a: HolePosition, b: HolePosition): number {
  return a.row - b.row || a.col - b.col
}

/** A mark's two holes, the one that comes first in reading order first. */
export function inReadingOrder(a: HolePosition, b: HolePosition): readonly [HolePosition, HolePosition] {
  return compareHoles(a, b) <= 0 ? [a, b] : [b, a]
}

function compareMarks(x: { a: HolePosition; b: HolePosition }, y: { a: HolePosition; b: HolePosition }): number {
  const [x1, x2] = inReadingOrder(x.a, x.b)
  const [y1, y2] = inReadingOrder(y.a, y.b)
  return compareHoles(x1, y1) || compareHoles(x2, y2)
}

export function numberedCuts(dump: BoardDump): readonly { number: number; cut: Cut }[] {
  return [...dump.cuts].sort(compareMarks).map((cut, index) => ({ number: index + 1, cut }))
}

export function numberedBridges(dump: BoardDump): readonly { number: number; bridge: Bridge }[] {
  return [...dump.bridges].sort(compareMarks).map((bridge, index) => ({ number: index + 1, bridge }))
}

/** A wire link with its number and its two ends in reading order. */
export interface NumberedWire {
  readonly number: number
  readonly wire: Wire
  readonly from: HolePosition
  readonly to: HolePosition
}

export function numberedWires(dump: BoardDump): readonly NumberedWire[] {
  return [...dump.wires]
    .map((wire) => ({ a: wire.ends[0], b: wire.ends[1], wire }))
    .sort(compareMarks)
    .map(({ a, b, wire }, index) => {
      const [from, to] = inReadingOrder(a, b)
      return { number: index + 1, wire, from, to }
    })
}
