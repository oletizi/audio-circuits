/**
 * Ported from digital-pedal-platform's `tools/schgen/render/unitText.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * What a placed unit draws besides its fields, as text obstacles: its pin lines, the pin numbers
 * and outside pin names drawn along them, its inside pin names, and its interior graphic strokes
 * and text/arc areas. Both the field placer (fieldPlacement.ts) and the independent text check
 * (textScene.ts) build their obstacles from this model.
 */
import type { BlockUnit, Placement } from "./block-types.ts";
import { innerEnd } from "./body-clearance.ts";
import { GRID, pinEnd, placeBox, rotate, type Point, type Rotation, type Side } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";
import { textWidth } from "./text-boxes.ts";
import { noConnectEnds } from "./unit-pins.ts";

export interface Segment {
  readonly what: string;
  readonly a: Point;
  readonly b: Point;
}

export interface Obstacle {
  readonly what: string;
  readonly box: Box;
}

export interface UnitText {
  /** `<part>#<unit>` */
  readonly key: string;
  /** Placed body box, pin tips excluded. */
  readonly body: Box;
  /** Drawn pin lines, tip to body. */
  readonly pins: readonly Segment[];
  /** Pin numbers and outside pin names: drawn along each pin line. */
  readonly decorations: readonly Obstacle[];
  /** Inside pin names, interior text items and arc areas. */
  readonly interiorBoxes: readonly Obstacle[];
  /** Interior graphic strokes: rectangle edges, polyline and bezier legs, circle bounds. */
  readonly strokes: readonly Segment[];
  /** Pin tips per side that visible pins leave from. */
  readonly tips: ReadonlyMap<Side, readonly Point[]>;
}

const place = (at: Point, rot: Rotation, p: readonly [number, number]): Point => {
  const r = rotate({ x: p[0], y: p[1] }, rot);
  return { x: at.x + r.x, y: at.y - r.y };
};

function sideOf(end: Point, body: Box): Side | null {
  if (end.y < body.minY) return "up";
  if (end.y > body.maxY) return "down";
  if (end.x < body.minX) return "left";
  if (end.x > body.maxX) return "right";
  return null;
}

const hasName = (name: string): boolean => name !== "" && name !== "~";

/** A text line along the pin from `from`, `w` long, centred on the pin's line (thickness 2·half). */
function along(from: Point, dx: number, dy: number, w: number, half: number): Box {
  const to = { x: from.x + dx * w, y: from.y + dy * w };
  return {
    minX: Math.min(from.x, to.x) - (dx === 0 ? half : 0),
    maxX: Math.max(from.x, to.x) + (dx === 0 ? half : 0),
    minY: Math.min(from.y, to.y) - (dy === 0 ? half : 0),
    maxY: Math.max(from.y, to.y) + (dy === 0 ? half : 0),
  };
}

export function unitText(u: BlockUnit, pl: Placement): UnitText {
  const key = `${pl.part}#${pl.unit}`;
  const lib = u.symbol.bodies.get(pl.unit);
  const graphics = u.symbol.graphics.get(pl.unit);
  if (lib === undefined || graphics === undefined) throw new Error(`${u.symbol.libId} has no body for unit ${pl.unit}`);
  const body = placeBox(pl.at, pl.rot, lib);
  const style = u.symbol.pinText;
  const visible = u.symbol.pins.filter((p) => (p.unit === pl.unit || p.unit === 0) && !p.hidden);
  const pins: Segment[] = [];
  const decorations: Obstacle[] = [];
  const nameBoxes: Obstacle[] = [];
  const tips = new Map<Side, Point[]>();
  for (const p of visible) {
    const tip = pinEnd(pl.at, pl.rot, p);
    const inner = innerEnd(pl.at, pl.rot, p);
    const side = sideOf(tip, body);
    if (side !== null) tips.set(side, [...(tips.get(side) ?? []), tip]);
    if (p.length > 0) pins.push({ what: `pin ${u.part.label}.${p.number}`, a: tip, b: inner });
    const dx = Math.sign(inner.x - tip.x);
    const dy = Math.sign(inner.y - tip.y);
    const outsideName = style.namesOffset === 0 && !style.namesHidden && hasName(p.name);
    if (p.length > 0 && (!style.numbersHidden || outsideName)) {
      // Numbers (and offset-0 names) sit beside the pin line, either side: 1.5 grid steps covers both.
      decorations.push({ what: `pin ${u.part.label}.${p.number} text`, box: along(tip, dx, dy, p.length, (3 * GRID) / 2) });
    }
    if (style.namesOffset > 0 && !style.namesHidden && hasName(p.name)) {
      const from = { x: inner.x + dx * style.namesOffset, y: inner.y + dy * style.namesOffset };
      nameBoxes.push({ what: `pin name ${p.name} of ${key}`, box: along(from, dx, dy, textWidth(p.name), GRID / 2) });
    }
  }
  // The no-connect X the sheet draws (the same rule, unitPins.noConnectEnds), hidden pins included: text must clear it (A2 Task 14).
  for (const { pin, at } of noConnectEnds(u, pl)) {
    decorations.push({
      what: `no-connect marker on ${u.part.label}.${pin}`,
      box: { minX: at.x - GRID / 2, minY: at.y - GRID / 2, maxX: at.x + GRID / 2, maxY: at.y + GRID / 2 },
    });
  }
  const strokes = graphics.segments.map(([a, b], i): Segment => ({ what: `graphic ${i} of ${key}`, a: place(pl.at, pl.rot, a), b: place(pl.at, pl.rot, b) }));
  const blocks = graphics.blocks.map((b, i): Obstacle => ({ what: `interior text ${i} of ${key}`, box: placeBox(pl.at, pl.rot, b) }));
  return { key, body, pins, decorations, interiorBoxes: [...nameBoxes, ...blocks], strokes, tips };
}
