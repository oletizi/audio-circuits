/**
 * **SPEC §3.4's TWO OBJECTIVE CRITERIA, RE-TAKEN: congruence of a repeated sub-circuit WITH the
 * rail glyphs its instances actually get, and disjointness of a declared group at sheet scale.**
 *
 *   bun tools/schgen/remeasure-criteria.ts
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan.
 *
 * **THE CRITERION FOR THE CONGRUENCE HALF IS G97's, AND ITS SECOND CLAUSE IS WHY THIS MODULE
 * EXISTS AT ALL.** *"CRITERION: the same two measurements, taken again once a template is in the
 * loop. These numbers are the before. Added by the amendment: congruence must be measured with the
 * rail glyphs the two instances would actually get, because that is what broke it here, not the
 * topology."* The spike measured the four declared bias legs drawing congruently under `v-bare`
 * and **breaking under `v-rails`**, where `leg-upper` runs from `VCC` and gets a `vcc` glyph while
 * `leg-feedback` runs from `COLLECTOR` and gets none.
 *
 * **ON THIS PIPELINE THERE IS NO POLICY TO CHOOSE, AND THAT IS THE WHOLE OF WHY THE GLYPH CLAUSE IS
 * SATISFIABLE.** A rail's glyph is not an option: `subgraphOf` puts every rail the block touches in
 * `g.rails` with its declared `RailSpec`, and `anchorsToSymbols` turns the block's own anchors into
 * a power symbol for a rail and a global label for every other boundary net. So *"the rail glyphs
 * the two instances would actually get"* is not a setting this module picks - it is what the
 * declaration says, and the four legs genuinely differ in it: **`tp-leg-upper` touches `VCC`,
 * `tp-leg-lower-a` and `tp-leg-lower-b` touch `GND`, and `tp-leg-feedback` touches no rail at all.**
 * That is exactly the asymmetry G97's amendment says broke congruence through `netlistsvg`.
 *
 * **THE SPIKE's FORMULA IS TESTED AS A PREDICTION OF A SPREAD, WHICH MAKES IT UNIT-FREE.** G97:
 * the one x difference between the four legs was *"predicted exactly by `6 * len(component id) + 5`
 * - 107 / 125 / 119 / 119 for ids of length 17 / 20 / 19 / 19, 4 of 4 to the pixel - which is the
 * 0.6 em at 10 px monospace the skin uses."* Those four ids are this repository's own semantic
 * component ids - `upper_bias_jumper` (17), `feedback_bias_jumper` (20), `lower_bias_a_jumper` (19),
 * `lower_bias_b_jumper` (19) - so the formula is reachable here. **Its absolute output is in the
 * skin's pixels and is not comparable; what IS comparable is the SPREAD it predicts**, because a
 * spread of zero is zero in any unit. The formula predicts the four offsets differ; this module
 * measures whether they do.
 *
 * **THE DISJOINTNESS HALF IS MEASURED IN G97's OWN TERMS AND NOT IN THE FRAME's.** That entry's
 * flat-scale answer is *"8 members, bounding box 1016x621, 67 % of canvas, 11 non-members inside
 * it"* - the bounding box of the GROUP's members, the share of the canvas it spans, and how many
 * parts that are not members fall inside it. `groupDisjointness` below takes those three on the
 * composed sheet. **A frame-box version would be a different measurement**: a frame is ink the
 * packer drew around a block, so a non-member inside a frame is a packing defect while a non-member
 * inside the group's own extent is the thing §3.4 is about. Frame overlap is reported too, because
 * the brief asks for it and because `frameBoxOverlaps` is the committed check for it.
 *
 * **WHAT CANNOT BE TAKEN HERE, AND IT IS A SCOPE FACT RATHER THAN A CHOICE.** G97's two flat-scale
 * rows are the Pultec stand-in groups of `pultec-low-boost` and `pultec-hi-boost`. **Neither
 * network is in `PARITY_CIRCUITS` and no authoring file in this repository declares either group**,
 * so the 67 % and the 11 are NOT-COMPARABLE and no nearby block is substituted for them - the
 * brief's instruction verbatim. And `lib/schgen/render/compose.ts`'s `nonMemberContainments`, which
 * is the frame-box reading of the same criterion, needs a `SheetDrawing`; `layoutSheet` refuses
 * `transistor-preamp`'s only declared sheet because two of its seven blocks do not draw (**G211**),
 * so that function is exercised in `tests/schgen/remeasure.test.ts` on the one design that composes.
 */

import { circuitSpecFrom } from "../../lib/schgen/from-network.ts"
import { buildCircuit } from "../../lib/schgen/ir/build.ts"
import { subgraphOf } from "../../lib/schgen/render/blocks.ts"
import { anchorExtent } from "../../lib/schgen/render/compose.ts"
import { blockContent, contentOffset, translateLayout } from "../../lib/schgen/render/frames.ts"
import { anchorsToSymbols, valuesAlong } from "../../lib/schgen/render/power-text.ts"
import { PAPER } from "../../lib/schgen/render/sheets.ts"
import { frameBoxOverlaps, framePlacements, shelfPacking, usableArea } from "../../lib/schgen/elk/sheet-graph.ts"
import { GRID } from "../../lib/schgen/render/geometry.ts"
import { elkBackendFrom, elkPrePass } from "./elk/layout.ts"
import { packSheet } from "./elk/sheet-layout.ts"
import { PARITY_CASES, parityResolver, type ParityCase } from "./authoring-census.ts"
import type { FrameContent } from "../../lib/schgen/render/frames.ts"
import type { BlockId, PartLabel } from "../../lib/schgen/ir/types.ts"
import type { Box } from "../../lib/schgen/render/lib-pins.ts"

/** The four structurally identical bias legs, in the order `docs/known-gaps.md` G97 lists them. */
export const CONGRUENT_LEGS: readonly BlockId[] = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b"]

/**
 * The semantic component id of each leg's jumper, and its length, which is the formula's input.
 *
 * **IT IS THE MODEL's ID AND NOT THE DESIGNATOR, which is what G97 measured.** `circuits/
 * transistor-preamp/lab-board.ts` declares `jumperId: "upper_bias_jumper"` and `DESIGNATORS` maps it
 * to `JP1`; the four lengths are 17, 20, 19 and 19, exactly the lengths G97's formula is stated for.
 */
export const JUMPER_IDS: Readonly<Record<string, string>> = {
  "tp-leg-upper": "upper_bias_jumper",
  "tp-leg-feedback": "feedback_bias_jumper",
  "tp-leg-lower-a": "lower_bias_a_jumper",
  "tp-leg-lower-b": "lower_bias_b_jumper",
}

/** `docs/schematic/elk-block-spike.md` §6's prediction, in the skin's pixels: `6 * len(id) + 5`. */
export function skinIdWidth(id: string): number {
  return 6 * id.length + 5
}

export interface LegShape {
  readonly block: BlockId
  /** `<part>#<unit>@<x>,<y>@<rot>` per placement, in the block's own frame. */
  readonly placements: readonly string[]
  /** `<net>:<ax>,<ay>-<bx>,<by>` per wire, in the block's own frame. */
  readonly wires: readonly string[]
  /** `<net>@<x>,<y>/<side>` per anchor. */
  readonly anchors: readonly string[]
  /** The power symbols this leg's rails actually produce: `<net>/<libId>@<x>,<y>@<rot>`. */
  readonly powers: readonly string[]
  /** The global labels its non-rail boundary nets produce: `<net>@<x>,<y>/<side>`. */
  readonly labels: readonly string[]
  /** The jumper-to-trim displacement in grid steps, which is G97's measured quantity. */
  readonly jumperToTrim: { readonly dx: number; readonly dy: number } | null
  /** `6 * len(semantic id) + 5`, the skin's prediction for this leg's x offset. */
  readonly predictedX: number
}

/**
 * The SHAPE of each congruent leg, with the glyphs its own declaration gives it.
 *
 * **THE STRINGS ARE THE COMPARISON AND THAT IS DELIBERATE.** Two legs are congruent when their
 * placement list, wire list and anchor list are identical up to the part labels - which differ by
 * construction, since they are different parts. So each list is normalised by replacing the part
 * label with its ROLE (`jumper`, `floor`, `trim`), and two legs that draw alike then produce
 * identical arrays that `toEqual` can compare and a report can print. A positional comparison of
 * numbers would hide which element moved.
 */
export async function legShapes(cases: readonly ParityCase[] = PARITY_CASES): Promise<readonly LegShape[]> {
  const found = cases.find((c) => c.name === "transistor-preamp")
  if (found === undefined) throw new Error("the congruence re-take needs the transistor-preamp parity case and it is absent")
  const symbols = parityResolver()
  const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
  const elk = elkBackendFrom(await elkPrePass(circuit, symbols))
  return CONGRUENT_LEGS.map((id) => {
    const block = circuit.blocks.get(id)
    if (block === undefined) throw new Error(`transistor-preamp has no block ${id}; the four congruent legs are ${CONGRUENT_LEGS.join(", ")}`)
    const g = subgraphOf(circuit, id, symbols)
    const content = blockContent(circuit, id, symbols, elk)
    if (content.block === null) {
      throw new Error(
        `block ${id} produced a frame with no block layout, so there is no geometry to compare for ` +
          "congruence. blockContent returns a null block only for a notes or flags frame; a " +
          "declared block reaching this is a defect in lib/schgen/render/frames.ts.",
      )
    }
    const layout = content.block.layout
    const role = roleMap(g.units.map((u) => u.part.label))
    const name = (label: PartLabel): string => role.get(label) ?? label
    const glyphs = anchorsToSymbols(g, layout.anchors, valuesAlong(block.rendering))
    const jumper = layout.placements.find((p) => name(p.part) === "jumper")
    const trim = layout.placements.find((p) => name(p.part) === "trim")
    const jumperId = JUMPER_IDS[id]
    if (jumperId === undefined) {
      throw new Error(
        `no semantic component id is recorded for ${id}'s jumper, so G97's 6*len(id)+5 prediction ` +
          "cannot be computed for it. It is not derived from the designator: the formula is stated " +
          "over the MODEL's id and a designator would give a different length and a wrong prediction.",
      )
    }
    return {
      block: id,
      placements: layout.placements.map((p) => `${name(p.part)}#${p.unit}@${p.at.x},${p.at.y}@${p.rot}`),
      wires: layout.wires.map((w) => `${netRole(w.net, id)}:${w.a.x},${w.a.y}-${w.b.x},${w.b.y}`),
      anchors: layout.anchors.map((a) => `${a.net}@${a.at.x},${a.at.y}/${a.side}`),
      powers: glyphs.powers.map((p) => `${p.net}/${p.libId}@${p.at.x},${p.at.y}@${p.rot}`),
      labels: glyphs.labels.map((l) => `${l.net}@${l.at.x},${l.at.y}/${l.side}`),
      jumperToTrim:
        jumper === undefined || trim === undefined
          ? null
          : { dx: (trim.at.x - jumper.at.x) / GRID, dy: (trim.at.y - jumper.at.y) / GRID },
      predictedX: skinIdWidth(jumperId),
    }
  })
}

/** A leg's three parts by ROLE, read off the designator prefix rather than off a hard-coded list. */
function roleMap(labels: readonly PartLabel[]): ReadonlyMap<PartLabel, string> {
  const out = new Map<PartLabel, string>()
  for (const label of labels) {
    if (label.startsWith("JP")) out.set(label, "jumper")
    else if (label.startsWith("RV")) out.set(label, "trim")
    else if (label.startsWith("R")) out.set(label, "floor")
    else {
      throw new Error(
        `part ${label} is in a congruent bias leg and its role cannot be read from its designator ` +
          "prefix (JP = jumper, RV = trim, R = floor). The role is what makes two legs' placement " +
          "lists comparable at all, so an unknown part refuses rather than being compared under its " +
          "own label - which would make two congruent legs look different for a naming reason.",
      )
    }
  }
  return out
}

/** A leg's internal net under its own name, so `UPPER_FLOOR` and `LOWER_A_FLOOR` compare equal. */
function netRole(net: string, block: BlockId): string {
  const prefix = block.replace("tp-leg-", "").replace("-", "_").toUpperCase()
  return net.startsWith(`${prefix}_`) ? `INTERNAL${net.slice(prefix.length)}` : net
}

export interface GroupExtent {
  readonly block: BlockId
  readonly members: number
  /** The bounding box of this block's own drawn content, in grid steps. */
  readonly box: { readonly w: number; readonly h: number }
  /** The share of the sheet's USABLE area that box spans - G97's *"of canvas"* column. */
  readonly ofCanvas: number
  /** Placed units of OTHER blocks whose position falls inside this block's own extent. */
  readonly nonMembersInside: readonly string[]
}

export interface Disjointness {
  readonly circuit: string
  readonly blocks: readonly GroupExtent[]
  readonly frameOverlapsElk: readonly string[]
  readonly frameOverlapsShelf: readonly string[]
}

/**
 * §3.4's disjointness, at sheet scale, in G97's own three columns.
 *
 * **IT IS RUN ON THE COMPOSED GEOMETRY AND NOT ON THE BLOCKS IN ISOLATION, which is the whole
 * point.** G97's amendment records that *"inside a single block disjointness is trivially satisfied,
 * so a block-scale measurement cannot pass or fail it"* - the criterion only has content once more
 * than one block is on one canvas.
 */
export async function disjointness(name: string = "transistor-preamp", cases: readonly ParityCase[] = PARITY_CASES): Promise<Disjointness> {
  const found = cases.find((c) => c.name === name)
  if (found === undefined) throw new Error(`no parity circuit is called ${name}`)
  const symbols = parityResolver()
  const circuit = buildCircuit(circuitSpecFrom(found.network, found.authoring, symbols), { symbols })
  const elk = elkBackendFrom(await elkPrePass(circuit, symbols))
  const contents: FrameContent[] = []
  for (const block of circuit.blocks.values()) {
    try {
      contents.push(blockContent(circuit, block.id, symbols, elk))
    } catch {
      // A block that does not draw has no composed geometry and is counted by G200, not here.
    }
  }
  const paper = PAPER["A3"]
  const packed = await packSheet(contents, paper)
  const shelf = shelfPacking(contents, paper)
  if (!packed.ok || !shelf.ok) throw new Error(`${name}: a packer refused the ${contents.length} drawing blocks on A3`)
  const usable = usableArea(paper)
  const placed = contents.flatMap((f, i) => {
    const pos = packed.at[i]
    if (f.block === null || f.blockId === null || pos === undefined) return []
    return [{ id: f.blockId, layout: translateLayout(f.block.layout, contentOffset(f, pos)) }]
  })
  const blocks: GroupExtent[] = placed.map(({ id, layout }) => {
    const box = anchorExtent(layout)
    return {
      block: id,
      members: layout.placements.length,
      box: { w: (box.maxX - box.minX) / GRID, h: (box.maxY - box.minY) / GRID },
      ofCanvas: ((box.maxX - box.minX) * (box.maxY - box.minY)) / (usable.w * usable.h),
      nonMembersInside: placed
        .filter((other) => other.id !== id)
        .flatMap((other) => other.layout.placements.filter((p) => within(p.at, box)).map((p) => `${p.part}#${p.unit} (block ${other.id})`)),
    }
  })
  return {
    circuit: name,
    blocks,
    frameOverlapsElk: frameBoxOverlaps(framePlacements(contents, packed.at), contents),
    frameOverlapsShelf: frameBoxOverlaps(framePlacements(contents, shelf.at), contents),
  }
}

const within = (p: { readonly x: number; readonly y: number }, b: Box): boolean =>
  p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY

if (import.meta.main) {
  for (const leg of await legShapes()) {
    console.log(
      `${leg.block}: jumper->trim ${leg.jumperToTrim === null ? "not taken" : `(${leg.jumperToTrim.dx}, ${leg.jumperToTrim.dy})`} ` +
        `grid steps, skin predicted x ${leg.predictedX} px; powers ${leg.powers.join(" ") || "none"}; labels ${leg.labels.join(" ") || "none"}`,
    )
    console.log(`  placements ${leg.placements.join(" ")}`)
    console.log(`  wires ${leg.wires.join(" ")}`)
    console.log(`  anchors ${leg.anchors.join(" ")}`)
  }
  console.log("")
  const d = await disjointness()
  for (const b of d.blocks) {
    console.log(
      `${b.block}: ${b.members} members, box ${b.box.w} x ${b.box.h} grid steps, ` +
        `${(100 * b.ofCanvas).toFixed(2)}% of usable canvas, non-members inside ` +
        `${b.nonMembersInside.length === 0 ? "none" : b.nonMembersInside.join(", ")}`,
    )
  }
  console.log(`frame overlaps: elk ${d.frameOverlapsElk.length}, shelf ${d.frameOverlapsShelf.length}`)
}
