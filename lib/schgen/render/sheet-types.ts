/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sheetTypes.ts`, and DIVERGED from it by
 * Task 24 of the M1 schematic-authoring plan: `SheetDrawing` carries `fieldFallbacks`.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

import type { BlockId, NetName, PartLabel, SheetSpec } from "../ir/types.ts";
import type { Wire } from "./block-types.ts";
// Type-only, and the cycle it closes is type-only too: `field-placement.ts` imports `GlobalLabel`
// and `PowerSymbol` from here. Both are erased, and `FieldFallback` belongs with the placer that
// builds it rather than being restated here as a second definition of one record.
import type { FieldFallback } from "./field-placement.ts";
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
  /**
   * **Every Reference/Value pair on this sheet that `field-placement.ts` could not keep clear**,
   * one per unit, with what it covers. Empty on a sheet whose every field sits in a clear slot.
   *
   * It is on the drawing rather than computed by a reader, because the drawing is what carries it
   * into `report.ts`: a sheet produced with overlapping text must not be able to reach
   * `RENDER-REPORT.md` as a clean sheet.
   */
  readonly fieldFallbacks: readonly FieldFallback[];
}
