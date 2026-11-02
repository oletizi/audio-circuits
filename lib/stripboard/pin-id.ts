/**
 * A pin's identity in the netlist's own vocabulary - `<ref>.<pin>` - formed in
 * one place and taken apart in one place.
 *
 * **WHY IT EXISTS: A LANDING PAD'S IDENTITY IS ITS COMPONENT AND ITS TERMINAL,
 * AND THE TWO MUST NOT COME APART.** Three pads of one potentiometer are three
 * placements that share one `ref` and name three different pins
 * (`tools/stripboard/vero-import.ts` records why, and
 * `./invariants.ts`'s `holesByPin` records what measuring it cost). So the
 * identity of a pad is the PAIR, and the thing that must never happen is the
 * pair being re-derived differently on two sides of a round trip - the
 * generator forming it one way, the exporter another, and nothing comparing
 * them. `lib/stripboard/board.ts` moved `OFF_BOARD_TERMINAL` here for the same
 * reason, in its own words: "a second spelling of a sentinel is two things to
 * keep equal".
 *
 * **IT IS IN `lib/` BECAUSE THE PAIR IS FORMED ON BOTH SIDES OF THE
 * `tools/`-`lib/` LINE.** `./seed-parts.ts` takes a pin id apart to construct a
 * pad, `tools/stripboard/vero-import.ts` takes one apart to import a pad from a
 * dump's `FROM <ref>.<pin>` field, and `tools/stripboard/vero-export.ts` puts
 * one back together to write a pad's `PAD` statement. `lib/stripboard/` may not
 * import `tools/`, so the only module all three can read is this one.
 *
 * **THE LAST DOT SEPARATES THE TWO, AND THAT IS A MEASUREMENT.** A REF may
 * contain a dot - `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` is a real part on a real
 * Pultec board, which `tools/stripboard/moves-cluster.ts` records - so splitting
 * on the FIRST dot would cut a ref in half. A PIN name may not, which is why
 * `pinId` refuses one rather than emitting a string that would come back as a
 * different pair.
 *
 * **WHAT IS NOT CLAIMED.** This is a string convention, not a lookup: nothing
 * here says the ref names a component that exists or that the pin is on a net.
 * Those are `./seed-validate.ts`'s and `tools/stripboard/equivalence.ts`'s
 * questions, and they are asked of the netlist rather than of the spelling.
 *
 * **CALL SITES THIS DOES NOT YET COVER, stated so the gap is visible rather
 * than discovered.** `./seed-validate.ts`, `./seed-place.ts` and several modules
 * under `tools/stripboard/` still spell `${ref}.${pin}` inline. They form the id
 * from a seed part's declared leads rather than from a PLACEMENT's pins, which
 * is upstream of the pad round trip this module exists to hold together; routing
 * them through here is a later change and not a behaviour one.
 */

/** A pin id taken apart: the component reference, and the terminal on it. */
export interface PinId {
  readonly ref: string
  readonly pin: string
}

const WHY_NOT_GUESSED =
  "A pin id is the only thing that says WHICH terminal of which component a hole holds, so a " +
  "guessed one puts a lead on the wrong net quietly: nothing downstream compares the two halves " +
  "again"

/**
 * `<ref>.<pin>`, or a refusal naming which half is unusable.
 *
 * A pin name carrying a dot refuses rather than being joined, because
 * `pinIdParts` splits on the LAST dot: `pinId("R1", "a.b")` would come back as
 * `{ ref: "R1.a", pin: "b" }`, which is a different component. That is the one
 * input for which the join and the split disagree, and it is refused here so
 * that they cannot.
 */
export function pinId(ref: string, pin: string): string {
  if (ref === "") {
    throw new Error(
      `stripboard-pin-id-no-ref: a pin id is "<ref>.<pin>" and the ref handed over for pin ` +
        `"${pin}" is empty, so the id would name a terminal of nothing.\nFix whichever built the ` +
        `placement or the netlist this came from.\n${WHY_NOT_GUESSED}.`,
    )
  }
  if (pin === "") {
    throw new Error(
      `stripboard-pin-id-no-pin: a pin id is "<ref>.<pin>" and the pin name handed over for ` +
        `"${ref}" is empty, so the id would name the component and no terminal of it - which is ` +
        "exactly the collapse a pad's identity exists to prevent, since three pads of one pot " +
        `share that ref.\nFix whichever built the placement.\n${WHY_NOT_GUESSED}.`,
    )
  }
  if (pin.includes(".")) {
    throw new Error(
      `stripboard-pin-id-dotted-pin: "${ref}" has a pin named "${pin}", and a pin name may not ` +
        "contain a dot: pinIdParts separates a ref from a pin at the LAST dot (a ref legitimately " +
        'contains dots - "SI_HI_BOOST_RV_HI_BOOST.ccw-wiper" is a real part on a real Pultec ' +
        `board), so this id would read back as a different component.\nFix the part's pin names ` +
        `where they are declared.\nIt is not escaped or rewritten here: a pin id that survives a ` +
        "round trip only after being transformed is two names for one terminal.",
    )
  }
  return `${ref}.${pin}`
}

/**
 * A pin id's two halves, or `undefined` when the string is not one.
 *
 * **THE REFUSAL BELONGS TO THE CALLER, AND DELIBERATELY.** What a malformed id
 * means depends entirely on where it came from: from a dump's `FROM` field it is
 * a `PAD` line with no usable provenance, from a reference netlist it is a
 * reader that produced a bad member list, and the two want different messages
 * naming different fixes. So this reports that it could not read one, and every
 * caller refuses in its own words (`tools/stripboard/vero-import.ts`'s
 * `vero-import-pad-unprovenanced`, `./seed-parts.ts`'s `parts-pin-id-malformed`).
 * `tools/guide/dump-model.ts` draws the same line for the same reason.
 */
export function pinIdParts(id: string): PinId | undefined {
  const dot = id.lastIndexOf(".")
  if (dot < 1 || dot === id.length - 1) return undefined
  return { ref: id.slice(0, dot), pin: id.slice(dot + 1) }
}
