import type { BoardDump, Bridge, Cut, HolePosition } from "./dump.ts"

/**
 * The one numbering of a board's cuts and solder bridges, shared by the
 * layout images and the build checklist so the two always agree.
 *
 * Numbers run from 1 in reading order on the component side: by row, then
 * by column, of each mark's first hole (the one that comes first in that
 * same order), with the second hole breaking any tie. The copper-side view
 * mirrors the board but keeps these numbers.
 */

function compareHoles(a: HolePosition, b: HolePosition): number {
  return a.row - b.row || a.col - b.col
}

function readingKey(a: HolePosition, b: HolePosition): readonly [HolePosition, HolePosition] {
  return compareHoles(a, b) <= 0 ? [a, b] : [b, a]
}

function compareMarks(x: { a: HolePosition; b: HolePosition }, y: { a: HolePosition; b: HolePosition }): number {
  const [x1, x2] = readingKey(x.a, x.b)
  const [y1, y2] = readingKey(y.a, y.b)
  return compareHoles(x1, y1) || compareHoles(x2, y2)
}

export function numberedCuts(dump: BoardDump): readonly { number: number; cut: Cut }[] {
  return [...dump.cuts].sort(compareMarks).map((cut, index) => ({ number: index + 1, cut }))
}

export function numberedBridges(dump: BoardDump): readonly { number: number; bridge: Bridge }[] {
  return [...dump.bridges].sort(compareMarks).map((bridge, index) => ({ number: index + 1, bridge }))
}
