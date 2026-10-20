/**
 * Ported from digital-pedal-platform's `tools/schgen/render/drawnText.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, labelsCircuit, RAILS, res } from "../__fixtures__/circuits.ts";
import type { Circuit } from "../../../lib/schgen/ir/types.ts";
import { withReferences } from "../../../lib/schgen/render/drawn-text.ts";

function circuit(title: string, note: string): Circuit {
  return labelsCircuit([res("R_TOP", "TAP", "GND"), cap("C_TAP", "TAP", "GND"), res("R_PULL", "3V3", "TAP")], {
    rails: RAILS,
    notes: [{ lines: [note], checklist: ["X-1"] }],
    checklist: [],
    others: [{ id: "T", sheet: "s", title, members: ["C_TAP"], checklist: [], rendering: { kind: "labels", reason: "fixture" } }],
  });
}

const REFS = new Map([["R_TOP", "R1"], ["C_TAP", "C1"], ["R_PULL", "R2"]]);

describe("withReferences", () => {
  it("prints each part's reference designator where a block title or note names it by its design label", () => {
    const c = withReferences(circuit("C_TAP decoupling at TAP", "R_TOP/R_PULL set TAP; C_TAP (filter) at R_TOP's pin 2."), REFS);
    expect(c.blocks.get("T")?.title).toBe("C1 decoupling at TAP");
    expect(c.sheets[0]?.notes[0]?.lines).toEqual(["R1/R2 set TAP; C1 (filter) at R1's pin 2."]);
    expect(c.sheets[0]?.notes[0]?.checklist).toEqual(["X-1"]);
  });

  it("leaves net names and words that only contain a label untouched", () => {
    const c = withReferences(circuit("TAP from 3V3", "XR_TOP is not a part; GND is a rail."), REFS);
    expect(c.blocks.get("T")?.title).toBe("TAP from 3V3");
    expect(c.sheets[0]?.notes[0]?.lines).toEqual(["XR_TOP is not a part; GND is a rail."]);
  });

  it("refuses a design-id-shaped name that is no part and no net, since the drawing could never show it", () => {
    expect(() => withReferences(circuit("C_AP and R_D1 legs", "fine"), REFS)).toThrow(
      /block T title names C_AP, R_D1: no part or net has that name/,
    );
    expect(() => withReferences(circuit("fine", "R_LED dissipates 41 mW"), REFS)).toThrow(/sheet s note 1 names R_LED: no part or net has that name/);
  });

  it("refuses a part with no reference (annotate first)", () => {
    expect(() => withReferences(circuit("C_TAP", "x"), new Map([["R_TOP", "R1"]]))).toThrow(/part C_TAP has no reference/);
  });
});
