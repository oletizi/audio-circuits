/**
 * Schematic authoring declaration for `./opamp-buffer.ts`.
 *
 * Written for Task 9 of the M1 schematic-authoring plan. It holds exactly what a layout backend
 * needs and the circuit model has no slot for: reference designators, blocks with their §1.9
 * interfaces, sheets, rails, port directions, and the per-component overrides where neither the
 * model nor a reviewed rule answers. `docs/known-gaps.md` **G99** is the criterion.
 *
 * **WHY THIS FILE SITS AT THE TOP LEVEL OF `circuits/` BESIDE `opamp-buffer.ts`, AGAINST
 * `CLAUDE.md`'s "every circuit owns a directory".** `circuits/opamp-buffer.ts` is the standing
 * exception and predates this task; moving it into a directory would change the import depth of
 * every module that reads it, which `CLAUDE.md` warns shows up as a confusing type error at an
 * untouched line, and it is not this task's work. Task 9's brief names this path, so this file
 * follows it rather than extending or fixing the exception. The tension - **should
 * `opamp-buffer` become a directory like the other four circuits?** - is an owner-facing
 * question recorded in `docs/known-gaps.md` **G154** (controller ruling **R20**).
 *
 * **DESIGNATORS ARE AUTHORED HERE AND ARE NOT `SOURCE_PART_NAMES`.** `opamp-buffer.ts` exports
 * `SOURCE_PART_NAMES` (C_IN, R_BIAS, U, …), which is *"the source module's part name"* kept so the
 * transcription can be checked - a third vocabulary, and the module says in so many words that
 * *"the module had no reference designators of its own"*. Reusing it as a designator map would
 * quietly turn a provenance record into a KiCad identity. These are KiCad designators, numbered
 * in the circuit's own declaration order.
 */

import { negotiablePort } from "../lib/schgen/authoring.ts"
import type { BlockDeclaration, PortDirection, SchematicAuthoring } from "../lib/schgen/authoring.ts"
import type { RailSpec, SheetSpec } from "../lib/schgen/ir/types.ts"

const SHEET = "buffer"

const SHEETS: readonly SheetSpec[] = [
  { id: SHEET, title: "Unity-gain op-amp buffer", file: "opamp-buffer.kicad_sch", paper: "A4", notes: [] },
]

/**
 * **THE RAIL GLYPHS, AND WHY THESE THREE.** `opamp-buffer.ts` establishes from the wiring that
 * this is *"A GENUINE BIPOLAR SUPPLY"* - three distinct nets on three terminals of J_PWR, VEE
 * reached by nothing but that pin, its own decoupling capacitor and the op-amp's V- - and records
 * that the source module's header said *"+15V typical"* / *"-15V typical"*. So VCC and VEE are
 * both supplies and are drawn with the `+15V` and `-15V` glyphs; `RailSpec`'s own contract is that
 * the symbol is the glyph and *"its Value becomes `net`"*, so the drawing will read VCC and VEE.
 *
 * `pwrFlag` is null on all three. A PWR_FLAG exists to stop KiCad's ERC complaining about a rail
 * driven only by passive pins, and nothing in this task runs ERC or emits a drawing for it to run
 * on; the first task that does will have to decide which sheet carries one. Declaring a sheet for
 * it now would be declaring a thing nobody has checked.
 */
const RAILS: readonly RailSpec[] = [
  { net: "VCC", symbol: "power:+15V", kind: "supply", pwrFlag: null },
  { net: "VEE", symbol: "power:-15V", kind: "supply", pwrFlag: null },
  { net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: null },
]

/**
 * Per net, which way it crosses the boundary - G99's fifth invention, declared.
 *
 * `IN_EXT` and `OUT` are the audio in and out. `VCC` and `VEE` are power entering the module
 * through J_PWR. `GND` is `bidirectional`: it is the return for both rails and for the signal, so
 * it is neither a source nor a sink at this boundary, and calling it either would draw an arrow
 * that asserts something the circuit does not.
 */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  IN_EXT: "in",
  OUT: "out",
  VCC: "in",
  VEE: "in",
  GND: "bidirectional",
}

const CONTEXT = { portDirections: PORT_DIRECTIONS, rails: RAILS }

/**
 * ONE BLOCK, and that is what the circuit declares rather than a choice made here.
 * `opamp-buffer.ts` uses no `include()`, declares no `OWNERSHIP`, no `LEGS` and no stand-ins, so
 * there is no partition in the model to follow and the whole circuit is one block. `prefixes` is
 * therefore empty, which is itself checked: no member may carry a prefix another block declares.
 *
 * `{ kind: "auto" }` and no anchor: no template is declared, because declaring one would be
 * choosing an arrangement and this task has no criterion for that choice. `docs/known-gaps.md`
 * **G141** records the consequence - an `auto` block carries no anchor, so the four anchor-driven
 * templates can never apply to it and it reaches the ELK backend if the other four decline.
 */
const BLOCKS: readonly BlockDeclaration[] = [
  {
    id: "ob-buffer",
    sheet: SHEET,
    title: "Unity-gain buffer",
    members: [
      "input_coupling_cap",
      "input_bias_resistor",
      "buffer_amp",
      "output_coupling_cap",
      "vcc_decoupling_cap",
      "vee_decoupling_cap",
      "input_terminal",
      "output_terminal",
      "power_terminal",
    ],
    rendering: { kind: "auto" },
    anchor: null,
    // Every net of the circuit that `opamp-buffer.ts` declares a port for. With one block holding
    // every component, no net reaches a non-member, so these five cross the boundary because the
    // model says they leave the module - not because of where any pin happens to be.
    interface: [
      negotiablePort("IN_EXT", CONTEXT),
      negotiablePort("OUT", CONTEXT),
      negotiablePort("VCC", CONTEXT),
      negotiablePort("VEE", CONTEXT),
      negotiablePort("GND", CONTEXT),
    ],
    prefixes: { prefixes: [], why: null },
  },
]

/**
 * The three screw terminals, which are the whole of this circuit's residue.
 *
 * `symbolForKind` refuses `connector` because a connector's symbol carries its way count and the
 * way count is a property of the part; the model declares neither symbol nor pin numbering for
 * these, only a `pinrow2`/`pinrow3` footprint and the pin names P1/P2/P3. So three things are
 * declared per terminal and each is a separate claim:
 *
 * - the **symbol**, chosen by way count against the footprint the model already declares -
 *   `pinrow2` is two ways and `pinrow3` is three;
 * - the **pin numbering**, P1/P2/P3 onto 1/2/3, which is the order `opamp-buffer.ts` writes them
 *   in and the order a 1xN header's pads are numbered in;
 * - the **pin sides**, because `Connector_Generic:Conn_01xNN` puts every pin at angle 0 and
 *   `pinSidesFor` refuses a symbol that gives fewer than two distinct sides. **Here the symbol is
 *   not ambiguous, it is one-sided and correct** - a single-row header's pins really do all leave
 *   the left edge of its glyph - so this override restates the geometry rather than correcting it.
 *   That cost is recorded in `docs/known-gaps.md` **G155**, which asks whether the two-sides rule
 *   should exempt a symbol with no second side to have.
 */
const OVERRIDES: SchematicAuthoring["overrides"] = {
  input_terminal: {
    symbol: "Connector_Generic:Conn_01x02",
    symbolPins: { MAIN: { P1: "1", P2: "2" } },
    pinSides: { "1": "left", "2": "left" },
    why:
      "a two-way screw terminal: opamp-buffer.ts declares footprint pinrow2 and pins P1/P2 and " +
      "no symbol, and symbolForKind refuses `connector` because the way count is a part fact. " +
      "Conn_01x02's two pins both sit at angle 0, so pinSidesFor refuses the one-sided symbol " +
      "and the sides are stated; they are the symbol's own geometry (G155).",
  },
  output_terminal: {
    symbol: "Connector_Generic:Conn_01x02",
    symbolPins: { MAIN: { P1: "1", P2: "2" } },
    pinSides: { "1": "left", "2": "left" },
    why:
      "a two-way screw terminal, as input_terminal: footprint pinrow2, pins P1/P2, no symbol in " +
      "the model, and a one-sided Conn_01x02 glyph whose sides are stated (G155).",
  },
  power_terminal: {
    symbol: "Connector_Generic:Conn_01x03",
    symbolPins: { MAIN: { P1: "1", P2: "2", P3: "3" } },
    pinSides: { "1": "left", "2": "left", "3": "left" },
    why:
      "a THREE-way screw terminal - opamp-buffer.ts declares footprint pinrow3 and pins " +
      "P1/P2/P3 on VCC, GND and VEE, which is the bipolar supply its header establishes from the " +
      "wiring. Conn_01x03 is the three-way glyph; its pins are one-sided and stated (G155).",
  },
}

export const OPAMP_BUFFER_SCHEMATIC: SchematicAuthoring = {
  project: "opamp-buffer",
  designators: {
    input_coupling_cap: "C1",
    input_bias_resistor: "R1",
    buffer_amp: "U1",
    output_coupling_cap: "C2",
    vcc_decoupling_cap: "C3",
    vee_decoupling_cap: "C4",
    input_terminal: "J1",
    output_terminal: "J2",
    power_terminal: "J3",
  },
  blocks: BLOCKS,
  sheets: SHEETS,
  rails: RAILS,
  portDirections: PORT_DIRECTIONS,
  overrides: OVERRIDES,
  declared: {
    source:
      "circuits/opamp-buffer.ts, which transcribes modules/opamp-buffer/OpampBuffer.tsx (git " +
      "history at 6c5ad0a) and is the authority for every component, value and connection",
    bom: {
      kind: "unsourced",
      why:
        "no component of this circuit has purchasing data anywhere in this repository. BomFields " +
        "wants Manufacturer, MPN, Supplier and SupplierPart; the model has a slot for mpn alone " +
        "and this circuit sets it only on the TL072. The repository's supplier evidence lives in " +
        "parts/*.json keyed by orderable part and is joined to a BOARD by " +
        "boards/<board>/bom.json; there is no board for this circuit and no reviewed rule joins " +
        "either to a circuit model's component. Writing plausible manufacturers here would be " +
        "fabricated purchasing data, which is worse than none because it looks orderable, so the " +
        "four keys are empty BY DECLARATION and the IR's own bomFields rule refuses every " +
        "non-exempt part by name the moment this circuit is validated.",
    },
  },
}
