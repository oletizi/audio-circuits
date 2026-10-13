/**
 * Whether the pins of ONE footprint row that sit on ONE strip also sit on ONE
 * PIECE OF COPPER, and whether they are pins that may.
 *
 * **WHY IT EXISTS, AND WHAT IT CORRECTED.** `HC10`'s placement half used to
 * refuse a row of pins lying along a strip on the geometry alone, *"because a
 * row lying along a strip puts every pin of that row on one piece of copper."*
 * That sentence reads the board as if it had no cuts in it. A cut between two
 * such pins puts them on two pieces of copper, which is the normal pattern and
 * the same one the owner's own DIP ruling describes - **his words (verbatim):**
 * *"dips should span strips with a cut down the middle, like a breadboard."*
 * The DIP's two rows share each strip pairwise and the centre cut divides them:
 * shared copper plus a dividing cut is correct construction. Measured: the
 * geometry-only reading refused `transistor-preamp-loop`'s `C1` and
 * `transistor-preamp-lab`'s `C3`, both of them correct placements, and the
 * refusal's own remedy - turn the part - was wrong in both cases.
 *
 * **SO THE QUESTION IS ASKED IN TWO PARTS, IN THIS ORDER.** First, which piece
 * of copper does each pin land on, cuts taken into account. Second, for the pins
 * that landed on ONE piece, do they belong to one net or to several. Only the
 * second answer can condemn a layout: two pins of one part on one strip that are
 * on the SAME net need no cut at all.
 *
 * **IT ADDS NO SECOND SPELLING OF "THE SAME COPPER".** The partition is
 * `copperGraph`'s, which is `HC8`'s reconstruction and the one implementation of
 * the three join mechanisms in this repository. This module groups pins by the
 * component numbers that function returns and reads the reference netlist for
 * their nets; it unions nothing and derives no connectivity of its own.
 *
 * **THE OVERLAP WITH `HC8` IS REAL AND IS NOT HIDDEN.** A component holding two
 * reference nets is a SHORT, and `HC8` reports every short on the board. What
 * `HC10`'s placement half adds is the diagnosis rather than the detection: it
 * localises the short to one part, one footprint row and one strip, which names
 * the cheap remedy - cut the strip between those two holes, or turn the part -
 * where `HC8` can only say that two nets met somewhere. Both run, and the
 * acceptance criteria document records the overlap beside `HC10`.
 *
 * **NOTHING HERE READS A `NODE` LINE.** The nets come from the reference
 * netlist, which is upstream of VeroRoute entirely, for the reason `copper.ts`
 * gives at length: a verdict that let `GetBoardMembership` in by a second route
 * would report an independence it does not have.
 */
import type { Cut, HolePosition, Pin } from "../guide/dump.ts"
import type { BoardDump } from "../guide/dump.ts"
import { alongOf, copperGraph, holeKey, type HoleKey } from "./copper.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"

/** One piece of copper some of a row's pins landed on, with the nets found there. */
export interface CopperShare {
  /** `copperGraph`'s component number - an identity, never a count of anything. */
  readonly component: number
  /** The row's pins that landed on it, in the order the dump printed them. */
  readonly pins: readonly Pin[]
  /** The distinct reference nets those pins belong to, sorted. */
  readonly nets: readonly string[]
}

/**
 * The board's copper partition, for a dump whose cuts ARE computed.
 *
 * **IT IS HANDED THE PARSED DUMP AND NOT THE TEXT**, which is the opposite of
 * `hc8`'s choice and is deliberate. `boardGeometry` exists so that `HC8` can say
 * `missing-line` and `unsupported-strip-axis` in its own contract's words; those
 * two refusals are `HC8`'s to make, and `HC10` reading the text a second time
 * would say them under a constraint id that does not own them. `CheckInput`'s
 * own contract already requires `dump` to be `parseBoardDump(dumpText)`, which
 * refuses both faults with the parser's wording, so nothing passes silently
 * either way.
 *
 * **THE CALLER CHECKS `cutState` FIRST.** `copperGraph` refuses a dump whose
 * cuts are not computed (`cuts-not-computed`), and that refusal is a THROW -
 * right for missing data, wrong for this, because an unresolved cut list is a
 * fact about the board that `HC2` already names. So the caller never reaches
 * here in that state; see `hc10PlacementOrientation`.
 */
export function copperComponents(dump: BoardDump): ReadonlyMap<HoleKey, number> {
  if (dump.cutState !== "COMPUTED") {
    throw new Error(
      `copperComponents was called on a dump whose CUT_STATE reads ${dump.cutState}, so the ` +
        "copper cannot be partitioned at all - the cut list is absent rather than empty.\nThis " +
        "is NOT defaulted to a board with no cuts: an uncut board joins every hole on a strip, " +
        "which would turn every correctly cut row into a reported short. The caller must read " +
        "dump.cutState and report that it has no verdict, as hc10PlacementOrientation and hc8 " +
        "both do; fix the caller in tools/stripboard/constraints-pattern.ts, not this function.",
    )
  }
  return copperGraph(dump).components
}

const NO_NET_WHY =
  "This is NOT defaulted and must not be: a pin with no net is a pin whose sharing a piece of " +
  "copper with another cannot be judged, because whether the two must be kept apart is exactly " +
  "what the netlist says. Add the pin to the schematic's net, or find the export that dropped " +
  "it - the reference netlist is read by referenceNetsFromExport in " +
  "tools/stripboard/equivalence.ts."

/**
 * `${ref}.${pin}` -> its reference net, inverted from the netlist side.
 *
 * `referenceNetsFromExport` has already refused an export listing one pin on two
 * nets, so this inversion cannot lose a net: that fault is the export's and is
 * caught where the export is read.
 */
export function netByPin(reference: ReferenceNets): ReadonlyMap<string, string> {
  const index = new Map<string, string>()
  for (const [net, pins] of reference) {
    for (const pin of pins) index.set(pin, net)
  }
  return index
}

/**
 * Which net a placed pin belongs to, refusing by name when the reference
 * netlist does not say.
 *
 * **A ONE-HOLE PAD NEVER REACHES HERE**, so the board-name-versus-netlist-name
 * problem `./pad-provenance.ts` exists for is out of scope rather than ignored.
 * VeroRoute renames an expanded `PADS<n>` pad (`SW_LO_BOOST.3` becomes
 * `SW_LO_BOOST_3.1`), and every such pad is ONE hole: `footprintOf` returns
 * `undefined` for a one-hole part and `HC10` skips it, and a row of one pin
 * cannot share a strip with itself in any case. Every pin that gets this far
 * belongs to a part with two or more holes and a declared footprint, whose board
 * ref IS its netlist ref.
 */
export function netOf(index: ReadonlyMap<string, string>, ref: string, pin: Pin): string {
  const id = `${ref}.${pin.pin}`
  const net = index.get(id)
  if (net === undefined) {
    throw new Error(
      `the reference netlist lists no net for ${id}, which the dump prints at ` +
        `${pin.row},${pin.col} - and HC10's placement half has to know whether that hole may ` +
        `share a piece of copper with another of ${ref}'s pins.\n${NO_NET_WHY}`,
    )
  }
  return net
}

/**
 * The pins of one footprint row, grouped by the piece of copper each landed on.
 *
 * The caller passes the pins of ONE row that sit on ONE strip, so every group
 * returned is a set of that row's pins the board joins together. A group whose
 * `nets` has more than one member is the fault `HC10`'s placement half reports;
 * a group on one net is the pattern the owner's rule allows, and two groups mean
 * something divided them.
 *
 * Groups come back in ascending component order, so two grades over one dump
 * name the same group first.
 */
export function copperShares(
  ref: string,
  pins: readonly Pin[],
  components: ReadonlyMap<HoleKey, number>,
  index: ReadonlyMap<string, string>,
): readonly CopperShare[] {
  const byComponent = new Map<number, Pin[]>()
  for (const pin of pins) {
    const key = holeKey(pin)
    const component = components.get(key)
    if (component === undefined) {
      throw new Error(
        `HC10 cannot place part ${ref}: the dump prints PIN ${ref} ${pin.pin} AT ${key}, and ` +
          "that hole is not a hole of the board's copper graph, which is seeded from every hole " +
          "the GRID line declares.\nThis is NOT skipped: a lead outside the declared grid means " +
          "the dump's GRID line and its PIN lines disagree about how big the board is, so " +
          "neither may be trusted. copperGraph's own out-of-bounds refusal should have rejected " +
          "it first; fix tools/stripboard/copper.ts if it did not.",
      )
    }
    const group = byComponent.get(component) ?? []
    group.push(pin)
    byComponent.set(component, group)
  }
  return [...byComponent.entries()]
    .sort(([a], [b]) => a - b)
    .map(([component, group]) => ({
      component,
      pins: group,
      nets: [...new Set(group.map((pin) => netOf(index, ref, pin)))].sort(),
    }))
}

/** `${row},${col}` for a cut's two holes, with the node ids left off - see `copper.ts`. */
function cutText(cut: Cut): string {
  return `CUT ${cut.a.row},${cut.a.col} ${cut.b.row},${cut.b.col}`
}

/**
 * Every `CUT` line severing the strip inside the span a row's shared holes
 * occupy, as text a reader can go and look for in the dump.
 *
 * It is the WITNESS a held verdict quotes, NOT the verdict itself. The verdict
 * is the copper partition, which also accounts for the solder bridges and wires
 * that can join two holes back together after a cut: a pair separated by a cut
 * and rejoined by a wire is ONE component, so `copperShares` reports it as
 * shared and this function's answer is never what decides it. Quoting a cut that
 * a wire has undone would be worse than quoting none, which is why the two are
 * kept this far apart.
 *
 * The holes are assumed to be on one strip, which is how the caller grouped
 * them; the strip is read off the first and the span is taken over all of them.
 */
export function cutsAcross(
  dump: BoardDump,
  holes: readonly HolePosition[],
): readonly string[] {
  const first = holes[0]
  if (first === undefined) return []
  const strip = stripOf(first, dump.verticalStrips)
  const along = holes.map((hole) => alongOf(hole, dump.verticalStrips))
  const lower = Math.min(...along)
  const upper = Math.max(...along)
  return dump.cuts
    .filter((cut) => {
      if (stripOf(cut.a, dump.verticalStrips) !== strip) return false
      const gap = Math.min(alongOf(cut.a, dump.verticalStrips), alongOf(cut.b, dump.verticalStrips))
      return gap >= lower && gap < upper
    })
    .map(cutText)
}
