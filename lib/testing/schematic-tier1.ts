/**
 * TIER 1 — the readability gate.
 *
 * Six numbers read off the RENDERED ARTIFACT. Nothing asserted in source
 * code can alter them, and no classification participates: this module
 * deliberately does not import the Tier 2 diagnostics, so a new exemption
 * category cannot be routed into the verdict.
 *
 * Design: docs/superpowers/specs/2026-09-21-schematic-readability-testing-design.md
 *
 * The one judgement input is RAIL_NETS — an explicit per-module list of net
 * names. There is no pattern matching. A net named FOO_GND that is not on
 * the list counts against the budget, which is the point: suffix matching
 * is an escape hatch the author can widen silently.
 */

import type { CircuitElement } from "./circuit-assertions.ts"

export interface Tier1Metrics {
  readonly components: number
  /** M1 — labels whose text is not in the module's RAIL_NETS. */
  readonly nonRailLabels: number
  /** M2 — overlapping label bounding boxes. */
  readonly labelCollisions: number
  /** M3 — proper segment intersections between different traces. */
  readonly wireCrossings: number
  /** M4 — share of net MST hops longer than shortSpanUnits. */
  readonly longHopFraction: number
  /** M5a — bounding box of COMPONENTS ONLY, per component. */
  readonly componentAreaPerComponent: number
  /** M5b — bounding box of components, traces AND labels, per component. */
  readonly drawingAreaPerComponent: number
}

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined

const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined

interface Pt {
  x: number
  y: number
}

const point = (v: unknown): Pt | undefined => {
  if (!isRecord(v)) return undefined
  const x = num(v.x)
  const y = num(v.y)
  return x === undefined || y === undefined ? undefined : { x, y }
}

const emptyBox = (): Box => ({
  minX: Infinity,
  minY: Infinity,
  maxX: -Infinity,
  maxY: -Infinity,
})

const extend = (b: Box, x: number, y: number): void => {
  b.minX = Math.min(b.minX, x)
  b.minY = Math.min(b.minY, y)
  b.maxX = Math.max(b.maxX, x)
  b.maxY = Math.max(b.maxY, y)
}

const area = (b: Box): number =>
  Number.isFinite(b.minX) && b.maxX > b.minX && b.maxY > b.minY
    ? (b.maxX - b.minX) * (b.maxY - b.minY)
    : 0

/**
 * Character width in schematic units, derived from the render rather than
 * assumed: for a horizontally-anchored label the renderer places `center`
 * half a text-width from `anchor_position`.
 */
export function deriveCharWidth(elements: readonly CircuitElement[]): number {
  const samples: number[] = []
  for (const e of elements) {
    if (e.type !== "schematic_net_label" || !isRecord(e)) continue
    const side = str(e.anchor_side)
    if (side !== "left" && side !== "right") continue
    const a = point(e.anchor_position)
    const c = point(e.center)
    const t = str(e.text)
    if (!a || !c || !t || t.length === 0) continue
    const w = 2 * Math.abs(a.x - c.x)
    if (w > 0) samples.push(w / t.length)
  }
  if (samples.length === 0) return 0.1
  samples.sort((x, y) => x - y)
  return samples[Math.floor(samples.length / 2)] ?? 0.1
}

function labelBoxes(
  elements: readonly CircuitElement[],
  charWidth: number,
  lineHeight: number,
): Box[] {
  const out: Box[] = []
  for (const e of elements) {
    if (e.type !== "schematic_net_label" || !isRecord(e)) continue
    const c = point(e.center)
    const t = str(e.text)
    if (!c || !t) continue
    const horizontal =
      e.anchor_side === "left" || e.anchor_side === "right"
    const w = t.length * charWidth
    const halfW = (horizontal ? w : lineHeight) / 2
    const halfH = (horizontal ? lineHeight : w) / 2
    out.push({
      minX: c.x - halfW,
      minY: c.y - halfH,
      maxX: c.x + halfW,
      maxY: c.y + halfH,
    })
  }
  return out
}

/** Proper crossing — shared endpoints are junctions, not crossings. */
function crosses(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
  if (Math.abs(d) < 1e-9) return false
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
  const eps = 1e-6
  return t > eps && t < 1 - eps && u > eps && u < 1 - eps
}

/** A wire this short is easy to draw and easy to follow. */
export const SHORT_SPAN_UNITS = 8

export function computeTier1(
  elements: readonly CircuitElement[],
  opts: {
    /** Explicit rail net names. NO pattern matching, by design. */
    readonly railNets?: readonly string[]
    readonly shortSpanUnits?: number
    readonly lineHeight?: number
  } = {},
): Tier1Metrics {
  const railNets = new Set(opts.railNets ?? [])
  const shortSpan = opts.shortSpanUnits ?? SHORT_SPAN_UNITS
  const lineHeight = opts.lineHeight ?? 0.3

  // --- M1: non-rail labels -------------------------------------------------
  let nonRailLabels = 0
  for (const e of elements) {
    if (e.type !== "schematic_net_label" || !isRecord(e)) continue
    const t = str(e.text)
    if (t === undefined || !railNets.has(t)) nonRailLabels++
  }

  // --- M2: label collisions ------------------------------------------------
  const boxes = labelBoxes(elements, deriveCharWidth(elements), lineHeight)
  let labelCollisions = 0
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (!a || !b) continue
      const dx = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
      const dy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
      if (dx > 0 && dy > 0) labelCollisions++
    }
  }

  // --- M3: wire crossings --------------------------------------------------
  const segs: { a: Pt; b: Pt; trace: number }[] = []
  let traceIdx = 0
  const traceBox = emptyBox()
  for (const e of elements) {
    if (e.type !== "schematic_trace" || !isRecord(e)) continue
    const edges = e.edges
    if (!Array.isArray(edges)) continue
    for (const raw of edges) {
      if (!isRecord(raw)) continue
      const a = point(raw.from)
      const b = point(raw.to)
      if (!a || !b) continue
      segs.push({ a, b, trace: traceIdx })
      extend(traceBox, a.x, a.y)
      extend(traceBox, b.x, b.y)
    }
    traceIdx++
  }
  let wireCrossings = 0
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const si = segs[i]
      const sj = segs[j]
      if (!si || !sj || si.trace === sj.trace) continue
      if (crosses(si.a, si.b, sj.a, sj.b)) wireCrossings++
    }
  }

  // --- M4: long-hop fraction over each net's MST ---------------------------
  const netOfPort = new Map<string, string>()
  for (const e of elements) {
    if (e.type !== "source_port" || !isRecord(e)) continue
    const id = str(e.source_port_id)
    const key = str(e.subcircuit_connectivity_map_key)
    if (id && key) netOfPort.set(id, key)
  }
  const ptsByNet = new Map<string, Pt[]>()
  for (const e of elements) {
    if (e.type !== "schematic_port" || !isRecord(e)) continue
    const sp = str(e.source_port_id)
    const c = point(e.center)
    if (!sp || !c) continue
    const net = netOfPort.get(sp)
    if (!net) continue
    const arr = ptsByNet.get(net)
    if (arr) arr.push(c)
    else ptsByNet.set(net, [c])
  }
  const hops: number[] = []
  for (const pts of ptsByNet.values()) {
    if (pts.length < 2) continue
    const inTree = new Set<number>([0])
    while (inTree.size < pts.length) {
      let best = Infinity
      let bestIdx = -1
      for (const i of inTree) {
        for (let j = 0; j < pts.length; j++) {
          if (inTree.has(j)) continue
          const a = pts[i]
          const b = pts[j]
          if (!a || !b) continue
          const dd = Math.hypot(a.x - b.x, a.y - b.y)
          if (dd < best) {
            best = dd
            bestIdx = j
          }
        }
      }
      if (bestIdx < 0) break
      inTree.add(bestIdx)
      hops.push(best)
    }
  }
  const longHopFraction =
    hops.length === 0 ? 0 : hops.filter((h) => h > shortSpan).length / hops.length

  // --- M5a / M5b: extents --------------------------------------------------
  const compBox = emptyBox()
  let components = 0
  for (const e of elements) {
    if (e.type !== "schematic_component" || !isRecord(e)) continue
    components++
    const c = point(e.center)
    if (!c) continue
    const size = isRecord(e.size) ? e.size : undefined
    const w = size ? (num(size.width) ?? 0) : 0
    const h = size ? (num(size.height) ?? 0) : 0
    extend(compBox, c.x - w / 2, c.y - h / 2)
    extend(compBox, c.x + w / 2, c.y + h / 2)
  }
  const drawBox: Box = { ...compBox }
  extend(drawBox, traceBox.minX, traceBox.minY)
  extend(drawBox, traceBox.maxX, traceBox.maxY)
  for (const b of boxes) {
    extend(drawBox, b.minX, b.minY)
    extend(drawBox, b.maxX, b.maxY)
  }

  return {
    components,
    nonRailLabels,
    labelCollisions,
    wireCrossings,
    longHopFraction,
    componentAreaPerComponent: components === 0 ? 0 : area(compBox) / components,
    drawingAreaPerComponent: components === 0 ? 0 : area(drawBox) / components,
  }
}

export function formatTier1(m: Tier1Metrics): string {
  return [
    `components                  ${m.components}`,
    `M1 nonRailLabels            ${m.nonRailLabels}`,
    `M2 labelCollisions          ${m.labelCollisions}`,
    `M3 wireCrossings            ${m.wireCrossings}`,
    `M4 longHopFraction          ${m.longHopFraction.toFixed(3)}`,
    `M5a componentAreaPerComp    ${m.componentAreaPerComponent.toFixed(1)}`,
    `M5b drawingAreaPerComp      ${m.drawingAreaPerComponent.toFixed(1)}`,
  ].join("\n")
}
