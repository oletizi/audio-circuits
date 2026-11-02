/**
 * WHAT IS ALREADY SOLDERED TO A PART-BUILT BOARD, and which holes a net may
 * still take on a strip - the readings D3a's separability check needs.
 *
 * `./seed-place.ts` holds the workspace and the one decision every placement
 * shares; this file is split off it for the 500-line ceiling, at the seam the
 * relaxation of 2026-10-15 drew: that file DECIDES, and this one reports what the
 * board already carries.
 *
 * **IT IS `significantContacts` AND NOT A SECOND DERIVATION.** That function in
 * `./cuts.ts` is this model's one answer to *what counts as a contact* - a
 * component pin, a wire endpoint, a bridge's hole - and the cuts are derived from
 * exactly that reading, so a separate notion of "what is on this strip" here
 * would be a second place for the answer to come out differently. The `Contact`
 * it returns is rekeyed to the `StripContact` the separability check takes; both
 * carry a column, a net and a phrase naming what put it there, so nothing is
 * invented in the rekeying.
 *
 * **`ContactSite` DECLARES THE FIELDS THESE TWO READINGS NEED AND NOTHING ELSE**,
 * which is `JoinSite`'s trick in `./join-column.ts` and is here for the same
 * reason: a `Workspace` satisfies it structurally, so the partially-built board
 * is handed in with no adapter and no field copied across, and this module
 * depends on no constructor's bookkeeping. The `grid`, `placements`, `wires` and
 * `bridges` are also exactly a `Candidate`, which is how `significantContacts`
 * can be given a site unchanged.
 */
import type { Bridge, Grid, Placement, Wire } from "./board.ts"
import { holeKey, significantContacts, type ReferenceNets } from "./cuts.ts"
import type { JoinSite } from "./join-column.ts"
import type { PartArea } from "./seed-area.ts"
import { interleavingOn, type Interleaving, type StripContact } from "./separable.ts"

/** Everything the readings below need about a board - and nothing they may change. */
export interface ContactSite {
  readonly grid: Grid
  /** The netlist's own account of which pin is on which net, which gives a contact its net. */
  readonly nets: ReferenceNets
  readonly placements: readonly Placement[]
  readonly wires: readonly Wire[]
  readonly bridges: readonly Bridge[]
  /** `holeKey` of every hole already holding a lead, a wire end or a bridge. */
  readonly taken: ReadonlySet<string>
  /** Every placed part's rectangle, which is what a join's route is read against. */
  readonly areas: readonly PartArea[]
}

/**
 * Every significant contact on the board so far, grouped by strip.
 *
 * A caller reads it ONCE per scan of the columns rather than per column, because
 * nothing commits to the board while a position is being chosen.
 */
export function contactsByStrip(site: ContactSite): ReadonlyMap<number, readonly StripContact[]> {
  const byStrip = new Map<number, StripContact[]>()
  for (const contact of significantContacts(site, site.nets)) {
    const entry: StripContact = {
      column: contact.hole.column,
      net: contact.net,
      owner: contact.what,
    }
    const already = byStrip.get(contact.hole.strip)
    if (already === undefined) byStrip.set(contact.hole.strip, [entry])
    else already.push(entry)
  }
  return byStrip
}

/**
 * The first net left interleaved once `additions` are added to `placed`, or
 * `null` when every net on every strip they touch stays in one run.
 *
 * Both are keyed by strip and only the strips `additions` names are walked,
 * because no other strip changes. A part interleaving ITSELF - two of its own
 * pins astride another net's run - is caught by the same walk as a part
 * interleaving what was placed before it.
 */
export function interleavingAfter(
  placed: ReadonlyMap<number, readonly StripContact[]>,
  additions: ReadonlyMap<number, readonly StripContact[]>,
): Interleaving | null {
  for (const strip of [...additions.keys()].sort((a, b) => a - b)) {
    const after = [...(placed.get(strip) ?? []), ...(additions.get(strip) ?? [])]
    const found = interleavingOn(strip, after)
    if (found !== null) return found
  }
  return null
}

/**
 * The board as a `JoinSite`, with every hole on the two strips that this net's
 * join end would leave INTERLEAVED marked unavailable.
 *
 * **AN UNUSABLE HOLE IS WHAT THIS IS, AND NOT A RANKING KEY.** A wire end and a
 * bridge hole are significant contacts, so on a strip two nets share they decide
 * where the cut falls; an end dropped inside the other net's run leaves this
 * net's own leads on the far side of that cut, which `violationsOf` reports as a
 * net in two components. Marking the hole unavailable says that in the one
 * vocabulary `./join-column.ts` already has, so its three ranking keys stay that
 * module's and are not reached for here.
 *
 * **ON A BOARD WHERE NO STRIP CARRIES TWO NETS THE FILTER IS EMPTY**, because
 * adding a contact of the only net on a strip cannot interleave anything - so a
 * board the one-net-per-strip rule could already build joins exactly as it did.
 */
export function joinSiteFor(
  site: ContactSite,
  net: string,
  low: number,
  high: number,
): JoinSite {
  const placed = contactsByStrip(site)
  const unusable = new Set(site.taken)
  const owner = `the join of net "${net}" between strips ${low} and ${high}`
  for (const strip of [low, high]) {
    const already = placed.get(strip) ?? []
    for (let column = 0; column < site.grid.columns; column += 1) {
      if (interleavingOn(strip, [...already, { column, net, owner }]) === null) continue
      unusable.add(holeKey({ strip, column }))
    }
  }
  return {
    grid: site.grid,
    taken: unusable,
    areas: site.areas,
    wires: site.wires,
    bridges: site.bridges,
  }
}
