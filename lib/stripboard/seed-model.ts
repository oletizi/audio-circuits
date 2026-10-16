/**
 * What a constructive seed is BUILT FROM, and every refusal that fires before
 * one hole is chosen.
 *
 * `./seed.ts` does the placing. This file holds the inputs' types - split from
 * it for the line ceiling, exactly as `lib/kicad/lead-span-model.ts` and
 * `lead-span.ts` split. **Two halves that were here have since been split off
 * the same way, each because it is a half that KEEPS GROWING while this one does
 * not:** the checks that an input is self-consistent are `./seed-validate.ts`,
 * which grows with every part kind, and the net-to-strip layout an `Ordering`
 * states - `Ordering` itself and `homeStripsFor` - is `./seed-homes.ts`, which
 * grew when a per-net assignment joined the uniform stride. `refuse` and
 * `WHY_NOT_DEFAULTED` stay here and both files import them, so the whole family
 * shares one key prefix and one closing sentence.
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
 * **AN ORDERING IS DATA AND NOT A HEURISTIC**, and that invariant is stated
 * where the type and the behaviour live rather than a third time here:
 * `./seed-homes.ts` for what an `Ordering` is, `./seed.ts` for `seedsFrom`
 * returning one candidate per ordering with no ranking and no preference.
 */
import { OFF_BOARD_TERMINAL } from "./board.ts"
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
 * footprint into. The along axis is laid across the strips (see `./seed.ts`),
 * so two pins sharing an `alongSteps` land on the same strip - a correctly
 * quarter-turned DIP does exactly this, by construction, and needs a cut
 * between them rather than a refusal. A shared strip is not itself the open: a
 * strip carrying two nets' leads is fine with a cut between them, and only
 * INTERLEAVING - one net's leads split into two runs by the other net's, which
 * no single cut can rejoin - is the open. Whether a placed field interleaves is
 * answered on the PLACED board, by `interleavingOn` in
 * `lib/stripboard/separable.ts`, not here on the unplaced field.
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
 * ONE TERMINAL OF A PANEL-MOUNTED CONTROL: a hole an off-board wire is soldered
 * to, with no footprint, no orientation and no body.
 *
 * **THE PREDICATE THAT PRODUCES ONE IS THE DECLARED RESIDENCY, NEVER A MISSING
 * FOOTPRINT.** `onBoard` in `tools/stripboard/targets.ts` is the authority on
 * which components sit on a board - a board-resident part carries
 * `part.footprint`, an off-board landing carries only `part.symbol` - and
 * `circuits/pultec/off-board.ts` is the Pultec's own declaration of the same
 * fact, as data. `lib/stripboard/` may not import either, so the declaration
 * arrives as an ARGUMENT to `seedPartsFrom` (`lib/stripboard/seed-parts.ts`),
 * exactly as `rigid` and `body` arrive as fields derived there. **A ref the
 * footprint map does not name and the declaration does not either keeps refusing
 * by name**: a missing footprint means either "panel-mounted, represented by
 * landing pads" or "the physicalization data is wrong or absent", and turning
 * the second into apparently valid landing pads is the silent success this
 * repository is built to prevent.
 *
 * **ONE TERMINAL IS ONE PART HERE, so a three-terminal pot is THREE entries
 * sharing one ref** - and `validateNetlist` in `./seed-validate.ts` admits that
 * one repetition for that one kind. It is what the importer already produces:
 * *"an off-board part with three terminals becomes THREE placements that share
 * one `ref`. That is
 * faithful - the fork places each pad independently and a move must be able to
 * move one without the others"* (`padPlacementOf` in
 * `tools/stripboard/vero-import.ts`). A pad's identity in this model is its ref
 * AND its pin name, in both paths.
 */
export interface OffBoardPart extends SeedPartBase {
  readonly kind: "off-board"
  /** The one terminal. There is no second hole and no span to choose. */
  readonly lead: SeedLead
}

/**
 * The one place a landing pad's three fixed facts are stated: its footprint
 * sentinel, its absent body and its formability.
 *
 * **NONE OF THE THREE IS A CHOICE, which is why they are here and not at each
 * call site.** The footprint is `OFF_BOARD_TERMINAL` because a pad has no
 * `.kicad_mod` to read and because that is the string the IMPORT path records,
 * so `tools/stripboard/vero-export.ts` round-trips a constructed pad and an
 * imported one through the same branch. The body is zero on all four sides
 * because the thing in the hole is the end of a wire: there is no package to
 * reach past the pad, and the importer's own placement occupies exactly its one
 * hole. And it is NOT `rigid` - rigidity means terminals that cannot be formed,
 * and a wire is the most formable terminal on the board - which leaves the
 * owner's two rules pointing the right way: nothing may be routed under a rigid
 * part, so a pad whose hole falls inside one is still refused as a guest, while
 * a formable part's body may pass over the pad's own hole, which a wire can be
 * dressed around.
 */
export function offBoardPart(ref: string, lead: SeedLead): OffBoardPart {
  return {
    kind: "off-board",
    ref,
    footprint: OFF_BOARD_TERMINAL,
    rigid: false,
    body: { beforeAlong: 0, afterAlong: 0, beforeAcross: 0, afterAcross: 0 },
    lead,
  }
}

/**
 * A part to place, in the one of the three shapes its terminals give it.
 *
 * **THE THREE MEMBERS ARE NAMED TYPES** so that each placer takes the shape it
 * handles rather than the union plus a guard. A guard after a `kind` check is a
 * refusal that cannot fire, and *"code after an unconditional refusal cannot be
 * tested and an untested unreachable derivation reads like a working one"* -
 * Task 1's finding, applied here.
 *
 * **EVERY DISCRIMINATION ON `kind` IS EXHAUSTIVE, AND NONE OF THEM ABSORBS AN
 * UNKNOWN KIND INTO PLAUSIBLE BEHAVIOUR.** A `default` branch that DID would
 * have let `off-board` be added without a single call site noticing; written as
 * a complete `switch` over the union instead, a fourth member is a compile
 * error at every one of them. The four in the core are the two below (`leadsOf`,
 * `constraintRank` under `placementOrder`), `seedFrom` in `./seed.ts` and
 * `validateNetlist`'s per-kind checks in `./seed-validate.ts`.
 *
 * **THE COMPILER GIVES THAT FOR FREE ONLY WHERE THE SWITCH RETURNS A VALUE, and
 * this comment claimed it everywhere until 2026-10-16.** Measured with this
 * repository's own `tsc` (`strict: true`, no `noImplicitReturns`): a
 * value-returning switch over three of four members fails with `TS2366:
 * Function lacks ending return statement`, which covers `leadsOf` and
 * `constraintRank` below; a VOID switch over three of four with no `default`
 * compiles clean and silently does nothing, which is what `seedFrom` and
 * `validateNetlist` are. Both of those now close the gap with a `default` whose
 * whole body is `const x: never = part` - a type-level assertion that handles no
 * kind, and so is not the absorbing `default` this paragraph forbids. **Say
 * which mechanism a given switch relies on rather than asserting the guarantee
 * generally:** the general assertion was false for half of them for as long as
 * the off-board kind has existed.
 */
export type SeedPart = TwoLeadPart | FixedFieldPart | OffBoardPart

/**
 * The circuit a seed is built from: the nets it must realise, and the parts that
 * carry them.
 *
 * **THE TWO HALVES ARE CROSS-CHECKED RATHER THAN TRUSTED** (`validateNetlist` in
 * `./seed-validate.ts`).
 * `nets` is the authority - it is what `derivedCuts` and `violationsOf` are
 * handed - and `parts` is what gets placed, so a pin in one and not the other is
 * a seed built for a different circuit than the one it will be graded against.
 */
export interface SeedNetlist {
  readonly nets: ReferenceNets
  readonly parts: readonly SeedPart[]
}

/**
 * The sentence every refusal in this family ends with, exported so that
 * `./seed-validate.ts` and `./seed-homes.ts` end their refusals with the SAME
 * one rather than a second phrasing of it.
 */
export const WHY_NOT_DEFAULTED =
  "Nothing is substituted: a seed built from an input this check would have rejected is a seed " +
  "the optimizer must repair, and a decision that should never have been accepted is worse " +
  "than a construction that stopped"

/** A refusal under this family's key prefix, shared by every seed module. */
export function refuse(key: string, body: string): never {
  throw new Error(`stripboard-seed-${key}: ${body}`)
}

/** Every terminal of a part, whichever shape it has, in its own order. */
export function leadsOf(part: SeedPart): readonly SeedLead[] {
  switch (part.kind) {
    case "two-lead":
      return part.leads
    case "fixed-field":
      return part.field
    case "off-board":
      return [part.lead]
  }
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
 * The parts in the order they claim strips and holes: **most constrained first.**
 *
 * A moulded field can be oriented four ways and lands where its own steps put
 * it; a two-lead part has a span lever and the whole board to put it on; a
 * landing pad is one hole anywhere along the one strip its net is hosted on. So
 * the fields go first, the pads last, and within each group the netlist's own
 * order is kept, which makes the result a function of the input rather than of
 * a map's iteration.
 *
 * **IT IS THIS MODULE'S ONE INTERNAL ORDERING, AND IT IS DECLARED RATHER THAN
 * TUNED.** The `orderings` parameter varies the net layout and does not vary
 * this; a different part order is a legitimate seed variant and would belong in
 * that parameter, not in a preference here. Measured on the one circuit this was
 * run against: it is what lets a three-terminal part take the spare strip beside
 * its own nets before a two-lead part claims it.
 *
 * **WHERE THE PAD GOES IN THAT ORDER FOLLOWS THE RULE RATHER THAN RESTATING
 * IT.** A pad has one terminal, one strip and no span to satisfy, so it is the
 * least constrained part this model has and the declared rule puts the least
 * constrained last. No new preference is introduced: the two committed
 * benchmark boards carry no off-board part at all, so nothing about them can
 * move whichever end pads were put at, and the alternative - pads first - would
 * have had them taking comfortable columns from parts that cannot choose
 * another strip.
 *
 * **IT IS A STABLE SORT ON A DECLARED RANK AND IT USED TO BE TWO FILTERS.** The
 * filters silently DROPPED anything that was neither a field nor a two-lead
 * part, which is exactly how a new union member becomes a part that is never
 * placed and never refused; the rank below is a complete `switch`, so a fourth
 * kind is a compile error here instead.
 */
export function placementOrder(parts: readonly SeedPart[]): readonly SeedPart[] {
  return [...parts].sort((a, b) => constraintRank(a) - constraintRank(b))
}

/** Most constrained first, as `placementOrder` declares. */
function constraintRank(part: SeedPart): number {
  switch (part.kind) {
    case "fixed-field":
      return 0
    case "two-lead":
      return 1
    case "off-board":
      return 2
  }
}
