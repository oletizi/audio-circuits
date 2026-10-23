/**
 * **A VALUE THAT IS ONLY THE SYMBOL'S OWN PART NAME IS EMITTED, MARKED HIDDEN, AND NOT GIVEN ROOM
 * ON THE SHEET** - the three halves of Task 21's change, each with a control that could have
 * answered differently.
 *
 * **WHERE THIS CAME FROM, because the lesson is better than the fix.** Three rounds of this branch
 * treated `Jumper:Jumper_2_Open`'s thirteen-character Value field as a constraint to route around:
 * `docs/known-gaps.md` **G232** measured that its grown field pair is **17780 um wide against a
 * capacitor's 6350**, 2.8x, *"from a stated decision rather than from a defect"*, and **G239**
 * concluded the fix *"is not narrow"*. The owner asked: *"has it occurred to you that extremely
 * long labels are pathological?"* It had not. The label carries nothing a builder needs - the
 * symbol already draws a two-pin open jumper - and demanding adjacent space for it was the defect.
 *
 * **THE PREDICATE IS NOT ABOUT LENGTH, AND THESE CASES ARE BUILT TO PROVE THAT.** The two field
 * cases below drive a ONE-CHARACTER value, `Fix:D`'s own `"D"`, against a one-character control,
 * `"X"`, through **identical geometry and the identical blocking wires**. The only difference
 * between the two drives is whether the value is the symbol's part name, and they answer
 * differently. A rule keyed on length, on the substring "Jumper" or on a whitelist of kinds would
 * pass neither.
 *
 * **WHAT IT DOES NOT FIX, and the register says it too (G232, G239).** The hard case those entries
 * measured is a CAPACITOR - `Device:C`, grown pair 6350 x 5080, 0 of 5 inside slots - whose value
 * `100nF` is a real electrical parameter that MUST be drawn. **Nothing here helps that case**, and
 * `tests/schgen/render/field-slots.test.ts`'s arithmetic over `Fix:C` (value `"100n"`, not a part
 * name) is untouched by this change and is the standing check that it is not.
 */
import { describe, expect, it } from "bun:test"
import { parse, type SList } from "../../../lib/kicad/sexpr.ts"
import { blockCircuit, cap, diode, symbols } from "../__fixtures__/circuits.ts"
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts"
import type { BlockLayout, Wire } from "../../../lib/schgen/render/block-types.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { partSymbol, type ItemScope } from "../../../lib/schgen/render/emit-items.ts"
import { placeFields, type FieldScene } from "../../../lib/schgen/render/field-placement.ts"
import { GRID, growBox, segmentHitsBox, type Point, type Side } from "../../../lib/schgen/render/geometry.ts"
import type { Box } from "../../../lib/schgen/render/lib-pins.ts"
import { print } from "../../../lib/schgen/render/sexpr-write.ts"
import { besidePinFields, OUTSIDE_SLOTS, slotFields, textBox, type Fields } from "../../../lib/schgen/render/text-boxes.ts"
import { textScene } from "../../../lib/schgen/render/text-scene.ts"

/** `placeFields`'s clearance around a candidate field: half a text line. Transcribed, not imported - it is private there. */
const MARGIN = GRID / 2

/** The one diode of a single-unit block, placed at the origin upright. */
const PLACEMENT = { part: "D1", unit: 1, at: { x: 0, y: 0 }, rot: 0 } as const

/**
 * The block holding one `Fix:D` whose Value field is `value`.
 *
 * `Fix:D`'s part name is `"D"`, so `value: "D"` is the case under test and any other string of the
 * same length is the control - same boxes, same wires, one bit different.
 */
function oneDiode(value: string) {
  const c = blockCircuit([{ ...diode("D1", "N1", "N2"), value }], { kind: "bus", groups: [] }, { external: [] })
  return subgraphOf(c, "B", symbols)
}

function diodeScene(value: string, wires: readonly Wire[]): FieldScene {
  const g = oneDiode(value)
  return { block: "B", units: g.units, placements: [PLACEMENT], wires, powers: [], labels: [], libs: symbols }
}

/**
 * The six outside candidate slots of the placed unit, in the order `candidates()` offers them.
 *
 * The tips are read off the placed pin segments rather than assumed: `Fix:D` is drawn
 * HORIZONTALLY - pins left and right, body 2540 x 2540 - which is the same orientation as
 * `Jumper:Jumper_2_Open`, the unit **G232** measures. Its pin-free sides are therefore up and
 * down, and `slotFields(body, "up")` is the first candidate.
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

/** One short horizontal wire through the middle of each candidate's VALUE box, leaving every Reference box clear. */
function wiresAcrossValueRows(candidates: readonly Fields[], value: string): Wire[] {
  return candidates.map((f, i) => {
    const b = textBox(f.value, value)
    const y = Math.round((b.minY + b.maxY) / 2)
    return { a: { x: b.minX - GRID, y }, b: { x: b.maxX + GRID, y }, net: `BLOCK${i}` }
  })
}

/** The placed geometry of the unobstructed scene: its body and its drawn pin segments. */
function placedDiode(value: string) {
  const placed = placeFields(diodeScene(value, [])).find((p) => p.key === "D1#1")
  if (placed === undefined) throw new Error("D1#1 was not placed")
  if (placed.fallback !== null) throw new Error(`the unobstructed scene fell back: ${placed.fallback.covers.join("; ")}`)
  return placed
}

describe("field placement and a value that is the symbol's own part name", () => {
  // Derived once, from the CONTROL's geometry, and used by both drives: a one-character value and
  // a one-character control give the same boxes, so the wires are the same obstacle in both.
  const clean = placedDiode("X")
  const candidates = outsideCandidates(clean.body, clean.pins)
  const wires = wiresAcrossValueRows(candidates, "X")

  it("blocks every outside candidate's Value row and no Reference box, which is what makes the pair below fair", () => {
    expect(candidates).toHaveLength(6)
    const refBoxes = candidates.map((f) => growBox(textBox(f.reference, "D000"), MARGIN))
    const valBoxes = candidates.map((f) => growBox(textBox(f.value, "X"), MARGIN))
    const hits = (boxes: readonly Box[]): number => boxes.filter((b) => wires.some((w) => segmentHitsBox(w.a, w.b, b))).length
    expect(hits(valBoxes)).toBe(6)
    expect(hits(refBoxes)).toBe(0)
  })

  it("CONTROL: a value that is NOT the part name still needs room, and the unit has no clear slot without it", () => {
    // **TASK 24: THE CONTROL IS THE SAME AND ITS FORM MOVED.** The placer no longer refuses a unit
    // with no clear slot, so what distinguishes the two arms is the FALLBACK rather than a refusal:
    // a drawn value needs its own row, every candidate's row is crossed, and the unit is therefore
    // drawn over a wire. The case below is the one where nothing is.
    const u = placeFields(diodeScene("X", wires)).find((p) => p.key === "D1#1")
    if (u === undefined) throw new Error("D1#1 was not placed")
    expect(u.fallback).not.toBeNull()
    expect(u.fallback?.key).toBe("D1#1")
    expect(u.fallback?.covers.some((c) => /^wire \d+ \(BLOCK\d+\)$/.test(c))).toBe(true)
  })

  it("places the unit CLEANLY when its value is the part name, although that value's own row is crossed", () => {
    const placed = placeFields(diodeScene("D", wires)).find((p) => p.key === "D1#1")
    if (placed === undefined) throw new Error("D1#1 was not placed")
    expect(placed.fallback, "a hidden value needs no row, so the first candidate is CLEAR").toBeNull()
    // The FIRST candidate is taken: only the Reference had to be clear, and it was.
    expect(placed.fields).toEqual(candidates[0])
    // And the value still HAS a spot - it is emitted there, just not drawn - and that spot is
    // crossed by one of the wires, which is what the control refused over.
    const valueBox = growBox(textBox(placed.fields.value, "D"), MARGIN)
    expect(wires.some((w) => segmentHitsBox(w.a, w.b, valueBox))).toBe(true)
  })
})

describe("the text scene", () => {
  const layout = (): BlockLayout => ({ placements: [PLACEMENT], wires: [], anchors: [] })
  const whats = (value: string): string[] => {
    const g = oneDiode(value)
    const scene = textScene("block B", symbols, { blocks: [{ g, layout: layout() }], powers: [], labels: [], texts: [], frames: [] })
    return scene.texts.map((t) => t.what)
  }

  it("counts no box for a hidden value, and counts one for a drawn value", () => {
    expect(whats("D")).toContain("Reference of D1#1")
    expect(whats("D")).not.toContain("Value of D1#1")
    // CONTROL: the same unit, the same slot, a value that is not the part name.
    expect(whats("X")).toContain("Value of D1#1")
  })
})

describe("the emitted Value property", () => {
  const scope: ItemScope = { project: "p", sheet: "s", path: "/root/sheet" }
  const body = { minX: -2032, minY: -1016, maxX: 2032, maxY: 1016 }

  /** The `property` nodes of one emitted symbol, as `[name, value, hidden]`. */
  function properties(libId: string, refPrefix: string, value: string): Array<[string, string, boolean]> {
    const item = {
      label: "P1", lib: symbols.resolve(libId), unit: 1, at: { x: 0, y: 0 }, rot: 0 as const,
      fields: slotFields(body, "right"), reference: `${refPrefix}1`, value, footprint: "F", dnp: false, bom: TEST_BOM,
    }
    const root: SList = parse(print(partSymbol(scope, item).node))
    return root.lists
      .filter((l) => l.head === "property")
      .map((l) => [
        l.atoms[1]?.value ?? "",
        l.atoms[2]?.value ?? "",
        l.lists.some((h) => h.head === "hide" && h.atoms[1]?.value === "yes"),
      ])
  }

  it("keeps the value string and marks it hidden when it is the symbol's part name", () => {
    const props = properties("Fix:D", "D", "D")
    expect(props.find(([name]) => name === "Value")).toEqual(["Value", "D", true])
    // The Reference is never hidden by this, and the footprint's own hidden-ness is unchanged.
    expect(props.find(([name]) => name === "Reference")).toEqual(["Reference", "D1", false])
    expect(props.find(([name]) => name === "Footprint")).toEqual(["Footprint", "F", true])
  })

  it("CONTROL: a value that is not the part name is emitted visible", () => {
    expect(properties("Fix:C", "C", "100n").find(([name]) => name === "Value")).toEqual(["Value", "100n", false])
    // And the same symbol with its own part name as its value IS hidden, so the difference is the
    // value and not the symbol.
    expect(properties("Fix:C", "C", "C").find(([name]) => name === "Value")).toEqual(["Value", "C", true])
  })
})

describe("the fixture corpus this change touches", () => {
  it("has a part on each side of the predicate, so neither arm is unexercised", () => {
    // `cap` values its parts "100n" (drawn) and `diode` values its "D", which IS `Fix:D`'s part
    // name (hidden). Both arms are therefore live in the ported fixtures.
    expect(cap("C1", "A", "B").value).toBe("100n")
    expect(diode("D1", "A", "B").value).toBe("D")
    expect(diode("D1", "A", "B").libId).toBe("Fix:D")
  })
})
