/**
 * Ported from digital-pedal-platform's `tools/schgen/render/geometry.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { Box, LibPin } from "./lib-pins.ts";

/** Integer micrometres. All schematic geometry is integral, so grid checks are exact. */
export type Um = number;

export function um(mm: number): Um {
  const v = Math.round(mm * 1000);
  if (Math.abs(v - mm * 1000) > 1e-6) {
    throw new Error(`${mm} mm is not a whole number of micrometres`);
  }
  return v;
}

export function fmtMm(v: Um): string {
  if (!Number.isInteger(v)) throw new Error(`fmtMm: ${v} is not an integer micrometre value`);
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const whole = Math.floor(a / 1000);
  const frac = a % 1000;
  if (frac === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${String(frac).padStart(3, "0").replace(/0+$/, "")}`;
}

export const GRID: Um = 1270;

export interface Point {
  readonly x: Um;
  readonly y: Um;
}

export type Rotation = 0 | 90 | 180 | 270;
export const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];
export type Side = "left" | "right" | "up" | "down";

export function onGrid(p: Point): boolean {
  return p.x % GRID === 0 && p.y % GRID === 0;
}

export function assertOnGrid(p: Point, what: string): void {
  if (!onGrid(p)) throw new Error(`${what} at (${fmtMm(p.x)}, ${fmtMm(p.y)}) is off the 1.27 mm grid`);
}

export function rotate(p: Point, rot: Rotation): Point {
  switch (rot) {
    case 0:
      return { x: p.x, y: p.y };
    case 90:
      return { x: -p.y + 0, y: p.x + 0 };
    case 180:
      return { x: -p.x + 0, y: -p.y + 0 };
    case 270:
      return { x: p.y + 0, y: -p.x + 0 };
  }
}

export function pinEnd(at: Point, rot: Rotation, pin: LibPin): Point {
  const r = rotate({ x: pin.x, y: pin.y }, rot);
  return { x: at.x + r.x, y: at.y - r.y + 0 };
}

const SIDE_OF_ANGLE: Record<number, Side> = { 0: "left", 90: "down", 180: "right", 270: "up" };

export function pinSide(rot: Rotation, pin: LibPin): Side {
  const side = SIDE_OF_ANGLE[(pin.angle + rot) % 360];
  if (side === undefined) throw new Error(`pinSide: unsupported angle ${pin.angle} + ${rot}`);
  return side;
}

export function placeBox(at: Point, rot: Rotation, box: Box): Box {
  const corners = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.minX, y: box.maxY },
    { x: box.maxX, y: box.maxY },
  ].map((c) => {
    const r = rotate(c, rot);
    return { x: at.x + r.x, y: at.y - r.y };
  });
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxX: Math.max(...corners.map((c) => c.x)),
    maxY: Math.max(...corners.map((c) => c.y)),
  };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
}

export function growBox(b: Box, by: Um): Box {
  return { minX: b.minX - by, minY: b.minY - by, maxX: b.maxX + by, maxY: b.maxY + by };
}

export function unionBox(a: Box, b: Box): Box {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function gridCeil(v: Um): Um {
  return Math.ceil(v / GRID) * GRID + 0;
}

export function gridFloor(v: Um): Um {
  return Math.floor(v / GRID) * GRID + 0;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/**
 * True when the segment a-b (any direction) meets the open interior of `box`: clip it to the
 * closed box (Liang–Barsky), then test that the clipped piece's midpoint is strictly inside.
 * Touching an edge or a corner does not count.
 */
export function segmentHitsBox(a: Point, b: Point, box: Box): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  if (!clip(-dx, a.x - box.minX) || !clip(dx, box.maxX - a.x) || !clip(-dy, a.y - box.minY) || !clip(dy, box.maxY - a.y)) return false;
  const t = (t0 + t1) / 2;
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return box.minX < x && x < box.maxX && box.minY < y && y < box.maxY;
}
