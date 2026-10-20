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
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts"
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

/**
 * A FIVE-PIN PART WITH PINS ON ALL FOUR SIDES, at a rotation the fixture states.
 *
 * **IT STANDS IN FOR THE BRIEF's `bjtSubgraph()`, AND THE SUBSTITUTION IS A BETTER SUBJECT.** The
 * brief asks for a BJT because the pedals fixture library has one; `tests/schgen/__fixtures__/
 * symbols/Fix.kicad_sym` does not, and inventing a symbol for a test would be a second symbol
 * library. `Fix:REG3` has pins at angles 0, 0, 90, 270 and 180 - **IN, EN, GND, NR and OUT, on all
 * four edges** - so a rotation moves every one of them and a transform that swapped a pin's identity
 * for its neighbour's is visible rather than hidden by symmetry. A two-pin passive could not show
 * that at all: swapping a resistor's two pins is indistinguishable from turning it 180.
 *
 * The brief's test is *"a mirrored symbol keeps its pin identity: the transform moves geometry,
 * never assignment"* (spec §1.5), and this is the part that can fail it.
 */
export function regulatorBlock(rot: Rotation | null): BlockSubgraph {
  const part: PartSpec = {
    label: "U_REG",
    refPrefix: "U",
    libId: "Fix:REG3",
    units: [1],
    value: "REG3",
    footprint: "F",
    bom: TEST_BOM,
    dnp: false,
    checklist: [],
    source: "fixture",
    pinTable: null,
    pins: {
      "1": { net: "3V3", identity: "IN" },
      "2": { net: "IN", identity: "EN" },
      "3": { net: "GND", identity: "GND" },
      "4": { net: "MID", identity: "NR" },
      "5": { net: "OUT", identity: "OUT" },
    },
    mechanicalPads: [],
    ncUnlisted: null,
  }
  // `MID` needs a second pin or the IR's own `singlePinNets` rule refuses the circuit.
  const load = res("R_LOAD", "MID", "GND")
  return autoBlock([part, load], ["IN", "OUT"], new Map<PartLabel, Rotation | null>([["U_REG", rot], ["R_LOAD", null]]))
}

/** Two resistors in series from `3V3` to `GND`: the smallest block a divider template is about. */
export function dividerSubgraph(): BlockSubgraph {
  return autoBlock([res("R_TOP", "3V3", "MID"), res("R_BOT", "MID", "GND")])
}

/**
 * A SELF-LOOP ON ONE UNIT, WITH A HORIZONTALLY-DRAWN LATERAL HANGING OFF THE SAME NET - the shape
 * `docs/known-gaps.md` **G94** measured as necessary for `elkjs`'s hitbox crash, for Task 14's
 * `selfLoops`/`diagnoseRaise` tests to find structurally (never to make `elkjs` raise - ruling
 * **R30** forbids hand-building a graph for that, and this is not one: it is an ordinary subgraph,
 * built the same way every other fixture here is).
 *
 * **WHY `Fix:REG3` AND NOT A TWO-PIN PASSIVE.** `selfLoops` needs one unit with two of its OWN
 * pins on one net; a two-terminal part's two pins ARE its only two pins, so tying them together
 * would leave nothing else connected and the IR's own single-pin-net rule would have something to
 * say about every other net this part touches. `Fix:REG3` (`regulatorBlock`'s part, above) has
 * five, so pins `2` and `5` can share one net (`LOOP`) while `1`, `3` and `4` keep the part
 * genuinely multi-net, the same shape `regulatorBlock` already relies on for `MID`.
 *
 * **`R_LATERAL` is drawn horizontally by construction, not by discovery.** `Fix:R` puts pin 1 at
 * angle 270 and pin 2 at angle 90, which `pinSide`/`sideOfPin` read as top/bottom at rotation 0 and
 * as left/right at rotation 90 (`render/geometry.ts`'s `SIDE_OF_ANGLE`) - the same arithmetic
 * `groundedPinOneBlock` above already depends on for its own rotation. Rotation 90 is declared on
 * `R_LATERAL` for exactly that reason.
 */
export function selfLoopBlock(): BlockSubgraph {
  const part: PartSpec = {
    label: "U_LOOP",
    refPrefix: "U",
    libId: "Fix:REG3",
    units: [1],
    value: "REG3",
    footprint: "F",
    bom: TEST_BOM,
    dnp: false,
    checklist: [],
    source: "fixture",
    pinTable: null,
    pins: {
      "1": { net: "3V3", identity: "IN" },
      "2": { net: "LOOP", identity: "EN" },
      "3": { net: "GND", identity: "GND" },
      "4": { net: "MID", identity: "NR" },
      // Pin 5 shares net LOOP with pin 2: two of this unit's own pins on one net, the self-loop.
      "5": { net: "LOOP", identity: "OUT" },
    },
    mechanicalPads: [],
    ncUnlisted: null,
  }
  // MID needs a second pin, same as regulatorBlock's, or the IR's singlePinNets rule refuses.
  const load = res("R_LOAD", "MID", "GND")
  // Hangs off LOOP, drawn horizontally at rotation 90 - G94's "lateral."
  const lateral = res("R_LATERAL", "LOOP", "3V3")
  return autoBlock(
    [part, load, lateral],
    [],
    new Map<PartLabel, Rotation | null>([
      ["U_LOOP", null],
      ["R_LOAD", null],
      ["R_LATERAL", 90],
    ]),
  )
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
