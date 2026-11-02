/**
 * The hand-built candidates `./cuts.test.ts` and `./connectivity.test.ts` derive
 * cuts and partitions from.
 *
 * **IT IS NOT A `.test.ts` FILE**, following `../grade-fixtures.ts` and
 * `../vero-import-fixtures.ts`: three test files read these builders, and a
 * candidate respelled in each of them is three things to keep in step.
 *
 * **EACH BUILDER SAYS IN ONE LINE WHAT IT IS AN EXAMPLE OF**, and none of them
 * is a board anybody would build - they are the smallest shapes that make one
 * question answerable. The real boards are in `./cuts-agree.test.ts`, which reads
 * the committed dumps.
 *
 * **NO FIXTURE NAMES A KICAD FOOTPRINT.** A `Placement` carries the field, so it
 * carries `FIXTURE_PART_KIND` instead - a part that is not fitted with anything,
 * because nothing in cut derivation or connectivity reads a footprint. It is a
 * constant rather than a literal for the measured reason
 * `tests/kicad/footprint-sweep.ts` gives: that sweep collects the value of any
 * quoted footprint field, and would hold a fixture's placeholder to an installed
 * library it is not.
 */
import type { Bridge, Candidate, Hole, Placement, Wire } from "../../../lib/stripboard/board.ts"
import type { ReferenceNets } from "../../../lib/stripboard/cuts.ts"

/** What a fixture placement is fitted with, which is nothing - see the module comment. */
export const FIXTURE_PART_KIND = "a fixture placement, fitted with no part"

/** `{ strip, column }`, so a fixture reads as a board and not as a pair of numbers. */
export function at(strip: number, column: number): Hole {
  return { strip, column }
}

/**
 * One placement, from its pins alone.
 *
 * `holes` IS THE PIN HOLES, exactly as `tools/stripboard/vero-import.ts` sets it
 * and for the owner's reason: a placement is its pins, and no body area is
 * modelled. `origin` is the first pin's hole and `direction` is `"E"`; neither is
 * read by anything under test, and saying so here is cheaper than a derivation
 * that pretends otherwise.
 */
export function part(ref: string, pins: Readonly<Record<string, Hole>>): Placement {
  const entries = Object.entries(pins)
  const first = entries[0]
  if (first === undefined) throw new Error(`the fixture part "${ref}" was given no pins`)
  return {
    ref,
    footprint: FIXTURE_PART_KIND,
    origin: first[1],
    direction: "E",
    holes: entries.map(([, hole]) => hole),
    pins: new Map(entries),
  }
}

export function wire(from: Hole, to: Hole, net: string): Wire {
  return { from, to, net }
}

export function bridge(column: number, strips: readonly [number, number], net: string): Bridge {
  return { column, strips, net }
}

function board(options: {
  readonly strips?: number
  readonly columns?: number
  readonly placements: readonly Placement[]
  readonly wires?: readonly Wire[]
  readonly bridges?: readonly Bridge[]
}): Candidate {
  return {
    grid: { strips: options.strips ?? 12, columns: options.columns ?? 12 },
    placements: options.placements,
    wires: options.wires ?? [],
    bridges: options.bridges ?? [],
  }
}

/** The nets every fixture below is read against, named so a test can say which it means. */
export function reference(): ReferenceNets {
  return new Map<string, readonly string[]>([
    ["NET_A", ["P1.a", "P2.a", "P4.a"]],
    ["NET_B", ["P3.a"]],
    ["NET_C", ["P1.b"]],
    ["NET_D", ["P2.b", "P3.b"]],
    ["NET_E", ["P4.b"]],
    ["NET_GND", ["G1.a", "G2.a"]],
    ["NET_EMIT", ["E1.a"]],
    ["NET_X", ["E1.b"]],
    ["NET_Y", ["G1.b"]],
    ["NET_Z", ["G2.b"]],
    ["DIP_1", ["U1.1"]],
    ["DIP_8", ["U1.8"]],
    ["DIP_2", ["U1.2"]],
    ["DIP_7", ["U1.7"]],
  ])
}

/**
 * Two nets on strip 3, their leads in neighbouring holes - the one-cut case.
 *
 * `P1.a` is on `NET_A` at column 5 and `P3.a` is on `NET_B` at column 6, so there
 * is exactly one gap between the two runs and the cut can only be there. The
 * other lead of each part is on a strip of its own, so no other strip carries two
 * nets.
 */
export function twoNetsOnStripThree(): Candidate {
  return board({
    placements: [
      part("P1", { a: at(3, 5), b: at(0, 0) }),
      part("P3", { a: at(3, 6), b: at(5, 0) }),
    ],
  })
}

/**
 * Strip 7 holds two wire endpoints of ONE net and no component pin at all - a
 * routing conductor, which needs no cut.
 *
 * `NET_A` runs from `P1.a` on strip 0 up to strip 7 by one wire, along strip 7's
 * own copper, and back down to `P2.a` on strip 1 by another. **A derivation
 * walking only pins would see strip 7 as empty**, and would be unable to say
 * either that it conducts or that it does not need cutting.
 */
export function wireOnlyStripOneNet(): Candidate {
  return board({
    placements: [
      part("P1", { a: at(0, 1), b: at(2, 1) }),
      part("P2", { a: at(1, 3), b: at(4, 3) }),
    ],
    wires: [wire(at(0, 1), at(7, 2), "NET_A"), wire(at(7, 9), at(1, 3), "NET_A")],
  })
}

/**
 * The same shape with the two wire endpoints on DIFFERENT nets, so strip 7 needs
 * a cut.
 *
 * It is the companion the plan's third review asked for: the one-net case above
 * proves a wire-only strip is not cut merely for being wire-only, and this one
 * proves it IS cut when it carries two nets - so neither result is an assumption
 * baked into a single fixture.
 */
export function wireOnlyStripTwoNets(): Candidate {
  return board({
    placements: [
      part("P1", { a: at(0, 1), b: at(2, 1) }),
      part("P3", { a: at(1, 3), b: at(4, 3) }),
    ],
    wires: [wire(at(0, 1), at(7, 2), "NET_A"), wire(at(7, 9), at(1, 3), "NET_B")],
  })
}

/** A wire declaring a net no component pin on the board is on - it connects nothing. */
export function wireToNowhere(): Candidate {
  return board({
    placements: [part("P1", { a: at(0, 1), b: at(2, 1) })],
    wires: [wire(at(0, 1), at(7, 2), "NET_ORPHAN")],
  })
}

/** A solder bridge declaring a net no component pin on the board is on. */
export function bridgeToNowhere(): Candidate {
  return board({
    placements: [part("P1", { a: at(0, 1), b: at(2, 1) })],
    bridges: [bridge(4, [0, 1], "NET_ORPHAN")],
  })
}

/**
 * A wide empty span between two runs, so the cut-position convention has several
 * gaps to choose between.
 *
 * `NET_A` ends at column 3 on strip 2 and `NET_B` begins at column 9, so the gaps
 * after columns 3 through 8 are all electrically equivalent and are not equally
 * safe to scrape.
 */
export function wideGapOnStripTwo(): Candidate {
  return board({
    placements: [
      part("P1", { a: at(2, 3), b: at(5, 0) }),
      part("P3", { a: at(2, 9), b: at(6, 0) }),
    ],
  })
}

/**
 * A two-gap span, where the two best gaps are equally clear and the tie has to be
 * broken by a declared rule.
 *
 * `NET_A` ends at column 3 and `NET_B` begins at column 5, so the gaps after 3
 * and after 4 are each half a hole from one lead and one and a half from the
 * other.
 */
export function tiedGapOnStripTwo(): Candidate {
  return board({
    placements: [
      part("P1", { a: at(2, 3), b: at(5, 0) }),
      part("P3", { a: at(2, 5), b: at(6, 0) }),
    ],
  })
}

/**
 * A DIP straddling two strips with its two pin rows on each of them - the cut
 * goes UNDER the body, which is the standard way every DIP is mounted.
 *
 * The owner, 2026-10-14: *"parts definitely straddle cuts. All dip packages have
 * cuts under them to separate the two pin rows."* Pins 1 and 8 share strip 4 at
 * columns 1 and 4; pins 2 and 7 share strip 5 at the same two columns. Both
 * strips therefore need a cut, and both cuts fall between columns 1 and 4 -
 * squarely beneath the package.
 */
export function dipStraddlingACut(): Candidate {
  return board({
    placements: [
      part("U1", { "1": at(4, 1), "8": at(4, 4), "2": at(5, 1), "7": at(5, 4) }),
    ],
  })
}

/**
 * A solder bridge sitting in the empty span between two runs, carrying the net of
 * one of them.
 *
 * **IT IS THE CASE THAT SETTLES WHETHER A BRIDGE IS A SIGNIFICANT CONTACT**, and
 * it is a miniature of `transistor-preamp-loop`'s own `SOLDER 0,1 1,1`. Strip 1
 * holds `NET_EMIT` at column 0 and `NET_GND` at column 4, and the bridge puts
 * `NET_GND` in hole `1,1` as well. Counted as a contact, the cut goes in the only
 * gap left - after column 0. Left out of the scan, the convention would put it
 * after column 1 and sever the bridge from the net it carries.
 */
export function bridgeInsideAGap(): Candidate {
  return board({
    strips: 6,
    placements: [
      part("E1", { a: at(1, 0), b: at(3, 0) }),
      part("G1", { a: at(1, 4), b: at(4, 4) }),
      part("G2", { a: at(0, 6), b: at(5, 6) }),
    ],
    bridges: [bridge(1, [0, 1], "NET_GND")],
  })
}

/** Two leads of different nets in ONE hole - a short no cut can clear. */
export function twoNetsInOneHole(): Candidate {
  return board({
    placements: [
      part("P1", { a: at(3, 5), b: at(0, 0) }),
      part("P3", { a: at(3, 5), b: at(5, 0) }),
    ],
  })
}

/** A placed pin the reference nets know nothing about. */
export function pinOnNoNet(): Candidate {
  return board({ placements: [part("P9", { a: at(3, 5), b: at(0, 0) })] })
}

/** A lead in a hole the stock does not have. */
export function pinOffTheGrid(): Candidate {
  return board({ columns: 8, placements: [part("P1", { a: at(3, 11), b: at(0, 0) })] })
}

/** Two leads of ONE net on one strip, and nothing else on the board. */
export function oneNetSpanningStripThree(): Candidate {
  return board({
    placements: [
      part("P1", { a: at(3, 2), b: at(0, 0) }),
      part("P2", { a: at(3, 9), b: at(5, 0) }),
    ],
  })
}

/** A part whose two leads are on two different strips, joined only through the part. */
export function partAcrossTwoStrips(): Candidate {
  return board({ placements: [part("P1", { a: at(2, 4), b: at(4, 4) })] })
}
