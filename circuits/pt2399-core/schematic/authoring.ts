/**
 * Schematic authoring declaration for `../pt2399-core.ts`.
 *
 * Written for Task 9 of the M1 schematic-authoring plan; `docs/known-gaps.md` **G99** is the
 * criterion. This circuit is the one G99 names in its sharpest finding: the ELK spike split the
 * *"16-pin PT2399 … first half in, second half out"* and the entry calls that partition *"no
 * basis in the model at all"*.
 *
 * **IT NOW HAS A BASIS, AND THE BASIS IS NOT THIS FILE.** `Audio:PT2399` as installed puts pins
 * 1-8 at angle 0 and pins 9-16 at angle 180, so `pinSidesFor` reads eight on the left and eight
 * on the right off the symbol's own geometry and this file declares nothing about them. The split
 * the spike guessed happens to agree with the library - which is exactly why a guess that agrees
 * is not evidence that it was derived.
 *
 * **THE DESIGNATORS ARE THE BUILT UNIT'S OWN**, imported from `../pt2399-core.ts`'s `DESIGNATORS`
 * rather than restated. That map exists because this circuit was transcribed from the netlist of a
 * unit that was built and works, and its reference designators are a fact about that schematic;
 * copying them here would create a second copy to drift.
 */

import { negotiablePort } from "../../../lib/schgen/authoring.ts"
import { DESIGNATORS } from "../pt2399-core.ts"
import type { BlockDeclaration, PortDirection, SchematicAuthoring } from "../../../lib/schgen/authoring.ts"
import type { RailSpec, SheetSpec } from "../../../lib/schgen/ir/types.ts"

const SHEET = "core"

/**
 * **`file` IS THE SHEET ID AND NOT THE PROJECT NAME, AND THAT IS A DERIVED FACT RATHER THAN A
 * PREFERENCE.** `tools/schgen/generated-files.ts:98` emits the hierarchical ROOT schematic as
 * `${project}.kicad_sch` and then adds one file per sheet; `add` refuses a repeated name. This
 * sheet's file was `pt2399-core.kicad_sch` until 2026-10-24 - the project name - so generation
 * threw *"generate: two generated files are named pt2399-core.kicad_sch"* before it wrote
 * anything.
 *
 * **THE COLLISION WAS INVISIBLE UNTIL THIS CIRCUIT PASSED VALIDATION, which is `docs/known-gaps.md`
 * G274's phenomenon one layer further in**, and it is not this circuit's alone: all twelve of the
 * repository's other declared designs name their sole sheet after their project in the same way.
 * **G284** is the census and the criterion; only this one is fixed here, by the task that reached
 * it.
 *
 * It also means no generated file can ever be confused with `../pt2399-core.kicad_sch`, the
 * AUTHORED schematic this circuit was transcribed from.
 */
const SHEETS: readonly SheetSpec[] = [
  { id: SHEET, title: "PT2399 delay core", file: `${SHEET}.kicad_sch`, paper: "A4", notes: [] },
]

/**
 * `+5V` and `GND`, which the PT2399 symbol forces rather than this file choosing: pins 1 (VCC),
 * 3 (AGND) and 4 (DGND) of `Audio:PT2399` are `power_in`, and the IR's `pinSemantics` rule
 * refuses a `power_in` pin on a net that is not a declared rail.
 *
 * `pwrFlag` is null for the reason given in `circuits/opamp-buffer.schematic.ts`: a PWR_FLAG is
 * an ERC construct and nothing in this task runs ERC.
 */
const RAILS: readonly RailSpec[] = [
  { net: "+5V", symbol: "power:+5V", kind: "supply", pwrFlag: null },
  { net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: null },
]

/**
 * Per net, which way it crosses the board's edge - G99's fifth invention, declared.
 *
 * Every one of these is a pin of J1, the five-pin power-and-signal header, and there are no
 * others. `VCO` is `in` because PT2399 pin 6 is the delay-time control node and the header brings
 * an external control voltage to it; `GND` is `bidirectional` for the reason
 * `circuits/opamp-buffer.schematic.ts` gives.
 *
 * **THERE WAS A SIXTH ENTRY UNTIL 2026-10-24 - `unconnected-(U1-CLK_O-Pad5)`, declared `out` -
 * AND IT IS GONE WITH THE PORT IT EXISTED FOR.** That net was KiCad's placeholder for U1 pin 5,
 * which is unused; `../pt2399-core.ts` now declares the pin `NC` instead of carrying the
 * placeholder, so no pin of this network is on such a net and `authoringProblems` would refuse a
 * direction for it (*"portDirections names net X, which no pin of this network is on"*). The
 * entry's own comment argued that `out` was narrower than it looked because it said only which way
 * CLK_O WOULD drive - a careful reading of a direction for a net that should never have existed.
 */
const PORT_DIRECTIONS: Readonly<Record<string, PortDirection>> = {
  "+5V": "in",
  GND: "bidirectional",
  VCO: "in",
  OUTPUT: "out",
  INPUT: "in",
}

const CONTEXT = { portDirections: PORT_DIRECTIONS, rails: RAILS }

/**
 * ONE BLOCK, because that is what the circuit declares. `../pt2399-core.ts` is a flat
 * transcription of one board's netlist: no `include()`, no `OWNERSHIP`, no `LEGS`, no stand-ins.
 * `prefixes` is therefore empty.
 *
 * `{ kind: "auto" }`: no template is declared, for the reason
 * `circuits/opamp-buffer.schematic.ts` gives. Plan decision **D3** notes that this circuit's
 * 16-pin IC is why the `bus` rendering was ported at all; declaring `bus` here would mean
 * authoring bus GROUPS - exact net names, never patterns - for nineteen non-rail nets, which is
 * choosing a grouping this task has no criterion for. It is left for the task that draws this
 * circuit and can look at the result.
 */
const BLOCKS: readonly BlockDeclaration[] = [
  {
    id: "pt-core",
    sheet: SHEET,
    title: "PT2399 delay core",
    members: Object.keys(DESIGNATORS),
    rendering: { kind: "auto" },
    anchor: null,
    interface: [
      negotiablePort("+5V", CONTEXT),
      negotiablePort("GND", CONTEXT),
      negotiablePort("INPUT", CONTEXT),
      negotiablePort("OUTPUT", CONTEXT),
      negotiablePort("VCO", CONTEXT),
    ],
    prefixes: { prefixes: [], why: null },
  },
]

/**
 * NO OVERRIDES. Every component of this circuit resolves its symbol from the model or from the
 * by-kind rule, and every pin number from the model's own names or a reviewed rule.
 *
 * **IT CARRIED ONE UNTIL THE TASK 9 REVIEW, and what it carried is worth knowing was wrong.**
 * `power_signal_header` had a `pinSides` declaration naming all five pins of
 * `Connector_Generic:Conn_01x05` "left", because `pinSidesFor` used to refuse a symbol giving
 * fewer than two distinct sides. All five agreed with `sideOfPin(0, pin)`, so the declaration
 * stated what the library already said; the refusal is deleted and the declaration with it.
 * `docs/known-gaps.md` **G155** carries the measurement.
 */
const OVERRIDES: SchematicAuthoring["overrides"] = {}

export const PT2399_CORE_SCHEMATIC: SchematicAuthoring = {
  project: "pt2399-core",
  designators: DESIGNATORS,
  blocks: BLOCKS,
  sheets: SHEETS,
  rails: RAILS,
  portDirections: PORT_DIRECTIONS,
  overrides: OVERRIDES,
  declared: {
    source:
      "tests/fixtures/pt2399-core-veroroute.net, the EESchema legacy netlist of a built and " +
      "working unit, with footprints from tests/fixtures/pt2399-core.net - the authority " +
      "circuits/pt2399-core/pt2399-core.ts names for every component, value and connection",
    bom: {
      kind: "unsourced",
      why:
        "boards/pt2399-core/bom.json exists and is the only BOM in this repository for this " +
        "circuit, but it is keyed by BOARD LINE - a \"<kind> <value> <footprint>\" string, one " +
        "entry in the version committed - and resolves to a parts/*.json catalog id. Nothing " +
        "joins a board line to a circuit model's component, so a per-component Manufacturer, " +
        "Supplier and SupplierPart cannot be derived from it and would have to be invented. The " +
        "four keys are empty BY DECLARATION; the IR's own bomFields rule, through " +
        "validateSourcing, names every non-exempt part for any consumer that has to source and " +
        "place them. It does not gate a drawing: Task 20 and docs/known-gaps.md G245.",
    },
  },
}
