/**
 * Ported from digital-pedal-platform's `tools/schgen/render/chainKit.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * The chain primitive: nodes on one horizontal main line, two-terminal steps between them (the
 * first unit in line, the rest stacked as parallel levels), shunt branches hanging from node
 * columns, and anchors at the ends and middle nodes. It positions the units it is given and routes
 * only the IR's own connections. Every tap (a column, a step end, a parallel level) is a shared
 * wire endpoint, so connectivity never depends on a junction (KiCad 10's split-wire rule).
 */
import type { NetName } from "../ir/types.ts";
import type { Anchor, BlockLayout, BlockSubgraph, BlockUnit, Placement, Wire } from "./block-types.ts";
import { GRID, gridCeil, type Um } from "./geometry.ts";
import { orientedBody, orientTwoPin, otherNet, PITCH, STUB } from "./layout-kit.ts";
import { FIELDS_ABOVE, fieldsWidth, textWidth } from "./text-boxes.ts";

export interface ChainStep {
  /** Units between node i and node i+1: the first in line, the rest parallel. */
  readonly units: readonly BlockUnit[];
}

export interface ChainShunt {
  /** One or more units in series from `node` to `far`. */
  readonly units: readonly BlockUnit[];
  readonly node: NetName;
  readonly far: NetName;
  readonly side: "up" | "down";
}

export type ChainEnd = "anchor" | "column" | "open";

export interface ChainSpec {
  readonly nodes: readonly NetName[];
  readonly steps: readonly ChainStep[];
  readonly shunts: readonly ChainShunt[];
  readonly parallelSide: "up" | "down";
  readonly midAnchorSide: "up" | "down";
  readonly first: ChainEnd;
  readonly last: ChainEnd;
}

export interface ChainLayout extends BlockLayout {
  readonly mainY: Um;
  readonly firstX: Um;
  readonly lastX: Um;
}

interface Drawn {
  readonly placements: Placement[];
  readonly wires: Wire[];
  readonly anchors: Anchor[];
}

const labelled = (g: BlockSubgraph, net: NetName): boolean => g.rails.has(net) || g.external.has(net);

function branchSpan(shunt: ChainShunt): Um {
  let near = shunt.node;
  let total = 0;
  for (const u of shunt.units) {
    const far = otherNet(u, near);
    const o = shunt.side === "down" ? orientTwoPin(u, "vertical", near) : orientTwoPin(u, "vertical", far);
    total += o.span;
    near = far;
  }
  return total;
}

/** Horizontal room an item at a column takes either side of the column, its fields included. */
export interface Extent {
  readonly left: Um;
  readonly right: Um;
}

/** Half the width of what is drawn at an anchor: a vertical label (one grid step) or a centred power value. */
const anchorHalf = (net: NetName): Um => Math.max(GRID, Math.ceil(textWidth(net) / 2));

/** A shunt column: its bodies, their fields to the right (fieldSpots), and its far anchor. */
export function shuntExtent(shunt: ChainShunt): Extent {
  let near = shunt.node;
  let left = anchorHalf(shunt.far);
  let right = anchorHalf(shunt.far);
  for (const u of shunt.units) {
    const far = otherNet(u, near);
    const body = orientedBody(u, orientTwoPin(u, "vertical", shunt.side === "down" ? near : far));
    left = Math.max(left, -body.minX);
    right = Math.max(right, body.maxX + GRID + fieldsWidth(u.part));
    near = far;
  }
  return { left, right };
}

/** Column positions after `start`: every item clear of its neighbours' fields by one grid step; then R. */
function columnXs(start: Um, items: readonly Extent[]): { xs: Um[]; end: Um } {
  const xs: Um[] = [];
  let x = start;
  let prevRight = 0;
  for (const it of items) {
    x += Math.max(PITCH, gridCeil(prevRight + GRID + it.left));
    xs.push(x);
    prevRight = it.right;
  }
  return { xs, end: items.length === 0 ? start : x + Math.max(PITCH, gridCeil(prevRight + GRID)) };
}

/**
 * Pitch between parallel levels: room for the lower unit's half body, the upper unit's half body,
 * and the two field lines (fieldSpots puts them above a left/right-pinned body) between them.
 */
function levelPitch(spec: ChainSpec): Um {
  return rowPitch(spec.steps.flatMap((s, i) => s.units.map((u) => ({ u, from: spec.nodes[i]! }))));
}

/**
 * Pitch between stacked horizontal rows of two-terminal units (each oriented with `from` first):
 * room for the lower unit's half body, the upper unit's half body and the lower unit's two field
 * lines above it, plus one grid step. Shared by parallel levels and op-amp feedback rows.
 */
export function rowPitch(units: ReadonlyArray<{ readonly u: BlockUnit; readonly from: NetName }>): Um {
  const heights = units.map(({ u, from }) => {
    const body = orientedBody(u, orientTwoPin(u, "horizontal", from));
    return body.maxY - body.minY;
  });
  return Math.max(3 * GRID, gridCeil(Math.max(0, ...heights) + FIELDS_ABOVE + GRID));
}

/** Step width: the widest unit, or its fields plus a grid step either side, so the fields clear both leads. */
function stepWidth(step: ChainStep, from: NetName): Um {
  return Math.max(...step.units.map((u) => unitWidth(u, from)));
}

/**
 * Width a horizontal unit (`from` first) needs between two leads: its span, or its fields plus a
 * grid step either side, so centred fields clear both leads. Shared by chain steps and op-amp feedback rows.
 */
export function unitWidth(u: BlockUnit, from: NetName): Um {
  const span = orientTwoPin(u, "horizontal", from).span;
  const w = Math.max(span, gridCeil(fieldsWidth(u.part) + 2 * GRID));
  // Even slack, so the unit centres exactly on the grid.
  return (w - span) % (2 * GRID) === 0 ? w : w + GRID;
}

/** Stack a shunt's units in its column from the main line outward, then anchor its far net. */
function stackBranch(shunt: ChainShunt, x: Um, mainY: Um, g: BlockSubgraph): Drawn {
  const out: Drawn = { placements: [], wires: [], anchors: [] };
  let near = shunt.node;
  let y = mainY;
  for (const u of shunt.units) {
    const far = otherNet(u, near);
    if (shunt.side === "down") {
      const o = orientTwoPin(u, "vertical", near);
      out.placements.push({ part: u.part.label, unit: u.unit, at: { x: x - o.first.x, y: y - o.first.y }, rot: o.rot });
      y += o.span;
    } else {
      const o = orientTwoPin(u, "vertical", far);
      out.placements.push({ part: u.part.label, unit: u.unit, at: { x: x - o.second.x, y: y - o.second.y }, rot: o.rot });
      y -= o.span;
    }
    near = far;
  }
  if (near !== shunt.far) {
    throw new Error(`chain: shunt from ${shunt.node} through ${shunt.units.map((u) => u.part.label).join(", ")} ends on ${near}, not ${shunt.far}`);
  }
  if (!labelled(g, shunt.far)) throw new Error(`chain: shunt to internal net ${shunt.far}`);
  const end = { x, y: shunt.side === "down" ? y + STUB : y - STUB };
  out.wires.push({ a: { x, y }, b: end, net: shunt.far });
  out.anchors.push({ net: shunt.far, at: end, side: shunt.side });
  return out;
}

/**
 * Draw step i's units between x = r (node i) and x = l (node i+1) on and beside the main line,
 * each centred between r and l (so its fields, above it, clear both leads), levels `pitch` apart.
 */
function drawStep(step: ChainStep, from: NetName, to: NetName, r: Um, l: Um, mainY: Um, side: "up" | "down", pitch: Um, out: Drawn): void {
  const dir = side === "up" ? -1 : 1;
  let prevY = mainY;
  step.units.forEach((u, k) => {
    const o = orientTwoPin(u, "horizontal", from);
    const yk = mainY + dir * pitch * k;
    const x0 = r + Math.floor((l - r - o.span) / (2 * GRID)) * GRID;
    out.placements.push({ part: u.part.label, unit: u.unit, at: { x: x0 - o.first.x, y: yk - o.first.y }, rot: o.rot });
    if (r < x0) out.wires.push({ a: { x: r, y: yk }, b: { x: x0, y: yk }, net: from });
    if (x0 + o.span < l) out.wires.push({ a: { x: x0 + o.span, y: yk }, b: { x: l, y: yk }, net: to });
    if (k > 0) {
      out.wires.push({ a: { x: r, y: yk }, b: { x: r, y: prevY }, net: from });
      out.wires.push({ a: { x: l, y: yk }, b: { x: l, y: prevY }, net: to });
    }
    prevY = yk;
  });
}

function needsColumnAnchor(spec: ChainSpec, g: BlockSubgraph, j: number): boolean {
  const net = spec.nodes[j];
  if (net === undefined || !labelled(g, net)) return false;
  const isFirst = j === 0;
  const isLast = j === spec.nodes.length - 1;
  if (!isFirst && !isLast) return true;
  return (isFirst && spec.first === "column") || (isLast && spec.last === "column");
}

export function chain(spec: ChainSpec, g: BlockSubgraph): ChainLayout {
  const k = spec.nodes.length - 1;
  if (k < 0) throw new Error("chain: no nodes");
  if (spec.steps.length !== k) throw new Error(`chain: ${spec.nodes.length} nodes need ${k} steps, got ${spec.steps.length}`);
  for (const s of spec.shunts) {
    if (!spec.nodes.includes(s.node)) throw new Error(`chain: shunt hangs from ${s.node}, which is not a chain node`);
  }
  const levels = Math.max(0, ...spec.steps.map((s) => s.units.length - 1));
  const upExtents = spec.shunts.filter((s) => s.side === "up").map((s) => branchSpan(s) + STUB + GRID);
  const pitch = levelPitch(spec);
  if (spec.parallelSide === "up") upExtents.push(levels * pitch + 2 * GRID);
  const mainY = Math.max(STUB + GRID, ...upExtents);

  const out: Drawn = { placements: [], wires: [], anchors: [] };
  const firstNet = spec.nodes[0]!;
  const lastNet = spec.nodes[k]!;
  const firstAnchored = spec.first === "anchor" && labelled(g, firstNet);
  let L: Um = firstAnchored ? PITCH : 0;
  if (firstAnchored) {
    out.wires.push({ a: { x: 0, y: mainY }, b: { x: PITCH, y: mainY }, net: firstNet });
    out.anchors.push({ net: firstNet, at: { x: 0, y: mainY }, side: "left" });
  }
  // A lone node already anchored at its first end needs no second label on the same wire.
  const lastAnchored = spec.last === "anchor" && labelled(g, lastNet) && !(k === 0 && firstAnchored);
  // An end piece of a segment is drawn only when something attaches at its outer end.
  const firstAttached = firstAnchored || spec.first === "open";
  const lastAttached = lastAnchored || spec.last === "open";
  const parallel = (i: number): boolean => (spec.steps[i]?.units.length ?? 0) > 1;
  const firstX = L;
  let R: Um = L;
  spec.nodes.forEach((net, j) => {
    const shunts = spec.shunts.filter((s) => s.node === net);
    const column = needsColumnAnchor(spec, g, j);
    const c = shunts.length + (column ? 1 : 0);
    const items: Extent[] = shunts.map(shuntExtent);
    if (column) items.push({ left: anchorHalf(net), right: anchorHalf(net) });
    const cols = columnXs(L, items);
    if (c > 0) {
      R = cols.end;
      const stops = [L, ...cols.xs, R];
      for (let m = 1; m <= c + 1; m += 1) {
        if (m === 1 && j === 0 && !firstAttached) continue;
        if (m === c + 1 && j === k && !lastAttached) continue;
        out.wires.push({ a: { x: stops[m - 1]!, y: mainY }, b: { x: stops[m]!, y: mainY }, net });
      }
    } else if (j > 0 && j < k && parallel(j - 1) && parallel(j)) {
      // Two parallel steps meeting at a bare node would share their vertical lead column: separate them.
      R = L + PITCH;
      out.wires.push({ a: { x: L, y: mainY }, b: { x: R, y: mainY }, net });
    } else {
      R = L;
    }
    shunts.forEach((s, i) => {
      const d = stackBranch(s, cols.xs[i]!, mainY, g);
      out.placements.push(...d.placements);
      out.wires.push(...d.wires);
      out.anchors.push(...d.anchors);
    });
    if (column) {
      const x = cols.xs[c - 1]!;
      const end = { x, y: spec.midAnchorSide === "up" ? mainY - STUB : mainY + STUB };
      out.wires.push({ a: { x, y: mainY }, b: end, net });
      out.anchors.push({ net, at: end, side: spec.midAnchorSide });
    }
    const step = spec.steps[j];
    if (step === undefined) return;
    const next = spec.nodes[j + 1]!;
    const W = stepWidth(step, net);
    drawStep(step, net, next, R, R + W, mainY, spec.parallelSide, pitch, out);
    L = R + W;
  });
  if (lastAnchored) {
    out.wires.push({ a: { x: R, y: mainY }, b: { x: R + PITCH, y: mainY }, net: lastNet });
    out.anchors.push({ net: lastNet, at: { x: R + PITCH, y: mainY }, side: "right" });
  }
  return { placements: out.placements, wires: out.wires, anchors: out.anchors, mainY, firstX, lastX: R };
}
