/**
 * TIER 2 — DIAGNOSTICS ONLY. This module never gates.
 *
 * It explains WHY labels exist so a human knows where to look. It has no
 * effect on pass/fail: the gate lives in schematic-gate.ts and accepts
 * Tier1Metrics, which this module does not produce. Adding a clever new
 * category here cannot make a schematic pass.
 *
 * That separation is the central lesson of this project's first attempt,
 * where the enforced metric went 15 -> 11 -> 0 while the schematic went
 * from 67 labels to 66. See the design doc, section 2.
 *
 * WHY THIS EXISTS
 *
 * A schematic that expresses most of its connections as net labels is,
 * for a human reader, a netlist with pictures attached. It is logically
 * complete and practically useless: you cannot trace a signal, you cannot
 * see a feedback loop, and you cannot judge a layout from it.
 *
 * This project REQUIRES a human to review the schematic and to do PCB
 * placement and routing. That makes readability a functional requirement,
 * not a matter of taste — and functional requirements need numbers, or
 * they regress the moment nobody is looking.
 *
 * These metrics are computed from rendered circuit JSON, so they measure
 * what a reader will actually see rather than what the source intended.
 */

import type { CircuitElement } from "./circuit-assertions.ts"

export interface SchematicNetLabel {
  readonly type: "schematic_net_label"
  readonly text: string
  readonly anchor_position: { readonly x: number; readonly y: number }
  readonly center: { readonly x: number; readonly y: number }
  readonly anchor_side: string
  readonly source_net_id?: string
}

export interface SchematicTrace {
  readonly type: "schematic_trace"
  readonly edges: readonly {
    readonly from: { readonly x: number; readonly y: number }
    readonly to: { readonly x: number; readonly y: number }
  }[]
}

export interface Box {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export interface LabelCollision {
  readonly a: string
  readonly b: string
  /** Overlap area in schematic units squared. */
  readonly area: number
}

export interface SchematicMetrics {
  readonly components: number
  readonly netLabels: number
  readonly drawnTraces: number
  /**
   * Share of connections rendered as a LABEL rather than a drawn wire.
   * The single most important number here: as it approaches 1 the
   * drawing degenerates into a netlist.
   */
  readonly labelRatio: number
  readonly labelsPerComponent: number
  /**
   * Labels belonging to POWER RAILS. Labelling a rail is correct practice —
   * drawing every ground connection as a wire produces spaghetti. These are
   * excluded from the signal-label budget.
   */
  readonly railLabels: number
  /** Labels on SIGNAL nets. These are the ones that should have been wires. */
  readonly signalLabels: number
  /**
   * THE HEADLINE METRIC: share of signal connections rendered as a label
   * rather than a drawn wire. As this approaches 1 the schematic becomes a
   * netlist and stops being reviewable by a human.
   */
  readonly signalLabelRatio: number
  /** Per-label justification. See classifyLabels. */
  readonly labelJustifications: readonly ClassifiedLabel[]
  /**
   * Labels that nobody chose: close enough to wire, not a rail, not forced
   * by the renderer, not declared intentional. THE enforced label metric —
   * a budget on total labels would say nothing about which ones earn their
   * place.
   */
  readonly gratuitousLabels: number
  /** Placement quality — the root cause behind the label metrics. */
  readonly connectionDistances: ConnectionDistances
  readonly labelCollisions: readonly LabelCollision[]
  readonly wireCrossings: number
  /** Bounding-box area per component — detects sprawl and cramming alike. */
  readonly areaPerComponent: number
  readonly extent: Box
  /** Nets ordered by how many labels they put on the page. */
  readonly labelsByNet: readonly { readonly text: string; readonly count: number }[]
  /** Derived from the render itself; see deriveCharWidth. */
  readonly charWidth: number
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null

const isNetLabel = (e: CircuitElement): e is SchematicNetLabel => {
  if (e.type !== "schematic_net_label" || !isRecord(e)) return false
  return typeof e.text === "string" && isRecord(e.anchor_position)
}

const isTrace = (e: CircuitElement): e is SchematicTrace =>
  e.type === "schematic_trace" && isRecord(e) && Array.isArray(e.edges)

const isComponent = (e: CircuitElement): boolean =>
  e.type === "schematic_component"

/**
 * Character width in schematic units, derived from the render rather than
 * assumed: for a horizontally-anchored label the renderer places `center`
 * half a text-width from `anchor_position`, so width = 2*|anchor - center|.
 * Taking the median across all labels self-calibrates against font changes.
 */
export function deriveCharWidth(labels: readonly SchematicNetLabel[]): number {
  const samples: number[] = []
  for (const l of labels) {
    if (l.anchor_side !== "left" && l.anchor_side !== "right") continue
    const width = 2 * Math.abs(l.anchor_position.x - l.center.x)
    if (width > 0 && l.text.length > 0) samples.push(width / l.text.length)
  }
  if (samples.length === 0) return 0.1
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)] ?? 0.1
}

export function labelBox(
  label: SchematicNetLabel,
  charWidth: number,
  lineHeight: number,
): Box {
  const w = label.text.length * charWidth
  const h = lineHeight
  const { x, y } = label.center
  const horizontal =
    label.anchor_side === "left" || label.anchor_side === "right"
  // A vertically-anchored label is rotated, so its footprint swaps axes.
  const halfW = (horizontal ? w : h) / 2
  const halfH = (horizontal ? h : w) / 2
  return { minX: x - halfW, minY: y - halfH, maxX: x + halfW, maxY: y + halfH }
}

function overlapArea(a: Box, b: Box): number {
  const dx = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
  const dy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
  return dx > 0 && dy > 0 ? dx * dy : 0
}

/** Proper crossing of two segments — shared endpoints are junctions, not crossings. */
function segmentsCross(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number },
): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
  if (Math.abs(d) < 1e-9) return false
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
  const eps = 1e-6
  return t > eps && t < 1 - eps && u > eps && u < 1 - eps
}

/** Net names matching these suffixes are power rails, not signals. */
export const DEFAULT_RAIL_SUFFIXES = [
  "GND",
  "VBIAS",
  "VBIAS_RAW",
  "VCC",
  "VEE",
  "9V_RAW",
  "9V_PROT",
] as const

export function isRailLabel(
  text: string,
  suffixes: readonly string[] = DEFAULT_RAIL_SUFFIXES,
): boolean {
  // Labels are module-prefixed (e.g. "CMP_GND"), so match on the tail.
  return suffixes.some((s) => text === s || text.endsWith(`_${s}`))
}

export function computeSchematicMetrics(
  elements: readonly CircuitElement[],
  opts: {
    readonly lineHeight?: number
    readonly railSuffixes?: readonly string[]
    readonly shortSpanUnits?: number
    /** net text -> the declaration, including its provenance */
    readonly declared?: Readonly<Record<string, DeclaredLabel>>
  } = {},
): SchematicMetrics {
  const lineHeight = opts.lineHeight ?? 0.3
  const railSuffixes = opts.railSuffixes ?? DEFAULT_RAIL_SUFFIXES
  const labels = elements.filter(isNetLabel)
  const traces = elements.filter(isTrace)
  const components = elements.filter(isComponent).length
  const charWidth = deriveCharWidth(labels)

  // --- label collisions ---
  const boxes = labels.map((l) => labelBox(l, charWidth, lineHeight))
  const labelCollisions: LabelCollision[] = []
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const bi = boxes[i]
      const bj = boxes[j]
      const li = labels[i]
      const lj = labels[j]
      if (!bi || !bj || !li || !lj) continue
      const area = overlapArea(bi, bj)
      if (area > 0) labelCollisions.push({ a: li.text, b: lj.text, area })
    }
  }
  labelCollisions.sort((x, y) => y.area - x.area)

  // --- wire crossings ---
  const segs: {
    a: { x: number; y: number }
    b: { x: number; y: number }
    trace: number
  }[] = []
  traces.forEach((t, ti) => {
    for (const e of t.edges) segs.push({ a: e.from, b: e.to, trace: ti })
  })
  let wireCrossings = 0
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const si = segs[i]
      const sj = segs[j]
      if (!si || !sj || si.trace === sj.trace) continue
      if (segmentsCross(si.a, si.b, sj.a, sj.b)) wireCrossings++
    }
  }

  // --- extent ---
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const note = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const b of boxes) {
    note(b.minX, b.minY)
    note(b.maxX, b.maxY)
  }
  for (const s of segs) {
    note(s.a.x, s.a.y)
    note(s.b.x, s.b.y)
  }
  const extent: Box = Number.isFinite(minX)
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  const area = (extent.maxX - extent.minX) * (extent.maxY - extent.minY)

  // --- labels by net ---
  const byText = new Map<string, number>()
  for (const l of labels) byText.set(l.text, (byText.get(l.text) ?? 0) + 1)
  const labelsByNet = [...byText.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)

  const justOpts: {
    railSuffixes: readonly string[]
    shortSpanUnits?: number
    declared?: Readonly<Record<string, DeclaredLabel>>
  } = { railSuffixes }
  if (opts.shortSpanUnits !== undefined) justOpts.shortSpanUnits = opts.shortSpanUnits
  if (opts.declared !== undefined) justOpts.declared = opts.declared
  const labelJustifications = classifyLabels(elements, justOpts)
  // Unapproved declarations count as defects. Otherwise writing a
  // justification would be indistinguishable from fixing the problem.
  const gratuitousLabels = labelJustifications.filter(
    (c) =>
      c.justification === "gratuitous" ||
      c.justification === "pending-approval",
  ).length

  const connectionDistances = computeConnectionDistances(elements, {
    shortSpanUnits: opts.shortSpanUnits ?? SHORT_SPAN_UNITS,
  })

  const railLabels = labels.filter((l) => isRailLabel(l.text, railSuffixes)).length
  const signalLabels = labels.length - railLabels
  const signalConnections = signalLabels + traces.length

  const connections = labels.length + traces.length
  return {
    components,
    netLabels: labels.length,
    drawnTraces: traces.length,
    labelRatio: connections === 0 ? 0 : labels.length / connections,
    labelsPerComponent: components === 0 ? 0 : labels.length / components,
    railLabels,
    signalLabels,
    signalLabelRatio:
      signalConnections === 0 ? 0 : signalLabels / signalConnections,
    labelJustifications,
    gratuitousLabels,
    connectionDistances,
    labelCollisions,
    wireCrossings,
    areaPerComponent: components === 0 ? 0 : area / components,
    extent,
    labelsByNet,
    charWidth,
  }
}

export function formatMetrics(m: SchematicMetrics): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const lines = [
    `components          ${m.components}`,
    `net labels          ${m.netLabels}`,
    `drawn traces        ${m.drawnTraces}`,
    `label ratio         ${pct(m.labelRatio)}   (labels / all connections)`,
    `  rail labels       ${m.railLabels}   (legitimate - rails belong on labels)`,
    `  signal labels     ${m.signalLabels}   (these should have been wires)`,
    `signal label ratio  ${pct(m.signalLabelRatio)}   (informational)`,
    `GRATUITOUS LABELS   ${m.gratuitousLabels}   <-- enforced: labels nobody chose`,
    `labels per component ${m.labelsPerComponent.toFixed(2)}`,
    `label collisions    ${m.labelCollisions.length}`,
    `wire crossings      ${m.wireCrossings}`,
    `area per component  ${m.areaPerComponent.toFixed(1)} sq units`,
    `extent              ${(m.extent.maxX - m.extent.minX).toFixed(1)} x ${(m.extent.maxY - m.extent.minY).toFixed(1)}`,
    `derived char width  ${m.charWidth.toFixed(4)}`,
  ]
  if (m.labelCollisions.length > 0) {
    lines.push("", "worst label collisions:")
    for (const c of m.labelCollisions.slice(0, 10)) {
      lines.push(`  ${c.a}  <->  ${c.b}   (${c.area.toFixed(3)})`)
    }
  }
  lines.push("", formatConnectionDistances(m.connectionDistances))
  lines.push("", "label justification:")
  lines.push(summarizeJustifications(m.labelJustifications))
  lines.push("", "labels per net (top 10):")
  for (const n of m.labelsByNet.slice(0, 10)) {
    lines.push(`  ${String(n.count).padStart(3)}  ${n.text}`)
  }
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Label justification
//
// A blunt "labels must be under N%" budget is still an unmeasured default: it
// says nothing about WHICH labels earn their place. Labels are genuinely the
// right choice in several situations. What is not acceptable is a label that
// appears because nobody decided anything.
//
// So each label is classified, and only one class is a defect.
// ---------------------------------------------------------------------------

export type LabelJustification =
  /** A power rail. Drawing every ground connection is spaghetti. Always fine. */
  | "rail"
  /**
   * The net connects components in DIFFERENT schematic groups, i.e. it
   * crosses a module boundary. Detected from the render, not declared.
   */
  | "cross-boundary"
  /**
   * Two pins on the SAME component. tscircuit will not route around its own
   * symbol, so this label is forced by the renderer, not chosen.
   */
  | "same-component"
  /**
   * Declared intentional AND approved by a human. Only an approved
   * declaration exempts a label.
   */
  | "declared"
  /**
   * A declaration exists but carries no human approval. This does NOT
   * exempt anything -- it is counted as a defect and named loudly, so
   * that writing a justification cannot by itself buy a passing grade.
   */
  | "pending-approval"
  /**
   * A multi-terminal junction (3+ ports). No strictly better option exists:
   * wiring it pin-to-pin collapses it into ONE auto-label naming every
   * member, which is far wider than N short labels and collides at fixed
   * pin anchors. Measured on this project -- see the docs. Whether such a
   * net is acceptable is governed by the COLLISION and DISTANCE metrics,
   * not by label count.
   */
  | "junction"
  /**
   * The endpoints are close enough to wire together and nothing forced a
   * label. This is the unmeasured default, and the only class that fails.
   */
  | "gratuitous"

/**
 * A label the author argues should stay, with its provenance.
 *
 * The accepted classes (rail, cross-boundary, same-component, junction) are
 * determined STRUCTURALLY from the render and cannot be talked into
 * existence. Anything outside them needs a human to sign off, because the
 * alternative is that whoever writes the schematic also writes its own
 * exemptions -- which is not a standard, it is a formality.
 */
export interface DeclaredLabel {
  readonly reason: string
  /** Measured evidence, where the argument rests on data rather than taste. */
  readonly evidence?: string
  /**
   * HUMAN APPROVAL. An automated author must not populate this field for
   * its own declarations; doing so defeats the entire mechanism. Absent
   * approval the label is classified `pending-approval` and still fails.
   */
  readonly approvedBy?: string
  readonly approvedOn?: string
}

export interface ClassifiedLabel {
  readonly text: string
  readonly justification: LabelJustification
  /** Greatest distance between this net's labels, in schematic units. */
  readonly netSpan: number
  readonly reason?: string
  readonly approvedBy?: string
}

/**
 * A wire shorter than this is easy to draw and easy to follow, so a label
 * standing in for it is not carrying its weight.
 */
export const SHORT_SPAN_UNITS = 8

export function classifyLabels(
  elements: readonly CircuitElement[],
  opts: {
    readonly railSuffixes?: readonly string[]
    readonly shortSpanUnits?: number
    /** net text -> the declaration, including its provenance */
    readonly declared?: Readonly<Record<string, DeclaredLabel>>
  } = {},
): ClassifiedLabel[] {
  const railSuffixes = opts.railSuffixes ?? DEFAULT_RAIL_SUFFIXES
  const shortSpan = opts.shortSpanUnits ?? SHORT_SPAN_UNITS
  const declared = opts.declared ?? {}
  const labels = elements.filter(isNetLabel)

  // Group by net so we can measure how far apart its labels sit.
  const byNet = new Map<string, SchematicNetLabel[]>()
  for (const l of labels) {
    const key = l.source_net_id ?? l.text
    const arr = byNet.get(key)
    if (arr) arr.push(l)
    else byNet.set(key, [l])
  }

  // Which nets connect pins of a single component only? Those are forced.
  const portsByComponent = new Map<string, Set<string>>()
  for (const e of elements) {
    if (e.type !== "source_port" || !isRecord(e)) continue
    const comp = e.source_component_id
    const net = e.subcircuit_connectivity_map_key
    if (typeof comp !== "string" || typeof net !== "string") continue
    const set = portsByComponent.get(net)
    if (set) set.add(comp)
    else portsByComponent.set(net, new Set([comp]))
  }

  // Labels are keyed by source_net_id, groups by connectivity key. A
  // source_trace carries BOTH, so it bridges the two namespaces. Without
  // this the lookup silently never matches and nothing is ever classified
  // cross-boundary.
  const netIdOfConnKey = new Map<string, string>()
  for (const e of elements) {
    if (e.type !== "source_trace" || !isRecord(e)) continue
    const conn = e.subcircuit_connectivity_map_key
    const nets = e.connected_source_net_ids
    if (typeof conn !== "string" || !Array.isArray(nets)) continue
    for (const n of nets) if (typeof n === "string") netIdOfConnKey.set(conn, n)
  }

  // A net is cross-boundary when its ports live in different schematic
  // groups. Measured from the render rather than declared by the author.
  const groupOfComponent = new Map<string, string>()
  for (const e of elements) {
    if (e.type !== "schematic_component" || !isRecord(e)) continue
    const sid = e.source_component_id
    const gid = e.schematic_group_id
    if (typeof sid === "string" && typeof gid === "string") {
      groupOfComponent.set(sid, gid)
    }
  }
  const groupsPerNet = new Map<string, Set<string>>()
  for (const e of elements) {
    if (e.type !== "source_port" || !isRecord(e)) continue
    const comp = e.source_component_id
    const net = e.subcircuit_connectivity_map_key
    if (typeof comp !== "string" || typeof net !== "string") continue
    const g = groupOfComponent.get(comp)
    if (g === undefined) continue
    const set = groupsPerNet.get(net)
    if (set) set.add(g)
    else groupsPerNet.set(net, new Set([g]))
  }
  const crossesBoundary = new Set<string>()
  for (const [net, gs] of groupsPerNet) {
    if (gs.size <= 1) continue
    crossesBoundary.add(net)
    const asNetId = netIdOfConnKey.get(net)
    if (asNetId !== undefined) crossesBoundary.add(asNetId)
  }

  // Port count per net, in the label's own id namespace. A 2-port net has
  // a strictly better rendering (pin-to-pin draws a wire and emits NO
  // label); a 3+ port net does not.
  const portsPerConnKey = new Map<string, number>()
  for (const e of elements) {
    if (e.type !== "source_port" || !isRecord(e)) continue
    const k = e.subcircuit_connectivity_map_key
    if (typeof k === "string") {
      portsPerConnKey.set(k, (portsPerConnKey.get(k) ?? 0) + 1)
    }
  }
  const memberCount = new Map<string, number>()
  for (const [conn, count] of portsPerConnKey) {
    memberCount.set(conn, count)
    const asNetId = netIdOfConnKey.get(conn)
    if (asNetId !== undefined) memberCount.set(asNetId, count)
  }

  // "same-component" means every port on the net belongs to ONE component
  // (tscircuit will not route around its own symbol). Determined from
  // component identity -- NOT from "only one label was emitted", which is a
  // different thing and silently exempted real defects.
  const singleComponentNets = new Set<string>()
  for (const [conn, comps] of portsByComponent) {
    if (comps.size !== 1) continue
    singleComponentNets.add(conn)
    const asNetId = netIdOfConnKey.get(conn)
    if (asNetId !== undefined) singleComponentNets.add(asNetId)
  }

  const out: ClassifiedLabel[] = []
  for (const [netKey, group] of byNet) {
    let span = 0
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        if (!a || !b) continue
        const d = Math.hypot(
          a.anchor_position.x - b.anchor_position.x,
          a.anchor_position.y - b.anchor_position.y,
        )
        span = Math.max(span, d)
      }
    }
    for (const l of group) {
      const decl = declared[l.text]
      let justification: LabelJustification
      if (isRailLabel(l.text, railSuffixes)) justification = "rail"
      else if (decl !== undefined)
        // A declaration alone proves nothing. Only a human signature turns
        // it into an exemption.
        justification =
          decl.approvedBy !== undefined && decl.approvedBy.trim() !== ""
            ? "declared"
            : "pending-approval"
      else if (crossesBoundary.has(netKey)) justification = "cross-boundary"
      else if (singleComponentNets.has(netKey)) justification = "same-component"
      else if ((memberCount.get(netKey) ?? 0) >= 3) justification = "junction"
      else justification = "gratuitous"
      // NOTE: a long span is deliberately NOT an exemption. "These are far
      // apart" is a question, not an answer -- if the distance is genuine
      // (feedback across a signal chain, a control crossing blocks) say so
      // via `declared`. Otherwise the placement is what needs fixing, and
      // auto-exempting it would let sprawl launder a lazy label into a
      // justified one.
      const base = { text: l.text, justification, netSpan: span }
      out.push(
        decl === undefined
          ? base
          : decl.approvedBy === undefined
            ? { ...base, reason: decl.reason }
            : { ...base, reason: decl.reason, approvedBy: decl.approvedBy },
      )
    }
  }
  return out
}

export function summarizeJustifications(
  classified: readonly ClassifiedLabel[],
): string {
  const counts = new Map<LabelJustification, number>()
  for (const c of classified) {
    counts.set(c.justification, (counts.get(c.justification) ?? 0) + 1)
  }
  const order: LabelJustification[] = [
    "rail",
    "cross-boundary",
    "same-component",
    "junction",
    "declared",
    "pending-approval",
    "gratuitous",
  ]
  const lines = order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((k) => `  ${String(counts.get(k)).padStart(3)}  ${k}`)
  const pending = classified.filter(
    (c) => c.justification === "pending-approval",
  )
  if (pending.length > 0) {
    const names = [...new Set(pending.map((p) => p.text))]
    lines.push(
      "",
      "  UNAPPROVED declarations (a reason is not an exemption - these",
      "  need a human signature in DECLARED_LABELS.approvedBy):",
    )
    for (const n of names) lines.push(`    ${n}`)
  }
  const gratuitous = classified.filter((c) => c.justification === "gratuitous")
  if (gratuitous.length > 0) {
    const names = [...new Set(gratuitous.map((g) => g.text))]
    lines.push(
      "",
      "  gratuitous labels (2-terminal: wire these, or declare a reason):",
    )
    for (const n of names.slice(0, 12)) {
      const ex = gratuitous.find((g) => g.text === n)
      lines.push(`    ${n}  (net span ${ex?.netSpan.toFixed(1)} units)`)
    }
  }
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Connection distance
//
// Placement is the root cause of most label problems: a connection between
// adjacent components is easy to draw as a wire, while one across the page
// becomes a label. Measuring the distance between CONNECTED components
// therefore measures the thing that produces readable or unreadable output,
// rather than the symptom.
//
// Each net is reduced to its minimum spanning tree over the port positions:
// the shortest total wiring that would connect its members. MST hop lengths
// are what a human would actually have to follow.
// ---------------------------------------------------------------------------

export interface ConnectionDistances {
  /** MST hop lengths across every net, ascending. */
  readonly hops: readonly number[]
  readonly medianHop: number
  readonly p90Hop: number
  readonly maxHop: number
  /** Total wire length if every net were drawn as its MST. */
  readonly totalWireLength: number
  /** Hops longer than the short-span threshold — candidates for a label. */
  readonly longHops: number
  /** Worst offenders, for actionable output. */
  readonly worst: readonly { readonly net: string; readonly length: number }[]
}

export function computeConnectionDistances(
  elements: readonly CircuitElement[],
  opts: { readonly shortSpanUnits?: number } = {},
): ConnectionDistances {
  const shortSpan = opts.shortSpanUnits ?? SHORT_SPAN_UNITS

  // source_port -> connectivity net key
  const netOfSourcePort = new Map<string, string>()
  for (const e of elements) {
    if (e.type !== "source_port" || !isRecord(e)) continue
    const id = e.source_port_id
    const key = e.subcircuit_connectivity_map_key
    if (typeof id === "string" && typeof key === "string") {
      netOfSourcePort.set(id, key)
    }
  }

  // Gather schematic port positions per net.
  const pointsByNet = new Map<string, { x: number; y: number }[]>()
  for (const e of elements) {
    if (e.type !== "schematic_port" || !isRecord(e)) continue
    const sp = e.source_port_id
    const c = e.center
    if (typeof sp !== "string" || !isRecord(c)) continue
    const net = netOfSourcePort.get(sp)
    if (net === undefined) continue
    const x = c.x
    const y = c.y
    if (typeof x !== "number" || typeof y !== "number") continue
    const arr = pointsByNet.get(net)
    if (arr) arr.push({ x, y })
    else pointsByNet.set(net, [{ x, y }])
  }

  const hops: number[] = []
  const perNet: { net: string; length: number }[] = []
  for (const [net, pts] of pointsByNet) {
    if (pts.length < 2) continue
    // Prim's algorithm — small nets, so the simple O(n^2) form is fine.
    const inTree = new Set<number>([0])
    let netLength = 0
    while (inTree.size < pts.length) {
      let best = Infinity
      let bestIdx = -1
      for (const i of inTree) {
        for (let j = 0; j < pts.length; j++) {
          if (inTree.has(j)) continue
          const a = pts[i]
          const b = pts[j]
          if (!a || !b) continue
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < best) {
            best = d
            bestIdx = j
          }
        }
      }
      if (bestIdx < 0) break
      inTree.add(bestIdx)
      hops.push(best)
      netLength += best
    }
    perNet.push({ net, length: netLength })
  }

  hops.sort((a, b) => a - b)
  const at = (q: number) =>
    hops.length === 0 ? 0 : (hops[Math.min(hops.length - 1, Math.floor(hops.length * q))] ?? 0)
  perNet.sort((a, b) => b.length - a.length)

  return {
    hops,
    medianHop: at(0.5),
    p90Hop: at(0.9),
    maxHop: hops.length === 0 ? 0 : (hops[hops.length - 1] ?? 0),
    totalWireLength: hops.reduce((s, h) => s + h, 0),
    longHops: hops.filter((h) => h > shortSpan).length,
    worst: perNet.slice(0, 8),
  }
}

export function formatConnectionDistances(d: ConnectionDistances): string {
  return [
    "connection distances (MST hops between connected ports):",
    `  hops              ${d.hops.length}`,
    `  median hop        ${d.medianHop.toFixed(2)} units`,
    `  p90 hop           ${d.p90Hop.toFixed(2)} units`,
    `  max hop           ${d.maxHop.toFixed(2)} units`,
    `  long hops (>${SHORT_SPAN_UNITS})    ${d.longHops}   <- these become labels`,
    `  total wire length ${d.totalWireLength.toFixed(1)} units`,
    "  longest nets:",
    ...d.worst.map((w) => `    ${w.length.toFixed(1).padStart(6)}  ${w.net}`),
  ].join("\n")
}
