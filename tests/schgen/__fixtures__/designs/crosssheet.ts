/**
 * THE THREE CROSS-SHEET FIXTURES, EACH AS THE SAME CIRCUIT ON ONE SHEET AND ON SEVERAL.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan. The test is the spec reviewer's,
 * adopted as written (spec §1.6): *"generate the same network as one sheet and as multiple sheets,
 * export both through `kicad-cli`, and verify identical net membership."* Its three required cases
 * are the spec's, each with the reason the spec gives:
 *
 * - **a shared rail** - the case a power symbol exists for;
 * - **a signal crossing more than two sheets** - *"a two-sheet test cannot distinguish a working
 *   mechanism from one that happens to pair up"*;
 * - **a repeated block** - *"two instances of one function must not merge through a cross-sheet
 *   name collision, which is the failure a prefixed net scheme exists to prevent."*
 *
 * **WHAT VARIES BETWEEN THE TWO SIDES OF A PAIR IS THE SHEET ASSIGNMENT AND NOTHING ELSE.** Each
 * fixture declares ONE parts list and ONE block list; `oneSheet` rewrites every block's `sheet` to
 * a single sheet and `manySheets` keeps the declared assignment. Nothing about the electrical model
 * differs, which is the whole point of the comparison: spec §1.6 records that *"sheets cannot alter
 * the electrical partition"*, and a pair that differed in a part or a net would be measuring
 * something else.
 *
 * **EVERY BLOCK IS `rail-row`, AND THAT IS A CHOICE ABOUT REACHING KiCad RATHER THAN ABOUT
 * LAYOUT.** `rail-row` is the one ported template that draws any set of two-terminal parts sharing
 * a net (`lib/schgen/render/templates/rail-row.ts`), so these fixtures reach a real
 * `.kicad_sch` without depending on the ELK backend - which `docs/known-gaps.md` **G200** records
 * draws only 5 of this repository's 12 declared blocks. The cross-sheet mechanism under test is
 * `anchorsToSymbols`', not any template's.
 *
 * Test code: the BOM fields are the test BOM, and the symbols and footprints are exactly the ones
 * `designs/mini/index.ts` already uses, so the repository's symbol and footprint sweeps resolve
 * them.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { DesignSpec } from "../../../../lib/schgen/design.ts"
import { twoPin, UNNAMED } from "../../../../lib/schgen/ir/author.ts"
import type { BlockSpec, PartSpec, RailSpec, SheetSpec } from "../../../../lib/schgen/ir/types.ts"
import { TEST_BOM } from "../fixture-lib.ts"
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../orientations.ts"

/** The directory a `LoadedDesign` built from these fixtures reports, so `repoRoot` resolves. */
export const CROSS_SHEET_DIR = path.dirname(fileURLToPath(import.meta.url))
export const CROSS_SHEET_FILE = path.join(CROSS_SHEET_DIR, "crosssheet.ts")

const FP_R = "Resistor_SMD:R_0603_1608Metric"
const SOURCE = "schgen cross-sheet fixture"

const R = (label: string, a: string, b: string): PartSpec =>
  twoPin({
    label, refPrefix: "R", libId: "Device:R", value: "10k", footprint: FP_R,
    bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: SOURCE, dnp: false,
  })

const railRowBlock = (id: string, sheet: string, title: string, members: readonly string[]): BlockSpec => ({
  id, sheet, title, members, checklist: [], rendering: { kind: "wired", template: "rail-row", anchor: null },
})

/** A sheet of the many-sheet side. A3 each, which is what `mini`'s busier sheet uses. */
const sheet = (id: string, page: number): SheetSpec => ({
  id, title: `Sheet ${page}`, file: `${id}.kicad_sch`, paper: "A3", notes: [],
})

/**
 * The one sheet of the one-sheet side, on A1.
 *
 * **A1 and not A3, because `packFrames` shelf-packs and the one-sheet side holds every frame.**
 * The packer *"never picks a larger paper; it reports the size it would have needed"*
 * (`lib/schgen/render/pack.ts`), so the one-sheet side declares the paper its frames fit on. The
 * paper is not part of the comparison: a netlist carries no page size.
 */
const ONE: SheetSpec = { id: "all", title: "All", file: "all.kicad_sch", paper: "A1", notes: [] }

export interface CrossSheetFixture {
  readonly name: string
  /** How many sheets the many-sheet side declares. */
  readonly sheets: number
  readonly asOneSheet: DesignSpec
  readonly asManySheets: DesignSpec
}

function designOf(project: string, parts: readonly PartSpec[], blocks: readonly BlockSpec[],
  sheets: readonly SheetSpec[], rails: readonly RailSpec[]): DesignSpec {
  return {
    project,
    outDir: "out",
    circuit: {
      parts: [...parts], blocks: [...blocks], sheets: [...sheets], rails: [...rails],
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    },
    symbolLibs: {},
    footprintLibs: {},
    pinTables: null,
    checklist: null,
    oscar: null,
    ercExclusions: [],
  }
}

/**
 * The pair: the same parts, blocks and rails, with every block moved onto `ONE` for the one-sheet
 * side and every rail's PWR_FLAG moved with it.
 *
 * **THE FLAG SHEET MOVES BECAUSE IT NAMES A SHEET, AND THAT IS NOT A DIFFERENCE IN THE MODEL.**
 * `RailSpec.pwrFlag` is `{ sheet }` and `flagsContent` draws the flag on that sheet only, so a
 * flag declared on a sheet the one-sheet side does not have would simply not be drawn - and a
 * rail with no PWR_FLAG anywhere is an ERC finding, not a netlist one. The PWR_FLAG is a symbol
 * with one pin on the rail; it is in the netlist on both sides, which is why it may move sheets
 * without the partition moving.
 */
function pairOf(name: string, sheets: readonly SheetSpec[], parts: readonly PartSpec[],
  blocks: readonly BlockSpec[], rails: readonly RailSpec[]): CrossSheetFixture {
  const onOne = blocks.map((b): BlockSpec => ({ ...b, sheet: ONE.id }))
  const railsOnOne = rails.map((r): RailSpec => (r.pwrFlag === null ? r : { ...r, pwrFlag: { sheet: ONE.id } }))
  return {
    name,
    sheets: sheets.length,
    asOneSheet: designOf(`${name}-one`, parts, onOne, [ONE], railsOnOne),
    asManySheets: designOf(`${name}-many`, parts, blocks, sheets, rails),
  }
}

const GND: RailSpec = { net: "GND", symbol: "power:GND", kind: "ground", pwrFlag: { sheet: "s1" } }
const V3: RailSpec = { net: "V3", symbol: "power:+3V3", kind: "supply", pwrFlag: { sheet: "s1" } }

/** A shared rail: `GND` and `V3` reach blocks on both sheets, drawn as power symbols. */
export function sharedRail(): CrossSheetFixture {
  const parts = [R("R_A1", "V3", "GND"), R("R_A2", "V3", "GND"), R("R_B1", "V3", "GND"), R("R_B2", "V3", "GND")]
  const blocks = [
    railRowBlock("A", "s1", "Divider A", ["R_A1", "R_A2"]),
    railRowBlock("B", "s2", "Divider B", ["R_B1", "R_B2"]),
  ]
  return pairOf("rail", [sheet("s1", 1), sheet("s2", 2)], parts, blocks, [GND, V3])
}

/**
 * A signal on three sheets: `SIG` has pins in three blocks, one per sheet, so it is a labelled
 * non-rail net and is drawn as a global label on all three.
 */
export function signalAcrossThreeSheets(): CrossSheetFixture {
  const parts = [
    R("R_1", "SIG", "GND"), R("R_2", "SIG", "GND"),
    R("R_3", "SIG", "GND"), R("R_4", "SIG", "GND"),
    R("R_5", "SIG", "GND"), R("R_6", "SIG", "GND"),
  ]
  const blocks = [
    railRowBlock("S1", "s1", "Tap one", ["R_1", "R_2"]),
    railRowBlock("S2", "s2", "Tap two", ["R_3", "R_4"]),
    railRowBlock("S3", "s3", "Tap three", ["R_5", "R_6"]),
  ]
  return pairOf("three", [sheet("s1", 1), sheet("s2", 2), sheet("s3", 3)], parts, blocks, [GND])
}

/**
 * A repeated block: two structurally identical dividers whose internal node is prefixed, so the
 * two instances must stay two nets. The partition is what says so - `A_TAP` and `B_TAP` each with
 * two members, never one net with four.
 *
 * **EACH INSTANCE IS CUT ACROSS TWO BLOCKS, AND THAT IS WHAT MAKES THE CASE TEST WHAT THE SPEC
 * MEANS.** A first version put each instance's two resistors in ONE block, which made `A_TAP`
 * internal to that block: internal nets are not labelled (`labelledNets` in `ir/classify.ts`), so
 * neither tap crossed anything, KiCad named them `Net-(R1-Pad2)` and `Net-(R3-Pad2)` in the
 * export, and the case could not have detected a cross-sheet name collision at all. Splitting the
 * instance makes each tap a labelled net on two sheets, which is the construct the spec's third
 * case is about: *"two instances of one function must not merge through a cross-sheet name
 * collision, which is the failure a prefixed net scheme exists to prevent."*
 */
export function twoInstancesOfOneBlock(): CrossSheetFixture {
  const parts = [
    R("R_IA1", "V3", "A_TAP"), R("R_IA2", "A_TAP", "GND"),
    R("R_IB1", "V3", "B_TAP"), R("R_IB2", "B_TAP", "GND"),
  ]
  const blocks = [
    railRowBlock("I1_TOP", "s1", "Instance one, upper", ["R_IA1"]),
    railRowBlock("I1_BOT", "s2", "Instance one, lower", ["R_IA2"]),
    railRowBlock("I2_TOP", "s1", "Instance two, upper", ["R_IB1"]),
    railRowBlock("I2_BOT", "s2", "Instance two, lower", ["R_IB2"]),
  ]
  return pairOf("repeat", [sheet("s1", 1), sheet("s2", 2)], parts, blocks, [GND, V3])
}

export function crossSheetFixtures(): readonly CrossSheetFixture[] {
  return [sharedRail(), signalAcrossThreeSheets(), twoInstancesOfOneBlock()]
}
