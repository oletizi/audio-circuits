/**
 * EVERY CHECK A SEED'S INPUT IS HELD TO BEFORE ONE HOLE IS CHOSEN: the two
 * halves of a netlist agree, each part is identified once, every body margin is
 * a whole number of holes, and every moulded field's steps are on the grid.
 *
 * **SPLIT OUT OF `./seed-model.ts` FOR THE LINE CEILING, ON THE SEAM THAT
 * FILE'S OWN HEADER NAMED.** It held three things - the inputs' types, the
 * checks that an input is self-consistent, and the net-to-strip layout an
 * `Ordering` states - and the checks are the half that grows every time a part
 * kind is added. The types and the layout stayed; nothing was duplicated and no
 * second spelling of a refusal was left behind.
 *
 * **WHY THEY ARE HERE AND NOT IN THE PLACER.** Every check in this file is true
 * or false of the INPUT, before any ordering is applied, so a caller with four
 * orderings hears about a malformed netlist once rather than four times - and
 * hears it naming the netlist rather than naming whichever placement happened
 * to trip over the consequence. What is NOT here is anything that depends on
 * where a part ended up: whether a field's two pins sharing a strip is
 * buildable depends on what else lands on that strip, and `interleavingOn` in
 * `./separable.ts` answers it on the PLACED board.
 */
import { leadsOf, refuse, WHY_NOT_DEFAULTED } from "./seed-model.ts"
import type { SeedFieldPin, SeedNetlist, SeedPart } from "./seed-model.ts"
import type { BodyMargins } from "./seed-area.ts"

/**
 * Both halves of a netlist agree, every part is identified exactly once, every
 * body margin is a whole number of holes, and every moulded field's steps are on
 * the grid.
 *
 * **"IDENTIFIED ONCE" AND NOT "EVERY REF IS DISTINCT", which is what this said
 * before the off-board kind existed.** A panel-mounted control's terminals are
 * one part each, so its ref legitimately appears once per terminal;
 * `checkIdentity` is where that one admission and its two limits live.
 *
 * Whether two of a field's pins sharing a strip is buildable is NOT one of these
 * checks: it depends on what else lands on that strip once the field is placed,
 * which `interleavingOn` in `./separable.ts` answers on the placed board.
 */
export function validateNetlist(netlist: SeedNetlist): void {
  const seen = new Map<string, PartsOnRef>()
  for (const part of netlist.parts) {
    checkIdentity(part, seen)
    checkBody(part.ref, part.body)
    switch (part.kind) {
      case "fixed-field":
        checkField(part.ref, part.field)
        break
      case "two-lead":
      case "off-board":
        // NOTHING KIND-SPECIFIC, and it is a `case` rather than an omission so
        // that a fourth kind cannot arrive here unconsidered. A two-lead part's
        // one lever is its span, which is a fact about the FOOTPRINT and is
        // checked against the recorded band where the lever is used
        // (`spanFor`, then `./seed-fit.ts`); a landing pad has no geometry at
        // all to be self-inconsistent about. Both still pass `checkBody` above
        // and both halves of `crossCheck` below.
        break
      default: {
        // WHAT ACTUALLY MAKES "CANNOT ARRIVE HERE UNCONSIDERED" TRUE, and it
        // was missing until 2026-10-16. Measured with this repository's own
        // `tsc` (`strict: true`, no `noImplicitReturns`): a value-returning
        // switch over three of four union members fails with `TS2366`, but a
        // VOID switch over three of four with no `default` compiles clean - and
        // this is a void switch, so a fourth kind would have reached a seed
        // with none of its input checked. The assignment below is a type-level
        // assertion and nothing else: it handles no kind, which is why it is
        // not the absorbing `default` that `SeedPart`'s comment forbids, and it
        // stops compiling the moment the union widens.
        const unchecked: never = part
        void unchecked
        break
      }
    }
  }
  crossCheck(netlist)
}

/** What has already been seen under one ref: what kind it was, and which pins it took. */
interface PartsOnRef {
  readonly kind: SeedPart["kind"]
  readonly pins: Set<string>
}

/**
 * A ref names one part - **except that a panel-mounted control's terminals are
 * one part each, so a ref may repeat when every entry under it is a landing pad
 * with a pin of its own.**
 *
 * **THE EXCEPTION IS NOT A LOOSENING, it is the identity rule this model
 * already has.** A pad's identity is its ref AND its pin name in the IMPORT
 * path - `padPlacementOf` makes one `Placement` per `PAD` line and three
 * terminals of one pot are three placements sharing a ref - so the constructive
 * path reaching the same shape is what makes the two paths describe one
 * physical object. What is NOT admitted is two entries claiming the same
 * terminal, which would place two leads for one pin and leave the netlist's own
 * account of that pin ambiguous, and a ref that is a pad in one entry and a
 * fitted part in another, which is two contradictory claims about one
 * component's residency.
 */
function checkIdentity(part: SeedPart, seen: Map<string, PartsOnRef>): void {
  const pins = leadsOf(part).map((lead) => lead.pin)
  const already = seen.get(part.ref)
  if (already === undefined) {
    seen.set(part.ref, { kind: part.kind, pins: new Set(pins) })
    return
  }
  if (already.kind !== "off-board" || part.kind !== "off-board") {
    refuse(
      "repeated-ref",
      `the netlist holds a "${already.kind}" part and a "${part.kind}" part both called ` +
        `"${part.ref}", so which of them a reference pin id names is not stated.\n` +
        `${WHY_NOT_DEFAULTED}.\nThe ONE repetition this model admits is a panel-mounted ` +
        "control: its terminals are one off-board part each, with a pin of its own, because " +
        "that is how the import path represents the same object (padPlacementOf in " +
        "tools/stripboard/vero-import.ts). Two entries of any other kind under one ref, or a " +
        "ref that is a landing pad in one entry and a fitted part in another, are two " +
        "contradictory claims about one component.",
    )
  }
  for (const pin of pins) {
    if (already.pins.has(pin)) {
      refuse(
        "repeated-pad",
        `two off-board parts in the netlist are both "${part.ref}" terminal "${pin}", so one ` +
          `terminal of one control would be placed in two holes.\n${WHY_NOT_DEFAULTED}.\n` +
          "Several entries under one ref are how a multi-terminal panel control is carried, " +
          "and each must be a DIFFERENT pin: the pad's identity is its ref and its pin name, " +
          "and two entries sharing both are one hole too many rather than a second terminal. " +
          "Fix whichever built the netlist - seedPartsFrom builds one entry per reference pin, " +
          "so a repeat means the reference nets name that pin twice.",
      )
    }
    already.pins.add(pin)
  }
}

function checkBody(ref: string, body: BodyMargins): void {
  for (const [side, steps] of Object.entries(body)) {
    if (Number.isInteger(steps) && steps >= 0) continue
    refuse(
      "body-margin-not-whole",
      `"${ref}" declares a body margin of ${String(steps)} holes ${side}, and a margin is how ` +
        `far the part's body reaches past its outermost pads - a whole number of holes, never ` +
        `negative.\n${WHY_NOT_DEFAULTED}.\nA body that stops SHORT of a pad still has that ` +
        "pad's hole in the part's area, because a lead is soldered there, so the floor is zero " +
        "rather than a signed reach. lib/stripboard/seed-parts.ts derives these from the " +
        "footprint's own .kicad_mod and clamps at zero for that reason.",
    )
  }
}

function checkField(ref: string, field: readonly SeedFieldPin[]): void {
  for (const pin of field) {
    if (!Number.isInteger(pin.alongSteps) || !Number.isInteger(pin.acrossSteps)) {
      refuse(
        "field-off-grid",
        `"${ref}" pin "${pin.pin}" sits at ${pin.alongSteps} steps along its row and ` +
          `${pin.acrossSteps} across, and a step count that is not a whole number is a lead ` +
          `between two holes.\n${WHY_NOT_DEFAULTED}.\nA field in grid steps comes from a ` +
          "footprint whose pads admitPattern accepts; one whose pads are off the grid is " +
          "refused there, by name, before a placement exists.",
      )
    }
  }
}

function crossCheck(netlist: SeedNetlist): void {
  const declared = new Set<string>()
  for (const part of netlist.parts) {
    for (const lead of leadsOf(part)) declared.add(`${part.ref}.${lead.pin}`)
  }
  const referenced = new Set<string>()
  for (const [net, pins] of netlist.nets) {
    for (const pin of pins) {
      referenced.add(pin)
      if (declared.has(pin)) continue
      refuse(
        "reference-pin-not-a-part",
        `reference net "${net}" holds "${pin}", and no part in the netlist declares that ` +
          `terminal - so the seed would place nothing for it and the net would be judged ` +
          `incomplete by a part that was never asked for.\n${WHY_NOT_DEFAULTED}.\nEither the ` +
          "reference is of a different circuit than the part list, or a part is missing from " +
          "it. The two are cross-checked here because derivedCuts and violationsOf are handed " +
          "the reference and would both refuse further downstream, where the cause reads as a " +
          "defect in the placement.",
      )
    }
  }
  for (const part of netlist.parts) {
    for (const lead of leadsOf(part)) {
      const id = `${part.ref}.${lead.pin}`
      if (referenced.has(id)) continue
      refuse(
        "part-pin-not-in-reference",
        `"${id}" is declared on net "${lead.net}" by the part list, and the reference nets put ` +
          `it on no net at all.\n${WHY_NOT_DEFAULTED}.\nA KiCad export states even a ` +
          "no-connect, as an `unconnected-(...)` net, so a pin missing from the reference " +
          "altogether is a mismatch rather than a floating lead. significantContacts in " +
          "lib/stripboard/cuts.ts refuses the same case under its own key once a placement " +
          "exists; this is the same fact caught before one does.",
      )
    }
    for (const lead of leadsOf(part)) {
      const net = netlist.nets.get(lead.net)
      const id = `${part.ref}.${lead.pin}`
      if (net !== undefined && net.includes(id)) continue
      refuse(
        "lead-net-disagrees",
        `the part list puts "${id}" on net "${lead.net}", and that reference net does not list ` +
          `it.\n${WHY_NOT_DEFAULTED}.\nThe reference is the authority - it is what the cut ` +
          "derivation and the invariants are graded against - so a lead naming a different net " +
          "would be placed on the wrong strip and then judged against the right one.",
      )
    }
  }
}