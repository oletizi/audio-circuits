/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sheetTypes.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import type { BlockId, NetName, PartLabel, SheetSpec } from "../ir/types.ts";
import type { Wire } from "./block-types.ts";
import type { Point, Rotation, Side, Um } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";
import type { PinMark } from "./pin-marks.ts";
import type { Fields } from "./text-boxes.ts";

export interface PlacedSymbol {
  readonly part: PartLabel;
  readonly unit: number;
  readonly at: Point;
  readonly rot: Rotation;
  /** Placed box including pin tips (clearance). */
  readonly box: Box;
  /** Placed body box, pin tips excluded. */
  readonly body: Box;
  /** Where Reference and Value are drawn, placed against `body`. */
  readonly fields: Fields;
}

/** A rail's power symbol, or (`flag: true`) a PWR_FLAG whose `libId` is the power library's PWR_FLAG. */
export interface PowerSymbol {
  readonly net: NetName;
  readonly libId: string;
  readonly at: Point;
  readonly rot: Rotation;
  readonly flag: boolean;
  /** The value runs along the glyph (rotated with it) — dense pin rows of bus-rendered ICs. */
  readonly valueAlong: boolean;
}

export interface GlobalLabel {
  readonly net: NetName;
  readonly at: Point;
  readonly side: Side;
  /** The intersheet references KiCad prints beyond the label, e.g. "[2,4]" (pageRefs.ts). */
  readonly refs: string;
}

export interface SheetText {
  readonly text: string;
  readonly at: Point;
}

/** A titled dashed rectangle around one block (`blockId`) or an extra group (`null`: notes, power flags). */
export interface Frame {
  readonly blockId: BlockId | null;
  readonly box: Box;
  readonly title: string;
}

export interface SheetDrawing {
  readonly sheet: SheetSpec;
  readonly paper: { readonly w: Um; readonly h: Um };
  readonly symbols: readonly PlacedSymbol[];
  readonly powers: readonly PowerSymbol[];
  readonly wires: readonly Wire[];
  /** Cosmetic only: exactly the junctionPoints() of the sheet's items. */
  readonly junctions: readonly Point[];
  readonly labels: readonly GlobalLabel[];
  readonly noConnects: readonly Point[];
  readonly texts: readonly SheetText[];
  /** DNP pin-polarity marks of the placed units (pinMarks.ts), drawn as text. */
  readonly pinMarks: readonly PinMark[];
  readonly frames: readonly Frame[];
}
