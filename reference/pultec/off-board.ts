/**
 * Which Pultec components do not sit on a section board.
 *
 * THE SINGLE DEFINITION OF RESIDENCY, and it is data rather than a rule about
 * kinds because residency is a build decision the operator wants to keep open.
 * Moving a part on-board is removing a line here and giving it a footprint;
 * moving one off-board is adding a line. Both then reconcile through
 * `make update`.
 *
 * NOTHING IS DEFAULTED. A component absent from this set is on the board and
 * must have a `part.footprint`, so a forgotten entry fails loudly at export
 * rather than silently becoming a part nobody laid out.
 *
 * POTENTIOMETERS are panel-mount today. On-board mounting is admitted by the
 * architecture but no pot footprint exists yet.
 *
 * ROTARY SELECTORS are permanently off-board: a six- or eleven-position rotary
 * is a panel-mount part with a shaft and a bushing, and does not mount on
 * stripboard under any variant.
 *
 * INDUCTORS are all off-board because no inductor part has been chosen.
 * `reference/pultec/values.md` specifies them electrically and says a catalogue
 * part, a pot core or a transformer winding all qualify - and those do not share
 * a footprint, so naming one now would be a geometry claim nothing supports. The
 * design's per-section placement (the hi boost four on-board, the mid's 2H and
 * 1H off) is the target, reached by deleting lines here once a part exists.
 */
export const OFF_BOARD: ReadonlySet<string> = new Set([
  // Level and Q potentiometers - panel-mount.
  "RV_LO_CUT",
  "RV_LO_BOOST",
  "RV_HI_CUT",
  "RV_HI_BOOST",
  "RV_HI_Q",
  "RV_MID",

  // Rotary selectors - panel-mount, permanently.
  "SW_LO_CUT",
  "SW_LO_BOOST",
  "SW_HI_CUT",
  "SW_HI_BOOST",
  "SW_MID",
  "SW_MID_MODE",

  // Inductors - pending a part choice, not a permanent decision.
  "L_HI_BOOST_600MH",
  "L_HI_BOOST_300MH",
  "L_HI_BOOST_200MH",
  "L_HI_BOOST_100MH",
  "L_MID_2H",
  "L_MID_1H",
  "L_MID_0R45H",
  "L_MID_0R22H",
  "L_MID_0R1H",
])
