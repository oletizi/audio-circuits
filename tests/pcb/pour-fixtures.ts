/**
 * HAND-BUILT BOARDS FOR `tests/pcb/pour*.test.ts`, with the pour authored as
 * polygons rather than produced by KiCad - so that every number the tests assert
 * is one that can be worked out on paper from the geometry written here.
 *
 * NOTHING HERE ASSERTS ANYTHING, and nothing here is a threshold. A fixture is
 * a board whose copper is known; the tests say what the measurement reads off it.
 *
 * **THE FOOTPRINT NAMES ARE `SYNTHETIC:`**, this repository's prefix for a
 * deliberately fictional footprint. The measurement reads pads, references and
 * courtyards, never a library part, and a plausible-looking name would be the
 * invention this project has twice shipped.
 *
 * Geometry, in mm. The pour is a 60 x 40 rectangle with its left edge on x = 0.
 * Each ground pad is a 1.6 mm circle, so its copper reaches 0.8 mm, and a
 * thermal relief is a void out to 1.3 mm (a 0.5 mm gap) crossed by 0.5 mm-wide
 * spokes. `./pour.ts` reads the spokes on a ring 0.25 mm inside that gap, 1.05 mm
 * from the pad centre, where a spoke is 0.5 mm of arc over a 6.6 mm ring.
 *
 * A hole in a polygon is written the way KiCad writes one: a single outline that
 * runs in along a slit, round the hole, and back out along the same slit. The
 * slit is a horizontal line to the left edge, at the height of the hole's first
 * vertex, which sits 0.0136 mm above the hole's centre line so that no slit lies
 * exactly on a row of ring samples.
 */
import type { Pt } from "../../tools/pcb/pour-geometry.ts"

export const PAD_RADIUS = 0.8
export const THERMAL_GAP = 0.5
export const SPOKE_WIDTH = 0.5

const START_DEGREES = 179.4
const ARC_STEP_DEGREES = 3.75

/** Spoke directions, in degrees, for a pad with `count` spokes. */
export function spokeAngles(count: number): readonly number[] {
  const table: Readonly<Record<number, readonly number[]>> = {
    0: [],
    1: [90],
    2: [90, 270],
    4: [45, 135, 225, 315],
  }
  const angles = table[count]
  if (angles === undefined) throw new Error(`pour-fixtures has no spoke layout for ${count} spokes (0, 1, 2 and 4 are written).`)
  return angles
}

/** The outline of the void around a pad at (cx, cy), with `count` spokes left standing across it. */
export function relief(cx: number, cy: number, count: number): readonly Pt[] {
  const outer = PAD_RADIUS + THERMAL_GAP
  const half = SPOKE_WIDTH / 2
  const delta = (Math.asin(half / outer) * 180) / Math.PI
  const inner = Math.sqrt(PAD_RADIUS * PAD_RADIUS - half * half)
  const at = (degrees: number, r: number, lateral = 0): Pt => {
    const a = (degrees * Math.PI) / 180
    return [cx + r * Math.cos(a) - lateral * Math.sin(a), cy + r * Math.sin(a) + lateral * Math.cos(a)]
  }
  const points: Pt[] = [at(START_DEGREES, outer)]
  let angle = START_DEGREES
  const arcTo = (target: number): void => {
    const n = Math.max(1, Math.ceil((target - angle) / ARC_STEP_DEGREES))
    for (let i = 1; i <= n; i += 1) points.push(at(angle + ((target - angle) * i) / n, outer))
    angle = target
  }
  const swept = spokeAngles(count)
    .map((raw) => (raw < START_DEGREES ? raw + 360 : raw))
    .sort((p, q) => p - q)
  for (const a of swept) {
    arcTo(a - delta)
    points.push(at(a, inner, -half), at(a, inner, half), at(a + delta, outer))
    angle = a + delta
  }
  arcTo(START_DEGREES + 360)
  points.pop()
  return points
}

/**
 * An outline whose last edge runs up the left side from (0, top) to its first
 * vertex, with each hole spliced in by a horizontal slit to that edge.
 */
export function withHoles(outline: readonly Pt[], holes: readonly (readonly Pt[])[]): readonly Pt[] {
  const spliced: Pt[] = [...outline]
  const byHeight = [...holes].sort((a, b) => (b[0]?.[1] ?? 0) - (a[0]?.[1] ?? 0))
  for (const hole of byHeight) {
    const first = hole[0]
    if (first === undefined) throw new Error("a hole with no points")
    spliced.push([0, first[1]], ...hole, first, [0, first[1]])
  }
  return spliced
}

/** The 60 x 40 pour outline, left edge last. */
export const RECTANGLE: readonly Pt[] = [
  [0, 0],
  [60, 0],
  [60, 40],
  [0, 40],
]

/** Two bodies joined along y = `top`..`bottom` between x = 25 and x = 35. */
export function dumbbell(top: number, bottom: number): readonly Pt[] {
  return [
    [0, 0], [25, 0], [25, top], [35, top], [35, 0], [60, 0],
    [60, 40], [35, 40], [35, bottom], [25, bottom], [25, 40], [0, 40],
  ]
}

export interface Placement {
  readonly u1: Pt
  readonly c1: Pt
  /** A second bypass capacitor, laid out like C1. */
  readonly c2?: Pt
}

export interface TrackSpec {
  readonly from: Pt
  readonly to: Pt
  readonly layer: string
  /** Defaults to GND. */
  readonly net?: string
  /** Track width in mm; defaults to 0.5. */
  readonly width?: number
  /** Written as an `(arc ...)` with its midpoint halfway between the ends, not as a `(segment ...)`. */
  readonly arc?: boolean
}

/** U1's ground pads are at +0 and +6 in y; C1's +5V pad is at its origin and its ground pad 5 below. */
export function padCentres(place: Placement): Readonly<Record<string, Pt>> {
  return {
    "U1-3": place.u1,
    "U1-4": [place.u1[0], place.u1[1] + 6],
    "C1-2": [place.c1[0], place.c1[1] + 5],
  }
}

export interface UTurn {
  readonly degrees: number
  /** `"3.0 1.6"`: width then height, before the turn. */
  readonly padSize: string
}

export interface FixtureOptions {
  readonly place: Placement
  /** Outline polygons per layer; each has the reliefs spliced in. */
  readonly pour: Readonly<Record<string, readonly (readonly Pt[])[]>>
  /** Spokes per ground pad key (`U1-3`, `U1-4`, `C1-2`); a pad absent here has no void cut around it. */
  readonly spokes?: Readonly<Record<string, number>>
  /** Layers the zone declares. Defaults to the layers named in `pour`. */
  readonly zoneLayers?: readonly string[]
  /** Layers that carry a saved fill. Defaults to the layers named in `pour`. Fewer than `zoneLayers` is an unfilled layer. */
  readonly filledLayers?: readonly string[]
  readonly thermalGap?: number | null
  /** The zone's (connect_pads ...) mode: omitted is KiCad's thermal relief. */
  readonly connect?: "yes" | "no" | "thru_hole_only"
  /** The zone's own clearance; null writes a (connect_pads ...) with none. Defaults to 0.5. */
  readonly clearance?: number | null
  /** `true` runs a ground track on F.Cu from U1's first ground pad to C1's ground pad; a spec places one anywhere. */
  readonly track?: boolean | TrackSpec | readonly TrackSpec[]
  /** U1 also has a pad 3 mm to the left of its first, on a net that is neither ground nor supply. */
  readonly u1ExtraPad?: boolean
  /** C1 is a surface-mount part on F.Cu, so only a feature on that layer can touch its pads. */
  readonly c1Smd?: boolean
  readonly extraZones?: readonly string[]
  readonly refs?: { readonly u1?: string; readonly c1?: string }
  readonly padShape?: string
  readonly padType?: string
  /** Turns U1 and its pads. A pad's angle in a saved board is absolute, so the pads carry the same angle as the footprint. */
  readonly u1Turn?: UTurn
  /** False leaves the ground zone out entirely. */
  readonly zone?: boolean
}

const n = (v: number): string => String(Number(v.toFixed(6)))
const pts = (points: readonly Pt[]): string => `(pts ${points.map((p) => `(xy ${n(p[0])} ${n(p[1])})`).join(" ")})`

function footprint(ref: string, at: Pt, courtyard: readonly [number, number, number, number], pads: readonly string[], uuid: string, degrees = 0): string {
  const [x0, y0, x1, y1] = courtyard
  return [
    `(footprint "SYNTHETIC:Fixture${ref}" (layer "F.Cu") (uuid "${uuid}") (at ${n(at[0])} ${n(at[1])}${degrees === 0 ? "" : ` ${degrees}`})`,
    `  (property "Reference" "${ref}" (at 0 0 0) (layer "F.SilkS") (uuid "${uuid.slice(0, -1)}9"))`,
    `  (fp_rect (start ${x0} ${y0}) (end ${x1} ${y1}) (stroke (width 0.05) (type default)) (fill no) (layer "F.CrtYd") (uuid "${uuid.slice(0, -1)}8"))`,
    ...pads,
    ")",
  ].join("\n")
}

function pad(number: string, y: number, net: string, shape: string, type: string, turn?: UTurn, x = 0): string {
  const angle = turn === undefined ? "" : ` ${turn.degrees}`
  const [layers, drill] = type === "smd" ? ['"F.Cu" "F.Mask"', ""] : ['"*.Cu" "*.Mask"', " (drill 0.8)"]
  const ratio = shape === "roundrect" ? " (roundrect_rratio 0.25)" : ""
  return `  (pad "${number}" ${type} ${shape} (at ${x} ${y}${angle}) (size ${turn?.padSize ?? "1.6 1.6"})${drill} (layers ${layers})${ratio} (net "${net}"))`
}

function isTrackList(track: TrackSpec | readonly TrackSpec[]): track is readonly TrackSpec[] {
  return Array.isArray(track)
}

function trackForm(spec: TrackSpec): string {
  const [a, b] = [spec.from, spec.to]
  const mid = spec.arc === true ? ` (mid ${n((a[0] + b[0]) / 2 + 0.01)} ${n((a[1] + b[1]) / 2)})` : ""
  return `\t(${spec.arc === true ? "arc" : "segment"} (start ${a[0]} ${a[1]})${mid} (end ${b[0]} ${b[1]}) (width ${spec.width ?? 0.5}) (layer "${spec.layer}") (net "${spec.net ?? "GND"}") (uuid "bbbbbbbb-0000-4000-8000-000000000001"))`
}

function capacitor(ref: string, at: Pt, shape: string, type: string, uuid: string): string {
  return footprint(ref, at, [-1.5, -1.5, 1.5, 6.5], [pad("1", 0, "+5V", shape, type), pad("2", 5, "GND", shape, type)], uuid)
}

export function fixtureBoard(opts: FixtureOptions): string {
  const centres = padCentres(opts.place)
  const holes = Object.entries(opts.spokes ?? {}).map(([key, count]) => {
    const centre = centres[key]
    if (centre === undefined) throw new Error(`pour-fixtures has no pad ${key}`)
    return relief(centre[0], centre[1], count)
  })
  const drawn = Object.keys(opts.pour)
  const zoneLayers = opts.zoneLayers ?? drawn
  const filled = opts.filledLayers ?? drawn
  const shape = opts.padShape ?? "circle"
  const type = opts.padType ?? "thru_hole"
  const u1Ref = opts.refs?.u1 ?? "U1"
  const c1Ref = opts.refs?.c1 ?? "C1"
  if (holes.length > 0 && Object.values(opts.pour).some((outlines) => outlines.length > 1)) {
    throw new Error("pour-fixtures splices every relief into every outline, so reliefs need a layer with ONE outline.")
  }
  const fills = filled.flatMap((layer) =>
    (opts.pour[layer] ?? []).map((outline) => `\t\t(filled_polygon (layer "${layer}") ${pts(holes.length === 0 ? outline : withHoles(outline, holes))})`),
  )
  const gap = opts.thermalGap === undefined ? 0.5 : opts.thermalGap
  const fillForm =
    gap === null ? "(fill yes (thermal_bridge_width 0.5))" : `(fill yes (thermal_gap ${gap}) (thermal_bridge_width 0.5))`
  const zone = [
    "\t(zone",
    '\t\t(net "GND")',
    `\t\t(layers ${zoneLayers.map((l) => `"${l}"`).join(" ")})`,
    '\t\t(uuid "aaaaaaaa-0000-4000-8000-000000000001")',
    '\t\t(name "SYNTHETIC:ground")',
    "\t\t(hatch edge 0.5)",
    `\t\t(connect_pads${opts.connect === undefined ? "" : ` ${opts.connect}`}${opts.clearance === null ? "" : ` (clearance ${opts.clearance ?? 0.5})`})`,
    "\t\t(min_thickness 0.25)",
    `\t\t${fillForm}`,
    "\t\t(polygon (pts (xy 0 0) (xy 60 0) (xy 60 40) (xy 0 40)))",
    ...fills,
    "\t)",
  ].join("\n")
  const [u, c] = [opts.place.u1, opts.place.c1]
  const specs: readonly TrackSpec[] =
    opts.track === true
      ? [{ from: u, to: [c[0], c[1] + 5], layer: "F.Cu" }]
      : opts.track === undefined || opts.track === false
        ? []
        : isTrackList(opts.track)
          ? opts.track
          : [opts.track]
  const track = specs.map(trackForm)
  const c2 = opts.place.c2 === undefined ? [] : [capacitor("C2", opts.place.c2, shape, type, "33333333-0000-4000-8000-000000000001")]
  return [
    "(kicad_pcb",
    "\t(version 20260206)",
    '\t(generator "pcbnew")',
    '\t(layers (0 "F.Cu" signal) (2 "B.Cu" signal) (31 "F.CrtYd" user "F.Courtyard"))',
    footprint(u1Ref, u, [-2, -2, 2, 8], [pad("3", 0, "GND", shape, type, opts.u1Turn), pad("4", 6, "GND", shape, type, opts.u1Turn), ...(opts.u1ExtraPad === true ? [pad("1", 0, "IN", shape, type, opts.u1Turn, -3)] : [])], "11111111-0000-4000-8000-000000000001", opts.u1Turn?.degrees),
    capacitor(c1Ref, c, shape, opts.c1Smd === true ? "smd" : type, "22222222-0000-4000-8000-000000000001"),
    ...c2,
    ...track,
    ...(opts.zone === false ? [] : [zone]),
    ...(opts.extraZones ?? []),
    ")",
    "",
  ].join("\n")
}

/** The placement the single-body fixtures use, and the one the dumbbell uses inside its left body. */
export const OPEN_PLACE: Placement = { u1: [30, 18], c1: [45, 23] }
export const LEFT_PLACE: Placement = { u1: [10, 12], c1: [20, 25] }
