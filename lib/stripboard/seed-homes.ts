/**
 * WHICH STRIP EACH NET STARTS ON, in either of the two forms a caller may state
 * it in, and every refusal that fires before one hole is chosen.
 *
 * **SPLIT FROM `./seed-model.ts` ON THE SEAM THAT FILE ALREADY NAMES.** It holds
 * what a part and a netlist ARE; this holds where the nets go, which is the half
 * that grew when the per-net form arrived - exactly as `./seed-validate.ts` was
 * split off for the checks and `lib/kicad/lead-span-model.ts` from
 * `lead-span.ts` before that. `./seed-model.ts` went over this repository's
 * 500-line ceiling with both halves in it. `refuse` and `WHY_NOT_DEFAULTED`
 * still come FROM that file, so every refusal in this family carries one key
 * prefix and ends with one sentence.
 *
 * **A HOME STRIP IS WHERE A NET STARTS, NOT WHERE IT IS CONFINED.** Since Task 2
 * a strip may carry several nets with the cuts parting them derived, so
 * exclusive ownership is not a thing this model can express and reading an
 * assignment as exclusive would reproduce the very inflexibility the uniform
 * stride had. What a home strip buys is a FIRST CHOICE: `./seed-fit.ts` seats a
 * two-lead part across its two nets' homes when the recorded span reaches, and
 * `./seed-fit.ts` lands a pad on its net's home and nowhere else.
 *
 * **WHEN A LEAD MAY LAND SOMEWHERE ELSE IS MECHANICAL AND IS NEVER A
 * PREFERENCE.** A deviation is admissible only where a HARD constraint forces
 * it, and the candidate must still satisfy every hard constraint afterwards.
 * The five, each with the one place it is enforced:
 *
 *   - **lead reach** - the recorded span band, `spanFor` in `./seed-model.ts`,
 *     applied by `acrossTwoHomes` and `landingStrips` in `./seed-fit.ts`;
 *   - **a hole already taken** - `free` in `./seed-place.ts`, per candidate
 *     column inside `chooseColumn`;
 *   - **the board edge** - `onBoard` for each hole and `rectOnBoard` for the
 *     part's whole rectangle, both in `chooseColumn`;
 *   - **a rigid part's area** - `routedUnderRigid` and `rigidOverlap` from
 *     `./seed-area.ts`, per candidate column in `chooseColumn`;
 *   - **an interleaving** - `interleavingOn` in `./separable.ts`, reached
 *     through `interleavingAfter` per candidate column in `chooseColumn`.
 *
 * A placer free to leave a net's home because another position merely looked
 * better would be authoring its own acceptance criteria, which is the one thing
 * this repository forbids outright. Nothing here or in `./seed-fit.ts` ranks a
 * deviation against a home: the three shapes are tried in the committed
 * objective's own price order, and `objectiveOf` remains the only thing that
 * prices a board.
 */
import type { Grid } from "./board.ts"
import { WHY_NOT_DEFAULTED, refuse, type SeedNetlist } from "./seed-model.ts"

/**
 * Every net laid out at ONE uniform spacing: the nets in the order they take
 * strips, and how many strips each one advances.
 *
 * `stride: 2` leaves one spare strip between consecutive nets. **Both fields are
 * the caller's**, and `name` exists so a refusal and a report can say which
 * ordering produced what.
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
export interface StrideOrdering {
  readonly name: string
  readonly nets: readonly string[]
  readonly stride: number
}

/**
 * Every net's strip stated one net at a time, which is what a uniform stride
 * cannot do.
 *
 * **WHY THE FORM EXISTS, in the case that forced it.** One stride governs every
 * net, so the tightest part sets the spacing for all of them: a rigid 5-pin
 * header needs five CONSECUTIVE strips, which is `stride: 1`, and on a Pultec
 * section at that spacing six capacitors reaching three strips all tie to ground
 * and exactly saturate its reach. There is no stride that gives the header its
 * five adjacent strips and those capacitors any room, because a stride cannot
 * say "tight here, loose there". A map can.
 *
 * **IT IS THE SHAPE `assignStrips` ALREADY RETURNS** -
 * `tools/stripboard/seed-arrangement.ts`, `StripAssignment` - so the Pultec's
 * own arrangement reaches `seedsFrom` without a translation step in between,
 * and `homeStripsFor` hands it on unchanged.
 *
 * **TWO NETS MAY NAME ONE STRIP, and that is admitted rather than refused.** It
 * means both nets START there, which since Task 2 is an expressible board: the
 * runs are parted by a cut `derivedCuts` derives, and `interleavingOn` is what
 * governs whether a position is admissible. Refusing it would be this module
 * deciding that a cut is unacceptable, and the owner has ruled the opposite -
 * *"Zero cuts was never a requirement."*
 */
export interface StatedOrdering {
  readonly name: string
  readonly homes: ReadonlyMap<string, number>
}

/**
 * One way of laying the nets out across the strips: uniformly, or net by net.
 *
 * **BOTH FORMS ARE LIVE AND BOTH ARE TESTED.** The stride form is not a stub
 * left behind the map form - it is how every committed benchmark ordering is
 * stated, and `tests/stripboard/model/seed-homes.test.ts` asserts that a stride
 * ordering and the map it implies build the same board hole for hole.
 *
 * **AN ORDERING IS DATA AND NOT A HEURISTIC** in either form: `seedsFrom` takes
 * the orderings it is given and returns one candidate per ordering, in the order
 * handed to it, with no ranking and no preference.
 */
export type Ordering = StrideOrdering | StatedOrdering

/**
 * Net to the strip it starts on, from one ordering in whichever form it was
 * stated.
 *
 * **IT DISCRIMINATES ON THE PRESENCE OF `homes`, and the two forms are not
 * mixed.** An ordering carrying both a stride and a map is refused rather than
 * resolved: silently preferring one would make the other half an input nobody
 * reads, and the two can disagree. There is no third form, and a third member of
 * the union would be a compile error here - neither helper below accepts a shape
 * that is neither.
 */
export function homeStripsFor(
  netlist: SeedNetlist,
  ordering: Ordering,
  grid: Grid,
): ReadonlyMap<string, number> {
  return "homes" in ordering
    ? statedHomes(netlist, ordering, grid)
    : stridedHomes(netlist, ordering, grid)
}

/**
 * The nets take strips `0`, `stride`, `2*stride`, ... in the sequence given.
 *
 * This is the form every committed ordering uses and its refusals are unchanged
 * by the arrival of the map form.
 */
function stridedHomes(
  netlist: SeedNetlist,
  ordering: StrideOrdering,
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
    knownNet(netlist, ordering.name, net, `names net "${net}" at position ${index}`)
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
 * The stated map, **returned unchanged** once it is checked against the netlist
 * and the stock.
 *
 * It is handed on rather than copied because it is the caller's own statement of
 * where each net starts: a map this function rebuilt would be a second
 * derivation of an input that needs none, and `ReadonlyMap` is what the
 * workspace holds it as. The checks are the three things the map can get wrong -
 * a net the circuit has not, a number that names no strip on this stock, and a
 * net it leaves out - plus the refusal of an ordering that states both forms.
 */
function statedHomes(
  netlist: SeedNetlist,
  ordering: StatedOrdering,
  grid: Grid,
): ReadonlyMap<string, number> {
  if ("nets" in ordering || "stride" in ordering) {
    refuse(
      "ordering-states-both-forms",
      `ordering "${ordering.name}" carries an explicit net-to-strip map AND the stride form's ` +
        "own fields, and those two can say different things about where a net starts.\n" +
        `${WHY_NOT_DEFAULTED}.\nNeither half is preferred: an ordering is one form or the ` +
        "other - nets plus a stride, or homes - and reading one half would make the other an " +
        "input nobody reads and nothing reports. Drop whichever half is not the one you meant.",
    )
  }
  for (const [net, strip] of ordering.homes) {
    knownNet(netlist, ordering.name, net, `gives net "${net}" a home strip`)
    if (!Number.isInteger(strip) || strip < 0 || strip >= grid.strips) {
      refuse(
        "home-not-a-strip",
        `ordering "${ordering.name}" starts net "${net}" on strip ${strip}, and this stock is ` +
          `${grid.strips} strips - so a home strip on it is a whole number from 0 to ` +
          `${grid.strips - 1}, and that is not one.\n${WHY_NOT_DEFAULTED}.\nIt is neither ` +
          "rounded nor clamped to the edge: a net clamped onto the last strip would share it " +
          "with whatever starts there by accident rather than by anybody's decision, and a map " +
          "is the caller's own statement of where each net starts. assignStrips in " +
          "tools/stripboard/seed-arrangement.ts numbers the nets 0 upwards, so a value outside " +
          "the stock means the map was built against a different piece of it. The stock is the " +
          "owner's, declared in stripboard/rules.json as stockRows and stockCols.",
      )
    }
  }
  for (const net of netlist.nets.keys()) {
    if (ordering.homes.has(net)) continue
    // **THE COUNT IS IN THE MESSAGE SO THAT THIS CHECK CANNOT BE DELETED
    // SILENTLY.** `homeOf` in `./seed-place.ts` refuses under the SAME key when
    // a net reaches a placer with no home - deliberately, because it is the same
    // condition at a later layer - so a test asserting only the key would still
    // pass with this loop removed, which is this repository's named recurring
    // defect wearing a passing test's clothes. The placer's guard names no
    // counts; this one does, and `./seed-homes.test.ts` asserts them.
    refuse(
      "net-has-no-home",
      `ordering "${ordering.name}" is an explicit net-to-strip map, it gives ` +
        `${ordering.homes.size} of the netlist's ${netlist.nets.size} nets a strip, and ` +
        `"${net}" is not one of them - so that net has no strip to start on.\n` +
        `${WHY_NOT_DEFAULTED}.\nA partial map is not read as "start the rest anywhere": where ` +
        "a net starts is the decision this parameter exists to carry, and a net defaulted onto " +
        "strip 0 would be shorted to whatever starts there.\nThe nets this netlist carries " +
        `are:\n${[...netlist.nets.keys()].sort().map((name) => `  ${name}`).join("\n")}`,
    )
  }
  return ordering.homes
}

/**
 * A net both forms must satisfy: the ordering may only name nets the netlist
 * carries.
 *
 * ONE CHECK AND ONE KEY FOR BOTH FORMS, because it is one condition - an
 * ordering naming a net this circuit has not was built for a different circuit,
 * whichever shape it was stated in. `clause` is the half of the sentence that
 * differs, so the message says where in the ordering the stranger was found.
 */
function knownNet(netlist: SeedNetlist, name: string, net: string, clause: string): void {
  if (netlist.nets.has(net)) return
  refuse(
    "ordering-unknown-net",
    `ordering "${name}" ${clause}, and the netlist has no such net.\n${WHY_NOT_DEFAULTED}.\n` +
      `The nets this netlist carries are:\n` +
      `${[...netlist.nets.keys()].sort().map((each) => `  ${each}`).join("\n")}`,
  )
}
