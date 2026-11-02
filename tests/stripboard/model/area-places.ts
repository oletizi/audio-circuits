/**
 * WHERE A BOARD BREAKS THE TWO HARD AREA RULES, as a list of places a refusal or
 * a notice can name.
 *
 * **ITS OWN MODULE BECAUSE THREE FILES WERE ABOUT TO ASK THE SAME QUESTION.**
 * `./seed-room-hand-boards.test.ts` measures the owner's as-built boards,
 * `./benchmark-fixtures.ts` has to say what an imported hand board carries into
 * the search, and `../exemptions.test.ts` consults the registry about both. Each
 * had its own loop over the same pairs, and a second spelling of "where does
 * this board break `rigidOverlap`" is a second place for an answer to come out
 * differently - which matters here, because one of those answers is the count a
 * recorded exemption is reported against.
 *
 * **IT APPLIES THE RULES AND DOES NOT RESTATE THEM.** `rigidOverlap` and
 * `routedUnderRigid` live in `lib/stripboard/seed-area.ts` and are the owner's
 * directives; `rectsOverlap` and `holeInRect` are that module's own predicates.
 * All this adds is the walk over every pair and the string a place is named by,
 * because the rule functions answer about ONE candidate against the others and a
 * measurement wants the whole board at once.
 *
 * **A REMAINING DUPLICATE, NAMED RATHER THAN LEFT TO BE FOUND**:
 * `./moves.test.ts` still carries its own `rigidOverlaps` helper over generated
 * boards. It is not migrated here in the same change as the exemption registry,
 * which is about the as-built boards; it is a one-line swap for whoever touches
 * that file next.
 */
import { holeInRect, rectsOverlap, type PartArea } from "../../../lib/stripboard/seed-area.ts"

/**
 * Every overlapping pair in which at least one part is RIGID - the pairs the
 * owner's 2026-10-15 directive refuses, as against the formable-on-formable ones
 * his earlier directives admit. Named `"<a>/<b>"` in the areas' own order.
 */
export function rigidOverlapPlaces(areas: readonly PartArea[]): readonly string[] {
  const places: string[] = []
  for (const [index, a] of areas.entries()) {
    for (const b of areas.slice(index + 1)) {
      if (!a.rigid && !b.rigid) continue
      if (rectsOverlap(a.rect, b.rect)) places.push(`${a.ref}/${b.ref}`)
    }
  }
  return places
}

/**
 * Every lead that sits inside a rigid part's area, named `"<guest> under
 * <host>"`.
 *
 * The host loop is over RIGID parts only, which is the rule: a lead inside a
 * formable part's rectangle is a part that can be jostled aside.
 */
export function routedUnderRigidPlaces(areas: readonly PartArea[]): readonly string[] {
  const places: string[] = []
  for (const host of areas) {
    if (!host.rigid) continue
    for (const guest of areas) {
      if (guest.ref === host.ref) continue
      for (const lead of guest.leads) {
        if (holeInRect(lead, host.rect)) places.push(`${guest.ref} under ${host.ref}`)
      }
    }
  }
  return places
}
