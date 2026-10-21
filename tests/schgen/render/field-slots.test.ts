/**
 * **WHY THE FIVE INSIDE FIELD SLOTS ARE NOT A FALLBACK FOR A SMALL TWO-PIN PASSIVE, MEASURED** -
 * Task 18's Step 0 diagnosis of the field-placement refusal `docs/known-gaps.md` **G232** records.
 *
 * **WHAT QUESTION THIS ANSWERS.** G232 leaves one open deliberately: *"It is plausible that what
 * is wrong is the ROUTE that leaves no room rather than the placement that cannot find any, and
 * this writer did not determine which."* Its two candidate mechanisms are *give
 * `field-placement.ts` more candidate positions* and *treat "no room for the fields" as a routing
 * cost*, and **choosing between them needs to know how many candidate positions a small passive
 * really has.** `candidates()` offers eleven for a vertical two-pin passive - two pin-free sides,
 * five inside the body, four beside the outermost pins - and **five of the eleven can never
 * succeed**, whatever the route does. That is what is measured here.
 *
 * **THE ARITHMETIC, AND IT IS THE WHOLE FINDING.** `slotFields` stacks the Reference one `GRID`
 * above the slot's centre and the Value one `GRID` below it; `textBox` gives each line a height of
 * `GRID`; `tryPlaceFields` grows both by `MARGIN = GRID / 2`. So the grown pair is
 * `4 x GRID = 5.08 mm` tall at every slot, inside or out - and an inside slot is taken only when
 * both grown boxes lie STRICTLY within the unit's own body. **`Fix:C`'s body is 2.032 mm tall**,
 * so no inside slot can hold it, and the same holds for every symbol whose body is shorter than
 * `4 x GRID`. **A small two-pin passive therefore has six usable candidates and not eleven, all
 * six of them outside the body, where the route can reach them.**
 *
 * **WHICH CASE PINS WHAT, measured, because the first version of this comment had them crossed**
 * (`docs/known-gaps.md` **G239**, corrected under ruling R59):
 *
 * - **CASE ONE PINS THE ARITHMETIC.** `[RAN]` with `MARGIN` set to zero so the pair is `3 x GRID`:
 *   case one goes RED, `Expected: 5080  Received: 3810`, and the others stay green.
 * - **CASE THREE PINS THE SIZE OF THE USABLE CANDIDATE SET, not the reason the inside five are
 *   unusable.** It blocks only the SIX OUTSIDE candidates and the unit still refuses; `[RAN]`
 *   blocking only five leaves it placed and the case goes red. **But `[RAN]` removing the
 *   inside-containment arm from `field-placement.ts` leaves all three cases GREEN**, because the
 *   inside slots are independently blocked by the symbol's own interior graphics - so case three
 *   is not evidence about containment.
 *
 * `tests/schgen/render/text-clearance.test.ts` already has a `placeFields` refusal case; it blocks
 * the whole neighbourhood with forty-one wires, which proves the refusal arm exists and cannot
 * distinguish an inside slot that would have worked from one that could not.
 *
 * Nothing here is a fix and nothing here is an acceptance criterion for a fix: G232's criterion
 * stands as written and this is an input to the scope decision R46 carries.
 */
import { describe, expect, it } from "bun:test"
import { cap, blockCircuit, symbols } from "../__fixtures__/circuits.ts"
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts"
import { tryPlaceFields, type FieldScene } from "../../../lib/schgen/render/field-placement.ts"
import { GRID, growBox, type Point, type Side } from "../../../lib/schgen/render/geometry.ts"
import type { Box } from "../../../lib/schgen/render/lib-pins.ts"
import type { Wire } from "../../../lib/schgen/render/block-types.ts"
import {
  besidePinFields, INSIDE_SLOTS, OUTSIDE_SLOTS, reservedReference, slotFields, textBox, type Fields,
} from "../../../lib/schgen/render/text-boxes.ts"

/** `tryPlaceFields`'s clearance around a candidate field: half a text line. Transcribed, not imported - it is private there. */
const MARGIN = GRID / 2

/** The reference and value boxes a slot asks for, grown exactly as `tryPlaceFields` grows them. */
function grownBoxes(f: Fields, refPrefix: string, value: string): readonly Box[] {
  return [textBox(f.reference, reservedReference(refPrefix)), textBox(f.value, value)].map((b) => growBox(b, MARGIN))
}

const height = (b: Box): number => b.maxY - b.minY

/** The one `Fix:C` of a single-unit block, placed at the origin upright. */
const PLACEMENT = { part: "C1", unit: 1, at: { x: 0, y: 0 }, rot: 0 } as const

function oneCapScene(wires: readonly Wire[]): FieldScene {
  const c = blockCircuit([cap("C1", "N1", "N2")], { kind: "bus", groups: [] }, { external: [] })
  const g = subgraphOf(c, "B", symbols)
  return { block: "B", units: g.units, placements: [PLACEMENT], wires, powers: [], labels: [], libs: symbols }
}

describe("the inside field slots and a small two-pin passive", () => {
  it("asks for 4 x GRID of height at every inside slot, which Fix:C's body is too short to contain", () => {
    const body = symbols.resolve("Fix:C").bodies.get(1)
    if (body === undefined) throw new Error("Fix:C has no unit-1 body box")
    // The measured body of the symbol this repository's capacitors are drawn with, and the
    // measured body of `Device:C` in pt-core is the same 2.032 mm tall (G232's C7#1).
    expect(height(body)).toBe(2032)
    for (const slot of INSIDE_SLOTS) {
      const boxes = grownBoxes(slotFields(body, slot), "C", "100n")
      const span = { minY: Math.min(...boxes.map((b) => b.minY)), maxY: Math.max(...boxes.map((b) => b.maxY)), minX: 0, maxX: 0 }
      expect(height(span), `inside slot ${String(slot)}`).toBe(4 * GRID)
      expect(height(span), `inside slot ${String(slot)}`).toBeGreaterThan(height(body))
    }
    // Stated as the general bound rather than only for this symbol: 5.08 mm.
    expect(4 * GRID).toBe(5080)
  })

  it("places its fields on the first pin-free side when nothing is in the way", () => {
    const r = tryPlaceFields(oneCapScene([]))
    if (!r.ok) throw new Error(`the unobstructed scene refused: ${r.mismatch.reason}`)
    const placed = r.placed.find((p) => p.key === "C1#1")
    if (placed === undefined) throw new Error("C1#1 was not placed")
    // Outside, on the "right" slot: the pin-free side `OUTSIDE_SLOTS` offers first.
    expect(placed.inside).toBe(false)
    expect(placed.fields).toEqual(slotFields(placed.body, "right"))
  })

  /**
   * **BLOCKING ONLY THE SIX OUTSIDE CANDIDATES IS ENOUGH, which is the finding.** The wires are
   * derived from the candidate geometry rather than written as coordinates, so a change to
   * `slotFields` or `besidePinFields` moves them with it; the five inside slots are left entirely
   * alone, and the unit still has nowhere to go.
   */
  it("refuses when only its six OUTSIDE candidates are blocked: the five inside slots rescue nothing", () => {
    const clean = tryPlaceFields(oneCapScene([]))
    if (!clean.ok) throw new Error("the unobstructed scene refused")
    const placed = clean.placed.find((p) => p.key === "C1#1")
    if (placed === undefined) throw new Error("C1#1 was not placed")
    const body = placed.body
    // `Fix:C` is drawn with its pins up and down, so those are the two sides with tips and
    // left/right are the pin-free ones. Read off the placed pin segments rather than assumed.
    const tips = new Map<Side, readonly Point[]>([
      ["up", placed.pins.filter((s) => s.a.y < body.minY).map((s) => s.a)],
      ["down", placed.pins.filter((s) => s.a.y > body.maxY).map((s) => s.a)],
    ])
    expect(tips.get("up")).toHaveLength(1)
    expect(tips.get("down")).toHaveLength(1)
    const outside: Fields[] = [
      ...OUTSIDE_SLOTS.filter((s) => (tips.get(s) ?? []).length === 0).map((s) => slotFields(body, s)),
      ...OUTSIDE_SLOTS.flatMap((s) => besidePinFields(body, s, tips.get(s) ?? [])),
    ]
    expect(outside).toHaveLength(6)
    // One short horizontal wire through the middle of each candidate's Reference box.
    const wires: Wire[] = outside.map((f, i) => {
      const b = textBox(f.reference, reservedReference("C"))
      const y = Math.round((b.minY + b.maxY) / 2)
      return { a: { x: b.minX - GRID, y }, b: { x: b.maxX + GRID, y }, net: `BLOCK${i}` }
    })
    const r = tryPlaceFields(oneCapScene(wires))
    expect(r.ok).toBe(false)
    if (r.ok) throw new Error("unreachable: asserted false above")
    expect(r.mismatch.reason).toContain("C1#1 (Fix:C): no place for its Reference and Value")
  })
})
