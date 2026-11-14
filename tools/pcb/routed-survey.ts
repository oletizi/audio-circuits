/**
 * WHAT COPPER A ROUTE RUN ACTUALLY PRODUCED, AND WHETHER IT MOVED A PART -
 * read off the bytes of the saved board rather than taken from the router's
 * own tally.
 *
 * Two measurements, both of which the Phase 1 probe needs and neither of which
 * anything else here takes:
 *
 *  - `copperGeometry` - every track width and via size on the board, with the
 *    narrowest of each. **This exists because the router necks a blocked track
 *    DOWN a fabrication ladder on its own**, and that is the first of the three
 *    named likely causes of a Phase 1 failure
 *    (`docs/superpowers/specs/2026-11-12-agent-pcb-place-and-route-design.md`).
 *    The engine's own `check_drc.py` grades size against ITS 2-layer defaults -
 *    measured on the pinned engine: *"track >= 0.1mm, via dia >= 0.25mm, via
 *    drill >= 0.15mm"* - which are far below this project's standard, so a
 *    necked track passes that grader. KiCad's DRC does check the standard's
 *    minimums, and this is the third, independent read: the narrowest piece of
 *    copper as a NUMBER, so "nothing necked" is a figure rather than the
 *    absence of a violation.
 *  - `partPoses` / `movedParts` - every footprint's reference, position,
 *    rotation and layer, and the difference between two boards. The placement is
 *    the artifact the owner's approved criteria graded; a route run that moved a
 *    part would invalidate that grade silently, because the routed board still
 *    grades clean against an intent it was re-resolved from.
 *
 * **IT COMPARES AND REPORTS; IT HOLDS NO THRESHOLD OF ITS OWN.** The floors it
 * is checked against are read from a file - `circuits/pt2399-core/route-fab-floor.txt`,
 * the standing floor the approved `placement-policy.json` requires be handed to
 * the router - and never written here. An agent may not author the acceptance
 * criteria for the artifact it is producing, and a floor figure typed into this
 * file would be exactly that.
 *
 * **WHAT IT DOES NOT CHECK, so a clean run is not read as more than it is:**
 * clearance (KiCad's DRC and the engine's `check_drc.py` both do), isolated
 * copper fill (KiCad's `isolated_copper` check), and connectivity (the engine's
 * `check_connected.py`). It is a geometry and pose reader, not a grader.
 *
 * `bun tools/pcb/routed-survey.ts <board.kicad_pcb> [--floor <fab-floor.txt>] [--against <reference.kicad_pcb>] [--json]`
 */
import fs from "node:fs"
import { child, parseSexpr } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"

/** One footprint's pose, in board coordinates. */
export interface PartPose {
  readonly ref: string
  readonly x: number
  readonly y: number
  readonly rotation: number
  readonly layer: string
}

export interface TrackWidths {
  /** Width in mm -> how many segments carry it, so a single necked segment is visible rather than averaged away. */
  readonly byWidthMm: ReadonlyMap<number, number>
  readonly segments: number
  readonly narrowestMm: number | null
}

export interface ViaSizes {
  /** `diameter/drill` in mm -> count. */
  readonly bySizeMm: ReadonlyMap<string, number>
  readonly vias: number
  readonly narrowestDiameterMm: number | null
  readonly narrowestDrillMm: number | null
}

export interface CopperGeometry {
  readonly tracksByLayer: ReadonlyMap<string, TrackWidths>
  readonly vias: ViaSizes
  readonly narrowestTrackMm: number | null
}

function requiredNumber(node: SNode, key: string, where: string): number {
  const found = child(node, key)
  if (found === undefined) throw new Error(`${where}: no (${key} ...)`)
  const value = Number(found.atoms[0])
  if (!Number.isFinite(value)) throw new Error(`${where}: (${key} ...) does not carry a number`)
  return value
}

function bump<K>(into: Map<K, number>, key: K): void {
  into.set(key, (into.get(key) ?? 0) + 1)
}

function root(boardPath: string): SNode {
  const node = parseSexpr(fs.readFileSync(boardPath, "utf8"))
  if (node.name !== "kicad_pcb") throw new Error(`${boardPath} does not start with (kicad_pcb ...)`)
  return node
}

export function copperGeometry(boardPath: string): CopperGeometry {
  const board = root(boardPath)
  const widthsByLayer = new Map<string, Map<number, number>>()
  for (const segment of board.nodes.filter((n) => n.name === "segment" || n.name === "arc")) {
    const layer = child(segment, "layer")?.atoms[0]
    if (layer === undefined) throw new Error(`${boardPath}: a ${segment.name} has no (layer ...)`)
    const width = requiredNumber(segment, "width", `${boardPath}: a ${segment.name} on ${layer}`)
    const forLayer = widthsByLayer.get(layer) ?? new Map<number, number>()
    bump(forLayer, width)
    widthsByLayer.set(layer, forLayer)
  }
  const tracksByLayer = new Map<string, TrackWidths>()
  let narrowestTrackMm: number | null = null
  for (const [layer, byWidthMm] of widthsByLayer) {
    const widths = [...byWidthMm.keys()].sort((a, b) => a - b)
    const narrowest = widths[0] ?? null
    if (narrowest !== null && (narrowestTrackMm === null || narrowest < narrowestTrackMm)) narrowestTrackMm = narrowest
    tracksByLayer.set(layer, {
      byWidthMm,
      segments: [...byWidthMm.values()].reduce((a, b) => a + b, 0),
      narrowestMm: narrowest,
    })
  }

  const bySizeMm = new Map<string, number>()
  let narrowestDiameterMm: number | null = null
  let narrowestDrillMm: number | null = null
  const viaNodes = board.nodes.filter((n) => n.name === "via")
  for (const via of viaNodes) {
    const size = requiredNumber(via, "size", `${boardPath}: a via`)
    const drill = requiredNumber(via, "drill", `${boardPath}: a via`)
    bump(bySizeMm, `${size}/${drill}`)
    if (narrowestDiameterMm === null || size < narrowestDiameterMm) narrowestDiameterMm = size
    if (narrowestDrillMm === null || drill < narrowestDrillMm) narrowestDrillMm = drill
  }
  return {
    tracksByLayer,
    vias: { bySizeMm, vias: viaNodes.length, narrowestDiameterMm, narrowestDrillMm },
    narrowestTrackMm,
  }
}

export function partPoses(boardPath: string): readonly PartPose[] {
  const board = root(boardPath)
  const out: PartPose[] = []
  for (const footprint of board.nodes.filter((n) => n.name === "footprint")) {
    const library = footprint.atoms[0] ?? "?"
    const ref =
      footprint.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1] ?? library
    const atNode = child(footprint, "at")
    if (atNode === undefined) throw new Error(`${boardPath}: footprint ${ref} has no (at ...)`)
    const x = Number(atNode.atoms[0])
    const y = Number(atNode.atoms[1])
    const rotation = atNode.atoms[2] === undefined ? 0 : Number(atNode.atoms[2])
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rotation)) {
      throw new Error(`${boardPath}: footprint ${ref} has an unreadable (at ...)`)
    }
    const layer = child(footprint, "layer")?.atoms[0]
    if (layer === undefined) throw new Error(`${boardPath}: footprint ${ref} has no (layer ...)`)
    out.push({ ref, x, y, rotation, layer })
  }
  return out
}

export interface PoseDifference {
  readonly ref: string
  readonly what: string
}

/**
 * A rotation reduced to [0, 360), so the SAME orientation written two ways is
 * one value.
 *
 * **MEASURED, NOT ANTICIPATED.** The first run of this tool on the probe's
 * routed board reported `C12: rotated from 270 to -90` and `R3: rotated from
 * 270 to -90`. The adopted board writes `(at 107.000000 80.400000 270)` and the
 * routed one `(at 107 80.4 -90)`: the same pose, re-serialised by the routing
 * engine's writer. Two parts read as moved while nothing had moved - which on
 * this check is the expensive direction, because a false "a part moved" on the
 * one measurement that guards the approved placement is indistinguishable from
 * the real thing until somebody opens both files.
 *
 * The coordinates need no such treatment and get none: they are compared as
 * NUMBERS, so `107.000000` and `107` are already equal, and a tolerance there
 * would be a licence for a part to drift by whatever the tolerance was.
 */
export function normalisedRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/**
 * Every way the two boards' footprints differ in reference, pose or layer.
 * Position is compared as an exact number; rotation through
 * `normalisedRotation`, which is a different claim and says why.
 */
export function movedParts(reference: readonly PartPose[], candidate: readonly PartPose[]): readonly PoseDifference[] {
  const out: PoseDifference[] = []
  const byRef = new Map(candidate.map((p) => [p.ref, p]))
  for (const before of reference) {
    const after = byRef.get(before.ref)
    if (after === undefined) {
      out.push({ ref: before.ref, what: "present on the reference board and absent from the candidate" })
      continue
    }
    byRef.delete(before.ref)
    if (after.x !== before.x || after.y !== before.y) {
      out.push({ ref: before.ref, what: `moved from (${before.x}, ${before.y}) to (${after.x}, ${after.y})` })
    }
    if (normalisedRotation(after.rotation) !== normalisedRotation(before.rotation)) {
      out.push({ ref: before.ref, what: `rotated from ${before.rotation} to ${after.rotation}` })
    }
    if (after.layer !== before.layer) out.push({ ref: before.ref, what: `moved from ${before.layer} to ${after.layer}` })
  }
  for (const ref of byRef.keys()) {
    out.push({ ref, what: "absent from the reference board and present on the candidate" })
  }
  return out
}

/** The `key = value` lines of a fab-floor override file, in mm. Comments and blanks ignored. */
export function readFabFloor(floorPath: string): ReadonlyMap<string, number> {
  const out = new Map<string, number>()
  const lines = fs.readFileSync(floorPath, "utf8").split("\n")
  for (const [index, raw] of lines.entries()) {
    const line = raw.replace(/#.*$/, "").trim()
    if (line === "") continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?[0-9.]+)$/.exec(line)
    if (match === null) {
      throw new Error(`${floorPath}:${index + 1}: not a "key = number" line and not a comment: ${JSON.stringify(raw)}`)
    }
    out.set(match[1] as string, Number(match[2]))
  }
  if (out.size === 0) throw new Error(`${floorPath} declares no floors; a floor file with nothing in it checks nothing.`)
  return out
}

/** Copper narrower than a floor the file declares, named with both figures. */
export function belowFloor(geometry: CopperGeometry, floor: ReadonlyMap<string, number>): readonly string[] {
  const out: string[] = []
  const check = (what: string, actual: number | null, key: string): void => {
    const limit = floor.get(key)
    if (limit === undefined || actual === null) return
    if (actual < limit) out.push(`${what} is ${actual} mm, below the declared ${key} floor of ${limit} mm`)
  }
  check("the narrowest track", geometry.narrowestTrackMm, "track_width")
  check("the narrowest via diameter", geometry.vias.narrowestDiameterMm, "via_diameter")
  check("the narrowest via drill", geometry.vias.narrowestDrillMm, "via_drill")
  return out
}

function main(): number {
  const argv = process.argv.slice(2)
  const board = argv[0]
  if (board === undefined) {
    console.error(
      "usage: bun tools/pcb/routed-survey.ts <board.kicad_pcb> [--floor <fab-floor.txt>] [--against <reference.kicad_pcb>] [--json]",
    )
    return 2
  }
  let floorPath: string | undefined
  let againstPath: string | undefined
  let json = false
  for (let i = 1; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === "--json") json = true
    else if (flag === "--floor") (floorPath = argv[i + 1]), (i += 1)
    else if (flag === "--against") (againstPath = argv[i + 1]), (i += 1)
    else {
      console.error(`unrecognised argument ${JSON.stringify(flag)}`)
      return 2
    }
  }
  if (floorPath === undefined && argv.includes("--floor")) throw new Error("--floor needs a path")
  if (againstPath === undefined && argv.includes("--against")) throw new Error("--against needs a path")

  const geometry = copperGeometry(board)
  const floor = floorPath === undefined ? undefined : readFabFloor(floorPath)
  const under = floor === undefined ? [] : belowFloor(geometry, floor)
  const differences =
    againstPath === undefined ? undefined : movedParts(partPoses(againstPath), partPoses(board))

  if (json) {
    console.log(
      JSON.stringify(
        {
          board,
          tracks_by_layer: Object.fromEntries(
            [...geometry.tracksByLayer].map(([layer, t]) => [
              layer,
              { segments: t.segments, narrowest_mm: t.narrowestMm, by_width_mm: Object.fromEntries(t.byWidthMm) },
            ]),
          ),
          narrowest_track_mm: geometry.narrowestTrackMm,
          vias: {
            count: geometry.vias.vias,
            narrowest_diameter_mm: geometry.vias.narrowestDiameterMm,
            narrowest_drill_mm: geometry.vias.narrowestDrillMm,
            by_size_mm: Object.fromEntries(geometry.vias.bySizeMm),
          },
          floor_file: floorPath ?? null,
          below_floor: under,
          compared_against: againstPath ?? null,
          moved_parts: differences === undefined ? null : differences.map((d) => `${d.ref}: ${d.what}`),
        },
        null,
        2,
      ),
    )
  } else {
    console.log(`copper on ${board}`)
    for (const [layer, t] of geometry.tracksByLayer) {
      const widths = [...t.byWidthMm].sort((a, b) => a[0] - b[0]).map(([w, n]) => `${w} mm x${n}`)
      console.log(`  ${layer}: ${t.segments} segment(s), narrowest ${t.narrowestMm ?? "none"} mm [${widths.join(", ")}]`)
    }
    const viaSizes = [...geometry.vias.bySizeMm].map(([s, n]) => `${s} mm x${n}`)
    console.log(`  vias: ${geometry.vias.vias} [${viaSizes.join(", ")}]`)
    console.log(`  narrowest track over all layers: ${geometry.narrowestTrackMm ?? "none"} mm`)
    if (floor !== undefined) {
      console.log(`  against the floors declared in ${floorPath}:`)
      if (under.length === 0) console.log("    nothing below a declared floor")
      for (const line of under) console.log(`    BELOW FLOOR: ${line}`)
    }
    if (differences !== undefined) {
      console.log(`  footprint poses against ${againstPath}:`)
      if (differences.length === 0) console.log("    no part moved: every reference, position, rotation and layer is identical")
      for (const d of differences) console.log(`    MOVED: ${d.ref}: ${d.what}`)
    }
  }
  return under.length === 0 && (differences === undefined || differences.length === 0) ? 0 : 1
}

if (import.meta.main) process.exit(main())
