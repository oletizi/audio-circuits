/**
 * THE TWO `CircuitSpec` MAPS RULING R29 ADDED, FOR FIXTURES THAT BUILD A SPEC BY HAND.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan. `CircuitSpec` gained
 * `orientations` and `portDirections` (see `lib/schgen/ir/types.ts`), both required, and
 * **eighteen fixtures in `tests/schgen/` assemble a `CircuitSpec` as a literal.** This module is
 * what they say instead of each restating the same answer, so that the answer is stated ONCE with
 * its reason.
 *
 * **WHY EVERY FIXTURE PART GETS `null`, AND WHY THAT IS THE HONEST VALUE RATHER THAN A BLANK.**
 * `orientations` carries spec §1.5 step 2's answer per part, and that rule
 * (`lib/schgen/rules/orientation.ts`) keys on `ComponentKind` - a `lib/model/types.ts` type that
 * reaches the schematic generator only through a `Network` (`docs/known-gaps.md` **G182**). These
 * fixtures have no `Network`: they build `PartSpec`s directly from `twoPin`, with symbols from
 * `fixture-lib.ts`'s `Fix:` library and no model component behind them. **So the rule cannot be
 * consulted, and `null` is exactly what it means when the rule does not answer** - the part draws
 * in its symbol's own library frame, through `drawnRotation`. It is not a placeholder for an answer
 * nobody computed; there is no kind to compute one from.
 *
 * **It is also why every ported template assertion still holds.** `null` resolves to the library
 * frame, which is the rotation every one of these fixtures was already drawn at before R29, so the
 * geometry the ported tests pin does not move.
 *
 * The four real circuits do NOT come through here: `circuitSpecFrom`
 * (`lib/schgen/from-network.ts`) derives their map from the rule, because it holds the `Network`.
 */

import type { PartLabel, PartSpec, PortDirection } from "../../../lib/schgen/ir/types.ts"
import type { Rotation } from "../../../lib/schgen/render/geometry.ts"

/**
 * Every part of `parts` with no preferred orientation - the whole map, total over the list, which
 * is what `buildCircuit` requires and refuses a hole in.
 *
 * It takes the parts rather than returning an empty map on purpose: an empty map would be a HOLE
 * for every part, and `buildCircuit` refuses one precisely so that a part nobody asked about
 * cannot pass as a part the rule declined.
 */
export function noOrientationPreferences(parts: readonly PartSpec[]): ReadonlyMap<PartLabel, Rotation | null> {
  return new Map<PartLabel, Rotation | null>(parts.map((p) => [p.label, null]))
}

/**
 * No net has a declared direction.
 *
 * This is a real state and not an empty stand-in: `docs/known-gaps.md` **G99** records that a
 * direction is *"settled at the circuit boundary, OPEN below it"*, and `negotiablePort` says in its
 * own `why` what it does with a net it has no entry for - either horizontal edge is acceptable. A
 * fixture whose test is ABOUT a direction declares one (see `tests/schgen/elk/fixtures.ts`'s
 * `FIXTURE_DIRECTIONS`); every other fixture is about something else.
 */
export const NO_PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {}
