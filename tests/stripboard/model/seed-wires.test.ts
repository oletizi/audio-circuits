/**
 * WIRES DO NOT LIE ON TOP OF EACH OTHER: what his two built boards actually do
 * with their jumpers, and the behaviour that measurement produces on a seed.
 *
 * **THE DEFECT THIS ROUND EXISTS TO FIX.** `joinColumn` ranked candidate
 * columns by route clarity and then by lowest column number, so every join took
 * the first column where both its end holes happened to be free. On the
 * `feedback` netlist that put NINE of ten wires in column 5, with 24 of the 45
 * pairs sharing a column and overlapping in strips - three of them spanning 20
 * holes down the same line of air. The owner could not read the rendering and
 * said so. The rendering was faithful; the board was a bundle. It is the second
 * sighting of the tie-break `lib/stripboard/seed-place.ts`'s header already
 * records for placements, found in the one function that never got the fix.
 *
 * **WHAT THESE ESTABLISH.** That across `transistor-preamp-feedback` and
 * `transistor-preamp-buffered` he placed 8 wires with no two of them on top of
 * each other; that he nevertheless DID put two wires in one column where their
 * spans do not overlap, so the measured rule is non-coincidence and not a
 * column of one's own; that he ran a bridge under a wire 3 times in 9 bridges,
 * which is why that is ordered last rather than refused; and that no seed built
 * from a derived ordering stacks two wires or puts a bridge under one any more.
 *
 * **WHAT THEY DO NOT ESTABLISH.**
 *
 *   - **nothing here asserts a wire count, a column count or a score.** The
 *     property is coincidence, which is a yes-or-no about a pair of wires; a
 *     "wires should use at least N columns" threshold would be a criterion
 *     chosen by the thing being measured, which is the one thing this
 *     repository forbids outright;
 *   - **8 wires is a small sample, and the construction treats it as one.**
 *     Non-coincidence is a PREFERENCE ranked above lowest-column and below route
 *     clarity, not a refusal - a board with nowhere clear left still gets built,
 *     and no assertion here would catch that case, because neither of his boards
 *     is tight enough to produce it;
 *   - **the pair predicate is checked against a known count before it is
 *     trusted.** A coincidence test that silently examined zero wires would pass
 *     exactly as loudly as one that examined eight, and this repository has
 *     shipped three predicates that could never fire.
 */
import fs from "node:fs"
import { expect, test } from "bun:test"
import type { Hole } from "../../../lib/stripboard/board.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import { parseBoardDump } from "../../../tools/guide/dump.ts"
import { COMMITTED_BOARDS } from "../vero-import-fixtures.ts"
import {
  RECORDED_SPANS,
  STOCK,
  committedNetlist,
  derivedOrderings,
} from "./seed-fixtures.ts"
import { handBoard } from "./seed-room-fixtures.ts"

const BUILT = ["transistor-preamp-feedback", "transistor-preamp-buffered"] as const

interface Span {
  readonly ref: string
  readonly column: number
  readonly lo: number
  readonly hi: number
}

/**
 * The wires that run down a single column, as `ref: column lo-hi`.
 *
 * A wire whose ends are in different columns is dropped, because two sloping
 * wires sharing a column at one end do not lie along each other. Every caller
 * asserts how many wires survived, so a drop that was not expected is a
 * failure rather than a quieter pass.
 */
function verticalSpans(wires: readonly { readonly from: Hole; readonly to: Hole }[]): readonly Span[] {
  const spans: Span[] = []
  wires.forEach((wire, index) => {
    if (wire.from.column !== wire.to.column) return
    spans.push({
      ref: `W${index + 1}`,
      column: wire.from.column,
      lo: Math.min(wire.from.strip, wire.to.strip),
      hi: Math.max(wire.from.strip, wire.to.strip),
    })
  })
  return spans
}

/** Every pair of wires sharing a column whose strip ranges also overlap, inclusive at both ends. */
function coincidentPairs(
  wires: readonly { readonly from: Hole; readonly to: Hole }[],
): readonly string[] {
  const spans = verticalSpans(wires)
  const pairs: string[] = []
  for (let i = 0; i < spans.length; i += 1) {
    for (let j = i + 1; j < spans.length; j += 1) {
      const a = spans[i]
      const b = spans[j]
      if (a === undefined || b === undefined) throw new Error("unreachable: indices are in range")
      if (a.column !== b.column) continue
      if (a.lo <= b.hi && b.lo <= a.hi) pairs.push(`${a.ref}/${b.ref}`)
    }
  }
  return pairs
}

/**
 * Every bridge that shares a column with a wire and overlaps it in strips, as
 * `B<n> under W<m>`.
 *
 * A bridge joins two ADJACENT strips, so its span is two holes and the overlap
 * test is the same inclusive one the wires use.
 */
function bridgesUnderWires(
  wires: readonly { readonly from: Hole; readonly to: Hole }[],
  bridges: readonly { readonly column: number; readonly strips: readonly [number, number] }[],
): readonly string[] {
  const spans = verticalSpans(wires)
  const hits: string[] = []
  bridges.forEach((bridge, index) => {
    const lo = Math.min(bridge.strips[0], bridge.strips[1])
    const hi = Math.max(bridge.strips[0], bridge.strips[1])
    for (const span of spans) {
      if (span.column !== bridge.column) continue
      if (lo <= span.hi && span.lo <= hi) hits.push(`B${index + 1} under ${span.ref}`)
    }
  })
  return hits
}

test("THE EVIDENCE: none of his own wires lies on top of another", () => {
  let counted = 0
  for (const name of BUILT) {
    const board = handBoard(name)
    const spans = verticalSpans(board.wires)
    expect(spans.length, `every wire on ${name} runs down one column`).toBe(board.wires.length)
    expect(coincidentPairs(board.wires), `${name} stacks no wires`).toEqual([])
    counted += spans.length
  }
  expect(counted, "eight wires between the two boards, same count the route test uses").toBe(8)
})

test("THE RULE IS NON-COINCIDENCE, NOT A COLUMN OF ONE'S OWN", () => {
  // `feedback` runs Wire3 down column 3 from strip 0 to 5 and Wire1 down the
  // same column from 8 to 14. Sharing is his practice; overlapping is not. A
  // construction that gave every wire a column to itself would be stricter than
  // the boards it is modelled on, and would run out of columns sooner.
  const board = handBoard("transistor-preamp-feedback")
  const spans = verticalSpans(board.wires)
  const byColumn = new Map<number, Span[]>()
  for (const span of spans) byColumn.set(span.column, [...(byColumn.get(span.column) ?? []), span])
  const shared = [...byColumn.values()].filter((group) => group.length > 1)
  expect(shared.length, "exactly one column carries more than one wire").toBe(1)
  const group = shared[0]
  if (group === undefined) throw new Error("unreachable: length checked above")
  expect(group.length, "and it carries two of them").toBe(2)
  expect(coincidentPairs(board.wires), "whose spans do not overlap").toEqual([])
})

test("A BRIDGE UNDER A WIRE IS SOMETHING HE DOES, so it is ordered last and not refused", () => {
  // It is also the thing he could not read. A bridge is solder on the copper
  // side and a wire is a jumper over the component side, so the two share no
  // SPACE - but where they sit on each other the drawing cannot say whether the
  // wire ends at the bridge or passes through it, and those are different
  // builds. He does it 3 times in 9 bridges, which is why the construction
  // orders it last instead of refusing it: a refusal would reject both his
  // boards.
  let bridges = 0
  let under = 0
  for (const name of BUILT) {
    const entry = COMMITTED_BOARDS.find((board) => board.name === name)
    if (entry === undefined) throw new Error(`${name} is not in COMMITTED_BOARDS`)
    const dump = parseBoardDump(fs.readFileSync(entry.dump, "utf8"))
    const wires = dump.wires.map((wire) => ({
      from: { strip: wire.ends[0].row, column: wire.ends[0].col },
      to: { strip: wire.ends[1].row, column: wire.ends[1].col },
    }))
    const marks = dump.bridges.map((bridge) => ({
      column: bridge.a.col === bridge.b.col ? bridge.a.col : -1,
      strips: [bridge.a.row, bridge.b.row] as const,
    }))
    expect(
      marks.filter((mark) => mark.column === -1).length,
      `every bridge on ${name} joins two strips in one column`,
    ).toBe(0)
    bridges += marks.length
    under += bridgesUnderWires(wires, marks).length
  }
  expect(bridges, "nine bridges between the two boards").toBe(9)
  expect(under, "three of them lie under a wire").toBe(3)
})

test("THE REGRESSION: a seed no longer stacks its wires in one column", () => {
  // The property, not a column count: no two of a seed's wires share a column
  // with overlapping spans. Before the second ranking key this failed on every
  // ordering that built, with 24 coincident pairs on the part-walk seed.
  const { netlist } = committedNetlist("transistor-preamp-feedback")
  let built = 0
  for (const stride of [2, 3]) {
    for (const entry of derivedOrderings(netlist, stride)) {
      let seed
      try {
        seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [entry])[0]
      } catch (error) {
        expect(error instanceof Error ? error.message : String(error)).toStartWith(
          "stripboard-seed-",
        )
        continue
      }
      if (seed === undefined) throw new Error("unreachable: one seed per ordering")
      built += 1
      expect(seed.wires.length, `"${entry.name}" needs wires for this to mean anything`)
        .toBeGreaterThan(1)
      expect(seed.bridges.length, `and bridges, for the second half of this`).toBeGreaterThan(0)
      expect(coincidentPairs(seed.wires), `"${entry.name}" stacks no wires`).toEqual([])
      expect(
        bridgesUnderWires(seed.wires, seed.bridges),
        `"${entry.name}" puts no bridge under a wire`,
      ).toEqual([])
    }
  }
  expect(built, "the orderings that build, so this is not a vacuous pass").toBeGreaterThan(0)
})
