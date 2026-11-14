/**
 * THE 7.0 mm MOUNTING-HARDWARE ENVELOPE, RE-DERIVED ON EVERY RUN instead of
 * remembered in three places.
 *
 * Four files currently say 7.0 mm, and only one of them is allowed to be the
 * authority:
 *
 *  - `circuits/pt2399-core/placement-rules.json` `anchors.mounting_holes`, the
 *    APPROVED rule - the authority, and read by everything below;
 *  - `circuits/pt2399-core/pt2399-core.pretty/MountingHole_3.2mm_M3_Washer7.0mm.kicad_mod`,
 *    whose COURTYARD is the mechanism `courtyards_overlap` compares;
 *  - `parts/washer-m3-flat-din125a-7mm-steel-zinc.json`, the physical part the
 *    number comes from;
 *  - three fixture copies of that footprint under `tests/fixtures/pcb/`.
 *
 * A figure written in four places is a transcription with a date on it, which
 * is this repository's standing objection to numbers in prose. These tests are
 * what make the four agree or go red.
 *
 * AND THE ONE CLAIM THAT IS NOT A NUMBER: that the project-local footprint is
 * KiCad's stock `MountingHole:MountingHole_3.2mm_M3` with its courtyard changed
 * and NOTHING ELSE touched. `the footprint is derived, not re-authored` below
 * compares the two files form by form, so a drill, a pad type or an attribute
 * that drifted is a failure here rather than a surprise at the fabricator.
 *
 * THESE TESTS DO NOT SKIP when KiCad is absent. An empty library would make
 * every comparison pass for the wrong reason, which is the
 * skipped-check-that-looks-like-a-pass the whole workflow exists to refuse.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { loadCatalog } from "../../tools/bom/catalog.ts"
import { topLevelForms } from "../../tools/pcb/board-forms.ts"
import { footprintInstanceForm } from "../../tools/pcb/footprint-instance.ts"
import {
  MOUNTING_FOOTPRINT, POLYGON_SIDES, PROJECT_LIBRARY, mountingHoleRule, mountingHoles,
} from "../../tools/pcb/mounting-hardware.ts"
import {
  containingPolygon, readMountingFootprint, ruleAreaForm,
} from "../../tools/pcb/mounting-hardware-forms.ts"
import { FIXTURE_ROOT, fixtureFiles, fixtures } from "../../tools/pcb/mounting-envelope-fixtures.ts"
import { footprintFile } from "../kicad/footprint-library.ts"

const REPO = path.resolve(import.meta.dir, "../..")
const CIRCUIT = path.join(REPO, "circuits/pt2399-core")
const RULES_FILE = path.join(CIRCUIT, "placement-rules.json")
const PROJECT_FOOTPRINT = path.join(CIRCUIT, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`)
const STOCK = "MountingHole:MountingHole_3.2mm_M3"
const WASHER = "washer-m3-flat-din125a-7mm-steel-zinc"
const SCREW = "screw-m3-pan-head-6mm-steel-zinc"

const rule = mountingHoleRule(JSON.parse(fs.readFileSync(RULES_FILE, "utf8")), RULES_FILE)

/** The radius of the one `F.CrtYd` circle in a mounting-hole footprint. */
function courtyardRadius(text: string, where: string): number {
  const circles = topLevelForms(text, where)
    .map((form) => text.slice(form.start, form.end))
    .filter((body) => body.startsWith("(fp_circle") && body.includes('(layer "F.CrtYd")'))
  if (circles.length !== 1) {
    throw new Error(
      `${where}: ${circles.length} F.CrtYd circles, expected exactly one. A mounting hole's ` +
        "courtyard IS the hardware envelope, and two circles would mean the envelope is whichever " +
        "one KiCad happens to use.",
    )
  }
  const body = circles[0] as string
  const centre = /\(center\s+(-?[\d.]+)\s+(-?[\d.]+)\)/.exec(body)
  const end = /\(end\s+(-?[\d.]+)\s+(-?[\d.]+)\)/.exec(body)
  if (centre === null || end === null) throw new Error(`${where}: the F.CrtYd circle has no center/end pair`)
  return Math.hypot(Number(end[1]) - Number(centre[1]), Number(end[2]) - Number(centre[2]))
}

/**
 * A footprint's forms, keyed so the same form in two files lines up: a
 * `property` by its name, an `fp_circle` by the layer it is drawn on, anything
 * else by its form name. Keying by POSITION would report every form after an
 * inserted one as changed.
 */
function formsByKey(text: string, where: string): ReadonlyMap<string, string> {
  const out = new Map<string, string>()
  for (const form of topLevelForms(text, where)) {
    const body = text.slice(form.start, form.end)
    let key = form.name
    if (form.name === "property") key = `property:${/^\(property\s+"([^"]*)"/.exec(body)?.[1] ?? "?"}`
    if (form.name === "fp_circle") key = `fp_circle:${/\(layer\s+"([^"]*)"\)/.exec(body)?.[1] ?? "?"}`
    if (out.has(key)) throw new Error(`${where}: two forms share the key "${key}"`)
    out.set(key, body)
  }
  return out
}

test("the approved rule is read, not remembered, and its own numbers are consistent", () => {
  console.log(
    `  placement-rules.json anchors.mounting_holes: ${rule.count} holes, ${rule.holeDiameterMm} mm ` +
      `drill, plated ${rule.plated}, ${rule.envelopeDiameterMm} mm envelope, ` +
      `${rule.centreInsetMm} mm centre inset`,
  )
  expect(rule.count).toBe(4)
  expect(rule.plated).toBe(false)
  // mountingHoleRule already refuses an envelope at or below the drill and an
  // inset that puts the washer over the edge; these assert the rule as approved
  // rather than only that it is self-consistent.
  expect(rule.holeDiameterMm).toBeCloseTo(3.2, 6)
  expect(rule.envelopeDiameterMm).toBeCloseTo(7.0, 6)
  expect(rule.centreInsetMm).toBeCloseTo(4.0, 6)
})

test("the project-local footprint's courtyard IS the approved envelope", () => {
  const project = courtyardRadius(readMountingFootprint(PROJECT_FOOTPRINT), PROJECT_FOOTPRINT)
  const stock = courtyardRadius(fs.readFileSync(footprintFile(STOCK), "utf8"), STOCK)
  console.log(`  ${STOCK}: courtyard ${(stock * 2).toFixed(3)} mm (models the SCREW HEAD)`)
  console.log(`  ${PROJECT_LIBRARY}:${MOUNTING_FOOTPRINT}: courtyard ${(project * 2).toFixed(3)} mm (the WASHER)`)
  expect(project * 2).toBeCloseTo(rule.envelopeDiameterMm, 6)

  // The whole reason a project-local footprint exists: the stock one is
  // smaller, so courtyards_overlap would quietly enforce 6.9 mm.
  expect(stock * 2).toBeCloseTo(6.9, 3)
  expect(project).toBeGreaterThan(stock)
})

test("the footprint is DERIVED from the stock one, not re-authored", () => {
  const mine = formsByKey(readMountingFootprint(PROJECT_FOOTPRINT), PROJECT_FOOTPRINT)
  const stock = formsByKey(fs.readFileSync(footprintFile(STOCK), "utf8"), STOCK)

  // Identity, not geometry. A derived footprint must say what it is and where
  // it came from, so these four are expected to differ and a difference in any
  // OTHER form is a failure.
  const identity = new Set(["generator", "descr", "tags", "property:Value"])
  // The one geometric difference, and the only reason this file exists.
  const geometry = new Set(["fp_circle:F.CrtYd"])
  // Stock carries a KiLib_Generator property naming the script that produced
  // it. It is DROPPED rather than copied: this file was not produced by
  // kicad-footprint-generator's mountinghole.py, and carrying its provenance
  // would be a false claim in the one field a reader would trust for provenance.
  const expectedAbsent = new Set(["property:KiLib_Generator"])

  const added = [...mine.keys()].filter((key) => !stock.has(key))
  const missing = [...stock.keys()].filter((key) => !mine.has(key))
  expect(added).toEqual([])
  expect(missing.sort()).toEqual([...expectedAbsent].sort())

  const changed: string[] = []
  for (const [key, body] of mine) {
    if (identity.has(key) || geometry.has(key)) continue
    if (body !== stock.get(key)) changed.push(key)
  }
  console.log(`  forms compared: ${mine.size}; identical: ${mine.size - identity.size - geometry.size}`)
  console.log(`  allowed to differ: ${[...identity, ...geometry].sort().join(", ")}`)
  console.log(`  deliberately absent: ${[...expectedAbsent].join(", ")}`)
  // THE DRILL AND THE NON-PLATED PAD ARE IN HERE. `pad` and `attr` are not on
  // either allowance list, so a 3.2 mm np_thru_hole that became plated, or a
  // changed drill, fails on this line.
  expect(changed).toEqual([])
  expect(mine.get("pad")).toContain("np_thru_hole")
  expect(mine.get("pad")).toContain("(drill 3.2)")
  expect(mine.get("pad")).toContain(`(size ${rule.holeDiameterMm} ${rule.holeDiameterMm})`)
})

test("the envelope is the catalogued washer's outside diameter, not a number of its own", () => {
  const catalog = loadCatalog(path.join(REPO, "parts"))
  const washer = catalog.get(WASHER)
  const screw = catalog.get(SCREW)
  if (washer === undefined) throw new Error(`parts/${WASHER}.json is missing - the envelope would then rest on nothing`)
  if (screw === undefined) throw new Error(`parts/${SCREW}.json is missing`)
  const od = washer.specs.diameterMm
  const head = screw.specs.diameterMm
  if (od === undefined || head === undefined) throw new Error("both hardware entries need specs.diameterMm")
  console.log(`  washer ${washer.mpn}: ${od} mm outside diameter`)
  console.log(`  screw ${screw.mpn}: ${head} mm head diameter`)

  // 0.05 mm, not exact equality, and the tolerance is the inch conversion
  // rather than slack: Digi-Key states this washer's OD as 0.276 in, which is
  // 7.0104 mm. What this catches is a washer SWAP - the rule's own
  // envelope_source names DIN 433 / ISO 7092 at 6.0 mm and DIN 9021 at 9.0 mm,
  // and neither is distinguishable from this one by the words "M3 flat washer".
  expect(Math.abs(od - rule.envelopeDiameterMm)).toBeLessThan(0.05)

  // The measurement that refutes modelling a mounting hole by its screw, which
  // is what every stock KiCad mounting-hole courtyard does.
  expect(head).toBeLessThan(od)

  // Every number either entry claims carries evidence for that exact spec.
  for (const entry of [washer, screw]) {
    expect(entry.evidence.some((e) => e.spec === "diameterMm")).toBe(true)
    expect(entry.evidence.some((e) => e.spec === "mpn")).toBe(true)
  }
})

test("the four hole centres are derived from an outline and the rule, and refuse an outline too small", () => {
  // A PURE derivation over an ARBITRARY stated outline, deliberately not the
  // board's own 150 x 100 mm: what this asserts is the rule's arithmetic over
  // any rectangle, including the refusal for one too small to hold four
  // envelopes. `tests/pcb/settled-mounting-holes.test.ts` is where the SAME
  // function is run against the real outline and compared with the four holes
  // actually on the board, so neither file has to stand in for the other.
  //
  // THIS COMMENT SAID THE BOARD'S GEOMETRY WAS "ON HOLD" UNTIL THE REVIEW
  // CAUGHT IT. It was, for part of this task, and the hold was lifted in the
  // same session - so the sentence outlived its cause and told a reader the
  // board had no mounting holes when it has four.
  const outline = { x0: 10, y0: 20, x1: 90, y1: 70 }
  const holes = mountingHoles(outline, rule)
  expect(holes.map((h) => h.corner)).toEqual(["nw", "ne", "se", "sw"])
  expect(holes.map((h) => [h.x, h.y])).toEqual([
    [14, 24],
    [86, 24],
    [86, 66],
    [14, 66],
  ])
  // Inset from BOTH edges its corner is formed by - not along one axis.
  for (const hole of holes) {
    expect(Math.min(hole.x - outline.x0, outline.x1 - hole.x)).toBeCloseTo(rule.centreInsetMm, 6)
    expect(Math.min(hole.y - outline.y0, outline.y1 - hole.y)).toBeCloseTo(rule.centreInsetMm, 6)
  }
  // And it refuses rather than moving two holes closer together than their own
  // envelopes: the inset and the envelope are both approved, so the outline is
  // the thing that has to give.
  const tooSmall = { x0: 0, y0: 0, x1: 14, y1: 14 }
  expect(() => mountingHoles(tooSmall, rule)).toThrow(/cannot hold four holes/)
})

test("the Rule Area's polygon CONTAINS the envelope circle rather than being inscribed in it", () => {
  const radius = rule.envelopeDiameterMm / 2
  const pts = containingPolygon(0, 0, radius)
  expect(pts.length).toBe(POLYGON_SIDES)

  // Every vertex is at least the radius out...
  for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeGreaterThanOrEqual(radius)
  // ...and so is every edge at its CLOSEST point, which is the half that
  // matters: an inscribed polygon's vertices also sit on the circle while its
  // edges cut inside it, leaving slivers of permitted copper under the washer
  // that the gate would report as clean.
  let worst = Infinity
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i] as readonly [number, number]
    const b = pts[(i + 1) % pts.length] as readonly [number, number]
    // Distance from the centre to the segment's midpoint is the edge's closest approach.
    worst = Math.min(worst, Math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))
  }
  console.log(
    `  ${POLYGON_SIDES}-gon around r=${radius}: closest edge at ${worst.toFixed(6)} mm ` +
      `(+${((worst - radius) * 1000).toFixed(3)} um)`,
  )
  // Strictly outside, with no epsilon slack. This line was red at
  // 3.4999549 mm before the rounding guard existed: writing coordinates to
  // 0.1 um and rounding to NEAREST pulled the worst edge 45 nm inside the
  // circle, which inverts the only guarantee this function makes.
  expect(worst).toBeGreaterThan(radius)
  // And not generously outside either - an envelope that grew would reject
  // parts nobody approved rejecting. 10 um is two orders below every
  // fabrication tolerance in docs/standards/pcbway-fab-rules.md.
  expect(worst - radius).toBeLessThan(0.01)
})

test("the Rule Area leaves pads and footprints ALLOWED, which is the measured defect it closes", () => {
  const form = ruleAreaForm({ cx: 1, cy: 2, envelopeDiameterMm: rule.envelopeDiameterMm, name: "x", uuid: "u" })
  // An earlier draft made all five not_allowed and the area then rejected its
  // own mounting hole. tests/pcb/mounting-envelope-drc.test.ts measures that
  // with the real tool; this is the cheap guard on the emitter itself.
  expect(form).toContain("(tracks not_allowed)")
  expect(form).toContain("(vias not_allowed)")
  expect(form).toContain("(copperpour not_allowed)")
  expect(form).toContain("(pads allowed)")
  expect(form).toContain("(footprints allowed)")
})

test("a footprint instance is built from the library file, and refuses a name that is not in it", () => {
  const text = readMountingFootprint(PROJECT_FOOTPRINT)
  const instance = footprintInstanceForm(text, PROJECT_FOOTPRINT, {
    library: PROJECT_LIBRARY,
    name: MOUNTING_FOOTPRINT,
    reference: "MH1",
    x: 12.5,
    y: 30,
    uuid: "abc",
    locked: true,
    boardOnly: true,
  })
  expect(instance).toContain(`(footprint "${PROJECT_LIBRARY}:${MOUNTING_FOOTPRINT}"`)
  expect(instance).toContain("(locked yes)")
  // Six decimals, which is the spelling a board carries an origin in - see
  // `coord` in footprint-instance.ts for why that is not a preference.
  expect(instance).toContain("(at 12.500000 30.000000)")
  expect(instance).toContain('"MH1"')
  expect(instance).not.toContain("REF**")
  expect(instance).toContain("(attr board_only exclude_from_pos_files exclude_from_bom)")
  // The file-level forms belong to the file, not to the instance.
  expect(instance).not.toContain("(generator ")
  expect(instance).not.toContain("(version ")
  // The courtyard comes across untouched, which is the point of reading the file.
  expect(instance).toContain("(end 3.5 0)")

  expect(() =>
    footprintInstanceForm(text, PROJECT_FOOTPRINT, {
      library: PROJECT_LIBRARY,
      name: "MountingHole_3.2mm_M3",
      reference: "MH1", x: 0, y: 0, uuid: "u", locked: false, boardOnly: false,
    }),
  ).toThrow(/declares footprint/)
})

test("EVERY file the generator writes into a fixture is what the committed fixture holds", () => {
  // ITERATED FROM THE GENERATOR'S OWN FILE MAP, not from a list here. This test
  // compared two of the five files - the board and the library copy - and left
  // the `.kicad_pro`, the `fp-lib-table` and `NOTES.txt` unchecked. The
  // `.kicad_pro` is derived from the project's with a filename substitution, so
  // a change to the project's DRC severities would not have propagated and
  // nothing would have gone red; `NOTES.txt` carries the component fixture's
  // generation-time measurements, so a stale copy would claim a geometry the
  // fixture no longer has.
  //
  // COMPARED BY CONTENT, never by timestamp: git does not preserve mtimes, so
  // an mtime comparison makes stale look current.
  const library = readMountingFootprint(PROJECT_FOOTPRINT)
  let compared = 0
  for (const fixture of fixtures()) {
    const dir = path.join(FIXTURE_ROOT, fixture.name)
    const files = fixtureFiles(fixture)
    console.log(`  ${fixture.name}: ${files.size} file(s)`)
    // A floor on the set, so a generator that stopped writing most of a fixture
    // would fail here rather than make this loop vacuous.
    expect(files.size).toBeGreaterThanOrEqual(5)
    for (const [relative, content] of files) {
      const target = path.join(dir, relative)
      if (!fs.existsSync(target)) {
        throw new Error(
          `${target} is missing. Regenerate with: bun tools/pcb/mounting-envelope-fixtures.ts --write`,
        )
      }
      expect(fs.readFileSync(target, "utf8"), `${fixture.name}/${relative}`).toBe(content)
      compared += 1
    }
    // The library copy must not become a second source of truth for the
    // courtyard, which is a stronger statement than "it matches the generator":
    // it matches the PROJECT library the board itself uses.
    expect(
      fs.readFileSync(path.join(dir, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`), "utf8"),
    ).toBe(library)
  }
  console.log(`  ${compared} file(s) compared by content`)
  expect(compared).toBeGreaterThanOrEqual(15)
})
