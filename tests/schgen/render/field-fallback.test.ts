/**
 * **WHAT THE FIELD PLACER DOES WHEN NO CANDIDATE SLOT IS CLEAR, and the four things that keep the
 * answer from being a silent degradation** - Task 24 of the M1 schematic-authoring plan.
 *
 * It used to refuse the block, which is the one behaviour no source in
 * `docs/schematic/text-placement-prior-art.md` has: the literature's greedy placers drop the
 * label, draw it overlapping, or ask a person, and KiCad's own field autoplacer cannot fail. It now
 * takes the least-covered candidate. **The risk of that change is that a visible failure becomes an
 * invisible one**, so these cases drive, in order: that a blocked unit is placed at all; that the
 * placement is the LEAST-covered candidate rather than the first; that the overlap is recorded on
 * the unit; that the text-clearance pass deliberately does not re-report it; and that
 * `RENDER-REPORT.md` does.
 *
 * **EVERY CASE HAS A CONTROL THAT PASSES AND COULD HAVE ANSWERED DIFFERENTLY** (`docs/known-gaps.md`
 * **G241**): an unobstructed scene places with no fallback, the same six wires without the label
 * choose the FIRST candidate, two unflagged texts over each other DO produce a problem, and an
 * empty fallback list renders `None.`
 */
import { describe, expect, it } from "bun:test"
import { blockCircuit, cap, symbols } from "../__fixtures__/circuits.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { placeFields, type FieldScene } from "../../../lib/schgen/render/field-placement.ts"
import { createOccupancy, MARK_WEIGHT } from "../../../lib/schgen/render/occupancy.ts"
import { GRID, type Point, type Side } from "../../../lib/schgen/render/geometry.ts"
import type { Box } from "../../../lib/schgen/render/lib-pins.ts"
import type { Wire } from "../../../lib/schgen/render/block-types.ts"
import type { GlobalLabel } from "../../../lib/schgen/render/sheet-types.ts"
import { textProblems, type TextScene } from "../../../lib/schgen/render/text-scene.ts"
import { renderReport, type RenderReport } from "../../../lib/schgen/report.ts"
import {
  besidePinFields, labelBox, OUTSIDE_SLOTS, reservedReference, slotFields, textBox, type Fields,
} from "../../../lib/schgen/render/text-boxes.ts"

/** The one `Fix:C` of a single-unit block, placed at the origin upright. */
const PLACEMENT = { part: "C1", unit: 1, at: { x: 0, y: 0 }, rot: 0 } as const

function oneCapScene(wires: readonly Wire[], labels: readonly GlobalLabel[] = []): FieldScene {
  const c = blockCircuit([cap("C1", "N1", "N2")], { kind: "bus", groups: [] }, { external: [] })
  const g = subgraphOf(c, "B", symbols)
  return { block: "B", units: g.units, placements: [PLACEMENT], wires, powers: [], labels, libs: symbols }
}

const placedCap = (wires: readonly Wire[], labels: readonly GlobalLabel[] = []) => {
  const u = placeFields(oneCapScene(wires, labels)).find((p) => p.key === "C1#1")
  if (u === undefined) throw new Error("C1#1 was not placed")
  return u
}

/**
 * The six outside candidate slots of the placed unit, in the order `candidates()` offers them.
 * Derived from the placed geometry rather than written as coordinates, so a change to `slotFields`
 * or `besidePinFields` moves them with it.
 */
function outsideCandidates(body: Box, pins: readonly { readonly a: Point }[]): Fields[] {
  const tips = new Map<Side, readonly Point[]>([
    ["right", pins.filter((s) => s.a.x > body.maxX).map((s) => s.a)],
    ["up", pins.filter((s) => s.a.y < body.minY).map((s) => s.a)],
    ["left", pins.filter((s) => s.a.x < body.minX).map((s) => s.a)],
    ["down", pins.filter((s) => s.a.y > body.maxY).map((s) => s.a)],
  ])
  return [
    ...OUTSIDE_SLOTS.filter((s) => (tips.get(s) ?? []).length === 0).map((s) => slotFields(body, s)),
    ...OUTSIDE_SLOTS.flatMap((s) => besidePinFields(body, s, tips.get(s) ?? [])),
  ]
}

/** One short horizontal wire through the middle of each candidate's Reference box. */
const wiresAcrossReferences = (candidates: readonly Fields[]): Wire[] =>
  candidates.map((f, i) => {
    const b = textBox(f.reference, reservedReference("C"))
    const y = Math.round((b.minY + b.maxY) / 2)
    return { a: { x: b.minX - GRID, y }, b: { x: b.maxX + GRID, y }, net: `BLOCK${i}` }
  })

describe("a unit with no clear field slot", () => {
  const clean = placedCap([])
  const candidates = outsideCandidates(clean.body, clean.pins)
  const wires = wiresAcrossReferences(candidates)

  it("CONTROL: an unobstructed scene places on the first pin-free side and records no fallback", () => {
    expect(clean.fallback).toBeNull()
    expect(clean.inside).toBe(false)
    expect(clean.fields).toEqual(slotFields(clean.body, "right"))
  })

  it("has exactly the six outside candidates this case blocks, and the five inside slots are not among them", () => {
    // The five inside slots cannot hold a 4 x GRID pair inside a 2032 um body (G239), so blocking
    // the six outside candidates is blocking everything. Asserted here so that a change to the
    // candidate set fails this file rather than quietly making the cases below prove less.
    expect(candidates).toHaveLength(6)
    expect(wires).toHaveLength(6)
  })

  it("is PLACED rather than refused, at one of the blocked candidates, and carries the fallback", () => {
    const u = placedCap(wires)
    expect(u.fallback).not.toBeNull()
    const fallback = u.fallback
    if (fallback === null) throw new Error("unreachable: asserted not null above")
    expect(fallback.block).toBe("B")
    expect(fallback.key).toBe("C1#1")
    expect(fallback.libId).toBe("Fix:C")
    expect(fallback.cost).toBeGreaterThan(0)
    // It names what it covers, as the drawing names it: one of the wires this case laid down.
    expect(fallback.covers.some((c) => /^wire \d+ \(BLOCK\d+\)$/.test(c))).toBe(true)
    // And it is one of the candidates, not some new position invented to escape.
    expect(candidates).toContainEqual(u.fields)
  })

  /**
   * **THE LEAST-COVERED CANDIDATE, NOT THE FIRST.** One label is laid over the whole of the first
   * candidate's Reference box: it is a MARK, so it weighs `MARK_WEIGHT`, and its area dwarfs a
   * wire's. The pair is one label apart - same unit, same six wires - so the control is the same
   * drive with the label removed.
   */
  it("moves off the candidate it would have chosen when a label is laid over that one", () => {
    // **THE PAIR IS ONE LABEL APART**, and which candidate the wires alone choose is READ rather
    // than predicted: the six wires do not cost the same, because a beside-pin slot and a
    // pin-free-side slot sit against different obstacle sets. The first draft of this case asserted
    // the preference order's first candidate and was wrong, which is why the label goes over
    // whichever one actually wins.
    const withoutLabel = placedCap(wires)
    expect(withoutLabel.fallback, "CONTROL: all six candidates are covered, so this is a fallback either way").not.toBeNull()
    const ref = textBox(withoutLabel.fields.reference, reservedReference("C"))
    const label: GlobalLabel = { net: "LONGLABELNAME", at: { x: ref.minX, y: Math.round((ref.minY + ref.maxY) / 2) }, side: "right", refs: "" }
    // The label really does cover that candidate's Reference box, so the case is about the cost and
    // not about a label that happens to sit elsewhere.
    const lb = labelBox(label)
    expect(lb.minX <= ref.minX && lb.maxX >= ref.maxX).toBe(true)

    const withLabel = placedCap(wires, [label])
    expect(withLabel.fields, "a MARK over it makes that candidate no longer least-covered").not.toEqual(withoutLabel.fields)
    expect(candidates, "and the one it moves to is still one of the candidates").toContainEqual(withLabel.fields)
    expect(withLabel.fallback?.covers.some((c) => /^wire \d+ \(BLOCK\d+\)$/.test(c))).toBe(true)
  })
})

describe("the weighted overlap cost", () => {
  it("is area times the category's weight, and a mark weighs twice a body", () => {
    const box = { minX: 0, minY: 0, maxX: 10, maxY: 4 }
    const bodies = createOccupancy(1)
    const marks = createOccupancy(MARK_WEIGHT)
    bodies.add(box)
    marks.add(box)
    expect(bodies.overlap({ minX: 0, minY: 0, maxX: 5, maxY: 4 })).toBe(20)
    expect(marks.overlap({ minX: 0, minY: 0, maxX: 5, maxY: 4 })).toBe(40)
    expect(MARK_WEIGHT).toBe(2)
  })
})

/**
 * **THE EXEMPTION, AND WHY IT IS NOT A HOLE.** A fallback field's overlaps are not reported by
 * `textProblems`, because the placer already decided this text has nowhere clear to go and
 * reporting it again would re-refuse the drawing the fallback exists to produce. The frame-border
 * clause is the one thing it is NOT exempt from: crossing a border is text leaving its own block.
 */
describe("text clearance and a fallback field", () => {
  const a = { what: "Reference of C1#1", box: { minX: 0, minY: 0, maxX: 10, maxY: 10 } }
  const b = { what: "label NET at (0, 0)", box: { minX: 5, minY: 5, maxX: 15, maxY: 15 } }
  const scene = (texts: TextScene["texts"], frames: TextScene["frames"] = []): TextScene => ({
    scope: "t", texts, segments: [], bodies: [], pinTexts: [], strokes: [], frames, crosses: [],
  })

  it("CONTROL: two texts neither of which is a fallback DO overlap", () => {
    expect(textProblems(scene([a, b]))).toEqual(["Reference of C1#1 overlaps label NET at (0, 0)"])
  })

  it("reports nothing when the first is a fallback, and nothing when the second is", () => {
    expect(textProblems(scene([{ ...a, fallback: true }, b]))).toEqual([])
    expect(textProblems(scene([a, { ...b, fallback: true }]))).toEqual([])
  })

  it("still reports a fallback field that crosses a frame border", () => {
    const frames = [{ what: 'frame "F"', box: { minX: 5, minY: 5, maxX: 100, maxY: 100 } }]
    expect(textProblems(scene([{ ...a, fallback: true }], frames))).toEqual([
      'Reference of C1#1 crosses the border of frame "F"',
    ])
  })
})

describe("RENDER-REPORT.md", () => {
  const report = (fallbacks: RenderReport["fieldFallbacks"]): RenderReport => ({
    blocks: [], sheets: [], measures: [], ncUnlisted: [], fieldFallbacks: fallbacks,
  })

  it("CONTROL: a generation with no fallback renders the section as None.", () => {
    const text = renderReport(report([{ sheet: "main", fallbacks: [] }]))
    expect(text).toContain("## Field placements the placer could not keep clear")
    const section = text.split("## Field placements the placer could not keep clear")[1] ?? ""
    expect(section.split("##")[0]?.trim()).toBe("None.")
  })

  it("names the sheet, the block, the unit, the symbol and what it covers", () => {
    const text = renderReport(
      report([
        {
          sheet: "main",
          fallbacks: [{ block: "pt-core", key: "C7#1", libId: "Device:C", cost: 1234, covers: ["wire 70 (Net-(C7-Pad1))", "label VCC"] }],
        },
      ]),
    )
    expect(text).toContain("**1 field pair(s) on this generation's sheets are drawn over something.**")
    expect(text).toContain("| main | pt-core | C7#1 | Device:C | wire 70 (Net-(C7-Pad1)); label VCC | 1234 |")
    expect(text, "a sheet with a row here is not a clean sheet, and the report says so").toContain("is not a clean")
  })
})
