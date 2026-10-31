/**
 * Ported from digital-pedal-platform's `tools/schgen/render/ercExclusions.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { RAILS, res, symbols } from "../__fixtures__/circuits.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { Circuit } from "../../../lib/schgen/ir/types.ts";
import { emitContext } from "../../../lib/schgen/render/emit.ts";
import { exclusionKey, type ErcExclusion } from "../../../lib/schgen/render/erc-exclusions.ts";
import { pinEnd } from "../../../lib/schgen/render/geometry.ts";
import { projectFile } from "../../../lib/schgen/render/project.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";
import type { SheetDrawing } from "../../../lib/schgen/render/sheet-types.ts";
import { uuidV5 } from "../../../lib/schgen/render/uuid.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

/** The A1 fixture circuit shape: a divider on sheet "s" and a load on sheet "t", on the fixture library. */
function fixture(): { c: Circuit; drawings: SheetDrawing[] } {
  const parts = [res("R_T", "3V3", "TAP"), res("R_B", "TAP", "GND"), res("R_L", "TAP", "GND")];
  const c = buildCircuit(
    {
      parts,
      blocks: [
        { id: "DIV", sheet: "s", title: "Strap", members: ["R_T", "R_B"], checklist: [], rendering: { kind: "wired", template: "divider", anchor: null } },
        { id: "LOAD", sheet: "t", title: "Load", members: ["R_L"], checklist: [], rendering: { kind: "bus", groups: [] } },
      ],
      sheets: [
        { id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] },
        { id: "t", title: "T", file: "t.kicad_sch", paper: "A4", notes: [] },
      ],
      rails: RAILS,
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    },
    { symbols },
  );
  return { c, drawings: c.sheets.map((s) => layoutSheet(c, s.id, symbols, "Pwr:PWR_FLAG")) };
}

const ctxOf = (c: Circuit) => emitContext("fix", c, symbols, new Map(), [], "usable");

const exclusion = (over: Partial<ErcExclusion> = {}): ErcExclusion => ({
  code: "pin_to_pin", severity: "error", pins: ["R_T.2", "R_B.1"], reason: "fixture reason", ownerSignOff: "fixture", ...over,
});

/** Where the drawing puts `label`'s pin `n`, in KiCad schematic internal units (100 nm). */
function iu(drawings: readonly SheetDrawing[], label: string, n: string): string {
  const s = drawings.flatMap((d) => d.symbols).find((x) => x.part === label);
  const lib = symbols.resolve("Fix:R").pins.find((p) => p.number === n);
  if (s === undefined || lib === undefined) throw new Error(`fixture has no ${label}.${n}`);
  const e = pinEnd(s.at, s.rot, lib);
  return `${e.x * 10}|${e.y * 10}`;
}

const path = (sheet: string): string => `/${uuidV5("root:fix")}/${uuidV5(`sheet:fix:${sheet}`)}`;

describe("exclusionKey (KiCad 10's confirmed form, A2 Task 15 Step 1)", () => {
  it("is code|x|y|main pin uuid|aux pin uuid|marker sheet|main sheet|aux sheet, at the first pin's end", () => {
    const { c, drawings } = fixture();
    const key = exclusionKey(exclusion(), ctxOf(c), drawings);
    expect(key).toBe(
      `pin_to_pin|${iu(drawings, "R_T", "2")}|${uuidV5("pin:R_T:1:2")}|${uuidV5("pin:R_B:1:1")}|${path("s")}|${path("s")}|${path("s")}`,
    );
  });

  it("follows the declared pin order: the first pin is KiCad's main item and gives the marker position", () => {
    const { c, drawings } = fixture();
    const key = exclusionKey(exclusion({ pins: ["R_B.1", "R_T.2"] }), ctxOf(c), drawings);
    expect(key).toBe(
      `pin_to_pin|${iu(drawings, "R_B", "1")}|${uuidV5("pin:R_B:1:1")}|${uuidV5("pin:R_T:1:2")}|${path("s")}|${path("s")}|${path("s")}`,
    );
  });

  it("names each pin's own sheet when the two pins are on different sheets", () => {
    const { c, drawings } = fixture();
    const key = exclusionKey(exclusion({ pins: ["R_T.2", "R_L.1"] }), ctxOf(c), drawings);
    expect(key.split("|").slice(5)).toEqual([path("s"), path("s"), path("t")]);
  });

  it("refuses a pin that is not in the circuit, or is malformed", () => {
    const { c, drawings } = fixture();
    expect(() => exclusionKey(exclusion({ pins: ["R_X.1", "R_B.1"] }), ctxOf(c), drawings)).toThrow(/ERC exclusion pin_to_pin: pin R_X\.1 is not in the circuit/);
    expect(() => exclusionKey(exclusion({ pins: ["R_T.9", "R_B.1"] }), ctxOf(c), drawings)).toThrow(/pin R_T\.9 is not in the circuit/);
    expect(() => exclusionKey(exclusion({ pins: ["R_T", "R_B.1"] }), ctxOf(c), drawings)).toThrow(/pin "R_T" is not LABEL\.PIN/);
  });

  it("refuses a pin whose unit is drawn on no sheet", () => {
    const { c, drawings } = fixture();
    expect(() => exclusionKey(exclusion({ pins: ["R_T.2", "R_L.1"] }), ctxOf(c), drawings.slice(0, 1))).toThrow(/R_L unit 1 is drawn on no sheet/);
  });
});

describe("projectFile with ERC exclusions (ALL-07)", () => {
  it("writes each exclusion as [key, reason], in declaration order", () => {
    const doc: unknown = JSON.parse(
      projectFile("fix", [
        { key: "k1", exclusion: exclusion({ reason: "first" }) },
        { key: "k2", exclusion: exclusion({ severity: "warning", ownerSignOff: null, reason: "second" }) },
      ]),
    );
    expect(doc).toMatchObject({ erc: { erc_exclusions: [["k1", "first"], ["k2", "second"]] }, meta: { filename: "fix.kicad_pro", version: 3 } });
  });

  it("refuses an error-level exclusion with no owner sign-off", () => {
    expect(() => projectFile("fix", [{ key: "k", exclusion: exclusion({ ownerSignOff: null }) }])).toThrow(
      "ERC exclusion pin_to_pin on R_T.2, R_B.1 is error-level and needs the owner's sign-off (ALL-07)",
    );
  });

  it("accepts a warning-level exclusion with no owner sign-off", () => {
    expect(() => projectFile("fix", [{ key: "k", exclusion: exclusion({ severity: "warning", ownerSignOff: null }) }])).not.toThrow();
  });

  it("refuses an exclusion with an empty reason", () => {
    expect(() => projectFile("fix", [{ key: "k", exclusion: exclusion({ reason: " " }) }])).toThrow(/ERC exclusion pin_to_pin on R_T\.2, R_B\.1 has no reason \(ALL-07\)/);
  });
});
