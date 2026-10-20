/**
 * Schematic authoring declaration for `../lab-board.ts`'s `transistorPreampLab()`.
 *
 * Written for Task 9 of the M1 schematic-authoring plan; `docs/known-gaps.md` **G99** is the
 * criterion. This is the circuit with the least residue and the most declared blocks: all 32 of
 * its components declare a symbol in the model, through the shared constructors in `../parts.ts`,
 * so `symbolForKind` is consulted for none of them.
 *
 * **THE SEVEN BLOCKS COME FROM `LEGS`, WHICH `../lab-board.ts` ALREADY DECLARES.** Plan decision
 * **D1** names `LEGS` as one of the four declaration sources a block may come from (*"from
 * `include()`, `OWNERSHIP`/`partitionReference()`, `LEGS` and `allStandIns()` and from nothing an
 * agent chose"*), so the six leg blocks are BUILT FROM that exported constant rather than
 * transcribed from it: a leg that gains a floor resistor moves into its own block without this
 * file being edited. The seventh block is the complement - every component no declared leg claims
 * - which is derived from the same constant rather than listed.
 *
 * **ONE MEMBERSHIP IS WORTH NAMING BECAUSE IT LOOKS WRONG AND IS NOT.** `emitter_bypass_cap` sits
 * electrically inside the emitter-bypass leg (EMITTER -> jumper -> BYPASS_JUMPED -> cap ->
 * BYPASS_CAP -> trim -> GND) and is declared OUTSIDE `LEGS`, because `Leg` has slots for a
 * jumper, a floor resistor and a trim-pot and not for a capacitor. It therefore lands in the
 * complement block, and `BYPASS_JUMPED` and `BYPASS_CAP` become interface ports of both blocks.
 * That is what the circuit declares, and following the declaration rather than the electricity is
 * D1's point: the alternative is this file choosing a cut.
 */

import { negotiablePort } from "../../../lib/schgen/authoring.ts"
import { DESIGNATORS, LEGS } from "../lab-board.ts"
import type { BlockDeclaration, ComponentOverride, PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"
import type { RailSpec, SheetSpec } from "../../../lib/schgen/ir/types.ts"

const SHEET = "lab"

/**
 * `file` is relative to the GENERATOR'S output directory. The authored, hand-arranged
 * `circuits/transistor-preamp/lab-board.kicad_sch` is a different artifact that spec §2's
 * derivation chain marks *"AUTHORED - never regenerated, never overwritten"*, and nothing here
 * writes into the circuit directory.
 */
const SHEETS: readonly SheetSpec[] = [
  { id: SHEET, title: "Transistor preamp lab board", file: "transistor-preamp-lab.kicad_sch", paper: "A3", notes: [] },
]

/**
 * `VCC` and `GND`. **Neither is forced by a `power_in` pin here** - this circuit has no active
 * device with a power pin, since the 2N3904's terminals are all signal and every other part is a
 * passive, a jumper or a header - so unlike `pt2399-core` these are declared because they ARE the
 * board's rails and not because a validation rule insists. `../lab-board.ts` wires VCC to a
 * two-pin power header and GND to the same header and to seven other parts.
 *
 * `pwrFlag` is null for the reason `circuits/opamp-buffer.schematic.ts` gives.
 */
const RAILS: readonly RailSpec[] = [
  { net: "VCC", symbol: "power:VCC", kind: "supply", pwrFlag: null },
  { net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: null },
]

/**
 * Per net, which way it crosses the board's edge - G99's fifth invention, declared.
 *
 * `BASE`, `EMITTER` and `COLLECTOR` are `bidirectional`, and that is the honest reading rather
 * than a shrug. `../lab-board.ts` declares them ports for a stated reason - *"BASE, EMITTER and
 * COLLECTOR are also ports, which keeps those canonical net names when a fitted jumper merges a
 * leg's internal net into them"* - and the thing that physically leaves the board at each of them
 * is a probe or a clip on a test point. A probe neither drives nor is driven, so neither `in` nor
 * `out` says anything true about it; `bidirectional` is the arrow that asserts nothing.
 */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  IN_EXT: "in",
  OUT: "out",
  VCC: "in",
  GND: "bidirectional",
  BASE: "bidirectional",
  EMITTER: "bidirectional",
  COLLECTOR: "bidirectional",
}

const CONTEXT = { portDirections: PORT_DIRECTIONS, rails: RAILS }

/** The component ids of one declared leg, in the order `addLeg` adds them. */
function legMembers(leg: (typeof LEGS)[keyof typeof LEGS]): readonly string[] {
  const ids: string[] = []
  if (leg.jumperId !== undefined) ids.push(leg.jumperId)
  if (leg.floor !== undefined) ids.push(leg.floor.id)
  ids.push(leg.trimId)
  return ids
}

/** Block id and title per declared leg, with the nets its declaration makes cross the boundary. */
const LEG_BLOCKS: readonly { readonly leg: keyof typeof LEGS; readonly id: string; readonly title: string; readonly interface: readonly string[] }[] = [
  { leg: "upper", id: "tp-leg-upper", title: "Upper bias leg", interface: ["VCC", "BASE"] },
  { leg: "feedback", id: "tp-leg-feedback", title: "Collector-feedback bias leg", interface: ["COLLECTOR", "BASE"] },
  { leg: "lowerA", id: "tp-leg-lower-a", title: "Lower bias leg A", interface: ["BASE", "GND"] },
  { leg: "lowerB", id: "tp-leg-lower-b", title: "Lower bias leg B", interface: ["BASE", "GND"] },
  { leg: "collector", id: "tp-leg-collector", title: "Collector load leg", interface: ["VCC", "COLLECTOR"] },
  {
    leg: "emitterBypass",
    id: "tp-leg-emitter-bypass",
    title: "Emitter AC bypass leg",
    // BYPASS_JUMPED and BYPASS_CAP leave because emitter_bypass_cap sits between them and is
    // declared outside LEGS - see the header.
    interface: ["EMITTER", "BYPASS_JUMPED", "BYPASS_CAP", "GND"],
  },
]

const LEG_IDS: readonly string[] = LEG_BLOCKS.flatMap((b) => legMembers(LEGS[b.leg]))

const STAGE_MEMBERS: readonly string[] = Object.keys(DESIGNATORS).filter((id) => !LEG_IDS.includes(id))

const BLOCKS: readonly BlockDeclaration[] = [
  ...LEG_BLOCKS.map((b): BlockDeclaration => ({
    id: b.id,
    sheet: SHEET,
    title: b.title,
    members: legMembers(LEGS[b.leg]),
    rendering: { kind: "auto" },
    anchor: null,
    interface: b.interface.map((net) => negotiablePort(net, CONTEXT)),
    prefixes: { prefixes: [], why: null },
  })),
  {
    id: "tp-stage",
    sheet: SHEET,
    title: "Common-emitter stage, coupling, headers and test points",
    members: STAGE_MEMBERS,
    rendering: { kind: "auto" },
    anchor: null,
    interface: [
      negotiablePort("IN_EXT", CONTEXT),
      negotiablePort("OUT", CONTEXT),
      negotiablePort("VCC", CONTEXT),
      negotiablePort("GND", CONTEXT),
      negotiablePort("BASE", CONTEXT),
      negotiablePort("EMITTER", CONTEXT),
      negotiablePort("COLLECTOR", CONTEXT),
      negotiablePort("BYPASS_JUMPED", CONTEXT),
      negotiablePort("BYPASS_CAP", CONTEXT),
    ],
    prefixes: { prefixes: [], why: null },
  },
]

/**
 * TEN OVERRIDES, ALL OF THEM PIN SIDES, NONE OF THEM A CORRECTION.
 *
 * Every component here declares its own symbol and names its own pins by number, so neither
 * `symbolForKind` nor a pin map is consulted. What refuses is `pinSidesFor`: a
 * `Connector_Generic:Conn_01x02` puts both pins at angle 0 and a `Connector:TestPoint` has a
 * single pin at angle 90, so each gives fewer than two distinct sides. **In both cases the symbol
 * is one-sided and correct rather than ambiguous** - a two-way header's pins do both leave the
 * left edge, and a test point has one pin and nothing to partition - so these restate the
 * geometry. `docs/known-gaps.md` **G155** records the cost: ten of this circuit's thirty-two
 * components carry an override whose content is the symbol's own geometry, and the open question
 * is whether the two-sides rule should exempt a symbol with no second side to have.
 */
const HEADER_OVERRIDE: ComponentOverride = {
  pinSides: { "1": "left", "2": "left" },
  why:
    "Connector_Generic:Conn_01x02's two pins both sit at angle 0, so pinSidesFor refuses the " +
    "one-sided symbol. These are the symbol's own sides restated, not a partition chosen here " +
    "(G155); the symbol and the pin numbering both come from circuits/transistor-preamp/parts.ts.",
}

const TEST_POINT_OVERRIDE: ComponentOverride = {
  pinSides: { "1": "bottom" },
  why:
    "Connector:TestPoint has ONE pin, at angle 90, so pinSidesFor refuses it for giving fewer " +
    "than two distinct sides - but a one-pin symbol has no partition to get wrong, which is the " +
    "case G155 asks about. \"bottom\" is that pin's own side, read off the symbol.",
}

const HEADERS: readonly string[] = ["input_header", "output_header", "power_header"]

const TEST_POINTS: readonly string[] = [
  "vcc_test_point",
  "base_test_point",
  "emitter_test_point",
  "collector_test_point",
  "ground_test_point",
  "input_test_point",
  "output_test_point",
]

const OVERRIDES: SchematicAuthoring["overrides"] = {
  ...Object.fromEntries(HEADERS.map((id) => [id, HEADER_OVERRIDE])),
  ...Object.fromEntries(TEST_POINTS.map((id) => [id, TEST_POINT_OVERRIDE])),
}

export const TRANSISTOR_PREAMP_SCHEMATIC: SchematicAuthoring = {
  project: "transistor-preamp-lab",
  designators: DESIGNATORS,
  blocks: BLOCKS,
  sheets: SHEETS,
  rails: RAILS,
  portDirections: PORT_DIRECTIONS,
  overrides: OVERRIDES,
  declared: {
    source:
      "docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md, the authority " +
      "circuits/transistor-preamp/lab-board.ts names for every part, with the bench sequence in " +
      "docs/transistor-preamp/microphone-preamp-feedback-lab.md. Values are bench starting " +
      "points, not design targets",
    bom: {
      kind: "unsourced",
      why:
        "boards/transistor-preamp-lab/ has no bom.json (two of the eleven boards do), and the " +
        "two that exist are keyed by BOARD LINE - a \"<kind> <value> <footprint>\" string " +
        "resolving to a parts/*.json catalog id - with nothing joining a line to a circuit " +
        "model's component. The model carries mpn on two of this circuit's parts (RM-065 " +
        "trimmers, 2N3904) and Manufacturer, Supplier and SupplierPart have no slot in it at " +
        "all. The four keys are empty BY DECLARATION rather than invented; the IR's own " +
        "bomFields rule then refuses every non-exempt part by name, and note that the seven " +
        "test points are exempt already because BOM_EXEMPT_PREFIXES covers TP.",
    },
  },
}
