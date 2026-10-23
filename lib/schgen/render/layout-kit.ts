/**
 * Ported from digital-pedal-platform's `tools/schgen/render/layoutKit.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { NetName } from "../ir/types.ts";
import type { Box } from "./lib-pins.ts";
import type { Anchor, BlockLayout, BlockSubgraph, BlockUnit, Placement, Wire } from "./block-types.ts";
import { GRID, gridCeil, pinEnd, placeBox, ROTATIONS, type Point, type Rotation, type Um } from "./geometry.ts";
import { fieldsWidth } from "./text-boxes.ts";

export const PITCH: Um = 4 * GRID;
export const STUB: Um = 2 * GRID;

export interface Oriented {
  readonly rot: Rotation;
  readonly first: Point;
  readonly second: Point;
  readonly span: Um;
}

export function twoPinNets(u: BlockUnit): readonly [NetName, NetName] | null {
  const [a, b, ...rest] = u.pins;
  if (a === undefined || b === undefined || rest.length > 0 || a.net === null || b.net === null) return null;
  return [a.net, b.net];
}

export function otherNet(u: BlockUnit, net: NetName): NetName {
  const nets = twoPinNets(u);
  if (nets === null || !nets.includes(net)) throw new Error(`${u.part.label} is not a two-terminal part on ${net}`);
  return nets[0] === net ? nets[1] : nets[0];
}

export function orientTwoPin(u: BlockUnit, axis: "vertical" | "horizontal", firstNet: NetName): Oriented {
  const firstPin = u.pins.find((p) => p.net === firstNet);
  const secondPin = u.pins.find((p) => p.net !== firstNet);
  const lib = (n: string | undefined) => u.symbol.pins.find((p) => p.number === n);
  const l1 = lib(firstPin?.pin);
  const l2 = lib(secondPin?.pin);
  if (u.pins.length !== 2 || l1 === undefined || l2 === undefined) {
    throw new Error(`${u.part.label} cannot be oriented ${axis} with ${firstNet} first`);
  }
  for (const rot of ROTATIONS) {
    const e1 = pinEnd({ x: 0, y: 0 }, rot, l1);
    const e2 = pinEnd({ x: 0, y: 0 }, rot, l2);
    const ok = axis === "vertical" ? e1.x === e2.x && e1.y < e2.y : e1.y === e2.y && e1.x < e2.x;
    if (ok) return { rot, first: e1, second: e2, span: axis === "vertical" ? e2.y - e1.y : e2.x - e1.x };
  }
  throw new Error(`${u.part.label} cannot be oriented ${axis} with ${firstNet} first`);
}

export interface Rung {
  readonly unit: BlockUnit;
  readonly row: number;
  readonly topNet: NetName;
  readonly bottomNet: NetName;
}

export interface LadderSpec {
  readonly rows: number;
  readonly rungs: readonly Rung[];
}

interface Attachment {
  readonly x: number;
  readonly net: NetName;
}

/**
 * Rung columns, left to right: each gap leaves room for the rung's Reference and Value, which sit
 * right of its body (textBoxes.fieldSpots), plus one grid step before the next rung's body.
 */
function columnXs(spec: LadderSpec, oriented: readonly Oriented[], x0: Um): Um[] {
  const extents = spec.rungs.map((r, i) => {
    const o = oriented[i]!;
    const lib = r.unit.symbol.bodies.get(r.unit.unit);
    if (lib === undefined) throw new Error(`${r.unit.symbol.libId} has no body box for unit ${r.unit.unit}`);
    const body = placeBox({ x: -o.first.x, y: 0 }, o.rot, lib);
    return { left: -body.minX, right: body.maxX + GRID + fieldsWidth(r.unit.part) };
  });
  const xs: Um[] = [x0];
  for (let k = 1; k < extents.length; k += 1) {
    const step = gridCeil(extents[k - 1]!.right + GRID + extents[k]!.left);
    xs.push(xs[k - 1]! + Math.max(PITCH, step));
  }
  return xs;
}

export function ladder(spec: LadderSpec, g: BlockSubgraph, origin: Point): BlockLayout {
  const oriented = spec.rungs.map((r) => orientTwoPin(r.unit, "vertical", r.topNet));
  const xs = columnXs(spec, oriented, origin.x + 2 * GRID);
  const H: number[] = [];
  for (let r = 0; r < spec.rows - 1; r += 1) {
    const spans = spec.rungs.flatMap((rung, i) => (rung.row === r ? [oriented[i]!.span] : []));
    if (spans.length === 0) throw new Error(`ladder gap ${r} has no rungs`);
    H.push(Math.max(...spans));
  }
  const y: number[] = [origin.y + STUB + GRID];
  H.forEach((h, r) => y.push(y[r]! + h));
  const placements: Placement[] = [];
  const wires: Wire[] = [];
  const anchors: Anchor[] = [];
  const rowAtt: Attachment[][] = Array.from({ length: spec.rows }, () => []);
  spec.rungs.forEach((rung, k) => {
    const o = oriented[k]!;
    const x = xs[k]!;
    const top = y[rung.row]!;
    const bottomRow = y[rung.row + 1]!;
    placements.push({ part: rung.unit.part.label, unit: rung.unit.unit, at: { x: x - o.first.x, y: top - o.first.y }, rot: o.rot });
    if (top + o.span < bottomRow) wires.push({ a: { x, y: top + o.span }, b: { x, y: bottomRow }, net: rung.bottomNet });
    rowAtt[rung.row]!.push({ x, net: rung.topNet });
    rowAtt[rung.row + 1]!.push({ x, net: rung.bottomNet });
  });
  const rowOfNet = new Map<NetName, number>();
  rowAtt.forEach((atts, r) => {
    const sorted = [...atts].sort((a, b) => a.x - b.x);
    const segments: Attachment[][] = [];
    for (const a of sorted) {
      const last = segments[segments.length - 1];
      if (last !== undefined && last[0]!.net === a.net) last.push(a);
      else segments.push([a]);
    }
    const seenInRow = new Set<NetName>();
    for (const seg of segments) {
      const net = seg[0]!.net;
      if (seenInRow.has(net)) throw new Error(`ladder row ${r} splits net ${net}`);
      seenInRow.add(net);
      const prior = rowOfNet.get(net);
      if (prior !== undefined && prior !== r) throw new Error(`ladder net ${net} is on rows ${prior} and ${r}`);
      rowOfNet.set(net, r);
      const xs = seg.map((a) => a.x);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const yr = y[r]!;
      // Split at every attachment: KiCad 10 joins a pin end inside a wire only with a junction.
      for (let k = 1; k < seg.length; k += 1) {
        wires.push({ a: { x: seg[k - 1]!.x, y: yr }, b: { x: seg[k]!.x, y: yr }, net });
      }
      if (!g.rails.has(net) && !g.external.has(net)) continue;
      if (r === 0) {
        wires.push({ a: { x: x0, y: yr }, b: { x: x0, y: yr - STUB }, net });
        anchors.push({ net, at: { x: x0, y: yr - STUB }, side: "up" });
      } else if (r === spec.rows - 1) {
        wires.push({ a: { x: x0, y: yr }, b: { x: x0, y: yr + STUB }, net });
        anchors.push({ net, at: { x: x0, y: yr + STUB }, side: "down" });
      } else {
        if (segments.length !== 1) throw new Error(`ladder middle row ${r} has ${segments.length} segments`);
        wires.push({ a: { x: x1, y: yr }, b: { x: x1 + PITCH, y: yr }, net });
        anchors.push({ net, at: { x: x1 + PITCH, y: yr }, side: "right" });
      }
    }
  });
  return { placements, wires, anchors };
}

/** The body of `u` oriented `o`, relative to the pin end `o.first` at the origin. */
export function orientedBody(u: BlockUnit, o: Oriented): Box {
  const lib = u.symbol.bodies.get(u.unit);
  if (lib === undefined) throw new Error(`${u.symbol.libId} has no body box for unit ${u.unit}`);
  return placeBox({ x: -o.first.x, y: -o.first.y }, o.rot, lib);
}
