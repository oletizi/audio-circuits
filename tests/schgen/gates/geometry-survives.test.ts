/**
 * **A GATE MAY REFUSE TO RATIFY A DRAWING AND MUST NOT HIDE IT: the plumbing Task 3 of
 * `docs/superpowers/plans/2026-10-27-gates-classify.md` built, guarded.**
 *
 * Hand-written for Task 3's fix round 1, Item 3. The task widened `RealiseResult`, `Selection`,
 * `BusResult`, `FrameContent`, `SheetDrawing` and `Generation` to carry geometry and classified
 * findings through a refusal, and **nothing in the suite could have failed if any link in that
 * chain were cut** - the full-suite count stayed at 3896 because no test named any of the new
 * functions. That is what this file is for.
 *
 * The owner, on four boards that refuse and have never been looked at: *"this is a persistent
 * pathology: a gate halts rendering and we never look at the picture so we can't tell if the gate
 * is insane or not"*. His line between the two serious classes: a drawing WRONG ABOUT THE CIRCUIT
 * must not be built from; a drawing CORRECT BUT HARD TO READ is *"ugly but usable"* and ships.
 *
 * **THE REFUSALS HERE ARE REAL, AND NOT A STUB BACKEND RETURNING A SHAPE.** `connector-fanout` is
 * the only template in the set that draws before it refuses - it lays out all four rotations and
 * runs `checkLayout` on each - and `tests/schgen/render/templates/connector-fanout.test.ts` already
 * carries two committed fixtures for it: `EAR`, whose outline overhangs its own pin so every
 * rotation collides, and an anchorless block, which refuses before anything is drawn. **Those two
 * are exactly the pair this task's distinction turns on**, so the geometry, the findings and the
 * classes asserted below are the ones the production path produces rather than ones a fixture
 * handed it.
 *
 * **WHAT IS NOT COVERED HERE, said rather than left to be discovered.** `lib/schgen/elk/adapt.ts`'s
 * junction arm - the one that refuses on a branch point with no junction - is not TRIGGERED by any
 * test, here or anywhere. No block in the corpus takes it, and firing it needs an ELK graph built
 * to make `junctionPoints` and `branchJunctions` disagree, which `docs/known-gaps.md` **G293**
 * reconciled deliberately; fabricating one would be a fixture written to produce a verdict. What IS
 * covered is the arm's OUTPUT contract - `junctionArmShape` below is the exact `RealiseResult` it
 * constructs, and it is asserted to carry its geometry and to classify `defective` rather than
 * `usable`. The arm's own two lines are covered by reading only.
 */

import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { classOf, worstClass, finding, SchgenRefusal, type Finding, type FindingKind, type RefusalClass } from "../../../lib/schgen/findings.ts"
import {
  ELK_RENDERER, findingKindOfMismatch, invalidGeometry, mismatchFindings, notApplicable, refusedLayout,
  type BlockLayout, type Mismatch, type MismatchKind, type RealiseResult,
} from "../../../lib/schgen/render/block-types.ts"
import { checkLayout, realiseBlock, realiseBlockReported, selectRenderer, subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { TEMPLATES } from "../../../lib/schgen/render/templates/index.ts"
import { renderBlock } from "../../../lib/schgen/render/bus.ts"
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts"
import { assertSheetSafe, sheetSafety, type SheetScene } from "../../../lib/schgen/render/sheet-check.ts"
import { anchorsToSymbols, valuesAlong } from "../../../lib/schgen/render/power-text.ts"
import { blockCircuit, res, symbols } from "../__fixtures__/circuits.ts"
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts"
import { GRID, type Point } from "../../../lib/schgen/render/geometry.ts"
import { boardRefs, declarationFor } from "../../../tools/schgen/board-sheets.ts"
import { caseResolver } from "../../../tools/schgen/authoring-census.ts"
import { parityDesign } from "../../../tools/schgen/gate-census.ts"
import { generate, type GenerateEnv } from "../../../tools/schgen/generate.ts"
import { stockSymbolDir } from "../../../lib/schgen/render/library.ts"
import { moduleRepoRoot } from "../../../tools/perfboard/repo-root.ts"
import type { Circuit, PartSpec, Rendering } from "../../../lib/schgen/ir/types.ts"

const FANOUT: Rendering = { kind: "wired", template: "connector-fanout", anchor: { part: "J_USB", unit: 1, roles: {} } }

const conn = (nets: [string, string, string, string]): PartSpec => ({
  label: "J_USB", refPrefix: "J", libId: "Fix:CONN4", units: [1], value: "CONN4", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: Object.fromEntries(nets.map((n, i) => [String(i + 1), { net: n, identity: `P${i + 1}` }])),
})

/**
 * `EAR`'s outline overhangs its own pin, so the pin's label lands on its body in every rotation:
 * `connector-fanout` draws four layouts, `checkLayout` refuses all four, and the template reports a
 * `clearance` mismatch. **The drawing it made is the thing this task exists to stop losing.**
 */
function collidingCircuit(): Circuit {
  const ear: PartSpec = { ...conn(["A", "A", "A", "A"]), libId: "Fix:EAR", value: "EAR", pins: { "1": { net: "A", identity: "P" } } }
  return blockCircuit([ear], FANOUT, { external: ["A"] })
}

/** The same template with no anchor: a SHAPE verdict, taken before anything is drawn. */
const anchorlessCircuit = (): Circuit => blockCircuit([conn(["A", "B", "C", "GND"])], { ...FANOUT, anchor: null }, { external: ["A", "B", "C"] })

/** A connector fan-out that draws cleanly - the control, and the geometry the sheet gate runs on. */
const cleanCircuit = (): Circuit =>
  blockCircuit([conn(["DP", "CC", "DP", "GND"]), res("R_CC", "CC", "GND")], FANOUT, { external: ["DP"] })

/** The findings `checkLayout` reports on `EAR`'s rotation-0 drawing, read from the production path. */
function collidingFindings(): readonly Finding[] {
  const c = collidingCircuit()
  const chosen = selectRenderer(subgraphOf(c, "B", symbols), TEMPLATES)
  expect(chosen.kind, "the EAR fixture must still make connector-fanout refuse, or this file is about nothing").toBe("refused")
  if (chosen.kind !== "refused") throw new Error("unreachable: the expect above fails first")
  // **THE TEMPLATE CARRIES BOTH, and before fix round 1 it carried neither.** `connector-fanout`
  // had the rotation-0 layout and `checkLayout`'s own `Finding[]` in hand and kept only the problem
  // TEXT, so `selectRenderer` forwarded a refusal with nothing to hand back and `blocks.ts` threw.
  expect(chosen.layout, "the refusal must carry the geometry the template drew").not.toBeUndefined()
  expect(chosen.findings, "the refusal must carry checkLayout's own findings").not.toBeUndefined()
  const findings = chosen.findings ?? []
  expect(findings.length).toBeGreaterThan(0)
  return findings
}

// ---------------------------------------------------------------------------------------------
// The vocabulary: the mismatch-to-finding mapping, and the accessor that reads a refusal.
// ---------------------------------------------------------------------------------------------

/**
 * **EVERY `MismatchKind` MAPS TO A `FindingKind` WHOSE CLASS IS THE OWNER'S LINE.** The table is
 * written out rather than derived from the function, so changing the mapping in `block-types.ts`
 * cannot change what this test expects of it.
 */
test("each mismatch kind maps to a finding kind, and to the class the owner's line gives it", () => {
  const expected: readonly [MismatchKind, FindingKind, RefusalClass][] = [
    ["not-applicable", "no-template-applies", "not-drawable"],
    ["invalid-geometry", "geometry-disagrees-with-ir", "defective"],
    ["clearance", "body-clearance", "usable"],
    ["backend-raised", "backend-raised", "generator-defect"],
  ]
  for (const [mismatch, kind, cls] of expected) {
    expect(findingKindOfMismatch(mismatch), `${mismatch} maps to ${kind}`).toBe(kind)
    expect(classOf(kind), `${kind} is ${cls}`).toBe(cls)
  }
  // The rows are the whole union, so a fifth kind added without one here is not quietly accepted.
  expect(expected.map(([m]) => m).sort()).toEqual(["backend-raised", "clearance", "invalid-geometry", "not-applicable"])
})

test("mismatchFindings prefers the producer's own findings and is never empty", () => {
  const m: Mismatch = { kind: "clearance", reason: "crowded", constraint: "overlaps", obstacles: ["a", "b"], block: "B" }
  const carried: readonly Finding[] = [finding("text-clearance", "a overlaps b", "block B")]
  // Carried wins: eleven classified facts must not collapse into one synthesised body-clearance.
  expect(mismatchFindings("block B", m, carried)).toEqual(carried)
  // None carried: exactly one finding, from the table above, so no refusal reaches the census
  // without a class. An empty array is the same case as an absent one.
  for (const none of [undefined, []]) {
    const made = mismatchFindings("block B", m, none)
    expect(made).toHaveLength(1)
    expect(made[0]?.kind).toBe("body-clearance")
    expect(made[0]?.where).toBe("block B")
    expect(made[0]?.what).toContain("crowded")
  }
})

test("refusedLayout reads the geometry of a refusal, and null when the renderer drew nothing", () => {
  const layout = realiseBlock(cleanCircuit(), "B", symbols)
  expect(refusedLayout({ ok: true, layout })).toBe(layout)
  expect(refusedLayout(junctionArmShape(layout))).toBe(layout)
  expect(refusedLayout(notApplicable("no template fits")), "a shape verdict drew nothing").toBeNull()
})

/**
 * The `RealiseResult` `lib/schgen/elk/adapt.ts`'s junction arm constructs. See this file's header
 * for what asserting over it does and does not establish.
 */
const junctionArmShape = (layout: BlockLayout): RealiseResult =>
  invalidGeometry(ELK_RENDERER, "B: net GND branches", "the junctions the sheet emitter would place disagree", {
    layout,
    findings: [finding("missing-junction", "net GND branches at (0, 6.35) (T) and no junction is emitted there", "block B")],
  })

/**
 * **A MISSING JUNCTION MUST NOT COME OUT OF THIS CHAIN AS MERELY UGLY.** `CLAUDE.md` names it as
 * the one class that must keep refusing, because it makes a drawing WRONG ABOUT THE CIRCUIT - and
 * the whole risk of carrying geometry through a refusal is that a `defective` drawing starts
 * looking like a `usable` one.
 */
test("the junction arm's refusal carries its drawing and classifies it defective", () => {
  const layout = realiseBlock(cleanCircuit(), "B", symbols)
  const r = junctionArmShape(layout)
  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(refusedLayout(r)).toBe(layout)
  const findings = mismatchFindings("block B", r.mismatch, r.findings)
  expect(findings.map((f) => f.kind)).toEqual(["missing-junction"])
  expect(worstClass(findings)).toBe("defective")
})

// ---------------------------------------------------------------------------------------------
// The chain: a real refusal that drew something reaches a caller with that drawing intact.
// ---------------------------------------------------------------------------------------------

/**
 * **THE ONE TEST THIS WHOLE TASK EXISTS FOR.** Before it, `connector-fanout`'s clearance refusal
 * threw and the four layouts it had already drawn were discarded - the owner's *"a gate halts
 * rendering and we never look at the picture so we can't tell if the gate is insane or not"*. The
 * layout is asserted present and `checkLayout`-consistent, not merely non-null: the findings the
 * caller receives must be the ones that gate reports on the geometry it receives, or the drawing
 * and its classification are two different things.
 */
test("a clearance refusal that drew something reaches realiseBlockReported with the drawing intact", () => {
  const c = collidingCircuit()
  const g = subgraphOf(c, "B", symbols)
  const expected = collidingFindings()
  const r = realiseBlockReported(c, "B", symbols)
  expect(r.findings).toEqual(expected)
  expect(checkLayout(g, r.layout), "the findings must be about the geometry that came back").toEqual(expected)
  expect(worstClass(r.findings), "text crowding is ugly but usable, and ships").toBe("usable")
  expect(r.refusal).toContain("connector-fanout found no rotation without collisions")
  expect(r.layout.placements.length, "a drawing came back, not an empty one").toBeGreaterThan(0)
})

test("realiseBlock still refuses on those findings, typed, so the strict callers keep their gate", () => {
  const expected = collidingFindings()
  const thrown = caught(() => realiseBlock(collidingCircuit(), "B", symbols))
  expect(thrown).toBeInstanceOf(SchgenRefusal)
  if (!(thrown instanceof SchgenRefusal)) return
  expect(thrown.findings).toEqual(expected)
  expect(thrown.message).toContain("connector-fanout found no rotation without collisions")
})

/**
 * **NOTHING DRAWN MEANS A THROW, AND IT IS THE DISTINCTION THE SPEC'S FOUR CLASSES TURN ON.** An
 * anchorless block is a shape verdict taken before any geometry exists, so there is no picture
 * being hidden and nothing to hand back - `not-drawable`, where the artifact is the refusal itself.
 */
test("a refusal that drew nothing still throws, and throws a classified SchgenRefusal", () => {
  const thrown = caught(() => realiseBlockReported(anchorlessCircuit(), "B", symbols))
  expect(thrown).toBeInstanceOf(SchgenRefusal)
  if (!(thrown instanceof SchgenRefusal)) return
  expect(thrown.findings.map((f) => f.kind)).toEqual(["no-template-applies"])
  expect(worstClass(thrown.findings)).toBe("not-drawable")
  expect(thrown.message).toContain("connector-fanout needs an anchor")
})

test("renderBlock carries the findings, so frames.ts and sheets.ts can reach them", () => {
  const expected = collidingFindings()
  const r = renderBlock(collidingCircuit(), "B", symbols)
  expect(r.findings).toEqual(expected)
  expect(checkLayout(subgraphOf(collidingCircuit(), "B", symbols), r.layout)).toEqual(expected)
})

/**
 * **THE FINDINGS REACH THE DRAWING, AND THE DRAWING IS COMPLETE.** A non-empty `findings` means
 * UNRATIFIED, never ABSENT: every other field of the `SheetDrawing` is populated exactly as it is
 * for a clean sheet, which is the directive - *"the output should still be available, but clearly
 * classified as unratified"*. Before this task `layoutSheet` threw on this circuit and produced no
 * sheet at all.
 */
test("layoutSheet draws the sheet of a refused block and carries its findings onto the drawing", () => {
  const expected = collidingFindings()
  const drawing = layoutSheet(collidingCircuit(), "s", symbols, "Pwr:PWR_FLAG")
  for (const f of expected) expect(drawing.findings, `the sheet carries ${f.kind}: ${f.what}`).toContainEqual(f)
  expect(worstClass(drawing.findings)).toBe("usable")
  expect(drawing.symbols.length, "the sheet is drawn, not withheld").toBeGreaterThan(0)
  expect(drawing.frames.length).toBeGreaterThan(0)
})

test("a sheet the gates pass carries no findings, so clean and unratified are distinguishable", () => {
  const drawing = layoutSheet(cleanCircuit(), "s", symbols, "Pwr:PWR_FLAG")
  expect(drawing.findings).toEqual([])
  expect(worstClass(drawing.findings)).toBe("usable")
})

// ---------------------------------------------------------------------------------------------
// The sheet-level gate, and the short circuit the call site must not lose.
// ---------------------------------------------------------------------------------------------

/**
 * **WIRE SAFETY SHORT-CIRCUITS BODY CLEARANCE, AT THE CALL SITE AS WELL AS INSIDE `sheetSafety`.**
 * Round 1 of Task 3 built the sheet's findings in an array literal, which evaluates both passes
 * unconditionally and so ran the text pass over a sheet whose connectivity was already rejected -
 * where `blockFields` can throw a PLAIN `Error` the census would read as a `generator-defect`. A
 * classified refusal must not be overtaken by an unclassified one.
 */
/**
 * One block's sheet scene, **with its anchors turned into the power symbols and global labels
 * `sheets.ts` would place**. Without them every anchor-terminated wire reads as a dangling end -
 * three of them on the clean fixture, measured - so a scene built from the bare layout would make
 * the "clean" case below assert nothing and the "dangling" case pass on the wrong wires.
 */
function sceneOf(c: Circuit, layout: BlockLayout): SheetScene {
  const g = subgraphOf(c, "B", symbols)
  const { powers, labels } = anchorsToSymbols(g, layout.anchors, valuesAlong(g.block.rendering))
  return { sheet: "s", symbols, blocks: [{ g, layout }], powers, labels }
}

test("sheetSafety reports wire safety alone when the sheet's connectivity is already wrong", () => {
  const c = cleanCircuit()
  const layout = realiseBlock(c, "B", symbols)
  const stray: Point = { x: 400 * GRID, y: 400 * GRID }
  const dangling: BlockLayout = {
    ...layout,
    // A wire from nowhere to nowhere: neither end touches a pin, an anchor or another wire.
    wires: [...layout.wires, { a: stray, b: { x: stray.x + 2 * GRID, y: stray.y }, net: "DP" }],
  }
  const scene = sceneOf(c, dangling)
  const found = sheetSafety(scene)
  // Exactly the two ends of the wire this fixture added, and nothing else: the control below proves
  // the same scene without it is clean, so these findings are this wire's.
  expect(found.findings).toHaveLength(2)
  // Only the wire-safety batch: no body-clearance or glyph-clearance finding may appear beside
  // them, because the body pass must not have run at all.
  expect([...new Set(found.findings.map((f) => f.kind))].sort()).toEqual(["dangling-end"])
  expect(found.message).toContain("wire safety:")
  // And the throwing wrapper throws exactly that, so the two forms cannot drift apart.
  expect(() => assertSheetSafe(scene)).toThrow(SchgenRefusal)
  expect(() => assertSheetSafe(scene)).toThrow(/^sheet s: wire safety:/)
})

test("sheetSafety is empty and silent on a sheet the gates pass", () => {
  const c = cleanCircuit()
  const scene = sceneOf(c, realiseBlock(c, "B", symbols))
  expect(sheetSafety(scene).findings).toEqual([])
  expect(sheetSafety(scene).message).toBe("")
  expect(() => assertSheetSafe(scene)).not.toThrow()
})

// ---------------------------------------------------------------------------------------------
// End to end, on a real board: Task 3's acceptance probe, committed.
// ---------------------------------------------------------------------------------------------

/**
 * **`transistor-preamp-buffered` IS ONE OF THE FOUR BOARDS NOBODY HAS EVER SEEN A DRAWING OF**, and
 * before Task 3 it reached its caller as a plain `Error` whose message was one sentence. The spec's
 * rule is that an untyped error reaching the census is a `generator-defect` and FAILS the run, so
 * this board - an ordinary crowded drawing - would have been reported as a bug in the generator.
 *
 * `kicadVersion` is a literal and not `kicadVersion()`: with `acceptToolchain` the lock is written
 * fresh from whatever is passed, so the string is never compared against an installed KiCad and
 * this test needs no toolchain. Nothing is written outside a fresh temp directory.
 */
test("a real crowded board refuses as a typed, usable SchgenRefusal naming every overlap", async () => {
  const repoRoot = moduleRepoRoot()
  const board = boardRefs(repoRoot).find((b) => b.name === "transistor-preamp-buffered")
  if (board === undefined) throw new Error("boards/transistor-preamp-buffered is not in boards/; this test names it deliberately")
  const declared = declarationFor(board)
  if (declared === null) throw new Error(`no SchematicAuthoring declaration for ${board.export}(); it had one when this test was written`)
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "geometry-survives-"))
  try {
    const design = { ...parityDesign(declared, caseResolver([declared]), repoRoot, outDir) }
    const env: GenerateEnv = { kicadVersion: "9.0.0", stockDir: stockSymbolDir(), initLock: true, acceptToolchain: true }
    const thrown = await caughtAsync(async () => {
      await generate(design, env)
    })
    expect(thrown, "this board refuses today; if it stops refusing, say so rather than relaxing this").toBeInstanceOf(SchgenRefusal)
    if (!(thrown instanceof SchgenRefusal)) return
    // Crowding, not incorrectness: the owner's "ugly but usable". If this ever reads `defective` or
    // `generator-defect`, the classification changed and somebody must look at why.
    expect(worstClass(thrown.findings)).toBe("usable")
    expect([...new Set(thrown.findings.map((f) => f.kind))]).toEqual(["text-clearance"])
    // Two, not one: the block-level gate named a single power-symbol value, and the sheet-level pass
    // finds the second instance of the same block. That difference is why Task 3 had to give the
    // sheet gates non-throw paths rather than only preserving the block geometry.
    expect(thrown.findings.length).toBeGreaterThanOrEqual(2)
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true })
  }
})

/** The value a call threw, or `null`. Returning it beats `toThrow`, which cannot inspect findings. */
function caught(run: () => unknown): unknown {
  try {
    run()
    return null
  } catch (e) {
    return e
  }
}

async function caughtAsync(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run()
    return null
  } catch (e) {
    return e
  }
}
