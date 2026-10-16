/**
 * PHASE 2: what a candidate's copper actually joins, from GEOMETRY alone.
 *
 * **IT NEVER READS A NET.** Not a pin's, not a wire's, not a bridge's. It is
 * handed a grid, a cut list, the wires and the bridges, and it answers one
 * question: which holes are on the same piece of conductor. That is the whole
 * separation the plan requires - **declared identity builds, geometry judges** -
 * and it is why `./cuts.ts` synthesises cuts from declared nets and this file
 * then starts over. A candidate whose declared nets agree with its wiring but
 * whose geometry does not is exactly what this phase exists to catch, and a
 * phase 2 that reused phase 1's labels could not catch it.
 *
 * **WHAT IT TAKES FROM `./cuts.ts`, AND IT IS NOT A LABEL.** The `Cut` type and
 * `holeKey`, and nothing else. No net name and no run crosses the boundary; the
 * cut list is geometry - which gap on which strip - which is what this walk
 * needs and all it gets.
 *
 * **THERE IS NO FIXPOINT HERE, AND THERE CANNOT BE ONE.** Union-find merges and
 * cannot split, so this walk has to be given the cuts before it starts: build
 * the uncut graph first and a strip carrying two nets is already one component,
 * with nothing left to re-split. An earlier revision of the plan asked for
 * exactly that loop and a review called it circular; both sides were wrong about
 * the reason, and the answer is that there is nothing for a second pass to do.
 *
 * **THE THREE THINGS THAT JOIN TWO HOLES.** A strip joins two neighbouring holes
 * unless a cut falls in the gap between them; a wire joins its two ends, over the
 * top of the board, which is why no cut can foul one; a solder bridge joins one
 * column of two adjacent strips, on the copper side. Nothing else conducts, and
 * **a part's body joins nothing**: a placement is its pins (the owner,
 * 2026-10-14), and a two-lead part's own leads are joined through the part, not
 * through the board, so they are not unioned here.
 *
 * **EVERY HOLE OF THE GRID IS IN THE ANSWER, including the empty ones.** An empty
 * hole is still a piece of copper, a later move may put a lead in it, and the
 * partition is the natural way to ask which strip segment that would join. The
 * cost is one entry per hole - a few hundred on the committed boards - which is
 * the point of doing this in process rather than in a subprocess.
 */
import type { Candidate, Hole } from "./board.ts"
import { holeKey, type Cut } from "./cuts.ts"

function refuse(key: string, body: string): never {
  throw new Error(`${key}: ${body}`)
}

/** Union-find over hole keys, by index into a dense array of parents. */
class Conductors {
  private readonly parent: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_unused, index) => index)
  }

  find(index: number): number {
    let root = index
    // Cannot be undefined: every index this is called with came from the grid walk.
    while ((this.parent[root] ?? root) !== root) root = this.parent[root] ?? root
    let walk = index
    while ((this.parent[walk] ?? walk) !== walk) {
      const next = this.parent[walk] ?? walk
      this.parent[walk] = root
      walk = next
    }
    return root
  }

  /**
   * WHICH ROOT WINS IS NOT STATED HERE, BECAUSE NOTHING DEPENDS ON IT. An
   * earlier version linked the higher root to the lower and said beside itself
   * that this was what made the component ids deterministic. **That explanation
   * was wrong**, and a mutation run proved it: reversing the preference changed
   * no test, because the ids come from the grid-order walk at the end of
   * `componentsOf`, which numbers each conductor the first time a hole of it is
   * reached - a function of the board, whichever hole the union-find happens to
   * keep as the representative. The preference was deleted rather than kept with
   * a corrected comment, and the property it was credited with is asserted
   * directly in `tests/stripboard/model/connectivity.test.ts`.
   */
  union(a: number, b: number): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA === rootB) return
    this.parent[rootB] = rootA
  }
}

function requireGrid(candidate: Candidate): void {
  const { strips, columns } = candidate.grid
  if (Number.isInteger(strips) && Number.isInteger(columns) && strips > 0 && columns > 0) return
  refuse(
    "stripboard-connectivity-grid-unusable",
    `the candidate's grid is ${strips} strips of ${columns} holes, and a board has a whole ` +
      "number of at least one of each.\nFix whichever built the candidate - the stock size " +
      "comes from the piece of board being cut to size, so there is nowhere here to get it " +
      "from.\nIt is not defaulted to a stock size: a partition computed over the wrong grid " +
      "would answer every later question about this board confidently and wrongly.",
  )
}

function indexOf(candidate: Candidate, hole: Hole, what: string): number {
  const { strip, column } = hole
  const inside =
    Number.isInteger(strip) &&
    Number.isInteger(column) &&
    strip >= 0 &&
    column >= 0 &&
    strip < candidate.grid.strips &&
    column < candidate.grid.columns
  if (!inside) {
    refuse(
      "stripboard-connectivity-off-grid",
      `${what} is at hole ${holeKey(hole)}, and the candidate's grid is ` +
        `${candidate.grid.strips} strips of ${candidate.grid.columns} holes - so that hole is ` +
        "not on the board.\nFix whichever built the candidate; the stock size is the one thing " +
        "a layout cannot negotiate.\nIt is not skipped: a skipped wire or bridge is a " +
        "connection the partition is silently missing, and the invariants read the partition.",
    )
  }
  return strip * candidate.grid.columns + column
}

/**
 * The copper partition: every hole of the grid, keyed `${strip},${column}`,
 * mapped to the id of the conductor it is part of.
 *
 * Two holes carry the same id exactly when the copper, the wires and the bridges
 * join them. **The ids are small integers assigned in grid order** - strip
 * ascending, then column ascending, numbering each conductor the first time a
 * hole of it is reached - so equal candidates give equal maps and a test may
 * compare two partitions directly. **That walk is the ONLY thing the ids depend
 * on**; the union-find's own choice of representative is not involved, which
 * `Conductors.union` says more about. The ids mean nothing else; in particular
 * they are not net identities and have no relation to the fork's node ids.
 */
export function componentsOf(
  candidate: Candidate,
  cuts: readonly Cut[],
): ReadonlyMap<string, number> {
  requireGrid(candidate)
  const { strips, columns } = candidate.grid
  const severed = new Set<string>()
  for (const cut of cuts) {
    if (
      !Number.isInteger(cut.strip) ||
      !Number.isInteger(cut.afterColumn) ||
      cut.strip < 0 ||
      cut.strip >= strips ||
      cut.afterColumn < 0 ||
      cut.afterColumn >= columns - 1
    ) {
      refuse(
        "stripboard-connectivity-cut-off-grid",
        `a cut severs strip ${cut.strip} after column ${cut.afterColumn}, and the candidate's ` +
          `grid is ${strips} strips of ${columns} holes - so there is no such gap. The last gap ` +
          `on a strip is after column ${columns - 2}, because afterColumn names the gap between ` +
          "that hole and the next one.\nFix whichever produced the cut list; derivedCuts only " +
          "ever returns a gap between two of a strip's own contacts.\nIt is not ignored: a cut " +
          "dropped from this walk is a short the partition does not show, and the invariants " +
          "read the partition rather than the board.",
      )
    }
    severed.add(`${cut.strip},${cut.afterColumn}`)
  }
  const conductors = new Conductors(strips * columns)
  for (let strip = 0; strip < strips; strip += 1) {
    for (let column = 0; column + 1 < columns; column += 1) {
      if (severed.has(`${strip},${column}`)) continue
      conductors.union(strip * columns + column, strip * columns + column + 1)
    }
  }
  for (const wire of candidate.wires) {
    const what = `the wire from ${holeKey(wire.from)} to ${holeKey(wire.to)}`
    const from = indexOf(candidate, wire.from, what)
    const to = indexOf(candidate, wire.to, what)
    if (from === to) {
      refuse(
        "stripboard-connectivity-wire-to-itself",
        `${what} begins and ends in the same hole, so it joins nothing.\nFix whichever built ` +
          "the candidate - a wire is added to carry a net between two places, and a " +
          "zero-length one is a routing decision that was never finished.\nIt is not ignored: " +
          "the score charges it as a wire, so a candidate would be paying for a connection the " +
          "board does not have.",
      )
    }
    conductors.union(from, to)
  }
  for (const bridge of candidate.bridges) {
    const [lower, upper] = bridge.strips
    const what = `the solder bridge joining strips ${lower} and ${upper} at column ${bridge.column}`
    if (Math.abs(upper - lower) !== 1) {
      refuse(
        "stripboard-connectivity-bridge-not-adjacent",
        `${what} names two strips that are not neighbours, and a solder blob reaches across one ` +
          "gap between strips and no further.\nFix whichever built the candidate; to join two " +
          "strips further apart, use a wire, which is what the owner says a blob turns into on " +
          'his bench anyway ("a solder blob will turn into a wire on my bench").\nIt is not ' +
          "read as a chain of blobs across the strips in between: those strips carry their own " +
          "nets, and joining them would be a short nothing asked for. lib/stripboard/board.ts " +
          "records that the Bridge type cannot enforce this and that this module applies it.",
      )
    }
    conductors.union(
      indexOf(candidate, { strip: lower, column: bridge.column }, what),
      indexOf(candidate, { strip: upper, column: bridge.column }, what),
    )
  }
  const ids = new Map<number, number>()
  const out = new Map<string, number>()
  for (let strip = 0; strip < strips; strip += 1) {
    for (let column = 0; column < columns; column += 1) {
      const root = conductors.find(strip * columns + column)
      let id = ids.get(root)
      if (id === undefined) {
        id = ids.size
        ids.set(root, id)
      }
      out.set(`${strip},${column}`, id)
    }
  }
  return out
}
