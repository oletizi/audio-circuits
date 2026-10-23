/**
 * Ported from digital-pedal-platform's `tools/schgen/render/geometry.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { fixtureResolver } from "../__fixtures__/fixture-lib.ts";
import {
  assertOnGrid, boxesOverlap, GRID, gridCeil, onGrid, pinEnd, pinSide, placeBox, rotate,
} from "../../../lib/schgen/render/geometry.ts";

const lib = fixtureResolver();
const R = lib.resolve("Fix:R");
const pin = (n: string) => {
  const p = R.pins.find((q) => q.number === n);
  if (p === undefined) throw new Error(`no pin ${n}`);
  return p;
};

describe("rotate", () => {
  it("rotates counter-clockwise in the Y-up frame", () => {
    expect(rotate({ x: 1270, y: 0 }, 90)).toEqual({ x: 0, y: 1270 });
    expect(rotate({ x: 0, y: 3810 }, 90)).toEqual({ x: -3810, y: 0 });
    expect(rotate({ x: 1270, y: 2540 }, 180)).toEqual({ x: -1270, y: -2540 });
    expect(rotate({ x: 1270, y: 0 }, 270)).toEqual({ x: 0, y: -1270 });
  });
});

describe("pinEnd", () => {
  it("flips library Y-up to schematic Y-down", () => {
    expect(pinEnd({ x: 50800, y: 50800 }, 0, pin("1"))).toEqual({ x: 50800, y: 46990 });
    expect(pinEnd({ x: 50800, y: 50800 }, 0, pin("2"))).toEqual({ x: 50800, y: 54610 });
  });

  it("matches the KiCad 10 experiment: R at (76.2, 50.8) rotated 90 has pin 1 at (72.39, 50.8)", () => {
    expect(pinEnd({ x: 76200, y: 50800 }, 90, pin("1"))).toEqual({ x: 72390, y: 50800 });
  });
});

describe("pinSide", () => {
  it("reports which side of the body a pin end is on", () => {
    expect(pinSide(0, pin("1"))).toBe("up");
    expect(pinSide(0, pin("2"))).toBe("down");
    expect(pinSide(90, pin("1"))).toBe("left");
  });
});

describe("grid", () => {
  it("accepts multiples of 1.27 mm only", () => {
    expect(GRID).toBe(1270);
    expect(onGrid({ x: 72390, y: 50800 })).toBe(true);
    expect(onGrid({ x: 72390 + 635, y: 50800 })).toBe(false);
  });

  it("names the item in the error", () => {
    expect(() => assertOnGrid({ x: 635, y: 0 }, "label VIN at sheet power")).toThrow(
      /label VIN at sheet power at \(0.635, 0\) is off the 1.27 mm grid/,
    );
  });

  it("rounds up to the grid", () => {
    expect(gridCeil(1)).toBe(1270);
    expect(gridCeil(2540)).toBe(2540);
    expect(gridCeil(-1)).toBe(0);
  });

  it("refuses an off-grid library pin by name (Review Focus 4)", () => {
    expect(() => lib.resolve("Fix:OFFGRID")).toThrow(/Fix:OFFGRID: pin 1 at \(-3.175, 0\) is off the 1.27 mm grid/);
  });
});

describe("boxes", () => {
  it("places a library box in schematic coordinates", () => {
    const box = { minX: -1016, minY: -3810, maxX: 1016, maxY: 3810 };
    expect(placeBox({ x: 10160, y: 10160 }, 90, box)).toEqual({ minX: 6350, minY: 9144, maxX: 13970, maxY: 11176 });
  });

  it("treats touching edges as not overlapping", () => {
    expect(boxesOverlap({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, { minX: 10, minY: 0, maxX: 20, maxY: 10 })).toBe(false);
    expect(boxesOverlap({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, { minX: 9, minY: 9, maxX: 20, maxY: 20 })).toBe(true);
  });
});
