/**
 * Fixtures shared by `tests/schgen/elk/`'s three test files.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan. Everything here is built from the
 * ported block fixtures in `tests/schgen/__fixtures__/circuits.ts` - `blockCircuit`, `res`, `cap`
 * and the `Fix:`/`Pwr:` symbol libraries - so the ELK graph is measured over the same subgraphs
 * the ported template tests measure over, rather than over a graph written to suit it.
 *
 * **`fixtureAuthoring` IS DELETED, by ruling R29.** It built a `SchematicAuthoring` carrying the
 * two things `elkInputOf` used to read from one. Both now reach the backend through the IR, so
 * `elkInputOf` takes a `BlockSubgraph` alone and nothing here needs an authoring declaration.
 * `CLAUDE.md`'s *supersede means delete*: it is removed rather than left for someone to find and
 * assume is the way to build an ELK input.
 */

import { blockCircuit, res, symbols } from "../__fixtures__/circuits.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import type { BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { PartLabel, PartSpec } from "../../../lib/schgen/ir/types.ts"
import type { Rotation } from "../../../lib/schgen/render/geometry.ts"
import type { PortDirection } from "../../../lib/schgen/ir/types.ts"

/**
 * The three rails `RAILS` declares, with a direction each.
 *
 * `3V3` and `VDDA` arrive; `GND` is `bidirectional`, for the reason
 * `circuits/opamp-buffer.schematic.ts` gives for its own ground - it is the return for both the
 * rails and the signal, so calling it a source or a sink would assert something the circuit does
 * not.
 */
export const FIXTURE_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  "3V3": "in",
  VDDA: "in",
  GND: "bidirectional",
  OUT: "out",
  IN: "in",
}

/**
 * The subgraph of block `B` of a circuit holding exactly `parts`, rendered `auto`.
 *
 * **`FIXTURE_DIRECTIONS` reaches it through the CIRCUIT now, not through a `SchematicAuthoring`**
 * - ruling **R29**. `elkInputOf` takes only a `BlockSubgraph`, and a subgraph's `portDirections`
 * come from `Circuit.portDirections`, so a fixture that wants `IN` to be inbound declares it on
 * the circuit the way the four real ones do.
 */
export function autoBlock(
  parts: PartSpec[],
  external: readonly string[] = [],
  orientations?: ReadonlyMap<PartLabel, Rotation | null>,
): BlockSubgraph {
  const circuit = blockCircuit(parts, { kind: "auto" }, {
    external: [...external],
    portDirections: FIXTURE_DIRECTIONS,
    ...(orientations === undefined ? {} : { orientations }),
  })
  return subgraphOf(circuit, "B", symbols)
}

/**
 * One resistor whose GROUNDED end is pin 1, with the orientation map spec §1.5's rule produces for
 * exactly that shape: **rotation 180**.
 *
 * **IT IS `pt2399-core/C8`'s CASE, WHICH IS THE WHOLE OF WHAT RULING R29 MOVES ON REAL DATA.** Of
 * the 102 components in the four parity circuits the rule answers `null` for 73, rotation 0 for 28
 * and **180 for exactly one** - so without this fixture nothing in the suite would ever build an
 * ELK node at a non-zero rotation, and R29's change would be invisible to every check.
 *
 * **WHY THE MAP IS STATED AND NOT DERIVED HERE.** `rules/orientation.ts` keys on `ComponentKind`
 * and these fixtures have no `Network` to carry one (`docs/known-gaps.md` **G182**), so the rule
 * cannot run over them at all. What is asserted here is that the BACKEND honours the map; that the
 * RULE produces 180 for a resistor with pin 1 on a ground rail is a separate claim, held by
 * `tests/schgen/rules/orientation.test.ts` over the real symbols. Neither test stands in for the
 * other, and pretending one did is how a fixture comes to assert its own premise.
 *
 * `Fix:R` puts pin 1 at angle 270 (side `top` at rotation 0) and pin 2 at angle 90 (`bottom`), so
 * 180 swaps them - which is a difference a check can see.
 */
export function groundedPinOneBlock(): BlockSubgraph {
  return autoBlock([res("R_FLIP", "GND", "3V3")], [], new Map<PartLabel, Rotation | null>([["R_FLIP", 180]]))
}

/** Two resistors in series from `3V3` to `GND`: the smallest block a divider template is about. */
export function dividerSubgraph(): BlockSubgraph {
  return autoBlock([res("R_TOP", "3V3", "MID"), res("R_BOT", "MID", "GND")])
}

/**
 * `GND` reached by five resistor pins plus the block's own boundary node: **degree six**, so a
 * spanning path over it is five edges.
 *
 * Every resistor also sits on `3V3`, which keeps the fixture free of single-pin nets - a shape
 * the IR's own `singlePinNets` rule refuses and which would make this fixture about something
 * else.
 */
export function groundOfDegreeSix(): BlockSubgraph {
  return autoBlock([0, 1, 2, 3, 4].map((i) => res(`R_${i}`, "3V3", "GND")))
}

/**
 * A block with a NON-RAIL boundary net at each end: `IN` declared `in` and `OUT` declared `out`.
 *
 * **IT EXISTS BECAUSE NOTHING ELSE REACHED THE INBOUND PATH.** Review round 2, Important 4: across
 * all twelve declared blocks of the four parity circuits there are **38 boundary nodes, 34 of them
 * unconstrained and 4 `LAST_SEPARATE`, and ZERO `FIRST_SEPARATE`** - and every other fixture here
 * passes `external: []`, so no fixture produced a non-rail boundary node at all. Both
 * `boundaryNodeOf`'s `FIRST_SEPARATE` arm and `edgesForNet`'s *"the boundary terminal goes FIRST"*
 * branch - the one that decides whether an inbound net's edges run with the flow - had never
 * executed anywhere.
 *
 * `blockCircuit`'s `external` option gives each named net a resistor in a PEER block, so the net
 * leaves block `B` and `labelledNets` labels it, which is what puts it in `g.external`.
 */
export function inboundAndOutboundBlock(): BlockSubgraph {
  return autoBlock([res("R_IN", "IN", "MID"), res("R_OUT", "MID", "OUT")], ["IN", "OUT"])
}
