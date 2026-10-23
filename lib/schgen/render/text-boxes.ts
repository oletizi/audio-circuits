/**
 * Ported from digital-pedal-platform's `tools/schgen/render/textBoxes.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Where text goes and how much room it takes. All schematic text is 1.27 mm; a character is
 * taken as one grid step wide (conservative for KiCad's stroke font). Positions here are shared by
 * the layout checks and the emitter, so what is checked is exactly what is drawn.
 */
import type { NetName } from "../ir/types.ts";
import { GRID, type Point, type Rotation, type Side, type Um } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";

export type HJustify = "left" | "right" | "center";

/** A text anchor: KiCad's `at` with its horizontal justification (vertically centred). */
export interface TextSpot {
  readonly at: Point;
  readonly justify: HJustify;
}

/** Reference and Value of a placed unit. */
export interface Fields {
  readonly reference: TextSpot;
  readonly value: TextSpot;
}

/** References are reserved this many digits of room (R1 … R999). */
export const REF_DIGITS = 3;

/** Conservative width of a line of 1.27 mm text: one grid step per character. */
export function textWidth(text: string): Um {
  return text.length * GRID;
}

/** Estimated extent of a global label's outline along its side: the text plus its arrow-shaped ends. */
function outlineExtent(net: NetName): Um {
  return (net.length + 2) * GRID;
}

/** Gap between a global label's outline and its intersheet references. */
export const REFS_GAP: Um = GRID / 2;

/** Extent of a global label along its side: its outline, then its intersheet references `refs` ("" for none). */
export function labelExtent(net: NetName, refs: string): Um {
  return outlineExtent(net) + (refs === "" ? 0 : REFS_GAP + textWidth(refs));
}

/** A global label as placed: its net, anchor, the side it extends to, and its intersheet references. */
export interface LabelSpot {
  readonly net: NetName;
  readonly at: Point;
  readonly side: Side;
  readonly refs: string;
}

/**
 * Where a label's intersheet references go: beyond its outline along its side, reading away from
 * it, horizontal for left/right labels and upward (KiCad angle 90) for up/down ones, as KiCad's
 * own autoplace puts them.
 */
export function refsSpot(l: LabelSpot): PowerValueSpot {
  const d = outlineExtent(l.net) + REFS_GAP;
  const { x, y } = l.at;
  switch (l.side) {
    case "right": return { at: { x: x + d, y }, justify: "left", vertical: false };
    case "left": return { at: { x: x - d, y }, justify: "right", vertical: false };
    case "up": return { at: { x, y: y - d }, justify: "left", vertical: true };
    case "down": return { at: { x, y: y + d }, justify: "right", vertical: true };
  }
}

/** The longest reference a part with this prefix may carry; its width is reserved at layout time. */
export function reservedReference(prefix: string): string {
  return `${prefix}${"0".repeat(REF_DIGITS)}`;
}

/** Width taken by a part's Reference (reserved) and Value, whichever is wider. */
export function fieldsWidth(part: { readonly refPrefix: string; readonly value: string }): Um {
  return Math.max(textWidth(reservedReference(part.refPrefix)), textWidth(part.value));
}

/** Height of the two field lines above a left/right-pinned body (fieldSpots), from the body's top edge. */
export const FIELDS_ABOVE: Um = 3 * GRID + GRID / 2;

const HALF = GRID / 2;

export function textBox(spot: TextSpot, text: string): Box {
  const w = textWidth(text);
  const { x, y } = spot.at;
  const [minX, maxX] = spot.justify === "left" ? [x, x + w] : spot.justify === "right" ? [x - w, x] : [x - w / 2, x + w / 2];
  return { minX, minY: y - HALF, maxX, maxY: y + HALF };
}

export function powerRotation(kind: "ground" | "supply", side: Side): Rotation {
  if (kind === "ground") {
    switch (side) {
      case "down": return 0;
      case "up": return 180;
      case "right": return 90;
      case "left": return 270;
    }
  }
  switch (side) {
    case "up": return 0;
    case "down": return 180;
    case "left": return 90;
    case "right": return 270;
  }
}

const mid = (a: Um, b: Um): Um => Math.round((a + b) / 2);

/** Where a unit's fields may go: beside a pin-free side of its body, or inside it. */
export type FieldSlot = Side | "centre" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Outside slots in the order tried (each only when no pin leaves that side), then inside slots. */
export const OUTSIDE_SLOTS: readonly Side[] = ["right", "up", "left", "down"];
export const INSIDE_SLOTS: readonly FieldSlot[] = ["centre", "top-left", "top-right", "bottom-left", "bottom-right"];

/**
 * Reference over Value at `slot` of the placed body box. Outside, KiCad's autoplace convention:
 * right/left of the body stacked about its middle, or centred above/below it. Inside, stacked and
 * centred on the body's centre or on the centre of one of its quarters.
 */
export function slotFields(body: Box, slot: FieldSlot): Fields {
  const cx = mid(body.minX, body.maxX);
  const cy = mid(body.minY, body.maxY);
  const stacked = (x: Um, y: Um, justify: HJustify): Fields => ({
    reference: { at: { x, y: y - GRID }, justify },
    value: { at: { x, y: y + GRID }, justify },
  });
  const qx = [mid(body.minX, cx), mid(cx, body.maxX)] as const;
  const qy = [mid(body.minY, cy), mid(cy, body.maxY)] as const;
  switch (slot) {
    case "right": return stacked(body.maxX + GRID, cy, "left");
    case "left": return stacked(body.minX - GRID, cy, "right");
    case "up": return stacked(cx, body.minY - 2 * GRID, "center");
    case "down": return stacked(cx, body.maxY + 2 * GRID, "center");
    case "centre": return stacked(cx, cy, "center");
    case "top-left": return stacked(qx[0], qy[0], "center");
    case "top-right": return stacked(qx[1], qy[0], "center");
    case "bottom-left": return stacked(qx[0], qy[1], "center");
    case "bottom-right": return stacked(qx[1], qy[1], "center");
  }
}

/**
 * Last-resort outside spots on a side that pins leave: just beyond its outermost pins, clear of
 * their pin lines and text. Up/down: beside the rightmost then leftmost pin; left/right: above the
 * topmost then below the bottommost pin. `tips` are that side's pin tips.
 */
export function besidePinFields(body: Box, side: Side, tips: readonly Point[]): Fields[] {
  if (tips.length === 0) return [];
  const xs = tips.map((t) => t.x);
  const ys = tips.map((t) => t.y);
  const stacked = (x: Um, y: Um, justify: HJustify): Fields => ({
    reference: { at: { x, y: y - GRID }, justify },
    value: { at: { x, y: y + GRID }, justify },
  });
  switch (side) {
    case "up":
    case "down": {
      const y = side === "up" ? body.minY - 2 * GRID : body.maxY + 2 * GRID;
      return [stacked(Math.max(...xs) + 2 * GRID, y, "left"), stacked(Math.min(...xs) - 2 * GRID, y, "right")];
    }
    case "right":
    case "left": {
      const x = side === "right" ? body.maxX + GRID : body.minX - GRID;
      const j: HJustify = side === "right" ? "left" : "right";
      return [stacked(x, Math.min(...ys) - 3 * GRID, j), stacked(x, Math.max(...ys) + 3 * GRID, j)];
    }
  }
}

/** A power value; `vertical` text is rotated 90° (reads upward), as KiCad draws it at angle 90. */
export interface PowerValueSpot extends TextSpot {
  readonly vertical: boolean;
}

/**
 * A power symbol's Value: beyond its placed glyph, on the side it extends furthest from its pin.
 * Horizontal text normally; with `along`, a value beyond an up/down glyph runs along it instead,
 * so values on adjacent pins 2.54 mm apart do not collide.
 */
export function powerValueSpot(glyph: Box, at: Point, along: boolean): PowerValueSpot {
  const up = at.y - glyph.minY;
  const down = glyph.maxY - at.y;
  if (along && Math.max(up, down) >= Math.max(at.x - glyph.minX, glyph.maxX - at.x)) {
    return up >= down
      ? { at: { x: at.x, y: glyph.minY - HALF }, justify: "left", vertical: true }
      : { at: { x: at.x, y: glyph.maxY + HALF }, justify: "right", vertical: true };
  }
  return { ...horizontalValueSpot(glyph, at), vertical: false };
}

/** Box of a power value: vertical text reads upward from `at` (left) or ends at `at` (right). */
export function powerValueBox(spot: PowerValueSpot, text: string): Box {
  if (!spot.vertical) return textBox(spot, text);
  const w = textWidth(text);
  const { x, y } = spot.at;
  const [minY, maxY] = spot.justify === "left" ? [y - w, y] : spot.justify === "right" ? [y, y + w] : [y - w / 2, y + w / 2];
  return { minX: x - HALF, minY, maxX: x + HALF, maxY };
}

function horizontalValueSpot(glyph: Box, at: Point): TextSpot {
  const up = at.y - glyph.minY;
  const down = glyph.maxY - at.y;
  const left = at.x - glyph.minX;
  const right = glyph.maxX - at.x;
  const far = Math.max(up, down, left, right);
  if (up === far) return { at: { x: at.x, y: glyph.minY - GRID }, justify: "center" };
  if (down === far) return { at: { x: at.x, y: glyph.maxY + GRID }, justify: "center" };
  if (left === far) return { at: { x: glyph.minX - GRID, y: at.y }, justify: "right" };
  return { at: { x: glyph.maxX + GRID, y: at.y }, justify: "left" };
}

/** A global label's outline and intersheet references: from its anchor along `side`, one grid step either side across it. */
export function labelBox(l: LabelSpot): Box {
  const e = labelExtent(l.net, l.refs);
  const { at, side } = l;
  switch (side) {
    case "right": return { minX: at.x, minY: at.y - GRID, maxX: at.x + e, maxY: at.y + GRID };
    case "left": return { minX: at.x - e, minY: at.y - GRID, maxX: at.x, maxY: at.y + GRID };
    case "up": return { minX: at.x - GRID, minY: at.y - e, maxX: at.x + GRID, maxY: at.y };
    case "down": return { minX: at.x - GRID, minY: at.y, maxX: at.x + GRID, maxY: at.y + e };
  }
}

/** A frame's title: inside its top-left corner, two grid steps in from both borders. */
export function frameTitleSpot(frame: Box): TextSpot {
  return { at: { x: frame.minX + 2 * GRID, y: frame.minY + 2 * GRID }, justify: "left" };
}
