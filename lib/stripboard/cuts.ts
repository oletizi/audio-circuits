/**
 * PHASE 1: where the strips must be severed, synthesised from the nets a
 * candidate DECLARES.
 *
 * **TWO PHASES, AND NO FIXPOINT.** This module partitions each strip into
 * maximal runs of one declared net and puts a cut between adjacent runs of
 * different nets. It is a per-strip scan and **it uses no union-find at all**.
 * `./connectivity.ts` is phase 2: it builds a FRESH graph from the cuts this
 * module returns, together with the wires and bridges, and judges the result
 * from geometry alone.
 *
 * **THE ORDER IS NOT A PREFERENCE, IT IS A CONSEQUENCE OF UNION-FIND.** An
 * earlier revision of the plan said to build the uncut graph first, propagate
 * net identity over it, find the conductors carrying two nets, derive cuts, and
 * re-split. That cannot work: union-find merges and cannot split, so a strip
 * carrying nets A and B is already ONE component before anything is derived and
 * the distinction the derivation needs has been destroyed. Declared identity
 * builds; geometry judges. A candidate whose declared nets agree with its wiring
 * but whose geometry does not is exactly what phase 2 catches, and a phase 2
 * that reused this module's labels could not catch it.
 *
 * **WHAT COUNTS AS A SIGNIFICANT CONTACT: a component pin, a wire endpoint, or a
 * solder bridge's hole.** The first two are the plan's own words - a wire
 * endpoint in an otherwise empty hole makes that hole electrically meaningful,
 * and a strip carrying no pins at all can still be a conductor between two wire
 * endpoints, so a derivation walking only pins misses both.
 *
 * **THE THIRD - THE BRIDGE - IS AN ADDITION TO THE PLAN'S LIST, AND IT IS
 * MEASURED RATHER THAN PREFERRED.** The plan names a bridge as something a cut
 * must not foul, because a bridge is on the copper side where the cut is; it did
 * not say how. Treating it as a contact IS how, and the alternative - a separate
 * rule forbidding gaps that strand a bridge - gives the same answer in every
 * case but one and a worse answer in that one (a bridge whose net matches
 * NEITHER neighbouring run needs two cuts, which falls out of the run scan and
 * does not fall out of a gap filter). The measurement that settles it is on
 * `transistor-preamp-loop`: `SOLDER 0,1 1,1` puts GND in hole `1,1`, strip 1's
 * next GND lead is at column 4 and its EMITTER lead is at column 0, so with the
 * bridge left out of the scan the convention below places the cut between
 * columns 1 and 2 - severing the bridge from the net it carries and shorting
 * EMITTER to GND. Phase 2 would catch it; the derivation would still have
 * produced a broken board.
 *
 * **THE CUT-POSITION CONVENTION, declared here and tested directly.** Between
 * two runs there may be several empty holes and they are not equally safe to
 * scrape. **A cut is made on the COPPER side and a part's body sits on the
 * COMPONENT side** - opposite faces - so a body cannot foul a cut, and neither
 * can a link wire, which runs over the top. A cut under a DIP is the standard way
 * every DIP is mounted (the owner: *"all dip packages have cuts under them to
 * separate the two pin rows"*) and must not be avoided. **The only things that
 * share the copper side with the cut are a hole carrying a lead's solder joint
 * and a solder bridge** - and both are significant contacts here. So:
 *
 *   **the cut goes in the gap with the greatest clearance from the nearest
 *   soldered hole, and a tie goes to the lower column.**
 *
 * With the earlier run ending at column `a` and the later run starting at column
 * `b`, every hole between them is empty of contacts, and the gap centred at
 * `g + 0.5` is `min(g - a + 0.5, b - g - 0.5)` away from the nearest of the two -
 * maximised, with the tie broken downwards, at `afterColumn = floor((a + b - 1)
 * / 2)`. The reason is the knife: the one gap-dependent risk in making a cut is
 * nicking a joint or lifting the copper around a hole that is in use, and
 * clearance is what reduces it. Everything else about the operation is the same
 * whichever gap is chosen.
 *
 * **VEROROUTE DISAGREES ABOUT THE GAP AND AGREES ABOUT EVERYTHING ELSE, which is
 * measured and not assumed.** On the two committed boards that import,
 * `tests/stripboard/model/cuts-agree.test.ts` finds the same number of cuts on
 * the same strips as the fork's own `CUT` lines - 54 of 54 - and every one of the
 * fork's cuts inside the gap this module identifies, so the copper partition over
 * the significant contacts is identical. The positions themselves differ on
 * `transistor-preamp-feedback`, and the fork's source says why rather than
 * leaving it a mystery: `.tools/veroroute-perfboard/Src/Reconcile_cuts.cpp`'s
 * `DeriveCuts` puts the cut "between the hole at which the nodeId changes and the
 * hole IMMEDIATELY BEFORE it on the strip", over holes whose nodeIds
 * `AutoFillVero` PAINTED. So the fork's gap is a function of its paint, which on
 * a hand-laid board is a function of what a person painted - not of the leads. It
 * is not a second opinion about clearance, and this convention was not tuned
 * towards it.
 *
 * **NO PART OF THIS MODULE READS A FOOTPRINT, A BODY OUTLINE OR AN OCCUPIED
 * AREA.** A placement is its pins (the owner, 2026-10-14: *"Don't worry about
 * body collisions on the stripboard. It's extremely flexible."*), so
 * `Placement.pins` is the only field of a placement this file touches, and
 * neither `lib/kicad/footprint-extent.ts` nor `lib/kicad/formed-frame.ts` gains a
 * consumer here.
 */
import type { Candidate, Hole } from "./board.ts"

/**
 * One cut: the strip it severs, and the gap it falls in.
 *
 * `afterColumn: c` is the gap between hole `c` and hole `c + 1` on that strip.
 * **This is the WHOLE vocabulary of a cut** (the owner, 2026-10-14: *"Cuts should
 * be between holes."*), so no hole is cut through and no run is scraped away, and
 * the only question a derivation has to answer is which gap between which two
 * holes.
 */
export interface Cut {
  readonly strip: number
  readonly afterColumn: number
}

/**
 * Net name to the `<ref>.<pin>` ids on it - the circuit's own account of what is
 * connected to what.
 *
 * It is structurally the `ReferenceNets` that `tools/stripboard/equivalence.ts`
 * exports from a netlist export, and it is re-declared here rather than imported
 * because **`lib/stripboard/` is the core and may not import from `tools/`**. A
 * caller on the far side of that boundary can pass one straight in.
 */
export type ReferenceNets = ReadonlyMap<string, readonly string[]>

/**
 * One soldered hole, with the net it declares and a phrase naming what put it
 * there.
 *
 * `what` exists for the refusals: "two nets in one hole" is only actionable if it
 * says which two things are in it.
 */
export interface Contact {
  readonly hole: Hole
  readonly net: string
  readonly what: string
}

/** A maximal span of one net's contacts along one strip, with no other net inside it. */
export interface StripRun {
  readonly strip: number
  readonly net: string
  readonly firstColumn: number
  readonly lastColumn: number
}

/** `${strip},${column}` - the key every hole-addressed map in this model uses. */
export function holeKey(hole: Hole): string {
  return `${hole.strip},${hole.column}`
}

function refuse(key: string, body: string): never {
  throw new Error(`${key}: ${body}`)
}

const NOT_DEFAULTED =
  "It is not defaulted and the contact is not dropped: a hole this derivation cannot name a " +
  "net for is a hole it would read as empty, and an empty hole never asks for the cut beside it"

/** `<ref>.<pin>` to the net holding it, refusing a pin two nets claim. */
function netByPin(reference: ReferenceNets): ReadonlyMap<string, string> {
  const out = new Map<string, string>()
  for (const [net, pins] of reference) {
    for (const pin of pins) {
      const already = out.get(pin)
      if (already !== undefined && already !== net) {
        const [first, second] = [already, net].sort()
        refuse(
          "stripboard-cuts-pin-on-two-nets",
          `"${pin}" is on reference net "${first}" and again on reference net "${second}", so ` +
            "which net the hole its lead sits in carries is not stated anywhere.\nFix it in the " +
            "netlist export, or in the schematic it came from - a pin on two nets cannot be " +
            "true of any board, and it is not a short in the copper.\nNeither listing is " +
            "preferred: which one the schematic meant is not in the input, and a cut derived " +
            "from the wrong one separates the wrong pair of runs.\nThe reader in " +
            "tools/stripboard/equivalence.ts refuses this for an export it parses; this " +
            "refusal is here because a ReferenceNets handed to derivedCuts need not have come " +
            "from it.",
        )
      }
      out.set(pin, net)
    }
  }
  return out
}

/** Every hole on the board that carries solder, with the net it declares. */
export function significantContacts(
  candidate: Candidate,
  reference: ReferenceNets,
): readonly Contact[] {
  const nets = netByPin(reference)
  const contacts: Contact[] = []
  for (const placement of candidate.placements) {
    for (const [pin, hole] of placement.pins) {
      const id = `${placement.ref}.${pin}`
      const net = nets.get(id)
      if (net === undefined) {
        refuse(
          "stripboard-cuts-pin-net-unknown",
          `the candidate places "${id}" in hole ${holeKey(hole)} and the reference nets handed ` +
            "to this derivation put that pin on no net.\nEither the reference is of a different " +
            "circuit than the candidate was built from, or the pin is genuinely connected to " +
            "nothing - and a KiCad export states even that, as an `unconnected-(...)` net, so a " +
            "pin missing altogether is a mismatch rather than a no-connect.\nIf a part on this " +
            `board really does have a pin on no net, that is a finding for the owner - the ` +
            "model has no vocabulary for a no-connect lead and inventing one here would hide " +
            `the question.\n${NOT_DEFAULTED}.`,
        )
      }
      contacts.push({ hole, net, what: `the lead of ${id}` })
    }
  }
  const reached = new Set(contacts.map((contact) => contact.net))
  for (const wire of candidate.wires) {
    if (!reached.has(wire.net)) {
      refuse(
        "stripboard-cuts-wire-connects-nothing",
        `the wire from ${holeKey(wire.from)} to ${holeKey(wire.to)} declares net "${wire.net}", ` +
          "and no component pin on this candidate is on that net - so the wire connects " +
          "nothing.\nEither the wire's declared net is wrong, or the parts whose pins it was " +
          "added to join are not on the board. Fix whichever built the candidate; a wire's net " +
          "is an input to the model, not a discovery (lib/stripboard/board.ts states why).\nIt " +
          "is not imported as a wire of no net and it is not dropped: a dropped wire is one the " +
          "cut derivation, the score's wire count and the buildability check are all silently " +
          "wrong about.",
      )
    }
    contacts.push(
      { hole: wire.from, net: wire.net, what: `the wire to ${holeKey(wire.to)}` },
      { hole: wire.to, net: wire.net, what: `the wire from ${holeKey(wire.from)}` },
    )
  }
  for (const bridge of candidate.bridges) {
    if (!reached.has(bridge.net)) {
      refuse(
        "stripboard-cuts-bridge-connects-nothing",
        `the solder bridge joining strips ${bridge.strips[0]} and ${bridge.strips[1]} at column ` +
          `${bridge.column} declares net "${bridge.net}", and no component pin on this ` +
          "candidate is on that net - so the bridge connects nothing.\nFix whichever built the " +
          "candidate: a bridge is a routing decision priced beside a wire in `F`, so it carries " +
          "a net for the same reason a wire does.\nIt is not dropped: a bridge left out of the " +
          "scan is a net identity left out of two strips, and the cut beside it goes missing.",
      )
    }
    for (const strip of bridge.strips) {
      contacts.push({
        hole: { strip, column: bridge.column },
        net: bridge.net,
        what: `the solder bridge between strips ${bridge.strips[0]} and ${bridge.strips[1]}`,
      })
    }
  }
  for (const contact of contacts) onGrid(candidate, contact)
  return contacts
}

function onGrid(candidate: Candidate, contact: Contact): void {
  const { strip, column } = contact.hole
  const inside =
    Number.isInteger(strip) &&
    Number.isInteger(column) &&
    strip >= 0 &&
    column >= 0 &&
    strip < candidate.grid.strips &&
    column < candidate.grid.columns
  if (inside) return
  refuse(
    "stripboard-cuts-contact-off-grid",
    `${contact.what} is in hole ${holeKey(contact.hole)}, and the candidate's grid is ` +
      `${candidate.grid.strips} strips of ${candidate.grid.columns} holes - so that hole is not ` +
      "on the board.\nFix whichever built the candidate: a placement, wire or bridge off the " +
      "stock is a board that cannot be made, and the stock size is the one thing a layout " +
      "cannot negotiate.\nIt is not clamped to the nearest hole and it is not skipped: a " +
      "skipped contact is a net identity missing from a strip, and a clamped one puts a lead " +
      "where no lead is.",
  )
}

/**
 * Every strip's contacts collapsed into maximal runs of one net, in column
 * order.
 *
 * Two contacts in ONE hole are one contact when they name one net - a bridge
 * soldered onto a lead's own hole is the ordinary case - and a **refusal** when
 * they name two, because a cut falls between holes and so no cut can separate
 * them. That is the short the one-lead-per-hole rule exists to keep off the
 * board (the owner: *"I would prefer leads not share holes - it makes building
 * easier"*), reported here as the short it is rather than as a preference.
 */
export function runsOf(contacts: readonly Contact[]): readonly StripRun[] {
  const byStrip = new Map<number, Contact[]>()
  for (const contact of contacts) {
    const list = byStrip.get(contact.hole.strip)
    if (list === undefined) byStrip.set(contact.hole.strip, [contact])
    else list.push(contact)
  }
  const runs: StripRun[] = []
  for (const strip of [...byStrip.keys()].sort((a, b) => a - b)) {
    // Cannot be undefined: the key came from this map's own key list.
    const list = (byStrip.get(strip) ?? []).slice()
    list.sort((a, b) => a.hole.column - b.hole.column)
    let open: { net: string; firstColumn: number; lastColumn: number } | null = null
    let previous: Contact | null = null
    for (const contact of list) {
      if (
        previous !== null &&
        previous.hole.column === contact.hole.column &&
        previous.net !== contact.net
      ) {
        const [first, second] = [previous.what, contact.what].sort()
        refuse(
          "stripboard-cuts-one-hole-two-nets",
          `hole ${holeKey(contact.hole)} holds ${first} on net "${previous.net}" and ${second} ` +
            `on net "${contact.net}".\nThat is a short no cut can clear: a cut falls between ` +
            "holes, never through one, so the two are joined by the solder in that hole " +
            "whatever the copper around it does.\nFix it in the layout - move one of them to " +
            "its own hole. One lead per hole is the owner's rule for exactly this reason, and " +
            "no committed board breaks it.\nNeither net is preferred and the hole is not left " +
            "out: a derivation that picked one would emit the cuts for a board that is not the " +
            "one described.",
        )
      }
      previous = contact
      if (open !== null && open.net === contact.net) {
        open.lastColumn = Math.max(open.lastColumn, contact.hole.column)
        continue
      }
      if (open !== null) runs.push({ strip, ...open })
      open = { net: contact.net, firstColumn: contact.hole.column, lastColumn: contact.hole.column }
    }
    if (open !== null) runs.push({ strip, ...open })
  }
  return runs
}

/**
 * The cuts a candidate needs, from the nets it declares.
 *
 * One cut between each adjacent pair of runs of different nets, in the gap the
 * convention in this module's comment names. Strips are walked in ascending
 * order and each strip's gaps in ascending column order, so two runs over equal
 * candidates return an equal list - which a search that compares candidates by
 * their cut sets needs.
 *
 * **IT RETURNS WHAT SEPARATING THE DECLARED NETS REQUIRES, AND NOTHING ABOUT
 * WHETHER THE RESULT WORKS.** Whether each net is then whole, and whether any
 * component still holds two nets, is `./connectivity.ts`'s question and it is
 * answered from geometry.
 *
 * **THERE IS NO "SAME NET EITHER SIDE" CHECK HERE, AND ITS ABSENCE IS
 * DELIBERATE.** `runsOf` only opens a new run when the net CHANGES, so two
 * consecutive runs on one strip always carry two different nets and such a check
 * could never fire. One was written and a mutation run found it unreachable - it
 * is deleted rather than kept as reassurance, and the property it was guarding is
 * asserted directly in `tests/stripboard/model/cuts.test.ts` instead.
 */
export function derivedCuts(candidate: Candidate, reference: ReferenceNets): readonly Cut[] {
  const runs = runsOf(significantContacts(candidate, reference))
  const cuts: Cut[] = []
  for (let index = 1; index < runs.length; index += 1) {
    const earlier = runs[index - 1]
    const later = runs[index]
    if (earlier === undefined || later === undefined) continue
    if (earlier.strip !== later.strip) continue
    cuts.push({ strip: earlier.strip, afterColumn: gapFor(earlier.lastColumn, later.firstColumn) })
  }
  return cuts
}

/**
 * The gap between two runs with the greatest clearance from the nearest soldered
 * hole, ties downwards - this module's declared convention, in one line of
 * arithmetic.
 *
 * `a` is the earlier run's last column and `b` the later run's first; every hole
 * strictly between them is empty of contacts, so those two are the nearest
 * soldered holes to any gap in between. The gap at `afterColumn = g` is centred
 * `g - a + 0.5` from one and `b - g - 0.5` from the other, and the smaller of
 * those is largest at `g = floor((a + b - 1) / 2)`, which also lands on the
 * lower column of a tie. `a < b`, so the result is always a real gap in `[a, b -
 * 1]`.
 */
function gapFor(a: number, b: number): number {
  return Math.floor((a + b - 1) / 2)
}
