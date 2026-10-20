/**
 * SEAM B: COMPOSING BLOCKS ONTO A SHEET WITHOUT TOUCHING THEIR INTERIORS, OR REFUSING.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan.
 *
 * **THE CONTRACT, VERBATIM FROM SPEC §1.9: *seam B must preserve a block's internal geometry and
 * connect its interfaces; if it cannot do so without violating shared clearance, it REFUSES rather
 * than silently redrawing a validated block.*** The refusal names the block, the interface port and
 * the clearance it could not satisfy. **CRITERION: no block's internal geometry is altered after
 * that block passed its own clearance check.**
 *
 * **WHY A REFUSAL AND NOT A RETRY.** Spec §1.9: *"a seam B that quietly redrew a block would hide a
 * composition defect exactly as a fallback hides a template defect - the sheet comes out looking
 * fine, the gate passes, and the thing that could not be composed is never reported."* That is
 * `docs/known-gaps.md` **G84**'s lesson, which this plan already deletes a renderer over
 * (decision **D3**).
 *
 * **THIS MODULE IS THE ONLY CONSUMER OF `InterfacePort`** (plan decision **D9**, spec §1.9). Task 9
 * declared the contract on every block and recorded that *"seam B (Task 15) is the only consumer"*,
 * because a second reader would be a second answer to one question. Nothing on the seam-A path
 * reads it.
 *
 * ---
 *
 * **THE CHOICE RULE THIS TASK IMPLEMENTS FOR A NEGOTIABLE POSITION, STATED SO A LATER READER CAN
 * DISPUTE IT.** Spec §1.9 and **D9** both leave open *"how seam B chooses among negotiable
 * positions"*. What is implemented is:
 *
 * > **An interface port attaches at the block's own `Anchor` for that net, translated by the offset
 * > the packing gave its frame, and nowhere else. A declared side that the drawn anchor does not sit
 * > on is a refusal, not an instruction to move it.**
 *
 * **The reason is the contract above, not a shortage of imagination.** An `Anchor` is where a
 * block's own layout brings a net to its boundary; the wire that reaches it is inside the block.
 * Attaching the net anywhere else means either re-routing that wire or adding a second one, and
 * §1.9 forbids the first outright (*"it does not re-route a wire inside one"*) while the second
 * would be a connection the IR does not have. **So the freedom `negotiable` grants is real and this
 * implementation declines to use it**, and the honest consequence is that `fixed` and `negotiable`
 * currently differ in exactly one way: what `AttachedPort.was` reports. That is recorded in
 * `docs/known-gaps.md`, because an implementer who reads `negotiable` as "seam B will place this
 * for you" would be wrong about this generator.
 *
 * ---
 *
 * **AND THE TWO SIDE VOCABULARIES ARE TWO QUANTITIES, NOT TWO SPELLINGS - ROUND 1 CONFLATED THEM
 * AND SIX OF ITS EIGHT REFUSALS WERE THAT CONFLATION.**
 *
 * `Anchor.side` is a `Side` and `block-types.ts` says what it is: *"`side` points away from the
 * circuit"* - a **DIRECTION**, consumed by `anchorsToSymbols` -> `powerRotation` to rotate a glyph.
 * `InterfacePort.sides` is a `PinSide` and spec §1.9 says what it is: *"which sides of the block's
 * drawn extent a given interface port may be reached from"* - an **EDGE**.
 * `lib/schgen/rules/pin-sides.ts` already states the distinction in its own words: *"that module
 * says up/down because it is describing a DIRECTION in the library frame; a block interface is
 * described by the EDGE a pin sits on"*.
 *
 * **Round 1 renamed one into the other** (`pinSideOfAnchor`, a second copy of that module's
 * `SIDE_NAMES`) and compared a direction against an edge. On the ported `mini` design that produced
 * eight refusals, and **six of them were ports sitting on an edge their own declaration names** - a
 * regulator's `VIN` glyph points left and the anchor is on the block's TOP edge, a crystal's `XI`
 * glyph points up and the anchor is on the LEFT edge. The deleted mapping is not replaced; the
 * comparison is edge against edge, and the edge is derived from the block's own drawn extent by
 * `edgesOfAnchor` below.
 *
 * **AND `docs/known-gaps.md` G208 SETTLES WHAT `sides` IS FOR, which is why the extent is the right
 * reference.** Seam B draws no wire and nothing ever routes to an interface port, so `sides` is not
 * a routing constraint: it is a **legibility claim about where on the block's boundary a reader
 * finds the net**. The quantity that answers it is the anchor's position within the extent.
 */

import type { Anchor, BlockLayout } from "./block-types.ts"
import { contentOffset, frameAt, frameSize, type FrameContent } from "./frames.ts"
import { fmtMm, type Point, type Um } from "./geometry.ts"
import type { BlockId, Circuit, NetName } from "../ir/types.ts"
import type { InterfacePort, PinSide, SchematicAuthoring } from "../authoring.ts"
import type { Box } from "./lib-pins.ts"
import type { Size } from "./pack.ts"
import type { SheetPacking } from "../elk/sheet-graph.ts"
import type { SheetDrawing } from "./sheet-types.ts"

export interface AttachedPort {
  readonly block: BlockId
  readonly net: NetName
  readonly side: PinSide
  readonly at: Point
  readonly was: "fixed" | "negotiable"
}

export type Composition =
  | {
      readonly ok: true
      readonly at: readonly Point[]
      readonly by: "shelf" | "elk"
      readonly attached: readonly AttachedPort[]
    }
  /** Interfaces that could not be connected without violating shared clearance. */
  | { readonly ok: false; readonly unsatisfiable: readonly string[] }

/** A block's layout with the id the refusals name. */
export interface ComposedBlock {
  readonly blockId: BlockId
  readonly layout: BlockLayout
}

/**
 * What `composeBlocks` needs beside the circuit, the contents and the paper.
 *
 * **TWO DEVIATIONS FROM THE TASK 15 BRIEF's SIGNATURE, BOTH STRUCTURAL AND BOTH RECORDED** in
 * `docs/known-gaps.md`:
 *
 * - **`interfaces`** - the brief's `composeBlocks(c: Circuit, …)` cannot read the declared
 *   interface, because `InterfacePort` lives on `BlockDeclaration` in `../authoring.ts` and **not
 *   on the IR**. Putting it on `BlockSpec` would add a required field to the twenty-odd ported and
 *   hand-written fixtures that build one as a literal, for a field only this module reads; ruling
 *   **R29** carried two fields into the IR because a layout backend could not otherwise reach them
 *   *at all*, and that is not this case - seam B's caller holds the `SchematicAuthoring` already.
 *   `interfacesOf` below is the one-line adapter.
 * - **`pack`** - `lib/schgen/` *"spawns nothing"* (the plan's global constraints), and both packers
 *   are reached through `tools/schgen/elk/sheet-layout.ts`'s `packSheet`. It is a required
 *   parameter and not a defaulted one: a default would be this module choosing a packer, and the
 *   selection rule is stated exactly once, there.
 */
export interface CompositionInput {
  readonly interfaces: ReadonlyMap<BlockId, readonly InterfacePort[]>
  readonly pack: (contents: readonly FrameContent[], paper: Size) => Promise<SheetPacking>
}

/** The declared interface of every block of an authoring file, keyed by block id. */
export function interfacesOf(authoring: SchematicAuthoring): ReadonlyMap<BlockId, readonly InterfacePort[]> {
  return new Map(authoring.blocks.map((b) => [b.id, b.interface]))
}

/**
 * THE EDGE OR EDGES OF `box` THAT `at` SITS ON: the nearest one, and every one tied with it.
 *
 * **A CORNER LIES ON TWO EDGES AND SATISFIES EITHER.** An anchor exactly in a box's top-left
 * corner is equally on the top and on the left, and a declaration naming either is met; collapsing
 * it to one would refuse a correct declaration for an arbitrary reason.
 *
 * **IT INFERS NOTHING ABOUT THE INTERIOR.** Spec §1.9 forbids seam B inferring a block's INTERFACE
 * from its geometry - which nets leave, and whether a port exists at all. This does not do that:
 * the port is declared, and this reads the declared port's position against the extent of the
 * geometry the caller already handed it, which is what a reader does with their eye.
 *
 * **THE REFERENCE IS `anchorExtent` AND NOT `FrameContent.box`, AND THE DIFFERENCE IS NOT
 * COSMETIC - IT WAS MEASURED.** `FrameContent.box` is the union of the block's bodies, wire ends
 * **and its drawn boundary glyphs**, and a glyph extends OUTWARD from its own anchor. So the box's
 * edge in a glyph's direction is pushed past that anchor by the glyph's own length, and asking
 * which edge the anchor is nearest then compares the anchor against a box the anchor itself
 * inflated. `[RAN]` on `mini`: against the full box, `J_OUT`'s seven anchors - all of them in one
 * column on the connector's left, declared `[left, right]` - come out as `top`, `top`, `top`,
 * `top/bottom`, `bottom`, `bottom`, `bottom`, because the label outlines put the box's left edge
 * 15.88 mm beyond them while its top edge is 1.27 mm away. **Seven false refusals, from the
 * same family of mistake as reading an allowed offset off the data under test.** Against
 * `anchorExtent` every one of them reads `left`.
 *
 * **A DEGENERATE EXTENT TIES ALL FOUR EDGES**, which satisfies any declaration. That is the right
 * answer rather than a hole: a block whose parts, wires and anchors occupy a single point has no
 * edge to distinguish, and refusing would be asserting one.
 */
export function anchorExtent(layout: BlockLayout): Box {
  const points: Point[] = [
    ...layout.placements.map((p) => p.at),
    ...layout.wires.flatMap((w) => [w.a, w.b]),
    ...layout.anchors.map((a) => a.at),
  ]
  const [first, ...rest] = points
  if (first === undefined) {
    throw new Error(
      "a block layout with no placement, no wire and no anchor has no extent for an interface " +
        "port to sit on an edge of. It is not defaulted to the origin, because every port of such " +
        "a block would then satisfy every declaration.",
    )
  }
  return rest.reduce(
    (b, p) => ({ minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) }),
    { minX: first.x, minY: first.y, maxX: first.x, maxY: first.y },
  )
}

export function edgesOfAnchor(at: Point, box: Box): readonly PinSide[] {
  const distance: ReadonlyArray<readonly [PinSide, number]> = [
    ["left", at.x - box.minX],
    ["right", box.maxX - at.x],
    ["top", at.y - box.minY],
    ["bottom", box.maxY - at.y],
  ]
  const nearest = Math.min(...distance.map(([, d]) => d))
  return distance.filter(([, d]) => d === nearest).map(([side]) => side)
}

const shift = (p: Point, d: Point): Point => ({ x: p.x + d.x, y: p.y + d.y })
const inside = (p: Point, b: Box): boolean => p.x > b.minX && p.x < b.maxX && p.y > b.minY && p.y < b.maxY

/**
 * Every way composing these contents onto this paper fails to connect a declared interface, one
 * line each. Empty means every interface of every block is attached.
 */
function attachmentProblems(
  contents: readonly FrameContent[],
  at: readonly Point[],
  interfaces: ReadonlyMap<BlockId, readonly InterfacePort[]>,
): { readonly problems: readonly string[]; readonly attached: readonly AttachedPort[] } {
  const problems: string[] = []
  const attached: AttachedPort[] = []
  const frames = contents.map((f, i) => {
    const pos = at[i]
    if (pos === undefined) throw new Error(`the packer placed ${at.length} of ${contents.length} frames`)
    return { content: f, box: frameAt(f, pos).box, offset: contentOffset(f, pos) }
  })
  frames.forEach(({ content, box, offset }, index) => {
    const id = content.blockId
    if (id === null || content.block === null) return
    const declared = interfaces.get(id)
    if (declared === undefined) {
      throw new Error(
        `block ${id} is on this sheet and no interface is declared for it. Spec §1.9 makes a ` +
          "block's interface a DECLARATION - *\"never inferred from which nets happen to leave\"* - " +
          "so it is not derived here: pass interfacesOf(authoring) for the circuit this sheet " +
          "belongs to. Inferring it would make this check unable to disagree with the drawing.",
      )
    }
    const extent = anchorExtent(content.block.layout)
    const anchorsByNet = new Map<NetName, Anchor[]>()
    for (const a of content.block.layout.anchors) {
      anchorsByNet.set(a.net, [...(anchorsByNet.get(a.net) ?? []), a])
    }
    for (const port of declared) {
      const anchors = anchorsByNet.get(port.net) ?? []
      if (anchors.length === 0) {
        problems.push(
          `block ${id}: interface port ${port.net} (${port.position}) is declared and the block's ` +
            `layout draws no anchor for it, so there is nowhere on its boundary to connect it. ` +
            `Declared sides: ${port.sides.join(", ")}.`,
        )
        continue
      }
      for (const anchor of anchors) {
        const edges = edgesOfAnchor(anchor.at, extent)
        const side = edges.find((e) => port.sides.includes(e))
        if (side === undefined) {
          problems.push(
            `block ${id}: interface port ${port.net} (${port.position}) declares sides ` +
              `${port.sides.join(", ")} and the block's own drawn extent puts its anchor on the ` +
              `${edges.join(" and ")} edge. Seam B does not move it: the wire that reaches that ` +
              "anchor is inside the block, and spec §1.9 forbids re-routing one to make a sheet fit.",
          )
          continue
        }
        const point = shift(anchor.at, offset)
        if (!inside(point, box)) {
          problems.push(
            `block ${id}: interface port ${port.net} attaches at (${fmtMm(point.x)}, ${fmtMm(point.y)}) mm, ` +
              `which is outside its own frame (${fmtMm(box.minX)}, ${fmtMm(box.minY)}) - ` +
              `(${fmtMm(box.maxX)}, ${fmtMm(box.maxY)}) mm: the clearance it needs is inside the frame it was sized from.`,
          )
          continue
        }
        const intruded = frames.find((other, k) => k !== index && inside(point, other.box))
        if (intruded !== undefined) {
          problems.push(
            `block ${id}: interface port ${port.net} attaches inside frame "${intruded.content.title}", ` +
              "so the two frames' contents share the clearance that point needs. Seam B refuses " +
              "rather than moving the block's anchor (spec §1.9).",
          )
          continue
        }
        attached.push({ block: id, net: port.net, side, at: point, was: port.position })
      }
    }
  })
  return { problems, attached }
}

/**
 * The declared interface checked against the circuit before anything is placed: a block this sheet
 * draws that the circuit does not have, and a declared port naming a net no pin is on.
 *
 * **THIS IS WHAT `composeBlocks`'s `Circuit` PARAMETER IS FOR**, and it is worth saying because the
 * first draft of this module took the circuit and never read it. `authoring-checks.ts` compares a
 * whole declaration against a whole network; this compares the two things seam B is about to use
 * against each other, so a caller that paired one circuit's contents with another circuit's
 * declaration refuses here rather than attaching ports to nets that do not exist.
 */
function declarationDisagreements(
  c: Circuit,
  contents: readonly FrameContent[],
  interfaces: ReadonlyMap<BlockId, readonly InterfacePort[]>,
): readonly string[] {
  const out: string[] = []
  for (const f of contents) {
    const id = f.blockId
    if (id === null) continue
    if (!c.blocks.has(id)) out.push(`frame "${f.title}" is block ${id} and this circuit has no such block`)
    for (const port of interfaces.get(id) ?? []) {
      if (!c.nets.has(port.net)) {
        out.push(`block ${id}: interface port ${port.net} names a net no pin of this circuit is on`)
      }
    }
  }
  return out
}

/**
 * Compose the sheet's frames and connect every block's declared interface, or refuse naming what
 * could not be connected.
 *
 * **IT READS THE DECLARED INTERFACE AND NOTHING ELSE TO DECIDE WHERE A NET ARRIVES** - it never
 * consults a block's internal geometry to pick a side, which is the inference §1.9 forbids. It does
 * read the block's own `Anchor` for the point, which is the choice rule stated in the module
 * comment: the anchor is where the block's layout already brought that net to its boundary.
 */
export async function composeBlocks(
  c: Circuit,
  contents: readonly FrameContent[],
  paper: Size,
  input: CompositionInput,
): Promise<Composition> {
  const disagreements = declarationDisagreements(c, contents, input.interfaces)
  if (disagreements.length > 0) {
    throw new Error(
      `the interface declaration and the circuit handed to composeBlocks disagree on ` +
        `${disagreements.length} point(s); nothing was placed:\n  ${disagreements.join("\n  ")}`,
    )
  }
  const packing = await input.pack(contents, paper)
  if (!packing.ok) {
    // THE PACKING REFUSAL IS AN INTERFACE REFUSAL, AND NOT A CATEGORY ERROR. A frame that has no
    // position has no boundary, so none of its interface ports can be connected; the lines name
    // every one of them rather than reporting only the paper, because the brief's refusal arm is
    // "interfaces that could not be connected" and this is the whole set of them.
    const needed = `${fmtMm(packing.needed.w)} x ${fmtMm(packing.needed.h)} mm`
    const unsatisfiable = contents.flatMap((f) => {
      const id = f.blockId
      if (id === null) return []
      return (input.interfaces.get(id) ?? []).map((port) =>
        `block ${id}: interface port ${port.net} (${port.position}) cannot be connected on ` +
        `${fmtMm(paper.w)} x ${fmtMm(paper.h)} mm paper: the frames do not fit inside the margins ` +
        `and the title-block strip (at least ${needed} would be needed), so the block has no ` +
        "placed boundary to attach it to.")
    })
    if (unsatisfiable.length === 0) {
      unsatisfiable.push(
        `the frames do not fit on ${fmtMm(paper.w)} x ${fmtMm(paper.h)} mm paper (at least ` +
          `${needed} would be needed), and no block on this sheet declares an interface port, so ` +
          "there is no port to name.",
      )
    }
    return { ok: false, unsatisfiable }
  }
  const { problems, attached } = attachmentProblems(contents, packing.at, input.interfaces)
  if (problems.length > 0) return { ok: false, unsatisfiable: problems }
  return { ok: true, at: packing.at, by: packing.by, attached }
}

/**
 * ANY BLOCK WHOSE INTERNAL GEOMETRY DIFFERS FROM WHAT IT PASSED ITS OWN CLEARANCE CHECK WITH.
 *
 * **"INTERNAL GEOMETRY" IS GEOMETRY MODULO ONE RIGID TRANSLATION, AND THAT IS THE WHOLE DEFINITION
 * THIS FUNCTION TURNS ON.** Composition necessarily moves a block: `translateLayout` shifts every
 * placement, wire end and anchor by one grid-multiple offset into its frame. Placing a block is not
 * altering it - the parts keep their positions relative to each other, the wires keep their shapes,
 * nothing is re-routed. So the comparison allows **exactly one** offset per block and refuses
 * anything else: a part nudged, a wire re-routed, an anchor moved, a rotation changed, a count
 * changed. **Any difference is a refusal, not a diff to accept** (Task 15 brief).
 *
 * **IT TAKES `ComposedBlock` AND NOT `BlockLayout`, WHICH IS A DEVIATION FROM THE BRIEF's
 * SIGNATURE, RECORDED IN `docs/known-gaps.md`.** Spec §1.9 requires the refusal to name the block,
 * and a `BlockLayout` carries part labels but no block id; naming it by its position in an array
 * would be a refusal a reader could not act on.
 *
 * **AND THE OFFSET IS GIVEN, NOT READ OFF `placements[0]` - WHICH IS ROUND 2's FIX FOR A MEASURED
 * BLIND SPOT.** Round 1 inferred the allowed translation from the first placement's own
 * displacement, so **a block with ONE placement, no wires and no anchors had its whole displacement
 * absorbed as the allowed one**: `[RAN]` `mini`'s `AMP_SPARE` slid 50.8 mm reported no drift at all.
 * That is the family of defect `docs/known-gaps.md` **G202** names - a check comparing a value
 * against the value it has just been handed - and it is exactly the silent nudge Step 7 exists to
 * prevent. The caller computed the offset (`contentOffset`), so it passes it, and every block is
 * fully compared however few parts it holds. A block with no offset entry refuses rather than being
 * skipped.
 */
export function interiorDrift(
  before: readonly ComposedBlock[],
  after: readonly ComposedBlock[],
  offsets: ReadonlyMap<BlockId, Point>,
): readonly string[] {
  const out: string[] = []
  const afterById = new Map(after.map((b) => [b.blockId, b.layout]))
  for (const { blockId, layout } of before) {
    const now = afterById.get(blockId)
    if (now === undefined) {
      out.push(`block ${blockId} passed its clearance check and is absent from the composed sheet`)
      continue
    }
    const d = offsets.get(blockId)
    if (d === undefined) {
      throw new Error(
        `interiorDrift was given no composition offset for block ${blockId}, so there is nothing ` +
          "to compare its placed geometry against. The offset is the caller's - it is contentOffset(" +
          "frame, position) - and it is NOT inferred from the layouts here: inferring it from the " +
          "first placement made a one-part block's whole displacement look like the allowed " +
          "translation, which is the blind spot docs/known-gaps.md G214 records.",
      )
    }
    out.push(...driftOfOne(blockId, layout, now, d))
  }
  for (const { blockId } of after) {
    if (!before.some((b) => b.blockId === blockId)) {
      out.push(`block ${blockId} is on the composed sheet and passed no clearance check before it`)
    }
  }
  return out
}

function driftOfOne(blockId: BlockId, before: BlockLayout, after: BlockLayout, d: Point): readonly string[] {
  const out: string[] = []
  if (before.placements.length !== after.placements.length) {
    out.push(`block ${blockId}: ${before.placements.length} part placement(s) became ${after.placements.length}`)
  }
  if (before.wires.length !== after.wires.length) {
    out.push(`block ${blockId}: ${before.wires.length} wire(s) became ${after.wires.length}`)
  }
  if (before.anchors.length !== after.anchors.length) {
    out.push(`block ${blockId}: ${before.anchors.length} anchor(s) became ${after.anchors.length}`)
  }
  if (out.length > 0) return out
  const moved = (from: Point, to: Point): boolean => to.x - from.x !== d.x || to.y - from.y !== d.y
  before.placements.forEach((p, i) => {
    const q = after.placements[i]
    if (q === undefined) return
    if (p.part !== q.part || p.unit !== q.unit) {
      out.push(`block ${blockId}: placement ${i} was ${p.part}#${p.unit} and is now ${q.part}#${q.unit}`)
      return
    }
    if (p.rot !== q.rot) out.push(`block ${blockId}: ${p.part}#${p.unit} was drawn at ${p.rot} deg and is now at ${q.rot} deg`)
    if (moved(p.at, q.at)) {
      out.push(
        `block ${blockId}: part ${p.part}#${p.unit} moved inside the block - the composition ` +
          `offset for this block is (${fmtMm(d.x)}, ${fmtMm(d.y)}) mm and this part moved by ` +
          `(${fmtMm(q.at.x - p.at.x)}, ${fmtMm(q.at.y - p.at.y)}) mm. The block passed its own ` +
          "clearance check at the first geometry, and spec §1.9 forbids altering it afterwards.",
      )
    }
  })
  before.wires.forEach((w, i) => {
    const v = after.wires[i]
    if (v === undefined) return
    if (w.net !== v.net) {
      out.push(`block ${blockId}: wire ${i} was on net ${w.net} and is now on ${v.net}`)
      return
    }
    if (moved(w.a, v.a) || moved(w.b, v.b)) {
      out.push(`block ${blockId}: wire ${i} on net ${w.net} was re-routed inside the block`)
    }
  })
  before.anchors.forEach((a, i) => {
    const b = after.anchors[i]
    if (b === undefined) return
    if (a.net !== b.net || a.side !== b.side) {
      out.push(`block ${blockId}: anchor ${i} was ${a.net} on the ${a.side} and is now ${b.net} on the ${b.side}`)
      return
    }
    if (moved(a.at, b.at)) out.push(`block ${blockId}: anchor ${i} for net ${a.net} moved on the block's boundary`)
  })
  return out
}

/**
 * EVERY PLACED SYMBOL INSIDE A FRAME THAT IS NOT A MEMBER OF THAT FRAME's BLOCK - spec §3.4's
 * disjointness criterion, second half.
 *
 * §3.4 revision 2 records the flat-scale answer as **no**: *"67 % of canvas, 11 non-members inside
 * the group's box"*. This is the same count taken over a composed sheet, which is what that entry
 * says seam B *"will have to be measured against"*. The frame's own box is the group box, and
 * `Circuit.unitBlock` is what says which block a unit belongs to - a declared set, which is why
 * §3.4 calls this criterion objective here and a judgement call elsewhere.
 */
export function nonMemberContainments(c: Circuit, drawing: SheetDrawing): readonly string[] {
  const out: string[] = []
  for (const frame of drawing.frames) {
    const id = frame.blockId
    if (id === null) continue
    for (const sym of drawing.symbols) {
      const owner = c.unitBlock.get(`${sym.part}#${sym.unit}`)
      if (owner === id) continue
      const within = sym.body.minX >= frame.box.minX && sym.body.maxX <= frame.box.maxX
        && sym.body.minY >= frame.box.minY && sym.body.maxY <= frame.box.maxY
      if (within) out.push(`${sym.part}#${sym.unit} (block ${owner ?? "none"}) is inside frame "${frame.title}" of block ${id}`)
    }
  }
  return out
}

/**
 * `docs/known-gaps.md` **G200**'s two measures, TAKEN PER BLOCK, over a set of composed layouts.
 *
 * **IT EXISTS BECAUSE G209's FIGURES WERE OTHERWISE IN NO COMMITTED FILE.** That entry records that
 * composition leaves G200's numbers unchanged; a later reader could not re-run the measurement,
 * which is the one thing a register entry must not leave undone.
 *
 * **PER BLOCK AND NEVER PER SHEET.** At sheet scale the staircase measure is vacuous: frames sit at
 * different x, so parts in different blocks never share one whatever the renderer did. `[RAN]`
 * `mini`'s signal sheet - every block drawn by a reviewed TEMPLATE - gives 11 placements and 11
 * distinct x, the same verdict G200 reports for ELK. The number is a property of a block's interior.
 */
export interface ShapeMeasures {
  readonly placements: number
  /** Summed over blocks: distinct x-coordinates within each block. */
  readonly distinctX: number
  readonly wiredNets: number
  /** Nets whose route reverses direction on an axis. */
  readonly reversing: number
  readonly segments: number
  /** Total Manhattan wire length. */
  readonly wire: Um
}

export function shapeMeasures(layouts: readonly BlockLayout[]): ShapeMeasures {
  let placements = 0
  let distinctX = 0
  let wiredNets = 0
  let reversing = 0
  let segments = 0
  let wire = 0
  for (const l of layouts) {
    placements += l.placements.length
    distinctX += new Set(l.placements.map((p) => p.at.x)).size
    const axes = new Map<NetName, { x: Set<number>; y: Set<number> }>()
    for (const w of l.wires) {
      const e = axes.get(w.net) ?? { x: new Set<number>(), y: new Set<number>() }
      if (w.a.x !== w.b.x) e.x.add(Math.sign(w.b.x - w.a.x))
      if (w.a.y !== w.b.y) e.y.add(Math.sign(w.b.y - w.a.y))
      axes.set(w.net, e)
      segments += 1
      wire += Math.abs(w.b.x - w.a.x) + Math.abs(w.b.y - w.a.y)
    }
    wiredNets += axes.size
    for (const [, e] of axes) if (e.x.size > 1 || e.y.size > 1) reversing += 1
  }
  return { placements, distinctX, wiredNets, reversing, segments, wire }
}

/** The frames' own sizes, for a report that prints them beside a packing's positions. */
export function frameSizes(contents: readonly FrameContent[]): readonly Size[] {
  return contents.map(frameSize)
}

/**
 * The grid-multiple offset composition applies to each block, by block id - `interiorDrift`'s third
 * argument, built from the same `contentOffset` call `arrange` uses.
 *
 * It exists so that the offset `interiorDrift` compares against is **computed from the packing**
 * rather than read out of the geometry under test. One function, one source.
 */
export function compositionOffsets(
  contents: readonly FrameContent[],
  at: readonly Point[],
): ReadonlyMap<BlockId, Point> {
  const out = new Map<BlockId, Point>()
  contents.forEach((f, i) => {
    if (f.blockId === null) return
    const pos = at[i]
    if (pos === undefined) throw new Error(`the packer placed ${at.length} of ${contents.length} frames`)
    out.set(f.blockId, contentOffset(f, pos))
  })
  return out
}
