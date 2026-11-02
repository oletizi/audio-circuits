/**
 * The separability check both D2 (two pins of one part sharing a strip) and
 * D3a (two nets sharing a strip) need.
 *
 * **WHY THIS IS ONE CHECK AND NOT TWO.** Two pins of one part sharing a strip
 * and two nets sharing a strip are the same question: after `derivedCuts` cuts
 * between adjacent runs of different nets, is every net still in one piece on
 * that strip? A net is NOT separable when its contacts are interleaved with
 * another net's - `A B A` along one strip leaves `A` in two runs that no cut
 * list can rejoin.
 *
 * **WHAT THIS CHECK DOES NOT CLAIM.** Interleaving is not electrically illegal
 * - a wire could rejoin the two runs. It is refused by the CONSTRUCTOR because
 * the seed's join step joins a net's STRIPS, not two runs on one strip, so a
 * seed that produced it would hand the search a board its own joiner cannot
 * finish. `violationsOf` remains the authority on soundness and is unchanged.
 */

/** One contact a net makes on a strip, by its column and the part pin that put it there. */
export interface StripContact {
  readonly column: number
  readonly net: string
  readonly owner: string
}

/** A net found interleaved with another on one strip. */
export interface Interleaving {
  readonly strip: number
  readonly net: string
  readonly columns: readonly number[]
  readonly between: string
}

/**
 * Walk a strip's contacts in column order and find a net that starts a second,
 * separate run - which means another net's run lies between its two runs and
 * no cut list can rejoin them. Returns `null` when every net on the strip is
 * in one contiguous run (including when the strip has no contacts, or only
 * one).
 */
export function interleavingOn(
  strip: number,
  contacts: readonly StripContact[],
): Interleaving | null {
  const ordered = [...contacts].sort((a, b) => a.column - b.column)
  const seen = new Map<string, number[]>()
  let previous: string | undefined
  for (const contact of ordered) {
    if (contact.net !== previous) {
      const already = seen.get(contact.net)
      if (already !== undefined) {
        const between = previous
        if (between === undefined) {
          // UNREACHABLE BY CONSTRUCTION. `previous` is undefined only before the
          // walk's first contact, and `already` can only be set by an earlier
          // contact in this same ordered walk - so a net with a recorded run
          // reaches this branch exclusively from a later iteration, where
          // `previous` has already been assigned by the contact before it. No
          // input drives this throw; it is here because narrowing `between` from
          // `string | undefined` to `string` by any other means would be an `as`
          // this repository forbids.
          throw new Error(
            "stripboard-separable-run-without-predecessor: a net was found starting a second " +
              `run on strip ${strip} with no run before it, which the ordered walk makes ` +
              "impossible.\nThis is a defect in interleavingOn, not in the board. Nothing is " +
              "substituted: returning null here would report an interleaved strip as separable.",
          )
        }
        return { strip, net: contact.net, columns: [...already, contact.column], between }
      }
      seen.set(contact.net, [contact.column])
    }
    previous = contact.net
  }
  return null
}
