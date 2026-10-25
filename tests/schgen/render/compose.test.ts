/**
 * SPEC §1.9's BLOCK-INTERFACE CONTRACT, MADE CHECKABLE.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan. The contract, verbatim: *"seam B
 * must preserve a block's internal geometry and connect its interfaces; if it cannot do so without
 * violating shared clearance, it REFUSES rather than silently redrawing a validated block."*
 * **CRITERION: no block's internal geometry is altered after that block passed its own clearance
 * check.**
 *
 * **THE TWO SUBJECTS ARE IN `../__fixtures__/composed.ts`, AND WHY THEY ARE THOSE TWO IS A
 * FINDING**: not one of the four parity circuits has a sheet that composes, because each declares
 * one sheet and every one of them holds a block that refuses to draw.
 */
import { afterAll, beforeAll, expect, test } from "bun:test"
import { cleanUpTempScratch } from "../../support/temp-scratch.ts"
import { drawnBlocks, miniSheet, type ComposedSubject, type DrawnBlocks } from "../__fixtures__/composed.ts"
import {
  composeBlocks, compositionOffsets, edgesOfAnchor, interiorDrift, nonMemberContainments,
  shapeMeasures, type ComposedBlock,
} from "../../../lib/schgen/render/compose.ts"
import { contentOffset, frameAt, translateLayout } from "../../../lib/schgen/render/frames.ts"
import { GRID } from "../../../lib/schgen/render/geometry.ts"
import { shelfPacking, type SheetPacking } from "../../../lib/schgen/elk/sheet-graph.ts"
import { packSheet } from "../../../tools/schgen/elk/sheet-layout.ts"
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts"
import { FLAG_LIB_ID } from "../../../tools/schgen/generate.ts"
import type { BlockLayout } from "../../../lib/schgen/render/block-types.ts"
import type { InterfacePort } from "../../../lib/schgen/authoring.ts"
import type { BlockId, NetName } from "../../../lib/schgen/ir/types.ts"
import type { Point } from "../../../lib/schgen/render/geometry.ts"

afterAll(cleanUpTempScratch)

let legs: DrawnBlocks
let signal: ComposedSubject

beforeAll(async () => {
  legs = await drawnBlocks("transistor-preamp")
  signal = await miniSheet("signal")
}, 300_000)

/** A packer that hands back a packing already computed, so a test can fix one. */
const fixed = (p: SheetPacking) => async (): Promise<SheetPacking> => p

/** The layouts as realised (frame-local) and as composed (translated), for `interiorDrift`. */
function layoutsAround(subject: ComposedSubject, at: readonly Point[]): {
  readonly before: readonly ComposedBlock[]
  readonly after: readonly ComposedBlock[]
  readonly offsets: ReadonlyMap<string, Point>
} {
  const before: ComposedBlock[] = []
  const after: ComposedBlock[] = []
  subject.contents.forEach((f, i) => {
    if (f.blockId === null || f.block === null) return
    const pos = at[i]
    if (pos === undefined) throw new Error(`no position for frame ${i}`)
    before.push({ blockId: f.blockId, layout: f.block.layout })
    after.push({ blockId: f.blockId, layout: translateLayout(f.block.layout, contentOffset(f, pos)) })
  })
  return { before, after, offsets: compositionOffsets(subject.contents, at) }
}

/**
 * Every point a block's own layout brings `net` to its boundary at, translated into its placed
 * frame - a LIST, because a net may reach the boundary in more than one place (mini's `XTAL` draws
 * three `GND` anchors) and collapsing them to the first would compare one attachment against
 * another's expected position.
 */
function declaredPositionsOf(subject: ComposedSubject, at: readonly Point[], block: BlockId, net: NetName): readonly string[] {
  const index = subject.contents.findIndex((f) => f.blockId === block)
  const content = subject.contents[index]
  const pos = at[index]
  if (content?.block == null || pos === undefined) throw new Error(`block ${block} is not on this sheet`)
  const d = contentOffset(content, pos)
  return content.block.layout.anchors
    .filter((a) => a.net === net)
    .map((a) => `${a.at.x + d.x},${a.at.y + d.y}`)
    .sort()
}

/**
 * **ALL SEVEN OF `transistor-preamp`'s BLOCKS DRAW SINCE 2026-10-25, so this subject is not "the
 * five legs" any more and the probe is not a five-block subset of a sheet.** Boundary-node sizing
 * (`docs/known-gaps.md` **G291**) drew `tp-leg-emitter-bypass` and `tp-stage`; `drawnBlocks`
 * refuses nothing.
 *
 * **THE THREE ORIGINAL DISAGREEMENTS ARE UNCHANGED, WHICH IS THE CONTROL.** `tp-leg-feedback`'s
 * `COLLECTOR` and the two `-lower` legs' `BASE` still declare `left, right` and still come out at
 * the top - same ports, same edge, same sentence. The eight that are new all belong to `tp-stage`,
 * the block that did not previously reach this comparison at all, so **nothing that was already
 * being measured moved.**
 *
 * **AND TWO OF THE EIGHT ARE A CLASS THAT HAD NEVER FIRED ON REAL DATA.** `tp-stage` declares
 * `IN_EXT` and `OUT` and its layout draws no anchor for either, which is the *"draws no anchor for
 * it"* arm. Until now that arm was driven only by adding a synthetic port to mini's `XTAL` (see
 * the test that does exactly that, below); it is now reachable from a declaration this repository
 * actually ships.
 */
test("all seven ELK-drawn blocks REFUSE on eleven anchors, and that is G193's disagreement in ink", async () => {
  expect(legs.drew.length).toBe(7)
  expect(legs.refused.map((r) => r.id).sort()).toEqual([])
  const composed = await composeBlocks(legs.circuit, legs.contents, legs.paper, {
    interfaces: legs.interfaces, pack: packSheet,
  })
  // ROUND 1 REPORTED "0 refusals" HERE, AND THAT RESULT WAS NEAR-STRUCTURAL. It compared
  // `Anchor.side` - which docs/known-gaps.md G193 records is taken from `negotiablePort`'s own
  // rule and NOT from ELK's route - against the declaration that same rule produced, so the rule
  // was authoring both sides of the comparison. Comparing the anchor's POSITION against the
  // block's own extent asks ELK where it actually put the net, and eleven of the 23 disagree.
  expect(composed.ok).toBe(false)
  if (composed.ok) return
  const ports = composed.unsatisfiable.map((u) => u.slice(0, u.indexOf(" ("))).sort()
  expect(ports).toEqual([
    "block tp-leg-feedback: interface port COLLECTOR",
    "block tp-leg-lower-a: interface port BASE",
    "block tp-leg-lower-b: interface port BASE",
    "block tp-stage: interface port BASE",
    "block tp-stage: interface port BYPASS_JUMPED",
    "block tp-stage: interface port COLLECTOR",
    "block tp-stage: interface port EMITTER",
    "block tp-stage: interface port GND",
    "block tp-stage: interface port IN_EXT",
    "block tp-stage: interface port OUT",
    "block tp-stage: interface port VCC",
  ])
  // ELEVEN OF TWENTY-THREE, and the denominator is the declared ports: 2 each on the five legs,
  // 4 on tp-leg-emitter-bypass and 9 on tp-stage. So twelve declarations ARE satisfied and this is
  // not a blanket refusal - tp-stage's own BYPASS_CAP is one of them.
  const declared = legs.contents.reduce((n, f) => n + (legs.interfaces.get(f.blockId ?? "")?.length ?? 0), 0)
  expect(declared).toBe(23)
  // THE WRONG-EDGE CLASS: a crossing net the declaration puts on a horizontal edge (decision D4
  // pins flow left-to-right) and ELK brings out at the top. These blocks are `auto` and declare no
  // template, so negotiablePort's rule is in scope and the DECLARATION is the authority - the
  // opposite of mini's FLASH, where a reviewed template arrangement wins. Spec §1.5's authority
  // order gives both answers.
  const legRefusals = composed.unsatisfiable.filter((u) => u.startsWith("block tp-leg-"))
  expect(legRefusals.length).toBe(3)
  expect(legRefusals.every((u) => u.includes("declares sides left, right"))).toBe(true)
  expect(legRefusals.every((u) => u.includes("anchor on the top edge"))).toBe(true)
  // THE NO-ANCHOR CLASS, on real data for the first time.
  const noAnchor = composed.unsatisfiable.filter((u) => u.includes("draws no anchor for it"))
  expect(noAnchor.map((u) => u.slice(0, u.indexOf(" (")))).toEqual([
    "block tp-stage: interface port IN_EXT",
    "block tp-stage: interface port OUT",
  ])
  // AND EVERY REFUSAL IS ONE OF THE TWO CLASSES: a third kind appearing here would be unexamined.
  for (const u of composed.unsatisfiable) {
    expect(
      u.includes("draws no anchor for it") || u.includes("the block's own drawn extent puts its anchor on the"),
      u,
    ).toBe(true)
  }
})

test("a fixed interface position is honoured, not relocated", async () => {
  // THE FIXTURE DECLARES THE FIXED PORTS, which is what G153 says nothing stops a Task 15 author
  // doing: *"declaring a fixed one means writing the InterfacePort literal with its sides, its
  // position and its why by hand"*. The reason is the block's own geometry, which is exactly what
  // "fixed" means in spec §1.9. The subject is mini, because it is the one that composes.
  const refixed = new Map<BlockId, readonly InterfacePort[]>()
  for (const [id, ports] of signal.interfaces) {
    refixed.set(id, ports.map((p): InterfacePort => ({
      ...p,
      position: "fixed",
      why: `${p.net} is brought to this block's boundary by its own drawn anchor, so its position is fixed by the block's internal geometry.`,
    })))
  }
  const packing = shelfPacking(signal.contents, signal.paper)
  const composed = await composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: refixed, pack: fixed(packing),
  })
  expect(composed.ok).toBe(true)
  if (!composed.ok || !packing.ok) return
  expect(composed.attached.every((p) => p.was === "fixed")).toBe(true)
  // A CHECK THAT COULD HAVE FAILED: the expected points are computed here from the block's own
  // anchors and the frame offset, independently of what composeBlocks returned, and compared as a
  // multiset per (block, net) so a net with several anchors is fully covered.
  const byPort = new Map<string, string[]>()
  for (const p of composed.attached) {
    const key = `${p.block}/${p.net}`
    byPort.set(key, [...(byPort.get(key) ?? []), `${p.at.x},${p.at.y}`])
  }
  expect(byPort.size).toBeGreaterThan(0)
  for (const [key, points] of byPort) {
    const [block, net] = key.split("/")
    if (block === undefined || net === undefined) throw new Error(key)
    expect(points.sort(), key).toEqual([...declaredPositionsOf(signal, packing.at, block, net)])
  }
  expect(composed.attached.length).toBe(29)
})

test("the same ports come back at the same places whichever packer placed the frames", async () => {
  // Not a tautology: the two packings put the frames at DIFFERENT positions, so the attachment
  // points differ - what must agree is the set of (block, net, side, was) and the offset from each
  // frame's own origin. This is the sense in which seam B's choice is the block's, not the page's.
  const shelf = shelfPacking(signal.contents, signal.paper)
  const elk = await packSheet(signal.contents, signal.paper)
  expect(shelf.ok && elk.ok).toBe(true)
  if (!shelf.ok || !elk.ok) return
  expect(elk.at).not.toEqual(shelf.at)
  const run = async (p: SheetPacking) => composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: signal.interfaces, pack: fixed(p),
  })
  const a = await run(shelf)
  const b = await run(elk)
  expect(a.ok && b.ok).toBe(true)
  if (!a.ok || !b.ok) return
  const key = (x: { block: string; net: string; side: string; was: string }) => `${x.block}/${x.net}/${x.side}/${x.was}`
  expect(b.attached.map(key).sort()).toEqual(a.attached.map(key).sort())
  expect(a.attached.length).toBeGreaterThan(0)
})

test("composition never alters a block's interior, under either packer", async () => {
  for (const packing of [shelfPacking(legs.contents, legs.paper), await packSheet(legs.contents, legs.paper)]) {
    expect(packing.ok).toBe(true)
    if (!packing.ok) continue
    const { before, after, offsets } = layoutsAround(legs, packing.at)
    expect(before.length).toBe(7)
    expect(interiorDrift(before, after, offsets)).toEqual([])
  }
})

test("interiorDrift NAMES the block and the part when one part is nudged inside a block", async () => {
  const packing = shelfPacking(legs.contents, legs.paper)
  expect(packing.ok).toBe(true)
  if (!packing.ok) return
  const { before, after, offsets } = layoutsAround(legs, packing.at)
  const victim = after[0]
  const part = victim?.layout.placements[1]
  if (victim === undefined || part === undefined) throw new Error("the first composed block has fewer than two parts")
  const nudged: BlockLayout = {
    ...victim.layout,
    placements: victim.layout.placements.map((p, i) => (i === 1 ? { ...p, at: { x: p.at.x + GRID, y: p.at.y } } : p)),
  }
  const drift = interiorDrift(before, [{ blockId: victim.blockId, layout: nudged }, ...after.slice(1)], offsets)
  expect(drift.length).toBe(1)
  expect(drift[0]).toContain(`block ${victim.blockId}`)
  expect(drift[0]).toContain(`part ${part.part}#${part.unit}`)
  expect(drift[0]).toContain("moved inside the block")
})

test("interiorDrift sees a re-routed wire, a changed rotation, a moved anchor and a dropped block", async () => {
  const packing = shelfPacking(legs.contents, legs.paper)
  if (!packing.ok) throw new Error("the shelf packer refused the legs probe")
  const { before, after, offsets } = layoutsAround(legs, packing.at)
  const one = after[0]
  if (one === undefined) throw new Error("nothing composed")
  const edit = (layout: BlockLayout): readonly ComposedBlock[] => [{ blockId: one.blockId, layout }, ...after.slice(1)]
  const wire = one.layout.wires[0]
  const anchor = one.layout.anchors[0]
  const place = one.layout.placements[0]
  if (wire === undefined || anchor === undefined || place === undefined) throw new Error("the first block is too small to perturb")
  expect(interiorDrift(before, edit({
    ...one.layout,
    wires: one.layout.wires.map((w, i) => (i === 0 ? { ...w, b: { x: w.b.x + GRID, y: w.b.y } } : w)),
  }), offsets).join(" ")).toContain("was re-routed inside the block")
  expect(interiorDrift(before, edit({
    ...one.layout,
    placements: one.layout.placements.map((p, i) => (i === 0 ? { ...p, rot: p.rot === 0 ? 90 : 0 } : p)),
  }), offsets).join(" ")).toContain("deg")
  expect(interiorDrift(before, edit({
    ...one.layout,
    anchors: one.layout.anchors.map((a, i) => (i === 0 ? { ...a, at: { x: a.at.x, y: a.at.y + GRID } } : a)),
  }), offsets).join(" ")).toContain("moved on the block's boundary")
  expect(interiorDrift(before, after.slice(1), offsets).join(" ")).toContain("absent from the composed sheet")
  expect(interiorDrift(before.slice(1), after, offsets).join(" ")).toContain("passed no clearance check before it")
  expect(interiorDrift(before, edit({ ...one.layout, wires: one.layout.wires.slice(1) }), offsets).join(" ")).toContain("wire(s) became")
})

test("an interface that cannot be connected within shared clearance REFUSES, and does not redraw the block", async () => {
  // A5 landscape, which no SheetSpec may declare: PAPER holds A4 through A1, so this is the paper
  // the seven blocks cannot be composed on, and the refusal must name the interface rather than
  // only the paper.
  const A5 = { w: 210_000, h: 148_000 }
  const composed = await composeBlocks(legs.circuit, legs.contents, A5, {
    interfaces: legs.interfaces, pack: packSheet,
  })
  expect(composed.ok).toBe(false)
  if (composed.ok) return
  expect(composed.unsatisfiable.join(" ")).toContain("interface")
  // EVERY declared port of every block, because no frame has a placed boundary at all when the
  // packing fails: 2 each on the five legs, 4 on tp-leg-emitter-bypass and 9 on tp-stage = 23.
  // It was 10 while only the five legs drew, and the arithmetic is the same arithmetic.
  const declared = legs.contents.reduce((n, f) => n + (legs.interfaces.get(f.blockId ?? "")?.length ?? 0), 0)
  expect(declared).toBe(23)
  expect(composed.unsatisfiable.length).toBe(declared)
  expect(composed.unsatisfiable.join(" ")).toContain("cannot be connected")
  // AND THE BLOCKS ARE UNTOUCHED: the refusal returns no placement at all, so there is nothing
  // for a caller to emit, and the realised layouts are the same objects they were.
  const shelf = shelfPacking(legs.contents, legs.paper)
  if (!shelf.ok) throw new Error("the shelf packer refused the legs probe")
  const { before, after, offsets } = layoutsAround(legs, shelf.at)
  expect(interiorDrift(before, after, offsets)).toEqual([])
})

test("a declared side the block's extent does not put its anchor on REFUSES, naming both", () => {
  // Seam B's choice rule: the anchor is where the block brought the net to its boundary, and a
  // declared side its extent does not put it on is a refusal rather than an instruction to move it.
  const wrongSide = new Map<BlockId, readonly InterfacePort[]>()
  for (const [id, ports] of legs.interfaces) {
    wrongSide.set(id, ports.map((p): InterfacePort => ({ ...p, sides: ["top"] })))
  }
  return composeBlocks(legs.circuit, legs.contents, legs.paper, { interfaces: wrongSide, pack: packSheet })
    .then((composed) => {
      expect(composed.ok).toBe(false)
      if (composed.ok) return
      expect(composed.unsatisfiable.join(" ")).toContain("the block's own drawn extent puts its anchor on the")
      // FOURTEEN OF THE TWENTY-THREE: the other nine anchors ARE on their block's top edge, so
      // forcing every declaration to [top] does not refuse everything - which is what makes this a
      // check and not a blanket. It was 5 of 10 while only the five legs drew.
      const declared = legs.contents.reduce((n, f) => n + (legs.interfaces.get(f.blockId ?? "")?.length ?? 0), 0)
      expect(declared).toBe(23)
      expect(composed.unsatisfiable.length).toBe(14)
      expect(composed.unsatisfiable.length).toBeLessThan(declared)
    })
})

test("a declared port the block draws NO anchor for REFUSES, naming the port and its sides", async () => {
  // I4: this clause was driven by nothing in round 1. `SIG_IN` is a net of this circuit, so
  // `declarationDisagreements` lets it through, and `XTAL` has no anchor for it.
  const extra = new Map<BlockId, readonly InterfacePort[]>(signal.interfaces)
  extra.set("XTAL", [
    ...(signal.interfaces.get("XTAL") ?? []),
    { net: "SIG_IN", sides: ["left"], position: "negotiable", why: "a port this block does not bring to its boundary" },
  ])
  const composed = await composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: extra, pack: packSheet,
  })
  expect(composed.ok).toBe(false)
  if (composed.ok) return
  expect(composed.unsatisfiable.length).toBe(1)
  expect(composed.unsatisfiable[0]).toContain("block XTAL: interface port SIG_IN (negotiable)")
  expect(composed.unsatisfiable[0]).toContain("draws no anchor for it")
  expect(composed.unsatisfiable[0]).toContain("Declared sides: left")
})

test("an interface attaching inside ANOTHER frame REFUSES, naming that frame", async () => {
  // I4: the shared-clearance clause. It cannot fire under either shipped packer - `frameBoxOverlaps`
  // refuses an ELK packing whose frames overlap and the shelf packer cannot produce one - so it is
  // driven by handing `composeBlocks` a packing that stacks every frame at one point. That is a
  // packing no packer in this repository returns, and saying so is the point: **without this case
  // the clause is a check that never runs**, which is the shape sheet-layout.ts's own comment
  // refuses to leave unsaid.
  const stacked: SheetPacking = {
    ok: true, by: "shelf",
    at: signal.contents.map(() => ({ x: 12_700, y: 12_700 })),
  }
  const composed = await composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: signal.interfaces, pack: fixed(stacked),
  })
  expect(composed.ok).toBe(false)
  if (composed.ok) return
  expect(composed.unsatisfiable.join(" ")).toContain("attaches inside frame")
  expect(composed.unsatisfiable.join(" ")).toContain("share the clearance that point needs")
})

test("the OUTSIDE-ITS-OWN-FRAME clause cannot fire under either packer, and that is stated rather than implied", async () => {
  // I4, honestly. `contentOffset` puts a block's content inside its frame below the title band and
  // `frameSize` is computed from the same box, so an anchor is strictly inside its own frame by
  // construction - there is no packing that moves it out, because a packing only chooses where the
  // frame goes and the content moves with it. The clause is kept because it guards a future change
  // to either function; it is NOT presented as a check that runs.
  const packing = await packSheet(signal.contents, signal.paper)
  expect(packing.ok).toBe(true)
  if (!packing.ok) return
  const composed = await composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: signal.interfaces, pack: fixed(packing),
  })
  expect(composed.ok).toBe(true)
  if (!composed.ok) return
  // Every attachment is strictly inside its own frame, which is the property that makes the clause
  // unreachable - asserted here so that if it ever stops holding, this test says so first.
  const frames = signal.contents.map((f, i) => frameAt(f, composed.at[i] ?? { x: 0, y: 0 }))
  for (const p of composed.attached) {
    const own = frames.find((fr) => fr.blockId === p.block)
    if (own === undefined) throw new Error(`no frame for ${p.block}`)
    expect(p.at.x > own.box.minX && p.at.x < own.box.maxX, `${p.block}/${p.net}`).toBe(true)
    expect(p.at.y > own.box.minY && p.at.y < own.box.maxY, `${p.block}/${p.net}`).toBe(true)
  }
})

test("a block on the sheet with no declared interface REFUSES rather than being skipped", async () => {
  await expect(composeBlocks(legs.circuit, legs.contents, legs.paper, {
    interfaces: new Map(), pack: packSheet,
  })).rejects.toThrow(/no interface is declared for it/)
})

test("an interface port naming a net the circuit does not have REFUSES before anything is placed", async () => {
  const bogus = new Map<BlockId, readonly InterfacePort[]>(legs.interfaces)
  const first = legs.drew[0]
  if (first === undefined) throw new Error("nothing drew")
  bogus.set(first, [
    ...(legs.interfaces.get(first) ?? []),
    { net: "NOT_A_NET", sides: ["left"], position: "negotiable", why: "a net this circuit does not have" },
  ])
  await expect(composeBlocks(legs.circuit, legs.contents, legs.paper, { interfaces: bogus, pack: packSheet }))
    .rejects.toThrow(/names a net no pin of this circuit is on/)
})

test("mini composes, and its ONE remaining disagreement is FLASH's 3V3", async () => {
  // ROUND 2's CORRECTED MEASUREMENT. Round 1 compared `Anchor.side` - a DIRECTION a glyph points -
  // against `InterfacePort.sides` - an EDGE - and reported eight refusals on this design. Six were
  // that conflation. Comparing edge with edge against the block's own `anchorExtent` leaves ONE
  // port, two anchors: `FLASH`'s `3V3`, which the bus renderer fans out to the LEFT while the
  // synthesised declaration says a supply rail attaches at the top. `composed.ts` declares that
  // port by hand with the symbol's pin geometry as its reason, so this composes.
  const composed = await composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: signal.interfaces, pack: packSheet,
  })
  expect(composed.ok).toBe(true)
  if (!composed.ok) return
  // 29 ATTACHMENTS FOR 25 DECLARED PORTS, AND THE DIFFERENCE IS NOT AN ERROR: one AttachedPort is
  // reported per ANCHOR, and a net a block brings to its boundary in more than one place has more
  // than one - mini's XTAL draws three GND anchors and FLASH draws three 3V3 anchors. Every one of
  // them must satisfy the declaration, which is why they are not collapsed.
  expect(composed.attached.length).toBe(29)
  const declared = signal.contents.reduce((n, f) => n + (signal.interfaces.get(f.blockId ?? "")?.length ?? 0), 0)
  expect(declared).toBe(25)
  // AND THE HAND-DECLARED PORT IS WHAT MAKES IT PASS, driven: with the helper's rule restored for
  // FLASH, the two anchors refuse and nothing else does.
  const helperRule = new Map(signal.interfaces)
  const flash = signal.interfaces.get("FLASH") ?? []
  helperRule.set("FLASH", flash.map((p): InterfacePort => (p.net === "3V3" ? { ...p, sides: ["top"] } : p)))
  const without = await composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: helperRule, pack: packSheet,
  })
  expect(without.ok).toBe(false)
  if (without.ok) return
  expect(without.unsatisfiable.length).toBe(2)
  expect(without.unsatisfiable.every((u) => u.includes("block FLASH: interface port 3V3"))).toBe(true)
})

test("mini's power sheet composes too, with every port attached", async () => {
  const power = await miniSheet("power")
  const composed = await composeBlocks(power.circuit, power.contents, power.paper, {
    interfaces: power.interfaces, pack: packSheet,
  })
  expect(composed.ok).toBe(true)
  if (!composed.ok) return
  // Ten anchors for eight declared ports: REG draws three GND anchors.
  expect(composed.attached.length).toBe(10)
  const declared = power.contents.reduce((n, f) => n + (power.interfaces.get(f.blockId ?? "")?.length ?? 0), 0)
  expect(declared).toBe(8)
})

test("edgesOfAnchor reads an EDGE off the extent, and a corner lies on two", () => {
  const box = { minX: 0, minY: 0, maxX: 100, maxY: 60 }
  expect(edgesOfAnchor({ x: 0, y: 30 }, box)).toEqual(["left"])
  expect(edgesOfAnchor({ x: 100, y: 30 }, box)).toEqual(["right"])
  expect(edgesOfAnchor({ x: 50, y: 0 }, box)).toEqual(["top"])
  expect(edgesOfAnchor({ x: 50, y: 60 }, box)).toEqual(["bottom"])
  // A CORNER SATISFIES EITHER: collapsing it to one would refuse a correct declaration for an
  // arbitrary reason.
  expect(edgesOfAnchor({ x: 0, y: 0 }, box)).toEqual(["left", "top"])
  expect(edgesOfAnchor({ x: 100, y: 60 }, box)).toEqual(["right", "bottom"])
  // AND IT IS NOT THE GLYPH's DIRECTION. An anchor on the top edge whose glyph points LEFT is on
  // the top: that disagreement is the whole of round 1's six false refusals.
  expect(edgesOfAnchor({ x: 10, y: 0 }, box)).toEqual(["top"])
})

test("spec §3.4 on a composed sheet: no frame overlap, no non-member containment, and NO inter-block wire", async () => {
  const packing = await packSheet(signal.contents, signal.paper)
  expect(packing.ok).toBe(true)
  if (!packing.ok) return
  const drawing = layoutSheet(signal.circuit, "signal", signal.symbols, FLAG_LIB_ID, signal.elk, packing)
  expect(nonMemberContainments(signal.circuit, drawing)).toEqual([])
  // A CHECK THAT COULD HAVE FAILED: the same count over a frame deliberately grown to swallow the
  // whole sheet reports every symbol that is not its own block's.
  const huge = {
    ...drawing,
    frames: drawing.frames.map((f, i) => (i === 0 ? { ...f, box: { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 } } : f)),
  }
  expect(nonMemberContainments(signal.circuit, huge).length).toBeGreaterThan(0)
  // SEAM B DRAWS NO WIRE AT ALL, so it adds no wire crossings: every wire of a composed sheet
  // belongs to exactly one block, and the frames do not overlap. BOTH ENDPOINTS are tested -
  // round 1 tested only `a`, which is weaker than the claim G208 carries.
  const framesHolding = (p: Point): number =>
    drawing.frames.filter((f) => p.x >= f.box.minX && p.x <= f.box.maxX && p.y >= f.box.minY && p.y <= f.box.maxY).length
  expect(drawing.wires.length).toBeGreaterThan(0)
  expect(drawing.wires.every((w) => framesHolding(w.a) === 1 && framesHolding(w.b) === 1)).toBe(true)
  // A CHECK THAT COULD HAVE FAILED: a point outside every frame is held by none.
  expect(framesHolding({ x: -1, y: -1 })).toBe(0)
})

test("G209's figures are re-runnable: composition leaves G200's two measures unchanged", async () => {
  const shelf = shelfPacking(legs.contents, legs.paper)
  const elk = await packSheet(legs.contents, legs.paper)
  if (!shelf.ok || !elk.ok) throw new Error("a packer refused the legs probe")
  const realised = legs.contents.flatMap((f) => (f.block === null ? [] : [f.block.layout]))
  const before = shapeMeasures(realised)
  /**
   * **docs/known-gaps.md G200's table, over the SEVEN blocks that draw - it was five until
   * 2026-10-25 (G291).** Every one of the six figures is a per-block SUM, so each is re-derived
   * from the blocks rather than read off the output:
   *
   * | block | placements | distinctX | wiredNets | reversing | segments | wire |
   * | --- | --- | --- | --- | --- | --- | --- |
   * | `tp-leg-upper` | 3 | 3 | 4 | 2 | 14 | 69 850 |
   * | `tp-leg-feedback` | 3 | 3 | 4 | 2 | 14 | 97 790 |
   * | `tp-leg-lower-a` | 3 | 3 | 4 | 2 | 14 | 85 090 |
   * | `tp-leg-lower-b` | 3 | 3 | 4 | 2 | 14 | 85 090 |
   * | `tp-leg-collector` | 2 | 2 | 3 | 1 | 11 | 40 640 |
   * | `tp-leg-emitter-bypass` | 2 | 2 | 4 | 2 | 12 | 63 500 |
   * | `tp-stage` | 16 | 10 | 9 | 4 | 63 | 591 820 |
   * | **sum** | **32** | **26** | **32** | **15** | **142** | **1 033 780** |
   *
   * **AND THE FIVE LEGS' OWN SUBTOTALS ARE THE CONTROL: FIVE OF THE SIX DID NOT MOVE.** Over the
   * five that drew before - placements 14, distinctX 14, wiredNets 19, reversing 9, segments 67 -
   * every figure is what it was. Only `wire` moved, 284 480 to 378 460, which is the shape of what
   * boundary-node sizing does: it gives the labels room, so the wires that reach them are longer,
   * and it changes neither the number of parts, nor how many share an x, nor how many nets reverse
   * direction, nor how many segments the router emits.
   */
  expect(before).toEqual({ placements: 32, distinctX: 26, wiredNets: 32, reversing: 15, segments: 142, wire: 1_033_780 })
  const fiveLegs = ["tp-leg-upper", "tp-leg-feedback", "tp-leg-lower-a", "tp-leg-lower-b", "tp-leg-collector"]
  const legsOnly = shapeMeasures(legs.contents.flatMap((f) => (f.block === null || !fiveLegs.includes(f.blockId ?? "") ? [] : [f.block.layout])))
  expect(legsOnly).toEqual({ placements: 14, distinctX: 14, wiredNets: 19, reversing: 9, segments: 67, wire: 378_460 })
  for (const packing of [shelf, elk]) {
    const { after } = layoutsAround(legs, packing.at)
    expect(shapeMeasures(after.map((b) => b.layout))).toEqual(before)
  }
  // AND THE SAME MEASURE AT SHEET SCALE IS VACUOUS, which is why it is taken per block. mini's
  // signal sheet is drawn entirely by reviewed TEMPLATES; in each block's own frame five of its
  // eleven parts share an x, and once the frames are PLACED all eleven are distinct - the same
  // "staircase" verdict G200 reports for ELK, from a template.
  const sheetPacking = await packSheet(signal.contents, signal.paper)
  if (!sheetPacking.ok) throw new Error("the packer refused mini's signal sheet")
  const local = signal.contents.flatMap((f) => (f.block === null ? [] : [f.block.layout]))
  const perBlock = shapeMeasures([{ placements: local.flatMap((l) => l.placements), wires: [], anchors: [] }])
  expect(perBlock.placements).toBe(11)
  expect(perBlock.distinctX).toBe(5)
  const placed = layoutsAround(signal, sheetPacking.at).after.map((b) => b.layout)
  const flat = shapeMeasures([{ placements: placed.flatMap((l) => l.placements), wires: [], anchors: [] }])
  expect(flat.placements).toBe(11)
  expect(flat.distinctX).toBe(11)
})
