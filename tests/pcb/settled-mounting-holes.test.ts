/**
 * THE FOUR M3 MOUNTING HOLES AS THEY SIT ON THE COMMITTED BOARD.
 *
 * Every number here is read from `placement-rules.json`'s approved
 * `anchors.mounting_holes` rule or from the board's own `Edge.Cuts`, so a
 * change to the inset, the envelope or the drill moves the expectations with
 * it. What is asserted is that the hardware ON the board is the hardware the
 * rule derives: four holes at the derived corners, each locked and marked not-
 * in-schematic, each courtyard the washer envelope and clear of the edge, four
 * copper-only Rule Areas, and the grader's keepouts and locks in the resolved
 * intent.
 *
 * `./mounting-hole-placement.test.ts` holds the TOOL that writes them;
 * `./mounting-hardware.test.ts` holds the footprint's derivation from the stock
 * one and the catalogued washer. This file is about the artifact.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { outlineBounds } from "../../tools/pcb/resolve-intent-zones.ts"
import { resolveToFile } from "../../tools/pcb/resolved-intent.ts"
import { placedCourtyards } from "../../tools/pcb/board-outline.ts"
import {
  CENTRE_TOLERANCE_MM, MOUNTING_FOOTPRINT, derivedHardware, mountingHoleRule, mountingHoles, placedMountingHoles,
} from "../../tools/pcb/mounting-hardware.ts"
import {
  inwardLabelOffsetY, readMountingFootprint, referenceLabelOffsetY,
} from "../../tools/pcb/mounting-hardware-forms.ts"
import { REFERENCES, RULE_AREA_PREFIX } from "../../tools/pcb/place-mounting-holes.ts"
import { BOARD, INTENT, LIBRARY, RULES, boardText, rules } from "./settled-board.ts"

afterAll(cleanUpTempScratch)

// ---- the four mounting holes ------------------------------------------------

test("four M3 holes sit at the derived corners, locked, not in the schematic", () => {
  const rule = mountingHoleRule(rules(), RULES)
  const bounds = outlineBounds(boardText(), BOARD)
  const derived = mountingHoles(bounds, rule)
  const placed = placedMountingHoles(boardText(), BOARD)
  for (const hole of derived) console.log(`  ${hole.corner}: derived (${hole.x}, ${hole.y})`)
  expect(placed.map((p) => p.ref).sort()).toEqual([...REFERENCES].sort())
  for (const hole of derived) {
    const at = placed.filter((p) => Math.hypot(p.x - hole.x, p.y - hole.y) <= CENTRE_TOLERANCE_MM)
    expect(at.length, `a hole at the ${hole.corner} centre (${hole.x}, ${hole.y})`).toBe(1)
  }

  // Locked, because the seeder treats a file-locked ref as already placed and
  // that is what holds the holes still while everything else is re-seeded.
  // board_only, because parity otherwise reports an extra footprint - measured
  // in tests/pcb/mounting-envelope-drc.test.ts.
  const text = boardText()
  for (const ref of REFERENCES) {
    const i = text.indexOf(`"Reference" "${ref}"`)
    expect(i, `${ref} is on the board`).toBeGreaterThan(0)
    const start = text.lastIndexOf("(footprint ", i)
    const body = text.slice(start, text.indexOf("\n\t)\n", i))
    expect(body, `${ref} is locked`).toContain("(locked yes)")
    expect(body, `${ref} is board_only`).toContain("board_only")
    expect(body, `${ref} comes from the project library`).toContain(`"pt2399-core:${MOUNTING_FOOTPRINT}"`)
  }
})

test("each hole's courtyard is the washer envelope and clears the board edge", () => {
  const rule = mountingHoleRule(rules(), RULES)
  const bounds = outlineBounds(boardText(), BOARD)
  const courtyards = placedCourtyards(boardText(), BOARD).filter((c) =>
    (REFERENCES as readonly string[]).includes(c.ref),
  )
  expect(courtyards.length).toBe(4)
  for (const { ref, box } of courtyards) {
    const width = box.x1 - box.x0
    const height = box.y1 - box.y0
    const clear = Math.min(box.x0 - bounds.x0, bounds.x1 - box.x1, box.y0 - bounds.y0, bounds.y1 - box.y1)
    console.log(`  ${ref}: ${width.toFixed(3)} x ${height.toFixed(3)} mm, ${clear.toFixed(3)} mm clear of the edge`)
    expect(width).toBeCloseTo(rule.envelopeDiameterMm, 6)
    expect(height).toBeCloseTo(rule.envelopeDiameterMm, 6)
    // The washer must not overhang the board: that is the `geometric_floor_mm`
    // half of the approved inset, and it is the hard half.
    expect(clear).toBeGreaterThan(0)
    expect(clear).toBeCloseTo(rule.centreInsetMm - rule.envelopeDiameterMm / 2, 6)
  }
})

test("four copper-only Rule Areas sit on the four holes, with pads and footprints ALLOWED", () => {
  const text = boardText()
  const names = [...text.matchAll(new RegExp(`\\(name "(${RULE_AREA_PREFIX}[a-z]+)"\\)`, "g"))].map((m) => m[1])
  console.log(`  rule areas: ${names.join(", ")}`)
  expect(names.sort()).toEqual(
    mountingHoles(outlineBounds(text, BOARD), mountingHoleRule(rules(), RULES))
      .map((h) => `${RULE_AREA_PREFIX}${h.corner}`)
      .sort(),
  )
  // The flags, on the board rather than only in the emitter: a Rule Area that
  // also forbids pads and footprints rejects the mounting hole it surrounds.
  const keepouts = [...text.matchAll(/\(keepout\n([\s\S]*?)\n\t\t\)/g)].map((m) => m[1] ?? "")
  expect(keepouts.length).toBe(4)
  for (const block of keepouts) {
    expect(block).toContain("(tracks not_allowed)")
    expect(block).toContain("(vias not_allowed)")
    expect(block).toContain("(copperpour not_allowed)")
    expect(block).toContain("(pads allowed)")
    expect(block).toContain("(footprints allowed)")
  }
})

test("the resolved intent carries the four keepouts and locks every hole", () => {
  const dir = freshTempScratch("pcb-resolved-")
  const out = path.join(dir, "resolved-intent.json")
  resolveToFile(BOARD, INTENT, out, RULES)
  const resolved = JSON.parse(fs.readFileSync(out, "utf8")) as Record<string, unknown>
  const keepouts = resolved["keepouts"] as readonly Record<string, unknown>[]
  const rule = mountingHoleRule(rules(), RULES)
  expect(keepouts.length).toBe(4)
  for (const keepout of keepouts) {
    const circle = keepout["circle"] as readonly number[]
    console.log(`  ${String(keepout["name"])}: circle ${JSON.stringify(circle)} allow ${JSON.stringify(keepout["allow"])}`)
    expect(circle[2]).toBeCloseTo(rule.envelopeDiameterMm / 2, 6)
    // EACH CIRCLE ALLOWS ITS OWN HOLE. rule_keepout iterates every part on the
    // board, so a circle centred on a hole flags that hole otherwise - the
    // same reject-its-own-mounting-hole defect the Rule Area had.
    expect((keepout["allow"] as readonly string[]).length).toBe(1)
  }
  expect([...(resolved["must_lock"] as readonly string[])].sort()).toEqual(["J1", ...REFERENCES].sort())
})

test("a hole NOT at a derived centre refuses rather than getting a keep-out where it sits", () => {
  // THE INVERSION THIS CONSTRUCT EXISTS TO PREVENT. A keepout derived from a
  // placed hole's position would follow the artifact: a misplaced hole would
  // get a circle around its wrong position and the grade would pass.
  // MUTATED BY FINDING THE FORM, NOT BY MATCHING A DECIMAL SPELLING. This line
  // was `.replace("(at 14.000000 14.000000", ...)`, which coupled the test to
  // how many decimal places the board happened to carry - so when the geometry
  // tool wrote `(at 14 14)` instead, this test went red for a formatting reason
  // with nothing to do with what it checks, and the tempting fixes were to
  // commit the churn or to loosen the refusal. The spelling is pinned where it
  // belongs, in `./mounting-hole-placement.test.ts`; here it is irrelevant.
  const text = boardText()
  const hole = mountingHoles(outlineBounds(text, BOARD), mountingHoleRule(rules(), RULES))[0]
  if (hole === undefined) throw new Error("the rule derived no holes")
  const i = text.indexOf(`"Reference" "${REFERENCES[0] as string}"`)
  const start = text.lastIndexOf("(footprint ", i)
  const at = /\(at\s+-?[\d.]+\s+-?[\d.]+\)/.exec(text.slice(start, i))
  if (at === null) throw new Error(`no (at x y) form for ${REFERENCES[0] as string}`)
  const moved =
    text.slice(0, start) +
    text.slice(start, i).replace(at[0], `(at ${hole.x + 6} ${hole.y + 6})`) +
    text.slice(i)
  expect(moved).not.toBe(text)
  const rule = mountingHoleRule(rules(), RULES)
  const bounds = outlineBounds(boardText(), BOARD)
  let message = ""
  try {
    derivedHardware(moved, "moved board", bounds, rule)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  console.log(`  refuses: ${message.slice(0, 120)}...`)
  expect(message).toContain("NOT at a centre this rule derives")
  expect(message).toContain("(20, 20)")
  expect(message).toContain("criterion computed from the artifact it grades always passes")
})

test("each hole's reference label points INWARD, which is what stops the silkscreen being clipped", () => {
  const offset = referenceLabelOffsetY(readMountingFootprint(LIBRARY), LIBRARY)
  const bounds = outlineBounds(boardText(), BOARD)
  const rule = mountingHoleRule(rules(), RULES)
  console.log(`  the library puts the label at y ${offset}; the inset is ${rule.centreInsetMm} mm`)
  // The library's own offset points OFF the board for a hole in the top half,
  // which is the measurement behind this: 4.15 mm above a centre 4.0 mm from
  // the edge is 0.15 mm past it, and DRC reported silk_edge_clearance on
  // exactly MH1 and MH2.
  expect(Math.abs(offset)).toBeGreaterThan(rule.centreInsetMm)

  const text = boardText()
  const holes = mountingHoles(bounds, rule)
  const middle = (bounds.y0 + bounds.y1) / 2
  holes.forEach((hole, index) => {
    const expected = inwardLabelOffsetY(hole, bounds, offset)
    const ref = REFERENCES[index] as string
    const i = text.indexOf(`"Reference" "${ref}"`)
    expect(i, `${ref} is on the board`).toBeGreaterThan(0)
    // The property's own (at x y [angle]) is the next one after its name.
    const at = /\(at\s+(-?[\d.]+)\s+(-?[\d.]+)/.exec(text.slice(i, i + 200))
    console.log(`  ${ref} (${hole.corner}): label y ${String(at?.[2])}, inward is ${expected}`)
    expect(Number(at?.[2])).toBeCloseTo(expected, 4)
    // THE CLAIM, in two halves. The label sits inside the board...
    expect(hole.y + expected).toBeGreaterThan(bounds.y0)
    expect(hole.y + expected).toBeLessThan(bounds.y1)
    // ...and never further from the middle than the library's own side would
    // have put it. Not STRICTLY nearer: for the two holes in the bottom half
    // the library's upward offset already points inward, so this function
    // returns that same value and the two are equal. Asserting strict
    // improvement passed on MH1/MH2 and failed on MH3/MH4 - which is the
    // function behaving correctly and the assertion overreaching.
    expect(Math.abs(hole.y + expected - middle)).toBeLessThanOrEqual(Math.abs(hole.y + offset - middle))
  })

  // AND THE MEASUREMENT THAT MOTIVATES ALL OF IT: for at least one hole the
  // library's own side puts the label OFF the board. Without this line the
  // test above would pass just as happily on a board where nothing was wrong.
  const clipped = holes.filter((h) => h.y + offset <= bounds.y0 || h.y + offset >= bounds.y1)
  console.log(`  holes whose label the library would clip: ${clipped.map((h) => h.corner).join(", ")}`)
  expect(clipped.length).toBeGreaterThan(0)
})
