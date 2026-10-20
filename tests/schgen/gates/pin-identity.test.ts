/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/pinIdentity.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { labelsCircuit, res, symbols } from "../__fixtures__/circuits.ts";
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import { parsePinTable, type PinTable } from "../../../lib/schgen/gates/pin-table.ts";
import { checkPinIdentity, GENERIC_SYMBOL_LIBRARIES } from "../../../lib/schgen/gates/pin-identity.ts";
import type { MechanicalPad, PartSpec } from "../../../lib/schgen/ir/types.ts";
import type { LibPin, LibSymbol, SymbolResolver } from "../../../lib/schgen/render/library.ts";

const amp = (identities: string[], pinTable: string | null, mpn = "TEST-MPN"): PartSpec => ({
  label: "U_AMP", refPrefix: "U", libId: "Fix:OPAMP2", units: [1, 2, 3], value: "OPA1688", footprint: "Pkg:SOIC8", bom: { ...TEST_BOM, MPN: mpn },
  dnp: false, checklist: [], source: "t", pinTable, mechanicalPads: [], ncUnlisted: null,
  pins: Object.fromEntries(["1", "2", "3", "4", "5", "6", "7", "8"].map((n, i) => [n, { nc: true, identity: identities[i]! }])),
});
/** A fixture resistor whose MPN starts with its symbol name, so it is not MPN-overridden. */
const r = (label: string, a: string, b: string): PartSpec => ({ ...res(label, a, b), bom: { ...TEST_BOM, MPN: "R-TEST" } });
const TABLE_JSON = {
  mpn: "TEST-MPN", document: { id: "SBOS724A", revision: "A", cited: "Pin Configuration", url: null }, symbol: "Fix:OPAMP2",
  pins: { "1": "OUTA", "2": "-INA", "3": "+INA", "4": "V-", "5": "+INB", "6": "-INB", "7": "OUTB", "8": "V+" },
  aliases: {},
  pinAliases: {
    "1": { symbolName: "", identity: "OUTA" }, "2": { symbolName: "-", identity: "-INA" }, "3": { symbolName: "+", identity: "+INA" },
    "5": { symbolName: "+", identity: "+INB" }, "6": { symbolName: "-", identity: "-INB" }, "7": { symbolName: "", identity: "OUTB" },
  },
  mechanicalPads: {},
};
const table = parsePinTable("OPA1688", JSON.stringify(TABLE_JSON));
const TABLES = new Map([["OPA1688", table]]);
const PADS = (fp: string) => (fp === "Pkg:SOIC8" ? ["1", "2", "3", "4", "5", "6", "7", "8"] : ["1", "2"]);
const circuit = (parts: PartSpec[]) => labelsCircuit(parts, { rails: [], notes: [], checklist: [], others: [] });
const OK_IDS = ["OUTA", "-INA", "+INA", "V-", "+INB", "-INB", "OUTB", "V+"];
/** Fix:OPAMP2 pin names for the pins whose name differs from OK_IDS. */
const OPAMP_NAMES: readonly [string, string, string][] = [["1", "OUTA", ""], ["2", "-INA", "-"], ["3", "+INA", "+"], ["5", "+INB", "+"], ["6", "-INB", "-"], ["7", "OUTB", ""]];
const noTableMismatches = (libId: string) =>
  OPAMP_NAMES.map(([n, ir, name]) => `part U_AMP pin ${n}: circuit expects "${ir}" but symbol ${libId} names it "${name}"; if they are the same pin, add a pin table with an alias`);

/** The OPA1688 table with `patch` merged over its JSON, under the same key. */
const tablesWith = (patch: Record<string, unknown>): Map<string, PinTable> =>
  new Map([["OPA1688", parsePinTable("OPA1688", JSON.stringify({ ...TABLE_JSON, ...patch }))]]);

/** The fixture resolver with Fix:OPAMP2's pin list rewritten by `edit`. */
function opampWith(edit: (pins: readonly LibPin[]) => LibPin[]): SymbolResolver {
  const base = symbols.resolve("Fix:OPAMP2");
  const changed: LibSymbol = { ...base, pins: edit(base.pins) };
  return { files: symbols.files, resolve: (id) => (id === "Fix:OPAMP2" ? changed : symbols.resolve(id)) };
}

describe("checkPinIdentity", () => {
  it("passes when datasheet table, symbol (through declared aliases), circuit and footprint agree", () => {
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, TABLES, PADS, new Set())).toEqual([]);
  });

  it("passes nc-unlisted pins whose symbol names are aliased in the table", () => {
    // Every pin nc-unlisted: the IR identity is the symbol name ("", "-", "+"), which the alias maps.
    const ncAll: PartSpec = { ...amp(OK_IDS, "OPA1688"), pins: {}, ncUnlisted: { reason: "unused" } };
    expect(checkPinIdentity(circuit([ncAll]), symbols, TABLES, PADS, new Set())).toEqual([]);
  });

  it("still checks the alias of an nc-unlisted pin against the table", () => {
    const ncAll: PartSpec = { ...amp(OK_IDS, "OPA1688"), pins: {}, ncUnlisted: { reason: "unused" } };
    const wrong = tablesWith({ pins: { ...TABLE_JSON.pins, "1": "OUTB" } });
    expect(checkPinIdentity(circuit([ncAll]), symbols, wrong, PADS, new Set())).toEqual([
      'part U_AMP pin 1: symbol name "" maps to "OUTA" but the datasheet table says "OUTB"',
    ]);
  });

  it("catches swapped inputs in the circuit expectation", () => {
    const swapped = ["OUTA", "+INA", "-INA", "V-", "+INB", "-INB", "OUTB", "V+"];
    expect(checkPinIdentity(circuit([amp(swapped, "OPA1688")]), symbols, TABLES, PADS, new Set())).toEqual([
      'part U_AMP pin 2: circuit expects "+INA" but the datasheet table says "-INA"',
      'part U_AMP pin 3: circuit expects "-INA" but the datasheet table says "+INA"',
    ]);
  });

  it("never fuzzes: a case difference is a mismatch", () => {
    const lower = ["outa", "-INA", "+INA", "V-", "+INB", "-INB", "OUTB", "V+"];
    expect(checkPinIdentity(circuit([amp(lower, "OPA1688")]), symbols, TABLES, PADS, new Set())).toEqual([
      'part U_AMP pin 1: circuit expects "outa" but the datasheet table says "OUTA"',
    ]);
  });

  it("without a table, compares the circuit identity to the symbol name exactly", () => {
    const p = checkPinIdentity(circuit([amp(OK_IDS, null, "OPAMP2-T")]), symbols, TABLES, PADS, new Set());
    expect(p).toEqual(noTableMismatches("Fix:OPAMP2"));
    expect(p[0]).toBe('part U_AMP pin 1: circuit expects "OUTA" but symbol Fix:OPAMP2 names it ""; if they are the same pin, add a pin table with an alias');
  });

  it("requires a table for every project-library symbol", () => {
    expect(checkPinIdentity(circuit([amp(OK_IDS, null)]), symbols, TABLES, PADS, new Set(["Fix"]))).toEqual([
      "part U_AMP uses project symbol Fix:OPAMP2 but names no pin table (required for every custom symbol)",
      ...noTableMismatches("Fix:OPAMP2"),
    ]);
  });

  describe("MPN-overridden stock symbols", () => {
    it("requires a table when the MPN does not start with the symbol's name", () => {
      expect(checkPinIdentity(circuit([amp(OK_IDS, null, "OPA1688")]), symbols, TABLES, PADS, new Set())).toEqual([
        "part U_AMP places MPN OPA1688 on stock symbol Fix:OPAMP2 but names no pin table (required for every stock symbol whose MPN is overridden)",
        ...noTableMismatches("Fix:OPAMP2"),
      ]);
    });

    it("accepts an MPN that extends the symbol's name with ordering suffixes", () => {
      expect(checkPinIdentity(circuit([amp(OK_IDS, null, "OPAMP2IDR")]), symbols, TABLES, PADS, new Set())).toEqual(noTableMismatches("Fix:OPAMP2"));
    });

    it("never case-folds the prefix comparison", () => {
      expect(checkPinIdentity(circuit([amp(OK_IDS, null, "opamp2IDR")]), symbols, TABLES, PADS, new Set())[0]).toBe(
        "part U_AMP places MPN opamp2IDR on stock symbol Fix:OPAMP2 but names no pin table (required for every stock symbol whose MPN is overridden)",
      );
    });

    it("lists the generic libraries the spec exempts", () => {
      expect([...GENERIC_SYMBOL_LIBRARIES].sort()).toEqual(["Connector", "Connector_Audio", "Connector_Generic", "Device", "Jumper", "Mechanical", "Switch", "power"]);
    });
  });

  it("compares footprint pads with symbol pins plus mechanical pads", () => {
    const ra = { ...r("R_A", "X", "Y"), footprint: "Pkg:SOIC8" };
    expect(checkPinIdentity(circuit([ra, r("R_B", "X", "Y")]), symbols, TABLES, PADS, new Set())).toEqual([
      "part R_A: footprint Pkg:SOIC8 pads differ from symbol pins + mechanical pads: missing [], extra [3, 4, 5, 6, 7, 8]",
    ]);
  });

  it("reports an unresolvable footprint for that part and goes on to the next", () => {
    const lookup = (fp: string) => {
      if (fp === "Pkg:MISSING") throw new Error('footprint "MISSING" not found in library "Pkg"');
      return PADS(fp);
    };
    const parts = [{ ...amp(OK_IDS, "OPA1688"), footprint: "Pkg:MISSING" }, { ...r("R_A", "X", "Y"), footprint: "Pkg:SOIC8" }, r("R_B", "X", "Y")];
    expect(checkPinIdentity(circuit(parts), symbols, TABLES, lookup, new Set())).toEqual([
      'part U_AMP: footprint Pkg:MISSING cannot be resolved: footprint "MISSING" not found in library "Pkg"',
      "part R_A: footprint Pkg:SOIC8 pads differ from symbol pins + mechanical pads: missing [], extra [3, 4, 5, 6, 7, 8]",
    ]);
  });

  it("refuses a named table that does not exist", () => {
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA9999")]), symbols, TABLES, PADS, new Set())).toEqual([
      "part U_AMP names pin table OPA9999, which does not exist",
    ]);
  });

  it("refuses a table written for another symbol", () => {
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ symbol: "Fix:OPAMP2X" }), PADS, new Set())).toEqual([
      "part U_AMP: pin table OPA1688 is for symbol Fix:OPAMP2X, not Fix:OPAMP2",
    ]);
  });

  it("refuses a table written for another MPN", () => {
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ mpn: "OPA1688AIDR" }), PADS, new Set())).toEqual([
      "part U_AMP: pin table OPA1688 is for MPN OPA1688AIDR, but the part's MPN is TEST-MPN",
    ]);
  });

  it("refuses a table whose pin numbers differ from the symbol's", () => {
    const pins = { "1": "OUTA", "2": "-INA", "3": "+INA", "4": "V-", "5": "+INB", "6": "-INB", "7": "OUTB", "9": "V+" };
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ pins }), PADS, new Set())).toEqual([
      "part U_AMP: pin table OPA1688 and symbol Fix:OPAMP2 disagree on pin numbers: only in table [9], only in symbol [8]",
    ]);
  });

  it("refuses a pin alias whose expected symbol name differs from the symbol's", () => {
    const pinAliases = { ...TABLE_JSON.pinAliases, "2": { symbolName: "IN-", identity: "-INA" } };
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ pinAliases }), PADS, new Set())).toEqual([
      'part U_AMP pin 2: pin alias expects symbol name "IN-" but Fix:OPAMP2 names it "-"',
    ]);
  });

  it("refuses a pin alias that maps to an identity the table does not give", () => {
    const pinAliases = { ...TABLE_JSON.pinAliases, "2": { symbolName: "-", identity: "+INA" } };
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ pinAliases }), PADS, new Set())).toEqual([
      'part U_AMP pin 2: symbol name "-" maps to "+INA" but the datasheet table says "-INA"',
    ]);
  });

  it("refuses a symbol name with no alias that differs from the table, and never case-folds an alias", () => {
    const { "1": _drop, ...rest } = TABLE_JSON.pinAliases;
    const missing = checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ pinAliases: rest }), PADS, new Set());
    expect(missing).toEqual(['part U_AMP pin 1: symbol name "" maps to "" but the datasheet table says "OUTA"']);
    const folded = checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ pins: { ...TABLE_JSON.pins, "4": "v-" } }), PADS, new Set());
    expect(folded).toEqual([
      'part U_AMP pin 4: symbol name "V-" maps to "V-" but the datasheet table says "v-"',
      'part U_AMP pin 4: circuit expects "V-" but the datasheet table says "v-"',
    ]);
  });

  it("applies a name alias exactly when no pin alias is declared", () => {
    const pins = { ...TABLE_JSON.pins, "4": "VSS" };
    const ids = [...OK_IDS.slice(0, 3), "VSS", ...OK_IDS.slice(4)];
    expect(checkPinIdentity(circuit([amp(ids, "OPA1688")]), symbols, tablesWith({ pins, aliases: { "V-": "VSS" } }), PADS, new Set())).toEqual([]);
    expect(checkPinIdentity(circuit([amp(ids, "OPA1688")]), symbols, tablesWith({ pins, aliases: { "v-": "VSS" } }), PADS, new Set())).toEqual([
      'part U_AMP: pin table OPA1688 declares an alias for symbol pin name "v-", which no pin of Fix:OPAMP2 has',
      'part U_AMP pin 4: symbol name "V-" maps to "V-" but the datasheet table says "VSS"',
    ]);
  });

  it("reports a pin alias for a pin number the symbol lacks", () => {
    const pinAliases = { ...TABLE_JSON.pinAliases, "9": { symbolName: "EP", identity: "EP" }, "10": { symbolName: "X", identity: "X" } };
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ pinAliases }), PADS, new Set())).toEqual([
      "part U_AMP: pin table OPA1688 declares a pin alias for pin 9, which symbol Fix:OPAMP2 does not have",
      "part U_AMP: pin table OPA1688 declares a pin alias for pin 10, which symbol Fix:OPAMP2 does not have",
    ]);
  });

  it("reports a name alias that matches no symbol pin name exactly", () => {
    expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), symbols, tablesWith({ aliases: { "V+ ": "V+", "~{RST}": "RESET_N" } }), PADS, new Set())).toEqual([
      'part U_AMP: pin table OPA1688 declares an alias for symbol pin name "V+ ", which no pin of Fix:OPAMP2 has',
      'part U_AMP: pin table OPA1688 declares an alias for symbol pin name "~{RST}", which no pin of Fix:OPAMP2 has',
    ]);
  });

  describe("pin numbers listed more than once by the symbol", () => {
    const dupFour = (name: string) => opampWith((pins) => {
      const four = pins.find((p) => p.number === "4");
      if (four === undefined) throw new Error("fixture OPAMP2 has no pin 4");
      return [...pins, { ...four, unit: 1, name }];
    });

    it("reports each problem once per pin number", () => {
      const ids = [...OK_IDS.slice(0, 3), "VEE", ...OK_IDS.slice(4)];
      expect(checkPinIdentity(circuit([amp(ids, "OPA1688")]), dupFour("V-"), TABLES, PADS, new Set())).toEqual([
        'part U_AMP pin 4: circuit expects "VEE" but the datasheet table says "V-"',
      ]);
    });

    it("reports a repeated pin number whose names differ", () => {
      expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), dupFour("VSS"), TABLES, PADS, new Set())).toEqual([
        'part U_AMP: symbol Fix:OPAMP2 lists pin 4 more than once with different names "V-", "VSS"',
      ]);
    });
  });

  describe("prototype-named pins", () => {
    const weird = opampWith((pins) => pins.map((p) => (p.number === "4" ? { ...p, name: "constructor" } : p.number === "8" ? { ...p, number: "toString" } : p)));

    it("never resolves a pin name or number through Object.prototype", () => {
      expect(checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), weird, TABLES, PADS, new Set())).toEqual([
        "part U_AMP: pin table OPA1688 and symbol Fix:OPAMP2 disagree on pin numbers: only in table [8], only in symbol [toString]",
        'part U_AMP pin 4: symbol name "constructor" maps to "constructor" but the datasheet table says "V-"',
        "part U_AMP: footprint Pkg:SOIC8 pads differ from symbol pins + mechanical pads: missing [toString], extra [8]",
      ]);
    });

    it("applies a declared alias for a pin named constructor", () => {
      const p = checkPinIdentity(circuit([amp(OK_IDS, "OPA1688")]), weird, tablesWith({ aliases: { constructor: "V-" } }), PADS, new Set());
      expect(p.filter((m) => m.includes("pin 4"))).toEqual([]);
    });

    it("compares a pin named constructor exactly when there is no table", () => {
      const p = checkPinIdentity(circuit([amp(OK_IDS, null, "OPAMP2-T")]), weird, TABLES, PADS, new Set());
      expect(p).toContain('part U_AMP pin 4: circuit expects "V-" but symbol Fix:OPAMP2 names it "constructor"; if they are the same pin, add a pin table with an alias');
    });
  });

  it("refuses a part with no footprint", () => {
    const p = { ...amp(OK_IDS, "OPA1688"), footprint: " " };
    expect(checkPinIdentity(circuit([p]), symbols, TABLES, PADS, new Set())).toEqual(["part U_AMP has no footprint"]);
  });

  it("reports footprint pads the symbol and mechanical pads do not cover", () => {
    const p = { ...amp(OK_IDS, "OPA1688"), footprint: "Pkg:TWO" };
    expect(checkPinIdentity(circuit([p]), symbols, TABLES, PADS, new Set())).toEqual([
      "part U_AMP: footprint Pkg:TWO pads differ from symbol pins + mechanical pads: missing [3, 4, 5, 6, 7, 8], extra []",
    ]);
  });

  describe("mechanical pads", () => {
    // The validator refuses a netted mechanical pad (V12); these circuits are unvalidated, so gate 6 is tested on its own.
    const EP_PADS = (fp: string) => (fp === "Pkg:SOIC8EP" ? ["1", "2", "3", "4", "5", "6", "7", "8", "9"] : ["1", "2"]);
    const withPad = (mech: MechanicalPad[]): PartSpec => ({ ...amp(OK_IDS, "OPA1688"), footprint: "Pkg:SOIC8EP", mechanicalPads: mech, pins: { ...amp(OK_IDS, "OPA1688").pins, "4": { net: "GND", identity: "V-" } } });
    const run = (mech: MechanicalPad[], tablePads: Record<string, unknown>) =>
      checkPinIdentity(circuit([withPad(mech), r("R_G", "GND", "VREF")]), symbols, tablesWith({ mechanicalPads: tablePads }), EP_PADS, new Set());

    it("passes when circuit and table agree pad for pad", () => {
      expect(run([{ pad: "9", connection: { net: "GND" } }], { "9": { net: "GND" } })).toEqual([]);
      expect(run([{ pad: "9", connection: { nc: true } }], { "9": { nc: true } })).toEqual([]);
    });

    it("refuses a different net", () => {
      expect(run([{ pad: "9", connection: { net: "GND" } }], { "9": { net: "VREF" } })).toEqual([
        "part U_AMP: mechanical pad 9 is net GND in the circuit but net VREF in the datasheet table",
      ]);
    });

    it("refuses connected versus not connected", () => {
      expect(run([{ pad: "9", connection: { nc: true } }], { "9": { net: "GND" } })).toEqual([
        "part U_AMP: mechanical pad 9 is not connected in the circuit but net GND in the datasheet table",
      ]);
    });

    it("refuses a pad the table declares but the circuit omits", () => {
      expect(run([], { "9": { net: "GND" } })).toEqual([
        "part U_AMP: mechanical pad 9 is absent in the circuit but net GND in the datasheet table",
        "part U_AMP: footprint Pkg:SOIC8EP pads differ from symbol pins + mechanical pads: missing [], extra [9]",
      ]);
    });

    it("refuses a pad the circuit declares but the table omits", () => {
      expect(run([{ pad: "9", connection: { net: "GND" } }], {})).toEqual([
        "part U_AMP: mechanical pad 9 is net GND in the circuit but absent in the datasheet table",
      ]);
    });

    it("never inherits a prototype-named mechanical pad", () => {
      expect(run([{ pad: "9", connection: { net: "GND" } }], { "9": { net: "GND" }, constructor: { nc: true } })).toEqual([
        "part U_AMP: mechanical pad constructor is absent in the circuit but not connected in the datasheet table",
      ]);
    });
  });
});
