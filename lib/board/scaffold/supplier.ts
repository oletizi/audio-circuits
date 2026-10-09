/**
 * Which board fits an absent section's stand-in group, when the build has fewer than
 * five boards on the bench.
 *
 * WHY AN ORDERING IS NEEDED AT ALL. Every board's junction carries all five ladder
 * nets, so any present board can physically host any absent section's stand-in parts.
 * If "which board hosts hi-cut's stand-in" were left to answer itself per board - each
 * board independently deciding "I'll fit it" - two present boards could both decide to
 * fit it. The two copies would then sit in parallel on the shared bus and a value would
 * be quietly halved. That is not a bench mistake that announces itself: it produces a
 * plausible wrong measurement, not an obvious fault. Fixing one supplier per absent
 * group is what prevents it, and the assignment has to be computed the same way by
 * everyone building the same configuration, not decided board-by-board.
 *
 * WHY THIS ORDERING AND NOT A CLEVERER ONE. Because the bus makes every board able to
 * reach every node, the choice of which present board supplies which absent group is
 * electrically free - no board is a better host than any other on electrical grounds.
 * That freedom means the ordering only has to be fixed and legible, not optimal. This
 * function therefore does not prefer a board with more spare space, fewer parts already
 * fitted, or any other layout property: doing so would make the assignment depend on
 * how each board happens to be populated, which is exactly the kind of instability this
 * module exists to avoid. `LADDER_ORDER` - the sections in their position along the
 * ladder - is used only because it is already the one order this circuit's own
 * documentation states, not because it is better than some other fixed order.
 *
 * THE CONSEQUENCE THE OWNER HAS TO LIVE WITH. The assignment is stable only while
 * boards are added LATER in `LADDER_ORDER`. Build low-boost alone and it supplies all
 * four other groups. Add hi-boost afterwards and hi-boost - earlier in the order -
 * becomes the supplier for hi-cut, mid and itself is now present, so hi-cut's and mid's
 * stand-in parts physically move from the low-boost board to the hi-boost board. No
 * rule derived from the circuit avoids this: "whichever board was built first" is a
 * fact about the owner's history, not a property the model holds, so nothing here can
 * compute around it. The generated guide states the assignment for the exact set of
 * boards in front of the owner, so a later reassignment shows up as a diff between two
 * guides rather than as an unexplained part that has moved.
 */

export const LADDER_ORDER: readonly string[] = [
  "hi-boost",
  "hi-cut",
  "low-cut",
  "low-boost",
  "mid",
]

export function suppliers(present: ReadonlySet<string>): ReadonlyMap<string, string> {
  if (present.size === 0) {
    throw new Error(
      "suppliers() needs at least one present board to assign stand-ins from. " +
        "A build with no boards has nothing present that could supply a stand-in.",
    )
  }
  for (const section of present) {
    if (!LADDER_ORDER.includes(section)) {
      throw new Error(
        `Unknown section: ${section}. Known sections: ${LADDER_ORDER.join(", ")}. ` +
          "Section names come from LADDER_ORDER and are not defaulted.",
      )
    }
  }

  const assigned = new Map<string, string>()
  for (const absent of LADDER_ORDER) {
    if (present.has(absent)) continue
    for (const supplier of LADDER_ORDER) {
      if (present.has(supplier)) {
        assigned.set(absent, supplier)
        break
      }
    }
  }
  return assigned
}
