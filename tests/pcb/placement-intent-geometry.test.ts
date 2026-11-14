/**
 * THE TWO GEOMETRIC FACTS THE DRAFTED PLACEMENT INTENT TURNS ON, re-derived on
 * every run from the circuit model and the installed KiCad footprint library.
 *
 * `circuits/pt2399-core/floorplan-intent.json` and `placement-rules.json` each
 * carry one number that is a DERIVATION rather than a preference, and a
 * derivation written into a JSON note is a transcription with a date on it.
 * This repository's rule is that a measurement lives in a tool or a test that
 * re-runs it, so these two live here:
 *
 *  1. **`edge_connectors[J1].max_setback_mm` is below the narrowest courtyard
 *     dimension of any footprint this circuit places.** That is what the
 *     setback MEANS - at a setback below the smallest part, nothing on this
 *     board can be placed between the header and the board edge. If KiCad's
 *     libraries ship a smaller part, or the circuit gains one, the sentence
 *     stops being true and this test says so instead of the intent quietly
 *     meaning something weaker.
 *
 *  2. **`separation.input_to_output.min_gap_mm` is the copper gap between J1's
 *     own INPUT and OUTPUT pads.** The circuit model puts OUTPUT on J1 pin 4
 *     and INPUT on J1 pin 5 - adjacent pins - so the tightest approach of those
 *     two nets anywhere on the board is fixed by the schematic and the
 *     footprint. That measurement is also the whole of the reasoning for
 *     writing NO custom `.kicad_dru` isolation rule: a rule demanding more than
 *     this gap would reject the board's own connector, and one demanding less
 *     than the project's global copper clearance would add nothing.
 *
 * And one figure quoted from the library rather than derived: the stock
 * `MountingHole:MountingHole_3.2mm_M3` courtyard, which `placement-rules.json`
 * cites as 6.9 mm when it says Task 8 must derive a project-local footprint at
 * 7.0 mm. A stock courtyard that silently changed would make that instruction
 * wrong in a way nobody would see.
 *
 * THIS TEST DOES NOT OPEN THE BOARD. Nothing here reads a part position: the
 * intent it checks was authored from the circuit model, and a check that
 * consulted the layout would be grading the layout against itself.
 */
import { test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { parseSexpr, child, type SNode } from "../../lib/kicad/sexpr.ts"
import { footprintFile } from "../kicad/footprint-library.ts"
import { pt2399Core, DESIGNATORS } from "../../circuits/pt2399-core/pt2399-core.ts"

const CIRCUIT_DIR = path.resolve(import.meta.dir, "../../circuits/pt2399-core")
const MOUNTING_HOLE = "MountingHole:MountingHole_3.2mm_M3"

interface Extent {
  readonly wide: number
  readonly narrow: number
}

function readFootprint(name: string): SNode {
  const file = footprintFile(name)
  if (!fs.existsSync(file)) {
    throw new Error(
      `footprint "${name}" is not at ${file}. Install KiCad or set KICAD_FOOTPRINTS. This ` +
        "test does not skip: the two numbers in the drafted placement intent are derived from " +
        "these files, and an absent library would make both derivations pass for the wrong reason.",
    )
  }
  return parseSexpr(fs.readFileSync(file, "utf8"))
}

function pointsOf(node: SNode): readonly (readonly [number, number])[] {
  const out: (readonly [number, number])[] = []
  for (const key of ["start", "end", "mid", "center"]) {
    const found = child(node, key)
    if (found === undefined) continue
    const x = Number(found.atoms[0])
    const y = Number(found.atoms[1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`(${node.name} (${key} ...)) does not carry two numbers`)
    }
    out.push([x, y])
  }
  for (const pts of node.nodes.filter((n) => n.name === "pts")) {
    for (const xy of pts.nodes.filter((n) => n.name === "xy")) {
      out.push([Number(xy.atoms[0]), Number(xy.atoms[1])])
    }
  }
  return out
}

/**
 * The courtyard's bounding box, as two numbers: its longer and shorter side.
 *
 * A circular courtyard - every mounting hole and every radial electrolytic
 * here - is `(fp_circle (center ..) (end ..))`, where the end point sits on the
 * circumference. Taking its two points literally would report a zero-height box
 * and hand this test a "narrowest dimension" of 0.0 for three of the seven
 * footprints, which is why the radius is expanded in both axes rather than the
 * points being read off.
 */
function courtyardExtent(name: string): Extent {
  const root = readFootprint(name)
  const xs: number[] = []
  const ys: number[] = []
  for (const node of root.nodes) {
    if (!/^fp_(line|rect|poly|circle|arc)$/.test(node.name)) continue
    const layer = child(node, "layer")?.atoms[0]
    if (layer !== "F.CrtYd" && layer !== "B.CrtYd") continue
    if (node.name === "fp_circle") {
      const centre = child(node, "center")
      const edge = child(node, "end")
      if (centre === undefined || edge === undefined) {
        throw new Error(`${name}: an fp_circle on the courtyard layer has no center/end pair`)
      }
      const cx = Number(centre.atoms[0])
      const cy = Number(centre.atoms[1])
      const radius = Math.hypot(Number(edge.atoms[0]) - cx, Number(edge.atoms[1]) - cy)
      xs.push(cx - radius, cx + radius)
      ys.push(cy - radius, cy + radius)
      continue
    }
    for (const [x, y] of pointsOf(node)) {
      xs.push(x)
      ys.push(y)
    }
  }
  if (xs.length === 0) {
    throw new Error(
      `${name} declares no F.CrtYd or B.CrtYd geometry, so it has no courtyard to measure. ` +
        "A footprint with no courtyard is invisible to KiCad's courtyards_overlap check and " +
        "cannot be used on this board - see docs/standards/pcbway-fab-rules.md.",
    )
  }
  const w = Math.max(...xs) - Math.min(...xs)
  const h = Math.max(...ys) - Math.min(...ys)
  return { wide: Math.max(w, h), narrow: Math.min(w, h) }
}

interface Pad {
  readonly number: string
  readonly x: number
  readonly y: number
  readonly sizeX: number
  readonly sizeY: number
}

function padsOf(name: string): readonly Pad[] {
  const root = readFootprint(name)
  const out: Pad[] = []
  for (const node of root.nodes.filter((n) => n.name === "pad")) {
    const at = child(node, "at")
    const size = child(node, "size")
    if (at === undefined || size === undefined) {
      throw new Error(`${name}: a (pad ...) form carries no (at ..) or no (size ..)`)
    }
    out.push({
      number: node.atoms[0] ?? "",
      x: Number(at.atoms[0]),
      y: Number(at.atoms[1]),
      sizeX: Number(size.atoms[0]),
      sizeY: Number(size.atoms[1]),
    })
  }
  if (out.length === 0) throw new Error(`${name} declares no pads, which cannot be right.`)
  return out
}

function readJson(file: string): Record<string, unknown> {
  const full = path.join(CIRCUIT_DIR, file)
  if (!fs.existsSync(full)) throw new Error(`${full} does not exist`)
  const parsed: unknown = JSON.parse(fs.readFileSync(full, "utf8"))
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${full}: expected a JSON object at the top level`)
  }
  return parsed as Record<string, unknown>
}

/** One field, read through a chain of object keys, refusing rather than defaulting. */
function numberAt(root: Record<string, unknown>, where: string, ...keys: readonly string[]): number {
  let node: unknown = root
  const walked: string[] = []
  for (const key of keys) {
    if (typeof node !== "object" || node === null || Array.isArray(node) || !(key in node)) {
      throw new Error(
        `${where}: no ${[...walked, key].join(".")}. This test reads the number the file ` +
          "declares rather than carrying its own copy, so a renamed or deleted key is a " +
          "failure here and not a silently skipped check.",
      )
    }
    walked.push(key)
    node = (node as Record<string, unknown>)[key]
  }
  if (typeof node !== "number") throw new Error(`${where}: ${walked.join(".")} is not a number`)
  return node
}

/** The distinct footprints the circuit model declares, by the designator that carries each. */
function declaredFootprints(): ReadonlyMap<string, readonly string[]> {
  const byFootprint = new Map<string, string[]>()
  for (const component of pt2399Core().components) {
    const footprint = component.part?.footprint
    if (footprint === undefined) {
      throw new Error(
        `component "${component.id}" declares no part.footprint. Every part on this board is ` +
          "physicalized, and a missing footprint would silently shrink the set this test " +
          "searches for the narrowest courtyard.",
      )
    }
    const ref = DESIGNATORS[component.id]
    if (ref === undefined) throw new Error(`component "${component.id}" is not in DESIGNATORS`)
    const held = byFootprint.get(footprint)
    if (held === undefined) byFootprint.set(footprint, [ref])
    else held.push(ref)
  }
  return byFootprint
}

test("J1's approved setback is below the narrowest part on this board", () => {
  const declared = declaredFootprints()
  const narrowest: { name: string; narrow: number }[] = []
  for (const [footprint, refs] of declared) {
    const extent = courtyardExtent(footprint)
    narrowest.push({ name: footprint, narrow: extent.narrow })
    console.log(
      `  ${[...refs].sort().join(",").padEnd(18)} ${extent.wide.toFixed(3)} x ` +
        `${extent.narrow.toFixed(3)} mm  ${footprint}`,
    )
  }
  const floor = Math.min(...narrowest.map((n) => n.narrow))
  const owner = narrowest.filter((n) => n.narrow === floor).map((n) => n.name)
  console.log(`  narrowest courtyard dimension on this board: ${floor.toFixed(3)} mm (${owner.join(", ")})`)

  const intent = readJson("floorplan-intent.json")
  const connectors = intent["edge_connectors"]
  if (!Array.isArray(connectors) || connectors.length !== 1) {
    throw new Error("floorplan-intent.json: expected exactly one edge_connectors entry (J1)")
  }
  const j1 = connectors[0] as Record<string, unknown>
  expect(j1["ref"]).toBe("J1")
  const setback = numberAt(j1, "floorplan-intent.json edge_connectors[0]", "max_setback_mm")

  // Strictly below, not equal: at exactly the floor a part fits with nothing
  // to spare, and the claim the setback makes is that one cannot.
  expect(setback).toBeLessThan(floor)
})

test("the INPUT/OUTPUT floor is J1's own pad gap, which the schematic fixes", () => {
  const header = pt2399Core().components.find((c) => c.id === "power_signal_header")
  if (header === undefined) throw new Error("the circuit model declares no power_signal_header")
  const footprint = header.part?.footprint
  if (footprint === undefined) throw new Error("power_signal_header declares no part.footprint")

  const pinNets = new Map<string, string>()
  for (const pins of [...header.units.map((u) => u.pins), header.pins]) {
    for (const [pin, connection] of Object.entries(pins)) {
      // A pin declared NC carries no net and is not a candidate; there is no
      // such pin on this header, and a silent skip would hide it if there were.
      if (connection.kind === "net") pinNets.set(pin, connection.net)
    }
  }

  const pinOf = (net: string): number => {
    const hits = [...pinNets].filter(([, n]) => n === net).map(([p]) => Number(p))
    if (hits.length !== 1) {
      throw new Error(
        `the circuit model puts net "${net}" on ${hits.length} pins of the header, not one. ` +
          "The input-to-output floor is derived from one pad against one pad and cannot be " +
          "computed from a different arrangement.",
      )
    }
    return hits[0] as number
  }
  const inputPin = pinOf("INPUT")
  const outputPin = pinOf("OUTPUT")
  console.log(`  the model puts OUTPUT on J1 pin ${outputPin} and INPUT on J1 pin ${inputPin}`)

  // The whole derivation rests on these two being neighbours. If a revision of
  // the schematic separates them, the floor below is no longer the board's
  // worst case and the no-.kicad_dru decision has to be taken again.
  expect(Math.abs(inputPin - outputPin)).toBe(1)

  const pads = padsOf(footprint)
  const find = (n: number): Pad => {
    const pad = pads.find((p) => p.number === String(n))
    if (pad === undefined) throw new Error(`${footprint} has no pad ${n}`)
    return pad
  }
  const a = find(inputPin)
  const b = find(outputPin)
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  const gap =
    dx > dy ? dx - (a.sizeX + b.sizeX) / 2 : dy - (a.sizeY + b.sizeY) / 2
  console.log(
    `  pad centres ${Math.max(dx, dy).toFixed(2)} mm apart, pads ` +
      `${a.sizeX.toFixed(2)} x ${a.sizeY.toFixed(2)} mm -> ${gap.toFixed(2)} mm of copper gap`,
  )

  const rules = readJson("placement-rules.json")
  const floor = numberAt(
    rules,
    "placement-rules.json",
    "separation",
    "input_to_output",
    "min_gap_mm",
  )
  expect(floor).toBeCloseTo(gap, 2)
})

test("the stock M3 mounting-hole courtyard is still the 6.9 mm the rules cite", () => {
  const extent = courtyardExtent(MOUNTING_HOLE)
  console.log(`  ${MOUNTING_HOLE}: courtyard ${extent.wide.toFixed(3)} mm across`)
  expect(extent.wide).toBeCloseTo(extent.narrow, 6)
  expect(extent.wide).toBeCloseTo(6.9, 3)

  // And the envelope Task 8 must derive is larger than it, which is the only
  // reason the derivation is needed at all.
  const rules = readJson("placement-rules.json")
  const envelope = numberAt(
    rules,
    "placement-rules.json",
    "anchors",
    "mounting_holes",
    "envelope_diameter_mm",
  )
  expect(envelope).toBeGreaterThan(extent.wide)
})
