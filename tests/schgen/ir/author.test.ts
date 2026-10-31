/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/author.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus this entry's declared
 * `cuts` (a deliberate content deletion - see `docs/known-gaps.md`), per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { netRange, twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts";
import { connectedNet, unitKey } from "../../../lib/schgen/ir/types.ts";

const BOM = { Manufacturer: "M", MPN: "P", Supplier: "LCSC", SupplierPart: "C1", AbsMaxV: null };

describe("twoPin", () => {
  it("puts pin 1 on the first net and pin 2 on the second, with the given identities", () => {
    const p = twoPin({
      label: "R_TOP", refPrefix: "R", libId: "Device:R", value: "10k",
      footprint: "Resistor_SMD:R_0603_1608Metric", bom: BOM, nets: ["VREF", "TAP"],
      identities: UNNAMED, checklist: ["CORE-24"], source: "ANALOG.md 9.1", dnp: false,
    });
    expect(p.pins).toEqual({ "1": { net: "VREF", identity: "" }, "2": { net: "TAP", identity: "" } });
    expect(p.units).toEqual([1]);
    expect(p.mechanicalPads).toEqual([]);
    expect(p.ncUnlisted).toBeNull();
    expect(p.pinTable).toBeNull();
  });

  it("refuses the same net on both pins (a shorted two-terminal part is never intended)", () => {
    expect(() =>
      twoPin({
        label: "C_X", refPrefix: "C", libId: "Device:C", value: "100n", footprint: "F", bom: BOM,
        nets: ["GND", "GND"], identities: UNNAMED, checklist: [], source: "s", dnp: false,
      }),
    ).toThrow(/C_X: both pins on net GND/);
  });
});

describe("netRange", () => {
  it("expands an inclusive numeric range", () => {
    expect(netRange("SDRAM_A", 0, 3)).toEqual(["SDRAM_A0", "SDRAM_A1", "SDRAM_A2", "SDRAM_A3"]);
  });

  it("throws on an empty or reversed range", () => {
    expect(() => netRange("X", 3, 1)).toThrow(/netRange X: from 3 > to 1/);
  });
});

describe("helpers", () => {
  it("connectedNet returns the net or null for a no-connect", () => {
    expect(connectedNet({ net: "A", identity: "x" })).toBe("A");
    expect(connectedNet({ nc: true, identity: "x" })).toBeNull();
  });

  it("unitKey joins part and unit", () => {
    expect(unitKey("U_IN", 2)).toBe("U_IN#2");
  });
});
