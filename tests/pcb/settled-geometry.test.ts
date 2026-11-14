/**
 * THE SETTLED pt2399-core GEOMETRY, AND THE TWO GUARDS ITS OWN CRITERIA ASKED
 * FOR AND SAID DID NOT EXIST.
 *
 * Both are the owner's numbers, both arrived on 2026-11-13, and both were
 * recorded in the approved criteria as *authored and unchecked*:
 *
 *  - `floorplan-intent.json` `envelope.size_mm` is `[150, 100]` - *"increase
 *    the board size to 150mm x 100mm"* - and its `enforced_by` read **"NOTHING
 *    YET, stated plainly rather than implied. No tool compares this size to the
 *    board's Edge.Cuts today."** `tools/pcb/resolve-intent-zones.ts` now does,
 *    and that matters more than it looks: every zone in that file is a FRACTION
 *    of the outline, so a resized board does not fail - it silently moves the
 *    rectangle the placement is graded against.
 *  - `placement-rules.json` `separation.part_to_part` is `2.0` mm - *"Use 2mm
 *    min spacing"*, behind *"remember that I have fingers, so I need enough
 *    room between parts to use my fingers. I'm not a pick and place machine"* -
 *    and names two mechanisms at one number, of which the second is a KiCad
 *    `courtyard_clearance` custom design rule. `tools/pcb/courtyard-rule.ts`
 *    writes it from the approved figure and refuses a drifted one.
 *
 * **THE THING THESE TESTS DO NOT DO is grade the placement.** That is
 * `py_tools/check_floorplan.py --require-rules 1`, run against the resolved
 * intent, and a second implementation of it here would grade the
 * reimplementation rather than the board. What is checked here is that the
 * GEOMETRY on the board is the geometry the criteria declare - the size, the
 * four hole positions, the Rule Areas, the locks - and that the two mechanisms
 * above cannot go quiet.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { defaultKicadCli } from "../../lib/kicad/install.ts"
import { builtCommit, engineDir, engineEnv, venvPython } from "../../tools/krt/acquire.ts"
import { parseReport, REQUIRED_ACTIVE_CHECKS } from "../../tools/pcb/drc-report.ts"
import { verdictOf } from "../../tools/pcb/drc-policy.ts"
import {
  declaredEnvelopeSize, outlineBounds, requireDeclaredSize, resolveToFile, type Bounds,
} from "../../tools/pcb/resolve-intent-zones.ts"
import { EDGE_CLEARANCE_MM, placedCourtyards } from "../../tools/pcb/board-outline.ts"
import {
  CENTRE_TOLERANCE_MM, derivedHardware, inwardLabelOffsetY, mountingHoleRule, mountingHoles,
  placedMountingHoles, referenceLabelOffsetY, readMountingFootprint, MOUNTING_FOOTPRINT,
} from "../../tools/pcb/mounting-hardware.ts"
import {
  RULE_NAME, courtyardRuleText, druPathFor, minPartGapMm, verifyCourtyardRule,
} from "../../tools/pcb/courtyard-rule.ts"
import { REFERENCES, RULE_AREA_PREFIX } from "../../tools/pcb/place-mounting-holes.ts"

afterAll(cleanUpTempScratch)

const CIRCUIT = path.resolve(import.meta.dir, "../../circuits/pt2399-core")
const BOARD = path.join(CIRCUIT, "pt2399-core.kicad_pcb")
const INTENT = path.join(CIRCUIT, "floorplan-intent.json")
const RULES = path.join(CIRCUIT, "placement-rules.json")
const LIBRARY = path.join(CIRCUIT, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`)

const boardText = (): string => fs.readFileSync(BOARD, "utf8")
const intent = (): unknown => JSON.parse(fs.readFileSync(INTENT, "utf8"))
const rules = (): unknown => JSON.parse(fs.readFileSync(RULES, "utf8"))

// ---- the outline is the owner's declared size -------------------------------

test("the board's Edge.Cuts is exactly the size the intent declares", () => {
  const size = declaredEnvelopeSize(intent(), INTENT)
  if (size === undefined) throw new Error(`${INTENT} declares no envelope.size_mm`)
  const bounds = outlineBounds(boardText(), BOARD)
  console.log(
    `  declared ${size[0]} x ${size[1]} mm; board ${(bounds.x1 - bounds.x0).toFixed(3)} x ` +
      `${(bounds.y1 - bounds.y0).toFixed(3)} mm at (${bounds.x0}, ${bounds.y0})`,
  )
  expect(size).toEqual([150, 100])
  expect(() => requireDeclaredSize(intent(), bounds, INTENT, BOARD)).not.toThrow()
})

test("a board of the wrong size REFUSES, and the refusal says not to edit the declared size", () => {
  const shrunk = { x0: 10, y0: 10, x1: 10 + 149.9, y1: 110 }
  let message = ""
  try {
    requireDeclaredSize(intent(), shrunk, INTENT, BOARD)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  console.log(`  0.1 mm undersize refuses: ${message.slice(0, 96)}...`)
  expect(message).toContain("149.900 x 100.000 mm outline")
  expect(message).toContain("150 x 100 mm")
  // The direction of the fix is in the message, because the wrong one is
  // tempting and silent: a declared size edited to match the board would move
  // every zone fraction with it and still report a pass.
  expect(message).toContain("do not edit the declared size to match the board")
})

test("the origin is deliberately NOT checked, which is why the intent declares a size", () => {
  const bounds = outlineBounds(boardText(), BOARD)
  const moved = { x0: 1000, y0: 2000, x1: 1000 + (bounds.x1 - bounds.x0), y1: 2000 + (bounds.y1 - bounds.y0) }
  expect(() => requireDeclaredSize(intent(), moved, INTENT, BOARD)).not.toThrow()
})

test("an envelope with a rect, or a malformed size, is refused wherever the intent is read", () => {
  const base = intent() as Record<string, unknown>
  const withRect = { ...base, envelope: { rect: [0, 0, 10, 10] } }
  expect(() => declaredEnvelopeSize(withRect, "x")).toThrow(/envelope\.rect is declared/)
  expect(() => declaredEnvelopeSize({ ...base, envelope: {} }, "x")).toThrow(/no size_mm/)
  for (const bad of [[150], [150, 100, 2], [150, 0], ["150", 100], [150, -1]]) {
    expect(() => declaredEnvelopeSize({ ...base, envelope: { size_mm: bad } }, "x")).toThrow()
  }
})

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
  const moved = boardText().replace("(at 14.000000 14.000000", "(at 20.000000 20.000000")
  expect(moved).not.toBe(boardText())
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

// ---- the 2 mm spacing's second mechanism ------------------------------------

test("the committed .kicad_dru is what the approved figure generates", () => {
  expect(() => verifyCourtyardRule(BOARD, RULES)).not.toThrow()
  const gap = minPartGapMm(rules(), RULES)
  const text = fs.readFileSync(druPathFor(BOARD), "utf8")
  console.log(`  ${path.basename(druPathFor(BOARD))} at ${gap} mm:\n${text.replace(/^/gm, "    ")}`)
  expect(gap).toBe(2.0)
  expect(text).toBe(courtyardRuleText(rules(), RULES))
  expect(text).toContain("courtyard_clearance")
  expect(text).toContain("(min 2mm)")
  expect(text).toContain("(severity error)")
})

test("a MISSING or LOOSENED .kicad_dru refuses, naming how to write it", () => {
  const dir = freshTempScratch("pcb-dru-")
  const board = path.join(dir, "b.kicad_pcb")
  fs.writeFileSync(board, "(kicad_pcb)\n")
  let message = ""
  try {
    verifyCourtyardRule(board, RULES)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  expect(message).toContain("no custom design rules at")
  expect(message).toContain("bun tools/pcb/courtyard-rule.ts")

  // THE DANGEROUS CASE IS NOT ABSENCE, IT IS A FILE THAT EXISTS AND SAYS LESS:
  // DRC then runs, reports nothing, and the spacing is unchecked at the figure
  // that was approved.
  fs.writeFileSync(druPathFor(board), courtyardRuleText(rules(), RULES).replace("2mm", "0.25mm"))
  let loosened = ""
  try {
    verifyCourtyardRule(board, RULES)
  } catch (error) {
    loosened = error instanceof Error ? error.message : String(error)
  }
  expect(loosened).toContain("is not what")
  expect(loosened).toContain("clean against the wrong minimum")
})

test("the approved figure is READ and never defaulted", () => {
  expect(() => minPartGapMm({}, "x")).toThrow(/no positive separation\.part_to_part\.min_gap_mm/)
  expect(() => minPartGapMm({ separation: { part_to_part: { min_gap_mm: 0 } } }, "x")).toThrow()
  expect(() => minPartGapMm({ separation: { part_to_part: {} } }, "x")).toThrow(/never defaulted/)
})

test("INTEGRATION, real kicad-cli: the rule FIRES, and it fires as a type the gate already fails", () => {
  const cli = defaultKicadCli()
  if (!fs.existsSync(cli)) {
    throw new Error(
      `kicad-cli is not at ${cli}. Set KICAD_CLI or install KiCad. This does NOT skip: it is the ` +
        "only evidence that the custom design rule is enforced at all rather than being a text " +
        "file nothing reads.",
    )
  }
  const dir = freshTempScratch("pcb-dru-fires-")
  for (const file of ["pt2399-core.kicad_pcb", "pt2399-core.kicad_pro", "fp-lib-table"]) {
    fs.copyFileSync(path.join(CIRCUIT, file), path.join(dir, file.replace("pt2399-core", "p")))
  }
  fs.mkdirSync(path.join(dir, "pt2399-core.pretty"), { recursive: true })
  fs.copyFileSync(LIBRARY, path.join(dir, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`))
  const board = path.join(dir, "p.kicad_pcb")

  const run = (gap: string): ReturnType<typeof parseReport> => {
    fs.writeFileSync(
      path.join(dir, "p.kicad_dru"),
      courtyardRuleText(rules(), RULES).replace("(min 2mm)", `(min ${gap})`),
    )
    const report = path.join(dir, `drc-${gap}.json`)
    const result = spawnSync(
      cli,
      ["pcb", "drc", "--format", "json", "--severity-all", "--refill-zones", "-o", report, board],
      { encoding: "utf8" },
    )
    if (result.status !== 0) throw new Error(`kicad-cli exited ${String(result.status)}: ${result.stderr}`)
    return parseReport(fs.readFileSync(report, "utf8"), report)
  }

  // AT THE APPROVED FIGURE the settled board is clean, which is the half that
  // says the placement honours the owner's ruling.
  const atLimit = run("2mm")
  const overlapsAtLimit = atLimit.violations.filter((v) => v.type === "courtyards_overlap")
  console.log(`  at 2mm: ${overlapsAtLimit.length} courtyards_overlap`)
  expect(overlapsAtLimit).toEqual([])

  // TIGHTENED, the rule fires - which is the half that says it is enforced at
  // all rather than being a text file nothing reads. A rule KiCad cannot parse
  // is not an error: the board loads and the constraint simply does not exist.
  const tightened = run("2.5mm")
  const overlaps = tightened.violations.filter((v) => v.type === "courtyards_overlap")
  console.log(`  at 2.5mm: ${overlaps.length} courtyards_overlap, e.g. ${overlaps[0]?.description}`)
  expect(overlaps.length).toBeGreaterThan(0)
  expect(overlaps[0]?.severity).toBe("error")
  // It names the rule, so a violation can be traced to this file rather than
  // to KiCad's own courtyard check.
  expect(overlaps.some((v) => v.description.includes(RULE_NAME))).toBe(true)
  // AND THE TYPE IS ONE THE GATE ALREADY FAILS AT ANY SEVERITY. That is why
  // this mechanism needed no change to REQUIRED_ACTIVE_CHECKS, which is Task
  // 5's list and not this one's to widen.
  expect(REQUIRED_ACTIVE_CHECKS).toContain("courtyards_overlap")
  expect(verdictOf(tightened, { routed: false }).pass).toBe(false)
  expect(verdictOf(tightened, { routed: false }).counts.requiredCheckViolations).toBe(overlaps.length)
})

// ---- the margined-outline false positive, pinned ---------------------------

/**
 * How far a rect leaves `inset`, by the engine's own measure: the overhang
 * SUMMED OVER EDGES, not the worst one.
 *
 * That is `rect_outside_amount`'s semantics and it is why a CORNER part counts
 * twice. Reproduced here rather than imported because the engine is Python; the
 * `INTEGRATION` test below checks this arithmetic against the real grader's own
 * number, so the reimplementation is held to the thing it reimplements.
 */
function outsideAmount(rect: Bounds, inset: Bounds): number {
  return (
    Math.max(0, inset.x0 - rect.x0) +
    Math.max(0, rect.x1 - inset.x1) +
    Math.max(0, inset.y0 - rect.y0) +
    Math.max(0, rect.y1 - inset.y1)
  )
}

function insetBy(bounds: Bounds, margin: number): Bounds {
  return {
    x0: bounds.x0 + margin,
    y0: bounds.y0 + margin,
    x1: bounds.x1 - margin,
    y1: bounds.y1 - margin,
  }
}

/** Which parts leave `inset`, and by how much, by the measure above. */
function partsLeaving(inset: Bounds): readonly { readonly ref: string; readonly amount: number }[] {
  return placedCourtyards(boardText(), BOARD)
    .map((c) => ({ ref: c.ref, amount: outsideAmount(c.box, inset) }))
    .filter((p) => p.amount > 1e-9)
    .sort((a, b) => a.ref.localeCompare(b.ref))
}

test("ONLY the mounting holes leave a 2.0 mm margined outline, and the amount is derived from the three approved numbers", () => {
  // WHY THIS TEST EXISTS, and it is not to excuse a failure.
  //
  // `place_seed.py` exits 4 on this board with two `GRADE ERROR [legality]`
  // lines - "parts leaving the board outline: 4.000" and "total off-board
  // overhang (mm): 12.000" - while `check_floorplan.py` grades the same bytes
  // as a clean PASS. The cause is parameter plumbing in the engine, not a
  // property of this board, and it is documented in the engine's own source:
  //
  //   .tools/krt/py_placer/placement/quench.py:424
  //       `margin = max(clearance, board_edge_clearance)` - so --clearance,
  //       which the owner's 2.0 mm PART SPACING sets, also becomes the
  //       board-EDGE margin. The same expression is at
  //       placement/fanout_clearance.py:276.
  //   .tools/krt/py_placer/placement/legality.py:1827
  //       the off-board quantity is measured against an outline inflated by
  //       "the GRADING CLEARANCE -- so it moves when --clearance moves".
  //   .tools/krt/py_placer/placement/seeder.py:1747
  //       the same false positive, named as "cosmetic and common on legitimate
  //       boards (tigard's own corner mounting holes overhang by courtyard;
  //       the human original grades oob 7)", and fixed in that census but not
  //       in `legality_metrics`, which is what floorplan.py reads.
  //
  // "KNOWN FALSE POSITIVE" IS EXACTLY THE SENTENCE SOMEONE WILL REACH FOR TO
  // WAVE THROUGH A REAL OUT-OF-BOUNDS PART, so the claim is narrowed to
  // something that can fail: at this margin the parts leaving the outline are
  // EXACTLY the four mounting holes, by name, and the total is the figure the
  // three approved numbers produce. A circuit part drifting off the board
  // breaks the first clause; a change to the inset, the envelope or the
  // spacing moves the second.
  const rule = mountingHoleRule(rules(), RULES)
  const margin = minPartGapMm(rules(), RULES)
  const radius = rule.envelopeDiameterMm / 2
  // Each hole's courtyard reaches `radius` from a centre `centre_inset_mm` in,
  // so it sits `inset - radius` clear of the real edge and overhangs an outline
  // inflated by `margin` by this much - on EACH of the two edges its corner is
  // formed by.
  const perEdge = radius - rule.centreInsetMm + margin
  const expected = perEdge > 0 ? perEdge * 2 * rule.count : 0
  console.log(
    `  radius ${radius} - inset ${rule.centreInsetMm} + margin ${margin} = ${perEdge} mm per edge; ` +
      `${rule.count} holes x 2 edges = ${expected} mm`,
  )

  const bounds = outlineBounds(boardText(), BOARD)
  const leaving = partsLeaving(insetBy(bounds, margin))
  for (const part of leaving) console.log(`  ${part.ref}: ${part.amount.toFixed(3)} mm outside`)

  // THE DISCRIMINATING CLAUSE. Not "the holes are among them" and not a count:
  // the exact set, by name. Nudge any circuit part off the board and this line
  // goes red - verified by mutation, see the Task 8 report.
  expect(leaving.map((p) => p.ref)).toEqual(perEdge > 0 ? [...REFERENCES].sort() : [])

  const total = leaving.reduce((sum, p) => sum + p.amount, 0)
  expect(total).toBeCloseTo(expected, 6)
  for (const part of leaving) expect(part.amount).toBeCloseTo(perEdge * 2, 6)
})

test("at the board's OWN copper-to-edge clearance, nothing leaves the outline at all", () => {
  // The other half of the same fact, and the one that says the board is right:
  // the approved rule puts each washer 0.5 mm inside the edge deliberately, so
  // at the board's own 0.5 mm floor - which is what `check_floorplan.py` grades
  // at, reporting "edge 0.5 (board constraint)" - no part is off the board,
  // mounting holes included.
  const bounds = outlineBounds(boardText(), BOARD)
  const leaving = partsLeaving(insetBy(bounds, EDGE_CLEARANCE_MM))
  console.log(`  at ${EDGE_CLEARANCE_MM} mm: ${leaving.length} part(s) outside`)
  expect(leaving).toEqual([])

  // And at zero margin too, which is the honest floor: nothing is over the edge
  // even before any clearance is allowed for.
  expect(partsLeaving(bounds)).toEqual([])
})

test("INTEGRATION, real engine: check_floorplan grades the committed board with oob_count 0 and oob_amount 0.0", () => {
  // THE GRADER'S OWN VERDICT, not a reimplementation of it. The two tests above
  // compute the off-board quantity in TypeScript, which is the only way to
  // assert WHICH parts leave a margined outline - but a reimplementation cannot
  // establish what the engine reports, and the engine is what the evidence bar
  // is phrased in terms of. So this runs the real grader.
  //
  // IT IS THE FIRST TEST HERE TO INVOKE THE PINNED ENGINE, and it REFUSES
  // rather than skipping when the engine is not built, for the reason every
  // kicad-cli test in this directory gives: a green suite on a machine with no
  // engine would be the skipped check that reads as a pass. `make krt` builds
  // it; build/krt/invocations.json records the command shapes.
  const repoRoot = path.resolve(import.meta.dir, "../..")
  const python = venvPython(repoRoot)
  if (builtCommit(repoRoot) === undefined || !fs.existsSync(python)) {
    throw new Error(
      `the pinned routing engine is not built at ${engineDir(repoRoot)} (no stamp, or no venv ` +
        `interpreter at ${python}). Run \`make krt\`. This does NOT skip: it is the only check ` +
        "that the grader's own verdict on this board is a PASS, and that claim is what settles " +
        "the two GRADE ERROR [legality] lines place_seed prints - see the two tests above.",
    )
  }
  const dir = freshTempScratch("pcb-grade-")
  const resolved = path.join(dir, "resolved-intent.json")
  resolveToFile(BOARD, INTENT, resolved, RULES)

  const result = spawnSync(
    python,
    ["py_tools/check_floorplan.py", BOARD, "--intent", resolved, "--require-rules", "1"],
    { cwd: engineDir(repoRoot), encoding: "utf8", env: { ...engineEnv(process.env) } },
  )
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`
  const summary = /JSON_SUMMARY: (\{.*\})/.exec(output)
  if (summary === null) {
    throw new Error(
      `check_floorplan.py printed no JSON_SUMMARY (exit ${String(result.status)}). Its output is ` +
        `the evidence here and an absent summary is not a pass:\n${output}`,
    )
  }
  const graded = JSON.parse(summary[1] as string) as Record<string, unknown>
  console.log(
    `  exit ${String(result.status)}; ${String(graded["rules_run"])} rule(s) ran, ` +
      `${String(graded["violations"])} violation(s); oob_count ${String(graded["oob_count"])}, ` +
      `oob_amount ${String(graded["oob_amount"])}, overlap_area ${String(graded["overlap_area"])}`,
  )
  // The clearance it graded at, said out loud: the board's own netclass and
  // edge constraint, which is the correct pair and the whole point.
  expect(output).toContain(`edge ${EDGE_CLEARANCE_MM} (board constraint)`)
  expect(result.status).toBe(0)
  expect(graded["oob_count"]).toBe(0)
  expect(graded["oob_amount"]).toBe(0.0)
  expect(graded["overlap_area"]).toBe(0.0)
  expect(graded["violations"]).toBe(0)
  // --require-rules 1 makes "no rule ran" a failure rather than a pass; this
  // asserts the stronger thing, that the five rules with something to check
  // plus legality all ran.
  expect(graded["rules_run"]).toBe(6)
})
