/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/order.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { comparePinNumbers } from "../../../lib/schgen/ir/order.ts";

describe("comparePinNumbers", () => {
  it("orders numeric pin numbers numerically", () => {
    expect(["10", "2", "1", "100"].sort(comparePinNumbers)).toEqual(["1", "2", "10", "100"]);
  });

  it("orders mixed alphanumeric numbers chunk by chunk", () => {
    expect(["B10", "A9", "B4", "A10", "S1"].sort(comparePinNumbers)).toEqual(["A9", "A10", "B4", "B10", "S1"]);
  });

  it("is a total order: equal only for identical strings", () => {
    expect(comparePinNumbers("01", "1")).not.toBe(0);
    expect(comparePinNumbers("A1", "A1")).toBe(0);
  });
});
