/**
 * Fixtures shared by `tests/schgen/elk/`'s three test files.
 *
 * Hand-written for Task 12 of the M1 schematic-authoring plan. Everything here is built from the
 * ported block fixtures in `tests/schgen/__fixtures__/circuits.ts` - `blockCircuit`, `res`, `cap`
 * and the `Fix:`/`Pwr:` symbol libraries - so the ELK graph is measured over the same subgraphs
 * the ported template tests measure over, rather than over a graph written to suit it.
 */

import { blockCircuit, RAILS, res, symbols } from "../__fixtures__/circuits.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import type { BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { PartSpec, RailSpec } from "../../../lib/schgen/ir/types.ts"
import type { PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"

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
 * A `SchematicAuthoring` carrying nothing but what `elkInputOf` reads - `portDirections` and
 * `rails` - with every other field at its empty value.
 *
 * It is a test fixture and says so: the real declarations are the four in `circuits/`, and
 * `tests/schgen/authoring-complete.test.ts` is what holds those to G99's criterion. Nothing here
 * is a default the production path could reach.
 */
export function fixtureAuthoring(
  portDirections: Readonly<Record<string, PortDirection>> = FIXTURE_DIRECTIONS,
  rails: readonly RailSpec[] = RAILS,
): SchematicAuthoring {
  return {
    project: "elk-fixture",
    designators: {},
    blocks: [],
    sheets: [],
    rails,
    portDirections,
    overrides: {},
    declared: { source: "tests/schgen/elk/fixtures.ts", bom: { kind: "unsourced", why: "a fixture" } },
  }
}

/** The subgraph of block `B` of a circuit holding exactly `parts`, rendered `auto`. */
export function autoBlock(parts: PartSpec[], external: readonly string[] = []): BlockSubgraph {
  return subgraphOf(blockCircuit(parts, { kind: "auto" }, { external: [...external] }), "B", symbols)
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
