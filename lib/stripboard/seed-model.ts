/**
 * What a constructive seed is BUILT FROM, and every refusal that fires before
 * one hole is chosen.
 *
 * `./seed.ts` does the placing. This file holds the inputs' types, the checks
 * that an input is self-consistent, and the net-to-strip layout an `Ordering`
 * states - split from it for the line ceiling, exactly as
 * `lib/kicad/lead-span-model.ts` and `lead-span.ts` split.
 *
 * **WHY A PART'S PIN FIELD IS AN INPUT RATHER THAN A DERIVATION.** A two-lead
 * part has ONE free parameter - how far apart its leads are bent - and
 * `leadSpanFor` bounds it, so the seed may legitimately choose a span inside
 * those bounds and nothing else about the part's geometry is needed. A part with
 * MORE than two leads has no such lever: its pin field is moulded, `spanHoles`
 * in `tools/stripboard/constraints-model.ts` is "defined only for exactly two
 * holes" and says so, and `HC5`/`HC9` therefore do not constrain it at all. So
 * the field arrives as DATA on the part, and `SeedPart` is a union rather than
 * one shape with an optional field: a three-lead part with no field is not a
 * part with a default, it is a part whose geometry nobody stated.
 *
 * **NOTHING HERE READS A FOOTPRINT FILE, AND THAT IS A DELIBERATE ABSENCE.**
 * `lib/kicad/footprint-extent.ts` and `lib/kicad/formed-frame.ts` are the two
 * modules that turn a `.kicad_mod` into holes, both are recorded in this plan's
 * ledger as having lost their only consumer when the owner ruled that body
 * collisions are not modelled (*"Don't worry about body collisions on the
 * stripboard. It's extremely flexible."*), and both are slated for deletion. A
 * seed that imported either would give them a consumer again and re-open a
 * question that is closed. A placement is its pins; the pins come in as data.
 *
 * **AN ORDERING IS DATA AND NOT A HEURISTIC.** `seedsFrom` takes the orderings
 * it is given and returns one candidate per ordering, in the order handed to it,
 * with no ranking and no preference. That is the invariant this whole project
 * rests on - *"an agent may never author the acceptance criteria for the
 * artifact it is producing"* - applied to the one task where the agent decides
 * something: the seed may choose placements, and it may not choose which seed is
 * good. `objectiveOf` and `violationsOf` answer that, from the owner's weights.
 */
import type { Grid } from "./board.ts"
import type { ReferenceNets } from "./cuts.ts"
import type { BodyMargins } from "./seed-area.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

/** One terminal of a part: the pin name the netlist uses, and the net it is on. */
export interface SeedLead {
  readonly pin: string
  readonly net: string
}

/**
 * One terminal of a MOULDED pin field, in the part's own grid steps.
 *
 * `alongSteps` runs along the pin row and `acrossSteps` across the rows - the
 * two axes `classifyPads` in `lib/kicad/pin-pattern-model.ts` decomposes a
 * footprint into. **Every pin of one field must have a DISTINCT `alongSteps`**,
 * which `validateNetlist` enforces: the along axis is laid across the strips
 * (see `./seed.ts`), so two pins sharing it would share a strip, and a strip
 * carrying two nets' leads is the interleaved OPEN this plan's Task 5 measured
 * as the realistic failure after a correct cut derivation.
 */
export interface SeedFieldPin extends SeedLead {
  readonly alongSteps: number
  readonly acrossSteps: number
}

/**
 * What every part carries whatever its shape: what it is, and how much room it
 * takes.
 *
 * `rigid` is `LeadSpan.geometry.kind` and `body` comes from the part's own
 * `.kicad_mod`; both are DATA on the part for the reason the pin field is (see
 * the module comment), and `lib/stripboard/seed-parts.ts` is the one place they
 * are derived. The owner's rule - *"Rigid parts shouldn't be routed
 * through/under"* - needs both: which parts are rigid, and where they reach.
 */
export interface SeedPartBase {
  readonly ref: string
  readonly footprint: string
  /** Terminals that cannot be formed, so the part cannot be jostled out of the way. */
  readonly rigid: boolean
  /** How far its body reaches past its outermost pads, in holes, in its own frame. */
  readonly body: BodyMargins
}

/** A part whose one geometric lever is how far apart its two leads are bent. */
export interface TwoLeadPart extends SeedPartBase {
  readonly kind: "two-lead"
  /** The two terminals. Their separation is the seed's to choose, inside the recorded span. */
  readonly leads: readonly [SeedLead, SeedLead]
}

/** A part whose terminals are moulded where they are, so the seed may only turn it. */
export interface FixedFieldPart extends SeedPartBase {
  readonly kind: "fixed-field"
  /** The moulded field, which the seed may orient and may not reshape. */
  readonly field: readonly SeedFieldPin[]
}

/**
 * A part to place, in the one of the two shapes its terminal count gives it.
 *
 * **THE TWO MEMBERS ARE NAMED TYPES** so that each placer takes the shape it
 * handles rather than the union plus a guard. A guard after a `kind` check is a
 * refusal that cannot fire, and *"code after an unconditional refusal cannot be
 * tested and an untested unreachable derivation reads like a working one"* -
 * Task 1's finding, applied here.
 */
export type SeedPart = TwoLeadPart | FixedFieldPart

/**
 * The circuit a seed is built from: the nets it must realise, and the parts that
 * carry them.
 *
 * **THE TWO HALVES ARE CROSS-CHECKED RATHER THAN TRUSTED** (`validateNetlist`).
 * `nets` is the authority - it is what `derivedCuts` and `violationsOf` are
 * handed - and `parts` is what gets placed, so a pin in one and not the other is
 * a seed built for a different circuit than the one it will be graded against.
 */
export interface SeedNetlist {
  readonly nets: ReferenceNets
  readonly parts: readonly SeedPart[]
}

/**
 * One way of laying the nets out across the strips.
 *
 * `nets` is every net, in the order they take strips; `stride` is how many
 * strips each one advances, so `stride: 2` leaves one spare strip between
 * consecutive nets. **Both are the caller's**, and `name` exists so a refusal
 * and a report can say which ordering produced what.
 *
 * **WHY THE STRIDE IS HERE AND NOT CHOSEN INSIDE.** It changes what is feasible,
 * not just what is cheap: a part whose span is fixed at two holes - a 2.54mm pin
 * header, `leadSpanFor`'s `[2, 2]` - needs its two nets on ADJACENT strips, which
 * `stride: 1` can give and `stride: 2` never can; while a three-terminal part
 * whose outer pins are two holes apart lands both of them on home strips only at
 * `stride: 2`. A module that picked one would be deciding which of those two
 * costs to pay, which is a decision about the artifact and not about the
 * mechanism.
 */
export interface Ordering {
  readonly name: string
  readonly nets: readonly string[]
  readonly stride: number
}

const WHY_NOT_DEFAULTED =
  "Nothing is substituted: a seed built from an input this check would have rejected is a seed " +
  "the optimizer must repair, and a decision that should never have been accepted is worse " +
  "than a construction that stopped"

/** A refusal under this family's key prefix, shared by both seed modules. */
export function refuse(key: string, body: string): never {
  throw new Error(`stripboard-seed-${key}: ${body}`)
}

/** Every terminal of a part, whichever shape it has, in its own order. */
export function leadsOf(part: SeedPart): readonly SeedLead[] {
  return part.kind === "two-lead" ? part.leads : part.field
}

/**
 * The span bounds for a footprint, from the map the caller supplied.
 *
 * **IT DOES NOT CALL `leadSpanFor`**, for the reason `./score.ts` gives for
 * taking its weights as an argument: the bounds are recorded data with
 * provenance, and a core module that reached for the module-level table would be
 * a second reader of it with no way for a caller to inject a revised figure.
 * `admitPattern` already has exactly that defect and records it. A caller hands
 * `LEAD_SPANS`, or `leadSpanFor`'s own second argument, straight in.
 */
export function spanFor(footprint: string, spans: ReadonlyMap<string, LeadSpan>): LeadSpan {
  const found = spans.get(footprint)
  if (found === undefined) {
    refuse(
      "no-span-recorded",
      `"${footprint}" is not in the span map handed to seedsFrom, so how far apart its leads ` +
        `may be bent - and how close together - is unknown, and a placement for it would be a ` +
        `guess at the one thing a layout cannot negotiate.\n${WHY_NOT_DEFAULTED}.\nThe recorded ` +
        "bounds are LEAD_SPANS in lib/kicad/lead-span.ts, read through leadSpanFor, which " +
        "refuses an unrecorded footprint by name and lists every footprint that has an entry.",
    )
  }
  return found
}

/**
 * Both halves of a netlist agree, every ref is distinct, and every moulded field
 * puts one pin per strip.
 *
 * The three checks are here rather than in the placer because all three are true
 * or false of the INPUT, before any ordering is applied, so a caller with four
 * orderings hears about a malformed netlist once.
 */
export function validateNetlist(netlist: SeedNetlist): void {
  const seen = new Set<string>()
  for (const part of netlist.parts) {
    if (seen.has(part.ref)) {
      refuse(
        "repeated-ref",
        `two parts in the netlist are both called "${part.ref}", so which of them a reference ` +
          `pin id names is not stated.\n${WHY_NOT_DEFAULTED}.\nNote that a pad's identity in ` +
          "this model is its ref AND its pin name (lib/stripboard/board.ts), so an off-board " +
          "part with three terminals is three PLACEMENTS sharing one ref - but it is still one " +
          "entry here, with three leads.",
      )
    }
    seen.add(part.ref)
    checkBody(part.ref, part.body)
    if (part.kind === "fixed-field") checkField(part.ref, part.field)
  }
  crossCheck(netlist)
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
  const byAlong = new Map<number, string>()
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
    const already = byAlong.get(pin.alongSteps)
    if (already !== undefined) {
      refuse(
        "field-shares-a-strip",
        `"${ref}" pins "${already}" and "${pin.pin}" are both ${pin.alongSteps} steps along the ` +
          "pin row, and this placer lays that row ACROSS the strips - so the two leads would " +
          "share one strip.\nThat is refused rather than placed: a strip carrying two nets' " +
          "leads needs a cut between them, and leads of two nets INTERLEAVED on one strip is " +
          "the open no cut list can close (lib/stripboard/invariants.ts, and this plan's Task " +
          "5 measured it as the realistic failure after a correct derivation).\nIf the two pins " +
          "really are one net's, they are still two strips' worth of copper to join; state the " +
          "field with distinct alongSteps and let the join be a wire or a bridge.",
      )
    }
    byAlong.set(pin.alongSteps, pin.pin)
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

/**
 * Net to the strip that hosts it, from one ordering.
 *
 * The nets take strips `0`, `stride`, `2*stride`, ... in the sequence given.
 * **A net's home strip is where its leads land by preference and is not a claim
 * that they all do**: a lead that cannot reach lands elsewhere and is joined,
 * which is `./seed.ts`'s business.
 */
export function homeStripsFor(
  netlist: SeedNetlist,
  ordering: Ordering,
  grid: Grid,
): ReadonlyMap<string, number> {
  if (!Number.isInteger(ordering.stride) || ordering.stride < 1) {
    refuse(
      "ordering-stride-not-positive",
      `ordering "${ordering.name}" has a stride of ${ordering.stride}, and a stride is how many ` +
        `strips each net in the sequence advances - so it must be a whole number of at least ` +
        `1.\n${WHY_NOT_DEFAULTED}.\nA stride of 0 would put every net on strip 0, which is ` +
        "every net shorted to every other; a fractional one names no strip at all.",
    )
  }
  const home = new Map<string, number>()
  for (const [index, net] of ordering.nets.entries()) {
    if (!netlist.nets.has(net)) {
      refuse(
        "ordering-unknown-net",
        `ordering "${ordering.name}" names net "${net}" at position ${index}, and the netlist ` +
          `has no such net.\n${WHY_NOT_DEFAULTED}.\nThe nets this netlist carries are:\n` +
          `${[...netlist.nets.keys()].sort().map((name) => `  ${name}`).join("\n")}`,
      )
    }
    if (home.has(net)) {
      refuse(
        "ordering-repeated-net",
        `ordering "${ordering.name}" names net "${net}" twice, at positions ` +
          `${ordering.nets.indexOf(net)} and ${index}, so it would be given two home strips ` +
          `and the second would silently win.\n${WHY_NOT_DEFAULTED}.\nA net that genuinely ` +
          "wants two strips gets them by a lead landing off its home strip and a join, which " +
          "is priced; a repeated ordering entry is not priced and is not a decision anybody " +
          "made.",
      )
    }
    const strip = index * ordering.stride
    if (strip >= grid.strips) {
      refuse(
        "ordering-off-board",
        `ordering "${ordering.name}" would put net "${net}" on strip ${strip}, and the stock ` +
          `has ${grid.strips} strips - so the layout runs off the edge at position ${index} of ` +
          `${ordering.nets.length} at a stride of ${ordering.stride}.\n${WHY_NOT_DEFAULTED}.\n` +
          `A stride of 1 needs ${ordering.nets.length} strips for this circuit. The stock is ` +
          "the owner's, declared in stripboard/rules.json as stockRows and stockCols, and it " +
          "is the one input a layout cannot negotiate.",
      )
    }
    home.set(net, strip)
  }
  for (const net of netlist.nets.keys()) {
    if (home.has(net)) continue
    refuse(
      "ordering-missing-net",
      `ordering "${ordering.name}" lists ${ordering.nets.length} of the netlist's ` +
        `${netlist.nets.size} nets and does not name "${net}", so that net has no strip to ` +
        `host it.\n${WHY_NOT_DEFAULTED}.\nAn ordering is every net in the order they take ` +
        "strips. A partial one is not read as \"place the rest anywhere\": where a net lives is " +
        "the decision this parameter exists to carry.",
    )
  }
  return home
}

/**
 * The parts in the order they claim strips and holes: **most constrained first.**
 *
 * A moulded field can be oriented two ways and must land on consecutive strips;
 * a two-lead part has a span lever and the whole board to put it on. So the
 * fields go first, and within each group the netlist's own order is kept, which
 * makes the result a function of the input rather than of a map's iteration.
 *
 * **IT IS THIS MODULE'S ONE INTERNAL ORDERING, AND IT IS DECLARED RATHER THAN
 * TUNED.** The `orderings` parameter varies the net layout and does not vary
 * this; a different part order is a legitimate seed variant and would belong in
 * that parameter, not in a preference here. Measured on the one circuit this was
 * run against: it is what lets a three-terminal part take the spare strip beside
 * its own nets before a two-lead part claims it.
 */
export function placementOrder(parts: readonly SeedPart[]): readonly SeedPart[] {
  const fields = parts.filter((part) => part.kind === "fixed-field")
  const leads = parts.filter((part) => part.kind === "two-lead")
  return [...fields, ...leads]
}
