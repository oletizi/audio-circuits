/**
 * Ported from digital-pedal-platform's `tools/schgen/render/bodyClearance.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Visual clearance between wiring and symbols. KiCad joins a wire or label to a pin only at the
 * pin's end, but a reader joins anything drawn on a pin's line or inside a symbol's body. So a
 * wire end or anchor must not lie on a pin's segment (except that pin's own end, which the
 * connectivity rules already govern), an anchor must not lie inside a unit's body, and a wire must
 * not pass through the body of a unit it does not attach to.
 */
import { unitKey, type NetName } from "../ir/types.ts";
import type { BlockLayout, BlockSubgraph, BlockUnit, Placement, Wire } from "./block-types.ts";
import { fmtPoint, onSegment } from "./connectivity.ts";
import { pinEnd, placeBox, rotate, samePoint, type Point, type Rotation } from "./geometry.ts";
import type { Box, LibPin, PinAngle } from "./lib-pins.ts";

interface PlacedSegment {
  readonly pin: string;
  readonly net: NetName | null;
  readonly end: Point;
  readonly inner: Point;
}

interface PlacedUnit {
  readonly key: string;
  readonly box: Box;
  readonly pins: readonly PlacedSegment[];
}

/** Unit step from a pin's connection end toward the body, per library angle. */
const INWARD: Readonly<Record<PinAngle, readonly [number, number]>> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };

/** The body-side end of a pin: `length` along its angle from the connection end. */
export function innerEnd(at: Point, rot: Rotation, lp: LibPin): Point {
  const [dx, dy] = INWARD[lp.angle];
  const r = rotate({ x: lp.x + dx * lp.length, y: lp.y + dy * lp.length }, rot);
  return { x: at.x + r.x, y: at.y - r.y + 0 };
}

function placedUnits(units: readonly BlockUnit[], placements: readonly Placement[]): PlacedUnit[] {
  return placements.flatMap((pl) => {
    const u = units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
    if (u === undefined) return [];
    const box = u.symbol.boxes.get(pl.unit);
    if (box === undefined) throw new Error(`${u.symbol.libId} has no body box for unit ${pl.unit}`);
    const pins = u.pins.map((p) => {
      const lp = u.symbol.pins.find((l) => l.number === p.pin);
      if (lp === undefined) throw new Error(`${u.symbol.libId} has no pin ${p.pin} (part ${p.part})`);
      return { pin: p.pin, net: p.net, end: pinEnd(pl.at, pl.rot, lp), inner: innerEnd(pl.at, pl.rot, lp) };
    });
    return [{ key: unitKey(pl.part, pl.unit), box: placeBox(pl.at, pl.rot, box), pins }];
  });
}

const attached = (u: PlacedUnit, p: Point, net: NetName): boolean => u.pins.some((s) => s.net === net && samePoint(s.end, p));

const insideBox = (p: Point, b: Box): boolean => b.minX < p.x && p.x < b.maxX && b.minY < p.y && p.y < b.maxY;

/** True when the axis-aligned segment a-b meets the open interior of `b`. */
function segmentThroughBox(a: Point, c: Point, b: Box): boolean {
  if (a.y === c.y) return b.minY < a.y && a.y < b.maxY && Math.min(a.x, c.x) < b.maxX && Math.max(a.x, c.x) > b.minX;
  return b.minX < a.x && a.x < b.maxX && Math.min(a.y, c.y) < b.maxY && Math.max(a.y, c.y) > b.minY;
}

function onPinLine(what: string, p: Point, units: readonly PlacedUnit[]): string[] {
  return units.flatMap((u) =>
    u.pins
      .filter((s) => !samePoint(p, s.end) && onSegment(p, s.end, s.inner))
      .map((s) => `${what} at ${fmtPoint(p)} lies on the line of pin ${u.key}.${s.pin}`),
  );
}

/** A point where a label or power symbol attaches. */
export interface AnchorPoint {
  readonly net: NetName;
  readonly at: Point;
}

/** What clearance checks: placed units of `units`, wires and anchor points, named in messages by `scope`. */
export interface ClearanceScene {
  readonly scope: string;
  readonly units: readonly BlockUnit[];
  readonly placements: readonly Placement[];
  readonly wires: readonly Wire[];
  readonly anchors: readonly AnchorPoint[];
}

export function clearanceProblems(g: BlockSubgraph, layout: BlockLayout): string[] {
  return sceneClearanceProblems({ scope: g.block.id, units: g.units, ...layout });
}

export function sceneClearanceProblems(scene: ClearanceScene): string[] {
  const units = placedUnits(scene.units, scene.placements);
  const out: string[] = [];
  scene.wires.forEach((w, i) => {
    const what = `wire ${i} of ${scene.scope} (${w.net})`;
    for (const end of [w.a, w.b]) out.push(...onPinLine(`${what} end`, end, units));
    for (const u of units) {
      if (attached(u, w.a, w.net) || attached(u, w.b, w.net)) continue;
      if (segmentThroughBox(w.a, w.b, u.box)) {
        out.push(`${what} from ${fmtPoint(w.a)} to ${fmtPoint(w.b)} passes through the body of ${u.key}`);
      }
    }
  });
  scene.anchors.forEach((a, i) => {
    const what = `anchor ${a.net} ${i}`;
    out.push(...onPinLine(what, a.at, units));
    for (const u of units) {
      if (!attached(u, a.at, a.net) && insideBox(a.at, u.box)) out.push(`${what} at ${fmtPoint(a.at)} lies inside the body of ${u.key}`);
    }
  });
  return out;
}
